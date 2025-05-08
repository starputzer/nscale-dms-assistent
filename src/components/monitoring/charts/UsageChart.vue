<template>
  <div class="usage-chart">
    <div v-if="loading" class="chart-loading">
      <div class="loading-spinner"></div>
      <span>{{ t('monitoring.charts.loading', 'Lade Daten...') }}</span>
    </div>
    <div v-else-if="error" class="chart-error">
      <div class="error-icon">!</div>
      <span>{{ t('monitoring.charts.error', 'Fehler beim Laden der Daten') }}</span>
    </div>
    <div v-else class="chart-container" ref="chartContainer">
      <canvas ref="chartCanvas"></canvas>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMonitoringStore } from '../../../stores/monitoringStore';
import { useFeatureTogglesStore } from '../../../stores/featureToggles';

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor: string | string[];
    borderColor?: string;
    borderWidth?: number;
  }[];
}

// Load required libraries dynamically to reduce initial bundle size
let Chart: any = null;

const props = defineProps<{
  timeRange: 'hour' | 'day' | 'week' | 'month';
  chartType: 'line' | 'bar' | 'pie';
  featureId?: string;
}>();

const { t } = useI18n();
const monitoringStore = useMonitoringStore();
const featureStore = useFeatureTogglesStore();

const chartContainer = ref<HTMLElement | null>(null);
const chartCanvas = ref<HTMLCanvasElement | null>(null);
const chartInstance = ref<any | null>(null);
const loading = ref(true);
const error = ref(false);

// Calculate time ranges
const timeRanges = computed(() => {
  const now = Date.now();
  
  switch (props.timeRange) {
    case 'hour':
      return {
        start: now - 60 * 60 * 1000, // 1 hour ago
        intervals: 12, // 5-minute intervals
        intervalSize: 5 * 60 * 1000, // 5 minutes in ms
        format: 'HH:mm'
      };
    case 'day':
      return {
        start: now - 24 * 60 * 60 * 1000, // 24 hours ago
        intervals: 24, // 1-hour intervals
        intervalSize: 60 * 60 * 1000, // 1 hour in ms
        format: 'HH:mm'
      };
    case 'week':
      return {
        start: now - 7 * 24 * 60 * 60 * 1000, // 7 days ago
        intervals: 7, // 1-day intervals
        intervalSize: 24 * 60 * 60 * 1000, // 1 day in ms
        format: 'ddd'
      };
    case 'month':
      return {
        start: now - 30 * 24 * 60 * 60 * 1000, // 30 days ago
        intervals: 30, // 1-day intervals
        intervalSize: 24 * 60 * 60 * 1000, // 1 day in ms
        format: 'DD.MM'
      };
    default:
      return {
        start: now - 24 * 60 * 60 * 1000, // Default to 24 hours
        intervals: 24,
        intervalSize: 60 * 60 * 1000,
        format: 'HH:mm'
      };
  }
});

function formatDate(timestamp: number, format: string): string {
  const date = new Date(timestamp);
  
  // Simple date formatting
  if (format === 'HH:mm') {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  } else if (format === 'ddd') {
    const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    return days[date.getDay()];
  } else if (format === 'DD.MM') {
    return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}`;
  }
  
  return date.toLocaleString();
}

// Prepare chart data for time series (line/bar)
function prepareTimeSeriesData(): ChartData {
  const { start, intervals, intervalSize, format } = timeRanges.value;
  const end = Date.now();
  
  // Generate time intervals
  const timeIntervals = [];
  const labels = [];
  
  for (let i = 0; i < intervals; i++) {
    const intervalEnd = end - (intervals - i - 1) * intervalSize;
    const intervalStart = intervalEnd - intervalSize;
    
    timeIntervals.push({
      start: intervalStart,
      end: intervalEnd
    });
    
    labels.push(formatDate(intervalStart, format));
  }
  
  // Get the data for each interval
  const datasets = [];
  const features = props.featureId 
    ? [featureStore.features.find(f => f.id === props.featureId)].filter(Boolean)
    : featureStore.features.filter(f => f.enabled);
  
  // Color palette for features
  const colors = [
    { bg: 'rgba(54, 162, 235, 0.2)', border: 'rgba(54, 162, 235, 1)' },
    { bg: 'rgba(255, 99, 132, 0.2)', border: 'rgba(255, 99, 132, 1)' },
    { bg: 'rgba(75, 192, 192, 0.2)', border: 'rgba(75, 192, 192, 1)' },
    { bg: 'rgba(255, 206, 86, 0.2)', border: 'rgba(255, 206, 86, 1)' },
    { bg: 'rgba(153, 102, 255, 0.2)', border: 'rgba(153, 102, 255, 1)' },
    { bg: 'rgba(255, 159, 64, 0.2)', border: 'rgba(255, 159, 64, 1)' }
  ];
  
  features.forEach((feature, index) => {
    if (!feature) return;
    
    const featureId = feature.id;
    const colorIndex = index % colors.length;
    
    // For each interval, count usage events
    const usageCounts = timeIntervals.map(interval => {
      // Get usage in this interval
      return monitoringStore.getUsageByTimeRange(
        interval.start,
        interval.end
      ).filter(u => u.featureId === featureId).length;
    });
    
    datasets.push({
      label: feature.name || featureId,
      data: usageCounts,
      backgroundColor: colors[colorIndex].bg,
      borderColor: colors[colorIndex].border,
      borderWidth: 1
    });
  });
  
  return {
    labels,
    datasets
  };
}

// Prepare chart data for pie/doughnut
function preparePieData(): ChartData {
  const { start } = timeRanges.value;
  const end = Date.now();
  
  // Get all features
  const features = featureStore.features.filter(f => f.enabled);
  
  // Count usage for each feature
  const featureUsage = features.map(feature => {
    return {
      featureId: feature.id,
      name: feature.name || feature.id,
      count: monitoringStore.getUsageByTimeRange(start, end)
        .filter(u => u.featureId === feature.id).length
    };
  });
  
  // Sort by usage count (highest first)
  featureUsage.sort((a, b) => b.count - a.count);
  
  // Color palette for pie chart
  const backgroundColors = [
    'rgba(54, 162, 235, 0.7)',
    'rgba(255, 99, 132, 0.7)',
    'rgba(75, 192, 192, 0.7)',
    'rgba(255, 206, 86, 0.7)',
    'rgba(153, 102, 255, 0.7)',
    'rgba(255, 159, 64, 0.7)',
    'rgba(201, 203, 207, 0.7)',
    'rgba(255, 99, 71, 0.7)',
    'rgba(46, 204, 113, 0.7)',
    'rgba(52, 152, 219, 0.7)'
  ];
  
  return {
    labels: featureUsage.map(f => f.name),
    datasets: [{
      label: t('monitoring.usage.featureUsage', 'Feature-Nutzung'),
      data: featureUsage.map(f => f.count),
      backgroundColor: backgroundColors.slice(0, featureUsage.length)
    }]
  };
}

async function loadChart() {
  if (!chartCanvas.value) return;
  
  loading.value = true;
  error.value = false;
  
  try {
    // Dynamically load Chart.js if not already loaded
    if (!Chart) {
      try {
        // This is a mock import since we don't have actual access to Chart.js in this environment
        // In a real project, you would use: import('chart.js')
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
      } catch (e) {
        console.error('Failed to load Chart.js:', e);
        error.value = true;
        loading.value = false;
        return;
      }
    }
    
    // Prepare chart data based on chart type
    const chartData = props.chartType === 'pie' 
      ? preparePieData() 
      : prepareTimeSeriesData();
    
    // Destroy existing chart if it exists
    if (chartInstance.value) {
      chartInstance.value.destroy();
    }
    
    // Create new chart
    const ctx = chartCanvas.value.getContext('2d');
    if (!ctx) {
      error.value = true;
      loading.value = false;
      return;
    }
    
    const commonOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: t('monitoring.charts.usageTitle', 'Feature-Nutzungsstatistik'),
          font: {
            size: 16
          }
        },
        legend: {
          position: 'bottom'
        }
      }
    };
    
    const chartConfig = {
      type: props.chartType,
      data: chartData,
      options: commonOptions
    };
    
    // Add specific options for line/bar charts
    if (props.chartType !== 'pie') {
      chartConfig.options = {
        ...commonOptions,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: t('monitoring.usage.count', 'Anzahl der Nutzungen'),
            }
          },
          x: {
            title: {
              display: true,
              text: t('monitoring.charts.timeRange', 'Zeitraum'),
            }
          }
        }
      };
    }
    
    chartInstance.value = new Chart.Chart(ctx, chartConfig);
    
    loading.value = false;
  } catch (e) {
    console.error('Error creating chart:', e);
    error.value = true;
    loading.value = false;
  }
}

// Initialize chart
onMounted(async () => {
  await loadChart();
  
  // Add resize handler
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  // Clean up
  if (chartInstance.value) {
    chartInstance.value.destroy();
  }
  
  window.removeEventListener('resize', handleResize);
});

// Handle resize
function handleResize() {
  if (chartInstance.value) {
    chartInstance.value.update();
  }
}

// Watch for prop changes to reload chart
watch(() => [props.timeRange, props.chartType, props.featureId], async () => {
  await loadChart();
});

// Check for store updates to refresh chart
watch(() => monitoringStore.usageStats.length, async () => {
  if (!loading.value) {
    await loadChart();
  }
});
</script>

<style scoped>
.usage-chart {
  width: 100%;
  height: 300px;
  position: relative;
}

.chart-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.chart-loading,
.chart-error {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.7);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top-color: #3498db;
  animation: spin 1s ease-in-out infinite;
  margin-bottom: 10px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background-color: #e74c3c;
  border-radius: 50%;
  color: white;
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 10px;
}
</style>