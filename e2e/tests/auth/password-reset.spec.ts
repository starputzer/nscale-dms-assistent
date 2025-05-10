/**
 * End-to-End-Tests für den Passwort-Reset-Flow.
 */
import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/login-page';

test.describe('Passwort-Reset-Flow', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    // Zur Login-Seite navigieren
    await loginPage.goto();
  });

  // Test für den Passwort-Reset-Prozess
  test('Auslösen des Passwort-Reset-Prozesses', async ({ page }) => {
    // Zum Passwort vergessen Link navigieren
    await loginPage.navigateToForgotPassword();
    
    // E-Mail-Adresse für Passwort-Reset eingeben
    const testEmail = 'test@example.com';
    await loginPage.requestPasswordReset(testEmail);
    
    // Prüfen, ob eine Bestätigungsmeldung angezeigt wird
    await expect(page.locator('.success-message')).toBeVisible();
    await expect(page.locator('.success-message')).toContainText('E-Mail gesendet');
  });

  // Test für ungültige E-Mail-Adresse beim Passwort-Reset
  test('Ungültige E-Mail-Adresse beim Passwort-Reset', async ({ page }) => {
    // Zum Passwort vergessen Link navigieren
    await loginPage.navigateToForgotPassword();
    
    // Ungültige E-Mail-Adresse eingeben
    await loginPage.requestPasswordReset('invalid-email');
    
    // Prüfen, ob eine Fehlermeldung angezeigt wird
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('Ungültige E-Mail-Adresse');
  });

  // Test für das Zurücksetzen des Passworts mit einem Token
  test('Passwort mit Token zurücksetzen', async ({ page }) => {
    // Simulieren des Aufrufs einer Reset-URL mit Token
    const resetToken = 'test-reset-token-123456';
    await page.goto(`/reset-password?token=${resetToken}`);
    
    // Neues Passwort eingeben
    const newPassword = 'NewSecurePassword123!';
    await loginPage.resetPassword(newPassword, newPassword);
    
    // Prüfen, ob eine Erfolgsmeldung angezeigt wird
    await expect(page.locator('.success-message')).toBeVisible();
    await expect(page.locator('.success-message')).toContainText('Passwort zurückgesetzt');
    
    // Prüfen, ob zur Login-Seite weitergeleitet wird
    await expect(page).toHaveURL(/.*\/login/);
  });

  // Test für nicht übereinstimmende Passwörter beim Reset
  test('Nicht übereinstimmende Passwörter beim Reset', async ({ page }) => {
    // Simulieren des Aufrufs einer Reset-URL mit Token
    const resetToken = 'test-reset-token-123456';
    await page.goto(`/reset-password?token=${resetToken}`);
    
    // Nicht übereinstimmende Passwörter eingeben
    await loginPage.resetPassword('Password123!', 'DifferentPassword123!');
    
    // Prüfen, ob eine Fehlermeldung angezeigt wird
    await expect(page.locator('.password-match-error')).toBeVisible();
    await expect(page.locator('.password-match-error')).toContainText('Passwörter stimmen nicht überein');
  });

  // Test für ungültigen Reset-Token
  test('Ungültiger Reset-Token', async ({ page }) => {
    // Simulieren des Aufrufs einer Reset-URL mit ungültigem Token
    const invalidToken = 'invalid-token';
    await page.goto(`/reset-password?token=${invalidToken}`);
    
    // Neues Passwort eingeben
    const newPassword = 'NewSecurePassword123!';
    await loginPage.resetPassword(newPassword, newPassword);
    
    // Prüfen, ob eine Fehlermeldung angezeigt wird
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('Ungültiger oder abgelaufener Token');
  });
});