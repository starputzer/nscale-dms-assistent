/**
 * OptimizedEventBus - Enhanced event batching and performance
 *
 * This component provides advanced event batching, event categorization,
 * and performance optimization for the bridge event system.
 */

import {
  EventBus,
  EventOptions,
  EventSubscription,
  BridgeLogger,
  BridgeErrorState,
} from "../types";
import { BridgeStatusManager } from "../statusManager";
import { debounce, throttle } from "./utils";

/**
 * Configuration for OptimizedEventBus
 */
export interface OptimizedEventBusConfig {
  // Default batch size
  defaultBatchSize: number;

  // Default batch delay in ms
  defaultBatchDelay: number;

  // Maximum batch size (to prevent memory issues)
  maxBatchSize: number;

  // Event priority levels
  priorityLevels: {
    [priority: string]: number;
  };

  // Event-specific configurations
  eventConfigs: {
    [eventPattern: string]: {
      // Whether to batch this event
      batchEnabled: boolean;

      // Batch size for this event
      batchSize?: number;

      // Batch delay for this event
      batchDelay?: number;

      // Whether to throttle this event
      throttle?: boolean;

      // Throttle interval in ms
      throttleInterval?: number;

      // Priority level name
      priority?: string;

      // Event category for grouping in diagnostics
      category?: string;
    };
  };

  // Memory safety features
  memorySafety: {
    // Maximum listeners per event
    maxListenersPerEvent: number;

    // Whether to warn about listener leaks
    warnOnListenerLeak: boolean;

    // Whether to auto-cleanup orphaned listeners
    // (listeners not properly unsubscribed)
    autoCleanupOrphanedListeners: boolean;

    // Interval in ms for orphaned listener cleanup
    cleanupInterval: number;
  };
}

/**
 * Default configuration for OptimizedEventBus
 */
const DEFAULT_CONFIG: OptimizedEventBusConfig = {
  defaultBatchSize: 10,
  defaultBatchDelay: 50,
  maxBatchSize: 1000,

  priorityLevels: {
    critical: 100,
    high: 75,
    normal: 50,
    low: 25,
    background: 0,
  },

  eventConfigs: {
    // Message events - high frequency, should be batched
    "chat:message:*": {
      batchEnabled: true,
      batchSize: 20,
      batchDelay: 100,
      priority: "normal",
      category: "messaging",
    },

    // Streaming events - high frequency, should be batched with low delay
    "stream:*": {
      batchEnabled: true,
      batchSize: 30,
      batchDelay: 33, // ~30fps
      priority: "high",
      category: "streaming",
    },

    // UI events - potential high frequency, throttle to prevent excess
    "ui:*": {
      batchEnabled: true,
      batchSize: 5,
      batchDelay: 50,
      throttle: true,
      throttleInterval: 100,
      priority: "normal",
      category: "ui",
    },

    // State updates - medium frequency, batch with moderate delay
    "state:*": {
      batchEnabled: true,
      batchSize: 10,
      batchDelay: 50,
      priority: "normal",
      category: "state",
    },

    // Authentication events - low frequency, critical priority
    "auth:*": {
      batchEnabled: false,
      priority: "critical",
      category: "auth",
    },

    // Session events - low frequency, high priority
    "session:*": {
      batchEnabled: false,
      priority: "high",
      category: "session",
    },

    // Log events - medium frequency, low priority
    "log:*": {
      batchEnabled: true,
      batchSize: 50,
      batchDelay: 500,
      priority: "low",
      category: "logging",
    },

    // Background tasks - low priority
    "background:*": {
      batchEnabled: true,
      batchSize: 100,
      batchDelay: 1000,
      priority: "background",
      category: "background",
    },
  },

  memorySafety: {
    maxListenersPerEvent: 25,
    warnOnListenerLeak: true,
    autoCleanupOrphanedListeners: true,
    cleanupInterval: 60000, // 1 minute
  },
};

/**
 * Event queue entry
 */
interface EventQueueEntry {
  eventName: string;
  data: any;
  timestamp: number;
}

/**
 * Event listener entry
 */
interface EventListenerEntry {
  callback: Function;
  options: EventOptions;
  id: string;
  timeRegistered: number;
  lastCalled: number | null;
  callCount: number;
  active: boolean;
}

/**
 * Implementation of the optimized event bus
 */
export class OptimizedEventBus implements EventBus {
  private listeners: Map<string, Array<EventListenerEntry>> = new Map();
  private batchQueues: Map<
    string,
    {
      queue: EventQueueEntry[];
      timer: number | null;
      config: {
        batchSize: number;
        batchDelay: number;
      };
    }
  > = new Map();

  private logger: BridgeLogger;
  private statusManager: BridgeStatusManager;
  private config: OptimizedEventBusConfig;

  // Throttled emitters cache
  private throttledEmitters: Map<
    string,
    {
      fn: (...args: any[]) => void;
      lastArgs: any[] | null;
    }
  > = new Map();

  // Event stats
  private eventStats: {
    emitCount: Map<string, number>;
    batchCount: Map<string, number>;
    listenerCallCount: Map<string, number>;
    lastEmitTime: Map<string, number>;
    processingTime: Map<string, number[]>;
  } = {
    emitCount: new Map(),
    batchCount: new Map(),
    listenerCallCount: new Map(),
    lastEmitTime: new Map(),
    processingTime: new Map(),
  };

  // Cleanup timer
  private cleanupTimerId: number | null = null;

  constructor(
    logger: BridgeLogger,
    statusManager: BridgeStatusManager,
    config: Partial<OptimizedEventBusConfig> = {},
  ) {
    this.logger = logger;
    this.statusManager = statusManager;
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize event stats for configured events
    for (const eventPattern in this.config.eventConfigs) {
      this.eventStats.emitCount.set(eventPattern, 0);
      this.eventStats.batchCount.set(eventPattern, 0);
      this.eventStats.listenerCallCount.set(eventPattern, 0);
      this.eventStats.processingTime.set(eventPattern, []);
    }

    // Set up orphaned listener cleanup if enabled
    if (this.config.memorySafety.autoCleanupOrphanedListeners) {
      this.setupListenerCleanup();
    }

    this.logger.info("OptimizedEventBus initialized");
  }

  /**
   * Emits an event
   */
  emit(eventName: string, data?: any): void {
    const startTime = performance.now();

    // Update event stats
    this.incrementEventStat("emitCount", eventName);
    this.eventStats.lastEmitTime.set(eventName, Date.now());

    // Get event configuration
    const eventConfig = this.getEventConfig(eventName);

    // Check if event should be throttled
    if (eventConfig.throttle) {
      this.handleThrottledEmit(eventName, data, eventConfig);
      return;
    }

    // Check if event should be batched
    if (eventConfig.batchEnabled) {
      this.addToBatch(eventName, data);
    } else {
      // Immediate dispatch
      this.dispatchEvent(eventName, data);
    }

    // Record processing time
    const endTime = performance.now();
    this.recordProcessingTime(eventName, endTime - startTime);
  }

  /**
   * Handles throttled event emission
   */
  private handleThrottledEmit(
    eventName: string,
    data: any,
    eventConfig: any,
  ): void {
    if (!this.throttledEmitters.has(eventName)) {
      // Create a new throttled emitter for this event
      const throttledEmit = throttle((name: string, eventData: any) => {
        this.addToBatch(name, eventData);
      }, eventConfig.throttleInterval || 100);

      this.throttledEmitters.set(eventName, {
        fn: throttledEmit,
        lastArgs: null,
      });
    }

    const throttled = this.throttledEmitters.get(eventName)!;
    throttled.lastArgs = [eventName, data];
    throttled.fn(eventName, data);
  }

  /**
   * Adds an event to a batch queue
   */
  private addToBatch(eventName: string, data: any): void {
    // Get event configuration
    const eventConfig = this.getEventConfig(eventName);
    const batchSize = eventConfig.batchSize || this.config.defaultBatchSize;
    const batchDelay = eventConfig.batchDelay || this.config.defaultBatchDelay;

    // Create batch queue if it doesn't exist
    if (!this.batchQueues.has(eventName)) {
      this.batchQueues.set(eventName, {
        queue: [],
        timer: null,
        config: {
          batchSize: Math.min(batchSize, this.config.maxBatchSize),
          batchDelay,
        },
      });
    }

    const batch = this.batchQueues.get(eventName)!;

    // Add to queue
    batch.queue.push({
      eventName,
      data,
      timestamp: Date.now(),
    });

    // Process immediately if batch size reached
    if (batch.queue.length >= batch.config.batchSize) {
      this.processBatch(eventName);
    }
    // Otherwise set timer if not already set
    else if (batch.timer === null) {
      batch.timer = window.setTimeout(() => {
        this.processBatch(eventName);
      }, batch.config.batchDelay);
    }
  }

  /**
   * Processes a batch of events
   */
  private processBatch(eventName: string): void {
    const batch = this.batchQueues.get(eventName);
    if (!batch || batch.queue.length === 0) return;

    // Clear timer
    if (batch.timer !== null) {
      clearTimeout(batch.timer);
      batch.timer = null;
    }

    // Get all events in batch
    const events = [...batch.queue];
    batch.queue = [];

    // Update batch stats
    this.incrementEventStat("batchCount", eventName);

    // Process all events in batch
    if (events.length === 1) {
      // For single event, just dispatch normally
      this.dispatchEvent(eventName, events[0].data);
    } else {
      // For multiple events, send as batch
      this.dispatchEvent(
        eventName,
        events.map((e) => e.data),
      );
    }
  }

  /**
   * Dispatches an event to all listeners
   */
  private dispatchEvent(eventName: string, data: any): void {
    const startTime = performance.now();

    try {
      // Find all matching listeners
      const directListeners = this.listeners.get(eventName) || [];

      // Find wildcard listeners that match this event
      const wildcardListeners: EventListenerEntry[] = [];

      // Use Array.from to avoid compatibility issues with Map iterators
      Array.from(this.listeners.entries()).forEach(([pattern, listeners]) => {
        if (pattern !== eventName && this.matchesWildcard(eventName, pattern)) {
          wildcardListeners.push(...listeners);
        }
      });

      // Combine and sort by priority
      const allListeners = [...directListeners, ...wildcardListeners]
        .filter((listener) => listener.active)
        .sort((a, b) => (b.options.priority || 0) - (a.options.priority || 0));

      // Update event stats
      this.eventStats.listenerCallCount.set(
        eventName,
        (this.eventStats.listenerCallCount.get(eventName) || 0) +
          allListeners.length,
      );

      // Call all listeners
      for (const listener of allListeners) {
        try {
          // Mark as called
          listener.lastCalled = Date.now();
          listener.callCount++;

          // Handle once option
          if (listener.options.once) {
            listener.active = false;
          }

          // Execute with timeout if specified
          if (listener.options.timeout) {
            this.executeWithTimeout(
              listener.callback,
              data,
              listener.options.timeout,
            );
          } else {
            listener.callback(data);
          }
        } catch (error) {
          this.logger.error(`Error in event listener for ${eventName}:`, error);
        }
      }

      // Clean up inactive listeners
      this.removeInactiveListeners(eventName);
    } catch (error) {
      this.logger.error(`Error dispatching event ${eventName}:`, error);
      this.statusManager.updateStatus({
        state: BridgeErrorState.COMMUNICATION_ERROR,
        message: `Error dispatching event ${eventName}`,
        affectedComponents: ["OptimizedEventBus"],
      });
    }

    // Record processing time
    const endTime = performance.now();
    this.recordProcessingTime(eventName, endTime - startTime);
  }

  /**
   * Executes a callback with a timeout
   */
  private executeWithTimeout(
    callback: Function,
    data: any,
    timeout: number,
  ): void {
    let hasTimedOut = false;

    // Set timeout timer
    const timeoutId = setTimeout(() => {
      hasTimedOut = true;
      this.logger.warn(`Event listener execution timed out after ${timeout}ms`);
    }, timeout);

    try {
      // Execute callback
      callback(data);
    } finally {
      // Clear timeout if not already triggered
      if (!hasTimedOut) {
        clearTimeout(timeoutId);
      }
    }
  }

  /**
   * Registers an event listener
   */
  on(
    eventName: string,
    callback: Function,
    options: EventOptions = {},
  ): EventSubscription {
    // Initialize listener list if it doesn't exist
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }

    const listeners = this.listeners.get(eventName)!;

    // Check for listener limit
    if (
      listeners.length >= this.config.memorySafety.maxListenersPerEvent &&
      this.config.memorySafety.warnOnListenerLeak
    ) {
      this.logger.warn(
        `Possible event listener leak detected: ${listeners.length} listeners for event ${eventName}`,
      );
    }

    // Generate unique ID
    const id = this.generateId();

    // Add new listener
    const listenerEntry: EventListenerEntry = {
      callback,
      options,
      id,
      timeRegistered: Date.now(),
      lastCalled: null,
      callCount: 0,
      active: true,
    };

    listeners.push(listenerEntry);

    this.logger.debug(`Registered listener for event: ${eventName}`, { id });

    // Return unsubscribe function
    return {
      unsubscribe: () => this.off(eventName, id),
      id, // Add ID for direct reference
    } as EventSubscription & { id: string };
  }

  /**
   * Removes an event listener
   */
  off(eventName: string, subscriptionOrId: EventSubscription | string): void {
    if (!this.listeners.has(eventName)) return;

    const id =
      typeof subscriptionOrId === "string"
        ? subscriptionOrId
        : (subscriptionOrId as any).id;

    const listeners = this.listeners.get(eventName)!;
    const index = listeners.findIndex((listener) => listener.id === id);

    if (index !== -1) {
      // Mark as inactive
      listeners[index].active = false;

      // Remove immediately if never used
      if (listeners[index].callCount === 0) {
        listeners.splice(index, 1);
      }

      this.logger.debug(`Removed listener for event: ${eventName}`, { id });

      // Clean up empty event list
      if (listeners.length === 0) {
        this.listeners.delete(eventName);
      }
    }
  }

  /**
   * Clean up inactive listeners
   */
  private removeInactiveListeners(eventName: string): void {
    if (!this.listeners.has(eventName)) return;

    const listeners = this.listeners.get(eventName)!;
    const activeListeners = listeners.filter((listener) => listener.active);

    if (activeListeners.length !== listeners.length) {
      this.listeners.set(eventName, activeListeners);

      // Clean up empty event list
      if (activeListeners.length === 0) {
        this.listeners.delete(eventName);
      }
    }
  }

  /**
   * Registers a one-time event listener
   */
  once(
    eventName: string,
    callback: Function,
    options: Omit<EventOptions, "once"> = {},
  ): EventSubscription {
    return this.on(eventName, callback, { ...options, once: true });
  }

  /**
   * Registers an event listener with a priority
   */
  priority(
    eventName: string,
    priority: number,
    callback: Function,
    options: Omit<EventOptions, "priority"> = {},
  ): EventSubscription {
    return this.on(eventName, callback, { ...options, priority });
  }

  /**
   * Registers an event listener with a specific category priority
   */
  priorityLevel(
    eventName: string,
    priorityLevel: keyof typeof DEFAULT_CONFIG.priorityLevels,
    callback: Function,
    options: Omit<EventOptions, "priority"> = {},
  ): EventSubscription {
    const priority =
      this.config.priorityLevels[priorityLevel] ||
      DEFAULT_CONFIG.priorityLevels.normal;

    return this.on(eventName, callback, { ...options, priority });
  }

  /**
   * Clears all event listeners
   */
  clear(): void {
    // Clear all listeners
    this.listeners.clear();

    // Clear all batch queues
    this.batchQueues.forEach((batch, eventName) => {
      if (batch.timer !== null) {
        clearTimeout(batch.timer);
      }
    });
    this.batchQueues.clear();

    // Clear throttled emitters
    this.throttledEmitters.forEach((throttled) => {
      if (typeof (throttled.fn as any).cancel === "function") {
        (throttled.fn as any).cancel();
      }
    });
    this.throttledEmitters.clear();

    // Stop cleanup timer
    if (this.cleanupTimerId !== null) {
      clearInterval(this.cleanupTimerId);
      this.cleanupTimerId = null;

      // Restart if configured
      if (this.config.memorySafety.autoCleanupOrphanedListeners) {
        this.setupListenerCleanup();
      }
    }

    this.logger.info("EventBus cleared");
  }

  /**
   * Checks if event bus is operational
   */
  isOperational(): boolean {
    return true;
  }

  /**
   * Resets the event bus
   */
  reset(): void {
    this.clear();

    // Reset event stats
    this.eventStats.emitCount.clear();
    this.eventStats.batchCount.clear();
    this.eventStats.listenerCallCount.clear();
    this.eventStats.lastEmitTime.clear();
    this.eventStats.processingTime.clear();

    // Reinitialize event stats for configured events
    for (const eventPattern in this.config.eventConfigs) {
      this.eventStats.emitCount.set(eventPattern, 0);
      this.eventStats.batchCount.set(eventPattern, 0);
      this.eventStats.listenerCallCount.set(eventPattern, 0);
      this.eventStats.processingTime.set(eventPattern, []);
    }

    this.logger.info("EventBus reset");
  }

  /**
   * Gets diagnostic information
   */
  getDiagnostics(): any {
    // Calculate event statistics
    const eventStatistics: Record<string, any> = {};

    // Get unique event patterns
    const emitCountKeys = Array.from(this.eventStats.emitCount.keys());
    const listenerKeys = Array.from(this.listeners.keys());
    const patterns = new Set([...emitCountKeys, ...listenerKeys]);

    // Create stats for each pattern
    // Use Array.from to avoid compatibility issues with Set iterators
    Array.from(patterns).forEach(pattern => {
      const emitCount = this.eventStats.emitCount.get(pattern) || 0;
      const batchCount = this.eventStats.batchCount.get(pattern) || 0;
      const listenerCallCount =
        this.eventStats.listenerCallCount.get(pattern) || 0;
      const lastEmitTime = this.eventStats.lastEmitTime.get(pattern) || 0;
      const processingTimes = this.eventStats.processingTime.get(pattern) || [];

      const avgProcessingTime =
        processingTimes.length > 0
          ? processingTimes.reduce((sum, time) => sum + time, 0) /
            processingTimes.length
          : 0;

      // Get listeners for this pattern
      const listeners = this.listeners.get(pattern) || [];

      // Calculate category based on pattern
      const category = this.getCategoryForEvent(pattern);

      eventStatistics[pattern] = {
        emitCount,
        batchCount,
        listenerCallCount,
        lastEmitTime: lastEmitTime
          ? new Date(lastEmitTime).toISOString()
          : null,
        avgProcessingTime,
        listenerCount: listeners.length,
        activeListenerCount: listeners.filter((l) => l.active).length,
        category,
      };
    });

    return {
      // Overall stats
      listenerCount: Array.from(this.listeners.entries()).reduce(
        (sum, [_, listeners]) => sum + listeners.length,
        0,
      ),
      activeListenerCount: Array.from(this.listeners.entries()).reduce(
        (sum, [_, listeners]) => sum + listeners.filter((l) => l.active).length,
        0,
      ),
      eventPatternCount: this.listeners.size,
      batchQueueCount: this.batchQueues.size,
      batchQueueSizes: Array.from(this.batchQueues.entries()).map(
        ([name, batch]) => ({ name, size: batch.queue.length }),
      ),

      // Event-specific stats
      events: eventStatistics,

      // Config
      config: this.config,
    };
  }

  /**
   * Sets up automatic listener cleanup
   */
  private setupListenerCleanup(): void {
    if (this.cleanupTimerId !== null) {
      clearInterval(this.cleanupTimerId);
    }

    this.cleanupTimerId = window.setInterval(() => {
      this.cleanupOrphanedListeners();
    }, this.config.memorySafety.cleanupInterval);
  }

  /**
   * Cleans up orphaned listeners
   */
  private cleanupOrphanedListeners(): void {
    const now = Date.now();
    const orphanedTimeout = 600000; // 10 minutes
    let totalCleaned = 0;

    // Use Array.from to avoid compatibility issues with Map iterators
    Array.from(this.listeners.entries()).forEach(([eventName, listeners]) => {
      // Find inactive listeners and old listeners that were never called
      const toKeep = listeners.filter((listener) => {
        // Keep active listeners
        if (listener.active) return true;

        // Keep recently registered listeners
        const age = now - listener.timeRegistered;
        if (age < orphanedTimeout) return true;

        // Remove old inactive listeners or never called listeners
        return false;
      });

      const cleaned = listeners.length - toKeep.length;
      totalCleaned += cleaned;

      if (cleaned > 0) {
        this.listeners.set(eventName, toKeep);

        if (toKeep.length === 0) {
          this.listeners.delete(eventName);
        }

        this.logger.debug(
          `Cleaned up ${cleaned} orphaned listeners for ${eventName}`,
        );
      }
    });

    if (totalCleaned > 0) {
      this.logger.info(`Cleaned up ${totalCleaned} total orphaned listeners`);
    }
  }

  /**
   * Generates a unique ID
   */
  private generateId(): string {
    return Math.random().toString(36).substring(2, 11);
  }

  /**
   * Gets the configuration for an event
   */
  private getEventConfig(eventName: string): any {
    // Check for exact match
    if (this.config.eventConfigs[eventName]) {
      return this.config.eventConfigs[eventName];
    }

    // Check for wildcard matches
    for (const pattern in this.config.eventConfigs) {
      if (this.matchesWildcard(eventName, pattern)) {
        return this.config.eventConfigs[pattern];
      }
    }

    // Default configuration
    return {
      batchEnabled: false,
      batchSize: this.config.defaultBatchSize,
      batchDelay: this.config.defaultBatchDelay,
      priority: "normal",
      category: "uncategorized",
    };
  }

  /**
   * Checks if an event name matches a wildcard pattern
   */
  private matchesWildcard(eventName: string, pattern: string): boolean {
    if (!pattern.includes("*")) return eventName === pattern;

    const regex = new RegExp(
      "^" + pattern.replace(/\./g, "\\.").replace(/\*/g, ".*") + "$",
    );

    return regex.test(eventName);
  }

  /**
   * Gets the category for an event
   */
  private getCategoryForEvent(eventName: string): string {
    const config = this.getEventConfig(eventName);
    return config.category || "uncategorized";
  }

  /**
   * Records processing time for an event
   */
  private recordProcessingTime(eventName: string, time: number): void {
    // Find matching patterns
    for (const pattern in this.config.eventConfigs) {
      if (this.matchesWildcard(eventName, pattern)) {
        const times = this.eventStats.processingTime.get(pattern) || [];

        // Keep only the last 100 times
        if (times.length >= 100) {
          times.shift();
        }

        times.push(time);
        this.eventStats.processingTime.set(pattern, times);
        return;
      }
    }

    // If no matching pattern, record under the event name itself
    const times = this.eventStats.processingTime.get(eventName) || [];

    // Keep only the last 100 times
    if (times.length >= 100) {
      times.shift();
    }

    times.push(time);
    this.eventStats.processingTime.set(eventName, times);
  }

  /**
   * Increments an event statistic
   */
  private incrementEventStat(
    statName: "emitCount" | "batchCount" | "listenerCallCount",
    eventName: string,
  ): void {
    // Increment for exact event name
    this.eventStats[statName].set(
      eventName,
      (this.eventStats[statName].get(eventName) || 0) + 1,
    );

    // Also increment for matching patterns
    for (const pattern in this.config.eventConfigs) {
      if (pattern !== eventName && this.matchesWildcard(eventName, pattern)) {
        this.eventStats[statName].set(
          pattern,
          (this.eventStats[statName].get(pattern) || 0) + 1,
        );
      }
    }
  }

  /**
   * Forces immediate processing of all batch queues
   */
  flushAllBatches(): void {
    // Use Array.from to avoid compatibility issues with Map iterators
    Array.from(this.batchQueues.keys()).forEach(eventName => {
      this.processBatch(eventName);
    });
  }
}
