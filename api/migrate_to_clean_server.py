#!/usr/bin/env python3
"""
Migration script to safely transition from monolithic server.py to clean modular structure
"""

import os
import shutil
from datetime import datetime
from pathlib import Path

def migrate_to_clean_server():
    """Safely migrate to the clean server structure"""
    
    print("=" * 60)
    print("SERVER MIGRATION TO CLEAN ARCHITECTURE")
    print("=" * 60)
    
    # Paths
    api_dir = Path(__file__).parent
    old_server = api_dir / "server.py"
    new_server = api_dir / "server_clean.py"
    backup_dir = api_dir / "backups"
    
    # 1. Create backup directory
    backup_dir.mkdir(exist_ok=True)
    print(f"✓ Created backup directory: {backup_dir}")
    
    # 2. Backup current server.py
    if old_server.exists():
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = backup_dir / f"server_monolithic_{timestamp}.py"
        shutil.copy2(old_server, backup_path)
        print(f"✓ Backed up current server.py to: {backup_path}")
        
        # Also create a safety backup
        safety_backup = api_dir / "server.py.backup"
        shutil.copy2(old_server, safety_backup)
        print(f"✓ Created safety backup: {safety_backup}")
    
    # 3. Check if new server exists
    if not new_server.exists():
        print("✗ server_clean.py not found!")
        return False
    
    # 4. Create comparison report
    print("\nCOMPARISON:")
    print(f"Old server.py: {old_server.stat().st_size} bytes")
    print(f"New server_clean.py: {new_server.stat().st_size} bytes")
    print(f"Size reduction: {old_server.stat().st_size - new_server.stat().st_size} bytes")
    
    # 5. Ask for confirmation
    print("\n" + "="*60)
    print("MIGRATION PLAN:")
    print("1. Current server.py will be renamed to server_old.py")
    print("2. server_clean.py will be renamed to server.py")
    print("3. All endpoints will be loaded dynamically")
    print("4. You can revert anytime using server.py.backup")
    print("="*60)
    
    response = input("\nProceed with migration? (yes/no): ")
    if response.lower() != "yes":
        print("Migration cancelled.")
        return False
    
    # 6. Perform migration
    print("\nMIGRATING...")
    
    # Rename old server
    old_server_renamed = api_dir / "server_old.py"
    os.rename(old_server, old_server_renamed)
    print(f"✓ Renamed server.py to server_old.py")
    
    # Copy new server
    shutil.copy2(new_server, old_server)
    print(f"✓ Copied server_clean.py to server.py")
    
    # 7. Create rollback script
    rollback_script = api_dir / "rollback_server.sh"
    with open(rollback_script, 'w') as f:
        f.write("""#!/bin/bash
# Rollback to monolithic server
echo "Rolling back to monolithic server..."
cp server.py.backup server.py
echo "✓ Rollback complete!"
""")
    os.chmod(rollback_script, 0o755)
    print(f"✓ Created rollback script: {rollback_script}")
    
    print("\n" + "="*60)
    print("✅ MIGRATION COMPLETE!")
    print("="*60)
    print("\nNEXT STEPS:")
    print("1. Restart the server: python3 api/server.py")
    print("2. Test all endpoints using: test_all_endpoints_comprehensive.py")
    print("3. Monitor logs for any issues")
    print("\nTO ROLLBACK:")
    print("Run: ./api/rollback_server.sh")
    print("="*60)
    
    return True

def create_documentation():
    """Create documentation for the new structure"""
    doc_content = """# Clean Server Architecture

## Overview
The server has been refactored from a monolithic 3741-line file to a clean, modular architecture.

## Structure

### Core Server (`server.py`)
- Minimal FastAPI setup
- Core middleware and error handling
- Delegates endpoint loading to EndpointManager

### Endpoint Management (`api/core/`)
- `endpoint_registry.py`: Defines all available endpoints
- `endpoint_manager.py`: Handles dynamic loading and registration

### Benefits
1. **Modularity**: Each endpoint group in its own file
2. **Maintainability**: Easy to add/remove/modify endpoints
3. **Performance**: Only load what's needed
4. **Debugging**: Clear separation of concerns
5. **Testing**: Can test endpoint groups independently

## Endpoint Organization

### Admin Endpoints
- Dashboard: `/api/admin-dashboard/*`
- Users: `/api/admin/users/*`
- Feedback: `/api/admin/feedback/*`
- Statistics: `/api/admin-statistics/*`
- System: `/api/admin/system/*`

### Document Processing
- Converter: `/api/doc-converter/*`
- Advanced: `/api/advanced-documents/*`
- Upload: `/api/document-upload/*`

### RAG System
- Main: `/api/rag/*`
- Settings: `/api/rag-settings/*`
- Health: `/api/rag/health`

### Knowledge Management
- Base: `/api/knowledge/*`
- Manager: `/api/knowledge-manager/*`

### System Monitoring
- Monitor: `/api/system-monitor/*`
- Performance: `/api/performance/*`

### Background Processing
- Jobs: `/api/background-processing/*`

## Management API
New endpoints for managing the API itself:
- GET `/api/endpoints/status` - View all endpoint status
- POST `/api/endpoints/reload/{name}` - Reload specific endpoint
- PUT `/api/endpoints/enable/{name}` - Enable endpoint
- PUT `/api/endpoints/disable/{name}` - Disable endpoint

## Migration
- Old server backed up to `server_old.py` and `backups/`
- Rollback available via `rollback_server.sh`
"""
    
    doc_path = Path(__file__).parent.parent / "CLEAN_SERVER_ARCHITECTURE.md"
    with open(doc_path, 'w') as f:
        f.write(doc_content)
    print(f"\n✓ Created documentation: {doc_path}")

if __name__ == "__main__":
    success = migrate_to_clean_server()
    if success:
        create_documentation()