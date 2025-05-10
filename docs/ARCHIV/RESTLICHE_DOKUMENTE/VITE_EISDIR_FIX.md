# Behebung des EISDIR-Fehlers in Vite

**Datum:** 08.05.2025

## Problembeschreibung

Beim Starten des Vite-Entwicklungsservers für das nscale-assist-Projekt trat folgender Fehler auf:

```
VITE v4.5.14  ready in 166 ms
➜  Local:   http://localhost:3000/
➜  Network: use --host to expose
➜  press h to show help
node:events:495
throw er; // Unhandled 'error' event
^
Error: EISDIR: illegal operation on a directory, read
Emitted 'error' event on ReadStream instance at:
at emitErrorNT (node/streams/destroy:151:8)
at emitErrorCloseNT (node/streams/destroy:116:3)
at process.processTicksAndRejections (node/process/task_queues:82:21) {
errno: -21,
code: 'EISDIR',
syscall: 'read'
}
```

Der EISDIR-Fehler tritt auf, wenn versucht wird, eine Operation an einem Verzeichnis durchzuführen, die nur für Dateien vorgesehen ist - in diesem Fall der Versuch, einen ReadStream auf einem Verzeichnis zu erstellen.

## Ursachenanalyse

Nach eingehender Untersuchung wurden folgende Probleme identifiziert:

1. **Symlink-Verarbeitung**: Die Frontend-Struktur verwendet Symlinks unter `/frontend/static/` (css, js, images), die auf tatsächliche Verzeichnisse verweisen. Vite versuchte, diese Symlinks als reguläre Dateien zu behandeln.

2. **Rollup-Konfiguration**: Die `rollupOptions.input`-Konfiguration enthielt Pfade, die nicht in allen Umgebungen existieren, was zu fehlerhaften Dateisystemzugriffen führte.

3. **Fehlende Verzeichnisprüfung**: Im Middleware-Code wurde nicht ausreichend geprüft, ob ein Pfad auf ein Verzeichnis oder eine Datei verweist, was zu Versuchen führte, Verzeichnisse als Dateien zu lesen.

4. **Unzureichende Fehlerbehandlung**: Die Fehlerbehandlung bei Dateisystemzugriffen war minimal, was dazu führte, dass Probleme beim Lesen von Dateien unbehandelt blieben.

## Implementierte Lösungen

Folgende Änderungen wurden vorgenommen, um den Fehler zu beheben:

### 1. Symlink-Auflösung

Ein neuer `resolveSymlinks`-Helper wurde implementiert, der Symlinks rekursiv bis zur tatsächlichen Datei auflöst:

```javascript
function resolveSymlinks(path) {
  try {
    if (!fs.existsSync(path)) {
      return path;
    }

    const stats = fs.lstatSync(path);
    if (!stats.isSymbolicLink()) {
      return path;
    }

    const target = fs.readlinkSync(path);
    const resolvedPath = resolve(dirname(path), target);
    
    console.log(`Symlink aufgelöst: ${path} -> ${resolvedPath}`);
    
    return resolveSymlinks(resolvedPath);
  } catch (err) {
    console.error(`Fehler beim Auflösen des Symlinks ${path}:`, err);
    return path;
  }
}
```

### 2. Robuste rollupOptions.input-Konfiguration

Die `rollupOptions.input`-Konfiguration wurde so angepasst, dass sie Dateien überprüft, bevor sie als Eingangspunkte definiert werden:

```javascript
rollupOptions: {
  input: {
    // Prüfe, ob die Pfade existieren, bevor sie als Input definiert werden
    main: fs.existsSync(resolve(frontendDir, 'main.js')) ? resolve(frontendDir, 'main.js') : null,
    admin: fs.existsSync(resolve(frontendDir, 'js/admin.js')) ? resolve(frontendDir, 'js/admin.js') : null,
    // ... weitere Eingangspunkte
  },
  // Entferne null-Werte aus dem input-Objekt
  get input() {
    const input = this._input;
    Object.keys(input).forEach(key => input[key] === null && delete input[key]);
    return input;
  },
  // ... weitere Optionen
}
```

### 3. Verbesserte Verzeichnisprüfung im Middleware

Die Middleware wurde um mehrere Prüfungen erweitert, die sicherstellen, dass nur tatsächliche Dateien per ReadStream gesendet werden:

```javascript
// Löse Symlinks auf, bevor wir mit der Datei arbeiten
if (filePath && fs.existsSync(filePath)) {
  try {
    filePath = resolveSymlinks(filePath);
  } catch (err) {
    console.error('Fehler beim Auflösen des Symlinks:', err);
  }
}

// Überprüfe nochmals, ob der Pfad ein Verzeichnis ist
const finalStats = fs.statSync(filePath);
if (finalStats.isDirectory()) {
  console.warn(`Verzeichnis statt Datei angefordert: ${filePath}`);
  next();
  return;
}
```

### 4. Robuste Fehlerbehandlung für ReadStreams

Die Fehlerbehandlung für ReadStreams wurde verbessert, um unbehandelte Fehler zu vermeiden:

```javascript
// Sichere Erstellung des ReadStreams
const readStream = fs.createReadStream(filePath);

// Fehlerbehandlung für den Stream
readStream.on('error', (streamErr) => {
  console.error(`Stream-Fehler für ${filePath}:`, streamErr);
  if (!res.headersSent) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end(`Fehler beim Lesen der Datei: ${streamErr.message}`);
  }
});

// Pipe zum Response
readStream.pipe(res);
```

### 5. Verbesserte Debugging-Informationen

Zusätzliche Logging-Ausgaben wurden hinzugefügt, um die Fehlerdiagnose zu vereinfachen:

```javascript
// Logging für den Entwicklungsprozess
console.log('Vite-Konfiguration wird geladen');
console.log(`Projekt-Verzeichnis: ${projectRoot}`);
console.log(`Frontend-Verzeichnis: ${frontendDir}`);
console.log(`Dist-Verzeichnis: ${distDir}`);

// Wichtige Dateien auf Existenz prüfen
const mainJsPath = resolve(frontendDir, 'main.js');
const jsMainJsPath = resolve(frontendDir, 'js/main.js');
console.log(`main.js existiert: ${fs.existsSync(mainJsPath)}`);
console.log(`js/main.js existiert: ${fs.existsSync(jsMainJsPath)}`);
```

## Testen der Lösung

Nach Implementierung dieser Änderungen startet der Vite-Entwicklungsserver ohne EISDIR-Fehler. Die Webseite lädt korrekt und alle Assets (JS, CSS, Bilder) werden mit den richtigen MIME-Types ausgeliefert.

## Vorteile der Verbesserungen

1. **Robustheit**: Die Anwendung ist jetzt robuster gegenüber unterschiedlichen Dateisystemstrukturen.
2. **Bessere Fehlerdiagnose**: Die verbesserte Protokollierung erleichtert das Debugging von Problemen.
3. **Zuverlässigkeit**: Die korrekte Behandlung von Symlinks und Verzeichnissen verhindert unerwartete Fehler.
4. **Flexibilität**: Der Code kann besser mit fehlenden Dateien umgehen, indem er alternative Pfade und Fallbacks unterstützt.

## Weitere Optimierungsmöglichkeiten

In zukünftigen Updates könnten folgende Aspekte weiter verbessert werden:

1. **Cache-Optimierung**: Implementierung von Caching für aufgelöste Symlinks, um wiederholte Dateisystemzugriffe zu reduzieren.
2. **Konfigurierbarkeit**: Auslagern der Pfadkonfiguration in eine separate Konfigurationsdatei.
3. **Logging-Steuerung**: Implementierung einer Konfigurationsoption zum Aktivieren/Deaktivieren der detaillierten Protokollierung.

Diese Verbesserungen würden die Leistung und Wartbarkeit des Entwicklungsservers weiter steigern.