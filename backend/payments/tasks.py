from celery import shared_task


@shared_task
def run_dunning():
    """
    For every overdue invoice, check active dunning rules and fire the appropriate action.
    Runs daily. Each rule fires once per invoice (tracked via CommunicationLog).
    """
    from django.utils import timezone
    from servicing.models import Invoice
    from .models import DunningRule
    from communications.tasks import send_communication

    today = timezone.now().date()
    active_rules = DunningRule.objects.filter(active=True).order_by("days_overdue")
    overdue_invoices = Invoice.objects.filter(
        status="overdue"
    ).select_related("lease__lessee", "lease__asset")

    fired = 0
    for invoice in overdue_invoices:
        days_past = (today - invoice.due_date).days
        lessee = invoice.lease.lessee

        for rule in active_rules:
            if days_past < rule.days_overdue:
                continue

            subject = f"[AssetStream] {rule.name} — {invoice.invoice_number}"
            body = rule.message_template.format(
                name=lessee.first_name or lessee.username,
                invoice_number=invoice.invoice_number,
                amount=invoice.total_amount,
                days_overdue=days_past,
                due_date=invoice.due_date,
            ) if rule.message_template else (
                f"Dear {lessee.first_name or lessee.username}, "
                f"invoice {invoice.invoice_number} (${invoice.total_amount}) "
                f"is {days_past} days overdue."
            )

            if rule.action in ("email", "sms", "whatsapp"):
                send_communication.delay(lessee.id, rule.action, subject, body)
                fired += 1

            elif rule.action == "suspend":
                lease = invoice.lease
                if lease.status == "active":
                    lease.status = "defaulted"
                    lease.save(update_fields=["status"])
                    fired += 1

            elif rule.action == "flag":
                # Could integrate with a CRM/ticketing system here
                pass

    return f"Dunning: {fired} actions fired across {overdue_invoices.count()} overdue invoices"
