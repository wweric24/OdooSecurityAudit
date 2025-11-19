"""
Database setup and session management.
"""
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy import inspect
from sqlalchemy.orm import sessionmaker, Session
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from app.data.models import Base

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/security.db")

# Create engine
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    """Initialize database tables and ensure new columns exist."""
    # Ensure data directory exists
    os.makedirs("data", exist_ok=True)
    Base.metadata.create_all(bind=engine)
    ensure_additional_columns(engine)


def ensure_additional_columns(db_engine: Engine):
    """Add recently introduced columns if they don't exist yet."""
    inspector = inspect(db_engine)
    with db_engine.begin() as conn:
        security_columns = inspector.get_columns("security_groups") if inspector.has_table("security_groups") else []
        user_columns = inspector.get_columns("users") if inspector.has_table("users") else []
        security_column_names = {col["name"] for col in security_columns}
        user_column_names = {col["name"] for col in user_columns}
        # Columns added over time (older SQLite files may miss these)
        security_columns_to_add = {
            "allowed_functions": "TEXT",
            "allowed_records": "TEXT",
            "allowed_fields": "TEXT",
            "inheritance_notes": "TEXT",
            "odoo_created_by": "VARCHAR(255)",
            "odoo_created_at": "DATETIME",
            "odoo_updated_by": "VARCHAR(255)",
            "odoo_updated_at": "DATETIME",
            "is_archived": "BOOLEAN DEFAULT 0",
            "source_system": "VARCHAR(50)",
            "odoo_id": "INTEGER",
            "synced_from_postgres_at": "DATETIME",
        }
        for column_name, column_def in security_columns_to_add.items():
            if column_name not in security_column_names:
                conn.execute(
                    text(f"ALTER TABLE security_groups ADD COLUMN {column_name} {column_def}")
                )

        if "department" not in user_column_names:
            conn.execute(text("ALTER TABLE users ADD COLUMN department VARCHAR(255)"))
        if "azure_id" not in user_column_names:
            conn.execute(text("ALTER TABLE users ADD COLUMN azure_id VARCHAR(255)"))
        if "odoo_user_id" not in user_column_names:
            conn.execute(text("ALTER TABLE users ADD COLUMN odoo_user_id INTEGER"))
        if "source_system" not in user_column_names:
            conn.execute(text("ALTER TABLE users ADD COLUMN source_system VARCHAR(50)"))
        if "last_seen_in_azure_at" not in user_column_names:
            conn.execute(text("ALTER TABLE users ADD COLUMN last_seen_in_azure_at DATETIME"))
        if "is_hidden" not in user_column_names:
            conn.execute(text("ALTER TABLE users ADD COLUMN is_hidden BOOLEAN DEFAULT 0"))

        # Access rights table columns
        access_rights_columns = inspector.get_columns("access_rights") if inspector.has_table("access_rights") else []
        access_rights_column_names = {col["name"] for col in access_rights_columns}
        
        if "model_description" not in access_rights_column_names:
            conn.execute(text("ALTER TABLE access_rights ADD COLUMN model_description VARCHAR(255)"))
        if "odoo_access_id" not in access_rights_column_names:
            conn.execute(text("ALTER TABLE access_rights ADD COLUMN odoo_access_id INTEGER"))
        if "perm_read" not in access_rights_column_names:
            conn.execute(text("ALTER TABLE access_rights ADD COLUMN perm_read BOOLEAN DEFAULT 0"))
        if "perm_write" not in access_rights_column_names:
            conn.execute(text("ALTER TABLE access_rights ADD COLUMN perm_write BOOLEAN DEFAULT 0"))
        if "perm_create" not in access_rights_column_names:
            conn.execute(text("ALTER TABLE access_rights ADD COLUMN perm_create BOOLEAN DEFAULT 0"))
        if "perm_unlink" not in access_rights_column_names:
            conn.execute(text("ALTER TABLE access_rights ADD COLUMN perm_unlink BOOLEAN DEFAULT 0"))
        if "synced_at" not in access_rights_column_names:
            conn.execute(text("ALTER TABLE access_rights ADD COLUMN synced_at DATETIME"))


def get_db() -> Session:
    """Get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

