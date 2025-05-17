# Testanleitung für Optimierte Projektstruktur

Diese Anleitung beschreibt die Testschritte zur Validierung der optimierten Projektstruktur und Asset-Pfade des nscale DMS Assistent.

## Voraussetzungen

- Node.js (Version 16+)
- npm oder yarn
- Vite (über npm installiert)
- Webbrowser (Chrome, Firefox oder Safari)

## 1. Build-Prozess testen

### Entwicklungsserver

1. **Entwicklungsserver starten**:
   ```bash
   npm run dev
   ```

2. **Browser öffnen**:
   - Navigieren Sie zu `http://localhost:3000`
   - Überprüfen Sie, ob die Anwendung korrekt geladen wird

3. **Konsole prüfen**:
   - Öffnen Sie die Browser-Entwicklerkonsole (F12)
   - Überprüfen Sie, ob keine Fehler auftreten, insbesondere keine 404-Fehler für Assets

### Produktionsbuild

1. **Produktionsbuild erstellen**:
   ```bash
   npm run build
   ```

2. **Build-Ausgabe überprüfen**:
   ```bash
   ls -la api/frontend/assets/
   ```
   - Überprüfen Sie, ob alle erwarteten Dateien vorhanden sind
   - Notieren Sie die generierten Dateinamen mit Hashes

3. **HTML-Datei aktualisieren**:
   - Überprüfen Sie, ob die Pfade in `/opt/nscale-assist/app/public/index.html` korrekt sind
   - Aktualisieren Sie den Pfad zum Haupt-JavaScript-Bundle mit dem neuen Hash

4. **Produktionsserver starten**:
   ```bash
   npm run preview
   ```

5. **Browser testen**:
   - Navigieren Sie zur Preview-URL (standardmäßig `http://localhost:4173`)
   - Überprüfen Sie, ob alle Assets korrekt geladen werden

## 2. Komponentenintegration testen

1. **App-Mounting prüfen**:
   - Überprüfen Sie, ob die Vue-App korrekt im DOM-Element mit ID "app" gemountet wird
   - Bestätigen Sie, dass der Lade-Indikator korrekt verschwindet, wenn die App geladen ist

2. **Routing testen**:
   - Navigieren Sie zu verschiedenen Routen in der Anwendung
   - Überprüfen Sie, ob die Komponenten korrekt geladen werden

3. **Bridge-System testen**:
   - Überprüfen Sie, ob das Bridge-System zwischen Vue 3 und Legacy-Code funktioniert
   - Testen Sie die Ereignisse und Datensynchronisation

## 3. Responsive Design testen

1. **Mobile Ansicht**:
   - Verwenden Sie die Responsive-Design-Ansicht des Browsers (F12 > Toggle Device Toolbar)
   - Testen Sie verschiedene Bildschirmgrößen (Handy, Tablet, Desktop)
   - Überprüfen Sie, ob das Layout korrekt reagiert

2. **Medien-Breakpoints überprüfen**:
   - Ändern Sie die Fenstergröße und beobachten Sie die Anpassung der Komponenten
   - Bestätigen Sie, dass die Navigation und UI-Elemente korrekt skalieren

## 4. Leistungsanalyse

1. **Lighthouse-Test**:
   - Öffnen Sie die Chrome-DevTools > Lighthouse
   - Führen Sie eine Leistungsanalyse durch
   - Überprüfen Sie die Ergebnisse für Performance, Accessibility, Best Practices und SEO

2. **Netzwerkanalyse**:
   - Öffnen Sie die Network-Tab in den Browser-DevTools
   - Prüfen Sie Ladezeiten und Requests
   - Überprüfen Sie, ob das Code-Splitting und Lazy-Loading korrekt funktionieren

## 5. Asset-Pfad-Konsistenz prüfen

1. **Manuelle Asset-Inspektion**:
   - Öffnen Sie die Network-Tab in den Browser-DevTools
   - Überprüfen Sie jede Anfrage nach CSS, JavaScript und Bildern
   - Bestätigen Sie, dass alle Anfragen erfolgreich sind (keine 404-Fehler)

2. **Bildvorschau prüfen**:
   - Überprüfen Sie, ob alle Bilder korrekt geladen werden
   - Prüfen Sie insbesondere das Logo und UI-Icons

3. **CSS-Anwendung überprüfen**:
   - Überprüfen Sie, ob alle Styles korrekt angewendet werden
   - Bestätigen Sie, dass keine CSS-Überschreibungen oder Konflikte auftreten

## 6. Fehlerszenarien testen

1. **Offline-Test**:
   - Deaktivieren Sie die Netzwerkverbindung im Browser
   - Aktualisieren Sie die Seite und beobachten Sie das Verhalten
   - Überprüfen Sie, ob eine angemessene Fehlermeldung angezeigt wird

2. **Ungültige Route testen**:
   - Navigieren Sie zu einer nicht existierenden Route
   - Überprüfen Sie, ob die Fehlerbehandlung korrekt funktioniert

## 7. Browser-Kompatibilitätstest

1. **Multi-Browser-Test**:
   - Testen Sie die Anwendung in verschiedenen Browsern (Chrome, Firefox, Safari, Edge)
   - Überprüfen Sie auf visuelle Konsistenz und Funktionalität

## Checkliste für erfolgreichen Test

- [ ] Entwicklungsserver startet ohne Fehler
- [ ] Produktionsbuild wird erfolgreich erstellt
- [ ] Alle Assets werden korrekt geladen (keine 404-Fehler)
- [ ] Vue-App wird korrekt gemountet
- [ ] Routing funktioniert zwischen allen Komponenten
- [ ] Bridge-System synchronisiert Daten korrekt
- [ ] Responsive Design funktioniert auf allen Bildschirmgrößen
- [ ] Lighthouse-Score ist akzeptabel
- [ ] Keine Netzwerkfehler bei Asset-Anfragen
- [ ] Bilder werden korrekt angezeigt
- [ ] CSS wird korrekt angewendet
- [ ] Offline-Fehlermeldung wird korrekt angezeigt
- [ ] Fehlerbehandlung für ungültige Routen funktioniert
- [ ] Anwendung funktioniert in allen getesteten Browsern

## Fehlerbehebung

### 404-Fehler für Assets

Wenn Assets mit 404-Fehlern fehlschlagen:

1. Überprüfen Sie die Pfade in `index.html`
2. Stellen Sie sicher, dass sie mit der tatsächlichen Build-Ausgabe übereinstimmen
3. Aktualisieren Sie die Hashes nach jedem Build

### Vite-Konfigurationsprobleme

Wenn der Build fehlschlägt oder inkonsistent ist:

1. Überprüfen Sie `vite.config.js` und stellen Sie sicher, dass die Ausgabeverzeichnisse korrekt sind
2. Erzwingen Sie einen Clean-Build:
   ```bash
   rm -rf api/frontend/assets
   npm run build
   ```

### Bridge-Synchronisationsprobleme

Wenn das Bridge-System nicht korrekt funktioniert:

1. Überprüfen Sie die Konsole auf spezifische Fehler
2. Prüfen Sie die Bridge-Diagnostics über die Browser-Konsole:
   ```javascript
   window.__bridge.diagnostics.getStatus()
   ```