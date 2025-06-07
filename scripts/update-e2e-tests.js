#!/usr/bin/env node

/**
 * Script to update E2E tests with robust patterns
 */

const fs = require('fs');
const path = require('path');

// Common robust patterns to use
const patterns = {
  login: `
    await page.goto("/login");
    await page.fill('input#email', "martin@danglefeet.com");
    await page.fill('input#password', "123");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL("/chat");
    await page.waitForSelector('.chat-view', { state: 'visible' });
  `,
  
  findElement: `
    async function findElement(page, selectors) {
      for (const selector of selectors) {
        const element = page.locator(selector).first();
        if (await element.count() > 0) {
          return element;
        }
      }
      return null;
    }
  `,
  
  waitForAnySelector: `
    async function waitForAnySelector(page, selectors, timeout = 5000) {
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
  `
};

// Selector mappings for common elements
const selectorMappings = {
  chatInput: [
    'input[placeholder*="Nachricht"]',
    'textarea[placeholder*="Nachricht"]',
    '.chat-input',
    '.message-input',
    'textarea',
    'input[type="text"]'
  ],
  submitButton: [
    'button[type="submit"]',
    'button:has-text("Senden")',
    'button:has-text("Submit")',
    '.submit-button'
  ],
  errorMessage: [
    '.error-message',
    '.alert-danger',
    '.toast-error',
    '[role="alert"]',
    '.notification.error'
  ],
  successMessage: [
    '.success-message',
    '.alert-success',
    '.toast-success',
    '.notification.success'
  ],
  loadingIndicator: [
    '.loading',
    '.spinner',
    '[class*="loading"]',
    '[aria-busy="true"]'
  ]
};

// Generate robust test code
function generateRobustTest(testName, testContent) {
  return `
test("${testName}", async ({ page }) => {
  try {
    ${testContent}
  } catch (error) {
    console.error('Test failed:', error.message);
    await page.screenshot({ path: \`error-${testName.replace(/\s+/g, '-')}-\${Date.now()}.png\` });
    throw error;
  }
});
  `;
}

// Update imports to remove unnecessary page objects
function updateImports(content) {
  // Remove page object imports
  content = content.replace(/import.*LoginPage.*from.*;?\n/g, '');
  content = content.replace(/import.*ChatPage.*from.*;?\n/g, '');
  content = content.replace(/import.*AdminPage.*from.*;?\n/g, '');
  content = content.replace(/import.*testUsers.*from.*;?\n/g, '');
  
  // Ensure playwright import exists
  if (!content.includes('import { test, expect }')) {
    content = 'import { test, expect } from "@playwright/test";\n\n' + content;
  }
  
  return content;
}

// Add helper functions if not present
function addHelperFunctions(content) {
  if (!content.includes('function findElement')) {
    content = patterns.findElement + '\n\n' + content;
  }
  
  if (!content.includes('function waitForAnySelector')) {
    content = patterns.waitForAnySelector + '\n\n' + content;
  }
  
  return content;
}

// Process a single test file
function processTestFile(filePath) {
  console.log(`Processing: ${filePath}`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Update imports
  content = updateImports(content);
  
  // Add helper functions
  content = addHelperFunctions(content);
  
  // Replace page object usage with direct selectors
  content = content.replace(/loginPage\.goto\(\)/g, 'page.goto("/login")');
  content = content.replace(/loginPage\.login\([^)]+\)/g, patterns.login.trim());
  content = content.replace(/chatPage\.sendMessage\(([^)]+)\)/g, (match, message) => {
    return `
    const inputSelector = 'input[placeholder*="Nachricht"], textarea[placeholder*="Nachricht"]';
    await page.fill(inputSelector, ${message});
    await page.press(inputSelector, 'Enter');
    `;
  });
  
  // Replace brittle selectors with robust ones
  for (const [key, selectors] of Object.entries(selectorMappings)) {
    const selectorList = selectors.map(s => `'${s}'`).join(', ');
    
    // Replace single selector usage
    content = content.replace(
      new RegExp(`page\\.locator\\(['"]${selectors[0]}['"]\\)`, 'g'),
      `findElement(page, [${selectorList}])`
    );
  }
  
  // Add error handling and logging
  content = content.replace(/test\s*\(\s*["']([^"']+)["']\s*,\s*async\s*\(\s*{\s*page\s*}\s*\)\s*=>\s*{/g, 
    (match, testName) => {
      return `test("${testName}", async ({ page }) => {\n  console.log('Running test: ${testName}');`;
    }
  );
  
  // Write updated file
  fs.writeFileSync(filePath, content);
  console.log(`Updated: ${filePath}`);
}

// Find all test files
function findTestFiles(dir) {
  const files = [];
  
  function walk(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        walk(fullPath);
      } else if (stat.isFile() && item.endsWith('.spec.ts') && !item.includes('template')) {
        files.push(fullPath);
      }
    }
  }
  
  walk(dir);
  return files;
}

// Main execution
const testDir = path.join(__dirname, '..', 'e2e', 'tests');
const testFiles = findTestFiles(testDir);

console.log(`Found ${testFiles.length} test files to update`);

// Create backup directory
const backupDir = path.join(__dirname, '..', 'e2e-tests-backup-' + new Date().toISOString().split('T')[0]);
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// Backup and process each file
testFiles.forEach(file => {
  // Create backup
  const relativePath = path.relative(testDir, file);
  const backupPath = path.join(backupDir, relativePath);
  const backupDirPath = path.dirname(backupPath);
  
  if (!fs.existsSync(backupDirPath)) {
    fs.mkdirSync(backupDirPath, { recursive: true });
  }
  
  fs.copyFileSync(file, backupPath);
  
  // Process file
  try {
    processTestFile(file);
  } catch (error) {
    console.error(`Error processing ${file}:`, error.message);
  }
});

console.log(`\nBackup created at: ${backupDir}`);
console.log('All tests updated with robust patterns!');
console.log('\nRecommended next steps:');
console.log('1. Run: npm run test:e2e -- --project=chromium');
console.log('2. Fix any remaining issues manually');
console.log('3. Remove the backup directory once tests are working');