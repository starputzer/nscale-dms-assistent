/**
 * Pinia Store für System-Administration
 * Teil der Vue 3 SFC Migration (08.05.2025)
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { adminApi } from '@/services/api/admin';
import type { SystemStats, SystemAction, AdminSystemState } from '@/types/admin';

export const useAdminSystemStore = defineStore('adminSystem', () => {
  // State
  const stats = ref<SystemStats>({
    total_users: 0,
    active_users_today: 0,
    total_sessions: 0,
    total_messages: 0,
    avg_messages_per_session: 0,
    total_feedback: 0,
    positive_feedback_percent: 0,
    database_size_mb: 0,
    cache_size_mb: 0,
    cache_hit_rate: 0,
    document_count: 0,
    avg_response_time_ms: 0,
    active_model: '',
    uptime_days: 0,
    memory_usage_percent: 0,
    cpu_usage_percent: 0,
    start_time: 0
  });
  
  const loading = ref(false);
  const error = ref<string | null>(null);
  
  // Getters
  const availableActions = computed<SystemAction[]>(() => [
    {
      type: 'clear-cache',
      name: 'Cache leeren',
      description: 'Leert den LLM-Cache und erzwingt neue Berechnungen',
      requiresConfirmation: true,
      confirmationMessage: 'Möchten Sie wirklich den Cache leeren? Dies kann zu langsameren Antwortzeiten führen, bis der Cache wieder aufgebaut ist.'
    },
    {
      type: 'clear-embedding-cache',
      name: 'Embedding-Cache leeren',
      description: 'Leert den Embedding-Cache und erzwingt eine Neuberechnung',
      requiresConfirmation: true,
      confirmationMessage: 'Möchten Sie wirklich den Embedding-Cache leeren? Dies kann zu längeren Verarbeitungszeiten führen, bis alle Einbettungen neu berechnet sind.'
    },
    {
      type: 'reload-motd',
      name: 'MOTD neu laden',
      description: 'Lädt die Message of the Day aus der Konfigurationsdatei neu',
      requiresConfirmation: false
    },
    {
      type: 'reindex',
      name: 'Dokumente neu indizieren',
      description: 'Startet eine vollständige Neuindizierung aller Dokumente',
      requiresConfirmation: true,
      confirmationMessage: 'Möchten Sie wirklich alle Dokumente neu indizieren? Dieser Vorgang kann je nach Datenmenge einige Zeit in Anspruch nehmen.'
    }
  ]);
  
  const memoryStatus = computed(() => {
    const usage = stats.value.memory_usage_percent;
    if (usage > 90) return 'critical';
    if (usage > 70) return 'warning';
    return 'normal';
  });
  
  const cpuStatus = computed(() => {
    const usage = stats.value.cpu_usage_percent;
    if (usage > 90) return 'critical';
    if (usage > 70) return 'warning';
    return 'normal';
  });
  
  const systemHealthStatus = computed(() => {
    if (memoryStatus.value === 'critical' || cpuStatus.value === 'critical') {
      return 'critical';
    }
    if (memoryStatus.value === 'warning' || cpuStatus.value === 'warning') {
      return 'warning';
    }
    return 'normal';
  });
  
  // Actions
  async function fetchStats() {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await adminApi.getSystemStats();
      stats.value = response.data.stats;
      return response.data.stats;
    } catch (err: any) {
      console.error('Fehler beim Laden der Systemstatistiken:', err);
      error.value = err.response?.data?.message || 'Fehler beim Laden der Systemstatistiken';
      throw err;
    } finally {
      loading.value = false;
    }
  }
  
  async function clearCache() {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await adminApi.clearModelCache();
      // Nach erfolgreicher Ausführung Statistiken neu laden
      await fetchStats();
      return response.data;
    } catch (err: any) {
      console.error('Fehler beim Leeren des Caches:', err);
      error.value = err.response?.data?.message || 'Fehler beim Leeren des Caches';
      throw err;
    } finally {
      loading.value = false;
    }
  }
  
  async function clearEmbeddingCache() {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await adminApi.clearEmbeddingCache();
      // Nach erfolgreicher Ausführung Statistiken neu laden
      await fetchStats();
      return response.data;
    } catch (err: any) {
      console.error('Fehler beim Leeren des Embedding-Caches:', err);
      error.value = err.response?.data?.message || 'Fehler beim Leeren des Embedding-Caches';
      throw err;
    } finally {
      loading.value = false;
    }
  }
  
  async function reloadMotd() {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await adminApi.reloadMotd();
      return response.data;
    } catch (err: any) {
      console.error('Fehler beim Neuladen des MOTD:', err);
      error.value = err.response?.data?.message || 'Fehler beim Neuladen des MOTD';
      throw err;
    } finally {
      loading.value = false;
    }
  }
  
  return {
    // State
    stats,
    loading,
    error,
    
    // Getters
    availableActions,
    memoryStatus,
    cpuStatus,
    systemHealthStatus,
    
    // Actions
    fetchStats,
    clearCache,
    clearEmbeddingCache,
    reloadMotd
  };
});