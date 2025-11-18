"""Azure vs Odoo user comparison service."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, List

from sqlalchemy.orm import Session

from app.data.models import User, ComparisonResult


def run_user_comparison(db: Session) -> Dict:
    """
    Compare users between Azure AD and Odoo database.

    Returns statistics and creates ComparisonResult records for discrepancies.
    """
    now = datetime.now(timezone.utc)

    # Clear previous comparison results (keep history optional)
    db.query(ComparisonResult).delete()
    db.commit()

    # Get all users (excluding hidden users - not related to Odoo's active/archived status)
    all_users = db.query(User).filter(User.is_hidden == False).all()

    # Categorize users by source
    azure_users = {}  # email -> user
    odoo_users = {}  # email -> user

    for user in all_users:
        email = user.email.lower() if user.email else None
        if not email:
            continue

        # Track Azure users (has azure_id or was seen in Azure)
        if user.azure_id or user.last_seen_in_azure_at:
            azure_users[email] = user

        # Track Odoo users (has odoo_user_id or source is Odoo)
        if user.odoo_user_id or user.source_system == "Odoo":
            odoo_users[email] = user

    # Find discrepancies
    discrepancies = []

    # 1. Users in Azure but NOT in Odoo
    for email, azure_user in azure_users.items():
        if email not in odoo_users:
            result = ComparisonResult(
                comparison_date=now,
                discrepancy_type="azure_only",
                user_name=azure_user.name,
                user_email=email,
                azure_value=f"Azure ID: {azure_user.azure_id}, Dept: {azure_user.department}",
                odoo_value="Not found in Odoo",
            )
            db.add(result)
            discrepancies.append(result)

    # 2. Users in Odoo but NOT in Azure
    for email, odoo_user in odoo_users.items():
        if email not in azure_users:
            result = ComparisonResult(
                comparison_date=now,
                discrepancy_type="odoo_only",
                user_name=odoo_user.name,
                user_email=email,
                azure_value="Not found in Azure",
                odoo_value=f"Odoo User ID: {odoo_user.odoo_user_id}",
            )
            db.add(result)
            discrepancies.append(result)

    # 3. Users in BOTH but with mismatched data
    common_emails = set(azure_users.keys()) & set(odoo_users.keys())
    for email in common_emails:
        azure_user = azure_users[email]
        odoo_user = odoo_users[email]

        # Check name mismatch (allow for slight variations)
        azure_name = azure_user.name.strip().lower() if azure_user.name else ""
        odoo_name = odoo_user.name.strip().lower() if odoo_user.name else ""

        if azure_name and odoo_name and azure_name != odoo_name:
            # Only flag if names are significantly different
            # Allow for minor variations like "John Doe" vs "Doe, John"
            if not _names_similar(azure_user.name, odoo_user.name):
                result = ComparisonResult(
                    comparison_date=now,
                    discrepancy_type="name_mismatch",
                    user_name=azure_user.name,
                    user_email=email,
                    azure_value=f"Name: {azure_user.name}",
                    odoo_value=f"Name: {odoo_user.name}",
                )
                db.add(result)
                discrepancies.append(result)

    db.commit()

    # Calculate statistics
    stats = {
        "total_azure_users": len(azure_users),
        "total_odoo_users": len(odoo_users),
        "users_in_both": len(common_emails),
        "azure_only": sum(1 for d in discrepancies if d.discrepancy_type == "azure_only"),
        "odoo_only": sum(1 for d in discrepancies if d.discrepancy_type == "odoo_only"),
        "name_mismatches": sum(1 for d in discrepancies if d.discrepancy_type == "name_mismatch"),
        "total_discrepancies": len(discrepancies),
        "comparison_date": now.isoformat(),
    }

    return stats


def _names_similar(name1: str, name2: str) -> bool:
    """Check if two names are similar enough to be considered the same person."""
    if not name1 or not name2:
        return False

    # Normalize names
    n1_parts = set(name1.lower().replace(",", "").split())
    n2_parts = set(name2.lower().replace(",", "").split())

    # If most parts match, consider them similar
    common = n1_parts & n2_parts
    if len(common) >= min(len(n1_parts), len(n2_parts)) * 0.7:
        return True

    return False


def get_comparison_results(db: Session, discrepancy_type: str = None) -> List[Dict]:
    """Retrieve comparison results, optionally filtered by type."""
    query = db.query(ComparisonResult)

    if discrepancy_type:
        query = query.filter(ComparisonResult.discrepancy_type == discrepancy_type)

    query = query.order_by(ComparisonResult.discrepancy_type, ComparisonResult.user_name)

    results = []
    for r in query.all():
        results.append(
            {
                "id": r.id,
                "comparison_date": r.comparison_date.isoformat() if r.comparison_date else None,
                "discrepancy_type": r.discrepancy_type,
                "user_name": r.user_name,
                "user_email": r.user_email,
                "azure_value": r.azure_value,
                "odoo_value": r.odoo_value,
                "resolved": r.resolved,
                "notes": r.notes,
            }
        )

    return results


def get_comparison_summary(db: Session) -> Dict:
    """Get a summary of the latest comparison."""
    # Get the latest comparison date
    latest = (
        db.query(ComparisonResult)
        .order_by(ComparisonResult.comparison_date.desc())
        .first()
    )

    if not latest:
        return {
            "has_data": False,
            "message": "No comparison has been run yet. Sync both Azure and Odoo first, then run comparison.",
        }

    # Count by type
    azure_only = (
        db.query(ComparisonResult)
        .filter(ComparisonResult.discrepancy_type == "azure_only")
        .count()
    )
    odoo_only = (
        db.query(ComparisonResult)
        .filter(ComparisonResult.discrepancy_type == "odoo_only")
        .count()
    )
    name_mismatches = (
        db.query(ComparisonResult)
        .filter(ComparisonResult.discrepancy_type == "name_mismatch")
        .count()
    )

    return {
        "has_data": True,
        "last_comparison": latest.comparison_date.isoformat(),
        "azure_only": azure_only,
        "odoo_only": odoo_only,
        "name_mismatches": name_mismatches,
        "total_discrepancies": azure_only + odoo_only + name_mismatches,
    }


def mark_discrepancy_resolved(db: Session, result_id: int, notes: str = None) -> bool:
    """Mark a discrepancy as resolved."""
    result = db.query(ComparisonResult).filter(ComparisonResult.id == result_id).first()
    if result:
        result.resolved = True
        if notes:
            result.notes = notes
        db.commit()
        return True
    return False
