/**
 * MemoryManager - Advanced memory leak prevention mechanisms
 *
 * This component provides memory leak detection, prevention, and cleanup
 * for the bridge components.
 */

import { BridgeLogger, BridgeErrorState } from "../types";
import { BridgeStatusManager } from "../statusManager";

/**
 * Memory snapshot information
 */
interface MemorySnapshot {
  timestamp: number;
  jsHeapSize: number;
  totalJSHeapSize: number;
  usedJSHeapSize: number;
  bridgeObjectCount: number;
  eventListenerCount: number;
  cacheSize: number;
  subscriptionCount: number;
}

/**
 * Configuration for MemoryManager
 */
export interface MemoryManagerConfig {
  // Enable periodic memory usage monitoring
  enableMonitoring: boolean;

  // Monitoring interval in ms
  monitoringInterval: number;

  // Maximum number of snapshots to keep
  maxSnapshots: number;

  // Memory leak detection thresholds
  thresholds: {
    // Maximum event listeners per event type
    maxEventListenersPerType: number;

    // Maximum allowed memory growth per interval (bytes)
    maxMemoryGrowthPerInterval: number;

    // Subscription age threshold (ms)
    subscriptionAgeThreshold: number;

    // Context leak detection options
    contextLeakDetection: {
      // Whether to enable prototype pollution detection
      detectPrototypePollution: boolean;

      // Whether to enable closures leak detection
      detectClosureLeaks: boolean;

      // Whether to enable DOM node leaks detection
      detectDOMNodeLeaks: boolean;
    };
  };

  // Automatic remediation options
  autoRemediation: {
    // Whether to enable automatic remediation
    enabled: boolean;

    // Whether to clear event listeners that haven't fired in a while
    clearInactiveEventListeners: boolean;

    // Whether to clear cache entries that haven't been used in a while
    clearUnusedCacheEntries: boolean;

    // Whether to force garbage collection (when available)
    forceGarbageCollection: boolean;
  };

  // Resource limits
  resourceLimits: {
    // Maximum cache size (bytes)
    maxCacheSize: number;

    // Maximum number of event listeners
    maxEventListenerCount: number;

    // Maximum number of subscriptions
    maxSubscriptionCount: number;
  };
}

/**
 * Default configuration for MemoryManager
 */
const DEFAULT_CONFIG: MemoryManagerConfig = {
  enableMonitoring: true,
  monitoringInterval: 60000, // 1 minute
  maxSnapshots: 60, // Keep up to 60 snapshots (1 hour at 1 minute interval)

  thresholds: {
    maxEventListenersPerType: 25,
    maxMemoryGrowthPerInterval: 10 * 1024 * 1024, // 10 MB
    subscriptionAgeThreshold: 10 * 60 * 1000, // 10 minutes
    contextLeakDetection: {
      detectPrototypePollution: true,
      detectClosureLeaks: true,
      detectDOMNodeLeaks: true,
    },
  },

  autoRemediation: {
    enabled: true,
    clearInactiveEventListeners: true,
    clearUnusedCacheEntries: true,
    forceGarbageCollection: false, // Disabled by default as it's not available in all environments
  },

  resourceLimits: {
    maxCacheSize: 50 * 1024 * 1024, // 50 MB
    maxEventListenerCount: 1000,
    maxSubscriptionCount: 500,
  },
};

/**
 * Bridge component reference registry
 */
interface BridgeComponentRegistry {
  [componentId: string]: WeakRef<any>;
}

/**
 * Subscription information
 */
interface SubscriptionInfo {
  id: string;
  eventType: string;
  timestamp: number;
  active: boolean;
  component?: string;
  lastUsed?: number;
}

/**
 * Implementation of the memory manager
 */
export class MemoryManager {
  private logger: BridgeLogger;
  private statusManager: BridgeStatusManager;
  private config: MemoryManagerConfig;

  // Memory snapshots for trend analysis
  private memorySnapshots: MemorySnapshot[] = [];

  // Component registry for tracking references
  private componentRegistry: BridgeComponentRegistry = {};

  // Subscription registry for tracking listeners and subscriptions
  private subscriptionRegistry: Map<string, SubscriptionInfo> = new Map();

  // Monitoring interval ID
  private monitoringIntervalId: number | null = null;

  // Memory metrics
  private initialMemoryUsage: number = 0;
  private peakMemoryUsage: number = 0;
  private lastGrowthRate: number = 0;
  private memoryGrowthAlertCount: number = 0;

  // Detection data
  private detectedLeaks: Array<{
    type: string;
    component: string;
    count: number;
    timestamp: number;
    details: any;
  }> = [];

  constructor(
    logger: BridgeLogger,
    statusManager: BridgeStatusManager,
    config: Partial<MemoryManagerConfig> = {},
  ) {
    this.logger = logger;
    this.statusManager = statusManager;
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize memory metrics
    this.captureInitialMemoryMetrics();

    // Start monitoring if enabled
    if (this.config.enableMonitoring) {
      this.startMonitoring();
    }

    this.logger.info("MemoryManager initialized");
  }

  /**
   * Registers a component for memory tracking
   */
  registerComponent(componentId: string, component: any): void {
    this.componentRegistry[componentId] = new WeakRef(component);
    this.logger.debug(`Component registered: ${componentId}`);
  }

  /**
   * Registers a subscription or event listener
   */
  registerSubscription(
    subscriptionId: string,
    eventType: string,
    componentId?: string,
  ): void {
    this.subscriptionRegistry.set(subscriptionId, {
      id: subscriptionId,
      eventType,
      timestamp: Date.now(),
      active: true,
      component: componentId,
      lastUsed: Date.now(),
    });

    this.logger.debug(
      `Subscription registered: ${subscriptionId} for ${eventType}`,
    );

    // Check for subscription limits
    this.checkSubscriptionLimits();
  }

  /**
   * Updates a subscription's last used timestamp
   */
  updateSubscriptionUsage(subscriptionId: string): void {
    const subscription = this.subscriptionRegistry.get(subscriptionId);
    if (subscription) {
      subscription.lastUsed = Date.now();
    }
  }

  /**
   * Unregisters a subscription
   */
  unregisterSubscription(subscriptionId: string): void {
    if (this.subscriptionRegistry.has(subscriptionId)) {
      this.subscriptionRegistry.delete(subscriptionId);
      this.logger.debug(`Subscription unregistered: ${subscriptionId}`);
    }
  }

  /**
   * Marks a subscription as inactive
   */
  markSubscriptionInactive(subscriptionId: string): void {
    const subscription = this.subscriptionRegistry.get(subscriptionId);
    if (subscription) {
      subscription.active = false;
      this.logger.debug(`Subscription marked inactive: ${subscriptionId}`);
    }
  }

  /**
   * Captures initial memory metrics
   */
  private captureInitialMemoryMetrics(): void {
    try {
      if (window.performance && window.performance.memory) {
        this.initialMemoryUsage = window.performance.memory.usedJSHeapSize;
        this.peakMemoryUsage = this.initialMemoryUsage;

        this.logger.debug("Initial memory metrics captured", {
          initialMemoryUsage: this.formatBytes(this.initialMemoryUsage),
        });
      }
    } catch (error) {
      this.logger.warn("Unable to capture initial memory metrics", error);
    }
  }

  /**
   * Starts periodic memory monitoring
   */
  startMonitoring(): void {
    if (this.monitoringIntervalId !== null) {
      this.stopMonitoring();
    }

    this.monitoringIntervalId = window.setInterval(() => {
      this.checkMemoryUsage();
    }, this.config.monitoringInterval);

    this.logger.info("Memory monitoring started");
  }

  /**
   * Stops periodic memory monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringIntervalId !== null) {
      clearInterval(this.monitoringIntervalId);
      this.monitoringIntervalId = null;
      this.logger.info("Memory monitoring stopped");
    }
  }

  /**
   * Checks current memory usage and detects potential leaks
   */
  checkMemoryUsage(): void {
    try {
      // Create a new memory snapshot
      const snapshot = this.captureMemorySnapshot();
      this.memorySnapshots.push(snapshot);

      // Limit the number of snapshots
      while (this.memorySnapshots.length > this.config.maxSnapshots) {
        this.memorySnapshots.shift();
      }

      // Check for memory growth
      this.analyzeMemoryTrend();

      // Check for subscription and listener issues
      this.checkSubscriptions();

      // Run active leak detection
      this.detectLeaks();

      // Run auto-remediation if enabled
      if (this.config.autoRemediation.enabled) {
        this.runAutoRemediation();
      }
    } catch (error) {
      this.logger.error("Error checking memory usage", error);
    }
  }

  /**
   * Captures the current memory snapshot
   */
  private captureMemorySnapshot(): MemorySnapshot {
    let jsHeapSize = 0;
    let totalJSHeapSize = 0;
    let usedJSHeapSize = 0;

    // Try to get memory info from performance API
    try {
      if (window.performance && window.performance.memory) {
        jsHeapSize = window.performance.memory.jsHeapSizeLimit;
        totalJSHeapSize = window.performance.memory.totalJSHeapSize;
        usedJSHeapSize = window.performance.memory.usedJSHeapSize;

        // Update peak memory usage
        if (usedJSHeapSize > this.peakMemoryUsage) {
          this.peakMemoryUsage = usedJSHeapSize;
        }
      }
    } catch (error) {
      this.logger.warn("Unable to access performance.memory API", error);
    }

    // Create the snapshot
    return {
      timestamp: Date.now(),
      jsHeapSize,
      totalJSHeapSize,
      usedJSHeapSize,
      bridgeObjectCount: Object.keys(this.componentRegistry).length,
      eventListenerCount: this.getActiveSubscriptionCount(),
      cacheSize: 0, // Will be filled by serializer/state manager
      subscriptionCount: this.subscriptionRegistry.size,
    };
  }

  /**
   * Analyzes memory usage trends
   */
  private analyzeMemoryTrend(): void {
    if (this.memorySnapshots.length < 2) return;

    const current = this.memorySnapshots[this.memorySnapshots.length - 1];
    const previous = this.memorySnapshots[this.memorySnapshots.length - 2];

    if (current.usedJSHeapSize > 0 && previous.usedJSHeapSize > 0) {
      // Calculate memory growth rate
      const memoryGrowth = current.usedJSHeapSize - previous.usedJSHeapSize;
      const timeElapsed = current.timestamp - previous.timestamp;
      this.lastGrowthRate = (memoryGrowth / timeElapsed) * 1000; // Growth per second

      // Check for excessive memory growth
      if (memoryGrowth > this.config.thresholds.maxMemoryGrowthPerInterval) {
        this.memoryGrowthAlertCount++;

        this.logger.warn("Significant memory growth detected", {
          growth: this.formatBytes(memoryGrowth),
          rate: this.formatBytes(this.lastGrowthRate) + "/s",
          current: this.formatBytes(current.usedJSHeapSize),
          peak: this.formatBytes(this.peakMemoryUsage),
        });

        // If multiple consecutive alerts, update status
        if (this.memoryGrowthAlertCount > 2) {
          this.statusManager.updateStatus({
            state: BridgeErrorState.DEGRADED_PERFORMANCE,
            message: "Memory usage growing rapidly",
            affectedComponents: ["MemoryManager"],
          });

          // Reset counter to avoid too many alerts
          this.memoryGrowthAlertCount = 0;
        }
      } else {
        this.memoryGrowthAlertCount = 0;
      }
    }
  }

  /**
   * Checks for subscription and event listener issues
   */
  private checkSubscriptions(): void {
    const now = Date.now();

    // Count subscriptions per event type
    const eventTypeCounts: Record<string, number> = {};
    let oldSubscriptionCount = 0;

    for (const [id, subscription] of this.subscriptionRegistry.entries()) {
      // Count by event type
      const eventType = subscription.eventType;
      eventTypeCounts[eventType] = (eventTypeCounts[eventType] || 0) + 1;

      // Check for old subscriptions
      const age = now - subscription.timestamp;
      if (age > this.config.thresholds.subscriptionAgeThreshold) {
        oldSubscriptionCount++;

        // If also inactive, this is a potential leak
        if (
          subscription.active &&
          (!subscription.lastUsed ||
            now - subscription.lastUsed >
              this.config.thresholds.subscriptionAgeThreshold)
        ) {
          this.logger.warn(`Potential subscription leak detected: ${id}`, {
            eventType,
            age: Math.round(age / 1000) + "s",
            component: subscription.component,
          });

          // Add to detected leaks
          this.detectedLeaks.push({
            type: "subscription",
            component: subscription.component || "unknown",
            count: 1,
            timestamp: now,
            details: {
              id,
              eventType,
              age,
              lastUsed: subscription.lastUsed,
            },
          });
        }
      }
    }

    // Check for excessive listeners per event type
    for (const [eventType, count] of Object.entries(eventTypeCounts)) {
      if (count > this.config.thresholds.maxEventListenersPerType) {
        this.logger.warn(
          `Excessive event listeners detected for type: ${eventType}`,
          {
            count,
            threshold: this.config.thresholds.maxEventListenersPerType,
          },
        );

        // Add to detected leaks
        this.detectedLeaks.push({
          type: "excessive_listeners",
          component: eventType,
          count,
          timestamp: now,
          details: {
            eventType,
            count,
            threshold: this.config.thresholds.maxEventListenersPerType,
          },
        });
      }
    }

    // Log overall subscription stats
    if (this.subscriptionRegistry.size > 0) {
      this.logger.debug("Subscription stats", {
        total: this.subscriptionRegistry.size,
        old: oldSubscriptionCount,
        eventTypes: Object.keys(eventTypeCounts).length,
      });
    }
  }

  /**
   * Gets the count of active subscriptions
   */
  private getActiveSubscriptionCount(): number {
    let count = 0;
    for (const subscription of this.subscriptionRegistry.values()) {
      if (subscription.active) {
        count++;
      }
    }
    return count;
  }

  /**
   * Detects potential memory leaks
   */
  private detectLeaks(): void {
    // Clean up old detected leaks (older than 1 hour)
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    this.detectedLeaks = this.detectedLeaks.filter(
      (leak) => now - leak.timestamp < oneHour,
    );

    // Run specific leak detections
    this.detectComponentLeaks();

    if (this.config.thresholds.contextLeakDetection.detectPrototypePollution) {
      this.detectPrototypePollution();
    }

    if (this.config.thresholds.contextLeakDetection.detectDOMNodeLeaks) {
      this.detectDOMNodeLeaks();
    }
  }

  /**
   * Detects component leaks
   */
  private detectComponentLeaks(): void {
    // Check if registered components are still alive
    for (const [id, ref] of Object.entries(this.componentRegistry)) {
      const component = ref.deref();

      if (!component) {
        // Component has been garbage collected, but may still have subscriptions
        const componentSubs = Array.from(
          this.subscriptionRegistry.values(),
        ).filter((sub) => sub.component === id);

        if (componentSubs.length > 0) {
          this.logger.warn(
            `Detected subscriptions for garbage collected component: ${id}`,
            {
              subscriptionCount: componentSubs.length,
            },
          );

          // Add to detected leaks
          this.detectedLeaks.push({
            type: "dangling_subscriptions",
            component: id,
            count: componentSubs.length,
            timestamp: Date.now(),
            details: {
              subscriptions: componentSubs.map((sub) => sub.id),
            },
          });

          // If auto-remediation is enabled, mark these subscriptions as inactive
          if (this.config.autoRemediation.enabled) {
            for (const sub of componentSubs) {
              this.markSubscriptionInactive(sub.id);
            }
          }
        }
      }
    }
  }

  /**
   * Detects prototype pollution
   */
  private detectPrototypePollution(): void {
    try {
      // Check for common prototype pollution issues
      const prototypeProps = ["__proto__", "constructor", "prototype"];
      const baseObjects = [
        Object.prototype,
        Array.prototype,
        Function.prototype,
      ];

      for (const obj of baseObjects) {
        for (const prop in obj) {
          // Skip default properties
          if (prototypeProps.includes(prop)) continue;

          // Check if this is a non-standard property (potential pollution)
          const descriptor = Object.getOwnPropertyDescriptor(obj, prop);
          if (descriptor && descriptor.configurable) {
            this.logger.warn(
              `Potential prototype pollution detected: ${prop} on ${obj.constructor.name}`,
              {
                property: prop,
                target: obj.constructor.name,
              },
            );

            // Add to detected leaks
            this.detectedLeaks.push({
              type: "prototype_pollution",
              component: obj.constructor.name,
              count: 1,
              timestamp: Date.now(),
              details: {
                property: prop,
                target: obj.constructor.name,
              },
            });

            // Auto-remediate if enabled
            if (this.config.autoRemediation.enabled) {
              delete obj[prop];
            }
          }
        }
      }
    } catch (error) {
      this.logger.error("Error detecting prototype pollution", error);
    }
  }

  /**
   * Detects DOM node leaks
   */
  private detectDOMNodeLeaks(): void {
    try {
      // Check for detached DOM nodes that might be held in memory
      if (document && document.createTreeWalker) {
        const root = document.body;
        const detachedNodeCount = 0;

        // Skip detection for now as it requires more complex DOM traversal
        // This would require a specialized algorithm to find detached nodes
        // that are still referenced, which is beyond our simple checks
      }
    } catch (error) {
      this.logger.error("Error detecting DOM node leaks", error);
    }
  }

  /**
   * Runs automatic remediation actions
   */
  private runAutoRemediation(): void {
    if (!this.config.autoRemediation.enabled) {
      return;
    }

    try {
      // Clear inactive event listeners
      if (this.config.autoRemediation.clearInactiveEventListeners) {
        this.clearInactiveSubscriptions();
      }

      // Force garbage collection if available
      if (this.config.autoRemediation.forceGarbageCollection) {
        this.forceGarbageCollection();
      }
    } catch (error) {
      this.logger.error("Error during auto-remediation", error);
    }
  }

  /**
   * Clears inactive subscriptions
   */
  private clearInactiveSubscriptions(): void {
    const now = Date.now();
    const inactiveThreshold = 5 * 60 * 1000; // 5 minutes
    let cleared = 0;

    for (const [id, subscription] of this.subscriptionRegistry.entries()) {
      // Check if subscription is old and inactive
      if (
        !subscription.active ||
        (subscription.lastUsed &&
          now - subscription.lastUsed > inactiveThreshold)
      ) {
        this.subscriptionRegistry.delete(id);
        cleared++;
      }
    }

    if (cleared > 0) {
      this.logger.info(`Cleared ${cleared} inactive subscriptions`);
    }
  }

  /**
   * Forces garbage collection if available
   */
  private forceGarbageCollection(): void {
    try {
      // Try to force garbage collection if available
      if (window.gc) {
        window.gc();
        this.logger.debug("Forced garbage collection");
      }
    } catch (error) {
      // Suppress errors - gc may not be available
    }
  }

  /**
   * Checks if subscription limits have been exceeded
   */
  private checkSubscriptionLimits(): void {
    if (
      this.subscriptionRegistry.size >
      this.config.resourceLimits.maxSubscriptionCount
    ) {
      this.logger.warn("Subscription limit exceeded", {
        current: this.subscriptionRegistry.size,
        limit: this.config.resourceLimits.maxSubscriptionCount,
      });

      this.statusManager.updateStatus({
        state: BridgeErrorState.DEGRADED_PERFORMANCE,
        message: "Too many event subscriptions",
        affectedComponents: ["MemoryManager"],
      });
    }
  }

  /**
   * Formats bytes into human-readable format
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  /**
   * Gets memory usage statistics
   */
  getMemoryStats(): any {
    try {
      const currentMemory = window.performance?.memory?.usedJSHeapSize || 0;
      const memoryGrowth = currentMemory - this.initialMemoryUsage;

      return {
        current: {
          bytes: currentMemory,
          formatted: this.formatBytes(currentMemory),
        },
        initial: {
          bytes: this.initialMemoryUsage,
          formatted: this.formatBytes(this.initialMemoryUsage),
        },
        peak: {
          bytes: this.peakMemoryUsage,
          formatted: this.formatBytes(this.peakMemoryUsage),
        },
        growth: {
          bytes: memoryGrowth,
          formatted: this.formatBytes(memoryGrowth),
          percentage:
            this.initialMemoryUsage > 0
              ? ((memoryGrowth / this.initialMemoryUsage) * 100).toFixed(2) +
                "%"
              : "N/A",
        },
        growthRate: {
          bytesPerSecond: this.lastGrowthRate,
          formatted: this.formatBytes(this.lastGrowthRate) + "/s",
        },
        subscriptions: {
          total: this.subscriptionRegistry.size,
          active: this.getActiveSubscriptionCount(),
        },
        components: Object.keys(this.componentRegistry).length,
        detectedLeaks: this.detectedLeaks.length,
      };
    } catch (error) {
      this.logger.error("Error getting memory stats", error);
      return { error: "Failed to get memory statistics" };
    }
  }

  /**
   * Gets a list of detected memory leaks
   */
  getDetectedLeaks(): any[] {
    return [...this.detectedLeaks];
  }

  /**
   * Gets memory snapshots for trend analysis
   */
  getMemorySnapshots(): MemorySnapshot[] {
    return [...this.memorySnapshots];
  }

  /**
   * Manually runs a full memory check
   */
  runFullCheck(): any {
    // Perform all checks
    this.checkMemoryUsage();

    // Return the results
    return {
      memoryStats: this.getMemoryStats(),
      detectedLeaks: this.getDetectedLeaks(),
      snapshots: this.memorySnapshots.length,
      subscriptions: Array.from(this.subscriptionRegistry.entries()).map(
        ([id, sub]) => ({
          id,
          eventType: sub.eventType,
          age: (Date.now() - sub.timestamp) / 1000,
          active: sub.active,
          component: sub.component,
        }),
      ),
    };
  }

  /**
   * Clears all memory tracking data
   */
  clear(): void {
    // Stop monitoring
    this.stopMonitoring();

    // Clear all data
    this.memorySnapshots = [];
    this.subscriptionRegistry.clear();
    this.detectedLeaks = [];

    // Reset metrics
    this.captureInitialMemoryMetrics();
    this.peakMemoryUsage = this.initialMemoryUsage;
    this.lastGrowthRate = 0;
    this.memoryGrowthAlertCount = 0;

    // Restart monitoring if enabled
    if (this.config.enableMonitoring) {
      this.startMonitoring();
    }

    this.logger.info("Memory manager cleared");
  }
}

// Add gc property to Window interface if it might be available
declare global {
  interface Window {
    gc?: () => void;
    performance?: {
      memory?: {
        jsHeapSizeLimit: number;
        totalJSHeapSize: number;
        usedJSHeapSize: number;
      };
    };
  }
}
