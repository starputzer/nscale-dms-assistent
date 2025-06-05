#!/usr/bin/env python3
"""Final authentication test"""

import requests
import json

def test_authentication():
    """Test complete authentication flow"""
    
    BASE_URL = "http://localhost:8000"
    
    print("=== AUTHENTICATION TEST ===\n")
    
    # Step 1: Login
    print("1. Testing Login...")
    try:
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "martin@danglefeet.com", "password": "123"},
            timeout=5
        )
        
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            token = data.get('token') or data.get('access_token')
            
            if token:
                print(f"   ✅ Login successful!")
                print(f"   Token: {token[:50]}...")
                
                # Step 2: Test Headers Endpoint
                print("\n2. Testing Headers Endpoint...")
                headers_response = requests.get(
                    f"{BASE_URL}/api/test/headers",
                    headers={"Authorization": f"Bearer {token}"},
                    timeout=5
                )
                
                if headers_response.status_code == 200:
                    print(f"   ✅ Headers endpoint works!")
                    headers_data = headers_response.json()
                    if 'authorization' in str(headers_data.get('headers', {})).lower():
                        print(f"   ✅ Authorization header received by backend!")
                else:
                    print(f"   ❌ Headers endpoint returned: {headers_response.status_code}")
                
                # Step 3: Test Admin Users
                print("\n3. Testing Admin Users Endpoint...")
                admin_response = requests.get(
                    f"{BASE_URL}/api/admin/users",
                    headers={"Authorization": f"Bearer {token}"},
                    timeout=5
                )
                
                print(f"   Status: {admin_response.status_code}")
                
                if admin_response.status_code == 200:
                    print(f"   ✅ Admin endpoint works!")
                    users_data = admin_response.json()
                    print(f"   Found {len(users_data.get('users', []))} users")
                elif admin_response.status_code == 403:
                    print(f"   ❌ Authentication failed - not authorized")
                    print(f"   Response: {admin_response.text}")
                else:
                    print(f"   ❌ Error: {admin_response.text[:200]}")
                
                # Summary
                print("\n=== SUMMARY ===")
                if admin_response.status_code == 200:
                    print("✅ Authentication is working correctly!")
                else:
                    print("❌ Authentication issues detected")
                    print("   - Login works")
                    print("   - Token is issued") 
                    print("   - But admin endpoint authentication fails")
                    
            else:
                print(f"   ❌ No token in response!")
        else:
            print(f"   ❌ Login failed: {response.text}")
            
    except requests.exceptions.Timeout:
        print("   ❌ Request timed out - is the server running?")
    except requests.exceptions.ConnectionError:
        print("   ❌ Cannot connect to server on port 8000")
    except Exception as e:
        print(f"   ❌ Error: {e}")

if __name__ == "__main__":
    test_authentication()