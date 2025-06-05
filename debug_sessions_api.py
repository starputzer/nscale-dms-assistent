#!/usr/bin/env python3
"""
Debug why sessions are not being returned
"""

import requests
import sqlite3
import json
from jose import jwt

def get_token():
    """Get auth token"""
    response = requests.post('http://localhost:8000/api/auth/login', json={
        'email': 'martin@danglefeet.com',
        'password': '123'
    })
    
    if response.status_code == 200:
        data = response.json()
        token = data.get('access_token')
        
        # Decode token to see user_id
        decoded = jwt.decode(token, 'dummy', algorithms=['HS256'], options={"verify_signature": False})
        print(f"✓ Login successful")
        print(f"  Token user_id: {decoded.get('user_id')}")
        print(f"  Token email: {decoded.get('email')}")
        
        return token, decoded.get('user_id')
    else:
        print(f"✗ Login failed: {response.text}")
        return None, None

def check_database_directly(user_id):
    """Check what's in the database"""
    print("\n=== Database Check ===")
    
    conn = sqlite3.connect('data/db/app.db')
    cursor = conn.cursor()
    
    # Check all sessions
    cursor.execute("SELECT id, user_id, title, created_at FROM chat_sessions")
    all_sessions = cursor.fetchall()
    
    print(f"\nAll sessions in database:")
    for session in all_sessions:
        print(f"  ID: {session[0]}")
        print(f"  User ID: {session[1]} (type: {type(session[1])})")
        print(f"  Title: {session[2]}")
        print(f"  Created: {session[3]}")
        print()
    
    # Check sessions for specific user_id (as string)
    cursor.execute("SELECT * FROM chat_sessions WHERE user_id = ?", (str(user_id),))
    user_sessions_str = cursor.fetchall()
    
    # Check sessions for specific user_id (as integer)
    cursor.execute("SELECT * FROM chat_sessions WHERE user_id = ?", (user_id,))
    user_sessions_int = cursor.fetchall()
    
    print(f"\nSessions for user_id '{user_id}' (as string): {len(user_sessions_str)}")
    print(f"Sessions for user_id {user_id} (as integer): {len(user_sessions_int)}")
    
    conn.close()

def test_api_endpoints(token):
    """Test all session endpoints"""
    print("\n=== API Tests ===")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test different endpoints
    endpoints = [
        ('/api/sessions', {}),
        ('/api/sessions', {'since': 0}),
        ('/api/chat/sessions', {}),
        ('/api/chat/sessions', {'since': 0}),
    ]
    
    for endpoint, params in endpoints:
        response = requests.get(f'http://localhost:8000{endpoint}', 
                              params=params,
                              headers=headers)
        
        print(f"\n{endpoint} with params {params}:")
        print(f"  Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"  Response type: {type(data)}")
            print(f"  Sessions count: {len(data) if isinstance(data, list) else 'not a list'}")
            if isinstance(data, list) and len(data) > 0:
                print(f"  First session: {data[0]}")
        else:
            print(f"  Error: {response.text}")

def check_session_manager_code():
    """Show the relevant session manager code"""
    print("\n=== Session Manager Code ===")
    
    with open('modules/sessions/session_manager.py', 'r') as f:
        lines = f.readlines()
        
    # Find get_user_sessions method
    in_method = False
    method_lines = []
    
    for i, line in enumerate(lines):
        if 'def get_user_sessions' in line:
            in_method = True
        
        if in_method:
            method_lines.append(f"{i+1}: {line.rstrip()}")
            
            # Stop at next method
            if line.strip().startswith('def ') and 'get_user_sessions' not in line:
                break
    
    print("get_user_sessions method:")
    print('\n'.join(method_lines[:30]))  # First 30 lines

def main():
    # Get token and user_id
    token, user_id = get_token()
    
    if token:
        # Check database
        check_database_directly(user_id)
        
        # Test API
        test_api_endpoints(token)
        
        # Show code
        check_session_manager_code()

if __name__ == "__main__":
    main()