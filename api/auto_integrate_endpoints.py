#!/usr/bin/env python3
"""
Automatically integrate all endpoints into server.py
"""

import re
from pathlib import Path

def update_server_py():
    """Update server.py to include all endpoint routers"""
    
    # Read current server.py
    server_path = Path("/opt/nscale-assist/app/api/server.py")
    with open(server_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check if already has endpoint imports to avoid duplicates
    if "admin_dashboard_endpoints" in content:
        print("❗ Server.py already has endpoint imports. Skipping to avoid duplicates.")
        return False
    
    # Find where to insert imports (after the last import)
    import_pattern = r'((?:from .+ import .+\n|import .+\n)+)'
    match = re.search(import_pattern, content)
    if not match:
        print("❌ Could not find import section in server.py")
        return False
    
    last_import_pos = match.end()
    
    # Prepare import code
    import_code = """
# Import all endpoint routers dynamically
logger.info("Loading endpoint routers...")

# ADMIN endpoints
endpoint_routers = []

# Admin Dashboard endpoints
try:
    from api.admin_dashboard_endpoints import router as admin_dashboard_router
    endpoint_routers.append(("admin_dashboard", admin_dashboard_router, "/api/admin-dashboard"))
except Exception as e:
    logger.error(f'Failed to load admin_dashboard_endpoints: {e}')

try:
    from api.admin_dashboard_standard_endpoints import router as admin_dashboard_standard_router
    endpoint_routers.append(("admin_dashboard_standard", admin_dashboard_standard_router, "/api/admin-dashboard"))
except Exception as e:
    logger.error(f'Failed to load admin_dashboard_standard_endpoints: {e}')

# Admin endpoints
try:
    from api.admin_feedback_endpoints import router as admin_feedback_router
    endpoint_routers.append(("admin_feedback", admin_feedback_router, "/api/admin/feedback"))
except Exception as e:
    logger.error(f'Failed to load admin_feedback_endpoints: {e}')

try:
    from api.admin_statistics_endpoints import router as admin_statistics_router
    endpoint_routers.append(("admin_statistics", admin_statistics_router, "/api/admin/statistics"))
except Exception as e:
    logger.error(f'Failed to load admin_statistics_endpoints: {e}')

try:
    from api.admin_system_endpoints import router as admin_system_router
    endpoint_routers.append(("admin_system", admin_system_router, "/api/admin/system"))
except Exception as e:
    logger.error(f'Failed to load admin_system_endpoints: {e}')

try:
    from api.admin_system_comprehensive_endpoints import router as admin_system_comprehensive_router
    endpoint_routers.append(("admin_system_comprehensive", admin_system_comprehensive_router, "/api/admin/system"))
except Exception as e:
    logger.error(f'Failed to load admin_system_comprehensive_endpoints: {e}')

try:
    from api.admin_users_endpoints import router as admin_users_router
    endpoint_routers.append(("admin_users", admin_users_router, "/api/admin/users"))
except Exception as e:
    logger.error(f'Failed to load admin_users_endpoints: {e}')

# Document endpoints
try:
    from api.doc_converter_endpoints import router as doc_converter_router
    endpoint_routers.append(("doc_converter", doc_converter_router, "/api/doc-converter"))
except Exception as e:
    logger.error(f'Failed to load doc_converter_endpoints: {e}')

try:
    from api.doc_converter_enhanced_endpoints import router as doc_converter_enhanced_router
    endpoint_routers.append(("doc_converter_enhanced", doc_converter_enhanced_router, "/api/doc-converter"))
except Exception as e:
    logger.error(f'Failed to load doc_converter_enhanced_endpoints: {e}')

try:
    from api.advanced_documents_endpoints import router as advanced_documents_router
    endpoint_routers.append(("advanced_documents", advanced_documents_router, "/api/documents/advanced"))
except Exception as e:
    logger.error(f'Failed to load advanced_documents_endpoints: {e}')

try:
    from api.document_upload_endpoints import router as document_upload_router
    endpoint_routers.append(("document_upload", document_upload_router, "/api/documents"))
except Exception as e:
    logger.error(f'Failed to load document_upload_endpoints: {e}')

# RAG endpoints
try:
    from api.rag_endpoints import router as rag_router
    endpoint_routers.append(("rag", rag_router, "/api/rag"))
except Exception as e:
    logger.error(f'Failed to load rag_endpoints: {e}')

try:
    from api.rag_settings_endpoints import router as rag_settings_router
    endpoint_routers.append(("rag_settings", rag_settings_router, "/api/rag/settings"))
except Exception as e:
    logger.error(f'Failed to load rag_settings_endpoints: {e}')

# Knowledge endpoints
try:
    from api.knowledge_manager_endpoints import router as knowledge_manager_router
    endpoint_routers.append(("knowledge_manager", knowledge_manager_router, "/api/knowledge"))
except Exception as e:
    logger.error(f'Failed to load knowledge_manager_endpoints: {e}')

# System monitoring endpoints
try:
    from api.system_monitor_endpoints import router as system_monitor_router
    endpoint_routers.append(("system_monitor", system_monitor_router, "/api/system/monitor"))
except Exception as e:
    logger.error(f'Failed to load system_monitor_endpoints: {e}')

try:
    from api.performance_monitor_endpoints import router as performance_monitor_router
    endpoint_routers.append(("performance_monitor", performance_monitor_router, "/api/performance"))
except Exception as e:
    logger.error(f'Failed to load performance_monitor_endpoints: {e}')

# Background processing endpoints
try:
    from api.background_processing_endpoints import router as background_processing_router
    endpoint_routers.append(("background_processing", background_processing_router, "/api/background"))
except Exception as e:
    logger.error(f'Failed to load background_processing_endpoints: {e}')

logger.info(f"Loaded {len(endpoint_routers)} endpoint routers")
"""
    
    # Find where to insert router registrations (before app.add_middleware)
    middleware_pattern = r'app\.add_middleware'
    middleware_match = re.search(middleware_pattern, content)
    if not middleware_match:
        print("❌ Could not find app.add_middleware in server.py")
        return False
    
    registration_pos = middleware_match.start()
    
    # Prepare registration code
    registration_code = """
# Register all loaded endpoint routers
logger.info("Registering endpoint routers...")
for name, router, prefix in endpoint_routers:
    try:
        app.include_router(router, prefix=prefix)
        logger.info(f'Registered {name} router at {prefix}')
    except Exception as e:
        logger.error(f'Failed to register {name} router: {e}')

logger.info("Endpoint router registration complete")

"""
    
    # Insert the code
    new_content = (
        content[:last_import_pos] + 
        "\n" + import_code + "\n" +
        content[last_import_pos:registration_pos] +
        registration_code +
        content[registration_pos:]
    )
    
    # Write back to server.py
    with open(server_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print("✅ Successfully updated server.py with all endpoint routers")
    return True

def main():
    """Main function"""
    print("Automatically integrating all endpoints into server.py...")
    
    if update_server_py():
        print("\n✅ Integration complete!")
        print("\nThe following endpoint groups have been added:")
        print("  - Admin Dashboard endpoints")
        print("  - Admin Management endpoints (users, feedback, statistics, system)")
        print("  - Document Processing endpoints")
        print("  - RAG System endpoints")
        print("  - Knowledge Management endpoints")
        print("  - System Monitoring endpoints")
        print("  - Background Processing endpoints")
        print("\nRestart the server to load all endpoints.")
    else:
        print("\n❌ Integration failed or was skipped.")

if __name__ == "__main__":
    main()