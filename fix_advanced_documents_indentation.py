#!/usr/bin/env python3
"""Fix indentation issues in advanced_documents_endpoints.py"""

import re

def fix_indentation():
    with open('api/advanced_documents_endpoints.py', 'r') as f:
        lines = f.readlines()
    
    fixed_lines = []
    in_db_block = False
    base_indent = 0
    
    for i, line in enumerate(lines):
        # Check if we're entering a db_manager block
        if 'with db_manager.get_session() as conn:' in line:
            in_db_block = True
            base_indent = len(line) - len(line.lstrip())
            fixed_lines.append(line)
            continue
            
        # If we're in a db block
        if in_db_block:
            # Check for lines that end the block
            if line.strip() and (
                ('except' in line and len(line) - len(line.lstrip()) <= base_indent) or
                ('return' in line and len(line) - len(line.lstrip()) <= base_indent)
            ):
                in_db_block = False
                fixed_lines.append(line)
                continue
            
            # Lines that should be indented inside the block
            if line.strip():
                current_indent = len(line) - len(line.lstrip())
                
                # Special handling for certain lines
                if 'cursor = conn.cursor()' in line:
                    fixed_lines.append(' ' * (base_indent + 4) + 'cursor = conn.cursor()\n')
                elif current_indent < base_indent + 4:
                    # This line needs more indentation
                    fixed_lines.append(' ' * (base_indent + 4) + line.lstrip())
                else:
                    fixed_lines.append(line)
            else:
                fixed_lines.append(line)
        else:
            fixed_lines.append(line)
    
    # Write the fixed content
    with open('api/advanced_documents_endpoints.py', 'w') as f:
        f.writelines(fixed_lines)
    
    print("Fixed indentation issues")

if __name__ == "__main__":
    fix_indentation()