#!/usr/bin/env python3
"""
Script to check admin authentication setup
Tests database user, admin role, and require_admin dependency
"""

import sqlite3
import sys
import os
from pathlib import Path

# Add the app directory to the Python path
sys.path.insert(0, str(Path(__file__).parent))

# Import the authentication utilities
try:
    from modules.core.auth_manager import verify_password
    print("✓ Successfully imported auth_manager module")
except ImportError as e:
    print(f"✗ Failed to import auth_manager: {e}")
    verify_password = None

def check_database():
    """Check the users database and display contents"""
    db_path = Path(__file__).parent.parent / "data" / "db" / "users.db"
    
    print(f"\n=== Checking Database ===")
    print(f"Database path: {db_path}")
    
    if not db_path.exists():
        print(f"✗ Database file does not exist!")
        return False
    
    print(f"✓ Database file exists")
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if users table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
        if not cursor.fetchone():
            print("✗ Users table does not exist!")
            return False
        
        print("✓ Users table exists")
        
        # Get table schema
        cursor.execute("PRAGMA table_info(users)")
        columns = cursor.fetchall()
        print("\nTable schema:")
        for col in columns:
            print(f"  - {col[1]} ({col[2]})")
        
        # Get all users
        cursor.execute("SELECT * FROM users")
        users = cursor.fetchall()
        
        print(f"\nTotal users in database: {len(users)}")
        
        # Display all users
        if users:
            print("\n=== All Users ===")
            column_names = [col[1] for col in columns]
            for user in users:
                print("\nUser:")
                for i, col_name in enumerate(column_names):
                    if col_name != 'password':  # Don't display password hash
                        print(f"  {col_name}: {user[i]}")
                    else:
                        print(f"  {col_name}: [HIDDEN - hash present: {'Yes' if user[i] else 'No'}]")
        
        # Check for specific user
        target_email = "martin@danglefeet.com"
        cursor.execute("SELECT * FROM users WHERE email = ?", (target_email,))
        user = cursor.fetchone()
        
        print(f"\n=== Checking for {target_email} ===")
        if user:
            print(f"✓ User found!")
            # Get column names for better display
            cursor.execute("PRAGMA table_info(users)")
            columns = [(col[1], col[0]) for col in cursor.fetchall()]
            
            for col_name, idx in columns:
                if col_name == 'password':
                    print(f"  {col_name}: [HIDDEN - hash present: {'Yes' if user[idx] else 'No'}]")
                else:
                    print(f"  {col_name}: {user[idx]}")
            
            # Check role
            role_idx = next((idx for name, idx in columns if name == 'role'), None)
            if role_idx is not None:
                role = user[role_idx]
                if role == 'admin':
                    print(f"✓ User has admin role")
                else:
                    print(f"✗ User role is '{role}', not 'admin'")
            else:
                print("✗ No role column found in users table")
        else:
            print(f"✗ User not found in database")
        
        conn.close()
        return True
        
    except sqlite3.Error as e:
        print(f"✗ Database error: {e}")
        return False

def test_require_admin():
    """Test the require_admin dependency"""
    print("\n=== Testing require_admin Dependency ===")
    
    try:
        # Check if functions exist in server.py
        from api.server import get_current_user, get_admin_user
        print("✓ Successfully imported authentication functions from server.py")
        print("✓ get_current_user function exists")
        print("✓ get_admin_user function exists (used for admin authentication)")
        
        # Check if require_admin exists in auth_manager
        from modules.core.auth_manager import require_admin
        print("✓ require_admin dependency found in auth_manager module")
        
        # Check if we can inspect the functions
        import inspect
        current_user_sig = inspect.signature(get_current_user)
        admin_user_sig = inspect.signature(get_admin_user)
        require_admin_sig = inspect.signature(require_admin)
        
        print(f"✓ get_current_user signature: {current_user_sig}")
        print(f"✓ get_admin_user signature: {admin_user_sig}")
        print(f"✓ require_admin signature: {require_admin_sig}")
        
        # Test authentication flow
        print("\n  Authentication flow:")
        print("  1. User logs in with email/password")
        print("  2. UserManager.authenticate() generates JWT token")
        print("  3. Token includes user role (admin/user)")
        print("  4. get_admin_user() checks if role == 'admin'")
        print("  5. Admin endpoints use get_admin_user() dependency")
        
        return True
        
    except ImportError as e:
        print(f"✗ Failed to import authentication functions: {e}")
        return False
    except Exception as e:
        print(f"✗ Error testing require_admin: {e}")
        return False

def check_password_verification():
    """Check if password verification works"""
    print("\n=== Testing Password Verification ===")
    
    try:
        from modules.auth.user_model import UserManager
        from modules.core.config import Config
        import hashlib
        
        print("✓ Successfully imported necessary modules")
        
        # Create a UserManager instance
        user_manager = UserManager()
        
        # Test password hashing
        test_password = "123"
        
        # Hash the password like UserManager does
        password_hash = hashlib.pbkdf2_hmac(
            'sha256', 
            test_password.encode(), 
            Config.PASSWORD_SALT.encode(), 
            100000
        ).hex()
        
        print(f"✓ Password hashing works")
        print(f"  Test password: {test_password}")
        print(f"  Generated hash: {password_hash[:32]}...")
        
        # Check against the actual hash in the database for martin@danglefeet.com
        expected_hash = "5bb41f18f304c33a9f92e839c64421ad2b0853fd16d87cd0947ea2410d6ad9fc"
        
        if password_hash == expected_hash:
            print(f"✓ Password hash matches database hash for martin@danglefeet.com")
            return True
        else:
            print(f"✗ Password hash mismatch")
            print(f"  Expected: {expected_hash}")
            print(f"  Got:      {password_hash}")
            return False
            
    except Exception as e:
        print(f"✗ Password verification check failed: {e}")
        return False

def main():
    """Run all checks"""
    print("Admin Authentication Checker")
    print("=" * 50)
    
    # Check database
    db_ok = check_database()
    
    # Check password verification
    pw_ok = check_password_verification()
    
    # Test require_admin dependency
    admin_ok = test_require_admin()
    
    # Summary
    print("\n" + "=" * 50)
    print("Summary:")
    print(f"  Database check: {'✓ PASS' if db_ok else '✗ FAIL'}")
    print(f"  Password verification: {'✓ PASS' if pw_ok else '✗ FAIL'}")
    print(f"  Admin dependency: {'✓ PASS' if admin_ok else '✗ FAIL'}")
    
    if db_ok and pw_ok and admin_ok:
        print("\n✓ All checks passed!")
        return 0
    else:
        print("\n✗ Some checks failed. Please review the output above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())