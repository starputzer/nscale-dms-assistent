#!/usr/bin/env python3
"""
Test Authentication Helper
Provides easy access to test credentials and tokens
"""

import os
import jwt
from datetime import datetime, timedelta
import requests
from typing import Optional, Dict

class TestAuthHelper:
    """Helper class for authentication in tests"""
    
    def __init__(self):
        # Default test credentials
        self.admin_email = os.getenv("TEST_USER_EMAIL", "martin@danglefeet.com")
        self.admin_password = os.getenv("TEST_USER_PASSWORD", "123")
        self.jwt_secret = os.getenv("JWT_SECRET_KEY", "your-secret-key-here-change-in-production")
        self.base_url = "http://localhost:8000"
        self._token = None
        
    def generate_test_token(self, user_id: int = 5, email: str = None, 
                           role: str = "admin", expires_in_hours: int = 24) -> str:
        """Generate a test JWT token"""
        if email is None:
            email = self.admin_email
            
        payload = {
            "user_id": user_id,
            "email": email,
            "role": role,
            "exp": datetime.utcnow() + timedelta(hours=expires_in_hours)
        }
        
        token = jwt.encode(payload, self.jwt_secret, algorithm="HS256")
        return token
    
    def login(self) -> Optional[str]:
        """Login and get real token from API"""
        try:
            response = requests.post(
                f"{self.base_url}/api/auth/login",
                json={"email": self.admin_email, "password": self.admin_password},
                timeout=5
            )
            
            if response.status_code == 200:
                data = response.json()
                self._token = data.get("token") or data.get("access_token")
                return self._token
            else:
                print(f"Login failed: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            print(f"Login error: {e}")
            return None
    
    def get_auth_headers(self, force_new_login: bool = False) -> Dict[str, str]:
        """Get authorization headers with valid token"""
        if not self._token or force_new_login:
            self._token = self.login()
            
        if self._token:
            return {"Authorization": f"Bearer {self._token}"}
        else:
            # Fallback to generated token
            test_token = self.generate_test_token()
            return {"Authorization": f"Bearer {test_token}"}
    
    def test_endpoint(self, method: str, path: str, data: Dict = None, 
                     use_auth: bool = True) -> requests.Response:
        """Test an endpoint with authentication"""
        url = f"{self.base_url}{path}"
        headers = self.get_auth_headers() if use_auth else {}
        
        if method.upper() == "GET":
            return requests.get(url, headers=headers, timeout=5)
        elif method.upper() == "POST":
            return requests.post(url, headers=headers, json=data, timeout=5)
        elif method.upper() == "PUT":
            return requests.put(url, headers=headers, json=data, timeout=5)
        elif method.upper() == "DELETE":
            return requests.delete(url, headers=headers, timeout=5)
        else:
            raise ValueError(f"Unsupported method: {method}")

# Global instance for easy access
auth_helper = TestAuthHelper()

if __name__ == "__main__":
    # Test the helper
    print("Testing Authentication Helper...")
    
    # Test login
    token = auth_helper.login()
    if token:
        print(f"✅ Login successful! Token: {token[:50]}...")
    else:
        print("❌ Login failed!")
    
    # Test an endpoint
    response = auth_helper.test_endpoint("GET", "/api/system/health", use_auth=False)
    print(f"\nHealth check: {response.status_code}")
    
    # Test admin endpoint
    response = auth_helper.test_endpoint("GET", "/api/admin/users/count")
    print(f"Admin users count: {response.status_code}")
    
    if response.status_code == 200:
        print(f"Response: {response.json()}")