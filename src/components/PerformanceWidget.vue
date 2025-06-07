<template>
  <div v-if="showWidget" class="performance-widget">
    <div class="performance-header" @click="expanded = !expanded">
      <span class="performance-icon">📊</span>
      <span class="performance-title">Performance</span>
      <span class="performance-value">{{ avgResponseTime }}ms</span>
    </div>

    <div v-if="expanded" class="performance-details">
      <div class="performance-metric">
        <span class="metric-label">Avg Response:</span>
        <span class="metric-value">{{ avgResponseTime }}ms</span>
      </div>
      <div class="performance-metric">
        <span class="metric-label">P95 Response:</span>
        <span class="metric-value">{{ p95ResponseTime }}ms</span>
      </div>
      <div class="performance-metric">
        <span class="metric-label">Error Rate:</span>
        <span class="metric-value" :class="{ error: errorRate > 5 }">
          {{ errorRate }}%
        </span>
      </div>
      <div class="performance-metric">
        <span class="metric-label">Throughput:</span>
        <span class="metric-value">{{ throughput }} req/s</span>
      </div>
      <div class="performance-metric">
        <span class="metric-label">FCP:</span>
        <span class="metric-value">{{ fcp }}ms</span>
      </div>
      <div class="performance-metric">
        <span class="metric-label">LCP:</span>
        <span class="metric-value">{{ lcp }}ms</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from "vue";
import { performanceMonitor } from "@/utils/performanceMonitor";

const showWidget = ref(process.env.NODE_ENV === "development");
const expanded = ref(false);
const metrics = ref<any[]>([]);
const updateInterval = ref<number>();

const avgResponseTime = computed(() => {
  const responseTimes = metrics.value
    .filter((m) => m.name.includes("response-time"))
    .map((m) => m.value);

  if (responseTimes.length === 0) return "0";

  const avg = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  return avg.toFixed(1);
});

const p95ResponseTime = computed(() => {
  const responseTimes = metrics.value
    .filter((m) => m.name.includes("response-time"))
    .map((m) => m.value)
    .sort((a, b) => a - b);

  if (responseTimes.length === 0) return "0";

  const p95Index = Math.floor(responseTimes.length * 0.95);
  return responseTimes[p95Index].toFixed(1);
});

const errorRate = computed(() => {
  const requests = metrics.value.filter(
    (m) => m.tags?.status === "success" || m.tags?.status === "error",
  );

  if (requests.length === 0) return "0.0";

  const errors = requests.filter((m) => m.tags?.status === "error").length;
<<<<<<< HEAD
  return (errors / requests.length) * 100).toFixed(1);
=======
  return ((errors / requests.length) * 100).toFixed(1);
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
});

const throughput = computed(() => {
  const requests = metrics.value.filter(
    (m) => m.tags?.status === "success" || m.tags?.status === "error",
  );

  if (requests.length === 0) return "0.0";

  // Calculate over last 10 seconds
  const now = Date.now();
  const recentRequests = requests.filter((m) => now - m.timestamp < 10000);
  return (recentRequests.length / 10).toFixed(1);
});

const fcp = computed(() => {
  const fcpMetric = metrics.value.find((m) => m.name === "web-vitals.fcp");
  return fcpMetric ? fcpMetric.value.toFixed(0) : "N/A";
});

const lcp = computed(() => {
  const lcpMetric = metrics.value.find((m) => m.name === "web-vitals.lcp");
  return lcpMetric ? lcpMetric.value.toFixed(0) : "N/A";
});

const updateMetrics = () => {
  metrics.value = performanceMonitor.getMetrics();
};

onMounted(() => {
  updateMetrics();
  updateInterval.value = window.setInterval(updateMetrics, 1000);
});

onUnmounted(() => {
  if (updateInterval.value) {
    clearInterval(updateInterval.value);
  }
});
</script>

<style scoped>
.performance-widget {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: var(--bg-secondary, #f5f5f5);
  border: 1px solid var(--border-color, #ddd);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 9999;
  font-size: 12px;
  font-family: monospace;
  min-width: 180px;
}

.performance-header {
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid var(--border-color, #ddd);
}

.performance-header:hover {
  background: var(--bg-hover, #e8e8e8);
}

.performance-icon {
  font-size: 16px;
}

.performance-title {
  flex: 1;
  font-weight: bold;
}

.performance-value {
  color: var(--text-secondary, #666);
}

.performance-details {
  padding: 8px 12px;
}

.performance-metric {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
}

.metric-label {
  color: var(--text-secondary, #666);
}

.metric-value {
  font-weight: bold;
  color: var(--text-primary, #333);
}

.metric-value.error {
  color: var(--color-error, #d9534f);
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .performance-widget {
    background: #2d2d2d;
    border-color: #444;
  }

  .performance-header {
    border-bottom-color: #444;
  }

  .performance-header:hover {
    background: #3d3d3d;
  }

  .metric-label {
    color: #aaa;
  }

  .metric-value {
    color: #fff;
  }
}
</style>
