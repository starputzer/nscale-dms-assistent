#!/usr/bin/env node

/**
 * Test script to verify admin panel is in production mode
 */

const { chromium } = require('playwright');

async function testAdminProductionMode() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Enable console logging
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error') {
      console.error(`[Browser Error] ${text}`);
    } else if (type === 'warn') {
      console.warn(`[Browser Warning] ${text}`);
    } else if (type === 'log' && text.includes('admin') || text.includes('production')) {
      console.log(`[Browser] ${text}`);
    }
  });

  try {
    console.log('1. Navigating to login page...');
    await page.goto('http://localhost:3001/login');
    await page.waitForLoadState('networkidle');

    console.log('2. Logging in as admin...');
    await page.fill('input[type="email"]', 'martin.mueller@nscale.com');
    await page.fill('input[type="password"]', '123');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('http://localhost:3001/', { timeout: 10000 });
    console.log('✓ Login successful');

    console.log('3. Navigating to admin panel...');
    await page.goto('http://localhost:3001/admin');
    await page.waitForLoadState('networkidle');

    console.log('4. Checking for development mode message...');
    const devModeMessage = await page.locator('text=Entwicklungsmodus aktiv').isVisible();
    
    if (devModeMessage) {
      console.error('✗ FEHLER: Entwicklungsmodus-Nachricht ist sichtbar!');
      
      // Take screenshot
      await page.screenshot({ path: 'admin-dev-mode-error.png', fullPage: true });
      console.log('Screenshot gespeichert als: admin-dev-mode-error.png');
    } else {
      console.log('✓ Entwicklungsmodus-Nachricht nicht sichtbar');
    }

    console.log('5. Checking for production mode message...');
    const prodModeMessage = await page.locator('text=API-Integration aktiv').isVisible();
    
    if (prodModeMessage) {
      console.log('✓ Produktionsmodus-Nachricht ist sichtbar');
    } else {
      console.error('✗ FEHLER: Produktionsmodus-Nachricht fehlt!');
    }

    console.log('6. Checking admin tabs...');
    const tabs = ['system', 'users', 'featuretoggles', 'feedback', 'abtests', 'motd', 'docconverter'];
    
    for (const tab of tabs) {
      console.log(`\nTesting tab: ${tab}`);
      await page.click(`[data-tab="${tab}"], button:has-text("${getTabLabel(tab)}")`);
      await page.waitForTimeout(2000);
      
      // Check for errors in each tab
      const errors = await page.locator('.error, .admin-error').count();
      if (errors > 0) {
        console.error(`✗ ${errors} Fehler im Tab ${tab} gefunden`);
        await page.screenshot({ path: `admin-error-${tab}.png` });
      } else {
        console.log(`✓ Keine Fehler im Tab ${tab}`);
      }
    }

  } catch (error) {
    console.error('Test fehlgeschlagen:', error);
    await page.screenshot({ path: 'admin-test-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

function getTabLabel(tab) {
  const labels = {
    system: 'System',
    users: 'Benutzer',
    featuretoggles: 'Feature Toggles',
    feedback: 'Feedback',
    abtests: 'A/B Tests',
    motd: 'MOTD',
    docconverter: 'Dokumentenkonverter'
  };
  return labels[tab] || tab;
}

testAdminProductionMode().catch(console.error);