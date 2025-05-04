<template>
  <div class="system-logs">
    <div class="controls-panel">
      <div class="log-filters">
        <div class="log-type-filter">
          <label for="log-type">Protokolltyp:</label>
          <select id="log-type" v-model="logType">
            <option value="all">Alle Protokolle</option>
            <option value="application">Anwendung</option>
            <option value="conversion">Konvertierungen</option>
            <option value="error">Fehler</option>
            <option value="auth">Authentifizierung</option>
          </select>
        </div>
        
        <div class="date-range-filter">
          <label for="date-range">Zeitraum:</label>
          <select id="date-range" v-model="dateRange">
            <option value="1h">Letzte Stunde</option>
            <option value="6h">Letzte 6 Stunden</option>
            <option value="24h">Letzter Tag</option>
            <option value="7d">Letzte Woche</option>
            <option value="30d">Letzter Monat</option>
          </select>
        </div>
        
        <div class="search-box">
          <input 
            type="text" 
            v-model="searchQuery" 
            placeholder="Suche in Protokollen..."
          />
          <i class="fas fa-search"></i>
        </div>
      </div>
      
      <div class="log-actions">
        <button @click="refreshLogs" class="refresh-btn" :disabled="loading">
          <i :class="['fas', 'fa-sync-alt', { 'fa-spin': loading }]"></i>
          Aktualisieren
        </button>
        <button @click="downloadLogs" class="download-btn" :disabled="!hasLogs">
          <i class="fas fa-download"></i>
          Exportieren
        </button>
      </div>
    </div>
    
    <!-- Log-Display -->
    <div class="log-display">
      <!-- Log-Header mit Statistiken -->
      <div class="log-stats">
        <div class="log-stat">
          <i class="fas fa-file-alt"></i>
          <span>{{ logCount }} Einträge</span>
        </div>
        <div class="log-stat">
          <i class="fas fa-exclamation-triangle"></i>
          <span>{{ errorCount }} Fehler</span>
        </div>
        <div class="log-stat">
          <i class="fas fa-clock"></i>
          <span>{{ dateRangeText }}</span>
        </div>
      </div>
      
      <!-- Log-Tabelle -->
      <div class="log-table-container">
        <!-- Loading-State -->
        <div v-if="loading" class="loading-container">
          <div class="loader"></div>
          <span>Lade Protokolldaten...</span>
        </div>
        
        <!-- Empty-State -->
        <div v-else-if="!hasLogs" class="empty-state">
          <i class="fas fa-clipboard-list"></i>
          <p v-if="searchQuery">Keine Protokolle gefunden, die "{{ searchQuery }}" enthalten.</p>
          <p v-else-if="error">Fehler beim Laden der Protokolle: {{ error }}</p>
          <p v-else>Keine Protokolleinträge im gewählten Zeitraum gefunden.</p>
          <button v-if="error" @click="refreshLogs" class="retry-btn">
            Erneut versuchen
          </button>
        </div>
        
        <!-- Log-Tabelle -->
        <table v-else class="log-table">
          <thead>
            <tr>
              <th class="timestamp-col">Zeitstempel</th>
              <th class="level-col">Level</th>
              <th class="module-col">Modul</th>
              <th class="message-col">Nachricht</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="(log, index) in filteredLogs" 
              :key="index" 
              :class="[`log-level-${log.level.toLowerCase()}`, { 'expanded': expandedLogs.includes(index) }]"
              @click="toggleLogExpansion(index)"
            >
              <td class="timestamp-col">{{ formatTimestamp(log.timestamp) }}</td>
              <td class="level-col">
                <span class="log-level" :class="`log-level-${log.level.toLowerCase()}`">
                  {{ log.level }}
                </span>
              </td>
              <td class="module-col">{{ log.module }}</td>
              <td class="message-col">
                <div class="log-message">
                  {{ log.message }}
                </div>
                <div v-if="log.details && expandedLogs.includes(index)" class="log-details">
                  <pre>{{ log.details }}</pre>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- Pagination -->
      <div v-if="hasLogs" class="pagination">
        <button 
          @click="prevPage" 
          class="page-btn" 
          :disabled="currentPage === 1"
        >
          <i class="fas fa-chevron-left"></i>
        </button>
        
        <span class="page-info">
          Seite {{ currentPage }} von {{ totalPages }}
        </span>
        
        <button 
          @click="nextPage" 
          class="page-btn" 
          :disabled="currentPage === totalPages"
        >
          <i class="fas fa-chevron-right"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';

// Mock-Daten für Protokolleinträge
// Diese würden normalerweise vom Backend abgerufen werden
const mockLogs = [
  {
    timestamp: Date.now() - 5 * 60 * 1000,
    level: 'INFO',
    module: 'document_store',
    message: 'Dokumente erfolgreich geladen: 15 Dokumente, 250 Chunks',
    type: 'application'
  },
  {
    timestamp: Date.now() - 15 * 60 * 1000,
    level: 'WARNING',
    module: 'embedding_manager',
    message: 'Embedding-Cache veraltet, Neugenerierung empfohlen',
    type: 'application'
  },
  {
    timestamp: Date.now() - 30 * 60 * 1000,
    level: 'ERROR',
    module: 'rag_engine',
    message: 'Fehler bei der Verarbeitung der Anfrage: Timeout bei LLM-Anfrage',
    details: 'Traceback (most recent call last):\n  File "/opt/nscale-assist/app/modules/rag/engine.py", line 284, in _generate_response\n    result = await self.ollama_client.generate(prompt)\n  File "/opt/nscale-assist/app/modules/llm/model.py", line 165, in generate\n    raise TimeoutError("LLM request timed out after 30 seconds")\nTimeoutError: LLM request timed out after 30 seconds',
    type: 'error'
  },
  {
    timestamp: Date.now() - 45 * 60 * 1000,
    level: 'INFO',
    module: 'doc_converter',
    message: 'Dokument "Richtlinie zur Datenspeicherung.docx" erfolgreich konvertiert',
    type: 'conversion'
  },
  {
    timestamp: Date.now() - 60 * 60 * 1000,
    level: 'INFO',
    module: 'user_manager',
    message: 'Benutzer "admin@example.com" hat sich angemeldet',
    type: 'auth'
  },
  {
    timestamp: Date.now() - 90 * 60 * 1000,
    level: 'ERROR',
    module: 'doc_converter',
    message: 'Fehler bei der Konvertierung von "Komplexes Dokument.pdf": Nicht unterstütztes Format',
    details: 'Traceback (most recent call last):\n  File "/opt/nscale-assist/app/doc_converter/converters/pdf_converter.py", line 98, in convert\n    raise ValueError("PDF contains unsupported elements")\nValueError: PDF contains unsupported elements',
    type: 'conversion'
  },
  {
    timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000,
    level: 'INFO',
    module: 'server',
    message: 'Server gestartet auf host=localhost port=8000',
    type: 'application'
  },
  {
    timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000,
    level: 'WARNING',
    module: 'auth_manager',
    message: 'Mehrere fehlgeschlagene Anmeldeversuche für Benutzer "test@example.com"',
    type: 'auth'
  }
];

// State
const logs = ref([]);
const logType = ref('all');
const dateRange = ref('24h');
const searchQuery = ref('');
const currentPage = ref(1);
const pageSize = ref(10);
const loading = ref(false);
const error = ref(null);
const expandedLogs = ref([]);

// Mock-Funktion zum "Laden" der Protokolle
// In einer realen Implementierung würde dies eine API-Anfrage sein
const fetchLogs = async () => {
  loading.value = true;
  error.value = null;
  
  try {
    // Simuliere API-Aufruf mit setTimeout
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Filtere Logs basierend auf Zeitraum
    const msToSubtract = getMsFromDateRange(dateRange.value);
    const cutoffTimestamp = Date.now() - msToSubtract;
    
    // Filtere und kopiere die Mock-Logs
    logs.value = mockLogs
      .filter(log => log.timestamp >= cutoffTimestamp)
      .map(log => ({ ...log }));
      
    // Simuliere gelegentliche Fehler
    if (Math.random() < 0.05) {
      throw new Error('Simulierter Netzwerkfehler beim Abrufen der Protokolle');
    }
    
  } catch (err) {
    console.error('Fehler beim Laden der Protokolle:', err);
    error.value = err.message;
    logs.value = [];
  } finally {
    loading.value = false;
  }
};

// Berechnete Eigenschaften
const filteredLogs = computed(() => {
  let result = [...logs.value];
  
  // Filtere nach Typ
  if (logType.value !== 'all') {
    result = result.filter(log => log.type === logType.value);
  }
  
  // Filtere nach Suchbegriff
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(log => 
      log.message.toLowerCase().includes(query) ||
      log.module.toLowerCase().includes(query) ||
      log.level.toLowerCase().includes(query) ||
      (log.details && log.details.toLowerCase().includes(query))
    );
  }
  
  // Sortiere nach Zeitstempel (neueste zuerst)
  result.sort((a, b) => b.timestamp - a.timestamp);
  
  // Paginierung
  const start = (currentPage.value - 1) * pageSize.value;
  const end = Math.min(start + pageSize.value, result.length);
  
  return result.slice(start, end);
});

const hasLogs = computed(() => {
  return filteredLogs.value.length > 0;
});

const logCount = computed(() => {
  let result = logs.value;
  
  // Filtere nach Typ
  if (logType.value !== 'all') {
    result = result.filter(log => log.type === logType.value);
  }
  
  return result.length;
});

const errorCount = computed(() => {
  let result = logs.value;
  
  // Filtere nach Typ
  if (logType.value !== 'all') {
    result = result.filter(log => log.type === logType.value);
  }
  
  return result.filter(log => log.level === 'ERROR').length;
});

const totalFilteredLogs = computed(() => {
  let result = [...logs.value];
  
  // Filtere nach Typ
  if (logType.value !== 'all') {
    result = result.filter(log => log.type === logType.value);
  }
  
  // Filtere nach Suchbegriff
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(log => 
      log.message.toLowerCase().includes(query) ||
      log.module.toLowerCase().includes(query) ||
      log.level.toLowerCase().includes(query) ||
      (log.details && log.details.toLowerCase().includes(query))
    );
  }
  
  return result.length;
});

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(totalFilteredLogs.value / pageSize.value));
});

const dateRangeText = computed(() => {
  switch(dateRange.value) {
    case '1h': return 'Letzte Stunde';
    case '6h': return 'Letzte 6 Stunden';
    case '24h': return 'Letzter Tag';
    case '7d': return 'Letzte Woche';
    case '30d': return 'Letzter Monat';
    default: return 'Benutzerdefiniert';
  }
});

// Methoden
const refreshLogs = () => {
  currentPage.value = 1;
  expandedLogs.value = [];
  fetchLogs();
};

const toggleLogExpansion = (index) => {
  const position = expandedLogs.value.indexOf(index);
  if (position > -1) {
    expandedLogs.value.splice(position, 1);
  } else {
    expandedLogs.value.push(index);
  }
};

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
    expandedLogs.value = [];
  }
};

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
    expandedLogs.value = [];
  }
};

const downloadLogs = () => {
  // Erstelle CSV aus filterierten Logs
  let result = [...logs.value];
  
  // Filtere nach Typ
  if (logType.value !== 'all') {
    result = result.filter(log => log.type === logType.value);
  }
  
  // Filtere nach Suchbegriff
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(log => 
      log.message.toLowerCase().includes(query) ||
      log.module.toLowerCase().includes(query) ||
      log.level.toLowerCase().includes(query) ||
      (log.details && log.details.toLowerCase().includes(query))
    );
  }
  
  // Sortiere nach Zeitstempel (neueste zuerst)
  result.sort((a, b) => b.timestamp - a.timestamp);
  
  // Erstelle CSV-Inhalt
  const headers = ['Zeitstempel', 'Level', 'Modul', 'Nachricht', 'Details'];
  const csvContent = [
    headers.join(','),
    ...result.map(log => {
      return [
        new Date(log.timestamp).toISOString(),
        log.level,
        `"${log.module.replace(/"/g, '""')}"`,
        `"${log.message.replace(/"/g, '""')}"`,
        log.details ? `"${log.details.replace(/"/g, '""').replace(/\n/g, ' ')}"` : ''
      ].join(',');
    })
  ].join('\n');
  
  // Erstelle Datei zum Download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `system-logs_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleString('de-DE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

const getMsFromDateRange = (range) => {
  const msInHour = 60 * 60 * 1000;
  const msInDay = 24 * msInHour;
  
  switch(range) {
    case '1h': return msInHour;
    case '6h': return 6 * msInHour;
    case '24h': return msInDay;
    case '7d': return 7 * msInDay;
    case '30d': return 30 * msInDay;
    default: return msInDay;
  }
};

// Reaktive Watcher
watch([logType, dateRange, searchQuery], () => {
  // Setze Seite zurück, wenn sich Filter ändern
  currentPage.value = 1;
  
  // Wenn sich nur der Suchbegriff ändert und wir haben bereits Daten,
  // müssen wir nicht neu laden. Für Änderungen am Datumsbereich und Protokolltyp laden wir neu.
  if (
    (logType.value !== 'all' && logs.value.length === 0) || 
    (dateRange.value !== '24h' && logs.value.length === 0)
  ) {
    fetchLogs();
  }
});

// Lifecycle hooks
onMounted(() => {
  // Initial data load
  fetchLogs();
});
</script>

<style scoped>
.system-logs {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.controls-panel {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #ffffff;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 1rem 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.log-filters {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
}

.log-type-filter, .date-range-filter {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.log-type-filter label, .date-range-filter label {
  font-size: 0.875rem;
  color: #475569;
  white-space: nowrap;
}

.log-type-filter select, .date-range-filter select {
  padding: 0.5rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  color: #1e293b;
  background-color: #ffffff;
}

.search-box {
  position: relative;
  flex-grow: 1;
  min-width: 200px;
}

.search-box input {
  padding: 0.5rem 2.5rem 0.5rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  color: #1e293b;
  width: 100%;
}

.search-box i {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  pointer-events: none;
}

.log-actions {
  display: flex;
  gap: 0.75rem;
}

.refresh-btn, .download-btn {
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.refresh-btn {
  background-color: #3b82f6;
  color: white;
  border: none;
}

.refresh-btn:hover:not(:disabled) {
  background-color: #2563eb;
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.download-btn {
  background-color: #f8fafc;
  color: #475569;
  border: 1px solid #e2e8f0;
}

.download-btn:hover:not(:disabled) {
  background-color: #f1f5f9;
}

.download-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.log-display {
  background-color: #ffffff;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.log-stats {
  display: flex;
  gap: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e2e8f0;
}

.log-stat {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #475569;
}

.log-stat i {
  color: #3b82f6;
}

.log-table-container {
  overflow-x: auto;
  max-height: 500px;
  overflow-y: auto;
}

.log-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
  color: #334155;
}

.log-table th {
  position: sticky;
  top: 0;
  background-color: #f8fafc;
  padding: 0.75rem 1rem;
  text-align: left;
  font-weight: 600;
  color: #475569;
  border-bottom: 1px solid #e2e8f0;
  z-index: 10;
}

.log-table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e2e8f0;
  vertical-align: top;
}

.timestamp-col {
  white-space: nowrap;
  width: 180px;
}

.level-col {
  width: 100px;
  text-align: center;
}

.module-col {
  width: 150px;
}

.message-col {
  min-width: 300px;
}

.log-level {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.log-level-info {
  background-color: #dbeafe;
  color: #1e40af;
}

.log-level-warning {
  background-color: #fef3c7;
  color: #92400e;
}

.log-level-error {
  background-color: #fee2e2;
  color: #b91c1c;
}

.log-level-debug {
  background-color: #e0f2fe;
  color: #0369a1;
}

tr.log-level-error {
  background-color: rgba(254, 226, 226, 0.2);
}

tr.log-level-warning {
  background-color: rgba(254, 243, 199, 0.2);
}

tr.expanded {
  background-color: #f8fafc;
}

.log-message {
  white-space: pre-wrap;
  word-break: break-word;
}

.log-details {
  margin-top: 0.75rem;
  padding: 0.75rem;
  background-color: #f1f5f9;
  border-radius: 0.25rem;
  font-family: monospace;
  white-space: pre-wrap;
  word-break: break-word;
  color: #475569;
  font-size: 0.75rem;
  max-height: 200px;
  overflow-y: auto;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
}

.page-btn {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.375rem;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #475569;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.page-btn:hover:not(:disabled) {
  background-color: #f1f5f9;
}

.page-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.page-info {
  font-size: 0.875rem;
  color: #475569;
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

.retry-btn {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  cursor: pointer;
}

.retry-btn:hover {
  background-color: #2563eb;
}

/* Dark Mode Support */
:global(.theme-dark) .controls-panel,
:global(.theme-dark) .log-display {
  background-color: #1e1e1e;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

:global(.theme-dark) .log-type-filter label,
:global(.theme-dark) .date-range-filter label,
:global(.theme-dark) .log-stat,
:global(.theme-dark) .page-info {
  color: #aaa;
}

:global(.theme-dark) .log-type-filter select,
:global(.theme-dark) .date-range-filter select,
:global(.theme-dark) .search-box input {
  background-color: #252525;
  border-color: #444;
  color: #e0e0e0;
}

:global(.theme-dark) .download-btn,
:global(.theme-dark) .page-btn {
  background-color: #252525;
  border-color: #444;
  color: #aaa;
}

:global(.theme-dark) .download-btn:hover:not(:disabled),
:global(.theme-dark) .page-btn:hover:not(:disabled) {
  background-color: #333;
}

:global(.theme-dark) .log-stats,
:global(.theme-dark) .pagination {
  border-color: #444;
}

:global(.theme-dark) .log-table th {
  background-color: #252525;
  color: #e0e0e0;
  border-bottom-color: #444;
}

:global(.theme-dark) .log-table td {
  border-bottom-color: #444;
  color: #e0e0e0;
}

:global(.theme-dark) tr.expanded {
  background-color: #2a2a2a;
}

:global(.theme-dark) .log-details {
  background-color: #333;
  color: #aaa;
}

:global(.theme-dark) tr.log-level-error {
  background-color: rgba(180, 30, 30, 0.2);
}

:global(.theme-dark) tr.log-level-warning {
  background-color: rgba(180, 130, 20, 0.2);
}

:global(.theme-dark) .log-level-info {
  background-color: rgba(30, 64, 175, 0.6);
  color: #dbeafe;
}

:global(.theme-dark) .log-level-warning {
  background-color: rgba(146, 64, 14, 0.6);
  color: #fef3c7;
}

:global(.theme-dark) .log-level-error {
  background-color: rgba(185, 28, 28, 0.6);
  color: #fee2e2;
}

:global(.theme-dark) .log-level-debug {
  background-color: rgba(3, 105, 161, 0.6);
  color: #e0f2fe;
}

:global(.theme-dark) .refresh-btn {
  background-color: #2563eb;
}

:global(.theme-dark) .refresh-btn:hover:not(:disabled) {
  background-color: #1d4ed8;
}

:global(.theme-dark) .retry-btn {
  background-color: #2563eb;
}

:global(.theme-dark) .retry-btn:hover {
  background-color: #1d4ed8;
}

:global(.theme-dark) .loading-container {
  color: #aaa;
}

:global(.theme-dark) .empty-state {
  color: #aaa;
}

:global(.theme-dark) .loader {
  border-color: #444;
  border-top-color: #3b82f6;
}

/* Contrast Mode */
:global(.theme-contrast) .controls-panel,
:global(.theme-contrast) .log-display {
  background-color: #000;
  border: 2px solid #ffeb3b;
  box-shadow: none;
}

:global(.theme-contrast) .log-type-filter label,
:global(.theme-contrast) .date-range-filter label,
:global(.theme-contrast) .log-stat,
:global(.theme-contrast) .page-info {
  color: #fff;
}

:global(.theme-contrast) .log-type-filter select,
:global(.theme-contrast) .date-range-filter select,
:global(.theme-contrast) .search-box input,
:global(.theme-contrast) .download-btn,
:global(.theme-contrast) .page-btn {
  background-color: #000;
  border: 1px solid #ffeb3b;
  color: #fff;
}

:global(.theme-contrast) .log-stat i {
  color: #ffeb3b;
}

:global(.theme-contrast) .download-btn:hover:not(:disabled),
:global(.theme-contrast) .page-btn:hover:not(:disabled) {
  background-color: #ffeb3b;
  color: #000;
}

:global(.theme-contrast) .log-stats,
:global(.theme-contrast) .pagination {
  border-color: #ffeb3b;
}

:global(.theme-contrast) .log-table th {
  background-color: #ffeb3b;
  color: #000;
  border-bottom-color: #ffeb3b;
}

:global(.theme-contrast) .log-table td {
  border-bottom-color: #ffeb3b;
  color: #fff;
}

:global(.theme-contrast) tr.expanded {
  background-color: #333;
}

:global(.theme-contrast) .log-details {
  background-color: #333;
  color: #fff;
  border: 1px solid #ffeb3b;
}

:global(.theme-contrast) .log-level {
  background-color: #000;
  border: 1px solid #ffeb3b;
  color: #ffeb3b;
}

:global(.theme-contrast) tr.log-level-error {
  background-color: #500;
}

:global(.theme-contrast) tr.log-level-warning {
  background-color: #550;
}

:global(.theme-contrast) .refresh-btn,
:global(.theme-contrast) .retry-btn {
  background-color: #ffeb3b;
  color: #000;
  border: 1px solid #ffeb3b;
}

:global(.theme-contrast) .refresh-btn:hover:not(:disabled),
:global(.theme-contrast) .retry-btn:hover:not(:disabled) {
  background-color: #000;
  color: #ffeb3b;
}

:global(.theme-contrast) .empty-state i {
  color: #ffeb3b;
}

/* Responsive adjustments */
@media (max-width: 1024px) {
  .controls-panel {
    flex-direction: column;
    align-items: stretch;
  }
  
  .log-filters {
    flex-direction: column;
    align-items: stretch;
  }
  
  .log-actions {
    justify-content: flex-end;
  }
  
  .timestamp-col, .level-col {
    width: auto;
  }
}

@media (max-width: 768px) {
  .log-stats {
    flex-direction: column;
    gap: 0.5rem;
    align-items: flex-start;
  }
  
  .log-table th:nth-child(3),
  .log-table td:nth-child(3) {
    display: none;
  }
}

@media (max-width: 576px) {
  .log-actions {
    flex-direction: column;
    align-items: stretch;
  }
  
  .log-table th:nth-child(1),
  .log-table td:nth-child(1) {
    display: none;
  }
}
</style>