/**
 * Enhanced Batch Fix
 * 
 * Umfassende Lösung für Batch-Request-Probleme
 */

import { apiService } from './ApiService';
import { batchRequestService } from './BatchRequestService';

export class EnhancedBatchFix {
  private static initialized = false;

  static initialize() {
    if (this.initialized) return;
    
    console.log('🔧 Initializing Enhanced Batch Fix...');
    
    // Fix 1: Enhance BatchRequestService response handling
    this.enhanceBatchResponseHandling();
    
    // Fix 2: Fix endpoint paths
    this.fixEndpointPaths();
    
    // Fix 3: Add debug logging
    this.addDebugLogging();
    
    this.initialized = true;
    console.log('✅ Enhanced Batch Fix initialized');
  }

  private static enhanceBatchResponseHandling() {
    const originalExecuteBatch = batchRequestService.executeBatch;
    
    batchRequestService.executeBatch = async function(requests: any[]) {
      console.log('🔍 Enhanced batch execution:', requests);
      
      try {
        const responses = await originalExecuteBatch.call(this, requests);
        
        // Enhanced response processing
        const processedResponses = responses.map((response: any, index: number) => {
          console.log(`🔍 Batch response [${index}]:`, {
            type: typeof response,
            keys: response ? Object.keys(response) : null,
            data: response?.data,
            success: response?.success,
            error: response?.error
          });
          
          // If response has nested data, extract it
          if (response?.data !== undefined) {
            return response;
          } else if (response?.response?.data !== undefined) {
            return { data: response.response.data, success: true };
          } else {
            // Direct response is the data
            return { data: response, success: true };
          }
        });
        
        console.log('✅ Processed batch responses:', processedResponses);
        return processedResponses;
        
      } catch (error) {
        console.error('❌ Enhanced batch execution failed:', error);
        throw error;
      }
    };
  }

  private static fixEndpointPaths() {
    const originalAddRequest = batchRequestService.addRequest;
    
    batchRequestService.addRequest = function(request: any) {
      // Fix common endpoint issues
      if (request.path) {
        // Ensure paths don't have double slashes
        request.path = request.path.replace(/\/+/g, '/');
        
        // Fix metadata endpoint
        if (request.path.includes('/metadata')) {
          console.log('🔧 Fixing metadata endpoint path:', request.path);
          // Change to a supported endpoint or add fallback
          request.meta = { fallbackOnError: true };
        }
      }
      
      return originalAddRequest.call(this, request);
    };
  }

  private static addDebugLogging() {
    const originalSendBatch = (batchRequestService as any).sendBatch;
    
    if (originalSendBatch) {
      (batchRequestService as any).sendBatch = async function(...args: any[]) {
        console.log('🔍 Sending batch request:', {
          pendingRequests: this.pendingRequests,
          endpoint: this.options.batchEndpoint
        });
        
        try {
          const result = await originalSendBatch.apply(this, args);
          console.log('✅ Batch request completed');
          return result;
        } catch (error) {
          console.error('❌ Batch request failed:', error);
          throw error;
        }
      };
    }
  }

  static diagnose() {
    console.log('🔍 Enhanced Batch Fix Diagnostics:', {
      initialized: this.initialized,
      batchServiceAvailable: !!batchRequestService,
      apiServiceAvailable: !!apiService
    });
  }
}

// Initialize immediately
EnhancedBatchFix.initialize();

// Export for debugging
if (typeof window !== 'undefined') {
  (window as any).enhancedBatchFix = EnhancedBatchFix;
}