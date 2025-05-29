#!/usr/bin/env python3
"""
check_doc_links.py - Validate all internal links in documentation

This script checks all internal links in markdown files to ensure they point
to existing files or anchors. It detects broken links, missing files, and
invalid anchor references.

Usage:
    python check_doc_links.py [directory]
    
    If no directory is specified, it will check common doc directories.
"""

import os
import sys
import re
from pathlib import Path
from typing import List, Dict, Set, Tuple
from urllib.parse import urlparse, unquote

# Common documentation directories
DEFAULT_DOC_DIRS = [
    '/opt/nscale-assist/app/docs',
    '/opt/nscale-assist/docs',
    '/opt/nscale-assist/app'
]

class LinkChecker:
    def __init__(self):
        self.issues = []
        self.checked_files = 0
        self.total_links = 0
        self.broken_links = 0
        self.external_links = []
        
    def extract_links(self, content: str, filepath: Path) -> List[Dict]:
        """Extract all links from markdown content."""
        links = []
        
        # Match markdown links: [text](url)
        markdown_pattern = r'\[([^\]]+)\]\(([^)]+)\)'
        for match in re.finditer(markdown_pattern, content):
            text = match.group(1)
            url = match.group(2)
            line_num = content[:match.start()].count('\n') + 1
            links.append({
                'text': text,
                'url': url,
                'line': line_num,
                'type': 'markdown'
            })
            
        # Match reference-style links: [text][ref]
        ref_pattern = r'\[([^\]]+)\]\[([^\]]+)\]'
        for match in re.finditer(ref_pattern, content):
            text = match.group(1)
            ref = match.group(2)
            line_num = content[:match.start()].count('\n') + 1
            links.append({
                'text': text,
                'url': f'[{ref}]',
                'line': line_num,
                'type': 'reference'
            })
            
        # Match HTML links: <a href="url">
        html_pattern = r'<a\s+[^>]*href\s*=\s*["\']([^"\']+)["\'][^>]*>'
        for match in re.finditer(html_pattern, content, re.IGNORECASE):
            url = match.group(1)
            line_num = content[:match.start()].count('\n') + 1
            links.append({
                'text': 'HTML link',
                'url': url,
                'line': line_num,
                'type': 'html'
            })
            
        return links
        
    def extract_anchors(self, content: str) -> Set[str]:
        """Extract all heading anchors from markdown content."""
        anchors = set()
        
        # Match markdown headings
        heading_pattern = r'^(#{1,6})\s+(.+)$'
        for match in re.finditer(heading_pattern, content, re.MULTILINE):
            heading_text = match.group(2)
            # Convert heading to anchor format (lowercase, replace spaces with hyphens)
            anchor = re.sub(r'[^\w\s-]', '', heading_text.lower())
            anchor = re.sub(r'[-\s]+', '-', anchor).strip('-')
            anchors.add(anchor)
            
        # Also look for explicit anchor tags
        anchor_pattern = r'<a\s+[^>]*(?:name|id)\s*=\s*["\']([^"\']+)["\'][^>]*>'
        for match in re.finditer(anchor_pattern, content, re.IGNORECASE):
            anchors.add(match.group(1))
            
        return anchors
        
    def resolve_path(self, base_path: Path, link: str) -> Path:
        """Resolve a relative link to an absolute path."""
        # Remove any fragment identifier
        if '#' in link:
            link = link.split('#')[0]
            
        if not link:  # Pure anchor link
            return base_path
            
        # Handle absolute paths
        if link.startswith('/'):
            # Assume it's relative to the project root
            return Path('/opt/nscale-assist') / link.lstrip('/')
            
        # Handle relative paths
        return (base_path.parent / link).resolve()
        
    def check_link(self, link: Dict, filepath: Path, anchors_map: Dict[Path, Set[str]]) -> List[str]:
        """Check if a link is valid."""
        issues = []
        url = link['url']
        
        # Skip external links (but track them)
        if url.startswith(('http://', 'https://', 'ftp://', 'mailto:')):
            self.external_links.append({
                'file': filepath,
                'line': link['line'],
                'url': url
            })
            return []
            
        # Skip reference-style links for now (would need to parse references)
        if link['type'] == 'reference':
            return []
            
        # Parse the link
        fragment = None
        if '#' in url:
            path_part, fragment = url.split('#', 1)
            fragment = unquote(fragment)
        else:
            path_part = url
            
        # Resolve the target path
        if path_part:
            target_path = self.resolve_path(filepath, path_part)
            
            # Check if file exists
            if not target_path.exists():
                issues.append(f"Broken link: '{url}' - file not found: {target_path}")
                return issues
                
            # If there's a fragment, check if the anchor exists
            if fragment:
                if target_path not in anchors_map:
                    # Load and parse the target file
                    try:
                        with open(target_path, 'r', encoding='utf-8') as f:
                            content = f.read()
                        anchors_map[target_path] = self.extract_anchors(content)
                    except Exception as e:
                        issues.append(f"Error reading target file {target_path}: {str(e)}")
                        return issues
                        
                if fragment not in anchors_map[target_path]:
                    issues.append(f"Broken anchor: '{url}' - anchor '#{fragment}' not found in {target_path}")
                    
        else:
            # Pure anchor link - check in current file
            if fragment and fragment not in anchors_map.get(filepath, set()):
                issues.append(f"Broken anchor: '{url}' - anchor '#{fragment}' not found in current file")
                
        return issues
        
    def check_file(self, filepath: Path, anchors_map: Dict[Path, Set[str]]) -> Dict:
        """Check all links in a markdown file."""
        issues = []
        
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
                
            # Extract anchors from this file
            anchors_map[filepath] = self.extract_anchors(content)
            
            # Extract and check all links
            links = self.extract_links(content, filepath)
            self.total_links += len(links)
            
            for link in links:
                link_issues = self.check_link(link, filepath, anchors_map)
                if link_issues:
                    self.broken_links += len(link_issues)
                    for issue in link_issues:
                        issues.append({
                            'line': link['line'],
                            'issue': issue,
                            'link_text': link['text']
                        })
                        
        except Exception as e:
            issues.append({
                'line': 0,
                'issue': f"Error reading file: {str(e)}",
                'link_text': ''
            })
            
        return {
            'filepath': filepath,
            'issues': issues
        }
        
    def check_directory(self, directory: Path) -> None:
        """Recursively check all markdown files in a directory."""
        print(f"\nChecking directory: {directory}")
        
        anchors_map = {}  # Cache of file -> anchors
        
        for root, dirs, files in os.walk(directory):
            # Skip hidden directories and common exclusions
            dirs[:] = [d for d in dirs if not d.startswith('.') and d not in ['node_modules', 'venv', '__pycache__']]
            
            for file in files:
                if file.endswith('.md'):
                    filepath = Path(root) / file
                    result = self.check_file(filepath, anchors_map)
                    self.checked_files += 1
                    
                    if result['issues']:
                        self.issues.append(result)
                        
    def print_report(self) -> None:
        """Print a summary report of all issues found."""
        print("\n" + "="*80)
        print("LINK CHECK REPORT")
        print("="*80)
        
        print(f"\nFiles checked: {self.checked_files}")
        print(f"Total links found: {self.total_links}")
        print(f"Broken links: {self.broken_links}")
        print(f"External links: {len(self.external_links)}")
        
        if not self.issues:
            print("\n✅ All internal links are valid!")
        else:
            print(f"\n❌ Found {len(self.issues)} file(s) with broken links:\n")
            
            for result in self.issues:
                filepath = result['filepath']
                issues = result['issues']
                
                print(f"\n📄 {filepath}")
                for issue_info in issues:
                    line = issue_info['line']
                    issue = issue_info['issue']
                    text = issue_info['link_text']
                    print(f"   Line {line}: {issue}")
                    if text:
                        print(f"            Link text: \"{text}\"")
                        
        if self.external_links:
            print("\n" + "-"*80)
            print("External links found (not checked):")
            external_by_file = {}
            for ext_link in self.external_links:
                filepath = ext_link['file']
                if filepath not in external_by_file:
                    external_by_file[filepath] = []
                external_by_file[filepath].append(ext_link)
                
            for filepath, links in list(external_by_file.items())[:5]:  # Show first 5 files
                print(f"\n{filepath}:")
                for link in links[:3]:  # Show first 3 links per file
                    print(f"   Line {link['line']}: {link['url']}")
                if len(links) > 3:
                    print(f"   ... and {len(links) - 3} more")
                    
            if len(external_by_file) > 5:
                print(f"\n... and {len(external_by_file) - 5} more files with external links")
                

def main():
    """Main function to run the link checker."""
    checker = LinkChecker()
    
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
    
    # Exit with error code if broken links found
    sys.exit(1 if checker.broken_links > 0 else 0)
    

if __name__ == "__main__":
    main()