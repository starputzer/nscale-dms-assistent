import { logger } from '../logger';

/**
 * Performance measurement types
 */
export enum PerformanceMetricType {
  STATE_UPDATE = 'state_update',
  EVENT_EMISSION = 'event_emission',
  EVENT_HANDLING = 'event_handling',
  STATE_SYNC = 'state_sync',
  COMPONENT_RENDER = 'component_render',
  DIFF_CALCULATION = 'diff_calculation',
  API_CALL = 'api_call'
}

/**
 * Interface for a performance metric
 */
export interface PerformanceMetric {
  type: PerformanceMetricType;
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * Performance statistics for a metric type
 */
export interface PerformanceStats {
  avg: number;
  min: number;
  max: number;
  p95: number;
  count: number;
  total: number;
}

/**
 * PerformanceMonitor provides tools for measuring and analyzing
 * performance of various bridge operations
 */
export class PerformanceMonitor {
  private enabled = false;
  private metrics: PerformanceMetric[] = [];
  private limitSize = 1000; // Maximum number of metrics to store
  private activeMarks: Map<string, number> = new Map();
  
  // Store aggregated metrics for efficient reporting
  private aggregatedStats: Map<string, PerformanceStats> = new Map();
  
  // Mark when the last aggregation happened
  private lastAggregation = 0;
  
  /**
   * Enable or disable performance monitoring
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    logger.info(`Performance monitoring ${enabled ? 'enabled' : 'disabled'}`);
    
    if (!enabled) {
      // Clear metrics when disabling to free memory
      this.metrics = [];
      this.aggregatedStats.clear();
    }
  }
  
  /**
   * Start measuring a performance metric
   * @param type Type of metric being measured
   * @param name Specific name for this measurement
   * @returns A unique mark ID to use with endMark
   */
  public startMark(type: PerformanceMetricType, name: string): string {
    if (!this.enabled) return '';
    
    const markId = `${type}_${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.activeMarks.set(markId, performance.now());
    return markId;
  }
  
  /**
   * End a performance measurement and record the metric
   * @param markId The ID returned from startMark
   * @param metadata Optional additional data about this measurement
   * @returns The duration in milliseconds, or -1 if monitoring is disabled
   */
  public endMark(markId: string, metadata?: Record<string, any>): number {
    if (!this.enabled || !markId || !this.activeMarks.has(markId)) return -1;
    
    const startTime = this.activeMarks.get(markId)!;
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Extract type and name from markId
    const [type, name] = markId.split('_', 2);
    
    // Record the metric
    this.recordMetric({
      type: type as PerformanceMetricType,
      name,
      duration,
      timestamp: Date.now(),
      metadata
    });
    
    // Clean up
    this.activeMarks.delete(markId);
    
    return duration;
  }
  
  /**
   * Record a metric directly without using marks
   */
  public recordMetric(metric: PerformanceMetric): void {
    if (!this.enabled) return;
    
    this.metrics.push(metric);
    
    // Trim metrics if exceeding limit
    if (this.metrics.length > this.limitSize) {
      this.metrics = this.metrics.slice(-this.limitSize);
    }
    
    // Re-aggregate if it's been more than 5 seconds
    const now = Date.now();
    if (now - this.lastAggregation > 5000) {
      this.aggregateMetrics();
      this.lastAggregation = now;
    }
  }
  
  /**
   * Measure the execution time of a function
   * @param fn Function to measure
   * @param type Type of metric
   * @param name Name for this measurement
   * @param metadata Optional metadata
   * @returns The return value of the function
   */
  public measure<T>(
    fn: () => T,
    type: PerformanceMetricType,
    name: string,
    metadata?: Record<string, any>
  ): T {
    if (!this.enabled) return fn();
    
    const markId = this.startMark(type, name);
    try {
      const result = fn();
      this.endMark(markId, metadata);
      return result;
    } catch (error) {
      this.endMark(markId, { ...metadata, error: true });
      throw error;
    }
  }
  
  /**
   * Create a wrapped version of a function that is automatically measured
   * @param fn Function to wrap
   * @param type Metric type
   * @param name Metric name
   * @returns Wrapped function with same signature
   */
  public createMeasuredFunction<T extends (...args: any[]) => any>(
    fn: T,
    type: PerformanceMetricType,
    name: string
  ): T {
    return ((...args: Parameters<T>): ReturnType<T> => {
      return this.measure(
        () => fn(...args),
        type,
        name,
        { args: args.length }
      );
    }) as T;
  }
  
  /**
   * Get all recorded metrics
   */
  public getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }
  
  /**
   * Get metrics filtered by type and optionally name
   */
  public getMetricsByType(
    type: PerformanceMetricType,
    name?: string
  ): PerformanceMetric[] {
    return this.metrics.filter(m => 
      m.type === type && (name === undefined || m.name === name)
    );
  }
  
  /**
   * Calculate performance statistics for a specific metric type
   */
  public getStatsByType(
    type: PerformanceMetricType,
    name?: string
  ): PerformanceStats | null {
    // Check if we have pre-aggregated stats
    const key = name ? `${type}_${name}` : type;
    if (this.aggregatedStats.has(key)) {
      return this.aggregatedStats.get(key)!;
    }
    
    // Otherwise calculate stats directly
    const metrics = this.getMetricsByType(type, name);
    if (metrics.length === 0) return null;
    
    return this.calculateStats(metrics.map(m => m.duration));
  }
  
  /**
   * Calculate stats for a set of durations
   */
  private calculateStats(durations: number[]): PerformanceStats {
    if (durations.length === 0) {
      return { avg: 0, min: 0, max: 0, p95: 0, count: 0, total: 0 };
    }
    
    const sorted = [...durations].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const total = sorted.reduce((sum, val) => sum + val, 0);
    const avg = total / sorted.length;
    
    // Calculate 95th percentile
    const p95Index = Math.floor(sorted.length * 0.95);
    const p95 = sorted[p95Index];
    
    return {
      avg,
      min,
      max,
      p95,
      count: sorted.length,
      total
    };
  }
  
  /**
   * Aggregate metrics for faster reporting
   */
  private aggregateMetrics(): void {
    const metricsByKey = new Map<string, number[]>();
    
    // Group metrics by type and name
    for (const metric of this.metrics) {
      const typeKey = metric.type;
      const nameKey = `${metric.type}_${metric.name}`;
      
      // Add to type-level metrics
      if (!metricsByKey.has(typeKey)) {
        metricsByKey.set(typeKey, []);
      }
      metricsByKey.get(typeKey)!.push(metric.duration);
      
      // Add to name-level metrics
      if (!metricsByKey.has(nameKey)) {
        metricsByKey.set(nameKey, []);
      }
      metricsByKey.get(nameKey)!.push(metric.duration);
    }
    
    // Calculate stats for each key
    for (const [key, durations] of metricsByKey.entries()) {
      this.aggregatedStats.set(key, this.calculateStats(durations));
    }
  }
  
  /**
   * Get all aggregated statistics
   */
  public getAllStats(): Record<string, PerformanceStats> {
    this.aggregateMetrics();
    this.lastAggregation = Date.now();
    
    const result: Record<string, PerformanceStats> = {};
    for (const [key, stats] of this.aggregatedStats.entries()) {
      result[key] = stats;
    }
    
    return result;
  }
  
  /**
   * Clear all recorded metrics
   */
  public clearMetrics(): void {
    this.metrics = [];
    this.aggregatedStats.clear();
    this.lastAggregation = 0;
    logger.debug('Performance metrics cleared');
  }
  
  /**
   * Generate a performance report
   */
  public generateReport(): Record<string, any> {
    this.aggregateMetrics();
    
    return {
      timestamp: Date.now(),
      metricsCount: this.metrics.length,
      enabled: this.enabled,
      stats: this.getAllStats(),
      activeMarks: this.activeMarks.size,
      summary: this.generateSummary()
    };
  }
  
  /**
   * Generate a summary of performance issues
   */
  private generateSummary(): Record<string, any> {
    const summary: Record<string, any> = {
      issues: [],
      recommendations: []
    };
    
    // Look for slow operations
    for (const [key, stats] of this.aggregatedStats.entries()) {
      // Different thresholds based on operation type
      let threshold = 16.67; // 60fps frame budget
      
      if (key.startsWith(PerformanceMetricType.STATE_UPDATE)) {
        threshold = 5; // State updates should be fast
      } else if (key.startsWith(PerformanceMetricType.COMPONENT_RENDER)) {
        threshold = 10; // Component renders should be under 10ms ideally
      } else if (key.startsWith(PerformanceMetricType.DIFF_CALCULATION)) {
        threshold = 3; // Diff calculations should be very fast
      }
      
      if (stats.avg > threshold) {
        summary.issues.push({
          type: 'slow_operation',
          key,
          avg: stats.avg,
          threshold,
          count: stats.count
        });
        
        // Add recommendations based on issue type
        if (key.startsWith(PerformanceMetricType.STATE_UPDATE)) {
          summary.recommendations.push(
            'Consider reducing state update frequency or size'
          );
        } else if (key.startsWith(PerformanceMetricType.COMPONENT_RENDER)) {
          summary.recommendations.push(
            'Check for unnecessary renders or complex component trees'
          );
        }
      }
    }
    
    return summary;
  }
}