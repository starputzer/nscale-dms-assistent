# Asset-Pfad-Konfiguration

## Übersicht

Diese Dokumentation beschreibt die korrekte Konfiguration der Asset-Pfade für die Vue 3 SFC-Anwendung innerhalb des nscale DMS Assistent.

## Build-Konfiguration

Die Vite-Konfiguration ist wie folgt eingerichtet:

```javascript
// vite.config.js
export default defineConfig({
  // ...
  build: {
    outDir: 'api/frontend',     // Ausgabe in dieses Verzeichnis
    sourcemap: process.env.NODE_ENV !== 'production',
    chunkSizeWarningLimit: 1000,
    emptyOutDir: true,
    assetsDir: 'assets',        // Unterpfad für Assets innerhalb des outDir
    // ...
  },
  // ...
})
```

## Ausgabepfad-Struktur

Nach dem Build werden die Dateien in folgendem Pfad abgelegt:

```
/opt/nscale-assist/app/api/frontend/
├── assets/
│   ├── index-[hash].js          # Haupt-JavaScript-Bundle
│   ├── index-[hash].css         # Haupt-CSS
│   ├── vendor-[hash].js         # Vendor-Bundle
│   ├── bridge-[hash].js         # Bridge-Modul
│   ├── ui-[hash].css            # UI-Komponenten-Styles
│   └── ...
└── index.html                   # Generiertes HTML (wenn nicht überschrieben)
```

## Asset-Referenzen im HTML

Bei der Referenzierung von Assets im HTML müssen die vollständigen Pfade verwendet werden:

```html
<!-- Korrekte Pfadangaben für Assets -->
<link rel="stylesheet" href="/api/frontend/assets/index-DNp-QYKN.css">
<link rel="icon" href="/api/frontend/assets/senmvku-logo-BMwi0ifC.png" type="image/png">
<script type="module" src="/api/frontend/assets/index-wBnq1r8D.js"></script>
```

Diese Pfade müssen nach jedem neuen Build aktualisiert werden, da die Hashes sich ändern.

## Symlink-Konfiguration

Der Symlink `/opt/nscale-assist/app/index.html` zeigt auf `/opt/nscale-assist/app/public/index.html`, welches das Haupt-Frontend-HTML mit korrekten Asset-Referenzen enthält.

## Wichtige Hinweise

1. **Asset-Hashing**: Vite erzeugt automatisch Content-Hashes für Assets. Nach jedem Build aktualisieren sich die Dateinamen (z.B. `index-BJ8w4JZ2.js` → `index-DGVlmrpP.js`).

2. **Automatische Index-Generierung**: Vite generiert normalerweise auch eine `index.html`-Datei im `outDir`. In unserem Fall verwenden wir jedoch eine angepasste HTML-Datei in `/public/index.html`.

3. **Entwicklungsumgebung**: Im Dev-Modus (`npm run dev`) werden die Assets über den Vite-Entwicklungsserver bereitgestellt, nicht aus dem `api/frontend`-Verzeichnis.

4. **Produktionsumgebung**: Im Produktionsmodus werden die Assets aus dem `api/frontend`-Verzeichnis bereitgestellt.

## Best Practices

1. **Build erneuern**: Nach Änderungen an Asset-Pfaden oder der Vite-Konfiguration sollte ein neuer Build durchgeführt werden.

2. **Entwicklungsumgebung testen**: Sowohl Entwicklungs- als auch Produktionsbuilds sollten getestet werden, um sicherzustellen, dass alle Asset-Pfade korrekt sind.

3. **Caching beachten**: Bei der Bereitstellung von Updates in der Produktionsumgebung muss beachtet werden, dass Browser gecachte Versionen verwenden könnten.

4. **Cache-Busting**: Content-Hashing wird automatisch von Vite für Cache-Busting verwendet, sodass Updates korrekt angewendet werden.

## Fehlerbehebung

Bei Problemen mit Asset-Pfaden:

1. Überprüfen Sie die Netzwerkanfragen im Browser-DevTools auf 404-Fehler.
2. Stellen Sie sicher, dass die Pfade in `index.html` mit der Vite-Ausgabestruktur übereinstimmen.
3. Prüfen Sie, ob die Dateien tatsächlich an den erwarteten Orten existieren.
4. Verwenden Sie relative Pfade nur, wenn absolut notwendig, und bevorzugen Sie absolute Pfade.