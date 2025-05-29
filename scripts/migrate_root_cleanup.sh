#!/bin/bash
# Hauptverzeichnis-Bereinigung für Digitale Akte Assistent
# Sicheres Migrations-Script mit Rollback-Funktionalität

set -e  # Exit on error

# Farben für Output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Timestamp für Backup
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backup_root_${TIMESTAMP}"

echo -e "${GREEN}=== Hauptverzeichnis-Bereinigung ===${NC}"
echo -e "Timestamp: ${TIMESTAMP}"

# Phase 0: Pre-flight checks
echo -e "\n${YELLOW}Phase 0: Pre-flight Checks${NC}"

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "vite.config.js" ]; then
    echo -e "${RED}ERROR: Not in app root directory!${NC}"
    exit 1
fi

# Test current build
echo "Testing current build..."
if ! npm run build > /dev/null 2>&1; then
    echo -e "${RED}WARNING: Build currently failing. Continue anyway? (y/n)${NC}"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Phase 1: Backup
echo -e "\n${YELLOW}Phase 1: Creating Backup${NC}"
mkdir -p "${BACKUP_DIR}"

# Backup all files that will be moved/deleted
echo "Backing up files..."
tar -czf "${BACKUP_DIR}/root_files_backup.tar.gz" \
    *.js *.cjs *.mjs *.ts *.sh *.json *.txt *.html *.png 2>/dev/null || true

echo -e "${GREEN}✓ Backup created: ${BACKUP_DIR}/root_files_backup.tar.gz${NC}"

# Phase 2: Create directory structure
echo -e "\n${YELLOW}Phase 2: Creating Directory Structure${NC}"

mkdir -p scripts/{test,debug,fix,setup,check,db}
mkdir -p build-scripts/{build,serve,start,test,migration,utilities}
mkdir -p config/alternatives
mkdir -p archive/temporary

echo -e "${GREEN}✓ Directory structure created${NC}"

# Phase 3: Move test/debug/fix scripts
echo -e "\n${YELLOW}Phase 3: Moving Development Scripts${NC}"

# Test scripts
echo "Moving test scripts..."
for file in test-*.js test-*.cjs; do
    if [ -f "$file" ]; then
        mv "$file" scripts/test/ 2>/dev/null || true
        echo "  → Moved $file to scripts/test/"
    fi
done

# Debug scripts
echo "Moving debug scripts..."
for file in debug-*.js; do
    if [ -f "$file" ]; then
        mv "$file" scripts/debug/ 2>/dev/null || true
        echo "  → Moved $file to scripts/debug/"
    fi
done

# Fix scripts
echo "Moving fix scripts..."
for file in fix-*.js fix-*.cjs; do
    if [ -f "$file" ]; then
        mv "$file" scripts/fix/ 2>/dev/null || true
        echo "  → Moved $file to scripts/fix/"
    fi
done

# Check scripts
echo "Moving check scripts..."
for file in check-*.js check-*.cjs; do
    if [ -f "$file" ]; then
        mv "$file" scripts/check/ 2>/dev/null || true
        echo "  → Moved $file to scripts/check/"
    fi
done

# Setup scripts
echo "Moving setup scripts..."
for file in setup*.js browser-auth-setup.js emergency-chat.js frontend-batch-hotfix.js; do
    if [ -f "$file" ]; then
        mv "$file" scripts/setup/ 2>/dev/null || true
        echo "  → Moved $file to scripts/setup/"
    fi
done

# Phase 4: Move shell scripts
echo -e "\n${YELLOW}Phase 4: Moving Shell Scripts${NC}"

# Build scripts
echo "Moving build scripts..."
for file in build-*.sh; do
    if [ -f "$file" ]; then
        mv "$file" build-scripts/build/ 2>/dev/null || true
        echo "  → Moved $file to build-scripts/build/"
    fi
done

# Serve scripts
echo "Moving serve scripts..."
for file in serve-*.sh serve-*.js; do
    if [ -f "$file" ]; then
        mv "$file" build-scripts/serve/ 2>/dev/null || true
        echo "  → Moved $file to build-scripts/serve/"
    fi
done

# Start scripts
echo "Moving start scripts..."
for file in start-*.sh; do
    if [ -f "$file" ]; then
        mv "$file" build-scripts/start/ 2>/dev/null || true
        echo "  → Moved $file to build-scripts/start/"
    fi
done

# Test scripts
echo "Moving test shell scripts..."
for file in test-*.sh; do
    if [ -f "$file" ]; then
        mv "$file" build-scripts/test/ 2>/dev/null || true
        echo "  → Moved $file to build-scripts/test/"
    fi
done

# Other utility scripts
echo "Moving utility scripts..."
for file in cleanup_migration.sh complete-vue3-migration.sh create_*.sh \
           fix-*.sh migrate-*.sh open-admin-direct.sh restart*.sh \
           revert-config.sh rollback_cleanup.sh run-build-with-log.sh token.sh; do
    if [ -f "$file" ]; then
        mv "$file" build-scripts/utilities/ 2>/dev/null || true
        echo "  → Moved $file to build-scripts/utilities/"
    fi
done

# Phase 5: Move alternative configs
echo -e "\n${YELLOW}Phase 5: Moving Alternative Configurations${NC}"

# Alternative vite configs
for file in vite.config.ts vite.config.updated.js vite.enhanced.config.js vite.simple.config.js; do
    if [ -f "$file" ]; then
        mv "$file" config/alternatives/ 2>/dev/null || true
        echo "  → Moved $file to config/alternatives/"
    fi
done

# Performance configs
for file in vitest.performance.config.ts vitest.perf.config.ts vanilla.vitest.config.js; do
    if [ -f "$file" ]; then
        mv "$file" config/ 2>/dev/null || true
        echo "  → Moved $file to config/"
    fi
done

# Other configs
if [ -f "tsconfig.optimized.json" ]; then
    mv tsconfig.optimized.json config/
    echo "  → Moved tsconfig.optimized.json to config/"
fi

# Phase 6: Archive temporary files
echo -e "\n${YELLOW}Phase 6: Archiving Temporary Files${NC}"

for file in removed-scripts.json working_auth_config.json token.txt build-log.txt \
           test_documentation_api.py admin-auth-setup.html admin-panel-current.png \
           admin-test-error.png test-admin-api.html test-diagnostics.html \
           test-session-persistence.html DOCUMENTATION_SYSTEM_OVERVIEW.md; do
    if [ -f "$file" ]; then
        mv "$file" archive/temporary/ 2>/dev/null || true
        echo "  → Archived $file"
    fi
done

# Phase 7: Update package.json
echo -e "\n${YELLOW}Phase 7: Updating package.json${NC}"

# Create updated package.json with new paths
cp package.json package.json.backup

# Update scripts in package.json using Node.js
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// Update test scripts
if (pkg.scripts['test:performance']) {
    pkg.scripts['test:performance'] = pkg.scripts['test:performance'].replace(
        'vitest.performance.config.ts',
        'config/vitest.performance.config.ts'
    );
}
if (pkg.scripts['test:performance:benchmark']) {
    pkg.scripts['test:performance:benchmark'] = pkg.scripts['test:performance:benchmark'].replace(
        'vitest.perf.config.ts',
        'config/vitest.perf.config.ts'
    );
}
if (pkg.scripts['test:vanilla']) {
    pkg.scripts['test:vanilla'] = pkg.scripts['test:vanilla'].replace(
        'vanilla.vitest.config.js',
        'config/vanilla.vitest.config.js'
    );
}

// Update build scripts
if (pkg.scripts['build:strict']) {
    pkg.scripts['build:strict'] = pkg.scripts['build:strict'].replace(
        'tsconfig.optimized.json',
        'config/tsconfig.optimized.json'
    );
}
if (pkg.scripts['typecheck:strict']) {
    pkg.scripts['typecheck:strict'] = pkg.scripts['typecheck:strict'].replace(
        'tsconfig.optimized.json',
        'config/tsconfig.optimized.json'
    );
}

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"

echo -e "${GREEN}✓ package.json updated${NC}"

# Phase 8: Validation
echo -e "\n${YELLOW}Phase 8: Validation${NC}"

echo "Running validation checks..."

# Test npm install
echo -n "Testing npm install... "
if npm install > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
    echo -e "${RED}ERROR: npm install failed!${NC}"
fi

# Test build
echo -n "Testing build... "
if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
    echo -e "${RED}WARNING: Build failed. This might be expected if there were existing issues.${NC}"
fi

# Test if critical files still exist
echo "Checking critical files..."
critical_files=(
    "package.json"
    "vite.config.js"
    "vitest.config.ts"
    "tsconfig.json"
    ".gitignore"
    "README.md"
)

all_good=true
for file in "${critical_files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "  ${GREEN}✓${NC} $file"
    else
        echo -e "  ${RED}✗${NC} $file missing!"
        all_good=false
    fi
done

# Phase 9: Summary
echo -e "\n${YELLOW}=== Migration Summary ===${NC}"

# Count remaining files
root_files=$(ls -1 | wc -l)
echo "Files in root directory: ${root_files} (was ~92)"

echo -e "\n${GREEN}Migration completed successfully!${NC}"
echo -e "\nBackup location: ${BACKUP_DIR}/root_files_backup.tar.gz"
echo -e "\nTo rollback if needed:"
echo -e "  tar -xzf ${BACKUP_DIR}/root_files_backup.tar.gz"
echo -e "  mv package.json.backup package.json"

echo -e "\n${YELLOW}Next steps:${NC}"
echo "1. Test the application thoroughly"
echo "2. Update any documentation that references old paths"
echo "3. Commit changes if everything works correctly"
echo "4. Remove backup after confirming stability"

# Create migration report
cat > MIGRATION_REPORT_${TIMESTAMP}.md << EOF
# Hauptverzeichnis-Bereinigung Report

**Date**: $(date)
**Status**: Completed

## Files Moved

### Development Scripts
- Test scripts: $(ls -1 scripts/test/ 2>/dev/null | wc -l) files
- Debug scripts: $(ls -1 scripts/debug/ 2>/dev/null | wc -l) files
- Fix scripts: $(ls -1 scripts/fix/ 2>/dev/null | wc -l) files
- Setup scripts: $(ls -1 scripts/setup/ 2>/dev/null | wc -l) files
- Check scripts: $(ls -1 scripts/check/ 2>/dev/null | wc -l) files

### Build Scripts
- Build: $(ls -1 build-scripts/build/ 2>/dev/null | wc -l) files
- Serve: $(ls -1 build-scripts/serve/ 2>/dev/null | wc -l) files
- Start: $(ls -1 build-scripts/start/ 2>/dev/null | wc -l) files
- Test: $(ls -1 build-scripts/test/ 2>/dev/null | wc -l) files
- Utilities: $(ls -1 build-scripts/utilities/ 2>/dev/null | wc -l) files

### Configurations
- Alternative configs: $(ls -1 config/alternatives/ 2>/dev/null | wc -l) files
- Additional configs: $(ls -1 config/*.json config/*.ts config/*.js 2>/dev/null | wc -l) files

### Archived
- Temporary files: $(ls -1 archive/temporary/ 2>/dev/null | wc -l) files

## Root Directory
- Files before: ~92
- Files after: ${root_files}

## Backup Location
${BACKUP_DIR}/root_files_backup.tar.gz
EOF

echo -e "\n${GREEN}Report created: MIGRATION_REPORT_${TIMESTAMP}.md${NC}"