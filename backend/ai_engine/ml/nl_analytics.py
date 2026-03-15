"""
Natural Language Analytics Engine — intent detection + ORM query dispatcher.
No LLM required. Handles ~18 common question patterns.
"""
import re
from collections import defaultdict
from datetime import date, datetime as _datetime, time as _time, timedelta


# ── Intent definitions ────────────────────────────────────────────────────────

INTENTS = [
    {
        "slug": "overdue_summary",
        "keywords": ["overdue", "unpaid", "late payment", "delinquent", "past due"],
        "description": "Overdue invoice summary and exposure",
    },
    {
        "slug": "top_lessees",
        "keywords": ["top customer", "biggest lessee", "most revenue", "top lessee", "best client", "highest revenue client"],
        "description": "Top lessees by revenue",
    },
    {
        "slug": "fleet_status",
        "keywords": ["fleet status", "how many assets", "asset status", "available assets", "leased assets"],
        "description": "Fleet status breakdown",
    },
    {
        "slug": "monthly_revenue",
        "keywords": ["revenue", "income", "billing", "monthly revenue", "total revenue", "how much"],
        "description": "Monthly revenue trend",
    },
    {
        "slug": "asset_utilization",
        "keywords": ["utilization", "usage", "hours", "how many hours", "utilisation"],
        "description": "Asset utilization by category",
    },
    {
        "slug": "lease_expiry",
        "keywords": ["expir", "renewal", "ending", "expire", "contract end"],
        "description": "Upcoming lease expirations",
    },
    {
        "slug": "default_risk",
        "keywords": ["risk", "default", "probability", "delinquency", "at risk", "risky"],
        "description": "Portfolio default risk summary",
    },
    {
        "slug": "maintenance_due",
        "keywords": ["maintenance", "repair", "failure", "breakdown", "service due", "fix"],
        "description": "Assets requiring maintenance",
    },
    {
        "slug": "category_breakdown",
        "keywords": ["by category", "category", "heavy equipment", "medical", "fleet category", "industrial"],
        "description": "Revenue/utilization by asset category",
    },
    {
        "slug": "best_asset",
        "keywords": ["best performing", "highest revenue asset", "top asset", "most profitable asset"],
        "description": "Top-performing asset by revenue",
    },
    {
        "slug": "worst_asset",
        "keywords": ["worst", "lowest performing", "least used", "poorest", "underperforming"],
        "description": "Underperforming assets",
    },
    {
        "slug": "anomaly_summary",
        "keywords": ["anomaly", "fraud", "unusual", "suspicious", "irregular", "outlier"],
        "description": "Invoice anomaly summary",
    },
    {
        "slug": "cash_flow",
        "keywords": ["cashflow", "cash flow", "net revenue", "collected", "cash position"],
        "description": "Cash flow — collected vs outstanding",
    },
    {
        "slug": "portfolio_health",
        "keywords": ["portfolio", "health", "overall", "summary", "overview", "how are we doing"],
        "description": "Overall portfolio health summary",
    },
    {
        "slug": "lease_count",
        "keywords": ["how many lease", "lease count", "active lease", "number of lease"],
        "description": "Count of active leases",
    },
    {
        "slug": "predictive_churn",
        "keywords": ["churn", "renewal risk", "will they renew", "retention risk"],
        "description": "Churn and renewal risk predictions",
    },
    {
        "slug": "top_performing",
        "keywords": ["best performing", "top performing", "highest utilization", "most used"],
        "description": "Top performing assets by utilization",
    },
    {
        "slug": "cash_position",
        "keywords": ["cash position", "how much cash", "bank balance", "liquidity"],
        "description": "Current cash position and liquidity",
    },
]


def _parse_date_range(question: str):
    """
    Extract date range from natural language question.
    Returns (start_date, end_date) or None if no date expression found.
    """
    from django.utils import timezone
    q = question.lower().strip()
    today = timezone.now().date()

    # "last 7 days" / "past 7 days" / "last N days"
    m = re.search(r"(?:last|past)\s+(\d+)\s+days?", q)
    if m:
        n = int(m.group(1))
        return (today - timedelta(days=n), today)

    # "past week" / "last week"
    if re.search(r"(?:last|past)\s+week", q):
        return (today - timedelta(days=7), today)

    # "last month"
    if "last month" in q:
        first_this_month = today.replace(day=1)
        last_of_last_month = first_this_month - timedelta(days=1)
        first_of_last_month = last_of_last_month.replace(day=1)
        return (first_of_last_month, last_of_last_month)

    # "last quarter"
    if "last quarter" in q:
        current_quarter = (today.month - 1) // 3  # 0-3
        if current_quarter == 0:
            # last quarter is Q4 of previous year
            return (date(today.year - 1, 10, 1), date(today.year - 1, 12, 31))
        else:
            q_start_month = (current_quarter - 1) * 3 + 1
            q_end_month = current_quarter * 3
            # last day of the quarter end month
            if q_end_month in (1, 3, 5, 7, 8, 10, 12):
                q_end_day = 31
            elif q_end_month in (4, 6, 9, 11):
                q_end_day = 30
            else:
                q_end_day = 28
            return (date(today.year, q_start_month, 1), date(today.year, q_end_month, q_end_day))

    # "this year" / "YTD" / "year to date"
    if any(kw in q for kw in ["this year", "ytd", "year to date"]):
        return (date(today.year, 1, 1), today)

    # "last 90 days"
    if "last 90 days" in q or "past 90 days" in q:
        return (today - timedelta(days=90), today)

    return None


def _detect_intent(question: str) -> str:
    q = question.lower()
    q = re.sub(r"[^\w\s]", " ", q)
    scores = defaultdict(int)
    for intent in INTENTS:
        for kw in intent["keywords"]:
            if kw in q:
                scores[intent["slug"]] += len(kw)  # longer match = higher score
    if not scores:
        return "portfolio_health"
    return max(scores, key=scores.get)


# ── Query handlers ────────────────────────────────────────────────────────────

def _handle_overdue_summary(date_range=None):
    from django.db.models import Count, Sum
    from servicing.models import Invoice
    from django.utils import timezone

    today = timezone.now().date()
    overdue = Invoice.objects.filter(status="overdue").select_related("lease__lessee", "lease__asset")
    if date_range:
        overdue = overdue.filter(due_date__gte=date_range[0], due_date__lte=date_range[1])
    total_amount = sum(float(inv.total_amount) for inv in overdue)
    avg_days = 0
    if overdue:
        days_list = [max(0, (today - inv.due_date).days) for inv in overdue if inv.due_date < today]
        avg_days = round(sum(days_list) / max(len(days_list), 1), 1)

    by_lessee = defaultdict(float)
    for inv in overdue:
        name = inv.lease.lessee.company_name or inv.lease.lessee.username
        by_lessee[name] += float(inv.total_amount)

    chart = [{"name": k, "value": round(v, 2)} for k, v in sorted(by_lessee.items(), key=lambda x: -x[1])[:8]]

    text = (
        f"There are **{overdue.count()} overdue invoices** totalling **${total_amount:,.2f}**. "
        f"Average days overdue: **{avg_days} days**."
    )
    if chart:
        text += f" Top exposure: {chart[0]['name']} (${chart[0]['value']:,.0f})"
    return text, "pie", {"data": chart, "dataKey": "value", "nameKey": "name"}


def _handle_top_lessees():
    from django.db.models import Sum
    from servicing.models import Invoice

    lessee_revenue = defaultdict(float)
    for inv in Invoice.objects.filter(status="paid").select_related("lease__lessee"):
        name = inv.lease.lessee.company_name or inv.lease.lessee.username
        lessee_revenue[name] += float(inv.total_amount)

    top = sorted(lessee_revenue.items(), key=lambda x: -x[1])[:6]
    chart = [{"name": k, "revenue": round(v, 2)} for k, v in top]

    if top:
        text = (
            f"Top lessee by paid revenue: **{top[0][0]}** at **${top[0][1]:,.2f}**. "
            f"Top {len(top)} lessees account for ${sum(v for _, v in top):,.2f} in total paid invoices."
        )
    else:
        text = "No paid invoice data available."
    return text, "bar", {"data": chart, "xKey": "name", "dataKey": "revenue", "label": "Revenue ($)"}


def _handle_fleet_status():
    from django.db.models import Count
    from originations.models import Asset

    counts = {row["status"]: row["count"] for row in Asset.objects.values("status").annotate(count=Count("id"))}
    chart = [{"name": k.capitalize(), "value": v} for k, v in counts.items()]
    total = sum(counts.values())
    text = (
        f"Fleet overview: **{total} total assets** — "
        + ", ".join(f"{k}: {v}" for k, v in counts.items())
        + "."
    )
    return text, "pie", {"data": chart, "dataKey": "value", "nameKey": "name"}


def _handle_monthly_revenue(date_range=None):
    from django.db.models import Sum
    from django.utils import timezone
    from datetime import timedelta
    from servicing.models import Invoice

    now = timezone.now()
    if date_range:
        since = timezone.make_aware(
            _datetime.combine(date_range[0], _time.min)
        ) if isinstance(date_range[0], date) else date_range[0]
    else:
        since = now - timedelta(days=180)

    monthly = defaultdict(float)
    for inv in Invoice.objects.filter(issued_at__gte=since).exclude(status="draft"):
        month = inv.billing_period_end.strftime("%b %Y")
        monthly[month] += float(inv.total_amount)

    from datetime import datetime as _dt
    sorted_months = sorted(monthly.items(), key=lambda x: _dt.strptime(x[0], "%b %Y"))
    chart_data = [{"month": k, "revenue": round(v, 2)} for k, v in sorted_months[-6:]]
    total = sum(v for _, v in sorted_months[-6:])
    latest = sorted_months[-1] if sorted_months else ("N/A", 0)

    text = (
        f"Last 6 months total revenue: **${total:,.2f}**. "
        f"Most recent month ({latest[0]}): **${latest[1]:,.2f}**."
    )
    return text, "bar", {"data": chart_data, "xKey": "month", "dataKey": "revenue", "label": "Revenue ($)"}


def _handle_asset_utilization(date_range=None):
    from django.db.models import Sum
    from django.utils import timezone
    from datetime import timedelta
    from servicing.models import UsageLog
    from originations.models import Asset

    if date_range:
        since = timezone.make_aware(
            _datetime.combine(date_range[0], _time.min)
        ) if isinstance(date_range[0], date) else date_range[0]
    else:
        since = timezone.now() - timedelta(days=30)

    category_hours = defaultdict(float)
    for log in UsageLog.objects.filter(timestamp__gte=since).select_related("asset"):
        category_hours[log.asset.category] += float(log.hours_used)

    total_hours = sum(category_hours.values())
    chart = [{"category": k.replace("_", " ").title(), "hours": round(v, 1)} for k, v in category_hours.items()]
    chart.sort(key=lambda x: -x["hours"])

    text = (
        f"Last 30 days total utilization: **{total_hours:,.1f} hours**. "
        + ("Top category: **" + chart[0]["category"] + f"** ({chart[0]['hours']:,.1f}h)" if chart else "")
    )
    return text, "bar", {"data": chart, "xKey": "category", "dataKey": "hours", "label": "Hours"}


def _handle_lease_expiry():
    from django.utils import timezone
    from datetime import timedelta
    from originations.models import LeaseContract

    today = timezone.now().date()
    ninety_days = today + timedelta(days=90)
    expiring = LeaseContract.objects.filter(
        status="active", end_date__lte=ninety_days, end_date__gte=today
    ).select_related("asset", "lessee").order_by("end_date")

    chart = [
        {
            "name": f"{l.asset.name[:20]}",
            "days_left": (l.end_date - today).days,
            "value": float(l.monthly_base_fee),
        }
        for l in expiring[:8]
    ]
    arr_at_risk = sum(float(l.monthly_base_fee) for l in expiring)

    text = (
        f"**{expiring.count()} leases** expire in the next 90 days, "
        f"representing **${arr_at_risk:,.2f}/mo** in ARR at risk."
    )
    return text, "bar", {"data": chart, "xKey": "name", "dataKey": "days_left", "label": "Days Remaining"}


def _handle_default_risk():
    from ai_engine.models import RiskScore
    if not RiskScore.objects.exists():
        return (
            "No risk scores computed yet. Run the risk score refresh to generate predictions.",
            None, None
        )
    total = RiskScore.objects.count()
    by_band = defaultdict(int)
    for rs in RiskScore.objects.all():
        by_band[rs.risk_band] += 1
    high_risk = by_band.get("high", 0) + by_band.get("critical", 0)
    chart = [{"band": k.capitalize(), "count": v} for k, v in by_band.items()]

    text = (
        f"Portfolio risk: **{total} leases scored**. "
        f"**{high_risk} leases** classified as High/Critical risk "
        f"({round(high_risk/total*100, 0):.0f}% of portfolio)."
    )
    return text, "bar", {"data": chart, "xKey": "band", "dataKey": "count", "label": "Leases"}


def _handle_maintenance_due():
    from ai_engine.models import MaintenancePrediction
    if not MaintenancePrediction.objects.exists():
        return (
            "No maintenance predictions computed yet. Run the maintenance AI refresh.",
            None, None
        )
    preds = list(MaintenancePrediction.objects.select_related("asset").all())
    critical = [p for p in preds if p.risk_level == "critical"]
    alert = [p for p in preds if p.risk_level == "alert"]
    chart = [
        {"asset": p.asset.name[:20], "probability": round(p.failure_probability * 100, 1)}
        for p in sorted(preds, key=lambda x: -x.failure_probability)[:8]
    ]
    text = (
        f"**{len(critical)} assets** at critical risk, **{len(alert)} assets** on alert. "
        f"Total assets analyzed: {len(preds)}."
    )
    return text, "bar", {"data": chart, "xKey": "asset", "dataKey": "probability", "label": "Failure Prob (%)"}


def _handle_category_breakdown():
    from django.db.models import Sum
    from servicing.models import Invoice

    cat_revenue = defaultdict(float)
    for inv in Invoice.objects.filter(status="paid").select_related("lease__asset"):
        cat_revenue[inv.lease.asset.category] += float(inv.total_amount)

    chart = [{"category": k.replace("_", " ").title(), "revenue": round(v, 2)} for k, v in cat_revenue.items()]
    chart.sort(key=lambda x: -x["revenue"])
    total = sum(v for v in cat_revenue.values())

    text = (
        f"Total collected revenue by category (paid invoices): **${total:,.2f}**. "
        + ("Top: **" + chart[0]["category"] + f"** (${chart[0]['revenue']:,.0f})" if chart else "")
    )
    return text, "bar", {"data": chart, "xKey": "category", "dataKey": "revenue", "label": "Revenue ($)"}


def _handle_best_asset():
    from django.db.models import Sum
    from servicing.models import Invoice
    from originations.models import Asset

    asset_revenue = defaultdict(float)
    for inv in Invoice.objects.exclude(status="draft").select_related("lease__asset"):
        asset_revenue[inv.lease.asset.name] += float(inv.total_amount)

    top = sorted(asset_revenue.items(), key=lambda x: -x[1])[:6]
    chart = [{"name": k[:20], "revenue": round(v, 2)} for k, v in top]
    text = (
        f"Best performing asset: **{top[0][0]}** with **${top[0][1]:,.2f}** in billed revenue."
        if top else "No data available."
    )
    return text, "bar", {"data": chart, "xKey": "name", "dataKey": "revenue", "label": "Revenue ($)"}


def _handle_worst_asset():
    from django.db.models import Sum
    from servicing.models import Invoice

    asset_revenue = defaultdict(float)
    for inv in Invoice.objects.exclude(status="draft").select_related("lease__asset"):
        asset_revenue[inv.lease.asset.name] += float(inv.total_amount)

    worst = sorted(asset_revenue.items(), key=lambda x: x[1])[:6]
    chart = [{"name": k[:20], "revenue": round(v, 2)} for k, v in worst]
    text = (
        f"Lowest revenue asset: **{worst[0][0]}** with **${worst[0][1]:,.2f}** in billed revenue."
        if worst else "No data available."
    )
    return text, "bar", {"data": chart, "xKey": "name", "dataKey": "revenue", "label": "Revenue ($)"}


def _handle_anomaly_summary():
    from ai_engine.models import AnomalyAlert
    total = AnomalyAlert.objects.count()
    unresolved = AnomalyAlert.objects.filter(resolved=False).count()
    if total == 0:
        return "No anomaly scan has been run yet. Use the Anomaly Detection page to scan.", None, None
    by_type = defaultdict(int)
    by_severity = defaultdict(int)
    for alert in AnomalyAlert.objects.filter(resolved=False):
        by_type[alert.alert_type] += 1
        by_severity[alert.severity] += 1
    chart = [{"type": k.replace("_", " ").title(), "count": v} for k, v in by_type.items()]
    text = (
        f"**{unresolved} unresolved anomalies** out of {total} total detected. "
        f"Severity breakdown: {dict(by_severity)}."
    )
    return text, "bar", {"data": chart, "xKey": "type", "dataKey": "count", "label": "Count"}


def _handle_cash_flow():
    from django.db.models import Sum
    from servicing.models import Invoice

    paid = float(Invoice.objects.filter(status="paid").aggregate(s=Sum("total_amount"))["s"] or 0)
    outstanding = float(
        Invoice.objects.filter(status__in=["issued", "overdue"]).aggregate(s=Sum("total_amount"))["s"] or 0
    )
    overdue = float(Invoice.objects.filter(status="overdue").aggregate(s=Sum("total_amount"))["s"] or 0)
    collection_rate = paid / (paid + outstanding) * 100 if (paid + outstanding) > 0 else 0

    chart = [
        {"name": "Collected", "value": round(paid, 2)},
        {"name": "Outstanding", "value": round(outstanding - overdue, 2)},
        {"name": "Overdue", "value": round(overdue, 2)},
    ]
    text = (
        f"Total collected: **${paid:,.2f}**. "
        f"Outstanding: **${outstanding:,.2f}** (overdue: **${overdue:,.2f}**). "
        f"Collection rate: **{collection_rate:.1f}%**."
    )
    return text, "pie", {"data": chart, "dataKey": "value", "nameKey": "name"}


def _handle_portfolio_health():
    from django.db.models import Count, Sum
    from servicing.models import Invoice
    from originations.models import LeaseContract, Asset

    active_leases = LeaseContract.objects.filter(status="active").count()
    overdue_count = Invoice.objects.filter(status="overdue").count()
    overdue_amount = float(Invoice.objects.filter(status="overdue").aggregate(s=Sum("total_amount"))["s"] or 0)
    total_assets = Asset.objects.count()
    arr = float(
        LeaseContract.objects.filter(status="active").aggregate(s=Sum("monthly_base_fee"))["s"] or 0
    )

    chart = [
        {"metric": "Active Leases", "value": active_leases},
        {"metric": "Total Assets", "value": total_assets},
        {"metric": "Overdue Invoices", "value": overdue_count},
    ]
    text = (
        f"**Portfolio health snapshot**: {active_leases} active leases, "
        f"${arr:,.2f}/mo ARR, {total_assets} total assets. "
        f"Overdue exposure: **{overdue_count} invoices** (${overdue_amount:,.2f})."
    )
    return text, "bar", {"data": chart, "xKey": "metric", "dataKey": "value", "label": "Count"}


def _handle_lease_count():
    from originations.models import LeaseContract
    from django.db.models import Count

    counts = {
        row["status"]: row["count"]
        for row in LeaseContract.objects.values("status").annotate(count=Count("id"))
    }
    total = sum(counts.values())
    chart = [{"status": k.capitalize(), "count": v} for k, v in counts.items()]
    text = (
        f"Total lease contracts: **{total}**. "
        + " | ".join(f"{k}: {v}" for k, v in counts.items())
    )
    return text, "bar", {"data": chart, "xKey": "status", "dataKey": "count", "label": "Count"}


def _handle_predictive_churn():
    from django.utils import timezone
    from datetime import timedelta
    from originations.models import LeaseContract
    from servicing.models import Invoice

    today = timezone.now().date()
    ninety_days = today + timedelta(days=90)

    expiring = LeaseContract.objects.filter(
        status="active", end_date__lte=ninety_days, end_date__gte=today
    ).select_related("asset", "lessee")

    at_risk = []
    for lease in expiring:
        overdue_count = Invoice.objects.filter(
            lease=lease, status="overdue"
        ).count()
        days_left = (lease.end_date - today).days
        # Simple churn risk heuristic: overdue invoices + proximity to end
        risk_score = min(100, overdue_count * 25 + max(0, 50 - days_left))
        at_risk.append({
            "name": f"{lease.asset.name[:20]}",
            "risk": risk_score,
            "lessee": lease.lessee.company_name or lease.lessee.username,
            "days_left": days_left,
            "overdue_invoices": overdue_count,
        })

    at_risk.sort(key=lambda x: -x["risk"])
    chart = at_risk[:8]
    high_risk = [r for r in at_risk if r["risk"] >= 50]

    text = (
        f"**{len(high_risk)} leases** at high churn risk (score >= 50) out of "
        f"{len(at_risk)} expiring in 90 days."
    )
    if high_risk:
        text += f" Highest risk: **{high_risk[0]['name']}** (score {high_risk[0]['risk']})"
    return text, "bar", {"data": chart, "xKey": "name", "dataKey": "risk", "label": "Churn Risk Score"}


def _handle_top_performing():
    from django.db.models import Sum
    from django.utils import timezone
    from datetime import timedelta
    from servicing.models import UsageLog
    from originations.models import Asset

    thirty_days_ago = timezone.now() - timedelta(days=30)
    asset_hours = defaultdict(float)
    for log in UsageLog.objects.filter(timestamp__gte=thirty_days_ago).select_related("asset"):
        asset_hours[log.asset.name] += float(log.hours_used)

    top = sorted(asset_hours.items(), key=lambda x: -x[1])[:8]
    chart = [{"name": k[:20], "hours": round(v, 1)} for k, v in top]

    text = (
        f"Top performing asset by utilization (last 30d): **{top[0][0]}** "
        f"with **{top[0][1]:,.1f} hours**."
        if top else "No utilization data available."
    )
    return text, "bar", {"data": chart, "xKey": "name", "dataKey": "hours", "label": "Hours (30d)"}


def _handle_cash_position():
    from django.db.models import Sum
    from servicing.models import Invoice

    paid = float(Invoice.objects.filter(status="paid").aggregate(s=Sum("total_amount"))["s"] or 0)
    issued = float(Invoice.objects.filter(status="issued").aggregate(s=Sum("total_amount"))["s"] or 0)
    overdue = float(Invoice.objects.filter(status="overdue").aggregate(s=Sum("total_amount"))["s"] or 0)
    total_billed = paid + issued + overdue

    # Effective cash = collected - estimated operational costs (15%)
    operational_costs = paid * 0.15
    net_cash = paid - operational_costs
    receivables = issued + overdue

    chart = [
        {"name": "Net Cash", "value": round(net_cash, 2)},
        {"name": "Receivables", "value": round(issued, 2)},
        {"name": "Overdue", "value": round(overdue, 2)},
        {"name": "Op. Costs", "value": round(operational_costs, 2)},
    ]

    text = (
        f"**Cash position**: Net cash **${net_cash:,.2f}** (collected ${paid:,.2f} less "
        f"~15% operational costs). Receivables: **${receivables:,.2f}** "
        f"(${issued:,.2f} current + ${overdue:,.2f} overdue)."
    )
    return text, "pie", {"data": chart, "dataKey": "value", "nameKey": "name"}


HANDLERS = {
    "overdue_summary": _handle_overdue_summary,
    "top_lessees": _handle_top_lessees,
    "fleet_status": _handle_fleet_status,
    "monthly_revenue": _handle_monthly_revenue,
    "asset_utilization": _handle_asset_utilization,
    "lease_expiry": _handle_lease_expiry,
    "default_risk": _handle_default_risk,
    "maintenance_due": _handle_maintenance_due,
    "category_breakdown": _handle_category_breakdown,
    "best_asset": _handle_best_asset,
    "worst_asset": _handle_worst_asset,
    "anomaly_summary": _handle_anomaly_summary,
    "cash_flow": _handle_cash_flow,
    "portfolio_health": _handle_portfolio_health,
    "lease_count": _handle_lease_count,
    "predictive_churn": _handle_predictive_churn,
    "top_performing": _handle_top_performing,
    "cash_position": _handle_cash_position,
}

EXAMPLE_QUESTIONS = [
    "What is our overdue invoice exposure?",
    "Show me revenue by category",
    "Which assets are approaching maintenance failure?",
    "What is the current fleet status?",
    "Show me the top lessees by revenue",
    "What are our upcoming lease expirations?",
    "How is our portfolio default risk?",
    "Show me the monthly revenue trend",
]


def process_query(question: str) -> dict:
    """
    Process a natural language question and return a structured response.
    Returns: {intent, text_answer, chart_type, chart_data, date_range?}
    """
    intent = _detect_intent(question)
    handler = HANDLERS.get(intent, _handle_portfolio_health)
    date_range = _parse_date_range(question)

    try:
        # Pass date_range to handlers that accept it
        import inspect
        sig = inspect.signature(handler)
        if "date_range" in sig.parameters:
            text, chart_type, chart_data = handler(date_range=date_range)
        else:
            text, chart_type, chart_data = handler()
    except Exception as e:
        text = f"I encountered an error analyzing that query: {str(e)}"
        chart_type = None
        chart_data = None

    result = {
        "intent": intent,
        "text_answer": text,
        "chart_type": chart_type,
        "chart_data": chart_data,
    }
    if date_range:
        result["date_range"] = {
            "start": date_range[0].isoformat(),
            "end": date_range[1].isoformat(),
        }
    return result
