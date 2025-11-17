"""
Main entry point for FastAPI application.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

import uvicorn

if __name__ == "__main__":
    uvicorn.run("app.backend.api:app", host="0.0.0.0", port=8000, reload=True)

