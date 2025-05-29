#!/usr/bin/env node

// Test script to verify admin API response structure
async function testAdminAPI() {
  console.log('Testing Admin API Response Structure...\n');
  
  // Import fetch for Node.js
  const fetch = require('node-fetch');
  
  const baseURL = 'http://localhost:8080';
  const token = localStorage.getItem('auth_token'); // You'll need to get a valid token
  
  const endpoints = [
    {
      name: 'Users',
      url: '/api/v1/admin/users',
      expectedStructure: 'response.data.users (array)'
    },
    {
      name: 'User Count',
      url: '/api/v1/admin/users/count',
      expectedStructure: 'response.data.count (number)'
    },
    {
      name: 'User Stats',
      url: '/api/v1/admin/users/stats',
      expectedStructure: 'response.data (stats object)'
    },
    {
      name: 'Feedback Stats',
      url: '/api/v1/admin/feedback/stats',
      expectedStructure: 'response.data.stats (stats object)'
    },
    {
      name: 'Negative Feedback',
      url: '/api/v1/admin/feedback/negative',
      expectedStructure: 'response.data.feedback (array)'
    }
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Testing ${endpoint.name}...`);
      const response = await fetch(`${baseURL}${endpoint.url}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      console.log(`Status: ${response.status}`);
      console.log(`Response structure:`, JSON.stringify(data, null, 2).substring(0, 200) + '...');
      console.log(`Expected: ${endpoint.expectedStructure}`);
      console.log('---\n');
      
    } catch (error) {
      console.error(`Error testing ${endpoint.name}:`, error.message);
      console.log('---\n');
    }
  }
}

// Note: This script needs to be run in a browser context or with proper Node.js setup
console.log(`
To test the API responses:

1. Open your browser console at http://localhost:3000
2. Make sure you're logged in as an admin
3. Run this code:

${testAdminAPI.toString()}

testAdminAPI();
`);