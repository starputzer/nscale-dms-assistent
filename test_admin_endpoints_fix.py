#!/usr/bin/env python3
"""Test admin endpoints response format fix"""

import requests
import json

# Base URL
BASE_URL = "http://localhost:8000/api"

# Test credentials
TEST_EMAIL = "martin@danglefeet.com"
TEST_PASSWORD = "123"

def test_admin_endpoints():
    # Step 1: Login to get token
    print("1. Testing login...")
    login_response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    
    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.status_code}")
        print(login_response.text)
        return
    
    auth_data = login_response.json()
    token = auth_data.get("access_token")
    
    if not token:
        print("❌ No token received")
        print(json.dumps(auth_data, indent=2))
        return
    
    print(f"✅ Login successful. Token: {token[:20]}...")
    
    # Headers with auth token
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Step 2: Test dashboard summary endpoint
    print("\n2. Testing /admin/dashboard/summary...")
    summary_response = requests.get(
        f"{BASE_URL}/admin/dashboard/summary",
        headers=headers
    )
    
    print(f"Status: {summary_response.status_code}")
    if summary_response.status_code == 200:
        data = summary_response.json()
        print("Response structure:")
        print(f"- Type: {type(data)}")
        print(f"- Keys: {list(data.keys()) if isinstance(data, dict) else 'Not a dict'}")
        print(f"- Has 'success' key: {'success' in data if isinstance(data, dict) else False}")
        print(f"- Has 'data' key: {'data' in data if isinstance(data, dict) else False}")
        print("\nFull response:")
        print(json.dumps(data, indent=2))
    else:
        print(f"❌ Error: {summary_response.text}")
    
    # Step 3: Test dashboard activity endpoint
    print("\n3. Testing /admin/dashboard/activity...")
    activity_response = requests.get(
        f"{BASE_URL}/admin/dashboard/activity",
        headers=headers
    )
    
    print(f"Status: {activity_response.status_code}")
    if activity_response.status_code == 200:
        data = activity_response.json()
        print("Response structure:")
        print(f"- Type: {type(data)}")
        print(f"- Keys: {list(data.keys()) if isinstance(data, dict) else 'Not a dict'}")
        print(f"- Has 'activities' key: {'activities' in data if isinstance(data, dict) else False}")
        print("\nFull response:")
        print(json.dumps(data, indent=2))
    else:
        print(f"❌ Error: {activity_response.text}")
    
    # Step 4: Test feedback stats endpoint
    print("\n4. Testing /admin/feedback/stats...")
    feedback_response = requests.get(
        f"{BASE_URL}/admin/feedback/stats",
        headers=headers
    )
    
    print(f"Status: {feedback_response.status_code}")
    if feedback_response.status_code == 200:
        data = feedback_response.json()
        print("Response structure:")
        print(f"- Type: {type(data)}")
        print(f"- Keys: {list(data.keys()) if isinstance(data, dict) else 'Not a dict'}")
        print("\nFull response:")
        print(json.dumps(data, indent=2))
    else:
        print(f"❌ Error: {feedback_response.text}")

if __name__ == "__main__":
    test_admin_endpoints()