# Fehlerbehebung und Debugging

Diese Dokumentation beschreibt häufige Probleme, deren Diagnose und Lösungsansätze in der nscale Assist App.

## Häufige Fehler und Lösungen

### 1. 404-Fehler für Ressourcen

**Symptom**: Browser-Konsole zeigt 404-Fehler für CSS oder JavaScript-Dateien.

```
GET /frontend/static/css/doc-converter-fix.css HTTP/1.1" 404 Not Found
GET /static/js/doc-converter.js HTTP/1.1" 404 Not Found
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

### 2. Unsichtbare UI-Elemente

**Symptom**: Tabs oder Komponenten werden nicht angezeigt, obwohl sie im DOM vorhanden sind.

**Ursache**: CSS-Probleme oder fehlende Container-Elemente.

**Lösung**:
- Forciertes CSS mit `!important` für kritische Anzeige-Eigenschaften
- DOM-Überwachung mit automatischer Sichtbarmachung
- Container dynamisch erstellen, wenn nicht vorhanden

### 3. Endlosschleifen in Initialisierungsfunktionen

**Symptom**: Browser wird langsam, Konsole wird mit wiederholten Nachrichten geflutet.

**Ursache**: Rekursive Aufrufe von Initialisierungsfunktionen ohne klare Abbruchbedingung.

**Lösung**:
```javascript
// Alte problematische Implementierung
function initializeComponent() {
  if (!document.getElementById('component-container')) {
    setTimeout(initializeComponent, 100); // Potenzieller Endlos-Loop
    return;
  }
  // Initialisierungscode...
}

// Verbesserte Implementierung mit Abbruchbedingung
let initAttempts = 0;
const MAX_ATTEMPTS = 10;

function initializeComponent() {
  if (initAttempts >= MAX_ATTEMPTS) {
    console.error('Maximale Anzahl an Initialisierungsversuchen erreicht');
    return;
  }
  
  initAttempts++;
  
  if (!document.getElementById('component-container')) {
    setTimeout(initializeComponent, 100);
    return;
  }
  
  // Initialisierungscode...
}
```

### 4. DOM-Manipulationskonflikte nach Vue.js-Integration

**Symptom**: UI-Elemente verschwinden, erscheinen doppelt oder zeigen inkonsistentes Verhalten.

**Ursache**: Konflikte zwischen Framework-gesteuerten und direkten DOM-Manipulationen.

**Lösung**:
- Rückkehr zu einer reinen HTML/CSS/JS-Implementierung
- Zukünftig: Strikte Trennung von React-verwalteten DOM-Bereichen und direkter DOM-Manipulation
- Eindeutige Ownership definieren: Framework oder direkter Code, nicht beides für dieselben Elemente

### 5. Feature-Toggle-Probleme

**Symptom**: Funktionen werden nicht korrekt aktiviert oder deaktiviert, UI-Inkonsistenzen.

**Ursache**: Inkonsistente Feature-Toggle-Überprüfungen, Caching-Probleme.

**Lösung**:
```javascript
// Zentrale Feature-Toggle-Funktionen
function isFeatureEnabled(featureName) {
  // Konsistentes Format für Feature-Flags
  return localStorage.getItem(`feature_${featureName}`) === 'true';
}

function setFeatureEnabled(featureName, enabled) {
  localStorage.setItem(`feature_${featureName}`, enabled ? 'true' : 'false');
  
  // Optional: Event auslösen, damit andere Komponenten reagieren können
  const event = new CustomEvent('featureToggleChanged', {
    detail: { feature: featureName, enabled: enabled }
  });
  document.dispatchEvent(event);
}

// Event-Listener für dynamische Anpassungen
document.addEventListener('featureToggleChanged', function(event) {
  const { feature, enabled } = event.detail;
  console.log(`Feature "${feature}" wurde ${enabled ? 'aktiviert' : 'deaktiviert'}`);
  
  // UI entsprechend aktualisieren
  updateUIForFeature(feature, enabled);
});
```

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
// Feature-Toggles aktivieren/deaktivieren
localStorage.setItem('feature_reactDocConverter', 'true');
localStorage.setItem('feature_reactAdmin', 'true');
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
   localStorage.setItem('feature_reactDocConverter', 'false');
   localStorage.setItem('feature_reactAdmin', 'false');
   localStorage.setItem('feature_reactSettings', 'false');
   localStorage.setItem('feature_reactChat', 'false');
   ```

## Typische Probleme nach der Aufgabe der Vue.js-Migration

### 1. Verbleibende Vue.js-Referenzen

**Symptom**: Konsolenfehler bezüglich nicht gefundener Vue.js-Ressourcen oder -Funktionen.

**Ursache**: Verbleibende Referenzen auf Vue.js-Komponenten nach der Rückkehr zur HTML/CSS/JS-Implementierung.

**Lösung**:
- Verwenden des folgenden Skripts zum Aufspüren und Entfernen von Vue.js-Referenzen:
  ```javascript
  function findVueReferences() {
    // Suche im DOM nach vue-spezifischen Attributen
    const vueElements = document.querySelectorAll('[v-if], [v-for], [v-bind], [v-model], [v-on], [v-show], [v-cloak], [v-once]');
    console.log('Gefundene Vue.js-Elemente:', vueElements);
    
    // Suche in Scripts nach Vue-Referenzen
    const scripts = document.querySelectorAll('script');
    scripts.forEach(script => {
      const content = script.textContent;
      if (content.includes('Vue.') || content.includes('new Vue') || content.includes('createApp')) {
        console.log('Script mit Vue.js-Referenzen:', script);
      }
    });
  }
  
  findVueReferences();
  ```

### 2. CSS-Klassenkonflikte

**Symptom**: UI-Elemente haben unerwartetes Styling oder Layout.

**Ursache**: Konflikte zwischen Vue.js-spezifischen CSS-Klassen und HTML/CSS/JS-Styling.

**Lösung**:
- Inspektion der problematischen Elemente mit Browser-DevTools
- Identifikation und Entfernung von Vue.js-spezifischen CSS-Klassen
- Anwendung von `!important` für kritische Styling-Regeln, falls nötig

### 3. Fehlende Initialisierungsfunktionen

**Symptom**: Komponenten werden nicht korrekt initialisiert oder zeigen leere Inhalte.

**Ursache**: Die Initialisierungslogik war in Vue.js-Komponenten enthalten und fehlt jetzt.

**Lösung**:
- Implementierung einer neuen Initialisierungslogik für HTML/CSS/JS:
  ```javascript
  document.addEventListener('DOMContentLoaded', function() {
    // Alle Komponenten initialisieren
    initializeDocConverter();
    initializeAdminPanel();
    initializeSettings();
    
    // Event-Listener für dynamische Inhalte
    document.addEventListener('tabChanged', function(event) {
      const tabId = event.detail.tabId;
      initializeTabContent(tabId);
    });
  });
  ```

## Vorbereitung auf die React-Migration

### 1. Clean Slate Approach

Vor der React-Migration sollte die Codebasis bereinigt werden:

```javascript
// clean-vue-references.js - In der Konsole ausführen
function cleanVueReferences() {
  // Vue-spezifische Attribute entfernen
  document.querySelectorAll('[v-if], [v-for], [v-bind], [v-model], [v-on], [v-show], [v-cloak], [v-once]').forEach(el => {
    ['v-if', 'v-for', 'v-bind', 'v-model', 'v-on', 'v-show', 'v-cloak', 'v-once'].forEach(attr => {
      if (el.hasAttribute(attr)) {
        console.log(`Entferne ${attr} von`, el);
        el.removeAttribute(attr);
      }
    });
  });
  
  // Vue-spezifische CSS-Klassen entfernen
  document.querySelectorAll('[class]').forEach(el => {
    const classes = el.className.split(' ');
    const vueClasses = classes.filter(cls => cls.startsWith('v-') || cls.startsWith('vue-'));
    
    if (vueClasses.length > 0) {
      console.log(`Entferne Vue-Klassen ${vueClasses.join(', ')} von`, el);
      vueClasses.forEach(cls => el.classList.remove(cls));
    }
  });
  
  console.log('Bereinigung von Vue.js-Referenzen abgeschlossen');
}

cleanVueReferences();
```

### 2. DOM-Struktur für React vorbereiten

Für die React-Migration sollten klare Mountpunkte definiert werden:

```html
<!-- Klare Mount-Punkte für React-Komponenten -->
<div id="react-app-root">
  <!-- React wird hier mounten -->
</div>

<div id="react-doc-converter-root">
  <!-- React Doc-Converter wird hier mounten -->
</div>

<div id="react-admin-root">
  <!-- React Admin-Bereich wird hier mounten -->
</div>
```

---

Zuletzt aktualisiert: 05.05.2025