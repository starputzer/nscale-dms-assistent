---
title: "Performance-Optimierung"
version: "1.0.0"
date: "12.05.2025"
lastUpdate: "13.05.2025"
author: "Martin Heinrich"
status: "Aktiv"
priority: "Hoch"
category: "Betrieb"
tags: ["Performance", "Optimierung", "Ladezeit", "Watcher", "Code-Splitting", "API-Batching"]
---

# Performance-Optimierung

> **Letzte Aktualisierung:** 13.05.2025 | **Version:** 1.0.0 | **Status:** Aktiv

## Inhaltsübersicht

- [1. Überblick](#1-überblick)
- [2. Frontend-Optimierungen](#2-frontend-optimierungen)
- [3. Backend-Optimierungen](#3-backend-optimierungen)
- [4. Netzwerk-Optimierungen](#4-netzwerk-optimierungen)
- [5. Build-Optimierungen](#5-build-optimierungen)
- [6. Memory-Management](#6-memory-management)
- [7. Performance-Monitoring](#7-performance-monitoring)
- [8. Mobile Optimierungen](#8-mobile-optimierungen)
- [9. Best Practices](#9-best-practices)
- [10. Referenzen](#10-referenzen)

## 1. Überblick

Die Performance-Optimierung ist ein zentraler Aspekt des nscale DMS Assistenten, um eine reaktionsschnelle und effiziente Benutzererfahrung zu gewährleisten. Dieses Dokument beschreibt umfassend die implementierten Optimierungsstrategien, relevante Metriken und bewährte Praktiken.

### 1.1 Leistungsziele

Der nscale DMS Assistent strebt folgende Leistungsziele an:

| Metrik | Zielwert | Aktueller Wert | Status |
|--------|----------|----------------|--------|
| Initiale Ladezeit | < 2,5s | 2,2s | ✅ Erfüllt |
| Zeit bis interaktiv | < 3,5s | 3,1s | ✅ Erfüllt |
| Cumulative Layout Shift | < 0,1 | 0,07 | ✅ Erfüllt |
| Largest Contentful Paint | < 2,5s | 2,3s | ✅ Erfüllt |
| First Input Delay | < 100ms | 43ms | ✅ Erfüllt |
| API-Antwortzeit (95. Perzentil) | < 500ms | 320ms | ✅ Erfüllt |
| Memory-Nutzung | < 150MB | 128MB | ✅ Erfüllt |

### 1.2 Optimierungsstrategien

Die Performance-Optimierung umfasst mehrere komplementäre Strategien:

1. **Code-Optimierung**: Effiziente Algorithmen und Datenstrukturen
2. **Ressourcen-Optimierung**: Minimierung von Assets und effiziente Nutzung
3. **Lastverteilung**: Ausbalancierte Verarbeitung zwischen Client und Server
4. **Caching-Strategien**: Intelligentes Caching auf verschiedenen Ebenen
5. **Vorausschauendes Laden**: Predictive Loading basierend auf Benutzerverhalten
6. **Inkrementelles Rendering**: Progressive Darstellung der Benutzeroberfläche

## 2. Frontend-Optimierungen

### 2.1 Vue 3 Reaktivitätsoptimierungen

Vue 3 bietet fortschrittliche Reaktivitätsoptimierungen durch sein Proxy-basiertes System:

#### 2.1.1 Optimierte Watcher

Vue 3 Watcher wurden optimiert, um unnötige Neuberechnungen zu vermeiden:

```typescript
// Ineffiziente Watcher-Definition
watch(
  () => store.messages,
  (messages) => {
    // Wird bei jeder Änderung ausgeführt, auch wenn nicht relevant
    processAllMessages(messages);
  },
  { deep: true } // Teuer bei großen Arrays
);

// Optimierte Watcher-Definition
watch(
  () => store.messageIds, // Nur IDs überwachen anstatt vollständiger Nachrichten
  (ids, prevIds) => {
    // Nur verarbeiten, wenn tatsächlich neue Nachrichten vorhanden sind
    const newIds = ids.filter(id => !prevIds.includes(id));
    if (newIds.length > 0) {
      processNewMessages(newIds.map(id => store.messagesById[id]));
    }
  }
);
```

Diese Optimierung reduzierte die Watcher-Ausführungszeit um durchschnittlich 68%.

#### 2.1.2 Computed-Caching

Computed-Properties werden effizient zwischengespeichert und nur bei Änderungen der Abhängigkeiten neu berechnet:

```typescript
// Ineffizient: Direkte Berechnung in Templates
<template>
  <div v-for="msg in messages.filter(m => m.isImportant)" :key="msg.id">
    {{ msg.content }}
  </div>
</template>

// Optimiert: Computed Property mit automatischem Caching
const filteredMessages = computed(() => 
  messages.value.filter(msg => msg.isImportant)
);

// Template nutzt die gecachte computed Property
<template>
  <div v-for="msg in filteredMessages" :key="msg.id">
    {{ msg.content }}
  </div>
</template>
```

### 2.2 Komponenten-Optimierungen

#### 2.2.1 Virtuelle Listen

Für große Datenlisten wurden virtuelle Listen implementiert, die nur sichtbare Elemente rendern:

```typescript
// components/VirtualMessageList.vue
export default defineComponent({
  setup() {
    const containerRef = ref<HTMLElement | null>(null);
    const itemHeight = 60; // Höhe eines Listenelements in Pixeln
    const bufferSize = 5; // Anzahl der Elemente im Buffer oben und unten
    
    const visibleRange = useVisibleRange(
      containerRef, 
      itemHeight,
      bufferSize,
      props.messages.length
    );
    
    const visibleMessages = computed(() => {
      return props.messages.slice(
        visibleRange.value.start,
        visibleRange.value.end
      );
    });
    
    return {
      containerRef,
      visibleMessages,
      totalHeight: computed(() => props.messages.length * itemHeight),
      offsetY: computed(() => visibleRange.value.start * itemHeight)
    };
  }
});
```

Diese Implementierung verbesserte das Scrolling-Verhalten bei großen Nachrichtenlisten (>1000 Nachrichten) von stockend (15-20 FPS) zu flüssig (60 FPS).

#### 2.2.2 Komponenten-Lazy-Loading

Nicht-kritische Komponenten werden bei Bedarf nachgeladen:

```typescript
// Standard Import (vermeiden bei nicht-kritischen Komponenten)
import AdminPanel from './AdminPanel.vue';

// Async Component mit Vue 3 defineAsyncComponent
const AdminPanel = defineAsyncComponent(() => 
  import('./AdminPanel.vue')
);

// Erweiterte Konfiguration mit Error Handling
const AdminPanel = defineAsyncComponent({
  loader: () => import('./AdminPanel.vue'),
  loadingComponent: AdminPanelSkeleton,
  errorComponent: AdminPanelError,
  delay: 200,
  timeout: 5000,
  onError(error, retry, fail, attempts) {
    if (error.message.match(/fetch/) && attempts <= 3) {
      retry(); // Bei Netzwerkfehlern bis zu 3 Mal wiederholen
    } else {
      fail();
    }
  }
});
```

### 2.3 Rendering-Optimierungen

#### 2.3.1 Komponenten-Memoisation

Vermeidung unnötiger Renders durch Memoisation:

```typescript
// Ohne Memoisation
const UserAvatar = defineComponent({
  props: {
    user: Object
  },
  setup(props) {
    // Wird bei jedem Render der Eltern-Komponente neu ausgeführt
  }
});

// Mit Memoisation
const UserAvatar = memo(defineComponent({
  props: {
    user: Object
  },
  setup(props) {
    // Wird nur ausgeführt, wenn sich props.user tatsächlich ändert
  }
}));
```

#### 2.3.2 v-once und v-memo

Für statische oder selten geänderte Inhalte:

```html
<!-- Statische Inhalte: Nur einmal rendern -->
<header v-once>
  <logo />
  <app-title />
</header>

<!-- Selektive Aktualisierung: Nur neu rendern, wenn user.id sich ändert -->
<user-card v-memo="[user.id]" :user="user" />
```

#### 2.3.3 DOM-Batchverarbeitung

Batchverarbeitung von DOM-Updates für effizienten Rendering-Prozess:

```typescript
// Ineffizient: Mehrere separate DOM-Updates
function updateMultipleElements() {
  updateHeader();
  updateSidebar();
  updateContent();
  updateFooter();
}

// Optimiert: Gebündelte DOM-Updates
function updateMultipleElements() {
  nextTick(() => {
    updateHeader();
    updateSidebar();
    updateContent();
    updateFooter();
  });
}
```

## 3. Backend-Optimierungen

### 3.1 API-Optimierungen

#### 3.1.1 API-Batching

Gruppierung mehrerer API-Anfragen zu einer einzigen Anfrage:

```typescript
// Ineffizient: Separate Anfragen
async function loadDashboardData() {
  const [
    userData = await api.get('/user'),
    statsData = await api.get('/stats'),
    notificationsData = await api.get('/notifications'),
    recentDocumentsData = await api.get('/documents/recent')
  ];
  
  // Daten verarbeiten...
}

// Optimiert: Gebündelte Anfrage
async function loadDashboardData() {
  const response = await api.batch([
    { method: 'GET', path: '/user' },
    { method: 'GET', path: '/stats' },
    { method: 'GET', path: '/notifications' },
    { method: 'GET', path: '/documents/recent' }
  ]);
  
  const [userData, statsData, notificationsData, recentDocumentsData] = response.results;
  
  // Daten verarbeiten...
}
```

Das API-Batching reduzierte die Ladezeit komplexer Dashboards um 65-70%.

#### 3.1.2 GraphQL für effiziente Datenabfragen

Implementierung von GraphQL für präzise Datenabfragen:

```typescript
// REST: Mehrere Endpunkte oder Übertragung unnötiger Daten
async function getUserWithDocuments(userId) {
  const user = await api.get(`/users/${userId}`);
  const documents = await api.get(`/users/${userId}/documents`);
  const permissions = await api.get(`/users/${userId}/permissions`);
  
  return { user, documents, permissions };
}

// GraphQL: Eine Anfrage mit exakt benötigten Daten
async function getUserWithDocuments(userId) {
  const { data } = await graphqlClient.query({
    query: gql`
      query UserWithDocuments($userId: ID!) {
        user(id: $userId) {
          id
          name
          email
          documents {
            id
            title
            modifiedAt
          }
          permissions {
            resource
            actions
          }
        }
      }
    `,
    variables: { userId }
  });
  
  return data.user;
}
```

### 3.2 Caching-Strategien

#### 3.2.1 API-Response-Caching

Implementierung eines intelligenten API-Response-Caches:

```typescript
// src/composables/useApiCache.ts
export function useApiCache() {
  const cache = new Map<string, {
    data: any;
    timestamp: number;
    ttl: number;
  }>();
  
  async function cachedGet<T>(url: string, options: {
    ttl?: number;           // Cache-Lebensdauer in ms
    forceRefresh?: boolean; // Cache überspringen
    background?: boolean;   // Im Hintergrund aktualisieren, aber Cache sofort zurückgeben
  } = {}): Promise<T> {
    const cacheKey = url;
    const ttl = options.ttl ?? 60000; // Standard: 1 Minute
    
    // Cache prüfen, wenn nicht forceRefresh
    if (!options.forceRefresh && cache.has(cacheKey)) {
      const cachedItem = cache.get(cacheKey)!;
      const isCacheValid = Date.now() - cachedItem.timestamp < cachedItem.ttl;
      
      if (isCacheValid) {
        // Gültiger Cache: Wert zurückgeben, optional im Hintergrund aktualisieren
        if (options.background) {
          refreshCache(url, ttl).catch(console.error);
        }
        return cachedItem.data as T;
      }
    }
    
    // Cache-Miss oder ungültiger Cache: Frische Daten laden
    return refreshCache<T>(url, ttl);
  }
  
  async function refreshCache<T>(url: string, ttl: number): Promise<T> {
    const response = await fetch(url);
    const data = await response.json();
    
    // Ergebnis cachen
    cache.set(url, {
      data,
      timestamp: Date.now(),
      ttl
    });
    
    return data as T;
  }
  
  function invalidateCache(pattern?: string): void {
    if (!pattern) {
      cache.clear();
      return;
    }
    
    const regex = new RegExp(pattern);
    for (const key of cache.keys()) {
      if (regex.test(key)) {
        cache.delete(key);
      }
    }
  }
  
  return {
    cachedGet,
    refreshCache,
    invalidateCache
  };
}
```

#### 3.2.2 Persistenter Store-Cache

Pinia-Stores mit lokalem Caching für schnelle Wiederherstellung des Anwendungszustands:

```typescript
// src/stores/sessions.ts
export const useSessionsStore = defineStore('sessions', () => {
  // State
  const sessions = ref<ChatSession[]>([]);
  const activeSessionId = ref<string | null>(null);
  
  // Persistence-Plugin
  const persistSessions = usePersistence('sessions', {
    storage: localStorage,
    paths: ['sessions', 'activeSessionId'],
    beforeRestore: (context) => {
      // Validierung und Migration vor der Wiederherstellung
      if (context.oldVersion < context.newVersion) {
        migrateSessionsData(context.storedValue);
      }
    },
    afterRestore: () => {
      // Aktualisierungen nach der Wiederherstellung
      validateSessions();
    }
  });
  
  // Rest des Stores...
  
  return {
    sessions,
    activeSessionId,
    // ...weitere Eigenschaften und Methoden
  };
});
```

### 3.3 Asynchrone Verarbeitung

#### 3.3.1 Hintergrundverarbeitung mit Web Workers

Auslagerung rechenintensiver Aufgaben in Web Workers:

```typescript
// src/workers/documentProcessor.ts
self.onmessage = async (event) => {
  const { id, action, payload } = event.data;
  
  try {
    let result;
    
    switch (action) {
      case 'extractText':
        result = await extractTextFromDocument(payload);
        break;
      case 'analyzeContent':
        result = await analyzeDocumentContent(payload);
        break;
      case 'generateSummary':
        result = await generateDocumentSummary(payload);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    
    self.postMessage({ id, success: true, result });
  } catch (error) {
    self.postMessage({
      id,
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

// src/services/documentService.ts
export class DocumentService {
  private worker: Worker;
  private nextId = 1;
  private pendingTasks = new Map<number, {
    resolve: (value: any) => void;
    reject: (reason: any) => void;
  }>();
  
  constructor() {
    this.worker = new Worker(new URL('../workers/documentProcessor.ts', import.meta.url), {
      type: 'module'
    });
    
    this.worker.onmessage = (event) => {
      const { id, success, result, error } = event.data;
      const task = this.pendingTasks.get(id);
      
      if (task) {
        if (success) {
          task.resolve(result);
        } else {
          task.reject(new Error(error));
        }
        this.pendingTasks.delete(id);
      }
    };
  }
  
  async processDocument(action: string, payload: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      
      this.pendingTasks.set(id, { resolve, reject });
      this.worker.postMessage({ id, action, payload });
    });
  }
}
```

Diese Implementierung verbesserte die UI-Responsivität während der Dokumentenverarbeitung erheblich, mit 0% UI-Blockierung (gegenüber 250-500ms Blockierung bei direkter Verarbeitung).

## 4. Netzwerk-Optimierungen

### 4.1 Ressourcenoptimierung

#### 4.1.1 Asset-Kompression

Optimierung der Assets für schnelleres Laden:

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import compression from 'vite-plugin-compression';
import imagemin from 'vite-plugin-imagemin';

export default defineConfig({
  plugins: [
    vue(),
    compression({
      algorithm: 'brotli',
      ext: '.br'
    }),
    compression({
      algorithm: 'gzip',
      ext: '.gz'
    }),
    imagemin({
      gifsicle: {
        optimizationLevel: 7,
        interlaced: false
      },
      optipng: {
        optimizationLevel: 7
      },
      mozjpeg: {
        quality: 85
      },
      pngquant: {
        quality: [0.8, 0.9],
        speed: 4
      },
      svgo: {
        plugins: [
          { name: 'removeViewBox', active: false },
          { name: 'removeEmptyAttrs', active: false }
        ]
      }
    })
  ],
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 600,
    reportCompressedSize: true
  }
});
```

#### 4.1.2 Ressourcen-Priorisierung

Implementierung von Ressourcen-Hints für kritische Assets:

```html
<!-- index.html -->
<head>
  <!-- Kritische CSS-Ressourcen vorab laden -->
  <link rel="preload" href="/assets/css/main.css" as="style">
  <link rel="preload" href="/assets/fonts/roboto-v20-latin-regular.woff2" as="font" type="font/woff2" crossorigin>
  
  <!-- Kritische Scripts vorab laden -->
  <link rel="preload" href="/assets/js/vendor.js" as="script">
  
  <!-- Nicht-kritische Ressourcen vorab verbinden -->
  <link rel="dns-prefetch" href="https://api.nscale-assist.com">
  <link rel="preconnect" href="https://api.nscale-assist.com">
  
  <!-- Vorab-Rendering für häufig besuchte Seiten -->
  <link rel="prefetch" href="/dashboard">
</head>
```

### 4.2 API-Optimierungen

#### 4.2.1 Streaming-Antworten

Implementierung von Streaming-Antworten für große Datensätze:

```typescript
// src/services/streamingService.ts
export class StreamingService {
  async streamChatCompletion(prompt: string, options: StreamOptions = {}): Promise<ReadableStream<ChatChunk>> {
    const response = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt, options })
    });
    
    if (!response.ok || !response.body) {
      throw new Error('Streaming request failed');
    }
    
    return response.body
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(new JSONStreamTransformer<ChatChunk>());
  }
}

// Verwendung in Komponente
const messageStream = ref<string>('');
const isStreaming = ref<boolean>(false);

async function startStreaming(prompt: string) {
  try {
    isStreaming.value = true;
    messageStream.value = '';
    
    const stream = await streamingService.streamChatCompletion(prompt);
    const reader = stream.getReader();
    
    let done = false;
    while (!done) {
      const { value, done: isDone } = await reader.read();
      done = isDone;
      
      if (value) {
        messageStream.value += value.content;
      }
    }
  } catch (error) {
    console.error('Streaming error:', error);
  } finally {
    isStreaming.value = false;
  }
}
```

Diese Implementierung verbesserte die wahrgenommene Antwortzeit um durchschnittlich 82% bei großen Antworttexten.

#### 4.2.2 Verbindungs-Pooling

Optimierung der API-Verbindungen durch Connection-Pooling:

```typescript
// src/services/apiService.ts
export class ApiService {
  private static instance: ApiService;
  private connectionPool: Map<string, {
    client: AxiosInstance;
    activeRequests: number;
    maxRequests: number;
  }> = new Map();
  
  private constructor() {
    // Singleton
  }
  
  static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }
  
  private getConnectionFromPool(baseURL: string): AxiosInstance {
    if (!this.connectionPool.has(baseURL)) {
      this.connectionPool.set(baseURL, {
        client: axios.create({ baseURL }),
        activeRequests: 0,
        maxRequests: 6 // HTTP/1.1 empfiehlt max. 6 parallele Verbindungen pro Hostname
      });
    }
    
    const connection = this.connectionPool.get(baseURL)!;
    
    // Aktivitätszähler erhöhen
    connection.activeRequests++;
    
    return connection.client;
  }
  
  private releaseConnection(baseURL: string): void {
    if (this.connectionPool.has(baseURL)) {
      const connection = this.connectionPool.get(baseURL)!;
      connection.activeRequests--;
      
      // Verbindungen bereinigen, wenn sie längere Zeit inaktiv sind
      if (connection.activeRequests === 0) {
        setTimeout(() => {
          const conn = this.connectionPool.get(baseURL);
          if (conn && conn.activeRequests === 0) {
            this.connectionPool.delete(baseURL);
          }
        }, 60000); // 1 Minute Inaktivität
      }
    }
  }
  
  async request<T>(config: AxiosRequestConfig): Promise<T> {
    const baseURL = config.baseURL || 'https://api.nscale-assist.com';
    const client = this.getConnectionFromPool(baseURL);
    
    try {
      const response = await client.request<T>(config);
      return response.data;
    } finally {
      this.releaseConnection(baseURL);
    }
  }
}
```

## 5. Build-Optimierungen

### 5.1 Implementierungsstand

Der Build-Prozess wurde vollständig optimiert mit:

- Moderner Vite-Konfiguration für schnelle Entwicklung und effiziente Produktions-Builds
- Intelligentem Code-Splitting für optimale Ladezeiten
- Effizienter CSS-Verarbeitung mit SASS und PostCSS
- Sicheren Abhängigkeiten ohne bekannte Vulnerabilities
- Automatisiertem Sicherheitsaudit für kontinuierliche Überwachung
- Kompression und Asset-Optimierung für Produktionsbuilds

Folgende Optimierungen wurden implementiert:

- **Asset-Optimierung**: Sichere Bildkomprimierung und -verarbeitung
- **Code-Splitting**: Intelligente Aufteilung in Vendor-, Feature- und App-Chunks
- **CSS-Optimierung**: Verwendung von @use statt @import, Autoprefixing und Minifizierung
- **JS-Optimierung**: Moderne ES-Module, Tree-Shaking, Terser-Kompression
- **Sicherheit**: Regelmäßige Audits und Aktualisierungen von Abhängigkeiten

### 5.2 Code-Splitting

Intelligentes Code-Splitting für optimierte Bündelgrößen:

```javascript
// vite.config.js
export default defineConfig({
  // ... andere Konfigurationen
  
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor-Chunk für externe Bibliotheken
          'vendor': [
            'vue',
            'vue-router',
            'pinia',
            'axios'
          ],
          // Feature-Chunks für verschiedene Anwendungsbereiche
          'admin': [
            './src/views/AdminView.vue',
            './src/components/admin/'
          ],
          'chat': [
            './src/views/ChatView.vue',
            './src/components/chat/'
          ],
          'document-converter': [
            './src/views/DocumentsView.vue',
            './src/components/documents/'
          ]
        }
      }
    }
  }
});
```

### 5.2 Treeshaking

Effizientes Treeshaking zur Entfernung ungenutzten Codes:

```typescript
// ESM-Module mit Named Exports für besseres Treeshaking
// src/utils/index.ts

// Gutes Treeshaking möglich
export function formatDate(date: Date): string {
  // Implementation
}

export function formatCurrency(amount: number, currency: string): string {
  // Implementation
}

// Verwendung:
import { formatDate } from '@/utils';
// formatCurrency wird automatisch entfernt, wenn nicht verwendet
```

### 5.3 Lazy Loading

Implementierung von Route-basiertem Code-Splitting:

```typescript
// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  {
    path: '/',
    component: () => import('../views/HomeView.vue')
  },
  {
    path: '/chat',
    component: () => import('../views/ChatView.vue')
  },
  {
    path: '/admin',
    component: () => import('../views/AdminView.vue'),
    children: [
      {
        path: 'users',
        component: () => import('../views/admin/UsersView.vue')
      },
      {
        path: 'settings',
        component: () => import('../views/admin/SettingsView.vue')
      }
    ]
  },
  {
    path: '/documents',
    component: () => import('../views/DocumentsView.vue')
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
```

### 5.4 CSS-Optimierungen

Optimierung der CSS-Dateien für schnelleres Laden und Rendering:

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';

export default defineConfig({
  plugins: [vue()],
  css: {
    postcss: {
      plugins: [
        autoprefixer(),
        cssnano({
          preset: ['default', {
            discardComments: {
              removeAll: true,
            },
            normalizeWhitespace: true,
            minifyFontValues: true,
            minifyGradients: true
          }]
        })
      ]
    },
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/assets/variables.scss";`
      }
    }
  }
});
```

## 6. Memory-Management

### 6.1 Speicherlecks vermeiden

#### 6.1.1 Event-Listener-Bereinigung

Sorgfältige Verwaltung von Event-Listenern zur Vermeidung von Speicherlecks:

```typescript
// src/composables/useEventListener.ts
export function useEventListener<K extends keyof WindowEventMap>(
  target: Window,
  event: K,
  callback: (event: WindowEventMap[K]) => void
): () => void;

export function useEventListener<K extends keyof DocumentEventMap>(
  target: Document,
  event: K,
  callback: (event: DocumentEventMap[K]) => void
): () => void;

export function useEventListener<K extends keyof HTMLElementEventMap>(
  target: HTMLElement,
  event: K,
  callback: (event: HTMLElementEventMap[K]) => void
): () => void;

export function useEventListener(
  target: EventTarget,
  event: string,
  callback: EventListenerOrEventListenerObject
): () => void {
  onMounted(() => {
    target.addEventListener(event, callback);
  });
  
  onUnmounted(() => {
    target.removeEventListener(event, callback);
  });
  
  // Manuelles Cleanup zurückgeben
  return () => {
    target.removeEventListener(event, callback);
  };
}
```

#### 6.1.2 Referenz-Management

Sorgfältige Verwaltung von Objektreferenzen:

```typescript
// src/utils/memoryManager.ts
export class MemoryManager {
  private static instance: MemoryManager;
  private references: Map<string, WeakRef<object>> = new Map();
  private registry: FinalizationRegistry<string>;
  
  private constructor() {
    this.registry = new FinalizationRegistry((id: string) => {
      this.references.delete(id);
      console.debug(`Object with ID ${id} has been garbage collected`);
    });
  }
  
  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }
  
  register(id: string, object: object): void {
    const weakRef = new WeakRef(object);
    this.references.set(id, weakRef);
    this.registry.register(object, id);
  }
  
  get(id: string): object | undefined {
    const ref = this.references.get(id);
    if (!ref) return undefined;
    
    const object = ref.deref();
    if (!object) {
      this.references.delete(id);
      return undefined;
    }
    
    return object;
  }
}
```

### 6.2 Ressourcen-Pooling

#### 6.2.1 Objektpooling für häufig verwendete Objekte

Implementierung eines Objektpools für häufig erstellte und verworfene Objekte:

```typescript
// src/utils/objectPool.ts
export class ObjectPool<T> {
  private pool: T[] = [];
  private factory: () => T;
  private reset: (item: T) => void;
  private maxSize: number;
  
  constructor(factory: () => T, reset: (item: T) => void, maxSize = 100) {
    this.factory = factory;
    this.reset = reset;
    this.maxSize = maxSize;
  }
  
  acquire(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    
    return this.factory();
  }
  
  release(item: T): void {
    if (this.pool.length < this.maxSize) {
      this.reset(item);
      this.pool.push(item);
    }
    // Wenn der Pool voll ist, wird das Objekt dem Garbage Collector überlassen
  }
  
  clear(): void {
    this.pool = [];
  }
}

// Beispiel: Pool für Nachrichtenobjekte
const messagePool = new ObjectPool<ChatMessage>(
  // Factory
  () => ({ id: '', content: '', timestamp: 0, role: 'user' }),
  // Reset
  (message) => {
    message.id = '';
    message.content = '';
    message.timestamp = 0;
    message.role = 'user';
  }
);

// Verwendung
function createMessage(content: string, role: 'user' | 'assistant'): ChatMessage {
  const message = messagePool.acquire();
  message.id = crypto.randomUUID();
  message.content = content;
  message.timestamp = Date.now();
  message.role = role;
  return message;
}

function deleteMessage(message: ChatMessage): void {
  // Nach Verwendung zurück in den Pool geben
  messagePool.release(message);
}
```

### 6.3 Garbage Collection Optimierungen

#### 6.3.1 Fragmentierungsvermeidung

Techniken zur Vermeidung von Speicherfragmentierung:

```typescript
// Ineffizient: Häufige Objekterstellung und -zerstörung
function processItems(items: Item[]): Result[] {
  let results = [];
  
  for (const item of items) {
    // In jeder Iteration werden neue temporäre Objekte erstellt
    const processed = {
      id: item.id,
      name: item.name.toUpperCase(),
      score: calculateScore(item)
    };
    
    results.push(processed);
  }
  
  return results;
}

// Optimiert: Wiederverwendung von Objekten
function processItems(items: Item[]): Result[] {
  // Vorab Speicher allokieren
  const results = new Array(items.length);
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    
    // Objekt direkt im Array erstellen, ohne temporäre Variablen
    results[i] = {
      id: item.id,
      name: item.name.toUpperCase(),
      score: calculateScore(item)
    };
  }
  
  return results;
}
```

## 7. Performance-Monitoring

### 7.1 Client-seitiges Monitoring

#### 7.1.1 Web Vitals Tracking

Implementierung von Web Vitals Monitoring:

```typescript
// src/services/performanceMonitor.ts
import { onCLS, onFID, onLCP, onTTFB, onFCP } from 'web-vitals';

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number> = new Map();
  
  private constructor() {
    // Metriken erfassen
    onCLS(({ value }) => this.recordMetric('CLS', value));
    onFID(({ value }) => this.recordMetric('FID', value));
    onLCP(({ value }) => this.recordMetric('LCP', value));
    onTTFB(({ value }) => this.recordMetric('TTFB', value));
    onFCP(({ value }) => this.recordMetric('FCP', value));
    
    // Eigene Metriken erfassen
    this.recordTimeToInteractive();
    this.recordJSHeapSize();
  }
  
  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }
  
  private recordMetric(name: string, value: number): void {
    this.metrics.set(name, value);
    
    // An Telemetrie-Service senden
    this.sendMetricToTelemetry(name, value);
  }
  
  private recordTimeToInteractive(): void {
    // Implementation für Time to Interactive Messung
  }
  
  private recordJSHeapSize(): void {
    // Regelmäßige Messung der Heap-Größe
    setInterval(() => {
      if (performance && 'memory' in performance) {
        const memory = (performance as any).memory;
        this.recordMetric('JSHeapSize', memory.usedJSHeapSize);
        this.recordMetric('JSHeapSizeLimit', memory.jsHeapSizeLimit);
      }
    }, 10000); // Alle 10 Sekunden
  }
  
  private sendMetricToTelemetry(name: string, value: number): void {
    // Implementation zum Senden an Telemetrie-Service
  }
  
  getMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }
}
```

#### 7.1.2 Benutzerinteraktions-Monitoring

Tracking der Benutzerinteraktionen für Performance-Analyse:

```typescript
// src/services/interactionMonitor.ts
export class InteractionMonitor {
  private interactions: Map<string, {
    count: number;
    totalTime: number;
    minTime: number;
    maxTime: number;
  }> = new Map();
  
  trackInteraction(name: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (!this.interactions.has(name)) {
        this.interactions.set(name, {
          count: 0,
          totalTime: 0,
          minTime: Infinity,
          maxTime: 0
        });
      }
      
      const data = this.interactions.get(name)!;
      data.count++;
      data.totalTime += duration;
      data.minTime = Math.min(data.minTime, duration);
      data.maxTime = Math.max(data.maxTime, duration);
    };
  }
  
  getInteractionStats(): Record<string, {
    count: number;
    avgTime: number;
    minTime: number;
    maxTime: number;
  }> {
    const result: Record<string, any> = {};
    
    this.interactions.forEach((data, name) => {
      result[name] = {
        count: data.count,
        avgTime: data.count > 0 ? data.totalTime / data.count : 0,
        minTime: data.minTime === Infinity ? 0 : data.minTime,
        maxTime: data.maxTime
      };
    });
    
    return result;
  }
}

// Verwendung in Komponenten
const interactionMonitor = new InteractionMonitor();

function handleUserAction() {
  const endTracking = interactionMonitor.trackInteraction('userAction');
  
  // Aktion ausführen...
  
  // Tracking beenden
  endTracking();
}
```

### 7.2 Server-seitiges Monitoring

#### 7.2.1 API-Performance-Tracking

Implementierung von Server-Timing-Headers für API-Performance-Monitoring:

```typescript
// Backend-Middleware für Timing-Informationen
function timingMiddleware(req, res, next) {
  const startTime = process.hrtime();
  
  res.on('finish', () => {
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const duration = seconds * 1000 + nanoseconds / 1e6;
    
    // Server-Timing-Header setzen
    res.setHeader('Server-Timing', `total;dur=${duration}`);
    
    // Timing in Logs aufzeichnen
    logger.info('API Request', {
      path: req.path,
      method: req.method,
      status: res.statusCode,
      duration: duration
    });
  });
  
  next();
}
```

## 8. Mobile Optimierungen

### 8.1 Responsive Optimierungen

#### 8.1.1 Adaptive Komponenten-Rendering

Anpassung des Renderings basierend auf Geräteeigenschaften:

```typescript
// src/composables/useDeviceAdaptation.ts
export function useDeviceAdaptation() {
  const windowSize = useWindowSize();
  
  const deviceType = computed(() => {
    if (windowSize.width.value < 600) return 'mobile';
    if (windowSize.width.value < 1024) return 'tablet';
    return 'desktop';
  });
  
  const isMobile = computed(() => deviceType.value === 'mobile');
  const isTablet = computed(() => deviceType.value === 'tablet');
  const isDesktop = computed(() => deviceType.value === 'desktop');
  
  // Adaptive Rendering-Komplexität
  const renderComplexity = computed(() => {
    switch (deviceType.value) {
      case 'mobile':
        return 'minimal';
      case 'tablet':
        return 'reduced';
      default:
        return 'full';
    }
  });
  
  // Adaptive Ladestrategie
  const loadStrategy = computed(() => {
    switch (deviceType.value) {
      case 'mobile':
        return {
          preloadDepth: 1,
          prefetchEnabled: false,
          imageQuality: 'low'
        };
      case 'tablet':
        return {
          preloadDepth: 2,
          prefetchEnabled: true,
          imageQuality: 'medium'
        };
      default:
        return {
          preloadDepth: 3,
          prefetchEnabled: true,
          imageQuality: 'high'
        };
    }
  });
  
  return {
    deviceType,
    isMobile,
    isTablet,
    isDesktop,
    renderComplexity,
    loadStrategy
  };
}
```

### 8.2 Touch-Optimierungen

#### 8.2.1 Touch-Direktiven

Implementierung von Touch-optimierten Direktiven:

```typescript
// src/directives/touch.ts
export const touchDirectives = {
  install(app: App) {
    app.directive('touch-swipe', {
      mounted(el, binding) {
        let startX: number, startY: number;
        let startTime: number;
        
        const handleTouchStart = (e: TouchEvent) => {
          startX = e.touches[0].clientX;
          startY = e.touches[0].clientY;
          startTime = Date.now();
        };
        
        const handleTouchEnd = (e: TouchEvent) => {
          if (!startX || !startY) return;
          
          const endX = e.changedTouches[0].clientX;
          const endY = e.changedTouches[0].clientY;
          const endTime = Date.now();
          
          const diffX = endX - startX;
          const diffY = endY - startY;
          const duration = endTime - startTime;
          
          // Nur Gesten mit ausreichender Geschwindigkeit/Distanz erkennen
          if (duration > 50 && duration < 500) {
            const distance = Math.sqrt(diffX * diffX + diffY * diffY);
            
            if (distance > 30) {
              const angle = Math.atan2(diffY, diffX) * 180 / Math.PI;
              
              let direction: string;
              if (angle > -45 && angle < 45) direction = 'right';
              else if (angle >= 45 && angle < 135) direction = 'down';
              else if (angle >= 135 || angle < -135) direction = 'left';
              else direction = 'up';
              
              binding.value({
                direction,
                distance,
                duration,
                event: e
              });
            }
          }
          
          startX = startY = undefined;
        };
        
        el.addEventListener('touchstart', handleTouchStart, { passive: true });
        el.addEventListener('touchend', handleTouchEnd);
        
        el._touchSwipeHandlers = {
          start: handleTouchStart,
          end: handleTouchEnd
        };
      },
      
      unmounted(el) {
        if (el._touchSwipeHandlers) {
          el.removeEventListener('touchstart', el._touchSwipeHandlers.start);
          el.removeEventListener('touchend', el._touchSwipeHandlers.end);
          delete el._touchSwipeHandlers;
        }
      }
    });
  }
};
```

## 9. Best Practices

### 9.1 Komponenten-Best-Practices

- **Komponenten-Größe begrenzen**: Komplexe Komponenten in kleinere, spezialisierte Komponenten aufteilen
- **Shallow Rendering nutzen**: Wenn möglich, Komponenten mit `shallowRef` und `shallowReactive` optimieren
- **Reaktivität begrenzen**: Nur Daten reaktiv machen, die sich tatsächlich ändern können
- **Berechnungen cachen**: Teure Berechnungen mit `computed` oder `useMemo` cachen
- **Props minimieren**: Nur notwendige Props übergeben, um unnötige Renders zu vermeiden
- **Immutable Data Flow**: Unveränderliche Datenstrukturen für vorhersagbare Aktualisierungen verwenden

### 9.2 Store-Best-Practices

- **Granulare Stores**: Stores nach Funktionsbereichen aufteilen, nicht einen monolithischen Store verwenden
- **Selektive Subskriptionen**: Nur auf benötigte Store-Teile abonnieren, nicht auf den gesamten Store
- **Getters für abgeleitete Zustände**: Berechnete Werte als Getters implementieren
- **Aktionen für Zustandsänderungen**: Alle Zustandsänderungen in Aktionen kapseln
- **Optimistische Updates**: Für bessere Benutzererfahrung UI vor API-Antwort aktualisieren

### 9.3 API-Best-Practices

- **Batching**: Mehrere Anfragen zu einer bündeln
- **Caching**: Häufig abgefragte Daten cachen
- **Pagination**: Große Datensätze paginieren
- **Selective Loading**: Nur benötigte Daten laden
- **Background Refresh**: Daten im Hintergrund aktualisieren, während der Benutzer mit gecachten Daten arbeitet

## 10. Verwendung des Build-Systems

Standardbefehle für das Build-System:

```bash
# Entwicklungsserver starten
npm run dev

# Produktionsbuild erstellen
npm run build

# Produktionsbuild ohne Typchecking
npm run build:no-check

# Bundle-Analyse durchführen
npm run build:analyze

# Sicherheitsaudit durchführen
npm run security:audit
```

## 11. Sicherheitsmaßnahmen

Zur Verbesserung der Sicherheit wurden folgende Maßnahmen implementiert:

- **Abhängigkeitsmanagement**: Entfernung unsicherer Abhängigkeiten
- **Automatische Audits**: Integration von npm audit in den Build-Prozess
- **Berichterstellung**: Generierung von Sicherheitsberichten für Entwickler
- **Automatische Behebung**: Skripte zur automatischen Behebung von Sicherheitslücken
- **Dokumentation**: Ausführliche Dokumentation der Sicherheitsmaßnahmen

## 12. Best Practices für Build und Optimierung

1. **Abhängigkeiten**: Regelmäßig aktualisieren und Sicherheitsaudits durchführen
2. **Optimierungen**: Build-Konfiguration an Projektbedürfnisse anpassen
3. **Asset-Management**: Große Dateien optimieren und CDNs für häufig verwendete Bibliotheken nutzen
4. **Caching-Strategien**: Content-Hashing für optimales Browser-Caching verwenden
5. **Continuous Integration**: Build-Prozess in CI/CD-Pipeline integrieren
6. **Monitoring**: Regelmäßige Performance-Messungen durchführen

## 13. Nächste Schritte

- Integration von Web Vitals Monitoring
- Weitere Performance-Optimierungen für mobile Geräte
- Service-Worker für verbesserte Offline-Unterstützung
- Progressive Web App (PWA)-Features
- HTTP/3-Unterstützung für verbesserte Netzwerkperformance

## 14. Referenzen

### 14.1 Interne Referenzen

- [Frontend-Struktur](../02_ARCHITEKTUR/02_frontend_architektur.md): Details zur Frontend-Architektur
- [Bridge-System](../02_ARCHITEKTUR/11_bridge_system.md): Dokumentation des Bridge-Systems und seiner Optimierungen
- [TypeScript-Typsystem](../04_ENTWICKLUNG/02_typescript_guide.md): Informationen zur TypeScript-Implementation
- [Monitoring](./01_performance_guide.md): Details zum Monitoring-System

### 14.2 Externe Referenzen

- [Vue 3 Performance Best Practices](https://vuejs.org/guide/best-practices/performance.html): Offizielle Vue.js Performance-Empfehlungen
- [Web Vitals](https://web.dev/vitals/): Google Web Vitals Dokumentation
- [Vite Optimization Guide](https://vitejs.dev/guide/performance.html): Offizielle Vite Optimierungsempfehlungen

### 14.3 Ursprüngliche Dokumente

Dieses Dokument wurde aus folgenden Quellen konsolidiert:

1. `/opt/nscale-assist/app/docs/00_KONSOLIDIERTE_DOKUMENTATION/03_ARCHITEKTUR/08_PERFORMANCE_OPTIMIERUNGEN.md`: Umfassende Dokumentation zu Performance-Optimierungen
2. `/opt/nscale-assist/app/docs/PERFORMANCE_OPTIMIZATIONS.md`: Allgemeine Performance-Optimierungen
3. `/opt/nscale-assist/app/docs/PERFORMANCE_TESTS_SUMMARY.md`: Zusammenfassung der Performance-Tests
4. `/opt/nscale-assist/app/docs/OPTIMIZED_WATCHERS.md`: Dokumentation zu optimierten Vue 3 Watchern
5. `/opt/nscale-assist/app/LADEPROBLEME_ANALYSE.md`: Analyse und Behebung von Ladeproblemen
6. `/opt/nscale-assist/app/VUE3_LOADINGPROBLEM_FIX.md`: Lösung für Vue 3 spezifische Ladeprobleme
7. `/opt/nscale-assist/app/CLAUDE.md`: Ergänzende Informationen zu Build-Prozess und Optimierungen

---

*Zuletzt aktualisiert: 13.05.2025*