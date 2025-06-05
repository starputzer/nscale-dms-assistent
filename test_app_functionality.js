import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testApplication() {
    const browser = await puppeteer.launch({
        headless: false, // Set to true for CI
        devtools: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        
        // Collect console messages
        const consoleLogs = [];
        page.on('console', msg => {
            consoleLogs.push({
                type: msg.type(),
                text: msg.text(),
                location: msg.location()
            });
        });

        // Collect page errors
        const pageErrors = [];
        page.on('pageerror', error => {
            pageErrors.push({
                message: error.message,
                stack: error.stack
            });
        });

        // Collect failed requests
        const failedRequests = [];
        page.on('requestfailed', request => {
            failedRequests.push({
                url: request.url(),
                failure: request.failure()
            });
        });

        console.log('Testing main application at http://localhost:5174...\n');
        
        // Navigate to main page
        await page.goto('http://localhost:5174', { waitUntil: 'networkidle2' });
        await page.waitForTimeout(2000); // Wait for any async operations

        // Check for Vue app initialization
        const vueAppExists = await page.evaluate(() => {
            return window.__VUE__ !== undefined || document.querySelector('#app').__vue_app__ !== undefined;
        });

        console.log(`✓ Vue app initialized: ${vueAppExists}`);

        // Check for critical errors
        const criticalErrors = consoleLogs.filter(log => log.type === 'error');
        console.log(`\n${criticalErrors.length === 0 ? '✓' : '✗'} No critical JavaScript errors`);
        
        if (criticalErrors.length > 0) {
            console.log('\nJavaScript Errors:');
            criticalErrors.forEach(err => {
                console.log(`  - ${err.text}`);
                if (err.location.url) {
                    console.log(`    at ${err.location.url}:${err.location.lineNumber}`);
                }
            });
        }

        // Check for warnings (excluding expected ones)
        const warnings = consoleLogs.filter(log => 
            log.type === 'warning' && 
            !log.text.includes('Duplicate key') && // Known i18n warnings
            !log.text.includes('deprecation') // Sass warnings
        );
        
        if (warnings.length > 0) {
            console.log('\nWarnings:');
            warnings.forEach(warn => console.log(`  - ${warn.text}`));
        }

        // Test navigation to admin panel
        console.log('\nTesting admin panel...');
        await page.goto('http://localhost:5174/admin', { waitUntil: 'networkidle2' });
        await page.waitForTimeout(1000);

        // Check if login form appears
        const loginFormExists = await page.evaluate(() => {
            return document.querySelector('input[type="text"]') !== null || 
                   document.querySelector('input[type="email"]') !== null;
        });
        
        console.log(`✓ Admin login form loaded: ${loginFormExists}`);

        // Check API connectivity
        console.log('\nChecking API connectivity...');
        const apiResponse = await page.evaluate(async () => {
            try {
                const response = await fetch('http://localhost:8080/api/health');
                return {
                    status: response.status,
                    ok: response.ok,
                    statusText: response.statusText
                };
            } catch (error) {
                return { error: error.message };
            }
        });

        if (apiResponse.error) {
            console.log(`✗ API connection failed: ${apiResponse.error}`);
        } else {
            console.log(`✓ API health check: ${apiResponse.status} ${apiResponse.statusText}`);
        }

        // Test document converter page if it exists
        console.log('\nChecking document converter...');
        await page.goto('http://localhost:5174', { waitUntil: 'networkidle2' });
        
        const hasDocConverter = await page.evaluate(() => {
            return document.querySelector('[data-testid="document-upload"]') !== null ||
                   document.querySelector('.document-upload') !== null ||
                   document.querySelector('input[type="file"]') !== null;
        });
        
        console.log(`✓ Document upload component found: ${hasDocConverter}`);

        // Summary
        console.log('\n=== Test Summary ===');
        console.log(`Total console errors: ${criticalErrors.length}`);
        console.log(`Total warnings: ${warnings.length}`);
        console.log(`Failed network requests: ${failedRequests.length}`);
        console.log(`Page errors: ${pageErrors.length}`);

        if (failedRequests.length > 0) {
            console.log('\nFailed Requests:');
            failedRequests.forEach(req => {
                console.log(`  - ${req.url}`);
                console.log(`    Reason: ${req.failure.errorText}`);
            });
        }

        // Check for specific functionality
        console.log('\n=== Functionality Checks ===');
        
        // Check if router is working
        const routerWorks = await page.evaluate(() => {
            return window.$router !== undefined || 
                   (window.app && window.app.config.globalProperties.$router !== undefined);
        });
        console.log(`Router initialized: ${routerWorks ? '✓' : '✗'}`);

        // Check if i18n is working
        const i18nWorks = await page.evaluate(() => {
            return window.$i18n !== undefined || 
                   (window.app && window.app.config.globalProperties.$i18n !== undefined) ||
                   document.body.textContent.includes('Digitale Akte');
        });
        console.log(`i18n initialized: ${i18nWorks ? '✓' : '✗'}`);

        // Return exit code
        const hasErrors = criticalErrors.length > 0 || pageErrors.length > 0;
        return hasErrors ? 1 : 0;

    } catch (error) {
        console.error('Test execution failed:', error);
        return 1;
    } finally {
        await browser.close();
    }
}

// Run the test
testApplication().then(exitCode => {
    process.exit(exitCode);
}).catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
});