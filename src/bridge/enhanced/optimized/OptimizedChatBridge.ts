import { BatchedEventEmitter } from "./BatchedEventEmitter";
import { OptimizedStateManager } from "./StateManager";
import { MemoryManager } from "./MemoryManager";
import { createLogger } from "../logger/index";
// import { LogLevel } // TS6133: unused from "../types";

/**
 * OptimizedChatBridge provides an optimized integration between Vue 3
 * components and legacy JavaScript code with selective synchronization,
 * batched updates, and memory management optimizations.
 */
export class OptimizedChatBridge {
  private stateManager: OptimizedStateManager;
  private eventEmitter: BatchedEventEmitter;
  private memoryManager: MemoryManager;
  private status: string = "INITIALIZING"; // Statt BridgeComponentStatus
  private componentRefs = new WeakMap<object, string>();
  private isInitialized = false;
  private diagnosticsEnabled = false;

  // Logger für diese Komponente
  private logger = createLogger("OptimizedChatBridge");
  private performanceMetrics: Map<string, number[]> = new Map();

  constructor() {
    this.stateManager = new OptimizedStateManager();
    this.eventEmitter = new BatchedEventEmitter();
    this.memoryManager = new MemoryManager();

    // Default chat message update intervals
    this.stateManager.setUpdateInterval("messages", 100); // Debounce message updates
    this.stateManager.setUpdateInterval("typing", 50); // Lower latency for typing indicators
    this.stateManager.setUpdateInterval("session", 250); // Session state less time-critical

    // Self-healing initialization
    this.initializeSelfHealing();
  }

  /**
   * Initialize the bridge with self-healing capabilities
   */
  private initializeSelfHealing(): void {
    // Selbstheilungs-Funktionalität - vereinfachte Implementation für TS-Kompatibilität
    const selfHealingMethods = {
      checkHealth: () => {
        return {
          isHealthy: this.status !== "ERROR",
          metrics: {
            eventListenerCount:
              (this.eventEmitter.listenerStats() as any).total || 0,
            trackedComponents: Object.keys(this.componentRefs).length,
          },
        };
      },

      attemptRecovery: () => {
        this.logger.warn("Attempting to recover OptimizedChatBridge");
        this.status = "RECOVERING";

        try {
          // Flush pending updates
          this.stateManager.flushPendingUpdates();
          this.eventEmitter.flush();

          // Reset to known good state if needed
          if (this.status === "ERROR") {
            this.reset();
            this.initialize();
          }

          this.status = "ACTIVE";
          return true;
        } catch (error) {
          this.logger.error("Failed to recover OptimizedChatBridge:", error);
          this.status = "ERROR";
          return false;
        }
      },
    };

    // Für Testzwecke - Selbstheilungsmethoden exportieren
    (window as any).__optimizedBridgeSelfHealing = selfHealingMethods;
  }

  /**
   * Initialize the bridge
   */
  public initialize(): void {
    if (this.isInitialized) return;

    try {
      this.status = "INITIALIZING";

      // Register global event listeners with memory-safe wrappers
      if (typeof window !== "undefined") {
        this.setupGlobalListeners();
      }

      this.isInitialized = true;
      this.status = "ACTIVE";
      this.logger.info("OptimizedChatBridge initialized successfully");
    } catch (error) {
      this.status = "ERROR";
      this.logger.error("Failed to initialize OptimizedChatBridge:", error);
      throw error;
    }
  }

  /**
   * Set up global event listeners with memory-safe wrappers
   */
  private setupGlobalListeners(): void {
    // Use memory-safe event listeners
    this.memoryManager.createSafeEventListener(window, "beforeunload", () => {
      this.stateManager.flushPendingUpdates();
      this.eventEmitter.flush();
    });

    // Monitor for memory issues
    if (window.performance && "memory" in window.performance) {
      const memoryCheck = setInterval(() => {
        const memoryInfo = (window.performance as any).memory;
        if (
          memoryInfo &&
          memoryInfo.usedJSHeapSize > memoryInfo.jsHeapSizeLimit * 0.8
        ) {
          this.logger.warn("Memory usage is high, releasing unused resources");
          this.cleanupUnusedResources();
        }
      }, 30000);

      // Ensure the interval is cleared when window is unloaded
      window.addEventListener("unload", () => {
        clearInterval(memoryCheck);
      });
    }
  }

  /**
   * Enable or disable performance diagnostics
   */
  public setDiagnostics(enabled: boolean): void {
    this.diagnosticsEnabled = enabled;
    this.logger.info(
      `Performance diagnostics ${enabled ? "enabled" : "disabled"}`,
    );
  }

  /**
   * Register a Vue component with the bridge
   * @param component Vue component reference
   * @param id Unique identifier for the component
   */
  public registerComponent(component: object, id: string): void {
    if (!component || typeof component !== "object") {
      this.logger.warn("Invalid component registration attempt");
      return;
    }

    this.componentRefs.set(component, id);
    this.logger.debug(`Registered component: ${id}`);
  }

  /**
   * Unregister a component and clean up its resources
   * @param component Vue component reference
   */
  public unregisterComponent(component: object): void {
    if (!component || !this.componentRefs.has(component)) return;

    const id = this.componentRefs.get(component);

    // Clean up resources
    this.memoryManager.releaseComponent(component);
    this.componentRefs.delete(component);

    this.logger.debug(`Unregistered component: ${id}`);
  }

  /**
   * Subscribe to state changes with automatic cleanup
   * @param stateKey State to subscribe to
   * @param callback Function to call when state changes
   * @param component Component that owns this subscription
   */
  public subscribeToState(
    stateKey: string,
    callback: (state: any) => void,
    component: object,
  ): () => void {
    if (!this.isInitialized) {
      this.initialize();
    }

    // Create subscription
    const unsubscribe = this.stateManager.subscribe(stateKey, callback);

    // Track for automatic cleanup
    if (component) {
      this.memoryManager.trackCleanup(
        component,
        unsubscribe,
        this.componentRefs.get(component),
      );
    }

    return unsubscribe;
  }

  /**
   * Subscribe to events with automatic cleanup
   * @param event Event name to subscribe to
   * @param callback Function to call when event is emitted
   * @param component Component that owns this subscription
   * @param options Event subscription options
   */
  public async subscribeToEvent(
    event: string,
    callback: (...args: any[]) => void,
    component: object,
    options: { once?: boolean; priority?: number } = {},
  ): Promise<() => void> {
    if (!this.isInitialized) {
      this.initialize();
    }

    // Start performance measurement if diagnostics enabled
    const startTime = this.diagnosticsEnabled ? performance.now() : 0;

    // Create subscription
    const unsubscribeResult = await this.eventEmitter.on(
      event,
      callback,
      options,
    );

    // Extract the unsubscribe function from the result
    const unsubscribe =
      unsubscribeResult.success && unsubscribeResult.data
        ? unsubscribeResult.data
        : () => {
            console.warn("Failed to create subscription");
          };

    // Track for automatic cleanup
    if (component) {
      this.memoryManager.trackCleanup(
        component,
        unsubscribe,
        this.componentRefs.get(component),
      );
    }

    // Record performance metrics
    if (this.diagnosticsEnabled) {
      const duration = performance.now() - startTime;
      if (!this.performanceMetrics.has("subscribeEvent")) {
        this.performanceMetrics.set("subscribeEvent", []);
      }
      this.performanceMetrics.get("subscribeEvent")!.push(duration);
    }

    return unsubscribe;
  }

  /**
   * Update state with selective synchronization
   * @param stateKey Key for the state slice to update
   * @param newState New state data
   * @param immediate Whether to sync immediately or batch update
   */
  public updateState(stateKey: string, newState: any, immediate = false): void {
    if (!this.isInitialized) {
      this.initialize();
    }

    // Start performance measurement if diagnostics enabled
    const startTime = this.diagnosticsEnabled ? performance.now() : 0;

    try {
      this.stateManager.syncState(stateKey, newState, immediate);

      // Record performance metrics
      if (this.diagnosticsEnabled) {
        const duration = performance.now() - startTime;
        if (!this.performanceMetrics.has("updateState")) {
          this.performanceMetrics.set("updateState", []);
        }
        this.performanceMetrics.get("updateState")!.push(duration);
      }
    } catch (error) {
      this.status = "ERROR";
      this.logger.error(`Error updating state for ${stateKey}:`, error);
      throw error;
    }
  }

  /**
   * Emit an event with optional batching
   * @param event Event name to emit
   * @param args Event arguments
   * @param immediate Whether to emit immediately or batch
   */
  public emitEvent(event: string, args: any[] = [], immediate = false): void {
    if (!this.isInitialized) {
      this.initialize();
    }

    // Start performance measurement if diagnostics enabled
    const startTime = this.diagnosticsEnabled ? performance.now() : 0;

    try {
      this.eventEmitter.emit(event, args, immediate);

      // Record performance metrics
      if (this.diagnosticsEnabled) {
        const duration = performance.now() - startTime;
        if (!this.performanceMetrics.has("emitEvent")) {
          this.performanceMetrics.set("emitEvent", []);
        }
        this.performanceMetrics.get("emitEvent")!.push(duration);
      }
    } catch (error) {
      this.logger.error(`Error emitting event ${event}:`, error);
    }
  }

  /**
   * Emit multiple events at once (efficiently batched)
   * @param events Array of [eventName, args] tuples
   */
  public emitMultipleEvents(events: Array<[string, any[]]>): void {
    if (!this.isInitialized) {
      this.initialize();
    }

    try {
      this.eventEmitter.emitMultiple(events);
    } catch (error) {
      this.logger.error("Error emitting multiple events:", error);
    }
  }

  /**
   * Get current bridge status
   */
  public getStatus(): string {
    return this.status;
  }

  /**
   * Reset bridge to initial state
   */
  public reset(): void {
    try {
      this.status = "INITIALIZING";

      // Reset all managers
      this.stateManager.reset();
      this.eventEmitter.removeAllListeners();

      // Clear performance metrics
      this.performanceMetrics.clear();

      this.status = "ACTIVE";
      this.logger.info("OptimizedChatBridge reset complete");
    } catch (error) {
      this.status = "ERROR";
      this.logger.error("Error during bridge reset:", error);
      throw error;
    }
  }

  /**
   * Clean up unused resources to prevent memory leaks
   */
  private cleanupUnusedResources(): void {
    // Force garbage collection of unused components
    // This is a no-op since we're using WeakMaps and WeakRefs,
    // but we could add additional cleanup here if needed
  }

  /**
   * Get performance metrics if diagnostics are enabled
   */
  public getDiagnostics(): Record<string, any> | null {
    if (!this.diagnosticsEnabled) {
      return null;
    }

    const metrics: Record<string, any> = {
      status: this.status,
      eventListeners: this.eventEmitter.listenerStats(),
      performanceMetrics: {},
    };

    // Calculate averages for performance metrics
    // Use Array.from to avoid compatibility issues with Map iterators
    Array.from(this.performanceMetrics.entries()).forEach(
      ([key, values]: any) => {
        if (values.length > 0) {
          const sum = values.reduce((a: any, b) => a + b, 0);
          const avg = sum / values.length;
          const max = Math.max(...values);
          const min = Math.min(...values);

          metrics.performanceMetrics[key] = {
            avg,
            max,
            min,
            samples: values.length,
          };
        }
      },
    );

    return metrics;
  }
}
