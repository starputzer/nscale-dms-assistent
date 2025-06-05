#!/usr/bin/env python3
"""Test authentication with API"""

import requests
import json

BASE_URL = "http://localhost:8000"

def test_auth_flow():
    """Test complete authentication flow"""
    
    # Step 1: Login
    print("\n=== Step 1: Login ===")
    login_response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "martin@danglefeet.com", "password": "123"}
    )
    
    print(f"Login Status: {login_response.status_code}")
    login_data = login_response.json()
    print(f"Login Response: {json.dumps(login_data, indent=2)}")
    
    if 'token' not in login_data:
        print("ERROR: No token in login response!")
        return
    
    token = login_data['token']
    print(f"\nToken received: {token[:50]}...")
    
    # Step 2: Test admin users with different header formats
    print("\n=== Step 2: Test Admin Users ===")
    
    # Test 1: Bearer token (standard)
    print("\nTest 1: With 'Bearer' prefix")
    headers1 = {"Authorization": f"Bearer {token}"}
    response1 = requests.get(f"{BASE_URL}/api/admin/users", headers=headers1)
    print(f"Status: {response1.status_code}")
    print(f"Response: {response1.text[:200]}")
    
    # Test 2: Just token (no Bearer)
    print("\nTest 2: Without 'Bearer' prefix")
    headers2 = {"Authorization": token}
    response2 = requests.get(f"{BASE_URL}/api/admin/users", headers=headers2)
    print(f"Status: {response2.status_code}")
    print(f"Response: {response2.text[:200]}")
    
    # Test 3: Check what headers the server sees
    print("\nTest 3: Echo headers endpoint")
    response3 = requests.get(
        f"{BASE_URL}/api/test/headers",
        headers={"Authorization": f"Bearer {token}"}
    )
    if response3.status_code == 200:
        print(f"Server received headers: {response3.json()}")
    else:
        print(f"Echo endpoint not available: {response3.status_code}")

if __name__ == "__main__":
    test_auth_flow()