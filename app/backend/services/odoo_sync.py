"""Remote Odoo Postgres synchronization service."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Dict, Iterable, List, Optional, Tuple

import psycopg
from sqlalchemy.orm import Session

from app.backend.services.sync_runs import create_sync_run, complete_sync_run
from app.backend.settings import settings
from app.data.csv_parser import CSVParser
from app.data.models import SecurityGroup, User, AccessRight

parser = CSVParser()


def _load_mock_payload() -> Dict:
    path = settings.resolve_mock_path(settings.odoo_sync_mock_file)
    if not path:
        raise RuntimeError("Odoo sync mock file not found")
    with path.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def _fetch_from_postgres() -> Dict:
    if not settings.odoo_configured:
        raise RuntimeError("ODOO_POSTGRES_DSN is not configured")

    with psycopg.connect(settings.odoo_postgres_dsn) as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, name, category_id, write_date FROM res_groups ORDER BY id"
            )
            groups = [
                {
                    "id": row[0],
                    "name": row[1],
                    "category_id": row[2],
                    "write_date": row[3].isoformat() if row[3] else None,
                }
                for row in cur.fetchall()
            ]

            cur.execute(
                "SELECT id, name, login, write_date FROM res_users WHERE active = TRUE ORDER BY id"
            )
            users = [
                {
                    "id": row[0],
                    "name": row[1],
                    "login": row[2],
                    "write_date": row[3].isoformat() if row[3] else None,
                }
                for row in cur.fetchall()
            ]

            cur.execute("SELECT uid, gid FROM res_groups_users_rel")
            memberships = [{"user_id": row[0], "group_id": row[1]} for row in cur.fetchall()]

            cur.execute("SELECT parent_id, child_id FROM res_groups_implied_rel")
            inheritance = [{"parent_id": row[0], "child_id": row[1]} for row in cur.fetchall()]

            # Fetch CRUD permissions (access rights)
            # This query joins ir_model_access with ir_model to get human-readable model names
            access_rights = []
            try:
                cur.execute("""
                    SELECT
                        ira.id,
                        ira.group_id,
                        im.model,
                        im.name as model_name,
                        ira.perm_read,
                        ira.perm_write,
                        ira.perm_create,
                        ira.perm_unlink
                    FROM ir_model_access ira
                    JOIN ir_model im ON ira.model_id = im.id
                    WHERE ira.group_id IS NOT NULL
                    ORDER BY ira.group_id, im.model
                """)
                access_rights = [
                    {
                        "id": row[0],
                        "group_id": row[1],
                        "model": row[2],
                        "model_name": row[3],
                        "perm_read": row[4],
                        "perm_write": row[5],
                        "perm_create": row[6],
                        "perm_unlink": row[7],
                    }
                    for row in cur.fetchall()
                ]
            except Exception:
                # If ir_model_access table is not accessible, continue without it
                pass

    return {
        "groups": groups,
        "users": users,
        "memberships": memberships,
        "inheritance": inheritance,
        "access_rights": access_rights,
    }


def _upsert_groups(db: Session, payload: Dict) -> Dict[str, int]:
    now = datetime.now(timezone.utc)
    groups_created = 0
    groups_updated = 0
    users_created = 0
    users_updated = 0

    group_lookup: Dict[int, SecurityGroup] = {}
    user_lookup: Dict[int, User] = {}

    for record in payload.get("groups", []):
        gid = record.get("id")
        name = record.get("name")
        if not name:
            continue

        group = None
        if gid:
            group = db.query(SecurityGroup).filter(SecurityGroup.odoo_id == gid).first()
        if not group:
            group = db.query(SecurityGroup).filter(SecurityGroup.name == name).first()

        if not group:
            module, access_level, hierarchy_level = parser.extract_module_and_access_level(name)
            group = SecurityGroup(
                name=name,
                module=module,
                access_level=access_level,
                hierarchy_level=hierarchy_level,
                status="Under Review",
            )
            db.add(group)
            groups_created += 1
        else:
            groups_updated += 1

        group.odoo_id = gid
        group.source_system = "Odoo"
        group.synced_from_postgres_at = now
        group_lookup[gid] = group

    db.commit()

    for record in payload.get("users", []):
        uid = record.get("id")
        name = record.get("name") or record.get("login")
        email = record.get("login")

        user = None
        if uid:
            user = db.query(User).filter(User.odoo_user_id == uid).first()
        if not user and email:
            user = db.query(User).filter(User.email == email).first()

        if not user:
            user = User(name=name or email or f"Odoo-{uid}")
            db.add(user)
            users_created += 1
        else:
            users_updated += 1

        user.odoo_user_id = uid
        user.email = email or user.email
        user.source_system = "Odoo"
        user_lookup[uid] = user

    db.commit()

    # Membership associations
    for membership in payload.get("memberships", []):
        uid = membership.get("user_id")
        gid = membership.get("group_id")
        user = user_lookup.get(uid)
        group = group_lookup.get(gid)
        if user and group and user not in group.users:
            group.users.append(user)
    db.commit()

    # Inheritance relationships
    for relation in payload.get("inheritance", []):
        parent = group_lookup.get(relation.get("parent_id"))
        child = group_lookup.get(relation.get("child_id"))
        if parent and child and parent not in child.parent_groups:
            child.parent_groups.append(parent)
    db.commit()

    # Access rights (CRUD permissions)
    access_rights_created = 0
    for ar_record in payload.get("access_rights", []):
        odoo_group_id = ar_record.get("group_id")
        group = group_lookup.get(odoo_group_id)
        if not group:
            continue

        # Check if this access right already exists
        existing = (
            db.query(AccessRight)
            .filter(
                AccessRight.group_id == group.id,
                AccessRight.odoo_access_id == ar_record.get("id"),
            )
            .first()
        )

        if not existing:
            access_right = AccessRight(
                group_id=group.id,
                odoo_access_id=ar_record.get("id"),
                model_name=ar_record.get("model"),
                model_description=ar_record.get("model_name"),
                perm_read=ar_record.get("perm_read", False),
                perm_write=ar_record.get("perm_write", False),
                perm_create=ar_record.get("perm_create", False),
                perm_unlink=ar_record.get("perm_unlink", False),
                synced_at=now,
            )
            db.add(access_right)
            access_rights_created += 1
        else:
            # Update existing
            existing.perm_read = ar_record.get("perm_read", False)
            existing.perm_write = ar_record.get("perm_write", False)
            existing.perm_create = ar_record.get("perm_create", False)
            existing.perm_unlink = ar_record.get("perm_unlink", False)
            existing.synced_at = now

    db.commit()

    return {
        "groups_processed": len(payload.get("groups", [])),
        "users_processed": len(payload.get("users", [])),
        "groups_created": groups_created,
        "groups_updated": groups_updated,
        "users_created": users_created,
        "users_updated": users_updated,
        "access_rights_synced": len(payload.get("access_rights", [])),
        "access_rights_created": access_rights_created,
    }


def sync_odoo_postgres(db: Session) -> Dict:
    """Entry point for pulling data from remote Odoo Postgres."""
    run = create_sync_run(db, "odoo_postgres")
    try:
        if settings.odoo_sync_mock_file and settings.allow_mock_syncs:
            payload = _load_mock_payload()
        else:
            payload = _fetch_from_postgres()
        stats = _upsert_groups(db, payload)
        complete_sync_run(db, run, status="completed", stats=stats)
    except Exception as exc:
        complete_sync_run(db, run, status="failed", error_message=str(exc))
        raise
    return stats
