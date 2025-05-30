# GitHub Actions Workflows

This directory contains GitHub Actions workflows for the nscale-assist project.

## Documentation Validation Workflow

### Overview

The `docs-validation.yml` workflow automatically validates documentation quality on:
- Pull requests that modify markdown files
- Pushes to the main/master branch
- Manual workflow dispatch

### Features

1. **Metadata Validation**
   - Checks all markdown files have proper metadata headers
   - Validates required fields: title, date, author, status
   - Ensures date format is YYYY-MM-DD
   - Verifies status is one of: draft, review, final, deprecated, archived

2. **Link Validation**
   - Checks all internal links point to existing files
   - Validates anchor links (#section) exist in target files
   - Reports broken links with file and line numbers
   - Tracks external links (but doesn't validate them)

3. **Markdown Linting**
   - Runs markdownlint on all markdown files
   - Checks for common formatting issues
   - Configurable via `.markdownlint.json`

4. **PR Integration**
   - Posts validation results as PR comments
   - Updates existing comments instead of creating duplicates
   - Provides specific feedback for changed files
   - Includes helpful fix instructions

### Configuration

- **Validation scripts**: Located in `/scripts/`
  - `check_doc_metadata.py`: Metadata validation
  - `check_doc_links.py`: Link validation
  
- **Markdown lint config**: `.markdownlint.json`
- **Workflow config**: `.github/workflows/docs-validation-config.yml`

### Usage

#### Running Locally

You can run the validation scripts locally before pushing:

```bash
# Check metadata
python scripts/check_doc_metadata.py docs/

# Check links
python scripts/check_doc_links.py docs/

# Check specific file
python scripts/check_doc_metadata.py docs/README.md
```

#### Metadata Format

Add metadata at the beginning of your markdown files:

**YAML Frontmatter:**
```yaml
---
title: Document Title
date: 2025-01-29
author: Your Name
status: draft
tags: documentation, maintenance
---
```

**HTML Comment:**
```html
<!--
title: Document Title
date: 2025-01-29
author: Your Name
status: final
-->
```

### Workflow Outputs

1. **PR Comments**: Detailed validation report with:
   - Summary of metadata and link checks
   - List of changed files and their status
   - Specific issues found with line numbers
   - Instructions for fixing issues

2. **Artifacts**: Full validation logs saved for 30 days

3. **Job Status**: 
   - ✅ Success: All validations pass
   - ❌ Failure: Critical issues found (broken links, missing metadata)

### Customization

Edit `.github/workflows/docs-validation.yml` to:
- Change which paths trigger the workflow
- Adjust validation rules
- Modify PR comment format
- Add additional validation steps

### Troubleshooting

**Q: The workflow isn't running on my PR**
- Ensure your PR modifies at least one `.md` file
- Check that the workflow file is in the default branch

**Q: How do I skip validation for a specific file?**
- Currently not supported; all markdown files are validated
- Consider moving non-documentation markdown to excluded directories

**Q: Can I run this on other branches?**
- Yes, use workflow dispatch from the Actions tab
- Or add your branch to the `push` trigger in the workflow

### Future Enhancements

- [ ] Spell checking integration
- [ ] Documentation coverage metrics
- [ ] Auto-fix for common issues
- [ ] External link validation (optional)
- [ ] Documentation style guide enforcement

## CI/CD Pipeline Workflow

### Overview

The `ci.yml` workflow provides comprehensive continuous integration for the Vue.js application. It's specifically designed to handle the repository structure where the application code is in the repository root.

### Key Features

1. **Dependency Lock File Verification**
   - First job that runs before any npm operations
   - Prevents "Dependencies lock file is not found" errors
   - Provides clear error messages if package-lock.json is missing

2. **Comprehensive Testing**
   - Unit tests with coverage reporting
   - Component tests for UI elements
   - E2E tests with Playwright
   - Performance benchmarks

3. **Code Quality**
   - ESLint for JavaScript/TypeScript linting
   - TypeScript type checking
   - Vue-specific type validation

4. **Security Scanning**
   - npm audit for vulnerability detection
   - OWASP dependency checks

### Workflow Jobs

#### 1. dependency-check
- **Purpose**: Verify package-lock.json exists
- **Why**: Prevents CI failures due to missing lock file
- **Output**: Debug info about file locations

#### 2. lint
- ESLint code quality checks
- TypeScript compilation checks
- Vue template validation

#### 3. unit-tests
- Vue component unit tests
- Vanilla JavaScript tests
- Coverage report generation

#### 4. component-tests
- UI component integration tests
- Store interaction tests

#### 5. e2e-tests
- Full application E2E tests
- User workflow validation

#### 6. build
- Development build validation
- Production build validation
- Build artifact generation

#### 7. security-scan
- Dependency vulnerability scanning
- Security report generation

### Troubleshooting CI Failures

#### "Dependencies lock file is not found"

**Solution**:
```bash
# Generate package-lock.json
npm install

# Commit it
git add package-lock.json
git commit -m "Add package-lock.json for CI"
git push
```

**Prevention**:
- Never add package-lock.json to .gitignore
- Always commit package-lock.json with package.json changes
- Use `npm ci` locally to verify lock file works

#### Build Failures

**Common causes**:
1. TypeScript errors - Run `npm run typecheck` locally
2. Missing dependencies - Ensure package-lock.json is up to date
3. Import path issues - Check for case-sensitive imports

### Running CI Locally

```bash
# Full CI simulation
npm ci              # Clean install
npm run lint        # Linting
npm run typecheck   # Type checking
npm run test        # Unit tests
npm run build       # Build validation

# Individual test suites
npm run test:unit
npm run test:e2e
npm run test:performance
```

### Best Practices

1. **Commit package-lock.json**
   - Always commit after running `npm install`
   - Keep it in sync with package.json

2. **Use npm ci in CI**
   - Faster than npm install
   - Ensures reproducible builds
   - Fails if lock file is out of sync

3. **Fix issues locally first**
   - Run CI commands locally before pushing
   - Use pre-commit hooks for automatic checks

### Configuration

**Environment variables**:
- `NODE_VERSION`: Node.js version (default: 18)
- `SLACK_WEBHOOK_URL`: For build notifications

**Caching**:
- npm dependencies are cached between runs
- Cache key based on package-lock.json hash

### Monitoring

- All jobs must pass for PR merge
- Build artifacts available for 7 days
- Security reports retained for 14 days
- Coverage reports uploaded to Codecov