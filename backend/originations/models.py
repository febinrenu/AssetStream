import uuid

from django.conf import settings
from django.db import models


class Asset(models.Model):
    CATEGORY_CHOICES = [
        ("heavy_equipment", "Heavy Equipment"),
        ("medical", "Medical"),
        ("fleet", "Fleet"),
        ("industrial", "Industrial"),
    ]

    STATUS_CHOICES = [
        ("available", "Available"),
        ("leased", "Leased"),
        ("maintenance", "Maintenance"),
        ("remarketed", "Remarketed"),
    ]

    name = models.CharField(max_length=255)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    serial_number = models.CharField(max_length=100, unique=True)
    manufacture_year = models.IntegerField()
    base_monthly_rate = models.DecimalField(max_digits=12, decimal_places=2)
    per_hour_rate = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="available")
    image_url = models.URLField(blank=True, null=True)
    total_hours_logged = models.FloatField(default=0.0)

    class Meta:
        ordering = ["-id"]

    def __str__(self):
        return f"{self.name} ({self.serial_number})"


class LeaseContract(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("active", "Active"),
        ("completed", "Completed"),
        ("defaulted", "Defaulted"),
    ]

    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name="leases")
    lessee = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="leases"
    )
    contract_number = models.CharField(max_length=50, unique=True, blank=True)
    start_date = models.DateField()
    end_date = models.DateField()
    monthly_base_fee = models.DecimalField(max_digits=12, decimal_places=2)
    per_hour_rate = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    document = models.FileField(upload_to="lease_docs/", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        if not self.contract_number:
            self.contract_number = f"LC-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.contract_number} - {self.asset.name}"


# ── Feature 6: Contract Intelligence ─────────────────────────

class ContractAnalysis(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending Analysis"),
        ("processing", "Processing"),
        ("completed", "Completed"),
        ("failed", "Failed"),
    ]

    lease = models.OneToOneField(
        LeaseContract,
        on_delete=models.CASCADE,
        related_name="contract_analysis",
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    extracted_data = models.JSONField(default=dict)
    # e.g. {"contract_number": "LC-...", "start_date": "2024-01-01", "monthly_fee": 5000, ...}
    validation_issues = models.JSONField(default=list)
    # e.g. [{"field": "end_date", "stored": "2024-12-31", "extracted": "2025-01-31", "severity": "warning"}]
    confidence_score = models.FloatField(null=True, blank=True)   # 0.0 – 1.0
    pages_analyzed = models.IntegerField(default=0)
    analyzed_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)

    class Meta:
        ordering = ["-analyzed_at"]

    def __str__(self):
        return f"Analysis for {self.lease.contract_number}: {self.status}"
