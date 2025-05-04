# Fehlerbehebung und Debugging

Diese Dokumentation beschreibt häufige Probleme, deren Diagnose und Lösungsansätze in der nscale Assist App.

## Häufige Fehler und Lösungen

### 1. 404-Fehler für Ressourcen

**Symptom**: Browser-Konsole zeigt 404-Fehler für CSS oder JavaScript-Dateien.

```
GET /frontend/static/css/doc-converter-fix.css HTTP/1.1" 404 Not Found
GET /static/vue/standalone/doc-converter.js HTTP/1.1" 404 Not Found
```

**Ursache**: Inkonsistente Pfadstruktur zwischen verschiedenen Umgebungen.

**Lösung**:
- Verwendung des Path-Testers: `/frontend/js/doc-converter-path-tester.js`
- Kopieren der Ressourcen in verschiedene mögliche Pfade:
  ```bash
  cp /frontend/css/*.css /frontend/static/css/
  cp /frontend/js/*.js /frontend/static/js/
  ```
- Einbindung von Inline-CSS als Fallback

### 2. JavaScript-Fehler in Vue.js-Komponenten

**Symptom**: Fehler wie "Cannot use import statement outside a module" oder "Uncaught SyntaxError".

**Ursache**: ES6-Module werden nicht unterstützt oder falsch geladen.

**Lösung**:
- Modul-Redirector implementiert in `/frontend/js/doc-converter-module-redirector.js`
- NoModule-Versionen der Komponenten bereitstellen: `-nomodule.js`
- Typ von `module` zu `text/javascript` ändern

### 3. Unsichtbare UI-Elemente

**Symptom**: Tabs oder Komponenten werden nicht angezeigt, obwohl sie im DOM vorhanden sind.

**Ursache**: CSS-Probleme oder fehlende Container-Elemente.

**Lösung**:
- Forciertes CSS mit `!important` für kritische Anzeige-Eigenschaften
- DOM-Überwachung mit automatischer Sichtbarmachung
- Container dynamisch erstellen, wenn nicht vorhanden

### 4. Syntax-Fehler in JavaScript

**Symptom**: Konsole zeigt "Uncaught SyntaxError" in JavaScript-Dateien.

**Ursache**: Ungültige Syntax, besonders bei Escape-Zeichen (`\\!` statt `!`).

**Lösung**:
- Escape-Zeichen korrekt anwenden
- JavaScript-Dateien mit ESLint prüfen
- Fix-Skript für bekannte Syntax-Fehler

## Diagnose-Tools

### 1. Path-Logger

Der Path-Logger (`/frontend/js/doc-converter-path-logger.js`) bietet:
- Protokollierung aller Ressourcenanfragen
- Visuelles Overlay mit Echtzeit-Logging
- Lokale Speicherung von Logs im localStorage

**Aktivierung**: Automatisch in `index.html` eingebunden oder manuell:
```javascript
// Logging ein-/ausschalten
window.docConverterPathLogger.toggleUI();
```

### 2. Path-Tester

Der Path-Tester (`/frontend/js/doc-converter-path-tester.js`) bietet:
- Systematischer Test aller möglichen Ressourcenpfade
- Automatische Generierung und Test von Alternativpfaden
- Auto-Fix-Modus für 404-Fehler

**Verwendung**:
```javascript
// Alle Ressourcen testen
window.docConverterPathTester.test();

// DOM auf versteckte Elemente prüfen
window.docConverterPathTester.checkDOM();
```

### 3. Lokaler Storage Manager

Feature-Toggles und Diagnose-Einstellungen werden im localStorage gespeichert:

**Feature-Toggles verwalten**:
```javascript
// Vue.js-Komponenten aktivieren/deaktivieren
localStorage.setItem('feature_vueDocConverter', 'true');
localStorage.setItem('feature_vueAdmin', 'true');
```

**Diagnose-Einstellungen**:
```javascript
// Debug-Overlay minimieren
localStorage.setItem('docConverterDebugMinimized', 'true');

// Auto-Fix aktivieren
window.AUTO_FIX_PATHS = true;
```

**Alles zurücksetzen**:
```javascript
// Reset-Link verwenden oder manuell
localStorage.clear();
```

## Notfall-Reset

Im Notfall kann die Anwendung vollständig zurückgesetzt werden:

1. Über den Reset-Link in der rechten oberen Ecke der Anwendung
2. Direkter Aufruf der Reset-Seite: `/frontend/reset.html`
3. Manuelles Löschen des localStorage:
   ```javascript
   localStorage.clear();
   localStorage.setItem('useNewUI', 'false');
   localStorage.setItem('feature_vueDocConverter', 'false');
   localStorage.setItem('feature_vueAdmin', 'false');
   localStorage.setItem('feature_vueSettings', 'false');
   localStorage.setItem('feature_vueChat', 'false');
   ```

## Bekannte Probleme und Workarounds

### 1. Module-Loading-Fehler in Safari

**Problem**: Safari hat begrenzte Unterstützung für ES6-Module.
**Workaround**: NoModule-Versionen werden automatisch geladen.

### 2. DOM-Elemente nicht verfügbar

**Problem**: Skripte versuchen, auf DOM-Elemente zuzugreifen, bevor diese bereit sind.
**Workaround**: Verzögerte Initialisierung und DOM-Überwachung implementiert.

### 3. Inkonsistente CSS-Pfade

**Problem**: CSS-Dateien werden unter verschiedenen Pfaden gesucht.
**Workaround**: CSS-Dateien an mehrere Pfade kopiert und Inline-CSS als Fallback.