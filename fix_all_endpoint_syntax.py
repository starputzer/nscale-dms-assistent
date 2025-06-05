#!/usr/bin/env python3
"""Fix all syntax errors in endpoint files"""

import re
import os

def fix_endpoint_file(filepath):
    """Fix common syntax errors in endpoint files"""
    
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Fix 1: Remove finally blocks that come after except blocks
    content = re.sub(
        r'except Exception as e:\s*\n\s*logger\.error\(.*?\)\s*\n\s*.*?\s*\n\s*finally:\s*\n\s*conn\.close\(\)',
        r'except Exception as e:\n        logger.error(f"Error: {e}")\n        raise HTTPException(status_code=500, detail=str(e))',
        content,
        flags=re.MULTILINE | re.DOTALL
    )
    
    # Fix 2: Remove standalone finally: conn.close() blocks
    content = re.sub(
        r'\n\s*finally:\s*\n\s*conn\.close\(\)',
        '',
        content,
        flags=re.MULTILINE
    )
    
    # Fix 3: Fix unmatched parentheses
    content = re.sub(r'conn\.close\(\)\)', 'conn.close()', content)
    
    # Fix 4: Remove if conn: checks in finally blocks
    content = re.sub(
        r'finally:\s*\n\s*if conn:\s*\n\s*conn\.close\(\)',
        '',
        content,
        flags=re.MULTILINE
    )
    
    # Fix 5: Fix improper try/finally/except ordering
    # Pattern: try block followed by finally, then except
    content = re.sub(
        r'(try:.*?)(\s*finally:.*?conn\.close\(\).*?)(\s*except Exception as e:.*?)',
        r'\1\3',
        content,
        flags=re.MULTILINE | re.DOTALL
    )
    
    # Fix 6: Remove duplicate exception handlers
    content = re.sub(
        r'except Exception as e:\s*\n\s*logger\.error.*?\n\s*raise HTTPException.*?\n\s*except Exception as e:',
        r'except Exception as e:',
        content,
        flags=re.MULTILINE | re.DOTALL
    )
    
    # Fix 7: Fix the specific pattern in admin_dashboard_endpoints
    # Pattern: finally:\n    conn.close()\nexcept Exception
    content = re.sub(
        r'finally:\s*\n\s*conn\.close\(\)\s*\nexcept Exception',
        'except Exception',
        content,
        flags=re.MULTILINE
    )
    
    # Fix 8: Remove any remaining finally blocks with conn.close() and parenthesis issues
    content = re.sub(
        r'finally:\s*\n\s*if conn:\s*\n\s*conn\.close\(\)\)',
        '',
        content,
        flags=re.MULTILINE
    )
    
    # Fix 9: Clean up empty try blocks
    content = re.sub(
        r'try:\s*\n\s*except',
        'try:\n        pass\n    except',
        content,
        flags=re.MULTILINE
    )
    
    # Fix 10: Ensure all functions that use conn but don't define it get conn = None
    def ensure_conn_defined(match):
        func_content = match.group(0)
        if 'conn' in func_content and 'conn = db_manager.get_connection()' not in func_content:
            # Check if it's used in finally block
            if 'finally:' in func_content and 'conn' in func_content:
                # Add conn = None at the start of the function
                return re.sub(
                    r'(async def [^:]+:\s*\n\s*"""[^"]*""")',
                    r'\1\n    conn = None',
                    func_content
                )
        return func_content
    
    # Apply to all async def blocks
    content = re.sub(
        r'async def [^}]+?(?=\n(?:async def|@router|class|$))',
        ensure_conn_defined,
        content,
        flags=re.MULTILINE | re.DOTALL
    )
    
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
    if os.path.exists(file):
        fix_endpoint_file(file)