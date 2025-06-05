<template>
  <div class="document-upload">
    <div class="upload-header">
      <h2>{{ $t('documents.upload.title', 'Dokumente hochladen') }}</h2>
      <button class="btn btn-secondary" @click="showDocumentList = !showDocumentList">
        <i :class="showDocumentList ? 'fas fa-upload' : 'fas fa-list'"></i>
        {{ showDocumentList ? 
          $t('documents.upload.showUpload', 'Upload anzeigen') : 
          $t('documents.upload.showList', 'Dokumente anzeigen') 
        }}
      </button>
    </div>

    <!-- Upload Area -->
    <div v-if="!showDocumentList" class="upload-section">
      <div 
        class="upload-area"
        :class="{ 
          'dragging': isDragging,
          'has-files': selectedFiles.length > 0 
        }"
        @drop="handleDrop"
        @dragover.prevent
        @dragenter.prevent="handleDragEnter"
        @dragleave.prevent="handleDragLeave"
      >
        <div class="upload-icon">
          <i class="fas fa-cloud-upload-alt"></i>
        </div>
        <h3>{{ $t('documents.upload.dragDrop', 'Dateien hier ablegen') }}</h3>
        <p>{{ $t('documents.upload.or', 'oder') }}</p>
        <button class="btn btn-primary" @click="selectFiles">
          <i class="fas fa-folder-open"></i>
          {{ $t('documents.upload.selectFiles', 'Dateien auswählen') }}
        </button>
        <input 
          ref="fileInput" 
          type="file" 
          multiple 
          accept=".pdf,.docx,.doc,.txt,.html,.htm,.md,.rtf"
          @change="handleFileSelect"
          style="display: none;"
        >
        <p class="upload-hint">
          {{ $t('documents.upload.supportedFormats', 'Unterstützte Formate') }}: 
          PDF, DOCX, DOC, TXT, HTML, MD, RTF
        </p>
        <p class="upload-hint">
          {{ $t('documents.upload.maxSize', 'Maximale Dateigröße') }}: 50 MB
        </p>
      </div>

      <!-- Selected Files -->
      <div v-if="selectedFiles.length > 0" class="selected-files">
        <h3>{{ $t('documents.upload.selectedFiles', 'Ausgewählte Dateien') }} ({{ selectedFiles.length }})</h3>
        <div class="file-list">
          <div 
            v-for="(file, index) in selectedFiles" 
            :key="index"
            class="file-item"
            :class="{ 'uploading': file.uploading, 'completed': file.completed, 'error': file.error }"
          >
            <div class="file-icon">
              <i :class="getFileIcon(file.type)"></i>
            </div>
            <div class="file-info">
              <div class="file-name">{{ file.name }}</div>
              <div class="file-size">{{ formatFileSize(file.size) }}</div>
              <div v-if="file.uploading" class="upload-progress">
                <div class="progress-bar">
                  <div class="progress-fill" :style="{ width: file.progress + '%' }"></div>
                </div>
                <span class="progress-text">{{ file.progress }}%</span>
              </div>
              <div v-if="file.error" class="file-error">
                <i class="fas fa-exclamation-triangle"></i>
                {{ file.error }}
              </div>
              <div v-if="file.completed" class="file-success">
                <i class="fas fa-check-circle"></i>
                {{ $t('documents.upload.uploadComplete', 'Upload abgeschlossen') }}
              </div>
            </div>
            <button 
              v-if="!file.uploading" 
              class="btn-remove" 
              @click="removeFile(index)"
            >
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>
        
        <div class="upload-actions">
          <button 
            class="btn btn-secondary" 
            @click="clearFiles"
            :disabled="isUploading"
          >
            <i class="fas fa-trash"></i>
            {{ $t('documents.upload.clearAll', 'Alle entfernen') }}
          </button>
          <button 
            class="btn btn-primary" 
            @click="uploadFiles"
            :disabled="isUploading || selectedFiles.length === 0"
          >
            <i :class="isUploading ? 'fas fa-spinner fa-spin' : 'fas fa-upload'"></i>
            {{ isUploading ? 
              $t('documents.upload.uploading', 'Wird hochgeladen...') : 
              $t('documents.upload.startUpload', 'Upload starten') 
            }}
          </button>
        </div>
      </div>
    </div>

    <!-- Document List -->
    <div v-else class="document-list-section">
      <div class="list-controls">
        <div class="search-box">
          <i class="fas fa-search"></i>
          <input 
            v-model="searchQuery"
            type="text"
            :placeholder="$t('documents.list.search', 'Dokumente suchen...')"
            @input="searchDocuments"
          >
        </div>
        <select v-model="statusFilter" @change="filterDocuments" class="status-filter">
          <option value="">{{ $t('documents.list.allStatuses', 'Alle Status') }}</option>
          <option value="pending">{{ $t('documents.list.pending', 'Ausstehend') }}</option>
          <option value="processing">{{ $t('documents.list.processing', 'In Bearbeitung') }}</option>
          <option value="completed">{{ $t('documents.list.completed', 'Abgeschlossen') }}</option>
          <option value="error">{{ $t('documents.list.error', 'Fehler') }}</option>
        </select>
        <button class="btn btn-icon" @click="refreshDocuments">
          <i class="fas fa-sync-alt" :class="{ 'fa-spin': isRefreshing }"></i>
        </button>
      </div>

      <div v-if="documents.length === 0" class="empty-state">
        <i class="fas fa-folder-open"></i>
        <p>{{ $t('documents.list.noDocuments', 'Keine Dokumente gefunden') }}</p>
      </div>

      <div v-else class="documents-table">
        <table>
          <thead>
            <tr>
              <th>{{ $t('documents.list.filename', 'Dateiname') }}</th>
              <th>{{ $t('documents.list.type', 'Typ') }}</th>
              <th>{{ $t('documents.list.size', 'Größe') }}</th>
              <th>{{ $t('documents.list.uploadDate', 'Upload-Datum') }}</th>
              <th>{{ $t('documents.list.status', 'Status') }}</th>
              <th>{{ $t('documents.list.actions', 'Aktionen') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="doc in paginatedDocuments" :key="doc.id">
              <td>
                <div class="doc-name">
                  <i :class="getFileIcon(doc.fileType)"></i>
                  {{ doc.filename }}
                </div>
              </td>
              <td>{{ doc.fileType.toUpperCase() }}</td>
              <td>{{ formatFileSize(doc.size) }}</td>
              <td>{{ formatDate(doc.uploadedAt) }}</td>
              <td>
                <span class="status-badge" :class="`status-${doc.status}`">
                  {{ getStatusLabel(doc.status) }}
                </span>
              </td>
              <td>
                <div class="action-buttons">
                  <button 
                    v-if="doc.status === 'completed'" 
                    class="btn-icon"
                    @click="viewDocument(doc)"
                    :title="$t('documents.list.view', 'Anzeigen')"
                  >
                    <i class="fas fa-eye"></i>
                  </button>
                  <button 
                    v-if="doc.status === 'error'" 
                    class="btn-icon"
                    @click="retryDocument(doc)"
                    :title="$t('documents.list.retry', 'Erneut versuchen')"
                  >
                    <i class="fas fa-redo"></i>
                  </button>
                  <button 
                    class="btn-icon danger"
                    @click="deleteDocument(doc)"
                    :title="$t('documents.list.delete', 'Löschen')"
                  >
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="pagination">
        <button 
          class="btn-page" 
          @click="currentPage = 1"
          :disabled="currentPage === 1"
        >
          <i class="fas fa-angle-double-left"></i>
        </button>
        <button 
          class="btn-page" 
          @click="currentPage--"
          :disabled="currentPage === 1"
        >
          <i class="fas fa-angle-left"></i>
        </button>
        <span class="page-info">
          {{ currentPage }} / {{ totalPages }}
        </span>
        <button 
          class="btn-page" 
          @click="currentPage++"
          :disabled="currentPage === totalPages"
        >
          <i class="fas fa-angle-right"></i>
        </button>
        <button 
          class="btn-page" 
          @click="currentPage = totalPages"
          :disabled="currentPage === totalPages"
        >
          <i class="fas fa-angle-double-right"></i>
        </button>
      </div>
    </div>

    <!-- Processing Status -->
    <div v-if="processingStatus.active" class="processing-status">
      <div class="status-header">
        <h3>{{ $t('documents.processing.title', 'Verarbeitung läuft') }}</h3>
        <button class="btn-close" @click="processingStatus.active = false">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="status-content">
        <div class="status-item">
          <span>{{ $t('documents.processing.active', 'Aktiv') }}:</span>
          <span>{{ processingStatus.activeCount }}</span>
        </div>
        <div class="status-item">
          <span>{{ $t('documents.processing.queued', 'In Warteschlange') }}:</span>
          <span>{{ processingStatus.queuedCount }}</span>
        </div>
        <div class="status-item">
          <span>{{ $t('documents.processing.completed', 'Abgeschlossen') }}:</span>
          <span>{{ processingStatus.completedCount }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from '@/composables/useToast';
import { useDocumentStore } from '@/stores/documents';
import apiService from '@/services/api/ApiService';

const { t } = useI18n();
const { showToast } = useToast();
const documentStore = useDocumentStore();

// State
const showDocumentList = ref(false);
const isDragging = ref(false);
const isUploading = ref(false);
const isRefreshing = ref(false);
const selectedFiles = ref<any[]>([]);
const documents = ref<any[]>([]);
const searchQuery = ref('');
const statusFilter = ref('');
const currentPage = ref(1);
const itemsPerPage = 10;

// Processing status
const processingStatus = ref({
  active: false,
  activeCount: 0,
  queuedCount: 0,
  completedCount: 0
});

// WebSocket for real-time updates
let ws: WebSocket | null = null;

// Computed
const filteredDocuments = computed(() => {
  let filtered = [...documents.value];
  
  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(doc => 
      doc.filename.toLowerCase().includes(query)
    );
  }
  
  // Filter by status
  if (statusFilter.value) {
    filtered = filtered.filter(doc => doc.status === statusFilter.value);
  }
  
  return filtered;
});

const totalPages = computed(() => 
  Math.ceil(filteredDocuments.value.length / itemsPerPage)
);

const paginatedDocuments = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return filteredDocuments.value.slice(start, end);
});

// Methods
const handleDragEnter = () => {
  isDragging.value = true;
};

const handleDragLeave = (e: DragEvent) => {
  if (e.target === e.currentTarget) {
    isDragging.value = false;
  }
};

const handleDrop = (e: DragEvent) => {
  e.preventDefault();
  isDragging.value = false;
  
  if (e.dataTransfer?.files) {
    handleFiles(Array.from(e.dataTransfer.files));
  }
};

const selectFiles = () => {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  input?.click();
};

const handleFileSelect = (e: Event) => {
  const input = e.target as HTMLInputElement;
  if (input.files) {
    handleFiles(Array.from(input.files));
  }
};

const handleFiles = (files: File[]) => {
  const validFiles = files.filter(file => {
    // Check file type
    const ext = file.name.split('.').pop()?.toLowerCase();
    const validExtensions = ['pdf', 'docx', 'doc', 'txt', 'html', 'htm', 'md', 'rtf'];
    
    if (!ext || !validExtensions.includes(ext)) {
      showToast(
        t('documents.upload.invalidType', 'Ungültiger Dateityp') + ': ' + file.name,
        'error'
      );
      return false;
    }
    
    // Check file size (50MB)
    if (file.size > 50 * 1024 * 1024) {
      showToast(
        t('documents.upload.fileTooLarge', 'Datei zu groß') + ': ' + file.name,
        'error'
      );
      return false;
    }
    
    return true;
  });
  
  // Add valid files
  validFiles.forEach(file => {
    selectedFiles.value.push({
      file,
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      progress: 0,
      uploading: false,
      completed: false,
      error: null
    });
  });
};

const removeFile = (index: number) => {
  selectedFiles.value.splice(index, 1);
};

const clearFiles = () => {
  selectedFiles.value = [];
};

const uploadFiles = async () => {
  isUploading.value = true;
  processingStatus.value.active = true;
  
  for (const fileItem of selectedFiles.value) {
    if (fileItem.completed || fileItem.error) continue;
    
    fileItem.uploading = true;
    fileItem.progress = 0;
    
    try {
      const formData = new FormData();
      formData.append('file', fileItem.file);
      
      // Upload with progress tracking
      const response = await apiService.post(
        '/api/documents/upload',
        formData,
        {
          onUploadProgress: (progressEvent) => {
            const progress = Math.round(
              (progressEvent.loaded * 100) / (progressEvent.total || 1)
            );
            fileItem.progress = progress;
          }
        }
      );
      
      if (response.success) {
        fileItem.completed = true;
        fileItem.uploading = false;
        showToast(
          t('documents.upload.success', 'Datei erfolgreich hochgeladen') + ': ' + fileItem.name,
          'success'
        );
      } else {
        throw new Error(response.message || 'Upload failed');
      }
    } catch (error: any) {
      fileItem.error = error.message || t('documents.upload.failed', 'Upload fehlgeschlagen');
      fileItem.uploading = false;
      showToast(fileItem.error, 'error');
    }
  }
  
  isUploading.value = false;
  
  // Refresh document list
  await refreshDocuments();
};

const refreshDocuments = async () => {
  isRefreshing.value = true;
  try {
    const response = await apiService.get('/api/documents');
    if (response.success && response.data) {
      documents.value = response.data.documents;
    }
  } catch (error) {
    showToast(t('documents.list.loadError', 'Fehler beim Laden der Dokumente'), 'error');
  } finally {
    isRefreshing.value = false;
  }
};

const searchDocuments = () => {
  currentPage.value = 1;
};

const filterDocuments = () => {
  currentPage.value = 1;
};

const viewDocument = (doc: any) => {
  // Navigate to document viewer
  window.open(`/documents/${doc.id}`, '_blank');
};

const retryDocument = async (doc: any) => {
  try {
    const response = await apiService.post('/api/documents/reindex', {
      document_ids: [doc.id]
    });
    
    if (response.success) {
      showToast(t('documents.list.retrySuccess', 'Neuverarbeitung gestartet'), 'success');
      await refreshDocuments();
    }
  } catch (error) {
    showToast(t('documents.list.retryError', 'Fehler bei der Neuverarbeitung'), 'error');
  }
};

const deleteDocument = async (doc: any) => {
  if (!confirm(t('documents.list.confirmDelete', 'Möchten Sie dieses Dokument wirklich löschen?'))) {
    return;
  }
  
  try {
    const response = await apiService.delete(`/api/documents/${doc.id}`);
    
    if (response.success) {
      showToast(t('documents.list.deleteSuccess', 'Dokument gelöscht'), 'success');
      await refreshDocuments();
    }
  } catch (error) {
    showToast(t('documents.list.deleteError', 'Fehler beim Löschen'), 'error');
  }
};

// WebSocket connection
const connectWebSocket = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws/documents/status`;
  
  ws = new WebSocket(wsUrl);
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'status_update') {
      processingStatus.value.activeCount = data.data.active;
      processingStatus.value.queuedCount = data.data.queued;
      processingStatus.value.completedCount = data.data.completed;
    }
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
  
  ws.onclose = () => {
    // Reconnect after 5 seconds
    setTimeout(connectWebSocket, 5000);
  };
};

// Utility functions
const getFileIcon = (type: string) => {
  const typeMap: Record<string, string> = {
    pdf: 'fas fa-file-pdf',
    docx: 'fas fa-file-word',
    doc: 'fas fa-file-word',
    txt: 'fas fa-file-alt',
    html: 'fas fa-file-code',
    htm: 'fas fa-file-code',
    md: 'fas fa-file-lines',
    rtf: 'fas fa-file-alt'
  };
  
  const ext = type.replace('.', '').toLowerCase();
  return typeMap[ext] || 'fas fa-file';
};

const formatFileSize = (bytes: number) => {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    pending: t('documents.status.pending', 'Ausstehend'),
    processing: t('documents.status.processing', 'In Bearbeitung'),
    completed: t('documents.status.completed', 'Abgeschlossen'),
    error: t('documents.status.error', 'Fehler')
  };
  return labels[status] || status;
};

// Lifecycle
onMounted(() => {
  refreshDocuments();
  connectWebSocket();
});

onUnmounted(() => {
  if (ws) {
    ws.close();
  }
});
</script>

<style scoped>
.document-upload {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.upload-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.upload-header h2 {
  font-size: 1.75rem;
  font-weight: 600;
  margin: 0;
}

/* Upload Section */
.upload-section {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.upload-area {
  border: 3px dashed #ddd;
  border-radius: 8px;
  padding: 3rem;
  text-align: center;
  transition: all 0.3s;
  cursor: pointer;
}

.upload-area.dragging {
  border-color: var(--primary-color, #0078d4);
  background: rgba(0, 120, 212, 0.05);
}

.upload-area.has-files {
  border-style: solid;
}

.upload-icon {
  font-size: 4rem;
  color: var(--primary-color, #0078d4);
  margin-bottom: 1rem;
}

.upload-area h3 {
  font-size: 1.25rem;
  margin: 0 0 0.5rem 0;
}

.upload-area p {
  color: #666;
  margin: 0.5rem 0;
}

.upload-hint {
  font-size: 0.875rem;
  color: #888;
  margin-top: 1rem;
}

/* Selected Files */
.selected-files {
  margin-top: 2rem;
}

.selected-files h3 {
  font-size: 1.125rem;
  margin-bottom: 1rem;
}

.file-list {
  max-height: 300px;
  overflow-y: auto;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 6px;
  margin-bottom: 0.5rem;
  transition: all 0.2s;
}

.file-item.uploading {
  background: #e3f2fd;
}

.file-item.completed {
  background: #e8f5e9;
}

.file-item.error {
  background: #ffebee;
}

.file-icon {
  font-size: 2rem;
  color: #666;
  width: 3rem;
  text-align: center;
}

.file-info {
  flex: 1;
}

.file-name {
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.file-size {
  font-size: 0.875rem;
  color: #666;
}

.upload-progress {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: #e0e0e0;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--primary-color, #0078d4);
  transition: width 0.3s;
}

.progress-text {
  font-size: 0.75rem;
  color: #666;
  min-width: 40px;
  text-align: right;
}

.file-error,
.file-success {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
  font-size: 0.875rem;
}

.file-error {
  color: #d32f2f;
}

.file-success {
  color: #388e3c;
}

.btn-remove {
  background: transparent;
  border: none;
  color: #999;
  cursor: pointer;
  font-size: 1.25rem;
  padding: 0.25rem;
  transition: color 0.2s;
}

.btn-remove:hover {
  color: #d32f2f;
}

.upload-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.5rem;
}

/* Document List */
.document-list-section {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.list-controls {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.search-box {
  flex: 1;
  position: relative;
}

.search-box i {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #666;
}

.search-box input {
  width: 100%;
  padding: 0.5rem 1rem 0.5rem 2.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.875rem;
}

.status-filter {
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.875rem;
  background: white;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #666;
}

.empty-state i {
  font-size: 3rem;
  margin-bottom: 1rem;
}

/* Documents Table */
.documents-table {
  overflow-x: auto;
}

.documents-table table {
  width: 100%;
  border-collapse: collapse;
}

.documents-table th,
.documents-table td {
  text-align: left;
  padding: 0.75rem;
  border-bottom: 1px solid #e0e0e0;
}

.documents-table th {
  font-weight: 600;
  color: #666;
  font-size: 0.875rem;
  background: #f5f5f5;
}

.doc-name {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.doc-name i {
  color: #666;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

.status-pending {
  background: #e3f2fd;
  color: #1976d2;
}

.status-processing {
  background: #fff3e0;
  color: #f57c00;
}

.status-completed {
  background: #e8f5e9;
  color: #388e3c;
}

.status-error {
  background: #ffebee;
  color: #d32f2f;
}

.action-buttons {
  display: flex;
  gap: 0.25rem;
}

.btn-icon {
  padding: 0.25rem 0.5rem;
  background: transparent;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: #f5f5f5;
}

.btn-icon.danger:hover {
  background: #ffebee;
  border-color: #d32f2f;
  color: #d32f2f;
}

/* Pagination */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1.5rem;
}

.btn-page {
  padding: 0.25rem 0.5rem;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-page:hover:not(:disabled) {
  background: #f5f5f5;
}

.btn-page:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  padding: 0 1rem;
  font-size: 0.875rem;
  color: #666;
}

/* Processing Status */
.processing-status {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  width: 300px;
  z-index: 1000;
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #e0e0e0;
}

.status-header h3 {
  font-size: 1rem;
  margin: 0;
}

.btn-close {
  background: transparent;
  border: none;
  font-size: 1.25rem;
  color: #666;
  cursor: pointer;
}

.status-content {
  padding: 1rem;
}

.status-item {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  font-size: 0.875rem;
}

/* Buttons */
.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-primary {
  background: var(--primary-color, #0078d4);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-color-dark, #005a9e);
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Responsive */
@media (max-width: 768px) {
  .upload-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .list-controls {
    flex-direction: column;
  }
  
  .documents-table {
    font-size: 0.875rem;
  }
  
  .processing-status {
    width: calc(100% - 2rem);
    left: 1rem;
    right: 1rem;
  }
}
</style>