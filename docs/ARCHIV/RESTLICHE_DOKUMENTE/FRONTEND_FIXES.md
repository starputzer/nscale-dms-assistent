# Frontend-Fixes

**Aktualisiert: 08.05.2025**

In diesem Dokument werden häufige Probleme und deren Lösungen im Frontend dokumentiert.

## Bekannte Probleme und Lösungen

### CSS-Konflikte

Problem: CSS-Styles aus verschiedenen Modulen überlagern sich gegenseitig.

Lösung: Verwenden Sie spezifischere Selektoren oder CSS-Module für eine bessere Isolation. Beispiel:

```css
.my-component .button {
  /* ... */
}
```

### JS-Module-Ladeproblem

Problem: "Uncaught SyntaxError: Cannot use import statement outside a module"

Lösung: Stellen Sie sicher, dass das Script-Tag das Attribut `type="module"` hat.

```html
<script type="module" src="path/to/script.js"></script>
```

### 404-Fehler bei main.js

Problem: Die main.js-Datei wird nicht gefunden, obwohl der Pfad scheinbar korrekt ist.

Lösung: Die Frontend-Struktur wurde bereinigt und alle main.js-Dateien konsolidiert. Verwenden Sie den standardisierten Pfad `/js/main.js` mit einem Fallback-Mechanismus:

```html
<script type="module">
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = src;
      
      script.onload = () => resolve(script);
      script.onerror = (error) => reject(error);
      
      document.head.appendChild(script);
    });
  }
  
  loadScript('/js/main.js')
    .catch(error => {
      console.warn('main.js konnte nicht geladen werden, versuche Fallbacks');
      return Promise.any([
        loadScript('/static/js/main.js'),
        loadScript('/frontend/js/main.js'),
        loadScript('/frontend/main.js')
      ]);
    })
    .catch(error => {
      console.error('Alle Versuche fehlgeschlagen, main.js zu laden', error);
    });
</script>
```

Für weitere Details zur Frontend-Struktur-Bereinigung und Konsolidierung der main.js-Dateien siehe: [11_FRONTEND_STRUKTUR_BEREINIGUNG.md](./06_SYSTEME/11_FRONTEND_STRUKTUR_BEREINIGUNG.md)

### MIME-Type-Fehler bei CSS-Dateien

Problem: CSS-Dateien werden als JavaScript-Module geladen, was zu MIME-Type-Fehlern führt.

Lösung: Stellen Sie sicher, dass CSS-Dateien mit dem korrekten MIME-Type (text/css) geladen werden:

1. Überprüfen Sie die .htaccess-Konfiguration:
   ```
   AddType text/css .css
   ```

2. Bei Node.js-Umgebungen verwenden Sie den Express-Server aus dem `server.js`-Skript, der alle MIME-Types korrekt setzt.

3. Laden Sie CSS-Dateien mit Link-Tags statt Import-Anweisungen:
   ```html
   <link rel="stylesheet" href="/css/main.css">
   ```

4. Bei FastAPI/Vite-Umgebungen:
   - Fügen Sie für jeden Ressourcentyp separate StaticFiles-Mounts hinzu:
     ```python
     app.mount("/static", StaticFiles(directory="frontend"), name="static")
     app.mount("/css", StaticFiles(directory="frontend/css"), name="css")
     app.mount("/js", StaticFiles(directory="frontend/js"), name="js")
     app.mount("/images", StaticFiles(directory="frontend/images"), name="images")
     ```
   - Setzen Sie in der Vite-Middleware den korrekten MIME-Type:
     ```javascript
     // Korrekter Content-Type basierend auf Dateiendung
     let contentType = 'application/octet-stream';
     if (ext === 'css') contentType = 'text/css';
     else if (ext === 'js') contentType = 'application/javascript';
     // ...
     
     res.writeHead(200, { 'Content-Type': contentType });
     ```
   
Ausführlichere Informationen zur Behebung von MIME-Type-Fehlern und Ladefehlern finden Sie in [05_REFERENZEN/07_FRONTEND_LADEPROBLEME.md](./05_REFERENZEN/07_FRONTEND_LADEPROBLEME.md).

### Inkonsistente Pfade in der Entwicklungsumgebung

Problem: Die Pfadstruktur zwischen Entwicklung und Produktion ist unterschiedlich.

Lösung: Verwenden Sie Basis-URLs in den Pfaden:

```javascript
const BASE_URL = process.env.NODE_ENV === 'production' ? '/frontend' : '';

// Verwendung
fetch(`${BASE_URL}/api/data`);
```

Alternativ können Sie auch die .htaccess oder server.js verwenden, um URL-Umleitungen zu konfigurieren.