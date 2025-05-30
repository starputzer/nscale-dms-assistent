#!/usr/bin/env node

/**
 * Test script to check if frontend loads correctly
 */

const http = require('http');

const testFrontendLoading = () => {
  console.log('Testing frontend loading...\n');

  const options = {
    hostname: 'localhost',
    port: 5173,
    path: '/',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);

    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      // Check for common error indicators
      if (data.includes('_messages is not defined')) {
        console.error('❌ ERROR: _messages is not defined - i18n issue');
      } else if (data.includes('Cannot find module')) {
        console.error('❌ ERROR: Module not found');
      } else if (data.includes('Failed to fetch')) {
        console.error('❌ ERROR: Failed to fetch resources');
      } else if (data.includes('<!DOCTYPE html>')) {
        console.log('✅ HTML page loaded successfully');
        
        // Check for Vue app mounting
        if (data.includes('id="app"')) {
          console.log('✅ Vue app container found');
        } else {
          console.warn('⚠️  WARNING: Vue app container not found');
        }
      } else {
        console.warn('⚠️  WARNING: Unexpected response');
      }

      // Show first 500 chars of response
      console.log('\nFirst 500 characters of response:');
      console.log(data.substring(0, 500));
    });
  });

  req.on('error', (error) => {
    console.error(`❌ ERROR: ${error.message}`);
    console.log('\nMake sure the dev server is running: npm run dev');
  });

  req.end();
};

// Run the test
testFrontendLoading();