# Documentation Maintenance Playbook

> Last Updated: 2025-05-29
> Version: 1.0.0

## Table of Contents

1. [Daily Maintenance Tasks](#daily-maintenance-tasks)
2. [Weekly Routines](#weekly-routines)
3. [Monthly Reviews](#monthly-reviews)
4. [Quarterly Audits](#quarterly-audits)
5. [Emergency Procedures](#emergency-procedures)
6. [Tool Usage Guide](#tool-usage-guide)
7. [Troubleshooting Common Issues](#troubleshooting-common-issues)
8. [Team Responsibilities](#team-responsibilities)
9. [Automation Setup](#automation-setup)
10. [Metrics and KPIs](#metrics-and-kpis)

---

## Daily Maintenance Tasks

### Morning Checklist (15-30 minutes)

```bash
# 1. Check documentation build status
cd /opt/nscale-assist/app
npm run build:docs 2>&1 | tee -a logs/daily-build-$(date +%Y%m%d).log

# 2. Verify all links are working
python scripts/docs_consolidation.py --check-links

# 3. Check for new issues or PRs related to docs
gh issue list --label documentation --state open
gh pr list --label documentation --state open

# 4. Quick scan for outdated content
grep -r "TODO\|FIXME\|DEPRECATED" docs/ --include="*.md" | head -20
```

### End of Day Tasks (10-15 minutes)

```bash
# 1. Commit any documentation changes
git add docs/
git commit -m "docs: daily maintenance updates $(date +%Y-%m-%d)"

# 2. Update documentation index if needed
cd docs/00_KONSOLIDIERTE_DOKUMENTATION
./update-dates.sh

# 3. Generate daily report
echo "Documentation Status - $(date)" > logs/daily-report-$(date +%Y%m%d).txt
find docs/ -name "*.md" -mtime -1 >> logs/daily-report-$(date +%Y%m%d).txt
```

### Daily Monitoring Dashboard

```bash
#!/bin/bash
# Save as: scripts/daily-docs-dashboard.sh

echo "=== Documentation Health Dashboard ==="
echo "Date: $(date)"
echo ""
echo "📊 Statistics:"
echo "- Total MD files: $(find docs/ -name "*.md" | wc -l)"
echo "- Modified today: $(find docs/ -name "*.md" -mtime -1 | wc -l)"
echo "- Broken links: $(python scripts/docs_consolidation.py --check-links --quiet | grep -c "BROKEN")"
echo "- TODOs: $(grep -r "TODO" docs/ --include="*.md" | wc -l)"
echo ""
echo "🔍 Recent changes:"
git log --oneline --since="24 hours ago" -- docs/
```

---

## Weekly Routines

### Monday: Structure Review
```bash
# 1. Analyze documentation structure
python scripts/docs_consolidation.py --analyze-structure

# 2. Check for duplicate content
python scripts/find-redundancy.js docs/

# 3. Verify navigation consistency
grep -r "\[.*\](.*\.md)" docs/ | sort | uniq -d
```

### Wednesday: Content Quality Check
```bash
# 1. Run spell checker
npm install -g cspell
cspell "docs/**/*.md"

# 2. Check markdown formatting
npm install -g markdownlint-cli
markdownlint docs/ --fix

# 3. Validate code examples
python scripts/validate_code_examples.py
```

### Friday: Cleanup and Organization
```bash
# 1. Remove orphaned files
python scripts/docs_final_cleanup.py

# 2. Update table of contents
cd docs/00_KONSOLIDIERTE_DOKUMENTATION
python generate_toc.py > 00_INDEX.md

# 3. Archive old documentation
./scripts/archive_old_docs.sh
```

### Weekly Report Generation
```bash
#!/bin/bash
# Save as: scripts/weekly-docs-report.sh

WEEK=$(date +%Y-W%V)
REPORT="logs/weekly-report-$WEEK.md"

cat > $REPORT << EOF
# Weekly Documentation Report - $WEEK

## Summary
- Files modified: $(git log --since="1 week ago" --name-only -- docs/ | grep -c "\.md$")
- Issues resolved: $(gh issue list --label documentation --state closed --limit 100 | grep -c "$(date -d '1 week ago' +%Y-%m)")
- New documentation: $(find docs/ -name "*.md" -mtime -7 -type f | wc -l)

## Changes by Category
$(git log --since="1 week ago" --pretty=format:"- %s" -- docs/ | grep -E "^- (docs|fix|feat|refactor):" | sort)

## Metrics
$(python scripts/docs_metrics.py --weekly)
EOF

echo "Weekly report generated: $REPORT"
```

---

## Monthly Reviews

### First Monday of Month: Comprehensive Audit

```bash
#!/bin/bash
# Save as: scripts/monthly-audit.sh

MONTH=$(date +%Y-%m)
AUDIT_DIR="logs/audit-$MONTH"
mkdir -p $AUDIT_DIR

echo "Starting monthly documentation audit for $MONTH..."

# 1. Full structure analysis
python scripts/docs_consolidation.py --full-analysis > $AUDIT_DIR/structure-analysis.txt

# 2. Content coverage report
cat > $AUDIT_DIR/coverage-checklist.md << EOF
# Documentation Coverage Checklist - $MONTH

## Core Components
- [ ] API Documentation complete and current
- [ ] User guides up to date
- [ ] Admin documentation verified
- [ ] Developer guides reviewed
- [ ] Troubleshooting guides updated

## Technical Documentation
- [ ] Architecture diagrams current
- [ ] Database schemas documented
- [ ] API endpoints documented
- [ ] Configuration options listed
- [ ] Environment variables documented

## Process Documentation
- [ ] Installation guide tested
- [ ] Upgrade procedures verified
- [ ] Backup/restore documented
- [ ] Security guidelines current
- [ ] Performance tuning guide updated
EOF

# 3. Generate metrics report
python scripts/docs_metrics.py --monthly > $AUDIT_DIR/metrics.txt

# 4. Identify stale content
find docs/ -name "*.md" -mtime +90 > $AUDIT_DIR/potentially-stale.txt

# 5. Check for missing documentation
./scripts/check_missing_docs.sh > $AUDIT_DIR/missing-docs.txt
```

### Mid-Month: User Feedback Review

```bash
# 1. Analyze documentation-related issues
gh issue list --label documentation --json title,body,comments | \
  jq -r '.[] | "## \(.title)\n\(.body)\n"' > logs/user-feedback-$(date +%Y%m).md

# 2. Review search analytics (if available)
python scripts/analyze_search_logs.py --month $(date +%Y-%m)

# 3. Update FAQ based on common issues
python scripts/generate_faq.py > docs/FAQ_GENERATED.md
```

### Month-End: Planning and Prioritization

```bash
#!/bin/bash
# Save as: scripts/monthly-planning.sh

# 1. Generate documentation backlog
echo "# Documentation Backlog - $(date +%B %Y)" > logs/backlog-$(date +%Y%m).md
echo "" >> logs/backlog-$(date +%Y%m).md

# Add TODOs from codebase
echo "## TODOs from Documentation" >> logs/backlog-$(date +%Y%m).md
grep -r "TODO" docs/ --include="*.md" | sed 's/^/- [ ] /' >> logs/backlog-$(date +%Y%m).md

# Add issues from GitHub
echo "" >> logs/backlog-$(date +%Y%m).md
echo "## Open Documentation Issues" >> logs/backlog-$(date +%Y%m).md
gh issue list --label documentation --state open --json number,title | \
  jq -r '.[] | "- [ ] #\(.number): \(.title)"' >> logs/backlog-$(date +%Y%m).md

# 2. Prioritize items for next month
echo "" >> logs/backlog-$(date +%Y%m).md
echo "## Priorities for Next Month" >> logs/backlog-$(date +%Y%m).md
echo "1. " >> logs/backlog-$(date +%Y%m).md
echo "2. " >> logs/backlog-$(date +%Y%m).md
echo "3. " >> logs/backlog-$(date +%Y%m).md
```

---

## Quarterly Audits

### Q1 (January): Annual Planning
```bash
# 1. Review previous year's documentation
python scripts/annual_docs_review.py --year $(date -d "last year" +%Y)

# 2. Set documentation goals for the year
cat > docs/DOCUMENTATION_GOALS_$(date +%Y).md << EOF
# Documentation Goals for $(date +%Y)

## Q1 Goals
- [ ] Complete API documentation overhaul
- [ ] Migrate legacy docs to new format
- [ ] Implement automated testing for code examples

## Q2 Goals
- [ ] Launch documentation portal
- [ ] Add interactive tutorials
- [ ] Implement search functionality

## Q3 Goals
- [ ] Localization support
- [ ] Video documentation series
- [ ] Community contribution guidelines

## Q4 Goals
- [ ] Performance documentation
- [ ] Security best practices guide
- [ ] Year-end documentation review
EOF
```

### Q2 (April): Technology Review
```bash
# 1. Evaluate documentation tools
./scripts/evaluate_doc_tools.sh

# 2. Check for framework updates
npm outdated | grep -E "(markdown|docs|mdx)"

# 3. Review and update build pipeline
cat > logs/q2-tech-review-$(date +%Y).md << EOF
# Q2 Technology Review - $(date +%Y)

## Current Stack
- Documentation Generator: [current tool]
- Markdown Processor: [version]
- Search Engine: [if applicable]
- Hosting: [platform]

## Recommendations
- [ ] Upgrade to [tool] version [X.Y.Z]
- [ ] Implement [new feature]
- [ ] Deprecate [old system]
EOF
```

### Q3 (July): User Experience Audit
```bash
# 1. Analyze documentation usage patterns
python scripts/analyze_doc_usage.py --quarter Q3

# 2. Conduct documentation survey
./scripts/send_doc_survey.sh

# 3. Review navigation and findability
python scripts/test_doc_navigation.py
```

### Q4 (October): Year-End Comprehensive Review
```bash
#!/bin/bash
# Save as: scripts/quarterly-comprehensive-audit.sh

YEAR=$(date +%Y)
QUARTER="Q4"
AUDIT_REPORT="logs/comprehensive-audit-$YEAR-$QUARTER.md"

cat > $AUDIT_REPORT << EOF
# Comprehensive Documentation Audit - $YEAR $QUARTER

## Executive Summary
Generated: $(date)

## Documentation Health Score: [Calculate based on metrics]

### Coverage Analysis
$(python scripts/docs_coverage_analysis.py)

### Quality Metrics
$(python scripts/docs_quality_metrics.py)

### Performance Metrics
- Build time: $(time npm run build:docs 2>&1 | grep real)
- Total files: $(find docs/ -name "*.md" | wc -l)
- Total size: $(du -sh docs/ | cut -f1)

## Identified Issues

### Critical (Must fix immediately)
$(grep -r "CRITICAL\|SECURITY" docs/ --include="*.md" | head -10)

### High Priority (Fix within 30 days)
$(python scripts/identify_priority_issues.py --level high)

### Medium Priority (Fix within quarter)
$(python scripts/identify_priority_issues.py --level medium)

## Recommendations
1. Infrastructure improvements
2. Process optimizations
3. Tool upgrades
4. Training needs

## Action Plan for Next Quarter
[To be filled by documentation team]
EOF

echo "Comprehensive audit complete: $AUDIT_REPORT"
```

---

## Emergency Procedures

### 1. Broken Documentation Build

```bash
#!/bin/bash
# Save as: scripts/emergency-fix-docs-build.sh

echo "🚨 EMERGENCY: Documentation Build Failure"
echo "Starting emergency recovery procedure..."

# 1. Backup current state
tar -czf docs-backup-$(date +%Y%m%d-%H%M%S).tar.gz docs/

# 2. Check for syntax errors
echo "Checking markdown syntax..."
markdownlint docs/ 2>&1 | tee logs/emergency-syntax-check.log

# 3. Identify recent changes
echo "Recent changes (potential culprits):"
git log --oneline -10 -- docs/

# 4. Try reverting last commit
read -p "Revert last commit? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git revert HEAD --no-edit
fi

# 5. Rebuild with verbose logging
npm run build:docs -- --verbose 2>&1 | tee logs/emergency-build.log

# 6. If still failing, use safe mode
if [ $? -ne 0 ]; then
    echo "Build still failing. Trying safe mode..."
    npm run build:docs:safe
fi

# 7. Notify team
./scripts/notify_team.sh "Documentation build emergency resolved/ongoing"
```

### 2. Major Refactoring Recovery

```bash
#!/bin/bash
# Save as: scripts/emergency-refactor-recovery.sh

# 1. Create recovery branch
git checkout -b docs-recovery-$(date +%Y%m%d)

# 2. Analyze impact
echo "Analyzing refactoring impact..."
git diff --name-status main -- docs/ > logs/refactor-impact.log

# 3. Generate mapping of moved files
git log --follow --name-status --format='%H' -- docs/ | \
  grep -E '^R[0-9]+' > logs/file-renames.log

# 4. Update all internal links
python scripts/update_internal_links.py --mapping logs/file-renames.log

# 5. Verify no broken links
python scripts/docs_consolidation.py --check-links --fix

# 6. Create redirect map for external links
python scripts/generate_redirects.py > docs/redirects.json
```

### 3. Content Corruption Recovery

```bash
#!/bin/bash
# Save as: scripts/emergency-content-recovery.sh

CORRUPTED_FILE=$1

if [ -z "$CORRUPTED_FILE" ]; then
    echo "Usage: $0 <corrupted-file-path>"
    exit 1
fi

# 1. Check Git history
echo "Checking Git history for: $CORRUPTED_FILE"
git log --oneline -10 -- "$CORRUPTED_FILE"

# 2. Show last known good version
LAST_GOOD_COMMIT=$(git rev-list -1 HEAD -- "$CORRUPTED_FILE")
echo "Last modification: $LAST_GOOD_COMMIT"

# 3. Optionally restore
read -p "Restore from last good commit? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git checkout $LAST_GOOD_COMMIT -- "$CORRUPTED_FILE"
    echo "File restored from commit: $LAST_GOOD_COMMIT"
fi

# 4. Validate restored content
markdownlint "$CORRUPTED_FILE"
```

### 4. Emergency Communication Template

```markdown
# EMERGENCY: Documentation System Issue

**Status**: 🔴 CRITICAL / 🟡 DEGRADED / 🟢 RESOLVED
**Time Detected**: [TIMESTAMP]
**Impact**: [Description of impact]

## Issue Description
[Brief description of the problem]

## Affected Systems
- [ ] Documentation build pipeline
- [ ] Documentation website
- [ ] Search functionality
- [ ] API documentation
- [ ] User guides

## Current Actions
1. [Action being taken]
2. [Next step]
3. [Timeline]

## Workaround
[Temporary solution if available]

## Contact
- Primary: [Name] - [Contact]
- Backup: [Name] - [Contact]

## Updates
- [TIME]: [Update]
- [TIME]: [Update]
```

---

## Tool Usage Guide

### Core Maintenance Scripts

#### 1. Documentation Consolidation Tool
```bash
# Full analysis
python scripts/docs_consolidation.py --full-analysis

# Check specific directory
python scripts/docs_consolidation.py --path docs/api/ --check-links

# Fix broken links automatically
python scripts/docs_consolidation.py --fix-links --backup

# Generate structure report
python scripts/docs_consolidation.py --structure-only > reports/structure.txt
```

#### 2. Documentation Cleanup Tool
```bash
# Dry run (see what would be cleaned)
python scripts/docs_final_cleanup.py --dry-run

# Clean with backup
python scripts/docs_final_cleanup.py --backup

# Clean specific patterns
python scripts/docs_final_cleanup.py --pattern "*.backup" --confirm
```

#### 3. Link Validator
```bash
# Validate all links
python scripts/validate_links.py docs/

# Validate external links only
python scripts/validate_links.py --external-only

# Generate broken links report
python scripts/validate_links.py --output logs/broken-links.json
```

#### 4. Content Analyzer
```bash
# Find duplicate content
python scripts/find-redundancy.js docs/ --threshold 0.8

# Analyze readability
python scripts/analyze_readability.py docs/ --format markdown

# Check for outdated content
python scripts/check_outdated.py --days 180
```

### Helper Scripts

```bash
# Create a new documentation file with template
./scripts/new-doc.sh "guides/New Feature Guide"

# Update all dates in documentation
./scripts/update-dates.sh

# Generate documentation index
./scripts/generate-index.sh > docs/INDEX.md

# Archive old documentation
./scripts/archive-docs.sh --older-than 365

# Convert between formats
./scripts/convert-docs.sh --from md --to mdx docs/legacy/
```

### Automation Scripts

```bash
# Setup pre-commit hooks
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
# Check documentation before commit

# 1. Validate markdown
markdownlint docs/ --fix

# 2. Check for broken links
python scripts/docs_consolidation.py --check-links --quiet

# 3. Update modification dates
./scripts/update-dates.sh

# 4. Generate index if needed
if git diff --cached --name-only | grep -q "docs/"; then
    ./scripts/generate-index.sh > docs/INDEX.md
    git add docs/INDEX.md
fi
EOF

chmod +x .git/hooks/pre-commit
```

---

## Troubleshooting Common Issues

### Issue 1: Build Failures

**Symptoms**: `npm run build:docs` fails with errors

**Quick Diagnosis**:
```bash
# Check for syntax errors
markdownlint docs/ 2>&1 | grep -E "MD[0-9]+"

# Check for invalid frontmatter
grep -r "^---" docs/ -A 5 | grep -E "^\s*[^:]+$"

# Check for special characters
grep -r "[^\x00-\x7F]" docs/ --include="*.md"
```

**Solutions**:
1. Fix markdown syntax errors
2. Validate YAML frontmatter
3. Remove or escape special characters
4. Check file encoding (should be UTF-8)

### Issue 2: Broken Links

**Symptoms**: Links return 404 or point to wrong location

**Quick Diagnosis**:
```bash
# Find all internal links
grep -r "\[.*\](.*.md)" docs/ | cut -d: -f2- > logs/all-links.txt

# Check if targets exist
while read link; do
    target=$(echo $link | sed 's/.*(\(.*\.md\)).*/\1/')
    [ ! -f "docs/$target" ] && echo "Missing: $target"
done < logs/all-links.txt
```

**Solutions**:
1. Run link fixer: `python scripts/docs_consolidation.py --fix-links`
2. Update moved files in git
3. Create redirects for renamed files
4. Update navigation menus

### Issue 3: Slow Build Times

**Symptoms**: Documentation build takes >5 minutes

**Quick Diagnosis**:
```bash
# Profile build time
time npm run build:docs -- --profile > logs/build-profile.log

# Check file sizes
find docs/ -name "*.md" -size +1M -ls

# Count total files
find docs/ -name "*.md" | wc -l
```

**Solutions**:
1. Optimize large images
2. Split huge files
3. Enable incremental builds
4. Use build cache

### Issue 4: Search Not Working

**Symptoms**: Search returns no/wrong results

**Quick Fix**:
```bash
# Rebuild search index
npm run build:search-index

# Clear search cache
rm -rf .cache/search/

# Verify index generation
ls -la public/search-index.json
```

### Issue 5: Merge Conflicts in Documentation

**Resolution Steps**:
```bash
#!/bin/bash
# Save as: scripts/resolve-docs-conflicts.sh

# 1. Find conflicted files
git diff --name-only --diff-filter=U | grep "\.md$" > logs/conflicted-docs.txt

# 2. For each conflicted file
while read file; do
    echo "Resolving: $file"
    
    # Show conflict
    git diff --color $file
    
    # Attempt automatic resolution for documentation
    git checkout --theirs $file  # or --ours depending on strategy
    
    # Validate result
    markdownlint $file
done < logs/conflicted-docs.txt

# 3. Rebuild and test
npm run build:docs
```

---

## Team Responsibilities

### Documentation Owner (Lead)
- **Daily**: Review PRs, check build status
- **Weekly**: Team sync, priority setting
- **Monthly**: Metrics review, planning
- **Quarterly**: Strategy, tool evaluation

**Key Scripts**:
```bash
# Morning routine
./scripts/lead-morning-check.sh

# Weekly report
./scripts/generate-team-report.sh
```

### Technical Writers
- **Daily**: Content updates, link checks
- **Weekly**: Content review, user feedback
- **Monthly**: Style guide updates
- **Quarterly**: Content audit

**Key Scripts**:
```bash
# Content validation
./scripts/validate-content.sh [file]

# Style check
./scripts/check-style-guide.sh
```

### Developers
- **Daily**: Update API docs with code changes
- **Weekly**: Review technical accuracy
- **Monthly**: Update examples
- **Quarterly**: Architecture docs update

**Key Scripts**:
```bash
# Generate API docs
./scripts/generate-api-docs.sh

# Validate code examples
./scripts/test-code-examples.sh
```

### DevOps/SRE
- **Daily**: Monitor build pipeline
- **Weekly**: Performance checks
- **Monthly**: Infrastructure review
- **Quarterly**: Tool upgrades

**Key Scripts**:
```bash
# Pipeline health
./scripts/check-pipeline-health.sh

# Performance metrics
./scripts/docs-performance-test.sh
```

### RACI Matrix

| Task | Responsible | Accountable | Consulted | Informed |
|------|------------|------------|-----------|----------|
| Daily builds | DevOps | Lead | Writers | Team |
| Content updates | Writers | Lead | Developers | Users |
| Link validation | Writers | Writers | DevOps | Lead |
| Tool upgrades | DevOps | Lead | Team | Users |
| User feedback | Lead | Lead | Writers | Team |
| Emergency fixes | On-call | Lead | Team | Users |

---

## Automation Setup

### 1. CI/CD Pipeline Configuration

```yaml
# .github/workflows/docs-maintenance.yml
name: Documentation Maintenance

on:
  schedule:
    - cron: '0 8 * * *'  # Daily at 8 AM
    - cron: '0 9 * * 1'  # Weekly on Monday at 9 AM
    - cron: '0 10 1 * *' # Monthly on the 1st at 10 AM
  push:
    paths:
      - 'docs/**'
  pull_request:
    paths:
      - 'docs/**'

jobs:
  daily-checks:
    if: github.event_name == 'schedule' && contains(github.event.schedule, '0 8')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run daily checks
        run: |
          ./scripts/daily-docs-dashboard.sh
          python scripts/docs_consolidation.py --check-links
      
  weekly-audit:
    if: github.event_name == 'schedule' && contains(github.event.schedule, '0 9')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run weekly audit
        run: ./scripts/weekly-docs-report.sh
      
  on-change-validation:
    if: github.event_name == 'push' || github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Validate changes
        run: |
          markdownlint docs/
          python scripts/validate_links.py docs/
```

### 2. Automated Monitoring Setup

```bash
#!/bin/bash
# Save as: scripts/setup-monitoring.sh

# 1. Install monitoring dependencies
npm install -D chokidar-cli webhook-cli

# 2. Create monitoring script
cat > scripts/docs-monitor.js << 'EOF'
const chokidar = require('chokidar');
const { exec } = require('child_process');

const watcher = chokidar.watch('docs/**/*.md', {
  persistent: true,
  ignoreInitial: true
});

watcher
  .on('add', path => {
    console.log(`New file: ${path}`);
    exec(`markdownlint ${path}`, (err, stdout) => {
      if (err) console.error(`Validation failed: ${path}`);
    });
  })
  .on('change', path => {
    console.log(`Modified: ${path}`);
    exec(`python scripts/validate_single_file.py ${path}`);
  })
  .on('unlink', path => {
    console.log(`Removed: ${path}`);
    exec(`python scripts/check_broken_links.py --removed ${path}`);
  });
EOF

# 3. Create systemd service (Linux)
sudo cat > /etc/systemd/system/docs-monitor.service << EOF
[Unit]
Description=Documentation Monitor
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=/opt/nscale-assist/app
ExecStart=/usr/bin/node scripts/docs-monitor.js
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# 4. Enable service
sudo systemctl enable docs-monitor
sudo systemctl start docs-monitor
```

### 3. Slack/Discord Integration

```javascript
// Save as: scripts/notification-webhook.js
const axios = require('axios');

const WEBHOOK_URL = process.env.DOCS_WEBHOOK_URL;

async function sendNotification(message, level = 'info') {
  const colors = {
    info: '#36a64f',
    warning: '#ff9800',
    error: '#f44336'
  };

  const payload = {
    attachments: [{
      color: colors[level],
      title: 'Documentation System Alert',
      text: message,
      footer: 'Docs Bot',
      ts: Math.floor(Date.now() / 1000)
    }]
  };

  try {
    await axios.post(WEBHOOK_URL, payload);
  } catch (error) {
    console.error('Failed to send notification:', error);
  }
}

// Usage
if (require.main === module) {
  const message = process.argv[2];
  const level = process.argv[3] || 'info';
  sendNotification(message, level);
}

module.exports = { sendNotification };
```

### 4. Automated Backup Setup

```bash
#!/bin/bash
# Save as: scripts/setup-auto-backup.sh

# 1. Create backup script
cat > scripts/backup-docs.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/opt/backups/docs"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/docs-backup-$TIMESTAMP.tar.gz"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create backup
tar -czf $BACKUP_FILE docs/ \
  --exclude="docs/node_modules" \
  --exclude="docs/.cache"

# Keep only last 30 days of backups
find $BACKUP_DIR -name "docs-backup-*.tar.gz" -mtime +30 -delete

# Log backup
echo "$(date): Backup created - $BACKUP_FILE" >> $BACKUP_DIR/backup.log

# Verify backup
tar -tzf $BACKUP_FILE > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "Backup verified successfully"
else
  echo "ERROR: Backup verification failed!" >&2
  exit 1
fi
EOF

chmod +x scripts/backup-docs.sh

# 2. Add to crontab
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/nscale-assist/app/scripts/backup-docs.sh") | crontab -
```

---

## Metrics and KPIs

### Key Performance Indicators

```python
# Save as: scripts/calculate_kpis.py
import os
import json
from datetime import datetime, timedelta
import subprocess

def calculate_documentation_kpis():
    kpis = {
        "timestamp": datetime.now().isoformat(),
        "coverage": {},
        "quality": {},
        "maintenance": {},
        "engagement": {}
    }
    
    # Coverage Metrics
    total_files = len([f for r, d, files in os.walk("docs") 
                      for f in files if f.endswith('.md')])
    kpis["coverage"]["total_files"] = total_files
    kpis["coverage"]["total_words"] = calculate_word_count()
    kpis["coverage"]["api_coverage"] = calculate_api_coverage()
    kpis["coverage"]["feature_coverage"] = calculate_feature_coverage()
    
    # Quality Metrics
    kpis["quality"]["broken_links"] = count_broken_links()
    kpis["quality"]["outdated_files"] = count_outdated_files(days=90)
    kpis["quality"]["todo_count"] = count_todos()
    kpis["quality"]["validation_errors"] = run_validation()
    
    # Maintenance Metrics
    kpis["maintenance"]["avg_update_frequency"] = calculate_update_frequency()
    kpis["maintenance"]["time_to_fix"] = calculate_avg_fix_time()
    kpis["maintenance"]["build_success_rate"] = get_build_success_rate()
    
    # Engagement Metrics
    kpis["engagement"]["page_views"] = get_analytics_data("page_views")
    kpis["engagement"]["search_queries"] = get_analytics_data("searches")
    kpis["engagement"]["feedback_score"] = get_feedback_score()
    
    return kpis

def generate_kpi_dashboard():
    kpis = calculate_documentation_kpis()
    
    dashboard = f"""
# Documentation KPI Dashboard
Generated: {kpis['timestamp']}

## 📊 Coverage Metrics
- Total Documentation Files: {kpis['coverage']['total_files']}
- Total Word Count: {kpis['coverage']['total_words']:,}
- API Coverage: {kpis['coverage']['api_coverage']}%
- Feature Coverage: {kpis['coverage']['feature_coverage']}%

## ✅ Quality Metrics
- Broken Links: {kpis['quality']['broken_links']}
- Outdated Files (>90 days): {kpis['quality']['outdated_files']}
- TODOs: {kpis['quality']['todo_count']}
- Validation Errors: {kpis['quality']['validation_errors']}

## 🔧 Maintenance Metrics
- Average Update Frequency: {kpis['maintenance']['avg_update_frequency']} days
- Average Time to Fix Issues: {kpis['maintenance']['time_to_fix']} hours
- Build Success Rate: {kpis['maintenance']['build_success_rate']}%

## 👥 Engagement Metrics
- Monthly Page Views: {kpis['engagement']['page_views']:,}
- Search Queries: {kpis['engagement']['search_queries']:,}
- User Feedback Score: {kpis['engagement']['feedback_score']}/5

## 🎯 Goals vs Actual
| Metric | Goal | Actual | Status |
|--------|------|--------|--------|
| API Coverage | 100% | {kpis['coverage']['api_coverage']}% | {'✅' if kpis['coverage']['api_coverage'] >= 100 else '⚠️'} |
| Broken Links | 0 | {kpis['quality']['broken_links']} | {'✅' if kpis['quality']['broken_links'] == 0 else '❌'} |
| Build Success | >95% | {kpis['maintenance']['build_success_rate']}% | {'✅' if kpis['maintenance']['build_success_rate'] > 95 else '⚠️'} |
| Feedback Score | >4.0 | {kpis['engagement']['feedback_score']} | {'✅' if kpis['engagement']['feedback_score'] > 4.0 else '⚠️'} |
"""
    
    with open('logs/kpi-dashboard.md', 'w') as f:
        f.write(dashboard)
    
    # Also save as JSON for tracking
    with open('logs/kpi-data.json', 'w') as f:
        json.dump(kpis, f, indent=2)

if __name__ == "__main__":
    generate_kpi_dashboard()
    print("KPI Dashboard generated: logs/kpi-dashboard.md")
```

### Tracking Scripts

```bash
#!/bin/bash
# Save as: scripts/track-metrics.sh

# 1. Documentation growth over time
echo "date,files,words,size" > logs/docs-growth.csv
git log --format="%ad" --date=short -- docs/ | sort -u | while read date; do
    git checkout $(git rev-list -1 --before="$date 23:59" HEAD) -- docs/ 2>/dev/null
    files=$(find docs/ -name "*.md" 2>/dev/null | wc -l)
    words=$(find docs/ -name "*.md" -exec wc -w {} + 2>/dev/null | tail -1 | awk '{print $1}')
    size=$(du -sb docs/ 2>/dev/null | cut -f1)
    echo "$date,$files,$words,$size" >> logs/docs-growth.csv
done
git checkout HEAD -- docs/

# 2. Generate trend visualization
python -c "
import pandas as pd
import matplotlib.pyplot as plt

df = pd.read_csv('logs/docs-growth.csv')
df['date'] = pd.to_datetime(df['date'])

fig, (ax1, ax2, ax3) = plt.subplots(3, 1, figsize=(10, 12))

ax1.plot(df['date'], df['files'])
ax1.set_title('Documentation Files Over Time')
ax1.set_ylabel('Number of Files')

ax2.plot(df['date'], df['words'])
ax2.set_title('Word Count Over Time')
ax2.set_ylabel('Total Words')

ax3.plot(df['date'], df['size'] / 1024 / 1024)
ax3.set_title('Documentation Size Over Time')
ax3.set_ylabel('Size (MB)')

plt.tight_layout()
plt.savefig('logs/docs-trends.png')
"
```

### Success Metrics Definitions

| Metric | Definition | Target | Measurement |
|--------|------------|--------|-------------|
| Documentation Coverage | % of features with docs | 100% | `(documented_features / total_features) * 100` |
| Freshness | % files updated in 90 days | >80% | `(recent_files / total_files) * 100` |
| Build Reliability | % successful builds | >95% | `(successful_builds / total_builds) * 100` |
| Link Health | % working links | 100% | `(working_links / total_links) * 100` |
| Response Time | Avg time to update docs | <24h | `avg(issue_close_time - issue_open_time)` |
| User Satisfaction | Feedback rating | >4/5 | `avg(feedback_scores)` |
| Search Effectiveness | % searches with clicks | >70% | `(searches_with_clicks / total_searches) * 100` |
| Contribution Rate | PRs per month | >10 | `count(doc_prs_per_month)` |

### Monthly Metrics Report Template

```markdown
# Documentation Metrics Report - [MONTH YEAR]

## Executive Summary
- Documentation Health Score: [X]/100
- Key Achievement: [Main accomplishment]
- Main Challenge: [Primary issue]

## Detailed Metrics

### Coverage & Completeness
- Total Pages: [X] ([+/-Y] from last month)
- API Coverage: [X]%
- User Guide Coverage: [X]%
- Admin Guide Coverage: [X]%

### Quality Indicators
- Broken Links: [X] (Target: 0)
- Outdated Content: [X] pages (Target: <10)
- Grammar/Spell Errors: [X]
- Code Example Failures: [X]

### Maintenance Efficiency
- Average Update Time: [X] hours
- Build Success Rate: [X]%
- Automation Coverage: [X]%
- Manual Tasks Completed: [X]/[Y]

### User Engagement
- Page Views: [X] ([+/-Y]%)
- Unique Visitors: [X]
- Average Time on Page: [X]:[Y]
- Bounce Rate: [X]%
- Feedback Submissions: [X]
- Average Rating: [X]/5

## Trends
[Include graphs showing month-over-month trends]

## Action Items for Next Month
1. [High Priority Item]
2. [Medium Priority Item]
3. [Low Priority Item]

## Team Performance
- PRs Reviewed: [X]
- Average Review Time: [X] hours
- Documentation Updates by Team Member:
  - [Name]: [X] updates
  - [Name]: [X] updates
```

---

## Quick Reference Card

```bash
# Daily Commands
./scripts/daily-docs-dashboard.sh          # Morning health check
markdownlint docs/ --fix                   # Fix formatting
python scripts/docs_consolidation.py --check-links  # Validate links

# Weekly Commands  
./scripts/weekly-docs-report.sh            # Generate weekly report
python scripts/find-redundancy.js docs/    # Find duplicate content
./scripts/archive_old_docs.sh              # Archive outdated docs

# Monthly Commands
./scripts/monthly-audit.sh                 # Comprehensive audit
python scripts/docs_metrics.py --monthly   # Calculate metrics
./scripts/monthly-planning.sh              # Plan next month

# Emergency Commands
./scripts/emergency-fix-docs-build.sh      # Fix broken builds
./scripts/emergency-content-recovery.sh [file]  # Recover corrupted files
./scripts/notify_team.sh "[message]"      # Alert team

# Monitoring Commands
systemctl status docs-monitor              # Check monitor status
tail -f logs/docs-monitor.log             # Watch real-time logs
./scripts/check-pipeline-health.sh        # Pipeline status

# Reporting Commands
python scripts/calculate_kpis.py          # Generate KPI dashboard
./scripts/track-metrics.sh                # Update metrics tracking
python scripts/generate_report.py --monthly  # Monthly report
```

---

This playbook should be reviewed and updated quarterly to ensure it remains relevant and effective for your documentation maintenance needs.