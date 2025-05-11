import { deepDiff, applyDiff, DiffOperation, DiffOperationType } from './DeepDiff';
import { StateManager } from '../stateManager';
import { logger } from '../logger';
import { debounce } from 'lodash-es';

/**
 * OptimizedStateManager extends the base StateManager with selective synchronization
 * using the DeepDiff algorithm to minimize state updates and improve performance.
 */
export class OptimizedStateManager extends StateManager {
  private lastSyncedState: Record<string, any> = {};
  private pendingUpdates: Map<string, DiffOperation[]> = new Map();
  private updateTimers: Map<string, number> = new Map();
  private updateIntervals: Map<string, number> = new Map();
  private defaultDebounceMs = 50;
  
  /**
   * Set update interval for a specific state slice
   * @param stateKey The state slice identifier
   * @param intervalMs Milliseconds to debounce updates (0 for immediate)
   */
  public setUpdateInterval(stateKey: string, intervalMs: number): void {
    this.updateIntervals.set(stateKey, intervalMs);
    logger.debug(`Set update interval for ${stateKey} to ${intervalMs}ms`);
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
      super.syncState(stateKey, newState);
      logger.debug(`Initial full sync for ${stateKey}`);
      return;
    }

    // Calculate diff between last synced state and new state
    const stateDiff = deepDiff(this.lastSyncedState[stateKey], newState);
    
    if (stateDiff.length === 0) {
      logger.debug(`No changes detected for ${stateKey}, skipping sync`);
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
    
    // Call parent implementation with the updated state
    super.syncState(stateKey, updatedState);
    
    // Update last synced state
    this.lastSyncedState[stateKey] = updatedState;
    
    // Clear pending updates
    this.pendingUpdates.delete(stateKey);
    
    logger.debug(`Processed ${operations.length} diff operations for ${stateKey}`);
  }

  /**
   * Force sync all pending state updates immediately
   */
  public flushPendingUpdates(): void {
    for (const stateKey of this.pendingUpdates.keys()) {
      this.processPendingUpdates(stateKey);
    }
    logger.debug('Flushed all pending state updates');
  }

  /**
   * Clear all stored state and pending updates
   */
  public reset(): void {
    super.reset();
    this.lastSyncedState = {};
    this.pendingUpdates.clear();
    
    // Clear all update timers
    for (const timerId of this.updateTimers.values()) {
      window.clearTimeout(timerId);
    }
    this.updateTimers.clear();
    
    logger.debug('OptimizedStateManager reset complete');
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