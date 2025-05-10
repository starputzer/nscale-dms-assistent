---
title: "State Management mit Pinia"
version: "2.0.0"
date: "10.05.2025"
lastUpdate: "10.05.2025"
author: "Martin Heinrich"
status: "Aktiv"
priority: "Hoch"
category: "Referenzen"
tags: ["Pinia", "Store", "State Management", "Vue 3", "Composables", "Persistenz", "Bridge", "Performance"]
---

# State Management mit Pinia

> **Letzte Aktualisierung:** 10.05.2025 | **Version:** 2.0.0 | **Status:** Aktiv

## Übersicht

Dieses Dokument beschreibt die State-Management-Architektur des nscale DMS Assistenten, die auf Pinia basiert. Die Architektur ersetzt das bisherige System mit direkten reaktiven Referenzen und Prop-Passing durch einen zentralisierten, typensicheren State-Management-Ansatz.

Die Architektur besteht aus folgenden Hauptkomponenten:

- **Stores**: Zentrale Zustandsspeicher für verschiedene Domänen der Anwendung
- **Composables**: Hooks für einfachen Zugriff auf Store-Funktionalität in Komponenten
- **Persistenz**: Optimierte Speicherung von Zuständen mit selektiver Speicherung
- **Legacy-Bridge**: Verbesserte Schnittstelle für nahtlose Integration des Legacy-Codes
- **Feature-Toggles**: Steuerung der schrittweisen Aktivierung neuer Features

## Store-Struktur

```
src/
├── stores/
│   ├── index.ts                # Pinia-Konfiguration
│   ├── auth.ts                 # Authentifizierung & Benutzer
│   ├── sessions.ts             # Chat-Sessions & Nachrichten
│   ├── ui.ts                   # UI-Zustand
│   ├── settings.ts             # Benutzereinstellungen
│   └── featureToggles.ts       # Feature-Flagging
├── composables/
│   ├── useAuth.ts              # Auth-Hook
│   ├── useChat.ts              # Chat-Hook
│   ├── useUI.ts                # UI-Hook
│   ├── useSettings.ts          # Settings-Hook
│   ├── useFeatureToggles.ts    # Feature-Control-Hook
│   └── useNScale.ts            # Kombinierter Hook
└── bridge/
    ├── index.ts                # Legacy-Bridge-Implementierung
    ├── setup.ts                # Bridge-Konfiguration
    └── storeBridge.ts          # Store-spezifische Bridge
```

## Pinia-Konfiguration

Die zentrale Pinia-Konfiguration erfolgt in `src/stores/index.ts`:

```typescript
// src/stores/index.ts
import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';

// Pinia erstellen
const pinia = createPinia();

// Plugin für lokale Persistenz einbinden
pinia.use(piniaPluginPersistedstate);

// Plugins für zusätzliche Funktionalität
pinia.use(({ store }) => {
  // Metadaten und Debugging-Informationen hinzufügen
  store.$meta = {
    createdAt: new Date().toISOString(),
    id: store.$id
  };
  
  // Debugging-Methoden
  if (process.env.NODE_ENV === 'development') {
    store.$debug = {
      log: (...args) => console.log(`[${store.$id}]`, ...args),
      resetState: () => store.$reset()
    };
  }
});

export default pinia;
```

## Optimierte Store-Implementierungen

### Auth-Store

Der Auth-Store verwaltet die Benutzerauthentifizierung mit verbesserten Funktionen:

```typescript
// src/stores/auth.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { User, LoginCredentials } from '@/types/auth';

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<User | null>(null);
  const token = ref<string | null>(null);
  const refreshToken = ref<string | null>(null);
  const expiresAt = ref<number | null>(null);
  const isLoading = ref<boolean>(false);
  const error = ref<string | null>(null);
  const tokenRefreshInProgress = ref<boolean>(false);
  const lastTokenRefresh = ref<number>(0);
  const version = ref<number>(1);
  
  // Getters
  const isAuthenticated = computed<boolean>(() => {
    return !!token.value && !!user.value && (expiresAt.value || 0) > Date.now();
  });
  
  const isAdmin = computed<boolean>(() => {
    return !!user.value?.roles.includes('admin');
  });
  
  const isExpired = computed<boolean>(() => {
    if (!expiresAt.value) return true;
    // Token als abgelaufen betrachten, wenn er in weniger als 5 Minuten abläuft
    return expiresAt.value < (Date.now() + 5 * 60 * 1000);
  });
  
  const tokenExpiresIn = computed<number>(() => {
    if (!expiresAt.value) return 0;
    return Math.max(0, expiresAt.value - Date.now());
  });
  
  // Actions
  async function login(credentials: LoginCredentials): Promise<boolean> {
    isLoading.value = true;
    error.value = null;
    
    try {
      // API-Aufruf für Login
      const response = await api.post('/auth/login', credentials);
      
      if (response.data.success) {
        // Speichern der Authentifizierungsdaten
        user.value = response.data.user;
        token.value = response.data.token;
        refreshToken.value = response.data.refreshToken || null;
        expiresAt.value = Date.now() + (response.data.expiresIn || 60 * 60 * 1000);
        
        return true;
      } else {
        error.value = response.data.message || 'Login fehlgeschlagen';
        return false;
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err);
      return false;
    } finally {
      isLoading.value = false;
    }
  }
  
  async function logout(): Promise<void> {
    if (token.value) {
      try {
        // Optionaler API-Aufruf zum Invalidieren des Tokens
        await api.post('/auth/logout', {
          refreshToken: refreshToken.value
        });
      } catch (err) {
        // Fehler beim Logout ignorieren
        console.warn('Fehler beim Server-Logout:', err);
      }
    }
    
    // Lokalen State zurücksetzen
    user.value = null;
    token.value = null;
    refreshToken.value = null;
    expiresAt.value = null;
    error.value = null;
  }
  
  async function refreshTokenIfNeeded(): Promise<boolean> {
    // Logik für Token-Refresh...
    return true;
  }
  
  // Weitere Actions...
  
  return {
    // State
    user,
    token,
    refreshToken,
    expiresAt,
    isLoading,
    error,
    version,
    
    // Getters
    isAuthenticated,
    isAdmin,
    isExpired,
    tokenExpiresIn,
    
    // Actions
    login,
    logout,
    refreshTokenIfNeeded,
    // Weitere Methoden...
  };
}, {
  persist: {
    storage: localStorage,
    paths: ['token', 'refreshToken', 'expiresAt', 'user', 'version']
  }
});
```

### Sessions-Store

Der Sessions-Store bietet optimierte Verwaltung von Chat-Sessions und Nachrichten:

```typescript
// src/stores/sessions.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { ChatSession, ChatMessage } from '@/types/session';

export const useSessionsStore = defineStore('sessions', () => {
  // State
  const sessions = ref<ChatSession[]>([]);
  const currentSessionId = ref<string | null>(null);
  const messages = ref<Record<string, ChatMessage[]>>({});
  const pendingMessages = ref<Record<string, ChatMessage[]>>({});
  const isLoading = ref<boolean>(false);
  const error = ref<string | null>(null);
  const version = ref<number>(2);
  const streaming = ref({
    isActive: false,
    progress: 0,
    currentSessionId: null as string | null
  });
  
  // Getters
  const currentSession = computed<ChatSession | null>(() => {
    if (!currentSessionId.value) return null;
    return sessions.value.find(s => s.id === currentSessionId.value) || null;
  });
  
  const currentMessages = computed<ChatMessage[]>(() => {
    if (!currentSessionId.value) return [];
    return [...(messages.value[currentSessionId.value] || [])];
  });
  
  const hasPendingMessages = computed<boolean>(() => {
    return Object.values(pendingMessages.value).some(msgs => msgs.length > 0);
  });
  
  // Sortierte Sessions (neueste zuerst)
  const sortedSessions = computed<ChatSession[]>(() => {
    return [...sessions.value].sort((a, b) => {
      // Angeheftete Sessions zuerst
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      
      // Dann nach Aktualisierungszeitpunkt
      const dateA = new Date(a.updatedAt).getTime();
      const dateB = new Date(b.updatedAt).getTime();
      return dateB - dateA;
    });
  });
  
  // Actions
  async function fetchSessions(): Promise<void> {
    isLoading.value = true;
    error.value = null;
    
    try {
      const response = await api.get('/sessions');
      
      if (response.data.success) {
        sessions.value = response.data.data;
        
        // Wenn keine aktive Session, die neueste auswählen
        if (!currentSessionId.value && sessions.value.length > 0) {
          const [newestSession] = [...sessions.value].sort((a, b) => {
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
          });
          
          currentSessionId.value = newestSession.id;
        }
      } else {
        error.value = response.data.message || 'Fehler beim Laden der Sessions';
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err);
    } finally {
      isLoading.value = false;
    }
  }
  
  async function fetchMessages(sessionId: string): Promise<void> {
    if (!sessionId) return;
    
    isLoading.value = true;
    
    try {
      const response = await api.get(`/sessions/${sessionId}/messages`);
      
      if (response.data.success) {
        // Nachrichten im Store aktualisieren
        messages.value[sessionId] = response.data.data;
      } else {
        error.value = response.data.message || 'Fehler beim Laden der Nachrichten';
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err);
    } finally {
      isLoading.value = false;
    }
  }
  
  // Weitere Actions für Nachrichten, Sessions, Streaming etc.
  
  return {
    // State
    sessions,
    currentSessionId,
    messages,
    pendingMessages,
    isLoading,
    error,
    version,
    streaming,
    
    // Getters
    currentSession,
    currentMessages,
    hasPendingMessages,
    sortedSessions,
    
    // Actions
    fetchSessions,
    fetchMessages,
    // Weitere Methoden...
  };
}, {
  persist: {
    storage: localStorage,
    paths: ['sessions', 'currentSessionId', 'version']
  }
});
```

### UI-Store

Der UI-Store verwaltet UI-Zustände mit Performance-Optimierungen:

```typescript
// src/stores/ui.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Modal, Toast, SidebarState, ViewMode } from '@/types/ui';

export const useUIStore = defineStore('ui', () => {
  // State
  const darkMode = ref<boolean>(false);
  const viewMode = ref<ViewMode>('default');
  const sidebar = ref<SidebarState>({
    isOpen: true,
    width: 280,
    activeTab: 'sessions'
  });
  const activeModals = ref<Modal[]>([]);
  const toasts = ref<Toast[]>([]);
  const isMobile = ref<boolean>(false);
  const isLoading = ref<boolean>(false);
  const cssVariables = ref<Record<string, string>>({});
  const pendingUIUpdates = ref<Set<string>>(new Set());
  const isUpdatingUI = ref<boolean>(false);
  const version = ref<number>(2);
  
  // Getters
  const sidebarIsOpen = computed<boolean>(() => sidebar.value.isOpen);
  const sidebarIsCollapsed = computed<boolean>(() => sidebar.value.width < 100);
  const activeSidebarTab = computed<string>(() => sidebar.value.activeTab);
  const layoutConfig = computed(() => ({
    headerVisible: true,
    footerVisible: viewMode.value !== 'compact',
    sidebarVisible: sidebar.value.isOpen,
    contentPadding: viewMode.value === 'compact' ? 'sm' : 'md'
  }));
  
  // Actions
  function toggleDarkMode(): void {
    darkMode.value = !darkMode.value;
    pendingUIUpdates.value.add('darkMode');
    batchUIUpdates();
  }
  
  function toggleSidebar(): void {
    sidebar.value.isOpen = !sidebar.value.isOpen;
  }
  
  function setSidebarWidth(width: number): void {
    sidebar.value.width = Math.max(50, Math.min(600, width));
  }
  
  function addToast(toast: Omit<Toast, 'id'>): string {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration || 5000,
      closable: toast.closable !== false
    };
    
    toasts.value.push(newToast);
    
    // Automatisches Entfernen nach Ablauf der Dauer
    if (newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
    }
    
    return id;
  }
  
  function removeToast(id: string): void {
    toasts.value = toasts.value.filter(toast => toast.id !== id);
  }
  
  // UI-Update-Batching
  function batchUIUpdates(): void {
    if (isUpdatingUI.value || pendingUIUpdates.value.size === 0) return;
    
    isUpdatingUI.value = true;
    
    setTimeout(() => {
      // CSS-Variablen aktualisieren
      Object.entries(cssVariables.value).forEach(([key, value]) => {
        document.documentElement.style.setProperty(key, value);
      });
      
      // Dark-Mode anwenden
      if (darkMode.value) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      
      pendingUIUpdates.value.clear();
      isUpdatingUI.value = false;
      
      // Prüfen auf neue Updates während der Verarbeitung
      if (pendingUIUpdates.value.size > 0) {
        batchUIUpdates();
      }
    }, 0);
  }
  
  // Modal-Funktionen
  function showModal(modal: Omit<Modal, 'id'>): string {
    const id = `modal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    activeModals.value.push({ ...modal, id });
    return id;
  }
  
  function closeModal(id: string): void {
    activeModals.value = activeModals.value.filter(modal => modal.id !== id);
  }
  
  // Promise-basierte Dialog-API
  function confirm(message: string, options: any = {}): Promise<boolean> {
    return new Promise((resolve) => {
      const id = showModal({
        title: options.title || 'Bestätigung',
        content: message,
        confirmText: options.confirmText || 'Bestätigen',
        cancelText: options.cancelText || 'Abbrechen',
        onConfirm: () => {
          closeModal(id);
          resolve(true);
        },
        onCancel: () => {
          closeModal(id);
          resolve(false);
        },
        options: options.modalOptions || {}
      });
    });
  }
  
  // Weitere Actions...
  
  return {
    // State
    darkMode,
    viewMode,
    sidebar,
    activeModals,
    toasts,
    isMobile,
    isLoading,
    cssVariables,
    version,
    
    // Getters
    sidebarIsOpen,
    sidebarIsCollapsed,
    activeSidebarTab,
    layoutConfig,
    
    // Actions
    toggleDarkMode,
    toggleSidebar,
    setSidebarWidth,
    addToast,
    removeToast,
    batchUIUpdates,
    showModal,
    closeModal,
    confirm,
    // Weitere Methoden...
  };
}, {
  persist: {
    storage: localStorage,
    paths: ['darkMode', 'viewMode', 'sidebar', 'version']
  }
});
```

### FeatureToggles-Store

Der FeatureToggles-Store steuert die Verfügbarkeit von Funktionen:

```typescript
// src/stores/featureToggles.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { FeatureToggles } from '@/types/featureToggles';

export const useFeatureTogglesStore = defineStore('featureToggles', () => {
  // State
  const features = ref<FeatureToggles>({
    // Schema-Version
    version: 2,
    
    // Store-Features
    usePiniaAuth: true,
    usePiniaSessions: true,
    usePiniaUI: true,
    usePiniaSettings: true,
    
    // UI-Features
    useNewUIComponents: true,
    useToastNotifications: true,
    useModernSidebar: true,
    useNewAdminPanel: true,
    
    // Theme-Features
    useDarkMode: true,
    useThemeCustomization: true,
    
    // Legacy-Integration
    useLegacyBridge: true,
    migrateLocalStorage: true,
    
    // Dokumentenkonverter-Features
    useModernDocConverter: true
  });
  
  const featureErrors = ref<Record<string, string[]>>({});
  const fallbackActivated = ref<string[]>([]);
  
  // Getters
  const enabledFeatures = computed(() => {
    return Object.entries(features.value)
      .filter(([key, value]) => value === true && key !== 'version')
      .map(([key]) => key);
  });
  
  // Actions
  function isEnabled(feature: keyof FeatureToggles): boolean {
    // 'version' ist kein Feature
    if (feature === 'version') return false;
    return features.value[feature] === true;
  }
  
  function enableFeature(feature: keyof FeatureToggles): void {
    // 'version' nicht ändern
    if (feature === 'version') return;
    features.value[feature] = true;
  }
  
  function disableFeature(feature: keyof FeatureToggles): void {
    // 'version' nicht ändern
    if (feature === 'version') return;
    features.value[feature] = false;
  }
  
  function enableAllSfcFeatures(): void {
    features.value.usePiniaAuth = true;
    features.value.usePiniaSessions = true;
    features.value.usePiniaUI = true;
    features.value.usePiniaSettings = true;
    features.value.useNewUIComponents = true;
    features.value.useModernSidebar = true;
  }
  
  function disableAllSfcFeatures(): void {
    features.value.usePiniaAuth = false;
    features.value.usePiniaSessions = false;
    features.value.usePiniaUI = false;
    features.value.usePiniaSettings = false;
    features.value.useNewUIComponents = false;
    features.value.useModernSidebar = false;
  }
  
  function reportError(
    feature: string, 
    message: string, 
    details?: any
  ): void {
    if (!featureErrors.value[feature]) {
      featureErrors.value[feature] = [];
    }
    
    featureErrors.value[feature].push(message);
    
    // Optional: Logging oder Error-Tracking
    console.warn(`[FeatureToggle] Error in ${feature}:`, message, details);
  }
  
  function activateFallback(feature: string): void {
    if (feature in features.value) {
      disableFeature(feature as keyof FeatureToggles);
      
      if (!fallbackActivated.value.includes(feature)) {
        fallbackActivated.value.push(feature);
      }
      
      console.info(`[FeatureToggle] Fallback activated for ${feature}`);
    }
  }
  
  function isFallbackActive(feature: string): boolean {
    return fallbackActivated.value.includes(feature);
  }
  
  function resetFeatureErrors(): void {
    featureErrors.value = {};
  }
  
  function enableCoreFeatures(): void {
    // Nur grundlegende Features aktivieren
    features.value.useLegacyBridge = true;
    features.value.migrateLocalStorage = true;
    
    // Alle erweiterten Features deaktivieren
    features.value.useNewUIComponents = false;
    features.value.useModernDocConverter = false;
    features.value.useNewAdminPanel = false;
  }
  
  return {
    // State
    features,
    featureErrors,
    fallbackActivated,
    
    // Getters
    enabledFeatures,
    
    // Actions
    isEnabled,
    enableFeature,
    disableFeature,
    enableAllSfcFeatures,
    disableAllSfcFeatures,
    reportError,
    activateFallback,
    isFallbackActive,
    resetFeatureErrors,
    enableCoreFeatures
  };
}, {
  persist: {
    storage: localStorage,
    paths: ['features', 'fallbackActivated']
  }
});
```

## Effiziente Persistenzstrategien

### Selektive Persistenz

Die Store-Implementierungen verwenden selektive Persistenz, um nur notwendige Daten im localStorage zu speichern:

```typescript
// Beispiel: Selektive Persistenz im Sessions-Store
export const useSessionsStore = defineStore('sessions', () => {
  // Store-Implementierung...
}, {
  persist: {
    storage: localStorage,
    paths: [
      'sessions', 
      'currentSessionId', 
      'version',
      'pendingMessages',
      'syncStatus.lastSyncTime'
    ],
    
    // Optimierung für große Datasets
    serializer: {
      deserialize: (value) => {
        try {
          return JSON.parse(value);
        } catch (err) {
          console.error('Error deserializing store data:', err);
          return {};
        }
      },
      serialize: (state) => {
        // Optimierung: Speichere nur die Sitzungsmetadaten
        const optimizedState = {
          ...state,
          messages: {}, // Nachrichten nicht persistieren
        };
        return JSON.stringify(optimizedState);
      }
    }
  },
});
```

### Nachrichten-Auslagerung

Der Sessions-Store verwendet eine intelligente Auslagerungsstrategie für ältere Nachrichten:

```typescript
// Beispiel: Storage-Optimierung
function cleanupStorage() {
  const messageLimit = 50;
  
  Object.keys(messages.value).forEach(sessionId => {
    const sessionMessages = messages.value[sessionId];
    
    if (sessionMessages.length > messageLimit) {
      // Die neuesten Nachrichten behalten
      const recentMessages = sessionMessages.slice(-messageLimit);
      // Die älteren Nachrichten in den sessionStorage auslagern
      const olderMessages = sessionMessages.slice(0, -messageLimit);
      
      // Im localStorage nur die neuesten Nachrichten behalten
      messages.value[sessionId] = recentMessages;
      
      // Ältere Nachrichten in den sessionStorage verschieben
      try {
        const existingOlder = JSON.parse(sessionStorage.getItem(`session_${sessionId}_older_messages`) || '[]');
        sessionStorage.setItem(`session_${sessionId}_older_messages`, JSON.stringify([...existingOlder, ...olderMessages]));
      } catch (e) {
        console.error(`Error storing older messages for session ${sessionId}:`, e);
      }
    }
  });
}
```

## Bridge-Mechanismen

Die Store-Bridge ermöglicht eine nahtlose Integration mit Legacy-Code:

```typescript
// storeBridge.ts
export function setupStoreBridge(): BridgeAPI {
  const authStore = useAuthStore();
  const sessionsStore = useSessionsStore();
  const uiStore = useUIStore();
  const settingsStore = useSettingsStore();
  const featureTogglesStore = useFeatureTogglesStore();
  
  // Auth-Bridge
  const authBridge = {
    user: computed(() => authStore.user),
    isAuthenticated: computed(() => authStore.isAuthenticated),
    
    getUser: () => authStore.user,
    login: async (email, password) => {
      return await authStore.login({ email, password });
    },
    logout: async () => {
      await authStore.logout();
    },
    hasRole: (role) => {
      return authStore.user?.roles.includes(role) || false;
    }
  };
  
  // Sessions-Bridge
  const sessionsBridge = {
    sessions: computed(() => sessionsStore.sessions),
    currentSession: computed(() => sessionsStore.currentSession),
    
    getSessions: () => sessionsStore.sessions,
    getCurrentSession: () => sessionsStore.currentSession,
    getMessages: (sessionId) => {
      return sessionsStore.messages[sessionId] || [];
    },
    createSession: async (title) => {
      return await sessionsStore.createSession(title);
    },
    sendMessage: async (sessionId, content) => {
      return await sessionsStore.sendMessage(sessionId, content);
    }
  };
  
  // Event-Bridge für Legacy-Event-Handling
  const eventsBridge = {
    handlers: {},
    
    on: (eventName, handler) => {
      if (!eventsBridge.handlers[eventName]) {
        eventsBridge.handlers[eventName] = [];
      }
      eventsBridge.handlers[eventName].push(handler);
      
      return () => {
        eventsBridge.handlers[eventName] = 
          eventsBridge.handlers[eventName].filter(h => h !== handler);
      };
    },
    
    emit: (eventName, data) => {
      if (eventsBridge.handlers[eventName]) {
        eventsBridge.handlers[eventName].forEach(handler => {
          try {
            handler(data);
          } catch (e) {
            console.error(`Error in event handler for ${eventName}:`, e);
          }
        });
      }
    }
  };
  
  // Store-Watcher für Events einrichten
  watch(() => authStore.isAuthenticated, (isAuthenticated) => {
    eventsBridge.emit('auth:changed', { isAuthenticated });
  });
  
  watch(() => sessionsStore.currentSessionId, (currentSessionId, oldSessionId) => {
    if (currentSessionId !== oldSessionId) {
      const currentSession = sessionsStore.currentSession;
      eventsBridge.emit('session:changed', { 
        sessionId: currentSessionId, 
        session: currentSession 
      });
    }
  });
  
  // Weitere Bridges und Watcher...
  
  return {
    auth: authBridge,
    sessions: sessionsBridge,
    ui: uiBridge,
    settings: settingsBridge,
    features: featureTogglesStore,
    events: eventsBridge
  };
}
```

## Composables

Composables bieten eine benutzerfreundliche API für den Zugriff auf Store-Funktionalität in Komponenten:

### Erweiterte Auth-Composable

```typescript
// useAuth.ts
import { useAuthStore } from '@/stores/auth';
import { computed } from 'vue';
import { storeToRefs } from 'pinia';

export function useAuth() {
  const authStore = useAuthStore();
  
  // Reaktive Eigenschaften mit storeToRefs
  const { user, isLoading, error } = storeToRefs(authStore);
  
  // Computed-Eigenschaften
  const isAuthenticated = computed(() => authStore.isAuthenticated);
  const isAdmin = computed(() => authStore.isAdmin);
  const tokenStatus = computed(() => ({
    isExpired: authStore.isExpired,
    expiresIn: authStore.tokenExpiresIn
  }));
  
  // Login mit erweiterten Optionen
  const login = async (credentials, options = {}) => {
    const result = await authStore.login(credentials);
    
    // Automatischen Token-Refresh einrichten
    if (result && options.setupAutoRefresh !== false) {
      authStore.setupAutoRefresh();
    }
    
    return result;
  };
  
  // Verbesserter Logout
  const logout = async (options = {}) => {
    // Bei Bedarf lokale Navigation durchführen
    if (options.navigate && typeof options.navigate === 'function') {
      options.navigate();
    }
    
    await authStore.logout();
  };
  
  // Prüft, ob der Benutzer eine bestimmte Rolle hat
  const hasRole = (role) => {
    return user.value?.roles.includes(role) || false;
  };
  
  // Prüft, ob der Benutzer mindestens eine der angegebenen Rollen hat
  const hasAnyRole = (roles) => {
    if (!user.value || !Array.isArray(roles)) return false;
    return roles.some(role => user.value.roles.includes(role));
  };
  
  // Prüft, ob der Benutzer alle angegebenen Rollen hat
  const hasAllRoles = (roles) => {
    if (!user.value || !Array.isArray(roles)) return false;
    return roles.every(role => user.value.roles.includes(role));
  };
  
  return {
    // Reaktive Eigenschaften
    user,
    isLoading,
    error,
    isAuthenticated,
    isAdmin,
    tokenStatus,
    
    // Methoden
    login,
    logout,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    refreshTokenIfNeeded: authStore.refreshTokenIfNeeded,
    
    // Weitere Methoden...
  };
}
```

### Kombinierter useNScale-Composable

```typescript
// useNScale.ts
import { useAuth } from './useAuth';
import { useChat } from './useChat';
import { useUI } from './useUI';
import { useSettings } from './useSettings';
import { useFeatureToggles } from './useFeatureToggles';
import { useStoreBridge } from './useStoreBridge';

export function useNScale() {
  const auth = useAuth();
  const chat = useChat();
  const ui = useUI();
  const settings = useSettings();
  const features = useFeatureToggles();
  const { bridge, isEnabled: bridgeEnabled } = useStoreBridge();
  
  // Hilfsfunktion für Feature-Checking
  function isFeatureEnabled(featureName: string): boolean {
    return features.isEnabled(featureName);
  }
  
  // Kombinierte Initialisierung
  async function initialize(): Promise<boolean> {
    try {
      // Nur aktivierte Services initialisieren
      const promises = [];
      
      if (auth.isAuthenticated) {
        promises.push(auth.refreshUserInfo());
      }
      
      if (isFeatureEnabled('usePiniaSessions')) {
        promises.push(chat.initialize());
      }
      
      // Auf Abschluss aller Initialisierungen warten
      if (promises.length > 0) {
        await Promise.all(promises);
      }
      
      return true;
    } catch (error) {
      console.error('Fehler bei der Initialisierung:', error);
      return false;
    }
  }
  
  return {
    auth,
    chat,
    ui,
    settings,
    features,
    bridge: {
      api: bridge,
      enabled: bridgeEnabled
    },
    isFeatureEnabled,
    initialize
  };
}
```

## Integration in Komponenten

### Vue 3 Composition API Integration

```vue
<template>
  <!-- UI-Komponente mit Store-Integration -->
  <div :class="{ 'dark-mode': isDarkMode, 'compact-ui': isCompactMode }">
    <!-- Layout-Komponenten -->
    <header v-if="layoutConfig.headerVisible">
      <button @click="toggleSidebar">
        <icon :name="sidebarIsOpen ? 'menu-fold' : 'menu-unfold'" />
      </button>
      <dark-mode-toggle />
    </header>

    <!-- Content-Bereich mit Sidebar -->
    <div class="content-layout">
      <sidebar 
        v-if="sidebarIsOpen" 
        :width="sidebar.width" 
        :collapsed="sidebarIsCollapsed"
        @resize="setSidebarWidth"
      />
      
      <!-- Hauptinhalt -->
      <main>
        <suspense>
          <chat-view v-if="isAuthenticated" />
          <login-form v-else @login="handleLogin" />
        </suspense>
      </main>
    </div>
  </div>
</template>

<script setup>
import { useNScale } from '@/composables/useNScale';

// Zentraler Hook für alle Funktionalitäten
const { 
  auth: { user, isAuthenticated, login, logout },
  ui: { 
    isDarkMode, toggleDarkMode, 
    sidebar, sidebarIsOpen, sidebarIsCollapsed, toggleSidebar, setSidebarWidth,
    layoutConfig, isCompactMode
  }
} = useNScale();

// Login-Handler
const handleLogin = async (credentials) => {
  await login(credentials);
};
</script>
```

## Performance-Optimierungen

### UI-Update-Batching

Der UI-Store verwendet Update-Batching für DOM-Änderungen:

```typescript
// Update-Batching im UI-Store
function batchUIUpdates() {
  if (isUpdatingUI.value || pendingUIUpdates.value.size === 0) return;
  
  isUpdatingUI.value = true;
  
  // Alle ausstehenden UI-Updates gebündelt durchführen
  setTimeout(() => {
    // CSS-Variablen aktualisieren
    Object.entries(cssVariables.value).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });
    
    // Dark-Mode und andere CSS-Klassen anwenden
    applyDarkMode();
    
    pendingUIUpdates.value.clear();
    isUpdatingUI.value = false;
    
    // Prüfen auf neue Updates während der Verarbeitung
    if (pendingUIUpdates.value.size > 0) {
      batchUIUpdates();
    }
  }, 0);
}
```

### Selektives Abonnieren von Store-Eigenschaften

```typescript
// Ineffizient - gesamten Store abonnieren
const authStore = useAuthStore();

// Effizient - nur benötigte Eigenschaften mit storeToRefs
const { user, isAuthenticated } = storeToRefs(useAuthStore());

// Alternative - nur einzelne Properties mit Computed
const user = computed(() => authStore.user);
```

### Lazy Loading für Nachrichtenverlauf

```typescript
// Lazy Loading im Sessions-Store
async function loadOlderMessages(sessionId: string): ChatMessage[] {
  if (!sessionId) return [];
  
  try {
    // Aus dem sessionStorage laden
    const olderMessages = JSON.parse(
      sessionStorage.getItem(`session_${sessionId}_older_messages`) || '[]'
    );
    
    // Zu den aktuellen Nachrichten hinzufügen
    if (olderMessages.length > 0) {
      if (!messages.value[sessionId]) {
        messages.value[sessionId] = [];
      }
      
      // Zusammenführen und sortieren
      messages.value[sessionId] = [...olderMessages, ...messages.value[sessionId]]
        .sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      
      // Aus dem sessionStorage entfernen
      sessionStorage.removeItem(`session_${sessionId}_older_messages`);
    }
    
    return olderMessages;
  } catch (e) {
    console.error(`Error loading older messages for session ${sessionId}:`, e);
    return [];
  }
}
```

## Fehlerbehandlung und Wiederherstellung

### Automatischer Token-Refresh

```typescript
// Automatischer Token-Refresh
async function refreshTokenIfNeeded(): Promise<boolean> {
  // Nicht ausführen, wenn:
  // - Kein Token vorhanden
  // - Token noch gültig
  // - Bereits ein Refresh läuft
  // - Letzter Refresh war vor weniger als 10 Sekunden
  if (
    !token.value || 
    !refreshToken.value || 
    !isExpired.value || 
    tokenRefreshInProgress.value ||
    (Date.now() - lastTokenRefresh.value) < 10000
  ) {
    return true;
  }

  tokenRefreshInProgress.value = true;
  
  try {
    const response = await axios.post('/api/auth/refresh', {
      refreshToken: refreshToken.value
    });
    
    if (response.data.success) {
      token.value = response.data.token;
      refreshToken.value = response.data.refreshToken || refreshToken.value;
      expiresAt.value = Date.now() + (response.data.expiresIn || 60 * 60 * 1000);
      
      // Benutzerdaten aktualisieren, falls vorhanden
      if (response.data.user) {
        user.value = response.data.user;
      }
      
      lastTokenRefresh.value = Date.now();
      return true;
    }
    
    // Bei Fehlschlag: Abmelden
    logout();
    return false;
  } catch (err) {
    // Fehlerbehandlung...
    return false;
  } finally {
    tokenRefreshInProgress.value = false;
  }
}
```

### Axios-Interceptoren für automatischen Retry

```typescript
// Axios-Interceptor für Token-Refresh
watch(token, (newToken) => {
  if (newToken) {
    // Axios-Interceptor für automatischen Token-Refresh
    const interceptorId = axios.interceptors.response.use(
      response => response, 
      async error => {
        const originalRequest = error.config;
        
        if (
          error.response?.status === 401 && 
          !originalRequest._retry && 
          !originalRequest.url.includes('/api/auth/refresh')
        ) {
          originalRequest._retry = true;
          
          const refreshSuccess = await refreshTokenIfNeeded();
          if (refreshSuccess) {
            // Ursprüngliche Anfrage wiederholen
            originalRequest.headers.Authorization = `Bearer ${token.value}`;
            return axios(originalRequest);
          }
        }
        
        return Promise.reject(error);
      }
    );
    
    // Cleanup beim Logout
    const unwatchToken = watch(token, (newTokenValue) => {
      if (!newTokenValue) {
        axios.interceptors.response.eject(interceptorId);
        unwatchToken();
      }
    });
  }
});
```

## Fehlerbehebung

### Store ist nicht reaktiv

**Problem**: Änderungen am Store werden nicht in der UI reflektiert.

**Lösung**: 
1. Verwenden Sie storeToRefs oder computed für reaktive Eigenschaften
2. Verwenden Sie die Composables statt direkten Store-Zugriff
3. Stellen Sie sicher, dass watch-Handler ordnungsgemäß aufgeräumt werden

```typescript
// Falsch - nicht reaktiv
const authStore = useAuthStore();
const user = authStore.user; 

// Richtig - reaktiv mit storeToRefs
const { user, isAuthenticated } = storeToRefs(useAuthStore());

// Alternative - reaktiv mit computed
const user = computed(() => authStore.user);
```

### Bridge funktioniert nicht

**Problem**: Legacy-Code kann nicht auf Store-Funktionen zugreifen.

**Lösung**:
1. Stellen Sie sicher, dass die Bridge vor dem Legacy-Code initialisiert wird
2. Prüfen Sie, ob die entsprechenden Feature-Toggles aktiviert sind
3. Fügen Sie Event-Listener für das 'nscale:bridge:ready'-Event hinzu

```javascript
// Warten auf Bridge-Initialisierung im Legacy-Code
window.addEventListener('nscale:bridge:ready', () => {
  // Jetzt ist die Bridge verfügbar
  if (window.nscale && window.nscale.auth) {
    setupLegacyCode();
  } else {
    console.error('nscale Bridge nicht vollständig initialisiert');
  }
});
```

## Migration zum State Management

Die Migration vom bisherigen System zu Pinia sollte schrittweise erfolgen:

1. **Store-Grundstrukturen einrichten**: Erstellung der Base-Store-Implementierungen
2. **Bridge-Layer integrieren**: Kompatibilitätsschicht für Legacy-Code erstellen
3. **Feature-Toggles implementieren**: Graduelle Aktivierung der neuen Features
4. **Composables entwickeln**: Einheitliche API für den Zugriff auf Stores
5. **Komponenten migrieren**: Schrittweise Migration der Komponenten zum neuen System

Dieses Vorgehen ermöglicht ein kontrollierbares Rollout mit der Möglichkeit, bei Problemen zurückzufallen.

## Fazit

Das State-Management-System mit Pinia bietet eine robuste Grundlage für die Anwendung und erleichtert die Migration zu Vue 3 Single File Components. Durch die Kombination von reaktivem State-Management, optimierter Persistenz, nahtloser Legacy-Integration und fortgeschrittenen Performance-Optimierungen wird eine skalierbare und wartbare Architektur geschaffen.

Die vorhandenen Stores decken alle wichtigen Anwendungsbereiche ab und können einfach erweitert werden, um neue Funktionalitäten zu unterstützen. Die klare Trennung von Zustandsmanagement und Benutzeroberfläche sowie die typensichere Implementierung erhöhen die Code-Qualität und reduzieren Fehler während der Entwicklung.

---

Zuletzt aktualisiert: 10.05.2025