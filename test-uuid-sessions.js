#!/usr/bin/env node

// Test script to verify UUID-based session handling

const axios = require('axios');

const API_URL = 'http://localhost:8080';
const TEST_EMAIL = 'martin@danglefeet.com';
const TEST_PASSWORD = '123';

async function testSessionHandling() {
    try {
        console.log('🔐 1. Logging in...');
        const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
            email: TEST_EMAIL,
            password: TEST_PASSWORD
        });
        
        const token = loginResponse.data.access_token;
        console.log('✅ Login successful, token:', token.substring(0, 20) + '...');
        
        // Set default headers
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        console.log('\n📋 2. Getting sessions...');
        const sessionsResponse = await axios.get(`${API_URL}/api/sessions`);
        console.log(`✅ Found ${sessionsResponse.data.sessions.length} sessions`);
        
        if (sessionsResponse.data.sessions.length > 0) {
            const firstSession = sessionsResponse.data.sessions[0];
            console.log('\n🔍 First session:');
            console.log('  - ID (UUID):', firstSession.id);
            console.log('  - Numeric ID:', firstSession.numericId);
            console.log('  - Title:', firstSession.title);
            console.log('  - Created:', firstSession.createdAt);
            console.log('  - Updated:', firstSession.updatedAt);
            
            // Test getting messages with UUID
            console.log('\n💬 3. Getting messages for session:', firstSession.id);
            try {
                const messagesResponse = await axios.get(`${API_URL}/api/sessions/${firstSession.id}/messages`);
                console.log(`✅ Found ${messagesResponse.data.messages.length} messages`);
            } catch (error) {
                console.log('❌ Error getting messages:', error.response?.data || error.message);
            }
        }
        
        // Test creating a new session
        console.log('\n➕ 4. Creating new session with frontend UUID...');
        const frontendUuid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        try {
            const createResponse = await axios.post(`${API_URL}/api/sessions`, {
                id: frontendUuid,
                title: 'Test Session with UUID'
            });
            console.log('✅ Created session:');
            console.log('  - ID:', createResponse.data.id);
            console.log('  - Numeric ID:', createResponse.data.numericId);
            console.log('  - Title:', createResponse.data.title);
            
            // Test updating title
            console.log('\n✏️ 5. Testing title update...');
            const updateResponse = await axios.post(`${API_URL}/api/session/${createResponse.data.id}/update-title`);
            console.log('✅ Title update response:', updateResponse.data);
            
        } catch (error) {
            console.log('❌ Error creating session:', error.response?.data || error.message);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

// Run the test
testSessionHandling();