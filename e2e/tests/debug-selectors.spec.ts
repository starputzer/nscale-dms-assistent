import { test, expect } from "@playwright/test";

test.describe("Debug Selectors", () => {
  test("Find correct selectors after login", async ({ page }) => {
    // Login
    await page.goto("/login");
    await page.fill('input#email', 'martin@danglefeet.com');
    await page.fill('input#password', '123');
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await page.waitForTimeout(3000);
    
    // Log current URL
    console.log('Current URL:', page.url());
    
    // Take screenshot
    await page.screenshot({ path: 'after-login.png' });
    
    // Try different selectors
    const selectors = [
      '.chat-container',
      '.chat-view',
      '#chat',
      '.chat-interface',
      '.simple-chat-view',
      '.enhanced-chat-view',
      'main',
      '#app',
      '.chat-input',
      'textarea',
      'input[type="text"]',
      '.message-input',
      '.chat-box'
    ];
    
    for (const selector of selectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        console.log(`✓ Found ${count} elements with selector: ${selector}`);
      } else {
        console.log(`✗ No elements found with selector: ${selector}`);
      }
    }
    
    // Log page content
    const bodyText = await page.locator('body').textContent();
    console.log('Page contains text:', bodyText?.substring(0, 200));
  });
});