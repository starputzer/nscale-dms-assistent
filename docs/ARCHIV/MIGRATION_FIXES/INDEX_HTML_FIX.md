# Fehlerbehebung: Vite Build-Prozess und index.html

Dieses Dokument beschreibt die Fehlerbehebung für die Probleme mit der falsch generierten index.html-Datei bei der Vue 3-Migration.

## Problem

Nach dem Build-Prozess mit Vite enthält die generierte `index.html`-Datei in `/opt/nscale-assist/app/api/frontend/` einen Verweis auf den Quellcode anstatt auf die gebauten Assets:

```html
<script type="module" src="/src/main.ts"></script>
```

Anstatt korrekt auf die Bundle-Datei zu verweisen:

```html
<script type="module" src="./assets/index-BJ8w4JZ2.js"></script>
```

## Ursachen

1. **Pfadprobleme**: Die Referenzen in den HTML-Templates verwenden absolute Pfade (`/src/main.ts`) statt relativer Pfade (`./src/main.ts`).

2. **Vite-Konfiguration**: Die Vite-Konfiguration war nicht optimal eingerichtet, insbesondere fehlten einige wichtige Parameter wie `emptyOutDir` und `assetsDir`.

3. **Migration-Prozess**: Während der Vue 3-Migration wurden verschiedene Template-Versionen erstellt, aber nicht alle wurden richtig angepasst.

## Durchgeführte Fixes

### 1. Korrektur der gebauten index.html

Die gebaute `index.html` wurde direkt korrigiert:

```bash
# Änderung in /opt/nscale-assist/app/api/frontend/index.html
- <script type="module" src="/src/main.ts"></script>
+ <script type="module" src="./assets/index-BJ8w4JZ2.js"></script>
```

### 2. Korrektur der HTML-Templates

Die Template-Dateien wurden korrigiert, damit zukünftige Builds korrekt generiert werden:

```bash
# Änderung in /opt/nscale-assist/app/public/index.html und index-new.html
- <script type="module" src="/src/main.ts"></script>
+ <script type="module" src="./src/main.ts"></script>
```

Alle Asset-Referenzen wurden ebenfalls von absoluten auf relative Pfade umgestellt:

```bash
- <link rel="stylesheet" href="/assets/styles/base.css">
+ <link rel="stylesheet" href="./assets/styles/base.css">
```

### 3. Optimierung der Vite-Konfiguration

Die Vite-Konfiguration wurde optimiert:

```javascript
build: {
  outDir: 'api/frontend',
  sourcemap: process.env.NODE_ENV !== 'production',
  chunkSizeWarningLimit: 1000,
  emptyOutDir: true,  // Hinzugefügt: Leert das Ausgabeverzeichnis vollständig
  assetsDir: 'assets', // Hinzugefügt: Legt den Assets-Unterordner fest
  rollupOptions: {
    output: {
      manualChunks: {
        'vendor': ['vue', 'vue-router', 'pinia'],
        'bridge': ['./src/bridge/index.ts'],
        'ui': ['./src/components/ui']
      }
    }
  }
}
```

## Testen der Lösung

Nach dem Durchführen dieser Änderungen sollte der nächste Build-Prozess eine korrekte index.html mit den richtigen Asset-Referenzen erzeugen.

Um das zu testen:

```bash
npm run build
```

## Zusätzliche Hinweise

1. Bei Pfadproblemen in HTML-Templates sollten generell relative Pfade (`./`) statt absoluter Pfade (`/`) verwendet werden, da Vite diese korrekter verarbeiten kann.

2. Die Verwendung von `emptyOutDir: true` stellt sicher, dass alte Dateien nicht im Ausgabeverzeichnis verbleiben.

3. Die Einstellung `assetsDir: 'assets'` definiert den Unterordner für alle Assets, was zu einer klareren Struktur im Build-Verzeichnis führt.

## Verwandte Dokumente

- `/opt/nscale-assist/app/FINALE_MIGRATION_ANLEITUNG.md` - Enthält weitere Informationen zur Vue 3-Migration
- `/opt/nscale-assist/app/docs/00_KONSOLIDIERTE_DOKUMENTATION/01_MIGRATION/03_FINALE_VUE3_MIGRATION.md` - Enthält Details zur finalen Vue 3-Migration