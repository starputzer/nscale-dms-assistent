#!/usr/bin/env python3
"""
Test why sessions are not visible in frontend
"""

import requests
import sqlite3
import json
from jose import jwt

def test_complete_flow():
    """Test the complete flow from login to session retrieval"""
    
    print("=== Testing Session Visibility ===\n")
    
    # 1. Login
    print("1. Login:")
    response = requests.post('http://localhost:8000/api/auth/login', json={
        'email': 'martin@danglefeet.com',
        'password': '123'
    })
    
    if response.status_code != 200:
        print(f"✗ Login failed: {response.text}")
        return
        
    data = response.json()
    token = data.get('access_token')
    print(f"✓ Login successful")
    
    # Decode token
    decoded = jwt.decode(token, 'dummy', algorithms=['HS256'], options={"verify_signature": False})
    user_id = decoded.get('user_id')
    print(f"  Token user_id: {user_id}")
    print(f"  Token email: {decoded.get('email')}")
    
    # 2. Check database
    print("\n2. Database check:")
    conn = sqlite3.connect('data/db/app.db')
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, user_id, title, created_at FROM chat_sessions ORDER BY created_at DESC")
    sessions = cursor.fetchall()
    
    print(f"  Total sessions in DB: {len(sessions)}")
    for session in sessions:
        print(f"    - ID: {session[0][:8]}...")
        print(f"      User ID: {session[1]} (type: {type(session[1]).__name__})")
        print(f"      Title: {session[2]}")
    
    # Check for this specific user
    cursor.execute("SELECT COUNT(*) FROM chat_sessions WHERE user_id = ?", (str(user_id),))
    count_str = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM chat_sessions WHERE user_id = ?", (user_id,))
    count_int = cursor.fetchone()[0]
    
    print(f"\n  Sessions for user_id '{user_id}' (string): {count_str}")
    print(f"  Sessions for user_id {user_id} (int): {count_int}")
    
    conn.close()
    
    # 3. Test API endpoints
    print("\n3. API Tests:")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test chat/sessions with since parameter from the log
    since_value = 1749125365705  # From your log
    
    endpoints = [
        ('/api/chat/sessions', {'since': since_value}),
        ('/api/chat/sessions', {'since': 0}),
        ('/api/chat/sessions', {}),
        ('/api/sessions', {'since': 0}),
    ]
    
    for endpoint, params in endpoints:
        response = requests.get(f'http://localhost:8000{endpoint}', 
                              params=params,
                              headers=headers)
        
        print(f"\n  {endpoint} with params {params}:")
        print(f"    Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"    Sessions returned: {len(data)}")
            if len(data) > 0:
                print(f"    First session: {data[0]}")
        else:
            print(f"    Error: {response.text}")
    
    # 4. Check the since parameter issue
    print("\n4. Since parameter analysis:")
    print(f"  Since value from log: {since_value}")
    print(f"  Current timestamp: {int(time.time() * 1000)}")
    print(f"  Difference: {int(time.time() * 1000) - since_value} ms")
    
    # Check session timestamps
    conn = sqlite3.connect('data/db/app.db')
    cursor = conn.cursor()
    cursor.execute("SELECT MIN(created_at), MAX(created_at), MIN(updated_at), MAX(updated_at) FROM chat_sessions")
    min_created, max_created, min_updated, max_updated = cursor.fetchone()
    
    print(f"\n  Session timestamps in DB:")
    print(f"    Created: {min_created} - {max_created}")
    print(f"    Updated: {min_updated} - {max_updated}")
    print(f"    Since > max_updated? {since_value > max_updated if max_updated else 'N/A'}")
    
    conn.close()

import time

if __name__ == "__main__":
    test_complete_flow()