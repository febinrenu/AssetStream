from datetime import timedelta

from django.utils import timezone
from rest_framework.exceptions import ValidationError

from .models import Asset, LeaseContract


def create_lease_contract(user, asset_id, duration_months):
    """
    Validates asset availability, computes rates, sets asset status to leased,
    and returns the created LeaseContract.
    """
    try:
        asset = Asset.objects.get(pk=asset_id)
    except Asset.DoesNotExist:
        raise ValidationError({"asset_id": "Asset not found."})

    if asset.status != "available":
        raise ValidationError(
            {"asset_id": f"Asset is not available. Current status: {asset.status}"}
        )

    if duration_months < 1 or duration_months > 120:
        raise ValidationError(
            {"duration_months": "Duration must be between 1 and 120 months."}
        )

    start_date = timezone.now().date()
    end_date = start_date + timedelta(days=30 * duration_months)

    lease = LeaseContract.objects.create(
        asset=asset,
        lessee=user,
        start_date=start_date,
        end_date=end_date,
        monthly_base_fee=asset.base_monthly_rate,
        per_hour_rate=asset.per_hour_rate,
        status="active",
    )

    asset.status = "leased"
    asset.save(update_fields=["status"])

    return lease
