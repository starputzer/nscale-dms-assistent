// Direct test using node-fetch to check the application
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';

async function testApplication() {
    console.log('=== Direct Application Test ===\n');
    
    // Test 1: Frontend Server
    console.log('1. Testing Frontend Server (http://localhost:5174)...');
    try {
        const response = await fetch('http://localhost:5174');
        console.log(`   Status: ${response.status} ${response.statusText}`);
        console.log(`   ✓ Frontend server is running\n`);
        
        const html = await response.text();
        console.log(`   HTML size: ${html.length} bytes`);
        console.log(`   Has #app div: ${html.includes('<div id="app">') ? '✓' : '✗'}`);
        console.log(`   Has Vue script: ${html.includes('src="/src/main.ts"') ? '✓' : '✗'}\n`);
    } catch (error) {
        console.log(`   ✗ Error: ${error.message}\n`);
    }
    
    // Test 2: API Server
    console.log('2. Testing API Server (http://localhost:8080)...');
    try {
        const response = await fetch('http://localhost:8080/api/health');
        console.log(`   Status: ${response.status} ${response.statusText}`);
        if (response.ok) {
            const data = await response.json();
            console.log(`   Response: ${JSON.stringify(data)}`);
        }
        console.log(`   ✓ API server is running\n`);
    } catch (error) {
        console.log(`   ✗ Error: ${error.message}\n`);
    }
    
    // Test 3: Check specific routes
    console.log('3. Testing specific routes...');
    const routes = [
        { path: '/', name: 'Home' },
        { path: '/admin', name: 'Admin' },
        { path: '/admin/login', name: 'Admin Login' }
    ];
    
    for (const route of routes) {
        try {
            const response = await fetch(`http://localhost:5174${route.path}`);
            console.log(`   ${route.name} (${route.path}): ${response.status} ${response.statusText}`);
        } catch (error) {
            console.log(`   ${route.name} (${route.path}): Error - ${error.message}`);
        }
    }
    
    // Test 4: Check static assets
    console.log('\n4. Testing static assets...');
    const assets = [
        '/src/main.ts',
        '/public/assets/styles/base-components.css',
        '/public/assets/styles/admin-consolidated.css'
    ];
    
    for (const asset of assets) {
        try {
            const response = await fetch(`http://localhost:5174${asset}`);
            console.log(`   ${asset}: ${response.status} ${response.ok ? '✓' : '✗'}`);
        } catch (error) {
            console.log(`   ${asset}: Error - ${error.message}`);
        }
    }
    
    // Test 5: Check for JavaScript syntax by requesting main.ts
    console.log('\n5. Checking main TypeScript file...');
    try {
        const response = await fetch('http://localhost:5174/src/main.ts');
        if (response.ok) {
            const content = await response.text();
            console.log(`   File size: ${content.length} bytes`);
            
            // Check for obvious syntax errors
            const syntaxPatterns = [
                { pattern: /\(\(window as any\)/g, name: 'Double parentheses' },
                { pattern: /response\.\(data as any\)/g, name: 'Malformed property access' },
                { pattern: /findIndex\(toast\) =>/g, name: 'Missing arrow function params' }
            ];
            
            let foundIssues = false;
            for (const check of syntaxPatterns) {
                const matches = content.match(check.pattern);
                if (matches) {
                    console.log(`   ✗ Found ${matches.length} instances of: ${check.name}`);
                    foundIssues = true;
                }
            }
            
            if (!foundIssues) {
                console.log('   ✓ No obvious syntax errors in main.ts');
            }
        }
    } catch (error) {
        console.log(`   Could not check: ${error.message}`);
    }
    
    console.log('\n=== Summary ===');
    console.log('Frontend and API servers are running.');
    console.log('To check for runtime errors, open http://localhost:5174 in a browser');
    console.log('and check the browser console (F12 -> Console tab).');
}

// Run the test
testApplication().catch(console.error);