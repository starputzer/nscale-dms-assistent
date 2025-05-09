/**
 * End-to-End-Tests für die Benutzerverwaltung im Admin-Bereich.
 */
import { test, expect } from '@playwright/test';
import { AdminPage } from '../../pages/admin-page';
import { generateRandomString } from '../../utils/test-helpers';

// Tests mit Administrator-Anmeldedaten ausführen
test.describe('Benutzerverwaltung im Admin-Bereich', () => {
  // Administrator-Authentifizierungsdaten für jeden Test verwenden
  test.use({ storageState: './e2e/fixtures/admin-auth.json' });
  
  // Test für das Erstellen eines neuen Benutzers
  test('Erstellen eines neuen Benutzers', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await page.goto('/');
    
    // Admin-Panel öffnen
    await adminPage.openAdminPanel();
    
    // Zum Benutzer-Tab wechseln
    await adminPage.switchToTab('users');
    
    // Neuen Benutzer erstellen
    const username = generateRandomString('testuser_', 6);
    const password = 'test123';
    await adminPage.createUser(username, password, 'user');
    
    // Prüfen, ob der Benutzer erstellt wurde
    await adminPage.expectUserExists(username);
    
    // Aufräumen: Benutzer löschen
    await adminPage.deleteUser(username);
  });
  
  // Test für das Löschen eines Benutzers
  test('Löschen eines Benutzers', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await page.goto('/');
    
    // Admin-Panel öffnen
    await adminPage.openAdminPanel();
    
    // Zum Benutzer-Tab wechseln
    await adminPage.switchToTab('users');
    
    // Neuen Benutzer erstellen
    const username = generateRandomString('testuser_', 6);
    const password = 'test123';
    await adminPage.createUser(username, password, 'user');
    
    // Prüfen, ob der Benutzer erstellt wurde
    await adminPage.expectUserExists(username);
    
    // Benutzer löschen
    await adminPage.deleteUser(username);
    
    // Prüfen, ob der Benutzer gelöscht wurde
    await expect(page.locator(`.user-row:has-text("${username}")`)).not.toBeVisible();
  });
  
  // Test für das Ändern der Benutzerrolle
  test('Ändern der Benutzerrolle', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await page.goto('/');
    
    // Admin-Panel öffnen
    await adminPage.openAdminPanel();
    
    // Zum Benutzer-Tab wechseln
    await adminPage.switchToTab('users');
    
    // Neuen Benutzer erstellen
    const username = generateRandomString('testuser_', 6);
    const password = 'test123';
    await adminPage.createUser(username, password, 'user');
    
    // Prüfen, ob der Benutzer erstellt wurde
    await adminPage.expectUserExists(username);
    
    // Benutzerrolle ändern
    const userRow = page.locator(`.user-row:has-text("${username}")`);
    await userRow.locator('select[name="role"]').selectOption('admin');
    await page.click('button[aria-label="Änderungen speichern"]');
    
    // Prüfen, ob die Rolle geändert wurde
    await expect(userRow.locator('select[name="role"]')).toHaveValue('admin');
    
    // Aufräumen: Benutzer löschen
    await adminPage.deleteUser(username);
  });
  
  // Test für das Ändern des Benutzerpassworts
  test('Ändern des Benutzerpassworts', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await page.goto('/');
    
    // Admin-Panel öffnen
    await adminPage.openAdminPanel();
    
    // Zum Benutzer-Tab wechseln
    await adminPage.switchToTab('users');
    
    // Neuen Benutzer erstellen
    const username = generateRandomString('testuser_', 6);
    const password = 'test123';
    await adminPage.createUser(username, password, 'user');
    
    // Prüfen, ob der Benutzer erstellt wurde
    await adminPage.expectUserExists(username);
    
    // Passwort ändern
    const userRow = page.locator(`.user-row:has-text("${username}")`);
    await userRow.locator('button[aria-label="Passwort ändern"]').click();
    
    // Neues Passwort eingeben
    await page.fill('.password-dialog input[name="password"]', 'neuesPasswort123');
    await page.click('.password-dialog button[type="submit"]');
    
    // Prüfen, ob eine Bestätigungsmeldung angezeigt wird
    await expect(page.locator('.success-message')).toBeVisible();
    
    // Aufräumen: Benutzer löschen
    await adminPage.deleteUser(username);
  });
  
  // Test für die Benutzersuche
  test('Benutzer suchen', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await page.goto('/');
    
    // Admin-Panel öffnen
    await adminPage.openAdminPanel();
    
    // Zum Benutzer-Tab wechseln
    await adminPage.switchToTab('users');
    
    // Benutzeranzahl vor dem Filtern zählen
    const initialUserCount = await page.locator('.user-row').count();
    
    // Suchbegriff eingeben
    await page.fill('input[placeholder="Benutzer suchen..."]', 'admin');
    
    // Prüfen, ob die Liste gefiltert wurde
    await expect(page.locator('.user-row:has-text("admin")')).toBeVisible();
    
    // Suchfeld leeren
    await page.fill('input[placeholder="Benutzer suchen..."]', '');
    
    // Prüfen, ob wieder alle Benutzer angezeigt werden
    await expect(page.locator('.user-row')).toHaveCount(initialUserCount);
  });
});