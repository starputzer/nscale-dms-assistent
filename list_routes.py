#!/usr/bin/env python3
"""List all registered routes in the FastAPI application"""

import sys
import os

# Add the app directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from api.server import app
    
    print("=" * 80)
    print("REGISTERED ROUTES IN FASTAPI APPLICATION")
    print("=" * 80)
    
    routes = []
    for route in app.routes:
        if hasattr(route, 'path') and hasattr(route, 'methods'):
            routes.append({
                'path': route.path,
                'methods': list(route.methods) if route.methods else ['*'],
                'name': route.name if hasattr(route, 'name') else 'Unknown'
            })
    
    # Sort routes by path
    routes.sort(key=lambda x: x['path'])
    
    # Group by path prefix
    current_prefix = None
    for route in routes:
        path = route['path']
        prefix = path.split('/')[1] if len(path.split('/')) > 1 else ''
        
        if prefix != current_prefix:
            current_prefix = prefix
            print(f"\n[{prefix.upper() or 'ROOT'}]")
            print("-" * 40)
        
        methods_str = ', '.join(route['methods'])
        print(f"{methods_str:8} {path:50} {route['name']}")
    
    print("\n" + "=" * 80)
    print(f"Total routes: {len(routes)}")
    
    # Check specifically for admin-dashboard routes
    admin_dashboard_routes = [r for r in routes if 'admin-dashboard' in r['path']]
    print(f"\nAdmin Dashboard routes found: {len(admin_dashboard_routes)}")
    for route in admin_dashboard_routes:
        print(f"  - {route['methods'][0]} {route['path']}")
    
except Exception as e:
    print(f"Error loading application: {e}")
    import traceback
    traceback.print_exc()