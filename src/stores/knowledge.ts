import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import apiService from '@/services/api/ApiService';

export interface KnowledgeDocument {
  id: string;
  name: string;
  type: string;
  category: string;
  chunkCount: number;
  embeddingCount: number;
  qualityScore: number;
  lastUpdated: Date;
  metadata: Record<string, any>;
}

export interface KnowledgeStatistics {
  totalDocuments: number;
  totalChunks: number;
  totalEmbeddings: number;
  databaseSize: number;
}

export const useKnowledgeStore = defineStore('knowledge', () => {
  // State
  const documents = ref<KnowledgeDocument[]>([]);
  const statistics = ref<KnowledgeStatistics>({
    totalDocuments: 0,
    totalChunks: 0,
    totalEmbeddings: 0,
    databaseSize: 0
  });
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // Getters
  const documentsByCategory = computed(() => {
    const grouped: Record<string, KnowledgeDocument[]> = {};
    documents.value.forEach(doc => {
      if (!grouped[doc.category]) {
        grouped[doc.category] = [];
      }
      grouped[doc.category].push(doc);
    });
    return grouped;
  });

  const totalQualityScore = computed(() => {
    if (documents.value.length === 0) return 0;
    const sum = documents.value.reduce((acc, doc) => acc + doc.qualityScore, 0);
    return Math.round(sum / documents.value.length);
  });

  // Actions
  async function fetchDocuments() {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await apiService.get<KnowledgeDocument[]>('/api/knowledge/documents');
      if (response.success && response.data) {
        documents.value = response.data;
      }
    } catch (err) {
      error.value = 'Failed to fetch documents';
      console.error('Error fetching documents:', err);
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchStatistics() {
    try {
      const response = await apiService.get<KnowledgeStatistics>('/knowledge/statistics');
      if (response.success && response.data) {
        statistics.value = response.data;
      }
    } catch (err) {
      console.error('Error fetching statistics:', err);
    }
  }

  async function uploadDocument(file: File, options: any) {
    const formData = new FormData();
    formData.append('file', file);
    Object.keys(options).forEach(key => {
      formData.append(key, options[key]);
    });

    const response = await apiService.post('/api/knowledge/upload', formData);
    if (!response.success) {
      throw new Error(response.message || 'Upload failed');
    }
    
    // Refresh documents list
    await fetchDocuments();
    return response.data;
  }

  async function deleteDocument(documentId: string) {
    const response = await apiService.delete(`/api/knowledge/documents/${documentId}`);
    if (!response.success) {
      throw new Error(response.message || 'Delete failed');
    }
    
    // Remove from local state
    documents.value = documents.value.filter(doc => doc.id !== documentId);
  }

  async function reprocessDocument(documentId: string) {
    const response = await apiService.post(`/api/knowledge/documents/${documentId}/reprocess`);
    if (!response.success) {
      throw new Error(response.message || 'Reprocess failed');
    }
    return response.data;
  }

  return {
    // State
    documents,
    statistics,
    isLoading,
    error,
    
    // Getters
    documentsByCategory,
    totalQualityScore,
    
    // Actions
    fetchDocuments,
    fetchStatistics,
    uploadDocument,
    deleteDocument,
    reprocessDocument
  };
});