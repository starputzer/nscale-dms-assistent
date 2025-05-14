# Test-Anleitung: Optimierte Projektstruktur

Diese Anleitung beschreibt, wie Sie die optimierte Projektstruktur des nscale DMS Assistenten testen können.

## 1. Build-Prozess testen

### 1.1 Development-Build starten

```bash
# In das Projektverzeichnis wechseln
cd /opt/nscale-assist/app

# Development-Server starten
npm run dev
```

Zu erwartende Ergebnisse:
- Vite startet den Development-Server (standardmäßig auf Port 3000)
- Die Konsole sollte eine Nachricht "server running at http://localhost:3000/" oder ähnlich anzeigen
- Es sollten keine kritischen Fehler auftreten

### 1.2 Produktions-Build ausführen

```bash
# Produktionsbuild erstellen
npm run build
```

Zu erwartende Ergebnisse:
- Der Build-Prozess sollte erfolgreich abgeschlossen werden
- Die generierten Assets sollten im `/opt/nscale-assist/app/public/assets/` Verzeichnis erscheinen
- Die Konsole sollte keine kritischen Fehler anzeigen

## 2. Browser-Tests

### 2.1 Haupt-Anwendung testen

1. Öffnen Sie die Anwendung im Browser: `http://localhost:3000/`
2. Überprüfen Sie, ob die Anwendung korrekt geladen wird:
   - Der Login-Bildschirm oder die Hauptanwendung sollte angezeigt werden
   - Keine JavaScript-Fehler in der Konsole
   - Alle Styles werden korrekt geladen

### 2.2 Komponentenprüfung

1. **ChatView-Komponente testen**
   - Navigieren Sie zur Chat-Ansicht
   - Stellen Sie sicher, dass die Nachrichtenliste korrekt angezeigt wird
   - Versuchen Sie, eine neue Nachricht zu senden

2. **AdminView-Komponente testen** (falls verfügbar)
   - Navigieren Sie zur Admin-Ansicht (falls Sie Admin-Berechtigungen haben)
   - Überprüfen Sie, ob alle Tabs korrekt angezeigt werden
   - Testen Sie grundlegende Admin-Funktionen

3. **Settings-Komponente testen**
   - Öffnen Sie die Einstellungen
   - Versuchen Sie, Einstellungen zu ändern (z.B. Theme)
   - Überprüfen Sie, ob die Änderungen korrekt angewendet werden

### 2.3 Responsive Design testen

1. Testen Sie die Anwendung in verschiedenen Bildschirmgrößen:
   - Desktop (> 1200px)
   - Tablet (768px - 1199px)
   - Mobil (< 767px)

2. Überprüfen Sie, ob die UI korrekt reagiert:
   - Navigation passt sich an
   - Content wird korrekt angezeigt
   - Keine überlagerten Elemente

## 3. Konsole überprüfen

### 3.1 Auf JavaScript-Fehler prüfen

1. Öffnen Sie die Entwickler-Tools (F12 oder Rechtsklick → "Untersuchen"/"Inspect")
2. Wechseln Sie zur "Konsole"/"Console"-Ansicht
3. Achten Sie auf:
   - Rote Fehlermeldungen
   - 404-Fehler bei Assets
   - Warnungen bezüglich nicht gefundener Module

### 3.2 Auf Netzwerkprobleme prüfen

1. Wechseln Sie in den "Netzwerk"/"Network"-Tab der Entwickler-Tools
2. Laden Sie die Seite neu (F5)
3. Suchen Sie nach:
   - Fehlgeschlagenen Anfragen (rot markiert)
   - CSS oder JavaScript-Dateien, die nicht geladen werden konnten
   - Falschen Pfaden zu Assets

## 4. Typische Probleme und Lösungen

### 4.1 Asset-Pfad-Probleme

**Problem:** Assets wie CSS oder Bilder werden nicht geladen (404-Fehler)

**Lösung:**
- Überprüfen Sie die Pfade in der index.html
- Stellen Sie sicher, dass die Pfade mit einem führenden Slash beginnen (z.B. `/assets/...`)
- Überprüfen Sie, ob die Vite-Konfiguration das richtige Output-Verzeichnis verwendet

### 4.2 JavaScript-Module-Fehler

**Problem:** "Module not found" oder ähnliche Fehler in der Konsole

**Lösung:**
- Überprüfen Sie die Imports in main.ts
- Stellen Sie sicher, dass Aliase in vite.config.js korrekt konfiguriert sind
- Überprüfen Sie die node_modules auf fehlende Abhängigkeiten (ggf. `npm install` ausführen)

### 4.3 API-Verbindungsprobleme

**Problem:** Backend-API-Calls schlagen fehl

**Lösung:**
- Überprüfen Sie, ob der API-Server läuft
- Überprüfen Sie den apiBaseUrl-Wert in window.APP_CONFIG
- Stellen Sie sicher, dass der Proxy in vite.config.js korrekt konfiguriert ist
- Testen Sie mit dem Mock-API-Modus (`?mockApi=true` in der URL)

## 5. Erfolgreicher Test

Die Tests gelten als erfolgreich, wenn:

1. Die Anwendung ohne kritische Fehler lädt
2. Alle Hauptkomponenten korrekt angezeigt werden und funktionieren
3. Die Konsole keine kritischen Fehler aufweist
4. Der Build-Prozess erfolgreich abgeschlossen wird

Bei Problemen konsultieren Sie die PROJEKTSTRUKTUR_OPTIMIERUNG.md für weitere Details zur Projektstruktur und den vorgenommenen Änderungen.