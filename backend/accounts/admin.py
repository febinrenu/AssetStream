from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import AuditLog, CustomUser, FieldChangeLog


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    list_display = ["username", "email", "company_name", "role", "created_at"]
    list_filter = ["role", "is_active"]
    fieldsets = UserAdmin.fieldsets + (
        ("AssetStream", {"fields": ("company_name", "role")}),
    )


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    """Read-only admin for immutable audit log."""
    list_display = ["action", "resource_type", "resource_id", "user", "ip_address", "timestamp"]
    list_filter = ["action", "resource_type"]
    search_fields = ["action", "description", "user__username"]
    ordering = ["-timestamp"]
    readonly_fields = [f.name for f in AuditLog._meta.get_fields()]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(FieldChangeLog)
class FieldChangeLogAdmin(admin.ModelAdmin):
    list_display = ["audit_log", "field_name", "old_value", "new_value"]
    readonly_fields = ["audit_log", "field_name", "old_value", "new_value"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
