from collections import defaultdict
from datetime import timedelta
import csv
import math
import statistics

from django.db.models import Avg, Count, Max, Min, Sum, StdDev
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from servicing.models import Invoice, UsageLog

from .models import Asset, ContractAnalysis, LeaseContract
from .serializers import (
    AssetSerializer,
    ContractAnalysisSerializer,
    CreateLeaseSerializer,
    LeaseContractSerializer,
    LeaseStatusSerializer,
    RenewLeaseSerializer,
)
from .services import create_lease_contract
from servicing.serializers import InvoiceSerializer, UsageLogSerializer, MaintenanceLogSerializer


class IsAdminRole(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "admin"


class IsAnalystRole(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "analyst"


class IsAdminOrAnalyst(permissions.BasePermission):
    """Read/write for admin; read-only for analyst."""
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.role == "admin":
            return True
        if request.user.role == "analyst" and request.method in permissions.SAFE_METHODS:
            return True
        return False


# ─── Dashboard Summary ──────────────────────────────────────
class DashboardSummaryView(APIView):
    """Single endpoint that returns everything the dashboard needs."""

    def get(self, request):
        user = request.user
        today = timezone.now()
        thirty_days_ago = today - timedelta(days=30)

        # Leases queryset (role-aware)
        if user.role in ("admin", "analyst"):
            all_leases = LeaseContract.objects.select_related("asset", "lessee").all()
            all_invoices = Invoice.objects.select_related("lease").all()
        else:
            all_leases = LeaseContract.objects.select_related("asset", "lessee").filter(lessee=user)
            all_invoices = Invoice.objects.filter(lease__lessee=user)

        active_leases = all_leases.filter(status="active")
        all_assets = Asset.objects.all()

        # KPI counts
        active_leases_count = active_leases.count()
        total_assets_count = all_assets.count()
        overdue_invoices_count = all_invoices.filter(status="overdue").count()

        # Monthly revenue (non-draft invoices)
        monthly_revenue = (
            all_invoices.exclude(status="draft")
            .aggregate(total=Sum("total_amount"))["total"] or 0
        )

        # Fleet status
        fleet_status = {}
        for st in ["available", "leased", "maintenance", "remarketed"]:
            fleet_status[st] = all_assets.filter(status=st).count()

        # Real telemetry — hours by category per day for last 30 days
        telemetry_qs = (
            UsageLog.objects
            .filter(timestamp__gte=thirty_days_ago)
            .select_related("asset")
        )

        # Build day → category → hours dict
        daily_usage: dict = defaultdict(lambda: defaultdict(float))
        for log in telemetry_qs:
            day_str = log.timestamp.date().isoformat()
            cat = log.asset.category
            daily_usage[day_str][cat] += log.hours_used

        # Fill all 30 days
        telemetry_30d = []
        for offset in range(30, -1, -1):
            d = (today - timedelta(days=offset)).date()
            day_str = d.isoformat()
            entry = {"date": day_str}
            for cat in ["heavy_equipment", "medical", "fleet", "industrial"]:
                entry[cat] = round(daily_usage[day_str].get(cat, 0), 2)
            entry["total"] = round(sum(entry[c] for c in ["heavy_equipment", "medical", "fleet", "industrial"]), 2)
            telemetry_30d.append(entry)

        total_hours_30d = sum(e["total"] for e in telemetry_30d)

        # ── Period comparison: current 30d vs prior 30d ──────────
        sixty_days_ago = today - timedelta(days=60)

        # Revenue comparison
        current_revenue = float(
            all_invoices.filter(issued_at__gte=thirty_days_ago)
            .exclude(status="draft")
            .aggregate(total=Sum("total_amount"))["total"] or 0
        )
        prior_revenue = float(
            all_invoices.filter(issued_at__gte=sixty_days_ago, issued_at__lt=thirty_days_ago)
            .exclude(status="draft")
            .aggregate(total=Sum("total_amount"))["total"] or 0
        )
        revenue_change_pct = (
            ((current_revenue - prior_revenue) / prior_revenue * 100)
            if prior_revenue > 0 else 0.0
        )

        # Active leases comparison (snapshot: leases active whose start <= period end, end >= period start)
        current_active = all_leases.filter(
            status__in=["active", "completed", "defaulted"],
            start_date__lte=today.date(),
            end_date__gte=thirty_days_ago.date(),
        ).count()
        prior_active = all_leases.filter(
            status__in=["active", "completed", "defaulted"],
            start_date__lte=thirty_days_ago.date(),
            end_date__gte=sixty_days_ago.date(),
        ).count()

        # Usage hours comparison
        current_hours = float(
            UsageLog.objects.filter(timestamp__gte=thirty_days_ago)
            .aggregate(total=Sum("hours_used"))["total"] or 0
        )
        prior_hours = float(
            UsageLog.objects.filter(timestamp__gte=sixty_days_ago, timestamp__lt=thirty_days_ago)
            .aggregate(total=Sum("hours_used"))["total"] or 0
        )
        util_change_pct = (
            ((current_hours - prior_hours) / prior_hours * 100)
            if prior_hours > 0 else 0.0
        )

        # Overdue invoice comparison
        current_overdue = all_invoices.filter(
            status="overdue", due_date__gte=thirty_days_ago.date()
        ).count()
        prior_overdue = all_invoices.filter(
            status="overdue", due_date__gte=sixty_days_ago.date(), due_date__lt=thirty_days_ago.date()
        ).count()

        period_comparison = {
            "revenue_change_pct": round(revenue_change_pct, 1),
            "lease_change": current_active - prior_active,
            "utilization_change_pct": round(util_change_pct, 1),
            "overdue_change": current_overdue - prior_overdue,
        }

        # Upcoming expirations (next 90 days)
        from accounts.serializers import UserSerializer

        upcoming = []
        for lease in active_leases.order_by("end_date")[:8]:
            days_left = (lease.end_date - today.date()).days
            upcoming.append({
                "id": lease.id,
                "contract_number": lease.contract_number,
                "end_date": lease.end_date.isoformat(),
                "days_left": days_left,
                "asset_name": lease.asset.name,
                "asset_id": lease.asset.id,
                "lessee_company": lease.lessee.company_name or lease.lessee.username,
            })

        # Recent invoices (5)
        recent_invoices = InvoiceSerializer(
            all_invoices.order_by("-issued_at")[:5], many=True
        ).data

        # Revenue by month (last 6 months)
        six_months_ago = today - timedelta(days=180)
        monthly_breakdown: dict = defaultdict(float)
        for inv in all_invoices.filter(issued_at__gte=six_months_ago).exclude(status="draft"):
            month = inv.billing_period_end.strftime("%b %Y")
            monthly_breakdown[month] += float(inv.total_amount)

        return Response({
            "active_leases_count": active_leases_count,
            "total_assets_count": total_assets_count,
            "overdue_invoices_count": overdue_invoices_count,
            "monthly_revenue": float(monthly_revenue),
            "fleet_status": fleet_status,
            "telemetry_30d": telemetry_30d,
            "total_hours_30d": round(total_hours_30d, 1),
            "upcoming_expirations": upcoming,
            "recent_invoices": list(recent_invoices),
            "monthly_revenue_breakdown": [
                {"month": k, "revenue": round(v, 2)}
                for k, v in sorted(monthly_breakdown.items())
            ],
            "period_comparison": period_comparison,
        })


# ─── Notifications ──────────────────────────────────────────
class NotificationsView(APIView):
    """Returns actionable alerts for the current user."""

    def get(self, request):
        user = request.user
        today = timezone.now()
        alerts = []

        if user.role in ("admin", "analyst"):
            leases = LeaseContract.objects.select_related("asset", "lessee").filter(status="active")
            invoices = Invoice.objects.all()
        else:
            leases = LeaseContract.objects.select_related("asset", "lessee").filter(
                lessee=user, status="active"
            )
            invoices = Invoice.objects.filter(lease__lessee=user)

        # Overdue invoices
        for inv in invoices.filter(status="overdue")[:5]:
            alerts.append({
                "id": f"inv-{inv.id}",
                "type": "overdue_invoice",
                "severity": "error",
                "title": "Overdue Invoice",
                "message": f"{inv.invoice_number} — ${float(inv.total_amount):,.2f} overdue",
                "resource_id": inv.id,
                "resource_type": "invoice",
            })

        # Leases expiring in < 30 days
        for lease in leases:
            days_left = (lease.end_date - today.date()).days
            if 0 <= days_left <= 30:
                alerts.append({
                    "id": f"lease-{lease.id}",
                    "type": "lease_expiring",
                    "severity": "warning",
                    "title": "Lease Expiring Soon",
                    "message": f"{lease.asset.name} — {days_left}d remaining",
                    "resource_id": lease.id,
                    "resource_type": "lease",
                })

        # High engine temp alerts (>90°C in last hour)
        one_hour_ago = today - timedelta(hours=1)
        hot_logs = (
            UsageLog.objects
            .filter(timestamp__gte=one_hour_ago, engine_temp_celsius__gt=90.0)
            .select_related("asset")
            .order_by("-engine_temp_celsius")[:5]
        )
        seen_assets = set()
        for log in hot_logs:
            if log.asset.id not in seen_assets:
                seen_assets.add(log.asset.id)
                alerts.append({
                    "id": f"temp-{log.id}",
                    "type": "high_temp",
                    "severity": "warning",
                    "title": "High Engine Temperature",
                    "message": f"{log.asset.name} — {log.engine_temp_celsius:.1f}°C",
                    "resource_id": log.asset.id,
                    "resource_type": "asset",
                })

        # Mark invoices as overdue if past due date
        Invoice.objects.filter(status="issued", due_date__lt=today.date()).update(status="overdue")

        return Response({"count": len(alerts), "items": alerts})


class AssetListCreateView(generics.ListCreateAPIView):
    queryset = Asset.objects.all()
    serializer_class = AssetSerializer
    filterset_fields = ["category", "status"]
    search_fields = ["name", "serial_number"]
    ordering_fields = ["name", "manufacture_year", "base_monthly_rate", "total_hours_logged"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAdminRole()]
        return [permissions.IsAuthenticated()]


class AssetDetailView(generics.RetrieveAPIView):
    queryset = Asset.objects.all()
    serializer_class = AssetSerializer


class AssetUsageLogsView(generics.ListAPIView):
    serializer_class = UsageLogSerializer

    def get_queryset(self):
        asset_id = self.kwargs["pk"]
        thirty_days_ago = timezone.now() - timedelta(days=30)
        return UsageLog.objects.filter(
            asset_id=asset_id, timestamp__gte=thirty_days_ago
        ).order_by("-timestamp")


class AssetHealthView(APIView):
    def get(self, request, pk):
        thirty_days_ago = timezone.now() - timedelta(days=30)
        logs = UsageLog.objects.filter(asset_id=pk, timestamp__gte=thirty_days_ago)

        if not logs.exists():
            return Response({"detail": "No usage data available."}, status=status.HTTP_404_NOT_FOUND)

        latest = logs.order_by("-timestamp").first()

        stats = logs.aggregate(
            avg_engine_temp=Avg("engine_temp_celsius"),
            max_engine_temp=Max("engine_temp_celsius"),
            min_engine_temp=Min("engine_temp_celsius"),
            avg_fuel_level=Avg("fuel_level_percent"),
            total_hours=Sum("hours_used"),
        )

        return Response({
            "latest": {
                "engine_temp_celsius": latest.engine_temp_celsius,
                "fuel_level_percent": latest.fuel_level_percent,
                "latitude": latest.latitude,
                "longitude": latest.longitude,
                "timestamp": latest.timestamp,
            },
            "stats_30d": stats,
        })


class AssetHealthScoreView(APIView):
    """GET /assets/<pk>/health-score/ — single 0-100 score."""

    def get(self, request, pk):
        asset = get_object_or_404(Asset, pk=pk)
        now = timezone.now()
        thirty_days_ago = now - timedelta(days=30)

        logs = UsageLog.objects.filter(asset=asset, timestamp__gte=thirty_days_ago)
        factors = []
        scores = []

        # 1. Age penalty: newer = better (max 25 pts)
        current_year = now.year
        age = current_year - asset.manufacture_year
        if age <= 1:
            age_score = 25
        elif age <= 3:
            age_score = 22
        elif age <= 5:
            age_score = 18
        elif age <= 8:
            age_score = 12
        elif age <= 12:
            age_score = 7
        else:
            age_score = 3
        scores.append(age_score)
        factors.append({
            "name": "Age",
            "score": age_score,
            "max": 25,
            "detail": f"{age} years old (manufactured {asset.manufacture_year})",
        })

        # 2. Temp stability: lower avg temp variance = better (max 20 pts)
        if logs.exists():
            temp_stats = logs.aggregate(
                avg_temp=Avg("engine_temp_celsius"),
                stddev_temp=StdDev("engine_temp_celsius"),
            )
            stddev = temp_stats["stddev_temp"] or 0
            avg_temp = temp_stats["avg_temp"] or 75
            # Penalty for high stddev and high avg temp
            temp_score = max(0, 20 - (stddev * 1.5) - max(0, (avg_temp - 85) * 1.0))
            temp_score = min(20, round(temp_score, 1))
        else:
            temp_score = 10  # neutral when no data
        scores.append(temp_score)
        factors.append({
            "name": "Temperature Stability",
            "score": round(temp_score, 1),
            "max": 20,
            "detail": f"Std dev: {round(stddev, 1) if logs.exists() else 'N/A'}°C"
                      f", avg: {round(avg_temp, 1) if logs.exists() else 'N/A'}°C",
        })

        # 3. Fuel stability: stable fuel levels = better (max 15 pts)
        if logs.count() >= 2:
            fuel_vals = list(logs.order_by("timestamp").values_list("fuel_level_percent", flat=True))
            fuel_changes = [abs(fuel_vals[i] - fuel_vals[i - 1]) for i in range(1, len(fuel_vals))]
            avg_change = sum(fuel_changes) / len(fuel_changes) if fuel_changes else 0
            fuel_score = max(0, 15 - avg_change * 0.8)
            fuel_score = min(15, round(fuel_score, 1))
        else:
            fuel_score = 8  # neutral
        scores.append(fuel_score)
        factors.append({
            "name": "Fuel Stability",
            "score": round(fuel_score, 1),
            "max": 15,
            "detail": f"Avg fuel change: {round(avg_change, 1) if logs.count() >= 2 else 'N/A'}%",
        })

        # 4. Maintenance: fewer unresolved tickets = better (max 20 pts)
        from servicing.models import MaintenanceLog
        open_maintenance = MaintenanceLog.objects.filter(asset=asset, resolved=False).count()
        open_tickets = asset.tickets.filter(status__in=["open", "in_progress", "escalated"]).count()
        total_issues = open_maintenance + open_tickets
        if total_issues == 0:
            maint_score = 20
        elif total_issues <= 1:
            maint_score = 15
        elif total_issues <= 3:
            maint_score = 10
        elif total_issues <= 5:
            maint_score = 5
        else:
            maint_score = 2
        scores.append(maint_score)
        factors.append({
            "name": "Maintenance",
            "score": maint_score,
            "max": 20,
            "detail": f"{total_issues} unresolved issues ({open_maintenance} maint, {open_tickets} tickets)",
        })

        # 5. Utilization: moderate usage = best (max 20 pts)
        if logs.exists():
            total_hours = logs.aggregate(h=Sum("hours_used"))["h"] or 0
            # Ideal: 4-8 hours/day avg over 30 days = 120-240 total
            expected_mid = 180  # midpoint
            deviation = abs(total_hours - expected_mid) / expected_mid
            util_score = max(0, 20 - deviation * 20)
            util_score = min(20, round(util_score, 1))
        else:
            total_hours = 0
            util_score = 5  # low score if no usage data
        scores.append(util_score)
        factors.append({
            "name": "Utilization",
            "score": round(util_score, 1),
            "max": 20,
            "detail": f"{round(total_hours, 1)} hours in last 30 days",
        })

        # Total score
        total_score = round(sum(scores), 0)
        total_score = max(0, min(100, total_score))

        # Grade
        if total_score >= 85:
            grade = "A"
        elif total_score >= 70:
            grade = "B"
        elif total_score >= 55:
            grade = "C"
        elif total_score >= 40:
            grade = "D"
        else:
            grade = "F"

        # Trend: compare to 30-60 days ago
        prior_logs = UsageLog.objects.filter(
            asset=asset,
            timestamp__gte=now - timedelta(days=60),
            timestamp__lt=thirty_days_ago,
        )
        if prior_logs.exists() and logs.exists():
            prior_temp = prior_logs.aggregate(avg=Avg("engine_temp_celsius"))["avg"] or 75
            current_temp = logs.aggregate(avg=Avg("engine_temp_celsius"))["avg"] or 75
            temp_diff = current_temp - prior_temp
            if temp_diff > 2:
                trend = "declining"
            elif temp_diff < -2:
                trend = "improving"
            else:
                trend = "stable"
        else:
            trend = "stable"

        return Response({
            "score": int(total_score),
            "grade": grade,
            "factors": factors,
            "trend": trend,
            "asset_id": asset.id,
            "asset_name": asset.name,
        })


class LeaseListCreateView(generics.ListCreateAPIView):
    serializer_class = LeaseContractSerializer
    filterset_fields = ["status", "asset"]
    search_fields = ["contract_number"]
    ordering_fields = ["start_date", "end_date", "created_at"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAdminRole()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.role in ("admin", "analyst"):
            return LeaseContract.objects.select_related("asset", "lessee").all()
        return LeaseContract.objects.select_related("asset", "lessee").filter(lessee=user)

    def create(self, request, *args, **kwargs):
        serializer = CreateLeaseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        lease = create_lease_contract(
            user=request.user,
            asset_id=serializer.validated_data["asset_id"],
            duration_months=serializer.validated_data["duration_months"],
        )
        return Response(
            LeaseContractSerializer(lease).data,
            status=status.HTTP_201_CREATED,
        )


class LeaseDetailView(generics.RetrieveAPIView):
    serializer_class = LeaseContractSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role in ("admin", "analyst"):
            return LeaseContract.objects.select_related("asset", "lessee").all()
        return LeaseContract.objects.select_related("asset", "lessee").filter(lessee=user)


class LeaseStatusUpdateView(APIView):
    permission_classes = [IsAdminRole]

    def patch(self, request, pk):
        try:
            lease = LeaseContract.objects.get(pk=pk)
        except LeaseContract.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = LeaseStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data["status"]
        lease.status = new_status
        lease.save(update_fields=["status"])

        if new_status in ("completed", "defaulted"):
            lease.asset.status = "available"
            lease.asset.save(update_fields=["status"])

        return Response(LeaseContractSerializer(lease).data)


class LeaseTerminateView(APIView):
    """Terminate an active lease early and free the asset."""

    permission_classes = [IsAdminRole]

    def post(self, request, pk):
        try:
            lease = LeaseContract.objects.get(pk=pk)
        except LeaseContract.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if lease.status not in ("active", "pending"):
            return Response(
                {"detail": f"Cannot terminate a lease with status '{lease.status}'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        lease.status = "completed"
        lease.save(update_fields=["status"])
        lease.asset.status = "available"
        lease.asset.save(update_fields=["status"])

        _log_action(request, "lease.terminate", "lease", lease.id,
                    f"Lease {lease.contract_number} for {lease.asset.name} terminated early.")

        return Response(LeaseContractSerializer(lease).data)


# ─── Helpers ────────────────────────────────────────────────
def _log_action(request, action, resource_type, resource_id, description, metadata=None):
    """Create an immutable AuditLog entry. Safe to call anywhere in a view."""
    from accounts.models import AuditLog
    ip = (
        request.META.get("HTTP_X_FORWARDED_FOR", "").split(",")[0].strip()
        or request.META.get("REMOTE_ADDR")
    )
    ua = request.META.get("HTTP_USER_AGENT", "")[:300]
    AuditLog.objects.create(
        user=request.user if request.user.is_authenticated else None,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        description=description,
        ip_address=ip or None,
        user_agent=ua,
        metadata=metadata or {},
    )


# ─── Lease Renewal ──────────────────────────────────────────
class LeaseRenewView(APIView):
    """Extend a lease by N additional months from the current end date."""

    def post(self, request, pk):
        try:
            lease = LeaseContract.objects.select_related("asset", "lessee").get(pk=pk)
        except LeaseContract.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.user.role not in ("admin",) and lease.lessee != request.user:
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

        if lease.status not in ("active", "pending", "completed"):
            return Response(
                {"detail": f"Cannot renew a lease with status '{lease.status}'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = RenewLeaseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        months = serializer.validated_data["duration_months"]

        # Extend from current end_date (or today if already completed)
        base = lease.end_date if lease.end_date >= timezone.now().date() else timezone.now().date()
        from dateutil.relativedelta import relativedelta
        new_end = base + relativedelta(months=months)

        lease.end_date = new_end
        if lease.status == "completed":
            lease.status = "active"
            lease.asset.status = "leased"
            lease.asset.save(update_fields=["status"])
        lease.save(update_fields=["end_date", "status"])

        _log_action(request, "lease.renew", "lease", lease.id,
                    f"Lease {lease.contract_number} renewed for {months} months. New end: {new_end}.")

        return Response(LeaseContractSerializer(lease).data)


# ─── Asset Maintenance ───────────────────────────────────────
class AssetMaintenanceLogsView(generics.ListCreateAPIView):
    serializer_class = MaintenanceLogSerializer

    def get_queryset(self):
        from servicing.models import MaintenanceLog
        return MaintenanceLog.objects.filter(asset_id=self.kwargs["pk"])

    def perform_create(self, serializer):
        from servicing.models import MaintenanceLog
        asset = Asset.objects.get(pk=self.kwargs["pk"])
        instance = serializer.save(asset=asset, logged_by=self.request.user, start_date=timezone.now().date())
        # Set asset status to maintenance
        asset.status = "maintenance"
        asset.save(update_fields=["status"])
        _log_action(self.request, "asset.maintenance", "asset", asset.id,
                    f"Maintenance logged for {asset.name}: {instance.notes[:80]}")

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAdminRole()]
        return [permissions.IsAuthenticated()]


class AssetMaintenanceResolveView(APIView):
    """Mark a maintenance log as resolved and set asset back to available."""

    permission_classes = [IsAdminRole]

    def post(self, request, asset_pk, log_pk):
        from servicing.models import MaintenanceLog
        try:
            log = MaintenanceLog.objects.select_related("asset").get(pk=log_pk, asset_id=asset_pk)
        except MaintenanceLog.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        log.resolved = True
        log.resolved_date = timezone.now().date()
        log.save(update_fields=["resolved", "resolved_date"])

        # Only set available if no other open maintenance logs
        remaining_open = MaintenanceLog.objects.filter(asset_id=asset_pk, resolved=False).count()
        if remaining_open == 0:
            log.asset.status = "available"
            log.asset.save(update_fields=["status"])

        _log_action(request, "asset.maintenance_resolved", "asset", asset_pk,
                    f"Maintenance log #{log_pk} resolved for {log.asset.name}.")

        return Response(MaintenanceLogSerializer(log).data)


# ─── Asset PATCH (status / notes) ───────────────────────────
class AssetPartialUpdateView(APIView):
    permission_classes = [IsAdminRole]

    def patch(self, request, pk):
        try:
            asset = Asset.objects.get(pk=pk)
        except Asset.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        allowed = {"status", "name", "base_monthly_rate", "per_hour_rate", "image_url"}
        for field in allowed.intersection(request.data.keys()):
            setattr(asset, field, request.data[field])
        asset.save()

        _log_action(request, "asset.update", "asset", asset.id,
                    f"Asset {asset.name} updated: {list(allowed.intersection(request.data.keys()))}")

        return Response(AssetSerializer(asset).data)


# ─── Audit Log ──────────────────────────────────────────────
class AuditLogListView(APIView):
    permission_classes = [IsAdminOrAnalyst]

    def get(self, request):
        from accounts.models import AuditLog
        from accounts.serializers import AuditLogSerializer

        page = int(request.query_params.get("page", 1))
        page_size = 40
        offset = (page - 1) * page_size

        qs = AuditLog.objects.select_related("user").all()

        # Filters
        action_filter = request.query_params.get("action")
        resource_filter = request.query_params.get("resource_type")
        if action_filter:
            qs = qs.filter(action__icontains=action_filter)
        if resource_filter:
            qs = qs.filter(resource_type=resource_filter)

        total = qs.count()
        logs = qs[offset: offset + page_size]

        return Response({
            "count": total,
            "page": page,
            "page_size": page_size,
            "results": AuditLogSerializer(logs, many=True).data,
        })


# ─── CSV Exports ─────────────────────────────────────────────
class AssetCSVExportView(APIView):
    permission_classes = [IsAdminOrAnalyst]

    def get(self, request):
        assets = Asset.objects.only(
            "id", "name", "category", "serial_number", "manufacture_year",
            "status", "base_monthly_rate", "per_hour_rate", "total_hours_logged",
        )
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="assets.csv"'
        writer = csv.writer(response)
        writer.writerow(["ID", "Name", "Category", "Serial Number", "Year",
                         "Status", "Monthly Rate", "Per Hour Rate", "Total Hours"])
        for a in assets:
            writer.writerow([a.id, a.name, a.category, a.serial_number,
                              a.manufacture_year, a.status, a.base_monthly_rate,
                              a.per_hour_rate, round(a.total_hours_logged, 1)])
        return response


class LeaseCSVExportView(APIView):
    permission_classes = [IsAdminOrAnalyst]

    def get(self, request):
        leases = LeaseContract.objects.select_related("asset", "lessee").all()
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="leases.csv"'
        writer = csv.writer(response)
        writer.writerow(["Contract #", "Asset", "Serial", "Lessee", "Company",
                         "Start Date", "End Date", "Monthly Fee", "Status"])
        for l in leases:
            writer.writerow([l.contract_number, l.asset.name, l.asset.serial_number,
                              l.lessee.username, l.lessee.company_name,
                              l.start_date, l.end_date, l.monthly_base_fee, l.status])
        return response


class InvoiceCSVExportView(APIView):
    permission_classes = [IsAdminOrAnalyst]

    def get(self, request):
        invoices = Invoice.objects.select_related("lease__asset", "lease__lessee").all()
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="invoices.csv"'
        writer = csv.writer(response)
        writer.writerow(["Invoice #", "Period Start", "Period End", "Asset",
                         "Base Fee", "Usage Fee", "Total", "Status", "Due Date"])
        for inv in invoices:
            writer.writerow([inv.invoice_number, inv.billing_period_start, inv.billing_period_end,
                              inv.lease.asset.name, inv.base_fee, inv.usage_fee,
                              inv.total_amount, inv.status, inv.due_date])
        return response


# ─── Health Check ────────────────────────────────────────────
class CashFlowForecastView(APIView):
    """GET /portfolio/cash-flow-forecast/ — 90-day projected cash in/out."""
    permission_classes = [IsAdminOrAnalyst]

    def get(self, request):
        from decimal import Decimal

        today = timezone.now().date()
        ninety_days = today + timedelta(days=90)

        # Active leases for base fee projection
        active_leases = LeaseContract.objects.filter(status="active")
        total_monthly_arr = float(
            active_leases.aggregate(s=Sum("monthly_base_fee"))["s"] or 0
        )
        weekly_lease_income = total_monthly_arr / 4.33  # monthly to weekly

        # Upcoming invoices (issued, not yet paid) with due dates in next 90 days
        upcoming_invoices = Invoice.objects.filter(
            status="issued",
            due_date__gte=today,
            due_date__lte=ninety_days,
        ).select_related("lease__asset")

        # Overdue invoices — probability-weighted recovery
        overdue_invoices = Invoice.objects.filter(status="overdue").select_related("lease__asset")

        # Build weekly buckets
        weeks = []
        for week_idx in range(13):  # 13 weeks ~ 90 days
            week_start = today + timedelta(weeks=week_idx)
            week_end = week_start + timedelta(days=6)

            # Expected inflows from issued invoices due this week
            week_issued = upcoming_invoices.filter(
                due_date__gte=week_start, due_date__lte=week_end
            )
            expected_inflow = float(
                week_issued.aggregate(s=Sum("total_amount"))["s"] or 0
            )

            # Overdue recovery: probability decreases with age
            overdue_recovery = 0.0
            for inv in overdue_invoices:
                days_overdue = (today - inv.due_date).days
                # Recovery probability: 60% if <30d, 30% if 30-60d, 10% if 60-90d, 5% if >90d
                if days_overdue < 30:
                    prob = 0.60
                elif days_overdue < 60:
                    prob = 0.30
                elif days_overdue < 90:
                    prob = 0.10
                else:
                    prob = 0.05
                # Spread recovery over 13 weeks
                overdue_recovery += float(inv.total_amount) * prob / 13

            # Lease income (base fees)
            lease_income = weekly_lease_income

            projected_inflow = expected_inflow + overdue_recovery + lease_income

            # Projected outflow: estimate operational costs as 15% of lease income
            # plus maintenance reserves
            projected_outflow = lease_income * 0.15

            weeks.append({
                "week": week_idx + 1,
                "week_start": week_start.isoformat(),
                "week_end": week_end.isoformat(),
                "expected_invoice_inflow": round(expected_inflow, 2),
                "overdue_recovery": round(overdue_recovery, 2),
                "lease_income": round(lease_income, 2),
                "projected_inflow": round(projected_inflow, 2),
                "projected_outflow": round(projected_outflow, 2),
                "net_position": round(projected_inflow - projected_outflow, 2),
            })

        total_projected_inflow = sum(w["projected_inflow"] for w in weeks)
        total_projected_outflow = sum(w["projected_outflow"] for w in weeks)

        return Response({
            "forecast_period": {
                "start": today.isoformat(),
                "end": ninety_days.isoformat(),
                "weeks": 13,
            },
            "weekly_buckets": weeks,
            "totals": {
                "projected_inflow": round(total_projected_inflow, 2),
                "projected_outflow": round(total_projected_outflow, 2),
                "net_position": round(total_projected_inflow - total_projected_outflow, 2),
                "monthly_arr": round(total_monthly_arr, 2),
            },
        })


class InvoiceAgingReportView(APIView):
    """GET /invoices/aging-report/ — 30/60/90+ day buckets."""
    permission_classes = [IsAdminOrAnalyst]

    def get(self, request):
        today = timezone.now().date()
        overdue_invoices = Invoice.objects.filter(status="overdue").select_related(
            "lease__lessee", "lease__asset"
        )

        buckets = {
            "0-30": {"min_days": 0, "max_days": 30, "invoices": []},
            "31-60": {"min_days": 31, "max_days": 60, "invoices": []},
            "61-90": {"min_days": 61, "max_days": 90, "invoices": []},
            "90+": {"min_days": 91, "max_days": None, "invoices": []},
        }

        total_overdue = 0
        total_days_weighted = 0

        for inv in overdue_invoices:
            days_overdue = max(0, (today - inv.due_date).days)
            amount = float(inv.total_amount)
            total_overdue += amount
            total_days_weighted += days_overdue * amount

            entry = {
                "invoice_id": inv.id,
                "invoice_number": inv.invoice_number,
                "amount": amount,
                "days_overdue": days_overdue,
                "due_date": inv.due_date.isoformat(),
                "lessee": inv.lease.lessee.company_name or inv.lease.lessee.username,
                "asset": inv.lease.asset.name,
            }

            if days_overdue <= 30:
                buckets["0-30"]["invoices"].append(entry)
            elif days_overdue <= 60:
                buckets["31-60"]["invoices"].append(entry)
            elif days_overdue <= 90:
                buckets["61-90"]["invoices"].append(entry)
            else:
                buckets["90+"]["invoices"].append(entry)

        # Build summary per bucket
        result_buckets = []
        for label, bucket in buckets.items():
            inv_list = bucket["invoices"]
            bucket_total = sum(i["amount"] for i in inv_list)
            # Top 3 lessees by amount in this bucket
            lessee_totals = defaultdict(float)
            for i in inv_list:
                lessee_totals[i["lessee"]] += i["amount"]
            top_lessees = [
                {"name": k, "amount": round(v, 2)}
                for k, v in sorted(lessee_totals.items(), key=lambda x: -x[1])[:3]
            ]
            result_buckets.append({
                "bucket": label,
                "count": len(inv_list),
                "total_amount": round(bucket_total, 2),
                "top_lessees": top_lessees,
            })

        # Collection rate
        paid_total = float(
            Invoice.objects.filter(status="paid").aggregate(s=Sum("total_amount"))["s"] or 0
        )
        all_billed = paid_total + total_overdue + float(
            Invoice.objects.filter(status="issued").aggregate(s=Sum("total_amount"))["s"] or 0
        )
        collection_rate = (paid_total / all_billed * 100) if all_billed > 0 else 0

        weighted_avg_days = (total_days_weighted / total_overdue) if total_overdue > 0 else 0

        return Response({
            "buckets": result_buckets,
            "summary": {
                "total_overdue": round(total_overdue, 2),
                "total_overdue_count": overdue_invoices.count(),
                "weighted_avg_days": round(weighted_avg_days, 1),
                "collection_rate": round(collection_rate, 1),
            },
        })


class HealthCheckView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from django.db import connection
        import redis as redis_lib
        import os

        # DB check
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            db_ok = True
        except Exception:
            db_ok = False

        # Redis check
        try:
            r = redis_lib.from_url(os.environ.get("REDIS_URL", "redis://redis:6379/0"))
            r.ping()
            redis_ok = True
        except Exception:
            redis_ok = False

        all_ok = db_ok and redis_ok
        return Response(
            {
                "status": "healthy" if all_ok else "degraded",
                "database": "ok" if db_ok else "error",
                "redis": "ok" if redis_ok else "error",
                "version": "1.0.0",
            },
            status=status.HTTP_200_OK if all_ok else status.HTTP_503_SERVICE_UNAVAILABLE,
        )


# ─── Utilization Heatmap ─────────────────────────────────────
class UtilizationHeatmapView(APIView):
    """Returns daily usage hours for the last 84 days (12 weeks) for a calendar heatmap."""

    def get(self, request):
        days = int(request.query_params.get("days", 84))
        if days > 365:
            days = 365
        now = timezone.now()
        since = now - timedelta(days=days)

        qs = UsageLog.objects.filter(timestamp__gte=since).select_related("asset")

        daily: dict = defaultdict(lambda: defaultdict(float))
        for log in qs:
            day_str = log.timestamp.date().isoformat()
            daily[day_str][log.asset.category] += log.hours_used
            daily[day_str]["total"] += log.hours_used

        result = []
        for offset in range(days, -1, -1):
            d = (now - timedelta(days=offset)).date()
            day_str = d.isoformat()
            entry = {"date": day_str}
            for cat in ["heavy_equipment", "medical", "fleet", "industrial", "total"]:
                entry[cat] = round(daily[day_str].get(cat, 0), 2)
            result.append(entry)

        # Compute max for normalizing cell intensity on the frontend
        max_total = max((r["total"] for r in result), default=1) or 1
        return Response({"days": result, "max_total": round(max_total, 2)})


# ─── Lease Document Upload ───────────────────────────────────
class LeaseDocumentUploadView(APIView):
    """Upload or replace a PDF/document attached to a lease contract."""

    parser_classes = [MultiPartParser]

    def post(self, request, pk):
        try:
            lease = LeaseContract.objects.select_related("lessee").get(pk=pk)
        except LeaseContract.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.user.role != "admin" and lease.lessee != request.user:
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

        file = request.FILES.get("document")
        if not file:
            return Response({"detail": "No file provided."}, status=status.HTTP_400_BAD_REQUEST)

        # Basic size check (10 MB max)
        if file.size > 10 * 1024 * 1024:
            return Response({"detail": "File too large (max 10 MB)."}, status=status.HTTP_400_BAD_REQUEST)

        lease.document = file
        lease.save(update_fields=["document"])

        _log_action(request, "lease.document_upload", "lease", lease.id,
                    f"Document '{file.name}' uploaded for lease {lease.contract_number}.")

        return Response({
            "contract_number": lease.contract_number,
            "document_url": request.build_absolute_uri(lease.document.url) if lease.document else None,
        })

    def delete(self, request, pk):
        try:
            lease = LeaseContract.objects.get(pk=pk)
        except LeaseContract.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.user.role != "admin" and lease.lessee != request.user:
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

        if lease.document:
            lease.document.delete(save=False)
            lease.document = None
            lease.save(update_fields=["document"])
            _log_action(request, "lease.document_removed", "lease", lease.id,
                        f"Document removed from lease {lease.contract_number}.")

        return Response(status=status.HTTP_204_NO_CONTENT)


# ─── Feature 9: Portfolio Risk Cockpit ───────────────────────

class PortfolioRiskView(APIView):
    """
    Computes real-time risk indicators across the portfolio.
    Returns default risk, utilization risk, concentration risk, and revenue-at-risk.
    """
    permission_classes = [IsAdminOrAnalyst]

    def get(self, request):
        from collections import defaultdict
        from django.db.models import Count, Sum
        from servicing.models import Invoice

        today = timezone.now().date()
        thirty_days_ago = timezone.now() - timedelta(days=30)

        all_leases = LeaseContract.objects.select_related("asset", "lessee").all()
        active_leases = all_leases.filter(status="active")
        all_invoices = Invoice.objects.select_related("lease__lessee", "lease__asset")

        # ── Default Risk ─────────────────────────────────────────
        overdue_invoices = all_invoices.filter(status="overdue")
        overdue_total = overdue_invoices.aggregate(t=Sum("total_amount"))["t"] or 0
        total_outstanding = all_invoices.exclude(status__in=["paid", "draft"]).aggregate(
            t=Sum("total_amount")
        )["t"] or 1

        # Lessees with overdue invoices
        overdue_lessees = set(overdue_invoices.values_list("lease__lessee_id", flat=True))
        total_lessees = all_leases.values("lessee_id").distinct().count()
        default_risk_rate = len(overdue_lessees) / max(total_lessees, 1)

        # Days outstanding stats
        avg_days_overdue = 0
        if overdue_invoices.exists():
            days_list = [(today - inv.due_date).days for inv in overdue_invoices if inv.due_date < today]
            avg_days_overdue = sum(days_list) / max(len(days_list), 1)

        # ── Utilization Risk ──────────────────────────────────────
        from servicing.models import UsageLog
        utilization_data = []
        for lease in active_leases:
            logs = UsageLog.objects.filter(
                asset=lease.asset,
                timestamp__gte=thirty_days_ago,
            ).aggregate(total_hours=Sum("hours_used"))
            hours = logs["total_hours"] or 0
            # Expected: 8h/day × 30 days baseline for heavy/industrial, 4h for others
            expected = 240 if lease.asset.category in ("heavy_equipment", "industrial") else 120
            utilization_pct = min(hours / expected * 100, 200)
            utilization_data.append({
                "asset_id": lease.asset.id,
                "asset_name": lease.asset.name,
                "category": lease.asset.category,
                "utilization_pct": round(utilization_pct, 1),
                "hours_30d": round(hours, 1),
                "risk": "under" if utilization_pct < 20 else ("over" if utilization_pct > 120 else "normal"),
            })

        under_utilized = [u for u in utilization_data if u["risk"] == "under"]
        over_utilized = [u for u in utilization_data if u["risk"] == "over"]

        # ── Concentration Risk ────────────────────────────────────
        lessee_exposure = defaultdict(float)
        for lease in active_leases:
            lessee_exposure[lease.lessee_id] += float(lease.monthly_base_fee)

        total_arr = sum(lessee_exposure.values()) or 1
        top_lessees_share = []
        for lessee_id, arr in sorted(lessee_exposure.items(), key=lambda x: -x[1])[:5]:
            try:
                lessee = LeaseContract.objects.filter(lessee_id=lessee_id).first().lessee
                name = lessee.company_name or lessee.username
            except Exception:
                name = str(lessee_id)
            top_lessees_share.append({
                "lessee": name,
                "monthly_arr": round(arr, 2),
                "share_pct": round(arr / total_arr * 100, 1),
            })

        # HHI (Herfindahl-Hirschman Index) — > 2500 = high concentration
        hhi = sum((arr / total_arr * 100) ** 2 for arr in lessee_exposure.values())

        category_exposure = defaultdict(float)
        for lease in active_leases:
            category_exposure[lease.asset.category] += float(lease.monthly_base_fee)
        category_shares = {
            cat: round(val / total_arr * 100, 1)
            for cat, val in category_exposure.items()
        }

        # ── Revenue at Risk ───────────────────────────────────────
        expiring_90d = [
            l for l in active_leases
            if 0 <= (l.end_date - today).days <= 90
        ]
        revenue_at_risk = sum(float(l.monthly_base_fee) for l in expiring_90d)
        defaulted_arr = sum(
            float(l.monthly_base_fee)
            for l in all_leases.filter(status="defaulted")
        )

        # ── Early Warning Signals ─────────────────────────────────
        signals = []        
        # Inject ML Driven Predictions insight
        try:
            from remarketing.views import _valuate_asset
            critical_assets = 0
            for l in active_leases:
                val = _valuate_asset(l.asset)
                if val.get("recommendation") == "REMARKET NOW":
                    critical_assets += 1
            if critical_assets > 0:
                signals.append({
                    "type": "ml_depreciation_risk",
                    "severity": "critical",
                    "message": f"AI Copilot identified {critical_assets} assets facing steep value depreciation. Liquidate to optimize portfolio retention.",
                })
        except Exception as e:
            pass
        if default_risk_rate > 0.15:
            signals.append({
                "type": "high_default_rate",
                "severity": "critical",
                "message": f"{default_risk_rate:.0%} of lessees have overdue invoices",
            })
        if hhi > 2500:
            signals.append({
                "type": "concentration_risk",
                "severity": "warning",
                "message": f"Portfolio HHI is {hhi:.0f} — high concentration in top lessees",
            })
        if len(under_utilized) > 3:
            signals.append({
                "type": "low_utilization",
                "severity": "warning",
                "message": f"{len(under_utilized)} assets under 20% utilization — review for early return",
            })
        if revenue_at_risk > total_arr * 0.30:
            signals.append({
                "type": "expiry_cliff",
                "severity": "warning",
                "message": f"${revenue_at_risk:,.0f}/mo expires in 90 days — {revenue_at_risk/total_arr:.0%} of ARR",
            })

        return Response({
            "default_risk": {
                "rate": round(default_risk_rate * 100, 1),
                "overdue_lessees": len(overdue_lessees),
                "total_lessees": total_lessees,
                "overdue_amount": float(overdue_total),
                "avg_days_overdue": round(avg_days_overdue, 1),
            },
            "utilization_risk": {
                "under_utilized_count": len(under_utilized),
                "over_utilized_count": len(over_utilized),
                "assets": utilization_data[:20],
            },
            "concentration_risk": {
                "hhi": round(hhi, 0),
                "hhi_label": "High" if hhi > 2500 else ("Moderate" if hhi > 1500 else "Low"),
                "top_lessees": top_lessees_share,
                "by_category": category_shares,
            },
            "revenue_at_risk": {
                "expiring_90d_count": len(expiring_90d),
                "expiring_90d_arr": round(revenue_at_risk, 2),
                "defaulted_arr": round(defaulted_arr, 2),
                "total_active_arr": round(total_arr, 2),
            },
            "early_warning_signals": signals,
        })


# ─── Feature 6: Contract Intelligence ────────────────────────

class ContractAnalysisView(APIView):
    """Return analysis result for a lease. Triggers async analysis if not yet done."""

    def get(self, request, pk):
        try:
            lease = LeaseContract.objects.get(pk=pk)
        except LeaseContract.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.user.role not in ("admin", "analyst") and lease.lessee != request.user:
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

        try:
            analysis = lease.contract_analysis
        except ContractAnalysis.DoesNotExist:
            analysis = None

        if not lease.document:
            return Response({"detail": "No document uploaded for this lease."}, status=status.HTTP_404_NOT_FOUND)

        if analysis is None:
            analysis = ContractAnalysis.objects.create(lease=lease, status="pending")
            _trigger_analysis(analysis.id)
        elif analysis.status == "failed":
            # Allow re-triggering
            analysis.status = "pending"
            analysis.error_message = ""
            analysis.save(update_fields=["status", "error_message"])
            _trigger_analysis(analysis.id)

        return Response(ContractAnalysisSerializer(analysis).data)

    def post(self, request, pk):
        """Manually re-trigger analysis."""
        try:
            lease = LeaseContract.objects.get(pk=pk)
        except LeaseContract.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.user.role != "admin":
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

        if not lease.document:
            return Response({"detail": "No document uploaded."}, status=status.HTTP_400_BAD_REQUEST)

        analysis, _ = ContractAnalysis.objects.get_or_create(lease=lease)
        analysis.status = "pending"
        analysis.save(update_fields=["status"])
        _trigger_analysis(analysis.id)

        return Response(ContractAnalysisSerializer(analysis).data)


def _trigger_analysis(analysis_id: int):
    try:
        from originations.tasks import analyze_contract_document
        analyze_contract_document.delay(analysis_id)
    except Exception:
        pass
