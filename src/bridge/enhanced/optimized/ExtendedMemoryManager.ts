import { MemoryManager } from "./MemoryManager";
import { createLogger } from "../logger/index";

interface MemoryStats {
  totalComponents: number;
  totalListeners: number;
  heapUsed?: number;
  heapTotal?: number;
  external?: number;
  current?: number;
  peak?: number;
  growth?: number;
  growthRate?: number;
  subscriptions?: any;
}

interface LeakInfo {
  component: string;
  listenersCount: number;
  lastUpdate: number;
  type?: string;
  count?: number;
  timestamp?: number;
}

/**
 * Extended MemoryManager with additional methods for diagnostics
 */
export class ExtendedMemoryManager extends MemoryManager {
  private extendedLogger = createLogger("ExtendedMemoryManager");
  private componentRegistry = new Map<
    string,
    { component: object; listenersCount: number; lastUpdate: number }
  >();
  private cleanupCallbacks = new Set<() => void>();
  private detectedLeaks: LeakInfo[] = [];

  /**
   * Register a component for tracking
   */
  public registerComponent(componentId: string, component: object): void {
    this.componentRegistry.set(componentId, {
      component,
      listenersCount: 0,
      lastUpdate: Date.now(),
    });
  }

  /**
   * Get memory statistics
   */
  public getMemoryStats(): MemoryStats {
    let totalListeners = 0;
    let peakListeners = 0;

    this.componentRegistry.forEach((info) => {
      totalListeners += info.listenersCount;
      if (info.listenersCount > peakListeners) {
        peakListeners = info.listenersCount;
      }
    });

    const stats: MemoryStats = {
      totalComponents: this.componentRegistry.size,
      totalListeners,
      current: totalListeners,
      peak: peakListeners,
      growth: 0, // Will be calculated based on history
      growthRate: 0,
      subscriptions: {
        active: totalListeners,
        total: totalListeners,
      },
    };

    // Add Node.js memory stats if available
    if (typeof process !== "undefined" && process.memoryUsage) {
      const usage = process.memoryUsage();
      stats.heapUsed = usage.heapUsed;
      stats.heapTotal = usage.heapTotal;
      stats.external = usage.external;
      stats.current = usage.heapUsed;
    }

    return stats;
  }

  /**
   * Get detected memory leaks
   */
  public getDetectedLeaks(): LeakInfo[] {
    return [...this.detectedLeaks];
  }

  /**
   * Run a full memory check
   */
  public runFullCheck(): {
    leaks: LeakInfo[];
    stats: MemoryStats;
    detectedLeaks?: LeakInfo[];
  } {
    this.detectedLeaks = [];

    // Check for components with too many listeners
    this.componentRegistry.forEach((info, componentId: any) => {
      if (info.listenersCount > 100) {
        this.detectedLeaks.push({
          component: componentId,
          listenersCount: info.listenersCount,
          lastUpdate: info.lastUpdate,
          type: "excessive_listeners",
          count: info.listenersCount,
          timestamp: Date.now(),
        });
      }
    });

    // Check for stale components (not updated in 5 minutes)
    const staleThreshold = Date.now() - 5 * 60 * 1000;
    this.componentRegistry.forEach((info, componentId: any) => {
      if (info.lastUpdate < staleThreshold && info.listenersCount > 0) {
        this.detectedLeaks.push({
          component: componentId,
          listenersCount: info.listenersCount,
          lastUpdate: info.lastUpdate,
          type: "stale_component",
          count: info.listenersCount,
          timestamp: Date.now(),
        });
      }
    });

    return {
      leaks: this.getDetectedLeaks(),
      stats: this.getMemoryStats(),
      detectedLeaks: this.getDetectedLeaks(),
    };
  }

  /**
   * Clear all tracked data
   */
  public clear(): void {
    // Run all cleanup callbacks
    this.cleanupCallbacks.forEach((callback) => {
      try {
        callback();
      } catch (error) {
        this.extendedLogger.error("Error during cleanup:", error);
      }
    });

    // Clear all registries
    this.componentRegistry.clear();
    this.cleanupCallbacks.clear();
    this.detectedLeaks = [];
  }

  /**
   * Register a cleanup callback
   */
  public registerCleanupCallback(callback: () => void): void {
    this.cleanupCallbacks.add(callback);
  }
}
