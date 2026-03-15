from django.db import models as django_models
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Invoice, PricingRule, ServiceTicket
from .serializers import InvoiceSerializer, PricingRuleSerializer, ServiceTicketSerializer


class IsAdminRole(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "admin"


class IsAnalystRole(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "analyst"


class IsAdminOrAnalyst(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.role in ("admin", "analyst")


class InvoiceListView(generics.ListAPIView):
    serializer_class = InvoiceSerializer
    filterset_fields = ["status", "lease"]
    search_fields = ["invoice_number"]
    ordering_fields = ["issued_at", "due_date", "total_amount"]

    def get_queryset(self):
        user = self.request.user
        # Auto-mark overdue invoices on listing
        Invoice.objects.filter(status="issued", due_date__lt=timezone.now().date()).update(status="overdue")
        qs = Invoice.objects.select_related("lease__asset", "lease__lessee")
        if user.role in ("admin", "analyst"):
            return qs
        return qs.filter(lease__lessee=user)


class InvoiceDetailView(generics.RetrieveAPIView):
    serializer_class = InvoiceSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Invoice.objects.select_related("lease__asset", "lease__lessee")
        if user.role in ("admin", "analyst"):
            return qs
        return qs.filter(lease__lessee=user)


class InvoiceMarkPaidView(APIView):
    permission_classes = [IsAdminRole]

    def post(self, request, pk):
        try:
            invoice = Invoice.objects.get(pk=pk)
        except Invoice.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if invoice.status == "paid":
            return Response(
                {"detail": "Invoice is already paid."}, status=status.HTTP_400_BAD_REQUEST
            )

        invoice.status = "paid"
        invoice.save(update_fields=["status"])

        # Audit log
        try:
            from accounts.models import AuditLog
            ip = (request.META.get("HTTP_X_FORWARDED_FOR", "").split(",")[0].strip()
                  or request.META.get("REMOTE_ADDR"))
            ua = request.META.get("HTTP_USER_AGENT", "")[:300]
            AuditLog.objects.create(
                user=request.user if request.user.is_authenticated else None,
                action="invoice.paid",
                resource_type="invoice",
                resource_id=invoice.id,
                description=f"Invoice {invoice.invoice_number} marked as paid. Amount: {invoice.total_amount}.",
                ip_address=ip or None,
                user_agent=ua,
                metadata={"invoice_number": invoice.invoice_number, "amount": str(invoice.total_amount)},
            )
        except Exception:
            pass

        return Response(InvoiceSerializer(invoice).data)


class TriggerBillingView(APIView):
    """Admin: manually fire a billing cycle and return detailed results."""
    permission_classes = [IsAdminRole]

    def post(self, request):
        from originations.models import LeaseContract
        from servicing.services import calculate_usage_invoice
        from datetime import timedelta

        today = timezone.now().date()
        period_start = today - timedelta(days=30)
        period_end = today

        active_leases = LeaseContract.objects.filter(status="active").select_related("asset", "lessee")
        generated = []
        skipped = []

        for lease in active_leases:
            existing = lease.invoices.filter(
                billing_period_start=period_start,
                billing_period_end=period_end,
            ).exists()
            if existing:
                skipped.append(lease.contract_number)
                continue
            try:
                inv = calculate_usage_invoice(lease.id, period_start, period_end)
                if inv:
                    generated.append({
                        "contract": lease.contract_number,
                        "lessee": lease.lessee.company_name or lease.lessee.username,
                        "asset": lease.asset.name,
                        "amount": str(inv.total_amount),
                    })
            except Exception:
                skipped.append(lease.contract_number)

        # Audit log
        try:
            from accounts.models import AuditLog
            ip = (request.META.get("HTTP_X_FORWARDED_FOR", "").split(",")[0].strip()
                  or request.META.get("REMOTE_ADDR"))
            AuditLog.objects.create(
                user=request.user,
                action="billing.trigger",
                resource_type="billing",
                description=f"Manual billing cycle triggered. {len(generated)} invoices generated.",
                ip_address=ip or None,
                user_agent=request.META.get("HTTP_USER_AGENT", "")[:300],
                metadata={"invoices_generated": len(generated), "invoices_skipped": len(skipped)},
            )
        except Exception:
            pass

        return Response({
            "detail": f"Billing cycle complete. {len(generated)} invoice(s) generated, {len(skipped)} already existed.",
            "invoices_generated": len(generated),
            "invoices_skipped": len(skipped),
            "results": generated,
        })


class TriggerIoTView(APIView):
    """Admin: push one round of simulated IoT pings with detailed results."""
    permission_classes = [IsAdminRole]

    def post(self, request):
        from originations.models import LeaseContract
        from servicing.models import UsageLog
        import random

        _CATEGORY_PROFILES = {
            "heavy_equipment": {"weekday": (1.0, 6.0), "weekend": (0.0, 2.0), "temp": (72.0, 88.0)},
            "medical":         {"weekday": (2.0, 8.0), "weekend": (2.0, 8.0), "temp": (65.0, 78.0)},
            "fleet":           {"weekday": (4.0, 12.0),"weekend": (1.0, 4.0), "temp": (70.0, 85.0)},
            "industrial":      {"weekday": (6.0, 16.0),"weekend": (0.0, 2.0), "temp": (68.0, 82.0)},
        }

        now = timezone.now()
        is_weekend = now.weekday() >= 5
        active_leases = LeaseContract.objects.filter(status="active").select_related("asset")
        pings = []

        for lease in active_leases:
            asset = lease.asset
            profile = _CATEGORY_PROFILES.get(asset.category, _CATEGORY_PROFILES["fleet"])
            h_min, h_max = profile["weekend"] if is_weekend else profile["weekday"]
            temp_min, temp_max = profile["temp"]

            hours_used = round(random.uniform(h_min / 8, h_max / 8), 2)
            degradation = (float(asset.total_hours_logged) / 1000.0) * 0.5
            age_offset = min(max(0, now.year - asset.manufacture_year) * 0.3, 5.0)
            engine_temp = round(random.uniform(temp_min, temp_max) + degradation + age_offset, 1)

            last_log = UsageLog.objects.filter(asset=asset).order_by("-timestamp").first()
            if last_log:
                eff = 1.0 + (float(asset.total_hours_logged) / 10000.0) * 0.05
                fuel_consumed = hours_used * random.uniform(1.0, 3.0) * eff
                fuel_refill = random.uniform(0, 30) if random.random() < 0.1 else 0
                fuel_level = round(max(5.0, min(100.0, last_log.fuel_level_percent - fuel_consumed + fuel_refill)), 1)
            else:
                fuel_level = round(random.uniform(40.0, 95.0), 1)

            lat = 37.7749 + random.uniform(-0.05, 0.05)
            lng = -122.4194 + random.uniform(-0.05, 0.05)

            UsageLog.objects.create(
                asset=asset, lease=lease,
                hours_used=hours_used,
                latitude=round(lat, 6), longitude=round(lng, 6),
                engine_temp_celsius=engine_temp,
                fuel_level_percent=fuel_level,
            )
            asset.total_hours_logged = round(float(asset.total_hours_logged) + hours_used, 2)
            asset.save(update_fields=["total_hours_logged"])

            pings.append({
                "asset": asset.name,
                "category": asset.category,
                "hours_logged": hours_used,
                "engine_temp_c": engine_temp,
                "fuel_level_pct": fuel_level,
            })

        # Audit log
        try:
            from accounts.models import AuditLog
            ip = (request.META.get("HTTP_X_FORWARDED_FOR", "").split(",")[0].strip()
                  or request.META.get("REMOTE_ADDR"))
            AuditLog.objects.create(
                user=request.user,
                action="iot.trigger",
                resource_type="iot",
                description=f"IoT ping triggered manually. {len(pings)} assets pinged.",
                ip_address=ip or None,
                user_agent=request.META.get("HTTP_USER_AGENT", "")[:300],
                metadata={"assets_pinged": len(pings)},
            )
        except Exception:
            pass

        return Response({
            "detail": f"IoT ping complete. {len(pings)} asset(s) pinged.",
            "assets_pinged": len(pings),
            "results": pings,
        })


# ── Service Tickets (Feature 4) ───────────────────────────────

class ServiceTicketListCreateView(generics.ListCreateAPIView):
    serializer_class = ServiceTicketSerializer

    def get_queryset(self):
        user = self.request.user
        qs = ServiceTicket.objects.select_related("asset", "reported_by", "assigned_to")
        if user.role in ("admin", "analyst"):
            s = self.request.query_params.get("status")
            p = self.request.query_params.get("priority")
            if s:
                qs = qs.filter(status=s)
            if p:
                qs = qs.filter(priority=p)
            return qs
        return qs.filter(reported_by=user)

    def perform_create(self, serializer):
        serializer.save(reported_by=self.request.user)
        # Audit
        instance = serializer.instance
        try:
            from accounts.models import AuditLog
            ip = (
                self.request.META.get("HTTP_X_FORWARDED_FOR", "").split(",")[0].strip()
                or self.request.META.get("REMOTE_ADDR")
            )
            ua = self.request.META.get("HTTP_USER_AGENT", "")[:300]
            AuditLog.objects.create(
                user=self.request.user,
                action="ticket.create",
                resource_type="ticket",
                resource_id=instance.id,
                description=f"Ticket {instance.ticket_number} created: {instance.title[:80]}",
                ip_address=ip or None,
                user_agent=ua,
                metadata={"ticket_number": instance.ticket_number, "priority": instance.priority},
            )
        except Exception:
            pass


class ServiceTicketDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = ServiceTicketSerializer

    def get_queryset(self):
        user = self.request.user
        qs = ServiceTicket.objects.select_related("asset", "reported_by", "assigned_to")
        if user.role in ("admin", "analyst"):
            return qs
        return qs.filter(reported_by=user)


class ServiceTicketResolveView(APIView):
    permission_classes = [IsAdminOrAnalyst]

    def post(self, request, pk):
        try:
            ticket = ServiceTicket.objects.get(pk=pk)
        except ServiceTicket.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        resolution_notes = request.data.get("resolution_notes", "")
        ticket.status = "resolved"
        ticket.resolution_notes = resolution_notes
        ticket.resolved_at = timezone.now()
        ticket.save(update_fields=["status", "resolution_notes", "resolved_at"])

        try:
            from accounts.models import AuditLog
            ip = (request.META.get("HTTP_X_FORWARDED_FOR", "").split(",")[0].strip()
                  or request.META.get("REMOTE_ADDR"))
            ua = request.META.get("HTTP_USER_AGENT", "")[:300]
            AuditLog.objects.create(
                user=request.user,
                action="ticket.resolve",
                resource_type="ticket",
                resource_id=ticket.id,
                description=f"Ticket {ticket.ticket_number} resolved.",
                ip_address=ip or None,
                user_agent=ua,
                metadata={"resolution_notes": resolution_notes[:200]},
            )
        except Exception:
            pass

        return Response(ServiceTicketSerializer(ticket).data)


class ServiceTicketAssignView(APIView):
    permission_classes = [IsAdminRole]

    def post(self, request, pk):
        try:
            ticket = ServiceTicket.objects.get(pk=pk)
        except ServiceTicket.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        from django.contrib.auth import get_user_model
        User = get_user_model()
        assignee_id = request.data.get("assignee_id")
        if not assignee_id:
            return Response({"detail": "assignee_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            assignee = User.objects.get(pk=assignee_id)
        except User.DoesNotExist:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        ticket.assigned_to = assignee
        ticket.status = "in_progress"
        ticket.save(update_fields=["assigned_to", "status"])
        return Response(ServiceTicketSerializer(ticket).data)


class ServiceTicketStatsView(APIView):
    permission_classes = [IsAdminOrAnalyst]

    def get(self, request):
        from django.db.models import Count
        by_status = {
            s["status"]: s["count"]
            for s in ServiceTicket.objects.values("status").annotate(count=Count("id"))
        }
        by_priority = {
            s["priority"]: s["count"]
            for s in ServiceTicket.objects.values("priority").annotate(count=Count("id"))
        }
        breached = ServiceTicket.objects.filter(sla_breached=True, status__in=["open", "in_progress", "escalated"]).count()
        return Response({
            "by_status": by_status,
            "by_priority": by_priority,
            "sla_breached": breached,
        })


# ── Pricing Rules (Feature 8) ─────────────────────────────────

class PricingRuleListCreateView(generics.ListCreateAPIView):
    serializer_class = PricingRuleSerializer

    def get_queryset(self):
        qs = PricingRule.objects.all()
        if self.request.query_params.get("active") == "true":
            qs = qs.filter(active=True)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAdminRole()]
        return [permissions.IsAuthenticated()]


class PricingRuleDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PricingRuleSerializer
    permission_classes = [IsAdminRole]
    queryset = PricingRule.objects.all()


class PricingSimulateView(APIView):
    """
    Preview how pricing rules would affect an invoice amount.
    POST { lease_id, base_amount, usage_hours }
    """
    permission_classes = [IsAdminOrAnalyst]

    def post(self, request):
        from decimal import Decimal
        import calendar

        lease_id = request.data.get("lease_id")
        base_amount = Decimal(str(request.data.get("base_amount", 0)))
        usage_hours = float(request.data.get("usage_hours", 0))

        if not lease_id:
            return Response({"detail": "lease_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        from originations.models import LeaseContract
        try:
            lease = LeaseContract.objects.select_related("asset").get(pk=lease_id)
        except LeaseContract.DoesNotExist:
            return Response({"detail": "Lease not found."}, status=status.HTTP_404_NOT_FOUND)

        rules = PricingRule.objects.filter(active=True).filter(
            django_models.Q(asset_category="") | django_models.Q(asset_category=lease.asset.category)
        )

        adjustments = []
        final_amount = base_amount

        current_month = timezone.now().month
        lease_months = max(1, (lease.end_date - lease.start_date).days // 30)

        for rule in rules:
            p = rule.params
            if rule.rule_type == "seasonal":
                if current_month in p.get("months", []):
                    multiplier = Decimal(str(p.get("multiplier", 1.0)))
                    delta = base_amount * (multiplier - 1)
                    final_amount += delta
                    adjustments.append({
                        "rule": rule.name,
                        "type": "seasonal",
                        "delta": float(delta),
                        "note": f"Seasonal multiplier ×{multiplier}",
                    })

            elif rule.rule_type == "utilization_tier":
                tiers = p.get("tiers", [])
                for tier in tiers:
                    if tier["min"] <= usage_hours < tier["max"]:
                        tier_amount = Decimal(str(tier["rate_per_hour"])) * Decimal(str(usage_hours))
                        adjustments.append({
                            "rule": rule.name,
                            "type": "utilization_tier",
                            "delta": float(tier_amount),
                            "note": f"{usage_hours}h × ${tier['rate_per_hour']}/h",
                        })
                        final_amount += tier_amount
                        break

            elif rule.rule_type == "volume_discount":
                min_months = p.get("min_lease_months", 12)
                if lease_months >= min_months:
                    discount = Decimal(str(p.get("discount_percent", 0))) / 100
                    delta = -(base_amount * discount)
                    final_amount += delta
                    adjustments.append({
                        "rule": rule.name,
                        "type": "volume_discount",
                        "delta": float(delta),
                        "note": f"Volume discount {p.get('discount_percent')}% ({lease_months}mo lease)",
                    })

        return Response({
            "base_amount": float(base_amount),
            "final_amount": float(final_amount),
            "adjustments": adjustments,
            "net_change": float(final_amount - base_amount),
        })
