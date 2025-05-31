#!/bin/bash
# WARNING: This script must be manually reviewed before execution
# Date: 2025-05-16
# Purpose: Clean up unused files in nscale-assist codebase
# 
# IMPORTANT: This script will move files to a backup directory.
# Review the MIGRATION_PLAN.md before running this script.
# 
# Usage: ./cleanup_migration.sh [--dry-run]
# Options:
#   --dry-run    Show what would be moved without actually moving files

# Configuration
BACKUP_DIR="/opt/nscale-assist/app/BACKUP_CLEANUP_20250516"
APP_DIR="/opt/nscale-assist/app"
DRY_RUN=false

# Check for dry-run flag
if [ "$1" == "--dry-run" ]; then
    DRY_RUN=true
    echo "=== DRY RUN MODE - No files will be moved ==="
fi

# Create backup directory structure
if [ "$DRY_RUN" = false ]; then
    mkdir -p "$BACKUP_DIR"/{mock-files,simple-versions,fix-implementations,optimized-versions,unused-types,legacy-frontend,deprecated-components,abandoned-features}
fi

# Function to safely move files
safe_move() {
    local src="$1"
    local dest_dir="$2"
    local filename=$(basename "$src")
    local dest="$dest_dir/$filename"
    
    if [ -f "$src" ]; then
        if [ "$DRY_RUN" = true ]; then
            echo "[DRY RUN] Would move: $src -> $dest"
        else
            echo "Moving: $src -> $dest"
            # Create subdirectories if needed
            mkdir -p "$(dirname "$dest")"
            mv "$src" "$dest"
        fi
    else
        echo "Warning: File not found: $src"
    fi
}

# Function to move directory
safe_move_dir() {
    local src="$1"
    local dest="$2"
    
    if [ -d "$src" ]; then
        if [ "$DRY_RUN" = true ]; then
            echo "[DRY RUN] Would move directory: $src -> $dest"
        else
            echo "Moving directory: $src -> $dest"
            mv "$src" "$dest"
        fi
    else
        echo "Warning: Directory not found: $src"
    fi
}

# Log start time
echo "=== Cleanup Migration Started at $(date) ==="
echo "Backup directory: $BACKUP_DIR"
echo ""

# Move mock files (Low Risk)
echo "=== Moving mock files (Low Risk) ==="
safe_move "$APP_DIR/src/stores/sessions.mock.ts" "$BACKUP_DIR/mock-files/"
safe_move "$APP_DIR/src/stores/ui.mock.ts" "$BACKUP_DIR/mock-files/"
safe_move "$APP_DIR/src/stores/settings.mock.ts" "$BACKUP_DIR/mock-files/"
safe_move "$APP_DIR/src/stores/abTests.mock.ts" "$BACKUP_DIR/mock-files/"
safe_move "$APP_DIR/src/stores/admin/motd.mock.ts" "$BACKUP_DIR/mock-files/admin/"
safe_move "$APP_DIR/src/stores/admin/feedback.mock.ts" "$BACKUP_DIR/mock-files/admin/"
safe_move "$APP_DIR/src/stores/auth.mock.ts" "$BACKUP_DIR/mock-files/"
echo ""

# Move simple versions (Medium Risk)
echo "=== Moving simple versions (Medium Risk) ==="
safe_move "$APP_DIR/src/main.simple.ts" "$BACKUP_DIR/simple-versions/"
safe_move "$APP_DIR/src/stores/uiSimple.ts" "$BACKUP_DIR/simple-versions/"
echo ""

# Move fix implementations (High Risk)
echo "=== Moving fix implementations (High Risk) ==="
echo "WARNING: These files may contain important fixes. Review carefully!"
safe_move "$APP_DIR/src/stores/sessionsResponseFix.ts" "$BACKUP_DIR/fix-implementations/"
safe_move "$APP_DIR/src/stores/uiFix.ts" "$BACKUP_DIR/fix-implementations/"
safe_move "$APP_DIR/src/utils/authFix.ts" "$BACKUP_DIR/fix-implementations/"
safe_move "$APP_DIR/src/utils/authenticationFix.ts" "$BACKUP_DIR/fix-implementations/"
safe_move "$APP_DIR/src/services/api/batchAuthFix.ts" "$BACKUP_DIR/fix-implementations/"
safe_move "$APP_DIR/src/services/api/batchResponseFix.ts" "$BACKUP_DIR/fix-implementations/"
safe_move "$APP_DIR/src/utils/tokenMigrationFix.ts" "$BACKUP_DIR/fix-implementations/"
safe_move "$APP_DIR/src/services/api/enhancedBatchFix.ts" "$BACKUP_DIR/fix-implementations/"
safe_move "$APP_DIR/src/services/api/smartBatchFix.ts" "$BACKUP_DIR/fix-implementations/"
echo ""

# Move optimized versions (Medium Risk)
echo "=== Moving optimized versions (Medium Risk) ==="
safe_move "$APP_DIR/src/stores/admin/settings.optimized.ts" "$BACKUP_DIR/optimized-versions/admin/"
safe_move "$APP_DIR/src/main.optimized.ts" "$BACKUP_DIR/optimized-versions/"
safe_move "$APP_DIR/src/stores/sessions.optimized.ts" "$BACKUP_DIR/optimized-versions/"
echo ""

# Move unused types (Low Risk)
echo "=== Moving unused types (Low Risk) ==="
safe_move "$APP_DIR/src/stores/types/enhancedChatMessage.ts" "$BACKUP_DIR/unused-types/"
echo ""

# Move legacy archive (Low Risk)
echo "=== Moving legacy archive (Low Risk) ==="
safe_move_dir "$APP_DIR/frontend/js/legacy-archive" "$BACKUP_DIR/legacy-frontend/"
echo ""

# Summary
echo "=== Migration Summary ==="
echo "Backup location: $BACKUP_DIR"
echo ""

if [ "$DRY_RUN" = true ]; then
    echo "This was a DRY RUN - no files were actually moved"
    echo "To perform the actual migration, run without --dry-run flag"
else
    echo "Migration complete. Please run the following tests:"
    echo "1. npm test"
    echo "2. npm run build"
    echo "3. npm run dev"
    echo "4. Test all major features manually"
    echo ""
    echo "If any issues occur, run the rollback script:"
    echo "./rollback_cleanup.sh"
fi

echo ""
echo "=== Cleanup Migration Completed at $(date) ==="