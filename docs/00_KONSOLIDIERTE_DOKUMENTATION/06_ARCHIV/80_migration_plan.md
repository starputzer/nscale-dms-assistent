# Migration Plan - Code Cleanup for nscale-assist

## Overview
This migration plan details the systematic cleanup of the nscale-assist codebase, identifying unused, redundant, and obsolete files for archival. All actions preserve system functionality while improving maintainability.

## Backup Directory Structure
```
/opt/nscale-assist/app/BACKUP_CLEANUP_20250516/
├── mock-files/
├── simple-versions/
├── fix-implementations/
├── optimized-versions/
├── unused-types/
├── legacy-frontend/
├── deprecated-components/
└── abandoned-features/
```

## Files to Migrate

### 1. Mock Files (Low Risk)
**Destination**: `/BACKUP_CLEANUP_20250516/mock-files/`
**Reason**: Not imported in production code, only used for testing
**Risk**: Low - These files are clearly test-only
| File | Current Path | Risk |
|------|--------------|------|
| sessions.mock.ts | /src/stores/sessions.mock.ts | Low |
| ui.mock.ts | /src/stores/ui.mock.ts | Low |
| settings.mock.ts | /src/stores/settings.mock.ts | Low |
| abTests.mock.ts | /src/stores/abTests.mock.ts | Low |
| motd.mock.ts | /src/stores/admin/motd.mock.ts | Low |
| feedback.mock.ts | /src/stores/admin/feedback.mock.ts | Low |
| auth.mock.ts | /src/stores/auth.mock.ts | Low |

### 2. Simple/Experimental Versions (Medium Risk)
**Destination**: `/BACKUP_CLEANUP_20250516/simple-versions/`
**Reason**: Unused experimental implementations
**Risk**: Medium - Should verify not dynamically imported
| File | Current Path | Risk |
|------|--------------|------|
| main.simple.ts | /src/main.simple.ts | Medium |
| uiSimple.ts | /src/stores/uiSimple.ts | Medium |

### 3. Fix Implementations (High Risk)
**Destination**: `/BACKUP_CLEANUP_20250516/fix-implementations/`
**Reason**: Temporary fixes that may have been integrated
**Risk**: High - Need careful verification
| File | Current Path | Risk |
|------|--------------|------|
| sessionsResponseFix.ts | /src/stores/sessionsResponseFix.ts | High |
| uiFix.ts | /src/stores/uiFix.ts | High |
| authFix.ts | /src/utils/authFix.ts | High |
| authenticationFix.ts | /src/utils/authenticationFix.ts | High |
| batchAuthFix.ts | /src/services/api/batchAuthFix.ts | High |
| batchResponseFix.ts | /src/services/api/batchResponseFix.ts | High |
| tokenMigrationFix.ts | /src/utils/tokenMigrationFix.ts | High |
| enhancedBatchFix.ts | /src/services/api/enhancedBatchFix.ts | High |
| smartBatchFix.ts | /src/services/api/smartBatchFix.ts | High |

### 4. Optimized Versions (Medium Risk)
**Destination**: `/BACKUP_CLEANUP_20250516/optimized-versions/`
**Reason**: May be duplicates or experimental optimizations
**Risk**: Medium - Verify if they should replace originals
| File | Current Path | Risk |
|------|--------------|------|
| settings.optimized.ts | /src/stores/admin/settings.optimized.ts | Medium |
| main.optimized.ts | /src/main.optimized.ts | Medium |
| sessions.optimized.ts | /src/stores/sessions.optimized.ts | Medium |

### 5. Unused Types (Low Risk)
**Destination**: `/BACKUP_CLEANUP_20250516/unused-types/`
**Reason**: No imports found
**Risk**: Low - Type definitions unlikely to break runtime
| File | Current Path | Risk |
|------|--------------|------|
| enhancedChatMessage.ts | /src/stores/types/enhancedChatMessage.ts | Low |

### 6. Legacy Archive (Low Risk)
**Destination**: `/BACKUP_CLEANUP_20250516/legacy-frontend/`
**Reason**: Already marked as archived
**Risk**: Low - Already isolated from main codebase
| Directory | Current Path | Risk |
|-----------|--------------|------|
| legacy-archive/* | /frontend/js/legacy-archive/* | Low |

## Verification Tests

### Pre-Migration Tests
1. Run full test suite: `npm test`
2. Build production bundle: `npm run build`
3. Start development server: `npm run dev`
4. Test all major features manually

### Post-Migration Tests
1. Repeat all pre-migration tests
2. Verify no missing module errors in console
3. Check build size hasn't increased unexpectedly
4. Test feature-toggle functionality
5. Verify admin panel accessibility

## Valuable Functionality to Consider

### From Fix Files
- Check if auth fixes contain security improvements
- Verify if batch response fixes address production issues
- Review token migration fix for OAuth updates

### From Optimized Versions
- Compare performance metrics with original versions
- Consider merging optimizations into main implementations

## Files NOT to Migrate

### Critical Dependencies
- `/src/main.ts` - Main entry point
- `/src/App.vue` - Root Vue component
- All router configurations
- All active store implementations
- Build configuration files
- Test setup files

### Dynamic Imports
- Feature-toggle controlled components
- Lazy-loaded routes
- Plugin system files

## Rollback Plan

### Immediate Rollback (< 24 hours)
1. Copy backup directory contents back to original locations
2. Run `git checkout` to reset any config changes
3. Clear build cache: `rm -rf node_modules/.vite`
4. Reinstall dependencies: `npm ci`
5. Run full test suite

### Delayed Rollback (> 24 hours)
1. Restore from git repository backup
2. Review error logs for missing file references
3. Selectively restore only problematic files
4. Update import paths if necessary
5. Document any permanent changes

## Migration Script

```bash
#!/bin/bash
# WARNING: This script must be manually reviewed before execution
# Date: 2025-05-16
# Purpose: Clean up unused files in nscale-assist codebase

# Configuration
BACKUP_DIR="/opt/nscale-assist/app/BACKUP_CLEANUP_20250516"
APP_DIR="/opt/nscale-assist/app"

# Create backup directory structure
mkdir -p "$BACKUP_DIR"/{mock-files,simple-versions,fix-implementations,optimized-versions,unused-types,legacy-frontend,deprecated-components,abandoned-features}

# Function to safely move files
safe_move() {
    local src="$1"
    local dest="$2"
    if [ -f "$src" ]; then
        echo "Moving: $src -> $dest"
        mv "$src" "$dest"
    else
        echo "Warning: File not found: $src"
    fi
}

# Move mock files (Low Risk)
echo "=== Moving mock files ==="
safe_move "$APP_DIR/src/stores/sessions.mock.ts" "$BACKUP_DIR/mock-files/"
safe_move "$APP_DIR/src/stores/ui.mock.ts" "$BACKUP_DIR/mock-files/"
safe_move "$APP_DIR/src/stores/settings.mock.ts" "$BACKUP_DIR/mock-files/"
safe_move "$APP_DIR/src/stores/abTests.mock.ts" "$BACKUP_DIR/mock-files/"
safe_move "$APP_DIR/src/stores/admin/motd.mock.ts" "$BACKUP_DIR/mock-files/"
safe_move "$APP_DIR/src/stores/admin/feedback.mock.ts" "$BACKUP_DIR/mock-files/"
safe_move "$APP_DIR/src/stores/auth.mock.ts" "$BACKUP_DIR/mock-files/"

# Move simple versions (Medium Risk)
echo "=== Moving simple versions ==="
safe_move "$APP_DIR/src/main.simple.ts" "$BACKUP_DIR/simple-versions/"
safe_move "$APP_DIR/src/stores/uiSimple.ts" "$BACKUP_DIR/simple-versions/"

# Move fix implementations (High Risk)
echo "=== Moving fix implementations ==="
safe_move "$APP_DIR/src/stores/sessionsResponseFix.ts" "$BACKUP_DIR/fix-implementations/"
safe_move "$APP_DIR/src/stores/uiFix.ts" "$BACKUP_DIR/fix-implementations/"
safe_move "$APP_DIR/src/utils/authFix.ts" "$BACKUP_DIR/fix-implementations/"
safe_move "$APP_DIR/src/utils/authenticationFix.ts" "$BACKUP_DIR/fix-implementations/"
safe_move "$APP_DIR/src/services/api/batchAuthFix.ts" "$BACKUP_DIR/fix-implementations/"
safe_move "$APP_DIR/src/services/api/batchResponseFix.ts" "$BACKUP_DIR/fix-implementations/"
safe_move "$APP_DIR/src/utils/tokenMigrationFix.ts" "$BACKUP_DIR/fix-implementations/"
safe_move "$APP_DIR/src/services/api/enhancedBatchFix.ts" "$BACKUP_DIR/fix-implementations/"
safe_move "$APP_DIR/src/services/api/smartBatchFix.ts" "$BACKUP_DIR/fix-implementations/"

# Move optimized versions (Medium Risk)
echo "=== Moving optimized versions ==="
safe_move "$APP_DIR/src/stores/admin/settings.optimized.ts" "$BACKUP_DIR/optimized-versions/"
safe_move "$APP_DIR/src/main.optimized.ts" "$BACKUP_DIR/optimized-versions/"
safe_move "$APP_DIR/src/stores/sessions.optimized.ts" "$BACKUP_DIR/optimized-versions/"

# Move unused types (Low Risk)
echo "=== Moving unused types ==="
safe_move "$APP_DIR/src/stores/types/enhancedChatMessage.ts" "$BACKUP_DIR/unused-types/"

# Move legacy archive (Low Risk)
echo "=== Moving legacy archive ==="
if [ -d "$APP_DIR/frontend/js/legacy-archive" ]; then
    mv "$APP_DIR/frontend/js/legacy-archive" "$BACKUP_DIR/legacy-frontend/"
fi

echo "=== Migration complete ==="
echo "Backup location: $BACKUP_DIR"
echo "Please run tests to verify system integrity"
```

## GitHub Issues to Create

### Meta Issue
**Title**: 🧹 Codebase Cleanup - Remove Unused and Redundant Files
**Description**: Track the systematic cleanup of unused, redundant, and obsolete files in the nscale-assist codebase.
**Labels**: epic, refactoring, technical-debt
**Priority**: High

### Individual Issues

1. **Remove Mock Files from Production**
   - Title: Remove mock store files from production codebase
   - Labels: cleanup, testing, low-risk
   - Priority: Low

2. **Evaluate and Remove Simple/Experimental Versions**
   - Title: Review and remove unused simple/experimental implementations
   - Labels: cleanup, medium-risk, experimental
   - Priority: Medium

3. **Consolidate Fix Implementations**
   - Title: Review and consolidate temporary fix files
   - Labels: cleanup, high-risk, bug-fix
   - Priority: High

4. **Review Optimized Versions**
   - Title: Evaluate optimized implementations for integration or removal
   - Labels: performance, optimization, medium-risk
   - Priority: Medium

5. **Clean Up Unused Type Definitions**
   - Title: Remove unused TypeScript type definitions
   - Labels: cleanup, typescript, low-risk
   - Priority: Low

6. **Remove Legacy Archive Directory**
   - Title: Remove legacy-archive directory after migration verification
   - Labels: cleanup, migration, low-risk
   - Priority: Low

7. **Verify Frontend Types Usage**
   - Title: Verify and clean up legacy frontend type definitions
   - Labels: cleanup, frontend, investigation
   - Priority: Medium

8. **Create Comprehensive Test Suite for Migration**
   - Title: Develop test suite to verify system integrity post-cleanup
   - Labels: testing, qa, migration
   - Priority: High

9. **Document Cleanup Process**
   - Title: Create documentation for cleanup process and decisions
   - Labels: documentation, maintenance
   - Priority: Medium

10. **Setup CI/CD Pipeline for Dead Code Detection**
    - Title: Implement automated dead code detection in CI pipeline
    - Labels: ci-cd, automation, maintenance
    - Priority: Medium

## Recommended Execution Order

1. Create comprehensive test suite (Issue #8)
2. Remove mock files (Issue #1) - Low risk
3. Clean up unused types (Issue #5) - Low risk
4. Remove legacy archive (Issue #6) - Low risk
5. Evaluate simple versions (Issue #2) - Medium risk
6. Review optimized versions (Issue #4) - Medium risk
7. Verify frontend types (Issue #7) - Investigation needed
8. Consolidate fix implementations (Issue #3) - High risk
9. Document process (Issue #9)
10. Setup CI/CD detection (Issue #10)