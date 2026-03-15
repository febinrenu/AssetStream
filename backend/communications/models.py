import hashlib
import hmac
import uuid

from django.conf import settings
from django.db import models


class InAppNotification(models.Model):
    TYPE_CHOICES = [
        ("invoice_overdue", "Invoice Overdue"),
        ("lease_expiring", "Lease Expiring"),
        ("approval_pending", "Approval Pending"),
        ("approval_resolved", "Approval Resolved"),
        ("maintenance_alert", "Maintenance Alert"),
        ("payment_received", "Payment Received"),
        ("ticket_update", "Ticket Update"),
        ("system", "System"),
    ]
    SEVERITY_CHOICES = [
        ("info", "Info"),
        ("success", "Success"),
        ("warning", "Warning"),
        ("error", "Error"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="in_app_notifications",
    )
    title = models.CharField(max_length=200)
    body = models.TextField()
    notification_type = models.CharField(max_length=30, choices=TYPE_CHOICES, default="system")
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES, default="info")
    resource_type = models.CharField(max_length=50, blank=True)
    resource_id = models.IntegerField(null=True, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    @property
    def is_read(self):
        return self.read_at is not None

    def __str__(self):
        return f"{self.notification_type}: {self.title} → {self.user.username}"


class CommunicationLog(models.Model):
    CHANNEL_CHOICES = [
        ("email", "Email"),
        ("sms", "SMS"),
        ("whatsapp", "WhatsApp"),
        ("in_app", "In-App"),
    ]
    STATUS_CHOICES = [
        ("sent", "Sent"),
        ("failed", "Failed"),
        ("pending", "Pending"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="comm_logs",
    )
    channel = models.CharField(max_length=10, choices=CHANNEL_CHOICES)
    subject = models.CharField(max_length=255, blank=True)
    body = models.TextField(blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="pending")
    error_message = models.TextField(blank=True)
    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-sent_at"]

    def __str__(self):
        return f"{self.channel} → {self.user_id} ({self.status})"


class WebhookSubscription(models.Model):
    name = models.CharField(max_length=100)
    url = models.URLField()
    events = models.JSONField(default=list)
    secret = models.CharField(max_length=64, blank=True)
    active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="webhook_subscriptions",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    last_triggered_at = models.DateTimeField(null=True, blank=True)
    failure_count = models.IntegerField(default=0)

    class Meta:
        ordering = ["-created_at"]

    def generate_secret(self):
        self.secret = uuid.uuid4().hex
        self.save(update_fields=["secret"])

    def sign_payload(self, payload_bytes: bytes) -> str:
        return hmac.new(self.secret.encode(), payload_bytes, hashlib.sha256).hexdigest()

    def __str__(self):
        return f"{self.name} → {self.url}"


class WebhookDelivery(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("delivered", "Delivered"),
        ("failed", "Failed"),
    ]

    subscription = models.ForeignKey(
        WebhookSubscription,
        on_delete=models.CASCADE,
        related_name="deliveries",
    )
    event_type = models.CharField(max_length=50)
    payload = models.JSONField(default=dict)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    response_code = models.IntegerField(null=True, blank=True)
    response_body = models.TextField(blank=True)
    attempt_count = models.IntegerField(default=0)
    delivered_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.event_type} → {self.subscription.url} ({self.status})"
