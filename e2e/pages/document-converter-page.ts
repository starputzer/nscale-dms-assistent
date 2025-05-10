/**
 * Page Object für die Dokumentenkonverter-Seite.
 *
 * Enthält auch mobile-spezifische Selektoren und Methoden für responsive Tests.
 */
import { Page, expect, Locator } from '@playwright/test';
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

  // Mobile-spezifische Selektoren
  readonly pageTitle: Locator;
  readonly uploadTab: Locator;
  readonly batchUploadTab: Locator;
  readonly singleUploadDropZone: Locator;
  readonly batchUploadDropZone: Locator;
  readonly actionButton: Locator;
  readonly cancelButton: Locator;
  readonly mobileLayout: Locator;
  readonly desktopLayout: Locator;
  readonly mobileDocumentActions: Locator;
  readonly downloadAction: Locator;
  readonly conversionProgress: Locator;
  readonly desktopStepsVisualization: Locator;
  readonly mobileStepsVisualization: Locator;
  
  constructor(page: Page) {
    this.page = page;
    
    // Mobile-spezifische Locators initialisieren
    this.pageTitle = page.locator('h1.doc-converter-title');
    this.uploadTab = page.locator('[data-testid="upload-tab"]');
    this.batchUploadTab = page.locator('[data-testid="batch-upload-tab"]');
    this.singleUploadDropZone = page.locator('.single-upload-dropzone');
    this.batchUploadDropZone = page.locator('.batch-upload-dropzone');
    this.actionButton = page.locator('.action-button');
    this.cancelButton = page.locator('button[aria-label="Abbrechen"]');
    this.mobileLayout = page.locator('.doc-converter-container.mobile-layout');
    this.desktopLayout = page.locator('.doc-converter-container.desktop-layout');
    this.mobileDocumentActions = page.locator('.document-list__mobile-actions');
    this.downloadAction = page.locator('.document-list__download-action');
    this.conversionProgress = page.locator('.conversion-progress');
    this.desktopStepsVisualization = page.locator('.conversion-progress__steps:not(.conversion-progress__steps--mobile)');
    this.mobileStepsVisualization = page.locator('.conversion-progress__steps--mobile');
  }
  
  /**
   * Navigiert zur Dokumentenkonverter-Seite.
   */
  async goto() {
    await this.page.goto('/document-converter');
  }
  
  /**
   * Alternative Navigationsmethode für Tests
   */
  async navigate() {
    await this.goto();
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
  
  /**
   * Wechselt zwischen Einzel- und Batch-Upload-Modus
   * @param mode Der Modus ('single' oder 'batch')
   */
  async switchToUploadMode(mode: 'single' | 'batch') {
    if (mode === 'single') {
      await this.uploadTab.click();
    } else {
      await this.batchUploadTab.click();
    }
    
    // Warten auf den Moduswechsel
    if (mode === 'single') {
      await expect(this.singleUploadDropZone).toBeVisible();
    } else {
      await expect(this.batchUploadDropZone).toBeVisible();
    }
  }
  
  /**
   * Gibt zurück, ob Dokumente in der Liste vorhanden sind
   */
  async hasDocuments(): Promise<boolean> {
    const count = await this.page.locator(this.documentItems).count();
    return count > 0;
  }
  
  /**
   * Simuliert eine Wischgeste auf einem Dokumenten-Element
   * @param direction Richtung des Wischens ('left' oder 'right')
   * @param documentIndex Index des Dokuments (0-basiert)
   */
  async simulateSwipe(direction: 'left' | 'right', documentIndex: number) {
    const documents = this.page.locator(this.documentItems);
    const count = await documents.count();
    
    if (documentIndex >= 0 && documentIndex < count) {
      const documentElement = documents.nth(documentIndex);
      const box = await documentElement.boundingBox();
      
      if (box) {
        const startX = direction === 'left' ? box.x + box.width * 0.8 : box.x + box.width * 0.2;
        const endX = direction === 'left' ? box.x + box.width * 0.2 : box.x + box.width * 0.8;
        const middleY = box.y + box.height / 2;
        
        // TouchScreen API verwenden für Touch-Gesten
        await this.page.touchscreen.tap(startX, middleY);
        await this.page.mouse.move(startX, middleY);
        await this.page.mouse.down();
        await this.page.mouse.move(endX, middleY, { steps: 10 });
        await this.page.mouse.up();
      }
    }
  }
  
  /**
   * Ermittelt die Größe eines Elements
   * @param locator Locator für das Element
   * @returns Objekt mit Breite und Höhe
   */
  async getElementSize(locator: Locator): Promise<{ width: number, height: number }> {
    const box = await locator.boundingBox();
    
    if (!box) {
      throw new Error('Element ist nicht sichtbar oder hat keine Größe');
    }
    
    return {
      width: box.width,
      height: box.height
    };
  }
  
  /**
   * Startet eine Dummy-Konvertierung für Tests
   * Verwendet Mock-Daten, um den Konversionsprozess zu simulieren
   */
  async startDummyConversion() {
    // Mock-Konversion über JavaScript ausführen
    await this.page.evaluate(() => {
      // Event auslösen, das die Konversion simuliert
      const mockEvent = new CustomEvent('test:start-conversion', {
        detail: { mockId: 'test-mock-conversion' }
      });
      document.dispatchEvent(mockEvent);
    });
    
    // Warten auf Konversionsprozess-Anzeige
    await expect(this.conversionProgress).toBeVisible({ timeout: 5000 });
  }
  
  /**
   * Prüft, ob die Seite ein mobiles Layout verwendet
   * @returns True wenn mobiles Layout aktiv ist, sonst false
   */
  async isMobileLayoutActive(): Promise<boolean> {
    return await this.mobileLayout.isVisible();
  }
  
  /**
   * Prüft, ob die Touch-Erkennungsfunktion aktiv ist
   */
  async isTouchModeActive(): Promise<boolean> {
    return await this.page.locator('body.using-touch').isVisible();
  }
  
  /**
   * Prüft, ob der Tastatur-Navigationsmodus aktiv ist
   */
  async isKeyboardModeActive(): Promise<boolean> {
    return await this.page.locator('body.using-keyboard').isVisible();
  }
}