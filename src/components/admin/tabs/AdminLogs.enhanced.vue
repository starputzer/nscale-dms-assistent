<template>
  <div class="admin-logs-enhanced">
    <div class="admin-logs-enhanced__header">
      <h2 class="admin-logs-enhanced__title">
        {{ t("admin.logs.title", "Systemprotokolle") }}
      </h2>
      <div class="admin-logs-enhanced__actions">
        <Button variant="secondary" @click="refreshLogs" :loading="isLoading">
          <i class="fas fa-sync-alt"></i>
          {{ t("admin.logs.refresh", "Aktualisieren") }}
        </Button>
        <Button
          variant="primary"
          @click="exportLogs"
          :disabled="filteredLogs.length === 0"
        >
          <i class="fas fa-download"></i>
          {{ t("admin.logs.export", "Exportieren") }}
        </Button>
      </div>
    </div>

    <!-- Filters and Search -->
    <div class="admin-logs-enhanced__controls">
      <div class="admin-logs-enhanced__search">
        <div class="admin-logs-enhanced__search-wrapper">
          <i class="fas fa-search admin-logs-enhanced__search-icon"></i>
          <input
            v-model="searchQuery"
            type="text"
            class="admin-logs-enhanced__search-input"
            :placeholder="
              t('admin.logs.searchPlaceholder', 'Suche in Protokollen...')
            "
            @input="debouncedSearch"
          />
          <button
            v-if="searchQuery"
            @click="clearSearch"
            class="admin-logs-enhanced__search-clear"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>

      <div class="admin-logs-enhanced__filters">
        <Select
          v-model="selectedLevel"
          :placeholder="t('admin.logs.allLevels', 'Alle Level')"
          :options="logLevels"
          class="admin-logs-enhanced__filter"
        />

        <Select
          v-model="selectedSource"
          :placeholder="t('admin.logs.allSources', 'Alle Quellen')"
          :options="logSources"
          class="admin-logs-enhanced__filter"
        />

        <DateRangePicker
          v-model="dateRange"
          :placeholder="t('admin.logs.dateRange', 'Zeitraum wählen')"
          class="admin-logs-enhanced__filter"
          :presets="datePresets"
        />

        <button
          v-if="hasActiveFilters"
          @click="clearFilters"
          class="admin-logs-enhanced__clear-filters"
        >
          {{ t("admin.logs.clearFilters", "Filter zurücksetzen") }}
        </button>
      </div>
    </div>

    <!-- Real-time Status Bar -->
    <div class="admin-logs-enhanced__status-bar">
      <div class="admin-logs-enhanced__status-item">
        <span class="admin-logs-enhanced__status-label">
          {{ t("admin.logs.totalLogs", "Gesamt") }}
        </span>
        <span class="admin-logs-enhanced__status-value">
          {{ totalLogs.toLocaleString("de-DE") }}
        </span>
      </div>
      <div class="admin-logs-enhanced__status-item">
        <span class="admin-logs-enhanced__status-label">
          {{ t("admin.logs.errorsToday", "Fehler heute") }}
        </span>
        <span class="admin-logs-enhanced__status-value error">
          {{ errorsToday }}
        </span>
      </div>
      <div class="admin-logs-enhanced__status-item">
        <span class="admin-logs-enhanced__status-label">
          {{ t("admin.logs.warningsToday", "Warnungen heute") }}
        </span>
        <span class="admin-logs-enhanced__status-value warning">
          {{ warningsToday }}
        </span>
      </div>
      <div class="admin-logs-enhanced__status-item">
        <span class="admin-logs-enhanced__status-label">
          {{ t("admin.logs.lastUpdate", "Letzte Aktualisierung") }}
        </span>
        <span class="admin-logs-enhanced__status-value">
          {{ lastUpdateTime }}
        </span>
      </div>
      <div class="admin-logs-enhanced__status-item">
        <Toggle
          v-model="autoRefresh"
          :label="t('admin.logs.autoRefresh', 'Auto-Refresh')"
        />
      </div>
    </div>

    <!-- Log Viewer -->
    <div class="admin-logs-enhanced__viewer">
      <div
        v-if="isLoading && logs.length === 0"
        class="admin-logs-enhanced__loading"
      >
        <Spinner size="large" />
        <p>{{ t("admin.logs.loading", "Lade Protokolle...") }}</p>
      </div>

      <div
        v-else-if="filteredLogs.length === 0"
        class="admin-logs-enhanced__empty"
      >
        <i class="fas fa-inbox admin-logs-enhanced__empty-icon"></i>
        <p>{{ t("admin.logs.noLogs", "Keine Protokolle gefunden") }}</p>
        <p v-if="hasActiveFilters" class="admin-logs-enhanced__empty-subtitle">
          {{
            t("admin.logs.tryDifferentFilters", "Versuchen Sie andere Filter")
          }}
        </p>
      </div>

      <div v-else class="admin-logs-enhanced__list">
        <!-- Streaming indicator -->
        <div v-if="isStreaming" class="admin-logs-enhanced__streaming">
          <div class="admin-logs-enhanced__streaming-indicator"></div>
          <span>{{ t("admin.logs.streaming", "Live-Updates aktiv") }}</span>
        </div>

        <!-- Virtual scroll container for large datasets -->
        <VirtualList
          :items="filteredLogs"
          :height="600"
          :itemHeight="getItemHeight"
          :buffer="5"
          class="admin-logs-enhanced__virtual-list"
        >
          <template v-slot:default="{ item }">
            <div
              :class="['admin-logs-enhanced__log-entry', `level-${item.level}`]"
              :key="item.id"
            >
              <div class="admin-logs-enhanced__log-header">
                <div class="admin-logs-enhanced__log-meta">
                  <span class="admin-logs-enhanced__log-timestamp">
                    {{ formatTimestamp(item.timestamp) }}
                  </span>
                  <span
                    :class="[
                      'admin-logs-enhanced__log-level',
                      `level-${item.level}`,
                    ]"
                  >
                    {{ item.level.toUpperCase() }}
                  </span>
                  <span class="admin-logs-enhanced__log-source">
                    {{ item.source }}
                  </span>
                  <span
                    v-if="item.sessionId"
                    class="admin-logs-enhanced__log-session"
                  >
                    Session: {{ item.sessionId.slice(0, 8) }}...
                  </span>
                  <span
                    v-if="item.userId"
                    class="admin-logs-enhanced__log-user"
                  >
                    User: {{ item.userId }}
                  </span>
                </div>
                <div class="admin-logs-enhanced__log-actions">
                  <button
                    @click="toggleDetails(item.id)"
                    v-if="item.details || item.stackTrace"
                    class="admin-logs-enhanced__log-action"
                    :title="t('admin.logs.toggleDetails', 'Details anzeigen')"
                  >
                    <i
                      :class="
                        expandedLogs.has(item.id)
                          ? 'fas fa-chevron-up'
                          : 'fas fa-chevron-down'
                      "
                    ></i>
                  </button>
                  <button
                    @click="copyLog(item)"
                    class="admin-logs-enhanced__log-action"
                    :title="t('admin.logs.copy', 'Kopieren')"
                  >
                    <i class="fas fa-copy"></i>
                  </button>
                  <button
                    @click="viewContext(item)"
                    class="admin-logs-enhanced__log-action"
                    :title="t('admin.logs.viewContext', 'Kontext anzeigen')"
                  >
                    <i class="fas fa-external-link-alt"></i>
                  </button>
                </div>
              </div>

              <div class="admin-logs-enhanced__log-message">
                <span v-html="highlightSearchTerms(item.message)"></span>
              </div>

              <Transition name="expand">
                <div
                  v-if="expandedLogs.has(item.id)"
                  class="admin-logs-enhanced__log-details"
                >
                  <div
                    v-if="item.details"
                    class="admin-logs-enhanced__log-detail-section"
                  >
                    <h4>{{ t("admin.logs.details", "Details") }}</h4>
                    <pre>{{ JSON.stringify(item.details, null, 2) }}</pre>
                  </div>

                  <div
                    v-if="item.stackTrace"
                    class="admin-logs-enhanced__log-detail-section"
                  >
                    <h4>{{ t("admin.logs.stackTrace", "Stack Trace") }}</h4>
                    <pre class="admin-logs-enhanced__stack-trace">{{
                      item.stackTrace
                    }}</pre>
                  </div>

                  <div
                    v-if="item.context"
                    class="admin-logs-enhanced__log-detail-section"
                  >
                    <h4>{{ t("admin.logs.context", "Kontext") }}</h4>
                    <div class="admin-logs-enhanced__context-items">
                      <div
                        v-for="(value, key) in item.context"
                        :key="key"
                        class="admin-logs-enhanced__context-item"
                      >
                        <span class="admin-logs-enhanced__context-key"
                          >{{ key }}:</span
                        >
                        <span class="admin-logs-enhanced__context-value">{{
                          formatContextValue(value)
                        }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Transition>
            </div>
          </template>
        </VirtualList>

        <!-- Load more button for pagination -->
        <div
          v-if="hasMore && !isLoading"
          class="admin-logs-enhanced__load-more"
        >
          <Button
            variant="secondary"
            @click="loadMore"
            :loading="isLoadingMore"
          >
            {{ t("admin.logs.loadMore", "Mehr laden") }}
          </Button>
        </div>
      </div>
    </div>

    <!-- Log Analytics -->
    <div v-if="showAnalytics" class="admin-logs-enhanced__analytics">
      <h3 class="admin-logs-enhanced__analytics-title">
        {{ t("admin.logs.analytics", "Log-Analyse") }}
      </h3>

      <div class="admin-logs-enhanced__analytics-grid">
        <!-- Log Level Distribution -->
        <div class="admin-logs-enhanced__chart-card">
          <h4>
            {{ t("admin.logs.levelDistribution", "Verteilung nach Level") }}
          </h4>
          <canvas ref="levelChart" class="admin-logs-enhanced__chart"></canvas>
        </div>

        <!-- Timeline Chart -->
        <div class="admin-logs-enhanced__chart-card">
          <h4>{{ t("admin.logs.timeline", "Zeitverlauf") }}</h4>
          <canvas
            ref="timelineChart"
            class="admin-logs-enhanced__chart"
          ></canvas>
        </div>

        <!-- Top Error Sources -->
        <div class="admin-logs-enhanced__chart-card">
          <h4>
            {{ t("admin.logs.topErrorSources", "Häufigste Fehlerquellen") }}
          </h4>
          <div class="admin-logs-enhanced__top-list">
            <div
              v-for="source in topErrorSources"
              :key="source.name"
              class="admin-logs-enhanced__top-item"
            >
              <span class="admin-logs-enhanced__top-name">{{
                source.name
              }}</span>
              <span class="admin-logs-enhanced__top-count">{{
                source.count
              }}</span>
            </div>
          </div>
        </div>

        <!-- Recent Patterns -->
        <div class="admin-logs-enhanced__chart-card">
          <h4>{{ t("admin.logs.recentPatterns", "Aktuelle Muster") }}</h4>
          <div class="admin-logs-enhanced__patterns">
            <div
              v-for="pattern in recentPatterns"
              :key="pattern.id"
              class="admin-logs-enhanced__pattern"
            >
              <span class="admin-logs-enhanced__pattern-text">{{
                pattern.pattern
              }}</span>
              <span class="admin-logs-enhanced__pattern-count"
                >{{ pattern.count }}x</span
              >
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Context Modal -->
    <Dialog v-model="showContextModal">
      <DialogTitle>{{ t("admin.logs.logContext", "Log-Kontext") }}</DialogTitle>
      <DialogContent>
        <div v-if="selectedLog" class="admin-logs-enhanced__context-modal">
          <div class="admin-logs-enhanced__context-timeline">
            <h4>{{ t("admin.logs.surroundingLogs", "Umgebende Logs") }}</h4>
            <div
              v-for="log in contextLogs"
              :key="log.id"
              :class="[
                'admin-logs-enhanced__context-log',
                { active: log.id === selectedLog.id },
              ]"
            >
              <span class="admin-logs-enhanced__context-time">
                {{ formatTimestamp(log.timestamp) }}
              </span>
              <span
                :class="[
                  'admin-logs-enhanced__context-level',
                  `level-${log.level}`,
                ]"
              >
                {{ log.level }}
              </span>
              <span class="admin-logs-enhanced__context-message">
                {{ log.message }}
              </span>
            </div>
          </div>

          <div class="admin-logs-enhanced__context-details">
            <h4>{{ t("admin.logs.fullDetails", "Vollständige Details") }}</h4>
            <pre>{{ JSON.stringify(selectedLog, null, 2) }}</pre>
          </div>
        </div>
      </DialogContent>
      <DialogActions>
        <Button variant="secondary" @click="closeContextModal">
          {{ t("common.close", "Schließen") }}
        </Button>
      </DialogActions>
    </Dialog>

    <!-- Export Options Modal -->
    <Dialog v-model="showExportModal">
      <DialogTitle>{{
        t("admin.logs.exportOptions", "Export-Optionen")
      }}</DialogTitle>
      <DialogContent>
        <div class="admin-logs-enhanced__export-options">
          <div class="admin-logs-enhanced__export-field">
            <FormLabel>{{ t("admin.logs.exportFormat", "Format") }}</FormLabel>
            <RadioGroup v-model="exportFormat" :options="exportFormats" />
          </div>

          <div class="admin-logs-enhanced__export-field">
            <FormLabel>{{ t("admin.logs.exportRange", "Zeitraum") }}</FormLabel>
            <RadioGroup v-model="exportRange" :options="exportRanges" />
          </div>

          <div
            v-if="exportRange === 'custom'"
            class="admin-logs-enhanced__export-field"
          >
            <FormLabel>{{
              t("admin.logs.customRange", "Benutzerdefinierter Zeitraum")
            }}</FormLabel>
            <DateRangePicker v-model="exportDateRange" />
          </div>

          <div class="admin-logs-enhanced__export-field">
            <FormToggle
              v-model="includeStackTraces"
              :label="
                t('admin.logs.includeStackTraces', 'Stack Traces einschließen')
              "
            />
          </div>

          <div class="admin-logs-enhanced__export-field">
            <FormToggle
              v-model="includeContext"
              :label="t('admin.logs.includeContext', 'Kontext einschließen')"
            />
          </div>
        </div>
      </DialogContent>
      <DialogActions>
        <Button variant="secondary" @click="closeExportModal">
          {{ t("common.cancel", "Abbrechen") }}
        </Button>
        <Button variant="primary" @click="performExport" :loading="isExporting">
          {{ t("admin.logs.export", "Exportieren") }}
        </Button>
      </DialogActions>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useI18n } from "vue-i18n";
import { storeToRefs } from "pinia";
import { useAdminLogsStore } from "@/stores/admin/logs";
import { useToast } from "@/composables/useToast";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import Chart from "chart.js/auto";
import { debounce } from "lodash-es";

// UI Components
import {
  Button,
  Select,
  Toggle,
  Spinner,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormLabel,
  FormToggle,
  RadioGroup,
  VirtualList,
  DateRangePicker,
} from "@/components/ui/base";

// i18n
const { t, locale } = useI18n({ useScope: "global", inheritLocale: true });
console.log("[i18n] Component initialized with global scope and inheritance");

// Store
const logsStore = useAdminLogsStore();
const { logs, isLoading, hasMore, totalLogs, stats } = storeToRefs(logsStore);

// Toast
const toast = useToast();

// Refs
const levelChart = ref<HTMLCanvasElement>();
const timelineChart = ref<HTMLCanvasElement>();

// State
const searchQuery = ref("");
const selectedLevel = ref("");
const selectedSource = ref("");
const dateRange = ref<[Date, Date] | null>(null);
const autoRefresh = ref(true);
const expandedLogs = ref(new Set<string>());
const currentPage = ref(1);
const isLoadingMore = ref(false);
const isStreaming = ref(true);
const lastUpdateTime = ref(new Date());

// Modals
const showContextModal = ref(false);
const showExportModal = ref(false);
const selectedLog = ref(null);
const contextLogs = ref([]);

// Export options
const exportFormat = ref("json");
const exportRange = ref("current");
const exportDateRange = ref<[Date, Date] | null>(null);
const includeStackTraces = ref(true);
const includeContext = ref(true);
const isExporting = ref(false);

// Analytics
const showAnalytics = ref(true);
const topErrorSources = ref([]);
const recentPatterns = ref([]);

// Chart instances
let levelChartInstance: Chart | null = null;
let timelineChartInstance: Chart | null = null;

// Refresh interval
let refreshInterval: number | null = null;

// Options
const logLevels = [
  { value: "", label: t("admin.logs.allLevels", "Alle Level") },
  { value: "error", label: t("admin.logs.error", "Fehler") },
  { value: "warning", label: t("admin.logs.warning", "Warnung") },
  { value: "info", label: t("admin.logs.info", "Info") },
  { value: "debug", label: t("admin.logs.debug", "Debug") },
];

const logSources = computed(() => {
  const sources = new Set(logs.value.map((log) => log.source));
  return [
    { value: "", label: t("admin.logs.allSources", "Alle Quellen") },
    ...Array.from(sources).map((source) => ({ value: source, label: source })),
  ];
});

const datePresets = [
  {
    label: t("admin.logs.last15Minutes", "Letzte 15 Minuten"),
    value: () => [new Date(Date.now() - 15 * 60 * 1000), new Date()],
  },
  {
    label: t("admin.logs.lastHour", "Letzte Stunde"),
    value: () => [new Date(Date.now() - 60 * 60 * 1000), new Date()],
  },
  {
    label: t("admin.logs.last24Hours", "Letzte 24 Stunden"),
    value: () => [new Date(Date.now() - 24 * 60 * 60 * 1000), new Date()],
  },
  {
    label: t("admin.logs.last7Days", "Letzte 7 Tage"),
    value: () => [new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), new Date()],
  },
];

const exportFormats = [
  { value: "json", label: "JSON" },
  { value: "csv", label: "CSV" },
  { value: "txt", label: "Text" },
];

const exportRanges = [
  { value: "current", label: t("admin.logs.currentView", "Aktuelle Ansicht") },
  { value: "today", label: t("admin.logs.today", "Heute") },
  { value: "last24h", label: t("admin.logs.last24Hours", "Letzte 24 Stunden") },
  { value: "custom", label: t("admin.logs.custom", "Benutzerdefiniert") },
];

// Computed properties
const filteredLogs = computed(() => {
  let result = logs.value;

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(
      (log) =>
        log.message.toLowerCase().includes(query) ||
        log.source.toLowerCase().includes(query) ||
        (log.details &&
          JSON.stringify(log.details).toLowerCase().includes(query)),
    );
  }

  if (selectedLevel.value) {
    result = result.filter((log) => log.level === selectedLevel.value);
  }

  if (selectedSource.value) {
    result = result.filter((log) => log.source === selectedSource.value);
  }

  if (dateRange.value) {
    const [start, end] = dateRange.value;
    result = result.filter((log) => {
      const logDate = new Date(log.timestamp);
      return logDate >= start && logDate <= end;
    });
  }

  return result;
});

const hasActiveFilters = computed(() => {
  return (
    searchQuery.value ||
    selectedLevel.value ||
    selectedSource.value ||
    dateRange.value
  );
});

const errorsToday = computed(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return logs.value.filter(
    (log) => log.level === "error" && new Date(log.timestamp) >= today,
  ).length;
});

const warningsToday = computed(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return logs.value.filter(
    (log) => log.level === "warning" && new Date(log.timestamp) >= today,
  ).length;
});

const lastUpdateTimeFormatted = computed(() => {
  return formatDistanceToNow(lastUpdateTime.value, {
    addSuffix: true,
    locale: de,
  });
});

// Methods
const debouncedSearch = debounce(() => {
  currentPage.value = 1;
  loadLogs();
}, 300);

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString("de-DE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
  });
}

function getItemHeight(item: any): number {
  // Dynamic height based on whether the log is expanded
  if (expandedLogs.value.has(item.id)) {
    return 200 + (item.stackTrace ? 100 : 0) + (item.details ? 50 : 0);
  }
  return 80;
}

function highlightSearchTerms(text: string): string {
  if (!searchQuery.value) return text;

  const regex = new RegExp(`(${searchQuery.value})`, "gi");
  return text.replace(regex, "<mark>$1</mark>");
}

function toggleDetails(logId: string) {
  if (expandedLogs.value.has(logId)) {
    expandedLogs.value.delete(logId);
  } else {
    expandedLogs.value.add(logId);
  }
}

function copyLog(log: any) {
  const text = `[${formatTimestamp(log.timestamp)}] [${log.level.toUpperCase()}] [${log.source}] ${log.message}`;
  navigator.clipboard.writeText(text);
  toast.success(t("admin.logs.copied", "In Zwischenablage kopiert"));
}

async function viewContext(log: any) {
  selectedLog.value = log;

  // Load surrounding logs
  try {
    const response = await logsStore.getLogContext(log.id, {
      before: 5,
      after: 5,
    });
    contextLogs.value = response.logs;
  } catch (error) {
    toast.error(
      t("admin.logs.contextLoadError", "Fehler beim Laden des Kontexts"),
    );
  }

  showContextModal.value = true;
}

function closeContextModal() {
  showContextModal.value = false;
  selectedLog.value = null;
  contextLogs.value = [];
}

function clearSearch() {
  searchQuery.value = "";
  debouncedSearch();
}

function clearFilters() {
  searchQuery.value = "";
  selectedLevel.value = "";
  selectedSource.value = "";
  dateRange.value = null;
  currentPage.value = 1;
  loadLogs();
}

async function refreshLogs() {
  lastUpdateTime.value = new Date();
  await loadLogs();
}

async function loadLogs() {
  try {
    await logsStore.fetchLogs({
      page: currentPage.value,
      search: searchQuery.value,
      level: selectedLevel.value,
      source: selectedSource.value,
      startDate: dateRange.value?.[0],
      endDate: dateRange.value?.[1],
    });
    updateCharts();
    updateAnalytics();
  } catch (error) {
    toast.error(t("admin.logs.loadError", "Fehler beim Laden der Logs"));
  }
}

async function loadMore() {
  isLoadingMore.value = true;
  currentPage.value++;
  try {
    await logsStore.fetchMoreLogs({
      page: currentPage.value,
      search: searchQuery.value,
      level: selectedLevel.value,
      source: selectedSource.value,
      startDate: dateRange.value?.[0],
      endDate: dateRange.value?.[1],
    });
  } catch (error) {
    toast.error(
      t("admin.logs.loadMoreError", "Fehler beim Laden weiterer Logs"),
    );
  } finally {
    isLoadingMore.value = false;
  }
}

function openExportModal() {
  showExportModal.value = true;
}

function closeExportModal() {
  showExportModal.value = false;
}

async function performExport() {
  isExporting.value = true;

  try {
    const options = {
      format: exportFormat.value,
      range: exportRange.value,
      dateRange: exportDateRange.value,
      includeStackTraces: includeStackTraces.value,
      includeContext: includeContext.value,
      filters: {
        search: searchQuery.value,
        level: selectedLevel.value,
        source: selectedSource.value,
      },
    };

    const blob = await logsStore.exportLogs(options);

    // Create download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `logs-${new Date().toISOString()}.${exportFormat.value}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(t("admin.logs.exportSuccess", "Logs erfolgreich exportiert"));
    closeExportModal();
  } catch (error) {
    toast.error(t("admin.logs.exportError", "Fehler beim Exportieren"));
  } finally {
    isExporting.value = false;
  }
}

function initCharts() {
  // Level distribution chart
  if (levelChart.value) {
    const ctx = levelChart.value.getContext("2d");
    if (ctx) {
      levelChartInstance = new Chart(ctx, {
        type: "doughnut",
        data: {
          labels: ["Error", "Warning", "Info", "Debug"],
          datasets: [
            {
              data: [0, 0, 0, 0],
              backgroundColor: ["#ef4444", "#f59e0b", "#3b82f6", "#6b7280"],
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "bottom",
            },
          },
        },
      });
    }
  }

  // Timeline chart
  if (timelineChart.value) {
    const ctx = timelineChart.value.getContext("2d");
    if (ctx) {
      timelineChartInstance = new Chart(ctx, {
        type: "line",
        data: {
          labels: [],
          datasets: [
            {
              label: "Errors",
              data: [],
              borderColor: "#ef4444",
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              tension: 0.1,
            },
            {
              label: "Warnings",
              data: [],
              borderColor: "#f59e0b",
              backgroundColor: "rgba(245, 158, 11, 0.1)",
              tension: 0.1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              type: "time",
              time: {
                unit: "hour",
              },
            },
            y: {
              beginAtZero: true,
            },
          },
        },
      });
    }
  }
}

function updateCharts() {
  // Update level distribution
  if (levelChartInstance) {
    const levelCounts = {
      error: filteredLogs.value.filter((log) => log.level === "error").length,
      warning: filteredLogs.value.filter((log) => log.level === "warning")
        .length,
      info: filteredLogs.value.filter((log) => log.level === "info").length,
      debug: filteredLogs.value.filter((log) => log.level === "debug").length,
    };

    levelChartInstance.data.datasets[0].data = [
      levelCounts.error,
      levelCounts.warning,
      levelCounts.info,
      levelCounts.debug,
    ];
    levelChartInstance.update();
  }

  // Update timeline
  if (timelineChartInstance) {
    const hourlyData = new Map();

    filteredLogs.value.forEach((log) => {
      const hour = new Date(log.timestamp);
      hour.setMinutes(0, 0, 0);
      const hourKey = hour.getTime();

      if (!hourlyData.has(hourKey)) {
        hourlyData.set(hourKey, { errors: 0, warnings: 0 });
      }

      const data = hourlyData.get(hourKey);
      if (log.level === "error") data.errors++;
      if (log.level === "warning") data.warnings++;
    });

    const sortedHours = Array.from(hourlyData.keys()).sort();

    timelineChartInstance.data.labels = sortedHours;
    timelineChartInstance.data.datasets[0].data = sortedHours.map(
      (hour) => hourlyData.get(hour).errors,
    );
    timelineChartInstance.data.datasets[1].data = sortedHours.map(
      (hour) => hourlyData.get(hour).warnings,
    );
    timelineChartInstance.update();
  }
}

function updateAnalytics() {
  // Calculate top error sources
  const sourceErrors = new Map();
  filteredLogs.value
    .filter((log) => log.level === "error")
    .forEach((log) => {
      sourceErrors.set(log.source, (sourceErrors.get(log.source) || 0) + 1);
    });

  topErrorSources.value = Array.from(sourceErrors.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Find recent patterns
  const patternCounts = new Map();
  filteredLogs.value.forEach((log) => {
    // Simple pattern extraction (could be more sophisticated)
    const words = log.message.split(" ").filter((word) => word.length > 4);
    words.forEach((word) => {
      patternCounts.set(word, (patternCounts.get(word) || 0) + 1);
    });
  });

  recentPatterns.value = Array.from(patternCounts.entries())
    .filter(([, count]) => count > 5)
    .map(([pattern, count]) => ({ id: pattern, pattern, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

function formatContextValue(value: any): string {
  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}

// WebSocket for real-time logs
function setupWebSocket() {
  if (!isStreaming.value) return;

  const ws = new WebSocket("ws://localhost:8000/api/admin/logs/stream");

  ws.onmessage = (event) => {
    const log = JSON.parse(event.data);
    logsStore.addStreamedLog(log);
    updateCharts();
    updateAnalytics();
    lastUpdateTime.value = new Date();
  };

  ws.onerror = (error) => {
    console.error("WebSocket error:", error);
    isStreaming.value = false;
  };

  ws.onclose = () => {
    isStreaming.value = false;
    // Attempt to reconnect after 5 seconds
    setTimeout(() => {
      if (autoRefresh.value) {
        setupWebSocket();
      }
    }, 5000);
  };

  return ws;
}

// Lifecycle
onMounted(() => {
  initCharts();
  loadLogs();

  // Setup WebSocket for real-time updates
  const ws = setupWebSocket();

  // Setup auto-refresh
  if (autoRefresh.value) {
    refreshInterval = window.setInterval(() => {
      refreshLogs();
    }, 30000); // Refresh every 30 seconds
  }

  // Cleanup
  onUnmounted(() => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }

    if (ws) {
      ws.close();
    }

    if (levelChartInstance) {
      levelChartInstance.destroy();
    }

    if (timelineChartInstance) {
      timelineChartInstance.destroy();
    }
  });
});

// Watch for auto-refresh changes
watch(autoRefresh, (newValue) => {
  if (newValue) {
    refreshInterval = window.setInterval(() => {
      refreshLogs();
    }, 30000);
  } else if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
});

// Export logs function needs to be exposed for the export button
const exportLogs = () => {
  openExportModal();
};

// Log i18n initialization status
console.log(
  `[AdminLogs.enhanced] i18n initialized with locale: ${locale.value}`,
);

// Log i18n initialization status
console.log(
  `[AdminLogs.enhanced] i18n initialized with locale: ${locale.value}`,
);
</script>

<style scoped>
.admin-logs-enhanced {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding: 1.5rem;
}

.admin-logs-enhanced__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--n-color-border);
}

.admin-logs-enhanced__title {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
  color: var(--n-color-text-primary);
}

.admin-logs-enhanced__actions {
  display: flex;
  gap: 0.5rem;
}

/* Controls */
.admin-logs-enhanced__controls {
  background-color: var(--n-color-background-alt);
  border-radius: var(--n-border-radius);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.admin-logs-enhanced__search {
  margin-bottom: 1rem;
}

.admin-logs-enhanced__search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.admin-logs-enhanced__search-icon {
  position: absolute;
  left: 1rem;
  color: var(--n-color-text-secondary);
}

.admin-logs-enhanced__search-input {
  width: 100%;
  padding: 0.75rem 3rem;
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
  background-color: var(--n-color-background);
  color: var(--n-color-text-primary);
  font-size: 0.9rem;
}

.admin-logs-enhanced__search-clear {
  position: absolute;
  right: 1rem;
  background: none;
  border: none;
  color: var(--n-color-text-secondary);
  cursor: pointer;
  padding: 0.5rem;
}

.admin-logs-enhanced__filters {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
}

.admin-logs-enhanced__filter {
  flex: 1;
  min-width: 200px;
}

.admin-logs-enhanced__clear-filters {
  padding: 0.5rem 1rem;
  background-color: transparent;
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
  color: var(--n-color-primary);
  cursor: pointer;
  transition: all 0.2s;
}

.admin-logs-enhanced__clear-filters:hover {
  background-color: var(--n-color-hover);
}

/* Status Bar */
.admin-logs-enhanced__status-bar {
  display: flex;
  gap: 2rem;
  align-items: center;
  padding: 1rem;
  background-color: var(--n-color-background);
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.admin-logs-enhanced__status-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.admin-logs-enhanced__status-label {
  font-size: 0.875rem;
  color: var(--n-color-text-secondary);
}

.admin-logs-enhanced__status-value {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--n-color-text-primary);
}

.admin-logs-enhanced__status-value.error {
  color: var(--n-color-error);
}

.admin-logs-enhanced__status-value.warning {
  color: var(--n-color-warning);
}

/* Log Viewer */
.admin-logs-enhanced__viewer {
  background-color: var(--n-color-background-alt);
  border-radius: var(--n-border-radius);
  padding: 1.5rem;
  min-height: 600px;
}

.admin-logs-enhanced__loading,
.admin-logs-enhanced__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  text-align: center;
}

.admin-logs-enhanced__empty-icon {
  font-size: 3rem;
  color: var(--n-color-text-tertiary);
  margin-bottom: 1rem;
}

.admin-logs-enhanced__empty-subtitle {
  color: var(--n-color-text-secondary);
  font-size: 0.9rem;
}

.admin-logs-enhanced__list {
  position: relative;
}

/* Streaming Indicator */
.admin-logs-enhanced__streaming {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: var(--n-color-success-light);
  border-radius: var(--n-border-radius);
  margin-bottom: 1rem;
  color: var(--n-color-success);
  font-size: 0.875rem;
  font-weight: 500;
}

.admin-logs-enhanced__streaming-indicator {
  width: 8px;
  height: 8px;
  background-color: var(--n-color-success);
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.2);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

/* Log Entry */
.admin-logs-enhanced__log-entry {
  background-color: var(--n-color-background);
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
  margin-bottom: 0.75rem;
  transition: all 0.2s ease;
}

.admin-logs-enhanced__log-entry:hover {
  box-shadow: var(--n-shadow-sm);
}

.admin-logs-enhanced__log-entry.level-error {
  border-left: 3px solid var(--n-color-error);
}

.admin-logs-enhanced__log-entry.level-warning {
  border-left: 3px solid var(--n-color-warning);
}

.admin-logs-enhanced__log-entry.level-info {
  border-left: 3px solid var(--n-color-info);
}

.admin-logs-enhanced__log-entry.level-debug {
  border-left: 3px solid var(--n-color-text-tertiary);
}

.admin-logs-enhanced__log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--n-color-border);
}

.admin-logs-enhanced__log-meta {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.admin-logs-enhanced__log-timestamp {
  font-size: 0.875rem;
  color: var(--n-color-text-secondary);
  font-family: monospace;
}

.admin-logs-enhanced__log-level {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  text-transform: uppercase;
}

.admin-logs-enhanced__log-level.level-error {
  background-color: var(--n-color-error-light);
  color: var(--n-color-error);
}

.admin-logs-enhanced__log-level.level-warning {
  background-color: var(--n-color-warning-light);
  color: var(--n-color-warning);
}

.admin-logs-enhanced__log-level.level-info {
  background-color: var(--n-color-info-light);
  color: var(--n-color-info);
}

.admin-logs-enhanced__log-level.level-debug {
  background-color: var(--n-color-background-alt);
  color: var(--n-color-text-tertiary);
}

.admin-logs-enhanced__log-source {
  font-size: 0.875rem;
  color: var(--n-color-primary);
  font-weight: 500;
}

.admin-logs-enhanced__log-session,
.admin-logs-enhanced__log-user {
  font-size: 0.75rem;
  color: var(--n-color-text-tertiary);
  font-family: monospace;
}

.admin-logs-enhanced__log-actions {
  display: flex;
  gap: 0.5rem;
}

.admin-logs-enhanced__log-action {
  padding: 0.25rem 0.5rem;
  background: none;
  border: none;
  color: var(--n-color-text-secondary);
  cursor: pointer;
  border-radius: var(--n-border-radius);
  transition: all 0.2s;
}

.admin-logs-enhanced__log-action:hover {
  background-color: var(--n-color-hover);
  color: var(--n-color-primary);
}

.admin-logs-enhanced__log-message {
  padding: 0.75rem 1rem;
  font-family: monospace;
  font-size: 0.9rem;
  line-height: 1.5;
  overflow-wrap: break-word;
}

.admin-logs-enhanced__log-message mark {
  background-color: var(--n-color-warning-light);
  color: inherit;
  padding: 0.1rem 0.2rem;
  border-radius: 0.2rem;
}

/* Log Details */
.admin-logs-enhanced__log-details {
  border-top: 1px solid var(--n-color-border);
  padding: 1rem;
}

.admin-logs-enhanced__log-detail-section {
  margin-bottom: 1rem;
}

.admin-logs-enhanced__log-detail-section:last-child {
  margin-bottom: 0;
}

.admin-logs-enhanced__log-detail-section h4 {
  margin: 0 0 0.5rem 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--n-color-text-primary);
}

.admin-logs-enhanced__log-detail-section pre {
  margin: 0;
  padding: 0.75rem;
  background-color: var(--n-color-background-alt);
  border-radius: var(--n-border-radius);
  font-size: 0.85rem;
  overflow-x: auto;
  white-space: pre-wrap;
}

.admin-logs-enhanced__stack-trace {
  color: var(--n-color-error);
  max-height: 300px;
  overflow-y: auto;
}

.admin-logs-enhanced__context-items {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.admin-logs-enhanced__context-item {
  display: flex;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.admin-logs-enhanced__context-key {
  font-weight: 600;
  color: var(--n-color-text-secondary);
}

.admin-logs-enhanced__context-value {
  color: var(--n-color-text-primary);
  font-family: monospace;
}

/* Load More */
.admin-logs-enhanced__load-more {
  display: flex;
  justify-content: center;
  margin-top: 2rem;
}

/* Analytics */
.admin-logs-enhanced__analytics {
  margin-top: 3rem;
}

.admin-logs-enhanced__analytics-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 1.5rem 0;
  color: var(--n-color-text-primary);
}

.admin-logs-enhanced__analytics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.admin-logs-enhanced__chart-card {
  background-color: var(--n-color-background-alt);
  border-radius: var(--n-border-radius);
  padding: 1.5rem;
  box-shadow: var(--n-shadow-sm);
}

.admin-logs-enhanced__chart-card h4 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--n-color-text-primary);
}

.admin-logs-enhanced__chart {
  height: 200px;
}

.admin-logs-enhanced__top-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.admin-logs-enhanced__top-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background-color: var(--n-color-background);
  border-radius: var(--n-border-radius);
}

.admin-logs-enhanced__top-name {
  font-weight: 500;
  color: var(--n-color-text-primary);
}

.admin-logs-enhanced__top-count {
  font-weight: 600;
  color: var(--n-color-error);
}

.admin-logs-enhanced__patterns {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.admin-logs-enhanced__pattern {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.75rem;
  background-color: var(--n-color-background);
  border: 1px solid var(--n-color-border);
  border-radius: 1rem;
  font-size: 0.875rem;
}

.admin-logs-enhanced__pattern-text {
  color: var(--n-color-text-primary);
}

.admin-logs-enhanced__pattern-count {
  color: var(--n-color-text-secondary);
  font-weight: 600;
}

/* Context Modal */
.admin-logs-enhanced__context-modal {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.admin-logs-enhanced__context-timeline h4,
.admin-logs-enhanced__context-details h4 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--n-color-text-primary);
}

.admin-logs-enhanced__context-log {
  display: grid;
  grid-template-columns: auto auto 1fr;
  gap: 1rem;
  padding: 0.75rem;
  background-color: var(--n-color-background);
  border-radius: var(--n-border-radius);
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.admin-logs-enhanced__context-log.active {
  background-color: var(--n-color-primary-light);
  border: 2px solid var(--n-color-primary);
}

.admin-logs-enhanced__context-time {
  color: var(--n-color-text-secondary);
  font-family: monospace;
}

.admin-logs-enhanced__context-level {
  font-weight: 600;
  text-transform: uppercase;
}

.admin-logs-enhanced__context-message {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.admin-logs-enhanced__context-details pre {
  margin: 0;
  padding: 1rem;
  background-color: var(--n-color-background);
  border-radius: var(--n-border-radius);
  font-size: 0.85rem;
  overflow: auto;
  max-height: 400px;
}

/* Export Modal */
.admin-logs-enhanced__export-options {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.admin-logs-enhanced__export-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* Animations */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}

.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 500px;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .admin-logs-enhanced__filters {
    flex-direction: column;
  }

  .admin-logs-enhanced__filter {
    width: 100%;
  }

  .admin-logs-enhanced__analytics-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .admin-logs-enhanced__header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .admin-logs-enhanced__actions {
    width: 100%;
    justify-content: flex-end;
  }

  .admin-logs-enhanced__status-bar {
    flex-direction: column;
    align-items: flex-start;
  }

  .admin-logs-enhanced__log-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .admin-logs-enhanced__context-log {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
}

/* Dark Mode Support */
@media (prefers-color-scheme: dark) {
  .admin-logs-enhanced__viewer {
    background-color: var(--n-color-background);
  }

  .admin-logs-enhanced__log-entry {
    background-color: var(--n-color-background-alt);
  }

  .admin-logs-enhanced__log-detail-section pre {
    background-color: var(--n-color-background);
  }

  .admin-logs-enhanced__chart-card {
    background-color: var(--n-color-background);
  }
}
</style>
