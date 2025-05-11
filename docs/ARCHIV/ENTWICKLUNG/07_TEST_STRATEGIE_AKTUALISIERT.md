# Test-Strategie für nScale DMS Assistent (Aktualisiert)

**Version:** 3.0  
**Letzte Aktualisierung:** 10.05.2025

Dieses Dokument beschreibt die umfassende Test-Strategie für den nScale DMS Assistenten, einschließlich der detaillierten Implementierung für Vue 3 SFC-Migration, End-to-End-Tests und Visual Regression Tests.

## 1. Übersicht

Die Test-Strategie des nScale DMS Assistenten ist darauf ausgerichtet, die Qualität, Zuverlässigkeit und Robustheit der Anwendung durch eine Kombination verschiedener Testebenen zu gewährleisten. Unsere Strategie berücksichtigt sowohl die aktuelle Vanilla-JavaScript-Implementierung, die Vue 3 Single-File-Components (SFC) und neu implementierte End-to-End-Tests.

### Ziele

- Sicherstellen der funktionalen Korrektheit aller Komponenten
- Gewährleistung der Benutzerfreundlichkeit und korrekten Funktionsweise aller Benutzerflüsse
- Erhalt der Stabilität während der Migration zu Vue 3 SFC
- Erleichterung der kontinuierlichen Integration und Bereitstellung
- Verbesserung der Code-Qualität und Wartbarkeit
- Vermeidung von Regressionen bei neuen Funktionen oder Bugfixes
- Sicherstellung der UI-Konsistenz durch visuelle Tests
- Einhaltung von Barrierefreiheitsstandards

## 2. Testebenen

### 2.1 Unit-Tests

Unit-Tests konzentrieren sich auf die Überprüfung der kleinsten testbaren Teile der Anwendung in Isolation.

#### Vanilla JavaScript

- **Framework:** Vitest mit JSDOM
- **Fokus:** Funktionen und Module in chat.js, app.js, document-converter-service etc.
- **Mocking:** Externe Abhängigkeiten wie axios, EventSource, localStorage
- **Organisation:** Modulare Struktur im Verzeichnis `test/vanilla/`

#### Vue 3 Komponenten

- **Framework:** Vitest mit Vue Test Utils und Testing Library
- **Fokus:** Vue-Komponenten, Komposition-APIs, Pinia-Stores
- **Mocking:** Externe Services, APIs und Store-Zustände
- **Organisation:** Komponententests innerhalb der `test/components/` Struktur

**Beispiel für einen Store-Test mit Vitest und Pinia:**

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

### 2.2 Komponententests

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

### 2.3 Integrationstests

Integrationstests überprüfen die Interaktion zwischen verschiedenen Modulen oder Komponenten.

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

### 2.4 End-to-End-Tests (E2E)

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

  test('Zeigt Ladeanzeige während der Anmeldung', async () => {
    // API-Antwort verzögern
    await loginPage.page.route('**/api/auth/login', route => {
      // Antwort um 1 Sekunde verzögern
      setTimeout(() => route.continue(), 1000);
    });
    
    await loginPage.login('test@example.com', 'password');
    
    // Prüfen, ob Ladeanzeige angezeigt wird
    await expect(loginPage.page.locator('.loading-indicator')).toBeVisible();
  });
});
```

#### E2E-Teststruktur

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

### 2.5 Visuelle Regressionstests

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

### 2.6 Barrierefreiheitstests (Accessibility Tests)

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

## 3. Testpraktiken und Muster

### 3.1 Page Object Pattern für E2E-Tests

Für E2E-Tests wird das Page Object Pattern verwendet, um Tests besser zu strukturieren und wartbar zu halten:

- **Kapselung:** Jede Seite hat ein eigenes Page Object, das Funktionen und Selektoren enthält
- **Wiederverwendbarkeit:** Page Objects können in verschiedenen Tests wiederverwendet werden
- **Wartbarkeit:** Änderungen an der Benutzeroberfläche erfordern nur Änderungen an einer Stelle
- **Lesbarkeit:** Tests werden klarer und verständlicher

### 3.2 Arrange-Act-Assert Pattern

Alle Tests folgen dem Arrange-Act-Assert Pattern:

1. **Arrange:** Testdaten und -umgebung vorbereiten
2. **Act:** Die zu testende Aktion ausführen
3. **Assert:** Das Ergebnis überprüfen

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

### 3.3 Mocking-Strategien

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

#### Browser-API-Mocks

```typescript
// Browser-API-Mocks in setup.ts
import { vi } from 'vitest';

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
  
  // Cookies-Mock
  Object.defineProperty(document, 'cookie', {
    writable: true,
    value: ''
  });
});
```

## 4. Testumgebungen und Konfiguration

### 4.1 Vitest-Konfiguration

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

### 4.2 Playwright-Konfiguration

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

### 4.3 Test-Setup

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

// FormData-Mock
class FormDataMock {
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
}

// Vor jedem Test
beforeEach(() => {
  // localStorage Mock zuweisen
  Object.defineProperty(window, 'localStorage', { value: localStorageMock });
  
  // FormData Mock zuweisen
  global.FormData = FormDataMock as any;
  
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

### 4.4 Lokale Testausführung

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

## 5. CI/CD-Integration

Die Tests sind vollständig in unsere CI/CD-Pipeline integriert. Die Konfiguration ist in der Datei `.github/workflows/test.yml` definiert:

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

## 6. Best Practices

### 6.1 Allgemeine Test-Prinzipien

- **Unabhängigkeit:** Tests sollten unabhängig voneinander ausführbar sein
- **Idempotenz:** Tests sollten bei wiederholter Ausführung die gleichen Ergebnisse liefern
- **Wartbarkeit:** Tests sollten einfach zu warten und zu verstehen sein
- **Aussagekraft:** Tests sollten klare Fehlermeldungen liefern
- **Schnelligkeit:** Tests sollten schnell ausgeführt werden können

### 6.2 Vue 3-spezifische Best Practices

- **Composition API-Tests:** Testen Sie Composables isoliert
- **Pinia-Store-Tests:** Verwenden Sie `createTestingPinia` für Store-Tests
- **Komponententests:** Testen Sie Rendering, Props, Emits und Slots
- **Reaktivität:** Testen Sie reaktive Verhaltensweisen mit `nextTick()`
- **Shallow vs. Mount:** Verwenden Sie `shallowMount` für isolierte Tests und `mount` für Integration

### 6.3 E2E-Test Best Practices

- **Selektoren:** Verwenden Sie stabile Selektoren wie data-testid, aria-roles oder semantische HTML-Elemente
- **Zeitumgang:** Vermeiden Sie feste Wartezeiten, nutzen Sie stattdessen Waits für Bedingungen
- **Isolation:** Isolieren Sie Tests durch Vorbedingungen und Aufräumarbeiten
- **Umgang mit Fehlern:** Implementieren Sie robuste Fehlerbehandlung in Tests
- **Visuelle Tests:** Maskieren Sie dynamische Inhalte wie Zeitstempel bei visuellen Tests

## 7. Migration der Legacy-Tests

Während der Migration von Legacy-Tests zur neuen Testinfrastruktur werden folgende Schritte durchgeführt:

1. **Identifizieren kritischer Tests:** Bestimmen, welche Legacy-Tests kritische Funktionalität abdecken
2. **Mapping zu neuen Tests:** Erstellen einer Zuordnung zwischen alten und neuen Tests
3. **Parallele Ausführung:** Zunächst beide Test-Suites parallel ausführen
4. **Verifizieren:** Sicherstellen, dass neue Tests die gleiche Abdeckung bieten
5. **Phasenweise Migration:** Schrittweise Umstellung auf neue Tests

### 7.1 Priorisierung der Testmigration

1. **Hochprioritär:** Authentication, Chat-Kern, Dokumentenkonverter
2. **Mittelprioritär:** Admin-Bereich, Fehlerbehandlung
3. **Niedrigprioritär:** Edge Cases, spezielle UI-Zustände

## 8. Testabdeckungsziele

| Komponente | Aktuell | Ziel | Zeitrahmen |
|------------|---------|------|------------|
| Chat-Funktionalität | ~85% | 95% | Q3 2025 |
| Session-Management | ~80% | 90% | Q3 2025 |
| Dokumentenkonverter | ~75% | 90% | Q4 2025 |
| Vue-Komponenten | variiert | 85% | Q1 2026 |
| E2E-Abdeckung | 40% | 70% | Q2 2026 |
| Visuelle Abdeckung | 30% | 60% | Q3 2026 |
| Accessibility | 25% | 80% | Q3 2026 |

## 9. Kritische Benutzerflüsse

Die folgenden kritischen Benutzerflüsse werden durch E2E-Tests abgedeckt:

### 9.1 Authentifizierung
- Login mit gültigen Anmeldedaten
- Login mit ungültigen Anmeldedaten
- Logout
- Automatische Weiterleitung zur Login-Seite bei nicht authentifizierten Anfragen
- Persistenz der Authentifizierung nach Browser-Refresh

### 9.2 Chat-System
- Senden einer Nachricht und Empfangen einer Antwort
- Streaming von Antworten
- Erstellen, Umbenennen und Löschen von Chat-Sessions
- Wechseln zwischen Sessions
- Tagging und Kategorisierung von Sessions

### 9.3 Dokumentenkonverter
- Hochladen und Konvertieren verschiedener Dokumenttypen
- Anzeigen der Dokumentvorschau
- Herunterladen konvertierter Dokumente
- Löschen von Dokumenten

### 9.4 Admin-Bereich
- Benutzerverwaltung (Erstellen, Bearbeiten, Löschen)
- Feature-Toggles (Aktivieren, Deaktivieren)
- Systemeinstellungen

### 9.5 Fehlerbehandlung
- Netzwerkfehler während des Nachrichtensendens
- Timeouts bei API-Anfragen
- Verbindungsverlust während des Streamings
- Wiederherstellung nach Netzwerkfehlern

## 10. Continuous Improvement

Die Test-Strategie wird kontinuierlich verbessert:

- **Testabdeckungs-Reviews:** Regelmäßige Überprüfung und Erweiterung der Testabdeckung
- **Performance-Optimierung:** Beschleunigung der Testausführung für schnelleres Feedback
- **Tooling-Updates:** Einsatz neuester Test-Tools und -Praktiken
- **Testautomatisierung:** Erhöhung des Automatisierungsgrads
- **Mutation-Testing:** Einführung von Mutation-Testing zur Qualitätssicherung der Tests selbst

## 11. Fazit

Diese umfassende Teststrategie gewährleistet die Qualität und Zuverlässigkeit des nScale DMS Assistenten während der gesamten Vue 3-Migration und darüber hinaus. Durch die Integration von Unit-Tests, Komponententests, Integrationstests, End-to-End-Tests, Barrierefreiheitstests und visuellen Regressionstests wird sichergestellt, dass alle Aspekte der Anwendung gründlich getestet werden. Die Kombination moderner Testtools und -praktiken bietet eine solide Grundlage für die kontinuierliche Qualitätssicherung und ermöglicht gleichzeitig eine agile Entwicklung neuer Funktionen.

---

**Verwandte Dokumente:**
- [05_TESTEN.md](./05_TESTEN.md)
- [E2E_TEST_ANALYSE.md](./E2E_TEST_ANALYSE.md)
- [08_PINIA_STORE_TESTING.md](./08_PINIA_STORE_TESTING.md)