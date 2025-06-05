#!/usr/bin/env python3
"""Debug the auth dependency directly"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import asyncio
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

# Import the auth dependencies
from modules.core.auth_manager import AuthManager, require_admin, get_current_user

async def test_auth_dependency():
    print("=" * 80)
    print("AUTH DEPENDENCY DEBUG")
    print("=" * 80)
    
    # Create auth manager
    auth_manager = AuthManager()
    print(f"\n1. AuthManager config:")
    print(f"   Secret key: {auth_manager.secret_key[:20]}...")
    print(f"   Algorithm: {auth_manager.algorithm}")
    
    # Test token from our login
    test_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo1LCJlbWFpbCI6Im1hcnRpbkBkYW5nbGVmZWV0LmNvbSIsInJvbGUiOiJhZG1pbiIsImV4cCI6MTc0OTExNzQ1MywidG9rZW5FeHBpcnkiOjE3NDkxMTc0NTN9.s9gx2e-_m1Ej2L61Rn1lE7q5HHKCsF_8H79vFwNc4PU"
    
    print("\n2. Testing token verification directly:")
    payload = auth_manager.verify_token(test_token)
    if payload:
        print(f"   ✅ Token verified successfully")
        print(f"   Payload: {payload}")
    else:
        print(f"   ❌ Token verification failed")
    
    print("\n3. Testing get_current_user method:")
    user = auth_manager.get_current_user(test_token)
    if user:
        print(f"   ✅ User retrieved successfully")
        print(f"   User: {user}")
    else:
        print(f"   ❌ User retrieval failed")
    
    print("\n4. Simulating FastAPI dependency:")
    # Create mock credentials object
    class MockCredentials:
        def __init__(self, token):
            self.credentials = token
    
    mock_creds = MockCredentials(test_token)
    
    try:
        # Call the dependency function
        result = await get_current_user(mock_creds)
        print(f"   ✅ get_current_user dependency succeeded")
        print(f"   Result: {result}")
    except HTTPException as e:
        print(f"   ❌ get_current_user dependency failed")
        print(f"   Status: {e.status_code}")
        print(f"   Detail: {e.detail}")
    except Exception as e:
        print(f"   ❌ Unexpected error: {type(e).__name__}: {e}")
    
    print("\n5. Testing require_admin dependency:")
    try:
        result = await require_admin(mock_creds)
        print(f"   ✅ require_admin dependency succeeded")
        print(f"   Result: {result}")
    except HTTPException as e:
        print(f"   ❌ require_admin dependency failed")
        print(f"   Status: {e.status_code}")
        print(f"   Detail: {e.detail}")
    except Exception as e:
        print(f"   ❌ Unexpected error: {type(e).__name__}: {e}")
    
    print("\n6. Checking user database:")
    print(f"   Users in DB: {list(auth_manager.users_db.keys())}")
    for username, user_data in auth_manager.users_db.items():
        print(f"   - {username}: {user_data.get('email')} ({user_data.get('role')})")

if __name__ == "__main__":
    asyncio.run(test_auth_dependency())