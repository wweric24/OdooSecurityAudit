"""Tests for API endpoints."""
import unittest
import os
import sys
from pathlib import Path

TEST_HIDDEN_REGISTRY = Path(__file__).resolve().parent / "tmp_hidden_registry.json"
os.environ["HIDDEN_USER_REGISTRY"] = str(TEST_HIDDEN_REGISTRY)
if TEST_HIDDEN_REGISTRY.exists():
    TEST_HIDDEN_REGISTRY.unlink()
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from fastapi.testclient import TestClient
from app.backend.api import app
from app.backend.database import init_db, get_db, engine
from app.backend.settings import settings
from app.backend.services.hidden_user_registry import hidden_user_registry
from app.data.models import Base


class TestAPI(unittest.TestCase):
    """Test API endpoints."""
    
    @classmethod
    def setUpClass(cls):
        """Set up test database."""
        # Use in-memory database for tests
        Base.metadata.create_all(bind=engine)
        init_db()
        sample_dir = Path(__file__).resolve().parents[1] / "sample_data"
        settings.azure_user_sync_mock_file = str(sample_dir / "azure_users_sample.json")
        settings.odoo_sync_mock_file = str(sample_dir / "odoo_sync_sample.json")
        settings.allow_mock_syncs = True
    
    @classmethod
    def tearDownClass(cls):
        """Clean up."""
        Base.metadata.drop_all(bind=engine)
        if TEST_HIDDEN_REGISTRY.exists():
            TEST_HIDDEN_REGISTRY.unlink()
    
    def setUp(self):
        """Set up test client."""
        hidden_user_registry.reset(delete_file=True)
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        self.client = TestClient(app)
    
    def _sync_odoo_with_mock(self):
        """Helper to populate Odoo data using the mock payload."""
        response = self.client.post("/api/sync/odoo-db")
        self.assertEqual(response.status_code, 200)
        return response.json()
    
    def test_root_endpoint(self):
        """Test root endpoint (should redirect or show docs)."""
        response = self.client.get("/")
        # FastAPI redirects to /docs
        self.assertIn(response.status_code, [200, 307, 404])
    
    def test_docs_endpoint(self):
        """Test API documentation endpoint."""
        response = self.client.get("/docs")
        self.assertEqual(response.status_code, 200)
    
    def test_stats_endpoint(self):
        """Test statistics endpoint."""
        response = self.client.get("/api/stats")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("total_groups", data)
        self.assertIn("total_users", data)
    
    def test_get_groups_empty(self):
        """Test getting groups when database is empty."""
        response = self.client.get("/api/groups")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["total"], 0)
        self.assertEqual(len(data["groups"]), 0)
    
    def test_get_compliance(self):
        """Test compliance analysis endpoint."""
        response = self.client.get("/api/analysis/compliance")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("total_groups", data)
        self.assertIn("compliance_percentage", data)
    
    def test_get_gap_analysis(self):
        """Test gap analysis endpoint."""
        response = self.client.get("/api/analysis/gaps")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("undocumented_groups", data)
        self.assertIn("missing_who", data)
    
    def test_get_group_by_id(self):
        """Test getting a specific group by ID."""
        self._sync_odoo_with_mock()
        groups_response = self.client.get("/api/groups")
        self.assertEqual(groups_response.status_code, 200)
        payload = groups_response.json()
        self.assertGreater(payload["total"], 0)
        group_id = payload["groups"][0]["id"]
        response = self.client.get(f"/api/groups/{group_id}")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("name", data)
        self.assertIn("id", data)

    def test_get_modules_endpoint(self):
        """Modules endpoint should return distinct modules."""
        self._sync_odoo_with_mock()
        response = self.client.get("/api/modules")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("modules", data)
        self.assertGreaterEqual(len(data["modules"]), 1)
    
    def test_patch_group_updates_documentation(self):
        """PATCH endpoint should update group documentation fields."""
        self._sync_odoo_with_mock()
        groups_response = self.client.get("/api/groups")
        group_list = groups_response.json()["groups"]
        self.assertGreater(len(group_list), 0)
        group_id = group_list[0]["id"]
        
        payload = {
            "status": "Confirmed",
            "who_requires": "Finance Managers",
            "why_required": "Monthly close approvals",
            "notes": "Reviewed by audit",
            "last_audit_date": "2024-01-15"
        }
        response = self.client.patch(f"/api/groups/{group_id}", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "Confirmed")
        self.assertEqual(data["who_requires"], "Finance Managers")
        self.assertEqual(data["why_required"], "Monthly close approvals")
        self.assertEqual(data["last_audit_date"], "2024-01-15")
        self.assertTrue(data["has_required_fields"])
    
    def test_export_groups_csv(self):
        """CSV export for groups returns data."""
        self._sync_odoo_with_mock()
        response = self.client.get("/api/export/groups")
        self.assertEqual(response.status_code, 200)
        self.assertIn("text/csv", response.headers["content-type"])
        self.assertIn("Name,Module", response.text.splitlines()[0])
    
    def test_export_users_csv(self):
        """CSV export for users returns data."""
        self._sync_odoo_with_mock()
        response = self.client.get("/api/export/users")
        self.assertEqual(response.status_code, 200)
        self.assertIn("text/csv", response.headers["content-type"])
        header = response.text.splitlines()[0]
        self.assertTrue(header.startswith("ID,Name,Email,Department"))
    
    def test_export_non_compliant_csv(self):
        """CSV export for non-compliant groups returns header at minimum."""
        self._sync_odoo_with_mock()
        response = self.client.get("/api/export/analysis/non-compliant")
        self.assertEqual(response.status_code, 200)
        header = response.text.splitlines()[0]
        self.assertEqual(header, "ID,Name,Module,Issues")

    def test_sync_azure_users_with_mock(self):
        """Azure sync endpoint should process mock payload."""
        response = self.client.post("/api/sync/azure-users")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("stats", data)
        self.assertGreater(data["stats"]["processed"], 0)

    def test_sync_odoo_db_with_mock(self):
        """Odoo sync endpoint should process mock payload."""
        response = self.client.post("/api/sync/odoo-db")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("stats", data)
        self.assertGreater(data["stats"]["groups_processed"], 0)

    def test_sync_status_endpoint(self):
        """Sync status endpoint returns recent runs."""
        # ensure at least one run
        self.client.post("/api/sync/azure-users")
        response = self.client.get("/api/sync/status")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("runs", payload)
        self.assertGreater(len(payload["runs"]), 0)

    def test_hidden_only_filters(self):
        """Hidden-only query params should return only hidden users."""
        sync_resp = self.client.post("/api/sync/azure-users")
        self.assertEqual(sync_resp.status_code, 200)

        users_resp = self.client.get("/api/users")
        self.assertEqual(users_resp.status_code, 200)
        users_payload = users_resp.json()
        self.assertGreater(users_payload["total"], 0)
        target_user = users_payload["users"][0]

        hide_resp = self.client.post("/api/users/hide", json={"user_ids": [target_user["id"]]})
        self.assertEqual(hide_resp.status_code, 200)

        hidden_resp = self.client.get("/api/users", params={"hidden_only": True})
        self.assertEqual(hidden_resp.status_code, 200)
        hidden_payload = hidden_resp.json()
        self.assertGreaterEqual(hidden_payload["total"], 1)
        self.assertTrue(all(user["is_hidden"] for user in hidden_payload["users"]))

        visible_resp = self.client.get("/api/users")
        self.assertEqual(visible_resp.status_code, 200)
        visible_ids = {user["id"] for user in visible_resp.json()["users"]}
        self.assertNotIn(target_user["id"], visible_ids)

        target_department = target_user.get("department")
        if target_department:
            dept_hidden_resp = self.client.get(
                "/api/users/by-department",
                params={"department": target_department, "hidden_only": True},
            )
            self.assertEqual(dept_hidden_resp.status_code, 200)
            dept_payload = dept_hidden_resp.json()
            self.assertTrue(all(user["is_hidden"] for user in dept_payload["users"]))
            dept_ids = {user["id"] for user in dept_payload["users"]}
            self.assertIn(target_user["id"], dept_ids)

    def test_hidden_users_persist_after_database_reset(self):
        """Hidden selections remain after dropping and re-syncing data."""
        sync_resp = self.client.post("/api/sync/azure-users")
        self.assertEqual(sync_resp.status_code, 200)

        users_resp = self.client.get("/api/users", params={"include_hidden": True})
        self.assertEqual(users_resp.status_code, 200)
        data = users_resp.json()
        self.assertGreater(data["total"], 0)
        target = data["users"][0]

        target_id = target["id"]
        target_azure = target.get("azure_id")
        target_email = target.get("email")
        target_name = target.get("name")

        hide_response = self.client.post("/api/users/hide", json={"user_ids": [target_id]})
        self.assertEqual(hide_response.status_code, 200)

        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        init_db()

        resync_resp = self.client.post("/api/sync/azure-users")
        self.assertEqual(resync_resp.status_code, 200)

        refreshed_resp = self.client.get("/api/users", params={"include_hidden": True})
        self.assertEqual(refreshed_resp.status_code, 200)
        refreshed = refreshed_resp.json()["users"]

        def _matches(candidate):
            if target_azure and candidate.get("azure_id") == target_azure:
                return True
            if target_email and candidate.get("email") == target_email:
                return True
            return target_name and candidate.get("name") == target_name

        matching = next((u for u in refreshed if _matches(u)), None)
        self.assertIsNotNone(matching)
        self.assertTrue(matching["is_hidden"])

        visible_resp = self.client.get("/api/users")
        self.assertEqual(visible_resp.status_code, 200)
        visible_users = visible_resp.json()["users"]
        self.assertTrue(all(not _matches(u) for u in visible_users))


if __name__ == '__main__':
    unittest.main()

