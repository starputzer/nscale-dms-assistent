#!/usr/bin/env node

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
      throw new Error(`Login failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✅ Login successful!');
    console.log('📋 Access Token:', data.access_token);
    console.log('\n💡 To use in browser console:');
    console.log(`localStorage.setItem('nscale_access_token', '${data.access_token}');`);
    console.log(`localStorage.setItem('nscale_user', JSON.stringify({id: '${data.user_id}', email: 'martin@danglefeet.com', role: 'admin'}));`);
    console.log('\nThen refresh the page.');
    
  } catch (error) {
    console.error('❌ Login failed:', error.message);
    console.log('\n💡 Make sure:');
    console.log('1. Python backend is running on port 8080');
    console.log('2. User martin@danglefeet.com exists with password "123"');
  }
}

testAdminLogin();
