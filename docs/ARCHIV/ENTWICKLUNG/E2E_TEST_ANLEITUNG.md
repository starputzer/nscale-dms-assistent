# End-to-End Testanleitung für nscale DMS Assistent

**Version:** 1.0  
**Letzte Aktualisierung:** 09.05.2025

Diese Anleitung beschreibt die Einrichtung, Ausführung und Erweiterung der End-to-End-Tests für den nScale DMS Assistenten mit Playwright.

## 1. Überblick

Die E2E-Testinfrastruktur basiert auf Playwright und ist darauf ausgerichtet, kritische Benutzerflüsse, Fehlerszenarien und UI-Konsistenz zu testen. Die Tests sind so strukturiert, dass sie wartbar, erweiterbar und zuverlässig sind.

### Projektstruktur

```
e2e/
  ├── fixtures/           # Testdaten und Hilfsdateien
  │   ├── test-users.ts   # Hilfsfunktionen zum Erstellen von Testbenutzern
  │   ├── test-documents.ts # Testdokumente für den Dokumentenkonverter
  │   ├── admin-auth.json # Gespeicherter Auth-State für Admin-Benutzer
  │   └── user-auth.json  # Gespeicherter Auth-State für Standard-Benutzer
  ├── pages/              # Page Objects für verschiedene Seiten
  │   ├── login-page.ts   # Page Object für die Login-Seite
  │   ├── chat-page.ts    # Page Object für die Chat-Seite
  │   ├── document-converter-page.ts # Page Object für die Dokumentenkonverter-Seite
  │   └── admin-page.ts   # Page Object für die Admin-Seite
  ├── tests/              # Testdateien nach Funktionalität geordnet
  │   ├── auth/           # Authentifizierungstests
  │   ├── chat/           # Chat-Systemtests
  │   ├── document-converter/ # Dokumentenkonverter-Tests
  │   ├── admin/          # Admin-Bereichstests
  │   ├── error-handling/ # Fehlerbehandlungstests
  │   └── visual/         # Visuelle Regressionstests
  └── utils/              # Hilfsfunktionen für Tests
      └── test-helpers.ts # Allgemeine Hilfsfunktionen für Tests
```

## 2. Installation und Einrichtung

### 2.1 Voraussetzungen

- Node.js 16 oder höher
- npm 7 oder höher
- Zugang zum nScale DMS Assistent Repository

### 2.2 Installation

```bash
# Klonen des Repositories (falls noch nicht geschehen)
git clone https://github.com/example/nscale-dms-assistent.git
cd nscale-dms-assistent

# Installation der Abhängigkeiten
npm install

# Installation der Playwright-Browser
npx playwright install
```

### 2.3 Konfiguration

Die Playwright-Konfiguration befindet sich in der Datei `playwright.config.ts` im Hauptverzeichnis des Projekts. Diese Datei enthält Einstellungen für:

- Test-Verzeichnisse und -Muster
- Browser-Konfigurationen
- Reporter-Einstellungen
- Webserver-Konfiguration
- Screenshot- und Video-Aufzeichnungsoptionen
- Globale Setup- und Teardown-Skripte

## 3. Ausführung der Tests

### 3.1 Alle Tests ausführen

```bash
npm run test:e2e
```

### 3.2 Tests mit UI ausführen

```bash
npm run test:e2e:ui
```

### 3.3 Tests im Debug-Modus ausführen

```bash
npm run test:e2e:debug
```

### 3.4 Testbericht anzeigen

```bash
npm run test:e2e:report
```

### 3.5 Spezifische Tests ausführen

```bash
# Nur Authentifizierungstests ausführen
npx playwright test e2e/tests/auth/

# Nur einen bestimmten Test ausführen
npx playwright test e2e/tests/chat/basic-chat.spec.ts

# Tests mit bestimmten Tags ausführen
npx playwright test --grep "@smoke"
```

## 4. Page Object Pattern

Die Tests verwenden das Page Object Pattern, um die UI-Interaktionen zu kapseln und die Tests wartbarer zu machen.

### 4.1 Beispiel für ein Page Object

```typescript
// e2e/pages/login-page.ts
import { Page, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  
  // Selektoren für Elemente auf der Login-Seite
  readonly usernameInput = 'input[name="username"]';
  readonly passwordInput = 'input[name="password"]';
  readonly loginButton = 'button[type="submit"]';
  
  constructor(page: Page) {
    this.page = page;
  }
  
  async goto() {
    await this.page.goto('/login');
  }
  
  async login(username: string, password: string) {
    await this.page.fill(this.usernameInput, username);
    await this.page.fill(this.passwordInput, password);
    await this.page.click(this.loginButton);
  }
}
```

### 4.2 Verwendung des Page Objects in Tests

```typescript
// e2e/tests/auth/login.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/login-page';

test('Erfolgreiche Anmeldung mit gültigen Anmeldedaten', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login('admin', 'admin123');
  
  // Nach erfolgreicher Anmeldung sollte die Seite zur Hauptseite weitergeleitet werden
  await expect(page).toHaveURL('/');
});
```

## 5. Authentifizierungsstatus

Um Tests effizienter zu gestalten, können vordefinierte Authentifizierungszustände verwendet werden. Diese werden im Global Setup erstellt und in den Tests wiederverwendet.

### 5.1 Global Setup

Das Global Setup erstellt Authentifizierungszustände für verschiedene Benutzerrollen:

```typescript
// e2e/global-setup.ts
async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;
  const browser = await chromium.launch();
  
  // Admin-Benutzer: Anmelden und Auth-State speichern
  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  await adminPage.goto(`${baseURL}/login`);
  await adminPage.fill('input[name="username"]', 'admin');
  await adminPage.fill('input[name="password"]', 'admin123');
  await adminPage.click('button[type="submit"]');
  await adminPage.waitForURL(`${baseURL}/`);
  await adminContext.storageState({ path: './e2e/fixtures/admin-auth.json' });
  
  // Standard-Benutzer: Anmelden und Auth-State speichern
  // ...
  
  await browser.close();
}
```

### 5.2 Verwendung des Authentifizierungsstatus in Tests

```typescript
// Test mit Admin-Benutzer ausführen
test.use({ storageState: './e2e/fixtures/admin-auth.json' });

test('Admin-Benutzer kann Systemeinstellungen ändern', async ({ page }) => {
  // Der Test wird mit Admin-Berechtigungen ausgeführt
});
```

## 6. Testdaten und Fixtures

### 6.1 Testbenutzer erstellen

```typescript
// e2e/fixtures/test-users.ts
export async function createTestUsers() {
  const apiUrl = process.env.API_URL || 'http://localhost:5173/api';
  
  // Admin-Benutzer erstellen
  await axios.post(`${apiUrl}/admin/users`, {
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    isTestUser: true
  });
  
  // Standard-Benutzer erstellen
  // ...
}
```

### 6.2 Testdokumente erstellen

```typescript
// e2e/fixtures/test-documents.ts
export const TEST_DOCUMENTS = {
  pdf: { 
    path: path.join(__dirname, 'files', 'testdocument.pdf'), 
    mimetype: 'application/pdf',
    content: 'Test PDF Dokument' 
  },
  // ...
};

export async function createTestDocuments() {
  // Testdokumente erstellen
  // ...
}
```

## 7. Visuelle Regressionstests

Visuelle Regressionstests vergleichen Screenshots von UI-Komponenten mit Baseline-Screenshots, um visuelle Änderungen zu erkennen.

```typescript
// e2e/tests/visual/visual-regression.spec.ts
test('Chat-Oberfläche sollte visuell konsistent sein', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  // Screenshot der Chat-Komponente erstellen und mit Baseline vergleichen
  await expect(page.locator('.chat-container')).toHaveScreenshot('chat-container.png');
});
```

## 8. Fehlerbehandlungstests

Tests für Fehlerszenarien simulieren Netzwerkprobleme und andere Fehler, um die Robustheit der Anwendung zu testen.

```typescript
// e2e/tests/error-handling/network-errors.spec.ts
test('Fehlerbehandlung bei API-Fehler während des Nachrichtensendens', async ({ page }) => {
  const chatPage = new ChatPage(page);
  await chatPage.goto();
  
  // Simuliere Netzwerkfehler für die Nachrichten-API
  await simulateNetworkErrors(page, '**/api/sessions/*/messages', 1.0);
  
  // Nachricht senden
  await chatPage.sendMessage('Testnachricht mit Netzwerkfehler');
  
  // Prüfen, ob eine Fehlermeldung angezeigt wird
  await expect(page.locator('.error-message')).toBeVisible();
});
```

## 9. CI/CD-Integration

Die Tests sind in die CI/CD-Pipeline integriert und werden automatisch bei Pull-Requests ausgeführt. Die Konfiguration befindet sich in der Datei `.github/workflows/test.yml`.

```yaml
jobs:
  e2e-tests:
    name: E2E Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright browsers
        run: npx playwright install --with-deps
      - name: Run E2E tests
        run: npm run test:e2e
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: e2e-test-results
          path: e2e-test-results/
```

## 10. Hinzufügen neuer Tests

### 10.1 Neuen Test erstellen

1. Identifizieren Sie den zu testenden Benutzerfluss
2. Erstellen oder erweitern Sie bei Bedarf die entsprechenden Page Objects
3. Erstellen Sie eine neue Test-Datei im entsprechenden Verzeichnis
4. Implementieren Sie die Tests mit den entsprechenden Assertions

### 10.2 Beispiel für einen neuen Test

```typescript
// e2e/tests/chat/message-streaming.spec.ts
import { test, expect } from '@playwright/test';
import { ChatPage } from '../../pages/chat-page';

test.describe('Chat-Nachrichtenstreaming', () => {
  test.use({ storageState: './e2e/fixtures/user-auth.json' });
  
  test('Streaming-Antwort wird korrekt angezeigt', async ({ page }) => {
    const chatPage = new ChatPage(page);
    await chatPage.goto();
    
    // Nachricht senden
    await chatPage.sendMessage('Stelle eine lange Antwort zusammen');
    
    // Prüfen, ob das Streaming beginnt
    await expect(page.locator('.message-item.message-assistant.streaming')).toBeVisible();
    
    // Warten, bis das Streaming abgeschlossen ist
    await chatPage.waitForAssistantResponse();
    
    // Prüfen, ob eine vollständige Antwort angezeigt wird
    await expect(page.locator('.message-item.message-assistant')).not.toHaveClass(/streaming/);
    await expect(page.locator('.message-item.message-assistant')).toBeVisible();
  });
});
```

## 11. Best Practices

### 11.1 Selektoren

- Verwenden Sie robuste Selektoren, die weniger anfällig für Änderungen sind
- Bevorzugen Sie data-Attribute (z.B. `data-testid="login-button"`) für Testzwecke
- Vermeiden Sie komplexe CSS-Selektoren, die anfällig für Layout-Änderungen sind

### 11.2 Wartbarkeit

- Kapseln Sie UI-Interaktionen in Page Objects
- Halten Sie Tests fokussiert und unabhängig
- Verwenden Sie aussagekräftige Testbeschreibungen
- Gruppieren Sie verwandte Tests in describe-Blöcken

### 11.3 Zuverlässigkeit

- Warten Sie auf Zustandsänderungen anstatt auf feste Zeiträume
- Behandeln Sie asynchrone Vorgänge korrekt
- Berücksichtigen Sie Netzwerkverzögerungen
- Isolieren Sie Tests voneinander

### 11.4 Leistung

- Wiederverwenden Sie Authentifizierungszustände
- Gruppieren Sie Tests sinnvoll
- Führen Sie Tests parallel aus, wenn möglich
- Verwenden Sie die CI/CD-Pipeline für umfangreiche Tests

## 12. Fehlerbehebung

### 12.1 Häufige Probleme

- **Test findet Element nicht:** Überprüfen Sie den Selektor und die Timing-Bedingungen
- **Test ist instabil:** Überprüfen Sie Race-Conditions und asynchrone Vorgänge
- **Visuelle Tests schlagen fehl:** Aktualisieren Sie Baseline-Screenshots nach beabsichtigten UI-Änderungen
- **Authentifizierungsprobleme:** Überprüfen Sie die gespeicherten Auth-States und das Global Setup

### 12.2 Debugging-Tipps

- Verwenden Sie `test:e2e:debug` für interaktives Debugging
- Fügen Sie `page.pause()` in Tests ein, um den Test an einer bestimmten Stelle anzuhalten
- Nutzen Sie `console.log` und die Playwright-Tracer für detaillierte Logs
- Überprüfen Sie Screenshots und Videos von fehlgeschlagenen Tests

---

Diese Anleitung bietet einen Überblick über die E2E-Testinfrastruktur des nScale DMS Assistenten. Bei Fragen oder Problemen wenden Sie sich bitte an das Entwicklungsteam oder erstellen Sie ein Issue im Repository.