import json

from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import CommunicationLog, InAppNotification, WebhookDelivery, WebhookSubscription
from .serializers import (
    CommunicationLogSerializer,
    InAppNotificationSerializer,
    WebhookDeliverySerializer,
    WebhookSubscriptionSerializer,
)


class IsAdminRole(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "admin"


# ── In-App Notifications ─────────────────────────────────────

class NotificationListView(generics.ListAPIView):
    """Returns the current user's in-app notifications."""
    serializer_class = InAppNotificationSerializer

    def get_queryset(self):
        qs = InAppNotification.objects.filter(user=self.request.user)
        unread_only = self.request.query_params.get("unread")
        if unread_only == "true":
            qs = qs.filter(read_at__isnull=True)
        return qs[:60]


class NotificationMarkReadView(APIView):
    """Mark one or all notifications as read."""

    def post(self, request, pk=None):
        now = timezone.now()
        if pk:
            try:
                n = InAppNotification.objects.get(pk=pk, user=request.user)
            except InAppNotification.DoesNotExist:
                return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
            if not n.read_at:
                n.read_at = now
                n.save(update_fields=["read_at"])
            return Response(InAppNotificationSerializer(n).data)

        # Mark all unread for this user
        InAppNotification.objects.filter(user=request.user, read_at__isnull=True).update(read_at=now)
        return Response({"marked": "all"})


class NotificationUnreadCountView(APIView):
    """Fast unread count badge endpoint."""

    def get(self, request):
        count = InAppNotification.objects.filter(user=request.user, read_at__isnull=True).count()
        return Response({"unread_count": count})


# ── Communication Logs ───────────────────────────────────────

class CommLogListView(generics.ListAPIView):
    serializer_class = CommunicationLogSerializer
    permission_classes = [IsAdminRole]

    def get_queryset(self):
        qs = CommunicationLog.objects.all()
        channel = self.request.query_params.get("channel")
        if channel:
            qs = qs.filter(channel=channel)
        return qs[:200]


# ── Webhooks ─────────────────────────────────────────────────

class WebhookSubscriptionListCreateView(generics.ListCreateAPIView):
    serializer_class = WebhookSubscriptionSerializer
    permission_classes = [IsAdminRole]

    def get_queryset(self):
        return WebhookSubscription.objects.filter(created_by=self.request.user)

    def perform_create(self, serializer):
        import uuid
        instance = serializer.save(created_by=self.request.user, secret=uuid.uuid4().hex)


class WebhookSubscriptionDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = WebhookSubscriptionSerializer
    permission_classes = [IsAdminRole]

    def get_queryset(self):
        return WebhookSubscription.objects.filter(created_by=self.request.user)


class WebhookTestView(APIView):
    """Send a test ping to the webhook URL."""
    permission_classes = [IsAdminRole]

    def post(self, request, pk):
        try:
            sub = WebhookSubscription.objects.get(pk=pk, created_by=request.user)
        except WebhookSubscription.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        from .tasks import deliver_webhook_event
        deliver_webhook_event.delay(sub.id, "test.ping", {"message": "AssetStream webhook test"})
        return Response({"detail": "Test ping queued."})


class WebhookDeliveryListView(generics.ListAPIView):
    serializer_class = WebhookDeliverySerializer
    permission_classes = [IsAdminRole]

    def get_queryset(self):
        return WebhookDelivery.objects.filter(
            subscription__created_by=self.request.user
        ).select_related("subscription")[:100]


# ── Utility ──────────────────────────────────────────────────

def notify_user(user, title: str, body: str, notification_type: str = "system",
                severity: str = "info", resource_type: str = "", resource_id=None):
    """Helper to create a persistent in-app notification."""
    InAppNotification.objects.create(
        user=user,
        title=title,
        body=body,
        notification_type=notification_type,
        severity=severity,
        resource_type=resource_type,
        resource_id=resource_id,
    )


def fire_webhook_event(event_type: str, payload: dict):
    """Fan-out a webhook event to all active subscriptions that listen to it."""
    from .tasks import deliver_webhook_event
    subs = WebhookSubscription.objects.filter(active=True)
    for sub in subs:
        if event_type in sub.events or "*" in sub.events:
            deliver_webhook_event.delay(sub.id, event_type, payload)
