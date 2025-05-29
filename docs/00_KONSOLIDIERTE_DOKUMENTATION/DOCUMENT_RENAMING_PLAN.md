---
title: "Document Renaming and Review Plan"
version: "1.0.0"
date: "2025-05-29"
lastUpdate: "2025-05-29"
author: "Claude"
status: "active"
priority: "Hoch"
category: "Dokumentation"
tags: ["Renaming", "Documentation", "Organization", "Plan"]
---

# Document Renaming and Review Plan

## Overview

This comprehensive plan outlines the renaming strategy for all documents in the consolidated documentation. The goal is to achieve consistent naming, logical ordering, and clear categorization.

## Naming Conventions

### General Rules
1. **Category prefix**: `XX_` (two digits)
2. **Document prefix within category**: `XX_` (two digits)
3. **Naming pattern**: `lowercase_with_underscores`
4. **No special characters** except underscores
5. **Clear, descriptive names** (avoid abbreviations)
6. **Language consistency**: German for content, English for technical terms

### Priority Assignment
- **00-09**: Core/Essential documents (must-read)
- **10-19**: Important features/components
- **20-29**: Supporting documentation
- **30-39**: Advanced topics
- **40-49**: Specific implementations
- **50-59**: Integration guides
- **60-69**: Migration/upgrade docs
- **70-79**: Troubleshooting/fixes
- **80-89**: Archive/deprecated
- **90-99**: Reference/appendix

## Detailed Renaming Plan

### 01_PROJEKT (Project Overview)
**Priority reasoning**: Core project understanding needed first

| Current Name | New Name | Priority | Status | Action |
|-------------|----------|----------|---------|--------|
| 00_INDEX.md | 00_index.md | Essential | Current | Keep |
| 00_status.md | 01_aktueller_status.md | High | Current | Rename |
| 01_projektueberblick.md | 02_projekt_uebersicht.md | High | Current | Rename |
| 02_roadmap.md | 03_entwicklungs_roadmap.md | High | Current | Rename |
| GITHUB_ISSUES_TEMPLATE.md | 90_github_issue_vorlage.md | Reference | Current | Move to reference |

### 02_ARCHITEKTUR (System Architecture)
**Priority reasoning**: Technical foundation before implementation details

| Current Name | New Name | Priority | Status | Action |
|-------------|----------|----------|---------|--------|
| 00_INDEX.md | 00_index.md | Essential | Current | Keep |
| 06_SYSTEMARCHITEKTUR.md | 01_system_architektur.md | Essential | Current | Move up, rename |
| 04_FRONTEND_STRUKTUR_UND_OPTIMIERUNG.md | 02_frontend_architektur.md | Essential | Current | Rename, simplify |
| 05_DATENPERSISTENZ_UND_API_INTEGRATION.md | 03_backend_api_architektur.md | Essential | Current | Rename |
| 02_STATE_MANAGEMENT.md | 10_state_management.md | Important | Current | Rename |
| 03_BRIDGE_SYSTEM.md | 11_bridge_system.md | Important | Current | Rename |
| 01_FEATURE_TOGGLE_SYSTEM.md | 12_feature_toggle_system.md | Important | Current | Rename |
| 02_DIALOG_SYSTEM.md | 13_dialog_system.md | Important | Current | Rename |
| 07_AB_TESTING_SYSTEM.md | 14_ab_testing_system.md | Important | Current | Rename |
| 10_ADMIN_BEREICH_ARCHITEKTUR.md | 20_admin_bereich_architektur.md | Supporting | Current | Rename |
| 08_ASSET_PFAD_KONFIGURATION.md | 30_asset_management.md | Advanced | Current | Rename |
| 09_PURE_VUE_MODE.md | 31_pure_vue_mode.md | Advanced | Current | Rename |
| 06_DEPENDENCY_ANALYSIS.md | 40_dependency_analyse.md | Specific | Archive | Move to archive |
| API_ROUTES_BEST_PRACTICE.md | 50_api_routes_guide.md | Integration | Current | Rename |
| MIGRATION_TO_SHARED_ROUTES.md | 51_shared_routes_migration.md | Integration | Archive | Move to archive |
| DIRECT_LOGIN_SOLUTION.md | 70_direct_login_loesung.md | Fix | Archive | Move to archive |

### 03_KOMPONENTEN (Components)
**Priority reasoning**: Most frequently accessed, core UI elements first

| Current Name | New Name | Priority | Status | Action |
|-------------|----------|----------|---------|--------|
| 00_INDEX.md | 00_index.md | Essential | Current | Keep |
| 02_UI_BASISKOMPONENTEN.md | 01_basis_komponenten.md | Essential | Current | Rename |
| 03_CHAT_INTERFACE.md | 02_chat_interface.md | Essential | Current | Rename |
| 01_DOKUMENTENKONVERTER.md | 03_dokumenten_konverter.md | Essential | Current | Rename |
| 04_admin_komponenten_komplett.md | 10_admin_dashboard.md | Important | Current | Rename |
| 07_CHAT_UND_SESSION_MANAGEMENT.md | 11_session_management.md | Important | Current | Rename |
| 10_COMPOSABLES.md | 12_vue_composables.md | Important | Current | Rename |
| 08_FEHLERMELDUNGEN_UND_BENACHRICHTIGUNGEN.md | 20_benachrichtigungen.md | Supporting | Current | Rename |
| 09_FEEDBACK_KOMPONENTEN.md | 21_feedback_system.md | Supporting | Current | Rename |
| 05_CSS_DESIGN_SYSTEM_UND_KOMPONENTEN_BIBLIOTHEK.md | 30_design_system.md | Advanced | Current | Rename |
| 06_DOKUMENTENKONVERTER_KOMPLETT.md | 40_dokumenten_konverter_details.md | Specific | Merge | Merge with 03 |
| 11_SOURCE_REFERENCES_FIX.md | 70_source_references_fix.md | Fix | Archive | Move to archive |
| CSS_CONSOLIDATION.md | 80_css_consolidation.md | Archive | Archive | Move to archive |
| DOCUMENT_CONVERTER_IMPLEMENTATION.md | 81_converter_implementation.md | Archive | Archive | Move to archive |

### 04_ENTWICKLUNG (Development)
**Priority reasoning**: Essential dev practices first, then specialized topics

| Current Name | New Name | Priority | Status | Action |
|-------------|----------|----------|---------|--------|
| 00_INDEX.md | 00_index.md | Essential | Current | Keep |
| 05_BEITRAGEN.md | 01_contributing_guide.md | Essential | Current | Rename |
| 01_TYPESCRIPT_TYPSYSTEM.md | 02_typescript_guide.md | Essential | Current | Rename |
| 03_TESTSTRATEGIE.md | 03_test_strategie.md | Essential | Current | Rename |
| 01_FEHLERBEHANDLUNG_UND_FALLBACKS.md | 10_error_handling.md | Important | Current | Rename |
| 05_AUTH_DEBUGGING_GUIDE.md | 11_auth_debugging.md | Important | Current | Rename |
| 07_DIAGNOSTICS_SYSTEM_INTEGRATION.md | 12_diagnostics_system.md | Important | Current | Rename |
| 03_MOBILE_OPTIMIERUNG.md | 20_mobile_optimierung.md | Supporting | Current | Rename |
| 04_BARRIEREFREIHEIT.md | 21_barrierefreiheit.md | Supporting | Current | Rename |
| 06_EDGE_CASES_UND_GRENZFAELLE.md | 30_edge_cases.md | Advanced | Current | Rename |
| 04_PINIA_STORE_TESTING.md | 31_pinia_testing.md | Advanced | Current | Rename |
| codebase-overview.md | 40_codebase_overview.md | Specific | Current | Rename |
| WORKTREE_OVERVIEW.md | 41_worktree_overview.md | Specific | Current | Rename |
| PLAN.md | 90_development_plan.md | Reference | Archive | Move to archive |
| FEATURE_MAPPING_REPORT.md | 91_feature_mapping.md | Reference | Archive | Move to archive |
| CREATED_ISSUES_SUMMARY.md | 92_created_issues.md | Reference | Archive | Move to archive |
| FINAL_ISSUES_SUMMARY.md | 93_final_issues.md | Reference | Archive | Move to archive |

### 05_BETRIEB (Operations)
**Priority reasoning**: Performance and troubleshooting are most critical

| Current Name | New Name | Priority | Status | Action |
|-------------|----------|----------|---------|--------|
| 00_INDEX.md | 00_index.md | Essential | Current | Keep |
| 01_PERFORMANCE_OPTIMIERUNG.md | 01_performance_guide.md | Essential | Current | Rename |
| 02_FEHLERBEHEBUNG.md | 02_troubleshooting.md | Essential | Current | Rename |
| 03_CLEANUP_LISTE.md | 20_cleanup_tasks.md | Supporting | Current | Rename |

### 06_ARCHIV (Archive)
**Priority reasoning**: Historical reference, low priority

| Current Name | New Name | Priority | Status | Action |
|-------------|----------|----------|---------|--------|
| 00_INDEX.md | 00_index.md | Essential | Current | Keep |
| MIGRATION_PLAN.md | 80_migration_plan.md | Archive | Archive | Keep |
| MOTD_FIXES_SUMMARY.md | 81_motd_fixes.md | Archive | Archive | Keep |
| MIGRATION/* | 85_vue3_migration/* | Archive | Archive | Keep structure |

### 07_WARTUNG (Maintenance)
**Priority reasoning**: Current maintenance docs, then historical fixes

| Current Name | New Name | Priority | Status | Action |
|-------------|----------|----------|---------|--------|
| 00_INDEX.md | 00_index.md | Essential | Current | Keep |
| 01_STREAMING_KOMPLETT.md | 01_streaming_system.md | Essential | Current | Rename |
| DOCUMENT_CONVERTER_EXPORT_FIX.md | 70_converter_export_fix.md | Fix | Archive | Move to archive |
| EMERGENCY_CHAT_FIX.md | 71_emergency_chat_fix.md | Fix | Archive | Move to archive |
| EMERGENCY_CHAT_INTEGRATION.md | 72_chat_integration_fix.md | Fix | Archive | Move to archive |
| SESSIONS_TS_FIX_SUMMARY.md | 73_sessions_fix.md | Fix | Archive | Move to archive |

### Root Level Documents
**Priority reasoning**: Meta-documentation and reports

| Current Name | New Name | Priority | Status | Action |
|-------------|----------|----------|---------|--------|
| 00_INDEX.md | 00_index.md | Essential | Current | Update |
| DOKUMENTATION_STATUS_2025.md | 90_status_report_2025.md | Reference | Current | Rename |
| FINAL_CONSOLIDATION_METRICS.md | 91_consolidation_metrics.md | Reference | Current | Rename |
| KONSOLIDIERUNG_2025_FINAL.md | 92_konsolidierung_2025.md | Reference | Current | Rename |
| VUE2_REFERENCES_REPORT.md | 93_vue2_references.md | Reference | Current | Rename |

## Implementation Steps

### Phase 1: Preparation (Day 1)
1. Create backup of current structure
2. Create mapping file with old → new names
3. Identify all internal links that need updating

### Phase 2: Restructuring (Day 2-3)
1. Rename files according to plan
2. Update all internal links
3. Move archive documents to appropriate locations
4. Merge duplicate content

### Phase 3: Content Review (Day 4-5)
1. Update metadata in all documents
2. Review and update content status
3. Add missing documentation identified in gaps
4. Remove outdated information

### Phase 4: Validation (Day 6)
1. Validate all links
2. Check naming consistency
3. Verify category organization
4. Test navigation flow

### Phase 5: Finalization (Day 7)
1. Update main index
2. Create change log
3. Update search indices
4. Communicate changes to team

## Content Status Review

### Documents Needing Updates
1. **Project Status** - Update with current Q2 2025 status
2. **Roadmap** - Add Q3/Q4 2025 plans
3. **Performance Guide** - Add new optimization techniques
4. **Troubleshooting** - Add recent issues and solutions

### Documents to Archive
1. All Vue2 → Vue3 migration docs (completed)
2. Old admin panel fixes (superseded)
3. Temporary streaming fixes (resolved)
4. Initial planning documents

### New Documents Needed
1. **Deployment Guide** - Production deployment steps
2. **Security Guide** - Security best practices
3. **API Reference** - Complete API documentation
4. **User Manual** - End-user documentation

## Success Metrics

1. **Naming Consistency**: 100% compliance with conventions
2. **Link Validity**: 100% functional internal links
3. **Content Currency**: All active docs updated within 30 days
4. **Organization**: Clear hierarchical structure
5. **Discoverability**: Easy navigation to any topic

## Maintenance Plan

### Monthly Reviews
- Check for outdated content
- Update status metadata
- Archive completed items
- Add new documentation

### Quarterly Reviews
- Restructure if needed
- Major content updates
- Performance metrics review
- User feedback integration

---

*This plan ensures a well-organized, maintainable documentation structure that serves both current needs and future growth.*