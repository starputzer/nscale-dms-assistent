#!/usr/bin/env python3
"""Fix all admin endpoints to use get_session correctly"""

import os
import re

def fix_file(filepath):
    """Fix a single file"""
    print(f"Fixing {filepath}...")
    
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Fix the broken pattern from sed
    content = re.sub(
        r'conn = db_manager\.get_session\(\) as conn:\s*pass\s*#\s*placeholder\s*with db_manager\.get_session\(\) as conn',
        'with db_manager.get_session() as conn:',
        content
    )
    
    # Fix the simpler broken pattern
    content = re.sub(
        r'conn = db_manager\.get_connection\(\)',
        'with db_manager.get_session() as conn:',
        content
    )
    
    # Fix lines that have db_manager.get_session() without 'with'
    content = re.sub(
        r'^(\s*)conn = db_manager\.get_session\(\) as conn:$',
        r'\1with db_manager.get_session() as conn:',
        content,
        flags=re.MULTILINE
    )
    
    # Write back
    with open(filepath, 'w') as f:
        f.write(content)
    
    print(f"Fixed {filepath}")

# Fix all admin endpoint files
files_to_fix = [
    'api/admin_statistics_endpoints.py',
    'api/admin_feedback_endpoints.py',
    'api/admin_dashboard_endpoints.py',
    'api/admin_dashboard_standard_endpoints.py',
    'api/admin_system_endpoints.py',
    'api/admin_system_comprehensive_endpoints.py',
    'api/advanced_documents_endpoints.py',
    'api/doc_converter_enhanced_endpoints.py'
]

for file in files_to_fix:
    if os.path.exists(file):
        fix_file(file)
    else:
        print(f"File not found: {file}")

print("All files fixed!")