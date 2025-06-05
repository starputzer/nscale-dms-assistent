/**
 * Debugging utility to trace streaming issues
 */

// Override the fetch function to log streaming responses
const originalFetch = window.fetch;

export function enableStreamingDebug() {
  console.log("🔍 Streaming debug enabled");
  
  window.fetch = async function(...args: Parameters<typeof fetch>) {
    const [url, options] = args;
    
    // Check if this is a streaming request
    if (typeof url === 'string' && url.includes('/api/chat/message/stream')) {
      console.log('🌊 Intercepted streaming request:', {
        url,
        headers: options?.headers,
        method: options?.method || 'GET'
      });
      
      try {
        const response = await originalFetch(...args);
        
        // Log response details
        console.log('📥 Streaming response received:', {
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          contentType: response.headers.get('content-type')
        });
        
        // Clone the response so we can read it without consuming it
        const _clonedResponse = response.clone();
        
        // Create a wrapper response that logs the stream
        const reader = response.body?.getReader();
        if (reader) {
          const stream = new ReadableStream({
            async start(controller) {
              let totalChunks = 0;
              let totalBytes = 0;
              
              try {
                while (true) {
                  const { done, value } = await reader.read();
                  
                  if (done) {
                    console.log('✅ Stream complete:', {
                      totalChunks,
                      totalBytes
                    });
                    controller.close();
                    break;
                  }
                  
                  totalChunks++;
                  totalBytes += value.length;
                  
                  // Decode and log first chunk for debugging
                  if (totalChunks <= 3) {
                    const decoder = new TextDecoder();
                    const text = decoder.decode(value, { stream: true });
                    console.log(`📦 Chunk ${totalChunks} (${value.length} bytes):`, {
                      preview: text.substring(0, 200),
                      hasDataPrefix: text.includes('data:'),
                      hasEventPrefix: text.includes('event:')
                    });
                  }
                  
                  controller.enqueue(value);
                }
              } catch (error) {
                console.error('❌ Stream error:', error);
                controller.error(error);
              }
            }
          });
          
          // Return new response with our logged stream
          return new Response(stream, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
          });
        }
        
        return response;
      } catch (error) {
        console.error('❌ Fetch error:', error);
        throw error;
      }
    }
    
    // For non-streaming requests, use original fetch
    return originalFetch(...args);
  };
}

export function disableStreamingDebug() {
  console.log("🔍 Streaming debug disabled");
  window.fetch = originalFetch;
}

// Auto-enable in development
if (import.meta.env.DEV) {
  enableStreamingDebug();
}