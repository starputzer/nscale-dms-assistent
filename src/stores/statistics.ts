/**
 * Statistics Store
 * Verwaltet anwendungsweite Nutzungs- und Performance-Statistiken
 */

import { defineStore } from "pinia";
import { ref, computed, shallowRef } from "vue";
import { batchRequestService } from "@/services/api/BatchRequestService";
import { useErrorReporting } from "@/composables/useErrorReporting";
import { createBatchedResourceClient } from "@/utils/apiBatchingUtils";

// Interface für Zeitreihen-Datenpunkt
export interface TimeSeriesDatapoint {
  timestamp: string;
  value: number;
}

// Interface für Verteilungsdaten
export interface DistributionData {
  label: string;
  value: number;
  percentage: number;
}

// Interface für Gesamtstatistik
export interface StatisticSummary {
  title: string;
  value: number;
  change: number; // Prozentuale Änderung im Vergleich zum vorherigen Zeitraum
  trend: "up" | "down" | "stable";
}

// Interface für Systemstatistiken
export interface SystemStatistics {
  activeUsers: StatisticSummary;
  messageCount: StatisticSummary;
  avgResponseTime: StatisticSummary;
  documentConversions: StatisticSummary;
  errorRate: StatisticSummary;
}

// Interface für Nutzungsstatistiken
export interface UsageStatistics {
  chatSessions: TimeSeriesDatapoint[];
  messageTypes: DistributionData[];
  userActivity: TimeSeriesDatapoint[];
  featureUsage: DistributionData[];
  documentTypes: DistributionData[];
}

// Interface für Performance-Metriken
export interface PerformanceMetrics {
  apiResponseTimes: TimeSeriesDatapoint[];
  frontendRenderTimes: TimeSeriesDatapoint[];
  resourceUsage: {
    cpu: TimeSeriesDatapoint[];
    memory: TimeSeriesDatapoint[];
    network: TimeSeriesDatapoint[];
  };
}

// Interface für Filter
export interface StatisticsFilter {
  startDate: string;
  endDate: string;
  interval: "hour" | "day" | "week" | "month";
  userId?: string;
  feature?: string;
}

export const useStatisticsStore = defineStore("statistics", () => {
  // State mit Optimierungen
  const systemStats = shallowRef<SystemStatistics | null>(null);
  const usageStats = shallowRef<UsageStatistics | null>(null);
  const performanceMetrics = shallowRef<PerformanceMetrics | null>(null);
  const isCollectingMetrics = ref(false);
  const filter = ref<StatisticsFilter>({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0], // 7 Tage zurück
    endDate: new Date().toISOString().split("T")[0],
    interval: "day",
  });
  const loading = ref(false);
  const error = ref<string | null>(null);
  const lastUpdated = ref<Date | null>(null);

  // Detaillierter Ladestatus
  const loadingState = ref({
    system: false,
    usage: false,
    performance: false,
  });

  // Metriken-Sammlung
  const collectedMetrics = ref<Map<string, number[]>>(new Map());
  const metricsBuffer = ref<
    Map<string, { timestamp: number; value: number }[]>
  >(new Map());
  const lastMetricsSyncTime = ref<number>(0);

  // Fehlerberichterstattung
  const { reportError } = useErrorReporting();

  // Optimierter API-Client für Statistiken mit Batching
  const _statisticsApi = createBatchedResourceClient({
    cacheTTL: 300000, // 5 Minuten Cache für Statistiken
  });

  // Getters
  const hasData = computed(
    () =>
      systemStats.value !== null &&
      usageStats.value !== null &&
      performanceMetrics.value !== null,
  );

  const filterFormatted = computed(() => ({
    startDate: filter.value.startDate,
    endDate: filter.value.endDate,
    interval: filter.value.interval,
    userId: filter.value.userId || undefined,
    feature: filter.value.feature || undefined,
  }));

  const messageCountTrend = computed(() => {
    if (!systemStats.value) return 0;
    return systemStats.value.messageCount.change;
  });

  const errorRateTrend = computed(() => {
    if (!systemStats.value) return 0;
    return systemStats.value.errorRate.change;
  });

  // Actions
  /**
   * Lädt alle Systemstatistiken
   */
  async function fetchSystemStatistics() {
    loadingState.value.system = true;
    error.value = null;

    try {
      // Optimierte Version mit Batching
      const response = await batchRequestService.addRequest({
        endpoint: "/api/statistics/system",
        method: "GET",
        params: filterFormatted.value,
        meta: {
          cacheTTL: 300000, // 5 Minuten Cache
        },
      });

      systemStats.value = response.data;
      lastUpdated.value = new Date();
    } catch (err: any) {
      error.value = err.message || "Fehler beim Laden der Systemstatistiken";
      reportError(
        "STATISTICS_SYSTEM_ERROR",
        "Fehler beim Laden der Systemstatistiken",
        err,
      );
    } finally {
      loadingState.value.system = false;
      loading.value =
        loadingState.value.system ||
        loadingState.value.usage ||
        loadingState.value.performance;
    }
  }

  /**
   * Lädt alle Nutzungsstatistiken
   */
  async function fetchUsageStatistics() {
    loadingState.value.usage = true;
    error.value = null;

    try {
      // Optimierte Version mit Batching
      const response = await batchRequestService.addRequest({
        endpoint: "/api/statistics/usage",
        method: "GET",
        params: filterFormatted.value,
        meta: {
          cacheTTL: 300000, // 5 Minuten Cache
        },
      });

      usageStats.value = response.data;
      lastUpdated.value = new Date();
    } catch (err: any) {
      error.value = err.message || "Fehler beim Laden der Nutzungsstatistiken";
      reportError(
        "STATISTICS_USAGE_ERROR",
        "Fehler beim Laden der Nutzungsstatistiken",
        err,
      );
    } finally {
      loadingState.value.usage = false;
      loading.value =
        loadingState.value.system ||
        loadingState.value.usage ||
        loadingState.value.performance;
    }
  }

  /**
   * Lädt alle Performance-Metriken
   */
  async function fetchPerformanceMetrics() {
    loadingState.value.performance = true;
    error.value = null;

    try {
      // Optimierte Version mit Batching
      const response = await batchRequestService.addRequest({
        endpoint: "/api/statistics/performance",
        method: "GET",
        params: filterFormatted.value,
        meta: {
          cacheTTL: 300000, // 5 Minuten Cache
        },
      });

      performanceMetrics.value = response.data;
      lastUpdated.value = new Date();
    } catch (err: any) {
      error.value = err.message || "Fehler beim Laden der Performance-Metriken";
      reportError(
        "STATISTICS_PERFORMANCE_ERROR",
        "Fehler beim Laden der Performance-Metriken",
        err,
      );
    } finally {
      loadingState.value.performance = false;
      loading.value =
        loadingState.value.system ||
        loadingState.value.usage ||
        loadingState.value.performance;
    }
  }

  /**
   * Aktualisiert den Filter und lädt alle Statistiken neu
   */
  async function updateFilter(newFilter: Partial<StatisticsFilter>) {
    filter.value = { ...filter.value, ...newFilter };
    await fetchAllStatistics();
  }

  /**
   * Lädt alle Statistiken
   */
  async function fetchAllStatistics() {
    loading.value = true;

    try {
      await Promise.all([
        fetchSystemStatistics(),
        fetchUsageStatistics(),
        fetchPerformanceMetrics(),
      ]);
    } finally {
      loading.value = false;
    }
  }

  /**
   * Startet die Sammlung von Metriken
   */
  function startMetricsCollection() {
    if (isCollectingMetrics.value) return;

    isCollectingMetrics.value = true;

    // Regelmäßige Synchronisierung der gesammelten Metriken
    const syncInterval = setInterval(() => {
      syncMetrics();
    }, 30000); // Alle 30 Sekunden synchronisieren

    // Reinigungsmethode beim Stoppen
    return () => {
      clearInterval(syncInterval);
      isCollectingMetrics.value = false;
    };
  }

  /**
   * Stoppt die Sammlung von Metriken
   */
  function stopMetricsCollection() {
    isCollectingMetrics.value = false;
  }

  /**
   * Speichert eine einzelne Metrik
   */
  function trackMetric(name: string, value: number) {
    if (!isCollectingMetrics.value) return;

    // Zur Sammelmetrik hinzufügen
    if (!collectedMetrics.value.has(name)) {
      collectedMetrics.value.set(name, []);
    }
    collectedMetrics.value.get(name)?.push(value);

    // Zum Puffer für Zeitreihen hinzufügen
    if (!metricsBuffer.value.has(name)) {
      metricsBuffer.value.set(name, []);
    }
    metricsBuffer.value.get(name)?.push({
      timestamp: Date.now(),
      value,
    });

    // Puffer beschränken
    const buffer = metricsBuffer.value.get(name);
    if (buffer && buffer.length > 100) {
      buffer.splice(0, buffer.length - 100);
    }
  }

  /**
   * Synchronisiert gesammelte Metriken mit dem Server
   */
  async function syncMetrics() {
    if (!isCollectingMetrics.value || metricsBuffer.value.size === 0) return;

    const now = Date.now();

    // Nur synchronisieren, wenn seit der letzten Synchronisierung genügend Zeit vergangen ist
    if (now - lastMetricsSyncTime.value < 10000) return; // Mindestens 10 Sekunden zwischen Synchronisierungen

    const metricsToSync: Record<
      string,
      { timestamp: number; value: number }[]
    > = {};

    // Metriken aus dem Puffer kopieren
    metricsBuffer.value.forEach((values, name: any) => {
      metricsToSync[name] = [...values];
    });

    // Puffer leeren
    metricsBuffer.value.clear();

    try {
      // Metriken zum Server senden
      await batchRequestService.addRequest({
        endpoint: "/api/statistics/metrics",
        method: "POST",
        data: { metrics: metricsToSync },
      });

      lastMetricsSyncTime.value = now;
    } catch (err: any) {
      reportError(
        "STATISTICS_SYNC_ERROR",
        "Fehler beim Synchronisieren der Metriken",
        err,
      );

      // Fehlgeschlagene Synchronisierung: Metriken zurück in den Puffer legen
      Object.entries(metricsToSync).forEach(([name, values]: any) => {
        if (!metricsBuffer.value.has(name)) {
          metricsBuffer.value.set(name, []);
        }
        metricsBuffer.value.get(name)?.push(...values);
      });
    }
  }

  /**
   * Exportiert Statistiken als CSV oder JSON
   */
  async function exportStatistics(
    format: "csv" | "json",
    type: "system" | "usage" | "performance" | "all",
  ) {
    try {
      // Optimierte Version mit Batching
      const response = await batchRequestService.addRequest({
        endpoint: "/api/statistics/export",
        method: "POST",
        data: {
          format,
          type,
          filter: filterFormatted.value,
        },
      });

      // Simuliere Datei-Download (in einer realen Implementierung würde
      // diese URL vom Server kommen)
      const downloadUrl = response.data.downloadUrl;
      // Hier würde Code zum Starten des Downloads folgen

      return downloadUrl;
    } catch (err: any) {
      error.value = err.message || "Fehler beim Exportieren der Statistiken";
      reportError(
        "STATISTICS_EXPORT_ERROR",
        "Fehler beim Exportieren der Statistiken",
        err,
      );
    }
  }

  /**
   * Initialisiert den Statistics-Store
   */
  async function initialize() {
    await fetchAllStatistics();
    startMetricsCollection();
  }

  /**
   * Setzt den Store zurück
   */
  function reset() {
    systemStats.value = null;
    usageStats.value = null;
    performanceMetrics.value = null;
    isCollectingMetrics.value = false;
    filter.value = {
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      endDate: new Date().toISOString().split("T")[0],
      interval: "day",
    };
    loading.value = false;
    error.value = null;
    lastUpdated.value = null;
    loadingState.value = { system: false, usage: false, performance: false };
    collectedMetrics.value.clear();
    metricsBuffer.value.clear();
    lastMetricsSyncTime.value = 0;
  }

  return {
    // State
    systemStats,
    usageStats,
    performanceMetrics,
    isCollectingMetrics,
    filter,
    loading,
    error,
    lastUpdated,
    loadingState,

    // Getters
    hasData,
    filterFormatted,
    messageCountTrend,
    errorRateTrend,

    // Actions
    fetchSystemStatistics,
    fetchUsageStatistics,
    fetchPerformanceMetrics,
    updateFilter,
    fetchAllStatistics,
    startMetricsCollection,
    stopMetricsCollection,
    trackMetric,
    syncMetrics,
    exportStatistics,
    initialize,
    reset,
  };
});
