#!/usr/bin/env python3
"""
Update martin@danglefeet.com's password to 123
"""
import sqlite3
import sys
import os
import hashlib
from modules.core.config import Config

# Get the password salt from the config
salt = Config.PASSWORD_SALT

# Function to hash the password
def hash_password(password, salt):
    """Erstellt einen sicheren Hash für das Passwort"""
    return hashlib.pbkdf2_hmac(
        'sha256', 
        password.encode(), 
        salt.encode(), 
        100000
    ).hex()

# Database path
db_path = "/opt/nscale-assist/data/db/users.db"

if not os.path.exists(db_path):
    print(f"Database not found: {db_path}")
    sys.exit(1)

# Connect to the database
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    # Update martin@danglefeet.com's password
    email = "martin@danglefeet.com"
    new_password = "123"
    
    # Hash the new password
    password_hash = hash_password(new_password, salt)
    
    cursor.execute("UPDATE users SET password_hash = ? WHERE email = ?", (password_hash, email))
    affected_rows = cursor.rowcount
    
    if affected_rows > 0:
        conn.commit()
        print(f"Password for user '{email}' has been successfully updated to '{new_password}'.")
    else:
        print(f"No user with email '{email}' found.")
    
    # Show the updated user
    cursor.execute("SELECT id, email, role FROM users WHERE email = ?", (email,))
    user = cursor.fetchone()
    
    if user:
        print(f"\nUpdated user:")
        print(f"ID: {user[0]}, Email: {user[1]}, Role: {user[2]}")
        
except sqlite3.Error as e:
    print(f"Database error: {e}")
    conn.rollback()
finally:
    conn.close()