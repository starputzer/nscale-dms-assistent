#!/usr/bin/env python3
"""Fix indentation in admin_users_endpoints.py"""

import re

with open('api/admin_users_endpoints.py', 'r') as f:
    content = f.read()

# Fix the pattern where cursor = conn.cursor() is not indented after with statement
pattern = r'(with db_manager\.get_session\(\) as conn:\n)(\s*)(cursor = conn\.cursor\(\))'
replacement = r'\1\2    \3'

fixed_content = re.sub(pattern, replacement, content)

# Also fix lines after cursor = conn.cursor() that should be indented
lines = fixed_content.split('\n')
fixed_lines = []
in_with_block = False
indent_level = 0

for i, line in enumerate(lines):
    if 'with db_manager.get_session() as conn:' in line:
        in_with_block = True
        # Get the current indentation
        indent_level = len(line) - len(line.lstrip())
        fixed_lines.append(line)
    elif in_with_block and line.strip() and not line[indent_level:].startswith('    '):
        # This line should be indented more
        if 'except' in line or 'return' in line and line.strip().startswith('return'):
            in_with_block = False
            fixed_lines.append(line)
        else:
            fixed_lines.append(' ' * (indent_level + 4) + line.strip())
    else:
        if 'except' in line or ('return' in line and i > 0 and 'cursor' in lines[i-1]):
            in_with_block = False
        fixed_lines.append(line)

fixed_content = '\n'.join(fixed_lines)

with open('api/admin_users_endpoints.py', 'w') as f:
    f.write(fixed_content)

print("Fixed indentation in admin_users_endpoints.py")