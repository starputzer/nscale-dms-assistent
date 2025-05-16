# Projektstruktur-Optimierung

## Übersicht

Diese Dokumentation beschreibt die Optimierung der Projektstruktur des nscale DMS Assistent, insbesondere im Hinblick auf den Clean-Up für die Vue 3 SFC-Architektur. Ziel war die Identifikation und Bereinigung von redundanten Dateien, die Findung des optimalen Einstiegspunkts und die korrekte Konfiguration des Build-Systems.

## Durchgeführte Änderungen

### 1. Einstiegspunkt und Symlinks

- Der Symlink `/opt/nscale-assist/app/index.html` wurde auf `/opt/nscale-assist/app/public/index.html` umgeleitet
- `/opt/nscale-assist/app/public/index.html` wurde als Haupt-Einstiegspunkt für die Vue 3 SFC-Anwendung identifiziert

### 2. Vite-Konfiguration

- Die Vite-Konfiguration in `vite.config.js` wurde angepasst:
  ```javascript
  build: {
    outDir: 'api/frontend',  // Ausgabe in dieses Verzeichnis
    sourcemap: process.env.NODE_ENV !== 'production',
    chunkSizeWarningLimit: 1000,
    emptyOutDir: true,
    assetsDir: 'assets',     // Unterpfad für Assets
    // ...
  }
  ```

### 3. Asset-Pfade

- Die Asset-Pfade in `public/index.html` wurden auf die korrekte Struktur angepasst:
  ```html
  <link rel="stylesheet" href="/api/frontend/assets/styles/base.css">
  <link rel="icon" href="/api/frontend/assets/images/senmvku-logo.png" type="image/png">
  <script type="module" src="/api/frontend/assets/index-[hash].js"></script>
  ```

## Projektstruktur

Die aktuelle Struktur besteht aus folgenden Komponenten:

```
/opt/nscale-assist/app/
├── public/                     # Öffentliche Dateien (HTML-Einstiegspunkt)
│   ├── index.html              # Haupt-HTML-Einstiegspunkt
│   └── ...                     # Weitere statische Dateien
│
├── api/frontend/               # Build-Ausgabeverzeichnis (von Vite generiert)
│   ├── assets/                 # Kompilierte/gebündelte Assets
│   │   ├── index-[hash].js     # Haupt-JavaScript-Bundle
│   │   ├── index-[hash].css    # Haupt-CSS
│   │   ├── vendor-[hash].js    # Vendor-Bundle
│   │   └── ...                 # Weitere Assets
│   └── ...
│
├── src/                        # Vue 3 SFC-Quellcode
│   ├── main.ts                 # Haupteinstiegspunkt für TypeScript/Vue
│   ├── App.vue                 # Hauptkomponente
│   ├── components/             # Wiederverwendbare Komponenten
│   ├── views/                  # Seitenansichten
│   ├── stores/                 # Pinia Stores
│   ├── composables/            # Wiederverwendbare Logik
│   ├── utils/                  # Hilfsfunktionen
│   └── ...                     # Weitere Verzeichnisse
│
└── vite.config.js              # Vite-Buildkonfiguration
```

## Einstiegspunkte

1. **HTML-Einstiegspunkt**: `/opt/nscale-assist/app/public/index.html`
   - Enthält den App-Mount-Point: `<div id="app"><!-- Vue-App wird hier gemountet --></div>`
   - Lädt das Haupt-JavaScript-Bundle: `<script type="module" src="/api/frontend/assets/index-[hash].js"></script>`

2. **JavaScript-Einstiegspunkt**: `/opt/nscale-assist/app/src/main.ts`
   - Initialisiert die Vue 3-Anwendung
   - Integriert Router, Pinia und weitere Plugins
   - Mountet die App am DOM-Element mit ID "app"

## Build-Prozess

1. **Entwicklung**:
   - `npm run dev` startet den Vite-Entwicklungsserver
   - Assets werden direkt aus dem Quellcode geladen

2. **Produktion**:
   - `npm run build` erstellt das Produktionsbuild
   - Vite kompiliert, bündelt und minimiert alle Assets
   - Ausgabe erfolgt im Verzeichnis `api/frontend` mit dem Unterpfad `assets`
   - Content-Hashing wird für Cache-Busting verwendet

## Wichtige Hinweise

1. **Asset-Pfade**: 
   - Alle Asset-Pfade im HTML müssen vollständig sein (z.B. `/api/frontend/assets/...`)
   - Content-Hashes ändern sich bei jedem Build, daher muss der aktualisierte Pfad verwendet werden

2. **Symlink-Verwaltung**:
   - Der Symlink `/opt/nscale-assist/app/index.html` zeigt auf `public/index.html`
   - Dies stellt sicher, dass der Server die korrekten Einstiegspunkte findet

3. **Vite-Konfiguration**:
   - Die Konfiguration in `vite.config.js` definiert das Build-Verhalten
   - Änderungen an der Ausgabeverzeichnisstruktur erfordern entsprechende Anpassungen der Asset-Pfade

## Nächste Schritte

1. **Clean-Up von redundanten Dateien**:
   - Identifizierung und Entfernung nicht mehr benötigter Legacy-Dateien
   - Siehe `CLEANUP_LISTE.md` für Details

2. **Optimierung der Build-Konfiguration**:
   - Feinabstimmung der Vite-Konfiguration für bessere Performance
   - Integration von automatischen Asset-Pfad-Updates

3. **Vollständiger Test**:
   - Umfassende Tests des optimierten Builds
   - Siehe `TEST_ANLEITUNG.md` für Testverfahren

## Fazit

Die Optimierung der Projektstruktur hat einen klaren Einstiegspunkt für die Vue 3 SFC-Anwendung geschaffen und die korrekte Konfiguration des Build-Systems sichergestellt. Die Asset-Pfade wurden an die tatsächliche Build-Struktur angepasst, was zu einer konsistenten und wartbaren Projektstruktur führt.

Diese Änderungen bilden die Grundlage für die weitere Optimierung und Bereinigung der Codebasis im Rahmen der Vue 3-Migration.