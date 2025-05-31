// Test startup script to check for errors
const puppeteer = require('puppeteer');

async function testStartup() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Listen for console messages
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    
    if (type === 'error') {
      console.error('Browser Error:', text);
    } else if (type === 'warning') {
      console.warn('Browser Warning:', text);
    } else {
      console.log(`Browser ${type}:`, text);
    }
  });
  
  // Listen for page errors
  page.on('pageerror', error => {
    console.error('Page Error:', error.message);
  });
  
  try {
    // Navigate to the app
    console.log('Navigating to http://localhost:5174...');
    await page.goto('http://localhost:5174', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    console.log('Page loaded successfully');
    
    // Wait a bit to see any delayed errors
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Try to check if the app mounted
    const appMounted = await page.evaluate(() => {
      return document.querySelector('#app')?.innerHTML?.length > 0;
    });
    
    console.log('App mounted:', appMounted);
    
  } catch (error) {
    console.error('Navigation error:', error);
  }
  
  // Keep browser open for inspection
  console.log('Browser will remain open for inspection...');
}

testStartup().catch(console.error);