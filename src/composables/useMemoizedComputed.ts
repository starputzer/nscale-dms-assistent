import { computed, ref, watchEffect, ComputedRef, Ref } from "vue";
import type { WatchSource } from "vue";

export interface MemoizedOptions {
  maxCacheSize?: number;
  ttl?: number; // Time to live in milliseconds
  keyGenerator?: (...args: any[]) => string;
}

/**
 * Creates a memoized computed property with optional TTL
 */
export function useMemoizedComputed<T>(
  getter: () => T,
  dependencies?: WatchSource[],
  options: MemoizedOptions = {},
): ComputedRef<T> {
  const { ttl = 0 } = options;

  const cache = ref<{ value: T; timestamp: number } | null>(null);
  const isStale = ref(true);

  // Watch dependencies if provided
  if (dependencies && dependencies.length > 0) {
    watchEffect(() => {
      // Access all dependencies to track them
      dependencies.forEach((dep) => {
        if (typeof dep === "function") {
          dep();
        } else {
          // Access ref value to track
          (dep as Ref).value;
        }
      });
      // Mark cache as stale when dependencies change
      isStale.value = true;
    });
  }

  return computed(() => {
    const now = Date.now();

    // Check if cache is valid
    if (
      !isStale.value &&
      cache.value &&
      (ttl === 0 || now - cache.value.timestamp < ttl)
    ) {
      return cache.value.value;
    }

    // Compute new value
    const newValue = getter();
    cache.value = { value: newValue, timestamp: now };
    isStale.value = false;

    return newValue;
  });
}

/**
 * Creates a function memoizer with LRU cache
 */
export function useMemoizedFunction<TArgs extends any[], TResult>(
  fn: (...args: TArgs) => TResult,
  options: MemoizedOptions = {},
): (...args: TArgs) => TResult {
  const {
    maxCacheSize = 100,
    ttl = 0,
    keyGenerator = (...args: any[]) => JSON.stringify(args),
  } = options;

  const cache = new Map<string, { value: TResult; timestamp: number }>();
  const accessOrder: string[] = [];

  return (...args: TArgs): TResult => {
    const key = keyGenerator(...args);
    const cached = cache.get(key);
    const now = Date.now();

    // Check if cached value exists and is still valid
    if (cached && (ttl === 0 || now - cached.timestamp < ttl)) {
      // Move to end of access order (most recently used)
      const index = accessOrder.indexOf(key);
      if (index > -1) {
        accessOrder.splice(index, 1);
      }
      accessOrder.push(key);
      return cached.value;
    }

    // Compute new value
    const result = fn(...args);

    // Add to cache
    cache.set(key, { value: result, timestamp: now });
    accessOrder.push(key);

    // Evict least recently used if cache is full
    if (accessOrder.length > maxCacheSize) {
      const evictKey = accessOrder.shift()!;
      cache.delete(evictKey);
    }

    return result;
  };
}

/**
 * Creates a batch memoizer that groups multiple calls
 */
export function useBatchMemoized<TKey, TResult>(
  batchFn: (keys: TKey[]) => Promise<Map<TKey, TResult>>,
  options: {
    batchSize?: number;
    batchDelay?: number;
    ttl?: number;
    keyToString?: (key: TKey) => string;
  } = {},
): (key: TKey) => Promise<TResult> {
  const {
    batchSize = 100,
    batchDelay = 10,
    ttl = 60000, // 1 minute default
    keyToString = (key: TKey) => String(key),
  } = options;

  const cache = new Map<string, { value: TResult; timestamp: number }>();
  const pendingBatch: Array<{
    key: TKey;
    resolve: (value: TResult) => void;
    reject: (error: any) => void;
  }> = [];
  let batchTimer: ReturnType<typeof setTimeout> | null = null;

  const processBatch = async () => {
    if (pendingBatch.length === 0) return;

    const batch = pendingBatch.splice(0, batchSize);
    const keys = batch.map((item) => item.key);

    try {
      const results = await batchFn(keys);
      const now = Date.now();

      batch.forEach(({ key, resolve }: any) => {
        const result = results.get(key);
        if (result !== undefined) {
          const keyStr = keyToString(key);
          cache.set(keyStr, { value: result, timestamp: now });
          resolve(result);
        } else {
          resolve(undefined as any);
        }
      });
    } catch (error) {
      batch.forEach(({ reject }: any) => reject(error));
    }

    // Process remaining items if any
    if (pendingBatch.length > 0) {
      scheduleBatch();
    }
  };

  const scheduleBatch = () => {
    if (batchTimer) return;
    batchTimer = setTimeout(() => {
      batchTimer = null;
      processBatch();
    }, batchDelay);
  };

  return (key: TKey): Promise<TResult> => {
    const keyStr = keyToString(key);
    const cached = cache.get(keyStr);
    const now = Date.now();

    // Return cached value if valid
    if (cached && now - cached.timestamp < ttl) {
      return Promise.resolve(cached.value);
    }

    // Add to batch
    return new Promise((resolve, reject) => {
      pendingBatch.push({ key, resolve, reject });
      scheduleBatch();
    });
  };
}

/**
 * Creates a computed property that only updates when the value actually changes
 */
export function useStableComputed<T>(
  getter: () => T,
  isEqual: (a: T, b: T) => boolean = (a, b) => a === b,
): ComputedRef<T> {
  const lastValue = ref<T>(undefined);
  const hasValue = ref(false);

  return computed(() => {
    const newValue = getter();

    if (!hasValue.value || !isEqual(newValue, lastValue.value as T)) {
      lastValue.value = newValue;
      hasValue.value = true;
    }

    return lastValue.value as T;
  });
}
