from django.conf import settings
from django.db import models


class RiskScore(models.Model):
    lease = models.OneToOneField(
        "originations.LeaseContract", on_delete=models.CASCADE, related_name="risk_score"
    )
    probability = models.FloatField(default=0.0)
    risk_band = models.CharField(max_length=10, default="low")
    top_drivers = models.JSONField(default=list)
    scored_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-probability"]

    def __str__(self):
        return f"RiskScore(lease={self.lease_id}, prob={self.probability:.2f}, band={self.risk_band})"


class AnomalyAlert(models.Model):
    ALERT_TYPES = [
        ("spike", "Billing Spike"),
        ("duplicate", "Potential Duplicate"),
        ("zero_usage", "Zero Usage Billed"),
        ("outlier", "Statistical Outlier"),
        ("dormant", "Dormant Asset Billed"),
    ]
    SEVERITY_CHOICES = [
        ("low", "Low"), ("medium", "Medium"), ("high", "High"), ("critical", "Critical"),
    ]
    invoice = models.ForeignKey(
        "servicing.Invoice", on_delete=models.CASCADE, related_name="anomaly_alerts"
    )
    alert_type = models.CharField(max_length=20, choices=ALERT_TYPES)
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES)
    anomaly_score = models.FloatField(default=0.0)
    z_score = models.FloatField(null=True, blank=True)
    explanation = models.TextField(blank=True)
    resolved = models.BooleanField(default=False)
    detected_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-detected_at"]

    def __str__(self):
        return f"AnomalyAlert({self.alert_type}, {self.severity}, invoice={self.invoice_id})"


class MaintenancePrediction(models.Model):
    asset = models.OneToOneField(
        "originations.Asset", on_delete=models.CASCADE, related_name="maintenance_prediction"
    )
    failure_probability = models.FloatField(default=0.0)
    days_to_predicted_failure = models.IntegerField(null=True, blank=True)
    risk_level = models.CharField(max_length=10, default="safe")
    top_signals = models.JSONField(default=list)
    recommendation = models.TextField(blank=True)
    predicted_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-failure_probability"]

    def __str__(self):
        return f"MaintenancePrediction(asset={self.asset_id}, prob={self.failure_probability:.2f})"


class RemarketingRecommendation(models.Model):
    ACTION_CHOICES = [
        ("sell_now", "Sell Now"),
        ("hold", "Hold"),
        ("refurbish", "Refurbish then Sell"),
        ("re_lease", "Re-Lease"),
    ]
    asset = models.OneToOneField(
        "originations.Asset", on_delete=models.CASCADE, related_name="remarketing_recommendation"
    )
    recommended_action = models.CharField(max_length=20, choices=ACTION_CHOICES, default="hold")
    sell_price_estimate = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    refurbish_cost_estimate = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    net_roi_12m = models.FloatField(default=0.0)
    roi_curve = models.JSONField(default=list)
    rationale = models.TextField(blank=True)
    computed_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-net_roi_12m"]

    def __str__(self):
        return f"RemarketingRecommendation(asset={self.asset_id}, action={self.recommended_action})"


class ChatSession(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="chat_sessions"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    last_active = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-last_active"]

    def __str__(self):
        return f"ChatSession(user={self.user_id}, id={self.id})"


class ChatMessage(models.Model):
    ROLE_CHOICES = [("user", "User"), ("assistant", "Assistant")]
    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name="messages")
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    content = models.TextField()
    intent = models.CharField(max_length=50, blank=True)
    chart_data = models.JSONField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["timestamp"]

    def __str__(self):
        return f"ChatMessage({self.role}, session={self.session_id})"
