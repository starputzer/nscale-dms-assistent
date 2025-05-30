<template>
  <div class="admin-feature-metrics">
    <div class="admin-feature-metrics__header">
      <h4>
        {{
          t(
            "admin.featureToggles.monitoring.title",
            "Feature-Nutzung & Metriken",
          )
        }}
      </h4>
      <div class="admin-feature-metrics__date-range">
        <BaseDateRangePicker
          v-model="dateRangeProxy"
          @change="onDateRangeChange"
        />
        <BaseButton
          icon="sync"
          @click="refreshMetrics"
          :loading="loading"
          :title="
            t(
              'admin.featureToggles.monitoring.refresh',
              'Metriken aktualisieren',
            )
          "
        />
      </div>
    </div>

    <div v-if="loading" class="admin-feature-metrics__loading">
      <div class="admin-feature-metrics__spinner"></div>
      <p>
        {{
          t(
            "admin.featureToggles.monitoring.loadingMetrics",
            "Metriken werden geladen...",
          )
        }}
      </p>
    </div>

    <template v-else>
      <div class="admin-feature-metrics__charts">
        <div class="admin-feature-metrics__chart-card">
          <h5>
            {{ t("admin.featureToggles.monitoring.usage", "Feature-Nutzung") }}
          </h5>
          <canvas ref="usageChartRef" height="200"></canvas>
        </div>
        <div class="admin-feature-metrics__chart-card">
          <h5>
            {{ t("admin.featureToggles.monitoring.errors", "Feature-Fehler") }}
          </h5>
          <canvas ref="errorChartRef" height="200"></canvas>
        </div>
      </div>

      <div class="admin-feature-metrics__metrics-grid">
        <div
          v-for="feature in features"
          :key="feature.key"
          class="admin-feature-metrics__metric-card"
        >
          <div class="admin-feature-metrics__metric-header">
            <h5>{{ feature.name }}</h5>
            <span
              :class="[
                'admin-feature-metrics__metric-status',
                { enabled: feature.enabled, disabled: !feature.enabled },
              ]"
            >
              {{
                feature.enabled
                  ? t("admin.featureToggles.enabled", "Aktiviert")
                  : t("admin.featureToggles.disabled", "Deaktiviert")
              }}
            </span>
          </div>
          <div class="admin-feature-metrics__metric-stats">
            <div class="admin-feature-metrics__metric-item">
              <div class="admin-feature-metrics__metric-value">
                {{ feature.metrics?.usageCount || 0 }}
              </div>
              <div class="admin-feature-metrics__metric-label">
                {{
                  t("admin.featureToggles.monitoring.usageCount", "Nutzungen")
                }}
              </div>
            </div>
            <div class="admin-feature-metrics__metric-item">
              <div class="admin-feature-metrics__metric-value">
                {{ feature.metrics?.errorCount || 0 }}
              </div>
              <div class="admin-feature-metrics__metric-label">
                {{ t("admin.featureToggles.monitoring.errorCount", "Fehler") }}
              </div>
            </div>
            <div class="admin-feature-metrics__metric-item">
              <div class="admin-feature-metrics__metric-value">
                {{ formatPercentage(feature.metrics?.errorRate) }}
              </div>
              <div class="admin-feature-metrics__metric-label">
                {{
                  t("admin.featureToggles.monitoring.errorRate", "Fehlerrate")
                }}
              </div>
            </div>
          </div>
          <div
            v-if="feature.metrics?.trend"
            class="admin-feature-metrics__metric-trend"
          >
            <canvas
              :ref="(el) => setTrendChartRef(el, feature.key)"
              height="60"
            ></canvas>
          </div>
        </div>
      </div>

      <div v-if="errorLogs.length" class="admin-feature-metrics__error-logs">
        <h4>
          {{
            t("admin.featureToggles.monitoring.recentErrors", "Neueste Fehler")
          }}
        </h4>
        <div class="admin-feature-metrics__error-container">
          <div
            v-for="(error, index) in errorLogs"
            :key="index"
            class="admin-feature-metrics__error-entry"
          >
            <div class="admin-feature-metrics__error-header">
              <span class="admin-feature-metrics__error-feature">{{
                error.feature
              }}</span>
              <span class="admin-feature-metrics__error-time">{{
                formatDate(error.timestamp)
              }}</span>
            </div>
            <div class="admin-feature-metrics__error-message">
              {{ error.message }}
            </div>
            <div
              v-if="error.stackTrace"
              class="admin-feature-metrics__error-stack"
              v-show="expandedErrors.includes(index)"
            >
              <pre>{{ error.stackTrace }}</pre>
            </div>
            <BaseButton
              text
              small
              :icon="
                expandedErrors.includes(index) ? 'chevron-up' : 'chevron-down'
              "
              @click="toggleErrorExpand(index)"
              class="admin-feature-metrics__error-expand"
            >
              {{
                expandedErrors.includes(index)
                  ? t(
                      "admin.featureToggles.monitoring.hideDetails",
                      "Details ausblenden",
                    )
                  : t(
                      "admin.featureToggles.monitoring.showDetails",
                      "Details anzeigen",
                    )
              }}
            </BaseButton>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  onMounted,
  onBeforeUnmount,
  watch,
  nextTick,
} from "vue";
import { useI18n } from "vue-i18n";
import Chart from "chart.js/auto";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseDateRangePicker from "@/components/base/BaseDateRangePicker.vue";
import type {
  FeatureToggle,
  FeatureMetrics,
  FeatureErrorLog,
} from "@/types/featureToggles";

const { t } = useI18n({
  useScope: "global",
  inheritLocale: true,
});
console.log("[i18n] Component initialized with global scope and inheritance");

interface Props {
  features: (FeatureToggle & { metrics?: FeatureMetrics })[];
  errorLogs: FeatureErrorLog[];
  loading: boolean;
  dateRange: { start: Date; end: Date };
}

const props = withDefaults(defineProps<Props>(), {
  features: () => [],
  errorLogs: () => [],
  loading: false,
  dateRange: () => ({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    end: new Date(),
  }),
});

const emit = defineEmits<{
  (e: "refresh"): void;
  (e: "dateRangeChange", dateRange: { start: Date; end: Date }): void;
}>();

// State
const expandedErrors = ref<number[]>([]);
const usageChartRef = ref<HTMLCanvasElement | null>(null);
const errorChartRef = ref<HTMLCanvasElement | null>(null);
const trendChartRefs = ref<Record<string, HTMLCanvasElement>>({});

// Chart instances
const usageChartInstance = ref<Chart | null>(null);
const errorChartInstance = ref<Chart | null>(null);
const trendCharts = ref<Record<string, Chart | null>>({});

// Date range proxy for two-way binding
const dateRangeProxy = computed({
  get: () => props.dateRange,
  set: (newVal) => emit("dateRangeChange", newVal),
});

// Methods
function formatDate(timestamp: string | number | Date) {
  return new Date(timestamp).toLocaleString();
}

function formatPercentage(value?: number) {
  if (value === undefined || value === null) {
    return "0%";
  }
  return `${(value * 100).toFixed(1)}%`;
}

function refreshMetrics() {
  emit("refresh");
}

function onDateRangeChange() {
  emit("dateRangeChange", dateRangeProxy.value);
}

function toggleErrorExpand(index: number) {
  const idx = expandedErrors.value.indexOf(index);
  if (idx === -1) {
    expandedErrors.value.push(index);
  } else {
    expandedErrors.value.splice(idx, 1);
  }
}

function setTrendChartRef(el: HTMLCanvasElement | null, key: string) {
  if (el) {
    trendChartRefs.value[key] = el;
  }
}

function updateCharts() {
  // Clean up previous chart instances
  if (usageChartInstance.value) {
    usageChartInstance.value.destroy();
    usageChartInstance.value = null;
  }

  if (errorChartInstance.value) {
    errorChartInstance.value.destroy();
    errorChartInstance.value = null;
  }

  // Update usage chart
  if (usageChartRef.value) {
    const ctx = usageChartRef.value.getContext("2d");
    if (ctx) {
      const topFeatures = [...props.features]
        .sort(
          (a, b) => (b.metrics?.usageCount || 0) - (a.metrics?.usageCount || 0),
        )
        .slice(0, 10);

      usageChartInstance.value = new Chart(ctx, {
        type: "bar",
        data: {
          labels: topFeatures.map((feature) => feature.name),
          datasets: [
            {
              label: t("admin.featureToggles.monitoring.usageCount"),
              data: topFeatures.map(
                (feature) => feature.metrics?.usageCount || 0,
              ),
              backgroundColor: "rgba(54, 162, 235, 0.6)",
              borderColor: "rgba(54, 162, 235, 1)",
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false,
            },
          },
          scales: {
            y: {
              beginAtZero: true,
            },
          },
        },
      });
    }
  }

  // Update error chart
  if (errorChartRef.value) {
    const ctx = errorChartRef.value.getContext("2d");
    if (ctx) {
      const topErrorFeatures = [...props.features]
        .sort(
          (a, b) => (b.metrics?.errorCount || 0) - (a.metrics?.errorCount || 0),
        )
        .slice(0, 10);

      errorChartInstance.value = new Chart(ctx, {
        type: "bar",
        data: {
          labels: topErrorFeatures.map((feature) => feature.name),
          datasets: [
            {
              label: t("admin.featureToggles.monitoring.errorCount"),
              data: topErrorFeatures.map(
                (feature) => feature.metrics?.errorCount || 0,
              ),
              backgroundColor: "rgba(255, 99, 132, 0.6)",
              borderColor: "rgba(255, 99, 132, 1)",
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false,
            },
          },
          scales: {
            y: {
              beginAtZero: true,
            },
          },
        },
      });
    }
  }
}

function updateTrendCharts() {
  // Clean up old chart instances
  Object.values(trendCharts.value).forEach((chart) => {
    if (chart) chart.destroy();
  });
  trendCharts.value = {};

  // Create trend charts for each feature
  props.features.forEach((feature) => {
    if (!feature.metrics?.trend) return;

    const canvas = trendChartRefs.value[feature.key];
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    trendCharts.value[feature.key] = new Chart(ctx, {
      type: "line",
      data: {
        labels: feature.metrics.trend.map((t) =>
          new Date(t.date).toLocaleDateString(),
        ),
        datasets: [
          {
            label: t("admin.featureToggles.monitoring.usage"),
            data: feature.metrics.trend.map((t) => t.count),
            borderColor: "rgba(54, 162, 235, 1)",
            backgroundColor: "rgba(54, 162, 235, 0.1)",
            borderWidth: 2,
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            mode: "index",
            intersect: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            display: false,
          },
          x: {
            display: false,
          },
        },
        elements: {
          point: {
            radius: 0,
          },
        },
      },
    });
  });
}

// When features or metrics data change, update the charts
watch(
  () => [props.features, props.loading],
  async () => {
    if (!props.loading && props.features.length > 0) {
      await nextTick();
      updateCharts();
      updateTrendCharts();
    }
  },
  { deep: true },
);

// Lifecycle hooks
onMounted(async () => {
  if (!props.loading && props.features.length > 0) {
    await nextTick();
    updateCharts();
    updateTrendCharts();
  }
});

onBeforeUnmount(() => {
  // Clean up chart instances to prevent memory leaks
  if (usageChartInstance.value) {
    usageChartInstance.value.destroy();
  }

  if (errorChartInstance.value) {
    errorChartInstance.value.destroy();
  }

  Object.values(trendCharts.value).forEach((chart) => {
    if (chart) chart.destroy();
  });
});
</script>

<style lang="scss">
.admin-feature-metrics {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 100%;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;

    h4 {
      margin: 0;
    }
  }

  &__date-range {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  &__loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 0;
    color: var(--text-secondary);
  }

  &__spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--border-color);
    border-radius: 50%;
    border-top-color: var(--primary);
    animation: spin 1s ease-in-out infinite;
    margin-bottom: 1rem;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  &__charts {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;
  }

  &__chart-card {
    background-color: var(--card-bg);
    border-radius: 0.5rem;
    padding: 1rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);

    h5 {
      margin-top: 0;
      margin-bottom: 1rem;
    }
  }

  &__metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1rem;
  }

  &__metric-card {
    background-color: var(--card-bg);
    border-radius: 0.5rem;
    padding: 1rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  &__metric-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;

    h5 {
      margin: 0;
      font-size: 1rem;
    }
  }

  &__metric-status {
    display: inline-block;
    font-size: 0.75rem;
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;

    &.enabled {
      background-color: var(--success-light);
      color: var(--success);
    }

    &.disabled {
      background-color: var(--warning-light);
      color: var(--warning);
    }
  }

  &__metric-stats {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  &__metric-item {
    flex: 1;
  }

  &__metric-value {
    font-size: 1.25rem;
    font-weight: bold;
  }

  &__metric-label {
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  &__error-logs {
    background-color: var(--card-bg);
    border-radius: 0.5rem;
    padding: 1rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);

    h4 {
      margin-top: 0;
      margin-bottom: 1rem;
    }
  }

  &__error-container {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  &__error-entry {
    border: 1px solid var(--border-color);
    border-radius: 0.375rem;
    overflow: hidden;
  }

  &__error-header {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 0.75rem;
    background-color: var(--bg-secondary);
    font-size: 0.875rem;
  }

  &__error-feature {
    font-weight: bold;
  }

  &__error-time {
    color: var(--text-secondary);
  }

  &__error-message {
    padding: 0.75rem;
    border-bottom: 1px solid var(--border-color);
  }

  &__error-stack {
    padding: 0.75rem;
    background-color: var(--code-bg);
    font-family: monospace;
    font-size: 0.75rem;
    white-space: pre-wrap;
    overflow-x: auto;
    border-bottom: 1px solid var(--border-color);
  }

  &__error-expand {
    display: flex;
    justify-content: center;
    padding: 0.25rem;
    width: 100%;
  }

  // Responsive adjustments
  @media (max-width: 992px) {
    &__date-range {
      flex-wrap: wrap;
    }

    &__metric-stats {
      flex-wrap: wrap;
    }

    &__charts {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 768px) {
    &__header {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }

    &__date-range {
      width: 100%;
    }
  }

  @media (max-width: 480px) {
    &__metric-stats {
      flex-direction: column;
      align-items: flex-start;
    }

    &__metric-item {
      width: 100%;
      display: grid;
      grid-template-columns: 1fr 1fr;
      align-items: center;

      &:not(:last-child) {
        border-bottom: 1px solid var(--border-color);
        padding-bottom: 0.5rem;
        margin-bottom: 0.5rem;
      }
    }

    &__error-header {
      flex-direction: column;
      align-items: flex-start;
    }
  }
}
</style>
