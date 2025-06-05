#!/usr/bin/env python3
"""
Test if there are any sessions stored anywhere and how to recover them
"""

import requests
import json
import sqlite3
import os
from datetime import datetime

# Test credentials
EMAIL = "martin@danglefeet.com"
PASSWORD = "123"
BASE_URL = "http://localhost:8000"

def login():
    """Login and get token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": EMAIL,
        "password": PASSWORD
    })
    
    if response.status_code == 200:
        data = response.json()
        token = data.get("access_token") or data.get("token")
        print(f"✓ Login successful, token: {token[:20]}...")
        return token
    else:
        print(f"✗ Login failed: {response.status_code}")
        print(response.text)
        return None

def test_sessions_api(token):
    """Test the sessions API"""
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test /api/sessions
    print("\n=== Testing /api/sessions ===")
    response = requests.get(f"{BASE_URL}/api/sessions", headers=headers)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        sessions = response.json()
        print(f"Found {len(sessions)} sessions")
        for session in sessions[:5]:  # Show first 5
            print(f"  - {session.get('id')}: {session.get('title')}")
    else:
        print(f"Error: {response.text}")
    
    # Test /api/chat/sessions
    print("\n=== Testing /api/chat/sessions ===")
    response = requests.get(f"{BASE_URL}/api/chat/sessions?since=0", headers=headers)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        sessions = response.json()
        print(f"Found {len(sessions)} sessions")
        for session in sessions[:5]:  # Show first 5
            print(f"  - {session.get('id')}: {session.get('title')}")
    else:
        print(f"Error: {response.text}")

def check_all_databases():
    """Check all databases for any session data"""
    print("\n=== Checking all databases ===")
    
    db_files = [
        "data/db/app.db",
        "data/db/nscale.db",
        "data/db/users.db",
        "data/db/feedback.db"
    ]
    
    for db_file in db_files:
        if os.path.exists(db_file):
            print(f"\n{db_file}:")
            try:
                conn = sqlite3.connect(db_file)
                cursor = conn.cursor()
                
                # Get all tables
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
                tables = cursor.fetchall()
                
                for table in tables:
                    table_name = table[0]
                    cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                    count = cursor.fetchone()[0]
                    if count > 0:
                        print(f"  {table_name}: {count} rows")
                        
                        # If it's a session-related table, show sample data
                        if 'session' in table_name.lower() or 'message' in table_name.lower():
                            cursor.execute(f"SELECT * FROM {table_name} LIMIT 3")
                            rows = cursor.fetchall()
                            
                            # Get column names
                            cursor.execute(f"PRAGMA table_info({table_name})")
                            columns = [col[1] for col in cursor.fetchall()]
                            
                            print(f"    Columns: {columns}")
                            for row in rows:
                                print(f"    {row}")
                
                conn.close()
            except Exception as e:
                print(f"  Error: {e}")

def create_test_session(token):
    """Create a test session to verify the system works"""
    print("\n=== Creating test session ===")
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.post(f"{BASE_URL}/api/chat/sessions", headers=headers)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        session = response.json()
        print(f"Created session: {session}")
        return session.get('id')
    else:
        print(f"Error: {response.text}")
        return None

if __name__ == "__main__":
    print("Session Recovery Test")
    print("=" * 50)
    
    # First, check all databases
    check_all_databases()
    
    # Then test API
    token = login()
    if token:
        test_sessions_api(token)
        
        # Create a test session
        session_id = create_test_session(token)
        
        # Check databases again
        print("\n=== After creating test session ===")
        check_all_databases()