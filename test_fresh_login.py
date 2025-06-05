#!/usr/bin/env python3
"""Test a fresh login to see what secret key is being used"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from modules.auth.user_model import UserManager
from modules.core.config import Config
import logging

# Enable debug logging
logging.basicConfig(level=logging.DEBUG)

print("=" * 80)
print("FRESH LOGIN TEST")
print("=" * 80)

# Initialize UserManager
user_manager = UserManager()

print(f"\n1. Config check:")
print(f"   SECRET_KEY: {Config.SECRET_KEY[:20]}...")
print(f"   Full SECRET_KEY: {Config.SECRET_KEY}")

print(f"\n2. Attempting login:")
# Try to authenticate
token = user_manager.authenticate("martin@danglefeet.com", "123")

if token:
    print(f"   ✅ Login successful")
    print(f"   Token: {token[:50]}...")
    
    # Now verify the token we just created
    print(f"\n3. Verifying the token we just created:")
    result = user_manager.verify_token(token)
    if result:
        print(f"   ✅ Token verification successful")
        print(f"   Payload: {result}")
    else:
        print(f"   ❌ Token verification failed")
else:
    print(f"   ❌ Login failed")