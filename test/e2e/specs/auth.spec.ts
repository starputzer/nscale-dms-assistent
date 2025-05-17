import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login form', async ({ page }) => {
    await expect(page.locator('h2')).toContainText('Anmelden');
    await expect(page.locator('input[type="text"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    await page.locator('button[type="submit"]').click();
    
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('Bitte füllen Sie alle Felder aus');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.fill('input[type="text"]', 'invalid_user');
    await page.fill('input[type="password"]', 'wrong_password');
    await page.locator('button[type="submit"]').click();
    
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('Ungültige Anmeldedaten');
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    await page.fill('input[type="text"]', process.env.TEST_USERNAME || 'test_user');
    await page.fill('input[type="password"]', process.env.TEST_PASSWORD || 'test_password');
    await page.locator('button[type="submit"]').click();
    
    await page.waitForURL('/chat');
    await expect(page.locator('.chat-container')).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.fill('input[type="text"]', process.env.TEST_USERNAME || 'test_user');
    await page.fill('input[type="password"]', process.env.TEST_PASSWORD || 'test_password');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('/chat');
    
    // Logout
    await page.locator('[data-testid="user-menu"]').click();
    await page.locator('[data-testid="logout-button"]').click();
    
    // Verify we're back at login
    await page.waitForURL('/login');
    await expect(page.locator('h2')).toContainText('Anmelden');
  });

  test('should persist login state on page refresh', async ({ page }) => {
    // Login
    await page.fill('input[type="text"]', process.env.TEST_USERNAME || 'test_user');
    await page.fill('input[type="password"]', process.env.TEST_PASSWORD || 'test_password');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('/chat');
    
    // Refresh page
    await page.reload();
    
    // Should still be logged in
    await expect(page.url()).toContain('/chat');
    await expect(page.locator('.chat-container')).toBeVisible();
  });

  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForURL('/login');
    await expect(page.locator('h2')).toContainText('Anmelden');
  });
});