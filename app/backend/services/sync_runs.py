"""Utilities for managing SyncRun records."""
from __future__ import annotations

from datetime import datetime, timezone
import json
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.data.models import SyncRun

STAT_LABELS: Dict[str, str] = {
    "processed": "Processed",
    "created": "New Records",
    "updated": "Updated Records",
    "total_users": "Total Users",
    "azure_users_total": "Azure Users",
    "groups_processed": "Groups Processed",
    "groups_created": "New Groups",
    "groups_updated": "Groups Updated",
    "users_created": "New Users",
    "users_updated": "Users Updated",
    "total_groups": "Total Groups",
    "documented_groups": "Documented Groups",
    "access_rights_created": "Access Rules Added",
    "access_rights_synced": "Access Rules Synced",
    "total_access_rights": "Total Access Rules",
    "orphaned_groups": "Groups Without Users",
}


def create_sync_run(db: Session, sync_type: str) -> SyncRun:
    run = SyncRun(sync_type=sync_type, status="running", started_at=datetime.now(timezone.utc))
    db.add(run)
    db.commit()
    db.refresh(run)
    return run


def complete_sync_run(
    db: Session,
    run: SyncRun,
    *,
    status: str,
    stats: Optional[Dict[str, Any]] = None,
    error_message: Optional[str] = None,
) -> SyncRun:
    run.status = status
    run.completed_at = datetime.now(timezone.utc)
    if stats is not None:
        run.stats = json.dumps(stats)
    if error_message:
        run.error_message = error_message
    db.add(run)
    db.commit()
    db.refresh(run)
    return run


def _parse_stats(run: Optional[SyncRun]) -> Optional[Dict[str, Any]]:
    if not run or not run.stats:
        return None
    try:
        return json.loads(run.stats)
    except json.JSONDecodeError:
        return None


def _build_change_summary(
    current: Optional[Dict[str, Any]],
    previous: Optional[Dict[str, Any]],
) -> Dict[str, Any]:
    if not current:
        return {
            "message": "No statistics recorded for this sync.",
            "diff": [],
            "has_changes": False,
        }

    diff_items = []
    if previous:
        for key, label in STAT_LABELS.items():
            curr = current.get(key)
            prev = previous.get(key)
            if isinstance(curr, (int, float)) and isinstance(prev, (int, float)):
                delta = curr - prev
                if delta != 0:
                    diff_items.append(
                        {
                            "field": key,
                            "label": label,
                            "delta": delta,
                            "current": curr,
                            "previous": prev,
                        }
                    )

    activity_fields = [
        "created",
        "updated",
        "groups_created",
        "groups_updated",
        "users_created",
        "users_updated",
    ]
    has_activity = any(current.get(field, 0) for field in activity_fields)
    has_changes = bool(diff_items) or has_activity

    if diff_items:
        preview = ", ".join(
            f"{item['label']}: {item['delta']:+}"
            for item in diff_items[:3]
        )
        if len(diff_items) > 3:
            preview += f" (+{len(diff_items) - 3} more)"
        message = f"Changes detected — {preview}"
    elif has_activity:
        message = "Sync processed records without net metric changes."
    elif previous:
        message = "No changes detected since previous sync."
    else:
        message = "Initial sync completed."

    return {"message": message, "diff": diff_items, "has_changes": has_changes}


def serialize_sync_run(run: SyncRun, previous_run: Optional[SyncRun] = None) -> Dict[str, Any]:
    stats = _parse_stats(run)
    previous_stats = _parse_stats(previous_run)
    change_summary = _build_change_summary(stats, previous_stats)

    return {
        "id": run.id,
        "type": run.sync_type,
        "status": run.status,
        "started_at": run.started_at.isoformat() if run.started_at else None,
        "completed_at": run.completed_at.isoformat() if run.completed_at else None,
        "stats": stats,
        "error": run.error_message,
        "change_summary": change_summary["message"],
        "differences": change_summary["diff"],
        "has_changes": change_summary["has_changes"],
        "previous_run_id": previous_run.id if previous_run else None,
    }


def list_recent_syncs(db: Session, sync_type: Optional[str] = None, limit: int = 10) -> List[SyncRun]:
    query = db.query(SyncRun).order_by(SyncRun.started_at.desc())
    if sync_type:
        query = query.filter(SyncRun.sync_type == sync_type)
    return query.limit(limit).all()
