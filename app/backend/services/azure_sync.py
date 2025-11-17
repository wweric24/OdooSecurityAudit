"""Azure/Entra user synchronization service."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Dict, Iterable, List, Optional

import httpx
import msal
from sqlalchemy.orm import Session

from app.backend.settings import settings
from app.backend.services.sync_runs import create_sync_run, complete_sync_run
from app.data.models import User

GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0"


class AzureGraphClient:
    """Minimal Microsoft Graph client for fetching Entra users."""

    def __init__(self, tenant_id: str, client_id: str, client_secret: str, scope: str):
        self.scope = [scope]
        self._app = msal.ConfidentialClientApplication(
            client_id=client_id,
            client_credential=client_secret,
            authority=f"https://login.microsoftonline.com/{tenant_id}",
        )

    def _get_access_token(self) -> str:
        result = self._app.acquire_token_silent(self.scope, account=None)
        if not result:
            result = self._app.acquire_token_for_client(scopes=self.scope)
        if "access_token" not in result:
            error = result.get("error_description") or "Unable to acquire access token"
            raise RuntimeError(error)
        return result["access_token"]

    def fetch_users(self, page_size: int) -> Iterable[Dict]:
        token = self._get_access_token()
        params = {
            "$select": "id,displayName,department,mail,userPrincipalName,jobTitle,accountEnabled",
            "$top": page_size,
        }
        url = f"{GRAPH_BASE_URL}/users"
        headers = {"Authorization": f"Bearer {token}"}

        while url:
            response = httpx.get(url, headers=headers, params=params if url.endswith("/users") else None, timeout=30)
            response.raise_for_status()
            data = response.json()
            for user in data.get("value", []):
                yield user
            url = data.get("@odata.nextLink")


def _load_mock_users() -> List[Dict]:
    path = settings.resolve_mock_path(settings.azure_user_sync_mock_file)
    if not path:
        raise RuntimeError("Azure sync mock file not found")
    with path.open("r", encoding="utf-8") as fh:
        payload = json.load(fh)
    if isinstance(payload, dict):
        return payload.get("value", [])
    if isinstance(payload, list):
        return payload
    raise RuntimeError("Unsupported mock payload format for Azure users")


def _upsert_users(db: Session, users: Iterable[Dict]) -> Dict[str, int]:
    created = 0
    updated = 0
    processed = 0
    now = datetime.now(timezone.utc)

    for record in users:
        processed += 1
        azure_id = record.get("id")
        email = record.get("mail") or record.get("userPrincipalName")
        name = record.get("displayName") or email or azure_id
        department = record.get("department")

        user = None
        if azure_id:
            user = db.query(User).filter(User.azure_id == azure_id).first()
        if not user and email:
            user = db.query(User).filter(User.email == email).first()
        if not user and name:
            user = db.query(User).filter(User.name == name).first()

        if not user:
            user = User(name=name or f"Azure-{azure_id}")
            created += 1
        else:
            updated += 1

        user.azure_id = azure_id
        user.email = email
        user.name = name
        user.department = department
        user.source_system = "Azure"
        user.last_seen_in_azure_at = now
        db.add(user)

    db.commit()
    return {"processed": processed, "created": created, "updated": updated}


def sync_azure_users(db: Session) -> Dict:
    """Entry point for syncing Azure/Entra directory users."""
    run = create_sync_run(db, "azure_users")
    try:
        if settings.azure_user_sync_mock_file and settings.allow_mock_syncs:
            raw_users = _load_mock_users()
            stats = _upsert_users(db, raw_users)
        else:
            if not settings.azure_configured:
                raise RuntimeError("Azure credentials are not configured")
            client = AzureGraphClient(
                tenant_id=settings.azure_tenant_id,
                client_id=settings.azure_client_id,
                client_secret=settings.azure_client_secret,
                scope=settings.azure_graph_scope,
            )
            stats = _upsert_users(db, client.fetch_users(settings.sync_page_size))
        complete_sync_run(db, run, status="completed", stats=stats)
    except Exception as exc:
        complete_sync_run(db, run, status="failed", error_message=str(exc))
        raise
    return stats
