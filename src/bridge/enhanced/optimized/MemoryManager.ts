import { logger } from '../logger';

/**
 * Manages references using WeakMap/WeakSet to prevent memory leaks
 * and allow efficient garbage collection when components are destroyed
 */
export class MemoryManager {
  // Store event listeners by component reference
  private componentListeners = new WeakMap<object, Set<() => void>>();
  
  // Track component references for debugging
  private trackedComponents = new WeakSet<object>();
  
  // Finalizers for cleanup tracking
  private finalizationRegistry = new FinalizationRegistry((id: string) => {
    logger.debug(`Component ${id} was garbage collected`);
  });

  /**
   * Track a component's event listeners or other cleanup functions
   * @param component The component instance to track
   * @param cleanupFn Function to call on cleanup (typically an event unsubscribe)
   * @param componentId Optional ID for logging purposes
   */
  public trackCleanup(component: object, cleanupFn: () => void, componentId?: string): void {
    if (!component || typeof cleanupFn !== 'function') {
      logger.warn('Invalid parameters for trackCleanup');
      return;
    }
    
    if (!this.componentListeners.has(component)) {
      this.componentListeners.set(component, new Set());
      this.trackedComponents.add(component);
      
      if (componentId) {
        this.finalizationRegistry.register(component, componentId);
      }
    }
    
    this.componentListeners.get(component)!.add(cleanupFn);
  }

  /**
   * Untrack and release all resources associated with a component
   * @param component The component instance to untrack
   * @returns The number of cleanup functions executed
   */
  public releaseComponent(component: object): number {
    if (!component || !this.componentListeners.has(component)) return 0;
    
    const cleanupFns = this.componentListeners.get(component)!;
    let executedCount = 0;
    
    // Execute all cleanup functions
    for (const cleanupFn of cleanupFns) {
      try {
        cleanupFn();
        executedCount++;
      } catch (error) {
        logger.error('Error during component cleanup:', error);
      }
    }
    
    // Clear references
    this.componentListeners.delete(component);
    return executedCount;
  }

  /**
   * Create a proxy around a target object that automatically cleans up
   * when the proxy is garbage collected
   * @param target The object to proxy
   * @param cleanup Function to call when proxy is garbage collected
   * @param id Optional ID for tracking/debugging
   */
  public createAutoCleaningProxy<T extends object>(
    target: T, 
    cleanup: () => void, 
    id?: string
  ): T {
    // WeakRef to check if target is collected
    const targetRef = new WeakRef(target);
    
    // Registry to run cleanup when proxy is collected
    const registry = new FinalizationRegistry(() => {
      const originalTarget = targetRef.deref();
      if (!originalTarget) {
        cleanup();
        if (id) logger.debug(`Auto-cleaned proxy ${id}`);
      }
    });
    
    // Create proxy
    const proxy = new Proxy(target, {
      // Standard proxy traps
      get(target, prop, receiver) {
        return Reflect.get(target, prop, receiver);
      },
      set(target, prop, value, receiver) {
        return Reflect.set(target, prop, value, receiver);
      }
    });
    
    // Register proxy for cleanup
    registry.register(proxy, null, proxy);
    
    return proxy;
  }

  /**
   * Create a throttled/memoized version of a function that conserves memory
   * by limiting the size of its cache and using weak references
   * @param fn Function to memoize
   * @param maxCacheSize Maximum number of results to cache (default: 100)
   * @param keyFn Optional function to generate cache keys
   */
  public createMemoryEfficientMemoization<T extends (...args: any[]) => any>(
    fn: T,
    maxCacheSize = 100,
    keyFn?: (...args: Parameters<T>) => string
  ): T {
    // Use Map for LRU cache of limited size
    const cache = new Map<string, { result: ReturnType<T>, timestamp: number }>();
    
    // Track parameters to result mapping
    const resultMap = new WeakMap<object, WeakRef<ReturnType<T>>>();
    
    const memoizedFn = ((...args: Parameters<T>): ReturnType<T> => {
      // Generate cache key
      const key = keyFn 
        ? keyFn(...args) 
        : JSON.stringify(args);
      
      // Check cache
      if (cache.has(key)) {
        const cached = cache.get(key)!;
        // Update timestamp for LRU
        cached.timestamp = Date.now();
        return cached.result;
      }
      
      // Call original function
      const result = fn(...args);
      
      // Store in cache
      cache.set(key, { 
        result, 
        timestamp: Date.now() 
      });
      
      // Prune cache if it exceeds max size
      if (cache.size > maxCacheSize) {
        // Find oldest entry
        let oldestKey = key;
        let oldestTime = Date.now();
        
        for (const [entryKey, entry] of cache.entries()) {
          if (entry.timestamp < oldestTime) {
            oldestTime = entry.timestamp;
            oldestKey = entryKey;
          }
        }
        
        // Remove oldest
        cache.delete(oldestKey);
      }
      
      // Track object parameters with WeakMap if possible
      for (const arg of args) {
        if (typeof arg === 'object' && arg !== null) {
          resultMap.set(arg, new WeakRef(result));
        }
      }
      
      return result;
    }) as T;
    
    return memoizedFn;
  }

  /**
   * Check if a component is being tracked by the memory manager
   */
  public isTracked(component: object): boolean {
    return this.trackedComponents.has(component);
  }
  
  /**
   * Create a memory-safe event listener that automatically removes itself
   * when target is garbage collected
   */
  public createSafeEventListener(
    target: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): () => void {
    // Add listener
    target.addEventListener(type, listener, options);
    
    // Create weak references
    const targetRef = new WeakRef(target);
    const listenerRef = typeof listener === 'function' 
      ? new WeakRef(listener)
      : new WeakRef(listener.handleEvent.bind(listener));
    
    // Create cleanup function
    const cleanup = () => {
      const targetObj = targetRef.deref();
      const listenerObj = listenerRef.deref();
      
      if (targetObj && listenerObj) {
        try {
          targetObj.removeEventListener(type, listener, options);
        } catch (error) {
          // Ignore errors during cleanup
        }
      }
    };
    
    // Register for auto cleanup
    const registry = new FinalizationRegistry(() => {
      cleanup();
    });
    
    // Register both target and listener so cleanup happens when either is collected
    registry.register(target, `${type}-target`, { target, listener });
    
    if (typeof listener === 'object') {
      registry.register(listener, `${type}-listener`, { target, listener });
    }
    
    // Return manual cleanup function
    return cleanup;
  }
}