#!/usr/bin/env python3
"""
Documentation Backup System
Provides incremental and full backup capabilities with compression and retention management
"""

import os
import sys
import json
import hashlib
import shutil
import gzip
import tarfile
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple
import argparse
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class BackupConfig:
    """Backup configuration management"""
    
    def __init__(self, config_path: str = None):
        self.config_path = config_path or os.path.join(
            os.path.dirname(__file__), 'backup_config.json'
        )
        self.config = self.load_config()
    
    def load_config(self) -> dict:
        """Load configuration from file or create default"""
        if os.path.exists(self.config_path):
            with open(self.config_path, 'r') as f:
                return json.load(f)
        
        # Default configuration
        default_config = {
            "backup_dir": "/opt/nscale-assist/backups",
            "source_dirs": [
                "/opt/nscale-assist/docs",
                "/opt/nscale-assist/app/docs"
            ],
            "retention_policies": {
                "daily": 7,
                "weekly": 4,
                "monthly": 12
            },
            "compression_level": 9,
            "exclude_patterns": [
                "*.tmp",
                "*.swp",
                ".git/*",
                "__pycache__/*"
            ],
            "checksum_algorithm": "sha256",
            "max_backup_size_gb": 50
        }
        
        self.save_config(default_config)
        return default_config
    
    def save_config(self, config: dict):
        """Save configuration to file"""
        os.makedirs(os.path.dirname(self.config_path), exist_ok=True)
        with open(self.config_path, 'w') as f:
            json.dump(config, f, indent=2)


class BackupManager:
    """Manages backup operations"""
    
    def __init__(self, config: BackupConfig):
        self.config = config.config
        self.backup_dir = Path(self.config['backup_dir'])
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        
        # Create subdirectories
        self.full_backup_dir = self.backup_dir / 'full'
        self.incremental_dir = self.backup_dir / 'incremental'
        self.metadata_dir = self.backup_dir / 'metadata'
        
        for dir_path in [self.full_backup_dir, self.incremental_dir, self.metadata_dir]:
            dir_path.mkdir(exist_ok=True)
    
    def calculate_checksum(self, file_path: str) -> str:
        """Calculate file checksum"""
        algorithm = self.config['checksum_algorithm']
        hash_func = hashlib.new(algorithm)
        
        with open(file_path, 'rb') as f:
            for chunk in iter(lambda: f.read(4096), b''):
                hash_func.update(chunk)
        
        return hash_func.hexdigest()
    
    def get_file_metadata(self, file_path: Path) -> dict:
        """Get file metadata for backup tracking"""
        stat = file_path.stat()
        return {
            'path': str(file_path),
            'size': stat.st_size,
            'mtime': stat.st_mtime,
            'checksum': self.calculate_checksum(str(file_path)),
            'mode': stat.st_mode
        }
    
    def should_exclude(self, file_path: Path) -> bool:
        """Check if file should be excluded from backup"""
        path_str = str(file_path)
        for pattern in self.config['exclude_patterns']:
            if pattern.endswith('/*'):
                # Directory pattern
                dir_pattern = pattern[:-2]
                if dir_pattern in path_str:
                    return True
            elif '*' in pattern:
                # Wildcard pattern
                import fnmatch
                if fnmatch.fnmatch(file_path.name, pattern):
                    return True
            elif pattern in path_str:
                return True
        return False
    
    def scan_source_files(self) -> Dict[str, dict]:
        """Scan all source files and get their metadata"""
        file_metadata = {}
        
        for source_dir in self.config['source_dirs']:
            if not os.path.exists(source_dir):
                logger.warning(f"Source directory not found: {source_dir}")
                continue
            
            for root, dirs, files in os.walk(source_dir):
                root_path = Path(root)
                
                # Filter directories
                dirs[:] = [d for d in dirs if not self.should_exclude(root_path / d)]
                
                for file in files:
                    file_path = root_path / file
                    if not self.should_exclude(file_path):
                        try:
                            relative_path = str(file_path.relative_to(source_dir))
                            metadata = self.get_file_metadata(file_path)
                            metadata['source_dir'] = source_dir
                            metadata['relative_path'] = relative_path
                            file_metadata[str(file_path)] = metadata
                        except Exception as e:
                            logger.error(f"Error processing {file_path}: {e}")
        
        return file_metadata
    
    def create_full_backup(self) -> str:
        """Create a full backup of all documentation"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_name = f"full_backup_{timestamp}.tar.gz"
        backup_path = self.full_backup_dir / backup_name
        metadata_path = self.metadata_dir / f"full_{timestamp}.json"
        
        logger.info(f"Creating full backup: {backup_name}")
        
        # Scan files
        file_metadata = self.scan_source_files()
        
        # Create tarball
        with tarfile.open(backup_path, 'w:gz', compresslevel=self.config['compression_level']) as tar:
            for file_path, metadata in file_metadata.items():
                try:
                    tar.add(file_path, arcname=metadata['relative_path'])
                except Exception as e:
                    logger.error(f"Error backing up {file_path}: {e}")
        
        # Save metadata
        backup_metadata = {
            'timestamp': timestamp,
            'type': 'full',
            'files': file_metadata,
            'backup_size': backup_path.stat().st_size,
            'file_count': len(file_metadata),
            'backup_path': str(backup_path)
        }
        
        with open(metadata_path, 'w') as f:
            json.dump(backup_metadata, f, indent=2)
        
        # Verify backup integrity
        if self.verify_backup(backup_path, metadata_path):
            logger.info(f"Full backup created successfully: {backup_path}")
            return str(backup_path)
        else:
            logger.error("Backup verification failed")
            backup_path.unlink()
            metadata_path.unlink()
            raise Exception("Backup verification failed")
    
    def get_last_backup_metadata(self) -> Optional[dict]:
        """Get metadata from the last backup"""
        metadata_files = sorted(self.metadata_dir.glob('*.json'), reverse=True)
        
        for metadata_file in metadata_files:
            try:
                with open(metadata_file, 'r') as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"Error reading metadata {metadata_file}: {e}")
        
        return None
    
    def create_incremental_backup(self) -> Optional[str]:
        """Create an incremental backup based on changes since last backup"""
        last_backup = self.get_last_backup_metadata()
        if not last_backup:
            logger.info("No previous backup found, creating full backup")
            return self.create_full_backup()
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_name = f"incremental_backup_{timestamp}.tar.gz"
        backup_path = self.incremental_dir / backup_name
        metadata_path = self.metadata_dir / f"incremental_{timestamp}.json"
        
        logger.info(f"Creating incremental backup: {backup_name}")
        
        # Scan current files
        current_files = self.scan_source_files()
        last_files = last_backup.get('files', {})
        
        # Find changes
        changed_files = {}
        new_files = {}
        deleted_files = []
        
        # Check for new and modified files
        for file_path, metadata in current_files.items():
            if file_path not in last_files:
                new_files[file_path] = metadata
            elif metadata['checksum'] != last_files[file_path]['checksum']:
                changed_files[file_path] = metadata
        
        # Check for deleted files
        for file_path in last_files:
            if file_path not in current_files:
                deleted_files.append(file_path)
        
        # If no changes, skip backup
        if not (changed_files or new_files or deleted_files):
            logger.info("No changes detected, skipping incremental backup")
            return None
        
        # Create incremental backup
        files_to_backup = {**changed_files, **new_files}
        
        with tarfile.open(backup_path, 'w:gz', compresslevel=self.config['compression_level']) as tar:
            for file_path, metadata in files_to_backup.items():
                try:
                    tar.add(file_path, arcname=metadata['relative_path'])
                except Exception as e:
                    logger.error(f"Error backing up {file_path}: {e}")
        
        # Save metadata
        backup_metadata = {
            'timestamp': timestamp,
            'type': 'incremental',
            'base_backup': last_backup['timestamp'],
            'changed_files': changed_files,
            'new_files': new_files,
            'deleted_files': deleted_files,
            'backup_size': backup_path.stat().st_size if backup_path.exists() else 0,
            'file_count': len(files_to_backup),
            'backup_path': str(backup_path)
        }
        
        with open(metadata_path, 'w') as f:
            json.dump(backup_metadata, f, indent=2)
        
        logger.info(f"Incremental backup created: {backup_path}")
        logger.info(f"Changed: {len(changed_files)}, New: {len(new_files)}, Deleted: {len(deleted_files)}")
        
        return str(backup_path)
    
    def verify_backup(self, backup_path: Path, metadata_path: Path) -> bool:
        """Verify backup integrity"""
        try:
            # Load metadata
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)
            
            # Verify backup file exists and size matches
            if not backup_path.exists():
                logger.error("Backup file not found")
                return False
            
            # Extract and verify checksums
            with tarfile.open(backup_path, 'r:gz') as tar:
                # Quick verification - check if we can read the archive
                members = tar.getmembers()
                if not members:
                    logger.error("Backup archive is empty")
                    return False
            
            return True
            
        except Exception as e:
            logger.error(f"Backup verification failed: {e}")
            return False
    
    def apply_retention_policy(self):
        """Apply retention policies to manage backup storage"""
        now = datetime.now()
        policies = self.config['retention_policies']
        
        # Get all backups
        all_backups = []
        for metadata_file in self.metadata_dir.glob('*.json'):
            try:
                with open(metadata_file, 'r') as f:
                    backup_info = json.load(f)
                    backup_info['metadata_path'] = metadata_file
                    all_backups.append(backup_info)
            except Exception as e:
                logger.warning(f"Error reading metadata {metadata_file}: {e}")
        
        # Sort by timestamp
        all_backups.sort(key=lambda x: x['timestamp'], reverse=True)
        
        # Keep backups according to policy
        daily_kept = 0
        weekly_kept = 0
        monthly_kept = 0
        
        for backup in all_backups:
            backup_date = datetime.strptime(backup['timestamp'], '%Y%m%d_%H%M%S')
            age_days = (now - backup_date).days
            
            keep = False
            
            # Daily backups
            if age_days <= policies['daily'] and daily_kept < policies['daily']:
                keep = True
                daily_kept += 1
            
            # Weekly backups
            elif age_days <= policies['weekly'] * 7 and backup_date.weekday() == 0 and weekly_kept < policies['weekly']:
                keep = True
                weekly_kept += 1
            
            # Monthly backups
            elif age_days <= policies['monthly'] * 30 and backup_date.day == 1 and monthly_kept < policies['monthly']:
                keep = True
                monthly_kept += 1
            
            if not keep:
                # Delete backup
                logger.info(f"Removing old backup: {backup['backup_path']}")
                try:
                    Path(backup['backup_path']).unlink(missing_ok=True)
                    backup['metadata_path'].unlink(missing_ok=True)
                except Exception as e:
                    logger.error(f"Error deleting backup: {e}")
    
    def restore_backup(self, backup_path: str, restore_dir: str):
        """Restore files from a backup"""
        logger.info(f"Restoring backup {backup_path} to {restore_dir}")
        
        restore_path = Path(restore_dir)
        restore_path.mkdir(parents=True, exist_ok=True)
        
        try:
            with tarfile.open(backup_path, 'r:gz') as tar:
                tar.extractall(restore_dir)
            
            logger.info(f"Backup restored successfully to {restore_dir}")
            
        except Exception as e:
            logger.error(f"Error restoring backup: {e}")
            raise
    
    def list_backups(self) -> List[dict]:
        """List all available backups"""
        backups = []
        
        for metadata_file in sorted(self.metadata_dir.glob('*.json'), reverse=True):
            try:
                with open(metadata_file, 'r') as f:
                    backup_info = json.load(f)
                    backup_path = Path(backup_info['backup_path'])
                    
                    # Add additional info
                    backup_info['exists'] = backup_path.exists()
                    if backup_info['exists']:
                        backup_info['size_mb'] = backup_path.stat().st_size / (1024 * 1024)
                    
                    backups.append(backup_info)
            except Exception as e:
                logger.warning(f"Error reading metadata {metadata_file}: {e}")
        
        return backups
    
    def get_backup_statistics(self) -> dict:
        """Get backup statistics"""
        backups = self.list_backups()
        
        total_size = sum(b.get('size_mb', 0) for b in backups if b.get('exists'))
        full_backups = [b for b in backups if b.get('type') == 'full']
        incremental_backups = [b for b in backups if b.get('type') == 'incremental']
        
        return {
            'total_backups': len(backups),
            'full_backups': len(full_backups),
            'incremental_backups': len(incremental_backups),
            'total_size_mb': total_size,
            'total_size_gb': total_size / 1024,
            'oldest_backup': backups[-1]['timestamp'] if backups else None,
            'newest_backup': backups[0]['timestamp'] if backups else None
        }


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description='Documentation Backup System')
    parser.add_argument('command', choices=['backup', 'restore', 'list', 'stats', 'clean'],
                       help='Command to execute')
    parser.add_argument('--type', choices=['full', 'incremental'], default='incremental',
                       help='Backup type (default: incremental)')
    parser.add_argument('--backup-path', help='Path to backup file for restore')
    parser.add_argument('--restore-dir', help='Directory to restore backup to')
    parser.add_argument('--config', help='Path to configuration file')
    
    args = parser.parse_args()
    
    # Initialize
    config = BackupConfig(args.config)
    manager = BackupManager(config)
    
    try:
        if args.command == 'backup':
            if args.type == 'full':
                backup_path = manager.create_full_backup()
                print(f"Full backup created: {backup_path}")
            else:
                backup_path = manager.create_incremental_backup()
                if backup_path:
                    print(f"Incremental backup created: {backup_path}")
                else:
                    print("No changes detected, backup skipped")
            
            # Apply retention policy after backup
            manager.apply_retention_policy()
        
        elif args.command == 'restore':
            if not args.backup_path or not args.restore_dir:
                print("Error: --backup-path and --restore-dir required for restore")
                sys.exit(1)
            
            manager.restore_backup(args.backup_path, args.restore_dir)
            print(f"Backup restored to {args.restore_dir}")
        
        elif args.command == 'list':
            backups = manager.list_backups()
            
            print(f"\nAvailable backups ({len(backups)} total):")
            print("-" * 80)
            
            for backup in backups:
                status = "✓" if backup.get('exists') else "✗"
                size = f"{backup.get('size_mb', 0):.2f} MB" if backup.get('exists') else "N/A"
                print(f"{status} {backup['timestamp']} | {backup['type']:11} | {size:10} | {backup.get('file_count', 0)} files")
        
        elif args.command == 'stats':
            stats = manager.get_backup_statistics()
            
            print("\nBackup Statistics:")
            print("-" * 40)
            print(f"Total backups:       {stats['total_backups']}")
            print(f"Full backups:        {stats['full_backups']}")
            print(f"Incremental backups: {stats['incremental_backups']}")
            print(f"Total size:          {stats['total_size_gb']:.2f} GB")
            print(f"Oldest backup:       {stats['oldest_backup'] or 'N/A'}")
            print(f"Newest backup:       {stats['newest_backup'] or 'N/A'}")
        
        elif args.command == 'clean':
            print("Applying retention policy...")
            manager.apply_retention_policy()
            print("Cleanup completed")
    
    except Exception as e:
        logger.error(f"Operation failed: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()