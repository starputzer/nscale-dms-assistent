#!/usr/bin/env python3
"""
Create dummy accounts with password 123 for easy login on port 3003
"""
import sys
import os
import hashlib
import sqlite3
import time
from pathlib import Path

# Add parent directory to Python path
parent_dir = str(Path(__file__).resolve().parent.parent)
sys.path.append(parent_dir)

# Configuration
DB_PATH = "/opt/nscale-assist/data/db/users.db"
SALT = "generate-a-secure-salt-in-production"  # Default from config
TEST_ACCOUNTS = [
    {"email": "martin@danglefeet.com", "password": "123", "role": "admin"},
    {"email": "test@test.com", "password": "123", "role": "admin"},
    {"email": "user@example.com", "password": "123", "role": "user"}
]

def hash_password(password, salt):
    """Create a secure hash for the password"""
    return hashlib.pbkdf2_hmac(
        'sha256', 
        password.encode(), 
        salt.encode(), 
        100000
    ).hex()

def ensure_user_exists(conn, email, password, role):
    """Ensure a user exists with the given credentials"""
    cursor = conn.cursor()
    
    # Check if user exists
    cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
    result = cursor.fetchone()
    
    password_hash = hash_password(password, SALT)
    now = int(time.time())
    
    if result:
        user_id = result[0]
        print(f"Updating existing user: {email}")
        
        # Update user data
        cursor.execute(
            "UPDATE users SET password_hash = ?, role = ?, last_login = ? WHERE id = ?",
            (password_hash, role, now, user_id)
        )
    else:
        print(f"Creating new user: {email}")
        
        # Create new user
        cursor.execute(
            "INSERT INTO users (email, password_hash, role, created_at, last_login) VALUES (?, ?, ?, ?, ?)",
            (email, password_hash, role, now, now)
        )
    
    conn.commit()

def main():
    # Check if database exists
    if not os.path.exists(DB_PATH):
        print(f"Database not found: {DB_PATH}")
        return

    # Connect to database
    try:
        conn = sqlite3.connect(DB_PATH)
        
        # Ensure all test accounts exist
        for account in TEST_ACCOUNTS:
            ensure_user_exists(conn, account["email"], account["password"], account["role"])
        
        # List all users
        cursor = conn.cursor()
        cursor.execute("SELECT id, email, role FROM users")
        users = cursor.fetchall()
        
        print("\nAll users in database:")
        for user in users:
            print(f"ID: {user[0]}, Email: {user[1]}, Role: {user[2]}")
        
        conn.close()
        print("\nAll test accounts have been set up successfully.")
        print("You can now log in with any of these accounts using password '123':")
        for account in TEST_ACCOUNTS:
            print(f"  - {account['email']} ({account['role']})")
            
    except sqlite3.Error as e:
        print(f"Database error: {e}")

if __name__ == "__main__":
    main()