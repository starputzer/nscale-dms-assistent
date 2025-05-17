import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Document Converter', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/');
    await page.fill('input[type="text"]', process.env.TEST_USERNAME || 'test_user');
    await page.fill('input[type="password"]', process.env.TEST_PASSWORD || 'test_password');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('/chat');
    
    // Navigate to documents section
    await page.goto('/documents');
  });

  test('should display document converter interface', async ({ page }) => {
    await expect(page.locator('.document-converter')).toBeVisible();
    await expect(page.locator('[data-testid="file-upload-area"]')).toBeVisible();
    await expect(page.locator('.document-list')).toBeVisible();
  });

  test('should upload a document via drag and drop', async ({ page }) => {
    // Create a test file
    const filePath = path.join(process.cwd(), 'test/fixtures/test-document.pdf');
    
    // Simulate drag and drop
    const dataTransfer = await page.evaluateHandle(() => {
      const dt = new DataTransfer();
      return dt;
    });
    
    await page.dispatchEvent('[data-testid="file-upload-area"]', 'drop', { dataTransfer });
    
    // Verify file appears in list
    await expect(page.locator('.document-item')).toBeVisible();
    await expect(page.locator('.document-item')).toContainText('test-document.pdf');
  });

  test('should upload a document via file picker', async ({ page }) => {
    // Get the file input element
    const fileInput = page.locator('input[type="file"]');
    
    // Create a test file path
    const filePath = path.join(process.cwd(), 'test/fixtures/test-document.pdf');
    
    // Upload the file
    await fileInput.setInputFiles(filePath);
    
    // Wait for upload to complete
    await expect(page.locator('.upload-progress')).toBeVisible();
    await expect(page.locator('.upload-progress')).not.toBeVisible({ timeout: 30000 });
    
    // Verify file appears in list
    await expect(page.locator('.document-item')).toBeVisible();
  });

  test('should convert a document', async ({ page }) => {
    // Upload a document first
    const filePath = path.join(process.cwd(), 'test/fixtures/test-document.pdf');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);
    
    // Wait for upload to complete
    await page.waitForSelector('.document-item');
    
    // Click convert button
    await page.locator('[data-testid="convert-button"]').click();
    
    // Select conversion options
    await page.locator('[data-testid="output-format"]').selectOption('markdown');
    await page.locator('[data-testid="start-conversion"]').click();
    
    // Wait for conversion progress
    await expect(page.locator('.conversion-progress')).toBeVisible();
    
    // Wait for conversion to complete
    await expect(page.locator('.conversion-complete')).toBeVisible({ timeout: 60000 });
    
    // Verify download link appears
    await expect(page.locator('[data-testid="download-converted"]')).toBeVisible();
  });

  test('should preview converted document', async ({ page }) => {
    // Assume we have a converted document
    await page.goto('/documents');
    
    // Click on a document that has been converted
    await page.locator('.document-item.converted').first().click();
    
    // Verify preview appears
    await expect(page.locator('.document-preview')).toBeVisible();
    await expect(page.locator('.preview-content')).toBeVisible();
  });

  test('should handle conversion errors', async ({ page }) => {
    // Upload an invalid file
    const filePath = path.join(process.cwd(), 'test/fixtures/invalid-file.xyz');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);
    
    // Try to convert
    await page.locator('[data-testid="convert-button"]').click();
    await page.locator('[data-testid="start-conversion"]').click();
    
    // Verify error message appears
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('Unsupported file format');
  });

  test('should delete a document', async ({ page }) => {
    // Upload a document first
    const filePath = path.join(process.cwd(), 'test/fixtures/test-document.pdf');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);
    
    // Wait for upload
    await page.waitForSelector('.document-item');
    
    // Delete the document
    await page.locator('.document-item').hover();
    await page.locator('[data-testid="delete-document"]').click();
    
    // Confirm deletion
    await page.locator('[data-testid="confirm-delete"]').click();
    
    // Verify document is removed
    await expect(page.locator('.document-item')).not.toBeVisible();
  });

  test('should batch upload multiple documents', async ({ page }) => {
    const files = [
      path.join(process.cwd(), 'test/fixtures/document1.pdf'),
      path.join(process.cwd(), 'test/fixtures/document2.docx'),
      path.join(process.cwd(), 'test/fixtures/document3.txt')
    ];
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(files);
    
    // Wait for all uploads to complete
    await expect(page.locator('.document-item')).toHaveCount(3, { timeout: 30000 });
    
    // Verify all files are listed
    await expect(page.locator('.document-item')).toContainText('document1.pdf');
    await expect(page.locator('.document-item')).toContainText('document2.docx');
    await expect(page.locator('.document-item')).toContainText('document3.txt');
  });

  test('should filter documents by type', async ({ page }) => {
    // Assume we have multiple documents uploaded
    
    // Filter by PDF
    await page.locator('[data-testid="filter-dropdown"]').selectOption('pdf');
    
    // Verify only PDFs are shown
    const items = await page.locator('.document-item').all();
    for (const item of items) {
      const text = await item.textContent();
      expect(text).toContain('.pdf');
    }
    
    // Clear filter
    await page.locator('[data-testid="filter-dropdown"]').selectOption('all');
    
    // Verify all documents are shown again
    expect(await page.locator('.document-item').count()).toBeGreaterThan(1);
  });
});