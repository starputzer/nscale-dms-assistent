<template>
  <div class="file-upload-example">
    <h1>Dokumentenkonverter</h1>
    
    <div class="settings-panel">
      <h2>Upload-Einstellungen</h2>
      <div class="settings-grid">
        <div class="setting">
          <label for="max-size">Maximale Dateigröße:</label>
          <select id="max-size" v-model="maxFileSizeMB">
            <option value="10">10 MB</option>
            <option value="20">20 MB</option>
            <option value="50">50 MB</option>
            <option value="100">100 MB</option>
          </select>
        </div>
        
        <div class="setting">
          <label for="max-files">Maximale Anzahl Dateien:</label>
          <input 
            type="number" 
            id="max-files" 
            v-model.number="maxFiles" 
            min="1" 
            max="20"
          >
        </div>
      </div>
      
      <div class="setting file-types">
        <label>Erlaubte Dateitypen:</label>
        <div class="checkbox-group">
          <label v-for="ext in availableExtensions" :key="ext">
            <input 
              type="checkbox" 
              :value="ext" 
              v-model="allowedExtensions"
            >
            {{ ext.toUpperCase() }}
          </label>
        </div>
      </div>
    </div>
    
    <!-- Neue FileUpload Komponente -->
    <FileUpload
      :is-uploading="isUploading"
      :upload-progress="uploadProgress"
      :max-file-size="maxFileSizeBytes"
      :allowed-extensions="allowedExtensions"
      :max-files="maxFiles"
      @upload="handleUpload"
      @cancel="handleCancel"
      @file-added="handleFileAdded"
      @file-removed="handleFileRemoved"
      @validation-error="handleValidationError"
    />
    
    <!-- Upload-Status -->
    <div v-if="isUploading" class="upload-status">
      <h3>Upload läuft...</h3>
      <p>{{ currentFile ? `Verarbeite: ${currentFile.name}` : 'Initialisiere...' }}</p>
      <p>{{ uploadProgress }}% abgeschlossen</p>
      <button @click="cancelUpload" class="cancel-button">Upload abbrechen</button>
    </div>
    
    <!-- Ergebnis-Anzeige für hochgeladene Dateien -->
    <div v-if="uploadedFiles.length > 0" class="upload-results">
      <h3>Hochgeladene Dateien</h3>
      <ul class="file-list">
        <li v-for="file in uploadedFiles" :key="file.id" class="file-item">
          <div class="file-info">
            <i :class="getFileIcon(file.file)" class="file-icon"></i>
            <div class="file-details">
              <strong>{{ file.file.name }}</strong>
              <span class="file-meta">
                {{ formatFileSize(file.file.size) }} | 
                Hochgeladen am {{ formatDate(file.uploadedAt) }}
              </span>
            </div>
          </div>
          <div class="file-status" :class="file.status">
            {{ getStatusText(file.status) }}
          </div>
        </li>
      </ul>
      
      <button @click="clearResults" class="clear-button">Liste leeren</button>
    </div>
    
    <!-- Event-Log -->
    <div class="event-log">
      <h3>Event-Log</h3>
      <div class="log-container">
        <div v-for="(log, index) in eventLogs" :key="index" class="log-entry" :class="log.type">
          <span class="log-time">{{ formatTime(log.time) }}</span>
          <span class="log-message">{{ log.message }}</span>
        </div>
      </div>
      <button @click="clearLog" class="clear-log-button">Log leeren</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import FileUpload from '@/components/admin/document-converter/FileUploadV2.vue';

// Zustand
const isUploading = ref(false);
const uploadProgress = ref(0);
const maxFileSizeMB = ref(20);
const maxFiles = ref(5);
const currentFile = ref<File | null>(null);
const uploadedFiles = ref<Array<{
  id: string;
  file: File;
  uploadedAt: Date;
  status: 'pending' | 'processing' | 'success' | 'error';
  error?: string;
}>>([]);
const eventLogs = ref<Array<{
  time: Date;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}>>([]);

// Verfügbare Dateitypen
const availableExtensions = [
  'pdf', 'docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt', 'txt', 'html', 'htm', 'csv'
];

// Ausgewählte Dateitypen
const allowedExtensions = ref(['pdf', 'docx', 'xlsx', 'pptx', 'html', 'txt']);

// Berechnete Eigenschaften
const maxFileSizeBytes = computed(() => maxFileSizeMB.value * 1024 * 1024);

// Simulierter Upload-Prozess
let uploadTimer: number | null = null;

// Dateien hochladen
async function handleUpload(files: File[]) {
  isUploading.value = true;
  uploadProgress.value = 0;
  
  // Log-Eintrag
  addLogEntry(`Upload von ${files.length} Dateien gestartet`, 'info');
  
  // Wir simulieren den Upload-Prozess für jede Datei
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    currentFile.value = file;
    
    // Neue hochgeladene Datei zur Liste hinzufügen
    const fileId = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    uploadedFiles.value.push({
      id: fileId,
      file,
      uploadedAt: new Date(),
      status: 'processing'
    });
    
    // Log-Eintrag
    addLogEntry(`Verarbeite Datei ${i+1}/${files.length}: ${file.name}`, 'info');
    
    // Simuliere den Upload-Prozess mit einer Verzögerung basierend auf der Dateigröße
    const uploadDuration = Math.min(5000, 1000 + file.size / 100000);
    const fileIndex = uploadedFiles.value.length - 1;
    
    await simulateFileUpload(uploadDuration, fileIndex);
    
    // Upload dieser Datei abgeschlossen
    addLogEntry(`Datei ${file.name} erfolgreich verarbeitet`, 'success');
  }
  
  // Gesamten Upload-Prozess abschließen
  uploadProgress.value = 100;
  isUploading.value = false;
  currentFile.value = null;
  
  // Log-Eintrag
  addLogEntry(`Upload abgeschlossen: ${files.length} Dateien verarbeitet`, 'success');
}

// Simuliere den Upload-Prozess für eine einzelne Datei
function simulateFileUpload(duration: number, fileIndex: number): Promise<void> {
  return new Promise(resolve => {
    let startTime = Date.now();
    let progress = 0;
    
    // Zufällig bestimmen, ob der Upload erfolgreich sein wird (90% Erfolgsrate)
    const willSucceed = Math.random() < 0.9;
    
    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      progress = Math.min(100, Math.round((elapsed / duration) * 100));
      uploadProgress.value = progress;
      
      if (progress < 100) {
        uploadTimer = window.setTimeout(updateProgress, 100);
      } else {
        if (willSucceed) {
          // Erfolgreicher Upload
          if (fileIndex < uploadedFiles.value.length) {
            uploadedFiles.value[fileIndex].status = 'success';
          }
        } else {
          // Fehlgeschlagener Upload
          if (fileIndex < uploadedFiles.value.length) {
            uploadedFiles.value[fileIndex].status = 'error';
            uploadedFiles.value[fileIndex].error = 'Fehler bei der Verarbeitung';
            addLogEntry(`Fehler beim Verarbeiten von ${uploadedFiles.value[fileIndex].file.name}`, 'error');
          }
        }
        resolve();
      }
    };
    
    // Starte den simulierten Upload
    updateProgress();
  });
}

// Upload abbrechen
function handleCancel() {
  addLogEntry('Upload-Vorgang abgebrochen', 'warning');
}

// Laufenden Upload abbrechen
function cancelUpload() {
  if (uploadTimer) {
    clearTimeout(uploadTimer);
    uploadTimer = null;
  }
  
  isUploading.value = false;
  uploadProgress.value = 0;
  currentFile.value = null;
  
  // Setze alle "processing" Dateien auf "error"
  uploadedFiles.value.forEach(file => {
    if (file.status === 'processing') {
      file.status = 'error';
      file.error = 'Upload abgebrochen';
    }
  });
  
  addLogEntry('Upload abgebrochen', 'warning');
}

// Datei hinzugefügt
function handleFileAdded(file: File) {
  addLogEntry(`Datei hinzugefügt: ${file.name} (${formatFileSize(file.size)})`, 'info');
}

// Datei entfernt
function handleFileRemoved(file: File) {
  addLogEntry(`Datei entfernt: ${file.name}`, 'info');
}

// Validierungsfehler
function handleValidationError(error: string, file: File) {
  addLogEntry(`Validierungsfehler für ${file.name}: ${error}`, 'error');
}

// Ergebnisliste leeren
function clearResults() {
  uploadedFiles.value = [];
  addLogEntry('Ergebnisliste geleert', 'info');
}

// Log-Einträge hinzufügen
function addLogEntry(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') {
  eventLogs.value.unshift({
    time: new Date(),
    message,
    type
  });
  
  // Begrenze die Anzahl der Log-Einträge
  if (eventLogs.value.length > 100) {
    eventLogs.value = eventLogs.value.slice(0, 100);
  }
}

// Log leeren
function clearLog() {
  eventLogs.value = [];
}

// Hilfsfunktionen
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(date: Date): string {
  return date.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function getStatusText(status: string): string {
  switch (status) {
    case 'pending': return 'Ausstehend';
    case 'processing': return 'Wird verarbeitet...';
    case 'success': return 'Erfolgreich';
    case 'error': return 'Fehler';
    default: return status;
  }
}

// Icon für Dateityp ermitteln
function getFileIcon(file: File): string {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  
  const fileIcons: Record<string, string> = {
    'pdf': 'fa fa-file-pdf',
    'docx': 'fa fa-file-word',
    'doc': 'fa fa-file-word',
    'xlsx': 'fa fa-file-excel',
    'xls': 'fa fa-file-excel',
    'pptx': 'fa fa-file-powerpoint',
    'ppt': 'fa fa-file-powerpoint',
    'html': 'fa fa-file-code',
    'htm': 'fa fa-file-code',
    'txt': 'fa fa-file-alt'
  };
  
  return fileIcons[extension] || 'fa fa-file';
}
</script>

<style scoped>
.file-upload-example {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
}

h1, h2, h3 {
  color: #0d7a40;
}

h1 {
  margin-bottom: 1.5rem;
  text-align: center;
}

.settings-panel {
  background-color: #f9f9f9;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.settings-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
}

.setting {
  margin-bottom: 1rem;
}

.setting label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.setting select,
.setting input[type="number"] {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  font-weight: normal;
  background-color: #fff;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  border: 1px solid #eee;
}

.checkbox-group input {
  margin-right: 0.5rem;
}

.upload-status {
  background-color: #e7f5ff;
  border-radius: 8px;
  padding: 1.5rem;
  margin: 2rem 0;
  text-align: center;
}

.upload-results {
  margin: 2rem 0;
}

.file-list {
  list-style: none;
  padding: 0;
  margin: 1rem 0;
}

.file-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background-color: white;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 0.5rem;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.file-icon {
  font-size: 1.5rem;
  color: #6c757d;
}

.file-details {
  display: flex;
  flex-direction: column;
}

.file-meta {
  font-size: 0.85rem;
  color: #6c757d;
}

.file-status {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 500;
}

.file-status.pending {
  background-color: #f7fafc;
  color: #718096;
}

.file-status.processing {
  background-color: #ebf8ff;
  color: #3182ce;
}

.file-status.success {
  background-color: #f0fff4;
  color: #38a169;
}

.file-status.error {
  background-color: #fff5f5;
  color: #e53e3e;
}

.clear-button,
.clear-log-button,
.cancel-button {
  background-color: #e9ecef;
  border: 1px solid #ced4da;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  margin-top: 1rem;
  cursor: pointer;
  font-size: 0.9rem;
}

.cancel-button {
  background-color: #fff5f5;
  color: #e53e3e;
  border-color: #fab0b0;
}

.event-log {
  margin-top: 2rem;
  padding: 1.5rem;
  background-color: #2d3748;
  border-radius: 8px;
  color: #e2e8f0;
}

.log-container {
  background-color: #1a202c;
  border-radius: 4px;
  padding: 1rem;
  height: 200px;
  overflow-y: auto;
  font-family: 'Courier New', monospace;
  margin: 1rem 0;
}

.log-entry {
  display: flex;
  margin-bottom: 0.5rem;
  font-size: 0.85rem;
  line-height: 1.5;
}

.log-time {
  color: #a0aec0;
  margin-right: 0.75rem;
  flex-shrink: 0;
}

.log-entry.info .log-message {
  color: #90cdf4;
}

.log-entry.success .log-message {
  color: #9ae6b4;
}

.log-entry.error .log-message {
  color: #feb2b2;
}

.log-entry.warning .log-message {
  color: #fbd38d;
}

/* Responsive Anpassungen */
@media (max-width: 768px) {
  .file-upload-example {
    padding: 1rem;
  }
  
  .settings-grid {
    grid-template-columns: 1fr;
  }
  
  .file-item {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .file-status {
    margin-top: 0.5rem;
    align-self: flex-start;
  }
}
</style>