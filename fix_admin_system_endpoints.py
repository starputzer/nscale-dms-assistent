#!/usr/bin/env python3
"""Fix syntax errors in admin_system_endpoints.py"""

import re

def fix_admin_system_endpoints():
    with open('api/admin_system_endpoints.py', 'r') as f:
        content = f.read()
    
    # Fix unmatched parentheses
    content = re.sub(r'conn\.close\(\)\)', 'conn.close()', content)
    
    # Fix try/finally blocks that are in wrong order
    # Find pattern: finally:\n        conn.close()\n    except Exception as e:
    content = re.sub(
        r'finally:\s*\n\s*conn\.close\(\)\s*\n\s*except Exception as e:',
        'except Exception as e:',
        content,
        flags=re.MULTILINE
    )
    
    # Fix finally blocks that come before except blocks
    content = re.sub(
        r'finally:\s*\n\s*if conn:\s*\n\s*conn\.close\(\)\s*\n\s*except Exception as e:',
        'except Exception as e:',
        content,
        flags=re.MULTILINE
    )
    
    # Remove incorrect finally: conn.close() patterns
    content = re.sub(
        r'\n\s*finally:\s*\n\s*conn\.close\(\)',
        '',
        content,
        flags=re.MULTILINE
    )
    
    # Add missing conn = None declarations where needed
    # Find async def functions that use conn but don't declare it
    def add_conn_declaration(match):
        func_def = match.group(0)
        func_body = match.group(1)
        
        # Check if 'conn' is used but not declared
        if 'conn' in func_body and 'conn = db_manager.get_connection()' not in func_body:
            # Check if it's in a try/finally block without declaration
            if 'finally:' in func_body and 'if conn:' in func_body:
                # Add conn = None at the beginning
                indent = '    '
                return func_def + '\n' + indent + 'conn = None' + func_body
        
        return match.group(0)
    
    # Apply the function to all async def blocks
    content = re.sub(
        r'(async def [^:]+:)(.*?)(?=\n(?:async def|@router|$))',
        add_conn_declaration,
        content,
        flags=re.MULTILINE | re.DOTALL
    )
    
    with open('api/admin_system_endpoints.py', 'w') as f:
        f.write(content)
    
    print("Fixed admin_system_endpoints.py")

if __name__ == "__main__":
    fix_admin_system_endpoints()