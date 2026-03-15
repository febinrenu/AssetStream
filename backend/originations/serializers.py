from rest_framework import serializers

from accounts.serializers import UserSerializer

from .models import Asset, ContractAnalysis, LeaseContract


class AssetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Asset
        fields = [
            "id", "name", "category", "serial_number", "manufacture_year",
            "base_monthly_rate", "per_hour_rate", "status", "image_url",
            "total_hours_logged",
        ]


class LeaseContractSerializer(serializers.ModelSerializer):
    asset_detail = AssetSerializer(source="asset", read_only=True)
    lessee_detail = UserSerializer(source="lessee", read_only=True)
    document_url = serializers.SerializerMethodField()

    class Meta:
        model = LeaseContract
        fields = [
            "id", "asset", "lessee", "contract_number", "start_date", "end_date",
            "monthly_base_fee", "per_hour_rate", "status", "document_url", "created_at",
            "asset_detail", "lessee_detail",
        ]
        read_only_fields = [
            "contract_number", "monthly_base_fee", "per_hour_rate", "created_at",
        ]

    def get_document_url(self, obj) -> str | None:
        request = self.context.get("request")
        if obj.document and hasattr(obj.document, "url"):
            url = obj.document.url
            if request:
                return request.build_absolute_uri(url)
            return url
        return None


class CreateLeaseSerializer(serializers.Serializer):
    asset_id = serializers.IntegerField()
    duration_months = serializers.IntegerField(min_value=1, max_value=120)


class LeaseStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=LeaseContract.STATUS_CHOICES)


class RenewLeaseSerializer(serializers.Serializer):
    duration_months = serializers.IntegerField(min_value=1, max_value=120)
    notes = serializers.CharField(max_length=500, required=False, allow_blank=True)


class ContractAnalysisSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContractAnalysis
        fields = [
            "id", "lease", "status", "extracted_data", "validation_issues",
            "confidence_score", "pages_analyzed", "analyzed_at", "error_message",
        ]
        read_only_fields = fields
