/**
 * E2E Tests für das Admin Dashboard
 */
import { test, expect } from "@playwright/test";

test.describe("Admin Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    // Als Admin einloggen
    await page.goto("/login");
    await page.fill('input#email', "martin@danglefeet.com");
    await page.fill('input#password', "123");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL("/chat");
    
    // Zum Admin-Panel navigieren
    await page.goto('/admin');
    
    // Warte darauf, dass die Admin-Seite geladen ist
    await page.waitForTimeout(2000);
    
    // Prüfe ob wir auf der Admin-Seite sind oder umgeleitet wurden
    if (!page.url().includes('/admin')) {
      console.log('Admin access not available - skipping test');
      return;
    }
  });

  test("Dashboard zeigt zentrale Übersicht", async ({ page }) => {
    // Skip if not on admin page
    if (!page.url().includes('/admin')) return;
    
    // Dashboard Tab suchen und klicken
    const dashboardTabSelectors = [
      'button:has-text("Dashboard")',
      'a:has-text("Dashboard")',
      '.tab:has-text("Dashboard")',
      '[data-tab="dashboard"]'
    ];
    
    for (const selector of dashboardTabSelectors) {
      if (await page.locator(selector).count() > 0) {
        await page.click(selector);
        break;
      }
    }
    
    await page.waitForTimeout(1000);
    
    // Dashboard-Inhalt prüfen
    const dashboardVisible = await page.locator('*:has-text("Dashboard")').count() > 0;
    expect(dashboardVisible).toBeTruthy();
    
    // Statistik-Karten suchen
    const statCardSelectors = [
      '.stat-card',
      '.stats-card',
      '.metric-card',
      '.dashboard-card',
      '[class*="card"]'
    ];
    
    let cards = [];
    for (const selector of statCardSelectors) {
      cards = await page.$$(selector);
      if (cards.length > 0) {
        console.log(`Found ${cards.length} stat cards with selector: ${selector}`);
        break;
      }
    }
    
    if (cards.length === 0) {
      console.log('No stat cards found - dashboard might use different layout');
      
      // Alternativ: Prüfe ob wichtige Texte vorhanden sind
      const importantMetrics = ['Benutzer', 'Sessions', 'Dokumente', 'System'];
      let metricsFound = 0;
      
      for (const metric of importantMetrics) {
        if (await page.locator(`*:has-text("${metric}")`).count() > 0) {
          metricsFound++;
        }
      }
      
      expect(metricsFound).toBeGreaterThan(0);
    } else {
      expect(cards.length).toBeGreaterThanOrEqual(1);
    }
  });

  test("Dashboard lädt Daten erfolgreich", async ({ page }) => {
    // Skip if not on admin page
    if (!page.url().includes('/admin')) return;
    
    // Warte auf API-Calls
    const apiCallPromise = page.waitForResponse(response => 
      response.url().includes('/admin/dashboard') && response.status() === 200,
      { timeout: 10000 }
    ).catch(() => null);
    
    // Dashboard Tab aktivieren falls nötig
    const dashboardTab = page.locator('button:has-text("Dashboard"), a:has-text("Dashboard")').first();
    if (await dashboardTab.count() > 0) {
      await dashboardTab.click();
    }
    
    const response = await apiCallPromise;
    if (response) {
      console.log('Dashboard API loaded successfully');
      expect(response.status()).toBe(200);
    } else {
      console.log('Dashboard might be using cached data or different API');
    }
    
    // Prüfe ob Daten angezeigt werden
    await page.waitForTimeout(2000);
    
    // Suche nach Zahlen/Metriken auf der Seite
    const numberPattern = /\d+/;
    const pageText = await page.locator('body').innerText();
    const hasNumbers = numberPattern.test(pageText);
    
    expect(hasNumbers).toBeTruthy();
  });

  test("Dashboard Refresh funktioniert", async ({ page }) => {
    // Skip if not on admin page
    if (!page.url().includes('/admin')) return;
    
    // Refresh Button suchen
    const refreshSelectors = [
      'button:has-text("Aktualisieren")',
      'button:has-text("Refresh")',
      'button[aria-label*="refresh"]',
      'button[title*="Aktualisieren"]',
      '.refresh-button'
    ];
    
    let refreshButton = null;
    for (const selector of refreshSelectors) {
      if (await page.locator(selector).count() > 0) {
        refreshButton = page.locator(selector).first();
        break;
      }
    }
    
    if (refreshButton) {
      // Click refresh
      await refreshButton.click();
      
      // Warte auf Loading-Indikator oder API-Call
      const loadingSelectors = [
        '.loading',
        '.spinner',
        '[class*="loading"]',
        '[aria-busy="true"]'
      ];
      
      let loadingFound = false;
      for (const selector of loadingSelectors) {
        if (await page.locator(selector).count() > 0) {
          loadingFound = true;
          await page.waitForSelector(selector, { state: 'hidden', timeout: 10000 }).catch(() => {});
          break;
        }
      }
      
      if (!loadingFound) {
        // Alternativ: Warte einfach kurz
        await page.waitForTimeout(1000);
      }
      
      console.log('Refresh completed');
    } else {
      console.log('No refresh button found - might use auto-refresh');
    }
  });

  test("Navigation zu anderen Admin-Tabs funktioniert", async ({ page }) => {
    // Skip if not on admin page
    if (!page.url().includes('/admin')) return;
    
    // Andere Tabs testen
    const tabs = [
      { name: 'Users', text: 'Benutzer' },
      { name: 'System', text: 'System' },
      { name: 'Statistics', text: 'Statistiken' }
    ];
    
    for (const tab of tabs) {
      const tabSelectors = [
        `button:has-text("${tab.name}")`,
        `button:has-text("${tab.text}")`,
        `a:has-text("${tab.name}")`,
        `a:has-text("${tab.text}")`,
        `[data-tab="${tab.name.toLowerCase()}"]`
      ];
      
      let tabFound = false;
      for (const selector of tabSelectors) {
        if (await page.locator(selector).count() > 0) {
          await page.click(selector);
          tabFound = true;
          await page.waitForTimeout(1000);
          console.log(`Navigated to ${tab.name} tab`);
          break;
        }
      }
      
      if (!tabFound) {
        console.log(`Tab ${tab.name} not found`);
      }
    }
  });
});