"""
FastAPI backend for Odoo Security Management Application.
"""
from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, field_validator
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
import csv
import io
import os
import tempfile
from datetime import datetime, date, timezone
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv()

from app.backend.database import get_db, init_db
from app.backend.settings import settings
from app.backend.services.azure_sync import sync_azure_users
from app.backend.services.odoo_sync import sync_odoo_postgres
from app.backend.services.sync_runs import list_recent_syncs, serialize_sync_run
from app.backend.services.comparison_service import (
    run_user_comparison,
    get_comparison_results,
    get_comparison_summary,
    mark_discrepancy_resolved,
)
from app.data.models import SecurityGroup, User, ImportHistory, user_group_association, AccessRight, ComparisonResult
from app.data.csv_parser import CSVParser

app = FastAPI(
    title="Odoo Security Management API",
    description="API for managing and analyzing Odoo security groups",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    init_db()

# Standards config path
STANDARDS_CONFIG = os.path.join(os.path.dirname(__file__), "..", "config", "standards.json")


class GroupUpdateRequest(BaseModel):
    """Payload for updating group documentation/status."""
    status: Optional[str] = None
    who_requires: Optional[str] = None
    why_required: Optional[str] = None
    notes: Optional[str] = None
    last_audit_date: Optional[date] = None
    is_archived: Optional[bool] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: Optional[str]) -> Optional[str]:
        """Validate status input."""
        if value is None:
            return value
        allowed = {"Under Review", "Confirmed", "Deprecated"}
        if value not in allowed:
            raise ValueError(f"Status must be one of {', '.join(sorted(allowed))}")
        return value

    @field_validator("who_requires", "why_required", "notes")
    @classmethod
    def normalize_text(cls, value: Optional[str]) -> Optional[str]:
        """Normalize whitespace for text fields."""
        if value is None:
            return value
        cleaned = value.strip()
        return cleaned if cleaned else None


def refresh_group_compliance_flags(group: SecurityGroup) -> None:
    """Recalculate documentation/compliance helper fields."""
    group.has_required_fields = bool(group.who_requires and group.why_required)
    group.is_documented = bool(group.who_requires and group.why_required)
    if group.last_audit_date:
        group.is_overdue_audit = (date.today() - group.last_audit_date).days > 365
    else:
        group.is_overdue_audit = False


def serialize_group(group: SecurityGroup) -> dict:
    """Serialize group model for API responses."""
    return {
        "id": group.id,
        "name": group.name,
        "module": group.module,
        "access_level": group.access_level,
        "hierarchy_level": group.hierarchy_level,
        "purpose": group.purpose,
        "purpose_html": group.purpose_html,
        "status": group.status,
        "user_access": group.user_access,
        "user_access_html": group.user_access_html,
        "permissions": group.permissions,
        "who_requires": group.who_requires,
        "why_required": group.why_required,
        "last_audit_date": group.last_audit_date.isoformat() if group.last_audit_date else None,
        "follows_naming_convention": group.follows_naming_convention,
        "has_required_fields": group.has_required_fields,
        "is_documented": group.is_documented,
        "is_overdue_audit": group.is_overdue_audit,
        "is_archived": group.is_archived,
        "source_system": group.source_system,
        "odoo_id": group.odoo_id,
        "synced_from_postgres_at": group.synced_from_postgres_at.isoformat() if group.synced_from_postgres_at else None,
        "category": group.category,
        "notes": group.notes,
        "users": [{"id": u.id, "name": u.name, "department": u.department} for u in group.users],
        "parent_groups": [{"id": p.id, "name": p.name} for p in group.parent_groups],
        "child_groups": [{"id": c.id, "name": c.name} for c in group.child_groups],
        "created_at": group.created_at.isoformat() if group.created_at else None,
        "updated_at": group.updated_at.isoformat() if group.updated_at else None
    }


def create_csv_response(rows: List[List[str]], headers: List[str], filename: str) -> StreamingResponse:
    """Helper to stream CSV downloads."""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(headers)
    writer.writerows(rows)
    output.seek(0)
    response = StreamingResponse(iter([output.getvalue()]), media_type="text/csv")
    response.headers["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


@app.post("/api/import")
async def import_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Import CSV file and process security groups.
    """
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix='.csv') as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_file_path = tmp_file.name
        
        # Parse CSV
        parser = CSVParser(standards_config_path=STANDARDS_CONFIG)
        groups_data = parser.parse_csv(tmp_file_path)
        
        # Validate data
        validation = parser.validate_data(groups_data)
        
        # Create import history record
        import_history = ImportHistory(
            import_date=datetime.now(timezone.utc),
            filename=file.filename,
            total_groups=len(groups_data),
            total_users=len(set(user for group in groups_data for user in group.get('users', []))),
            status="Success" if not validation['errors'] else "Partial",
            error_count=len(validation['errors']),
            notes=f"Imported {len(groups_data)} groups"
        )
        db.add(import_history)
        db.flush()
        # Store import_history_id to restore after rollback if needed
        import_history_id = import_history.id
        
        # Process and store groups
        groups_created = 0
        groups_updated = 0
        users_created = 0
        
        for group_data in groups_data:
            # Use get_or_create pattern with proper error handling
            group_name = group_data['name']
            
            # Try to get existing group
            existing_group = db.query(SecurityGroup).filter(
                SecurityGroup.name == group_name
            ).first()
            
            if existing_group:
                # Update existing group with all fields from import
                group = existing_group
                update_fields = False
                if group_data.get('module') is not None:
                    group.module = group_data.get('module')
                    update_fields = True
                if group_data.get('access_level') is not None:
                    group.access_level = group_data.get('access_level')
                    update_fields = True
                if group_data.get('hierarchy_level') is not None:
                    group.hierarchy_level = group_data.get('hierarchy_level')
                    update_fields = True
                if group_data.get('purpose') is not None:
                    group.purpose = group_data.get('purpose')
                    update_fields = True
                if group_data.get('purpose_html') is not None:
                    group.purpose_html = group_data.get('purpose_html')
                    update_fields = True
                if group_data.get('status') is not None:
                    group.status = group_data.get('status', 'Under Review')
                    update_fields = True
                if group_data.get('user_access') is not None:
                    group.user_access = group_data.get('user_access')
                    update_fields = True
                if group_data.get('user_access_html') is not None:
                    group.user_access_html = group_data.get('user_access_html')
                    update_fields = True
                if group_data.get('follows_naming_convention') is not None:
                    group.follows_naming_convention = group_data.get('follows_naming_convention', False)
                    update_fields = True
                group.import_history_id = import_history.id
                if update_fields:
                    groups_updated += 1
            else:
                # Create new group - use try/except to handle race conditions
                group = None
                try:
                    group = SecurityGroup(
                        name=group_name,
                        module=group_data.get('module'),
                        access_level=group_data.get('access_level'),
                        hierarchy_level=group_data.get('hierarchy_level'),
                        purpose=group_data.get('purpose'),
                        purpose_html=group_data.get('purpose_html'),
                        status=group_data.get('status', 'Under Review'),
                        user_access=group_data.get('user_access'),
                        user_access_html=group_data.get('user_access_html'),
                        follows_naming_convention=group_data.get('follows_naming_convention', False),
                        import_history_id=import_history.id
                    )
                    db.add(group)
                    db.flush()  # Flush to trigger any IntegrityError immediately
                    groups_created += 1
                except IntegrityError:
                    # Group was created between check and insert - rollback and update instead
                    db.rollback()
                    # Re-add import_history to session
                    db.add(import_history)
                    db.flush()
                    import_history_id = import_history.id
                    # Query again for the existing group (it should exist now)
                    existing_group = db.query(SecurityGroup).filter(
                        SecurityGroup.name == group_name
                    ).first()
                    if existing_group:
                        # Update existing group
                        group = existing_group
                        if group_data.get('module') is not None:
                            group.module = group_data.get('module')
                        if group_data.get('access_level') is not None:
                            group.access_level = group_data.get('access_level')
                        if group_data.get('hierarchy_level') is not None:
                            group.hierarchy_level = group_data.get('hierarchy_level')
                        if group_data.get('purpose') is not None:
                            group.purpose = group_data.get('purpose')
                        if group_data.get('purpose_html') is not None:
                            group.purpose_html = group_data.get('purpose_html')
                        if group_data.get('status') is not None:
                            group.status = group_data.get('status', 'Under Review')
                        if group_data.get('user_access') is not None:
                            group.user_access = group_data.get('user_access')
                        if group_data.get('user_access_html') is not None:
                            group.user_access_html = group_data.get('user_access_html')
                        if group_data.get('follows_naming_convention') is not None:
                            group.follows_naming_convention = group_data.get('follows_naming_convention', False)
                        group.import_history_id = import_history.id
                        groups_updated += 1
                    else:
                        # This shouldn't happen, but re-raise if it does
                        raise HTTPException(
                            status_code=500,
                            detail=f"Group '{group_name}' should exist but was not found after rollback. This indicates a database consistency issue."
                        )
            
            # Ensure we have a group object before processing users
            if not group:
                continue
            
            # Process users
            for user_name in group_data.get('users', []):
                if not user_name:
                    continue
                
                # Get or create user
                user = db.query(User).filter(User.name == user_name).first()
                if not user:
                    user = User(name=user_name)
                    db.add(user)
                    users_created += 1
                    db.flush()
                
                # Associate user with group if not already associated
                if user not in group.users:
                    group.users.append(user)
            
            # Process inheritance (simplified - would need more parsing)
            if group_data.get('inherits'):
                # This would need more sophisticated parsing
                pass
        
        db.commit()
        
        # Clean up temp file
        os.unlink(tmp_file_path)
        
        return {
            "success": True,
            "import_id": import_history.id,
            "groups_imported": len(groups_data),
            "groups_created": groups_created,
            "groups_updated": groups_updated,
            "users_created": users_created,
            "validation": validation
        }
    
    except Exception as e:
        # Clean up temp file if it exists
        if 'tmp_file_path' in locals():
            try:
                os.unlink(tmp_file_path)
            except:
                pass
        
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/groups")
async def get_groups(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    module: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get list of security groups with optional filters."""
    query = (
        db.query(SecurityGroup)
        .options(joinedload(SecurityGroup.parent_groups))
    )
    
    if module:
        query = query.filter(SecurityGroup.module == module)
    if status:
        query = query.filter(SecurityGroup.status == status)
    if search:
        query = query.filter(
            SecurityGroup.name.contains(search) |
            SecurityGroup.purpose.contains(search)
        )
    
    total = query.count()
    groups = query.offset(skip).limit(limit).all()
    
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "groups": [
            {
                "id": g.id,
                "name": g.name,
                "module": g.module,
                "access_level": g.access_level,
                "hierarchy_level": g.hierarchy_level,
                "purpose": g.purpose,
                "status": g.status,
                "follows_naming_convention": g.follows_naming_convention,
                "has_required_fields": g.has_required_fields,
                "is_archived": g.is_archived,
                "source_system": g.source_system,
                "synced_from_postgres_at": g.synced_from_postgres_at.isoformat() if g.synced_from_postgres_at else None,
                "parent_groups": [{"id": p.id, "name": p.name} for p in g.parent_groups],
                "user_count": len(g.users),
                "last_audit_date": g.last_audit_date.isoformat() if g.last_audit_date else None
            }
            for g in groups
        ]
    }


@app.get("/api/modules")
async def get_modules(
    db: Session = Depends(get_db)
):
    """Return distinct modules with counts for filtering."""
    module_rows = (
        db.query(SecurityGroup.module, func.count(SecurityGroup.id).label("count"))
        .filter(SecurityGroup.module.isnot(None))
        .group_by(SecurityGroup.module)
        .order_by(SecurityGroup.module.asc())
        .all()
    )
    
    return {
        "total": len(module_rows),
        "modules": [
            {"name": row[0], "count": row[1]}
            for row in module_rows
        ]
    }


@app.get("/api/groups/{group_id}")
async def get_group(
    group_id: int,
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific security group."""
    group = db.query(SecurityGroup).filter(SecurityGroup.id == group_id).first()
    
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    return serialize_group(group)


@app.patch("/api/groups/{group_id}")
async def update_group(
    group_id: int,
    payload: GroupUpdateRequest,
    db: Session = Depends(get_db)
):
    """Update documentation/status fields for a specific group."""
    group = db.query(SecurityGroup).filter(SecurityGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    updates = payload.model_dump(exclude_unset=True)
    if "status" in updates:
        group.status = updates["status"]
    if "who_requires" in updates:
        group.who_requires = updates["who_requires"]
    if "why_required" in updates:
        group.why_required = updates["why_required"]
    if "notes" in updates:
        group.notes = updates["notes"]
    if "last_audit_date" in updates:
        group.last_audit_date = updates["last_audit_date"]
    if "is_archived" in updates:
        group.is_archived = bool(updates["is_archived"])
    
    refresh_group_compliance_flags(group)
    db.add(group)
    db.commit()
    db.refresh(group)
    
    return serialize_group(group)


@app.get("/api/users")
async def get_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = None,
    include_hidden: bool = Query(False, description="Include hidden users"),
    db: Session = Depends(get_db)
):
    """Get list of users with their group assignments."""
    query = db.query(User)

    # By default, exclude hidden users
    if not include_hidden:
        query = query.filter(User.is_hidden == False)

    if search:
        query = query.filter(User.name.contains(search))

    total = query.count()
    users = query.offset(skip).limit(limit).all()
    
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "users": [
            {
                "id": u.id,
                "name": u.name,
                "email": u.email,
                "department": u.department,
                "source_system": u.source_system,
                "azure_id": u.azure_id,
                "odoo_user_id": u.odoo_user_id,
                "last_seen_in_azure_at": u.last_seen_in_azure_at.isoformat() if u.last_seen_in_azure_at else None,
                "is_hidden": u.is_hidden,
                "group_count": len(u.groups),
                "groups": [{"id": g.id, "name": g.name} for g in u.groups]
            }
            for u in users
        ]
    }


class HideUsersRequest(BaseModel):
    """Request body for hiding/unhiding users."""
    user_ids: list[int]


@app.post("/api/users/hide")
async def hide_users(
    request: HideUsersRequest,
    db: Session = Depends(get_db)
):
    """Hide multiple users from views and comparisons."""
    if not request.user_ids:
        raise HTTPException(status_code=400, detail="No user IDs provided")

    users = db.query(User).filter(User.id.in_(request.user_ids)).all()

    if not users:
        raise HTTPException(status_code=404, detail="No users found with provided IDs")

    hidden_count = 0
    for user in users:
        if not user.is_hidden:
            user.is_hidden = True
            hidden_count += 1

    db.commit()

    return {
        "success": True,
        "hidden_count": hidden_count,
        "total_selected": len(request.user_ids)
    }


@app.post("/api/users/unhide")
async def unhide_users(
    request: HideUsersRequest,
    db: Session = Depends(get_db)
):
    """Unhide multiple users (restore to visible)."""
    if not request.user_ids:
        raise HTTPException(status_code=400, detail="No user IDs provided")

    users = db.query(User).filter(User.id.in_(request.user_ids)).all()

    if not users:
        raise HTTPException(status_code=404, detail="No users found with provided IDs")

    unhidden_count = 0
    for user in users:
        if user.is_hidden:
            user.is_hidden = False
            unhidden_count += 1

    db.commit()

    return {
        "success": True,
        "unhidden_count": unhidden_count,
        "total_selected": len(request.user_ids)
    }


@app.get("/api/inheritance")
async def get_inheritance(
    db: Session = Depends(get_db)
):
    """Get all inheritance relationships."""
    groups = db.query(SecurityGroup).all()
    
    relationships = []
    for group in groups:
        for parent in group.parent_groups:
            relationships.append({
                "parent": {"id": parent.id, "name": parent.name},
                "child": {"id": group.id, "name": group.name}
            })
    
    return {
        "total": len(relationships),
        "relationships": relationships
    }


@app.get("/api/analysis/compliance")
async def get_compliance_analysis(
    db: Session = Depends(get_db)
):
    """Analyze compliance with standards."""
    groups = db.query(SecurityGroup).all()
    
    total = len(groups)
    follows_naming = sum(1 for g in groups if g.follows_naming_convention)
    has_required_fields = sum(1 for g in groups if g.has_required_fields)
    is_documented = sum(1 for g in groups if g.is_documented)
    
    non_compliant = [
        {
            "id": g.id,
            "name": g.name,
            "issues": []
        }
        for g in groups
        if not g.follows_naming_convention or not g.has_required_fields
    ]
    
    for group in non_compliant:
        g = next((g for g in groups if g.id == group["id"]), None)
        if g:
            if not g.follows_naming_convention:
                group["issues"].append("Does not follow naming convention")
            if not g.has_required_fields:
                group["issues"].append("Missing required fields")
            if not g.is_documented:
                group["issues"].append("Not documented")
    
    return {
        "total_groups": total,
        "follows_naming_convention": follows_naming,
        "has_required_fields": has_required_fields,
        "is_documented": is_documented,
        "compliance_percentage": round((follows_naming / total * 100) if total > 0 else 0, 2),
        "non_compliant_groups": non_compliant
    }


@app.get("/api/analysis/gaps")
async def get_gap_analysis(
    db: Session = Depends(get_db)
):
    """Identify documentation gaps."""
    groups = db.query(SecurityGroup).all()
    
    undocumented = [g for g in groups if not g.is_documented]
    missing_who = [g for g in groups if not g.who_requires]
    missing_why = [g for g in groups if not g.why_required]
    missing_audit = [g for g in groups if not g.last_audit_date]
    
    # Check for overdue audits (more than 365 days)
    today = date.today()
    overdue_audit = [
        g for g in groups
        if g.last_audit_date and (today - g.last_audit_date).days > 365
    ]
    
    return {
        "undocumented_groups": len(undocumented),
        "missing_who": len(missing_who),
        "missing_why": len(missing_why),
        "missing_audit_date": len(missing_audit),
        "overdue_audit": len(overdue_audit),
        "undocumented_list": [{"id": g.id, "name": g.name} for g in undocumented[:50]],
        "missing_who_list": [{"id": g.id, "name": g.name} for g in missing_who[:50]],
        "missing_why_list": [{"id": g.id, "name": g.name} for g in missing_why[:50]],
        "overdue_audit_list": [{"id": g.id, "name": g.name, "last_audit": g.last_audit_date.isoformat()} for g in overdue_audit[:50]]
    }


@app.get("/api/export/groups")
async def export_groups_csv(
    module: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Export filtered groups to CSV."""
    query = db.query(SecurityGroup)
    query = query.options(joinedload(SecurityGroup.parent_groups))
    
    if module:
        query = query.filter(SecurityGroup.module == module)
    if status:
        query = query.filter(SecurityGroup.status == status)
    if search:
        query = query.filter(
            SecurityGroup.name.contains(search) |
            SecurityGroup.purpose.contains(search)
        )
    
    groups = query.order_by(SecurityGroup.name.asc()).all()
    rows = [
        [
            g.id,
            g.name,
            g.module or "",
            g.status or "",
            g.access_level or "",
            g.who_requires or "",
            g.why_required or "",
            len(g.users),
            g.last_audit_date.isoformat() if g.last_audit_date else "",
            "Yes" if g.follows_naming_convention else "No",
            "Yes" if g.has_required_fields else "No",
            "Yes" if g.is_archived else "No",
            "; ".join(parent.name for parent in g.parent_groups)
        ]
        for g in groups
    ]
    
    headers = [
        "ID",
        "Name",
        "Module",
        "Status",
        "Access Level",
        "Who Requires",
        "Why Required",
        "User Count",
        "Last Audit Date",
        "Naming Compliant",
        "Has Required Fields",
        "Archived",
        "Parent Groups"
    ]
    
    return create_csv_response(rows, headers, "groups_export.csv")


@app.get("/api/export/users")
async def export_users_csv(
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Export users with group assignments to CSV."""
    query = db.query(User)
    if search:
        query = query.filter(User.name.contains(search))
    users = query.order_by(User.name.asc()).all()
    
    rows = []
    for user in users:
        group_names = sorted(group.name for group in user.groups)
        rows.append([
            user.id,
            user.name,
            user.email or "",
            user.department or "",
            user.source_system or "",
            user.azure_id or "",
            user.odoo_user_id or "",
            user.last_seen_in_azure_at.isoformat() if user.last_seen_in_azure_at else "",
            len(group_names),
            "; ".join(group_names)
        ])
    
    headers = [
        "ID",
        "Name",
        "Email",
        "Department",
        "Source System",
        "Azure ID",
        "Odoo User ID",
        "Last Seen In Azure",
        "Group Count",
        "Groups",
    ]
    return create_csv_response(rows, headers, "users_export.csv")


@app.get("/api/export/analysis/non-compliant")
async def export_non_compliant_analysis(
    db: Session = Depends(get_db)
):
    """Export non-compliant group analysis to CSV."""
    groups = db.query(SecurityGroup).all()
    rows = []
    for group in groups:
        issues = []
        if not group.follows_naming_convention:
            issues.append("Does not follow naming convention")
        if not group.has_required_fields:
            issues.append("Missing required fields")
        if not group.is_documented:
            issues.append("Not documented")
        if issues:
            rows.append([
                group.id,
                group.name,
                group.module or "",
                "; ".join(issues)
            ])
    
    headers = ["ID", "Name", "Module", "Issues"]
    return create_csv_response(rows, headers, "non_compliant_groups.csv")


@app.post("/api/sync/azure-users")
async def trigger_azure_user_sync(
    db: Session = Depends(get_db)
):
    """Trigger Azure/Entra directory sync."""
    try:
        stats = sync_azure_users(db)
        return {"status": "completed", "stats": stats}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/sync/odoo-db")
async def trigger_odoo_db_sync(
    db: Session = Depends(get_db)
):
    """Trigger remote Odoo Postgres sync."""
    try:
        stats = sync_odoo_postgres(db)
        return {"status": "completed", "stats": stats}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/api/sync/status")
async def get_sync_status(
    sync_type: Optional[str] = None,
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """Return recent sync run metadata."""
    runs = list_recent_syncs(db, sync_type=sync_type, limit=limit)
    return {"runs": [serialize_sync_run(run) for run in runs]}


@app.get("/api/stats")
async def get_statistics(
    db: Session = Depends(get_db)
):
    """Get overall statistics."""
    groups = db.query(SecurityGroup).all()
    users = db.query(User).all()

    total_groups = len(groups)
    documented = sum(1 for g in groups if g.is_documented)
    undocumented = total_groups - documented
    under_review = sum(1 for g in groups if g.status and "under review" in g.status.lower())
    confirmed = sum(1 for g in groups if g.status and "confirmed" in g.status.lower())
    follows_naming = sum(1 for g in groups if g.follows_naming_convention)

    return {
        "total_groups": total_groups,
        "total_users": len(users),
        "documented_groups": documented,
        "undocumented_groups": undocumented,
        "under_review": under_review,
        "confirmed": confirmed,
        "follows_naming_convention": follows_naming,
        "compliance_percentage": round((follows_naming / total_groups * 100) if total_groups > 0 else 0, 2)
    }


@app.get("/api/config/status")
async def get_config_status():
    """Get current configuration status for all integrations."""
    return settings.get_config_status()


@app.post("/api/config/test-azure")
async def test_azure_connection():
    """Test Azure AD connection without performing a full sync."""
    if not settings.azure_configured:
        return {
            "success": False,
            "error": "Azure credentials not configured. Set AZURE_TENANT_ID, AZURE_CLIENT_ID, and AZURE_CLIENT_SECRET in .env"
        }

    try:
        from msal import ConfidentialClientApplication

        msal_app = ConfidentialClientApplication(
            settings.azure_client_id,
            authority=f"https://login.microsoftonline.com/{settings.azure_tenant_id}",
            client_credential=settings.azure_client_secret,
        )

        result = msal_app.acquire_token_for_client(scopes=[settings.azure_graph_scope])

        if "access_token" in result:
            return {
                "success": True,
                "message": "Azure AD connection successful. Token acquired.",
                "token_type": result.get("token_type"),
                "expires_in": result.get("expires_in")
            }
        else:
            return {
                "success": False,
                "error": result.get("error_description", "Failed to acquire token"),
                "error_code": result.get("error")
            }
    except Exception as exc:
        return {
            "success": False,
            "error": str(exc)
        }


@app.post("/api/config/test-odoo")
async def test_odoo_connection():
    """Test Odoo PostgreSQL connection without performing a full sync."""
    if not settings.odoo_configured:
        return {
            "success": False,
            "error": f"Odoo database not configured. Set ODOO_{settings.odoo_environment}_DSN in .env",
            "environment": settings.odoo_environment
        }

    try:
        import psycopg

        # Parse DSN to extract connection info (mask password for response)
        dsn = settings.odoo_postgres_dsn

        # Connect and run a simple test query
        with psycopg.connect(dsn.replace("postgresql+psycopg://", "postgresql://")) as conn:
            with conn.cursor() as cur:
                # Test basic connectivity
                cur.execute("SELECT version()")
                version = cur.fetchone()[0]

                # Count rows in key Odoo tables
                cur.execute("SELECT COUNT(*) FROM res_groups")
                group_count = cur.fetchone()[0]

                cur.execute("SELECT COUNT(*) FROM res_users WHERE active = TRUE")
                user_count = cur.fetchone()[0]

                return {
                    "success": True,
                    "message": f"Connected to Odoo {settings.odoo_environment_display} database",
                    "environment": settings.odoo_environment,
                    "postgres_version": version.split(",")[0] if "," in version else version[:50],
                    "odoo_groups": group_count,
                    "odoo_active_users": user_count
                }
    except Exception as exc:
        return {
            "success": False,
            "error": str(exc),
            "environment": settings.odoo_environment
        }


@app.post("/api/config/switch-environment")
async def switch_odoo_environment(environment: str = Query(..., regex="^(PREPROD|PROD)$")):
    """Switch between PREPROD and PROD Odoo environments."""
    # Note: This only affects the current session. To persist, update .env file
    old_env = settings.odoo_environment

    # Check if the target environment is configured
    if environment == "PROD" and not settings.odoo_prod_dsn:
        return {
            "success": False,
            "error": "PROD environment not configured. Set ODOO_PROD_DSN in .env"
        }
    if environment == "PREPROD" and not settings.odoo_preprod_dsn:
        return {
            "success": False,
            "error": "PREPROD environment not configured. Set ODOO_PREPROD_DSN in .env"
        }

    # Update the environment (note: this is in-memory only)
    os.environ["ODOO_ENVIRONMENT"] = environment

    # Reload settings to pick up the change
    from importlib import reload
    import app.backend.settings as settings_module
    reload(settings_module)

    return {
        "success": True,
        "message": f"Switched from {old_env} to {environment}",
        "previous_environment": old_env,
        "current_environment": environment,
        "note": "This change is temporary. Update ODOO_ENVIRONMENT in .env to persist."
    }


# =============================================
# COMPARISON ENDPOINTS
# =============================================

@app.post("/api/comparison/run")
async def run_comparison(db: Session = Depends(get_db)):
    """Run Azure vs Odoo user comparison."""
    try:
        stats = run_user_comparison(db)
        return {"status": "completed", "stats": stats}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/api/comparison/summary")
async def get_comparison_summary_endpoint(db: Session = Depends(get_db)):
    """Get summary of latest comparison."""
    return get_comparison_summary(db)


@app.get("/api/comparison/results")
async def get_comparison_results_endpoint(
    discrepancy_type: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Get detailed comparison results."""
    results = get_comparison_results(db, discrepancy_type)
    return {"results": results, "count": len(results)}


@app.post("/api/comparison/resolve/{result_id}")
async def resolve_discrepancy(
    result_id: int,
    notes: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Mark a discrepancy as resolved."""
    success = mark_discrepancy_resolved(db, result_id, notes)
    if not success:
        raise HTTPException(status_code=404, detail="Comparison result not found")
    return {"success": True, "message": "Discrepancy marked as resolved"}


# =============================================
# CRUD PERMISSIONS ENDPOINTS
# =============================================

@app.get("/api/groups/{group_id}/permissions")
async def get_group_permissions(
    group_id: int,
    db: Session = Depends(get_db),
):
    """Get CRUD permissions for a specific group."""
    group = db.query(SecurityGroup).filter(SecurityGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    permissions = (
        db.query(AccessRight)
        .filter(AccessRight.group_id == group_id)
        .order_by(AccessRight.model_name)
        .all()
    )

    return {
        "group_id": group_id,
        "group_name": group.name,
        "permissions": [
            {
                "id": p.id,
                "model_name": p.model_name,
                "model_description": p.model_description,
                "perm_read": p.perm_read,
                "perm_write": p.perm_write,
                "perm_create": p.perm_create,
                "perm_unlink": p.perm_unlink,
                "synced_at": p.synced_at.isoformat() if p.synced_at else None,
            }
            for p in permissions
        ],
        "total_permissions": len(permissions),
    }


# =============================================
# DEPARTMENT FILTERING
# =============================================

@app.get("/api/departments")
async def get_departments(db: Session = Depends(get_db)):
    """Get list of unique departments."""
    departments = (
        db.query(User.department)
        .filter(User.department.isnot(None), User.department != "")
        .distinct()
        .order_by(User.department)
        .all()
    )
    return {"departments": [d[0] for d in departments]}


@app.get("/api/users/by-department")
async def get_users_by_department(
    department: str = Query(..., min_length=1),
    include_hidden: bool = Query(False, description="Include hidden users"),
    db: Session = Depends(get_db),
):
    """Get users filtered by department with their group assignments."""
    query = db.query(User).filter(User.department == department)

    # By default, exclude hidden users
    if not include_hidden:
        query = query.filter(User.is_hidden == False)

    users = (
        query
        .options(joinedload(User.groups))
        .order_by(User.name)
        .all()
    )

    return {
        "department": department,
        "users": [
            {
                "id": u.id,
                "name": u.name,
                "email": u.email,
                "azure_id": u.azure_id,
                "odoo_user_id": u.odoo_user_id,
                "is_hidden": u.is_hidden,
                "group_count": len(u.groups),
                "groups": [{"id": g.id, "name": g.name, "module": g.module} for g in u.groups],
            }
            for u in users
        ],
        "total_users": len(users),
    }

