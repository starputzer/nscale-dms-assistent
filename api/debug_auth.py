#!/usr/bin/env python3
"""
Debug authentication mechanism
"""
import sys
import os
import hashlib
import sqlite3
import time
from jose import jwt
from pathlib import Path

# Add parent directory to Python path
parent_dir = str(Path(__file__).resolve().parent.parent)
sys.path.append(parent_dir)

try:
    from modules.core.config import Config
    from modules.auth.user_model import UserManager
except ImportError as e:
    print(f"Import error: {e}")
    sys.exit(1)

def hash_password(password, salt):
    """Create a secure hash for the password"""
    return hashlib.pbkdf2_hmac(
        'sha256', 
        password.encode(), 
        salt.encode(), 
        100000
    ).hex()

# Configuration checks
print("=== Configuration ===")
print(f"SECRET_KEY: {Config.SECRET_KEY[:10]}...")
print(f"PASSWORD_SALT: {Config.PASSWORD_SALT[:10]}...")
print(f"DB_PATH: {Config.DB_PATH}")
print(f"File exists: {os.path.exists(Config.DB_PATH)}")

# Test user details
email = "martin@danglefeet.com"
password = "123"

print("\n=== Database Check ===")
# Check database directly
try:
    conn = sqlite3.connect(Config.DB_PATH)
    cursor = conn.cursor()
    
    # Check if user exists
    cursor.execute("SELECT id, email, password_hash, role FROM users WHERE email = ?", (email,))
    result = cursor.fetchone()
    
    if result:
        user_id, user_email, db_hash, role = result
        print(f"User found: ID={user_id}, Email={user_email}, Role={role}")
        
        # Check password hash
        generated_hash = hash_password(password, Config.PASSWORD_SALT)
        print(f"Generated hash: {generated_hash[:20]}...")
        print(f"Database hash:  {db_hash[:20]}...")
        print(f"Hashes match: {generated_hash == db_hash}")
        
        # Force update password hash
        cursor.execute(
            "UPDATE users SET password_hash = ? WHERE email = ?", 
            (generated_hash, email)
        )
        conn.commit()
        print(f"Password hash updated for {email}")
        
        # Update last login
        cursor.execute(
            "UPDATE users SET last_login = ? WHERE id = ?",
            (int(time.time()), user_id)
        )
        conn.commit()
        print(f"Last login updated for {email}")
    else:
        print(f"No user found with email {email}")
        
        # Try to create the user
        print("Creating test user...")
        password_hash = hash_password(password, Config.PASSWORD_SALT)
        now = int(time.time())
        
        cursor.execute(
            "INSERT INTO users (email, password_hash, role, created_at) VALUES (?, ?, ?, ?)",
            (email, password_hash, 'admin', now)
        )
        conn.commit()
        print(f"Test user {email} created successfully")
    
    # List all users
    print("\nAll users in database:")
    cursor.execute("SELECT id, email, role FROM users")
    for user in cursor.fetchall():
        print(f"ID: {user[0]}, Email: {user[1]}, Role: {user[2]}")
    
    conn.close()
except Exception as e:
    print(f"Database error: {e}")

print("\n=== UserManager Authentication ===")
# Initialize the user manager
user_manager = UserManager()

# Try logging in
token = user_manager.authenticate(email, password)

if token:
    print(f"Authentication successful for {email}!")
    print(f"Token: {token[:30]}...")
    
    # Decode token
    try:
        decoded = jwt.decode(token, Config.SECRET_KEY, algorithms=['HS256'])
        print(f"Decoded token: {decoded}")
    except Exception as e:
        print(f"Error decoding token: {e}")
    
    # Get user details
    user = user_manager.get_user_by_email(email)
    if user:
        print(f"\nUser details:")
        print(f"ID: {user.get('id')}")
        print(f"Email: {user.get('email')}")
        print(f"Role: {user.get('role')}")
        print(f"Created at: {user.get('created_at')}")
        print(f"Last login: {user.get('last_login')}")
else:
    print(f"Authentication failed for {email} with password {password}")

if __name__ == "__main__":
    print("\nDebug script completed")