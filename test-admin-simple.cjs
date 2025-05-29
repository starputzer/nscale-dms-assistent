#!/usr/bin/env node

const { chromium } = require('playwright');

async function testAdmin() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Login first
    await page.goto('http://localhost:3001/login');
    await page.fill('input[type="email"]', 'martin.mueller@nscale.com');
    await page.fill('input[type="password"]', '123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Go directly to admin
    await page.goto('http://localhost:3001/admin');
    await page.waitForTimeout(3000);

    // Take screenshot
    await page.screenshot({ path: 'admin-panel-current.png', fullPage: true });
    console.log('Screenshot saved: admin-panel-current.png');

    // Check for development mode message
    const devMode = await page.locator('text=Entwicklungsmodus aktiv').count();
    const prodMode = await page.locator('text=API-Integration aktiv').count();

    console.log(`Development mode message count: ${devMode}`);
    console.log(`Production mode message count: ${prodMode}`);

    if (devMode > 0) {
      console.error('ERROR: Development mode message is still visible!');
    } else {
      console.log('SUCCESS: Development mode message is not visible');
    }

    if (prodMode > 0) {
      console.log('SUCCESS: Production mode message is visible');
    } else {
      console.error('ERROR: Production mode message is not visible');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

testAdmin().catch(console.error);