#!/usr/bin/env python3
"""
Debug script to check and fix admin authentication issues
"""

import sqlite3
import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Database path
DB_PATH = Path(__file__).parent.parent / "data" / "db" / "users.db"

print("🔍 Admin Authentication Debug Script")
print("====================================\n")

if not DB_PATH.exists():
    print(f"❌ Database not found at: {DB_PATH}")
    sys.exit(1)

# Connect to database
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# First check the schema
cursor.execute("PRAGMA table_info(users)")
columns = cursor.fetchall()
print("Database schema:")
column_names = [col[1] for col in columns]
print("Columns:", ", ".join(column_names))
print()

# Check all users and their roles
cursor.execute("SELECT id, email, role, created_at FROM users ORDER BY id")
users = cursor.fetchall()

print("📋 Current Users:")
print("================")

if not users:
    print("No users found in database!\n")
else:
    for user in users:
        user_id, email, role, created_at = user
        admin_icon = "👑" if role == "admin" else ""
        print(f"ID: {user_id}")
        print(f"Email: {email}")
        print(f"Role: {role} {admin_icon}")
        print(f"Created: {created_at}")
        print("---")

# Check if martin@danglefeet.com has admin role
martin_user = next((u for u in users if u[1] == "martin@danglefeet.com"), None)

if martin_user:
    print("\n🔍 Martin User Status:")
    if martin_user[2] == "admin":
        print("✅ martin@danglefeet.com has admin role")
    else:
        print(f"⚠️  martin@danglefeet.com has role: {martin_user[2]}")
        print("   Updating to admin role...")
        
        # Update role to admin
        cursor.execute("UPDATE users SET role = 'admin' WHERE email = ?", ("martin@danglefeet.com",))
        conn.commit()
        print("✅ Updated martin@danglefeet.com to admin role")
else:
    print("\n⚠️  martin@danglefeet.com not found in database")
    print("   Creating user with admin role...")
    
    # Try to import user manager to create user properly
    try:
        from modules.auth.user_model import UserManager
        user_manager = UserManager()
        
        # Register user with password "123"
        success = user_manager.register_user("martin@danglefeet.com", "123", role="admin")
        if success:
            print("✅ Created martin@danglefeet.com with admin role")
        else:
            print("❌ Failed to create user")
    except Exception as e:
        print(f"❌ Error creating user: {e}")

print("\n💡 Debug Information:")
print("====================")
print("1. Frontend should send Authorization header with Bearer token")
print("2. Token is obtained from /api/auth/login endpoint")
print("3. User must have role='admin' in database")
print("4. Check browser console for authentication errors")

print("\n🔧 Next Steps:")
print("=============")
print("1. Clear browser cache and localStorage")
print("2. Login again with martin@danglefeet.com / password: 123")
print("3. Check Network tab to verify Authorization header is sent")
print("4. Admin tabs should now load without 401 errors")

conn.close()