#!/usr/bin/env python3
"""
Comprehensive test of all endpoints to verify they are working
"""

import requests
import json
from datetime import datetime

# Base URL
BASE_URL = "http://localhost:5175"

# Test credentials
TEST_EMAIL = "martin@danglefeet.com"
TEST_PASSWORD = "123"

def get_auth_token():
    """Get authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    if response.status_code == 200:
        return response.json()["access_token"]
    else:
        print(f"❌ Login failed: {response.status_code} - {response.text}")
        return None

def test_endpoint(method, path, token, data=None, description=""):
    """Test a single endpoint"""
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        if method == "GET":
            response = requests.get(f"{BASE_URL}{path}", headers=headers)
        elif method == "POST":
            response = requests.post(f"{BASE_URL}{path}", headers=headers, json=data)
        else:
            response = requests.request(method, f"{BASE_URL}{path}", headers=headers, json=data)
        
        if response.status_code in [200, 201]:
            print(f"✅ {method} {path} - {response.status_code} - {description}")
            return True
        else:
            print(f"❌ {method} {path} - {response.status_code} - {description}")
            if response.status_code != 404:
                print(f"   Response: {response.text[:200]}")
            return False
    except Exception as e:
        print(f"❌ {method} {path} - ERROR: {e} - {description}")
        return False

def test_all_endpoints():
    """Test all endpoints comprehensively"""
    print("=" * 60)
    print("COMPREHENSIVE ENDPOINT TEST")
    print(f"Testing server at: {BASE_URL}")
    print(f"Time: {datetime.now()}")
    print("=" * 60)
    
    # Get auth token
    print("\n1. AUTHENTICATION")
    token = get_auth_token()
    if not token:
        print("Cannot proceed without authentication token")
        return
    print(f"✅ Got auth token: {token[:50]}...")
    
    # Define all endpoints to test
    endpoints = [
        # Core endpoints
        ("GET", "/api/v1/chat/sessions", "Get chat sessions (v1)"),
        ("GET", "/api/sessions", "Get chat sessions (legacy)"),
        
        # Admin Dashboard endpoints
        ("GET", "/api/admin-dashboard/summary", "Admin dashboard summary"),
        ("GET", "/api/admin-dashboard/stats", "Admin dashboard stats"),
        ("GET", "/api/admin-dashboard/recent-activity", "Admin recent activity"),
        ("POST", "/api/admin-dashboard/actions/clear-cache", "Clear cache action"),
        ("POST", "/api/admin-dashboard/actions/system-check", "System check action"),
        
        # Admin Dashboard Standard endpoints
        ("GET", "/api/admin-dashboard-standard/stats", "Standard dashboard stats"),
        ("GET", "/api/admin-dashboard-standard/recent-activity", "Standard recent activity"),
        
        # Admin User Management
        ("GET", "/api/admin/users", "List users"),
        ("GET", "/api/admin/users?page=1&per_page=10", "List users with pagination"),
        
        # Admin Feedback
        ("GET", "/api/admin/feedback/stats", "Feedback statistics"),
        ("GET", "/api/admin/feedback", "List feedback"),
        ("GET", "/api/admin/feedback?limit=10", "List feedback with limit"),
        
        # Admin Statistics
        ("GET", "/api/admin-statistics/summary", "Statistics summary"),
        ("GET", "/api/admin-statistics/time-data?range=week", "Time range data"),
        ("GET", "/api/admin-statistics/user-segmentation", "User segmentation"),
        
        # Admin System
        ("GET", "/api/admin/system/health", "System health check"),
        ("GET", "/api/admin/system/info", "System information"),
        ("GET", "/api/admin/system/resource-usage", "Resource usage"),
        ("GET", "/api/admin/system/logs/latest?limit=10", "Latest logs"),
        ("GET", "/api/admin/system/alerts", "System alerts"),
        
        # Admin System Comprehensive
        ("GET", "/api/admin-system-comprehensive/health", "Comprehensive health check"),
        ("GET", "/api/admin-system-comprehensive/performance/metrics", "Performance metrics"),
        ("GET", "/api/admin-system-comprehensive/diagnostics", "System diagnostics"),
        
        # Document Converter
        ("GET", "/api/doc-converter/status", "Doc converter status"),
        ("GET", "/api/doc-converter/queue/status", "Queue status"),
        ("GET", "/api/doc-converter/statistics", "Converter statistics"),
        
        # Document Converter Enhanced
        ("GET", "/api/doc-converter-enhanced/ocr-status", "OCR status"),
        ("GET", "/api/doc-converter-enhanced/supported-formats", "Supported formats"),
        ("GET", "/api/doc-converter-enhanced/conversion-history", "Conversion history"),
        
        # Advanced Documents
        ("GET", "/api/advanced-documents/ocr-status", "Advanced OCR status"),
        ("GET", "/api/advanced-documents/processing-stats", "Processing statistics"),
        ("GET", "/api/advanced-documents/extraction-patterns", "Extraction patterns"),
        
        # RAG System
        ("GET", "/api/rag/status", "RAG system status"),
        ("GET", "/api/rag/health", "RAG health check"),
        ("GET", "/api/rag/embedding/status", "Embedding status"),
        
        # RAG Settings
        ("GET", "/api/rag-settings/current", "Current RAG settings"),
        ("GET", "/api/rag-settings/optimization/status", "Optimization status"),
        ("GET", "/api/rag-settings/benchmark/latest", "Latest benchmark results"),
        
        # Knowledge Manager
        ("GET", "/api/knowledge-manager/stats", "Knowledge base statistics"),
        ("GET", "/api/knowledge-manager/categories", "Document categories"),
        ("GET", "/api/knowledge-manager/documents", "List documents"),
        
        # System Monitor
        ("GET", "/api/system-monitor/status", "System monitor status"),
        ("GET", "/api/system-monitor/metrics/current", "Current metrics"),
        ("GET", "/api/system-monitor/alerts/active", "Active alerts"),
        
        # Background Processing
        ("GET", "/api/background-processing/jobs", "List background jobs"),
        ("GET", "/api/background-processing/queue/status", "Queue status"),
        ("GET", "/api/background-processing/workers", "Worker status"),
        
        # Performance Monitor
        ("GET", "/api/performance/metrics", "Performance metrics"),
        ("GET", "/api/performance/bottlenecks", "Performance bottlenecks"),
    ]
    
    # Test each endpoint
    print("\n2. TESTING ALL ENDPOINTS")
    success_count = 0
    fail_count = 0
    
    for method, path, description in endpoints:
        if test_endpoint(method, path, token, description=description):
            success_count += 1
        else:
            fail_count += 1
    
    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print(f"Total endpoints tested: {len(endpoints)}")
    print(f"Successful: {success_count}")
    print(f"Failed: {fail_count}")
    print(f"Success rate: {(success_count/len(endpoints)*100):.1f}%")
    print("=" * 60)
    
    # List working endpoint groups
    if success_count > 0:
        print("\n✅ WORKING ENDPOINT GROUPS:")
        working_groups = set()
        for method, path, description in endpoints:
            # Quick test without printing
            headers = {"Authorization": f"Bearer {token}"}
            try:
                response = requests.get(f"{BASE_URL}{path}", headers=headers)
                if response.status_code in [200, 201]:
                    # Extract group from path
                    parts = path.split('/')
                    if len(parts) >= 3:
                        group = parts[2]
                        if group not in working_groups:
                            working_groups.add(group)
                            print(f"  - {group}")
            except:
                pass

if __name__ == "__main__":
    test_all_endpoints()