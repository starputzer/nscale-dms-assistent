/**
 * Batch Response Fix
 * 
 * Korrigiert Probleme mit der Verarbeitung von Batch-API-Antworten
 */

import { apiService } from './ApiService';

export interface BatchResponseDebugInfo {
  rawResponse: any;
  processedResponse: any;
  expectedFormat: string;
  actualFormat: string;
  issues: string[];
}

export class BatchResponseFix {
  private static debugMode = false;
  private static responseHistory: BatchResponseDebugInfo[] = [];

  /**
   * Enable debug mode
   */
  static enableDebug() {
    this.debugMode = true;
    console.log('🔍 Batch response debugging enabled');
  }

  /**
   * Analyze batch response structure
   */
  static analyzeResponse(response: any): BatchResponseDebugInfo {
    const debugInfo: BatchResponseDebugInfo = {
      rawResponse: response,
      processedResponse: null,
      expectedFormat: 'ApiResponse<{responses: BatchResponse[]}>',
      actualFormat: '',
      issues: []
    };

    // Analyze structure
    if (!response) {
      debugInfo.actualFormat = 'null/undefined';
      debugInfo.issues.push('Response is null or undefined');
    } else if (typeof response !== 'object') {
      debugInfo.actualFormat = typeof response;
      debugInfo.issues.push(`Response is not an object: ${typeof response}`);
    } else {
      // Check for expected structure
      const hasSuccess = 'success' in response;
      const hasData = 'data' in response;
      const hasResponses = hasData && response.data && 'responses' in response.data;
      const isResponsesArray = hasResponses && Array.isArray(response.data.responses);

      debugInfo.actualFormat = `{${Object.keys(response).join(', ')}}`;
      
      if (!hasSuccess) debugInfo.issues.push('Missing "success" field');
      if (!hasData) debugInfo.issues.push('Missing "data" field');
      if (!hasResponses) debugInfo.issues.push('Missing "data.responses" field');
      if (!isResponsesArray) debugInfo.issues.push('data.responses is not an array');

      // Process if valid
      if (hasResponses && isResponsesArray) {
        debugInfo.processedResponse = response.data.responses;
      }
    }

    // Store in history
    this.responseHistory.push(debugInfo);
    if (this.responseHistory.length > 10) {
      this.responseHistory.shift(); // Keep only last 10
    }

    if (this.debugMode) {
      console.log('🔍 Batch response analysis:', debugInfo);
    }

    return debugInfo;
  }

  /**
   * Fix batch response processing
   */
  static fixBatchResponseProcessing() {
    console.log('🔧 Applying batch response processing fix...');

    // Override the customRequest method to intercept batch responses
    const originalCustomRequest = apiService.customRequest;
    
    apiService.customRequest = async function(config: any) {
      const response = await originalCustomRequest.call(this, config);
      
      // Special handling for batch endpoints
      if (config.url?.includes('/batch')) {
        const analysis = BatchResponseFix.analyzeResponse(response);
        
        if (BatchResponseFix.debugMode) {
          console.log('🔍 Batch response intercepted:', {
            url: config.url,
            rawResponse: response,
            analysis: analysis
          });
        }

        // Fix common issues
        if (response && response.data && !response.data.responses && Array.isArray(response.data)) {
          // If data is directly an array, wrap it
          console.log('🔧 Fixing: Wrapping array response in expected structure');
          response.data = { responses: response.data };
        }
      }
      
      return response;
    };

    console.log('✅ Batch response processing fix applied');
  }

  /**
   * Get response history
   */
  static getHistory(): BatchResponseDebugInfo[] {
    return this.responseHistory;
  }

  /**
   * Clear response history
   */
  static clearHistory() {
    this.responseHistory = [];
    console.log('🗑️ Response history cleared');
  }

  /**
   * Debug helper for sessions.ts
   */
  static debugSessionResponse(responses: any) {
    console.log('🔍 Session Response Debug:', {
      type: typeof responses,
      isArray: Array.isArray(responses),
      length: responses?.length,
      firstItem: responses?.[0],
      structure: responses ? Object.keys(responses) : null,
      data: responses?.data,
      responses: responses?.responses
    });
  }
}

// Apply the fix immediately
BatchResponseFix.fixBatchResponseProcessing();

// Expose for debugging
if (typeof window !== 'undefined') {
  (window as any).batchResponseFix = BatchResponseFix;
}