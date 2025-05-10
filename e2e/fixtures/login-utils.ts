/**
 * Login-Hilfsfunktionen für E2E-Tests
 */
import { Page } from '@playwright/test';

/**
 * Meldet einen Test-Benutzer an
 * @param page Die Playwright-Page
 * @param username Der Benutzername (Standard: 'user')
 * @param password Das Passwort (Standard: 'user123')
 */
export async function loginAsTestUser(
  page: Page, 
  username: string = 'user', 
  password: string = 'user123'
): Promise<void> {
  // Zur Login-Seite navigieren
  await page.goto('/login');
  
  // Warten bis das Formular geladen ist
  await page.waitForSelector('form');
  
  // Benutzername und Passwort eingeben
  await page.fill('input[name="username"]', username);
  await page.fill('input[name="password"]', password);
  
  // Anmelden-Button klicken
  await page.click('button[type="submit"]');
  
  // Warten bis die Anmeldung abgeschlossen ist (Weiterleitung)
  await page.waitForNavigation();
}

/**
 * Meldet einen Admin-Benutzer an
 * @param page Die Playwright-Page
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  await loginAsTestUser(page, 'admin', 'admin123');
}

/**
 * Abmelden des aktuellen Benutzers
 * @param page Die Playwright-Page
 */
export async function logout(page: Page): Promise<void> {
  // Auf das Benutzermenü klicken
  await page.click('button.user-menu-button');
  
  // Abmelden-Option auswählen
  await page.click('a.logout-link');
  
  // Warten bis die Abmeldung abgeschlossen ist
  await page.waitForNavigation();
}