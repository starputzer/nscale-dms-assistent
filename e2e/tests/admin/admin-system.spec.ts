import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "../../fixtures/login-utils";

test.describe("Admin System Management", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/system");

    // Wait for system stats to load
    await page.waitForSelector(".admin-system__metrics");
  });

  test("should display system metrics", async ({ page }) => {
    // CPU usage should be visible
    await expect(
      page.locator('.admin-system__metric-card:has-text("CPU-Auslastung")'),
    ).toBeVisible();
    const cpuMeter = page.locator(
      '.admin-system__metric-card:has-text("CPU-Auslastung") .admin-system__meter-value',
    );
    const cpuValue = await cpuMeter.textContent();
    expect(cpuValue).toMatch(/\d+%/);

    // Memory usage should be visible
    await expect(
      page.locator('.admin-system__metric-card:has-text("Speicherauslastung")'),
    ).toBeVisible();
    const memoryMeter = page.locator(
      '.admin-system__metric-card:has-text("Speicherauslastung") .admin-system__meter-value',
    );
    const memoryValue = await memoryMeter.textContent();
    expect(memoryValue).toMatch(/\d+%/);

    // Disk usage should be visible
    await expect(
      page.locator('.admin-system__metric-card:has-text("Festplattennutzung")'),
    ).toBeVisible();
    const diskMeter = page.locator(
      '.admin-system__metric-card:has-text("Festplattennutzung") .admin-system__meter-value',
    );
    const diskValue = await diskMeter.textContent();
    expect(diskValue).toMatch(/\d+%/);
  });

  test("should show system health status", async ({ page }) => {
    const statusCard = page.locator(".admin-system__status-card");
    await expect(statusCard).toBeVisible();

    // Check status class
    const classes = await statusCard.getAttribute("class");
    expect(classes).toMatch(
      /admin-system__status-card--(normal|warning|critical)/,
    );

    // Status text should be visible
    const statusText = page.locator(".admin-system__status-value");
    const status = await statusText.textContent();
    expect(["Normal", "Warnung", "Kritisch"]).toContain(status);
  });

  test("should display system information", async ({ page }) => {
    // Click on system info section
    await page.click('button:text("Systeminformationen")');

    // System info should be visible
    await expect(page.locator(".system-info-section")).toBeVisible();

    // Check for required info fields
    await expect(page.locator('dt:text("Version")')).toBeVisible();
    await expect(page.locator('dt:text("Umgebung")')).toBeVisible();
    await expect(page.locator('dt:text("Node.js Version")')).toBeVisible();
    await expect(page.locator('dt:text("Betriebssystem")')).toBeVisible();
    await expect(page.locator('dt:text("Uptime")')).toBeVisible();
  });

  test("should handle system configuration", async ({ page }) => {
    // Click on configuration section
    await page.click('button:text("Konfiguration")');

    // Configuration form should be visible
    await expect(page.locator(".system-config-form")).toBeVisible();

    // Test changing a configuration value
    await page.fill('input[name="maxUploadSize"]', "50");
    await page.selectOption('select[name="logLevel"]', "debug");

    // Save configuration
    await page.click('button:text("Konfiguration speichern")');

    // Success message
    await expect(page.locator(".toast-success")).toContainText("gespeichert");
  });

  test("should validate configuration values", async ({ page }) => {
    await page.click('button:text("Konfiguration")');

    // Enter invalid value
    await page.fill('input[name="maxUploadSize"]', "-1");
    await page.click('button:text("Konfiguration speichern")');

    // Validation error
    await expect(
      page.locator('.error:text("muss positiv sein")'),
    ).toBeVisible();

    // Enter too large value
    await page.fill('input[name="maxUploadSize"]', "10000");
    await page.click('button:text("Konfiguration speichern")');

    // Validation error
    await expect(page.locator('.error:text("Maximaler Wert")')).toBeVisible();
  });

  test("should display active services", async ({ page }) => {
    // Click on services section
    await page.click('button:text("Dienste")');

    // Services list should be visible
    await expect(page.locator(".services-list")).toBeVisible();

    // Check for common services
    await expect(
      page.locator('.service-item:has-text("API Server")'),
    ).toBeVisible();
    await expect(
      page.locator('.service-item:has-text("Database")'),
    ).toBeVisible();
    await expect(page.locator('.service-item:has-text("Cache")')).toBeVisible();

    // Each service should show status
    const serviceStatuses = page.locator(".service-status");
    const count = await serviceStatuses.count();

    for (let i = 0; i < count; i++) {
      const status = await serviceStatuses.nth(i).textContent();
      expect(["Aktiv", "Inaktiv", "Fehler"]).toContain(status);
    }
  });

  test("should restart services", async ({ page }) => {
    await page.click('button:text("Dienste")');

    // Click restart on first service
    await page.click('.service-item:first-child button:text("Neustart")');

    // Confirmation dialog
    await expect(page.locator(".confirm-dialog")).toContainText(
      "Dienst neustarten",
    );

    // Confirm
    await page.click('button:text("Neustart bestätigen")');

    // Service should show restarting status
    const serviceStatus = page.locator(
      ".service-item:first-child .service-status",
    );
    await expect(serviceStatus).toContainText("Wird neu gestartet");

    // Eventually should be active again
    await expect(serviceStatus).toContainText("Aktiv", { timeout: 10000 });

    // Success message
    await expect(page.locator(".toast-success")).toContainText(
      "erfolgreich neu gestartet",
    );
  });

  test("should show system logs preview", async ({ page }) => {
    // Logs section should be visible
    await expect(page.locator(".system-logs-preview")).toBeVisible();

    // Recent logs should be displayed
    const logEntries = page.locator(".log-entry");
    const count = await logEntries.count();
    expect(count).toBeGreaterThan(0);

    // Each log entry should have timestamp and message
    const firstLog = logEntries.first();
    await expect(firstLog.locator(".log-timestamp")).toBeVisible();
    await expect(firstLog.locator(".log-message")).toBeVisible();
    await expect(firstLog.locator(".log-level")).toBeVisible();
  });

  test("should navigate to full logs view", async ({ page }) => {
    // Click on view all logs
    await page.click('a:text("Alle Logs anzeigen")');

    // Should navigate to logs tab
    await expect(page).toHaveURL(/.*\/admin.*logs/);
    await expect(page.locator('.tab-button:text("Logs")')).toHaveClass(
      /active/,
    );
  });

  test("should export system report", async ({ page }) => {
    // Click export report button
    const downloadPromise = page.waitForEvent("download");
    await page.click('button:text("Systembericht exportieren")');

    // Wait for download
    const download = await downloadPromise;

    // Verify download
    expect(download.suggestedFilename()).toMatch(/system-report.*\.(pdf|json)/);
  });

  test("should handle maintenance mode", async ({ page }) => {
    // Click on maintenance section
    await page.click('button:text("Wartung")');

    // Maintenance mode toggle should be visible
    await expect(page.locator('label:text("Wartungsmodus")')).toBeVisible();

    // Enable maintenance mode
    await page.click('input[name="maintenanceMode"]');

    // Confirmation dialog
    await expect(page.locator(".confirm-dialog")).toContainText(
      "Wartungsmodus aktivieren",
    );
    await expect(page.locator(".confirm-dialog")).toContainText(
      "Benutzer werden keinen Zugriff haben",
    );

    // Confirm
    await page.click('button:text("Aktivieren")');

    // Success message
    await expect(page.locator(".toast-success")).toContainText(
      "Wartungsmodus aktiviert",
    );

    // Warning banner should appear
    await expect(page.locator(".maintenance-warning")).toContainText(
      "System ist im Wartungsmodus",
    );
  });

  test("should schedule system backup", async ({ page }) => {
    await page.click('button:text("Backup")');

    // Backup form should be visible
    await expect(page.locator(".backup-form")).toBeVisible();

    // Select backup type
    await page.selectOption('select[name="backupType"]', "full");

    // Schedule backup
    await page.click('button:text("Backup jetzt starten")');

    // Progress indicator
    await expect(page.locator(".backup-progress")).toBeVisible();
    await expect(page.locator(".backup-progress")).toContainText(
      "Backup läuft",
    );

    // Success message (this might take a while)
    await expect(page.locator(".toast-success")).toContainText(
      "Backup erfolgreich",
      { timeout: 30000 },
    );
  });

  test("should display resource usage graphs", async ({ page }) => {
    // Click on graphs section
    await page.click('button:text("Ressourcen-Verlauf")');

    // Graphs should be visible
    await expect(page.locator(".resource-graphs")).toBeVisible();

    // CPU graph
    await expect(
      page.locator('.graph-container:has-text("CPU-Verlauf")'),
    ).toBeVisible();

    // Memory graph
    await expect(
      page.locator('.graph-container:has-text("Speicher-Verlauf")'),
    ).toBeVisible();

    // Time range selector
    await page.selectOption('select[name="timeRange"]', "7d");

    // Graphs should update
    await expect(page.locator(".graph-loading")).toBeVisible();
    await expect(page.locator(".graph-loading")).toBeHidden({ timeout: 5000 });
  });

  test("should handle system alerts", async ({ page }) => {
    // Check if any system alerts exist
    const alertsExist = await page.locator(".system-alerts").isVisible();

    if (alertsExist) {
      const alerts = page.locator(".alert-item");
      const count = await alerts.count();

      // Each alert should have severity and message
      for (let i = 0; i < count; i++) {
        const alert = alerts.nth(i);
        await expect(alert.locator(".alert-severity")).toBeVisible();
        await expect(alert.locator(".alert-message")).toBeVisible();

        // Check alert actions
        const dismissButton = alert.locator('button:text("Verwerfen")');
        if (await dismissButton.isVisible()) {
          await dismissButton.click();

          // Alert should be dismissed
          await expect(alert).toBeHidden();
        }
      }
    }
  });
});
