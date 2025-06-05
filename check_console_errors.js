const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Capture console messages
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location()
    });
  });
  
  // Capture page errors
  const pageErrors = [];
  page.on('pageerror', error => {
    pageErrors.push({
      message: error.message,
      stack: error.stack
    });
  });
  
  // Capture request failures
  const requestFailures = [];
  page.on('requestfailed', request => {
    requestFailures.push({
      url: request.url(),
      failure: request.failure()
    });
  });
  
  try {
    console.log('Navigating to http://localhost:5173...');
    await page.goto('http://localhost:5173', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait a bit for any dynamic content
    await page.waitForTimeout(2000);
    
    console.log('\n=== Console Messages ===');
    consoleMessages.forEach(msg => {
      console.log(`[${msg.type}] ${msg.text}`);
      if (msg.location.url) {
        console.log(`  at ${msg.location.url}:${msg.location.lineNumber}:${msg.location.columnNumber}`);
      }
    });
    
    console.log('\n=== Page Errors ===');
    if (pageErrors.length === 0) {
      console.log('No page errors detected');
    } else {
      pageErrors.forEach(err => {
        console.log('ERROR:', err.message);
        if (err.stack) console.log(err.stack);
      });
    }
    
    console.log('\n=== Request Failures ===');
    if (requestFailures.length === 0) {
      console.log('No request failures detected');
    } else {
      requestFailures.forEach(fail => {
        console.log(`Failed: ${fail.url}`);
        console.log(`Reason: ${fail.failure.errorText}`);
      });
    }
    
  } catch (error) {
    console.error('Navigation error:', error);
  } finally {
    await browser.close();
  }
})();