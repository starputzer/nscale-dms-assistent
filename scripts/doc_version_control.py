#!/usr/bin/env python3
"""
Document Version Control System
Tracks document versions, shows diffs, and manages version history
"""

import os
import sys
import json
import hashlib
import shutil
import difflib
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import argparse
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class VersionConfig:
    """Version control configuration"""
    
    def __init__(self, config_path: str = None):
        self.config_path = config_path or os.path.join(
            os.path.dirname(__file__), 'version_config.json'
        )
        self.config = self.load_config()
    
    def load_config(self) -> dict:
        """Load configuration from file or create default"""
        if os.path.exists(self.config_path):
            with open(self.config_path, 'r') as f:
                return json.load(f)
        
        # Default configuration
        default_config = {
            "version_dir": "/opt/nscale-assist/versions",
            "tracked_dirs": [
                "/opt/nscale-assist/docs",
                "/opt/nscale-assist/app/docs"
            ],
            "max_versions_per_file": 50,
            "auto_commit_threshold_kb": 10,
            "track_file_patterns": [
                "*.md",
                "*.txt",
                "*.rst",
                "*.adoc"
            ],
            "ignore_patterns": [
                "*.tmp",
                "*.swp",
                ".git/*",
                "__pycache__/*"
            ],
            "enable_compression": True
        }
        
        self.save_config(default_config)
        return default_config
    
    def save_config(self, config: dict):
        """Save configuration to file"""
        os.makedirs(os.path.dirname(self.config_path), exist_ok=True)
        with open(self.config_path, 'w') as f:
            json.dump(config, f, indent=2)


class Version:
    """Represents a single version of a document"""
    
    def __init__(self, version_id: str, file_path: str, content: str, 
                 metadata: dict = None):
        self.version_id = version_id
        self.file_path = file_path
        self.content = content
        self.metadata = metadata or {}
        self.timestamp = datetime.now().isoformat()
        self.checksum = self._calculate_checksum()
    
    def _calculate_checksum(self) -> str:
        """Calculate content checksum"""
        return hashlib.sha256(self.content.encode()).hexdigest()
    
    def to_dict(self) -> dict:
        """Convert version to dictionary"""
        return {
            'version_id': self.version_id,
            'file_path': self.file_path,
            'timestamp': self.timestamp,
            'checksum': self.checksum,
            'size': len(self.content),
            'metadata': self.metadata
        }


class VersionManager:
    """Manages document versions"""
    
    def __init__(self, config: VersionConfig):
        self.config = config.config
        self.version_dir = Path(self.config['version_dir'])
        self.version_dir.mkdir(parents=True, exist_ok=True)
        
        # Create subdirectories
        self.content_dir = self.version_dir / 'content'
        self.metadata_dir = self.version_dir / 'metadata'
        self.index_dir = self.version_dir / 'index'
        
        for dir_path in [self.content_dir, self.metadata_dir, self.index_dir]:
            dir_path.mkdir(exist_ok=True)
        
        # Load or create index
        self.index_path = self.index_dir / 'version_index.json'
        self.index = self.load_index()
    
    def load_index(self) -> dict:
        """Load version index"""
        if self.index_path.exists():
            with open(self.index_path, 'r') as f:
                return json.load(f)
        return {}
    
    def save_index(self):
        """Save version index"""
        with open(self.index_path, 'w') as f:
            json.dump(self.index, f, indent=2)
    
    def should_track_file(self, file_path: Path) -> bool:
        """Check if file should be tracked"""
        # Check ignore patterns
        path_str = str(file_path)
        for pattern in self.config['ignore_patterns']:
            if pattern.endswith('/*'):
                dir_pattern = pattern[:-2]
                if dir_pattern in path_str:
                    return False
            elif '*' in pattern:
                import fnmatch
                if fnmatch.fnmatch(file_path.name, pattern):
                    return False
        
        # Check track patterns
        for pattern in self.config['track_file_patterns']:
            import fnmatch
            if fnmatch.fnmatch(file_path.name, pattern):
                return True
        
        return False
    
    def get_file_key(self, file_path: str) -> str:
        """Get unique key for file"""
        return hashlib.md5(file_path.encode()).hexdigest()
    
    def create_version(self, file_path: str, message: str = "", 
                      author: str = "system") -> Optional[Version]:
        """Create a new version of a file"""
        path = Path(file_path)
        
        if not path.exists():
            logger.error(f"File not found: {file_path}")
            return None
        
        if not self.should_track_file(path):
            logger.warning(f"File not tracked: {file_path}")
            return None
        
        try:
            # Read file content
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Generate version ID
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            version_id = f"{timestamp}_{hashlib.sha256(content.encode()).hexdigest()[:8]}"
            
            # Check if content has changed
            file_key = self.get_file_key(file_path)
            if file_key in self.index:
                last_version = self.get_latest_version(file_path)
                if last_version and last_version.checksum == hashlib.sha256(content.encode()).hexdigest():
                    logger.info(f"No changes in {file_path}, skipping version")
                    return None
            
            # Create version object
            metadata = {
                'message': message,
                'author': author,
                'file_size': path.stat().st_size,
                'file_mtime': path.stat().st_mtime
            }
            
            version = Version(version_id, file_path, content, metadata)
            
            # Save version content
            content_path = self.content_dir / f"{file_key}_{version_id}"
            if self.config['enable_compression']:
                import gzip
                with gzip.open(f"{content_path}.gz", 'wt', encoding='utf-8') as f:
                    f.write(content)
            else:
                with open(content_path, 'w', encoding='utf-8') as f:
                    f.write(content)
            
            # Save version metadata
            metadata_path = self.metadata_dir / f"{file_key}_{version_id}.json"
            with open(metadata_path, 'w') as f:
                json.dump(version.to_dict(), f, indent=2)
            
            # Update index
            if file_key not in self.index:
                self.index[file_key] = {
                    'file_path': file_path,
                    'versions': []
                }
            
            self.index[file_key]['versions'].append({
                'version_id': version_id,
                'timestamp': version.timestamp,
                'message': message,
                'author': author,
                'checksum': version.checksum
            })
            
            # Enforce max versions limit
            if len(self.index[file_key]['versions']) > self.config['max_versions_per_file']:
                self.cleanup_old_versions(file_path)
            
            self.save_index()
            
            logger.info(f"Created version {version_id} for {file_path}")
            return version
            
        except Exception as e:
            logger.error(f"Error creating version for {file_path}: {e}")
            return None
    
    def get_version(self, file_path: str, version_id: str) -> Optional[Version]:
        """Get a specific version of a file"""
        file_key = self.get_file_key(file_path)
        
        # Load content
        content_path = self.content_dir / f"{file_key}_{version_id}"
        
        try:
            if self.config['enable_compression']:
                import gzip
                with gzip.open(f"{content_path}.gz", 'rt', encoding='utf-8') as f:
                    content = f.read()
            else:
                with open(content_path, 'r', encoding='utf-8') as f:
                    content = f.read()
            
            # Load metadata
            metadata_path = self.metadata_dir / f"{file_key}_{version_id}.json"
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)
            
            return Version(
                version_id=version_id,
                file_path=file_path,
                content=content,
                metadata=metadata.get('metadata', {})
            )
            
        except Exception as e:
            logger.error(f"Error loading version {version_id} for {file_path}: {e}")
            return None
    
    def get_latest_version(self, file_path: str) -> Optional[Version]:
        """Get the latest version of a file"""
        file_key = self.get_file_key(file_path)
        
        if file_key not in self.index:
            return None
        
        versions = self.index[file_key]['versions']
        if not versions:
            return None
        
        latest = versions[-1]
        return self.get_version(file_path, latest['version_id'])
    
    def list_versions(self, file_path: str) -> List[dict]:
        """List all versions of a file"""
        file_key = self.get_file_key(file_path)
        
        if file_key not in self.index:
            return []
        
        return self.index[file_key]['versions']
    
    def get_diff(self, file_path: str, version1_id: str, 
                 version2_id: str = None) -> Optional[str]:
        """Get diff between two versions"""
        version1 = self.get_version(file_path, version1_id)
        if not version1:
            return None
        
        if version2_id:
            version2 = self.get_version(file_path, version2_id)
        else:
            # Compare with current file
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    current_content = f.read()
                version2 = Version("current", file_path, current_content)
            except Exception as e:
                logger.error(f"Error reading current file: {e}")
                return None
        
        if not version2:
            return None
        
        # Generate diff
        diff = difflib.unified_diff(
            version1.content.splitlines(keepends=True),
            version2.content.splitlines(keepends=True),
            fromfile=f"{file_path} (version {version1_id})",
            tofile=f"{file_path} (version {version2_id or 'current'})",
            fromfiledate=version1.timestamp,
            tofiledate=version2.timestamp
        )
        
        return ''.join(diff)
    
    def rollback(self, file_path: str, version_id: str, 
                 create_backup: bool = True) -> bool:
        """Rollback file to a specific version"""
        version = self.get_version(file_path, version_id)
        if not version:
            logger.error(f"Version {version_id} not found for {file_path}")
            return False
        
        try:
            # Create backup of current version if requested
            if create_backup and os.path.exists(file_path):
                self.create_version(
                    file_path, 
                    message=f"Backup before rollback to {version_id}",
                    author="system"
                )
            
            # Write version content to file
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(version.content)
            
            # Create new version entry
            self.create_version(
                file_path,
                message=f"Rolled back to version {version_id}",
                author="system"
            )
            
            logger.info(f"Successfully rolled back {file_path} to version {version_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error rolling back {file_path}: {e}")
            return False
    
    def cleanup_old_versions(self, file_path: str):
        """Clean up old versions exceeding the limit"""
        file_key = self.get_file_key(file_path)
        
        if file_key not in self.index:
            return
        
        versions = self.index[file_key]['versions']
        max_versions = self.config['max_versions_per_file']
        
        if len(versions) <= max_versions:
            return
        
        # Keep only the most recent versions
        versions_to_remove = versions[:-max_versions]
        
        for version_info in versions_to_remove:
            version_id = version_info['version_id']
            
            # Remove content file
            content_path = self.content_dir / f"{file_key}_{version_id}"
            if self.config['enable_compression']:
                content_path = Path(f"{content_path}.gz")
            
            if content_path.exists():
                content_path.unlink()
            
            # Remove metadata file
            metadata_path = self.metadata_dir / f"{file_key}_{version_id}.json"
            if metadata_path.exists():
                metadata_path.unlink()
        
        # Update index
        self.index[file_key]['versions'] = versions[-max_versions:]
        self.save_index()
        
        logger.info(f"Cleaned up {len(versions_to_remove)} old versions for {file_path}")
    
    def track_all_files(self) -> dict:
        """Track all files in configured directories"""
        results = {
            'tracked': [],
            'skipped': [],
            'errors': []
        }
        
        for tracked_dir in self.config['tracked_dirs']:
            if not os.path.exists(tracked_dir):
                logger.warning(f"Tracked directory not found: {tracked_dir}")
                continue
            
            for root, dirs, files in os.walk(tracked_dir):
                for file in files:
                    file_path = Path(root) / file
                    
                    if self.should_track_file(file_path):
                        version = self.create_version(
                            str(file_path),
                            message="Initial tracking",
                            author="system"
                        )
                        
                        if version:
                            results['tracked'].append(str(file_path))
                        else:
                            results['skipped'].append(str(file_path))
                    else:
                        results['skipped'].append(str(file_path))
        
        return results
    
    def generate_version_report(self, output_path: str = None) -> str:
        """Generate a comprehensive version report"""
        report_lines = []
        report_lines.append("Document Version Control Report")
        report_lines.append("=" * 50)
        report_lines.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report_lines.append("")
        
        # Statistics
        total_files = len(self.index)
        total_versions = sum(len(info['versions']) for info in self.index.values())
        
        report_lines.append("Statistics:")
        report_lines.append(f"  Total tracked files: {total_files}")
        report_lines.append(f"  Total versions: {total_versions}")
        report_lines.append("")
        
        # File details
        report_lines.append("Tracked Files:")
        report_lines.append("-" * 50)
        
        for file_key, file_info in sorted(self.index.items(), 
                                         key=lambda x: x[1]['file_path']):
            file_path = file_info['file_path']
            versions = file_info['versions']
            
            report_lines.append(f"\n{file_path}")
            report_lines.append(f"  Versions: {len(versions)}")
            
            if versions:
                latest = versions[-1]
                report_lines.append(f"  Latest: {latest['timestamp']}")
                report_lines.append(f"  Message: {latest['message']}")
            
            # Recent versions
            report_lines.append("  Recent versions:")
            for version in versions[-5:]:
                report_lines.append(f"    - {version['version_id']}: {version['message']}")
        
        report_content = '\n'.join(report_lines)
        
        # Save report if output path provided
        if output_path:
            with open(output_path, 'w') as f:
                f.write(report_content)
        
        return report_content


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description='Document Version Control System')
    parser.add_argument('command', choices=['track', 'commit', 'list', 'diff', 
                                          'rollback', 'report', 'status'],
                       help='Command to execute')
    parser.add_argument('file_path', nargs='?', help='Path to file')
    parser.add_argument('--message', '-m', help='Commit message')
    parser.add_argument('--author', '-a', default='system', help='Author name')
    parser.add_argument('--version', '-v', help='Version ID')
    parser.add_argument('--version2', help='Second version ID for diff')
    parser.add_argument('--output', '-o', help='Output file path')
    parser.add_argument('--config', help='Path to configuration file')
    parser.add_argument('--all', action='store_true', help='Track all files')
    
    args = parser.parse_args()
    
    # Initialize
    config = VersionConfig(args.config)
    manager = VersionManager(config)
    
    try:
        if args.command == 'track':
            if args.all:
                results = manager.track_all_files()
                print(f"Tracked: {len(results['tracked'])} files")
                print(f"Skipped: {len(results['skipped'])} files")
            elif args.file_path:
                version = manager.create_version(
                    args.file_path,
                    message=args.message or "Manual tracking",
                    author=args.author
                )
                if version:
                    print(f"Tracked {args.file_path} - version {version.version_id}")
                else:
                    print(f"Failed to track {args.file_path}")
            else:
                print("Error: Specify --all or provide a file path")
                sys.exit(1)
        
        elif args.command == 'commit':
            if not args.file_path:
                print("Error: File path required")
                sys.exit(1)
            
            version = manager.create_version(
                args.file_path,
                message=args.message or "Manual commit",
                author=args.author
            )
            
            if version:
                print(f"Created version {version.version_id} for {args.file_path}")
            else:
                print("No changes or error creating version")
        
        elif args.command == 'list':
            if not args.file_path:
                # List all tracked files
                print("\nTracked files:")
                print("-" * 50)
                for file_key, file_info in manager.index.items():
                    print(f"{file_info['file_path']} ({len(file_info['versions'])} versions)")
            else:
                # List versions for specific file
                versions = manager.list_versions(args.file_path)
                
                if not versions:
                    print(f"No versions found for {args.file_path}")
                else:
                    print(f"\nVersions for {args.file_path}:")
                    print("-" * 80)
                    for v in reversed(versions):
                        print(f"{v['version_id']} | {v['timestamp']} | {v['author']:10} | {v['message']}")
        
        elif args.command == 'diff':
            if not args.file_path:
                print("Error: File path required")
                sys.exit(1)
            
            if not args.version:
                # Show diff between latest version and current
                latest = manager.get_latest_version(args.file_path)
                if latest:
                    diff = manager.get_diff(args.file_path, latest.version_id)
                else:
                    print("No versions found")
                    sys.exit(1)
            else:
                diff = manager.get_diff(args.file_path, args.version, args.version2)
            
            if diff:
                print(diff)
            else:
                print("No differences found or error generating diff")
        
        elif args.command == 'rollback':
            if not args.file_path or not args.version:
                print("Error: File path and version required")
                sys.exit(1)
            
            if manager.rollback(args.file_path, args.version):
                print(f"Successfully rolled back {args.file_path} to version {args.version}")
            else:
                print("Rollback failed")
                sys.exit(1)
        
        elif args.command == 'report':
            report = manager.generate_version_report(args.output)
            
            if args.output:
                print(f"Report saved to {args.output}")
            else:
                print(report)
        
        elif args.command == 'status':
            # Show general status
            total_files = len(manager.index)
            total_versions = sum(len(info['versions']) for info in manager.index.values())
            
            print("\nVersion Control Status:")
            print("-" * 40)
            print(f"Tracked files:    {total_files}")
            print(f"Total versions:   {total_versions}")
            print(f"Version storage:  {manager.version_dir}")
            
            # Check for uncommitted changes
            print("\nChecking for changes...")
            changes_found = False
            
            for file_key, file_info in manager.index.items():
                file_path = file_info['file_path']
                if os.path.exists(file_path):
                    latest = manager.get_latest_version(file_path)
                    if latest:
                        try:
                            with open(file_path, 'r', encoding='utf-8') as f:
                                current_content = f.read()
                            current_checksum = hashlib.sha256(current_content.encode()).hexdigest()
                            
                            if current_checksum != latest.checksum:
                                print(f"  Modified: {file_path}")
                                changes_found = True
                        except Exception:
                            pass
            
            if not changes_found:
                print("  No uncommitted changes")
    
    except Exception as e:
        logger.error(f"Operation failed: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()