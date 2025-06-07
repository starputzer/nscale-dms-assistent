/**
 * E2E Tests für Admin Background Processing Tab
 */
import { test, expect } from "@playwright/test";
import { LoginPage } from "../../pages/login-page";
import { AdminPage } from "../../pages/admin-page";
import { testUsers } from "../../fixtures/test-users";

test.describe("Admin Background Processing", () => {
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
    await adminPage.selectTab('backgroundProcessing');
  });

  test("Background Processing Übersicht", async ({ page }) => {
    // Titel prüfen
    await expect(page.locator('h2')).toContainText('Background Processing');
    
    // Haupt-Bereiche
    await expect(page.locator('.processing-overview')).toBeVisible();
    await expect(page.locator('.queue-stats')).toBeVisible();
    await expect(page.locator('.active-jobs')).toBeVisible();
    await expect(page.locator('.scheduled-tasks')).toBeVisible();
  });

  test("Queue-Status und Statistiken", async ({ page }) => {
    const queueStats = page.locator('.queue-stats');
    
    // Verschiedene Queues
    await expect(queueStats.locator('.queue-card:has-text("Document Processing")')).toBeVisible();
    await expect(queueStats.locator('.queue-card:has-text("Embedding Generation")')).toBeVisible();
    await expect(queueStats.locator('.queue-card:has-text("Index Updates")')).toBeVisible();
    await expect(queueStats.locator('.queue-card:has-text("Maintenance Tasks")')).toBeVisible();
    
    // Queue-Details prüfen
    const docQueue = queueStats.locator('.queue-card:has-text("Document Processing")');
    await expect(docQueue.locator('.queue-length')).toBeVisible();
    await expect(docQueue.locator('.processing-rate')).toBeVisible();
    await expect(docQueue.locator('.avg-time')).toBeVisible();
    await expect(docQueue.locator('.queue-health')).toBeVisible();
  });

  test("Aktive Jobs verwalten", async ({ page }) => {
    const activeJobs = page.locator('.active-jobs');
    
    // Jobs-Tabelle
    const jobsTable = activeJobs.locator('.jobs-table');
    await expect(jobsTable).toBeVisible();
    
    // Wenn aktive Jobs vorhanden
    const jobRows = await jobsTable.locator('tbody tr').all();
    if (jobRows.length > 0) {
      const firstJob = jobRows[0];
      
      // Job-Details prüfen
      await expect(firstJob.locator('.job-id')).toBeVisible();
      await expect(firstJob.locator('.job-type')).toBeVisible();
      await expect(firstJob.locator('.job-status')).toBeVisible();
      await expect(firstJob.locator('.job-progress')).toBeVisible();
      await expect(firstJob.locator('.job-started')).toBeVisible();
      
      // Job-Aktionen
      const actionsButton = firstJob.locator('button.job-actions');
      await actionsButton.click();
      
      const actionsMenu = page.locator('.job-actions-menu');
      await expect(actionsMenu).toBeVisible();
      await expect(actionsMenu.locator('button:has-text("Details")')).toBeVisible();
      await expect(actionsMenu.locator('button:has-text("Pausieren")')).toBeVisible();
      await expect(actionsMenu.locator('button:has-text("Abbrechen")')).toBeVisible();
      
      // Job-Details anzeigen
      await actionsMenu.locator('button:has-text("Details")').click();
      const jobDetailModal = page.locator('.job-detail-modal');
      await expect(jobDetailModal).toBeVisible();
      await expect(jobDetailModal.locator('.job-log')).toBeVisible();
    }
  });

  test("Neuen Background Job erstellen", async ({ page }) => {
    // Neuer Job Button
    await page.click('button:has-text("Neuer Job")');
    
    // Job-Erstellungsdialog
    const createDialog = page.locator('.create-job-dialog');
    await expect(createDialog).toBeVisible();
    
    // Job-Typ auswählen
    await createDialog.locator('select[name="jobType"]').selectOption('document-reindex');
    
    // Job-Parameter
    await createDialog.locator('input[name="priority"]').selectOption('normal');
    await createDialog.locator('input[name="batchSize"]').fill('50');
    
    // Zeitplanung
    await createDialog.locator('input[name="scheduleType"][value="once"]').click();
    await createDialog.locator('input[name="startTime"]').fill('2025-06-07T10:00');
    
    // Job erstellen
    await createDialog.locator('button:has-text("Job erstellen")').click();
    await expect(page.locator('.toast-success')).toContainText('Job erfolgreich erstellt');
    
    // Job sollte in der Liste erscheinen
    await expect(page.locator('.jobs-table tbody tr:has-text("document-reindex")')).toBeVisible();
  });

  test("Scheduled Tasks verwalten", async ({ page }) => {
    // Scheduled Tasks Bereich
    const scheduledTasks = page.locator('.scheduled-tasks');
    await expect(scheduledTasks).toBeVisible();
    
    // Cron-Jobs anzeigen
    await expect(scheduledTasks.locator('.task-item:has-text("Tägliches Backup")')).toBeVisible();
    await expect(scheduledTasks.locator('.task-item:has-text("Index-Optimierung")')).toBeVisible();
    await expect(scheduledTasks.locator('.task-item:has-text("Cache-Bereinigung")')).toBeVisible();
    
    // Task bearbeiten
    const backupTask = scheduledTasks.locator('.task-item:has-text("Tägliches Backup")');
    await backupTask.locator('button:has-text("Bearbeiten")').click();
    
    // Bearbeitungsdialog
    const editDialog = page.locator('.edit-task-dialog');
    await expect(editDialog).toBeVisible();
    
    // Cron-Expression ändern
    await editDialog.locator('input[name="cronExpression"]').fill('0 3 * * *'); // 3 Uhr morgens
    
    // Cron-Vorschau
    await expect(editDialog.locator('.cron-preview')).toContainText('Täglich um 03:00 Uhr');
    
    // Speichern
    await editDialog.locator('button:has-text("Speichern")').click();
    await expect(page.locator('.toast-success')).toContainText('Task aktualisiert');
  });

  test("Worker-Pool Management", async ({ page }) => {
    // Worker-Tab öffnen
    await page.click('.processing-tabs button:has-text("Worker")');
    
    const workerPanel = page.locator('.worker-management');
    await expect(workerPanel).toBeVisible();
    
    // Worker-Übersicht
    await expect(workerPanel.locator('.worker-pool-stats')).toBeVisible();
    await expect(workerPanel.locator('.stat:has-text("Aktive Worker")')).toBeVisible();
    await expect(workerPanel.locator('.stat:has-text("Idle Worker")')).toBeVisible();
    await expect(workerPanel.locator('.stat:has-text("CPU-Auslastung")')).toBeVisible();
    await expect(workerPanel.locator('.stat:has-text("Speicher")')).toBeVisible();
    
    // Worker-Liste
    const workerList = workerPanel.locator('.worker-list');
    await expect(workerList).toBeVisible();
    
    const workers = await workerList.locator('.worker-item').all();
    expect(workers.length).toBeGreaterThan(0);
    
    // Worker-Details
    if (workers.length > 0) {
      const firstWorker = workers[0];
      await expect(firstWorker.locator('.worker-id')).toBeVisible();
      await expect(firstWorker.locator('.worker-status')).toBeVisible();
      await expect(firstWorker.locator('.current-job')).toBeVisible();
      await expect(firstWorker.locator('.worker-metrics')).toBeVisible();
    }
    
    // Worker-Skalierung
    const scalingControl = workerPanel.locator('.worker-scaling');
    await expect(scalingControl).toBeVisible();
    
    // Worker hinzufügen
    await scalingControl.locator('button:has-text("+")').click();
    await expect(page.locator('.toast-info')).toContainText('Neuer Worker wird gestartet');
  });

  test("Failed Jobs und Retry-Mechanismus", async ({ page }) => {
    // Failed Jobs Tab
    await page.click('.processing-tabs button:has-text("Fehlgeschlagen")');
    
    const failedJobsPanel = page.locator('.failed-jobs-panel');
    await expect(failedJobsPanel).toBeVisible();
    
    // Failed Jobs Liste
    const failedJobs = await failedJobsPanel.locator('.failed-job-item').all();
    
    if (failedJobs.length > 0) {
      const firstFailedJob = failedJobs[0];
      
      // Fehlerdetails anzeigen
      await firstFailedJob.click();
      const errorDetails = firstFailedJob.locator('.error-details');
      await expect(errorDetails).toBeVisible();
      await expect(errorDetails.locator('.error-message')).toBeVisible();
      await expect(errorDetails.locator('.stack-trace')).toBeVisible();
      await expect(errorDetails.locator('.retry-count')).toBeVisible();
      
      // Retry-Optionen
      const retryButton = firstFailedJob.locator('button:has-text("Erneut versuchen")');
      await retryButton.click();
      
      // Retry-Dialog
      const retryDialog = page.locator('.retry-dialog');
      await expect(retryDialog).toBeVisible();
      
      // Retry-Strategie wählen
      await retryDialog.locator('select[name="retryStrategy"]').selectOption('exponential-backoff');
      await retryDialog.locator('input[name="maxRetries"]').fill('3');
      
      // Retry starten
      await retryDialog.locator('button:has-text("Retry starten")').click();
      await expect(page.locator('.toast-info')).toContainText('Job wird erneut versucht');
    }
  });

  test("Performance-Monitoring und Metriken", async ({ page }) => {
    // Performance Tab
    await page.click('.processing-tabs button:has-text("Performance")');
    
    const performancePanel = page.locator('.performance-monitoring');
    await expect(performancePanel).toBeVisible();
    
    // Echtzeit-Metriken
    await expect(performancePanel.locator('.realtime-metrics')).toBeVisible();
    await expect(performancePanel.locator('canvas#throughput-chart')).toBeVisible();
    await expect(performancePanel.locator('canvas#latency-chart')).toBeVisible();
    await expect(performancePanel.locator('canvas#queue-depth-chart')).toBeVisible();
    
    // Performance-Alerts
    const alertsSection = performancePanel.locator('.performance-alerts');
    await expect(alertsSection).toBeVisible();
    
    // Alert-Konfiguration
    await alertsSection.locator('button:has-text("Alert konfigurieren")').click();
    const alertDialog = page.locator('.alert-config-dialog');
    await expect(alertDialog).toBeVisible();
    
    // Alert für hohe Queue-Länge
    await alertDialog.locator('input[name="alertType"][value="queue-length"]').click();
    await alertDialog.locator('input[name="threshold"]').fill('1000');
    await alertDialog.locator('select[name="action"]').selectOption('email');
    await alertDialog.locator('input[name="recipients"]').fill('admin@example.com');
    
    // Alert speichern
    await alertDialog.locator('button:has-text("Alert erstellen")').click();
    await expect(page.locator('.toast-success')).toContainText('Performance-Alert erstellt');
  });

  test("Bulk-Operationen und Batch-Processing", async ({ page }) => {
    // Batch Operations Tab
    await page.click('.processing-tabs button:has-text("Batch")');
    
    const batchPanel = page.locator('.batch-operations');
    await expect(batchPanel).toBeVisible();
    
    // Neue Batch-Operation
    await batchPanel.locator('button:has-text("Neue Batch-Operation")').click();
    
    const batchDialog = page.locator('.batch-operation-dialog');
    await expect(batchDialog).toBeVisible();
    
    // Operation konfigurieren
    await batchDialog.locator('select[name="operationType"]').selectOption('reindex-documents');
    await batchDialog.locator('input[name="documentFilter"]').fill('*.pdf');
    await batchDialog.locator('input[name="batchSize"]').fill('100');
    await batchDialog.locator('input[name="parallelism"]').fill('4');
    
    // Zeitplanung
    await batchDialog.locator('input[name="startImmediately"]').uncheck();
    await batchDialog.locator('input[name="scheduledStart"]').fill('2025-06-07T22:00');
    
    // Batch erstellen
    await batchDialog.locator('button:has-text("Batch-Operation erstellen")').click();
    await expect(page.locator('.toast-success')).toContainText('Batch-Operation geplant');
    
    // Operation sollte in der Liste erscheinen
    await expect(batchPanel.locator('.batch-operations-list')).toContainText('reindex-documents');
  });
});