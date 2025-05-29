#!/usr/bin/env python3
"""
Debug authentication endpoint issues
"""
import sys
import os
import json
import requests
import hashlib
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from modules.auth.user_model import UserManager
from modules.core.config import Config

def hash_password(password, salt):
    """Create a secure hash for the password"""
    return hashlib.pbkdf2_hmac(
        'sha256', 
        password.encode(), 
        salt.encode(), 
        100000
    ).hex()

# Config values
print(f"PASSWORD_SALT: {Config.PASSWORD_SALT[:10]}...")

# Test user details
email = "martin@danglefeet.com"
password = "123"

# Hash the password
password_hash = hash_password(password, Config.PASSWORD_SALT)
print(f"Generated password hash: {password_hash}")

# Check database directly
import sqlite3
conn = sqlite3.connect(Config.DB_PATH)
cursor = conn.cursor()
cursor.execute("SELECT password_hash FROM users WHERE email = ?", (email,))
result = cursor.fetchone()
if result:
    db_hash = result[0]
    print(f"Database password hash: {db_hash}")
    print(f"Hashes match: {password_hash == db_hash}")
else:
    print(f"No user found with email {email}")
conn.close()

# Direct authentication via UserManager
user_manager = UserManager()
token = user_manager.authenticate(email, password)
print(f"\nDirect authentication via UserManager: {'✅ Success' if token else '❌ Failed'}")

# HTTP request to the API endpoint
try:
    response = requests.post(
        "http://localhost:8080/api/auth/login",
        json={"email": email, "password": password},
        headers={"Content-Type": "application/json"}
    )
    
    print(f"\nAPI Response Status: {response.status_code}")
    print(f"API Response Headers: {dict(response.headers)}")
    print(f"API Response Body: {response.text}")
    
    if response.status_code == 200:
        print("API authentication succeeded")
    else:
        print("API authentication failed")
except Exception as e:
    print(f"Error making API request: {e}")