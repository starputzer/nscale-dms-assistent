/**
 * Telemetry Service for Performance Monitoring
 * Tracks application performance metrics and sends them to the backend
 */

import { ref, reactive } from 'vue';
import axios from 'axios';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  tags?: Record<string, string>;
}

export interface PerformanceBaseline {
  initialLoad: number;
  timeToInteractive: number;
  memoryUsage: number;
  bundleSize: number;
  apiResponseTime: number;
  renderTime: number;
}

class TelemetryService {
  private metrics: PerformanceMetric[] = [];
  private baseline = reactive<PerformanceBaseline>({
    initialLoad: 0,
    timeToInteractive: 0,
    memoryUsage: 0,
    bundleSize: 0,
    apiResponseTime: 0,
    renderTime: 0
  });
  
  private isEnabled = ref(true);
  private batchSize = 50;
  private flushInterval = 30000; // 30 seconds
  private intervalId: number | null = null;

  constructor() {
    this.startBatchFlush();
    this.measureInitialMetrics();
  }

  /**
   * Record a performance metric
   */
  recordMetric(name: string, value: number, unit: string = 'ms', tags?: Record<string, string>) {
    if (!this.isEnabled.value) return;

    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      tags
    };

    this.metrics.push(metric);

    // Flush if batch size reached
    if (this.metrics.length >= this.batchSize) {
      this.flush();
    }
  }

  /**
   * Measure initial load metrics
   */
  private measureInitialMetrics() {
    // Use Performance API if available
    if (typeof window !== 'undefined' && window.performance) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigation) {
        this.baseline.initialLoad = navigation.loadEventEnd - navigation.fetchStart;
        this.baseline.timeToInteractive = navigation.domInteractive - navigation.fetchStart;
        
        this.recordMetric('initial_load', this.baseline.initialLoad, 'ms', { type: 'navigation' });
        this.recordMetric('time_to_interactive', this.baseline.timeToInteractive, 'ms', { type: 'navigation' });
      }
    }

    // Measure memory usage if available
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.baseline.memoryUsage = memory.usedJSHeapSize / 1048576; // Convert to MB
      this.recordMetric('memory_usage', this.baseline.memoryUsage, 'MB', { type: 'memory' });
    }
  }

  /**
   * Start batch flush interval
   */
  private startBatchFlush() {
    if (this.intervalId) return;

    this.intervalId = window.setInterval(() => {
      if (this.metrics.length > 0) {
        this.flush();
      }
    }, this.flushInterval);
  }

  /**
   * Stop batch flush interval
   */
  private stopBatchFlush() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Flush metrics to backend
   */
  async flush() {
    if (!this.isEnabled.value || this.metrics.length === 0) return;

    const metricsToSend = [...this.metrics];
    this.metrics = [];

    try {
      await axios.post('/api/telemetry', {
        metrics: metricsToSend,
        sessionId: this.getSessionId(),
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Failed to send telemetry metrics:', error);
      // Re-add metrics if send failed
      this.metrics.unshift(...metricsToSend);
    }
  }

  /**
   * Get or create session ID
   */
  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('telemetry_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('telemetry_session_id', sessionId);
    }
    return sessionId;
  }

  /**
   * Measure API call performance
   */
  measureApiCall(endpoint: string, duration: number) {
    this.recordMetric('api_call_duration', duration, 'ms', { endpoint });
    
    // Update baseline average
    if (this.baseline.apiResponseTime === 0) {
      this.baseline.apiResponseTime = duration;
    } else {
      this.baseline.apiResponseTime = (this.baseline.apiResponseTime + duration) / 2;
    }
  }

  /**
   * Measure component render time
   */
  measureRenderTime(componentName: string, duration: number) {
    this.recordMetric('component_render', duration, 'ms', { component: componentName });
    
    // Update baseline average
    if (this.baseline.renderTime === 0) {
      this.baseline.renderTime = duration;
    } else {
      this.baseline.renderTime = (this.baseline.renderTime + duration) / 2;
    }
  }

  /**
   * Get current baseline metrics
   */
  getBaseline(): PerformanceBaseline {
    return { ...this.baseline };
  }

  /**
   * Enable/disable telemetry
   */
  setEnabled(enabled: boolean) {
    this.isEnabled.value = enabled;
    if (!enabled) {
      this.stopBatchFlush();
    } else {
      this.startBatchFlush();
    }
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Clear all metrics
   */
  clearMetrics() {
    this.metrics = [];
  }

  /**
   * Destroy service
   */
  destroy() {
    this.stopBatchFlush();
    this.flush();
  }
}

// Export singleton instance
export const telemetryService = new TelemetryService();

// Export convenience functions
export function recordMetric(name: string, value: number, unit?: string, tags?: Record<string, string>) {
  telemetryService.recordMetric(name, value, unit, tags);
}

export function measureApiCall(endpoint: string, duration: number) {
  telemetryService.measureApiCall(endpoint, duration);
}

export function measureRenderTime(componentName: string, duration: number) {
  telemetryService.measureRenderTime(componentName, duration);
}

export function getPerformanceBaseline(): PerformanceBaseline {
  return telemetryService.getBaseline();
}

export default telemetryService;