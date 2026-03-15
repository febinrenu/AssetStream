from django.urls import path

from .views import (
    AssetHealthScoreView,
    AuditLogListView,
    AssetCSVExportView,
    AssetDetailView,
    AssetHealthView,
    AssetListCreateView,
    AssetMaintenanceLogsView,
    AssetMaintenanceResolveView,
    AssetPartialUpdateView,
    AssetUsageLogsView,
    CashFlowForecastView,
    ContractAnalysisView,
    DashboardSummaryView,
    HealthCheckView,
    InvoiceAgingReportView,
    InvoiceCSVExportView,
    LeaseCSVExportView,
    LeaseDetailView,
    LeaseDocumentUploadView,
    LeaseListCreateView,
    LeaseRenewView,
    LeaseStatusUpdateView,
    LeaseTerminateView,
    NotificationsView,
    PortfolioRiskView,
    UtilizationHeatmapView,
)

urlpatterns = [
    # System
    path("health/", HealthCheckView.as_view(), name="health-check"),

    # Dashboard & Notifications
    path("dashboard/summary/", DashboardSummaryView.as_view(), name="dashboard-summary"),
    path("notifications/", NotificationsView.as_view(), name="notifications"),

    # Assets
    path("assets/", AssetListCreateView.as_view(), name="asset-list"),
    path("assets/utilization-heatmap/", UtilizationHeatmapView.as_view(), name="utilization-heatmap"),
    path("assets/<int:pk>/", AssetDetailView.as_view(), name="asset-detail"),
    path("assets/<int:pk>/patch/", AssetPartialUpdateView.as_view(), name="asset-patch"),
    path("assets/<int:pk>/usage-logs/", AssetUsageLogsView.as_view(), name="asset-usage-logs"),
    path("assets/<int:pk>/health/", AssetHealthView.as_view(), name="asset-health"),
    path("assets/<int:pk>/health-score/", AssetHealthScoreView.as_view(), name="asset-health-score"),
    path("assets/<int:pk>/maintenance/", AssetMaintenanceLogsView.as_view(), name="asset-maintenance"),
    path("assets/<int:asset_pk>/maintenance/<int:log_pk>/resolve/", AssetMaintenanceResolveView.as_view(), name="asset-maintenance-resolve"),

    # Leases
    path("leases/", LeaseListCreateView.as_view(), name="lease-list"),
    path("leases/<int:pk>/", LeaseDetailView.as_view(), name="lease-detail"),
    path("leases/<int:pk>/status/", LeaseStatusUpdateView.as_view(), name="lease-status"),
    path("leases/<int:pk>/terminate/", LeaseTerminateView.as_view(), name="lease-terminate"),
    path("leases/<int:pk>/renew/", LeaseRenewView.as_view(), name="lease-renew"),
    path("leases/<int:pk>/document/", LeaseDocumentUploadView.as_view(), name="lease-document"),

    # Audit
    path("audit-logs/", AuditLogListView.as_view(), name="audit-logs"),

    # CSV Exports
    path("export/assets/", AssetCSVExportView.as_view(), name="export-assets"),
    path("export/leases/", LeaseCSVExportView.as_view(), name="export-leases"),
    path("export/invoices/", InvoiceCSVExportView.as_view(), name="export-invoices"),

    # Invoices
    path("invoices/aging-report/", InvoiceAgingReportView.as_view(), name="invoice-aging-report"),

    # Portfolio
    path("portfolio/cash-flow-forecast/", CashFlowForecastView.as_view(), name="cash-flow-forecast"),
    path("portfolio/risk/", PortfolioRiskView.as_view(), name="portfolio-risk"),

    # Feature 6: Contract Intelligence
    path("leases/<int:pk>/analysis/", ContractAnalysisView.as_view(), name="contract-analysis"),
]
