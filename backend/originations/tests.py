"""
Unit & integration tests for the originations app.

Run with:
    python manage.py test originations --verbosity=2
"""
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import CustomUser
from originations.models import Asset, LeaseContract


# ─── Helpers ─────────────────────────────────────────────────

def create_admin(username="admin_test", password="AdminPass123!"):
    return CustomUser.objects.create_user(
        username=username,
        email=f"{username}@example.com",
        password=password,
        role="admin",
    )


def create_lessee(username="lessee_test", password="LesseePass123!"):
    return CustomUser.objects.create_user(
        username=username,
        email=f"{username}@example.com",
        password=password,
        role="lessee",
        company_name="Test Corp",
    )


def create_asset(name="Excavator X100", category="heavy_equipment"):
    return Asset.objects.create(
        name=name,
        category=category,
        serial_number=f"SN-{name.replace(' ', '')}",
        manufacture_year=2020,
        base_monthly_rate="5000.00",
        per_hour_rate="25.00",
        status="available",
    )


def jwt_client(user):
    """Return an authenticated APIClient for the given user."""
    client = APIClient()
    token = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(token.access_token)}")
    return client


# ─── Model Tests ─────────────────────────────────────────────

class AssetModelTest(TestCase):
    def test_create_asset(self):
        a = create_asset()
        self.assertEqual(a.status, "available")
        self.assertIsNone(a.image_url)
        self.assertEqual(str(a.base_monthly_rate), "5000.00")

    def test_asset_category_choices(self):
        valid_cats = ["heavy_equipment", "medical", "fleet", "industrial"]
        for cat in valid_cats:
            a = create_asset(name=f"Asset-{cat}", category=cat)
            self.assertEqual(a.category, cat)


class LeaseContractModelTest(TestCase):
    def setUp(self):
        self.admin = create_admin()
        self.lessee = create_lessee()
        self.asset = create_asset()

    def test_contract_number_generated(self):
        from originations.services import create_lease_contract
        lease = create_lease_contract(
            user=self.lessee,
            asset_id=self.asset.id,
            duration_months=12,
        )
        self.assertTrue(lease.contract_number.startswith("LC-"))
        self.assertEqual(lease.status, "active")
        self.asset.refresh_from_db()
        self.assertEqual(self.asset.status, "leased")


# ─── API Auth Tests ───────────────────────────────────────────

class HealthCheckTest(TestCase):
    def test_health_public(self):
        """Health endpoint must be accessible without authentication."""
        response = self.client.get("/api/health/")
        self.assertIn(response.status_code, [200, 503])
        data = response.json()
        self.assertIn("status", data)
        self.assertIn("database", data)
        self.assertIn("redis", data)


class AssetAPITest(TestCase):
    def setUp(self):
        self.admin = create_admin()
        self.lessee = create_lessee()
        self.admin_client = jwt_client(self.admin)
        self.lessee_client = jwt_client(self.lessee)

    def test_list_assets_authenticated(self):
        create_asset("Machine A")
        create_asset("Machine B")
        response = self.lessee_client.get("/api/assets/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("results", response.data)
        self.assertGreaterEqual(response.data["count"], 2)

    def test_list_assets_unauthenticated(self):
        response = self.client.get("/api/assets/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_asset_admin(self):
        payload = {
            "name": "New Crane",
            "category": "heavy_equipment",
            "serial_number": "SN-CRANE001",
            "manufacture_year": 2022,
            "base_monthly_rate": "8000.00",
            "per_hour_rate": "40.00",
            "status": "available",
        }
        response = self.admin_client.post("/api/assets/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "New Crane")

    def test_create_asset_non_admin_forbidden(self):
        payload = {
            "name": "Smuggled Crane",
            "category": "fleet",
            "serial_number": "SN-FAKE",
            "manufacture_year": 2021,
            "base_monthly_rate": "1000.00",
            "per_hour_rate": "10.00",
            "status": "available",
        }
        response = self.lessee_client.post("/api/assets/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_asset_detail(self):
        asset = create_asset("Detail Machine")
        response = self.lessee_client.get(f"/api/assets/{asset.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Detail Machine")

    def test_asset_not_found(self):
        response = self.lessee_client.get("/api/assets/99999/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class LeaseAPITest(TestCase):
    def setUp(self):
        self.admin = create_admin()
        self.lessee = create_lessee()
        self.admin_client = jwt_client(self.admin)
        self.lessee_client = jwt_client(self.lessee)
        self.asset = create_asset()

    def test_create_lease(self):
        payload = {"asset_id": self.asset.id, "duration_months": 6}
        response = self.lessee_client.post("/api/leases/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], "active")
        self.assertTrue(response.data["contract_number"].startswith("LC-"))

    def test_create_lease_already_leased(self):
        """A second lease on the same (now leased) asset should fail."""
        payload = {"asset_id": self.asset.id, "duration_months": 3}
        self.lessee_client.post("/api/leases/", payload, format="json")
        response = self.lessee_client.post("/api/leases/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_lessee_can_only_see_own_leases(self):
        other_lessee = create_lessee("lessee_other", "OtherPass123!")
        other_client = jwt_client(other_lessee)
        other_asset = create_asset("Other Machine")
        other_client.post("/api/leases/", {"asset_id": other_asset.id, "duration_months": 1}, format="json")

        # The first lessee should see 0 leases (they didn't create any)
        response = self.lessee_client.get("/api/leases/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 0)

    def test_admin_sees_all_leases(self):
        other_lessee = create_lessee("lessee_for_admin_test", "Pass123!")
        other_asset = create_asset("Visible Machine")
        jwt_client(other_lessee).post("/api/leases/", {"asset_id": other_asset.id, "duration_months": 2}, format="json")

        response = self.admin_client.get("/api/leases/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data["count"], 1)

    def test_renew_lease(self):
        create_resp = self.lessee_client.post("/api/leases/", {"asset_id": self.asset.id, "duration_months": 1}, format="json")
        lease_id = create_resp.data["id"]
        original_end = create_resp.data["end_date"]

        renew_resp = self.lessee_client.post(f"/api/leases/{lease_id}/renew/", {"duration_months": 3}, format="json")
        self.assertEqual(renew_resp.status_code, status.HTTP_200_OK)
        self.assertGreater(renew_resp.data["end_date"], original_end)


class DashboardAPITest(TestCase):
    def setUp(self):
        self.admin = create_admin()
        self.lessee = create_lessee()
        self.admin_client = jwt_client(self.admin)
        self.lessee_client = jwt_client(self.lessee)

    def test_dashboard_summary_admin(self):
        response = self.admin_client.get("/api/dashboard/summary/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        self.assertIn("assets", data)
        self.assertIn("leases", data)
        self.assertIn("invoices", data)

    def test_dashboard_summary_lessee(self):
        response = self.lessee_client.get("/api/dashboard/summary/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_utilization_heatmap(self):
        response = self.lessee_client.get("/api/assets/utilization-heatmap/?days=7")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        self.assertIn("days", data)
        self.assertIn("max_total", data)
        self.assertEqual(len(data["days"]), 8)  # 7 + today


class AuditLogAPITest(TestCase):
    def setUp(self):
        self.admin = create_admin()
        self.lessee = create_lessee()
        self.admin_client = jwt_client(self.admin)
        self.lessee_client = jwt_client(self.lessee)

    def test_audit_log_admin_only(self):
        response = self.admin_client.get("/api/audit-logs/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_audit_log_lessee_forbidden(self):
        response = self.lessee_client.get("/api/audit-logs/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
