from django.contrib import admin

from .models import CommunicationLog, InAppNotification, WebhookDelivery, WebhookSubscription


@admin.register(InAppNotification)
class InAppNotificationAdmin(admin.ModelAdmin):
    list_display = ["user", "notification_type", "title", "severity", "is_read", "created_at"]
    list_filter = ["notification_type", "severity"]
    search_fields = ["user__username", "title"]
    ordering = ["-created_at"]


@admin.register(CommunicationLog)
class CommunicationLogAdmin(admin.ModelAdmin):
    list_display = ["user", "channel", "subject", "status", "sent_at"]
    list_filter = ["channel", "status"]
    ordering = ["-sent_at"]


@admin.register(WebhookSubscription)
class WebhookSubscriptionAdmin(admin.ModelAdmin):
    list_display = ["name", "url", "active", "failure_count", "last_triggered_at"]
    list_filter = ["active"]


@admin.register(WebhookDelivery)
class WebhookDeliveryAdmin(admin.ModelAdmin):
    list_display = ["event_type", "subscription", "status", "response_code", "delivered_at"]
    list_filter = ["status", "event_type"]
