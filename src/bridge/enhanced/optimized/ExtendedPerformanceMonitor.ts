import { PerformanceMonitor, PerformanceMetricType, PerformanceStats } from './PerformanceMonitor';
import { createLogger } from '../logger/index';

interface PerformanceOverview {
  totalMetrics: number;
  averageResponseTime: number;
  slowestOperations: Array<{ type: string; name: string; avg: number }>;
  performanceScore: number;
  metrics?: any;
  issues?: any[];
  memory?: any;
  frameRate?: number;
}

interface PerformanceIssue {
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  recommendation: string;
  metrics?: PerformanceStats;
  component?: string;
  details?: any;
}

/**
 * Extended PerformanceMonitor with additional diagnostic methods
 */
export class ExtendedPerformanceMonitor extends PerformanceMonitor {
  private extendedLogger = createLogger('ExtendedPerformanceMonitor');
  private currentIssues: PerformanceIssue[] = [];

  /**
   * Get a performance overview
   */
  public getPerformanceOverview(): PerformanceOverview {
    const allStats = this.getAllStats();
    let totalAvg = 0;
    let count = 0;
    const operations: Array<{ type: string; name: string; avg: number }> = [];

    Object.entries(allStats).forEach(([key, stats]: any) => {
      if (stats.count > 0) {
        totalAvg += stats.avg;
        count++;
        operations.push({
          type: key.split('_')[0],
          name: key.split('_').slice(1).join('_') || key,
          avg: stats.avg
        });
      }
    });

    // Sort by average time descending
    operations.sort((a, b) => b.avg - a.avg);

    // Calculate performance score (0-100)
    const avgResponseTime = count > 0 ? totalAvg / count : 0;
    const performanceScore = Math.max(0, Math.min(100, 100 - (avgResponseTime / 10)));

    return {
      totalMetrics: this.getMetrics().length,
      averageResponseTime: avgResponseTime,
      slowestOperations: operations.slice(0, 10),
      performanceScore
    };
  }

  /**
   * Get current performance issues
   */
  public getCurrentIssues(): PerformanceIssue[] {
    this.analyzePerformance();
    return [...this.currentIssues];
  }

  /**
   * Analyze performance and detect issues
   */
  private analyzePerformance(): void {
    this.currentIssues = [];
    const allStats = this.getAllStats();

    Object.entries(allStats).forEach(([key, stats]: any) => {
      // Check for slow operations
      if (stats.avg > 50) {
        this.currentIssues.push({
          type: 'slow_operation',
          severity: stats.avg > 100 ? 'high' : 'medium',
          description: `Operation "${key}" is taking ${stats.avg.toFixed(2)}ms on average`,
          recommendation: 'Consider optimizing this operation or breaking it into smaller chunks',
          metrics: stats
        });
      }

      // Check for high variance
      if (stats.max > stats.avg * 10 && stats.count > 10) {
        this.currentIssues.push({
          type: 'high_variance',
          severity: 'medium',
          description: `Operation "${key}" has high variance (max: ${stats.max.toFixed(2)}ms, avg: ${stats.avg.toFixed(2)}ms)`,
          recommendation: 'Investigate what causes occasional slowdowns',
          metrics: stats
        });
      }

      // Check for frequent operations that could be batched
      if (key.includes('event_emission') && stats.count > 100 && stats.avg > 1) {
        this.currentIssues.push({
          type: 'frequent_operations',
          severity: 'low',
          description: `Event "${key}" is emitted frequently (${stats.count} times)`,
          recommendation: 'Consider batching these events to improve performance',
          metrics: stats
        });
      }
    });

    // Sort by severity
    const severityOrder = { high: 0, medium: 1, low: 2 };
    this.currentIssues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  }

  /**
   * Clear all performance data
   */
  public clearData(): void {
    this.clearMetrics();
    this.currentIssues = [];
  }

  /**
   * Start a timer (wrapper around startMark for compatibility)
   */
  public startTimer(name: string, type: PerformanceMetricType = PerformanceMetricType.API_CALL): string {
    return this.startMark(type, name);
  }
}