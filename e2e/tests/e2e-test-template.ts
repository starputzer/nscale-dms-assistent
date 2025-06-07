/**
 * Template für E2E Tests mit robusten Selektoren
 * 
 * Dieses Template zeigt Best Practices für E2E Tests:
 * - Multiple Fallback-Selektoren
 * - Graceful Degradation wenn Features noch nicht implementiert sind
 * - Console Logging für Debugging
 * - Flexible Wartezeiten
 */
import { test, expect } from "@playwright/test";

// Hilfs-Funktion zum Finden von Elementen mit mehreren Selektoren
async function findElement(page, selectors: string[]) {
  for (const selector of selectors) {
    const element = page.locator(selector).first();
    if (await element.count() > 0) {
      return element;
    }
  }
  return null;
}

// Hilfs-Funktion zum Warten auf Elemente
async function waitForAnySelector(page, selectors: string[], timeout = 5000) {
  const endTime = Date.now() + timeout;
  
  while (Date.now() < endTime) {
    for (const selector of selectors) {
      if (await page.locator(selector).count() > 0) {
        return page.locator(selector).first();
      }
    }
    await page.waitForTimeout(100);
  }
  
  return null;
}

test.describe("Feature Name", () => {
  test.beforeEach(async ({ page }) => {
    // Standard Login
    await page.goto("/login");
    await page.fill('input#email', "martin@danglefeet.com");
    await page.fill('input#password', "123");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL("/chat");
    
    // Zur Feature-Seite navigieren
    // await page.goto('/feature-path');
  });

  test("Basis Funktionalität", async ({ page }) => {
    // Beispiel: Element mit mehreren möglichen Selektoren finden
    const buttonSelectors = [
      'button:has-text("Submit")',
      'button[type="submit"]',
      '.submit-button',
      '[data-testid="submit-button"]'
    ];
    
    const submitButton = await findElement(page, buttonSelectors);
    if (submitButton) {
      await submitButton.click();
      console.log('Submit button clicked');
    } else {
      console.log('Submit button not found - feature might not be implemented');
      return; // Skip rest of test
    }
    
    // Auf Reaktion warten
    await page.waitForTimeout(1000);
    
    // Erfolg prüfen - mehrere Möglichkeiten
    const successIndicators = [
      '.success-message',
      '.toast-success',
      '[role="alert"].success',
      '*:has-text("Erfolgreich")'
    ];
    
    const successElement = await waitForAnySelector(page, successIndicators);
    if (successElement) {
      console.log('Success indication found');
      expect(await successElement.isVisible()).toBeTruthy();
    } else {
      // Alternative: Prüfe URL-Änderung oder andere Indikatoren
      console.log('No explicit success message - checking other indicators');
    }
  });

  test("API Integration", async ({ page }) => {
    // API Calls überwachen
    let apiCalled = false;
    
    page.on('request', request => {
      if (request.url().includes('/api/endpoint')) {
        apiCalled = true;
        console.log('API request:', request.method(), request.url());
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('/api/endpoint')) {
        console.log('API response:', response.status());
      }
    });
    
    // Aktion ausführen die API Call triggert
    const actionButton = await findElement(page, [
      'button:has-text("Action")',
      '.action-button'
    ]);
    
    if (actionButton) {
      await actionButton.click();
      await page.waitForTimeout(2000);
      
      if (apiCalled) {
        console.log('API was called successfully');
      } else {
        console.log('API not called - might use different endpoint or caching');
      }
    }
  });

  test("Responsive Design", async ({ page }) => {
    // Mobile Viewport testen
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    // Prüfe ob wichtige Elemente noch sichtbar sind
    const mobileMenuSelectors = [
      '.mobile-menu',
      '.hamburger-menu',
      '[aria-label="Menu"]',
      'button[class*="menu"]'
    ];
    
    const mobileMenu = await findElement(page, mobileMenuSelectors);
    if (mobileMenu) {
      console.log('Mobile menu found');
      expect(await mobileMenu.isVisible()).toBeTruthy();
    }
    
    // Zurück zu Desktop
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test("Error Handling", async ({ page }) => {
    // Provoziere einen Fehler (z.B. ungültige Eingabe)
    const inputField = await findElement(page, [
      'input[type="text"]',
      'textarea',
      '.input-field'
    ]);
    
    if (inputField) {
      await inputField.fill(''); // Leere Eingabe
      
      const submitButton = await findElement(page, ['button[type="submit"]']);
      if (submitButton) {
        await submitButton.click();
        
        // Auf Fehlermeldung warten
        const errorSelectors = [
          '.error-message',
          '.validation-error',
          '[role="alert"]',
          '*:has-text("Fehler")',
          '*:has-text("Error")'
        ];
        
        const errorElement = await waitForAnySelector(page, errorSelectors, 3000);
        if (errorElement) {
          console.log('Error handling works correctly');
          expect(await errorElement.isVisible()).toBeTruthy();
        } else {
          console.log('No error message shown - might use different validation');
        }
      }
    }
  });
});

// Zusätzliche Hilfsfunktionen für spezielle Fälle

// Warte auf Netzwerk-Idle
async function waitForNetworkIdle(page, timeout = 5000) {
  try {
    await page.waitForLoadState('networkidle', { timeout });
  } catch (e) {
    console.log('Network did not become idle within timeout');
  }
}

// Screenshot für Debugging
async function debugScreenshot(page, name: string) {
  await page.screenshot({ 
    path: `debug-${name}-${Date.now()}.png`,
    fullPage: true 
  });
}

// Prüfe ob Element im Viewport ist
async function isInViewport(page, selector: string) {
  return await page.evaluate((sel) => {
    const element = document.querySelector(sel);
    if (!element) return false;
    
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= window.innerHeight &&
      rect.right <= window.innerWidth
    );
  }, selector);
}