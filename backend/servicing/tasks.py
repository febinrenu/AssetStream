import random
from datetime import timedelta

from celery import shared_task
from django.utils import timezone


_CATEGORY_PROFILES = {
    "heavy_equipment": {
        "weekday_hours": (1.0, 6.0),
        "weekend_hours": (0.0, 2.0),
        "temp_range": (72.0, 88.0),
    },
    "medical": {
        "weekday_hours": (2.0, 8.0),
        "weekend_hours": (2.0, 8.0),  # consistent weekday/weekend
        "temp_range": (65.0, 78.0),
    },
    "fleet": {
        "weekday_hours": (4.0, 12.0),
        "weekend_hours": (1.0, 4.0),
        "temp_range": (70.0, 85.0),
    },
    "industrial": {
        "weekday_hours": (6.0, 16.0),
        "weekend_hours": (0.0, 2.0),  # minimal weekends
        "temp_range": (68.0, 82.0),
    },
}


@shared_task
def simulate_iot_ping():
    """
    For every active LeaseContract, create a UsageLog with realistic
    category-specific sensor data including degradation effects.
    """
    from originations.models import LeaseContract
    from servicing.models import UsageLog

    active_leases = LeaseContract.objects.filter(status="active").select_related("asset")
    now = timezone.now()
    is_weekend = now.weekday() >= 5  # Saturday=5, Sunday=6

    for lease in active_leases:
        asset = lease.asset
        category = asset.category
        profile = _CATEGORY_PROFILES.get(category, _CATEGORY_PROFILES["fleet"])

        # Hours used — category and day-of-week aware
        if is_weekend:
            h_min, h_max = profile["weekend_hours"]
        else:
            h_min, h_max = profile["weekday_hours"]

        # Scale down: each ping represents a fraction of daily usage
        # (task runs periodically, not once per day)
        hours_used = round(random.uniform(h_min / 8, h_max / 8), 2)

        # Engine temp — category-specific base range
        temp_min, temp_max = profile["temp_range"]

        # Degradation: engine_temp baseline increases 0.5°C per 1000 hours logged
        degradation_offset = (asset.total_hours_logged / 1000.0) * 0.5

        # Age factor: older assets run slightly hotter
        current_year = now.year
        age = max(0, current_year - asset.manufacture_year)
        age_offset = min(age * 0.3, 5.0)  # max 5°C from age

        engine_temp = round(
            random.uniform(temp_min, temp_max) + degradation_offset + age_offset,
            1,
        )

        # Fuel level — continuous from last reading with degradation
        last_log = (
            UsageLog.objects.filter(asset=asset).order_by("-timestamp").first()
        )
        if last_log:
            # Fuel consumption proportional to hours, with slight efficiency loss over time
            efficiency_factor = 1.0 + (asset.total_hours_logged / 10000.0) * 0.05  # 5% loss per 10k hours
            fuel_consumed = hours_used * random.uniform(1.0, 3.0) * efficiency_factor
            fuel_refill = random.uniform(0, 1.0) if random.random() < 0.1 else 0  # 10% chance of small refill
            fuel_level = max(5.0, min(100.0, last_log.fuel_level_percent - fuel_consumed + fuel_refill * 30))
        else:
            fuel_level = round(random.uniform(40.0, 95.0), 1)

        base_lat = 37.7749 + random.uniform(-0.05, 0.05)
        base_lng = -122.4194 + random.uniform(-0.05, 0.05)

        UsageLog.objects.create(
            asset=asset,
            lease=lease,
            hours_used=hours_used,
            latitude=round(base_lat, 6),
            longitude=round(base_lng, 6),
            engine_temp_celsius=engine_temp,
            fuel_level_percent=round(fuel_level, 1),
        )

        asset.total_hours_logged += hours_used
        asset.save(update_fields=["total_hours_logged"])


@shared_task
def generate_monthly_invoices():
    """
    For every active lease, generate an invoice for the current billing period.
    Runs every 5 minutes for demo purposes (represents monthly cycle).
    """
    from originations.models import LeaseContract
    from servicing.services import calculate_usage_invoice

    today = timezone.now().date()
    period_start = today - timedelta(days=30)
    period_end = today

    active_leases = LeaseContract.objects.filter(status="active")

    for lease in active_leases:
        existing = lease.invoices.filter(
            billing_period_start=period_start,
            billing_period_end=period_end,
        ).exists()

        if not existing:
            calculate_usage_invoice(lease.id, period_start, period_end)


@shared_task
def notify_expiring_leases():
    """
    Email lessees whose leases expire within the next 30 days.
    Runs daily at 8 AM UTC.
    """
    from django.core.mail import send_mail
    from originations.models import LeaseContract

    today = timezone.now().date()
    warning_date = today + timedelta(days=30)

    expiring = LeaseContract.objects.filter(
        status="active",
        end_date__lte=warning_date,
        end_date__gte=today,
    ).select_related("lessee", "asset")

    sent = 0
    for lease in expiring:
        days_left = (lease.end_date - today).days
        lessee = lease.lessee
        if not lessee.email:
            continue

        subject = f"[AssetStream] Lease Expiring in {days_left} Day{'s' if days_left != 1 else ''} — {lease.asset.name}"
        body = (
            f"Dear {lessee.first_name or lessee.username},\n\n"
            f"Your lease contract {lease.contract_number} for \"{lease.asset.name}\" "
            f"is set to expire on {lease.end_date.strftime('%B %d, %Y')} ({days_left} day{'s' if days_left != 1 else ''} remaining).\n\n"
            f"Please contact your AssetStream account manager to discuss renewal options.\n\n"
            f"Contract Details:\n"
            f"  Contract #:    {lease.contract_number}\n"
            f"  Asset:         {lease.asset.name} ({lease.asset.serial_number})\n"
            f"  Expiry Date:   {lease.end_date.strftime('%B %d, %Y')}\n"
            f"  Monthly Fee:   ${lease.monthly_base_fee}\n\n"
            f"Best regards,\nAssetStream Operations Team"
        )
        send_mail(subject, body, "noreply@assetstream.io", [lessee.email], fail_silently=True)
        sent += 1

    return f"Expiry notifications sent: {sent} of {expiring.count()} expiring leases"


@shared_task
def notify_overdue_invoices():
    """
    Email lessees for each overdue invoice.
    Runs daily at 9 AM UTC.
    """
    from django.core.mail import send_mail
    from servicing.models import Invoice

    today = timezone.now().date()

    overdue = Invoice.objects.filter(
        status="overdue",
        due_date__lt=today,
    ).select_related("lease__lessee", "lease__asset")

    sent = 0
    for invoice in overdue:
        lessee = invoice.lease.lessee
        if not lessee.email:
            continue

        days_overdue = (today - invoice.due_date).days
        subject = f"[AssetStream] Invoice Overdue — {invoice.invoice_number} ({days_overdue}d past due)"
        body = (
            f"Dear {lessee.first_name or lessee.username},\n\n"
            f"Invoice {invoice.invoice_number} is currently {days_overdue} day{'s' if days_overdue != 1 else ''} overdue.\n\n"
            f"Invoice Details:\n"
            f"  Invoice #:      {invoice.invoice_number}\n"
            f"  Asset:          {invoice.lease.asset.name}\n"
            f"  Amount Due:     ${invoice.total_amount}\n"
            f"  Due Date:       {invoice.due_date.strftime('%B %d, %Y')}\n"
            f"  Days Overdue:   {days_overdue}\n\n"
            f"Please arrange payment immediately to avoid service interruption.\n\n"
            f"Best regards,\nAssetStream Billing Team"
        )
        send_mail(subject, body, "noreply@assetstream.io", [lessee.email], fail_silently=True)
        sent += 1

    return f"Overdue notifications sent: {sent} of {overdue.count()} overdue invoices"


@shared_task
def check_sla_breaches():
    """
    Mark ServiceTickets as SLA-breached if past their sla_due_at and still open.
    Escalates critical tickets automatically.
    Runs every 30 minutes.
    """
    from django.utils import timezone
    from servicing.models import ServiceTicket

    now = timezone.now()
    open_statuses = ["open", "in_progress", "pending_parts"]

    breached = ServiceTicket.objects.filter(
        status__in=open_statuses,
        sla_due_at__lt=now,
        sla_breached=False,
    )

    escalated = 0
    for ticket in breached:
        ticket.sla_breached = True
        if ticket.priority == "critical":
            ticket.status = "escalated"
            escalated += 1
        ticket.save(update_fields=["sla_breached", "status"])

        # In-app notification to assignee or admins
        try:
            from communications.views import notify_user
            from django.contrib.auth import get_user_model
            User = get_user_model()
            recipients = [ticket.assigned_to] if ticket.assigned_to else list(User.objects.filter(role="admin")[:3])
            for user in recipients:
                notify_user(
                    user=user,
                    title=f"SLA Breached: {ticket.ticket_number}",
                    body=f"Ticket '{ticket.title}' ({ticket.priority}) has exceeded its SLA target.",
                    notification_type="ticket_update",
                    severity="error",
                    resource_type="ticket",
                    resource_id=ticket.id,
                )
        except Exception:
            pass

    return f"SLA check: {breached.count()} breached, {escalated} auto-escalated"
