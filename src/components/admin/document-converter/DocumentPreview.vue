<template>
  <div 
    class="document-preview" 
    :class="{ 'document-preview--fullscreen': isFullscreen }"
  >
    <div class="document-preview__header">
      <div class="document-preview__title">
        <i 
          :class="documentIcon" 
          class="document-preview__file-icon" 
          aria-hidden="true"
        ></i>
        <h3 class="document-preview__file-name" :title="document?.originalName">
          {{ document?.originalName }}
        </h3>
      </div>
      
      <div class="document-preview__actions">
        <button 
          @click="downloadDocument" 
          class="document-preview__action-btn"
          aria-label="Dokument herunterladen"
          :title="t('documentPreview.downloadDocument', 'Dokument herunterladen')"
        >
          <i class="fa fa-download" aria-hidden="true"></i>
        </button>
        
        <button 
          @click="toggleFullscreen" 
          class="document-preview__action-btn"
          :aria-label="isFullscreen ? 'Vollbildmodus beenden' : 'Vollbildmodus aktivieren'"
          :title="isFullscreen 
            ? t('documentPreview.exitFullscreen', 'Vollbildmodus beenden') 
            : t('documentPreview.enterFullscreen', 'Vollbildmodus aktivieren')"
        >
          <i 
            :class="isFullscreen ? 'fa fa-compress' : 'fa fa-expand'" 
            aria-hidden="true"
          ></i>
        </button>
        
        <button 
          @click="closePreview" 
          class="document-preview__action-btn document-preview__close-btn"
          aria-label="Vorschau schließen"
          :title="t('documentPreview.closePreview', 'Vorschau schließen')"
        >
          <i class="fa fa-times" aria-hidden="true"></i>
        </button>
      </div>
    </div>
    
    <div class="document-preview__toolbar">
      <div class="document-preview__info">
        <span class="document-preview__meta-item">
          <span class="document-preview__meta-label">{{ t('documentPreview.format', 'Format') }}:</span>
          <span class="document-preview__meta-value">{{ document?.originalFormat?.toUpperCase() }}</span>
        </span>
        
        <span class="document-preview__meta-item">
          <span class="document-preview__meta-label">{{ t('documentPreview.size', 'Größe') }}:</span>
          <span class="document-preview__meta-value">{{ formatFileSize(document?.size) }}</span>
        </span>
        
        <span v-if="document?.metadata?.pageCount" class="document-preview__meta-item">
          <span class="document-preview__meta-label">{{ t('documentPreview.pages', 'Seiten') }}:</span>
          <span class="document-preview__meta-value">{{ document.metadata.pageCount }}</span>
        </span>
      </div>
      
      <div class="document-preview__view-controls">
        <div class="document-preview__zoom-controls">
          <button 
            @click="decreaseZoom" 
            class="document-preview__control-btn"
            :disabled="zoomLevel <= minZoom"
            aria-label="Verkleinern"
            :title="t('documentPreview.zoomOut', 'Verkleinern')"
          >
            <i class="fa fa-search-minus" aria-hidden="true"></i>
          </button>
          
          <span class="document-preview__zoom-level">{{ Math.round(zoomLevel * 100) }}%</span>
          
          <button 
            @click="increaseZoom" 
            class="document-preview__control-btn"
            :disabled="zoomLevel >= maxZoom"
            aria-label="Vergrößern"
            :title="t('documentPreview.zoomIn', 'Vergrößern')"
          >
            <i class="fa fa-search-plus" aria-hidden="true"></i>
          </button>
          
          <button 
            @click="resetZoom" 
            class="document-preview__control-btn"
            aria-label="Zoom zurücksetzen"
            :title="t('documentPreview.resetZoom', 'Zoom zurücksetzen')"
          >
            <i class="fa fa-undo" aria-hidden="true"></i>
          </button>
        </div>
        
        <div v-if="showPagination" class="document-preview__pagination">
          <button 
            @click="previousPage" 
            class="document-preview__control-btn"
            :disabled="currentPage <= 1"
            aria-label="Vorherige Seite"
            :title="t('documentPreview.previousPage', 'Vorherige Seite')"
          >
            <i class="fa fa-chevron-left" aria-hidden="true"></i>
          </button>
          
          <span class="document-preview__page-indicator">
            {{ t('documentPreview.pageIndicator', 'Seite {current} von {total}', {
              current: currentPage,
              total: totalPages
            }) }}
          </span>
          
          <button 
            @click="nextPage" 
            class="document-preview__control-btn"
            :disabled="currentPage >= totalPages"
            aria-label="Nächste Seite"
            :title="t('documentPreview.nextPage', 'Nächste Seite')"
          >
            <i class="fa fa-chevron-right" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    </div>
    
    <div 
      class="document-preview__content" 
      ref="contentRef"
      :style="{ 
        'transform': `scale(${zoomLevel})`,
        'transform-origin': 'top left' 
      }"
      @wheel.ctrl.prevent="handleWheelZoom"
    >
      <!-- Ladeanzeige -->
      <div v-if="loading" class="document-preview__loading">
        <div class="document-preview__spinner"></div>
        <p>{{ t('documentPreview.loading', 'Dokument wird geladen...') }}</p>
      </div>
      
      <!-- Fehleranzeige -->
      <div v-else-if="error" class="document-preview__error">
        <i class="fa fa-exclamation-circle document-preview__error-icon" aria-hidden="true"></i>
        <p class="document-preview__error-message">{{ error }}</p>
        <button 
          @click="retryLoading" 
          class="document-preview__retry-btn"
        >
          {{ t('documentPreview.retry', 'Erneut versuchen') }}
        </button>
      </div>
      
      <!-- PDF-Vorschau -->
      <div v-else-if="isPdf" class="document-preview__pdf-container">
        <iframe 
          v-if="documentUrl" 
          :src="documentUrl" 
          class="document-preview__pdf-frame"
          title="PDF-Vorschau"
          ref="pdfFrame"
          loading="lazy"
        ></iframe>
      </div>
      
      <!-- HTML-Vorschau -->
      <div v-else-if="isHtml" class="document-preview__html-container">
        <iframe 
          v-if="documentUrl" 
          :src="documentUrl" 
          class="document-preview__html-frame"
          title="HTML-Vorschau"
          sandbox="allow-same-origin"
          loading="lazy"
        ></iframe>
      </div>
      
      <!-- Text-Vorschau -->
      <div v-else-if="isText" class="document-preview__text-container">
        <pre v-if="textContent" class="document-preview__text-content">{{ textContent }}</pre>
      </div>
      
      <!-- Tabellenvorschau für Excel -->
      <div v-else-if="isExcel && document?.metadata?.tables" class="document-preview__table-container">
        <div v-for="(table, index) in document.metadata.tables" :key="index" class="document-preview__table-wrapper">
          <h4 class="document-preview__table-title">
            {{ t('documentPreview.table', 'Tabelle {index}', { index: index + 1 }) }}
            <span v-if="table.pageNumber" class="document-preview__table-page">
              ({{ t('documentPreview.page', 'Seite {page}', { page: table.pageNumber }) }})
            </span>
          </h4>
          
          <table class="document-preview__table">
            <thead v-if="table.headers && table.headers.length > 0">
              <tr>
                <th v-for="(header, headerIndex) in table.headers" :key="headerIndex">
                  {{ header }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, rowIndex) in table.data" :key="rowIndex">
                <td v-for="(cell, cellIndex) in row" :key="cellIndex">
                  {{ cell }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <!-- Fallback-Vorschau -->
      <div v-else class="document-preview__fallback">
        <div class="document-preview__fallback-icon">
          <i :class="documentIcon" aria-hidden="true"></i>
        </div>
        <p class="document-preview__fallback-message">
          {{ t('documentPreview.previewNotAvailable', 'Vorschau für dieses Dokument nicht verfügbar.') }}
        </p>
        <p class="document-preview__fallback-hint">
          {{ t('documentPreview.downloadInstead', 'Laden Sie die Datei herunter, um den Inhalt anzuzeigen.') }}
        </p>
        <button 
          @click="downloadDocument" 
          class="document-preview__download-btn"
        >
          <i class="fa fa-download" aria-hidden="true"></i>
          {{ t('documentPreview.download', 'Herunterladen') }}
        </button>
      </div>
    </div>
    
    <!-- Dokument-Metadaten -->
    <div v-if="document?.metadata && showMetadata" class="document-preview__metadata">
      <h4 class="document-preview__metadata-title">
        {{ t('documentPreview.metadata', 'Metadaten') }}
        <button 
          @click="showMetadata = false" 
          class="document-preview__metadata-toggle"
          aria-label="Metadaten ausblenden"
        >
          <i class="fa fa-chevron-up" aria-hidden="true"></i>
        </button>
      </h4>
      
      <div class="document-preview__metadata-content">
        <div v-if="document.metadata.title" class="document-preview__metadata-item">
          <span class="document-preview__metadata-label">{{ t('documentPreview.metaTitle', 'Titel') }}:</span>
          <span class="document-preview__metadata-value">{{ document.metadata.title }}</span>
        </div>
        
        <div v-if="document.metadata.author" class="document-preview__metadata-item">
          <span class="document-preview__metadata-label">{{ t('documentPreview.metaAuthor', 'Autor') }}:</span>
          <span class="document-preview__metadata-value">{{ document.metadata.author }}</span>
        </div>
        
        <div v-if="document.metadata.created" class="document-preview__metadata-item">
          <span class="document-preview__metadata-label">{{ t('documentPreview.metaCreated', 'Erstellt am') }}:</span>
          <span class="document-preview__metadata-value">{{ formatDate(document.metadata.created) }}</span>
        </div>
        
        <div v-if="document.metadata.modified" class="document-preview__metadata-item">
          <span class="document-preview__metadata-label">{{ t('documentPreview.metaModified', 'Geändert am') }}:</span>
          <span class="document-preview__metadata-value">{{ formatDate(document.metadata.modified) }}</span>
        </div>
        
        <div v-if="document.metadata.keywords && document.metadata.keywords.length > 0" class="document-preview__metadata-item">
          <span class="document-preview__metadata-label">{{ t('documentPreview.metaKeywords', 'Schlüsselwörter') }}:</span>
          <span class="document-preview__metadata-value">
            <span 
              v-for="(keyword, index) in document.metadata.keywords" 
              :key="index"
              class="document-preview__keyword"
            >
              {{ keyword }}
            </span>
          </span>
        </div>
      </div>
    </div>
    
    <div v-else-if="document?.metadata" class="document-preview__metadata-collapsed">
      <button 
        @click="showMetadata = true" 
        class="document-preview__metadata-toggle document-preview__metadata-toggle--expand"
        aria-label="Metadaten anzeigen"
      >
        {{ t('documentPreview.showMetadata', 'Metadaten anzeigen') }}
        <i class="fa fa-chevron-down" aria-hidden="true"></i>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { ConversionResult } from '@/types/documentConverter';
import { useI18n } from '@/composables/useI18n';
import { useDocumentConverterStore } from '@/stores/documentConverter';

const { t } = useI18n();
const store = useDocumentConverterStore();

// Props-Definition
interface Props {
  document?: ConversionResult;
  onClose?: () => void;
}

const props = withDefaults(defineProps<Props>(), {
  document: undefined,
  onClose: () => {}
});

// Emits-Definition
const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'download', documentId: string): void;
}>();

// Reaktive Zustandsvariablen
const isFullscreen = ref(false);
const zoomLevel = ref(1);
const currentPage = ref(1);
const totalPages = ref(1);
const showMetadata = ref(false);
const loading = ref(true);
const error = ref<string | null>(null);
const textContent = ref<string | null>(null);
const documentUrl = ref<string | null>(null);
const contentRef = ref<HTMLElement | null>(null);
const pdfFrame = ref<HTMLIFrameElement | null>(null);

// Konstanten
const minZoom = 0.5;
const maxZoom = 3;
const zoomStep = 0.1;

// Berechnete Eigenschaften
const documentIcon = computed(() => {
  if (!props.document) return 'fa fa-file';
  
  const extension = props.document.originalFormat.toLowerCase();
  const icons: Record<string, string> = {
    pdf: 'fa fa-file-pdf',
    docx: 'fa fa-file-word',
    doc: 'fa fa-file-word',
    xlsx: 'fa fa-file-excel',
    xls: 'fa fa-file-excel',
    pptx: 'fa fa-file-powerpoint',
    ppt: 'fa fa-file-powerpoint',
    html: 'fa fa-file-code',
    htm: 'fa fa-file-code',
    txt: 'fa fa-file-alt'
  };
  
  return icons[extension] || 'fa fa-file';
});

const isPdf = computed(() => {
  return props.document?.originalFormat.toLowerCase() === 'pdf';
});

const isHtml = computed(() => {
  const format = props.document?.originalFormat.toLowerCase() || '';
  return format === 'html' || format === 'htm';
});

const isText = computed(() => {
  return props.document?.originalFormat.toLowerCase() === 'txt';
});

const isExcel = computed(() => {
  const format = props.document?.originalFormat.toLowerCase() || '';
  return format === 'xlsx' || format === 'xls';
});

const showPagination = computed(() => {
  return (props.document?.metadata?.pageCount || 0) > 1 || totalPages.value > 1;
});

// Methoden
function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value;
  
  // Fokus zurück auf den Inhalt setzen
  nextTick(() => {
    if (contentRef.value) {
      contentRef.value.focus();
    }
  });
  
  // Tastaturkürzel für Vollbildmodus registrieren/deregistrieren
  if (isFullscreen.value) {
    document.addEventListener('keydown', handleEscapeKey);
  } else {
    document.removeEventListener('keydown', handleEscapeKey);
  }
}

function handleEscapeKey(event: KeyboardEvent) {
  if (event.key === 'Escape' && isFullscreen.value) {
    toggleFullscreen();
  }
}

function increaseZoom() {
  if (zoomLevel.value < maxZoom) {
    zoomLevel.value = Math.min(maxZoom, zoomLevel.value + zoomStep);
  }
}

function decreaseZoom() {
  if (zoomLevel.value > minZoom) {
    zoomLevel.value = Math.max(minZoom, zoomLevel.value - zoomStep);
  }
}

function resetZoom() {
  zoomLevel.value = 1;
}

function handleWheelZoom(event: WheelEvent) {
  // Zoom mit Mausrad (bei gedrückter Strg-Taste)
  if (event.ctrlKey) {
    if (event.deltaY < 0) {
      increaseZoom();
    } else {
      decreaseZoom();
    }
  }
}

function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
    navigateToPage(currentPage.value);
  }
}

function previousPage() {
  if (currentPage.value > 1) {
    currentPage.value--;
    navigateToPage(currentPage.value);
  }
}

function navigateToPage(page: number) {
  // PDF-spezifische Navigation
  if (isPdf.value && pdfFrame.value) {
    // PDF.js-Steuerelemente im iframe ansprechen
    try {
      const frameWindow = pdfFrame.value.contentWindow;
      if (frameWindow) {
        frameWindow.postMessage({ type: 'navigate', page }, '*');
      }
    } catch (err) {
      console.error('Fehler bei der PDF-Navigation:', err);
    }
  }
}

function closePreview() {
  // Aufräumen vor dem Schließen
  if (documentUrl.value) {
    URL.revokeObjectURL(documentUrl.value);
  }
  
  if (isFullscreen.value) {
    document.removeEventListener('keydown', handleEscapeKey);
  }
  
  emit('close');
  if (props.onClose) {
    props.onClose();
  }
}

function downloadDocument() {
  if (props.document) {
    emit('download', props.document.id);
  }
}

function retryLoading() {
  error.value = null;
  loading.value = true;
  loadDocumentContent();
}

// Formatierungsfunktionen
function formatFileSize(bytes?: number): string {
  if (!bytes) return '0 Bytes';
  
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i)) + ' ' + sizes[i];
}

function formatDate(timestamp?: Date | string): string {
  if (!timestamp) return '';
  
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  
  if (isNaN(date.getTime())) {
    return '';
  }
  
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Laden des Dokumenteninhalts
async function loadDocumentContent() {
  if (!props.document) {
    error.value = t('documentPreview.noDocument', 'Dokument nicht gefunden.');
    loading.value = false;
    return;
  }
  
  try {
    loading.value = true;
    error.value = null;
    
    // Text-Dokumente direkt anzeigen
    if (isText.value && props.document.content) {
      textContent.value = props.document.content;
      loading.value = false;
      return;
    }
    
    // PDF oder HTML über URL anzeigen
    const response = await store.getDocumentContent(props.document.id);
    
    if (response.blob) {
      // Blob URL erstellen
      documentUrl.value = URL.createObjectURL(response.blob);
      
      // Für PDFs die Seitenzahl ermitteln
      if (isPdf.value && props.document.metadata?.pageCount) {
        totalPages.value = props.document.metadata.pageCount;
      }
      
      loading.value = false;
    } else if (response.content) {
      // Textinhalt anzeigen
      textContent.value = response.content;
      loading.value = false;
    } else {
      throw new Error(t('documentPreview.contentNotAvailable', 'Dokumentinhalt nicht verfügbar.'));
    }
  } catch (err) {
    console.error('Fehler beim Laden des Dokuments:', err);
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    loading.value = false;
  }
}

// Lebenszyklusmethoden
onMounted(() => {
  loadDocumentContent();
  
  // Tastaturkürzel für Navigation
  document.addEventListener('keydown', handleKeyboardNavigation);
});

onBeforeUnmount(() => {
  // Aufräumen
  if (documentUrl.value) {
    URL.revokeObjectURL(documentUrl.value);
  }
  
  document.removeEventListener('keydown', handleKeyboardNavigation);
  document.removeEventListener('keydown', handleEscapeKey);
});

// Tastaturnavigation
function handleKeyboardNavigation(event: KeyboardEvent) {
  // Nur wenn kein Input-Element fokussiert ist
  if (
    document.activeElement?.tagName === 'INPUT' ||
    document.activeElement?.tagName === 'TEXTAREA'
  ) {
    return;
  }
  
  switch (event.key) {
    case '+':
      increaseZoom();
      event.preventDefault();
      break;
    case '-':
      decreaseZoom();
      event.preventDefault();
      break;
    case '0':
      resetZoom();
      event.preventDefault();
      break;
    case 'ArrowRight':
    case 'PageDown':
      nextPage();
      event.preventDefault();
      break;
    case 'ArrowLeft':
    case 'PageUp':
      previousPage();
      event.preventDefault();
      break;
    case 'f':
      toggleFullscreen();
      event.preventDefault();
      break;
  }
}

// Beobachter für Änderungen des Dokuments
watch(() => props.document, () => {
  if (props.document) {
    // Zurücksetzen des Zustands
    zoomLevel.value = 1;
    currentPage.value = 1;
    textContent.value = null;
    
    // Alte URL aufräumen
    if (documentUrl.value) {
      URL.revokeObjectURL(documentUrl.value);
      documentUrl.value = null;
    }
    
    // Neues Dokument laden
    loadDocumentContent();
  }
});
</script>

<style scoped>
.document-preview {
  display: flex;
  flex-direction: column;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  height: 100%;
  min-height: 400px;
  position: relative;
  transition: all 0.3s ease;
}

.document-preview--fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  border-radius: 0;
  height: 100vh;
  width: 100vw;
}

.document-preview__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background-color: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.document-preview__title {
  display: flex;
  align-items: center;
  overflow: hidden;
  gap: 0.75rem;
}

.document-preview__file-icon {
  font-size: 1.5rem;
  color: #6c757d;
}

.document-preview__file-name {
  margin: 0;
  font-size: 1.125rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 500px;
}

.document-preview__actions {
  display: flex;
  gap: 0.5rem;
}

.document-preview__action-btn {
  background: none;
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  color: #6c757d;
}

.document-preview__action-btn:hover {
  background-color: #e9ecef;
  color: #212529;
}

.document-preview__action-btn:focus {
  outline: none;
  box-shadow: 0 0 0 2px #4a6cf7;
}

.document-preview__close-btn:hover {
  background-color: #f8d7da;
  color: #dc3545;
}

.document-preview__toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background-color: #fff;
  border-bottom: 1px solid #e9ecef;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.document-preview__info {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.document-preview__meta-item {
  font-size: 0.85rem;
  color: #6c757d;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.document-preview__meta-label {
  font-weight: 600;
}

.document-preview__view-controls {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
}

.document-preview__zoom-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.document-preview__control-btn {
  background: none;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  color: #6c757d;
}

.document-preview__control-btn:hover:not(:disabled) {
  background-color: #e9ecef;
  color: #212529;
}

.document-preview__control-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.document-preview__zoom-level {
  font-size: 0.85rem;
  min-width: 50px;
  text-align: center;
}

.document-preview__pagination {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.document-preview__page-indicator {
  font-size: 0.85rem;
  color: #6c757d;
  min-width: 100px;
  text-align: center;
}

.document-preview__content {
  flex: 1;
  overflow: auto;
  position: relative;
  padding: 1rem;
  background-color: #f8f9fa;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  transition: transform 0.2s ease;
  min-height: 300px;
}

/* Verschiedene Containertypen */
.document-preview__pdf-container,
.document-preview__html-container {
  width: 100%;
  height: 100%;
  min-height: 300px;
}

.document-preview__pdf-frame,
.document-preview__html-frame {
  width: 100%;
  height: 100%;
  min-height: 100%;
  border: none;
}

.document-preview__text-container {
  width: 100%;
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 1rem;
  max-width: 800px;
  margin: 0 auto;
}

.document-preview__text-content {
  white-space: pre-wrap;
  word-break: break-word;
  font-family: monospace;
  font-size: 0.9rem;
  color: #212529;
  margin: 0;
  line-height: 1.5;
}

.document-preview__table-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  max-width: 1000px;
  margin: 0 auto;
}

.document-preview__table-wrapper {
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 1rem;
  overflow-x: auto;
}

.document-preview__table-title {
  margin-top: 0;
  margin-bottom: 0.75rem;
  font-size: 1rem;
  color: #343a40;
}

.document-preview__table-page {
  font-size: 0.85rem;
  color: #6c757d;
  font-weight: normal;
}

.document-preview__table {
  width: 100%;
  border-collapse: collapse;
}

.document-preview__table th,
.document-preview__table td {
  padding: 0.5rem;
  border: 1px solid #e9ecef;
  text-align: left;
}

.document-preview__table th {
  background-color: #f8f9fa;
  font-weight: 600;
}

.document-preview__table tbody tr:nth-child(even) {
  background-color: #f8f9fa;
}

/* Ladezustand */
.document-preview__loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: #6c757d;
  width: 100%;
}

.document-preview__spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #e9ecef;
  border-top: 4px solid #4a6cf7;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Fehleranzeige */
.document-preview__error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
  color: #842029;
  background-color: #f8d7da;
  border-radius: 4px;
  max-width: 500px;
  margin: 0 auto;
}

.document-preview__error-icon {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.document-preview__error-message {
  margin-bottom: 1.5rem;
}

.document-preview__retry-btn {
  background-color: #4a6cf7;
  color: white;
  border: none;
  padding: 0.5rem 1.25rem;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.document-preview__retry-btn:hover {
  background-color: #3a5be7;
}

/* Fallback-Anzeige */
.document-preview__fallback {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
  color: #6c757d;
  background-color: #f8f9fa;
  border-radius: 4px;
  max-width: 500px;
  margin: 0 auto;
}

.document-preview__fallback-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.document-preview__fallback-message {
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.document-preview__fallback-hint {
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
}

.document-preview__download-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: #4a6cf7;
  color: white;
  border: none;
  padding: 0.625rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.document-preview__download-btn:hover {
  background-color: #3a5be7;
}

/* Metadaten */
.document-preview__metadata {
  background-color: #f8f9fa;
  border-top: 1px solid #e9ecef;
  padding: 1rem;
}

.document-preview__metadata-title {
  margin: 0 0 0.75rem;
  font-size: 1rem;
  color: #343a40;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.document-preview__metadata-toggle {
  background: none;
  border: none;
  color: #6c757d;
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
}

.document-preview__metadata-toggle:hover {
  color: #343a40;
}

.document-preview__metadata-content {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 0.75rem;
}

.document-preview__metadata-item {
  font-size: 0.85rem;
}

.document-preview__metadata-label {
  font-weight: 600;
  color: #495057;
  margin-right: 0.5rem;
}

.document-preview__metadata-value {
  color: #6c757d;
}

.document-preview__keyword {
  display: inline-block;
  background-color: #e7f5ff;
  color: #4a6cf7;
  padding: 0.125rem 0.5rem;
  border-radius: 100px;
  margin-right: 0.5rem;
  margin-bottom: 0.25rem;
  font-size: 0.8rem;
}

.document-preview__metadata-collapsed {
  background-color: #f8f9fa;
  border-top: 1px solid #e9ecef;
  padding: 0.75rem;
  text-align: center;
}

.document-preview__metadata-toggle--expand {
  background-color: transparent;
  border: none;
  color: #4a6cf7;
  cursor: pointer;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 auto;
}

.document-preview__metadata-toggle--expand:hover {
  text-decoration: underline;
}

/* Responsive Anpassungen */
@media (max-width: 768px) {
  .document-preview__toolbar {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .document-preview__view-controls {
    width: 100%;
    justify-content: space-between;
  }
  
  .document-preview__info {
    width: 100%;
    justify-content: space-between;
    margin-bottom: 0.75rem;
  }
  
  .document-preview__file-name {
    max-width: 200px;
  }
  
  .document-preview__metadata-content {
    grid-template-columns: 1fr;
  }
}
</style>