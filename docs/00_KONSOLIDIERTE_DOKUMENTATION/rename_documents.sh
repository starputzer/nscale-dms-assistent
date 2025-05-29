#!/bin/bash

# Document Renaming Script
# This script automates the renaming of documents according to the plan

set -e

DOCS_DIR="/opt/nscale-assist/app/docs/00_KONSOLIDIERTE_DOKUMENTATION"
BACKUP_DIR="$DOCS_DIR/BACKUP_$(date +%Y%m%d_%H%M%S)"

echo "=== Document Renaming Script ==="
echo "Starting at: $(date)"
echo "Documentation directory: $DOCS_DIR"

# Create backup
echo -e "\n1. Creating backup..."
mkdir -p "$BACKUP_DIR"
cp -r "$DOCS_DIR"/* "$BACKUP_DIR/" 2>/dev/null || true
echo "Backup created at: $BACKUP_DIR"

# Function to rename files
rename_file() {
    local old_path="$1"
    local new_path="$2"
    local full_old="$DOCS_DIR/$old_path"
    local full_new="$DOCS_DIR/$new_path"
    
    if [ -f "$full_old" ]; then
        # Create directory if needed
        mkdir -p "$(dirname "$full_new")"
        mv "$full_old" "$full_new"
        echo "✓ Renamed: $old_path → $new_path"
    else
        echo "✗ Not found: $old_path"
    fi
}

# Function to move files to archive
move_to_archive() {
    local old_path="$1"
    local new_path="$2"
    local full_old="$DOCS_DIR/$old_path"
    local full_new="$DOCS_DIR/$new_path"
    
    if [ -f "$full_old" ]; then
        mkdir -p "$(dirname "$full_new")"
        mv "$full_old" "$full_new"
        echo "✓ Archived: $old_path → $new_path"
    else
        echo "✗ Not found: $old_path"
    fi
}

echo -e "\n2. Renaming files..."

# 01_PROJEKT
rename_file "01_PROJEKT/00_status.md" "01_PROJEKT/01_aktueller_status.md"
rename_file "01_PROJEKT/01_projektueberblick.md" "01_PROJEKT/02_projekt_uebersicht.md"
rename_file "01_PROJEKT/02_roadmap.md" "01_PROJEKT/03_entwicklungs_roadmap.md"
rename_file "01_PROJEKT/GITHUB_ISSUES_TEMPLATE.md" "01_PROJEKT/90_github_issue_vorlage.md"

# 02_ARCHITEKTUR
rename_file "02_ARCHITEKTUR/06_SYSTEMARCHITEKTUR.md" "02_ARCHITEKTUR/01_system_architektur.md"
rename_file "02_ARCHITEKTUR/04_FRONTEND_STRUKTUR_UND_OPTIMIERUNG.md" "02_ARCHITEKTUR/02_frontend_architektur.md"
rename_file "02_ARCHITEKTUR/05_DATENPERSISTENZ_UND_API_INTEGRATION.md" "02_ARCHITEKTUR/03_backend_api_architektur.md"
rename_file "02_ARCHITEKTUR/02_STATE_MANAGEMENT.md" "02_ARCHITEKTUR/10_state_management.md"
rename_file "02_ARCHITEKTUR/03_BRIDGE_SYSTEM.md" "02_ARCHITEKTUR/11_bridge_system.md"
rename_file "02_ARCHITEKTUR/01_FEATURE_TOGGLE_SYSTEM.md" "02_ARCHITEKTUR/12_feature_toggle_system.md"
rename_file "02_ARCHITEKTUR/02_DIALOG_SYSTEM.md" "02_ARCHITEKTUR/13_dialog_system.md"
rename_file "02_ARCHITEKTUR/07_AB_TESTING_SYSTEM.md" "02_ARCHITEKTUR/14_ab_testing_system.md"
rename_file "02_ARCHITEKTUR/10_ADMIN_BEREICH_ARCHITEKTUR.md" "02_ARCHITEKTUR/20_admin_bereich_architektur.md"
rename_file "02_ARCHITEKTUR/08_ASSET_PFAD_KONFIGURATION.md" "02_ARCHITEKTUR/30_asset_management.md"
rename_file "02_ARCHITEKTUR/09_PURE_VUE_MODE.md" "02_ARCHITEKTUR/31_pure_vue_mode.md"
rename_file "02_ARCHITEKTUR/API_ROUTES_BEST_PRACTICE.md" "02_ARCHITEKTUR/50_api_routes_guide.md"

# Move to archive
move_to_archive "02_ARCHITEKTUR/06_DEPENDENCY_ANALYSIS.md" "06_ARCHIV/40_dependency_analyse.md"
move_to_archive "02_ARCHITEKTUR/MIGRATION_TO_SHARED_ROUTES.md" "06_ARCHIV/51_shared_routes_migration.md"
move_to_archive "02_ARCHITEKTUR/DIRECT_LOGIN_SOLUTION.md" "06_ARCHIV/70_direct_login_loesung.md"

# 03_KOMPONENTEN
rename_file "03_KOMPONENTEN/02_UI_BASISKOMPONENTEN.md" "03_KOMPONENTEN/01_basis_komponenten.md"
rename_file "03_KOMPONENTEN/03_CHAT_INTERFACE.md" "03_KOMPONENTEN/02_chat_interface.md"
rename_file "03_KOMPONENTEN/01_DOKUMENTENKONVERTER.md" "03_KOMPONENTEN/03_dokumenten_konverter.md"
rename_file "03_KOMPONENTEN/04_admin_komponenten_komplett.md" "03_KOMPONENTEN/10_admin_dashboard.md"
rename_file "03_KOMPONENTEN/07_CHAT_UND_SESSION_MANAGEMENT.md" "03_KOMPONENTEN/11_session_management.md"
rename_file "03_KOMPONENTEN/10_COMPOSABLES.md" "03_KOMPONENTEN/12_vue_composables.md"
rename_file "03_KOMPONENTEN/08_FEHLERMELDUNGEN_UND_BENACHRICHTIGUNGEN.md" "03_KOMPONENTEN/20_benachrichtigungen.md"
rename_file "03_KOMPONENTEN/09_FEEDBACK_KOMPONENTEN.md" "03_KOMPONENTEN/21_feedback_system.md"
rename_file "03_KOMPONENTEN/05_CSS_DESIGN_SYSTEM_UND_KOMPONENTEN_BIBLIOTHEK.md" "03_KOMPONENTEN/30_design_system.md"

# Move to archive
move_to_archive "03_KOMPONENTEN/11_SOURCE_REFERENCES_FIX.md" "06_ARCHIV/70_source_references_fix.md"
move_to_archive "03_KOMPONENTEN/CSS_CONSOLIDATION.md" "06_ARCHIV/80_css_consolidation.md"
move_to_archive "03_KOMPONENTEN/DOCUMENT_CONVERTER_IMPLEMENTATION.md" "06_ARCHIV/81_converter_implementation.md"

# Merge dokumentenkonverter files
if [ -f "$DOCS_DIR/03_KOMPONENTEN/06_DOKUMENTENKONVERTER_KOMPLETT.md" ]; then
    echo -e "\n# Extended Documentation\n" >> "$DOCS_DIR/03_KOMPONENTEN/03_dokumenten_konverter.md"
    cat "$DOCS_DIR/03_KOMPONENTEN/06_DOKUMENTENKONVERTER_KOMPLETT.md" >> "$DOCS_DIR/03_KOMPONENTEN/03_dokumenten_konverter.md"
    rm "$DOCS_DIR/03_KOMPONENTEN/06_DOKUMENTENKONVERTER_KOMPLETT.md"
    echo "✓ Merged: 06_DOKUMENTENKONVERTER_KOMPLETT.md into 03_dokumenten_konverter.md"
fi

# 04_ENTWICKLUNG
rename_file "04_ENTWICKLUNG/05_BEITRAGEN.md" "04_ENTWICKLUNG/01_contributing_guide.md"
rename_file "04_ENTWICKLUNG/01_TYPESCRIPT_TYPSYSTEM.md" "04_ENTWICKLUNG/02_typescript_guide.md"
rename_file "04_ENTWICKLUNG/03_TESTSTRATEGIE.md" "04_ENTWICKLUNG/03_test_strategie.md"
rename_file "04_ENTWICKLUNG/01_FEHLERBEHANDLUNG_UND_FALLBACKS.md" "04_ENTWICKLUNG/10_error_handling.md"
rename_file "04_ENTWICKLUNG/05_AUTH_DEBUGGING_GUIDE.md" "04_ENTWICKLUNG/11_auth_debugging.md"
rename_file "04_ENTWICKLUNG/07_DIAGNOSTICS_SYSTEM_INTEGRATION.md" "04_ENTWICKLUNG/12_diagnostics_system.md"
rename_file "04_ENTWICKLUNG/03_MOBILE_OPTIMIERUNG.md" "04_ENTWICKLUNG/20_mobile_optimierung.md"
rename_file "04_ENTWICKLUNG/04_BARRIEREFREIHEIT.md" "04_ENTWICKLUNG/21_barrierefreiheit.md"
rename_file "04_ENTWICKLUNG/06_EDGE_CASES_UND_GRENZFAELLE.md" "04_ENTWICKLUNG/30_edge_cases.md"
rename_file "04_ENTWICKLUNG/04_PINIA_STORE_TESTING.md" "04_ENTWICKLUNG/31_pinia_testing.md"
rename_file "04_ENTWICKLUNG/codebase-overview.md" "04_ENTWICKLUNG/40_codebase_overview.md"
rename_file "04_ENTWICKLUNG/WORKTREE_OVERVIEW.md" "04_ENTWICKLUNG/41_worktree_overview.md"

# Move to archive
move_to_archive "04_ENTWICKLUNG/PLAN.md" "06_ARCHIV/90_development_plan.md"
move_to_archive "04_ENTWICKLUNG/FEATURE_MAPPING_REPORT.md" "06_ARCHIV/91_feature_mapping.md"
move_to_archive "04_ENTWICKLUNG/CREATED_ISSUES_SUMMARY.md" "06_ARCHIV/92_created_issues.md"
move_to_archive "04_ENTWICKLUNG/FINAL_ISSUES_SUMMARY.md" "06_ARCHIV/93_final_issues.md"

# 05_BETRIEB
rename_file "05_BETRIEB/01_PERFORMANCE_OPTIMIERUNG.md" "05_BETRIEB/01_performance_guide.md"
rename_file "05_BETRIEB/02_FEHLERBEHEBUNG.md" "05_BETRIEB/02_troubleshooting.md"
rename_file "05_BETRIEB/03_CLEANUP_LISTE.md" "05_BETRIEB/20_cleanup_tasks.md"

# 06_ARCHIV
rename_file "06_ARCHIV/MIGRATION_PLAN.md" "06_ARCHIV/80_migration_plan.md"
rename_file "06_ARCHIV/MOTD_FIXES_SUMMARY.md" "06_ARCHIV/81_motd_fixes.md"

# 07_WARTUNG
rename_file "07_WARTUNG/01_STREAMING_KOMPLETT.md" "07_WARTUNG/01_streaming_system.md"

# Move to archive
move_to_archive "07_WARTUNG/DOCUMENT_CONVERTER_EXPORT_FIX.md" "06_ARCHIV/70_converter_export_fix.md"
move_to_archive "07_WARTUNG/EMERGENCY_CHAT_FIX.md" "06_ARCHIV/71_emergency_chat_fix.md"
move_to_archive "07_WARTUNG/EMERGENCY_CHAT_INTEGRATION.md" "06_ARCHIV/72_chat_integration_fix.md"
move_to_archive "07_WARTUNG/SESSIONS_TS_FIX_SUMMARY.md" "06_ARCHIV/73_sessions_fix.md"

# Root level
rename_file "DOKUMENTATION_STATUS_2025.md" "90_status_report_2025.md"
rename_file "FINAL_CONSOLIDATION_METRICS.md" "91_consolidation_metrics.md"
rename_file "KONSOLIDIERUNG_2025_FINAL.md" "92_konsolidierung_2025.md"
rename_file "VUE2_REFERENCES_REPORT.md" "93_vue2_references.md"

echo -e "\n3. Updating links in documents..."
# This would require a more complex script to update all internal links
# For now, we'll create a list of files that need link updates

echo -e "\n4. Creating link update list..."
find "$DOCS_DIR" -name "*.md" -type f | while read -r file; do
    if grep -q "\](\./" "$file" 2>/dev/null; then
        echo "Needs link update: $file"
    fi
done > "$DOCS_DIR/files_needing_link_updates.txt"

echo -e "\n=== Renaming Complete ==="
echo "Completed at: $(date)"
echo "Backup location: $BACKUP_DIR"
echo "Files needing link updates: $DOCS_DIR/files_needing_link_updates.txt"
echo ""
echo "Next steps:"
echo "1. Review the renamed files"
echo "2. Update internal links using the mapping file"
echo "3. Update the main index files"
echo "4. Validate all links"