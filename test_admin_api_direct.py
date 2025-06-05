#!/usr/bin/env python3
"""Direct test of admin API endpoints"""

import requests
import json
import sys

# Base URL
BASE_URL = "http://localhost:8000"

# Test credentials
EMAIL = "martin@danglefeet.com"
PASSWORD = "123"

def test_admin_api():
    print("=" * 80)
    print("ADMIN API DIRECT TEST")
    print("=" * 80)
    
    # Step 1: Login
    print("\n1. Testing Login...")
    login_response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": EMAIL, "password": PASSWORD}
    )
    
    print(f"Login Response: {login_response.status_code}")
    
    if login_response.status_code != 200:
        print(f"Login failed: {login_response.text}")
        return
    
    login_data = login_response.json()
    token = login_data.get("access_token")
    
    if not token:
        print("No access token received!")
        return
    
    print(f"✅ Got token: {token[:50]}...")
    print(f"User: {login_data.get('user', {}).get('email')} ({login_data.get('user', {}).get('role')})")
    
    # Headers for authenticated requests
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Step 2: Test various admin endpoints
    print("\n2. Testing Admin Endpoints...")
    
    endpoints = [
        ("/api/health", "Health Check"),
        ("/api/auth/user", "Current User"),
        ("/api/admin/users", "Admin Users (no slash)"),
        ("/api/admin/users/", "Admin Users (with slash)"),
        ("/api/admin/feedback/stats", "Admin Feedback Stats"),
        ("/api/admin-dashboard/summary", "Admin Dashboard Summary"),
        ("/api/system/info", "System Info"),
        ("/api/admin/users/count", "User Count"),
        ("/api/admin/users/stats", "User Stats")
    ]
    
    for endpoint, name in endpoints:
        print(f"\nTesting: {name}")
        print(f"URL: {BASE_URL}{endpoint}")
        
        try:
            response = requests.get(f"{BASE_URL}{endpoint}", headers=headers)
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                print(f"✅ Success")
                # Show first 200 chars of response
                text = response.text
                if len(text) > 200:
                    text = text[:200] + "..."
                print(f"Response: {text}")
            elif response.status_code == 401:
                print(f"❌ Unauthorized - Token not accepted")
                print(f"Response: {response.text}")
            elif response.status_code == 403:
                print(f"❌ Forbidden - User doesn't have admin rights")
                print(f"Response: {response.text}")
            elif response.status_code == 404:
                print(f"❌ Not Found - Endpoint doesn't exist")
                print(f"Response: {response.text}")
            else:
                print(f"❌ Error: {response.status_code}")
                print(f"Response: {response.text}")
                
        except Exception as e:
            print(f"❌ Exception: {str(e)}")
    
    # Step 3: Test token validation
    print("\n\n3. Testing Token Validation...")
    
    # Decode token to check contents (without verification)
    try:
        import base64
        parts = token.split('.')
        if len(parts) == 3:
            # Decode payload
            payload = parts[1]
            # Add padding if needed
            payload += '=' * (4 - len(payload) % 4)
            decoded = base64.b64decode(payload)
            payload_data = json.loads(decoded)
            
            print("Token payload:")
            print(json.dumps(payload_data, indent=2))
            
            # Check for admin role
            if payload_data.get('role') == 'admin':
                print("✅ Token has admin role")
            else:
                print(f"❌ Token role is: {payload_data.get('role', 'undefined')}")
                
    except Exception as e:
        print(f"Error decoding token: {e}")

if __name__ == "__main__":
    test_admin_api()