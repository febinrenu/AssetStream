import os
from datetime import date

import joblib
import numpy as np
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from originations.models import Asset

MODEL_PATH = os.path.join(os.path.dirname(__file__), "ml", "model.pkl")

# Load model once at module level
_model = None


def get_model():
    global _model
    if _model is None:
        if not os.path.exists(MODEL_PATH):
            from remarketing.ml.train import train_model
            _model = train_model()
        else:
            _model = joblib.load(MODEL_PATH)
    return _model


def _valuate_asset(asset):
    """Core valuation logic, reusable across views."""
    current_year = date.today().year
    asset_age = current_year - asset.manufacture_year
    total_hours = asset.total_hours_logged
    original_value = float(asset.base_monthly_rate) * 36
    maintenance_events = max(1, int(total_hours / 2000))

    model = get_model()
    features = np.array([[asset_age, total_hours, original_value, maintenance_events]])
    predicted_value = float(model.predict(features)[0])

    confidence_margin = abs(predicted_value * 0.08)
    retention_ratio = predicted_value / original_value if original_value > 0 else 0

    if retention_ratio > 0.7:
        recommendation = "HOLD 6 MONTHS"
        recommendation_color = "success"
    elif retention_ratio > 0.4:
        recommendation = "REMARKET NOW"
        recommendation_color = "warning"
    else:
        recommendation = "SCHEDULE MAINTENANCE"
        recommendation_color = "danger"

    return {
        "asset_id": asset.id,
        "asset_name": asset.name,
        "category": asset.category,
        "serial_number": asset.serial_number,
        "predicted_resale_value": round(predicted_value, 2),
        "confidence_low": round(predicted_value - confidence_margin, 2),
        "confidence_high": round(predicted_value + confidence_margin, 2),
        "original_value": round(original_value, 2),
        "retention_ratio": round(retention_ratio * 100, 1),
        "asset_age_years": asset_age,
        "total_hours": total_hours,
        "maintenance_events": maintenance_events,
        "recommendation": recommendation,
        "recommendation_color": recommendation_color,
    }


class ValuateAssetView(APIView):
    def post(self, request):
        asset_id = request.data.get("asset_id")
        if not asset_id:
            return Response(
                {"detail": "asset_id is required."}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            asset = Asset.objects.get(pk=asset_id)
        except Asset.DoesNotExist:
            return Response(
                {"detail": "Asset not found."}, status=status.HTTP_404_NOT_FOUND
            )

        return Response(_valuate_asset(asset))


class BatchValuationView(APIView):
    """Returns AI valuations for all leased (active) assets."""

    def get(self, request):
        assets = Asset.objects.filter(status__in=["leased", "available", "maintenance"])
        results = [_valuate_asset(a) for a in assets]

        # Portfolio-level stats
        total_portfolio_value = sum(r["predicted_resale_value"] for r in results)
        avg_retention = (
            sum(r["retention_ratio"] for r in results) / len(results) if results else 0
        )

        return Response({
            "total_portfolio_value": round(total_portfolio_value, 2),
            "avg_retention_ratio": round(avg_retention, 1),
            "asset_count": len(results),
            "results": results,
        })


class DepreciationForecastView(APIView):
    """Returns 12-month AI-powered depreciation forecast for all leased assets."""

    def get(self, request):
        assets = Asset.objects.filter(status="leased")
        current_year = date.today().year
        current_month = date.today().month

        model = get_model()

        forecasts = []
        for asset in assets:
            valuation = _valuate_asset(asset)
            current_val = valuation["predicted_resale_value"]
            
            # Start conditions
            original_value = float(asset.base_monthly_rate) * 36
            
            points = []
            for i in range(13):
                month_offset = current_month + i - 1
                year = current_year + month_offset // 12
                month = month_offset % 12 + 1
                
                # Increment age & simulated hours over time
                simulated_age = valuation["asset_age_years"] + (i / 12.0)
                monthly_hours = max(10, asset.total_hours_logged / max(1, valuation["asset_age_years"] * 12))
                simulated_hours = valuation["total_hours"] + (monthly_hours * i)
                simulated_maint = max(1, int(simulated_hours / 2000))
                
                if i == 0:
                    val = current_val
                else:
                    features = np.array([[simulated_age, simulated_hours, original_value, simulated_maint]])
                    val = float(model.predict(features)[0])
                    
                points.append({
                    "label": f"{year}-{month:02d}",
                    "value": round(val, 2),
                })

            forecasts.append({
                "asset_id": asset.id,
                "asset_name": asset.name,
                "category": asset.category,
                "current_value": round(current_val, 2),
                "recommendation": valuation["recommendation"],
                "recommendation_color": valuation["recommendation_color"],
                "retention_ratio": valuation["retention_ratio"],
                "forecast": points,
            })

        return Response({"forecasts": forecasts})


