import http from 'http';
import https from 'https';

function makeRequest(url) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const client = urlObj.protocol === 'https:' ? https : http;
        
        client.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ 
                status: res.statusCode, 
                statusText: res.statusMessage,
                headers: res.headers,
                data 
            }));
        }).on('error', reject);
    });
}

async function runTests() {
    console.log('=== Application Functionality Test ===\n');
    
    // Test Frontend
    console.log('1. Frontend Server Test');
    try {
        const response = await makeRequest('http://localhost:5174');
        console.log(`   Status: ${response.status} ${response.statusText}`);
        console.log(`   Content-Type: ${response.headers['content-type']}`);
        console.log(`   Page size: ${response.data.length} bytes`);
        
        // Check for Vue app
        const hasApp = response.data.includes('<div id="app">');
        const hasVite = response.data.includes('/@vite/client');
        const hasMain = response.data.includes('/src/main.ts');
        
        console.log(`   Has Vue app div: ${hasApp ? '✓' : '✗'}`);
        console.log(`   Has Vite client: ${hasVite ? '✓' : '✗'}`);
        console.log(`   Has main.ts import: ${hasMain ? '✓' : '✗'}`);
        
        if (hasApp && hasVite && hasMain) {
            console.log('   ✓ Frontend structure looks correct\n');
        } else {
            console.log('   ✗ Frontend structure issues detected\n');
        }
    } catch (error) {
        console.log(`   ✗ Error: ${error.message}\n`);
    }
    
    // Test API
    console.log('2. API Server Test');
    try {
        const response = await makeRequest('http://localhost:8080/api/health');
        console.log(`   Status: ${response.status} ${response.statusText}`);
        
        if (response.status === 200) {
            try {
                const data = JSON.parse(response.data);
                console.log(`   Response: ${JSON.stringify(data)}`);
                console.log('   ✓ API is responding correctly\n');
            } catch (e) {
                console.log(`   Response parsing error: ${e.message}`);
                console.log(`   Raw response: ${response.data.substring(0, 100)}...`);
            }
        } else {
            console.log(`   ✗ Unexpected status code\n`);
        }
    } catch (error) {
        console.log(`   ✗ Error: ${error.message}\n`);
    }
    
    // Test Admin Route
    console.log('3. Admin Route Test');
    try {
        const response = await makeRequest('http://localhost:5174/admin');
        console.log(`   Status: ${response.status} ${response.statusText}`);
        console.log(`   Page size: ${response.data.length} bytes`);
        
        // Admin should either show login or admin panel
        const hasLogin = response.data.includes('login') || response.data.includes('Login');
        const hasAdmin = response.data.includes('admin') || response.data.includes('Admin');
        
        console.log(`   Has login elements: ${hasLogin ? '✓' : '✗'}`);
        console.log(`   Has admin elements: ${hasAdmin ? '✓' : '✗'}`);
        
        if (hasLogin || hasAdmin) {
            console.log('   ✓ Admin route is accessible\n');
        } else {
            console.log('   ? Admin route returns content but unclear if working\n');
        }
    } catch (error) {
        console.log(`   ✗ Error: ${error.message}\n`);
    }
    
    // Check for common files that should exist
    console.log('4. Static Asset Tests');
    const assets = [
        { url: 'http://localhost:5174/src/main.ts', name: 'Main TypeScript' },
        { url: 'http://localhost:5174/src/App.vue', name: 'App Component' },
        { url: 'http://localhost:5174/package.json', name: 'Package.json' }
    ];
    
    for (const asset of assets) {
        try {
            const response = await makeRequest(asset.url);
            console.log(`   ${asset.name}: ${response.status} ${response.status === 200 ? '✓' : '✗'}`);
        } catch (error) {
            console.log(`   ${asset.name}: Failed (${error.message})`);
        }
    }
    
    console.log('\n=== Test Complete ===');
    console.log('\nIMPORTANT: This test only checks if servers are running and returning content.');
    console.log('To check for JavaScript runtime errors, you must:');
    console.log('1. Open http://localhost:5174 in a web browser');
    console.log('2. Press F12 to open Developer Tools');
    console.log('3. Check the Console tab for any red error messages');
    console.log('\nThe build warnings about duplicate keys and Sass deprecation are not critical.');
}

runTests().catch(console.error);