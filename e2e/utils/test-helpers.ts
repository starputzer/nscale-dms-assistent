/**
 * Hilfsfunktionen für Tests.
 */
import { Page, expect } from '@playwright/test';

/**
 * Wartet auf das Ende eines Netzwerk-Idle-Zustands.
 * Hilfreich, wenn auf Aktualisierungen nach API-Anfragen gewartet werden soll.
 */
export async function waitForNetworkIdle(page: Page, timeout = 5000) {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Prüft, ob ein Element sichtbar ist und klickt darauf.
 * Kombiniert die üblichen Schritte expect(element).toBeVisible() und page.click().
 */
export async function expectAndClick(page: Page, selector: string) {
  const element = page.locator(selector);
  await expect(element).toBeVisible();
  await element.click();
}

/**
 * Zufälligen String für Testdaten generieren.
 */
export function generateRandomString(prefix = '', length = 6) {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = prefix;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

/**
 * Simuliert Verzögerungen im Netzwerk.
 * Nützlich, um langsame Netzwerkverbindungen zu testen.
 */
export async function simulateNetworkDelay(page: Page, delay = 500) {
  await page.route('**/*', async (route) => {
    await new Promise(resolve => setTimeout(resolve, delay));
    await route.continue();
  });
}

/**
 * Simuliert Netzwerkfehler für bestimmte Anfragen.
 * @param page Playwright Page
 * @param urlPattern URL-Muster, für das Fehler simuliert werden sollen
 * @param errorRate Anteil der Anfragen, die fehlschlagen sollen (0-1)
 */
export async function simulateNetworkErrors(page: Page, urlPattern: string, errorRate = 0.5) {
  await page.route(urlPattern, async (route) => {
    if (Math.random() < errorRate) {
      await route.abort('failed');
    } else {
      await route.continue();
    }
  });
}

/**
 * Kapselt das Locator-API von Playwright mit zusätzlicher Fehlerprüfung.
 */
export async function findElement(page: Page, selector: string) {
  const element = page.locator(selector);
  const count = await element.count();
  if (count === 0) {
    throw new Error(`Element nicht gefunden: ${selector}`);
  }
  return element;
}

/**
 * Testet, ob ein Element nach einer bestimmten Aktion erscheint oder verschwindet.
 */
export async function expectElementAfterAction(
  page: Page, 
  selector: string, 
  action: () => Promise<void>, 
  shouldAppear = true,
  timeout = 5000
) {
  await action();
  if (shouldAppear) {
    await expect(page.locator(selector)).toBeVisible({ timeout });
  } else {
    await expect(page.locator(selector)).not.toBeVisible({ timeout });
  }
}

/**
 * Füllt ein Formular aus und sendet es ab.
 */
export async function fillAndSubmitForm(page: Page, formFields: Record<string, string>, submitSelector: string) {
  for (const [selector, value] of Object.entries(formFields)) {
    await page.fill(selector, value);
  }
  await page.click(submitSelector);
}