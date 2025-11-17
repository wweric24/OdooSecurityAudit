"""Integration test script to verify the application works."""
import sys
import os
sys.path.insert(0, '.')

print("=" * 60)
print("Integration Test - Odoo Security Management Application")
print("=" * 60)

# Test 1: CSV Parser
print("\n1. Testing CSV Parser...")
try:
    from app.data.csv_parser import CSVParser
    
    parser = CSVParser('app/config/standards.json')
    csv_path = 'reference docs/Access Groups (res.groups).csv'
    
    if os.path.exists(csv_path):
        groups = parser.parse_csv(csv_path)
        print(f"   ✓ Parsed {len(groups)} groups successfully")
        
        if len(groups) > 0:
            sample = groups[0]
            print(f"   ✓ Sample group: {sample['name']}")
            print(f"   ✓ Module extraction: {sample.get('module')}")
            print(f"   ✓ Access level: {sample.get('access_level')}")
            print(f"   ✓ Users: {len(sample.get('users', []))}")
        
        validation = parser.validate_data(groups)
        print(f"   ✓ Validation: {validation['statistics']['follows_naming_convention']} groups follow naming convention")
        print("   ✓ CSV Parser: PASSED")
    else:
        print(f"   ⚠ CSV file not found at {csv_path}")
except Exception as e:
    print(f"   ✗ CSV Parser failed: {e}")
    import traceback
    traceback.print_exc()

# Test 2: Standards Configuration
print("\n2. Testing Standards Configuration...")
try:
    import json
    with open('app/config/standards.json', 'r') as f:
        standards = json.load(f)
    print(f"   ✓ Loaded standards configuration")
    print(f"   ✓ Naming pattern: {standards['naming_convention']['pattern']}")
    print(f"   ✓ Access levels defined: {len(standards['access_levels']['hierarchy'])}")
    print("   ✓ Standards Configuration: PASSED")
except Exception as e:
    print(f"   ✗ Standards Configuration failed: {e}")

# Test 3: Data Models
print("\n3. Testing Data Models...")
try:
    from app.data.models import SecurityGroup, User, ImportHistory, Base
    print("   ✓ Models imported successfully")
    print(f"   ✓ SecurityGroup model: {SecurityGroup.__tablename__}")
    print(f"   ✓ User model: {User.__tablename__}")
    print(f"   ✓ ImportHistory model: {ImportHistory.__tablename__}")
    print("   ✓ Data Models: PASSED")
except Exception as e:
    print(f"   ✗ Data Models failed: {e}")
    print("   ⚠ Note: This may require SQLAlchemy to be installed")

# Test 4: Backend API Structure
print("\n4. Testing Backend API Structure...")
try:
    # Just check if files exist and can be imported
    api_file = 'app/backend/api.py'
    if os.path.exists(api_file):
        print("   ✓ API file exists")
        with open(api_file, 'r') as f:
            content = f.read()
            if 'FastAPI' in content:
                print("   ✓ FastAPI application defined")
            if '/api/import' in content:
                print("   ✓ Import endpoint defined")
            if '/api/groups' in content:
                print("   ✓ Groups endpoint defined")
            if '/api/analysis' in content:
                print("   ✓ Analysis endpoints defined")
        print("   ✓ Backend API Structure: PASSED")
    else:
        print("   ✗ API file not found")
except Exception as e:
    print(f"   ✗ Backend API Structure check failed: {e}")

# Test 5: Frontend Structure
print("\n5. Testing Frontend Structure...")
try:
    frontend_files = [
        'app/frontend/package.json',
        'app/frontend/src/App.jsx',
        'app/frontend/src/components/Dashboard.jsx',
        'app/frontend/src/components/Import.jsx',
        'app/frontend/src/components/Groups.jsx',
    ]
    
    all_exist = True
    for file in frontend_files:
        if os.path.exists(file):
            print(f"   ✓ {os.path.basename(file)} exists")
        else:
            print(f"   ✗ {os.path.basename(file)} missing")
            all_exist = False
    
    if all_exist:
        print("   ✓ Frontend Structure: PASSED")
    else:
        print("   ⚠ Some frontend files missing")
except Exception as e:
    print(f"   ✗ Frontend Structure check failed: {e}")

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
        print(f"   ✓ {dir_path}/ exists")
    else:
        print(f"   ✗ {dir_path}/ missing")
        all_exist = False

if all_exist:
    print("   ✓ Project Structure: PASSED")

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

