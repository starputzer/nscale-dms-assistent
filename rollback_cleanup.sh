#!/bin/bash
# Rollback script for cleanup migration
# Date: 2025-05-16
# Purpose: Restore files moved during cleanup migration

# Configuration
BACKUP_DIR="/opt/nscale-assist/app/BACKUP_CLEANUP_20250516"
APP_DIR="/opt/nscale-assist/app"

# Check if backup directory exists
if [ ! -d "$BACKUP_DIR" ]; then
    echo "Error: Backup directory not found: $BACKUP_DIR"
    echo "Cannot proceed with rollback"
    exit 1
fi

echo "=== Starting Rollback Process ==="
echo "Restoring files from: $BACKUP_DIR"
echo ""

# Function to restore files
restore_file() {
    local filename="$1"
    local src_dir="$2"
    local dest_dir="$3"
    local src="$src_dir/$filename"
    
    if [ -f "$src" ]; then
        echo "Restoring: $filename -> $dest_dir"
        mkdir -p "$dest_dir"
        mv "$src" "$dest_dir/"
    fi
}

# Restore mock files
echo "=== Restoring mock files ==="
restore_file "sessions.mock.ts" "$BACKUP_DIR/mock-files" "$APP_DIR/src/stores"
restore_file "ui.mock.ts" "$BACKUP_DIR/mock-files" "$APP_DIR/src/stores"
restore_file "settings.mock.ts" "$BACKUP_DIR/mock-files" "$APP_DIR/src/stores"
restore_file "abTests.mock.ts" "$BACKUP_DIR/mock-files" "$APP_DIR/src/stores"
restore_file "motd.mock.ts" "$BACKUP_DIR/mock-files/admin" "$APP_DIR/src/stores/admin"
restore_file "feedback.mock.ts" "$BACKUP_DIR/mock-files/admin" "$APP_DIR/src/stores/admin"
restore_file "auth.mock.ts" "$BACKUP_DIR/mock-files" "$APP_DIR/src/stores"
echo ""

# Restore simple versions
echo "=== Restoring simple versions ==="
restore_file "main.simple.ts" "$BACKUP_DIR/simple-versions" "$APP_DIR/src"
restore_file "uiSimple.ts" "$BACKUP_DIR/simple-versions" "$APP_DIR/src/stores"
echo ""

# Restore fix implementations
echo "=== Restoring fix implementations ==="
restore_file "sessionsResponseFix.ts" "$BACKUP_DIR/fix-implementations" "$APP_DIR/src/stores"
restore_file "uiFix.ts" "$BACKUP_DIR/fix-implementations" "$APP_DIR/src/stores"
restore_file "authFix.ts" "$BACKUP_DIR/fix-implementations" "$APP_DIR/src/utils"
restore_file "authenticationFix.ts" "$BACKUP_DIR/fix-implementations" "$APP_DIR/src/utils"
restore_file "batchAuthFix.ts" "$BACKUP_DIR/fix-implementations" "$APP_DIR/src/services/api"
restore_file "batchResponseFix.ts" "$BACKUP_DIR/fix-implementations" "$APP_DIR/src/services/api"
restore_file "tokenMigrationFix.ts" "$BACKUP_DIR/fix-implementations" "$APP_DIR/src/utils"
restore_file "enhancedBatchFix.ts" "$BACKUP_DIR/fix-implementations" "$APP_DIR/src/services/api"
restore_file "smartBatchFix.ts" "$BACKUP_DIR/fix-implementations" "$APP_DIR/src/services/api"
echo ""

# Restore optimized versions
echo "=== Restoring optimized versions ==="
restore_file "settings.optimized.ts" "$BACKUP_DIR/optimized-versions/admin" "$APP_DIR/src/stores/admin"
restore_file "main.optimized.ts" "$BACKUP_DIR/optimized-versions" "$APP_DIR/src"
restore_file "sessions.optimized.ts" "$BACKUP_DIR/optimized-versions" "$APP_DIR/src/stores"
echo ""

# Restore unused types
echo "=== Restoring unused types ==="
restore_file "enhancedChatMessage.ts" "$BACKUP_DIR/unused-types" "$APP_DIR/src/stores/types"
echo ""

# Restore legacy archive
echo "=== Restoring legacy archive ==="
if [ -d "$BACKUP_DIR/legacy-frontend/legacy-archive" ]; then
    echo "Restoring directory: legacy-archive"
    mkdir -p "$APP_DIR/frontend/js"
    mv "$BACKUP_DIR/legacy-frontend/legacy-archive" "$APP_DIR/frontend/js/"
fi
echo ""

echo "=== Rollback Complete ==="
echo ""
echo "Next steps:"
echo "1. Clear build cache: rm -rf node_modules/.vite"
echo "2. Reinstall dependencies: npm ci"
echo "3. Run tests: npm test"
echo "4. Start dev server: npm run dev"
echo ""
echo "If issues persist, check git history for any config changes"