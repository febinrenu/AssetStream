from django.urls import path

from .views import (
    DunningRuleDetailView,
    DunningRuleListCreateView,
    PaymentInitiateView,
    PaymentListView,
    ReconciliationGenerateView,
    ReconciliationListView,
)

urlpatterns = [
    path("payments/", PaymentListView.as_view(), name="payment-list"),
    path("payments/initiate/", PaymentInitiateView.as_view(), name="payment-initiate"),
    path("payments/dunning/", DunningRuleListCreateView.as_view(), name="dunning-list"),
    path("payments/dunning/<int:pk>/", DunningRuleDetailView.as_view(), name="dunning-detail"),
    path("payments/reconciliation/", ReconciliationListView.as_view(), name="recon-list"),
    path("payments/reconciliation/generate/", ReconciliationGenerateView.as_view(), name="recon-generate"),
]
