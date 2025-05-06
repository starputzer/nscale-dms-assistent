# Test-Bereinigungsplan

## Zu behaltende Dateien

1. **Primäre Test-Runner**
   - `master_test_runner.html` - Umfassender Haupttest-Runner
   - `integration_test_runner.html` - Runner für integrierte Tests

2. **Fix-Dateien**
   - `all-fixes-bundle.js` - Primäre konsolidierte Lösung für alle Fixes

3. **Kerntest-Dateien**
   - `text_streaming_test.js` - Test für Text-Streaming-Funktionalität
   - `session_tabs_test.js` - Test für Session-Tabs
   - `admin_button_test.js` - Test für Admin-Button
   - `admin_first_click_test.js` - Test für das erste Klicken auf den Admin-Button
   - `admin_stats_test.js` - Test für Admin-Statistiken
   - `doc_converter_test.js` - Test für Dokumentenkonverter
   - `feedback_button_test.js` - Test für Feedback-Buttons
   - `motd_test.js` - Test für MOTD-Funktionalität
   - `ui_tests.js` - Allgemeine UI-Tests
   - `issue_tests.js` - Tests für bekannte Probleme

## Zu löschende Dateien

1. **Redundante Test-Runner**
   - `test_runner_new.html` - Ersetzt durch master_test_runner.html
   - `comprehensive_test_runner.html` - Ersetzt durch master_test_runner.html
   - `admin_fix_test_runner.html` - Redundante Testfunktionalität

2. **Einzelne Fix-Dateien (jetzt im Bündel enthalten)**
   - `text_streaming_fix.js` - Integriert in all-fixes-bundle.js
   - `session_input_persister_fix.js` - Integriert in all-fixes-bundle.js
   - `motd_preview_fix.js` - Integriert in all-fixes-bundle.js
   - `doc_converter_buttons_fix.js` - Integriert in all-fixes-bundle.js
   - `admin_tab_fix.js` - Integriert in all-fixes-bundle.js
   - `admin-view-fix.js` - Integriert in all-fixes-bundle.js
   - `integrated_test_fix.js` - Ersetzt durch all-fixes-bundle.js

3. **Veraltete Test-Dateien**
   - `bugfix_tests.html` - Ersetzt durch issue_tests.js
   - `live_test_runner.html` - Veraltete Test-Implementierung
   - `live_validator.html` - Veraltete Validierung, ersetzt durch neue Tests
   - `live_validator.js` - Zugehörige veraltete Validierungsfunktionen

## Bereinigungsbefehle

Die Bereinigung kann mit den folgenden Befehlen durchgeführt werden:

```bash
# Backup-Verzeichnis für gelöschte Dateien erstellen
mkdir -p /opt/nscale-assist/app/tests/archive

# Redundante Test-Runner verschieben
mv /opt/nscale-assist/app/tests/test_runner_new.html /opt/nscale-assist/app/tests/archive/
mv /opt/nscale-assist/app/tests/comprehensive_test_runner.html /opt/nscale-assist/app/tests/archive/
mv /opt/nscale-assist/app/tests/admin_fix_test_runner.html /opt/nscale-assist/app/tests/archive/

# Einzelne Fix-Dateien verschieben
mv /opt/nscale-assist/app/tests/text_streaming_fix.js /opt/nscale-assist/app/tests/archive/
mv /opt/nscale-assist/app/tests/session_input_persister_fix.js /opt/nscale-assist/app/tests/archive/
mv /opt/nscale-assist/app/tests/motd_preview_fix.js /opt/nscale-assist/app/tests/archive/
mv /opt/nscale-assist/app/tests/doc_converter_buttons_fix.js /opt/nscale-assist/app/tests/archive/
mv /opt/nscale-assist/app/tests/admin_tab_fix.js /opt/nscale-assist/app/tests/archive/
mv /opt/nscale-assist/app/tests/integrated_test_fix.js /opt/nscale-assist/app/tests/archive/

# Veraltete Test-Dateien verschieben
mv /opt/nscale-assist/app/tests/bugfix_tests.html /opt/nscale-assist/app/tests/archive/
mv /opt/nscale-assist/app/tests/live_test_runner.html /opt/nscale-assist/app/tests/archive/
mv /opt/nscale-assist/app/tests/live_validator.html /opt/nscale-assist/app/tests/archive/
mv /opt/nscale-assist/app/tests/live_validator.js /opt/nscale-assist/app/tests/archive/
```

## Ergebnisse

Nach der Bereinigung bleiben nur die wesentlichen Test-Dateien übrig, die für die Durchführung der Tests erforderlich sind. Die redundanten und veralteten Dateien werden in ein Archivverzeichnis verschoben, um sie für den Fall, dass sie später benötigt werden, zu erhalten.

Die einzige Fix-Datei, die beibehalten wird, ist `all-fixes-bundle.js`, die alle Fixes in einer einzigen optimierten Datei konsolidiert.