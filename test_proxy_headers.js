#!/usr/bin/env node

/**
 * Test script to debug Vite proxy authorization header forwarding
 * Run this after starting both the backend (python api/server.py) and frontend (npm run dev)
 */

async function testProxyHeaders() {
  const FRONTEND_URL = 'http://localhost:3000';
  const TEST_TOKEN = 'test-jwt-token-here';
  
  console.log('🧪 Testing Vite Proxy Header Forwarding\n');
  
  // Test 1: Direct backend call (should work)
  console.log('1️⃣ Testing direct backend call (port 8000)...');
  try {
    const directResponse = await fetch('http://localhost:8000/api/admin/users', {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    console.log(`   Status: ${directResponse.status}`);
    console.log(`   Headers: ${JSON.stringify(Object.fromEntries(directResponse.headers))}\n`);
  } catch (error) {
    console.error('   ❌ Direct backend call failed:', error.message, '\n');
  }
  
  // Test 2: Through Vite proxy with standard Authorization header
  console.log('2️⃣ Testing through Vite proxy with Authorization header...');
  try {
    const proxyResponse = await fetch(`${FRONTEND_URL}/api/admin/users`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    console.log(`   Status: ${proxyResponse.status}`);
    const responseText = await proxyResponse.text();
    console.log(`   Response: ${responseText.substring(0, 100)}...`);
    console.log(`   Headers: ${JSON.stringify(Object.fromEntries(proxyResponse.headers))}\n`);
  } catch (error) {
    console.error('   ❌ Proxy call failed:', error.message, '\n');
  }
  
  // Test 3: Different header variations
  const headerVariations = [
    { 'authorization': `Bearer ${TEST_TOKEN}` },
    { 'Authorization': `Bearer ${TEST_TOKEN}` },
    { 'AUTHORIZATION': `Bearer ${TEST_TOKEN}` },
    { 'Bearer': TEST_TOKEN }
  ];
  
  console.log('3️⃣ Testing different header variations...');
  for (const [index, headers] of headerVariations.entries()) {
    console.log(`   Variation ${index + 1}: ${JSON.stringify(headers)}`);
    try {
      const response = await fetch(`${FRONTEND_URL}/api/admin/users`, {
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        }
      });
      console.log(`   Status: ${response.status}`);
    } catch (error) {
      console.error(`   ❌ Failed:`, error.message);
    }
  }
  
  // Test 4: Check what headers the browser would send
  console.log('\n4️⃣ Browser-style request simulation...');
  try {
    const response = await fetch(`${FRONTEND_URL}/api/admin/users`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Test Script)',
        'X-Requested-With': 'XMLHttpRequest'
      },
      credentials: 'include'
    });
    console.log(`   Status: ${response.status}`);
    const body = await response.text();
    console.log(`   Response preview: ${body.substring(0, 200)}...`);
  } catch (error) {
    console.error('   ❌ Browser simulation failed:', error.message);
  }
  
  console.log('\n✅ Test completed. Check the Vite dev server console for proxy logs.');
  console.log('💡 If authorization headers are not being forwarded:');
  console.log('   1. Check the Vite console output for proxy logs');
  console.log('   2. Ensure the backend is running on port 8000');
  console.log('   3. Try restarting the Vite dev server');
  console.log('   4. Check if any middleware is stripping headers');
}

// Run the test
testProxyHeaders().catch(console.error);