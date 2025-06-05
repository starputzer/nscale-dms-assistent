#!/usr/bin/env python3
"""Try to find what key was used to create the token"""

from jose import jwt
import json
import base64

# The token from the web login
test_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo1LCJlbWFpbCI6Im1hcnRpbkBkYW5nbGVmZWV0LmNvbSIsInJvbGUiOiJhZG1pbiIsImV4cCI6MTc0OTExNzQ1MywidG9rZW5FeHBpcnkiOjE3NDkxMTc0NTN9.s9gx2e-_m1Ej2L61Rn1lE7q5HHKCsF_8H79vFwNc4PU"

print("=" * 80)
print("TOKEN ANALYSIS")
print("=" * 80)

# Decode the payload without verification
parts = test_token.split('.')
payload = base64.urlsafe_b64decode(parts[1] + '==')  # Add padding
payload_json = json.loads(payload)

print(f"\nToken payload (decoded without verification):")
print(json.dumps(payload_json, indent=2))

# Common keys to try
keys_to_try = [
    "your-secret-key-here-change-in-production",
    "generate-a-secure-random-key-in-production",
    "your-secret-key-here",
    "secret",
    "SECRET_KEY",
    "nscale-secret-key",
    "dev-secret-key",
    "test-secret-key",
    # Check if it might be using some other environment variable value
    "admin@example.com,support@example.com, martin@danglefeet.com",  # ADMIN_EMAILS
    "http://localhost:8000",  # VITE_API_URL
]

print(f"\n\nTrying different secret keys:")
for key in keys_to_try:
    try:
        payload = jwt.decode(test_token, key, algorithms=['HS256'])
        print(f"\n✅ SUCCESS with key: '{key}'")
        print(f"   Decoded payload: {payload}")
        break
    except:
        print(f"❌ Failed with key: '{key[:30]}...'" if len(key) > 30 else f"❌ Failed with key: '{key}'")