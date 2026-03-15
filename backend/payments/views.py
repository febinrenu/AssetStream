from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from servicing.models import Invoice

from .models import DunningRule, PaymentRecord, ReconciliationReport
from .serializers import (
    DunningRuleSerializer,
    PaymentInitiateSerializer,
    PaymentRecordSerializer,
    ReconciliationReportSerializer,
)


class IsAdminRole(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "admin"


class IsAdminOrAnalyst(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ("admin", "analyst")


# ── Payments ─────────────────────────────────────────────────

class PaymentListView(generics.ListAPIView):
    serializer_class = PaymentRecordSerializer
    permission_classes = [IsAdminOrAnalyst]

    def get_queryset(self):
        qs = PaymentRecord.objects.select_related("invoice", "initiated_by")
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs[:100]


class PaymentInitiateView(APIView):
    """
    Simulate a payment initiation.
    In production: create a Stripe PaymentIntent here and return client_secret.
    Set STRIPE_SECRET_KEY in .env and replace the mock logic below.
    """
    permission_classes = [IsAdminRole]

    def post(self, request):
        ser = PaymentInitiateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        invoice_id = ser.validated_data["invoice_id"]
        try:
            invoice = Invoice.objects.get(pk=invoice_id)
        except Invoice.DoesNotExist:
            return Response({"detail": "Invoice not found."}, status=status.HTTP_404_NOT_FOUND)

        if invoice.status == "paid":
            return Response({"detail": "Invoice already paid."}, status=status.HTTP_400_BAD_REQUEST)

        # ── Stripe integration point ──────────────────────────────
        # import stripe
        # stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")
        # intent = stripe.PaymentIntent.create(
        #     amount=int(invoice.total_amount * 100),
        #     currency="usd",
        #     metadata={"invoice_id": invoice.id},
        # )
        # external_ref = intent.id
        # ─────────────────────────────────────────────────────────

        # Mock: mark as completed immediately
        record = PaymentRecord.objects.create(
            invoice=invoice,
            amount=invoice.total_amount,
            payment_method=ser.validated_data["payment_method"],
            status="completed",
            external_ref=f"mock_{invoice.invoice_number}",
            initiated_by=request.user,
            notes=ser.validated_data.get("notes", ""),
            completed_at=timezone.now(),
        )

        invoice.status = "paid"
        invoice.save(update_fields=["status"])

        # Audit
        from originations.views import _log_action
        _log_action(request, "payment.completed", "invoice", invoice.id,
                    f"Payment {record.payment_ref} of ${record.amount} recorded for {invoice.invoice_number}.")

        # Webhook
        try:
            from communications.views import fire_webhook_event
            fire_webhook_event("payment.completed", {
                "payment_ref": record.payment_ref,
                "invoice_number": invoice.invoice_number,
                "amount": float(record.amount),
            })
        except Exception:
            pass

        return Response(PaymentRecordSerializer(record).data, status=status.HTTP_201_CREATED)


# ── Dunning Rules ─────────────────────────────────────────────

class DunningRuleListCreateView(generics.ListCreateAPIView):
    serializer_class = DunningRuleSerializer
    permission_classes = [IsAdminRole]
    queryset = DunningRule.objects.all()


class DunningRuleDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = DunningRuleSerializer
    permission_classes = [IsAdminRole]
    queryset = DunningRule.objects.all()


# ── Reconciliation ────────────────────────────────────────────

class ReconciliationListView(generics.ListAPIView):
    serializer_class = ReconciliationReportSerializer
    permission_classes = [IsAdminOrAnalyst]
    queryset = ReconciliationReport.objects.all()


class ReconciliationGenerateView(APIView):
    """Generate a reconciliation report for a given period."""
    permission_classes = [IsAdminRole]

    def post(self, request):
        period_start = request.data.get("period_start")
        period_end = request.data.get("period_end")

        if not period_start or not period_end:
            return Response({"detail": "period_start and period_end are required."},
                            status=status.HTTP_400_BAD_REQUEST)

        invoices = Invoice.objects.filter(
            billing_period_start__gte=period_start,
            billing_period_end__lte=period_end,
        )

        totals = invoices.aggregate(
            total_invoiced=Sum("total_amount"),
        )
        paid_invoices = invoices.filter(status="paid")
        overdue_invoices = invoices.filter(status="overdue")

        total_received = paid_invoices.aggregate(total=Sum("total_amount"))["total"] or Decimal("0")
        total_overdue = overdue_invoices.aggregate(total=Sum("total_amount"))["total"] or Decimal("0")
        total_invoiced = totals["total_invoiced"] or Decimal("0")
        total_outstanding = total_invoiced - total_received

        has_discrepancy = total_outstanding > Decimal("0.01")

        report = ReconciliationReport.objects.create(
            period_start=period_start,
            period_end=period_end,
            total_invoiced=total_invoiced,
            total_received=total_received,
            total_outstanding=total_outstanding,
            total_overdue=total_overdue,
            invoice_count=invoices.count(),
            paid_count=paid_invoices.count(),
            overdue_count=overdue_invoices.count(),
            status="discrepancy" if has_discrepancy else "reconciled",
            generated_by=request.user,
        )

        return Response(ReconciliationReportSerializer(report).data, status=status.HTTP_201_CREATED)
