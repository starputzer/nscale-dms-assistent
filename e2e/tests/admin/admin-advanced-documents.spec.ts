/**
 * E2E Tests für Admin Advanced Documents Tab
 */
import { test, expect } from "@playwright/test";
import { LoginPage } from "../../pages/login-page";
import { AdminPage } from "../../pages/admin-page";
import { testUsers } from "../../fixtures/test-users";

test.describe("Admin Advanced Documents", () => {
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
    await adminPage.selectTab('advancedDocuments');
  });

  test("Advanced Documents Dashboard", async ({ page }) => {
    // Titel prüfen
    await expect(page.locator('h2')).toContainText('Advanced Documents');
    
    // Hauptbereiche
    await expect(page.locator('.document-analytics')).toBeVisible();
    await expect(page.locator('.document-workflows')).toBeVisible();
    await expect(page.locator('.document-intelligence')).toBeVisible();
    await expect(page.locator('.document-compliance')).toBeVisible();
  });

  test("Erweiterte Dokumenten-Analyse", async ({ page }) => {
    const analytics = page.locator('.document-analytics');
    
    // Analyse-Dashboard
    await expect(analytics.locator('.analytics-overview')).toBeVisible();
    await expect(analytics.locator('.stat-card:has-text("Gesamtdokumente")')).toBeVisible();
    await expect(analytics.locator('.stat-card:has-text("Verarbeitungsrate")')).toBeVisible();
    await expect(analytics.locator('.stat-card:has-text("Durchschn. Größe")')).toBeVisible();
    await expect(analytics.locator('.stat-card:has-text("Speichernutzung")')).toBeVisible();
    
    // Dokumenttyp-Verteilung
    await expect(analytics.locator('canvas#document-types-chart')).toBeVisible();
    
    // Zeitbasierte Analyse
    await analytics.locator('.time-range-selector').selectOption('last-30-days');
    await expect(analytics.locator('canvas#document-timeline-chart')).toBeVisible();
    
    // Detaillierte Analyse starten
    await analytics.locator('button:has-text("Tiefenanalyse")').click();
    const analysisDialog = page.locator('.deep-analysis-dialog');
    await expect(analysisDialog).toBeVisible();
    
    // Analyse-Parameter
    await analysisDialog.locator('input[name="analyzeContent"]').check();
    await analysisDialog.locator('input[name="analyzeMetadata"]').check();
    await analysisDialog.locator('input[name="analyzeRelations"]').check();
    await analysisDialog.locator('button:has-text("Analyse starten")').click();
    
    // Progress
    await expect(page.locator('.analysis-progress')).toBeVisible();
  });

  test("Dokumenten-Workflows konfigurieren", async ({ page }) => {
    const workflows = page.locator('.document-workflows');
    
    // Workflow-Liste
    await expect(workflows.locator('.workflow-list')).toBeVisible();
    await expect(workflows.locator('.workflow-item:has-text("Automatische Klassifizierung")')).toBeVisible();
    await expect(workflows.locator('.workflow-item:has-text("OCR-Pipeline")')).toBeVisible();
    await expect(workflows.locator('.workflow-item:has-text("Metadaten-Extraktion")')).toBeVisible();
    
    // Neuen Workflow erstellen
    await workflows.locator('button:has-text("Neuer Workflow")').click();
    
    const workflowBuilder = page.locator('.workflow-builder');
    await expect(workflowBuilder).toBeVisible();
    
    // Workflow-Name
    await workflowBuilder.locator('input[name="workflowName"]').fill('Rechnungsverarbeitung');
    
    // Workflow-Schritte hinzufügen (Drag & Drop simulieren)
    await workflowBuilder.locator('.step-palette .step-item:has-text("Dokumententyp prüfen")').click();
    await workflowBuilder.locator('.workflow-canvas').click({ position: { x: 100, y: 100 } });
    
    await workflowBuilder.locator('.step-palette .step-item:has-text("Daten extrahieren")').click();
    await workflowBuilder.locator('.workflow-canvas').click({ position: { x: 300, y: 100 } });
    
    await workflowBuilder.locator('.step-palette .step-item:has-text("Validierung")').click();
    await workflowBuilder.locator('.workflow-canvas').click({ position: { x: 500, y: 100 } });
    
    // Verbindungen erstellen
    await workflowBuilder.locator('button:has-text("Verbindungsmodus")').click();
    
    // Workflow speichern
    await workflowBuilder.locator('button:has-text("Workflow speichern")').click();
    await expect(page.locator('.toast-success')).toContainText('Workflow erfolgreich erstellt');
  });

  test("Dokumenten-Intelligence und ML-Features", async ({ page }) => {
    const intelligence = page.locator('.document-intelligence');
    
    // ML-Modelle verwalten
    await expect(intelligence.locator('.ml-models-section')).toBeVisible();
    
    // Aktive Modelle
    await expect(intelligence.locator('.model-card:has-text("Dokumentklassifikation")')).toBeVisible();
    await expect(intelligence.locator('.model-card:has-text("Entity-Extraktion")')).toBeVisible();
    await expect(intelligence.locator('.model-card:has-text("Sentiment-Analyse")')).toBeVisible();
    
    // Modell-Training
    const classificationModel = intelligence.locator('.model-card:has-text("Dokumentklassifikation")');
    await classificationModel.locator('button:has-text("Trainieren")').click();
    
    const trainingDialog = page.locator('.model-training-dialog');
    await expect(trainingDialog).toBeVisible();
    
    // Training-Dataset auswählen
    await trainingDialog.locator('button:has-text("Dataset auswählen")').click();
    await page.locator('.dataset-item:has-text("Klassifizierte Dokumente (1000)")').click();
    
    // Training-Parameter
    await trainingDialog.locator('input[name="epochs"]').fill('50');
    await trainingDialog.locator('input[name="batchSize"]').fill('32');
    await trainingDialog.locator('select[name="optimizer"]').selectOption('adam');
    
    // Training starten
    await trainingDialog.locator('button:has-text("Training starten")').click();
    await expect(page.locator('.training-progress')).toBeVisible();
    
    // Auto-Tagging konfigurieren
    await intelligence.locator('.auto-tagging-section button:has-text("Konfigurieren")').click();
    const taggingConfig = page.locator('.auto-tagging-config');
    await expect(taggingConfig).toBeVisible();
    
    await taggingConfig.locator('input[name="enableAutoTagging"]').check();
    await taggingConfig.locator('input[name="confidenceThreshold"]').fill('0.8');
    await taggingConfig.locator('button:has-text("Speichern")').click();
  });

  test("Compliance und Retention-Management", async ({ page }) => {
    const compliance = page.locator('.document-compliance');
    
    // Compliance-Übersicht
    await expect(compliance.locator('.compliance-dashboard')).toBeVisible();
    await expect(compliance.locator('.compliance-score')).toBeVisible();
    await expect(compliance.locator('.compliance-issues')).toBeVisible();
    
    // Retention-Regeln
    await compliance.locator('.tab-button:has-text("Retention")').click();
    const retentionRules = compliance.locator('.retention-rules');
    await expect(retentionRules).toBeVisible();
    
    // Neue Retention-Regel
    await retentionRules.locator('button:has-text("Neue Regel")').click();
    const ruleDialog = page.locator('.retention-rule-dialog');
    await expect(ruleDialog).toBeVisible();
    
    await ruleDialog.locator('input[name="ruleName"]').fill('DSGVO - Personenbezogene Daten');
    await ruleDialog.locator('select[name="documentType"]').selectOption('personal-data');
    await ruleDialog.locator('input[name="retentionPeriod"]').fill('5');
    await ruleDialog.locator('select[name="periodUnit"]').selectOption('years');
    await ruleDialog.locator('select[name="actionAfterExpiry"]').selectOption('anonymize');
    
    await ruleDialog.locator('button:has-text("Regel erstellen")').click();
    await expect(page.locator('.toast-success')).toContainText('Retention-Regel erstellt');
    
    // Audit-Log
    await compliance.locator('.tab-button:has-text("Audit")').click();
    const auditLog = compliance.locator('.audit-log');
    await expect(auditLog).toBeVisible();
    
    // Audit-Einträge filtern
    await auditLog.locator('select[name="eventType"]').selectOption('document-access');
    await auditLog.locator('input[name="userFilter"]').fill('admin@');
    
    const auditEntries = await auditLog.locator('.audit-entry').all();
    expect(auditEntries.length).toBeGreaterThanOrEqual(0);
  });

  test("Erweiterte Such- und Filter-Funktionen", async ({ page }) => {
    // Erweiterte Suche öffnen
    await page.click('button:has-text("Erweiterte Suche")');
    
    const advancedSearch = page.locator('.advanced-search-panel');
    await expect(advancedSearch).toBeVisible();
    
    // Volltext-Suche
    await advancedSearch.locator('input[name="fulltext"]').fill('Vertrag Kunde');
    
    // Metadaten-Filter
    await advancedSearch.locator('button:has-text("Metadaten-Filter")').click();
    await advancedSearch.locator('input[name="metadata.author"]').fill('Max Mustermann');
    await advancedSearch.locator('input[name="metadata.createdAfter"]').fill('2025-01-01');
    
    // Inhaltsbasierte Filter
    await advancedSearch.locator('button:has-text("Inhalt")').click();
    await advancedSearch.locator('input[name="hasSignature"]').check();
    await advancedSearch.locator('input[name="language"]').selectOption('de');
    
    // KI-basierte Suche
    await advancedSearch.locator('input[name="semanticSearch"]').check();
    await advancedSearch.locator('textarea[name="semanticQuery"]').fill('Dokumente mit Zahlungsbedingungen und Lieferfristen');
    
    // Suche ausführen
    await advancedSearch.locator('button:has-text("Suchen")').click();
    
    // Suchergebnisse
    const searchResults = page.locator('.search-results');
    await expect(searchResults).toBeVisible();
    await expect(searchResults.locator('.result-count')).toBeVisible();
    await expect(searchResults.locator('.result-item')).toHaveCount(10);
    
    // Ergebnis-Vorschau
    await searchResults.locator('.result-item').first().hover();
    await expect(page.locator('.result-preview')).toBeVisible();
  });

  test("Batch-Operationen für Dokumente", async ({ page }) => {
    // Dokumente für Batch-Operation auswählen
    const docList = page.locator('.advanced-document-list');
    const checkboxes = await docList.locator('input[type="checkbox"]').all();
    
    if (checkboxes.length >= 5) {
      // 5 Dokumente auswählen
      for (let i = 0; i < 5; i++) {
        await checkboxes[i].click();
      }
      
      // Batch-Aktionsleiste
      const batchBar = page.locator('.batch-actions-bar');
      await expect(batchBar).toBeVisible();
      await expect(batchBar).toContainText('5 Dokumente ausgewählt');
      
      // Batch-Metadaten-Update
      await batchBar.locator('button:has-text("Metadaten bearbeiten")').click();
      const metadataDialog = page.locator('.batch-metadata-dialog');
      await expect(metadataDialog).toBeVisible();
      
      await metadataDialog.locator('input[name="addTag"]').fill('Q2-2025');
      await metadataDialog.locator('select[name="setDepartment"]').selectOption('finance');
      await metadataDialog.locator('input[name="setConfidential"]').check();
      
      await metadataDialog.locator('button:has-text("Anwenden")').click();
      await expect(page.locator('.toast-success')).toContainText('5 Dokumente aktualisiert');
      
      // Batch-Export
      await page.click('.batch-actions-bar button:has-text("Exportieren")');
      const exportOptions = page.locator('.batch-export-options');
      await expect(exportOptions).toBeVisible();
      
      await exportOptions.locator('input[name="format"][value="pdf-portfolio"]').click();
      await exportOptions.locator('input[name="includeMetadata"]').check();
      await exportOptions.locator('input[name="addWatermark"]').check();
      
      const downloadPromise = page.waitForEvent('download');
      await exportOptions.locator('button:has-text("Export starten")').click();
      
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/documents-batch-export.*\.pdf/);
    }
  });

  test("Dokumenten-Versionierung und History", async ({ page }) => {
    // Erstes Dokument öffnen
    const firstDoc = page.locator('.advanced-document-list .document-item').first();
    await firstDoc.click();
    
    // Dokumenten-Detail-Ansicht
    const docDetail = page.locator('.document-detail-view');
    await expect(docDetail).toBeVisible();
    
    // Versions-Tab
    await docDetail.locator('.tab-button:has-text("Versionen")').click();
    const versionsPanel = docDetail.locator('.versions-panel');
    await expect(versionsPanel).toBeVisible();
    
    // Versions-Liste
    const versions = await versionsPanel.locator('.version-item').all();
    expect(versions.length).toBeGreaterThan(0);
    
    // Version vergleichen
    if (versions.length >= 2) {
      await versions[0].locator('input[type="checkbox"]').click();
      await versions[1].locator('input[type="checkbox"]').click();
      
      await versionsPanel.locator('button:has-text("Vergleichen")').click();
      
      // Vergleichsansicht
      const compareView = page.locator('.version-compare-view');
      await expect(compareView).toBeVisible();
      await expect(compareView.locator('.diff-viewer')).toBeVisible();
      await expect(compareView.locator('.change-summary')).toBeVisible();
    }
    
    // Neue Version hochladen
    await versionsPanel.locator('button:has-text("Neue Version")').click();
    const uploadDialog = page.locator('.version-upload-dialog');
    await expect(uploadDialog).toBeVisible();
    
    await uploadDialog.locator('input[type="file"]').setInputFiles('./fixtures/document-v2.pdf');
    await uploadDialog.locator('textarea[name="versionComment"]').fill('Aktualisierte Vertragsbedingungen');
    await uploadDialog.locator('button:has-text("Hochladen")').click();
    
    await expect(page.locator('.toast-success')).toContainText('Neue Version erstellt');
  });
});