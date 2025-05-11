import { ref, reactive, computed, watch } from "vue";
import { useFeatureToggles } from "./useFeatureToggles";
import { useOfflineDetection } from "./useOfflineDetection";
import { useLogger } from "./useLogger";

export interface ApiCacheOptions {
  /** Default TTL (time to live) for cache entries in milliseconds */
  defaultTtl?: number;
  /** Maximum cache size (number of entries). When exceeded, the least recently used entries will be removed */
  maxSize?: number;
  /** Whether to enable cache debugging */
  debug?: boolean;
  /** Whether to ignore cache when online and always fetch fresh data */
  ignoreWhenOnline?: boolean;
  /** Whether to persist cache to localStorage */
  persistToStorage?: boolean;
  /** Storage key prefix for persisted cache entries */
  storageKeyPrefix?: string;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expires: number;
  key: string;
  lastAccessed: number;
}

export interface ApiCacheStats {
  size: number;
  hits: number;
  misses: number;
  staleHits: number;
  maxSize: number;
}

/**
 * Composable for caching API responses with TTL, LRU eviction, and offline support
 *
 * @param options - Configuration options for the cache
 * @returns Object containing cache related methods and state
 *
 * @example
 * const { getCache, setCache, invalidateCache } = useApiCache({
 *   defaultTtl: 60000, // 1 minute
 *   maxSize: 100,
 *   persistToStorage: true
 * });
 *
 * // Get data with cache support
 * const fetchData = async (id: string) => {
 *   const cacheKey = `user-${id}`;
 *   const cached = getCache<User>(cacheKey);
 *
 *   if (cached) {
 *     return cached;
 *   }
 *
 *   const response = await api.getUser(id);
 *   setCache(cacheKey, response, 300000); // Cache for 5 minutes
 *   return response;
 * };
 */
export function useApiCache(options: ApiCacheOptions = {}) {
  const {
    defaultTtl = 5 * 60 * 1000, // 5 minutes
    maxSize = 100,
    debug = false,
    ignoreWhenOnline = false,
    persistToStorage = false,
    storageKeyPrefix = "nscale_cache_",
  } = options;

  // Dependencies
  const logger = useLogger("ApiCache");
  const { isFeatureEnabled } = useFeatureToggles();
  const { isOnline } = useOfflineDetection();

  // Enable cache only if feature toggle is on
  const isCacheEnabled = computed(() => isFeatureEnabled("apiCache") !== false);

  // Cache storage
  const cache = reactive<Map<string, CacheEntry<any>>>(new Map());

  // Cache stats
  const stats = reactive<ApiCacheStats>({
    size: 0,
    hits: 0,
    misses: 0,
    staleHits: 0,
    maxSize,
  });

  // Update stats
  const updateStats = () => {
    stats.size = cache.size;
  };

  /**
   * Retrieve data from cache
   * @param key - Cache key
   * @param skipExpiration - If true, return data even if expired (useful for offline mode)
   * @returns Cached data or null if not found or expired
   */
  const getCache = <T>(key: string, skipExpiration = false): T | null => {
    if (!isCacheEnabled.value) {
      if (debug) logger.debug("Cache is disabled via feature toggle");
      return null;
    }

    // Check if the cache should be ignored based on online status
    if (ignoreWhenOnline && isOnline.value && !skipExpiration) {
      if (debug) logger.debug(`Ignoring cache for ${key} because we're online`);
      stats.misses++;
      return null;
    }

    // Try to get from memory cache
    const entry = cache.get(key);

    // If not found, try to get from localStorage if persistence is enabled
    if (!entry && persistToStorage) {
      try {
        const storageKey = `${storageKeyPrefix}${key}`;
        const storedData = localStorage.getItem(storageKey);

        if (storedData) {
          const parsedEntry = JSON.parse(storedData) as CacheEntry<T>;
          cache.set(key, parsedEntry);
          updateStats();
          if (debug) logger.debug(`Loaded cached entry from storage: ${key}`);
          return handleCacheHit(parsedEntry, skipExpiration);
        }
      } catch (error) {
        logger.error("Error loading cache from localStorage", error);
      }
    }

    if (!entry) {
      if (debug) logger.debug(`Cache miss for ${key}`);
      stats.misses++;
      return null;
    }

    return handleCacheHit(entry, skipExpiration);
  };

  /**
   * Handle a cache hit
   * @param entry - Cache entry
   * @param skipExpiration - Whether to skip expiration check
   * @returns Cached data or null if expired
   */
  const handleCacheHit = <T>(
    entry: CacheEntry<T>,
    skipExpiration: boolean,
  ): T | null => {
    const now = Date.now();

    // Update last accessed time for LRU
    entry.lastAccessed = now;

    // Check if expired
    if (!skipExpiration && entry.expires < now) {
      if (debug) logger.debug(`Cache entry expired for ${entry.key}`);
      stats.staleHits++;
      return null;
    }

    if (debug) logger.debug(`Cache hit for ${entry.key}`);
    stats.hits++;
    return entry.data;
  };

  /**
   * Store data in cache
   * @param key - Cache key
   * @param data - Data to cache
   * @param ttl - Time to live in milliseconds, defaults to the configured defaultTtl
   * @returns True if cached successfully
   */
  const setCache = <T>(key: string, data: T, ttl = defaultTtl): boolean => {
    if (!isCacheEnabled.value) {
      if (debug) logger.debug("Cache is disabled via feature toggle");
      return false;
    }

    // Don't cache null or undefined
    if (data === null || data === undefined) {
      if (debug) logger.debug(`Not caching null/undefined data for ${key}`);
      return false;
    }

    const now = Date.now();
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expires: now + ttl,
      key,
      lastAccessed: now,
    };

    // Check if we need to evict entries before adding a new one
    if (cache.size >= maxSize && !cache.has(key)) {
      evictOldestEntry();
    }

    // Add to cache
    cache.set(key, entry);
    updateStats();

    // Store in localStorage if persistence is enabled
    if (persistToStorage) {
      try {
        const storageKey = `${storageKeyPrefix}${key}`;
        localStorage.setItem(storageKey, JSON.stringify(entry));
        if (debug) logger.debug(`Cached entry persisted to storage: ${key}`);
      } catch (error) {
        logger.error("Error persisting cache to localStorage", error);
      }
    }

    if (debug) logger.debug(`Cached data for ${key}, expires in ${ttl}ms`);
    return true;
  };

  /**
   * Invalidate (remove) an entry from cache
   * @param key - Cache key to invalidate
   * @returns True if the entry was found and removed
   */
  const invalidateCache = (key: string): boolean => {
    const deleted = cache.delete(key);

    // Also remove from localStorage if persistence is enabled
    if (persistToStorage) {
      try {
        const storageKey = `${storageKeyPrefix}${key}`;
        localStorage.removeItem(storageKey);
        if (debug && deleted)
          logger.debug(`Removed cached entry from storage: ${key}`);
      } catch (error) {
        logger.error("Error removing cache from localStorage", error);
      }
    }

    if (deleted) {
      updateStats();
      if (debug) logger.debug(`Invalidated cache for ${key}`);
    }

    return deleted;
  };

  /**
   * Invalidate multiple cache entries based on a prefix
   * @param prefix - Key prefix to match
   * @returns Number of entries invalidated
   */
  const invalidateCacheByPrefix = (prefix: string): number => {
    let count = 0;

    // Find all keys that start with the prefix
    for (const key of cache.keys()) {
      if (key.startsWith(prefix)) {
        invalidateCache(key);
        count++;
      }
    }

    // Also remove from localStorage if persistence is enabled
    if (persistToStorage) {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const storageKey = localStorage.key(i);
          if (storageKey?.startsWith(`${storageKeyPrefix}${prefix}`)) {
            localStorage.removeItem(storageKey);
            if (debug)
              logger.debug(`Removed cached entry from storage: ${storageKey}`);
          }
        }
      } catch (error) {
        logger.error("Error removing cache from localStorage", error);
      }
    }

    if (count > 0) {
      updateStats();
      if (debug)
        logger.debug(
          `Invalidated ${count} cache entries with prefix ${prefix}`,
        );
    }

    return count;
  };

  /**
   * Clear the entire cache
   * @returns True if the cache was cleared
   */
  const clearCache = (): boolean => {
    cache.clear();

    // Also clear localStorage if persistence is enabled
    if (persistToStorage) {
      try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key?.startsWith(storageKeyPrefix)) {
            localStorage.removeItem(key);
          }
        }
        if (debug) logger.debug("Cleared all persisted cache entries");
      } catch (error) {
        logger.error("Error clearing persisted cache", error);
      }
    }

    updateStats();
    if (debug) logger.debug("Cleared entire cache");
    return true;
  };

  /**
   * Get all cache keys
   * @returns Array of cache keys
   */
  const getCacheKeys = (): string[] => {
    return Array.from(cache.keys());
  };

  /**
   * Get cache entry info (without the actual data)
   * @param key - Cache key
   * @returns Entry info or null if not found
   */
  const getCacheInfo = (key: string): Omit<CacheEntry<any>, "data"> | null => {
    const entry = cache.get(key);
    if (!entry) return null;

    // Return everything except the data
    const { data, ...info } = entry;
    return info;
  };

  /**
   * Refresh the expiration time for an entry
   * @param key - Cache key
   * @param ttl - New TTL in milliseconds, defaults to the configured defaultTtl
   * @returns True if the entry was found and refreshed
   */
  const refreshCache = (key: string, ttl = defaultTtl): boolean => {
    const entry = cache.get(key);
    if (!entry) return false;

    const now = Date.now();
    entry.expires = now + ttl;
    entry.lastAccessed = now;

    // Update in localStorage if persistence is enabled
    if (persistToStorage) {
      try {
        const storageKey = `${storageKeyPrefix}${key}`;
        localStorage.setItem(storageKey, JSON.stringify(entry));
        if (debug) logger.debug(`Refreshed cached entry in storage: ${key}`);
      } catch (error) {
        logger.error("Error updating persisted cache", error);
      }
    }

    if (debug)
      logger.debug(`Refreshed cache for ${key}, new expiry in ${ttl}ms`);
    return true;
  };

  /**
   * Evict the least recently used entry from the cache
   * @returns Key of the evicted entry or null if no entries were evicted
   */
  const evictOldestEntry = (): string | null => {
    if (cache.size === 0) return null;

    // Find the least recently accessed entry
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey !== null) {
      if (debug)
        logger.debug(`Evicting least recently used entry: ${oldestKey}`);
      invalidateCache(oldestKey);
      return oldestKey;
    }

    return null;
  };

  // Initialize cache from localStorage if persistence is enabled
  const initFromStorage = () => {
    if (!persistToStorage) return;

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(storageKeyPrefix)) {
          const cacheKey = key.substring(storageKeyPrefix.length);
          const storedData = localStorage.getItem(key);

          if (storedData) {
            try {
              const entry = JSON.parse(storedData) as CacheEntry<any>;
              cache.set(cacheKey, entry);
            } catch (e) {
              logger.error(`Error parsing cached entry: ${key}`, e);
              localStorage.removeItem(key);
            }
          }
        }
      }

      updateStats();
      if (debug) logger.debug(`Loaded ${cache.size} entries from localStorage`);
    } catch (error) {
      logger.error("Error initializing cache from localStorage", error);
    }
  };

  // Initialize the cache
  initFromStorage();

  // Expose API
  return {
    getCache,
    setCache,
    invalidateCache,
    invalidateCacheByPrefix,
    clearCache,
    getCacheKeys,
    getCacheInfo,
    refreshCache,
    evictOldestEntry,
    stats: computed(() => stats),
    isCacheEnabled,
  };
}

export default useApiCache;
