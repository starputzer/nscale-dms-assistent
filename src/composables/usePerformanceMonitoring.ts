/**
 * Composable for Performance Monitoring
 * Provides utilities to measure and track performance in Vue components
 */

import { onMounted, onUnmounted, ref } from 'vue';
import { telemetryService, recordMetric, measureRenderTime } from '@/services/telemetry';

export interface PerformanceOptions {
  trackRender?: boolean;
  trackInteractions?: boolean;
  trackMemory?: boolean;
  componentName?: string;
}

export function usePerformanceMonitoring(options: PerformanceOptions = {}) {
  const {
    trackRender = true,
    trackInteractions = false,
    trackMemory = false,
    componentName = 'Unknown'
  } = options;

  const renderStartTime = ref<number>(0);
  const interactionMetrics = ref<Record<string, number>>({});
  const memoryUsage = ref<number>(0);

  // Track component render time
  if (trackRender) {
    renderStartTime.value = performance.now();
    
    onMounted(() => {
      const renderTime = performance.now() - renderStartTime.value;
      measureRenderTime(componentName, renderTime);
    });
  }

  // Track memory usage
  if (trackMemory && 'memory' in performance) {
    const measureMemory = () => {
      const memory = (performance as any).memory;
      const usedMemory = memory.usedJSHeapSize / 1048576; // MB
      memoryUsage.value = usedMemory;
      recordMetric(`${componentName}_memory`, usedMemory, 'MB');
    };

    onMounted(() => {
      measureMemory();
      // Measure again after a delay to see memory growth
      setTimeout(measureMemory, 5000);
    });
  }

  // Track user interactions
  function trackInteraction(interactionName: string, startTime?: number) {
    if (!trackInteractions) return;

    const duration = startTime ? performance.now() - startTime : 0;
    interactionMetrics.value[interactionName] = duration;
    
    recordMetric(`${componentName}_${interactionName}`, duration, 'ms', {
      component: componentName,
      interaction: interactionName
    });
  }

  // Measure async operation
  async function measureAsync<T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now();
    
    try {
      const result = await operation();
      const duration = performance.now() - startTime;
      
      recordMetric(`${componentName}_${operationName}`, duration, 'ms', {
        component: componentName,
        operation: operationName,
        status: 'success'
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      recordMetric(`${componentName}_${operationName}`, duration, 'ms', {
        component: componentName,
        operation: operationName,
        status: 'error'
      });
      
      throw error;
    }
  }

  // Mark a specific point in time
  function mark(markName: string) {
    performance.mark(`${componentName}_${markName}`);
  }

  // Measure between two marks
  function measure(measureName: string, startMark: string, endMark?: string) {
    const start = `${componentName}_${startMark}`;
    const end = endMark ? `${componentName}_${endMark}` : undefined;
    
    try {
      performance.measure(`${componentName}_${measureName}`, start, end);
      
      const entries = performance.getEntriesByName(`${componentName}_${measureName}`);
      if (entries.length > 0) {
        const duration = entries[entries.length - 1].duration;
        recordMetric(measureName, duration, 'ms', { component: componentName });
      }
    } catch (error) {
      console.error('Performance measurement failed:', error);
    }
  }

  // Get current performance metrics
  function getMetrics() {
    return {
      renderTime: renderStartTime.value ? performance.now() - renderStartTime.value : 0,
      interactionMetrics: { ...interactionMetrics.value },
      memoryUsage: memoryUsage.value,
      baseline: telemetryService.getBaseline()
    };
  }

  // Cleanup
  onUnmounted(() => {
    // Clear any performance marks
    performance.clearMarks(`${componentName}_*`);
    performance.clearMeasures(`${componentName}_*`);
  });

  return {
    trackInteraction,
    measureAsync,
    mark,
    measure,
    getMetrics,
    memoryUsage
  };
}

// Convenience function for measuring API calls
export function useApiPerformance() {
  async function measureApiCall<T>(
    endpoint: string,
    apiCall: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now();
    
    try {
      const result = await apiCall();
      const duration = performance.now() - startTime;
      
      telemetryService.measureApiCall(endpoint, duration);
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      recordMetric('api_call_error', duration, 'ms', {
        endpoint,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw error;
    }
  }

  return {
    measureApiCall
  };
}

// Export baseline helper
export function getPerformanceBaseline() {
  return telemetryService.getBaseline();
}