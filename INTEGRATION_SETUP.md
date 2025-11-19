# Azure & Odoo Integration Setup Guide

End-to-end instructions for configuring Microsoft Entra (Azure AD) and Odoo/Postgres data feeds used by the Data tab and background sync services.

---

## 1. Overview

The application exposes two ingestion paths under **Data & Integrations**:

1. **Azure Directory Sync** - pulls users, email, department, and account state from Entra via Microsoft Graph.
2. **Odoo Postgres Sync** - connects directly to the Odoo database (read-only) to capture groups, users, memberships, and inheritance.

(Legacy note: CSV uploads have been retired now that both source systems are accessible directly.)

This guide focuses on configuring the live syncs, including prerequisites, environment variables, and how the data flows into SQLite for analysis.

---

## 2. Prerequisites

### 2.1 Shared
- Python backend configured via `.env` or process environment variables.
- Outbound Internet connectivity for Microsoft Graph.
- Network access to the Odoo Postgres instance (VPN/tunnel if required).

### 2.2 Azure / Microsoft Graph
1. Azure AD tenant with permission to register applications.
2. Graph API application (App registration) using **client credentials**.
3. Application permissions: `User.Read.All` (Application) + admin consent.
4. Secrets or certificates managed in a secure store (Key Vault / env vars).

Environment variables:
| Name | Description |
|------|-------------|
| `AZURE_TENANT_ID` | Directory (tenant) ID of the Entra tenant. |
| `AZURE_CLIENT_ID` | Application (client) ID of the registered app. |
| `AZURE_CLIENT_SECRET` | Client secret (or use certificate wiring if desired). |
| `AZURE_GRAPH_SCOPE` | Optional override for scopes. Default: `https://graph.microsoft.com/.default`. |

### 2.3 Odoo Postgres
1. Read-only database login with access to:
   - `res_groups`
   - `res_users`
   - `res_groups_users_rel`
   - `res_groups_implied_rel`
2. Secure connection details (host, port, database, username, password, SSL mode).

Environment variables:
| Name | Description |
|------|-------------|
| `ODOO_PREPROD_DSN` | Full SQLAlchemy/psycopg DSN for Pre-Production (e.g., `postgresql+psycopg://user:pass@host:5432/dbname?sslmode=prefer`). |
| `ODOO_PROD_DSN` | Full SQLAlchemy/psycopg DSN for Production (e.g., `postgresql+psycopg://user:pass@host:5432/dbname?sslmode=require`). |
| `ODOO_ENVIRONMENT` | Current environment selection: `PREPROD` (default) or `PROD`. |

Optional dev/testing helpers:
| Name | Description |
|------|-------------|
| `ALLOW_SYNC_MOCKS` | `1` (default) allows mock JSON payloads; set `0` to force live calls. |
| `AZURE_USER_SYNC_MOCK_FILE` | Path to mock JSON for Azure data during offline testing. |
| `ODOO_SYNC_MOCK_FILE` | Path to mock JSON for Odoo data during offline testing. |

---

## 3. Step-by-Step: Azure Sync

1. **Configure environment variables** as listed above (either in hosting platform or `.env` loaded before `start_app.ps1`).
2. **Restart the backend** so the FastAPI services pick up the new settings.
3. In the UI, open the **Data & Integrations** tab → **Azure Directory Sync** card.
4. Click **Sync Azure Directory**. The backend will:
   - Acquire a token via MSAL (client credentials).
   - Call `GET https://graph.microsoft.com/v1.0/users?$select=id,displayName,department,mail,userPrincipalName,jobTitle,accountEnabled&$top=<page size>`.
   - Page through all results, upserting into the `users` table while recording a `sync_runs` entry (`sync_type = "azure_users"`).
5. Watch the status chip update (success/failure and timestamp). Success means:
   - `users.azure_id`, `email`, `department`, `source_system = "Azure"`, and `last_seen_in_azure_at` are refreshed.
   - Any new Entra users appear instantly on the Users page (department column).
6. Repeat manually as needed or schedule the API endpoint `POST /api/sync/azure-users`.

**Validation Tips**
- Check the Users page for recent departments/emails.
- Query `/api/sync/status?sync_type=azure_users` to inspect JSON stats.
- Use Azure Portal sign-in logs if Graph access fails (HTTP 401/403).

---

## 4. Step-by-Step: Odoo Postgres Sync

### 4.1 Database User Setup (First Time Only)

Before syncing, you need to create a **read-only** PostgreSQL user with access to only the specific tables needed for the Odoo Security Management application.

#### Security Principle

The application needs SELECT-only access to these tables:
- `res_groups` - Security group definitions
- `res_users` - User accounts
- `res_groups_users_rel` - User-to-group assignments
- `res_groups_implied_rel` - Group inheritance relationships
- `ir_model_access` - CRUD permissions per group
- `ir_model` - Model/table names
- `res_groups_category` (optional) - Group categories/modules

**No access to**: Financial data, inventory, sales, HR records, or any other business data.

#### Step 1: Connect to PostgreSQL

SSH into your Odoo server (PREPROD first):

```bash
ssh your-username@preprod-server
```

Connect to PostgreSQL as a superuser (usually postgres):

```bash
sudo -u postgres psql
```

Or if you have a specific database:

```bash
sudo -u postgres psql -d your_odoo_database_name
```

#### Step 2: Create the Read-Only User

```sql
-- Create user with a strong password
CREATE USER odoo_security_reader WITH PASSWORD 'YOUR_SECURE_PASSWORD_HERE';

-- No create database or superuser privileges
ALTER USER odoo_security_reader NOSUPERUSER NOCREATEDB;
```

#### Step 3: Grant Minimal Required Permissions

```sql
-- Connect to your Odoo database
\c your_odoo_database_name

-- Grant connect privilege to the database
GRANT CONNECT ON DATABASE your_odoo_database_name TO odoo_security_reader;

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO odoo_security_reader;

-- Grant SELECT only on specific tables
GRANT SELECT ON TABLE res_groups TO odoo_security_reader;
GRANT SELECT ON TABLE res_users TO odoo_security_reader;
GRANT SELECT ON TABLE res_groups_users_rel TO odoo_security_reader;
GRANT SELECT ON TABLE res_groups_implied_rel TO odoo_security_reader;
GRANT SELECT ON TABLE ir_model_access TO odoo_security_reader;
GRANT SELECT ON TABLE ir_model TO odoo_security_reader;

-- Optional: For better module categorization
GRANT SELECT ON TABLE ir_module_category TO odoo_security_reader;
```

#### Step 4: Verify Permissions

Test that the user can only SELECT from these tables:

```sql
-- Switch to the new user
\c your_odoo_database_name odoo_security_reader

-- These should work
SELECT COUNT(*) FROM res_groups;
SELECT COUNT(*) FROM res_users WHERE active = TRUE;
SELECT COUNT(*) FROM ir_model_access;

-- These should FAIL (access denied)
SELECT * FROM account_move;  -- Financial data
SELECT * FROM res_partner;   -- Contact details
INSERT INTO res_groups (name) VALUES ('test');  -- Write operations
```

#### Step 5: Configure PostgreSQL for Remote Access (if needed)

If the app runs on a different machine than the database:

1. Edit `postgresql.conf` to listen on all interfaces:
   ```
   listen_addresses = '*'
   ```

2. Edit `pg_hba.conf` to allow the app server:
   ```
   # TYPE  DATABASE                USER                    ADDRESS         METHOD
   host    your_odoo_database      odoo_security_reader    app_server_ip/32  scram-sha-256
   ```

3. Restart PostgreSQL:
   ```bash
   sudo systemctl restart postgresql
   ```

#### Step 6: Build the Connection String (DSN)

For PREPROD (database on same server as Odoo app):

```
ODOO_PREPROD_DSN=postgresql+psycopg://odoo_security_reader:YOUR_PASSWORD@localhost:5432/your_odoo_database?sslmode=prefer
```

For PROD (separate database server):

```
ODOO_PROD_DSN=postgresql+psycopg://odoo_security_reader:YOUR_PASSWORD@prod-db-server:5432/your_odoo_database?sslmode=require
```

**DSN Format Breakdown:**
```
postgresql+psycopg://USERNAME:PASSWORD@HOST:PORT/DATABASE?sslmode=MODE
```

- **USERNAME**: `odoo_security_reader`
- **PASSWORD**: The password you set in Step 2
- **HOST**: `localhost` (same server) or IP/hostname (remote)
- **PORT**: Usually `5432`
- **DATABASE**: Your Odoo database name
- **sslmode**: `prefer` (local), `require` (remote/prod)

#### Step 7: Test Connection

From the application server, test the connection:

```bash
# Install psql client if not present
sudo apt install postgresql-client

# Test connection
psql "postgresql://odoo_security_reader:YOUR_PASSWORD@localhost:5432/your_odoo_database?sslmode=prefer"
```

#### Revoking Access (If Needed)

To remove access later:

```sql
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM odoo_security_reader;
REVOKE CONNECT ON DATABASE your_odoo_database FROM odoo_security_reader;
DROP USER odoo_security_reader;
```

#### Audit Trail

Consider enabling PostgreSQL logging to track queries:

```sql
ALTER USER odoo_security_reader SET log_statement = 'all';
```

This creates an audit trail of all queries run by the application.

### 4.2 Performing the Sync

1. Set `ODOO_PREPROD_DSN` and/or `ODOO_PROD_DSN` (and optional SSL cert parameters) in the environment.
2. Restart the backend to load the DSN.
3. From **Data & Integrations** → **Odoo Postgres Sync**, select the environment (Pre-Production or Production) and click **Sync Odoo DB**.
4. The backend will:
   - Open a psycopg connection using the DSN.
   - Fetch groups/users/memberships/inheritance in batches.
   - Use `app/backend/services/odoo_sync.py`'s `_upsert_groups` to map Odoo IDs to local `SecurityGroup` and `User` rows.
   - Update many-to-many relationships (`user_group_association`) and inheritance (`group_inheritance`), and stamp `synced_from_postgres_at`.
   - Tag data with the environment (e.g., "Odoo (Pre-Production)" or "Odoo (Production)").
   - Persist a `sync_runs` record with `sync_type = "odoo_postgres"`.
5. After success, revisit the Groups page: modules, user counts, and parent/child chains should reflect the Postgres state.

**Validation Tips**
- Compare record counts between Odoo and the Groups/Users tables.
- Export data from the Data tab (Groups CSV) to confirm `source_system` and `odoo_id` fields are filled.
- Use `GET /api/export/groups` as a secondary check.

---

## 5. Data Flow Reference

```
Azure Graph -> AzureGraphClient -> sync_runs(azure_users)
             -> _upsert_users()   -> users table (azure_id, department, source_system)

Odoo Postgres -> psycopg queries -> sync_runs(odoo_postgres)
               -> _upsert_groups()/_upsert_users()
               -> security_groups (odoo_id, module, status, hierarchy)
               -> users table (odoo_user_id)
               -> user_group_association & group_inheritance

```

**Analysis Pipeline**
1. Dashboard/Analysis endpoints (`/api/stats`, `/api/analysis/*`) read from `security_groups`, `users`, and association tables.
2. Frontend components fetch via Axios from the configured API base (defaults to `http://<host>:3200`).
3. Any subsequent sync automatically updates the SQLite store, so visuals reflect the latest snapshot without additional work.

---

## 6. Troubleshooting

| Issue | Checks |
|-------|--------|
| Azure sync fails immediately | Verify tenant/app IDs, client secret, and Graph permissions. Check the backend logs for MSAL errors. |
| Azure sync runs but Users page unchanged | Ensure `ALLOW_SYNC_MOCKS=0` so the service doesn’t use sample JSON. Confirm accounts returned by Graph have names/emails. |
| Odoo sync timeout | Confirm DSN connectivity (try `psql`), ensure firewall/VPN is open, and increase timeouts if necessary. |
| Data mismatch after sync | Use the export buttons to download CSV snapshots and compare directly with source systems. |

---

## 7. Next Steps
- Schedule the sync endpoints (`/api/sync/azure-users`, `/api/sync/odoo-db`) via cron or Azure Automation for regular refresh.
- Feed the reconciled dataset into the comparison/AI workflows (see `TECH_STACK_AND_ARCHITECTURE.md` for details).
- Expand the Data tab instructions to include any organization-specific safeguards (change approval, service accounts, etc.).
