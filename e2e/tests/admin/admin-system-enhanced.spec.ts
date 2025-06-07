/**
 * E2E Tests für Admin System Enhanced Tab
 */
import { test, expect } from "@playwright/test";
import { LoginPage } from "../../pages/login-page";
import { AdminPage } from "../../pages/admin-page";
import { testUsers } from "../../fixtures/test-users";

test.describe("Admin System Enhanced", () => {
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
    await adminPage.selectTab('systemEnhanced');
  });

  test("Enhanced System Dashboard", async ({ page }) => {
    // Titel prüfen
    await expect(page.locator('h2')).toContainText('System Enhanced');
    
    // Erweiterte System-Bereiche
    await expect(page.locator('.system-architecture')).toBeVisible();
    await expect(page.locator('.microservices-status')).toBeVisible();
    await expect(page.locator('.distributed-cache')).toBeVisible();
    await expect(page.locator('.system-optimization')).toBeVisible();
  });

  test("System-Architektur Visualisierung", async ({ page }) => {
    const architecture = page.locator('.system-architecture');
    
    // Interaktive Architektur-Map
    await expect(architecture.locator('.architecture-diagram')).toBeVisible();
    await expect(architecture.locator('svg.system-map')).toBeVisible();
    
    // Service-Nodes
    const serviceNodes = await architecture.locator('.service-node').all();
    expect(serviceNodes.length).toBeGreaterThan(5);
    
    // Service-Details beim Hover
    await serviceNodes[0].hover();
    const tooltip = page.locator('.service-tooltip');
    await expect(tooltip).toBeVisible();
    await expect(tooltip.locator('.service-name')).toBeVisible();
    await expect(tooltip.locator('.service-health')).toBeVisible();
    await expect(tooltip.locator('.service-metrics')).toBeVisible();
    
    // Dependency-Visualisierung
    await architecture.locator('button:has-text("Dependencies anzeigen")').click();
    await expect(architecture.locator('.dependency-lines')).toBeVisible();
    
    // Traffic-Flow Animation
    await architecture.locator('button:has-text("Traffic-Flow")').click();
    await expect(architecture.locator('.traffic-animation')).toBeVisible();
  });

  test("Microservices Management", async ({ page }) => {
    const microservices = page.locator('.microservices-status');
    
    // Service-Grid
    const serviceGrid = microservices.locator('.service-grid');
    await expect(serviceGrid).toBeVisible();
    
    // Service-Karten
    const services = [
      'API Gateway',
      'Auth Service',
      'Document Service',
      'RAG Service',
      'Notification Service',
      'Analytics Service'
    ];
    
    for (const service of services) {
      const serviceCard = serviceGrid.locator(`.service-card:has-text("${service}")`);
      await expect(serviceCard).toBeVisible();
      await expect(serviceCard.locator('.service-status')).toBeVisible();
      await expect(serviceCard.locator('.service-version')).toBeVisible();
      await expect(serviceCard.locator('.service-instances')).toBeVisible();
    }
    
    // Service-Skalierung
    const ragService = serviceGrid.locator('.service-card:has-text("RAG Service")');
    await ragService.locator('button.scale-control').click();
    
    const scaleDialog = page.locator('.service-scaling-dialog');
    await expect(scaleDialog).toBeVisible();
    
    // Aktuelle Instanzen
    const currentInstances = await scaleDialog.locator('.current-instances').textContent();
    const instanceCount = parseInt(currentInstances || '1');
    
    // Skalierung anpassen
    await scaleDialog.locator('input[name="targetInstances"]').fill(String(instanceCount + 2));
    await scaleDialog.locator('select[name="scalingStrategy"]').selectOption('rolling');
    await scaleDialog.locator('button:has-text("Skalieren")').click();
    
    // Skalierungs-Progress
    await expect(page.locator('.scaling-progress')).toBeVisible();
    await expect(page.locator('.toast-success')).toContainText('Service erfolgreich skaliert');
  });

  test("Distributed Cache Management", async ({ page }) => {
    const cacheSection = page.locator('.distributed-cache');
    
    // Cache-Cluster Übersicht
    await expect(cacheSection.locator('.cache-cluster-view')).toBeVisible();
    
    // Cache-Nodes
    const cacheNodes = await cacheSection.locator('.cache-node').all();
    expect(cacheNodes.length).toBeGreaterThanOrEqual(3);
    
    // Cache-Statistiken
    await expect(cacheSection.locator('.cache-stats')).toBeVisible();
    await expect(cacheSection.locator('.stat:has-text("Hit Rate")')).toBeVisible();
    await expect(cacheSection.locator('.stat:has-text("Memory Usage")')).toBeVisible();
    await expect(cacheSection.locator('.stat:has-text("Eviction Rate")')).toBeVisible();
    await expect(cacheSection.locator('.stat:has-text("Keys")')).toBeVisible();
    
    // Cache-Invalidierung
    await cacheSection.locator('button:has-text("Cache verwalten")').click();
    const cacheManagement = page.locator('.cache-management-panel');
    await expect(cacheManagement).toBeVisible();
    
    // Pattern-basierte Invalidierung
    await cacheManagement.locator('input[name="invalidatePattern"]').fill('user:*');
    await cacheManagement.locator('button:has-text("Pattern invalidieren")').click();
    await expect(page.locator('.toast-info')).toContainText('Cache-Einträge invalidiert');
    
    // Cache-Warming
    await cacheManagement.locator('.tab-button:has-text("Warming")').click();
    await cacheManagement.locator('button:has-text("Critical Data vorwärmen")').click();
    await expect(page.locator('.warming-progress')).toBeVisible();
  });

  test("System-Optimierung und Auto-Tuning", async ({ page }) => {
    const optimization = page.locator('.system-optimization');
    
    // Optimierungs-Dashboard
    await expect(optimization.locator('.optimization-score')).toBeVisible();
    await expect(optimization.locator('.optimization-recommendations')).toBeVisible();
    
    // Performance-Analyse
    await optimization.locator('button:has-text("System analysieren")').click();
    
    // Analyse-Progress
    const analysisProgress = page.locator('.system-analysis-progress');
    await expect(analysisProgress).toBeVisible();
    
    const analysisSteps = [
      'Resource-Auslastung',
      'Query-Performance',
      'Cache-Effizienz',
      'Service-Latenz',
      'Memory-Leaks'
    ];
    
    for (const step of analysisSteps) {
      await expect(analysisProgress.locator(`.analysis-step:has-text("${step}")`)).toBeVisible();
    }
    
    // Optimierungs-Empfehlungen
    await expect(page.locator('.optimization-results')).toBeVisible({ timeout: 30000 });
    const recommendations = page.locator('.recommendation-list');
    const recommendationItems = await recommendations.locator('.recommendation-item').all();
    expect(recommendationItems.length).toBeGreaterThan(0);
    
    // Auto-Tuning aktivieren
    await optimization.locator('button:has-text("Auto-Tuning aktivieren")').click();
    const autoTuningDialog = page.locator('.auto-tuning-dialog');
    await expect(autoTuningDialog).toBeVisible();
    
    await autoTuningDialog.locator('input[name="enableCPUOptimization"]').check();
    await autoTuningDialog.locator('input[name="enableMemoryOptimization"]').check();
    await autoTuningDialog.locator('input[name="enableQueryOptimization"]').check();
    await autoTuningDialog.locator('select[name="aggressiveness"]').selectOption('moderate');
    
    await autoTuningDialog.locator('button:has-text("Aktivieren")').click();
    await expect(page.locator('.toast-success')).toContainText('Auto-Tuning aktiviert');
  });

  test("Advanced Security Management", async ({ page }) => {
    // Security-Tab
    await page.click('.system-tabs button:has-text("Security")');
    
    const securityPanel = page.locator('.advanced-security');
    await expect(securityPanel).toBeVisible();
    
    // Security-Score
    await expect(securityPanel.locator('.security-score-gauge')).toBeVisible();
    await expect(securityPanel.locator('.security-status')).toBeVisible();
    
    // Threat Detection
    const threatDetection = securityPanel.locator('.threat-detection');
    await expect(threatDetection).toBeVisible();
    await expect(threatDetection.locator('.active-threats')).toBeVisible();
    await expect(threatDetection.locator('.threat-timeline')).toBeVisible();
    
    // Security-Audit durchführen
    await securityPanel.locator('button:has-text("Security Audit")').click();
    
    const auditProgress = page.locator('.security-audit-progress');
    await expect(auditProgress).toBeVisible();
    
    // Audit-Kategorien
    const auditCategories = [
      'SSL/TLS Konfiguration',
      'Authentication & Authorization',
      'API Security',
      'Data Encryption',
      'Network Security',
      'Dependency Vulnerabilities'
    ];
    
    for (const category of auditCategories) {
      await expect(auditProgress.locator(`.audit-category:has-text("${category}")`)).toBeVisible();
    }
    
    // Audit-Bericht
    await expect(page.locator('.audit-report')).toBeVisible({ timeout: 45000 });
    await expect(page.locator('.vulnerability-list')).toBeVisible();
  });

  test("Disaster Recovery und Backup", async ({ page }) => {
    // DR-Tab
    await page.click('.system-tabs button:has-text("Disaster Recovery")');
    
    const drPanel = page.locator('.disaster-recovery');
    await expect(drPanel).toBeVisible();
    
    // Backup-Status
    await expect(drPanel.locator('.backup-status')).toBeVisible();
    await expect(drPanel.locator('.last-backup-info')).toBeVisible();
    await expect(drPanel.locator('.backup-schedule')).toBeVisible();
    
    // Manuelles Backup erstellen
    await drPanel.locator('button:has-text("Backup jetzt erstellen")').click();
    
    const backupDialog = page.locator('.backup-creation-dialog');
    await expect(backupDialog).toBeVisible();
    
    // Backup-Optionen
    await backupDialog.locator('input[name="backupType"][value="full"]').click();
    await backupDialog.locator('input[name="includeDatabase"]').check();
    await backupDialog.locator('input[name="includeFiles"]').check();
    await backupDialog.locator('input[name="includeConfiguration"]').check();
    await backupDialog.locator('input[name="encryption"]').check();
    await backupDialog.locator('input[name="encryptionKey"]').fill('secure-backup-key-2025');
    
    // Backup starten
    await backupDialog.locator('button:has-text("Backup starten")').click();
    
    // Backup-Progress
    await expect(page.locator('.backup-progress')).toBeVisible();
    await expect(page.locator('.backup-progress .progress-bar')).toBeVisible();
    
    // Recovery-Test
    await drPanel.locator('button:has-text("Recovery-Test")').click();
    const recoveryTest = page.locator('.recovery-test-panel');
    await expect(recoveryTest).toBeVisible();
    
    await recoveryTest.locator('select[name="testScenario"]').selectOption('database-failure');
    await recoveryTest.locator('button:has-text("Test starten")').click();
    
    await expect(page.locator('.recovery-test-progress')).toBeVisible();
    await expect(page.locator('.recovery-test-results')).toBeVisible({ timeout: 60000 });
  });

  test("System-Integration und API Management", async ({ page }) => {
    // Integration-Tab
    await page.click('.system-tabs button:has-text("Integration")');
    
    const integrationPanel = page.locator('.system-integration');
    await expect(integrationPanel).toBeVisible();
    
    // API-Gateway Dashboard
    await expect(integrationPanel.locator('.api-gateway-stats')).toBeVisible();
    await expect(integrationPanel.locator('.request-rate-chart')).toBeVisible();
    await expect(integrationPanel.locator('.endpoint-performance')).toBeVisible();
    
    // Rate Limiting konfigurieren
    await integrationPanel.locator('button:has-text("Rate Limits")').click();
    const rateLimitDialog = page.locator('.rate-limit-configuration');
    await expect(rateLimitDialog).toBeVisible();
    
    await rateLimitDialog.locator('input[name="globalLimit"]').fill('10000');
    await rateLimitDialog.locator('select[name="timeWindow"]').selectOption('1h');
    await rateLimitDialog.locator('input[name="burstSize"]').fill('500');
    
    // Endpoint-spezifische Limits
    await rateLimitDialog.locator('button:has-text("Endpoint-Limit hinzufügen")').click();
    await rateLimitDialog.locator('input[name="endpoint"]').fill('/api/chat/stream');
    await rateLimitDialog.locator('input[name="endpointLimit"]').fill('100');
    
    await rateLimitDialog.locator('button:has-text("Speichern")').click();
    await expect(page.locator('.toast-success')).toContainText('Rate Limits aktualisiert');
    
    // Webhook-Management
    await integrationPanel.locator('.tab-button:has-text("Webhooks")').click();
    const webhooks = integrationPanel.locator('.webhook-management');
    await expect(webhooks).toBeVisible();
    
    // Neuen Webhook hinzufügen
    await webhooks.locator('button:has-text("Webhook hinzufügen")').click();
    const webhookDialog = page.locator('.webhook-dialog');
    
    await webhookDialog.locator('input[name="webhookUrl"]').fill('https://example.com/webhook');
    await webhookDialog.locator('input[name="events"][value="document.created"]').check();
    await webhookDialog.locator('input[name="events"][value="document.processed"]').check();
    await webhookDialog.locator('input[name="secret"]').fill('webhook-secret-key');
    
    await webhookDialog.locator('button:has-text("Webhook erstellen")').click();
    await expect(page.locator('.toast-success')).toContainText('Webhook erstellt');
  });
});