import { logger } from '../logger';

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
  private listeners: Map<string, Array<{ 
    callback: EventListener; 
    options: ListenerOptions;
  }>> = new Map();
  
  private pendingEvents: Map<string, any[][]> = new Map();
  private isProcessing = false;
  private microtaskScheduled = false;
  private listenerCount = 0;
  
  // Using WeakRef to track listeners that might be eligible for garbage collection
  private listenerRefs = new Set<WeakRef<EventListener>>();
  private registry: FinalizationRegistry<string>;
  
  constructor() {
    this.registry = new FinalizationRegistry((eventName: string) => {
      logger.debug(`Listener for ${eventName} was garbage collected`);
    });
  }
  
  /**
   * Register an event listener
   * @param event Event name to listen for
   * @param callback Function to call when event is emitted
   * @param options Listener options (once, priority)
   * @returns Unsubscribe function
   */
  public on(event: string, callback: EventListener, options: ListenerOptions = {}): () => void {
    if (!event || typeof callback !== 'function') {
      logger.warn('Invalid parameters for event registration');
      return () => {};
    }
    
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    
    const eventListeners = this.listeners.get(event)!;
    const listenerObj = { callback, options };
    
    // Insert based on priority
    if (options.priority) {
      const index = eventListeners.findIndex(l => 
        (l.options.priority || 0) < (options.priority || 0)
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
    
    // Track with WeakRef for memory management diagnostics
    const weakRef = new WeakRef(callback);
    this.listenerRefs.add(weakRef);
    this.registry.register(callback, event);
    
    // Return unsubscribe function
    return () => this.off(event, callback);
  }
  
  /**
   * Register a one-time event listener
   */
  public once(event: string, callback: EventListener, options: Omit<ListenerOptions, 'once'> = {}): () => void {
    return this.on(event, callback, { ...options, once: true });
  }
  
  /**
   * Remove an event listener
   */
  public off(event: string, callback: EventListener): void {
    if (!this.listeners.has(event)) return;
    
    const eventListeners = this.listeners.get(event)!;
    const index = eventListeners.findIndex(l => l.callback === callback);
    
    if (index !== -1) {
      eventListeners.splice(index, 1);
      this.listenerCount--;
      
      if (eventListeners.length === 0) {
        this.listeners.delete(event);
      }
    }
  }
  
  /**
   * Emit an event (batched by default)
   * @param event Event name to emit
   * @param args Arguments to pass to listeners
   * @param immediate If true, process immediately instead of batching
   */
  public emit(event: string, args: any[] = [], immediate = false): void {
    if (!this.listeners.has(event)) return;
    
    if (immediate) {
      this.processEvent(event, args);
      return;
    }
    
    // Add to pending events
    if (!this.pendingEvents.has(event)) {
      this.pendingEvents.set(event, []);
    }
    
    this.pendingEvents.get(event)!.push(args);
    
    // Schedule processing if not already scheduled
    this.scheduleMicrotask();
  }
  
  /**
   * Emit multiple events at once (batched)
   * @param events Array of [eventName, args] tuples
   */
  public emitMultiple(events: Array<[string, any[]]>): void {
    for (const [event, args] of events) {
      if (!this.listeners.has(event)) continue;
      
      if (!this.pendingEvents.has(event)) {
        this.pendingEvents.set(event, []);
      }
      
      this.pendingEvents.get(event)!.push(args);
    }
    
    // Schedule processing if not already scheduled
    this.scheduleMicrotask();
  }
  
  /**
   * Schedule a microtask to process pending events
   */
  private scheduleMicrotask(): void {
    if (this.microtaskScheduled) return;
    
    this.microtaskScheduled = true;
    
    queueMicrotask(() => {
      this.microtaskScheduled = false;
      this.processPendingEvents();
    });
  }
  
  /**
   * Process all pending events
   */
  private processPendingEvents(): void {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    
    const eventEntries = Array.from(this.pendingEvents.entries());
    this.pendingEvents.clear();
    
    for (const [event, argsBatch] of eventEntries) {
      for (const args of argsBatch) {
        this.processEvent(event, args);
      }
    }
    
    this.isProcessing = false;
  }
  
  /**
   * Process a single event immediately
   */
  private processEvent(event: string, args: any[]): void {
    if (!this.listeners.has(event)) return;
    
    const eventListeners = this.listeners.get(event)!;
    const onceListeners: number[] = [];
    
    // Call all listeners for this event
    for (let i = 0; i < eventListeners.length; i++) {
      const { callback, options } = eventListeners[i];
      
      try {
        callback(...args);
      } catch (error) {
        logger.error(`Error in event listener for ${event}:`, error);
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
  }
  
  /**
   * Process all pending events immediately
   */
  public flush(): void {
    this.processPendingEvents();
  }
  
  /**
   * Remove all listeners for a specific event or all events
   */
  public removeAllListeners(event?: string): void {
    if (event) {
      const count = this.listeners.get(event)?.length || 0;
      this.listeners.delete(event);
      this.listenerCount -= count;
    } else {
      this.listeners.clear();
      this.listenerCount = 0;
    }
  }
  
  /**
   * Get the number of registered listeners
   */
  public listenerStats(): { total: number, byEvent: Record<string, number> } {
    const byEvent: Record<string, number> = {};
    
    for (const [event, listeners] of this.listeners.entries()) {
      byEvent[event] = listeners.length;
    }
    
    return {
      total: this.listenerCount,
      byEvent
    };
  }
}