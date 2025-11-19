"""Unit tests for the hidden user registry service."""
import shutil
import tempfile
import unittest
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.backend.services.hidden_user_registry import HiddenUserRegistry
from app.data.models import Base, User


class TestHiddenUserRegistry(unittest.TestCase):
    """Validate persistence logic for hidden users."""

    def setUp(self):
        self._tmpdir = Path(tempfile.mkdtemp())
        self.registry_path = self._tmpdir / "hidden_users.json"
        self.registry = HiddenUserRegistry(self.registry_path)

    def tearDown(self):
        shutil.rmtree(self._tmpdir)

    def test_register_apply_and_remove(self):
        """Registry should remember identifiers and re-apply hidden flags."""
        user = User(name="Conference Room A", email="roomA@example.com", azure_id="ABC123")
        self.assertFalse(self.registry.should_hide_user(user))

        changed = self.registry.register_hidden_user(user)
        self.assertTrue(changed)

        # Ensure persistence survives reloading the registry from disk
        reloaded_registry = HiddenUserRegistry(self.registry_path)
        copy_user = User(name="Conference Room A", email="ROOMA@EXAMPLE.COM", azure_id="abc123")
        self.assertTrue(reloaded_registry.apply_hidden_flag(copy_user))
        self.assertTrue(copy_user.is_hidden)

        # Removing should allow the user to become visible again
        removed = self.registry.remove_hidden_user(user)
        self.assertTrue(removed)
        another_copy = User(name="Conference Room A", email="roomA@example.com", azure_id="ABC123")
        self.assertFalse(self.registry.should_hide_user(another_copy))

    def test_sync_from_database_bootstraps_existing_hidden_users(self):
        """Hidden DB entries should be captured by the registry."""
        engine = create_engine("sqlite:///:memory:")
        TestingSession = sessionmaker(bind=engine)
        Base.metadata.create_all(bind=engine)
        session = TestingSession()
        try:
            stored = User(name="IT Service Account", email="svc@example.com", is_hidden=True)
            session.add(stored)
            session.commit()

            added = self.registry.sync_from_database(session)
            self.assertEqual(added, 1)

            refreshed_registry = HiddenUserRegistry(self.registry_path)
            new_instance = User(name="IT Service Account", email="svc@example.com")
            self.assertTrue(refreshed_registry.apply_hidden_flag(new_instance))
            self.assertTrue(new_instance.is_hidden)
        finally:
            session.close()
            Base.metadata.drop_all(bind=engine)


if __name__ == "__main__":
    unittest.main()
