#!/usr/bin/env python3
"""Get a fresh token from the running server"""

import requests
import json

# Login to get a fresh token
response = requests.post(
    "http://localhost:8000/api/auth/login",
    json={"email": "martin@danglefeet.com", "password": "123"}
)

if response.status_code == 200:
    data = response.json()
    token = data.get("access_token") or data.get("token")
    print(f"Fresh token: {token}")
    
    # Save it for testing
    with open("fresh_token.txt", "w") as f:
        f.write(token)
        
    print("\nToken saved to fresh_token.txt")
else:
    print(f"Login failed: {response.status_code}")
    print(response.text)