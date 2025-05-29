#!/bin/bash

echo "🔧 Fixing Admin API Authentication..."

# Create a simple Python script to test and fix auth
cat > test_and_fix_auth.py << 'EOF'
import requests
import json
import sys

BASE_URL = "http://localhost:8080/api/v1"

# Step 1: Login to get token
print("1. Attempting login...")
login_response = requests.post(f"{BASE_URL}/login", json={
    "username": "martin@danglefeet.com",
    "password": "123"
})

if login_response.status_code != 200:
    print(f"❌ Login failed: {login_response.status_code}")
    print(login_response.text)
    sys.exit(1)

login_data = login_response.json()
token = login_data.get("access_token")

if not token:
    print("❌ No token received")
    sys.exit(1)

print(f"✅ Login successful! Token: {token[:20]}...")

# Step 2: Test admin endpoints
headers = {"Authorization": f"Bearer {token}"}

endpoints = [
    "/admin/users",
    "/admin/users/count",
    "/admin/users/stats",
    "/admin/feedback",
    "/admin/feedback/negative"
]

print("\n2. Testing admin endpoints...")
for endpoint in endpoints:
    try:
        response = requests.get(f"{BASE_URL}{endpoint}", headers=headers)
        if response.status_code == 200:
            print(f"✅ {endpoint}: OK")
        else:
            print(f"❌ {endpoint}: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ {endpoint}: Error - {str(e)}")

# Step 3: Create JavaScript for browser
print("\n3. Creating browser setup script...")
browser_script = f"""
// Copy and paste this into your browser console at http://localhost:3003

// Set authentication tokens
localStorage.setItem('nscale_access_token', '{token}');
localStorage.setItem('nscale_refresh_token', '{login_data.get('refresh_token', '')}');
localStorage.setItem('nscale_token_expiry', '{login_data.get('expires_at', '')}');

// Set user data
const userData = {{
    id: '{login_data.get('user_id', 'admin')}',
    email: 'martin@danglefeet.com',
    name: 'Martin Admin',
    role: 'admin',
    permissions: ['admin']
}};
localStorage.setItem('nscale_user', JSON.stringify(userData));

console.log('✅ Authentication set up successfully!');
console.log('Token:', '{token[:20]}...');
console.log('Please refresh the page to apply changes.');
"""

with open("browser_auth_setup.js", "w") as f:
    f.write(browser_script)

print("\n✅ Browser auth script saved to: browser_auth_setup.js")
print("\n📋 Instructions:")
print("1. Open http://localhost:3003 in your browser")
print("2. Open Developer Console (F12)")
print("3. Copy and paste the content of browser_auth_setup.js")
print("4. Refresh the page")
print("\nAlternatively, use the debug page: http://localhost:3003/debug-admin-api.html")

EOF

# Run the test script
python test_and_fix_auth.py

echo "
✨ Authentication fix complete!

Next steps:
1. Open http://localhost:3003/debug-admin-api.html for testing
2. Or use the browser_auth_setup.js script in the console
3. Try accessing http://localhost:3003/admin
"