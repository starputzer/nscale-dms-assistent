#!/bin/bash
# Script to create GitHub issues based on audit findings
# Date: 2025-05-30

set -e

echo "🚀 Creating GitHub Issues for Modernization Backlog"
echo "=================================================="

# Function to create issue
create_issue() {
    local title="$1"
    local body="$2"
    local labels="$3"
    local priority="$4"
    local milestone="$5"
    
    echo "Creating issue: $title"
    
    # Create issue file
    cat > "issue_${RANDOM}.json" << EOF
{
  "title": "$title",
  "body": "$body",
  "labels": [$labels],
  "milestone": $milestone
}
EOF
}

# Critical Security Updates
create_issue \
  "[CRITICAL] Fix TypeScript compilation errors blocking production build" \
  "## Problem\nThe project currently has 70+ TypeScript errors that prevent clean builds.\n\n## Impact\n- Blocks production deployments\n- Reduces code reliability\n- Prevents enabling strict mode benefits\n\n## Tasks\n- [ ] Fix type errors in stores/featureToggles.old.ts\n- [ ] Resolve performanceMonitor.ts case sensitivity issues\n- [ ] Fix Vue file type errors in build process\n- [ ] Enable strict TypeScript checking\n\n## Acceptance Criteria\n- npm run typecheck passes with 0 errors\n- Build completes successfully\n- All tests pass\n\n## Priority: CRITICAL\n## Effort: 8 story points" \
  '"bug", "typescript", "critical", "blocking"' \
  "critical" \
  "1"

create_issue \
  "[SECURITY] Upgrade Node.js from v18 to v20 LTS" \
  "## Problem\nNode.js 18 reaches EOL in April 2025. We need to upgrade to v20 LTS.\n\n## Impact\n- Security vulnerabilities after EOL\n- Missing performance improvements\n- Incompatibility with newer packages\n\n## Tasks\n- [ ] Update .nvmrc to v20\n- [ ] Update GitHub Actions workflows\n- [ ] Update Docker base images\n- [ ] Test all dependencies compatibility\n- [ ] Update documentation\n\n## Acceptance Criteria\n- All CI/CD pipelines use Node.js 20\n- Local development uses Node.js 20\n- All tests pass\n- No npm warnings\n\n## Priority: HIGH\n## Effort: 5 story points" \
  '"security", "infrastructure", "dependencies"' \
  "high" \
  "1"

create_issue \
  "[SECURITY] Fix overly permissive CORS configuration" \
  "## Problem\nCORS is configured with allow_origins=['*'] which is a security risk.\n\n## Impact\n- Potential XSS attacks\n- Data exposure to unauthorized domains\n- Security audit failures\n\n## Tasks\n- [ ] Define allowed origins list\n- [ ] Implement environment-based CORS config\n- [ ] Add CORS tests\n- [ ] Update security documentation\n\n## Acceptance Criteria\n- CORS restricted to specific domains\n- Different configs for dev/staging/prod\n- Security tests pass\n\n## Priority: HIGH\n## Effort: 3 story points" \
  '"security", "backend", "api"' \
  "high" \
  "1"

# Dependency Updates
create_issue \
  "[DEPS] Upgrade major dependencies for performance and security" \
  "## Problem\nSeveral major dependencies have newer versions available.\n\n## Updates Needed\n- @types/node: 20.17.46 → 22.15.28\n- @vueuse/core: 10.11.1 → 13.3.0\n- marked: 9.1.6 → 15.0.12\n- uuid: 9.0.1 → 11.1.0\n- eslint: 8.57.1 → 9.27.0\n\n## Tasks\n- [ ] Review breaking changes for each package\n- [ ] Update packages incrementally\n- [ ] Fix any breaking changes\n- [ ] Run full test suite\n- [ ] Update documentation\n\n## Acceptance Criteria\n- All packages updated\n- No security vulnerabilities\n- All tests pass\n- Application functions correctly\n\n## Priority: MEDIUM\n## Effort: 13 story points" \
  '"dependencies", "maintenance", "security"' \
  "medium" \
  "2"

# Performance Optimizations
create_issue \
  "[PERF] Optimize 947KB messageFormatter bundle" \
  "## Problem\nmessageFormatter bundle is 947KB, accounting for ~40% of total bundle size.\n\n## Impact\n- Slow initial page load\n- Poor mobile performance\n- High bandwidth usage\n\n## Tasks\n- [ ] Analyze bundle with webpack-bundle-analyzer\n- [ ] Implement code splitting for formatter\n- [ ] Lazy load heavy dependencies\n- [ ] Consider lighter alternatives\n- [ ] Add bundle size budgets\n\n## Acceptance Criteria\n- Bundle size < 300KB\n- Maintains all functionality\n- Performance metrics improved\n- Bundle size CI checks added\n\n## Priority: HIGH\n## Effort: 8 story points" \
  '"performance", "frontend", "optimization"' \
  "high" \
  "1"

create_issue \
  "[PERF] Implement proper database connection pooling" \
  "## Problem\nDatabase connections not properly pooled, causing performance issues.\n\n## Tasks\n- [ ] Configure SQLAlchemy connection pool\n- [ ] Add connection monitoring\n- [ ] Implement connection recycling\n- [ ] Add performance tests\n- [ ] Document configuration\n\n## Acceptance Criteria\n- Connection pool configured\n- Performance improved by 20%+\n- No connection leaks\n- Monitoring in place\n\n## Priority: MEDIUM\n## Effort: 5 story points" \
  '"performance", "backend", "database"' \
  "medium" \
  "2"

# Code Modernization
create_issue \
  "[REFACTOR] Split large auth store (1600+ lines) into modules" \
  "## Problem\nThe auth store is a monolithic 1600+ line file handling too many responsibilities.\n\n## Tasks\n- [ ] Analyze current responsibilities\n- [ ] Design modular structure\n- [ ] Extract authentication module\n- [ ] Extract authorization module\n- [ ] Extract token management\n- [ ] Update all imports\n- [ ] Add comprehensive tests\n\n## Acceptance Criteria\n- No single module > 300 lines\n- Clear separation of concerns\n- All tests pass\n- No functionality regression\n\n## Priority: MEDIUM\n## Effort: 13 story points" \
  '"refactoring", "architecture", "frontend"' \
  "medium" \
  "2"

create_issue \
  "[REFACTOR] Standardize API calls through service layer" \
  "## Problem\nMixed patterns between direct axios calls and service layer usage.\n\n## Tasks\n- [ ] Audit all API calls\n- [ ] Create consistent service interfaces\n- [ ] Migrate direct axios calls\n- [ ] Add request/response interceptors\n- [ ] Implement retry logic\n- [ ] Add comprehensive error handling\n\n## Acceptance Criteria\n- No direct axios imports in components\n- All API calls through services\n- Consistent error handling\n- Request retry logic\n\n## Priority: MEDIUM\n## Effort: 8 story points" \
  '"refactoring", "architecture", "api"' \
  "medium" \
  "2"

# Documentation Updates
create_issue \
  "[DOCS] Fix version inconsistencies and branding confusion" \
  "## Problem\n- Different versions across files (1.0.0, 3.0.0, 1.1.0)\n- Mixed branding between 'nscale DMS Assistent' and 'Digitale Akte Assistent'\n\n## Tasks\n- [ ] Standardize version to 3.0.0\n- [ ] Update all references to new branding\n- [ ] Fix broken internal links\n- [ ] Update installation guides\n- [ ] Generate API documentation\n\n## Acceptance Criteria\n- Consistent versioning\n- Consistent branding\n- All links work\n- API fully documented\n\n## Priority: HIGH\n## Effort: 5 story points" \
  '"documentation", "maintenance"' \
  "high" \
  "1"

# Testing Improvements
create_issue \
  "[TEST] Expand backend Python test coverage" \
  "## Problem\nOnly 7 Python test files for entire backend. Critical paths untested.\n\n## Tasks\n- [ ] Add unit tests for all services\n- [ ] Add integration tests for API endpoints\n- [ ] Add authentication/authorization tests\n- [ ] Add database migration tests\n- [ ] Configure pytest coverage reports\n- [ ] Add coverage to CI pipeline\n\n## Acceptance Criteria\n- Backend coverage > 70%\n- All critical paths tested\n- CI enforces coverage\n- Tests run in < 2 minutes\n\n## Priority: HIGH\n## Effort: 21 story points" \
  '"testing", "backend", "quality"' \
  "high" \
  "1"

create_issue \
  "[TEST] Implement API contract testing" \
  "## Problem\nNo contract testing between frontend and backend APIs.\n\n## Tasks\n- [ ] Choose contract testing tool (Pact/Postman)\n- [ ] Define API contracts\n- [ ] Implement contract tests\n- [ ] Add to CI pipeline\n- [ ] Document process\n\n## Acceptance Criteria\n- All endpoints have contracts\n- Contract tests in CI\n- Breaking changes detected\n- Documentation complete\n\n## Priority: MEDIUM\n## Effort: 8 story points" \
  '"testing", "api", "quality"' \
  "medium" \
  "2"

# DevOps Enhancements
create_issue \
  "[DEVOPS] Add monitoring and APM integration" \
  "## Problem\nNo Application Performance Monitoring or comprehensive observability.\n\n## Tasks\n- [ ] Evaluate APM solutions (Sentry/DataDog/New Relic)\n- [ ] Implement frontend RUM\n- [ ] Add backend APM\n- [ ] Configure error tracking\n- [ ] Set up dashboards\n- [ ] Create alerting rules\n\n## Acceptance Criteria\n- Full stack monitoring\n- Error tracking active\n- Performance dashboards\n- Alerting configured\n\n## Priority: MEDIUM\n## Effort: 13 story points" \
  '"devops", "monitoring", "infrastructure"' \
  "medium" \
  "2"

create_issue \
  "[DEVOPS] Implement deployment smoke tests" \
  "## Problem\nOnly basic HTTP checks after deployment. No functional validation.\n\n## Tasks\n- [ ] Define critical user journeys\n- [ ] Create smoke test suite\n- [ ] Integrate with deployment pipeline\n- [ ] Add rollback triggers\n- [ ] Document runbooks\n\n## Acceptance Criteria\n- Smoke tests < 5 minutes\n- Auto-rollback on failure\n- All critical paths tested\n- Runbooks complete\n\n## Priority: HIGH\n## Effort: 8 story points" \
  '"devops", "testing", "deployment"' \
  "high" \
  "1"

# Quick Wins
create_issue \
  "[QUICK-WIN] Replace console.log with proper logging service" \
  "## Problem\n132 files using console.log instead of the logging service.\n\n## Tasks\n- [ ] Create codemod script\n- [ ] Run replacement\n- [ ] Test changes\n- [ ] Update linting rules\n\n## Acceptance Criteria\n- No console.log in codebase\n- Logging service used\n- Lint rule prevents regression\n\n## Priority: LOW\n## Effort: 3 story points" \
  '"quick-win", "code-quality", "logging"' \
  "low" \
  "1"

create_issue \
  "[QUICK-WIN] Configure ESLint and Prettier" \
  "## Problem\nNo linting configuration despite having ESLint in dependencies.\n\n## Tasks\n- [ ] Create .eslintrc configuration\n- [ ] Create .prettierrc configuration\n- [ ] Add pre-commit hooks\n- [ ] Fix initial violations\n- [ ] Add to CI pipeline\n\n## Acceptance Criteria\n- Linting configured\n- Pre-commit hooks active\n- CI enforces linting\n- Documentation updated\n\n## Priority: MEDIUM\n## Effort: 5 story points" \
  '"quick-win", "code-quality", "tooling"' \
  "medium" \
  "1"

echo "✅ Issue templates created successfully!"
echo ""
echo "To create issues on GitHub:"
echo "1. Install GitHub CLI: gh auth login"
echo "2. Run: ./scripts/push-issues-to-github.sh"
echo ""
echo "Total issues created: 15"
echo "- Critical: 1"
echo "- High Priority: 6"
echo "- Medium Priority: 7"
echo "- Low Priority: 1"