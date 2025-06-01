# Documentation Backup and Version Control System

A comprehensive backup and versioning system for documentation with automated scheduling, retention policies, and monitoring capabilities.

## Components

### 1. doc_backup.py
Full-featured backup system with:
- **Full backups**: Complete snapshot of all documentation
- **Incremental backups**: Only changed files since last backup
- **Compression**: Efficient storage with configurable compression levels
- **Retention policies**: Automatic cleanup of old backups (daily, weekly, monthly)
- **Integrity verification**: Checksum validation for all backups

### 2. doc_version_control.py
Version control system with:
- **Automatic tracking**: Track changes to documentation files
- **Version history**: Complete history of all document changes
- **Diff viewing**: Compare versions to see what changed
- **Rollback**: Restore documents to previous versions
- **Compression**: Efficient storage of version history

### 3. doc_automation.sh
Automation script that combines backup and version control:
- **Daily operations**: Incremental backup + version tracking
- **Weekly operations**: Full backup + cleanup
- **Health checks**: Monitor system status
- **Emergency backup**: Quick backup in critical situations

### 4. doc_backup_monitor.py
Monitoring system with:
- **Health checks**: Monitor backup age, disk usage, errors
- **Alerting**: Email notifications for issues
- **Reporting**: Comprehensive status reports

## Quick Start

### Initial Setup
```bash
# Create initial full backup
./doc_backup.py backup --type full

# Track all existing documents
./doc_version_control.py track --all

# Check system status
./doc_backup_monitor.py --check
```

### Daily Usage
```bash
# Run daily operations (tracking + incremental backup)
./doc_automation.sh daily

# Create a manual version before major changes
./doc_version_control.py commit /path/to/document.md -m "Before major update"

# View document history
./doc_version_control.py list /path/to/document.md
```

### Restoration
```bash
# List available backups
./doc_backup.py list

# Restore from backup
./doc_backup.py restore --backup-path /path/to/backup.tar.gz --restore-dir /restore/location

# Rollback a single file to previous version
./doc_version_control.py rollback /path/to/document.md --version VERSION_ID
```

## Automation Setup

### Using Cron
Copy the provided cron configuration:
```bash
sudo cp doc_backup_cron /etc/cron.d/
sudo systemctl restart cron
```

### Using Systemd Timers
Create systemd timer units for more control over scheduling.

## Configuration

### backup_config.json
- `backup_dir`: Where backups are stored
- `source_dirs`: Directories to backup
- `retention_policies`: How long to keep backups
- `compression_level`: 1-9 (higher = better compression, slower)
- `exclude_patterns`: Files/directories to skip

### version_config.json
- `version_dir`: Where versions are stored
- `tracked_dirs`: Directories to track
- `max_versions_per_file`: Version history limit
- `track_file_patterns`: File types to track
- `enable_compression`: Compress version storage

## Best Practices

1. **Regular Monitoring**
   - Run health checks daily
   - Review monitoring reports weekly
   - Check disk usage monthly

2. **Backup Strategy**
   - Daily incremental backups during work hours
   - Weekly full backups during off-hours
   - Monthly archival backups for long-term storage

3. **Version Control**
   - Commit before major changes
   - Use descriptive commit messages
   - Review version history regularly

4. **Storage Management**
   - Monitor disk usage
   - Adjust retention policies as needed
   - Consider off-site backup storage

## Troubleshooting

### Common Issues

1. **Backup failures**
   - Check disk space
   - Verify source directories exist
   - Check file permissions

2. **Version tracking issues**
   - Ensure files match tracking patterns
   - Check version storage disk space
   - Verify file encoding (UTF-8)

3. **Performance issues**
   - Adjust compression levels
   - Exclude large binary files
   - Schedule during off-peak hours

### Emergency Recovery

In case of system failure:
```bash
# Create emergency backup
./doc_automation.sh emergency

# Find latest backup
./doc_backup.py list

# Restore to temporary location
./doc_backup.py restore --backup-path LATEST_BACKUP --restore-dir /tmp/restore

# Verify and copy back
```

## Maintenance

### Weekly Tasks
- Review monitoring reports
- Check backup integrity
- Clean up old logs

### Monthly Tasks
- Review retention policies
- Optimize storage usage
- Update exclude patterns

### Quarterly Tasks
- Test restoration procedures
- Review backup strategy
- Update documentation

## Security Considerations

1. **Access Control**
   - Restrict backup directory permissions
   - Use dedicated backup user account
   - Audit access logs

2. **Encryption** (future enhancement)
   - Consider encrypting sensitive backups
   - Secure key management
   - Regular security audits

3. **Integrity**
   - Verify checksums regularly
   - Test restoration procedures
   - Maintain backup logs

## Support

For issues or questions:
1. Check the logs in `/opt/nscale-assist/logs/doc_automation/`
2. Run health check: `./doc_backup_monitor.py --check`
3. Review this documentation
4. Contact system administrator