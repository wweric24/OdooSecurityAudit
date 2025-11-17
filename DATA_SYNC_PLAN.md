# Odoo Security Management App – External Data Sync Plan

## 1. Research Summary

### 1.1 Microsoft Entra ID (Azure AD) Users & Departments

- **API surface**: Microsoft Graph `GET /users` exposes `id`, `displayName`, `mail`, `department`, `accountEnabled`, and custom attributes; use `$select` to limit payload size (docs: [MS Graph users](https://learn.microsoft.com/graph/api/resources/user?view=graph-rest-1.0)). Delta queries (`/users/delta`) allow incremental pulls.
- **Auth**: Register an Entra app, grant `User.Read.All` (application scope) in Microsoft Graph, and use OAuth 2.0 client credential flow via MSAL. Tokens last 1h; store tenant id, client id, and client secret in env vars or Azure Key Vault.
- **Throttling**: Graph enforces ~10k requests/10 min per app; prefer page size 999 and backoff on HTTP 429.
- **Data to capture**: `id` (persist as `azure_id`), `displayName`, `mail`, `userPrincipalName`, `department`, `jobTitle`, `accountEnabled`, `lastPasswordChangeDateTime`. These populate/refresh our `users` table plus a new `source_system` field.

### 1.2 Remote Postgres (Odoo) Security Data

- **Tables**: Odoo stores security groups in `res_groups`, users in `res_users`, membership in `res_groups_users_rel`, and group inheritance in `res_groups_implied_rel` (docs: [Odoo security model](https://www.odoo.com/documentation/17.0/developer/reference/security.html)).
- **Connection**: Create a read-only DB account restricted to SELECT on the relevant tables, ideally exposed via a replica or Bastion/SSH tunnel. Use SQLAlchemy + `psycopg[binary]`.
- **Query considerations**: Use server-side cursors for large tables; include `write_date` for change detection. When Postgres is remote, enable SSL (`sslmode=require`), supply CA certs if needed.

### 1.3 Merge/Compare Workflow Drivers

- Having independent Azure + Odoo snapshots enables mismatch detection (e.g., Entra department vs. Odoo metadata, orphaned users, missing groups).
- The app should maintain historical snapshots (`snapshot_runs`), enabling diffing across annual reviews and feeding AI/visual analysis features.

## 2. Target Capabilities

| Capability | Summary |
|------------|---------|
| **Manual Azure Sync** | A UI action triggers `POST /api/sync/azure-users`, pulling Entra users & departments into local storage with progress + error reporting. |
| **Manual Odoo DB Sync** | UI action triggers `POST /api/sync/odoo-db` that queries the remote Postgres database for groups, users, memberships, inheritance, storing results as a new snapshot. |
| **Status Visibility** | Dashboard and Users/Groups pages show last sync timestamp, source, row counts, and highlight in-progress syncs. |
| **Comparison Service** | After both sources are refreshed, a “Merge & Compare” step analyzes differences, persists them, and surfaces them to the Analysis UI & AI layer. |
| **Historical Tracking** | Each sync run creates immutable records enabling timeline views and “since last review” diffing. |

## 3. High-Level Architecture

1. **Azure Connector**  
   - FastAPI endpoint -> service module (`azure_sync.py`)  
   - Uses MSAL ConfidentialClientApplication for token acquisition  
   - Streams `/users?$select=id,displayName,department,mail,accountEnabled`  
   - Writes to `azure_user_snapshots` (raw), then upserts into `users` table (adding `department`, `source_system='Azure'`, `last_seen_in_azure_at`)

2. **Odoo Postgres Connector**  
   - Endpoint -> service module (`odoo_sync.py`)  
   - Connects via SQLAlchemy engine using env DSN  
   - Queries `res_groups`, `res_users`, `res_groups_users_rel`, `res_groups_implied_rel`  
   - Stores raw rows in `odoo_group_snapshots`, `odoo_user_snapshots`, referencing a `snapshot_run_id`  
   - Upserts into operational tables (respecting archived flags)

3. **Reconciliation Engine**  
   - Consumes latest Azure + Odoo snapshots  
   - Produces diff artifacts: mismatched memberships, users missing from either source, department discrepancies, new/removed groups, permission inheritance changes  
   - Saves summaries for UI display and AI prompts

4. **UI Enhancements**  
   - Dashboard: “Data Sources” widget with last sync info + CTA buttons  
   - Users page: “Sync Azure Directory” button + banner showing department coverage  
   - Groups page: “Sync Odoo DB” button + indicator when data is stale  
   - Analysis page: “Run Merge & Compare” action feeding results into analysis table/cards

## 4. Implementation Roadmap

### Phase 1 – Foundations
1. **Secrets/config setup**: Extend `config` to include Azure tenant/client/secret, Graph scopes, Postgres DSN + SSL settings. Support `.env` + Azure Key Vault injection.
2. **Schema updates**:  
   - Core tables: add `azure_id`, `source_system`, `last_seen_in_azure_at` to `users`; add `odoo_id`, `source_system`, `synced_from_postgres_at` to `security_groups`.  
   - Snapshot tables: `sync_runs` (id, type, started_at, completed_at, status, stats, error_log), `azure_user_snapshots`, `odoo_group_snapshots`, `odoo_user_snapshots`, `odoo_group_membership_snapshots`.  
3. **Service scaffolding**: create `app/backend/services/azure_sync.py` and `.../odoo_sync.py` with placeholder implementations and shared logging utilities.

### Phase 2 – Azure Sync Feature
1. Implement `AzureGraphClient` (token cache, pagination, delta token storage).  
2. Add `POST /api/sync/azure-users` endpoint with background task support and a `GET /api/sync/status?type=azure` endpoint for polling.  
3. Upsert logic: map Graph user -> local `User` (create/update department, email, account flags). Mark users missing from Azure as `source_system` `'Legacy'` but keep them for historical reasons.  
4. UI updates:  
   - Users page: button + last sync banner  
   - Dashboard: show metrics (total Entra users, departments captured)

### Phase 3 – Odoo Postgres Sync
1. Build SQLAlchemy models/queries for the remote tables (or raw SQL).  
2. Endpoint `POST /api/sync/odoo-db` and `GET /api/sync/status?type=odoo`.  
3. Normalize into snapshot tables, then update `security_groups`, `users`, and membership join table. Preserve inheritance relationships.  
4. UI: Groups page button, Dashboard metrics (last Postgres sync, group/user counts, archived flag coverage).

### Phase 4 – Merge & Compare + Analysis Surfacing
1. Implement `comparison_service.compare_latest_snapshots()` returning structured summaries (JSON) stored in `comparison_results`.  
2. New endpoint `POST /api/sync/compare` triggers diff; `GET /api/sync/compare/latest` fetches results.  
3. Analysis UI: display mismatch categories, provide download/export, feed dataset to AI workflows.  
4. Hook into planned AI assistant to answer questions like “Which Azure departments lack Odoo groups?” by referencing comparison outputs.

### Phase 5 – Automation & Observability
1. Optional schedulers (APScheduler or OS-level cron) for nightly syncs.  
2. Structured logging + alerting (e.g., to Azure Monitor) for sync failures.  
3. Metrics for number of new/updated/deleted entities per run to track drift.

## 5. Security & Compliance Considerations

- **Least privilege**: Azure app limited to directory data only; Postgres account restricted to SELECT on specific tables/views.  
- **Secret storage**: prefer environment variables injected by deployment platform or integrate with Azure Key Vault.  
- **Data residency**: confirm whether synced user data (emails, departments) can sit in the same storage as the audit app; if not, encrypt columns at rest.  
- **Audit trail**: log who triggered manual syncs and keep error/output logs for compliance review.

## 6. Open Questions / Next Inputs Needed

1. Azure tenant details and confirmation of permissions (do we need manager info, job titles, or custom attributes beyond department?).  
2. Remote Postgres connectivity method (direct public endpoint vs. tunnel) and acceptable sync frequency.  
3. Volume expectations (number of users/groups) to size pagination/concurrency.  
4. Desired retention policy for snapshot history and comparison runs.  
5. Target timeline for AI integration so we can align data outputs with Claude prompt requirements.

Once these inputs are locked, we can proceed to implement Phases 1-4 iteratively.
