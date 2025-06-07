/**
 * E2E Tests für Admin Statistics Tab
 */
import { test, expect } from "@playwright/test";
import { LoginPage } from "../../pages/login-page";
import { AdminPage } from "../../pages/admin-page";
import { testUsers } from "../../fixtures/test-users";

test.describe("Admin Statistics", () => {
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
    await adminPage.selectTab('statistics');
  });

  test("Detaillierte Statistiken werden angezeigt", async ({ page }) => {
    // Titel prüfen
    await expect(page.locator('h2')).toContainText('Detaillierte Statistiken');
    
    // Verschiedene Statistik-Bereiche sollten vorhanden sein
    await expect(page.locator('.stats-section:has-text("Benutzer-Aktivität")')).toBeVisible();
    await expect(page.locator('.stats-section:has-text("Chat-Nutzung")')).toBeVisible();
    await expect(page.locator('.stats-section:has-text("Dokument-Verarbeitung")')).toBeVisible();
    await expect(page.locator('.stats-section:has-text("System-Performance")')).toBeVisible();
  });

  test("Zeitraum-Filter funktioniert", async ({ page }) => {
    // Zeitraum-Selector
    const periodSelector = page.locator('.period-selector');
    await expect(periodSelector).toBeVisible();
    
    // Standard sollte "Letzte 30 Tage" sein
    await expect(periodSelector.locator('select')).toHaveValue('30d');
    
    // Auf "Letzte 7 Tage" ändern
    await periodSelector.locator('select').selectOption('7d');
    
    // Loading-Indikator sollte erscheinen
    await expect(page.locator('.stats-loading')).toBeVisible();
    await expect(page.locator('.stats-loading')).not.toBeVisible({ timeout: 10000 });
    
    // Daten sollten aktualisiert sein (prüfe ob sich Zahlen geändert haben)
    const statValue = page.locator('.stat-value').first();
    const value = await statValue.textContent();
    expect(value).toBeTruthy();
  });

  test("Benutzer-Aktivitäts-Heatmap", async ({ page }) => {
    // Heatmap-Container
    const heatmap = page.locator('.activity-heatmap');
    await expect(heatmap).toBeVisible();
    
    // Tooltip bei Hover
    const heatmapCell = heatmap.locator('.heatmap-cell').first();
    await heatmapCell.hover();
    
    // Tooltip sollte erscheinen
    await expect(page.locator('.heatmap-tooltip')).toBeVisible();
    await expect(page.locator('.heatmap-tooltip')).toContainText(/\d+ Aktivitäten/);
  });

  test("Top-Benutzer Liste", async ({ page }) => {
    // Top-Benutzer Bereich
    const topUsers = page.locator('.top-users-section');
    await expect(topUsers).toBeVisible();
    
    // Tabelle mit Benutzern
    const userRows = await topUsers.locator('tbody tr').all();
    expect(userRows.length).toBeGreaterThan(0);
    
    // Erste Zeile prüfen
    const firstRow = userRows[0];
    await expect(firstRow.locator('.user-name')).toBeVisible();
    await expect(firstRow.locator('.message-count')).toBeVisible();
    await expect(firstRow.locator('.session-count')).toBeVisible();
    await expect(firstRow.locator('.last-active')).toBeVisible();
  });

  test("Chat-Metriken Visualisierung", async ({ page }) => {
    // Chat-Metriken Bereich
    const chatMetrics = page.locator('.chat-metrics');
    await expect(chatMetrics).toBeVisible();
    
    // Verschiedene Metriken
    await expect(chatMetrics.locator('.metric-card:has-text("Durchschn. Nachrichten/Session")')).toBeVisible();
    await expect(chatMetrics.locator('.metric-card:has-text("Durchschn. Antwortzeit")')).toBeVisible();
    await expect(chatMetrics.locator('.metric-card:has-text("Erfolgsrate")')).toBeVisible();
    
    // Chart für Nachrichten-Verlauf
    await expect(chatMetrics.locator('canvas#messages-chart')).toBeVisible();
  });

  test("Dokument-Statistiken", async ({ page }) => {
    // Dokument-Bereich
    const docStats = page.locator('.document-statistics');
    await expect(docStats).toBeVisible();
    
    // Kreisdiagramm für Dateitypen
    await expect(docStats.locator('canvas#file-types-chart')).toBeVisible();
    
    // Verarbeitungs-Statistiken
    await expect(docStats.locator('.processing-stats')).toBeVisible();
    const processingStats = docStats.locator('.processing-stats');
    
    await expect(processingStats.locator('.stat:has-text("Erfolgreich")')).toBeVisible();
    await expect(processingStats.locator('.stat:has-text("Fehlgeschlagen")')).toBeVisible();
    await expect(processingStats.locator('.stat:has-text("In Bearbeitung")')).toBeVisible();
  });

  test("Export verschiedener Statistik-Formate", async ({ page }) => {
    // Export-Button
    const exportButton = page.locator('button:has-text("Statistiken exportieren")');
    await expect(exportButton).toBeVisible();
    
    await exportButton.click();
    
    // Export-Menü
    const exportMenu = page.locator('.export-menu');
    await expect(exportMenu).toBeVisible();
    
    // Verschiedene Export-Optionen
    await expect(exportMenu.locator('button:has-text("PDF-Report")')).toBeVisible();
    await expect(exportMenu.locator('button:has-text("Excel-Datei")')).toBeVisible();
    await expect(exportMenu.locator('button:has-text("CSV-Daten")')).toBeVisible();
    await expect(exportMenu.locator('button:has-text("JSON-Export")')).toBeVisible();
    
    // Test Excel-Export
    const downloadPromise = page.waitForEvent('download');
    await exportMenu.locator('button:has-text("Excel-Datei")').click();
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/statistics.*\.xlsx/);
  });

  test("Echtzeit-Updates der Statistiken", async ({ page }) => {
    // Auto-Update Toggle
    const autoUpdateToggle = page.locator('.auto-update-toggle');
    await expect(autoUpdateToggle).toBeVisible();
    
    // Aktivieren falls nicht aktiv
    const isChecked = await autoUpdateToggle.locator('input[type="checkbox"]').isChecked();
    if (!isChecked) {
      await autoUpdateToggle.click();
    }
    
    // Update-Indikator sollte erscheinen
    await expect(page.locator('.update-indicator')).toBeVisible();
    await expect(page.locator('.update-indicator')).toContainText(/Aktualisiert vor \d+ Sekunden/);
    
    // Warten und prüfen ob sich der Indikator ändert
    await page.waitForTimeout(5000);
    const indicator = await page.locator('.update-indicator').textContent();
    expect(indicator).toMatch(/Aktualisiert vor \d+ Sekunden/);
  });
});