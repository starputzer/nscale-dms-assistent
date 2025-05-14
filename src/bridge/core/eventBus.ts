/**
 * @file Bridge Event Bus Implementation
 * @description Unified and type-safe event bus implementation for the bridge system.
 * This implementation supports batched event processing, prioritization,
 * and typed event subscriptions.
 * 
 * @redundancy-analysis
 * This file consolidates event handling functionality previously scattered across:
 * - bridge/enhanced/eventBus.ts
 * - bridge/enhanced/optimized/BatchedEventEmitter.ts
 * - bridge/index.ts (basic event emitter)
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  BridgeEvent,
  BridgeEventHandler,
  BridgeSubscription,
  BridgeEventMap,
  TypedEventEmitter
} from './types';

/**
 * Options for event batching
 */
interface BatchOptions {
  /** Maximum number of events to process in a batch */
  maxBatchSize: number;
  
  /** Timeout in milliseconds for batching events */
  timeoutMs: number;
  
  /** Whether to process high-priority events immediately */
  prioritizeHighPriority: boolean;
}

/**
 * Internal subscription object
 */
interface Subscription<T = any> {
  /** Subscription identifier */
  id: string;
  
  /** Event handler function */
  handler: BridgeEventHandler<T>;
  
  /** Event type */
  eventType: string;
  
  /** Whether this is a one-time subscription */
  once: boolean;
  
  /** Whether this subscription is currently active */
  active: boolean;
  
  /** Source identifier for debugging */
  source?: string;
}

/**
 * Unified event bus implementation with batching support
 */
export class BatchedEventBus implements TypedEventEmitter {
  /** Map of event types to subscriptions */
  private subscriptions: Map<string, Subscription[]> = new Map();
  
  /** Batched events queue */
  private eventQueue: BridgeEvent[] = [];
  
  /** Current batch timeout identifier */
  private batchTimeoutId: number | null = null;
  
  /** Batch processing options */
  private batchOptions: BatchOptions;
  
  /** Debug mode flag */
  private debug: boolean;
  
  /** Whether the event bus is paused */
  private isPaused: boolean = false;
  
  /** Event history for diagnostics */
  private eventHistory: BridgeEvent[] = [];
  
  /** Maximum event history size */
  private maxEventHistory: number;
  
  /**
   * Create a new batched event bus
   */
  constructor(options?: {
    maxBatchSize?: number;
    timeoutMs?: number;
    prioritizeHighPriority?: boolean;
    debug?: boolean;
    maxEventHistory?: number;
  }) {
    this.batchOptions = {
      maxBatchSize: options?.maxBatchSize ?? 100,
      timeoutMs: options?.timeoutMs ?? 50,
      prioritizeHighPriority: options?.prioritizeHighPriority ?? true
    };
    
    this.debug = options?.debug ?? false;
    this.maxEventHistory = options?.maxEventHistory ?? 100;
  }
  
  /**
   * Emit an event with optional payload
   */
  emit<K extends keyof BridgeEventMap>(
    eventType: K, 
    payload: BridgeEventMap[K]
  ): void {
    if (this.isPaused) {
      if (this.debug) {
        console.debug(`[BatchedEventBus] Skipping event ${String(eventType)} because event bus is paused`);
      }
      return;
    }
    
    const event: BridgeEvent = {
      type: String(eventType),
      payload,
      timestamp: Date.now(),
      priority: this.getEventPriority(String(eventType))
    };
    
    if (this.debug) {
      console.debug(`[BatchedEventBus] Queuing event: ${event.type}`, event.payload);
    }
    
    // Add to event history
    this.addToEventHistory(event);
    
    // Handle high-priority events immediately if configured
    if (event.priority === 'high' && this.batchOptions.prioritizeHighPriority) {
      this.processEvent(event);
      return;
    }
    
    // Add to queue
    this.eventQueue.push(event);
    
    // Process immediately if queue exceeds max batch size
    if (this.eventQueue.length >= this.batchOptions.maxBatchSize) {
      this.processEventQueue();
      return;
    }
    
    // Set timeout to process queue if not already set
    if (this.batchTimeoutId === null) {
      this.batchTimeoutId = window.setTimeout(() => {
        this.processEventQueue();
      }, this.batchOptions.timeoutMs);
    }
  }
  
  /**
   * Subscribe to an event type
   */
  on<K extends keyof BridgeEventMap>(
    eventType: K, 
    handler: BridgeEventHandler<BridgeEventMap[K]>,
    source?: string
  ): BridgeSubscription {
    return this.subscribe(String(eventType), handler, false, source);
  }
  
  /**
   * Subscribe to an event type for a single occurrence
   */
  once<K extends keyof BridgeEventMap>(
    eventType: K, 
    handler: BridgeEventHandler<BridgeEventMap[K]>,
    source?: string
  ): BridgeSubscription {
    return this.subscribe(String(eventType), handler, true, source);
  }
  
  /**
   * Pause the event bus (events will be queued but not processed)
   */
  pause(): void {
    if (!this.isPaused) {
      this.isPaused = true;
      if (this.debug) {
        console.debug('[BatchedEventBus] Event bus paused');
      }
    }
  }
  
  /**
   * Resume the event bus and process any queued events
   */
  resume(): void {
    if (this.isPaused) {
      this.isPaused = false;
      if (this.debug) {
        console.debug('[BatchedEventBus] Event bus resumed');
      }
      
      // Process any queued events
      if (this.eventQueue.length > 0) {
        this.processEventQueue();
      }
    }
  }
  
  /**
   * Get current event history
   */
  getEventHistory(): BridgeEvent[] {
    return [...this.eventHistory];
  }
  
  /**
   * Clear event history
   */
  clearEventHistory(): void {
    this.eventHistory = [];
  }
  
  /**
   * Get active subscriptions for an event type
   */
  getSubscriptions(eventType?: string): Subscription[] {
    if (eventType) {
      return this.subscriptions.get(eventType) || [];
    }
    
    // Get all subscriptions
    const allSubscriptions: Subscription[] = [];
    for (const subs of this.subscriptions.values()) {
      allSubscriptions.push(...subs);
    }
    
    return allSubscriptions;
  }
  
  /**
   * Determine event priority based on event type
   */
  private getEventPriority(eventType: string): 'high' | 'normal' | 'low' {
    // User interaction events are high priority
    if (
      eventType.startsWith('ui:') || 
      eventType === 'auth:login' || 
      eventType === 'auth:logout'
    ) {
      return 'high';
    }
    
    // Background sync events are low priority
    if (
      eventType.startsWith('sync:') || 
      eventType.includes('batch') || 
      eventType.includes('telemetry')
    ) {
      return 'low';
    }
    
    // Everything else is normal priority
    return 'normal';
  }
  
  /**
   * Create a subscription for an event type
   */
  private subscribe<T>(
    eventType: string, 
    handler: BridgeEventHandler<T>, 
    once: boolean = false,
    source?: string
  ): BridgeSubscription {
    if (!eventType) {
      throw new Error('Event type is required');
    }
    
    if (!handler || typeof handler !== 'function') {
      throw new Error('Handler must be a function');
    }
    
    const id = uuidv4();
    const subscription: Subscription<T> = {
      id,
      handler,
      eventType,
      once,
      active: true,
      source
    };
    
    // Add to subscriptions map
    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, []);
    }
    
    this.subscriptions.get(eventType)!.push(subscription);
    
    if (this.debug) {
      console.debug(
        `[BatchedEventBus] Subscription created for "${eventType}"${source ? ` from "${source}"` : ''}`
      );
    }
    
    // Return subscription object with methods to manage it
    return {
      id,
      unsubscribe: () => this.unsubscribe(id),
      pause: () => this.pauseSubscription(id),
      resume: () => this.resumeSubscription(id)
    };
  }
  
  /**
   * Remove a subscription by ID
   */
  private unsubscribe(subscriptionId: string): void {
    for (const [eventType, subscriptions] of this.subscriptions.entries()) {
      const index = subscriptions.findIndex(sub => sub.id === subscriptionId);
      
      if (index !== -1) {
        subscriptions.splice(index, 1);
        
        if (this.debug) {
          console.debug(`[BatchedEventBus] Unsubscribed from "${eventType}" (ID: ${subscriptionId})`);
        }
        
        // Clean up empty subscription arrays
        if (subscriptions.length === 0) {
          this.subscriptions.delete(eventType);
        }
        
        return;
      }
    }
  }
  
  /**
   * Pause a subscription by ID
   */
  private pauseSubscription(subscriptionId: string): void {
    for (const subscriptions of this.subscriptions.values()) {
      const subscription = subscriptions.find(sub => sub.id === subscriptionId);
      
      if (subscription) {
        subscription.active = false;
        
        if (this.debug) {
          console.debug(`[BatchedEventBus] Paused subscription for "${subscription.eventType}" (ID: ${subscriptionId})`);
        }
        
        return;
      }
    }
  }
  
  /**
   * Resume a subscription by ID
   */
  private resumeSubscription(subscriptionId: string): void {
    for (const subscriptions of this.subscriptions.values()) {
      const subscription = subscriptions.find(sub => sub.id === subscriptionId);
      
      if (subscription) {
        subscription.active = true;
        
        if (this.debug) {
          console.debug(`[BatchedEventBus] Resumed subscription for "${subscription.eventType}" (ID: ${subscriptionId})`);
        }
        
        return;
      }
    }
  }
  
  /**
   * Process all queued events
   */
  private processEventQueue(): void {
    if (this.isPaused) {
      return;
    }
    
    // Clear the timeout
    if (this.batchTimeoutId !== null) {
      clearTimeout(this.batchTimeoutId);
      this.batchTimeoutId = null;
    }
    
    // Process all events in the queue
    const events = [...this.eventQueue];
    this.eventQueue = [];
    
    // Sort by priority (high -> normal -> low) and then by timestamp (oldest first)
    events.sort((a, b) => {
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      const aPriority = priorityOrder[a.priority || 'normal'];
      const bPriority = priorityOrder[b.priority || 'normal'];
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      return a.timestamp - b.timestamp;
    });
    
    // Process events
    for (const event of events) {
      this.processEvent(event);
    }
  }
  
  /**
   * Process a single event
   */
  private processEvent(event: BridgeEvent): void {
    if (this.isPaused) {
      // Re-queue the event
      this.eventQueue.push(event);
      return;
    }
    
    const subscriptions = this.subscriptions.get(event.type) || [];
    
    if (subscriptions.length === 0) {
      // No subscribers for this event
      if (this.debug) {
        console.debug(`[BatchedEventBus] No subscribers for event "${event.type}"`);
      }
      return;
    }
    
    // Process all active subscriptions
    for (let i = 0; i < subscriptions.length; i++) {
      const subscription = subscriptions[i];
      
      if (!subscription.active) {
        continue;
      }
      
      try {
        // Call the handler
        subscription.handler(event.payload, event.meta);
        
        // Remove one-time subscriptions
        if (subscription.once) {
          subscriptions.splice(i, 1);
          i--;
        }
      } catch (error) {
        console.error(`[BatchedEventBus] Error in event handler for "${event.type}":`, error);
      }
    }
    
    // Clean up empty subscription arrays
    if (subscriptions.length === 0) {
      this.subscriptions.delete(event.type);
    }
  }
  
  /**
   * Add an event to the history
   */
  private addToEventHistory(event: BridgeEvent): void {
    this.eventHistory.push(event);
    
    // Keep event history limited to maxEventHistory
    if (this.eventHistory.length > this.maxEventHistory) {
      this.eventHistory.shift();
    }
  }
  
  /**
   * Dispose of all resources
   */
  dispose(): void {
    // Clear the timeout
    if (this.batchTimeoutId !== null) {
      clearTimeout(this.batchTimeoutId);
      this.batchTimeoutId = null;
    }
    
    // Clear all subscriptions
    this.subscriptions.clear();
    
    // Clear the event queue
    this.eventQueue = [];
    
    // Clear event history
    this.eventHistory = [];
    
    if (this.debug) {
      console.debug('[BatchedEventBus] Disposed event bus');
    }
  }
}

/**
 * Create a singleton instance of the batched event bus
 */
export const eventBus = new BatchedEventBus({
  maxBatchSize: 100,
  timeoutMs: 50,
  prioritizeHighPriority: true,
  debug: false,
  maxEventHistory: 100
});