"""
AssetStream comprehensive demo data seeder.
Creates 3 years of realistic history: 20 assets, 30 leases (active/completed/defaulted),
usage logs, invoices, payments, tickets, audit trails, AI data — all with diverse dates.
"""
import random
from datetime import date, datetime, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import models
from django.utils import timezone

from accounts.models import CustomUser
from communications.models import InAppNotification
from originations.models import Asset, LeaseContract
from payments.models import DunningRule
from remarketing.ml.train import train_model
from servicing.models import Invoice, PricingRule, ServiceTicket, UsageLog
from workflows.models import ApprovalRequest

# ── Constants ─────────────────────────────────────────────────────────────────

TODAY = date(2026, 3, 15)
NOW = timezone.make_aware(datetime(2026, 3, 15, 10, 0, 0))
COMPANY_START = date(2023, 1, 10)   # AssetStream went live Jan 2023

ASSET_LOCATIONS = [
    (37.7749, -122.4194, "San Francisco, CA"),
    (34.0522, -118.2437, "Los Angeles, CA"),
    (41.8781, -87.6298,  "Chicago, IL"),
    (29.7604, -95.3698,  "Houston, TX"),
    (33.4484, -112.0740, "Phoenix, AZ"),
    (47.6062, -122.3321, "Seattle, WA"),
    (25.7617, -80.1918,  "Miami, FL"),
    (39.9526, -75.1652,  "Philadelphia, PA"),
    (35.2271, -80.8431,  "Charlotte, NC"),
    (30.2672, -97.7431,  "Austin, TX"),
    (44.9778, -93.2650,  "Minneapolis, MN"),
    (36.1627, -86.7816,  "Nashville, TN"),
    (39.7392, -104.9903, "Denver, CO"),
    (32.7767, -96.7970,  "Dallas, TX"),
    (42.3601, -71.0589,  "Boston, MA"),
    (45.5051, -122.6750, "Portland, OR"),
    (36.1699, -115.1398, "Las Vegas, NV"),
    (35.4676, -97.5164,  "Oklahoma City, OK"),
    (38.2527, -85.7585,  "Louisville, KY"),
    (43.0481, -76.1474,  "Syracuse, NY"),
]

ASSETS_DATA = [
    # Heavy Equipment
    {"name": "Caterpillar D9T Bulldozer",        "category": "heavy_equipment", "serial_number": "CAT-D9T-2021-001",  "manufacture_year": 2021, "base_monthly_rate": Decimal("8500.00"),  "per_hour_rate": Decimal("45.00"),  "status": "leased"},
    {"name": "Komatsu PC360 Excavator",           "category": "heavy_equipment", "serial_number": "KOM-PC360-2022-002","manufacture_year": 2022, "base_monthly_rate": Decimal("7800.00"),  "per_hour_rate": Decimal("40.00"),  "status": "leased"},
    {"name": "Volvo A45G Articulated Truck",       "category": "heavy_equipment", "serial_number": "VOL-A45G-2023-003", "manufacture_year": 2023, "base_monthly_rate": Decimal("6900.00"),  "per_hour_rate": Decimal("33.00"),  "status": "available"},
    {"name": "John Deere 870G Motor Grader",       "category": "heavy_equipment", "serial_number": "JD-870G-2020-004",  "manufacture_year": 2020, "base_monthly_rate": Decimal("5500.00"),  "per_hour_rate": Decimal("28.00"),  "status": "maintenance"},
    {"name": "Liebherr LTM 1100 Mobile Crane",     "category": "heavy_equipment", "serial_number": "LIE-LTM-2022-005",  "manufacture_year": 2022, "base_monthly_rate": Decimal("12000.00"), "per_hour_rate": Decimal("75.00"),  "status": "leased"},
    # Medical
    {"name": "Siemens MAGNETOM Vida MRI",          "category": "medical",         "serial_number": "SIE-MRI-2023-006",  "manufacture_year": 2023, "base_monthly_rate": Decimal("15000.00"), "per_hour_rate": Decimal("120.00"), "status": "leased"},
    {"name": "GE Revolution CT Scanner",           "category": "medical",         "serial_number": "GE-CT-2022-007",    "manufacture_year": 2022, "base_monthly_rate": Decimal("18000.00"), "per_hour_rate": Decimal("150.00"), "status": "leased"},
    {"name": "Philips Azurion Cath Lab System",    "category": "medical",         "serial_number": "PHI-AZ-2021-008",   "manufacture_year": 2021, "base_monthly_rate": Decimal("22000.00"), "per_hour_rate": Decimal("180.00"), "status": "available"},
    {"name": "Getinge FLOW-i Anesthesia",          "category": "medical",         "serial_number": "GET-FLW-2023-009",  "manufacture_year": 2023, "base_monthly_rate": Decimal("4800.00"),  "per_hour_rate": Decimal("30.00"),  "status": "leased"},
    {"name": "Varian TrueBeam Radiotherapy",       "category": "medical",         "serial_number": "VAR-TB-2022-010",   "manufacture_year": 2022, "base_monthly_rate": Decimal("28000.00"), "per_hour_rate": Decimal("200.00"), "status": "remarketed"},
    # Fleet
    {"name": "Freightliner Cascadia 126",          "category": "fleet",           "serial_number": "FLC-CAS-2022-011",  "manufacture_year": 2022, "base_monthly_rate": Decimal("3800.00"),  "per_hour_rate": Decimal("18.00"),  "status": "leased"},
    {"name": "Peterbilt 579 Ultra-Loft",           "category": "fleet",           "serial_number": "PTB-579-2023-012",  "manufacture_year": 2023, "base_monthly_rate": Decimal("4200.00"),  "per_hour_rate": Decimal("20.00"),  "status": "leased"},
    {"name": "Kenworth T680 Next Gen",             "category": "fleet",           "serial_number": "KWT-T680-2021-013", "manufacture_year": 2021, "base_monthly_rate": Decimal("3600.00"),  "per_hour_rate": Decimal("17.00"),  "status": "available"},
    {"name": "Mercedes-Benz Actros 1845",          "category": "fleet",           "serial_number": "MBZ-ACT-2023-014",  "manufacture_year": 2023, "base_monthly_rate": Decimal("4100.00"),  "per_hour_rate": Decimal("20.00"),  "status": "maintenance"},
    {"name": "Volvo FH16 750 Globetrotter",        "category": "fleet",           "serial_number": "VOL-FH16-2022-015", "manufacture_year": 2022, "base_monthly_rate": Decimal("3900.00"),  "per_hour_rate": Decimal("19.00"),  "status": "leased"},
    # Industrial
    {"name": "ABB IRB 6700 Industrial Robot",      "category": "industrial",      "serial_number": "ABB-IRB-2023-016",  "manufacture_year": 2023, "base_monthly_rate": Decimal("6500.00"),  "per_hour_rate": Decimal("35.00"),  "status": "leased"},
    {"name": "FANUC M-2000iA/1350 Robot",          "category": "industrial",      "serial_number": "FAN-M2K-2020-017",  "manufacture_year": 2020, "base_monthly_rate": Decimal("5800.00"),  "per_hour_rate": Decimal("30.00"),  "status": "leased"},
    {"name": "Siemens S7-1500 PLC System",         "category": "industrial",      "serial_number": "SIE-PLC-2022-018",  "manufacture_year": 2022, "base_monthly_rate": Decimal("3200.00"),  "per_hour_rate": Decimal("22.00"),  "status": "leased"},
    {"name": "KUKA KR 1000 Titan Robot",           "category": "industrial",      "serial_number": "KUK-KR1K-2021-019", "manufacture_year": 2021, "base_monthly_rate": Decimal("7200.00"),  "per_hour_rate": Decimal("40.00"),  "status": "available"},
    {"name": "Yaskawa Motoman GP400 Robot",        "category": "industrial",      "serial_number": "YAS-GP4-2023-020",  "manufacture_year": 2023, "base_monthly_rate": Decimal("5200.00"),  "per_hour_rate": Decimal("28.00"),  "status": "leased"},
]

CATEGORY_PROFILES = {
    "heavy_equipment": {"weekday": (3.0, 9.0),  "weekend": (0.0, 3.0),  "temp": (72.0, 90.0)},
    "medical":         {"weekday": (4.0, 12.0), "weekend": (2.0, 8.0),  "temp": (63.0, 76.0)},
    "fleet":           {"weekday": (6.0, 14.0), "weekend": (1.0, 5.0),  "temp": (68.0, 84.0)},
    "industrial":      {"weekday": (8.0, 20.0), "weekend": (0.0, 3.0),  "temp": (66.0, 80.0)},
}


def rand_date_between(start: date, end: date) -> date:
    delta = (end - start).days
    return start + timedelta(days=random.randint(0, max(delta, 0)))


def rand_ts_on_date(d: date) -> datetime:
    return timezone.make_aware(
        datetime(d.year, d.month, d.day, random.randint(6, 21), random.randint(0, 59))
    )


# ── Command ────────────────────────────────────────────────────────────────────

class Command(BaseCommand):
    help = "Seeds AssetStream with 3 years of rich, diversified demo data"

    def handle(self, *args, **options):
        self.stdout.write("Seeding AssetStream (3-year history)...\n")
        users = self._create_users()
        assets = self._create_assets()
        leases = self._create_leases(assets, users)
        self._create_usage_logs(leases, assets)
        self._create_invoices(leases)
        self._create_payment_records(leases, users)
        self._create_maintenance_logs(assets, users)
        self._create_service_tickets(assets, users)
        self._create_pricing_rules(users)
        self._create_approval_requests(leases, users)
        self._create_dunning_rules()
        self._create_notifications(users)
        self._create_audit_logs(assets, leases, users)
        self.stdout.write("  Training ML model...")
        train_model()
        self.stdout.write(self.style.SUCCESS("  ML model trained\n"))
        self._seed_ai_data(assets, leases)
        self._setup_celery_beat()
        self.stdout.write(self.style.SUCCESS("\nDemo data seeded successfully!"))
        self.stdout.write("  admin / Demo@1234  |  lessee / Demo@1234  |  analyst / Demo@1234")
        self.stdout.write("  lessee2 / Demo@1234  |  lessee3 / Demo@1234  |  lessee4 / Demo@1234")

    # ── Users ──────────────────────────────────────────────────────────────────

    def _create_users(self):
        self.stdout.write("  Creating users...")
        cfgs = [
            {"username": "admin",   "email": "admin@assetstream.io",            "first_name": "Alex",    "last_name": "Rivera",   "company_name": "AssetStream Inc.",             "role": "admin",    "phone_number": "+1 (415) 555-0100", "avatar_color": "#0dd6c2", "is_staff": True},
            {"username": "analyst", "email": "priya@assetstream.io",            "first_name": "Priya",   "last_name": "Sharma",   "company_name": "AssetStream Inc.",             "role": "analyst",  "phone_number": "+1 (415) 555-0188", "avatar_color": "#f59e0b"},
            {"username": "lessee",  "email": "james@pacificconstruction.com",   "first_name": "James",   "last_name": "Donovan",  "company_name": "Pacific Construction Co.",     "role": "lessee",   "phone_number": "+1 (310) 555-0142", "avatar_color": "#6366f1"},
            {"username": "lessee2", "email": "michael@meridianmedical.com",     "first_name": "Michael", "last_name": "Chen",     "company_name": "Meridian Medical Group",       "role": "lessee",   "phone_number": "+1 (213) 555-0212", "avatar_color": "#10b981"},
            {"username": "lessee3", "email": "sarah@texaslogistics.com",        "first_name": "Sarah",   "last_name": "Kowalski", "company_name": "Texas Logistics LLC",          "role": "lessee",   "phone_number": "+1 (713) 555-0350", "avatar_color": "#8b5cf6"},
            {"username": "lessee4", "email": "david@nwrobotics.com",            "first_name": "David",   "last_name": "Park",     "company_name": "Northwest Robotics Corp.",     "role": "lessee",   "phone_number": "+1 (206) 555-0440", "avatar_color": "#ef4444"},
        ]
        created = {}
        for cfg in cfgs:
            is_staff = cfg.pop("is_staff", False)
            user, _ = CustomUser.objects.get_or_create(username=cfg["username"], defaults={**cfg, "is_staff": is_staff})
            for k, v in cfg.items():
                if k != "username":
                    setattr(user, k, v)
            user.is_staff = is_staff
            user.set_password("Demo@1234")
            user.save()
            created[cfg["username"]] = user
        self.stdout.write(self.style.SUCCESS(f"  {len(created)} users ready\n"))
        return created

    # ── Assets ─────────────────────────────────────────────────────────────────

    def _create_assets(self):
        self.stdout.write("  Creating 20 assets...")
        assets = []
        for data in ASSETS_DATA:
            asset, _ = Asset.objects.get_or_create(serial_number=data["serial_number"], defaults=data)
            assets.append(asset)
        self.stdout.write(self.style.SUCCESS(f"  {len(assets)} assets ready\n"))
        return assets

    # ── Leases ─────────────────────────────────────────────────────────────────

    def _create_leases(self, assets, users):
        """
        Create 30 leases spanning Jan 2023–Mar 2026:
        - 12 active (ongoing)
        - 10 completed (ended cleanly)
        - 4 defaulted
        - 4 pending (not yet started)
        """
        self.stdout.write("  Creating lease history (30 leases, 3 years)...")

        lessee_map = {
            "heavy_equipment": [users["lessee"],  users["lessee3"]],
            "fleet":           [users["lessee3"], users["lessee"]],
            "medical":         [users["lessee2"], users["lessee2"]],
            "industrial":      [users["lessee4"], users["lessee"]],
        }

        lease_configs = [
            # Active leases — currently running
            {"asset_idx": 0,  "status": "active",    "start_offset_days": -720, "duration_months": 30, "lessee_key": "lessee"},
            {"asset_idx": 1,  "status": "active",    "start_offset_days": -540, "duration_months": 24, "lessee_key": "lessee3"},
            {"asset_idx": 4,  "status": "active",    "start_offset_days": -365, "duration_months": 18, "lessee_key": "lessee"},
            {"asset_idx": 5,  "status": "active",    "start_offset_days": -480, "duration_months": 36, "lessee_key": "lessee2"},
            {"asset_idx": 6,  "status": "active",    "start_offset_days": -300, "duration_months": 24, "lessee_key": "lessee2"},
            {"asset_idx": 8,  "status": "active",    "start_offset_days": -200, "duration_months": 18, "lessee_key": "lessee2"},
            {"asset_idx": 10, "status": "active",    "start_offset_days": -600, "duration_months": 36, "lessee_key": "lessee3"},
            {"asset_idx": 11, "status": "active",    "start_offset_days": -270, "duration_months": 24, "lessee_key": "lessee3"},
            {"asset_idx": 14, "status": "active",    "start_offset_days": -150, "duration_months": 18, "lessee_key": "lessee3"},
            {"asset_idx": 15, "status": "active",    "start_offset_days": -400, "duration_months": 30, "lessee_key": "lessee4"},
            {"asset_idx": 16, "status": "active",    "start_offset_days": -520, "duration_months": 24, "lessee_key": "lessee4"},
            {"asset_idx": 17, "status": "active",    "start_offset_days": -180, "duration_months": 36, "lessee_key": "lessee4"},
            # Completed leases — ended cleanly
            {"asset_idx": 2,  "status": "completed", "start_offset_days": -760, "duration_months": 12, "lessee_key": "lessee"},
            {"asset_idx": 2,  "status": "completed", "start_offset_days": -400, "duration_months": 12, "lessee_key": "lessee3"},
            {"asset_idx": 3,  "status": "completed", "start_offset_days": -730, "duration_months": 18, "lessee_key": "lessee"},
            {"asset_idx": 7,  "status": "completed", "start_offset_days": -680, "duration_months": 24, "lessee_key": "lessee2"},
            {"asset_idx": 9,  "status": "completed", "start_offset_days": -900, "duration_months": 24, "lessee_key": "lessee2"},
            {"asset_idx": 12, "status": "completed", "start_offset_days": -820, "duration_months": 18, "lessee_key": "lessee3"},
            {"asset_idx": 13, "status": "completed", "start_offset_days": -700, "duration_months": 12, "lessee_key": "lessee3"},
            {"asset_idx": 18, "status": "completed", "start_offset_days": -850, "duration_months": 12, "lessee_key": "lessee4"},
            {"asset_idx": 19, "status": "completed", "start_offset_days": -500, "duration_months": 12, "lessee_key": "lessee4"},
            {"asset_idx": 1,  "status": "completed", "start_offset_days": -900, "duration_months": 12, "lessee_key": "lessee"},
            # Defaulted leases
            {"asset_idx": 0,  "status": "defaulted", "start_offset_days": -800, "duration_months": 24, "lessee_key": "lessee3"},
            {"asset_idx": 6,  "status": "defaulted", "start_offset_days": -750, "duration_months": 18, "lessee_key": "lessee"},
            {"asset_idx": 10, "status": "defaulted", "start_offset_days": -860, "duration_months": 12, "lessee_key": "lessee3"},
            {"asset_idx": 17, "status": "defaulted", "start_offset_days": -700, "duration_months": 24, "lessee_key": "lessee4"},
            # Pending leases (starts in future)
            {"asset_idx": 2,  "status": "pending",   "start_offset_days": 10,   "duration_months": 18, "lessee_key": "lessee"},
            {"asset_idx": 7,  "status": "pending",   "start_offset_days": 20,   "duration_months": 24, "lessee_key": "lessee2"},
            {"asset_idx": 12, "status": "pending",   "start_offset_days": 5,    "duration_months": 12, "lessee_key": "lessee3"},
            {"asset_idx": 18, "status": "pending",   "start_offset_days": 15,   "duration_months": 18, "lessee_key": "lessee4"},
        ]

        leases = []
        for cfg in lease_configs:
            asset = assets[cfg["asset_idx"]]
            lessee = users[cfg["lessee_key"]]
            start = TODAY + timedelta(days=cfg["start_offset_days"])
            end   = start + timedelta(days=30 * cfg["duration_months"])
            rate_multiplier = random.uniform(0.95, 1.05)
            monthly_fee = round(asset.base_monthly_rate * Decimal(str(rate_multiplier)), 2)

            lease, created = LeaseContract.objects.get_or_create(
                asset=asset,
                status=cfg["status"],
                start_date=start,
                defaults={
                    "lessee": lessee,
                    "end_date": end,
                    "monthly_base_fee": monthly_fee,
                    "per_hour_rate": asset.per_hour_rate,
                },
            )
            leases.append(lease)

        active = [l for l in leases if l.status == "active"]
        self.stdout.write(self.style.SUCCESS(
            f"  {len(leases)} leases ({len(active)} active, "
            f"{sum(1 for l in leases if l.status=='completed')} completed, "
            f"{sum(1 for l in leases if l.status=='defaulted')} defaulted, "
            f"{sum(1 for l in leases if l.status=='pending')} pending)\n"
        ))
        return leases

    # ── Usage Logs (IoT) ───────────────────────────────────────────────────────

    def _create_usage_logs(self, leases, assets):
        """
        Generate realistic IoT telemetry for all active & completed leases.
        Covers each lease's active period (up to 18 months of history).
        """
        self.stdout.write("  Generating IoT telemetry (18 months of history)...")

        asset_loc = {a.serial_number: ASSET_LOCATIONS[i % len(ASSET_LOCATIONS)] for i, a in enumerate(assets)}
        total_created = 0

        for lease in leases:
            if lease.status in ("pending",):
                continue
            if UsageLog.objects.filter(lease=lease).count() > 100:
                continue

            asset = lease.asset
            profile = CATEGORY_PROFILES.get(asset.category, CATEGORY_PROFILES["fleet"])
            lat, lng, _ = asset_loc.get(asset.serial_number, (37.7749, -122.4194, ""))

            # Date window: from lease start or 18 months ago, whichever is later
            cutoff = TODAY - timedelta(days=548)  # 18 months
            window_start = max(lease.start_date, cutoff)
            window_end   = min(lease.end_date, TODAY) if lease.status != "active" else TODAY

            if window_start >= window_end:
                continue

            fuel_level = random.uniform(60.0, 95.0)
            total_hours = float(asset.total_hours_logged or 0)
            days = (window_end - window_start).days

            for day_offset in range(days, 0, -1):
                d = window_end - timedelta(days=day_offset)
                if d < lease.start_date:
                    continue
                is_weekend = d.weekday() >= 5

                # Fewer entries on weekends, more on weekdays
                if is_weekend:
                    h_min, h_max = profile["weekend"]
                    entries = random.randint(1, 2)
                else:
                    h_min, h_max = profile["weekday"]
                    entries = random.randint(2, 5)

                # Some days have no activity (holidays, downtime)
                if random.random() < 0.06:
                    continue

                temp_min, temp_max = profile["temp"]
                for _ in range(entries):
                    hours_used = round(random.uniform(h_min / entries, h_max / entries), 2)
                    total_hours += hours_used
                    degradation = (total_hours / 2000) * 0.4
                    age = max(0, d.year - asset.manufacture_year)
                    age_offset = min(age * 0.25, 4.0)
                    spike = random.uniform(0, 18) if random.random() < 0.07 else random.uniform(0, 5)
                    engine_temp = round(min(99.0, temp_min + (temp_max - temp_min) * random.random() + degradation + age_offset + spike), 1)

                    fuel_consumed = hours_used * random.uniform(1.2, 3.5) * (1 + total_hours / 15000 * 0.05)
                    fuel_refill = random.uniform(25, 60) if random.random() < 0.08 else 0
                    fuel_level = round(max(5.0, min(100.0, fuel_level - fuel_consumed + fuel_refill)), 1)

                    ts = timezone.make_aware(
                        datetime(d.year, d.month, d.day, random.randint(5, 22), random.randint(0, 59))
                    )
                    UsageLog.objects.create(
                        asset=asset, lease=lease,
                        timestamp=ts,
                        hours_used=hours_used,
                        latitude=round(lat + random.uniform(-0.1, 0.1), 6),
                        longitude=round(lng + random.uniform(-0.1, 0.1), 6),
                        engine_temp_celsius=engine_temp,
                        fuel_level_percent=fuel_level,
                    )
                    total_created += 1

            asset.total_hours_logged = round(total_hours, 2)
            asset.save(update_fields=["total_hours_logged"])

        self.stdout.write(self.style.SUCCESS(f"  {total_created} IoT log entries created\n"))

    # ── Invoices ───────────────────────────────────────────────────────────────

    def _create_invoices(self, leases):
        """
        Generate invoice history for every lease.
        Active leases: up to 24 billing periods back.
        Completed/defaulted: invoices for their full tenure.
        """
        self.stdout.write("  Creating invoice history (up to 3 years)...")
        created_count = 0

        for lease in leases:
            if lease.status == "pending":
                continue
            if Invoice.objects.filter(lease=lease).count() >= 5:
                continue

            # Figure out billing window
            bill_start = lease.start_date
            bill_end   = min(lease.end_date, TODAY) if lease.status != "active" else TODAY

            # Build 30-day periods
            cursor = bill_start
            period_num = 0
            total_periods = max(1, (bill_end - bill_start).days // 30)

            while cursor < bill_end:
                period_start = cursor
                period_end   = min(cursor + timedelta(days=30), bill_end)
                due_date     = period_end + timedelta(days=30)
                cursor       = period_end
                period_num  += 1

                if Invoice.objects.filter(lease=lease, billing_period_start=period_start).exists():
                    continue

                # Usage fee from logs
                logs_hours = UsageLog.objects.filter(
                    lease=lease,
                    timestamp__date__gte=period_start,
                    timestamp__date__lte=period_end,
                ).aggregate(total=models.Sum("hours_used"))["total"]
                if logs_hours is None:
                    logs_hours = random.uniform(60, 320)
                base_fee   = lease.monthly_base_fee
                usage_fee  = Decimal(str(round(float(logs_hours), 2))) * lease.per_hour_rate
                total_amount = base_fee + usage_fee

                # Status logic based on age
                periods_ago = total_periods - period_num
                if lease.status == "defaulted":
                    # Mix of overdue and a few paid early ones
                    if period_num <= 2:
                        inv_status = "paid"
                    elif period_num <= total_periods // 2:
                        inv_status = random.choice(["paid", "overdue"])
                    else:
                        inv_status = "overdue"
                elif lease.status == "completed":
                    inv_status = "paid"
                else:
                    # Active leases: old = paid, recent = mixed
                    if periods_ago >= 4:
                        inv_status = "paid"
                    elif periods_ago == 3:
                        inv_status = "paid"
                    elif periods_ago == 2:
                        inv_status = random.choice(["paid", "issued"])
                    elif periods_ago == 1:
                        inv_status = random.choice(["issued", "overdue"])
                    else:
                        inv_status = random.choice(["issued", "issued", "overdue"])

                issued_at = timezone.make_aware(datetime.combine(period_end, datetime.min.time()))
                Invoice.objects.create(
                    lease=lease,
                    billing_period_start=period_start,
                    billing_period_end=period_end,
                    base_fee=base_fee,
                    usage_fee=usage_fee,
                    total_amount=total_amount,
                    status=inv_status,
                    due_date=due_date,
                    issued_at=issued_at,
                )
                created_count += 1

        self.stdout.write(self.style.SUCCESS(f"  {created_count} invoices created\n"))

    # ── Payment Records ────────────────────────────────────────────────────────

    def _create_payment_records(self, leases, users):
        self.stdout.write("  Creating payment records...")
        from payments.models import PaymentRecord
        if PaymentRecord.objects.exists():
            self.stdout.write(self.style.WARNING("  Payment records exist, skipping\n"))
            return

        methods = ["bank_transfer", "ach", "wire", "card", "check"]
        gateway_refs = ["STRIPE", "PLAID", "WELLS_FARGO", "CHASE", "BOA", "SQUARE"]
        created = 0

        for inv in Invoice.objects.filter(status="paid").select_related("lease__lessee"):
            # Payment was made 1–10 days before due date (healthy) or up to 5 days after (late)
            days_delta = random.randint(-10, 5)
            paid_date  = inv.due_date + timedelta(days=days_delta) if inv.due_date else TODAY
            paid_date  = min(paid_date, TODAY)
            completed_at = timezone.make_aware(
                datetime(paid_date.year, paid_date.month, paid_date.day, random.randint(8, 18), random.randint(0, 59))
            )
            gateway = random.choice(gateway_refs)
            ref = f"{gateway}-{random.randint(10000000, 99999999)}"
            PaymentRecord.objects.create(
                invoice=inv,
                amount=inv.total_amount,
                payment_method=random.choice(methods),
                status="completed",
                external_ref=ref,
                initiated_by=inv.lease.lessee if inv.lease else users["admin"],
                notes=f"Payment for {inv.invoice_number} via {gateway}",
                completed_at=completed_at,
            )
            created += 1

        self.stdout.write(self.style.SUCCESS(f"  {created} payment records created\n"))

    # ── Maintenance Logs ───────────────────────────────────────────────────────

    def _create_maintenance_logs(self, assets, users):
        self.stdout.write("  Creating maintenance logs...")
        from servicing.models import MaintenanceLog  # noqa: local import
        if MaintenanceLog.objects.count() > 5:
            self.stdout.write(self.style.WARNING("  Maintenance logs exist, skipping\n"))
            return

        notes_templates = [
            ("Routine 500-hour inspection completed. Filters replaced, fluids topped up.", "low",      True),
            ("Hydraulic fluid leak detected and repaired. Seals replaced.",                "high",     True),
            ("Engine coolant system flushed. New thermostat installed.",                   "medium",   True),
            ("Brake pad replacement — all four axles. Rotors checked.",                   "high",     True),
            ("Annual safety certification inspection passed.",                             "low",      True),
            ("Fuel injector cleaning and calibration performed.",                          "medium",   True),
            ("Track tension adjusted and lubricated (heavy equipment).",                  "low",      True),
            ("Drive belt replacement after wear detected.",                               "medium",   True),
            ("GPS/IoT module firmware update and recalibration.",                         "low",      True),
            ("Oil and filter change — 250-hour interval.",                                "low",      True),
            ("Engine temperature spike investigation — thermostat replaced.",             "critical", True),
            ("Hydraulic pump failure. Emergency repair — pump replaced.",                 "critical", True),
            ("Scheduled 1000-hour major service completed.",                              "medium",   True),
            ("Tire rotation and pressure check on all wheels.",                           "low",      True),
            ("Fuel pump replacement due to intermittent power loss.",                     "high",     True),
            # Open/unresolved
            ("Unusual vibration in drive train — under investigation.",                   "high",     False),
            ("Engine oil consumption higher than spec — diagnostics needed.",             "medium",   False),
            ("Electrical fault codes logged — awaiting parts.",                          "critical", False),
        ]

        leased_assets = [a for a in assets if a.status in ("leased", "maintenance")]
        created = 0
        for i, (notes, priority, resolved) in enumerate(notes_templates):
            asset = leased_assets[i % len(leased_assets)]
            days_ago = random.randint(1, 700)
            log_date = TODAY - timedelta(days=days_ago)
            log = MaintenanceLog(
                asset=asset,
                logged_by=users["admin"],
                notes=notes,
                priority=priority,
                start_date=log_date,
                resolved=resolved,
            )
            if resolved:
                log.resolved_date = log_date + timedelta(days=random.randint(1, 14))
            log.save()
            created += 1

        self.stdout.write(self.style.SUCCESS(f"  {created} maintenance logs created\n"))

    # ── Service Tickets ────────────────────────────────────────────────────────

    def _create_service_tickets(self, assets, users):
        self.stdout.write("  Creating service tickets...")
        if ServiceTicket.objects.count() > 5:
            self.stdout.write(self.style.WARNING("  Service tickets exist, skipping\n"))
            return

        tickets = [
            # Open / In-progress
            {"title": "Hydraulic system pressure drop",      "category": "maintenance", "priority": "high",     "status": "open",          "description": "Hydraulic pressure reading 18% below threshold during operation at jobsite. Operator reports sluggish response in blade control. Requires immediate diagnostic inspection."},
            {"title": "Engine temperature spike — 96°C",     "category": "incident",    "priority": "critical", "status": "in_progress",   "description": "Engine temperature exceeded 96°C during afternoon shift on 2026-03-12. Operator triggered emergency cooldown. Unit sidelined pending inspection. Coolant system suspected."},
            {"title": "GPS/IoT module offline 72hrs",        "category": "software",    "priority": "medium",   "status": "escalated",     "description": "IoT GPS module has stopped transmitting position and telemetry data for 72 hours. Last known location: Houston, TX yard. Firmware update may be required."},
            {"title": "Brake pad wear — front axle",         "category": "maintenance", "priority": "high",     "status": "open",          "description": "Front brake pads at 12% remaining on Freightliner unit. Replacement parts on order. Asset still operational but flagged for monitoring."},
            {"title": "MRI coolant system noise",            "category": "maintenance", "priority": "high",     "status": "in_progress",   "description": "Unusual noise from helium cooling system on Siemens MAGNETOM Vida MRI. OEM service engineer scheduled for 2026-03-18. Unit remains in service at reduced load."},
            {"title": "PLC firmware upgrade required",       "category": "software",    "priority": "medium",   "status": "open",          "description": "Siemens S7-1500 PLC requires firmware patch v3.1.2 to address a known memory leak under high-cycle operations. Downtime window needed: 4 hours."},
            {"title": "Scheduled 1000hr inspection due",     "category": "inspection",  "priority": "low",      "status": "pending_parts", "description": "Caterpillar D9T has reached 1,000 operating hours. Comprehensive inspection required per OEM maintenance schedule. Parts ordered; ETA 5 business days."},
            {"title": "Fuel sensor reading incorrect",       "category": "software",    "priority": "medium",   "status": "open",          "description": "Komatsu PC360 fuel level sensor showing 40% despite physical tank level at 75%. Recalibration required. Possible water ingress in sensor housing."},
            # Resolved tickets (historical)
            {"title": "Drive belt replacement",              "category": "maintenance", "priority": "medium",   "status": "resolved",      "description": "Worn drive belt detected during routine inspection on Volvo FH16. Replaced with OEM part. Asset returned to service within 6 hours.",                  "resolved_days_ago": 14, "resolution": "Drive belt replaced with genuine Volvo part (P/N 20702789). Unit tested and returned to service 2026-03-01."},
            {"title": "Emergency hydraulic pump failure",   "category": "incident",    "priority": "critical", "status": "resolved",      "description": "Hydraulic pump failed mid-operation on Liebherr crane. Emergency mobilization of service team. Asset grounded for 3 days.",                                 "resolved_days_ago": 30, "resolution": "Hydraulic pump replaced. Root cause: contaminated fluid. Full system flush performed. Fluid quality monitoring increased."},
            {"title": "Annual safety certification",        "category": "inspection",  "priority": "low",      "status": "resolved",      "description": "Annual safety inspection and certification for Peterbilt 579 fleet vehicle as required by DOT regulations.",                                               "resolved_days_ago": 60, "resolution": "All safety checks passed. DOT certification renewed. Next inspection due 2027-01-15."},
            {"title": "Oil consumption anomaly",            "category": "maintenance", "priority": "high",     "status": "resolved",      "description": "ABB IRB 6700 robot consuming gear oil at 3x normal rate. Suspected seal failure.",                                                                         "resolved_days_ago": 45, "resolution": "Wrist joint seals replaced. Oil consumption returned to normal. 90-day monitoring period commenced."},
            {"title": "CT scanner calibration drift",       "category": "inspection",  "priority": "medium",   "status": "resolved",      "description": "GE Revolution CT scanner image quality review flagged calibration drift in X-ray detector array. OEM remote diagnostic confirmed.",                    "resolved_days_ago": 90, "resolution": "OEM engineer performed detector calibration via remote session. Image QA test passed. Unit recertified."},
            {"title": "Refrigeration unit fault — fleet",  "category": "maintenance", "priority": "high",     "status": "resolved",      "description": "Kenworth T680 auxiliary refrigeration unit throwing fault code E-314. Compressor overheating.",                                                            "resolved_days_ago": 120,"resolution": "Refrigerant recharged and compressor belt replaced. Fault cleared. Unit returned to cold-chain service."},
            {"title": "KUKA robot joint calibration",      "category": "inspection",  "priority": "low",      "status": "resolved",      "description": "Scheduled joint calibration for KUKA KR 1000 Titan. Performed as part of 6-month service agreement.",                                                   "resolved_days_ago": 180,"resolution": "All 6 joints recalibrated per KUKA service manual. Positional accuracy within ±0.05mm specification."},
        ]

        leased_assets = [a for a in assets if a.status in ("leased", "maintenance", "available")]
        created = 0
        for i, td in enumerate(tickets):
            asset = leased_assets[i % len(leased_assets)]
            resolved_days = td.pop("resolved_days_ago", None)
            resolution    = td.pop("resolution", "")
            t = ServiceTicket(
                asset=asset,
                reported_by=random.choice([users["lessee"], users["lessee2"], users["lessee3"]]),
                **td,
            )
            if td["status"] in ("in_progress", "escalated"):
                t.assigned_to = users["analyst"]
            t.save()
            if td["status"] == "resolved" and resolved_days:
                t.resolution_notes = resolution
                t.resolved_at = timezone.make_aware(
                    datetime.combine(TODAY - timedelta(days=resolved_days), datetime.min.time())
                )
                ServiceTicket.objects.filter(pk=t.pk).update(
                    resolution_notes=t.resolution_notes,
                    resolved_at=t.resolved_at,
                )
            created += 1

        self.stdout.write(self.style.SUCCESS(f"  {created} service tickets created\n"))

    # ── Pricing Rules ──────────────────────────────────────────────────────────

    def _create_pricing_rules(self, users):
        self.stdout.write("  Creating pricing rules...")
        if PricingRule.objects.exists():
            self.stdout.write(self.style.WARNING("  Pricing rules exist, skipping\n"))
            return
        rules = [
            {"name": "Q4 Peak Season Surcharge",         "rule_type": "seasonal",          "asset_category": "",              "description": "15% surcharge during Q4 peak construction and medical device demand months (Oct–Dec).",                                "params": {"months": [10, 11, 12], "multiplier": 1.15},                                                                          "active": True},
            {"name": "Heavy Equipment Utilization Tiers","rule_type": "utilization_tier",  "asset_category": "heavy_equipment","description": "Tiered per-hour billing for heavy equipment: standard up to 100hrs, discounted 100-200hrs, bulk rate above 200hrs.", "params": {"tiers": [{"min": 0, "max": 100, "rate_per_hour": 45}, {"min": 100, "max": 200, "rate_per_hour": 38}, {"min": 200, "max": 9999, "rate_per_hour": 30}]}, "active": True},
            {"name": "Long-Term Lease Discount",         "rule_type": "volume_discount",   "asset_category": "",              "description": "10% discount on base rate for leases of 18+ months. Encourages longer commitments and improves revenue predictability.", "params": {"min_lease_months": 18, "discount_percent": 10.0},                                                                   "active": True},
            {"name": "Multi-Asset Portfolio Discount",   "rule_type": "volume_discount",   "asset_category": "",              "description": "8% discount applied when a lessee has 3 or more simultaneous active leases. Rewards high-value portfolio clients.",       "params": {"min_active_leases": 3, "discount_percent": 8.0},                                                                     "active": True},
            {"name": "Late Payment Penalty",             "rule_type": "penalty",           "asset_category": "",              "description": "5% penalty fee added to invoices outstanding beyond 30 days. Provides financial incentive for on-time payment.",          "params": {"days_overdue_threshold": 30, "penalty_percent": 5.0},                                                                "active": True},
            {"name": "Medical Equipment Premium",        "rule_type": "utilization_tier",  "asset_category": "medical",       "description": "Premium rate tiers for medical equipment reflecting higher maintenance and compliance costs.",                            "params": {"tiers": [{"min": 0, "max": 80, "rate_per_hour": 150}, {"min": 80, "max": 200, "rate_per_hour": 130}, {"min": 200, "max": 9999, "rate_per_hour": 110}]}, "active": True},
            {"name": "Grace Period Policy",              "rule_type": "grace_period",      "asset_category": "",              "description": "5-business-day grace period before late fees are applied. Accommodates processing delays and banking holidays.",            "params": {"days": 5},                                                                                                          "active": True},
            {"name": "Industrial Night-Shift Discount",  "rule_type": "seasonal",          "asset_category": "industrial",    "description": "12% discount on per-hour rates for industrial equipment used between 22:00–06:00 hours (night-shift operations).",       "params": {"hours_start": 22, "hours_end": 6, "multiplier": 0.88},                                                              "active": False},
        ]
        for r in rules:
            PricingRule.objects.create(created_by=users["admin"], **r)
        self.stdout.write(self.style.SUCCESS(f"  {len(rules)} pricing rules created\n"))

    # ── Approval Requests ──────────────────────────────────────────────────────

    def _create_approval_requests(self, leases, users):
        self.stdout.write("  Creating approval requests...")
        if ApprovalRequest.objects.exists():
            self.stdout.write(self.style.WARNING("  Approval requests exist, skipping\n"))
            return

        active_leases = [l for l in leases if l.status == "active"]
        l0 = active_leases[0] if active_leases else None
        l1 = active_leases[1] if len(active_leases) > 1 else l0
        l2 = active_leases[2] if len(active_leases) > 2 else l0

        requests_data = [
            {"request_type": "lease_renew",    "priority": "high",   "status": "pending",  "requester_notes": f"Requesting 18-month renewal for {l0.asset.name if l0 else 'asset'}. Our expansion project has been extended and we need continued access to this equipment.", "resource_type": "lease", "resource_id": l0.id if l0 else None, "payload": {"duration_months": 18}},
            {"request_type": "lease_discount", "priority": "medium", "status": "pending",  "requester_notes": f"Pacific Construction is committing to 4 assets simultaneously. Requesting 8% portfolio discount effective next billing cycle.", "resource_type": "lease", "resource_id": l1.id if l1 else None, "payload": {"discount_percent": 8}},
            {"request_type": "write_off",      "priority": "urgent", "status": "pending",  "requester_notes": "Invoice overdue 95 days. Client (lessee3) filed for Chapter 11. Legal confirms recovery unlikely. Recommend write-off.", "resource_type": "invoice", "resource_id": None, "payload": {"reason": "client_insolvency", "amount": "24500.00"}},
            {"request_type": "lease_renew",    "priority": "medium", "status": "pending",  "requester_notes": f"Northwest Robotics requesting 12-month renewal extension for {l2.asset.name if l2 else 'robot unit'}. Production line depends on this asset.", "resource_type": "lease", "resource_id": l2.id if l2 else None, "payload": {"duration_months": 12}},
            {"request_type": "lease_terminate","priority": "low",    "status": "approved", "requester_notes": "Client requests early termination of Kenworth T680 fleet lease. Business restructuring — fleet being reduced.", "reviewer_notes": "Approved. Early termination fee of $4,200 collected. Asset returned in good condition on 2026-01-30.", "resource_type": "lease", "resource_id": l0.id if l0 else None, "payload": {}},
            {"request_type": "asset_disposal", "priority": "medium", "status": "rejected", "requester_notes": "Varian TrueBeam radiotherapy unit proposed for disposal — refurbishment cost estimated at $85,000 exceeds recovery potential.", "reviewer_notes": "Rejected. AI remarketing analysis shows $320,000 resale value. Engage specialized medical remarketer before disposal decision.", "resource_type": "asset", "resource_id": 10, "payload": {"reason": "end_of_life"}},
            {"request_type": "lease_discount", "priority": "low",    "status": "approved", "requester_notes": "Meridian Medical Group has been a client for 2+ years with zero late payments. Requesting loyalty discount of 5%.", "reviewer_notes": "Approved. 5% loyalty discount applied from 2026-01-01. Client notified.", "resource_type": "lease", "resource_id": l1.id if l1 else None, "payload": {"discount_percent": 5}},
            {"request_type": "write_off",      "priority": "high",   "status": "rejected", "requester_notes": "Requesting write-off of $8,400 for fleet lease. Client disputing usage charges from October.", "reviewer_notes": "Rejected. IoT data confirms usage hours. Dispute team to follow up with supporting telemetry report.", "resource_type": "invoice", "resource_id": None, "payload": {"reason": "disputed_charges"}},
        ]

        for rd in requests_data:
            reviewer_notes = rd.pop("reviewer_notes", "")
            req = ApprovalRequest(requested_by=users["lessee"], **rd)
            if rd["status"] in ("approved", "rejected"):
                req.reviewed_by = users["admin"]
                req.reviewed_at = timezone.make_aware(
                    datetime.combine(TODAY - timedelta(days=random.randint(5, 60)), datetime.min.time())
                )
                req.reviewer_notes = reviewer_notes
            req.save()

        self.stdout.write(self.style.SUCCESS(f"  {len(requests_data)} approval requests created\n"))

    # ── Dunning Rules ──────────────────────────────────────────────────────────

    def _create_dunning_rules(self):
        self.stdout.write("  Creating dunning rules...")
        if DunningRule.objects.exists():
            self.stdout.write(self.style.WARNING("  Dunning rules exist, skipping\n"))
            return
        rules = [
            {"name": "Day 1 Courtesy Reminder",   "days_overdue": 1,  "action": "email",   "order": 1, "active": True,  "message_template": "Hi {lessee_name}, your invoice {invoice_number} for ${amount} was due on {due_date}. Please arrange payment at your earliest convenience."},
            {"name": "Day 7 Follow-Up",            "days_overdue": 7,  "action": "email",   "order": 2, "active": True,  "message_template": "REMINDER: Invoice {invoice_number} is now 7 days overdue. Please contact your account manager immediately to avoid service suspension."},
            {"name": "Day 14 SMS Alert",           "days_overdue": 14, "action": "sms",     "order": 3, "active": True,  "message_template": "AssetStream: Invoice {invoice_number} (${amount}) is 14 days overdue. Call +1-800-ASSET-1 urgently."},
            {"name": "Day 30 Collections Flag",    "days_overdue": 30, "action": "flag",    "order": 4, "active": True,  "message_template": "Account flagged for collections review. Invoice {invoice_number} outstanding ${amount} (30+ days)."},
            {"name": "Day 45 Service Suspension",  "days_overdue": 45, "action": "suspend", "order": 5, "active": False, "message_template": "Service access suspended pending payment of invoice {invoice_number} (${amount})."},
            {"name": "Day 60 Legal Notice",        "days_overdue": 60, "action": "email",   "order": 6, "active": True,  "message_template": "FINAL NOTICE: Invoice {invoice_number} is 60 days overdue. Legal proceedings will commence within 10 business days if payment is not received."},
        ]
        for r in rules:
            DunningRule.objects.create(**r)
        self.stdout.write(self.style.SUCCESS(f"  {len(rules)} dunning rules created\n"))

    # ── Notifications ──────────────────────────────────────────────────────────

    def _create_notifications(self, users):
        self.stdout.write("  Creating in-app notifications...")
        if InAppNotification.objects.count() > 3:
            self.stdout.write(self.style.WARNING("  Notifications exist, skipping\n"))
            return
        notifs = [
            {"user": users["admin"],   "title": "Portfolio AI Scan Complete",          "body": "Daily AI portfolio scan complete. 2 new high-risk leases identified. 1 asset flagged for critical maintenance. Review AI Insights.",                                  "notification_type": "ai.scan_complete",      "severity": "info"},
            {"user": users["admin"],   "title": "SLA Breach — Critical Ticket",        "body": "TKT-000002 (Engine temperature spike — 96°C) has breached its 4-hour SLA. Escalated to senior engineer. Immediate action required.",                                "notification_type": "ticket.sla_breach",     "severity": "error"},
            {"user": users["admin"],   "title": "New Approval Request",                "body": "James Donovan (Pacific Construction) submitted a lease renewal request for Caterpillar D9T Bulldozer. 18-month extension requested.",                                 "notification_type": "approval.created",      "severity": "info"},
            {"user": users["lessee"],  "title": "Invoice Overdue — Action Required",   "body": "Invoice INV-000048 for $18,240.50 is 12 days overdue. Please arrange payment to avoid service suspension.",                                                          "notification_type": "invoice.overdue",       "severity": "warning"},
            {"user": users["lessee2"], "title": "Lease Expiring in 45 Days",           "body": "Your lease contract for GE Revolution CT Scanner expires on 2026-04-29. Contact your account manager to discuss renewal options.",                                   "notification_type": "lease.expiring",        "severity": "warning"},
            {"user": users["analyst"], "title": "Anomaly Detected — Invoice Spike",    "body": "Invoice anomaly scan detected an unusual billing spike on 3 invoices for Texas Logistics LLC. Review in AI Anomaly Detection.",                                      "notification_type": "anomaly.detected",      "severity": "error"},
            {"user": users["admin"],   "title": "Monthly Reconciliation Ready",        "body": "February 2026 financial reconciliation report is available. Total billed: $284,500. Collected: $261,340. Collection rate: 91.9%.",                                   "notification_type": "reconciliation.complete","severity": "success"},
            {"user": users["lessee3"], "title": "Payment Receipt Confirmed",           "body": "Payment of $14,620.00 for invoice INV-000071 has been confirmed. Reference: WIRE-88423691. Thank you for your prompt payment.",                                      "notification_type": "payment.confirmed",     "severity": "success"},
            {"user": users["admin"],   "title": "Asset Remarketing Opportunity",       "body": "AI recommends remarketing Varian TrueBeam Radiotherapy unit. Estimated resale value $320,000. Current market demand high. Review Remarketing Engine.",               "notification_type": "remarketing.opportunity","severity": "info"},
            {"user": users["lessee4"], "title": "Maintenance Alert — ABB Robot",       "body": "Predictive AI flagged ABB IRB 6700 (Industrial) as high maintenance risk. Schedule inspection within 14 days to avoid unplanned downtime.",                          "notification_type": "maintenance.alert",     "severity": "warning"},
        ]
        for nd in notifs:
            InAppNotification.objects.create(**nd)
        self.stdout.write(self.style.SUCCESS(f"  {len(notifs)} notifications created\n"))

    # ── Audit Logs ─────────────────────────────────────────────────────────────

    def _create_audit_logs(self, assets, leases, users):
        self.stdout.write("  Creating audit logs (3-year history, 120+ entries)...")
        from accounts.models import AuditLog
        if AuditLog.objects.count() > 20:
            self.stdout.write(self.style.WARNING("  Audit logs exist, skipping\n"))
            return

        ips = ["192.168.1.42", "10.0.0.15", "172.16.0.8", "192.168.2.100", "10.0.0.22",
               "203.0.113.45", "198.51.100.12", "10.10.0.50", "172.20.0.33", "192.168.10.5"]
        agents = [
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/537.36 Chrome/120.0.6099.234 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121.0.6167.160 Safari/537.36",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/119.0.6045.199 Safari/537.36",
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1",
            "AssetStream-Mobile/2.4.1 iOS/17.2",
        ]

        templates = [
            # Auth
            ("user.login",           "user",     "User {user} logged in from {ip}",                                           "admin"),
            ("user.login",           "user",     "User {user} authenticated via mobile app",                                  "lessee"),
            ("user.login",           "user",     "User {user} logged in",                                                     "analyst"),
            ("user.login",           "user",     "User {user} logged in from {ip}",                                           "lessee2"),
            ("user.login",           "user",     "User {user} logged in from {ip}",                                           "lessee3"),
            ("user.login",           "user",     "User {user} authenticated from mobile",                                     "lessee4"),
            ("user.logout",          "user",     "User {user} logged out",                                                    "admin"),
            ("user.profile_update",  "user",     "Profile updated: phone number and company address",                         "lessee"),
            ("user.password_change", "user",     "Password changed successfully",                                             "analyst"),
            ("user.2fa_enabled",     "user",     "Two-factor authentication enabled",                                         "admin"),
            # Asset actions
            ("asset.view",           "asset",    "Viewed asset details: {asset}",                                             "analyst"),
            ("asset.view",           "asset",    "Viewed asset details: {asset}",                                             "lessee"),
            ("asset.update",         "asset",    "Asset {asset} status updated to leased",                                   "admin"),
            ("asset.update",         "asset",    "Asset {asset} notes and location updated",                                  "admin"),
            ("asset.create",         "asset",    "New asset {asset} added to fleet",                                          "admin"),
            ("asset.export",         "asset",    "Asset portfolio CSV export generated (20 assets)",                          "analyst"),
            # Lease actions
            ("lease.create",         "lease",    "Lease contract {contract} created for {asset}",                            "admin"),
            ("lease.create",         "lease",    "Lease {contract} created — 24-month term",                                  "admin"),
            ("lease.view",           "lease",    "Viewed lease contract {contract}",                                          "analyst"),
            ("lease.view",           "lease",    "Lessee viewed lease details: {contract}",                                   "lessee"),
            ("lease.renew",          "lease",    "Lease {contract} renewed for 18 months",                                    "admin"),
            ("lease.terminate",      "lease",    "Lease {contract} terminated early. Termination fee collected.",             "admin"),
            ("lease.document_upload","lease",    "Signed contract document uploaded for {contract}",                          "lessee"),
            ("lease.export",         "lease",    "Lease contracts CSV export generated",                                      "analyst"),
            # Invoice actions
            ("invoice.issued",       "invoice",  "Invoice {inv_num} issued for billing period. Amount: ${amount}",           "admin"),
            ("invoice.paid",         "invoice",  "Invoice {inv_num} marked as paid. Amount: ${amount}",                      "admin"),
            ("invoice.paid",         "invoice",  "Payment received for invoice {inv_num}. Ref: TXN-{txn}",                   "lessee"),
            ("invoice.paid",         "invoice",  "Invoice {inv_num} payment processed via ACH",                              "lessee2"),
            ("invoice.overdue",      "invoice",  "Invoice {inv_num} flagged as overdue. Days past due: 12",                  "admin"),
            ("invoice.overdue",      "invoice",  "Invoice {inv_num} escalated to collections after 30 days overdue",         "analyst"),
            ("invoice.export",       "invoice",  "Invoice CSV export generated (47 invoices)",                               "analyst"),
            # Payment actions
            ("payment.completed",    "payment",  "Payment TXN-{txn} completed successfully. Method: bank_transfer",          "admin"),
            ("payment.completed",    "payment",  "Payment TXN-{txn} completed via ACH. Cleared T+1",                         "lessee3"),
            ("payment.failed",       "payment",  "Payment TXN-{txn} failed — insufficient funds. Retry scheduled.",          "admin"),
            ("payment.refund",       "payment",  "Partial refund of $1,200 issued for disputed usage charges",               "admin"),
            # AI & system
            ("risk.refresh",         "risk",     "AI risk scores refreshed for all active leases (12 leases scored)",        "admin"),
            ("risk.refresh",         "risk",     "AI risk score refresh triggered by scheduled job",                         "analyst"),
            ("anomaly.scan",         "anomaly",  "Invoice anomaly detection scan completed. 4 new alerts generated.",         "admin"),
            ("anomaly.resolve",      "anomaly",  "Anomaly alert resolved — false positive confirmed",                         "analyst"),
            ("maintenance.predict",  "maintenance","Maintenance AI predictions refreshed for all assets",                    "analyst"),
            ("remarketing.refresh",  "remarketing","Remarketing recommendations computed for 20 assets",                    "admin"),
            ("billing.trigger",      "billing",  "Manual billing cycle triggered by admin",                                  "admin"),
            ("billing.trigger",      "billing",  "Scheduled billing cycle executed — 12 invoices generated",                 "admin"),
            ("iot.trigger",          "iot",      "IoT telemetry ping triggered for all 12 active leases",                    "admin"),
            ("report.generate",      "report",   "Monthly financial report generated for February 2026",                     "analyst"),
            ("report.generate",      "report",   "Portfolio health report generated — Q4 2025",                              "analyst"),
            ("report.export",        "report",   "Audit log export generated (90 days)",                                     "admin"),
            # Tickets
            ("ticket.create",        "ticket",   "Service ticket created: Engine temperature spike",                         "lessee"),
            ("ticket.create",        "ticket",   "Service ticket submitted: GPS module offline",                             "lessee3"),
            ("ticket.resolve",       "ticket",   "Ticket resolved: Drive belt replacement completed",                        "analyst"),
            ("ticket.escalate",      "ticket",   "Ticket escalated to senior engineer: Hydraulic pump failure",              "admin"),
            # Settings
            ("settings.update",      "settings", "Pricing rule 'Late Payment Penalty' updated: threshold changed 25→30 days","admin"),
            ("settings.update",      "settings", "Dunning rule 'Day 45 Service Suspension' deactivated",                    "admin"),
            ("webhook.test",         "webhook",  "Webhook endpoint POST /api/webhooks/billing tested — 200 OK",              "admin"),
            ("approval.create",      "approval", "Approval request submitted: lease renewal (18 months)",                   "lessee"),
            ("approval.approve",     "approval", "Approval request approved: loyalty discount 5% granted",                  "admin"),
            ("approval.reject",      "approval", "Approval request rejected: asset disposal — ML value $320k",              "admin"),
        ]

        invoices_sample = list(Invoice.objects.all()[:15])
        active_leases   = [l for l in leases if l.status in ("active", "completed")]

        created = 0
        for i, (action, res_type, desc_tpl, user_key) in enumerate(templates):
            # Spread logs across 3 years
            days_ago = random.randint(0, 1095)
            ts = NOW - timedelta(days=days_ago, hours=random.randint(0, 23), minutes=random.randint(0, 59))
            user = users.get(user_key, users["admin"])
            desc = desc_tpl
            resource_id = None
            metadata = {}

            if "{contract}" in desc and active_leases:
                lease = random.choice(active_leases)
                desc = desc.replace("{contract}", lease.contract_number)
                desc = desc.replace("{asset}", lease.asset.name)
                resource_id = lease.id
                metadata = {"contract_number": lease.contract_number}
            elif "{asset}" in desc and assets:
                asset = random.choice(assets)
                desc = desc.replace("{asset}", asset.name)
                resource_id = asset.id
                metadata = {"asset_name": asset.name, "category": asset.category}
            elif "{inv_num}" in desc and invoices_sample:
                inv = random.choice(invoices_sample)
                desc = desc.replace("{inv_num}", inv.invoice_number).replace("{amount}", f"{inv.total_amount:.2f}")
                resource_id = inv.id
                metadata = {"invoice_number": inv.invoice_number, "amount": str(inv.total_amount)}
            elif "{txn}" in desc:
                txn = str(random.randint(10000000, 99999999))
                desc = desc.replace("{txn}", txn)
                metadata = {"transaction_ref": f"TXN-{txn}"}

            desc = desc.replace("{user}", user.username).replace("{ip}", random.choice(ips))

            log = AuditLog.objects.create(
                user=user, action=action, resource_type=res_type, resource_id=resource_id,
                description=desc, ip_address=random.choice(ips), user_agent=random.choice(agents),
                metadata=metadata,
            )
            AuditLog.objects.filter(pk=log.pk).update(timestamp=ts)
            created += 1

        self.stdout.write(self.style.SUCCESS(f"  {created} audit log entries created (spanning 3 years)\n"))

    # ── AI Data ────────────────────────────────────────────────────────────────

    def _seed_ai_data(self, assets, leases):
        self.stdout.write("  Running AI engines to populate data...")

        # Risk Scores
        try:
            from ai_engine.models import RiskScore
            from ai_engine.ml.risk_scorer import score_all_active_leases
            if not RiskScore.objects.exists():
                results = score_all_active_leases()
                for lease, result in results:
                    RiskScore.objects.update_or_create(
                        lease=lease,
                        defaults={"probability": result["probability"], "risk_band": result["risk_band"], "top_drivers": result["top_drivers"]},
                    )
                self.stdout.write(self.style.SUCCESS(f"    {len(results)} risk scores generated"))
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"    Risk scoring skipped: {e}"))

        # Ensure diverse risk bands
        try:
            risk_scores = list(RiskScore.objects.all())
            diversity = [
                ("low",      0.08, [{"factor": "Consistent on-time payments (24 months)", "key": "payment_history",  "impact": -0.6, "direction": "decrease", "value": 0}]),
                ("low",      0.14, [{"factor": "Long-term stable lessee",                  "key": "lease_age_months", "impact": -0.4, "direction": "decrease", "value": 24}]),
                ("medium",   0.31, [{"factor": "Slight utilization drop last quarter",     "key": "utilization_change","impact": 0.25,"direction": "increase", "value": -12.4}]),
                ("medium",   0.42, [{"factor": "One overdue invoice in past 6 months",     "key": "overdue_count",    "impact": 0.35, "direction": "increase", "value": 1}]),
                ("medium",   0.48, [{"factor": "Lease approaching end date (60 days)",     "key": "days_to_expiry",   "impact": 0.3,  "direction": "increase", "value": 60}]),
                ("high",     0.64, [{"factor": "Two invoices overdue 30+ days",            "key": "overdue_count",    "impact": 0.6,  "direction": "increase", "value": 2}]),
                ("high",     0.72, [{"factor": "Declining usage trend — 3 months",        "key": "utilization_change","impact": 0.55,"direction": "increase", "value": -28.7}]),
                ("critical", 0.84, [{"factor": "3 overdue invoices, collections flagged",  "key": "overdue_count",    "impact": 0.85, "direction": "increase", "value": 3}]),
                ("critical", 0.91, [{"factor": "Payment delinquency 45+ days",            "key": "days_overdue",     "impact": 0.9,  "direction": "increase", "value": 47}]),
            ]
            for i, rs in enumerate(risk_scores):
                if i >= len(diversity):
                    break
                band, prob, drivers = diversity[i]
                rs.probability = prob
                rs.risk_band = band
                rs.top_drivers = drivers
                rs.save()
        except Exception:
            pass

        # Maintenance Predictions
        try:
            from ai_engine.models import MaintenancePrediction
            from ai_engine.ml.maintenance_predictor import predict_all_assets
            if not MaintenancePrediction.objects.exists():
                results = predict_all_assets()
                for asset, result in results:
                    MaintenancePrediction.objects.update_or_create(
                        asset=asset,
                        defaults={"failure_probability": result["failure_probability"], "days_to_predicted_failure": result["days_to_predicted_failure"], "risk_level": result["risk_level"], "top_signals": result["top_signals"], "recommendation": result["recommendation"]},
                    )
                self.stdout.write(self.style.SUCCESS(f"    {len(results)} maintenance predictions generated"))
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"    Maintenance prediction skipped: {e}"))

        # Diverse maintenance risk levels
        try:
            preds = list(MaintenancePrediction.objects.all())
            diversity = [
                ("safe",     0.06, None, "Operating within normal parameters. Schedule routine 90-day check.",                                                                  [{"signal": "Operating Hours",    "value": "1,240 hrs",    "weight": 0.1}]),
                ("safe",     0.11, None, "All sensor readings nominal. No action required for 60 days.",                                                                         [{"signal": "Engine Temp Trend",  "value": "Stable",       "weight": 0.08}]),
                ("safe",     0.18, None, "Minor wear indicators. Monitor at next 500-hour service.",                                                                             [{"signal": "Fuel Consumption",   "value": "+2.1% trend",  "weight": 0.12}]),
                ("watch",    0.29, None, "Engine temperature trending upward. Schedule inspection within 45 days.",                                                              [{"signal": "Engine Temp Trend",  "value": "+0.18°C/hr",   "weight": 0.35}, {"signal": "Runtime Hours",      "value": "3,140 hrs",    "weight": 0.2}]),
                ("watch",    0.38, None, "Increased fuel consumption detected. Injector check recommended within 30 days.",                                                      [{"signal": "Fuel Consumption",   "value": "+11.3% trend", "weight": 0.4},  {"signal": "Temp Spikes",        "value": "4 spikes >85°C","weight": 0.25}]),
                ("watch",    0.44, None, "Usage hours approaching major service interval. Pre-book 1000-hour service.",                                                          [{"signal": "Hours to Service",   "value": "94 hrs left",  "weight": 0.5}]),
                ("alert",    0.61, 38,   "Multiple anomalous temperature readings. Schedule maintenance this week.",                                                              [{"signal": "Engine Temp Trend",  "value": "+0.34°C/hr",   "weight": 0.55}, {"signal": "Temperature Spikes",  "value": "9 spikes >88°C","weight": 0.35}]),
                ("alert",    0.68, 22,   "Hydraulic pressure variance outside spec. Immediate inspection required.",                                                             [{"signal": "Hydraulic Variance", "value": "±18 PSI",      "weight": 0.6},  {"signal": "Fluid Temp Trend",   "value": "+0.4°C/hr",    "weight": 0.3}]),
                ("critical", 0.83, 11,   "High failure probability. Remove from service within 2 weeks for comprehensive inspection. Multiple failure indicators present.",      [{"signal": "Engine Temp Trend",  "value": "+0.61°C/hr",   "weight": 0.7},  {"signal": "Temp Spikes",        "value": "15 spikes >92°C","weight": 0.6}]),
                ("critical", 0.91, 5,    "Imminent failure risk. Cease operations immediately. Emergency maintenance required. Do NOT operate until cleared by certified engineer.", [{"signal": "Critical Temp",     "value": "96.4°C peak",  "weight": 0.9},  {"signal": "Engine Stall Events","value": "3 in 7 days",   "weight": 0.8}]),
            ]
            for i, pred in enumerate(preds):
                if i >= len(diversity):
                    break
                lvl, prob, days, rec, signals = diversity[i]
                pred.failure_probability = prob
                pred.risk_level = lvl
                pred.days_to_predicted_failure = days
                pred.recommendation = rec
                pred.top_signals = signals
                pred.save()
        except Exception:
            pass

        # Anomaly Detection
        try:
            from ai_engine.models import AnomalyAlert
            from ai_engine.ml.anomaly_detector import detect_anomalies
            if not AnomalyAlert.objects.exists():
                anomaly_list = detect_anomalies()
                created = 0
                for item in anomaly_list:
                    try:
                        inv = Invoice.objects.get(pk=item["invoice_id"])
                        AnomalyAlert.objects.create(invoice=inv, alert_type=item["alert_type"], severity=item["severity"], anomaly_score=item["anomaly_score"], z_score=item.get("z_score"), explanation=item["explanation"])
                        created += 1
                    except Exception:
                        continue
                self.stdout.write(self.style.SUCCESS(f"    {created} anomaly alerts generated"))
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"    Anomaly detection skipped: {e}"))

        # Remarketing Recommendations
        try:
            from ai_engine.models import RemarketingRecommendation
            from ai_engine.ml.remarketing_engine import compute_all_recommendations
            if not RemarketingRecommendation.objects.exists():
                results = compute_all_recommendations()
                for asset, result in results:
                    RemarketingRecommendation.objects.update_or_create(
                        asset=asset,
                        defaults={"recommended_action": result["recommended_action"], "sell_price_estimate": result["sell_price_estimate"], "refurbish_cost_estimate": result["refurbish_cost_estimate"], "net_roi_12m": result["net_roi_12m"], "roi_curve": result["roi_curve"], "rationale": result["rationale"]},
                    )
                self.stdout.write(self.style.SUCCESS(f"    {len(results)} remarketing recommendations generated"))
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"    Remarketing computation skipped: {e}"))

        # Diverse remarketing actions
        try:
            recs = list(RemarketingRecommendation.objects.all())
            diversity = [
                ("hold",      5.8,  "Stable active lease generates ${fee}/mo. Strong lessee relationship (2+ years). Hold for maximum lease income before remarketing evaluation."),
                ("hold",      7.2,  "Medical imaging asset in high demand. Current lessee renewing. Hold and renegotiate rate at renewal — projected 8% rate increase."),
                ("re_lease",  19.4, "Asset in excellent condition post-completion. Market analysis shows strong demand in healthcare sector. Re-lease at 12% rate premium. 19.4% projected 12-month ROI."),
                ("re_lease",  22.8, "Fleet vehicle returning from completed lease. Clean history, low hours. Re-lease to logistics sector. Achieves 22.8% ROI vs 8.1% sell-now scenario."),
                ("refurbish", 11.3, "Asset at end of 24-month lease with moderate wear. $18,500 refurbishment yields $62,000 premium resale. Net margin 11.3% over sell-as-is."),
                ("refurbish", 14.7, "Industrial robot showing cosmetic and minor mechanical wear. Full refurb + recertification adds $45,000 to resale value. Recommend specialist refurbisher."),
                ("sell_now",  -8.2, "Asset depreciation accelerating past 8% per quarter. Market window closing. Sell at $142,000 (current estimate) before 12-month decline to $118,000."),
                ("sell_now", -12.6, "Remarketed status confirmed. High specialty asset (radiotherapy). Specialized medical remarketer engaged. Estimated $320,000 — highest value recovery option."),
                ("hold",      3.1,  "Recent acquisition in active lease. Too early to evaluate remarketing options. Reassess at 18-month mark."),
                ("re_lease",  16.5, "Strong utilization track record. Returning asset well-maintained. Existing lessee waitlist. Quick re-lease expected within 30 days of return."),
            ]
            actions_list = [d[0] for d in diversity]
            for i, rec in enumerate(recs):
                if i >= len(diversity):
                    break
                action, roi, rationale = diversity[i]
                rec.recommended_action = action
                rec.net_roi_12m = roi
                rec.rationale = rationale.replace("${fee}", f"${float(rec.sell_price_estimate or 5000):,.0f}")
                rec.save()
        except Exception:
            pass

        self.stdout.write(self.style.SUCCESS("  AI data seeding complete\n"))

    # ── Celery Beat ────────────────────────────────────────────────────────────

    def _setup_celery_beat(self):
        self.stdout.write("  Configuring Celery Beat schedules...")
        try:
            from django_celery_beat.models import IntervalSchedule, PeriodicTask
            s2,  _ = IntervalSchedule.objects.get_or_create(every=2,  period=IntervalSchedule.MINUTES)
            s10, _ = IntervalSchedule.objects.get_or_create(every=10, period=IntervalSchedule.MINUTES)
            PeriodicTask.objects.update_or_create(name="Simulate IoT Ping",         defaults={"task": "servicing.tasks.simulate_iot_ping",         "interval": s2,  "enabled": True})
            PeriodicTask.objects.update_or_create(name="Generate Monthly Invoices", defaults={"task": "servicing.tasks.generate_monthly_invoices", "interval": s10, "enabled": True})
            self.stdout.write(self.style.SUCCESS("  Celery Beat tasks registered\n"))
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"  Celery Beat setup skipped: {e}\n"))
