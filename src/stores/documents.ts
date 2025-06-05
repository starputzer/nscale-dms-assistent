import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import apiService from '@/services/api/ApiService';

export interface Document {
  id: string;
  filename: string;
  fileType: string;
  size: number;
  uploadedAt: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  processedChunks?: number;
  processingTime?: number;
  error?: string;
}

export interface DocumentListResponse {
  documents: Document[];
  total: number;
}

export const useDocumentStore = defineStore('documents', () => {
  // State
  const documents = ref<Document[]>([]);
  const totalDocuments = ref(0);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const uploadProgress = ref<Record<string, number>>({});

  // Getters
  const pendingDocuments = computed(() => 
    documents.value.filter(doc => doc.status === 'pending')
  );

  const processingDocuments = computed(() => 
    documents.value.filter(doc => doc.status === 'processing')
  );

  const completedDocuments = computed(() => 
    documents.value.filter(doc => doc.status === 'completed')
  );

  const errorDocuments = computed(() => 
    documents.value.filter(doc => doc.status === 'error')
  );

  // Actions
  async function fetchDocuments(skip = 0, limit = 20, status?: string) {
    isLoading.value = true;
    error.value = null;
    
    try {
      const params: any = { skip, limit };
      if (status) params.status = status;
      
      const response = await apiService.get<DocumentListResponse>('/api/documents', params);
      
      if (response.success && response.data) {
        documents.value = response.data.documents;
        totalDocuments.value = response.data.total;
      }
    } catch (err) {
      error.value = 'Failed to fetch documents';
      console.error('Error fetching documents:', err);
    } finally {
      isLoading.value = false;
    }
  }

  async function uploadDocument(file: File, onProgress?: (progress: number) => void) {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await apiService.post('/api/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent: any) => {
          const progress = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 1)
          );
          uploadProgress.value[file.name] = progress;
          if (onProgress) onProgress(progress);
        }
      });
      
      if (!response.success) {
        throw new Error(response.message || 'Upload failed');
      }
      
      // Refresh documents list
      await fetchDocuments();
      
      return response.data;
    } catch (err: any) {
      throw new Error(err.message || 'Upload failed');
    } finally {
      // Clean up progress tracking
      delete uploadProgress.value[file.name];
    }
  }

  async function deleteDocument(documentId: string) {
    const response = await apiService.delete(`/api/documents/${documentId}`);
    
    if (!response.success) {
      throw new Error(response.message || 'Delete failed');
    }
    
    // Remove from local state
    documents.value = documents.value.filter(doc => doc.id !== documentId);
    totalDocuments.value--;
  }

  async function reindexDocuments(documentIds?: string[]) {
    const response = await apiService.post('/api/documents/reindex', {
      document_ids: documentIds
    });
    
    if (!response.success) {
      throw new Error(response.message || 'Reindex failed');
    }
    
    // Refresh documents list
    await fetchDocuments();
    
    return response.data;
  }

  async function getDocumentStatus(documentId: string) {
    const response = await apiService.get(`/api/documents/${documentId}/status`);
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to get status');
    }
    
    return response.data;
  }

  function updateDocumentStatus(documentId: string, status: Document['status']) {
    const doc = documents.value.find(d => d.id === documentId);
    if (doc) {
      doc.status = status;
    }
  }

  function clearDocuments() {
    documents.value = [];
    totalDocuments.value = 0;
    uploadProgress.value = {};
  }

  return {
    // State
    documents,
    totalDocuments,
    isLoading,
    error,
    uploadProgress,
    
    // Getters
    pendingDocuments,
    processingDocuments,
    completedDocuments,
    errorDocuments,
    
    // Actions
    fetchDocuments,
    uploadDocument,
    deleteDocument,
    reindexDocuments,
    getDocumentStatus,
    updateDocumentStatus,
    clearDocuments
  };
});