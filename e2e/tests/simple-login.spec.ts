import { test, expect } from "@playwright/test";

test.describe("Simple Login Test", () => {
  test("Login-Seite wird geladen", async ({ page }) => {
    // Zur Login-Seite navigieren
    await page.goto("/login");
    
    // Prüfe ob wir auf der Login-Seite sind
    await expect(page).toHaveURL(/.*login/);
    
    // Screenshot für Debug
    await page.screenshot({ path: 'login-page.png' });
    
    // Prüfe welche Elemente vorhanden sind
    const emailInput = await page.locator('input[type="email"]').isVisible();
    const passwordInput = await page.locator('input[type="password"]').isVisible();
    const submitButton = await page.locator('button[type="submit"]').isVisible();
    
    console.log('Email input visible:', emailInput);
    console.log('Password input visible:', passwordInput);
    console.log('Submit button visible:', submitButton);
    
    // Alternative Selektoren testen
    const emailById = await page.locator('#email').isVisible();
    const passwordById = await page.locator('#password').isVisible();
    
    console.log('Email by ID visible:', emailById);
    console.log('Password by ID visible:', passwordById);
  });
});