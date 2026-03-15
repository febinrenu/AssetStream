"""
Predict maintenance failure probability for each asset based on telemetry trends.
"""
import os
import joblib
import numpy as np
from datetime import timedelta

MAINT_MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "maintenance_model.pkl")

_maint_model = None

RECOMMENDATIONS = {
    "safe": "Operating within normal parameters. Schedule routine check in 90 days.",
    "watch": "Engine temperature trend rising. Schedule inspection within 30 days.",
    "alert": "Multiple anomalous readings detected. Schedule maintenance this week.",
    "critical": "High failure probability. Remove from service immediately for inspection.",
}


def get_maintenance_model():
    global _maint_model
    if _maint_model is None:
        if not os.path.exists(MAINT_MODEL_PATH):
            from ai_engine.ml.train_maintenance import train_model
            _maint_model = train_model()
        else:
            _maint_model = joblib.load(MAINT_MODEL_PATH)
    return _maint_model


def _risk_level(prob):
    if prob < 0.20:
        return "safe"
    elif prob < 0.45:
        return "watch"
    elif prob < 0.70:
        return "alert"
    return "critical"


def predict_asset_maintenance(asset):
    """
    Compute maintenance failure prediction for a single Asset.
    Returns dict suitable for creating/updating a MaintenancePrediction record.
    """
    from django.utils import timezone
    from servicing.models import UsageLog

    now = timezone.now()
    thirty_days_ago = now - timedelta(days=30)

    logs = list(
        UsageLog.objects.filter(asset=asset, timestamp__gte=thirty_days_ago)
        .order_by("timestamp")
        .values_list("timestamp", "engine_temp_celsius", "fuel_level_percent", "hours_used")
    )

    if not logs:
        return {
            "failure_probability": 0.0,
            "days_to_predicted_failure": None,
            "risk_level": "safe",
            "top_signals": [],
            "recommendation": "No telemetry data available for this asset.",
        }

    timestamps = np.array([(ts - logs[0][0]).total_seconds() / 3600 for ts, _, _, _ in logs])
    temps = np.array([t for _, t, _, _ in logs], dtype=float)
    fuels = np.array([f for _, _, f, _ in logs], dtype=float)
    hours_arr = np.array([h for _, _, _, h in logs], dtype=float)

    avg_engine_temp = float(np.mean(temps))
    avg_fuel_level = float(np.mean(fuels))
    hours_per_day = float(np.sum(hours_arr) / 30.0)
    temp_spikes = float(np.sum(temps > 88))

    if len(timestamps) >= 2:
        temp_slope = float(np.polyfit(timestamps, temps, 1)[0])
        fuel_slope = float(np.polyfit(timestamps, fuels, 1)[0])
    else:
        temp_slope = 0.0
        fuel_slope = 0.0

    today = timezone.now().date()
    asset_age_years = float(today.year - asset.manufacture_year)
    total_hours = float(asset.total_hours_logged)

    features = np.array([[
        avg_engine_temp,
        temp_slope,
        avg_fuel_level,
        fuel_slope,
        hours_per_day,
        temp_spikes,
        asset_age_years,
        total_hours,
    ]])

    model = get_maintenance_model()
    proba = model.predict_proba(features)[0]
    probability = float(proba[1]) if len(proba) > 1 else float(proba[0])
    risk = _risk_level(probability)

    days_to_failure = None
    if probability > 0.45:
        days_to_failure = max(1, int(60 * (1.0 - probability)))

    # Build top signals
    signals = []
    if temp_slope > 0.3:
        signals.append({
            "signal": "Engine Temp Trend",
            "value": f"+{temp_slope:.2f}°C/hr",
            "weight": round(min(1.0, temp_slope / 2.0), 2),
        })
    if avg_engine_temp > 82:
        signals.append({
            "signal": "High Avg Engine Temp",
            "value": f"{avg_engine_temp:.1f}°C",
            "weight": round(min(1.0, (avg_engine_temp - 75) / 20), 2),
        })
    if temp_spikes > 3:
        signals.append({
            "signal": "Temperature Spikes",
            "value": f"{int(temp_spikes)} spikes >88°C",
            "weight": round(min(1.0, temp_spikes / 10), 2),
        })
    if fuel_slope < -0.5:
        signals.append({
            "signal": "Fuel Level Declining",
            "value": f"{fuel_slope:.2f}%/hr",
            "weight": round(min(1.0, abs(fuel_slope) / 3.0), 2),
        })
    if asset_age_years > 8:
        signals.append({
            "signal": "Asset Age",
            "value": f"{asset_age_years:.0f} years",
            "weight": round(min(1.0, asset_age_years / 15), 2),
        })

    signals.sort(key=lambda x: -x["weight"])

    return {
        "failure_probability": round(probability, 4),
        "days_to_predicted_failure": days_to_failure,
        "risk_level": risk,
        "top_signals": signals[:4],
        "recommendation": RECOMMENDATIONS[risk],
    }


def predict_all_assets():
    """Predict maintenance for all assets. Returns list of (asset, result_dict)."""
    from originations.models import Asset
    results = []
    for asset in Asset.objects.all():
        result = predict_asset_maintenance(asset)
        results.append((asset, result))
    return results
