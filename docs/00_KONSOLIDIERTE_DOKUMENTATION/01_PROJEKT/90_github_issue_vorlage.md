# GitHub Issues für Codebase Cleanup

## Meta Issue

### Title: 🧹 Codebase Cleanup - Remove Unused and Redundant Files

**Description:**
Track the systematic cleanup of unused, redundant, and obsolete files in the Digitale Akte Assistent codebase. This epic coordinates all cleanup activities to improve maintainability while preserving system functionality.

**Objectives:**
- Remove mock files from production code
- Eliminate experimental/simple versions
- Consolidate fix implementations
- Review and integrate optimized versions
- Clean up unused type definitions
- Remove legacy archived code

**Related Issues:**
- #1 Remove mock store files from production codebase
- #2 Review and remove unused simple/experimental implementations
- #3 Review and consolidate temporary fix files
- #4 Evaluate optimized implementations for integration or removal
- #5 Remove unused TypeScript type definitions
- #6 Remove legacy-archive directory after migration verification
- #7 Verify and clean up legacy frontend type definitions
- #8 Develop test suite to verify system integrity post-cleanup
- #9 Create documentation for cleanup process and decisions
- #10 Implement automated dead code detection in CI pipeline

**Labels:** `epic`, `refactoring`, `technical-debt`
**Priority:** High
**Milestone:** Codebase Cleanup Phase 1

---

## Issue #1: Remove mock store files from production codebase

**Title:** Remove mock store files from production codebase

**Description:**
Mock files are currently included in the production codebase but are not imported anywhere in production code. These should be moved to test directories or removed entirely.

**Files to remove:**
- [ ] `/src/stores/sessions.mock.ts`
- [ ] `/src/stores/ui.mock.ts`
- [ ] `/src/stores/settings.mock.ts`
- [ ] `/src/stores/abTests.mock.ts`
- [ ] `/src/stores/admin/motd.mock.ts`
- [ ] `/src/stores/admin/feedback.mock.ts`
- [ ] `/src/stores/auth.mock.ts`

**Acceptance Criteria:**
- [ ] All mock files removed from production source
- [ ] Tests still pass
- [ ] Build process completes successfully
- [ ] No runtime errors related to missing mocks

**Labels:** `cleanup`, `testing`, `low-risk`
**Priority:** Low
**Estimated effort:** 2 hours

---

## Issue #2: Review and remove unused simple/experimental implementations

**Title:** Review and remove unused simple/experimental implementations

**Description:**
Several "simple" versions of core files exist but appear to be unused experimental implementations. These need review to confirm they're not dynamically imported before removal.

**Files to review:**
- [ ] `/src/main.simple.ts` - No imports found
- [ ] `/src/stores/uiSimple.ts` - Only referenced in documentation

**Investigation needed:**
- [ ] Check for dynamic imports
- [ ] Verify feature toggle usage
- [ ] Search for runtime references

**Acceptance Criteria:**
- [ ] Confirmed files are truly unused
- [ ] Files moved to backup directory
- [ ] System functionality unchanged
- [ ] Documentation updated if needed

**Labels:** `cleanup`, `medium-risk`, `experimental`
**Priority:** Medium
**Estimated effort:** 4 hours

---

## Issue #3: Review and consolidate temporary fix files

**Title:** Review and consolidate temporary fix files

**Description:**
Multiple "fix" files exist that appear to be temporary solutions. These need careful review to determine if their fixes have been integrated into main implementations or if they contain critical bug fixes that need to be preserved.

**High-risk files requiring review:**
- [ ] `/src/stores/sessionsResponseFix.ts`
- [ ] `/src/stores/uiFix.ts`
- [ ] `/src/utils/authFix.ts`
- [ ] `/src/utils/authenticationFix.ts`
- [ ] `/src/services/api/batchAuthFix.ts`
- [ ] `/src/services/api/batchResponseFix.ts`
- [ ] `/src/utils/tokenMigrationFix.ts`
- [ ] `/src/services/api/enhancedBatchFix.ts`
- [ ] `/src/services/api/smartBatchFix.ts`

**Investigation needed:**
- [ ] Compare fix implementations with main versions
- [ ] Check git history for integration commits
- [ ] Test authentication flows thoroughly
- [ ] Verify batch API operations

**Acceptance Criteria:**
- [ ] All fixes either integrated or documented
- [ ] No functionality regression
- [ ] Authentication still works correctly
- [ ] Batch operations perform as expected

**Labels:** `cleanup`, `high-risk`, `bug-fix`
**Priority:** High
**Estimated effort:** 8 hours

---

## Issue #4: Evaluate optimized implementations for integration or removal

**Title:** Evaluate optimized implementations for integration or removal

**Description:**
Several "optimized" versions exist alongside standard implementations. These need performance comparison to determine if they should replace the originals or be removed.

**Files to evaluate:**
- [ ] `/src/stores/admin/settings.optimized.ts`
- [ ] `/src/main.optimized.ts`
- [ ] `/src/stores/sessions.optimized.ts`

**Performance testing needed:**
- [ ] Benchmark load times
- [ ] Measure memory usage
- [ ] Test with large datasets
- [ ] Compare bundle sizes

**Acceptance Criteria:**
- [ ] Performance metrics documented
- [ ] Decision made for each file
- [ ] Either integrated or removed
- [ ] No performance regression

**Labels:** `performance`, `optimization`, `medium-risk`
**Priority:** Medium
**Estimated effort:** 6 hours

---

## Issue #5: Remove unused TypeScript type definitions

**Title:** Remove unused TypeScript type definitions

**Description:**
Some TypeScript type definition files have no imports and appear to be unused.

**Files to remove:**
- [ ] `/src/stores/types/enhancedChatMessage.ts`

**Verification needed:**
- [ ] Confirm no compilation errors after removal
- [ ] Check for string-based type references
- [ ] Verify no runtime type guards use these

**Acceptance Criteria:**
- [ ] Unused types removed
- [ ] TypeScript compilation succeeds
- [ ] No type errors introduced

**Labels:** `cleanup`, `typescript`, `low-risk`
**Priority:** Low
**Estimated effort:** 1 hour

---

## Issue #6: Remove legacy-archive directory after migration verification

**Title:** Remove legacy-archive directory after migration verification

**Description:**
The `/frontend/js/legacy-archive/` directory contains deprecated files that have been explicitly marked as archived. These can be safely removed after confirming migration is complete.

**Directory to remove:**
- [ ] `/frontend/js/legacy-archive/*`

**Verification needed:**
- [ ] Confirm Vue 3 migration is 100% complete
- [ ] Verify no references to legacy code
- [ ] Check for any historical data needs

**Acceptance Criteria:**
- [ ] Directory removed
- [ ] No broken references
- [ ] Documentation updated

**Labels:** `cleanup`, `migration`, `low-risk`
**Priority:** Low
**Estimated effort:** 2 hours

---

## Issue #7: Verify and clean up legacy frontend type definitions

**Title:** Verify and clean up legacy frontend type definitions

**Description:**
The `/frontend/types/` directory may contain obsolete type definitions if the Vue SPA has fully replaced the legacy frontend code.

**Investigation needed:**
- [ ] Check if legacy frontend is still active
- [ ] Search for imports of these types
- [ ] Verify with team about frontend architecture

**Acceptance Criteria:**
- [ ] Usage verified
- [ ] Unused types removed
- [ ] Documentation updated

**Labels:** `cleanup`, `frontend`, `investigation`
**Priority:** Medium
**Estimated effort:** 3 hours

---

## Issue #8: Develop test suite to verify system integrity post-cleanup

**Title:** Develop test suite to verify system integrity post-cleanup

**Description:**
Create a comprehensive test suite that verifies all critical system functionality remains intact after the cleanup migration.

**Test areas to cover:**
- [ ] Authentication flows
- [ ] API batch operations
- [ ] Mock service functionality
- [ ] Feature toggle system
- [ ] Build process
- [ ] Dynamic imports
- [ ] Admin panel access

**Deliverables:**
- [ ] Test suite implementation
- [ ] CI pipeline integration
- [ ] Test documentation
- [ ] Rollback verification tests

**Acceptance Criteria:**
- [ ] All critical paths tested
- [ ] Tests run in CI
- [ ] Documentation complete
- [ ] Rollback process tested

**Labels:** `testing`, `qa`, `migration`
**Priority:** High
**Estimated effort:** 8 hours

---

## Issue #9: Create documentation for cleanup process and decisions

**Title:** Create documentation for cleanup process and decisions

**Description:**
Document the cleanup process, decisions made, and lessons learned for future maintenance.

**Documentation to create:**
- [ ] Cleanup decision log
- [ ] File categorization criteria
- [ ] Risk assessment methodology
- [ ] Rollback procedures
- [ ] Future maintenance guidelines

**Acceptance Criteria:**
- [ ] Comprehensive documentation
- [ ] Reviewed by team
- [ ] Added to project wiki
- [ ] Includes lessons learned

**Labels:** `documentation`, `maintenance`
**Priority:** Medium
**Estimated effort:** 4 hours

---

## Issue #10: Implement automated dead code detection in CI pipeline

**Title:** Implement automated dead code detection in CI pipeline

**Description:**
Set up automated tools in the CI/CD pipeline to detect dead code and prevent accumulation of unused files in the future.

**Implementation tasks:**
- [ ] Research dead code detection tools
- [ ] Configure for TypeScript/Vue
- [ ] Integrate with CI pipeline
- [ ] Set up reporting
- [ ] Create maintenance procedures

**Tools to evaluate:**
- [ ] ESLint unused-imports
- [ ] ts-prune
- [ ] webpack-bundle-analyzer
- [ ] Custom scripts

**Acceptance Criteria:**
- [ ] Tool selected and configured
- [ ] CI pipeline updated
- [ ] Reports generated automatically
- [ ] Documentation complete

**Labels:** `ci-cd`, `automation`, `maintenance`
**Priority:** Medium
**Estimated effort:** 6 hours

---

## Recommended Issue Creation Order

1. Create Meta Issue first (#0)
2. Create test suite issue (#8) - Critical for safety
3. Create high-risk consolidation issue (#3)
4. Create remaining issues in numerical order
5. Link all issues to the Meta Issue
6. Set up project board with columns: To Do, In Progress, Review, Done