#!/bin/bash
# Backup script before cleanup operations

BACKUP_DIR="backups/cleanup-$(date +%Y%m%d-%H%M%S)"

echo "Creating backup directory: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

# Backup critical files that will be modified
echo "Backing up critical files..."

# Auth-related files
cp -p src/stores/auth.ts "$BACKUP_DIR/" 2>/dev/null || true
cp -p src/utils/authFix.ts "$BACKUP_DIR/" 2>/dev/null || true
cp -p src/utils/authenticationFix.ts "$BACKUP_DIR/" 2>/dev/null || true

# Batch API files
cp -p src/services/api/BatchRequestService.ts "$BACKUP_DIR/" 2>/dev/null || true
cp -p src/services/api/BatchRequestServiceFix.ts "$BACKUP_DIR/" 2>/dev/null || true

# Store files
cp -p src/stores/ui.ts "$BACKUP_DIR/" 2>/dev/null || true
cp -p src/stores/uiFix.ts "$BACKUP_DIR/" 2>/dev/null || true
cp -p src/stores/sessions.ts "$BACKUP_DIR/" 2>/dev/null || true

# Service files
cp -p src/services/lazy-loading.ts "$BACKUP_DIR/" 2>/dev/null || true
cp -p src/services/lazy-loading.fixed.ts "$BACKUP_DIR/" 2>/dev/null || true

# Router files
cp -p src/router/index.ts "$BACKUP_DIR/" 2>/dev/null || true
cp -p src/router/index.fixed.ts "$BACKUP_DIR/" 2>/dev/null || true
cp -p src/plugins/routerGuards.ts "$BACKUP_DIR/" 2>/dev/null || true
cp -p src/plugins/routerGuardsFixed.ts "$BACKUP_DIR/" 2>/dev/null || true

echo "Backup completed in: $BACKUP_DIR"
echo "Files backed up:"
ls -la "$BACKUP_DIR/"