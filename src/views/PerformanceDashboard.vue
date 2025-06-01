<template>
  <div class="performance-dashboard">
    <h1>{{ t('performance.title') }}</h1>
    
    <div class="metrics-grid">
      <!-- Baseline Metrics -->
      <div class="metric-card">
        <h3>{{ t('performance.baseline.title') }}</h3>
        <div class="metric-list">
          <div class="metric-item">
            <span class="metric-label">{{ t('performance.initialLoad') }}</span>
            <span class="metric-value">{{ formatDuration(baseline.initialLoad) }}</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">{{ t('performance.timeToInteractive') }}</span>
            <span class="metric-value">{{ formatDuration(baseline.timeToInteractive) }}</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">{{ t('performance.memoryUsage') }}</span>
            <span class="metric-value">{{ formatMemory(baseline.memoryUsage) }}</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">{{ t('performance.apiResponseTime') }}</span>
            <span class="metric-value">{{ formatDuration(baseline.apiResponseTime) }}</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">{{ t('performance.renderTime') }}</span>
            <span class="metric-value">{{ formatDuration(baseline.renderTime) }}</span>
          </div>
        </div>
      </div>

      <!-- Real-time Metrics -->
      <div class="metric-card">
        <h3>{{ t('performance.realtime.title') }}</h3>
        <div class="metric-list">
          <div class="metric-item">
            <span class="metric-label">{{ t('performance.currentMemory') }}</span>
            <span class="metric-value">{{ formatMemory(currentMemory) }}</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">{{ t('performance.fps') }}</span>
            <span class="metric-value">{{ fps }} FPS</span>
          </div>
        </div>
        <button @click="refreshMetrics" class="refresh-button">
          {{ t('common.refresh') }}
        </button>
      </div>

      <!-- Performance Score -->
      <div class="metric-card score-card">
        <h3>{{ t('performance.score.title') }}</h3>
        <div class="score-display" :class="scoreClass">
          {{ performanceScore }}
        </div>
        <div class="score-label">{{ scoreLabel }}</div>
      </div>
    </div>

    <!-- Recommendations -->
    <div class="recommendations" v-if="recommendations.length > 0">
      <h2>{{ t('performance.recommendations.title') }}</h2>
      <ul>
        <li v-for="(rec, index) in recommendations" :key="index">
          {{ rec }}
        </li>
      </ul>
    </div>

    <!-- Export Button -->
    <div class="actions">
      <button @click="exportMetrics" class="export-button">
        {{ t('performance.export') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { getPerformanceBaseline, telemetryService } from '@/services/telemetry';
import { usePerformanceMonitoring } from '@/composables/usePerformanceMonitoring';

const { t } = useI18n();

// Track this component's performance
const { getMetrics } = usePerformanceMonitoring({
  componentName: 'PerformanceDashboard',
  trackMemory: true
});

const baseline = ref(getPerformanceBaseline());
const currentMemory = ref(0);
const fps = ref(60);

const performanceScore = computed(() => {
  // Calculate score based on baseline metrics
  let score = 100;
  
  // Deduct points for slow metrics
  if (baseline.value.initialLoad > 3000) score -= 20;
  else if (baseline.value.initialLoad > 2000) score -= 10;
  
  if (baseline.value.timeToInteractive > 5000) score -= 20;
  else if (baseline.value.timeToInteractive > 3000) score -= 10;
  
  if (baseline.value.apiResponseTime > 500) score -= 15;
  else if (baseline.value.apiResponseTime > 300) score -= 5;
  
  if (baseline.value.memoryUsage > 100) score -= 10;
  else if (baseline.value.memoryUsage > 50) score -= 5;
  
  return Math.max(0, score);
});

const scoreClass = computed(() => {
  if (performanceScore.value >= 90) return 'excellent';
  if (performanceScore.value >= 70) return 'good';
  if (performanceScore.value >= 50) return 'average';
  return 'poor';
});

const scoreLabel = computed(() => {
  if (performanceScore.value >= 90) return t('performance.score.excellent');
  if (performanceScore.value >= 70) return t('performance.score.good');
  if (performanceScore.value >= 50) return t('performance.score.average');
  return t('performance.score.poor');
});

const recommendations = computed(() => {
  const recs: string[] = [];
  
  if (baseline.value.initialLoad > 3000) {
    recs.push(t('performance.recommendations.slowInitialLoad'));
  }
  
  if (baseline.value.memoryUsage > 100) {
    recs.push(t('performance.recommendations.highMemory'));
  }
  
  if (baseline.value.apiResponseTime > 500) {
    recs.push(t('performance.recommendations.slowApi'));
  }
  
  return recs;
});

// Format helpers
function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatMemory(mb: number): string {
  return `${mb.toFixed(1)} MB`;
}

// Update real-time metrics
let animationId: number;
let lastTime = performance.now();
let frames = 0;

function updateMetrics() {
  const currentTime = performance.now();
  const delta = currentTime - lastTime;
  
  frames++;
  
  if (delta >= 1000) {
    fps.value = Math.round((frames * 1000) / delta);
    frames = 0;
    lastTime = currentTime;
  }
  
  // Update memory if available
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    currentMemory.value = memory.usedJSHeapSize / 1048576;
  }
  
  animationId = requestAnimationFrame(updateMetrics);
}

function refreshMetrics() {
  baseline.value = getPerformanceBaseline();
}

function exportMetrics() {
  const metrics = {
    baseline: baseline.value,
    currentMemory: currentMemory.value,
    fps: fps.value,
    score: performanceScore.value,
    timestamp: new Date().toISOString(),
    exportedMetrics: telemetryService.exportMetrics()
  };
  
  // Create and download JSON file
  const blob = new Blob([JSON.stringify(metrics, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `performance-metrics-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

onMounted(() => {
  updateMetrics();
});

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId);
  }
});
</script>

<style scoped>
.performance-dashboard {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

h1 {
  margin-bottom: 30px;
  color: var(--color-heading);
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.metric-card {
  background: var(--color-background-soft);
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.metric-card h3 {
  margin-bottom: 15px;
  color: var(--color-heading);
}

.metric-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.metric-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.metric-label {
  color: var(--color-text-secondary);
}

.metric-value {
  font-weight: bold;
  color: var(--color-text);
}

.score-card {
  text-align: center;
}

.score-display {
  font-size: 48px;
  font-weight: bold;
  margin: 20px 0;
}

.score-display.excellent {
  color: #4caf50;
}

.score-display.good {
  color: #8bc34a;
}

.score-display.average {
  color: #ff9800;
}

.score-display.poor {
  color: #f44336;
}

.score-label {
  font-size: 18px;
  color: var(--color-text-secondary);
}

.refresh-button,
.export-button {
  background-color: var(--vt-c-green);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s;
}

.refresh-button:hover,
.export-button:hover {
  background-color: var(--vt-c-green-dark);
}

.refresh-button {
  margin-top: 15px;
  width: 100%;
}

.recommendations {
  background: var(--color-background-soft);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.recommendations h2 {
  margin-bottom: 15px;
  color: var(--color-heading);
}

.recommendations ul {
  list-style-type: disc;
  padding-left: 20px;
}

.recommendations li {
  margin-bottom: 10px;
  color: var(--color-text);
}

.actions {
  text-align: center;
}
</style>