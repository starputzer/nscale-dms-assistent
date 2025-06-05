#!/usr/bin/env python3
"""Comprehensive endpoint functionality test"""

import requests
import json
import time
from typing import Dict, List, Tuple
from datetime import datetime

class EndpointTester:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.token = None
        self.results = []
        
    def login(self) -> bool:
        """Login and get token"""
        try:
            response = requests.post(
                f"{self.base_url}/api/auth/login",
                json={"email": "martin@danglefeet.com", "password": "123"},
                timeout=5
            )
            if response.status_code == 200:
                data = response.json()
                self.token = data.get('token') or data.get('access_token')
                return True
        except Exception as e:
            print(f"Login failed: {e}")
        return False
    
    def test_endpoint(self, method: str, path: str, data: Dict = None, 
                     auth_required: bool = True, expected_status: List[int] = [200]) -> Tuple[bool, str]:
        """Test a single endpoint"""
        url = f"{self.base_url}{path}"
        headers = {}
        
        if auth_required and self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        if data and method in ['POST', 'PUT', 'PATCH']:
            headers['Content-Type'] = 'application/json'
            
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=5)
            elif method == 'POST':
                response = requests.post(url, headers=headers, json=data, timeout=5)
            elif method == 'PUT':
                response = requests.put(url, headers=headers, json=data, timeout=5)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=5)
            elif method == 'PATCH':
                response = requests.patch(url, headers=headers, json=data, timeout=5)
            else:
                return False, f"Unknown method: {method}"
                
            success = response.status_code in expected_status
            message = f"Status: {response.status_code}"
            
            if not success:
                try:
                    error_detail = response.json()
                    message += f" - {error_detail}"
                except:
                    message += f" - {response.text[:100]}"
                    
            return success, message
            
        except requests.exceptions.Timeout:
            return False, "Timeout"
        except requests.exceptions.ConnectionError:
            return False, "Connection error"
        except Exception as e:
            return False, str(e)
    
    def run_all_tests(self):
        """Run all endpoint tests"""
        print("=" * 80)
        print("ENDPOINT FUNCTIONALITY TEST")
        print("=" * 80)
        print(f"Testing server at: {self.base_url}")
        print(f"Time: {datetime.now()}")
        print("=" * 80)
        
        # First, try to login
        print("\n🔐 AUTHENTICATION")
        if self.login():
            print(f"✅ Login successful - Token: {self.token[:30]}...")
        else:
            print("❌ Login failed - continuing with public endpoints only")
        
        # Define all endpoints to test
        endpoints = [
            # Auth endpoints
            ("POST", "/api/auth/login", {"email": "test@example.com", "password": "123"}, False, [200, 401]),
            ("POST", "/api/auth/register", {"email": "new@example.com", "password": "123"}, False, [200, 400]),
            ("GET", "/api/auth/user", None, True, [200, 401]),
            ("POST", "/api/auth/logout", None, True, [200, 401]),
            
            # System endpoints
            ("GET", "/api/system/info", None, False, [200]),
            ("GET", "/api/system/health", None, False, [200]),
            ("GET", "/api/system/check", None, False, [200]),
            
            # Session endpoints
            ("GET", "/api/sessions", None, True, [200, 401]),
            ("POST", "/api/sessions", {"title": "Test Session"}, True, [200, 201, 401]),
            ("GET", "/api/sessions/1", None, True, [200, 404, 401]),
            
            # Admin endpoints
            ("GET", "/api/admin/users", None, True, [200, 403, 401]),
            ("GET", "/api/admin/users/count", None, True, [200, 403, 401]),
            ("GET", "/api/admin/users/stats", None, True, [200, 403, 401]),
            ("GET", "/api/admin/users/active", None, True, [200, 403, 401]),
            
            # Admin Dashboard
            ("GET", "/api/admin/dashboard/summary", None, True, [200, 403, 401]),
            ("POST", "/api/admin/dashboard/queue/pause", None, True, [200, 403, 401]),
            ("POST", "/api/admin/dashboard/queue/resume", None, True, [200, 403, 401]),
            
            # Admin Statistics
            ("GET", "/api/admin/statistics/summary", None, True, [200, 403, 401]),
            ("GET", "/api/admin/statistics/usage-trend", None, True, [200, 403, 401]),
            ("GET", "/api/admin/statistics/user-segmentation", None, True, [200, 403, 401]),
            ("GET", "/api/admin/statistics/feedback-ratings", None, True, [200, 403, 401]),
            ("GET", "/api/admin/statistics/performance-metrics", None, True, [200, 403, 401]),
            
            # Admin Feedback
            ("GET", "/api/admin/feedback/stats", None, True, [200, 403, 401]),
            ("GET", "/api/admin/feedback/negative", None, True, [200, 403, 401]),
            ("POST", "/api/admin/feedback/filter", {"is_positive": True}, True, [200, 403, 401]),
            
            # Admin System
            ("GET", "/api/admin/system/stats", None, True, [200, 403, 401]),
            ("GET", "/api/admin/system/health", None, True, [200, 403, 401]),
            ("POST", "/api/admin/system/cache/clear", None, True, [200, 403, 401]),
            
            # Document Converter
            ("GET", "/api/doc-converter/statistics", None, True, [200, 403, 401]),
            ("GET", "/api/doc-converter/recent", None, True, [200, 403, 401]),
            ("GET", "/api/doc-converter/queue/status", None, True, [200, 403, 401]),
            
            # RAG endpoints
            ("GET", "/api/rag/status", None, True, [200, 401]),
            ("GET", "/api/rag/stats", None, True, [200, 401]),
            ("POST", "/api/rag/search", {"query": "test"}, True, [200, 401]),
            
            # Knowledge Manager
            ("GET", "/api/knowledge/documents", None, True, [200, 403, 401]),
            ("GET", "/api/knowledge/stats", None, True, [200, 403, 401]),
            ("POST", "/api/knowledge/reindex", None, True, [200, 403, 401]),
            
            # Background Processing
            ("GET", "/api/background-processing/jobs", None, True, [200, 403, 401]),
            ("GET", "/api/background-processing/stats", None, True, [200, 403, 401]),
            
            # Advanced Documents
            ("GET", "/api/advanced-documents/ocr-status", None, True, [200, 403, 401]),
            ("GET", "/api/advanced-documents/processing-stats", None, True, [200, 403, 401]),
            
            # Test endpoints
            ("GET", "/api/test/headers", None, True, [200]),
            ("GET", "/api/test/auth-test", None, True, [200]),
            
            # MOTD
            ("GET", "/api/motd", None, False, [200]),
            
            # Feedback
            ("POST", "/api/feedback", {
                "question": "Test question",
                "answer": "Test answer",
                "is_positive": True,
                "comment": "Test comment"
            }, True, [200, 201, 401]),
        ]
        
        # Group endpoints by category
        categories = {
            "Authentication": [],
            "System": [],
            "Sessions": [],
            "Admin Users": [],
            "Admin Dashboard": [],
            "Admin Statistics": [],
            "Admin Feedback": [],
            "Admin System": [],
            "Document Converter": [],
            "RAG System": [],
            "Knowledge Manager": [],
            "Background Processing": [],
            "Advanced Documents": [],
            "Miscellaneous": []
        }
        
        # Categorize endpoints
        for endpoint in endpoints:
            method, path = endpoint[0], endpoint[1]
            if "/auth/" in path:
                categories["Authentication"].append(endpoint)
            elif "/system/" in path:
                categories["System"].append(endpoint)
            elif "/sessions" in path:
                categories["Sessions"].append(endpoint)
            elif "/admin/users" in path:
                categories["Admin Users"].append(endpoint)
            elif "/admin/dashboard" in path:
                categories["Admin Dashboard"].append(endpoint)
            elif "/admin/statistics" in path:
                categories["Admin Statistics"].append(endpoint)
            elif "/admin/feedback" in path:
                categories["Admin Feedback"].append(endpoint)
            elif "/admin/system" in path:
                categories["Admin System"].append(endpoint)
            elif "/doc-converter" in path:
                categories["Document Converter"].append(endpoint)
            elif "/rag/" in path:
                categories["RAG System"].append(endpoint)
            elif "/knowledge/" in path:
                categories["Knowledge Manager"].append(endpoint)
            elif "/background-processing" in path:
                categories["Background Processing"].append(endpoint)
            elif "/advanced-documents" in path:
                categories["Advanced Documents"].append(endpoint)
            else:
                categories["Miscellaneous"].append(endpoint)
        
        # Test endpoints by category
        total_tests = 0
        total_passed = 0
        
        for category, category_endpoints in categories.items():
            if not category_endpoints:
                continue
                
            print(f"\n📁 {category.upper()}")
            print("-" * 60)
            
            for endpoint in category_endpoints:
                method, path, data, auth_required, expected_status = endpoint
                total_tests += 1
                
                success, message = self.test_endpoint(method, path, data, auth_required, expected_status)
                
                if success:
                    total_passed += 1
                    status_icon = "✅"
                else:
                    status_icon = "❌"
                
                print(f"{status_icon} {method:6} {path:50} {message}")
                
                # Store result
                self.results.append({
                    "category": category,
                    "method": method,
                    "path": path,
                    "success": success,
                    "message": message
                })
        
        # Summary
        print("\n" + "=" * 80)
        print("SUMMARY")
        print("=" * 80)
        print(f"Total endpoints tested: {total_tests}")
        print(f"Passed: {total_passed} ({total_passed/total_tests*100:.1f}%)")
        print(f"Failed: {total_tests - total_passed} ({(total_tests-total_passed)/total_tests*100:.1f}%)")
        
        # Category summary
        print("\nBy Category:")
        for category in categories:
            category_results = [r for r in self.results if r['category'] == category]
            if category_results:
                passed = sum(1 for r in category_results if r['success'])
                total = len(category_results)
                print(f"  {category}: {passed}/{total} passed ({passed/total*100:.1f}%)")
        
        # Failed endpoints
        failed = [r for r in self.results if not r['success']]
        if failed:
            print("\n❌ FAILED ENDPOINTS:")
            for r in failed:
                print(f"  {r['method']} {r['path']} - {r['message']}")
        
        return total_passed == total_tests

if __name__ == "__main__":
    tester = EndpointTester()
    success = tester.run_all_tests()
    
    # Save results to file
    with open('endpoint_test_results.json', 'w') as f:
        json.dump({
            'timestamp': datetime.now().isoformat(),
            'total_tests': len(tester.results),
            'passed': sum(1 for r in tester.results if r['success']),
            'results': tester.results
        }, f, indent=2)
    
    print(f"\nResults saved to endpoint_test_results.json")
    exit(0 if success else 1)