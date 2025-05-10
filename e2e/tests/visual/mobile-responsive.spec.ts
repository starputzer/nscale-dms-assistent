import { test, expect } from '@playwright/test';
import { DocumentConverterPage } from '../../pages/document-converter-page';
import { loginAsTestUser } from '../../fixtures/login-utils';

/**
 * Mobile Responsiveness Tests for Document Converter
 * 
 * These tests verify that the document converter components 
 * display correctly on various screen sizes.
 */

// Define the screen sizes to test
const screenSizes = [
  { width: 1920, height: 1080, name: 'desktop' },
  { width: 1024, height: 768, name: 'tablet-landscape' },
  { width: 768, height: 1024, name: 'tablet-portrait' },
  { width: 414, height: 896, name: 'mobile-large' },
  { width: 375, height: 667, name: 'mobile-medium' },
  { width: 320, height: 568, name: 'mobile-small' },
];

// Test the document converter on different screen sizes
test.describe('Document Converter Mobile Responsiveness', () => {
  // Run tests for each screen size
  for (const size of screenSizes) {
    test(`displays correctly on ${size.name} (${size.width}x${size.height})`, async ({ page }) => {
      // Set viewport size
      await page.setViewportSize({
        width: size.width,
        height: size.height,
      });
      
      // Login as test user
      await loginAsTestUser(page);
      
      // Navigate to document converter
      const docConverterPage = new DocumentConverterPage(page);
      await docConverterPage.navigate();
      
      // Verify that the page loaded correctly
      await expect(docConverterPage.pageTitle).toBeVisible();
      
      // Take a screenshot for visual comparison
      await page.screenshot({ 
        path: `./test-results/document-converter-${size.name}.png`,
        fullPage: true
      });
      
      // Check BatchUpload component visibility and structure
      await docConverterPage.switchToUploadMode('batch');
      await expect(docConverterPage.batchUploadDropZone).toBeVisible();
      
      // Check if touch-friendly elements are correctly sized (minimum 44x44px)
      const actionButtonSize = await docConverterPage.getElementSize(
        docConverterPage.actionButton
      );
      
      // Verify touch target size requirements
      expect(actionButtonSize.width).toBeGreaterThanOrEqual(44);
      expect(actionButtonSize.height).toBeGreaterThanOrEqual(44);
      
      // Check that the file list adapts based on screen size
      if (size.width <= 768) {
        // Mobile layout checks
        await expect(docConverterPage.mobileLayout).toBeVisible();
      } else {
        // Desktop layout checks
        await expect(docConverterPage.desktopLayout).toBeVisible();
      }
      
      // Test document list if documents exist
      if (await docConverterPage.hasDocuments()) {
        // Check document list layout
        await expect(docConverterPage.documentList).toBeVisible();
        
        // Check touch-specific elements on mobile
        if (size.width <= 768) {
          // Verify mobile-specific elements are visible
          await expect(docConverterPage.mobileDocumentActions).toBeVisible();
          
          // Test swipe gesture (simulated)
          await docConverterPage.simulateSwipe('left', 0);
          // Check that download action appears
          await expect(docConverterPage.downloadAction).toBeVisible();
        }
      }
      
      // Test conversion progress component
      await docConverterPage.startDummyConversion();
      await expect(docConverterPage.conversionProgress).toBeVisible();
      
      // Check that cancel button is touch-friendly
      const cancelButtonSize = await docConverterPage.getElementSize(
        docConverterPage.cancelButton
      );
      expect(cancelButtonSize.width).toBeGreaterThanOrEqual(44);
      expect(cancelButtonSize.height).toBeGreaterThanOrEqual(44);
      
      // Verify that steps visualization adapts to screen size
      if (size.width <= 768) {
        await expect(docConverterPage.mobileStepsVisualization).toBeVisible();
        await expect(docConverterPage.desktopStepsVisualization).not.toBeVisible();
      } else {
        await expect(docConverterPage.desktopStepsVisualization).toBeVisible();
        await expect(docConverterPage.mobileStepsVisualization).not.toBeVisible();
      }
    });
  }
  
  // Test touch interaction detection
  test('detects touch vs keyboard input correctly', async ({ page }) => {
    // Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Login as test user
    await loginAsTestUser(page);
    
    // Navigate to document converter
    const docConverterPage = new DocumentConverterPage(page);
    await docConverterPage.navigate();
    
    // Simulate touch event
    await page.evaluate(() => {
      const touchEvent = new TouchEvent('touchstart', {
        bubbles: true,
        cancelable: true,
      });
      document.body.dispatchEvent(touchEvent);
    });
    
    // Verify touch mode is active
    await expect(page.locator('body.using-touch')).toBeVisible();
    
    // Simulate keyboard navigation (Tab key)
    await page.keyboard.press('Tab');
    
    // Verify keyboard mode is active
    await expect(page.locator('body.using-keyboard')).toBeVisible();
    await expect(page.locator('body.using-touch')).not.toBeVisible();
  });
});