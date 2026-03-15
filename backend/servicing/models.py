import uuid
from datetime import timedelta

from django.conf import settings
from django.db import models

from originations.models import Asset, LeaseContract


class UsageLog(models.Model):
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name="usage_logs")
    lease = models.ForeignKey(LeaseContract, on_delete=models.CASCADE, related_name="usage_logs")
    timestamp = models.DateTimeField(auto_now_add=True)
    hours_used = models.FloatField()
    latitude = models.FloatField()
    longitude = models.FloatField()
    engine_temp_celsius = models.FloatField()
    fuel_level_percent = models.FloatField()

    class Meta:
        ordering = ["-timestamp"]

    def __str__(self):
        return f"UsageLog {self.asset.name} @ {self.timestamp}"


class Invoice(models.Model):
    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("issued", "Issued"),
        ("paid", "Paid"),
        ("overdue", "Overdue"),
    ]

    lease = models.ForeignKey(LeaseContract, on_delete=models.CASCADE, related_name="invoices")
    invoice_number = models.CharField(max_length=50, unique=True, blank=True)
    billing_period_start = models.DateField()
    billing_period_end = models.DateField()
    base_fee = models.DecimalField(max_digits=12, decimal_places=2)
    usage_fee = models.DecimalField(max_digits=12, decimal_places=2)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    issued_at = models.DateTimeField(auto_now_add=True)
    due_date = models.DateField()

    class Meta:
        ordering = ["-issued_at"]

    def save(self, *args, **kwargs):
        if not self.invoice_number:
            self.invoice_number = f"INV-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.invoice_number} - ${self.total_amount}"


class MaintenanceLog(models.Model):
    """Records of scheduled or unscheduled maintenance events per asset."""

    PRIORITY_CHOICES = [
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
        ("critical", "Critical"),
    ]

    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name="maintenance_logs")
    logged_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="maintenance_logs"
    )
    notes = models.TextField()
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default="medium")
    start_date = models.DateField()
    resolved_date = models.DateField(null=True, blank=True)
    resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Maintenance: {self.asset.name} ({self.start_date})"


# ── Feature 4: SLA Ticketing ─────────────────────────────────

class ServiceTicket(models.Model):
    CATEGORY_CHOICES = [
        ("maintenance", "Maintenance"),
        ("incident", "Incident"),
        ("breakdown", "Breakdown"),
        ("inspection", "Inspection"),
        ("software", "Software/Firmware"),
        ("other", "Other"),
    ]
    STATUS_CHOICES = [
        ("open", "Open"),
        ("in_progress", "In Progress"),
        ("pending_parts", "Pending Parts"),
        ("resolved", "Resolved"),
        ("escalated", "Escalated"),
        ("closed", "Closed"),
    ]
    PRIORITY_CHOICES = [
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
        ("critical", "Critical"),
    ]
    SLA_HOURS = {"critical": 4, "high": 8, "medium": 24, "low": 72}

    ticket_number = models.CharField(max_length=20, unique=True, blank=True)
    title = models.CharField(max_length=255)
    description = models.TextField()
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default="maintenance")
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default="medium")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="open")

    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name="tickets")
    reported_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL, null=True,
        related_name="tickets_reported",
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL, null=True, blank=True,
        related_name="tickets_assigned",
    )

    sla_due_at = models.DateTimeField(null=True, blank=True)
    sla_breached = models.BooleanField(default=False)

    resolution_notes = models.TextField(blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        if not self.ticket_number:
            self.ticket_number = f"TKT-{uuid.uuid4().hex[:6].upper()}"
        if not self.sla_due_at:
            from django.utils import timezone
            hours = self.SLA_HOURS.get(self.priority, 24)
            self.sla_due_at = timezone.now() + timedelta(hours=hours)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.ticket_number}: {self.title}"


# ── Feature 8: Configurable Pricing ──────────────────────────

class PricingRule(models.Model):
    TYPE_CHOICES = [
        ("seasonal", "Seasonal Multiplier"),
        ("utilization_tier", "Utilization Tier Rate"),
        ("penalty", "Late Payment Penalty"),
        ("grace_period", "Grace Period"),
        ("volume_discount", "Volume / Tenure Discount"),
    ]
    CATEGORY_CHOICES = [
        ("", "All Categories"),
        ("heavy_equipment", "Heavy Equipment"),
        ("medical", "Medical"),
        ("fleet", "Fleet"),
        ("industrial", "Industrial"),
    ]

    name = models.CharField(max_length=100)
    rule_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    asset_category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, blank=True)
    active = models.BooleanField(default=True)
    params = models.JSONField(default=dict)
    # Examples:
    #   seasonal:          {"months": [12, 1, 2], "multiplier": 1.15}
    #   utilization_tier:  {"tiers": [{"min": 0, "max": 100, "rate_per_hour": 45}, ...]}
    #   penalty:           {"days_overdue_threshold": 30, "penalty_percent": 5.0}
    #   grace_period:      {"days": 5}
    #   volume_discount:   {"min_lease_months": 12, "discount_percent": 10.0}
    description = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL, null=True, blank=True,
        related_name="pricing_rules_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.get_rule_type_display()})"
