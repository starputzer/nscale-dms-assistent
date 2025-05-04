// src/composables/useDocConverter.js
import { ref, computed, watch } from 'vue';
import { useDocConverterStore } from '@/stores/docConverterStore';
import { useToast } from '@/composables/useToast';

export function useDocConverter() {
  const docConverterStore = useDocConverterStore();
  const { showToast } = useToast();

  // Reactive state
  const selectedFiles = ref([]);
  const isConverting = ref(false);
  const conversionProgress = ref(0);
  const currentProcessingFile = ref('');
  const conversionError = ref(null);
  const showPreviewModal = ref(false);
  const previewData = ref(null);

  // Default conversion options
  const conversionOptions = ref({
    outputFormat: 'markdown',
    splitSections: true,
    extractImages: true,
    imageQuality: 'medium',
    metadataHandling: 'extract',
    advancedParsing: true,
    tableDetection: 'auto',
    ocrLevel: 'basic',
    formatDetection: true
  });

  // Computed properties
  const conversionResults = computed(() => docConverterStore.resultsByDate);
  const hasResults = computed(() => docConverterStore.hasResults);
  const isLoading = computed(() => docConverterStore.isLoading);

  // Constants
  const acceptedFormats = [
    '.pdf', '.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt', '.html', '.txt'
  ];
  const maxFileSize = 50 * 1024 * 1024; // 50 MB

  // Methods
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
      
      // Create FormData for file upload
      const formData = new FormData();
      selectedFiles.value.forEach(file => {
        formData.append('files', file);
      });
      
      // Add options
      Object.entries(conversionOptions.value).forEach(([key, value]) => {
        formData.append(key, value);
      });
      
      // Start conversion and track progress
      const response = await docConverterStore.convertDocuments(
        formData, 
        (progress, filename) => {
          conversionProgress.value = progress;
          currentProcessingFile.value = filename;
        }
      );
      
      // Conversion successful
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

  const loadPreviousResults = async () => {
    try {
      await docConverterStore.loadPreviousResults();
    } catch (error) {
      console.error('Fehler beim Laden vorheriger Ergebnisse:', error);
    }
  };

  const viewResult = (result) => {
    previewData.value = result;
    showPreviewModal.value = true;
  };

  const downloadResult = (result) => {
    docConverterStore.downloadConvertedFile(result.id);
  };

  const deleteResult = async (result) => {
    try {
      await docConverterStore.deleteResult(result.id);
      showToast(`"${result.fileName}" wurde gelöscht`, 'info');
    } catch (error) {
      showToast(`Fehler beim Löschen: ${error.message}`, 'error');
    }
  };

  const clearAllResults = async () => {
    try {
      await docConverterStore.clearAllResults();
      showToast('Alle Konvertierungsergebnisse wurden gelöscht', 'info');
    } catch (error) {
      showToast(`Fehler beim Löschen aller Ergebnisse: ${error.message}`, 'error');
    }
  };

  const closePreviewModal = () => {
    showPreviewModal.value = false;
    previewData.value = null;
  };

  return {
    // State
    selectedFiles,
    isConverting,
    conversionProgress,
    currentProcessingFile,
    conversionError,
    conversionOptions,
    showPreviewModal,
    previewData,
    
    // Computed
    conversionResults,
    hasResults,
    isLoading,
    
    // Constants
    acceptedFormats,
    maxFileSize,
    
    // Methods
    handleFilesSelected,
    removeFile,
    clearSelectedFiles,
    startConversion,
    cancelConversion,
    loadPreviousResults,
    viewResult,
    downloadResult,
    deleteResult,
    clearAllResults,
    closePreviewModal
  };
}