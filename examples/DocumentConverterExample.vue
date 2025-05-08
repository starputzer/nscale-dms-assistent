<template>
  <div class="document-converter-example">
    <h2>Dokumentenkonverter-Beispiel mit Pinia Store</h2>
    
    <!-- Status-Anzeige -->
    <div class="converter-status">
      <p>Status: {{ statusText }}</p>
      <p v-if="store.documentCounts.total > 0">
        Dokumente: {{ store.documentCounts.total }} 
        ({{ store.documentCounts.success }} erfolgreich, 
        {{ store.documentCounts.error }} fehlgeschlagen)
      </p>
    </div>
    
    <!-- Fehleranzeige -->
    <div v-if="store.error" class="error-display">
      <h3>Fehler aufgetreten</h3>
      <p>{{ store.error.message }}</p>
      <button @click="store.clearError">Schließen</button>
    </div>
    
    <!-- Upload-Bereich -->
    <div v-if="store.currentView === 'upload'" class="upload-section">
      <h3>Dokument hochladen</h3>
      <input 
        type="file" 
        @change="handleFileSelected" 
        :accept="store.supportedFormats.map(f => '.' + f).join(',')"
        :disabled="store.isUploading"
      >
      <button 
        @click="startConversion" 
        :disabled="!selectedFile || store.isUploading"
      >
        Dokument konvertieren
      </button>
      
      <div v-if="store.isUploading" class="progress-bar">
        <div class="progress" :style="{ width: `${uploadProgress}%` }"></div>
        <span>{{ uploadProgress }}%</span>
      </div>
    </div>
    
    <!-- Konvertierungs-Bereich -->
    <div v-if="store.currentView === 'conversion'" class="conversion-section">
      <h3>Konvertierung läuft...</h3>
      <div class="progress-bar">
        <div class="progress" :style="{ width: `${store.conversionProgress}%` }"></div>
        <span>{{ store.conversionProgress }}%</span>
      </div>
      <p>{{ store.conversionStep }}</p>
      <p v-if="store.estimatedTimeRemaining">
        Verbleibende Zeit: {{ formatTime(store.estimatedTimeRemaining) }}
      </p>
      <button @click="cancelCurrentConversion" :disabled="!store.isConverting">
        Abbrechen
      </button>
    </div>
    
    <!-- Ergebnis-Bereich -->
    <div v-if="store.currentView === 'results' && store.selectedDocument" class="results-section">
      <h3>Konvertierungsergebnis</h3>
      <div class="document-info">
        <p><strong>Name:</strong> {{ store.selectedDocument.originalName }}</p>
        <p><strong>Format:</strong> {{ store.selectedDocument.originalFormat.toUpperCase() }}</p>
        <p><strong>Größe:</strong> {{ formatFileSize(store.selectedDocument.size) }}</p>
        <p><strong>Hochgeladen:</strong> {{ formatDate(store.selectedDocument.uploadedAt) }}</p>
        <p><strong>Konvertiert:</strong> {{ formatDate(store.selectedDocument.convertedAt) }}</p>
      </div>
      
      <div class="document-actions">
        <button @click="viewDocumentContent">Inhalt anzeigen</button>
        <button @click="downloadDocument">Herunterladen</button>
        <button @click="deleteSelectedDocument" class="delete-button">Löschen</button>
        <button @click="resetConverter">Neue Konvertierung</button>
      </div>
    </div>
    
    <!-- Dokument-Liste -->
    <div v-if="store.hasDocuments" class="document-list">
      <h3>Konvertierte Dokumente</h3>
      
      <!-- Filter-Optionen -->
      <div class="document-filters">
        <select v-model="currentFilter" @change="applyFilter">
          <option value="">Alle Dokumente</option>
          <option v-for="format in store.supportedFormats" :key="format" :value="format">
            {{ format.toUpperCase() }}
          </option>
          <option value="pending">Ausstehend</option>
          <option value="processing">In Bearbeitung</option>
          <option value="success">Erfolgreich</option>
          <option value="error">Fehlgeschlagen</option>
        </select>
      </div>
      
      <!-- Dokument-Tabelle -->
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Format</th>
            <th>Größe</th>
            <th>Status</th>
            <th>Aktionen</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="doc in filteredDocuments" :key="doc.id" 
              :class="{ 'selected': doc.id === store.selectedDocumentId }">
            <td>{{ doc.originalName }}</td>
            <td>{{ doc.originalFormat.toUpperCase() }}</td>
            <td>{{ formatFileSize(doc.size) }}</td>
            <td>
              <span :class="'status-' + doc.status">
                {{ getStatusText(doc.status) }}
              </span>
            </td>
            <td>
              <button @click="store.selectDocument(doc.id)">
                Auswählen
              </button>
              <button @click="promptDeleteDocument(doc.id)" class="delete-button">
                Löschen
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useDocumentConverterStore } from '@/stores/documentConverter';

// Store initialisieren
const store = useDocumentConverterStore();

// Komponenten-Zustand
const selectedFile = ref<File | null>(null);
const uploadProgress = ref(0);
const currentFilter = ref('');
const filteredDocuments = ref(store.convertedDocuments);

// Status-Text
const statusText = computed(() => {
  switch (store.conversionStatus) {
    case 'idle': return 'Bereit';
    case 'uploading': return 'Dokument wird hochgeladen...';
    case 'converting': return 'Dokument wird konvertiert...';
    case 'completed': return 'Konvertierung abgeschlossen';
    case 'error': return 'Fehler aufgetreten';
    default: return 'Unbekannter Status';
  }
});

// Funktionen
/**
 * Behandelt die Dateiauswahl durch den Benutzer
 */
function handleFileSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    selectedFile.value = input.files[0];
  }
}

/**
 * Startet den Konvertierungsprozess für die ausgewählte Datei
 */
async function startConversion() {
  if (!selectedFile.value) return;
  
  try {
    // Datei hochladen
    const documentId = await store.uploadDocument(selectedFile.value);
    
    if (documentId) {
      // Konvertierung starten
      await store.convertDocument(documentId);
    }
    
    // Auswahl zurücksetzen
    selectedFile.value = null;
  } catch (error) {
    console.error('Fehler bei der Konvertierung:', error);
  }
}

/**
 * Bricht die aktuelle Konvertierung ab
 */
async function cancelCurrentConversion() {
  if (store.isConverting && store.selectedDocumentId) {
    await store.cancelConversion(store.selectedDocumentId);
  }
}

/**
 * Zeigt den Inhalt des ausgewählten Dokuments an
 */
async function viewDocumentContent() {
  if (!store.selectedDocument) return;
  
  try {
    // Hier würde man typischerweise das Dokument anzeigen
    // z.B. in einem Modal-Dialog oder einer separaten Ansicht
    console.log('Dokument anzeigen:', store.selectedDocument.id);
  } catch (error) {
    console.error('Fehler beim Anzeigen des Dokuments:', error);
  }
}

/**
 * Lädt das ausgewählte Dokument herunter
 */
async function downloadDocument() {
  if (!store.selectedDocument) return;
  
  try {
    await DocumentConverterService.downloadDocument(store.selectedDocument.id);
  } catch (error) {
    console.error('Fehler beim Herunterladen des Dokuments:', error);
  }
}

/**
 * Fordert Bestätigung an und löscht das ausgewählte Dokument
 */
async function deleteSelectedDocument() {
  if (!store.selectedDocument) return;
  
  if (confirm('Sind Sie sicher, dass Sie dieses Dokument löschen möchten?')) {
    await store.deleteDocument(store.selectedDocument.id);
  }
}

/**
 * Fordert Bestätigung an und löscht ein bestimmtes Dokument
 */
async function promptDeleteDocument(documentId: string) {
  if (confirm('Sind Sie sicher, dass Sie dieses Dokument löschen möchten?')) {
    await store.deleteDocument(documentId);
  }
}

/**
 * Setzt die Konverteransicht zurück
 */
function resetConverter() {
  store.setView('upload');
  store.selectDocument(null);
}

/**
 * Wendet den aktuellen Filter auf die Dokumente an
 */
function applyFilter() {
  filteredDocuments.value = store.filteredDocuments(currentFilter.value);
}

/**
 * Formatiert eine Dateigröße in lesbarer Form
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Formatiert ein Datum in lesbarer Form
 */
function formatDate(date?: Date): string {
  if (!date) return '-';
  return new Date(date).toLocaleString('de-DE');
}

/**
 * Formatiert eine Zeitangabe in Sekunden als mm:ss
 */
function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Gibt den Status-Text für einen Status-Code zurück
 */
function getStatusText(status: string): string {
  switch (status) {
    case 'pending': return 'Ausstehend';
    case 'processing': return 'In Bearbeitung';
    case 'success': return 'Erfolgreich';
    case 'error': return 'Fehlgeschlagen';
    default: return status;
  }
}

// Beim Mounten den Store initialisieren
onMounted(async () => {
  await store.initialize();
  applyFilter();
});

import DocumentConverterService from '@/services/api/DocumentConverterService';
</script>

<style scoped>
.document-converter-example {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  max-width: 900px;
  margin: 0 auto;
  padding: 1.5rem;
}

h2, h3 {
  color: #0d7a40;
}

.error-display {
  background-color: #fff5f5;
  border: 1px solid #feb2b2;
  padding: 1rem;
  margin: 1rem 0;
  border-radius: 4px;
}

.error-display h3 {
  color: #e53e3e;
  margin-top: 0;
}

.progress-bar {
  height: 20px;
  background-color: #e2e8f0;
  border-radius: 4px;
  margin: 1rem 0;
  position: relative;
  overflow: hidden;
}

.progress {
  height: 100%;
  background-color: #0d7a40;
  transition: width 0.3s ease;
}

.progress-bar span {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #1a202c;
  font-size: 0.8rem;
}

button {
  background-color: #0d7a40;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  margin-right: 0.5rem;
  font-size: 0.9rem;
}

button:hover {
  background-color: #0a6032;
}

button:disabled {
  background-color: #a0aec0;
  cursor: not-allowed;
}

.delete-button {
  background-color: #e53e3e;
}

.delete-button:hover {
  background-color: #c53030;
}

.document-list {
  margin-top: 2rem;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
}

th, td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid #e2e8f0;
}

th {
  background-color: #f7fafc;
  font-weight: 600;
}

tr.selected {
  background-color: #ebf8ff;
}

tr:hover {
  background-color: #f7fafc;
}

.status-pending {
  color: #718096;
}

.status-processing {
  color: #3182ce;
}

.status-success {
  color: #38a169;
}

.status-error {
  color: #e53e3e;
}

.document-actions, .document-filters {
  margin: 1rem 0;
}
</style>