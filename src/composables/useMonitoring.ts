import { ref, computed, onMounted, onUnmounted } from "vue";
import { useMonitoringStore } from "../stores/monitoringStore";
import { useFeatureTogglesStore } from "../stores/featureToggles";
import { LogService } from "../services/log/LogService";
import { isDevelopment } from "@/utils/environmentUtils";

export function useMonitoring(featureId: string, componentName: string) {
  const monitoringStore = useMonitoringStore();
  const featureStore = useFeatureTogglesStore();

  // Check if monitoring is enabled for this feature
  const feature = computed(() => {
    return featureStore.features.find((f: any) => f.id === featureId);
  });

  const isMonitoringEnabled = computed(() => {
    return (
      feature.value?.enabled && monitoringStore.settings.dataCollection.errors
    );
  });

  // Performance monitoring
  const startTimes = ref<Record<string, number>>({});

  function startMeasure(actionName: string = "render") {
    if (!isMonitoringEnabled.value) return;

    startTimes.value[actionName] = performance.now();
  }

  function endMeasure(
    actionName: string = "render",
    type: "renderTime" | "totalTime" = "renderTime",
  ) {
    if (!isMonitoringEnabled.value || !startTimes.value[actionName]) return;

    const duration = performance.now() - startTimes.value[actionName];
    monitoringStore.trackPerformance(featureId, componentName, type, duration);

    // Clean up
    delete startTimes.value[actionName];

    return duration;
  }

  // Memory usage tracking
  function trackMemoryUsage() {
    if (!isMonitoringEnabled.value) return;

    if ("performance" in window && "memory" in performance) {
      // @ts-ignore - TypeScript doesn't recognize the memory API
      const memoryInfo = performance.memory;
      if (memoryInfo && memoryInfo.usedJSHeapSize) {
        monitoringStore.trackPerformance(
          featureId,
          componentName,
          "memoryUsage",
          // Convert to MB for easier readability
          memoryInfo.usedJSHeapSize / (1024 * 1024),
        );
      }
    }
  }

  // Network time tracking for API calls
<<<<<<< HEAD
  function trackNetworkTime(_url: string, duration: number) {
=======
  function trackNetworkTime(url: string, duration: number) {
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
    if (!isMonitoringEnabled.value) return;

    monitoringStore.trackPerformance(
      featureId,
      componentName,
      "networkTime",
      duration,
    );
  }

  // Error tracking
  function trackError(
    error: Error | string,
    severity: "low" | "medium" | "high" | "critical" = "medium",
    fallbackTriggered = false,
    userAction?: string,
  ) {
    if (!isMonitoringEnabled.value) return;

    const errorMessage = typeof error === "string" ? error : error.message;
    const stack = typeof error === "string" ? undefined : error.stack;

    monitoringStore.trackError(
      featureId,
      componentName,
      errorMessage,
      severity,
      stack,
      fallbackTriggered,
      userAction,
    );

    // Also log to console in development mode
    if (isDevelopment()) {
<<<<<<< HEAD
      (LogService as any).error(
=======
      LogService.error(
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
        `[${featureId}/${componentName}] ${errorMessage}`,
        error,
      );
    }
  }

  // Usage tracking
  function trackUsage(
    action: string,
    successful: boolean = true,
    duration?: number,
    userFeedback?: { rating?: number; comments?: string },
  ) {
    if (!isMonitoringEnabled.value) return;

    monitoringStore.trackUsage(
      featureId,
      componentName,
      action,
      successful,
      duration,
      userFeedback,
    );
  }

  // Automatic render time tracking
  let mounted = false;

  onMounted(() => {
    if (isMonitoringEnabled.value) {
      startMeasure("initialRender");

      // Use next tick to measure after initial render
      setTimeout(() => {
        if (mounted) {
          endMeasure("initialRender");
          trackMemoryUsage();
        }
      }, 0);
    }

    mounted = true;
  });

  onUnmounted(() => {
    mounted = false;
    trackUsage("componentUnmounted");
  });

  // Return composable API
  return {
    // Performance tracking
    startMeasure,
    endMeasure,
    trackMemoryUsage,
    trackNetworkTime,

    // Error tracking
    trackError,

    // Usage tracking
    trackUsage,

    // Store access
    store: monitoringStore,
  };
}
