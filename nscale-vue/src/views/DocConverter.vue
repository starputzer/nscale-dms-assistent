<!-- src/views/DocConverterView.vue -->
<template>
  <div class="doc-converter">
    <header class="header">
      <h1 class="title">nscale Dokumenten-Konverter</h1>
      <p class="subtitle">Konvertieren Sie Ihre Dokumente zu durchsuchbarem Text für das nscale DMS</p>
    </header>

    <main class="main-content">
      <!-- Fortschrittsanzeige -->
      <ConversionProgress 
        v-if="isConverting" 
        :progress="conversionProgress" 
        :current-file="currentProcessingFile"
        :error="conversionError"
        @cancel="cancelConversion"
      />

      <!-- Upload-Bereich wenn keine Konvertierung läuft -->
      <div v-else class="conversion-panel">
        <div class="panel-section">
          <h2 class="section-title">1. Dokumente hochladen</h2>
          <FileUpload 
            :accepted-formats="acceptedFormats"
            :max-file-size="maxFileSize"
            :multiple="true"
            @files-selected="handleFilesSelected"
          />
          
          <div v-if="selectedFiles.length > 0" class="selected-files">
            <h3 class="subsection-title">Ausgewählte Dateien ({{ selectedFiles.length }})</h3>
            <FileList 
              :files="selectedFiles" 
              @remove-file="removeFile"
            />
          </div>
        </div>

        <div class="panel-section">
          <h2 class="section-title">2. Konvertierungsoptionen</h2>
          <ConversionOptions 
            v-model:options="conversionOptions"
            :disabled="selectedFiles.length === 0"
          />
        </div>

        <div class="panel-section">
          <h2 class="section-title">3. Konvertierung starten</h2>
          <div class="action-buttons">
            <button 
              class="btn-primary" 
              :disabled="selectedFiles.length === 0 || isConverting" 
              @click="startConversion"
            >
              <i class="fas fa-sync-alt"></i>
              Konvertierung starten
            </button>
            <button 
              class="btn-secondary" 
              :disabled="selectedFiles.length === 0" 
              @click="clearSelectedFiles"
            >
              <i class="fas fa-times"></i>
              Auswahl zurücksetzen
            </button>
          </div>
        </div>
      </div>

      <!-- Ergebnis-Bereich -->
      <div v-if="conversionResults.length > 0" class="results-panel">
        <h2 class="section-title">Konvertierungsergebnisse</h2>
        <ConversionResults 
          :results="conversionResults"
          @view-result="viewResult"
          @download-result="downloadResult"
        />
      </div>
    </main>

    <!-- Ergebnis-Vorschau-Modal -->
    <ResultPreviewModal 
      v-if="showPreviewModal"
      :preview-data="previewData"
      @close="closePreviewModal"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import FileUpload from '../components/FileUpload.vue';
import FileList from '../components/FileList.vue';
import ConversionOptions from '../components/ConversionOptions.vue';
import ConversionProgress from '../components/ConversionProgress.vue';
import ConversionResults from '../components/ConversionResults.vue';
import ResultPreviewModal from '../components/ResultPreviewModal.vue';
import { useDocConverterStore } from '@/stores/docConverterStore';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/composables/useToast';

// Stores
const docConverterStore = useDocConverterStore();
const authStore = useAuthStore();
const { showToast } = useToast();

// Zustände
const selectedFiles = ref([]);
const isConverting = ref(false);
const conversionProgress = ref(0);
const currentProcessingFile = ref('');
const conversionError = ref(null);
const conversionResults = ref([]);
const showPreviewModal = ref(false);
const previewData = ref(null);

// Konvertierungs-Optionen
const conversionOptions = ref({
  outputFormat: 'markdown',
  splitSections: true,
  extractImages: true,
  imageQuality: 'medium',
  metadataHandling: 'extract',
  advancedParsing: true
});

// Konstanten
const acceptedFormats = [
  '.pdf', '.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt', '.html', '.txt'
];
const maxFileSize = 50 * 1024 * 1024; // 50 MB

// Event-Handler
const handleFilesSelected = (files) => {
  selectedFiles.value = [...selectedFiles.value, ...files];
};

const removeFile = (fileToRemove) => {
  selectedFiles.value = selectedFiles.value.filter(file => file !== fileToRemove);
};

const clearSelectedFiles = () => {
  selectedFiles.value = [];
};

const startConversion = async () => {
  if (selectedFiles.value.length === 0) return;
  
  try {
    isConverting.value = true;
    conversionError.value = null;
    conversionProgress.value = 0;
    
    // Erstelle FormData für den Datei-Upload
    const formData = new FormData();
    selectedFiles.value.forEach(file => {
      formData.append('files', file);
    });
    
    // Füge Optionen hinzu
    Object.entries(conversionOptions.value).forEach(([key, value]) => {
      formData.append(key, value);
    });
    
    // Konvertierungsstart und Fortschrittsverfolgung
    const response = await docConverterStore.convertDocuments(
      formData, 
      (progress, filename) => {
        conversionProgress.value = progress;
        currentProcessingFile.value = filename;
      }
    );
    
    // Erfolgreiche Konvertierung
    conversionResults.value = [...conversionResults.value, ...response.results];
    showToast('Konvertierung erfolgreich abgeschlossen', 'success');
    
  } catch (error) {
    console.error('Konvertierungsfehler:', error);
    conversionError.value = error.message || 'Bei der Konvertierung ist ein Fehler aufgetreten.';
    showToast('Konvertierungsfehler: ' + conversionError.value, 'error');
  } finally {
    isConverting.value = false;
    currentProcessingFile.value = '';
  }
};

const cancelConversion = async () => {
  try {
    await docConverterStore.cancelConversion();
    isConverting.value = false;
    conversionProgress.value = 0;
    currentProcessingFile.value = '';
    showToast('Konvertierung abgebrochen', 'info');
  } catch (error) {
    console.error('Fehler beim Abbrechen der Konvertierung:', error);
  }
};

const viewResult = (result) => {
  previewData.value = result;
  showPreviewModal.value = true;
};

const downloadResult = (result) => {
  docConverterStore.downloadConvertedFile(result.id);
};

const closePreviewModal = () => {
  showPreviewModal.value = false;
  previewData.value = null;
};

// Lebenszyklus-Hooks
onMounted(async () => {
  // Prüfe, ob der Benutzer authentifiziert ist
  if (!authStore.isAuthenticated) {
    showToast('Bitte melden Sie sich an, um den Dokumentenkonverter zu nutzen', 'warning');
    return;
  }
  
  // Lade vorherige Konvertierungsergebnisse, falls vorhanden
  try {
    const previousResults = await docConverterStore.loadPreviousResults();
    if (previousResults && previousResults.length > 0) {
      conversionResults.value = previousResults;
    }
  } catch (error) {
    console.error('Fehler beim Laden vorheriger Ergebnisse:', error);
  }
});
</script>

<style scoped>
.doc-converter {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  color: var(--nscale-dark-gray);
}

.header {
  margin-bottom: 2rem;
  text-align: center;
}

.title {
  font-size: 2rem;
  font-weight: 600;
  color: var(--nscale-green);
  margin-bottom: 0.5rem;
}

.subtitle {
  font-size: 1.1rem;
  color: var(--nscale-dark-gray);
  opacity: 0.8;
}

.main-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.conversion-panel, .results-panel {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.panel-section {
  padding: 1.5rem;
  border-bottom: 1px solid var(--nscale-gray-medium);
}

.panel-section:last-child {
  border-bottom: none;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: var(--nscale-dark-gray);
}

.subsection-title {
  font-size: 1rem;
  font-weight: 500;
  margin: 1rem 0 0.5rem;
  color: var(--nscale-dark-gray);
}

.selected-files {
  margin-top: 1.5rem;
}

.action-buttons {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

.btn-primary {
  background-color: var(--nscale-green);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.75rem 1.5rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.1s;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-primary:hover {
  background-color: var(--nscale-green-dark);
  transform: translateY(-1px);
}

.btn-primary:active {
  transform: translateY(0);
}

.btn-primary:disabled {
  background-color: var(--nscale-gray-medium);
  cursor: not-allowed;
  transform: none;
}

.btn-secondary {
  background-color: white;
  color: var(--nscale-dark-gray);
  border: 1px solid var(--nscale-gray-medium);
  border-radius: 4px;
  padding: 0.75rem 1.5rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-secondary:hover {
  background-color: var(--nscale-gray);
  transform: translateY(-1px);
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* Dark Mode Anpassungen */
:global(.theme-dark) .doc-converter {
  color: #f0f0f0;
}

:global(.theme-dark) .conversion-panel,
:global(.theme-dark) .results-panel {
  background-color: #1e1e1e;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
}

:global(.theme-dark) .panel-section {
  border-bottom-color: #333;
}

:global(.theme-dark) .title {
  color: #00c060;
}

:global(.theme-dark) .subtitle,
:global(.theme-dark) .section-title,
:global(.theme-dark) .subsection-title {
  color: #f0f0f0;
}

:global(.theme-dark) .btn-primary {
  background-color: #00c060;
}

:global(.theme-dark) .btn-primary:hover {
  background-color: #00a550;
}

:global(.theme-dark) .btn-secondary {
  background-color: #333;
  color: #f0f0f0;
  border-color: #444;
}

:global(.theme-dark) .btn-secondary:hover {
  background-color: #444;
}

/* Kontrast-Modus Anpassungen */
:global(.theme-contrast) .doc-converter {
  color: #ffffff;
}

:global(.theme-contrast) .conversion-panel,
:global(.theme-contrast) .results-panel {
  background-color: #000000;
  border: 2px solid #ffeb3b;
  box-shadow: 0 4px 6px rgba(255, 235, 59, 0.2);
}

:global(.theme-contrast) .panel-section {
  border-bottom-color: #ffeb3b;
}

:global(.theme-contrast) .title,
:global(.theme-contrast) .subtitle,
:global(.theme-contrast) .section-title,
:global(.theme-contrast) .subsection-title {
  color: #ffeb3b;
}

:global(.theme-contrast) .btn-primary {
  background-color: #ffeb3b;
  color: #000000;
  font-weight: bold;
}

:global(.theme-contrast) .btn-primary:hover {
  background-color: #ffd600;
}

:global(.theme-contrast) .btn-secondary {
  background-color: #000000;
  color: #ffeb3b;
  border: 2px solid #ffeb3b;
}

:global(.theme-contrast) .btn-secondary:hover {
  background-color: #333300;
}
</style>