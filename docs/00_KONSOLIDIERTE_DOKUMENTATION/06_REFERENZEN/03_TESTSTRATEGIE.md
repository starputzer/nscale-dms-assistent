---
title: "Umfassende Teststrategie und Implementierung"
version: "3.0.1"
date: "10.05.2025"
lastUpdate: "16.05.2025"
author: "Martin Heinrich, Claude (Konsolidierung)"
status: "Aktiv"
priority: "Hoch"
category: "Referenzen"
tags: ["Tests", "E2E", "Unit", "Komponenten", "Vitest", "Playwright", "Pinia", "Visual Testing", "Barrierefreiheit", "CI/CD"]
---

# Umfassende Teststrategie und Implementierung

> **Letzte Aktualisierung:** 10.05.2025 | **Version:** 3.0.0 | **Status:** Aktiv

## Übersicht

Dieses Dokument beschreibt die umfassende Test-Strategie für den nscale DMS Assistenten, einschließlich der detaillierten Implementierung für Vue 3 SFC-Migration, End-to-End-Tests, Pinia Store Testing und Visual Regression Tests.

Die Test-Strategie ist darauf ausgerichtet, die Qualität, Zuverlässigkeit und Robustheit der Anwendung durch eine Kombination verschiedener Testebenen zu gewährleisten, während sie gleichzeitig die Migration von Vanilla JavaScript zu Vue 3 SFCs unterstützt.

### Strategische Ziele

- Sicherstellen der funktionalen Korrektheit aller Komponenten
- Gewährleistung der Benutzerfreundlichkeit und korrekten Funktionsweise aller Benutzerflüsse
- Erhalt der Stabilität während der Migration zu Vue 3 SFC
- Erleichterung der kontinuierlichen Integration und Bereitstellung
- Verbesserung der Code-Qualität und Wartbarkeit
- Vermeidung von Regressionen bei neuen Funktionen oder Bugfixes
- Sicherstellung der UI-Konsistenz durch visuelle Tests
- Einhaltung von Barrierefreiheitsstandards

## Test-Pyramide und -Ebenen

Der nscale DMS Assistent folgt dem modernen Test-Pyramiden-Ansatz, der eine breitere Basis von Unit-Tests, eine mittlere Schicht von Komponenten- und Integrationstests und eine schmalere Spitze von End-to-End-Tests vorsieht.

```
                    /\
                   /  \
                  /E2E \
                 /______\
                /        \
               /Integration\
              /______________\
             /                \
            /   Komponenten    \
           /__________________\
          /                    \
         /       Unit-Tests     \
        /__________________________\
```

### Unit-Tests

Unit-Tests konzentrieren sich auf die Überprüfung der kleinsten testbaren Teile der Anwendung in Isolation.

#### Vanilla JavaScript

- **Framework:** Vitest mit JSDOM
- **Fokus:** Funktionen und Module in chat.js, app.js, document-converter-service etc.
- **Mocking:** Externe Abhängigkeiten wie axios, EventSource, localStorage
- **Organisation:** Modulare Struktur im Verzeichnis `test/vanilla/`

#### Vue 3 Komponenten und Pinia-Stores

- **Framework:** Vitest mit Vue Test Utils und Testing Library
- **Fokus:** Vue-Komponenten, Komposition-APIs, Pinia-Stores
- **Mocking:** Externe Services, APIs und Store-Zustände
- **Organisation:** Komponententests innerhalb der `test/components/` Struktur und Stores in `test/stores/`

**Beispiel für einen Komponententest:**

```typescript
// test/components/ui/base/Button.spec.ts
import { mount } from '@vue/test-utils';
import Button from '@/components/ui/base/Button.vue';
import { describe, expect, it } from 'vitest';

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
});
```

**Beispiel für einen Store-Test:**

```typescript
// test/stores/auth.spec.ts
import { createPinia, setActivePinia } from 'pinia';
import { useAuthStore } from '@/stores/auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('Auth Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('setzt den Anfangsstatus korrekt', () => {
    const store = useAuthStore();
    expect(store.isAuthenticated).toBe(false);
    expect(store.user).toBeNull();
  });

  it('aktualisiert isAuthenticated nach erfolgreicher Anmeldung', async () => {
    const store = useAuthStore();
    vi.spyOn(store, 'login').mockResolvedValue({
      success: true,
      user: { id: '1', name: 'Test User' }
    });
    
    await store.login('test@example.com', 'password');
    
    expect(store.isAuthenticated).toBe(true);
    expect(store.user).toEqual({ id: '1', name: 'Test User' });
  });
});
```

### Komponententests

Komponententests prüfen isolierte Vue-Komponenten auf korrekte Renderinglogik, Ereignisse und Zustandsänderungen.

#### Vue Test Utils-Ansatz

```typescript
// test/components/ui/base/Button.spec.ts
import { mount } from '@vue/test-utils';
import Button from '@/components/ui/base/Button.vue';
import { describe, expect, it } from 'vitest';

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
});
```

#### Testing Library-Ansatz

```typescript
// test/components/chat/MessageList.spec.ts
import { render, screen, fireEvent } from '@testing-library/vue';
import MessageList from '@/components/chat/MessageList.vue';
import { describe, expect, it, vi } from 'vitest';

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

### Integrationstests

Integrationstests überprüfen die Interaktion zwischen verschiedenen Modulen oder Komponenten, wie zum Beispiel Stores und Komponenten.

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

### Ende-zu-Ende-Tests (E2E)

E2E-Tests simulieren reale Benutzerinteraktionen mit der Anwendung. Wir verwenden Playwright mit dem Page Object Pattern.

#### Page Object-Definition

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

#### E2E-Testbeispiel

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
  let loginPage: LoginPage;
  let chatPage: ChatPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    chatPage = new ChatPage(page);
    
    // Anmelden und zum Chat navigieren
    await loginPage.navigate();
    await loginPage.login('test@example.com', 'password');
    await page.waitForURL(/.*\/chat/);
  });

  test('Chat-Ansicht mit Nachrichten entspricht dem Snapshot', async ({ page }) => {
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

  test('Chat-Ansicht auf verschiedenen Viewports', async ({ page }) => {
    await chatPage.simulateMessages([
      { content: 'Hallo, wie kann ich helfen?', role: 'assistant' }
    ]);
    
    // Desktop-Ansicht
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page).toHaveScreenshot('chat-desktop.png');
    
    // Tablet-Ansicht
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page).toHaveScreenshot('chat-tablet.png');
    
    // Mobile-Ansicht
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page).toHaveScreenshot('chat-mobile.png');
  });
});
```

### Barrierefreiheitstests (Accessibility Tests)

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

  test('Formularfelder haben korrekte Labels und ARIA-Attribute', async () => {
    await expect(loginPage.emailInput).toHaveAttribute('aria-labelledby');
    await expect(loginPage.passwordInput).toHaveAttribute('aria-labelledby');
    
    // Prüfen, ob die Labels für Screenreader korrekt sind
    const emailLabelId = await loginPage.emailInput.getAttribute('aria-labelledby');
    const emailLabel = await loginPage.page.locator(`#${emailLabelId}`);
    await expect(emailLabel).toHaveText(/E-Mail/);
    
    const passwordLabelId = await loginPage.passwordInput.getAttribute('aria-labelledby');
    const passwordLabel = await loginPage.page.locator(`#${passwordLabelId}`);
    await expect(passwordLabel).toHaveText(/Passwort/);
  });
});
```

## Pinia Store Testing

Die Store-Tests sind ein zentraler Bestandteil der Teststrategie und folgen einem spezifischen Ansatz.

### Test-Setup für Pinia-Stores

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

### Store-Tests: Testen des initialen State

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

### Store-Tests: Testen von Getters

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

### Store-Tests: Testen von Actions

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

## Testumgebungen und Konfiguration

### Vitest-Konfiguration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import Vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [Vue()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: ['**/*.{test,spec}.{js,ts,jsx,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
      exclude: [
        '**/node_modules/**',
        '**/test/**',
        '**/*.d.ts',
        '**/*.config.ts',
        '**/dist/**'
      ]
    },
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
    pool: 'threads',
    poolOptions: {
      threads: {
        minThreads: 2,
        maxThreads: 8
      }
    },
    reporters: ['default', 'html'],
    watch: false
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
```

### Playwright-Konfiguration

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
    stdout: 'pipe',
    stderr: 'pipe',
  },
};

export default config;
```

### Test-Setup

```typescript
// test/setup.ts
import { vi, beforeEach, afterEach } from 'vitest';
import { config } from '@vue/test-utils';
import { cleanup } from '@testing-library/vue';
import * as matchers from '@testing-library/jest-dom/matchers';
import { expect } from 'vitest';

// Testing Library Erweiterungen hinzufügen
expect.extend(matchers);

// Vue Test Utils global mocks
config.global.mocks = {
  $t: (key: string) => key,
  $router: {
    push: vi.fn(),
    replace: vi.fn(),
    go: vi.fn(),
    back: vi.fn(),
    forward: vi.fn()
  },
  $route: {
    params: {},
    query: {},
    path: '/',
    name: null
  }
};

// LocalStorage Mock
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    })
  };
})();

// Vor jedem Test
beforeEach(() => {
  // localStorage Mock zuweisen
  Object.defineProperty(window, 'localStorage', { value: localStorageMock });
  
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
});

// Nach jedem Test
afterEach(() => {
  vi.resetAllMocks();
  cleanup();
});
```

## CI/CD-Integration

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
          
  visual-regression:
    name: Visual Regression Tests
    runs-on: ubuntu-latest
    needs: [e2e-tests]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - name: Install Playwright
        run: npx playwright install --with-deps
      - name: Run visual tests
        run: npm run test:visual
      - name: Upload visual test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: visual-test-report
          path: test-results/
```

## Test-Praktiken und -Muster

### Page Object Pattern für E2E-Tests

Das Page Object Pattern wird verwendet, um E2E-Tests besser zu strukturieren und wartbar zu halten:

- **Kapselung**: Jede Seite hat ein eigenes Page Object, das Funktionen und Selektoren enthält
- **Wiederverwendbarkeit**: Page Objects können in verschiedenen Tests wiederverwendet werden
- **Wartbarkeit**: Änderungen an der Benutzeroberfläche erfordern nur Änderungen an einer Stelle

### Arrange-Act-Assert Pattern

Alle Tests folgen dem Arrange-Act-Assert Pattern:

1. **Arrange**: Testdaten und -umgebung vorbereiten
2. **Act**: Die zu testende Aktion ausführen
3. **Assert**: Das Ergebnis überprüfen

```typescript
// Beispiel für das AAA-Pattern
it('aktualisiert den Benutzernamen nach Bearbeitung', async () => {
  // Arrange
  const wrapper = mount(UserProfile, {
    props: { user: { id: '1', name: 'Alter Name' } }
  });
  const input = wrapper.find('.user-name-input');
  
  // Act
  await input.setValue('Neuer Name');
  await wrapper.find('.save-button').trigger('click');
  
  // Assert
  expect(wrapper.emitted('update:user')[0][0].name).toBe('Neuer Name');
});
```

### Mocking-Strategien

#### API-Mocks

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

#### Store-Mocks

```typescript
// Store-Mock für Komponententests
import { vi } from 'vitest';
import { useAuthStore } from '@/stores/auth';

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

## Testumgebungen

### Lokale Testausführung

Die folgenden Befehle stehen für die lokale Testausführung zur Verfügung:

- `npm run test`: Ausführen aller Unit-Tests
- `npm run test:watch`: Kontinuierliche Testausführung während der Entwicklung
- `npm run test:unit`: Nur Unit-Tests ausführen
- `npm run test:components`: Nur Komponententests ausführen
- `npm run test:integration`: Nur Integrationstests ausführen
- `npm run test:coverage`: Generieren von Abdeckungsberichten
- `npm run test:e2e`: Ausführen aller E2E-Tests
- `npm run test:e2e:ui`: Ausführen der E2E-Tests mit der Playwright-UI
- `npm run test:visual`: Ausführen der visuellen Regressionstests
- `npm run test:a11y`: Ausführen der Barrierefreiheitstests

## E2E-Teststruktur

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

## Best Practices

### Allgemeine Test-Prinzipien

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

- **Selektoren**: Verwenden Sie stabile Selektoren wie data-testid, aria-roles oder semantische HTML-Elemente
- **Zeitumgang**: Vermeiden Sie feste Wartezeiten, nutzen Sie stattdessen Waits für Bedingungen
- **Isolation**: Isolieren Sie Tests durch Vorbedingungen und Aufräumarbeiten
- **Umgang mit Fehlern**: Implementieren Sie robuste Fehlerbehandlung in Tests
- **Visuelle Tests**: Maskieren Sie dynamische Inhalte wie Zeitstempel bei visuellen Tests

### Store-Test Best Practices

- **Isolierung**: Jeden Store isoliert testen, externe Abhängigkeiten mocken
- **Vollständigkeit**: Initial-State, Getters, Actions und Fehlerbehandlung testen
- **Realistisches Mocking**: API-Antworten realistisch inklusive aller Datenstrukturen mocken
- **Edge Cases**: Verschiedene Edge-Cases wie leere Arrays, null-Werte testen

## Kritische Benutzerflüsse

Die folgenden kritischen Benutzerflüsse werden durch E2E-Tests abgedeckt:

### Authentifizierung
- Login mit gültigen Anmeldedaten
- Login mit ungültigen Anmeldedaten
- Logout
- Automatische Weiterleitung zur Login-Seite bei nicht authentifizierten Anfragen
- Persistenz der Authentifizierung nach Browser-Refresh

### Chat-System
- Senden einer Nachricht und Empfangen einer Antwort
- Streaming von Antworten
- Erstellen, Umbenennen und Löschen von Chat-Sessions
- Wechseln zwischen Sessions
- Tagging und Kategorisierung von Sessions

### Dokumentenkonverter
- Hochladen und Konvertieren verschiedener Dokumenttypen
- Anzeigen der Dokumentvorschau
- Herunterladen konvertierter Dokumente
- Löschen von Dokumenten

### Admin-Bereich
- Benutzerverwaltung (Erstellen, Bearbeiten, Löschen)
- Feature-Toggles (Aktivieren, Deaktivieren)
- Systemeinstellungen

### Fehlerbehandlung
- Netzwerkfehler während des Nachrichtensendens
- Timeouts bei API-Anfragen
- Verbindungsverlust während des Streamings
- Wiederherstellung nach Netzwerkfehlern

## Testabdeckungsziele

Die folgende Tabelle zeigt die aktuellen Testabdeckungsziele nach Komponenten:

| Komponente | Aktuell | Ziel | Zeitrahmen |
|------------|---------|------|------------|
| Chat-Funktionalität | ~85% | 95% | Q3 2025 |
| Session-Management | ~80% | 90% | Q3 2025 |
| Dokumentenkonverter | ~75% | 90% | Q4 2025 |
| Vue-Komponenten | variiert | 85% | Q1 2026 |
| E2E-Abdeckung | 40% | 70% | Q2 2026 |
| Visuelle Abdeckung | 30% | 60% | Q3 2026 |
| Accessibility | 25% | 80% | Q3 2026 |

## Migration der Legacy-Tests

Während der Migration von Legacy-Tests zur neuen Testinfrastruktur werden folgende Schritte durchgeführt:

1. **Identifizieren kritischer Tests**: Bestimmen, welche Legacy-Tests kritische Funktionalität abdecken
2. **Mapping zu neuen Tests**: Erstellen einer Zuordnung zwischen alten und neuen Tests
3. **Parallele Ausführung**: Zunächst beide Test-Suites parallel ausführen
4. **Verifizieren**: Sicherstellen, dass neue Tests die gleiche Abdeckung bieten
5. **Phasenweise Migration**: Schrittweise Umstellung auf neue Tests

### Priorisierung der Testmigration

1. **Hochprioritär**: Authentication, Chat-Kern, Dokumentenkonverter
2. **Mittelprioritär**: Admin-Bereich, Fehlerbehandlung
3. **Niedrigprioritär**: Edge Cases, spezielle UI-Zustände

## Continuous Improvement

Die Test-Strategie wird kontinuierlich verbessert:

- **Testabdeckungs-Reviews**: Regelmäßige Überprüfung und Erweiterung der Testabdeckung
- **Performance-Optimierung**: Beschleunigung der Testausführung für schnelleres Feedback
- **Tooling-Updates**: Einsatz neuester Test-Tools und -Praktiken
- **Testautomatisierung**: Erhöhung des Automatisierungsgrads
- **Mutation-Testing**: Einführung von Mutation-Testing zur Qualitätssicherung der Tests selbst

## Fazit

Diese umfassende Teststrategie gewährleistet die Qualität und Zuverlässigkeit des nscale DMS Assistenten während der gesamten Vue 3-Migration und darüber hinaus. Durch die Integration von Unit-Tests, Komponententests, Integrationstests, End-to-End-Tests, Barrierefreiheitstests und visuellen Regressionstests wird sichergestellt, dass alle Aspekte der Anwendung gründlich getestet werden.

Die Kombination moderner Testtools und -praktiken bietet eine solide Grundlage für die kontinuierliche Qualitätssicherung und ermöglicht gleichzeitig eine agile Entwicklung neuer Funktionen. Durch die detaillierte Dokumentation und Standardisierung der Test-Praktiken wird die Wartbarkeit und Erweiterbarkeit der Testsuite gesichert.

---

Zuletzt aktualisiert: 11.05.2025