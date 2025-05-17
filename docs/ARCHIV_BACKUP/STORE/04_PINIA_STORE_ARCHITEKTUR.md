---
title: "Pinia Store Architektur"
version: "1.1.0"
date: "10.05.2025"
lastUpdate: "11.05.2025"
author: "Martin Heinrich"
status: "Aktiv"
priority: "Hoch"
category: "Architektur"
tags: ["Pinia", "State Management", "Vue3", "Store", "Testing", "Komposition"]
---

# Pinia Store Architektur

> **Letzte Aktualisierung:** 10.05.2025 | **Version:** 1.1.0 | **Status:** Aktiv

## Übersicht

Die Pinia Store Architektur des nscale DMS Assistenten bildet das Rückgrat für das State Management der Anwendung und spielt eine zentrale Rolle bei der Migration von Vanilla JS zu Vue 3. Sie ist als modulares, typensicheres und performantes System konzipiert, das sowohl bestehende Legacy-Funktionen als auch neue Vue 3 Single File Components (SFCs) optimal unterstützt.

Die Architektur umfasst dedizierte Stores für unterschiedliche Anwendungsbereiche, fortschrittliche Kompositionsmuster für Wiederverwendbarkeit, leistungsstarke Synchronisationsmechanismen für Server-Kommunikation und eine umfassende Teststrategie zur Qualitätssicherung.

## Kernprinzipien

Die Pinia Store Architektur basiert auf folgenden Kernprinzipien:

1. **Modulare Struktur**: Stores sind in logische Einheiten organisiert, was die Wartbarkeit und Skalierbarkeit verbessert
2. **Komposition statt Vererbung**: Verwendung der Composition API für maximale Flexibilität und Wiederverwendbarkeit
3. **Typsicherheit**: Vollständige TypeScript-Integration für bessere Entwicklererfahrung und Fehlerminimierung
4. **Bridge-Integration**: Nahtlose Kommunikation zwischen Legacy-Code und modernen Vue 3-Komponenten
5. **Performance-Optimierung**: Implementierung fortschrittlicher Muster für effiziente State-Verwaltung
6. **Fehlerresilienz**: Umfassende Strategien zur Fehlerbehandlung mit automatischen Fallback-Mechanismen
7. **Testbarkeit**: Design mit Fokus auf einfache und umfassende Testbarkeit

## Architekturüberblick

Die Pinia Store Architektur des nscale DMS Assistenten ist hierarchisch in drei Hauptkategorien gegliedert:

1. **Core-Stores**: Fundamentale Stores für die Basisfunktionalität
2. **Feature-spezifische Stores**: Stores für bestimmte Anwendungsbereiche
3. **Admin-Module Stores**: Spezielle Stores für Administrationsfunktionen

```
src/
├── stores/
│   ├── index.ts                 # Store-Haupteinstiegspunkt mit Pinia-Setup
│   ├── auth.ts                  # Authentifizierungs-Store
│   ├── sessions.ts              # Session- und Nachrichtenmanagement
│   ├── sessions.optimized.ts    # Optimierte Version des Session-Stores
│   ├── ui.ts                    # UI-Zustände und -Interaktionen
│   ├── featureToggles.ts        # Feature-Flag-Management
│   ├── settings.ts              # Benutzereinstellungen
│   ├── documentConverter.ts     # Dokumentenkonverter-Funktionalität
│   ├── monitoringStore.ts       # System-Monitoring und Telemetrie
│   ├── statistics.ts            # System- und Nutzungsstatistiken
│   ├── storeInitializer.ts      # Zentrale Store-Initialisierung
│   ├── admin/
│   │   ├── index.ts             # Admin-Store-Einstiegspunkt
│   │   ├── users.ts             # Benutzerverwaltung
│   │   ├── feedback.ts          # Feedback-Management
│   │   ├── motd.ts              # Message-of-the-Day
│   │   ├── system.ts            # Systemeinstellungen und -informationen
│   │   ├── logs.ts              # Log-Management und -Analyse
│   │   └── settings.optimized.ts # Optimierte Settings-Verwaltung
│   └── composables/             # Gemeinsame Store-Funktionen
│       ├── useOptimisticUpdates.ts
│       ├── useAsyncActions.ts
│       └── usePersistence.ts
└── bridge/                     # Bridge-System für Legacy-Integration
    ├── index.ts                # Haupt-Bridge-Export
    ├── setup.ts                # Bridge-Konfiguration
    ├── sessionBridge.ts        # Session-spezifische Bridge
    ├── storeBridge.ts          # Store-Integration für Legacy-Code
    └── enhanced/               # Erweiterte Bridge-Funktionalitäten
```

## Core-Stores

### Auth-Store

Der Auth-Store (`auth.ts`) ist verantwortlich für die Authentifizierung, Autorisierung und Benutzerverwaltung.

**Hauptmerkmale:**
- JWT-Token-Management mit automatischer Aktualisierung
- Rollenbasierte Zugriffskontrolle
- Migration von Legacy-Authentifizierungsdaten
- Fehlerbehandlung für Netzwerkprobleme
- Persistenz für Benutzerinformationen

**Architektur:**

```
+---------------------+
|     useAuthStore    |
+---------------------+
| State:              |
|  - user: User       |
|  - token: string    |
|  - refreshToken: str|
|  - expiresAt: number|
|  - isLoading: bool  |
|  - error: string    |
+---------------------+
| Getters:            |
|  - isAuthenticated  |
|  - isAdmin          |
|  - isExpired        |
|  - tokenExpiresIn   |
+---------------------+
| Actions:            |
|  - login()          |
|  - logout()         |
|  - hasRole()        |
|  - refreshToken()   |
|  - refreshUserInfo()|
+---------------------+
```

**Beispielimplementierung:**

```typescript
export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<User | null>(null);
  const token = ref<string | null>(null);
  const refreshToken = ref<string | null>(null);
  const expiresAt = ref<number | null>(null);
  const isLoading = ref<boolean>(false);
  const error = ref<string | null>(null);
  
  // Getters
  const isAuthenticated = computed(() => !!token.value && !!user.value);
  const isAdmin = computed(() => user.value?.roles.includes('admin') || false);
  const isExpired = computed(() => {
    if (!expiresAt.value) return true;
    return Date.now() > expiresAt.value;
  });
  
  // Actions
  async function login(credentials: LoginCredentials): Promise<boolean> {
    isLoading.value = true;
    error.value = null;
    
    try {
      const response = await axios.post('/api/auth/login', credentials);
      
      if (response.data.success) {
        token.value = response.data.token;
        refreshToken.value = response.data.refreshToken || null;
        user.value = response.data.user;
        expiresAt.value = Date.now() + (response.data.expiresIn || 24 * 60 * 60 * 1000);
        
        return true;
      } else {
        error.value = response.data.message || 'Login fehlgeschlagen';
        return false;
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Netzwerkfehler beim Login';
      console.error('Login-Fehler:', error.value);
      return false;
    } finally {
      isLoading.value = false;
    }
  }
  
  function hasRole(role: string): boolean {
    return user.value?.roles.includes(role) || false;
  }
  
  function logout(): void {
    token.value = null;
    refreshToken.value = null;
    user.value = null;
    expiresAt.value = null;
  }
  
  // Token-Aktualisierungsmechanismus
  let refreshTokenInterval: number | null = null;
  
  function setupTokenRefresh(): void {
    if (refreshTokenInterval) {
      clearInterval(refreshTokenInterval);
    }
    
    refreshTokenInterval = window.setInterval(() => {
      if (isAuthenticated.value && !isExpired.value) {
        refreshCurrentToken();
      }
    }, 5 * 60 * 1000); // Alle 5 Minuten
  }
  
  async function refreshCurrentToken(): Promise<boolean> {
    // Token-Aktualisierungslogik
    return true;
  }
  
  // Beim Store-Erstellen Legacy-Daten migrieren
  function migrateFromLegacyStorage(): void {
    try {
      const legacyToken = localStorage.getItem('token');
      const legacyUser = localStorage.getItem('user');
      
      if (legacyToken && !token.value) {
        token.value = legacyToken;
        
        if (legacyUser) {
          try {
            user.value = JSON.parse(legacyUser);
          } catch (e) {
            console.error('Fehler beim Parsen der Legacy-Benutzerdaten', e);
          }
        }
      }
    } catch (error) {
      console.error('Fehler bei der Auth-Migration:', error);
    }
  }
  
  // Initialisierung
  function initialize(): void {
    migrateFromLegacyStorage();
    setupTokenRefresh();
  }
  
  // Store initialisieren
  initialize();
  
  return {
    // State
    user,
    token,
    refreshToken,
    expiresAt,
    isLoading,
    error,
    
    // Getters
    isAuthenticated,
    isAdmin,
    isExpired,
    
    // Actions
    login,
    logout,
    hasRole,
    refreshCurrentToken
  };
}, {
  persist: {
    storage: localStorage,
    paths: ['token', 'refreshToken', 'user', 'expiresAt', 'version']
  }
});
```

### Sessions-Store

Der Sessions-Store (`sessions.ts`) verwaltet Chat-Sessions und den Nachrichtenaustausch mit dem Server.

**Hauptmerkmale:**
- Verwaltung mehrerer Chat-Sessions
- Streaming-Nachrichtenmanagement
- Fortschrittstracking für lange Antworten
- Caching für großvolumige Daten
- Server-Synchronisation mit Offline-Unterstützung

**Architektur:**

```
+----------------------+
|   useSessionsStore   |
+----------------------+
| State:               |
|  - sessions[]        |
|  - currentSessionId  |
|  - messages{}        |
|  - streaming         |
|  - isLoading         |
|  - error             |
|  - pendingMessages   |
+----------------------+
| Getters:             |
|  - currentSession    |
|  - currentMessages   |
|  - sortedSessions    |
|  - isStreaming       |
|  - allCurrentMessages|
+----------------------+
| Actions:             |
|  - createSession()   |
|  - setCurrentSession()|
|  - sendMessage()     |
|  - cancelStreaming() |
|  - archiveSession()  |
|  - exportData()      |
+----------------------+
```

### UI-Store

Der UI-Store (`ui.ts`) verwaltet die Benutzeroberfläche und visuelle Zustände.

**Hauptmerkmale:**
- Theme-Management (Dark Mode/Light Mode)
- Responsives Layout-Management
- Toast- und Benachrichtigungssystem
- Modal-Verwaltung
- Sidebar-Konfiguration

### Feature-Toggles-Store

Der Feature-Toggles-Store (`featureToggles.ts`) implementiert ein Feature-Flag-System für die Migration.

**Hauptmerkmale:**
- Feingranulare Feature-Steuerung
- Abhängigkeitsverwaltung zwischen Features
- Fallback-Mechanismen
- Rollenbasierte Zugriffssteuerung
- Fehlertracking und Wiederherstellung

### Document-Converter-Store

Der Document-Converter-Store (`documentConverter.ts`) verwaltet den Zustand des Dokumentenkonverters.

**Hauptmerkmale:**
- Upload-Verwaltung mit Fortschritts-Tracking
- Konvertierungsprozess-Management
- Ergebnisverwaltung und -anzeige
- Format-Validierung und -unterstützung
- Fehlerbehandlung und -wiederherstellung

## Admin-Module-Stores

### Users-Store

Der Users-Store (`admin/users.ts`) verwaltet Benutzer für Administratoren.

**Hauptmerkmale:**
- Benutzer-CRUD-Operationen
- Rollenzuweisung und -verwaltung
- Paginierte Benutzerlisten
- Filterung und Sortierung

### Feedback-Store

Der Feedback-Store (`admin/feedback.ts`) verwaltet Benutzerfeedback.

**Hauptmerkmale:**
- Feedback-Sammlung und -Kategorisierung
- Sentiment-Analyse
- Statistikaggregation
- Export-Funktionalität

### MOTD-Store

Der MOTD-Store (`admin/motd.ts`) verwaltet "Message of the Day"-Nachrichten.

**Hauptmerkmale:**
- Nachrichtenverwaltung
- Zeitplanung und Aktivierung
- Zielgruppen-Targeting
- Vorschau-Funktionalität

### System-Store

Der System-Store (`admin/system.ts`) verwaltet Systemeinstellungen und Diagnose.

**Hauptmerkmale:**
- Systemkonfiguration
- Diagnoseberichte
- Speichernutzung und -verwaltung
- Wartungsfunktionen

## Fortgeschrittene Muster

### Store-Komposition

Die Architektur setzt auf Komposition statt Vererbung für maximale Flexibilität und Wiederverwendbarkeit.

**Beispiel für Store-Komposition:**

```typescript
// Wiederverwendbare Funktionalität
function useAsyncState() {
  const isLoading = ref(false);
  const error = ref<Error | null>(null);
  
  async function withAsyncLoading<T>(asyncFn: () => Promise<T>): Promise<T> {
    isLoading.value = true;
    error.value = null;
    
    try {
      return await asyncFn();
    } catch (err) {
      error.value = err as Error;
      throw err;
    } finally {
      isLoading.value = false;
    }
  }
  
  return {
    isLoading,
    error,
    withAsyncLoading
  };
}

// Verwendung in einem Store
export const useUserStore = defineStore('users', () => {
  const { isLoading, error, withAsyncLoading } = useAsyncState();
  const users = ref<User[]>([]);
  
  async function fetchUsers() {
    users.value = await withAsyncLoading(() => api.getUsers());
  }
  
  return {
    users,
    isLoading,
    error,
    fetchUsers
  };
});
```

### Store-Factories

Store-Factories ermöglichen die dynamische Erstellung von Stores mit gemeinsamer Grundfunktionalität.

```typescript
function createCrudStore<T>(
  name: string,
  apiService: ApiService<T>,
  options?: CrudStoreOptions
) {
  return defineStore(`${name}`, () => {
    const items = ref<T[]>([]);
    const isLoading = ref(false);
    const error = ref<Error | null>(null);
    
    async function fetchAll() {
      isLoading.value = true;
      try {
        items.value = await apiService.getAll();
      } catch (err) {
        error.value = err as Error;
      } finally {
        isLoading.value = false;
      }
    }
    
    // Weitere CRUD-Operationen...
    
    return {
      items,
      isLoading,
      error,
      fetchAll,
      // Weitere Funktionen...
    };
  });
}

// Verwendung
export const useProductStore = createCrudStore<Product>(
  'products',
  productService
);
```

### Optimistische Updates

```typescript
async function updateSessionTitle(sessionId: string, newTitle: string): Promise<void> {
  if (!sessionId) return;
  
  // Alten Titel für Rollback merken
  const sessionIndex = sessions.value.findIndex(s => s.id === sessionId);
  const oldTitle = sessions.value[sessionIndex]?.title || '';
  
  // Optimistische Aktualisierung im lokalen State
  if (sessionIndex !== -1) {
    sessions.value[sessionIndex] = {
      ...sessions.value[sessionIndex],
      title: newTitle,
      updatedAt: new Date().toISOString()
    };
  }
  
  // Mit dem Server synchronisieren
  try {
    await axios.patch(`/api/sessions/${sessionId}`, { title: newTitle }, {
      headers: authStore.createAuthHeaders()
    });
  } catch (err: any) {
    console.error(`Error updating session title for ${sessionId}:`, err);
    
    // Bei Fehler lokale Änderung rückgängig machen
    if (sessionIndex !== -1) {
      sessions.value[sessionIndex] = {
        ...sessions.value[sessionIndex],
        title: oldTitle
      };
    }
  }
}
```

### Bridge-Integration

Das Bridge-System ermöglicht die nahtlose Kommunikation zwischen Legacy-Code und Pinia-Stores.

```typescript
// Bridge zur Bereitstellung von Pinia-Funktionen für Legacy-Code
export function setupBridge() {
  // Store-Referenzen
  const authStore = useAuthStore();
  const sessionsStore = useSessionsStore();
  
  // Globale Funktionen für Legacy-Code bereitstellen
  window.nscaleAuth = {
    login: async (email: string, password: string) => {
      return await authStore.login({ email, password });
    },
    logout: () => {
      authStore.logout();
    },
    getToken: () => {
      return authStore.token;
    },
    isAuthenticated: () => {
      return authStore.isAuthenticated;
    }
  };
  
  window.nscaleChat = {
    createSession: async (title?: string) => {
      return await sessionsStore.createSession(title || 'Neue Unterhaltung');
    },
    sendMessage: async (sessionId: string, content: string) => {
      return await sessionsStore.sendMessage({ sessionId, content });
    }
  };
  
  // Store-Änderungen beobachten und Legacy-Events auslösen
  watch(() => authStore.isAuthenticated, (isAuthenticated) => {
    window.dispatchEvent(new CustomEvent('nscale:auth', { 
      detail: { isAuthenticated } 
    }));
  });
}
```

## Persistenz-Strategien

### Local Storage Integration

Die Stores nutzen das Pinia Persistence Plugin mit spezifischen Anpassungen.

```typescript
export const useAuthStore = defineStore('auth', () => {
  // Store-Implementation
}, {
  persist: {
    // Verwende localStorage für die Persistenz
    storage: localStorage,
    
    // Selektives Speichern bestimmter State-Elemente
    paths: ['token', 'refreshToken', 'user', 'expiresAt', 'version'],
    
    // Benutzerdefinierte Serialisierung für sensible Daten
    serializer: {
      deserialize: (value) => {
        try {
          const data = JSON.parse(value);
          return data;
        } catch (err) {
          console.error('Error deserializing auth data:', err);
          return {}; // Fallback zu leerem Objekt
        }
      },
      serialize: (state) => {
        // Sensible Daten ausschließen oder verschlüsseln
        const safeState = { ...state };
        delete safeState.sensitiveData;
        return JSON.stringify(safeState);
      }
    }
  }
});
```

### Session-Daten-Management

Effiziente Verwaltung großer Datenmengen durch intelligente Auslagerungsstrategien.

```typescript
// Bereinigt den Storage, indem ältere Nachrichten ausgelagert werden
function cleanupStorage() {
  // Nachrichten-Limit pro Session
  const messageLimit = 50;
  
  // Für jede Session
  Object.keys(messages.value).forEach(sessionId => {
    const sessionMessages = messages.value[sessionId];
    
    // Wenn mehr Nachrichten als das Limit
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

## Performance-Optimierungen

### Effiziente Computed-Properties

```typescript
// Optimierte computed property für gefilterte Dokumente
const filteredDocuments = computed(() => {
  return (filterType: string): ConversionResult[] => {
    if (!filterType) return state.convertedDocuments;
    
    // Memoization für häufig aufgerufene Filter
    const cacheKey = `filter:${filterType}`;
    if (filterCache.has(cacheKey)) {
      return filterCache.get(cacheKey)!;
    }
    
    let result: ConversionResult[];
    
    // Nach Format filtern
    if (['pdf', 'docx', 'xlsx', 'pptx', 'html', 'txt'].includes(filterType)) {
      result = state.convertedDocuments.filter(
        doc => doc.originalFormat === filterType
      );
    } 
    // Nach Status filtern
    else if (['pending', 'processing', 'success', 'error'].includes(filterType)) {
      result = state.convertedDocuments.filter(
        doc => doc.status === filterType
      );
    } else {
      result = state.convertedDocuments;
    }
    
    // Ergebnis cachen
    filterCache.set(cacheKey, result);
    return result;
  };
});
```

### Lazy Loading von Stores

```typescript
// Dynamisches Store-Import für Admin-Funktionen
export async function loadAdminStores() {
  const [
    { useUsersStore },
    { useFeedbackStore },
    { useMotdStore },
    { useSystemStore }
  ] = await Promise.all([
    import('./admin/users'),
    import('./admin/feedback'),
    import('./admin/motd'),
    import('./admin/system')
  ]);
  
  return {
    useUsersStore,
    useFeedbackStore,
    useMotdStore,
    useSystemStore
  };
}
```

## Test-Strategie

Die Pinia Store Architektur umfasst eine umfassende Teststrategie, um die korrekte Funktionsweise aller Stores sicherzustellen.

### Testwerkzeuge

- **Vitest**: Als primäres Test-Framework
- **JSDOM**: Für die Simulation einer Browser-Umgebung
- **MSW (Mock Service Worker)**: Für das Mocken von HTTP-Anfragen
- **@pinia/testing**: Für vereinfachtes Testing von Pinia-Stores
- **@vue/test-utils**: Für Tests, die mit Vue-Komponenten interagieren

### Teststruktur

Tests werden in einer spiegelnden Verzeichnisstruktur zu den Stores organisiert:

```
/test/
  /stores/
    /auth.spec.ts          # Tests für auth.ts
    /sessions.spec.ts      # Tests für sessions.ts
    /ui.spec.ts            # Tests für ui.ts
    /documentConverter.spec.ts  # Tests für documentConverter.ts
    /admin/
      /users.spec.ts       # Tests für admin/users.ts
      /feedback.spec.ts    # Tests für admin/feedback.ts
    /integration/
      /auth-sessions.spec.ts  # Tests für Store-Interaktionen
    /__mocks__/            # Gemeinsame Mocks für Tests
      /axios.ts            # Axios-Mock für alle Tests
```

### Mocken von Abhängigkeiten

#### API-Anfragen mocken

```typescript
// auth.spec.ts
import axios from 'axios';
import { vi } from 'vitest';

vi.mock('axios');

describe('Auth Store', () => {
  beforeEach(() => {
    vi.mocked(axios.post).mockResolvedValue({
      data: {
        success: true,
        token: 'mock-token',
        user: { id: '1', email: 'test@example.com', roles: ['user'] }
      }
    });
  });

  it('sollte bei erfolgreicher Anmeldung den Benutzer setzen', async () => {
    // Test-Implementierung
  });
});
```

#### Browser-APIs mocken

```typescript
// ui.spec.ts
import { vi } from 'vitest';

// localStorage mocken
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value.toString(); }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; })
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });
```

### Beispiel-Testfälle

#### Auth-Store Tests

```typescript
// auth.spec.ts
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '@/stores/auth';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import axios from 'axios';

vi.mock('axios');

describe('Auth Store', () => {
  beforeEach(() => {
    // Frischen Pinia-Store für jeden Test erstellen
    setActivePinia(createPinia());
    
    // Axios-Mocks zurücksetzen
    vi.mocked(axios.post).mockReset();
    vi.mocked(axios.get).mockReset();
  });

  describe('login', () => {
    it('should set user and token on successful login', async () => {
      // Arrange
      vi.mocked(axios.post).mockResolvedValueOnce({
        data: {
          success: true,
          token: 'mock-token',
          user: { id: '1', email: 'user@example.com', roles: ['user'] }
        }
      });
      
      const store = useAuthStore();
      
      // Act
      const result = await store.login({
        email: 'user@example.com',
        password: 'password'
      });
      
      // Assert
      expect(result).toBe(true);
      expect(store.token).toBe('mock-token');
      expect(store.user).toEqual({ id: '1', email: 'user@example.com', roles: ['user'] });
      expect(store.isAuthenticated).toBe(true);
    });

    it('should handle login failure correctly', async () => {
      // Arrange
      vi.mocked(axios.post).mockResolvedValueOnce({
        data: {
          success: false,
          message: 'Invalid credentials'
        }
      });
      
      const store = useAuthStore();
      
      // Act
      const result = await store.login({
        email: 'wrong@example.com',
        password: 'wrong'
      });
      
      // Assert
      expect(result).toBe(false);
      expect(store.token).toBeNull();
      expect(store.user).toBeNull();
      expect(store.error).toBe('Invalid credentials');
      expect(store.isAuthenticated).toBe(false);
    });
  });
});
```

#### Store-Interaktionstests

```typescript
// integration/auth-sessions.spec.ts
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '@/stores/auth';
import { useSessionsStore } from '@/stores/sessions';

describe('Auth und Sessions Integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('sollte pendente Nachrichten synchronisieren, wenn der Benutzer sich anmeldet', async () => {
    const authStore = useAuthStore();
    const sessionsStore = useSessionsStore();
    
    // Eine Session mit pendenten Nachrichten erstellen
    await sessionsStore.createSession('Test-Session');
    
    // Mocken der Synchronisierungsmethode
    const syncSpy = vi.spyOn(sessionsStore, 'syncPendingMessages');
    
    // Login-Prozess simulieren
    await authStore.login({ email: 'test@example.com', password: 'password' });
    
    // Prüfen, ob Synchronisierung aufgerufen wurde
    expect(syncSpy).toHaveBeenCalled();
  });
});
```

### Testabdeckungsziele

Folgende Abdeckungsziele werden für die Store-Tests angestrebt:

| Store               | Angestrebte Abdeckung | Priorität  |
|---------------------|------------------------|------------|
| Auth-Store          | 95%                    | Hoch       |
| Sessions-Store      | 90%                    | Hoch       |
| UI-Store            | 85%                    | Mittel     |
| DocumentConverter   | 90%                    | Mittel     |
| FeatureToggles      | 85%                    | Mittel     |
| Admin-Stores        | 80%                    | Niedrig    |

## Best Practices

### Namenskonventionen

- **Store-Dateien**: Verwende Substantive im Singular (`auth.ts`, `user.ts`)
- **Store-Funktionen**: Verwende das Präfix `use` (`useAuthStore`, `useSessionsStore`)
- **Actions**:
  - Verwende Verben für Aktionen (`login`, `createSession`)
  - CRUD-Operationen mit eindeutigen Verben (`createUser`, `updateUser`, `deleteUser`)
  - Toggle-Aktionen mit `toggle`-Präfix (`toggleDarkMode`)
- **Getters**: Beschreibende Namen im Präsens (`isAuthenticated`, `currentSession`)
- **State-Properties**: Kurze, beschreibende Namen ohne Wiederholung des Store-Namens

### Store-Organisation

- **Core-Stores** direkt im `stores/`-Verzeichnis
- **Feature-Stores** im `stores/`-Verzeichnis mit klaren Namen
- **Admin-Stores** im `stores/admin/`-Unterverzeichnis
- **Gemeinsame Funktionen** im `stores/composables/`-Verzeichnis

### Fehlerbehandlung

```typescript
async function login(credentials: LoginCredentials): Promise<boolean> {
  isLoading.value = true;
  error.value = null;
  
  try {
    const response = await axios.post('/api/auth/login', credentials);
    
    if (response.data.success) {
      token.value = response.data.token;
      refreshToken.value = response.data.refreshToken || null;
      user.value = response.data.user;
      expiresAt.value = Date.now() + (response.data.expiresIn || 24 * 60 * 60 * 1000);
      
      return true;
    } else {
      error.value = response.data.message || 'Login fehlgeschlagen';
      return false;
    }
  } catch (err: any) {
    const errorMessage = err.response?.data?.message || 'Netzwerkfehler beim Login';
    error.value = errorMessage;
    console.error('Login-Fehler:', errorMessage);
    return false;
  } finally {
    isLoading.value = false;
  }
}
```

## Setup-Funktion vs. Options-API

Die Store-Architektur unterstützt beide Ansätze, bevorzugt jedoch die Setup-Funktion für mehr Flexibilität.

**Setup-Funktion-Beispiel:**

```typescript
export const useUIStore = defineStore('ui', () => {
  // State
  const sidebar = ref<SidebarState>({
    isOpen: true,
    width: 280,
    activeTab: 'chat',
    collapsed: false
  });
  
  const darkMode = ref<boolean>(false);
  
  // Getters
  const isDarkMode = computed(() => darkMode.value);
  const sidebarIsOpen = computed(() => sidebar.value.isOpen && !sidebar.value.collapsed);
  
  // Actions
  function toggleDarkMode(): void {
    darkMode.value = !darkMode.value;
  }
  
  function openSidebar(): void {
    sidebar.value.isOpen = true;
    sidebar.value.collapsed = false;
  }
  
  return {
    // State
    sidebar,
    darkMode,
    
    // Getters
    isDarkMode,
    sidebarIsOpen,
    
    // Actions
    toggleDarkMode,
    openSidebar
  };
});
```

**Options-API-Beispiel:**

```typescript
export const useDocumentConverterStore = defineStore('documentConverter', {
  state: (): DocumentConverterState => ({
    uploadedFiles: [],
    convertedDocuments: [],
    conversionProgress: 0,
    // ...weiterer State
  }),
  
  getters: {
    hasDocuments: (state) => state.convertedDocuments.length > 0,
    selectedDocument: (state) => {
      if (!state.selectedDocumentId) return null;
      return state.convertedDocuments.find(
        doc => doc.id === state.selectedDocumentId
      ) || null;
    }
  },
  
  actions: {
    async uploadDocument(file: File): Promise<string | null> {
      // Implementation
    },
    
    async convertDocument(documentId: string, settings?: Partial<ConversionSettings>): Promise<boolean> {
      // Implementation
    }
  }
});
```

## CI/CD Integration

Die Store-Tests werden in die CI/CD-Pipeline integriert:

1. **Pre-Commit-Hook**: Ausführen von Tests für geänderte Store-Dateien
2. **Pull-Request**: Vollständige Testausführung und Abdeckungsbericht
3. **Nightly Build**: Ausführung aller Tests mit ausführlichen Berichten

## Migration vom Legacy-System

### Bridge-System

```
+----------------+        +----------------+        +----------------+
|  Legacy Code   | <----> |    Bridge      | <----> |  Pinia Stores  |
+----------------+        +----------------+        +----------------+
     |                         |                         |
     |                         |                         |
     v                         v                         v
+----------------+        +----------------+        +----------------+
| Global Events  | <----> |  Event Bus     | <----> | Vue Components |
+----------------+        +----------------+        +----------------+
```

### Migrationsstrategien für Store-Daten

```typescript
// Migration von Legacy-Daten
function migrateFromLegacyStorage() {
  try {
    // Legacy v1 Daten
    const legacyToken = localStorage.getItem('token');
    const legacyUser = localStorage.getItem('user');
    
    // Nur migrieren, wenn noch keine v2 Daten vorhanden sind
    if (legacyToken && !token.value) {
      token.value = legacyToken;
      
      if (legacyUser) {
        try {
          user.value = JSON.parse(legacyUser);
          
          // Stellen sicher, dass das User-Objekt die aktuellen Felder enthält
          if (!user.value.roles) {
            user.value.roles = user.value.role ? [user.value.role] : ['user'];
          }
        } catch (e) {
          console.error('Fehler beim Parsen der Legacy-Benutzerdaten', e);
        }
      }
    }
  } catch (error) {
    console.error('Fehler bei der Auth-Migration:', error);
  }
}
```

## Fehlende Stores und Implementierungsstatus

Alle ursprünglich geplanten Pinia Stores wurden erfolgreich implementiert. Folgende Stores wurden seit der letzten Dokumentationsaktualisierung hinzugefügt:

1. **Admin/Logs-Store (`admin/logs.ts`)**
   - Vollständige Implementierung der Log-Verwaltung für Administratoren
   - Integrierte Such- und Filterfunktionen für Protokolleinträge
   - Exportfunktionen für Protokolldaten
   - Performance-optimierte Datenverwaltung mit Pagination

2. **Admin/Settings-Optimized-Store (`admin/settings.optimized.ts`)**
   - Leistungsoptimierte Version des Admin-Settings-Stores
   - Implementierung von shallowRef für bessere Performance bei komplexen Einstellungsobjekten
   - Intelligente Caching-Strategien für häufig abgerufene Einstellungen
   - Erweiterte Error-Recovery-Strategien

3. **Statistics-Store (`statistics.ts`)**
   - Umfassende Implementierung für System- und Nutzungsstatistiken
   - Automatisierte Metrik-Sammlung und -Aggregation
   - Performance-Tracking mit zeitbasierter Datenaggregation
   - Integrierte Visualisierungs-Unterstützung für Diagramme und Grafiken

Alle Stores wurden vollständig in den zentralen Store-Index (`index.ts`) integriert und in den Store-Initialisierer (`storeInitializer.ts`) eingebunden, mit besonderem Fokus auf:

- Optimierte Ladeabfolge für kritische vs. nicht-kritische Stores
- Konditionale Initialisierung basierend auf Feature-Flags
- Parallele Initialisierung von unabhängigen Stores für bessere Performance
- Fehlertoleranz bei der Initialisierung

Damit ist die Pinia Stores Migration vollständig (100%) abgeschlossen.

## Zusammenfassung

Die Pinia Store Architektur des nscale DMS Assistenten bietet eine robuste, typensichere und performante Grundlage für die Vue 3-Migration. Sie verbindet modernste State-Management-Praktiken mit pragmatischen Lösungen für Legacy-Integration und umfassender Testbarkeit.

Die modulare Struktur, fortschrittlichen Kompositionsmuster und nahtlose Bridge-Integration ermöglichen eine schrittweise Migration mit minimalen Risiken, während gleichzeitig neue Funktionen effizient entwickelt werden können.

Durch konsequente Anwendung der Best Practices und die umfassende Teststrategie ist die Architektur sowohl für den aktuellen Migrationsprozess als auch für zukünftige Erweiterungen optimal aufgestellt.

---

Zuletzt aktualisiert: 11.05.2025