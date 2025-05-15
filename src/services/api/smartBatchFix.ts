/**
 * Smart Batch Fix
 * 
 * Intelligente Lösung für Batch-Request-Probleme
 */

import { batchRequestService } from './BatchRequestService';
import { EndpointValidator } from './endpointValidator';

export class SmartBatchFix {
  private static initialized = false;

  static initialize() {
    if (this.initialized) return;
    
    console.log('🧠 Initializing Smart Batch Fix...');
    
    // Override executeBatch to filter out problematic endpoints
    const originalExecuteBatch = batchRequestService.executeBatch;
    
    batchRequestService.executeBatch = async function(requests: any[]) {
      console.log('🧠 Smart batch execution - validating endpoints...');
      
      // Validate and fix requests
      const validRequests = EndpointValidator.fixBatchRequests(requests);
      
      if (validRequests.length < requests.length) {
        console.warn(`⚠️ Removed ${requests.length - validRequests.length} invalid endpoints from batch`);
      }
      
      if (validRequests.length === 0) {
        console.warn('⚠️ No valid requests left after filtering');
        return [];
      }
      
      try {
        const responses = await originalExecuteBatch.call(this, validRequests);
        
        // Handle responses intelligently
        const enhancedResponses = responses.map((response: any, index: number) => {
          const request = validRequests[index];
          
          // If response is successful, return as is
          if (response?.success !== false) {
            return response;
          }
          
          // Check if we can provide fallback data
          const endpoint = request.endpoint || request.path;
          if (endpoint?.includes('/metadata')) {
            console.log('🔄 Providing fallback for metadata endpoint');
            return {
              success: true,
              data: {
                bookmarks: [],
                tags: [],
                lastAccessed: new Date().toISOString()
              }
            };
          }
          
          return response;
        });
        
        return enhancedResponses;
        
      } catch (error) {
        console.error('❌ Smart batch execution failed:', error);
        
        // Attempt individual requests as fallback
        console.log('🔄 Attempting individual requests as fallback...');
        const fallbackResponses = [];
        
        for (const request of validRequests) {
          try {
            const singleResponse = await this.addRequest(request);
            fallbackResponses.push(singleResponse);
          } catch (singleError) {
            console.error(`❌ Individual request failed: ${request.endpoint || request.path}`);
            fallbackResponses.push({
              success: false,
              error: singleError,
              data: null
            });
          }
        }
        
        return fallbackResponses;
      }
    };
    
    this.initialized = true;
    console.log('✅ Smart Batch Fix initialized');
  }

  static diagnose() {
    console.log('🧠 Smart Batch Fix Diagnostics:', {
      initialized: this.initialized,
      validatorAvailable: !!EndpointValidator,
      batchServiceAvailable: !!batchRequestService
    });
  }
}

// Initialize immediately
SmartBatchFix.initialize();

// Export for debugging
if (typeof window !== 'undefined') {
  (window as any).smartBatchFix = SmartBatchFix;
}