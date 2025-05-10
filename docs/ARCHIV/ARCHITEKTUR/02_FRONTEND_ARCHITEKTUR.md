# Komponenten-Architektur für Vue 3 SFC

Dieses Dokument beschreibt die Architektur und Organisation der Vue 3 Single File Components (SFC) für den nscale DMS Assistenten.

## Übersicht

Die Anwendung ist nach dem Komponenten-Prinzip aufgebaut, wobei jede Komponente eine klar definierte Verantwortlichkeit hat. Wir verwenden die Composition API von Vue 3, um Logik in wiederverwendbare Funktionen auszulagern.

## Komponenten-Hierarchie

```
App.vue
├── Layout-Komponenten
│   ├── MainLayout.vue
│   ├── AdminLayout.vue
│   └── AuthLayout.vue
│
├── Seiten-Komponenten
│   ├── LoginView.vue
│   ├── ChatView.vue
│   ├── AdminView.vue
│   └── SettingsView.vue
│
├── Feature-Komponenten
│   ├── Chat
│   │   ├── ChatContainer.vue
│   │   ├── MessageList.vue
│   │   ├── MessageItem.vue
│   │   └── MessageInput.vue
│   │
│   ├── Session
│   │   ├── SessionList.vue
│   │   ├── SessionItem.vue
│   │   └── NewSessionButton.vue
│   │
│   ├── Admin
│   │   ├── UserManagement.vue
│   │   ├── SystemSettings.vue
│   │   └── StatisticsPanel.vue
│   │
│   └── DocConverter
│       ├── DocConverterContainer.vue
│       ├── FileUpload.vue
│       ├── ConversionProgress.vue
│       └── ResultDisplay.vue
│
└── Basis-Komponenten
    ├── Button.vue
    ├── Input.vue
    ├── Card.vue
    ├── Modal.vue
    ├── Dropdown.vue
    ├── Tabs.vue
    └── ErrorBoundary.vue
```

## Komponenten-Kategorien

### 1. Layout-Komponenten

Verantwortlich für die grundlegende Seitenstruktur und die Anordnung von Inhalten.

```vue
<!-- MainLayout.vue -->
<template>
  <div class="main-layout">
    <header-component />
    <div class="main-content">
      <sidebar-component v-if="showSidebar" />
      <main class="content-area">
        <slot />
      </main>
    </div>
    <footer-component v-if="showFooter" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useUIStore } from '@/stores/ui';
import HeaderComponent from '@/components/header/HeaderComponent.vue';
import SidebarComponent from '@/components/sidebar/SidebarComponent.vue';
import FooterComponent from '@/components/footer/FooterComponent.vue';

const route = useRoute();
const uiStore = useUIStore();

// Bestimme, ob Sidebar angezeigt werden soll
const showSidebar = computed(() => {
  return !route.meta.hideSidebar && uiStore.isSidebarVisible;
});

// Bestimme, ob Footer angezeigt werden soll
const showFooter = computed(() => {
  return !route.meta.hideFooter;
});
</script>
```

### 2. Seiten-Komponenten

Repräsentieren die verschiedenen Seiten der Anwendung, die über den Router zugänglich sind.

```vue
<!-- ChatView.vue -->
<template>
  <div class="chat-view">
    <chat-container 
      :session-id="sessionId"
      @session-change="handleSessionChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSessionStore } from '@/stores/sessions';
import ChatContainer from '@/components/chat/ChatContainer.vue';

const route = useRoute();
const router = useRouter();
const sessionStore = useSessionStore();

const sessionId = ref<string>('');

// Initialisiere sessionId aus der Route
onMounted(async () => {
  if (route.params.id) {
    sessionId.value = route.params.id as string;
  } else if (sessionStore.sessions.length > 0) {
    // Wenn keine Session-ID in der Route, verwende die erste verfügbare Session
    sessionId.value = sessionStore.sessions[0].id;
    router.replace(`/session/${sessionId.value}`);
  } else {
    // Wenn keine Sessions vorhanden, erstelle eine neue
    const newSessionId = await sessionStore.createSession();
    if (newSessionId) {
      sessionId.value = newSessionId;
      router.replace(`/session/${newSessionId}`);
    }
  }
});

// Aktualisiere sessionId, wenn sich die Route ändert
watch(() => route.params.id, (newId) => {
  if (newId) {
    sessionId.value = newId as string;
  }
});

// Handler für Session-Wechsel
function handleSessionChange(newSessionId: string) {
  router.push(`/session/${newSessionId}`);
}
</script>
```

### 3. Feature-Komponenten

Implementieren spezifische Funktionen der Anwendung und bilden die Kern-Geschäftslogik ab.

```vue
<!-- ChatContainer.vue -->
<template>
  <div class="chat-container">
    <message-list 
      :messages="messages" 
      :is-loading="isLoading"
      :is-streaming="isStreaming"
      ref="messageListRef"
    />
    
    <message-input 
      :disabled="isLoading || isStreaming" 
      @send="sendMessage"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { useSessionStore } from '@/stores/sessions';
import { useChat } from '@/composables/useChat';
import MessageList from './MessageList.vue';
import MessageInput from './MessageInput.vue';

const props = defineProps<{
  sessionId: string;
}>();

const messageListRef = ref<InstanceType<typeof MessageList> | null>(null);
const { 
  messages, 
  isLoading, 
  isStreaming, 
  sendMessage: sendChatMessage, 
  loadMessages 
} = useChat();

// Nachrichten laden, wenn sich die Session ändert
watch(() => props.sessionId, (newSessionId) => {
  if (newSessionId) {
    loadMessages(newSessionId);
  }
}, { immediate: true });

// Nach unten scrollen, wenn neue Nachrichten ankommen
watch(() => messages.value.length, async () => {
  await nextTick();
  scrollToBottom();
}, { flush: 'post' });

// Nach unten scrollen
function scrollToBottom() {
  if (messageListRef.value?.scrollToBottom) {
    messageListRef.value.scrollToBottom();
  }
}

// Nachricht senden
function sendMessage(content: string) {
  if (!props.sessionId || !content.trim()) return;
  
  sendChatMessage(props.sessionId, content);
  scrollToBottom();
}
</script>
```

### 4. Basis-Komponenten

Bilden die grundlegenden UI-Bausteine, die in der gesamten Anwendung wiederverwendet werden.

```vue
<!-- Button.vue -->
<template>
  <button
    :class="[
      'nscale-btn',
      `nscale-btn--${variant}`,
      { 'nscale-btn--loading': loading, 'nscale-btn--full': fullWidth }
    ]"
    :disabled="disabled || loading"
    :type="type"
    @click="$emit('click', $event)"
  >
    <span v-if="loading" class="nscale-btn__loader"></span>
    <slot></slot>
  </button>
</template>

<script setup lang="ts">
defineProps({
  variant: {
    type: String,
    default: 'primary',
    validator: (value: string) => 
      ['primary', 'secondary', 'tertiary', 'danger', 'ghost'].includes(value)
  },
  type: {
    type: String,
    default: 'button'
  },
  disabled: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  },
  fullWidth: {
    type: Boolean,
    default: false
  }
});

defineEmits(['click']);
</script>

<style scoped>
.nscale-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: var(--nscale-border-radius, 4px);
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  outline: none;
  position: relative;
}

.nscale-btn--primary {
  background-color: var(--nscale-primary, #00a550);
  color: white;
}

.nscale-btn--primary:hover:not(:disabled) {
  background-color: var(--nscale-primary-dark, #009046);
}

.nscale-btn--secondary {
  background-color: transparent;
  color: var(--nscale-text, #333333);
  border: 1px solid var(--nscale-border, #e5e5e5);
}

.nscale-btn--secondary:hover:not(:disabled) {
  background-color: var(--nscale-gray, #f7f7f7);
}

.nscale-btn--danger {
  background-color: var(--nscale-danger, #dc3545);
  color: white;
}

.nscale-btn--danger:hover:not(:disabled) {
  background-color: var(--nscale-danger-dark, #c82333);
}

.nscale-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.nscale-btn--loading {
  color: transparent;
}

.nscale-btn--full {
  width: 100%;
}

.nscale-btn__loader {
  position: absolute;
  top: calc(50% - 8px);
  left: calc(50% - 8px);
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
```

## Kompositions-Muster

Wir verwenden die folgenden Kompositions-Muster, um Logik zu kapseln und wiederzuverwenden:

### 1. Composables

Wiederverwendbare Logik, die von mehreren Komponenten genutzt wird.

```typescript
// composables/useChat.ts
import { ref, watch, computed } from 'vue';
import { useSessionStore } from '@/stores/sessions';
import type { Message } from '@/types';

export function useChat() {
  const sessionStore = useSessionStore();
  
  // Lokaler Zustand für optimistisches UI-Verhalten
  const localMessages = ref<Message[]>([]);
  const isLoading = ref(false);
  const isStreaming = ref(false);
  const error = ref<Error | null>(null);
  
  // Kombiniere Store-Messages mit lokalen Messages für optimistisches UI
  const messages = computed(() => {
    return [...sessionStore.messages, ...localMessages.value];
  });
  
  // Synchronisiere, wenn Store-Messages sich ändern
  watch(() => sessionStore.messages, (newMessages) => {
    // Entferne lokale Messages, die jetzt im Store sind
    const storeMessageIds = new Set(newMessages.map(m => m.id));
    localMessages.value = localMessages.value.filter(m => !storeMessageIds.has(m.id));
  }, { deep: true });
  
  // Nachrichten für eine Session laden
  async function loadMessages(sessionId: string) {
    isLoading.value = true;
    error.value = null;
    
    try {
      await sessionStore.loadMessages(sessionId);
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Fehler beim Laden der Nachrichten');
      console.error('Chat-Fehler:', error.value);
    } finally {
      isLoading.value = false;
    }
  }
  
  // Nachricht senden mit optimistischem UI-Update
  async function sendMessage(sessionId: string, content: string) {
    if (!sessionId || !content.trim()) return;
    
    const tempId = `temp-${Date.now()}`;
    
    // Optimistisch lokale Nachricht hinzufügen
    const tempMessage: Message = {
      id: tempId,
      sessionId,
      role: 'user',
      content,
      timestamp: new Date()
    };
    
    localMessages.value.push(tempMessage);
    isStreaming.value = true;
    
    try {
      await sessionStore.sendMessage(sessionId, content);
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Fehler beim Senden der Nachricht');
      console.error('Chat-Fehler:', error.value);
      
      // Entferne die optimistische Nachricht bei Fehler
      localMessages.value = localMessages.value.filter(m => m.id !== tempId);
    } finally {
      isStreaming.value = false;
    }
  }
  
  return {
    messages,
    isLoading,
    isStreaming,
    error,
    loadMessages,
    sendMessage
  };
}
```

### 2. Direktiven

Benutzerdefinierte Vue-Direktiven für DOM-Manipulation.

```typescript
// directives/clickOutside.ts
import type { Directive } from 'vue';

interface ClickOutsideElement extends HTMLElement {
  _clickOutsideHandler?: (event: MouseEvent) => void;
}

export const clickOutside: Directive = {
  mounted(el: ClickOutsideElement, binding) {
    el._clickOutsideHandler = (event: MouseEvent) => {
      // Prüfe, ob das Event-Target außerhalb des Elements liegt
      if (!(el === event.target || el.contains(event.target as Node))) {
        binding.value(event);
      }
    };
    
    document.addEventListener('click', el._clickOutsideHandler);
  },
  
  unmounted(el: ClickOutsideElement) {
    if (el._clickOutsideHandler) {
      document.removeEventListener('click', el._clickOutsideHandler);
      delete el._clickOutsideHandler;
    }
  }
};

// main.ts
import { createApp } from 'vue';
import App from './App.vue';
import { clickOutside } from './directives/clickOutside';

const app = createApp(App);
app.directive('click-outside', clickOutside);
app.mount('#app');
```

### 3. Plugins

Erweiterungen für die Vue-Anwendung.

```typescript
// plugins/errorHandler.ts
import type { App } from 'vue';
import { useErrorStore } from '@/stores/error';

export default {
  install: (app: App) => {
    const errorStore = useErrorStore();
    
    // Globaler Fehlerhandler
    app.config.errorHandler = (err, instance, info) => {
      console.error('Vue-Fehler:', err);
      
      // Fehler im Store speichern
      errorStore.setError({
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        info,
        timestamp: new Date()
      });
      
      // Optional Fehler-Reporting-Service informieren
      // reportError(err);
    };
    
    // Globales Mixin für Fehler-Handling in Komponenten
    app.mixin({
      methods: {
        handleError(err: unknown) {
          const error = err instanceof Error ? err : new Error(String(err));
          console.error('Komponenten-Fehler:', error);
          
          errorStore.setError({
            message: error.message,
            stack: error.stack,
            info: 'Benutzerinteraktion',
            timestamp: new Date()
          });
          
          // Feedback für den Benutzer
          return error;
        }
      }
    });
  }
};
```

## Pinia Stores

Stores werden verwendet, um globalen Zustand zu verwalten und die Geschäftslogik von der Benutzeroberfläche zu trennen.

```typescript
// stores/sessions.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Session, Message } from '@/types';
import { apiService } from '@/services/api';

export const useSessionStore = defineStore('sessions', () => {
  // State
  const sessions = ref<Session[]>([]);
  const currentSessionId = ref<string | null>(null);
  const messages = ref<Message[]>([]);
  const isLoading = ref(false);
  
  // Getters
  const currentSession = computed(() => 
    sessions.value.find(s => s.id === currentSessionId.value) || null
  );
  
  const sortedSessions = computed(() => {
    return [...sessions.value].sort((a, b) => {
      // Sortiere nach letzter Aktivität absteigend
      return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
    });
  });
  
  // Actions
  async function fetchSessions() {
    isLoading.value = true;
    
    try {
      const response = await apiService.get('/api/sessions');
      sessions.value = response.data;
      
      if (sessions.value.length > 0 && !currentSessionId.value) {
        currentSessionId.value = sessions.value[0].id;
      }
    } catch (error) {
      console.error('Fehler beim Laden der Sitzungen:', error);
      throw error;
    } finally {
      isLoading.value = false;
    }
  }
  
  async function createSession(title = 'Neue Unterhaltung') {
    try {
      const response = await apiService.post('/api/sessions', { title });
      const newSession: Session = response.data;
      
      sessions.value.unshift(newSession);
      currentSessionId.value = newSession.id;
      messages.value = [];
      
      return newSession.id;
    } catch (error) {
      console.error('Fehler beim Erstellen einer Sitzung:', error);
      throw error;
    }
  }
  
  async function loadMessages(sessionId: string) {
    if (!sessionId) return;
    
    isLoading.value = true;
    currentSessionId.value = sessionId;
    messages.value = [];
    
    try {
      const response = await apiService.get(`/api/sessions/${sessionId}/messages`);
      messages.value = response.data;
    } catch (error) {
      console.error('Fehler beim Laden der Nachrichten:', error);
      throw error;
    } finally {
      isLoading.value = false;
    }
  }
  
  async function sendMessage(sessionId: string, content: string) {
    if (!sessionId || !content.trim()) return;
    
    try {
      const response = await apiService.post(`/api/sessions/${sessionId}/messages`, {
        content,
        role: 'user'
      });
      
      const { userMessage, assistantMessage, updatedSession } = response.data;
      
      // Füge Benutzernachricht hinzu, falls noch nicht vorhanden
      if (userMessage && !messages.value.some(m => m.id === userMessage.id)) {
        messages.value.push(userMessage);
      }
      
      // Füge Assistentenantwort hinzu
      if (assistantMessage) {
        messages.value.push(assistantMessage);
      }
      
      // Aktualisiere Sitzungsinformationen
      if (updatedSession) {
        const index = sessions.value.findIndex(s => s.id === updatedSession.id);
        if (index !== -1) {
          sessions.value[index] = updatedSession;
        }
      }
    } catch (error) {
      console.error('Fehler beim Senden der Nachricht:', error);
      throw error;
    }
  }
  
  return {
    // State
    sessions,
    currentSessionId,
    messages,
    isLoading,
    
    // Getters
    currentSession,
    sortedSessions,
    
    // Actions
    fetchSessions,
    createSession,
    loadMessages,
    sendMessage
  };
});
```

## Design-Patterns

### 1. Container/Präsentations-Komponenten

Trennung von Datenverarbeitung (Container) und Darstellung (Präsentation).

**Container-Komponente (ChatContainer.vue):**
```vue
<template>
  <div class="chat-container">
    <message-list 
      :messages="messages" 
      :is-loading="isLoading" 
      :is-streaming="isStreaming"
    />
    <message-input 
      :disabled="isInputDisabled" 
      @send="sendMessage"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useChat } from '@/composables/useChat';
import MessageList from './MessageList.vue'; // Präsentationskomponente
import MessageInput from './MessageInput.vue'; // Präsentationskomponente

const props = defineProps<{
  sessionId: string;
}>();

const { 
  messages, 
  isLoading, 
  isStreaming, 
  sendMessage: sendChatMessage, 
  loadMessages 
} = useChat();

const isInputDisabled = computed(() => isLoading.value || isStreaming.value);

// Nachrichten laden
loadMessages(props.sessionId);

// Nachricht senden
function sendMessage(content: string) {
  sendChatMessage(props.sessionId, content);
}
</script>
```

**Präsentations-Komponente (MessageList.vue):**
```vue
<template>
  <div class="message-list" ref="container">
    <div v-if="isLoading" class="message-list__loading">
      <spinner />
      <p>Nachrichten werden geladen...</p>
    </div>
    
    <div v-else-if="messages.length === 0" class="message-list__empty">
      <p>Keine Nachrichten vorhanden. Starten Sie eine Konversation!</p>
    </div>
    
    <template v-else>
      <message-item 
        v-for="message in messages" 
        :key="message.id" 
        :message="message"
      />
      
      <div v-if="isStreaming" class="message-list__typing">
        <typing-indicator />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUpdated, defineProps } from 'vue';
import type { Message } from '@/types';
import MessageItem from './MessageItem.vue';
import Spinner from '@/components/common/Spinner.vue';
import TypingIndicator from '@/components/common/TypingIndicator.vue';

defineProps<{
  messages: Message[];
  isLoading: boolean;
  isStreaming: boolean;
}>();

const container = ref<HTMLElement | null>(null);

// Nach unten scrollen, wenn neue Nachrichten ankommen
onMounted(() => {
  scrollToBottom();
});

onUpdated(() => {
  scrollToBottom();
});

function scrollToBottom() {
  if (container.value) {
    container.value.scrollTop = container.value.scrollHeight;
  }
}
</script>
```

### 2. Adapter-Pattern

Anpassung unterschiedlicher Schnittstellen an gemeinsame Nutzung.

```typescript
// services/api/DocumentConverterAdapter.ts
import type { DocumentConverterApi } from '@/types/documentConverter';
import { apiService } from './ApiService';

// Adapter für Document Converter API
export class DocumentConverterAdapter implements DocumentConverterApi {
  async uploadDocument(file: File, onProgress?: (progress: number) => void): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiService.uploadFile('/api/documents/upload', formData, {
      onProgress
    });
    
    return response.data.documentId;
  }
  
  async convertDocument(
    documentId: string, 
    settings?: any
  ): Promise<any> {
    const response = await apiService.post(`/api/documents/${documentId}/convert`, settings);
    return response.data;
  }
  
  async getDocumentStatus(documentId: string): Promise<any> {
    const response = await apiService.get(`/api/documents/${documentId}/status`);
    return response.data;
  }
  
  async getDocumentContent(documentId: string): Promise<any> {
    const response = await apiService.get(`/api/documents/${documentId}/content`);
    return response.data;
  }
  
  async getDocuments(): Promise<any[]> {
    const response = await apiService.get('/api/documents');
    return response.data;
  }
  
  async deleteDocument(documentId: string): Promise<void> {
    await apiService.delete(`/api/documents/${documentId}`);
  }
}

export const documentConverterApi = new DocumentConverterAdapter();
```

### 3. Strategy-Pattern

Austauschbare Algorithmen für unterschiedliche Implementierungen.

```typescript
// services/storage/StorageStrategy.ts
export interface StorageStrategy {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
  clear(): void;
}

// LocalStorageStrategy.ts
export class LocalStorageStrategy implements StorageStrategy {
  get<T>(key: string): T | null {
    const item = localStorage.getItem(key);
    if (item === null) return null;
    
    try {
      return JSON.parse(item) as T;
    } catch {
      return null;
    }
  }
  
  set<T>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value));
  }
  
  remove(key: string): void {
    localStorage.removeItem(key);
  }
  
  clear(): void {
    localStorage.clear();
  }
}

// SessionStorageStrategy.ts
export class SessionStorageStrategy implements StorageStrategy {
  get<T>(key: string): T | null {
    const item = sessionStorage.getItem(key);
    if (item === null) return null;
    
    try {
      return JSON.parse(item) as T;
    } catch {
      return null;
    }
  }
  
  set<T>(key: string, value: T): void {
    sessionStorage.setItem(key, JSON.stringify(value));
  }
  
  remove(key: string): void {
    sessionStorage.removeItem(key);
  }
  
  clear(): void {
    sessionStorage.clear();
  }
}

// StorageService.ts
export class StorageService {
  private strategy: StorageStrategy;
  
  constructor(strategy: StorageStrategy) {
    this.strategy = strategy;
  }
  
  setStrategy(strategy: StorageStrategy): void {
    this.strategy = strategy;
  }
  
  get<T>(key: string): T | null {
    return this.strategy.get<T>(key);
  }
  
  set<T>(key: string, value: T): void {
    this.strategy.set<T>(key, value);
  }
  
  remove(key: string): void {
    this.strategy.remove(key);
  }
  
  clear(): void {
    this.strategy.clear();
  }
}

// Verwendung
const storageService = new StorageService(new LocalStorageStrategy());

// Strategie bei Bedarf wechseln
if (needsTemporaryStorage) {
  storageService.setStrategy(new SessionStorageStrategy());
}
```

## Kommunikation zwischen Komponenten

### 1. Props und Events

Die Standardmethode für Eltern-Kind-Kommunikation.

```vue
<!-- Parent -->
<template>
  <child-component 
    :data="parentData" 
    @update="handleUpdate"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import ChildComponent from './ChildComponent.vue';

const parentData = ref('Initial data');

function handleUpdate(newValue: string) {
  parentData.value = newValue;
}
</script>

<!-- Child -->
<template>
  <div>
    <p>{{ data }}</p>
    <button @click="updateData">Update</button>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  data: string;
}>();

const emit = defineEmits<{
  (e: 'update', value: string): void;
}>();

function updateData() {
  emit('update', 'Updated data');
}
</script>
```

### 2. Provide/Inject

Für tief verschachtelte Komponenten, die auf gemeinsame Daten zugreifen müssen.

```vue
<!-- Root Component -->
<template>
  <div class="app">
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { ref, provide } from 'vue';
import { THEME_KEY } from '@/constants';

const theme = ref('light');

function toggleTheme() {
  theme.value = theme.value === 'light' ? 'dark' : 'light';
}

// Stellt Werte für Kindkomponenten bereit
provide(THEME_KEY, {
  theme,
  toggleTheme
});
</script>

<!-- Deeply Nested Component -->
<template>
  <button @click="toggleTheme" class="theme-toggle">
    {{ theme === 'light' ? 'Dark Mode' : 'Light Mode' }}
  </button>
</template>

<script setup lang="ts">
import { inject } from 'vue';
import { THEME_KEY } from '@/constants';

// Greift auf bereitgestellte Werte zu
const { theme, toggleTheme } = inject(THEME_KEY, {
  theme: ref('light'),
  toggleTheme: () => {}
});
</script>
```

### 3. Pinia Store

Für globalen Zustand und komponentenübergreifende Kommunikation.

```vue
<!-- Component A -->
<template>
  <div>
    <h2>User Profile</h2>
    <p v-if="isAuthenticated">
      Welcome, {{ user.name }}!
    </p>
    <p v-else>
      Please log in to continue.
    </p>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const isAuthenticated = computed(() => authStore.isAuthenticated);
const user = computed(() => authStore.user);
</script>

<!-- Component B (in another part of the app) -->
<template>
  <button @click="logout" v-if="isAuthenticated">
    Logout
  </button>
</template>

<script setup lang="ts">
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const isAuthenticated = computed(() => authStore.isAuthenticated);

function logout() {
  authStore.logout();
}
</script>
```

## Best Practices

### 1. TypeScript für alle Komponenten

Alle Komponenten sollten TypeScript verwenden, um Typensicherheit zu gewährleisten.

```vue
<script setup lang="ts">
import { ref, computed } from 'vue';
import type { PropType } from 'vue';
import type { User } from '@/types';

const props = defineProps({
  user: {
    type: Object as PropType<User>,
    required: true
  },
  roles: {
    type: Array as PropType<string[]>,
    default: () => []
  },
  isActive: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits<{
  (e: 'update:user', user: User): void;
  (e: 'delete', userId: string): void;
}>();

const isAdmin = computed(() => props.roles.includes('admin'));

function updateUserStatus(status: boolean) {
  const updatedUser: User = {
    ...props.user,
    isActive: status
  };
  
  emit('update:user', updatedUser);
}
</script>
```

### 2. Composables für wiederverwendbare Logik

Wiederverwendbare Logik sollte in Composables ausgelagert werden.

```typescript
// composables/useLocalStorage.ts
import { ref, watch } from 'vue';

export function useLocalStorage<T>(key: string, defaultValue: T) {
  // Lade gespeicherten Wert oder verwende Default
  const storedValue = localStorage.getItem(key);
  const initialValue = storedValue ? JSON.parse(storedValue) : defaultValue;
  
  const value = ref<T>(initialValue);
  
  // Speichere Änderungen im localStorage
  watch(value, (newValue) => {
    localStorage.setItem(key, JSON.stringify(newValue));
  }, { deep: true });
  
  // Lösche Wert im localStorage
  function removeValue() {
    localStorage.removeItem(key);
    value.value = defaultValue;
  }
  
  return {
    value,
    removeValue
  };
}

// Verwendung in Komponente
import { useLocalStorage } from '@/composables/useLocalStorage';

const { value: savedSettings, removeValue: clearSettings } = useLocalStorage('app-settings', {
  theme: 'light',
  notifications: true,
  language: 'de'
});
```

### 3. Async-Komponenten für Code-Splitting

Nutze asynchrone Komponenten für bessere Ladezeiten.

```typescript
// router/index.ts
import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: () => import('@/views/HomeView.vue')
    },
    {
      path: '/admin',
      component: () => import('@/views/AdminView.vue'),
      children: [
        {
          path: 'users',
          component: () => import('@/views/admin/UsersView.vue')
        },
        {
          path: 'settings',
          component: () => import('@/views/admin/SettingsView.vue')
        },
        {
          path: 'doc-converter',
          component: () => import('@/views/admin/DocConverterView.vue')
        }
      ]
    }
  ]
});

export default router;
```

### 4. Einheitliche Namenskonventionen

Verwende konsistente Namenskonventionen für Komponenten und Dateien.

- **Komponenten**: PascalCase mit beschreibenden Namen (z.B. `UserProfileCard.vue`)
- **Composables**: camelCase mit `use`-Präfix (z.B. `useUserSettings.ts`)
- **Stores**: camelCase mit Bereichspräfix (z.B. `authStore.ts`)
- **Typen**: PascalCase mit präzisen Namen (z.B. `UserProfileData.ts`)
- **Konstanten**: SNAKE_CASE für unveränderliche Werte (z.B. `API_ENDPOINTS.ts`)

## Fazit

Diese Komponenten-Architektur bietet eine solide Grundlage für die Vue 3 SFC-Migration des nscale DMS Assistenten. Durch die Kombination von klaren Komponenten-Grenzen, wiederverwendbarer Logik in Composables und globaler Zustandsverwaltung mit Pinia schaffen wir eine wartbare, erweiterbare und performante Anwendung.

---

Zuletzt aktualisiert: 10.05.2025