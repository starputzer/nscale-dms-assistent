/**
 * Sessions Response Fix
 *
 * Korrigiert die Verarbeitung von Batch-Antworten in der sessions.ts
 */

export function processBatchResponse(
  responses: any,
  context: string = "unknown",
) {
  try {
    console.log(`🔍 Processing batch response for ${context}:`, {
      type: typeof responses,
      isArray: Array.isArray(responses),
      keys: responses ? Object.keys(responses) : null,
      length: responses?.length,
    });

    // Handle different response formats
    if (!responses) {
      console.warn(`⚠️ ${context}: Response is null/undefined`);
      return [];
    }
  } catch (error) {
    console.error(`❌ ${context}: Error processing batch response:`, error);
    return [];
  }

  try {
    if (Array.isArray(responses)) {
      console.log(
        `✅ ${context}: Response is array with ${responses.length} items`,
      );
      return responses;
    }

    // Check for wrapped response formats
    if (typeof responses === "object") {
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
    }

    console.error(
      `❌ ${context}: Unable to process response format`,
      responses,
    );
    return [];
  } catch (error) {
    console.error(`❌ ${context}: Error in processBatchResponse:`, error);
    return [];
  }
}

export function extractBatchResponseData(
  responses: any[],
  index: number,
  context: string = "unknown",
) {
  console.log(
    `🔍 Extracting data from batch response[${index}] for ${context}`,
  );

  if (!Array.isArray(responses) || index >= responses.length) {
    console.warn(`⚠️ ${context}: Invalid response array or index`);
    return null;
  }

  const response = responses[index];

  if (!response) {
    console.warn(`⚠️ ${context}: Response at index ${index} is null/undefined`);
    return null;
  }

  // Direct data
  if (response.data !== undefined) {
    console.log(`✅ ${context}: Found data property at index ${index}`);
    return response.data;
  }

  // Nested response
  if (response.response?.data !== undefined) {
    console.log(`✅ ${context}: Found nested response.data at index ${index}`);
    return response.response.data;
  }

  // Direct value
  console.log(`✅ ${context}: Using direct response value at index ${index}`);
  return response;
}

export function validateSessionsResponse(data: any) {
  if (Array.isArray(data)) {
    return { valid: true, sessions: data };
  }

  if (
    data &&
    typeof data === "object" &&
    "sessions" in data &&
    Array.isArray(data.sessions)
  ) {
    return { valid: true, sessions: data.sessions };
  }

  return { valid: false, sessions: [] };
}

export function validateMessagesResponse(data: any) {
  if (Array.isArray(data)) {
    return { valid: true, messages: data };
  }

  if (
    data &&
    typeof data === "object" &&
    "messages" in data &&
    Array.isArray(data.messages)
  ) {
    return { valid: true, messages: data.messages };
  }

  return { valid: false, messages: [] };
}
