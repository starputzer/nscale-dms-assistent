import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import apiService from '@/services/api/ApiService';

export interface RAGSettings {
  embeddingModel: string;
  rerankerModel: string;
  vectorDimensions: number;
  topK: number;
  similarityThreshold: number;
  hybridSearch: boolean;
  hybridAlpha: number;
  chunkSize: number;
  chunkOverlap: number;
  chunkingStrategy: string;
  preserveContext: boolean;
  cacheEnabled: boolean;
  cacheTTL: number;
  batchSize: number;
  maxConcurrency: number;
  minQualityScore: number;
  duplicateDetection: boolean;
  autoCorrection: boolean;
  contextEnrichment: boolean;
  customPromptTemplate: string;
  metadataFields: Array<{ name: string; type: string }>;
}

export interface RAGStatistics {
  totalQueries: number;
  avgResponseTime: number;
  cacheHitRate: number;
  accuracy: number;
  totalEmbeddings: number;
}

export const useRAGStore = defineStore('rag', () => {
  // State
  const settings = ref<RAGSettings | null>(null);
  const statistics = ref<RAGStatistics>({
    totalQueries: 0,
    avgResponseTime: 0,
    cacheHitRate: 0,
    accuracy: 0,
    totalEmbeddings: 0
  });
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // Actions
  async function getSettings() {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await apiService.get<RAGSettings>('/rag-settings/settings');
      if (response.success && response.data) {
        settings.value = response.data;
        return response.data;
      }
      throw new Error(response.message || 'Failed to load settings');
    } catch (err) {
      error.value = 'Failed to load RAG settings';
      console.error('Error loading RAG settings:', err);
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function updateSettings(newSettings: RAGSettings) {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await apiService.put('/rag-settings/settings', newSettings);
      if (response.success) {
        settings.value = newSettings;
        return response.data;
      }
      throw new Error(response.message || 'Failed to update settings');
    } catch (err) {
      error.value = 'Failed to update RAG settings';
      console.error('Error updating RAG settings:', err);
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchStatistics() {
    try {
      const response = await apiService.get<RAGStatistics>('/rag-settings/statistics');
      if (response.success && response.data) {
        statistics.value = response.data;
      }
    } catch (err) {
      console.error('Error fetching RAG statistics:', err);
    }
  }

  async function clearCache() {
    const response = await apiService.post('/rag-settings/cache/clear');
    if (!response.success) {
      throw new Error(response.message || 'Failed to clear cache');
    }
    return response.data;
  }

  async function reindexDocuments() {
    const response = await apiService.post('/rag-settings/reindex');
    if (!response.success) {
      throw new Error(response.message || 'Failed to start reindexing');
    }
    return response.data;
  }

  return {
    // State
    settings,
    statistics,
    isLoading,
    error,
    
    // Actions
    getSettings,
    updateSettings,
    fetchStatistics,
    clearCache,
    reindexDocuments
  };
});