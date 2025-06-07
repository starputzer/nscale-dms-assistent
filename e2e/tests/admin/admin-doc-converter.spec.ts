/**
 * E2E Tests für Admin Document Converter Enhanced Tab
 */
import { test, expect } from "@playwright/test";
import { LoginPage } from "../../pages/login-page";
import { AdminPage } from "../../pages/admin-page";
import { testUsers } from "../../fixtures/test-users";

test.describe("Admin Document Converter Enhanced", () => {
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
    await adminPage.selectTab('docConverterEnhanced');
  });

  test("Document Converter Dashboard zeigt Übersicht", async ({ page }) => {
    // Titel prüfen
    await expect(page.locator('h2')).toContainText('Document Converter Enhanced');
    
    // Wichtige Statistiken sollten sichtbar sein
    await expect(page.locator('.converter-stats')).toBeVisible();
    await expect(page.locator('.stat-card:has-text("Verarbeitete Dokumente")')).toBeVisible();
    await expect(page.locator('.stat-card:has-text("Warteschlange")')).toBeVisible();
    await expect(page.locator('.stat-card:has-text("Fehlerrate")')).toBeVisible();
    await expect(page.locator('.stat-card:has-text("Durchschn. Zeit")')).toBeVisible();
  });

  test("Dokument hochladen und konvertieren", async ({ page }) => {
    // Upload-Bereich
    const uploadArea = page.locator('.document-upload-area');
    await expect(uploadArea).toBeVisible();
    
    // Datei-Input vorbereiten
    const fileInput = page.locator('input[type="file"]');
    
    // Test-PDF hochladen
    const testFilePath = './fixtures/test-document.pdf';
    await fileInput.setInputFiles(testFilePath);
    
    // Upload-Button klicken
    await page.click('button:has-text("Hochladen")');
    
    // Progress-Indikator sollte erscheinen
    await expect(page.locator('.upload-progress')).toBeVisible();
    
    // Erfolgsmeldung abwarten
    await expect(page.locator('.toast-success')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('.toast-success')).toContainText('erfolgreich hochgeladen');
    
    // Dokument sollte in der Liste erscheinen
    await expect(page.locator('.document-list .document-item:last-child')).toContainText('test-document.pdf');
  });

  test("Batch-Verarbeitung mehrerer Dokumente", async ({ page }) => {
    // Batch-Upload aktivieren
    await page.click('.batch-mode-toggle');
    
    // Mehrere Dateien auswählen (simuliert)
    const fileInput = page.locator('input[type="file"][multiple]');
    await fileInput.setInputFiles([
      './fixtures/test-document-1.pdf',
      './fixtures/test-document-2.pdf',
      './fixtures/test-document-3.pdf'
    ]);
    
    // Batch-Verarbeitung starten
    await page.click('button:has-text("Batch verarbeiten")');
    
    // Batch-Progress anzeigen
    const batchProgress = page.locator('.batch-progress');
    await expect(batchProgress).toBeVisible();
    await expect(batchProgress.locator('.progress-bar')).toBeVisible();
    await expect(batchProgress.locator('.progress-text')).toContainText(/\d+\/3/);
    
    // Warten bis Verarbeitung abgeschlossen
    await expect(page.locator('.batch-complete')).toBeVisible({ timeout: 60000 });
  });

  test("Konvertierungs-Einstellungen konfigurieren", async ({ page }) => {
    // Einstellungen-Tab öffnen
    await page.click('.converter-tabs button:has-text("Einstellungen")');
    
    // OCR-Einstellungen
    const ocrSection = page.locator('.ocr-settings');
    await expect(ocrSection).toBeVisible();
    
    // OCR aktivieren/deaktivieren
    const ocrToggle = ocrSection.locator('input[type="checkbox"][name="enableOCR"]');
    await ocrToggle.click();
    
    // OCR-Sprache auswählen
    await ocrSection.locator('select[name="ocrLanguage"]').selectOption('deu');
    
    // Qualitäts-Einstellungen
    await page.locator('input[name="imageQuality"]').fill('90');
    await page.locator('select[name="outputFormat"]').selectOption('markdown');
    
    // Speichern
    await page.click('button:has-text("Einstellungen speichern")');
    await expect(page.locator('.toast-success')).toContainText('Einstellungen gespeichert');
  });

  test("Dokument-Vorschau und Metadaten", async ({ page }) => {
    // Erstes Dokument in der Liste anklicken
    const firstDocument = page.locator('.document-list .document-item').first();
    await firstDocument.click();
    
    // Detail-Modal sollte erscheinen
    const detailModal = page.locator('.document-detail-modal');
    await expect(detailModal).toBeVisible();
    
    // Metadaten prüfen
    await expect(detailModal.locator('.metadata-section')).toBeVisible();
    await expect(detailModal.locator('.metadata-item:has-text("Dateigröße")')).toBeVisible();
    await expect(detailModal.locator('.metadata-item:has-text("Seitenanzahl")')).toBeVisible();
    await expect(detailModal.locator('.metadata-item:has-text("Erstellungsdatum")')).toBeVisible();
    await expect(detailModal.locator('.metadata-item:has-text("Status")')).toBeVisible();
    
    // Vorschau-Tabs
    await expect(detailModal.locator('.preview-tabs')).toBeVisible();
    await detailModal.locator('.preview-tabs button:has-text("Original")').click();
    await expect(detailModal.locator('.original-preview')).toBeVisible();
    
    await detailModal.locator('.preview-tabs button:has-text("Konvertiert")').click();
    await expect(detailModal.locator('.converted-preview')).toBeVisible();
  });

  test("Fehlerbehandlung und Retry-Mechanismus", async ({ page }) => {
    // Fehler-Tab öffnen
    await page.click('.converter-tabs button:has-text("Fehler")');
    
    // Fehler-Liste sollte sichtbar sein
    const errorList = page.locator('.error-list');
    await expect(errorList).toBeVisible();
    
    // Wenn Fehler vorhanden sind
    const errorItems = await errorList.locator('.error-item').all();
    if (errorItems.length > 0) {
      // Ersten Fehler expandieren
      await errorItems[0].click();
      
      // Fehlerdetails prüfen
      await expect(errorItems[0].locator('.error-details')).toBeVisible();
      await expect(errorItems[0].locator('.error-message')).toBeVisible();
      await expect(errorItems[0].locator('.error-timestamp')).toBeVisible();
      
      // Retry-Button
      const retryButton = errorItems[0].locator('button:has-text("Erneut versuchen")');
      await expect(retryButton).toBeVisible();
      
      // Retry ausführen
      await retryButton.click();
      await expect(page.locator('.toast-info')).toContainText('Dokument wird erneut verarbeitet');
    }
  });

  test("Export konvertierter Dokumente", async ({ page }) => {
    // Dokumente auswählen
    const checkboxes = await page.$$('.document-list .document-checkbox');
    if (checkboxes.length >= 2) {
      await checkboxes[0].click();
      await checkboxes[1].click();
      
      // Export-Button sollte erscheinen
      const exportButton = page.locator('button:has-text("Ausgewählte exportieren")');
      await expect(exportButton).toBeVisible();
      
      // Export-Dialog öffnen
      await exportButton.click();
      const exportDialog = page.locator('.export-dialog');
      await expect(exportDialog).toBeVisible();
      
      // Export-Format wählen
      await exportDialog.locator('input[name="format"][value="zip"]').click();
      await exportDialog.locator('input[name="includeOriginal"]').check();
      
      // Download starten
      const downloadPromise = page.waitForEvent('download');
      await exportDialog.locator('button:has-text("Export starten")').click();
      
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/documents-export.*\.zip/);
    }
  });

  test("Performance-Metriken und Optimierungen", async ({ page }) => {
    // Performance-Tab öffnen
    await page.click('.converter-tabs button:has-text("Performance")');
    
    // Performance-Dashboard
    const perfDashboard = page.locator('.performance-dashboard');
    await expect(perfDashboard).toBeVisible();
    
    // Metriken prüfen
    await expect(perfDashboard.locator('.metric:has-text("Durchsatz")')).toBeVisible();
    await expect(perfDashboard.locator('.metric:has-text("CPU-Auslastung")')).toBeVisible();
    await expect(perfDashboard.locator('.metric:has-text("Speicher")')).toBeVisible();
    await expect(perfDashboard.locator('.metric:has-text("Queue-Länge")')).toBeVisible();
    
    // Performance-Graph
    await expect(perfDashboard.locator('canvas#performance-chart')).toBeVisible();
    
    // Optimierungs-Vorschläge
    const suggestions = page.locator('.optimization-suggestions');
    await expect(suggestions).toBeVisible();
    
    // Auto-Optimierung aktivieren
    await suggestions.locator('button:has-text("Auto-Optimierung aktivieren")').click();
    await expect(page.locator('.toast-success')).toContainText('Auto-Optimierung aktiviert');
  });
});