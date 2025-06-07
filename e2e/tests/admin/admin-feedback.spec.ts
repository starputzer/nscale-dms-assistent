/**
 * E2E Tests für das Admin Feedback Management
 */
import { test, expect } from "@playwright/test";
import { LoginPage } from "../../pages/login-page";
import { AdminPage } from "../../pages/admin-page";
import { testUsers } from "../../fixtures/test-users";

test.describe("Admin Feedback Management", () => {
  let loginPage: LoginPage;
  let adminPage: AdminPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    adminPage = new AdminPage(page);

    // Als Admin einloggen
    await loginPage.goto();
    await loginPage.login(testUsers.admin.email, testUsers.admin.password);
    
    // Zum Admin-Panel navigieren
    await page.goto('/admin');
    await adminPage.selectTab('feedback');
  });

  test("Feedback-Übersicht zeigt Statistiken", async ({ page }) => {
    // Titel prüfen
    await expect(page.locator('h2')).toContainText('Feedback-Verwaltung');
    
    // Statistik-Karten
    const stats = page.locator('.feedback-stats');
    await expect(stats).toBeVisible();
    
    await expect(stats.locator('.stat-card:has-text("Gesamt-Feedback")')).toBeVisible();
    await expect(stats.locator('.stat-card:has-text("Positiv")')).toBeVisible();
    await expect(stats.locator('.stat-card:has-text("Negativ")')).toBeVisible();
    await expect(stats.locator('.stat-card:has-text("Diese Woche")')).toBeVisible();
  });

  test("Feedback-Liste mit Filteroptionen", async ({ page }) => {
    // Filter-Bereich
    const filters = page.locator('.feedback-filters');
    await expect(filters).toBeVisible();
    
    // Filter-Optionen
    await expect(filters.locator('select[name="type"]')).toBeVisible();
    await expect(filters.locator('input[type="date"][name="from"]')).toBeVisible();
    await expect(filters.locator('input[type="date"][name="to"]')).toBeVisible();
    
    // Nach negativem Feedback filtern
    await filters.locator('select[name="type"]').selectOption('negative');
    await page.waitForLoadState('networkidle');
    
    // Nur negatives Feedback sollte angezeigt werden
    const feedbackItems = await page.$$('.feedback-item');
    for (const item of feedbackItems) {
      const icon = await item.$('.feedback-type-icon.negative');
      expect(icon).toBeTruthy();
    }
  });

  test("Feedback-Details anzeigen", async ({ page }) => {
    // Auf erstes Feedback-Element klicken
    const firstFeedback = page.locator('.feedback-item').first();
    await firstFeedback.click();
    
    // Detail-Modal sollte erscheinen
    const modal = page.locator('.feedback-detail-modal');
    await expect(modal).toBeVisible();
    
    // Details prüfen
    await expect(modal.locator('.feedback-question')).toBeVisible();
    await expect(modal.locator('.feedback-answer')).toBeVisible();
    await expect(modal.locator('.feedback-type')).toBeVisible();
    await expect(modal.locator('.feedback-timestamp')).toBeVisible();
    await expect(modal.locator('.feedback-user')).toBeVisible();
    
    // Kommentar-Feld (falls vorhanden)
    const comment = modal.locator('.feedback-comment');
    if (await comment.isVisible()) {
      const commentText = await comment.textContent();
      expect(commentText).toBeTruthy();
    }
  });

  test("Feedback-Status aktualisieren", async ({ page }) => {
    // Erstes unbearbeitetes Feedback finden
    const pendingFeedback = page.locator('.feedback-item[data-status="pending"]').first();
    
    if (await pendingFeedback.isVisible()) {
      // Status-Dropdown öffnen
      await pendingFeedback.locator('.status-dropdown').click();
      
      // Status auf "Bearbeitet" setzen
      await page.click('.status-option:has-text("Bearbeitet")');
      
      // Bestätigung abwarten
      await expect(page.locator('.toast-success')).toBeVisible();
      
      // Status sollte aktualisiert sein
      await expect(pendingFeedback).toHaveAttribute('data-status', 'processed');
    }
  });

  test("Feedback exportieren", async ({ page }) => {
    // Export-Button
    const exportButton = page.locator('button:has-text("Feedback exportieren")');
    await expect(exportButton).toBeVisible();
    
    // Download vorbereiten
    const downloadPromise = page.waitForEvent('download');
    
    await exportButton.click();
    
    // Export-Optionen
    await expect(page.locator('.export-options')).toBeVisible();
    await page.click('button:has-text("Als CSV exportieren")');
    
    // Download prüfen
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/feedback.*\.csv/);
  });

  test("Bulk-Aktionen für mehrere Feedbacks", async ({ page }) => {
    // Mehrere Feedbacks auswählen
    const checkboxes = await page.$$('.feedback-item input[type="checkbox"]');
    
    if (checkboxes.length >= 2) {
      await checkboxes[0].click();
      await checkboxes[1].click();
      
      // Bulk-Actions-Bar sollte erscheinen
      const bulkActions = page.locator('.bulk-actions-bar');
      await expect(bulkActions).toBeVisible();
      await expect(bulkActions.locator('.selected-count')).toContainText('2 ausgewählt');
      
      // Bulk-Aktion ausführen
      await bulkActions.locator('button:has-text("Als bearbeitet markieren")').click();
      
      // Bestätigungsdialog
      await page.click('.confirm-dialog button:has-text("Bestätigen")');
      
      // Erfolgsbestätigung
      await expect(page.locator('.toast-success')).toContainText('2 Feedbacks aktualisiert');
    }
  });

  test("Feedback-Trends Visualisierung", async ({ page }) => {
    // Trends-Tab aktivieren
    await page.click('.feedback-tabs button:has-text("Trends")');
    
    // Chart-Container sollte sichtbar sein
    const chartContainer = page.locator('.feedback-trends-chart');
    await expect(chartContainer).toBeVisible();
    
    // Canvas für Chart
    await expect(chartContainer.locator('canvas')).toBeVisible();
    
    // Zeitraum-Selector
    const periodSelector = page.locator('.trend-period-selector');
    await expect(periodSelector).toBeVisible();
    
    // Verschiedene Zeiträume testen
    await periodSelector.locator('button:has-text("Letzte 7 Tage")').click();
    await page.waitForTimeout(500); // Chart-Update abwarten
    
    await periodSelector.locator('button:has-text("Letzter Monat")').click();
    await page.waitForTimeout(500);
  });
});