#!/usr/bin/env python3
"""
Fix all hardcoded /api/v1 URLs in the frontend code to use /api instead.
The backend doesn't use the v1 prefix in its routes.
"""

import os
import re
import glob
from typing import List, Tuple

def find_files_with_api_v1() -> List[str]:
    """Find all files containing /api/v1 references"""
    patterns = ['src/**/*.ts', 'src/**/*.js', 'src/**/*.vue']
    files = []
    
    for pattern in patterns:
        files.extend(glob.glob(pattern, recursive=True))
    
    # Filter to only files that contain /api/v1
    files_with_v1 = []
    for file in files:
        try:
            with open(file, 'r', encoding='utf-8') as f:
                content = f.read()
                if '/api/v1' in content or '/v1/' in content:
                    files_with_v1.append(file)
        except Exception as e:
            print(f"Error reading {file}: {e}")
    
    return files_with_v1

def fix_api_v1_urls(file_path: str) -> Tuple[bool, int]:
    """Fix /api/v1 URLs in a single file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        replacements = 0
        
        # Replace /api/v1/ with /api/
        content, count = re.subn(r'/api/v1/', '/api/', content)
        replacements += count
        
        # Replace "/v1/ at the start of paths (in config objects)
        content, count = re.subn(r'"/v1/', '"/', content)
        replacements += count
        
        # Replace '/v1/ at the start of paths (in config objects)
        content, count = re.subn(r"'/v1/", "'/", content)
        replacements += count
        
        # Replace template literal `/v1/
        content, count = re.subn(r'`/v1/', '`/', content)
        replacements += count
        
        # If content changed, write it back
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True, replacements
        
        return False, 0
        
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return False, 0

def main():
    """Main function"""
    print("Finding files with /api/v1 references...")
    files = find_files_with_api_v1()
    
    print(f"Found {len(files)} files with API v1 references")
    
    total_replacements = 0
    modified_files = []
    
    for file in files:
        modified, count = fix_api_v1_urls(file)
        if modified:
            modified_files.append(file)
            total_replacements += count
            print(f"✓ Fixed {count} occurrences in {file}")
    
    print(f"\nSummary:")
    print(f"- Modified {len(modified_files)} files")
    print(f"- Total replacements: {total_replacements}")
    
    if modified_files:
        print("\nModified files:")
        for file in modified_files:
            print(f"  - {file}")

if __name__ == "__main__":
    main()