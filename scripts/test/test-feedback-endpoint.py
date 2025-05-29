#!/usr/bin/env python3
import requests
import json

# First, login to get a token
login_data = {
    "email": "admin@example.com",
    "password": "admin123"
}

# Login
login_response = requests.post("http://localhost:8080/api/auth/login", json=login_data)
if login_response.status_code == 200:
    token = login_response.json()["token"]
    print(f"Login successful, token: {token[:20]}...")
    
    # Test the feedback stats endpoint
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get feedback stats
    stats_response = requests.get("http://localhost:8080/api/v1/admin/feedback/stats", headers=headers)
    print(f"\nFeedback Stats Response ({stats_response.status_code}):")
    print(json.dumps(stats_response.json(), indent=2))
    
    # Get all feedback
    feedback_response = requests.get("http://localhost:8080/api/v1/admin/feedback", headers=headers)
    print(f"\nAll Feedback Response ({feedback_response.status_code}):")
    print(json.dumps(feedback_response.json(), indent=2))
    
else:
    print(f"Login failed: {login_response.status_code}")
    print(login_response.json())