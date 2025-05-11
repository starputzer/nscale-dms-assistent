<template>
  <div class="performance-metrics">
    <div class="metrics-header">
      <h3>{{ t("monitoring.performance.title", "Performance-Metriken") }}</h3>
      <div class="metrics-controls">
        <select v-model="groupBy" class="control-select">
          <option value="feature">
            {{
              t(
                "monitoring.performance.groupBy.feature",
                "Nach Feature gruppieren",
              )
            }}
          </option>
          <option value="component">
            {{
              t(
                "monitoring.performance.groupBy.component",
                "Nach Komponente gruppieren",
              )
            }}
          </option>
          <option value="device">
            {{
              t(
                "monitoring.performance.groupBy.device",
                "Nach Gerät gruppieren",
              )
            }}
          </option>
        </select>
        <select v-model="metricType" class="control-select">
          <option value="render">
            {{ t("monitoring.performance.metricType.render", "Renderzeiten") }}
          </option>
          <option value="load">
            {{ t("monitoring.performance.metricType.load", "Ladezeiten") }}
          </option>
          <option value="memory">
            {{
              t("monitoring.performance.metricType.memory", "Speichernutzung")
            }}
          </option>
          <option value="interaction">
            {{
              t(
                "monitoring.performance.metricType.interaction",
                "Interaktionslatenz",
              )
            }}
          </option>
        </select>
      </div>
    </div>

    <div class="metrics-grid">
      <div
        v-for="(group, groupName) in groupedMetrics"
        :key="groupName"
        class="metric-card"
      >
        <div class="metric-card-header">
          <h4>{{ formatGroupName(groupName) }}</h4>
          <div
            class="metric-card-badge"
            :class="getPerformanceClass(calculateAverageScore(group))"
          >
            {{ formatScore(calculateAverageScore(group)) }}
          </div>
        </div>

        <div class="metric-card-content">
          <div class="metric-visualization">
            <div class="bar-chart">
              <div
                v-for="(metric, index) in group"
                :key="index"
                class="bar-container"
              >
                <div class="bar-label">{{ getMetricLabel(metric) }}</div>
                <div class="bar-wrapper">
                  <div
                    class="bar"
                    :style="{
                      width: calculateBarWidth(metric),
                      backgroundColor: getBarColor(metric),
                    }"
                  ></div>
                  <span class="bar-value">{{ formatMetricValue(metric) }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="metric-details">
            <div class="metric-summary">
              <div class="summary-item">
                <span class="summary-label">{{
                  t("monitoring.performance.p50", "P50")
                }}</span>
                <span class="summary-value">{{
                  formatMetricValue(calculatePercentile(group, 50))
                }}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">{{
                  t("monitoring.performance.p90", "P90")
                }}</span>
                <span class="summary-value">{{
                  formatMetricValue(calculatePercentile(group, 90))
                }}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">{{
                  t("monitoring.performance.p95", "P95")
                }}</span>
                <span class="summary-value">{{
                  formatMetricValue(calculatePercentile(group, 95))
                }}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">{{
                  t("monitoring.performance.max", "Max")
                }}</span>
                <span class="summary-value">{{
                  formatMetricValue(calculateMax(group))
                }}</span>
              </div>
            </div>
            <button @click="toggleDetails(groupName)" class="details-button">
              {{
                detailsVisible[groupName]
                  ? t(
                      "monitoring.performance.hideDetails",
                      "Details ausblenden",
                    )
                  : t("monitoring.performance.showDetails", "Details anzeigen")
              }}
            </button>
          </div>

          <div
            v-if="detailsVisible[groupName]"
            class="metrics-details-expanded"
          >
            <table class="metrics-table">
              <thead>
                <tr>
                  <th>
                    {{ t("monitoring.performance.timestamp", "Zeitpunkt") }}
                  </th>
                  <th>{{ getColumnHeader() }}</th>
                  <th>{{ t("monitoring.performance.value", "Wert") }}</th>
                  <th>{{ t("monitoring.performance.status", "Status") }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(metric, index) in group" :key="index">
                  <td>{{ formatDate(metric.timestamp) }}</td>
                  <td>{{ getDetailValue(metric) }}</td>
                  <td>{{ formatMetricValue(metric) }}</td>
                  <td>
                    <span
                      class="status-indicator"
                      :class="
                        getPerformanceClass(
                          metric.score || calculateScore(metric),
                        )
                      "
                    ></span>
                    {{
                      getPerformanceLabel(
                        metric.score || calculateScore(metric),
                      )
                    }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <div v-if="Object.keys(groupedMetrics).length === 0" class="no-metrics">
      {{
        t(
          "monitoring.performance.noMetrics",
          "Keine Performance-Metriken verfügbar",
        )
      }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useI18n } from "@/composables/useI18n";

// Typen
interface Metric {
  id: string;
  timestamp: Date;
  feature: string;
  component?: string;
  device?: string;
  browser?: string;
  type: "render" | "load" | "memory" | "interaction";
  value: number;
  unit: string;
  score?: number;
  context?: Record<string, any>;
}

interface PerformanceMetricsProps {
  metrics: Metric[];
}

// Props
const props = defineProps<PerformanceMetricsProps>();

// Composables
const { t } = useI18n();

// State
const groupBy = ref<"feature" | "component" | "device">("feature");
const metricType = ref<"render" | "load" | "memory" | "interaction">("render");
const detailsVisible = ref<Record<string, boolean>>({});

// Berechnete Eigenschaften
const filteredMetrics = computed(() => {
  return props.metrics.filter((metric) => metric.type === metricType.value);
});

const groupedMetrics = computed(() => {
  const result: Record<string, Metric[]> = {};

  filteredMetrics.value.forEach((metric) => {
    let key: string;

    switch (groupBy.value) {
      case "component":
        key = metric.component || "unknown";
        break;
      case "device":
        key = metric.device || "unknown";
        break;
      case "feature":
      default:
        key = metric.feature;
        break;
    }

    if (!result[key]) {
      result[key] = [];
    }

    result[key].push(metric);
  });

  return result;
});

// Methoden
function formatGroupName(name: string): string {
  if (name === "unknown") {
    return t("monitoring.performance.unknown", "Unbekannt");
  }

  if (groupBy.value === "feature") {
    return name
      .replace(/^use/, "")
      .replace(/([A-Z])/g, " $1")
      .trim();
  }

  return name;
}

function calculateAverageScore(metrics: Metric[]): number {
  if (metrics.length === 0) return 0;

  const sum = metrics.reduce((total, metric) => {
    return total + (metric.score || calculateScore(metric));
  }, 0);

  return sum / metrics.length;
}

function calculateScore(metric: Metric): number {
  // Basierend auf dem Metriktyp und Wert einen Score zwischen 0 und 100 berechnen
  // Höher ist besser

  const value = metric.value;
  let score = 0;

  switch (metric.type) {
    case "render":
      // Renderzeit: < 50ms ist ideal, > 500ms ist schlecht
      score = Math.max(0, 100 - value / 5);
      break;
    case "load":
      // Ladezeit: < 200ms ist ideal, > 2000ms ist schlecht
      score = Math.max(0, 100 - value / 20);
      break;
    case "memory":
      // Speichernutzung: < 1MB ist ideal, > 10MB ist schlecht
      score = Math.max(0, 100 - value / 100000);
      break;
    case "interaction":
      // Interaktionslatenz: < 100ms ist ideal, > 1000ms ist schlecht
      score = Math.max(0, 100 - value / 10);
      break;
  }

  return Math.min(100, Math.max(0, score));
}

function getPerformanceClass(score: number): string {
  if (score >= 90) return "performance-excellent";
  if (score >= 70) return "performance-good";
  if (score >= 40) return "performance-average";
  return "performance-poor";
}

function getPerformanceLabel(score: number): string {
  if (score >= 90)
    return t("monitoring.performance.status.excellent", "Ausgezeichnet");
  if (score >= 70) return t("monitoring.performance.status.good", "Gut");
  if (score >= 40)
    return t("monitoring.performance.status.average", "Durchschnittlich");
  return t("monitoring.performance.status.poor", "Schlecht");
}

function formatScore(score: number): string {
  return score.toFixed(0);
}

function getMetricLabel(metric: Metric): string {
  switch (groupBy.value) {
    case "feature":
      return metric.component || t("monitoring.performance.overall", "Gesamt");
    case "component":
      return formatGroupName(metric.feature);
    case "device":
      return metric.browser || t("monitoring.performance.unknown", "Unbekannt");
    default:
      return "";
  }
}

function calculateBarWidth(metric: Metric): string {
  const score = metric.score || calculateScore(metric);
  return `${score}%`;
}

function getBarColor(metric: Metric): string {
  const score = metric.score || calculateScore(metric);

  if (score >= 90) return "#10b981"; // grün
  if (score >= 70) return "#22c55e"; // hellgrün
  if (score >= 40) return "#f59e0b"; // orange
  return "#ef4444"; // rot
}

function formatMetricValue(metric: Metric | number): string {
  if (typeof metric === "number") {
    // Wenn ein einzelner Wert übergeben wird
    switch (metricType.value) {
      case "render":
      case "load":
      case "interaction":
        return `${metric.toFixed(2)} ms`;
      case "memory":
        return formatMemory(metric);
      default:
        return metric.toString();
    }
  } else {
    // Wenn ein vollständiges Metrikobjekt übergeben wird
    switch (metric.type) {
      case "render":
      case "load":
      case "interaction":
        return `${metric.value.toFixed(2)} ms`;
      case "memory":
        return formatMemory(metric.value);
      default:
        return metric.value.toString();
    }
  }
}

function formatMemory(bytes: number): string {
  if (bytes < 1024) return `${bytes.toFixed(2)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function calculatePercentile(metrics: Metric[], percentile: number): number {
  if (metrics.length === 0) return 0;

  const values = metrics.map((m) => m.value).sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * values.length) - 1;
  return values[Math.max(0, Math.min(values.length - 1, index))];
}

function calculateMax(metrics: Metric[]): number {
  if (metrics.length === 0) return 0;
  return Math.max(...metrics.map((m) => m.value));
}

function getColumnHeader(): string {
  switch (groupBy.value) {
    case "feature":
      return t("monitoring.performance.component", "Komponente");
    case "component":
      return t("monitoring.performance.feature", "Feature");
    case "device":
      return t("monitoring.performance.browser", "Browser");
    default:
      return "";
  }
}

function getDetailValue(metric: Metric): string {
  switch (groupBy.value) {
    case "feature":
      return metric.component || t("monitoring.performance.overall", "Gesamt");
    case "component":
      return formatGroupName(metric.feature);
    case "device":
      return metric.browser || t("monitoring.performance.unknown", "Unbekannt");
    default:
      return "";
  }
}

function toggleDetails(groupName: string): void {
  detailsVisible.value = {
    ...detailsVisible.value,
    [groupName]: !detailsVisible.value[groupName],
  };
}
</script>

<style scoped>
.performance-metrics {
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
}

.metrics-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 15px;
}

.metrics-header h3 {
  margin: 0;
  font-size: 1.2rem;
  color: #333;
}

.metrics-controls {
  display: flex;
  gap: 10px;
}

.control-select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: white;
  font-size: 0.9rem;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
}

.metric-card {
  background-color: white;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  border: 1px solid #eee;
}

.metric-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background-color: #f9f9f9;
  border-bottom: 1px solid #eee;
}

.metric-card-header h4 {
  margin: 0;
  font-size: 1.1rem;
  color: #333;
}

.metric-card-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.9rem;
}

.performance-excellent {
  background-color: #dcfce7;
  color: #16a34a;
}

.performance-good {
  background-color: #d1fae5;
  color: #059669;
}

.performance-average {
  background-color: #fef3c7;
  color: #d97706;
}

.performance-poor {
  background-color: #fee2e2;
  color: #dc2626;
}

.metric-card-content {
  padding: 15px;
}

.metric-visualization {
  margin-bottom: 15px;
}

.bar-chart {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.bar-container {
  display: flex;
  align-items: center;
  gap: 10px;
}

.bar-label {
  width: 120px;
  font-size: 0.85rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #555;
}

.bar-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  height: 20px;
}

.bar {
  height: 8px;
  border-radius: 4px;
  transition:
    width 0.3s,
    background-color 0.3s;
}

.bar-value {
  margin-left: 10px;
  font-size: 0.85rem;
  color: #666;
  white-space: nowrap;
}

.metric-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #eee;
}

.metric-summary {
  display: flex;
  gap: 15px;
}

.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.summary-label {
  font-size: 0.75rem;
  color: #666;
  margin-bottom: 3px;
}

.summary-value {
  font-size: 0.9rem;
  font-weight: 500;
  color: #333;
}

.details-button {
  background: none;
  border: none;
  color: #3b82f6;
  cursor: pointer;
  font-size: 0.85rem;
  text-decoration: underline;
}

.metrics-details-expanded {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #eee;
}

.metrics-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.metrics-table th {
  text-align: left;
  padding: 8px;
  border-bottom: 1px solid #eee;
  color: #666;
  font-weight: 500;
}

.metrics-table td {
  padding: 8px;
  border-bottom: 1px solid #f5f5f5;
}

.metrics-table tr:last-child td {
  border-bottom: none;
}

.status-indicator {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 5px;
}

.no-metrics {
  padding: 30px;
  text-align: center;
  color: #666;
  font-style: italic;
  background-color: white;
  border-radius: 6px;
  border: 1px solid #eee;
}

@media (max-width: 768px) {
  .metrics-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .metrics-grid {
    grid-template-columns: 1fr;
  }

  .bar-container {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }

  .bar-label {
    width: 100%;
  }

  .metric-summary {
    flex-wrap: wrap;
  }

  .metric-details {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }

  .details-button {
    align-self: flex-end;
  }
}
</style>
