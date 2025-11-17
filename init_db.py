"""Initialize the database."""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.backend.database import init_db

if __name__ == "__main__":
    print("Initializing database...")
    init_db()
    print("Database initialized successfully!")

