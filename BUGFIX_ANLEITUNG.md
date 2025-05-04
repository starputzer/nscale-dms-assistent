# Bugfix-Anleitung für nscale DMS Assistent

## Durchgeführte Änderungen

Folgende Änderungen wurden vorgenommen, um die Anwendung zu reparieren:

1. **Neue Dateien hinzugefügt**:
   - `/frontend/js/fix-endless-loop.js` - Verhindert Endlosschleifen im Dokumentenkonverter
   - `/frontend/css/vue-templates.css` - Blendet Vue-Templates korrekt aus
   - `/frontend/index-reset.html` - Notfall-Reset-Seite zum Zurücksetzen aller Einstellungen

2. **index.html aktualisiert**:
   - Referenzen auf nicht existierende Dateien entfernt (fix-es-module-error.js, vue-template-fix.css)
   - Lokale CSS und JS-Dateien eingebunden
   - Versteckten Container für Dokumentenkonverter eingefügt

3. **Automatisches Fix-Skript für localStorage**:
   - Feature-Flags werden auf false gesetzt (`useNewUI`, `feature_vueDocConverter`, etc.)
   - Fehlende Container werden automatisch erstellt
   - Endlosschleifen werden erkannt und gestoppt

## Anleitung zur Nutzung

### Normale Nutzung

Nach den Änderungen und einem Neustart des Servers sollte die Anwendung wieder normal funktionieren.

1. **Server neu starten**:
   ```bash
   cd /opt/nscale-assist/app && python -m api.server
   ```

2. **Im Browser öffnen**:
   ```
   http://localhost:8080/
   ```

### Bei weiterhin bestehenden Problemen

Sollten weiterhin Probleme auftreten, kann die Reset-Seite verwendet werden:

1. **Reset-Seite öffnen**:
   ```
   http://localhost:8080/index-reset.html
   ```

2. **Auf "Einstellungen zurücksetzen" klicken**

3. **"Zur normalen Ansicht wechseln" anklicken**

## Technische Details

### fix-endless-loop.js

Dieses Skript löst folgende Probleme:

- **Endlosschleifen**: Überwacht setTimeout-Aufrufe und bricht Rekursionen nach 5 Wiederholungen ab
- **Fehlende Container**: Erstellt automatisch einen versteckten doc-converter-container im DOM
- **Problematische Features**: Setzt automatisch alle Vue.js-Feature-Flags auf 'false'

### vue-templates.css

Diese CSS-Datei verhindert, dass Vue-Templates angezeigt werden und verursacht keine 404-Fehler mehr.

### index-reset.html

Notfall-Seite zum vollständigen Zurücksetzen der Anwendung:
- Löscht den gesamten localStorage
- Setzt alle Feature-Flags manuell zurück
- Zeigt den aktuellen Status aller Einstellungen an

## Langfristige Empfehlungen

Für eine nachhaltige Lösung empfehlen wir:

1. **Strukturierte Vue.js-Migration**:
   - Komponenten schrittweise migrieren und einzeln testen
   - Korrekte Build-Prozesse implementieren statt direkter ES-Module

2. **Bessere Feature-Erkennung**:
   - Automatische Erkennung, ob eine Komponente verfügbar ist
   - Graceful Degradation zu klassischen Implementierungen

3. **Robuste Fehlerbehandlung**:
   - Timeouts für Container-Suche implementieren
   - Klare Fehlermeldungen statt endloser Versuche