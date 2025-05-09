<template>
  <div class="document-converter">
    <!-- Upload View -->
    <div v-if="currentView === 'upload'" class="document-converter__upload">
      <FileUploadV2 
        :is-uploading="store.isUploading" 
        :supported-formats="store.supportedFormats"
        @upload="handleFileUpload"
      />
    </div>
    
    <!-- Conversion View -->
    <div v-else-if="currentView === 'conversion'" class="document-converter__conversion">
      <ConversionProgressV2
        :progress="store.conversionProgress"
        :current-step="store.conversionStep"
        :estimated-time-remaining="store.estimatedTimeRemaining"
        :document-name="currentDocument?.originalName"
        :is-paused="conversionPaused"
        :can-pause="true"
        :can-cancel="true"
        :logs="conversionLogs"
        :show-debug-button="isAdmin"
        @cancel="cancelConversion"
        @pause="pauseConversion"
        @resume="resumeConversion"
        @error="handleConversionError"
      />
    </div>
    
    <!-- Results View -->
    <div v-else-if="currentView === 'results'" class="document-converter__results">
      <DocumentPreview
        :document="currentDocument"
        @close="closePreview"
        @download="downloadDocument"
      />
      
      <div class="document-converter__actions">
        <button 
          @click="backToList" 
          class="document-converter__back-btn"
        >
          <i class="fa fa-arrow-left"></i>
          {{ $t('documentConverter.backToList') }}
        </button>
      </div>
    </div>
    
    <!-- Document List View -->
    <div v-else-if="currentView === 'list'" class="document-converter__list">
      <DocumentList 
        :documents="store.convertedDocuments"
        :selected-document="store.selectedDocument"
        :loading="listLoading"
        :supported-formats="store.supportedFormats"
        @select="selectDocument"
        @view="viewDocument"
        @download="downloadDocument"
        @delete="confirmDeleteDocument"
      />
      
      <div class="document-converter__actions">
        <button 
          @click="goToUpload" 
          class="document-converter__upload-new-btn"
        >
          <i class="fa fa-upload"></i>
          {{ $t('documentConverter.uploadNew') }}
        </button>
      </div>
    </div>
    
    <!-- Error Display -->
    <ErrorDisplay
      v-if="store.error"
      :error="store.error"
      :retry-enabled="true"
      @retry="retryOperation"
      @close="clearError"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import FileUploadV2 from './FileUploadV2.vue';
import ConversionProgressV2 from './ConversionProgressV2.vue';
import DocumentList from './DocumentList.vue';
import DocumentPreview from './DocumentPreview.vue';
import ErrorDisplay from './ErrorDisplay.vue';
import { useDocumentConverterStore, ConverterView } from '@/stores/documentConverter';
import { useDialog } from '@/composables/useDialog';
import { useToast } from '@/composables/useToast';
import { useAuth } from '@/composables/useAuth';

// Definiere Typen für den Konvertierungslog
interface ConversionLog {
  timestamp: Date;
  level: 'info' | 'warning' | 'error';
  message: string;
}

// Initialisiere Services
const store = useDocumentConverterStore();
const dialog = useDialog();
const toast = useToast();
const auth = useAuth();

// Reaktive Zustandsvariablen
const listLoading = ref(false);
const conversionPaused = ref(false);
const conversionLogs = ref<ConversionLog[]>([]);
const convertingDocumentId = ref<string | null>(null);

// Berechne aktuelle Ansicht aus dem Store
const currentView = computed(() => store.currentView);

// Berechne aktuelles Dokument
const currentDocument = computed(() => store.selectedDocument);

// Berechne Admin-Rolle
const isAdmin = computed(() => {
  return auth?.user?.roles?.includes('admin') || true; // Fallback für Entwicklung
});

// Methoden

/**
 * Initialisiert den Dokumentenkonverter
 */
async function initialize() {
  try {
    listLoading.value = true;
    await store.initialize();
    addConversionLog('info', 'Dokumentenkonverter initialisiert');
  } catch (error) {
    addConversionLog('error', `Fehler bei der Initialisierung: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    listLoading.value = false;
  }
}

/**
 * Behandelt den Upload einer Datei
 */
async function handleFileUpload(files: File[]) {
  if (!files.length) return;
  
  try {
    // Für jede Datei einen Upload starten
    for (const file of files) {
      addConversionLog('info', `Upload gestartet: ${file.name}`);
      const documentId = await store.uploadDocument(file);
      
      if (documentId) {
        addConversionLog('info', `Upload abgeschlossen: ${file.name}`);
        
        // Automatisch Konvertierung starten
        await startConversion(documentId);
      }
    }
  } catch (error) {
    addConversionLog('error', `Upload fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Startet die Konvertierung eines Dokuments
 */
async function startConversion(documentId: string) {
  try {
    conversionPaused.value = false;
    convertingDocumentId.value = documentId;
    addConversionLog('info', 'Konvertierung gestartet');
    
    // Aktuelle Konversionseinstellungen verwenden
    const success = await store.convertDocument(documentId);
    
    if (success) {
      addConversionLog('info', 'Konvertierung erfolgreich abgeschlossen');
      toast.success($t('documentConverter.conversionSuccess'));
    } else {
      addConversionLog('error', 'Konvertierung fehlgeschlagen');
    }
  } catch (error) {
    addConversionLog('error', `Konvertierungsfehler: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    convertingDocumentId.value = null;
  }
}

/**
 * Bricht die aktuelle Konvertierung ab
 */
async function cancelConversion() {
  if (!convertingDocumentId.value) return;
  
  const confirmed = await dialog.confirm({
    title: $t('documentConverter.cancelConfirmTitle'),
    message: $t('documentConverter.cancelConfirmMessage'),
    confirmButtonText: $t('documentConverter.confirm'),
    cancelButtonText: $t('documentConverter.cancel')
  });
  
  if (confirmed) {
    try {
      await store.cancelConversion(convertingDocumentId.value);
      addConversionLog('info', 'Konvertierung abgebrochen');
      toast.info($t('documentConverter.conversionCancelled'));
    } catch (error) {
      addConversionLog('error', `Fehler beim Abbrechen: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Pausiert die aktuelle Konvertierung
 */
function pauseConversion() {
  conversionPaused.value = true;
  addConversionLog('info', 'Konvertierung pausiert');
  // Hier würde in einer echten Implementierung die API aufgerufen werden, um die Konvertierung zu pausieren
}

/**
 * Setzt die pausierte Konvertierung fort
 */
function resumeConversion() {
  conversionPaused.value = false;
  addConversionLog('info', 'Konvertierung fortgesetzt');
  // Hier würde in einer echten Implementierung die API aufgerufen werden, um die Konvertierung fortzusetzen
}

/**
 * Behandelt einen Fehler während der Konvertierung
 */
function handleConversionError(error: Error) {
  addConversionLog('error', `Konvertierungsfehler: ${error.message}`);
  store.setError('CONVERSION_ERROR', error);
}

/**
 * Löscht einen Fehler und setzt den Zustand zurück
 */
function clearError() {
  store.clearError();
}

/**
 * Versucht die fehlgeschlagene Operation erneut
 */
function retryOperation() {
  if (!store.error) return;
  
  const errorCode = store.error.code;
  clearError();
  
  // Je nach Fehlercode unterschiedliche Aktionen durchführen
  if (errorCode === 'INITIALIZATION_FAILED') {
    initialize();
  } else if (errorCode === 'UPLOAD_FAILED') {
    goToUpload();
  } else if (errorCode === 'CONVERSION_FAILED' && convertingDocumentId.value) {
    startConversion(convertingDocumentId.value);
  } else if (errorCode === 'REFRESH_FAILED') {
    store.refreshDocuments();
  }
}

/**
 * Lädt ein konvertiertes Dokument herunter
 */
function downloadDocument(documentId: string) {
  // Hier würde in einer echten Implementierung ein Download initiiert werden
  toast.info($t('documentConverter.downloadStarted'));
  addConversionLog('info', `Download gestartet: ${documentId}`);
}

/**
 * Zeigt eine Dokumentenvorschau an
 */
function viewDocument(documentId: string) {
  store.selectDocument(documentId);
  store.setView('results');
}

/**
 * Schließt die Dokumentenvorschau
 */
function closePreview() {
  store.setView('list');
}

/**
 * Wählt ein Dokument aus
 */
function selectDocument(documentId: string) {
  store.selectDocument(documentId);
  
  // Wenn ein Dokument ausgewählt wurde, zur Vorschau wechseln
  if (documentId) {
    store.setView('results');
  }
}

/**
 * Zeigt einen Dialog zur Bestätigung des Löschens an
 */
async function confirmDeleteDocument(documentId: string) {
  const document = store.convertedDocuments.find(doc => doc.id === documentId);
  if (!document) return;
  
  const confirmed = await dialog.confirm({
    title: $t('documentConverter.deleteConfirmTitle'),
    message: $t('documentConverter.deleteConfirmMessage', { name: document.originalName }),
    type: 'warning',
    confirmButtonText: $t('documentConverter.delete'),
    cancelButtonText: $t('documentConverter.cancel')
  });
  
  if (confirmed) {
    try {
      const success = await store.deleteDocument(documentId);
      if (success) {
        toast.success($t('documentConverter.deleteSuccess'));
        // Wenn das aktuelle Dokument gelöscht wurde, zur Listenansicht wechseln
        if (store.selectedDocumentId === documentId) {
          store.setView('list');
        }
      }
    } catch (error) {
      toast.error($t('documentConverter.deleteError'));
    }
  }
}

/**
 * Wechselt zur Listenansicht
 */
function backToList() {
  store.setView('list');
}

/**
 * Wechselt zur Upload-Ansicht
 */
function goToUpload() {
  store.setView('upload');
}

/**
 * Fügt einen Eintrag zum Konvertierungslog hinzu
 */
function addConversionLog(level: 'info' | 'warning' | 'error', message: string) {
  conversionLogs.value.push({
    timestamp: new Date(),
    level,
    message
  });
  
  // Maximum von 100 Logeinträgen beibehalten
  if (conversionLogs.value.length > 100) {
    conversionLogs.value = conversionLogs.value.slice(-100);
  }
}

/**
 * Übersetzungsfunktion (Fallback)
 */
function $t(key: string, params?: Record<string, any>) {
  // Einfacher Fallback für Übersetzungen
  const translations: Record<string, string> = {
    'documentConverter.backToList': 'Zurück zur Übersicht',
    'documentConverter.uploadNew': 'Neues Dokument hochladen',
    'documentConverter.conversionSuccess': 'Konvertierung erfolgreich',
    'documentConverter.conversionCancelled': 'Konvertierung abgebrochen',
    'documentConverter.cancelConfirmTitle': 'Konvertierung abbrechen',
    'documentConverter.cancelConfirmMessage': 'Sind Sie sicher, dass Sie die aktuelle Konvertierung abbrechen möchten?',
    'documentConverter.confirm': 'Bestätigen',
    'documentConverter.cancel': 'Abbrechen',
    'documentConverter.deleteConfirmTitle': 'Dokument löschen',
    'documentConverter.deleteConfirmMessage': 'Sind Sie sicher, dass Sie das Dokument "{name}" löschen möchten?',
    'documentConverter.delete': 'Löschen',
    'documentConverter.deleteSuccess': 'Dokument erfolgreich gelöscht',
    'documentConverter.deleteError': 'Fehler beim Löschen des Dokuments',
    'documentConverter.downloadStarted': 'Download gestartet',
  };
  
  let result = translations[key] || key;
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      result = result.replace(`{${key}}`, String(value));
    });
  }
  
  return result;
}

// Überwache Änderungen an den Store-Werten
watch(() => store.conversionProgress, (newProgress) => {
  // Bei 100% einen Log-Eintrag hinzufügen
  if (newProgress === 100) {
    addConversionLog('info', 'Konvertierung abgeschlossen (100%)');
  }
});

// Komponente initialisieren
onMounted(() => {
  initialize();
});
</script>

<style scoped>
.document-converter {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 400px;
}

.document-converter__upload,
.document-converter__conversion,
.document-converter__results,
.document-converter__list {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.document-converter__actions {
  display: flex;
  justify-content: flex-start;
  margin-top: 1.5rem;
  gap: 1rem;
}

.document-converter__back-btn,
.document-converter__upload-new-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.document-converter__back-btn {
  background-color: #f8f9fa;
  color: #495057;
  border: 1px solid #ced4da;
}

.document-converter__back-btn:hover {
  background-color: #e9ecef;
}

.document-converter__upload-new-btn {
  background-color: #4a6cf7;
  color: white;
}

.document-converter__upload-new-btn:hover {
  background-color: #3a5be7;
}

/* Responsive Anpassungen */
@media (max-width: 768px) {
  .document-converter__actions {
    flex-direction: column;
    width: 100%;
  }
  
  .document-converter__back-btn,
  .document-converter__upload-new-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>