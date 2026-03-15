from django.urls import path
from . import views

urlpatterns = [
    # Feature 1: Lease Copilot
    path("ai/copilot/structure-lease/", views.LeaseCopilotView.as_view(), name="ai-lease-copilot"),

    # Feature 2: Anomaly Detection
    path("ai/anomalies/", views.AnomalyAlertListView.as_view(), name="ai-anomalies"),
    path("ai/anomalies/scan/", views.AnomalyScanView.as_view(), name="ai-anomalies-scan"),
    path("ai/anomalies/<int:pk>/resolve/", views.AnomalyResolveView.as_view(), name="ai-anomaly-resolve"),

    # Feature 3: Risk Scores
    path("ai/risk-scores/", views.RiskScoreListView.as_view(), name="ai-risk-scores"),
    path("ai/risk-scores/refresh/", views.RiskScoreRefreshView.as_view(), name="ai-risk-scores-refresh"),
    path("ai/risk-scores/<int:lease_id>/", views.RiskScoreDetailView.as_view(), name="ai-risk-score-detail"),

    # Feature 4: Maintenance Predictions
    path("ai/maintenance-predictions/", views.MaintenancePredictionListView.as_view(), name="ai-maintenance"),
    path("ai/maintenance-predictions/refresh/", views.MaintenancePredictionRefreshView.as_view(), name="ai-maintenance-refresh"),
    path("ai/maintenance-predictions/<int:asset_id>/", views.MaintenancePredictionDetailView.as_view(), name="ai-maintenance-detail"),

    # Feature 6: Collections
    path("ai/collections/", views.CollectionsListView.as_view(), name="ai-collections"),
    path("ai/collections/<int:invoice_id>/draft/", views.CollectionsDraftView.as_view(), name="ai-collections-draft"),

    # Feature 7: Remarketing Engine
    path("ai/remarketing/", views.RemarketingRecommendationListView.as_view(), name="ai-remarketing"),
    path("ai/remarketing/refresh/", views.RemarketingRefreshView.as_view(), name="ai-remarketing-refresh"),
    path("ai/remarketing/<int:asset_id>/", views.RemarketingRecommendationDetailView.as_view(), name="ai-remarketing-detail"),

    # Feature 8: NL Chat
    path("ai/chat/", views.ChatView.as_view(), name="ai-chat"),
    path("ai/chat/history/", views.ChatHistoryView.as_view(), name="ai-chat-history"),

    # Feature 9: Scenario Simulator
    path("ai/simulate/", views.ScenarioSimulatorView.as_view(), name="ai-simulate"),

    # Feature 10: Portfolio Scan
    path("ai/portfolio-scan/", views.PortfolioScanView.as_view(), name="ai-portfolio-scan"),
]
