# PostgreSQL Read-Only User Implementation Log

**Date:** November 18, 2025  
**Server:** WET001-17-preprod  
**Database:** Crew_Acceptance_Testing  
**User Created:** UAV (read-only user)  
**App Server IP:** 192.168.9.231

---

## Overview

This document records the actual implementation steps taken to create a read-only PostgreSQL user for the Odoo Security Management application. The user `UAV` was created with SELECT-only access to specific security-related tables in the `Crew_Acceptance_Testing` database.

---

## Prerequisites Completed

1. **SSH Access:** Connected to server as user `eric`
2. **Sudo Access:** User `eric` is in the `sudo` group
3. **PostgreSQL Version:** 16.8 (Ubuntu 16.8-1.pgdg22.04+1)
4. **PostgreSQL Configuration:** Already configured to listen on all interfaces (`listen_addresses = '*'`)

---

## Step 1: Connect to PostgreSQL

```bash
sudo -u postgres psql
```

**Result:** Connected successfully as postgres superuser.

---

## Step 2: List Available Databases

```sql
\l
```

**Databases Found:**
- CAT_Security
- Crew_Acceptance_Testing ← **Target database**
- Crew_Acceptance_Testing_Backup
- Data_Conversion_20251101
- Security
- postgres
- template-odoo
- template0
- template1
- wedoo-test

---

## Step 3: Create Read-Only User

```sql
CREATE USER UAV WITH PASSWORD 'YOUR_SECURE_PASSWORD_HERE';
```

**Result:** `CREATE ROLE`

**Note:** Replace `YOUR_SECURE_PASSWORD_HERE` with the actual secure password set during implementation.

```sql
ALTER USER UAV NOSUPERUSER NOCREATEDB;
```

**Result:** `ALTER ROLE`

**User Properties:**
- Username: `uav` (PostgreSQL stores unquoted identifiers in lowercase)
- No superuser privileges
- Cannot create databases
- Password authentication enabled

---

## Step 4: Connect to Target Database

```sql
\c "Crew_Acceptance_Testing"
```

**Result:** Connected to database `Crew_Acceptance_Testing` as user `postgres`

**Note:** Database name requires quotes due to mixed case.

---

## Step 5: Grant Database Connection Permission

```sql
GRANT CONNECT ON DATABASE "Crew_Acceptance_Testing" TO UAV;
```

**Result:** `GRANT`

**Note:** Database name must be quoted to preserve case.

---

## Step 6: Grant Schema Usage Permission

```sql
GRANT USAGE ON SCHEMA public TO UAV;
```

**Result:** `GRANT`

---

## Step 7: Grant SELECT Permissions on Required Tables

The following tables were granted SELECT-only access:

```sql
GRANT SELECT ON TABLE res_groups TO UAV;
GRANT SELECT ON TABLE res_users TO UAV;
GRANT SELECT ON TABLE res_groups_users_rel TO UAV;
GRANT SELECT ON TABLE res_groups_implied_rel TO UAV;
GRANT SELECT ON TABLE ir_model_access TO UAV;
GRANT SELECT ON TABLE ir_model TO UAV;
GRANT SELECT ON TABLE ir_module_category TO UAV;
```

**Result:** All commands returned `GRANT`

**Tables with Access:**
- `res_groups` - Security group definitions
- `res_users` - User accounts
- `res_groups_users_rel` - User-to-group assignments
- `res_groups_implied_rel` - Group inheritance relationships
- `ir_model_access` - CRUD permissions per group
- `ir_model` - Model/table names
- `ir_module_category` - Group categories/modules

---

## Step 8: Verify Permissions

```sql
\dp res_groups
```

**Result:** 
```
Access privileges
 Schema |    Name    | Type  | Access privileges | Column privileges | Policies
--------+------------+-------+-------------------+-------------------+----------
 public | res_groups | table | odoo=arwdDxt/odoo+|                   |
        |            |       | uav=r/odoo        |                   |
```

**Interpretation:** `uav=r/odoo` confirms the UAV user has read (`r`) permissions granted by the `odoo` user.

---

## Step 9: Backup PostgreSQL Configuration

Before making changes to `pg_hba.conf`, a backup was created:

```bash
sudo cp /etc/postgresql/16/main/pg_hba.conf /etc/postgresql/16/main/pg_hba.conf.backup.$(date +%Y%m%d_%H%M%S)
```

**Backup File Created:**
```
/etc/postgresql/16/main/pg_hba.conf.backup.20251118_102645
```

**File Size:** 6.8K

**Restore Command (if needed):**
```bash
sudo cp /etc/postgresql/16/main/pg_hba.conf.backup.20251118_102645 /etc/postgresql/16/main/pg_hba.conf
sudo systemctl restart postgresql
```

---

## Step 10: Configure Remote Access in pg_hba.conf

**File Location:** `/etc/postgresql/16/main/pg_hba.conf`

**Configuration Added:**
```
#### UAV USER (for Odoo Security app)
local   Crew_Acceptance_Testing   uav   scram-sha-256
host    Crew_Acceptance_Testing   uav   127.0.0.1/32        md5
host    Crew_Acceptance_Testing   uav   ::1/128             md5
host    Crew_Acceptance_Testing   uav   192.168.9.231/32    md5
```

**Explanation:**
- `local` - Unix socket connections (same server)
- `127.0.0.1/32` - IPv4 localhost TCP connections
- `::1/128` - IPv6 localhost TCP connections
- `192.168.9.231/32` - App server IP address (remote access)
- `md5` - Password authentication method (matches existing server configuration)

**Authentication Methods Used:**
- `scram-sha-256` for local Unix socket (more secure)
- `md5` for TCP/IP connections (matches existing server pattern)

---

## Step 11: Restart PostgreSQL

```bash
sudo systemctl restart postgresql
```

**Verification:**
```bash
sudo systemctl status postgresql
```

**Expected Result:** `active (running)`

**Verify Listening:**
```bash
sudo ss -tlnp | grep 5432
```

**Expected Output:** PostgreSQL listening on `0.0.0.0:5432` or `*:5432`

---

## Connection String

### For Application Configuration

**Format:**
```
postgresql+psycopg://USERNAME:PASSWORD@HOST:PORT/DATABASE?sslmode=MODE
```

**Actual Connection String:**
```
ODOO_PREPROD_DSN=postgresql+psycopg://uav:PASSWORD@WET001-17-preprod:5432/Crew_Acceptance_Testing?sslmode=prefer
```

**Or using IP address:**
```
ODOO_PREPROD_DSN=postgresql+psycopg://uav:PASSWORD@<database-server-ip>:5432/Crew_Acceptance_Testing?sslmode=prefer
```

**Connection Details:**
- **Username:** `uav` (lowercase)
- **Password:** [Set during user creation - store securely]
- **Host:** `WET001-17-preprod` or database server IP address
- **Port:** `5432`
- **Database:** `Crew_Acceptance_Testing` (case-sensitive, may need quotes in some contexts)
- **SSL Mode:** `prefer` (for local/VLAN connections) or `require` (for production)

---

## Security Verification

### Allowed Operations (Should Work)
- `SELECT` queries on: `res_groups`, `res_users`, `res_groups_users_rel`, `res_groups_implied_rel`, `ir_model_access`, `ir_model`, `ir_module_category`

### Blocked Operations (Should Fail)
- `SELECT` on any other tables (e.g., `account_move`, `res_partner`)
- `INSERT`, `UPDATE`, `DELETE` on any table
- `CREATE`, `DROP`, `ALTER` operations
- Access to financial data, inventory, sales, HR records

---

## Testing Connection

### From Database Server (Local)
```bash
psql -h localhost -U uav -d "Crew_Acceptance_Testing"
```

### From App Server (Remote)
```bash
psql -h <database-server-ip> -U uav -d "Crew_Acceptance_Testing"
```

**Expected:** Password prompt, then successful connection with `Crew_Acceptance_Testing=>` prompt.

---

## Troubleshooting

### Issue: "no pg_hba.conf entry for host"
**Solution:** Verify the entry exists in `/etc/postgresql/16/main/pg_hba.conf` and PostgreSQL has been restarted.

### Issue: "password authentication failed"
**Solution:** Verify the password is correct. Password can be reset with:
```sql
ALTER USER uav WITH PASSWORD 'new_password';
```

### Issue: "database does not exist"
**Solution:** Use quotes around database name: `"Crew_Acceptance_Testing"` (case-sensitive)

### Issue: "permission denied for table"
**Solution:** Verify grants were applied:
```sql
\dp table_name
```

---

## Audit Trail (Optional)

To enable logging of all queries from the UAV user:

```sql
ALTER USER uav SET log_statement = 'all';
```

This creates an audit trail in PostgreSQL logs at `/var/log/postgresql/`

---

## Revoking Access (If Needed)

To remove access later:

```sql
-- Revoke table permissions
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM uav;

-- Revoke database connection
REVOKE CONNECT ON DATABASE "Crew_Acceptance_Testing" FROM uav;

-- Remove user
DROP USER uav;
```

Then remove the entries from `pg_hba.conf` and restart PostgreSQL.

---

## Notes

1. **Case Sensitivity:** PostgreSQL stores unquoted identifiers in lowercase. The user is `uav` even though created as `UAV`.
2. **Database Name:** `Crew_Acceptance_Testing` requires quotes in SQL commands due to mixed case.
3. **Backup:** Always backup `pg_hba.conf` before making changes.
4. **Password:** Store the UAV user password securely (password manager, secrets management system).
5. **Network:** App server (192.168.9.231) is in the same VLAN, so `sslmode=prefer` is acceptable. For production across networks, use `sslmode=require`.

---

## Next Steps

1. Test connection from app server (192.168.9.231)
2. Update application `.env` file with connection string
3. Test application can read from allowed tables
4. Verify application cannot access restricted tables
5. Document password in secure password management system

---

## Odoo Sync Integration Fixes

**Date:** November 18, 2025  
**Issue:** Multiple compatibility issues when syncing from Odoo PostgreSQL database  
**Status:** ✅ Resolved

### Issues Identified and Fixed

#### 1. Database Connection String Format
**Problem:** `psycopg.connect()` doesn't accept SQLAlchemy's `postgresql+psycopg://` format  
**Solution:** Added automatic conversion from `postgresql+psycopg://` to `postgresql://` format  
**File:** `app/backend/services/odoo_sync.py` (line 31-34)

#### 2. res_users Name Column Missing
**Problem:** `res_users` table doesn't have a `name` column in this Odoo version  
**Solution:** 
- Check if `name` column exists using `information_schema`
- If not, use `login` field as the name (login is typically email/username)
- Removed attempt to join with `res_partner` (read-only user doesn't have access)
**File:** `app/backend/services/odoo_sync.py` (line 58-91)

#### 3. res_groups_implied_rel Column Names
**Problem:** Column names are `gid` and `hid` (not `parent_id`/`child_id`)  
**Solution:** 
- Dynamic column name discovery using `information_schema`
- Intelligent mapping based on column name patterns (`hid` = child/implied group)
**File:** `app/backend/services/odoo_sync.py` (line 128-162)

#### 4. res_groups_users_rel Column Names
**Problem:** Column order is `gid` (group) first, `uid` (user) second  
**Solution:** 
- Dynamic column name discovery
- Intelligent mapping based on column name patterns (`gid` = group, `uid` = user)
**File:** `app/backend/services/odoo_sync.py` (line 93-126)

#### 5. Translated Fields (JSON/Dict)
**Problem:** Odoo stores translated fields as JSON/dictionaries (e.g., `{'en_US': 'Internal User'}`)  
**Solution:** 
- Detect if field value is a dictionary
- Extract the first value from translation dict
- Applied to both `res_groups.name` and `ir_model.name` fields
**File:** `app/backend/services/odoo_sync.py` (line 41-56, 190-206)

#### 6. UNIQUE Constraint Violations
**Problem:** Groups already exist from previous syncs/imports causing constraint violations  
**Solution:** 
- Added `IntegrityError` exception handling
- Rollback and retry finding existing group
- Use `flush()` to catch errors early
**File:** `app/backend/services/odoo_sync.py` (line 244-276)

#### 7. Missing AccessRight Model Fields
**Problem:** `AccessRight` model missing fields used by sync code (`odoo_access_id`, `model_description`, `perm_*` fields)  
**Solution:** 
- Added `odoo_access_id` for tracking Odoo access right IDs
- Added `model_description` for human-readable model names
- Added `perm_read`, `perm_write`, `perm_create`, `perm_unlink` fields
- Added `synced_at` timestamp
- Kept legacy fields (`read`, `write`, `create`, `delete`) for compatibility
**File:** `app/data/models.py` (line 121-153)

### Database Schema Discovered

**res_groups_implied_rel:**
- Column 1: `gid` (parent group)
- Column 2: `hid` (implied/child group)

**res_groups_users_rel:**
- Column 1: `gid` (group)
- Column 2: `uid` (user)

**res_users:**
- No `name` column (uses `login` as identifier)
- Has: `id`, `login`, `partner_id`, `active`, `write_date`

### Configuration Updated

**Database:** Changed from `preprod` to `Crew_Acceptance_Testing`  
**SSL Mode:** Changed from `disable` to `prefer`  
**Connection String:** `postgresql+psycopg://uav:PASSWORD@10.11.99.172:5432/Crew_Acceptance_Testing?sslmode=prefer`

### Testing Status

- ✅ Connection string format conversion working
- ✅ User name extraction working (using login)
- ✅ Group inheritance relationships syncing correctly
- ✅ User-group memberships syncing correctly
- ✅ Translated fields handling working
- ✅ UNIQUE constraint handling working
- ✅ Access rights syncing with all required fields

### Next Steps

1. Verify sync completes successfully end-to-end
2. Test with production database when ready
3. Monitor for any additional schema differences

---

## Contacts & References

- **Implementation Date:** November 18, 2025
- **Server:** WET001-17-preprod
- **PostgreSQL Version:** 16.8
- **Backup Location:** `/etc/postgresql/16/main/pg_hba.conf.backup.20251118_102645`
- **Related Documentation:** `ODOO_DATABASE_SETUP.md`

