#!/usr/bin/env node

// Test script to verify streaming endpoint directly
const http = require('http');

// Configuration
const API_HOST = 'localhost';
const API_PORT = 8080;
const AUTH_TOKEN = process.argv[2]; // Pass token as first argument

if (!AUTH_TOKEN) {
  console.error('Usage: node test-streaming-endpoint.js <auth-token>');
  process.exit(1);
}

const question = 'Was ist nscale?';
const sessionId = '1';

// Build URL with query parameters
const params = new URLSearchParams({
  question: question,
  session_id: sessionId
});

const options = {
  hostname: API_HOST,
  port: API_PORT,
  path: `/api/question/stream?${params.toString()}`,
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Accept': 'text/event-stream'
  }
};

console.log('Testing streaming endpoint...');
console.log('URL:', `http://${API_HOST}:${API_PORT}${options.path}`);
console.log('Headers:', options.headers);

const req = http.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log('Response Headers:', res.headers);
  
  let buffer = '';
  
  res.on('data', (chunk) => {
    const chunkStr = chunk.toString();
    console.log('Received chunk:', chunkStr);
    buffer += chunkStr;
    
    // Process complete SSE messages
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep incomplete line in buffer
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        console.log('SSE data:', data);
        
        if (data === '[DONE]') {
          console.log('Stream completed');
          return;
        }
        
        try {
          const parsed = JSON.parse(data);
          console.log('Parsed JSON:', parsed);
        } catch (e) {
          console.log('Not JSON:', data);
        }
      } else if (line.startsWith('event: ')) {
        console.log('SSE event:', line.slice(7));
      }
    }
  });
  
  res.on('end', () => {
    console.log('Response ended');
  });
  
  res.on('error', (err) => {
    console.error('Response error:', err);
  });
});

req.on('error', (err) => {
  console.error('Request error:', err);
});

req.end();

// Also test with EventSource API simulation
console.log('\n--- Testing with curl command ---');
console.log(`curl -N -H "Authorization: Bearer ${AUTH_TOKEN}" "http://${API_HOST}:${API_PORT}/api/question/stream?question=${encodeURIComponent(question)}&session_id=${sessionId}"`);