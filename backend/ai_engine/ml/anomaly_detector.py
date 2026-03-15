"""
Two-stage invoice anomaly detection:
  Stage 1: IsolationForest (statistical)
  Stage 2: Rule-based Z-score + business rules
"""
import numpy as np
from datetime import timedelta


def _get_invoice_features(invoice, period_hours):
    """Extract numerical features for a single invoice."""
    return [
        float(invoice.total_amount),
        float(invoice.base_fee),
        float(invoice.usage_fee),
        float(period_hours),
    ]


def detect_anomalies():
    """
    Run anomaly detection over all invoices.
    Returns list of dicts with anomaly info (does NOT write to DB — caller saves).
    """
    from django.db.models import Avg, StdDev, Sum
    from servicing.models import Invoice, UsageLog

    invoices = list(
        Invoice.objects.select_related("lease__asset", "lease__lessee")
        .exclude(status="draft")
        .order_by("lease_id", "issued_at")
    )

    if len(invoices) < 3:
        return []

    # Build period_hours mapping
    period_hours_map = {}
    for inv in invoices:
        hours = UsageLog.objects.filter(
            lease=inv.lease,
            timestamp__date__gte=inv.billing_period_start,
            timestamp__date__lte=inv.billing_period_end,
        ).aggregate(h=Sum("hours_used"))["h"] or 0.0
        period_hours_map[inv.id] = float(hours)

    # Stage 1: IsolationForest
    from sklearn.ensemble import IsolationForest
    feature_matrix = np.array([
        _get_invoice_features(inv, period_hours_map[inv.id]) for inv in invoices
    ])
    clf = IsolationForest(n_estimators=50, contamination=0.05, random_state=42)
    clf.fit(feature_matrix)
    scores = clf.decision_function(feature_matrix)

    # IsolationForest: more negative = more anomalous
    threshold = float(np.mean(scores) - 1.5 * np.std(scores))

    # Stage 2: Build per-lease statistics
    lease_stats = {}
    for inv in invoices:
        lease_id = inv.lease_id
        if lease_id not in lease_stats:
            lease_stats[lease_id] = []
        lease_stats[lease_id].append(float(inv.total_amount))

    anomalies = []
    seen_lease_periods = {}  # (lease_id, period_start) -> invoice_id for duplicate detection

    for idx, inv in enumerate(invoices):
        alerts_for_invoice = []
        amount = float(inv.total_amount)
        base_fee = float(inv.base_fee)
        hours = period_hours_map[inv.id]

        # Duplicate check
        key = (inv.lease_id, inv.billing_period_start)
        if key in seen_lease_periods:
            alerts_for_invoice.append({
                "alert_type": "duplicate",
                "severity": "critical",
                "anomaly_score": float(scores[idx]),
                "z_score": None,
                "explanation": (
                    f"Invoice {inv.invoice_number} shares billing period "
                    f"{inv.billing_period_start}–{inv.billing_period_end} "
                    f"with invoice #{seen_lease_periods[key]}. Possible duplicate billing."
                ),
            })
        else:
            seen_lease_periods[key] = inv.invoice_number

        # Zero-usage billed
        if float(inv.usage_fee) > 0 and hours < 0.5:
            alerts_for_invoice.append({
                "alert_type": "zero_usage",
                "severity": "high",
                "anomaly_score": float(scores[idx]),
                "z_score": None,
                "explanation": (
                    f"Invoice {inv.invoice_number} has usage fee ${inv.usage_fee} "
                    f"but only {hours:.1f}h of telemetry logged during the billing period."
                ),
            })

        # Z-score per lease
        history = lease_stats.get(inv.lease_id, [])
        if len(history) >= 3:
            mean_amt = np.mean(history)
            std_amt = np.std(history)
            if std_amt > 0:
                z = (amount - mean_amt) / std_amt
            else:
                z = 0.0

            if abs(z) > 2.5:
                severity = "critical" if abs(z) > 4.0 else ("high" if abs(z) > 3.0 else "medium")
                direction = "above" if z > 0 else "below"
                alerts_for_invoice.append({
                    "alert_type": "spike" if z > 0 else "outlier",
                    "severity": severity,
                    "anomaly_score": float(scores[idx]),
                    "z_score": round(float(z), 2),
                    "explanation": (
                        f"Invoice {inv.invoice_number} amount ${amount:,.2f} is "
                        f"{abs(z):.1f}σ {direction} the lease historical mean "
                        f"(${mean_amt:,.2f} ± ${std_amt:,.2f})."
                    ),
                })
        elif scores[idx] < threshold:
            # Fallback: IsolationForest only
            alerts_for_invoice.append({
                "alert_type": "outlier",
                "severity": "medium",
                "anomaly_score": float(scores[idx]),
                "z_score": None,
                "explanation": (
                    f"Invoice {inv.invoice_number} flagged as a statistical outlier "
                    f"by the anomaly detection model (score: {scores[idx]:.3f})."
                ),
            })

        # Spike: > 3x base_fee
        if amount > base_fee * 3 and not any(a["alert_type"] == "spike" for a in alerts_for_invoice):
            alerts_for_invoice.append({
                "alert_type": "spike",
                "severity": "high",
                "anomaly_score": float(scores[idx]),
                "z_score": None,
                "explanation": (
                    f"Invoice {inv.invoice_number} total ${amount:,.2f} is more than "
                    f"3× the base monthly fee (${base_fee:,.2f}). Review usage charges."
                ),
            })

        for alert in alerts_for_invoice:
            alert["invoice_id"] = inv.id
            alert["invoice_number"] = inv.invoice_number
            alert["lease_id"] = inv.lease_id
            anomalies.append(alert)

    return anomalies
