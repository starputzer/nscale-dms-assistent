# Pinia Store Testing für nScale DMS Assistent

**Version:** 2.0  
**Letzte Aktualisierung:** 10.05.2025

Dieses Dokument beschreibt die Best Practices und Implementierungsdetails für das Testen von Pinia Stores im Rahmen der Vue 3 Migration des nScale DMS Assistenten.

## Inhaltsverzeichnis

1. [Einführung](#einführung)
2. [Grundlegende Konzepte](#grundlegende-konzepte)
3. [Test-Setup](#test-setup)
4. [Unit-Tests für Stores](#unit-tests-für-stores)
5. [Mocking von Store-Abhängigkeiten](#mocking-von-store-abhängigkeiten)
6. [Store-Integration in Komponententests](#store-integration-in-komponententests)
7. [Fortgeschrittene Techniken](#fortgeschrittene-techniken)
8. [Best Practices](#best-practices)
9. [Store-spezifische Testansätze](#store-spezifische-testansätze)
10. [Beispiele](#beispiele)
11. [Fehlerbehebung und häufige Probleme](#fehlerbehebung-und-häufige-probleme)

## Einführung

Pinia ist der offizielle State-Management-Store für Vue 3 und ersetzt Vuex. Die Testbarkeit ist einer der Hauptvorteile von Pinia, da es eine einfachere API bereitstellt und eine bessere TypeScript-Integration bietet. Dieses Dokument fokussiert sich auf effektive Strategien zum Testen von Pinia-Stores in der nScale DMS Assistenten-Anwendung.

### Warum Pinia-Stores testen?

- **Zentrale Zustandsverwaltung**: Stores enthalten kritische Geschäftslogik und Anwendungszustände
- **Komponenten-übergreifende Funktionalität**: Fehler in Stores können weitreichende Auswirkungen haben
- **Komplexe Asynchronität**: Stores verwalten asynchrone Operationen und API-Kommunikation
- **Persistenz**: Stores sind verantwortlich für die Datenpersistenz und -migration

### Ziele der Store-Tests

- Verifizierung der korrekten Store-Initialisierung
- Überprüfung des reaktiven Verhaltens von State, Getters und Actions
- Validierung der Fehlerbehandlung und Edge Cases
- Sicherstellung der korrekten Interaktionen zwischen Stores

## Grundlegende Konzepte

Pinia-Stores bestehen aus den folgenden Hauptelementen:

- **State**: Die Daten, die der Store verwaltet
- **Getters**: Berechnete Eigenschaften, die auf dem State basieren
- **Actions**: Methoden, die den State ändern können, einschließlich asynchroner Operationen

Beim Testen von Stores konzentrieren wir uns auf alle drei Elemente, um sicherzustellen, dass:

1. Der initiale State korrekt definiert ist
2. Getter die richtigen Werte basierend auf dem State zurückgeben
3. Actions den State korrekt modifizieren 
4. Asynchrone Operationen korrekt funktionieren

## Test-Setup

### Ordnerstruktur

Tests für Pinia-Stores sind wie folgt organisiert:

```
/test/
  /stores/
    /__setup__/          # Gemeinsame Test-Setups und Hilfsfunktionen
      testSetup.ts       # Zentrale Test-Konfiguration
    /integration/        # Tests für Store-Interaktionen
      store-interactions.spec.ts
    auth.spec.ts         # Tests für den Auth-Store
    sessions.spec.ts     # Tests für den Sessions-Store
    ui.spec.ts           # Tests für den UI-Store
    documentConverter.spec.ts  # Tests für den DocumentConverter-Store
    # ... weitere Store-Tests
```

### Grundlegendes Setup

Für das Testen von Pinia-Stores verwenden wir Vitest zusammen mit der `@pinia/testing`-Bibliothek:

```typescript
// test/setup.ts (Auszug)
import { beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

// Vor jedem Test ein frisches Pinia erstellen
beforeEach(() => {
  setActivePinia(createPinia());
});
```

### Test-Helpers für Stores

Wir haben einen speziellen Helper für das Erstellen von Store-Tests entwickelt:

```typescript
// test/stores/__setup__/testSetup.ts
import { createPinia, setActivePinia } from 'pinia';
import { ApiService } from '@/services/api/ApiService';
import { vi } from 'vitest';

// ApiService mocken (wird in vielen Stores verwendet)
vi.mock('@/services/api/ApiService', () => ({
  ApiService: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}));

export function setupStoreTest() {
  // Vor jedem Test neues Pinia erstellen
  setActivePinia(createPinia());
  
  // Mocks zurücksetzen
  vi.clearAllMocks();
  
  // ApiService-Mocks zurückgeben für einfachen Zugriff
  return {
    apiMocks: {
      get: ApiService.get as ReturnType<typeof vi.fn>,
      post: ApiService.post as ReturnType<typeof vi.fn>,
      put: ApiService.put as ReturnType<typeof vi.fn>,
      delete: ApiService.delete as ReturnType<typeof vi.fn>
    }
  };
}
```

## Unit-Tests für Stores

### Testen des initialen State

```typescript
// test/stores/auth.spec.ts
import { describe, it, expect } from 'vitest';
import { useAuthStore } from '@/stores/auth';
import { setupStoreTest } from './__setup__/testSetup';

describe('Auth Store', () => {
  beforeEach(() => {
    setupStoreTest();
  });

  it('hat den korrekten initialen State', () => {
    const store = useAuthStore();
    
    expect(store.isAuthenticated).toBe(false);
    expect(store.user).toBeNull();
    expect(store.error).toBeNull();
    expect(store.isLoading).toBe(false);
  });
});
```

### Testen von Getters

```typescript
// test/stores/sessions.spec.ts
import { describe, it, expect } from 'vitest';
import { useSessionsStore } from '@/stores/sessions';
import { setupStoreTest } from './__setup__/testSetup';

describe('Sessions Store - Getters', () => {
  beforeEach(() => {
    setupStoreTest();
  });

  it('activeSession gibt die aktive Session zurück', () => {
    const store = useSessionsStore();
    
    // State direkt setzen
    store.sessions = [
      { id: '1', title: 'Session 1', isActive: false },
      { id: '2', title: 'Session 2', isActive: true },
      { id: '3', title: 'Session 3', isActive: false }
    ];
    store.activeSessionId = '2';
    
    // Getter testen
    expect(store.activeSession).toEqual({ id: '2', title: 'Session 2', isActive: true });
  });
  
  it('recentSessions gibt die letzten 5 Sessions sortiert nach Datum zurück', () => {
    const store = useSessionsStore();
    const now = new Date();
    
    // Sessions mit unterschiedlichen Daten
    store.sessions = [
      { id: '1', title: 'Älteste', lastAccessed: new Date(now.getTime() - 5000).toISOString() },
      { id: '2', title: 'Neuer', lastAccessed: new Date(now.getTime() - 3000).toISOString() },
      { id: '3', title: 'Neueste', lastAccessed: new Date(now.getTime() - 1000).toISOString() },
      { id: '4', title: 'Alt', lastAccessed: new Date(now.getTime() - 4000).toISOString() },
      { id: '5', title: 'Mittel', lastAccessed: new Date(now.getTime() - 2000).toISOString() },
      { id: '6', title: 'Uralt', lastAccessed: new Date(now.getTime() - 6000).toISOString() }
    ];
    
    const recent = store.recentSessions;
    
    expect(recent).toHaveLength(5);
    expect(recent[0].title).toBe('Neueste');
    expect(recent[1].title).toBe('Mittel');
    expect(recent[2].title).toBe('Neuer');
    expect(recent[3].title).toBe('Alt');
    expect(recent[4].title).toBe('Älteste');
  });
});
```

### Testen von Actions

```typescript
// test/stores/auth.spec.ts
import { describe, it, expect, vi } from 'vitest';
import { useAuthStore } from '@/stores/auth';
import { setupStoreTest } from './__setup__/testSetup';

describe('Auth Store - Actions', () => {
  let apiMocks;
  
  beforeEach(() => {
    apiMocks = setupStoreTest().apiMocks;
  });

  it('login setzt isAuthenticated nach erfolgreicher Anmeldung', async () => {
    const store = useAuthStore();
    
    // API-Mock konfigurieren
    apiMocks.post.mockResolvedValue({
      data: {
        success: true,
        user: {
          id: '123',
          name: 'Test User',
          email: 'test@example.com',
          role: 'user'
        },
        token: 'fake-jwt-token'
      }
    });
    
    // Action ausführen
    await store.login('test@example.com', 'password');
    
    // Ergebnisse prüfen
    expect(store.isAuthenticated).toBe(true);
    expect(store.user).toEqual({
      id: '123',
      name: 'Test User',
      email: 'test@example.com',
      role: 'user'
    });
    expect(store.error).toBeNull();
    
    // API-Aufruf prüfen
    expect(apiMocks.post).toHaveBeenCalledWith('/auth/login', {
      email: 'test@example.com',
      password: 'password'
    });
  });

  it('login setzt error-State bei Fehler', async () => {
    const store = useAuthStore();
    
    // API-Fehler simulieren
    apiMocks.post.mockRejectedValue({
      response: {
        data: {
          success: false,
          message: 'Ungültige Anmeldedaten'
        }
      }
    });
    
    // Action ausführen
    await store.login('test@example.com', 'wrong-password');
    
    // Ergebnisse prüfen
    expect(store.isAuthenticated).toBe(false);
    expect(store.user).toBeNull();
    expect(store.error).toBe('Ungültige Anmeldedaten');
  });
});
```

## Mocking von Store-Abhängigkeiten

Häufig haben Stores Abhängigkeiten zu anderen Stores oder Services. Diese sollten für isolierte Tests gemockt werden.

### API-Anfragen mocken

```typescript
// Beispiel für API-Mocking
import { vi } from 'vitest';
import { ApiService } from '@/services/api/ApiService';

vi.mock('@/services/api/ApiService', () => ({
  ApiService: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}));

describe('Auth Store', () => {
  beforeEach(() => {
    vi.mocked(ApiService.post).mockReset();
  });

  it('sollte einen Benutzer anmelden', async () => {
    // Mock für POST-Anfrage
    vi.mocked(ApiService.post).mockResolvedValueOnce({
      data: {
        success: true,
        token: 'mock-token',
        user: { id: '1', name: 'Test User' }
      }
    });
    
    // Test-Implementierung...
  });
});
```

### Mocking anderer Stores

```typescript
// test/stores/documentConverter.spec.ts
import { describe, it, expect, vi } from 'vitest';
import { useDocumentConverterStore } from '@/stores/documentConverter';
import { useSettingsStore } from '@/stores/settings';
import { setupStoreTest } from './__setup__/testSetup';

// Settings-Store mocken
vi.mock('@/stores/settings', () => ({
  useSettingsStore: vi.fn(() => ({
    documentSettings: {
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['.pdf', '.docx', '.xlsx', '.pptx'],
      compressionEnabled: true
    }
  }))
}));

describe('DocumentConverter Store', () => {
  beforeEach(() => {
    setupStoreTest();
  });

  it('validateFile verwendet die Settings aus dem Settings-Store', () => {
    const store = useDocumentConverterStore();
    
    // Test mit gültigem Dokument
    const validFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    Object.defineProperty(validFile, 'size', { value: 5 * 1024 * 1024 }); // 5MB
    
    expect(store.validateFile(validFile)).toBe(true);
    
    // Test mit ungültigem Dokument (zu groß)
    const tooLargeFile = new File(['content'], 'large.pdf', { type: 'application/pdf' });
    Object.defineProperty(tooLargeFile, 'size', { value: 15 * 1024 * 1024 }); // 15MB
    
    expect(store.validateFile(tooLargeFile)).toBe(false);
    expect(store.error).toContain('Datei zu groß');
  });
});
```

### Mocking von LocalStorage

```typescript
// test/stores/persistedStore.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePersistentStore } from '@/stores/persistentStore';
import { setupStoreTest } from './__setup__/testSetup';

describe('Persistent Store', () => {
  // LocalStorage-Mock
  const localStorageMock = (() => {
    let store = {};
    
    return {
      getItem: vi.fn(key => store[key] || null),
      setItem: vi.fn((key, value) => { store[key] = value.toString(); }),
      removeItem: vi.fn(key => { delete store[key]; }),
      clear: vi.fn(() => { store = {}; })
    };
  })();
  
  beforeEach(() => {
    setupStoreTest();
    
    // LocalStorage-Mock global verfügbar machen
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    });
    
    // Mocks zurücksetzen
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  it('lädt den Zustand aus dem LocalStorage beim Initializieren', () => {
    // Zustand im LocalStorage simulieren
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify({
      theme: 'dark',
      fontSize: 'large',
      showSidebar: false
    }));
    
    const store = usePersistentStore();
    
    // Prüfen, ob der Zustand geladen wurde
    expect(store.theme).toBe('dark');
    expect(store.fontSize).toBe('large');
    expect(store.showSidebar).toBe(false);
    
    // Prüfen, ob der richtige Schlüssel verwendet wurde
    expect(localStorageMock.getItem).toHaveBeenCalledWith('nscale-settings');
  });
});
```

## Store-Integration in Komponententests

Für Komponententests verwenden wir `createTestingPinia`, um Mock-Stores zu erstellen:

```typescript
// test/components/chat/MessageList.spec.ts
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import MessageList from '@/components/chat/MessageList.vue';
import { useSessionsStore } from '@/stores/sessions';
import { describe, it, expect, vi } from 'vitest';

describe('MessageList.vue mit Store-Integration', () => {
  it('rendert Nachrichten aus dem Store', async () => {
    // Komponente mit Test-Pinia mounten
    const wrapper = mount(MessageList, {
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            initialState: {
              sessions: {
                activeSessionId: 'session-1',
                sessions: [
                  {
                    id: 'session-1',
                    messages: [
                      { id: 'msg-1', content: 'Hallo', sender: 'user', timestamp: new Date().toISOString() },
                      { id: 'msg-2', content: 'Wie kann ich helfen?', sender: 'assistant', timestamp: new Date().toISOString() }
                    ]
                  }
                ]
              }
            }
          })
        ]
      }
    });
    
    // Store nach dem Mounting abrufen
    const sessionsStore = useSessionsStore();
    
    // Prüfen, ob Komponente die Nachrichten rendert
    expect(wrapper.findAll('.message-item')).toHaveLength(2);
    expect(wrapper.text()).toContain('Hallo');
    expect(wrapper.text()).toContain('Wie kann ich helfen?');
    
    // Zusätzliche Nachricht dem Store hinzufügen
    await sessionsStore.addMessage({
      sessionId: 'session-1',
      message: {
        id: 'msg-3',
        content: 'Ich habe eine Frage',
        sender: 'user',
        timestamp: new Date().toISOString()
      }
    });
    
    // Prüfen, ob die neue Nachricht angezeigt wird
    await wrapper.vm.$nextTick();
    expect(wrapper.findAll('.message-item')).toHaveLength(3);
    expect(wrapper.text()).toContain('Ich habe eine Frage');
  });
});
```

## Fortgeschrittene Techniken

### Testen von Store-Plugins

```typescript
// test/stores/plugins/persistencePlugin.spec.ts
import { setActivePinia, createPinia } from 'pinia';
import { persistencePlugin } from '@/stores/plugins/persistencePlugin';
import { defineStore } from 'pinia';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Persistence Plugin', () => {
  // LocalStorage-Mock
  const localStorageMock = (() => {
    let store = {};
    
    return {
      getItem: vi.fn(key => store[key] || null),
      setItem: vi.fn((key, value) => { store[key] = value.toString(); }),
      removeItem: vi.fn(key => { delete store[key]; }),
      clear: vi.fn(() => { store = {}; })
    };
  })();
  
  beforeEach(() => {
    // LocalStorage-Mock global verfügbar machen
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    });
    
    // Mocks zurücksetzen
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  it('speichert Store-Änderungen im LocalStorage', async () => {
    // Test-Store mit Persistence-Plugin definieren
    const useTestStore = defineStore('test', {
      state: () => ({
        count: 0,
        name: 'test'
      }),
      persist: {
        enabled: true,
        storageKey: 'test-store'
      }
    });
    
    // Pinia mit Plugin erstellen
    const pinia = createPinia();
    pinia.use(persistencePlugin);
    setActivePinia(pinia);
    
    // Store instanziieren
    const store = useTestStore();
    
    // Store-State aktualisieren
    store.count = 42;
    store.name = 'updated';
    
    // Warten auf den nächsten Tick für die Reaktivität
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Prüfen, ob LocalStorage mit richtigen Daten und Schlüssel aufgerufen wurde
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'test-store',
      expect.stringContaining('"count":42')
    );
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'test-store',
      expect.stringContaining('"name":"updated"')
    );
  });
});
```

### Testen von Store-Interaktionen

```typescript
// test/stores/integration/store-interactions.spec.ts
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '@/stores/auth';
import { useSessionsStore } from '@/stores/sessions';
import { ApiService } from '@/services/api/ApiService';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Store-Interaktionen', () => {
  beforeEach(() => {
    // Pinia zurücksetzen
    setActivePinia(createPinia());
    
    // API-Mocks zurücksetzen
    vi.clearAllMocks();
  });

  it('lädt Sitzungen nach erfolgreicher Anmeldung', async () => {
    // Stores initialisieren
    const authStore = useAuthStore();
    const sessionsStore = useSessionsStore();
    
    // API-Mocks konfigurieren
    vi.spyOn(ApiService, 'post').mockResolvedValueOnce({
      data: {
        success: true,
        user: { id: '123', name: 'Test User' },
        token: 'fake-token'
      }
    });
    
    vi.spyOn(ApiService, 'get').mockResolvedValueOnce({
      data: {
        sessions: [
          { id: 'session-1', title: 'Session 1' },
          { id: 'session-2', title: 'Session 2' }
        ]
      }
    });
    
    // Sessions-Store-Methode überwachen
    const loadSessionsSpy = vi.spyOn(sessionsStore, 'loadSessions');
    
    // Anmelden
    await authStore.login('test@example.com', 'password');
    
    // Prüfen, ob loadSessions aufgerufen wurde
    expect(loadSessionsSpy).toHaveBeenCalled();
    
    // Prüfen, ob Sessions geladen wurden
    expect(sessionsStore.sessions).toHaveLength(2);
    expect(sessionsStore.sessions[0].id).toBe('session-1');
    expect(sessionsStore.sessions[1].id).toBe('session-2');
  });
});
```

## Best Practices

### 1. Isolierung von Store-Tests

- Jeden Store isoliert testen, um Abhängigkeiten zu minimieren
- Externe Abhängigkeiten mocken (API, andere Stores, Browser-APIs)
- Vor jedem Test einen frischen Store-Zustand erstellen

### 2. Testing-Hierarchie

Folgende Testabdeckung für Stores anstreben:

1. **Basisebene**: Initialer State und einfache Getter
2. **Mittlere Ebene**: Actions und komplexere Getter
3. **Fortgeschrittene Ebene**: Asynchrone Operationen und Fehlerbehandlung
4. **Integrationstests**: Interaktionen zwischen Stores

### 3. Realistic Mocking

- API-Antworten realistisch mocken, einschließlich Datenstrukturen und Fehlerszenarien
- Fehlerszenarien gründlich testen (Netzwerkfehler, Server-Fehler, Validierungsfehler)
- Verschiedene Edge-Cases testen (leere Arrays, null-Werte, große Datensätze)

### 4. Testabdeckung

Empfohlene Testabdeckung für verschiedene Store-Typen:

| Store-Typ | Minimale Abdeckung | Ziel-Abdeckung | Priorität |
|-----------|-------------------|---------------|-----------|
| Auth      | 85%               | 95%           | Hoch      |
| Sessions  | 80%               | 90%           | Hoch      |
| UI        | 70%               | 85%           | Mittel    |
| DocumentConverter | 75% | 90% | Mittel |
| Admin-Stores | 70% | 80% | Niedrig |

### 5. Arrange-Act-Assert

Alle Tests sollten dem AAA-Pattern folgen:

```typescript
it('aktualisiert den Benutzernamen nach Bearbeitung', async () => {
  // Arrange
  const store = useUserStore();
  store.user = { id: '1', name: 'Alter Name' };
  
  // Act
  await store.updateUserName('Neuer Name');
  
  // Assert
  expect(store.user.name).toBe('Neuer Name');
});
```

## Store-spezifische Testansätze

### Auth-Store

Beim Testen des Auth-Stores sind folgende Aspekte besonders wichtig:

1. **Login/Logout-Funktionalität**
2. **Token-Management**
3. **Berechtigungsprüfung**
4. **Persistenz**

```typescript
// auth.spec.ts
describe('Auth Store', () => {
  describe('Login', () => {
    // Tests für Login-Funktionalität
  });
  
  describe('Token Management', () => {
    it('sollte abgelaufene Tokens erkennen', () => {
      // Test-Implementierung
    });
    
    it('sollte einen Token automatisch aktualisieren', async () => {
      // Test-Implementierung
    });
  });
  
  describe('Berechtigungsprüfung', () => {
    it('sollte Rollen korrekt prüfen', () => {
      // Test-Implementierung
    });
  });
});
```

### Sessions-Store

Der Sessions-Store erfordert Tests für:

1. **Session-CRUD-Operationen**
2. **Nachrichtenverwaltung**
3. **Streaming-Funktionalität**
4. **Offline-Unterstützung**

```typescript
// sessions.spec.ts
describe('Sessions Store', () => {
  describe('Session-Verwaltung', () => {
    it('sollte eine neue Session erstellen', async () => {
      // Test-Implementierung
    });
    
    it('sollte eine Session aktualisieren', async () => {
      // Test-Implementierung
    });
  });
  
  describe('Nachrichtenverwaltung', () => {
    it('sollte Nachrichten senden und empfangen', async () => {
      // Test-Implementierung
    });
    
    it('sollte mit Streaming-Antworten umgehen können', async () => {
      // Test-Implementierung
    });
  });
});
```

### DocumentConverter-Store

Der DocumentConverter-Store fokussiert sich auf:

1. **Upload-Prozess**
2. **Konvertierungsprozess**
3. **Fehlerbehandlung**
4. **Filterfunktionen**

```typescript
// documentConverter.spec.ts
describe('DocumentConverter Store', () => {
  describe('Upload', () => {
    it('sollte ein Dokument hochladen', async () => {
      // Test-Implementierung
    });
  });
  
  describe('Konvertierung', () => {
    it('sollte ein Dokument konvertieren', async () => {
      // Test-Implementierung
    });
    
    it('sollte die Konvertierung abbrechen können', async () => {
      // Test-Implementierung
    });
  });
});
```

## Beispiele

### Beispiel: Vollständiger Test für Auth-Store

```typescript
// test/stores/auth.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuthStore } from '@/stores/auth';
import { setupStoreTest } from './__setup__/testSetup';
import { ApiService } from '@/services/api/ApiService';

describe('Auth Store', () => {
  let apiMocks;
  
  beforeEach(() => {
    apiMocks = setupStoreTest().apiMocks;
    localStorage.clear();
  });

  describe('Initialer State', () => {
    it('hat den korrekten initialen State', () => {
      const store = useAuthStore();
      
      expect(store.isAuthenticated).toBe(false);
      expect(store.user).toBeNull();
      expect(store.error).toBeNull();
      expect(store.isLoading).toBe(false);
      expect(store.token).toBeNull();
    });

    it('lädt den Token aus dem LocalStorage, wenn vorhanden', () => {
      // Token im LocalStorage simulieren
      localStorage.setItem('auth-token', 'saved-token');
      
      const store = useAuthStore();
      
      expect(store.token).toBe('saved-token');
      expect(store.isAuthenticated).toBe(true);
    });
  });

  describe('Getters', () => {
    it('isAdmin gibt true zurück, wenn der Benutzer ein Admin ist', () => {
      const store = useAuthStore();
      
      // Normalen Benutzer simulieren
      store.user = { id: '1', name: 'User', role: 'user' };
      expect(store.isAdmin).toBe(false);
      
      // Admin-Benutzer simulieren
      store.user = { id: '2', name: 'Admin', role: 'admin' };
      expect(store.isAdmin).toBe(true);
    });

    it('userInitials gibt die Initialen des Benutzernamens zurück', () => {
      const store = useAuthStore();
      
      // Ohne Benutzer
      expect(store.userInitials).toBe('');
      
      // Einfacher Name
      store.user = { id: '1', name: 'John Doe', role: 'user' };
      expect(store.userInitials).toBe('JD');
      
      // Komplexer Name
      store.user = { id: '1', name: 'Jean-Claude Van Damme', role: 'user' };
      expect(store.userInitials).toBe('JV');
    });
  });

  describe('Actions', () => {
    it('login setzt den Benutzer und Token nach erfolgreicher Anmeldung', async () => {
      const store = useAuthStore();
      
      // Login-Erfolg simulieren
      apiMocks.post.mockResolvedValue({
        data: {
          success: true,
          user: { id: '1', name: 'Test User', role: 'user' },
          token: 'test-token'
        }
      });
      
      await store.login('test@example.com', 'password');
      
      expect(store.isAuthenticated).toBe(true);
      expect(store.user).toEqual({ id: '1', name: 'Test User', role: 'user' });
      expect(store.token).toBe('test-token');
      expect(store.error).toBeNull();
      expect(store.isLoading).toBe(false);
      
      // Token sollte im LocalStorage gespeichert sein
      expect(localStorage.getItem('auth-token')).toBe('test-token');
    });

    it('login setzt error-State bei Anmeldefehler', async () => {
      const store = useAuthStore();
      
      // Login-Fehler simulieren
      apiMocks.post.mockRejectedValue({
        response: {
          data: {
            success: false,
            message: 'Ungültige Anmeldedaten'
          }
        }
      });
      
      await store.login('wrong@example.com', 'wrong-password');
      
      expect(store.isAuthenticated).toBe(false);
      expect(store.user).toBeNull();
      expect(store.token).toBeNull();
      expect(store.error).toBe('Ungültige Anmeldedaten');
      expect(store.isLoading).toBe(false);
    });
  });
});
```

## Fehlerbehebung und häufige Probleme

### Häufige Testprobleme und Lösungen

1. **Reaktivität in Tests funktioniert nicht**
   - Problem: Änderungen an reaktiven Werten werden nicht erkannt
   - Lösung: `await nextTick()` oder `await wrapper.vm.$nextTick()` verwenden, um auf Vue-Reaktivitätsupdates zu warten

2. **Asynchrone Tests schlagen fehl**
   - Problem: Tests beenden sich, bevor asynchrone Operationen abgeschlossen sind
   - Lösung: Immer `async/await` für asynchrone Tests verwenden und alle Promises auflösen

3. **Mocks werden nicht zurückgesetzt**
   - Problem: Mock-Daten bleiben zwischen Tests bestehen
   - Lösung: `vi.mocked(fn).mockReset()` in `beforeEach()` verwenden

4. **Store-Zustand bleibt zwischen Tests bestehen**
   - Problem: Store-Änderungen beeinflussen nachfolgende Tests
   - Lösung: `setActivePinia(createPinia())` in jedem Test aufrufen

### Debugging von Store-Tests

Tipps zum Debuggen von Store-Tests:

```typescript
// Debug-Ausgaben in Tests hinzufügen
it('sollte einen komplexen Zustand korrekt verwalten', async () => {
  const store = useComplexStore();
  
  // Debug-Ausgabe vor der Aktion
  console.log('Vor der Aktion:', store.$state);
  
  await store.complexAction();
  
  // Debug-Ausgabe nach der Aktion
  console.log('Nach der Aktion:', store.$state);
  
  expect(store.result).toBe(expected);
});
```

## Zusammenfassung

Das Testen von Pinia-Stores ist ein entscheidender Bestandteil der Qualitätssicherung im nScale DMS Assistenten. Durch gut strukturierte, gründliche Tests können wir die Zuverlässigkeit und Wartbarkeit unserer Stores gewährleisten, insbesondere während der Migration von Vanilla JavaScript zu Vue 3 SFC.

Verwenden Sie diesen Leitfaden als Referenz für das Erstellen von Store-Tests. Durch die Einhaltung dieser Best Practices und die Verwendung der bereitgestellten Testtools können Sie robuste und wartbare Tests für alle Store-Komponenten in der Anwendung entwickeln.

---

Erstellt: 10.05.2025  
Letzte Aktualisierung: 10.05.2025