<template>
  <div 
    class="document-list"
    role="region"
    aria-labelledby="document-list-title"
  >
    <div class="document-list-header">
      <h3 id="document-list-title">{{ $t('documentList.title') }}</h3>
      
      <div class="document-list-actions">
        <div class="filter-container">
          <label for="status-filter" class="sr-only">{{ $t('documentList.statusFilter') }}</label>
          <select 
            id="status-filter" 
            v-model="statusFilter" 
            class="status-filter"
            aria-label="Status Filter"
          >
            <option value="">{{ $t('documentList.allStatuses') }}</option>
            <option value="success">{{ $t('documentList.statusSuccess') }}</option>
            <option value="error">{{ $t('documentList.statusError') }}</option>
            <option value="pending">{{ $t('documentList.statusPending') }}</option>
            <option value="processing">{{ $t('documentList.statusProcessing') }}</option>
          </select>
        </div>
        
        <div class="filter-container">
          <label for="format-filter" class="sr-only">{{ $t('documentList.formatFilter') }}</label>
          <select 
            id="format-filter" 
            v-model="formatFilter" 
            class="format-filter"
            aria-label="Format Filter"
          >
            <option value="">{{ $t('documentList.allFormats') }}</option>
            <option v-for="format in supportedFormats" :key="format" :value="format">
              {{ format.toUpperCase() }}
            </option>
          </select>
        </div>
        
        <div class="sort-container">
          <label for="sort-by" class="sr-only">{{ $t('documentList.sortBy') }}</label>
          <select 
            id="sort-by" 
            v-model="sortBy" 
            class="sort-by"
            aria-label="Sort By"
          >
            <option value="name">{{ $t('documentList.sortByName') }}</option>
            <option value="date">{{ $t('documentList.sortByDate') }}</option>
            <option value="size">{{ $t('documentList.sortBySize') }}</option>
            <option value="format">{{ $t('documentList.sortByFormat') }}</option>
          </select>
          
          <button 
            @click="toggleSortDirection"
            class="sort-direction"
            :title="sortDirection === 'asc' ? $t('documentList.sortAscending') : $t('documentList.sortDescending')"
            aria-label="Toggle Sort Direction"
          >
            <i :class="sortDirection === 'asc' ? 'fa fa-sort-up' : 'fa fa-sort-down'"></i>
          </button>
        </div>
        
        <div class="search-container">
          <label for="search-input" class="sr-only">{{ $t('documentList.search') }}</label>
          <div class="search-input-wrapper">
            <input 
              id="search-input"
              type="text" 
              v-model="searchQuery" 
              :placeholder="$t('documentList.searchPlaceholder')" 
              class="search-input"
              aria-label="Search documents"
            />
            <button 
              v-if="searchQuery"
              @click="clearSearch"
              class="clear-search-btn"
              aria-label="Clear search"
            >
              <i class="fa fa-times"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Loading state -->
    <div 
      v-if="loading" 
      class="loading-indicator"
      role="status"
      aria-live="polite"
    >
      <div class="spinner" aria-hidden="true"></div>
      <p>{{ $t('documentList.loading') }}</p>
    </div>
    
    <!-- Empty state -->
    <div 
      v-else-if="filteredAndSortedDocuments.length === 0" 
      class="empty-state"
      role="status"
      aria-live="polite"
    >
      <p v-if="documents.length === 0">
        {{ $t('documentList.noDocuments') }}
      </p>
      <p v-else>
        {{ $t('documentList.noMatchingDocuments') }}
      </p>
      <button 
        @click="clearFilters" 
        class="clear-filters-btn"
      >
        {{ $t('documentList.clearFilters') }}
      </button>
    </div>
    
    <!-- Document list -->
    <ul 
      v-else 
      class="document-items"
      role="list"
      aria-label="Converted documents list"
    >
      <li 
        v-for="document in paginatedDocuments" 
        :key="document.id" 
        class="document-item"
        :class="{ 
          'document-item--selected': selectedDocument?.id === document.id,
          [`document-item--${document.status}`]: true 
        }"
        role="listitem"
        :aria-selected="selectedDocument?.id === document.id"
        @click="selectDocument(document)"
        @keydown.enter="selectDocument(document)"
        @keydown.space="selectDocument(document)"
        @keydown.delete="handleKeyboardDelete(document)"
        tabindex="0"
      >
        <div 
          class="document-icon" 
          :class="`document-icon--${document.originalFormat}`"
          aria-hidden="true"
        >
          <i :class="getFormatIcon(document.originalFormat)"></i>
        </div>
        
        <div class="document-info">
          <h4 class="document-name">{{ document.originalName }}</h4>
          
          <div class="document-meta">
            <span class="document-format">
              <span class="meta-label" aria-hidden="true">{{ $t('documentList.format') }}:</span>
              <span>{{ document.originalFormat.toUpperCase() }}</span>
            </span>
            
            <span class="document-size">
              <span class="meta-label" aria-hidden="true">{{ $t('documentList.size') }}:</span>
              <span>{{ formatFileSize(document.size) }}</span>
            </span>
            
            <span class="document-date">
              <span class="meta-label" aria-hidden="true">{{ $t('documentList.date') }}:</span>
              <span>{{ formatDate(document.convertedAt || document.uploadedAt) }}</span>
            </span>
          </div>
          
          <div 
            v-if="document.status" 
            class="document-status"
            :class="`document-status--${document.status}`"
          >
            <span v-if="document.status === 'success'" class="status-icon">
              <i class="fa fa-check-circle"></i>
            </span>
            <span v-else-if="document.status === 'error'" class="status-icon">
              <i class="fa fa-exclamation-circle"></i>
            </span>
            <span v-else-if="document.status === 'pending'" class="status-icon">
              <i class="fa fa-clock"></i>
            </span>
            <span v-else-if="document.status === 'processing'" class="status-icon">
              <i class="fa fa-spinner fa-spin"></i>
            </span>
            
            <span class="status-text">{{ getStatusText(document.status) }}</span>
            
            <span v-if="document.error" class="status-error-message">
              {{ document.error }}
            </span>
          </div>
        </div>
        
        <div class="document-actions">
          <button 
            @click.stop="viewDocument(document)" 
            class="action-btn" 
            :disabled="document.status !== 'success'"
            :aria-label="$t('documentList.viewDocument', { name: document.originalName })"
            :title="$t('documentList.viewDocument', { name: document.originalName })"
          >
            <i class="fa fa-eye" aria-hidden="true"></i>
          </button>
          
          <button 
            @click.stop="downloadDocument(document)" 
            class="action-btn" 
            :disabled="document.status !== 'success'"
            :aria-label="$t('documentList.downloadDocument', { name: document.originalName })"
            :title="$t('documentList.downloadDocument', { name: document.originalName })"
          >
            <i class="fa fa-download" aria-hidden="true"></i>
          </button>
          
          <button 
            @click.stop="confirmDelete(document)" 
            class="action-btn action-btn--danger"
            :aria-label="$t('documentList.deleteDocument', { name: document.originalName })"
            :title="$t('documentList.deleteDocument', { name: document.originalName })"
          >
            <i class="fa fa-trash" aria-hidden="true"></i>
          </button>
        </div>
      </li>
    </ul>
    
    <!-- Pagination -->
    <div 
      v-if="totalPages > 1" 
      class="pagination"
      role="navigation"
      aria-label="Pagination controls"
    >
      <button 
        @click="prevPage" 
        :disabled="currentPage === 1"
        class="pagination-btn"
        aria-label="Previous page"
      >
        <i class="fa fa-chevron-left" aria-hidden="true"></i>
        <span>{{ $t('documentList.prevPage') }}</span>
      </button>
      
      <span class="pagination-info" aria-live="polite">
        {{ $t('documentList.pageInfo', { current: currentPage, total: totalPages }) }}
      </span>
      
      <button 
        @click="nextPage" 
        :disabled="currentPage === totalPages"
        class="pagination-btn"
        aria-label="Next page"
      >
        <span>{{ $t('documentList.nextPage') }}</span>
        <i class="fa fa-chevron-right" aria-hidden="true"></i>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { ConversionResult, SupportedFormat } from '@/types/documentConverter';
import { useDialog } from '@/composables/useDialog';

// Interface für Props
interface Props {
  documents: ConversionResult[];
  selectedDocument: ConversionResult | null;
  loading: boolean;
  supportedFormats?: SupportedFormat[];
}

// Props-Definition
const props = withDefaults(defineProps<Props>(), {
  documents: () => [],
  selectedDocument: null,
  loading: false,
  supportedFormats: () => ['pdf', 'docx', 'xlsx', 'pptx', 'html', 'txt']
});

// Event-Emitter
const emit = defineEmits<{
  (e: 'select', documentId: string): void;
  (e: 'view', documentId: string): void;
  (e: 'download', documentId: string): void;
  (e: 'delete', documentId: string): void;
}>();

// Dialog-Dienst für Bestätigungsdialoge
const dialog = useDialog();

// Zustandsvariablen
const searchQuery = ref('');
const statusFilter = ref('');
const formatFilter = ref('');
const currentPage = ref(1);
const itemsPerPage = ref(10);
const sortBy = ref<'name' | 'date' | 'size' | 'format'>('date');
const sortDirection = ref<'asc' | 'desc'>('desc');

/**
 * Gefilterte und sortierte Dokumente
 */
const filteredAndSortedDocuments = computed(() => {
  // Filter anwenden
  let result = props.documents.filter(doc => {
    // Suchwort filtern
    const matchesSearch = !searchQuery.value || 
      doc.originalName.toLowerCase().includes(searchQuery.value.toLowerCase());
    
    // Format filtern
    const matchesFormat = !formatFilter.value || 
      doc.originalFormat === formatFilter.value;
    
    // Status filtern
    const matchesStatus = !statusFilter.value || 
      doc.status === statusFilter.value;
    
    return matchesSearch && matchesFormat && matchesStatus;
  });
  
  // Sortierung anwenden
  return result.sort((a, b) => {
    let comparison = 0;
    
    // Nach Eigenschaft sortieren
    if (sortBy.value === 'name') {
      comparison = a.originalName.localeCompare(b.originalName);
    } 
    else if (sortBy.value === 'date') {
      const dateA = a.convertedAt || a.uploadedAt || new Date(0);
      const dateB = b.convertedAt || b.uploadedAt || new Date(0);
      comparison = (dateA instanceof Date ? dateA : new Date(dateA)).getTime() - 
                  (dateB instanceof Date ? dateB : new Date(dateB)).getTime();
    } 
    else if (sortBy.value === 'size') {
      comparison = (a.size || 0) - (b.size || 0);
    } 
    else if (sortBy.value === 'format') {
      comparison = a.originalFormat.localeCompare(b.originalFormat);
    }
    
    // Sortierrichtung berücksichtigen
    return sortDirection.value === 'asc' ? comparison : -comparison;
  });
});

/**
 * Anzahl der Seiten für die Paginierung
 */
const totalPages = computed(() => {
  return Math.max(1, Math.ceil(filteredAndSortedDocuments.value.length / itemsPerPage.value));
});

/**
 * Dokumente für die aktuelle Seite
 */
const paginatedDocuments = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return filteredAndSortedDocuments.value.slice(start, end);
});

/**
 * Wählt ein Dokument aus
 */
function selectDocument(document: ConversionResult): void {
  emit('select', document.id);
}

/**
 * Zeigt ein Dokument an
 */
function viewDocument(document: ConversionResult): void {
  if (document.status === 'success') {
    emit('view', document.id);
  }
}

/**
 * Lädt ein Dokument herunter
 */
function downloadDocument(document: ConversionResult): void {
  if (document.status === 'success') {
    emit('download', document.id);
  }
}

/**
 * Bestätigt das Löschen eines Dokuments und führt es bei Bestätigung durch
 */
async function confirmDelete(document: ConversionResult): Promise<void> {
  const confirmed = await dialog.confirm({
    title: $t('documentList.deleteConfirmTitle'),
    message: $t('documentList.deleteConfirmMessage', { name: document.originalName }),
    type: 'warning',
    confirmButtonText: $t('documentList.delete'),
    cancelButtonText: $t('documentList.cancel')
  });
  
  if (confirmed) {
    deleteDocument(document);
  }
}

/**
 * Löscht ein Dokument
 */
function deleteDocument(document: ConversionResult): void {
  emit('delete', document.id);
}

/**
 * Leert alle Filter und setzt die Suche zurück
 */
function clearFilters(): void {
  searchQuery.value = '';
  statusFilter.value = '';
  formatFilter.value = '';
  currentPage.value = 1;
}

/**
 * Leert nur die Suche
 */
function clearSearch(): void {
  searchQuery.value = '';
}

/**
 * Ändert die Sortierrichtung
 */
function toggleSortDirection(): void {
  sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
}

/**
 * Wechselt zur vorherigen Seite
 */
function prevPage(): void {
  if (currentPage.value > 1) {
    currentPage.value--;
  }
}

/**
 * Wechselt zur nächsten Seite
 */
function nextPage(): void {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
  }
}

/**
 * Liefert das passende Icon für ein Dateiformat
 */
function getFormatIcon(format: string): string {
  const icons: Record<string, string> = {
    pdf: 'fa fa-file-pdf',
    docx: 'fa fa-file-word',
    xlsx: 'fa fa-file-excel',
    pptx: 'fa fa-file-powerpoint',
    html: 'fa fa-file-code',
    txt: 'fa fa-file-alt'
  };
  
  return icons[format] || 'fa fa-file';
}

/**
 * Formatiert die Dateigröße benutzerfreundlich
 */
function formatFileSize(bytes?: number): string {
  if (!bytes) return '0 Bytes';
  
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i)) + ' ' + sizes[i];
}

/**
 * Formatiert ein Datum benutzerfreundlich
 */
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

/**
 * Liefert den Text für einen Status
 */
function getStatusText(status: string): string {
  const statusTexts: Record<string, string> = {
    success: $t('documentList.statusSuccess'),
    error: $t('documentList.statusError'),
    pending: $t('documentList.statusPending'),
    processing: $t('documentList.statusProcessing')
  };
  
  return statusTexts[status] || status;
}

/**
 * Behandelt Löschen-Tastendruck für Dokumente
 */
function handleKeyboardDelete(document: ConversionResult): void {
  confirmDelete(document);
}

// i18n-Fallback für Texte
function $t(key: string, params: Record<string, any> = {}): string {
  const messages: Record<string, string> = {
    'documentList.title': 'Konvertierte Dokumente',
    'documentList.statusFilter': 'Nach Status filtern',
    'documentList.allStatuses': 'Alle Status',
    'documentList.statusSuccess': 'Erfolgreich',
    'documentList.statusError': 'Fehler',
    'documentList.statusPending': 'Ausstehend',
    'documentList.statusProcessing': 'In Bearbeitung',
    'documentList.formatFilter': 'Nach Format filtern',
    'documentList.allFormats': 'Alle Formate',
    'documentList.sortBy': 'Sortieren nach',
    'documentList.sortByName': 'Name',
    'documentList.sortByDate': 'Datum',
    'documentList.sortBySize': 'Größe',
    'documentList.sortByFormat': 'Format',
    'documentList.sortAscending': 'Aufsteigend sortieren',
    'documentList.sortDescending': 'Absteigend sortieren',
    'documentList.search': 'Suchen',
    'documentList.searchPlaceholder': 'Dokumente durchsuchen...',
    'documentList.format': 'Format',
    'documentList.size': 'Größe',
    'documentList.date': 'Datum',
    'documentList.loading': 'Lade Dokumente...',
    'documentList.noDocuments': 'Keine Dokumente gefunden. Laden Sie Dokumente hoch, um sie zu konvertieren.',
    'documentList.noMatchingDocuments': 'Keine Dokumente entsprechen Ihren Filterkriterien.',
    'documentList.clearFilters': 'Filter zurücksetzen',
    'documentList.viewDocument': 'Dokument anzeigen: {name}',
    'documentList.downloadDocument': 'Dokument herunterladen: {name}',
    'documentList.deleteDocument': 'Dokument löschen: {name}',
    'documentList.deleteConfirmTitle': 'Dokument löschen',
    'documentList.deleteConfirmMessage': 'Sind Sie sicher, dass Sie das Dokument "{name}" löschen möchten?',
    'documentList.delete': 'Löschen',
    'documentList.cancel': 'Abbrechen',
    'documentList.prevPage': 'Zurück',
    'documentList.nextPage': 'Weiter',
    'documentList.pageInfo': 'Seite {current} von {total}'
  };
  
  let message = messages[key] || key;
  
  // Parameter ersetzen
  Object.entries(params).forEach(([param, value]) => {
    message = message.replace(new RegExp(`\\{${param}\\}`, 'g'), String(value));
  });
  
  return message;
}

// Beobachter für Filter und Sortierung - Zurücksetzen der Seitennummer
watch([searchQuery, statusFilter, formatFilter, sortBy, sortDirection], () => {
  currentPage.value = 1;
});
</script>

<style scoped>
/* Basisstile */
.document-list {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  overflow: hidden;
}

/* Header und Aktionen */
.document-list-header {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

@media (min-width: 768px) {
  .document-list-header {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
}

.document-list-header h3 {
  margin: 0;
  font-size: 1.25rem;
  color: #343a40;
}

.document-list-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
}

/* Filter und Suchfeld */
.search-input, 
.format-filter,
.status-filter,
.sort-by {
  padding: 0.5rem;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 0.9rem;
  min-width: 120px;
}

.search-input {
  min-width: 200px;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.clear-search-btn {
  position: absolute;
  right: 8px;
  background: none;
  border: none;
  color: #6c757d;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
}

.clear-search-btn:hover {
  color: #343a40;
}

.sort-container {
  display: flex;
  align-items: center;
}

.sort-direction {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6c757d;
}

.sort-direction:hover {
  color: #343a40;
}

/* Dokumentenliste */
.document-items {
  list-style: none;
  padding: 0;
  margin: 0;
  border-top: 1px solid #e9ecef;
}

.document-item {
  display: flex;
  align-items: flex-start;
  padding: 1rem;
  border-bottom: 1px solid #e9ecef;
  cursor: pointer;
  transition: background-color 0.2s;
}

.document-item:hover {
  background-color: #f8f9fa;
}

.document-item:focus {
  outline: 2px solid #4a6cf7;
  outline-offset: -2px;
}

.document-item--selected {
  background-color: #e7f5ff;
}

/* Status-spezifische Stile */
.document-item--error {
  border-left: 3px solid #dc3545;
}

.document-item--success {
  border-left: 3px solid #28a745;
}

.document-item--pending {
  border-left: 3px solid #6c757d;
}

.document-item--processing {
  border-left: 3px solid #fd7e14;
}

/* Dokument-Icon */
.document-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  margin-right: 1rem;
  color: white;
  flex-shrink: 0;
}

.document-icon--pdf { background-color: #e74c3c; }
.document-icon--docx { background-color: #3498db; }
.document-icon--xlsx { background-color: #2ecc71; }
.document-icon--pptx { background-color: #e67e22; }
.document-icon--html { background-color: #9b59b6; }
.document-icon--txt { background-color: #95a5a6; }

/* Dokument-Informationen */
.document-info {
  flex: 1;
  min-width: 0; /* Für Textüberlauf */
}

.document-name {
  margin: 0 0 0.25rem;
  font-size: 1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.document-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  font-size: 0.85rem;
  color: #6c757d;
  margin-bottom: 0.5rem;
}

.meta-label {
  font-weight: 500;
  margin-right: 0.25rem;
}

/* Status-Anzeige */
.document-status {
  display: flex;
  align-items: center;
  font-size: 0.85rem;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.document-status--success {
  color: #28a745;
}

.document-status--error {
  color: #dc3545;
}

.document-status--pending {
  color: #6c757d;
}

.document-status--processing {
  color: #fd7e14;
}

.status-error-message {
  margin-left: 0.5rem;
  font-style: italic;
}

/* Aktionen */
.document-actions {
  display: flex;
  gap: 0.5rem;
  margin-left: 1rem;
}

.action-btn {
  background: none;
  border: none;
  cursor: pointer;
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  color: #6c757d;
  transition: background-color 0.2s, color 0.2s;
}

.action-btn:hover {
  background-color: #e9ecef;
  color: #343a40;
}

.action-btn:focus {
  outline: 2px solid #4a6cf7;
  outline-offset: 2px;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn--danger:hover {
  background-color: #fee2e2;
  color: #dc3545;
}

/* Leerer Zustand */
.empty-state {
  padding: 2rem;
  text-align: center;
  color: #6c757d;
  border: 1px dashed #ced4da;
  border-radius: 4px;
  margin-top: 1rem;
}

.clear-filters-btn {
  margin-top: 0.75rem;
  padding: 0.5rem 1rem;
  background-color: #e9ecef;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.clear-filters-btn:hover {
  background-color: #ced4da;
}

/* Ladeindikator */
.loading-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  color: #6c757d;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e9ecef;
  border-top: 3px solid #4a6cf7;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

/* Paginierung */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 1.5rem;
  gap: 1rem;
}

.pagination-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: #f8f9fa;
  border: 1px solid #ced4da;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.pagination-btn:hover:not(:disabled) {
  background-color: #e9ecef;
}

.pagination-btn:focus {
  outline: 2px solid #4a6cf7;
  outline-offset: 2px;
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-info {
  font-size: 0.9rem;
  color: #6c757d;
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

/* Animation */
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>