"""
AI Lease Structuring Copilot — Recommends lease terms based on
asset profile + lessee history + risk appetite.
"""
import math


RATE_MULTIPLIER_TABLE = {
    "conservative": {
        "good": 1.05,    # credit_score >= 80
        "medium": 1.18,  # 60–79
        "poor": 1.30,    # < 60
    },
    "balanced": {
        "good": 1.00,
        "medium": 1.10,
        "poor": 1.20,
    },
    "aggressive": {
        "good": 0.95,
        "medium": 1.05,
        "poor": 1.15,
    },
}

RECOMMENDED_TERMS = [12, 18, 24, 36, 48]


def _credit_tier(score):
    if score >= 80:
        return "good"
    elif score >= 60:
        return "medium"
    return "poor"


def structure_lease(asset_id: int, lessee_id: int = None, risk_appetite: str = "balanced",
                    requested_term_months: int = 24) -> dict:
    """
    Generate lease structure recommendation.
    """
    from originations.models import Asset, LeaseContract
    from servicing.models import Invoice
    from django.contrib.auth import get_user_model
    from remarketing.views import _valuate_asset
    from django.utils import timezone

    User = get_user_model()

    try:
        asset = Asset.objects.get(pk=asset_id)
    except Asset.DoesNotExist:
        return {"error": "Asset not found."}

    lessee = None
    if lessee_id:
        try:
            lessee = User.objects.get(pk=lessee_id)
        except User.DoesNotExist:
            pass

    # Lessee credit scoring
    if lessee:
        past_invoices = Invoice.objects.filter(lease__lessee=lessee)
        total_inv = past_invoices.count()
        overdue_inv = past_invoices.filter(status="overdue").count()
        paid_inv = past_invoices.filter(status="paid").count()

        today = timezone.now().date()
        overdue_qs = past_invoices.filter(status="overdue")
        avg_days_overdue = 0.0
        if overdue_qs.exists():
            days_list = [max(0, (today - inv.due_date).days) for inv in overdue_qs if inv.due_date < today]
            avg_days_overdue = sum(days_list) / max(len(days_list), 1)

        lease_count = LeaseContract.objects.filter(lessee=lessee).count()

        # Credit score: start at 100, penalize for payment issues
        credit_score = 100
        credit_score -= overdue_inv * 12
        credit_score -= avg_days_overdue * 0.25
        credit_score += min(lease_count * 3, 15)  # loyalty bonus
        if total_inv > 0:
            payment_ratio = paid_inv / total_inv
            credit_score += (payment_ratio - 0.5) * 20
        credit_score = max(0, min(100, credit_score))

        risk_flags = []
        if overdue_inv > 0:
            risk_flags.append(f"{overdue_inv}_overdue_invoices")
        if avg_days_overdue > 30:
            risk_flags.append("chronic_late_payer")
        if credit_score < 60:
            risk_flags.append("poor_credit_history")
        if lease_count == 0:
            risk_flags.append("new_lessee_no_history")
    else:
        credit_score = 70.0
        risk_flags = ["no_lessee_selected"]

    # Asset valuation
    valuation = _valuate_asset(asset)
    retention_ratio = valuation["retention_ratio"]
    current_value = valuation["predicted_resale_value"]
    original_value = valuation["original_value"]

    if retention_ratio < 40:
        risk_flags.append("low_asset_retention")
    if asset.total_hours_logged > 20000:
        risk_flags.append("high_usage_asset")

    # Rate multiplier
    tier = _credit_tier(credit_score)
    appetite = risk_appetite if risk_appetite in RATE_MULTIPLIER_TABLE else "balanced"
    multiplier = RATE_MULTIPLIER_TABLE[appetite][tier]

    suggested_rate = round(float(asset.base_monthly_rate) * multiplier, 2)

    # Deposit recommendation
    deposit_pct = round(max(10.0, min(40.0, 30.0 - credit_score * 0.20)), 1)

    # Residual value at end of term
    years_in_term = requested_term_months / 12.0
    current_age = valuation["asset_age_years"]
    residual_value = round(
        current_value * math.exp(-0.08 * years_in_term), 2
    )

    # Term recommendation
    if credit_score >= 80 and retention_ratio >= 60:
        recommended_term = min(requested_term_months, 36)
    elif credit_score >= 60:
        recommended_term = min(requested_term_months, 24)
    else:
        recommended_term = min(requested_term_months, 18)

    # Snap to valid term
    recommended_term = min(RECOMMENDED_TERMS, key=lambda t: abs(t - recommended_term))

    rationale_parts = [
        f"Lessee credit score: {credit_score:.0f}/100 ({tier} tier).",
        f"Rate multiplier {multiplier:.2f}× applied for '{appetite}' risk appetite at '{tier}' credit tier.",
        f"Asset retention ratio: {retention_ratio}% — current market value ${current_value:,.0f}.",
        f"Recommended deposit: {deposit_pct}% to mitigate {'elevated' if deposit_pct > 20 else 'standard'} risk.",
        f"Estimated residual value after {recommended_term} months: ${residual_value:,.0f}.",
    ]
    if risk_flags:
        rationale_parts.append(f"Risk flags: {', '.join(risk_flags)}.")

    # Alternative terms with different rates
    alternatives = []
    for alt_term in RECOMMENDED_TERMS:
        if alt_term == recommended_term:
            continue
        alt_mult = multiplier * (0.97 if alt_term >= 24 else 1.03)
        alt_residual = round(current_value * math.exp(-0.08 * alt_term / 12), 2)
        alternatives.append({
            "term_months": alt_term,
            "monthly_rate": round(float(asset.base_monthly_rate) * alt_mult, 2),
            "residual_value": alt_residual,
            "rate_multiplier": round(alt_mult, 3),
        })

    return {
        "recommended_term_months": recommended_term,
        "rate_multiplier": round(multiplier, 3),
        "suggested_monthly_rate": suggested_rate,
        "deposit_percent": deposit_pct,
        "residual_value": residual_value,
        "lessee_credit_score": round(credit_score, 1),
        "asset_retention_ratio": retention_ratio,
        "risk_appetite": appetite,
        "risk_flags": risk_flags,
        "rationale": " ".join(rationale_parts),
        "alternatives": alternatives[:3],
        "asset_name": asset.name,
        "lessee_name": (
            f"{lessee.first_name} {lessee.last_name}".strip() or lessee.username
        ) if lessee else "Unknown",
    }
