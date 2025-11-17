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

    odoo_postgres_dsn: Optional[str] = os.getenv("ODOO_POSTGRES_DSN")
    odoo_sync_mock_file: Optional[str] = os.getenv("ODOO_SYNC_MOCK_FILE")

    sync_page_size: int = int(os.getenv("SYNC_PAGE_SIZE", "500"))
    allow_mock_syncs: bool = _bool(os.getenv("ALLOW_SYNC_MOCKS", "1"))

    def resolve_mock_path(self, path: Optional[str]) -> Optional[Path]:
        if not path:
            return None
        candidate = Path(path)
        if candidate.is_file():
            return candidate
        rel = Path(__file__).resolve().parents[2] / path
        return rel if rel.is_file() else None

    @property
    def azure_configured(self) -> bool:
        return all([self.azure_tenant_id, self.azure_client_id, self.azure_client_secret])

    @property
    def odoo_configured(self) -> bool:
        return self.odoo_postgres_dsn is not None


settings = Settings()
