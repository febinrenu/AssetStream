"""
Remarketing Decision Engine — hold/sell/refurbish/re_lease with 12-month ROI curve.
Reuses the valuation model from remarketing app.
"""
import math
from datetime import date
from dateutil.relativedelta import relativedelta


def _monthly_depreciation_factor(months, age_years):
    """Monthly value decay using same formula as remarketing train.py."""
    extra_years = months / 12.0
    return math.exp(-0.08 * extra_years)


def compute_recommendation(asset):
    """
    Compute hold/sell/refurbish/re_lease recommendation for an Asset.
    Returns dict suitable for RemarketingRecommendation.
    """
    from remarketing.views import _valuate_asset
    from originations.models import LeaseContract

    valuation = _valuate_asset(asset)
    current_value = valuation["predicted_resale_value"]
    original_value = valuation["original_value"]
    asset_age = valuation["asset_age_years"]
    total_hours = valuation["total_hours"]

    # Refurbish cost heuristic
    refurbish_cost = min(
        current_value * 0.20,
        max(2000.0, total_hours * 0.08 + asset_age * 400),
    )

    # Active lease income potential
    active_lease = (
        LeaseContract.objects.filter(asset=asset, status="active")
        .select_related("lessee")
        .first()
    )
    monthly_lease_income = float(active_lease.monthly_base_fee) if active_lease else 0.0
    remaining_lease_months = 0
    if active_lease:
        remaining_lease_months = max(0, (active_lease.end_date - date.today()).days // 30)

    today = date.today()
    roi_data = {}

    # SELL_NOW: realise current_value in month 0, flat afterward
    sell_now_net = current_value
    roi_data["sell_now"] = []
    for m in range(1, 13):
        month_label = (today + relativedelta(months=m)).strftime("%Y-%m")
        roi_data["sell_now"].append({
            "month": month_label,
            "roi": round((sell_now_net - original_value) / original_value * 100, 1) if original_value else 0,
            "cumulative_value": round(sell_now_net, 0),
        })

    # HOLD: continue depreciating, collect lease income
    hold_values = []
    hold_cumulative = 0.0
    for m in range(1, 13):
        month_label = (today + relativedelta(months=m)).strftime("%Y-%m")
        decayed_value = current_value * _monthly_depreciation_factor(m, asset_age)
        income = monthly_lease_income if m <= remaining_lease_months else 0
        hold_cumulative += income
        net = decayed_value + hold_cumulative
        roi = (net - original_value) / original_value * 100 if original_value else 0
        hold_values.append({
            "month": month_label,
            "roi": round(roi, 1),
            "cumulative_value": round(net, 0),
        })
    roi_data["hold"] = hold_values

    # REFURBISH: pay cost in month 1, sell at 1.15× in month 3
    refurbish_sale_price = current_value * 1.15
    refurb_values = []
    for m in range(1, 13):
        month_label = (today + relativedelta(months=m)).strftime("%Y-%m")
        if m < 3:
            net = -refurbish_cost if m == 1 else 0
        else:
            net = refurbish_sale_price - refurbish_cost
        roi = (net) / original_value * 100 if original_value else 0
        refurb_values.append({
            "month": month_label,
            "roi": round(roi, 1),
            "cumulative_value": round(current_value + net, 0),
        })
    roi_data["refurbish"] = refurb_values

    # RE_LEASE: project new 18-month lease, offset by depreciation
    avg_monthly_rate = float(asset.base_monthly_rate)
    re_lease_values = []
    re_lease_cumulative = 0.0
    for m in range(1, 13):
        month_label = (today + relativedelta(months=m)).strftime("%Y-%m")
        decayed_value = current_value * _monthly_depreciation_factor(m, asset_age)
        income = avg_monthly_rate if m <= 18 else 0
        re_lease_cumulative += income
        net = decayed_value + re_lease_cumulative
        roi = (net - original_value) / original_value * 100 if original_value else 0
        re_lease_values.append({
            "month": month_label,
            "roi": round(roi, 1),
            "cumulative_value": round(net, 0),
        })
    roi_data["re_lease"] = re_lease_values

    # Final 12-month ROI for each
    final_rois = {
        "sell_now": roi_data["sell_now"][-1]["roi"],
        "hold": roi_data["hold"][-1]["roi"],
        "refurbish": roi_data["refurbish"][-1]["roi"],
        "re_lease": roi_data["re_lease"][-1]["roi"],
    }
    best_action = max(final_rois, key=final_rois.get)
    net_roi_12m = final_rois[best_action]

    rationale_parts = [
        f"Current market value: ${current_value:,.0f} (retention: {valuation['retention_ratio']}%).",
        f"Estimated refurbish cost: ${refurbish_cost:,.0f}.",
    ]
    if active_lease:
        rationale_parts.append(
            f"Active lease generating ${monthly_lease_income:,.0f}/mo with "
            f"{remaining_lease_months} months remaining."
        )
    rationale_parts.append(
        f"12-month ROI comparison: sell_now={final_rois['sell_now']:.1f}%, "
        f"hold={final_rois['hold']:.1f}%, refurbish={final_rois['refurbish']:.1f}%, "
        f"re_lease={final_rois['re_lease']:.1f}%."
    )
    rationale_parts.append(f"Recommendation: {best_action.upper()} for best return.")

    return {
        "recommended_action": best_action,
        "sell_price_estimate": round(current_value, 2),
        "refurbish_cost_estimate": round(refurbish_cost, 2),
        "net_roi_12m": round(net_roi_12m, 2),
        "roi_curve": roi_data[best_action],
        "rationale": " ".join(rationale_parts),
        "all_roi_curves": roi_data,
        "final_rois": final_rois,
    }


def compute_all_recommendations():
    """Compute remarketing recommendations for all assets. Returns list of (asset, result_dict)."""
    from originations.models import Asset
    results = []
    for asset in Asset.objects.all():
        result = compute_recommendation(asset)
        results.append((asset, result))
    return results
