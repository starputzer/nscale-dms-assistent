#!/usr/bin/env python3
"""
Fix all import issues in API endpoint files
"""

import os
import re

def fix_file(filepath):
    """Fix common import issues in a file"""
    with open(filepath, 'r') as f:
        content = f.read()
    
    original = content
    
    # Fix auth imports
    content = re.sub(
        r'from modules\.core\.auth_manager import.*',
        'from modules.core.auth_dependency import get_current_user, get_admin_user as require_admin',
        content
    )
    
    # Fix cache imports
    content = re.sub(
        r'from modules\.core\.cache import get_cache.*',
        'from modules.core.cache import cache_manager',
        content
    )
    
    # Fix auth_dependency imports if they use wrong names
    content = re.sub(
        r'from modules\.core\.auth_dependency import require_admin,',
        'from modules.core.auth_dependency import get_admin_user as require_admin,',
        content
    )
    
    # Fix standalone require_admin imports
    content = re.sub(
        r'from modules\.core\.auth_dependency import require_admin\n',
        'from modules.core.auth_dependency import get_admin_user as require_admin\n',
        content
    )
    
    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Fixed: {filepath}")
        return True
    return False

# Fix all endpoint files
api_dir = "/opt/nscale-assist/app/api"
fixed_count = 0

for filename in os.listdir(api_dir):
    if filename.endswith("_endpoints.py"):
        filepath = os.path.join(api_dir, filename)
        if fix_file(filepath):
            fixed_count += 1

print(f"\nFixed {fixed_count} files")