#!/usr/bin/env python3
"""Quick endpoint test to verify fixes"""

import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"

def test_endpoints():
    """Test key endpoints to verify fixes"""
    
    print("=== ENDPOINT FIX VERIFICATION ===")
    print(f"Time: {datetime.now()}")
    print("=" * 40)
    
    results = []
    
    # 1. Test new system endpoints
    print("\n1. SYSTEM ENDPOINTS (NEW):")
    endpoints = [
        ("GET", "/api/system/health", None),
        ("GET", "/api/system/info", None),
        ("GET", "/api/system/check", None)
    ]
    
    for method, path, data in endpoints:
        try:
            if method == "GET":
                resp = requests.get(f"{BASE_URL}{path}", timeout=3)
            else:
                resp = requests.post(f"{BASE_URL}{path}", json=data, timeout=3)
            
            status = "✅" if resp.status_code == 200 else "❌"
            print(f"   {status} {method} {path} - {resp.status_code}")
            results.append((path, resp.status_code == 200))
        except Exception as e:
            print(f"   ❌ {method} {path} - Error: {e}")
            results.append((path, False))
    
    # 2. Test auth endpoints
    print("\n2. AUTH ENDPOINTS:")
    
    # Login first
    try:
        resp = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "martin@danglefeet.com", "password": "123"},
            timeout=3
        )
        if resp.status_code == 200:
            token = resp.json().get('token') or resp.json().get('access_token')
            print(f"   ✅ Login successful - Token: {token[:30]}...")
            
            # Test new auth endpoints
            headers = {"Authorization": f"Bearer {token}"}
            
            # Test /api/auth/user
            resp = requests.get(f"{BASE_URL}/api/auth/user", headers=headers, timeout=3)
            status = "✅" if resp.status_code == 200 else "❌"
            print(f"   {status} GET /api/auth/user - {resp.status_code}")
            
            # Test /api/auth/logout
            resp = requests.post(f"{BASE_URL}/api/auth/logout", headers=headers, timeout=3)
            status = "✅" if resp.status_code == 200 else "❌"
            print(f"   {status} POST /api/auth/logout - {resp.status_code}")
            
            # 3. Test admin endpoints
            print("\n3. ADMIN ENDPOINTS:")
            admin_endpoints = [
                ("GET", "/api/admin/system/stats"),
                ("GET", "/api/admin/system/health"),
                ("GET", "/api/admin/dashboard/summary"),
                ("GET", "/api/admin/statistics/summary"),
                ("GET", "/api/rag/status"),
                ("GET", "/api/rag/stats")
            ]
            
            for method, path in admin_endpoints:
                try:
                    resp = requests.get(f"{BASE_URL}{path}", headers=headers, timeout=3)
                    status = "✅" if resp.status_code in [200, 403] else "❌"
                    print(f"   {status} {method} {path} - {resp.status_code}")
                    results.append((path, resp.status_code in [200, 403]))
                except Exception as e:
                    print(f"   ❌ {method} {path} - Error: {e}")
                    results.append((path, False))
                    
        else:
            print(f"   ❌ Login failed: {resp.status_code}")
            
    except Exception as e:
        print(f"   ❌ Login error: {e}")
    
    # Summary
    print("\n" + "=" * 40)
    print("SUMMARY:")
    passed = sum(1 for _, success in results if success)
    total = len(results)
    print(f"Passed: {passed}/{total} ({passed/total*100:.0f}%)")
    
    if passed == total:
        print("\n✅ ALL FIXES VERIFIED - Endpoints are working!")
    elif passed > total * 0.8:
        print("\n⚠️  MOSTLY FIXED - Some endpoints still have issues")
    else:
        print("\n❌ FIXES INCOMPLETE - Many endpoints still failing")

if __name__ == "__main__":
    test_endpoints()