#!/usr/bin/env python3
"""Analyze all routes defined in server.py"""

import re
import ast

def extract_routes_from_file(filepath):
    """Extract route definitions from Python file"""
    routes = []
    
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Find all @router decorators
    router_pattern = r'@router\.(get|post|put|delete|patch)\("([^"]+)"[^)]*\)'
    matches = re.findall(router_pattern, content)
    
    for method, path in matches:
        routes.append((method.upper(), path))
    
    # Also find app.add_api_route calls
    api_route_pattern = r'app\.add_api_route\("([^"]+)",\s*[^,]+,\s*methods=\["([^"]+)"\]'
    matches = re.findall(api_route_pattern, content)
    
    for path, method in matches:
        routes.append((method.upper(), path))
    
    return routes

def analyze_server_routes():
    """Analyze all routes in the server"""
    print("=" * 80)
    print("SERVER ROUTE ANALYSIS")
    print("=" * 80)
    
    # Read server.py to find all included routers
    with open('api/server.py', 'r') as f:
        server_content = f.read()
    
    # Find all router includes
    router_includes = []
    include_pattern = r'app\.include_router\(([^,]+),\s*prefix="([^"]+)"'
    matches = re.findall(include_pattern, server_content)
    
    for router_name, prefix in matches:
        router_includes.append((router_name.strip(), prefix))
    
    print(f"\nFound {len(router_includes)} router includes:")
    for router, prefix in router_includes:
        print(f"  {router:40} -> {prefix}")
    
    # Analyze individual endpoint files
    endpoint_files = [
        'api/admin_users_endpoints.py',
        'api/admin_dashboard_endpoints.py',
        'api/admin_statistics_endpoints.py',
        'api/admin_feedback_endpoints.py',
        'api/admin_system_endpoints.py',
        'api/doc_converter_enhanced_endpoints.py',
        'api/rag_endpoints.py',
        'api/knowledge_manager_endpoints.py',
        'api/background_processing_endpoints.py',
        'api/advanced_documents_endpoints.py',
        'api/test_endpoints.py'
    ]
    
    all_routes = []
    
    for file in endpoint_files:
        try:
            routes = extract_routes_from_file(file)
            if routes:
                print(f"\n📁 {file}")
                print("-" * 60)
                for method, path in routes:
                    print(f"  {method:6} {path}")
                    all_routes.append((file, method, path))
        except FileNotFoundError:
            print(f"\n❌ File not found: {file}")
        except Exception as e:
            print(f"\n❌ Error analyzing {file}: {e}")
    
    # Summary
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print(f"Total routes found: {len(all_routes)}")
    
    # Group by HTTP method
    methods = {}
    for _, method, _ in all_routes:
        methods[method] = methods.get(method, 0) + 1
    
    print("\nBy HTTP Method:")
    for method, count in sorted(methods.items()):
        print(f"  {method}: {count}")
    
    # Find duplicate routes
    route_map = {}
    for file, method, path in all_routes:
        key = f"{method} {path}"
        if key not in route_map:
            route_map[key] = []
        route_map[key].append(file)
    
    duplicates = {k: v for k, v in route_map.items() if len(v) > 1}
    if duplicates:
        print("\n⚠️  DUPLICATE ROUTES FOUND:")
        for route, files in duplicates.items():
            print(f"  {route}")
            for file in files:
                print(f"    - {file}")
    
    return all_routes

def check_route_consistency():
    """Check if all routes have proper error handling"""
    print("\n" + "=" * 80)
    print("ROUTE CONSISTENCY CHECK")
    print("=" * 80)
    
    issues = []
    
    # Check common patterns
    files_to_check = [
        'api/admin_users_endpoints.py',
        'api/admin_dashboard_endpoints.py',
        'api/admin_statistics_endpoints.py',
        'api/admin_feedback_endpoints.py'
    ]
    
    for file in files_to_check:
        try:
            with open(file, 'r') as f:
                content = f.read()
            
            # Check for proper try-except blocks
            functions = re.findall(r'async def (\w+)\([^)]*\):', content)
            for func in functions:
                # Find the function body
                func_pattern = rf'async def {func}\([^)]*\):[^@]+?(?=async def|\Z)'
                func_match = re.search(func_pattern, content, re.DOTALL)
                
                if func_match:
                    func_body = func_match.group()
                    if 'try:' not in func_body:
                        issues.append(f"{file}: {func} - Missing try-except block")
                    if 'HTTPException' not in func_body:
                        issues.append(f"{file}: {func} - Missing HTTPException")
                        
        except Exception as e:
            print(f"Error checking {file}: {e}")
    
    if issues:
        print("\n⚠️  POTENTIAL ISSUES:")
        for issue in issues[:10]:  # Show first 10 issues
            print(f"  {issue}")
        if len(issues) > 10:
            print(f"  ... and {len(issues) - 10} more")
    else:
        print("\n✅ All routes appear to have proper error handling")

if __name__ == "__main__":
    routes = analyze_server_routes()
    check_route_consistency()
    
    # Save route analysis
    with open('server_routes_analysis.txt', 'w') as f:
        f.write("SERVER ROUTES ANALYSIS\n")
        f.write("=" * 80 + "\n")
        f.write(f"Generated at: {__import__('datetime').datetime.now()}\n")
        f.write("=" * 80 + "\n\n")
        
        for file, method, path in routes:
            f.write(f"{method:6} {path:50} ({file})\n")
    
    print("\n\nAnalysis saved to server_routes_analysis.txt")