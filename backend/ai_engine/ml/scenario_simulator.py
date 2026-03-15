"""
Scenario Simulator — mathematical model for revenue/cashflow projections.
No ML model required.
"""
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta


def run_simulation(params: dict) -> dict:
    """
    Run a 12-month scenario simulation.

    params keys:
        utilization_change_pct: float  (-50 to 100)
        monthly_rate_change_pct: float (-30 to 50)
        default_rate_override: float   (0 to 100, % of leases defaulting)
        new_lease_count: int           (0 to 20)
        simulation_months: int         (3 to 24, default 12)
    """
    from django.db.models import Sum, Avg
    from django.utils import timezone
    from originations.models import LeaseContract
    from servicing.models import Invoice

    utilization_change = float(params.get("utilization_change_pct", 0)) / 100.0
    rate_change = float(params.get("monthly_rate_change_pct", 0)) / 100.0
    default_rate = float(params.get("default_rate_override", 2.0)) / 100.0
    new_lease_count = int(params.get("new_lease_count", 0))
    sim_months = min(24, max(3, int(params.get("simulation_months", 12))))

    now = timezone.now()
    today = now.date()

    # Base metrics from live data
    active_leases = LeaseContract.objects.filter(status="active").select_related("asset")
    current_arr = sum(float(l.monthly_base_fee) for l in active_leases)

    three_months_ago = now - timedelta(days=90)
    recent_usage_revenue = (
        Invoice.objects
        .filter(issued_at__gte=three_months_ago)
        .exclude(status="draft")
        .aggregate(s=Sum("usage_fee"))["s"] or 0
    )
    avg_monthly_usage_revenue = float(recent_usage_revenue) / 3.0

    avg_lease_rate = current_arr / max(len(active_leases), 1) if active_leases else 5000.0

    # Adjusted monthly values
    adjusted_base_revenue = current_arr * (1 + rate_change)
    adjusted_usage_revenue = avg_monthly_usage_revenue * (1 + utilization_change)
    new_lease_income = avg_lease_rate * new_lease_count

    monthly_results = []
    cumulative_cashflow = 0.0
    break_even_month = None

    for m in range(1, sim_months + 1):
        month_label = (today + relativedelta(months=m)).strftime("%Y-%m")

        # New lease income phases in over first 3 months
        new_income = new_lease_income if m <= 3 else (new_lease_income * 0.8 if m <= 6 else 0)

        monthly_revenue = adjusted_base_revenue + adjusted_usage_revenue + new_income

        # Default losses
        default_loss = monthly_revenue * default_rate

        # Net cashflow
        net_cashflow = monthly_revenue - default_loss
        cumulative_cashflow += net_cashflow

        if break_even_month is None and cumulative_cashflow >= 0:
            break_even_month = m

        monthly_results.append({
            "month": month_label,
            "revenue": round(monthly_revenue, 2),
            "cashflow": round(net_cashflow, 2),
            "cumulative": round(cumulative_cashflow, 2),
            "default_loss": round(default_loss, 2),
            "new_income": round(new_income, 2),
        })

    total_revenue = sum(r["revenue"] for r in monthly_results)
    total_cashflow = sum(r["cashflow"] for r in monthly_results)
    max_monthly = max(r["revenue"] for r in monthly_results) if monthly_results else 0

    baseline_12m = current_arr * sim_months + avg_monthly_usage_revenue * sim_months
    delta_pct = ((total_revenue - baseline_12m) / baseline_12m * 100) if baseline_12m else 0

    return {
        "monthly": monthly_results,
        "summary": {
            "total_revenue": round(total_revenue, 2),
            "total_cashflow": round(total_cashflow, 2),
            "break_even_month": break_even_month,
            "max_monthly_revenue": round(max_monthly, 2),
            "baseline_12m_revenue": round(baseline_12m, 2),
            "delta_vs_baseline_pct": round(delta_pct, 1),
            "current_monthly_arr": round(current_arr, 2),
        },
    }
