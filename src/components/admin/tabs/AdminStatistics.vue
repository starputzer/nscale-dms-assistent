<template>
  <div class="admin-statistics">
    <h2 class="admin-statistics__title">{{ t('admin.statistics.title', 'Statistiken') }}</h2>
    <p class="admin-statistics__description">
      {{ t('admin.statistics.description', 'Detaillierte Nutzungs- und Leistungsstatistiken des Systems.') }}
    </p>

    <!-- Time Range Selector -->
    <div class="admin-statistics__controls">
      <div class="admin-statistics__time-range">
        <span>{{ t('admin.statistics.timeRange', 'Zeitraum:') }}</span>
        <div class="admin-statistics__button-group">
          <button 
            v-for="range in timeRanges" 
            :key="range.value"
            :class="[
              'admin-statistics__range-button', 
              { 'admin-statistics__range-button--active': selectedTimeRange === range.value }
            ]"
            @click="selectedTimeRange = range.value"
          >
            {{ range.label }}
          </button>
        </div>
      </div>

      <div class="admin-statistics__view-selector">
        <span>{{ t('admin.statistics.view', 'Ansicht:') }}</span>
        <select v-model="selectedView" class="admin-statistics__view-select">
          <option value="overview">{{ t('admin.statistics.views.overview', 'Übersicht') }}</option>
          <option value="users">{{ t('admin.statistics.views.users', 'Benutzeraktivität') }}</option>
          <option value="sessions">{{ t('admin.statistics.views.sessions', 'Sitzungen') }}</option>
          <option value="feedback">{{ t('admin.statistics.views.feedback', 'Feedback') }}</option>
          <option value="performance">{{ t('admin.statistics.views.performance', 'Leistung') }}</option>
        </select>
      </div>
    </div>

    <!-- System Overview Cards -->
    <div v-if="selectedView === 'overview'" class="admin-statistics__overview">
      <div class="admin-statistics__cards">
        <div class="admin-statistics__card admin-statistics__card--users">
          <div class="admin-statistics__card-icon">
            <i class="fas fa-users" aria-hidden="true"></i>
          </div>
          <div class="admin-statistics__card-content">
            <h3 class="admin-statistics__card-title">{{ t('admin.statistics.cards.users', 'Benutzer') }}</h3>
            <div class="admin-statistics__card-value">{{ stats.total_users || 0 }}</div>
            <div class="admin-statistics__card-details">
              <div class="admin-statistics__card-detail">
                <span>{{ t('admin.statistics.details.activeToday', 'Heute aktiv:') }}</span>
                <strong>{{ stats.active_users_today || 0 }}</strong>
              </div>
            </div>
          </div>
        </div>

        <div class="admin-statistics__card admin-statistics__card--sessions">
          <div class="admin-statistics__card-icon">
            <i class="fas fa-comments" aria-hidden="true"></i>
          </div>
          <div class="admin-statistics__card-content">
            <h3 class="admin-statistics__card-title">{{ t('admin.statistics.cards.sessions', 'Sitzungen') }}</h3>
            <div class="admin-statistics__card-value">{{ stats.total_sessions || 0 }}</div>
            <div class="admin-statistics__card-details">
              <div class="admin-statistics__card-detail">
                <span>{{ t('admin.statistics.details.avgMessagesPerSession', 'Ø Nachr./Sitzung:') }}</span>
                <strong>{{ stats.avg_messages_per_session?.toFixed(1) || '0.0' }}</strong>
              </div>
            </div>
          </div>
        </div>

        <div class="admin-statistics__card admin-statistics__card--messages">
          <div class="admin-statistics__card-icon">
            <i class="fas fa-envelope" aria-hidden="true"></i>
          </div>
          <div class="admin-statistics__card-content">
            <h3 class="admin-statistics__card-title">{{ t('admin.statistics.cards.messages', 'Nachrichten') }}</h3>
            <div class="admin-statistics__card-value">{{ stats.total_messages || 0 }}</div>
            <div class="admin-statistics__card-details">
              <div class="admin-statistics__card-detail">
                <span>{{ t('admin.statistics.details.avgResponseTime', 'Ø Antwortzeit:') }}</span>
                <strong>{{ stats.avg_response_time_ms || 0 }} ms</strong>
              </div>
            </div>
          </div>
        </div>

        <div class="admin-statistics__card admin-statistics__card--feedback">
          <div class="admin-statistics__card-icon">
            <i class="fas fa-thumbs-up" aria-hidden="true"></i>
          </div>
          <div class="admin-statistics__card-content">
            <h3 class="admin-statistics__card-title">{{ t('admin.statistics.cards.feedback', 'Feedback') }}</h3>
            <div class="admin-statistics__card-value">{{ stats.total_feedback || 0 }}</div>
            <div class="admin-statistics__card-details">
              <div class="admin-statistics__card-detail">
                <span>{{ t('admin.statistics.details.positiveFeedback', 'Positiv:') }}</span>
                <strong>{{ stats.positive_feedback_percent || 0 }}%</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Overview Charts -->
      <div class="admin-statistics__charts">
        <div class="admin-statistics__chart-container">
          <h3 class="admin-statistics__chart-title">{{ t('admin.statistics.charts.usage', 'Nutzung im Zeitverlauf') }}</h3>
          <div class="admin-statistics__chart">
            <canvas ref="usageChart"></canvas>
          </div>
        </div>

        <div class="admin-statistics__chart-container">
          <h3 class="admin-statistics__chart-title">{{ t('admin.statistics.charts.performance', 'Systemleistung') }}</h3>
          <div class="admin-statistics__chart">
            <canvas ref="performanceChart"></canvas>
          </div>
        </div>
      </div>

      <!-- System Resource Usage -->
      <div class="admin-statistics__resources">
        <h3 class="admin-statistics__section-title">{{ t('admin.statistics.sections.resources', 'Ressourcennutzung') }}</h3>
        <div class="admin-statistics__resource-grid">
          <!-- CPU Usage -->
          <div class="admin-statistics__resource-card">
            <div class="admin-statistics__resource-header">
              <div class="admin-statistics__resource-title">
                <i class="fas fa-microchip" aria-hidden="true"></i>
                <span>{{ t('admin.system.metrics.cpu', 'CPU-Auslastung') }}</span>
              </div>
              <div 
                class="admin-statistics__resource-status" 
                :class="`admin-statistics__resource-status--${cpuStatus}`" 
                :title="getStatusText(cpuStatus)"
              ></div>
            </div>
            
            <div class="admin-statistics__meter-container">
              <div class="admin-statistics__meter">
                <div 
                  class="admin-statistics__meter-fill" 
                  :class="`admin-statistics__meter-fill--${cpuStatus}`"
                  :style="{ width: `${stats.cpu_usage_percent || 0}%` }"
                ></div>
              </div>
              <div class="admin-statistics__meter-value">{{ stats.cpu_usage_percent || 0 }}%</div>
            </div>
          </div>

          <!-- Memory Usage -->
          <div class="admin-statistics__resource-card">
            <div class="admin-statistics__resource-header">
              <div class="admin-statistics__resource-title">
                <i class="fas fa-memory" aria-hidden="true"></i>
                <span>{{ t('admin.system.metrics.memory', 'Speicherauslastung') }}</span>
              </div>
              <div 
                class="admin-statistics__resource-status" 
                :class="`admin-statistics__resource-status--${memoryStatus}`" 
                :title="getStatusText(memoryStatus)"
              ></div>
            </div>
            
            <div class="admin-statistics__meter-container">
              <div class="admin-statistics__meter">
                <div 
                  class="admin-statistics__meter-fill" 
                  :class="`admin-statistics__meter-fill--${memoryStatus}`"
                  :style="{ width: `${stats.memory_usage_percent || 0}%` }"
                ></div>
              </div>
              <div class="admin-statistics__meter-value">{{ stats.memory_usage_percent || 0 }}%</div>
            </div>
          </div>

          <!-- Cache -->
          <div class="admin-statistics__resource-card">
            <div class="admin-statistics__resource-header">
              <div class="admin-statistics__resource-title">
                <i class="fas fa-bolt" aria-hidden="true"></i>
                <span>{{ t('admin.system.metrics.cache', 'Cache') }}</span>
              </div>
            </div>
            
            <div class="admin-statistics__resource-values">
              <div class="admin-statistics__resource-value-item">
                <span>{{ t('admin.system.metrics.cacheSize', 'Größe:') }}</span>
                <strong>{{ stats.cache_size_mb || 0 }} MB</strong>
              </div>
              <div class="admin-statistics__resource-value-item">
                <span>{{ t('admin.system.metrics.cacheHitRate', 'Trefferrate:') }}</span>
                <strong>{{ stats.cache_hit_rate || 0 }}%</strong>
              </div>
            </div>
          </div>

          <!-- Database Size -->
          <div class="admin-statistics__resource-card">
            <div class="admin-statistics__resource-header">
              <div class="admin-statistics__resource-title">
                <i class="fas fa-database" aria-hidden="true"></i>
                <span>{{ t('admin.system.metrics.database', 'Datenbankgröße') }}</span>
              </div>
            </div>
            
            <div class="admin-statistics__resource-value-large">
              {{ stats.database_size_mb || 0 }} MB
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- User Activity View -->
    <div v-if="selectedView === 'users'" class="admin-statistics__users">
      <div class="admin-statistics__section">
        <h3 class="admin-statistics__section-title">{{ t('admin.statistics.sections.userActivity', 'Benutzeraktivität') }}</h3>
        
        <!-- User Activity Chart -->
        <div class="admin-statistics__chart-container">
          <div class="admin-statistics__chart">
            <canvas ref="userActivityChart"></canvas>
          </div>
        </div>

        <!-- User Segmentation -->
        <div class="admin-statistics__user-segmentation">
          <h4 class="admin-statistics__subsection-title">{{ t('admin.statistics.sections.userSegmentation', 'Benutzersegmentierung') }}</h4>
          
          <div class="admin-statistics__segmentation-chart">
            <div class="admin-statistics__segment-item" v-for="(segment, index) in userSegments" :key="index">
              <div class="admin-statistics__segment-label">{{ segment.label }}</div>
              <div class="admin-statistics__segment-bar-container">
                <div 
                  class="admin-statistics__segment-bar"
                  :style="{ width: `${segment.percentage}%`, backgroundColor: segment.color }"
                ></div>
                <span class="admin-statistics__segment-value">{{ segment.count }} ({{ segment.percentage }}%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Sessions View -->
    <div v-if="selectedView === 'sessions'" class="admin-statistics__sessions-view">
      <div class="admin-statistics__section">
        <h3 class="admin-statistics__section-title">{{ t('admin.statistics.sections.sessionStats', 'Sitzungsstatistiken') }}</h3>
        
        <!-- Sessions Chart -->
        <div class="admin-statistics__chart-container">
          <div class="admin-statistics__chart">
            <canvas ref="sessionsChart"></canvas>
          </div>
        </div>

        <!-- Session Distribution -->
        <div class="admin-statistics__session-distribution">
          <h4 class="admin-statistics__subsection-title">{{ t('admin.statistics.sections.sessionDistribution', 'Sitzungsverteilung') }}</h4>
          
          <div class="admin-statistics__distribution-grid">
            <div class="admin-statistics__distribution-card">
              <h5 class="admin-statistics__distribution-title">{{ t('admin.statistics.distribution.byTime', 'Nach Tageszeit') }}</h5>
              <div class="admin-statistics__distribution-chart">
                <canvas ref="sessionTimeDistChart"></canvas>
              </div>
            </div>
            
            <div class="admin-statistics__distribution-card">
              <h5 class="admin-statistics__distribution-title">{{ t('admin.statistics.distribution.byDuration', 'Nach Dauer') }}</h5>
              <div class="admin-statistics__distribution-chart">
                <canvas ref="sessionDurationChart"></canvas>
              </div>
            </div>

            <div class="admin-statistics__distribution-card">
              <h5 class="admin-statistics__distribution-title">{{ t('admin.statistics.distribution.byMessages', 'Nach Nachrichtenanzahl') }}</h5>
              <div class="admin-statistics__distribution-chart">
                <canvas ref="sessionMessagesChart"></canvas>
              </div>
            </div>
            
            <div class="admin-statistics__distribution-card">
              <h5 class="admin-statistics__distribution-title">{{ t('admin.statistics.distribution.byDevice', 'Nach Gerät') }}</h5>
              <div class="admin-statistics__distribution-chart">
                <canvas ref="sessionDeviceChart"></canvas>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Feedback View -->
    <div v-if="selectedView === 'feedback'" class="admin-statistics__feedback-view">
      <div class="admin-statistics__section">
        <h3 class="admin-statistics__section-title">{{ t('admin.statistics.sections.feedbackStats', 'Feedback-Statistiken') }}</h3>
        
        <div class="admin-statistics__feedback-summary">
          <div class="admin-statistics__feedback-card">
            <div class="admin-statistics__feedback-title">{{ t('admin.statistics.feedback.avgRating', 'Durchschnittliche Bewertung') }}</div>
            <div class="admin-statistics__feedback-rating">
              <div class="admin-statistics__feedback-rating-value">{{ feedbackAverage.toFixed(1) }}/5.0</div>
              <div class="admin-statistics__rating-stars">
                <div class="admin-statistics__stars-container">
                  <div class="admin-statistics__stars-filled" :style="{ width: `${feedbackAverage * 20}%` }"></div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="admin-statistics__feedback-card">
            <div class="admin-statistics__feedback-title">{{ t('admin.statistics.feedback.distribution', 'Bewertungsverteilung') }}</div>
            <div class="admin-statistics__feedback-distribution">
              <div class="admin-statistics__rating-bars">
                <div 
                  v-for="i in 5" 
                  :key="i" 
                  class="admin-statistics__rating-bar-container"
                >
                  <div class="admin-statistics__rating-label">{{ i }}</div>
                  <div class="admin-statistics__rating-bar-wrapper">
                    <div 
                      class="admin-statistics__rating-bar" 
                      :style="{ width: `${getRatingPercentage(i)}%`, backgroundColor: getRatingColor(i) }"
                    ></div>
                    <span class="admin-statistics__rating-count">{{ getRatingCount(i) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Feedback Chart -->
        <div class="admin-statistics__chart-container">
          <div class="admin-statistics__chart">
            <canvas ref="feedbackTrendChart"></canvas>
          </div>
        </div>
      </div>
    </div>

    <!-- Performance View -->
    <div v-if="selectedView === 'performance'" class="admin-statistics__performance-view">
      <div class="admin-statistics__section">
        <h3 class="admin-statistics__section-title">{{ t('admin.statistics.sections.performanceStats', 'Leistungsstatistiken') }}</h3>
        
        <!-- Performance Grid -->
        <div class="admin-statistics__performance-grid">
          <div class="admin-statistics__performance-card">
            <h4 class="admin-statistics__performance-title">{{ t('admin.statistics.performance.responseTime', 'Antwortzeit') }}</h4>
            <div class="admin-statistics__performance-chart">
              <canvas ref="responseTimeChart"></canvas>
            </div>
          </div>
          
          <div class="admin-statistics__performance-card">
            <h4 class="admin-statistics__performance-title">{{ t('admin.statistics.performance.resourceUsage', 'Ressourcenverbrauch') }}</h4>
            <div class="admin-statistics__performance-chart">
              <canvas ref="resourceUsageChart"></canvas>
            </div>
          </div>
          
          <div class="admin-statistics__performance-card">
            <h4 class="admin-statistics__performance-title">{{ t('admin.statistics.performance.errorRate', 'Fehlerraten') }}</h4>
            <div class="admin-statistics__performance-chart">
              <canvas ref="errorRateChart"></canvas>
            </div>
          </div>
          
          <div class="admin-statistics__performance-card">
            <h4 class="admin-statistics__performance-title">{{ t('admin.statistics.performance.cacheMetrics', 'Cache-Metriken') }}</h4>
            <div class="admin-statistics__performance-chart">
              <canvas ref="cacheMetricsChart"></canvas>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Export & Actions -->
    <div class="admin-statistics__actions">
      <button class="admin-statistics__action-button" @click="exportData">
        <i class="fas fa-download" aria-hidden="true"></i>
        {{ t('admin.statistics.actions.export', 'Daten exportieren') }}
      </button>
      
      <button class="admin-statistics__action-button" @click="refreshData">
        <i class="fas fa-sync" aria-hidden="true"></i>
        {{ t('admin.statistics.actions.refresh', 'Daten aktualisieren') }}
      </button>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useAdminSystemStore } from '@/stores/admin/system';
import { useToast } from '@/composables/useToast';

// i18n
const { t } = useI18n();

// Stores
const adminSystemStore = useAdminSystemStore();

// Store state
const { stats, memoryStatus, cpuStatus } = storeToRefs(adminSystemStore);

// Toast notifications
const { showToast } = useToast();

// Local state
const isLoading = ref(false);
const selectedTimeRange = ref('week');
const selectedView = ref('overview');

// Chart references
const usageChart = ref<HTMLCanvasElement | null>(null);
const performanceChart = ref<HTMLCanvasElement | null>(null);
const userActivityChart = ref<HTMLCanvasElement | null>(null);
const sessionsChart = ref<HTMLCanvasElement | null>(null);
const sessionTimeDistChart = ref<HTMLCanvasElement | null>(null);
const sessionDurationChart = ref<HTMLCanvasElement | null>(null);
const sessionMessagesChart = ref<HTMLCanvasElement | null>(null);
const sessionDeviceChart = ref<HTMLCanvasElement | null>(null);
const feedbackTrendChart = ref<HTMLCanvasElement | null>(null);
const responseTimeChart = ref<HTMLCanvasElement | null>(null);
const resourceUsageChart = ref<HTMLCanvasElement | null>(null);
const errorRateChart = ref<HTMLCanvasElement | null>(null);
const cacheMetricsChart = ref<HTMLCanvasElement | null>(null);

// Chart instances
const chartInstances = ref<Record<string, any>>({});

// Time range options
const timeRanges = [
  { value: 'day', label: t('admin.statistics.ranges.day', 'Tag') },
  { value: 'week', label: t('admin.statistics.ranges.week', 'Woche') },
  { value: 'month', label: t('admin.statistics.ranges.month', 'Monat') },
  { value: 'year', label: t('admin.statistics.ranges.year', 'Jahr') }
];

// User segmentation data (mock)
const userSegments = ref([
  { label: t('admin.statistics.segments.regular', 'Regelmäßige Nutzer'), count: 64, percentage: 52, color: '#3b82f6' },
  { label: t('admin.statistics.segments.occasional', 'Gelegentliche Nutzer'), count: 36, percentage: 29, color: '#10b981' },
  { label: t('admin.statistics.segments.new', 'Neue Nutzer'), count: 18, percentage: 15, color: '#f59e0b' },
  { label: t('admin.statistics.segments.inactive', 'Inaktive Nutzer'), count: 5, percentage: 4, color: '#ef4444' }
]);

// Feedback data (mock)
const feedbackRatings = ref({
  '1': 12,
  '2': 18,
  '3': 45,
  '4': 78,
  '5': 109
});

const feedbackAverage = computed(() => {
  const total = Object.values(feedbackRatings.value).reduce((sum, count) => sum + count, 0);
  if (total === 0) return 0;
  
  let weightedSum = 0;
  for (let i = 1; i <= 5; i++) {
    weightedSum += i * (feedbackRatings.value[i] || 0);
  }
  
  return weightedSum / total;
});

// Chart.js library
let Chart: any = null;

// Methods
function getStatusText(status: string): string {
  switch (status) {
    case 'critical':
      return t('admin.system.statusCritical', 'Kritisch');
    case 'warning':
      return t('admin.system.statusWarning', 'Warnung');
    default:
      return t('admin.system.statusNormal', 'Normal');
  }
}

function getRatingCount(rating: number): number {
  return feedbackRatings.value[rating] || 0;
}

function getRatingPercentage(rating: number): number {
  const total = Object.values(feedbackRatings.value).reduce((sum, count) => sum + count, 0);
  if (total === 0) return 0;
  return (getRatingCount(rating) / total) * 100;
}

function getRatingColor(rating: number): string {
  const colors = [
    '#ef4444', // 1 - rot
    '#f97316', // 2 - orange
    '#f59e0b', // 3 - bernstein
    '#84cc16', // 4 - hellgrün
    '#10b981'  // 5 - grün
  ];
  
  return colors[rating - 1];
}

async function loadChartLibrary() {
  if (Chart) return;
  
  try {
    // In a real implementation, you would dynamically import Chart.js:
    // Chart = await import('chart.js');
    
    // For this example, we'll create a mock Chart class
    console.log('Loading Chart.js dynamically');
    Chart = { 
      Chart: class MockChart {
        constructor(ctx, config) {
          this.ctx = ctx;
          this.config = config;
        }
        update() {}
        destroy() {}
      }
    };
  } catch (error) {
    console.error('Failed to load Chart.js:', error);
    showToast({
      type: 'error',
      title: t('admin.statistics.toast.chartLoadError', 'Fehler'),
      message: t('admin.statistics.toast.chartLoadErrorMessage', 'Fehler beim Laden der Diagrammbibliothek')
    });
  }
}

async function initCharts() {
  await loadChartLibrary();
  if (!Chart) return;
  
  try {
    // Initialize overview charts if they're visible
    if (selectedView.value === 'overview') {
      initUsageChart();
      initPerformanceChart();
    } else if (selectedView.value === 'users') {
      initUserActivityChart();
    } else if (selectedView.value === 'sessions') {
      initSessionsCharts();
    } else if (selectedView.value === 'feedback') {
      initFeedbackCharts();
    } else if (selectedView.value === 'performance') {
      initPerformanceCharts();
    }
  } catch (error) {
    console.error('Error initializing charts:', error);
  }
}

function initUsageChart() {
  if (!usageChart.value || !Chart) return;
  
  // Mock data for usage chart
  const labels = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  const data = {
    labels,
    datasets: [
      {
        label: t('admin.statistics.metrics.sessions', 'Sitzungen'),
        data: [65, 78, 86, 74, 92, 51, 44],
        borderColor: 'rgba(54, 162, 235, 1)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        borderWidth: 2,
        fill: true
      },
      {
        label: t('admin.statistics.metrics.messages', 'Nachrichten'),
        data: [325, 420, 390, 410, 450, 240, 210],
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderWidth: 2,
        fill: true
      }
    ]
  };

  const config = {
    type: 'line',
    data: data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true
        }
      },
      plugins: {
        legend: {
          position: 'top',
        }
      }
    }
  };

  // Destroy existing chart if it exists
  if (chartInstances.value.usageChart) {
    chartInstances.value.usageChart.destroy();
  }

  // Create new chart
  const ctx = usageChart.value.getContext('2d');
  if (ctx) {
    chartInstances.value.usageChart = new Chart.Chart(ctx, config);
  }
}

function initPerformanceChart() {
  if (!performanceChart.value || !Chart) return;
  
  // Mock data for performance chart
  const labels = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  const data = {
    labels,
    datasets: [
      {
        label: t('admin.statistics.metrics.responseTime', 'Antwortzeit (ms)'),
        data: [520, 490, 475, 510, 530, 450, 440],
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        borderWidth: 2,
        yAxisID: 'y'
      },
      {
        label: t('admin.statistics.metrics.cpuUsage', 'CPU (%)'),
        data: [45, 52, 58, 60, 65, 40, 38],
        borderColor: 'rgba(153, 102, 255, 1)',
        backgroundColor: 'rgba(153, 102, 255, 0.2)',
        borderWidth: 2,
        yAxisID: 'y1'
      }
    ]
  };

  const config = {
    type: 'line',
    data: data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          position: 'left',
          title: {
            display: true,
            text: t('admin.statistics.metrics.responseTime', 'Antwortzeit (ms)')
          }
        },
        y1: {
          beginAtZero: true,
          position: 'right',
          title: {
            display: true,
            text: t('admin.statistics.metrics.cpuUsage', 'CPU (%)')
          },
          grid: {
            drawOnChartArea: false
          }
        }
      },
      plugins: {
        legend: {
          position: 'top',
        }
      }
    }
  };

  // Destroy existing chart if it exists
  if (chartInstances.value.performanceChart) {
    chartInstances.value.performanceChart.destroy();
  }

  // Create new chart
  const ctx = performanceChart.value.getContext('2d');
  if (ctx) {
    chartInstances.value.performanceChart = new Chart.Chart(ctx, config);
  }
}

function initUserActivityChart() {
  // Implementation similar to initUsageChart and initPerformanceChart
  // Would create a user activity chart based on the user data
}

function initSessionsCharts() {
  // Implementation for sessions charts
  // Would initialize multiple session-related charts
}

function initFeedbackCharts() {
  // Implementation for feedback charts
  // Would initialize feedback trend chart
}

function initPerformanceCharts() {
  // Implementation for performance charts
  // Would initialize multiple performance-related charts
}

function exportData() {
  showToast({
    type: 'info',
    title: t('admin.statistics.toast.exported', 'Export'),
    message: t('admin.statistics.toast.exportedMessage', 'Statistikdaten wurden exportiert')
  });
}

async function refreshData() {
  isLoading.value = true;
  
  try {
    await adminSystemStore.fetchStats();
    
    // Reload charts after data refresh
    initCharts();
    
    showToast({
      type: 'success',
      title: t('admin.statistics.toast.refreshed', 'Aktualisiert'),
      message: t('admin.statistics.toast.refreshedMessage', 'Statistikdaten wurden aktualisiert')
    });
  } catch (error) {
    showToast({
      type: 'error',
      title: t('admin.statistics.toast.refreshError', 'Fehler'),
      message: t('admin.statistics.toast.refreshErrorMessage', 'Fehler beim Aktualisieren der Daten')
    });
  } finally {
    isLoading.value = false;
  }
}

// Handle resize
function handleResize() {
  for (const chart in chartInstances.value) {
    if (chartInstances.value[chart]) {
      chartInstances.value[chart].update();
    }
  }
}

// Lifecycle hooks
onMounted(async () => {
  // Load system stats
  isLoading.value = true;
  
  try {
    await adminSystemStore.fetchStats();
    await initCharts();
  } catch (error) {
    console.error('Error fetching system stats:', error);
  } finally {
    isLoading.value = false;
  }
  
  // Add resize listener
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  // Clean up charts
  for (const chart in chartInstances.value) {
    if (chartInstances.value[chart]) {
      chartInstances.value[chart].destroy();
    }
  }
  
  // Remove resize listener
  window.removeEventListener('resize', handleResize);
});

// Watch for view changes
watch(selectedView, () => {
  // Initialize the relevant charts when view changes
  initCharts();
});

// Watch for time range changes
watch(selectedTimeRange, () => {
  // Refresh charts when time range changes
  initCharts();
});
</script>

<style scoped>
.admin-statistics {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.admin-statistics__title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--n-color-text-primary);
}

.admin-statistics__description {
  margin: 0;
  color: var(--n-color-text-secondary);
  line-height: 1.5;
}

.admin-statistics__controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1rem;
}

.admin-statistics__time-range,
.admin-statistics__view-selector {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.admin-statistics__button-group {
  display: flex;
  border-radius: var(--n-border-radius);
  overflow: hidden;
  border: 1px solid var(--n-color-border);
}

.admin-statistics__range-button {
  padding: 0.5rem 1rem;
  background-color: var(--n-color-background-alt);
  border: none;
  border-right: 1px solid var(--n-color-border);
  color: var(--n-color-text-primary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.admin-statistics__range-button:last-child {
  border-right: none;
}

.admin-statistics__range-button--active {
  background-color: var(--n-color-primary);
  color: var(--n-color-on-primary);
}

.admin-statistics__view-select {
  padding: 0.5rem;
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
  background-color: var(--n-color-background);
  color: var(--n-color-text-primary);
}

/* Overview Cards */
.admin-statistics__cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.25rem;
  margin-bottom: 2rem;
}

.admin-statistics__card {
  display: flex;
  padding: 1.25rem;
  background-color: var(--n-color-background-alt);
  border-radius: var(--n-border-radius);
  box-shadow: var(--n-shadow-sm);
  gap: 1rem;
}

.admin-statistics__card--users {
  border-left: 4px solid #3b82f6;
}

.admin-statistics__card--sessions {
  border-left: 4px solid #10b981;
}

.admin-statistics__card--messages {
  border-left: 4px solid #f59e0b;
}

.admin-statistics__card--feedback {
  border-left: 4px solid #8b5cf6;
}

.admin-statistics__card-icon {
  font-size: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--n-color-text-secondary);
}

.admin-statistics__card--users .admin-statistics__card-icon {
  color: #3b82f6;
}

.admin-statistics__card--sessions .admin-statistics__card-icon {
  color: #10b981;
}

.admin-statistics__card--messages .admin-statistics__card-icon {
  color: #f59e0b;
}

.admin-statistics__card--feedback .admin-statistics__card-icon {
  color: #8b5cf6;
}

.admin-statistics__card-content {
  flex: 1;
}

.admin-statistics__card-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 500;
  color: var(--n-color-text-secondary);
}

.admin-statistics__card-value {
  font-size: 2rem;
  font-weight: 600;
  color: var(--n-color-text-primary);
  margin: 0.5rem 0;
}

.admin-statistics__card-details {
  font-size: 0.875rem;
  color: var(--n-color-text-secondary);
}

.admin-statistics__card-detail {
  display: flex;
  justify-content: space-between;
  margin-top: 0.25rem;
}

/* Charts */
.admin-statistics__charts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
  gap: 2rem;
  margin-bottom: 2rem;
}

.admin-statistics__chart-container {
  background-color: var(--n-color-background-alt);
  border-radius: var(--n-border-radius);
  padding: 1.25rem;
  box-shadow: var(--n-shadow-sm);
}

.admin-statistics__chart-title {
  margin: 0 0 1.5rem 0;
  font-size: 1.125rem;
  font-weight: 500;
  color: var(--n-color-text-primary);
}

.admin-statistics__chart {
  position: relative;
  height: 300px;
  width: 100%;
}

/* Section Titles */
.admin-statistics__section-title {
  margin: 0 0 1.5rem 0;
  font-size: 1.25rem;
  font-weight: 500;
  color: var(--n-color-text-primary);
  border-bottom: 1px solid var(--n-color-border);
  padding-bottom: 0.75rem;
}

.admin-statistics__subsection-title {
  margin: 1.5rem 0 1rem 0;
  font-size: 1.125rem;
  font-weight: 500;
  color: var(--n-color-text-primary);
}

/* Resource Metrics */
.admin-statistics__resources {
  margin-bottom: 2rem;
}

.admin-statistics__resource-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.25rem;
}

.admin-statistics__resource-card {
  padding: 1.25rem;
  background-color: var(--n-color-background-alt);
  border-radius: var(--n-border-radius);
  box-shadow: var(--n-shadow-sm);
}

.admin-statistics__resource-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
}

.admin-statistics__resource-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  color: var(--n-color-text-primary);
}

.admin-statistics__resource-title i {
  color: var(--n-color-primary);
}

.admin-statistics__resource-status {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
}

.admin-statistics__resource-status--normal {
  background-color: var(--n-color-success);
}

.admin-statistics__resource-status--warning {
  background-color: var(--n-color-warning);
}

.admin-statistics__resource-status--critical {
  background-color: var(--n-color-error);
}

.admin-statistics__meter-container {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.admin-statistics__meter {
  flex: 1;
  height: 0.5rem;
  background-color: var(--n-color-background);
  border-radius: 1rem;
  overflow: hidden;
}

.admin-statistics__meter-fill {
  height: 100%;
  border-radius: 1rem;
  transition: width 0.5s ease;
}

.admin-statistics__meter-fill--normal {
  background-color: var(--n-color-success);
}

.admin-statistics__meter-fill--warning {
  background-color: var(--n-color-warning);
}

.admin-statistics__meter-fill--critical {
  background-color: var(--n-color-error);
}

.admin-statistics__meter-value {
  min-width: 3rem;
  font-weight: 600;
  text-align: right;
  color: var(--n-color-text-primary);
}

.admin-statistics__resource-value-large {
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--n-color-text-primary);
  text-align: center;
  margin-top: 0.5rem;
}

.admin-statistics__resource-values {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.admin-statistics__resource-value-item {
  display: flex;
  justify-content: space-between;
  color: var(--n-color-text-primary);
}

/* User Segmentation */
.admin-statistics__user-segmentation {
  margin-top: 2rem;
  padding: 1.25rem;
  background-color: var(--n-color-background-alt);
  border-radius: var(--n-border-radius);
  box-shadow: var(--n-shadow-sm);
}

.admin-statistics__segmentation-chart {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
}

.admin-statistics__segment-item {
  display: flex;
  align-items: center;
}

.admin-statistics__segment-label {
  width: 180px;
  padding-right: 1rem;
  font-weight: 500;
}

.admin-statistics__segment-bar-container {
  flex: 1;
  display: flex;
  align-items: center;
  height: 2rem;
}

.admin-statistics__segment-bar {
  height: 1rem;
  border-radius: 0.5rem;
  transition: width 0.3s ease;
}

.admin-statistics__segment-value {
  margin-left: 1rem;
  color: var(--n-color-text-secondary);
  min-width: 100px;
}

/* Sessions View */
.admin-statistics__distribution-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.25rem;
  margin-top: 1.5rem;
}

.admin-statistics__distribution-card {
  padding: 1.25rem;
  background-color: var(--n-color-background-alt);
  border-radius: var(--n-border-radius);
  box-shadow: var(--n-shadow-sm);
}

.admin-statistics__distribution-title {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  font-weight: 500;
  color: var(--n-color-text-primary);
  text-align: center;
}

.admin-statistics__distribution-chart {
  height: 200px;
}

/* Feedback View */
.admin-statistics__feedback-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.25rem;
  margin-bottom: 2rem;
}

.admin-statistics__feedback-card {
  padding: 1.25rem;
  background-color: var(--n-color-background-alt);
  border-radius: var(--n-border-radius);
  box-shadow: var(--n-shadow-sm);
}

.admin-statistics__feedback-title {
  font-weight: 500;
  margin-bottom: 1rem;
  color: var(--n-color-text-primary);
}

.admin-statistics__feedback-rating {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.admin-statistics__feedback-rating-value {
  font-size: 2rem;
  font-weight: 600;
  color: var(--n-color-text-primary);
  margin-bottom: 0.5rem;
}

.admin-statistics__rating-stars {
  width: 100%;
  max-width: 200px;
}

.admin-statistics__stars-container {
  position: relative;
  width: 100%;
  height: 30px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='%23e5e7eb'%3E%3Cpath d='M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z'/%3E%3C/svg%3E");
  background-repeat: repeat-x;
  background-size: 30px 30px;
}

.admin-statistics__stars-filled {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='%23f59e0b'%3E%3Cpath d='M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z'/%3E%3C/svg%3E");
  background-repeat: repeat-x;
  background-size: 30px 30px;
}

.admin-statistics__feedback-distribution {
  margin-top: 1rem;
}

.admin-statistics__rating-bars {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.admin-statistics__rating-bar-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.admin-statistics__rating-label {
  width: 1.5rem;
  text-align: center;
  font-weight: 500;
}

.admin-statistics__rating-bar-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  height: 1.5rem;
}

.admin-statistics__rating-bar {
  height: 1rem;
  border-radius: 0.5rem;
  transition: width 0.3s ease;
}

.admin-statistics__rating-count {
  margin-left: 0.75rem;
  font-size: 0.875rem;
  color: var(--n-color-text-secondary);
  min-width: 2.5rem;
  text-align: right;
}

/* Performance View */
.admin-statistics__performance-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
  gap: 1.25rem;
}

.admin-statistics__performance-card {
  padding: 1.25rem;
  background-color: var(--n-color-background-alt);
  border-radius: var(--n-border-radius);
  box-shadow: var(--n-shadow-sm);
  margin-bottom: 1.25rem;
}

.admin-statistics__performance-title {
  margin: 0 0 1rem 0;
  font-size: 1.125rem;
  font-weight: 500;
  color: var(--n-color-text-primary);
}

.admin-statistics__performance-chart {
  height: 250px;
}

/* Actions */
.admin-statistics__actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
}

.admin-statistics__action-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  background-color: var(--n-color-background-alt);
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
  color: var(--n-color-text-primary);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.admin-statistics__action-button:hover {
  background-color: var(--n-color-primary);
  border-color: var(--n-color-primary);
  color: var(--n-color-on-primary);
}

/* Responsive Design */
@media (max-width: 768px) {
  .admin-statistics__controls {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .admin-statistics__charts,
  .admin-statistics__performance-grid {
    grid-template-columns: 1fr;
  }
  
  .admin-statistics__actions {
    flex-direction: column;
  }
  
  .admin-statistics__action-button {
    width: 100%;
    justify-content: center;
  }
  
  .admin-statistics__feedback-summary {
    grid-template-columns: 1fr;
  }
}
</style>