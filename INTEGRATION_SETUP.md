# Azure & Odoo Integration Setup Guide

End-to-end instructions for configuring Microsoft Entra (Azure AD) and Odoo/Postgres data feeds used by the Data tab and background sync services.

---

## 1. Overview

The application exposes three ingestion paths under **Data & Integrations**:

1. **Azure Directory Sync** – pulls users, email, department, and account state from Entra via Microsoft Graph.
2. **Odoo Postgres Sync** – connects directly to the Odoo database (read-only) to capture groups, users, memberships, and inheritance.
3. **CSV Import** – fallback when direct DB access isn’t available.

This guide focuses on the first two, including prerequisites, environment variables, and how the data flows into SQLite for analysis.

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
| `ODOO_POSTGRES_DSN` | Full SQLAlchemy/psycopg DSN (e.g., `postgresql+psycopg://user:pass@host:5432/dbname?sslmode=require`). |

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

1. Set `ODOO_POSTGRES_DSN` (and optional SSL cert parameters) in the environment.
2. Restart the backend to load the DSN.
3. From **Data & Integrations** → **Odoo Postgres Sync**, click **Sync Odoo DB**.
4. The backend will:
   - Open a psycopg connection using the DSN.
   - Fetch groups/users/memberships/inheritance in batches.
   - Use `app/backend/services/odoo_sync.py`’s `_upsert_groups` to map Odoo IDs to local `SecurityGroup` and `User` rows.
   - Update many-to-many relationships (`user_group_association`) and inheritance (`group_inheritance`), and stamp `synced_from_postgres_at`.
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

CSV Import -> DATA tab uploader -> ImportHistory + security_groups/users (baseline seed)
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
- Feed the reconciled dataset into the comparison/AI workflows described in `DATA_SYNC_PLAN.md`.
- Expand the Data tab instructions to include any organization-specific safeguards (change approval, service accounts, etc.).
