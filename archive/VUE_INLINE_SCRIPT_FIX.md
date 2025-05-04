# Vue.js Inline-Script und DocConverter-Fix

## Hintergrund und Probleme

Bei der Integration von Vue.js in unsere Anwendung sind zwei kritische Probleme aufgetreten:

1. **Inline-Script-Fehler**: Vue.js 3.x unterstützt keine Inline-Scripts (`<script>`-Tags) in Templates. Dies führt zu Warnungen und Fehlern wie:
   ```
   [Vue warn]: Tags with side effect (<script> and <style>) are ignored in client component templates.
   ```

2. **DocConverter auf der Hauptseite**: Der Dokumentenkonverter wird auf der Hauptseite geladen, obwohl er nur im Admin-Bereich sichtbar sein sollte. Dies führt zu unnötiger Ressourcennutzung und potenziellen UI-Problemen.

## Implementierte Lösungen

### 1. Vue-Template-Fix

Um Inline-Script-Fehler zu beheben, haben wir einen zweistufigen Ansatz implementiert:

#### A. CSS-basierte Ausblendung
- `vue-template-fix.css` versteckt Script-Tags in Vue-Templates vollständig
- Setzt kritische CSS-Eigenschaften wie `display: none`, `visibility: hidden`, etc.

#### B. JavaScript-basierte Transformation
- `vue-template-fix.js` wandelt Inline-Scripts in Daten-Attribute um
- Sucht nach Scripts in Vue-Templates und markiert sie mit `data-vue-fixed="true"`
- Extrahiert Script-Inhalte und verschiebt sie in globale JavaScript-Funktionen
- Setzt `type="text/x-template"`, um Ausführung zu verhindern

### 2. DocConverter-Beschränkung

Um den Dokumentenkonverter aus der Hauptseite zu entfernen:

#### A. CSS-basierte Steuerung
- Selektoren wie `body:not(.admin-page) #doc-converter-app` verstecken den Konverter auf der Hauptseite
- CSS-Regeln stellen sicher, dass der Konverter nur im richtigen Admin-Tab erscheint

#### B. Bedingte Skript-Ladung
- Diagnostik und Adapter-Scripts werden nur geladen, wenn Admin-Bereich erkannt wird
- JavaScript prüft `window.location.pathname` und DOM-Struktur für Admin-Erkennung

#### C. LocalStorage-Steuerung
- Speichert Feature-Flag-Status für DocConverter separat für Hauptseite/Admin-Bereich
- Deaktiviert `feature_vueDocConverter` temporär auf der Hauptseite, stellt es im Admin-Bereich wieder her

## Implementierungsdetails

### Frühe Ausführung

Die Fix-Scripts werden im `<head>` vor allen anderen Scripts geladen:

```html
<!-- Kritische CSS für Vue-Template-Fix - früh laden für sofortige Wirkung -->
<link href="/static/css/vue-template-fix.css" rel="stylesheet">
    
<!-- Kritisches JS für Vue-Template-Fix - früh laden für sofortige Wirkung -->
<script src="/static/js/vue-template-fix.js"></script>
```

### Selektor-Strategie

Für maximale Browser-Kompatibilität verwenden wir mehrere Selektoren:

```css
/* DocConverter auf Hauptseite ausblenden */
body:not(.admin-page) #doc-converter-app,
body:not(.admin-page) #doc-converter-container,
body:not(.admin-page) .doc-converter-app,
body:not(.admin-page) .doc-converter-container,
*[data-disabled-on-main="true"] {
    display: none !important;
    visibility: hidden !important;
}
```

### Bedingte Script-Ladung

Scripts werden nur im Admin-Bereich geladen:

```javascript
// Nur laden, wenn wir im Admin-Bereich sind
if (window.location.pathname.includes('/admin') || document.querySelector('.admin-page')) {
    const script = document.createElement('script');
    script.src = '/static/js/doc-converter-diagnostics.js';
    document.head.appendChild(script);
}
```

## Vorteile dieser Lösung

1. **Nicht-invasiv**: Keine Änderung des bestehenden Codes, nur zusätzliche Dateien
2. **Sofortige Wirkung**: Fix wird vor dem Laden der Vue.js-Bibliothek angewendet
3. **Hohe Kompatibilität**: Funktioniert mit allen modernen Browsern
4. **Leicht zu warten**: Klare Trennung zwischen Problem und Lösung
5. **Performance-optimiert**: Verhindert unnötige Script-Ausführung auf der Hauptseite

## Nächste Schritte

In einer künftigen Version sollten wir:

1. Inline-Scripts vollständig aus Templates entfernen
2. Dokumentenkonverter-Code nur bei Bedarf nachladen (Lazy Loading)
3. Bessere Unterscheidung zwischen Hauptseite und Admin-Bereich implementieren
4. Admin-Bereiche als eigene Module mit eigenen Abhängigkeiten implementieren