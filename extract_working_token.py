#!/usr/bin/env python3
"""Extract working authentication details"""

import requests
import jwt
import json

# Login to get token
response = requests.post(
    "http://localhost:8000/api/auth/login",
    json={"email": "martin@danglefeet.com", "password": "123"}
)

if response.status_code == 200:
    data = response.json()
    token = data.get("token") or data.get("access_token")
    print(f"Token: {token}")
    
    # Try to decode without verification to see the payload
    try:
        # Decode without verification to see payload
        payload = jwt.decode(token, options={"verify_signature": False})
        print(f"\nToken payload: {json.dumps(payload, indent=2)}")
        
        # Extract the header to see algorithm
        header = jwt.get_unverified_header(token)
        print(f"\nToken header: {json.dumps(header, indent=2)}")
        
    except Exception as e:
        print(f"Could not decode token: {e}")
    
    # Save for future use
    with open(".test_token", "w") as f:
        f.write(token)
    print("\nToken saved to .test_token")
    
    # Test the token
    test_response = requests.get(
        "http://localhost:8000/api/admin/users/count",
        headers={"Authorization": f"Bearer {token}"}
    )
    print(f"\nTest request status: {test_response.status_code}")
    if test_response.status_code == 200:
        print(f"Response: {test_response.json()}")
else:
    print(f"Login failed: {response.status_code}")
    print(response.text)