# Streaming Implementation Analysis and Fixes

## Issues Identified

### 1. Frontend Using Fetch Instead of EventSource
The frontend is using `fetch` API to handle Server-Sent Events, which requires manual parsing of the SSE format. While this can work, it's more complex than using the native `EventSource` API.

### 2. Vite Proxy Configuration
The Vite development server proxy doesn't have specific configuration for streaming endpoints, which can cause buffering issues.

### 3. Missing Streaming Headers
The proxy might not be forwarding all necessary headers for streaming to work properly.

## Recommended Fixes

### Fix 1: Update Vite Configuration for Streaming

```javascript
// vite.config.js
server: {
  port: 3000,
  proxy: {
    "/api": {
      target: "http://localhost:8080",
      changeOrigin: true,
      secure: false,
      // Add specific handling for streaming endpoints
      configure: (proxy, options) => {
        // Handle streaming endpoints
        proxy.on('proxyReq', (proxyReq, req, res) => {
          if (req.url.includes('/api/question/stream')) {
            // Disable buffering for streaming
            proxyReq.setHeader('X-Accel-Buffering', 'no');
            proxyReq.setHeader('Cache-Control', 'no-cache');
          }
        });
        
        proxy.on('proxyRes', (proxyRes, req, res) => {
          if (req.url.includes('/api/question/stream')) {
            // Ensure streaming headers are set
            proxyRes.headers['cache-control'] = 'no-cache';
            proxyRes.headers['content-type'] = 'text/event-stream';
            proxyRes.headers['x-accel-buffering'] = 'no';
          }
        });
        
        // Existing error handling...
      },
    },
  },
},
```

### Fix 2: Alternative Frontend Implementation Using EventSource

```typescript
// Alternative implementation using EventSource
if (streamingEnabled) {
  console.log("=== STREAMING DEBUG START ===");
  console.log("Using streaming endpoint for message:", content);

  // Create initial assistant message
  const assistantTempId = `temp-response-${uuidv4()}`;
  const streamingMessage: ChatMessage = {
    id: assistantTempId,
    sessionId,
    content: "",
    role: "assistant",
    timestamp: new Date().toISOString(),
    isStreaming: true,
    status: "pending" as const,
  };
  messages.value[sessionId].push(streamingMessage);

  // Create EventSource
  const params = new URLSearchParams();
  params.append("question", content);
  params.append("session_id", sessionId || "new");
  params.append("auth_token", authToken); // Since EventSource doesn't support headers

  const eventSource = new EventSource(`/api/question/stream?${params.toString()}`);
  let responseContent = "";

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.response) {
        responseContent += data.response;
        // Update message
        const msgIndex = messages.value[sessionId].findIndex(
          (msg) => msg.id === assistantTempId
        );
        if (msgIndex !== -1) {
          const updatedMessages = [...messages.value[sessionId]];
          updatedMessages[msgIndex] = {
            ...updatedMessages[msgIndex],
            content: responseContent,
          };
          messages.value = {
            ...messages.value,
            [sessionId]: updatedMessages,
          };
        }
      }
    } catch (e) {
      console.error("Error parsing SSE data:", e);
    }
  };

  eventSource.addEventListener('done', () => {
    eventSource.close();
    finishStreaming();
  });

  eventSource.onerror = (error) => {
    console.error("EventSource error:", error);
    eventSource.close();
    // Fallback to non-streaming API
    // ...
  };
}
```

### Fix 3: Debug Logging Enhancement

Add more detailed logging to identify where the streaming breaks:

```typescript
// In the fetch implementation
console.log("Response headers:", response.headers.get('content-type'));
console.log("Response status:", response.status);

// In the streaming loop
console.log("Chunk received:", chunk);
console.log("Lines parsed:", lines);
```

### Fix 4: Backend Response Headers

Ensure the backend is sending proper headers:

```python
# In server.py
async def stream_question(...):
    # ... existing code ...
    
    response = await rag_engine.stream_answer(question, session_id_int, use_simple_language, stream_id=stream_id)
    
    # Ensure proper headers are set
    response.headers['Cache-Control'] = 'no-cache'
    response.headers['X-Accel-Buffering'] = 'no'
    
    return response
```

## Testing Steps

1. Check browser network tab to see if streaming responses are received
2. Look for "text/event-stream" content-type in response headers
3. Monitor console logs for streaming debug messages
4. Test with a simple curl command:
   ```bash
   curl -N -H "Authorization: Bearer YOUR_TOKEN" \
     "http://localhost:8080/api/question/stream?question=test&session_id=1"
   ```

## Quick Fix Priority

1. **First**: Update Vite proxy configuration to disable buffering
2. **Second**: Add more debug logging to identify the exact failure point
3. **Third**: Consider switching to EventSource API for cleaner implementation