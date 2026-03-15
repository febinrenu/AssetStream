from rest_framework import serializers

from .models import CommunicationLog, InAppNotification, WebhookDelivery, WebhookSubscription


class InAppNotificationSerializer(serializers.ModelSerializer):
    is_read = serializers.BooleanField(read_only=True)

    class Meta:
        model = InAppNotification
        fields = [
            "id", "title", "body", "notification_type", "severity",
            "resource_type", "resource_id", "is_read", "read_at", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class CommunicationLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommunicationLog
        fields = ["id", "channel", "subject", "status", "sent_at"]
        read_only_fields = fields


class WebhookSubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = WebhookSubscription
        fields = [
            "id", "name", "url", "events", "active",
            "created_at", "last_triggered_at", "failure_count",
        ]
        read_only_fields = ["id", "created_at", "last_triggered_at", "failure_count"]


class WebhookDeliverySerializer(serializers.ModelSerializer):
    class Meta:
        model = WebhookDelivery
        fields = [
            "id", "event_type", "status", "response_code",
            "attempt_count", "delivered_at", "created_at",
        ]
        read_only_fields = fields
