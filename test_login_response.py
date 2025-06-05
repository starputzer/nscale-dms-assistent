#!/usr/bin/env python3
"""
Test login response format to verify the token field name mismatch
"""

import requests
import json

# Test credentials from CLAUDE.md
email = "martin@danglefeet.com"
password = "123"

# API endpoint
url = "http://localhost:8000/api/auth/login"

# Login request
data = {
    "email": email,
    "password": password
}

print("Testing login endpoint...")
print(f"URL: {url}")
print(f"Credentials: {email} / {password}")
print("-" * 50)

try:
    response = requests.post(url, json=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response Headers: {dict(response.headers)}")
    print("-" * 50)
    
    if response.status_code == 200:
        response_data = response.json()
        print("Response JSON:")
        print(json.dumps(response_data, indent=2))
        
        # Check what fields are in the response
        print("\nResponse fields:")
        for key in response_data.keys():
            print(f"  - {key}: {type(response_data[key]).__name__}")
        
        # Check if it's access_token or token
        if "access_token" in response_data:
            print("\n✓ Response contains 'access_token'")
        if "token" in response_data:
            print("\n✓ Response contains 'token'")
        if "access_token" not in response_data and "token" not in response_data:
            print("\n✗ Response contains neither 'access_token' nor 'token'")
            
    else:
        print(f"Error Response: {response.text}")
        
except Exception as e:
    print(f"Connection Error: {e}")
    print("Make sure the server is running on port 8000")