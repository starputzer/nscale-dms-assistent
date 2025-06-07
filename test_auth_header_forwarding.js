/**
 * Test file to diagnose authorization header forwarding through Vite dev server
 * Tests both axios and fetch to see if there's a difference
 */

import axios from 'axios';

const VITE_DEV_SERVER = 'http://localhost:3000';
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJtYXJ0aW5AZGFuZ2xlZmVldC5jb20iLCJleHAiOjE3MzM1ODQ4MDB9.example'; // Example token

console.log('=== Testing Authorization Header Forwarding ===\n');

// Helper function to log request details
function logRequestDetails(method, response, headers) {
  console.log(`\n--- ${method} Request ---`);
  console.log('Request Headers Sent:', headers);
  console.log('Response Status:', response.status || response.statusCode);
  console.log('Response Headers:', response.headers);
}

// Test 1: Axios with Authorization header
async function testAxiosAuth() {
  console.log('\n🔵 Testing with Axios (Authorization header):');
  
  try {
    const config = {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Test-Header': 'test-value'
      }
    };
    
    console.log('Sending headers:', config.headers);
    
    const response = await axios.get(`${VITE_DEV_SERVER}/api/admin/users`, config);
    logRequestDetails('Axios', response, config.headers);
    console.log('Response data:', response.data);
  } catch (error) {
    console.error('Axios error:', error.response?.status, error.response?.data || error.message);
    if (error.response) {
      console.log('Error response headers:', error.response.headers);
    }
  }
}

// Test 2: Fetch with Authorization header
async function testFetchAuth() {
  console.log('\n🟢 Testing with Fetch (Authorization header):');
  
  try {
    const headers = {
      'Authorization': `Bearer ${TEST_TOKEN}`,
      'Content-Type': 'application/json',
      'X-Test-Header': 'test-value'
    };
    
    console.log('Sending headers:', headers);
    
    const response = await fetch(`${VITE_DEV_SERVER}/api/admin/users`, {
      method: 'GET',
      headers: headers
    });
    
    const responseHeaders = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });
    
    logRequestDetails('Fetch', response, headers);
    console.log('Response headers object:', responseHeaders);
    
    const data = await response.json();
    console.log('Response data:', data);
  } catch (error) {
    console.error('Fetch error:', error.message);
  }
}

// Test 3: Axios without auth (baseline)
async function testAxiosNoAuth() {
  console.log('\n🔴 Testing with Axios (no auth):');
  
  try {
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'X-Test-Header': 'test-value'
      }
    };
    
    console.log('Sending headers:', config.headers);
    
    const response = await axios.get(`${VITE_DEV_SERVER}/api/admin/users`, config);
    logRequestDetails('Axios No Auth', response, config.headers);
    console.log('Response data:', response.data);
  } catch (error) {
    console.error('Axios error:', error.response?.status, error.response?.data || error.message);
  }
}

// Test 4: Direct backend request (bypassing Vite)
async function testDirectBackend() {
  console.log('\n🟡 Testing direct backend request (port 8000):');
  
  try {
    const config = {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Test-Header': 'test-value'
      }
    };
    
    console.log('Sending headers:', config.headers);
    
    const response = await axios.get('http://localhost:8000/api/admin/users', config);
    logRequestDetails('Direct Backend', response, config.headers);
    console.log('Response data:', response.data);
  } catch (error) {
    console.error('Direct backend error:', error.response?.status, error.response?.data || error.message);
  }
}

// Test 5: Check Vite proxy configuration
async function checkViteConfig() {
  console.log('\n⚙️  Checking Vite proxy behavior:');
  
  try {
    // Try to access a non-existent endpoint to see proxy error
    const response = await fetch(`${VITE_DEV_SERVER}/api/test-proxy-endpoint`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'X-Custom-Header': 'custom-value'
      }
    });
    
    console.log('Proxy test response status:', response.status);
  } catch (error) {
    console.log('Proxy test error (expected):', error.message);
  }
}

// Test 6: Test with different authorization formats
async function testAuthFormats() {
  console.log('\n🔍 Testing different authorization formats:');
  
  const authFormats = [
    { name: 'Bearer with space', value: `Bearer ${TEST_TOKEN}` },
    { name: 'bearer lowercase', value: `bearer ${TEST_TOKEN}` },
    { name: 'Token only', value: TEST_TOKEN },
    { name: 'Basic auth', value: 'Basic bWFydGluQGRhbmdsZWZlZXQuY29tOjEyMw==' }
  ];
  
  for (const format of authFormats) {
    console.log(`\nTesting ${format.name}:`);
    try {
      const response = await fetch(`${VITE_DEV_SERVER}/api/admin/users`, {
        headers: {
          'Authorization': format.value
        }
      });
      console.log(`- Status: ${response.status}`);
    } catch (error) {
      console.log(`- Error: ${error.message}`);
    }
  }
}

// Run all tests
async function runAllTests() {
  console.log('Starting header forwarding tests...\n');
  console.log('Make sure:');
  console.log('1. Vite dev server is running on port 3000 (npm run dev)');
  console.log('2. Backend server is running on port 8000 (python api/server.py)');
  console.log('3. You have a valid JWT token\n');
  
  await testAxiosAuth();
  await testFetchAuth();
  await testAxiosNoAuth();
  await testDirectBackend();
  await checkViteConfig();
  await testAuthFormats();
  
  console.log('\n=== Tests Complete ===');
  console.log('\nIf authorization headers are not being forwarded:');
  console.log('1. Check vite.config.js proxy configuration');
  console.log('2. Ensure changeOrigin: true is set');
  console.log('3. Check if custom headers are being stripped');
  console.log('4. Try adding rewrite rules for headers');
}

// Execute tests
runAllTests().catch(console.error);