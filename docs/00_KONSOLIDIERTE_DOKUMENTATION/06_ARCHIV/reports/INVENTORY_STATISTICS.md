# Codebase Inventory - Statistical Summary

## File Count by Category

```
Source Code Files
├── TypeScript:     557 files (48.9%)
├── Vue Components: 317 files (27.9%)
├── JavaScript:     154 files (13.5%)
└── Python:         110 files (9.7%)
Total:            1,138 files

Documentation
├── Markdown:       565 files (95.0%)
├── Text:           30 files (5.0%)
Total:              595 files

Configuration
├── JSON:           29 files
├── YAML:           3 files
├── Shell Scripts:  74 files
Total:              106 files

Testing
├── Unit Tests:     123 files
├── E2E Tests:      23 files
├── Integration:    28 files
Total:              174 files
```

## Directory Size Distribution

```
Top 10 Directories by File Count:
1. src/components/       264 files
2. docs/                 565 files
3. src/stores/           39 files
4. src/utils/            72 files
5. api/                  25 files
6. e2e/tests/            23 files
7. scripts/              74 files
8. src/composables/      34 files
9. src/views/            21 files
10. modules/             12 files
```

## Code Quality Metrics

```
Type Safety:
✅ TypeScript:        557/711 frontend files (78.3%)
❌ JavaScript:        154/711 frontend files (21.7%)

Testing Coverage:
- Test Files:         174
- Source Files:       1,138
- Coverage Ratio:     15.3%
- Test Frameworks:    Vitest, Playwright, pytest

Build & Deploy:
✅ Modern Build:      Vite
✅ Containerized:     Docker + Docker Compose
✅ CI/CD:            GitHub Actions
❌ Linting:          Not configured
❌ Formatting:       Not configured
```

## Duplicate Files Summary

```
Severity: HIGH
- Total Duplicates: 258 files
- Duplicate Groups: 204
- Wasted Space:     ~5 MB

Most Common Duplicates:
1. Empty __init__.py files (15 instances)
2. TypeScript error reports (19 identical files)
3. Server backup files (8 versions)
4. Legacy bridge files (4 copies)
```

## Dependencies Overview

```
NPM Packages:
- Production:    21 packages
- Development:   37 packages
- Total:         58 packages

Python Packages: 73 packages

Key Dependencies:
Frontend:        vue@3.x, pinia, vite, typescript
Backend:         fastapi, uvicorn, sqlalchemy
Testing:         vitest, playwright, pytest
```

## File Size Analysis

```
Total Size:      32.00 MB
Average Size:    16.21 KB

Size Distribution:
- < 1 KB:        312 files (15.4%)
- 1-10 KB:       1,423 files (70.4%)
- 10-100 KB:     273 files (13.5%)
- > 100 KB:      12 files (0.6%)
- > 1 MB:        2 files (0.1%)

Largest Files:
1. old_backups_20250530.tar.gz (7.74 MB)
2. src_backup.tar.gz (1.66 MB)
```

## Technology Adoption

```
Modern Technologies:    ████████████████████ 85%
Legacy Code:           ████ 15%

Frontend:  Vue 3 + TypeScript + Vite + Pinia
Backend:   FastAPI + Python 3.x
Testing:   Vitest + Playwright + pytest
DevOps:    Docker + GitHub Actions
```

## Action Items Priority

```
🔴 Critical (Immediate)
- Remove 258 duplicate files
- Clean up backup archives
- Configure ESLint/Prettier

🟡 Important (This Week)
- Increase test coverage to 25%
- Document API endpoints
- Organize shell scripts

🟢 Nice to Have (This Month)
- Complete Vue 3 migration
- Add performance monitoring
- Create documentation site
```