<template>
  <div 
    class="fallback-converter"
    :class="`fallback-converter--${status}`"
    role="alert"
    aria-live="polite"
  >
    <div class="fallback-converter__icon">
      <div v-if="status === 'maintenance'" class="maintenance-icon">
        <i class="fa fa-tools" aria-hidden="true"></i>
      </div>
      <div v-else-if="status === 'comingSoon'" class="coming-soon-icon">
        <i class="fa fa-rocket" aria-hidden="true"></i>
      </div>
      <div v-else-if="status === 'beta'" class="beta-icon">
        <i class="fa fa-flask" aria-hidden="true"></i>
      </div>
      <div v-else-if="status === 'unauthorized'" class="unauthorized-icon">
        <i class="fa fa-lock" aria-hidden="true"></i>
      </div>
      <div v-else class="disabled-icon">
        <i class="fa fa-ban" aria-hidden="true"></i>
      </div>
    </div>
    
    <div class="fallback-converter__content">
      <h3 class="fallback-converter__title">
        {{ getStatusTitle() }}
      </h3>
      
      <p class="fallback-converter__message">
        {{ messages[status] || defaultMessage }}
      </p>
      
      <div v-if="canRequestAccess" class="fallback-converter__actions">
        <button 
          @click="$emit('request-access')" 
          class="request-access-btn"
        >
          <i class="fa fa-unlock-alt" aria-hidden="true"></i>
          Zugriff anfordern
        </button>
      </div>
      
      <!-- Fallback-Funktionalität bei bestimmten Status anzeigen -->
      <div v-if="['beta', 'maintenance'].includes(status)" class="fallback-converter__simple-mode">
        <div class="fallback-header">
          <h4>Vereinfachter Dokumentenkonverter</h4>
          <div class="fallback-badge">Eingeschränkte Funktionalität</div>
        </div>
        
        <div class="upload-section">
          <label class="file-input-label">
            <span class="file-input-text">Datei auswählen</span>
            <input 
              type="file"
              @change="handleFileSelect"
              accept=".pdf,.docx,.xlsx,.pptx,.html,.htm,.txt"
              class="file-input"
            >
          </label>
          <span v-if="selectedFile" class="selected-file-name">
            {{ selectedFile.name }}
          </span>
        </div>
        
        <button 
          v-if="selectedFile"
          @click="uploadFile"
          :disabled="isUploading"
          class="upload-button"
        >
          <span v-if="isUploading">
            <span class="spinner-small"></span>
            Wird hochgeladen...
          </span>
          <span v-else>Datei konvertieren</span>
        </button>
        
        <div v-if="conversionResult" class="conversion-result">
          <h3>Konvertierungsergebnis</h3>
          
          <div class="result-info">
            <div class="result-info-item">
              <span class="result-label">Originaldatei:</span>
              <span>{{ conversionResult.originalName }}</span>
            </div>
            <div class="result-info-item">
              <span class="result-label">Format:</span>
              <span>{{ conversionResult.originalFormat.toUpperCase() }}</span>
            </div>
            <div class="result-info-item">
              <span class="result-label">Größe:</span>
              <span>{{ formatFileSize(conversionResult.size) }}</span>
            </div>
          </div>
          
          <div class="result-content">
            <h4>Extrahierter Text:</h4>
            <div class="text-preview">{{ truncatedContent }}</div>
            
            <button @click="downloadText" class="download-btn">
              Vollständigen Text herunterladen
            </button>
          </div>
        </div>
        
        <div v-if="error" class="error-message">
          <p>Ein Fehler ist aufgetreten: {{ error }}</p>
          <button @click="clearError" class="clear-error-btn">Schließen</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

type FeatureStatus = 'disabled' | 'unauthorized' | 'maintenance' | 'comingSoon' | 'beta';

interface Props {
  /** Der aktuelle Status des Features */
  status: FeatureStatus;
  
  /** Nachrichten für verschiedene Status */
  messages?: Record<FeatureStatus, string>;
  
  /** Gibt an, ob der Benutzer Zugriff anfordern kann */
  canRequestAccess?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  status: 'disabled',
  messages: () => ({
    disabled: 'Diese Funktion ist derzeit deaktiviert.',
    unauthorized: 'Sie haben keinen Zugriff auf diese Funktion.',
    maintenance: 'Diese Funktion befindet sich momentan in Wartung. Eine eingeschränkte Version steht zur Verfügung.',
    comingSoon: 'Diese Funktion wird bald verfügbar sein.',
    beta: 'Diese Funktion befindet sich in der Beta-Phase. Einige Funktionen könnten noch nicht vollständig verfügbar sein.'
  }),
  canRequestAccess: false
});

const emit = defineEmits<{
  (e: 'request-access'): void;
}>();

// Standardnachricht für unbekannte Status
const defaultMessage = 'Diese Funktion ist derzeit nicht verfügbar.';

// Lokaler Zustand für die Fallback-Funktionalität
const selectedFile = ref<File | null>(null);
const isUploading = ref(false);
const conversionResult = ref<any>(null);
const error = ref<string | null>(null);

/**
 * Gibt einen lesbaren Titel für den aktuellen Status zurück
 */
function getStatusTitle(): string {
  const titles: Record<FeatureStatus, string> = {
    disabled: 'Funktion deaktiviert',
    unauthorized: 'Zugriff nicht autorisiert',
    maintenance: 'Wartungsmodus',
    comingSoon: 'Demnächst verfügbar',
    beta: 'Beta-Version'
  };
  
  return titles[props.status] || 'Funktion nicht verfügbar';
}

/**
 * Verarbeitung der ausgewählten Datei
 */
function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  
  if (file) {
    selectedFile.value = file;
    error.value = null; // Fehler zurücksetzen
  }
}

/**
 * Hochladen und Konvertieren der Datei
 */
async function uploadFile() {
  if (!selectedFile.value) return;
  
  isUploading.value = true;
  error.value = null;
  
  try {
    // Einfache Implementierung ohne erweiterte Fehlerbehandlung
    const formData = new FormData();
    formData.append('file', selectedFile.value);
    
    const response = await fetch('/api/documents/upload', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Server-Fehler: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Vereinfachtes Ergebnisobjekt
    conversionResult.value = {
      id: data.documentId,
      originalName: selectedFile.value.name,
      originalFormat: getFileExtension(selectedFile.value.name),
      size: selectedFile.value.size,
      content: data.content || 'Kein Text extrahiert.',
      convertedAt: new Date()
    };
    
    // Zurücksetzen der Dateiauswahl
    selectedFile.value = null;
    // Element zurücksetzen
    const fileInput = document.querySelector('.file-input') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
    
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Fehler bei der Konvertierung';
    error.value = errorMessage;
    console.error('Konvertierungsfehler:', err);
  } finally {
    isUploading.value = false;
  }
}

/**
 * Herunterladen des extrahierten Texts
 */
function downloadText() {
  if (!conversionResult.value || !conversionResult.value.content) return;
  
  const blob = new Blob([conversionResult.value.content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  
  a.href = url;
  a.download = `${conversionResult.value.originalName}.txt`;
  a.click();
  
  URL.revokeObjectURL(url);
}

/**
 * Hilfsfunktionen
 */
function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

function clearError() {
  error.value = null;
}

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Berechnete Eigenschaften
const truncatedContent = computed(() => {
  if (!conversionResult.value || !conversionResult.value.content) return '';
  
  const content = conversionResult.value.content;
  const maxChars = 500;
  
  if (content.length <= maxChars) return content;
  
  return content.substring(0, maxChars) + '...';
});
</script>

<style scoped>
/* Hauptkomponente */
.fallback-converter {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
  border-radius: 8px;
  background-color: #f8f9fa;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  max-width: 600px;
  margin: 0 auto;
  width: 100%;
}

@media (min-width: 768px) {
  .fallback-converter {
    flex-direction: row;
    text-align: left;
    padding: 3rem;
  }
}

/* Icon-Styles */
.fallback-converter__icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem;
  flex-shrink: 0;
}

@media (min-width: 768px) {
  .fallback-converter__icon {
    margin-right: 2rem;
    margin-bottom: 0;
  }
}

.fallback-converter__icon i {
  font-size: 2.5rem;
}

.maintenance-icon {
  background-color: #fff3cd;
  color: #856404;
}

.coming-soon-icon {
  background-color: #cff4fc;
  color: #055160;
}

.beta-icon {
  background-color: #d1e7dd;
  color: #0f5132;
}

.unauthorized-icon {
  background-color: #f8d7da;
  color: #842029;
}

.disabled-icon {
  background-color: #e9ecef;
  color: #495057;
}

/* Content-Styles */
.fallback-converter__content {
  flex: 1;
}

.fallback-converter__title {
  font-size: 1.5rem;
  margin-top: 0;
  margin-bottom: 1rem;
  color: #343a40;
}

.fallback-converter__message {
  font-size: 1rem;
  color: #6c757d;
  margin-bottom: 1.5rem;
}

.fallback-converter__actions {
  margin-top: 1.5rem;
  margin-bottom: 1.5rem;
}

.request-access-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  background-color: #4a6cf7;
  color: white;
  border: none;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.request-access-btn:hover {
  background-color: #3a5be7;
}

/* Statusspezifische Stile */
.fallback-converter--maintenance {
  border-left: 5px solid #ffc107;
}

.fallback-converter--comingSoon {
  border-left: 5px solid #0dcaf0;
}

.fallback-converter--beta {
  border-left: 5px solid #198754;
}

.fallback-converter--unauthorized {
  border-left: 5px solid #dc3545;
}

.fallback-converter--disabled {
  border-left: 5px solid #6c757d;
}

/* Einfache Konverter-Funktionalität */
.fallback-converter__simple-mode {
  width: 100%;
  margin-top: 1.5rem;
  padding: 1rem;
  background-color: white;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.fallback-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.fallback-header h4 {
  margin: 0;
  font-size: 1.2rem;
  color: #343a40;
}

.fallback-badge {
  background-color: #ffcc80;
  color: #e65100;
  padding: 0.25rem 0.75rem;
  border-radius: 16px;
  font-size: 0.75rem;
  font-weight: 600;
}

.upload-section {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
}

.file-input-label {
  display: inline-block;
  cursor: pointer;
}

.file-input-text {
  display: inline-block;
  padding: 0.5rem 1rem;
  background-color: #e9ecef;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 0.9rem;
}

.file-input {
  display: none;
}

.selected-file-name {
  margin-left: 1rem;
  font-size: 0.9rem;
  color: #6c757d;
}

.upload-button {
  padding: 0.5rem 1rem;
  background-color: #4a6cf7;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-button:disabled {
  background-color: #8faaf7;
  cursor: not-allowed;
}

.spinner-small {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid white;
  border-top: 2px solid transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 0.5rem;
}

.conversion-result {
  margin-top: 2rem;
  padding: 1.5rem;
  background-color: #f8f9fa;
  border-radius: 6px;
}

.conversion-result h3 {
  margin: 0 0 1rem;
  font-size: 1.25rem;
}

.result-info {
  margin-bottom: 1.5rem;
}

.result-info-item {
  display: flex;
  margin-bottom: 0.5rem;
}

.result-label {
  width: 120px;
  font-weight: 600;
  color: #495057;
}

.result-content {
  background-color: white;
  padding: 1rem;
  border-radius: 4px;
  border: 1px solid #ced4da;
}

.result-content h4 {
  margin: 0 0 0.75rem;
  font-size: 1rem;
}

.text-preview {
  margin-bottom: 1rem;
  padding: 1rem;
  background-color: #f8f9fa;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.85rem;
  white-space: pre-wrap;
  max-height: 200px;
  overflow-y: auto;
}

.download-btn {
  padding: 0.5rem 1rem;
  background-color: #e9ecef;
  border: 1px solid #ced4da;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}

.error-message {
  margin-top: 1.5rem;
  padding: 1rem;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  color: #721c24;
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.clear-error-btn {
  background: none;
  border: none;
  color: inherit;
  font-size: 0.9rem;
  cursor: pointer;
  text-decoration: underline;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Responsive Anpassungen */
@media (max-width: 576px) {
  .fallback-converter__simple-mode {
    padding: 0.75rem;
  }
  
  .upload-section {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .selected-file-name {
    margin-left: 0;
    margin-top: 0.5rem;
  }
  
  .file-input-text {
    width: 100%;
    text-align: center;
  }
  
  .upload-button {
    width: 100%;
  }
}
</style>