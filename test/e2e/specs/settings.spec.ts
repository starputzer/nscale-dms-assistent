import { test, expect } from '@playwright/test';

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/');
    await page.fill('input[type="text"]', process.env.TEST_USERNAME || 'test_user');
    await page.fill('input[type="password"]', process.env.TEST_PASSWORD || 'test_password');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('/chat');
    
    // Navigate to settings
    await page.locator('[data-testid="settings-button"]').click();
  });

  test('should display settings tabs', async ({ page }) => {
    await expect(page.locator('.settings-container')).toBeVisible();
    await expect(page.locator('[data-testid="tab-appearance"]')).toBeVisible();
    await expect(page.locator('[data-testid="tab-accessibility"]')).toBeVisible();
    await expect(page.locator('[data-testid="tab-notifications"]')).toBeVisible();
    await expect(page.locator('[data-testid="tab-privacy"]')).toBeVisible();
  });

  test('should toggle dark mode', async ({ page }) => {
    // Go to appearance settings
    await page.locator('[data-testid="tab-appearance"]').click();
    
    // Get initial theme
    const initialTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    
    // Toggle dark mode
    await page.locator('[data-testid="dark-mode-toggle"]').click();
    
    // Verify theme changed
    const newTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(newTheme).not.toBe(initialTheme);
  });

  test('should change language', async ({ page }) => {
    // Go to appearance settings
    await page.locator('[data-testid="tab-appearance"]').click();
    
    // Change language
    await page.locator('[data-testid="language-select"]').selectOption('en');
    
    // Verify UI updated to English
    await expect(page.locator('h2')).toContainText('Settings');
  });

  test('should adjust font size', async ({ page }) => {
    // Go to accessibility settings
    await page.locator('[data-testid="tab-accessibility"]').click();
    
    // Get initial font size
    const initialSize = await page.evaluate(() => 
      getComputedStyle(document.documentElement).getPropertyValue('--font-size-base')
    );
    
    // Increase font size
    await page.locator('[data-testid="font-size-slider"]').fill('120');
    
    // Verify font size changed
    const newSize = await page.evaluate(() => 
      getComputedStyle(document.documentElement).getPropertyValue('--font-size-base')
    );
    expect(newSize).not.toBe(initialSize);
  });

  test('should toggle reduced motion', async ({ page }) => {
    // Go to accessibility settings
    await page.locator('[data-testid="tab-accessibility"]').click();
    
    // Toggle reduced motion
    await page.locator('[data-testid="reduced-motion-toggle"]').click();
    
    // Verify setting applied
    const prefersReducedMotion = await page.evaluate(() => 
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
    expect(prefersReducedMotion).toBe(true);
  });

  test('should configure notifications', async ({ page }) => {
    // Go to notifications settings
    await page.locator('[data-testid="tab-notifications"]').click();
    
    // Toggle desktop notifications
    await page.locator('[data-testid="desktop-notifications-toggle"]').click();
    
    // Toggle email notifications
    await page.locator('[data-testid="email-notifications-toggle"]').click();
    
    // Save settings
    await page.locator('[data-testid="save-settings"]').click();
    
    // Verify success message
    await expect(page.locator('.success-message')).toBeVisible();
    await expect(page.locator('.success-message')).toContainText('Settings saved');
  });

  test('should configure privacy settings', async ({ page }) => {
    // Go to privacy settings
    await page.locator('[data-testid="tab-privacy"]').click();
    
    // Toggle analytics
    await page.locator('[data-testid="analytics-toggle"]').click();
    
    // Toggle data collection
    await page.locator('[data-testid="data-collection-toggle"]').click();
    
    // Clear data
    await page.locator('[data-testid="clear-data-button"]').click();
    await page.locator('[data-testid="confirm-clear"]').click();
    
    // Verify data cleared
    await expect(page.locator('.success-message')).toBeVisible();
    await expect(page.locator('.success-message')).toContainText('Data cleared');
  });

  test('should export user data', async ({ page }) => {
    // Go to privacy settings
    await page.locator('[data-testid="tab-privacy"]').click();
    
    // Start export
    const downloadPromise = page.waitForEvent('download');
    await page.locator('[data-testid="export-data-button"]').click();
    
    // Wait for download
    const download = await downloadPromise;
    
    // Verify download
    expect(download.suggestedFilename()).toContain('user-data');
    expect(download.suggestedFilename()).toContain('.json');
  });

  test('should reset settings to defaults', async ({ page }) => {
    // Make some changes first
    await page.locator('[data-testid="tab-appearance"]').click();
    await page.locator('[data-testid="dark-mode-toggle"]').click();
    
    // Reset settings
    await page.locator('[data-testid="reset-settings-button"]').click();
    await page.locator('[data-testid="confirm-reset"]').click();
    
    // Verify settings reset
    const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(theme).toBe('light');
  });
});