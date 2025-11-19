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

## First Data Load

1. Start both backend and frontend servers
2. Open `http://localhost:3000` in your browser
3. Go to the **Data & Integrations** tab
4. Run the Azure sync (uses Microsoft Graph or the configured mock payload)
5. Run the Odoo sync (Postgres DSN or mock JSON)
6. After both runs succeed, explore Dashboard, Groups, Users, and Analysis

## Docker Deployment (Optional)

Build and run with Docker:

```bash
docker-compose up --build
```

This will start both backend and serve the frontend.

## Troubleshooting

### Sync Issues
- Verify Azure and Odoo connection settings in `.env`
- Enable `ALLOW_MOCK_SYNCS=true` to use the sample JSON payloads while testing locally
- Check FastAPI logs for detailed error traces and SQL statements

### Database Issues
- Delete `data/security.db` and reinitialize if needed
- Ensure the `data/` directory exists and is writable

### Port Conflicts
- Backend default port: 3200 (override via `start_app.ps1 -BackendPort` or `uvicorn --port`)
- Frontend default port: 3100 (override via `start_app.ps1 -FrontendPort` or `npm run dev -- --port`)

## What I Need From You

### 1. Azure App Registration

You need to create an Azure App Registration in the Azure Portal. Follow these step-by-step instructions:

#### Step 1: Navigate to App Registrations

1. Go to [Azure Portal](https://portal.azure.com)
2. Search for **"App registrations"** in the top search bar
3. Click **"New registration"**

#### Step 2: Create the App

- **Name**: `Odoo Security Management` (or your preferred name)
- **Supported account types**: `Accounts in this organizational directory only`
- **Redirect URI**: Leave blank (we use client credentials)
- Click **"Register"**

#### Step 3: Get Tenant ID and Client ID

On the **Overview** page, copy these values:

- **Application (client) ID** → `AZURE_CLIENT_ID`
- **Directory (tenant) ID** → `AZURE_TENANT_ID`

#### Step 4: Create Client Secret

1. Go to **"Certificates & secrets"** in the left menu
2. Click **"New client secret"**
3. **Description**: `Odoo Security App`
4. **Expiration**: Choose based on your policy (e.g., 24 months)
5. Click **"Add"**
6. **IMMEDIATELY copy the Value** (not the Secret ID) → `AZURE_CLIENT_SECRET`
   > ⚠️ **Warning**: This value is only shown once! Save it securely.

#### Step 5: Grant API Permissions

1. Go to **"API permissions"** in the left menu
2. Click **"Add a permission"**
3. Select **"Microsoft Graph"**
4. Select **"Application permissions"** (not Delegated)
5. Search for and select: **`User.Read.All`**
6. Click **"Add permissions"**
7. Click **"Grant admin consent for [Your Org]"** (requires admin rights)

#### After Completion

After you complete these steps, provide me with:

- Tenant ID
- Client ID
- Client Secret

---

### 2. Odoo PREPROD Database Connection

I need the PostgreSQL connection details. Please provide:

- **Host/IP**: (e.g., `preprod-db.yourcompany.com` or IP address)
- **Port**: (usually `5432`)
- **Database name**: (e.g., `odoo_preprod`)
- **Username**: (read-only user preferred)
- **Password**: 
- **SSL required?**: (usually yes for cloud databases)

I'll construct the DSN string for you using this format:

```text
postgresql+psycopg://username:password@host:port/database?sslmode=require
```
