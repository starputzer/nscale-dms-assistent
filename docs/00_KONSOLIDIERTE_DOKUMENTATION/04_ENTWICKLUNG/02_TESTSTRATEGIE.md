---
title: "Test-Strategie und Implementierung"
version: "1.1.0"
date: "10.05.2025"
lastUpdate: "10.05.2025"
author: "Martin Heinrich"
status: "Aktiv"
priority: "Hoch"
category: "Entwicklung"
tags: ["Tests", "Qualitätssicherung", "Vitest", "Playwright", "Vue 3", "Pinia"]
---

# Test-Strategie und Implementierung

> **Letzte Aktualisierung:** 10.05.2025 | **Version:** 1.1.0 | **Status:** Aktiv

## Inhaltsverzeichnis

1. [Übersicht](#übersicht)
   - [Ziele](#ziele)
   - [Testebenen](#testebenen)
   - [Testabdeckungsziele](#testabdeckungsziele)
2. [Unit-Tests](#unit-tests)
   - [Vanilla JavaScript Tests](#vanilla-javascript-tests)
   - [Vue-Komponententests](#vue-komponententests)
   - [Pinia Store Tests](#pinia-store-tests)
3. [Integrationstests](#integrationstests)
   - [Store-Integration](#store-integration)
   - [Komponenten-Integration](#komponenten-integration)
4. [End-to-End-Tests](#end-to-end-tests)
   - [Aufbau und Organisation](#aufbau-und-organisation)
   - [Page Object Pattern](#page-object-pattern)
   - [Kritische Benutzerflüsse](#kritische-benutzerflüsse)
   - [Visuelle Regressionstests](#visuelle-regressionstests)
   - [Barrierefreiheitstests](#barrierefreiheitstests)
5. [Testinfrastruktur](#testinfrastruktur)
   - [Frameworks und Werkzeuge](#frameworks-und-werkzeuge)
   - [Konfiguration](#konfiguration)
   - [Test-Setup](#test-setup)
   - [CI/CD-Integration](#cicd-integration)
6. [Best Practices](#best-practices)
   - [Allgemeine Testprinzipien](#allgemeine-testprinzipien)
   - [Vue 3-spezifische Best Practices](#vue-3-spezifische-best-practices)
   - [E2E-Test Best Practices](#e2e-test-best-practices)
   - [Mocking-Strategien](#mocking-strategien)
7. [Testausführung](#testausführung)
   - [Testbefehle](#testbefehle)
   - [Fehlerbehebung](#fehlerbehebung)
   - [Tipps zum Debuggen](#tipps-zum-debuggen)
8. [Anleitung zum Hinzufügen neuer Tests](#anleitung-zum-hinzufügen-neuer-tests)
   - [Unit-Tests](#unit-tests-hinzufügen)
   - [Komponententests](#komponententests-hinzufügen)
   - [E2E-Tests](#e2e-tests-hinzufügen)
9. [Test-Migration](#test-migration)
   - [Strategie](#strategie)
   - [Priorisierung](#priorisierung)

## Übersicht

Die Test-Strategie des nScale DMS Assistenten ist darauf ausgerichtet, die Qualität, Zuverlässigkeit und Robustheit der Anwendung durch eine Kombination verschiedener Testebenen zu gewährleisten. Die Strategie berücksichtigt sowohl die bestehende Vanilla-JavaScript-Implementierung als auch die neue Vue 3 Single-File-Components (SFC) Architektur.

### Ziele

- Sicherstellen der funktionalen Korrektheit aller Komponenten
- Gewährleistung der Benutzerfreundlichkeit und korrekten Funktionsweise aller Benutzerflüsse
- Erhalt der Stabilität während der Migration zu Vue 3 SFC
- Erleichterung der kontinuierlichen Integration und Bereitstellung
- Verbesserung der Code-Qualität und Wartbarkeit
- Vermeidung von Regressionen bei neuen Funktionen oder Bugfixes
- Sicherstellung der UI-Konsistenz durch visuelle Tests
- Einhaltung von Barrierefreiheitsstandards

### Testebenen

Die Teststrategie umfasst mehrere Ebenen:

1. **Unit-Tests**: Testen einzelner Komponenten, Funktionen und Module in Isolation
   - Vanilla JavaScript Tests (Kernlogik)
   - Vue-Komponententests (UI-Komponenten)
   - Pinia Store Tests (Zustandsverwaltung)

2. **Integrationstests**: Testen der Interaktion zwischen verschiedenen Modulen
   - Komponentenübergreifende Tests
   - Store-Integration in Komponenten
   - API-Integration

3. **End-to-End-Tests**: Testen vollständiger Benutzerflüsse
   - Kritische Geschäftsprozesse
   - Visuelle Regressionstests
   - Barrierefreiheitstests

### Testabdeckungsziele

| Komponente | Aktuell | Ziel | Zeitrahmen |
|------------|---------|------|------------|
| Chat-Funktionalität | ~90% | 95% | Q3 2025 |
| Session-Management | ~85% | 90% | Q3 2025 |
| Dokumentenkonverter | ~78% | 90% | Q4 2025 |
| UI-Basiskomponenten | ~85% | 85% | Q1 2026 |
| Admin-Komponenten | ~80% | 85% | Q1 2026 |
| Vue-Komponenten (gesamt) | ~82% | 85% | Q1 2026 |
| E2E-Abdeckung | 45% | 70% | Q2 2026 |
| Visuelle Abdeckung | 35% | 60% | Q3 2026 |
| Barrierefreiheit | 30% | 80% | Q3 2026 |

## Unit-Tests

### Vanilla JavaScript Tests

Diese Tests sind entscheidend während der Migration zu Vue 3 SFC, da sie die Kernfunktionalität unabhängig vom UI-Framework testen.

**Struktur**:
```
test/vanilla/
  ├── setup.js              # Gemeinsame Test-Setup und Mocks
  ├── chat/                 # Chat-Funktionalitätstests
  │   └── chat.spec.js
  ├── app/                  # App/Session-Management-Tests
  │   └── session.spec.js
  └── document-converter/   # Dokumentenkonverter-Tests
      └── document-converter.spec.js
```

**Abgedeckte Bereiche**:

1. **Chat-Funktionalität**:
   - Streaming-Kommunikation
   - Nachrichtenverwaltung
   - Ereignisbehandlung
   - Fehlerszenarien

2. **Session-Management**:
   - Sitzungsoperationen (Erstellen, Laden, Wechseln, Löschen)
   - Persistenz
   - UI-Zustand
   - API-Interaktionen

3. **Dokumentenkonverter**:
   - Upload-Funktionalität
   - Konvertierungsprozess
   - Dokumentenverwaltung
   - End-to-End-Workflow

**Beispiel: Vanilla JavaScript Test**:

```javascript
// test/vanilla/chat/chat.spec.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockAxios, mockEventSource } from '../setup';
import { 
  sendMessage, 
  processStreamingResponse,
  handleConnectionError 
} from '../../../frontend/js/chat';

describe('Chat Functionality', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
    // DOM-Elemente für die Tests simulieren
    document.body.innerHTML = `
      <div id="chat-messages"></div>
      <textarea id="user-input"></textarea>
      <button id="send-button"></button>
    `;
  });

  it('sollte eine Benutzernachricht senden und die Antwort verarbeiten', async () => {
    // API-Antwort simulieren
    mockAxios.post.mockResolvedValue({
      data: {
        message: 'Test-Antwort vom Server',
        messageId: '123'
      }
    });
    
    // Funktion aufrufen
    await sendMessage('Testnachricht');
    
    // Prüfen, ob die Nachricht korrekt gesendet wurde
    expect(mockAxios.post).toHaveBeenCalledWith('/api/chat', {
      message: 'Testnachricht',
      sessionId: expect.any(String)
    });
    
    // Prüfen, ob die Antwort im DOM angezeigt wird
    const chatMessages = document.getElementById('chat-messages');
    expect(chatMessages.innerHTML).toContain('Testnachricht');
    expect(chatMessages.innerHTML).toContain('Test-Antwort vom Server');
  });

  // Weitere Tests für Streaming, Fehlerbehandlung, etc.
});
```

### Vue-Komponententests

Vue-Komponententests prüfen die UI-Komponenten der Anwendung mit Vue Test Utils.

**Ansätze**:
- Vue Test Utils für direkte Komponententests
- Testing Library für benutzerorientierte Tests

**Beispiel: Komponententest mit Vue Test Utils**:

```typescript
// test/components/ui/base/Button.spec.ts
import { mount } from '@vue/test-utils';
import Button from '@/components/ui/base/Button.vue';
import { describe, it, expect } from 'vitest';

describe('Button.vue', () => {
  it('rendert den Button-Text korrekt', () => {
    const wrapper = mount(Button, {
      props: { label: 'Klick mich' }
    });
    
    expect(wrapper.text()).toContain('Klick mich');
  });

  it('emittiert ein click-Event beim Klicken', async () => {
    const wrapper = mount(Button, {
      props: { label: 'Klick mich' }
    });
    
    await wrapper.trigger('click');
    
    expect(wrapper.emitted('click')).toBeTruthy();
  });

  it('rendert im disabled-Zustand korrekt', () => {
    const wrapper = mount(Button, {
      props: { 
        label: 'Deaktiviert',
        disabled: true
      }
    });
    
    const button = wrapper.find('button');
    expect(button.attributes('disabled')).toBeDefined();
    expect(button.classes()).toContain('nscale-btn--disabled');
  });
});
```

**Beispiel: Komponententest mit Testing Library**:

```typescript
// test/components/chat/MessageList.spec.ts
import { render, screen, fireEvent } from '@testing-library/vue';
import MessageList from '@/components/chat/MessageList.vue';
import { describe, it, expect, vi } from 'vitest';

describe('MessageList.vue - Testing Library', () => {
  it('rendert die Liste der Nachrichten korrekt', async () => {
    const messages = [
      { id: '1', content: 'Nachricht 1', sender: 'user', timestamp: new Date().toISOString() },
      { id: '2', content: 'Nachricht 2', sender: 'assistant', timestamp: new Date().toISOString() }
    ];
    
    render(MessageList, {
      props: { messages }
    });
    
    expect(screen.getByText('Nachricht 1')).toBeInTheDocument();
    expect(screen.getByText('Nachricht 2')).toBeInTheDocument();
  });

  it('ruft onSelectMessage auf, wenn auf eine Nachricht geklickt wird', async () => {
    const messages = [
      { id: '1', content: 'Nachricht 1', sender: 'user', timestamp: new Date().toISOString() }
    ];
    const onSelectMessage = vi.fn();
    
    render(MessageList, {
      props: { 
        messages,
        onSelectMessage
      }
    });
    
    const messageElement = screen.getByText('Nachricht 1');
    await fireEvent.click(messageElement);
    
    expect(onSelectMessage).toHaveBeenCalledWith('1');
  });
});
```

**Beispiel: Admin-Komponente Test (AdminSystemSettings)**:

```typescript
// test/components/admin/tabs/AdminSystemSettings.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import AdminSystemSettings from '@/components/admin/tabs/AdminSystemSettings.vue';
import { createTestingPinia } from '@pinia/testing';

describe('AdminSystemSettings.vue', () => {
  // Mock Abhängigkeiten
  vi.mock('@/composables/useToast', () => ({
    useToast: () => ({
      showToast: vi.fn()
    })
  }));
  
  it('fetches settings on mount', async () => {
    // Create pinia and get store before mounting
    const pinia = createTestingPinia({ createSpy: vi.fn });
    
    // Get the store and spy on it
    const { useAdminSettingsStore } = await import('@/stores/admin/settings');
    const settingsStore = useAdminSettingsStore(pinia);
    settingsStore.fetchSettings = vi.fn().mockResolvedValue({});
    
    // Mount with the prepared store
    const wrapper = mount(AdminSystemSettings, {
      global: {
        plugins: [pinia],
        mocks: {
          $t: (key, fallback) => fallback || key
        }
      }
    });
    
    await flushPromises();
    
    // Verify the component called the store method
    expect(settingsStore.fetchSettings).toHaveBeenCalled();
  });
  
  it('saves settings when calling saveSettings', async () => {
    const pinia = createTestingPinia({ createSpy: vi.fn });
    
    const { useAdminSettingsStore } = await import('@/stores/admin/settings');
    const settingsStore = useAdminSettingsStore(pinia);
    
    // Spy on methods
    settingsStore.updateSettings = vi.fn();
    settingsStore.saveSettings = vi.fn().mockResolvedValue({});
    
    const wrapper = mount(AdminSystemSettings, {
      global: {
        plugins: [pinia],
        mocks: { $t: (key, fallback) => fallback || key }
      }
    });
    
    await flushPromises();
    
    // Call saveSettings method directly
    await wrapper.vm.saveSettings();
    
    // Store methods should have been called
    expect(settingsStore.updateSettings).toHaveBeenCalled();
    expect(settingsStore.saveSettings).toHaveBeenCalled();
  });
  
  it('handles errors when clearing cache', async () => {
    const pinia = createTestingPinia({ createSpy: vi.fn });
    
    const { useAdminSystemStore } = await import('@/stores/admin/system');
    const systemStore = useAdminSystemStore(pinia);
    
    // Mock console.error to avoid test output noise
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Make clearCache throw an error
    const testError = new Error('Test error');
    systemStore.clearCache = vi.fn().mockRejectedValue(testError);
    
    const wrapper = mount(AdminSystemSettings, {
      global: {
        plugins: [pinia],
        mocks: { $t: (key, fallback) => fallback || key }
      }
    });
    
    await flushPromises();
    
    // Set up the state for clearing cache
    wrapper.vm.showClearCacheConfirm = true;
    
    // Call the clearCache method
    await wrapper.vm.clearCache();
    
    // Dialog should be closed and error should be handled
    expect(wrapper.vm.showClearCacheConfirm).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error clearing cache:', testError);
    
    consoleErrorSpy.mockRestore();
  });
  
  // Weitere Tests für Fehlerbehandlung, Benutzerinteraktionen, etc.
});
```

### Pinia Store Tests

Pinia Store-Tests überprüfen die Zustandsverwaltung der Anwendung.

**Testansatz**:
1. Testen des initialen Zustands
2. Testen von Getters
3. Testen von Actions

**Beispiel: Pinia Store Test**:

```typescript
// test/stores/auth.spec.ts
import { createPinia, setActivePinia } from 'pinia';
import { useAuthStore } from '@/stores/auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiService } from '@/services/api/ApiService';

// API-Service mocken
vi.mock('@/services/api/ApiService', () => ({
  ApiService: {
    post: vi.fn(),
    get: vi.fn()
  }
}));

describe('Auth Store', () => {
  beforeEach(() => {
    // Vor jedem Test ein frisches Pinia erstellen
    setActivePinia(createPinia());
    // Mocks zurücksetzen
    vi.clearAllMocks();
  });

  it('setzt den Anfangszustand korrekt', () => {
    const store = useAuthStore();
    
    expect(store.user).toBeNull();
    expect(store.isAuthenticated).toBe(false);
    expect(store.isLoading).toBe(false);
    expect(store.error).toBeNull();
  });

  it('aktualisiert isAuthenticated nach erfolgreicher Anmeldung', async () => {
    const store = useAuthStore();
    
    // API-Mock konfigurieren
    vi.mocked(ApiService.post).mockResolvedValue({
      data: {
        success: true,
        user: { 
          id: '1', 
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
      id: '1',
      name: 'Test User',
      email: 'test@example.com',
      role: 'user'
    });
    expect(store.error).toBeNull();
    
    // API-Aufruf prüfen
    expect(ApiService.post).toHaveBeenCalledWith('/api/auth/login', {
      email: 'test@example.com',
      password: 'password'
    });
  });

  it('setzt error-State bei Anmeldefehler', async () => {
    const store = useAuthStore();
    
    // API-Fehler simulieren
    vi.mocked(ApiService.post).mockRejectedValue({
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

## Integrationstests

Integrationstests überprüfen die Zusammenarbeit verschiedener Komponenten und Module.

### Store-Integration

Tests für die Integration von Stores mit anderen Stores oder Services.

**Beispiel: Store-Integration**:

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

### Komponenten-Integration

Tests für die Integration verschiedener Komponenten.

**Beispiel: Komponenten-Integration**:

```typescript
// test/integration/DocumentConverter.integration.spec.ts
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import DocConverterContainer from '@/components/admin/document-converter/DocConverterContainer.vue';
import { useDocumentConverterStore } from '@/stores/documentConverter';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('DocumentConverter Integration', () => {
  let wrapper;
  let store;
  
  beforeEach(() => {
    wrapper = mount(DocConverterContainer, {
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            initialState: {
              documentConverter: {
                uploadedFiles: [],
                convertedDocuments: [],
                isConverting: false,
                error: null
              }
            }
          })
        ]
      }
    });
    
    store = useDocumentConverterStore();
  });
  
  it('initialisiert den Store beim Mounting', () => {
    expect(store.initialize).toHaveBeenCalled();
  });
  
  it('zeigt den Uploader im initialen Zustand an', () => {
    expect(wrapper.findComponent({ name: 'FileUpload' }).exists()).toBe(true);
  });
  
  it('zeigt die Konversionsfortschrittsanzeige während der Konvertierung', async () => {
    // Store-Zustand aktualisieren
    store.isConverting = true;
    await wrapper.vm.$nextTick();
    
    expect(wrapper.findComponent({ name: 'ConversionProgress' }).exists()).toBe(true);
  });
});
```

## End-to-End-Tests

End-to-End-Tests simulieren reale Benutzerinteraktionen mit der Anwendung. Wir verwenden Playwright mit dem Page Object Pattern.

### Aufbau und Organisation

Die E2E-Tests sind wie folgt organisiert:

```
e2e/
  ├── fixtures/           # Testdaten und Hilfsdateien
  │   ├── test-users.ts   # Benutzerdaten für Anmeldungen
  │   └── test-documents.ts # Dokumentdaten für Konverter-Tests
  ├── pages/              # Page Objects für verschiedene Seiten
  │   ├── login-page.ts
  │   ├── chat-page.ts
  │   └── document-converter-page.ts
  ├── tests/              # Testdateien nach Funktionalität geordnet
  │   ├── auth/           # Authentifizierungstests
  │   ├── chat/           # Chat-Systemtests
  │   ├── document-converter/ # Dokumentenkonverter-Tests
  │   ├── admin/          # Admin-Bereichstests
  │   ├── error-handling/ # Fehlerbehandlungstests
  │   └── visual/         # Visuelle Regressionstests
  └── utils/              # Hilfsfunktionen für Tests
      └── test-helpers.ts
```

### Page Object Pattern

Das Page Object Pattern kapselt die Interaktionen mit Seiten in eigenen Klassen:

```typescript
// e2e/pages/login-page.ts
import { Page, Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('input[name="email"]');
    this.passwordInput = page.locator('input[name="password"]');
    this.loginButton = page.locator('button[type="submit"]');
    this.errorMessage = page.locator('[data-testid="error-message"]');
  }

  async navigate() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async expectErrorMessage(message: string) {
    await expect(this.errorMessage).toBeVisible();
    await expect(this.errorMessage).toContainText(message);
  }
}
```

### Kritische Benutzerflüsse

Die folgenden kritischen Benutzerflüsse werden durch E2E-Tests abgedeckt:

1. **Authentifizierung**:
   - Login mit gültigen Anmeldedaten
   - Login mit ungültigen Anmeldedaten
   - Logout
   - Automatische Weiterleitung zur Login-Seite bei nicht authentifizierten Anfragen
   - Persistenz der Authentifizierung nach Browser-Refresh

2. **Chat-System**:
   - Senden einer Nachricht und Empfangen einer Antwort
   - Streaming von Antworten
   - Erstellen, Umbenennen und Löschen von Chat-Sessions
   - Wechseln zwischen Sessions
   - Tagging und Kategorisierung von Sessions

3. **Dokumentenkonverter**:
   - Hochladen und Konvertieren verschiedener Dokumenttypen
   - Anzeigen der Dokumentvorschau
   - Herunterladen konvertierter Dokumente
   - Löschen von Dokumenten

4. **Admin-Bereich**:
   - Benutzerverwaltung (Erstellen, Bearbeiten, Löschen)
   - Feature-Toggles (Aktivieren, Deaktivieren)
   - Systemeinstellungen

5. **Fehlerbehandlung**:
   - Netzwerkfehler während des Nachrichtensendens
   - Timeouts bei API-Anfragen
   - Verbindungsverlust während des Streamings
   - Wiederherstellung nach Netzwerkfehlern

**Beispiel: E2E-Test für Login**:

```typescript
// e2e/tests/auth/login.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/login-page';
import { ChatPage } from '../../pages/chat-page';
import { testUsers } from '../../fixtures/test-users';

test.describe('Authentifizierungs-Flow', () => {
  let loginPage: LoginPage;
  let chatPage: ChatPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    chatPage = new ChatPage(page);
    await loginPage.navigate();
  });

  test('Erfolgreiche Anmeldung mit gültigen Anmeldedaten', async ({ page }) => {
    const validUser = testUsers.regular;
    
    await loginPage.login(validUser.email, validUser.password);
    
    // Prüfen, ob Weiterleitung zum Chat erfolgt ist
    await expect(page).toHaveURL(/.*\/chat/);
    
    // Prüfen, ob der Benutzername in der UI erscheint
    const userNameElement = chatPage.userNameElement;
    await expect(userNameElement).toBeVisible();
    await expect(userNameElement).toContainText(validUser.name);
  });

  test('Zeigt Fehlermeldung bei ungültigen Anmeldedaten', async () => {
    await loginPage.login('falsch@example.com', 'falschesPasswort');
    
    const errorMessage = loginPage.errorMessage;
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('Ungültige Anmeldedaten');
  });
});
```

### Visuelle Regressionstests

Visuelle Regressionstests erfassen und vergleichen Screenshots, um unbeabsichtigte UI-Änderungen zu erkennen.

```typescript
// e2e/tests/visual/chat.visual.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/login-page';
import { ChatPage } from '../../pages/chat-page';

test.describe('Chat-Visuelle Regressionstests', () => {
  test.use({ storageState: './e2e/fixtures/user-auth.json' });
  
  test('Chat-Ansicht mit Nachrichten entspricht dem Snapshot', async ({ page }) => {
    const chatPage = new ChatPage(page);
    await chatPage.goto();
    
    // Nachrichten simulieren
    await chatPage.simulateMessages([
      { content: 'Hallo, wie kann ich helfen?', role: 'assistant' },
      { content: 'Ich habe eine Frage zu nScale', role: 'user' },
      { content: 'Natürlich, was möchten Sie wissen?', role: 'assistant' }
    ]);
    
    // Screenshot aufnehmen und mit Baseline vergleichen
    await expect(page).toHaveScreenshot('chat-with-messages.png', {
      mask: [page.locator('.timestamp')], // Zeitstempel maskieren
      threshold: 0.2 // 0.2% Toleranz für Unterschiede
    });
  });
});
```

### Barrierefreiheitstests

Barrierefreiheitstests stellen sicher, dass unsere Anwendung den WCAG-Richtlinien entspricht.

```typescript
// e2e/tests/a11y/login.a11y.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/login-page';
import AxeBuilder from '@axe-core/playwright';

test.describe('Login-Seite - Barrierefreiheit', () => {
  let loginPage: LoginPage;
  
  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.navigate();
  });
  
  test('Login-Seite hat keine kritischen Barrierefreiheits-Verstöße', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
```

## Testinfrastruktur

### Frameworks und Werkzeuge

Für Tests werden folgende Frameworks und Tools verwendet:

- **[Vitest](https://vitest.dev/)**: Unit- und Komponententests
- **[Vue Test Utils](https://test-utils.vuejs.org/)**: Vue-Komponententests
- **[Testing Library](https://testing-library.com/docs/vue-testing-library/intro)**: Benutzerorientierte Komponententests
- **[Playwright](https://playwright.dev/)**: End-to-End-Tests
- **[Axe](https://github.com/dequelabs/axe-core)**: Barrierefreiheitstests

### Konfiguration

**Vitest Konfiguration**:

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import Vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [Vue()],
  test: {
    // Globale Konfiguration
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    
    // Testabdeckung
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'test/',
        '**/*.d.ts',
        '**/*.spec.ts',
        'dist/',
        'coverage/',
        'public/',
        'frontend/', // Legacy-Code
      ],
      // Zielabdeckungen
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    
    // Parallelisierung für schnelleres Testen
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },
    
    // Testmuster und Ausschluss
    include: [
      'test/**/*.spec.ts',
      'test/**/*.spec.js',
      'src/**/*.spec.ts',
      'src/**/__tests__/**/*.ts',
    ],
    exclude: [
      'test/vanilla/**/*.spec.js', // diese nutzen vanilla.vitest.config.js
      'e2e/**',
      'node_modules/',
    ],
    
    // Berichterstattung und UI
    reporters: ['default'],
    outputFile: './test-results/results.json',
    
    // Timeouts
    testTimeout: 10000,
    hookTimeout: 10000,
    
    // Debugging-Unterstützung
    onConsoleLog(log, type) {
      if (log.includes('Vue warn')) {
        console.warn('Vue warning detected in tests:', log);
      }
      return false; // gibt die Konsole trotzdem aus
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'test': fileURLToPath(new URL('./test', import.meta.url)),
    },
  },
});
```

**Playwright Konfiguration**:

```typescript
// playwright.config.ts
import { PlaywrightTestConfig, devices } from '@playwright/test';

const config: PlaywrightTestConfig = {
  testDir: './e2e/tests',
  timeout: 30000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: ['html', ['list', { printSteps: true }]],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    baseURL: 'http://localhost:5173',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: !process.env.CI,
  },
};

export default config;
```

### Test-Setup

```typescript
// test/setup.ts
import { vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { config } from '@vue/test-utils';
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/vue';
import * as matchers from '@testing-library/jest-dom/matchers';
import { expect } from 'vitest';

// Testing Library Erweiterungen hinzufügen
expect.extend(matchers);

// Vue Test Utils global mocks
config.global.mocks = {
  $t: (key: string) => key, // Mock für i18n
  $router: {
    push: vi.fn(),
    replace: vi.fn(),
    go: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  },
  $route: {
    params: {},
    query: {},
    path: '/',
    name: 'home',
  }
};

// Konfiguration für sämtliche Komponenten
config.global.stubs = {
  // Stub für externe Komponenten, die nicht getestet werden müssen
  'font-awesome-icon': true,
  'router-link': true,
  // Spezielle Komponenten, wenn nötig
};

// Mock für window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock für window.Blob
class MockBlob {
  size: number;
  type: string;
  
  constructor(parts: any[], options?: BlobPropertyBag) {
    this.size = parts.reduce((acc, part) => acc + (typeof part === 'string' ? part.length : part.size || 0), 0);
    this.type = options?.type || '';
  }

  text() {
    return Promise.resolve('mock-blob-text');
  }

  arrayBuffer() {
    return Promise.resolve(new ArrayBuffer(this.size));
  }

  slice(start?: number, end?: number, contentType?: string) {
    return new MockBlob([], { type: contentType || this.type });
  }
}

global.Blob = MockBlob as any;
global.File = class extends MockBlob {
  name: string;
  lastModified: number;
  
  constructor(parts: any[], name: string, options?: FilePropertyBag) {
    super(parts, options);
    this.name = name;
    this.lastModified = options?.lastModified || Date.now();
  }
} as any;

// Mock für URL.createObjectURL
URL.createObjectURL = vi.fn().mockImplementation(() => 'mock-object-url');
URL.revokeObjectURL = vi.fn();

// Mock für window.fetch
global.fetch = vi.fn();

// Mock für FormData (wird für FileUpload gebraucht)
global.FormData = class {
  private data: Record<string, any> = {};
  
  append(key: string, value: any) {
    this.data[key] = value;
  }
  
  get(key: string) {
    return this.data[key];
  }
  
  has(key: string) {
    return key in this.data;
  }
  
  delete(key: string) {
    delete this.data[key];
  }
  
  getAll(key: string) {
    return this.data[key] ? [this.data[key]] : [];
  }

  forEach(callback: (value: any, key: string) => void) {
    Object.entries(this.data).forEach(([key, value]) => callback(value, key));
  }
};

// Mock für Timing-Funktionen
global.setTimeout = vi.fn() as any;
global.clearTimeout = vi.fn() as any;
global.setInterval = vi.fn() as any;
global.clearInterval = vi.fn() as any;
global.requestAnimationFrame = vi.fn() as any;
global.cancelAnimationFrame = vi.fn() as any;

// Mock für lokalen und Session Storage
const mockStorage = () => {
  let store: Record<string, string> = {};
  return {
    getItem(key: string) {
      return store[key] || null;
    },
    setItem(key: string, value: string) {
      store[key] = value.toString();
    },
    removeItem(key: string) {
      delete store[key];
    },
    clear() {
      store = {};
    },
    length: 0,
    key(index: number) {
      return Object.keys(store)[index] || null;
    }
  };
};

Object.defineProperty(window, 'localStorage', {
  value: mockStorage(),
});

Object.defineProperty(window, 'sessionStorage', {
  value: mockStorage(),
});

// Mock für EventSource (für Streaming-Tests)
class MockEventSource {
  url: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onopen: ((event: Event) => void) | null = null;
  readyState: number = 0;
  withCredentials: boolean = false;
  CONNECTING: number = 0;
  OPEN: number = 1;
  CLOSED: number = 2;
  
  private eventListeners: Record<string, Array<(event: MessageEvent) => void>> = {};
  
  constructor(url: string) {
    this.url = url;
    this.readyState = this.CONNECTING;
    
    // Automatisch nach Erstellung "verbinden"
    setTimeout(() => {
      this.readyState = this.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 0);
  }
  
  addEventListener(type: string, listener: (event: MessageEvent) => void): void {
    if (!this.eventListeners[type]) {
      this.eventListeners[type] = [];
    }
    this.eventListeners[type].push(listener);
  }
  
  removeEventListener(type: string, listener: (event: MessageEvent) => void): void {
    if (this.eventListeners[type]) {
      this.eventListeners[type] = this.eventListeners[type].filter(l => l !== listener);
    }
  }
  
  dispatchEvent(event: Event): boolean {
    return true;
  }
  
  close(): void {
    this.readyState = this.CLOSED;
  }
  
  // Test-Hilfsmethoden
  emit(type: string, data: any): void {
    const event = new MessageEvent(type, { data: typeof data === 'string' ? data : JSON.stringify(data) });
    
    // Spezifischen Event-Handler aufrufen
    if (type === 'message' && this.onmessage) {
      this.onmessage(event);
    }
    
    // Alle Event-Listener für diesen Typ aufrufen
    if (this.eventListeners[type]) {
      this.eventListeners[type].forEach(listener => listener(event));
    }
  }
  
  emitError(error: Error): void {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }
}

vi.stubGlobal('EventSource', MockEventSource);

// Automatische Bereinigung von Testing Library
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.resetModules();
  localStorage.clear();
  sessionStorage.clear();
});

// Testing Library: benutzerdefinierte Übereinstimmungen
import { configure } from '@testing-library/dom';

configure({
  testIdAttribute: 'data-testid',
  asyncUtilTimeout: 5000,
});

// Mock für ResizeObserver
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

window.ResizeObserver = ResizeObserverMock as any;

// Mock für IntersectionObserver
class IntersectionObserverMock {
  callback: IntersectionObserverCallback;
  elements: Set<Element>;
  
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    this.elements = new Set();
  }
  
  observe(element: Element) {
    this.elements.add(element);
  }
  
  unobserve(element: Element) {
    this.elements.delete(element);
  }
  
  disconnect() {
    this.elements.clear();
  }
  
  // Hilfsmethode für Tests
  triggerEntries(entries: IntersectionObserverEntry[]) {
    this.callback(entries, this);
  }
}

window.IntersectionObserver = IntersectionObserverMock as any;

// Hilfsfunktionen für Tests
export function flushPromises() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

export function createMockAxiosResponse(data: any, status = 200, statusText = 'OK') {
  return {
    data,
    status,
    statusText,
    headers: {},
    config: {},
  };
}

export function createMockAxiosError(message = 'Network Error', status = 500) {
  const error = new Error(message) as any;
  error.response = {
    status,
    data: { error: message },
    statusText: 'Internal Server Error',
    headers: {},
    config: {},
  };
  error.isAxiosError = true;
  error.message = message;
  return error;
}

// Test-Daten-Generatoren
export const mockUtils = {
  createUser: (overrides = {}) => ({
    id: 'user-1',
    email: 'test@example.com',
    username: 'testuser',
    role: 'user',
    displayName: 'Test User',
    lastLogin: new Date().toISOString(),
    ...overrides
  }),
  
  createSession: (overrides = {}) => ({
    id: 'session-1',
    title: 'Test Session',
    userId: 'user-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isPinned: false,
    ...overrides
  }),
  
  createMessage: (overrides = {}) => ({
    id: 'message-1',
    sessionId: 'session-1',
    content: 'Test message content',
    role: 'user',
    timestamp: new Date().toISOString(),
    status: 'sent',
    ...overrides
  }),
  
  createDocument: (overrides = {}) => ({
    id: 'doc-1',
    name: 'test-document.pdf',
    size: 1024,
    type: 'application/pdf',
    status: 'converted',
    userId: 'user-1',
    createdAt: new Date().toISOString(),
    ...overrides
  }),
};
```

### CI/CD-Integration

Die Tests sind vollständig in die CI/CD-Pipeline integriert:

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main, master, develop]
  pull_request:
    branches: [main, master, develop]
  workflow_dispatch:

jobs:
  lint:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck

  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest
    needs: [lint]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:unit
      - name: Upload coverage report
        uses: actions/upload-artifact@v3
        with:
          name: coverage-report
          path: coverage/

  component-tests:
    name: Component Tests
    runs-on: ubuntu-latest
    needs: [unit-tests]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:components
      
  e2e-tests:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: [component-tests]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - name: Install Playwright
        run: npx playwright install --with-deps
      - name: Run E2E tests
        run: npm run test:e2e
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

## Best Practices

### Allgemeine Testprinzipien

- **Unabhängigkeit**: Tests sollten unabhängig voneinander ausführbar sein
- **Idempotenz**: Tests sollten bei wiederholter Ausführung die gleichen Ergebnisse liefern
- **Wartbarkeit**: Tests sollten einfach zu warten und zu verstehen sein
- **Aussagekraft**: Tests sollten klare Fehlermeldungen liefern
- **Schnelligkeit**: Tests sollten schnell ausgeführt werden können

### Vue 3-spezifische Best Practices

- **Composition API-Tests**: Testen Sie Composables isoliert
- **Pinia-Store-Tests**: Verwenden Sie `createTestingPinia` für Store-Tests
- **Komponententests**: Testen Sie Rendering, Props, Emits und Slots
- **Reaktivität**: Testen Sie reaktive Verhaltensweisen mit `nextTick()`
- **Shallow vs. Mount**: Verwenden Sie `shallowMount` für isolierte Tests und `mount` für Integration

### E2E-Test Best Practices

- **Selektoren**: Verwenden Sie stabile Selektoren wie data-Attribute, aria-Rollen oder semantische HTML-Elemente
- **Zeitumgang**: Vermeiden Sie feste Wartezeiten, nutzen Sie stattdessen Waits für Bedingungen
- **Isolation**: Isolieren Sie Tests durch Vorbedingungen und Aufräumarbeiten
- **Umgang mit Fehlern**: Implementieren Sie robuste Fehlerbehandlung in Tests
- **Visuelle Tests**: Maskieren Sie dynamische Inhalte wie Zeitstempel bei visuellen Tests

### Mocking-Strategien

**API-Mocks**:

```typescript
// API-Service-Mock
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

// Verwendung in Tests
ApiService.get.mockResolvedValue({
  data: {
    id: '123',
    name: 'Test User',
    email: 'test@example.com'
  }
});
```

**Store-Mocks**:

```typescript
// Option 1: Manuelles Mocken
vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => ({
    isAuthenticated: true,
    user: { id: '1', name: 'Test User' },
    login: vi.fn(),
    logout: vi.fn()
  }))
}));

// Option 2: Mit createTestingPinia
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import MyComponent from '@/components/MyComponent.vue';

const wrapper = mount(MyComponent, {
  global: {
    plugins: [
      createTestingPinia({
        createSpy: vi.fn,
        initialState: {
          auth: {
            isAuthenticated: true,
            user: { id: '1', name: 'Test User' }
          }
        }
      })
    ]
  }
});

// Store nach dem Mounting abrufen
const store = useAuthStore();
```

**Browser-API-Mocks**:

```typescript
// LocalStorage-Mock
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    })
  };
})();

// Vor jedem Test
beforeEach(() => {
  // LocalStorage-Mock zuweisen
  Object.defineProperty(window, 'localStorage', { value: localStorageMock });
});
```

## Testausführung

### Testbefehle

- `npm run test`: Ausführen aller Unit-Tests
- `npm run test:watch`: Kontinuierliche Testausführung während der Entwicklung
- `npm run test:unit`: Nur Unit-Tests ausführen
- `npm run test:components`: Nur Komponententests ausführen
- `npm run test:integration`: Nur Integrationstests ausführen
- `npm run test:coverage`: Generieren von Abdeckungsberichten
- `npm run test:e2e`: Ausführen aller E2E-Tests
- `npm run test:e2e:ui`: Ausführen der E2E-Tests mit der Playwright-UI
- `npm run test:vanilla`: Nur Vanilla JavaScript-Tests ausführen

### Fehlerbehebung

**Häufige Probleme und Lösungen**:
- **Test findet Element nicht**: Überprüfen Sie den Selektor und die Timing-Bedingungen
- **Test ist instabil**: Überprüfen Sie Race-Conditions und asynchrone Vorgänge
- **Visuelle Tests schlagen fehl**: Aktualisieren Sie Baseline-Screenshots nach beabsichtigten UI-Änderungen
- **Authentifizierungsprobleme**: Überprüfen Sie die gespeicherten Auth-States und das Global Setup

### Tipps zum Debuggen

- Verwenden Sie `console.log` (für Komponententests) oder `page.console.log()` (für E2E-Tests)
- Verwenden Sie `debugger`-Anweisungen in Tests
- Nutzen Sie die Playwright-UI für E2E-Tests mit `npm run test:e2e:ui`
- Nutzen Sie `page.pause()` in E2E-Tests, um die Ausführung anzuhalten
- Prüfen Sie Screenshots und Videos von fehlgeschlagenen E2E-Tests

## Anleitung zum Hinzufügen neuer Tests

### Unit-Tests hinzufügen

1. Identifizieren Sie die zu testende Funktion oder Klasse
2. Erstellen Sie eine Test-Datei im entsprechenden Verzeichnis
3. Schreiben Sie Tests für verschiedene Szenarien (Erfolg, Fehler, Edge Cases)
4. Führen Sie die Tests aus und stellen Sie sicher, dass sie bestehen

**Beispiel: Unit-Test für eine Hilfsfunktion**:

```typescript
// utils/formatters.ts
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR'
  }).format(value);
}

// test/utils/formatters.spec.ts
import { describe, it, expect } from 'vitest';
import { formatCurrency } from '@/utils/formatters';

describe('formatCurrency', () => {
  it('formatiert Zahlen als EUR mit deutschem Format', () => {
    expect(formatCurrency(1234.56)).toBe('1.234,56 €');
  });
  
  it('behandelt 0 korrekt', () => {
    expect(formatCurrency(0)).toBe('0,00 €');
  });
  
  it('behandelt negative Zahlen korrekt', () => {
    expect(formatCurrency(-1234.56)).toBe('-1.234,56 €');
  });
});
```

### Komponententests hinzufügen

1. Identifizieren Sie die zu testende Komponente
2. Erstellen Sie eine Test-Datei im entsprechenden Verzeichnis
3. Schreiben Sie Tests für Rendering, Props, Events und State
4. Führen Sie die Tests aus und stellen Sie sicher, dass sie bestehen

**Beispiel: Komponentenentests für eine einfache Komponente**:

```typescript
// test/components/Checkbox.spec.ts
import { mount } from '@vue/test-utils';
import Checkbox from '@/components/ui/Checkbox.vue';
import { describe, it, expect } from 'vitest';

describe('Checkbox.vue', () => {
  it('rendert im unchecked-Zustand korrekt', () => {
    const wrapper = mount(Checkbox, {
      props: {
        label: 'Test Checkbox',
        modelValue: false
      }
    });
    
    const input = wrapper.find('input[type="checkbox"]');
    expect(input.element.checked).toBe(false);
    expect(wrapper.text()).toContain('Test Checkbox');
  });
  
  it('emittiert update:modelValue beim Klicken', async () => {
    const wrapper = mount(Checkbox, {
      props: {
        label: 'Test Checkbox',
        modelValue: false
      }
    });
    
    await wrapper.find('input[type="checkbox"]').setValue(true);
    
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([true]);
  });
  
  it('zeigt disabled-Zustand korrekt an', () => {
    const wrapper = mount(Checkbox, {
      props: {
        label: 'Disabled Checkbox',
        modelValue: false,
        disabled: true
      }
    });
    
    const input = wrapper.find('input[type="checkbox"]');
    expect(input.element.disabled).toBe(true);
    expect(wrapper.classes()).toContain('checkbox--disabled');
  });
});
```

### E2E-Tests hinzufügen

1. Identifizieren Sie den zu testenden Benutzerfluss
2. Erstellen oder erweitern Sie bei Bedarf die entsprechenden Page Objects
3. Erstellen Sie eine neue Test-Datei im entsprechenden Verzeichnis
4. Implementieren Sie die Tests mit den entsprechenden Assertions

**Beispiel: E2E-Test für das Umschalten von Sessions**:

```typescript
// e2e/tests/chat/session-switching.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/login-page';
import { ChatPage } from '../../pages/chat-page';

test.describe('Session-Wechsel', () => {
  // Vordefinierter Auth-State für einen angemeldeten Benutzer
  test.use({ storageState: './e2e/fixtures/user-auth.json' });
  
  let chatPage: ChatPage;
  
  test.beforeEach(async ({ page }) => {
    chatPage = new ChatPage(page);
    await chatPage.goto();
  });
  
  test('kann zwischen Sessions wechseln', async ({ page }) => {
    // Neue Sessions erstellen
    await chatPage.createNewSession('Session 1');
    await chatPage.sendMessage('Nachricht in Session 1');
    
    await chatPage.createNewSession('Session 2');
    await chatPage.sendMessage('Nachricht in Session 2');
    
    // Zur ersten Session wechseln
    await chatPage.switchToSession('Session 1');
    
    // Prüfen, ob die richtige Nachricht angezeigt wird
    await expect(page.locator('.message-content')).toContainText('Nachricht in Session 1');
    
    // Zur zweiten Session wechseln
    await chatPage.switchToSession('Session 2');
    
    // Prüfen, ob die richtige Nachricht angezeigt wird
    await expect(page.locator('.message-content')).toContainText('Nachricht in Session 2');
  });
});
```

## Test-Migration

### Strategie

Während der Migration der Anwendung zu Vue 3 SFC werden die Tests schrittweise migriert:

1. **Legacy-Tests**: Beibehaltung der existierenden Vanilla-JavaScript-Tests
2. **Parallele Tests**: Entwicklung neuer Tests für Vue 3 SFC-Komponenten
3. **Validierung**: Sicherstellung, dass beide Test-Suites bestehen
4. **Vollständige Migration**: Schrittweise Entfernung der Legacy-Tests

### Priorisierung

Die Priorisierung der Test-Migration folgt der Komponenten-Migration:

1. **Hochprioritär**:
   - Chat-Funktionalität
   - Session-Management
   - Dokumentenkonverter
   - Authentication

2. **Mittelprioritär**:
   - Admin-Bereich
   - UI-Komponenten
   - Fehlerbehandlung

3. **Niedrigprioritär**:
   - Edge-Cases
   - Utility-Funktionen
   - Spezielle UI-Zustände

---

Diese Test-Strategie wird kontinuierlich weiterentwickelt, um neuen Anforderungen und Best Practices gerecht zu werden. Sie bietet eine solide Grundlage für die Qualitätssicherung während der Migration zu Vue 3 SFC und darüber hinaus.