#!/usr/bin/env node

/**
 * Direct streaming endpoint test utility
 * Tests the /api/question/stream endpoint without going through Vue
 * 
 * Usage:
 * - Run in browser console: copy/paste the testStreaming function
 * - Run as Node.js script: node test-streaming-direct.js <question> <token>
 * - Run in browser: open test-streaming-direct.html
 */

// Configuration
const API_BASE_URL = 'http://localhost:5000';
const STREAM_ENDPOINT = '/api/question/stream';

/**
 * Test streaming endpoint directly
 * @param {string} question - The question to send
 * @param {string} authToken - JWT auth token (optional, will try localStorage)
 * @param {string} sessionId - Session ID (optional, will generate if not provided)
 */
async function testStreaming(question = 'Hallo, wie geht es dir?', authToken = null, sessionId = null) {
    console.log('=== Direct Streaming Test ===');
    console.log('Question:', question);
    
    // Try to get auth token from localStorage if not provided
    if (!authToken && typeof window !== 'undefined' && window.localStorage) {
        authToken = localStorage.getItem('authToken');
        if (authToken) {
            console.log('Using auth token from localStorage');
        }
    }
    
    // Generate session ID if not provided
    if (!sessionId) {
        sessionId = 'test-session-' + Date.now();
        console.log('Generated session ID:', sessionId);
    }
    
    const url = `${API_BASE_URL}${STREAM_ENDPOINT}`;
    console.log('URL:', url);
    
    // Prepare request payload
    const payload = {
        question: question,
        session_id: sessionId,
        context: [],
        stream: true
    };
    
    console.log('Request payload:', JSON.stringify(payload, null, 2));
    
    // Prepare headers
    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
    };
    
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    console.log('Request headers:', headers);
    
    try {
        console.log('\n--- Sending request ---');
        const startTime = Date.now();
        
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload),
            credentials: 'include'
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:');
        response.headers.forEach((value, key) => {
            console.log(`  ${key}: ${value}`);
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            return;
        }
        
        // Check if response is SSE
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('text/event-stream')) {
            console.warn('Warning: Response is not text/event-stream, got:', contentType);
            const text = await response.text();
            console.log('Response body:', text);
            return;
        }
        
        console.log('\n--- Reading SSE stream ---');
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let eventCount = 0;
        let totalTokens = 0;
        
        while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
                console.log('\n--- Stream ended ---');
                break;
            }
            
            // Decode chunk
            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;
            
            // Process complete events
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer
            
            for (const line of lines) {
                if (line.trim() === '') continue;
                
                if (line.startsWith('data: ')) {
                    eventCount++;
                    const data = line.slice(6);
                    
                    try {
                        const parsed = JSON.parse(data);
                        
                        if (parsed.token) {
                            totalTokens++;
                            process.stdout.write(parsed.token);
                        }
                        
                        console.log(`\nEvent ${eventCount}:`, JSON.stringify(parsed, null, 2));
                        
                        if (parsed.done) {
                            console.log('\n--- Stream complete signal received ---');
                        }
                        
                        if (parsed.error) {
                            console.error('Stream error:', parsed.error);
                        }
                        
                    } catch (e) {
                        console.log(`\nEvent ${eventCount} (raw):`, data);
                    }
                }
            }
        }
        
        const duration = Date.now() - startTime;
        console.log('\n--- Summary ---');
        console.log('Total events:', eventCount);
        console.log('Total tokens:', totalTokens);
        console.log('Duration:', duration, 'ms');
        console.log('Avg time per token:', totalTokens > 0 ? (duration / totalTokens).toFixed(2) : 'N/A', 'ms');
        
    } catch (error) {
        console.error('\n--- Error ---');
        console.error('Error type:', error.name);
        console.error('Error message:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

/**
 * Test non-streaming endpoint for comparison
 */
async function testNonStreaming(question = 'Hallo, wie geht es dir?', authToken = null, sessionId = null) {
    console.log('\n=== Non-Streaming Test (for comparison) ===');
    
    if (!authToken && typeof window !== 'undefined' && window.localStorage) {
        authToken = localStorage.getItem('authToken');
    }
    
    if (!sessionId) {
        sessionId = 'test-session-' + Date.now();
    }
    
    const url = `${API_BASE_URL}/api/question`;
    const payload = {
        question: question,
        session_id: sessionId,
        context: [],
        stream: false
    };
    
    const headers = {
        'Content-Type': 'application/json',
    };
    
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    try {
        const startTime = Date.now();
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload),
            credentials: 'include'
        });
        
        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Response:', JSON.stringify(data, null, 2));
        console.log('Duration:', Date.now() - startTime, 'ms');
        
    } catch (error) {
        console.error('Error:', error);
    }
}

/**
 * Test SSE parsing directly
 */
function testSSEParsing() {
    console.log('\n=== SSE Parsing Test ===');
    
    const sampleSSE = `data: {"token": "Hallo"}\n\ndata: {"token": ", "}\n\ndata: {"token": "ich "}\n\ndata: {"token": "bin "}\n\ndata: {"done": true}\n\n`;
    
    console.log('Sample SSE data:');
    console.log(sampleSSE);
    
    const lines = sampleSSE.split('\n');
    let message = '';
    
    for (const line of lines) {
        if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
                const parsed = JSON.parse(data);
                if (parsed.token) {
                    message += parsed.token;
                }
                console.log('Parsed:', parsed);
            } catch (e) {
                console.log('Failed to parse:', data);
            }
        }
    }
    
    console.log('Reconstructed message:', message);
}

// For Node.js execution
if (typeof window === 'undefined') {
    // Node.js environment
    const args = process.argv.slice(2);
    const question = args[0] || 'Hallo, wie geht es dir?';
    const authToken = args[1] || null;
    
    console.log('Running in Node.js mode');
    console.log('Note: This script is designed to run in a browser environment');
    console.log('For best results, copy the functions to browser console or use test-streaming-direct.html');
    
    // Polyfill fetch for Node.js if needed
    if (typeof fetch === 'undefined') {
        console.error('fetch is not available in this Node.js environment');
        console.error('Install node-fetch or run this script in a browser');
        process.exit(1);
    }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { testStreaming, testNonStreaming, testSSEParsing };
}

// Instructions for browser console
console.log(`
=== Browser Console Usage ===

1. Copy and paste this entire script into the browser console
2. Run the tests:

   // Test streaming endpoint
   await testStreaming('Was ist nscale?');
   
   // Test with custom auth token
   await testStreaming('Was ist nscale?', 'your-auth-token-here');
   
   // Test non-streaming for comparison
   await testNonStreaming('Was ist nscale?');
   
   // Test SSE parsing
   testSSEParsing();

3. Check the console output for detailed information
`);