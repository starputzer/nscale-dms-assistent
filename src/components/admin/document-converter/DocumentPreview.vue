<template>
  <div 
    class="document-preview" 
    :class="{ 'document-preview--fullscreen': isFullscreen }"
    @keydown="handleKeyboardNavigation"
    tabindex="-1"
    ref="previewContainer"
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
          data-testid="download-btn"
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
          data-testid="fullscreen-btn"
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
          data-testid="close-btn"
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
            data-testid="zoom-out-btn"
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
            data-testid="zoom-in-btn"
          >
            <i class="fa fa-search-plus" aria-hidden="true"></i>
          </button>
          
          <button 
            @click="resetZoom" 
            class="document-preview__control-btn"
            aria-label="Zoom zurücksetzen"
            :title="t('documentPreview.resetZoom', 'Zoom zurücksetzen')"
            data-testid="zoom-reset-btn"
          >
            <i class="fa fa-undo" aria-hidden="true"></i>
          </button>
          
          <button
            v-if="canRotate"
            @click="rotateDocument"
            class="document-preview__control-btn"
            aria-label="Dokument drehen"
            :title="t('documentPreview.rotate', 'Dokument drehen')"
            data-testid="rotate-btn"
          >
            <i class="fa fa-sync" aria-hidden="true"></i>
          </button>
        </div>
        
        <div v-if="showPagination" class="document-preview__pagination">
          <button 
            @click="previousPage" 
            class="document-preview__control-btn"
            :disabled="currentPage <= 1"
            aria-label="Vorherige Seite"
            :title="t('documentPreview.previousPage', 'Vorherige Seite')"
            data-testid="prev-page-btn"
          >
            <i class="fa fa-chevron-left" aria-hidden="true"></i>
          </button>
          
          <div class="document-preview__page-selector">
            <label for="page-select" class="sr-only">Seite auswählen</label>
            <input 
              id="page-select"
              type="number" 
              v-model.number="currentPage" 
              :min="1" 
              :max="totalPages"
              class="document-preview__page-input"
              @change="handlePageInput"
              :aria-label="t('documentPreview.pageSelector', 'Seite auswählen')"
              data-testid="page-input"
            />
            <span class="document-preview__page-separator">/</span>
            <span class="document-preview__total-pages">{{ totalPages }}</span>
          </div>
          
          <button 
            @click="nextPage" 
            class="document-preview__control-btn"
            :disabled="currentPage >= totalPages"
            aria-label="Nächste Seite"
            :title="t('documentPreview.nextPage', 'Nächste Seite')"
            data-testid="next-page-btn"
          >
            <i class="fa fa-chevron-right" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    </div>
    
    <div 
      class="document-preview__content" 
      ref="contentRef"
      :style="contentStyle"
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
          data-testid="retry-btn"
        >
          {{ t('documentPreview.retry', 'Erneut versuchen') }}
        </button>
      </div>
      
      <!-- PDF-Vorschau -->
      <div 
        v-else-if="isPdf" 
        class="document-preview__pdf-container" 
        :class="{ 'document-preview__pdf-container--rotated': rotation % 180 !== 0 }"
      >
        <iframe 
          v-if="documentUrl" 
          :src="documentUrl" 
          class="document-preview__pdf-frame"
          title="PDF-Vorschau"
          ref="pdfFrame"
          loading="lazy"
          style="transform: rotate(90deg);"
          @load="handlePdfLoad"
        ></iframe>
      </div>
      
      <!-- Bild-Vorschau -->
      <div 
        v-else-if="isImage" 
        class="document-preview__image-container"
        :class="{ 'document-preview__image-container--rotated': rotation % 180 !== 0 }"
      >
        <img
          v-if="documentUrl"
          :src="documentUrl"
          class="document-preview__image"
          :alt="document?.originalName || 'Bildvorschau'"
          :style="{ transform: `rotate(${rotation}deg)` }"
          @load="handleImageLoad"
          data-testid="image-preview"
        />
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
          data-testid="html-preview"
        ></iframe>
      </div>
      
      <!-- Text-Vorschau mit Syntaxhervorhebung -->
      <div v-else-if="isText" class="document-preview__text-container">
        <div v-if="textContent" class="document-preview__text-content">
          <pre v-if="!useSyntaxHighlighting">{{ textContent }}</pre>
          <div v-else v-html="highlightedText" class="document-preview__highlighted-text"></div>
        </div>
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
          
          <div class="document-preview__table-actions">
            <button 
              @click="exportTable(table, 'csv')" 
              class="document-preview__table-action-btn"
              :title="t('documentPreview.exportCSV', 'Als CSV exportieren')"
            >
              <i class="fa fa-file-csv" aria-hidden="true"></i>
              CSV
            </button>
            <button 
              @click="exportTable(table, 'json')" 
              class="document-preview__table-action-btn"
              :title="t('documentPreview.exportJSON', 'Als JSON exportieren')"
            >
              <i class="fa fa-file-code" aria-hidden="true"></i>
              JSON
            </button>
          </div>
          
          <div class="document-preview__table-scrollable">
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
      </div>
      
      <!-- Präsentationsvorschau für PowerPoint -->
      <div v-else-if="isPowerPoint" class="document-preview__presentation-container">
        <div class="document-preview__slide-preview">
          <img
            v-if="currentSlideUrl"
            :src="currentSlideUrl"
            class="document-preview__slide-image"
            :alt="`Folie ${currentPage}`"
            data-testid="slide-preview"
          />
          <div v-else class="document-preview__slide-placeholder">
            <i class="fa fa-file-powerpoint document-preview__slide-placeholder-icon"></i>
            <p>{{ t('documentPreview.slideNotAvailable', 'Folienvorschau nicht verfügbar') }}</p>
          </div>
        </div>
        
        <div v-if="document?.metadata?.slides" class="document-preview__slide-thumbnails">
          <div
            v-for="(slide, index) in document.metadata.slides"
            :key="index"
            class="document-preview__slide-thumbnail"
            :class="{ 'document-preview__slide-thumbnail--active': currentPage === index + 1 }"
            @click="goToSlide(index + 1)"
            :title="`Folie ${index + 1}`"
          >
            <img
              v-if="slide.thumbnailUrl"
              :src="slide.thumbnailUrl"
              :alt="`Miniaturansicht Folie ${index + 1}`"
              class="document-preview__thumbnail-image"
            />
            <div v-else class="document-preview__thumbnail-number">
              {{ index + 1 }}
            </div>
          </div>
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
          data-testid="fallback-download-btn"
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
          data-testid="hide-metadata-btn"
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
        
        <!-- Erweiterte Metadaten, falls vorhanden -->
        <div 
          v-for="(value, key) in extendedMetadata" 
          :key="key"
          class="document-preview__metadata-item"
        >
          <span class="document-preview__metadata-label">{{ formatMetadataKey(key) }}:</span>
          <span class="document-preview__metadata-value">{{ formatMetadataValue(value) }}</span>
        </div>
      </div>
    </div>
    
    <div v-else-if="document?.metadata" class="document-preview__metadata-collapsed">
      <button 
        @click="showMetadata = true" 
        class="document-preview__metadata-toggle document-preview__metadata-toggle--expand"
        aria-label="Metadaten anzeigen"
        data-testid="show-metadata-btn"
      >
        {{ t('documentPreview.showMetadata', 'Metadaten anzeigen') }}
        <i class="fa fa-chevron-down" aria-hidden="true"></i>
      </button>
    </div>
    
    <!-- Barrierefreiheits-Informationen -->
    <div v-if="isFullscreen" class="document-preview__accessibility-info sr-only" aria-live="polite">
      {{ t('documentPreview.accessibilityFullscreenMode', 'Vollbildmodus aktiviert. Drücken Sie ESC, um den Vollbildmodus zu beenden.') }}
    </div>
    
    <!-- Tastatur-Legende -->
    <div v-if="showKeyboardLegend" class="document-preview__keyboard-legend">
      <h5 class="document-preview__keyboard-legend-title">
        {{ t('documentPreview.keyboardShortcuts', 'Tastaturkürzel') }}
        <button 
          @click="showKeyboardLegend = false" 
          class="document-preview__close-legend-btn"
          aria-label="Tastaturkürzel ausblenden"
        >
          <i class="fa fa-times" aria-hidden="true"></i>
        </button>
      </h5>
      <ul class="document-preview__keyboard-shortcuts">
        <li><kbd>→</kbd> {{ t('documentPreview.keyNext', 'Nächste Seite') }}</li>
        <li><kbd>←</kbd> {{ t('documentPreview.keyPrev', 'Vorherige Seite') }}</li>
        <li><kbd>+</kbd> {{ t('documentPreview.keyZoomIn', 'Vergrößern') }}</li>
        <li><kbd>-</kbd> {{ t('documentPreview.keyZoomOut', 'Verkleinern') }}</li>
        <li><kbd>0</kbd> {{ t('documentPreview.keyZoomReset', 'Zoom zurücksetzen') }}</li>
        <li><kbd>f</kbd> {{ t('documentPreview.keyFullscreen', 'Vollbild umschalten') }}</li>
        <li><kbd>r</kbd> {{ t('documentPreview.keyRotate', 'Dokument drehen (wenn verfügbar)') }}</li>
        <li><kbd>m</kbd> {{ t('documentPreview.keyMetadata', 'Metadaten umschalten') }}</li>
        <li><kbd>Esc</kbd> {{ t('documentPreview.keyClose', 'Schließen/Vollbild beenden') }}</li>
        <li><kbd>?</kbd> {{ t('documentPreview.keyHelp', 'Hilfe anzeigen/ausblenden') }}</li>
      </ul>
    </div>
    
    <button 
      @click="showKeyboardLegend = !showKeyboardLegend" 
      class="document-preview__help-btn"
      :aria-label="showKeyboardLegend ? 'Hilfe ausblenden' : 'Hilfe anzeigen'"
      :title="t('documentPreview.toggleHelp', 'Hilfe anzeigen/ausblenden')"
    >
      <i class="fa fa-question-circle" aria-hidden="true"></i>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { ConversionResult } from '@/types/documentConverter';
import { useI18n } from '@/composables/useI18n';
import { useDocumentConverterStore } from '@/stores/documentConverter';
import hljs from 'highlight.js';

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
const previewContainer = ref<HTMLElement | null>(null);
const showKeyboardLegend = ref(false);
const useSyntaxHighlighting = ref(true);
const highlightedText = ref('');
const rotation = ref(0);
const currentSlideUrl = ref<string | null>(null);
const slideThumbnails = ref<string[]>([]);

// Konstanten
const minZoom = 0.25;
const maxZoom = 5;
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
    png: 'fa fa-file-image',
    jpg: 'fa fa-file-image',
    jpeg: 'fa fa-file-image',
    gif: 'fa fa-file-image',
    bmp: 'fa fa-file-image',
    html: 'fa fa-file-code',
    htm: 'fa fa-file-code',
    txt: 'fa fa-file-alt',
    csv: 'fa fa-file-csv',
    json: 'fa fa-file-code',
    xml: 'fa fa-file-code'
  };
  
  return icons[extension] || 'fa fa-file';
});

const isPdf = computed(() => {
  return props.document?.originalFormat.toLowerCase() === 'pdf';
});

const isImage = computed(() => {
  const format = props.document?.originalFormat.toLowerCase() || '';
  return ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'].includes(format);
});

const isHtml = computed(() => {
  const format = props.document?.originalFormat.toLowerCase() || '';
  return format === 'html' || format === 'htm';
});

const isText = computed(() => {
  const format = props.document?.originalFormat.toLowerCase() || '';
  return ['txt', 'csv', 'json', 'xml', 'md', 'js', 'ts', 'css', 'py', 'java', 'c', 'cpp'].includes(format);
});

const isExcel = computed(() => {
  const format = props.document?.originalFormat.toLowerCase() || '';
  return format === 'xlsx' || format === 'xls' || format === 'csv';
});

const isPowerPoint = computed(() => {
  const format = props.document?.originalFormat.toLowerCase() || '';
  return format === 'pptx' || format === 'ppt';
});

const showPagination = computed(() => {
  return (isPdf.value || isPowerPoint.value) && 
         ((props.document?.metadata?.pageCount || 0) > 1 || totalPages.value > 1);
});

const canRotate = computed(() => {
  return isPdf.value || isImage.value;
});

const contentStyle = computed(() => {
  return {
    'transform': `scale(${zoomLevel.value})`,
    'transform-origin': 'top left'
  };
});

const extendedMetadata = computed(() => {
  if (!props.document?.metadata) return {};
  
  // Filtere die Standardmetadaten heraus
  const standardKeys = ['title', 'author', 'created', 'modified', 'keywords', 'pageCount', 'tables', 'slides'];
  const extended: Record<string, any> = {};
  
  Object.entries(props.document.metadata).forEach(([key, value]) => {
    if (!standardKeys.includes(key) && value !== undefined && value !== null) {
      extended[key] = value;
    }
  });
  
  return extended;
});

// Methoden
function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value;
  
  // Fokus zurück auf den Inhalt setzen
  nextTick(() => {
    if (previewContainer.value) {
      previewContainer.value.focus();
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

function rotateDocument() {
  rotation.value = (rotation.value + 90) % 360;
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

function goToSlide(slideNumber: number) {
  if (slideNumber >= 1 && slideNumber <= totalPages.value) {
    currentPage.value = slideNumber;
    navigateToPage(slideNumber);
  }
}

function handlePageInput() {
  if (currentPage.value < 1) {
    currentPage.value = 1;
  } else if (currentPage.value > totalPages.value) {
    currentPage.value = totalPages.value;
  }
  
  navigateToPage(currentPage.value);
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
  
  // PowerPoint-spezifische Navigation
  if (isPowerPoint.value && props.document?.metadata?.slides) {
    const slideIndex = page - 1;
    if (props.document.metadata.slides[slideIndex]) {
      currentSlideUrl.value = props.document.metadata.slides[slideIndex].url || null;
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

// Tabellenexport
function exportTable(table: any, format: 'csv' | 'json') {
  if (!table || !table.data) return;
  
  let content: string = '';
  let filename: string = `table_export_${Date.now()}`;
  let mimeType: string = '';
  
  if (format === 'csv') {
    // CSV Format generieren
    const headers = table.headers || [];
    const rows = table.data || [];
    
    // Zuerst die Header, falls vorhanden
    if (headers.length > 0) {
      content += headers.map(escape).join(',') + '\n';
    }
    
    // Dann die Datenzeilen
    content += rows.map(row => row.map(escape).join(',')).join('\n');
    
    filename += '.csv';
    mimeType = 'text/csv';
  } else if (format === 'json') {
    // JSON Format generieren
    const headers = table.headers || [];
    const rows = table.data || [];
    
    let jsonData: any[] = [];
    
    // Mit Header-Informationen
    if (headers.length > 0) {
      jsonData = rows.map(row => {
        const obj: Record<string, string> = {};
        headers.forEach((header: string, index: number) => {
          if (index < row.length) {
            obj[header] = row[index];
          }
        });
        return obj;
      });
    } else {
      // Ohne Header-Informationen
      jsonData = rows.map(row => [...row]);
    }
    
    content = JSON.stringify(jsonData, null, 2);
    filename += '.json';
    mimeType = 'application/json';
  }
  
  // Datei herunterladen
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  
  // Ressourcen aufräumen
  URL.revokeObjectURL(url);
  
  // Hilfsfunktion zum Escapen von CSV-Werten
  function escape(value: string): string {
    if (value === null || value === undefined) return '';
    
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }
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

function formatMetadataKey(key: string): string {
  // Camel-Case in lesbaren Text umwandeln
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

function formatMetadataValue(value: any): string {
  if (value === null || value === undefined) return '';
  
  if (value instanceof Date) {
    return formatDate(value);
  }
  
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  
  return String(value);
}

function applySyntaxHighlighting() {
  if (!textContent.value) return;
  
  try {
    // Dateiendung für automatische Spracherkennung extrahieren
    const format = props.document?.originalFormat.toLowerCase() || '';
    
    // Code-Block mit Syntax-Highlighting rendern
    const result = hljs.highlightAuto(textContent.value, [format]);
    highlightedText.value = `<pre><code class="hljs ${format}">${result.value}</code></pre>`;
  } catch (err) {
    // Fallback bei Fehlern
    console.warn('Syntax-Highlighting fehlgeschlagen:', err);
    useSyntaxHighlighting.value = false;
  }
}

// Event-Handler
function handlePdfLoad() {
  loading.value = false;
  
  // Kommunikation mit dem PDF.js Frame einrichten
  if (pdfFrame.value && pdfFrame.value.contentWindow) {
    window.addEventListener('message', handlePdfMessage);
  }
}

function handlePdfMessage(event: MessageEvent) {
  // Nachrichten vom PDF.js-Viewer verarbeiten
  if (event.data && event.data.type === 'pdf-info') {
    totalPages.value = event.data.numPages || 1;
  }
  
  if (event.data && event.data.type === 'page-change') {
    currentPage.value = event.data.page || 1;
  }
}

function handleImageLoad() {
  loading.value = false;
  totalPages.value = 1; // Bilder haben nur eine Seite
}

// Tastaturnavigation
function handleKeyboardNavigation(event: KeyboardEvent) {
  // Nicht reagieren, wenn ein Eingabefeld fokussiert ist
  if (
    document.activeElement?.tagName === 'INPUT' ||
    document.activeElement?.tagName === 'TEXTAREA' ||
    // Nicht reagieren, wenn Strg-, Alt- oder Umschalttaste gedrückt ist
    event.ctrlKey || event.altKey || event.shiftKey
  ) {
    return;
  }
  
  switch (event.key) {
    case '?':
      showKeyboardLegend.value = !showKeyboardLegend.value;
      event.preventDefault();
      break;
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
    case 'r':
      if (canRotate.value) {
        rotateDocument();
        event.preventDefault();
      }
      break;
    case 'm':
      showMetadata.value = !showMetadata.value;
      event.preventDefault();
      break;
    case 'Escape':
      if (isFullscreen.value) {
        toggleFullscreen();
      } else if (showKeyboardLegend.value) {
        showKeyboardLegend.value = false;
      } else {
        closePreview();
      }
      event.preventDefault();
      break;
  }
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
      if (useSyntaxHighlighting.value) {
        applySyntaxHighlighting();
      }
      loading.value = false;
      return;
    }
    
    // PowerPoint-Folien laden
    if (isPowerPoint.value && props.document.metadata?.slides) {
      totalPages.value = props.document.metadata.slides.length;
      if (totalPages.value > 0) {
        currentPage.value = 1;
        currentSlideUrl.value = props.document.metadata.slides[0].url || null;
      }
      
      // Thumbnails für die Folien laden
      slideThumbnails.value = props.document.metadata.slides
        .map(slide => slide.thumbnailUrl || '')
        .filter(url => url);
      
      loading.value = false;
      return;
    }
    
    // PDF, Bilder oder HTML über URL anzeigen
    const response = await store.getDocumentContent(props.document.id);
    
    if (response.blob) {
      // Blob URL erstellen
      documentUrl.value = URL.createObjectURL(response.blob);
      
      // Für PDFs die Seitenzahl ermitteln
      if (isPdf.value && props.document.metadata?.pageCount) {
        totalPages.value = props.document.metadata.pageCount;
      }
      
      // Verzögerung für die Anzeige von Bildern, die sofort laden können
      if (isImage.value) {
        setTimeout(() => {
          loading.value = false;
        }, 300);
      } else {
        // Bei PDFs und HTML wird das onload-Event im iframe verarbeitet
        setTimeout(() => {
          // Fallback, falls onload nicht ausgelöst wird
          if (loading.value) {
            loading.value = false;
          }
        }, 5000);
      }
    } else if (response.content) {
      // Textinhalt anzeigen
      textContent.value = response.content;
      if (useSyntaxHighlighting.value && isText.value) {
        applySyntaxHighlighting();
      }
      loading.value = false;
    } else {
      throw new Error(t('documentPreview.contentNotAvailable', 'Dokumentinhalt nicht verfügbar.'));
    }
  } catch (err) {
    console.error('Fehler beim Laden des Dokuments:', err);
    error.value = err instanceof Error ? err.message : String(err);
    loading.value = false;
  }
}

// Lebenszyklusmethoden
onMounted(() => {
  loadDocumentContent();
  
  // Fokus auf den Container setzen
  if (previewContainer.value) {
    previewContainer.value.focus();
  }
  
  // PDF-Nachrichten-Listener
  window.addEventListener('message', handlePdfMessage);
});

onBeforeUnmount(() => {
  // Aufräumen
  if (documentUrl.value) {
    URL.revokeObjectURL(documentUrl.value);
  }
  
  document.removeEventListener('keydown', handleEscapeKey);
  window.removeEventListener('message', handlePdfMessage);
});

// Beobachter für Änderungen des Dokuments
watch(() => props.document, () => {
  if (props.document) {
    // Zurücksetzen des Zustands
    zoomLevel.value = 1;
    currentPage.value = 1;
    rotation.value = 0;
    textContent.value = null;
    highlightedText.value = '';
    showKeyboardLegend.value = false;
    currentSlideUrl.value = null;
    
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
  outline: none;
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

.document-preview__control-btn:focus {
  outline: none;
  box-shadow: 0 0 0 2px #4a6cf7;
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

.document-preview__page-selector {
  display: flex;
  align-items: center;
  font-size: 0.85rem;
  color: #6c757d;
}

.document-preview__page-input {
  width: 40px;
  text-align: center;
  border: 1px solid #ced4da;
  border-radius: 4px;
  padding: 0.25rem;
  font-size: 0.85rem;
}

.document-preview__page-separator {
  margin: 0 0.25rem;
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

.document-preview__pdf-container--rotated,
.document-preview__image-container--rotated {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

.document-preview__pdf-frame,
.document-preview__html-frame {
  width: 100%;
  height: 100%;
  min-height: 100%;
  border: none;
}

.document-preview__image-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
}

.document-preview__image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  transition: transform 0.3s ease;
}

.document-preview__text-container {
  width: 100%;
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 1rem;
  max-width: 800px;
  margin: 0 auto;
  overflow: auto;
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

.document-preview__text-content pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  max-width: 100%;
}

.document-preview__highlighted-text {
  font-family: monospace;
  font-size: 0.9rem;
  overflow: auto;
  line-height: 1.5;
}

.document-preview__table-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  max-width: 100%;
  margin: 0 auto;
}

.document-preview__table-wrapper {
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.document-preview__table-title {
  margin-top: 0;
  margin-bottom: 0.75rem;
  font-size: 1rem;
  color: #343a40;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.document-preview__table-page {
  font-size: 0.85rem;
  color: #6c757d;
  font-weight: normal;
}

.document-preview__table-actions {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.document-preview__table-action-btn {
  background-color: #f8f9fa;
  border: 1px solid #ced4da;
  border-radius: 4px;
  padding: 0.25rem 0.5rem;
  font-size: 0.8rem;
  color: #495057;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  transition: all 0.2s;
}

.document-preview__table-action-btn:hover {
  background-color: #e9ecef;
  border-color: #adb5bd;
}

.document-preview__table-action-btn i {
  font-size: 0.9rem;
}

.document-preview__table-scrollable {
  width: 100%;
  overflow-x: auto;
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
  font-size: 0.9rem;
}

.document-preview__table th {
  background-color: #f8f9fa;
  font-weight: 600;
  position: sticky;
  top: 0;
  z-index: 1;
}

.document-preview__table tbody tr:nth-child(even) {
  background-color: #f8f9fa;
}

/* Präsentationsvorschau für PowerPoint */
.document-preview__presentation-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.document-preview__slide-preview {
  width: 100%;
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 1rem;
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.document-preview__slide-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.document-preview__slide-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: #6c757d;
}

.document-preview__slide-placeholder-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  color: #adb5bd;
}

.document-preview__slide-thumbnails {
  display: flex;
  flex-wrap: nowrap;
  overflow-x: auto;
  padding: 0.5rem;
  gap: 0.5rem;
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.document-preview__slide-thumbnail {
  width: 80px;
  height: 60px;
  flex-shrink: 0;
  border: 2px solid transparent;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f8f9fa;
}

.document-preview__slide-thumbnail--active {
  border-color: #4a6cf7;
  box-shadow: 0 0 0 2px rgba(74, 108, 247, 0.3);
}

.document-preview__thumbnail-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.document-preview__thumbnail-number {
  font-size: 0.9rem;
  font-weight: 600;
  color: #6c757d;
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

/* Tastaturkürzel-Legende */
.document-preview__keyboard-legend {
  position: absolute;
  bottom: 3.5rem;
  right: 1rem;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 1rem;
  width: 280px;
  z-index: 10;
}

.document-preview__keyboard-legend-title {
  margin: 0 0 0.75rem;
  font-size: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.document-preview__close-legend-btn {
  background: none;
  border: none;
  color: #6c757d;
  cursor: pointer;
  padding: 0.25rem;
  font-size: 0.9rem;
}

.document-preview__keyboard-shortcuts {
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 0.85rem;
}

.document-preview__keyboard-shortcuts li {
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
}

kbd {
  display: inline-block;
  padding: 0.2rem 0.4rem;
  font-size: 0.75rem;
  font-family: monospace;
  line-height: 1;
  color: #212529;
  background-color: #f8f9fa;
  border: 1px solid #ced4da;
  border-radius: 3px;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.2);
  margin-right: 0.75rem;
  min-width: 1.5rem;
  text-align: center;
}

.document-preview__help-btn {
  position: absolute;
  bottom: 1rem;
  right: 1rem;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: #4a6cf7;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  z-index: 5;
}

.document-preview__help-btn:hover {
  background-color: #3a5be7;
}

/* Screen reader only class */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
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
  
  .document-preview__keyboard-legend {
    left: 1rem;
    right: 1rem;
    width: auto;
  }
}

/* Höhere DPI-Geräte */
@media (min-resolution: 192dpi) {
  .document-preview__keyboard-shortcuts {
    font-size: 0.85rem;
  }
  
  .document-preview__control-btn {
    width: 36px;
    height: 36px;
  }
}

/* Dunkelmodus-Unterstützung */
@media (prefers-color-scheme: dark) {
  .document-preview.dark-mode {
    background-color: #212529;
    color: #e9ecef;
  }
  
  .document-preview.dark-mode .document-preview__header,
  .document-preview.dark-mode .document-preview__toolbar {
    background-color: #343a40;
    border-color: #495057;
  }
  
  .document-preview.dark-mode .document-preview__file-name,
  .document-preview.dark-mode .document-preview__metadata-title {
    color: #e9ecef;
  }
  
  .document-preview.dark-mode .document-preview__content {
    background-color: #2c3034;
  }
  
  .document-preview.dark-mode .document-preview__text-container,
  .document-preview.dark-mode .document-preview__table-wrapper,
  .document-preview.dark-mode .document-preview__metadata {
    background-color: #343a40;
    color: #e9ecef;
  }
  
  .document-preview.dark-mode .document-preview__table th,
  .document-preview.dark-mode .document-preview__table td {
    border-color: #495057;
  }
  
  .document-preview.dark-mode .document-preview__table th {
    background-color: #495057;
  }
  
  .document-preview.dark-mode .document-preview__keyboard-legend {
    background-color: #343a40;
    color: #e9ecef;
  }
  
  .document-preview.dark-mode kbd {
    background-color: #495057;
    color: #e9ecef;
    border-color: #6c757d;
  }
}
</style>