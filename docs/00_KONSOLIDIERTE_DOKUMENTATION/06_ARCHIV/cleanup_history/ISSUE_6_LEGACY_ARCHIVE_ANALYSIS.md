# Issue #6: Legacy-Archive-Verzeichnis - Analyse

## Status: KANN ENTFERNT WERDEN

## Verzeichnis-Details

**Pfad**: `/frontend/js/legacy-archive/`

**Inhalt**: 18 Legacy JavaScript-Dateien aus der Vue 2 Ära:
- app.js, chat.js, admin.js
- performance-monitor.js, telemetry.js
- Weitere Frontend-JavaScript-Dateien

## Analyse-Ergebnis

### ✅ Vue 3 Migration abgeschlossen
- Aktuelle Vue-Version: 3.3.8
- main.ts verwendet Vue 3 createApp API
- Keine Abhängigkeiten zu Legacy-Code

### ✅ Keine aktiven Referenzen
- **HTML**: Keine `<script>` Tags verweisen auf Legacy-Archive
- **JS/TS**: Keine Imports aus diesem Verzeichnis
- **Build**: Nicht in Build-Konfiguration eingebunden

### ⚠️ Rollback-Referenzen (Low Impact)
- `scripts/emergency-legacy-rollback.js` - Notfall-Rollback-Skript
- `rollback_cleanup.sh` - Cleanup-Rollback-Anweisungen

## Empfehlung

**SICHER ZU ENTFERNEN**

Das Verzeichnis wurde während der Vue 3 Migration als Backup erstellt und wird nicht mehr benötigt.

## Backup-Status

Laut Rollback-Skripten existiert möglicherweise bereits ein Backup in:
`/opt/nscale-assist/app/BACKUP_CLEANUP_20250516/legacy-frontend/`

## Risikobewertung

- **Risiko**: MINIMAL
- **Impact**: KEINE (nur Archiv)
- **Rollback**: Möglich über Git-History
- **Tests betroffen**: KEINE

## Aktionen

1. ✅ Verzeichnis entfernen
2. ✅ Rollback-Skripte aktualisieren
3. ✅ Dokumentation der Entfernung

## Größe

Das Entfernen spart ca. 18 JavaScript-Dateien mit Legacy-Code.