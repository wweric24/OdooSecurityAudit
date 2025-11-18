-- ============================================================================
-- Odoo Database Schema Diagnostic Queries
-- ============================================================================
-- Run these queries to discover the actual column names in your Odoo database
-- This will help fix the sync code to work with your specific schema
--
-- STEP-BY-STEP INSTRUCTIONS:
-- ============================================================================

-- STEP 1: Connect to PostgreSQL
-- If you're already SSH'd into the server, run one of these:
--
-- Option A: Connect as postgres user (if you have sudo)
--   sudo -u postgres psql -d Crew_Acceptance_Testing
--
-- Option B: Connect as your current user (if you have direct access)
--   psql -d Crew_Acceptance_Testing -U uav
--
-- Option C: Connect with connection string
--   psql "postgresql://uav:PASSWORD@localhost:5432/Crew_Acceptance_Testing"
--
-- Replace PASSWORD with your actual password
--
-- ============================================================================

-- STEP 2: Check res_groups_implied_rel table structure
-- This will show you the actual column names (e.g., gid1/gid2 vs parent_id/child_id)
SELECT column_name, data_type, ordinal_position
FROM information_schema.columns 
WHERE table_name = 'res_groups_implied_rel'
ORDER BY ordinal_position;

-- Expected output format:
--  column_name | data_type | ordinal_position
-- -------------+-----------+------------------
--  gid1        | integer   | 1
--  gid2        | integer   | 2
--
-- OR
--
--  column_name | data_type | ordinal_position
-- -------------+-----------+------------------
--  parent_id   | integer   | 1
--  child_id    | integer   | 2

-- ============================================================================

-- STEP 3: Check res_groups_users_rel table structure (for comparison)
-- This shows the user-group membership table structure
SELECT column_name, data_type, ordinal_position
FROM information_schema.columns 
WHERE table_name = 'res_groups_users_rel'
ORDER BY ordinal_position;

-- Expected output format:
--  column_name | data_type | ordinal_position
-- -------------+-----------+------------------
--  uid         | integer   | 1
--  gid         | integer   | 2
--
-- OR
--
--  column_name | data_type | ordinal_position
-- -------------+-----------+------------------
--  user_id     | integer   | 1
--  group_id    | integer   | 2

-- ============================================================================

-- STEP 4: Sample data from res_groups_implied_rel (first 5 rows)
-- This shows what the actual data looks like
SELECT * FROM res_groups_implied_rel LIMIT 5;

-- This will help verify the column names match what we discovered in STEP 2

-- ============================================================================

-- STEP 5: Check if tables exist
-- Verify both relationship tables exist
SELECT 
    table_name,
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = table_name) as exists
FROM (VALUES 
    ('res_groups_implied_rel'),
    ('res_groups_users_rel')
) AS t(table_name);

-- ============================================================================

-- STEP 6: Check res_users table structure (for name column)
-- Verify if res_users has a name column or if we need to use login
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'res_users' 
  AND column_name IN ('name', 'login', 'partner_id', 'active', 'write_date')
ORDER BY column_name;

-- ============================================================================

-- WHAT TO DO WITH THE RESULTS:
-- ============================================================================
-- 1. Copy the output from STEP 2 (res_groups_implied_rel columns)
-- 2. Copy the output from STEP 3 (res_groups_users_rel columns)  
-- 3. Copy the output from STEP 6 (res_users columns)
-- 4. Share these results - the code has been updated to auto-detect column names,
--    but if there are still issues, we can use this info to fix them
--
-- The code should now work automatically, but this diagnostic helps verify
-- the schema matches expectations.
-- ============================================================================

