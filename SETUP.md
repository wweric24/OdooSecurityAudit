# Setup Instructions

## Prerequisites

- Python 3.11+
- Node.js 18+
- npm or yarn

## Quick Start (Recommended)

Use the helper script to boot both services on the standardized ports (backend `3200`, frontend `3100`):

```powershell
pwsh -File start_app.ps1
```

The script stops anything already listening on those ports, runs `uvicorn` for FastAPI, installs frontend dependencies if needed, and starts Vite. When it finishes you can browse to `http://localhost:3100`.

> Want custom ports? `pwsh -File start_app.ps1 -BackendPort 9000 -FrontendPort 9100`

## Manual Backend Setup

1. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Initialize the database (creates/updates SQLite tables):
   ```bash
   python -c "from app.backend.database import init_db; init_db()"
   ```
3. Run the backend server on port 3200:
   ```bash
   uvicorn app.backend.api:app --reload --host 0.0.0.0 --port 3200
   ```

API docs: `http://localhost:3200/docs`

## Manual Frontend Setup

1. Install dependencies:
   ```bash
   cd app/frontend
   npm install
   ```
2. Start the Vite dev server (port 3100 to match the backend CORS defaults):
   ```bash
   npm run dev -- --host 0.0.0.0 --port 3100
   ```

UI: `http://localhost:3100`

## First Import

1. Start both backend and frontend servers
2. Open `http://localhost:3000` in your browser
3. Open the **Data & Integrations** tab
4. Under **CSV Import**, upload the latest Odoo export (e.g., `reference docs/Access Groups (res.groups).csv`)
5. After the success message, explore Dashboard, Groups, Users, and Analysis

## Docker Deployment (Optional)

Build and run with Docker:

```bash
docker-compose up --build
```

This will start both backend and serve the frontend.

## Troubleshooting

### Import Issues
- Ensure the CSV file path is correct
- Check that the CSV file has the expected columns: Group Name, Group Purpose, Group Status, User Access, Users, Inherits
- Verify the file encoding is UTF-8 (with or without BOM)

### Database Issues
- Delete `data/security.db` and reinitialize if needed
- Ensure the `data/` directory exists and is writable

### Port Conflicts
- Backend default port: 3200 (override via `start_app.ps1 -BackendPort` or `uvicorn --port`)
- Frontend default port: 3100 (override via `start_app.ps1 -FrontendPort` or `npm run dev -- --port`)

