// ConversionResults.vue
<template>
  <div class="conversion-results">
    <div class="results-header">
      <h3 class="results-title">Konvertierte Dokumente ({{ results.length }})</h3>
      <div class="results-actions">
        <button 
          v-if="results.length > 0" 
          class="clear-button"
          @click="$emit('clear-all')"
        >
          <i class="fas fa-trash-alt"></i>
          Alle löschen
        </button>
      </div>
    </div>
    
    <div v-if="results.length === 0" class="no-results">
      <p>Keine Konvertierungsergebnisse vorhanden</p>
    </div>
    
    <div v-else class="results-table-container">
      <table class="results-table">
        <thead>
          <tr>
            <th>Dateiname</th>
            <th>Status</th>
            <th>Größe</th>
            <th>Datum</th>
            <th>Aktionen</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="result in sortedResults" :key="result.id" class="result-row">
            <td class="file-name-cell">
              <div class="file-icon-name">
                <i :class="getFileIcon(result.fileName)"></i>
                <span class="file-name">{{ result.fileName }}</span>
              </div>
            </td>
            <td>
              <span :class="['status-badge', `status-${result.status}`]">
                {{ getStatusText(result.status) }}
              </span>
            </td>
            <td>{{ formatFileSize(result.fileSize) }}</td>
            <td>{{ formatDate(result.timestamp) }}</td>
            <td class="actions-cell">
              <button 
                class="action-button view-button" 
                @click="$emit('view-result', result)"
                title="Vorschau anzeigen"
                :disabled="result.status !== 'completed'"
              >
                <i class="fas fa-eye"></i>
              </button>
              <button 
                class="action-button download-button" 
                @click="$emit('download-result', result)"
                title="Herunterladen"
                :disabled="result.status !== 'completed'"
              >
                <i class="fas fa-download"></i>
              </button>
              <button 
                class="action-button delete-button" 
                @click="$emit('delete-result', result)"
                title="Löschen"
              >
                <i class="fas fa-trash"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

// Props
const props = defineProps({
  results: {
    type: Array,
    default: () => []
  }
});

// Emits
defineEmits(['view-result', 'download-result', 'delete-result', 'clear-all']);

// Sortierte Ergebnisse nach Datum (neueste zuerst)
const sortedResults = computed(() => {
  return [...props.results].sort((a, b) => b.timestamp - a.timestamp);
});

// Dateigröße formatieren
const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  } else if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  } else if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  } else {
    return `${bytes} B`;
  }
};

// Datum formatieren
const formatDate = (timestamp) => {
  if (!timestamp) return 'Unbekannt';
  
  const date = new Date(timestamp * 1000);
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

// Status-Text abrufen
const getStatusText = (status) => {
  const statusMap = {
    'completed': 'Abgeschlossen',
    'processing': 'Wird verarbeitet',
    'failed': 'Fehlgeschlagen',
    'queued': 'In Warteschlange'
  };
  
  return statusMap[status] || status;
};

// Datei-Icon basierend auf Dateiendung bestimmen
const getFileIcon = (fileName) => {
  if (!fileName) return 'fas fa-file';
  
  const extension = fileName.split('.').pop().toLowerCase();
  
  const iconMap = {
    pdf: 'fas fa-file-pdf',
    doc: 'fas fa-file-word',
    docx: 'fas fa-file-word',
    xls: 'fas fa-file-excel',
    xlsx: 'fas fa-file-excel',
    csv: 'fas fa-file-csv',
    ppt: 'fas fa-file-powerpoint',
    pptx: 'fas fa-file-powerpoint',
    jpg: 'fas fa-file-image',
    jpeg: 'fas fa-file-image',
    png: 'fas fa-file-image',
    gif: 'fas fa-file-image',
    txt: 'fas fa-file-alt',
    html: 'fas fa-file-code',
    htm: 'fas fa-file-code',
    md: 'fas fa-file-alt',
    markdown: 'fas fa-file-alt',
    // Weitere Dateitypen hier hinzufügen
  };
  
  return iconMap[extension] || 'fas fa-file';
};
</script>

<style scoped>
.conversion-results {
  width: 100%;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.results-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--nscale-dark-gray);
  margin: 0;
}

.clear-button {
  background: none;
  border: 1px solid var(--nscale-gray-medium);
  border-radius: 4px;
  padding: 0.5rem 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: var(--nscale-gray-dark);
  cursor: pointer;
  transition: all 0.2s;
}

.clear-button:hover {
  background-color: var(--nscale-red-light);
  border-color: var(--nscale-red);
  color: var(--nscale-red);
}

.no-results {
  padding: 2rem;
  text-align: center;
  color: var(--nscale-gray-dark);
  background-color: var(--nscale-gray-light);
  border-radius: 4px;
  font-style: italic;
}

.results-table-container {
  width: 100%;
  overflow-x: auto;
  border: 1px solid var(--nscale-gray-medium);
  border-radius: 4px;
}

.results-table {
  width: 100%;
  border-collapse: collapse;
}

.results-table th {
  background-color: var(--nscale-gray-light);
  text-align: left;
  padding: 0.75rem 1rem;
  font-weight: 600;
  color: var(--nscale-dark-gray);
  border-bottom: 1px solid var(--nscale-gray-medium);
}

.results-table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--nscale-gray-medium);
  color: var(--nscale-dark-gray);
}

.results-table tr:last-child td {
  border-bottom: none;
}

.results-table tr:hover {
  background-color: var(--nscale-gray-light);
}

.file-icon-name {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.file-icon-name i {
  font-size: 1.1rem;
  color: var(--nscale-gray-dark);
  width: 20px;
  text-align: center;
}

.file-name {
  word-break: break-word;
  font-weight: 500;
}

.file-name-cell {
  max-width: 300px;
}

.status-badge {
  display: inline-block;
  padding: 0.35rem 0.75rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 500;
}

.status-completed {
  background-color: #e0f5ea;
  color: #22c55e;
}

.status-processing {
  background-color: #e1ecf8;
  color: #3182ce;
}

.status-failed {
  background-color: #fee2e2;
  color: #dc2626;
}

.status-queued {
  background-color: #fef3c7;
  color: #d97706;
}

.actions-cell {
  white-space: nowrap;
}

.action-button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 4px;
  transition: all 0.2s;
  font-size: 1rem;
}

.action-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.view-button {
  color: var(--nscale-blue);
}

.view-button:hover:not(:disabled) {
  background-color: var(--nscale-blue-light);
}

.download-button {
  color: var(--nscale-primary);
}

.download-button:hover:not(:disabled) {
  background-color: var(--nscale-primary-light);
}

.delete-button {
  color: var(--nscale-red);
}

.delete-button:hover:not(:disabled) {
  background-color: var(--nscale-red-light);
}

/* Dark Mode Anpassungen */
:global(.theme-dark) .results-title {
  color: #f0f0f0;
}

:global(.theme-dark) .clear-button {
  color: #aaa;
  border-color: #555;
}

:global(.theme-dark) .clear-button:hover {
  background-color: rgba(229, 62, 62, 0.2);
  border-color: #ff4d4d;
  color: #ff4d4d;
}

:global(.theme-dark) .no-results {
  background-color: #333;
  color: #aaa;
}

:global(.theme-dark) .results-table-container {
  border-color: #555;
}

:global(.theme-dark) .results-table th {
  background-color: #2a2a2a;
  color: #f0f0f0;
  border-bottom-color: #555;
}

:global(.theme-dark) .results-table td {
  border-bottom-color: #555;
  color: #f0f0f0;
}

:global(.theme-dark) .results-table tr:hover {
  background-color: #333;
}

:global(.theme-dark) .file-icon-name i {
  color: #aaa;
}

:global(.theme-dark) .status-completed {
  background-color: rgba(34, 197, 94, 0.2);
  color: #4ade80;
}

:global(.theme-dark) .status-processing {
  background-color: rgba(49, 130, 206, 0.2);
  color: #60a5fa;
}

:global(.theme-dark) .status-failed {
  background-color: rgba(220, 38, 38, 0.2);
  color: #f87171;
}

:global(.theme-dark) .status-queued {
  background-color: rgba(217, 119, 6, 0.2);
  color: #fbbf24;
}

:global(.theme-dark) .view-button {
  color: #60a5fa;
}

:global(.theme-dark) .view-button:hover:not(:disabled) {
  background-color: rgba(96, 165, 250, 0.1);
}

:global(.theme-dark) .download-button {
  color: #4ade80;
}

:global(.theme-dark) .download-button:hover:not(:disabled) {
  background-color: rgba(74, 222, 128, 0.1);
}

:global(.theme-dark) .delete-button {
  color: #f87171;
}

:global(.theme-dark) .delete-button:hover:not(:disabled) {
  background-color: rgba(248, 113, 113, 0.1);
}

/* Kontrast-Modus Anpassungen */
:global(.theme-contrast) .results-title {
  color: #ffeb3b;
}

:global(.theme-contrast) .clear-button {
  color: #ffeb3b;
  border: 2px solid #ffeb3b;
  background-color: #000000;
}

:global(.theme-contrast) .clear-button:hover {
  background-color: #330000;
  border-color: #ff4444;
  color: #ff4444;
}

:global(.theme-contrast) .no-results {
  background-color: #000000;
  color: #ffeb3b;
  border: 1px solid #ffeb3b;
}

:global(.theme-contrast) .results-table-container {
  border: 2px solid #ffeb3b;
}

:global(.theme-contrast) .results-table th {
  background-color: #333300;
  color: #ffeb3b;
  border-bottom: 1px solid #ffeb3b;
}

:global(.theme-contrast) .results-table td {
  border-bottom: 1px solid #ffeb3b;
  color: #ffffff;
}

:global(.theme-contrast) .results-table tr:hover {
  background-color: #333300;
}

:global(.theme-contrast) .file-icon-name i,
:global(.theme-contrast) .file-name {
  color: #ffeb3b;
}

:global(.theme-contrast) .status-completed {
  background-color: #006600;
  color: #ffffff;
  border: 1px solid #00ff00;
}

:global(.theme-contrast) .status-processing {
  background-color: #000066;
  color: #ffffff;
  border: 1px solid #0066ff;
}

:global(.theme-contrast) .status-failed {
  background-color: #660000;
  color: #ffffff;
  border: 1px solid #ff4444;
}

:global(.theme-contrast) .status-queued {
  background-color: #664400;
  color: #ffffff;
  border: 1px solid #ffcc00;
}

:global(.theme-contrast) .view-button {
  color: #00ccff;
}

:global(.theme-contrast) .view-button:hover:not(:disabled) {
  background-color: #003366;
}

:global(.theme-contrast) .download-button {
  color: #00ff00;
}

:global(.theme-contrast) .download-button:hover:not(:disabled) {
  background-color: #006600;
}

:global(.theme-contrast) .delete-button {
  color: #ff4444;
}

:global(.theme-contrast) .delete-button:hover:not(:disabled) {
  background-color: #660000;
}
</style>