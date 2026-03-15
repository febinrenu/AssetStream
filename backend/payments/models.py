import uuid

from django.conf import settings
from django.db import models


class PaymentRecord(models.Model):
    METHOD_CHOICES = [
        ("card", "Credit / Debit Card"),
        ("bank_transfer", "Bank Transfer"),
        ("ach", "ACH"),
        ("wire", "Wire Transfer"),
        ("check", "Check"),
    ]
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("processing", "Processing"),
        ("completed", "Completed"),
        ("failed", "Failed"),
        ("refunded", "Refunded"),
    ]

    payment_ref = models.CharField(max_length=30, unique=True, blank=True)
    invoice = models.ForeignKey(
        "servicing.Invoice",
        on_delete=models.CASCADE,
        related_name="payment_records",
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=METHOD_CHOICES, default="bank_transfer")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")

    # Plug Stripe payment_intent_id or similar here
    external_ref = models.CharField(max_length=100, blank=True)
    provider_response = models.JSONField(default=dict, blank=True)

    initiated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="payments_initiated",
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        if not self.payment_ref:
            self.payment_ref = f"PAY-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.payment_ref} — {self.status}"


class DunningRule(models.Model):
    """Automated follow-up schedule for overdue invoices."""
    name = models.CharField(max_length=100)
    days_overdue = models.IntegerField()            # trigger after N days past due_date
    action = models.CharField(max_length=20, choices=[
        ("email", "Send Email"),
        ("sms", "Send SMS"),
        ("suspend", "Suspend Lease"),
        ("flag", "Flag for Collections"),
    ])
    message_template = models.TextField(blank=True)
    active = models.BooleanField(default=True)
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ["days_overdue", "order"]

    def __str__(self):
        return f"{self.name} (+{self.days_overdue}d)"


class ReconciliationReport(models.Model):
    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("reconciled", "Reconciled"),
        ("discrepancy", "Has Discrepancies"),
    ]

    period_start = models.DateField()
    period_end = models.DateField()
    total_invoiced = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_received = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_outstanding = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_overdue = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    invoice_count = models.IntegerField(default=0)
    paid_count = models.IntegerField(default=0)
    overdue_count = models.IntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    generated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="reconciliation_reports",
    )
    generated_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-generated_at"]

    def __str__(self):
        return f"Recon {self.period_start}–{self.period_end} ({self.status})"
