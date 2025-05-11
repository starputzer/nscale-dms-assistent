/**
 * PerformanceMonitor - Advanced performance monitoring and metrics collection
 *
 * This component provides comprehensive performance monitoring, metrics collection,
 * bottleneck detection, and visualization capabilities for the bridge system.
 */

import { BridgeLogger, BridgeErrorState } from "../types";
import { BridgeStatusManager } from "../statusManager";
import { debounce, throttle } from "./utils";

/**
 * Performance metric entry
 */
interface PerformanceMetric {
  name: string;
  category: string;
  component: string;
  value: number;
  unit: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * Performance entry with additional metadata
 */
interface EnhancedPerformanceEntry extends PerformanceEntry {
  category?: string;
  component?: string;
  metadata?: Record<string, any>;
}

/**
 * Bottleneck detection result
 */
interface BottleneckDetection {
  component: string;
  metric: string;
  severity: "low" | "medium" | "high" | "critical";
  value: number;
  threshold: number;
  timestamp: number;
  details: string;
}

/**
 * Configuration for PerformanceMonitor
 */
export interface PerformanceMonitorConfig {
  // Whether to enable automatic monitoring
  enabled: boolean;

  // Sampling interval for metrics in ms
  sampleInterval: number;

  // How many samples to keep per metric
  sampleRetention: number;

  // Performance mark prefix for bridge operations
  markPrefix: string;

  // Metrics tracking configuration
  metricsTracking: {
    // Track DOM operations
    trackDOMOperations: boolean;

    // Track Event Bus operations
    trackEventBus: boolean;

    // Track browser performance metrics
    trackBrowserMetrics: boolean;

    // Track network requests
    trackNetwork: boolean;

    // Track frame rate
    trackFrameRate: boolean;

    // Track memory usage
    trackMemory: boolean;

    // Track state operations
    trackStateOperations: boolean;

    // Track serialization operations
    trackSerialization: boolean;

    // Custom metric definitions
    customMetrics: {
      [metricName: string]: {
        category: string;
        component: string;
        unit: string;
        description: string;
        threshold?: number; // Warning threshold
        critical?: number; // Critical threshold
      };
    };
  };

  // Visualization options
  visualization: {
    // Whether to enable visualization
    enabled: boolean;

    // Update interval for visualization in ms
    updateInterval: number;

    // Max number of data points to display
    maxDataPoints: number;

    // Whether to show performance UI automatically on issues
    showOnIssues: boolean;
  };

  // Bottleneck detection
  bottleneckDetection: {
    // Whether to enable bottleneck detection
    enabled: boolean;

    // Thresholds for different metrics
    thresholds: {
      // Frame rate threshold (fps)
      frameRate: number;

      // Event processing time threshold (ms)
      eventProcessingTime: number;

      // DOM operation time threshold (ms)
      domOperationTime: number;

      // Batch size threshold
      batchSize: number;

      // State synchronization time threshold (ms)
      stateSyncTime: number;

      // Memory growth threshold (bytes)
      memoryGrowth: number;

      // Network request time threshold (ms)
      networkTime: number;

      // Bridge operation time threshold (ms)
      bridgeOperationTime: number;
    };
  };

  // Real-time notification options
  notifications: {
    // Whether to enable notifications
    enabled: boolean;

    // Whether to send critical issues to console
    logToConsole: boolean;

    // Whether to emit performance events
    emitEvents: boolean;

    // Throttle time for notifications
    throttleTime: number;

    // Whether to notify on improvements
    notifyOnImprovement: boolean;
  };
}

/**
 * Default configuration for PerformanceMonitor
 */
const DEFAULT_CONFIG: PerformanceMonitorConfig = {
  enabled: true,
  sampleInterval: 1000, // 1 second
  sampleRetention: 300, // 5 minutes at 1 second interval
  markPrefix: "bridge.",

  metricsTracking: {
    trackDOMOperations: true,
    trackEventBus: true,
    trackBrowserMetrics: true,
    trackNetwork: true,
    trackFrameRate: true,
    trackMemory: true,
    trackStateOperations: true,
    trackSerialization: true,

    customMetrics: {
      "chat.tokenRate": {
        category: "chat",
        component: "tokenStream",
        unit: "tokens/s",
        description: "Rate of tokens processed in chat streaming",
        threshold: 10, // Below 10 tokens/s is concerning
        critical: 5, // Below 5 tokens/s is critical
      },
      "event.batchSize": {
        category: "events",
        component: "eventBus",
        unit: "events",
        description: "Average event batch size",
        threshold: 50, // Above 50 events per batch is concerning
        critical: 100, // Above 100 events per batch is critical
      },
      "sync.stateSize": {
        category: "state",
        component: "stateManager",
        unit: "bytes",
        description: "Size of synchronized state",
        threshold: 500000, // 500KB
        critical: 2000000, // 2MB
      },
    },
  },

  visualization: {
    enabled: true,
    updateInterval: 1000, // 1 second
    maxDataPoints: 60, // 1 minute at 1 second interval
    showOnIssues: true,
  },

  bottleneckDetection: {
    enabled: true,
    thresholds: {
      frameRate: 30, // 30 FPS minimum
      eventProcessingTime: 50, // 50ms maximum
      domOperationTime: 16, // 16ms maximum (60fps budget)
      batchSize: 100, // 100 events maximum
      stateSyncTime: 100, // 100ms maximum
      memoryGrowth: 5 * 1024 * 1024, // 5MB per interval
      networkTime: 500, // 500ms maximum
      bridgeOperationTime: 100, // 100ms maximum
    },
  },

  notifications: {
    enabled: true,
    logToConsole: true,
    emitEvents: true,
    throttleTime: 5000, // 5 seconds
    notifyOnImprovement: false,
  },
};

/**
 * Implementation of the performance monitor
 */
export class PerformanceMonitor {
  private logger: BridgeLogger;
  private statusManager: BridgeStatusManager;
  private config: PerformanceMonitorConfig;

  // Metrics storage
  private metrics: Map<string, PerformanceMetric[]> = new Map();

  // Current performance issues
  private currentIssues: Map<string, BottleneckDetection> = new Map();

  // Bottleneck history
  private bottleneckHistory: BottleneckDetection[] = [];

  // Sampling interval ID
  private samplingIntervalId: number | null = null;

  // Visualization interval ID
  private visualizationIntervalId: number | null = null;

  // Frame rate tracking
  private lastFrameTime: number = 0;
  private frameRates: number[] = [];

  // Observers
  private performanceObserver: PerformanceObserver | null = null;
  private resourceObserver: PerformanceObserver | null = null;
  private longTaskObserver: PerformanceObserver | null = null;

  // Notification throttling
  private throttledNotify: (issue: BottleneckDetection) => void;

  constructor(
    logger: BridgeLogger,
    statusManager: BridgeStatusManager,
    config: Partial<PerformanceMonitorConfig> = {},
  ) {
    this.logger = logger;
    this.statusManager = statusManager;
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Set up throttled notification
    this.throttledNotify = throttle(
      this.notifyIssue.bind(this),
      this.config.notifications.throttleTime,
    );

    // Start monitoring if enabled
    if (this.config.enabled) {
      this.startMonitoring();
    }

    this.logger.info("PerformanceMonitor initialized");
  }

  /**
   * Starts performance monitoring
   */
  startMonitoring(): void {
    // Stop existing monitoring
    this.stopMonitoring();

    // Set up performance observers
    this.setupPerformanceObservers();

    // Start sampling interval
    this.samplingIntervalId = window.setInterval(() => {
      this.sampleMetrics();
    }, this.config.sampleInterval);

    // Start visualization interval if enabled
    if (this.config.visualization.enabled) {
      this.visualizationIntervalId = window.setInterval(() => {
        this.updateVisualization();
      }, this.config.visualization.updateInterval);
    }

    // Start frame rate tracking
    if (this.config.metricsTracking.trackFrameRate) {
      this.startFrameRateTracking();
    }

    this.logger.info("Performance monitoring started");
  }

  /**
   * Stops performance monitoring
   */
  stopMonitoring(): void {
    // Clear sampling interval
    if (this.samplingIntervalId !== null) {
      clearInterval(this.samplingIntervalId);
      this.samplingIntervalId = null;
    }

    // Clear visualization interval
    if (this.visualizationIntervalId !== null) {
      clearInterval(this.visualizationIntervalId);
      this.visualizationIntervalId = null;
    }

    // Disconnect observers
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }

    if (this.resourceObserver) {
      this.resourceObserver.disconnect();
      this.resourceObserver = null;
    }

    if (this.longTaskObserver) {
      this.longTaskObserver.disconnect();
      this.longTaskObserver = null;
    }

    // Stop frame rate tracking
    this.stopFrameRateTracking();

    this.logger.info("Performance monitoring stopped");
  }

  /**
   * Sets up performance observers
   */
  private setupPerformanceObservers(): void {
    try {
      // Set up performance observer for marks and measures
      if (
        PerformanceObserver &&
        this.config.metricsTracking.trackBrowserMetrics
      ) {
        this.performanceObserver = new PerformanceObserver((entries) => {
          this.handlePerformanceEntries(entries.getEntries());
        });

        this.performanceObserver.observe({
          entryTypes: ["mark", "measure"],
        });

        // Set up resource observer
        if (this.config.metricsTracking.trackNetwork) {
          this.resourceObserver = new PerformanceObserver((entries) => {
            this.handleResourceEntries(entries.getEntries());
          });

          this.resourceObserver.observe({
            entryTypes: ["resource"],
          });
        }

        // Set up long task observer
        this.longTaskObserver = new PerformanceObserver((entries) => {
          this.handleLongTaskEntries(entries.getEntries());
        });

        try {
          this.longTaskObserver.observe({
            entryTypes: ["longtask"],
          });
        } catch (error) {
          // Long task observation might not be supported in all browsers
          this.logger.warn("Long task observation not supported", error);
        }
      }
    } catch (error) {
      this.logger.warn("Performance observation not fully supported", error);
    }
  }

  /**
   * Handles performance entries from observers
   */
  private handlePerformanceEntries(entries: PerformanceEntry[]): void {
    for (const entry of entries) {
      // Only process entries with our prefix
      if (entry.name.startsWith(this.config.markPrefix)) {
        const parts = entry.name.split(".");

        if (parts.length >= 3) {
          const category = parts[1];
          const metricName = parts.slice(2).join(".");
          const component = parts[2] || "unknown";

          const enhancedEntry: EnhancedPerformanceEntry = entry;
          enhancedEntry.category = category;
          enhancedEntry.component = component;

          // Record the metric
          if (entry.entryType === "measure") {
            this.recordMetric(
              metricName,
              entry.duration,
              "ms",
              category,
              component,
              { entryType: entry.entryType },
            );
          }
        }
      }
    }
  }

  /**
   * Handles resource entries from observers
   */
  private handleResourceEntries(entries: PerformanceResourceTiming[]): void {
    // Group by initiatorType
    const byType: Record<string, PerformanceResourceTiming[]> = {};

    for (const entry of entries) {
      const type = entry.initiatorType;
      if (!byType[type]) {
        byType[type] = [];
      }
      byType[type].push(entry);
    }

    // Process each type
    for (const [type, typeEntries] of Object.entries(byType)) {
      // Calculate average times
      const avgDuration =
        typeEntries.reduce((sum, e) => sum + e.duration, 0) /
        typeEntries.length;

      // Record metrics
      this.recordMetric(
        `network.${type}.duration`,
        avgDuration,
        "ms",
        "network",
        type,
        { count: typeEntries.length },
      );

      // Calculate transfer size if available
      const entriesWithSize = typeEntries.filter((e) => e.transferSize > 0);
      if (entriesWithSize.length > 0) {
        const avgSize =
          entriesWithSize.reduce((sum, e) => sum + e.transferSize, 0) /
          entriesWithSize.length;

        this.recordMetric(
          `network.${type}.size`,
          avgSize,
          "bytes",
          "network",
          type,
          { count: entriesWithSize.length },
        );
      }
    }
  }

  /**
   * Handles long task entries from observers
   */
  private handleLongTaskEntries(entries: PerformanceEntry[]): void {
    for (const entry of entries) {
      this.recordMetric(
        "browser.longTask.duration",
        entry.duration,
        "ms",
        "browser",
        "main-thread",
        { entryType: entry.entryType },
      );

      // Emit a warning for long tasks
      if (entry.duration > 100) {
        this.logger.warn(`Long task detected: ${entry.duration.toFixed(2)}ms`, {
          attribution: (entry as any).attribution,
        });

        // Record as potential bottleneck
        this.detectBottleneck(
          "browser.longTask.duration",
          entry.duration,
          "browser",
          "main-thread",
        );
      }
    }
  }

  /**
   * Starts frame rate tracking
   */
  private startFrameRateTracking(): void {
    this.lastFrameTime = performance.now();
    this.frameRates = [];

    const trackFrame = () => {
      const now = performance.now();
      const delta = now - this.lastFrameTime;
      this.lastFrameTime = now;

      // Calculate FPS (cap at 60)
      const fps = Math.min(1000 / delta, 60);

      // Skip unreasonable values (e.g., after tab was inactive)
      if (fps > 0 && fps <= 60) {
        this.frameRates.push(fps);

        // Keep only recent frames
        if (this.frameRates.length > 10) {
          this.frameRates.shift();
        }
      }

      requestAnimationFrame(trackFrame);
    };

    requestAnimationFrame(trackFrame);
  }

  /**
   * Stops frame rate tracking
   */
  private stopFrameRateTracking(): void {
    // Frame rate tracking uses requestAnimationFrame, which automatically stops
    // when the page is not visible or when the tab is inactive
    this.frameRates = [];
  }

  /**
   * Samples metrics at regular intervals
   */
  private sampleMetrics(): void {
    try {
      // Sample frame rate
      if (
        this.config.metricsTracking.trackFrameRate &&
        this.frameRates.length > 0
      ) {
        const avgFrameRate =
          this.frameRates.reduce((sum, fps) => sum + fps, 0) /
          this.frameRates.length;

        this.recordMetric(
          "browser.frameRate",
          avgFrameRate,
          "fps",
          "browser",
          "rendering",
        );

        // Check for frame rate issues
        if (
          avgFrameRate < this.config.bottleneckDetection.thresholds.frameRate
        ) {
          this.detectBottleneck(
            "browser.frameRate",
            avgFrameRate,
            "browser",
            "rendering",
          );
        }
      }

      // Sample memory usage
      if (
        this.config.metricsTracking.trackMemory &&
        window.performance &&
        window.performance.memory
      ) {
        const memory = window.performance.memory;

        this.recordMetric(
          "browser.memory.used",
          memory.usedJSHeapSize,
          "bytes",
          "browser",
          "memory",
        );

        this.recordMetric(
          "browser.memory.total",
          memory.totalJSHeapSize,
          "bytes",
          "browser",
          "memory",
        );

        // Check for memory issues (if we have at least 2 samples)
        const memoryMetrics = this.metrics.get("browser.memory.used");
        if (memoryMetrics && memoryMetrics.length >= 2) {
          const currentMemory = memoryMetrics[memoryMetrics.length - 1].value;
          const previousMemory = memoryMetrics[memoryMetrics.length - 2].value;
          const memoryGrowth = currentMemory - previousMemory;

          if (
            memoryGrowth >
            this.config.bottleneckDetection.thresholds.memoryGrowth
          ) {
            this.detectBottleneck(
              "browser.memory.growth",
              memoryGrowth,
              "browser",
              "memory",
            );
          }
        }
      }

      // Detect bottlenecks in collected metrics
      if (this.config.bottleneckDetection.enabled) {
        this.detectBottlenecks();
      }
    } catch (error) {
      this.logger.error("Error sampling metrics", error);
    }
  }

  /**
   * Updates the visualization
   */
  private updateVisualization(): void {
    // Skip if visualization is not enabled
    if (!this.config.visualization.enabled) {
      return;
    }

    // Find or create the visualization container
    this.updateVisualizationUI();
  }

  /**
   * Updates the visualization UI
   */
  private updateVisualizationUI(): void {
    try {
      // This would be implemented if the application has a UI for performance visualization
      // For now, we'll just check if an element with ID 'bridge-performance-monitor' exists
      const container = document.getElementById("bridge-performance-monitor");

      if (container) {
        // Update the container with the latest metrics
        this.renderMetricsToContainer(container);
      }
    } catch (error) {
      this.logger.error("Error updating visualization UI", error);
    }
  }

  /**
   * Renders metrics to a container element
   */
  private renderMetricsToContainer(container: HTMLElement): void {
    // This is a placeholder for a real implementation
    // In a real implementation, this would update charts or other visualizations
    const data = {
      timestamp: new Date().toISOString(),
      metrics: Object.fromEntries(
        Array.from(this.metrics.entries()).map(([key, values]) => {
          // Get the most recent value
          const latest = values.length > 0 ? values[values.length - 1] : null;
          return [key, latest];
        }),
      ),
      issues: Array.from(this.currentIssues.values()),
    };

    // Use a custom event to communicate with any visualization components
    const event = new CustomEvent("bridge:metrics-update", {
      detail: data,
    });

    container.dispatchEvent(event);
  }

  /**
   * Records a performance metric
   */
  recordMetric(
    name: string,
    value: number,
    unit: string,
    category: string,
    component: string,
    metadata?: Record<string, any>,
  ): void {
    // Create the metric
    const metric: PerformanceMetric = {
      name,
      category,
      component,
      value,
      unit,
      timestamp: Date.now(),
      metadata,
    };

    // Get or create the metric series
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metricSeries = this.metrics.get(name)!;

    // Add the metric
    metricSeries.push(metric);

    // Limit the number of samples
    while (metricSeries.length > this.config.sampleRetention) {
      metricSeries.shift();
    }

    // Detect bottlenecks for this metric
    if (this.config.bottleneckDetection.enabled) {
      this.detectBottleneck(name, value, category, component);
    }
  }

  /**
   * Creates a performance mark
   */
  mark(name: string, category: string = "default"): void {
    try {
      const fullName = `${this.config.markPrefix}${category}.${name}`;
      performance.mark(fullName);
    } catch (error) {
      this.logger.warn(`Error creating performance mark ${name}`, error);
    }
  }

  /**
   * Measures time between two marks
   */
  measure(
    name: string,
    startMark: string,
    endMark: string,
    category: string = "default",
  ): number {
    try {
      const fullStartName = `${this.config.markPrefix}${category}.${startMark}`;
      const fullEndName = `${this.config.markPrefix}${category}.${endMark}`;
      const fullMeasureName = `${this.config.markPrefix}${category}.${name}`;

      performance.measure(fullMeasureName, fullStartName, fullEndName);

      // Get the measure
      const entries = performance.getEntriesByName(fullMeasureName, "measure");
      if (entries.length > 0) {
        const duration = entries[entries.length - 1].duration;

        // Return the duration
        return duration;
      }
    } catch (error) {
      this.logger.warn(`Error creating performance measure ${name}`, error);
    }

    return 0;
  }

  /**
   * Time a function execution and record it as a metric
   */
  timeFunction<T>(
    name: string,
    fn: () => T,
    category: string = "default",
    component: string = "unknown",
  ): T {
    const start = performance.now();
    try {
      return fn();
    } finally {
      const duration = performance.now() - start;
      this.recordMetric(name, duration, "ms", category, component);
    }
  }

  /**
   * Time an async function execution and record it as a metric
   */
  async timeAsyncFunction<T>(
    name: string,
    fn: () => Promise<T>,
    category: string = "default",
    component: string = "unknown",
  ): Promise<T> {
    const start = performance.now();
    try {
      return await fn();
    } finally {
      const duration = performance.now() - start;
      this.recordMetric(name, duration, "ms", category, component);
    }
  }

  /**
   * Detects bottlenecks in the metrics
   */
  private detectBottlenecks(): void {
    // Check each metric against its threshold
    for (const [name, metricSeries] of this.metrics.entries()) {
      if (metricSeries.length === 0) continue;

      // Get the most recent metric
      const metric = metricSeries[metricSeries.length - 1];

      // Check if this metric has a custom threshold
      let threshold: number | undefined;
      let criticalThreshold: number | undefined;

      if (name in this.config.metricsTracking.customMetrics) {
        const customMetric = this.config.metricsTracking.customMetrics[name];
        threshold = customMetric.threshold;
        criticalThreshold = customMetric.critical;
      } else {
        // Check for standard thresholds
        switch (true) {
          case name === "browser.frameRate":
            threshold = this.config.bottleneckDetection.thresholds.frameRate;
            break;

          case name.includes("event") && name.includes("processing"):
            threshold =
              this.config.bottleneckDetection.thresholds.eventProcessingTime;
            break;

          case name.includes("dom") && name.includes("operation"):
            threshold =
              this.config.bottleneckDetection.thresholds.domOperationTime;
            break;

          case name.includes("batch") && name.includes("size"):
            threshold = this.config.bottleneckDetection.thresholds.batchSize;
            break;

          case name.includes("state") && name.includes("sync"):
            threshold =
              this.config.bottleneckDetection.thresholds.stateSyncTime;
            break;

          case name.includes("network") && name.includes("duration"):
            threshold = this.config.bottleneckDetection.thresholds.networkTime;
            break;

          case name.includes("bridge") && name.includes("operation"):
            threshold =
              this.config.bottleneckDetection.thresholds.bridgeOperationTime;
            break;
        }
      }

      // If we have a threshold, check the metric against it
      if (threshold !== undefined) {
        this.detectBottleneck(
          name,
          metric.value,
          metric.category,
          metric.component,
          threshold,
          criticalThreshold,
        );
      }
    }
  }

  /**
   * Detects a bottleneck for a single metric
   */
  private detectBottleneck(
    name: string,
    value: number,
    category: string,
    component: string,
    threshold?: number,
    criticalThreshold?: number,
  ): void {
    // Skip if bottleneck detection is disabled
    if (!this.config.bottleneckDetection.enabled) {
      return;
    }

    // Determine the appropriate threshold
    const effectiveThreshold = threshold ?? this.getDefaultThreshold(name);
    if (effectiveThreshold === undefined) {
      return;
    }

    // Determine if this is a higher-is-better or lower-is-better metric
    const higherIsBetter = this.isHigherBetterMetric(name);

    // Calculate the effective critical threshold
    const effectiveCritical =
      criticalThreshold ??
      (higherIsBetter ? effectiveThreshold * 0.5 : effectiveThreshold * 2);

    // Check if the metric exceeds the threshold
    let isIssue = false;
    let severity: "low" | "medium" | "high" | "critical" = "low";

    if (higherIsBetter) {
      // For higher-is-better metrics (like FPS), issue if below threshold
      if (value < effectiveThreshold) {
        isIssue = true;
        severity = value < effectiveCritical ? "critical" : "high";
      }
    } else {
      // For lower-is-better metrics (like latency), issue if above threshold
      if (value > effectiveThreshold) {
        isIssue = true;
        severity = value > effectiveCritical ? "critical" : "high";
      }
    }

    // If we have an issue, record it
    if (isIssue) {
      const issueKey = `${category}.${component}.${name}`;

      // Create the bottleneck detection
      const detection: BottleneckDetection = {
        component,
        metric: name,
        severity,
        value,
        threshold: effectiveThreshold,
        timestamp: Date.now(),
        details: this.formatBottleneckDetails(
          name,
          value,
          effectiveThreshold,
          higherIsBetter,
        ),
      };

      // Store in current issues
      this.currentIssues.set(issueKey, detection);

      // Add to history
      this.bottleneckHistory.push(detection);

      // Limit history size
      while (this.bottleneckHistory.length > 100) {
        this.bottleneckHistory.shift();
      }

      // Notify if critical
      if (severity === "critical" || severity === "high") {
        this.throttledNotify(detection);
      }
    } else {
      // If this was previously an issue but is now resolved,
      // remove it from current issues
      const issueKey = `${category}.${component}.${name}`;
      if (this.currentIssues.has(issueKey)) {
        // Get the previous detection
        const previous = this.currentIssues.get(issueKey)!;

        this.currentIssues.delete(issueKey);

        // Notify improvement if configured
        if (this.config.notifications.notifyOnImprovement) {
          this.notifyImprovement(name, value, previous);
        }
      }
    }
  }

  /**
   * Gets the default threshold for a metric
   */
  private getDefaultThreshold(name: string): number | undefined {
    // Check for standard thresholds
    switch (true) {
      case name === "browser.frameRate":
        return this.config.bottleneckDetection.thresholds.frameRate;

      case name.includes("event") && name.includes("processing"):
        return this.config.bottleneckDetection.thresholds.eventProcessingTime;

      case name.includes("dom") && name.includes("operation"):
        return this.config.bottleneckDetection.thresholds.domOperationTime;

      case name.includes("batch") && name.includes("size"):
        return this.config.bottleneckDetection.thresholds.batchSize;

      case name.includes("state") && name.includes("sync"):
        return this.config.bottleneckDetection.thresholds.stateSyncTime;

      case name.includes("memory") && name.includes("growth"):
        return this.config.bottleneckDetection.thresholds.memoryGrowth;

      case name.includes("network") && name.includes("duration"):
        return this.config.bottleneckDetection.thresholds.networkTime;

      case name.includes("bridge") && name.includes("operation"):
        return this.config.bottleneckDetection.thresholds.bridgeOperationTime;

      default:
        return undefined;
    }
  }

  /**
   * Determines if a metric is better when higher
   */
  private isHigherBetterMetric(name: string): boolean {
    // Frame rate is better when higher
    if (name === "browser.frameRate") {
      return true;
    }

    // Token rate is better when higher
    if (name.includes("token") && name.includes("rate")) {
      return true;
    }

    // Throughput is better when higher
    if (name.includes("throughput")) {
      return true;
    }

    // Success rate is better when higher
    if (name.includes("success") && name.includes("rate")) {
      return true;
    }

    // Cache hit rate is better when higher
    if (name.includes("cache") && name.includes("hit")) {
      return true;
    }

    // Most other metrics are better when lower (latency, memory usage, etc.)
    return false;
  }

  /**
   * Formats the details for a bottleneck
   */
  private formatBottleneckDetails(
    name: string,
    value: number,
    threshold: number,
    higherIsBetter: boolean,
  ): string {
    const formattedValue = this.formatValue(value, name);
    const formattedThreshold = this.formatValue(threshold, name);

    if (higherIsBetter) {
      return `${name} is too low: ${formattedValue} (threshold: ${formattedThreshold})`;
    } else {
      return `${name} is too high: ${formattedValue} (threshold: ${formattedThreshold})`;
    }
  }

  /**
   * Formats a value for display
   */
  private formatValue(value: number, metricName: string): string {
    // Check the metric name to determine the unit
    if (metricName.includes("memory") || metricName.includes("size")) {
      // Format as bytes
      return this.formatBytes(value);
    } else if (metricName.includes("frameRate")) {
      // Format as FPS
      return `${value.toFixed(1)} fps`;
    } else if (metricName.includes("duration") || metricName.includes("time")) {
      // Format as milliseconds
      return `${value.toFixed(2)} ms`;
    } else if (
      metricName.includes("rate") &&
      !metricName.includes("frameRate")
    ) {
      // Format as rate per second
      return `${value.toFixed(1)}/s`;
    } else {
      // Generic formatting
      return value.toFixed(2);
    }
  }

  /**
   * Formats bytes in a human-readable format
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  /**
   * Notifies about a performance issue
   */
  private notifyIssue(issue: BottleneckDetection): void {
    if (!this.config.notifications.enabled) {
      return;
    }

    // Log to console if configured
    if (this.config.notifications.logToConsole) {
      if (issue.severity === "critical") {
        console.error(`[Bridge] Critical performance issue: ${issue.details}`);
      } else if (issue.severity === "high") {
        console.warn(`[Bridge] Performance issue: ${issue.details}`);
      } else {
        console.info(`[Bridge] Performance notice: ${issue.details}`);
      }
    }

    // Update bridge status for critical issues
    if (issue.severity === "critical") {
      this.statusManager.updateStatus({
        state: BridgeErrorState.DEGRADED_PERFORMANCE,
        message: `Performance issue detected: ${issue.metric}`,
        affectedComponents: [issue.component],
      });
    }

    // Emit event if configured
    if (this.config.notifications.emitEvents) {
      const event = new CustomEvent("bridge:performance-issue", {
        detail: issue,
      });

      window.dispatchEvent(event);
    }

    // Show visualization UI if configured
    if (
      this.config.visualization.enabled &&
      this.config.visualization.showOnIssues
    ) {
      this.showVisualizationUI();
    }
  }

  /**
   * Notifies about a performance improvement
   */
  private notifyImprovement(
    name: string,
    value: number,
    previous: BottleneckDetection,
  ): void {
    if (
      !this.config.notifications.enabled ||
      !this.config.notifications.notifyOnImprovement
    ) {
      return;
    }

    // Log to console if configured
    if (this.config.notifications.logToConsole) {
      console.info(
        `[Bridge] Performance improved: ${name} is now ${this.formatValue(value, name)}`,
      );
    }

    // Update bridge status if previous was critical
    if (previous.severity === "critical") {
      // Check if we still have any critical issues
      const criticalIssues = Array.from(this.currentIssues.values()).filter(
        (issue) => issue.severity === "critical",
      );

      if (criticalIssues.length === 0) {
        this.statusManager.updateStatus({
          state: BridgeErrorState.HEALTHY,
          message: "Performance issues resolved",
          affectedComponents: [],
        });
      }
    }

    // Emit event if configured
    if (this.config.notifications.emitEvents) {
      const event = new CustomEvent("bridge:performance-improvement", {
        detail: {
          metric: name,
          value,
          previous,
          timestamp: Date.now(),
        },
      });

      window.dispatchEvent(event);
    }
  }

  /**
   * Shows the performance visualization UI
   */
  private showVisualizationUI(): void {
    // This is a placeholder for actual UI code
    // In a real implementation, this would show or create a visualization UI

    // Check if we already have a container
    let container = document.getElementById("bridge-performance-monitor");

    if (!container) {
      // Create a container for the visualization
      container = document.createElement("div");
      container.id = "bridge-performance-monitor";
      container.style.position = "fixed";
      container.style.bottom = "20px";
      container.style.right = "20px";
      container.style.width = "300px";
      container.style.height = "200px";
      container.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
      container.style.color = "white";
      container.style.padding = "10px";
      container.style.borderRadius = "5px";
      container.style.zIndex = "9999";
      container.style.overflow = "auto";
      container.style.fontFamily = "monospace";
      container.style.fontSize = "12px";

      // Add a header
      const header = document.createElement("div");
      header.style.fontWeight = "bold";
      header.style.marginBottom = "10px";
      header.style.display = "flex";
      header.style.justifyContent = "space-between";
      header.textContent = "Bridge Performance Monitor";

      // Add a close button
      const closeButton = document.createElement("button");
      closeButton.textContent = "X";
      closeButton.style.background = "none";
      closeButton.style.border = "none";
      closeButton.style.color = "white";
      closeButton.style.cursor = "pointer";
      closeButton.onclick = () => {
        if (container) {
          document.body.removeChild(container);
        }
      };

      header.appendChild(closeButton);
      container.appendChild(header);

      // Add a content area
      const content = document.createElement("div");
      content.id = "bridge-performance-monitor-content";
      container.appendChild(content);

      // Add to the document
      document.body.appendChild(container);
    }

    // Update the visualization
    this.renderMetricsToContainer(container);
  }

  /**
   * Gets performance metrics
   */
  getMetrics(): Record<string, PerformanceMetric[]> {
    return Object.fromEntries(this.metrics);
  }

  /**
   * Gets current performance issues
   */
  getCurrentIssues(): BottleneckDetection[] {
    return Array.from(this.currentIssues.values());
  }

  /**
   * Gets performance issues history
   */
  getIssueHistory(): BottleneckDetection[] {
    return [...this.bottleneckHistory];
  }

  /**
   * Gets frame rate statistics
   */
  getFrameRateStats(): {
    current: number;
    average: number;
    min: number;
    max: number;
  } {
    if (this.frameRates.length === 0) {
      return { current: 0, average: 0, min: 0, max: 0 };
    }

    const current = this.frameRates[this.frameRates.length - 1];
    const average =
      this.frameRates.reduce((sum, fps) => sum + fps, 0) /
      this.frameRates.length;
    const min = Math.min(...this.frameRates);
    const max = Math.max(...this.frameRates);

    return { current, average, min, max };
  }

  /**
   * Gets memory usage statistics
   */
  getMemoryStats(): {
    used: number;
    total: number;
    limit: number;
    usedFormatted: string;
    totalFormatted: string;
    limitFormatted: string;
  } {
    try {
      if (window.performance && window.performance.memory) {
        const memory = window.performance.memory;

        return {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit,
          usedFormatted: this.formatBytes(memory.usedJSHeapSize),
          totalFormatted: this.formatBytes(memory.totalJSHeapSize),
          limitFormatted: this.formatBytes(memory.jsHeapSizeLimit),
        };
      }
    } catch (error) {
      this.logger.warn("Error getting memory stats", error);
    }

    return {
      used: 0,
      total: 0,
      limit: 0,
      usedFormatted: "0 Bytes",
      totalFormatted: "0 Bytes",
      limitFormatted: "0 Bytes",
    };
  }

  /**
   * Gets an overview of performance metrics
   */
  getPerformanceOverview(): any {
    return {
      metrics: {
        count: this.metrics.size,
        categories: Array.from(this.metrics.values()).reduce(
          (categories, metrics) => {
            for (const metric of metrics) {
              categories.add(metric.category);
            }
            return categories;
          },
          new Set<string>(),
        ),
        latest: Object.fromEntries(
          Array.from(this.metrics.entries()).map(([key, values]) => {
            // Get the most recent value
            const latest = values.length > 0 ? values[values.length - 1] : null;
            return [key, latest];
          }),
        ),
      },
      issues: {
        current: this.currentIssues.size,
        critical: Array.from(this.currentIssues.values()).filter(
          (issue) => issue.severity === "critical",
        ).length,
        high: Array.from(this.currentIssues.values()).filter(
          (issue) => issue.severity === "high",
        ).length,
        history: this.bottleneckHistory.length,
      },
      memory: this.getMemoryStats(),
      frameRate: this.getFrameRateStats(),
      status: {
        monitoring: this.samplingIntervalId !== null,
        visualization: this.visualizationIntervalId !== null,
      },
    };
  }

  /**
   * Gets a summary of performance issues
   */
  getSummary(): string {
    const issues = this.getCurrentIssues();

    if (issues.length === 0) {
      return "Performance monitoring active. No current issues detected.";
    }

    const criticalCount = issues.filter(
      (i) => i.severity === "critical",
    ).length;
    const highCount = issues.filter((i) => i.severity === "high").length;
    const otherCount = issues.length - criticalCount - highCount;

    return (
      `Performance monitoring detected ${issues.length} issues: ` +
      `${criticalCount} critical, ${highCount} high, ${otherCount} other`
    );
  }

  /**
   * Clears all performance data
   */
  clearData(): void {
    this.metrics.clear();
    this.currentIssues.clear();
    this.bottleneckHistory = [];
    this.frameRates = [];

    this.logger.info("Performance data cleared");
  }

  /**
   * Releases all resources
   */
  dispose(): void {
    this.stopMonitoring();
    this.clearData();

    this.logger.info("PerformanceMonitor disposed");
  }
}

// Add memory property to Window interface if it might be available
declare global {
  interface Window {
    performance?: {
      memory?: {
        jsHeapSizeLimit: number;
        totalJSHeapSize: number;
        usedJSHeapSize: number;
      };
    };
  }
}
