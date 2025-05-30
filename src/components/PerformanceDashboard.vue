<template>
  <Teleport to="body">
    <div
      v-if="isVisible && isDevelopment"
      class="performance-dashboard"
      :class="{ 'dashboard--minimized': isMinimized }"
    >
      <!-- Header -->
      <div class="dashboard__header" @click="toggleMinimize">
        <h3 class="dashboard__title">
          <span class="dashboard__icon">📊</span>
          Performance Monitor
        </h3>
        <div class="dashboard__controls">
          <button @click.stop="resetMetrics" class="dashboard__btn" title="Reset">
            🔄
          </button>
          <button @click.stop="toggleMinimize" class="dashboard__btn" title="Minimize">
            {{ isMinimized ? '🔼' : '🔽' }}
          </button>
          <button @click.stop="close" class="dashboard__btn" title="Close">
            ✕
          </button>
        </div>
      </div>

      <!-- Content -->
      <div v-show="!isMinimized" class="dashboard__content">
        <!-- Main Metrics -->
        <div class="metrics-grid">
          <div class="metric-card" :class="getFpsClass(metrics.fps)">
            <div class="metric-value">{{ metrics.fps }}</div>
            <div class="metric-label">FPS</div>
            <div class="metric-bar">
              <div 
                class="metric-bar__fill" 
                :style="{ width: `${(metrics.fps / 60) * 100}%` }"
              />
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-value">{{ metrics.frameTime.toFixed(1) }}ms</div>
            <div class="metric-label">Frame Time</div>
            <div class="metric-bar">
              <div 
                class="metric-bar__fill" 
                :style="{ width: `${Math.min((16.67 / metrics.frameTime) * 100, 100)}%` }"
              />
            </div>
          </div>

          <div class="metric-card" :class="getMemoryClass(memoryPercentage)">
            <div class="metric-value">{{ metrics.memoryUsed.toFixed(1) }}MB</div>
            <div class="metric-label">Memory ({{ memoryPercentage }}%)</div>
            <div class="metric-bar">
              <div 
                class="metric-bar__fill" 
                :style="{ width: `${memoryPercentage}%` }"
              />
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-value">{{ metrics.renderCount }}</div>
            <div class="metric-label">Renders</div>
          </div>
        </div>

        <!-- Component Performance -->
        <div v-if="componentPerformance.length > 0" class="component-section">
          <h4 class="section-title">Slowest Components</h4>
          <div class="component-list">
            <div
              v-for="comp in componentPerformance.slice(0, 5)"
              :key="comp.name"
              class="component-item"
            >
              <span class="component-name">{{ comp.name }}</span>
              <span class="component-time">{{ comp.averageRenderTime.toFixed(2) }}ms</span>
              <span class="component-count">({{ comp.renderCount }}x)</span>
            </div>
          </div>
        </div>

        <!-- API Performance -->
        <div v-if="Object.keys(apiPerformance).length > 0" class="api-section">
          <h4 class="section-title">API Performance</h4>
          <div class="api-list">
            <div
              v-for="(perf, endpoint) in apiPerformance"
              :key="endpoint"
              class="api-item"
            >
              <span class="api-endpoint">{{ formatEndpoint(endpoint) }}</span>
              <span class="api-metrics">
                <span class="api-avg">{{ perf.avg.toFixed(0) }}ms</span>
                <span class="api-p90">p90: {{ perf.p90.toFixed(0) }}ms</span>
                <span class="api-count">({{ perf.count }})</span>
              </span>
            </div>
          </div>
        </div>

        <!-- Feature Usage -->
        <div v-if="Object.keys(featureUsage).length > 0" class="feature-section">
          <h4 class="section-title">Feature Usage</h4>
          <div class="feature-list">
            <div
              v-for="(count, feature) in sortedFeatureUsage"
              :key="feature"
              class="feature-item"
            >
              <span class="feature-name">{{ feature }}</span>
              <span class="feature-count">{{ count }}</span>
            </div>
          </div>
        </div>

        <!-- Health Status -->
        <div class="health-section">
          <div class="health-status" :class="isHealthy ? 'health--good' : 'health--bad'">
            <span class="health-icon">{{ isHealthy ? '✅' : '⚠️' }}</span>
            <span class="health-text">{{ isHealthy ? 'Healthy' : 'Performance Issues Detected' }}</span>
          </div>
          
          <div v-if="!isHealthy" class="health-issues">
            <div v-if="metrics.fps < 30" class="issue-item">
              Low FPS: {{ metrics.fps }} (target: 30+)
            </div>
            <div v-if="metrics.frameTime > 33" class="issue-item">
              High frame time: {{ metrics.frameTime.toFixed(1) }}ms (target: <33ms)
            </div>
            <div v-if="memoryPercentage > 90" class="issue-item">
              High memory usage: {{ memoryPercentage }}% (target: <90%)
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="actions-section">
          <button @click="exportMetrics" class="action-btn">
            📥 Export Metrics
          </button>
          <button @click="calculateBaseline" class="action-btn">
            📈 Calculate Baseline
          </button>
          <button @click="shareReport" class="action-btn">
            📤 Share Report
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { usePerformanceMonitor } from '@/utils/PerformanceMonitor';
import { useTelemetry } from '@/services/TelemetryService';

const props = withDefaults(defineProps<{
  visible?: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}>(), {
  visible: true,
  position: 'bottom-right'
});

const emit = defineEmits<{
  'update:visible': [value: boolean];
}>();

// State
const isMinimized = ref(false);
const isDevelopment = import.meta.env.DEV;

// Performance monitoring
const { metrics, componentPerformance, isHealthy, reset } = usePerformanceMonitor();
const telemetry = useTelemetry();

// Telemetry data
const apiPerformance = ref<Record<string, { avg: number; p90: number; count: number }>>({});
const featureUsage = ref<Record<string, number>>({});

// Computed
const isVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
});

const memoryPercentage = computed(() => {
  if (metrics.value.memoryLimit === 0) return 0;
  return Math.round((metrics.value.memoryUsed / metrics.value.memoryLimit) * 100);
});

const sortedFeatureUsage = computed(() => {
  return Object.entries(featureUsage.value)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
});

// Methods
function getFpsClass(fps: number): string {
  if (fps >= 55) return 'metric--good';
  if (fps >= 30) return 'metric--warning';
  return 'metric--bad';
}

function getMemoryClass(percentage: number): string {
  if (percentage <= 70) return 'metric--good';
  if (percentage <= 90) return 'metric--warning';
  return 'metric--bad';
}

function formatEndpoint(endpoint: string): string {
  // Remove base URL and query params
  const path = endpoint.replace(/^https?:\/\/[^\/]+/, '').split('?')[0];
  // Truncate long paths
  return path.length > 30 ? '...' + path.slice(-27) : path;
}

function toggleMinimize(): void {
  isMinimized.value = !isMinimized.value;
}

function close(): void {
  isVisible.value = false;
}

function resetMetrics(): void {
  reset();
  apiPerformance.value = {};
  featureUsage.value = {};
}

function exportMetrics(): void {
  const report = {
    timestamp: new Date().toISOString(),
    performance: metrics.value,
    components: componentPerformance.value,
    api: apiPerformance.value,
    features: featureUsage.value,
    baseline: telemetry.calculateBaseline()
  };

  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `performance-report-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function calculateBaseline(): void {
  const baseline = telemetry.calculateBaseline();
  console.log('Performance Baseline:', baseline);
  
  // Show baseline in a nice format
  alert(`Performance Baseline Calculated:\n\n` +
    `FPS: p50=${baseline.fps.p50}, p90=${baseline.fps.p90}\n` +
    `API Latency: p50=${baseline.apiLatency.p50}ms, p90=${baseline.apiLatency.p90}ms\n` +
    `Initial Load: ${baseline.initialLoadTime}ms`
  );
}

function shareReport(): void {
  const report = {
    fps: metrics.value.fps,
    memory: `${metrics.value.memoryUsed.toFixed(1)}MB (${memoryPercentage.value}%)`,
    renders: metrics.value.renderCount,
    healthy: isHealthy.value
  };

  const text = `Performance Report:\nFPS: ${report.fps}\nMemory: ${report.memory}\nRenders: ${report.renders}\nStatus: ${report.healthy ? '✅ Healthy' : '⚠️ Issues'}`;
  
  if (navigator.share) {
    navigator.share({
      title: 'nscale Performance Report',
      text
    });
  } else {
    navigator.clipboard.writeText(text);
    alert('Report copied to clipboard!');
  }
}

// Update telemetry data periodically
let updateInterval: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  updateInterval = setInterval(() => {
    apiPerformance.value = telemetry.getApiPerformanceReport();
    featureUsage.value = telemetry.getFeatureUsageReport();
  }, 5000); // Update every 5 seconds
});

onUnmounted(() => {
  if (updateInterval) {
    clearInterval(updateInterval);
  }
});

// Save minimized state
watch(isMinimized, (value) => {
  localStorage.setItem('performance-dashboard-minimized', String(value));
});

// Restore minimized state
onMounted(() => {
  const saved = localStorage.getItem('performance-dashboard-minimized');
  if (saved === 'true') {
    isMinimized.value = true;
  }
});
</script>

<style scoped lang="scss">
.performance-dashboard {
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  width: 420px;
  background: rgba(17, 24, 39, 0.95);
  backdrop-filter: blur(10px);
  color: white;
  border-radius: 0.75rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
  font-size: 0.875rem;
  z-index: 9999;
  transition: all 0.3s ease;

  &.dashboard--minimized {
    width: auto;
  }
}

.dashboard__header {
  padding: 0.75rem 1rem;
  background: rgba(31, 41, 55, 0.5);
  border-bottom: 1px solid rgba(75, 85, 99, 0.3);
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  border-radius: 0.75rem 0.75rem 0 0;
}

.dashboard__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.dashboard__icon {
  font-size: 1.25rem;
}

.dashboard__controls {
  display: flex;
  gap: 0.5rem;
}

.dashboard__btn {
  background: transparent;
  border: none;
  color: white;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  transition: background 0.2s;

  &:hover {
    background: rgba(75, 85, 99, 0.5);
  }
}

.dashboard__content {
  padding: 1rem;
  max-height: 600px;
  overflow-y: auto;
}

// Metrics Grid
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.metric-card {
  background: rgba(31, 41, 55, 0.5);
  padding: 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid rgba(75, 85, 99, 0.3);

  &.metric--good {
    border-color: rgba(34, 197, 94, 0.5);
  }

  &.metric--warning {
    border-color: rgba(251, 191, 36, 0.5);
  }

  &.metric--bad {
    border-color: rgba(239, 68, 68, 0.5);
  }
}

.metric-value {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}

.metric-label {
  color: rgba(156, 163, 175, 0.9);
  font-size: 0.75rem;
  text-transform: uppercase;
}

.metric-bar {
  margin-top: 0.5rem;
  height: 4px;
  background: rgba(75, 85, 99, 0.5);
  border-radius: 2px;
  overflow: hidden;
}

.metric-bar__fill {
  height: 100%;
  background: linear-gradient(to right, #3b82f6, #8b5cf6);
  transition: width 0.3s ease;
}

// Sections
.section-title {
  font-size: 0.875rem;
  font-weight: 600;
  margin: 0 0 0.75rem 0;
  color: rgba(209, 213, 219, 0.9);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

// Component Performance
.component-section {
  margin-bottom: 1.5rem;
}

.component-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.component-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: rgba(31, 41, 55, 0.3);
  border-radius: 0.375rem;
}

.component-name {
  flex: 1;
  font-weight: 500;
}

.component-time {
  color: #fbbf24;
  margin-right: 0.5rem;
}

.component-count {
  color: rgba(156, 163, 175, 0.7);
  font-size: 0.75rem;
}

// API Performance
.api-section {
  margin-bottom: 1.5rem;
}

.api-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.api-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: rgba(31, 41, 55, 0.3);
  border-radius: 0.375rem;
  font-size: 0.75rem;
}

.api-endpoint {
  flex: 1;
  font-family: monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.api-metrics {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.api-avg {
  color: #60a5fa;
}

.api-p90 {
  color: #a78bfa;
}

.api-count {
  color: rgba(156, 163, 175, 0.7);
}

// Feature Usage
.feature-section {
  margin-bottom: 1.5rem;
}

.feature-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.feature-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: rgba(31, 41, 55, 0.3);
  border-radius: 0.375rem;
}

.feature-name {
  flex: 1;
}

.feature-count {
  color: #34d399;
  font-weight: 600;
}

// Health Status
.health-section {
  margin-bottom: 1.5rem;
}

.health-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border-radius: 0.5rem;
  font-weight: 500;

  &.health--good {
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.3);
    color: #34d399;
  }

  &.health--bad {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #f87171;
  }
}

.health-icon {
  font-size: 1.25rem;
}

.health-issues {
  margin-top: 0.75rem;
  padding: 0.75rem;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 0.375rem;
  font-size: 0.75rem;
}

.issue-item {
  color: #fca5a5;
  margin-bottom: 0.25rem;

  &:last-child {
    margin-bottom: 0;
  }
}

// Actions
.actions-section {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.action-btn {
  flex: 1;
  min-width: 120px;
  padding: 0.5rem 0.75rem;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  color: #60a5fa;
  border-radius: 0.375rem;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 500;
  transition: all 0.2s;

  &:hover {
    background: rgba(59, 130, 246, 0.2);
    border-color: rgba(59, 130, 246, 0.5);
  }
}

// Scrollbar
.dashboard__content::-webkit-scrollbar {
  width: 6px;
}

.dashboard__content::-webkit-scrollbar-track {
  background: rgba(31, 41, 55, 0.5);
  border-radius: 3px;
}

.dashboard__content::-webkit-scrollbar-thumb {
  background: rgba(75, 85, 99, 0.8);
  border-radius: 3px;

  &:hover {
    background: rgba(107, 114, 128, 0.8);
  }
}
</style>