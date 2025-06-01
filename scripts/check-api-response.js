#!/usr/bin/env node

// Script to check the actual API response format
// Run this after logging in via the browser

const fetch = require('node-fetch');
const fs = require('fs');

async function checkApiResponses() {
    // Read the working auth config if available
    let token = null;
    try {
        const config = JSON.parse(fs.readFileSync('working_auth_config.json', 'utf8'));
        token = config.token;
    } catch (e) {
        console.log('No working_auth_config.json found, getting new token...');
    }

    // If no token, login first
    if (!token) {
        const loginResponse = await fetch('http://localhost:8080/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'martin@danglefeet.com',
                password: '123'
            })
        });

        const loginData = await loginResponse.json();
        token = loginData.access_token || loginData.token;
    }

    if (!token) {
        console.error('Could not get auth token');
        return;
    }

    console.log('Using token:', token.substring(0, 20) + '...');

    // Test endpoints
    const endpoints = [
        '/api/v1/admin/users',
        '/api/v1/admin/users/count', 
        '/api/v1/admin/feedback/stats'
    ];

    for (const endpoint of endpoints) {
        console.log(`\n=== Testing ${endpoint} ===`);
        try {
            const response = await fetch(`http://localhost:8080${endpoint}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();
            console.log('Status:', response.status);
            console.log('Response:', JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Error:', error.message);
        }
    }
}

checkApiResponses();