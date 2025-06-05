#!/usr/bin/env python3
"""Final comprehensive fix for all syntax errors"""

import os
import re

def fix_file_completely(filepath):
    """Apply all necessary fixes to make file syntactically correct"""
    
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Fix 1: Remove all duplicate lines and clean up the file
    lines = content.split('\n')
    cleaned_lines = []
    prev_line = None
    
    for line in lines:
        # Skip duplicate lines
        if line.strip() == prev_line:
            continue
        # Skip "No newline at end of file" markers
        if "No newline at end of file" in line:
            continue
        cleaned_lines.append(line)
        if line.strip():  # Only track non-empty lines
            prev_line = line.strip()
    
    content = '\n'.join(cleaned_lines)
    
    # Fix 2: Fix specific pattern in missing_endpoints.py get_current_user
    if 'missing_endpoints.py' in filepath:
        content = re.sub(
            r'conn = db_manager\.get_connection\(\)\n\s*cursor = conn\.cursor\(\)\n\n\s*cursor\.row_factory',
            'conn = db_manager.get_connection()\n        cursor = conn.cursor()\n        cursor.row_factory',
            content
        )
        
        # Fix the duplicate return statements
        content = re.sub(
            r'if row:\s*\n\s*return \{\s*\n\s*return \{',
            'if row:\n            return {',
            content
        )
        
        # Fix the logout function
        content = re.sub(
            r'conn = db_manager\.get_connection\(\)\n\s*cursor = conn\.cursor\(\)\n\n\s*cursor\.row_factory',
            'conn = db_manager.get_connection()\n        cursor = conn.cursor()\n        cursor.row_factory',
            content
        )
    
    # Fix 3: Fix indentation in all functions that use db_manager.get_connection()
    def fix_db_connection_indents(match):
        func_def = match.group(1)
        func_body = match.group(2)
        
        # Fix indentation after conn = db_manager.get_connection()
        func_body = re.sub(
            r'(\n\s*)conn = db_manager\.get_connection\(\)\n\s*cursor = conn\.cursor\(\)',
            r'\1conn = db_manager.get_connection()\n\1cursor = conn.cursor()',
            func_body
        )
        
        # Fix any lines that are over-indented after cursor assignment
        lines = func_body.split('\n')
        fixed_lines = []
        base_indent = None
        
        for i, line in enumerate(lines):
            if 'conn = db_manager.get_connection()' in line:
                base_indent = len(line) - len(line.lstrip())
                fixed_lines.append(line)
            elif base_indent is not None and line.strip() and not line.strip().startswith('"""'):
                # Ensure proper indentation
                current_indent = len(line) - len(line.lstrip())
                if current_indent > base_indent + 4:
                    # Fix over-indented lines
                    fixed_lines.append(' ' * base_indent + line.strip())
                else:
                    fixed_lines.append(line)
            else:
                fixed_lines.append(line)
        
        return func_def + '\n'.join(fixed_lines)
    
    # Apply to all function definitions
    content = re.sub(
        r'((?:async )?def [^:]+:)(.*?)(?=\n(?:async )?def|\n@router|\nclass|$)',
        fix_db_connection_indents,
        content,
        flags=re.MULTILINE | re.DOTALL
    )
    
    # Fix 4: Remove duplicate return statements
    content = re.sub(
        r'return ([^}]+})\s*\n\s*return \1',
        r'return \1',
        content,
        flags=re.MULTILINE
    )
    
    # Fix 5: Remove duplicate exception handlers
    content = re.sub(
        r'except Exception as e:\s*\n\s*logger\.error.*?\n\s*raise HTTPException.*?\n\s*logger\.error.*?\n\s*raise HTTPException.*?',
        r'except Exception as e:\n        logger.error(f"Error: {e}")\n        raise HTTPException(status_code=500, detail=str(e))',
        content,
        flags=re.MULTILINE | re.DOTALL
    )
    
    # Fix 6: Fix specific admin_users issue
    if 'admin_users' in filepath:
        # Fix the indentation in get_users
        content = re.sub(
            r'if role:\s*\n\s*query \+= " AND role = \?"',
            r'if role:\n                query += " AND role = ?"',
            content
        )
        content = re.sub(
            r'if is_active is not None:\s*\n\s*query \+= " AND is_active = \?"',
            r'if is_active is not None:\n                query += " AND is_active = ?"',
            content
        )
        content = re.sub(
            r'if search:\s*\n\s*query \+= " AND \(email LIKE \? OR username LIKE \?\)"',
            r'if search:\n                query += " AND (email LIKE ? OR username LIKE ?)"',
            content
        )
        
        # Fix nested loops
        content = re.sub(
            r'for row in rows:\s*\n\s*# Get session count.*?\n\s*cursor\.execute',
            r'for row in rows:\n                # Get session count for user\n                cursor.execute',
            content,
            flags=re.MULTILINE
        )
    
    # Fix 7: Fix feedback endpoints specific issues
    if 'feedback' in filepath:
        # Fix the get_feedback_entries function
        content = re.sub(
            r'if filter_params:\s*\n\s*if filter_params\.date_from:',
            r'if filter_params:\n            if filter_params.date_from:',
            content
        )
        
        # Fix nested conditions
        content = re.sub(
            r'for row in rows:\s*\n\s*entries\.append\(FeedbackEntry\(',
            r'for row in rows:\n            entries.append(FeedbackEntry(',
            content
        )
        
        # Fix date loop
        content = re.sub(
            r'for i in range\(7\):\s*\n\s*date = now',
            r'for i in range(7):\n                date = now',
            content
        )
    
    # Fix 8: Fix statistics endpoints
    if 'statistics' in filepath:
        # Fix nested queries
        content = re.sub(
            r'cursor\.execute\("""(.*?)""", \((.*?)\)\)',
            lambda m: f'cursor.execute("""\n                {m.group(1).strip()}\n            """, ({m.group(2)}))',
            content,
            flags=re.MULTILINE | re.DOTALL
        )
    
    # Fix 9: Clean up any remaining issues
    # Remove extra blank lines
    content = re.sub(r'\n\n\n+', '\n\n', content)
    
    # Ensure proper newline at end
    if not content.endswith('\n'):
        content += '\n'
    
    with open(filepath, 'w') as f:
        f.write(content)
    
    print(f"Fixed {filepath}")

# Fix all files
files = [
    'api/missing_endpoints.py',
    'api/admin_users_endpoints.py',
    'api/admin_feedback_endpoints.py',
    'api/admin_statistics_endpoints.py',
    'api/admin_dashboard_endpoints.py',
    'api/admin_system_endpoints.py'
]

for file in files:
    try:
        fix_file_completely(file)
    except Exception as e:
        print(f"Error fixing {file}: {e}")