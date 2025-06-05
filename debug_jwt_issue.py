#!/usr/bin/env python3
"""Debug JWT token validation issue"""

import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from modules.core.auth_manager import AuthManager
from modules.auth.user_model import UserManager
import jwt

def debug_jwt():
    print("=" * 80)
    print("JWT TOKEN VALIDATION DEBUG")
    print("=" * 80)
    
    # Test token from the API response
    test_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo1LCJlbWFpbCI6Im1hcnRpbkBkYW5nbGVmZWV0LmNvbSIsInJvbGUiOiJhZG1pbiIsImV4cCI6MTc0OTExNjczOSwidG9rZW5FeHBpcnkiOjE3NDkxMTY3Mzl9.4z8lA5gO8XrKlSoLxL93j_k0ESKQJUxUJCnHcx2p0n0"
    
    print("\n1. Checking AuthManager configuration:")
    auth_manager = AuthManager()
    print(f"Secret Key: {auth_manager.secret_key[:20]}... (first 20 chars)")
    print(f"Algorithm: {auth_manager.algorithm}")
    
    print("\n2. Checking UserManager configuration:")
    user_manager = UserManager()
    print(f"JWT Secret: {user_manager.jwt_secret[:20]}... (first 20 chars)")
    print(f"JWT Algorithm: {user_manager.jwt_algorithm}")
    
    print("\n3. Comparing secrets:")
    if auth_manager.secret_key == user_manager.jwt_secret:
        print("✅ Secrets match!")
    else:
        print("❌ SECRETS DO NOT MATCH!")
        print(f"AuthManager uses: {auth_manager.secret_key}")
        print(f"UserManager uses: {user_manager.jwt_secret}")
    
    print("\n4. Testing token validation:")
    
    # Try with AuthManager
    print("\nUsing AuthManager:")
    try:
        result = auth_manager.verify_token(test_token)
        if result:
            print("✅ Token validated successfully")
            print(f"Payload: {result}")
        else:
            print("❌ Token validation returned None")
    except Exception as e:
        print(f"❌ Exception: {e}")
    
    # Try with UserManager secret
    print("\nUsing UserManager secret:")
    try:
        payload = jwt.decode(test_token, user_manager.jwt_secret, algorithms=[user_manager.jwt_algorithm])
        print("✅ Token validated successfully with UserManager secret")
        print(f"Payload: {payload}")
    except Exception as e:
        print(f"❌ Exception: {e}")
    
    # Try to validate a fresh token
    print("\n5. Creating and validating a fresh token:")
    
    # Create token with UserManager
    user_token = user_manager.create_access_token({
        "user_id": 5,
        "email": "martin@danglefeet.com",
        "role": "admin"
    })
    print(f"Created token: {user_token[:50]}...")
    
    # Try to validate with AuthManager
    print("\nValidating fresh token with AuthManager:")
    result = auth_manager.verify_token(user_token)
    if result:
        print("✅ Fresh token validated successfully")
    else:
        print("❌ Fresh token validation failed")
    
    print("\n6. Environment variables:")
    print(f"SECRET_KEY env: {os.getenv('SECRET_KEY', 'NOT SET')}")
    print(f"JWT_SECRET_KEY env: {os.getenv('JWT_SECRET_KEY', 'NOT SET')}")

if __name__ == "__main__":
    debug_jwt()