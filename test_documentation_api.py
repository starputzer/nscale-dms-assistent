#!/usr/bin/env python3
"""
Test script for the Documentation API
"""

import requests
import json
import sys

# Configuration
BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api/docs"

# Test credentials
TEST_USER = "martin.schmidt@example.com"
TEST_PASSWORD = "123"

def get_auth_token():
    """Get authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_USER, "password": TEST_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("access_token")
    else:
        print(f"Login failed: {response.status_code} - {response.text}")
        return None

def test_list_documents(token):
    """Test listing documents"""
    print("\n=== Testing List Documents ===")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{API_BASE}/", headers=headers)
    
    if response.status_code == 200:
        docs = response.json()
        print(f"Found {len(docs)} documents")
        for doc in docs[:5]:  # Show first 5
            print(f"  - {doc['title']} ({doc['path']})")
    else:
        print(f"Failed: {response.status_code} - {response.text}")

def test_search_documents(token):
    """Test searching documents"""
    print("\n=== Testing Search Documents ===")
    headers = {"Authorization": f"Bearer {token}"}
    params = {"q": "migration", "limit": 5}
    response = requests.get(f"{API_BASE}/search", headers=headers, params=params)
    
    if response.status_code == 200:
        results = response.json()
        print(f"Found {len(results)} documents matching 'migration'")
        for doc in results:
            print(f"  - {doc['title']} ({doc['path']})")
    else:
        print(f"Failed: {response.status_code} - {response.text}")

def test_get_stats(token):
    """Test getting documentation stats"""
    print("\n=== Testing Documentation Stats ===")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{API_BASE}/stats", headers=headers)
    
    if response.status_code == 200:
        stats = response.json()
        print(f"Total documents: {stats['total_documents']}")
        print(f"Total size: {stats['total_size']} bytes")
        print(f"Categories: {json.dumps(stats['categories'], indent=2)}")
    else:
        print(f"Failed: {response.status_code} - {response.text}")

def test_health_check(token):
    """Test health check"""
    print("\n=== Testing Health Check ===")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{API_BASE}/health", headers=headers)
    
    if response.status_code == 200:
        health = response.json()
        print(f"Status: {health['status']}")
        if health['issues']:
            print(f"Issues found: {health['issues']}")
        else:
            print("No issues found")
    else:
        print(f"Failed: {response.status_code} - {response.text}")

def test_validate_document(token):
    """Test document validation"""
    print("\n=== Testing Document Validation ===")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test with valid markdown
    valid_content = """# Test Document

## Overview
This is a test document.

## Content
Some content here.

```python
def hello():
    print("Hello")
```
"""
    
    response = requests.post(
        f"{API_BASE}/validate",
        headers=headers,
        json={"content": valid_content, "filename": "test.md"}
    )
    
    if response.status_code == 200:
        result = response.json()
        print(f"Valid: {result['valid']}")
        if result['errors']:
            print(f"Errors: {result['errors']}")
        if result['warnings']:
            print(f"Warnings: {result['warnings']}")
        if result['suggestions']:
            print(f"Suggestions: {result['suggestions']}")
    else:
        print(f"Failed: {response.status_code} - {response.text}")

def test_get_specific_document(token):
    """Test getting a specific document"""
    print("\n=== Testing Get Specific Document ===")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Try to get the index document
    doc_path = "00_KONSOLIDIERTE_DOKUMENTATION/00_INDEX.md"
    response = requests.get(f"{API_BASE}/{doc_path}", headers=headers)
    
    if response.status_code == 200:
        print(f"Successfully retrieved document: {doc_path}")
        content = response.text[:200] + "..." if len(response.text) > 200 else response.text
        print(f"Content preview: {content}")
    else:
        print(f"Failed: {response.status_code} - {response.text}")

def test_document_graph(token):
    """Test getting document graph"""
    print("\n=== Testing Document Graph ===")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{API_BASE}/graph", headers=headers)
    
    if response.status_code == 200:
        graph = response.json()
        print(f"Nodes: {len(graph['nodes'])}")
        print(f"Edges: {len(graph['edges'])}")
        
        # Show first few nodes
        print("\nSample nodes:")
        for node in graph['nodes'][:3]:
            print(f"  - {node['label']} ({node['category']})")
    else:
        print(f"Failed: {response.status_code} - {response.text}")

def main():
    """Run all tests"""
    print("=== Documentation API Test Suite ===")
    
    # Get auth token
    token = get_auth_token()
    if not token:
        print("Failed to authenticate. Exiting.")
        sys.exit(1)
    
    print(f"Successfully authenticated with token: {token[:20]}...")
    
    # Run tests
    tests = [
        test_list_documents,
        test_search_documents,
        test_get_stats,
        test_health_check,
        test_validate_document,
        test_get_specific_document,
        test_document_graph
    ]
    
    for test in tests:
        try:
            test(token)
        except Exception as e:
            print(f"Test failed with error: {e}")
    
    print("\n=== Test Suite Complete ===")

if __name__ == "__main__":
    main()