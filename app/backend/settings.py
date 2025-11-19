"""
Application settings for external integrations and sync tasks.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Optional


def _bool(value: Optional[str]) -> bool:
    if value is None:
        return False
    return value.lower() in {"1", "true", "yes", "on"}


@dataclass
class Settings:
    """Simple settings container loaded from environment variables."""

    azure_tenant_id: Optional[str] = os.getenv("AZURE_TENANT_ID")
    azure_client_id: Optional[str] = os.getenv("AZURE_CLIENT_ID")
    azure_client_secret: Optional[str] = os.getenv("AZURE_CLIENT_SECRET")
    azure_graph_scope: str = os.getenv("AZURE_GRAPH_SCOPE", "https://graph.microsoft.com/.default")
    azure_user_sync_mock_file: Optional[str] = os.getenv("AZURE_USER_SYNC_MOCK_FILE")

    # Odoo environment switching - these are read from env at init, but odoo_environment is dynamic
    odoo_preprod_dsn: Optional[str] = os.getenv("ODOO_PREPROD_DSN")
    odoo_prod_dsn: Optional[str] = os.getenv("ODOO_PROD_DSN")
    odoo_sync_mock_file: Optional[str] = os.getenv("ODOO_SYNC_MOCK_FILE")

    sync_page_size: int = int(os.getenv("SYNC_PAGE_SIZE", "500"))
    allow_mock_syncs: bool = _bool(os.getenv("ALLOW_SYNC_MOCKS", "1"))
    hidden_user_registry: str = os.getenv(
        "HIDDEN_USER_REGISTRY", "app/local_state/hidden_users.json"
    )

    def resolve_mock_path(self, path: Optional[str]) -> Optional[Path]:
        if not path:
            return None
        candidate = Path(path)
        if candidate.is_file():
            return candidate
        rel = Path(__file__).resolve().parents[2] / path
        return rel if rel.is_file() else None

    @property
    def odoo_environment(self) -> str:
        """Get the current Odoo environment (reads dynamically from os.environ)."""
        return os.getenv("ODOO_ENVIRONMENT", "PREPROD")

    @property
    def odoo_postgres_dsn(self) -> Optional[str]:
        """Return the DSN for the currently active Odoo environment."""
        # First check for legacy single DSN (backwards compatibility)
        legacy_dsn = os.getenv("ODOO_POSTGRES_DSN")
        if legacy_dsn:
            return legacy_dsn

        # Otherwise use environment-specific DSN (reads environment dynamically)
        if self.odoo_environment.upper() == "PROD":
            return self.odoo_prod_dsn
        else:  # Default to PREPROD
            return self.odoo_preprod_dsn

    @property
    def azure_configured(self) -> bool:
        return all([self.azure_tenant_id, self.azure_client_id, self.azure_client_secret])

    @property
    def odoo_configured(self) -> bool:
        return self.odoo_postgres_dsn is not None

    @property
    def odoo_environment_display(self) -> str:
        """Return a display-friendly name for the current Odoo environment."""
        if self.odoo_environment.upper() == "PROD":
            return "Production"
        return "Pre-Production"

    def _resolve_project_path(self, value: Optional[str]) -> Optional[Path]:
        """Resolve a potentially relative path against the project root."""
        if not value:
            return None
        candidate = Path(value)
        if candidate.is_absolute():
            return candidate
        project_root = Path(__file__).resolve().parents[2]
        return project_root / candidate

    @property
    def hidden_user_registry_path(self) -> Path:
        """Return the filesystem location for persisting hidden-user choices."""
        path = self._resolve_project_path(self.hidden_user_registry)
        if path is None:
            # Fallback to default path near project root if env var is blank
            project_root = Path(__file__).resolve().parents[2]
            path = project_root / "app" / "local_state" / "hidden_users.json"
        return path

    def get_config_status(self) -> dict:
        """Return configuration status for all integrations."""
        return {
            "azure": {
                "configured": self.azure_configured,
                "tenant_id": self.azure_tenant_id[:8] + "..." if self.azure_tenant_id else None,
                "client_id": self.azure_client_id[:8] + "..." if self.azure_client_id else None,
            },
            "odoo": {
                "configured": self.odoo_configured,
                "environment": self.odoo_environment,
                "environment_display": self.odoo_environment_display,
                "has_preprod": self.odoo_preprod_dsn is not None,
                "has_prod": self.odoo_prod_dsn is not None,
            },
            "mock_syncs_allowed": self.allow_mock_syncs,
        }


settings = Settings()
