#!/usr/bin/env python3
import requests
import json

# Test correct login path
print("Testing login endpoints...")

# Try different login paths
paths = [
    "http://localhost:8080/api/auth/login",
    "http://localhost:8080/api/v1/login",
    "http://localhost:8080/login"
]

for path in paths:
    print(f"\nTrying: {path}")
    try:
        response = requests.post(path, json={
            "username": "martin@danglefeet.com",
            "password": "123"
        }, timeout=5)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Success! Token: {data.get('access_token', '')[:20]}...")
            
            # Save the working configuration
            with open("working_auth_config.json", "w") as f:
                json.dump({
                    "login_url": path,
                    "token": data.get('access_token'),
                    "user_id": data.get('user_id'),
                    "expires_at": data.get('expires_at')
                }, f, indent=2)
            print("Configuration saved to working_auth_config.json")
            break
        else:
            print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {str(e)}")

# Test admin endpoints with correct token
try:
    with open("working_auth_config.json", "r") as f:
        config = json.load(f)
        token = config.get('token')
        
    if token:
        print("\n\nTesting admin endpoints with valid token...")
        headers = {"Authorization": f"Bearer {token}"}
        
        admin_endpoints = [
            "/api/v1/admin/users",
            "/api/v1/admin/feedback"
        ]
        
        for endpoint in admin_endpoints:
            url = f"http://localhost:8080{endpoint}"
            response = requests.get(url, headers=headers)
            print(f"{endpoint}: {response.status_code}")
            
except:
    print("No valid token found yet")