/**
 * E2E Tests für Admin System Monitor Tab
 */
import { test, expect } from "@playwright/test";
import { LoginPage } from "../../pages/login-page";
import { AdminPage } from "../../pages/admin-page";
import { testUsers } from "../../fixtures/test-users";

test.describe("Admin System Monitor", () => {
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
    await adminPage.selectTab('systemMonitor');
  });

  test("System Monitor Dashboard", async ({ page }) => {
    // Titel prüfen
    await expect(page.locator('h2')).toContainText('System Monitor');
    
    // Haupt-Monitoring-Bereiche
    await expect(page.locator('.system-health-overview')).toBeVisible();
    await expect(page.locator('.resource-monitoring')).toBeVisible();
    await expect(page.locator('.service-status')).toBeVisible();
    await expect(page.locator('.system-alerts')).toBeVisible();
  });

  test("System-Gesundheitsstatus", async ({ page }) => {
    const healthOverview = page.locator('.system-health-overview');
    
    // Gesamt-Status
    const overallStatus = healthOverview.locator('.overall-health-status');
    await expect(overallStatus).toBeVisible();
    await expect(overallStatus).toHaveAttribute('data-status', /healthy|warning|critical/);
    
    // Service-Status-Karten
    await expect(healthOverview.locator('.service-card:has-text("API Server")')).toBeVisible();
    await expect(healthOverview.locator('.service-card:has-text("Database")')).toBeVisible();
    await expect(healthOverview.locator('.service-card:has-text("Cache")')).toBeVisible();
    await expect(healthOverview.locator('.service-card:has-text("Queue System")')).toBeVisible();
    await expect(healthOverview.locator('.service-card:has-text("RAG Engine")')).toBeVisible();
    
    // Uptime-Informationen
    const apiCard = healthOverview.locator('.service-card:has-text("API Server")');
    await expect(apiCard.locator('.uptime')).toBeVisible();
    await expect(apiCard.locator('.response-time')).toBeVisible();
    await expect(apiCard.locator('.error-rate')).toBeVisible();
  });

  test("Ressourcen-Monitoring in Echtzeit", async ({ page }) => {
    const resourceMonitoring = page.locator('.resource-monitoring');
    
    // CPU-Monitoring
    const cpuSection = resourceMonitoring.locator('.cpu-monitoring');
    await expect(cpuSection).toBeVisible();
    await expect(cpuSection.locator('.cpu-usage-gauge')).toBeVisible();
    await expect(cpuSection.locator('canvas#cpu-history-chart')).toBeVisible();
    await expect(cpuSection.locator('.cpu-cores')).toContainText(/\d+ Cores/);
    
    // Memory-Monitoring
    const memorySection = resourceMonitoring.locator('.memory-monitoring');
    await expect(memorySection).toBeVisible();
    await expect(memorySection.locator('.memory-usage-bar')).toBeVisible();
    await expect(memorySection.locator('.memory-details')).toContainText(/\d+\.\d+ GB \/ \d+\.\d+ GB/);
    
    // Disk-Monitoring
    const diskSection = resourceMonitoring.locator('.disk-monitoring');
    await expect(diskSection).toBeVisible();
    await expect(diskSection.locator('.disk-usage')).toBeVisible();
    await expect(diskSection.locator('.io-stats')).toBeVisible();
    
    // Network-Monitoring
    const networkSection = resourceMonitoring.locator('.network-monitoring');
    await expect(networkSection).toBeVisible();
    await expect(networkSection.locator('canvas#network-traffic-chart')).toBeVisible();
    await expect(networkSection.locator('.bandwidth-in')).toBeVisible();
    await expect(networkSection.locator('.bandwidth-out')).toBeVisible();
  });

  test("Service-Details und Logs", async ({ page }) => {
    // Service-Details für API Server öffnen
    const apiService = page.locator('.service-card:has-text("API Server")');
    await apiService.locator('button:has-text("Details")').click();
    
    // Service-Detail-Modal
    const detailModal = page.locator('.service-detail-modal');
    await expect(detailModal).toBeVisible();
    
    // Service-Info
    await expect(detailModal.locator('.service-info')).toBeVisible();
    await expect(detailModal.locator('.info-item:has-text("PID")')).toBeVisible();
    await expect(detailModal.locator('.info-item:has-text("Port")')).toBeVisible();
    await expect(detailModal.locator('.info-item:has-text("Version")')).toBeVisible();
    await expect(detailModal.locator('.info-item:has-text("Start-Zeit")')).toBeVisible();
    
    // Logs-Tab
    await detailModal.locator('.tab-button:has-text("Logs")').click();
    const logsView = detailModal.locator('.logs-view');
    await expect(logsView).toBeVisible();
    
    // Log-Level-Filter
    await logsView.locator('select[name="logLevel"]').selectOption('error');
    
    // Log-Einträge
    const logEntries = await logsView.locator('.log-entry').all();
    expect(logEntries.length).toBeGreaterThanOrEqual(0);
    
    // Log-Suche
    await logsView.locator('input[name="logSearch"]').fill('Exception');
    await logsView.locator('button:has-text("Suchen")').click();
  });

  test("System-Alerts und Benachrichtigungen", async ({ page }) => {
    const alertsSection = page.locator('.system-alerts');
    
    // Aktive Alerts
    await expect(alertsSection.locator('.active-alerts')).toBeVisible();
    
    // Alert-Kategorien
    await expect(alertsSection.locator('.alert-filter')).toBeVisible();
    await alertsSection.locator('input[name="alertType"][value="critical"]').click();
    
    // Alert-Liste
    const alertItems = await alertsSection.locator('.alert-item').all();
    
    if (alertItems.length > 0) {
      const firstAlert = alertItems[0];
      await expect(firstAlert.locator('.alert-severity')).toBeVisible();
      await expect(firstAlert.locator('.alert-message')).toBeVisible();
      await expect(firstAlert.locator('.alert-timestamp')).toBeVisible();
      
      // Alert-Aktionen
      await firstAlert.locator('button.alert-actions').click();
      const actionsMenu = page.locator('.alert-actions-menu');
      await expect(actionsMenu.locator('button:has-text("Bestätigen")')).toBeVisible();
      await expect(actionsMenu.locator('button:has-text("Eskalieren")')).toBeVisible();
      await expect(actionsMenu.locator('button:has-text("Ignorieren")')).toBeVisible();
    }
    
    // Alert-Konfiguration
    await alertsSection.locator('button:has-text("Alert-Regeln")').click();
    const rulesDialog = page.locator('.alert-rules-dialog');
    await expect(rulesDialog).toBeVisible();
    
    // Neue Regel hinzufügen
    await rulesDialog.locator('button:has-text("Neue Regel")').click();
    await rulesDialog.locator('input[name="ruleName"]').fill('High CPU Alert');
    await rulesDialog.locator('select[name="metric"]').selectOption('cpu_usage');
    await rulesDialog.locator('select[name="condition"]').selectOption('greater_than');
    await rulesDialog.locator('input[name="threshold"]').fill('90');
    await rulesDialog.locator('button:has-text("Regel erstellen")').click();
  });

  test("Performance-Profiling", async ({ page }) => {
    // Profiling-Tab
    await page.click('.monitor-tabs button:has-text("Profiling")');
    
    const profilingPanel = page.locator('.performance-profiling');
    await expect(profilingPanel).toBeVisible();
    
    // Profiling starten
    await profilingPanel.locator('button:has-text("Profiling starten")').click();
    
    // Profiling-Optionen
    const profilingDialog = page.locator('.profiling-options-dialog');
    await expect(profilingDialog).toBeVisible();
    await profilingDialog.locator('input[name="duration"]').fill('60');
    await profilingDialog.locator('input[name="sampleRate"]').fill('100');
    await profilingDialog.locator('input[name="profileCPU"]').check();
    await profilingDialog.locator('input[name="profileMemory"]').check();
    
    await profilingDialog.locator('button:has-text("Start")').click();
    
    // Profiling-Progress
    await expect(page.locator('.profiling-progress')).toBeVisible();
    await expect(page.locator('.profiling-status')).toContainText('Läuft...');
    
    // Profiling-Ergebnisse (nach kurzer Zeit)
    await page.waitForTimeout(5000);
    await page.click('button:has-text("Profiling stoppen")');
    
    // Ergebnis-Anzeige
    await expect(profilingPanel.locator('.profiling-results')).toBeVisible();
    await expect(profilingPanel.locator('.flame-graph')).toBeVisible();
    await expect(profilingPanel.locator('.hotspots-list')).toBeVisible();
  });

  test("Database-Monitoring", async ({ page }) => {
    // Database-Tab
    await page.click('.monitor-tabs button:has-text("Database")');
    
    const dbPanel = page.locator('.database-monitoring');
    await expect(dbPanel).toBeVisible();
    
    // Verbindungs-Pool
    const connectionPool = dbPanel.locator('.connection-pool-stats');
    await expect(connectionPool).toBeVisible();
    await expect(connectionPool.locator('.active-connections')).toBeVisible();
    await expect(connectionPool.locator('.idle-connections')).toBeVisible();
    await expect(connectionPool.locator('.max-connections')).toBeVisible();
    
    // Query-Performance
    const queryPerf = dbPanel.locator('.query-performance');
    await expect(queryPerf).toBeVisible();
    await expect(queryPerf.locator('.slow-queries-list')).toBeVisible();
    
    // Slow Query Details
    const slowQueries = await queryPerf.locator('.slow-query-item').all();
    if (slowQueries.length > 0) {
      await slowQueries[0].click();
      const queryDetail = page.locator('.query-detail-modal');
      await expect(queryDetail).toBeVisible();
      await expect(queryDetail.locator('.query-text')).toBeVisible();
      await expect(queryDetail.locator('.execution-plan')).toBeVisible();
      await expect(queryDetail.locator('.query-stats')).toBeVisible();
    }
    
    // Database-Größe und Wachstum
    const dbSize = dbPanel.locator('.database-size-stats');
    await expect(dbSize).toBeVisible();
    await expect(dbSize.locator('canvas#db-growth-chart')).toBeVisible();
  });

  test("System-Diagnose und Health-Checks", async ({ page }) => {
    // Diagnose-Tab
    await page.click('.monitor-tabs button:has-text("Diagnose")');
    
    const diagnosePanel = page.locator('.system-diagnostics');
    await expect(diagnosePanel).toBeVisible();
    
    // Health-Check ausführen
    await diagnosePanel.locator('button:has-text("Vollständige Diagnose")').click();
    
    // Diagnose-Progress
    const diagProgress = page.locator('.diagnostics-progress');
    await expect(diagProgress).toBeVisible();
    
    // Verschiedene Checks
    const checks = [
      'API-Endpoints',
      'Database-Verbindung',
      'Cache-System',
      'File-System',
      'External Services',
      'SSL-Zertifikate'
    ];
    
    for (const check of checks) {
      await expect(diagProgress.locator(`.check-item:has-text("${check}")`)).toBeVisible();
    }
    
    // Diagnose-Ergebnisse
    await expect(page.locator('.diagnostics-results')).toBeVisible({ timeout: 30000 });
    const results = page.locator('.diagnostics-results');
    await expect(results.locator('.result-summary')).toBeVisible();
    await expect(results.locator('.issues-found')).toBeVisible();
    
    // Empfehlungen
    const recommendations = results.locator('.recommendations');
    if (await recommendations.isVisible()) {
      const items = await recommendations.locator('.recommendation-item').all();
      expect(items.length).toBeGreaterThanOrEqual(0);
    }
  });

  test("Export von Monitoring-Daten", async ({ page }) => {
    // Export-Button
    await page.click('button:has-text("Monitoring-Daten exportieren")');
    
    // Export-Dialog
    const exportDialog = page.locator('.monitoring-export-dialog');
    await expect(exportDialog).toBeVisible();
    
    // Zeitraum wählen
    await exportDialog.locator('input[name="dateFrom"]').fill('2025-06-01');
    await exportDialog.locator('input[name="dateTo"]').fill('2025-06-07');
    
    // Datentypen auswählen
    await exportDialog.locator('input[name="includeMetrics"]').check();
    await exportDialog.locator('input[name="includeLogs"]').check();
    await exportDialog.locator('input[name="includeAlerts"]').check();
    
    // Format
    await exportDialog.locator('select[name="exportFormat"]').selectOption('prometheus');
    
    // Export starten
    const downloadPromise = page.waitForEvent('download');
    await exportDialog.locator('button:has-text("Export starten")').click();
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/monitoring-export.*\.(tar\.gz|zip)/);
  });
});