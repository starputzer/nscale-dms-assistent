import { defineStore } from 'pinia';
import { ref } from 'vue';
import apiService from '@/services/api/ApiService';

export interface SystemInfo {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  uptime: number;
  processInfo: {
    pid: number;
    memory: number;
    cpu: number;
    threads: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    connections: number;
  };
}

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'error';
  checks: Array<{
    name: string;
    status: 'ok' | 'warning' | 'error';
    message: string;
    value?: any;
  }>;
  timestamp: Date;
}

export const useSystemStore = defineStore('system', () => {
  // State
  const systemInfo = ref<SystemInfo | null>(null);
  const systemHealth = ref<SystemHealth | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // Actions
  async function fetchSystemInfo() {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await apiService.get<SystemInfo>('/api/system/info');
      if (response.success && response.data) {
        systemInfo.value = response.data;
      }
    } catch (err) {
      error.value = 'Failed to fetch system info';
      console.error('Error fetching system info:', err);
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchSystemHealth() {
    try {
      const response = await apiService.get<SystemHealth>('/api/system/health');
      if (response.success && response.data) {
        systemHealth.value = response.data;
      }
    } catch (err) {
      console.error('Error fetching system health:', err);
    }
  }

  async function performSystemCheck() {
    const response = await apiService.post('/api/system/check');
    if (!response.success) {
      throw new Error(response.message || 'System check failed');
    }
    
    // Refresh system health after check
    await fetchSystemHealth();
    return response.data;
  }

  async function restartService(serviceName: string) {
    const response = await apiService.post(`/api/system/services/${serviceName}/restart`);
    if (!response.success) {
      throw new Error(response.message || 'Service restart failed');
    }
    return response.data;
  }

  async function clearSystemCache() {
    const response = await apiService.post('/api/system/cache/clear');
    if (!response.success) {
      throw new Error(response.message || 'Cache clear failed');
    }
    return response.data;
  }

  async function optimizeDatabase() {
    const response = await apiService.post('/api/system/database/optimize');
    if (!response.success) {
      throw new Error(response.message || 'Database optimization failed');
    }
    return response.data;
  }

  return {
    // State
    systemInfo,
    systemHealth,
    isLoading,
    error,
    
    // Actions
    fetchSystemInfo,
    fetchSystemHealth,
    performSystemCheck,
    restartService,
    clearSystemCache,
    optimizeDatabase
  };
});