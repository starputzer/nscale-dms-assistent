# System Integrity Test Rollback Procedures

## Quick Rollback Commands

### Complete Rollback to Previous State
```bash
# Create backup tag before any cleanup
git tag backup/pre-cleanup-$(date +%Y%m%d-%H%M%S)

# If tests fail after cleanup, revert to backup
git checkout main
git reset --hard backup/pre-cleanup-<timestamp>

# Alternative: Restore from backup branch
git checkout -b main-restored backup/pre-cleanup
git push --force origin main-restored:main
```

### Selective Rollback by Feature

#### 1. Authentication Issues
If authentication tests fail after cleanup:

```bash
# Restore auth-related files
git checkout HEAD~1 -- src/stores/auth.ts
git checkout HEAD~1 -- src/utils/authFix.ts
git checkout HEAD~1 -- src/utils/authenticationFix.ts
git checkout HEAD~1 -- src/composables/useAuth.ts

# Test authentication
npm run test:system-integrity -- auth-flows.spec.ts
```

**Manual fixes if needed:**
- Check localStorage keys: `auth_token`, `refresh_token`
- Verify API endpoints: `/api/login`, `/api/refresh`, `/api/logout`
- Ensure auth headers are correctly formatted: `Authorization: Bearer <token>`

#### 2. Batch API Issues
If batch API tests fail:

```bash
# Restore batch service files
git checkout HEAD~1 -- src/services/api/BatchRequestService.ts
git checkout HEAD~1 -- src/services/api/BatchRequestServiceFix.ts
git checkout HEAD~1 -- src/utils/batchResponseFix.ts

# Test batch operations
npm run test:system-integrity -- api-batch-operations.spec.ts
```

**Manual fixes:**
- Check batch endpoint: `/api/batch`
- Verify request format matches server expectations
- Ensure auth headers are passed to batch requests

#### 3. Feature Toggle Issues
If feature toggle tests fail:

```bash
# Restore feature toggle files
git checkout HEAD~1 -- src/stores/featureToggles.ts
git checkout HEAD~1 -- src/stores/featureToggles.production.ts
git checkout HEAD~1 -- src/config/default-feature-toggles.ts

# Test feature toggles
npm run test:system-integrity -- feature-toggles.spec.ts
```

**Manual fixes:**
- Check API endpoint: `/api/feature-toggles`
- Verify localStorage cache: `featureToggles`
- Ensure role-based features work correctly

#### 4. Build Process Issues
If build tests fail:

```bash
# Restore build configuration
git checkout HEAD~1 -- vite.config.ts
git checkout HEAD~1 -- tsconfig.json
git checkout HEAD~1 -- src/router/index.ts

# Clean and rebuild
rm -rf node_modules/.vite dist
npm run build
```

**Manual fixes:**
- Check for circular dependencies
- Verify all dynamic imports resolve correctly
- Ensure no missing type definitions

#### 5. Admin Panel Access Issues
If admin access tests fail:

```bash
# Restore admin-related files
git checkout HEAD~1 -- src/views/AdminPanel.vue
git checkout HEAD~1 -- src/stores/admin/**
git checkout HEAD~1 -- src/router/auth-routes.ts

# Test admin panel
npm run test:system-integrity -- admin-panel-access.spec.ts
```

**Manual fixes:**
- Verify admin permissions in auth store
- Check route guards for admin routes
- Ensure admin API endpoints are accessible

## Automated Rollback Script

Save this as `scripts/rollback-on-failure.sh`:

```bash
#!/bin/bash
# Automated rollback script for system integrity failures

set -e

echo "🔄 Starting automated rollback..."

# Function to rollback specific modules
rollback_module() {
    local module=$1
    local files=$2
    
    echo "Rolling back $module..."
    for file in $files; do
        if [ -f "$file" ]; then
            git checkout HEAD~1 -- "$file" || echo "Warning: Could not rollback $file"
        fi
    done
}

# Check which tests failed
echo "Running system integrity tests..."
TEST_OUTPUT=$(npm run test:system-integrity 2>&1 || true)

# Parse failed tests
if echo "$TEST_OUTPUT" | grep -q "auth-flows.spec.ts.*FAIL"; then
    echo "❌ Auth tests failed - reverting auth changes"
    rollback_module "Authentication" "src/stores/auth.ts src/utils/authFix.ts src/utils/authenticationFix.ts"
fi

if echo "$TEST_OUTPUT" | grep -q "api-batch-operations.spec.ts.*FAIL"; then
    echo "❌ API batch tests failed - reverting batch service changes"
    rollback_module "Batch API" "src/services/api/BatchRequestService.ts src/services/api/BatchRequestServiceFix.ts"
fi

if echo "$TEST_OUTPUT" | grep -q "feature-toggles.spec.ts.*FAIL"; then
    echo "❌ Feature toggle tests failed - reverting toggle changes"
    rollback_module "Feature Toggles" "src/stores/featureToggles.ts src/config/default-feature-toggles.ts"
fi

if echo "$TEST_OUTPUT" | grep -q "build-process.spec.ts.*FAIL"; then
    echo "❌ Build tests failed - reverting build configuration"
    rollback_module "Build Config" "vite.config.ts tsconfig.json"
fi

if echo "$TEST_OUTPUT" | grep -q "admin-panel-access.spec.ts.*FAIL"; then
    echo "❌ Admin tests failed - reverting admin changes"
    rollback_module "Admin Panel" "src/views/AdminPanel.vue src/stores/admin/*.ts"
fi

echo "✅ Rollback complete. Re-running tests..."
npm run test:system-integrity

if [ $? -eq 0 ]; then
    echo "✅ All tests passing after rollback"
else
    echo "❌ Tests still failing. Manual intervention required."
    exit 1
fi
```

## Pre-Cleanup Checklist

Before starting any cleanup:

1. **Create full backup:**
   ```bash
   git checkout -b backup/pre-cleanup-$(date +%Y%m%d)
   git push origin backup/pre-cleanup-$(date +%Y%m%d)
   ```

2. **Run baseline tests:**
   ```bash
   npm run test:system-integrity
   npm run test:e2e
   npm run build
   ```

3. **Document current state:**
   ```bash
   # Save test results
   npm run test:system-integrity:coverage
   cp -r coverage coverage-baseline
   
   # Save build output
   npm run build
   cp -r dist dist-baseline
   ```

## Emergency Recovery

If automated rollback fails:

### 1. Hard Reset to Backup
```bash
# Find last working commit
git log --oneline | grep "backup:"

# Hard reset
git reset --hard <commit-hash>
```

### 2. Restore from Remote
```bash
# If local is corrupted
git fetch origin
git reset --hard origin/main
```

### 3. Manual File Recovery
```bash
# List all changed files
git diff --name-only HEAD~10

# Restore specific files from history
git show HEAD~1:src/stores/auth.ts > src/stores/auth.ts.backup
```

## Monitoring After Rollback

1. **Run full test suite:**
   ```bash
   npm run test:system-integrity
   npm run test:unit
   npm run test:e2e
   ```

2. **Check application functionality:**
   - Login/logout flows
   - Chat functionality
   - Admin panel access
   - Document converter
   - Feature toggles

3. **Monitor logs:**
   ```bash
   tail -f logs/app.log
   tail -f logs/error.log
   ```

4. **Verify API endpoints:**
   ```bash
   curl -X POST http://localhost:8080/api/login
   curl -X GET http://localhost:8080/api/sessions
   curl -X POST http://localhost:8080/api/batch
   ```

## Post-Rollback Actions

1. **Document what failed:**
   - Create issue for failed cleanup
   - Note which files caused problems
   - Record error messages

2. **Plan fixes:**
   - Identify why cleanup broke functionality
   - Create more granular cleanup approach
   - Add missing tests before retry

3. **Communicate status:**
   - Notify team of rollback
   - Update project status
   - Schedule retry with fixes