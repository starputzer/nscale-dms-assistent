# Project Knowledge Base - nscale DMS Assistant

## 🎯 Übersicht

Diese Knowledge Base sammelt wichtige Informationen, Entscheidungen und Learnings aus der Entwicklung des nscale DMS Assistant. Sie dient als zentrale Referenz für das Team.

## 📋 Inhaltsverzeichnis

1. [Architektur-Entscheidungen](#architektur-entscheidungen)
2. [Technische Schulden](#technische-schulden)
3. [Performance-Erkenntnisse](#performance-erkenntnisse)
4. [Bekannte Probleme & Workarounds](#bekannte-probleme--workarounds)
5. [Deployment & Infrastructure](#deployment--infrastructure)
6. [Third-Party Integrationen](#third-party-integrationen)
7. [Lessons Learned](#lessons-learned)
8. [FAQ](#faq)

## 🏛️ Architektur-Entscheidungen

### ADR-001: Vue 3 Composition API

**Status**: Akzeptiert  
**Datum**: Januar 2024  
**Kontext**: Migration von Vue 2 Options API zu Vue 3 Composition API  

**Entscheidung**: 
- Vollständige Migration zu Composition API mit `<script setup>`
- Verwendung von TypeScript für Type Safety
- Pinia statt Vuex für State Management

**Begründung**:
- Bessere TypeScript-Integration
- Verbesserte Code-Wiederverwendung durch Composables
- Kleinere Bundle-Größe
- Zukunftssicher

**Konsequenzen**:
- (+) Bessere Developer Experience
- (+) Type Safety out of the box
- (-) Lernkurve für Team-Mitglieder
- (-) Migration bestehender Komponenten erforderlich

### ADR-002: Shallow Reactivity für Performance

**Status**: Akzeptiert  
**Datum**: März 2025  
**Kontext**: Performance-Probleme bei großen Message-Listen (1000+ Nachrichten)

**Entscheidung**:
- Implementierung von Shallow Reactivity für große Datensätze
- Custom `useShallowArray` und `useShallowMap` Composables
- Batch-Updates für Streaming-Nachrichten

**Begründung**:
- Deep Reactivity verursachte Performance-Probleme
- Unnötige Re-Renders bei nested Updates
- Memory-Footprint zu hoch

**Metriken**:
- Initial Render: -50% Zeit
- Memory Usage: -40%
- FPS während Streaming: 25 → 60

### ADR-003: Bridge-System für Legacy-Integration

**Status**: Akzeptiert  
**Datum**: Februar 2025  
**Kontext**: Integration mit bestehendem Vanilla JS Code

**Entscheidung**:
- Event-basiertes Bridge-System
- Selective Synchronization
- Batch Event Processing

**Begründung**:
- Schrittweise Migration möglich
- Keine Breaking Changes
- Performance-optimiert

**Komponenten**:
```
Vue 3 App ←→ Bridge ←→ Legacy JS
         Events & State Sync
```

### ADR-004: Server-Sent Events für Streaming

**Status**: Akzeptiert  
**Datum**: April 2025  
**Kontext**: Real-time Streaming von AI-Responses

**Entscheidung**:
- SSE statt WebSockets
- Automatische Reconnection
- Batch Token Processing

**Begründung**:
- Einfacher zu implementieren
- Funktioniert mit Standard HTTP
- Automatisches Reconnect im Browser
- Ausreichend für unidirektionales Streaming

## 🔧 Technische Schulden

### High Priority

1. **TypeScript Strict Mode Migration**
   - **Problem**: Teilweise `any` Types im Code
   - **Impact**: Type Safety nicht vollständig gewährleistet
   - **Lösung**: Schrittweise Migration zu strict mode
   - **Aufwand**: ~2 Wochen

2. **Legacy Bridge Removal**
   - **Problem**: Bridge-System erhöht Komplexität
   - **Impact**: Doppelte State-Verwaltung
   - **Lösung**: Vollständige Migration zu Vue 3
   - **Aufwand**: ~4 Wochen

### Medium Priority

1. **Test Coverage**
   - **Problem**: Nur 65% Test Coverage
   - **Impact**: Regressions möglich
   - **Lösung**: Ziel 80% Coverage
   - **Aufwand**: Ongoing

2. **Bundle Size Optimization**
   - **Problem**: Main Bundle > 300KB
   - **Impact**: Initial Load Time
   - **Lösung**: Code Splitting, Tree Shaking
   - **Aufwand**: ~1 Woche

### Low Priority

1. **Accessibility Improvements**
   - **Problem**: Nicht vollständig WCAG 2.1 AA compliant
   - **Impact**: Eingeschränkte Barrierefreiheit
   - **Lösung**: Accessibility Audit und Fixes
   - **Aufwand**: ~2 Wochen

## ⚡ Performance-Erkenntnisse

### Message Rendering

**Problem**: Langsames Rendering bei 1000+ Nachrichten

**Analyse**:
```javascript
// Vorher: Deep reactive array
const messages = ref<ChatMessage[]>([]);
// Jede Änderung triggert deep comparison

// Nachher: Shallow reactive mit Batch Updates
const [messages, messageBatch] = useShallowArray<ChatMessage>();
// Nur Top-Level Changes triggern Updates
```

**Ergebnis**:
- Render Zeit: 2100ms → 380ms
- Memory: 180MB → 95MB
- Re-renders: -80%

### Virtual Scrolling

**Implementation**:
```vue
<OptimizedMessageList
  :messages="messages"
  :item-height="120"
  :buffer-size="10"
/>
```

**Key Insights**:
- Feste Item-Höhe verbessert Performance
- Buffer von 10 Items optimal für smooth scrolling
- CSS `contain: layout` wichtig für Browser-Optimierung

### Streaming Optimization

**Problem**: UI-Freezes während Streaming

**Lösung**:
```typescript
const streamBatch = new BatchUpdateManager(
  (tokens) => updateMessage(tokens),
  { 
    maxBatchSize: 100,
    flushIntervalMs: 16,
    adaptiveThrottling: true 
  }
);
```

**Ergebnis**:
- Konstante 60 FPS während Streaming
- Keine UI-Blocks mehr
- Adaptive Throttling passt sich an Device-Performance an

## 🐛 Bekannte Probleme & Workarounds

### 1. Safari iOS Virtual Keyboard

**Problem**: Virtual Keyboard verschiebt Layout

**Workaround**:
```css
.chat-container {
  height: 100vh;
  height: -webkit-fill-available;
}
```

### 2. Chrome Memory Leak mit EventSource

**Problem**: SSE Connections werden nicht korrekt bereinigt

**Workaround**:
```typescript
onUnmounted(() => {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
    // Force garbage collection hint
    if (window.gc) window.gc();
  }
});
```

### 3. Vite HMR mit Pinia

**Problem**: State geht bei HMR verloren

**Workaround**:
```typescript
// stores/sessions.ts
if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useSessionsStore, import.meta.hot));
}
```

### 4. TypeScript Performance in großen Projekten

**Problem**: TSC wird langsam bei 200+ Dateien

**Workaround**:
- Incremental Builds aktivieren
- Project References nutzen
- `skipLibCheck: true` in tsconfig

## 🚀 Deployment & Infrastructure

### Production Build

```bash
# Optimized Production Build
npm run build:prod

# Ergebnis:
# - dist/assets/index-[hash].js (285KB gzipped)
# - dist/assets/index-[hash].css (42KB gzipped)
# - Lighthouse Score: 95+
```

### Environment Variables

```env
# .env.production
VITE_API_BASE_URL=https://api.nscale-assist.de
VITE_API_TIMEOUT=30000
VITE_MAX_UPLOAD_SIZE=10485760
VITE_ENABLE_TELEMETRY=true
VITE_SENTRY_DSN=https://...
```

### Docker Deployment

```dockerfile
# Multi-stage build für optimale Größe
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
```

### CDN Integration

**Static Assets**:
- Bilder: Cloudflare CDN
- Fonts: Google Fonts mit font-display: swap
- JS/CSS: Asset Hashing für Cache-Busting

## 🔌 Third-Party Integrationen

### Ollama Integration

**Setup**:
```python
# api/llm/model.py
client = Ollama(
    base_url="http://localhost:11434",
    model="mistral:latest",
    temperature=0.7
)
```

**Best Practices**:
- Connection Pooling verwenden
- Timeout von 60s für lange Anfragen
- Retry-Logic mit exponential backoff

### Sentry Error Tracking

**Integration**:
```typescript
// main.ts
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay()
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1
});
```

**Filtering**:
- Ignoriere: ResizeObserver errors
- Ignoriere: Network timeouts in development
- Capture: Unhandled Promise rejections

## 📚 Lessons Learned

### 1. Early Performance Testing

**Learning**: Performance-Probleme früh identifizieren

**Vorgehen**:
- Test mit realistischen Datenmengen (1000+ Messages)
- Performance Budget definieren (FPS, Memory, Load Time)
- Continuous Performance Monitoring

### 2. TypeScript Strictness

**Learning**: Schrittweise zu strict mode migrieren

**Empfehlung**:
```json
{
  "compilerOptions": {
    "strict": false,
    "noImplicitAny": true,      // Step 1
    "strictNullChecks": true,   // Step 2
    "strictFunctionTypes": true, // Step 3
    "strict": true              // Final
  }
}
```

### 3. State Management Patterns

**Learning**: Nicht alles muss im globalen State sein

**Guidelines**:
- Global: User auth, sessions, app settings
- Local: Form state, UI state, temporary data
- Composed: Feature-spezifische stores

### 4. Bundle Size Management

**Learning**: Lazy Loading ist crucial

**Strategies**:
```typescript
// Route-based splitting
const AdminPanel = () => import('./views/AdminPanel.vue');

// Component-based splitting
const HeavyComponent = defineAsyncComponent(() =>
  import('./components/HeavyComponent.vue')
);

// Feature-based splitting
const { exportToPDF } = await import('./utils/pdfExport');
```

## ❓ FAQ

### Development

**Q: Warum Vite statt Webpack?**  
A: Vite bietet schnellere HMR, bessere ES Module Unterstützung und einfachere Konfiguration. Build-Zeit: Webpack ~45s → Vite ~12s.

**Q: Warum Pinia statt Vuex?**  
A: Bessere TypeScript-Unterstützung, einfachere API, kleinere Bundle-Größe, designed für Composition API.

**Q: Wie handle ich große File Uploads?**  
A: Nutze chunked uploads mit Resume-Fähigkeit:
```typescript
const uploader = new ChunkedUploader({
  chunkSize: 1024 * 1024, // 1MB chunks
  parallel: 3,
  retries: 3
});
```

### Performance

**Q: Wann sollte ich Shallow Reactivity verwenden?**  
A: Bei Arrays/Objects mit 100+ Items oder häufigen Updates (>10/Sekunde).

**Q: Wie optimiere ich Bundle Size?**  
A: 
1. Analyze mit `npm run build:analyze`
2. Lazy load routes und heavy components
3. Tree-shake unused imports
4. Externalize große Dependencies

### Deployment

**Q: Wie handle ich Environment-spezifische Configs?**  
A: Nutze `.env` Files und Vite's import.meta.env. Niemals Secrets committen!

**Q: Welche Browser werden unterstützt?**  
A: Modern browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+). Kein IE11 Support.

### Troubleshooting

**Q: Build schlägt fehl mit "out of memory"**  
A: Erhöhe Node memory: `NODE_OPTIONS="--max-old-space-size=4096" npm run build`

**Q: TypeScript ist langsam im Editor**  
A: 
1. Nutze TypeScript 5.0+ (performance improvements)
2. Aktiviere `"typescript.tsserver.experimental.enableProjectDiagnostics": false`
3. Exclude node_modules in tsconfig

---

**Letzte Aktualisierung**: Mai 2025  
**Maintainer**: Development Team  
**Contributions**: Bitte halte dieses Dokument aktuell!