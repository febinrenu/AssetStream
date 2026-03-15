import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


class ApprovalRequest(models.Model):
    TYPE_CHOICES = [
        ("lease_renew", "Lease Renewal"),
        ("lease_terminate", "Lease Termination"),
        ("lease_discount", "Lease Discount"),
        ("write_off", "Invoice Write-Off"),
        ("asset_disposal", "Asset Disposal"),
        ("lease_create", "Lease Creation"),
    ]
    STATUS_CHOICES = [
        ("pending", "Pending Review"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
        ("cancelled", "Cancelled"),
        ("expired", "Expired"),
    ]
    PRIORITY_CHOICES = [
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
        ("urgent", "Urgent"),
    ]

    request_number = models.CharField(max_length=20, unique=True, blank=True)
    request_type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default="medium")

    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="approval_requests_made",
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="approval_requests_reviewed",
    )

    # Resource being modified
    resource_type = models.CharField(max_length=50, blank=True)   # 'lease', 'invoice', 'asset'
    resource_id = models.IntegerField(null=True, blank=True)

    # Proposed change details
    payload = models.JSONField(default=dict)

    requester_notes = models.TextField(blank=True)
    reviewer_notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        if not self.request_number:
            self.request_number = f"WF-{uuid.uuid4().hex[:8].upper()}"
        if not self.expires_at:
            self.expires_at = timezone.now() + timezone.timedelta(days=7)
        super().save(*args, **kwargs)

    @property
    def is_pending(self):
        return self.status == "pending"

    def __str__(self):
        return f"{self.request_number} ({self.get_request_type_display()}) — {self.status}"
