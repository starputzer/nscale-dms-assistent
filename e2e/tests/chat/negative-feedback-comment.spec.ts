import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/login-page';
import { ChatPage } from '../../pages/chat-page';

test.describe('Negative Feedback Comment Dialog', () => {
  let loginPage: LoginPage;
  let chatPage: ChatPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    chatPage = new ChatPage(page);

    // Login as test user
    await loginPage.goto();
    await loginPage.login('test@example.com', 'password123');
    await page.waitForURL('**/chat');
  });

  test('should open comment dialog when giving negative feedback', async ({ page }) => {
    // Send a test message
    await chatPage.sendMessage('Test message for feedback');
    
    // Wait for AI response
    await expect(page.locator('.n-message-item').filter({ hasText: 'assistant' })).toBeVisible({
      timeout: 30000
    });

    // Click negative feedback button
    await page.locator('.n-message-item__action-btn--negative').first().click();

    // Verify dialog opens
    await expect(page.locator('.feedback-dialog-overlay')).toBeVisible();
    await expect(page.locator('.feedback-dialog__title')).toContainText('Feedback Details');
    await expect(page.locator('.feedback-dialog__description')).toContainText('negatives Feedback');

    // Verify textarea is focused
    const textarea = page.locator('.feedback-dialog__textarea');
    await expect(textarea).toBeFocused();

    // Type feedback comment
    await textarea.fill('Die Antwort war nicht hilfreich weil sie zu allgemein war.');

    // Check character count
    await expect(page.locator('.feedback-dialog__char-count')).toContainText('48 / 1000');

    // Submit feedback
    await page.locator('.feedback-dialog__btn--submit').click();

    // Verify dialog closes
    await expect(page.locator('.feedback-dialog-overlay')).not.toBeVisible();

    // Verify success message
    await expect(page.locator('.n-toast')).toContainText('negatives Feedback');

    // Verify feedback state is maintained
    await expect(page.locator('.n-message-item__action-btn--negative').first()).toHaveClass(/active/);
  });

  test('should cancel feedback dialog without submitting', async ({ page }) => {
    // Send a test message
    await chatPage.sendMessage('Another test message');
    
    // Wait for AI response
    await expect(page.locator('.n-message-item').filter({ hasText: 'assistant' })).toBeVisible({
      timeout: 30000
    });

    // Click negative feedback button
    await page.locator('.n-message-item__action-btn--negative').first().click();

    // Verify dialog opens
    await expect(page.locator('.feedback-dialog-overlay')).toBeVisible();

    // Type some text
    await page.locator('.feedback-dialog__textarea').fill('Test comment');

    // Click cancel
    await page.locator('.feedback-dialog__btn--cancel').click();

    // Verify dialog closes
    await expect(page.locator('.feedback-dialog-overlay')).not.toBeVisible();

    // Verify no feedback was submitted (button should not be active)
    await expect(page.locator('.n-message-item__action-btn--negative').first()).not.toHaveClass(/active/);
  });

  test('should close dialog with escape key', async ({ page }) => {
    // Send a test message
    await chatPage.sendMessage('Message for escape test');
    
    // Wait for AI response
    await expect(page.locator('.n-message-item').filter({ hasText: 'assistant' })).toBeVisible({
      timeout: 30000
    });

    // Click negative feedback button
    await page.locator('.n-message-item__action-btn--negative').first().click();

    // Verify dialog opens
    await expect(page.locator('.feedback-dialog-overlay')).toBeVisible();

    // Press escape key
    await page.keyboard.press('Escape');

    // Verify dialog closes
    await expect(page.locator('.feedback-dialog-overlay')).not.toBeVisible();
  });

  test('should disable submit button when comment is empty', async ({ page }) => {
    // Send a test message
    await chatPage.sendMessage('Test empty comment');
    
    // Wait for AI response
    await expect(page.locator('.n-message-item').filter({ hasText: 'assistant' })).toBeVisible({
      timeout: 30000
    });

    // Click negative feedback button
    await page.locator('.n-message-item__action-btn--negative').first().click();

    // Verify submit button is disabled initially
    await expect(page.locator('.feedback-dialog__btn--submit')).toBeDisabled();

    // Type and clear text
    const textarea = page.locator('.feedback-dialog__textarea');
    await textarea.fill('Some text');
    await expect(page.locator('.feedback-dialog__btn--submit')).toBeEnabled();
    
    await textarea.clear();
    await expect(page.locator('.feedback-dialog__btn--submit')).toBeDisabled();
  });

  test('should submit with ctrl+enter shortcut', async ({ page }) => {
    // Send a test message
    await chatPage.sendMessage('Test keyboard shortcut');
    
    // Wait for AI response
    await expect(page.locator('.n-message-item').filter({ hasText: 'assistant' })).toBeVisible({
      timeout: 30000
    });

    // Click negative feedback button
    await page.locator('.n-message-item__action-btn--negative').first().click();

    // Type feedback
    const textarea = page.locator('.feedback-dialog__textarea');
    await textarea.fill('Quick feedback with keyboard');

    // Submit with Ctrl+Enter
    await page.keyboard.press('Control+Enter');

    // Verify dialog closes
    await expect(page.locator('.feedback-dialog-overlay')).not.toBeVisible();

    // Verify success message
    await expect(page.locator('.n-toast')).toContainText('negatives Feedback');
  });
});