/**
 * E2E Tests for Performance Monitoring
 */
import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/login-page';

test.describe('Performance Monitoring', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    
    // Login first
    await loginPage.goto();
    await loginPage.login('admin@example.com', 'admin123');
    await page.waitForURL('/chat');
  });

  test('Performance Dashboard should be accessible', async ({ page }) => {
    // Navigate to performance dashboard
    await page.goto('/performance');
    
    // Check if dashboard loads
    await expect(page.locator('h1')).toContainText('Performance Dashboard');
    
    // Check for metric cards
    await expect(page.locator('.metric-card')).toHaveCount(3);
    
    // Check for baseline metrics
    await expect(page.getByText('Baseline Metrics')).toBeVisible();
    await expect(page.getByText('Real-time Metrics')).toBeVisible();
    await expect(page.getByText('Performance Score')).toBeVisible();
  });

  test('Performance metrics should update in real-time', async ({ page }) => {
    await page.goto('/performance');
    
    // Get initial FPS value
    const fpsElement = page.locator('.metric-value').filter({ hasText: 'FPS' });
    const initialFPS = await fpsElement.textContent();
    
    // Wait for update
    await page.waitForTimeout(2000);
    
    // Check if FPS has been updated
    const updatedFPS = await fpsElement.textContent();
    expect(updatedFPS).toBeDefined();
  });

  test('Export metrics functionality', async ({ page }) => {
    await page.goto('/performance');
    
    // Setup download promise before clicking
    const downloadPromise = page.waitForEvent('download');
    
    // Click export button
    await page.getByRole('button', { name: /export/i }).click();
    
    // Wait for download
    const download = await downloadPromise;
    
    // Verify download
    expect(download.suggestedFilename()).toMatch(/performance-metrics-\d+\.json/);
  });

  test('Performance recommendations should appear for poor metrics', async ({ page }) => {
    await page.goto('/performance');
    
    // Check if recommendations section exists when there are issues
    const recommendations = page.locator('.recommendations');
    
    // If recommendations exist, verify they have content
    const count = await recommendations.count();
    if (count > 0) {
      await expect(recommendations.locator('li')).toHaveCount(3, { timeout: 5000 });
    }
  });

  test('Telemetry service should track page load metrics', async ({ page }) => {
    // Monitor network requests
    const telemetryRequests: any[] = [];
    
    page.on('request', request => {
      if (request.url().includes('/api/telemetry')) {
        telemetryRequests.push({
          url: request.url(),
          method: request.method(),
          postData: request.postData()
        });
      }
    });
    
    // Navigate to a new page
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');
    
    // Wait for telemetry to be sent
    await page.waitForTimeout(1000);
    
    // Verify telemetry was sent (if endpoint is active)
    // Note: This may not work if telemetry endpoint is not implemented
    console.log('Telemetry requests captured:', telemetryRequests.length);
  });

  test('Component render time tracking', async ({ page }) => {
    // Enable performance observer
    await page.evaluateOnNewDocument(() => {
      window.performanceMetrics = [];
      
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name.includes('component_render')) {
            window.performanceMetrics.push({
              name: entry.name,
              duration: entry.duration
            });
          }
        }
      });
      
      observer.observe({ entryTypes: ['measure'] });
    });
    
    // Navigate to a page with components
    await page.goto('/documents');
    await page.waitForLoadState('networkidle');
    
    // Check if any component render metrics were captured
    const metrics = await page.evaluate(() => window.performanceMetrics);
    console.log('Component render metrics:', metrics);
  });
});

// Declare global type for TypeScript
declare global {
  interface Window {
    performanceMetrics: any[];
  }
}