#!/usr/bin/env python3
"""
Documentation Backup and Version Control Monitoring
Monitors the health and status of the backup system
"""

import os
import sys
import json
import argparse
from datetime import datetime, timedelta
from pathlib import Path
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class BackupMonitor:
    """Monitors backup and version control system health"""
    
    def __init__(self):
        self.script_dir = Path(__file__).parent
        self.backup_dir = Path("/opt/nscale-assist/backups")
        self.version_dir = Path("/opt/nscale-assist/versions")
        self.log_dir = Path("/opt/nscale-assist/logs/doc_automation")
        
        # Load configurations
        self.backup_config = self.load_json(self.script_dir / "backup_config.json")
        self.version_config = self.load_json(self.script_dir / "version_config.json")
        
        # Alert thresholds
        self.thresholds = {
            'backup_age_hours': 26,  # Alert if no backup in 26 hours
            'version_age_hours': 2,  # Alert if no version tracking in 2 hours
            'disk_usage_percent': 80,  # Alert if disk usage > 80%
            'backup_size_gb': 40,  # Alert if total backup size > 40GB
            'failed_operations': 3  # Alert if more than 3 failed operations
        }
    
    def load_json(self, path: Path) -> dict:
        """Load JSON configuration file"""
        try:
            if path.exists():
                with open(path, 'r') as f:
                    return json.load(f)
        except Exception as e:
            logger.error(f"Error loading {path}: {e}")
        return {}
    
    def check_last_backup(self) -> dict:
        """Check when the last backup was created"""
        result = {
            'status': 'unknown',
            'last_backup': None,
            'age_hours': None,
            'message': ''
        }
        
        metadata_dir = self.backup_dir / 'metadata'
        if not metadata_dir.exists():
            result['status'] = 'error'
            result['message'] = 'Metadata directory not found'
            return result
        
        # Find most recent metadata file
        metadata_files = sorted(metadata_dir.glob('*.json'), reverse=True)
        if not metadata_files:
            result['status'] = 'error'
            result['message'] = 'No backup metadata found'
            return result
        
        # Check latest backup
        try:
            with open(metadata_files[0], 'r') as f:
                latest_backup = json.load(f)
            
            timestamp = latest_backup.get('timestamp', '')
            backup_time = datetime.strptime(timestamp, '%Y%m%d_%H%M%S')
            age = datetime.now() - backup_time
            age_hours = age.total_seconds() / 3600
            
            result['last_backup'] = timestamp
            result['age_hours'] = age_hours
            
            if age_hours > self.thresholds['backup_age_hours']:
                result['status'] = 'warning'
                result['message'] = f'Last backup is {age_hours:.1f} hours old'
            else:
                result['status'] = 'ok'
                result['message'] = f'Last backup: {timestamp} ({age_hours:.1f} hours ago)'
            
        except Exception as e:
            result['status'] = 'error'
            result['message'] = f'Error checking backup: {e}'
        
        return result
    
    def check_last_version_tracking(self) -> dict:
        """Check when documents were last tracked"""
        result = {
            'status': 'unknown',
            'last_tracking': None,
            'tracked_files': 0,
            'message': ''
        }
        
        index_file = self.version_dir / 'index' / 'version_index.json'
        if not index_file.exists():
            result['status'] = 'error'
            result['message'] = 'Version index not found'
            return result
        
        try:
            with open(index_file, 'r') as f:
                index = json.load(f)
            
            # Find most recent version
            most_recent = None
            total_files = len(index)
            
            for file_key, file_info in index.items():
                versions = file_info.get('versions', [])
                if versions:
                    latest = versions[-1]
                    timestamp = latest.get('timestamp', '')
                    if not most_recent or timestamp > most_recent:
                        most_recent = timestamp
            
            if most_recent:
                tracking_time = datetime.fromisoformat(most_recent)
                age = datetime.now() - tracking_time
                age_hours = age.total_seconds() / 3600
                
                result['last_tracking'] = most_recent
                result['tracked_files'] = total_files
                
                if age_hours > self.thresholds['version_age_hours']:
                    result['status'] = 'warning'
                    result['message'] = f'Last tracking is {age_hours:.1f} hours old'
                else:
                    result['status'] = 'ok'
                    result['message'] = f'Tracking {total_files} files, last update {age_hours:.1f} hours ago'
            else:
                result['status'] = 'error'
                result['message'] = 'No version tracking found'
            
        except Exception as e:
            result['status'] = 'error'
            result['message'] = f'Error checking versions: {e}'
        
        return result
    
    def check_disk_usage(self) -> dict:
        """Check disk usage for backup and version directories"""
        result = {
            'status': 'ok',
            'backup_size_gb': 0,
            'version_size_gb': 0,
            'total_size_gb': 0,
            'disk_usage_percent': 0,
            'message': ''
        }
        
        try:
            # Calculate directory sizes
            backup_size = sum(f.stat().st_size for f in self.backup_dir.rglob('*') if f.is_file())
            version_size = sum(f.stat().st_size for f in self.version_dir.rglob('*') if f.is_file())
            
            result['backup_size_gb'] = backup_size / (1024**3)
            result['version_size_gb'] = version_size / (1024**3)
            result['total_size_gb'] = result['backup_size_gb'] + result['version_size_gb']
            
            # Check disk usage
            import shutil
            total, used, free = shutil.disk_usage('/')
            result['disk_usage_percent'] = (used / total) * 100
            
            # Check thresholds
            if result['total_size_gb'] > self.thresholds['backup_size_gb']:
                result['status'] = 'warning'
                result['message'] = f'Total backup size ({result["total_size_gb"]:.1f}GB) exceeds threshold'
            elif result['disk_usage_percent'] > self.thresholds['disk_usage_percent']:
                result['status'] = 'warning'
                result['message'] = f'Disk usage ({result["disk_usage_percent"]:.1f}%) exceeds threshold'
            else:
                result['message'] = f'Disk usage OK: {result["disk_usage_percent"]:.1f}%'
            
        except Exception as e:
            result['status'] = 'error'
            result['message'] = f'Error checking disk usage: {e}'
        
        return result
    
    def check_recent_errors(self) -> dict:
        """Check for recent errors in log files"""
        result = {
            'status': 'ok',
            'error_count': 0,
            'recent_errors': [],
            'message': ''
        }
        
        if not self.log_dir.exists():
            result['status'] = 'warning'
            result['message'] = 'Log directory not found'
            return result
        
        try:
            # Check today's log
            today = datetime.now().strftime('%Y%m%d')
            log_file = self.log_dir / f'automation_{today}.log'
            
            if log_file.exists():
                with open(log_file, 'r') as f:
                    lines = f.readlines()
                
                errors = [line.strip() for line in lines if 'ERROR' in line]
                result['error_count'] = len(errors)
                result['recent_errors'] = errors[-5:]  # Last 5 errors
                
                if result['error_count'] > self.thresholds['failed_operations']:
                    result['status'] = 'warning'
                    result['message'] = f'Found {result["error_count"]} errors in recent operations'
                else:
                    result['message'] = f'No significant errors found'
            else:
                result['message'] = 'No log file for today'
            
        except Exception as e:
            result['status'] = 'error'
            result['message'] = f'Error checking logs: {e}'
        
        return result
    
    def generate_report(self) -> str:
        """Generate a comprehensive health report"""
        report_lines = []
        report_lines.append("Documentation Backup System Health Report")
        report_lines.append("=" * 60)
        report_lines.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report_lines.append("")
        
        # Check all components
        backup_check = self.check_last_backup()
        version_check = self.check_last_version_tracking()
        disk_check = self.check_disk_usage()
        error_check = self.check_recent_errors()
        
        # Overall status
        all_checks = [backup_check, version_check, disk_check, error_check]
        if any(check['status'] == 'error' for check in all_checks):
            overall_status = 'ERROR'
        elif any(check['status'] == 'warning' for check in all_checks):
            overall_status = 'WARNING'
        else:
            overall_status = 'OK'
        
        report_lines.append(f"Overall Status: {overall_status}")
        report_lines.append("")
        
        # Backup status
        report_lines.append("Backup Status:")
        report_lines.append(f"  Status: {backup_check['status'].upper()}")
        report_lines.append(f"  {backup_check['message']}")
        report_lines.append("")
        
        # Version control status
        report_lines.append("Version Control Status:")
        report_lines.append(f"  Status: {version_check['status'].upper()}")
        report_lines.append(f"  {version_check['message']}")
        report_lines.append("")
        
        # Disk usage
        report_lines.append("Disk Usage:")
        report_lines.append(f"  Status: {disk_check['status'].upper()}")
        report_lines.append(f"  Backup size: {disk_check['backup_size_gb']:.2f} GB")
        report_lines.append(f"  Version size: {disk_check['version_size_gb']:.2f} GB")
        report_lines.append(f"  Total size: {disk_check['total_size_gb']:.2f} GB")
        report_lines.append(f"  Disk usage: {disk_check['disk_usage_percent']:.1f}%")
        report_lines.append("")
        
        # Recent errors
        report_lines.append("Recent Errors:")
        report_lines.append(f"  Status: {error_check['status'].upper()}")
        report_lines.append(f"  Error count: {error_check['error_count']}")
        if error_check['recent_errors']:
            report_lines.append("  Recent errors:")
            for error in error_check['recent_errors']:
                report_lines.append(f"    - {error}")
        report_lines.append("")
        
        # Recommendations
        report_lines.append("Recommendations:")
        if overall_status != 'OK':
            if backup_check['status'] != 'ok':
                report_lines.append("  - Check backup automation schedule")
            if version_check['status'] != 'ok':
                report_lines.append("  - Check version tracking automation")
            if disk_check['status'] != 'ok':
                report_lines.append("  - Consider cleaning old backups or increasing storage")
            if error_check['status'] != 'ok':
                report_lines.append("  - Review error logs and fix issues")
        else:
            report_lines.append("  - All systems operating normally")
        
        return '\n'.join(report_lines)
    
    def send_alert(self, report: str, email_config: dict = None):
        """Send email alert if issues are found"""
        if not email_config:
            email_config = self.backup_config.get('email_notifications', {})
        
        if not email_config.get('enabled'):
            logger.info("Email notifications disabled")
            return
        
        try:
            msg = MIMEMultipart()
            msg['From'] = email_config.get('from_address', 'backup@localhost')
            msg['To'] = ', '.join(email_config.get('to_addresses', []))
            msg['Subject'] = f'Backup System Alert - {datetime.now().strftime("%Y-%m-%d")}'
            
            msg.attach(MIMEText(report, 'plain'))
            
            server = smtplib.SMTP(
                email_config.get('smtp_server', 'localhost'),
                email_config.get('smtp_port', 25)
            )
            
            server.send_message(msg)
            server.quit()
            
            logger.info("Alert email sent successfully")
            
        except Exception as e:
            logger.error(f"Failed to send email alert: {e}")


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description='Backup System Monitor')
    parser.add_argument('--check', action='store_true', 
                       help='Run all checks and display results')
    parser.add_argument('--alert', action='store_true',
                       help='Send email alert if issues found')
    parser.add_argument('--output', '-o', help='Save report to file')
    
    args = parser.parse_args()
    
    monitor = BackupMonitor()
    
    # Generate report
    report = monitor.generate_report()
    
    # Display or save report
    if args.output:
        with open(args.output, 'w') as f:
            f.write(report)
        print(f"Report saved to {args.output}")
    else:
        print(report)
    
    # Send alert if requested and issues found
    if args.alert and ('WARNING' in report or 'ERROR' in report):
        monitor.send_alert(report)
    
    # Exit with appropriate code
    if 'ERROR' in report:
        sys.exit(2)
    elif 'WARNING' in report:
        sys.exit(1)
    else:
        sys.exit(0)


if __name__ == '__main__':
    main()