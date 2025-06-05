#!/usr/bin/env python3
"""
Fix remaining authentication issues in endpoint files
- Remove AuthManager instantiation
- Fix AuthUser type annotations to Dict[str, Any]
"""

import os
import re
from pathlib import Path

def fix_auth_issues(file_path):
    """Fix authentication issues in a single file"""
    print(f"Processing {file_path}...")
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Remove AuthManager instantiation line
        content = re.sub(r'^auth_manager = AuthManager\(\).*$', '', content, flags=re.MULTILINE)
        
        # Replace AuthUser with Dict[str, Any] in function signatures
        content = re.sub(r'user: AuthUser = Depends', 'user: Dict[str, Any] = Depends', content)
        
        # If file was modified, save it
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"  ✓ Fixed authentication issues")
            return True
        else:
            print(f"  - No changes needed")
            return False
            
    except Exception as e:
        print(f"  ✗ Error: {e}")
        return False

def main():
    """Fix authentication issues in all affected endpoint files"""
    
    # List of files that still have AuthManager references
    files_to_fix = [
        "/opt/nscale-assist/app/api/advanced_documents_endpoints.py",
        "/opt/nscale-assist/app/api/background_processing_endpoints.py",
        "/opt/nscale-assist/app/api/doc_converter_enhanced_endpoints.py",
        "/opt/nscale-assist/app/api/document_upload_endpoints.py",
        "/opt/nscale-assist/app/api/knowledge_endpoints.py",
        "/opt/nscale-assist/app/api/knowledge_manager_endpoints.py",
        "/opt/nscale-assist/app/api/missing_endpoints.py",
        "/opt/nscale-assist/app/api/rag_settings_endpoints.py",
        "/opt/nscale-assist/app/api/system_monitor_endpoints.py"
    ]
    
    fixed_count = 0
    
    print("Fixing remaining authentication issues in endpoint files...")
    print("=" * 60)
    
    for file_path in files_to_fix:
        if os.path.exists(file_path):
            if fix_auth_issues(file_path):
                fixed_count += 1
        else:
            print(f"{file_path} - File not found")
    
    print("=" * 60)
    print(f"Fixed {fixed_count} files")
    
    # Now check if all files import Dict from typing
    print("\nChecking if all files import Dict from typing...")
    for file_path in files_to_fix:
        if os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Check if Dict is imported
            if 'Dict[str, Any]' in content and 'from typing import' in content:
                if 'Dict' not in content.split('from typing import')[1].split('\n')[0]:
                    print(f"  ! {os.path.basename(file_path)} uses Dict but doesn't import it")
                    # Add Dict to imports
                    content = re.sub(
                        r'from typing import ([^)]+)',
                        lambda m: f"from typing import {m.group(1)}, Dict" if 'Dict' not in m.group(1) else m.group(0),
                        content
                    )
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(content)
                    print(f"    ✓ Added Dict to imports")

if __name__ == "__main__":
    main()