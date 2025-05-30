# Team Onboarding Guide - nscale DMS Assistant

## 🎯 Übersicht

Willkommen beim nscale DMS Assistant! Dieses Dokument führt neue Teammitglieder durch die wichtigsten Aspekte unserer Vue 3 + TypeScript Anwendung.

## 📚 Inhaltsverzeichnis

1. [Projekt-Übersicht](#projekt-übersicht)
2. [Entwicklungsumgebung](#entwicklungsumgebung)
3. [Architektur](#architektur)
4. [Coding Standards](#coding-standards)
5. [Development Workflow](#development-workflow)
6. [Testing](#testing)
7. [Performance Best Practices](#performance-best-practices)
8. [Häufige Aufgaben](#häufige-aufgaben)
9. [Troubleshooting](#troubleshooting)
10. [Weiterführende Ressourcen](#weiterführende-ressourcen)

## 🏗️ Projekt-Übersicht

### Was ist der nscale DMS Assistant?

Der nscale DMS Assistant ist eine KI-gestützte Chat-Anwendung, die Benutzern bei der Arbeit mit dem nscale Document Management System hilft. 

### Tech Stack

- **Frontend**: Vue 3.3+ mit Composition API
- **State Management**: Pinia
- **Routing**: Vue Router 4
- **Styling**: SCSS + CSS Variables
- **Build Tool**: Vite
- **Type System**: TypeScript 5.8+
- **Testing**: Vitest + Playwright
- **Backend**: FastAPI (Python)
- **AI Integration**: Ollama + LangChain

## 💻 Entwicklungsumgebung

### Voraussetzungen

```bash
# Node.js 18+ und npm 9+
node --version  # v18.0.0 oder höher
npm --version   # v9.0.0 oder höher

# Python 3.9+ (für Backend)
python --version  # Python 3.9 oder höher
```

### Initial Setup

```bash
# Repository klonen
git clone https://github.com/your-org/nscale-assist.git
cd nscale-assist/app

# Dependencies installieren
npm install

# Python Virtual Environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# oder
venv\Scripts\activate  # Windows

# Python Dependencies
pip install -r requirements.txt

# Entwicklungsserver starten
npm run dev
```

### IDE-Konfiguration

**Empfohlene VS Code Extensions:**
- Vue - Official
- TypeScript Vue Plugin (Volar)
- ESLint
- Prettier
- EditorConfig

**VS Code Settings** (`.vscode/settings.json`):
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "vue.codeActions.enabled": true
}
```

## 🏛️ Architektur

### Verzeichnisstruktur

```
app/
├── src/
│   ├── components/       # Vue-Komponenten
│   ├── composables/     # Vue Composables
│   ├── stores/          # Pinia Stores
│   ├── views/           # Route-Views
│   ├── router/          # Router-Konfiguration
│   ├── utils/           # Utility-Funktionen
│   ├── types/           # TypeScript-Definitionen
│   ├── assets/          # Statische Assets
│   └── bridge/          # Legacy-Bridge-System
├── api/                 # Backend API
├── docs/               # Dokumentation
├── public/             # Öffentliche Dateien
└── tests/              # Test-Dateien
```

### Wichtige Konzepte

#### 1. **Stores (Pinia)**
```typescript
// src/stores/sessions.ts
export const useSessionsStore = defineStore('sessions', () => {
  // State
  const sessions = ref<ChatSession[]>([]);
  
  // Getters
  const currentSession = computed(() => 
    sessions.value.find(s => s.id === currentSessionId.value)
  );
  
  // Actions
  async function createSession(title: string) {
    // Implementation
  }
  
  return { sessions, currentSession, createSession };
});
```

#### 2. **Composables**
```typescript
// src/composables/useChat.ts
export function useChat() {
  const sessionsStore = useSessionsStore();
  const { enqueue } = useBatchUpdates(processMessages);
  
  async function sendMessage(content: string) {
    // Implementation mit Batch-Updates
  }
  
  return { sendMessage };
}
```

#### 3. **Performance-Optimierungen**
- **Shallow Reactivity** für große Datenlisten
- **Batch Updates** für Streaming-Nachrichten
- **Virtual Scrolling** für Message-Listen
- **Memoization** für teure Berechnungen

## 📝 Coding Standards

### TypeScript Guidelines

1. **Explizite Typen verwenden**:
```typescript
// ✅ Gut
function calculateTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// ❌ Vermeiden
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}
```

2. **Interfaces über Type Aliases**:
```typescript
// ✅ Gut
interface User {
  id: string;
  name: string;
  email: string;
}

// ⚠️ Nur für Union Types
type Status = 'pending' | 'active' | 'inactive';
```

### Vue Best Practices

1. **Composition API mit `<script setup>`**:
```vue
<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps<{
  title: string;
  count?: number;
}>();

const emit = defineEmits<{
  'update': [value: number];
}>();
</script>
```

2. **Component Naming**:
- PascalCase für SFC-Namen: `UserProfile.vue`
- Kebab-case in Templates: `<user-profile />`
- Prefix für Base-Components: `BaseButton.vue`

### CSS/SCSS Guidelines

1. **CSS Variables für Theming**:
```scss
:root {
  --primary-color: #3b82f6;
  --text-primary: #111827;
  --spacing-unit: 0.25rem;
}
```

2. **BEM-ähnliche Klassennamen**:
```scss
.chat-message {
  &__header { }
  &__content { }
  &--streaming { }
}
```

## 🔄 Development Workflow

### Git Workflow

1. **Branch-Naming**:
   - Features: `feature/add-user-profile`
   - Fixes: `fix/streaming-message-bug`
   - Chores: `chore/update-dependencies`

2. **Commit-Messages**:
```bash
# Format: <type>(<scope>): <subject>
feat(chat): Add message reactions
fix(auth): Resolve login timeout issue
docs(api): Update endpoint documentation
```

3. **Pull Request Process**:
   - Erstelle PR gegen `develop` Branch
   - Mindestens 1 Review erforderlich
   - Alle CI-Checks müssen grün sein
   - Squash & Merge verwenden

### CI/CD Pipeline

Automatische Checks bei jedem Push:
- ✅ ESLint & TypeScript
- ✅ Unit & Integration Tests
- ✅ E2E Tests (Playwright)
- ✅ Build Validation
- ✅ Security Audit
- ✅ Dead Code Detection

## 🧪 Testing

### Test-Struktur

```bash
tests/
├── unit/           # Unit Tests (Vitest)
├── integration/    # Integration Tests
├── e2e/           # End-to-End Tests (Playwright)
└── performance/   # Performance Tests
```

### Unit Test Beispiel

```typescript
// tests/unit/stores/sessions.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useSessionsStore } from '@/stores/sessions';

describe('Sessions Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('creates a new session', async () => {
    const store = useSessionsStore();
    const sessionId = await store.createSession('Test Session');
    
    expect(store.sessions).toHaveLength(1);
    expect(store.sessions[0].title).toBe('Test Session');
  });
});
```

### Test-Befehle

```bash
# Unit Tests
npm run test:unit

# E2E Tests
npm run test:e2e

# Alle Tests mit Coverage
npm run test:coverage

# Performance Tests
npm run test:performance
```

## ⚡ Performance Best Practices

### 1. Shallow Reactivity für große Listen

```typescript
import { useShallowArray } from '@/composables/useShallowReactivity';

// Für Message-Listen mit 1000+ Einträgen
const [messages, messageBatch] = useShallowArray<ChatMessage>();

// Batch-Updates für Streaming
messageBatch.add(newMessage);
```

### 2. Virtual Scrolling

```vue
<OptimizedMessageList
  :messages="messages"
  :item-height="120"
  :buffer-size="10"
/>
```

### 3. Memoization

```typescript
import { useMemoizedComputed } from '@/composables/useMemoizedComputed';

// Teure Berechnungen cachen
const expensiveResult = useMemoizedComputed(
  () => processLargeDataset(data.value),
  [data], // Dependencies
  { ttl: 60000 } // 1 Minute Cache
);
```

### 4. Performance Monitoring

```typescript
// In Development
import { usePerformanceMonitor } from '@/utils/PerformanceMonitor';

const { metrics, isHealthy } = usePerformanceMonitor();

watch(metrics, (newMetrics) => {
  if (newMetrics.fps < 30) {
    console.warn('Performance degradation detected');
  }
});
```

## 🛠️ Häufige Aufgaben

### Neue Komponente erstellen

```bash
# 1. Komponente erstellen
touch src/components/features/UserAvatar.vue

# 2. Basis-Template
```

```vue
<template>
  <div class="user-avatar">
    <!-- Component content -->
  </div>
</template>

<script setup lang="ts">
interface Props {
  userId: string;
  size?: 'sm' | 'md' | 'lg';
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md'
});

// Component logic
</script>

<style scoped lang="scss">
.user-avatar {
  // Styles
}
</style>
```

### Neuen Store hinzufügen

```typescript
// src/stores/notifications.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useNotificationsStore = defineStore('notifications', () => {
  const notifications = ref<Notification[]>([]);
  
  const unreadCount = computed(() => 
    notifications.value.filter(n => !n.read).length
  );
  
  function addNotification(notification: Notification) {
    notifications.value.push(notification);
  }
  
  return {
    notifications,
    unreadCount,
    addNotification
  };
});
```

### API-Endpoint hinzufügen

```python
# api/server.py
from fastapi import APIRouter

router = APIRouter()

@router.get("/api/users/{user_id}")
async def get_user(user_id: str):
    # Implementation
    return {"id": user_id, "name": "User"}
```

## 🐛 Troubleshooting

### Häufige Probleme

#### 1. **TypeScript-Fehler nach Updates**
```bash
# Cache löschen und neu builden
rm -rf node_modules/.vite
npm run typecheck
```

#### 2. **Hot Module Replacement funktioniert nicht**
```bash
# Vite neustarten
npm run dev -- --force
```

#### 3. **Store-Updates werden nicht reflektiert**
- Prüfe, ob Shallow Reactivity verwendet wird
- Nutze `triggerRef()` für manuelle Updates
- Verwende Batch-Updates für bessere Performance

#### 4. **Performance-Probleme**
1. Öffne Performance Dashboard (nur in Development)
2. Prüfe FPS und Memory-Nutzung
3. Identifiziere langsame Komponenten
4. Implementiere Virtual Scrolling oder Memoization

### Debug-Tools

```typescript
// Store-Debugging
const store = useSessionsStore();
console.log(store.$state);

// Router-Debugging
const router = useRouter();
console.log(router.currentRoute.value);

// Performance-Debugging
if (import.meta.env.DEV) {
  window.__PERFORMANCE_MONITOR__ = usePerformanceMonitor();
}
```

## 📖 Weiterführende Ressourcen

### Interne Dokumentation

- [Architecture Overview](./ARCHITECTURE.md)
- [API Documentation](./API_DOCUMENTATION.md)
- [Security Guidelines](./SECURITY.md)
- [Deployment Guide](./DEPLOYMENT.md)

### Externe Ressourcen

- [Vue 3 Documentation](https://vuejs.org/)
- [Pinia Documentation](https://pinia.vuejs.org/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/)
- [Vite Guide](https://vitejs.dev/guide/)

### Team-Kontakte

- **Tech Lead**: Martin Schmidt
- **Frontend Lead**: [Name]
- **Backend Lead**: [Name]
- **DevOps**: [Name]

### Slack-Channels

- `#nscale-assist-dev` - Allgemeine Entwicklung
- `#nscale-assist-support` - Support-Anfragen
- `#nscale-assist-releases` - Release-Ankündigungen

## 🎓 Onboarding-Checkliste

- [ ] Entwicklungsumgebung eingerichtet
- [ ] Zugriff auf alle benötigten Repositories
- [ ] VS Code mit empfohlenen Extensions konfiguriert
- [ ] Erste erfolgreiche Builds (Frontend & Backend)
- [ ] Tests lokal ausgeführt
- [ ] Dokumentation durchgelesen
- [ ] Ersten kleinen Bug-Fix oder Feature implementiert
- [ ] Code Review Process verstanden
- [ ] Team-Mitglieder kennengelernt

---

**Willkommen im Team!** Bei Fragen zögere nicht, dich an deine Kollegen zu wenden. Wir freuen uns auf deine Beiträge! 🚀