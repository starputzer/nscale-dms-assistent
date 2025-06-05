#!/usr/bin/env python3
"""Test API endpoints directly"""

import requests
import json

BASE_URL = "http://localhost:8000"

def test_login():
    """Test the login endpoint"""
    print("\n=== Testing Login ===")
    url = f"{BASE_URL}/api/auth/login"
    data = {
        "email": "martin@danglefeet.com",
        "password": "123"
    }
    
    try:
        response = requests.post(url, json=data)
        print(f"Status Code: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")
        print(f"Content-Type: {response.headers.get('content-type')}")
        
        # Try to parse as JSON
        try:
            json_data = response.json()
            print(f"JSON Response: {json.dumps(json_data, indent=2)}")
        except:
            print(f"Raw Response: {response.text[:500]}")
            
    except requests.exceptions.ConnectionError:
        print("ERROR: Cannot connect to server. Is it running on port 8000?")
    except Exception as e:
        print(f"ERROR: {e}")

def test_admin_users(token=None):
    """Test the admin users endpoint"""
    print("\n=== Testing Admin Users ===")
    url = f"{BASE_URL}/api/admin/users"
    
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    try:
        response = requests.get(url, headers=headers)
        print(f"Status Code: {response.status_code}")
        print(f"Content-Type: {response.headers.get('content-type')}")
        
        # Try to parse as JSON
        try:
            json_data = response.json()
            print(f"JSON Response: {json.dumps(json_data, indent=2)}")
        except:
            print(f"Raw Response: {response.text[:500]}")
            
    except requests.exceptions.ConnectionError:
        print("ERROR: Cannot connect to server. Is it running on port 8000?")
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    # Test login first
    test_login()
    
    # Test admin users without token
    test_admin_users()
    
    print("\nNote: If you get connection errors, make sure the server is running:")
    print("  cd /opt/nscale-assist/app")
    print("  python api/server.py")