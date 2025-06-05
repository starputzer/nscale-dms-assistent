<template>
  <div class="rag-settings">
    <header class="settings-header">
      <h2 class="settings-title">{{ t('admin.ragSettings.title', 'RAG-System Einstellungen') }}</h2>
      <div class="header-actions">
        <button class="btn btn-secondary" @click="testSettings">
          <i class="fas fa-vial"></i>
          {{ t('admin.ragSettings.test', 'Testen') }}
        </button>
        <button class="btn btn-secondary" @click="resetToDefaults">
          <i class="fas fa-undo"></i>
          {{ t('admin.ragSettings.reset', 'Zurücksetzen') }}
        </button>
        <button class="btn btn-primary" @click="saveSettings" :disabled="!hasChanges || isSaving">
          <i v-if="isSaving" class="fas fa-spinner fa-spin"></i>
          <i v-else class="fas fa-save"></i>
          {{ isSaving ? t('admin.ragSettings.saving', 'Speichern...') : t('admin.ragSettings.save', 'Speichern') }}
        </button>
      </div>
    </header>

    <!-- Performance Metrics -->
    <section v-if="performanceMetrics" class="performance-metrics">
      <h3 class="section-title">
        <i class="fas fa-chart-line"></i>
        {{ t('admin.ragSettings.performanceMetrics', 'Performance-Metriken') }}
      </h3>
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-icon">
            <i class="fas fa-clock"></i>
          </div>
          <div class="metric-content">
            <span class="metric-label">{{ t('admin.ragSettings.avgQueryTime', 'Durchschn. Abfragezeit') }}</span>
            <span class="metric-value">{{ performanceMetrics.avg_query_time_ms ? performanceMetrics.avg_query_time_ms.toFixed(1) : '0.0' }} ms</span>
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-icon">
            <i class="fas fa-vector-square"></i>
          </div>
          <div class="metric-content">
            <span class="metric-label">{{ t('admin.ragSettings.avgEmbeddingTime', 'Durchschn. Embedding-Zeit') }}</span>
            <span class="metric-value">{{ performanceMetrics.avg_embedding_time_ms ? performanceMetrics.avg_embedding_time_ms.toFixed(1) : '0.0' }} ms</span>
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-icon">
            <i class="fas fa-percentage"></i>
          </div>
          <div class="metric-content">
            <span class="metric-label">{{ t('admin.ragSettings.cacheHitRate', 'Cache-Trefferquote') }}</span>
            <span class="metric-value">{{ performanceMetrics.cache_hit_rate ? (performanceMetrics.cache_hit_rate * 100).toFixed(0) : 0 }}%</span>
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-icon">
            <i class="fas fa-database"></i>
          </div>
          <div class="metric-content">
            <span class="metric-label">{{ t('admin.ragSettings.indexSize', 'Index-Größe') }}</span>
            <span class="metric-value">{{ performanceMetrics.index_size_mb?.toFixed(1) }} MB</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Model Configuration -->
    <section class="settings-section">
      <h3 class="section-title">
        <i class="fas fa-robot"></i>
        {{ t('admin.ragSettings.modelConfig', 'Modell-Konfiguration') }}
      </h3>
      
      <div class="settings-grid">
        <div class="setting-group">
          <label>{{ t('admin.ragSettings.embeddingModel', 'Embedding-Modell') }}</label>
          <select v-model="settings.embeddingModel" class="form-control">
            <template v-if="availableModels.length > 0">
              <option 
                v-for="model in availableModels.filter(m => m.dimensions > 0)" 
                :key="model.model_id"
                :value="model.model_id"
              >
                {{ model.model_name }} - {{ model.description }}
              </option>
            </template>
            <template v-else>
              <option value="sentence-transformers/all-MiniLM-L6-v2">all-MiniLM-L6-v2 (Schnell)</option>
              <option value="sentence-transformers/all-mpnet-base-v2">all-mpnet-base-v2 (Ausgewogen)</option>
              <option value="sentence-transformers/all-roberta-large-v1">all-roberta-large-v1 (Präzise)</option>
            </template>
          </select>
          <p class="setting-hint">{{ t('admin.ragSettings.embeddingModelHint', 'Modell für die Vektorisierung von Dokumenten') }}</p>
        </div>

        <div class="setting-group">
          <label>{{ t('admin.ragSettings.rerankerModel', 'Reranker-Modell') }}</label>
          <select v-model="settings.rerankerModel" class="form-control">
            <option value="none">{{ t('admin.ragSettings.noReranker', 'Kein Reranker') }}</option>
            <template v-if="availableModels.length > 0">
              <option 
                v-for="model in availableModels.filter(m => m.dimensions === 0)" 
                :key="model.model_id"
                :value="model.model_id"
              >
                {{ model.model_name }} - {{ model.description }}
              </option>
            </template>
            <template v-else>
              <option value="cross-encoder/ms-marco-MiniLM-L-6-v2">ms-marco-MiniLM-L-6-v2</option>
              <option value="cross-encoder/ms-marco-MiniLM-L-12-v2">ms-marco-MiniLM-L-12-v2</option>
            </template>
          </select>
          <p class="setting-hint">{{ t('admin.ragSettings.rerankerModelHint', 'Modell zur Verbesserung der Relevanz-Sortierung') }}</p>
        </div>

        <div class="setting-group">
          <label>{{ t('admin.ragSettings.vectorDimensions', 'Vektor-Dimensionen') }}</label>
          <input 
            type="number" 
            v-model.number="settings.vectorDimensions" 
            class="form-control"
            min="128"
            max="1024"
            step="128"
          >
          <p class="setting-hint">{{ t('admin.ragSettings.vectorDimensionsHint', 'Anzahl der Dimensionen für Embeddings') }}</p>
        </div>
      </div>
    </section>

    <!-- Retrieval Settings -->
    <section class="settings-section">
      <h3 class="section-title">
        <i class="fas fa-search"></i>
        {{ t('admin.ragSettings.retrievalSettings', 'Abruf-Einstellungen') }}
      </h3>
      
      <div class="settings-grid">
        <div class="setting-group">
          <label>{{ t('admin.ragSettings.topK', 'Top-K Ergebnisse') }}</label>
          <input 
            type="number" 
            v-model.number="settings.topK" 
            class="form-control"
            min="1"
            max="50"
          >
          <p class="setting-hint">{{ t('admin.ragSettings.topKHint', 'Anzahl der abgerufenen Dokumente') }}</p>
        </div>

        <div class="setting-group">
          <label>{{ t('admin.ragSettings.similarityThreshold', 'Ähnlichkeits-Schwellwert') }}</label>
          <div class="slider-container">
            <input 
              type="range" 
              v-model.number="settings.similarityThreshold" 
              class="slider"
              min="0"
              max="1"
              step="0.05"
            >
            <span class="slider-value">{{ settings.similarityThreshold }}</span>
          </div>
          <p class="setting-hint">{{ t('admin.ragSettings.similarityThresholdHint', 'Minimale Ähnlichkeit für Ergebnisse') }}</p>
        </div>

        <div class="setting-group">
          <label>{{ t('admin.ragSettings.hybridSearch', 'Hybrid-Suche') }}</label>
          <label class="toggle-switch">
            <input type="checkbox" v-model="settings.hybridSearch">
            <span class="toggle-slider"></span>
          </label>
          <p class="setting-hint">{{ t('admin.ragSettings.hybridSearchHint', 'Kombiniert Vektor- und Keyword-Suche') }}</p>
        </div>

        <div class="setting-group" v-if="settings.hybridSearch">
          <label>{{ t('admin.ragSettings.hybridAlpha', 'Hybrid-Alpha') }}</label>
          <div class="slider-container">
            <input 
              type="range" 
              v-model.number="settings.hybridAlpha" 
              class="slider"
              min="0"
              max="1"
              step="0.1"
            >
            <span class="slider-value">{{ settings.hybridAlpha }}</span>
          </div>
          <p class="setting-hint">{{ t('admin.ragSettings.hybridAlphaHint', '0 = nur Keyword, 1 = nur Vektor') }}</p>
        </div>
      </div>
    </section>

    <!-- Chunking Settings -->
    <section class="settings-section">
      <h3 class="section-title">
        <i class="fas fa-cut"></i>
        {{ t('admin.ragSettings.chunkingSettings', 'Chunking-Einstellungen') }}
      </h3>
      
      <div class="settings-grid">
        <div class="setting-group">
          <label>{{ t('admin.ragSettings.chunkSize', 'Chunk-Größe') }}</label>
          <input 
            type="number" 
            v-model.number="settings.chunkSize" 
            class="form-control"
            min="100"
            max="2000"
            step="100"
          >
          <p class="setting-hint">{{ t('admin.ragSettings.chunkSizeHint', 'Maximale Zeichen pro Chunk') }}</p>
        </div>

        <div class="setting-group">
          <label>{{ t('admin.ragSettings.chunkOverlap', 'Chunk-Überlappung') }}</label>
          <input 
            type="number" 
            v-model.number="settings.chunkOverlap" 
            class="form-control"
            min="0"
            max="500"
            step="50"
          >
          <p class="setting-hint">{{ t('admin.ragSettings.chunkOverlapHint', 'Überlappende Zeichen zwischen Chunks') }}</p>
        </div>

        <div class="setting-group">
          <label>{{ t('admin.ragSettings.chunkingStrategy', 'Chunking-Strategie') }}</label>
          <select v-model="settings.chunkingStrategy" class="form-control">
            <option value="fixed">{{ t('admin.ragSettings.fixedSize', 'Feste Größe') }}</option>
            <option value="semantic">{{ t('admin.ragSettings.semantic', 'Semantisch') }}</option>
            <option value="sentence">{{ t('admin.ragSettings.sentence', 'Satzbasiert') }}</option>
            <option value="paragraph">{{ t('admin.ragSettings.paragraph', 'Absatzbasiert') }}</option>
          </select>
          <p class="setting-hint">{{ t('admin.ragSettings.chunkingStrategyHint', 'Methode zur Aufteilung von Dokumenten') }}</p>
        </div>

        <div class="setting-group">
          <label>{{ t('admin.ragSettings.preserveContext', 'Kontext bewahren') }}</label>
          <label class="toggle-switch">
            <input type="checkbox" v-model="settings.preserveContext">
            <span class="toggle-slider"></span>
          </label>
          <p class="setting-hint">{{ t('admin.ragSettings.preserveContextHint', 'Hierarchische Kontext-Informationen beibehalten') }}</p>
        </div>
      </div>
    </section>

    <!-- Performance Settings -->
    <section class="settings-section">
      <h3 class="section-title">
        <i class="fas fa-tachometer-alt"></i>
        {{ t('admin.ragSettings.performanceSettings', 'Leistungs-Einstellungen') }}
      </h3>
      
      <div class="settings-grid">
        <div class="setting-group">
          <label>{{ t('admin.ragSettings.cacheEnabled', 'Cache aktiviert') }}</label>
          <label class="toggle-switch">
            <input type="checkbox" v-model="settings.cacheEnabled">
            <span class="toggle-slider"></span>
          </label>
          <p class="setting-hint">{{ t('admin.ragSettings.cacheEnabledHint', 'Zwischenspeicherung von Abfrageergebnissen') }}</p>
        </div>

        <div class="setting-group" v-if="settings.cacheEnabled">
          <label>{{ t('admin.ragSettings.cacheTTL', 'Cache-TTL (Minuten)') }}</label>
          <input 
            type="number" 
            v-model.number="settings.cacheTTL" 
            class="form-control"
            min="1"
            max="1440"
          >
          <p class="setting-hint">{{ t('admin.ragSettings.cacheTTLHint', 'Lebensdauer von Cache-Einträgen') }}</p>
        </div>

        <div class="setting-group">
          <label>{{ t('admin.ragSettings.batchSize', 'Batch-Größe') }}</label>
          <input 
            type="number" 
            v-model.number="settings.batchSize" 
            class="form-control"
            min="1"
            max="100"
          >
          <p class="setting-hint">{{ t('admin.ragSettings.batchSizeHint', 'Dokumente pro Verarbeitungs-Batch') }}</p>
        </div>

        <div class="setting-group">
          <label>{{ t('admin.ragSettings.maxConcurrency', 'Max. Parallelität') }}</label>
          <input 
            type="number" 
            v-model.number="settings.maxConcurrency" 
            class="form-control"
            min="1"
            max="10"
          >
          <p class="setting-hint">{{ t('admin.ragSettings.maxConcurrencyHint', 'Maximale parallele Verarbeitungen') }}</p>
        </div>
      </div>
    </section>

    <!-- Quality Settings -->
    <section class="settings-section">
      <h3 class="section-title">
        <i class="fas fa-award"></i>
        {{ t('admin.ragSettings.qualitySettings', 'Qualitäts-Einstellungen') }}
      </h3>
      
      <div class="settings-grid">
        <div class="setting-group">
          <label>{{ t('admin.ragSettings.minQualityScore', 'Min. Qualitäts-Score') }}</label>
          <div class="slider-container">
            <input 
              type="range" 
              v-model.number="settings.minQualityScore" 
              class="slider"
              min="0"
              max="100"
              step="5"
            >
            <span class="slider-value">{{ settings.minQualityScore }}%</span>
          </div>
          <p class="setting-hint">{{ t('admin.ragSettings.minQualityScoreHint', 'Minimaler Qualitäts-Score für Dokumente') }}</p>
        </div>

        <div class="setting-group">
          <label>{{ t('admin.ragSettings.duplicateDetection', 'Duplikat-Erkennung') }}</label>
          <label class="toggle-switch">
            <input type="checkbox" v-model="settings.duplicateDetection">
            <span class="toggle-slider"></span>
          </label>
          <p class="setting-hint">{{ t('admin.ragSettings.duplicateDetectionHint', 'Automatische Erkennung doppelter Inhalte') }}</p>
        </div>

        <div class="setting-group">
          <label>{{ t('admin.ragSettings.autoCorrection', 'Auto-Korrektur') }}</label>
          <label class="toggle-switch">
            <input type="checkbox" v-model="settings.autoCorrection">
            <span class="toggle-slider"></span>
          </label>
          <p class="setting-hint">{{ t('admin.ragSettings.autoCorrectionHint', 'Automatische Rechtschreibkorrektur bei Abfragen') }}</p>
        </div>

        <div class="setting-group">
          <label>{{ t('admin.ragSettings.contextEnrichment', 'Kontext-Anreicherung') }}</label>
          <label class="toggle-switch">
            <input type="checkbox" v-model="settings.contextEnrichment">
            <span class="toggle-slider"></span>
          </label>
          <p class="setting-hint">{{ t('admin.ragSettings.contextEnrichmentHint', 'Zusätzliche Kontextinformationen hinzufügen') }}</p>
        </div>
      </div>
    </section>

    <!-- Advanced Settings -->
    <section class="settings-section">
      <h3 class="section-title">
        <i class="fas fa-cog"></i>
        {{ t('admin.ragSettings.advancedSettings', 'Erweiterte Einstellungen') }}
      </h3>
      
      <div class="settings-grid">
        <div class="setting-group">
          <label>{{ t('admin.ragSettings.customPromptTemplate', 'Benutzerdefiniertes Prompt-Template') }}</label>
          <textarea 
            v-model="settings.customPromptTemplate" 
            class="form-control"
            rows="4"
            :placeholder="t('admin.ragSettings.promptTemplatePlaceholder', 'Template mit {context} und {question} Platzhaltern')"
          ></textarea>
          <p class="setting-hint">{{ t('admin.ragSettings.customPromptTemplateHint', 'Template für RAG-Abfragen') }}</p>
        </div>

        <div class="setting-group">
          <label>{{ t('admin.ragSettings.metadataFields', 'Metadaten-Felder') }}</label>
          <div class="metadata-fields">
            <div 
              v-for="(field, index) in settings.metadataFields" 
              :key="index"
              class="metadata-field"
            >
              <input 
                v-model="field.name" 
                class="form-control"
                placeholder="Feldname"
              >
              <select v-model="field.type" class="form-control">
                <option value="string">String</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
                <option value="boolean">Boolean</option>
              </select>
              <button class="btn-icon danger" @click="removeMetadataField(index)">
                <i class="fas fa-trash"></i>
              </button>
            </div>
            <button class="btn btn-sm btn-secondary" @click="addMetadataField">
              <i class="fas fa-plus"></i>
              {{ t('admin.ragSettings.addField', 'Feld hinzufügen') }}
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Presets -->
    <section class="settings-section">
      <h3 class="section-title">
        <i class="fas fa-bookmark"></i>
        {{ t('admin.ragSettings.presets', 'Voreinstellungen') }}
      </h3>
      
      <div class="presets-grid">
        <div 
          class="preset-card"
          v-for="preset in presets"
          :key="preset.id"
          @click="applyPreset(preset)"
        >
          <i :class="preset.icon"></i>
          <h4>{{ preset.name }}</h4>
          <p>{{ preset.description }}</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from '@/composables/useToast';
import apiService from '@/services/api/ApiService';

const { t } = useI18n();
const toast = useToast();

// State
const isSaving = ref(false);
const originalSettings = ref<any>(null);

// Settings
const settings = ref({
  // Model Configuration
  embeddingModel: 'sentence-transformers/all-MiniLM-L6-v2',
  rerankerModel: 'none',
  vectorDimensions: 384,
  
  // Retrieval Settings
  topK: 10,
  similarityThreshold: 0.7,
  hybridSearch: true,
  hybridAlpha: 0.5,
  
  // Chunking Settings
  chunkSize: 1000,
  chunkOverlap: 200,
  chunkingStrategy: 'semantic',
  preserveContext: true,
  
  // Performance Settings
  cacheEnabled: true,
  cacheTTL: 60,
  batchSize: 10,
  maxConcurrency: 4,
  
  // Quality Settings
  minQualityScore: 70,
  duplicateDetection: true,
  autoCorrection: true,
  contextEnrichment: true,
  
  // Advanced Settings
  customPromptTemplate: '',
  metadataFields: [
    { name: 'author', type: 'string' },
    { name: 'created_date', type: 'date' },
    { name: 'category', type: 'string' }
  ]
});

// Presets from API
const presets = ref<any[]>([]);
const availableModels = ref<any[]>([]);
const performanceMetrics = ref<any>(null);

// Presets (fallback if API fails)
const getDefaultPresets = () => [
  {
    id: 'fast',
    name: 'Schnell',
    icon: 'fas fa-rocket',
    description: 'Optimiert für schnelle Antwortzeiten',
    settings: {
      embeddingModel: 'sentence-transformers/all-MiniLM-L6-v2',
      topK: 5,
      chunkSize: 500,
      cacheEnabled: true,
      batchSize: 20
    }
  },
  {
    id: 'balanced',
    name: 'Ausgewogen',
    icon: 'fas fa-balance-scale',
    description: 'Balance zwischen Geschwindigkeit und Genauigkeit',
    settings: {
      embeddingModel: 'sentence-transformers/all-mpnet-base-v2',
      topK: 10,
      chunkSize: 1000,
      cacheEnabled: true,
      batchSize: 10
    }
  },
  {
    id: 'accurate',
    name: 'Präzise',
    icon: 'fas fa-bullseye',
    description: 'Maximale Genauigkeit und Relevanz',
    settings: {
      embeddingModel: 'sentence-transformers/all-roberta-large-v1',
      rerankerModel: 'cross-encoder/ms-marco-MiniLM-L-12-v2',
      topK: 20,
      chunkSize: 1500,
      contextEnrichment: true
    }
  }
];

// Computed
const hasChanges = computed(() => {
  return JSON.stringify(settings.value) !== JSON.stringify(originalSettings.value);
});

// Methods
const loadSettings = async () => {
  try {
    const response = await apiService.get('/rag-settings/settings');
    if (response.success && response.data) {
      settings.value = { ...settings.value, ...response.data };
      originalSettings.value = JSON.parse(JSON.stringify(settings.value));
    }
  } catch (error) {
    console.error('Error loading RAG settings:', error);
    toast.error(t('admin.ragSettings.loadError', 'Fehler beim Laden der Einstellungen'));
  }
};

const loadPresets = async () => {
  try {
    const response = await apiService.get('/rag-settings/presets');
    if (response.success && response.data) {
      presets.value = response.data;
    } else {
      presets.value = getDefaultPresets();
    }
  } catch (error) {
    console.error('Error loading presets:', error);
    presets.value = getDefaultPresets();
  }
};

const loadAvailableModels = async () => {
  try {
    const response = await apiService.get('/rag-settings/available-models');
    if (response.success && response.data) {
      availableModels.value = response.data;
    }
  } catch (error) {
    console.error('Error loading available models:', error);
  }
};

const loadPerformanceMetrics = async () => {
  try {
    const response = await apiService.get('/rag-settings/performance');
    if (response.success && response.data) {
      performanceMetrics.value = response.data;
    }
  } catch (error) {
    console.error('Error loading performance metrics:', error);
  }
};

const saveSettings = async () => {
  isSaving.value = true;
  try {
    const response = await apiService.post('/rag-settings/settings', settings.value);
    if (response.success) {
      originalSettings.value = JSON.parse(JSON.stringify(settings.value));
      toast.success(t('admin.ragSettings.saveSuccess', 'Einstellungen gespeichert'));
    } else {
      throw new Error(response.error || 'Fehler beim Speichern');
    }
  } catch (error) {
    console.error('Error saving settings:', error);
    toast.error(t('admin.ragSettings.saveError', 'Fehler beim Speichern'));
  } finally {
    isSaving.value = false;
  }
};

const applyPreset = async (preset: any) => {
  if (confirm(t('admin.ragSettings.confirmPreset', 'Möchten Sie diese Voreinstellung anwenden?'))) {
    try {
      const response = await apiService.post(`/rag-settings/apply-preset/${preset.id}`);
      if (response.success) {
        // Reload settings to get the applied preset values
        await loadSettings();
        toast.success(t('admin.ragSettings.presetApplied', 'Voreinstellung angewendet'));
      }
    } catch (error) {
      console.error('Error applying preset:', error);
      toast.error(t('admin.ragSettings.presetError', 'Fehler beim Anwenden der Voreinstellung'));
    }
  }
};

const testSettings = async () => {
  try {
    const testQuery = prompt(t('admin.ragSettings.enterTestQuery', 'Geben Sie eine Test-Abfrage ein:'), 'Was ist nscale?');
    if (!testQuery) return;
    
    const response = await apiService.post('/rag-settings/test-settings', {
      ...settings.value,
      test_query: testQuery
    });
    
    if (response.success && response.data) {
      // Show test results in a nice format
      const results = response.data;
      alert(`Test erfolgreich!\n\nVerarbeitungszeit: ${results.processing_time_ms}ms\nChunks abgerufen: ${results.chunks_retrieved}\nDurchschnittliche Ähnlichkeit: ${results.avg_similarity_score}`);
    }
  } catch (error) {
    console.error('Error testing settings:', error);
    toast.error(t('admin.ragSettings.testError', 'Fehler beim Testen der Einstellungen'));
  }
};

const resetToDefaults = async () => {
  if (confirm(t('admin.ragSettings.confirmReset', 'Möchten Sie alle Einstellungen auf die Standardwerte zurücksetzen?'))) {
    try {
      const response = await apiService.post('/rag-settings/reset-to-defaults');
      if (response.success) {
        await loadSettings();
        toast.success(t('admin.ragSettings.resetSuccess', 'Einstellungen zurückgesetzt'));
      }
    } catch (error) {
      console.error('Error resetting to defaults:', error);
      toast.error(t('admin.ragSettings.resetError', 'Fehler beim Zurücksetzen'));
    }
  }
};

const addMetadataField = () => {
  settings.value.metadataFields.push({ name: '', type: 'string' });
};

const removeMetadataField = (index: number) => {
  settings.value.metadataFields.splice(index, 1);
};

// Lifecycle
onMounted(async () => {
  // Load all data in parallel
  await Promise.all([
    loadSettings(),
    loadPresets(),
    loadAvailableModels(),
    loadPerformanceMetrics()
  ]);
});
</script>

<style scoped>
.rag-settings {
  max-width: 1200px;
  margin: 0 auto;
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.header-actions {
  display: flex;
  gap: 1rem;
}

.settings-title {
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--admin-text-primary);
}

/* Performance Metrics */
.performance-metrics {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.metric-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 6px;
}

.metric-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  background: var(--admin-primary-light);
  border-radius: 50%;
  color: var(--admin-primary);
}

.metric-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.metric-label {
  font-size: 0.75rem;
  color: var(--admin-text-secondary);
}

.metric-value {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--admin-text-primary);
}

/* Sections */
.settings-section {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  color: var(--admin-text-primary);
}

.section-title i {
  color: var(--admin-primary);
}

/* Settings Grid */
.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}

.setting-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.setting-group label {
  font-weight: 600;
  color: var(--admin-text-primary);
}

.setting-hint {
  font-size: 0.875rem;
  color: var(--admin-text-secondary);
  margin: 0;
}

/* Form Controls */
.form-control {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--admin-border);
  border-radius: 4px;
  font-size: 0.875rem;
  background: white;
  width: 100%;
}

.form-control:focus {
  outline: none;
  border-color: var(--admin-primary);
  box-shadow: 0 0 0 3px rgba(0, 165, 80, 0.1);
}

textarea.form-control {
  resize: vertical;
  font-family: monospace;
}

/* Toggle Switch */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 24px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: 0.4s;
  border-radius: 24px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.4s;
  border-radius: 50%;
}

input:checked + .toggle-slider {
  background-color: var(--admin-primary);
}

input:checked + .toggle-slider:before {
  transform: translateX(24px);
}

/* Slider */
.slider-container {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.slider {
  flex: 1;
  -webkit-appearance: none;
  height: 6px;
  border-radius: 3px;
  background: #e6e6e6;
  outline: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--admin-primary);
  cursor: pointer;
}

.slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--admin-primary);
  cursor: pointer;
}

.slider-value {
  font-weight: 600;
  min-width: 50px;
  text-align: right;
}

/* Metadata Fields */
.metadata-fields {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.metadata-field {
  display: flex;
  gap: 0.5rem;
}

.metadata-field input {
  flex: 1;
}

.metadata-field select {
  width: 120px;
}

/* Presets Grid */
.presets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.preset-card {
  padding: 1.5rem;
  background: #f8f9fa;
  border: 2px solid transparent;
  border-radius: 8px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.preset-card:hover {
  border-color: var(--admin-primary);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.preset-card i {
  font-size: 2.5rem;
  color: var(--admin-primary);
  margin-bottom: 0.75rem;
}

.preset-card h4 {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  color: var(--admin-text-primary);
}

.preset-card p {
  font-size: 0.875rem;
  color: var(--admin-text-secondary);
  margin: 0;
}

/* Buttons */
.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-primary {
  background: var(--admin-primary);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--admin-primary-dark);
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
}

.btn-sm {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
}

.btn-icon {
  padding: 0.25rem 0.5rem;
  background: transparent;
  border: 1px solid var(--admin-border);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: var(--admin-bg-hover);
}

.btn-icon.danger:hover {
  background: #ffe6e6;
  border-color: #dc3545;
  color: #dc3545;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Responsive */
@media (max-width: 768px) {
  .settings-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .settings-grid {
    grid-template-columns: 1fr;
  }
  
  .presets-grid {
    grid-template-columns: 1fr;
  }
}
</style>