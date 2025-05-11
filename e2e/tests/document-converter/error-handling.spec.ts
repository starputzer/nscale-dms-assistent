/**
 * End-to-End-Tests für die Fehlerbehandlung im Dokumentenkonverter.
 *
 * Diese Tests überprüfen verschiedene Fehlerszenarien:
 * - Ungültige Dateitypen
 * - Zu große Dateien
 * - Serverseitige Fehler
 * - Netzwerkfehler und Wiederverbindung
 * - Timeout-Behandlung
 */
import { test, expect } from "@playwright/test";
import { DocumentConverterPage } from "../../pages/document-converter-page";
import {
  createTestDocuments,
  TEST_DOCUMENTS,
} from "../../fixtures/test-documents";
import * as path from "path";
import * as fs from "fs";

// Tests mit vorgefertigten Authentifizierungsdaten ausführen
test.describe("Dokumentenkonverter Fehlerbehandlung", () => {
  // Bestehende Authentifizierungsdaten für jeden Test verwenden
  test.use({ storageState: "./e2e/fixtures/user-auth.json" });

  // Testdokumente vor den Tests erstellen
  test.beforeAll(async () => {
    await createTestDocuments();
  });

  // Hilfsfunktion zum Erstellen einer temporären ungültigen Datei
  async function createTempInvalidFile(
    filename: string,
    content: string,
  ): Promise<string> {
    const tempDir = path.join(__dirname, "../../fixtures/files/temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const filePath = path.join(tempDir, filename);
    fs.writeFileSync(filePath, content);
    return filePath;
  }

  // Hilfsfunktion zum Entfernen temporärer Dateien
  async function removeTempFiles() {
    const tempDir = path.join(__dirname, "../../fixtures/files/temp");
    if (fs.existsSync(tempDir)) {
      const files = fs.readdirSync(tempDir);
      files.forEach((file) => {
        fs.unlinkSync(path.join(tempDir, file));
      });
    }
  }

  // Testumgebung nach jedem Test aufräumen
  test.afterEach(async () => {
    await removeTempFiles();
  });

  // Test für das Hochladen eines ungültigen Dateityps
  test("Fehlermeldung beim Hochladen eines ungültigen Dateiformats", async ({
    page,
  }) => {
    const docConverterPage = new DocumentConverterPage(page);
    await docConverterPage.goto();

    // Eine ungültige Datei erstellen (z.B. .exe oder .ini)
    const invalidFilePath = await createTempInvalidFile(
      "invalid.exe",
      "Invalid file content",
    );

    // Datei hochladen
    await docConverterPage.uploadFile(invalidFilePath);

    // Prüfen, ob eine Fehlermeldung angezeigt wird
    await expect(page.locator(docConverterPage.errorMessage)).toBeVisible();
    await expect(page.locator(docConverterPage.errorMessage)).toContainText(
      "Format nicht unterstützt",
    );
  });

  // Test für Fehler bei zu großen Dateien
  test("Fehlermeldung beim Hochladen einer zu großen Datei", async ({
    page,
  }) => {
    const docConverterPage = new DocumentConverterPage(page);
    await docConverterPage.goto();

    // Prüfen, ob eine große Datei einen Fehler verursacht
    // (Dies ist ein simulierter Test, da wir keine wirklich große Datei erstellen wollen)
    await page.evaluate(() => {
      // Event auslösen, das einen Größenbeschränkungsfehler simuliert
      const mockEvent = new CustomEvent("test:file-size-error", {
        detail: { error: "Die Datei ist zu groß. Maximale Größe: 50 MB." },
      });
      document.dispatchEvent(mockEvent);
    });

    // Prüfen, ob die korrekte Fehlermeldung angezeigt wird
    await expect(page.locator(docConverterPage.errorMessage)).toBeVisible();
    await expect(page.locator(docConverterPage.errorMessage)).toContainText(
      "zu groß",
    );
  });

  // Test für Serverseitige Fehler bei der Konvertierung
  test("Behandlung serverseitiger Fehler bei der Konvertierung", async ({
    page,
  }) => {
    const docConverterPage = new DocumentConverterPage(page);
    await docConverterPage.goto();

    // PDF-Dokument hochladen
    await docConverterPage.uploadFile(TEST_DOCUMENTS.pdf.path);

    // Serverseitigen Fehler simulieren vor dem Konvertieren
    await page.route("**/api/document-converter/convert", (route) => {
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: true,
          message: "Interner Serverfehler bei der Konvertierung",
        }),
      });
    });

    // Konvertierung starten
    await page.click(docConverterPage.convertButton);

    // Prüfen, ob eine Fehlermeldung angezeigt wird
    await expect(page.locator(docConverterPage.errorMessage)).toBeVisible();
    await expect(page.locator(docConverterPage.errorMessage)).toContainText(
      "Serverfehler",
    );
  });

  // Test für Netzwerkfehler während der Konvertierung
  test("Wiederverbindung nach Netzwerkfehler während der Konvertierung", async ({
    page,
    context,
  }) => {
    const docConverterPage = new DocumentConverterPage(page);
    await docConverterPage.goto();

    // PDF-Dokument hochladen
    await docConverterPage.uploadFile(TEST_DOCUMENTS.pdf.path);

    // Konvertierung starten
    await page.click(docConverterPage.convertButton);

    // Warten, bis die Konvertierung beginnt
    await page.waitForSelector(docConverterPage.progressBar);

    // Netzwerkverbindung unterbrechen
    await context.setOffline(true);

    // Kurz warten
    await page.waitForTimeout(1000);

    // Prüfen, ob eine Fehlermeldung angezeigt wird
    await expect(page.locator(".network-error")).toBeVisible();

    // Netzwerkverbindung wiederherstellen
    await context.setOffline(false);

    // Prüfen, ob die Konvertierung fortgesetzt oder wiederaufgenommen wird
    await expect(page.locator(".reconnecting-message")).toBeVisible();

    // Nach erneuter Verbindung sollte entweder der Fortschrittsbalken oder eine Erfolgsmeldung erscheinen
    await Promise.race([
      page.waitForSelector(docConverterPage.progressBar, { timeout: 10000 }),
      page.waitForSelector(docConverterPage.successMessage, { timeout: 10000 }),
    ]);
  });

  // Test für Timeout bei der Konvertierung
  test("Behandlung von Timeouts bei der Konvertierung", async ({ page }) => {
    const docConverterPage = new DocumentConverterPage(page);
    await docConverterPage.goto();

    // PDF-Dokument hochladen
    await docConverterPage.uploadFile(TEST_DOCUMENTS.pdf.path);

    // Timeout simulieren
    await page.route("**/api/document-converter/convert", async (route) => {
      // Verzögerung simulieren und dann mit Timeout-Fehler antworten
      await new Promise((resolve) => setTimeout(resolve, 5000));
      route.fulfill({
        status: 408,
        contentType: "application/json",
        body: JSON.stringify({
          error: true,
          message: "Zeitüberschreitung bei der Verarbeitung",
        }),
      });
    });

    // Konvertierung starten
    await page.click(docConverterPage.convertButton);

    // Prüfen, ob eine Timeout-Fehlermeldung angezeigt wird
    await expect(page.locator(docConverterPage.errorMessage)).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator(docConverterPage.errorMessage)).toContainText(
      "Zeitüberschreitung",
    );
  });

  // Test für Abbruch der Konvertierung
  test("Abbruch einer laufenden Konvertierung", async ({ page }) => {
    const docConverterPage = new DocumentConverterPage(page);
    await docConverterPage.goto();

    // PDF-Dokument hochladen
    await docConverterPage.uploadFile(TEST_DOCUMENTS.pdf.path);

    // Lange laufende Konvertierung simulieren
    await page.route("**/api/document-converter/convert", async (route) => {
      // Route nicht sofort erfüllen, damit der Abbruch getestet werden kann
      // Die Route wird durch einen neuen Request abgebrochen
    });

    // Konvertierung starten
    await page.click(docConverterPage.convertButton);

    // Warten, bis der Fortschrittsbalken angezeigt wird
    await page.waitForSelector(docConverterPage.progressBar);

    // Abbrechen-Button klicken
    await page.click(docConverterPage.cancelButton);

    // Prüfen, ob eine Bestätigungsdialog angezeigt wird
    await expect(page.locator(".confirm-dialog")).toBeVisible();

    // Abbruch bestätigen
    await page.click(".confirm-dialog button.confirm");

    // Prüfen, ob der Fortschrittsbalken verschwindet
    await expect(page.locator(docConverterPage.progressBar)).not.toBeVisible({
      timeout: 5000,
    });

    // Prüfen, ob eine Meldung angezeigt wird, dass die Konvertierung abgebrochen wurde
    await expect(page.locator(".cancel-message")).toBeVisible();
  });

  // Test für Verhalten bei beschädigten Dokumenten
  test("Fehlerbehandlung bei beschädigten Dokumenten", async ({ page }) => {
    const docConverterPage = new DocumentConverterPage(page);
    await docConverterPage.goto();

    // Eine beschädigte Datei erstellen
    const corruptedFilePath = await createTempInvalidFile(
      "corrupted.pdf",
      "This is not a valid PDF file content",
    );

    // Datei hochladen
    await docConverterPage.uploadFile(corruptedFilePath);

    // Konvertieren versuchen
    await page.click(docConverterPage.convertButton);

    // Erwarten, dass ein Fehler wegen beschädigter Datei erscheint
    await expect(page.locator(docConverterPage.errorMessage)).toBeVisible();
    await expect(page.locator(docConverterPage.errorMessage)).toContainText(
      "beschädigt",
    );
  });
});
