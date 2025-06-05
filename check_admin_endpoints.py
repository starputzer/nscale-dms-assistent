#!/usr/bin/env python3
"""Check which admin endpoints are actually registered"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from api.server import app
    
    print("=" * 80)
    print("ADMIN ENDPOINTS CHECK")
    print("=" * 80)
    
    # Get all routes
    routes = []
    for route in app.routes:
        if hasattr(route, 'path') and hasattr(route, 'methods'):
            path = route.path
            if 'admin' in path.lower():
                routes.append({
                    'path': path,
                    'methods': list(route.methods) if route.methods else ['*'],
                    'name': route.name if hasattr(route, 'name') else 'Unknown'
                })
    
    # Sort by path
    routes.sort(key=lambda x: x['path'])
    
    # Group by endpoint type
    admin_routes = [r for r in routes if '/admin/' in r['path']]
    admin_dashboard_routes = [r for r in routes if '/admin-dashboard' in r['path']]
    other_admin_routes = [r for r in routes if 'admin' in r['path'].lower() and r not in admin_routes and r not in admin_dashboard_routes]
    
    print("\nAdmin Routes (/admin/):")
    print("-" * 40)
    for route in admin_routes:
        print(f"{route['methods'][0]:8} {route['path']:50} {route['name']}")
    
    print(f"\nAdmin Dashboard Routes (/admin-dashboard):")
    print("-" * 40)
    for route in admin_dashboard_routes:
        print(f"{route['methods'][0]:8} {route['path']:50} {route['name']}")
    
    print(f"\nOther Admin Routes:")
    print("-" * 40)
    for route in other_admin_routes:
        print(f"{route['methods'][0]:8} {route['path']:50} {route['name']}")
    
    # Check for specific missing endpoints from the errors
    print("\n" + "=" * 80)
    print("CHECKING SPECIFIC ENDPOINTS FROM ERRORS:")
    print("=" * 80)
    
    error_paths = [
        '/api/admin-dashboard/summary',
        '/api/admin/users',
        '/api/admin/feedback/stats',
        '/api/knowledge-manager/stats',
        '/api/doc-converter-enhanced/statistics'
    ]
    
    for error_path in error_paths:
        found = False
        for route in app.routes:
            if hasattr(route, 'path') and route.path == error_path:
                found = True
                print(f"✅ FOUND: {error_path}")
                break
        if not found:
            print(f"❌ MISSING: {error_path}")
    
    # Check router imports
    print("\n" + "=" * 80)
    print("CHECKING ROUTER IMPORTS:")
    print("=" * 80)
    
    import importlib
    routers_to_check = [
        ('api.admin_dashboard_endpoints', 'admin_dashboard_router'),
        ('api.admin_users_endpoints', 'admin_users_router'),
        ('api.admin_feedback_endpoints', 'admin_feedback_router'),
        ('api.knowledge_manager_endpoints', 'knowledge_manager_router'),
        ('api.doc_converter_enhanced_endpoints', 'doc_converter_enhanced_router')
    ]
    
    for module_name, router_name in routers_to_check:
        try:
            module = importlib.import_module(module_name)
            if hasattr(module, 'router'):
                print(f"✅ {module_name} - router imported successfully")
            else:
                print(f"⚠️ {module_name} - module imported but no router found")
        except Exception as e:
            print(f"❌ {module_name} - import failed: {str(e)}")
    
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()