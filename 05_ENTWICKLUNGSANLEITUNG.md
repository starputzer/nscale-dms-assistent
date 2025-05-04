# Entwicklungsanleitung

Diese Anleitung beschreibt die Entwicklungsumgebung, Build-Prozesse und Best Practices für die Arbeit am nscale Assist App Projekt.

## Projektstruktur

```
/opt/nscale-assist/app/
├── api/                # Server-API (Python)
├── doc_converter/      # Dokumentenkonverter-Backend
├── frontend/           # Klassisches Frontend
│   ├── css/            # CSS-Dateien
│   ├── js/             # JavaScript-Dateien
│   ├── static/         # Statische Ressourcen
│   └── index.html      # Hauptseite
├── modules/            # Backend-Module
└── nscale-vue/         # Vue.js-Frontend
    ├── src/
    │   ├── components/ # Vue-Komponenten
    │   ├── views/      # Vue-Ansichten
    │   ├── stores/     # Pinia-Stores
    │   └── standalone/ # Standalone-Komponenten
    └── vite.config.js  # Vite-Konfiguration
```

## Entwicklungsumgebung einrichten

### 1. Backend-Setup

```bash
# Python-Abhängigkeiten installieren
pip install -r requirements.txt
pip install -r requirements-converter.txt

# Server starten
cd api/
python server.py
```

### 2. Frontend-Setup

```bash
# Vue.js-Abhängigkeiten installieren
cd nscale-vue/
npm install

# Entwicklungsserver starten
npm run dev
```

## Build-Prozesse

### Vue.js-Komponenten bauen

```bash
# Entwicklungsbuild mit Hot-Reload
cd nscale-vue/
npm run dev

# Produktionsbuild
npm run build
```

### Standalone-Komponenten bereitstellen

Nach dem Build müssen die Standalone-Komponenten in die entsprechenden Verzeichnisse kopiert werden:

```bash
# Skript zum Aktualisieren der Vue-Komponenten ausführen
./update-vue-components.sh
```

Oder manuell:

```bash
# Standalone-Komponenten kopieren
cp nscale-vue/dist/assets/*.js frontend/static/vue/standalone/
cp nscale-vue/dist/assets/*.css frontend/static/css/vue/
```

## Feature-Toggle-System

Die Anwendung verwendet ein Feature-Toggle-System zur kontrollierten Aktivierung neuer Komponenten.

### Toggle-Einstellungen

```javascript
// Vue.js-Komponenten aktivieren
localStorage.setItem('feature_vueDocConverter', 'true');
localStorage.setItem('feature_vueAdmin', 'true');
localStorage.setItem('feature_vueSettings', 'true');
localStorage.setItem('feature_vueChat', 'false');

// Klassische UI erzwingen
localStorage.setItem('useNewUI', 'false');
```

### Toggle-Implementierung

Neue Komponenten sollten immer mit einem Feature-Toggle implementiert werden:

```javascript
// In JavaScript
if (localStorage.getItem('feature_vueComponent') === 'true') {
    // Vue.js-Komponente laden
} else {
    // Klassische Implementierung verwenden
}
```

```html
<!-- In HTML -->
<div class="component-container">
    <div id="vue-component" v-if="isFeatureEnabled('vueComponent')">
        <!-- Vue.js-Komponente -->
    </div>
    <div class="classic-component" v-else>
        <!-- Klassische Implementierung -->
    </div>
</div>
```

## Neue Komponenten erstellen

### Vue.js-Komponente

1. Erstelle eine neue Vue-Komponente in `nscale-vue/src/components/`:

```vue
<template>
  <div class="my-component">
    <!-- Komponenten-Markup -->
  </div>
</template>

<script setup>
// Komponenten-Logik
</script>

<style scoped>
/* Komponenten-Styles */
</style>
```

2. Registriere die Komponente in einer View oder als Standalone-Komponente:

```javascript
// src/standalone/my-component.js
import { createApp } from 'vue';
import MyComponent from '../components/MyComponent.vue';

document.addEventListener('DOMContentLoaded', () => {
  const mountPoint = document.getElementById('my-component-mount');
  if (mountPoint) {
    const app = createApp(MyComponent);
    app.mount(mountPoint);
  }
});
```

3. Erstelle eine NoModule-Version als Fallback:

```javascript
// src/standalone/my-component-nomodule.js
(function() {
  function initializeComponent() {
    const container = document.getElementById('my-component-mount');
    if (!container) return;
    
    // Einfache HTML/JS-Implementierung
    container.innerHTML = `
      <!-- Fallback-HTML -->
    `;
  }
  
  // DOM ready check
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeComponent);
  } else {
    initializeComponent();
  }
})();
```

## CSS-Best-Practices

1. Verwende scoped CSS in Vue-Komponenten:

```vue
<style scoped>
.component { /* Nur für diese Komponente gültig */ }
</style>
```

2. Stelle kritisches CSS inline bereit für Fallback-Szenarien:

```javascript
function addCriticalCSS() {
  const style = document.createElement('style');
  style.textContent = `
    .critical-component {
      display: block !important;
      visibility: visible !important;
    }
  `;
  document.head.appendChild(style);
}
```

## Fehlerbehandlung und Debugging

### Fehler protokollieren

```javascript
// Einfaches Logging
console.log('[Komponente] Nachricht');

// Erweiterte Protokollierung mit Zeitstempel
function logInfo(message) {
  const timestamp = new Date().toISOString().split('T')[1].replace('Z', '');
  console.log(`[${timestamp}] [Komponente] ${message}`);
}
```

### Fallback-Mechanismen implementieren

```javascript
// Primäre Methode versuchen, bei Fehler auf Fallback-Methode zurückgreifen
try {
  loadVueComponent();
} catch (error) {
  console.error('[Komponente] Fehler beim Laden der Vue-Komponente:', error);
  loadFallbackComponent();
}
```

### DOM-Sichtbarkeit sicherstellen

```javascript
function ensureVisibility(selector) {
  const element = document.querySelector(selector);
  if (element) {
    element.style.display = 'block';
    element.style.visibility = 'visible';
    element.style.opacity = '1';
  }
}
```

## Versionierung und Deployment

### Build für Produktion

```bash
# Vue.js-Build erstellen
cd nscale-vue/
npm run build

# Komponenten bereitstellen
./update-vue-components.sh

# Index-HTML aktualisieren
./patch-index-html.sh
```

### Ressourcen aktualisieren

Wenn neue CSS- oder JavaScript-Dateien hinzugefügt werden:

1. Datei an mehreren Pfaden bereitstellen:
```bash
cp frontend/js/my-component.js frontend/static/js/
```

2. Pfad-Tester aktualisieren:
```javascript
// In doc-converter-path-tester.js
const coreResources = {
  js: [
    // ...
    'js/my-component.js',
  ],
  // ...
};
```