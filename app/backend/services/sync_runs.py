"""Utilities for managing SyncRun records."""
from __future__ import annotations

from datetime import datetime, timezone
import json
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.data.models import SyncRun


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


def serialize_sync_run(run: SyncRun) -> Dict[str, Any]:
    return {
        "id": run.id,
        "type": run.sync_type,
        "status": run.status,
        "started_at": run.started_at.isoformat() if run.started_at else None,
        "completed_at": run.completed_at.isoformat() if run.completed_at else None,
        "stats": json.loads(run.stats) if run.stats else None,
        "error": run.error_message,
    }


def list_recent_syncs(db: Session, sync_type: Optional[str] = None, limit: int = 10) -> List[SyncRun]:
    query = db.query(SyncRun).order_by(SyncRun.started_at.desc())
    if sync_type:
        query = query.filter(SyncRun.sync_type == sync_type)
    return query.limit(limit).all()
