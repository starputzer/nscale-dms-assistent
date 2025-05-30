import { shallowRef, shallowReactive, triggerRef, ShallowRef, customRef, watchEffect } from 'vue';
import type { Ref } from 'vue';

export interface ShallowReactivityOptions {
  batchSize?: number;
  debounceMs?: number;
  maxUpdateFrequency?: number;
}

export interface BatchUpdate<T> {
  add(item: T): void;
  remove(item: T): void;
  update(predicate: (item: T) => boolean, updater: (item: T) => T): void;
  flush(): void;
  clear(): void;
}

/**
 * Creates a shallow reactive array with efficient batch update capabilities
 */
export function useShallowArray<T>(
  initialValue: T[] = [],
  options: ShallowReactivityOptions = {}
): [ShallowRef<T[]>, BatchUpdate<T>] {
  const {
    batchSize = 100,
    debounceMs = 16, // ~60 FPS
    maxUpdateFrequency = 1000 / 60
  } = options;

  const data = shallowRef<T[]>(initialValue);
  const pendingOperations: Array<() => void> = [];
  let updateTimer: ReturnType<typeof setTimeout> | null = null;
  let lastUpdateTime = 0;

  const scheduleBatchUpdate = () => {
    if (updateTimer) return;

    const now = performance.now();
    const timeSinceLastUpdate = now - lastUpdateTime;
    const delay = Math.max(0, maxUpdateFrequency - timeSinceLastUpdate);

    updateTimer = setTimeout(() => {
      processBatch();
      updateTimer = null;
      lastUpdateTime = performance.now();
    }, Math.max(delay, debounceMs));
  };

  const processBatch = () => {
    if (pendingOperations.length === 0) return;

    const operations = pendingOperations.splice(0, batchSize);
    
    // Apply all operations
    operations.forEach(operation => operation());
    
    // Trigger single reactive update
    triggerRef(data);

    // Schedule next batch if more operations pending
    if (pendingOperations.length > 0) {
      scheduleBatchUpdate();
    }
  };

  const batchUpdate: BatchUpdate<T> = {
    add(item: T) {
      pendingOperations.push(() => {
        data.value = [...data.value, item];
      });
      scheduleBatchUpdate();
    },

    remove(item: T) {
      pendingOperations.push(() => {
        const index = data.value.indexOf(item);
        if (index > -1) {
          const newArray = [...data.value];
          newArray.splice(index, 1);
          data.value = newArray;
        }
      });
      scheduleBatchUpdate();
    },

    update(predicate: (item: T) => boolean, updater: (item: T) => T) {
      pendingOperations.push(() => {
        data.value = data.value.map(item => 
          predicate(item) ? updater(item) : item
        );
      });
      scheduleBatchUpdate();
    },

    flush() {
      if (updateTimer) {
        clearTimeout(updateTimer);
        updateTimer = null;
      }
      while (pendingOperations.length > 0) {
        processBatch();
      }
    },

    clear() {
      pendingOperations.length = 0;
      if (updateTimer) {
        clearTimeout(updateTimer);
        updateTimer = null;
      }
      data.value = [];
      triggerRef(data);
    }
  };

  return [data, batchUpdate];
}

/**
 * Creates a shallow reactive map with efficient operations
 */
export function useShallowMap<K, V>(
  initialEntries?: Iterable<readonly [K, V]>
): Ref<Map<K, V>> & {
  set(key: K, value: V): void;
  delete(key: K): boolean;
  clear(): void;
  batchSet(entries: Iterable<readonly [K, V]>): void;
} {
  const map = new Map(initialEntries);
  
  const trigger = customRef<Map<K, V>>((track, trigger) => ({
    get() {
      track();
      return map;
    },
    set(newValue) {
      map.clear();
      for (const [k, v] of newValue) {
        map.set(k, v);
      }
      trigger();
    }
  }));

  return Object.assign(trigger, {
    set(key: K, value: V) {
      map.set(key, value);
      trigger.value = map; // Trigger update
    },
    
    delete(key: K) {
      const result = map.delete(key);
      if (result) {
        trigger.value = map; // Trigger update
      }
      return result;
    },
    
    clear() {
      map.clear();
      trigger.value = map; // Trigger update
    },
    
    batchSet(entries: Iterable<readonly [K, V]>) {
      for (const [k, v] of entries) {
        map.set(k, v);
      }
      trigger.value = map; // Single trigger for all updates
    }
  });
}

/**
 * Creates a shallow reactive set with efficient operations
 */
export function useShallowSet<T>(
  initialValues?: Iterable<T>
): Ref<Set<T>> & {
  add(value: T): void;
  delete(value: T): boolean;
  clear(): void;
  batchAdd(values: Iterable<T>): void;
  batchDelete(values: Iterable<T>): void;
} {
  const set = new Set(initialValues);
  
  const trigger = customRef<Set<T>>((track, trigger) => ({
    get() {
      track();
      return set;
    },
    set(newValue) {
      set.clear();
      for (const v of newValue) {
        set.add(v);
      }
      trigger();
    }
  }));

  return Object.assign(trigger, {
    add(value: T) {
      set.add(value);
      trigger.value = set; // Trigger update
    },
    
    delete(value: T) {
      const result = set.delete(value);
      if (result) {
        trigger.value = set; // Trigger update
      }
      return result;
    },
    
    clear() {
      set.clear();
      trigger.value = set; // Trigger update
    },
    
    batchAdd(values: Iterable<T>) {
      for (const v of values) {
        set.add(v);
      }
      trigger.value = set; // Single trigger for all updates
    },
    
    batchDelete(values: Iterable<T>) {
      let deleted = false;
      for (const v of values) {
        if (set.delete(v)) {
          deleted = true;
        }
      }
      if (deleted) {
        trigger.value = set; // Single trigger for all updates
      }
    }
  });
}

/**
 * Memory-efficient reactive object pool
 */
export function useObjectPool<T extends object>(
  factory: () => T,
  resetFn: (obj: T) => void,
  maxSize = 100
) {
  const pool: T[] = [];
  const inUse = new WeakSet<T>();

  return {
    acquire(): T {
      let obj = pool.pop();
      if (!obj) {
        obj = factory();
      }
      inUse.add(obj);
      return obj;
    },

    release(obj: T) {
      if (!inUse.has(obj)) return;
      
      resetFn(obj);
      inUse.delete(obj);
      
      if (pool.length < maxSize) {
        pool.push(obj);
      }
    },

    clear() {
      pool.length = 0;
    },

    get size() {
      return pool.length;
    }
  };
}