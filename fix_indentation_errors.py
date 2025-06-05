#!/usr/bin/env python3
"""Fix indentation errors in all endpoint files"""

import re

def fix_indentation_after_get_connection(content):
    """Fix indentation after conn = db_manager.get_connection() lines"""
    
    # Pattern: conn = db_manager.get_connection() followed by incorrectly indented lines
    lines = content.split('\n')
    fixed_lines = []
    i = 0
    
    while i < len(lines):
        line = lines[i]
        fixed_lines.append(line)
        
        # Check if this line is get_connection
        if 'conn = db_manager.get_connection()' in line and not line.strip().startswith('#'):
            # Get the indentation of this line
            indent = len(line) - len(line.lstrip())
            
            # Look ahead for incorrectly indented lines
            i += 1
            while i < len(lines):
                next_line = lines[i]
                
                # If it's an empty line, keep it
                if not next_line.strip():
                    fixed_lines.append(next_line)
                    i += 1
                    continue
                
                # Get indentation of next line
                next_indent = len(next_line) - len(next_line.lstrip())
                
                # If the next line has wrong indentation (should be same as conn line)
                if next_line.strip() and next_indent > indent + 4:
                    # Fix the indentation to match the conn line
                    fixed_line = ' ' * indent + next_line.strip()
                    fixed_lines.append(fixed_line)
                elif next_line.strip() and next_indent == indent + 4:
                    # This is correctly indented, remove extra indentation
                    fixed_line = ' ' * indent + next_line.strip()
                    fixed_lines.append(fixed_line)
                else:
                    fixed_lines.append(next_line)
                
                # Check if we've reached a line that should not be part of this block
                if next_line.strip().startswith('except') or \
                   next_line.strip().startswith('finally') or \
                   next_line.strip().startswith('return') or \
                   next_line.strip().startswith('def ') or \
                   next_line.strip().startswith('async def') or \
                   next_line.strip().startswith('@'):
                    break
                    
                i += 1
            continue
        
        i += 1
    
    return '\n'.join(fixed_lines)

def fix_get_feedback_entries(content):
    """Fix the specific issue in get_feedback_entries function"""
    # Fix pattern: with db_manager.get_session() followed by try:
    content = re.sub(
        r'(def get_feedback_entries.*?)\n(\s*)conn = db_manager\.get_connection\(\)\n\s*try:',
        r'\1\n\2conn = db_manager.get_connection()',
        content,
        flags=re.MULTILINE | re.DOTALL
    )
    return content

def fix_endpoint_file(filepath):
    """Fix indentation errors in endpoint file"""
    
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Fix indentation after get_connection
    content = fix_indentation_after_get_connection(content)
    
    # Fix specific patterns in feedback endpoints
    if 'feedback' in filepath:
        content = fix_get_feedback_entries(content)
    
    # Remove duplicate exception handlers
    content = re.sub(
        r'except Exception as e:\s*\n\s*logger\.error.*?\n\s*raise HTTPException.*?\n\s*except Exception as e:',
        r'except Exception as e:\n        logger.error(f"Error: {e}")\n        raise HTTPException(status_code=500, detail=str(e))',
        content,
        flags=re.MULTILINE | re.DOTALL
    )
    
    # Remove "No newline at end of file" markers
    content = re.sub(r'\s*No newline at end of file\s*', '', content)
    
    # Ensure file ends with newline
    if not content.endswith('\n'):
        content += '\n'
    
    with open(filepath, 'w') as f:
        f.write(content)
    
    print(f"Fixed {filepath}")

# Fix all endpoint files
files_to_fix = [
    'api/missing_endpoints.py',
    'api/admin_users_endpoints.py',
    'api/admin_feedback_endpoints.py',
    'api/admin_statistics_endpoints.py',
    'api/admin_dashboard_endpoints.py',
    'api/admin_system_endpoints.py'
]

for file in files_to_fix:
    try:
        fix_endpoint_file(file)
    except Exception as e:
        print(f"Error fixing {file}: {e}")