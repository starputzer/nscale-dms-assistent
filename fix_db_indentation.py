#!/usr/bin/env python3
"""Fix indentation issues in database access code"""

import os
import re

def fix_file(filepath):
    """Fix indentation in a single file"""
    print(f"Fixing {filepath}...")
    
    with open(filepath, 'r') as f:
        lines = f.readlines()
    
    fixed_lines = []
    i = 0
    
    while i < len(lines):
        line = lines[i]
        
        # Check if this is a 'with db_manager.get_session()' line
        if 'with db_manager.get_session() as conn:' in line:
            indent = len(line) - len(line.lstrip())
            fixed_lines.append(line)
            
            # Process following lines
            i += 1
            while i < len(lines):
                next_line = lines[i]
                
                # Skip empty lines
                if next_line.strip() == '':
                    fixed_lines.append(next_line)
                    i += 1
                    continue
                
                # Check if we're out of the with block
                next_indent = len(next_line) - len(next_line.lstrip())
                if next_line.strip() and next_indent <= indent:
                    break
                
                # Fix cursor = conn.cursor() lines
                if 'cursor = conn.cursor()' in next_line:
                    fixed_lines.append(' ' * (indent + 4) + 'cursor = conn.cursor()\n')
                else:
                    # Ensure proper indentation for content inside with block
                    if next_line.strip() and not next_line.startswith(' ' * (indent + 4)):
                        # This line needs to be indented
                        fixed_lines.append(' ' * (indent + 4) + next_line.strip() + '\n')
                    else:
                        fixed_lines.append(next_line)
                
                i += 1
        else:
            fixed_lines.append(line)
            i += 1
    
    # Write back
    with open(filepath, 'w') as f:
        f.writelines(fixed_lines)
    
    print(f"Fixed {filepath}")

# Files to fix
files_to_fix = [
    'api/admin_statistics_endpoints.py',
    'api/admin_feedback_endpoints.py',
    'api/admin_dashboard_endpoints.py',
    'api/admin_system_endpoints.py',
    'api/admin_system_comprehensive_endpoints.py',
    'api/advanced_documents_endpoints.py',
    'api/doc_converter_enhanced_endpoints.py'
]

for file in files_to_fix:
    if os.path.exists(file):
        fix_file(file)

print("\nAll files fixed!")