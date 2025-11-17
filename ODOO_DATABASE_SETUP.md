# Odoo PostgreSQL Database User Setup

This guide explains how to create a **read-only** PostgreSQL user with access to only the specific tables needed for the Odoo Security Management application.

## Security Principle

The application needs SELECT-only access to these tables:
- `res_groups` - Security group definitions
- `res_users` - User accounts
- `res_groups_users_rel` - User-to-group assignments
- `res_groups_implied_rel` - Group inheritance relationships
- `ir_model_access` - CRUD permissions per group
- `ir_model` - Model/table names
- `res_groups_category` (optional) - Group categories/modules

**No access to**: Financial data, inventory, sales, HR records, or any other business data.

---

## Step 1: Connect to PostgreSQL

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

---

## Step 2: Create the Read-Only User

```sql
-- Create user with a strong password
CREATE USER odoo_security_reader WITH PASSWORD 'YOUR_SECURE_PASSWORD_HERE';

-- No create database or superuser privileges
ALTER USER odoo_security_reader NOSUPERUSER NOCREATEDB;
```

---

## Step 3: Grant Minimal Required Permissions

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

---

## Step 4: Verify Permissions

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

---

## Step 5: Configure PostgreSQL for Remote Access (if needed)

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

---

## Step 6: Build the Connection String (DSN)

For PREPROD (database on same server as Odoo app):

```
ODOO_PREPROD_DSN=postgresql+psycopg://odoo_security_reader:YOUR_PASSWORD@localhost:5432/your_odoo_database?sslmode=prefer
```

For PROD (separate database server):

```
ODOO_PROD_DSN=postgresql+psycopg://odoo_security_reader:YOUR_PASSWORD@prod-db-server:5432/your_odoo_database?sslmode=require
```

### DSN Format Breakdown:
```
postgresql+psycopg://USERNAME:PASSWORD@HOST:PORT/DATABASE?sslmode=MODE
```

- **USERNAME**: `odoo_security_reader`
- **PASSWORD**: The password you set in Step 2
- **HOST**: `localhost` (same server) or IP/hostname (remote)
- **PORT**: Usually `5432`
- **DATABASE**: Your Odoo database name
- **sslmode**: `prefer` (local), `require` (remote/prod)

---

## Step 7: Test Connection

From the application server, test the connection:

```bash
# Install psql client if not present
sudo apt install postgresql-client

# Test connection
psql "postgresql://odoo_security_reader:YOUR_PASSWORD@localhost:5432/your_odoo_database?sslmode=prefer"
```

---

## Provide These Details to Me

After setup, provide:

1. **PREPROD Connection**:
   - Host: (e.g., `localhost` or `preprod-db.yourcompany.com`)
   - Port: (usually `5432`)
   - Database name: (your Odoo database name)
   - Username: `odoo_security_reader`
   - Password: (the password you created)
   - SSL mode: `prefer` or `require`

2. **PROD Connection** (when ready):
   - Same details for production database server

I'll construct the DSN strings and update your `.env` file.

---

## Revoking Access (If Needed)

To remove access later:

```sql
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM odoo_security_reader;
REVOKE CONNECT ON DATABASE your_odoo_database FROM odoo_security_reader;
DROP USER odoo_security_reader;
```

---

## Audit Trail

Consider enabling PostgreSQL logging to track queries:

```sql
ALTER USER odoo_security_reader SET log_statement = 'all';
```

This creates an audit trail of all queries run by the application.
