"""
AI Collections Assistant — NBA (Next Best Action) engine.
Pure rule-based; no ML model needed.
"""

TEMPLATES = {
    "reminder": {
        "action": "Send Payment Reminder",
        "subject_template": "Friendly Reminder: Invoice {invoice_number} Due",
        "body_template": (
            "Dear {lessee_name},\n\n"
            "We hope this message finds you well. We wanted to send a friendly reminder that "
            "Invoice {invoice_number} for {asset_name} in the amount of ${amount:.2f} was due on "
            "{due_date}.\n\n"
            "If you have already arranged payment, please disregard this message. Otherwise, we "
            "kindly ask that you process the payment at your earliest convenience to avoid any "
            "service interruptions.\n\n"
            "To pay online or if you have any questions, please contact your account manager.\n\n"
            "Thank you for your continued partnership.\n\n"
            "Best regards,\nAssetStream Finance Team"
        ),
    },
    "escalation": {
        "action": "Formal Notice + Phone Follow-up",
        "subject_template": "IMPORTANT: Invoice {invoice_number} — {days_overdue} Days Overdue",
        "body_template": (
            "Dear {lessee_name},\n\n"
            "This is a formal notice that Invoice {invoice_number} for {asset_name}, in the amount "
            "of ${amount:.2f}, is now {days_overdue} days past due.\n\n"
            "Failure to remit payment within 7 business days may result in suspension of services "
            "and additional late fees as per your lease agreement.\n\n"
            "Please contact us immediately at your earliest convenience to resolve this matter. "
            "Our collections team will also be attempting to reach you by phone.\n\n"
            "Regards,\nAssetStream Collections Department"
        ),
    },
    "collections": {
        "action": "Initiate Collections Process",
        "subject_template": "URGENT: Account Suspension Warning — Invoice {invoice_number}",
        "body_template": (
            "Dear {lessee_name},\n\n"
            "NOTICE OF ACCOUNT SUSPENSION: Invoice {invoice_number} ({asset_name}) for "
            "${amount:.2f} remains unpaid after {days_overdue} days.\n\n"
            "Your account has been flagged for collections. Unless full payment or a formal "
            "payment arrangement is agreed upon within 5 business days, we will be required to:\n"
            "1. Suspend all active lease services\n"
            "2. Report the delinquency to credit agencies\n"
            "3. Initiate asset recovery procedures\n\n"
            "To avoid these actions, please contact our collections team immediately.\n\n"
            "AssetStream Legal & Collections"
        ),
    },
    "legal": {
        "action": "Legal Action Referral",
        "subject_template": "FINAL NOTICE: Legal Action for Invoice {invoice_number}",
        "body_template": (
            "Dear {lessee_name},\n\n"
            "This is your FINAL NOTICE before legal proceedings are initiated for the recovery "
            "of ${amount:.2f} outstanding on Invoice {invoice_number} ({asset_name}), now "
            "{days_overdue} days overdue.\n\n"
            "This matter has been referred to our legal counsel. You have 48 hours to make full "
            "payment or contact us to arrange settlement before formal proceedings begin.\n\n"
            "AssetStream Legal Department"
        ),
    },
}


def get_template_key(days_overdue):
    if days_overdue <= 7:
        return "reminder"
    elif days_overdue <= 30:
        return "escalation"
    elif days_overdue <= 60:
        return "collections"
    return "legal"


def advise_invoice(invoice):
    """
    Returns NBA and draft communication for a single overdue Invoice.
    invoice must have select_related("lease__asset", "lease__lessee") applied.
    """
    from django.utils import timezone

    today = timezone.now().date()
    days_overdue = max(0, (today - invoice.due_date).days)

    lessee = invoice.lease.lessee
    asset = invoice.lease.asset

    lessee_name = (
        f"{lessee.first_name} {lessee.last_name}".strip()
        or lessee.company_name
        or lessee.username
    )
    company = lessee.company_name or lessee.username

    overdue_count = (
        type(invoice).objects.filter(lease__lessee=lessee, status="overdue").count()
    )
    urgency_score = round(
        days_overdue * 0.4 + (float(invoice.total_amount) / 1000) * 0.3 + overdue_count * 0.3,
        2,
    )

    tpl_key = get_template_key(days_overdue)
    tpl = TEMPLATES[tpl_key]

    fmt = {
        "invoice_number": invoice.invoice_number,
        "lessee_name": lessee_name,
        "company": company,
        "asset_name": asset.name,
        "amount": float(invoice.total_amount),
        "due_date": invoice.due_date.strftime("%B %d, %Y"),
        "days_overdue": days_overdue,
    }

    return {
        "invoice_id": invoice.id,
        "invoice_number": invoice.invoice_number,
        "lease_id": invoice.lease_id,
        "lessee_name": f"{lessee_name} ({company})",
        "asset_name": asset.name,
        "total_amount": float(invoice.total_amount),
        "days_overdue": days_overdue,
        "urgency_score": urgency_score,
        "nba_action": tpl["action"],
        "nba_rationale": (
            f"{days_overdue} days overdue. "
            f"{overdue_count} outstanding invoice(s) for this lessee. "
            f"Urgency score: {urgency_score:.1f}."
        ),
        "draft_subject": tpl["subject_template"].format(**fmt),
        "draft_body": tpl["body_template"].format(**fmt),
    }
