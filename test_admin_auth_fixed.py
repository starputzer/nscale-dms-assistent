#!/usr/bin/env python3
"""Test the fixed admin authentication"""

import requests
import json

BASE_URL = "http://localhost:8080"

def test_admin_auth():
    print("=" * 80)
    print("TESTING FIXED ADMIN AUTHENTICATION")
    print("=" * 80)
    
    # Step 1: Login as admin
    print("\n1. Login as admin user...")
    login_response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "martin@danglefeet.com", "password": "123"}
    )
    
    if login_response.status_code != 200:
        print(f"   ❌ Login failed: {login_response.status_code}")
        print(f"   Response: {login_response.text}")
        return
    
    login_data = login_response.json()
    token = login_data.get("access_token") or login_data.get("token")
    print(f"   ✅ Login successful")
    print(f"   Token: {token[:50]}...")
    
    # Prepare headers with token
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Test admin endpoints
    endpoints = [
        ("/api/admin/users/", "GET", "Admin Users List"),
        ("/api/admin/feedback/stats", "GET", "Feedback Stats"),
        ("/api/admin-dashboard/summary", "GET", "Dashboard Summary"),
        ("/api/admin/users/count", "GET", "Users Count"),
        ("/api/admin/users/stats", "GET", "Users Stats"),
        ("/api/admin/system/info", "GET", "System Info"),
    ]
    
    print("\n2. Testing admin endpoints with fixed auth...")
    for endpoint, method, description in endpoints:
        print(f"\n   Testing {description} ({method} {endpoint})...")
        
        if method == "GET":
            response = requests.get(f"{BASE_URL}{endpoint}", headers=headers)
        
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            print(f"   ✅ Success!")
            # Show first 200 chars of response
            response_text = response.text[:200]
            if len(response.text) > 200:
                response_text += "..."
            print(f"   Response: {response_text}")
        elif response.status_code == 404:
            print(f"   ⚠️  Endpoint not found (might not be implemented)")
        else:
            print(f"   ❌ Failed: {response.status_code}")
            print(f"   Error: {response.text}")

if __name__ == "__main__":
    test_admin_auth()