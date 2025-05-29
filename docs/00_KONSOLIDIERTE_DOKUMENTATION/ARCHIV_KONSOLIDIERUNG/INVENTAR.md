# Dokumentations-Inventar - Digitale Akte Assistent

## Übersicht
Stand: 16.05.2025
Dieses Dokument enthält ein vollständiges Inventar aller Dokumentationsdateien im Projekt.

## Root Directory (/app)
- AB_TESTS_README.md
- CHANGELOG.md
- CLAUDE.md
- CLEANUP_LISTE.md
- CONTRIBUTING.md
- dependency-analysis.md
- dependency-diagram.md
- ENHANCED_ROUTE_FALLBACK_FIX.md
- FEHLERANALYSE_LOESUNG.md
- FEHLERBEHOBEN_ENDLOSSCHLEIFE.md
- file-usage-analysis.md
- FINALE_MIGRATION_ANLEITUNG.md
- HOW_TO_ACCESS_REDESIGNED_VERSION.md
- INDEX_HTML_FIX.md
- OPTIMIERTE_PROJEKTSTRUKTUR.md
- PLAN.md
- PROJEKTSTRUKTUR_OPTIMIERUNG.md
- PURE_VUE_DEBUGGING.md
- PURE_VUE_IMPLEMENTATION_SUMMARY.md
- PURE_VUE_MODE.md
- PURE_VUE_README.md
- README.md
- README-REDESIGNED.md
- REBRAND_INTEGRATION_GUIDE.md
- ROUTER_FIX_CHAT_SESSIONS.md
- ROUTER_SERVICE_FIX.md
- SECURITY.md
- SYSTEM_STATUS.md
- TEST_ANLEITUNG.md
- THEME_SYSTEM_SUMMARY.md
- typescript-fixes-summary.md
- typescript-fixes-update.md

## Konsolidierte Dokumentation (/docs/00_KONSOLIDIERTE_DOKUMENTATION)

### 00_PROJEKT
- 01_PROJEKTUEBERBLICK.md (Duplikat?)
- 01_ROADMAP.md
- 02_PROJEKTUEBERBLICK.md (Duplikat?)

### 01_MIGRATION
- 01_MIGRATIONSSTATUS_UND_PLANUNG.md
- 02_LEGACY_CODE_DEAKTIVIERUNG.md
- 02_VUE3_COMPOSITION_API.md
- 03_DUPLICATE_CODE_CLEANUP.md
- 03_FINALE_VUE3_MIGRATION.md
- 03_PINIA_STORE_BRIDGE.md
- 04_QUELLREFERENZEN_MIGRATION.md
- 04_VUE3_VITE_BROWSER_KOMPATIBILITAET.md
- 05_FEEDBACK_MIGRATION.md
- 06_SETTINGS_MIGRATION.md
- 07_ADMIN_MIGRATION.md
- 08_CHAT_MIGRATION.md

### 02_ARCHITEKTUR
- 05_BRIDGE_SYSTEM.md

### 02_KOMPONENTEN
- 01_DOKUMENTENKONVERTER.md
- 02_UI_BASISKOMPONENTEN.md
- 03_CHAT_INTERFACE.md
- 04_ADMIN_KOMPONENTEN.md
- 05_CSS_DESIGN_SYSTEM_UND_KOMPONENTEN_BIBLIOTHEK.md
- 06_DOKUMENTENKONVERTER_KOMPLETT.md
- 07_CHAT_UND_SESSION_MANAGEMENT.md
- 08_FEHLERMELDUNGEN_UND_BENACHRICHTIGUNGEN.md
- 09_FEEDBACK_KOMPONENTEN.md
- 10_COMPOSABLES.md
- 11_SOURCE_REFERENCES_FIX.md

### 03_ARCHITEKTUR
- 02_FEATURE_TOGGLE_SYSTEM.md
- 03_DIALOG_SYSTEM.md
- 05_FRONTEND_STRUKTUR_UND_OPTIMIERUNG.md
- 06_DATENPERSISTENZ_UND_API_INTEGRATION.md
- 07_SYSTEMARCHITEKTUR.md
- 09_AB_TESTING_SYSTEM.md
- 10_ASSET_PFAD_KONFIGURATION.md

### 03_KOMPONENTEN (Duplikat?)
- 04_ADMIN_KOMPONENTEN.md

### 04_BETRIEB
- 04_PERFORMANCE_OPTIMIERUNG.md
- 05_FEHLERBEHEBUNG.md

### 04_ENTWICKLUNG
- 01_FEHLERBEHANDLUNG_UND_FALLBACKS.md
- 02_TESTSTRATEGIE.md
- 03_MOBILE_OPTIMIERUNG.md
- 04_BARRIEREFREIHEIT.md
- 05_EDGE_CASES_UND_GRENZFAELLE.md

### 05_ENTWICKLUNG
- 05_BEITRAGEN.md
- 07_TYPESCRIPT_TYPSYSTEM.md

### 05_REFERENZEN
- 01_TYPESCRIPT_TYPSYSTEM.md
- 02_STATE_MANAGEMENT.md
- 03_TESTSTRATEGIE.md
- 04_PINIA_STORE_TESTING.md

## Archive (/docs/ARCHIV und /docs/ARCHIV_BACKUP)
[Mehrere hundert archivierte Dokumentationsdateien]

## Sonstige Dokumentation

### /docs Root
- AUTH_DEBUGGING_GUIDE.md
- CLEANUP_LISTE.md
- DIAGNOSTICS_SYSTEM_INTEGRATION.md
- DOCUMENT_TEMPLATE.md
- DOKUMENTATION_KONSOLIDIERUNG_ABGESCHLOSSEN.md
- LEGACY_REMOVAL_FEEDBACK.md
- LEGACY_REMOVAL_SOURCE_REFERENCES.md
- OPTIMIERUNG_ABSCHLUSS.md
- PROJEKTSTRUKTUR_OPTIMIERUNG.md
- REDUNDANTE_DOKUMENTATION.md
- TEST_ANLEITUNG.md
- THEME_SYSTEM_DOCUMENTATION.md
- TYPESCRIPT_TEMPLATE.md

### Subdirectories
- /e2e/utils/README_MOBILE_TESTING.md
- /examples/migration/migrationPlan.md
- /examples/session/README.md
- /frontend/BUGFIX_ANLEITUNG.md
- /frontend/INTERAKTIVITAETS_REPARATUR.md
- /scripts/typescript-fixes-summary.md
- /src/AUTH_IMPLEMENTATION.md
- /src/README-VUE3.md
- /src/bridge/enhanced/optimized/README.md
- /src/bridge/enhanced/README-TYPESCRIPT.md
- /src/components/chat/enhanced/a11y.md
- /src/components/dialog/README.md
- /src/components/ui/examples/README.md
- /src/migration/SHARED_UTILS_MIGRATION.md
- /src/stores/README.md
- /test/accessibility/README.md
- /test/e2e/README.md
- /test/edge-cases/README.md
- /test/README-PERFORMANCE-TESTS.md
- /test/README-TYPESCRIPT-TESTING.md
- /test/REGRESSION_TEST_PLAN.md
- /test/REGRESSION_TEST_PLAN_UPDATED.md
- /test/typescript/README.md
- /test/vanilla/README.md

## Festgestellte Probleme

1. **Redundanzen:**
   - Mehrere PROJEKTUEBERBLICK Dateien
   - Mehrere TEST_ANLEITUNG Dateien
   - Duplizierte Ordnerstrukturen (02_KOMPONENTEN, 03_KOMPONENTEN)
   - Architektur- und Komponentendokumentation teilweise überlappend

2. **Inkonsistente Benennung:**
   - Mischung aus Deutsch und Englisch
   - Verschiedene Schreibweisen (Großbuchstaben, Unterstriche)
   - Nummerierung nicht durchgängig

3. **Verstreute Dokumentation:**
   - Dokumentation in Root-, docs-, src- und test-Verzeichnissen
   - Wichtige Informationen in verschiedenen Dateien fragmentiert

4. **Veraltete Referenzen:**
   - Noch "nscale DMS Assistent" Referenzen vorhanden
   - Veraltete Migrationsstatus-Dokumente

5. **Fehlende Metadaten:**
   - Viele Dateien ohne Versionsnummern oder Aktualisierungsdaten
   - Keine konsistenten Autoren- oder Status-Informationen