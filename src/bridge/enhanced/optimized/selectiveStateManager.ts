/**
 * SelectiveStateManager - Optimized state synchronization for large data volumes
 * 
 * This component provides efficient state synchronization between Vue and legacy components
 * with special optimizations for handling large data sets.
 */

import { watch } from 'vue';
import { 
  StateManager, 
  BridgeLogger, 
  UpdateOperation, 
  BridgeErrorState
} from '../types';
import { BridgeStatusManager } from '../statusManager';
import { deepCompare, createPathMatcher, debounce } from './utils';

/**
 * Configuration for SelectiveStateManager
 */
export interface SelectiveStateManagerConfig {
  // Maximum depth for automatic deep watching
  maxWatchDepth: number;
  
  // Debounce time for batching state updates (ms)
  updateDebounceTime: number;
  
  // Paths that should be excluded from deep watching (uses glob-like patterns)
  excludePaths: string[];
  
  // Paths that should always be synchronized, even if they might be large
  alwaysSyncPaths: string[];
  
  // Maximum collection size to consider for full synchronization
  // Collections larger than this will use selective sync
  largeCollectionThreshold: number;
  
  // Strategy for synchronizing large arrays
  // 'reference' - sync only if reference changed
  // 'id' - sync based on id field changes
  // 'full' - always do full sync
  largeArrayStrategy: 'reference' | 'id' | 'full';
  
  // Field name to use as ID for array items when using 'id' strategy
  arrayItemIdField: string;
  
  // Enable schema validation for synchronized state
  enableSchemaValidation: boolean;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: SelectiveStateManagerConfig = {
  maxWatchDepth: 3,
  updateDebounceTime: 50,
  excludePaths: [
    '*.messages.*',
    '*.history',
    '*.items.[*]',
    '*.logs',
    '*.sessions.[*].messages'
  ],
  alwaysSyncPaths: [
    'auth.user',
    'auth.token',
    'ui.theme',
    'features.toggles'
  ],
  largeCollectionThreshold: 50,
  largeArrayStrategy: 'id',
  arrayItemIdField: 'id',
  enableSchemaValidation: false
};

/**
 * Implementation of the optimized SelectiveStateManager
 */
export class SelectiveStateManager implements StateManager {
  private vueStores: Record<string, any> = {};
  private legacyState: Record<string, any> = {};
  private logger: BridgeLogger;
  private statusManager: BridgeStatusManager;
  private config: SelectiveStateManagerConfig;
  
  // Watches and cleanup
  private watchers: Array<() => void> = [];
  private excludeMatchers: Array<(path: string) => boolean> = [];
  private alwaysSyncMatchers: Array<(path: string) => boolean> = [];
  private subscribers: Map<string, Array<(value: any, oldValue: any) => void>> = new Map();
  private healthStatus: boolean = true;
  
  // Sync state
  private pendingUpdates: Map<string, UpdateOperation> = new Map();
  private syncInProgress: boolean = false;
  private lastSyncTime: number = 0;
  private batchUpdateCount: number = 0;
  private totalSkippedUpdates: number = 0;
  private lastValueCache: Map<string, any> = new Map();
  
  // Schema validators (lazy loaded if enabled)
  private schemaValidators: Map<string, (value: any) => boolean> = new Map();
  
  constructor(
    logger: BridgeLogger, 
    statusManager: BridgeStatusManager,
    config: Partial<SelectiveStateManagerConfig> = {}
  ) {
    this.logger = logger;
    this.statusManager = statusManager;
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Compile path matchers
    this.excludeMatchers = this.config.excludePaths.map(createPathMatcher);
    this.alwaysSyncMatchers = this.config.alwaysSyncPaths.map(createPathMatcher);
    
    this.logger.info('SelectiveStateManager initialized with configuration', this.config);
  }
  
  /**
   * Connect Vue stores with legacy state
   */
  connect(vueStores: Record<string, any>, legacyState: Record<string, any>): void {
    this.logger.info('Connecting Vue stores with legacy state');
    
    this.vueStores = vueStores;
    this.legacyState = legacyState;
    
    // Clean up existing watchers
    this.disconnect();
    
    // Setup deep watching for Vue stores with selective sync
    for (const storeKey in vueStores) {
      const store = vueStores[storeKey];
      
      // Handle Pinia stores differently
      const isPiniaStore = !!store.$state;
      const storeObj = isPiniaStore ? store.$state : store;
      
      this.setupSelectiveWatchers(
        storeObj, 
        storeKey, 
        'vue', 
        0
      );
    }
    
    // Setup reactive proxies for legacy state
    try {
      for (const stateKey in legacyState) {
        const proxy = this.createSelectiveReactiveProxy(legacyState[stateKey], stateKey);
        legacyState[stateKey] = proxy;
      }
      
      this.logger.info('Selective state watching initialized');
    } catch (error) {
      this.logger.error('Error setting up legacy state watching', error);
      this.healthStatus = false;
    }
    
    // Setup debounced batch update processor
    const processBatchedUpdates = debounce(() => {
      this.processPendingUpdates();
    }, this.config.updateDebounceTime);
    
    // Add to watchers for cleanup
    this.watchers.push(() => {
      processBatchedUpdates.cancel();
    });
  }
  
  /**
   * Disconnect and clean up watchers
   */
  disconnect(): void {
    this.watchers.forEach(unwatch => unwatch());
    this.watchers = [];
    this.subscribers.clear();
    this.pendingUpdates.clear();
    this.lastValueCache.clear();
    this.logger.info('StateManager disconnected');
  }
  
  /**
   * Setup selective watchers for an object
   */
  private setupSelectiveWatchers(
    obj: any, 
    path: string, 
    source: 'vue' | 'legacy',
    depth: number
  ): void {
    // Skip if not an object
    if (typeof obj !== 'object' || obj === null) {
      return;
    }
    
    // Skip if excluded path (unless it's an always-sync path)
    const isExcluded = this.excludeMatchers.some(matcher => matcher(path));
    const isAlwaysSync = this.alwaysSyncMatchers.some(matcher => matcher(path));
    
    if (isExcluded && !isAlwaysSync) {
      // Set up watching at the high level but don't go deeper
      const watcher = watch(
        () => obj,
        (newValue) => {
          this.queueUpdate({
            path,
            value: newValue,
            timestamp: Date.now(),
            source
          });
        },
        { deep: false }
      );
      
      this.watchers.push(watcher);
      return;
    }
    
    // Watch the object itself for replacement
    const objWatcher = watch(
      () => obj,
      (newValue, oldValue) => {
        if (newValue !== oldValue) {
          this.queueUpdate({
            path,
            value: newValue,
            timestamp: Date.now(),
            source
          });
        }
      },
      { deep: false }
    );
    
    this.watchers.push(objWatcher);
    
    // Don't go deeper if we've reached max depth
    if (depth >= this.config.maxWatchDepth) {
      const deepWatcher = watch(
        () => obj,
        (newValue) => {
          this.queueUpdate({
            path,
            value: newValue,
            timestamp: Date.now(),
            source
          });
        },
        { deep: true }
      );
      
      this.watchers.push(deepWatcher);
      return;
    }
    
    // For all properties of the object
    for (const key in obj) {
      // Skip Vue internal properties
      if (key.startsWith('__v_') || key === '__proto__') {
        continue;
      }
      
      const currentPath = path ? `${path}.${key}` : key;
      const value = obj[key];
      
      // Special handling for arrays
      if (Array.isArray(value)) {
        this.setupArrayWatcher(value, currentPath, source, depth);
        continue;
      }
      
      // Recursively watch nested objects
      if (typeof value === 'object' && value !== null) {
        this.setupSelectiveWatchers(value, currentPath, source, depth + 1);
      }
      
      // Watch this specific property
      try {
        const propWatcher = watch(
          () => obj[key],
          (newVal, oldVal) => {
            // Skip if identical by deep comparison
            if (deepCompare(newVal, oldVal)) {
              return;
            }
            
            this.queueUpdate({
              path: currentPath,
              value: newVal,
              timestamp: Date.now(),
              source
            });
          }
        );
        
        this.watchers.push(propWatcher);
      } catch (error) {
        this.logger.warn(`Could not set up watcher for ${currentPath}`, error);
      }
    }
  }
  
  /**
   * Set up specialized watcher for arrays
   */
  private setupArrayWatcher(
    array: any[], 
    path: string, 
    source: 'vue' | 'legacy',
    depth: number
  ): void {
    // Choose strategy based on array size and config
    const isLargeArray = array.length > this.config.largeCollectionThreshold;
    const strategy = isLargeArray ? this.config.largeArrayStrategy : 'full';
    
    switch (strategy) {
      case 'reference':
        // Just watch for array reference changes
        const refWatcher = watch(
          () => array,
          (newArray, oldArray) => {
            if (newArray !== oldArray) {
              this.queueUpdate({
                path,
                value: newArray,
                timestamp: Date.now(),
                source
              });
            }
          },
          { deep: false }
        );
        
        this.watchers.push(refWatcher);
        break;
        
      case 'id':
        // Watch for changes to the array based on item IDs
        const idField = this.config.arrayItemIdField;
        
        // Watch the array for structural changes
        const structureWatcher = watch(
          () => array.map(item => item?.[idField]),
          (newIds, oldIds) => {
            // If array structure changed, queue update
            if (!deepCompare(newIds, oldIds)) {
              this.queueUpdate({
                path,
                value: array,
                timestamp: Date.now(),
                source
              });
            }
          }
        );
        
        this.watchers.push(structureWatcher);
        
        // Watch individual items if not too deep
        if (depth < this.config.maxWatchDepth) {
          for (let i = 0; i < array.length; i++) {
            if (typeof array[i] === 'object' && array[i] !== null) {
              const itemPath = `${path}.[${i}]`;
              this.setupSelectiveWatchers(array[i], itemPath, source, depth + 1);
            }
          }
        }
        break;
        
      case 'full':
      default:
        // Full deep watching for the array
        const fullWatcher = watch(
          () => array,
          (newArray) => {
            this.queueUpdate({
              path,
              value: newArray,
              timestamp: Date.now(),
              source
            });
          },
          { deep: true }
        );
        
        this.watchers.push(fullWatcher);
        break;
    }
  }
  
  /**
   * Create a reactive proxy for legacy state objects
   */
  private createSelectiveReactiveProxy(obj: any, path: string): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }
    
    const self = this;
    
    // For arrays, create a special array proxy
    if (Array.isArray(obj)) {
      return new Proxy(obj, {
        get(target, prop: string | symbol) {
          const value = target[prop as any];
          
          // Handle array methods that modify the array
          if (typeof prop === 'string' && 
              ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'].includes(prop)) {
            return function(...args: any[]) {
              const result = Array.prototype[prop as any].apply(target, args);
              
              // Signal that the array was modified
              self.queueUpdate({
                path,
                value: target,
                timestamp: Date.now(),
                source: 'legacy'
              });
              
              return result;
            };
          }
          
          // For numeric indices or non-method properties, proxy nested objects
          if (typeof value === 'object' && value !== null) {
            const propPath = typeof prop === 'symbol' 
              ? path 
              : `${path}.[${prop}]`;
            return self.createSelectiveReactiveProxy(value, propPath);
          }
          
          return value;
        },
        
        set(target, prop: string | symbol, value) {
          const oldValue = target[prop as any];
          target[prop as any] = value;
          
          // Only report change if value actually changed
          if (!deepCompare(oldValue, value)) {
            const propPath = typeof prop === 'symbol' 
              ? path 
              : `${path}.[${prop}]`;
            
            self.queueUpdate({
              path: propPath,
              value,
              timestamp: Date.now(),
              source: 'legacy'
            });
          }
          
          return true;
        }
      });
    }
    
    // For regular objects
    return new Proxy(obj, {
      get(target, prop: string | symbol) {
        const value = target[prop as any];
        
        if (typeof value === 'object' && value !== null) {
          const propPath = typeof prop === 'symbol' 
            ? path 
            : `${path}.${prop.toString()}`;
          return self.createSelectiveReactiveProxy(value, propPath);
        }
        
        return value;
      },
      
      set(target, prop: string | symbol, value) {
        const oldValue = target[prop as any];
        target[prop as any] = value;
        
        // Only report change if value actually changed
        if (!deepCompare(oldValue, value)) {
          const propPath = typeof prop === 'symbol' 
            ? path 
            : `${path}.${prop.toString()}`;
          
          self.queueUpdate({
            path: propPath,
            value,
            timestamp: Date.now(),
            source: 'legacy'
          });
        }
        
        return true;
      }
    });
  }
  
  /**
   * Queue a state update for batched processing
   */
  private queueUpdate(operation: UpdateOperation): void {
    // Skip updates for excluded paths (unless it's an always-sync path)
    const isExcluded = this.excludeMatchers.some(matcher => matcher(operation.path));
    const isAlwaysSync = this.alwaysSyncMatchers.some(matcher => matcher(operation.path));
    
    if (isExcluded && !isAlwaysSync) {
      this.totalSkippedUpdates++;
      return;
    }
    
    // Skip if value hasn't actually changed
    const lastValue = this.lastValueCache.get(operation.path);
    if (lastValue && deepCompare(lastValue, operation.value)) {
      this.totalSkippedUpdates++;
      return;
    }
    
    // Update the last value cache
    this.lastValueCache.set(operation.path, operation.value);
    
    // Store in pending updates, newest operation wins for same path
    this.pendingUpdates.set(operation.path, operation);
    
    // Trigger debounced processing
    this.triggerUpdateProcessing();
  }
  
  /**
   * Trigger the processing of pending updates
   */
  private triggerUpdateProcessing(): void {
    setTimeout(() => {
      this.processPendingUpdates();
    }, 0);
  }
  
  /**
   * Process all pending updates
   */
  private processPendingUpdates(): void {
    if (this.syncInProgress || this.pendingUpdates.size === 0) {
      return;
    }
    
    this.syncInProgress = true;
    this.batchUpdateCount++;
    
    try {
      // Get all pending operations
      const operations = Array.from(this.pendingUpdates.values())
        // Sort by timestamp
        .sort((a, b) => a.timestamp - b.timestamp);
      
      // Clear pending updates
      this.pendingUpdates.clear();
      
      // Process each operation
      let successCount = 0;
      for (const operation of operations) {
        const success = this.processUpdate(operation);
        if (success) successCount++;
      }
      
      // Log batch stats
      this.logger.debug(`Processed ${successCount}/${operations.length} state updates in batch #${this.batchUpdateCount}`);
      
      // Update metrics
      this.lastSyncTime = Date.now();
    } catch (error) {
      this.logger.error('Error processing state updates', error);
      this.healthStatus = false;
      this.statusManager.updateStatus({
        state: BridgeErrorState.SYNC_ERROR,
        message: 'Error during state synchronization',
        affectedComponents: ['SelectiveStateManager']
      });
    } finally {
      this.syncInProgress = false;
      
      // Process any updates that came in while we were syncing
      if (this.pendingUpdates.size > 0) {
        this.triggerUpdateProcessing();
      }
    }
  }
  
  /**
   * Process a single update operation
   */
  private processUpdate(operation: UpdateOperation): boolean {
    try {
      // Validate schema if enabled
      if (this.config.enableSchemaValidation) {
        const isValid = this.validateSchema(operation.path, operation.value);
        if (!isValid) {
          this.logger.warn(`Schema validation failed for ${operation.path}`, operation.value);
          return false;
        }
      }
      
      // Update the appropriate side
      if (operation.source === 'vue') {
        this.updateLegacyState(operation.path, operation.value);
      } else {
        this.updateVueStore(operation.path, operation.value);
      }
      
      // Notify subscribers
      this.notifySubscribers(operation.path, operation.value);
      
      return true;
    } catch (error) {
      this.logger.error(`Error processing update for ${operation.path}`, error);
      return false;
    }
  }
  
  /**
   * Validate a value against its schema
   */
  private validateSchema(path: string, value: any): boolean {
    // Skip validation if not enabled
    if (!this.config.enableSchemaValidation) {
      return true;
    }
    
    // Try to get validator for this path
    const validator = this.schemaValidators.get(path);
    if (!validator) {
      // No validator for this path, consider valid
      return true;
    }
    
    try {
      return validator(value);
    } catch (error) {
      this.logger.error(`Schema validation error for ${path}`, error);
      return false;
    }
  }
  
  /**
   * Update legacy state based on Vue store changes
   */
  private updateLegacyState(path: string, value: any): void {
    try {
      const pathParts = path.split('.');
      const storeKey = pathParts[0];
      
      if (pathParts.length === 1) {
        // Direct update of the main state object
        this.legacyState[storeKey] = value;
        return;
      }
      
      // Handle array indices in path
      let current = this.legacyState;
      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i];
        
        // Check if this is an array index
        const arrayMatch = part.match(/\[(\d+)\]$/);
        if (arrayMatch) {
          // Extract array name and index
          const arrayName = part.substring(0, part.indexOf('['));
          const index = parseInt(arrayMatch[1]);
          
          // Make sure the array exists
          if (!current[arrayName]) {
            current[arrayName] = [];
          }
          
          // Make sure the array is long enough
          while (current[arrayName].length <= index) {
            current[arrayName].push(null);
          }
          
          current = current[arrayName][index];
        } else {
          // Regular object property
          if (current[part] === undefined) {
            current[part] = {};
          }
          current = current[part];
        }
      }
      
      // Set the final property
      const lastPart = pathParts[pathParts.length - 1];
      
      // Check if this is an array index
      const arrayMatch = lastPart.match(/\[(\d+)\]$/);
      if (arrayMatch) {
        // Extract array name and index
        const arrayName = lastPart.substring(0, lastPart.indexOf('['));
        const index = parseInt(arrayMatch[1]);
        
        // Make sure the array exists
        if (!current[arrayName]) {
          current[arrayName] = [];
        }
        
        // Make sure the array is long enough
        while (current[arrayName].length <= index) {
          current[arrayName].push(null);
        }
        
        current[arrayName][index] = value;
      } else {
        // Regular property
        current[lastPart] = value;
      }
      
      this.logger.debug('Updated legacy state', { path, value });
    } catch (error) {
      this.logger.error('Error updating legacy state', { path, error });
      this.healthStatus = false;
    }
  }
  
  /**
   * Update Vue store based on legacy state changes
   */
  private updateVueStore(path: string, value: any): void {
    try {
      const pathParts = path.split('.');
      const storeKey = pathParts[0];
      
      if (!this.vueStores[storeKey]) {
        this.logger.warn(`Store ${storeKey} not found`);
        return;
      }
      
      if (pathParts.length === 1) {
        // Direct update of the entire store not supported
        this.logger.warn('Direct update of the entire store not supported');
        return;
      }
      
      // For Pinia stores, we need to go through their $state API
      if (this.vueStores[storeKey].$state) {
        // Pinia store
        let current = this.vueStores[storeKey].$state;
        let path = pathParts.slice(1); // Remove store name
        
        // Handle array indices in path
        for (let i = 0; i < path.length - 1; i++) {
          const part = path[i];
          
          // Check if this is an array index
          const arrayMatch = part.match(/\[(\d+)\]$/);
          if (arrayMatch) {
            // Extract array name and index
            const arrayName = part.substring(0, part.indexOf('['));
            const index = parseInt(arrayMatch[1]);
            
            // Make sure the array exists
            if (!current[arrayName]) {
              current[arrayName] = [];
            }
            
            // Make sure the array is long enough
            while (current[arrayName].length <= index) {
              current[arrayName].push(null);
            }
            
            current = current[arrayName][index];
          } else {
            // Regular object property
            if (current[part] === undefined) {
              current[part] = {};
            }
            current = current[part];
          }
        }
        
        // Set the final property
        const lastPart = path[path.length - 1];
        
        // Check if this is an array index
        const arrayMatch = lastPart.match(/\[(\d+)\]$/);
        if (arrayMatch) {
          // Extract array name and index
          const arrayName = lastPart.substring(0, lastPart.indexOf('['));
          const index = parseInt(arrayMatch[1]);
          
          // Make sure the array exists
          if (!current[arrayName]) {
            current[arrayName] = [];
          }
          
          // Make sure the array is long enough
          while (current[arrayName].length <= index) {
            current[arrayName].push(null);
          }
          
          current[arrayName][index] = value;
        } else {
          // Regular property
          current[lastPart] = value;
        }
      } else {
        // Standard object, direct update
        let current = this.vueStores[storeKey];
        let path = pathParts.slice(1); // Remove store name
        
        // Same logic as Pinia but with direct object
        // ... [same array handling code as above]
        for (let i = 0; i < path.length - 1; i++) {
          const part = path[i];
          
          // Check if this is an array index
          const arrayMatch = part.match(/\[(\d+)\]$/);
          if (arrayMatch) {
            // Extract array name and index
            const arrayName = part.substring(0, part.indexOf('['));
            const index = parseInt(arrayMatch[1]);
            
            // Make sure the array exists
            if (!current[arrayName]) {
              current[arrayName] = [];
            }
            
            // Make sure the array is long enough
            while (current[arrayName].length <= index) {
              current[arrayName].push(null);
            }
            
            current = current[arrayName][index];
          } else {
            // Regular object property
            if (current[part] === undefined) {
              current[part] = {};
            }
            current = current[part];
          }
        }
        
        // Set the final property
        const lastPart = path[path.length - 1];
        
        // Check if this is an array index
        const arrayMatch = lastPart.match(/\[(\d+)\]$/);
        if (arrayMatch) {
          // Extract array name and index
          const arrayName = lastPart.substring(0, lastPart.indexOf('['));
          const index = parseInt(arrayMatch[1]);
          
          // Make sure the array exists
          if (!current[arrayName]) {
            current[arrayName] = [];
          }
          
          // Make sure the array is long enough
          while (current[arrayName].length <= index) {
            current[arrayName].push(null);
          }
          
          current[arrayName][index] = value;
        } else {
          // Regular property
          current[lastPart] = value;
        }
      }
      
      this.logger.debug('Updated Vue store', { path, value });
    } catch (error) {
      this.logger.error('Error updating Vue store', { path, error });
      this.healthStatus = false;
    }
  }
  
  /**
   * Notify subscribers about state changes
   */
  private notifySubscribers(path: string, value: any): void {
    // Exact path subscribers
    if (this.subscribers.has(path)) {
      this.subscribers.get(path)!.forEach(callback => {
        try {
          callback(value, undefined);
        } catch (error) {
          this.logger.error('Error in subscriber callback', { path, error });
        }
      });
    }
    
    // Path prefix subscribers (for parent objects)
    for (const subscribedPath of this.subscribers.keys()) {
      if (path.startsWith(subscribedPath + '.')) {
        const subValue = this.getState(subscribedPath);
        this.subscribers.get(subscribedPath)!.forEach(callback => {
          try {
            callback(subValue, undefined);
          } catch (error) {
            this.logger.error('Error in parent subscriber callback', {
              subscribedPath,
              changedPath: path,
              error
            });
          }
        });
      }
    }
  }
  
  /**
   * Get state at specified path
   */
  getState(path: string): any {
    try {
      const pathParts = path.split('.');
      const storeKey = pathParts[0];
      
      // First try Vue stores
      if (this.vueStores[storeKey]) {
        if (pathParts.length === 1) {
          return this.vueStores[storeKey];
        }
        
        let current = this.vueStores[storeKey];
        
        // For Pinia stores: access through $state for state data
        if (current.$state && pathParts.length > 1) {
          current = current.$state;
          
          // Navigate nested properties
          for (let i = 1; i < pathParts.length; i++) {
            const part = pathParts[i];
            
            // Handle array indices
            const arrayMatch = part.match(/\[(\d+)\]$/);
            if (arrayMatch) {
              const arrayName = part.substring(0, part.indexOf('['));
              const index = parseInt(arrayMatch[1]);
              
              if (!current[arrayName] || !current[arrayName][index]) {
                return undefined;
              }
              
              current = current[arrayName][index];
            } else {
              // Standard property access
              if (current === undefined) return undefined;
              current = current[part];
            }
          }
          
          return current;
        }
        
        // Standard property access for non-Pinia stores
        for (let i = 1; i < pathParts.length; i++) {
          const part = pathParts[i];
          
          // Handle array indices
          const arrayMatch = part.match(/\[(\d+)\]$/);
          if (arrayMatch) {
            const arrayName = part.substring(0, part.indexOf('['));
            const index = parseInt(arrayMatch[1]);
            
            if (!current[arrayName] || !current[arrayName][index]) {
              return undefined;
            }
            
            current = current[arrayName][index];
          } else {
            // Standard property access
            if (current === undefined) return undefined;
            current = current[part];
          }
        }
        
        return current;
      }
      
      // Then try legacy state
      if (this.legacyState[storeKey]) {
        if (pathParts.length === 1) {
          return this.legacyState[storeKey];
        }
        
        let current = this.legacyState[storeKey];
        
        // Navigate nested properties
        for (let i = 1; i < pathParts.length; i++) {
          const part = pathParts[i];
          
          // Handle array indices
          const arrayMatch = part.match(/\[(\d+)\]$/);
          if (arrayMatch) {
            const arrayName = part.substring(0, part.indexOf('['));
            const index = parseInt(arrayMatch[1]);
            
            if (!current[arrayName] || !current[arrayName][index]) {
              return undefined;
            }
            
            current = current[arrayName][index];
          } else {
            // Standard property access
            if (current === undefined) return undefined;
            current = current[part];
          }
        }
        
        return current;
      }
      
      return undefined;
    } catch (error) {
      this.logger.error('Error getting state', { path, error });
      return undefined;
    }
  }
  
  /**
   * Set state at specified path
   */
  setState(path: string, value: any, source: 'legacy' | 'vue' = 'vue'): boolean {
    try {
      this.queueUpdate({
        path,
        value,
        timestamp: Date.now(),
        source
      });
      
      return true;
    } catch (error) {
      this.logger.error('Error setting state', { path, value, error });
      this.healthStatus = false;
      return false;
    }
  }
  
  /**
   * Subscribe to state changes at a specific path
   */
  subscribe(path: string, callback: (value: any, oldValue: any) => void): () => void {
    if (!this.subscribers.has(path)) {
      this.subscribers.set(path, []);
    }
    
    this.subscribers.get(path)!.push(callback);
    this.logger.debug(`New subscriber for path: ${path}`);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(path);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index !== -1) {
          callbacks.splice(index, 1);
          this.logger.debug(`Subscriber removed for path: ${path}`);
        }
        
        if (callbacks.length === 0) {
          this.subscribers.delete(path);
        }
      }
    };
  }
  
  /**
   * Check if state manager is healthy
   */
  isHealthy(): boolean {
    return this.healthStatus;
  }
  
  /**
   * Reset the state manager
   */
  reset(): void {
    this.healthStatus = true;
    this.disconnect();
    
    // Reconnect if stores are available
    if (Object.keys(this.vueStores).length > 0 && Object.keys(this.legacyState).length > 0) {
      this.connect(this.vueStores, this.legacyState);
    }
    
    this.logger.info('SelectiveStateManager reset');
  }
  
  /**
   * Get diagnostic information
   */
  getDiagnostics(): any {
    return {
      health: this.healthStatus,
      storeCount: Object.keys(this.vueStores).length,
      legacyStateCount: Object.keys(this.legacyState).length,
      watcherCount: this.watchers.length,
      subscriberCount: Array.from(this.subscribers.entries())
        .reduce((sum, [path, callbacks]) => sum + callbacks.length, 0),
      subscribedPaths: Array.from(this.subscribers.keys()),
      pendingUpdateCount: this.pendingUpdates.size,
      batchUpdateCount: this.batchUpdateCount,
      skippedUpdateCount: this.totalSkippedUpdates,
      lastSyncTime: this.lastSyncTime ? new Date(this.lastSyncTime).toISOString() : null,
      cacheSize: this.lastValueCache.size,
      config: this.config
    };
  }
}