import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { batchRequestService } from '@/services/api/BatchRequestService';
import { useAuthStore } from '@/stores/auth';
import { setActivePinia, createPinia } from 'pinia';
import apiService from '@/services/api/ApiService';

vi.mock('axios');
vi.mock('@/services/api/ApiService');

describe('API Batch Operations Integrity Tests', () => {
  let authStore: any;
  
  beforeEach(() => {
    setActivePinia(createPinia());
    authStore = useAuthStore();
    vi.clearAllMocks();
    
    // Setup authenticated state
    authStore.$patch({
      token: 'test-token',
      isAuthenticated: true
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('BatchRequestService Core Functionality', () => {
    it('should execute batch requests successfully', async () => {
      const requests = [
        { id: 'req1', endpoint: '/api/test1', method: 'GET' as const },
        { id: 'req2', endpoint: '/api/test2', method: 'POST' as const, data: { foo: 'bar' } }
      ];

      const mockResponse = {
        data: {
          responses: [
            { id: 'req1', status: 200, data: { result: 'data1' } },
            { id: 'req2', status: 201, data: { result: 'data2' } }
          ]
        }
      };

      vi.mocked(apiService.request).mockResolvedValueOnce(mockResponse);

      const result = await batchRequestService.executeBatch(requests);

      expect(apiService.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: '/api/test1'
        expect.objectContaining({
          headers: { Authorization: 'Bearer test-token' }
        })
      );
      
      expect(result).toEqual(mockResponse.data.responses);
    });

    it('should handle batch request failures correctly', async () => {
      const requests = [
        { id: 'req1', endpoint: '/api/fail', method: 'GET' as const }
      ];

      vi.mocked(apiService.request).mockRejectedValueOnce(new Error('Network error'));

      await expect(batchRequestService.executeBatch(requests))
        .rejects.toThrow();
    });

    it('should handle mixed success/failure responses', async () => {
      const requests = [
        { id: 'req1', endpoint: '/api/success', method: 'GET' as const },
        { id: 'req2', endpoint: '/api/notfound', method: 'GET' as const },
        { id: 'req3', endpoint: '/api/error', method: 'POST' as const, data: {} }
      ];

      const mockResponse = {
        data: {
          responses: [
            { id: 'req1', status: 200, data: { success: true } },
            { id: 'req2', status: 404, error: 'Not found' },
            { id: 'req3', status: 500, error: 'Internal server error' }
          ]
        }
      };

      vi.mocked(axios.post).mockResolvedValueOnce(mockResponse);

      const result = await batchRequestService.executeBatch(requests);

      expect(result).toHaveLength(3);
      expect(result[0].status).toBe(200);
      expect(result[1].status).toBe(404);
      expect(result[2].status).toBe(500);
    });
  });

  describe('Batch Request Authentication', () => {
    it('should include auth headers in batch requests', async () => {
      const requests = [
        { id: 'req1', endpoint: '/api/protected', method: 'GET' as const }
      ];

      vi.mocked(axios.post).mockResolvedValueOnce({
        data: { responses: [] }
      });

      await batchRequestService.executeBatch(requests);

      expect(axios.post).toHaveBeenCalledWith(
        '/api/batch',
        expect.any(Object),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      );
    });

    it('should handle unauthenticated batch requests', async () => {
      // Remove authentication
      authStore.$patch({
        token: null,
        isAuthenticated: false
      });

      const requests = [
        { id: 'req1', endpoint: '/api/public', method: 'GET' as const }
      ];

      vi.mocked(axios.post).mockResolvedValueOnce({
        data: { responses: [{ id: 'req1', status: 200, data: {} }] }
      });

      await batchRequestService.executeBatch(requests);

      expect(axios.post).toHaveBeenCalledWith(
        '/api/batch',
        expect.any(Object),
        expect.not.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.any(String)
          })
        })
      );
    });
  });

  describe('Batch Request Optimization', () => {
    it('should handle empty request arrays', async () => {
      const result = await batchRequestService.executeBatch([]);
      expect(result).toEqual([]);
      expect(axios.post).not.toHaveBeenCalled();
    });

    it('should handle large batch requests', async () => {
      const requests = Array.from({ length: 50 }, (_, i) => ({
        id: `req${i}`,
        endpoint: `/api/test${i}`,
        method: 'GET' as const
      }));

      const mockResponses = requests.map(req => ({
        id: req.id,
        status: 200,
        data: { result: `data${req.id}` }
      }));

      vi.mocked(axios.post).mockResolvedValueOnce({
        data: { responses: mockResponses }
      });

      const result = await batchRequestService.executeBatch(requests);

      expect(result).toHaveLength(50);
      expect(result.every(r => r.status === 200)).toBe(true);
    });

    it('should preserve request order in responses', async () => {
      const requests = [
        { id: 'req3', endpoint: '/api/c', method: 'GET' as const },
        { id: 'req1', endpoint: '/api/a', method: 'GET' as const },
        { id: 'req2', endpoint: '/api/b', method: 'GET' as const }
      ];

      const mockResponse = {
        data: {
          responses: [
            { id: 'req3', status: 200, data: { order: 3 } },
            { id: 'req1', status: 200, data: { order: 1 } },
            { id: 'req2', status: 200, data: { order: 2 } }
          ]
        }
      };

      vi.mocked(axios.post).mockResolvedValueOnce(mockResponse);

      const result = await batchRequestService.executeBatch(requests);

      expect(result[0].id).toBe('req3');
      expect(result[1].id).toBe('req1');
      expect(result[2].id).toBe('req2');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle network timeouts', async () => {
      const requests = [
        { id: 'req1', endpoint: '/api/slow', method: 'GET' as const }
      ];

      vi.mocked(axios.post).mockRejectedValueOnce({
        code: 'ECONNABORTED',
        message: 'timeout of 5000ms exceeded'
      });

      await expect(batchRequestService.executeBatch(requests))
        .rejects.toMatchObject({
          code: 'ECONNABORTED'
        });
    });

    it('should handle server errors gracefully', async () => {
      const requests = [
        { id: 'req1', endpoint: '/api/error', method: 'POST' as const, data: {} }
      ];

      vi.mocked(axios.post).mockRejectedValueOnce({
        response: {
          status: 503,
          data: { message: 'Service temporarily unavailable' }
        }
      });

      await expect(batchRequestService.executeBatch(requests))
        .rejects.toMatchObject({
          response: { status: 503 }
        });
    });

    it('should handle malformed responses', async () => {
      const requests = [
        { id: 'req1', endpoint: '/api/test', method: 'GET' as const }
      ];

      // Malformed response without 'responses' array
      vi.mocked(axios.post).mockResolvedValueOnce({
        data: { notResponses: [] }
      });

      const result = await batchRequestService.executeBatch(requests);
      
      // Should handle gracefully, possibly return empty or throw specific error
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Batch Request with Different Methods', () => {
    it('should handle all HTTP methods correctly', async () => {
      const requests = [
        { id: 'get', endpoint: '/api/resource', method: 'GET' as const },
        { id: 'post', endpoint: '/api/resource', method: 'POST' as const, data: { name: 'test' } },
        { id: 'put', endpoint: '/api/resource/1', method: 'PUT' as const, data: { name: 'updated' } },
        { id: 'patch', endpoint: '/api/resource/1', method: 'PATCH' as const, data: { status: 'active' } },
        { id: 'delete', endpoint: '/api/resource/1', method: 'DELETE' as const }
      ];

      const mockResponse = {
        data: {
          responses: requests.map(req => ({
            id: req.id,
            status: req.method === 'POST' ? 201 : 200,
            data: { method: req.method }
          }))
        }
      };

      vi.mocked(axios.post).mockResolvedValueOnce(mockResponse);

      const result = await batchRequestService.executeBatch(requests);

      expect(result).toHaveLength(5);
      expect(result.find(r => r.id === 'post')?.status).toBe(201);
      expect(result.filter(r => r.id !== 'post').every(r => r.status === 200)).toBe(true);
    });
  });
});