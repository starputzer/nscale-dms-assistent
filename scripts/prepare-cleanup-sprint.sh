#!/bin/bash

# Prepare Cleanup Sprint Script
# This script prepares the environment for a quarterly cleanup sprint

echo "🧹 Preparing Cleanup Sprint Environment"
echo "======================================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
SPRINT_NAME="${1:-Q3-2025}"
ANALYSIS_DIR="cleanup-analysis-${SPRINT_NAME}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Step 1: Create analysis directory
echo -e "\n${YELLOW}Step 1: Creating analysis directory...${NC}"
mkdir -p "${ANALYSIS_DIR}"
cd "${ANALYSIS_DIR}"

# Step 2: Install/Update analysis tools
echo -e "\n${YELLOW}Step 2: Installing analysis tools...${NC}"
npm install --save-dev \
    ts-prune \
    madge \
    depcheck \
    knip \
    type-coverage \
    size-limit \
    @size-limit/file \
    lighthouse \
    eslint-plugin-unused-imports \
    jscpd \
    complexity-report

echo -e "${GREEN}✅ Tools installed${NC}"

# Step 3: Generate current metrics baseline
echo -e "\n${YELLOW}Step 3: Generating metrics baseline...${NC}"

# TypeScript analysis
echo "Analyzing TypeScript..."
npx tsc --noEmit --strict 2>&1 | tee typescript-errors.log
TS_ERRORS=$(grep -c "error TS" typescript-errors.log || echo "0")

# Type coverage
echo "Checking type coverage..."
npx type-coverage --detail > type-coverage.log
TYPE_COVERAGE=$(grep -oP '\d+\.\d+(?=%)' type-coverage.log | head -1)

# Test coverage
echo "Running test coverage..."
npm run test:coverage -- --reporter=json --outputFile=coverage.json 2>/dev/null || true
if [ -f coverage.json ]; then
    TEST_COVERAGE=$(jq '.total.lines.pct' coverage.json 2>/dev/null || echo "0")
else
    TEST_COVERAGE="0"
fi

# Bundle size analysis
echo "Analyzing bundle size..."
npm run build:analyze 2>&1 | tee bundle-analysis.log
BUNDLE_SIZE=$(find dist -name "*.js" -exec du -ch {} + 2>/dev/null | grep total | awk '{print $1}' || echo "0")

# Dead code detection
echo "Detecting dead code..."
npx ts-prune 2>&1 | tee dead-code.log
DEAD_CODE_COUNT=$(wc -l < dead-code.log)

# Circular dependencies
echo "Checking circular dependencies..."
npx madge --circular ../src 2>&1 | tee circular-deps.log
CIRCULAR_COUNT=$(grep -c "✖" circular-deps.log || echo "0")

# Unused dependencies
echo "Checking unused dependencies..."
npx depcheck .. 2>&1 | tee unused-deps.log

# Code duplication
echo "Checking code duplication..."
npx jscpd ../src --min-lines 5 --min-tokens 50 --format json --output duplication.json

# Complexity analysis
echo "Analyzing code complexity..."
npx complexity-report ../src --format json > complexity.json 2>/dev/null || true

# Step 4: Create metrics summary
echo -e "\n${YELLOW}Step 4: Creating metrics summary...${NC}"

cat > metrics-baseline.json << EOF
{
  "sprint": "${SPRINT_NAME}",
  "timestamp": "${TIMESTAMP}",
  "metrics": {
    "typescript": {
      "errors": ${TS_ERRORS},
      "typeCoverage": ${TYPE_COVERAGE:-0}
    },
    "testing": {
      "coverage": ${TEST_COVERAGE:-0}
    },
    "bundle": {
      "size": "${BUNDLE_SIZE}",
      "files": $(find ../dist -name "*.js" 2>/dev/null | wc -l || echo 0)
    },
    "codeQuality": {
      "deadCode": ${DEAD_CODE_COUNT},
      "circularDeps": ${CIRCULAR_COUNT}
    }
  }
}
EOF

# Step 5: Generate Sprint Backlog
echo -e "\n${YELLOW}Step 5: Generating sprint backlog...${NC}"

cat > sprint-backlog.md << EOF
# Cleanup Sprint ${SPRINT_NAME} - Backlog

Generated: $(date)

## 📊 Current Metrics

| Metric | Current Value | Target | Priority |
|--------|---------------|--------|----------|
| TypeScript Errors | ${TS_ERRORS} | 0 | High |
| Type Coverage | ${TYPE_COVERAGE}% | 95% | High |
| Test Coverage | ${TEST_COVERAGE}% | 80% | High |
| Bundle Size | ${BUNDLE_SIZE} | <250KB | Medium |
| Dead Code Items | ${DEAD_CODE_COUNT} | 0 | Medium |
| Circular Dependencies | ${CIRCULAR_COUNT} | 0 | Low |

## 🎯 Sprint Goals

1. **TypeScript Strict Mode** - Eliminate all TS errors
2. **Test Coverage** - Reach 80% coverage
3. **Bundle Optimization** - Reduce to <250KB
4. **Code Cleanup** - Remove all dead code
5. **Documentation** - Update all outdated docs

## 📋 Task Breakdown

### High Priority Tasks
EOF

# Add TypeScript errors to backlog
if [ ${TS_ERRORS} -gt 0 ]; then
    echo "#### TypeScript Fixes Needed:" >> sprint-backlog.md
    grep "error TS" typescript-errors.log | head -20 >> sprint-backlog.md
    echo "" >> sprint-backlog.md
fi

# Add dead code to backlog
if [ ${DEAD_CODE_COUNT} -gt 0 ]; then
    echo "#### Dead Code to Remove:" >> sprint-backlog.md
    head -20 dead-code.log >> sprint-backlog.md
    echo "" >> sprint-backlog.md
fi

# Step 6: Create automation scripts
echo -e "\n${YELLOW}Step 6: Creating automation scripts...${NC}"

# Daily metrics script
cat > daily-metrics.sh << 'EOF'
#!/bin/bash
# Run daily during sprint to track progress

echo "📊 Daily Cleanup Metrics - $(date)"
echo "================================"

# TypeScript
echo -n "TypeScript Errors: "
npx tsc --noEmit 2>&1 | grep -c "error TS" || echo "0"

# Coverage
echo -n "Test Coverage: "
npm run test:coverage -- --reporter=json --outputFile=/tmp/coverage.json 2>/dev/null
jq '.total.lines.pct' /tmp/coverage.json 2>/dev/null || echo "N/A"

# Bundle
echo -n "Bundle Size: "
du -sh dist/*.js 2>/dev/null | awk '{sum+=$1} END {print sum "KB"}' || echo "N/A"

# Dead code
echo -n "Dead Code Items: "
npx ts-prune 2>/dev/null | wc -l

echo ""
echo "Run 'npm run analyze:all' for detailed analysis"
EOF

chmod +x daily-metrics.sh

# Cleanup validation script
cat > validate-cleanup.sh << 'EOF'
#!/bin/bash
# Validate cleanup goals are met

ERRORS=0

echo "🔍 Validating Cleanup Goals..."

# Check TypeScript
TS_ERRORS=$(npx tsc --noEmit 2>&1 | grep -c "error TS" || echo "0")
if [ $TS_ERRORS -gt 0 ]; then
    echo "❌ TypeScript still has $TS_ERRORS errors"
    ERRORS=$((ERRORS + 1))
else
    echo "✅ TypeScript is error-free"
fi

# Check Coverage
COVERAGE=$(npm run test:coverage -- --reporter=json --outputFile=/tmp/cov.json 2>/dev/null && jq '.total.lines.pct' /tmp/cov.json)
if (( $(echo "$COVERAGE < 80" | bc -l) )); then
    echo "❌ Test coverage is only ${COVERAGE}% (target: 80%)"
    ERRORS=$((ERRORS + 1))
else
    echo "✅ Test coverage is ${COVERAGE}%"
fi

# Check bundle size
BUNDLE_KB=$(find dist -name "*.js" -exec du -k {} + | awk '{sum+=$1} END {print sum}' 2>/dev/null || echo "999")
if [ $BUNDLE_KB -gt 250 ]; then
    echo "❌ Bundle size is ${BUNDLE_KB}KB (target: <250KB)"
    ERRORS=$((ERRORS + 1))
else
    echo "✅ Bundle size is ${BUNDLE_KB}KB"
fi

# Check dead code
DEAD_CODE=$(npx ts-prune 2>/dev/null | wc -l)
if [ $DEAD_CODE -gt 0 ]; then
    echo "❌ Still have $DEAD_CODE dead code items"
    ERRORS=$((ERRORS + 1))
else
    echo "✅ No dead code found"
fi

echo ""
if [ $ERRORS -eq 0 ]; then
    echo "🎉 All cleanup goals met!"
    exit 0
else
    echo "⚠️  $ERRORS goals not yet met"
    exit 1
fi
EOF

chmod +x validate-cleanup.sh

# Step 7: Setup Git hooks for sprint
echo -e "\n${YELLOW}Step 7: Setting up Git hooks...${NC}"

cat > ../.husky/pre-push-cleanup << 'EOF'
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "🧹 Running cleanup validations..."

# Don't allow pushing code that increases tech debt during cleanup sprint
npx tsc --noEmit || {
    echo "❌ TypeScript errors detected. Fix before pushing during cleanup sprint!"
    exit 1
}

# Warn about decreasing coverage
echo "⚠️  Remember: Coverage should increase during cleanup sprint"

exit 0
EOF

chmod +x ../.husky/pre-push-cleanup

# Step 8: Create sprint dashboard
echo -e "\n${YELLOW}Step 8: Creating sprint dashboard...${NC}"

cat > sprint-dashboard.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Cleanup Sprint Dashboard</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .metric { 
            display: inline-block; 
            margin: 10px; 
            padding: 20px; 
            border: 1px solid #ddd; 
            border-radius: 8px;
            text-align: center;
        }
        .metric h3 { margin: 0 0 10px 0; }
        .metric .value { font-size: 2em; font-weight: bold; }
        .good { color: green; }
        .warning { color: orange; }
        .bad { color: red; }
    </style>
</head>
<body>
    <h1>Cleanup Sprint Dashboard</h1>
    <div id="metrics"></div>
    <script>
        // Load and display metrics
        fetch('metrics-baseline.json')
            .then(r => r.json())
            .then(data => {
                const container = document.getElementById('metrics');
                const metrics = data.metrics;
                
                // Add metric cards
                container.innerHTML = `
                    <div class="metric">
                        <h3>TypeScript Errors</h3>
                        <div class="value ${metrics.typescript.errors === 0 ? 'good' : 'bad'}">
                            ${metrics.typescript.errors}
                        </div>
                    </div>
                    <div class="metric">
                        <h3>Type Coverage</h3>
                        <div class="value ${metrics.typescript.typeCoverage >= 95 ? 'good' : 'warning'}">
                            ${metrics.typescript.typeCoverage}%
                        </div>
                    </div>
                    <div class="metric">
                        <h3>Test Coverage</h3>
                        <div class="value ${metrics.testing.coverage >= 80 ? 'good' : 'warning'}">
                            ${metrics.testing.coverage}%
                        </div>
                    </div>
                    <div class="metric">
                        <h3>Dead Code</h3>
                        <div class="value ${metrics.codeQuality.deadCode === 0 ? 'good' : 'bad'}">
                            ${metrics.codeQuality.deadCode}
                        </div>
                    </div>
                `;
            });
    </script>
</body>
</html>
EOF

# Step 9: Final summary
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Cleanup Sprint Environment Ready!${NC}"
echo -e "${GREEN}========================================${NC}"

echo -e "\n📁 Created in: ${ANALYSIS_DIR}"
echo -e "\n📊 Initial Metrics:"
echo "  - TypeScript Errors: ${TS_ERRORS}"
echo "  - Type Coverage: ${TYPE_COVERAGE}%"
echo "  - Test Coverage: ${TEST_COVERAGE}%"
echo "  - Bundle Size: ${BUNDLE_SIZE}"
echo "  - Dead Code Items: ${DEAD_CODE_COUNT}"

echo -e "\n📋 Next Steps:"
echo "1. Review sprint-backlog.md for task breakdown"
echo "2. Run ./daily-metrics.sh each day to track progress"
echo "3. Use ./validate-cleanup.sh to check if goals are met"
echo "4. Open sprint-dashboard.html in browser for visual tracking"

echo -e "\n🚀 Good luck with the cleanup sprint!"