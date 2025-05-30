import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BatchRequestService, BatchRequest } from '@/services/api/BatchRequestService';

// Simple mock for ApiService
vi.mock('@/services/api/ApiService', () => ({
  default: {
    request: vi.fn()
  }
}));

describe('Consolidated BatchRequestService Tests', () => {
  let batchService: BatchRequestService;
  let mockApiService: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    
    // Import mocked ApiService
    const apiModule = await import('@/services/api/ApiService');
    mockApiService = apiModule.default;
    
    // Create new service instance
    const { BatchRequestService } = await import('@/services/api/BatchRequestService');
    batchService = new BatchRequestService();
  });

  describe('Core Functionality', () => {
    it('should consolidate response handling from fix file', async () => {
      // Test the processBatchResponse method indirectly through executeBatch
      const requests: BatchRequest[] = [
        { id: 'req1', endpoint: '/test1', method: 'GET' },
        { id: 'req2', endpoint: '/test2', method: 'POST', data: { foo: 'bar' } }
      ];

      // Mock successful responses
      mockApiService.request
        .mockResolvedValueOnce({ status: 200, data: { result: 'data1' }, headers: {} })
        .mockResolvedValueOnce({ status: 201, data: { result: 'data2' }, headers: {} });

      const results = await batchService.executeBatch(requests);

      expect(results).toHaveLength(2);
      expect(results[0]).toMatchObject({
        id: 'req1',
        status: 200,
        data: { result: 'data1' }
      });
      expect(results[1]).toMatchObject({
        id: 'req2',
        status: 201,
        data: { result: 'data2' }
      });
    });

    it('should handle various server response formats', async () => {
      const service = new BatchRequestService();
      
      // Test direct array format
      const format1 = service['processBatchResponse']([
        { id: 'req1', status: 200, data: 'result1' }
      ]);
      expect(format1[0].data).toBe('result1');

      // Test responses property format
      const format2 = service['processBatchResponse']({
        responses: [{ id: 'req2', status: 201, data: 'result2' }]
      });
      expect(format2[0].data).toBe('result2');

      // Test data property format
      const format3 = service['processBatchResponse']({
        data: [{ id: 'req3', status: 202, data: 'result3' }]
      });
      expect(format3[0].data).toBe('result3');

      // Test nested data.responses format
      const format4 = service['processBatchResponse']({
        data: {
          responses: [{ id: 'req4', status: 203, data: 'result4' }]
        }
      });
      expect(format4[0].data).toBe('result4');

      // Test object with request IDs as keys
      const format5 = service['processBatchResponse']({
        'req5': { status: 204, data: 'result5' }
      });
      expect(format5[0].id).toBe('req5');
      expect(format5[0].data).toBe('result5');
    });

    it('should handle error responses correctly', async () => {
      const requests: BatchRequest[] = [
        { id: 'req1', endpoint: '/error', method: 'GET' }
      ];

      // Mock error response
      mockApiService.request.mockRejectedValueOnce({
        response: { status: 404, data: 'Not found' },
        message: 'Request failed'
      });

      const results = await batchService.executeBatch(requests);

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        id: 'req1',
        status: 404,
        data: null,
        error: 'Request failed'
      });
    });

    it('should generate unique request IDs automatically', async () => {
      const service = new BatchRequestService();
      const request1 = { endpoint: '/test1' };
      const request2 = { endpoint: '/test2' };

      // Mock successful response
      mockApiService.request.mockResolvedValue({ 
        status: 200, 
        data: { result: 'ok' },
        headers: {}
      });

      // Add requests without IDs
      const promise1 = service.addRequest(request1);
      const promise2 = service.addRequest(request2);

      // Manually trigger batch execution
      await service.flushPendingRequests();

      const results = await Promise.all([promise1, promise2]);
      expect(results).toHaveLength(2);
    });

    it('should respect maxBatchSize option', async () => {
      const service = new BatchRequestService({ 
        maxBatchSize: 2,
        batchDelay: 10 
      });

      // Add 3 requests - should trigger immediate batch for first 2
      const promises = [];
      for (let i = 0; i < 3; i++) {
        promises.push(service.addRequest({ 
          endpoint: `/test${i}`,
          id: `req${i}`
        }));
      }

      // Give time for automatic batching
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(mockApiService.request).toHaveBeenCalled();
    });

    it('should provide accurate statistics', () => {
      const service = new BatchRequestService();
      const stats = service.getStatistics();

      expect(stats).toMatchObject({
        totalRequests: 0,
        batchedRequests: 0,
        savedRequests: 0,
        totalBatches: 0,
        errors: 0,
        cacheHitCount: 0,
        cacheMissCount: 0
      });
    });

    it('should support legacy getStats method', () => {
      const service = new BatchRequestService();
      const stats = service.getStats();
      
      expect(stats).toBeDefined();
      expect(stats.totalRequests).toBe(0);
    });

    it('should handle cache operations', async () => {
      const service = new BatchRequestService({
        cacheTTL: 1000 // 1 second cache
      });

      const request: BatchRequest = {
        id: 'cache-test',
        endpoint: '/cached',
        method: 'GET'
      };

      // First request - cache miss
      mockApiService.request.mockResolvedValueOnce({
        status: 200,
        data: { cached: 'data' },
        headers: {}
      });

      const result1 = await service.addRequest(request);
      await service.flushPendingRequests();

      // Second request - should be cached
      const result2 = await service.addRequest(request);

      expect(mockApiService.request).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(result2);

      const stats = service.getStatistics();
      expect(stats.cacheHitCount).toBe(1);
      expect(stats.cacheMissCount).toBe(1);
    });

    it('should handle request cancellation', () => {
      const service = new BatchRequestService();
      
      // Add some requests
      service.addRequest({ endpoint: '/test1' });
      service.addRequest({ endpoint: '/test2' });
      
      // Cancel all pending requests
      service.cancelAllPendingRequests();
      
      const stats = service.getStatistics();
      expect(stats.currentPendingRequests).toBe(0);
    });

    it('should support named batch execution', async () => {
      const service = new BatchRequestService();
      
      mockApiService.request
        .mockResolvedValueOnce({ status: 200, data: { user: 'data' }, headers: {} })
        .mockResolvedValueOnce({ status: 200, data: { posts: 'data' }, headers: {} });

      const results = await service.executeNamedBatch({
        user: { endpoint: '/user' },
        posts: { endpoint: '/posts' }
      });

      expect(results).toHaveProperty('user', { user: 'data' });
      expect(results).toHaveProperty('posts', { posts: 'data' });
    });
  });
});