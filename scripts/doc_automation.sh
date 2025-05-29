#!/bin/bash

# Documentation Backup and Version Control Automation Script
# This script automates backup and version control operations

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_SCRIPT="$SCRIPT_DIR/doc_backup.py"
VERSION_SCRIPT="$SCRIPT_DIR/doc_version_control.py"
LOG_DIR="/opt/nscale-assist/logs/doc_automation"
LOG_FILE="$LOG_DIR/automation_$(date +%Y%m%d).log"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Error handling
error_exit() {
    log "ERROR: $1"
    exit 1
}

# Check if scripts exist
[[ ! -f "$BACKUP_SCRIPT" ]] && error_exit "Backup script not found: $BACKUP_SCRIPT"
[[ ! -f "$VERSION_SCRIPT" ]] && error_exit "Version control script not found: $VERSION_SCRIPT"

# Function to perform daily operations
daily_operations() {
    log "Starting daily documentation operations..."
    
    # Track changes in version control
    log "Tracking document changes..."
    python3 "$VERSION_SCRIPT" track --all --message "Daily automatic tracking" 2>&1 | tee -a "$LOG_FILE"
    
    # Create incremental backup
    log "Creating incremental backup..."
    python3 "$BACKUP_SCRIPT" backup --type incremental 2>&1 | tee -a "$LOG_FILE"
    
    # Generate version report
    log "Generating version report..."
    REPORT_FILE="$LOG_DIR/version_report_$(date +%Y%m%d).txt"
    python3 "$VERSION_SCRIPT" report --output "$REPORT_FILE" 2>&1 | tee -a "$LOG_FILE"
    
    log "Daily operations completed"
}

# Function to perform weekly operations
weekly_operations() {
    log "Starting weekly documentation operations..."
    
    # Create full backup
    log "Creating full backup..."
    python3 "$BACKUP_SCRIPT" backup --type full 2>&1 | tee -a "$LOG_FILE"
    
    # Clean old backups
    log "Applying retention policy..."
    python3 "$BACKUP_SCRIPT" clean 2>&1 | tee -a "$LOG_FILE"
    
    # Show backup statistics
    log "Backup statistics:"
    python3 "$BACKUP_SCRIPT" stats 2>&1 | tee -a "$LOG_FILE"
    
    log "Weekly operations completed"
}

# Function to check documentation health
check_health() {
    log "Performing health check..."
    
    # Check backup status
    BACKUP_COUNT=$(python3 "$BACKUP_SCRIPT" list | grep -c "✓")
    log "Available backups: $BACKUP_COUNT"
    
    # Check version control status
    python3 "$VERSION_SCRIPT" status 2>&1 | tee -a "$LOG_FILE"
    
    # Check disk space
    BACKUP_DIR="/opt/nscale-assist/backups"
    VERSION_DIR="/opt/nscale-assist/versions"
    
    if [[ -d "$BACKUP_DIR" ]]; then
        BACKUP_SIZE=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
        log "Backup directory size: $BACKUP_SIZE"
    fi
    
    if [[ -d "$VERSION_DIR" ]]; then
        VERSION_SIZE=$(du -sh "$VERSION_DIR" 2>/dev/null | cut -f1)
        log "Version directory size: $VERSION_SIZE"
    fi
    
    # Check for large files
    log "Large documentation files (>10MB):"
    find /opt/nscale-assist/docs /opt/nscale-assist/app/docs -type f -size +10M 2>/dev/null | while read -r file; do
        SIZE=$(du -h "$file" | cut -f1)
        log "  $file ($SIZE)"
    done
}

# Function to perform emergency backup
emergency_backup() {
    log "EMERGENCY: Creating emergency backup..."
    
    # Track all current changes
    python3 "$VERSION_SCRIPT" track --all --message "Emergency backup" --author "emergency" 2>&1 | tee -a "$LOG_FILE"
    
    # Create full backup with timestamp
    python3 "$BACKUP_SCRIPT" backup --type full 2>&1 | tee -a "$LOG_FILE"
    
    # Create a separate emergency archive
    EMERGENCY_DIR="/opt/nscale-assist/emergency_backups"
    mkdir -p "$EMERGENCY_DIR"
    
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    EMERGENCY_FILE="$EMERGENCY_DIR/emergency_docs_$TIMESTAMP.tar.gz"
    
    log "Creating emergency archive: $EMERGENCY_FILE"
    tar -czf "$EMERGENCY_FILE" \
        -C / \
        opt/nscale-assist/docs \
        opt/nscale-assist/app/docs \
        opt/nscale-assist/data/txt \
        2>&1 | tee -a "$LOG_FILE"
    
    log "Emergency backup completed: $EMERGENCY_FILE"
}

# Function to restore from backup
restore_backup() {
    local BACKUP_PATH="$1"
    local RESTORE_DIR="$2"
    
    if [[ -z "$BACKUP_PATH" ]] || [[ -z "$RESTORE_DIR" ]]; then
        error_exit "Usage: $0 restore <backup_path> <restore_dir>"
    fi
    
    log "Restoring backup from $BACKUP_PATH to $RESTORE_DIR"
    
    # Create restore directory
    mkdir -p "$RESTORE_DIR"
    
    # Perform restore
    python3 "$BACKUP_SCRIPT" restore --backup-path "$BACKUP_PATH" --restore-dir "$RESTORE_DIR" 2>&1 | tee -a "$LOG_FILE"
    
    log "Restore completed"
}

# Main script logic
case "${1:-daily}" in
    daily)
        daily_operations
        ;;
    weekly)
        weekly_operations
        ;;
    health)
        check_health
        ;;
    emergency)
        emergency_backup
        ;;
    restore)
        restore_backup "$2" "$3"
        ;;
    full-backup)
        log "Creating full backup..."
        python3 "$BACKUP_SCRIPT" backup --type full 2>&1 | tee -a "$LOG_FILE"
        ;;
    track-all)
        log "Tracking all documents..."
        python3 "$VERSION_SCRIPT" track --all --message "${2:-Manual tracking}" 2>&1 | tee -a "$LOG_FILE"
        ;;
    list-backups)
        python3 "$BACKUP_SCRIPT" list
        ;;
    version-status)
        python3 "$VERSION_SCRIPT" status
        ;;
    *)
        echo "Documentation Backup and Version Control Automation"
        echo "Usage: $0 [command] [options]"
        echo ""
        echo "Commands:"
        echo "  daily          - Run daily operations (default)"
        echo "  weekly         - Run weekly operations"
        echo "  health         - Check system health"
        echo "  emergency      - Create emergency backup"
        echo "  restore        - Restore from backup"
        echo "  full-backup    - Create full backup"
        echo "  track-all      - Track all documents"
        echo "  list-backups   - List available backups"
        echo "  version-status - Show version control status"
        echo ""
        echo "Examples:"
        echo "  $0 daily"
        echo "  $0 restore /path/to/backup.tar.gz /restore/dir"
        echo "  $0 track-all 'Added new documentation'"
        exit 1
        ;;
esac

log "Operation completed successfully"