#!/usr/bin/env python3
"""
check_doc_metadata.py - Validate markdown files have proper metadata headers

This script checks all markdown files in the documentation directories to ensure
they have proper metadata headers including title, date, author, and status.

Usage:
    python check_doc_metadata.py [directory]
    
    If no directory is specified, it will check common doc directories.
"""

import os
import sys
import re
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Tuple

# Required metadata fields
REQUIRED_FIELDS = ['title', 'date', 'author', 'status']
OPTIONAL_FIELDS = ['tags', 'version', 'category']

# Common documentation directories
DEFAULT_DOC_DIRS = [
    '/opt/nscale-assist/app/docs',
    '/opt/nscale-assist/docs',
    '/opt/nscale-assist/app'
]

class MetadataChecker:
    def __init__(self):
        self.issues = []
        self.checked_files = 0
        self.files_with_issues = 0
        
    def check_metadata(self, filepath: Path) -> Dict[str, any]:
        """Check if a markdown file has proper metadata headers."""
        issues = []
        metadata = {}
        
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
                
            # Check for metadata section (either YAML frontmatter or comment block)
            yaml_match = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
            comment_match = re.match(r'^<!--\n(.*?)\n-->', content, re.DOTALL)
            
            if yaml_match:
                metadata_text = yaml_match.group(1)
                metadata_type = 'yaml'
            elif comment_match:
                metadata_text = comment_match.group(1)
                metadata_type = 'comment'
            else:
                issues.append("No metadata header found (expected YAML frontmatter or HTML comment)")
                return {'filepath': filepath, 'issues': issues, 'metadata': {}}
                
            # Parse metadata
            for line in metadata_text.split('\n'):
                if ':' in line:
                    key, value = line.split(':', 1)
                    metadata[key.strip().lower()] = value.strip()
                    
            # Check required fields
            for field in REQUIRED_FIELDS:
                if field not in metadata:
                    issues.append(f"Missing required field: {field}")
                elif not metadata[field]:
                    issues.append(f"Empty required field: {field}")
                    
            # Validate date format
            if 'date' in metadata and metadata['date']:
                try:
                    datetime.strptime(metadata['date'], '%Y-%m-%d')
                except ValueError:
                    issues.append(f"Invalid date format: {metadata['date']} (expected YYYY-MM-DD)")
                    
            # Validate status
            valid_statuses = ['draft', 'review', 'final', 'deprecated', 'archived']
            if 'status' in metadata and metadata['status'].lower() not in valid_statuses:
                issues.append(f"Invalid status: {metadata['status']} (expected one of: {', '.join(valid_statuses)})")
                
        except Exception as e:
            issues.append(f"Error reading file: {str(e)}")
            
        return {
            'filepath': filepath,
            'issues': issues,
            'metadata': metadata
        }
        
    def check_directory(self, directory: Path) -> None:
        """Recursively check all markdown files in a directory."""
        print(f"\nChecking directory: {directory}")
        
        for root, dirs, files in os.walk(directory):
            # Skip hidden directories and common exclusions
            dirs[:] = [d for d in dirs if not d.startswith('.') and d not in ['node_modules', 'venv', '__pycache__']]
            
            for file in files:
                if file.endswith('.md'):
                    filepath = Path(root) / file
                    result = self.check_metadata(filepath)
                    self.checked_files += 1
                    
                    if result['issues']:
                        self.files_with_issues += 1
                        self.issues.append(result)
                        
    def print_report(self) -> None:
        """Print a summary report of all issues found."""
        print("\n" + "="*80)
        print("METADATA CHECK REPORT")
        print("="*80)
        
        print(f"\nFiles checked: {self.checked_files}")
        print(f"Files with issues: {self.files_with_issues}")
        
        if not self.issues:
            print("\n✅ All files have proper metadata headers!")
            return
            
        print(f"\n❌ Found {len(self.issues)} file(s) with metadata issues:\n")
        
        for result in self.issues:
            filepath = result['filepath']
            issues = result['issues']
            
            print(f"\n📄 {filepath}")
            for issue in issues:
                print(f"   - {issue}")
                
        print("\n" + "-"*80)
        print("Metadata Header Examples:")
        print("\nYAML Frontmatter:")
        print("---")
        print("title: Document Title")
        print("date: 2025-01-29")
        print("author: Your Name")
        print("status: draft")
        print("tags: documentation, maintenance")
        print("---")
        print("\nHTML Comment:")
        print("<!--")
        print("title: Document Title")
        print("date: 2025-01-29")
        print("author: Your Name")
        print("status: final")
        print("-->")
        

def main():
    """Main function to run the metadata checker."""
    checker = MetadataChecker()
    
    # Determine which directories to check
    if len(sys.argv) > 1:
        directories = [Path(sys.argv[1])]
    else:
        directories = [Path(d) for d in DEFAULT_DOC_DIRS if os.path.exists(d)]
        
    if not directories:
        print("❌ No documentation directories found!")
        print(f"Looked for: {', '.join(DEFAULT_DOC_DIRS)}")
        sys.exit(1)
        
    # Check all directories
    for directory in directories:
        if directory.exists():
            checker.check_directory(directory)
        else:
            print(f"⚠️  Directory not found: {directory}")
            
    # Print report
    checker.print_report()
    
    # Exit with error code if issues found
    sys.exit(1 if checker.files_with_issues > 0 else 0)
    

if __name__ == "__main__":
    main()