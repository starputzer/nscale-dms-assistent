/**
 * Simple test file for authorization header forwarding
 * Can be run with: node test_auth_header_simple.js
 */

const http = require('http');
const https = require('https');

const VITE_DEV_SERVER = 'http://localhost:3000';
const BACKEND_SERVER = 'http://localhost:8000';
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJtYXJ0aW5AZGFuZ2xlZmVldC5jb20iLCJleHAiOjE3MzM1ODQ4MDB9.example';

console.log('=== Testing Authorization Header Forwarding (Simple) ===\n');

// Helper to make HTTP request
function makeRequest(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: headers
    };

    console.log(`\nMaking request to: ${url}`);
    console.log('Headers:', JSON.stringify(headers, null, 2));

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log(`Response status: ${res.statusCode}`);
        console.log('Response headers:', JSON.stringify(res.headers, null, 2));
        
        try {
          const jsonData = JSON.parse(data);
          console.log('Response body:', JSON.stringify(jsonData, null, 2));
        } catch (e) {
          console.log('Response body (raw):', data);
        }
        
        resolve({ status: res.statusCode, headers: res.headers, data });
      });
    });

    req.on('error', (error) => {
      console.error('Request error:', error.message);
      reject(error);
    });

    req.end();
  });
}

// Test through Vite proxy
async function testViteProxy() {
  console.log('\n🔵 Test 1: Through Vite Proxy (port 3000)');
  
  const headers = {
    'Authorization': `Bearer ${TEST_TOKEN}`,
    'Content-Type': 'application/json',
    'X-Test-Header': 'test-value',
    'User-Agent': 'TestScript/1.0'
  };
  
  try {
    await makeRequest(`${VITE_DEV_SERVER}/api/admin/users`, headers);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Test direct to backend
async function testDirectBackend() {
  console.log('\n\n🟢 Test 2: Direct to Backend (port 8000)');
  
  const headers = {
    'Authorization': `Bearer ${TEST_TOKEN}`,
    'Content-Type': 'application/json',
    'X-Test-Header': 'test-value',
    'User-Agent': 'TestScript/1.0'
  };
  
  try {
    await makeRequest(`${BACKEND_SERVER}/api/admin/users`, headers);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Test without auth
async function testNoAuth() {
  console.log('\n\n🔴 Test 3: Through Vite without Auth');
  
  const headers = {
    'Content-Type': 'application/json',
    'X-Test-Header': 'test-value'
  };
  
  try {
    await makeRequest(`${VITE_DEV_SERVER}/api/admin/users`, headers);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Test different header cases
async function testHeaderCases() {
  console.log('\n\n🟡 Test 4: Different Header Cases');
  
  const testCases = [
    { name: 'authorization (lowercase)', headers: { 'authorization': `Bearer ${TEST_TOKEN}` } },
    { name: 'AUTHORIZATION (uppercase)', headers: { 'AUTHORIZATION': `Bearer ${TEST_TOKEN}` } },
    { name: 'Auth header without Bearer', headers: { 'Authorization': TEST_TOKEN } }
  ];
  
  for (const testCase of testCases) {
    console.log(`\nTesting: ${testCase.name}`);
    try {
      await makeRequest(`${VITE_DEV_SERVER}/api/admin/users`, testCase.headers);
    } catch (error) {
      console.error('Error:', error.message);
    }
  }
}

// Get a real token first
async function getRealToken() {
  console.log('\n\n🔐 Getting real JWT token from login endpoint...');
  
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      email: 'martin@danglefeet.com',
      password: '123'
    });
    
    const options = {
      hostname: 'localhost',
      port: 8000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.access_token) {
            console.log('✅ Got token:', response.access_token.substring(0, 50) + '...');
            resolve(response.access_token);
          } else {
            console.log('❌ No token in response:', data);
            resolve(null);
          }
        } catch (e) {
          console.log('❌ Failed to parse response:', data);
          resolve(null);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Login error:', error.message);
      resolve(null);
    });
    
    req.write(postData);
    req.end();
  });
}

// Main test runner
async function runTests() {
  console.log('Starting tests...');
  console.log('Make sure both servers are running:');
  console.log('- Vite dev server on port 3000');
  console.log('- Backend server on port 8000\n');
  
  // Try to get a real token first
  const realToken = await getRealToken();
  
  if (realToken) {
    // Update the test token
    global.TEST_TOKEN = realToken;
    console.log('\n✅ Using real JWT token for tests');
  } else {
    console.log('\n⚠️  Using example token (may not work)');
  }
  
  await testViteProxy();
  await testDirectBackend();
  await testNoAuth();
  await testHeaderCases();
  
  console.log('\n\n=== Summary ===');
  console.log('If authorization headers are missing through Vite:');
  console.log('1. Check vite.config.js proxy settings');
  console.log('2. Look for ws: false, changeOrigin: true');
  console.log('3. Check if configure function modifies headers');
  console.log('4. Try adding custom proxy rewrite rules');
}

// Run the tests
runTests();