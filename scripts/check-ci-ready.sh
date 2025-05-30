#!/bin/bash

# Check if repository is ready for CI/CD pipeline
# This script verifies all necessary files are present and configured correctly

echo "🔍 Checking CI/CD readiness..."
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track if we have any issues
ISSUES_FOUND=0

# Check 1: Verify we're in the app directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found${NC}"
    echo "   Are you in the app directory?"
    ISSUES_FOUND=1
else
    echo -e "${GREEN}✅ package.json found${NC}"
fi

# Check 2: Verify package-lock.json exists
if [ ! -f "package-lock.json" ]; then
    echo -e "${RED}❌ Error: package-lock.json not found${NC}"
    echo "   Run: npm install"
    ISSUES_FOUND=1
else
    echo -e "${GREEN}✅ package-lock.json found${NC}"
    
    # Check if it's in sync with package.json
    if command -v npm &> /dev/null; then
        npm ls &> /dev/null
        if [ $? -ne 0 ]; then
            echo -e "${YELLOW}⚠️  Warning: package-lock.json may be out of sync${NC}"
            echo "   Run: npm install"
        fi
    fi
fi

# Check 3: Verify package-lock.json is not in .gitignore
if [ -f ".gitignore" ]; then
    if grep -q "^package-lock.json" .gitignore; then
        echo -e "${RED}❌ Error: package-lock.json is in .gitignore${NC}"
        echo "   Remove or comment out the line in .gitignore"
        ISSUES_FOUND=1
    else
        echo -e "${GREEN}✅ package-lock.json not ignored${NC}"
    fi
fi

# Check 4: Verify GitHub Actions workflow exists
if [ -f ".github/workflows/ci.yml" ]; then
    echo -e "${GREEN}✅ GitHub Actions CI workflow found${NC}"
else
    echo -e "${YELLOW}⚠️  Warning: .github/workflows/ci.yml not found${NC}"
    echo "   The CI pipeline may not run"
fi

# Check 5: Check if package-lock.json is tracked by git
if command -v git &> /dev/null; then
    git ls-files package-lock.json --error-unmatch &> /dev/null
    if [ $? -ne 0 ]; then
        echo -e "${YELLOW}⚠️  Warning: package-lock.json is not tracked by git${NC}"
        echo "   Run: git add package-lock.json"
    else
        echo -e "${GREEN}✅ package-lock.json is tracked by git${NC}"
    fi
fi

# Check 6: Verify npm ci works
if command -v npm &> /dev/null; then
    echo "🔄 Testing npm ci..."
    npm ci --dry-run &> /dev/null
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ npm ci test passed${NC}"
    else
        echo -e "${RED}❌ Error: npm ci would fail${NC}"
        echo "   Run: npm install && git add package-lock.json"
        ISSUES_FOUND=1
    fi
fi

# Check 7: Check for common CI scripts in package.json
echo "📋 Checking for CI scripts in package.json..."
for script in "lint" "test" "build" "typecheck"; do
    if grep -q "\"$script\":" package.json; then
        echo -e "${GREEN}✅ Script '$script' found${NC}"
    else
        echo -e "${YELLOW}⚠️  Warning: Script '$script' not found${NC}"
    fi
done

echo ""
echo "================================"
if [ $ISSUES_FOUND -eq 0 ]; then
    echo -e "${GREEN}✅ Repository is CI-ready!${NC}"
    echo ""
    echo "To ensure everything stays in sync:"
    echo "1. Always run 'npm install' after pulling changes"
    echo "2. Commit both package.json and package-lock.json together"
    echo "3. Use 'npm ci' in production and CI environments"
else
    echo -e "${RED}❌ Issues found! Please fix them before pushing.${NC}"
    exit 1
fi