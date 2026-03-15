from datetime import timedelta
from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone

from originations.models import LeaseContract

from .models import Invoice, UsageLog


def apply_pricing_rules(lease, base_amount, usage_hours):
    """Apply active PricingRules to compute final invoice amount and adjustments."""
    from decimal import Decimal
    from django.db import models as django_models
    from django.utils import timezone
    from servicing.models import PricingRule

    rules = PricingRule.objects.filter(active=True).filter(
        django_models.Q(asset_category="") | django_models.Q(asset_category=lease.asset.category)
    )

    final_amount = base_amount
    adjustments = []
    current_month = timezone.now().month
    lease_months = max(1, (lease.end_date - lease.start_date).days // 30)

    for rule in rules:
        p = rule.params
        if rule.rule_type == "seasonal":
            if current_month in p.get("months", []):
                multiplier = Decimal(str(p.get("multiplier", 1.0)))
                delta = base_amount * (multiplier - 1)
                final_amount += delta
                adjustments.append({"rule": rule.name, "type": "seasonal", "delta": float(delta)})

        elif rule.rule_type == "utilization_tier":
            tiers = p.get("tiers", [])
            for tier in tiers:
                if tier["min"] <= usage_hours < tier["max"]:
                    tier_amount = Decimal(str(tier["rate_per_hour"])) * Decimal(str(usage_hours))
                    final_amount += tier_amount
                    adjustments.append({"rule": rule.name, "type": "utilization_tier", "delta": float(tier_amount)})
                    break

        elif rule.rule_type == "volume_discount":
            min_months = p.get("min_lease_months", 12)
            if lease_months >= min_months:
                discount = Decimal(str(p.get("discount_percent", 0))) / 100
                delta = -(base_amount * discount)
                final_amount += delta
                adjustments.append({"rule": rule.name, "type": "volume_discount", "delta": float(delta)})

    return final_amount, adjustments


def calculate_usage_invoice(lease_id, period_start, period_end):
    """
    Aggregates UsageLogs for a lease within a period,
    computes base + usage fees, creates and returns an Invoice.
    """
    try:
        lease = LeaseContract.objects.get(pk=lease_id)
    except LeaseContract.DoesNotExist:
        raise ValueError(f"Lease {lease_id} not found.")

    total_hours = UsageLog.objects.filter(
        lease=lease,
        timestamp__date__gte=period_start,
        timestamp__date__lte=period_end,
    ).aggregate(total=Sum("hours_used"))["total"] or 0.0

    base_fee = lease.monthly_base_fee
    usage_fee = Decimal(str(round(total_hours, 2))) * lease.per_hour_rate
    base_total = base_fee + usage_fee

    # Apply active pricing rules for adjustments
    total_amount, adjustments = apply_pricing_rules(lease, base_total, total_hours)

    invoice = Invoice.objects.create(
        lease=lease,
        billing_period_start=period_start,
        billing_period_end=period_end,
        base_fee=base_fee,
        usage_fee=usage_fee,
        total_amount=total_amount,
        status="issued",
        due_date=period_end + timedelta(days=30),
    )

    return invoice
