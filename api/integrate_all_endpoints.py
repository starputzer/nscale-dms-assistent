#!/usr/bin/env python3
"""
Integrate all endpoint files into server.py
"""

import os
from pathlib import Path

def get_endpoint_files():
    """Get all endpoint files in the api directory"""
    api_dir = Path("/opt/nscale-assist/app/api")
    endpoint_files = []
    
    for file in api_dir.glob("*_endpoints.py"):
        # Skip test files and the script itself
        if "test" not in file.name and file.name != "integrate_all_endpoints.py":
            endpoint_files.append(file.stem)  # filename without .py
    
    return sorted(endpoint_files)

def generate_router_registration_code(endpoint_files):
    """Generate code to register all routers"""
    imports = []
    registrations = []
    
    # Group endpoints by category
    categories = {
        'admin': [],
        'doc': [],
        'rag': [],
        'system': [],
        'knowledge': [],
        'background': [],
        'other': []
    }
    
    for file in endpoint_files:
        if file.startswith('admin_'):
            categories['admin'].append(file)
        elif 'doc' in file or 'document' in file:
            categories['doc'].append(file)
        elif 'rag' in file:
            categories['rag'].append(file)
        elif 'system' in file or 'monitor' in file or 'performance' in file:
            categories['system'].append(file)
        elif 'knowledge' in file:
            categories['knowledge'].append(file)
        elif 'background' in file:
            categories['background'].append(file)
        else:
            categories['other'].append(file)
    
    # Generate imports
    imports.append("# Import all endpoint routers")
    for category, files in categories.items():
        if files:
            imports.append(f"\n# {category.upper()} endpoints")
            for file in files:
                imports.append(f"try:")
                imports.append(f"    from api.{file} import router as {file}_router")
                imports.append(f"    logger.info('Loaded {file} router')")
                imports.append(f"except Exception as e:")
                imports.append(f"    logger.error(f'Failed to load {file}: {{e}}')")
                imports.append(f"    {file}_router = None")
    
    # Generate registrations
    registrations.append("\n# Register all routers")
    for category, files in categories.items():
        if files:
            registrations.append(f"\n# Register {category.upper()} endpoints")
            for file in files:
                # Determine the prefix based on the endpoint type
                if file.startswith('admin_dashboard'):
                    prefix = "/api/admin-dashboard"
                elif file.startswith('admin_'):
                    prefix = "/api/admin"
                elif 'doc_converter' in file:
                    prefix = "/api/doc-converter"
                elif 'document' in file:
                    prefix = "/api/documents"
                elif 'rag' in file:
                    prefix = "/api/rag"
                elif 'knowledge' in file:
                    prefix = "/api/knowledge"
                elif 'background' in file or 'processing' in file:
                    prefix = "/api/background"
                elif 'system' in file or 'monitor' in file:
                    prefix = "/api/system"
                elif 'performance' in file:
                    prefix = "/api/performance"
                else:
                    prefix = "/api"
                
                registrations.append(f"if {file}_router:")
                registrations.append(f"    app.include_router({file}_router, prefix=\"{prefix}\", tags=[\"{category}\"])")
                registrations.append(f"    logger.info('Registered {file} at {prefix}')")
    
    return "\n".join(imports), "\n".join(registrations)

def main():
    """Generate integration code for all endpoints"""
    print("Analyzing endpoint files...")
    
    endpoint_files = get_endpoint_files()
    print(f"Found {len(endpoint_files)} endpoint files:")
    for file in endpoint_files:
        print(f"  - {file}")
    
    imports_code, registration_code = generate_router_registration_code(endpoint_files)
    
    print("\n" + "="*60)
    print("Add the following imports to server.py after the existing imports:")
    print("="*60)
    print(imports_code)
    
    print("\n" + "="*60)
    print("Add the following registrations before app.add_middleware():")
    print("="*60)
    print(registration_code)
    
    # Save to a file for easy copying
    output_file = "/opt/nscale-assist/app/api/endpoint_integration_code.txt"
    with open(output_file, 'w') as f:
        f.write("# IMPORTS TO ADD TO SERVER.PY\n")
        f.write("# Add these after the existing imports\n\n")
        f.write(imports_code)
        f.write("\n\n# ROUTER REGISTRATIONS TO ADD TO SERVER.PY\n")
        f.write("# Add these before app.add_middleware()\n\n")
        f.write(registration_code)
    
    print(f"\n✓ Integration code saved to: {output_file}")

if __name__ == "__main__":
    main()