#!/usr/bin/env python3
"""Test all endpoints to ensure they're working"""

import requests
import json
from datetime import datetime
import time

# Server configuration
BASE_URL = "http://localhost:8000"

# First, login to get token
def login():
    """Login and get JWT token"""
    login_data = {
        "email": "admin@example.com",
        "password": "admin"
    }
    
    # Try the actual login endpoint
    response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
    if response.status_code == 200:
        return response.json()["access_token"]
    else:
        print(f"Login failed: {response.status_code} - {response.text}")
        return None

# Test endpoints
def test_endpoints():
    """Test all endpoints"""
    
    # Get auth token
    token = login()
    if not token:
        print("Failed to authenticate!")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # All endpoints to test - mix of /api and /api/v1 as they appear in server
    endpoints = [
        # Auth endpoints (from missing_endpoints.py with /api/v1 prefix)
        ("GET", "/api/v1/auth/user", None),
        ("POST", "/api/v1/auth/logout", None),
        
        # System endpoints
        ("GET", "/api/v1/system/info", None),
        ("GET", "/api/v1/system/health", None),
        ("GET", "/api/v1/system/check", None),
        
        # RAG endpoints
        ("GET", "/api/v1/rag/status", None),
        ("GET", "/api/v1/rag/stats", None),
        ("POST", "/api/v1/rag/search", {"query": "test"}),
        
        # Original endpoints without /v1
        ("GET", "/api/system/info", None),
        ("GET", "/api/system/health", None),
        ("GET", "/api/system/stats", None),
        
        # Admin System endpoints
        ("GET", "/api/v1/admin/system/stats", None),
        ("GET", "/api/v1/admin/system/health", None),
        ("POST", "/api/v1/admin/system/cache/clear", None),
        ("GET", "/api/v1/admin/system/resources", None),
        ("GET", "/api/v1/admin/system/processes", None),
        ("GET", "/api/v1/admin/system/rag/metrics", None),
        ("GET", "/api/v1/admin/background/jobs", None),
        ("GET", "/api/v1/admin/dashboard/summary", None),
        ("GET", "/api/v1/admin/system/logs", None),
        
        # Admin Dashboard endpoints
        ("GET", "/api/v1/admin/dashboard/summary", None),
        ("POST", "/api/v1/admin/dashboard/queue/pause", None),
        ("POST", "/api/v1/admin/dashboard/queue/resume", None),
        
        # Admin Statistics endpoints
        ("GET", "/api/v1/admin/statistics/summary", None),
        ("GET", "/api/v1/admin/statistics/usage-trend", None),
        ("GET", "/api/v1/admin/statistics/user-segmentation", None),
        ("GET", "/api/v1/admin/statistics/feedback-ratings", None),
        ("GET", "/api/v1/admin/statistics/performance-metrics", None),
        ("GET", "/api/v1/admin/statistics/session-distribution", None),
        
        # Admin Users endpoints
        ("GET", "/api/v1/admin/users", None),
        ("GET", "/api/v1/admin/users/count", None),
        ("GET", "/api/v1/admin/users/stats", None),
        ("GET", "/api/v1/admin/users/active", None),
        
        # Admin Feedback endpoints
        ("GET", "/api/v1/admin/feedback/stats", None),
        ("GET", "/api/v1/admin/feedback/list", None),
        ("GET", "/api/v1/admin/feedback/negative", None),
        
        # Knowledge endpoints
        ("GET", "/api/v1/knowledge/stats", None),
        
        # Doc converter endpoints
        ("GET", "/api/v1/doc-converter/queue/status", None),
        
        # Sessions endpoint
        ("GET", "/api/sessions", None),
        
        # Doc converter (original)
        ("GET", "/api/doc-converter/convert", None),
        ("GET", "/api/doc-converter/queue/status", None),
    ]
    
    # Test each endpoint
    results = []
    for method, endpoint, data in endpoints:
        try:
            if method == "GET":
                response = requests.get(f"{BASE_URL}{endpoint}", headers=headers)
            elif method == "POST":
                response = requests.post(f"{BASE_URL}{endpoint}", headers=headers, json=data)
            
            status = "✅" if response.status_code in [200, 201] else "❌"
            results.append({
                "endpoint": endpoint,
                "method": method,
                "status": response.status_code,
                "success": response.status_code in [200, 201],
                "response": response.text[:100] if response.status_code != 200 else "OK"
            })
            
            print(f"{status} {method} {endpoint}: {response.status_code}")
            
        except Exception as e:
            results.append({
                "endpoint": endpoint,
                "method": method,
                "status": "ERROR",
                "success": False,
                "response": str(e)
            })
            print(f"❌ {method} {endpoint}: ERROR - {e}")
    
    # Summary
    total = len(results)
    successful = sum(1 for r in results if r["success"])
    print("\n" + "="*50)
    print(f"SUMMARY: {successful}/{total} endpoints working ({successful/total*100:.1f}%)")
    print("="*50)
    
    # Show failed endpoints
    failed = [r for r in results if not r["success"]]
    if failed:
        print("\nFAILED ENDPOINTS:")
        for r in failed:
            print(f"  - {r['method']} {r['endpoint']}: {r['status']} - {r['response'][:50]}")

if __name__ == "__main__":
    print("Testing all endpoints on port 8000...")
    print("="*50)
    test_endpoints()