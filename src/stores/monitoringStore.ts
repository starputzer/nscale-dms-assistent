import { defineStore } from "pinia";
import { ref, computed, watch } from "vue";
import { useFeatureTogglesStore } from "./featureToggles";
import { StorageService } from "../services/storage/StorageService";
import { LogService } from "../services/log/LogService";

// Initialize service instances
const storageService = new StorageService();
const logService = new LogService("MonitoringStore");

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
  // Uncomment when needed:
  // const featureStore = useFeatureTogglesStore();

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
      const storedErrors = storageService.getItem(STORAGE_KEYS.ERRORS);
      if (storedErrors) errors.value = JSON.parse(storedErrors);

      const storedPerformance = storageService.getItem(
        STORAGE_KEYS.PERFORMANCE,
      );
      if (storedPerformance)
        performanceMetrics.value = JSON.parse(storedPerformance);

      const storedUsage = storageService.getItem(STORAGE_KEYS.USAGE);
      if (storedUsage) usageStats.value = JSON.parse(storedUsage);

      const storedAlerts = storageService.getItem(STORAGE_KEYS.ALERTS);
      if (storedAlerts) alerts.value = JSON.parse(storedAlerts);

      const storedSettings = storageService.getItem(STORAGE_KEYS.SETTINGS);
      if (storedSettings) settings.value = JSON.parse(storedSettings);
    } catch (error) {
      logService.error("Failed to load monitoring data from storage", error);
    }
  }

  function saveToStorage() {
    try {
      if (settings.value.dataCollection.errors) {
        storageService.setItem(
          STORAGE_KEYS.ERRORS,
          JSON.stringify(errors.value),
        );
      }

      if (settings.value.dataCollection.performance) {
        storageService.setItem(
          STORAGE_KEYS.PERFORMANCE,
          JSON.stringify(performanceMetrics.value),
        );
      }

      if (settings.value.dataCollection.usage) {
        storageService.setItem(
          STORAGE_KEYS.USAGE,
          JSON.stringify(usageStats.value),
        );
      }

      storageService.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(alerts.value));
      storageService.setItem(
        STORAGE_KEYS.SETTINGS,
        JSON.stringify(settings.value),
      );

      lastUpdate.value = Date.now();
    } catch (error) {
      logService.error("Failed to save monitoring data to storage", error);
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
      logService.warn(`[Monitor Alert] ${message}`, { alert: newAlert });
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
      historicalMetrics.reduce((sum: any, metric) => sum + metric.value, 0) /
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
    return errors.value.filter((e: any) => !e.resolved).length;
  });

  const totalCriticalErrors = computed(() => {
    return errors.value.filter((e: any) => !e.resolved && e.severity === "critical")
      .length;
  });

  const activeAlerts = computed(() => {
    return alerts.value.filter((a: any) => !a.acknowledged);
  });

  const featurePerformanceAverages = computed(() => {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    // Define a type for the intermediate calculation
    interface AverageCalculation {
      sum: number;
      count: number;
    }

    const averages: Record<string, Record<string, AverageCalculation>> = {};

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

  // Additional computed functions for feature monitor
  function getActiveFeatureCount() {
    return Object.keys(featureErrorCounts.value).length;
  }

  function getTotalErrorCount(timeRange: "hour" | "day" | "week" | "month") {
    const now = Date.now();
    let startTime = now;

    switch (timeRange) {
      case "hour":
        startTime = now - 60 * 60 * 1000;
        break;
      case "day":
        startTime = now - 24 * 60 * 60 * 1000;
        break;
      case "week":
        startTime = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case "month":
        startTime = now - 30 * 24 * 60 * 60 * 1000;
        break;
    }

    return errors.value.filter((e: any) => e.timestamp >= startTime).length;
  }

  function getActiveFallbackCount() {
    return errors.value.filter((e: any) => e.fallbackTriggered && !e.resolved)
      .length;
  }

  function getUniqueUserCount(timeRange: "hour" | "day" | "week" | "month") {
    // This is a simple implementation. In a real app this would likely use user IDs
    const now = Date.now();
    let startTime = now;

    switch (timeRange) {
      case "hour":
        startTime = now - 60 * 60 * 1000;
        break;
      case "day":
        startTime = now - 24 * 60 * 60 * 1000;
        break;
      case "week":
        startTime = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case "month":
        startTime = now - 30 * 24 * 60 * 60 * 1000;
        break;
    }

    // Count unique user agents as a proxy for unique users
    const uniqueUserAgents = new Set();
    usageStats.value
      .filter((stat: any) => stat.timestamp >= startTime)
      .forEach((stat: any) => {
        if (stat.userAgent !== "disabled") {
          uniqueUserAgents.add(stat.userAgent);
        }
      });

    return uniqueUserAgents.size;
  }

  function getErrorRateData(timeRange: "hour" | "day" | "week" | "month") {
    const now = Date.now();
    let startTime = now;

    switch (timeRange) {
      case "hour":
        startTime = now - 60 * 60 * 1000;
        break;
      case "day":
        startTime = now - 24 * 60 * 60 * 1000;
        break;
      case "week":
        startTime = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case "month":
        startTime = now - 30 * 24 * 60 * 60 * 1000;
        break;
    }

    // Get all errors in the time range
    const timeRangeErrors = errors.value.filter(
      (e) => e.timestamp >= startTime,
    );

    // Count errors by feature
    const errorsByFeature: Record<string, number> = {};
    timeRangeErrors.forEach((error: any) => {
      errorsByFeature[error.featureId] =
        (errorsByFeature[error.featureId] || 0) + 1;
    });

    // Get all usages in the time range
    const timeRangeUsage = usageStats.value.filter(
      (s) => s.timestamp >= startTime,
    );

    // Count usage by feature
    const usageByFeature: Record<string, number> = {};
    timeRangeUsage.forEach((stat: any) => {
      usageByFeature[stat.featureId] =
        (usageByFeature[stat.featureId] || 0) + 1;
    });

    // Calculate error rates
    const errorRates: Array<{ feature: string; errorRate: number }> = [];
    for (const feature in usageByFeature) {
      const errors = errorsByFeature[feature] || 0;
      const usage = usageByFeature[feature];
      if (usage > 0) {
        const rate = (errors / usage) * 100;
        errorRates.push({ feature, errorRate: Math.round(rate * 100) / 100 });
      }
    }

    // Sort by error rate descending
    errorRates.sort((a, b) => b.errorRate - a.errorRate);

    return errorRates;
  }

  function getFeatureUsageData(timeRange: "hour" | "day" | "week" | "month") {
    const now = Date.now();
    let startTime = now;

    switch (timeRange) {
      case "hour":
        startTime = now - 60 * 60 * 1000;
        break;
      case "day":
        startTime = now - 24 * 60 * 60 * 1000;
        break;
      case "week":
        startTime = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case "month":
        startTime = now - 30 * 24 * 60 * 60 * 1000;
        break;
    }

    // Get all usages in the time range
    const timeRangeUsage = usageStats.value.filter(
      (s) => s.timestamp >= startTime,
    );

    // Count usage by feature
    const usageByFeature: Record<string, number> = {};
    timeRangeUsage.forEach((stat: any) => {
      usageByFeature[stat.featureId] =
        (usageByFeature[stat.featureId] || 0) + 1;
    });

    // Convert to array format
    const usageData = Object.entries(usageByFeature).map(
      ([feature, count]) => ({
        feature,
        count,
      }),
    );

    // Sort by usage count descending
    usageData.sort((a, b) => b.count - a.count);

    return usageData;
  }

  function getPerformanceData(timeRange: "hour" | "day" | "week" | "month") {
    const now = Date.now();
    let startTime = now;

    switch (timeRange) {
      case "hour":
        startTime = now - 60 * 60 * 1000;
        break;
      case "day":
        startTime = now - 24 * 60 * 60 * 1000;
        break;
      case "week":
        startTime = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case "month":
        startTime = now - 30 * 24 * 60 * 60 * 1000;
        break;
    }

    // Get all performance metrics in the time range
    const timeRangeMetrics = performanceMetrics.value.filter(
      (m) => m.timestamp >= startTime,
    );

    // Group metrics by feature and type
    const metricsByFeatureAndType: Record<
      string,
      Record<string, number[]>
    > = {};

    timeRangeMetrics.forEach((metric: any) => {
      if (!metricsByFeatureAndType[metric.featureId]) {
        metricsByFeatureAndType[metric.featureId] = {};
      }

      if (!metricsByFeatureAndType[metric.featureId][metric.type]) {
        metricsByFeatureAndType[metric.featureId][metric.type] = [];
      }

      metricsByFeatureAndType[metric.featureId][metric.type].push(metric.value);
    });

    // Calculate averages
    const performanceData: Array<{
      feature: string;
      metric: string;
      value: number;
    }> = [];

    for (const feature in metricsByFeatureAndType) {
      for (const metricType in metricsByFeatureAndType[feature]) {
        const values = metricsByFeatureAndType[feature][metricType];
        const average =
          values.reduce((sum: any, value) => sum + value, 0) / values.length;

        performanceData.push({
          feature,
          metric: metricType,
          value: Math.round(average * 100) / 100,
        });
      }
    }

    return performanceData;
  }

  function getInteractionData(timeRange: "hour" | "day" | "week" | "month") {
    const now = Date.now();
    let startTime = now;

    switch (timeRange) {
      case "hour":
        startTime = now - 60 * 60 * 1000;
        break;
      case "day":
        startTime = now - 24 * 60 * 60 * 1000;
        break;
      case "week":
        startTime = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case "month":
        startTime = now - 30 * 24 * 60 * 60 * 1000;
        break;
    }

    // Get all usage statistics in the time range
    const timeRangeUsage = usageStats.value.filter(
      (s) => s.timestamp >= startTime,
    );

    // Group by feature and action
    const interactionsByFeatureAndAction: Record<
      string,
      Record<string, number>
    > = {};

    timeRangeUsage.forEach((stat: any) => {
      if (!interactionsByFeatureAndAction[stat.featureId]) {
        interactionsByFeatureAndAction[stat.featureId] = {};
      }

      if (!interactionsByFeatureAndAction[stat.featureId][stat.action]) {
        interactionsByFeatureAndAction[stat.featureId][stat.action] = 0;
      }

      interactionsByFeatureAndAction[stat.featureId][stat.action]++;
    });

    // Convert to array format for heatmap
    const interactionData: Array<{
      feature: string;
      action: string;
      count: number;
    }> = [];

    for (const feature in interactionsByFeatureAndAction) {
      for (const action in interactionsByFeatureAndAction[feature]) {
        interactionData.push({
          feature,
          action,
          count: interactionsByFeatureAndAction[feature][action],
        });
      }
    }

    return interactionData;
  }

  // Commented out because currently not used in the application
  // Can be uncommented when needed
  /*
  function getActiveAlerts() {
    return alerts.value
      .filter(alert => !alert.acknowledged)
      .map(alert => ({
        id: alert.id,
        title: `${alert.type.charAt(0).toUpperCase() + alert.type.slice(1)} Alert`,
        message: alert.message,
        timestamp: new Date(alert.timestamp),
        severity: alert.severity,
        feature: alert.featureId
      }));
  }
  */

  function getDetailedPerformanceMetrics(
    timeRange: "hour" | "day" | "week" | "month",
  ) {
    const now = Date.now();
    let startTime = now;

    switch (timeRange) {
      case "hour":
        startTime = now - 60 * 60 * 1000;
        break;
      case "day":
        startTime = now - 24 * 60 * 60 * 1000;
        break;
      case "week":
        startTime = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case "month":
        startTime = now - 30 * 24 * 60 * 60 * 1000;
        break;
    }

    // Get all performance metrics in the time range
    return performanceMetrics.value
      .filter((m: any) => m.timestamp >= startTime)
      .map((metric: any) => ({
        id: metric.id,
        feature: metric.featureId,
        component: metric.component,
        type: metric.type,
        value: metric.value,
        timestamp: new Date(metric.timestamp),
        viewport: metric.viewport,
      }));
  }

  function getDetailedUsageStatistics(
    timeRange: "hour" | "day" | "week" | "month",
  ) {
    const now = Date.now();
    let startTime = now;

    switch (timeRange) {
      case "hour":
        startTime = now - 60 * 60 * 1000;
        break;
      case "day":
        startTime = now - 24 * 60 * 60 * 1000;
        break;
      case "week":
        startTime = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case "month":
        startTime = now - 30 * 24 * 60 * 60 * 1000;
        break;
    }

    // Get all usage stats in the time range
    return usageStats.value
      .filter((s: any) => s.timestamp >= startTime)
      .map((stat: any) => ({
        id: stat.id,
        feature: stat.featureId,
        component: stat.component,
        action: stat.action,
        timestamp: new Date(stat.timestamp),
        duration: stat.duration,
        successful: stat.successful,
        feedback: stat.userFeedback,
      }));
  }

  function getFilteredErrors(options: {
    timeRange: "hour" | "day" | "week" | "month";
    severity?: string;
    feature?: string;
  }) {
    const now = Date.now();
    let startTime = now;

    switch (options.timeRange) {
      case "hour":
        startTime = now - 60 * 60 * 1000;
        break;
      case "day":
        startTime = now - 24 * 60 * 60 * 1000;
        break;
      case "week":
        startTime = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case "month":
        startTime = now - 30 * 24 * 60 * 60 * 1000;
        break;
    }

    let filteredErrors = errors.value.filter((e: any) => e.timestamp >= startTime);

    // Filter by severity if provided
    if (options.severity) {
      filteredErrors = filteredErrors.filter(
        (e) => e.severity === options.severity,
      );
    }

    // Filter by feature if provided
    if (options.feature) {
      filteredErrors = filteredErrors.filter(
        (e) => e.featureId === options.feature,
      );
    }

    return filteredErrors.map((error: any) => ({
      id: error.id,
      feature: error.featureId,
      component: error.component,
      message: error.message,
      stack: error.stack,
      timestamp: new Date(error.timestamp),
      severity: error.severity,
      resolved: error.resolved,
      userAction: error.userAction,
      fallbackTriggered: error.fallbackTriggered,
      count: error.count,
      lastOccurrence: new Date(error.lastOccurrence),
    }));
  }

  function getSettings() {
    return settings.value;
  }

  function refreshData() {
    // In a real implementation, this would likely refresh data from backend services
    // For this example, we'll simulate it with a promise
    return new Promise<void>((resolve) => {
      // Load data from storage
      loadFromStorage();

      // Clean up old data
      cleanupOldData();

      // Simulate network delay
      setTimeout(() => {
        resolve();
      }, 500);
    });
  }

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
    getSettings,

    // Feature monitoring methods
    getActiveFeatureCount,
    getTotalErrorCount,
    getActiveFallbackCount,
    getUniqueUserCount,
    getErrorRateData,
    getFeatureUsageData,
    getPerformanceData,
    getInteractionData,
    getDetailedPerformanceMetrics,
    getDetailedUsageStatistics,
    getFilteredErrors,
    // No longer returning getActiveAlerts since it's not used

    // Utilities
    exportData,
    cleanupOldData,
    refreshData,
  };
});
