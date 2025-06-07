/**
 * E2E Tests für Admin Knowledge Manager Tab
 */
import { test, expect } from "@playwright/test";
import { LoginPage } from "../../pages/login-page";
import { AdminPage } from "../../pages/admin-page";
import { testUsers } from "../../fixtures/test-users";

test.describe("Admin Knowledge Manager", () => {
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
    await adminPage.selectTab('knowledgeManager');
  });

  test("Knowledge Base Übersicht", async ({ page }) => {
    // Titel prüfen
    await expect(page.locator('h2')).toContainText('Knowledge Manager');
    
    // Statistik-Karten
    await expect(page.locator('.knowledge-stats')).toBeVisible();
    await expect(page.locator('.stat-card:has-text("Dokumente")')).toBeVisible();
    await expect(page.locator('.stat-card:has-text("Chunks")')).toBeVisible();
    await expect(page.locator('.stat-card:has-text("Embeddings")')).toBeVisible();
    await expect(page.locator('.stat-card:has-text("Speicherplatz")')).toBeVisible();
    
    // Dokumenten-Tabelle
    const docTable = page.locator('.documents-table');
    await expect(docTable).toBeVisible();
    await expect(docTable.locator('thead th')).toContainText(['Dokument', 'Typ', 'Größe', 'Status', 'Hinzugefügt', 'Aktionen']);
  });

  test("Neue Dokumente zur Knowledge Base hinzufügen", async ({ page }) => {
    // Upload-Button klicken
    await page.click('button:has-text("Dokument hinzufügen")');
    
    // Upload-Dialog
    const uploadDialog = page.locator('.upload-dialog');
    await expect(uploadDialog).toBeVisible();
    
    // Datei auswählen
    const fileInput = uploadDialog.locator('input[type="file"]');
    await fileInput.setInputFiles('./fixtures/knowledge-doc.pdf');
    
    // Metadaten hinzufügen
    await uploadDialog.locator('input[name="title"]').fill('Neue Wissensbasis-Dokumentation');
    await uploadDialog.locator('select[name="category"]').selectOption('documentation');
    await uploadDialog.locator('textarea[name="description"]').fill('Detaillierte Anleitung für erweiterte Funktionen');
    
    // Tags hinzufügen
    await uploadDialog.locator('input[name="tags"]').fill('anleitung, erweitert, funktionen');
    
    // Upload starten
    await uploadDialog.locator('button:has-text("Hochladen")').click();
    
    // Progress anzeigen
    await expect(page.locator('.upload-progress')).toBeVisible();
    await expect(page.locator('.upload-progress .progress-bar')).toBeVisible();
    
    // Erfolgsmeldung
    await expect(page.locator('.toast-success')).toContainText('Dokument erfolgreich hinzugefügt');
    
    // Dokument sollte in der Liste erscheinen
    await expect(page.locator('.documents-table tbody tr:has-text("Neue Wissensbasis-Dokumentation")')).toBeVisible();
  });

  test("Dokument-Details anzeigen und bearbeiten", async ({ page }) => {
    // Erstes Dokument in der Liste anklicken
    const firstDoc = page.locator('.documents-table tbody tr').first();
    await firstDoc.locator('button:has-text("Details")').click();
    
    // Detail-Modal
    const detailModal = page.locator('.document-detail-modal');
    await expect(detailModal).toBeVisible();
    
    // Tabs prüfen
    await expect(detailModal.locator('.detail-tabs')).toBeVisible();
    await expect(detailModal.locator('.tab-button:has-text("Übersicht")')).toBeVisible();
    await expect(detailModal.locator('.tab-button:has-text("Chunks")')).toBeVisible();
    await expect(detailModal.locator('.tab-button:has-text("Embeddings")')).toBeVisible();
    await expect(detailModal.locator('.tab-button:has-text("Statistiken")')).toBeVisible();
    
    // Chunks-Tab
    await detailModal.locator('.tab-button:has-text("Chunks")').click();
    const chunksView = detailModal.locator('.chunks-view');
    await expect(chunksView).toBeVisible();
    await expect(chunksView.locator('.chunk-item')).toHaveCount(10); // Mindestens 10 Chunks
    
    // Chunk-Details anzeigen
    await chunksView.locator('.chunk-item').first().click();
    await expect(chunksView.locator('.chunk-detail')).toBeVisible();
    await expect(chunksView.locator('.chunk-text')).toBeVisible();
    await expect(chunksView.locator('.chunk-metadata')).toBeVisible();
  });

  test("Dokumente filtern und durchsuchen", async ({ page }) => {
    // Such-Input
    const searchInput = page.locator('input[placeholder="Dokumente durchsuchen..."]');
    await searchInput.fill('nscale');
    await searchInput.press('Enter');
    
    // Ergebnisse sollten gefiltert sein
    await page.waitForTimeout(500);
    const results = await page.$$('.documents-table tbody tr');
    expect(results.length).toBeGreaterThan(0);
    
    // Filter-Panel öffnen
    await page.click('button:has-text("Filter")');
    const filterPanel = page.locator('.filter-panel');
    await expect(filterPanel).toBeVisible();
    
    // Nach Kategorie filtern
    await filterPanel.locator('input[name="category"][value="documentation"]').check();
    await filterPanel.locator('input[name="category"][value="tutorial"]').check();
    
    // Datums-Filter
    await filterPanel.locator('input[name="dateFrom"]').fill('2025-01-01');
    await filterPanel.locator('input[name="dateTo"]').fill('2025-12-31');
    
    // Filter anwenden
    await filterPanel.locator('button:has-text("Anwenden")').click();
    
    // Filter-Tags sollten angezeigt werden
    await expect(page.locator('.active-filters')).toBeVisible();
    await expect(page.locator('.filter-tag')).toHaveCount(4);
  });

  test("Bulk-Operationen auf mehrere Dokumente", async ({ page }) => {
    // Mehrere Dokumente auswählen
    const checkboxes = await page.$$('.documents-table tbody tr input[type="checkbox"]');
    if (checkboxes.length >= 3) {
      await checkboxes[0].click();
      await checkboxes[1].click();
      await checkboxes[2].click();
      
      // Bulk-Actions-Bar
      const bulkBar = page.locator('.bulk-actions-bar');
      await expect(bulkBar).toBeVisible();
      await expect(bulkBar).toContainText('3 ausgewählt');
      
      // Bulk-Re-Indexierung
      await bulkBar.locator('button:has-text("Re-Indexieren")').click();
      
      // Bestätigungsdialog
      const confirmDialog = page.locator('.confirm-dialog');
      await expect(confirmDialog).toBeVisible();
      await expect(confirmDialog).toContainText('3 Dokumente re-indexieren?');
      
      await confirmDialog.locator('button:has-text("Bestätigen")').click();
      
      // Progress-Anzeige
      await expect(page.locator('.bulk-progress')).toBeVisible();
      await expect(page.locator('.toast-success')).toContainText('3 Dokumente erfolgreich re-indexiert');
    }
  });

  test("Embedding-Visualisierung", async ({ page }) => {
    // Visualisierungs-Tab
    await page.click('.knowledge-tabs button:has-text("Visualisierung")');
    
    // 3D-Embedding-Viewer
    const embeddingViewer = page.locator('.embedding-visualization');
    await expect(embeddingViewer).toBeVisible();
    
    // Canvas für 3D-Visualisierung
    await expect(embeddingViewer.locator('canvas#embedding-3d')).toBeVisible();
    
    // Steuerelemente
    await expect(embeddingViewer.locator('.viz-controls')).toBeVisible();
    
    // Dimensionsreduktion auswählen
    await embeddingViewer.locator('select[name="reductionMethod"]').selectOption('tsne');
    
    // Clustering aktivieren
    await embeddingViewer.locator('input[name="showClusters"]').check();
    
    // Cluster-Info beim Hover
    await page.hover('canvas#embedding-3d');
    await page.waitForTimeout(500);
    const tooltip = page.locator('.embedding-tooltip');
    if (await tooltip.isVisible()) {
      await expect(tooltip).toContainText(/Dokument:|Cluster:|Ähnlichkeit:/);
    }
  });

  test("Knowledge Base Wartung und Optimierung", async ({ page }) => {
    // Wartungs-Tab
    await page.click('.knowledge-tabs button:has-text("Wartung")');
    
    const maintenancePanel = page.locator('.maintenance-panel');
    await expect(maintenancePanel).toBeVisible();
    
    // Integritätsprüfung
    await maintenancePanel.locator('button:has-text("Integritätsprüfung starten")').click();
    
    // Progress anzeigen
    const integrityProgress = page.locator('.integrity-check-progress');
    await expect(integrityProgress).toBeVisible();
    await expect(integrityProgress.locator('.check-item:has-text("Dokumente prüfen")')).toBeVisible();
    await expect(integrityProgress.locator('.check-item:has-text("Chunks validieren")')).toBeVisible();
    await expect(integrityProgress.locator('.check-item:has-text("Embeddings verifizieren")')).toBeVisible();
    
    // Ergebnis
    await expect(page.locator('.integrity-results')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('.integrity-results')).toContainText(/Geprüft: \d+/);
    
    // Duplikate finden
    await maintenancePanel.locator('button:has-text("Duplikate finden")').click();
    const duplicatesResult = page.locator('.duplicates-result');
    await expect(duplicatesResult).toBeVisible({ timeout: 15000 });
    
    // Wenn Duplikate gefunden
    const duplicateCount = await duplicatesResult.locator('.duplicate-count').textContent();
    if (duplicateCount && parseInt(duplicateCount) > 0) {
      await duplicatesResult.locator('button:has-text("Duplikate anzeigen")').click();
      await expect(page.locator('.duplicates-list')).toBeVisible();
    }
  });

  test("Knowledge Base Export und Backup", async ({ page }) => {
    // Export-Button
    await page.click('button:has-text("Knowledge Base exportieren")');
    
    // Export-Dialog
    const exportDialog = page.locator('.export-knowledge-dialog');
    await expect(exportDialog).toBeVisible();
    
    // Export-Optionen
    await exportDialog.locator('input[name="includeDocuments"]').check();
    await exportDialog.locator('input[name="includeEmbeddings"]').check();
    await exportDialog.locator('input[name="includeMetadata"]').check();
    
    // Format auswählen
    await exportDialog.locator('select[name="exportFormat"]').selectOption('sqlite');
    
    // Komprimierung
    await exportDialog.locator('input[name="compress"]').check();
    
    // Export starten
    const downloadPromise = page.waitForEvent('download');
    await exportDialog.locator('button:has-text("Export starten")').click();
    
    // Progress
    await expect(page.locator('.export-progress')).toBeVisible();
    
    // Download
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/knowledge-base-export.*\.(sqlite\.gz|db\.gz)/);
  });
});