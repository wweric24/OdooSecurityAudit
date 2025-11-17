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
from datetime import datetime, date
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from app.backend.database import get_db, init_db
from app.data.models import SecurityGroup, User, ImportHistory, user_group_association
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
            import_date=datetime.utcnow(),
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
    db: Session = Depends(get_db)
):
    """Get list of users with their group assignments."""
    query = db.query(User)
    
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
                "group_count": len(u.groups),
                "groups": [{"id": g.id, "name": g.name} for g in u.groups]
            }
            for u in users
        ]
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
            len(group_names),
            "; ".join(group_names)
        ])
    
    headers = ["ID", "Name", "Email", "Department", "Group Count", "Groups"]
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

