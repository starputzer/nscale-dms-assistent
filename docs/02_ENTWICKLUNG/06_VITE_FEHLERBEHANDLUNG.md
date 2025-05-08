# Vite-Fehlerbehandlung

**Datum:** 08.05.2025

## Übersicht

Dieses Dokument beschreibt häufige Fehler bei der Verwendung des Vite-Entwicklungsservers im nscale-assist-Projekt und deren Behebung. Es dient als Referenz für Entwickler, die auf ähnliche Probleme stoßen.

## EISDIR-Fehler

### Symptome

```
Error: EISDIR: illegal operation on a directory, read
Emitted 'error' event on ReadStream instance at:
at emitErrorNT (node/streams/destroy:151:8)
```

Dieser Fehler tritt auf, wenn versucht wird, einen ReadStream auf einem Verzeichnis zu erstellen, was eine unzulässige Operation ist.

### Ursachen

1. **Symlink-Probleme**: Symlinks in `/frontend/static/` werden nicht korrekt aufgelöst
2. **Fehlende Verzeichnisprüfung**: Unzureichende Prüfung, ob ein Pfad ein Verzeichnis oder eine Datei ist
3. **Rollup-Konfigurationsprobleme**: Fehlerhafte Eingangspunkte in der Rollup-Konfiguration

### Lösung

Die Hauptlösung besteht aus mehreren Teilen:

1. **Implementierung einer Symlink-Auflösungsfunktion**:
   ```javascript
   function resolveSymlinks(path) {
     try {
       if (!fs.existsSync(path)) return path;
       const stats = fs.lstatSync(path);
       if (!stats.isSymbolicLink()) return path;
       
       const target = fs.readlinkSync(path);
       const resolvedPath = resolve(dirname(path), target);
       return resolveSymlinks(resolvedPath); // Rekursive Auflösung
     } catch (err) {
       console.error(`Fehler beim Auflösen des Symlinks ${path}:`, err);
       return path;
     }
   }
   ```

2. **Verbesserte Verzeichnisprüfung in der Middleware**:
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

3. **Robuste Eingangspunktkonfiguration**:
   ```javascript
   rollupOptions: {
     input: {
       // Prüfe, ob die Pfade existieren, bevor sie als Input definiert werden
       main: fs.existsSync(resolve(frontendDir, 'main.js')) ? 
             resolve(frontendDir, 'main.js') : null,
       // ... weitere Eingangspunkte
     },
     // Entferne null-Werte aus dem input-Objekt
     get input() {
       const input = this._input;
       Object.keys(input).forEach(key => 
         input[key] === null && delete input[key]);
       return input;
     },
     // ... weitere Optionen
   }
   ```

Die vollständige Implementierung wurde in der `vite.config.js` vorgenommen.

## Cannot find module './App.vue'

### Symptome

```
[vite] Error when evaluating entry point "src/main.js":
Error: Cannot find module './App.vue'
```

### Ursachen

1. **Falsche Pfadangaben**: Relative Imports in main.js zeigen auf nicht existierende Dateien
2. **Alias-Konfigurationsprobleme**: Fehlkonfigurierte Alias-Pfade in Vite

### Lösung

1. **Korrektur der Importpfade**:
   ```javascript
   // Falsch
   import App from './App.vue'
   
   // Korrekt (wenn App.vue im Vue-Unterverzeichnis liegt)
   import App from './vue/App.vue'
   ```

2. **Verbesserung der Alias-Konfiguration**:
   ```javascript
   resolve: {
     alias: {
       '@': fileURLToPath(new URL('./src', import.meta.url)),
       '@components': resolve(__dirname, 'frontend/vue/components'),
       // ... weitere Aliase
     }
   }
   ```

## Failed to resolve import

### Symptome

```
[vite] Failed to resolve import "vue" from "src/main.js"
```

### Ursachen

1. **Fehlende Abhängigkeiten**: Vue ist nicht korrekt installiert
2. **Falsche Konfiguration**: Vite kann die Vue-Installation nicht finden

### Lösung

1. **Überprüfung der Abhängigkeiten**:
   ```bash
   npm ls vue
   ```

2. **Explizite Pfadangabe in der Konfiguration**:
   ```javascript
   resolve: {
     alias: {
       'vue': resolve(projectRoot, 'node_modules/vue/dist/vue.esm-bundler.js'),
     }
   }
   ```

## Allgemeine Tipps zur Vite-Fehlerbehebung

### 1. Debugging-Informationen hinzufügen

Fügen Sie Debugging-Informationen zur Vite-Konfiguration hinzu:

```javascript
// Logging für den Entwicklungsprozess
console.log('Vite-Konfiguration wird geladen');
console.log(`Projekt-Verzeichnis: ${projectRoot}`);
console.log(`Frontend-Verzeichnis: ${frontendDir}`);

// Wichtige Dateien auf Existenz prüfen
const mainJsPath = resolve(frontendDir, 'main.js');
console.log(`main.js existiert: ${fs.existsSync(mainJsPath)}`);
```

### 2. Cache löschen

Bei hartnäckigen Problemen kann es helfen, den Vite-Cache zu löschen:

```bash
rm -rf node_modules/.vite
```

### 3. Plugins überprüfen

Überprüfen Sie die Plugins in `vite.config.js` auf Kompatibilitätsprobleme:

```javascript
plugins: [
  vue(),
  // Weitere Plugins hier...
],
```

### 4. Mit --debug starten

Verwenden Sie den Debug-Modus, um detailliertere Fehlerinformationen zu erhalten:

```bash
npx vite --debug
```

## Verwandte Dokumente

- [01_SETUP.md](./01_SETUP.md) - Einrichtung der Entwicklungsumgebung
- [05_REFERENZEN/07_FRONTEND_LADEPROBLEME.md](../05_REFERENZEN/07_FRONTEND_LADEPROBLEME.md) - Spezifische Probleme mit dem Laden von Frontend-Ressourcen

---

*Dieses Dokument wurde nach der Behebung eines EISDIR-Fehlers am 08.05.2025 erstellt und dient als Referenz für zukünftige ähnliche Probleme.*