# Optimierte Projektstruktur für nscale DMS Assistent

Dieses Dokument beschreibt die optimierte Projektstruktur des nscale DMS Assistenten nach der Konsolidierung auf eine klare Vue 3 SFC-Architektur.

## 1. Überblick der Projektstruktur

```
/opt/nscale-assist/app/
│
├── index.html         # Symlink auf public/index.html (Haupt-Einstiegspunkt)
│
├── public/            # Öffentliche Ressourcen und Build-Output
│   ├── index.html     # Haupteinstiegspunkt der Anwendung
│   ├── assets/        # Vite-generierte Assets (JS, CSS, Bilder)
│   └── images/        # Statische Bilder
│
├── src/               # Quellcode der Vue 3 SFC-Anwendung
│   ├── main.ts        # Haupt-Einstiegspunkt für JavaScript
│   ├── App.vue        # Root-Komponente
│   ├── assets/        # Quell-Assets (werden nach public/assets kompiliert)
│   ├── components/    # Vue 3 Komponenten
│   ├── composables/   # Vue 3 Composables
│   ├── views/         # Vue 3 Ansichten/Seiten
│   ├── stores/        # Pinia Stores
│   ├── types/         # TypeScript-Typdefinitionen
│   ├── utils/         # Hilfsfunktionen
│   ├── bridge/        # Bridge für Legacy-Code
│   └── router/        # Vue Router Konfiguration
│
├── api/               # API-Ressourcen
│   └── frontend/      # Build-Ausgabe für API-Server (optional)
│
├── vite.config.js     # Vite-Konfiguration
└── package.json       # Projekt-Abhängigkeiten und Skripte
```

## 2. Hauptkomponenten

### 2.1 Einstiegspunkte

Die Anwendung hat nun einen klaren, einheitlichen Einstiegspunkt:

- **HTML-Einstiegspunkt**: `/opt/nscale-assist/app/index.html` → `/opt/nscale-assist/app/public/index.html`
- **JavaScript-Einstiegspunkt**: `/opt/nscale-assist/app/src/main.ts`
- **Root-Komponente**: `/opt/nscale-assist/app/src/App.vue`

### 2.2 Vite-Konfiguration

Die Vite-Konfiguration wurde optimiert, um Assets direkt ins public-Verzeichnis zu generieren:

```javascript
// vite.config.js
export default defineConfig({
  // ...
  build: {
    outDir: 'public',
    // ...
  },
  // ...
});
```

### 2.3 Module und Struktur

Die Anwendung folgt einer modernen, modularen Struktur:

- **Komponenten**: Wiederverwendbare UI-Elemente in `/src/components/`
- **Composables**: Wiederverwendbare Logik mit der Composition API in `/src/composables/`
- **Stores**: Zentralisierte Zustandsverwaltung mit Pinia in `/src/stores/`
- **Ansichten**: Hauptseiten der Anwendung in `/src/views/`
- **Bridge**: Kompatibilitätsschicht für Legacy-Code in `/src/bridge/`

## 3. Funktionale Architektur

### 3.1 Vue 3 Composition API

Die Anwendung verwendet durchgehend die Vue 3 Composition API:

```typescript
// Beispiel-Struktur eines Composables
export function useChat() {
  const messages = ref([]);
  const isLoading = ref(false);
  
  function sendMessage(content) {
    // Implementierung
  }
  
  return {
    messages,
    isLoading,
    sendMessage
  };
}
```

### 3.2 Pinia Stores

Zentralisierte Zustandsverwaltung erfolgt über Pinia Stores:

```typescript
// Beispiel Store
export const useSessionsStore = defineStore('sessions', () => {
  const sessions = ref([]);
  const currentSessionId = ref(null);
  
  // Aktionen
  function fetchSessions() {
    // Implementierung
  }
  
  // Computed Properties
  const currentSession = computed(() => 
    sessions.value.find(s => s.id === currentSessionId.value)
  );
  
  return {
    sessions,
    currentSessionId,
    fetchSessions,
    currentSession
  };
});
```

### 3.3 Bridge-Mechanismus

Für die Kompatibilität mit Legacy-Code ist ein Bridge-Mechanismus implementiert:

```typescript
// Beispiel aus src/bridge/index.ts
export function initializeBridge(app) {
  // Globale Funktionen bereitstellen
  window.someGlobalFunction = () => {
    // Implementation that calls Vue 3 code
  };
  
  // Legacy-Events abfangen
  document.addEventListener('legacyEvent', (event) => {
    // Konvertieren in Vue 3-kompatibles Format
  });
}
```

## 4. Routing

Das Routing erfolgt über Vue Router:

```typescript
// Beispiel aus src/router/index.ts
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: () => import('../views/ChatView.vue'),
      name: 'home'
    },
    {
      path: '/admin',
      component: () => import('../views/AdminView.vue'),
      name: 'admin'
    },
    // ...weitere Routen
  ]
});
```

## 5. Feature-Flags und Konfiguration

Die Anwendung verwendet Feature-Flags für die graduelle Aktivierung von Funktionen:

- URL-Parameter für Feature-Toggles (z.B. `?useBridge=true`)
- Globale Konfiguration über `window.APP_CONFIG`

## 6. Optimierung und Performance

- Chunking für optimale Ladezeiten (vendor, bridge, ui)
- Lazy-Loading für Routen und Komponenten
- Tree-Shaking durch ES-Module

## 7. Entwicklung und Build

### 7.1 Entwicklung

```bash
# Development-Server starten
npm run dev
```

### 7.2 Build

```bash
# Produktions-Build erstellen
npm run build
```

Die generierten Assets werden in `/opt/nscale-assist/app/public/assets/` abgelegt.

## 8. Next Steps

Die Projektstruktur unterstützt nun eine klare, moderne Vue 3 SFC-Architektur. Folgende Schritte sind für die Zukunft empfohlen:

1. Schrittweise Entfernung der Bridge-Mechanismen, sobald nicht mehr benötigt
2. Strikte TypeScript-Typisierung für alle Komponenten und Funktionen
3. Aufbau einer Komponenten-Bibliothek mit Storybook
4. Erweiterung der Test-Abdeckung (Unit, Integration, E2E)
5. Performance-Optimierung durch detailliertes Bundle-Splitting