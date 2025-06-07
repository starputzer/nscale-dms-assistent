/**
 * E2E Tests für Real-Time Updates (WebSocket/SSE)
 */
import { test, expect } from "@playwright/test";
import { LoginPage } from "../../pages/login-page";
import { ChatPage } from "../../pages/chat-page";
import { AdminPage } from "../../pages/admin-page";
import { testUsers } from "../../fixtures/test-users";

test.describe("Real-Time Updates", () => {
  let loginPage: LoginPage;
  let chatPage: ChatPage;
  let adminPage: AdminPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    chatPage = new ChatPage(page);
    adminPage = new AdminPage(page);
  });

  test("SSE-Streaming für Chat-Antworten", async ({ page }) => {
    // Einloggen
    await loginPage.goto();
    await loginPage.login(testUsers.user.email, testUsers.user.password);
    
    // SSE-Event-Listener einrichten
    const sseEvents: any[] = [];
    await page.evaluateOnNewDocument(() => {
      window.sseEvents = [];
      const originalEventSource = window.EventSource;
      window.EventSource = class extends originalEventSource {
        constructor(url: string, config?: EventSourceInit) {
          super(url, config);
          this.addEventListener('message', (event) => {
            window.sseEvents.push({
              type: 'message',
              data: event.data,
              timestamp: Date.now()
            });
          });
        }
      };
    });
    
    // Chat-Nachricht senden
    await chatPage.sendMessage("Erkläre mir SSE in einem Satz");
    
    // Streaming-Indikator sollte erscheinen
    await expect(page.locator('.streaming-indicator')).toBeVisible();
    
    // Auf vollständige Antwort warten
    await expect(page.locator('.message.assistant')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('.streaming-indicator')).not.toBeVisible();
    
    // SSE-Events prüfen
    const events = await page.evaluate(() => window.sseEvents);
    expect(events.length).toBeGreaterThan(0);
    
    // Events sollten Chunks enthalten
    const messageEvents = events.filter(e => e.type === 'message');
    expect(messageEvents.length).toBeGreaterThan(1); // Mehrere Chunks
  });

  test("WebSocket-Connection für Admin-Dashboard", async ({ page }) => {
    // Als Admin einloggen
    await loginPage.goto();
    await loginPage.login(testUsers.admin.email, testUsers.admin.password);
    
    // WebSocket-Events tracken
    const wsMessages: any[] = [];
    await page.evaluateOnNewDocument(() => {
      window.wsMessages = [];
      const originalWebSocket = window.WebSocket;
      window.WebSocket = class extends originalWebSocket {
        constructor(url: string, protocols?: string | string[]) {
          super(url, protocols);
          this.addEventListener('message', (event) => {
            window.wsMessages.push({
              data: event.data,
              timestamp: Date.now()
            });
          });
        }
      };
    });
    
    // Zum Admin-Dashboard
    await page.goto('/admin');
    
    // WebSocket-Status prüfen
    await expect(page.locator('.websocket-status.connected')).toBeVisible({ timeout: 10000 });
    
    // Warten auf Real-Time Updates
    await page.waitForTimeout(3000);
    
    // WebSocket-Messages prüfen
    const messages = await page.evaluate(() => window.wsMessages);
    expect(messages.length).toBeGreaterThan(0);
    
    // Mindestens ein Heartbeat oder Update
    const hasUpdate = messages.some(msg => {
      try {
        const data = JSON.parse(msg.data);
        return data.type === 'update' || data.type === 'heartbeat';
      } catch {
        return false;
      }
    });
    expect(hasUpdate).toBe(true);
  });

  test("Real-Time Session-Updates zwischen Tabs", async ({ browser }) => {
    // Zwei Browser-Kontexte erstellen
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    // In beiden Tabs einloggen
    const loginPage1 = new LoginPage(page1);
    const loginPage2 = new LoginPage(page2);
    
    await loginPage1.goto();
    await loginPage1.login(testUsers.user.email, testUsers.user.password);
    
    await loginPage2.goto();
    await loginPage2.login(testUsers.user.email, testUsers.user.password);
    
    // Session-ID aus Tab 1 holen
    const sessionId = await page1.evaluate(() => {
      const activeSession = document.querySelector('.session-item.active');
      return activeSession?.getAttribute('data-session-id');
    });
    
    // In Tab 2 dieselbe Session öffnen
    if (sessionId) {
      await page2.click(`.session-item[data-session-id="${sessionId}"]`);
    }
    
    // Nachricht in Tab 1 senden
    const chatPage1 = new ChatPage(page1);
    await chatPage1.sendMessage("Test-Nachricht für Real-Time Sync");
    
    // Nachricht sollte in Tab 2 erscheinen
    await expect(page2.locator('.message:has-text("Test-Nachricht für Real-Time Sync")')).toBeVisible({ timeout: 5000 });
    
    // Cleanup
    await context1.close();
    await context2.close();
  });

  test("Auto-Reconnect bei Verbindungsabbruch", async ({ page }) => {
    await loginPage.goto();
    await loginPage.login(testUsers.admin.email, testUsers.admin.password);
    
    await page.goto('/admin');
    
    // Initial verbunden
    await expect(page.locator('.websocket-status.connected')).toBeVisible();
    
    // Netzwerk offline simulieren
    await page.context().setOffline(true);
    
    // Disconnected-Status
    await expect(page.locator('.websocket-status.disconnected')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.connection-alert')).toBeVisible();
    
    // Wieder online gehen
    await page.context().setOffline(false);
    
    // Auto-Reconnect sollte erfolgen
    await expect(page.locator('.websocket-status.reconnecting')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.websocket-status.connected')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.connection-alert')).not.toBeVisible();
  });

  test("Real-Time Notifications", async ({ page }) => {
    await loginPage.goto();
    await loginPage.login(testUsers.admin.email, testUsers.admin.password);
    
    // Notification-Permission simulieren
    await page.context().grantPermissions(['notifications']);
    
    // Notification-Listener
    const notifications: any[] = [];
    await page.evaluateOnNewDocument(() => {
      window.notifications = [];
      const originalNotification = window.Notification;
      window.Notification = class extends originalNotification {
        constructor(title: string, options?: NotificationOptions) {
          super(title, options);
          window.notifications.push({ title, options, timestamp: Date.now() });
        }
      };
    });
    
    // Zum Admin-Panel
    await page.goto('/admin');
    
    // Aktion auslösen, die Notification triggert
    await page.click('button:has-text("Cache leeren")');
    
    // In-App Notification prüfen
    await expect(page.locator('.toast-notification')).toBeVisible();
    await expect(page.locator('.toast-notification')).toContainText('Cache erfolgreich geleert');
    
    // Browser-Notifications prüfen
    const browserNotifications = await page.evaluate(() => window.notifications);
    const cacheNotification = browserNotifications.find(n => 
      n.title.includes('Cache') || n.options?.body?.includes('Cache')
    );
    expect(cacheNotification).toBeTruthy();
  });

  test("Live-Updates für Statistiken", async ({ page }) => {
    await loginPage.goto();
    await loginPage.login(testUsers.admin.email, testUsers.admin.password);
    
    // Zu Statistiken navigieren
    await page.goto('/admin');
    await adminPage.selectTab('statistics');
    
    // Auto-Update aktivieren
    const autoUpdate = page.locator('.auto-update-toggle input[type="checkbox"]');
    if (!(await autoUpdate.isChecked())) {
      await autoUpdate.click();
    }
    
    // Initiale Werte erfassen
    const activeUsers = page.locator('.stat-card:has-text("Aktive Benutzer") .stat-value');
    const initialValue = await activeUsers.textContent();
    
    // Auf Updates warten (max 10 Sekunden)
    let updated = false;
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(1000);
      const currentValue = await activeUsers.textContent();
      if (currentValue !== initialValue) {
        updated = true;
        break;
      }
    }
    
    expect(updated).toBe(true);
    
    // Update-Indikator prüfen
    await expect(page.locator('.last-update-time')).toBeVisible();
    const updateTime = await page.locator('.last-update-time').textContent();
    expect(updateTime).toMatch(/Aktualisiert vor \d+ Sekunden/);
  });

  test("Collaborative Features - Typing Indicators", async ({ browser }) => {
    // Zwei Benutzer simulieren
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    // Beide einloggen
    const loginPage1 = new LoginPage(page1);
    await loginPage1.goto();
    await loginPage1.login(testUsers.user.email, testUsers.user.password);
    
    const loginPage2 = new LoginPage(page2);
    await loginPage2.goto();
    await loginPage2.login(testUsers.admin.email, testUsers.admin.password);
    
    // Gleiche Session in beiden Tabs öffnen
    const sessionId = await page1.evaluate(() => {
      const activeSession = document.querySelector('.session-item.active');
      return activeSession?.getAttribute('data-session-id');
    });
    
    if (sessionId) {
      await page2.click(`.session-item[data-session-id="${sessionId}"]`);
    }
    
    // User 1 tippt
    const chatInput1 = page1.locator('.chat-input textarea');
    await chatInput1.fill('User 1 is typing...');
    
    // Typing Indicator in Tab 2
    await expect(page2.locator('.typing-indicator')).toBeVisible({ timeout: 2000 });
    await expect(page2.locator('.typing-indicator')).toContainText(testUsers.user.email);
    
    // User 1 hört auf zu tippen
    await chatInput1.clear();
    
    // Typing Indicator sollte verschwinden
    await expect(page2.locator('.typing-indicator')).not.toBeVisible({ timeout: 3000 });
    
    // Cleanup
    await context1.close();
    await context2.close();
  });

  test("Server-Sent Events Error Handling", async ({ page }) => {
    await loginPage.goto();
    await loginPage.login(testUsers.user.email, testUsers.user.password);
    
    // SSE Error simulieren durch ungültige Anfrage
    await page.route('**/api/chat/stream**', route => {
      route.fulfill({
        status: 500,
        body: 'Internal Server Error'
      });
    });
    
    // Nachricht senden
    await chatPage.sendMessage("Test SSE Error Handling");
    
    // Error-Handling prüfen
    await expect(page.locator('.error-message')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.retry-button')).toBeVisible();
    
    // Route wiederherstellen und retry
    await page.unroute('**/api/chat/stream**');
    await page.click('.retry-button');
    
    // Sollte jetzt funktionieren
    await expect(page.locator('.message.assistant')).toBeVisible({ timeout: 30000 });
  });
});