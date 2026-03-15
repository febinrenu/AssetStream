from django.urls import path

from .views import (
    InvoiceDetailView,
    InvoiceListView,
    InvoiceMarkPaidView,
    PricingRuleDetailView,
    PricingRuleListCreateView,
    PricingSimulateView,
    ServiceTicketAssignView,
    ServiceTicketDetailView,
    ServiceTicketListCreateView,
    ServiceTicketResolveView,
    ServiceTicketStatsView,
    TriggerBillingView,
    TriggerIoTView,
)

urlpatterns = [
    # Invoices
    path("invoices/", InvoiceListView.as_view(), name="invoice-list"),
    path("invoices/<int:pk>/", InvoiceDetailView.as_view(), name="invoice-detail"),
    path("invoices/<int:pk>/mark-paid/", InvoiceMarkPaidView.as_view(), name="invoice-mark-paid"),

    # Servicing triggers
    path("servicing/trigger-billing/", TriggerBillingView.as_view(), name="trigger-billing"),
    path("servicing/trigger-iot/", TriggerIoTView.as_view(), name="trigger-iot"),

    # Service Tickets (Feature 4: SLA & Ticketing)
    path("tickets/", ServiceTicketListCreateView.as_view(), name="ticket-list"),
    path("tickets/stats/", ServiceTicketStatsView.as_view(), name="ticket-stats"),
    path("tickets/<int:pk>/", ServiceTicketDetailView.as_view(), name="ticket-detail"),
    path("tickets/<int:pk>/resolve/", ServiceTicketResolveView.as_view(), name="ticket-resolve"),
    path("tickets/<int:pk>/assign/", ServiceTicketAssignView.as_view(), name="ticket-assign"),

    # Pricing Rules (Feature 8: Configurable Pricing)
    path("pricing/", PricingRuleListCreateView.as_view(), name="pricing-list"),
    path("pricing/simulate/", PricingSimulateView.as_view(), name="pricing-simulate"),
    path("pricing/<int:pk>/", PricingRuleDetailView.as_view(), name="pricing-detail"),
]
