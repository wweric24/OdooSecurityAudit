#!/usr/bin/env python3
"""
Connection test script for Azure AD and Odoo PostgreSQL integrations.
Run this script to verify your credentials are configured correctly.

Usage:
    python scripts/test_connections.py
    python scripts/test_connections.py --azure-only
    python scripts/test_connections.py --odoo-only
"""

import sys
import os
from pathlib import Path

# Add project root to path
project_root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(project_root))

# Load .env file
from dotenv import load_dotenv
load_dotenv(project_root / ".env")

from app.backend.settings import settings


def test_azure_connection():
    """Test Azure AD connection."""
    print("\n" + "=" * 60)
    print("AZURE AD CONNECTION TEST")
    print("=" * 60)

    if not settings.azure_configured:
        print("FAILED: Azure credentials not configured")
        print("  - Missing: AZURE_TENANT_ID, AZURE_CLIENT_ID, or AZURE_CLIENT_SECRET")
        print("  - Update your .env file with Azure App Registration details")
        return False

    print(f"Tenant ID: {settings.azure_tenant_id[:8]}...")
    print(f"Client ID: {settings.azure_client_id[:8]}...")
    print("Client Secret: ********")

    try:
        from msal import ConfidentialClientApplication

        print("\nAttempting to acquire access token...")

        msal_app = ConfidentialClientApplication(
            settings.azure_client_id,
            authority=f"https://login.microsoftonline.com/{settings.azure_tenant_id}",
            client_credential=settings.azure_client_secret,
        )

        result = msal_app.acquire_token_for_client(scopes=[settings.azure_graph_scope])

        if "access_token" in result:
            print("SUCCESS: Token acquired successfully")
            print(f"  - Token type: {result.get('token_type')}")
            print(f"  - Expires in: {result.get('expires_in')} seconds")

            # Optionally test a simple Graph API call
            try:
                import requests
                headers = {"Authorization": f"Bearer {result['access_token']}"}
                resp = requests.get(
                    "https://graph.microsoft.com/v1.0/users?$top=1&$select=id,displayName",
                    headers=headers,
                    timeout=10
                )
                if resp.status_code == 200:
                    data = resp.json()
                    user_count = len(data.get("value", []))
                    print(f"  - Graph API test: Can fetch users (got {user_count})")
                else:
                    print(f"  - Graph API test: HTTP {resp.status_code}")
            except Exception as e:
                print(f"  - Graph API test: {str(e)[:50]}")

            return True
        else:
            print("FAILED: Could not acquire token")
            print(f"  - Error: {result.get('error')}")
            print(f"  - Description: {result.get('error_description')}")
            return False

    except ImportError:
        print("FAILED: msal library not installed")
        print("  - Run: pip install msal")
        return False
    except Exception as e:
        print(f"FAILED: {str(e)}")
        return False


def test_odoo_connection():
    """Test Odoo PostgreSQL connection."""
    print("\n" + "=" * 60)
    print("ODOO POSTGRESQL CONNECTION TEST")
    print("=" * 60)

    print(f"Environment: {settings.odoo_environment} ({settings.odoo_environment_display})")

    if not settings.odoo_configured:
        print(f"FAILED: Odoo {settings.odoo_environment} DSN not configured")
        print(f"  - Set ODOO_{settings.odoo_environment}_DSN in your .env file")
        return False

    # Mask password in DSN for display
    dsn = settings.odoo_postgres_dsn
    try:
        # Simple password masking
        if "@" in dsn and "://" in dsn:
            before_at = dsn.split("@")[0]
            after_at = dsn.split("@")[1]
            if ":" in before_at:
                user_part = before_at.rsplit(":", 1)[0]
                masked_dsn = f"{user_part}:********@{after_at}"
            else:
                masked_dsn = dsn
        else:
            masked_dsn = "********"
        print(f"DSN: {masked_dsn}")
    except Exception:
        print("DSN: configured (parsing error)")

    try:
        import psycopg

        print("\nAttempting to connect...")

        with psycopg.connect(dsn.replace("postgresql+psycopg://", "postgresql://")) as conn:
            with conn.cursor() as cur:
                # Test basic connectivity
                cur.execute("SELECT version()")
                version = cur.fetchone()[0]
                print(f"SUCCESS: Connected to database")
                print(f"  - PostgreSQL: {version.split(',')[0] if ',' in version else version[:60]}")

                # Check Odoo tables exist
                cur.execute("""
                    SELECT table_name
                    FROM information_schema.tables
                    WHERE table_schema = 'public'
                    AND table_name IN ('res_groups', 'res_users', 'res_groups_users_rel', 'res_groups_implied_rel')
                """)
                tables = [row[0] for row in cur.fetchall()]
                print(f"  - Odoo tables found: {', '.join(tables)}")

                if "res_groups" not in tables:
                    print("  WARNING: res_groups table not found - may not be an Odoo database")

                # Count records
                if "res_groups" in tables:
                    cur.execute("SELECT COUNT(*) FROM res_groups")
                    group_count = cur.fetchone()[0]
                    print(f"  - Security groups: {group_count}")

                if "res_users" in tables:
                    cur.execute("SELECT COUNT(*) FROM res_users WHERE active = TRUE")
                    user_count = cur.fetchone()[0]
                    print(f"  - Active users: {user_count}")

                if "res_groups_users_rel" in tables:
                    cur.execute("SELECT COUNT(*) FROM res_groups_users_rel")
                    rel_count = cur.fetchone()[0]
                    print(f"  - User-group assignments: {rel_count}")

                return True

    except ImportError:
        print("FAILED: psycopg library not installed")
        print("  - Run: pip install psycopg[binary]")
        return False
    except Exception as e:
        print(f"FAILED: {str(e)}")
        return False


def main():
    """Run connection tests."""
    print("Odoo Security Management - Connection Test Utility")
    print(f"Project Root: {project_root}")

    # Check which tests to run
    azure_only = "--azure-only" in sys.argv
    odoo_only = "--odoo-only" in sys.argv

    results = {}

    if not odoo_only:
        results["azure"] = test_azure_connection()

    if not azure_only:
        results["odoo"] = test_odoo_connection()

    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)

    all_passed = True
    for service, passed in results.items():
        status = "PASS" if passed else "FAIL"
        print(f"  {service.upper():10} {status}")
        if not passed:
            all_passed = False

    if all_passed:
        print("\nAll connection tests passed! You're ready to sync data.")
    else:
        print("\nSome tests failed. Please check your .env configuration.")

    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
