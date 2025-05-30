import { ref, computed } from 'vue';
import type { PerformanceMetrics } from '@/utils/performanceMonitor';

export interface TelemetryEvent {
  timestamp: number;
  type: 'performance' | 'error' | 'user_action' | 'api_call' | 'feature_usage';
  category: string;
  action: string;
  label?: string;
  value?: number;
  metadata?: Record<string, any>;
}

export interface PerformanceBaseline {
  fps: { p50: number; p90: number; p99: number };
  renderTime: { p50: number; p90: number; p99: number };
  memoryUsage: { p50: number; p90: number; p99: number };
  apiLatency: { p50: number; p90: number; p99: number };
  bundleSize: number;
  initialLoadTime: number;
}

export interface ErrorEvent {
  timestamp: number;
  message: string;
  stack?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context: Record<string, any>;
  userAgent: string;
  url: string;
}

interface TelemetryConfig {
  enabled: boolean;
  endpoint: string;
  apiKey: string;
  sampleRate: number;
  batchSize: number;
  flushInterval: number;
  debug: boolean;
}

class TelemetryService {
  private config: TelemetryConfig;
  private eventQueue: TelemetryEvent[] = [];
  private errorQueue: ErrorEvent[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private sessionId: string;
  private userId: string | null = null;
  
  // Performance tracking
  private performanceData: number[] = [];
  private baseline: PerformanceBaseline | null = null;
  
  // Feature usage tracking
  private featureUsage = new Map<string, number>();
  
  // API performance tracking
  private apiMetrics = new Map<string, number[]>();

  constructor(config: Partial<TelemetryConfig> = {}) {
    this.config = {
      enabled: import.meta.env.PROD && import.meta.env.VITE_ENABLE_TELEMETRY === 'true',
      endpoint: import.meta.env.VITE_TELEMETRY_ENDPOINT || 'https://telemetry.nscale-assist.de',
      apiKey: import.meta.env.VITE_TELEMETRY_API_KEY || '',
      sampleRate: 0.1, // 10% sampling
      batchSize: 50,
      flushInterval: 30000, // 30 seconds
      debug: import.meta.env.DEV,
      ...config
    };

    this.sessionId = this.generateSessionId();
    this.initializeErrorHandling();
    this.scheduleFlush();
  }

  /**
   * Track a telemetry event
   */
  track(event: Omit<TelemetryEvent, 'timestamp'>): void {
    if (!this.config.enabled || Math.random() > this.config.sampleRate) return;

    const telemetryEvent: TelemetryEvent = {
      ...event,
      timestamp: Date.now(),
      metadata: {
        ...event.metadata,
        sessionId: this.sessionId,
        userId: this.userId,
        userAgent: navigator.userAgent,
        url: window.location.href
      }
    };

    this.eventQueue.push(telemetryEvent);

    if (this.config.debug) {
      console.log('[Telemetry]', telemetryEvent);
    }

    // Track feature usage
    if (event.type === 'feature_usage' && event.action) {
      this.featureUsage.set(
        event.action,
        (this.featureUsage.get(event.action) || 0) + 1
      );
    }

    // Track API metrics
    if (event.type === 'api_call' && event.value !== undefined) {
      const endpoint = event.label || 'unknown';
      if (!this.apiMetrics.has(endpoint)) {
        this.apiMetrics.set(endpoint, []);
      }
      this.apiMetrics.get(endpoint)!.push(event.value);
    }

    if (this.eventQueue.length >= this.config.batchSize) {
      this.flush();
    }
  }

  /**
   * Track performance metrics
   */
  trackPerformance(metrics: PerformanceMetrics): void {
    this.track({
      type: 'performance',
      category: 'metrics',
      action: 'measurement',
      metadata: {
        fps: metrics.fps,
        frameTime: metrics.frameTime,
        memoryUsed: metrics.memoryUsed,
        memoryLimit: metrics.memoryLimit,
        renderCount: metrics.renderCount,
        updateCount: metrics.updateCount
      }
    });

    // Store for baseline calculation
    this.performanceData.push(metrics.fps);
  }

  /**
   * Track errors
   */
  trackError(error: Error | ErrorEvent, context?: Record<string, any>): void {
    if (!this.config.enabled) return;

    const errorEvent: ErrorEvent = error instanceof Error ? {
      timestamp: Date.now(),
      message: error.message,
      stack: error.stack,
      severity: this.calculateSeverity(error),
      context: context || {},
      userAgent: navigator.userAgent,
      url: window.location.href
    } : error;

    this.errorQueue.push(errorEvent);

    if (this.config.debug) {
      console.error('[Telemetry Error]', errorEvent);
    }

    // Immediate flush for critical errors
    if (errorEvent.severity === 'critical') {
      this.flush();
    }
  }

  /**
   * Track user actions
   */
  trackUserAction(action: string, category: string, label?: string, value?: number): void {
    this.track({
      type: 'user_action',
      category,
      action,
      label,
      value
    });
  }

  /**
   * Track feature usage
   */
  trackFeatureUsage(feature: string, action: string = 'used'): void {
    this.track({
      type: 'feature_usage',
      category: 'features',
      action: feature,
      label: action
    });
  }

  /**
   * Track API performance
   */
  trackApiCall(endpoint: string, duration: number, status: number, method: string = 'GET'): void {
    this.track({
      type: 'api_call',
      category: 'api',
      action: method,
      label: endpoint,
      value: duration,
      metadata: { status }
    });
  }

  /**
   * Calculate performance baseline
   */
  calculateBaseline(): PerformanceBaseline {
    const calculatePercentiles = (data: number[]): { p50: number; p90: number; p99: number } => {
      const sorted = [...data].sort((a, b) => a - b);
      return {
        p50: sorted[Math.floor(sorted.length * 0.5)] || 0,
        p90: sorted[Math.floor(sorted.length * 0.9)] || 0,
        p99: sorted[Math.floor(sorted.length * 0.99)] || 0
      };
    };

    // Collect all API latencies
    const allApiLatencies: number[] = [];
    this.apiMetrics.forEach(latencies => {
      allApiLatencies.push(...latencies);
    });

    this.baseline = {
      fps: calculatePercentiles(this.performanceData),
      renderTime: calculatePercentiles([16, 20, 25]), // Placeholder, should be tracked
      memoryUsage: calculatePercentiles([50, 75, 100]), // Placeholder, should be tracked
      apiLatency: calculatePercentiles(allApiLatencies),
      bundleSize: 0, // Set during build
      initialLoadTime: performance.timing.loadEventEnd - performance.timing.navigationStart
    };

    return this.baseline;
  }

  /**
   * Get feature usage report
   */
  getFeatureUsageReport(): Record<string, number> {
    return Object.fromEntries(this.featureUsage);
  }

  /**
   * Get API performance report
   */
  getApiPerformanceReport(): Record<string, { avg: number; p90: number; count: number }> {
    const report: Record<string, { avg: number; p90: number; count: number }> = {};

    this.apiMetrics.forEach((latencies, endpoint: any) => {
      if (latencies.length === 0) return;

      const sorted = [...latencies].sort((a, b) => a - b);
      const avg = latencies.reduce((sum: any, val) => sum + val, 0) / latencies.length;
      const p90 = sorted[Math.floor(sorted.length * 0.9)] || 0;

      report[endpoint] = { avg, p90, count: latencies.length };
    });

    return report;
  }

  /**
   * Set user ID for tracking
   */
  setUserId(userId: string | null): void {
    this.userId = userId;
  }

  /**
   * Flush events to backend
   */
  private async flush(): Promise<void> {
    if (!this.config.enabled || (this.eventQueue.length === 0 && this.errorQueue.length === 0)) {
      return;
    }

    const events = [...this.eventQueue];
    const errors = [...this.errorQueue];
    
    this.eventQueue = [];
    this.errorQueue = [];

    try {
      const payload = {
        sessionId: this.sessionId,
        events,
        errors,
        timestamp: Date.now()
      };

      const response = await fetch(`${this.config.endpoint}/collect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.apiKey
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Telemetry flush failed: ${response.statusText}`);
      }
    } catch (error) {
      if (this.config.debug) {
        console.error('[Telemetry] Flush failed:', error);
      }
      
      // Re-queue events on failure (with limit)
      if (this.eventQueue.length < this.config.batchSize * 2) {
        this.eventQueue.unshift(...events.slice(0, this.config.batchSize));
      }
    }
  }

  /**
   * Schedule periodic flush
   */
  private scheduleFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  /**
   * Initialize global error handling
   */
  private initializeErrorHandling(): void {
    // Catch unhandled errors
    window.addEventListener('error', (event) => {
      this.trackError(new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError(new Error(event.reason), {
        type: 'unhandledRejection'
      });
    });
  }

  /**
   * Calculate error severity
   */
  private calculateSeverity(error: Error): 'low' | 'medium' | 'high' | 'critical' {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'low';
    }
    if (message.includes('undefined') || message.includes('null')) {
      return 'medium';
    }
    if (message.includes('security') || message.includes('auth')) {
      return 'high';
    }
    if (message.includes('fatal') || message.includes('crash')) {
      return 'critical';
    }
    
    return 'medium';
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup
   */
  dispose(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush();
  }
}

// Singleton instance
let telemetryInstance: TelemetryService | null = null;

export function getTelemetryService(config?: Partial<TelemetryConfig>): TelemetryService {
  if (!telemetryInstance) {
    telemetryInstance = new TelemetryService(config);
  }
  return telemetryInstance;
}

// Vue composable
export function useTelemetry() {
  const telemetry = getTelemetryService();
  
  return {
    track: telemetry.track.bind(telemetry),
    trackError: telemetry.trackError.bind(telemetry),
    trackUserAction: telemetry.trackUserAction.bind(telemetry),
    trackFeatureUsage: telemetry.trackFeatureUsage.bind(telemetry),
    trackApiCall: telemetry.trackApiCall.bind(telemetry),
    trackPerformance: telemetry.trackPerformance.bind(telemetry),
    setUserId: telemetry.setUserId.bind(telemetry),
    getFeatureUsageReport: telemetry.getFeatureUsageReport.bind(telemetry),
    getApiPerformanceReport: telemetry.getApiPerformanceReport.bind(telemetry),
    calculateBaseline: telemetry.calculateBaseline.bind(telemetry)
  };
}