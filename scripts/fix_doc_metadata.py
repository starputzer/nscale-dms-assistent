#!/usr/bin/env python3
"""
Fix common metadata issues in documentation files.

This script processes markdown files to fix metadata issues:
- Fixes date format from DD.MM.YYYY to YYYY-MM-DD
- Changes status "Aktiv" to "final"
- Changes status "Abgeschlossen" to "archived"
- Adds missing metadata headers with sensible defaults
- Preserves existing metadata where valid

Supports both YAML frontmatter and HTML comment formats.
"""

import os
import re
import shutil
import argparse
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import json


class MetadataFixer:
    """Fix metadata issues in markdown documentation files."""
    
    def __init__(self, dry_run: bool = False, backup_dir: str = ".metadata_backups"):
        self.dry_run = dry_run
        self.backup_dir = backup_dir
        self.fixed_files = []
        self.errors = []
        
        # Status mappings
        self.status_map = {
            "Aktiv": "final",
            "aktiv": "final",
            "Abgeschlossen": "archived",
            "abgeschlossen": "archived",
            "Entwurf": "draft",
            "entwurf": "draft",
            "In Bearbeitung": "in_progress",
            "in bearbeitung": "in_progress"
        }
        
        # Default metadata template
        self.default_metadata = {
            "title": "",
            "version": "1.0.0",
            "last_updated": datetime.now().strftime("%Y-%m-%d"),
            "status": "draft",
            "tags": [],
            "category": "general"
        }
    
    def fix_date_format(self, date_str: str) -> str:
        """Convert DD.MM.YYYY to YYYY-MM-DD format."""
        # Match DD.MM.YYYY pattern
        match = re.match(r'^(\d{1,2})\.(\d{1,2})\.(\d{4})$', date_str.strip())
        if match:
            day, month, year = match.groups()
            try:
                # Validate and format date
                date_obj = datetime(int(year), int(month), int(day))
                return date_obj.strftime("%Y-%m-%d")
            except ValueError:
                # Invalid date
                return date_str
        
        # Check if already in correct format
        if re.match(r'^\d{4}-\d{2}-\d{2}$', date_str.strip()):
            return date_str.strip()
        
        return date_str
    
    def fix_status(self, status: str) -> str:
        """Fix status values according to mapping."""
        status_lower = status.strip().lower()
        
        # Direct mapping
        if status.strip() in self.status_map:
            return self.status_map[status.strip()]
        
        # Check lowercase version
        for key, value in self.status_map.items():
            if key.lower() == status_lower:
                return value
        
        # If status is already valid, keep it
        valid_statuses = ["draft", "in_progress", "review", "final", "archived"]
        if status_lower in valid_statuses:
            return status_lower
        
        return status
    
    def extract_yaml_frontmatter(self, content: str) -> Tuple[Optional[Dict], str]:
        """Extract YAML frontmatter from content."""
        if not content.startswith('---'):
            return None, content
        
        parts = content.split('---', 2)
        if len(parts) < 3:
            return None, content
        
        yaml_content = parts[1].strip()
        remaining_content = '---'.join(parts[2:])
        
        # Parse YAML manually (simple parser)
        metadata = {}
        for line in yaml_content.split('\n'):
            if ':' in line:
                key, value = line.split(':', 1)
                key = key.strip()
                value = value.strip()
                
                # Handle lists (simple case)
                if value.startswith('[') and value.endswith(']'):
                    value = [v.strip().strip('"\'') for v in value[1:-1].split(',')]
                # Remove quotes
                elif value.startswith('"') and value.endswith('"'):
                    value = value[1:-1]
                elif value.startswith("'") and value.endswith("'"):
                    value = value[1:-1]
                
                metadata[key] = value
        
        return metadata, remaining_content
    
    def extract_html_comment_metadata(self, content: str) -> Tuple[Optional[Dict], str]:
        """Extract metadata from HTML comments."""
        pattern = r'<!--\s*metadata\s*(.*?)\s*-->'
        match = re.search(pattern, content, re.DOTALL | re.IGNORECASE)
        
        if not match:
            return None, content
        
        metadata_text = match.group(1)
        metadata = {}
        
        # Parse key: value pairs
        for line in metadata_text.split('\n'):
            if ':' in line:
                key, value = line.split(':', 1)
                key = key.strip()
                value = value.strip()
                
                # Handle lists
                if value.startswith('[') and value.endswith(']'):
                    value = [v.strip().strip('"\'') for v in value[1:-1].split(',')]
                
                metadata[key] = value
        
        # Remove the metadata comment from content
        content_without_metadata = content[:match.start()] + content[match.end():]
        
        return metadata, content_without_metadata
    
    def fix_metadata(self, metadata: Dict) -> Tuple[Dict, List[str]]:
        """Fix metadata issues and return fixed metadata with list of changes."""
        fixed = metadata.copy()
        changes = []
        
        # Fix dates
        date_fields = ['last_updated', 'created', 'date', 'updated_at', 'created_at']
        for field in date_fields:
            if field in fixed and isinstance(fixed[field], str):
                new_date = self.fix_date_format(fixed[field])
                if new_date != fixed[field]:
                    fixed[field] = new_date
                    changes.append(f"Fixed date format in '{field}': {metadata[field]} → {new_date}")
        
        # Fix status
        if 'status' in fixed:
            new_status = self.fix_status(fixed['status'])
            if new_status != fixed['status']:
                changes.append(f"Fixed status: {fixed['status']} → {new_status}")
                fixed['status'] = new_status
        
        # Add missing required fields
        for key, default_value in self.default_metadata.items():
            if key not in fixed:
                fixed[key] = default_value
                changes.append(f"Added missing '{key}': {default_value}")
        
        # Ensure title is not empty
        if not fixed.get('title'):
            # Try to extract from filename or first heading
            fixed['title'] = "Untitled Document"
            changes.append("Added default title")
        
        return fixed, changes
    
    def format_yaml_frontmatter(self, metadata: Dict) -> str:
        """Format metadata as YAML frontmatter."""
        lines = ['---']
        
        # Order keys for consistency
        key_order = ['title', 'version', 'last_updated', 'status', 'category', 'tags']
        
        # Add ordered keys first
        for key in key_order:
            if key in metadata:
                value = metadata[key]
                if isinstance(value, list):
                    if value:
                        lines.append(f"{key}: [{', '.join(repr(v) for v in value)}]")
                    else:
                        lines.append(f"{key}: []")
                else:
                    lines.append(f"{key}: {repr(value) if ' ' in str(value) else value}")
        
        # Add any remaining keys
        for key, value in metadata.items():
            if key not in key_order:
                if isinstance(value, list):
                    if value:
                        lines.append(f"{key}: [{', '.join(repr(v) for v in value)}]")
                    else:
                        lines.append(f"{key}: []")
                else:
                    lines.append(f"{key}: {repr(value) if ' ' in str(value) else value}")
        
        lines.append('---')
        return '\n'.join(lines)
    
    def format_html_comment_metadata(self, metadata: Dict) -> str:
        """Format metadata as HTML comment."""
        lines = ['<!-- metadata']
        
        # Order keys for consistency
        key_order = ['title', 'version', 'last_updated', 'status', 'category', 'tags']
        
        # Add ordered keys first
        for key in key_order:
            if key in metadata:
                value = metadata[key]
                if isinstance(value, list):
                    if value:
                        lines.append(f"  {key}: [{', '.join(repr(v) for v in value)}]")
                    else:
                        lines.append(f"  {key}: []")
                else:
                    lines.append(f"  {key}: {value}")
        
        # Add any remaining keys
        for key, value in metadata.items():
            if key not in key_order:
                if isinstance(value, list):
                    if value:
                        lines.append(f"  {key}: [{', '.join(repr(v) for v in value)}]")
                    else:
                        lines.append(f"  {key}: []")
                else:
                    lines.append(f"  {key}: {value}")
        
        lines.append('-->')
        return '\n'.join(lines)
    
    def create_backup(self, file_path: Path) -> Optional[Path]:
        """Create a backup of the file."""
        if self.dry_run:
            return None
        
        backup_path = Path(self.backup_dir) / file_path.parent.relative_to(Path.cwd())
        backup_path.mkdir(parents=True, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = backup_path / f"{file_path.stem}_{timestamp}{file_path.suffix}"
        
        try:
            shutil.copy2(file_path, backup_file)
            return backup_file
        except Exception as e:
            self.errors.append(f"Failed to backup {file_path}: {e}")
            return None
    
    def process_file(self, file_path: Path) -> bool:
        """Process a single markdown file."""
        try:
            # Read file content
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            changes = []
            metadata = None
            remaining_content = content
            metadata_format = None
            
            # Try to extract YAML frontmatter
            yaml_metadata, yaml_remaining = self.extract_yaml_frontmatter(content)
            if yaml_metadata is not None:
                metadata = yaml_metadata
                remaining_content = yaml_remaining
                metadata_format = 'yaml'
            else:
                # Try to extract HTML comment metadata
                html_metadata, html_remaining = self.extract_html_comment_metadata(content)
                if html_metadata is not None:
                    metadata = html_metadata
                    remaining_content = html_remaining
                    metadata_format = 'html'
            
            # If no metadata found, add default YAML frontmatter
            if metadata is None:
                metadata = self.default_metadata.copy()
                
                # Try to extract title from first heading
                title_match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
                if title_match:
                    metadata['title'] = title_match.group(1).strip()
                else:
                    metadata['title'] = file_path.stem.replace('_', ' ').replace('-', ' ').title()
                
                metadata_format = 'yaml'
                changes.append("Added missing metadata header")
            
            # Fix metadata
            fixed_metadata, fix_changes = self.fix_metadata(metadata)
            changes.extend(fix_changes)
            
            # If no changes, skip file
            if not changes:
                return False
            
            # Format new content
            if metadata_format == 'yaml':
                new_metadata = self.format_yaml_frontmatter(fixed_metadata)
                new_content = new_metadata + '\n\n' + remaining_content.lstrip()
            else:
                new_metadata = self.format_html_comment_metadata(fixed_metadata)
                new_content = new_metadata + '\n\n' + remaining_content.lstrip()
            
            # Only process if content changed
            if new_content != original_content:
                # Create backup
                backup_path = self.create_backup(file_path)
                
                # Write fixed content
                if not self.dry_run:
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                
                self.fixed_files.append({
                    'file': str(file_path),
                    'backup': str(backup_path) if backup_path else None,
                    'changes': changes
                })
                
                return True
            
            return False
            
        except Exception as e:
            self.errors.append(f"Error processing {file_path}: {e}")
            return False
    
    def process_directory(self, directory: Path) -> None:
        """Process all markdown files in directory recursively."""
        md_files = list(directory.rglob('*.md'))
        
        print(f"Found {len(md_files)} markdown files")
        
        for file_path in md_files:
            # Skip backup directories
            if self.backup_dir in str(file_path):
                continue
            
            if self.process_file(file_path):
                print(f"✓ Fixed: {file_path}")
            else:
                print(f"  Skip: {file_path}")
    
    def print_summary(self) -> None:
        """Print summary of fixes."""
        print("\n" + "="*60)
        print("SUMMARY")
        print("="*60)
        
        if self.dry_run:
            print("\n🔍 DRY RUN MODE - No files were modified")
        
        print(f"\nFiles fixed: {len(self.fixed_files)}")
        
        if self.fixed_files:
            print("\nDetailed changes:")
            for fix in self.fixed_files:
                print(f"\n📄 {fix['file']}")
                if fix['backup'] and not self.dry_run:
                    print(f"   Backup: {fix['backup']}")
                for change in fix['changes']:
                    print(f"   • {change}")
        
        if self.errors:
            print(f"\n❌ Errors encountered: {len(self.errors)}")
            for error in self.errors:
                print(f"   • {error}")
        
        if not self.dry_run and self.fixed_files:
            print(f"\n💾 Backups saved to: {self.backup_dir}/")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Fix common metadata issues in markdown documentation files"
    )
    parser.add_argument(
        'directory',
        nargs='?',
        default='.',
        help='Directory to process (default: current directory)'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show what would be fixed without making changes'
    )
    parser.add_argument(
        '--backup-dir',
        default='.metadata_backups',
        help='Directory for backups (default: .metadata_backups)'
    )
    parser.add_argument(
        '-y', '--yes',
        action='store_true',
        help='Skip confirmation prompt'
    )
    
    args = parser.parse_args()
    
    directory = Path(args.directory)
    if not directory.exists():
        print(f"Error: Directory '{directory}' does not exist")
        return 1
    
    if not directory.is_dir():
        print(f"Error: '{directory}' is not a directory")
        return 1
    
    # Show what will be done
    print("Metadata Fixer")
    print("="*60)
    print(f"Directory: {directory.absolute()}")
    print(f"Backup dir: {args.backup_dir}")
    print(f"Mode: {'DRY RUN' if args.dry_run else 'LIVE'}")
    print("\nThis script will:")
    print("• Fix date formats (DD.MM.YYYY → YYYY-MM-DD)")
    print("• Fix status values (Aktiv → final, Abgeschlossen → archived)")
    print("• Add missing metadata headers")
    print("• Create backups of modified files")
    print("="*60)
    
    # Ask for confirmation unless --yes flag is used
    if not args.yes and not args.dry_run:
        response = input("\nProceed with fixing metadata? [y/N]: ")
        if response.lower() != 'y':
            print("Aborted.")
            return 0
    
    # Process files
    fixer = MetadataFixer(dry_run=args.dry_run, backup_dir=args.backup_dir)
    fixer.process_directory(directory)
    fixer.print_summary()
    
    return 0


if __name__ == '__main__':
    exit(main())