from django.contrib import admin

from .models import DunningRule, PaymentRecord, ReconciliationReport


@admin.register(PaymentRecord)
class PaymentRecordAdmin(admin.ModelAdmin):
    list_display = ["payment_ref", "invoice", "amount", "payment_method", "status", "created_at"]
    list_filter = ["status", "payment_method"]
    search_fields = ["payment_ref", "invoice__invoice_number"]
    ordering = ["-created_at"]


@admin.register(DunningRule)
class DunningRuleAdmin(admin.ModelAdmin):
    list_display = ["name", "days_overdue", "action", "active", "order"]
    list_filter = ["active", "action"]
    ordering = ["days_overdue", "order"]


@admin.register(ReconciliationReport)
class ReconciliationReportAdmin(admin.ModelAdmin):
    list_display = ["period_start", "period_end", "status", "total_invoiced", "total_received", "generated_at"]
    list_filter = ["status"]
    ordering = ["-generated_at"]
