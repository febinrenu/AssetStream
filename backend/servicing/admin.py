from django.contrib import admin

from .models import Invoice, UsageLog


@admin.register(UsageLog)
class UsageLogAdmin(admin.ModelAdmin):
    list_display = ["asset", "lease", "timestamp", "hours_used", "engine_temp_celsius"]
    list_filter = ["asset"]


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ["invoice_number", "lease", "total_amount", "status", "due_date"]
    list_filter = ["status"]
    search_fields = ["invoice_number"]
