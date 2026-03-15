from django.urls import path

from .views import (
    CommLogListView,
    NotificationListView,
    NotificationMarkReadView,
    NotificationUnreadCountView,
    WebhookDeliveryListView,
    WebhookSubscriptionDetailView,
    WebhookSubscriptionListCreateView,
    WebhookTestView,
)

urlpatterns = [
    # In-app notifications
    path("notifications/inbox/", NotificationListView.as_view(), name="notif-list"),
    path("notifications/inbox/unread-count/", NotificationUnreadCountView.as_view(), name="notif-unread"),
    path("notifications/inbox/mark-all-read/", NotificationMarkReadView.as_view(), name="notif-mark-all"),
    path("notifications/inbox/<int:pk>/read/", NotificationMarkReadView.as_view(), name="notif-mark-one"),

    # Communication logs
    path("comm-logs/", CommLogListView.as_view(), name="comm-logs"),

    # Webhooks
    path("webhooks/", WebhookSubscriptionListCreateView.as_view(), name="webhook-list"),
    path("webhooks/<int:pk>/", WebhookSubscriptionDetailView.as_view(), name="webhook-detail"),
    path("webhooks/<int:pk>/test/", WebhookTestView.as_view(), name="webhook-test"),
    path("webhooks/deliveries/", WebhookDeliveryListView.as_view(), name="webhook-deliveries"),
]
