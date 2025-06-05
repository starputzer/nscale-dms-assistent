<template>
  <div class="knowledge-manager">
    <header class="km-header">
      <h2 class="km-title">{{ t('admin.knowledgeManager.title', 'Wissensdatenbank-Verwaltung') }}</h2>
      <div class="km-actions">
        <button class="btn btn-primary" @click="showUploadDialog = true">
          <i class="fas fa-upload"></i>
          {{ t('admin.knowledgeManager.uploadDocuments', 'Dokumente hochladen') }}
        </button>
        <button class="btn btn-secondary" @click="refreshData">
          <i class="fas fa-sync-alt" :class="{ 'fa-spin': isRefreshing }"></i>
          {{ t('admin.knowledgeManager.refresh', 'Aktualisieren') }}
        </button>
      </div>
    </header>

    <!-- Knowledge Base Overview -->
    <section class="km-overview">
      <div class="overview-cards">
        <div class="overview-card">
          <div class="card-icon">
            <i class="fas fa-file-alt"></i>
          </div>
          <div class="card-content">
            <h3>{{ t('admin.knowledgeManager.totalDocuments', 'Dokumente gesamt') }}</h3>
            <p class="card-value">{{ knowledgeStats.totalDocuments }}</p>
          </div>
        </div>

        <div class="overview-card">
          <div class="card-icon">
            <i class="fas fa-cubes"></i>
          </div>
          <div class="card-content">
            <h3>{{ t('admin.knowledgeManager.totalChunks', 'Chunks gesamt') }}</h3>
            <p class="card-value">{{ formatNumber(knowledgeStats.totalChunks) }}</p>
          </div>
        </div>

        <div class="overview-card">
          <div class="card-icon">
            <i class="fas fa-vector-square"></i>
          </div>
          <div class="card-content">
            <h3>{{ t('admin.knowledgeManager.totalEmbeddings', 'Embeddings') }}</h3>
            <p class="card-value">{{ formatNumber(knowledgeStats.totalEmbeddings) }}</p>
          </div>
        </div>

        <div class="overview-card">
          <div class="card-icon">
            <i class="fas fa-database"></i>
          </div>
          <div class="card-content">
            <h3>{{ t('admin.knowledgeManager.databaseSize', 'Datenbankgröße') }}</h3>
            <p class="card-value">{{ formatBytes(knowledgeStats.databaseSize) }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Document Categories -->
    <section class="km-categories">
      <h3 class="section-title">
        <i class="fas fa-folder-tree"></i>
        {{ t('admin.knowledgeManager.documentCategories', 'Dokumentenkategorien') }}
      </h3>
      <div class="categories-grid">
        <div 
          v-for="category in documentCategories" 
          :key="category.id"
          class="category-card"
          :class="{ 'selected': selectedCategory === category.id }"
          @click="selectCategory(category.id)"
        >
          <div class="category-header">
            <i :class="category.icon"></i>
            <h4>{{ category.name }}</h4>
          </div>
          <div class="category-stats">
            <span>{{ category.documentCount }} Dokumente</span>
            <span class="category-size">{{ formatBytes(category.size) }}</span>
          </div>
          <div class="category-quality">
            <div class="quality-bar">
              <div class="quality-fill" :style="{ width: category.qualityScore + '%' }"></div>
            </div>
            <span class="quality-label">Qualität: {{ category.qualityScore }}%</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Document List -->
    <section class="km-documents">
      <div class="documents-header">
        <h3 class="section-title">
          <i class="fas fa-file-lines"></i>
          {{ t('admin.knowledgeManager.documents', 'Dokumente') }}
        </h3>
        <div class="documents-controls">
          <input 
            type="text" 
            class="search-input"
            v-model="searchQuery"
            :placeholder="t('admin.knowledgeManager.searchDocuments', 'Dokumente suchen...')"
            @input="handleSearch"
          >
          <select v-model="sortBy" @change="sortDocuments" class="sort-select">
            <option value="name">{{ t('admin.knowledgeManager.sortByName', 'Nach Name') }}</option>
            <option value="date">{{ t('admin.knowledgeManager.sortByDate', 'Nach Datum') }}</option>
            <option value="size">{{ t('admin.knowledgeManager.sortBySize', 'Nach Größe') }}</option>
            <option value="quality">{{ t('admin.knowledgeManager.sortByQuality', 'Nach Qualität') }}</option>
          </select>
        </div>
      </div>

      <div class="documents-table">
        <table>
          <thead>
            <tr>
              <th>{{ t('admin.knowledgeManager.documentName', 'Dokumentname') }}</th>
              <th>{{ t('admin.knowledgeManager.category', 'Kategorie') }}</th>
              <th>{{ t('admin.knowledgeManager.chunks', 'Chunks') }}</th>
              <th>{{ t('admin.knowledgeManager.quality', 'Qualität') }}</th>
              <th>{{ t('admin.knowledgeManager.lastUpdated', 'Zuletzt aktualisiert') }}</th>
              <th>{{ t('admin.knowledgeManager.actions', 'Aktionen') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="doc in filteredDocuments" :key="doc.id">
              <td>
                <div class="document-info">
                  <i :class="getDocumentIcon(doc.type)"></i>
                  <span>{{ doc.name }}</span>
                </div>
              </td>
              <td>
                <span class="category-badge" :style="{ backgroundColor: getCategoryColor(doc.category) }">
                  {{ doc.category }}
                </span>
              </td>
              <td>{{ doc.chunkCount }}</td>
              <td>
                <div class="quality-indicator">
                  <div class="quality-bar small">
                    <div class="quality-fill" :style="{ width: doc.qualityScore + '%' }"></div>
                  </div>
                  <span>{{ doc.qualityScore }}%</span>
                </div>
              </td>
              <td>{{ formatDate(doc.lastUpdated) }}</td>
              <td>
                <div class="action-buttons">
                  <button class="btn-icon" @click="viewDocument(doc)" title="Anzeigen">
                    <i class="fas fa-eye"></i>
                  </button>
                  <button class="btn-icon" @click="reprocessDocument(doc)" title="Neu verarbeiten">
                    <i class="fas fa-sync"></i>
                  </button>
                  <button class="btn-icon danger" @click="deleteDocument(doc)" title="Löschen">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="filteredDocuments.length === 0" class="no-documents">
          <i class="fas fa-folder-open"></i>
          <p>{{ t('admin.knowledgeManager.noDocuments', 'Keine Dokumente gefunden') }}</p>
        </div>
      </div>
    </section>

    <!-- Knowledge Graph Visualization -->
    <section class="km-graph">
      <h3 class="section-title">
        <i class="fas fa-project-diagram"></i>
        {{ t('admin.knowledgeManager.knowledgeGraph', 'Wissensgraph') }}
      </h3>
      <div class="graph-container">
        <div class="graph-controls">
          <button class="btn btn-sm" @click="zoomIn">
            <i class="fas fa-search-plus"></i>
          </button>
          <button class="btn btn-sm" @click="zoomOut">
            <i class="fas fa-search-minus"></i>
          </button>
          <button class="btn btn-sm" @click="resetZoom">
            <i class="fas fa-compress"></i>
          </button>
        </div>
        <div class="graph-canvas" ref="graphCanvas">
          <!-- D3.js or similar visualization would go here -->
          <div class="graph-placeholder">
            <i class="fas fa-project-diagram"></i>
            <p>{{ t('admin.knowledgeManager.graphVisualization', 'Wissensgraph-Visualisierung') }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Upload Dialog -->
    <div v-if="showUploadDialog" class="dialog-overlay" @click.self="closeUploadDialog">
      <div class="dialog">
        <div class="dialog-header">
          <h3>{{ t('admin.knowledgeManager.uploadDocuments', 'Dokumente hochladen') }}</h3>
          <button class="btn-close" @click="closeUploadDialog">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="dialog-body">
          <div 
            class="upload-area"
            :class="{ 'dragging': isDragging }"
            @drop="handleDrop"
            @dragover.prevent
            @dragenter.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
          >
            <i class="fas fa-cloud-upload-alt"></i>
            <p>{{ t('admin.knowledgeManager.dropFiles', 'Dateien hier ablegen oder') }}</p>
            <button class="btn btn-primary" @click="selectFiles">
              {{ t('admin.knowledgeManager.selectFiles', 'Dateien auswählen') }}
            </button>
            <input 
              ref="fileInput" 
              type="file" 
              multiple 
              accept=".pdf,.docx,.txt,.html,.md"
              @change="handleFileSelect"
              style="display: none;"
            >
          </div>

          <div v-if="selectedFiles.length > 0" class="selected-files">
            <h4>{{ t('admin.knowledgeManager.selectedFiles', 'Ausgewählte Dateien') }}</h4>
            <div v-for="file in selectedFiles" :key="file.name" class="file-item">
              <i :class="getDocumentIcon(file.type)"></i>
              <span>{{ file.name }}</span>
              <span class="file-size">{{ formatBytes(file.size) }}</span>
              <button class="btn-remove" @click="removeFile(file)">
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>

          <div class="upload-options">
            <label>
              <input type="checkbox" v-model="uploadOptions.autoProcess">
              {{ t('admin.knowledgeManager.autoProcess', 'Automatisch verarbeiten') }}
            </label>
            <label>
              <input type="checkbox" v-model="uploadOptions.extractMetadata">
              {{ t('admin.knowledgeManager.extractMetadata', 'Metadaten extrahieren') }}
            </label>
            <label>
              <input type="checkbox" v-model="uploadOptions.createEmbeddings">
              {{ t('admin.knowledgeManager.createEmbeddings', 'Embeddings erstellen') }}
            </label>
          </div>
        </div>

        <div class="dialog-footer">
          <button class="btn btn-secondary" @click="closeUploadDialog">
            {{ t('admin.knowledgeManager.cancel', 'Abbrechen') }}
          </button>
          <button 
            class="btn btn-primary" 
            @click="uploadDocuments"
            :disabled="selectedFiles.length === 0 || isUploading"
          >
            <i v-if="isUploading" class="fas fa-spinner fa-spin"></i>
            {{ isUploading ? 
              t('admin.knowledgeManager.uploading', 'Hochladen...') : 
              t('admin.knowledgeManager.upload', 'Hochladen') 
            }}
          </button>
        </div>
      </div>
    </div>

    <!-- Document Viewer Dialog -->
    <div v-if="viewingDocument" class="dialog-overlay" @click.self="closeDocumentViewer">
      <div class="dialog large">
        <div class="dialog-header">
          <h3>{{ viewingDocument.name }}</h3>
          <button class="btn-close" @click="closeDocumentViewer">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="dialog-body">
          <div class="document-details">
            <div class="detail-group">
              <label>{{ t('admin.knowledgeManager.category', 'Kategorie') }}:</label>
              <span>{{ viewingDocument.category }}</span>
            </div>
            <div class="detail-group">
              <label>{{ t('admin.knowledgeManager.quality', 'Qualität') }}:</label>
              <span>{{ viewingDocument.qualityScore }}%</span>
            </div>
            <div class="detail-group">
              <label>{{ t('admin.knowledgeManager.chunks', 'Chunks') }}:</label>
              <span>{{ viewingDocument.chunkCount }}</span>
            </div>
            <div class="detail-group">
              <label>{{ t('admin.knowledgeManager.embeddings', 'Embeddings') }}:</label>
              <span>{{ viewingDocument.embeddingCount }}</span>
            </div>
          </div>

          <div class="document-preview">
            <h4>{{ t('admin.knowledgeManager.preview', 'Vorschau') }}</h4>
            <div class="preview-content">
              {{ viewingDocument.preview || 'Keine Vorschau verfügbar' }}
            </div>
          </div>

          <div class="document-metadata">
            <h4>{{ t('admin.knowledgeManager.metadata', 'Metadaten') }}</h4>
            <pre>{{ JSON.stringify(viewingDocument.metadata, null, 2) }}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from '@/composables/useToast';
import { useKnowledgeStore } from '@/stores/knowledge';
import apiService from '@/services/api/ApiService';

const { t } = useI18n();
const toast = useToast();
const knowledgeStore = useKnowledgeStore();

// State
const isRefreshing = ref(false);
const showUploadDialog = ref(false);
const isDragging = ref(false);
const isUploading = ref(false);
const selectedFiles = ref<File[]>([]);
const searchQuery = ref('');
const sortBy = ref('name');
const selectedCategory = ref<string | null>(null);
const viewingDocument = ref<any>(null);

// Upload Options
const uploadOptions = ref({
  autoProcess: true,
  extractMetadata: true,
  createEmbeddings: true
});

// Knowledge Statistics
const knowledgeStats = ref({
  totalDocuments: 0,
  totalChunks: 0,
  totalEmbeddings: 0,
  databaseSize: 0
});

// Document Categories
const documentCategories = ref<any[]>([]);

// Documents
const documents = ref<any[]>([]);

// Computed
const filteredDocuments = computed(() => {
  let filtered = [...documents.value];
  
  // Filter by category
  if (selectedCategory.value) {
    filtered = filtered.filter(doc => doc.category === selectedCategory.value);
  }
  
  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(doc => 
      doc.name.toLowerCase().includes(query) ||
      doc.category.toLowerCase().includes(query)
    );
  }
  
  // Sort documents
  filtered.sort((a, b) => {
    switch (sortBy.value) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'date':
        return b.lastUpdated.getTime() - a.lastUpdated.getTime();
      case 'size':
        return b.chunkCount - a.chunkCount;
      case 'quality':
        return b.qualityScore - a.qualityScore;
      default:
        return 0;
    }
  });
  
  return filtered;
});

// Methods
const refreshData = async () => {
  isRefreshing.value = true;
  try {
    // Load all data from API
    await Promise.all([
      loadKnowledgeStats(),
      loadCategories(),
      loadDocuments()
    ]);
    toast.success(t('admin.knowledgeManager.dataRefreshed', 'Daten aktualisiert'));
  } catch (error) {
    toast.error(t('admin.knowledgeManager.refreshError', 'Fehler beim Aktualisieren'));
  } finally {
    isRefreshing.value = false;
  }
};

const loadKnowledgeStats = async () => {
  try {
    const response = await apiService.get('/knowledge-manager/stats');
    if (response.success && response.data) {
      knowledgeStats.value = response.data;
    }
  } catch (error) {
    console.error('Error loading knowledge stats:', error);
  }
};

const loadCategories = async () => {
  try {
    const response = await apiService.get('/knowledge-manager/categories');
    if (response.success && response.data) {
      documentCategories.value = response.data;
    }
  } catch (error) {
    console.error('Error loading categories:', error);
  }
};

const loadDocuments = async () => {
  try {
    const params = {
      category: selectedCategory.value,
      search: searchQuery.value,
      sort_by: sortBy.value
    };
    
    const response = await apiService.get('/knowledge-manager/documents', { params });
    if (response.success && response.data) {
      documents.value = response.data.map((doc: any) => ({
        ...doc,
        lastUpdated: new Date(doc.lastUpdated)
      }));
    }
  } catch (error) {
    console.error('Error loading documents:', error);
  }
};

const selectCategory = (categoryId: string) => {
  selectedCategory.value = selectedCategory.value === categoryId ? null : categoryId;
  loadDocuments(); // Reload with new filter
};

const handleSearch = () => {
  // Debounce search to avoid too many API calls
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }
  searchTimeout = setTimeout(() => {
    loadDocuments();
  }, 300);
};

const sortDocuments = () => {
  loadDocuments(); // Reload with new sort
};

// Add search timeout ref
let searchTimeout: NodeJS.Timeout | null = null;

const viewDocument = (doc: any) => {
  viewingDocument.value = doc;
};

const closeDocumentViewer = () => {
  viewingDocument.value = null;
};

const reprocessDocument = async (doc: any) => {
  if (!confirm(t('admin.knowledgeManager.confirmReprocess', 'Möchten Sie dieses Dokument neu verarbeiten?'))) {
    return;
  }
  
  try {
    const response = await apiService.post(`/knowledge-manager/documents/${doc.id}/reprocess`);
    if (response.success) {
      toast.success(t('admin.knowledgeManager.reprocessStarted', 'Neuverarbeitung gestartet'));
      await loadDocuments(); // Reload to get updated data
    }
  } catch (error) {
    toast.error(t('admin.knowledgeManager.reprocessError', 'Fehler bei der Neuverarbeitung'));
  }
};

const deleteDocument = async (doc: any) => {
  if (!confirm(t('admin.knowledgeManager.confirmDelete', 'Möchten Sie dieses Dokument wirklich löschen?'))) {
    return;
  }
  
  try {
    const response = await apiService.delete(`/knowledge-manager/documents/${doc.id}`);
    if (response.success) {
      documents.value = documents.value.filter(d => d.id !== doc.id);
      toast.success(t('admin.knowledgeManager.documentDeleted', 'Dokument gelöscht'));
      // Update stats
      await loadKnowledgeStats();
    }
  } catch (error) {
    toast.error(t('admin.knowledgeManager.deleteError', 'Fehler beim Löschen'));
  }
};

const closeUploadDialog = () => {
  showUploadDialog.value = false;
  selectedFiles.value = [];
  isDragging.value = false;
};

const selectFiles = () => {
  const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
  fileInput?.click();
};

const handleFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (input.files) {
    selectedFiles.value = Array.from(input.files);
  }
};

const handleDrop = (event: DragEvent) => {
  event.preventDefault();
  isDragging.value = false;
  
  if (event.dataTransfer?.files) {
    selectedFiles.value = Array.from(event.dataTransfer.files);
  }
};

const removeFile = (file: File) => {
  selectedFiles.value = selectedFiles.value.filter(f => f !== file);
};

const uploadDocuments = async () => {
  isUploading.value = true;
  try {
    const formData = new FormData();
    
    // Add files
    for (const file of selectedFiles.value) {
      formData.append('files', file);
    }
    
    // Add options as JSON string
    formData.append('options', JSON.stringify(uploadOptions.value));
    
    const response = await apiService.post('/knowledge-manager/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    if (response.success) {
      toast.success(t('admin.knowledgeManager.uploadSuccess', 'Dokumente erfolgreich hochgeladen'));
      closeUploadDialog();
      await refreshData();
    }
  } catch (error) {
    toast.error(t('admin.knowledgeManager.uploadError', 'Fehler beim Hochladen'));
  } finally {
    isUploading.value = false;
  }
};

// Graph controls
const zoomIn = () => {
  // Implement zoom in
};

const zoomOut = () => {
  // Implement zoom out
};

const resetZoom = () => {
  // Implement reset zoom
};

// Utility functions
const formatNumber = (num: number) => {
  return new Intl.NumberFormat('de-DE').format(num);
};

const formatBytes = (bytes: number) => {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
};

const getDocumentIcon = (type: string) => {
  const icons: Record<string, string> = {
    pdf: 'fas fa-file-pdf',
    docx: 'fas fa-file-word',
    txt: 'fas fa-file-alt',
    html: 'fas fa-file-code',
    md: 'fas fa-file-lines'
  };
  return icons[type] || 'fas fa-file';
};

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    manual: '#0078d4',
    faq: '#00a550',
    tutorial: '#ff8c00',
    configuration: '#6c757d'
  };
  return colors[category] || '#999';
};

// Lifecycle
onMounted(() => {
  refreshData();
});
</script>

<style scoped>
.knowledge-manager {
  max-width: 1400px;
  margin: 0 auto;
}

.km-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.km-title {
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--admin-text-primary);
}

.km-actions {
  display: flex;
  gap: 1rem;
}

/* Overview Cards */
.overview-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.25rem;
  margin-bottom: 2rem;
}

.overview-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
}

.overview-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  background: var(--admin-primary-light);
  border-radius: 50%;
  font-size: 1.25rem;
  color: var(--admin-primary);
}

.card-content h3 {
  font-size: 0.875rem;
  font-weight: 500;
  margin: 0 0 0.5rem 0;
  color: var(--admin-text-secondary);
}

.card-value {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  color: var(--admin-text-primary);
}

/* Categories */
.km-categories {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1.25rem;
  color: var(--admin-text-primary);
}

.section-title i {
  color: var(--admin-primary);
}

.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}

.category-card {
  padding: 1.25rem;
  background: #f8f9fa;
  border: 2px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.category-card:hover {
  border-color: var(--admin-primary);
  transform: translateY(-2px);
}

.category-card.selected {
  border-color: var(--admin-primary);
  background: var(--admin-primary-light);
}

.category-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.category-header i {
  font-size: 1.25rem;
  color: var(--admin-primary);
}

.category-header h4 {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
}

.category-stats {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
  color: var(--admin-text-secondary);
  margin-bottom: 0.75rem;
}

.category-quality {
  margin-top: 0.5rem;
}

.quality-bar {
  height: 6px;
  background: #e6e6e6;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 0.25rem;
}

.quality-bar.small {
  height: 4px;
}

.quality-fill {
  height: 100%;
  background: var(--admin-primary);
  transition: width 0.3s;
}

.quality-label {
  font-size: 0.75rem;
  color: var(--admin-text-secondary);
}

/* Documents */
.km-documents {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.documents-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
}

.documents-controls {
  display: flex;
  gap: 1rem;
}

.search-input {
  padding: 0.5rem 1rem;
  border: 1px solid var(--admin-border);
  border-radius: 4px;
  font-size: 0.875rem;
  width: 250px;
}

.sort-select {
  padding: 0.5rem 1rem;
  border: 1px solid var(--admin-border);
  border-radius: 4px;
  font-size: 0.875rem;
  background: white;
}

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
  border-bottom: 1px solid var(--admin-border);
}

.documents-table th {
  font-weight: 600;
  color: var(--admin-text-secondary);
  font-size: 0.875rem;
}

.document-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.document-info i {
  color: var(--admin-text-secondary);
}

.category-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  color: white;
  font-size: 0.75rem;
  font-weight: 500;
}

.quality-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.action-buttons {
  display: flex;
  gap: 0.25rem;
}

.btn-icon {
  padding: 0.25rem 0.5rem;
  background: transparent;
  border: 1px solid var(--admin-border);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: var(--admin-bg-hover);
}

.btn-icon.danger:hover {
  background: #ffe6e6;
  border-color: #dc3545;
  color: #dc3545;
}

.no-documents {
  text-align: center;
  padding: 3rem;
  color: var(--admin-text-secondary);
}

.no-documents i {
  font-size: 3rem;
  margin-bottom: 1rem;
}

/* Knowledge Graph */
.km-graph {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.graph-container {
  position: relative;
  height: 400px;
  border: 1px solid var(--admin-border);
  border-radius: 4px;
  overflow: hidden;
}

.graph-controls {
  position: absolute;
  top: 1rem;
  right: 1rem;
  display: flex;
  gap: 0.5rem;
  z-index: 10;
}

.graph-canvas {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.graph-placeholder {
  text-align: center;
  color: var(--admin-text-secondary);
}

.graph-placeholder i {
  font-size: 4rem;
  margin-bottom: 1rem;
}

/* Upload Dialog */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.dialog.large {
  max-width: 900px;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--admin-border);
}

.dialog-header h3 {
  margin: 0;
  font-size: 1.25rem;
}

.btn-close {
  background: transparent;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  color: var(--admin-text-secondary);
}

.dialog-body {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.upload-area {
  border: 2px dashed var(--admin-border);
  border-radius: 8px;
  padding: 3rem;
  text-align: center;
  transition: all 0.2s;
}

.upload-area.dragging {
  border-color: var(--admin-primary);
  background: var(--admin-primary-light);
}

.upload-area i {
  font-size: 3rem;
  color: var(--admin-primary);
  margin-bottom: 1rem;
}

.selected-files {
  margin-top: 1.5rem;
}

.selected-files h4 {
  font-size: 1rem;
  margin-bottom: 0.75rem;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: #f8f9fa;
  border-radius: 4px;
  margin-bottom: 0.5rem;
}

.file-size {
  margin-left: auto;
  font-size: 0.875rem;
  color: var(--admin-text-secondary);
}

.btn-remove {
  background: transparent;
  border: none;
  color: var(--admin-text-secondary);
  cursor: pointer;
}

.btn-remove:hover {
  color: #dc3545;
}

.upload-options {
  margin-top: 1.5rem;
}

.upload-options label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  cursor: pointer;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid var(--admin-border);
}

/* Document Details */
.document-details {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.detail-group {
  display: flex;
  gap: 0.5rem;
}

.detail-group label {
  font-weight: 600;
  color: var(--admin-text-secondary);
}

.document-preview {
  margin-bottom: 1.5rem;
}

.document-preview h4 {
  font-size: 1rem;
  margin-bottom: 0.75rem;
}

.preview-content {
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.875rem;
  max-height: 200px;
  overflow-y: auto;
}

.document-metadata h4 {
  font-size: 1rem;
  margin-bottom: 0.75rem;
}

.document-metadata pre {
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 4px;
  font-size: 0.75rem;
  overflow-x: auto;
}

/* Buttons */
.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-primary {
  background: var(--admin-primary);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--admin-primary-dark);
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
}

.btn-sm {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Responsive */
@media (max-width: 768px) {
  .km-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .documents-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .documents-controls {
    flex-direction: column;
    width: 100%;
  }
  
  .search-input {
    width: 100%;
  }
}
</style>