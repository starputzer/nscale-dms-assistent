import { deepDiff, applyDiff, DiffOperation, DiffOperationType } from './DeepDiff';
import { StateManager as BaseStateManager } from '../types';
import { createLogger } from '../logger/index';
// import { debounce } from 'lodash-es';

/**
 * OptimizedStateManager extends the base StateManager with selective synchronization
 * using the DeepDiff algorithm to minimize state updates and improve performance.
 */
export class OptimizedStateManager implements BaseStateManager {
  private lastSyncedState: Record<string, any> = {};
  private pendingUpdates: Map<string, DiffOperation[]> = new Map();
  private updateTimers: Map<string, number> = new Map();
  private updateIntervals: Map<string, number> = new Map();
  private defaultDebounceMs = 50;

  // Internal state for StateManager interface
  private vueStores: Record<string, any> = {};
  private legacyState: Record<string, any> = {};
  private subscribers: Map<string, Array<(value: any, oldValue: any) => void>> = new Map();
  private isConnected = false;

  // Logger for this component
  private logger = createLogger('OptimizedStateManager');

  /**
   * Connect this state manager to Vue stores and legacy state
   */
  public connect(vueStores: Record<string, any>, legacyState: Record<string, any>): void {
    this.vueStores = vueStores;
    this.legacyState = legacyState;
    this.isConnected = true;
    this.logger.info('StateManager connected');
  }

  /**
   * Disconnect this state manager
   */
  public disconnect(): void {
    this.isConnected = false;
    this.logger.info('StateManager disconnected');
  }

  /**
   * Get state value at a path
   */
  public getState(path: string): any {
    // Simple implementation - in a real implementation would traverse objects
    return this.lastSyncedState[path] || null;
  }

  /**
   * Set state value at a path
   */
  public setState(path: string, value: any, source?: "legacy" | "vue"): boolean {
    try {
      // Use our syncState method instead
      this.syncState(path, value, source === 'legacy');
      return true;
    } catch (error) {
      this.logger.error(`Error setting state for ${path}:`, error);
      return false;
    }
  }

  /**
   * Subscribe to state changes
   */
  public subscribe(path: string, callback: (value: any, oldValue: any) => void): () => void {
    if (!this.subscribers.has(path)) {
      this.subscribers.set(path, []);
    }

    this.subscribers.get(path)!.push(callback);

    return () => {
      const callbacks = this.subscribers.get(path);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index !== -1) {
          callbacks.splice(index, 1);
        }
        if (callbacks.length === 0) {
          this.subscribers.delete(path);
        }
      }
    };
  }

  /**
   * Check if the state manager is healthy
   */
  public isHealthy(): boolean {
    return this.isConnected;
  }

  /**
   * Get diagnostics information
   */
  public getDiagnostics(): any {
    return {
      isConnected: this.isConnected,
      subscriberCount: Array.from(this.subscribers.values()).reduce((count, callbacks) => count + callbacks.length, 0),
      stateKeys: Object.keys(this.lastSyncedState),
      pendingUpdates: Array.from(this.pendingUpdates.keys()),
      updateIntervals: Array.from(this.updateIntervals.entries())
    };
  }

  /**
   * Notify subscribers of state changes
   * @param stateKey The state key that changed
   * @param newValue The new state value
   * @param oldValue The previous state value
   */
  private notifySubscribers(stateKey: string, newValue: any, oldValue: any): void {
    if (!this.subscribers.has(stateKey)) return;

    const callbacks = this.subscribers.get(stateKey);
    if (!callbacks) return;

    callbacks.forEach(callback => {
      try {
        callback(newValue, oldValue);
      } catch (error) {
        this.logger.error(`Error in state subscriber for ${stateKey}:`, error);
      }
    });
  }
  
  /**
   * Set update interval for a specific state slice
   * @param stateKey The state slice identifier
   * @param intervalMs Milliseconds to debounce updates (0 for immediate)
   */
  public setUpdateInterval(stateKey: string, intervalMs: number): void {
    this.updateIntervals.set(stateKey, intervalMs);
    this.logger.debug(`Set update interval for ${stateKey} to ${intervalMs}ms`);
  }

  /**
   * Syncs a state slice with optimized diffing
   * @param stateKey Identifier for the state slice
   * @param newState The updated state to sync
   * @param immediate Forces immediate sync without debouncing
   */
  public syncState(stateKey: string, newState: any, immediate = false): void {
    if (!this.lastSyncedState[stateKey]) {
      // First sync for this state slice, store and perform full sync
      this.lastSyncedState[stateKey] = JSON.parse(JSON.stringify(newState));
      this.notifySubscribers(stateKey, newState, null);
      this.logger.debug(`Initial full sync for ${stateKey}`);
      return;
    }

    // Calculate diff between last synced state and new state
    const stateDiff = deepDiff(this.lastSyncedState[stateKey], newState);
    
    if (stateDiff.length === 0) {
      this.logger.debug(`No changes detected for ${stateKey}, skipping sync`);
      return; // No changes, skip sync
    }

    // Store pending updates
    this.pendingUpdates.set(stateKey, stateDiff);
    
    // Process immediately or schedule debounced update
    if (immediate) {
      this.processPendingUpdates(stateKey);
    } else {
      const intervalMs = this.updateIntervals.get(stateKey) || this.defaultDebounceMs;
      this.scheduleUpdate(stateKey, intervalMs);
    }
  }

  /**
   * Schedule a debounced update for a state slice
   */
  private scheduleUpdate(stateKey: string, intervalMs: number): void {
    // Clear any existing timer
    if (this.updateTimers.has(stateKey)) {
      window.clearTimeout(this.updateTimers.get(stateKey));
    }
    
    // Set new timer
    const timerId = window.setTimeout(() => {
      this.processPendingUpdates(stateKey);
    }, intervalMs);
    
    this.updateTimers.set(stateKey, timerId);
  }

  /**
   * Process accumulated updates for a state slice
   */
  private processPendingUpdates(stateKey: string): void {
    if (!this.pendingUpdates.has(stateKey)) return;
    
    const operations = this.pendingUpdates.get(stateKey) || [];
    
    if (operations.length === 0) return;
    
    // Apply diff operations to last synced state to get new state
    const updatedState = applyDiff(
      JSON.parse(JSON.stringify(this.lastSyncedState[stateKey])), 
      operations
    );
    
    // Notify subscribers with the updated state
    this.notifySubscribers(stateKey, updatedState, JSON.parse(JSON.stringify(this.lastSyncedState[stateKey])));
    
    // Update last synced state
    this.lastSyncedState[stateKey] = updatedState;
    
    // Clear pending updates
    this.pendingUpdates.delete(stateKey);

    this.logger.debug(`Processed ${operations.length} diff operations for ${stateKey}`);
  }

  /**
   * Force sync all pending state updates immediately
   */
  public flushPendingUpdates(): void {
    // Use Array.from to avoid compatibility issues with Map iterators
    Array.from(this.pendingUpdates.keys()).forEach(stateKey => {
      this.processPendingUpdates(stateKey);
    });
    this.logger.debug('Flushed all pending state updates');
  }

  /**
   * Clear all stored state and pending updates
   */
  public reset(): void {
    this.lastSyncedState = {};
    this.pendingUpdates.clear();
    
    // Clear all update timers
    // Use Array.from to avoid compatibility issues with Map iterators
    Array.from(this.updateTimers.values()).forEach(timerId => {
      window.clearTimeout(timerId);
    });
    this.updateTimers.clear();

    this.logger.debug('OptimizedStateManager reset complete');
  }
}

/**
 * Create a debounced state manager for high-frequency updates
 * @param debounceTime Default debounce time in milliseconds
 */
export function createDebouncedStateManager(debounceTime = 50): OptimizedStateManager {
  const manager = new OptimizedStateManager();
  manager['defaultDebounceMs'] = debounceTime;
  return manager;
}