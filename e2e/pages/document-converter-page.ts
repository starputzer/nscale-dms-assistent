/**
 * Page Object für die Dokumentenkonverter-Seite.
 */
import { Page, expect } from '@playwright/test';
import * as path from 'path';

export class DocumentConverterPage {
  readonly page: Page;
  
  // Selektoren für Elemente auf der Dokumentenkonverter-Seite
  readonly fileUploadDropzone = '.file-upload-dropzone';
  readonly fileInput = 'input[type="file"]';
  readonly uploadButton = 'button[aria-label="Hochladen"]';
  readonly convertButton = 'button[aria-label="Konvertieren"]';
  readonly documentList = '.document-list';
  readonly documentItems = '.document-item';
  readonly progressBar = '.conversion-progress-bar';
  readonly errorMessage = '.error-display';
  readonly successMessage = '.success-message';
  readonly previewContainer = '.document-preview';
  readonly previewContent = '.preview-content';
  readonly downloadButton = 'button[aria-label="Herunterladen"]';
  readonly deleteButton = 'button[aria-label="Löschen"]';
  
  constructor(page: Page) {
    this.page = page;
  }
  
  /**
   * Navigiert zur Dokumentenkonverter-Seite.
   */
  async goto() {
    await this.page.goto('/document-converter');
  }
  
  /**
   * Lädt eine Datei hoch.
   * @param filePath Pfad zur hochzuladenden Datei.
   */
  async uploadFile(filePath: string) {
    // FileChooser triggern
    const [fileChooser] = await Promise.all([
      this.page.waitForEvent('filechooser'),
      this.page.click(this.fileUploadDropzone)
    ]);
    
    // Datei auswählen
    await fileChooser.setFiles(filePath);
    
    // Warten bis der Dateiname angezeigt wird
    await this.page.waitForSelector('.file-info');
    
    // Upload starten
    await this.page.click(this.uploadButton);
  }
  
  /**
   * Lädt mehrere Dateien hoch.
   * @param filePaths Array von Pfaden zu den hochzuladenden Dateien.
   */
  async uploadMultipleFiles(filePaths: string[]) {
    // FileChooser triggern
    const [fileChooser] = await Promise.all([
      this.page.waitForEvent('filechooser'),
      this.page.click(this.fileUploadDropzone)
    ]);
    
    // Dateien auswählen
    await fileChooser.setFiles(filePaths);
    
    // Warten bis die Dateinamen angezeigt werden
    await this.page.waitForSelector('.file-info');
    
    // Upload starten
    await this.page.click(this.uploadButton);
  }
  
  /**
   * Konvertiert ein hochgeladenes Dokument.
   */
  async convertDocument() {
    await this.page.click(this.convertButton);
    
    // Warten auf den Start der Konvertierung
    await this.page.waitForSelector(this.progressBar);
    
    // Warten bis die Konvertierung abgeschlossen ist
    await this.page.waitForSelector(this.progressBar, { state: 'detached', timeout: 60000 });
    
    // Warten auf die Erfolgsmeldung oder Fehlermeldung
    await Promise.race([
      this.page.waitForSelector(this.successMessage, { timeout: 5000 }),
      this.page.waitForSelector(this.errorMessage, { timeout: 5000 })
    ]);
  }
  
  /**
   * Öffnet die Vorschau eines konvertierten Dokuments.
   * @param documentIndex Der Index des Dokuments in der Liste (0-basiert).
   */
  async openDocumentPreview(documentIndex: number) {
    const documents = this.page.locator(this.documentItems);
    const count = await documents.count();
    
    if (documentIndex >= 0 && documentIndex < count) {
      await documents.nth(documentIndex).click();
      await this.page.click('button[aria-label="Vorschau"]');
      
      // Warten bis die Vorschau geladen ist
      await this.page.waitForSelector(this.previewContent);
    } else {
      throw new Error(`Dokument mit Index ${documentIndex} existiert nicht. Verfügbare Dokumente: ${count}`);
    }
  }
  
  /**
   * Lädt ein konvertiertes Dokument herunter.
   * @param documentIndex Der Index des Dokuments in der Liste (0-basiert).
   * @returns Promise mit dem Pfad der heruntergeladenen Datei.
   */
  async downloadDocument(documentIndex: number): Promise<string> {
    const documents = this.page.locator(this.documentItems);
    
    // Dokument auswählen
    await documents.nth(documentIndex).click();
    
    // Download-Event abfangen und Download starten
    const downloadPromise = this.page.waitForEvent('download');
    await this.page.click(this.downloadButton);
    const download = await downloadPromise;
    
    // Warten bis der Download abgeschlossen ist
    const filePath = await download.path();
    return filePath;
  }
  
  /**
   * Löscht ein konvertiertes Dokument.
   * @param documentIndex Der Index des Dokuments in der Liste (0-basiert).
   */
  async deleteDocument(documentIndex: number) {
    const documents = this.page.locator(this.documentItems);
    
    // Dokument auswählen
    await documents.nth(documentIndex).click();
    
    // Löschen-Button klicken
    await this.page.click(this.deleteButton);
    
    // Löschen bestätigen
    await this.page.click('.confirm-dialog button.confirm');
  }
  
  /**
   * Prüft, ob eine bestimmte Anzahl von Dokumenten in der Liste angezeigt wird.
   */
  async expectDocumentCount(count: number) {
    await expect(this.page.locator(this.documentItems)).toHaveCount(count);
  }
  
  /**
   * Prüft, ob ein Dokument mit einem bestimmten Namen in der Liste vorhanden ist.
   */
  async expectDocumentExists(documentName: string) {
    await expect(this.page.locator(this.documentItems).filter({ hasText: documentName })).toBeVisible();
  }
  
  /**
   * Prüft, ob die Vorschau geladen ist und Text enthält.
   */
  async expectPreviewContains(text: string) {
    await expect(this.page.locator(this.previewContent)).toContainText(text);
  }
}