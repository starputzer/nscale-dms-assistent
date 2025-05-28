import { createLogger } from "../logger/index";
import {
  getWeakRefConstructor,
  getFinalizationRegistryConstructor,
  ES2021_SUPPORT,
} from "../../../utils/es2021-polyfills";
import {
  BridgeErrorCode,
  BridgeResult,
  executeBridgeOperation,
  success,
  failure,
} from "../bridgeErrorUtils";

// Verwende die nativen oder polyfillierten Konstruktoren
const SafeWeakRef: any = getWeakRefConstructor();
const SafeFinalizationRegistry: any = getFinalizationRegistryConstructor();

type EventListener = (...args: any[]) => void;
type ListenerOptions = {
  once?: boolean;
  priority?: number;
};

/**
 * BatchedEventEmitter provides an optimized event bus that:
 * - Batches event emissions to reduce processing overhead
 * - Uses microtask scheduling for efficient event handling
 * - Provides ability to emit multiple events at once
 * - Tracks memory usage through WeakRefs
 */
export class BatchedEventEmitter {
  private listeners: Map<
    string,
    Array<{
      callback: EventListener;
      options: ListenerOptions;
    }>
  > = new Map();

  private pendingEvents: Map<string, any[][]> = new Map();
  private isProcessing = false;
  private microtaskScheduled = false;
  private listenerCount = 0;

  // Using SafeWeakRef to track listeners that might be eligible for garbage collection
  private listenerRefs = new Set<any>();
  private registry: any;

  // Logger for this component
  private logger = createLogger("BatchedEventEmitter");
  private componentName = "BatchedEventEmitter";

  constructor() {
    // Log, ob die nativen ES2021-Features unterstützt werden
    this.logger.debug(
      `ES2021 support: WeakRef=${ES2021_SUPPORT.WeakRef}, FinalizationRegistry=${ES2021_SUPPORT.FinalizationRegistry}`,
    );

    this.registry = new SafeFinalizationRegistry((eventName: string) => {
      this.logger.debug(`Listener for ${eventName} was garbage collected`);
    });
  }

  /**
   * Register an event listener
   * @param event Event name to listen for
   * @param callback Function to call when event is emitted
   * @param options Listener options (once, priority)
   * @returns BridgeResult with unsubscribe function
   */
  public async on(
    event: string,
    callback: EventListener,
    options: ListenerOptions = {},
  ): Promise<BridgeResult<() => void>> {
    return executeBridgeOperation(
      () => {
        if (!event || typeof callback !== "function") {
          throw new Error("Invalid parameters for event registration");
        }

        if (!this.listeners.has(event)) {
          this.listeners.set(event, []);
        }

        const eventListeners = this.listeners.get(event)!;
        const listenerObj = { callback, options };

        // Insert based on priority
        if (options.priority) {
          const index = eventListeners.findIndex(
            (l) => (l.options.priority || 0) < (options.priority || 0),
          );

          if (index >= 0) {
            eventListeners.splice(index, 0, listenerObj);
          } else {
            eventListeners.push(listenerObj);
          }
        } else {
          eventListeners.push(listenerObj);
        }

        this.listenerCount++;

        // Track with SafeWeakRef for memory management diagnostics
        const weakRef = new SafeWeakRef(callback);
        this.listenerRefs.add(weakRef);
        this.registry.register(callback, event);

        // Return unsubscribe function
        return () => {
          const result = await this.off(event, callback);
          if (!result.success) {
            this.logger.warn(
              `Failed to unsubscribe from ${event}:`,
              result.error.message,
            );
          }
        };
      },
      {
        component: this.componentName,
        operationName: "on",
        errorCode: BridgeErrorCode.LISTENER_MANAGEMENT_ERROR,
        errorMessage: `Failed to register listener for event: ${event}`,
      },
    );
  }

  /**
   * Register a one-time event listener
   */
  public async once(
    event: string,
    callback: EventListener,
    options: Omit<ListenerOptions, "once"> = {},
  ): Promise<BridgeResult<() => void>> {
    return this.on(event, callback, { ...options, once: true });
  }

  /**
   * Remove an event listener
   */
  public async off(
    event: string,
    callback: EventListener,
  ): Promise<BridgeResult<void>> {
    return executeBridgeOperation(
      () => {
        if (!this.listeners.has(event)) {
          return;
        }

        const eventListeners = this.listeners.get(event)!;
        const index = eventListeners.findIndex((l) => l.callback === callback);

        if (index !== -1) {
          eventListeners.splice(index, 1);
          this.listenerCount--;

          if (eventListeners.length === 0) {
            this.listeners.delete(event);
          }
        }
      },
      {
        component: this.componentName,
        operationName: "off",
        errorCode: BridgeErrorCode.LISTENER_MANAGEMENT_ERROR,
        errorMessage: `Failed to remove listener for event: ${event}`,
      },
    );
  }

  /**
   * Emit an event (batched by default)
   * @param event Event name to emit
   * @param args Arguments to pass to listeners
   * @param immediate If true, process immediately instead of batching
   */
  public async emit(
    event: string,
    args: any[] = [],
    immediate = false,
  ): Promise<BridgeResult<void>> {
    return executeBridgeOperation(
      () => {
        if (!this.listeners.has(event)) {
          return;
        }

        if (immediate) {
          const processResult = await this.processEvent(event, args);
          if (!processResult.success) {
            throw new Error(
              `Failed to process event ${event}: ${processResult.error.message}`,
            );
          }
          return;
        }

        // Add to pending events
        if (!this.pendingEvents.has(event)) {
          this.pendingEvents.set(event, []);
        }

        this.pendingEvents.get(event)!.push(args);

        // Schedule processing if not already scheduled
        this.scheduleMicrotask();
      },
      {
        component: this.componentName,
        operationName: "emit",
        errorCode: BridgeErrorCode.EVENT_EMISSION_ERROR,
        errorMessage: `Failed to emit event: ${event}`,
      },
    );
  }

  /**
   * Emit multiple events at once (batched)
   * @param events Array of [eventName, args] tuples
   */
  public async emitMultiple(
    events: Array<[string, any[]]>,
  ): Promise<BridgeResult<void>> {
    return executeBridgeOperation(
      () => {
        for (const [event, args] of events) {
          if (!this.listeners.has(event)) {
            continue;
          }

          if (!this.pendingEvents.has(event)) {
            this.pendingEvents.set(event, []);
          }

          this.pendingEvents.get(event)!.push(args);
        }

        // Schedule processing if not already scheduled
        this.scheduleMicrotask();
      },
      {
        component: this.componentName,
        operationName: "emitMultiple",
        errorCode: BridgeErrorCode.EVENT_EMISSION_ERROR,
        errorMessage: "Failed to emit multiple events",
      },
    );
  }

  /**
   * Schedule a microtask to process pending events
   */
  private scheduleMicrotask(): void {
    if (this.microtaskScheduled) return;

    this.microtaskScheduled = true;

    queueMicrotask(() => {
      this.microtaskScheduled = false;
      const result = await this.processPendingEvents();
      if (!result.success) {
        this.logger.error(
          "Failed to process pending events:",
          result.error.message,
        );
      }
    });
  }

  /**
   * Process all pending events
   */
  private async processPendingEvents(): Promise<BridgeResult<void>> {
    if (this.isProcessing) {
      return success(undefined);
    }

    this.isProcessing = true;

    try {
      const eventEntries = Array.from(this.pendingEvents.entries());
      this.pendingEvents.clear();

      const errors: { event: string; error: any }[] = [];

      for (const [event, argsBatch] of eventEntries) {
        for (const args of argsBatch) {
          const result = await this.processEvent(event, args);
          if (!result.success) {
            errors.push({ event, error: result.error });
          }
        }
      }

      if (errors.length > 0) {
        return failure(
          BridgeErrorCode.EVENT_HANDLING_ERROR,
          `Failed to process ${errors.length} events`,
          {
            component: this.componentName,
            operation: "processPendingEvents",
            details: errors,
          },
        );
      }

      return success(undefined);
    } catch (error) {
      return failure(
        BridgeErrorCode.EVENT_HANDLING_ERROR,
        "Error during batch event processing",
        {
          component: this.componentName,
          operation: "processPendingEvents",
          originalError: error,
        },
      );
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single event immediately
   */
  private async processEvent(
    event: string,
    args: any[],
  ): Promise<BridgeResult<void>> {
    if (!this.listeners.has(event)) {
      return success(undefined);
    }

    const eventListeners = this.listeners.get(event)!;
    const onceListeners: number[] = [];
    const errors: any[] = [];

    // Call all listeners for this event
    for (let i = 0; i < eventListeners.length; i++) {
      const { callback, options } = eventListeners[i];

      try {
        callback(...args);
      } catch (error) {
        this.logger.error(`Error in event listener for ${event}:`, error);
        errors.push(error);
      }

      // Track "once" listeners for removal
      if (options.once) {
        onceListeners.push(i);
      }
    }

    // Remove "once" listeners (in reverse to avoid index shifting)
    for (let i = onceListeners.length - 1; i >= 0; i--) {
      eventListeners.splice(onceListeners[i], 1);
      this.listenerCount--;
    }

    // Clean up empty listener arrays
    if (eventListeners.length === 0) {
      this.listeners.delete(event);
    }

    if (errors.length > 0) {
      return failure(
        BridgeErrorCode.EVENT_HANDLING_ERROR,
        `${errors.length} listeners for event ${event} threw errors`,
        {
          component: this.componentName,
          operation: "processEvent",
          details: { event, errors },
        },
      );
    }

    return success(undefined);
  }

  /**
   * Process all pending events immediately
   */
  public async flush(): Promise<BridgeResult<void>> {
    return this.processPendingEvents();
  }

  /**
   * Remove all listeners for a specific event or all events
   */
  public async removeAllListeners(event?: string): Promise<BridgeResult<void>> {
    return executeBridgeOperation(
      () => {
        if (event) {
          const count = this.listeners.get(event)?.length || 0;
          this.listeners.delete(event);
          this.listenerCount -= count;
        } else {
          this.listeners.clear();
          this.listenerCount = 0;
        }
      },
      {
        component: this.componentName,
        operationName: "removeAllListeners",
        errorCode: BridgeErrorCode.LISTENER_MANAGEMENT_ERROR,
        errorMessage: event
          ? `Failed to remove all listeners for event: ${event}`
          : "Failed to remove all listeners",
      },
    );
  }

  /**
   * Get the number of registered listeners
   */
  public async listenerStats(): Promise<
    BridgeResult<{ total: number; byEvent: Record<string, number> }>
  > {
    return executeBridgeOperation(
      () => {
        const byEvent: Record<string, number> = {};

        // Use Array.from to avoid Map iterator compatibility issues
        Array.from(this.listeners.entries()).forEach(([event, listeners]) => {
          byEvent[event] = listeners.length;
        });

        return {
          total: this.listenerCount,
          byEvent,
        };
      },
      {
        component: this.componentName,
        operationName: "listenerStats",
        errorCode: BridgeErrorCode.UNKNOWN_ERROR,
        errorMessage: "Failed to retrieve listener statistics",
      },
    );
  }
}
