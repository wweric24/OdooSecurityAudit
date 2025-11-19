"""Persistent registry for manually hidden users."""
from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from threading import Lock
from typing import Dict, List, Optional

from sqlalchemy.orm import Session

from app.backend.settings import settings
from app.data.models import User


def _normalize_token(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    token = value.strip().lower()
    return token or None


def _normalize_name(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    cleaned = " ".join(value.strip().split())
    cleaned = cleaned.lower()
    return cleaned or None


@dataclass(frozen=True)
class HiddenUserSignature:
    """Stable identifiers used to track hidden users across imports."""

    azure_id: Optional[str]
    email: Optional[str]
    name: Optional[str]

    def has_identifier(self) -> bool:
        return any([self.azure_id, self.email, self.name])

    def to_key(self) -> tuple:
        return (
            self.azure_id or "",
            self.email or "",
            self.name or "",
        )

    @classmethod
    def from_user(cls, user: User) -> "HiddenUserSignature":
        return cls(
            azure_id=_normalize_token(getattr(user, "azure_id", None)),
            email=_normalize_token(getattr(user, "email", None)),
            name=_normalize_name(getattr(user, "name", None)),
        )


class HiddenUserRegistry:
    """Tracks users the operator has chosen to hide, even across data resets."""

    def __init__(self, path: Path):
        self._path = path
        self._lock = Lock()
        self._entries: Optional[List[Dict[str, Optional[str]]]] = None

    def _ensure_loaded(self) -> None:
        if self._entries is not None:
            return

        entries: List[Dict[str, Optional[str]]] = []

        if self._path.is_file():
            try:
                with self._path.open("r", encoding="utf-8") as handle:
                    payload = json.load(handle)
                entries = payload.get("hidden_users") or payload.get("hidden") or []
            except (json.JSONDecodeError, OSError, ValueError):
                entries = []

        normalized: List[Dict[str, Optional[str]]] = []
        seen = set()
        for entry in entries:
            normalized_entry = self._coerce_entry(entry)
            if not normalized_entry:
                continue
            key = self._entry_key(normalized_entry)
            if key in seen:
                continue
            seen.add(key)
            normalized.append(normalized_entry)

        self._entries = normalized

    def _coerce_entry(self, entry: Dict[str, Optional[str]]) -> Optional[Dict[str, Optional[str]]]:
        azure_id = _normalize_token(entry.get("azure_id"))
        email = _normalize_token(entry.get("email"))
        name = _normalize_name(entry.get("name"))
        if not any([azure_id, email, name]):
            return None
        label = (
            entry.get("label")
            or entry.get("display_name")
            or entry.get("original_name")
            or entry.get("name")
            or entry.get("email")
            or entry.get("azure_id")
            or "Hidden User"
        )
        return {
            "azure_id": azure_id,
            "email": email,
            "name": name,
            "label": label,
        }

    def _entry_key(self, entry: Dict[str, Optional[str]]) -> tuple:
        return (
            entry.get("azure_id") or "",
            entry.get("email") or "",
            entry.get("name") or "",
        )

    def _entry_matches_signature(self, entry: Dict[str, Optional[str]], signature: HiddenUserSignature) -> bool:
        return any(
            [
                entry.get("azure_id") and signature.azure_id and entry["azure_id"] == signature.azure_id,
                entry.get("email") and signature.email and entry["email"] == signature.email,
                entry.get("name") and signature.name and entry["name"] == signature.name,
            ]
        )

    def _persist(self) -> None:
        if self._entries is None:
            return
        self._path.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "version": 1,
            "hidden_users": self._entries,
        }
        tmp_path = self._path.with_name(self._path.name + ".tmp")
        with tmp_path.open("w", encoding="utf-8") as handle:
            json.dump(payload, handle, indent=2, sort_keys=True)
        tmp_path.replace(self._path)

    def register_hidden_user(self, user: User) -> bool:
        """Add a user to the registry, returning True if persisted."""
        signature = HiddenUserSignature.from_user(user)
        if not signature.has_identifier():
            return False

        with self._lock:
            self._ensure_loaded()
            assert self._entries is not None

            if any(self._entry_matches_signature(entry, signature) for entry in self._entries):
                return False

            label = user.name or user.email or user.azure_id or "User"
            self._entries.append(
                {
                    "azure_id": signature.azure_id,
                    "email": signature.email,
                    "name": signature.name,
                    "label": label,
                }
            )
            self._persist()
            return True

    def remove_hidden_user(self, user: User) -> bool:
        """Remove a user from the registry, returning True if any entry was removed."""
        signature = HiddenUserSignature.from_user(user)
        if not signature.has_identifier():
            return False

        with self._lock:
            self._ensure_loaded()
            assert self._entries is not None

            original_len = len(self._entries)
            self._entries = [
                entry for entry in self._entries if not self._entry_matches_signature(entry, signature)
            ]
            removed = len(self._entries) != original_len
            if removed:
                self._persist()
            return removed

    def should_hide_user(self, user: User) -> bool:
        """Check if a user should be hidden based on registry entries."""
        signature = HiddenUserSignature.from_user(user)
        if not signature.has_identifier():
            return False

        with self._lock:
            self._ensure_loaded()
            assert self._entries is not None
            return any(self._entry_matches_signature(entry, signature) for entry in self._entries)

    def apply_hidden_flag(self, user: User) -> bool:
        """Mark the user as hidden when the registry says so."""
        if self.should_hide_user(user):
            user.is_hidden = True
            return True
        return False

    def reset(self, delete_file: bool = False) -> None:
        """Clear cached entries (and optionally delete the registry file)."""
        with self._lock:
            self._entries = None
        if delete_file and self._path.exists():
            try:
                self._path.unlink()
            except OSError:
                pass

    def sync_from_database(self, db: Session) -> int:
        """
        Ensure registry entries exist for all users currently marked as hidden.

        Returns:
            Number of new registry entries that were created.
        """
        hidden_users = db.query(User).filter(User.is_hidden == True).all()  # noqa: E712
        added = 0
        with self._lock:
            self._ensure_loaded()
            assert self._entries is not None
            for user in hidden_users:
                signature = HiddenUserSignature.from_user(user)
                if not signature.has_identifier():
                    continue
                if any(self._entry_matches_signature(entry, signature) for entry in self._entries):
                    continue
                label = user.name or user.email or user.azure_id or "User"
                self._entries.append(
                    {
                        "azure_id": signature.azure_id,
                        "email": signature.email,
                        "name": signature.name,
                        "label": label,
                    }
                )
                added += 1
            if added:
                self._persist()
        return added


hidden_user_registry = HiddenUserRegistry(settings.hidden_user_registry_path)

__all__ = ["HiddenUserRegistry", "hidden_user_registry"]
