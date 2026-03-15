"""
Compute default risk scores for all active leases.
Returns a dict result; caller saves to RiskScore model.
"""
import os
import joblib
import numpy as np
from datetime import date, timedelta

RISK_MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "risk_model.pkl")

_risk_model = None

FEATURE_NAMES = [
    "days_overdue",
    "overdue_count",
    "utilization_change",
    "remaining_months",
    "lessee_lease_count",
    "avg_invoice_amount",
]

DRIVER_LABELS = {
    "days_overdue": "Days overdue on invoices",
    "overdue_count": "Number of overdue invoices",
    "utilization_change": "Utilization trend (30d vs prior 30d)",
    "remaining_months": "Lease term remaining",
    "lessee_lease_count": "Lessee lease portfolio size",
    "avg_invoice_amount": "Average invoice value",
}


def get_risk_model():
    global _risk_model
    if _risk_model is None:
        if not os.path.exists(RISK_MODEL_PATH):
            from ai_engine.ml.train_risk import train_model
            _risk_model = train_model()
        else:
            _risk_model = joblib.load(RISK_MODEL_PATH)
    return _risk_model


def _risk_band(probability):
    if probability < 0.20:
        return "low"
    elif probability < 0.50:
        return "medium"
    elif probability < 0.75:
        return "high"
    return "critical"


def score_lease(lease):
    """
    Compute risk score for a single LeaseContract instance.
    Returns dict suitable for creating/updating a RiskScore record.
    """
    from django.db.models import Avg, Sum
    from django.utils import timezone
    from servicing.models import Invoice, UsageLog

    today = timezone.now().date()
    now = timezone.now()
    thirty_days_ago = now - timedelta(days=30)
    sixty_days_ago = now - timedelta(days=60)

    invoices = Invoice.objects.filter(lease=lease)

    overdue_invoices = invoices.filter(status="overdue")
    days_overdue = 0
    if overdue_invoices.exists():
        days_list = [
            max(0, (today - inv.due_date).days)
            for inv in overdue_invoices
            if inv.due_date < today
        ]
        days_overdue = max(days_list) if days_list else 0

    overdue_count = overdue_invoices.count()

    recent_hours = UsageLog.objects.filter(
        asset=lease.asset, timestamp__gte=thirty_days_ago
    ).aggregate(h=Sum("hours_used"))["h"] or 0.0

    prior_hours = UsageLog.objects.filter(
        asset=lease.asset,
        timestamp__gte=sixty_days_ago,
        timestamp__lt=thirty_days_ago,
    ).aggregate(h=Sum("hours_used"))["h"] or 0.0

    if prior_hours > 0:
        utilization_change = ((recent_hours - prior_hours) / prior_hours) * 100
    else:
        utilization_change = 0.0
    utilization_change = float(np.clip(utilization_change, -100, 100))

    remaining_months = max(0, (lease.end_date - today).days / 30.0)

    lessee_lease_count = float(
        type(lease).objects.filter(lessee=lease.lessee).count()
    )

    recent_invoices = invoices.order_by("-issued_at")[:6]
    amounts = [float(inv.total_amount) for inv in recent_invoices]
    avg_invoice_amount = float(np.mean(amounts)) if amounts else 0.0

    features = np.array([[
        days_overdue,
        float(overdue_count),
        utilization_change,
        remaining_months,
        lessee_lease_count,
        avg_invoice_amount,
    ]])

    model = get_risk_model()
    proba = model.predict_proba(features)[0]
    probability = float(proba[1]) if len(proba) > 1 else float(proba[0])

    # Compute top drivers via coefficient * normalized feature value
    scaler = model.named_steps["scaler"]
    clf = model.named_steps["clf"]
    scaled = scaler.transform(features)[0]
    coefs = clf.coef_[0]
    impacts = [(FEATURE_NAMES[i], float(coefs[i] * scaled[i])) for i in range(len(FEATURE_NAMES))]
    impacts.sort(key=lambda x: abs(x[1]), reverse=True)

    raw_vals = features[0]
    top_drivers = [
        {
            "factor": DRIVER_LABELS[name],
            "key": name,
            "impact": round(impact, 3),
            "direction": "increase" if impact > 0 else "decrease",
            "value": round(float(raw_vals[FEATURE_NAMES.index(name)]), 2),
        }
        for name, impact in impacts[:3]
    ]

    return {
        "probability": round(probability, 4),
        "risk_band": _risk_band(probability),
        "top_drivers": top_drivers,
    }


def score_all_active_leases():
    """Score all active leases. Returns list of (lease, result_dict)."""
    from originations.models import LeaseContract
    results = []
    for lease in LeaseContract.objects.filter(status="active").select_related("asset", "lessee"):
        result = score_lease(lease)
        results.append((lease, result))
    return results
