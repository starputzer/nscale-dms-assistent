import { describe, it, expect, beforeEach, vi } from 'vitest';
import { performanceMonitor } from '@/utils/performanceMonitor';

describe('PerformanceMonitor', () => {
  beforeEach(() => {
    // Clear metrics before each test
    performanceMonitor.clear();
  });

  describe('track', () => {
    it('should track a metric', () => {
      performanceMonitor.track('test.metric', 100, { tag: 'test' });
      const metrics = performanceMonitor.getMetrics();
      
      expect(metrics).toHaveLength(1);
      expect(metrics[0]).toMatchObject({
        name: 'test.metric',
        value: 100,
        tags: { tag: 'test' }
      });
    });

    it('should maintain max metrics limit', () => {
      // Track more than max (1000) metrics
      for (let i = 0; i < 1100; i++) {
        performanceMonitor.track('test.metric', i);
      }
      
      const metrics = performanceMonitor.getMetrics();
      expect(metrics).toHaveLength(1000);
      expect(metrics[0].value).toBe(100); // First 100 should be dropped
    });
  });

  describe('trackAsync', () => {
    it('should track successful async operations', async () => {
      // Stop the performance monitor to prevent interference
      performanceMonitor.stop();
      
      const result = await performanceMonitor.trackAsync(
        'async.test',
        async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return 'success';
        }
      );
      
      expect(result).toBe('success');
      
      const metrics = performanceMonitor.getMetrics();
      const asyncMetric = metrics.find(m => m.name === 'async.test');
      
      expect(asyncMetric).toBeDefined();
      expect(asyncMetric?.tags?.status).toBe('success');
      expect(asyncMetric?.value).toBeGreaterThan(10);
    });

    it('should track failed async operations', async () => {
      await expect(
        performanceMonitor.trackAsync(
          'async.error',
          async () => {
            throw new Error('Test error');
          }
        )
      ).rejects.toThrow('Test error');
      
      const metrics = performanceMonitor.getMetrics();
      const errorMetric = metrics.find(m => m.name === 'async.error');
      
      expect(errorMetric).toBeDefined();
      expect(errorMetric?.tags?.status).toBe('error');
    });
  });

  describe('generateReport', () => {
    it('should generate performance report with summary', () => {
      // Add some test metrics
      performanceMonitor.track('api.response-time', 50, { status: 'success' });
      performanceMonitor.track('api.response-time', 100, { status: 'success' });
      performanceMonitor.track('api.response-time', 150, { status: 'error' });
      
      const report = performanceMonitor.generateReport();
      
      expect(report.summary.avgResponseTime).toBe(100);
      expect(report.summary.p95ResponseTime).toBe(150);
      expect(report.summary.errorRate).toBeCloseTo(0.333, 2);
    });
  });

  describe('clear', () => {
    it('should clear all metrics', () => {
      performanceMonitor.track('test.metric', 100);
      expect(performanceMonitor.getMetrics()).toHaveLength(1);
      
      performanceMonitor.clear();
      expect(performanceMonitor.getMetrics()).toHaveLength(0);
    });
  });
});