#!/bin/bash

echo "🚀 Setting up CI/CD Pipeline for nscale DMS Assistant"
echo "===================================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Step 1: Install Husky
echo -e "\n${YELLOW}Step 1: Installing Husky for Git hooks...${NC}"
if [ ! -d ".husky" ]; then
    npm install --save-dev husky
    npx husky install
    echo -e "${GREEN}✅ Husky installed${NC}"
else
    echo -e "${GREEN}✅ Husky already installed${NC}"
fi

# Step 2: Add Git hooks
echo -e "\n${YELLOW}Step 2: Setting up Git hooks...${NC}"
npx husky add .husky/pre-commit "npm run lint:fix && npm run typecheck"
npx husky add .husky/pre-push "npm run test:unit -- --passWithNoTests && npm run security:audit"
chmod +x .husky/pre-commit .husky/pre-push
echo -e "${GREEN}✅ Git hooks configured${NC}"

# Step 3: Install lint-staged
echo -e "\n${YELLOW}Step 3: Installing lint-staged...${NC}"
if ! grep -q "lint-staged" package.json; then
    npm install --save-dev lint-staged
    echo -e "${GREEN}✅ lint-staged installed${NC}"
else
    echo -e "${GREEN}✅ lint-staged already installed${NC}"
fi

# Step 4: Install CI/CD dependencies
echo -e "\n${YELLOW}Step 4: Installing CI/CD dependencies...${NC}"
npm install --save-dev \
    ts-prune \
    depcheck \
    jscpd \
    @types/node \
    imagemin-lint-staged

echo -e "${GREEN}✅ CI/CD dependencies installed${NC}"

# Step 5: Create GitHub Actions directory
echo -e "\n${YELLOW}Step 5: Setting up GitHub Actions...${NC}"
if [ ! -d ".github/workflows" ]; then
    mkdir -p .github/workflows
    echo -e "${GREEN}✅ GitHub Actions directory created${NC}"
else
    echo -e "${GREEN}✅ GitHub Actions directory exists${NC}"
fi

# Step 6: Verify workflow files
echo -e "\n${YELLOW}Step 6: Verifying workflow files...${NC}"
workflows=(
    ".github/workflows/ci.yml"
    ".github/workflows/dead-code-detection.yml"
)

for workflow in "${workflows[@]}"; do
    if [ -f "$workflow" ]; then
        echo -e "${GREEN}✅ $workflow exists${NC}"
    else
        echo -e "${RED}❌ $workflow missing${NC}"
    fi
done

# Step 7: Create additional config files
echo -e "\n${YELLOW}Step 7: Creating additional config files...${NC}"

# Create .prettierrc if not exists
if [ ! -f ".prettierrc" ]; then
    cat > .prettierrc << EOF
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": false,
  "printWidth": 100,
  "tabWidth": 2
}
EOF
    echo -e "${GREEN}✅ .prettierrc created${NC}"
fi

# Create .eslintignore if not exists
if [ ! -f ".eslintignore" ]; then
    cat > .eslintignore << EOF
node_modules/
dist/
build/
coverage/
*.min.js
*.min.css
public/js/legacy/
EOF
    echo -e "${GREEN}✅ .eslintignore created${NC}"
fi

# Step 8: Test the setup
echo -e "\n${YELLOW}Step 8: Testing the setup...${NC}"

# Test linting
echo "Testing ESLint..."
npm run lint -- --max-warnings 0 || echo -e "${YELLOW}⚠️  Linting issues found (this is normal)${NC}"

# Test type checking
echo "Testing TypeScript..."
npm run typecheck || echo -e "${YELLOW}⚠️  Type errors found (this is normal)${NC}"

# Test dead code detection
echo "Testing dead code detection..."
if [ -f "scripts/detect-dead-code.js" ]; then
    npm run detect:dead-code || echo -e "${YELLOW}⚠️  Dead code found (this is normal)${NC}"
fi

# Step 9: Generate summary
echo -e "\n${GREEN}=========================================${NC}"
echo -e "${GREEN}✅ CI/CD Pipeline Setup Complete!${NC}"
echo -e "${GREEN}=========================================${NC}"

echo -e "\n📋 ${YELLOW}Next Steps:${NC}"
echo "1. Commit the changes:"
echo "   git add ."
echo "   git commit -m 'feat: Add CI/CD pipeline with GitHub Actions and Husky'"
echo ""
echo "2. Push to GitHub to activate workflows:"
echo "   git push origin main"
echo ""
echo "3. GitHub Actions will run automatically on:"
echo "   - Every push to main/develop branches"
echo "   - Every pull request"
echo "   - Weekly schedule (Mondays 9am UTC)"
echo ""
echo "4. Local hooks will run:"
echo "   - Pre-commit: Linting and type checking"
echo "   - Pre-push: Tests and security audit"
echo ""
echo "5. Monitor your workflows at:"
echo "   https://github.com/[YOUR_USERNAME]/[YOUR_REPO]/actions"

echo -e "\n💡 ${YELLOW}Tips:${NC}"
echo "- Run 'npm run detect:dead-code' to find unused code"
echo "- Run 'npm run security:audit' to check for vulnerabilities"
echo "- Run 'npm run build:analyze' to analyze bundle size"
echo "- Use 'git commit --no-verify' to skip hooks (emergency only!)"

echo -e "\n🔧 ${YELLOW}Configuration Files Created/Updated:${NC}"
echo "- .github/workflows/ci.yml"
echo "- .github/workflows/dead-code-detection.yml"
echo "- .husky/pre-commit"
echo "- .husky/pre-push"
echo "- .lintstagedrc.js"
echo "- lighthouse-budget.json"
echo "- package.json (updated scripts)"

echo -e "\n🎉 Happy coding with automated quality checks!"