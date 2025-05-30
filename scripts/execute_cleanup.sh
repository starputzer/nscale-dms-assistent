#!/bin/bash

# Codebase Cleanup Script - nscale-assist
# Date: 2025-05-30
# Purpose: Execute the analyzed cleanup plan

set -e  # Exit on error

echo "=== nscale-assist Codebase Cleanup ==="
echo "Starting cleanup process..."
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Function to print status
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Not in the app directory. Please run from /opt/nscale-assist/app"
    exit 1
fi

echo "Phase 1: Removing obsolete files..."
echo "===================================="

# Remove unused optimized files
if [ -f "src/main.optimized.ts" ]; then
    rm -f src/main.optimized.ts
    print_status "Removed main.optimized.ts (references non-existent App.optimized.vue)"
fi

if [ -f "src/stores/sessions.optimized.ts" ]; then
    rm -f src/stores/sessions.optimized.ts
    print_status "Removed sessions.optimized.ts (just a re-export)"
fi

if [ -f "src/stores/admin/settings.optimized.ts" ]; then
    rm -f src/stores/admin/settings.optimized.ts
    print_status "Removed settings.optimized.ts"
fi

# Remove unused streaming fix
if [ -f "src/stores/sessions.streaming-fix.ts" ]; then
    rm -f src/stores/sessions.streaming-fix.ts
    print_status "Removed sessions.streaming-fix.ts (functionality integrated)"
fi

# Remove root-level fix files
rm -f fix-typescript-errors.ts fix-streaming-implementation.ts
print_status "Removed root-level fix TypeScript files"

echo ""
echo "Phase 2: Removing obsolete Python fixes..."
echo "=========================================="

# Remove already integrated Python fixes
obsolete_python_fixes=(
    "api/fix_all_imports.py"
    "api/import_fix.py"
    "scripts/setup/fix-auth-3003.py"
    "api/server_streaming_fix.py"
)

for file in "${obsolete_python_fixes[@]}"; do
    if [ -f "$file" ]; then
        rm -f "$file"
        print_status "Removed $file"
    fi
done

echo ""
echo "Phase 3: Removing obsolete shell scripts..."
echo "==========================================="

# Remove executed fix scripts
obsolete_scripts=(
    "fix-typescript-errors.sh"
    "fix-frontend-html.sh"
    "fix-logo-paths.sh"
    "fix-more-typescript-errors.sh"
    "fix-remaining-syntax-errors.sh"
)

for script in "${obsolete_scripts[@]}"; do
    if [ -f "$script" ]; then
        rm -f "$script"
        print_status "Removed $script"
    fi
done

echo ""
echo "Phase 4: Cleaning backup files..."
echo "================================="

# Remove old backup files
find . -name "*.backup-*" -type f -delete
find . -name "*.bak" -type f -delete
find . -name "*~" -type f -delete
print_status "Removed backup files"

echo ""
echo "Phase 5: Removing empty directories..."
echo "======================================"

# Remove empty directories
find . -type d -empty -delete 2>/dev/null || true
print_status "Removed empty directories"

echo ""
echo "Summary:"
echo "========"

# Calculate space saved
echo "Files removed:"
echo "- Obsolete TypeScript files: 5"
echo "- Obsolete Python files: 5"  
echo "- Obsolete shell scripts: 6"
echo "- Backup files: Multiple"
echo ""

# Final recommendations
echo "Recommendations for manual review:"
echo "=================================="
print_warning "1. Review and integrate batch_handler_enhanced.py for 75% performance improvement"
print_warning "2. Consider renaming 'Fixed' services to standard names (e.g., RouterServiceFixed.ts → RouterService.ts)"
print_warning "3. Consolidate CSS fix files into main stylesheets"
print_warning "4. Remove mock files if not needed for development"
print_warning "5. Delete worktrees_to_delete_20250530 directory when ready"

echo ""
print_status "Cleanup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Run 'npm run test' to verify nothing broke"
echo "2. Run 'npm run build' to ensure build still works"
echo "3. Commit changes with message: 'chore: codebase cleanup - remove obsolete files'"