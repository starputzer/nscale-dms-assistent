/**
 * E2E Tests für JWT Authentication Flows
 */
import { test, expect } from "@playwright/test";
import { LoginPage } from "../../pages/login-page";
import { testUsers } from "../../fixtures/test-users";

test.describe("JWT Authentication", () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
  });

  test("Erfolgreiche Anmeldung generiert JWT Token", async ({ page }) => {
    // Login-Request abfangen
    const loginPromise = page.waitForResponse(response => 
      response.url().includes('/api/auth/login') && response.status() === 200
    );

    await loginPage.goto();
    await loginPage.login(testUsers.user.email, testUsers.user.password);

    const loginResponse = await loginPromise;
    const responseData = await loginResponse.json();
    
    // JWT Token sollte vorhanden sein
    expect(responseData).toHaveProperty('access_token');
    expect(responseData.access_token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/); // JWT Format
    
    // Token sollte im LocalStorage gespeichert werden
    const storedToken = await page.evaluate(() => localStorage.getItem('access_token'));
    expect(storedToken).toBe(responseData.access_token);
    
    // User-Info sollte auch vorhanden sein
    expect(responseData).toHaveProperty('user');
    expect(responseData.user.email).toBe(testUsers.user.email);
  });

  test("JWT Token wird bei API-Anfragen mitgesendet", async ({ page }) => {
    await loginPage.goto();
    await loginPage.login(testUsers.user.email, testUsers.user.password);

    // API-Request abfangen
    const apiRequest = page.waitForRequest(request => 
      request.url().includes('/api/') && 
      !request.url().includes('/auth/login')
    );

    // Eine API-Anfrage auslösen
    await page.goto('/chat');
    
    const request = await apiRequest;
    const authHeader = request.headers()['authorization'];
    
    // Authorization Header prüfen
    expect(authHeader).toBeDefined();
    expect(authHeader).toMatch(/^Bearer [\w-]+\.[\w-]+\.[\w-]+$/);
  });

  test("Abgelaufener Token führt zu Logout", async ({ page }) => {
    await loginPage.goto();
    await loginPage.login(testUsers.user.email, testUsers.user.password);
    
    // Token mit abgelaufenem Datum setzen (simuliert)
    await page.evaluate(() => {
      // Fake expired token
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxNTE2MjM5MDIyfQ.fake';
      localStorage.setItem('access_token', expiredToken);
    });
    
    // Seite neu laden
    await page.reload();
    
    // Sollte zur Login-Seite umgeleitet werden
    await expect(page).toHaveURL('/login');
    await expect(page.locator('.alert-message')).toContainText('Sitzung abgelaufen');
  });

  test("Token Refresh bei 401 Response", async ({ page }) => {
    await loginPage.goto();
    await loginPage.login(testUsers.user.email, testUsers.user.password);
    
    let refreshAttempted = false;
    
    // Refresh-Request überwachen
    page.on('request', request => {
      if (request.url().includes('/api/auth/refresh')) {
        refreshAttempted = true;
      }
    });
    
    // 401 Response simulieren
    await page.route('**/api/chat/sessions**', route => {
      if (!refreshAttempted) {
        route.fulfill({
          status: 401,
          body: JSON.stringify({ error: 'Token expired' })
        });
      } else {
        // Nach Refresh normal antworten
        route.continue();
      }
    });
    
    // API-Anfrage auslösen
    await page.goto('/chat');
    
    // Warten bis Refresh versucht wurde
    await page.waitForTimeout(2000);
    
    expect(refreshAttempted).toBe(true);
    
    // Seite sollte normal funktionieren
    await expect(page.locator('.chat-container')).toBeVisible();
  });

  test("Logout löscht JWT Token", async ({ page }) => {
    await loginPage.goto();
    await loginPage.login(testUsers.user.email, testUsers.user.password);
    
    // Token sollte vorhanden sein
    let token = await page.evaluate(() => localStorage.getItem('access_token'));
    expect(token).toBeTruthy();
    
    // Logout
    await page.click('button[aria-label="Logout"]');
    
    // Logout-Request abwarten
    await page.waitForResponse(response => 
      response.url().includes('/api/auth/logout')
    );
    
    // Token sollte gelöscht sein
    token = await page.evaluate(() => localStorage.getItem('access_token'));
    expect(token).toBeNull();
    
    // Sollte zur Login-Seite umgeleitet werden
    await expect(page).toHaveURL('/login');
  });

  test("Geschützte Routen ohne Token", async ({ page }) => {
    // Direkt zu geschützter Route ohne Login
    await page.goto('/admin');
    
    // Sollte zur Login-Seite umgeleitet werden
    await expect(page).toHaveURL('/login');
    
    // Mit Redirect-Parameter
    const url = new URL(page.url());
    expect(url.searchParams.get('redirect')).toBe('/admin');
  });

  test("Token-Validierung bei Seitenwechsel", async ({ page }) => {
    await loginPage.goto();
    await loginPage.login(testUsers.user.email, testUsers.user.password);
    
    // Mehrere geschützte Routen besuchen
    const protectedRoutes = ['/chat', '/profile', '/settings'];
    
    for (const route of protectedRoutes) {
      await page.goto(route);
      
      // Sollte nicht zur Login-Seite umgeleitet werden
      expect(page.url()).toContain(route);
      
      // Content sollte sichtbar sein
      await expect(page.locator('main')).toBeVisible();
    }
  });

  test("Remember Me Funktionalität", async ({ page }) => {
    await loginPage.goto();
    
    // Remember Me aktivieren
    await page.fill('input[name="email"]', testUsers.user.email);
    await page.fill('input[name="password"]', testUsers.user.password);
    await page.check('input[name="rememberMe"]');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/chat');
    
    // Token-Expiry prüfen
    const tokenData = await page.evaluate(() => {
      const token = localStorage.getItem('access_token');
      if (!token) return null;
      
      // JWT Payload dekodieren
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        exp: payload.exp,
        remember: payload.remember_me
      };
    });
    
    expect(tokenData?.remember).toBe(true);
    // Längere Expiry-Zeit bei Remember Me
    const expiryDate = new Date(tokenData!.exp * 1000);
    const now = new Date();
    const daysDiff = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    expect(daysDiff).toBeGreaterThan(7); // Mindestens 7 Tage
  });

  test("Multi-Tab Token Synchronisation", async ({ browser }) => {
    const context = await browser.newContext();
    const page1 = await context.newPage();
    const page2 = await context.newPage();
    
    // In Tab 1 einloggen
    const loginPage1 = new LoginPage(page1);
    await loginPage1.goto();
    await loginPage1.login(testUsers.user.email, testUsers.user.password);
    
    // Tab 2 öffnen
    await page2.goto('/chat');
    
    // Tab 2 sollte auch eingeloggt sein
    await expect(page2).toHaveURL('/chat');
    await expect(page2.locator('.chat-container')).toBeVisible();
    
    // Logout in Tab 1
    await page1.click('button[aria-label="Logout"]');
    
    // Tab 2 neu laden
    await page2.reload();
    
    // Tab 2 sollte auch ausgeloggt sein
    await expect(page2).toHaveURL('/login');
    
    await context.close();
  });

  test("CSRF-Schutz mit JWT", async ({ page }) => {
    await loginPage.goto();
    await loginPage.login(testUsers.user.email, testUsers.user.password);
    
    // CSRF Token sollte gesetzt werden
    const csrfToken = await page.evaluate(() => {
      return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    });
    
    expect(csrfToken).toBeTruthy();
    
    // Bei POST-Requests sollte CSRF Token mitgesendet werden
    const postRequest = page.waitForRequest(request => 
      request.method() === 'POST' && request.url().includes('/api/')
    );
    
    // POST-Request auslösen
    await page.click('button:has-text("Neue Session")');
    
    const request = await postRequest;
    const headers = request.headers();
    
    // CSRF Token in Headers oder Body
    expect(
      headers['x-csrf-token'] || 
      request.postData()?.includes('csrf_token')
    ).toBeTruthy();
  });

  test("Admin-Rolle wird korrekt validiert", async ({ page }) => {
    // Als normaler User einloggen
    await loginPage.goto();
    await loginPage.login(testUsers.user.email, testUsers.user.password);
    
    // Versuche Admin-Bereich zu erreichen
    await page.goto('/admin');
    
    // Sollte Zugriff verweigert werden
    await expect(page.locator('.error-message')).toContainText('Keine Berechtigung');
    
    // Als Admin einloggen
    await page.click('button[aria-label="Logout"]');
    await loginPage.login(testUsers.admin.email, testUsers.admin.password);
    
    // Admin-Bereich sollte zugänglich sein
    await page.goto('/admin');
    await expect(page).toHaveURL('/admin');
    await expect(page.locator('.admin-panel')).toBeVisible();
  });
});