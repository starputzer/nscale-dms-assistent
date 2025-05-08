<template>
  <div class="fallback-converter">
    <div class="fallback-header">
      <h2>Dokumentenkonverter (Vereinfachte Version)</h2>
      <div class="fallback-badge">Fallback-Modus</div>
    </div>
    
    <p class="fallback-notice">
      Diese vereinfachte Version des Dokumentenkonverters wird angezeigt, da die Hauptversion nicht geladen werden konnte.
      Einige erweiterte Funktionen sind möglicherweise nicht verfügbar.
    </p>
    
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
</template>

<script setup>
import { ref, computed } from 'vue';

// Lokaler Zustand
const selectedFile = ref(null);
const isUploading = ref(false);
const conversionResult = ref(null);
const error = ref(null);

// Verarbeitung der ausgewählten Datei
function handleFileSelect(event) {
  const file = event.target.files[0];
  if (file) {
    selectedFile.value = file;
    error.value = null; // Fehler zurücksetzen
  }
}

// Hochladen und Konvertieren der Datei
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
    // Element zurücksetzen (da Vue keinen direkten Zugriff auf input[type=file] Value erlaubt)
    event.target.value = null;
    
  } catch (err) {
    error.value = err.message || 'Fehler bei der Konvertierung';
    console.error('Konvertierungsfehler:', err);
  } finally {
    isUploading.value = false;
  }
}

// Herunterladen des extrahierten Texts
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

// Hilfsfunktionen
function getFileExtension(filename) {
  return filename.split('.').pop().toLowerCase();
}

function clearError() {
  error.value = null;
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
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
.fallback-converter {
  padding: 1.5rem;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.fallback-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.fallback-header h2 {
  margin: 0;
  font-size: 1.5rem;
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

.fallback-notice {
  background-color: #fff3cd;
  border: 1px solid #ffeeba;
  color: #856404;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1.5rem;
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
</style>