from django.contrib import admin

from .models import ApprovalRequest


@admin.register(ApprovalRequest)
class ApprovalRequestAdmin(admin.ModelAdmin):
    list_display = [
        "request_number", "request_type", "status", "priority",
        "requested_by", "reviewed_by", "created_at",
    ]
    list_filter = ["status", "request_type", "priority"]
    search_fields = ["request_number", "requested_by__username"]
    ordering = ["-created_at"]
    readonly_fields = ["request_number", "created_at", "reviewed_at"]
