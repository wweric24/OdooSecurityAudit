# Odoo Security Documentation Reference Guide

Quick reference to available documentation files for Odoo Security Groups and Access Rights management.

---

## Documentation Files

### 📋 Policy & Procedures

**`Plain English Security Groups.md`**
- Security group definitions and access policies
- App-specific security levels (Contacts, Documents, Employees, Projects, etc.)
- Base user access for Internal vs Portal users
- Break Glass account and IT team policies
- **Use when**: Understanding security policies, determining access levels, onboarding users

---

### 📊 Operational Data

**`Access Groups (res.groups).csv`**
- Current security group assignments (13,057 rows, 284 groups)
- User-to-group mappings from Odoo system
- Group purposes, status, and inheritance relationships
- **Use when**: Auditing access, generating reports, verifying current assignments

---

### 🔧 Technical Guides

**`Odoo_17_Security_Quick_Reference.md`**
- Quick reference for Odoo 17 security architecture
- Security layers, groups, access rights, record rules
- Common patterns, best practices, debugging tips
- **Use when**: Implementing security, troubleshooting access issues, quick lookups

**`Odoo_17_Security_Architecture_Comprehensive_Guide.md`**
- Deep dive into Odoo 17 security system
- Detailed explanations of all security components
- Implementation examples and common pitfalls
- **Use when**: Learning security architecture, designing new security models, complex implementations

**`Odoo_User_Security_Group_Assignment.md`**
- Security group assignment guide by app/module
- Group membership requirements and descriptions
- Organized by: Base User, Documents, Employees, Projects, Helpdesk, Accounting, etc.
- **Use when**: Assigning groups to users, understanding group hierarchies, app-specific access

---

## Quick Decision Guide

| Need to... | Use This File |
|------------|---------------|
| Understand security policy | `Plain English Security Groups.md` |
| See current user assignments | `Access Groups (res.groups).csv` |
| Implement security in code | `Odoo_17_Security_Quick_Reference.md` |
| Learn security architecture | `Odoo_17_Security_Architecture_Comprehensive_Guide.md` |
| Assign groups to users | `Odoo_User_Security_Group_Assignment.md` |
| Audit access compliance | `Access Groups (res.groups).csv` + `Plain English Security Groups.md` |

---

## File Statistics

- **Plain English Security Groups.md**: 291 lines
- **Access Groups (res.groups).csv**: 13,057 rows, 284 unique groups
- **Odoo_17_Security_Quick_Reference.md**: ~490 lines
- **Odoo_17_Security_Architecture_Comprehensive_Guide.md**: ~1,600 lines
- **Odoo_User_Security_Group_Assignment.md**: ~299 lines

---

## Application Operations & Data Sync References

- **`DATA_SYNC_PLAN.md`** – Architecture & roadmap for syncing Azure (Entra) users and remote Odoo Postgres data. Includes API scopes, Postgres table references, sync workflow, and security considerations.
- **Data Tab (UI)** – The “Data & Integrations” tab in the application hosts Azure/Odoo sync triggers, CSV imports, and export downloads for day-to-day operations.
- **`INTEGRATION_SETUP.md`** – Step-by-step instructions to configure Azure App registrations, environment variables, Odoo Postgres DSNs, and verification steps for each data feed.
- **Environment Variables**:
  - `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_GRAPH_SCOPE` – configure Microsoft Graph access.
  - `AZURE_USER_SYNC_MOCK_FILE` – optional local JSON to simulate Azure data (defaults to `sample_data/azure_users_sample.json` during development).
  - `ODOO_POSTGRES_DSN`, `ODOO_SYNC_MOCK_FILE` – DSN or mock file for Odoo Postgres snapshots.
  - `ALLOW_SYNC_MOCKS` – set to `0` to disable mock file usage.
- **API Endpoints**:
  - `POST /api/sync/azure-users` – pull latest Entra users/departments into the app; UI button on Users page.
  - `POST /api/sync/odoo-db` – query remote Postgres for Odoo groups/users; UI button on Groups page.
  - `GET /api/sync/status?sync_type=<type>` – inspect recent sync runs (status, timestamps, row counts) for dashboards or troubleshooting.

