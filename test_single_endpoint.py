#!/usr/bin/env python3
"""Test a single endpoint to debug issues"""

import requests
import json

# Server configuration
BASE_URL = "http://localhost:8000"

# Login to get token
login_data = {
    "email": "admin@example.com",
    "password": "admin"
}

response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
if response.status_code == 200:
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test single endpoint
    test_endpoint = "/api/v1/auth/user"
    response = requests.get(f"{BASE_URL}{test_endpoint}", headers=headers)
    
    print(f"Endpoint: {test_endpoint}")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
else:
    print("Login failed:", response.text)