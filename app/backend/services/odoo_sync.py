"""Remote Odoo Postgres synchronization service."""
from __future__ import annotations

import json
import re
from datetime import datetime, timezone, date
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple

import psycopg
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.backend.services.sync_runs import create_sync_run, complete_sync_run
from app.backend.settings import settings
from app.backend.services.hidden_user_registry import hidden_user_registry
from app.data.models import SecurityGroup, User, AccessRight, user_group_association

_STANDARDS_CACHE: Optional[Dict] = None

def _parse_datetime(value: Optional[object]) -> Optional[datetime]:
    """Parse ISO formatted timestamps safely."""
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value)
        except ValueError:
            return None
    return None


def _load_standards() -> Dict:
    """Load standards configuration once for name parsing."""
    global _STANDARDS_CACHE
    if _STANDARDS_CACHE is not None:
        return _STANDARDS_CACHE

    config_path = Path(__file__).resolve().parents[1] / "config" / "standards.json"
    try:
        if config_path.exists():
            with config_path.open("r", encoding="utf-8") as fh:
                _STANDARDS_CACHE = json.load(fh)
        else:
            _STANDARDS_CACHE = {}
    except Exception:
        _STANDARDS_CACHE = {}
    return _STANDARDS_CACHE


def _detect_hierarchy_level(access_level: Optional[str]) -> Optional[int]:
    """Determine hierarchy level from standards config."""
    if not access_level:
        return None

    standards = _load_standards()
    access_levels = standards.get("access_levels", {})
    hierarchy = access_levels.get("hierarchy", {})
    additional = access_levels.get("additional_levels", {})

    for level_data in hierarchy.values():
        if level_data.get("name") == access_level:
            return level_data.get("level")

    for level_data in additional.values():
        if level_data.get("name") == access_level:
            return level_data.get("level")

    return None


def extract_module_and_access_level(name: Optional[str]) -> Tuple[Optional[str], Optional[str], Optional[int]]:
    """Extract module/access level metadata from a security group name."""
    if not name:
        return None, None, None

    standards = _load_standards()
    naming_config = standards.get("naming_convention", {})
    pattern = naming_config.get("regex") or r"^Odoo - (.+) / (.+)$"
    match = re.match(pattern, name)
    if match:
        module = match.group(1).strip()
        access_level = match.group(2).strip()
        hierarchy_level = _detect_hierarchy_level(access_level)
        return module, access_level, hierarchy_level

    alt_match = re.match(r"^(.+?) / (.+)$", name)
    if alt_match:
        module = alt_match.group(1).strip()
        access_level = alt_match.group(2).strip()
        hierarchy_level = _detect_hierarchy_level(access_level)
        return module, access_level, hierarchy_level

    if " / " in name:
        module, _, access_level = name.partition(" / ")
        module = module.strip() or None
        access_level = access_level.strip() or None
        hierarchy_level = _detect_hierarchy_level(access_level) if access_level else None
        return module, access_level, hierarchy_level

    return None, None, None


def _normalize_translated_value(value):
    """Handle Odoo translated/json fields and binary text."""
    if isinstance(value, dict):
        return next(iter(value.values())) if value else None
    if isinstance(value, memoryview):
        try:
            value = value.tobytes()
        except Exception:
            value = bytes(value)
    if isinstance(value, (bytes, bytearray)):
        try:
            return value.decode("utf-8")
        except Exception:
            return value.decode("latin-1", errors="ignore")
    return value


def _load_mock_payload() -> Dict:
    path = settings.resolve_mock_path(settings.odoo_sync_mock_file)
    if not path:
        raise RuntimeError("Odoo sync mock file not found")
    with path.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def _fetch_from_postgres() -> Dict:
    if not settings.odoo_configured:
        raise RuntimeError("ODOO_POSTGRES_DSN is not configured")

    # Convert SQLAlchemy DSN format to psycopg format
    dsn = settings.odoo_postgres_dsn
    if dsn.startswith("postgresql+psycopg://"):
        dsn = dsn.replace("postgresql+psycopg://", "postgresql://", 1)

    with psycopg.connect(dsn) as conn:
        with conn.cursor() as cur:
            category_map = {}
            try:
                cur.execute(
                    "SELECT id, name FROM ir_module_category ORDER BY id"
                )
                for row in cur.fetchall():
                    category_name = _normalize_translated_value(row[1])
                    if isinstance(category_name, str):
                        category_name = category_name.strip()
                    category_map[row[0]] = category_name
            except Exception:
                category_map = {}

            cur.execute(
                "SELECT column_name FROM information_schema.columns WHERE table_name = 'res_groups'"
            )
            res_group_columns = {row[0] for row in cur.fetchall()}
            documentation_columns = []
            for column in ("allowed_functions", "allowed_records", "allowed_fields", "inheritance_notes"):
                if column in res_group_columns:
                    documentation_columns.append(column)

            group_select_columns = [
                "id",
                "name",
                "category_id",
                "write_date",
                "create_date",
                "create_uid",
                "write_uid",
            ] + documentation_columns

            cur.execute(
                f"SELECT {', '.join(group_select_columns)} FROM res_groups ORDER BY id"
            )
            groups = []
            for row in cur.fetchall():
                row_map = {group_select_columns[idx]: row[idx] for idx in range(len(group_select_columns))}

                name = _normalize_translated_value(row_map.get("name"))
                if isinstance(name, str):
                    name = name.strip()

                category_id = row_map.get("category_id")
                application = category_map.get(category_id)
                if isinstance(application, str):
                    application = application.strip()

                group_record = {
                    "id": row_map.get("id"),
                    "name": name,
                    "category_id": category_id,
                    "category_name": application,
                    "application": application,
                    "module_name": application,
                    "odoo_updated_at": row_map.get("write_date"),
                    "odoo_created_at": row_map.get("create_date"),
                    "odoo_updated_by_id": row_map.get("write_uid"),
                    "odoo_created_by_id": row_map.get("create_uid"),
                }

                for column in documentation_columns:
                    group_record[column] = _normalize_translated_value(row_map.get(column))

                groups.append(group_record)

            # Check if name column exists in res_users (some Odoo versions have it denormalized)
            # Note: We don't join with res_partner because the read-only user doesn't have access to it
            try:
                cur.execute("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'res_users' AND column_name = 'name'
                """)
                has_name_column = cur.fetchone() is not None
            except Exception:
                # If we can't check, assume no name column
                has_name_column = False
            
            if has_name_column:
                # Odoo version with name directly in res_users
                cur.execute(
                    "SELECT id, name, login, write_date FROM res_users WHERE active = TRUE ORDER BY id"
                )
                users = [
                    {
                        "id": row[0],
                        "name": row[1] or row[2] or f"User-{row[0]}",  # Fallback to login or User-ID
                        "login": row[2],
                        "write_date": row[3].isoformat() if row[3] else None,
                    }
                    for row in cur.fetchall()
                ]
            else:
                # No name column - use login as name (login is typically email/username)
                cur.execute(
                    "SELECT id, login, write_date FROM res_users WHERE active = TRUE ORDER BY id"
                )
                users = [
                    {
                        "id": row[0],
                        "name": row[1] or f"User-{row[0]}",  # Use login as name
                        "login": row[1],
                        "write_date": row[2].isoformat() if row[2] else None,
                    }
                    for row in cur.fetchall()
                ]

            user_name_lookup = {user["id"]: user["name"] for user in users if user.get("id")}
            for record in groups:
                created_by_id = record.pop("odoo_created_by_id", None)
                updated_by_id = record.pop("odoo_updated_by_id", None)
                if created_by_id:
                    record["odoo_created_by"] = user_name_lookup.get(created_by_id)
                if updated_by_id:
                    record["odoo_updated_by"] = user_name_lookup.get(updated_by_id)

            # Discover column names for res_groups_users_rel (column names vary by Odoo version)
            # Common patterns: (gid, uid), (uid, gid), (user_id, group_id), (group_id, user_id)
            try:
                cur.execute("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'res_groups_users_rel'
                    ORDER BY ordinal_position
                """)
                membership_columns = [row[0] for row in cur.fetchall()]
                
                if len(membership_columns) >= 2:
                    col1, col2 = membership_columns[0], membership_columns[1]
                    # Validate column names contain only alphanumeric and underscore (safe for SQL)
                    if col1.replace('_', '').isalnum() and col2.replace('_', '').isalnum():
                        cur.execute(f'SELECT "{col1}", "{col2}" FROM res_groups_users_rel')
                        # Determine which column is group_id and which is user_id based on column names
                        # Common patterns: gid=group, uid=user OR group_id=group, user_id=user
                        if 'gid' in col1.lower() or 'group' in col1.lower():
                            # First column is group, second is user
                            memberships = [{"user_id": row[1], "group_id": row[0]} for row in cur.fetchall()]
                        elif 'uid' in col1.lower() or 'user' in col1.lower():
                            # First column is user, second is group
                            memberships = [{"user_id": row[0], "group_id": row[1]} for row in cur.fetchall()]
                        else:
                            # Default: assume first is group, second is user (most common pattern)
                            memberships = [{"user_id": row[1], "group_id": row[0]} for row in cur.fetchall()]
                    else:
                        memberships = []
                else:
                    memberships = []
            except Exception:
                # Table might not exist or we can't access it
                memberships = []

            # Discover column names for res_groups_implied_rel (column names vary by Odoo version)
            # Common patterns: (gid, hid), (gid1, gid2), (parent_id, child_id), (group_id, implied_id)
            try:
                cur.execute("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'res_groups_implied_rel'
                    ORDER BY ordinal_position
                """)
                implied_columns = [row[0] for row in cur.fetchall()]
                
                if len(implied_columns) >= 2:
                    col1, col2 = implied_columns[0], implied_columns[1]
                    # Validate column names contain only alphanumeric and underscore (safe for SQL)
                    if col1.replace('_', '').isalnum() and col2.replace('_', '').isalnum():
                        cur.execute(f'SELECT "{col1}", "{col2}" FROM res_groups_implied_rel')
                        # Determine which column is parent and which is child based on column names
                        # Common patterns: gid=parent, hid/gid2=child OR parent_id=parent, child_id=child
                        if 'hid' in col2.lower() or 'child' in col2.lower() or 'implied' in col2.lower():
                            # Second column is child/implied group
                            inheritance = [{"parent_id": row[0], "child_id": row[1]} for row in cur.fetchall()]
                        elif 'parent' in col1.lower():
                            # First column is parent
                            inheritance = [{"parent_id": row[0], "child_id": row[1]} for row in cur.fetchall()]
                        else:
                            # Default: assume first is parent, second is child
                            inheritance = [{"parent_id": row[0], "child_id": row[1]} for row in cur.fetchall()]
                    else:
                        inheritance = []
                else:
                    # Table exists but has unexpected structure
                    inheritance = []
            except Exception:
                # Table might not exist or we can't access it
                inheritance = []

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
                access_rights = []
                for row in cur.fetchall():
                    # Handle translated fields - model_name might be a dict
                    model_name = row[3]
                    if isinstance(model_name, dict):
                        model_name = next(iter(model_name.values())) if model_name else None
                    
                    access_rights.append({
                        "id": row[0],
                        "group_id": row[1],
                        "model": row[2],
                        "model_name": model_name,
                        "perm_read": row[4],
                        "perm_write": row[5],
                        "perm_create": row[6],
                        "perm_unlink": row[7],
                    })
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
    """Upsert groups, users, memberships, inheritance, and access rights in a single transaction."""
    now = datetime.now(timezone.utc)
    groups_created = 0
    groups_updated = 0
    users_created = 0
    users_updated = 0
    access_rights_created = 0

    group_lookup: Dict[int, SecurityGroup] = {}
    user_lookup: Dict[int, User] = {}

    try:
        # Process groups
        for record in payload.get("groups", []):
            gid = record.get("id")
            name = record.get("name")
            if not name:
                continue

            application_name = (
                record.get("application")
                or record.get("module_name")
                or record.get("category_name")
            )
            if isinstance(application_name, str):
                application_name = application_name.strip() or None

            parsed_module, parsed_access_level, parsed_hierarchy_level = extract_module_and_access_level(name)
            module_value = application_name or parsed_module
            access_level_value = record.get("access_level") or parsed_access_level
            hierarchy_level_value = record.get("hierarchy_level") or parsed_hierarchy_level

            group = None
            # First try to find by odoo_id (most reliable)
            if gid:
                group = db.query(SecurityGroup).filter(SecurityGroup.odoo_id == gid).first()
            # Then try by exact name match
            if not group:
                group = db.query(SecurityGroup).filter(SecurityGroup.name == name).first()

            if not group:
                # Try to create new group
                try:
                    group = SecurityGroup(
                        name=name,
                        module=module_value,
                        category=application_name,
                        access_level=access_level_value,
                        hierarchy_level=hierarchy_level_value,
                    )
                    db.add(group)
                    db.flush()  # Flush to get the ID and catch any constraint violations early
                    groups_created += 1
                except IntegrityError:
                    # Group was created between our check and insert, or name conflict
                    db.rollback()
                    # Refresh session and try to find it again
                    db.expire_all()
                    group = db.query(SecurityGroup).filter(SecurityGroup.name == name).first()
                    if not group:
                        # Still not found, skip this group
                        continue
                    groups_updated += 1
            else:
                groups_updated += 1

            # Update group with Odoo sync information
            group.odoo_id = gid
            # Tag with environment (e.g., "Odoo (Pre-Production)" or "Odoo (Production)")
            env_display = settings.odoo_environment_display
            group.source_system = f"Odoo ({env_display})"
            group.synced_from_postgres_at = now
            if application_name:
                group.module = application_name
                group.category = application_name
            elif module_value and not group.module:
                group.module = module_value
            if access_level_value and not group.access_level:
                group.access_level = access_level_value
            if hierarchy_level_value is not None and group.hierarchy_level is None:
                group.hierarchy_level = hierarchy_level_value
            if record.get("purpose") is not None:
                group.purpose = record.get("purpose")
            group.allowed_functions = record.get("allowed_functions")
            group.allowed_records = record.get("allowed_records")
            group.allowed_fields = record.get("allowed_fields")
            if record.get("user_access") is not None:
                group.user_access = record.get("user_access")
            group.inheritance_notes = record.get("inheritance_notes")
            group.odoo_created_by = record.get("odoo_created_by")
            group.odoo_created_at = _parse_datetime(record.get("odoo_created_at"))
            group.odoo_updated_by = record.get("odoo_updated_by")
            group.odoo_updated_at = (
                _parse_datetime(record.get("odoo_updated_at"))
                or _parse_datetime(record.get("write_date"))
            )
            group_lookup[gid] = group

        # Process users
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
                try:
                    user = User(name=name or email or f"Odoo-{uid}")
                    db.add(user)
                    db.flush()  # Flush to catch constraint violations early
                    users_created += 1
                except IntegrityError:
                    # User was created between our check and insert, or email conflict
                    db.rollback()
                    db.expire_all()
                    # Try to find it again by email
                    if email:
                        user = db.query(User).filter(User.email == email).first()
                    if not user and uid:
                        user = db.query(User).filter(User.odoo_user_id == uid).first()
                    if not user:
                        # Still not found, skip this user
                        continue
                    users_updated += 1
            else:
                users_updated += 1

            user.odoo_user_id = uid
            user.email = email or user.email
            # Tag with environment (e.g., "Odoo (Pre-Production)" or "Odoo (Production)")
            env_display = settings.odoo_environment_display
            user.source_system = f"Odoo ({env_display})"
            hidden_user_registry.apply_hidden_flag(user)
            user_lookup[uid] = user

        # Membership associations
        for membership in payload.get("memberships", []):
            uid = membership.get("user_id")
            gid = membership.get("group_id")
            user = user_lookup.get(uid)
            group = group_lookup.get(gid)
            if user and group:
                try:
                    if user not in group.users:
                        group.users.append(user)
                except Exception as e:
                    # Log but continue - relationship might already exist or object detached
                    # Refresh objects if needed
                    db.refresh(group)
                    db.refresh(user)
                    if user not in group.users:
                        group.users.append(user)

        # Inheritance relationships
        for relation in payload.get("inheritance", []):
            parent = group_lookup.get(relation.get("parent_id"))
            child = group_lookup.get(relation.get("child_id"))
            if parent and child:
                try:
                    if parent not in child.parent_groups:
                        child.parent_groups.append(parent)
                except Exception as e:
                    # Log but continue - relationship might already exist or object detached
                    # Refresh objects if needed
                    db.refresh(child)
                    db.refresh(parent)
                    if parent not in child.parent_groups:
                        child.parent_groups.append(parent)

        # Access rights (CRUD permissions)
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
                try:
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
                    db.flush()  # Flush to catch constraint violations early
                    access_rights_created += 1
                except IntegrityError:
                    # Access right was created between our check and insert
                    db.rollback()
                    db.expire_all()
                    # Try to find it again and update instead
                    existing = (
                        db.query(AccessRight)
                        .filter(
                            AccessRight.group_id == group.id,
                            AccessRight.odoo_access_id == ar_record.get("id"),
                        )
                        .first()
                    )
                    if existing:
                        existing.perm_read = ar_record.get("perm_read", False)
                        existing.perm_write = ar_record.get("perm_write", False)
                        existing.perm_create = ar_record.get("perm_create", False)
                        existing.perm_unlink = ar_record.get("perm_unlink", False)
                        existing.synced_at = now
                    # If still not found, skip this access right
            else:
                # Update existing
                existing.perm_read = ar_record.get("perm_read", False)
                existing.perm_write = ar_record.get("perm_write", False)
                existing.perm_create = ar_record.get("perm_create", False)
                existing.perm_unlink = ar_record.get("perm_unlink", False)
                existing.synced_at = now

        for group in group_lookup.values():
            group.refresh_documentation_status()
            if group.last_audit_date:
                group.is_overdue_audit = (date.today() - group.last_audit_date).days > 365
            else:
                group.is_overdue_audit = False

        # Single commit at the end
        db.commit()

    except Exception as e:
        # Rollback entire transaction on any error
        db.rollback()
        raise

    total_groups = db.query(SecurityGroup).count()
    documented_groups = db.query(SecurityGroup).filter(SecurityGroup.is_documented.is_(True)).count()
    total_access_rights = db.query(AccessRight).count()
    orphaned_groups = (
        db.query(SecurityGroup)
        .outerjoin(user_group_association, SecurityGroup.id == user_group_association.c.group_id)
        .group_by(SecurityGroup.id)
        .having(func.count(user_group_association.c.user_id) == 0)
        .count()
    )

    return {
        "groups_processed": len(payload.get("groups", [])),
        "users_processed": len(payload.get("users", [])),
        "groups_created": groups_created,
        "groups_updated": groups_updated,
        "users_created": users_created,
        "users_updated": users_updated,
        "access_rights_synced": len(payload.get("access_rights", [])),
        "access_rights_created": access_rights_created,
        "total_groups": total_groups,
        "documented_groups": documented_groups,
        "total_access_rights": total_access_rights,
        "orphaned_groups": orphaned_groups,
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
