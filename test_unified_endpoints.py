#!/usr/bin/env python3
"""
Test script for unified endpoints
Tests authentication and all major endpoint groups
"""

import requests
import json
import time
from datetime import datetime
from typing import Dict, Any, Optional

# Configuration
BASE_URL = "http://localhost:8000/api/v1"
TEST_EMAIL = "martin@danglefeet.com"
TEST_PASSWORD = "123"

class UnifiedEndpointTester:
    def __init__(self):
        self.token: Optional[str] = None
        self.headers: Dict[str, str] = {
            "Content-Type": "application/json"
        }
        self.results = []
    
    def log_result(self, endpoint: str, method: str, status: int, success: bool, message: str = ""):
        """Log test result"""
        result = {
            "endpoint": endpoint,
            "method": method,
            "status": status,
            "success": success,
            "message": message,
            "timestamp": datetime.now().isoformat()
        }
        self.results.append(result)
        
        # Print result
        status_emoji = "✅" if success else "❌"
        print(f"{status_emoji} {method} {endpoint} - {status} {message}")
    
    def test_endpoint(self, method: str, endpoint: str, data: Optional[Dict] = None, 
                     expected_status: int = 200, requires_auth: bool = True) -> Dict[str, Any]:
        """Test a single endpoint"""
        url = f"{BASE_URL}{endpoint}"
        
        # Add auth header if required
        headers = self.headers.copy()
        if requires_auth and self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        
        try:
            # Make request
            if method == "GET":
                response = requests.get(url, headers=headers)
            elif method == "POST":
                response = requests.post(url, headers=headers, json=data)
            elif method == "PUT":
                response = requests.put(url, headers=headers, json=data)
            elif method == "DELETE":
                response = requests.delete(url, headers=headers)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            # Check status
            success = response.status_code == expected_status
            
            # Parse response
            try:
                response_data = response.json()
            except:
                response_data = {"text": response.text}
            
            self.log_result(
                endpoint=endpoint,
                method=method,
                status=response.status_code,
                success=success,
                message=response_data.get("message", "") or response_data.get("error", "")
            )
            
            return response_data
            
        except Exception as e:
            self.log_result(
                endpoint=endpoint,
                method=method,
                status=0,
                success=False,
                message=str(e)
            )
            return {"error": str(e)}
    
    def run_tests(self):
        """Run all endpoint tests"""
        print("\n🚀 Testing Unified Endpoints\n")
        
        # Test 1: Health check (no auth)
        print("1️⃣ Testing Public Endpoints...")
        self.test_endpoint("GET", "/health", requires_auth=False)
        self.test_endpoint("GET", "/version", requires_auth=False)
        
        # Test 2: Authentication
        print("\n2️⃣ Testing Authentication...")
        auth_response = self.test_endpoint(
            "POST", 
            "/auth/login",
            data={"email": TEST_EMAIL, "password": TEST_PASSWORD},
            requires_auth=False
        )
        
        if auth_response.get("success") and auth_response.get("token"):
            self.token = auth_response["token"]
            print(f"   🔑 Token obtained: {self.token[:20]}...")
        else:
            print("   ❌ Authentication failed! Cannot continue tests.")
            return
        
        # Test 3: Auth endpoints
        self.test_endpoint("GET", "/auth/me")
        
        # Test 4: Chat endpoints
        print("\n3️⃣ Testing Chat Endpoints...")
        self.test_endpoint(
            "POST",
            "/chat/message",
            data={"message": "Test message", "session_id": "test-session"}
        )
        self.test_endpoint("GET", "/chat/sessions")
        
        # Test 5: Document endpoints
        print("\n4️⃣ Testing Document Endpoints...")
        self.test_endpoint("GET", "/documents?page=1&limit=10")
        
        # Test 6: Admin endpoints
        print("\n5️⃣ Testing Admin Endpoints...")
        self.test_endpoint("GET", "/admin/dashboard")
        self.test_endpoint("GET", "/admin/users?page=1&limit=10")
        self.test_endpoint("GET", "/admin/system/info")
        self.test_endpoint("GET", "/admin/statistics")
        self.test_endpoint("GET", "/admin/feedback?page=1&limit=10")
        self.test_endpoint("GET", "/admin/rag/config")
        self.test_endpoint("GET", "/admin/knowledge")
        self.test_endpoint("GET", "/admin/tasks?page=1&limit=10")
        self.test_endpoint("GET", "/admin/monitor/health")
        self.test_endpoint("GET", "/admin/monitor/performance")
        
        # Test 7: Feature toggles
        print("\n6️⃣ Testing Feature Toggles...")
        self.test_endpoint("GET", "/features")
        
        # Test 8: Admin actions
        print("\n7️⃣ Testing Admin Actions...")
        self.test_endpoint("POST", "/admin/system/cache/clear")
        
        # Summary
        self.print_summary()
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*60)
        print("📊 TEST SUMMARY")
        print("="*60)
        
        total = len(self.results)
        successful = sum(1 for r in self.results if r["success"])
        failed = total - successful
        
        print(f"Total tests: {total}")
        print(f"✅ Successful: {successful}")
        print(f"❌ Failed: {failed}")
        print(f"Success rate: {(successful/total*100):.1f}%")
        
        if failed > 0:
            print("\n❌ Failed endpoints:")
            for result in self.results:
                if not result["success"]:
                    print(f"   - {result['method']} {result['endpoint']} ({result['status']}): {result['message']}")
        
        # Save results
        with open("unified_endpoint_test_results.json", "w") as f:
            json.dump(self.results, f, indent=2)
        print(f"\n💾 Results saved to unified_endpoint_test_results.json")

if __name__ == "__main__":
    tester = UnifiedEndpointTester()
    tester.run_tests()