// ResultPreviewModal.vue
<template>
  <Teleport to="body">
    <div v-if="previewData" class="modal-overlay" @click="closeModal">
      <div class="modal-container" @click.stop>
        <div class="modal-header">
          <div class="modal-title">
            <div class="file-icon-name">
              <i :class="getFileIcon(previewData.fileName)"></i>
              <h3>{{ previewData.fileName }}</h3>
            </div>
          </div>
          <button class="modal-close" @click="closeModal">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="modal-body">
          <div class="preview-tabs">
            <button 
              class="tab" 
              :class="{ active: activeTab === 'preview' }"
              @click="activeTab = 'preview'"
            >
              <i class="fas fa-eye"></i>
              Vorschau
            </button>
            <button 
              class="tab" 
              :class="{ active: activeTab === 'metadata' }"
              @click="activeTab = 'metadata'"
            >
              <i class="fas fa-info-circle"></i>
              Metadaten
            </button>
            <button 
              v-if="previewData.sourceCounts" 
              class="tab" 
              :class="{ active: activeTab === 'sources' }"
              @click="activeTab = 'sources'"
            >
              <i class="fas fa-file-alt"></i>
              Quellen
            </button>
          </div>
          
          <div class="tab-content">
            <!-- Preview Tab -->
            <div v-if="activeTab === 'preview'" class="preview-content">
              <div v-if="isLoading" class="loading-container">
                <div class="loading-spinner"></div>
                <p>Vorschau wird geladen...</p>
              </div>
              
              <div v-else-if="errorMessage" class="preview-error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>{{ errorMessage }}</p>
              </div>
              
              <div v-else>
                <!-- Markdown Vorschau -->
                <div v-if="isMarkdown" class="markdown-preview" v-html="renderedMarkdown"></div>
                
                <!-- Text Vorschau -->
                <pre v-else-if="isText" class="text-preview">{{ previewContent }}</pre>
                
                <!-- HTML Vorschau -->
                <iframe v-else-if="isHtml" class="html-preview" :srcdoc="previewContent"></iframe>
                
                <!-- JSON Vorschau -->
                <pre v-else-if="isJson" class="json-preview">{{ prettifiedJson }}</pre>
                
                <!-- Fallback für unbekannte Formate -->
                <div v-else class="unsupported-format">
                  <p>Eine Vorschau für dieses Dateiformat ist nicht verfügbar.</p>
                  <button class="download-button" @click="downloadFile">
                    <i class="fas fa-download"></i>
                    Datei herunterladen
                  </button>
                </div>
              </div>
            </div>
            
            <!-- Metadata Tab -->
            <div v-if="activeTab === 'metadata'" class="metadata-content">
              <table class="metadata-table">
                <tbody>
                  <tr>
                    <th>Ursprüngliche Datei</th>
                    <td>{{ previewData.originalFileName || 'Nicht verfügbar' }}</td>
                  </tr>
                  <tr>
                    <th>Format</th>
                    <td>{{ formatLabel }}</td>
                  </tr>
                  <tr>
                    <th>Dateigröße</th>
                    <td>{{ formatFileSize(previewData.fileSize) }}</td>
                  </tr>
                  <tr>
                    <th>Erstellt am</th>
                    <td>{{ formatDate(previewData.timestamp) }}</td>
                  </tr>
                  <tr v-if="previewData.pages">
                    <th>Seitenanzahl</th>
                    <td>{{ previewData.pages }}</td>
                  </tr>
                  <tr v-if="previewData.wordCount">
                    <th>Wortanzahl</th>
                    <td>{{ previewData.wordCount.toLocaleString('de-DE') }} Wörter</td>
                  </tr>
                  <tr v-if="previewData.hasImages !== undefined">
                    <th>Bilder</th>
                    <td>{{ previewData.hasImages ? 'Ja' : 'Nein' }}</td>
                  </tr>
                  <tr v-if="previewData.hasTables !== undefined">
                    <th>Tabellen</th>
                    <td>{{ previewData.hasTables ? 'Ja' : 'Nein' }}</td>
                  </tr>
                  <tr v-if="previewData.language">
                    <th>Sprache</th>
                    <td>{{ getLanguageName(previewData.language) }}</td>
                  </tr>
                </tbody>
              </table>
              
              <!-- Erweiterte Metadaten, falls vorhanden -->
              <div v-if="previewData.metadata && Object.keys(previewData.metadata).length > 0" class="extended-metadata">
                <h4>Erweiterte Metadaten</h4>
                <div class="metadata-grid">
                  <div v-for="(value, key) in previewData.metadata" :key="key" class="metadata-item">
                    <div class="metadata-key">{{ formatMetadataKey(key) }}</div>
                    <div class="metadata-value">{{ value }}</div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Sources Tab -->
            <div v-if="activeTab === 'sources' && previewData.sourceCounts" class="sources-content">
              <h4>Quelldateien</h4>
              <table class="sources-table">
                <thead>
                  <tr>
                    <th>Dateiname</th>
                    <th>Erkannte Inhalte</th>
                    <th>Anteil</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(count, source) in previewData.sourceCounts" :key="source">
                    <td>{{ source }}</td>
                    <td>{{ count }} {{ count === 1 ? 'Abschnitt' : 'Abschnitte' }}</td>
                    <td>
                      <div class="percentage-bar-container">
                        <div 
                          class="percentage-bar" 
                          :style="{ width: calculatePercentage(count, previewData.sourceCounts) + '%' }"
                        ></div>
                        <span class="percentage-text">{{ calculatePercentage(count, previewData.sourceCounts) }}%</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="secondary-button" @click="closeModal">
            Schließen
          </button>
          <button class="primary-button" @click="downloadFile">
            <i class="fas fa-download"></i>
            Herunterladen
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useDocConverterStore } from '@/stores/docConverterStore';
import { marked } from 'marked';

// Props
const props = defineProps({
  previewData: {
    type: Object,
    default: null
  }
});

// Emits
const emit = defineEmits(['close']);

// Store
const docConverterStore = useDocConverterStore();

// State
const activeTab = ref('preview');
const isLoading = ref(true);
const previewContent = ref('');
const errorMessage = ref('');

// Wenn sich die previewData ändert, lade den Inhalt
watch(() => props.previewData, async (newData) => {
  if (newData) {
    await loadPreviewContent();
    // Zurück zur Vorschau-Ansicht wechseln, wenn ein neues Dokument angezeigt wird
    activeTab.value = 'preview';
  }
}, { immediate: true });

// Computed-Properties
const isMarkdown = computed(() => {
  return props.previewData?.format === 'markdown' || 
         props.previewData?.fileName?.endsWith('.md');
});

const isText = computed(() => {
  return props.previewData?.format === 'text' || 
         props.previewData?.fileName?.endsWith('.txt');
});

const isHtml = computed(() => {
  return props.previewData?.format === 'html' || 
         props.previewData?.fileName?.endsWith('.html') || 
         props.previewData?.fileName?.endsWith('.htm');
});

const isJson = computed(() => {
  return props.previewData?.format === 'json' || 
         props.previewData?.fileName?.endsWith('.json');
});

const formatLabel = computed(() => {
  const formatMap = {
    'markdown': 'Markdown',
    'text': 'Einfacher Text',
    'html': 'HTML',
    'json': 'JSON'
  };
  
  return formatMap[props.previewData?.format] || props.previewData?.format || 'Unbekannt';
});

const renderedMarkdown = computed(() => {
  if (!previewContent.value || !isMarkdown.value) return '';
  
  try {
    return marked(previewContent.value, { breaks: true });
  } catch (error) {
    console.error('Fehler beim Rendern des Markdowns:', error);
    return '<p>Fehler beim Rendern des Markdowns</p>';
  }
});

const prettifiedJson = computed(() => {
  if (!previewContent.value || !isJson.value) return '';
  
  try {
    const jsonObj = JSON.parse(previewContent.value);
    return JSON.stringify(jsonObj, null, 2);
  } catch (error) {
    console.error('Fehler beim Formatieren des JSONs:', error);
    return previewContent.value;
  }
});

// Methoden
const loadPreviewContent = async () => {
  if (!props.previewData || !props.previewData.id) return;
  
  isLoading.value = true;
  errorMessage.value = '';
  previewContent.value = '';
  
  try {
    const content = await docConverterStore.getPreviewContent(props.previewData.id);
    previewContent.value = content;
  } catch (error) {
    console.error('Fehler beim Laden der Vorschau:', error);
    errorMessage.value = 'Die Vorschau konnte nicht geladen werden: ' + (error.message || 'Unbekannter Fehler');
  } finally {
    isLoading.value = false;
  }
};

const closeModal = () => {
  emit('close');
};

const downloadFile = () => {
  if (props.previewData && props.previewData.id) {
    docConverterStore.downloadConvertedFile(props.previewData.id);
  }
};

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  } else if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  } else if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  } else {
    return `${bytes} B`;
  }
};

const formatDate = (timestamp) => {
  if (!timestamp) return 'Unbekannt';
  
  const date = new Date(timestamp * 1000);
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

const getFileIcon = (fileName) => {
  if (!fileName) return 'fas fa-file';
  
  const extension = fileName.split('.').pop().toLowerCase();
  
  const iconMap = {
    pdf: 'fas fa-file-pdf',
    doc: 'fas fa-file-word',
    docx: 'fas fa-file-word',
    xls: 'fas fa-file-excel',
    xlsx: 'fas fa-file-excel',
    csv: 'fas fa-file-csv',
    ppt: 'fas fa-file-powerpoint',
    pptx: 'fas fa-file-powerpoint',
    jpg: 'fas fa-file-image',
    jpeg: 'fas fa-file-image',
    png: 'fas fa-file-image',
    gif: 'fas fa-file-image',
    txt: 'fas fa-file-alt',
    html: 'fas fa-file-code',
    htm: 'fas fa-file-code',
    md: 'fas fa-file-alt',
    markdown: 'fas fa-file-alt',
    json: 'fas fa-file-code',
    // Weitere Dateitypen hier hinzufügen
  };
  
  return iconMap[extension] || 'fas fa-file';
};

const formatMetadataKey = (key) => {
  // Beispiel: 'author_name' -> 'Author Name'
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
};

const getLanguageName = (langCode) => {
  const languages = {
    'de': 'Deutsch',
    'en': 'Englisch',
    'fr': 'Französisch',
    'es': 'Spanisch',
    'it': 'Italienisch',
    // Weitere Sprachen nach Bedarf
  };
  
  return languages[langCode] || langCode;
};

const calculatePercentage = (count, sourceCounts) => {
  if (!sourceCounts) return 0;
  
  const total = Object.values(sourceCounts).reduce((sum, c) => sum + c, 0);
  if (total === 0) return 0;
  
  return Math.round((count / total) * 100);
};

// Bei der Erstellung der Komponente
onMounted(() => {
  // Tastaturnavigation für Tabs
  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      closeModal();
    }
  };
  
  window.addEventListener('keydown', handleKeyDown);
  
  // Event-Listener entfernen, wenn die Komponente zerstört wird
  return () => {
    window.removeEventListener('keydown', handleKeyDown);
  };
});
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 1rem;
}

.modal-container {
  background-color: white;
  border-radius: 8px;
  width: 90%;
  max-width: 1000px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--nscale-gray-medium);
}

.file-icon-name {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.file-icon-name i {
  font-size: 1.25rem;
  color: var(--nscale-gray-dark);
}

.modal-title h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--nscale-dark-gray);
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  color: var(--nscale-gray-dark);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
}

.modal-close:hover {
  background-color: var(--nscale-gray-light);
  color: var(--nscale-red);
}

.modal-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.preview-tabs {
  display: flex;
  padding: 0 1.5rem;
  border-bottom: 1px solid var(--nscale-gray-medium);
}

.tab {
  padding: 1rem 1.25rem;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-size: 0.95rem;
  color: var(--nscale-gray-dark);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
}

.tab:hover {
  color: var(--nscale-primary);
}

.tab.active {
  color: var(--nscale-primary);
  border-bottom-color: var(--nscale-primary);
  font-weight: 500;
}

.tab-content {
  flex: 1;
  overflow: auto;
  padding: 1.5rem;
}

/* Preview Tab Styles */
.preview-content {
  height: 100%;
  min-height: 300px;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 2rem;
}

.loading-spinner {
  border: 3px solid var(--nscale-gray-medium);
  border-radius: 50%;
  border-top: 3px solid var(--nscale-primary);
  width: 30px;
  height: 30px;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.preview-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  color: var(--nscale-red);
  text-align: center;
}

.preview-error i {
  font-size: 2rem;
  margin-bottom: 1rem;
}

.markdown-preview {
  height: 100%;
  overflow: auto;
  padding: 1rem;
}

.text-preview {
  background-color: var(--nscale-gray-light);
  padding: 1rem;
  border-radius: 4px;
  font-family: monospace;
  white-space: pre-wrap;
  overflow: auto;
  max-height: 500px;
}

.html-preview {
  width: 100%;
  height: 500px;
  border: 1px solid var(--nscale-gray-medium);
  border-radius: 4px;
}

.json-preview {
  background-color: var(--nscale-gray-light);
  padding: 1rem;
  border-radius: 4px;
  font-family: monospace;
  white-space: pre-wrap;
  overflow: auto;
  max-height: 500px;
}

.unsupported-format {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  text-align: center;
}

.download-button {
  margin-top: 1rem;
  background-color: var(--nscale-primary);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.75rem 1.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
}

.download-button:hover {
  background-color: var(--nscale-primary-dark);
  transform: translateY(-1px);
}

/* Metadata Tab Styles */
.metadata-content {
  padding: 1rem 0;
}

.metadata-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1.5rem;
}

.metadata-table th,
.metadata-table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--nscale-gray-medium);
  text-align: left;
}

.metadata-table th {
  width: 40%;
  font-weight: 600;
  color: var(--nscale-dark-gray);
}

.extended-metadata {
  margin-top: 2rem;
}

.extended-metadata h4 {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: var(--nscale-dark-gray);
}

.metadata-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.metadata-item {
  padding: 0.75rem;
  background-color: var(--nscale-gray-light);
  border-radius: 4px;
}

.metadata-key {
  font-weight: 500;
  margin-bottom: 0.25rem;
  color: var(--nscale-dark-gray);
}

.metadata-value {
  font-size: 0.9rem;
  word-break: break-word;
}

/* Sources Tab Styles */
.sources-content {
  padding: 1rem 0;
}

.sources-content h4 {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: var(--nscale-dark-gray);
}

.sources-table {
  width: 100%;
  border-collapse: collapse;
}

.sources-table th,
.sources-table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--nscale-gray-medium);
  text-align: left;
}

.sources-table th {
  font-weight: 600;
  color: var(--nscale-dark-gray);
}

.percentage-bar-container {
  position: relative;
  height: 16px;
  width: 100%;
  background-color: var(--nscale-gray-light);
  border-radius: 8px;
  overflow: hidden;
}

.percentage-bar {
  height: 100%;
  background-color: var(--nscale-primary);
  border-radius: 8px;
}

.percentage-text {
  position: absolute;
  right: 8px;
  top: 0;
  font-size: 0.8rem;
  font-weight: 500;
  line-height: 16px;
  color: var(--nscale-dark-gray);
}

/* Modal Footer */
.modal-footer {
  display: flex;
  justify-content: flex-end;
  padding: 1.25rem 1.5rem;
  border-top: 1px solid var(--nscale-gray-medium);
  gap: 1rem;
}

.primary-button {
  background-color: var(--nscale-primary);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.75rem 1.5rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
}

.primary-button:hover {
  background-color: var(--nscale-primary-dark);
  transform: translateY(-1px);
}

.secondary-button {
  background-color: white;
  color: var(--nscale-dark-gray);
  border: 1px solid var(--nscale-gray-medium);
  border-radius: 4px;
  padding: 0.75rem 1.5rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.secondary-button:hover {
  background-color: var(--nscale-gray-light);
  transform: translateY(-1px);
}

/* Dark Mode Anpassungen */
:global(.theme-dark) .modal-container {
  background-color: #1e1e1e;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
}

:global(.theme-dark) .modal-header,
:global(.theme-dark) .modal-footer {
  border-color: #333;
}

:global(.theme-dark) .file-icon-name i {
  color: #aaa;
}

:global(.theme-dark) .modal-title h3 {
  color: #f0f0f0;
}

:global(.theme-dark) .modal-close {
  color: #aaa;
}

:global(.theme-dark) .modal-close:hover {
  background-color: #333;
  color: #ff4d4d;
}

:global(.theme-dark) .preview-tabs {
  border-bottom-color: #333;
}

:global(.theme-dark) .tab {
  color: #aaa;
}

:global(.theme-dark) .tab:hover {
  color: #00c060;
}

:global(.theme-dark) .tab.active {
  color: #00c060;
  border-bottom-color: #00c060;
}

:global(.theme-dark) .loading-spinner {
  border-color: #555;
  border-top-color: #00c060;
}

:global(.theme-dark) .preview-error {
  color: #ff4d4d;
}

:global(.theme-dark) .text-preview,
:global(.theme-dark) .json-preview,
:global(.theme-dark) .html-preview {
  background-color: #333;
  border-color: #555;
  color: #f0f0f0;
}

:global(.theme-dark) .download-button {
  background-color: #00c060;
}

:global(.theme-dark) .download-button:hover {
  background-color: #00a550;
}

:global(.theme-dark) .metadata-table th,
:global(.theme-dark) .sources-table th {
  color: #f0f0f0;
  border-bottom-color: #555;
}

:global(.theme-dark) .metadata-table td,
:global(.theme-dark) .sources-table td {
  border-bottom-color: #555;
  color: #f0f0f0;
}

:global(.theme-dark) .extended-metadata h4,
:global(.theme-dark) .sources-content h4 {
  color: #f0f0f0;
}

:global(.theme-dark) .metadata-item {
  background-color: #333;
}

:global(.theme-dark) .metadata-key {
  color: #f0f0f0;
}

:global(.theme-dark) .percentage-bar-container {
  background-color: #333;
}

:global(.theme-dark) .percentage-bar {
  background-color: #00c060;
}

:global(.theme-dark) .percentage-text {
  color: #f0f0f0;
}

:global(.theme-dark) .primary-button {
  background-color: #00c060;
}

:global(.theme-dark) .primary-button:hover {
  background-color: #00a550;
}

:global(.theme-dark) .secondary-button {
  background-color: #333;
  color: #f0f0f0;
  border-color: #555;
}

:global(.theme-dark) .secondary-button:hover {
  background-color: #444;
}

/* Kontrast-Modus Anpassungen */
:global(.theme-contrast) .modal-container {
  background-color: #000000;
  border: 2px solid #ffeb3b;
  box-shadow: 0 10px 25px rgba(255, 235, 59, 0.2);
}

:global(.theme-contrast) .modal-header,
:global(.theme-contrast) .modal-footer {
  border-color: #ffeb3b;
}

:global(.theme-contrast) .file-icon-name i,
:global(.theme-contrast) .modal-title h3 {
  color: #ffeb3b;
}

:global(.theme-contrast) .modal-close {
  color: #ffeb3b;
}

:global(.theme-contrast) .modal-close:hover {
  background-color: #333300;
  color: #ff4444;
}

:global(.theme-contrast) .preview-tabs {
  border-bottom-color: #ffeb3b;
}

:global(.theme-contrast) .tab {
  color: #ffeb3b;
}

:global(.theme-contrast) .tab:hover,
:global(.theme-contrast) .tab.active {
  color: #ffeb3b;
  border-bottom-color: #ffeb3b;
  font-weight: bold;
}

:global(.theme-contrast) .loading-spinner {
  border: 3px solid #ffeb3b;
  border-top: 3px solid #000000;
}

:global(.theme-contrast) .preview-error {
  color: #ff4444;
}

:global(.theme-contrast) .text-preview,
:global(.theme-contrast) .json-preview {
  background-color: #333300;
  border: 1px solid #ffeb3b;
  color: #ffffff;
}

:global(.theme-contrast) .html-preview {
  border: 2px solid #ffeb3b;
}

:global(.theme-contrast) .download-button {
  background-color: #ffeb3b;
  color: #000000;
  font-weight: bold;
  border: 2px solid #ffeb3b;
}

:global(.theme-contrast) .download-button:hover {
  background-color: #ffd600;
}

:global(.theme-contrast) .metadata-table th,
:global(.theme-contrast) .sources-table th,
:global(.theme-contrast) .metadata-key,
:global(.theme-contrast) .extended-metadata h4,
:global(.theme-contrast) .sources-content h4 {
  color: #ffeb3b;
}

:global(.theme-contrast) .metadata-table td,
:global(.theme-contrast) .sources-table td,
:global(.theme-contrast) .metadata-value {
  color: #ffffff;
}

:global(.theme-contrast) .metadata-table th,
:global(.theme-contrast) .metadata-table td,
:global(.theme-contrast) .sources-table th,
:global(.theme-contrast) .sources-table td {
  border-bottom-color: #ffeb3b;
}

:global(.theme-contrast) .metadata-item {
  background-color: #333300;
  border: 1px solid #ffeb3b;
}

:global(.theme-contrast) .percentage-bar-container {
  background-color: #333300;
  border: 1px solid #ffeb3b;
}

:global(.theme-contrast) .percentage-bar {
  background-color: #ffeb3b;
}

:global(.theme-contrast) .percentage-text {
  color: #000000;
  font-weight: bold;
}

:global(.theme-contrast) .primary-button {
  background-color: #ffeb3b;
  color: #000000;
  font-weight: bold;
  border: 2px solid #ffeb3b;
}

:global(.theme-contrast) .primary-button:hover {
  background-color: #ffd600;
}

:global(.theme-contrast) .secondary-button {
  background-color: #000000;
  color: #ffeb3b;
  border: 2px solid #ffeb3b;
}

:global(.theme-contrast) .secondary-button:hover {
  background-color: #333300;
}
</style>