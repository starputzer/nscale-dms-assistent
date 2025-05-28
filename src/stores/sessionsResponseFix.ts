/**
 * Sessions Response Fix
 * 
 * Verbesserte Version zur Korrektur der Verarbeitung von Batch-Antworten in der sessions.ts
 * - Robustere Fehlerbehandlung
 * - Bessere Handhabung von leeren Antworten
 * - Mehr Logging für Debugging-Zwecke
 */

export function processBatchResponse(responses: any, context: string = 'unknown') {
  try {
    console.log(`🔍 Processing batch response for ${context}:`, {
      type: typeof responses,
      isArray: Array.isArray(responses),
      keys: responses ? Object.keys(responses) : null,
      length: responses?.length,
      rawValue: responses
    });

    // Handle empty or null responses
    if (!responses) {
      console.warn(`⚠️ ${context}: Response is null/undefined, returning empty array`);
      return [];
    }
  } catch (error) {
    console.error(`❌ ${context}: Error inspecting batch response:`, error);
    return [];
  }

  try {
    // Handle direct array responses
    if (Array.isArray(responses)) {
      console.log(`✅ ${context}: Response is array with ${responses.length} items`);
      return responses;
    }

    // Handle edge case: Response is a string
    if (typeof responses === 'string') {
      try {
        // Try to parse it as JSON
        const parsed = JSON.parse(responses);
        console.log(`✅ ${context}: Parsed string response to object`);
        
        // Now process the parsed object recursively
        return processBatchResponse(parsed, `${context}_parsed`);
      } catch {
        // Not valid JSON
        console.warn(`⚠️ ${context}: Response is a string but not valid JSON`);
        return [];
      }
    }

    // Check various object formats
    if (typeof responses === 'object') {
      // Handle 'success' wrapper
      if ('success' in responses && responses.success) {
        if (responses.data?.responses) {
          console.log(`✅ ${context}: Found nested responses in success.data.responses`);
          return responses.data.responses;
        }
      }

      // ApiService format: { success: true, data: { responses: [...] } }
      if (responses.data?.responses) {
        console.log(`✅ ${context}: Found nested responses in data.responses`);
        return responses.data.responses;
      }

      // Direct data format: { data: [...] }
      if (responses.data && Array.isArray(responses.data)) {
        console.log(`✅ ${context}: Found array in data property`);
        return responses.data;
      }

      // Server format: { responses: [...] }
      if (responses.responses && Array.isArray(responses.responses)) {
        console.log(`✅ ${context}: Found array in responses property`);
        return responses.responses;
      }

      // Direct object with results
      if (responses.results && Array.isArray(responses.results)) {
        console.log(`✅ ${context}: Found array in results property`);
        return responses.results;
      }
      
      // Direct array in data.data format
      if (responses.data?.data && Array.isArray(responses.data.data)) {
        console.log(`✅ ${context}: Found array in data.data property`);
        return responses.data.data;
      }
    }

    console.error(`❌ ${context}: Unable to process response format`, responses);
    return [];
  } catch (error) {
    console.error(`❌ ${context}: Error in processBatchResponse:`, error);
    return [];
  }
}

export function extractBatchResponseData(responses: any[], index: number, context: string = 'unknown') {
  console.log(`🔍 Extracting data from batch response[${index}] for ${context}`);

  if (!Array.isArray(responses)) {
    console.warn(`⚠️ ${context}: responses is not an array - type: ${typeof responses}`);
    return [];
  }
  
  if (index >= responses.length) {
    console.warn(`⚠️ ${context}: Index ${index} out of bounds (length: ${responses.length})`);
    return [];
  }

  const response = responses[index];
  
  if (!response) {
    console.warn(`⚠️ ${context}: Response at index ${index} is null/undefined`);
    return [];
  }

  // Handle direct data property
  if (response.data !== undefined) {
    console.log(`✅ ${context}: Found data property at index ${index}`);
    return response.data || [];
  }

  // Handle nested response data
  if (response.response?.data !== undefined) {
    console.log(`✅ ${context}: Found nested response.data at index ${index}`);
    return response.response.data || [];
  }

  // Handle data within result
  if (response.result?.data !== undefined) {
    console.log(`✅ ${context}: Found result.data at index ${index}`);
    return response.result.data || [];
  }

  // Direct value - ensure it's not null
  console.log(`✅ ${context}: Using direct response value at index ${index}`);
  return response || [];
}

export function validateSessionsResponse(data: any) {
  console.log('Validating sessions response:', {
    isArray: Array.isArray(data),
    type: typeof data,
    keys: data && typeof data === 'object' ? Object.keys(data) : null,
    isEmpty: !data || (Array.isArray(data) && data.length === 0)
  });

  // Handle null/undefined
  if (!data) {
    console.warn('Sessions response is null or undefined');
    return { valid: false, sessions: [] };
  }

  // Handle empty array
  if (Array.isArray(data) && data.length === 0) {
    console.log('Empty sessions array - valid but empty');
    return { valid: true, sessions: [] };
  }

  // Handle array of sessions directly
  if (Array.isArray(data)) {
    console.log(`Found ${data.length} sessions in array`);
    return { valid: true, sessions: data };
  }

  // Handle object with sessions property
  if (data && typeof data === 'object') {
    if ('sessions' in data && Array.isArray(data.sessions)) {
      console.log(`Found ${data.sessions.length} sessions in data.sessions`);
      return { valid: true, sessions: data.sessions };
    }
    
    // Handle object with error property indicating a 404 Not Found
    if ('error' in data || 'detail' in data || 'status' in data) {
      const errorMessage = data.error || data.detail || (data.status === 404 ? 'Not Found' : 'Unknown error');
      const status = data.status || (errorMessage.includes('not found') ? 404 : 500);
      
      console.warn(`Response contains error information: ${errorMessage}, status: ${status}`);
      
      // For 404 errors specifically, return an empty array instead of failing
      if (status === 404 || errorMessage.toLowerCase().includes('not found')) {
        console.log('Processing 404 error as empty sessions array');
        return { valid: true, sessions: [] };
      }
      
      // Other error cases
      console.error('Error in sessions response:', errorMessage);
      return { valid: false, sessions: [], error: errorMessage };
    }
    
    // Handle when response is an object with session-like objects
    // Try to extract sessions from the object
    if (Object.keys(data).length > 0) {
      const possibleSessions = Object.values(data);
      if (possibleSessions.every(item => typeof item === 'object' && item !== null)) {
        console.log(`Using ${possibleSessions.length} objects from response as sessions`);
        return { valid: true, sessions: possibleSessions };
      }
    }
  }

  console.warn('Invalid sessions format:', data);
  return { valid: false, sessions: [] };
}

export function validateMessagesResponse(data: any) {
  console.log('Validating messages response:', {
    isArray: Array.isArray(data),
    type: typeof data,
    keys: data && typeof data === 'object' ? Object.keys(data) : null,
    isEmpty: !data || (Array.isArray(data) && data.length === 0)
  });

  // Handle null/undefined
  if (!data) {
    console.warn('Messages response is null or undefined');
    return { valid: false, messages: [] };
  }

  // Handle empty array (valid but empty)
  if (Array.isArray(data) && data.length === 0) {
    console.log('Empty messages array - valid but empty');
    return { valid: true, messages: [] };
  }

  // Handle array of messages directly
  if (Array.isArray(data)) {
    console.log(`Found ${data.length} messages in array`);
    return { valid: true, messages: data };
  }

  // Handle object with messages property
  if (data && typeof data === 'object') {
    if ('messages' in data && Array.isArray(data.messages)) {
      console.log(`Found ${data.messages.length} messages in data.messages`);
      return { valid: true, messages: data.messages };
    }
    
    // Handle error responses, particularly 404s
    if ('error' in data || 'detail' in data || 'status' in data) {
      const errorMessage = data.error || data.detail || (data.status === 404 ? 'Not Found' : 'Unknown error');
      const status = data.status || (errorMessage.includes('not found') ? 404 : 500);
      
      console.warn(`Response contains error information: ${errorMessage}, status: ${status}`);
      
      // For 404 errors specifically, return an empty array instead of failing
      if (status === 404 || errorMessage.toLowerCase().includes('not found')) {
        console.log('Processing 404 error as empty messages array');
        return { valid: true, messages: [] };
      }
      
      // Other error cases
      console.error('Error in messages response:', errorMessage);
      return { valid: false, messages: [], error: errorMessage };
    }
    
    // Try to extract message items from object values
    const possibleMessages = Object.values(data);
    if (possibleMessages.length > 0 && possibleMessages.every(item => 
        typeof item === 'object' && item !== null && 
        ('content' in item || 'text' in item || 'message' in item))) {
      console.log(`Using ${possibleMessages.length} objects from response as messages`);
      return { valid: true, messages: possibleMessages };
    }
    
    // Special case: If the response is just a basic object with no obvious message structure,
    // but appears to be valid data (not an error), we'll return an empty array as valid
    // This handles cases where the API returns {} for a session with no messages
    if (Object.keys(data).length === 0 || 
        (Object.keys(data).length > 0 && !('error' in data) && !('detail' in data) && !('status' in data))) {
      console.log('Response appears to be valid data but not message format, treating as empty messages');
      return { valid: true, messages: [] };
    }
  }

  console.warn('Invalid messages format:', data);
  return { valid: false, messages: [] };
}