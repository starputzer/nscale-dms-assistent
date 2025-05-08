# Frontend-Ladeprobleme: Diagnose und Lösungen

**Letzte Aktualisierung:** 08.05.2025

## Übersicht

Dieses Dokument beschreibt häufige Ladeprobleme im Frontend der nscale DMS Assistent-Anwendung, deren Diagnose und Behebung, mit besonderem Fokus auf die Entwicklungsumgebung mit Vite und FastAPI.

## Häufige Ladeprobleme

### 1. MIME-Type-Fehler

#### Symptome
- CSS-Dateien werden als JavaScript-Module geladen, was zu Fehlermeldungen führt
- Konsole zeigt Fehler wie: `Refused to execute ... as script because "text/css" is not a supported script MIME type`

#### Ursachen
- Falsche `type`-Attribute in Script-Tags
- Fehlerhafte Content-Type-Header vom Server
- Dynamisches Laden von CSS-Dateien mit JavaScript-Funktionen 

#### Lösung

**Frontend (HTML):**
```html
<!-- Richtig: CSS direkt einbinden -->
<link rel="stylesheet" href="/css/main.css">
<link rel="stylesheet" href="/css/themes.css">

<!-- Falsch: CSS mit type="module" laden -->
<script type="module">
  import '/css/main.css'; // Dies verursacht MIME-Type-Fehler
</script>
```

**Backend (Python/FastAPI):**
```python
# Separate StaticFiles-Mounts für verschiedene Ressourcentypen
app.mount("/static", StaticFiles(directory="frontend"), name="static")
app.mount("/css", StaticFiles(directory="frontend/css"), name="css")
app.mount("/js", StaticFiles(directory="frontend/js"), name="js")
app.mount("/images", StaticFiles(directory="frontend/images"), name="images")
```

**Middleware (Vite):**
```javascript
// Korrekte MIME-Type-Zuweisung in der Vite-Middleware
let contentType = 'application/octet-stream';
if (ext === 'css') contentType = 'text/css';
else if (ext === 'js') contentType = 'application/javascript';
else if (ext === 'png') contentType = 'image/png';
// ...

res.writeHead(200, { 'Content-Type': contentType });
```

### 2. 404-Fehler bei Ressourcen

#### Symptome
- Ressourcen wie JavaScript- oder CSS-Dateien werden nicht gefunden
- Konsole zeigt 404-Fehler für `/static/js/main.js`, `/js/main.js` usw.

#### Ursachen
- Inkonsistente Pfadpräfixe (`/static/`, `/frontend/`, direkte Pfade)
- Fehlende Server-Routing-Regeln
- Falsche Verzeichnisstrukturen

#### Lösung

**Server-Endpunkte für alternative Pfade:**
```python
@app.get("/")
async def root():
    return FileResponse("frontend/index.html")
    
@app.get("/frontend/")
async def frontend():
    return FileResponse("frontend/index.html")
```

**Verbesserte Middleware für mehrere Pfadpräfixe:**
```javascript
// Middleware für /static/, /frontend/ und direkte Pfade
server.middlewares.use((req, res, next) => {
  // Behandle /frontend/ Endpunkt direkt
  if (relativePath === '/frontend/' || relativePath === '/frontend') {
    const indexPath = resolve(frontendDir, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      fs.createReadStream(indexPath).pipe(res);
      return;
    }
  }
  
  // Entferne bekannte Präfixe
  if (relativePath.startsWith('/static/')) {
    relativePath = relativePath.replace('/static/', '/');
  } else if (relativePath.startsWith('/frontend/')) {
    relativePath = relativePath.replace('/frontend/', '/');
  }
  
  // Weitere Logik...
});
```

### 3. Fehler bei dynamischen Imports

#### Symptome
- JavaScript-Module werden nicht korrekt geladen
- Fehler wie `Failed to resolve module specifier`

#### Lösung

**Verwendung von relativen Pfaden:**
```javascript
// main.js - Vite-Einstiegspunkt
import './app.js';           // Relativer Pfad statt absolut
import '../css/main.css';    // Relativer Pfad zum CSS
```

**Korrektes Fallback-Handling:**
```javascript
// Haupt-JS-Datei direkt einbinden
<script type="module" src="/js/main.js"></script>

// Fallback für ältere Browser
<script nomodule>
    console.warn('Browser unterstützt keine ES-Module. Verwende Fallback.');
    // Lade Legacy-Script synchron
    const fallbackScript = document.createElement('script');
    fallbackScript.src = '/js/app.js';
    document.head.appendChild(fallbackScript);
</script>
```

## Diagnosehilfen

### Browser-Entwicklertools

1. **Netzwerkanalyse:**
   - Öffnen Sie die Entwicklertools (F12) und wechseln Sie zum "Netzwerk"-Tab
   - Filtern Sie nach bestimmten Ressourcentypen (JS, CSS, usw.)
   - Prüfen Sie HTTP-Status, MIME-Type und Ladezeiten

2. **Konsolenanalyse:**
   - Überwachen Sie die Konsole auf spezifische Fehler
   - Achten Sie auf Muster bei mehreren Fehlern (gleiche Ressourcen, ähnliche Fehlertypen)

### Server-Logs

Bei FastAPI/Uvicorn-Server:
- Achten Sie auf 404-Fehler im Serverlog
- Überprüfen Sie die Pfade, die der Client anfragt

## Prävention

Um zukünftige Ladeprobleme zu vermeiden:

1. **Vereinfachtes Ressourcenladen:**
   - Vermeiden Sie komplexe dynamische Laderoutinen
   - Verwenden Sie direkte HTML-Tags für CSS und JavaScript

2. **Konsistente Pfadstruktur:**
   - Einheitliche Präfixe für Ressourcen (/js/, /css/, /images/)
   - Klare Trennung zwischen statischen und dynamischen Ressourcen

3. **Robuste Fehlerbehandlung:**
   - Implementieren Sie einfache, aber effektive Fallback-Mechanismen
   - Vermeiden Sie verschachtelte Fehlerbehandlungslogik

## Verwandte Dokumente

- [FRONTEND_FIXES.md](/docs/FRONTEND_FIXES.md) - Kurzübersicht häufiger Frontend-Probleme
- [06_SYSTEME/11_FRONTEND_STRUKTUR_BEREINIGUNG.md](/docs/06_SYSTEME/11_FRONTEND_STRUKTUR_BEREINIGUNG.md) - Details zur Frontend-Struktur
- [02_ENTWICKLUNG/01_SETUP.md](/docs/02_ENTWICKLUNG/01_SETUP.md) - Einrichtung der Entwicklungsumgebung

---

*Dieses Dokument basiert auf der Analyse und Behebung eines Frontend-Ladeproblems am 08.05.2025.*