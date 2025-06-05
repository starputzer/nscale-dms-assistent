#!/usr/bin/env python3
"""Quick auth test"""

import requests
import json

BASE_URL = "http://localhost:8000"

# Step 1: Login
print("=== Login ===")
try:
    login_response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "martin@danglefeet.com", "password": "123"},
        timeout=5
    )
    print(f"Status: {login_response.status_code}")
    
    if login_response.status_code == 200:
        data = login_response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        if 'token' in data:
            token = data['token']
            print(f"\nToken: {token[:50]}...")
            
            # Step 2: Test headers endpoint
            print("\n=== Test Headers Endpoint ===")
            try:
                headers_response = requests.get(
                    f"{BASE_URL}/api/test/headers",
                    headers={"Authorization": f"Bearer {token}"},
                    timeout=5
                )
                print(f"Status: {headers_response.status_code}")
                if headers_response.status_code == 200:
                    print(f"Headers seen by server: {json.dumps(headers_response.json(), indent=2)}")
                else:
                    print(f"Response: {headers_response.text}")
            except Exception as e:
                print(f"Error testing headers: {e}")
                
            # Step 3: Test admin users
            print("\n=== Test Admin Users ===")
            try:
                admin_response = requests.get(
                    f"{BASE_URL}/api/admin/users",
                    headers={"Authorization": f"Bearer {token}"},
                    timeout=5
                )
                print(f"Status: {admin_response.status_code}")
                print(f"Response: {admin_response.text[:200]}")
            except Exception as e:
                print(f"Error testing admin: {e}")
                
except Exception as e:
    print(f"Error: {e}")