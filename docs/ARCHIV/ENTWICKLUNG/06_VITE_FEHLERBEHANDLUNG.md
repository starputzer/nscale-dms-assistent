# Vite Fehlerbehandlung und MIME-Typ-Konfiguration

**Datum:** 08.05.2025

## Überblick

Dieses Dokument beschreibt die Konfiguration von Vite zum korrekten Umgang mit verschiedenen Dateitypen, insbesondere CSS-Dateien, und die Behandlung von MIME-Typ-bezogenen Fehlern im nscale DMS Assistenten.

## Herausforderungen mit MIME-Typen in Vite

Vite verwendet ES-Module, die strenge MIME-Typ-Überprüfungen durchführen. Dies führt zu folgenden Herausforderungen:

1. **CSS-Imports in JavaScript**: Wenn CSS-Dateien direkt in JavaScript-Dateien importiert werden, müssen sie vom Browser als JavaScript geparst werden können, was zu MIME-Typ-Fehlern führt.
2. **Inkonsistente Content-Type-Header**: Wenn der Server CSS-Dateien nicht mit dem korrekten MIME-Typ `text/css` ausliefert, werden sie vom Browser abgelehnt.
3. **Symlink-Auflösung**: Bei Verwendung von symbolischen Links kann die Pfadauflösung zu falschen Content-Types führen.

## Unsere Lösung

### 1. CSS-Handling-Plugin für Vite

In der `vite.config.js` wurde ein spezielles Plugin implementiert, das CSS-Imports in JavaScript-Dateien erkennt und transformiert:

```javascript
function cssHandlingPlugin() {
  return {
    name: 'css-handling',
    transform(code, id) {
      // Wenn es sich um einen CSS-Import in einer JS-Datei handelt
      if (id.endsWith('.js') && code.includes('import') && code.includes('.css')) {
        // Entferne CSS-Imports aus JS-Dateien
        const newCode = code.replace(/import ['"].*\.css['"];?/g, '// CSS-Import wurde entfernt');
        return {
          code: newCode,
          map: null
        };
      }
      return null;
    }
  };
}

// In Plugins-Array einfügen
export default defineConfig({
  plugins: [
    vue(),
    cssHandlingPlugin(), // Plugin für korrektes CSS-Handling
    // ...andere Plugins
  ],
  // ...weitere Konfiguration
});
```

### 2. CSS-Konfiguration

Im CSS-Abschnitt der Vite-Konfiguration wurden Optionen angepasst, um CSS nicht als Module zu behandeln:

```javascript
css: {
  // Deaktiviere CSS-Module für globale Styles
  modules: false,
  // Keine CSS-Extraktion im Entwicklungsmodus
  devSourcemap: true,
  preprocessorOptions: {
    css: {
      // Keine Präprozessor-Optionen für reines CSS
    }
  }
}
```

### 3. Static Asset Handling

Für statische Assets wurde eine verbesserte Middleware implementiert:

```javascript
function staticAssetsPlugin() {
  return {
    name: 'static-assets-fix',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Verbesserte Pfadbehandlung
        let relativePath = req.url;
        
        // Entferne bekannte Präfixe
        if (relativePath.startsWith('/static/')) {
          relativePath = relativePath.replace('/static/', '/');
        } else if (relativePath.startsWith('/frontend/')) {
          relativePath = relativePath.replace('/frontend/', '/');
        }
        
        // Korrekter Content-Type basierend auf Dateiendung
        let contentType = 'application/octet-stream';
        const ext = relativePath.split('.').pop().toLowerCase();
        if (ext === 'css') contentType = 'text/css';
        else if (ext === 'js') contentType = 'application/javascript';
        // ... weitere MIME-Typen

        // Setze korrekten Content-Type
        if (filePath && fs.existsSync(filePath)) {
          res.writeHead(200, { 
            'Content-Type': contentType,
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
          });
          
          try {
            // Stream-Erstellung mit Fehlerbehandlung
            // ...
          } catch (err) {
            // Fehlerbehandlung
          }
        }
      });
    },
  };
}
```

### 4. Symlink-Auflösung

Für die korrekte Handhabung von Symlinks wurde eine Hilfsfunktion implementiert:

```javascript
function resolveSymlinks(path) {
  try {
    // Prüfe, ob der Pfad existiert
    if (\!fs.existsSync(path)) {
      return path;
    }

    // Prüfe, ob es ein Symlink ist
    const stats = fs.lstatSync(path);
    if (\!stats.isSymbolicLink()) {
      return path;
    }

    // Löse den Symlink auf
    const target = fs.readlinkSync(path);
    const resolvedPath = resolve(dirname(path), target);
    
    // Rekursiv auflösen (falls der Symlink auf einen anderen Symlink zeigt)
    return resolveSymlinks(resolvedPath);
  } catch (err) {
    console.error(`Fehler beim Auflösen des Symlinks ${path}:`, err);
    return path;
  }
}
```

## Fehlerdiagnose und -behebung

Wenn MIME-Typ-Fehler auftreten, prüfen Sie folgende Bereiche:

### 1. Browser-Konsole 

Prüfen Sie die Fehlermeldungen in der Browser-Konsole. Typische MIME-Typ-Fehler sehen so aus:

```
Failed to load module script: Expected a JavaScript module script but the server responded with a MIME type of "text/css".
```

oder

```
EISDIR: illegal operation on a directory, read
```

### 2. Netzwerk-Tab

Im Network-Tab des Browsers können Sie sehen, mit welchem Content-Type Dateien geladen werden. CSS-Dateien sollten mit `text/css` und JS-Dateien mit `application/javascript` geladen werden.

### 3. Server-Logs

Erhöhen Sie das Debug-Level für detailliertere Logs:

```python
# In server.py
logger.setLevel(logging.DEBUG)
```

### 4. Häufige Lösungen

- **CSS-Import-Fehler**: Ersetzen Sie CSS-Imports in JS durch HTML `<link>`-Tags
- **EISDIR-Fehler**: Überprüfen Sie Symlinks und Verzeichnisstrukturen
- **Falsche MIME-Typen**: Stellen Sie sicher, dass der Server korrekte Content-Type-Header sendet
- **Caching-Probleme**: Nutzen Sie Cache-Busting mit Versionsnummern (`?v=20250508`)

## Fehlerbehebung mit dem Restart-Skript

Das bereitgestellte `restart-dev-server.sh`-Skript kann verwendet werden, um die Entwicklungsserver neuzustarten und gängige Konfigurationsprobleme zu identifizieren:

```bash
chmod +x restart-dev-server.sh
./restart-dev-server.sh
```

Das Skript überprüft:
- Korrekte MIME-Typ-Konfiguration in `server.py`
- CSS-Handling-Plugin in `vite.config.js`
- Direkte Einbindung von CSS-Dateien in `index.html`

## Fazit

Die korrekte Konfiguration von MIME-Typen und die Trennung von CSS und JavaScript sind entscheidend für eine reibungslose Funktion des nscale DMS Assistenten im Entwicklungsmodus. Durch die implementierten Lösungen werden die häufigsten Fehlerquellen vermieden und eine robuste Ressourcenbereitstellung gewährleistet.
EOL < /dev/null
