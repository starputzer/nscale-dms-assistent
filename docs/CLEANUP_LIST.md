# Cleanup-Liste für Redundante Dateien

Diese Liste enthält potentiell redundante Dateien nach der Optimierung der Projektstruktur und Festlegung auf Vue 3 SFC als Hauptarchitektur.

## 1. Redundante HTML-Einstiegspunkte

Diese HTML-Dateien können entfernt werden, da wir nun einen klaren Einstiegspunkt haben (`public/index.html`):

- `/opt/nscale-assist/app/frontend/index.html` (wenn nicht mehr benötigt)
- `/opt/nscale-assist/app/index-dev.html`
- `/opt/nscale-assist/app/index-vue3.html`
- `/opt/nscale-assist/app/simple-test.html`
- `/opt/nscale-assist/app/test-dependency-fix.html`
- `/opt/nscale-assist/app/direct-launch.html`
- `/opt/nscale-assist/app/quickstart.html`
- `/opt/nscale-assist/app/standalone-app.html`
- `/opt/nscale-assist/app/frontend/vue-dms-assistant.html`
- `/opt/nscale-assist/app/frontend/vue-dms-assistant-fixed.html`
- `/opt/nscale-assist/app/frontend/vue-test.html`
- `/opt/nscale-assist/app/frontend/index-vue3.html`
- `/opt/nscale-assist/app/frontend/index-dev.html`

## 2. Redundante JavaScript-Dateien

Diese JavaScript-Dateien könnten redundant sein, da wir nun Vue 3 SFC verwenden:

- `/opt/nscale-assist/app/frontend/vue-app-fix.js`
- `/opt/nscale-assist/app/frontend/vue-loader-fix.js`
- `/opt/nscale-assist/app/frontend/repair-interaction.js`
- `/opt/nscale-assist/app/frontend/debug-chat.js`
- `/opt/nscale-assist/app/frontend/debug-vue-loading.js`
- `/opt/nscale-assist/app/frontend/interactivity-test.js`
- `/opt/nscale-assist/app/frontend/css-path-fix.js`
- `/opt/nscale-assist/app/frontend/css-preloader.js`
- `/opt/nscale-assist/app/frontend/bridge-fix.js`
- `/opt/nscale-assist/app/frontend/advanced-repair.js`

## 3. Legacy JS-Module mit Vue 3 SFC-Äquivalenten

Diese Module haben möglicherweise Vue 3 SFC-Äquivalente und könnten redundant sein:

- `/opt/nscale-assist/app/frontend/js/app.js` (ersetzt durch `src/App.vue` und `src/main.ts`)
- `/opt/nscale-assist/app/frontend/js/chat.js` (ersetzt durch Vue-Komponenten in `src/components` und `src/views`)
- `/opt/nscale-assist/app/frontend/js/vue-app-manager.js` (ersetzt durch Vue 3-Initialisierung in `src/main.ts`)
- `/opt/nscale-assist/app/frontend/js/vue-legacy-bridge.js` (ersetzt durch optimierte Bridge in `src/bridge/`)

## 4. Mehrfache Optimierungsversionen

Diese Dateien stellen unterschiedliche Optimierungsversuche dar und könnten bereinigt werden:

- `/opt/nscale-assist/app/frontend/js/app.optimized.js` (zugunsten der Vue 3 SFC-Version)
- `/opt/nscale-assist/app/frontend/js/chat.optimized.js` (zugunsten der Vue 3 SFC-Version)
- `/opt/nscale-assist/app/src/App.optimized.vue` (wenn die Hauptversion funktioniert)
- `/opt/nscale-assist/app/src/main.optimized.ts` (wenn die Hauptversion funktioniert)
- `/opt/nscale-assist/app/src/stores/sessions.optimized.ts` (wenn die Hauptversion funktioniert)

## 5. Backup-Dateien

Diese Backup-Dateien können entfernt werden, wenn die Änderungen abgeschlossen sind:

- `/opt/nscale-assist/app/frontend/index.html.backup`
- `/opt/nscale-assist/app/frontend/index.html.cdn-backup`
- `/opt/nscale-assist/app/public/index.html.backup-*`
- `/opt/nscale-assist/app/src/App.vue.backup`
- `/opt/nscale-assist/app/src/App.vue.backup-*`
- `/opt/nscale-assist/app/src/main.ts.backup-*`
- `/opt/nscale-assist/app/vite.config.js.backup`
- `/opt/nscale-assist/app/vite.config.js.backup-*`
- `/opt/nscale-assist/app/vite.config.js.bak`
- `/opt/nscale-assist/app/package.json.bak`

## 6. Testdateien ohne Funktion

Diese Test-Dateien haben möglicherweise keine Funktion mehr:

- `/opt/nscale-assist/app/src/App.test-import.ts`
- `/opt/nscale-assist/app/src/App.test-import.tsx`

## 7. Multiple Konfigurationsversionen

Diese Konfigurationsdateien sind möglicherweise nicht mehr notwendig:

- `/opt/nscale-assist/app/vite.simple.config.js`
- `/opt/nscale-assist/app/tsconfig.optimized.json`
- `/opt/nscale-assist/app/vitest.perf.config.ts`
- `/opt/nscale-assist/app/vitest.performance.config.ts`

## 8. Legacy-Backup-Verzeichnisse

Diese Backup-Verzeichnisse könnten entfernt werden, nachdem sichergestellt wurde, dass alle notwendigen Dateien migriert wurden:

- `/opt/nscale-assist/app/backup-20250511170011/`
- `/opt/nscale-assist/app/backup-20250511180231/`
- `/opt/nscale-assist/app/backup-20250511185641/`

## Schritte vor dem Löschen von Dateien

**WICHTIG:** Befolgen Sie diese Sicherheitsmaßnahmen, bevor Sie Dateien löschen:

1. **Backup erstellen**:
   ```bash
   mkdir -p /opt/nscale-assist/app/pre-cleanup-backup
   cp -r /opt/nscale-assist/app/frontend /opt/nscale-assist/app/pre-cleanup-backup/
   cp -r /opt/nscale-assist/app/*.html /opt/nscale-assist/app/pre-cleanup-backup/
   ```

2. **Inkrementelles Testen**:
   - Verschieben Sie Dateien zuerst in ein temporäres Verzeichnis, anstatt sie direkt zu löschen
   - Testen Sie die Anwendung nach jeder Änderung
   - Löschen Sie die Dateien erst, wenn sichergestellt ist, dass sie nicht benötigt werden

3. **Gruppen-Verarbeitung**:
   - Bearbeiten Sie die Dateien in den oben genannten Kategorien
   - Beginnen Sie mit offensichtlich veralteten Dateien wie Backups und Testdateien
   - Lassen Sie kritischere Dateien wie Haupteinstiegspunkte und Core-Module für spätere Phasen

## Festlegung des Cleanup-Zeitplans

- **Phase 1**: Entfernen von offensichtlich veralteten Dateien (Backups, Tests)
- **Phase 2**: Entfernen redundanter HTML-Einstiegspunkte
- **Phase 3**: Entfernen redundanter JavaScript-Dateien mit Vue 3 SFC-Äquivalenten
- **Phase 4**: Entfernen von Optimierungsversionen und Konfigurationsdateien
- **Phase 5**: Entfernen von Legacy-Backup-Verzeichnissen

Jede Phase sollte ein vollständiges Testen der Anwendung gemäß der `TEST_ANLEITUNG.md` beinhalten.

## Nach dem Cleanup

Nach erfolgreichem Cleanup:

1. **Dokumentation aktualisieren**:
   - Aktualisieren Sie die Projektübersicht und Architekturdiagramme
   - Dokumentieren Sie gelöschte Module und ihre Entsprechungen in der Vue 3 SFC-Architektur

2. **Build-Prozess testen**:
   - Stellen Sie sicher, dass der Build-Prozess sauber ist und keine Fehler auftreten
   - Überprüfen Sie, ob die Anwendung ordnungsgemäß läuft

3. **Cleanup der Symlinks**:
   - Überprüfen Sie verbleibende Symlinks im Projekt
   - Entfernen Sie veraltete Symlinks, die auf gelöschte Dateien verweisen