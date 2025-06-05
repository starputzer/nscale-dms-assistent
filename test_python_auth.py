#!/usr/bin/env python3
"""Test authentication directly with Python"""

import requests
import json

BASE_URL = "http://localhost:8000"

# Step 1: Login
print("=== LOGIN ===")
login_response = requests.post(
    f"{BASE_URL}/api/auth/login",
    json={"email": "martin@danglefeet.com", "password": "123"}
)

print(f"Status: {login_response.status_code}")
print(f"Response: {json.dumps(login_response.json(), indent=2)}")

if login_response.status_code == 200:
    data = login_response.json()
    token = data.get('token') or data.get('access_token')
    
    if token:
        print(f"\nToken received: {token[:50]}...")
        
        # Step 2: Test Headers endpoint
        print("\n=== TEST HEADERS ===")
        headers_response = requests.get(
            f"{BASE_URL}/api/test/headers",
            headers={"Authorization": f"Bearer {token}"}
        )
        print(f"Status: {headers_response.status_code}")
        if headers_response.status_code == 200:
            print(f"Headers seen by server:")
            headers_data = headers_response.json()
            for key, value in headers_data.get('headers', {}).items():
                if key.lower() in ['authorization', 'host']:
                    print(f"  {key}: {value}")
        else:
            print(f"Error: {headers_response.text}")
            
        # Step 3: Test Admin Users
        print("\n=== TEST ADMIN USERS ===")
        admin_response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {token}"}
        )
        print(f"Status: {admin_response.status_code}")
        print(f"Response: {admin_response.text[:200]}...")
    else:
        print("ERROR: No token in response!")
else:
    print(f"ERROR: Login failed with status {login_response.status_code}")