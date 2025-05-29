#!/usr/bin/env node

/**
 * Admin Authentication Integration Fix
 * 
 * This script fixes authentication issues between the frontend and backend
 * for the admin panel by ensuring proper token handling and storage.
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing Admin Authentication Integration...\n');

// Fix 1: Update the auth store to ensure proper token persistence
const authStorePath = path.join(__dirname, 'src/stores/auth.ts');
const authStoreContent = fs.readFileSync(authStorePath, 'utf8');

// Check if we need to add token persistence fix
if (!authStoreContent.includes('// Ensure token is available for API calls')) {
  console.log('📝 Updating auth store for better token persistence...');
  
  const updatedAuthStore = authStoreContent.replace(
    'localStorage.setItem("nscale_access_token", token);',
    `localStorage.setItem("nscale_access_token", token);
    // Ensure token is available for API calls
    window.localStorage.setItem("nscale_access_token", token);
    // Also store without prefix as fallback
    localStorage.setItem("access_token", token);`
  );
  
  fs.writeFileSync(authStorePath, updatedAuthStore);
  console.log('✅ Auth store updated');
}

// Fix 2: Create an auth debug utility
const authDebugPath = path.join(__dirname, 'src/utils/authDebug.ts');
const authDebugContent = `/**
 * Auth Debug Utilities
 * Helper functions for debugging authentication issues
 */

export function checkAuthStatus() {
  const tokens = {
    nscale_access_token: localStorage.getItem('nscale_access_token'),
    access_token: localStorage.getItem('access_token'),
    nscale_user: localStorage.getItem('nscale_user'),
  };
  
  console.log('🔐 Current Auth Status:', {
    hasNscaleToken: !!tokens.nscale_access_token,
    hasAccessToken: !!tokens.access_token,
    hasUser: !!tokens.nscale_user,
    tokenPreview: tokens.nscale_access_token ? 
      tokens.nscale_access_token.substring(0, 20) + '...' : null,
  });
  
  return tokens;
}

export function setAuthTokens(accessToken: string, user: any) {
  // Set tokens in multiple locations for compatibility
  localStorage.setItem('nscale_access_token', accessToken);
  localStorage.setItem('access_token', accessToken);
  localStorage.setItem('nscale_user', JSON.stringify(user));
  
  console.log('✅ Auth tokens set successfully');
}

export function clearAuthTokens() {
  localStorage.removeItem('nscale_access_token');
  localStorage.removeItem('access_token');
  localStorage.removeItem('nscale_refresh_token');
  localStorage.removeItem('nscale_token_expiry');
  localStorage.removeItem('nscale_user');
  
  console.log('🗑️ Auth tokens cleared');
}

// Add to window for console access
if (typeof window !== 'undefined') {
  (window as any).authDebug = {
    check: checkAuthStatus,
    set: setAuthTokens,
    clear: clearAuthTokens,
  };
}
`;

fs.writeFileSync(authDebugPath, authDebugContent);
console.log('✅ Created auth debug utilities');

// Fix 3: Update ApiService to add better token fallback
const apiServicePath = path.join(__dirname, 'src/services/api/ApiService.ts');
if (fs.existsSync(apiServicePath)) {
  console.log('📝 Checking ApiService token handling...');
  const apiServiceContent = fs.readFileSync(apiServicePath, 'utf8');
  
  // Check if fallback is already added
  if (!apiServiceContent.includes('// Additional fallback for token')) {
    const updatedApiService = apiServiceContent.replace(
      '// Fallback: Direkt aus localStorage mit korrektem key',
      `// Fallback: Direkt aus localStorage mit korrektem key
        if (!token) {
          token = localStorage.getItem("nscale_access_token");
        }
        
        // Additional fallback for token without prefix
        if (!token) {
          token = localStorage.getItem("access_token");
        }`
    );
    
    fs.writeFileSync(apiServicePath, updatedApiService);
    console.log('✅ ApiService token handling improved');
  }
}

// Fix 4: Create a login helper for testing
const loginHelperPath = path.join(__dirname, 'test-admin-login.js');
const loginHelperContent = `#!/usr/bin/env node

/**
 * Test Admin Login Script
 * Logs in as admin and outputs the token for testing
 */

const fetch = require('node-fetch');

async function testAdminLogin() {
  try {
    console.log('🔐 Attempting login as martin@danglefeet.com...');
    
    const response = await fetch('http://localhost:8080/api/v1/login', {
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
      throw new Error(\`Login failed: \${response.status} \${response.statusText}\`);
    }
    
    const data = await response.json();
    console.log('✅ Login successful!');
    console.log('📋 Access Token:', data.access_token);
    console.log('\\n💡 To use in browser console:');
    console.log(\`localStorage.setItem('nscale_access_token', '\${data.access_token}');\`);
    console.log(\`localStorage.setItem('nscale_user', JSON.stringify({id: '\${data.user_id}', email: 'martin@danglefeet.com', role: 'admin'}));\`);
    console.log('\\nThen refresh the page.');
    
  } catch (error) {
    console.error('❌ Login failed:', error.message);
    console.log('\\n💡 Make sure:');
    console.log('1. Python backend is running on port 8080');
    console.log('2. User martin@danglefeet.com exists with password "123"');
  }
}

testAdminLogin();
`;

fs.writeFileSync(loginHelperPath, loginHelperContent);
fs.chmodSync(loginHelperPath, '755');
console.log('✅ Created login helper script');

console.log('\n✨ Authentication integration fixes applied!');
console.log('\n📋 Next steps:');
console.log('1. Run: npm run dev');
console.log('2. Open http://localhost:3003 in your browser');
console.log('3. Open browser console and run the setup script from setup-admin-auth.js');
console.log('4. Or run: node test-admin-login.js to get a token');
console.log('\n💡 For debugging, use window.authDebug.check() in browser console');