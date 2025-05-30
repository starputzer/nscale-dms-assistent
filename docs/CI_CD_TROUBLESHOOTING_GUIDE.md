# CI/CD Pipeline Troubleshooting Guide

## Quick Fix for "Dependencies lock file is not found"

```bash
# From the app directory:
npm install                    # Generate package-lock.json
git add package-lock.json      # Stage the file
git commit -m "Add package-lock.json for CI/CD"
git push                       # Push to trigger CI
```

## Complete CI/CD Setup Checklist

### 1. Required Files

- [ ] `package.json` - Node.js project configuration
- [ ] `package-lock.json` - Locked dependency versions
- [ ] `.github/workflows/ci.yml` - GitHub Actions workflow

### 2. Repository Structure

```
/opt/nscale-assist/app/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── README.md
├── package.json
├── package-lock.json    <-- MUST be committed
├── .gitignore          <-- Must NOT ignore package-lock.json
├── src/
├── public/
└── ...
```

### 3. Common Issues and Solutions

#### Issue: "Dependencies lock file is not found"

**Cause**: `package-lock.json` is missing or not committed

**Solution**:
```bash
# Check if file exists
ls -la package-lock.json

# If missing, generate it
npm install

# Check git status
git status package-lock.json

# If untracked or modified
git add package-lock.json
git commit -m "Add/Update package-lock.json"
git push
```

#### Issue: "package-lock.json is ignored by git"

**Cause**: File is listed in `.gitignore`

**Solution**:
```bash
# Check .gitignore
grep package-lock .gitignore

# Edit .gitignore and remove or comment the line
# Remove: package-lock.json
# Or comment: # package-lock.json

# Force add the file
git add -f package-lock.json
git commit -m "Track package-lock.json for CI"
git push
```

#### Issue: "npm ci" fails with integrity errors

**Cause**: `package-lock.json` is out of sync with `package.json`

**Solution**:
```bash
# Remove and regenerate
rm package-lock.json
npm install
git add package-lock.json
git commit -m "Regenerate package-lock.json"
git push
```

#### Issue: Build works locally but fails in CI

**Cause**: Dependencies not properly locked or environment differences

**Solution**:
```bash
# Clean install like CI does
rm -rf node_modules
npm ci  # This will fail if lock file has issues

# If it fails, fix with:
npm install
git add package-lock.json
git commit -m "Fix package-lock.json"
git push
```

### 4. Pre-Push Verification

Run this before every push:

```bash
# Use our CI readiness check script
./scripts/check-ci-ready.sh

# Or manually verify
npm ci              # Clean install
npm run lint        # Check linting
npm run typecheck   # Check types
npm run test        # Run tests
npm run build       # Verify build
```

### 5. GitHub Actions Debugging

#### View Workflow Logs

1. Go to GitHub repository
2. Click "Actions" tab
3. Select the failed workflow run
4. Click on the failed job
5. Look for "dependency-check" job first

#### Enable Debug Logging

Add to repository secrets:
- `ACTIONS_RUNNER_DEBUG`: `true`
- `ACTIONS_STEP_DEBUG`: `true`

#### Re-run Failed Jobs

1. In the failed workflow run
2. Click "Re-run jobs" → "Re-run failed jobs"

### 6. Local CI Simulation

```bash
# Simulate exactly what CI does
cd /opt/nscale-assist/app

# Step 1: Dependency check
if [ ! -f "package-lock.json" ]; then
  echo "ERROR: package-lock.json not found!"
  exit 1
fi

# Step 2: Clean install
rm -rf node_modules
npm ci

# Step 3: Run all checks
npm run lint
npm run typecheck
npm run test
npm run build
```

### 7. Best Practices

#### Always Sync Lock File
```bash
# After any package.json change
npm install
git add package.json package-lock.json
git commit -m "Update dependencies"
```

#### Never Use --no-save
```bash
# Bad
npm install some-package --no-save

# Good
npm install some-package
git add package*.json
git commit -m "Add some-package"
```

#### Use Exact Versions in CI
```bash
# package.json
{
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=8.0.0"
  }
}
```

### 8. Emergency Fixes

#### Quick Fix Script
```bash
#!/bin/bash
# Save as fix-ci.sh

echo "Fixing CI setup..."

# Ensure package-lock.json exists
if [ ! -f "package-lock.json" ]; then
  npm install
fi

# Remove from .gitignore if present
sed -i '/^package-lock\.json/d' .gitignore

# Add and commit
git add package-lock.json .gitignore
git commit -m "Fix CI: Add package-lock.json"
git push

echo "CI should now work!"
```

### 9. Monitoring CI Health

#### Set Up Notifications

1. Go to Settings → Notifications
2. Enable "Actions" notifications
3. Set up Slack/Email alerts for failures

#### Branch Protection

1. Settings → Branches → Add rule
2. Enable "Require status checks"
3. Select all CI jobs
4. Enable "Require branches to be up to date"

### 10. When All Else Fails

1. **Check Recent Changes**
   ```bash
   git log -p package*.json
   ```

2. **Compare with Working Branch**
   ```bash
   git diff main..feature/branch package*.json
   ```

3. **Reset to Known Good State**
   ```bash
   git checkout main -- package*.json
   npm install
   git add package-lock.json
   ```

4. **Contact Support**
   - Check GitHub Status: https://www.githubstatus.com/
   - Review GitHub Actions documentation
   - Open issue with workflow logs

## Quick Reference Card

```bash
# Essential commands
npm install              # Generate lock file
npm ci                   # Clean install from lock
git add package*.json    # Stage both files
./scripts/check-ci-ready.sh  # Verify CI ready

# Common fixes
rm -rf node_modules package-lock.json && npm install  # Full reset
npm audit fix           # Fix vulnerabilities
npm update              # Update dependencies
npm dedupe              # Remove duplicates
```

## Additional Resources

- [npm ci documentation](https://docs.npmjs.com/cli/v8/commands/npm-ci)
- [GitHub Actions documentation](https://docs.github.com/en/actions)
- [package-lock.json specification](https://docs.npmjs.com/cli/v8/configuring-npm/package-lock-json)