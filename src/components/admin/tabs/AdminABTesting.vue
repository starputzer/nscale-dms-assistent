<template>
  <div class="admin-ab-testing">
    <h2 class="ab-testing__title">
      {{ t('admin.abTesting.title', 'A/B Testing Framework') }}
    </h2>

    <!-- Stats Overview -->
    <div class="ab-testing__stats">
      <div class="stat-card">
        <div class="stat-card__icon">
          <i class="fas fa-flask"></i>
        </div>
        <div class="stat-card__content">
          <div class="stat-card__value">{{ stats.running }}</div>
          <div class="stat-card__label">
            {{ t('admin.abTesting.stats.running', 'Laufende Tests') }}
          </div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-card__icon">
          <i class="fas fa-check-circle"></i>
        </div>
        <div class="stat-card__content">
          <div class="stat-card__value">{{ stats.completed }}</div>
          <div class="stat-card__label">
            {{ t('admin.abTesting.stats.completed', 'Abgeschlossene Tests') }}
          </div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-card__icon">
          <i class="fas fa-trophy"></i>
        </div>
        <div class="stat-card__content">
          <div class="stat-card__value">{{ stats.withWinner }}</div>
          <div class="stat-card__label">
            {{ t('admin.abTesting.stats.withWinner', 'Mit Gewinner') }}
          </div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-card__icon">
          <i class="fas fa-users"></i>
        </div>
        <div class="stat-card__content">
          <div class="stat-card__value">{{ formatNumber(stats.totalParticipants) }}</div>
          <div class="stat-card__label">
            {{ t('admin.abTesting.stats.participants', 'Teilnehmer gesamt') }}
          </div>
        </div>
      </div>
    </div>

    <!-- Action Bar -->
    <div class="ab-testing__actions">
      <button class="action-button primary" @click="showCreateDialog = true">
        <i class="fas fa-plus"></i>
        {{ t('admin.abTesting.createExperiment', 'Neues Experiment') }}
      </button>

      <div class="filter-controls">
        <select v-model="filterStatus" @change="fetchExperiments" class="status-filter">
          <option value="">{{ t('admin.abTesting.allStatuses', 'Alle Status') }}</option>
          <option value="running">{{ t('admin.abTesting.status.running', 'Laufend') }}</option>
          <option value="completed">{{ t('admin.abTesting.status.completed', 'Abgeschlossen') }}</option>
          <option value="draft">{{ t('admin.abTesting.status.draft', 'Entwurf') }}</option>
          <option value="paused">{{ t('admin.abTesting.status.paused', 'Pausiert') }}</option>
        </select>
      </div>
    </div>

    <!-- Experiments List -->
    <div v-if="!loading" class="ab-testing__experiments">
      <!-- Running Experiments -->
      <div v-if="groupedExperiments.running.length > 0" class="experiment-section">
        <h3 class="section-title">
          <i class="fas fa-play-circle"></i>
          {{ t('admin.abTesting.runningExperiments', 'Laufende Experimente') }}
        </h3>
        <div class="experiments-grid">
          <div
            v-for="exp in groupedExperiments.running"
            :key="exp.id"
            class="experiment-card running"
            @click="selectExperiment(exp.id)"
          >
            <div class="experiment-header">
              <h4>{{ exp.name }}</h4>
              <div class="experiment-status">
                <i class="fas fa-circle"></i>
                {{ t('admin.abTesting.status.running', 'Laufend') }}
              </div>
            </div>
            <div class="experiment-meta">
              <span>
                <i class="fas fa-calendar"></i>
                {{ t('admin.abTesting.startedOn', 'Gestartet') }}: {{ formatDate(exp.started_at) }}
              </span>
              <span>
                <i class="fas fa-code-branch"></i>
                {{ exp.variants_count }} {{ t('admin.abTesting.variants', 'Varianten') }}
              </span>
            </div>
            <div class="experiment-progress">
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: getProgress(exp) + '%' }"></div>
              </div>
              <span class="progress-text">{{ getProgress(exp) }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Completed Experiments -->
      <div v-if="groupedExperiments.completed.length > 0" class="experiment-section">
        <h3 class="section-title">
          <i class="fas fa-check-circle"></i>
          {{ t('admin.abTesting.completedExperiments', 'Abgeschlossene Experimente') }}
        </h3>
        <div class="experiments-grid">
          <div
            v-for="exp in groupedExperiments.completed"
            :key="exp.id"
            class="experiment-card completed"
            @click="selectExperiment(exp.id)"
          >
            <div class="experiment-header">
              <h4>{{ exp.name }}</h4>
              <div v-if="exp.has_winner" class="winner-badge">
                <i class="fas fa-trophy"></i>
                {{ exp.winning_variant }}
              </div>
            </div>
            <div class="experiment-meta">
              <span>
                <i class="fas fa-calendar-check"></i>
                {{ t('admin.abTesting.endedOn', 'Beendet') }}: {{ formatDate(exp.ended_at) }}
              </span>
              <span v-if="exp.has_winner" class="uplift">
                <i class="fas fa-arrow-up"></i>
                +{{ (exp.winning_uplift * 100).toFixed(1) }}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Draft Experiments -->
      <div v-if="groupedExperiments.draft.length > 0" class="experiment-section">
        <h3 class="section-title">
          <i class="fas fa-pencil-alt"></i>
          {{ t('admin.abTesting.draftExperiments', 'Entwürfe') }}
        </h3>
        <div class="experiments-grid">
          <div
            v-for="exp in groupedExperiments.draft"
            :key="exp.id"
            class="experiment-card draft"
            @click="selectExperiment(exp.id)"
          >
            <div class="experiment-header">
              <h4>{{ exp.name }}</h4>
              <button
                class="start-button"
                @click.stop="startExperiment(exp.id)"
              >
                <i class="fas fa-play"></i>
                {{ t('admin.abTesting.start', 'Starten') }}
              </button>
            </div>
            <div class="experiment-meta">
              <span>
                <i class="fas fa-calendar-plus"></i>
                {{ t('admin.abTesting.createdOn', 'Erstellt') }}: {{ formatDate(exp.created_at) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="loading-container">
      <div class="loading-spinner"></div>
      <p>{{ t('admin.abTesting.loading', 'Lade Experimente...') }}</p>
    </div>

    <!-- Experiment Details Dialog -->
    <Teleport to="body">
      <div v-if="selectedExperiment" class="dialog-overlay" @click="closeExperimentDetails">
        <div class="dialog-content experiment-details" @click.stop>
          <div class="dialog-header">
            <h3>{{ selectedExperiment.experiment.name }}</h3>
            <button class="close-button" @click="closeExperimentDetails">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <div class="dialog-body">
            <!-- Experiment Info -->
            <div class="experiment-info">
              <p class="hypothesis">
                <strong>{{ t('admin.abTesting.hypothesis', 'Hypothese') }}:</strong>
                {{ selectedExperiment.experiment.hypothesis }}
              </p>
              <div class="info-grid">
                <div class="info-item">
                  <label>{{ t('admin.abTesting.status', 'Status') }}:</label>
                  <span class="status-badge" :class="selectedExperiment.experiment.status">
                    {{ t(`admin.abTesting.status.${selectedExperiment.experiment.status}`) }}
                  </span>
                </div>
                <div class="info-item">
                  <label>{{ t('admin.abTesting.progress', 'Fortschritt') }}:</label>
                  <span>{{ selectedExperiment.progress }}%</span>
                </div>
                <div class="info-item">
                  <label>{{ t('admin.abTesting.participants', 'Teilnehmer') }}:</label>
                  <span>{{ selectedExperiment.total_participants }}</span>
                </div>
                <div class="info-item">
                  <label>{{ t('admin.abTesting.duration', 'Laufzeit') }}:</label>
                  <span>{{ selectedExperiment.days_running }} {{ t('admin.abTesting.days', 'Tage') }}</span>
                </div>
              </div>
            </div>

            <!-- Results -->
            <div v-if="experimentResults" class="experiment-results">
              <h4>{{ t('admin.abTesting.results', 'Ergebnisse') }}</h4>
              
              <div
                v-for="(metricData, metricId) in experimentResults.results"
                :key="metricId"
                class="metric-results"
                :class="{ primary: metricData.is_primary }"
              >
                <h5>
                  {{ metricData.metric_name }}
                  <span v-if="metricData.is_primary" class="primary-badge">
                    {{ t('admin.abTesting.primaryMetric', 'Primär') }}
                  </span>
                </h5>

                <div class="variants-comparison">
                  <div
                    v-for="result in metricData.results"
                    :key="result.variant_id"
                    class="variant-result"
                    :class="{ 
                      control: result.is_control,
                      winner: !result.is_control && result.is_significant && result.uplift > 0
                    }"
                  >
                    <div class="variant-header">
                      <h6>{{ result.variant_name }}</h6>
                      <span v-if="result.is_control" class="control-badge">
                        {{ t('admin.abTesting.control', 'Kontrollgruppe') }}
                      </span>
                      <span v-else-if="result.is_significant" class="significance-badge" :class="{ positive: result.uplift > 0 }">
                        <i :class="result.uplift > 0 ? 'fas fa-arrow-up' : 'fas fa-arrow-down'"></i>
                        {{ (result.uplift * 100).toFixed(1) }}%
                      </span>
                    </div>

                    <div class="variant-metrics">
                      <div class="metric-value">
                        <span v-if="metricData.metric_type === 'conversion'">
                          {{ (result.conversion_rate * 100).toFixed(2) }}%
                          <small>({{ result.conversions }}/{{ result.sample_size }})</small>
                        </span>
                        <span v-else-if="metricData.metric_type === 'duration'">
                          {{ formatDuration(result.mean_value) }}
                        </span>
                        <span v-else>
                          {{ result.mean_value.toFixed(2) }}
                        </span>
                      </div>

                      <div class="confidence-interval">
                        CI: [{{ formatMetricValue(metricData.metric_type, result.confidence_interval.lower) }}, 
                        {{ formatMetricValue(metricData.metric_type, result.confidence_interval.upper) }}]
                      </div>

                      <div v-if="!result.is_control" class="p-value">
                        p-value: {{ result.p_value.toFixed(4) }}
                        <span v-if="result.is_significant" class="significant">
                          <i class="fas fa-check"></i>
                          {{ t('admin.abTesting.significant', 'Signifikant') }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="experiment-actions">
              <button
                v-if="selectedExperiment.experiment.status === 'running'"
                class="action-button pause"
                @click="pauseExperiment(selectedExperiment.experiment.id)"
              >
                <i class="fas fa-pause"></i>
                {{ t('admin.abTesting.pause', 'Pausieren') }}
              </button>

              <button
                v-if="selectedExperiment.experiment.status === 'running'"
                class="action-button stop"
                @click="stopExperiment(selectedExperiment.experiment.id)"
              >
                <i class="fas fa-stop"></i>
                {{ t('admin.abTesting.stop', 'Beenden') }}
              </button>

              <button
                v-if="selectedExperiment.experiment.status === 'paused'"
                class="action-button resume"
                @click="resumeExperiment(selectedExperiment.experiment.id)"
              >
                <i class="fas fa-play"></i>
                {{ t('admin.abTesting.resume', 'Fortsetzen') }}
              </button>

              <button
                v-if="selectedExperiment.experiment.status === 'running' && import.meta.env.DEV"
                class="action-button simulate"
                @click="simulateTraffic(selectedExperiment.experiment.id)"
              >
                <i class="fas fa-robot"></i>
                {{ t('admin.abTesting.simulate', 'Traffic simulieren') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Create Experiment Dialog -->
    <Teleport to="body">
      <div v-if="showCreateDialog" class="dialog-overlay" @click="showCreateDialog = false">
        <div class="dialog-content create-experiment" @click.stop>
          <div class="dialog-header">
            <h3>{{ t('admin.abTesting.createExperiment', 'Neues Experiment erstellen') }}</h3>
            <button class="close-button" @click="showCreateDialog = false">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <div class="dialog-body">
            <form @submit.prevent="createExperiment">
              <!-- Basic Info -->
              <div class="form-section">
                <h4>{{ t('admin.abTesting.basicInfo', 'Grundinformationen') }}</h4>
                
                <div class="form-group">
                  <label>{{ t('admin.abTesting.experimentName', 'Name') }}:</label>
                  <input
                    v-model="newExperiment.name"
                    type="text"
                    required
                    :placeholder="t('admin.abTesting.namePlaceholder', 'z.B. Chat UI Optimierung')"
                  />
                </div>

                <div class="form-group">
                  <label>{{ t('admin.abTesting.description', 'Beschreibung') }}:</label>
                  <textarea
                    v-model="newExperiment.description"
                    rows="2"
                    required
                    :placeholder="t('admin.abTesting.descriptionPlaceholder', 'Was wird getestet?')"
                  ></textarea>
                </div>

                <div class="form-group">
                  <label>{{ t('admin.abTesting.hypothesis', 'Hypothese') }}:</label>
                  <textarea
                    v-model="newExperiment.hypothesis"
                    rows="2"
                    required
                    :placeholder="t('admin.abTesting.hypothesisPlaceholder', 'Was erwarten Sie?')"
                  ></textarea>
                </div>
              </div>

              <!-- Variants -->
              <div class="form-section">
                <h4>{{ t('admin.abTesting.variants', 'Varianten') }}</h4>
                
                <div
                  v-for="(variant, index) in newExperiment.variants"
                  :key="index"
                  class="variant-form"
                >
                  <div class="variant-header">
                    <input
                      v-model="variant.name"
                      type="text"
                      required
                      :placeholder="t('admin.abTesting.variantName', 'Varianten-Name')"
                    />
                    <label class="control-checkbox">
                      <input
                        type="checkbox"
                        v-model="variant.is_control"
                        @change="ensureOneControl(index)"
                      />
                      {{ t('admin.abTesting.controlGroup', 'Kontrollgruppe') }}
                    </label>
                    <button
                      v-if="newExperiment.variants.length > 2"
                      type="button"
                      class="remove-button"
                      @click="removeVariant(index)"
                    >
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                  <textarea
                    v-model="variant.description"
                    rows="2"
                    :placeholder="t('admin.abTesting.variantDescription', 'Beschreibung der Variante')"
                  ></textarea>
                </div>

                <button type="button" class="add-button" @click="addVariant">
                  <i class="fas fa-plus"></i>
                  {{ t('admin.abTesting.addVariant', 'Variante hinzufügen') }}
                </button>
              </div>

              <!-- Metrics -->
              <div class="form-section">
                <h4>{{ t('admin.abTesting.metrics', 'Metriken') }}</h4>
                
                <div
                  v-for="(metric, index) in newExperiment.metrics"
                  :key="index"
                  class="metric-form"
                >
                  <div class="metric-header">
                    <input
                      v-model="metric.name"
                      type="text"
                      required
                      :placeholder="t('admin.abTesting.metricName', 'Metrik-Name')"
                    />
                    <select v-model="metric.type" required>
                      <option value="">{{ t('admin.abTesting.selectType', 'Typ wählen') }}</option>
                      <option value="conversion">{{ t('admin.abTesting.conversion', 'Konversion') }}</option>
                      <option value="numeric">{{ t('admin.abTesting.numeric', 'Numerisch') }}</option>
                      <option value="duration">{{ t('admin.abTesting.duration', 'Dauer') }}</option>
                    </select>
                    <label class="primary-checkbox">
                      <input
                        type="checkbox"
                        v-model="metric.primary"
                        @change="ensureOnePrimary(index)"
                      />
                      {{ t('admin.abTesting.primaryMetric', 'Primär') }}
                    </label>
                    <button
                      v-if="newExperiment.metrics.length > 1"
                      type="button"
                      class="remove-button"
                      @click="removeMetric(index)"
                    >
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                </div>

                <button type="button" class="add-button" @click="addMetric">
                  <i class="fas fa-plus"></i>
                  {{ t('admin.abTesting.addMetric', 'Metrik hinzufügen') }}
                </button>
              </div>

              <!-- Settings -->
              <div class="form-section">
                <h4>{{ t('admin.abTesting.settings', 'Einstellungen') }}</h4>
                
                <div class="settings-grid">
                  <div class="form-group">
                    <label>{{ t('admin.abTesting.minSampleSize', 'Min. Stichprobengröße') }}:</label>
                    <input
                      v-model.number="newExperiment.min_sample_size"
                      type="number"
                      min="100"
                      required
                    />
                  </div>

                  <div class="form-group">
                    <label>{{ t('admin.abTesting.maxDuration', 'Max. Laufzeit (Tage)') }}:</label>
                    <input
                      v-model.number="newExperiment.max_duration_days"
                      type="number"
                      min="1"
                      required
                    />
                  </div>

                  <div class="form-group">
                    <label>{{ t('admin.abTesting.trafficPercentage', 'Traffic-Anteil (%)') }}:</label>
                    <input
                      v-model.number="newExperiment.traffic_percentage"
                      type="number"
                      min="1"
                      max="100"
                      required
                    />
                  </div>

                  <div class="form-group">
                    <label>{{ t('admin.abTesting.allocationStrategy', 'Zuteilungsstrategie') }}:</label>
                    <select v-model="newExperiment.allocation_strategy">
                      <option value="random">{{ t('admin.abTesting.random', 'Zufällig') }}</option>
                      <option value="weighted">{{ t('admin.abTesting.weighted', 'Gewichtet') }}</option>
                      <option value="adaptive">{{ t('admin.abTesting.adaptive', 'Adaptiv (MAB)') }}</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- Actions -->
              <div class="dialog-actions">
                <button type="button" class="cancel-button" @click="showCreateDialog = false">
                  {{ t('admin.abTesting.cancel', 'Abbrechen') }}
                </button>
                <button type="submit" class="submit-button" :disabled="creating">
                  <i v-if="creating" class="fas fa-spinner fa-spin"></i>
                  {{ t('admin.abTesting.create', 'Erstellen') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from '@/composables/useToast';
import { AdminService } from '@/services/api/AdminService';

const { t } = useI18n();
const toast = useToast();
const adminService = new AdminService();

// State
const loading = ref(false);
const experiments = ref<any[]>([]);
const filterStatus = ref('');
const selectedExperiment = ref<any>(null);
const experimentResults = ref<any>(null);
const showCreateDialog = ref(false);
const creating = ref(false);

// New experiment form
const newExperiment = reactive({
  name: '',
  description: '',
  hypothesis: '',
  variants: [
    { id: 'control', name: 'Control', description: '', config: {}, is_control: true },
    { id: 'variant-1', name: 'Variant A', description: '', config: {}, is_control: false }
  ],
  metrics: [
    { id: 'metric-1', name: '', type: '', goal: 'increase', primary: true }
  ],
  allocation_strategy: 'random',
  traffic_percentage: 100,
  min_sample_size: 1000,
  max_duration_days: 14
});

// Computed
const groupedExperiments = computed(() => {
  const grouped = {
    running: [],
    completed: [],
    draft: [],
    paused: [],
    archived: []
  };
  
  experiments.value.forEach(exp => {
    if (grouped[exp.status]) {
      grouped[exp.status].push(exp);
    }
  });
  
  return grouped;
});

const stats = computed(() => {
  return {
    running: groupedExperiments.value.running.length,
    completed: groupedExperiments.value.completed.length,
    withWinner: experiments.value.filter(e => e.has_winner).length,
    totalParticipants: experiments.value.reduce((sum, e) => {
      // Estimate based on variants count
      return sum + (e.variants_count || 2) * 500;
    }, 0)
  };
});

// Methods
async function fetchExperiments() {
  loading.value = true;
  try {
    const response = await adminService.request('/api/admin/ab-testing/experiments', {
      params: filterStatus.value ? { status: filterStatus.value } : {}
    });
    
    if (response.data.success) {
      experiments.value = response.data.experiments;
    }
  } catch (error) {
    console.error('Failed to fetch experiments:', error);
    toast.error(t('admin.abTesting.errors.fetchFailed', 'Fehler beim Laden der Experimente'));
  } finally {
    loading.value = false;
  }
}

async function selectExperiment(experimentId: string) {
  try {
    const response = await adminService.request(`/api/admin/ab-testing/experiments/${experimentId}`);
    
    if (response.data.success) {
      selectedExperiment.value = response.data;
      
      // Fetch results if experiment has started
      if (response.data.experiment.status !== 'draft') {
        await fetchExperimentResults(experimentId);
      }
    }
  } catch (error) {
    console.error('Failed to fetch experiment details:', error);
    toast.error(t('admin.abTesting.errors.detailsFailed', 'Fehler beim Laden der Details'));
  }
}

async function fetchExperimentResults(experimentId: string) {
  try {
    const response = await adminService.request(`/api/admin/ab-testing/experiments/${experimentId}/results`);
    
    if (response.data.success) {
      experimentResults.value = response.data;
    }
  } catch (error) {
    console.error('Failed to fetch experiment results:', error);
  }
}

function closeExperimentDetails() {
  selectedExperiment.value = null;
  experimentResults.value = null;
}

async function createExperiment() {
  creating.value = true;
  try {
    // Prepare data
    const experimentData = {
      ...newExperiment,
      variants: newExperiment.variants.map((v, i) => ({
        id: v.id || `variant-${i}`,
        name: v.name,
        description: v.description,
        config: v.config || {},
        is_control: v.is_control
      })),
      metrics: newExperiment.metrics.map((m, i) => ({
        id: m.id || `metric-${i}`,
        name: m.name,
        type: m.type,
        goal: m.goal || 'increase',
        primary: m.primary
      }))
    };
    
    const response = await adminService.request('/api/admin/ab-testing/experiments', {
      method: 'POST',
      data: experimentData
    });
    
    if (response.data.success) {
      toast.success(t('admin.abTesting.createSuccess', 'Experiment erfolgreich erstellt'));
      showCreateDialog.value = false;
      resetNewExperiment();
      await fetchExperiments();
    }
  } catch (error) {
    console.error('Failed to create experiment:', error);
    toast.error(t('admin.abTesting.errors.createFailed', 'Fehler beim Erstellen des Experiments'));
  } finally {
    creating.value = false;
  }
}

async function startExperiment(experimentId: string) {
  try {
    const response = await adminService.request(`/api/admin/ab-testing/experiments/${experimentId}/start`, {
      method: 'PUT'
    });
    
    if (response.data.success) {
      toast.success(t('admin.abTesting.startSuccess', 'Experiment gestartet'));
      await fetchExperiments();
    }
  } catch (error) {
    console.error('Failed to start experiment:', error);
    toast.error(t('admin.abTesting.errors.startFailed', 'Fehler beim Starten'));
  }
}

async function pauseExperiment(experimentId: string) {
  try {
    const response = await adminService.request(`/api/admin/ab-testing/experiments/${experimentId}/pause`, {
      method: 'PUT'
    });
    
    if (response.data.success) {
      toast.success(t('admin.abTesting.pauseSuccess', 'Experiment pausiert'));
      await fetchExperiments();
      closeExperimentDetails();
    }
  } catch (error) {
    console.error('Failed to pause experiment:', error);
    toast.error(t('admin.abTesting.errors.pauseFailed', 'Fehler beim Pausieren'));
  }
}

async function resumeExperiment(experimentId: string) {
  try {
    const response = await adminService.request(`/api/admin/ab-testing/experiments/${experimentId}/resume`, {
      method: 'PUT'
    });
    
    if (response.data.success) {
      toast.success(t('admin.abTesting.resumeSuccess', 'Experiment fortgesetzt'));
      await fetchExperiments();
      await selectExperiment(experimentId);
    }
  } catch (error) {
    console.error('Failed to resume experiment:', error);
    toast.error(t('admin.abTesting.errors.resumeFailed', 'Fehler beim Fortsetzen'));
  }
}

async function stopExperiment(experimentId: string) {
  if (!confirm(t('admin.abTesting.confirmStop', 'Experiment wirklich beenden?'))) {
    return;
  }
  
  try {
    const response = await adminService.request(`/api/admin/ab-testing/experiments/${experimentId}/stop`, {
      method: 'PUT'
    });
    
    if (response.data.success) {
      toast.success(t('admin.abTesting.stopSuccess', 'Experiment beendet'));
      await fetchExperiments();
      closeExperimentDetails();
    }
  } catch (error) {
    console.error('Failed to stop experiment:', error);
    toast.error(t('admin.abTesting.errors.stopFailed', 'Fehler beim Beenden'));
  }
}

async function simulateTraffic(experimentId: string) {
  try {
    const response = await adminService.request(`/api/admin/ab-testing/experiments/${experimentId}/simulate`, {
      method: 'POST',
      params: { participants: 100 }
    });
    
    if (response.data.success) {
      toast.success(t('admin.abTesting.simulateSuccess', 'Traffic simuliert'));
      await selectExperiment(experimentId);
    }
  } catch (error) {
    console.error('Failed to simulate traffic:', error);
    toast.error(t('admin.abTesting.errors.simulateFailed', 'Fehler bei der Simulation'));
  }
}

// Form helpers
function addVariant() {
  newExperiment.variants.push({
    id: `variant-${newExperiment.variants.length}`,
    name: '',
    description: '',
    config: {},
    is_control: false
  });
}

function removeVariant(index: number) {
  newExperiment.variants.splice(index, 1);
}

function ensureOneControl(index: number) {
  if (newExperiment.variants[index].is_control) {
    // Uncheck all others
    newExperiment.variants.forEach((v, i) => {
      if (i !== index) v.is_control = false;
    });
  }
}

function addMetric() {
  newExperiment.metrics.push({
    id: `metric-${newExperiment.metrics.length}`,
    name: '',
    type: '',
    goal: 'increase',
    primary: false
  });
}

function removeMetric(index: number) {
  newExperiment.metrics.splice(index, 1);
}

function ensureOnePrimary(index: number) {
  if (newExperiment.metrics[index].primary) {
    // Uncheck all others
    newExperiment.metrics.forEach((m, i) => {
      if (i !== index) m.primary = false;
    });
  }
}

function resetNewExperiment() {
  Object.assign(newExperiment, {
    name: '',
    description: '',
    hypothesis: '',
    variants: [
      { id: 'control', name: 'Control', description: '', config: {}, is_control: true },
      { id: 'variant-1', name: 'Variant A', description: '', config: {}, is_control: false }
    ],
    metrics: [
      { id: 'metric-1', name: '', type: '', goal: 'increase', primary: true }
    ],
    allocation_strategy: 'random',
    traffic_percentage: 100,
    min_sample_size: 1000,
    max_duration_days: 14
  });
}

// Utility functions
function getProgress(experiment: any): number {
  // Estimate progress based on days running
  if (!experiment.started_at) return 0;
  
  const daysRunning = Math.floor(
    (new Date().getTime() - new Date(experiment.started_at).getTime()) / (1000 * 60 * 60 * 24)
  );
  
  // Assume 14-day experiments
  return Math.min(100, Math.round((daysRunning / 14) * 100));
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

function formatDate(dateString: string): string {
  if (!dateString) return '';
  
  return new Date(dateString).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function formatMetricValue(type: string, value: number): string {
  if (type === 'conversion') {
    return (value * 100).toFixed(2) + '%';
  } else if (type === 'duration') {
    return formatDuration(value);
  } else {
    return value.toFixed(2);
  }
}

// Initialize
onMounted(() => {
  fetchExperiments();
});
</script>

<style scoped>
.admin-ab-testing {
  padding: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
}

.ab-testing__title {
  font-size: 1.75rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  color: var(--n-color-text-primary);
}

/* Stats */
.ab-testing__stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  display: flex;
  align-items: center;
  padding: 1.25rem;
  background: var(--n-color-background-alt);
  border-radius: var(--n-border-radius);
  border-left: 4px solid var(--n-color-primary);
}

.stat-card__icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--n-color-primary-rgb), 0.1);
  color: var(--n-color-primary);
  border-radius: 50%;
  font-size: 1.25rem;
  margin-right: 1rem;
}

.stat-card__value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--n-color-text-primary);
}

.stat-card__label {
  font-size: 0.875rem;
  color: var(--n-color-text-secondary);
}

/* Actions */
.ab-testing__actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.action-button {
  padding: 0.75rem 1.25rem;
  border: none;
  border-radius: var(--n-border-radius);
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
}

.action-button.primary {
  background: var(--n-color-primary);
  color: var(--n-color-on-primary);
}

.action-button.primary:hover {
  background: var(--n-color-primary-dark);
}

.status-filter {
  padding: 0.5rem 1rem;
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
  background: var(--n-color-background);
  font-size: inherit;
  cursor: pointer;
}

/* Experiments */
.experiment-section {
  margin-bottom: 2rem;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: var(--n-color-text-primary);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.experiments-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1rem;
}

.experiment-card {
  background: var(--n-color-background-alt);
  border-radius: var(--n-border-radius);
  padding: 1.25rem;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.experiment-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.experiment-card.running {
  border-color: var(--n-color-info);
}

.experiment-card.completed {
  border-color: var(--n-color-success);
}

.experiment-card.draft {
  border-color: var(--n-color-border);
}

.experiment-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
}

.experiment-header h4 {
  margin: 0;
  font-size: 1.125rem;
  color: var(--n-color-text-primary);
}

.experiment-status {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  color: var(--n-color-info);
}

.experiment-status i {
  font-size: 0.5rem;
}

.winner-badge {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background: var(--n-color-warning);
  color: white;
  border-radius: var(--n-border-radius-sm);
  font-size: 0.75rem;
  font-weight: 500;
}

.experiment-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.875rem;
  color: var(--n-color-text-secondary);
  margin-bottom: 0.75rem;
}

.experiment-meta span {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.uplift {
  color: var(--n-color-success);
  font-weight: 500;
}

.experiment-progress {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: var(--n-color-border);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--n-color-primary);
  transition: width 0.3s;
}

.progress-text {
  font-size: 0.875rem;
  color: var(--n-color-text-secondary);
  min-width: 40px;
  text-align: right;
}

.start-button {
  padding: 0.375rem 0.75rem;
  background: var(--n-color-primary);
  color: var(--n-color-on-primary);
  border: none;
  border-radius: var(--n-border-radius);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  transition: background 0.2s;
}

.start-button:hover {
  background: var(--n-color-primary-dark);
}

/* Loading */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3rem;
  color: var(--n-color-text-secondary);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(var(--n-color-primary-rgb), 0.1);
  border-radius: 50%;
  border-top-color: var(--n-color-primary);
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Dialog */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 2rem;
}

.dialog-content {
  background: var(--n-color-background);
  border-radius: var(--n-border-radius);
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.dialog-content.create-experiment {
  max-width: 700px;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--n-color-border);
}

.dialog-header h3 {
  margin: 0;
  font-size: 1.5rem;
  color: var(--n-color-text-primary);
}

.close-button {
  width: 2rem;
  height: 2rem;
  border: none;
  background: none;
  color: var(--n-color-text-secondary);
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-button:hover {
  background: var(--n-color-hover);
  color: var(--n-color-text-primary);
}

.dialog-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

/* Experiment Details */
.experiment-info {
  margin-bottom: 2rem;
}

.hypothesis {
  margin-bottom: 1rem;
  color: var(--n-color-text-secondary);
  line-height: 1.5;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-item label {
  font-size: 0.875rem;
  color: var(--n-color-text-secondary);
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: var(--n-border-radius-sm);
  font-size: 0.875rem;
  font-weight: 500;
}

.status-badge.running {
  background: rgba(var(--n-color-info-rgb), 0.1);
  color: var(--n-color-info);
}

.status-badge.completed {
  background: rgba(var(--n-color-success-rgb), 0.1);
  color: var(--n-color-success);
}

.status-badge.paused {
  background: rgba(var(--n-color-warning-rgb), 0.1);
  color: var(--n-color-warning);
}

/* Results */
.experiment-results h4 {
  margin: 0 0 1rem;
  font-size: 1.25rem;
  color: var(--n-color-text-primary);
}

.metric-results {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: var(--n-color-background-alt);
  border-radius: var(--n-border-radius);
}

.metric-results.primary {
  border: 2px solid var(--n-color-primary);
}

.metric-results h5 {
  margin: 0 0 1rem;
  font-size: 1.125rem;
  color: var(--n-color-text-primary);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.primary-badge {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  background: var(--n-color-primary);
  color: var(--n-color-on-primary);
  border-radius: var(--n-border-radius-sm);
  font-size: 0.75rem;
  font-weight: 500;
}

.variants-comparison {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.variant-result {
  padding: 1rem;
  background: var(--n-color-background);
  border-radius: var(--n-border-radius);
  border: 1px solid var(--n-color-border);
}

.variant-result.control {
  border-color: var(--n-color-info);
}

.variant-result.winner {
  border-color: var(--n-color-success);
  background: rgba(var(--n-color-success-rgb), 0.05);
}

.variant-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.variant-header h6 {
  margin: 0;
  font-size: 1rem;
  color: var(--n-color-text-primary);
}

.control-badge,
.significance-badge {
  font-size: 0.75rem;
  font-weight: 500;
  padding: 0.125rem 0.5rem;
  border-radius: var(--n-border-radius-sm);
}

.control-badge {
  background: rgba(var(--n-color-info-rgb), 0.1);
  color: var(--n-color-info);
}

.significance-badge {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.significance-badge.positive {
  background: rgba(var(--n-color-success-rgb), 0.1);
  color: var(--n-color-success);
}

.significance-badge:not(.positive) {
  background: rgba(var(--n-color-error-rgb), 0.1);
  color: var(--n-color-error);
}

.variant-metrics {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.metric-value {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--n-color-text-primary);
}

.metric-value small {
  font-size: 0.75rem;
  font-weight: 400;
  color: var(--n-color-text-secondary);
}

.confidence-interval,
.p-value {
  font-size: 0.875rem;
  color: var(--n-color-text-secondary);
}

.significant {
  color: var(--n-color-success);
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  margin-left: 0.5rem;
}

.experiment-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--n-color-border);
}

.action-button.pause {
  background: var(--n-color-warning);
  color: white;
}

.action-button.stop {
  background: var(--n-color-error);
  color: white;
}

.action-button.resume {
  background: var(--n-color-success);
  color: white;
}

.action-button.simulate {
  background: var(--n-color-info);
  color: white;
}

/* Create Experiment Form */
.form-section {
  margin-bottom: 2rem;
}

.form-section h4 {
  margin: 0 0 1rem;
  font-size: 1.125rem;
  color: var(--n-color-text-primary);
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.25rem;
  font-weight: 500;
  color: var(--n-color-text-primary);
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
  background: var(--n-color-background);
  font-size: inherit;
  font-family: inherit;
}

.form-group textarea {
  resize: vertical;
}

.variant-form,
.metric-form {
  padding: 1rem;
  background: var(--n-color-background-alt);
  border-radius: var(--n-border-radius);
  margin-bottom: 0.75rem;
}

.variant-header,
.metric-header {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 0.75rem;
}

.variant-header input,
.metric-header input {
  flex: 1;
}

.metric-header select {
  width: 150px;
}

.control-checkbox,
.primary-checkbox {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  white-space: nowrap;
}

.control-checkbox input,
.primary-checkbox input {
  width: auto;
  margin: 0;
}

.remove-button {
  padding: 0.25rem 0.5rem;
  background: var(--n-color-error);
  color: white;
  border: none;
  border-radius: var(--n-border-radius-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
}

.add-button {
  padding: 0.5rem 1rem;
  background: none;
  border: 1px dashed var(--n-color-border);
  border-radius: var(--n-border-radius);
  color: var(--n-color-text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  justify-content: center;
  transition: all 0.2s;
}

.add-button:hover {
  border-color: var(--n-color-primary);
  color: var(--n-color-primary);
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.dialog-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid var(--n-color-border);
}

.cancel-button,
.submit-button {
  padding: 0.75rem 1.5rem;
  border-radius: var(--n-border-radius);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.cancel-button {
  background: var(--n-color-background-alt);
  color: var(--n-color-text-primary);
}

.cancel-button:hover {
  background: var(--n-color-hover);
}

.submit-button {
  background: var(--n-color-primary);
  color: var(--n-color-on-primary);
}

.submit-button:hover:not(:disabled) {
  background: var(--n-color-primary-dark);
}

.submit-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Responsive */
@media (max-width: 768px) {
  .ab-testing__stats {
    grid-template-columns: 1fr 1fr;
  }

  .experiments-grid {
    grid-template-columns: 1fr;
  }

  .settings-grid {
    grid-template-columns: 1fr;
  }

  .dialog-overlay {
    padding: 1rem;
  }

  .experiment-actions {
    flex-wrap: wrap;
  }
}
</style>