#!/usr/bin/env python3
"""Fix syntax errors from the previous fix"""

import re
import os

def fix_file(filepath):
    """Fix syntax errors in a file"""
    
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Fix the try/except pattern
    # Pattern: conn = db_manager.get_connection()\n        try:
    content = re.sub(
        r'conn = db_manager\.get_connection\(\)\n(\s+)try:',
        r'conn = db_manager.get_connection()',
        content
    )
    
    # Fix double try statements
    content = re.sub(
        r'try:\s*\n\s*try:\s*\n\s*conn = db_manager\.get_connection\(\)',
        r'try:\n        conn = db_manager.get_connection()',
        content
    )
    
    # Fix the finally/except order
    content = re.sub(
        r'(\s+)return ([^\n]+)\n(\s+)finally:\n(\s+)conn\.close\(\)\n(\s+)except',
        r'\1return \2\n\5except',
        content
    )
    
    # Add proper finally blocks at the end
    content = re.sub(
        r'except Exception as e:\n(\s+)logger\.error\(.*?\)\n(\s+)raise HTTPException\(.*?\)',
        r'except Exception as e:\n\1logger.error(f"Error: {e}")\n\2raise HTTPException(status_code=500, detail=str(e))\n    finally:\n        if conn:\n            conn.close()',
        content
    )
    
    with open(filepath, 'w') as f:
        f.write(content)
    
    print(f"Fixed {filepath}")

# Fix all files
files_to_fix = [
    'api/missing_endpoints.py',
    'api/admin_users_endpoints.py',
    'api/admin_feedback_endpoints.py',
    'api/admin_statistics_endpoints.py',
    'api/admin_dashboard_endpoints.py',
    'api/admin_system_endpoints.py'
]

for file in files_to_fix:
    if os.path.exists(file):
        fix_file(file)