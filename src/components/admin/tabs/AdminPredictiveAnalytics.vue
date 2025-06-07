<template>
  <div class="admin-predictive-analytics">
    <h2 class="analytics__title">
      {{ t('admin.analytics.title', 'Predictive Analytics') }}
    </h2>

    <!-- Dashboard Overview -->
    <div class="analytics__dashboard">
      <!-- Alerts Section -->
      <div v-if="alerts.length > 0" class="alerts-section">
        <h3>{{ t('admin.analytics.alerts', 'Aktive Warnungen') }}</h3>
        <div class="alerts-grid">
          <div
            v-for="alert in alerts"
            :key="alert.metric + alert.trigger_time"
            class="alert-card"
          >
            <div class="alert-icon">
              <i class="fas fa-exclamation-triangle"></i>
            </div>
            <div class="alert-content">
              <h4>{{ formatMetricName(alert.metric) }}</h4>
              <p>{{ alert.message }}</p>
              <div class="alert-meta">
                <span>{{ t('admin.analytics.confidence', 'Konfidenz') }}: {{ (alert.confidence * 100).toFixed(0) }}%</span>
                <span>{{ formatTime(alert.trigger_time) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Metrics Grid -->
      <div class="metrics-grid">
        <div
          v-for="(data, metric) in metricsData"
          :key="metric"
          class="metric-card"
          :class="{ 'has-anomalies': data.has_anomalies }"
          @click="selectedMetric = metric"
        >
          <div class="metric-header">
            <h3>{{ formatMetricName(metric) }}</h3>
            <div class="metric-trend" :class="`trend-${data.trend}`">
              <i :class="getTrendIcon(data.trend)"></i>
              {{ data.change_percent > 0 ? '+' : '' }}{{ data.change_percent.toFixed(1) }}%
            </div>
          </div>
          <div class="metric-value">
            {{ formatMetricValue(metric, data.current) }}
          </div>
          <div v-if="data.has_anomalies" class="anomaly-indicator">
            <i class="fas fa-exclamation-circle"></i>
            {{ t('admin.analytics.anomalyDetected', 'Anomalie erkannt') }}
          </div>
        </div>
      </div>

      <!-- Recent Anomalies -->
      <div v-if="recentAnomalies.length > 0" class="anomalies-section">
        <h3>{{ t('admin.analytics.recentAnomalies', 'Aktuelle Anomalien') }}</h3>
        <div class="anomalies-list">
          <div
            v-for="anomaly in recentAnomalies"
            :key="anomaly.timestamp"
            class="anomaly-item"
            :class="`severity-${getSeverityLevel(anomaly.severity)}`"
          >
            <div class="anomaly-header">
              <span class="anomaly-metric">{{ formatMetricName(anomaly.metric) }}</span>
              <span class="anomaly-time">{{ formatDateTime(anomaly.timestamp) }}</span>
            </div>
            <p class="anomaly-message">{{ anomaly.message }}</p>
            <div class="anomaly-severity">
              {{ t('admin.analytics.severity', 'Schweregrad') }}: 
              <span class="severity-badge">{{ (anomaly.severity * 100).toFixed(0) }}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Detailed View -->
    <div v-if="selectedMetric" class="analytics__detail">
      <div class="detail-header">
        <h3>{{ formatMetricName(selectedMetric) }}</h3>
        <button class="close-button" @click="selectedMetric = null">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <!-- Time Range Selector -->
      <div class="time-range-selector">
        <button
          v-for="range in timeRanges"
          :key="range.value"
          class="range-button"
          :class="{ active: selectedRange === range.value }"
          @click="selectTimeRange(range.value)"
        >
          {{ range.label }}
        </button>
      </div>

      <!-- Chart -->
      <div class="chart-container">
        <canvas ref="chartCanvas"></canvas>
      </div>

      <!-- Predictions -->
      <div class="predictions-section">
        <h4>{{ t('admin.analytics.predictions', 'Vorhersagen') }}</h4>
        <div class="prediction-horizon">
          <label>{{ t('admin.analytics.horizon', 'Vorhersagehorizont') }}:</label>
          <select v-model="predictionHorizon" @change="updatePredictions">
            <option :value="6">6 {{ t('admin.analytics.hours', 'Stunden') }}</option>
            <option :value="12">12 {{ t('admin.analytics.hours', 'Stunden') }}</option>
            <option :value="24">24 {{ t('admin.analytics.hours', 'Stunden') }}</option>
            <option :value="48">48 {{ t('admin.analytics.hours', 'Stunden') }}</option>
            <option :value="168">7 {{ t('admin.analytics.days', 'Tage') }}</option>
          </select>
        </div>

        <div v-if="predictions" class="prediction-summary">
          <div class="prediction-stat">
            <label>{{ t('admin.analytics.predicted', 'Vorhergesagter Bereich') }}:</label>
            <span>{{ formatMetricValue(selectedMetric, predictionRange.min) }} - {{ formatMetricValue(selectedMetric, predictionRange.max) }}</span>
          </div>
          <div class="prediction-stat">
            <label>{{ t('admin.analytics.avgConfidence', 'Durchschnittliche Konfidenz') }}:</label>
            <span>{{ (avgConfidence * 100).toFixed(0) }}%</span>
          </div>
        </div>
      </div>

      <!-- Trend Analysis -->
      <div v-if="trendData" class="trend-section">
        <h4>{{ t('admin.analytics.trendAnalysis', 'Trendanalyse') }}</h4>
        <div class="trend-stats">
          <div class="trend-stat">
            <i :class="getTrendIcon(trendData.direction)"></i>
            <span>{{ t(`admin.analytics.trend.${trendData.direction}`, trendData.direction) }}</span>
          </div>
          <div class="trend-stat">
            <label>{{ t('admin.analytics.changeRate', 'Änderungsrate') }}:</label>
            <span>{{ trendData.change_percent.toFixed(2) }}%</span>
          </div>
          <div class="trend-stat">
            <label>{{ t('admin.analytics.correlation', 'Korrelation') }}:</label>
            <span>R² = {{ trendData.r_squared.toFixed(3) }}</span>
          </div>
        </div>
      </div>

      <!-- Recommendations -->
      <div v-if="recommendations.length > 0" class="recommendations-section">
        <h4>{{ t('admin.analytics.recommendations', 'Empfehlungen') }}</h4>
        <ul class="recommendations-list">
          <li v-for="(rec, index) in recommendations" :key="index">
            <i class="fas fa-lightbulb"></i>
            {{ rec }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { AdminService } from '@/services/api/AdminService';
import Chart from 'chart.js/auto';

const { t } = useI18n();
const adminService = new AdminService();

// State
const loading = ref(false);
const selectedMetric = ref<string | null>(null);
const selectedRange = ref(7); // days
const predictionHorizon = ref(24); // hours
const metricsData = ref<Record<string, any>>({});
const alerts = ref<any[]>([]);
const recentAnomalies = ref<any[]>([]);
const historicalData = ref<any[]>([]);
const predictions = ref<any[]>([]);
const trendData = ref<any>(null);
const recommendations = ref<string[]>([]);

// Chart reference
const chartCanvas = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart | null = null;

// Time ranges
const timeRanges = [
  { value: 1, label: t('admin.analytics.1day', '1 Tag') },
  { value: 7, label: t('admin.analytics.7days', '7 Tage') },
  { value: 30, label: t('admin.analytics.30days', '30 Tage') },
  { value: 90, label: t('admin.analytics.90days', '90 Tage') }
];

// Computed
const predictionRange = computed(() => {
  if (!predictions.value.length) return { min: 0, max: 0 };
  
  const values = predictions.value.map(p => p.value);
  return {
    min: Math.min(...values),
    max: Math.max(...values)
  };
});

const avgConfidence = computed(() => {
  if (!predictions.value.length) return 0;
  
  const sum = predictions.value.reduce((acc, p) => acc + p.confidence, 0);
  return sum / predictions.value.length;
});

// Methods
async function fetchDashboard() {
  loading.value = true;
  try {
    const response = await adminService.request('/api/admin/analytics/dashboard');
    
    if (response.data.success) {
      metricsData.value = response.data.dashboard.metrics;
      alerts.value = response.data.dashboard.alerts;
      recentAnomalies.value = response.data.dashboard.recent_anomalies;
    }
  } catch (error) {
    console.error('Failed to fetch analytics dashboard:', error);
  } finally {
    loading.value = false;
  }
}

async function fetchMetricData(metric: string) {
  if (!metric) return;
  
  try {
    // Fetch historical data
    const histResponse = await adminService.request(
      `/api/admin/analytics/historical/${metric}`,
      { params: { days: selectedRange.value } }
    );
    
    if (histResponse.data.success) {
      historicalData.value = histResponse.data.data;
    }
    
    // Fetch predictions
    const predResponse = await adminService.request(
      `/api/admin/analytics/predict/${metric}`,
      { params: { horizon_hours: predictionHorizon.value } }
    );
    
    if (predResponse.data.success) {
      predictions.value = predResponse.data.report.predictions;
      trendData.value = predResponse.data.report.trend;
      recommendations.value = predResponse.data.report.recommendations;
    }
    
    // Update chart
    await nextTick();
    updateChart();
  } catch (error) {
    console.error('Failed to fetch metric data:', error);
  }
}

function updateChart() {
  if (!chartCanvas.value) return;
  
  // Destroy existing chart
  if (chartInstance) {
    chartInstance.destroy();
  }
  
  // Prepare data
  const historicalPoints = historicalData.value.map(d => ({
    x: new Date(d.timestamp),
    y: d.value
  }));
  
  const predictionPoints = predictions.value.map(p => ({
    x: new Date(p.timestamp),
    y: p.value
  }));
  
  const lowerBounds = predictions.value.map(p => ({
    x: new Date(p.timestamp),
    y: p.lower_bound
  }));
  
  const upperBounds = predictions.value.map(p => ({
    x: new Date(p.timestamp),
    y: p.upper_bound
  }));
  
  // Create chart
  const ctx = chartCanvas.value.getContext('2d');
  if (!ctx) return;
  
  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [
        {
          label: t('admin.analytics.historical', 'Historisch'),
          data: historicalPoints,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.1)',
          tension: 0.1
        },
        {
          label: t('admin.analytics.predicted', 'Vorhersage'),
          data: predictionPoints,
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.1)',
          borderDash: [5, 5],
          tension: 0.1
        },
        {
          label: t('admin.analytics.confidenceBounds', 'Konfidenzbereich'),
          data: upperBounds,
          borderColor: 'rgba(255, 99, 132, 0.3)',
          backgroundColor: 'transparent',
          borderDash: [2, 2],
          pointRadius: 0,
          fill: '+1'
        },
        {
          label: '',
          data: lowerBounds,
          borderColor: 'rgba(255, 99, 132, 0.3)',
          backgroundColor: 'rgba(255, 99, 132, 0.1)',
          borderDash: [2, 2],
          pointRadius: 0,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          display: true,
          labels: {
            filter: (item) => item.text !== ''
          }
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const label = context.dataset.label || '';
              const value = context.parsed.y;
              return `${label}: ${formatMetricValue(selectedMetric.value!, value)}`;
            }
          }
        }
      },
      scales: {
        x: {
          type: 'time',
          time: {
            displayFormats: {
              hour: 'HH:mm',
              day: 'MMM dd'
            }
          },
          title: {
            display: true,
            text: t('admin.analytics.time', 'Zeit')
          }
        },
        y: {
          title: {
            display: true,
            text: getMetricUnit(selectedMetric.value!)
          }
        }
      }
    }
  });
}

function selectTimeRange(days: number) {
  selectedRange.value = days;
  if (selectedMetric.value) {
    fetchMetricData(selectedMetric.value);
  }
}

function updatePredictions() {
  if (selectedMetric.value) {
    fetchMetricData(selectedMetric.value);
  }
}

function formatMetricName(metric: string): string {
  const names: Record<string, string> = {
    user_activity: t('admin.analytics.metrics.userActivity', 'Benutzeraktivität'),
    system_load: t('admin.analytics.metrics.systemLoad', 'Systemlast'),
    error_rate: t('admin.analytics.metrics.errorRate', 'Fehlerrate'),
    response_time: t('admin.analytics.metrics.responseTime', 'Antwortzeit'),
    storage_usage: t('admin.analytics.metrics.storageUsage', 'Speichernutzung'),
    feedback_score: t('admin.analytics.metrics.feedbackScore', 'Feedback-Bewertung'),
    document_volume: t('admin.analytics.metrics.documentVolume', 'Dokumentenvolumen')
  };
  
  return names[metric] || metric.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function formatMetricValue(metric: string, value: number): string {
  switch (metric) {
    case 'user_activity':
      return value.toFixed(0);
    case 'system_load':
      return `${value.toFixed(1)}%`;
    case 'error_rate':
      return `${(value * 100).toFixed(2)}%`;
    case 'response_time':
      return `${value.toFixed(0)}ms`;
    case 'storage_usage':
      return `${value.toFixed(1)}GB`;
    case 'feedback_score':
      return value.toFixed(2);
    case 'document_volume':
      return value.toFixed(0);
    default:
      return value.toFixed(2);
  }
}

function getMetricUnit(metric: string): string {
  const units: Record<string, string> = {
    user_activity: t('admin.analytics.units.users', 'Benutzer'),
    system_load: '%',
    error_rate: '%',
    response_time: 'ms',
    storage_usage: 'GB',
    feedback_score: t('admin.analytics.units.score', 'Bewertung'),
    document_volume: t('admin.analytics.units.documents', 'Dokumente')
  };
  
  return units[metric] || '';
}

function getTrendIcon(trend: string): string {
  switch (trend) {
    case 'increasing':
      return 'fas fa-arrow-up';
    case 'decreasing':
      return 'fas fa-arrow-down';
    case 'stable':
      return 'fas fa-minus';
    default:
      return 'fas fa-minus';
  }
}

function getSeverityLevel(severity: number): string {
  if (severity > 0.7) return 'high';
  if (severity > 0.4) return 'medium';
  return 'low';
}

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatDateTime(timestamp: string): string {
  return new Date(timestamp).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Watch selected metric
watch(selectedMetric, (newMetric) => {
  if (newMetric) {
    fetchMetricData(newMetric);
  }
});

// Initialize
onMounted(() => {
  fetchDashboard();
  
  // Auto-refresh every 5 minutes
  const interval = setInterval(() => {
    fetchDashboard();
  }, 5 * 60 * 1000);
  
  // Cleanup
  onUnmounted(() => {
    clearInterval(interval);
    if (chartInstance) {
      chartInstance.destroy();
    }
  });
});
</script>

<style scoped>
.admin-predictive-analytics {
  padding: 1.5rem;
  max-width: 1600px;
  margin: 0 auto;
}

.analytics__title {
  font-size: 1.75rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  color: var(--n-color-text-primary);
}

/* Dashboard */
.analytics__dashboard {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Alerts Section */
.alerts-section {
  background: var(--n-color-background-alt);
  border-radius: var(--n-border-radius);
  padding: 1.5rem;
}

.alerts-section h3 {
  margin: 0 0 1rem;
  font-size: 1.25rem;
  color: var(--n-color-text-primary);
}

.alerts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1rem;
}

.alert-card {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: rgba(var(--n-color-error-rgb), 0.1);
  border: 1px solid rgba(var(--n-color-error-rgb), 0.3);
  border-radius: var(--n-border-radius);
}

.alert-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: var(--n-color-error);
  color: white;
  border-radius: 50%;
  flex-shrink: 0;
}

.alert-content h4 {
  margin: 0 0 0.5rem;
  font-size: 1rem;
  color: var(--n-color-text-primary);
}

.alert-content p {
  margin: 0 0 0.5rem;
  color: var(--n-color-text-secondary);
  font-size: 0.875rem;
}

.alert-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.75rem;
  color: var(--n-color-text-tertiary);
}

/* Metrics Grid */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
}

.metric-card {
  background: var(--n-color-background-alt);
  border-radius: var(--n-border-radius);
  padding: 1.25rem;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.metric-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.metric-card.has-anomalies {
  border-color: var(--n-color-warning);
}

.metric-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
}

.metric-header h3 {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--n-color-text-secondary);
}

.metric-trend {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  font-weight: 600;
}

.metric-trend.trend-increasing {
  color: var(--n-color-success);
}

.metric-trend.trend-decreasing {
  color: var(--n-color-error);
}

.metric-trend.trend-stable {
  color: var(--n-color-text-secondary);
}

.metric-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--n-color-text-primary);
  margin-bottom: 0.5rem;
}

.anomaly-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: var(--n-color-warning);
}

/* Anomalies Section */
.anomalies-section {
  background: var(--n-color-background-alt);
  border-radius: var(--n-border-radius);
  padding: 1.5rem;
}

.anomalies-section h3 {
  margin: 0 0 1rem;
  font-size: 1.25rem;
  color: var(--n-color-text-primary);
}

.anomalies-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.anomaly-item {
  padding: 1rem;
  border-radius: var(--n-border-radius);
  border-left: 4px solid;
}

.anomaly-item.severity-high {
  background: rgba(var(--n-color-error-rgb), 0.05);
  border-color: var(--n-color-error);
}

.anomaly-item.severity-medium {
  background: rgba(var(--n-color-warning-rgb), 0.05);
  border-color: var(--n-color-warning);
}

.anomaly-item.severity-low {
  background: rgba(var(--n-color-info-rgb), 0.05);
  border-color: var(--n-color-info);
}

.anomaly-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.anomaly-metric {
  font-weight: 600;
  color: var(--n-color-text-primary);
}

.anomaly-time {
  font-size: 0.875rem;
  color: var(--n-color-text-tertiary);
}

.anomaly-message {
  margin: 0 0 0.5rem;
  color: var(--n-color-text-secondary);
  font-size: 0.875rem;
}

.anomaly-severity {
  font-size: 0.75rem;
  color: var(--n-color-text-tertiary);
}

.severity-badge {
  font-weight: 600;
  color: var(--n-color-text-primary);
}

/* Detail View */
.analytics__detail {
  margin-top: 2rem;
  background: var(--n-color-background-alt);
  border-radius: var(--n-border-radius);
  padding: 1.5rem;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.detail-header h3 {
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

/* Time Range Selector */
.time-range-selector {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.range-button {
  padding: 0.5rem 1rem;
  border: 1px solid var(--n-color-border);
  background: var(--n-color-background);
  border-radius: var(--n-border-radius);
  cursor: pointer;
  transition: all 0.2s;
}

.range-button:hover {
  background: var(--n-color-hover);
}

.range-button.active {
  background: var(--n-color-primary);
  color: var(--n-color-on-primary);
  border-color: var(--n-color-primary);
}

/* Chart */
.chart-container {
  height: 400px;
  margin-bottom: 2rem;
}

/* Predictions Section */
.predictions-section {
  margin-bottom: 2rem;
}

.predictions-section h4 {
  margin: 0 0 1rem;
  font-size: 1.125rem;
  color: var(--n-color-text-primary);
}

.prediction-horizon {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.prediction-horizon label {
  color: var(--n-color-text-secondary);
}

.prediction-horizon select {
  padding: 0.5rem;
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
  background: var(--n-color-background);
}

.prediction-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.prediction-stat {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.prediction-stat label {
  font-size: 0.875rem;
  color: var(--n-color-text-secondary);
}

.prediction-stat span {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--n-color-text-primary);
}

/* Trend Section */
.trend-section {
  margin-bottom: 2rem;
}

.trend-section h4 {
  margin: 0 0 1rem;
  font-size: 1.125rem;
  color: var(--n-color-text-primary);
}

.trend-stats {
  display: flex;
  gap: 2rem;
}

.trend-stat {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.trend-stat label {
  color: var(--n-color-text-secondary);
}

.trend-stat span {
  font-weight: 600;
  color: var(--n-color-text-primary);
}

/* Recommendations Section */
.recommendations-section h4 {
  margin: 0 0 1rem;
  font-size: 1.125rem;
  color: var(--n-color-text-primary);
}

.recommendations-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.recommendations-list li {
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem;
  background: rgba(var(--n-color-info-rgb), 0.1);
  border-radius: var(--n-border-radius);
  margin-bottom: 0.5rem;
  color: var(--n-color-text-secondary);
}

.recommendations-list i {
  color: var(--n-color-info);
  flex-shrink: 0;
  margin-top: 0.125rem;
}

/* Responsive */
@media (max-width: 768px) {
  .metrics-grid {
    grid-template-columns: 1fr;
  }

  .alerts-grid {
    grid-template-columns: 1fr;
  }

  .time-range-selector {
    flex-wrap: wrap;
  }

  .trend-stats {
    flex-direction: column;
    gap: 0.5rem;
  }
}
</style>