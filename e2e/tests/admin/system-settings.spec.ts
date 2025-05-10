/**
 * End-to-End-Tests für die Systemeinstellungen im Admin-Bereich.
 * 
 * Diese Tests überprüfen verschiedene Funktionen der Systemeinstellungen:
 * - Speichern und Anwenden von Systemeinstellungen
 * - Anzeige und Änderung von Loglevels
 * - Konfiguration der Dokumentenkonverter-Einstellungen
 * - Speicherverwaltung und Cache-Einstellungen
 * - Validierung von Eingabefeldern
 */
import { test, expect } from '@playwright/test';
import { AdminPage } from '../../pages/admin-page';

// Tests mit Administrator-Anmeldedaten ausführen
test.describe('Systemeinstellungen im Admin-Bereich', () => {
  // Administrator-Authentifizierungsdaten für jeden Test verwenden
  test.use({ storageState: './e2e/fixtures/admin-auth.json' });
  
  // Test für das Ändern des System-Loglevels
  test('Ändern des System-Loglevels', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await page.goto('/');
    
    // Admin-Panel öffnen
    await adminPage.openAdminPanel();
    
    // Zum System-Tab wechseln
    await adminPage.switchToTab('system');
    
    // Aktuellen Loglevel speichern, um ihn später wiederherzustellen
    const initialLoglevel = await page.locator('select[name="loglevel"]').inputValue();
    
    // Loglevel ändern
    await page.selectOption('select[name="loglevel"]', 'debug');
    
    // Speichern-Button klicken
    await page.click('button[aria-label="Einstellungen speichern"]');
    
    // Prüfen, ob eine Erfolgsmeldung angezeigt wird
    await expect(page.locator('.success-message')).toBeVisible();
    
    // Prüfen, ob der Loglevel geändert wurde
    await expect(page.locator('select[name="loglevel"]')).toHaveValue('debug');
    
    // Zurücksetzen auf ursprünglichen Wert
    await page.selectOption('select[name="loglevel"]', initialLoglevel);
    await page.click('button[aria-label="Einstellungen speichern"]');
    
    // Admin-Panel schließen
    await adminPage.closeAdminPanel();
  });
  
  // Test für das Ändern der API-Timeouts
  test('Konfiguration von API-Timeouts', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await page.goto('/');
    
    // Admin-Panel öffnen
    await adminPage.openAdminPanel();
    
    // Zum System-Tab wechseln
    await adminPage.switchToTab('system');
    
    // Aktuellen API-Timeout-Wert speichern
    const initialApiTimeout = await page.locator('input[name="apiTimeout"]').inputValue();
    
    // API-Timeout ändern
    await page.fill('input[name="apiTimeout"]', '15000');
    
    // Speichern-Button klicken
    await page.click('button[aria-label="Einstellungen speichern"]');
    
    // Prüfen, ob eine Erfolgsmeldung angezeigt wird
    await expect(page.locator('.success-message')).toBeVisible();
    
    // Prüfen, ob der Timeout geändert wurde
    await expect(page.locator('input[name="apiTimeout"]')).toHaveValue('15000');
    
    // Zurücksetzen auf ursprünglichen Wert
    await page.fill('input[name="apiTimeout"]', initialApiTimeout);
    await page.click('button[aria-label="Einstellungen speichern"]');
    
    // Admin-Panel schließen
    await adminPage.closeAdminPanel();
  });
  
  // Test für das Konfigurieren der maximalen Dokumentgröße
  test('Konfiguration der maximalen Dokumentgröße', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await page.goto('/');
    
    // Admin-Panel öffnen
    await adminPage.openAdminPanel();
    
    // Zum System-Tab wechseln
    await adminPage.switchToTab('system');
    
    // Aktuellen Wert für maximale Dokumentgröße speichern
    const initialMaxDocSize = await page.locator('input[name="maxDocumentSize"]').inputValue();
    
    // Maximale Dokumentgröße ändern
    await page.fill('input[name="maxDocumentSize"]', '20');
    
    // Speichern-Button klicken
    await page.click('button[aria-label="Einstellungen speichern"]');
    
    // Prüfen, ob eine Erfolgsmeldung angezeigt wird
    await expect(page.locator('.success-message')).toBeVisible();
    
    // Prüfen, ob der Wert geändert wurde
    await expect(page.locator('input[name="maxDocumentSize"]')).toHaveValue('20');
    
    // Zurücksetzen auf ursprünglichen Wert
    await page.fill('input[name="maxDocumentSize"]', initialMaxDocSize);
    await page.click('button[aria-label="Einstellungen speichern"]');
    
    // Admin-Panel schließen
    await adminPage.closeAdminPanel();
  });
  
  // Test für das Aktivieren/Deaktivieren der Fehlerprotokollierung
  test('Aktivieren und Deaktivieren der erweiterten Fehlerprotokollierung', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await page.goto('/');
    
    // Admin-Panel öffnen
    await adminPage.openAdminPanel();
    
    // Zum System-Tab wechseln
    await adminPage.switchToTab('system');
    
    // Aktuellen Status der erweiterten Fehlerprotokollierung speichern
    const enableDetailedLogging = await page.locator('input[name="enableDetailedLogging"]').isChecked();
    
    // Status umkehren
    await page.locator('input[name="enableDetailedLogging"]').setChecked(!enableDetailedLogging);
    
    // Speichern-Button klicken
    await page.click('button[aria-label="Einstellungen speichern"]');
    
    // Prüfen, ob eine Erfolgsmeldung angezeigt wird
    await expect(page.locator('.success-message')).toBeVisible();
    
    // Prüfen, ob der Status geändert wurde
    await expect(page.locator('input[name="enableDetailedLogging"]')).toBeChecked({ checked: !enableDetailedLogging });
    
    // Zurücksetzen auf ursprünglichen Wert
    await page.locator('input[name="enableDetailedLogging"]').setChecked(enableDetailedLogging);
    await page.click('button[aria-label="Einstellungen speichern"]');
    
    // Admin-Panel schließen
    await adminPage.closeAdminPanel();
  });
  
  // Test für das Zurücksetzen der Einstellungen auf Standardwerte
  test('Zurücksetzen der Einstellungen auf Standardwerte', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await page.goto('/');
    
    // Admin-Panel öffnen
    await adminPage.openAdminPanel();
    
    // Zum System-Tab wechseln
    await adminPage.switchToTab('system');
    
    // Auf "Zurücksetzen" klicken
    await page.click('button[aria-label="Auf Standardwerte zurücksetzen"]');
    
    // Bestätigungsdialog bestätigen
    await page.click('.confirm-dialog button.confirm');
    
    // Prüfen, ob eine Erfolgsmeldung angezeigt wird
    await expect(page.locator('.success-message')).toBeVisible();
    await expect(page.locator('.success-message')).toContainText('Standardwerte');
    
    // Prüfen, ob die Standardwerte wiederhergestellt wurden
    await expect(page.locator('select[name="loglevel"]')).toHaveValue('info');
    await expect(page.locator('input[name="apiTimeout"]')).toHaveValue('10000');
    await expect(page.locator('input[name="maxDocumentSize"]')).toHaveValue('50');
    
    // Admin-Panel schließen
    await adminPage.closeAdminPanel();
  });
  
  // Test für die Validierung von Eingaben
  test('Validierung von ungültigen Systemeingaben', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await page.goto('/');
    
    // Admin-Panel öffnen
    await adminPage.openAdminPanel();
    
    // Zum System-Tab wechseln
    await adminPage.switchToTab('system');
    
    // Ungültigen Wert für API-Timeout eingeben (negativ)
    await page.fill('input[name="apiTimeout"]', '-1000');
    
    // Speichern-Button klicken
    await page.click('button[aria-label="Einstellungen speichern"]');
    
    // Prüfen, ob eine Fehlermeldung angezeigt wird
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('ungültig');
    
    // Ungültigen Wert für maximale Dokumentgröße eingeben (zu groß)
    await page.fill('input[name="apiTimeout"]', '5000'); // Korrekter Wert für API-Timeout
    await page.fill('input[name="maxDocumentSize"]', '1001'); // Größer als erlaubt
    
    // Speichern-Button klicken
    await page.click('button[aria-label="Einstellungen speichern"]');
    
    // Prüfen, ob eine Fehlermeldung angezeigt wird
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('Limit');
    
    // Admin-Panel schließen (ohne Speichern)
    await adminPage.closeAdminPanel();
  });
  
  // Test für das Aktivieren des Wartungsmodus
  test('Aktivieren und Deaktivieren des Wartungsmodus', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await page.goto('/');
    
    // Admin-Panel öffnen
    await adminPage.openAdminPanel();
    
    // Zum System-Tab wechseln
    await adminPage.switchToTab('system');
    
    // Aktuellen Status des Wartungsmodus speichern
    const maintenanceMode = await page.locator('input[name="maintenanceMode"]').isChecked();
    
    // Wartungsmodus aktivieren
    await page.locator('input[name="maintenanceMode"]').setChecked(true);
    
    // Speichern-Button klicken
    await page.click('button[aria-label="Einstellungen speichern"]');
    
    // Wartungsmodus-Aktivierung bestätigen
    await page.click('.confirm-dialog button.confirm');
    
    // Prüfen, ob eine Erfolgsmeldung angezeigt wird
    await expect(page.locator('.success-message')).toBeVisible();
    
    // Prüfen, ob der Wartungsmodus aktiviert wurde
    await expect(page.locator('input[name="maintenanceMode"]')).toBeChecked();
    
    // Prüfen, ob die Wartungsmodus-Nachricht auf der Seite angezeigt wird
    await adminPage.closeAdminPanel();
    await expect(page.locator('.maintenance-banner')).toBeVisible();
    
    // Wieder zum Admin-Panel und Wartungsmodus deaktivieren
    await adminPage.openAdminPanel();
    await adminPage.switchToTab('system');
    await page.locator('input[name="maintenanceMode"]').setChecked(false);
    await page.click('button[aria-label="Einstellungen speichern"]');
    
    // Prüfen, ob der Wartungsmodus deaktiviert wurde
    await expect(page.locator('input[name="maintenanceMode"]')).not.toBeChecked();
    
    // Prüfen, ob die Wartungsmodus-Nachricht verschwunden ist
    await adminPage.closeAdminPanel();
    await expect(page.locator('.maintenance-banner')).not.toBeVisible();
  });
  
  // Test für das Einsehen des System-Logs
  test('Einsehen und Filtern des System-Logs', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await page.goto('/');
    
    // Admin-Panel öffnen
    await adminPage.openAdminPanel();
    
    // Zum System-Tab wechseln
    await adminPage.switchToTab('system');
    
    // Auf den "Logs anzeigen" Button klicken
    await page.click('button[aria-label="Systemlogs anzeigen"]');
    
    // Warten, bis die Logs geladen sind
    await expect(page.locator('.log-viewer')).toBeVisible();
    await expect(page.locator('.log-entry')).toHaveCount.greaterThan(0);
    
    // Log-Einträge zählen
    const initialLogCount = await page.locator('.log-entry').count();
    
    // Nach "ERROR" filtern
    await page.fill('input[placeholder="Log filtern..."]', 'ERROR');
    
    // Warten, bis die gefilterten Logs angezeigt werden
    await page.waitForTimeout(500); // Kurze Wartezeit für Filter-Anwendung
    
    // Entweder erwarten, dass gefilterte Logs angezeigt werden oder keine Fehler vorhanden sind
    const filteredLogCount = await page.locator('.log-entry').count();
    
    // Filter zurücksetzen
    await page.fill('input[placeholder="Log filtern..."]', '');
    
    // Warten, bis alle Logs wieder angezeigt werden
    await page.waitForTimeout(500);
    
    // Prüfen, ob wieder alle Log-Einträge angezeigt werden
    await expect(page.locator('.log-entry')).toHaveCount(initialLogCount);
    
    // Log-Viewer schließen
    await page.click('button[aria-label="Schließen"]');
    
    // Admin-Panel schließen
    await adminPage.closeAdminPanel();
  });
});