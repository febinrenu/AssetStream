from rest_framework import serializers

from .models import DunningRule, PaymentRecord, ReconciliationReport


class PaymentRecordSerializer(serializers.ModelSerializer):
    initiated_by_username = serializers.CharField(source="initiated_by.username", read_only=True)
    invoice_number = serializers.CharField(source="invoice.invoice_number", read_only=True)

    class Meta:
        model = PaymentRecord
        fields = [
            "id", "payment_ref", "invoice", "invoice_number",
            "amount", "payment_method", "status",
            "external_ref", "initiated_by", "initiated_by_username",
            "notes", "created_at", "completed_at",
        ]
        read_only_fields = ["id", "payment_ref", "status", "created_at"]


class PaymentInitiateSerializer(serializers.Serializer):
    invoice_id = serializers.IntegerField()
    payment_method = serializers.ChoiceField(choices=PaymentRecord.METHOD_CHOICES)
    notes = serializers.CharField(required=False, allow_blank=True)


class DunningRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = DunningRule
        fields = ["id", "name", "days_overdue", "action", "message_template", "active", "order"]


class ReconciliationReportSerializer(serializers.ModelSerializer):
    generated_by_username = serializers.CharField(source="generated_by.username", read_only=True)

    class Meta:
        model = ReconciliationReport
        fields = [
            "id", "period_start", "period_end",
            "total_invoiced", "total_received", "total_outstanding", "total_overdue",
            "invoice_count", "paid_count", "overdue_count",
            "status", "generated_by", "generated_by_username", "generated_at", "notes",
        ]
        read_only_fields = [
            "id", "total_invoiced", "total_received", "total_outstanding", "total_overdue",
            "invoice_count", "paid_count", "overdue_count", "generated_at",
        ]
