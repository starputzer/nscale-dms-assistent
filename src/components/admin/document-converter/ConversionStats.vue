<template>
  <div class="conversion-stats">
    <div class="conversion-stats__header">
      <h2 class="conversion-stats__title">
        {{ t("documentConverter.stats.title", "Konvertierungsstatistiken") }}
      </h2>
      <div class="conversion-stats__actions">
        <div class="conversion-stats__filters">
          <label class="conversion-stats__filter-label">
            {{ t("documentConverter.stats.timeRange", "Zeitraum") }}:
            <select v-model="timeRange" class="conversion-stats__select">
              <option value="day">
                {{ t("documentConverter.stats.day", "Heute") }}
              </option>
              <option value="week">
                {{ t("documentConverter.stats.week", "Letzte Woche") }}
              </option>
              <option value="month">
                {{ t("documentConverter.stats.month", "Letzter Monat") }}
              </option>
              <option value="year">
                {{ t("documentConverter.stats.year", "Letztes Jahr") }}
              </option>
            </select>
          </label>
          <label class="conversion-stats__filter-label">
            {{ t("documentConverter.stats.groupBy", "Gruppieren nach") }}:
            <select v-model="groupBy" class="conversion-stats__select">
              <option value="format">
                {{ t("documentConverter.stats.format", "Dateiformat") }}
              </option>
              <option value="status">
                {{ t("documentConverter.stats.status", "Status") }}
              </option>
              <option value="day">
                {{ t("documentConverter.stats.byDay", "Tag") }}
              </option>
              <option value="week">
                {{ t("documentConverter.stats.byWeek", "Woche") }}
              </option>
              <option value="month">
                {{ t("documentConverter.stats.byMonth", "Monat") }}
              </option>
            </select>
          </label>
        </div>
        <div class="conversion-stats__export">
          <button
            @click="exportStats('csv')"
            class="conversion-stats__export-btn"
          >
            <i class="fa fa-file-csv"></i>
            {{ t("documentConverter.stats.exportCSV", "CSV") }}
          </button>
          <button
            @click="exportStats('json')"
            class="conversion-stats__export-btn"
          >
            <i class="fa fa-file-code"></i>
            {{ t("documentConverter.stats.exportJSON", "JSON") }}
          </button>
        </div>
      </div>
    </div>

    <div class="conversion-stats__summary">
      <div class="conversion-stats__card">
        <div class="conversion-stats__card-title">
          {{ t("documentConverter.stats.totalConversions", "Gesamt") }}
        </div>
        <div class="conversion-stats__card-value">{{ totalCount }}</div>
      </div>
      <div class="conversion-stats__card conversion-stats__card--success">
        <div class="conversion-stats__card-title">
          {{ t("documentConverter.stats.successful", "Erfolgreich") }}
        </div>
        <div class="conversion-stats__card-value">
          {{ successCount }} ({{ successRate }}%)
        </div>
      </div>
      <div class="conversion-stats__card conversion-stats__card--error">
        <div class="conversion-stats__card-title">
          {{ t("documentConverter.stats.failed", "Fehlgeschlagen") }}
        </div>
        <div class="conversion-stats__card-value">
          {{ errorCount }} ({{ errorRate }}%)
        </div>
      </div>
      <div class="conversion-stats__card conversion-stats__card--info">
        <div class="conversion-stats__card-title">
          {{ t("documentConverter.stats.inProgress", "In Bearbeitung") }}
        </div>
        <div class="conversion-stats__card-value">{{ pendingCount }}</div>
      </div>
      <div class="conversion-stats__card">
        <div class="conversion-stats__card-title">
          {{ t("documentConverter.stats.avgSize", "Ø Dateigröße") }}
        </div>
        <div class="conversion-stats__card-value">{{ averageFileSize }}</div>
      </div>
      <div class="conversion-stats__card">
        <div class="conversion-stats__card-title">
          {{ t("documentConverter.stats.avgTime", "Ø Konvertierungszeit") }}
        </div>
        <div class="conversion-stats__card-value">
          {{ averageConversionTime }}
        </div>
      </div>
    </div>

    <div class="conversion-stats__charts">
      <div class="conversion-stats__chart">
        <h3 class="conversion-stats__chart-title">
          {{
            t(
              "documentConverter.stats.conversionsByFormat",
              "Konvertierungen nach Format",
            )
          }}
        </h3>
        <div
          class="conversion-stats__chart-container"
          ref="formatChartContainer"
        >
          <div v-if="isLoading" class="conversion-stats__loading">
            <div class="conversion-stats__spinner"></div>
            <p>{{ t("documentConverter.stats.loading", "Lädt...") }}</p>
          </div>
          <canvas v-else ref="formatChart"></canvas>
        </div>
      </div>

      <div class="conversion-stats__chart">
        <h3 class="conversion-stats__chart-title">
          {{
            t(
              "documentConverter.stats.conversionStatus",
              "Konvertierungsstatus",
            )
          }}
        </h3>
        <div
          class="conversion-stats__chart-container"
          ref="statusChartContainer"
        >
          <div v-if="isLoading" class="conversion-stats__loading">
            <div class="conversion-stats__spinner"></div>
            <p>{{ t("documentConverter.stats.loading", "Lädt...") }}</p>
          </div>
          <canvas v-else ref="statusChart"></canvas>
        </div>
      </div>

      <div class="conversion-stats__chart conversion-stats__chart--full">
        <h3 class="conversion-stats__chart-title">
          {{
            t("documentConverter.stats.conversionTrend", "Konvertierungstrend")
          }}
        </h3>
        <div
          class="conversion-stats__chart-container"
          ref="trendChartContainer"
        >
          <div v-if="isLoading" class="conversion-stats__loading">
            <div class="conversion-stats__spinner"></div>
            <p>{{ t("documentConverter.stats.loading", "Lädt...") }}</p>
          </div>
          <canvas v-else ref="trendChart"></canvas>
        </div>
      </div>

      <div class="conversion-stats__chart conversion-stats__chart--full">
        <h3 class="conversion-stats__chart-title">
          {{ t("documentConverter.stats.fileSizes", "Dateigrößenverteilung") }}
        </h3>
        <div class="conversion-stats__chart-container" ref="sizeChartContainer">
          <div v-if="isLoading" class="conversion-stats__loading">
            <div class="conversion-stats__spinner"></div>
            <p>{{ t("documentConverter.stats.loading", "Lädt...") }}</p>
          </div>
          <canvas v-else ref="sizeChart"></canvas>
        </div>
      </div>
    </div>

    <div class="conversion-stats__table-container">
      <h3 class="conversion-stats__table-title">
        {{
          t(
            "documentConverter.stats.recentConversions",
            "Letzte Konvertierungen",
          )
        }}
      </h3>
      <table class="conversion-stats__table">
        <thead>
          <tr>
            <th>{{ t("documentConverter.stats.filename", "Dateiname") }}</th>
            <th>{{ t("documentConverter.stats.format", "Format") }}</th>
            <th>{{ t("documentConverter.stats.size", "Größe") }}</th>
            <th>{{ t("documentConverter.stats.status", "Status") }}</th>
            <th>{{ t("documentConverter.stats.date", "Datum") }}</th>
            <th>{{ t("documentConverter.stats.duration", "Dauer") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="doc in recentDocuments"
            :key="doc.id"
            :class="{ 'conversion-stats__row--error': doc.status === 'error' }"
          >
            <td>{{ doc.originalName }}</td>
            <td>{{ doc.originalFormat.toUpperCase() }}</td>
            <td>{{ formatFileSize(doc.size) }}</td>
            <td>
              <span
                class="conversion-stats__status-pill"
                :class="`conversion-stats__status-pill--${getStatusClass(doc.status)}`"
              >
                {{ getStatusLabel(doc.status) }}
              </span>
            </td>
            <td>{{ formatDate(doc.uploadedAt) }}</td>
            <td>{{ formatDuration(doc.duration) }}</td>
          </tr>
          <tr v-if="recentDocuments.length === 0">
            <td colspan="6" class="conversion-stats__empty">
              {{
                t(
                  "documentConverter.stats.noConversions",
                  "Keine Konvertierungen gefunden",
                )
              }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch, onUnmounted } from "vue";
import { useDocumentConverterStore } from "@/stores/documentConverter";
import { ConversionResult } from "@/types/documentConverter";

// i18n helper
function t(
  key: string,
  fallback: string,
  params?: Record<string, any>,
): string {
  // For this implementation, we'll just return the fallback text
  // In a real implementation, you would use the i18n system
  if (params) {
    let result = fallback;
    Object.entries(params).forEach(([key, value]) => {
      result = result.replace(`{${key}}`, value);
    });
    return result;
  }
  return fallback;
}

// Initialize store
const store = useDocumentConverterStore();

// Chart references
const formatChart = ref<HTMLCanvasElement | null>(null);
const statusChart = ref<HTMLCanvasElement | null>(null);
const trendChart = ref<HTMLCanvasElement | null>(null);
const sizeChart = ref<HTMLCanvasElement | null>(null);
const formatChartContainer = ref<HTMLElement | null>(null);
const statusChartContainer = ref<HTMLElement | null>(null);
const trendChartContainer = ref<HTMLElement | null>(null);
const sizeChartContainer = ref<HTMLElement | null>(null);

// Chart instances
let formatChartInstance: any = null;
let statusChartInstance: any = null;
let trendChartInstance: any = null;
let sizeChartInstance: any = null;

// State variables
const isLoading = ref(true);
const timeRange = ref<"day" | "week" | "month" | "year">("month");
const groupBy = ref<"format" | "status" | "day" | "week" | "month">("format");
const Chart = ref<any>(null);

// Chart colors
const chartColors = {
  success: "rgba(46, 204, 113, 0.6)",
  error: "rgba(231, 76, 60, 0.6)",
  pending: "rgba(52, 152, 219, 0.6)",
  processing: "rgba(241, 196, 15, 0.6)",
  pdf: "rgba(231, 76, 60, 0.6)",
  docx: "rgba(52, 152, 219, 0.6)",
  xlsx: "rgba(46, 204, 113, 0.6)",
  pptx: "rgba(155, 89, 182, 0.6)",
  html: "rgba(241, 196, 15, 0.6)",
  txt: "rgba(52, 73, 94, 0.6)",
  other: "rgba(149, 165, 166, 0.6)",
};

// Computed statistics
const filteredDocuments = computed(() => {
  const endDate = new Date();
  let startDate = new Date();

  // Calculate start date based on time range
  switch (timeRange.value) {
    case "day":
      startDate.setDate(startDate.getDate() - 1);
      break;
    case "week":
      startDate.setDate(startDate.getDate() - 7);
      break;
    case "month":
      startDate.setMonth(startDate.getMonth() - 1);
      break;
    case "year":
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
  }

  // Filter documents by date
  return store.convertedDocuments.filter((doc) => {
    const docDate = doc.uploadedAt ? new Date(doc.uploadedAt) : new Date();
    return docDate >= startDate && docDate <= endDate;
  });
});

const totalCount = computed(() => filteredDocuments.value.length);

const successCount = computed(
  () =>
    filteredDocuments.value.filter((doc) => doc.status === "success").length,
);

const errorCount = computed(
  () => filteredDocuments.value.filter((doc) => doc.status === "error").length,
);

const pendingCount = computed(
  () =>
    filteredDocuments.value.filter(
      (doc) => doc.status === "pending" || doc.status === "processing",
    ).length,
);

const successRate = computed(() => {
  if (totalCount.value === 0) return "0";
  return ((successCount.value / totalCount.value) * 100).toFixed(1);
});

const errorRate = computed(() => {
  if (totalCount.value === 0) return "0";
  return ((errorCount.value / totalCount.value) * 100).toFixed(1);
});

const averageFileSize = computed(() => {
  if (totalCount.value === 0) return "0 KB";

  const totalSize = filteredDocuments.value.reduce(
    (sum, doc) => sum + (doc.size || 0),
    0,
  );
  return formatFileSize(totalSize / totalCount.value);
});

const averageConversionTime = computed(() => {
  const docsWithDuration = filteredDocuments.value.filter(
    (doc) => doc.duration,
  );

  if (docsWithDuration.length === 0) return "0s";

  const totalDuration = docsWithDuration.reduce(
    (sum, doc) => sum + (doc.duration || 0),
    0,
  );
  return formatDuration(totalDuration / docsWithDuration.length);
});

const recentDocuments = computed(() => {
  return [...filteredDocuments.value]
    .sort((a, b) => {
      const dateA = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
      const dateB = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, 10);
});

// Helper functions
function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return "0 Bytes";

  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));

  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + " " + sizes[i];
}

function formatDate(dateInput?: Date | string): string {
  if (!dateInput) return "";

  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;

  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(ms?: number): string {
  if (!ms) return "0s";

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);

  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }

  return `${seconds}s`;
}

function getStatusClass(status: string): string {
  switch (status) {
    case "success":
      return "success";
    case "error":
      return "error";
    case "processing":
      return "processing";
    case "pending":
      return "pending";
    default:
      return "default";
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "success":
      return t("documentConverter.stats.statusSuccess", "Erfolgreich");
    case "error":
      return t("documentConverter.stats.statusError", "Fehler");
    case "processing":
      return t("documentConverter.stats.statusProcessing", "In Bearbeitung");
    case "pending":
      return t("documentConverter.stats.statusPending", "Ausstehend");
    default:
      return status;
  }
}

// Chart rendering functions
async function loadChartLibrary() {
  if (Chart.value) return;

  try {
    // In real implementation, would use dynamic import:
    // const ChartModule = await import('chart.js');
    // Chart.value = ChartModule.Chart;

    // For our implementation, mock Chart.js
    Chart.value = {
      Chart: class MockChart {
        constructor(ctx: any, config: any) {
          this.ctx = ctx;
          this.config = config;
          console.log("Created chart with config:", config);
        }
        update() {
          console.log("Chart updated");
        }
        destroy() {
          console.log("Chart destroyed");
        }
      },
    };
  } catch (error) {
    console.error("Failed to load Chart.js:", error);
  }
}

function renderFormatChart() {
  if (!formatChart.value || !Chart.value) return;

  // Destroy previous chart if it exists
  if (formatChartInstance) {
    formatChartInstance.destroy();
  }

  // Group documents by format
  const formatCounts: Record<string, number> = {};

  filteredDocuments.value.forEach((doc) => {
    const format = doc.originalFormat?.toLowerCase() || "unknown";
    formatCounts[format] = (formatCounts[format] || 0) + 1;
  });

  // Prepare chart data
  const labels = Object.keys(formatCounts);
  const data = labels.map((format) => formatCounts[format]);
  const backgroundColors = labels.map(
    (format) =>
      chartColors[format as keyof typeof chartColors] || chartColors.other,
  );

  // Create chart
  const ctx = formatChart.value.getContext("2d");
  if (!ctx) return;

  formatChartInstance = new Chart.value.Chart(ctx, {
    type: "pie",
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: backgroundColors,
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "right",
          labels: {
            boxWidth: 12,
            font: {
              size: 11,
            },
          },
        },
        tooltip: {
          callbacks: {
            label: function (context: any) {
              const label = context.label || "";
              const value = context.raw || 0;
              const percentage =
                Math.round((value / totalCount.value) * 100) || 0;
              return `${label}: ${value} (${percentage}%)`;
            },
          },
        },
      },
    },
  });
}

function renderStatusChart() {
  if (!statusChart.value || !Chart.value) return;

  // Destroy previous chart if it exists
  if (statusChartInstance) {
    statusChartInstance.destroy();
  }

  // Count documents by status
  const counts = {
    success: successCount.value,
    error: errorCount.value,
    processing: filteredDocuments.value.filter(
      (doc) => doc.status === "processing",
    ).length,
    pending: filteredDocuments.value.filter((doc) => doc.status === "pending")
      .length,
  };

  // Prepare chart data
  const labels = [
    t("documentConverter.stats.statusSuccess", "Erfolgreich"),
    t("documentConverter.stats.statusError", "Fehler"),
    t("documentConverter.stats.statusProcessing", "In Bearbeitung"),
    t("documentConverter.stats.statusPending", "Ausstehend"),
  ];

  const data = [
    counts.success,
    counts.error,
    counts.processing,
    counts.pending,
  ];
  const colors = [
    chartColors.success,
    chartColors.error,
    chartColors.processing,
    chartColors.pending,
  ];

  // Create chart
  const ctx = statusChart.value.getContext("2d");
  if (!ctx) return;

  statusChartInstance = new Chart.value.Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: colors,
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "60%",
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            boxWidth: 12,
            font: {
              size: 11,
            },
          },
        },
        tooltip: {
          callbacks: {
            label: function (context: any) {
              const label = context.label || "";
              const value = context.raw || 0;
              const percentage =
                Math.round((value / totalCount.value) * 100) || 0;
              return `${label}: ${value} (${percentage}%)`;
            },
          },
        },
      },
    },
  });
}

function renderTrendChart() {
  if (!trendChart.value || !Chart.value) return;

  // Destroy previous chart if it exists
  if (trendChartInstance) {
    trendChartInstance.destroy();
  }

  // Prepare date intervals
  const intervals: { start: Date; end: Date; label: string }[] = [];
  const endDate = new Date();
  let startDate = new Date();

  switch (timeRange.value) {
    case "day":
      // Hourly intervals for the last day
      startDate.setDate(startDate.getDate() - 1);
      for (let i = 0; i < 24; i++) {
        const intervalEnd = new Date(endDate);
        intervalEnd.setHours(endDate.getHours() - i);

        const intervalStart = new Date(intervalEnd);
        intervalStart.setHours(intervalEnd.getHours() - 1);

        intervals.unshift({
          start: intervalStart,
          end: intervalEnd,
          label: intervalStart.getHours() + ":00",
        });
      }
      break;

    case "week":
      // Daily intervals for the last week
      startDate.setDate(startDate.getDate() - 7);
      for (let i = 0; i < 7; i++) {
        const intervalEnd = new Date(endDate);
        intervalEnd.setDate(endDate.getDate() - i);

        const intervalStart = new Date(intervalEnd);
        intervalStart.setDate(intervalEnd.getDate() - 1);

        const days = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
        intervals.unshift({
          start: intervalStart,
          end: intervalEnd,
          label: days[intervalStart.getDay()],
        });
      }
      break;

    case "month":
      // Weekly intervals for the last month
      startDate.setMonth(startDate.getMonth() - 1);
      for (let i = 0; i < 4; i++) {
        const intervalEnd = new Date(endDate);
        intervalEnd.setDate(endDate.getDate() - i * 7);

        const intervalStart = new Date(intervalEnd);
        intervalStart.setDate(intervalEnd.getDate() - 7);

        intervals.unshift({
          start: intervalStart,
          end: intervalEnd,
          label: `W${i + 1}`,
        });
      }
      break;

    case "year":
      // Monthly intervals for the last year
      startDate.setFullYear(startDate.getFullYear() - 1);
      for (let i = 0; i < 12; i++) {
        const intervalEnd = new Date(endDate);
        intervalEnd.setMonth(endDate.getMonth() - i);

        const intervalStart = new Date(intervalEnd);
        intervalStart.setMonth(intervalEnd.getMonth() - 1);

        const months = [
          "Jan",
          "Feb",
          "Mär",
          "Apr",
          "Mai",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Okt",
          "Nov",
          "Dez",
        ];
        intervals.unshift({
          start: intervalStart,
          end: intervalEnd,
          label: months[intervalStart.getMonth()],
        });
      }
      break;
  }

  // Count documents by interval and status
  const successData: number[] = [];
  const errorData: number[] = [];
  const processingData: number[] = [];

  intervals.forEach((interval) => {
    const intervalDocs = store.convertedDocuments.filter((doc) => {
      if (!doc.uploadedAt) return false;
      const docDate = new Date(doc.uploadedAt);
      return docDate >= interval.start && docDate <= interval.end;
    });

    successData.push(
      intervalDocs.filter((doc) => doc.status === "success").length,
    );
    errorData.push(intervalDocs.filter((doc) => doc.status === "error").length);
    processingData.push(
      intervalDocs.filter(
        (doc) => doc.status === "pending" || doc.status === "processing",
      ).length,
    );
  });

  // Create chart
  const ctx = trendChart.value.getContext("2d");
  if (!ctx) return;

  trendChartInstance = new Chart.value.Chart(ctx, {
    type: "line",
    data: {
      labels: intervals.map((interval) => interval.label),
      datasets: [
        {
          label: t("documentConverter.stats.statusSuccess", "Erfolgreich"),
          data: successData,
          backgroundColor: chartColors.success,
          borderColor: chartColors.success.replace("0.6", "1"),
          borderWidth: 2,
          fill: false,
          tension: 0.1,
        },
        {
          label: t("documentConverter.stats.statusError", "Fehler"),
          data: errorData,
          backgroundColor: chartColors.error,
          borderColor: chartColors.error.replace("0.6", "1"),
          borderWidth: 2,
          fill: false,
          tension: 0.1,
        },
        {
          label: t("documentConverter.stats.inProgress", "In Bearbeitung"),
          data: processingData,
          backgroundColor: chartColors.processing,
          borderColor: chartColors.processing.replace("0.6", "1"),
          borderWidth: 2,
          fill: false,
          tension: 0.1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: t(
              "documentConverter.stats.documentCount",
              "Anzahl Dokumente",
            ),
          },
        },
        x: {
          title: {
            display: true,
            text: t("documentConverter.stats.timePeriod", "Zeitraum"),
          },
        },
      },
      plugins: {
        legend: {
          position: "bottom",
        },
      },
    },
  });
}

function renderSizeChart() {
  if (!sizeChart.value || !Chart.value) return;

  // Destroy previous chart if it exists
  if (sizeChartInstance) {
    sizeChartInstance.destroy();
  }

  // Group documents by size ranges
  const sizeRanges = [
    { max: 100 * 1024, label: "< 100 KB" },
    { max: 500 * 1024, label: "100 KB - 500 KB" },
    { max: 1 * 1024 * 1024, label: "500 KB - 1 MB" },
    { max: 5 * 1024 * 1024, label: "1 MB - 5 MB" },
    { max: 10 * 1024 * 1024, label: "5 MB - 10 MB" },
    { max: Number.MAX_SAFE_INTEGER, label: "> 10 MB" },
  ];

  const sizeCounts = sizeRanges.map(() => 0);

  filteredDocuments.value.forEach((doc) => {
    const size = doc.size || 0;
    const rangeIndex = sizeRanges.findIndex((range) => size < range.max);
    if (rangeIndex !== -1) {
      sizeCounts[rangeIndex]++;
    }
  });

  // Create chart
  const ctx = sizeChart.value.getContext("2d");
  if (!ctx) return;

  sizeChartInstance = new Chart.value.Chart(ctx, {
    type: "bar",
    data: {
      labels: sizeRanges.map((range) => range.label),
      datasets: [
        {
          label: t("documentConverter.stats.fileCount", "Anzahl Dateien"),
          data: sizeCounts,
          backgroundColor: chartColors.pdf,
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: t(
              "documentConverter.stats.documentCount",
              "Anzahl Dokumente",
            ),
          },
        },
        x: {
          title: {
            display: true,
            text: t("documentConverter.stats.fileSize", "Dateigröße"),
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
      },
    },
  });
}

// Data export functions
function exportStats(format: "csv" | "json") {
  // Prepare export data
  const exportData = filteredDocuments.value.map((doc) => ({
    id: doc.id,
    name: doc.originalName,
    format: doc.originalFormat,
    size: doc.size,
    uploadDate: doc.uploadedAt ? new Date(doc.uploadedAt).toISOString() : null,
    conversionDate: doc.convertedAt
      ? new Date(doc.convertedAt).toISOString()
      : null,
    status: doc.status,
    duration: doc.duration,
  }));

  let content = "";
  let mimeType = "";
  let fileName = `conversion_stats_${new Date().toISOString().split("T")[0]}`;

  if (format === "csv") {
    // Generate CSV
    const headers = [
      "ID",
      "Name",
      "Format",
      "Size (bytes)",
      "Upload Date",
      "Conversion Date",
      "Status",
      "Duration (ms)",
    ];
    content = headers.join(",") + "\n";

    exportData.forEach((doc) => {
      const row = [
        doc.id,
        `"${doc.name.replace(/"/g, '""')}"`, // Escape quotes in CSV
        doc.format,
        doc.size,
        doc.uploadDate,
        doc.conversionDate,
        doc.status,
        doc.duration,
      ];
      content += row.join(",") + "\n";
    });

    mimeType = "text/csv";
    fileName += ".csv";
  } else {
    // Generate JSON
    content = JSON.stringify(exportData, null, 2);
    mimeType = "application/json";
    fileName += ".json";
  }

  // Create download link
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();

  // Clean up
  URL.revokeObjectURL(url);
}

// Lifecycle hooks
onMounted(async () => {
  // Load chart library
  await loadChartLibrary();

  // Initialize store if needed
  if (!store.initialized) {
    await store.initialize();
  }

  // Render charts
  renderFormatChart();
  renderStatusChart();
  renderTrendChart();
  renderSizeChart();

  isLoading.value = false;

  // Add window resize listener
  window.addEventListener("resize", handleResize);
});

onUnmounted(() => {
  // Cleanup chart instances
  if (formatChartInstance) formatChartInstance.destroy();
  if (statusChartInstance) statusChartInstance.destroy();
  if (trendChartInstance) trendChartInstance.destroy();
  if (sizeChartInstance) sizeChartInstance.destroy();

  // Remove resize listener
  window.removeEventListener("resize", handleResize);
});

// Handle window resize
function handleResize() {
  if (formatChartInstance) formatChartInstance.update();
  if (statusChartInstance) statusChartInstance.update();
  if (trendChartInstance) trendChartInstance.update();
  if (sizeChartInstance) sizeChartInstance.update();
}

// Watch for changes in filters
watch([timeRange, groupBy], () => {
  renderFormatChart();
  renderStatusChart();
  renderTrendChart();
  renderSizeChart();
});

// Watch for store updates
watch(
  () => store.convertedDocuments.length,
  () => {
    renderFormatChart();
    renderStatusChart();
    renderTrendChart();
    renderSizeChart();
  },
);
</script>

<style scoped>
.conversion-stats {
  width: 100%;
  padding: 1.5rem;
  background-color: var(--n-color-background, #f8f9fa);
  border-radius: var(--n-border-radius, 8px);
  box-shadow: var(--n-shadow-sm, 0 2px 5px rgba(0, 0, 0, 0.05));
}

.conversion-stats__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.conversion-stats__title {
  font-size: 1.5rem;
  margin: 0;
  color: var(--n-color-text, #212529);
}

.conversion-stats__actions {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
}

.conversion-stats__filters {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.conversion-stats__filter-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--n-color-text-secondary, #6c757d);
}

.conversion-stats__select {
  padding: 0.375rem 0.75rem;
  border: 1px solid var(--n-color-border, #ced4da);
  border-radius: var(--n-border-radius-sm, 4px);
  background-color: var(--n-color-background-input, #fff);
  color: var(--n-color-text, #212529);
  font-size: 0.875rem;
}

.conversion-stats__export {
  display: flex;
  gap: 0.5rem;
}

.conversion-stats__export-btn {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  border: 1px solid var(--n-color-border, #ced4da);
  border-radius: var(--n-border-radius-sm, 4px);
  background-color: var(--n-color-background-alt, #f1f3f5);
  color: var(--n-color-text, #212529);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.conversion-stats__export-btn:hover {
  background-color: var(--n-color-background-hover, #e9ecef);
}

.conversion-stats__summary {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.conversion-stats__card {
  background-color: var(--n-color-background-secondary, #fff);
  border-radius: var(--n-border-radius, 8px);
  box-shadow: var(--n-shadow-sm, 0 2px 5px rgba(0, 0, 0, 0.05));
  padding: 1.25rem;
  text-align: center;
  border-top: 4px solid var(--n-color-border, #dee2e6);
}

.conversion-stats__card--success {
  border-top-color: var(--n-color-success, #2ecc71);
}

.conversion-stats__card--error {
  border-top-color: var(--n-color-error, #e74c3c);
}

.conversion-stats__card--info {
  border-top-color: var(--n-color-info, #3498db);
}

.conversion-stats__card-title {
  font-weight: 500;
  font-size: 0.875rem;
  color: var(--n-color-text-secondary, #6c757d);
  margin-bottom: 0.5rem;
}

.conversion-stats__card-value {
  font-weight: 600;
  font-size: 1.5rem;
  color: var(--n-color-text, #212529);
}

.conversion-stats__charts {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.conversion-stats__chart {
  background-color: var(--n-color-background-secondary, #fff);
  border-radius: var(--n-border-radius, 8px);
  box-shadow: var(--n-shadow-sm, 0 2px 5px rgba(0, 0, 0, 0.05));
  padding: 1.25rem;
}

.conversion-stats__chart--full {
  grid-column: 1 / -1;
}

.conversion-stats__chart-title {
  font-size: 1rem;
  margin: 0 0 1rem;
  color: var(--n-color-text, #212529);
}

.conversion-stats__chart-container {
  height: 250px;
  position: relative;
}

.conversion-stats__loading {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.8);
  z-index: 10;
}

.conversion-stats__spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-top: 3px solid var(--n-color-primary, #4a6cf7);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 0.5rem;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.conversion-stats__table-container {
  background-color: var(--n-color-background-secondary, #fff);
  border-radius: var(--n-border-radius, 8px);
  box-shadow: var(--n-shadow-sm, 0 2px 5px rgba(0, 0, 0, 0.05));
  padding: 1.25rem;
  overflow-x: auto;
}

.conversion-stats__table-title {
  font-size: 1rem;
  margin: 0 0 1rem;
  color: var(--n-color-text, #212529);
}

.conversion-stats__table {
  width: 100%;
  border-collapse: collapse;
}

.conversion-stats__table th,
.conversion-stats__table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--n-color-border, #dee2e6);
  font-size: 0.875rem;
}

.conversion-stats__table th {
  font-weight: 600;
  color: var(--n-color-text, #212529);
  background-color: var(--n-color-background-alt, #f8f9fa);
}

.conversion-stats__table td {
  color: var(--n-color-text-secondary, #6c757d);
}

.conversion-stats__row--error td {
  background-color: var(--n-color-error-light, rgba(231, 76, 60, 0.05));
}

.conversion-stats__status-pill {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 500;
}

.conversion-stats__status-pill--success {
  background-color: var(--n-color-success-light, rgba(46, 204, 113, 0.15));
  color: var(--n-color-success, #2ecc71);
}

.conversion-stats__status-pill--error {
  background-color: var(--n-color-error-light, rgba(231, 76, 60, 0.15));
  color: var(--n-color-error, #e74c3c);
}

.conversion-stats__status-pill--processing {
  background-color: var(--n-color-warning-light, rgba(241, 196, 15, 0.15));
  color: var(--n-color-warning, #f1c40f);
}

.conversion-stats__status-pill--pending {
  background-color: var(--n-color-info-light, rgba(52, 152, 219, 0.15));
  color: var(--n-color-info, #3498db);
}

.conversion-stats__status-pill--default {
  background-color: var(--n-color-background-alt, #f8f9fa);
  color: var(--n-color-text-secondary, #6c757d);
}

.conversion-stats__empty {
  text-align: center;
  padding: 2rem;
  color: var(--n-color-text-tertiary, #adb5bd);
}

/* Responsive styles */
@media (max-width: 992px) {
  .conversion-stats__charts {
    grid-template-columns: 1fr;
  }

  .conversion-stats__chart {
    grid-column: auto;
  }
}

@media (max-width: 768px) {
  .conversion-stats__header {
    flex-direction: column;
    align-items: flex-start;
  }

  .conversion-stats__actions {
    width: 100%;
    flex-direction: column;
    align-items: flex-start;
  }

  .conversion-stats__filters {
    width: 100%;
  }

  .conversion-stats__export {
    margin-top: 0.5rem;
  }

  .conversion-stats__summary {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }
}
</style>
