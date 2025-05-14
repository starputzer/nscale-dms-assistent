# Aufräum-Liste für nscale DMS Assistent

Die folgende Liste enthält Dateien, die nach erfolgreicher Umstellung auf die Vue 3 SFC-Architektur entfernt werden können. **Wichtiger Hinweis**: Erstellen Sie vor dem Entfernen dieser Dateien ein Backup des gesamten Projekts!

## Zu entfernende Dateien

### Legacy HTML-Dateien

Diese Dateien werden durch die neue Vue 3 SFC-Struktur mit einem zentralen Einstiegspunkt ersetzt:

```bash
# Legacy HTML-Dateien
rm -f /opt/nscale-assist/app/frontend/index.html
rm -f /opt/nscale-assist/app/api/frontend/frontend/index.html
rm -f /opt/nscale-assist/app/direct-launch.html
rm -f /opt/nscale-assist/app/index-dev.html
rm -f /opt/nscale-assist/app/index-vue3.html
rm -f /opt/nscale-assist/app/launcher.html
rm -f /opt/nscale-assist/app/quickstart.html
rm -f /opt/nscale-assist/app/simple-test.html
rm -f /opt/nscale-assist/app/standalone-app.html
rm -f /opt/nscale-assist/app/test-dependency-fix.html
```

### Legacy JavaScript-Dateien

Diese JavaScript-Dateien wurden durch moderne Vue 3 Komponenten, Composables und Stores ersetzt:

```bash
# Legacy JavaScript-Dateien
rm -f /opt/nscale-assist/app/frontend/js/app.js
rm -f /opt/nscale-assist/app/frontend/js/app.optimized.js
rm -f /opt/nscale-assist/app/frontend/js/chat.js
rm -f /opt/nscale-assist/app/frontend/js/chat.optimized.js
rm -f /opt/nscale-assist/app/frontend/js/enhanced-chat.js
rm -f /opt/nscale-assist/app/frontend/js/feedback.js
rm -f /opt/nscale-assist/app/frontend/js/settings.js
rm -f /opt/nscale-assist/app/frontend/js/admin.js
rm -f /opt/nscale-assist/app/frontend/js/source-references.js
```

### Backup-Dateien und temporäre Dateien

Diese Dateien sind Backups oder temporäre Dateien, die nicht mehr benötigt werden:

```bash
# Backup-Dateien
rm -f /opt/nscale-assist/app/public/index.html.backup-*
rm -f /opt/nscale-assist/app/api/frontend/index.html.backup-*
rm -f /opt/nscale-assist/app/frontend/index.html.backup
rm -f /opt/nscale-assist/app/frontend/index.html.cdn-backup
rm -f /opt/nscale-assist/app/src/App.vue.backup
rm -f /opt/nscale-assist/app/src/App.vue.backup-*
rm -f /opt/nscale-assist/app/src/main.ts.backup-*
rm -f /opt/nscale-assist/app/vite.config.js.backup-*
```

### Redundante Vue-Dateien

```bash
# Redundante Vue-Dateien
rm -rf /opt/nscale-assist/app/src/backup_app_files/
```

## Verzeichnisse, die möglicherweise bereinigt werden können

Nach sorgfältiger Prüfung könnten auch diese Verzeichnisse bereinigt werden:

```bash
# Mögliche Verzeichnisse für die Bereinigung (VORSICHT!)
# rm -rf /opt/nscale-assist/app/backup-*/
# rm -rf /opt/nscale-assist/app/MIGRATION_SCRIPTS/
```

## Durchführung der Bereinigung

### Vorbereitungen

Vor dem Löschen der Dateien:

1. Erstellen Sie ein vollständiges Backup des Projekts
   ```bash
   cp -r /opt/nscale-assist/app /opt/nscale-assist/app_backup_$(date +%Y%m%d)
   ```

2. Stellen Sie sicher, dass die Anwendung mit der neuen Struktur funktioniert
   ```bash
   cd /opt/nscale-assist/app
   npm run build
   # Test der Anwendung im Browser
   ```

3. Führen Sie einen Commit durch, bevor Sie mit der Bereinigung beginnen

### Schrittweise Bereinigung

Entfernen Sie die Dateien schrittweise und testen Sie nach jedem Schritt die Anwendung:

1. Zuerst die Backup-Dateien entfernen
2. Dann die Legacy HTML-Dateien
3. Zuletzt die Legacy JavaScript-Dateien

### Überprüfung nach der Bereinigung

Nach dem Entfernen der Dateien:

1. Führen Sie einen Clean-Build durch
   ```bash
   cd /opt/nscale-assist/app
   rm -rf node_modules/.vite
   npm run build
   ```

2. Testen Sie die Anwendung gründlich
3. Überprüfen Sie die Konsole auf Fehler

## Bei Problemen

Falls nach der Bereinigung Probleme auftreten:

1. Überprüfen Sie die Konsole auf spezifische Fehlermeldungen
2. Stellen Sie sicher, dass alle erforderlichen Assets verfügbar sind
3. Bei schwerwiegenden Problemen stellen Sie das Backup wieder her

Das Backup kann wie folgt wiederhergestellt werden:
```bash
rm -rf /opt/nscale-assist/app
cp -r /opt/nscale-assist/app_backup_YYYYMMDD /opt/nscale-assist/app
```