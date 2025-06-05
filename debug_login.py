#!/usr/bin/env python3
"""
Debug login to see what's happening
"""

import sqlite3
import hashlib
import time
from jose import jwt
import requests

# Config values
SECRET_KEY = 'generate-a-secure-random-key-in-production'
PASSWORD_SALT = 'generate-a-secure-salt-in-production'
JWT_EXPIRATION = 86400

def hash_password(password):
    """Create password hash"""
    return hashlib.pbkdf2_hmac(
        'sha256', 
        password.encode(), 
        PASSWORD_SALT.encode(), 
        100000
    ).hex()

def manual_authenticate(email, password):
    """Manually authenticate like the server does"""
    password_hash = hash_password(password)
    
    print(f"Email: {email}")
    print(f"Password hash: {password_hash[:20]}...")
    
    conn = sqlite3.connect('data/db/users.db')
    cursor = conn.cursor()
    
    # Check what users exist
    cursor.execute("SELECT id, email, password_hash, role FROM users")
    all_users = cursor.fetchall()
    print("\nAll users in database:")
    for user in all_users:
        print(f"  ID={user[0]}, Email={user[1]}, Hash={user[2][:20]}..., Role={user[3]}")
    
    # Try to authenticate
    cursor.execute(
        "SELECT id, email, role FROM users WHERE email = ? AND password_hash = ?",
        (email, password_hash)
    )
    
    user = cursor.fetchone()
    
    if user:
        print(f"\n✓ User found: ID={user[0]}, Email={user[1]}, Role={user[2]}")
        
        # Create JWT token
        payload = {
            'user_id': user[0],
            'email': user[1],
            'role': user[2],
            'exp': int(time.time()) + JWT_EXPIRATION,
        }
        token = jwt.encode(payload, SECRET_KEY, algorithm='HS256')
        print(f"Token payload: {payload}")
        return token
    else:
        print("\n✗ Authentication failed - no matching user")
        return None

def test_api_login():
    """Test actual API login"""
    print("\n=== Testing API Login ===")
    response = requests.post('http://localhost:8000/api/auth/login', json={
        'email': 'martin@danglefeet.com',
        'password': '123'
    })
    
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        token = data.get('access_token')
        
        # Decode token
        decoded = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        print(f"Decoded token: {decoded}")
        
        return token
    else:
        print(f"Error: {response.text}")
        return None

def main():
    print("=== Manual Authentication Test ===")
    manual_token = manual_authenticate('martin@danglefeet.com', '123')
    
    api_token = test_api_login()
    
    if api_token:
        print("\n=== Testing Sessions API ===")
        headers = {"Authorization": f"Bearer {api_token}"}
        
        # Test both endpoints
        for endpoint in ['/api/sessions', '/api/chat/sessions']:
            response = requests.get(f'http://localhost:8000{endpoint}', 
                                  params={'since': 0},
                                  headers=headers)
            print(f"\n{endpoint}: {response.status_code}")
            if response.status_code == 200:
                sessions = response.json()
                print(f"Sessions: {len(sessions)}")
            else:
                print(f"Error: {response.text}")

if __name__ == "__main__":
    main()