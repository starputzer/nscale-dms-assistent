#!/usr/bin/env python3
"""List all registered admin routes"""

import requests

# Base URL
BASE_URL = "http://localhost:8000"

def list_routes():
    # Get OpenAPI spec which lists all routes
    print("Fetching API routes...")
    response = requests.get(f"{BASE_URL}/api/openapi.json")
    
    if response.status_code != 200:
        print(f"❌ Failed to get OpenAPI spec: {response.status_code}")
        return
    
    openapi = response.json()
    paths = openapi.get("paths", {})
    
    # Filter admin routes
    admin_routes = []
    for path, methods in paths.items():
        if "/admin" in path:
            for method in methods:
                admin_routes.append((method.upper(), path))
    
    # Sort and display
    admin_routes.sort(key=lambda x: (x[1], x[0]))
    
    print("\nAdmin routes found:")
    print("=" * 60)
    current_prefix = ""
    for method, path in admin_routes:
        prefix = path.split("/")[3] if len(path.split("/")) > 3 else ""
        if prefix != current_prefix:
            print(f"\n{prefix}:")
            current_prefix = prefix
        print(f"  {method:6} {path}")

if __name__ == "__main__":
    list_routes()