#!/bin/bash
# Create remaining GitHub issues with fixed formatting

export PATH="/opt/nscale-assist/tools/gh_2.40.1_linux_amd64/bin:$PATH"
REPO="starputzer/nscale-dms-assistent"

# Issue 2: Simple/experimental versions
gh issue create \
    --repo "$REPO" \
    --title "Review and remove unused simple/experimental implementations" \
    --body 'Several "simple" versions of core files exist but appear to be unused experimental implementations. These need review before removal.

Files to review:
- /src/main.simple.ts - No imports found
- /src/stores/uiSimple.ts - Only referenced in documentation

Investigation needed:
- Check for dynamic imports
- Verify feature toggle usage
- Search for runtime references

Related to: #6'

# Issue 3: Fix files consolidation
gh issue create \
    --repo "$REPO" \
    --title "Review and consolidate temporary fix files" \
    --body 'Multiple "fix" files exist that appear to be temporary solutions. These need careful review.

High-risk files requiring review:
- /src/stores/sessionsResponseFix.ts
- /src/stores/uiFix.ts
- /src/utils/authFix.ts
- /src/utils/authenticationFix.ts
- /src/services/api/batchAuthFix.ts
- /src/services/api/batchResponseFix.ts
- /src/utils/tokenMigrationFix.ts
- /src/services/api/enhancedBatchFix.ts
- /src/services/api/smartBatchFix.ts

Related to: #6'

# Issue 4: Optimized versions
gh issue create \
    --repo "$REPO" \
    --title "Evaluate optimized implementations for integration or removal" \
    --body 'Several "optimized" versions exist alongside standard implementations. Performance comparison needed.

Files to evaluate:
- /src/stores/admin/settings.optimized.ts
- /src/main.optimized.ts
- /src/stores/sessions.optimized.ts

Performance testing needed:
- Benchmark load times
- Measure memory usage
- Test with large datasets
- Compare bundle sizes

Related to: #6'

# Issue 5: Unused types
gh issue create \
    --repo "$REPO" \
    --title "Remove unused TypeScript type definitions" \
    --body 'Some TypeScript type definition files have no imports and appear to be unused.

Files to remove:
- /src/stores/types/enhancedChatMessage.ts

Verification needed:
- Confirm no compilation errors after removal
- Check for string-based type references
- Verify no runtime type guards use these

Related to: #6'

# Issue 6: Legacy archive
gh issue create \
    --repo "$REPO" \
    --title "Remove legacy-archive directory after migration verification" \
    --body 'The /frontend/js/legacy-archive/ directory contains deprecated files that have been explicitly marked as archived.

Directory to remove:
- /frontend/js/legacy-archive/*

Verification needed:
- Confirm Vue 3 migration is 100% complete
- Verify no references to legacy code
- Check for any historical data needs

Related to: #6'

# Issue 7: Frontend types
gh issue create \
    --repo "$REPO" \
    --title "Verify and clean up legacy frontend type definitions" \
    --body 'The /frontend/types/ directory may contain obsolete type definitions.

Investigation needed:
- Check if legacy frontend is still active
- Search for imports of these types
- Verify with team about frontend architecture

Related to: #6'

# Issue 8: Test suite
gh issue create \
    --repo "$REPO" \
    --title "Develop test suite to verify system integrity post-cleanup" \
    --body 'Create a comprehensive test suite that verifies all critical system functionality remains intact after cleanup.

Test areas to cover:
- Authentication flows
- API batch operations
- Mock service functionality
- Feature toggle system
- Build process
- Dynamic imports
- Admin panel access

Related to: #6'

# Issue 9: Documentation
gh issue create \
    --repo "$REPO" \
    --title "Create documentation for cleanup process and decisions" \
    --body 'Document the cleanup process, decisions made, and lessons learned for future maintenance.

Documentation to create:
- Cleanup decision log
- File categorization criteria
- Risk assessment methodology
- Rollback procedures
- Future maintenance guidelines

Related to: #6'

# Issue 10: CI/CD automation
gh issue create \
    --repo "$REPO" \
    --title "Implement automated dead code detection in CI pipeline" \
    --body 'Set up automated tools in the CI/CD pipeline to detect dead code.

Implementation tasks:
- Research dead code detection tools
- Configure for TypeScript/Vue
- Integrate with CI pipeline
- Set up reporting
- Create maintenance procedures

Tools to evaluate:
- ESLint unused-imports
- ts-prune
- webpack-bundle-analyzer
- Custom scripts

Related to: #6'

echo "All remaining issues created!"