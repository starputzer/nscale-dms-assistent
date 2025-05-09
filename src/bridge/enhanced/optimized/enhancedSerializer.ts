/**
 * EnhancedSerializer - Optimized serialization for complex objects
 * 
 * This component provides efficient serialization and deserialization of complex objects
 * with caching, differential updates, and structure sharing.
 */

import { BridgeLogger } from '../types';
import { deepCompare } from './utils';

/**
 * Configuration for EnhancedSerializer
 */
export interface EnhancedSerializerConfig {
  // Maximum cache size
  maxCacheSize: number;
  
  // LRU (Least Recently Used) or LFU (Least Frequently Used) cache strategy
  cacheStrategy: 'LRU' | 'LFU';
  
  // Serialization options
  serializationOptions: {
    // Whether to enable structural sharing during serialization
    enableStructuralSharing: boolean;
    
    // Whether to preserve circular references
    preserveCircularReferences: boolean;
    
    // Whether to include type information for better deserialization
    includeTypeInformation: boolean;
    
    // Custom type handlers for non-standard types
    customTypeHandlers: {
      [typeName: string]: {
        check: (value: any) => boolean;
        serialize: (value: any) => any;
        deserialize: (data: any) => any;
      }
    };
    
    // Paths to exclude from serialization (uses glob-like patterns)
    excludePaths: string[];
    
    // Maximum object depth to serialize
    maxDepth: number;
  };
  
  // Performance optimization options
  performance: {
    // Enable differential serialization (only serialize changes)
    enableDifferential: boolean;
    
    // Maximum size of objects to auto-detect changes on
    diffMaxObjectSize: number;
    
    // Minimum interval between full serializations (ms)
    fullSerializationInterval: number;
  };
}

/**
 * Default configuration for EnhancedSerializer
 */
const DEFAULT_CONFIG: EnhancedSerializerConfig = {
  maxCacheSize: 100,
  cacheStrategy: 'LRU',
  
  serializationOptions: {
    enableStructuralSharing: true,
    preserveCircularReferences: true,
    includeTypeInformation: true,
    customTypeHandlers: {
      // Date objects
      'Date': {
        check: (value) => value instanceof Date,
        serialize: (value) => ({ __type: 'Date', value: value.toISOString() }),
        deserialize: (data) => new Date(data.value)
      },
      
      // Regular expressions
      'RegExp': {
        check: (value) => value instanceof RegExp,
        serialize: (value) => ({ 
          __type: 'RegExp', 
          source: value.source, 
          flags: value.flags 
        }),
        deserialize: (data) => new RegExp(data.source, data.flags)
      },
      
      // Map objects
      'Map': {
        check: (value) => value instanceof Map,
        serialize: (value) => ({ 
          __type: 'Map', 
          entries: Array.from(value.entries()) 
        }),
        deserialize: (data) => new Map(data.entries)
      },
      
      // Set objects
      'Set': {
        check: (value) => value instanceof Set,
        serialize: (value) => ({ 
          __type: 'Set', 
          values: Array.from(value.values()) 
        }),
        deserialize: (data) => new Set(data.values)
      },
      
      // Error objects
      'Error': {
        check: (value) => value instanceof Error,
        serialize: (value) => ({ 
          __type: 'Error', 
          name: value.name, 
          message: value.message, 
          stack: value.stack 
        }),
        deserialize: (data) => {
          const error = new Error(data.message);
          error.name = data.name;
          error.stack = data.stack;
          return error;
        }
      },
      
      // Null prototype objects
      'ObjectWithNullProto': {
        check: (value) => Object.getPrototypeOf(value) === null,
        serialize: (value) => ({ 
          __type: 'ObjectWithNullProto', 
          value: { ...value } 
        }),
        deserialize: (data) => Object.create(null, Object.getOwnPropertyDescriptors(data.value))
      }
    },
    excludePaths: [],
    maxDepth: 100
  },
  
  performance: {
    enableDifferential: true,
    diffMaxObjectSize: 10000,
    fullSerializationInterval: 5000
  }
};

/**
 * Cache entry for serialization
 */
interface CacheEntry {
  // Serialized value
  serialized: string;
  
  // Original object structure hash
  structureHash: string;
  
  // Last access timestamp
  lastAccessed: number;
  
  // Access count
  accessCount: number;
  
  // Original object reference (weak)
  originalRef?: WeakRef<any>;
}

/**
 * Implementation of the enhanced serializer
 */
export class EnhancedSerializer {
  private serializationCache: Map<string, CacheEntry> = new Map();
  private deserializationCache: Map<string, any> = new Map();
  private lastDeepSerializations: Map<string, number> = new Map();
  private cacheHits = 0;
  private cacheMisses = 0;
  private logger: BridgeLogger;
  private config: EnhancedSerializerConfig;
  
  // Registry of shared objects for structural sharing
  private objectRegistry: Map<string, any> = new Map();
  
  // Weak object registry for reference preservation
  private weakRegistry = new FinalizationRegistry<string>((key) => {
    // Object has been garbage collected, remove from cache
    this.serializationCache.delete(key);
  });
  
  constructor(
    logger: BridgeLogger,
    config: Partial<EnhancedSerializerConfig> = {}
  ) {
    this.logger = logger;
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    this.logger.info('EnhancedSerializer initialized');
  }
  
  /**
   * Serializes a value to a string
   */
  serialize(value: any, options: {
    // Force full serialization even if differential is enabled
    forceFull?: boolean;
    
    // Object ID for differential serialization
    objectId?: string;
    
    // Context path for path exclusion
    path?: string;
  } = {}): string {
    const startTime = performance.now();
    const { objectId, forceFull = false, path = '' } = options;
    
    // Handle primitives directly
    if (value === null || 
        value === undefined || 
        typeof value === 'string' || 
        typeof value === 'number' || 
        typeof value === 'boolean') {
      return JSON.stringify(value);
    }
    
    // Compute hash for cache lookup
    const structureHash = this.computeStructureHash(value);
    const cacheKey = objectId ? `${objectId}:${structureHash}` : structureHash;
    
    // Check cache first
    if (!forceFull && this.serializationCache.has(cacheKey)) {
      const cachedEntry = this.serializationCache.get(cacheKey)!;
      this.cacheHits++;
      
      // Update cache statistics
      cachedEntry.lastAccessed = Date.now();
      cachedEntry.accessCount++;
      
      return cachedEntry.serialized;
    }
    
    // Cache miss
    this.cacheMisses++;
    
    // Check if we should do differential serialization
    if (!forceFull && 
        objectId && 
        this.config.performance.enableDifferential &&
        Object.keys(value).length <= this.config.performance.diffMaxObjectSize) {
      
      // Check when we last did a full serialization
      const lastFullTime = this.lastDeepSerializations.get(objectId) || 0;
      const timeSinceLastFull = Date.now() - lastFullTime;
      
      // If we have a previous serialization and it's not too old, do differential
      if (lastFullTime > 0 && timeSinceLastFull < this.config.performance.fullSerializationInterval) {
        try {
          // Find previous cached entry
          let previousEntry: CacheEntry | undefined;
          
          for (const [key, entry] of this.serializationCache.entries()) {
            if (key.startsWith(`${objectId}:`)) {
              previousEntry = entry;
              break;
            }
          }
          
          if (previousEntry && previousEntry.originalRef) {
            const previousObject = previousEntry.originalRef.deref();
            
            if (previousObject) {
              // Compute the difference
              const diff = this.computeDiff(previousObject, value);
              
              if (Object.keys(diff).length < Object.keys(value).length / 2) {
                // Differential update is smaller than half the full object,
                // use it instead of full serialization
                const diffResult = {
                  __diff: true,
                  __base: previousEntry.structureHash,
                  changes: diff
                };
                
                const serialized = JSON.stringify(diffResult);
                
                // Cache the new result
                this.updateCache(cacheKey, serialized, structureHash, value);
                
                const endTime = performance.now();
                this.logger.debug(`Differential serialization took ${endTime - startTime}ms`, {
                  objectId,
                  diffSize: Object.keys(diff).length,
                  fullSize: Object.keys(value).length
                });
                
                return serialized;
              }
            }
          }
        } catch (error) {
          this.logger.warn('Error during differential serialization, falling back to full', error);
        }
      }
    }
    
    // Do full serialization
    if (objectId) {
      this.lastDeepSerializations.set(objectId, Date.now());
    }
    
    // Clear the object registry for structural sharing
    this.objectRegistry.clear();
    
    // Serialize with special handling for complex types
    let serialized: string;
    try {
      // Start serialization process
      const processed = this.processValue(value, new Set(), 0, path);
      serialized = JSON.stringify(processed);
    } catch (error) {
      this.logger.error('Serialization error, falling back to standard JSON', error);
      
      // Fallback to standard JSON.stringify
      try {
        serialized = JSON.stringify(value);
      } catch (circularError) {
        // Handle circular references in fallback mode
        serialized = JSON.stringify(value, (key, val) => {
          if (typeof val === 'object' && val !== null) {
            if (seen.has(val)) {
              return '[Circular Reference]';
            }
            seen.add(val);
          }
          return val;
        });
        
        const seen = new Set();
      }
    }
    
    // Update cache
    this.updateCache(cacheKey, serialized, structureHash, value);
    
    const endTime = performance.now();
    if (endTime - startTime > 5) { // Only log slow serializations
      this.logger.debug(`Full serialization took ${endTime - startTime}ms`, {
        objectId,
        size: serialized.length
      });
    }
    
    return serialized;
  }
  
  /**
   * Deserializes a string to a value
   */
  deserialize<T>(serialized: string): T {
    const startTime = performance.now();
    
    // Check cache first
    if (this.deserializationCache.has(serialized)) {
      this.cacheHits++;
      const result = this.deserializationCache.get(serialized);
      return result as T;
    }
    
    this.cacheMisses++;
    
    try {
      // Parse the JSON
      const parsed = JSON.parse(serialized);
      
      // Check if it's a differential update
      if (parsed && typeof parsed === 'object' && parsed.__diff === true) {
        // Find the base object
        const baseHash = parsed.__base;
        let baseObject = null;
        
        // Look for the base object in the cache
        for (const entry of this.serializationCache.values()) {
          if (entry.structureHash === baseHash && entry.originalRef) {
            baseObject = entry.originalRef.deref();
            if (baseObject) break;
          }
        }
        
        if (baseObject) {
          // Apply changes to a clone of the base object
          const result = JSON.parse(JSON.stringify(baseObject));
          
          // Apply each change
          for (const [path, change] of Object.entries(parsed.changes)) {
            this.applyChange(result, path, change);
          }
          
          // Cache the result
          this.updateDeserializationCache(serialized, result);
          
          const endTime = performance.now();
          this.logger.debug(`Differential deserialization took ${endTime - startTime}ms`);
          
          return result as T;
        } else {
          this.logger.warn('Base object for differential update not found, doing full deserialization');
        }
      }
      
      // Process the value to handle special types
      const result = this.processDeserialized(parsed);
      
      // Cache the result
      this.updateDeserializationCache(serialized, result);
      
      const endTime = performance.now();
      if (endTime - startTime > 5) { // Only log slow deserializations
        this.logger.debug(`Deserialization took ${endTime - startTime}ms`, {
          size: serialized.length
        });
      }
      
      return result as T;
    } catch (error) {
      this.logger.error('Deserialization error', error);
      
      // Fallback to standard JSON.parse
      const result = JSON.parse(serialized) as T;
      return result;
    }
  }
  
  /**
   * Processes a value for serialization
   */
  private processValue(
    value: any, 
    seen: Set<any>, 
    depth: number,
    path: string
  ): any {
    // Handle maximum depth
    if (depth > this.config.serializationOptions.maxDepth) {
      return '[Max Depth Exceeded]';
    }
    
    // Handle null or primitive values
    if (value === null || value === undefined || 
        typeof value === 'string' || 
        typeof value === 'number' || 
        typeof value === 'boolean') {
      return value;
    }
    
    // Check if this path should be excluded
    if (this.shouldExcludePath(path)) {
      return '[Excluded]';
    }
    
    // Check for circular references
    if (seen.has(value)) {
      if (this.config.serializationOptions.preserveCircularReferences) {
        // Generate a reference ID
        const refId = this.getObjectRefId(value);
        return { __circularRef: refId };
      } else {
        return '[Circular Reference]';
      }
    }
    
    // Add to seen objects
    seen.add(value);
    
    // Check for structural sharing
    if (this.config.serializationOptions.enableStructuralSharing) {
      const refId = this.getObjectRefId(value);
      
      if (this.objectRegistry.has(refId)) {
        return { __ref: refId };
      } else {
        this.objectRegistry.set(refId, value);
      }
    }
    
    // Check for custom type handlers
    for (const typeName in this.config.serializationOptions.customTypeHandlers) {
      const handler = this.config.serializationOptions.customTypeHandlers[typeName];
      
      if (handler.check(value)) {
        return handler.serialize(value);
      }
    }
    
    // Handle arrays
    if (Array.isArray(value)) {
      return value.map((item, index) => 
        this.processValue(item, new Set(seen), depth + 1, `${path}[${index}]`)
      );
    }
    
    // Handle regular objects
    const result: Record<string, any> = {};
    
    // Add type information if configured
    if (this.config.serializationOptions.includeTypeInformation) {
      if (value.constructor && value.constructor.name && value.constructor.name !== 'Object') {
        result.__type = value.constructor.name;
      }
    }
    
    // Process each property
    for (const key of Object.keys(value)) {
      const propPath = path ? `${path}.${key}` : key;
      result[key] = this.processValue(value[key], new Set(seen), depth + 1, propPath);
    }
    
    return result;
  }
  
  /**
   * Processes a deserialized value to handle special types
   */
  private processDeserialized(value: any, refMap: Map<string, any> = new Map()): any {
    // Handle null or primitive values
    if (value === null || value === undefined || 
        typeof value === 'string' || 
        typeof value === 'number' || 
        typeof value === 'boolean') {
      return value;
    }
    
    // Handle arrays
    if (Array.isArray(value)) {
      return value.map(item => this.processDeserialized(item, refMap));
    }
    
    // Handle special markers
    if (value.__circularRef && typeof value.__circularRef === 'string') {
      return refMap.get(value.__circularRef) || '[Unresolved Circular Reference]';
    }
    
    if (value.__ref && typeof value.__ref === 'string') {
      return refMap.get(value.__ref) || '[Unresolved Reference]';
    }
    
    // Handle custom type handlers
    if (value.__type && typeof value.__type === 'string') {
      const handler = this.config.serializationOptions.customTypeHandlers[value.__type];
      
      if (handler) {
        return handler.deserialize(value);
      }
    }
    
    // Handle regular objects
    const result: Record<string, any> = {};
    
    // Register this object for reference resolution
    const refId = this.generateRefId();
    refMap.set(refId, result);
    
    // Process each property
    for (const key of Object.keys(value)) {
      // Skip special type marker
      if (key === '__type' && typeof value[key] === 'string') {
        continue;
      }
      
      result[key] = this.processDeserialized(value[key], refMap);
    }
    
    return result;
  }
  
  /**
   * Applies a change to an object at a specific path
   */
  private applyChange(obj: any, path: string, change: any): void {
    if (path === '') {
      // Replace the entire object
      Object.assign(obj, change);
      return;
    }
    
    const parts = path.split('.');
    let current = obj;
    
    // Navigate to the parent object
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      
      // Handle array indices
      const match = part.match(/^(\w+)\[(\d+)\]$/);
      if (match) {
        const [_, name, index] = match;
        if (!current[name]) {
          current[name] = [];
        }
        const idx = parseInt(index);
        while (current[name].length <= idx) {
          current[name].push(null);
        }
        current = current[name][idx];
      } else {
        if (!current[part] || typeof current[part] !== 'object') {
          current[part] = {};
        }
        current = current[part];
      }
    }
    
    // Set the final property
    const lastPart = parts[parts.length - 1];
    
    // Handle array indices in the final part
    const match = lastPart.match(/^(\w+)\[(\d+)\]$/);
    if (match) {
      const [_, name, index] = match;
      if (!current[name]) {
        current[name] = [];
      }
      const idx = parseInt(index);
      while (current[name].length <= idx) {
        current[name].push(null);
      }
      current[name][idx] = change;
    } else {
      current[lastPart] = change;
    }
  }
  
  /**
   * Computes the structural hash of an object
   */
  private computeStructureHash(obj: any): string {
    try {
      // For small objects, use JSON.stringify with sorted keys
      if (typeof obj !== 'object' || obj === null) {
        return String(obj);
      }
      
      // For arrays, create a simple structural representation
      if (Array.isArray(obj)) {
        return `array:${obj.length}:${this.simpleHash(JSON.stringify(obj))}`;
      }
      
      // For objects, sort keys for consistent order
      const sortedKeys = Object.keys(obj).sort();
      const simpleObj: Record<string, any> = {};
      
      for (const key of sortedKeys) {
        const value = obj[key];
        
        // Handle primitives
        if (value === null || 
            value === undefined || 
            typeof value === 'string' || 
            typeof value === 'number' || 
            typeof value === 'boolean') {
          simpleObj[key] = value;
        } 
        // Handle dates
        else if (value instanceof Date) {
          simpleObj[key] = `date:${value.getTime()}`;
        }
        // Handle arrays
        else if (Array.isArray(value)) {
          simpleObj[key] = `array:${value.length}`;
        }
        // Handle objects
        else if (typeof value === 'object') {
          // Just represent objects by their type and approximate size
          const objType = Object.prototype.toString.call(value);
          const size = Object.keys(value).length;
          simpleObj[key] = `${objType}:${size}`;
        }
        // Handle functions
        else if (typeof value === 'function') {
          simpleObj[key] = `function:${value.name || 'anonymous'}`;
        }
        // Handle other types
        else {
          simpleObj[key] = String(value);
        }
      }
      
      return this.simpleHash(JSON.stringify(simpleObj));
    } catch (error) {
      // Fallback to a simpler approach if the above fails
      return this.simpleHash(String(obj));
    }
  }
  
  /**
   * Simple hash function for strings
   */
  private simpleHash(str: string): string {
    let hash = 0;
    if (str.length === 0) return hash.toString(16);
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32bit integer
    }
    
    return hash.toString(16).padStart(8, '0');
  }
  
  /**
   * Gets or generates a reference ID for an object
   */
  private getObjectRefId(obj: any): string {
    // Use a property symbol to store the ID
    const refSymbol = Symbol.for('__serializerRefId');
    
    if ((obj as any)[refSymbol]) {
      return (obj as any)[refSymbol];
    }
    
    const refId = this.generateRefId();
    Object.defineProperty(obj, refSymbol, {
      value: refId,
      enumerable: false
    });
    
    return refId;
  }
  
  /**
   * Generates a unique reference ID
   */
  private generateRefId(): string {
    return Math.random().toString(36).substring(2, 10);
  }
  
  /**
   * Checks if a path should be excluded from serialization
   */
  private shouldExcludePath(path: string): boolean {
    if (!path || this.config.serializationOptions.excludePaths.length === 0) {
      return false;
    }
    
    return this.config.serializationOptions.excludePaths.some(pattern => {
      // Convert glob pattern to regex
      const regex = new RegExp('^' + 
        pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + 
        '$');
      
      return regex.test(path);
    });
  }
  
  /**
   * Computes the difference between two objects
   */
  private computeDiff(oldObj: any, newObj: any): Record<string, any> {
    const diff: Record<string, any> = {};
    
    // Compare for additions and changes
    for (const key in newObj) {
      // Skip if key starts with __
      if (key.startsWith('__')) continue;
      
      // If key doesn't exist in old object, it's an addition
      if (!(key in oldObj)) {
        diff[key] = newObj[key];
        continue;
      }
      
      // Check if values are different
      if (!deepCompare(oldObj[key], newObj[key])) {
        // For objects, we might want to compute a deeper diff
        if (typeof oldObj[key] === 'object' && 
            oldObj[key] !== null && 
            typeof newObj[key] === 'object' && 
            newObj[key] !== null &&
            !Array.isArray(oldObj[key]) && 
            !Array.isArray(newObj[key])) {
          
          const nestedDiff = this.computeDiff(oldObj[key], newObj[key]);
          
          // Only include if there are actual differences
          if (Object.keys(nestedDiff).length > 0) {
            // For deep objects, just replace the whole thing if more than half has changed
            if (Object.keys(nestedDiff).length > Object.keys(newObj[key]).length / 2) {
              diff[key] = newObj[key];
            } else {
              // For each nested diff, create a path key
              for (const nestedKey in nestedDiff) {
                diff[`${key}.${nestedKey}`] = nestedDiff[nestedKey];
              }
            }
          }
        } else {
          // For non-objects, just include the new value
          diff[key] = newObj[key];
        }
      }
    }
    
    // Look for deletions
    for (const key in oldObj) {
      if (!(key in newObj)) {
        diff[key] = undefined; // Mark as deleted
      }
    }
    
    return diff;
  }
  
  /**
   * Updates the serialization cache
   */
  private updateCache(
    key: string, 
    serialized: string, 
    structureHash: string, 
    value: any
  ): void {
    // Ensure cache doesn't exceed maximum size
    if (this.serializationCache.size >= this.config.maxCacheSize) {
      // Remove least recently used or least frequently used entry
      this.pruneCache();
    }
    
    // Store in cache
    this.serializationCache.set(key, {
      serialized,
      structureHash,
      lastAccessed: Date.now(),
      accessCount: 1,
      originalRef: new WeakRef(value)
    });
    
    // Register for cleanup when object is garbage collected
    this.weakRegistry.register(value, key);
  }
  
  /**
   * Updates the deserialization cache
   */
  private updateDeserializationCache(serialized: string, value: any): void {
    // Ensure cache doesn't exceed maximum size
    if (this.deserializationCache.size >= this.config.maxCacheSize) {
      // Remove least recently used or least frequently used entry
      this.pruneDeserializationCache();
    }
    
    // Store in cache
    this.deserializationCache.set(serialized, value);
  }
  
  /**
   * Prunes the serialization cache according to the chosen strategy
   */
  private pruneCache(): void {
    if (this.serializationCache.size === 0) return;
    
    if (this.config.cacheStrategy === 'LRU') {
      // Find least recently used entry
      let oldestKey: string | null = null;
      let oldestTime = Infinity;
      
      for (const [key, entry] of this.serializationCache.entries()) {
        if (entry.lastAccessed < oldestTime) {
          oldestTime = entry.lastAccessed;
          oldestKey = key;
        }
      }
      
      if (oldestKey) {
        this.serializationCache.delete(oldestKey);
      }
    } else if (this.config.cacheStrategy === 'LFU') {
      // Find least frequently used entry
      let lfuKey: string | null = null;
      let lowestCount = Infinity;
      
      for (const [key, entry] of this.serializationCache.entries()) {
        if (entry.accessCount < lowestCount) {
          lowestCount = entry.accessCount;
          lfuKey = key;
        }
      }
      
      if (lfuKey) {
        this.serializationCache.delete(lfuKey);
      }
    }
  }
  
  /**
   * Prunes the deserialization cache according to the chosen strategy
   */
  private pruneDeserializationCache(): void {
    if (this.deserializationCache.size === 0) return;
    
    // For deserialization cache, we just remove the first entry (simple LRU)
    const firstKey = this.deserializationCache.keys().next().value;
    if (firstKey) {
      this.deserializationCache.delete(firstKey);
    }
  }
  
  /**
   * Clears the serialization and deserialization caches
   */
  clearCache(): void {
    this.serializationCache.clear();
    this.deserializationCache.clear();
    this.objectRegistry.clear();
    this.lastDeepSerializations.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.logger.debug('Serialization cache cleared');
  }
  
  /**
   * Gets cache statistics
   */
  getStats(): { 
    hits: number;
    misses: number; 
    ratio: number;
    serializationCacheSize: number;
    deserializationCacheSize: number;
  } {
    const total = this.cacheHits + this.cacheMisses;
    const ratio = total > 0 ? this.cacheHits / total : 0;
    
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      ratio,
      serializationCacheSize: this.serializationCache.size,
      deserializationCacheSize: this.deserializationCache.size
    };
  }
  
  /**
   * Gets diagnostic information
   */
  getDiagnostics(): any {
    return {
      stats: this.getStats(),
      config: this.config,
      objectRegistrySize: this.objectRegistry.size,
      fullSerializations: this.lastDeepSerializations.size
    };
  }
}