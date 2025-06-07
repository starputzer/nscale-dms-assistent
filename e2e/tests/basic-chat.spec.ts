import { test, expect } from "@playwright/test";

test.describe("Basic Chat Functionality", () => {
  test("Can send and receive messages", async ({ page }) => {
    // Login
    await page.goto("/login");
    await page.fill('input#email', 'martin@danglefeet.com');
    await page.fill('input#password', '123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/chat');
    
    // Wait for chat to be ready
    await page.waitForTimeout(2000);
    
    // Look for the chat input - check what's actually on the page
    const possibleInputs = [
      'textarea[placeholder*="Nachricht"]',
      'input[placeholder*="Nachricht"]', 
      'textarea',
      'input[type="text"]',
      '.chat-input',
      '.message-input'
    ];
    
    let inputFound = null;
    for (const selector of possibleInputs) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        inputFound = selector;
        console.log(`Found input with selector: ${selector}`);
        break;
      }
    }
    
    if (!inputFound) {
      // Take screenshot to debug
      await page.screenshot({ path: 'chat-debug.png' });
      throw new Error('No input field found');
    }
    
    // Send a message
    await page.fill(inputFound, 'Hallo, kannst du mir helfen?');
    await page.press(inputFound, 'Enter');
    
    // Wait a bit for the message to be sent
    await page.waitForTimeout(1000);
    
    // Check if our message appears - look for any element containing our text
    const ourMessage = page.locator('*:has-text("Hallo, kannst du mir helfen?")').first();
    await expect(ourMessage).toBeVisible({ timeout: 5000 });
    
    // Wait for a response - just check if there are at least 2 messages
    await page.waitForTimeout(5000); // Give it time to respond
    
    // Count all message-like elements
    const messageSelectors = [
      '.message',
      '.chat-message',
      '[class*="message"]',
      'div[role="log"] > div'
    ];
    
    let messageCount = 0;
    for (const selector of messageSelectors) {
      const count = await page.locator(selector).count();
      if (count >= 2) {
        messageCount = count;
        console.log(`Found ${count} messages with selector: ${selector}`);
        break;
      }
    }
    
    // We should have at least 2 messages (ours + response)
    expect(messageCount).toBeGreaterThanOrEqual(2);
  });
});