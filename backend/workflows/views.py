from django.db.models import Count
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ApprovalRequest
from .serializers import ApprovalCreateSerializer, ApprovalRequestSerializer, ApprovalReviewSerializer


class IsAdminRole(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "admin"


class IsAdminOrAnalyst(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ("admin", "analyst")


# ── List ─────────────────────────────────────────────────────

class ApprovalRequestListView(generics.ListAPIView):
    serializer_class = ApprovalRequestSerializer

    def get_queryset(self):
        user = self.request.user
        qs = ApprovalRequest.objects.select_related("requested_by", "reviewed_by")

        if user.role in ("admin", "analyst"):
            s = self.request.query_params.get("status")
            t = self.request.query_params.get("request_type")
            if s:
                qs = qs.filter(status=s)
            if t:
                qs = qs.filter(request_type=t)
            return qs
        return qs.filter(requested_by=user)


# ── Create ───────────────────────────────────────────────────

class ApprovalRequestCreateView(generics.CreateAPIView):
    serializer_class = ApprovalCreateSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save(requested_by=request.user)

        # Notify admins
        _notify_admins_of_new_request(obj)

        return Response(
            ApprovalRequestSerializer(obj).data,
            status=status.HTTP_201_CREATED,
        )


# ── Detail ───────────────────────────────────────────────────

class ApprovalRequestDetailView(generics.RetrieveAPIView):
    serializer_class = ApprovalRequestSerializer

    def get_queryset(self):
        user = self.request.user
        qs = ApprovalRequest.objects.select_related("requested_by", "reviewed_by")
        if user.role in ("admin", "analyst"):
            return qs
        return qs.filter(requested_by=user)


# ── Approve ──────────────────────────────────────────────────

class ApprovalApproveView(APIView):
    permission_classes = [IsAdminRole]

    def post(self, request, pk):
        try:
            approval = ApprovalRequest.objects.select_related("requested_by").get(pk=pk)
        except ApprovalRequest.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if not approval.is_pending:
            return Response(
                {"detail": f"Cannot approve a '{approval.status}' request."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        review_ser = ApprovalReviewSerializer(data=request.data)
        review_ser.is_valid(raise_exception=True)

        result = _execute_approval(approval, request)
        if not result["success"]:
            return Response({"detail": result["error"]}, status=status.HTTP_400_BAD_REQUEST)

        approval.status = "approved"
        approval.reviewed_by = request.user
        approval.reviewed_at = timezone.now()
        approval.reviewer_notes = review_ser.validated_data.get("reviewer_notes", "")
        approval.save()

        _audit(request, approval, "approved")
        _notify_requester(approval)

        return Response(ApprovalRequestSerializer(approval).data)


# ── Reject ───────────────────────────────────────────────────

class ApprovalRejectView(APIView):
    permission_classes = [IsAdminRole]

    def post(self, request, pk):
        try:
            approval = ApprovalRequest.objects.select_related("requested_by").get(pk=pk)
        except ApprovalRequest.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if not approval.is_pending:
            return Response(
                {"detail": f"Cannot reject a '{approval.status}' request."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        review_ser = ApprovalReviewSerializer(data=request.data)
        review_ser.is_valid(raise_exception=True)

        approval.status = "rejected"
        approval.reviewed_by = request.user
        approval.reviewed_at = timezone.now()
        approval.reviewer_notes = review_ser.validated_data.get("reviewer_notes", "")
        approval.save()

        _audit(request, approval, "rejected")
        _notify_requester(approval)

        return Response(ApprovalRequestSerializer(approval).data)


# ── Cancel ───────────────────────────────────────────────────

class ApprovalCancelView(APIView):
    def post(self, request, pk):
        try:
            approval = ApprovalRequest.objects.get(pk=pk)
        except ApprovalRequest.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if approval.requested_by != request.user and request.user.role != "admin":
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

        if not approval.is_pending:
            return Response(
                {"detail": f"Cannot cancel a '{approval.status}' request."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        approval.status = "cancelled"
        approval.save(update_fields=["status"])
        return Response(ApprovalRequestSerializer(approval).data)


# ── Stats ─────────────────────────────────────────────────────

class ApprovalStatsView(APIView):
    permission_classes = [IsAdminOrAnalyst]

    def get(self, request):
        by_status = {
            s["status"]: s["count"]
            for s in ApprovalRequest.objects.values("status").annotate(count=Count("id"))
        }
        pending_by_type = {
            s["request_type"]: s["count"]
            for s in (
                ApprovalRequest.objects
                .filter(status="pending")
                .values("request_type")
                .annotate(count=Count("id"))
            )
        }
        return Response({
            "by_status": by_status,
            "pending_by_type": pending_by_type,
            "total_pending": by_status.get("pending", 0),
        })


# ── Action Executors ─────────────────────────────────────────

def _execute_approval(approval: ApprovalRequest, request) -> dict:
    try:
        dispatch = {
            "lease_renew": _do_lease_renew,
            "lease_terminate": _do_lease_terminate,
            "lease_discount": _do_lease_discount,
            "write_off": _do_write_off,
            "asset_disposal": _do_asset_disposal,
            "lease_create": _do_lease_create,
        }
        handler = dispatch.get(approval.request_type)
        if handler:
            return handler(approval)
        return {"success": True}
    except Exception as exc:
        return {"success": False, "error": str(exc)}


def _do_lease_renew(approval):
    from dateutil.relativedelta import relativedelta
    from django.utils import timezone as tz
    from originations.models import LeaseContract

    try:
        lease = LeaseContract.objects.select_related("asset").get(pk=approval.resource_id)
    except LeaseContract.DoesNotExist:
        return {"success": False, "error": "Lease not found."}

    months = approval.payload.get("duration_months", 12)
    base = lease.end_date if lease.end_date >= tz.now().date() else tz.now().date()
    new_end = base + relativedelta(months=months)

    lease.end_date = new_end
    if lease.status == "completed":
        lease.status = "active"
        lease.asset.status = "leased"
        lease.asset.save(update_fields=["status"])
    lease.save(update_fields=["end_date", "status"])
    return {"success": True}


def _do_lease_terminate(approval):
    from originations.models import LeaseContract

    try:
        lease = LeaseContract.objects.select_related("asset").get(pk=approval.resource_id)
    except LeaseContract.DoesNotExist:
        return {"success": False, "error": "Lease not found."}

    if lease.status not in ("active", "pending"):
        return {"success": False, "error": f"Cannot terminate lease with status '{lease.status}'."}

    lease.status = "completed"
    lease.save(update_fields=["status"])
    lease.asset.status = "available"
    lease.asset.save(update_fields=["status"])
    return {"success": True}


def _do_lease_discount(approval):
    from decimal import Decimal
    from originations.models import LeaseContract

    try:
        lease = LeaseContract.objects.get(pk=approval.resource_id)
    except LeaseContract.DoesNotExist:
        return {"success": False, "error": "Lease not found."}

    discount_pct = Decimal(str(approval.payload.get("discount_percent", 0)))
    if not (0 < discount_pct <= 100):
        return {"success": False, "error": "Invalid discount percentage."}

    lease.monthly_base_fee = lease.monthly_base_fee * (1 - discount_pct / 100)
    lease.save(update_fields=["monthly_base_fee"])
    return {"success": True}


def _do_write_off(approval):
    from servicing.models import Invoice

    try:
        invoice = Invoice.objects.get(pk=approval.resource_id)
    except Invoice.DoesNotExist:
        return {"success": False, "error": "Invoice not found."}

    invoice.status = "paid"
    invoice.save(update_fields=["status"])
    return {"success": True}


def _do_asset_disposal(approval):
    from originations.models import Asset

    try:
        asset = Asset.objects.get(pk=approval.resource_id)
    except Asset.DoesNotExist:
        return {"success": False, "error": "Asset not found."}

    asset.status = "remarketed"
    asset.save(update_fields=["status"])
    return {"success": True}


def _do_lease_create(approval):
    from originations.services import create_lease_contract

    p = approval.payload
    create_lease_contract(
        user=approval.requested_by,
        asset_id=p["asset_id"],
        duration_months=p["duration_months"],
    )
    return {"success": True}


# ── Helpers ───────────────────────────────────────────────────

def _audit(request, approval: ApprovalRequest, action: str):
    from accounts.models import AuditLog
    ip = (
        request.META.get("HTTP_X_FORWARDED_FOR", "").split(",")[0].strip()
        or request.META.get("REMOTE_ADDR")
    )
    AuditLog.objects.create(
        user=request.user,
        action=f"approval.{action}",
        resource_type="approval_request",
        resource_id=approval.id,
        description=(
            f"Approval {approval.request_number} ({approval.get_request_type_display()}) "
            f"{action} by {request.user.username}."
        ),
        ip_address=ip or None,
    )


def _notify_requester(approval: ApprovalRequest):
    try:
        from communications.views import notify_user
        verb = "approved" if approval.status == "approved" else "rejected"
        severity = "success" if approval.status == "approved" else "error"
        notify_user(
            user=approval.requested_by,
            title=f"Request {verb}: {approval.get_request_type_display()}",
            body=approval.reviewer_notes or f"Your request {approval.request_number} was {verb}.",
            notification_type="approval_resolved",
            severity=severity,
            resource_type="approval_request",
            resource_id=approval.id,
        )
    except Exception:
        pass


def _notify_admins_of_new_request(approval: ApprovalRequest):
    try:
        from django.contrib.auth import get_user_model
        from communications.views import notify_user
        User = get_user_model()
        for admin in User.objects.filter(role="admin"):
            notify_user(
                user=admin,
                title=f"New Approval Request: {approval.get_request_type_display()}",
                body=f"{approval.requested_by.username} submitted {approval.request_number}. Notes: {approval.requester_notes[:100]}",
                notification_type="approval_pending",
                severity="warning",
                resource_type="approval_request",
                resource_id=approval.id,
            )
    except Exception:
        pass
