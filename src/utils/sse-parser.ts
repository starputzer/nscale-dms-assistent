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

export class SSEParser {
  private buffer: string = '';
  private currentMessage: Partial<SSEMessage> = {};

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