<template>
  <div class="feature-monitor">
    <div class="feature-monitor-header">
      <h2>{{ t("monitoring.title", "Feature-Toggle-Monitoring") }}</h2>
      <div class="feature-monitor-controls">
        <select v-model="timeRange" class="time-range-selector">
          <option value="hour">
            {{ t("monitoring.timeRange.hour", "Letzte Stunde") }}
          </option>
          <option value="day">
            {{ t("monitoring.timeRange.day", "Letzter Tag") }}
          </option>
          <option value="week">
            {{ t("monitoring.timeRange.week", "Letzte Woche") }}
          </option>
          <option value="month">
            {{ t("monitoring.timeRange.month", "Letzter Monat") }}
          </option>
        </select>
        <button @click="refreshData" class="refresh-button">
          {{ t("monitoring.refresh", "Aktualisieren") }}
        </button>
        <button @click="exportData" class="export-button">
          {{ t("monitoring.export", "Daten exportieren") }}
        </button>
      </div>
    </div>

    <div class="feature-monitor-summary">
      <div class="summary-card feature-count">
        <div class="summary-value">{{ activeFeatureCount }}</div>
        <div class="summary-label">
          {{ t("monitoring.summary.activeFeatures", "Aktive Features") }}
        </div>
      </div>
      <div class="summary-card error-count">
        <div class="summary-value">{{ totalErrorCount }}</div>
        <div class="summary-label">
          {{ t("monitoring.summary.errors", "Fehler (Gesamt)") }}
        </div>
      </div>
      <div class="summary-card fallback-count">
        <div class="summary-value">{{ activeFallbackCount }}</div>
        <div class="summary-label">
          {{ t("monitoring.summary.fallbacks", "Aktive Fallbacks") }}
        </div>
      </div>
      <div class="summary-card user-count">
        <div class="summary-value">{{ uniqueUserCount }}</div>
        <div class="summary-label">
          {{ t("monitoring.summary.users", "Aktive Benutzer") }}
        </div>
      </div>
    </div>

    <div class="feature-monitor-charts">
      <div class="chart-container">
        <h3>
          {{ t("monitoring.charts.errorRate", "Fehlerrate nach Feature") }}
        </h3>
        <ErrorRateChart :data="errorRateData" :height="300" />
      </div>
      <div class="chart-container">
        <h3>{{ t("monitoring.charts.featureUsage", "Feature-Nutzung") }}</h3>
        <FeatureUsageChart :data="usageData" :height="300" />
      </div>
    </div>

    <div class="feature-monitor-charts">
      <div class="chart-container">
        <h3>
          {{ t("monitoring.charts.performance", "Performance-Metriken") }}
        </h3>
        <PerformanceChart :data="performanceData" :height="300" />
      </div>
      <div class="chart-container">
        <h3>
          {{ t("monitoring.charts.userInteraction", "Benutzerinteraktionen") }}
        </h3>
        <HeatmapChart :data="interactionData" :height="300" />
      </div>
    </div>

    <div class="feature-monitor-alerts">
      <h3>
        {{ t("monitoring.alerts.title", "Warnungen & Benachrichtigungen") }}
      </h3>
      <div class="alert-list">
        <div
          v-for="(alert, index) in activeAlerts"
          :key="index"
          class="alert-item"
          :class="`alert-${alert.severity}`"
        >
          <div class="alert-icon">
            <i :class="getAlertIcon(alert.severity)"></i>
          </div>
          <div class="alert-content">
            <div class="alert-title">{{ alert.title }}</div>
            <div class="alert-message">{{ alert.message }}</div>
            <div class="alert-timestamp">{{ formatDate(alert.timestamp) }}</div>
          </div>
          <div class="alert-actions">
            <button @click="acknowledgeAlert(alert.id)" class="alert-action">
              {{ t("monitoring.alerts.acknowledge", "Bestätigen") }}
            </button>
            <button
              v-if="alert.feature"
              @click="disableFeature(alert.feature)"
              class="alert-action alert-action-disable"
            >
              {{ t("monitoring.alerts.disable", "Feature deaktivieren") }}
            </button>
          </div>
        </div>
        <div v-if="activeAlerts.length === 0" class="no-alerts">
          {{ t("monitoring.alerts.noAlerts", "Keine aktiven Warnungen") }}
        </div>
      </div>
    </div>

    <div class="feature-monitor-tabs">
      <div class="tab-header">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="currentTab = tab.id"
          class="tab-button"
          :class="{ active: currentTab === tab.id }"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="tab-content">
        <!-- Fehlerprotokolle Tab -->
        <div v-if="currentTab === 'errors'" class="tab-pane">
          <ErrorLog :errors="filteredErrors" />
        </div>

        <!-- Performance-Metriken Tab -->
        <div v-if="currentTab === 'performance'" class="tab-pane">
          <PerformanceMetrics :metrics="performanceMetrics" />
        </div>

        <!-- Nutzungsstatistiken Tab -->
        <div v-if="currentTab === 'usage'" class="tab-pane">
          <UsageStatistics :statistics="usageStatistics" />
        </div>

        <!-- Einstellungen Tab -->
        <div v-if="currentTab === 'settings'" class="tab-pane">
          <MonitoringSettings
            :settings="monitoringSettings"
            @update:settings="updateSettings"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useI18n } from "@/composables/useI18n";
import { useFeatureToggles } from "@/composables/useFeatureToggles";
import { useMonitoringStore } from "@/stores/monitoringStore";
import ErrorLog from "./ErrorLog.vue";
import PerformanceMetrics from "./PerformanceMetrics.vue";
import UsageStatistics from "./UsageStatistics.vue";
import MonitoringSettings from "./MonitoringSettings.vue";
import ErrorRateChart from "./charts/ErrorRateChart.vue";
import FeatureUsageChart from "./charts/FeatureUsageChart.vue";
import PerformanceChart from "./charts/PerformanceChart.vue";
import HeatmapChart from "./charts/HeatmapChart.vue";

// Composables
const { t } = useI18n();
const featureToggles = useFeatureToggles();
const monitoringStore = useMonitoringStore();

// State
const timeRange = ref<"hour" | "day" | "week" | "month">("day");
const currentTab = ref<string>("errors");
const isLoading = ref<boolean>(false);

// Tabs Definition
const tabs = [
  { id: "errors", label: t("monitoring.tabs.errors", "Fehlerprotokolle") },
  {
    id: "performance",
    label: t("monitoring.tabs.performance", "Performance-Metriken"),
  },
  { id: "usage", label: t("monitoring.tabs.usage", "Nutzungsstatistiken") },
  { id: "settings", label: t("monitoring.tabs.settings", "Einstellungen") },
];

// Computed properties für Übersichtskarten
const activeFeatureCount = computed(() => {
  return monitoringStore.getActiveFeatureCount();
});

const totalErrorCount = computed(() => {
  return monitoringStore.getTotalErrorCount(timeRange.value);
});

const activeFallbackCount = computed(() => {
  return monitoringStore.getActiveFallbackCount();
});

const uniqueUserCount = computed(() => {
  return monitoringStore.getUniqueUserCount(timeRange.value);
});

// Daten für Diagramme
const errorRateData = computed(() => {
  return monitoringStore.getErrorRateData(timeRange.value);
});

const usageData = computed(() => {
  return monitoringStore.getFeatureUsageData(timeRange.value);
});

const performanceData = computed(() => {
  return monitoringStore.getPerformanceData(timeRange.value);
});

const interactionData = computed(() => {
  return monitoringStore.getInteractionData(timeRange.value);
});

// Warnungen & Benachrichtigungen
const activeAlerts = computed(() => {
  return monitoringStore.getActiveAlerts();
});

// Daten für Tabs
const performanceMetrics = computed(() => {
  return monitoringStore.getDetailedPerformanceMetrics(timeRange.value);
});

const usageStatistics = computed(() => {
  return monitoringStore.getDetailedUsageStatistics(timeRange.value);
});

const filteredErrors = computed(() => {
  return monitoringStore.getFilteredErrors({
    timeRange: timeRange.value,
    // Weitere Filter könnten hier hinzugefügt werden
  });
});

// Einstellungen
const monitoringSettings = computed(() => {
  return monitoringStore.getSettings();
});

// Methoden
function refreshData() {
  isLoading.value = true;
  monitoringStore.refreshData().finally(() => {
    isLoading.value = false;
  });
}

function exportData() {
  const data = monitoringStore.exportData();
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `feature-monitoring-export-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getAlertIcon(severity: string): string {
  switch (severity) {
    case "critical":
      return "icon-error-critical";
    case "high":
      return "icon-error-high";
    case "medium":
      return "icon-error-medium";
    case "low":
      return "icon-error-low";
    default:
      return "icon-info";
  }
}

function acknowledgeAlert(alertId: string) {
  monitoringStore.acknowledgeAlert(alertId);
}

function disableFeature(featureName: string) {
  featureToggles.disableFeature(featureName);
  refreshData();
}

function updateSettings(newSettings: any) {
  monitoringStore.updateSettings(newSettings);
}

// Lifecycle hooks
onMounted(() => {
  refreshData();
});

watch(timeRange, () => {
  refreshData();
});
</script>

<style scoped>
.feature-monitor {
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  color: #333;
}

.feature-monitor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.feature-monitor-header h2 {
  font-size: 1.8rem;
  color: #0d7a40;
  margin: 0;
}

.feature-monitor-controls {
  display: flex;
  gap: 10px;
}

.time-range-selector {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: white;
  font-size: 0.9rem;
}

button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition:
    background-color 0.2s,
    transform 0.1s;
}

.refresh-button {
  background-color: #0d7a40;
  color: white;
}

.refresh-button:hover {
  background-color: #0a6032;
}

.export-button {
  background-color: #4a6cf7;
  color: white;
}

.export-button:hover {
  background-color: #3a5cf0;
}

.feature-monitor-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.summary-card {
  background-color: white;
  border-radius: 6px;
  padding: 20px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  border-top: 4px solid transparent;
}

.feature-count {
  border-top-color: #0d7a40;
}

.error-count {
  border-top-color: #ef4444;
}

.fallback-count {
  border-top-color: #f59e0b;
}

.user-count {
  border-top-color: #3b82f6;
}

.summary-value {
  font-size: 2.4rem;
  font-weight: 700;
  margin-bottom: 5px;
}

.summary-label {
  font-size: 0.9rem;
  color: #666;
}

.feature-monitor-charts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.chart-container {
  background-color: white;
  border-radius: 6px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.chart-container h3 {
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 1.2rem;
  color: #555;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}

.feature-monitor-alerts {
  background-color: white;
  border-radius: 6px;
  padding: 20px;
  margin-bottom: 30px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.feature-monitor-alerts h3 {
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 1.2rem;
  color: #555;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}

.alert-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.alert-item {
  display: flex;
  padding: 15px;
  border-radius: 6px;
  background-color: #f9f9f9;
  gap: 15px;
  align-items: center;
}

.alert-critical {
  background-color: #fef2f2;
  border-left: 4px solid #ef4444;
}

.alert-high {
  background-color: #fff7ed;
  border-left: 4px solid #f97316;
}

.alert-medium {
  background-color: #fffbeb;
  border-left: 4px solid #f59e0b;
}

.alert-low {
  background-color: #f0f9ff;
  border-left: 4px solid #3b82f6;
}

.alert-icon {
  font-size: 1.5rem;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.8);
}

.alert-content {
  flex: 1;
}

.alert-title {
  font-weight: 600;
  margin-bottom: 5px;
}

.alert-message {
  font-size: 0.9rem;
  color: #555;
  margin-bottom: 5px;
}

.alert-timestamp {
  font-size: 0.8rem;
  color: #777;
}

.alert-actions {
  display: flex;
  gap: 10px;
}

.alert-action {
  padding: 6px 12px;
  font-size: 0.85rem;
  background-color: #e5e7eb;
  color: #374151;
}

.alert-action:hover {
  background-color: #d1d5db;
}

.alert-action-disable {
  background-color: #fee2e2;
  color: #b91c1c;
}

.alert-action-disable:hover {
  background-color: #fecaca;
}

.no-alerts {
  text-align: center;
  padding: 20px;
  color: #666;
  font-style: italic;
}

.feature-monitor-tabs {
  background-color: white;
  border-radius: 6px;
  padding: 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.tab-header {
  display: flex;
  border-bottom: 1px solid #eee;
  background-color: #f9f9f9;
}

.tab-button {
  padding: 15px 20px;
  background-color: transparent;
  border: none;
  font-weight: 500;
  color: #666;
  border-bottom: 3px solid transparent;
  transition: all 0.2s;
}

.tab-button:hover {
  background-color: #f0f0f0;
  color: #333;
}

.tab-button.active {
  color: #0d7a40;
  border-bottom-color: #0d7a40;
  background-color: white;
}

.tab-content {
  padding: 20px;
}

.tab-pane {
  min-height: 300px;
}

/* Responsive Anpassungen */
@media (max-width: 1000px) {
  .feature-monitor-charts {
    grid-template-columns: 1fr;
  }

  .feature-monitor-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .feature-monitor-controls {
    width: 100%;
  }

  .tab-header {
    overflow-x: auto;
    white-space: nowrap;
  }
}

@media (max-width: 600px) {
  .feature-monitor-summary {
    grid-template-columns: 1fr;
  }

  .alert-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .alert-actions {
    width: 100%;
    margin-top: 10px;
  }
}
</style>
