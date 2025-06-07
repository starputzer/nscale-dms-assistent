/**
 * SSE (Server-Sent Events) Parser Utility
 * Properly handles SSE stream parsing with buffering for incomplete messages
 */

export interface SSEMessage {
  event?: string;
  data?: string;
  id?: string;
  retry?: number;
}

<<<<<<< HEAD
/**
 * Safely parse JSON data from SSE, with additional validation
 * @param data The data to parse
 * @returns Parsed object or null if parsing fails
 */
export function safeParseSSEData(data: string): any {
  // Check if data still contains SSE formatting
  if (data.startsWith('data:')) {
    console.error('ERROR: Attempting to parse SSE-formatted data:', data);
    // Try to extract the actual JSON part
    const actualData = data.slice(5).trim();
    if (actualData) {
      try {
        return JSON.parse(actualData);
      } catch (e) {
        console.error('Failed to parse extracted data:', e);
        return null;
      }
    }
    return null;
  }
  
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error('Failed to parse SSE data:', e, 'Raw data:', data);
    return null;
  }
}

export class SSEParser {
  private buffer: string = '';
  private _currentMessage: Partial<SSEMessage> = {};
=======
export class SSEParser {
  private buffer: string = '';
  private currentMessage: Partial<SSEMessage> = {};
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da

  /**
   * Parse a chunk of SSE data
   * @param chunk The chunk of data to parse
   * @returns Array of complete SSE messages
   */
  parseChunk(chunk: string): SSEMessage[] {
    this.buffer += chunk;
    const messages: SSEMessage[] = [];
    
    // Split by double newline to find complete messages
    const parts = this.buffer.split('\n\n');
    
    // Keep the last part in buffer if it's incomplete
    this.buffer = parts.pop() || '';
    
    // Process complete messages
    for (const part of parts) {
      if (!part.trim()) continue;
      
      const message = this.parseMessage(part);
      if (message.data !== undefined || message.event !== undefined) {
        messages.push(message);
      }
    }
    
    return messages;
  }

  /**
   * Parse a complete SSE message
   * @param messageText The message text to parse
   * @returns Parsed SSE message
   */
  private parseMessage(messageText: string): SSEMessage {
    const message: SSEMessage = {};
    const lines = messageText.split('\n');
    
    for (const line of lines) {
      if (!line) continue;
      
      const colonIndex = line.indexOf(':');
      
      // Comment line
      if (colonIndex === 0) continue;
      
      // Field with value
      if (colonIndex > 0) {
        const field = line.substring(0, colonIndex);
        const value = line.substring(colonIndex + 1).trim();
        
        switch (field) {
          case 'event':
            message.event = value;
            break;
          case 'data':
            message.data = message.data ? message.data + '\n' + value : value;
            break;
          case 'id':
            message.id = value;
            break;
          case 'retry':
            message.retry = parseInt(value, 10);
            break;
        }
      }
    }
    
    return message;
  }

  /**
   * Reset the parser state
   */
  reset(): void {
    this.buffer = '';
    this.currentMessage = {};
  }

  /**
   * Get any remaining buffered data
   */
  getBuffer(): string {
    return this.buffer;
  }
}

/**
 * Helper function to use SSEParser with fetch streaming
 */
export async function* parseSSEStream(response: Response): AsyncGenerator<SSEMessage> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }
  
  const decoder = new TextDecoder();
  const parser = new SSEParser();
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        // Parse any remaining buffered data
        const remaining = parser.getBuffer();
        if (remaining) {
          const messages = parser.parseChunk(remaining + '\n\n');
          for (const message of messages) {
            yield message;
          }
        }
        break;
      }
      
      const chunk = decoder.decode(value, { stream: true });
      const messages = parser.parseChunk(chunk);
      
      for (const message of messages) {
        yield message;
      }
    }
  } finally {
    reader.releaseLock();
  }
}