#!/usr/bin/env python3
"""
Test script to verify admin authentication is working correctly
"""

import requests
import json

# API base URL
BASE_URL = "http://localhost:8000/api/v1"

# Test credentials
admin_email = "admin@example.com"
admin_password = "admin123"

def test_login():
    """Test login to get JWT token"""
    print("Testing login...")
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": admin_email, "password": admin_password}
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Login successful: {data['email']}")
        return data['access_token']
    else:
        print(f"✗ Login failed: {response.status_code} - {response.text}")
        return None

def test_admin_endpoints(token):
    """Test various admin endpoints with the token"""
    headers = {"Authorization": f"Bearer {token}"}
    
    endpoints = [
        ("/admin/users/count", "User Count"),
        ("/admin/users/stats", "User Stats"),
        ("/admin/feedback/stats", "Feedback Stats"),
        ("/admin/system/resources", "System Resources"),
        ("/admin/statistics/summary", "Statistics Summary"),
        ("/admin/dashboard/stats", "Dashboard Stats"),
    ]
    
    print("\nTesting admin endpoints...")
    for endpoint, name in endpoints:
        try:
            response = requests.get(f"{BASE_URL}{endpoint}", headers=headers)
            if response.status_code == 200:
                print(f"✓ {name}: Success")
            else:
                print(f"✗ {name}: Failed ({response.status_code})")
                if response.status_code == 422:
                    print(f"  Details: {response.json()}")
        except Exception as e:
            print(f"✗ {name}: Error - {e}")

def main():
    """Main test function"""
    print("Testing Admin Authentication Fix\n")
    
    # Test login
    token = test_login()
    if not token:
        print("\nCannot proceed without valid token")
        return
    
    # Test admin endpoints
    test_admin_endpoints(token)
    
    print("\nTest complete!")

if __name__ == "__main__":
    main()