#!/usr/bin/env python3
"""
Test script for the Model Health Check System

This script tests the new model health endpoints to ensure they're working correctly.
"""

import asyncio
import httpx
import json
from datetime import datetime
import sys

# Test configuration
BASE_URL = "http://localhost:8000"
TEST_TOKEN = None  # Will be populated after login

async def login():
    """Login and get authentication token"""
    global TEST_TOKEN
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "martin@danglefeet.com",
                "password": "123"
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            TEST_TOKEN = data.get("token")
            print(f"✅ Login successful - Token: {TEST_TOKEN[:20]}...")
            return True
        else:
            print(f"❌ Login failed: {response.status_code} - {response.text}")
            return False

async def test_all_models_health():
    """Test GET /api/health/models endpoint"""
    print("\n🔍 Testing GET /api/health/models")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(
            f"{BASE_URL}/api/health/models",
            headers={"Authorization": f"Bearer {TEST_TOKEN}"}
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Model health check successful")
            print(f"   Overall Status: {data.get('overall_status')}")
            print(f"   Check Duration: {data.get('check_duration_ms')}ms")
            
            # Print model statuses
            models = data.get("models", {})
            for model_id, info in models.items():
                status = info.get("status")
                loaded = info.get("loaded", False)
                print(f"   - {model_id}: {status} (Loaded: {loaded})")
            
            # Print issues if any
            issues = data.get("issues", [])
            if issues:
                print("\n   Issues:")
                for issue in issues:
                    print(f"   ⚠️  {issue}")
            
            # Print recommendations
            recommendations = data.get("recommendations", [])
            if recommendations:
                print("\n   Recommendations:")
                for rec in recommendations:
                    print(f"   💡 {rec}")
            
            return True
        else:
            print(f"❌ Failed: {response.status_code} - {response.text}")
            return False

async def test_specific_model(model_id):
    """Test GET /api/health/models/{model_id} endpoint"""
    print(f"\n🔍 Testing GET /api/health/models/{model_id}")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(
            f"{BASE_URL}/api/health/models/{model_id}",
            headers={"Authorization": f"Bearer {TEST_TOKEN}"}
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Model {model_id} health check successful")
            print(f"   Status: {data.get('status')}")
            print(f"   Loaded: {data.get('loaded', False)}")
            print(f"   Device: {data.get('device', 'N/A')}")
            
            if data.get("memory_usage_mb"):
                print(f"   Memory Usage: {data.get('memory_usage_mb'):.2f} MB")
            
            if data.get("response_time_ms"):
                print(f"   Response Time: {data.get('response_time_ms')} ms")
            
            if data.get("model_info"):
                print(f"   Model Info: {json.dumps(data.get('model_info'), indent=6)}")
            
            return True
        else:
            print(f"❌ Failed: {response.status_code} - {response.text}")
            return False

async def test_model_with_custom_data():
    """Test POST /api/health/models/test endpoint"""
    print("\n🔍 Testing POST /api/health/models/test")
    
    # Test embedding model
    test_data = {
        "model_id": "embedding_primary",
        "test_data": {
            "texts": [
                "Dies ist ein Test für das Embedding-Modell",
                "Zweiter Testsatz für die Embeddings",
                "nscale ist ein Enterprise Content Management System"
            ]
        }
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{BASE_URL}/api/health/models/test",
            json=test_data,
            headers={"Authorization": f"Bearer {TEST_TOKEN}"}
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Model test successful")
            print(f"   Model: {data.get('model_id')}")
            print(f"   Status: {data.get('status')}")
            print(f"   Duration: {data.get('test_duration_ms')} ms")
            
            if data.get("avg_time_per_text_ms"):
                print(f"   Avg Time per Text: {data.get('avg_time_per_text_ms'):.2f} ms")
            
            if data.get("output_shape"):
                print(f"   Output Shape: {data.get('output_shape')}")
            
            return True
        else:
            print(f"❌ Failed: {response.status_code} - {response.text}")
            return False

async def test_system_health():
    """Test GET /api/health/system endpoint"""
    print("\n🔍 Testing GET /api/health/system")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(
            f"{BASE_URL}/api/health/system",
            headers={"Authorization": f"Bearer {TEST_TOKEN}"}
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ System health check successful")
            print(f"   Overall Status: {data.get('status')}")
            
            # Print service statuses
            services = data.get("services", {})
            print("\n   Services:")
            for service, status in services.items():
                print(f"   - {service}: {status}")
            
            # Print model summary
            models_summary = data.get("models_summary", {})
            if models_summary:
                print(f"\n   Models Summary:")
                print(f"   - Overall: {models_summary.get('overall_status')}")
                print(f"   - Healthy: {models_summary.get('healthy_models')}")
                print(f"   - Warning: {models_summary.get('warning_models')}")
                print(f"   - Error: {models_summary.get('error_models')}")
            
            # Print GPU info if available
            ai_system = data.get("ai_system", {})
            if ai_system.get("gpu_available"):
                gpu_info = ai_system.get("gpu_info", {})
                print(f"\n   GPU Info:")
                print(f"   - Name: {gpu_info.get('name', 'N/A')}")
                print(f"   - Memory: {gpu_info.get('total_memory_gb', 0):.2f} GB")
                print(f"   - Used: {gpu_info.get('utilization_percent', 0):.1f}%")
            
            return True
        else:
            print(f"❌ Failed: {response.status_code} - {response.text}")
            return False

async def main():
    """Run all tests"""
    print("=" * 60)
    print("Model Health Check System Test")
    print(f"Time: {datetime.now()}")
    print(f"Target: {BASE_URL}")
    print("=" * 60)
    
    # Login first
    if not await login():
        print("\n❌ Cannot proceed without authentication")
        return
    
    # Run tests
    tests_passed = 0
    total_tests = 0
    
    # Test 1: All models health
    total_tests += 1
    if await test_all_models_health():
        tests_passed += 1
    
    # Test 2: Specific model health
    for model_id in ["embedding_primary", "reranker", "llm"]:
        total_tests += 1
        if await test_specific_model(model_id):
            tests_passed += 1
    
    # Test 3: Test model with custom data
    total_tests += 1
    if await test_model_with_custom_data():
        tests_passed += 1
    
    # Test 4: System health
    total_tests += 1
    if await test_system_health():
        tests_passed += 1
    
    # Summary
    print("\n" + "=" * 60)
    print(f"Test Summary: {tests_passed}/{total_tests} tests passed")
    if tests_passed == total_tests:
        print("✅ All tests passed!")
    else:
        print(f"❌ {total_tests - tests_passed} tests failed")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())