import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import apiService from '@/services/api/ApiService';

export interface SystemResources {
  cpu: number;
  memory: number;
  disk: number;
  network: {
    bytes_sent: number;
    bytes_recv: number;
    packets_sent: number;
    packets_recv: number;
  };
  timestamp: number;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  memory: number;
  cpu: number;
  threads: number;
  status: string;
}

export interface RAGMetrics {
  queryPerformance: number[];
  cacheHitRate: number;
  embeddingQueueSize: number;
  averageProcessingTime: number;
  totalQueries: number;
  activeQueries: number;
}

export interface BackgroundJob {
  id: string;
  name: string;
  status: string;
  progress: number;
  startTime: number;
  estimatedTimeRemaining?: number;
  error?: string;
}

export interface SystemLog {
  timestamp: number;
  level: string;
  message: string;
  source: string;
}

export interface DashboardSummary {
  activeUsers: {
    today: number;
    week: number;
    month: number;
  };
  documentStats: {
    processed: number;
    queued: number;
    failed: number;
  };
  ragStats: {
    totalQueries: number;
    avgAccuracy: number;
    cacheHitRate: number;
    avgResponseTime: number;
  };
  responseTimeAvg: number;
  systemHealth: Record<string, string>;
}

export const useAdminSystemStore = defineStore('adminSystem', () => {
  // State
  const resources = ref<SystemResources | null>(null);
  const processes = ref<ProcessInfo[]>([]);
  const ragMetrics = ref<RAGMetrics | null>(null);
  const backgroundJobs = ref<BackgroundJob[]>([]);
  const systemLogs = ref<SystemLog[]>([]);
  const dashboardSummary = ref<DashboardSummary | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const loading = ref(false);
  const apiIntegrationEnabled = ref(true);
  const stats = ref<any>({});
  const settings = ref<any>({});

  // Actions - Real API calls to new endpoints
  async function fetchSystemResources() {
    try {
      const response = await apiService.get<SystemResources>('/admin/system/resources');
      if (response.success && response.data) {
        resources.value = response.data;
      }
    } catch (err) {
      console.error('Error fetching system resources:', err);
    }
  }

  async function fetchProcesses() {
    try {
      const response = await apiService.get<ProcessInfo[]>('/admin/system/processes');
      if (response.success && response.data) {
        processes.value = response.data;
      }
    } catch (err) {
      console.error('Error fetching processes:', err);
    }
  }

  async function fetchRAGMetrics() {
    try {
      const response = await apiService.get<RAGMetrics>('/admin/system/rag/metrics');
      if (response.success && response.data) {
        ragMetrics.value = response.data;
      }
    } catch (err) {
      console.error('Error fetching RAG metrics:', err);
    }
  }

  async function fetchBackgroundJobs() {
    try {
      const response = await apiService.get<BackgroundJob[]>('/admin/background/jobs');
      if (response.success && response.data) {
        backgroundJobs.value = response.data;
      }
    } catch (err) {
      console.error('Error fetching background jobs:', err);
    }
  }

  async function fetchSystemLogs(limit = 100, level?: string) {
    try {
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      if (level) params.append('level', level);
      
      const response = await apiService.get<SystemLog[]>(
        `/admin/system/logs?${params}`
      );
      if (response.success && response.data) {
        systemLogs.value = response.data;
      }
    } catch (err) {
      console.error('Error fetching system logs:', err);
    }
  }

  async function fetchDashboardSummary() {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await apiService.get<DashboardSummary>('/admin-dashboard/summary');
      if (response.success && response.data) {
        dashboardSummary.value = response.data;
      }
    } catch (err) {
      error.value = 'Failed to fetch dashboard summary';
      console.error('Error fetching dashboard summary:', err);
    } finally {
      isLoading.value = false;
    }
  }

  async function clearSystemLogs() {
    try {
      const response = await apiService.delete('/admin/system/logs');
      if (response.success) {
        systemLogs.value = [];
      }
      return response.success;
    } catch (err) {
      console.error('Error clearing system logs:', err);
      return false;
    }
  }

  async function pauseJob(jobId: string) {
    try {
      const response = await apiService.post(`/admin/background/jobs/${jobId}/pause`);
      if (response.success) {
        await fetchBackgroundJobs(); // Refresh
      }
      return response.success;
    } catch (err) {
      console.error('Error pausing job:', err);
      return false;
    }
  }

  async function resumeJob(jobId: string) {
    try {
      const response = await apiService.post(`/admin/background/jobs/${jobId}/resume`);
      if (response.success) {
        await fetchBackgroundJobs(); // Refresh
      }
      return response.success;
    } catch (err) {
      console.error('Error resuming job:', err);
      return false;
    }
  }

  async function cancelJob(jobId: string) {
    try {
      const response = await apiService.delete(`/admin/background/jobs/${jobId}`);
      if (response.success) {
        await fetchBackgroundJobs(); // Refresh
      }
      return response.success;
    } catch (err) {
      console.error('Error cancelling job:', err);
      return false;
    }
  }

  // Additional methods for compatibility
  async function fetchSettings() {
    // Mock implementation
    settings.value = {
      defaultModel: 'llama-7b',
      maxTokensPerRequest: 2048,
      enableModelSelection: true,
      enableRateLimit: true,
      rateLimitPerMinute: 60,
      maxConnectionsPerUser: 10,
      sessionTimeoutMinutes: 30,
      maintenanceMode: false,
      maintenanceMessage: '',
      autoBackup: true
    };
  }

  async function saveSettings(newSettings: any) {
    settings.value = { ...newSettings };
    return true;
  }

  async function fetchAvailableActions() {
    // Mock implementation
    return [];
  }

  async function clearCache() {
    // Mock implementation
    return true;
  }

  async function restartServices() {
    // Mock implementation
    return true;
  }

  async function exportLogs() {
    // Mock implementation
    return true;
  }

  async function optimizeDatabase() {
    // Mock implementation
    return true;
  }

  async function resetStatistics() {
    // Mock implementation
    return true;
  }

  async function createBackup() {
    // Mock implementation
    return true;
  }

  // Computed
  const hasActiveJobs = computed(() => 
    backgroundJobs.value.some(job => job.status === 'running' || job.status === 'pending')
  );

  const systemHealthStatus = computed(() => {
    if (!dashboardSummary.value) return 'unknown';
    const health = dashboardSummary.value.systemHealth;
    const unhealthyCount = Object.values(health).filter(s => s !== 'healthy').length;
    if (unhealthyCount === 0) return 'healthy';
    if (unhealthyCount <= 2) return 'warning';
    return 'error';
  });

  return {
    // State
    resources,
    processes,
    ragMetrics,
    backgroundJobs,
    systemLogs,
    dashboardSummary,
    isLoading,
    error,
    loading,
    apiIntegrationEnabled,
    stats,
    settings,
    
    // Computed
    hasActiveJobs,
    systemHealthStatus,
    
    // Actions
    fetchSystemResources,
    fetchProcesses,
    fetchRAGMetrics,
    fetchBackgroundJobs,
    fetchSystemLogs,
    fetchDashboardSummary,
    clearSystemLogs,
    pauseJob,
    resumeJob,
    cancelJob,
    fetchSettings,
    saveSettings,
    fetchAvailableActions,
    clearCache,
    restartServices,
    exportLogs,
    optimizeDatabase,
    resetStatistics,
    createBackup,
    
    // Add alias for compatibility
    fetchStats: fetchDashboardSummary
  };
});