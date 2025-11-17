"""Tests for API endpoints."""
import unittest
import os
import sys
import tempfile
import csv
from pathlib import Path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from fastapi.testclient import TestClient
from app.backend.api import app
from app.backend.database import init_db, get_db, engine
from app.backend.settings import settings
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
    
    def setUp(self):
        """Set up test client."""
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        self.client = TestClient(app)
    
    def _import_group(self, name="Odoo - Test / User", status="Under Review"):
        """Helper to seed a group via CSV import."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, encoding='utf-8-sig') as f:
            writer = csv.writer(f)
            writer.writerow(['Group Name', 'Group Purpose', 'Group Status', 'User Access', 'Users', 'Inherits'])
            writer.writerow([name, '<p>Purpose</p>', status, '<p>Access</p>', 'TestUser', ''])
            temp_file = f.name
        try:
            with open(temp_file, 'rb') as f_handle:
                response = self.client.post(
                    "/api/import",
                    files={"file": ("test.csv", f_handle, "text/csv")}
                )
                self.assertEqual(response.status_code, 200)
        finally:
            os.unlink(temp_file)
    
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
    
    def test_import_csv(self):
        """Test CSV import endpoint."""
        # Create a test CSV file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, encoding='utf-8-sig') as f:
            writer = csv.writer(f)
            writer.writerow(['Group Name', 'Group Purpose', 'Group Status', 'User Access', 'Users', 'Inherits'])
            writer.writerow(['Odoo - Test / User', '<p>Test purpose</p>', 'Confirmed', '<p>Test</p>', 'TestUser', ''])
            temp_file = f.name
        
        try:
            with open(temp_file, 'rb') as f:
                response = self.client.post(
                    "/api/import",
                    files={"file": ("test.csv", f, "text/csv")}
                )
                self.assertEqual(response.status_code, 200)
                data = response.json()
                self.assertIn("success", data)
                self.assertTrue(data["success"])
                self.assertIn("groups_imported", data)
        finally:
            os.unlink(temp_file)
    
    def test_get_group_by_id(self):
        """Test getting a specific group by ID."""
        # First import a group
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, encoding='utf-8-sig') as f:
            writer = csv.writer(f)
            writer.writerow(['Group Name', 'Group Purpose', 'Group Status', 'User Access', 'Users', 'Inherits'])
            writer.writerow(['Test Group', '<p>Test</p>', 'Confirmed', '', 'User1', ''])
            temp_file = f.name
        
        try:
            with open(temp_file, 'rb') as f:
                import_response = self.client.post(
                    "/api/import",
                    files={"file": ("test.csv", f, "text/csv")}
                )
            
            # Get groups to find an ID
            groups_response = self.client.get("/api/groups")
            if groups_response.json()["total"] > 0:
                group_id = groups_response.json()["groups"][0]["id"]
                response = self.client.get(f"/api/groups/{group_id}")
                self.assertEqual(response.status_code, 200)
                data = response.json()
                self.assertIn("name", data)
                self.assertIn("id", data)
        finally:
            os.unlink(temp_file)

    def test_get_modules_endpoint(self):
        """Modules endpoint should return distinct modules."""
        self._import_group(name="Odoo - Project / Admin")
        response = self.client.get("/api/modules")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("modules", data)
        self.assertGreaterEqual(len(data["modules"]), 1)
    
    def test_patch_group_updates_documentation(self):
        """PATCH endpoint should update group documentation fields."""
        group_name = "Odoo - Finance / Reviewer"
        self._import_group(name=group_name)
        groups_response = self.client.get("/api/groups")
        group_id = next(
            (g["id"] for g in groups_response.json()["groups"] if g["name"] == group_name),
            None
        )
        self.assertIsNotNone(group_id)
        
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
        self._import_group(name="Odoo - Sales / User")
        response = self.client.get("/api/export/groups")
        self.assertEqual(response.status_code, 200)
        self.assertIn("text/csv", response.headers["content-type"])
        self.assertIn("Name,Module", response.text.splitlines()[0])
    
    def test_export_users_csv(self):
        """CSV export for users returns data."""
        self._import_group(name="Odoo - HR / Manager")
        response = self.client.get("/api/export/users")
        self.assertEqual(response.status_code, 200)
        self.assertIn("text/csv", response.headers["content-type"])
        header = response.text.splitlines()[0]
        self.assertTrue(header.startswith("ID,Name,Email,Department"))
    
    def test_export_non_compliant_csv(self):
        """CSV export for non-compliant groups returns header at minimum."""
        self._import_group(name="Odoo - Legacy / Legacy")
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


if __name__ == '__main__':
    unittest.main()

