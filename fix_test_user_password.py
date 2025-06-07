#!/usr/bin/env python3
"""Fix test user password using the correct hash algorithm and salt"""

import sqlite3
import hashlib
import sys
import os

# Add the app directory to the path
sys.path.insert(0, '/opt/nscale-assist/app')

from modules.core.config import Config

def hash_password(password):
    """Create password hash using the same method as UserManager"""
    return hashlib.pbkdf2_hmac(
        'sha256', 
        password.encode(), 
        Config.PASSWORD_SALT.encode(),  # Use the actual salt from config
        100000
    ).hex()

def update_user_password(email, password):
    """Update user password in database"""
    password_hash = hash_password(password)
    
    conn = sqlite3.connect(Config.DB_PATH)
    cursor = conn.cursor()
    
    # Check if user exists
    cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
    user = cursor.fetchone()
    
    if user:
        # Update password
        cursor.execute(
            "UPDATE users SET password_hash = ? WHERE email = ?",
            (password_hash, email)
        )
        conn.commit()
        print(f"Updated password for {email}")
        print(f"Password hash: {password_hash}")
    else:
        print(f"User {email} not found")
    
    conn.close()

if __name__ == "__main__":
    # Update test user password
    update_user_password("user@example.com", "password123")
    
    # Also create the user if it doesn't exist
    conn = sqlite3.connect(Config.DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("SELECT id FROM users WHERE email = ?", ("user@example.com",))
    if not cursor.fetchone():
        password_hash = hash_password("password123")
        cursor.execute(
            "INSERT INTO users (email, password_hash, role, created_at) VALUES (?, ?, ?, ?)",
            ("user@example.com", password_hash, "user", 1700000000)
        )
        conn.commit()
        print("Created test user: user@example.com")
    
    conn.close()