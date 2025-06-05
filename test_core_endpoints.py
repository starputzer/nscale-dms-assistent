#!/usr/bin/env python3
"""Test core endpoints quickly"""

import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"

def test_core_endpoints():
    """Test the most important endpoints"""
    
    print("=" * 60)
    print("CORE ENDPOINT TEST")
    print(f"Time: {datetime.now()}")
    print("=" * 60)
    
    results = []
    
    # 1. Health Check
    print("\n1. Testing Health Check...")
    try:
        resp = requests.get(f"{BASE_URL}/api/system/health", timeout=3)
        if resp.status_code == 200:
            print("   ✅ Health check passed")
            results.append(("Health", True))
        else:
            print(f"   ❌ Health check failed: {resp.status_code}")
            results.append(("Health", False))
    except Exception as e:
        print(f"   ❌ Health check error: {e}")
        results.append(("Health", False))
    
    # 2. System Info
    print("\n2. Testing System Info...")
    try:
        resp = requests.get(f"{BASE_URL}/api/system/info", timeout=3)
        if resp.status_code == 200:
            print("   ✅ System info available")
            data = resp.json()
            print(f"   Version: {data.get('version', 'Unknown')}")
            results.append(("System Info", True))
        else:
            print(f"   ❌ System info failed: {resp.status_code}")
            results.append(("System Info", False))
    except Exception as e:
        print(f"   ❌ System info error: {e}")
        results.append(("System Info", False))
    
    # 3. Login
    print("\n3. Testing Login...")
    token = None
    try:
        resp = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "martin@danglefeet.com", "password": "123"},
            timeout=3
        )
        if resp.status_code == 200:
            data = resp.json()
            token = data.get('token') or data.get('access_token')
            if token:
                print("   ✅ Login successful")
                print(f"   Token: {token[:30]}...")
                results.append(("Login", True))
            else:
                print("   ❌ Login: No token received")
                results.append(("Login", False))
        else:
            print(f"   ❌ Login failed: {resp.status_code}")
            results.append(("Login", False))
    except Exception as e:
        print(f"   ❌ Login error: {e}")
        results.append(("Login", False))
    
    # 4. Test Auth Headers
    if token:
        print("\n4. Testing Auth Headers...")
        try:
            resp = requests.get(
                f"{BASE_URL}/api/test/headers",
                headers={"Authorization": f"Bearer {token}"},
                timeout=3
            )
            if resp.status_code == 200:
                data = resp.json()
                headers = data.get('headers', {})
                if 'authorization' in str(headers).lower():
                    print("   ✅ Auth headers working")
                    results.append(("Auth Headers", True))
                else:
                    print("   ❌ Auth header not found in response")
                    results.append(("Auth Headers", False))
            else:
                print(f"   ❌ Headers test failed: {resp.status_code}")
                results.append(("Auth Headers", False))
        except Exception as e:
            print(f"   ❌ Headers test error: {e}")
            results.append(("Auth Headers", False))
    
    # 5. Sessions (requires auth)
    if token:
        print("\n5. Testing Sessions...")
        try:
            resp = requests.get(
                f"{BASE_URL}/api/sessions",
                headers={"Authorization": f"Bearer {token}"},
                timeout=3
            )
            if resp.status_code == 200:
                print("   ✅ Sessions endpoint working")
                results.append(("Sessions", True))
            else:
                print(f"   ❌ Sessions failed: {resp.status_code}")
                results.append(("Sessions", False))
        except Exception as e:
            print(f"   ❌ Sessions error: {e}")
            results.append(("Sessions", False))
    
    # 6. Admin Users (requires admin auth)
    if token:
        print("\n6. Testing Admin Users...")
        try:
            resp = requests.get(
                f"{BASE_URL}/api/admin/users",
                headers={"Authorization": f"Bearer {token}"},
                timeout=3
            )
            if resp.status_code == 200:
                print("   ✅ Admin users endpoint working")
                data = resp.json()
                print(f"   Found {len(data.get('users', []))} users")
                results.append(("Admin Users", True))
            elif resp.status_code == 403:
                print("   ⚠️  Admin users: Access denied (expected if not admin)")
                results.append(("Admin Users", "Auth"))
            else:
                print(f"   ❌ Admin users failed: {resp.status_code}")
                print(f"   Response: {resp.text[:100]}")
                results.append(("Admin Users", False))
        except Exception as e:
            print(f"   ❌ Admin users error: {e}")
            results.append(("Admin Users", False))
    
    # 7. MOTD (public)
    print("\n7. Testing MOTD...")
    try:
        resp = requests.get(f"{BASE_URL}/api/motd", timeout=3)
        if resp.status_code == 200:
            print("   ✅ MOTD endpoint working")
            results.append(("MOTD", True))
        else:
            print(f"   ❌ MOTD failed: {resp.status_code}")
            results.append(("MOTD", False))
    except Exception as e:
        print(f"   ❌ MOTD error: {e}")
        results.append(("MOTD", False))
    
    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for _, r in results if r is True)
    total = len(results)
    
    for name, result in results:
        if result is True:
            print(f"✅ {name}")
        elif result == "Auth":
            print(f"⚠️  {name} (Auth required)")
        else:
            print(f"❌ {name}")
    
    print(f"\nPassed: {passed}/{total} ({passed/total*100:.0f}%)")
    
    # Quick diagnosis
    print("\n" + "=" * 60)
    print("DIAGNOSIS")
    print("=" * 60)
    
    if not any(r for _, r in results[:2]):
        print("❌ Server appears to be down or not responding")
    elif results[2][1] is False:  # Login failed
        print("❌ Authentication system has issues")
    elif token and results[5][1] is False:  # Admin failed
        print("⚠️  Authentication works but admin endpoints have issues")
        print("   This might be a database or permission problem")
    else:
        print("✅ Core functionality appears to be working")

if __name__ == "__main__":
    test_core_endpoints()