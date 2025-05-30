#!/bin/bash
# Automated rollback script for system integrity failures

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 Starting automated rollback...${NC}"

# Function to rollback specific modules
rollback_module() {
    local module=$1
    shift
    local files=("$@")
    
    echo -e "${YELLOW}Rolling back $module...${NC}"
    for file in "${files[@]}"; do
        if [ -f "$file" ]; then
            if git checkout HEAD~1 -- "$file" 2>/dev/null; then
                echo -e "  ${GREEN}✓${NC} Restored: $file"
            else
                echo -e "  ${RED}✗${NC} Could not restore: $file"
            fi
        else
            echo -e "  ${YELLOW}⚠${NC} File not found: $file"
        fi
    done
}

# Create temporary file for test output
TEST_OUTPUT_FILE=$(mktemp)

# Run system integrity tests
echo -e "${BLUE}Running system integrity tests...${NC}"
if npm run test:system-integrity > "$TEST_OUTPUT_FILE" 2>&1; then
    echo -e "${GREEN}✅ All tests passing! No rollback needed.${NC}"
    rm "$TEST_OUTPUT_FILE"
    exit 0
fi

# Tests failed, analyze output
echo -e "${RED}❌ Tests failed. Analyzing failures...${NC}"
cat "$TEST_OUTPUT_FILE"

# Define file mappings for each test suite
declare -A TEST_FILES
TEST_FILES[auth-flows]="src/stores/auth.ts src/utils/authFix.ts src/utils/authenticationFix.ts src/composables/useAuth.ts"
TEST_FILES[api-batch-operations]="src/services/api/BatchRequestService.ts src/services/api/BatchRequestServiceFix.ts src/utils/batchResponseFix.ts src/utils/batchAuthFix.ts"
TEST_FILES[feature-toggles]="src/stores/featureToggles.ts src/stores/featureToggles.production.ts src/config/default-feature-toggles.ts"
TEST_FILES[build-process]="vite.config.ts tsconfig.json src/router/index.ts src/router/viewImports.ts"
TEST_FILES[admin-panel-access]="src/views/AdminPanel.vue src/stores/admin.ts src/router/auth-routes.ts"

# Track if any rollback was performed
ROLLBACK_PERFORMED=false

# Check each test suite
for test_name in "${!TEST_FILES[@]}"; do
    if grep -q "${test_name}.spec.ts.*FAIL" "$TEST_OUTPUT_FILE"; then
        echo -e "${RED}❌ ${test_name} tests failed${NC}"
        IFS=' ' read -ra files <<< "${TEST_FILES[$test_name]}"
        rollback_module "$test_name" "${files[@]}"
        ROLLBACK_PERFORMED=true
    fi
done

# Clean up temp file
rm "$TEST_OUTPUT_FILE"

if [ "$ROLLBACK_PERFORMED" = false ]; then
    echo -e "${YELLOW}⚠️  No specific test failures detected, but tests are still failing.${NC}"
    echo -e "${YELLOW}Manual intervention may be required.${NC}"
    exit 1
fi

# Re-run tests after rollback
echo -e "\n${BLUE}✅ Rollback complete. Re-running tests...${NC}"
if npm run test:system-integrity; then
    echo -e "${GREEN}✅ All tests passing after rollback!${NC}"
    echo -e "${YELLOW}Note: Some files have been reverted. Please review the changes.${NC}"
    
    # Show which files were rolled back
    echo -e "\n${BLUE}Rolled back files:${NC}"
    git status --porcelain | grep "^M" | awk '{print "  - " $2}'
    
    exit 0
else
    echo -e "${RED}❌ Tests still failing after rollback.${NC}"
    echo -e "${RED}Manual intervention required. Consider:${NC}"
    echo -e "  1. Running: git reset --hard HEAD"
    echo -e "  2. Checking for environment issues"
    echo -e "  3. Reviewing test output for specific errors"
    exit 1
fi