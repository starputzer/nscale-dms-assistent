/**
 * Chat Streaming Verification Tests
 * 
 * This script contains tests to verify the chat streaming functionality
 * Run with Node.js after implementing the fixes
 * 
 * Usage: node test-chat-streaming-verification.js
 */

import fetch from 'node-fetch';
import { AbortController } from 'abort-controller';

// Configuration
const API_BASE_URL = 'http://localhost:5000';  // Updated to match our server port
const AUTH_TOKEN = 'YOUR_AUTH_TOKEN';  // Update with a valid authentication token

/**
 * Colored console output helpers
 */
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function logSuccess(message) {
  console.log(`${colors.green}✓ ${message}${colors.reset}`);
}

function logError(message) {
  console.log(`${colors.red}✗ ${message}${colors.reset}`);
}

function logInfo(message) {
  console.log(`${colors.blue}ℹ ${message}${colors.reset}`);
}

function logWarning(message) {
  console.log(`${colors.yellow}⚠ ${message}${colors.reset}`);
}

/**
 * Test 1: Create a new session using POST
 */
async function testCreateSession() {
  logInfo('Test 1: Creating a new session via POST...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: `Test Session ${new Date().toISOString()}`
      })
    });
    
    if (!response.ok) {
      logError(`Failed to create session: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const data = await response.json();
    logSuccess(`Session created successfully with ID: ${data.id}`);
    return data.id;
  } catch (error) {
    logError(`Error creating session: ${error.message}`);
    return null;
  }
}

/**
 * Test 2: Fetch messages for a session
 */
async function testFetchMessages(sessionId) {
  logInfo(`Test 2: Fetching messages for session ${sessionId}...`);
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/messages`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`
      }
    });
    
    if (!response.ok) {
      logError(`Failed to fetch messages: ${response.status} ${response.statusText}`);
      return false;
    }
    
    const data = await response.json();
    logSuccess(`Successfully fetched ${data.length || 0} messages`);
    return true;
  } catch (error) {
    logError(`Error fetching messages: ${error.message}`);
    return false;
  }
}

/**
 * Test 3: Test streaming endpoint
 */
async function testStreaming(sessionId) {
  logInfo(`Test 3: Testing streaming with session ${sessionId}...`);
  
  const question = "What is the current time?";
  const params = new URLSearchParams({
    question,
    session_id: sessionId
  });
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/question/stream?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Accept': 'text/event-stream'
      },
      signal: controller.signal
    });
    
    if (!response.ok) {
      clearTimeout(timeoutId);
      logError(`Streaming request failed: ${response.status} ${response.statusText}`);
      return false;
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let receivedData = false;
    let isDone = false;
    
    while (!isDone) {
      const { done, value } = await reader.read();
      
      if (done) {
        isDone = true;
        break;
      }
      
      const chunk = decoder.decode(value, { stream: true });
      console.log(`Received chunk: ${chunk.substring(0, 50)}...`);
      receivedData = true;
      
      if (chunk.includes('event: done') || chunk.includes('[DONE]')) {
        isDone = true;
        break;
      }
    }
    
    clearTimeout(timeoutId);
    
    if (receivedData) {
      logSuccess('Streaming endpoint working correctly');
      return true;
    } else {
      logWarning('Stream connected but no data received');
      return false;
    }
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      logError('Streaming request timed out');
    } else {
      logError(`Streaming error: ${error.message}`);
    }
    return false;
  }
}

/**
 * Test 4: Test batch API
 */
async function testBatchAPI(sessionId) {
  logInfo(`Test 4: Testing batch API with session ${sessionId}...`);
  
  try {
    const batchRequests = [
      {
        id: 'fetch_sessions',
        endpoint: '/api/sessions',
        method: 'GET'
      },
      {
        id: 'fetch_messages',
        endpoint: `/api/sessions/${sessionId}/messages`,
        method: 'GET'
      }
    ];
    
    const response = await fetch(`${API_BASE_URL}/api/batch`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: batchRequests
      })
    });
    
    if (!response.ok) {
      logError(`Batch request failed: ${response.status} ${response.statusText}`);
      return false;
    }
    
    const data = await response.json();
    
    if (data.success && data.data && Array.isArray(data.data.responses)) {
      const allSuccessful = data.data.responses.every(res => res.success);
      
      if (allSuccessful) {
        logSuccess('Batch API working correctly');
        return true;
      } else {
        const failedRequests = data.data.responses
          .filter(res => !res.success)
          .map(res => `${res.id}: ${res.error || 'Unknown error'}`);
        
        logError(`Some batch requests failed: ${failedRequests.join(', ')}`);
        return false;
      }
    } else {
      logError('Invalid batch response format');
      return false;
    }
  } catch (error) {
    logError(`Batch API error: ${error.message}`);
    return false;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log(`${colors.cyan}=== Chat Streaming Verification Tests ===${colors.reset}`);
  console.log(`Testing API at: ${API_BASE_URL}`);
  console.log('');
  
  // Test 1: Create Session
  const sessionId = await testCreateSession();
  if (!sessionId) {
    logError('Cannot proceed with further tests without a valid session ID');
    process.exit(1);
  }
  
  console.log('');
  
  // Test 2: Fetch Messages
  const messagesSuccess = await testFetchMessages(sessionId);
  console.log('');
  
  // Test 3: Test Streaming
  const streamingSuccess = await testStreaming(sessionId);
  console.log('');
  
  // Test 4: Test Batch API
  const batchSuccess = await testBatchAPI(sessionId);
  console.log('');
  
  // Summary
  console.log(`${colors.cyan}=== Test Results ===${colors.reset}`);
  console.log(`Create Session: ${sessionId ? colors.green + 'PASS' : colors.red + 'FAIL'}${colors.reset}`);
  console.log(`Fetch Messages: ${messagesSuccess ? colors.green + 'PASS' : colors.red + 'FAIL'}${colors.reset}`);
  console.log(`Streaming: ${streamingSuccess ? colors.green + 'PASS' : colors.red + 'FAIL'}${colors.reset}`);
  console.log(`Batch API: ${batchSuccess ? colors.green + 'PASS' : colors.red + 'FAIL'}${colors.reset}`);
  
  const allPassed = sessionId && messagesSuccess && streamingSuccess && batchSuccess;
  
  console.log('');
  if (allPassed) {
    console.log(`${colors.green}✓ All tests passed! The streaming functionality is working correctly.${colors.reset}`);
  } else {
    console.log(`${colors.red}✗ Some tests failed. Please review the issues before deployment.${colors.reset}`);
  }
}

// Start the tests
runTests().catch(error => {
  console.error(`${colors.red}Unhandled error:${colors.reset}`, error);
  process.exit(1);
});