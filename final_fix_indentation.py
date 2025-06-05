#!/usr/bin/env python3
"""Final fix for indentation in admin endpoints"""

import re

def fix_admin_feedback():
    with open('api/admin_feedback_endpoints.py', 'r') as f:
        content = f.read()
    
    # Fix the specific function
    content = re.sub(
        r'(with db_manager\.get_session\(\) as conn:\n)\s*(cursor = conn\.cursor\(\))\n(\s+)\n(\s+# Build query)',
        r'\1        \2\n        \n        \4',
        content
    )
    
    # Fix all other occurrences
    lines = content.split('\n')
    fixed_lines = []
    in_with_block = False
    base_indent = 0
    
    for i, line in enumerate(lines):
        if 'with db_manager.get_session() as conn:' in line:
            in_with_block = True
            base_indent = len(line) - len(line.lstrip())
            fixed_lines.append(line)
        elif in_with_block and line.strip():
            # Check if we're still in the with block
            current_indent = len(line) - len(line.lstrip())
            if current_indent <= base_indent:
                in_with_block = False
                fixed_lines.append(line)
            elif 'cursor = conn.cursor()' in line:
                fixed_lines.append(' ' * (base_indent + 4) + 'cursor = conn.cursor()')
            else:
                # Ensure proper indentation
                if current_indent < base_indent + 4:
                    fixed_lines.append(' ' * (base_indent + 4) + line.strip())
                else:
                    fixed_lines.append(line)
        else:
            fixed_lines.append(line)
    
    with open('api/admin_feedback_endpoints.py', 'w') as f:
        f.write('\n'.join(fixed_lines))

def fix_admin_statistics():
    with open('api/admin_statistics_endpoints.py', 'r') as f:
        content = f.read()
    
    # Fix the specific line 101 issue
    content = re.sub(
        r'(with db_manager\.get_session\(\) as conn:\n)\s*(cursor = conn\.cursor\(\))',
        r'\1        \2',
        content
    )
    
    with open('api/admin_statistics_endpoints.py', 'w') as f:
        f.write(content)

def fix_admin_users():
    with open('api/admin_users_endpoints.py', 'r') as f:
        content = f.read()
    
    # Fix the indentation issue at line 100
    lines = content.split('\n')
    fixed_lines = []
    
    for i, line in enumerate(lines):
        if i == 96 and 'with db_manager.get_session() as conn:' in line:
            fixed_lines.append(line)
        elif i == 97 and 'cursor = conn.cursor()' in line:
            # Fix the extra indentation
            fixed_lines.append('            cursor = conn.cursor()')
        else:
            fixed_lines.append(line)
    
    with open('api/admin_users_endpoints.py', 'w') as f:
        f.write('\n'.join(fixed_lines))

# Run fixes
print("Fixing admin_feedback_endpoints.py...")
fix_admin_feedback()

print("Fixing admin_statistics_endpoints.py...")
fix_admin_statistics()

print("Fixing admin_users_endpoints.py...")
fix_admin_users()

print("\nAll fixes applied!")