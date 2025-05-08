<template>
  <div class="doc-converter-container" v-if="featureToggles.isDocConverterEnabled">
    <div class="doc-converter-header">
      <h2>{{ t('documentConverter.title', 'Dokumentenkonverter') }}</h2>
      <p class="doc-converter-description">
        {{ t('documentConverter.description', 'Konvertieren Sie Ihre Dokumente in ein nscale-kompatibles Format. Unterstützte Formate: PDF, DOCX, XLSX, PPTX, TXT.') }}
      </p>
    </div>

    <!-- Fehleranzeige bei Initialisierungsproblemen -->
    <ErrorDisplay 
      v-if="error" 
      :error="error" 
      @retry="initialize" 
    />

    <div v-else class="doc-converter-content">
      <!-- Upload-Bereich mit Drag & Drop Unterstützung -->
      <FileUpload 
        v-if="!isConverting && !conversionResult" 
        @upload="startConversion" 
        :is-uploading="isUploading"
        :allowed-extensions="allowedExtensions"
        :max-file-size="maxFileSize"
      />

      <!-- Fortschrittsanzeige während der Konvertierung -->
      <ConversionProgress 
        v-if="isConverting" 
        :progress="conversionProgress" 
        :current-step="conversionStep"
        :estimated-time="estimatedTimeRemaining"
        @cancel="handleCancelConversion"
      />

      <!-- Ergebnis der Konvertierung -->
      <ConversionResult 
        v-if="conversionResult" 
        :result="conversionResult"
        @close="clearConversionResult" 
      />

      <!-- Liste der konvertierten Dokumente -->
      <DocumentList 
        :documents="documents" 
        :selected-document="selectedDocument"
        :loading="isLoading"
        @select="selectDocument"
        @view="viewDocument"
        @download="downloadDocument"
        @delete="promptDeleteDocument"
      />

      <!-- Fallback-Konverter, falls etwas schief geht -->
      <FallbackConverter 
        v-if="useFallback" 
        @retry="initialize" 
      />

      <!-- Steuerelemente am unteren Rand -->
      <div class="doc-converter-controls" v-if="conversionResult">
        <button 
          class="doc-converter-btn doc-converter-btn-primary" 
          @click="clearConversionResult"
        >
          {{ t('documentConverter.newConversion', 'Neue Konvertierung') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useDocumentConverter } from '@/composables/useDocumentConverter';
import { useFeatureToggles } from '@/composables/useFeatureToggles';
import { useGlobalDialog } from '@/composables/useDialog';
import { useI18n } from '@/composables/useI18n';
import { ConversionResult } from '@/types/documentConverter';

// Komponenten importieren
import FileUpload from './FileUpload.vue';
import ConversionProgress from './ConversionProgress.vue';
import ConversionResult from './ConversionResult.vue';
import DocumentList from './DocumentList.vue';
import ErrorDisplay from './ErrorDisplay.vue';
import FallbackConverter from './FallbackConverter.vue';

// Feature-Toggle für bedingte Anzeige
const featureToggles = useFeatureToggles();

// Internationalisierung für Texte
const { t } = useI18n();

// Dialog-Service für Bestätigungsdialoge
const dialog = useGlobalDialog();

// Document Converter Composable für Hauptfunktionalität
const {
  isInitialized,
  error,
  isConverting,
  documents,
  selectedDocument,
  isUploading,
  isLoading,
  initialize,
  uploadDocument,
  convertDocument,
  selectDocument,
  cancelConversion,
  clearSelection,
  deleteDocument
} = useDocumentConverter();

// Lokaler Zustand für UI-Steuerung
const conversionProgress = ref<number>(0);
const conversionStep = ref<string>('');
const estimatedTimeRemaining = ref<number>(0);
const conversionResult = ref<ConversionResult | null>(null);
const activeConversion = ref<string | null>(null);
const useFallback = ref<boolean>(false);

// Konfigurationswerte für Upload
const allowedExtensions = [
  'pdf', 'docx', 'doc', 'xlsx', 'xls', 
  'pptx', 'ppt', 'txt', 'csv', 'rtf'
];
const maxFileSize = 20 * 1024 * 1024; // 20 MB in Bytes

/**
 * Startet den Konvertierungsprozess für eine hochgeladene Datei
 * @param file Die hochzuladende und zu konvertierende Datei
 */
async function startConversion(file: File) {
  try {
    // Zustand zurücksetzen
    conversionResult.value = null;
    useFallback.value = false;
    
    // Dokument hochladen
    const documentId = await uploadDocument(file);
    
    if (!documentId) {
      return;
    }
    
    // Konvertierungsfortschritt zurücksetzen
    conversionProgress.value = 0;
    conversionStep.value = t('documentConverter.steps.initializing', 'Initialisiere Konvertierung...');
    estimatedTimeRemaining.value = 0;
    activeConversion.value = documentId;
    
    // Fortschritts-Callback für Echtzeitaktualisierungen
    const updateProgress = (progress: number, step: string, timeRemaining: number | null) => {
      conversionProgress.value = progress;
      conversionStep.value = step;
      estimatedTimeRemaining.value = timeRemaining || 0;
    };
    
    // Konvertierung starten
    const success = await convertDocument(documentId, updateProgress);
    
    if (success) {
      // Konvertierungsergebnis anzeigen
      viewDocument(documentId);
    }
  } catch (err) {
    console.error('Fehler bei der Konvertierung:', err);
    
    // Überprüfen ob Fallback verwendet werden soll
    if (err instanceof Error && (
      err.message.includes('SERVER_UNREACHABLE') || 
      err.message.includes('TIMEOUT') ||
      err.message.includes('CONVERSION_FAILED')
    )) {
      useFallback.value = true;
    }
    
    // Fehlermeldung anzeigen
    await dialog.error({
      title: t('documentConverter.error', 'Fehler'),
      message: err instanceof Error 
        ? err.message 
        : t('documentConverter.errors.unknown', 'Ein unbekannter Fehler ist aufgetreten')
    });
  } finally {
    activeConversion.value = null;
  }
}

/**
 * Bricht eine laufende Konvertierung ab
 */
async function handleCancelConversion() {
  // Bestätigung vom Benutzer einholen
  const confirmed = await dialog.confirm({
    title: t('documentConverter.cancelTitle', 'Konvertierung abbrechen'),
    message: t('documentConverter.cancelConfirm', 'Möchten Sie die laufende Konvertierung wirklich abbrechen?'),
    confirmButtonText: t('common.yes', 'Ja'),
    cancelButtonText: t('common.no', 'Nein'),
    type: 'warning'
  });
  
  if (confirmed && activeConversion.value) {
    try {
      // Konvertierung abbrechen
      await cancelConversion(activeConversion.value);
      
      // Status zurücksetzen
      activeConversion.value = null;
      conversionProgress.value = 0;
      conversionStep.value = t('documentConverter.cancelled', 'Konvertierung abgebrochen');
    } catch (err) {
      console.error('Fehler beim Abbrechen der Konvertierung:', err);
      
      // Fehlermeldung anzeigen
      dialog.error({
        title: t('documentConverter.error', 'Fehler'),
        message: t('documentConverter.cancelError', 'Die Konvertierung konnte nicht abgebrochen werden.')
      });
    }
  }
}

/**
 * Zeigt ein bereits konvertiertes Dokument an
 * @param documentId Die ID des anzuzeigenden Dokuments
 */
function viewDocument(documentId: string) {
  selectDocument(documentId);
  
  const document = documents.value.find(doc => doc.id === documentId);
  
  if (document && document.status === 'success') {
    conversionResult.value = document;
  }
}

/**
 * Initiiert den Download eines konvertierten Dokuments
 * @param documentId Die ID des herunterzuladenden Dokuments
 */
function downloadDocument(documentId: string) {
  const baseUrl = import.meta.env.VITE_API_URL || '';
  window.location.href = `${baseUrl}/api/documents/${documentId}/download`;
}

/**
 * Fordert die Bestätigung zum Löschen eines Dokuments an
 * @param documentId Die ID des zu löschenden Dokuments
 */
async function promptDeleteDocument(documentId: string) {
  // Dialog anzeigen statt window.confirm
  const confirmed = await dialog.confirm({
    title: t('documentConverter.deleteTitle', 'Dokument löschen'),
    message: t('documentConverter.deleteConfirm', 'Sind Sie sicher, dass Sie dieses Dokument löschen möchten?'),
    confirmButtonText: t('common.delete', 'Löschen'),
    cancelButtonText: t('common.cancel', 'Abbrechen'),
    type: 'warning'
  });
  
  if (confirmed) {
    await deleteDocument(documentId);
    
    // Wenn das gelöschte Dokument das aktuell angezeigte ist, Anzeige löschen
    if (conversionResult.value && conversionResult.value.id === documentId) {
      clearConversionResult();
    }
  }
}

/**
 * Setzt die Anzeige der Konvertierungsergebnisse zurück
 */
function clearConversionResult() {
  conversionResult.value = null;
  clearSelection();
}

// Lebenszyklus-Hooks
onMounted(() => {
  // Beim Mounten initialisieren
  initialize();
});

// Bereinigung für den Fall, dass die Komponente während einer Konvertierung unmounted wird
onBeforeUnmount(() => {
  if (isConverting.value && activeConversion.value) {
    // Laufende Konvertierung abbrechen ohne Benutzerbenachrichtigung
    try {
      cancelConversion(activeConversion.value).catch(err => {
        console.error('Fehler beim Abbrechen der Konvertierung während Unmount:', err);
      });
    } catch (err) {
      console.error('Exception beim Abbrechen der Konvertierung während Unmount:', err);
    }
    
    // Status zurücksetzen
    activeConversion.value = null;
    conversionProgress.value = 0;
  }
});
</script>

<style scoped>
/* Grundlegende Containerstile */
.doc-converter-container {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  max-width: 900px;
  margin: 0 auto;
  padding: 1.5rem;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

/* Header-Bereich mit Titel und Beschreibung */
.doc-converter-header {
  margin-bottom: 2rem;
  text-align: center;
}

.doc-converter-header h2 {
  font-size: 1.75rem;
  color: #0d7a40; /* nscale Grün */
  margin-bottom: 0.75rem;
  font-weight: 600;
}

.doc-converter-description {
  font-size: 1rem;
  color: #666;
  margin: 0 auto;
  max-width: 700px;
  line-height: 1.5;
}

/* Inhaltsbereich */
.doc-converter-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Steuerelemente am unteren Rand */
.doc-converter-controls {
  margin-top: 2rem;
  display: flex;
  justify-content: center;
  gap: 1rem;
}

/* Button-Stile */
.doc-converter-btn {
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.1s;
  border: none;
  outline: none;
}

.doc-converter-btn:hover {
  transform: translateY(-1px);
}

.doc-converter-btn:active {
  transform: translateY(0);
}

.doc-converter-btn:focus {
  box-shadow: 0 0 0 3px rgba(13, 122, 64, 0.3);
}

.doc-converter-btn-primary {
  background-color: #0d7a40; /* nscale Grün */
  color: white;
}

.doc-converter-btn-primary:hover {
  background-color: #0a6032; /* Dunkleres Grün beim Hover */
}

.doc-converter-btn-secondary {
  background-color: #f0f0f0;
  color: #333;
}

.doc-converter-btn-secondary:hover {
  background-color: #e0e0e0;
}

.doc-converter-btn-danger {
  background-color: #dc2626;
  color: white;
}

.doc-converter-btn-danger:hover {
  background-color: #b91c1c;
}

/* Animation für Übergänge */
.doc-converter-content > * {
  transition: opacity 0.3s, transform 0.3s;
}

/* Responsive Design */
@media (max-width: 768px) {
  .doc-converter-container {
    padding: 1rem;
    margin: 0 0.5rem;
  }
  
  .doc-converter-header h2 {
    font-size: 1.5rem;
  }
  
  .doc-converter-btn {
    padding: 0.6rem 1.2rem;
    font-size: 0.9rem;
  }
}
</style>