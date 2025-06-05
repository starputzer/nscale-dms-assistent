#!/usr/bin/env python3
"""Debug token validation issue"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from modules.auth.user_model import UserManager
from modules.core.config import Config
from jose import jwt
import logging

# Enable debug logging
logging.basicConfig(level=logging.DEBUG)

# Test token from login
test_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo1LCJlbWFpbCI6Im1hcnRpbkBkYW5nbGVmZWV0LmNvbSIsInJvbGUiOiJhZG1pbiIsImV4cCI6MTc0OTExNzQ1MywidG9rZW5FeHBpcnkiOjE3NDkxMTc0NTN9.s9gx2e-_m1Ej2L61Rn1lE7q5HHKCsF_8H79vFwNc4PU"

print("=" * 80)
print("TOKEN VALIDATION DEBUG")
print("=" * 80)

# Initialize UserManager
user_manager = UserManager()

print(f"\n1. Testing with UserManager.verify_token:")
print(f"   Secret key: {Config.SECRET_KEY[:20]}...")
result = user_manager.verify_token(test_token)
print(f"   Result: {result}")

print(f"\n2. Direct JWT decode test:")
try:
    payload = jwt.decode(test_token, Config.SECRET_KEY, algorithms=['HS256'])
    print(f"   ✅ Direct decode successful: {payload}")
except Exception as e:
    print(f"   ❌ Direct decode failed: {e}")
    
print(f"\n3. Check if modules are using the same Config:")
print(f"   Config module id: {id(Config)}")
print(f"   Config.SECRET_KEY: {Config.SECRET_KEY[:20]}...")

# Test with default secret key
print(f"\n4. Test with default secret key:")
try:
    default_key = "generate-a-secure-random-key-in-production"
    payload = jwt.decode(test_token, default_key, algorithms=['HS256'])
    print(f"   ✅ Decode with default key successful: {payload}")
except Exception as e:
    print(f"   ❌ Decode with default key failed: {e}")