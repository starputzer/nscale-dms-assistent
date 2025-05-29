#!/usr/bin/env python3
"""
generate_doc_index.py - Automatically generate/update documentation index files

This script scans documentation directories and generates index files with:
- Table of contents with proper hierarchy
- File metadata (if available)
- Automatic categorization
- Links to all documentation files

Usage:
    python generate_doc_index.py [directory] [--output INDEX.md]
    
    If no directory is specified, it will process common doc directories.
"""

import os
import sys
import re
import argparse
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Tuple, Optional

# Common documentation directories
DEFAULT_DOC_DIRS = [
    '/opt/nscale-assist/app/docs',
    '/opt/nscale-assist/docs'
]

# Categories for automatic organization
CATEGORIES = {
    'admin': ['admin', 'administration', 'panel'],
    'api': ['api', 'endpoint', 'route', 'handler'],
    'authentication': ['auth', 'login', 'user', 'session'],
    'frontend': ['vue', 'component', 'ui', 'interface', 'css'],
    'backend': ['server', 'python', 'handler', 'module'],
    'configuration': ['config', 'setup', 'settings', 'environment'],
    'deployment': ['deploy', 'build', 'production', 'docker'],
    'development': ['dev', 'debug', 'test', 'migration'],
    'documentation': ['doc', 'readme', 'guide', 'tutorial'],
    'issues': ['issue', 'bug', 'fix', 'problem', 'error']
}

class IndexGenerator:
    def __init__(self):
        self.files_processed = 0
        self.indices_generated = 0
        
    def extract_metadata(self, filepath: Path) -> Dict[str, str]:
        """Extract metadata from a markdown file."""
        metadata = {
            'title': filepath.stem.replace('_', ' ').replace('-', ' ').title(),
            'date': '',
            'author': '',
            'status': '',
            'description': ''
        }
        
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
                
            # Check for YAML frontmatter
            yaml_match = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
            if yaml_match:
                for line in yaml_match.group(1).split('\n'):
                    if ':' in line:
                        key, value = line.split(':', 1)
                        metadata[key.strip().lower()] = value.strip()
                        
            # Check for HTML comment metadata
            comment_match = re.match(r'^<!--\n(.*?)\n-->', content, re.DOTALL)
            if comment_match:
                for line in comment_match.group(1).split('\n'):
                    if ':' in line:
                        key, value = line.split(':', 1)
                        metadata[key.strip().lower()] = value.strip()
                        
            # Extract first paragraph as description if not provided
            if not metadata['description']:
                # Skip metadata sections
                content_start = 0
                if yaml_match:
                    content_start = yaml_match.end()
                elif comment_match:
                    content_start = comment_match.end()
                    
                # Find first paragraph
                lines = content[content_start:].strip().split('\n')
                for line in lines:
                    line = line.strip()
                    if line and not line.startswith('#'):
                        metadata['description'] = line[:200] + '...' if len(line) > 200 else line
                        break
                        
            # Extract title from first heading if not in metadata
            if metadata['title'] == filepath.stem.replace('_', ' ').replace('-', ' ').title():
                heading_match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
                if heading_match:
                    metadata['title'] = heading_match.group(1).strip()
                    
        except Exception as e:
            print(f"Warning: Could not read {filepath}: {str(e)}")
            
        return metadata
        
    def categorize_file(self, filepath: Path) -> str:
        """Determine the category of a file based on its name and path."""
        path_str = str(filepath).lower()
        filename = filepath.stem.lower()
        
        # Check each category's keywords
        for category, keywords in CATEGORIES.items():
            for keyword in keywords:
                if keyword in filename or keyword in path_str:
                    return category
                    
        # Check parent directory name
        parent = filepath.parent.name.lower()
        for category, keywords in CATEGORIES.items():
            if parent.startswith(category) or any(keyword in parent for keyword in keywords):
                return category
                
        return 'general'
        
    def scan_directory(self, directory: Path, base_dir: Path = None) -> Dict[str, List[Dict]]:
        """Scan directory and organize files by category."""
        if base_dir is None:
            base_dir = directory
            
        categorized_files = {}
        
        for root, dirs, files in os.walk(directory):
            # Skip hidden directories and common exclusions
            dirs[:] = [d for d in dirs if not d.startswith('.') and d not in ['node_modules', 'venv', '__pycache__']]
            
            for file in sorted(files):
                if file.endswith('.md') and file.lower() not in ['index.md', 'readme.md']:
                    filepath = Path(root) / file
                    relative_path = filepath.relative_to(base_dir)
                    
                    metadata = self.extract_metadata(filepath)
                    category = self.categorize_file(filepath)
                    
                    file_info = {
                        'path': filepath,
                        'relative_path': relative_path,
                        'metadata': metadata,
                        'depth': len(relative_path.parts) - 1
                    }
                    
                    if category not in categorized_files:
                        categorized_files[category] = []
                    categorized_files[category].append(file_info)
                    self.files_processed += 1
                    
        return categorized_files
        
    def generate_index_content(self, categorized_files: Dict[str, List[Dict]], base_dir: Path) -> str:
        """Generate the index file content."""
        content = []
        
        # Header
        content.append("# Documentation Index\n")
        content.append(f"*Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*\n")
        
        # Summary
        total_files = sum(len(files) for files in categorized_files.values())
        content.append(f"Total documentation files: **{total_files}**\n")
        
        # Quick links
        if len(categorized_files) > 1:
            content.append("## Quick Navigation\n")
            for category in sorted(categorized_files.keys()):
                category_title = category.replace('_', ' ').title()
                content.append(f"- [{category_title}](#{category})")
            content.append("")
            
        # Categories
        for category in sorted(categorized_files.keys()):
            files = categorized_files[category]
            if not files:
                continue
                
            category_title = category.replace('_', ' ').title()
            content.append(f"## {category_title}\n")
            
            # Sort files by depth and name
            files.sort(key=lambda x: (x['depth'], str(x['relative_path'])))
            
            current_dir = None
            for file_info in files:
                relative_path = file_info['relative_path']
                metadata = file_info['metadata']
                
                # Add directory header if changed
                if relative_path.parent != current_dir and relative_path.parent != Path('.'):
                    current_dir = relative_path.parent
                    indent = '  ' * (len(current_dir.parts) - 1)
                    content.append(f"\n{indent}### {current_dir}/\n")
                    
                # Format entry
                indent = '  ' * file_info['depth']
                title = metadata['title']
                
                # Create relative link
                link_path = relative_path.as_posix()
                
                entry = f"{indent}- [{title}]({link_path})"
                
                # Add metadata badges
                badges = []
                if metadata['status']:
                    status_emoji = {
                        'draft': '📝',
                        'review': '👀',
                        'final': '✅',
                        'deprecated': '⚠️',
                        'archived': '📦'
                    }.get(metadata['status'].lower(), '📄')
                    badges.append(f"{status_emoji} {metadata['status']}")
                    
                if metadata['date']:
                    badges.append(f"📅 {metadata['date']}")
                    
                if badges:
                    entry += f" - {' | '.join(badges)}"
                    
                content.append(entry)
                
                # Add description if available
                if metadata['description']:
                    content.append(f"{indent}  > {metadata['description']}")
                    
            content.append("")
            
        # Footer
        content.append("---\n")
        content.append("*This index is automatically generated. Do not edit manually.*")
        
        return '\n'.join(content)
        
    def generate_index(self, directory: Path, output_file: Optional[Path] = None) -> None:
        """Generate index for a directory."""
        print(f"\nGenerating index for: {directory}")
        
        if not directory.exists():
            print(f"❌ Directory not found: {directory}")
            return
            
        # Default output file
        if output_file is None:
            output_file = directory / "00_INDEX.md"
            
        # Scan directory
        categorized_files = self.scan_directory(directory)
        
        if not categorized_files:
            print("⚠️  No markdown files found in directory")
            return
            
        # Generate content
        content = self.generate_index_content(categorized_files, directory)
        
        # Write index file
        try:
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✅ Generated index: {output_file}")
            self.indices_generated += 1
        except Exception as e:
            print(f"❌ Error writing index file: {str(e)}")
            

def main():
    """Main function to run the index generator."""
    parser = argparse.ArgumentParser(description='Generate documentation index files')
    parser.add_argument('directory', nargs='?', help='Directory to process')
    parser.add_argument('--output', '-o', help='Output file path (default: 00_INDEX.md in target directory)')
    parser.add_argument('--recursive', '-r', action='store_true', help='Generate indices for subdirectories')
    
    args = parser.parse_args()
    
    generator = IndexGenerator()
    
    # Determine which directories to process
    if args.directory:
        directories = [Path(args.directory)]
    else:
        directories = [Path(d) for d in DEFAULT_DOC_DIRS if os.path.exists(d)]
        
    if not directories:
        print("❌ No documentation directories found!")
        print(f"Looked for: {', '.join(DEFAULT_DOC_DIRS)}")
        sys.exit(1)
        
    # Process directories
    for directory in directories:
        if args.output and len(directories) == 1:
            output_file = Path(args.output)
        else:
            output_file = None
            
        generator.generate_index(directory, output_file)
        
        # Generate for subdirectories if requested
        if args.recursive:
            for subdir in directory.rglob('*/'):
                if subdir.is_dir() and not subdir.name.startswith('.'):
                    # Skip if it already has an index
                    existing_index = subdir / "00_INDEX.md"
                    if not existing_index.exists():
                        generator.generate_index(subdir)
                        
    # Summary
    print("\n" + "="*80)
    print("INDEX GENERATION SUMMARY")
    print("="*80)
    print(f"Files processed: {generator.files_processed}")
    print(f"Indices generated: {generator.indices_generated}")
    

if __name__ == "__main__":
    main()