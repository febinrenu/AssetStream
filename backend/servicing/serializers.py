from rest_framework import serializers

from originations.serializers import AssetSerializer, LeaseContractSerializer

from .models import Invoice, MaintenanceLog, PricingRule, ServiceTicket, UsageLog


class UsageLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = UsageLog
        fields = [
            "id", "asset", "lease", "timestamp", "hours_used",
            "latitude", "longitude", "engine_temp_celsius", "fuel_level_percent",
        ]


class InvoiceSerializer(serializers.ModelSerializer):
    lease_detail = LeaseContractSerializer(source="lease", read_only=True)

    class Meta:
        model = Invoice
        fields = [
            "id", "lease", "invoice_number", "billing_period_start",
            "billing_period_end", "base_fee", "usage_fee", "total_amount",
            "status", "issued_at", "due_date", "lease_detail",
        ]
        read_only_fields = [
            "invoice_number", "base_fee", "usage_fee", "total_amount", "issued_at",
        ]


class MaintenanceLogSerializer(serializers.ModelSerializer):
    logged_by_username = serializers.SerializerMethodField()

    class Meta:
        model = MaintenanceLog
        fields = [
            "id", "asset", "logged_by", "logged_by_username",
            "notes", "priority", "start_date", "resolved_date",
            "resolved", "created_at",
        ]
        read_only_fields = ["logged_by", "created_at"]

    def get_logged_by_username(self, obj):
        return obj.logged_by.username if obj.logged_by else "system"


class ServiceTicketSerializer(serializers.ModelSerializer):
    reported_by_username = serializers.CharField(source="reported_by.username", read_only=True)
    assigned_to_username = serializers.CharField(source="assigned_to.username", read_only=True, default=None)
    asset_name = serializers.CharField(source="asset.name", read_only=True)
    sla_hours_total = serializers.SerializerMethodField()

    class Meta:
        model = ServiceTicket
        fields = [
            "id", "ticket_number", "title", "description", "category", "priority", "status",
            "asset", "asset_name",
            "reported_by", "reported_by_username",
            "assigned_to", "assigned_to_username",
            "sla_due_at", "sla_breached", "sla_hours_total",
            "resolution_notes", "resolved_at",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "ticket_number", "sla_due_at", "sla_breached", "created_at", "updated_at"]

    def get_sla_hours_total(self, obj):
        return ServiceTicket.SLA_HOURS.get(obj.priority, 24)


class PricingRuleSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source="created_by.username", read_only=True, default=None)
    rule_type_display = serializers.CharField(source="get_rule_type_display", read_only=True)

    class Meta:
        model = PricingRule
        fields = [
            "id", "name", "rule_type", "rule_type_display",
            "asset_category", "active", "params", "description",
            "created_by", "created_by_username", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
