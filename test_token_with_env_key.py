#!/usr/bin/env python3
"""Test token with .env secret key"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from jose import jwt

# The token from the web login
test_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo1LCJlbWFpbCI6Im1hcnRpbkBkYW5nbGVmZWV0LmNvbSIsInJvbGUiOiJhZG1pbiIsImV4cCI6MTc0OTExNzQ1MywidG9rZW5FeHBpcnkiOjE3NDkxMTc0NTN9.s9gx2e-_m1Ej2L61Rn1lE7q5HHKCsF_8H79vFwNc4PU"

print("=" * 80)
print("TOKEN DECODE WITH DIFFERENT KEYS")
print("=" * 80)

# Test with .env key
env_key = "your-secret-key-here-change-in-production"
print(f"\n1. Testing with .env key: {env_key[:20]}...")
try:
    payload = jwt.decode(test_token, env_key, algorithms=['HS256'])
    print(f"   ✅ Success! Payload: {payload}")
except Exception as e:
    print(f"   ❌ Failed: {e}")

# Test with default Config key
default_key = "generate-a-secure-random-key-in-production"
print(f"\n2. Testing with default Config key: {default_key[:20]}...")
try:
    payload = jwt.decode(test_token, default_key, algorithms=['HS256'])
    print(f"   ✅ Success! Payload: {payload}")
except Exception as e:
    print(f"   ❌ Failed: {e}")