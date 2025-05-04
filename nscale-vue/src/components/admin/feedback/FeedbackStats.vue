<template>
  <div class="feedback-stats">
    <div class="stats-header">
      <h2 class="stats-title">{{ title }}</h2>
      <div class="date-range">
        <span>{{ dateRangeText }}</span>
        <button class="refresh-btn" @click="$emit('refresh')">
          <i class="fas fa-sync-alt"></i> Aktualisieren
        </button>
      </div>
    </div>
    
    <div class="stats-grid">
      <!-- Total Feedback Count -->
      <div class="stat-card positive">
        <div class="stat-icon">
          <i class="fas fa-comment-dots"></i>
        </div>
        <div class="stat-data">
          <div class="stat-value">{{ totalCount }}</div>
          <div class="stat-label">Gesamt</div>
        </div>
      </div>
      
      <!-- Positive Feedback Count -->
      <div class="stat-card positive">
        <div class="stat-icon">
          <i class="fas fa-thumbs-up"></i>
        </div>
        <div class="stat-data">
          <div class="stat-value">{{ positiveCount }}</div>
          <div class="stat-label">Positiv</div>
        </div>
      </div>
      
      <!-- Negative Feedback Count -->
      <div class="stat-card negative">
        <div class="stat-icon">
          <i class="fas fa-thumbs-down"></i>
        </div>
        <div class="stat-data">
          <div class="stat-value">{{ negativeCount }}</div>
          <div class="stat-label">Negativ</div>
        </div>
      </div>
      
      <!-- Feedback Rate (Positive/Total Percentage) -->
      <div class="stat-card" :class="feedbackRateClass">
        <div class="stat-icon">
          <i class="fas fa-chart-pie"></i>
        </div>
        <div class="stat-data">
          <div class="stat-value">{{ positivePercentage }}%</div>
          <div class="stat-label">Positive Rate</div>
        </div>
      </div>
    </div>
    
    <!-- Feedback over time chart -->
    <div class="chart-container" v-if="showChart">
      <h3 class="chart-title">Feedback-Trend über Zeit</h3>
      <div class="chart" ref="chartContainer"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';

// Props
const props = defineProps({
  stats: {
    type: Object,
    required: true
  },
  dateRange: {
    type: String,
    default: 'last7days'
  },
  title: {
    type: String,
    default: 'Feedback-Statistiken'
  },
  showChart: {
    type: Boolean,
    default: true
  }
});

// Emits
const emit = defineEmits(['refresh']);

// Refs
const chartContainer = ref(null);

// Computed
const totalCount = computed(() => {
  return props.stats.positive_count + props.stats.negative_count || 0;
});

const positiveCount = computed(() => {
  return props.stats.positive_count || 0;
});

const negativeCount = computed(() => {
  return props.stats.negative_count || 0;
});

const positivePercentage = computed(() => {
  if (totalCount.value === 0) return 0;
  return Math.round((positiveCount.value / totalCount.value) * 100);
});

const feedbackRateClass = computed(() => {
  if (positivePercentage.value >= 75) return 'positive';
  if (positivePercentage.value >= 60) return 'neutral';
  return 'negative';
});

const dateRangeText = computed(() => {
  switch (props.dateRange) {
    case 'today':
      return 'Heute';
    case 'yesterday':
      return 'Gestern';
    case 'last7days':
      return 'Letzte 7 Tage';
    case 'last30days':
      return 'Letzte 30 Tage';
    case 'thisMonth':
      return 'Dieser Monat';
    case 'lastMonth':
      return 'Letzter Monat';
    case 'thisYear':
      return 'Dieses Jahr';
    default:
      return 'Alle Zeiten';
  }
});

// Chart rendering function
const renderChart = () => {
  if (!chartContainer.value || !props.stats.timeline || !props.showChart) return;
  
  // Here you would typically use a charting library like Chart.js or D3.js
  // For simplicity, we'll create a basic visualization with DOM elements
  
  const container = chartContainer.value;
  container.innerHTML = '';
  
  // Create a simple bar chart visualization
  const timeline = props.stats.timeline || [];
  if (timeline.length === 0) {
    container.innerHTML = '<div class="no-data">Keine Daten für die Visualisierung verfügbar</div>';
    return;
  }
  
  // Create chart structure
  const chartEl = document.createElement('div');
  chartEl.className = 'simple-chart';
  
  // Create bars for each day
  timeline.forEach(day => {
    const barContainer = document.createElement('div');
    barContainer.className = 'bar-container';
    
    // Create positive bar
    const positiveBar = document.createElement('div');
    positiveBar.className = 'bar positive';
    positiveBar.style.height = `${day.positive_count * 10}px`;
    positiveBar.title = `${day.date}: ${day.positive_count} positive`;
    
    // Create negative bar
    const negativeBar = document.createElement('div');
    negativeBar.className = 'bar negative';
    negativeBar.style.height = `${day.negative_count * 10}px`;
    negativeBar.title = `${day.date}: ${day.negative_count} negative`;
    
    // Create date label
    const dateLabel = document.createElement('div');
    dateLabel.className = 'date-label';
    dateLabel.textContent = day.date.split('-')[2]; // Just the day
    
    // Assemble bar
    barContainer.appendChild(positiveBar);
    barContainer.appendChild(negativeBar);
    barContainer.appendChild(dateLabel);
    
    // Add to chart
    chartEl.appendChild(barContainer);
  });
  
  // Add the chart to the container
  container.appendChild(chartEl);
};

// Watchers
watch(() => props.stats, () => {
  renderChart();
}, { deep: true });

// Lifecycle hooks
onMounted(() => {
  renderChart();
});
</script>

<style scoped>
.feedback-stats {
  background-color: #ffffff;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.stats-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.stats-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.date-range {
  display: flex;
  align-items: center;
  gap: 1rem;
  color: #64748b;
  font-size: 0.9rem;
}

.refresh-btn {
  background-color: #f1f5f9;
  border: none;
  padding: 0.4rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.85rem;
  color: #475569;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.refresh-btn:hover {
  background-color: #e2e8f0;
  color: #334155;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-card {
  background-color: #f8fafc;
  border-radius: 0.5rem;
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.stat-card.positive {
  background-color: #f0fdf4;
  border-left: 4px solid #22c55e;
}

.stat-card.neutral {
  background-color: #f8fafc;
  border-left: 4px solid #3b82f6;
}

.stat-card.negative {
  background-color: #fef2f2;
  border-left: 4px solid #ef4444;
}

.stat-icon {
  background-color: rgba(255, 255, 255, 0.7);
  width: 3rem;
  height: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  border-radius: 50%;
  color: #64748b;
}

.stat-card.positive .stat-icon {
  color: #22c55e;
}

.stat-card.negative .stat-icon {
  color: #ef4444;
}

.stat-data {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: #1e293b;
  line-height: 1;
}

.stat-label {
  color: #64748b;
  font-size: 0.875rem;
  margin-top: 0.25rem;
}

.chart-container {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e2e8f0;
}

.chart-title {
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 1rem;
}

.chart {
  height: 200px;
  background-color: #f8fafc;
  border-radius: 0.375rem;
  padding: 1rem;
}

/* Simple chart styles */
.simple-chart {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  height: 100%;
  gap: 0.25rem;
  padding-bottom: 1.5rem;
}

.bar-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  position: relative;
  flex: 1;
}

.bar {
  width: 1rem;
  margin: 0 0.25rem;
  transition: height 0.3s ease;
}

.bar.positive {
  background-color: #22c55e;
  margin-bottom: 0.125rem;
}

.bar.negative {
  background-color: #ef4444;
}

.date-label {
  position: absolute;
  bottom: -1.5rem;
  font-size: 0.75rem;
  color: #64748b;
}

.no-data {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #94a3b8;
  font-style: italic;
}

/* Dark Mode Support */
:global(.theme-dark) .feedback-stats {
  background-color: #1e1e1e;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

:global(.theme-dark) .stats-title {
  color: #e0e0e0;
}

:global(.theme-dark) .date-range {
  color: #aaa;
}

:global(.theme-dark) .refresh-btn {
  background-color: #252525;
  color: #bbb;
}

:global(.theme-dark) .refresh-btn:hover {
  background-color: #333;
  color: #e0e0e0;
}

:global(.theme-dark) .stat-card {
  background-color: #252525;
}

:global(.theme-dark) .stat-card.positive {
  background-color: #133929;
  border-left-color: #22c55e;
}

:global(.theme-dark) .stat-card.neutral {
  background-color: #1a365d;
  border-left-color: #3b82f6;
}

:global(.theme-dark) .stat-card.negative {
  background-color: #4c1d24;
  border-left-color: #ef4444;
}

:global(.theme-dark) .stat-icon {
  background-color: rgba(255, 255, 255, 0.1);
  color: #aaa;
}

:global(.theme-dark) .stat-card.positive .stat-icon {
  color: #4ade80;
}

:global(.theme-dark) .stat-card.negative .stat-icon {
  color: #f87171;
}

:global(.theme-dark) .stat-value {
  color: #e0e0e0;
}

:global(.theme-dark) .stat-label {
  color: #aaa;
}

:global(.theme-dark) .chart-container {
  border-top-color: #333;
}

:global(.theme-dark) .chart-title {
  color: #e0e0e0;
}

:global(.theme-dark) .chart {
  background-color: #252525;
}

:global(.theme-dark) .bar.positive {
  background-color: #4ade80;
}

:global(.theme-dark) .bar.negative {
  background-color: #f87171;
}

:global(.theme-dark) .date-label {
  color: #aaa;
}

:global(.theme-dark) .no-data {
  color: #777;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .stats-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
  
  .chart {
    height: 150px;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>