/**
 * Batch Admin Service
 * 
 * This service provides optimized batch API calls for admin operations.
 * Instead of making multiple sequential API calls, it batches them together
 * for improved performance and reduced network overhead.
 */

import { batchRequestService } from './BatchRequestService';
import type { BatchRequest } from './BatchRequestService';

export interface AdminDashboardData {
  users: any[];
  userStats: {
    total: number;
    active: number;
    admin: number;
    locked: number;
  };
  feedbackStats: {
    total: number;
    positive: number;
    negative: number;
    average_rating: number;
  };
  systemInfo: {
    platform: string;
    python_version: string;
    cpu_count: number;
    memory_total: number;
    memory_available: number;
    disk_usage: number;
  };
  featureToggles: any[];
  recentFeedback: any[];
}

export class BatchAdminService {
  /**
   * Load all data needed for the admin dashboard in a single batch request
   */
  async loadAdminDashboard(): Promise<AdminDashboardData> {
    const results = await batchRequestService.executeNamedBatch<any>({
      users: {
        endpoint: '/api/v1/admin/users',
        method: 'GET',
        params: { limit: 10 } // Get only recent users for dashboard
      },
      userStats: {
        endpoint: '/api/v1/admin/users/stats',
        method: 'GET'
      },
      feedbackStats: {
        endpoint: '/api/v1/admin/feedback/stats',
        method: 'GET'
      },
      systemInfo: {
        endpoint: '/api/v1/admin/system',
        method: 'GET'
      },
      featureToggles: {
        endpoint: '/api/v1/admin/feature-toggles',
        method: 'GET'
      },
      recentFeedback: {
        endpoint: '/api/v1/admin/feedback/negative',
        method: 'GET',
        params: { limit: 5 }
      }
    });

    return {
      users: results.users || [],
      userStats: results.userStats || { total: 0, active: 0, admin: 0, locked: 0 },
      feedbackStats: results.feedbackStats || { total: 0, positive: 0, negative: 0, average_rating: 0 },
      systemInfo: results.systemInfo || {},
      featureToggles: results.featureToggles || [],
      recentFeedback: results.recentFeedback || []
    };
  }

  /**
   * Load all user management data
   */
  async loadUserManagementData() {
    const results = await batchRequestService.executeNamedBatch<any>({
      users: {
        endpoint: '/api/v1/admin/users',
        method: 'GET'
      },
      count: {
        endpoint: '/api/v1/admin/users/count',
        method: 'GET'
      },
      stats: {
        endpoint: '/api/v1/admin/users/stats',
        method: 'GET'
      },
      activeUsers: {
        endpoint: '/api/v1/admin/users/active',
        method: 'GET'
      }
    });

    return results;
  }

  /**
   * Load all feedback data
   */
  async loadFeedbackData() {
    const results = await batchRequestService.executeNamedBatch<any>({
      allFeedback: {
        endpoint: '/api/v1/admin/feedback',
        method: 'GET'
      },
      stats: {
        endpoint: '/api/v1/admin/feedback/stats',
        method: 'GET'
      },
      negativeFeedback: {
        endpoint: '/api/v1/admin/feedback/negative',
        method: 'GET'
      }
    });

    return results;
  }

  /**
   * Perform multiple user operations in batch
   */
  async performUserBatchOperations(operations: {
    createUsers?: Array<{ email: string; password: string; role: string }>;
    updateRoles?: Array<{ userId: string; role: string }>;
    deleteUsers?: string[];
    lockUsers?: string[];
    unlockUsers?: string[];
  }) {
    const requests: Record<string, BatchRequest> = {};
    let requestIndex = 0;

    // Add create user requests
    if (operations.createUsers) {
      operations.createUsers.forEach((userData, idx) => {
        requests[`create_${idx}`] = {
          endpoint: '/api/v1/admin/users',
          method: 'POST',
          data: userData
        };
        requestIndex++;
      });
    }

    // Add update role requests
    if (operations.updateRoles) {
      operations.updateRoles.forEach((update, idx) => {
        requests[`updateRole_${idx}`] = {
          endpoint: `/api/v1/admin/users/${update.userId}/role`,
          method: 'PUT',
          data: { role: update.role }
        };
        requestIndex++;
      });
    }

    // Add delete user requests
    if (operations.deleteUsers) {
      operations.deleteUsers.forEach((userId, idx) => {
        requests[`delete_${idx}`] = {
          endpoint: `/api/v1/admin/users/${userId}`,
          method: 'DELETE'
        };
        requestIndex++;
      });
    }

    // Add lock user requests
    if (operations.lockUsers) {
      operations.lockUsers.forEach((userId, idx) => {
        requests[`lock_${idx}`] = {
          endpoint: `/api/v1/admin/users/${userId}/lock`,
          method: 'POST'
        };
        requestIndex++;
      });
    }

    // Add unlock user requests
    if (operations.unlockUsers) {
      operations.unlockUsers.forEach((userId, idx) => {
        requests[`unlock_${idx}`] = {
          endpoint: `/api/v1/admin/users/${userId}/unlock`,
          method: 'POST'
        };
        requestIndex++;
      });
    }

    return batchRequestService.executeNamedBatch(requests);
  }

  /**
   * Perform system maintenance operations
   */
  async performSystemMaintenance(operations: {
    clearCache?: boolean;
    clearEmbeddingCache?: boolean;
    reindex?: boolean;
    systemCheck?: boolean;
  }) {
    const requests: Record<string, BatchRequest> = {};

    if (operations.clearCache) {
      requests.clearCache = {
        endpoint: '/api/v1/admin/clear-cache',
        method: 'POST'
      };
    }

    if (operations.clearEmbeddingCache) {
      requests.clearEmbeddingCache = {
        endpoint: '/api/v1/admin/clear-embedding-cache',
        method: 'POST'
      };
    }

    if (operations.reindex) {
      requests.reindex = {
        endpoint: '/api/v1/admin/reindex',
        method: 'POST'
      };
    }

    if (operations.systemCheck) {
      requests.systemCheck = {
        endpoint: '/api/v1/admin/system-check',
        method: 'POST'
      };
    }

    // Also get system stats after operations
    requests.systemStats = {
      endpoint: '/api/v1/admin/system/stats',
      method: 'GET'
    };

    return batchRequestService.executeNamedBatch(requests);
  }

  /**
   * Load document converter status and settings
   */
  async loadDocumentConverterData() {
    const results = await batchRequestService.executeNamedBatch<any>({
      status: {
        endpoint: '/api/v1/admin/doc-converter/status',
        method: 'GET'
      },
      jobs: {
        endpoint: '/api/v1/admin/doc-converter/jobs',
        method: 'GET'
      },
      settings: {
        endpoint: '/api/v1/admin/doc-converter/settings',
        method: 'GET'
      }
    });

    return results;
  }

  /**
   * Update multiple feature toggles at once
   */
  async updateFeatureToggles(toggleUpdates: Array<{
    id: string;
    enabled: boolean;
  }>) {
    const requests: Record<string, BatchRequest> = {};

    toggleUpdates.forEach((update, idx) => {
      requests[`toggle_${idx}`] = {
        endpoint: `/api/v1/admin/feature-toggles/${update.id}`,
        method: 'PUT',
        data: { enabled: update.enabled }
      };
    });

    // Also get updated stats
    requests.stats = {
      endpoint: '/api/v1/admin/feature-toggles/stats',
      method: 'GET'
    };

    return batchRequestService.executeNamedBatch(requests);
  }

  /**
   * Handle feedback operations in batch
   */
  async processFeedbackBatch(operations: {
    updateStatus?: Array<{ feedbackId: string; status: string }>;
    deleteFeedback?: string[];
    exportFormat?: 'csv' | 'json';
  }) {
    const requests: Record<string, BatchRequest> = {};

    // Update feedback status
    if (operations.updateStatus) {
      operations.updateStatus.forEach((update, idx) => {
        requests[`updateStatus_${idx}`] = {
          endpoint: `/api/v1/admin/feedback/${update.feedbackId}/status`,
          method: 'PATCH',
          data: { status: update.status }
        };
      });
    }

    // Delete feedback
    if (operations.deleteFeedback) {
      operations.deleteFeedback.forEach((feedbackId, idx) => {
        requests[`delete_${idx}`] = {
          endpoint: `/api/v1/admin/feedback/${feedbackId}`,
          method: 'DELETE'
        };
      });
    }

    // Export feedback
    if (operations.exportFormat) {
      requests.export = {
        endpoint: '/api/v1/admin/feedback/export',
        method: 'GET',
        params: { format: operations.exportFormat }
      };
    }

    // Get updated stats
    requests.stats = {
      endpoint: '/api/v1/admin/feedback/stats',
      method: 'GET'
    };

    return batchRequestService.executeNamedBatch(requests);
  }

  /**
   * Prefetch data for quick navigation between admin tabs
   */
  async prefetchAdminData() {
    // Use lower priority for prefetching
    const requests: BatchRequest[] = [
      {
        endpoint: '/api/v1/admin/users/count',
        method: 'GET',
        id: 'userCount',
        priority: 10
      },
      {
        endpoint: '/api/v1/admin/feedback/stats',
        method: 'GET',
        id: 'feedbackStats',
        priority: 10
      },
      {
        endpoint: '/api/v1/admin/feature-toggles',
        method: 'GET',
        id: 'featureToggles',
        priority: 10
      },
      {
        endpoint: '/api/v1/admin/system/stats',
        method: 'GET',
        id: 'systemStats',
        priority: 10
      }
    ];

    // Add requests to batch queue but don't wait for results
    requests.forEach(req => batchRequestService.addRequest(req));
  }

  /**
   * Get real-time statistics for monitoring
   */
  async getRealtimeStats() {
    // Use cache for frequently requested data
    const results = await batchRequestService.executeNamedBatch<any>({
      activeUsers: {
        endpoint: '/api/v1/admin/users/active',
        method: 'GET',
        timeout: 5000 // Quick timeout for real-time data
      },
      systemStats: {
        endpoint: '/api/v1/admin/system/stats',
        method: 'GET',
        timeout: 5000
      },
      recentFeedback: {
        endpoint: '/api/v1/admin/feedback',
        method: 'GET',
        params: { limit: 10, sort: 'created_desc' },
        timeout: 5000
      }
    });

    return results;
  }
}

// Export singleton instance
export const batchAdminService = new BatchAdminService();

// Export type
export default BatchAdminService;