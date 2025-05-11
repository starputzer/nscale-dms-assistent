import { defineStore } from "pinia";
import { ref, computed, watch } from "vue";
import { useFeatureTogglesStore } from "./featureToggles";
import { StorageService } from "../services/storage/StorageService";
import { LogService } from "../services/log/LogService";

export interface FeatureError {
  id: string;
  featureId: string;
  component: string;
  message: string;
  stack?: string;
  timestamp: number;
  severity: "low" | "medium" | "high" | "critical";
  resolved: boolean;
  userAction?: string;
  fallbackTriggered: boolean;
  count: number;
  userAgent: string;
  lastOccurrence: number;
}

export interface PerformanceMetric {
  id: string;
  featureId: string;
  component: string;
  type: "renderTime" | "memoryUsage" | "networkTime" | "totalTime";
  value: number;
  timestamp: number;
  userAgent: string;
  viewport: string;
}

export interface UsageStat {
  id: string;
  featureId: string;
  component: string;
  action: string;
  timestamp: number;
  userAgent: string;
  duration?: number;
  successful: boolean;
  userFeedback?: {
    rating?: number;
    comments?: string;
  };
}

export interface Alert {
  id: string;
  type: "error" | "performance" | "usage";
  message: string;
  featureId: string;
  severity: "low" | "medium" | "high" | "critical";
  timestamp: number;
  acknowledged: boolean;
  metric?: string;
  threshold?: number;
  currentValue?: number;
}

export interface MonitoringSettings {
  dataCollection: {
    errors: boolean;
    performance: boolean;
    usage: boolean;
  };
  alertThresholds: {
    errorRate: number;
    criticalErrors: number;
    performanceDeviation: number;
    usageDropPercent: number;
  };
  retention: {
    days: number;
  };
  privacySettings: {
    collectUserAgents: boolean;
    collectIpAddresses: boolean;
    collectUserIds: boolean;
  };
  alerts: {
    enabled: boolean;
    channels: {
      ui: boolean;
      email: boolean;
      system: boolean;
    };
  };
}

export const STORAGE_KEYS = {
  ERRORS: "nscale-feature-monitoring-errors",
  PERFORMANCE: "nscale-feature-monitoring-performance",
  USAGE: "nscale-feature-monitoring-usage",
  ALERTS: "nscale-feature-monitoring-alerts",
  SETTINGS: "nscale-feature-monitoring-settings",
};

export const useMonitoringStore = defineStore("monitoring", () => {
  // State
  const errors = ref<FeatureError[]>([]);
  const performanceMetrics = ref<PerformanceMetric[]>([]);
  const usageStats = ref<UsageStat[]>([]);
  const alerts = ref<Alert[]>([]);

  const settings = ref<MonitoringSettings>({
    dataCollection: {
      errors: true,
      performance: true,
      usage: true,
    },
    alertThresholds: {
      errorRate: 5, // 5% error rate
      criticalErrors: 1, // any critical error
      performanceDeviation: 50, // 50% performance deviation
      usageDropPercent: 30, // 30% drop in usage
    },
    retention: {
      days: 30,
    },
    privacySettings: {
      collectUserAgents: true,
      collectIpAddresses: false,
      collectUserIds: false,
    },
    alerts: {
      enabled: true,
      channels: {
        ui: true,
        email: false,
        system: true,
      },
    },
  });

  const isInitialized = ref(false);
  const lastUpdate = ref(Date.now());

  // Feature toggle store integration
  const featureStore = useFeatureTogglesStore();

  // Initialize the store
  function initialize() {
    if (isInitialized.value) return;
    loadFromStorage();
    cleanupOldData();
    setupWatchers();
    isInitialized.value = true;
  }

  // Persistence
  function loadFromStorage() {
    try {
      const storedErrors = StorageService.getItem(STORAGE_KEYS.ERRORS);
      if (storedErrors) errors.value = JSON.parse(storedErrors);

      const storedPerformance = StorageService.getItem(
        STORAGE_KEYS.PERFORMANCE,
      );
      if (storedPerformance)
        performanceMetrics.value = JSON.parse(storedPerformance);

      const storedUsage = StorageService.getItem(STORAGE_KEYS.USAGE);
      if (storedUsage) usageStats.value = JSON.parse(storedUsage);

      const storedAlerts = StorageService.getItem(STORAGE_KEYS.ALERTS);
      if (storedAlerts) alerts.value = JSON.parse(storedAlerts);

      const storedSettings = StorageService.getItem(STORAGE_KEYS.SETTINGS);
      if (storedSettings) settings.value = JSON.parse(storedSettings);
    } catch (error) {
      LogService.error("Failed to load monitoring data from storage", error);
    }
  }

  function saveToStorage() {
    try {
      if (settings.value.dataCollection.errors) {
        StorageService.setItem(
          STORAGE_KEYS.ERRORS,
          JSON.stringify(errors.value),
        );
      }

      if (settings.value.dataCollection.performance) {
        StorageService.setItem(
          STORAGE_KEYS.PERFORMANCE,
          JSON.stringify(performanceMetrics.value),
        );
      }

      if (settings.value.dataCollection.usage) {
        StorageService.setItem(
          STORAGE_KEYS.USAGE,
          JSON.stringify(usageStats.value),
        );
      }

      StorageService.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(alerts.value));
      StorageService.setItem(
        STORAGE_KEYS.SETTINGS,
        JSON.stringify(settings.value),
      );

      lastUpdate.value = Date.now();
    } catch (error) {
      LogService.error("Failed to save monitoring data to storage", error);
    }
  }

  function setupWatchers() {
    // Set up watchers to persist data when it changes
    watch(
      [errors, performanceMetrics, usageStats, alerts, settings],
      () => {
        saveToStorage();
      },
      { deep: true },
    );
  }

  // Data management
  function cleanupOldData() {
    const now = Date.now();
    const maxAge = settings.value.retention.days * 24 * 60 * 60 * 1000; // Convert days to ms

    // Filter out old data
    errors.value = errors.value.filter(
      (error) => now - error.timestamp < maxAge,
    );
    performanceMetrics.value = performanceMetrics.value.filter(
      (metric) => now - metric.timestamp < maxAge,
    );
    usageStats.value = usageStats.value.filter(
      (stat) => now - stat.timestamp < maxAge,
    );

    // Keep acknowledged alerts regardless of age
    alerts.value = alerts.value.filter(
      (alert) => alert.acknowledged || now - alert.timestamp < maxAge,
    );
  }

  // Error tracking
  function trackError(
    featureId: string,
    component: string,
    message: string,
    severity: FeatureError["severity"] = "medium",
    stack?: string,
    fallbackTriggered = false,
    userAction?: string,
  ) {
    if (!settings.value.dataCollection.errors) return;

    const now = Date.now();
    const userAgent = navigator.userAgent;

    // Check if this error already exists
    const existingErrorIndex = errors.value.findIndex(
      (e) =>
        e.featureId === featureId &&
        e.component === component &&
        e.message === message,
    );

    if (existingErrorIndex >= 0) {
      // Update existing error
      const error = errors.value[existingErrorIndex];
      error.count++;
      error.lastOccurrence = now;

      // Update severity if new occurrence is more severe
      const severityLevels = { low: 1, medium: 2, high: 3, critical: 4 };
      if (severityLevels[severity] > severityLevels[error.severity]) {
        error.severity = severity;
      }

      // Update fallback status if it was triggered
      if (fallbackTriggered) {
        error.fallbackTriggered = true;
      }
    } else {
      // Create new error entry
      const newError: FeatureError = {
        id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        featureId,
        component,
        message,
        stack,
        timestamp: now,
        severity,
        resolved: false,
        userAction,
        fallbackTriggered,
        count: 1,
        userAgent: settings.value.privacySettings.collectUserAgents
          ? userAgent
          : "disabled",
        lastOccurrence: now,
      };

      errors.value.push(newError);
    }

    // Check for alert thresholds
    checkErrorAlerts(featureId);
  }

  function resolveError(errorId: string, resolution?: string) {
    const errorIndex = errors.value.findIndex((e) => e.id === errorId);
    if (errorIndex >= 0) {
      errors.value[errorIndex].resolved = true;
      if (resolution) {
        errors.value[errorIndex].userAction = resolution;
      }
    }
  }

  // Performance tracking
  function trackPerformance(
    featureId: string,
    component: string,
    type: PerformanceMetric["type"],
    value: number,
  ) {
    if (!settings.value.dataCollection.performance) return;

    const now = Date.now();
    const userAgent = navigator.userAgent;
    const viewport = `${window.innerWidth}x${window.innerHeight}`;

    const newMetric: PerformanceMetric = {
      id: `perf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      featureId,
      component,
      type,
      value,
      timestamp: now,
      userAgent: settings.value.privacySettings.collectUserAgents
        ? userAgent
        : "disabled",
      viewport,
    };

    performanceMetrics.value.push(newMetric);

    // Check for performance alerts
    checkPerformanceAlerts(featureId, type, value);
  }

  // Usage tracking
  function trackUsage(
    featureId: string,
    component: string,
    action: string,
    successful: boolean,
    duration?: number,
    userFeedback?: UsageStat["userFeedback"],
  ) {
    if (!settings.value.dataCollection.usage) return;

    const now = Date.now();
    const userAgent = navigator.userAgent;

    const newStat: UsageStat = {
      id: `usage-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      featureId,
      component,
      action,
      timestamp: now,
      userAgent: settings.value.privacySettings.collectUserAgents
        ? userAgent
        : "disabled",
      duration,
      successful,
      userFeedback,
    };

    usageStats.value.push(newStat);

    // Check usage trends for alerts
    checkUsageAlerts(featureId);
  }

  // Alert management
  function createAlert(
    type: Alert["type"],
    message: string,
    featureId: string,
    severity: Alert["severity"],
    metric?: string,
    threshold?: number,
    currentValue?: number,
  ) {
    if (!settings.value.alerts.enabled) return;

    const newAlert: Alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      message,
      featureId,
      severity,
      timestamp: Date.now(),
      acknowledged: false,
      metric,
      threshold,
      currentValue,
    };

    alerts.value.push(newAlert);

    // Handle alert notifications through configured channels
    if (settings.value.alerts.channels.system) {
      LogService.warn(`[Monitor Alert] ${message}`, { alert: newAlert });
    }

    if (settings.value.alerts.channels.email) {
      // This would connect to an email service
      // sendAlertEmail(newAlert);
    }
  }

  function acknowledgeAlert(alertId: string) {
    const alertIndex = alerts.value.findIndex((a) => a.id === alertId);
    if (alertIndex >= 0) {
      alerts.value[alertIndex].acknowledged = true;
    }
  }

  // Alert threshold checks
  function checkErrorAlerts(featureId: string) {
    // Calculate error rate for this feature
    const featureErrors = errors.value.filter(
      (e) =>
        e.featureId === featureId &&
        !e.resolved &&
        Date.now() - e.lastOccurrence < 24 * 60 * 60 * 1000, // last 24 hours
    );

    const featureUsage = usageStats.value.filter(
      (s) =>
        s.featureId === featureId &&
        Date.now() - s.timestamp < 24 * 60 * 60 * 1000, // last 24 hours
    );

    // Check if we have enough usage data to calculate an error rate
    if (featureUsage.length > 10) {
      const errorRate = (featureErrors.length / featureUsage.length) * 100;

      if (errorRate >= settings.value.alertThresholds.errorRate) {
        // Create an error rate alert
        createAlert(
          "error",
          `High error rate of ${errorRate.toFixed(1)}% detected for feature "${featureId}"`,
          featureId,
          errorRate >= settings.value.alertThresholds.errorRate * 2
            ? "critical"
            : "high",
          "errorRate",
          settings.value.alertThresholds.errorRate,
          errorRate,
        );
      }
    }

    // Check for critical errors
    const criticalErrors = featureErrors.filter(
      (e) => e.severity === "critical" && !e.resolved,
    );

    if (
      criticalErrors.length >= settings.value.alertThresholds.criticalErrors
    ) {
      createAlert(
        "error",
        `${criticalErrors.length} critical errors detected for feature "${featureId}"`,
        featureId,
        "critical",
        "criticalErrors",
        settings.value.alertThresholds.criticalErrors,
        criticalErrors.length,
      );
    }
  }

  function checkPerformanceAlerts(
    featureId: string,
    metricType: string,
    currentValue: number,
  ) {
    // Get historical metrics for this feature and type
    const historicalMetrics = performanceMetrics.value.filter(
      (m) =>
        m.featureId === featureId &&
        m.type === metricType &&
        m.timestamp < Date.now() - 3600000 && // older than 1 hour
        m.timestamp > Date.now() - 24 * 3600000, // but within last 24 hours
    );

    // Need enough data points to make a comparison
    if (historicalMetrics.length < 5) return;

    // Calculate average historical value
    const avgValue =
      historicalMetrics.reduce((sum, metric) => sum + metric.value, 0) /
      historicalMetrics.length;

    // Calculate percentage deviation
    const deviation = ((currentValue - avgValue) / avgValue) * 100;

    // Check if deviation exceeds threshold
    if (
      Math.abs(deviation) >= settings.value.alertThresholds.performanceDeviation
    ) {
      const increasing = deviation > 0;

      // For most metrics, increasing is bad (except for some like FPS)
      const isBad = metricType !== "fps" ? increasing : !increasing;

      if (isBad) {
        createAlert(
          "performance",
          `Performance degradation: ${metricType} ${increasing ? "increased" : "decreased"} by ${Math.abs(deviation).toFixed(1)}% for feature "${featureId}"`,
          featureId,
          Math.abs(deviation) >=
            settings.value.alertThresholds.performanceDeviation * 2
            ? "high"
            : "medium",
          metricType,
          settings.value.alertThresholds.performanceDeviation,
          deviation,
        );
      }
    }
  }

  function checkUsageAlerts(featureId: string) {
    // Compare current day usage with previous periods
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const twoDaysAgo = now - 2 * 24 * 60 * 60 * 1000;

    // Get today's usage
    const todayUsage = usageStats.value.filter(
      (s) => s.featureId === featureId && s.timestamp > oneDayAgo,
    ).length;

    // Get yesterday's usage
    const yesterdayUsage = usageStats.value.filter(
      (s) =>
        s.featureId === featureId &&
        s.timestamp <= oneDayAgo &&
        s.timestamp > twoDaysAgo,
    ).length;

    // Need enough data to make a comparison
    if (yesterdayUsage < 10) return;

    // Calculate percentage drop
    const usageDrop = ((yesterdayUsage - todayUsage) / yesterdayUsage) * 100;

    // Check if drop exceeds threshold
    if (usageDrop >= settings.value.alertThresholds.usageDropPercent) {
      createAlert(
        "usage",
        `Usage drop of ${usageDrop.toFixed(1)}% detected for feature "${featureId}"`,
        featureId,
        usageDrop >= settings.value.alertThresholds.usageDropPercent * 2
          ? "high"
          : "medium",
        "usageDrop",
        settings.value.alertThresholds.usageDropPercent,
        usageDrop,
      );
    }
  }

  // Analytics & computed values
  const featureErrorCounts = computed(() => {
    const counts: Record<string, number> = {};

    for (const error of errors.value) {
      if (!error.resolved) {
        counts[error.featureId] = (counts[error.featureId] || 0) + 1;
      }
    }

    return counts;
  });

  const totalActiveErrors = computed(() => {
    return errors.value.filter((e) => !e.resolved).length;
  });

  const totalCriticalErrors = computed(() => {
    return errors.value.filter((e) => !e.resolved && e.severity === "critical")
      .length;
  });

  const activeAlerts = computed(() => {
    return alerts.value.filter((a) => !a.acknowledged);
  });

  const featurePerformanceAverages = computed(() => {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const averages: Record<string, Record<string, number>> = {};

    for (const metric of performanceMetrics.value) {
      if (metric.timestamp >= oneDayAgo) {
        if (!averages[metric.featureId]) {
          averages[metric.featureId] = {};
        }

        if (!averages[metric.featureId][metric.type]) {
          averages[metric.featureId][metric.type] = {
            sum: 0,
            count: 0,
          };
        }

        averages[metric.featureId][metric.type].sum += metric.value;
        averages[metric.featureId][metric.type].count++;
      }
    }

    // Calculate averages
    const result: Record<string, Record<string, number>> = {};

    for (const [featureId, metrics] of Object.entries(averages)) {
      result[featureId] = {};

      for (const [metricType, data] of Object.entries(metrics)) {
        result[featureId][metricType] = data.sum / data.count;
      }
    }

    return result;
  });

  // Data retrieval by time range
  function getErrorsByTimeRange(
    startTime: number,
    endTime: number = Date.now(),
  ) {
    return errors.value.filter(
      (e) => e.timestamp >= startTime && e.timestamp <= endTime,
    );
  }

  function getPerformanceByTimeRange(
    startTime: number,
    endTime: number = Date.now(),
  ) {
    return performanceMetrics.value.filter(
      (m) => m.timestamp >= startTime && m.timestamp <= endTime,
    );
  }

  function getUsageByTimeRange(
    startTime: number,
    endTime: number = Date.now(),
  ) {
    return usageStats.value.filter(
      (s) => s.timestamp >= startTime && s.timestamp <= endTime,
    );
  }

  function getAlertsByTimeRange(
    startTime: number,
    endTime: number = Date.now(),
  ) {
    return alerts.value.filter(
      (a) => a.timestamp >= startTime && a.timestamp <= endTime,
    );
  }

  // Data export
  function exportData() {
    const exportData = {
      errors: errors.value,
      performanceMetrics: performanceMetrics.value,
      usageStats: usageStats.value,
      alerts: alerts.value,
      settings: settings.value,
      exportDate: new Date().toISOString(),
    };

    return JSON.stringify(exportData, null, 2);
  }

  function updateSettings(newSettings: Partial<MonitoringSettings>) {
    settings.value = { ...settings.value, ...newSettings };
  }

  // Initialize on first access
  initialize();

  return {
    // State
    errors,
    performanceMetrics,
    usageStats,
    alerts,
    settings,
    lastUpdate,

    // Computed
    featureErrorCounts,
    totalActiveErrors,
    totalCriticalErrors,
    activeAlerts,
    featurePerformanceAverages,

    // Error tracking
    trackError,
    resolveError,

    // Performance tracking
    trackPerformance,

    // Usage tracking
    trackUsage,

    // Alert management
    createAlert,
    acknowledgeAlert,

    // Data retrieval
    getErrorsByTimeRange,
    getPerformanceByTimeRange,
    getUsageByTimeRange,
    getAlertsByTimeRange,

    // Settings
    updateSettings,

    // Utilities
    exportData,
    cleanupOldData,
  };
});
