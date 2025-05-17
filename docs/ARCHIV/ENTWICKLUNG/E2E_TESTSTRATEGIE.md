# End-to-End Teststrategie für nScale DMS Assistent

> **Erstellt am:** 10.05.2025 | **Version:** 1.0

## 1. Übersicht und Ziele

Diese Teststrategie definiert einen umfassenden Ansatz für End-to-End (E2E) Tests des nScale DMS Assistent mit [Playwright](https://playwright.dev/). Die E2E-Tests ergänzen die bestehenden Unit- und Komponententests, um sicherzustellen, dass das Gesamtsystem aus Benutzerperspektive korrekt funktioniert.

### 1.1 Hauptziele

- **Validierung kritischer Benutzerworkflows** in realen Umgebungen
- **Abdeckung aller Kernfunktionalitäten** durch automatisierte Tests
- **Frühzeitige Erkennung von Regressionen** durch kontinuierliche Test-Ausführung
- **Qualitätssicherung während der Vue 3 SFC-Migration**
- **Browserübergreifende Kompatibilitätstests**
- **Visuelle Regressionstests** für UI-Konsistenz

## 2. Test-Framework und Architektur

### 2.1 Technologiestack

- **Playwright**: Modernes Test-Framework für browserübergreifende Tests
- **TypeScript**: Für typsichere Testdefinitionen und bessere Wartbarkeit
- **Page Object Pattern**: Für modulare und wartbare Teststruktur
- **Visual Regression Testing**: Für UI-Konsistenzprüfungen
- **CI/CD-Integration**: Automatisierte Ausführung in der Pipeline

### 2.2 Verzeichnisstruktur

```
e2e/
├── fixtures/            # Testdaten und -zustände
│   ├── auth.ts          # Authentifizierungszustände
│   ├── sessions.ts      # Chat-Sitzungsdaten
│   └── users.ts         # Testbenutzer
│
├── pages/               # Page Objects
│   ├── LoginPage.ts     # Login-Seiten-Abstraktionen
│   ├── ChatPage.ts      # Chat-Seiten-Abstraktionen
│   ├── AdminPage.ts     # Admin-Seiten-Abstraktionen
│   └── ...
│
├── tests/               # Organisiert nach Funktionalität
│   ├── auth/            # Authentifizierungstests
│   ├── chat/            # Chat-Funktionalitätstests
│   ├── doc-converter/   # Dokumentenkonverter-Tests
│   ├── admin/           # Admin-Funktionstests
│   ├── error-handling/  # Fehlerbehandlungstests
│   └── visual/          # Visuelle Regressionstests
│
├── utils/               # Hilfsfunktionen
│   ├── test-helpers.ts  # Allgemeine Testhelfer
│   ├── api-helpers.ts   # API-Interaktionshelfer
│   └── mock-helpers.ts  # Mocking-Hilfsfunktionen
│
├── global-setup.ts      # Globales Setup für Authentifizierung
├── playwright.config.ts # Playwright-Konfiguration
└── tsconfig.json        # TypeScript-Konfiguration für E2E-Tests
```

### 2.3 Page Object Pattern

Wir verwenden das Page Object Pattern, um die Testlogik von der Seiteninteraktion zu trennen:

```typescript
// Beispiel für ChatPage Page Object
export class ChatPage {
  private page: Page;
  
  constructor(page: Page) {
    this.page = page;
  }
  
  // Navigation
  async goto() {
    await this.page.goto('/chat');
    await this.page.waitForSelector('.chat-container');
  }
  
  // Aktionen
  async sendMessage(message: string) {
    await this.page.fill('.message-input', message);
    await this.page.click('.send-button');
    await this.page.waitForSelector('.message-item:last-child .message-content');
  }
  
  async createNewSession() {
    await this.page.click('.new-session-button');
    await this.page.waitForSelector('.session-item.active');
  }
  
  // Assertionen/Getter
  async getLastMessageContent() {
    return this.page.textContent('.message-item:last-child .message-content');
  }
  
  async isStreamingActive() {
    return this.page.isVisible('.streaming-indicator');
  }
}
```

## 3. Teststrategie und Abdeckung

### 3.1 Kritische Benutzerflüsse

Die folgenden Kernbereiche werden durch E2E-Tests abgedeckt:

#### 3.1.1 Authentifizierung

- Erfolgreiche Anmeldung mit gültigen Zugangsdaten
- Fehlerbehandlung bei ungültigen Zugangsdaten
- Abmeldung
- Token-Refresh und Sitzungspersistenz
- Schutz geschützter Routen

#### 3.1.2 Chat-Funktionalität

- Erstellung einer neuen Chat-Sitzung
- Senden von Nachrichten
- Empfangen und Anzeigen von Antworten
- Handling des Streaming-Modus
- Wechsel zwischen Sitzungen
- Verwaltung und Löschen von Sitzungen

#### 3.1.3 Dokumentenkonverter

- Datei-Upload mit verschiedenen Formaten
- Konvertierungsprozess und Fortschrittsanzeige
- Anzeige von Konvertierungsergebnissen
- Download von konvertierten Dokumenten
- Fehlerbehandlung bei nicht unterstützten Formaten

#### 3.1.4 Admin-Funktionen

- Benutzerverwaltung (Anzeigen, Erstellen, Bearbeiten, Löschen)
- Feature-Toggle-Verwaltung
- MOTD-Konfiguration
- Systemstatistiken und -überwachung

#### 3.1.5 Einstellungen und Benutzerprofilmanagement

- Änderung von Benutzereinstellungen
- Theme-Wechsel (Hell/Dunkel)
- Speichern und Laden von Benutzereinstellungen

### 3.2 Fehlerbehandlung und Grenzsituationen

- Netzwerkunterbrechungen während der Kommunikation
- Server-Timeouts und langsame Verbindungen
- API-Fehlerzustände und Wiederherstellung
- Browserrefresh während laufender Vorgänge
- Offline-Modus und Wiederverbindung

### 3.3 Visuelle Regressionstests

- Screenshot-Vergleiche für kritische UI-Komponenten
- Tests für verschiedene Viewports (Desktop, Tablet, Mobil)
- Tests für verschiedene Themes (Hell, Dunkel)
- Barrierefreiheitsprüfungen für wichtige Komponenten

## 4. Testumgebungen und Browser

### 4.1 Getestete Browser

- **Chromium**: Neueste Version
- **Firefox**: Neueste Version
- **WebKit** (Safari): Neueste Version

### 4.2 Viewport-Konfigurationen

- **Desktop**: 1920x1080, 1366x768
- **Tablet**: 768x1024 (Portrait), 1024x768 (Landscape)
- **Mobil**: 375x667 (iPhone), 360x800 (Android)

### 4.3 Umgebungen

- **Entwicklung**: Lokale Ausführung während der Entwicklung
- **CI/CD**: Automatisierte Ausführung in der Pipeline
- **Staging**: Tests gegen Staging-Umgebung
- **Produktion**: Smoke-Tests in der Produktionsumgebung

## 5. E2E-Test-Implementation

### 5.1 Authentifizierungstests

```typescript
// auth/login.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';

test.describe('Authentifizierung', () => {
  test('Erfolgreiche Anmeldung mit gültigen Zugangsdaten', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('test@example.com', 'password');
    
    // Überprüfen, ob Weiterleitung erfolgt ist
    expect(page.url()).toContain('/chat');
    
    // Überprüfen, ob Benutzerinformationen angezeigt werden
    expect(await loginPage.isUserLoggedIn()).toBeTruthy();
  });
  
  test('Fehler bei ungültigen Zugangsdaten', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('invalid@example.com', 'wrongpassword');
    
    // Überprüfen, ob Fehlermeldung angezeigt wird
    expect(await loginPage.getErrorMessage()).toContain('Ungültige Zugangsdaten');
    
    // Überprüfen, ob noch auf Login-Seite
    expect(page.url()).toContain('/login');
  });
  
  test('Abmeldung', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('test@example.com', 'password');
    
    // Überprüfen, ob angemeldet
    expect(await loginPage.isUserLoggedIn()).toBeTruthy();
    
    // Abmelden
    await loginPage.logout();
    
    // Überprüfen, ob abgemeldet und zurück auf Login-Seite
    expect(page.url()).toContain('/login');
    expect(await loginPage.isUserLoggedIn()).toBeFalsy();
  });
});
```

### 5.2 Chat-Funktionstests

```typescript
// chat/basic-chat.spec.ts
import { test, expect } from '@playwright/test';
import { ChatPage } from '../../pages/ChatPage';
import { loginAsTestUser } from '../../fixtures/auth';

test.describe('Chat-Grundfunktionen', () => {
  test.beforeEach(async ({ page }) => {
    // Mit Testbenutzer anmelden
    await loginAsTestUser(page);
  });

  test('Neue Chat-Sitzung erstellen', async ({ page }) => {
    const chatPage = new ChatPage(page);
    await chatPage.goto();
    
    const initialSessionCount = await chatPage.getSessionCount();
    await chatPage.createNewSession();
    
    // Überprüfen, ob neue Sitzung erstellt wurde
    expect(await chatPage.getSessionCount()).toBe(initialSessionCount + 1);
    expect(await chatPage.isNewSessionActive()).toBeTruthy();
  });
  
  test('Nachricht senden und Antwort erhalten', async ({ page }) => {
    const chatPage = new ChatPage(page);
    await chatPage.goto();
    await chatPage.createNewSession();
    
    // Nachricht senden
    await chatPage.sendMessage('Wie spät ist es?');
    
    // Überprüfen, ob Nachricht angezeigt wird
    const sentMessages = await chatPage.getSentMessages();
    expect(sentMessages).toContain('Wie spät ist es?');
    
    // Überprüfen, ob Streaming-Indikator angezeigt wird
    expect(await chatPage.isStreamingActive()).toBeTruthy();
    
    // Warten auf Antwort
    await chatPage.waitForResponse();
    
    // Überprüfen, ob Antwort empfangen wurde
    const responses = await chatPage.getResponses();
    expect(responses.length).toBeGreaterThan(0);
    
    // Überprüfen, ob Antwort sinnvoll ist (enthält Zeitinformationen)
    const lastResponse = responses[responses.length - 1];
    expect(lastResponse).toMatch(/(\d{1,2}:\d{2}|Uhr|Zeit)/);
  });
  
  test('Zwischen Sitzungen wechseln', async ({ page }) => {
    const chatPage = new ChatPage(page);
    await chatPage.goto();
    
    // Erste Sitzung erstellen
    await chatPage.createNewSession('Sitzung 1');
    await chatPage.sendMessage('Dies ist Sitzung 1');
    
    // Zweite Sitzung erstellen
    await chatPage.createNewSession('Sitzung 2');
    await chatPage.sendMessage('Dies ist Sitzung 2');
    
    // Zurück zur ersten Sitzung wechseln
    await chatPage.switchToSession('Sitzung 1');
    
    // Überprüfen, ob richtige Sitzung aktiv ist
    expect(await chatPage.getActiveSessionTitle()).toBe('Sitzung 1');
    expect(await chatPage.getMessages()).toContain('Dies ist Sitzung 1');
    
    // Zur zweiten Sitzung wechseln
    await chatPage.switchToSession('Sitzung 2');
    
    // Überprüfen, ob richtige Sitzung aktiv ist
    expect(await chatPage.getActiveSessionTitle()).toBe('Sitzung 2');
    expect(await chatPage.getMessages()).toContain('Dies ist Sitzung 2');
  });
});
```

### 5.3 Dokumentenkonvertertests

```typescript
// doc-converter/document-conversion.spec.ts
import { test, expect } from '@playwright/test';
import { DocConverterPage } from '../../pages/DocConverterPage';
import { loginAsAdminUser } from '../../fixtures/auth';
import * as path from 'path';

test.describe('Dokumentenkonverter', () => {
  test.beforeEach(async ({ page }) => {
    // Als Administrator anmelden
    await loginAsAdminUser(page);
  });

  test('PDF-Datei hochladen und konvertieren', async ({ page }) => {
    const converterPage = new DocConverterPage(page);
    await converterPage.goto();
    
    // PDF hochladen
    const filePath = path.join(__dirname, '../../fixtures/sample.pdf');
    await converterPage.uploadFile(filePath);
    
    // Überprüfen, ob Fortschrittsanzeige erscheint
    expect(await converterPage.isProgressVisible()).toBeTruthy();
    
    // Warten auf Abschluss der Konvertierung
    await converterPage.waitForConversionComplete();
    
    // Überprüfen, ob Ergebnis angezeigt wird
    expect(await converterPage.isResultVisible()).toBeTruthy();
    
    // Überprüfen, ob Dokument in der Liste erscheint
    const documents = await converterPage.getDocumentList();
    expect(documents).toContain('sample.pdf');
  });
  
  test('Nicht unterstütztes Format - Fehlerbehandlung', async ({ page }) => {
    const converterPage = new DocConverterPage(page);
    await converterPage.goto();
    
    // Nicht unterstützte Datei hochladen
    const filePath = path.join(__dirname, '../../fixtures/unsupported.xyz');
    await converterPage.uploadFile(filePath);
    
    // Überprüfen, ob Fehlermeldung angezeigt wird
    expect(await converterPage.getErrorMessage()).toContain('nicht unterstützt');
  });
  
  test('Konvertiertes Dokument herunterladen', async ({ page }) => {
    const converterPage = new DocConverterPage(page);
    await converterPage.goto();
    
    // Dokument hochladen
    const filePath = path.join(__dirname, '../../fixtures/sample.docx');
    await converterPage.uploadFile(filePath);
    
    // Warten auf Abschluss der Konvertierung
    await converterPage.waitForConversionComplete();
    
    // Download starten und überwachen
    const downloadPromise = page.waitForEvent('download');
    await converterPage.downloadConvertedDocument();
    const download = await downloadPromise;
    
    // Überprüfen, ob Download gestartet wurde
    expect(download.suggestedFilename()).toContain('sample');
  });
});
```

### 5.4 Admin-Funktionstests

```typescript
// admin/user-management.spec.ts
import { test, expect } from '@playwright/test';
import { AdminPage } from '../../pages/AdminPage';
import { loginAsAdminUser } from '../../fixtures/auth';

test.describe('Admin-Benutzerverwaltung', () => {
  test.beforeEach(async ({ page }) => {
    // Als Administrator anmelden
    await loginAsAdminUser(page);
  });

  test('Benutzer anzeigen und filtern', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.goto();
    await adminPage.navigateToUsers();
    
    // Überprüfen, ob Benutzerliste angezeigt wird
    expect(await adminPage.getUsersCount()).toBeGreaterThan(0);
    
    // Nach Benutzer filtern
    await adminPage.filterUsers('test');
    
    // Überprüfen, ob Filter funktioniert
    const filteredUsers = await adminPage.getUsernames();
    filteredUsers.forEach(username => {
      expect(username.toLowerCase()).toContain('test');
    });
  });
  
  test('Neuen Benutzer erstellen', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.goto();
    await adminPage.navigateToUsers();
    
    const initialCount = await adminPage.getUsersCount();
    
    // Neuen Benutzer erstellen
    const username = `testuser_${Date.now()}`;
    await adminPage.createUser({
      username,
      email: `${username}@example.com`,
      password: 'securePassword123',
      role: 'user'
    });
    
    // Überprüfen, ob Benutzer erstellt wurde
    expect(await adminPage.getUsersCount()).toBe(initialCount + 1);
    expect(await adminPage.hasUser(username)).toBeTruthy();
  });
  
  test('Benutzer bearbeiten', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.goto();
    await adminPage.navigateToUsers();
    
    // Ersten Benutzer auswählen
    const username = await adminPage.getFirstUsername();
    await adminPage.selectUser(username);
    
    // Benutzerrolle ändern
    await adminPage.editUser(username, { role: 'admin' });
    
    // Überprüfen, ob Änderung angewendet wurde
    expect(await adminPage.getUserRole(username)).toBe('admin');
  });
  
  test('Benutzer löschen', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.goto();
    await adminPage.navigateToUsers();
    
    // Testbenutzer erstellen
    const username = `delete_test_${Date.now()}`;
    await adminPage.createUser({
      username,
      email: `${username}@example.com`,
      password: 'securePassword123',
      role: 'user'
    });
    
    const initialCount = await adminPage.getUsersCount();
    
    // Benutzer löschen
    await adminPage.deleteUser(username);
    
    // Überprüfen, ob Benutzer gelöscht wurde
    expect(await adminPage.getUsersCount()).toBe(initialCount - 1);
    expect(await adminPage.hasUser(username)).toBeFalsy();
  });
});
```

### 5.5 Fehlerbehandlungstests

```typescript
// error-handling/network-errors.spec.ts
import { test, expect } from '@playwright/test';
import { ChatPage } from '../../pages/ChatPage';
import { loginAsTestUser } from '../../fixtures/auth';

test.describe('Fehlerbehandlung bei Netzwerkproblemen', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('Wiederherstellung nach Netzwerktimeout', async ({ page, context }) => {
    const chatPage = new ChatPage(page);
    await chatPage.goto();
    
    // Sitzung erstellen
    await chatPage.createNewSession();
    
    // Netzwerk verlangsamen
    await context.route('**/api/chat/**', (route) => {
      // Verzögerung von 30 Sekunden simulieren
      setTimeout(() => route.continue(), 30000);
    });
    
    // Nachricht senden
    await chatPage.sendMessage('Dies ist eine Testnachricht bei langsamer Verbindung');
    
    // Überprüfen, ob Timeout-Fehler angezeigt wird
    expect(await chatPage.getErrorMessage()).toContain('Zeitüberschreitung');
    
    // Netzwerk wiederherstellen
    await context.unroute('**/api/chat/**');
    
    // Erneut versuchen
    await chatPage.retryLastMessage();
    
    // Überprüfen, ob Nachricht erfolgreich gesendet wurde
    await chatPage.waitForResponse();
    const responses = await chatPage.getResponses();
    expect(responses.length).toBeGreaterThan(0);
  });
  
  test('Offline-Modus und Wiederverbindung', async ({ page, context }) => {
    const chatPage = new ChatPage(page);
    await chatPage.goto();
    
    // Offline-Modus simulieren
    await context.setOffline(true);
    
    // Nachricht senden versuchen
    await chatPage.sendMessage('Offline-Nachricht');
    
    // Überprüfen, ob Offline-Hinweis angezeigt wird
    expect(await chatPage.getErrorMessage()).toContain('offline');
    
    // Überprüfen, ob Nachricht in Warteschlange ist
    expect(await chatPage.isPendingMessageVisible()).toBeTruthy();
    
    // Online-Modus wiederherstellen
    await context.setOffline(false);
    
    // Überprüfen, ob ausstehende Nachricht automatisch gesendet wird
    await chatPage.waitForResponse();
    const responses = await chatPage.getResponses();
    expect(responses.length).toBeGreaterThan(0);
  });
  
  test('Sitzungswiederherstellung nach Browseraktualisierung', async ({ page }) => {
    const chatPage = new ChatPage(page);
    await chatPage.goto();
    
    // Neue Sitzung erstellen und Nachricht senden
    await chatPage.createNewSession('Persistenztest');
    await chatPage.sendMessage('Nachricht vor dem Refresh');
    await chatPage.waitForResponse();
    
    // Sitzungs-ID speichern
    const sessionId = await chatPage.getCurrentSessionId();
    
    // Seite neu laden
    await page.reload();
    
    // Warten, bis Chat-Seite wieder geladen ist
    await page.waitForSelector('.chat-container');
    
    // Überprüfen, ob Sitzung erhalten bleibt
    expect(await chatPage.getCurrentSessionId()).toBe(sessionId);
    
    // Überprüfen, ob Nachrichtenverlauf erhalten bleibt
    const messages = await chatPage.getMessages();
    expect(messages).toContain('Nachricht vor dem Refresh');
  });
});
```

### 5.6 Visuelle Regressionstests

```typescript
// visual/visual-regression.spec.ts
import { test, expect } from '@playwright/test';
import { loginAsTestUser, loginAsAdminUser } from '../../fixtures/auth';

test.describe('Visuelle Regression', () => {
  test('Login-Seite', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Screenshot aufnehmen und mit Baseline vergleichen
    expect(await page.screenshot()).toMatchSnapshot('login.png');
  });
  
  test('Chat-Interface', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/chat');
    await page.waitForSelector('.chat-container');
    await page.waitForLoadState('networkidle');
    
    // Screenshot aufnehmen und mit Baseline vergleichen
    expect(await page.screenshot()).toMatchSnapshot('chat-interface.png');
  });
  
  test('Chat-Interface im Dunkelmodus', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/chat');
    await page.waitForSelector('.chat-container');
    
    // Dunkelmodus aktivieren
    await page.click('.theme-toggle');
    await page.waitForSelector('body.dark-theme');
    await page.waitForLoadState('networkidle');
    
    // Screenshot aufnehmen und mit Baseline vergleichen
    expect(await page.screenshot()).toMatchSnapshot('chat-interface-dark.png');
  });
  
  test('Admin-Dashboard', async ({ page }) => {
    await loginAsAdminUser(page);
    await page.goto('/admin');
    await page.waitForSelector('.admin-dashboard');
    await page.waitForLoadState('networkidle');
    
    // Screenshot aufnehmen und mit Baseline vergleichen
    expect(await page.screenshot()).toMatchSnapshot('admin-dashboard.png');
  });
  
  test('Dokumentenkonverter', async ({ page }) => {
    await loginAsAdminUser(page);
    await page.goto('/admin/document-converter');
    await page.waitForSelector('.doc-converter-container');
    await page.waitForLoadState('networkidle');
    
    // Screenshot aufnehmen und mit Baseline vergleichen
    expect(await page.screenshot()).toMatchSnapshot('document-converter.png');
  });
  
  // Responsive Tests
  test('Chat-Interface auf Mobilgeräten', async ({ page }) => {
    // Mobilgerät simulieren
    await page.setViewportSize({ width: 375, height: 667 });
    
    await loginAsTestUser(page);
    await page.goto('/chat');
    await page.waitForSelector('.chat-container');
    await page.waitForLoadState('networkidle');
    
    // Screenshot aufnehmen und mit Baseline vergleichen
    expect(await page.screenshot()).toMatchSnapshot('chat-interface-mobile.png');
  });
});
```

## 6. Fixtures und Testdaten

### 6.1 Authentifizierungsfixtures

```typescript
// fixtures/auth.ts
import { Page } from '@playwright/test';

/**
 * Meldet einen Testbenutzer an
 */
export async function loginAsTestUser(page: Page) {
  await page.goto('/login');
  await page.fill('#email', 'test@example.com');
  await page.fill('#password', 'testpassword');
  await page.click('button[type="submit"]');
  await page.waitForNavigation();
}

/**
 * Meldet einen Administratorbenutzer an
 */
export async function loginAsAdminUser(page: Page) {
  await page.goto('/login');
  await page.fill('#email', 'admin@example.com');
  await page.fill('#password', 'adminpassword');
  await page.click('button[type="submit"]');
  await page.waitForNavigation();
}

/**
 * Meldet den aktuellen Benutzer ab
 */
export async function logout(page: Page) {
  await page.click('.user-menu');
  await page.click('.logout-button');
  await page.waitForNavigation();
}
```

### 6.2 Globales Setup für Auth-Status

```typescript
// global-setup.ts
import { chromium, FullConfig } from '@playwright/test';

/**
 * Globales Setup für Authentifizierungszustände
 */
async function globalSetup(config: FullConfig) {
  const { baseURL, storageState } = config.projects[0].use;
  
  // Browser starten
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Authentifizierungsstatus für normalen Benutzer
  await page.goto(`${baseURL}/login`);
  await page.fill('#email', 'test@example.com');
  await page.fill('#password', 'testpassword');
  await page.click('button[type="submit"]');
  await page.waitForNavigation();
  await page.context().storageState({ path: './e2e/fixtures/testUserStorageState.json' });
  
  // Authentifizierungsstatus für Administratorbenutzer
  await page.goto(`${baseURL}/login`);
  await page.fill('#email', 'admin@example.com');
  await page.fill('#password', 'adminpassword');
  await page.click('button[type="submit"]');
  await page.waitForNavigation();
  await page.context().storageState({ path: './e2e/fixtures/adminUserStorageState.json' });
  
  // Aufräumen
  await browser.close();
}

export default globalSetup;
```

## 7. CI/CD-Integration

### 7.1 GitHub Actions Workflow

```yaml
name: E2E Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright browsers
        run: npx playwright install --with-deps
      
      - name: Start dev server
        run: npm run dev &
        env:
          NODE_ENV: test
      
      - name: Wait for server to start
        run: npx wait-on http://localhost:5173
      
      - name: Run E2E tests
        run: npx playwright test
        env:
          CI: true
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: e2e-test-results/
          retention-days: 30
```

### 7.2 Playwright-Konfiguration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'e2e-test-results/html', open: 'never' }],
    ['list', { printSteps: true }]
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
  globalSetup: './e2e/global-setup.ts',
  outputDir: 'e2e-test-results/artifacts',
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    baseURL: 'http://localhost:5173',
    launchOptions: {
      slowMo: process.env.CI ? 0 : 500,
    },
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
      name: 'authenticated-user',
      use: {
        ...devices['Desktop Chrome'],
        storageState: './e2e/fixtures/testUserStorageState.json',
      },
    },
    {
      name: 'authenticated-admin',
      use: {
        ...devices['Desktop Chrome'],
        storageState: './e2e/fixtures/adminUserStorageState.json',
      },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 12'] },
    },
  ],
});
```

## 8. Test-Ausführung und Berichterstattung

### 8.1 Lokale Ausführung

```bash
# Alle Tests ausführen
npx playwright test

# Bestimmte Tests ausführen
npx playwright test chat/

# Tests im UI-Modus ausführen
npx playwright test --ui

# Tests mit Debug-Informationen
npx playwright test --debug

# Tests in einem bestimmten Browser ausführen
npx playwright test --project=chromium
```

### 8.2 Testergebnisse und Berichte

- **HTML-Berichte**: Detaillierte HTML-Berichte mit Schritten, Screenshots und Videos
- **CI-Integration**: Testergebnisse als Artefakte in der CI/CD-Pipeline
- **Fehlerbenachrichtigungen**: Automatische Benachrichtigungen bei fehlgeschlagenen Tests
- **Dashboard**: Zentrales Dashboard für Testtrends und -ergebnisse

## 9. Best Practices und Richtlinien

### 9.1 Allgemeine Testrichtlinien

- **Eindeutige Test-IDs**: Verwenden Sie eindeutige Datenattribute (`data-testid`) zur Identifizierung von Elementen
- **Stabile Selektoren**: Vermeiden Sie Selektoren, die sich häufig ändern (z.B. CSS-Klassen für Styling)
- **Isolierte Tests**: Jeder Test sollte unabhängig von anderen sein
- **Explizite Wartestrategien**: Verwenden Sie explizite Wartestrategien anstelle von festen Timeouts
- **Präzise Assertions**: Überprüfen Sie genau den Zustand, den Sie validieren möchten

### 9.2 Konventionen für Page Objects

- **Klare Trennung von Verantwortlichkeiten**: Page Objects sollten nur die Interaktion mit der Seite kapseln
- **Fluent API**: Page-Methods sollte das Page Object selbst zurückgeben, um Method-Chaining zu ermöglichen
- **Minimale Schnittstellen**: Beschränken Sie die öffentliche API auf das Notwendige
- **Kommentierte Methoden**: Jede Methode sollte einen klaren Kommentar haben

### 9.3 Testdatenmanagement

- **Isolierte Testdaten**: Verwenden Sie eindeutige Testdaten für jeden Test
- **Cleanup nach Tests**: Stellen Sie sicher, dass Tests nach sich aufräumen
- **Deterministische Testdaten**: Vermeiden Sie zufällige Daten, außer wo ausdrücklich erforderlich
- **Umgebungsvariablen**: Verwenden Sie Umgebungsvariablen für umgebungsspezifische Konfigurationen

## 10. Kontinuierliche Verbesserung

### 10.1 Metriken und Überwachung

- **Testabdeckung**: Regelmäßige Überprüfung der Testabdeckung kritischer Funktionen
- **Testdauer**: Überwachung und Optimierung der Testausführungszeit
- **Fehlerrate**: Überwachung der Test-Erfolgsquote und häufigster Fehler
- **Flaky Tests**: Identifizierung und Behebung instabiler Tests

### 10.2 Review-Prozess

- **Code-Reviews für Tests**: Tests sollten dem gleichen Review-Prozess wie Produktionscode unterliegen
- **Reviewer-Checkliste**: Spezifische Checkliste für Test-Reviews
- **Regelmäßige Test-Reviews**: Periodische Überprüfung und Aktualisierung der Teststrategie

## 11. Fazit

Die implementierte End-to-End-Teststrategie mit Playwright bietet einen umfassenden Ansatz zur Qualitätssicherung des nScale DMS Assistent. Durch die Abdeckung kritischer Benutzerworkflows, browserübergreifende Tests und visuelle Regressionstests stellen wir sicher, dass die Anwendung aus Benutzerperspektive korrekt funktioniert. Die Integration in den CI/CD-Prozess ermöglicht eine kontinuierliche Validierung der Anwendung bei jeder Codeänderung.

Diese Teststrategie ist besonders wichtig während der Vue 3 SFC-Migration, um sicherzustellen, dass die neue Implementierung die gleiche Funktionalität wie die Legacy-Implementierung bietet und keine Regressionen einführt.

---

Zuletzt aktualisiert: 10.05.2025