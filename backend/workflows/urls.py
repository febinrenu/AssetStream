from django.urls import path

from .views import (
    ApprovalApproveView,
    ApprovalCancelView,
    ApprovalRejectView,
    ApprovalRequestCreateView,
    ApprovalRequestDetailView,
    ApprovalRequestListView,
    ApprovalStatsView,
)

urlpatterns = [
    path("approvals/", ApprovalRequestListView.as_view(), name="approval-list"),
    path("approvals/create/", ApprovalRequestCreateView.as_view(), name="approval-create"),
    path("approvals/stats/", ApprovalStatsView.as_view(), name="approval-stats"),
    path("approvals/<int:pk>/", ApprovalRequestDetailView.as_view(), name="approval-detail"),
    path("approvals/<int:pk>/approve/", ApprovalApproveView.as_view(), name="approval-approve"),
    path("approvals/<int:pk>/reject/", ApprovalRejectView.as_view(), name="approval-reject"),
    path("approvals/<int:pk>/cancel/", ApprovalCancelView.as_view(), name="approval-cancel"),
]
