#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing Frontend Authentication Path...\n');

// Fix 1: Update API config to use correct login path
const configPath = path.join(__dirname, 'src/services/api/config.ts');
let configContent = fs.readFileSync(configPath, 'utf8');

// Update the AUTH endpoints section
const authEndpointsRegex = /AUTH:\s*{[^}]+}/s;
const newAuthEndpoints = `AUTH: {
      LOGIN: "/auth/login",
      LOGOUT: "/auth/logout",
      REFRESH: "/auth/refresh",
      USER: "/auth/user",
    }`;

if (configContent.match(authEndpointsRegex)) {
    configContent = configContent.replace(authEndpointsRegex, newAuthEndpoints);
    fs.writeFileSync(configPath, configContent);
    console.log('✅ Updated AUTH endpoints in config.ts');
} else {
    console.log('⚠️  Could not find AUTH endpoints section in config.ts');
}

// Fix 2: Create a browser setup script with correct auth
const browserScript = `
// Admin Authentication Setup Script
// Run this in your browser console at http://localhost:3003

(async function setupAuth() {
    console.log('🔐 Setting up authentication...');
    
    try {
        // Use the correct login endpoint
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: 'martin@danglefeet.com',
                password: '123'
            })
        });
        
        if (!response.ok) {
            throw new Error(\`Login failed: \${response.status}\`);
        }
        
        const data = await response.json();
        
        // Store tokens
        localStorage.setItem('nscale_access_token', data.access_token);
        localStorage.setItem('nscale_refresh_token', data.refresh_token || '');
        localStorage.setItem('nscale_token_expiry', data.expires_at || new Date(Date.now() + 24*60*60*1000).toISOString());
        
        // Store user data
        const userData = {
            id: data.user_id || 'admin',
            email: 'martin@danglefeet.com',
            name: 'Martin Admin',
            role: 'admin',
            permissions: ['admin']
        };
        localStorage.setItem('nscale_user', JSON.stringify(userData));
        
        console.log('✅ Authentication successful!');
        console.log('Token:', data.access_token.substring(0, 20) + '...');
        console.log('🔄 Refreshing page in 2 seconds...');
        
        setTimeout(() => {
            window.location.reload();
        }, 2000);
        
    } catch (error) {
        console.error('❌ Authentication failed:', error);
        console.log('Make sure the backend is running on port 8080');
    }
})();
`;

fs.writeFileSync('browser-auth-setup.js', browserScript);
console.log('✅ Created browser-auth-setup.js\n');

// Fix 3: Check if we have a working token from previous test
try {
    const workingConfig = JSON.parse(fs.readFileSync('working_auth_config.json', 'utf8'));
    if (workingConfig.token) {
        console.log('📋 Found working authentication token!');
        console.log('Token:', workingConfig.token.substring(0, 20) + '...');
        console.log('\nYou can also use this in browser console:');
        console.log(`localStorage.setItem('nscale_access_token', '${workingConfig.token}');`);
        console.log(`localStorage.setItem('nscale_user', '${JSON.stringify({id: workingConfig.user_id, email: 'martin@danglefeet.com', role: 'admin'})}');`);
    }
} catch (e) {
    // No working config found
}

console.log('\n✨ Frontend auth path fix complete!\n');
console.log('Next steps:');
console.log('1. Restart the frontend: npm run dev');
console.log('2. Open http://localhost:3003');
console.log('3. Open browser console (F12)');
console.log('4. Copy and paste the content from browser-auth-setup.js');
console.log('5. The page will refresh and you should be logged in');