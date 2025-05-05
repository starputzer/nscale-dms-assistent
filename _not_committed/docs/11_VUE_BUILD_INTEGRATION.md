# Vue Build und Integration

Diese Dokumentation beschreibt den Build-Prozess und die Integration der Vue.js-Komponenten in die bestehende HTML/CSS-basierte Anwendung.

## Build-Prozess

### auto-build.sh Script

Das `auto-build.sh`-Script führt den vollständigen Build- und Deployment-Prozess für die Vue.js-Komponenten durch:

1. **Git-Update**: Holt die neuesten Änderungen aus dem Git-Repository
2. **Backup**: Erstellt ein Backup der aktuellen statischen Dateien
3. **Dependencies installieren**: Führt `npm install` aus
4. **Build ausführen**: Führt `npm run build` aus
5. **Deployment**: Kopiert die Build-Artefakte in die richtigen Verzeichnisse
6. **Feature-Toggle-Setup**: Erstellt Scripts für die Feature-Toggle-Verwaltung
7. **Server-Konfiguration**: Aktualisiert die Server-Konfiguration für Vue.js
8. **Neustart (optional)**: Startet den Server neu, falls aktiviert

### Verwendung des auto-build.sh Scripts

```bash
# Einfacher Build ohne Server-Neustart
cd /opt/nscale-assist/app
./auto-build.sh

# Build mit automatischem Server-Neustart
cd /opt/nscale-assist/app
AUTO_RESTART=true ./auto-build.sh
```

### Notwendige Voraussetzungen

Vor dem Ausführen des auto-build.sh Scripts müssen folgende Voraussetzungen erfüllt sein:

1. Node.js und npm sind installiert
2. Die nötigen Dependencies sind in der `package.json` definiert
3. Die Vite-Konfiguration ist in `vite.config.js` korrekt eingerichtet
4. Das Verzeichnis `/opt/nscale-assist/app/nscale-vue` existiert mit der Vue.js-Anwendung

## Integration in die bestehende HTML/CSS-Anwendung

Die Integration erfolgt über ein Feature-Toggle-System, das es ermöglicht, Vue.js-Komponenten schrittweise einzuführen, während die bestehende Funktionalität erhalten bleibt.

### Feature-Toggle-System

Die Vue.js-Komponenten werden über ein Feature-Flag-System aktiviert:

```javascript
// Aktivieren einer Vue.js-Komponente
localStorage.setItem('feature_vueHeader', 'true');

// Deaktivieren einer Vue.js-Komponente
localStorage.setItem('feature_vueHeader', 'false');
```

Verfügbare Feature-Flags:

- `feature_vueHeader`: Header-Komponente
- `feature_vueChat`: Chat-Komponente
- `feature_vueAdmin`: Admin-Komponente
- `feature_vueSettings`: Einstellungs-Komponente
- `feature_vueDocConverter`: Dokumentenkonverter-Komponente

### HTML-Integration

Die Integration in die bestehende HTML-Struktur erfolgt über spezielle Marker:

```html
<!-- Vue.js-Container -->
<div id="vue-app" data-vue-container></div>

<!-- Klassischer Container als Fallback -->
<div id="classic-container" data-classic-container></div>
```

### Fallback-Mechanismus

Jede Vue.js-Komponente enthält einen Fallback-Mechanismus, der bei Problemen automatisch zur klassischen HTML/CSS-Version wechselt:

1. **Feature-Flag-Prüfung**: Prüft, ob die Vue.js-Komponente aktiviert ist
2. **Initialisierung**: Versucht, die Vue.js-Komponente zu initialisieren
3. **Timeout-Überwachung**: Erkennt, wenn die Initialisierung zu lange dauert
4. **Fehlerbehandlung**: Fängt Fehler ab und aktiviert den Fallback
5. **Graceful Degradation**: Wechselt nahtlos zur klassischen Version

## Testen der Integration

### Manuelle Tests

1. **Feature-Toggle testen**: Features einzeln aktivieren/deaktivieren
2. **Browser-Kompatibilität**: In verschiedenen Browsern testen
3. **Responsivität**: Auf verschiedenen Geräten testen
4. **Fehlerszenarien**: Netzwerkfehler, fehlende Dateien, etc. simulieren

### Automatisierte Tests

Geplante automatisierte Tests:

1. **Visuelle Regressionstests**: Vergleich von Screenshots
2. **Funktionale Tests**: Prüfung der Funktionalität
3. **End-to-End-Tests**: Testen des gesamten Ablaufs

## Server-Start nach dem Build

Nach erfolgreicher Ausführung des `auto-build.sh`-Scripts kann der Server mit dem folgenden Befehl gestartet werden:

```bash
# Server im Vordergrund starten
cd /opt/nscale-assist/app
python api/server.py

# Server im Hintergrund starten
cd /opt/nscale-assist/app
nohup python api/server.py > logs/server.log 2>&1 &
```

## Fehlerbehebung

### Bekannte Probleme und Lösungen

1. **Build-Fehler**: 
   ```
   Problem: npm run build schlägt fehl
   Lösung: Prüfen Sie die Node.js-Version und das Vorhandensein aller Dependencies
   ```

2. **Integrationsprobleme**: 
   ```
   Problem: Vue.js-Komponenten werden nicht geladen
   Lösung: Überprüfen Sie die Feature-Flags und die Konsole auf JavaScript-Fehler
   ```

3. **Server-Startprobleme**:
   ```
   Problem: Server startet nicht nach dem Build
   Lösung: Überprüfen Sie die Logs und stellen Sie sicher, dass Python-Pfad korrekt ist
   ```

### Logs und Diagnose

Die wichtigsten Log-Dateien:

- Build-Logs: `/opt/nscale-assist/app/logs/auto-build.log`
- Server-Logs: `/opt/nscale-assist/app/logs/server.log`
- Vue.js-Fehler: Browser-Konsole (F12 in den meisten Browsern)