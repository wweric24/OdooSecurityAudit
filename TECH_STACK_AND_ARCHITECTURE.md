# Odoo Security Management Application - Tech Stack & Architecture

## Proposed Technology Stack

### Frontend Layer

**Framework: React 18+ with TypeScript**
- **Why**: 
  - Mature ecosystem with excellent visualization libraries
  - Strong TypeScript support for type safety
  - Component-based architecture for reusable UI elements
  - Large community and extensive documentation
- **Key Libraries**:
  - `react-router-dom` - Client-side routing
  - `axios` or `fetch` - API communication
  - `react-query` or `swr` - Data fetching and caching
  - `zustand` or `redux-toolkit` - State management (lightweight)
  - `react-hook-form` - Form handling
  - `date-fns` - Date manipulation

**Visualization Libraries**:
- **Cytoscape.js** (Primary choice)
  - Excellent for network/graph visualizations
  - Perfect for inheritance hierarchy diagrams
  - Interactive node/edge manipulation
  - Good performance with large datasets
- **D3.js** (Alternative/Complementary)
  - More flexible but steeper learning curve
  - Better for custom visualizations
  - Can be used alongside Cytoscape for specific charts

**UI Component Library**:
- **Material-UI (MUI)** or **Ant Design**
  - Pre-built components (tables, forms, dialogs)
  - Consistent design system
  - Accessibility built-in
  - Reduces development time

**Styling**:
- **Tailwind CSS** or **CSS Modules**
  - Utility-first approach
  - Easy customization
  - Small bundle size

### Backend Layer

**Framework: FastAPI (Python)**
- **Why**:
  - Fast performance (comparable to Node.js)
  - Automatic API documentation (OpenAPI/Swagger)
  - Built-in data validation with Pydantic
  - Excellent data processing performance
  - Easy to learn Python syntax
  - Strong typing support
- **Key Libraries**:
  - `pydantic` - Data validation and models
  - `sqlalchemy` - ORM for database operations
  - `python-jose` - JWT authentication (if needed)

**Alternative: Flask** (if team prefers)
- Lighter weight
- More flexibility
- Requires more manual setup

### Database Layer

**SQLite (Initial Development)**
- **Why**:
  - Zero configuration
  - Single file database
  - Perfect for small team/internal tool
  - Easy backup/restore
  - No server required
- **Limitations**: 
  - Single writer (fine for this use case)
  - Limited concurrent writes (acceptable for audit tool)

**PostgreSQL (Future Migration Path)**
- If scaling needed
- Better concurrent access
- More advanced features
- Easy migration path from SQLite

**ORM: SQLAlchemy**
- Database abstraction
- Easy to switch between SQLite and PostgreSQL
- Type-safe queries
- Migration support with Alembic

### Development & Deployment

**Containerization: Docker**
- Consistent development environment
- Easy deployment
- Isolated dependencies
- Docker Compose for local development

**Package Management**:
- **Python**: `pip` with `requirements.txt` or `poetry`
- **Node.js**: `npm` or `yarn` with `package.json`

**Version Control**: Git

**Build Tools**:
- **Frontend**: Vite or Create React App
- **Backend**: uvicorn (FastAPI) or gunicorn (Flask)

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        User Browser                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              React Frontend Application               │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │   │
│  │  │Dashboard │  │Visualizer│  │  Analysis │          │   │
│  │  └──────────┘  └──────────┘  └──────────┘          │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │   │
│  │  │Group Mgmt│  │User Matrix│ │  Reports │          │   │
│  │  └──────────┘  └──────────┘  └──────────┘          │   │
│  └──────────────────────────────────────────────────────┘   │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTP/REST API
                        │ (JSON)
┌───────────────────────▼─────────────────────────────────────┐
│              FastAPI Backend Server                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              API Endpoints                            │   │
�  �  /api/sync/azure-users  /api/sync/odoo-db     �   �
�  �  /api/groups  /api/users  /api/analysis  /api/export  �   �
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Business Logic Layer                          │   │
│  │  • Sync Orchestrator  • Standards Validator                │   │
│  │  • Compliance Checker  • Gap Analyzer                 │   │
│  │  • Hierarchy Builder  • Audit Tracker                 │   │
│  └──────────────────────────────────────────────────────┘   │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ SQLAlchemy ORM
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                    SQLite Database                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │Security Groups│  │    Users     │  │  Imports     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Inheritance  │  │  Standards  │  │   History    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagram

### Data Sync Process

**Azure Directory Sync**
1. User clicks "Sync Azure Directory" on the Data tab.
2. FastAPI calls Microsoft Graph using the configured client credentials.
3. Responses are normalized into `users` rows with azure metadata.
4. A `sync_runs` record captures statistics (processed, created, updated).

**Odoo Postgres Sync**
1. User selects PREPROD/PROD and clicks "Sync Odoo DB".
2. FastAPI connects to the Postgres replica via psycopg (`ODOO_PREPROD_DSN` or `ODOO_PROD_DSN`).
3. Groups, users, memberships, and inheritance chains are upserted via SQLAlchemy.
4. Access metadata (purpose, allowed functions, hierarchy) is updated along with `synced_from_postgres_at`.
5. A `sync_runs` record documents counts and last run status.

---

## Component Interaction Diagram

### Frontend Component Structure

```
┌─────────────────────────────────────────────────────────────┐
│                      App Component                            │
│  (Main Router & Layout)                                      │
└────────────┬──────────────────────────────────────────────────┘
             │
     ┌────────┴────────┬──────────────┬──────────────┐
     │                 │              │              │
     ▼                 ▼              ▼              ▼
┌─────────┐    ┌──────────┐   ┌──────────┐   ┌──────────┐
│Dashboard│    │  Groups  │   │  Users   │   │ Analysis │
│         │    │          │   │          │   │          │
│• Stats  │    │• List    │   │• Matrix  │   │• Reports │
│• Alerts │    │• Details │   │• Filter  │   │• Export  │
│• Status │    │• Edit    │   │• Search  │   │• Audit   │
└────┬────┘    └────┬─────┘   └────┬─────┘   └────┬─────┘
     │              │              │              │
     │              │              │              │
     └──────────────┴──────────────┴──────────────┘
                    │
                    ▼
          ┌──────────────────┐
          │  API Service     │
          │  (Axios/Fetch)    │
          │                   │
          │  • syncAzure()   │
          │  • syncOdoo()    │
          │  • getGroups()   │
          │  • getUsers()    │
          │  • getAnalysis() │
          └─────────┬─────────┘
                    │
                    ▼
          ┌──────────────────┐
          │  FastAPI Backend │
          └──────────────────┘
```

---

## Database Schema

### Entity Relationship Diagram

```
┌─────────────────────┐
│   SecurityGroup     │
├─────────────────────┤
│ id (PK)             │
│ name                 │
│ module               │
│ access_level         │
│ purpose              │
│ status               │
│ permissions          │
│ who_requires         │
│ why_required         │
│ last_audit_date      │
│ created_at           │
│ updated_at           │
└──────────┬───────────┘
           │
           │ 1:N
           │
┌──────────▼───────────┐
│  GroupInheritance    │
├──────────────────────┤
│ id (PK)              │
│ parent_group_id (FK) │
│ child_group_id (FK)  │
└──────────────────────┘

┌─────────────────────┐
│       User          │
├─────────────────────┤
│ id (PK)             │
│ name                 │
│ email (optional)     │
│ created_at           │
└──────────┬───────────┘
           │
           │ M:N
           │
┌──────────▼───────────┐
│  UserGroupAssignment │
├──────────────────────┤
│ id (PK)              │
│ user_id (FK)         │
│ group_id (FK)        │
│ assigned_date        │
└──────────────────────┘

���������������������Ŀ
�       SyncRuns      �
���������������������Ĵ
� id (PK)             �
� sync_type          �
� status             �
� started_at         �
� completed_at       �
� stats (JSON)       �
� error_message      �
������������������������
```

---

## Application Workflow

### User Journey: Import and Analyze

1. User opens the application and lands on the dashboard.
2. Dashboard shows the last Azure/Odoo sync status plus key metrics.
3. User opens the Data tab and runs **Sync Azure Directory**.
4. A toast and status chip confirm rows processed/created/updated.
5. User runs **Sync Odoo DB** for the selected environment.
6. Groups, users, and memberships refresh; history grid updates.
7. User navigates to the Groups view to explore newly synced data.
8. Filters (module, status, search) highlight specific cohorts.
9. Selecting a group shows documentation, users, inheritance, and compliance flags.
10. User switches to Analysis to run compliance/gap checks.
11. Reports are exported (CSV/PDF) or shared with stakeholders.


---

## Technology Stack Summary Table

| Layer | Technology | Purpose | Alternatives |
|-------|-----------|---------|--------------|
| **Frontend Framework** | React 18 + TypeScript | UI components and interactivity | Vue.js, Angular |
| **Visualization** | Cytoscape.js | Network/hierarchy diagrams | D3.js, vis.js |
| **UI Components** | Material-UI | Pre-built components | Ant Design, Chakra UI |
| **State Management** | Zustand | Lightweight state | Redux Toolkit, Jotai |
| **Backend Framework** | FastAPI (Python) | API server and business logic | Flask, Django, Node.js |
| **HTML Parsing** | BeautifulSoup4 | Extract text from HTML | html.parser, lxml |
| **Database** | SQLite | Data storage | PostgreSQL, MySQL |
| **ORM** | SQLAlchemy | Database abstraction | SQLModel, Peewee |
| **Containerization** | Docker | Deployment | Podman, Kubernetes |
| **Build Tool** | Vite | Frontend bundling | Webpack, Parcel |

---

## Deployment Architecture

### Docker Compose Setup

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    volumes:
      - ./data:/app/data  # SQLite database
    environment:
      - DATABASE_URL=sqlite:///./data/security.db
      
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
    environment:
      - REACT_APP_API_URL=http://localhost:8000
```

### Production Deployment

```
┌─────────────────────────────────────────┐
│         Reverse Proxy (Nginx)          │
│  • SSL/TLS termination                 │
│  • Static file serving                 │
│  • API proxying                        │
└──────────────┬──────────────────────────┘
               │
       ┌───────┴───────┐
       │               │
       ▼               ▼
┌──────────┐    ┌──────────┐
│ Frontend │    │ Backend  │
│ (React)  │    │(FastAPI) │
│          │    │          │
│ Static   │    │ API      │
│ Files    │    │ Server   │
└──────────┘    └────┬─────┘
                     │
                     ▼
              ┌──────────┐
              │ SQLite   │
              │ Database │
              └──────────┘
```

---

## Key Design Decisions

### Why FastAPI over Flask?
- Automatic API documentation
- Better performance
- Built-in data validation
- Modern async support
- Type hints throughout

### Why React over Vue?
- Larger ecosystem
- More visualization library options
- Better TypeScript integration
- Team familiarity (if applicable)

### Why SQLite initially?
- Zero configuration
- Perfect for internal tool
- Easy backup (single file)
- Can migrate to PostgreSQL later

### Why Cytoscape.js?
- Purpose-built for network graphs
- Perfect for inheritance visualization
- Good performance with 266+ nodes
- Interactive features out of the box

---

## Development Phases

### Phase 1: MVP (Minimum Viable Product)
- Basic group listing
- Simple visualization
- Compliance checking

### Phase 2: Enhanced Features
- Full hierarchy visualization
- User assignment matrix
- Advanced analysis
- Export capabilities

### Phase 3: Polish
- UI/UX improvements
- Performance optimization
- Comprehensive testing
- Documentation

---

## Performance Considerations

- **Frontend**: 
  - Code splitting for large bundles
  - Virtual scrolling for long lists
  - Memoization for expensive computations
  
- **Backend**:
  - Database indexing on frequently queried fields
  - Caching for analysis results
  
- **Database**:
  - Indexes on: group_name, module, status, user_id
  - Query optimization for inheritance chains

---

## External Data Sync Architecture

### Overview

The application supports syncing data from two external sources:
1. **Microsoft Entra ID (Azure AD)** - User accounts, departments, and account status
2. **Odoo PostgreSQL Database** - Security groups, users, memberships, and inheritance relationships

### Research Summary

#### Microsoft Entra ID (Azure AD) Users & Departments

- **API surface**: Microsoft Graph `GET /users` exposes `id`, `displayName`, `mail`, `department`, `accountEnabled`, and custom attributes; use `$select` to limit payload size.
- **Auth**: Register an Entra app, grant `User.Read.All` (application scope) in Microsoft Graph, and use OAuth 2.0 client credential flow via MSAL. Tokens last 1h; store tenant id, client id, and client secret in env vars or Azure Key Vault.
- **Throttling**: Graph enforces ~10k requests/10 min per app; prefer page size 999 and backoff on HTTP 429.
- **Data to capture**: `id` (persist as `azure_id`), `displayName`, `mail`, `userPrincipalName`, `department`, `jobTitle`, `accountEnabled`, `lastPasswordChangeDateTime`. These populate/refresh our `users` table plus a new `source_system` field.

#### Remote Postgres (Odoo) Security Data

- **Tables**: Odoo stores security groups in `res_groups`, users in `res_users`, membership in `res_groups_users_rel`, and group inheritance in `res_groups_implied_rel`.
- **Connection**: Create a read-only DB account restricted to SELECT on the relevant tables, ideally exposed via a replica or Bastion/SSH tunnel. Use SQLAlchemy + `psycopg[binary]`.
- **Query considerations**: Use server-side cursors for large tables; include `write_date` for change detection. When Postgres is remote, enable SSL (`sslmode=require`), supply CA certs if needed.

#### Merge/Compare Workflow Drivers

- Having independent Azure + Odoo snapshots enables mismatch detection (e.g., Entra department vs. Odoo metadata, orphaned users, missing groups).
- The app maintains historical snapshots (`sync_runs`), enabling diffing across annual reviews and feeding AI/visual analysis features.

### Target Capabilities

| Capability | Summary |
|------------|---------|
| **Manual Azure Sync** | A UI action triggers `POST /api/sync/azure-users`, pulling Entra users & departments into local storage with progress + error reporting. |
| **Manual Odoo DB Sync** | UI action triggers `POST /api/sync/odoo-db` that queries the remote Postgres database for groups, users, memberships, inheritance, storing results as a new snapshot. |
| **Status Visibility** | Dashboard and Users/Groups pages show last sync timestamp, source, row counts, and highlight in-progress syncs. |
| **Comparison Service** | After both sources are refreshed, a "Merge & Compare" step analyzes differences, persists them, and surfaces them to the Analysis UI & AI layer. |
| **Historical Tracking** | Each sync run creates immutable records enabling timeline views and "since last review" diffing. |

### High-Level Architecture

1. **Azure Connector**  
   - FastAPI endpoint -> service module (`azure_sync.py`)  
   - Uses MSAL ConfidentialClientApplication for token acquisition  
   - Streams `/users?$select=id,displayName,department,mail,accountEnabled`  
   - Writes to `sync_runs` (raw), then upserts into `users` table (adding `department`, `source_system='Azure'`, `last_seen_in_azure_at`)

2. **Odoo Postgres Connector**  
   - Endpoint -> service module (`odoo_sync.py`)  
   - Connects via SQLAlchemy engine using env DSN  
   - Queries `res_groups`, `res_users`, `res_groups_users_rel`, `res_groups_implied_rel`  
   - Stores raw rows in `sync_runs`, referencing a `sync_run_id`  
   - Upserts into operational tables (respecting archived flags)
   - Tags data with environment (Pre-Production/Production)

3. **Reconciliation Engine**  
   - Consumes latest Azure + Odoo snapshots  
   - Produces diff artifacts: mismatched memberships, users missing from either source, department discrepancies, new/removed groups, permission inheritance changes  
   - Saves summaries for UI display and AI prompts

4. **UI Enhancements**  
   - Dashboard: "Data Sources" widget with last sync info + CTA buttons  
   - Users page: "Sync Azure Directory" button + banner showing department coverage  
   - Groups page: "Sync Odoo DB" button + indicator when data is stale  
   - Analysis page: "Run Merge & Compare" action feeding results into analysis table/cards

### Implementation Status

✅ **Phase 1 – Foundations** (Completed)
- Secrets/config setup with Azure tenant/client/secret, Graph scopes, Postgres DSN + SSL settings
- Schema updates: `azure_id`, `source_system`, `last_seen_in_azure_at` to `users`; `odoo_id`, `source_system`, `synced_from_postgres_at` to `security_groups`
- Snapshot tables: `sync_runs` (id, type, started_at, completed_at, status, stats, error_log)
- Service scaffolding: `app/backend/services/azure_sync.py` and `.../odoo_sync.py` implemented

✅ **Phase 2 – Azure Sync Feature** (Completed)
- `AzureGraphClient` (token cache, pagination, delta token storage) implemented
- `POST /api/sync/azure-users` endpoint with background task support and `GET /api/sync/status?type=azure` endpoint for polling
- Upsert logic: map Graph user -> local `User` (create/update department, email, account flags)
- UI updates: Users page button + last sync banner, Dashboard metrics

✅ **Phase 3 – Odoo Postgres Sync** (Completed)
- SQLAlchemy models/queries for the remote tables implemented
- Endpoint `POST /api/sync/odoo-db` and `GET /api/sync/status?type=odoo`
- Normalize into snapshot tables, then update `security_groups`, `users`, and membership join table
- Preserve inheritance relationships
- UI: Groups page button, Dashboard metrics (last Postgres sync, group/user counts, archived flag coverage)
- Environment tagging (Pre-Production/Production)

⚠️ **Phase 4 – Merge & Compare + Analysis Surfacing** (Partially Implemented)
- ✅ `comparison_service.compare_latest_snapshots()` returning structured summaries (JSON) stored in `comparison_results`
- ✅ New endpoint `POST /api/sync/compare` triggers diff; `GET /api/sync/compare/latest` fetches results
- ❌ Analysis UI: display mismatch categories, provide download/export, feed dataset to AI workflows
- ❌ Hook into planned AI assistant to answer questions like "Which Azure departments lack Odoo groups?" by referencing comparison outputs

⏳ **Phase 5 – Automation & Observability** (Planned)
- Optional schedulers (APScheduler or OS-level cron) for nightly syncs
- Structured logging + alerting (e.g., to Azure Monitor) for sync failures
- Metrics for number of new/updated/deleted entities per run to track drift

### Security & Compliance Considerations

- **Least privilege**: Azure app limited to directory data only; Postgres account restricted to SELECT on specific tables/views
- **Secret storage**: prefer environment variables injected by deployment platform or integrate with Azure Key Vault
- **Data residency**: confirm whether synced user data (emails, departments) can sit in the same storage as the audit app; if not, encrypt columns at rest
- **Audit trail**: log who triggered manual syncs and keep error/output logs for compliance review

---

This architecture provides a solid foundation for building a maintainable, scalable security management application that meets all the requirements outlined in the project plan.

