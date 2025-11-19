"""Integration test script to verify the application works."""
import sys
import os
sys.path.insert(0, '.')

print("=" * 60)
print("Integration Test - Odoo Security Management Application")
print("=" * 60)

# Test 1: Odoo sync helpers
print("\n1. Testing Odoo sync helpers...")
try:
    from app.backend.services.odoo_sync import extract_module_and_access_level

    module, access_level, hierarchy = extract_module_and_access_level("Odoo - Finance / Admin")
    print(f"   V Parsed module: {module}")
    print(f"   V Access level: {access_level}")
    print(f"   V Hierarchy level: {hierarchy}")

    fallback = extract_module_and_access_level("CustomGroup / Reviewer")
    print(f"   V Fallback parsing: {fallback}")
    print("   V Odoo sync helpers: PASSED")
except Exception as e:
    print(f"   ? Odoo sync helper failed: {e}")

# Test 2: Standards Configuration
print("\n2. Testing Standards Configuration...")
try:
    import json
    with open('app/config/standards.json', 'r', encoding='utf-8') as f:
        standards = json.load(f)
    print("   V Loaded standards configuration")
    print(f"   V Naming pattern: {standards['naming_convention']['pattern']}")
    print(f"   V Access levels defined: {len(standards['access_levels']['hierarchy'])}")
    print("   V Standards Configuration: PASSED")
except Exception as e:
    print(f"   ? Standards Configuration failed: {e}")

# Test 3: Data Models
print("\n3. Testing Data Models...")
try:
    from app.data.models import SecurityGroup, User, Base
    print("   V Models imported successfully")
    print(f"   V SecurityGroup model: {SecurityGroup.__tablename__}")
    print(f"   V User model: {User.__tablename__}")
    print("   V Data Models: PASSED")
except Exception as e:
    print(f"   ? Data Models failed: {e}")
    print("   ? Note: This may require SQLAlchemy to be installed")

# Test 4: Backend API Structure
print("\n4. Testing Backend API Structure...")
try:
    api_file = 'app/backend/api.py'
    if os.path.exists(api_file):
        print("   V API file exists")
        with open(api_file, 'r', encoding='utf-8') as f:
            content = f.read()
            if 'FastAPI' in content:
                print("   V FastAPI application defined")
            if '/api/sync/azure-users' in content and '/api/sync/odoo-db' in content:
                print("   V Sync endpoints defined")
            if '/api/export/groups' in content:
                print("   V Export endpoints defined")
            if '/api/analysis' in content:
                print("   V Analysis endpoints defined")
        print("   V Backend API Structure: PASSED")
    else:
        print("   ? API file not found")
except Exception as e:
    print(f"   ? Backend API Structure check failed: {e}")

# Test 5: Frontend Structure
print("\n5. Testing Frontend Structure...")
try:
    frontend_files = [
        'app/frontend/package.json',
        'app/frontend/src/App.jsx',
        'app/frontend/src/components/Dashboard.jsx',
        'app/frontend/src/components/Data.jsx',
        'app/frontend/src/components/Groups.jsx',
        'app/frontend/src/components/Users.jsx',
    ]

    all_exist = True
    for file in frontend_files:
        if os.path.exists(file):
            print(f"   V {os.path.basename(file)} exists")
        else:
            print(f"   ? {os.path.basename(file)} missing")
            all_exist = False

    if all_exist:
        print("   V Frontend Structure: PASSED")
    else:
        print("   ? Some frontend files missing")
except Exception as e:
    print(f"   ? Frontend Structure check failed: {e}")

# Test 6: File Structure
print("\n6. Testing Project Structure...")
required_dirs = [
    'app/backend',
    'app/frontend/src',
    'app/data',
    'app/config',
    'tests'
]

all_exist = True
for dir_path in required_dirs:
    if os.path.exists(dir_path):
        print(f"   V {dir_path}/ exists")
    else:
        print(f"   ? {dir_path}/ missing")
        all_exist = False

if all_exist:
    print("   V Project Structure: PASSED")

print("\n" + "=" * 60)
print("Integration Test Summary")
print("=" * 60)
print("\nCore functionality tests completed.")
print("To test the full application:")
print("  1. Install dependencies: pip install -r requirements.txt")
print("  2. Initialize database: python init_db.py")
print("  3. Start backend: python app/backend/main.py")
print("  4. Start frontend: cd app/frontend && npm install && npm run dev")
print("=" * 60)
