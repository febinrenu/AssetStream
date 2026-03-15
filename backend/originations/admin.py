from django.contrib import admin

from .models import Asset, LeaseContract


@admin.register(Asset)
class AssetAdmin(admin.ModelAdmin):
    list_display = ["name", "category", "serial_number", "status", "base_monthly_rate"]
    list_filter = ["category", "status"]
    search_fields = ["name", "serial_number"]


@admin.register(LeaseContract)
class LeaseContractAdmin(admin.ModelAdmin):
    list_display = ["contract_number", "asset", "lessee", "status", "start_date", "end_date"]
    list_filter = ["status"]
    search_fields = ["contract_number"]
