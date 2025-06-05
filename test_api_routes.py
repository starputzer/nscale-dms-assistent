#!/usr/bin/env python3
"""
Test script to verify API routes are accessible
"""

import requests
import json

# Base URL
BASE_URL = "http://localhost:8000"

# Test endpoints
endpoints = [
    ("GET", "/api/motd", "MOTD endpoint"),
    ("GET", "/api/admin-dashboard/summary", "Dashboard summary"),
    ("GET", "/api/admin/users/", "Admin users list"),
    ("GET", "/api/admin/feedback/stats", "Feedback stats"),
    ("GET", "/api/auth/login", "Auth login (should be POST)"),
    ("GET", "/api/system/info", "System info"),
]

# Test authentication first
print("Testing authentication...")
auth_response = requests.post(
    f"{BASE_URL}/api/auth/login",
    json={"email": "martin@danglefeet.com", "password": "123"}
)

if auth_response.status_code == 200:
    token = auth_response.json().get("access_token")
    print(f"✅ Authentication successful, token: {token[:20]}...")
    headers = {"Authorization": f"Bearer {token}"}
else:
    print(f"❌ Authentication failed: {auth_response.status_code}")
    print(auth_response.text)
    headers = {}

print("\nTesting endpoints...")
print("-" * 60)

for method, endpoint, description in endpoints:
    try:
        if method == "GET":
            response = requests.get(f"{BASE_URL}{endpoint}", headers=headers)
        else:
            response = requests.request(method, f"{BASE_URL}{endpoint}", headers=headers)
        
        status_emoji = "✅" if response.status_code < 400 else "❌"
        print(f"{status_emoji} {method} {endpoint}: {response.status_code} - {description}")
        
        if response.status_code >= 400:
            print(f"   Error: {response.text[:100]}...")
            
    except Exception as e:
        print(f"❌ {method} {endpoint}: Error - {str(e)}")

print("-" * 60)