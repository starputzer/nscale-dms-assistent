/**
 * End-to-End-Tests für den Dokumentenkonverter.
 */
import { test, expect } from '@playwright/test';
import { DocumentConverterPage } from '../../pages/document-converter-page';
import { createTestDocuments, TEST_DOCUMENTS } from '../../fixtures/test-documents';
import * as path from 'path';
import * as fs from 'fs';

// Tests mit vorgefertigten Authentifizierungsdaten ausführen
test.describe('Dokumentenkonverter', () => {
  // Bestehende Authentifizierungsdaten für jeden Test verwenden
  test.use({ storageState: './e2e/fixtures/user-auth.json' });
  
  // Testdokumente vor den Tests erstellen
  test.beforeAll(async () => {
    await createTestDocuments();
  });
  
  // Test für das Hochladen und Konvertieren eines PDF-Dokuments
  test('Hochladen und Konvertieren eines PDF-Dokuments', async ({ page }) => {
    const docConverterPage = new DocumentConverterPage(page);
    await docConverterPage.goto();
    
    // PDF-Dokument hochladen
    await docConverterPage.uploadFile(TEST_DOCUMENTS.pdf.path);
    
    // Dokument konvertieren
    await docConverterPage.convertDocument();
    
    // Prüfen, ob das Dokument in der Liste erscheint
    await docConverterPage.expectDocumentExists('testdocument.pdf');
    
    // Dokumentvorschau öffnen
    await docConverterPage.openDocumentPreview(0);
    
    // Prüfen, ob die Vorschau angezeigt wird
    await expect(page.locator('.document-preview')).toBeVisible();
  });
  
  // Test für das Hochladen und Konvertieren eines Word-Dokuments
  test('Hochladen und Konvertieren eines Word-Dokuments', async ({ page }) => {
    const docConverterPage = new DocumentConverterPage(page);
    await docConverterPage.goto();
    
    // Word-Dokument hochladen
    await docConverterPage.uploadFile(TEST_DOCUMENTS.docx.path);
    
    // Dokument konvertieren
    await docConverterPage.convertDocument();
    
    // Prüfen, ob das Dokument in der Liste erscheint
    await docConverterPage.expectDocumentExists('testdocument.docx');
    
    // Dokumentvorschau öffnen
    await docConverterPage.openDocumentPreview(0);
    
    // Prüfen, ob die Vorschau angezeigt wird
    await expect(page.locator('.document-preview')).toBeVisible();
  });
  
  // Test für das Hochladen und Konvertieren mehrerer Dokumente
  test('Hochladen und Konvertieren mehrerer Dokumente gleichzeitig', async ({ page }) => {
    const docConverterPage = new DocumentConverterPage(page);
    await docConverterPage.goto();
    
    // Mehrere Dokumente hochladen
    await docConverterPage.uploadMultipleFiles([
      TEST_DOCUMENTS.pdf.path,
      TEST_DOCUMENTS.docx.path,
      TEST_DOCUMENTS.xlsx.path
    ]);
    
    // Dokumente konvertieren
    await docConverterPage.convertDocument();
    
    // Prüfen, ob alle Dokumente in der Liste erscheinen
    await docConverterPage.expectDocumentCount(3);
    
    // Prüfen, ob spezifische Dokumente in der Liste erscheinen
    await docConverterPage.expectDocumentExists('testdocument.pdf');
    await docConverterPage.expectDocumentExists('testdocument.docx');
    await docConverterPage.expectDocumentExists('testdocument.xlsx');
  });
  
  // Test für das Herunterladen eines konvertierten Dokuments
  test('Herunterladen eines konvertierten Dokuments', async ({ page }) => {
    const docConverterPage = new DocumentConverterPage(page);
    await docConverterPage.goto();
    
    // PDF-Dokument hochladen
    await docConverterPage.uploadFile(TEST_DOCUMENTS.pdf.path);
    
    // Dokument konvertieren
    await docConverterPage.convertDocument();
    
    // Prüfen, ob das Dokument in der Liste erscheint
    await docConverterPage.expectDocumentExists('testdocument.pdf');
    
    // Dokument herunterladen
    const downloadPath = await docConverterPage.downloadDocument(0);
    
    // Prüfen, ob die Datei heruntergeladen wurde
    expect(fs.existsSync(downloadPath)).toBeTruthy();
    
    // Aufräumen
    if (fs.existsSync(downloadPath)) {
      fs.unlinkSync(downloadPath);
    }
  });
  
  // Test für das Löschen eines konvertierten Dokuments
  test('Löschen eines konvertierten Dokuments', async ({ page }) => {
    const docConverterPage = new DocumentConverterPage(page);
    await docConverterPage.goto();
    
    // PDF-Dokument hochladen
    await docConverterPage.uploadFile(TEST_DOCUMENTS.pdf.path);
    
    // Dokument konvertieren
    await docConverterPage.convertDocument();
    
    // Anzahl der Dokumente in der Liste zählen
    await docConverterPage.expectDocumentCount(1);
    
    // Dokument löschen
    await docConverterPage.deleteDocument(0);
    
    // Prüfen, ob das Dokument aus der Liste entfernt wurde
    await docConverterPage.expectDocumentCount(0);
  });
});