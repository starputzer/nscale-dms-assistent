/**
 * Performance Monitor for nscale-assist
 * 
 * Tracks and reports performance metrics throughout the application
 */

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
}

interface PerformanceReport {
  metrics: PerformanceMetric[];
  summary: {
    avgResponseTime: number;
    p95ResponseTime: number;
    errorRate: number;
    throughput: number;
  };
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 1000;
  private reportInterval = 60000; // 1 minute
  private reportTimer?: NodeJS.Timeout;
  
  constructor() {
    if (typeof window !== 'undefined') {
      this.setupWebVitals();
      this.startReporting();
    }
  }

  /**
   * Track a performance metric
   */
  track(name: string, value: number, tags?: Record<string, string>): void {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      tags
    };

    this.metrics.push(metric);
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  /**
   * Track the duration of an async operation
   */
  async trackAsync<T>(
    name: string, 
    operation: () => Promise<T>,
    tags?: Record<string, string>
  ): Promise<T> {
    const start = performance.now();
    try {
      const result = await operation();
      this.track(name, performance.now() - start, { ...tags, status: 'success' });
      return result;
    } catch (error) {
      this.track(name, performance.now() - start, { ...tags, status: 'error' });
      throw error;
    }
  }

  /**
   * Setup Web Vitals monitoring
   */
  private setupWebVitals(): void {
    // Check if PerformanceObserver is available
    if (typeof PerformanceObserver === 'undefined') {
      return;
    }
    
    // First Contentful Paint
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          this.track('web-vitals.fcp', entry.startTime);
        }
      }
    });
    
    try {
      observer.observe({ entryTypes: ['paint'] });
    } catch (e) {
      console.debug('Paint observer not supported');
    }

    // Largest Contentful Paint
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.track('web-vitals.lcp', lastEntry.startTime);
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {
        console.debug('LCP observer not supported');
      }
    }
  }

  /**
   * Start periodic reporting
   */
  private startReporting(): void {
    this.reportTimer = setInterval(() => {
      const report = this.generateReport();
      this.sendReport(report);
    }, this.reportInterval);
  }

  /**
   * Generate a performance report
   */
  generateReport(): PerformanceReport {
    const now = Date.now();
    const recentMetrics = this.metrics.filter(
      m => now - m.timestamp < this.reportInterval
    );

    // Calculate response times
    const responseTimes = recentMetrics
      .filter(m => m.name.includes('response-time'))
      .map(m => m.value)
      .sort((a, b) => a - b);

    const avgResponseTime = responseTimes.length
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

    const p95ResponseTime = responseTimes.length
      ? responseTimes[Math.floor(responseTimes.length * 0.95)]
      : 0;

    // Calculate error rate
    const totalRequests = recentMetrics.filter(m => 
      m.tags?.status === 'success' || m.tags?.status === 'error'
    ).length;
    
    const errors = recentMetrics.filter(m => m.tags?.status === 'error').length;
    const errorRate = totalRequests ? errors / totalRequests : 0;

    // Calculate throughput
    const throughput = totalRequests / (this.reportInterval / 1000);

    return {
      metrics: recentMetrics,
      summary: {
        avgResponseTime,
        p95ResponseTime,
        errorRate,
        throughput
      },
      timestamp: now
    };
  }

  /**
   * Send report to backend or console
   */
  private sendReport(report: PerformanceReport): void {
    // In development, just log to console
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Performance Report:', {
        avgResponseTime: `${report.summary.avgResponseTime.toFixed(2)}ms`,
        p95ResponseTime: `${report.summary.p95ResponseTime.toFixed(2)}ms`,
        errorRate: `${(report.summary.errorRate * 100).toFixed(2)}%`,
        throughput: `${report.summary.throughput.toFixed(2)} req/s`
      });
    }
    
    // TODO: Send to telemetry endpoint in production
  }

  /**
   * Get current metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.reportTimer) {
      clearInterval(this.reportTimer);
      this.reportTimer = undefined;
    }
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Export types
export type { PerformanceMetric, PerformanceReport };