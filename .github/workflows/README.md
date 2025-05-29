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