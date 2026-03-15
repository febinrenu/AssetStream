from rest_framework import serializers
from .models import AnomalyAlert, ChatMessage, ChatSession, MaintenancePrediction, RemarketingRecommendation, RiskScore


class RiskScoreSerializer(serializers.ModelSerializer):
    contract_number = serializers.CharField(source="lease.contract_number", read_only=True)
    asset_name = serializers.CharField(source="lease.asset.name", read_only=True)
    lessee_name = serializers.SerializerMethodField()
    lease_id = serializers.IntegerField(read_only=True)

    class Meta:
        model = RiskScore
        fields = [
            "id", "lease_id", "contract_number", "asset_name", "lessee_name",
            "probability", "risk_band", "top_drivers", "scored_at",
        ]

    def get_lessee_name(self, obj):
        lessee = obj.lease.lessee
        name = f"{lessee.first_name} {lessee.last_name}".strip()
        return name or lessee.company_name or lessee.username


class AnomalyAlertSerializer(serializers.ModelSerializer):
    invoice_number = serializers.CharField(source="invoice.invoice_number", read_only=True)
    lease_id = serializers.IntegerField(source="invoice.lease_id", read_only=True)
    asset_name = serializers.CharField(source="invoice.lease.asset.name", read_only=True)

    class Meta:
        model = AnomalyAlert
        fields = [
            "id", "invoice_id", "invoice_number", "lease_id", "asset_name",
            "alert_type", "severity", "anomaly_score", "z_score",
            "explanation", "resolved", "detected_at", "resolved_at",
        ]


class MaintenancePredictionSerializer(serializers.ModelSerializer):
    asset_id = serializers.IntegerField(read_only=True)
    asset_name = serializers.CharField(source="asset.name", read_only=True)
    category = serializers.CharField(source="asset.category", read_only=True)

    class Meta:
        model = MaintenancePrediction
        fields = [
            "id", "asset_id", "asset_name", "category",
            "failure_probability", "days_to_predicted_failure",
            "risk_level", "top_signals", "recommendation", "predicted_at",
        ]


class RemarketingRecommendationSerializer(serializers.ModelSerializer):
    asset_id = serializers.IntegerField(read_only=True)
    asset_name = serializers.CharField(source="asset.name", read_only=True)
    category = serializers.CharField(source="asset.category", read_only=True)
    sell_price_estimate = serializers.FloatField()
    refurbish_cost_estimate = serializers.FloatField()

    class Meta:
        model = RemarketingRecommendation
        fields = [
            "id", "asset_id", "asset_name", "category",
            "recommended_action", "sell_price_estimate", "refurbish_cost_estimate",
            "net_roi_12m", "roi_curve", "rationale", "computed_at",
        ]


class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ["id", "role", "content", "intent", "chart_data", "timestamp"]


class ChatSessionSerializer(serializers.ModelSerializer):
    messages = ChatMessageSerializer(many=True, read_only=True)

    class Meta:
        model = ChatSession
        fields = ["id", "created_at", "last_active", "messages"]
