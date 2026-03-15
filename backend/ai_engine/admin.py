from django.contrib import admin
from .models import AnomalyAlert, ChatMessage, ChatSession, MaintenancePrediction, RemarketingRecommendation, RiskScore


@admin.register(RiskScore)
class RiskScoreAdmin(admin.ModelAdmin):
    list_display = ["lease", "probability", "risk_band", "scored_at"]
    list_filter = ["risk_band"]
    ordering = ["-probability"]


@admin.register(AnomalyAlert)
class AnomalyAlertAdmin(admin.ModelAdmin):
    list_display = ["invoice", "alert_type", "severity", "resolved", "detected_at"]
    list_filter = ["alert_type", "severity", "resolved"]
    ordering = ["-detected_at"]


@admin.register(MaintenancePrediction)
class MaintenancePredictionAdmin(admin.ModelAdmin):
    list_display = ["asset", "failure_probability", "risk_level", "predicted_at"]
    list_filter = ["risk_level"]
    ordering = ["-failure_probability"]


@admin.register(RemarketingRecommendation)
class RemarketingRecommendationAdmin(admin.ModelAdmin):
    list_display = ["asset", "recommended_action", "net_roi_12m", "computed_at"]
    list_filter = ["recommended_action"]


@admin.register(ChatSession)
class ChatSessionAdmin(admin.ModelAdmin):
    list_display = ["user", "created_at", "last_active"]


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ["session", "role", "intent", "timestamp"]
    list_filter = ["role", "intent"]
