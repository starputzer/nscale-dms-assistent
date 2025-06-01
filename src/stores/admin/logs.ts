/**
 * Admin Logs Store
 * Verwaltet die Systemlogs und bietet Funktionen für das Filtern, Suchen und Exportieren von Logs
 */

import { defineStore } from "pinia";
import { ref, computed } from "vue";

import { BatchRequestService } from "@/services/api/BatchRequestService";
import { useErrorReporting } from "@/composables/useErrorReporting";

// Create a singleton instance of BatchRequestService
const batchService = new BatchRequestService();

export interface LogEntry {
  id: string;
  timestamp: string;
  level: "info" | "warning" | "error" | "debug";
  message: string;
  source: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

export interface LogFilter {
  level?: "info" | "warning" | "error" | "debug" | "all";
  source?: string;
  userId?: string;
  sessionId?: string;
  startDate?: string;
  endDate?: string;
  searchTerm?: string;
}

export interface LogStatistics {
  totalEntries: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  debugCount: number;
  topSources: { source: string; count: number }[];
  entriesPerDay: { date: string; count: number }[];
}

export interface LogQueryOptions {
  page: number;
  limit: number;
  filter: LogFilter;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export const useAdminLogsStore = defineStore("adminLogs", () => {
  // State
  const logs = ref<LogEntry[]>([]);
  const totalLogs = ref(0);
  const currentPage = ref(1);
  const pageSize = ref(50);
  const filter = ref<LogFilter>({
    level: "all",
  });
  const sortBy = ref("timestamp");
  const sortOrder = ref<"asc" | "desc">("desc");
  const loading = ref(false);
  const error = ref<string | null>(null);
  const statistics = ref<LogStatistics>({
    totalEntries: 0,
    errorCount: 0,
    warningCount: 0,
    infoCount: 0,
    debugCount: 0,
    topSources: [],
    entriesPerDay: [],
  });
  const sources = ref<string[]>([]);
  const selectedLogIds = ref<string[]>([]);
  const exportProgress = ref(0);
  const isExporting = ref(false);

  // Reporting-Dienst für Fehler
  const { reportError } = useErrorReporting();

  // Getters
  const filteredLogCount = computed(() => totalLogs.value);

  const hasSelectedLogs = computed(() => selectedLogIds.value.length > 0);

  const selectedLogs = computed(() =>
    logs.value.filter((log: any) => selectedLogIds.value.includes(log.id)),
  );

  const totalPages = computed(() =>
    Math.ceil(totalLogs.value / pageSize.value),
  );

  const currentQueryOptions = computed(() => ({
    page: currentPage.value,
    limit: pageSize.value,
    filter: filter.value,
    sortBy: sortBy.value,
    sortOrder: sortOrder.value,
  }));

  // Actions
  /**
   * Lädt Logs mit den aktuellen Filter- und Paginierungseinstellungen
   */
  async function fetchLogs() {
    loading.value = true;
    error.value = null;

    try {
      // Optimierte Version mit API-Batching
      const endpoint = "/api/admin/logs";
      const params = {
        page: currentPage.value,
        limit: pageSize.value,
        ...filter.value,
        sortBy: sortBy.value,
        sortOrder: sortOrder.value,
      };

      const response = await batchService.addRequest({
        endpoint,
        method: "GET",
        params,
        meta: {
          cacheTTL: 30000, // 30 Sekunden Cache
        },
      });

      logs.value = response.data.logs;
      totalLogs.value = response.data.total;
    } catch (err: any) {
      error.value = err.message || "Fehler beim Laden der Logs";
      reportError(err, {
        feature: "ADMIN_LOGS_FETCH",
        context: { message: "Fehler beim Laden der Logs" }
      });
    } finally {
      loading.value = false;
    }
  }

  /**
   * Aktualisiert die Filter und lädt die Logs neu
   */
  async function updateFilter(newFilter: LogFilter) {
    filter.value = { ...newFilter };
    currentPage.value = 1; // Zurück zur ersten Seite bei Filteränderung
    await fetchLogs();
  }

  /**
   * Wechselt zur angegebenen Seite und lädt die Logs
   */
  async function goToPage(page: number) {
    if (page < 1 || page > totalPages.value) return;
    currentPage.value = page;
    await fetchLogs();
  }

  /**
   * Ändert die Sortierung und lädt die Logs neu
   */
  async function updateSort(field: string, order: "asc" | "desc") {
    sortBy.value = field;
    sortOrder.value = order;
    await fetchLogs();
  }

  /**
   * Ändert die Seitengröße und lädt die Logs neu
   */
  async function setPageSize(size: number) {
    pageSize.value = size;
    currentPage.value = 1; // Zurück zur ersten Seite bei Änderung der Seitengröße
    await fetchLogs();
  }

  /**
   * Lädt die Statistiken für Logs
   */
  async function fetchStatistics() {
    loading.value = true;
    error.value = null;

    try {
      // Optimierte Version mit API-Batching
      const response = await batchService.addRequest({
        endpoint: "/api/admin/logs/statistics",
        method: "GET",
        params: filter.value,
        meta: {
          cacheTTL: 300000, // 5 Minuten Cache für Statistiken
        },
      });

      statistics.value = response.data;
    } catch (err: any) {
      error.value = err.message || "Fehler beim Laden der Log-Statistiken";
      reportError(err, {
        feature: "ADMIN_LOGS_STATS",
        context: { message: "Fehler beim Laden der Log-Statistiken" }
      });
    } finally {
      loading.value = false;
    }
  }

  /**
   * Lädt die verfügbaren Log-Quellen für Filter
   */
  async function fetchLogSources() {
    try {
      // Optimierte Version mit API-Batching
      const response = await batchService.addRequest({
        endpoint: "/api/admin/logs/sources",
        method: "GET",
        meta: {
          cacheTTL: 3600000, // 1 Stunde Cache für Quellen
        },
      });

      sources.value = response.data.sources;
    } catch (err: any) {
      reportError(err, {
        feature: "ADMIN_LOGS_SOURCES",
        context: { message: "Fehler beim Laden der Log-Quellen" }
      });
    }
  }

  /**
   * Wählt ein Log aus oder hebt die Auswahl auf
   */
  function toggleLogSelection(logId: string) {
    const index = selectedLogIds.value.indexOf(logId);
    if (index === -1) {
      selectedLogIds.value.push(logId);
    } else {
      selectedLogIds.value.splice(index, 1);
    }
  }

  /**
   * Wählt alle Logs auf der aktuellen Seite aus
   */
  function selectAllOnPage() {
    const pageIds = logs.value.map((log: any) => log.id);
    selectedLogIds.value = pageIds;
  }

  /**
   * Hebt die Auswahl aller Logs auf
   */
  function deselectAll() {
    selectedLogIds.value = [];
  }

  /**
   * Exportiert ausgewählte Logs in eine Datei
   */
  async function exportLogs(format: "csv" | "json") {
    if (selectedLogIds.value.length === 0) return;

    isExporting.value = true;
    exportProgress.value = 0;

    try {
      // Simuliere Fortschritt (in einer realen Implementierung würde der Fortschritt
      // vom Server kommen oder auf natürlicheren Ereignissen basieren)
      const progressInterval = setInterval(() => {
        if (exportProgress.value < 90) {
          exportProgress.value += 10;
        }
      }, 300);

      // Optimierte Version mit API-Batching
      const response = await batchService.addRequest({
        endpoint: "/api/admin/logs/export",
        method: "POST",
        data: {
          ids: selectedLogIds.value,
          format,
        },
      });

      clearInterval(progressInterval);
      exportProgress.value = 100;

      // Simuliere Datei-Download (in der realen Implementierung würde
      // diese URL vom Server kommen)
      const downloadUrl = response.data.downloadUrl;
      // Hier würde der Code zum Starten des Downloads folgen

      // Nach kurzer Verzögerung zurücksetzen
      setTimeout(() => {
        isExporting.value = false;
        exportProgress.value = 0;
      }, 1000);

      return downloadUrl;
    } catch (err: any) {
      error.value = err.message || "Fehler beim Exportieren der Logs";
      reportError(err, {
        feature: "ADMIN_LOGS_EXPORT",
        context: { message: "Fehler beim Exportieren der Logs" }
      });
    } finally {
      isExporting.value = false;
    }
  }

  /**
   * Initialisiert den Logs-Store
   */
  async function initialize() {
    await Promise.all([fetchLogSources(), fetchLogs(), fetchStatistics()]);
  }

  /**
   * Setzt den Store zurück
   */
  function reset() {
    logs.value = [];
    totalLogs.value = 0;
    currentPage.value = 1;
    filter.value = { level: "all" };
    sortBy.value = "timestamp";
    sortOrder.value = "desc";
    selectedLogIds.value = [];
    error.value = null;
  }

  return {
    // State
    logs,
    totalLogs,
    currentPage,
    pageSize,
    filter,
    sortBy,
    sortOrder,
    loading,
    error,
    statistics,
    sources,
    selectedLogIds,
    exportProgress,
    isExporting,

    // Getters
    filteredLogCount,
    hasSelectedLogs,
    selectedLogs,
    totalPages,
    currentQueryOptions,

    // Actions
    fetchLogs,
    updateFilter,
    goToPage,
    updateSort,
    setPageSize,
    fetchStatistics,
    fetchLogSources,
    toggleLogSelection,
    selectAllOnPage,
    deselectAll,
    exportLogs,
    initialize,
    reset,
  };
});
