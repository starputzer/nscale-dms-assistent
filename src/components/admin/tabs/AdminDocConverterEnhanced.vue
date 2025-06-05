<template>
  <div class="admin-doc-converter-enhanced">
    <div class="doc-converter-header">
      <h2>{{ t("admin.docConverter.title") || "Dokumentenkonverter" }}</h2>
      <p class="description">
        {{
          t("admin.docConverter.enhancedDescription") ||
          "Verwaltung von Dokumentkonvertierungen mit intelligenter Klassifizierung und RAG-Optimierung"
        }}
      </p>
      <div class="admin-card-actions">
        <button
          class="btn btn-primary"
          @click="refreshData"
          :disabled="isLoading"
        >
          <i class="fas fa-sync-alt"></i>
          {{ t("admin.common.refresh") || "Aktualisieren" }}
        </button>
      </div>
    </div>

    <!-- Enhanced Statistics Overview with Classification Data -->
    <div class="stats-grid">
      <div class="stat-card">
        <i class="fas fa-file-alt stat-icon"></i>
        <div class="stat-content">
          <div class="stat-value">{{ statistics.totalDocuments }}</div>
          <div class="stat-label">
            {{ t("admin.docConverter.totalDocuments") || "Dokumente insgesamt" }}
          </div>
        </div>
      </div>

      <div class="stat-card">
        <i class="fas fa-brain stat-icon ai"></i>
        <div class="stat-content">
          <div class="stat-value">{{ statistics.classifiedDocuments }}</div>
          <div class="stat-label">
            {{ t("admin.docConverter.classifiedDocuments") || "Klassifizierte Dokumente" }}
          </div>
        </div>
      </div>

      <div class="stat-card">
        <i class="fas fa-robot stat-icon process"></i>
        <div class="stat-content">
          <div class="stat-value">{{ statistics.ragProcessed }}</div>
          <div class="stat-label">
            {{ t("admin.docConverter.ragProcessed") || "RAG-verarbeitet" }}
          </div>
        </div>
      </div>

      <div class="stat-card">
        <i class="fas fa-tachometer-alt stat-icon performance"></i>
        <div class="stat-content">
          <div class="stat-value">{{ statistics.avgProcessingTime }}s</div>
          <div class="stat-label">
            {{ t("admin.docConverter.avgProcessingTime") || "Ø Verarbeitungszeit" }}
          </div>
        </div>
      </div>
    </div>

    <div v-if="isLoading" class="admin-loading">
      <div class="spinner"></div>
      <p>{{ t("admin.common.loading") || "Wird geladen..." }}</p>
    </div>

    <div v-else-if="error" class="admin-error">
      <div class="error-icon">
        <i class="fas fa-exclamation-triangle"></i>
      </div>
      <div class="error-content">
        <h3>{{ t("admin.common.error") || "Fehler" }}</h3>
        <p>{{ error }}</p>
        <button class="btn btn-secondary" @click="refreshData">
          {{ t("admin.common.retry") || "Erneut versuchen" }}
        </button>
      </div>
    </div>

    <div v-else class="admin-content">
      <!-- Enhanced Tabs including Classification Overview -->
      <div class="converter-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          :class="['tab-button', { active: activeTab === tab.id }]"
          @click="activeTab = tab.id"
        >
          <i :class="tab.icon"></i>
          {{ tab.label }}
        </button>
      </div>

      <!-- Classification Overview Tab -->
      <div v-if="activeTab === 'classification'" class="classification-overview">
        <h3>{{ t("admin.docConverter.classificationOverview") || "Klassifizierungsübersicht" }}</h3>
        
        <!-- Document Type Distribution -->
        <div class="classification-section">
          <h4>{{ t("admin.docConverter.documentTypes") || "Dokumenttypen" }}</h4>
          <div class="type-distribution">
            <div v-for="(count, type) in classificationData.documentTypes" 
                 :key="type" 
                 class="type-item">
              <div class="type-bar">
                <div class="type-label">
                  <i :class="getDocTypeIcon(type)"></i>
                  {{ type }}
                </div>
                <div class="type-count">{{ count }}</div>
              </div>
              <div class="type-progress">
                <div class="progress-bar" 
                     :style="{ width: getPercentage(count, statistics.totalDocuments) + '%' }">
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Content Categories -->
        <div class="classification-section">
          <h4>{{ t("admin.docConverter.contentCategories") || "Inhaltskategorien" }}</h4>
          <div class="category-grid">
            <div v-for="(data, category) in classificationData.contentCategories" 
                 :key="category" 
                 class="category-card">
              <div class="category-header">
                <i :class="getCategoryIcon(category)"></i>
                <h5>{{ getCategoryLabel(category) }}</h5>
              </div>
              <div class="category-stats">
                <div class="stat-row">
                  <span>Dokumente:</span>
                  <strong>{{ data.count }}</strong>
                </div>
                <div class="stat-row">
                  <span>Priorität:</span>
                  <span class="priority-badge" :class="'priority-' + data.avgPriority">
                    {{ getPriorityLabel(data.avgPriority) }}
                  </span>
                </div>
                <div class="stat-row">
                  <span>Erfolgsrate:</span>
                  <strong>{{ data.successRate }}%</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Processing Strategies -->
        <div class="classification-section">
          <h4>{{ t("admin.docConverter.processingStrategies") || "Verarbeitungsstrategien" }}</h4>
          <div class="strategy-list">
            <div v-for="(data, strategy) in classificationData.processingStrategies" 
                 :key="strategy" 
                 class="strategy-item">
              <div class="strategy-info">
                <h5>{{ getStrategyLabel(strategy) }}</h5>
                <p>{{ getStrategyDescription(strategy) }}</p>
              </div>
              <div class="strategy-stats">
                <span class="doc-count">{{ data.count }} Dokumente</span>
                <span class="avg-time">Ø {{ data.avgTime }}s</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Upload Tab with Classification Preview -->
      <div v-else-if="activeTab === 'upload'" class="document-upload">
        <h3>{{ t("admin.docConverter.upload") || "Dokumente hochladen" }}</h3>
        
        <!-- File Upload Area -->
        <div class="upload-area" 
             @drop="handleDrop" 
             @dragover.prevent 
             @dragenter.prevent
             :class="{ 'drag-over': isDragOver }">
          <i class="fas fa-cloud-upload-alt upload-icon"></i>
          <p>{{ t("admin.docConverter.dropFiles") || "Dateien hier ablegen oder" }}</p>
          <input type="file" 
                 ref="fileInput" 
                 @change="handleFileSelect" 
                 multiple 
                 accept=".pdf,.docx,.txt,.html,.md,.xlsx,.pptx,.rtf,.csv,.xml,.json">
          <button class="btn btn-primary" @click="$refs.fileInput.click()">
            {{ t("admin.docConverter.selectFiles") || "Dateien auswählen" }}
          </button>
        </div>

        <!-- Classification Preview -->
        <div v-if="uploadedFiles.length > 0" class="classification-preview">
          <h4>{{ t("admin.docConverter.classificationPreview") || "Klassifizierungsvorschau" }}</h4>
          <div class="preview-table">
            <table>
              <thead>
                <tr>
                  <th>{{ t("admin.docConverter.filename") || "Dateiname" }}</th>
                  <th>{{ t("admin.docConverter.type") || "Typ" }}</th>
                  <th>{{ t("admin.docConverter.category") || "Kategorie" }}</th>
                  <th>{{ t("admin.docConverter.priority") || "Priorität" }}</th>
                  <th>{{ t("admin.docConverter.strategy") || "Strategie" }}</th>
                  <th>{{ t("admin.docConverter.actions") || "Aktionen" }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="file in uploadedFiles" :key="file.id">
                  <td>{{ file.name }}</td>
                  <td><i :class="getDocTypeIcon(file.classification?.type)"></i> {{ file.classification?.type }}</td>
                  <td>{{ getCategoryLabel(file.classification?.category) }}</td>
                  <td>
                    <span class="priority-badge" :class="'priority-' + file.classification?.priority">
                      {{ getPriorityLabel(file.classification?.priority) }}
                    </span>
                  </td>
                  <td>{{ getStrategyLabel(file.classification?.strategy) }}</td>
                  <td>
                    <button class="btn btn-sm btn-danger" @click="removeFile(file.id)">
                      <i class="fas fa-times"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="upload-actions">
            <button class="btn btn-secondary" @click="clearFiles">
              {{ t("admin.docConverter.clearAll") || "Alle entfernen" }}
            </button>
            <button class="btn btn-primary" @click="processFiles" :disabled="isProcessing">
              <i class="fas fa-play"></i>
              {{ t("admin.docConverter.startProcessing") || "Verarbeitung starten" }}
            </button>
          </div>
        </div>
      </div>

      <!-- Queue Management Tab -->
      <div v-else-if="activeTab === 'queue'" class="conversion-queue">
        <h3>{{ t("admin.docConverter.queue") || "Verarbeitungswarteschlange" }}</h3>
        
        <div class="queue-controls">
          <button class="btn btn-secondary" @click="toggleQueue" :disabled="isLoading">
            <i :class="queuePaused ? 'fas fa-play' : 'fas fa-pause'"></i>
            {{ queuePaused ? 'Warteschlange fortsetzen' : 'Warteschlange pausieren' }}
          </button>
          <button class="btn btn-danger" @click="clearQueue" :disabled="isLoading || queueItems.length === 0">
            <i class="fas fa-trash"></i>
            {{ t("admin.docConverter.clearQueue") || "Warteschlange leeren" }}
          </button>
        </div>

        <div class="queue-list">
          <div v-if="queueItems.length === 0" class="empty-state">
            <i class="fas fa-inbox"></i>
            <p>{{ t("admin.docConverter.emptyQueue") || "Keine Dokumente in der Warteschlange" }}</p>
          </div>
          <div v-else>
            <div v-for="item in queueItems" :key="item.id" class="queue-item">
              <div class="item-info">
                <h5>{{ item.filename }}</h5>
                <div class="item-details">
                  <span><i :class="getDocTypeIcon(item.type)"></i> {{ item.type }}</span>
                  <span>{{ getCategoryLabel(item.category) }}</span>
                  <span>{{ getStrategyLabel(item.strategy) }}</span>
                </div>
              </div>
              <div class="item-status">
                <div v-if="item.status === 'processing'" class="processing-indicator">
                  <div class="progress">
                    <div class="progress-bar" :style="{ width: item.progress + '%' }"></div>
                  </div>
                  <span>{{ item.progress }}%</span>
                </div>
                <span v-else class="status-badge" :class="'status-' + item.status">
                  {{ getStatusLabel(item.status) }}
                </span>
              </div>
              <div class="item-actions">
                <button v-if="item.status === 'pending'" 
                        class="btn btn-sm btn-primary" 
                        @click="prioritizeItem(item.id)">
                  <i class="fas fa-arrow-up"></i>
                </button>
                <button class="btn btn-sm btn-danger" @click="removeFromQueue(item.id)">
                  <i class="fas fa-times"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Conversions with Classification Info -->
      <div v-else-if="activeTab === 'recent'" class="recent-conversions">
        <h3>{{ t("admin.docConverter.recent") || "Letzte Konvertierungen" }}</h3>
        
        <div class="recent-filters">
          <input type="text" 
                 v-model="searchQuery" 
                 :placeholder="t('admin.common.search') || 'Suchen...'"
                 class="search-input">
          <select v-model="statusFilter" class="status-filter">
            <option value="all">{{ t("admin.common.all") || "Alle" }}</option>
            <option value="success">{{ t("admin.common.success") || "Erfolgreich" }}</option>
            <option value="failed">{{ t("admin.common.failed") || "Fehlgeschlagen" }}</option>
          </select>
        </div>

        <div class="recent-table">
          <table>
            <thead>
              <tr>
                <th>{{ t("admin.docConverter.timestamp") || "Zeitstempel" }}</th>
                <th>{{ t("admin.docConverter.filename") || "Dateiname" }}</th>
                <th>{{ t("admin.docConverter.classification") || "Klassifizierung" }}</th>
                <th>{{ t("admin.docConverter.processingTime") || "Verarbeitungszeit" }}</th>
                <th>{{ t("admin.docConverter.status") || "Status" }}</th>
                <th>{{ t("admin.docConverter.actions") || "Aktionen" }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="conversion in filteredConversions" :key="conversion.id">
                <td>{{ formatDate(conversion.timestamp) }}</td>
                <td>{{ conversion.filename }}</td>
                <td>
                  <div class="classification-info">
                    <span class="badge">{{ conversion.type }}</span>
                    <span class="badge">{{ getCategoryLabel(conversion.category) }}</span>
                  </div>
                </td>
                <td>{{ conversion.processingTime }}s</td>
                <td>
                  <span class="status-badge" :class="'status-' + conversion.status">
                    {{ getStatusLabel(conversion.status) }}
                  </span>
                </td>
                <td>
                  <button class="btn btn-sm btn-primary" @click="viewDetails(conversion.id)">
                    <i class="fas fa-eye"></i>
                  </button>
                  <button v-if="conversion.status === 'failed'" 
                          class="btn btn-sm btn-warning" 
                          @click="retryConversion(conversion.id)">
                    <i class="fas fa-redo"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="pagination">
          <button class="btn btn-sm" 
                  @click="currentPage--" 
                  :disabled="currentPage === 1">
            <i class="fas fa-chevron-left"></i>
          </button>
          <span>{{ currentPage }} / {{ totalPages }}</span>
          <button class="btn btn-sm" 
                  @click="currentPage++" 
                  :disabled="currentPage === totalPages">
            <i class="fas fa-chevron-right"></i>
          </button>
        </div>
      </div>

      <!-- Enhanced Settings Tab -->
      <div v-else-if="activeTab === 'settings'" class="converter-settings">
        <h3>{{ t("admin.docConverter.settings") || "Einstellungen" }}</h3>
        
        <div class="settings-section">
          <h4>{{ t("admin.docConverter.generalSettings") || "Allgemeine Einstellungen" }}</h4>
          <div class="setting-item">
            <label>{{ t("admin.docConverter.maxFileSize") || "Maximale Dateigröße (MB)" }}</label>
            <input type="number" v-model.number="settings.maxFileSize" min="1" max="500">
          </div>
          <div class="setting-item">
            <label>{{ t("admin.docConverter.concurrentJobs") || "Gleichzeitige Verarbeitungen" }}</label>
            <input type="number" v-model.number="settings.concurrentJobs" min="1" max="10">
          </div>
          <div class="setting-item">
            <label>
              <input type="checkbox" v-model="settings.autoClassification">
              {{ t("admin.docConverter.autoClassification") || "Automatische Klassifizierung aktivieren" }}
            </label>
          </div>
          <div class="setting-item">
            <label>
              <input type="checkbox" v-model="settings.ragProcessing">
              {{ t("admin.docConverter.ragProcessing") || "RAG-Verarbeitung aktivieren" }}
            </label>
          </div>
        </div>

        <div class="settings-section">
          <h4>{{ t("admin.docConverter.allowedFormats") || "Erlaubte Dateiformate" }}</h4>
          <div class="format-list">
            <label v-for="format in availableFormats" :key="format" class="format-item">
              <input type="checkbox" 
                     :value="format" 
                     v-model="settings.allowedFormats">
              {{ format.toUpperCase() }}
            </label>
          </div>
        </div>

        <div class="settings-section">
          <h4>{{ t("admin.docConverter.qualitySettings") || "Qualitätseinstellungen" }}</h4>
          <div class="setting-item">
            <label>{{ t("admin.docConverter.minQualityScore") || "Minimale Qualitätsbewertung" }}</label>
            <input type="range" 
                   v-model.number="settings.minQualityScore" 
                   min="0" 
                   max="1" 
                   step="0.1">
            <span>{{ settings.minQualityScore }}</span>
          </div>
          <div class="setting-item">
            <label>
              <input type="checkbox" v-model="settings.retryFailed">
              {{ t("admin.docConverter.retryFailed") || "Fehlgeschlagene Konvertierungen automatisch wiederholen" }}
            </label>
          </div>
        </div>

        <div class="settings-actions">
          <button class="btn btn-secondary" @click="resetSettings">
            {{ t("admin.common.reset") || "Zurücksetzen" }}
          </button>
          <button class="btn btn-primary" @click="saveSettings">
            {{ t("admin.common.save") || "Speichern" }}
          </button>
        </div>
      </div>
    </div>

    <!-- Detail Modal -->
    <div v-if="showDetailModal" class="modal-backdrop" @click="closeDetailModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ t("admin.docConverter.documentDetails") || "Dokumentdetails" }}</h3>
          <button class="close-btn" @click="closeDetailModal">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div v-if="selectedDocument" class="document-details">
            <div class="detail-section">
              <h4>{{ t("admin.docConverter.basicInfo") || "Grundinformationen" }}</h4>
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="label">Dateiname:</span>
                  <span class="value">{{ selectedDocument.filename }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Dateigröße:</span>
                  <span class="value">{{ formatFileSize(selectedDocument.fileSize) }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Hash:</span>
                  <span class="value hash">{{ selectedDocument.fileHash }}</span>
                </div>
              </div>
            </div>

            <div class="detail-section">
              <h4>{{ t("admin.docConverter.classificationDetails") || "Klassifizierungsdetails" }}</h4>
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="label">Dokumenttyp:</span>
                  <span class="value">{{ selectedDocument.classification.type }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Kategorie:</span>
                  <span class="value">{{ getCategoryLabel(selectedDocument.classification.category) }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Struktur:</span>
                  <span class="value">{{ selectedDocument.classification.structure }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Sprache:</span>
                  <span class="value">{{ selectedDocument.classification.language }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Verarbeitungsstrategie:</span>
                  <span class="value">{{ getStrategyLabel(selectedDocument.classification.strategy) }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Konfidenz:</span>
                  <span class="value">{{ Math.round(selectedDocument.classification.confidence * 100) }}%</span>
                </div>
              </div>
            </div>

            <div v-if="selectedDocument.warnings.length > 0" class="detail-section">
              <h4>{{ t("admin.docConverter.warnings") || "Warnungen" }}</h4>
              <ul class="warning-list">
                <li v-for="(warning, index) in selectedDocument.warnings" :key="index">
                  <i class="fas fa-exclamation-triangle"></i>
                  {{ warning }}
                </li>
              </ul>
            </div>

            <div v-if="selectedDocument.recommendations.length > 0" class="detail-section">
              <h4>{{ t("admin.docConverter.recommendations") || "Empfehlungen" }}</h4>
              <ul class="recommendation-list">
                <li v-for="(rec, index) in selectedDocument.recommendations" :key="index">
                  <i class="fas fa-lightbulb"></i>
                  {{ rec }}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useDocumentConverterStore } from "@/stores/documentConverter";
import { useAuthStore } from "@/stores/auth";
import { useToast } from "@/composables/useToast";
import type { 
  DocumentType, 
  ContentCategory, 
  ProcessingStrategy,
  ClassificationResult 
} from "@/types/documentConverter";

const { t } = useI18n();
const documentConverterStore = useDocumentConverterStore();
const authStore = useAuthStore();
const toast = useToast();

// Data
const isLoading = ref(false);
const error = ref<string | null>(null);
const activeTab = ref("classification");
const searchQuery = ref("");
const statusFilter = ref("all");
const currentPage = ref(1);
const itemsPerPage = 10;
const queuePaused = ref(false);
const isDragOver = ref(false);
const isProcessing = ref(false);
const showDetailModal = ref(false);
const selectedDocument = ref<any>(null);

// File upload
const uploadedFiles = ref<any[]>([]);
const fileInput = ref<HTMLInputElement>();

// Enhanced tabs
const tabs = [
  {
    id: "classification",
    label: "Klassifizierung",
    icon: "fas fa-brain",
  },
  {
    id: "upload",
    label: "Dokumente hochladen",
    icon: "fas fa-upload",
  },
  {
    id: "queue",
    label: "Warteschlange",
    icon: "fas fa-list",
  },
  {
    id: "recent",
    label: "Letzte Konvertierungen",
    icon: "fas fa-history",
  },
  {
    id: "settings",
    label: "Einstellungen",
    icon: "fas fa-cog",
  },
];

// Statistics
const statistics = ref({
  totalDocuments: 0,
  classifiedDocuments: 0,
  ragProcessed: 0,
  avgProcessingTime: 0,
});

// Classification data
const classificationData = ref({
  documentTypes: {} as Record<string, number>,
  contentCategories: {} as Record<string, any>,
  processingStrategies: {} as Record<string, any>,
});

// Queue items
const queueItems = ref<any[]>([]);

// Recent conversions
const recentConversions = ref<any[]>([]);

// Settings
const settings = ref({
  maxFileSize: 50,
  concurrentJobs: 3,
  autoClassification: true,
  ragProcessing: true,
  allowedFormats: ['pdf', 'docx', 'txt', 'html', 'md', 'xlsx', 'pptx'],
  minQualityScore: 0.7,
  retryFailed: true,
});

const availableFormats = ['pdf', 'docx', 'txt', 'html', 'md', 'xlsx', 'pptx', 'rtf', 'csv', 'xml', 'json'];

// Computed
const filteredConversions = computed(() => {
  let filtered = recentConversions.value;
  
  if (searchQuery.value) {
    filtered = filtered.filter(conv => 
      conv.filename.toLowerCase().includes(searchQuery.value.toLowerCase())
    );
  }
  
  if (statusFilter.value !== 'all') {
    filtered = filtered.filter(conv => conv.status === statusFilter.value);
  }
  
  const start = (currentPage.value - 1) * itemsPerPage;
  return filtered.slice(start, start + itemsPerPage);
});

const totalPages = computed(() => {
  return Math.ceil(recentConversions.value.length / itemsPerPage);
});

// Methods
const refreshData = async () => {
  isLoading.value = true;
  error.value = null;

  try {
    await Promise.all([
      loadStatistics(),
      loadClassificationData(),
      loadQueueItems(),
      loadRecentConversions(),
    ]);
    toast.success("Daten wurden erfolgreich aktualisiert");
  } catch (err: any) {
    error.value = err.message || "Ein unbekannter Fehler ist aufgetreten";
    toast.error(`Fehler beim Laden der Daten: ${error.value}`);
    console.error("Failed to load document converter data:", err);
  } finally {
    isLoading.value = false;
  }
};

const loadStatistics = async () => {
  try {
    const response = await fetch('/api/doc-converter-enhanced/statistics', {
      headers: authStore.createAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    statistics.value = data;
  } catch (error) {
    console.error('Error loading statistics:', error);
    // Show realistic initial values on error
    statistics.value = {
      totalDocuments: 0,
      classifiedDocuments: 0,
      ragProcessed: 0,
      avgProcessingTime: 0,
    };
  }
};

const loadClassificationData = async () => {
  try {
    const response = await fetch('/api/doc-converter-enhanced/classification-data', {
      headers: authStore.createAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    classificationData.value = data;
  } catch (error) {
    console.error('Error loading classification data:', error);
    // Use default values on error
    classificationData.value = {
      documentTypes: {},
      contentCategories: {},
      processingStrategies: {},
    };
  }
};

const loadQueueItems = async () => {
  try {
    const response = await fetch('/api/doc-converter-enhanced/queue', {
      headers: authStore.createAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    queueItems.value = data.items || [];
    queuePaused.value = data.paused || false;
  } catch (error) {
    console.error('Error loading queue items:', error);
    queueItems.value = [];
  }
};

const loadRecentConversions = async () => {
  try {
    const response = await fetch('/api/doc-converter-enhanced/recent?limit=100', {
      headers: authStore.createAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    recentConversions.value = data || [];
  } catch (error) {
    console.error('Error loading recent conversions:', error);
    recentConversions.value = [];
  }
};

// File handling
const handleDrop = (event: DragEvent) => {
  event.preventDefault();
  isDragOver.value = false;
  
  const files = Array.from(event.dataTransfer?.files || []);
  processSelectedFiles(files);
};

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const files = Array.from(target.files || []);
  processSelectedFiles(files);
};

const processSelectedFiles = async (files: File[]) => {
  for (const file of files) {
    // Check file size
    if (file.size > settings.value.maxFileSize * 1024 * 1024) {
      toast.warning(`${file.name} überschreitet die maximale Dateigröße`);
      continue;
    }
    
    // Check file type
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !settings.value.allowedFormats.includes(extension)) {
      toast.warning(`${file.name} hat ein nicht unterstütztes Format`);
      continue;
    }
    
    // Simulate classification
    const classification = await classifyFile(file);
    
    uploadedFiles.value.push({
      id: Date.now() + Math.random(),
      name: file.name,
      size: file.size,
      file: file,
      classification,
    });
  }
};

const classifyFile = async (file: File): Promise<any> => {
  // Simulate API call to classify file
  // In real implementation, this would call the DocumentClassifier API
  return {
    type: file.name.split('.').pop()?.toLowerCase() || 'unknown',
    category: 'manual',
    priority: 'high',
    strategy: 'standard',
    confidence: 0.95,
  };
};

const removeFile = (fileId: number) => {
  uploadedFiles.value = uploadedFiles.value.filter(f => f.id !== fileId);
};

const clearFiles = () => {
  uploadedFiles.value = [];
  if (fileInput.value) {
    fileInput.value.value = '';
  }
};

const processFiles = async () => {
  if (uploadedFiles.value.length === 0) return;
  
  isProcessing.value = true;
  try {
    // Create FormData with all files
    const formData = new FormData();
    for (const file of uploadedFiles.value) {
      formData.append('files', file.file);
    }
    
    // Add options to FormData
    const options = {
      autoClassification: settings.value.autoClassification,
      ragProcessing: settings.value.ragProcessing,
      priority: 5
    };
    formData.append('options', JSON.stringify(options));
    
    const response = await fetch('/api/doc-converter-enhanced/process', {
      method: 'POST',
      headers: authStore.createAuthHeaders(),
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    toast.success(result.message || `${uploadedFiles.value.length} Dokumente wurden zur Verarbeitung hinzugefügt`);
    clearFiles();
    
    // Switch to queue tab
    activeTab.value = 'queue';
    await loadQueueItems();
  } catch (err: any) {
    toast.error(`Fehler beim Verarbeiten der Dateien: ${err.message}`);
  } finally {
    isProcessing.value = false;
  }
};

// Queue management
const toggleQueue = async () => {
  try {
    const endpoint = queuePaused.value ? '/api/doc-converter-enhanced/queue/resume' : '/api/doc-converter-enhanced/queue/pause';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        ...authStore.createAuthHeaders(),
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    queuePaused.value = result.paused;
    toast.success(result.message);
  } catch (err: any) {
    toast.error(`Fehler: ${err.message}`);
  }
};

const clearQueue = async () => {
  if (confirm('Sind Sie sicher, dass Sie die Warteschlange leeren möchten?')) {
    try {
      // API call to clear queue
      queueItems.value = [];
      toast.success('Warteschlange geleert');
    } catch (err: any) {
      toast.error(`Fehler: ${err.message}`);
    }
  }
};

const prioritizeItem = async (itemId: string) => {
  try {
    // API call to prioritize item
    const item = queueItems.value.find(i => i.id === itemId);
    if (item) {
      queueItems.value = queueItems.value.filter(i => i.id !== itemId);
      queueItems.value.unshift(item);
      toast.success('Dokument priorisiert');
    }
  } catch (err: any) {
    toast.error(`Fehler: ${err.message}`);
  }
};

const removeFromQueue = async (itemId: string) => {
  try {
    const response = await fetch(`/api/doc-converter-enhanced/queue/${itemId}`, {
      method: 'DELETE',
      headers: authStore.createAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    queueItems.value = queueItems.value.filter(i => i.id !== itemId);
    toast.success(result.message || 'Dokument aus Warteschlange entfernt');
  } catch (err: any) {
    toast.error(`Fehler: ${err.message}`);
  }
};

// Recent conversions
const viewDetails = async (conversionId: string) => {
  try {
    const response = await fetch(`/api/doc-converter-enhanced/document/${conversionId}`, {
      headers: authStore.createAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    selectedDocument.value = data;
    showDetailModal.value = true;
  } catch (err: any) {
    toast.error(`Fehler beim Laden der Details: ${err.message}`);
  }
};

const closeDetailModal = () => {
  showDetailModal.value = false;
  selectedDocument.value = null;
};

const retryConversion = async (conversionId: string) => {
  try {
    const response = await fetch(`/api/doc-converter-enhanced/retry/${conversionId}`, {
      method: 'POST',
      headers: authStore.createAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    toast.success(result.message || 'Konvertierung wird wiederholt');
    // Reload recent conversions
    await loadRecentConversions();
  } catch (err: any) {
    toast.error(`Fehler: ${err.message}`);
  }
};

// Settings
const saveSettings = async () => {
  try {
    const response = await fetch('/api/doc-converter-enhanced/settings', {
      method: 'POST',
      headers: {
        ...authStore.createAuthHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(settings.value)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    toast.success(result.message || 'Einstellungen gespeichert');
  } catch (err: any) {
    toast.error(`Fehler beim Speichern: ${err.message}`);
  }
};

const resetSettings = () => {
  settings.value = {
    maxFileSize: 50,
    concurrentJobs: 3,
    autoClassification: true,
    ragProcessing: true,
    allowedFormats: ['pdf', 'docx', 'txt', 'html', 'md', 'xlsx', 'pptx'],
    minQualityScore: 0.7,
    retryFailed: true,
  };
  toast.info('Einstellungen zurückgesetzt');
};

// Helper functions
const getDocTypeIcon = (type: string): string => {
  const icons: Record<string, string> = {
    pdf: 'fas fa-file-pdf',
    docx: 'fas fa-file-word',
    xlsx: 'fas fa-file-excel',
    pptx: 'fas fa-file-powerpoint',
    txt: 'fas fa-file-alt',
    html: 'fas fa-code',
    md: 'fas fa-markdown',
    rtf: 'fas fa-file-alt',
    csv: 'fas fa-file-csv',
    xml: 'fas fa-file-code',
    json: 'fas fa-file-code',
    unknown: 'fas fa-file',
  };
  return icons[type] || icons.unknown;
};

const getCategoryIcon = (category: string): string => {
  const icons: Record<string, string> = {
    manual: 'fas fa-book',
    faq: 'fas fa-question-circle',
    tutorial: 'fas fa-graduation-cap',
    configuration: 'fas fa-cog',
    api_documentation: 'fas fa-code',
    troubleshooting: 'fas fa-tools',
    general: 'fas fa-file-alt',
  };
  return icons[category] || icons.general;
};

const getCategoryLabel = (category: string): string => {
  const labels: Record<string, string> = {
    manual: 'Handbuch',
    faq: 'FAQ',
    tutorial: 'Tutorial',
    configuration: 'Konfiguration',
    api_documentation: 'API-Dokumentation',
    troubleshooting: 'Fehlerbehebung',
    general: 'Allgemein',
  };
  return labels[category] || category;
};

const getStrategyLabel = (strategy: string): string => {
  const labels: Record<string, string> = {
    standard: 'Standard',
    table_optimized: 'Tabellenoptimiert',
    hierarchical_preserve: 'Hierarchie erhalten',
    qa_extraction: 'Q&A-Extraktion',
    code_aware: 'Code-bewusst',
    deep_analysis: 'Tiefenanalyse',
  };
  return labels[strategy] || strategy;
};

const getStrategyDescription = (strategy: string): string => {
  const descriptions: Record<string, string> = {
    standard: 'Standardverarbeitung für allgemeine Dokumente',
    table_optimized: 'Optimiert für Dokumente mit vielen Tabellen',
    hierarchical_preserve: 'Erhält die hierarchische Struktur des Dokuments',
    qa_extraction: 'Extrahiert Frage-Antwort-Paare',
    code_aware: 'Erkennt und bewahrt Code-Blöcke',
    deep_analysis: 'Detaillierte Analyse mit erweiterten Funktionen',
  };
  return descriptions[strategy] || '';
};

const getPriorityLabel = (priority: string): string => {
  const labels: Record<string, string> = {
    high: 'Hoch',
    medium: 'Mittel',
    low: 'Niedrig',
  };
  return labels[priority] || priority;
};

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    pending: 'Ausstehend',
    processing: 'In Bearbeitung',
    success: 'Erfolgreich',
    failed: 'Fehlgeschlagen',
  };
  return labels[status] || status;
};

const getPercentage = (value: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('de-DE');
};

const formatFileSize = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
};

// Lifecycle
onMounted(() => {
  refreshData();
});

// Load settings from API
const loadSettings = async () => {
  try {
    const response = await fetch('/api/doc-converter-enhanced/settings', {
      headers: authStore.createAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    settings.value = data;
  } catch (error) {
    console.error('Error loading settings:', error);
  }
};

// Watch for tab changes
watch(activeTab, (newTab) => {
  // Load data specific to the tab when it becomes active
  if (newTab === 'queue') {
    loadQueueItems();
  } else if (newTab === 'recent') {
    loadRecentConversions();
  } else if (newTab === 'settings') {
    loadSettings();
  }
});
</script>

<style scoped lang="scss">
.admin-doc-converter-enhanced {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;

  .doc-converter-header {
    margin-bottom: 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;

    h2 {
      margin: 0 0 0.5rem 0;
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--text-primary, #333);
      flex: 1 0 100%;
    }

    .description {
      color: var(--text-secondary, #666);
      margin: 0 0 1rem 0;
      font-size: 0.95rem;
      flex: 1 0 100%;
    }

    .admin-card-actions {
      margin-left: auto;
    }
  }

  // Enhanced stats grid
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .stat-card {
    background: var(--bg-secondary, #ffffff);
    border-radius: 8px;
    padding: 1.5rem;
    box-shadow: 0 2px 4px var(--shadow-color, rgba(0, 0, 0, 0.1));
    display: flex;
    align-items: center;
    gap: 1rem;
    transition: transform 0.2s ease;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px var(--shadow-color, rgba(0, 0, 0, 0.15));
    }

    .stat-icon {
      font-size: 2rem;
      color: var(--primary-color, #00a550);

      &.ai {
        color: #6366f1;
      }

      &.process {
        color: #8b5cf6;
      }

      &.performance {
        color: #f59e0b;
      }
    }

    .stat-content {
      flex: 1;

      .stat-value {
        font-size: 1.8rem;
        font-weight: 600;
        color: var(--text-primary, #333);
      }

      .stat-label {
        color: var(--text-secondary, #666);
        font-size: 0.9rem;
      }
    }
  }

  // Loading and error states
  .admin-loading,
  .admin-error {
    padding: 40px;
    text-align: center;
    background: var(--bg-secondary, #ffffff);
    border-radius: 8px;
    box-shadow: 0 2px 4px var(--shadow-color, rgba(0, 0, 0, 0.1));
    margin-bottom: 1.5rem;

    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid rgba(0, 0, 0, 0.1);
      border-radius: 50%;
      border-top-color: var(--primary-color, #00a550);
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  }

  // Admin content
  .admin-content {
    background: var(--bg-secondary, #ffffff);
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 2px 4px var(--shadow-color, rgba(0, 0, 0, 0.1));
  }

  // Tabs
  .converter-tabs {
    display: flex;
    margin-bottom: 20px;
    border-bottom: 1px solid var(--border-color, #e5e7eb);
    overflow-x: auto;

    .tab-button {
      padding: 12px 20px;
      border: none;
      background: none;
      font-size: 14px;
      cursor: pointer;
      position: relative;
      white-space: nowrap;
      color: var(--text-secondary, #666);
      transition: color 0.2s ease;

      &:hover {
        color: var(--primary-color, #00a550);
      }

      &.active {
        color: var(--primary-color, #00a550);
        font-weight: 600;

        &:after {
          content: "";
          position: absolute;
          bottom: -1px;
          left: 0;
          width: 100%;
          height: 2px;
          background-color: var(--primary-color, #00a550);
        }
      }

      i {
        margin-right: 8px;
      }
    }
  }

  // Classification overview
  .classification-overview {
    .classification-section {
      margin-bottom: 2rem;

      h4 {
        margin-bottom: 1rem;
        color: var(--text-primary, #333);
      }
    }

    .type-distribution {
      .type-item {
        margin-bottom: 1rem;

        .type-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.25rem;

          .type-label {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.9rem;
            color: var(--text-secondary, #666);

            i {
              width: 20px;
              text-align: center;
            }
          }

          .type-count {
            font-weight: 600;
            color: var(--text-primary, #333);
          }
        }

        .type-progress {
          height: 8px;
          background: var(--bg-tertiary, #f3f4f6);
          border-radius: 4px;
          overflow: hidden;

          .progress-bar {
            height: 100%;
            background: var(--primary-color, #00a550);
            transition: width 0.3s ease;
          }
        }
      }
    }

    .category-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1rem;

      .category-card {
        background: var(--bg-tertiary, #f9fafb);
        border-radius: 8px;
        padding: 1rem;
        border: 1px solid var(--border-color, #e5e7eb);

        .category-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;

          i {
            font-size: 1.25rem;
            color: var(--primary-color, #00a550);
          }

          h5 {
            margin: 0;
            font-size: 1rem;
            color: var(--text-primary, #333);
          }
        }

        .category-stats {
          .stat-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.5rem;
            font-size: 0.9rem;

            span:first-child {
              color: var(--text-secondary, #666);
            }

            strong {
              color: var(--text-primary, #333);
            }

            .priority-badge {
              padding: 0.125rem 0.5rem;
              border-radius: 12px;
              font-size: 0.8rem;
              font-weight: 500;

              &.priority-high {
                background: #fee2e2;
                color: #dc2626;
              }

              &.priority-medium {
                background: #fef3c7;
                color: #d97706;
              }

              &.priority-low {
                background: #dbeafe;
                color: #2563eb;
              }
            }
          }
        }
      }
    }

    .strategy-list {
      .strategy-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        background: var(--bg-tertiary, #f9fafb);
        border-radius: 8px;
        margin-bottom: 0.75rem;
        border: 1px solid var(--border-color, #e5e7eb);

        .strategy-info {
          h5 {
            margin: 0 0 0.25rem 0;
            color: var(--text-primary, #333);
          }

          p {
            margin: 0;
            font-size: 0.9rem;
            color: var(--text-secondary, #666);
          }
        }

        .strategy-stats {
          display: flex;
          align-items: center;
          gap: 1rem;

          .doc-count {
            padding: 0.25rem 0.75rem;
            background: var(--bg-secondary, #ffffff);
            border-radius: 16px;
            font-size: 0.9rem;
            color: var(--text-primary, #333);
          }

          .avg-time {
            font-size: 0.9rem;
            color: var(--text-secondary, #666);
          }
        }
      }
    }
  }

  // Upload area
  .upload-area {
    border: 2px dashed var(--border-color, #e5e7eb);
    border-radius: 8px;
    padding: 3rem;
    text-align: center;
    background: var(--bg-tertiary, #f9fafb);
    transition: all 0.3s ease;

    &.drag-over {
      border-color: var(--primary-color, #00a550);
      background: #f0fdf4;
    }

    .upload-icon {
      font-size: 3rem;
      color: var(--text-secondary, #666);
      margin-bottom: 1rem;
    }

    input[type="file"] {
      display: none;
    }

    p {
      margin-bottom: 1rem;
      color: var(--text-secondary, #666);
    }
  }

  // Classification preview
  .classification-preview {
    margin-top: 2rem;

    h4 {
      margin-bottom: 1rem;
    }

    .preview-table {
      overflow-x: auto;

      table {
        width: 100%;
        border-collapse: collapse;

        th, td {
          padding: 0.75rem;
          text-align: left;
          border-bottom: 1px solid var(--border-color, #e5e7eb);
        }

        th {
          background: var(--bg-tertiary, #f9fafb);
          font-weight: 600;
          color: var(--text-primary, #333);
        }

        td {
          font-size: 0.9rem;

          i {
            margin-right: 0.25rem;
          }

          .hash {
            font-family: monospace;
            font-size: 0.8rem;
            color: var(--text-secondary, #666);
            word-break: break-all;
          }
        }
      }
    }

    .upload-actions {
      display: flex;
      justify-content: space-between;
      margin-top: 1rem;
    }
  }

  // Queue management
  .queue-controls {
    display: flex;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .queue-list {
    .empty-state {
      text-align: center;
      padding: 3rem;
      color: var(--text-secondary, #666);

      i {
        font-size: 3rem;
        margin-bottom: 1rem;
        opacity: 0.5;
      }
    }

    .queue-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: var(--bg-tertiary, #f9fafb);
      border-radius: 8px;
      margin-bottom: 0.75rem;
      border: 1px solid var(--border-color, #e5e7eb);

      .item-info {
        flex: 1;

        h5 {
          margin: 0 0 0.25rem 0;
          color: var(--text-primary, #333);
        }

        .item-details {
          display: flex;
          gap: 1rem;
          font-size: 0.9rem;
          color: var(--text-secondary, #666);

          span {
            display: flex;
            align-items: center;
            gap: 0.25rem;
          }
        }
      }

      .item-status {
        .processing-indicator {
          display: flex;
          align-items: center;
          gap: 0.5rem;

          .progress {
            width: 100px;
            height: 8px;
            background: var(--bg-secondary, #e5e7eb);
            border-radius: 4px;
            overflow: hidden;

            .progress-bar {
              height: 100%;
              background: var(--primary-color, #00a550);
              transition: width 0.3s ease;
            }
          }

          span {
            font-size: 0.9rem;
            font-weight: 500;
          }
        }

        .status-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 16px;
          font-size: 0.85rem;
          font-weight: 500;

          &.status-pending {
            background: #f3f4f6;
            color: #6b7280;
          }

          &.status-processing {
            background: #dbeafe;
            color: #2563eb;
          }

          &.status-success {
            background: #d1fae5;
            color: #065f46;
          }

          &.status-failed {
            background: #fee2e2;
            color: #dc2626;
          }
        }
      }

      .item-actions {
        display: flex;
        gap: 0.5rem;
      }
    }
  }

  // Recent conversions
  .recent-filters {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;

    .search-input {
      flex: 1;
      padding: 0.5rem 1rem;
      border: 1px solid var(--border-color, #e5e7eb);
      border-radius: 4px;
      font-size: 0.9rem;

      &:focus {
        outline: none;
        border-color: var(--primary-color, #00a550);
      }
    }

    .status-filter {
      padding: 0.5rem 1rem;
      border: 1px solid var(--border-color, #e5e7eb);
      border-radius: 4px;
      font-size: 0.9rem;
      background: var(--bg-secondary, #ffffff);
    }
  }

  .recent-table {
    overflow-x: auto;
    margin-bottom: 1rem;

    table {
      width: 100%;
      border-collapse: collapse;

      th, td {
        padding: 0.75rem;
        text-align: left;
        border-bottom: 1px solid var(--border-color, #e5e7eb);
      }

      th {
        background: var(--bg-tertiary, #f9fafb);
        font-weight: 600;
        color: var(--text-primary, #333);
      }

      td {
        font-size: 0.9rem;

        .classification-info {
          display: flex;
          gap: 0.5rem;

          .badge {
            padding: 0.125rem 0.5rem;
            background: var(--bg-tertiary, #f3f4f6);
            border-radius: 12px;
            font-size: 0.8rem;
          }
        }
      }
    }
  }

  // Pagination
  .pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1rem;

    span {
      font-size: 0.9rem;
      color: var(--text-secondary, #666);
    }
  }

  // Settings
  .converter-settings {
    .settings-section {
      margin-bottom: 2rem;
      padding-bottom: 2rem;
      border-bottom: 1px solid var(--border-color, #e5e7eb);

      &:last-child {
        border-bottom: none;
      }

      h4 {
        margin-bottom: 1rem;
        color: var(--text-primary, #333);
      }
    }

    .setting-item {
      margin-bottom: 1rem;

      label {
        display: block;
        margin-bottom: 0.5rem;
        color: var(--text-secondary, #666);
        font-size: 0.9rem;
      }

      input[type="number"],
      input[type="text"] {
        width: 100%;
        max-width: 200px;
        padding: 0.5rem;
        border: 1px solid var(--border-color, #e5e7eb);
        border-radius: 4px;
        font-size: 0.9rem;

        &:focus {
          outline: none;
          border-color: var(--primary-color, #00a550);
        }
      }

      input[type="checkbox"] {
        margin-right: 0.5rem;
      }

      input[type="range"] {
        width: 200px;
        margin-right: 1rem;
      }
    }

    .format-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
      gap: 0.5rem;

      .format-item {
        display: flex;
        align-items: center;
        font-size: 0.9rem;

        input[type="checkbox"] {
          margin-right: 0.5rem;
        }
      }
    }

    .settings-actions {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      margin-top: 2rem;
    }
  }

  // Buttons
  .btn {
    padding: 8px 16px;
    border-radius: 4px;
    border: none;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s ease;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;

    &.btn-primary {
      background-color: var(--primary-color, #00a550);
      color: white;

      &:hover:not(:disabled) {
        background-color: var(--primary-color-dark, #008040);
      }
    }

    &.btn-secondary {
      background-color: var(--secondary-color, #6b7280);
      color: white;

      &:hover:not(:disabled) {
        background-color: var(--secondary-color-dark, #4b5563);
      }
    }

    &.btn-danger {
      background-color: var(--error-color, #ef4444);
      color: white;

      &:hover:not(:disabled) {
        background-color: var(--error-color-dark, #dc2626);
      }
    }

    &.btn-warning {
      background-color: #f59e0b;
      color: white;

      &:hover:not(:disabled) {
        background-color: #d97706;
      }
    }

    &.btn-sm {
      padding: 4px 8px;
      font-size: 12px;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  // Modal
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;

    .modal-content {
      background-color: var(--bg-secondary, #ffffff);
      border-radius: 8px;
      width: 90%;
      max-width: 800px;
      max-height: 90vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;

      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.5rem;
        border-bottom: 1px solid var(--border-color, #e5e7eb);

        h3 {
          margin: 0;
          color: var(--text-primary, #333);
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 1.5rem;
          color: var(--text-secondary, #666);
          cursor: pointer;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: all 0.2s ease;

          &:hover {
            background: var(--bg-tertiary, #f3f4f6);
          }
        }
      }

      .modal-body {
        padding: 1.5rem;
        overflow-y: auto;
        flex: 1;

        .document-details {
          .detail-section {
            margin-bottom: 2rem;

            &:last-child {
              margin-bottom: 0;
            }

            h4 {
              margin: 0 0 1rem 0;
              color: var(--text-primary, #333);
              font-size: 1.1rem;
            }

            .detail-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
              gap: 1rem;

              .detail-item {
                .label {
                  display: block;
                  font-size: 0.85rem;
                  color: var(--text-secondary, #666);
                  margin-bottom: 0.25rem;
                }

                .value {
                  font-size: 0.95rem;
                  color: var(--text-primary, #333);

                  &.hash {
                    font-family: monospace;
                    font-size: 0.8rem;
                    word-break: break-all;
                  }
                }
              }
            }

            .warning-list,
            .recommendation-list {
              list-style: none;
              padding: 0;
              margin: 0;

              li {
                display: flex;
                align-items: flex-start;
                gap: 0.5rem;
                padding: 0.5rem 0;
                font-size: 0.9rem;

                i {
                  margin-top: 0.125rem;
                  flex-shrink: 0;
                }
              }

              .warning-list i {
                color: #f59e0b;
              }

              .recommendation-list i {
                color: #3b82f6;
              }
            }
          }
        }
      }
    }
  }
}

// Dark mode support
@media (prefers-color-scheme: dark) {
  .admin-doc-converter-enhanced {
    --bg-secondary: #1f2937;
    --bg-tertiary: #111827;
    --text-primary: #f9fafb;
    --text-secondary: #9ca3af;
    --border-color: #374151;
    --shadow-color: rgba(0, 0, 0, 0.3);
  }
}

// Responsive styles
@media (max-width: 768px) {
  .admin-doc-converter-enhanced {
    .converter-tabs {
      .tab-button {
        padding: 10px 12px;
        font-size: 13px;

        i {
          display: none;
        }
      }
    }

    .category-grid {
      grid-template-columns: 1fr !important;
    }

    .recent-filters {
      flex-direction: column;

      .search-input {
        width: 100%;
      }
    }

    .queue-item {
      flex-direction: column;
      align-items: flex-start;

      .item-status,
      .item-actions {
        align-self: flex-end;
      }
    }
  }
}

@media (max-width: 480px) {
  .admin-doc-converter-enhanced {
    .stats-grid {
      grid-template-columns: 1fr !important;
    }

    .preview-table {
      font-size: 0.8rem;

      th, td {
        padding: 0.5rem;
      }
    }

    .modal-content {
      width: 95%;
      max-height: 95vh;
    }
  }
}
</style>