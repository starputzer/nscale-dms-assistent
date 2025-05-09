/**
 * End-to-End-Tests für die Feature-Toggles im Admin-Bereich.
 */
import { test, expect } from '@playwright/test';
import { AdminPage } from '../../pages/admin-page';

// Tests mit Administrator-Anmeldedaten ausführen
test.describe('Feature-Toggles im Admin-Bereich', () => {
  // Administrator-Authentifizierungsdaten für jeden Test verwenden
  test.use({ storageState: './e2e/fixtures/admin-auth.json' });
  
  // Test für das Aktivieren eines Feature-Toggles
  test('Aktivieren eines Feature-Toggles', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await page.goto('/');
    
    // Admin-Panel öffnen
    await adminPage.openAdminPanel();
    
    // Zum Feature-Toggles-Tab wechseln
    await adminPage.switchToTab('features');
    
    // Feature-Toggle aktivieren
    await adminPage.toggleFeature('useSfcDocConverter', true);
    
    // Prüfen, ob der Toggle aktiviert wurde
    await adminPage.expectFeatureEnabled('useSfcDocConverter', true);
    
    // Admin-Panel schließen
    await adminPage.closeAdminPanel();
  });
  
  // Test für das Deaktivieren eines Feature-Toggles
  test('Deaktivieren eines Feature-Toggles', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await page.goto('/');
    
    // Admin-Panel öffnen
    await adminPage.openAdminPanel();
    
    // Zum Feature-Toggles-Tab wechseln
    await adminPage.switchToTab('features');
    
    // Feature-Toggle deaktivieren
    await adminPage.toggleFeature('useSfcDocConverter', false);
    
    // Prüfen, ob der Toggle deaktiviert wurde
    await adminPage.expectFeatureEnabled('useSfcDocConverter', false);
    
    // Admin-Panel schließen
    await adminPage.closeAdminPanel();
  });
  
  // Test für die direkte Auswirkung eines Feature-Toggles auf die Anwendung
  test('Auswirkung eines Feature-Toggles auf die Anwendung', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await page.goto('/');
    
    // Admin-Panel öffnen
    await adminPage.openAdminPanel();
    
    // Zum Feature-Toggles-Tab wechseln
    await adminPage.switchToTab('features');
    
    // Feature-Toggle für Vue 3 SFC DocConverter aktivieren
    await adminPage.toggleFeature('useSfcDocConverter', true);
    
    // Prüfen, ob der Toggle aktiviert wurde
    await adminPage.expectFeatureEnabled('useSfcDocConverter', true);
    
    // Admin-Panel schließen
    await adminPage.closeAdminPanel();
    
    // Zur Dokumentenkonverter-Seite navigieren
    await page.goto('/document-converter');
    
    // Prüfen, ob die Vue 3 SFC-Version des Dokumentenkonverters angezeigt wird
    await expect(page.locator('.doc-converter-container.v3')).toBeVisible();
    
    // Zurück zum Admin-Panel
    await page.goto('/');
    await adminPage.openAdminPanel();
    await adminPage.switchToTab('features');
    
    // Feature-Toggle für Vue 3 SFC DocConverter deaktivieren
    await adminPage.toggleFeature('useSfcDocConverter', false);
    
    // Prüfen, ob der Toggle deaktiviert wurde
    await adminPage.expectFeatureEnabled('useSfcDocConverter', false);
    
    // Admin-Panel schließen
    await adminPage.closeAdminPanel();
    
    // Zur Dokumentenkonverter-Seite navigieren
    await page.goto('/document-converter');
    
    // Prüfen, ob die Legacy-Version des Dokumentenkonverters angezeigt wird
    await expect(page.locator('.doc-converter-container.legacy')).toBeVisible();
  });
  
  // Test für das Speichern und Anwenden mehrerer Feature-Toggles gleichzeitig
  test('Speichern und Anwenden mehrerer Feature-Toggles gleichzeitig', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await page.goto('/');
    
    // Admin-Panel öffnen
    await adminPage.openAdminPanel();
    
    // Zum Feature-Toggles-Tab wechseln
    await adminPage.switchToTab('features');
    
    // Status von Feature-Toggles vor den Änderungen speichern
    const sfcDocConverterInitialState = await page.locator('input[name="useSfcDocConverter"]').isChecked();
    const sfcChatInitialState = await page.locator('input[name="useSfcChat"]').isChecked();
    
    // Beide Feature-Toggles ändern
    await page.locator('input[name="useSfcDocConverter"]').setChecked(!sfcDocConverterInitialState);
    await page.locator('input[name="useSfcChat"]').setChecked(!sfcChatInitialState);
    
    // Änderungen speichern
    await page.click('button[aria-label="Einstellungen speichern"]');
    
    // Prüfen, ob eine Bestätigungsmeldung angezeigt wird
    await expect(page.locator('.success-message')).toBeVisible();
    
    // Prüfen, ob die Toggles den neuen Status haben
    await expect(page.locator('input[name="useSfcDocConverter"]')).toBeChecked({ checked: !sfcDocConverterInitialState });
    await expect(page.locator('input[name="useSfcChat"]')).toBeChecked({ checked: !sfcChatInitialState });
    
    // Zurücksetzen auf ursprünglichen Zustand
    await page.locator('input[name="useSfcDocConverter"]').setChecked(sfcDocConverterInitialState);
    await page.locator('input[name="useSfcChat"]').setChecked(sfcChatInitialState);
    await page.click('button[aria-label="Einstellungen speichern"]');
    
    // Admin-Panel schließen
    await adminPage.closeAdminPanel();
  });
});