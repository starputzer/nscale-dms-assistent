#!/usr/bin/env python3
"""
Test script to verify session deletion endpoint update
Tests that DELETE requests to /api/v1/chat/sessions/{id} work correctly
"""

import requests
import json
import sys

# Base URL
BASE_URL = "http://localhost:8000"

# Test credentials
TEST_EMAIL = "martin@danglefeet.com"
TEST_PASSWORD = "123"

def login():
    """Login and get authentication token"""
    login_data = {
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    }
    
    response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token")
    else:
        print(f"Login failed: {response.status_code}")
        print(f"Response: {response.text}")
        return None

def create_test_session(token):
    """Create a test session to delete"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    session_data = {
        "title": "Test Session for Deletion"
    }
    
    response = requests.post(
        f"{BASE_URL}/api/v1/chat/sessions",
        headers=headers,
        json=session_data
    )
    
    if response.status_code in [200, 201]:
        data = response.json()
        session_id = data.get("id") or data.get("session_id")
        print(f"✓ Created test session: {session_id}")
        return session_id
    else:
        print(f"Failed to create session: {response.status_code}")
        print(f"Response: {response.text}")
        return None

def test_delete_session(token, session_id):
    """Test deleting a session using the new endpoint"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Test the new unified endpoint
    delete_url = f"{BASE_URL}/api/v1/chat/sessions/{session_id}"
    print(f"\nTesting DELETE {delete_url}")
    
    response = requests.delete(delete_url, headers=headers)
    
    if response.status_code in [200, 204]:
        print(f"✓ Session deleted successfully (status: {response.status_code})")
        return True
    else:
        print(f"✗ Failed to delete session: {response.status_code}")
        print(f"Response: {response.text}")
        return False

def verify_session_deleted(token, session_id):
    """Verify the session was actually deleted"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Try to get the deleted session
    get_url = f"{BASE_URL}/api/v1/chat/sessions/{session_id}"
    response = requests.get(get_url, headers=headers)
    
    if response.status_code == 404:
        print(f"✓ Verified: Session {session_id} no longer exists")
        return True
    elif response.status_code == 200:
        print(f"✗ Error: Session {session_id} still exists after deletion")
        return False
    else:
        print(f"? Unexpected status when verifying deletion: {response.status_code}")
        return False

def main():
    print("Testing Session Deletion with New Unified Endpoint Structure")
    print("=" * 60)
    
    # Step 1: Login
    print("\n1. Logging in...")
    token = login()
    if not token:
        print("✗ Login failed, exiting")
        sys.exit(1)
    print("✓ Login successful")
    
    # Step 2: Create a test session
    print("\n2. Creating test session...")
    session_id = create_test_session(token)
    if not session_id:
        print("✗ Failed to create test session, exiting")
        sys.exit(1)
    
    # Step 3: Delete the session
    print("\n3. Deleting session...")
    if not test_delete_session(token, session_id):
        print("✗ Session deletion failed")
        sys.exit(1)
    
    # Step 4: Verify deletion
    print("\n4. Verifying deletion...")
    if verify_session_deleted(token, session_id):
        print("\n✓ All tests passed! Session deletion is working with the new endpoint structure.")
    else:
        print("\n✗ Verification failed")
        sys.exit(1)

if __name__ == "__main__":
    main()