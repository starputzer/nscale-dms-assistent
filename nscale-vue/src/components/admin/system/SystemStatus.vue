<template>
  <div class="system-status">
    <!-- Übersichtskarten -->
    <div class="stats-cards">
      <div class="stat-card">
        <div class="stat-icon documents-icon">
          <i class="fas fa-file-alt"></i>
        </div>
        <div class="stat-info">
          <h2>{{ systemStore.totalDocuments }}</h2>
          <p>Dokumente</p>
        </div>
        <div class="stat-actions">
          <button 
            @click="reloadDocuments" 
            class="action-btn" 
            :class="{ 'loading': reloadingDocs }"
            title="Dokumente neu laden"
          >
            <i class="fas fa-sync-alt"></i>
          </button>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon chunks-icon">
          <i class="fas fa-puzzle-piece"></i>
        </div>
        <div class="stat-info">
          <h2>{{ systemStore.totalChunks }}</h2>
          <p>Chunks</p>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon converters-icon">
          <i class="fas fa-exchange-alt"></i>
        </div>
        <div class="stat-info">
          <h2>{{ systemStore.availableConverters.length }}</h2>
          <p>Konverter</p>
          <div class="converter-badges">
            <span 
              v-for="converter in systemStore.availableConverters" 
              :key="converter" 
              class="converter-badge"
            >
              {{ converter }}
            </span>
          </div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon cache-icon">
          <i class="fas fa-database"></i>
        </div>
        <div class="stat-info">
          <h2>Cache</h2>
          <p>
            <span v-if="systemStore.converterStatus.post_processing" class="feature-badge active">Post-Processing</span>
            <span v-else class="feature-badge">Post-Processing</span>
            
            <span v-if="systemStore.converterStatus.parallel_processing" class="feature-badge active">Parallel</span>
            <span v-else class="feature-badge">Parallel</span>
          </p>
        </div>
        <div class="stat-actions">
          <button 
            @click="clearCaches" 
            class="action-btn" 
            :class="{ 'loading': clearingCache }"
            title="Alle Caches leeren"
          >
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
      </div>
    </div>
    
    <!-- Dokumente-Tabelle -->
    <div class="document-section">
      <div class="section-header">
        <h3>Dokumente im System</h3>
        <div class="controls">
          <div class="search-box">
            <input 
              type="text" 
              v-model="searchQuery" 
              placeholder="Suche nach Dateinamen..."
            />
            <i class="fas fa-search"></i>
          </div>
          
          <div class="sort-control">
            <select v-model="sortField">
              <option value="filename">Dateiname</option>
              <option value="size">Dateigröße</option>
              <option value="modified">Bearbeitet</option>
              <option value="chunks">Chunks</option>
              <option value="total_tokens">Tokens</option>
            </select>
            <button @click="toggleSortDirection" class="sort-btn">
              <i :class="['fas', sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down']"></i>
            </button>
          </div>
        </div>
      </div>
      
      <!-- Loading-State -->
      <div v-if="systemStore.loading.stats" class="loading-container">
        <div class="loader"></div>
        <span>Lade Systemdaten...</span>
      </div>
      
      <!-- Error-State -->
      <div v-else-if="systemStore.error.stats" class="error-notification">
        <i class="fas fa-exclamation-triangle"></i>
        <p>{{ systemStore.error.stats }}</p>
        <button @click="systemStore.loadStats" class="retry-btn">
          Erneut versuchen
        </button>
      </div>
      
      <!-- Empty-State -->
      <div v-else-if="filteredDocuments.length === 0" class="empty-state">
        <i class="fas fa-file-excel"></i>
        <p v-if="searchQuery">Keine Dokumente gefunden, die "{{ searchQuery }}" enthalten.</p>
        <p v-else>Keine Dokumente vorhanden. Konvertieren Sie Dokumente, um sie hier zu sehen.</p>
      </div>
      
      <!-- Dokumenten-Tabelle -->
      <div v-else class="documents-table-container">
        <table class="documents-table">
          <thead>
            <tr>
              <th>Dateiname</th>
              <th>Größe</th>
              <th>Letzte Änderung</th>
              <th>Chunks</th>
              <th>Tokens</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="doc in filteredDocuments" :key="doc.filename">
              <td class="filename-cell">{{ doc.filename }}</td>
              <td>{{ formatFileSize(doc.size) }}</td>
              <td>{{ doc.modified }}</td>
              <td>{{ doc.chunks }}</td>
              <td>{{ formatNumber(doc.total_tokens) }}</td>
            </tr>
          </tbody>
          <tfoot v-if="filteredDocuments.length > 0">
            <tr>
              <td><strong>Gesamt</strong></td>
              <td>{{ formatFileSize(totalSize) }}</td>
              <td>-</td>
              <td><strong>{{ totalChunks }}</strong></td>
              <td><strong>{{ formatNumber(totalTokens) }}</strong></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
    
    <!-- Refresh-Steuerung -->
    <div class="refresh-controls">
      <div class="refresh-toggle">
        <input 
          type="checkbox" 
          id="auto-refresh" 
          v-model="autoRefresh" 
          @change="toggleAutoRefresh"
        />
        <label for="auto-refresh">Automatisch aktualisieren</label>
      </div>
      
      <div v-if="autoRefresh" class="refresh-interval">
        <label for="refresh-interval">Intervall (Sekunden):</label>
        <select 
          id="refresh-interval" 
          v-model="refreshInterval" 
          @change="updateRefreshInterval"
        >
          <option value="5000">5</option>
          <option value="10000">10</option>
          <option value="30000">30</option>
          <option value="60000">60</option>
          <option value="300000">300</option>
        </select>
      </div>
      
      <button @click="refreshData" class="refresh-btn" :disabled="isLoading">
        <i :class="['fas', 'fa-sync-alt', { 'fa-spin': isLoading }]"></i>
        Aktualisieren
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useSystemStore } from '@/stores/systemStore';

const systemStore = useSystemStore();

// State für UI
const searchQuery = ref('');
const sortField = ref('filename');
const sortDirection = ref('asc');
const autoRefresh = ref(false);
const refreshInterval = ref(30000);
const reloadingDocs = ref(false);
const clearingCache = ref(false);

// Computed properties
const filteredDocuments = computed(() => {
  let docs = systemStore.documentList;
  
  // Filtern nach Suchbegriff
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    docs = docs.filter(doc => 
      doc.filename.toLowerCase().includes(query)
    );
  }
  
  // Sortieren nach ausgewähltem Feld
  docs.sort((a, b) => {
    let aValue = a[sortField.value];
    let bValue = b[sortField.value];
    
    // Spezialbehandlung für numerische Felder
    if (['size', 'chunks', 'total_tokens'].includes(sortField.value)) {
      aValue = Number(aValue) || 0;
      bValue = Number(bValue) || 0;
    }
    
    if (sortDirection.value === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });
  
  return docs;
});

// Summen berechnen
const totalSize = computed(() => {
  return filteredDocuments.value.reduce((total, doc) => total + (doc.size || 0), 0);
});

const totalChunks = computed(() => {
  return filteredDocuments.value.reduce((total, doc) => total + (doc.chunks || 0), 0);
});

const totalTokens = computed(() => {
  return filteredDocuments.value.reduce((total, doc) => total + (doc.total_tokens || 0), 0);
});

const isLoading = computed(() => {
  return systemStore.loading.stats || 
         systemStore.loading.converterStatus || 
         reloadingDocs.value || 
         clearingCache.value;
});

// Methods
const toggleSortDirection = () => {
  sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
};

const formatFileSize = (bytes) => {
  if (bytes === undefined || bytes === null) return '-';
  
  if (bytes < 1024) return bytes + ' B';
  else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  else if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  else return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
};

const formatNumber = (num) => {
  if (num === undefined || num === null) return '-';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const refreshData = () => {
  systemStore.loadAllData();
};

const toggleAutoRefresh = () => {
  if (autoRefresh.value) {
    systemStore.startAutoRefresh();
  } else {
    systemStore.stopAutoRefresh();
  }
};

const updateRefreshInterval = () => {
  systemStore.setRefreshInterval(Number(refreshInterval.value));
};

const reloadDocuments = async () => {
  try {
    reloadingDocs.value = true;
    await systemStore.reloadDocuments();
  } catch (error) {
    console.error('Fehler beim Neuladen der Dokumente:', error);
  } finally {
    reloadingDocs.value = false;
  }
};

const clearCaches = async () => {
  try {
    clearingCache.value = true;
    await systemStore.clearLLMCache();
    await systemStore.clearEmbeddingCache();
    // Daten nach dem Löschen des Cache neu laden
    await refreshData();
  } catch (error) {
    console.error('Fehler beim Löschen der Caches:', error);
  } finally {
    clearingCache.value = false;
  }
};

// Lifecycle hooks
onMounted(() => {
  // Initialer Datenabruf
  refreshData();
});

onBeforeUnmount(() => {
  // Automatische Aktualisierung stoppen bei Komponentenzerstörung
  systemStore.stopAutoRefresh();
});

// Watcher
watch(() => autoRefresh.value, (newValue) => {
  if (newValue) {
    systemStore.setRefreshInterval(Number(refreshInterval.value));
    systemStore.startAutoRefresh();
  } else {
    systemStore.stopAutoRefresh();
  }
});
</script>

<style scoped>
.system-status {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.stat-card {
  background-color: #ffffff;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  display: flex;
  align-items: center;
  position: relative;
}

.stat-icon {
  width: 3rem;
  height: 3rem;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  margin-right: 1.25rem;
}

.documents-icon {
  background-color: #ebf5ff;
  color: #3b82f6;
}

.chunks-icon {
  background-color: #f0fdf4;
  color: #22c55e;
}

.converters-icon {
  background-color: #fef3c7;
  color: #f59e0b;
}

.cache-icon {
  background-color: #ede9fe;
  color: #8b5cf6;
}

.stat-info h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 0.25rem 0;
}

.stat-info p {
  font-size: 0.875rem;
  color: #64748b;
  margin: 0;
}

.stat-actions {
  position: absolute;
  top: 1rem;
  right: 1rem;
}

.action-btn {
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.25rem;
  transition: all 0.2s;
}

.action-btn:hover {
  background-color: #f1f5f9;
  color: #1e293b;
}

.action-btn.loading {
  pointer-events: none;
}

.action-btn.loading i {
  animation: spin 1s linear infinite;
}

.converter-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-top: 0.5rem;
}

.converter-badge {
  background-color: #f8fafc;
  color: #475569;
  font-size: 0.625rem;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  border: 1px solid #e2e8f0;
}

.feature-badge {
  display: inline-block;
  padding: 0.125rem 0.375rem;
  font-size: 0.625rem;
  border-radius: 0.25rem;
  background-color: #f1f5f9;
  color: #64748b;
  margin-right: 0.25rem;
}

.feature-badge.active {
  background-color: #dbeafe;
  color: #1e40af;
}

.document-section {
  background-color: #ffffff;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.section-header h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.controls {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.search-box {
  position: relative;
}

.search-box input {
  padding: 0.5rem 2.5rem 0.5rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  color: #1e293b;
  width: 200px;
}

.search-box i {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  pointer-events: none;
}

.sort-control {
  display: flex;
  align-items: center;
}

.sort-control select {
  padding: 0.5rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem 0 0 0.375rem;
  font-size: 0.875rem;
  color: #1e293b;
  background-color: #ffffff;
}

.sort-btn {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-left: none;
  border-radius: 0 0.375rem 0.375rem 0;
  color: #64748b;
  width: 2rem;
  height: 2.375rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.sort-btn:hover {
  background-color: #f1f5f9;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: #64748b;
}

.loader {
  border: 3px solid #f3f3f3;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  width: 2rem;
  height: 2rem;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-notification {
  margin: 1.5rem 0;
  padding: 1rem;
  background-color: #fee2e2;
  border-left: 4px solid #ef4444;
  color: #b91c1c;
  border-radius: 0.375rem;
  display: flex;
  align-items: center;
}

.error-notification i {
  margin-right: 0.75rem;
}

.error-notification p {
  flex: 1;
  margin: 0;
}

.retry-btn {
  background-color: transparent;
  border: 1px solid currentColor;
  color: #b91c1c;
  padding: 0.25rem 0.75rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  cursor: pointer;
}

.retry-btn:hover {
  background-color: rgba(239, 68, 68, 0.1);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  text-align: center;
  color: #64748b;
}

.empty-state i {
  font-size: 3rem;
  opacity: 0.5;
  margin-bottom: 1rem;
}

.documents-table-container {
  overflow-x: auto;
  margin-top: 1rem;
}

.documents-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
  color: #334155;
}

.documents-table th {
  background-color: #f8fafc;
  padding: 0.75rem 1rem;
  text-align: left;
  font-weight: 600;
  color: #475569;
  border-bottom: 1px solid #e2e8f0;
}

.documents-table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e2e8f0;
}

.documents-table tfoot td {
  background-color: #f8fafc;
  font-weight: 500;
  color: #475569;
}

.filename-cell {
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.refresh-controls {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
}

.refresh-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.refresh-toggle label {
  font-size: 0.875rem;
  color: #475569;
}

.refresh-interval {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #475569;
}

.refresh-interval select {
  padding: 0.25rem 0.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  color: #1e293b;
}

.refresh-btn {
  padding: 0.5rem 1rem;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.refresh-btn:hover:not(:disabled) {
  background-color: #2563eb;
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.refresh-btn i {
  font-size: 0.875rem;
}

/* Dark Mode Support */
:global(.theme-dark) .stat-card,
:global(.theme-dark) .document-section {
  background-color: #1e1e1e;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

:global(.theme-dark) .stat-info h2 {
  color: #e0e0e0;
}

:global(.theme-dark) .stat-info p {
  color: #aaa;
}

:global(.theme-dark) .section-header h3 {
  color: #e0e0e0;
}

:global(.theme-dark) .documents-icon {
  background-color: rgba(59, 130, 246, 0.2);
}

:global(.theme-dark) .chunks-icon {
  background-color: rgba(34, 197, 94, 0.2);
}

:global(.theme-dark) .converters-icon {
  background-color: rgba(245, 158, 11, 0.2);
}

:global(.theme-dark) .cache-icon {
  background-color: rgba(139, 92, 246, 0.2);
}

:global(.theme-dark) .converter-badge {
  background-color: #2a2a2a;
  color: #aaa;
  border-color: #444;
}

:global(.theme-dark) .feature-badge {
  background-color: #333;
  color: #aaa;
}

:global(.theme-dark) .feature-badge.active {
  background-color: rgba(29, 78, 216, 0.4);
  color: #93c5fd;
}

:global(.theme-dark) .search-box input,
:global(.theme-dark) .sort-control select {
  background-color: #252525;
  border-color: #444;
  color: #e0e0e0;
}

:global(.theme-dark) .sort-btn {
  background-color: #252525;
  border-color: #444;
  color: #aaa;
}

:global(.theme-dark) .sort-btn:hover {
  background-color: #333;
}

:global(.theme-dark) .documents-table th,
:global(.theme-dark) .documents-table tfoot td {
  background-color: #252525;
  color: #e0e0e0;
  border-bottom-color: #444;
}

:global(.theme-dark) .documents-table td {
  border-bottom-color: #444;
  color: #e0e0e0;
}

:global(.theme-dark) .refresh-toggle label,
:global(.theme-dark) .refresh-interval {
  color: #aaa;
}

:global(.theme-dark) .refresh-interval select {
  background-color: #252525;
  border-color: #444;
  color: #e0e0e0;
}

:global(.theme-dark) .action-btn {
  color: #aaa;
}

:global(.theme-dark) .action-btn:hover {
  background-color: #333;
  color: #e0e0e0;
}

:global(.theme-dark) .refresh-btn {
  background-color: #2563eb;
}

:global(.theme-dark) .refresh-btn:hover:not(:disabled) {
  background-color: #1d4ed8;
}

:global(.theme-dark) .error-notification {
  background-color: rgba(239, 68, 68, 0.15);
  border-left-color: #ef4444;
  color: #fca5a5;
}

:global(.theme-dark) .retry-btn {
  color: #fca5a5;
}

:global(.theme-dark) .retry-btn:hover {
  background-color: rgba(239, 68, 68, 0.2);
}

:global(.theme-dark) .empty-state {
  color: #aaa;
}

:global(.theme-dark) .loading-container {
  color: #aaa;
}

:global(.theme-dark) .loader {
  border-color: #444;
  border-top-color: #3b82f6;
}

/* Contrast Mode */
:global(.theme-contrast) .stat-card,
:global(.theme-contrast) .document-section {
  background-color: #000;
  border: 2px solid #ffeb3b;
  box-shadow: none;
}

:global(.theme-contrast) .stat-icon {
  background-color: #ffeb3b;
  color: #000;
}

:global(.theme-contrast) .stat-info h2,
:global(.theme-contrast) .section-header h3 {
  color: #ffeb3b;
}

:global(.theme-contrast) .stat-info p,
:global(.theme-contrast) .refresh-toggle label,
:global(.theme-contrast) .refresh-interval {
  color: #fff;
}

:global(.theme-contrast) .documents-table th,
:global(.theme-contrast) .documents-table tfoot td {
  background-color: #ffeb3b;
  color: #000;
  border-bottom-color: #ffeb3b;
}

:global(.theme-contrast) .documents-table td {
  border-bottom-color: #ffeb3b;
  color: #fff;
}

:global(.theme-contrast) .converter-badge,
:global(.theme-contrast) .feature-badge {
  background-color: #000;
  color: #ffeb3b;
  border: 1px solid #ffeb3b;
}

:global(.theme-contrast) .feature-badge.active {
  background-color: #ffeb3b;
  color: #000;
}

:global(.theme-contrast) .search-box input,
:global(.theme-contrast) .sort-control select,
:global(.theme-contrast) .refresh-interval select {
  background-color: #000;
  border-color: #ffeb3b;
  color: #fff;
}

:global(.theme-contrast) .sort-btn {
  background-color: #000;
  border-color: #ffeb3b;
  color: #ffeb3b;
}

:global(.theme-contrast) .action-btn {
  color: #ffeb3b;
}

:global(.theme-contrast) .action-btn:hover {
  background-color: #ffeb3b;
  color: #000;
}

:global(.theme-contrast) .refresh-btn {
  background-color: #ffeb3b;
  color: #000;
  border: 2px solid #ffeb3b;
}

:global(.theme-contrast) .refresh-btn:hover:not(:disabled) {
  background-color: #000;
  color: #ffeb3b;
}

:global(.theme-contrast) .error-notification {
  background-color: #000;
  border: 2px solid #f00;
  color: #f00;
}

:global(.theme-contrast) .retry-btn {
  color: #f00;
  border-color: #f00;
}

:global(.theme-contrast) .retry-btn:hover {
  background-color: #f00;
  color: #000;
}

:global(.theme-contrast) .empty-state,
:global(.theme-contrast) .loading-container {
  color: #fff;
}

:global(.theme-contrast) .loader {
  border-color: #ffeb3b;
  border-top-color: #fff;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .section-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .controls {
    width: 100%;
    flex-wrap: wrap;
  }
  
  .search-box {
    width: 100%;
  }
  
  .search-box input {
    width: 100%;
  }
  
  .refresh-controls {
    flex-wrap: wrap;
    justify-content: flex-start;
  }
  
  .documents-table th:nth-child(2),
  .documents-table td:nth-child(2),
  .documents-table th:nth-child(3),
  .documents-table td:nth-child(3) {
    display: none;
  }
}

@media (max-width: 576px) {
  .documents-table th:nth-child(5),
  .documents-table td:nth-child(5) {
    display: none;
  }
}
</style>