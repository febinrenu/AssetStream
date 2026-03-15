from django.contrib.auth.models import AbstractUser
from django.db import models


class CustomUser(AbstractUser):
    ROLE_CHOICES = [
        ("lessee", "Lessee"),
        ("admin", "Admin"),
        ("analyst", "Analyst"),
    ]

    company_name = models.CharField(max_length=255, blank=True, default="")
    phone_number = models.CharField(max_length=30, blank=True, default="")
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="lessee")
    avatar_color = models.CharField(max_length=7, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.email} ({self.role})"


class AuditLog(models.Model):
    """
    Immutable record of every significant action taken in the system.
    Feature 5: Extended with metadata (field-level diffs) and user_agent.
    Records are append-only — never updated or deleted (enforced in save()).
    """

    user = models.ForeignKey(
        "accounts.CustomUser",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    action = models.CharField(max_length=100)          # e.g. "lease.renew"
    resource_type = models.CharField(max_length=50)    # "lease" | "invoice" | "asset"
    resource_id = models.IntegerField(null=True, blank=True)
    description = models.TextField()
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=300, blank=True)
    # Field-level diff: [{"field": "status", "old": "active", "new": "completed"}, ...]
    metadata = models.JSONField(default=dict, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-timestamp"]

    def save(self, *args, **kwargs):
        # Immutability: only allow INSERT, not UPDATE
        if self.pk:
            raise ValueError("AuditLog entries are immutable and cannot be updated.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValueError("AuditLog entries cannot be deleted.")

    def __str__(self):
        return f"{self.action} by {self.user} @ {self.timestamp}"


class FieldChangeLog(models.Model):
    """
    Granular field-level change record attached to an AuditLog entry.
    Useful for SOC2/ISO compliance diff views.
    """
    audit_log = models.ForeignKey(
        AuditLog,
        on_delete=models.CASCADE,
        related_name="field_changes",
    )
    field_name = models.CharField(max_length=100)
    old_value = models.TextField(blank=True)
    new_value = models.TextField(blank=True)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return f"{self.field_name}: {self.old_value!r} → {self.new_value!r}"
