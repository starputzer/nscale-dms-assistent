import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { nextTick, computed } from "vue";
import { useApiCache } from "@/composables/useApiCache";

// Mock dependencies
vi.mock("@/composables/useFeatureToggles", () => ({
  useFeatureToggles: () => ({
    isFeatureEnabled: vi.fn().mockReturnValue(true),
  }),
}));

vi.mock("@/composables/useOfflineDetection", () => ({
  useOfflineDetection: () => ({
    isOnline: computed(() => mockIsOnline),
  }),
}));

vi.mock("@/composables/useLogger", () => ({
  useLogger: () => ({
    debug: vi.fn(),
    error: vi.fn(),
  }),
}));

// Control mock online status
let mockIsOnline = true;

describe("useApiCache", () => {
  // Mock localStorage
  const mockGetItem = vi.fn();
  const mockSetItem = vi.fn();
  const mockRemoveItem = vi.fn();
  const mockClear = vi.fn();

  let mockKeys: string[] = [];

  // Setup mock storage
  const mockStorage = {
    getItem: mockGetItem,
    setItem: mockSetItem,
    removeItem: mockRemoveItem,
    clear: mockClear,
    key: (index: number) => mockKeys[index] || null,
    length: 0,
  };

  beforeEach(() => {
    // Reset all mocks
    mockGetItem.mockReset();
    mockSetItem.mockReset();
    mockRemoveItem.mockReset();
    mockClear.mockReset();
    mockKeys = [];
    mockIsOnline = true;

    // Mock localStorage
    Object.defineProperty(window, "localStorage", {
      value: mockStorage,
      writable: true,
    });

    // Mock localStorage.length property to return the number of mock keys
    Object.defineProperty(mockStorage, "length", {
      get: () => mockKeys.length,
    });

    // Mock console methods
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "debug").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should initialize with default options", () => {
    const { isCacheEnabled, stats } = useApiCache();

    expect(isCacheEnabled.value).toBe(true);
    expect(stats.value).toEqual({
      size: 0,
      hits: 0,
      misses: 0,
      staleHits: 0,
      maxSize: 100,
    });
  });

  it("should cache data and return it", () => {
    const { getCache, setCache, stats } = useApiCache({ debug: true });
    const testData = { name: "Test Data" };

    // Initially no data
    expect(getCache("test-key")).toBeNull();
    expect(stats.value.misses).toBe(1);

    // Cache data
    setCache("test-key", testData);

    // Should return cached data
    expect(getCache("test-key")).toEqual(testData);
    expect(stats.value.hits).toBe(1);
  });

  it("should return null for expired cache entries", async () => {
    const { getCache, setCache, stats } = useApiCache({ defaultTtl: 100 }); // 100ms TTL
    const testData = { name: "Expires Fast" };

    // Cache data with short TTL
    setCache("test-key", testData);

    // Should initially return cached data
    expect(getCache("test-key")).toEqual(testData);
    expect(stats.value.hits).toBe(1);

    // Wait for expiration
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Should now return null as expired
    expect(getCache("test-key")).toBeNull();
    expect(stats.value.staleHits).toBe(1);
  });

  it("should invalidate cache entries", () => {
    const { getCache, setCache, invalidateCache } = useApiCache();
    const testData = { name: "Will Be Invalidated" };

    // Cache and verify data
    setCache("test-key", testData);
    expect(getCache("test-key")).toEqual(testData);

    // Invalidate the entry
    invalidateCache("test-key");

    // Should now return null
    expect(getCache("test-key")).toBeNull();
  });

  it("should store data in localStorage when persistToStorage is enabled", () => {
    const { setCache } = useApiCache({
      persistToStorage: true,
      storageKeyPrefix: "test_prefix_",
    });

    const testData = { name: "Test Storage Data" };
    setCache("storage-key", testData);

    // Should have stored in localStorage
    expect(mockSetItem).toHaveBeenCalledWith(
      "test_prefix_storage-key",
      expect.any(String),
    );

    // Verify data is correctly serialized
    const storedDataArg = mockSetItem.mock.calls[0][1];
    const parsedData = JSON.parse(storedDataArg);
    expect(parsedData.data).toEqual(testData);
  });

  it("should load data from localStorage on initialization", () => {
    // Setup stored data in localStorage
    const storageKey = "nscale_cache_test-init";
    const testData = { name: "Test Init Data" };
    const storageEntry = {
      data: testData,
      timestamp: Date.now(),
      expires: Date.now() + 60000, // Expires in 1 minute
      key: "test-init",
      lastAccessed: Date.now(),
    };

    // Mock localStorage.key
    mockKeys = [storageKey];

    // Mock localStorage.getItem
    mockGetItem.mockImplementation((key) => {
      if (key === storageKey) {
        return JSON.stringify(storageEntry);
      }
      return null;
    });

    // Initialize cache with persistence enabled
    const { getCache } = useApiCache({ persistToStorage: true });

    // Should load from localStorage
    expect(getCache("test-init")).toEqual(testData);
  });

  it("should ignore cache when online with ignoreWhenOnline option", () => {
    mockIsOnline = true;

    const { getCache, setCache, stats } = useApiCache({
      ignoreWhenOnline: true,
    });

    const testData = { name: "Ignored When Online" };

    // Cache data
    setCache("test-key", testData);

    // Should ignore the cache when online
    expect(getCache("test-key")).toBeNull();
    expect(stats.value.misses).toBe(1);

    // Set to offline
    mockIsOnline = false;

    // Should now use the cache
    expect(getCache("test-key")).toEqual(testData);
    expect(stats.value.hits).toBe(1);
  });

  it("should not cache null or undefined data", () => {
    const { setCache } = useApiCache({ debug: true });

    // Try to cache null
    const result1 = setCache("null-key", null);
    expect(result1).toBe(false);

    // Try to cache undefined
    const result2 = setCache("undefined-key", undefined);
    expect(result2).toBe(false);
  });

  it("should return data from skipExpiration even if expired", async () => {
    const { getCache, setCache } = useApiCache({ defaultTtl: 100 }); // 100ms TTL
    const testData = { name: "Still Available After Expiry" };

    // Cache data with short TTL
    setCache("test-key", testData);

    // Wait for expiration
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Should return null normally because it's expired
    expect(getCache("test-key")).toBeNull();

    // Should return data with skipExpiration
    expect(getCache("test-key", true)).toEqual(testData);
  });

  it("should implement LRU eviction when cache size exceeds max size", () => {
    const { setCache, getCacheKeys } = useApiCache({ maxSize: 3 });

    // Cache 3 entries
    setCache("key1", "value1");
    setCache("key2", "value2");
    setCache("key3", "value3");

    // Cache should have 3 entries
    expect(getCacheKeys().length).toBe(3);

    // Force access to key1 to update lastAccessed
    setCache("key1", "value1-updated");

    // Add a 4th entry, should evict the least recently used (key2)
    setCache("key4", "value4");

    // Cache should still have 3 entries
    expect(getCacheKeys().length).toBe(3);

    // key2 should be evicted
    expect(getCacheKeys()).toContain("key1");
    expect(getCacheKeys()).toContain("key3");
    expect(getCacheKeys()).toContain("key4");
    expect(getCacheKeys()).not.toContain("key2");
  });

  it("should get cache info without data", () => {
    const { setCache, getCacheInfo } = useApiCache();
    const testData = { name: "Test Info Data" };

    setCache("info-key", testData);

    const info = getCacheInfo("info-key");

    // Should include metadata but not the actual data
    expect(info).not.toBeNull();
    expect(info?.key).toBe("info-key");
    expect(info?.timestamp).toBeDefined();
    expect(info?.expires).toBeDefined();
    expect(info?.lastAccessed).toBeDefined();
    expect((info as any)?.data).toBeUndefined();
  });

  it("should refresh cache expiration time", async () => {
    const { getCache, setCache, refreshCache } = useApiCache({
      defaultTtl: 100,
    });
    const testData = { name: "Refreshable Data" };

    // Cache data with short TTL
    setCache("refresh-key", testData);

    // Wait for some time (but not expiration)
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Refresh with a new TTL
    refreshCache("refresh-key", 200);

    // Wait for original TTL to pass
    await new Promise((resolve) => setTimeout(resolve, 60));

    // Should still be available because we refreshed
    expect(getCache("refresh-key")).toEqual(testData);

    // Wait for new TTL to pass
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Should now be expired
    expect(getCache("refresh-key")).toBeNull();
  });

  it("should clear the entire cache", () => {
    const { setCache, getCache, clearCache, getCacheKeys } = useApiCache();

    // Cache multiple entries
    setCache("clear1", "value1");
    setCache("clear2", "value2");

    // Verify they are cached
    expect(getCache("clear1")).toBe("value1");
    expect(getCache("clear2")).toBe("value2");

    // Clear the cache
    clearCache();

    // Cache should be empty
    expect(getCacheKeys().length).toBe(0);
    expect(getCache("clear1")).toBeNull();
    expect(getCache("clear2")).toBeNull();
  });

  it("should invalidate cache entries by prefix", () => {
    const { setCache, invalidateCacheByPrefix, getCacheKeys } = useApiCache();

    // Cache entries with different prefixes
    setCache("user_1", "User 1 data");
    setCache("user_2", "User 2 data");
    setCache("post_1", "Post 1 data");

    // Invalidate all user entries
    const count = invalidateCacheByPrefix("user_");

    // Should have invalidated 2 entries
    expect(count).toBe(2);

    // Only post entries should remain
    expect(getCacheKeys()).toEqual(["post_1"]);
  });

  it("should handle localStorage errors gracefully", () => {
    // Mock localStorage.getItem to throw
    mockGetItem.mockImplementation(() => {
      throw new Error("Storage error");
    });

    // Persistence should fail gracefully
    const { setCache, getCache } = useApiCache({
      persistToStorage: true,
      debug: true,
    });

    // Should still work in memory without failing
    setCache("error-key", "value");
    expect(getCache("error-key")).toBe("value");

    // Should have logged an error
    expect(console.error).toHaveBeenCalled();
  });

  it("should not cache when feature toggle is disabled", () => {
    // Mock feature toggle to be disabled
    vi.mocked(useFeatureToggles().isFeatureEnabled).mockReturnValue(false);

    const { setCache, getCache, isCacheEnabled } = useApiCache();

    // Cache should be disabled
    expect(isCacheEnabled.value).toBe(false);

    // Setting cache should fail
    const result = setCache("toggle-key", "value");
    expect(result).toBe(false);

    // Getting from cache should return null
    expect(getCache("toggle-key")).toBeNull();
  });

  it("should handle evicting the oldest entry manually", () => {
    const { setCache, evictOldestEntry, getCache } = useApiCache();

    const now = Date.now();

    // Cache entries with different lastAccessed times
    setCache("newer", "Newer Value");

    // Manipulate the lastAccessed time of the next entry to be older
    const olderTime = now - 1000;
    vi.spyOn(Date, "now").mockReturnValueOnce(olderTime);

    setCache("older", "Older Value");

    // Reset Date.now mock
    vi.spyOn(Date, "now").mockRestore();

    // Evict the oldest entry
    const evictedKey = evictOldestEntry();

    // Should have evicted the older entry
    expect(evictedKey).toBe("older");
    expect(getCache("older")).toBeNull();
    expect(getCache("newer")).toBe("Newer Value");
  });

  it("should update stats after operations", () => {
    const { setCache, getCache, invalidateCache, stats } = useApiCache();

    // Initial stats
    expect(stats.value.size).toBe(0);

    // Add an entry
    setCache("stats-key", "value");
    expect(stats.value.size).toBe(1);

    // Access the entry (hit)
    getCache("stats-key");
    expect(stats.value.hits).toBe(1);

    // Access non-existent entry (miss)
    getCache("nonexistent");
    expect(stats.value.misses).toBe(1);

    // Invalidate and verify size update
    invalidateCache("stats-key");
    expect(stats.value.size).toBe(0);
  });

  it("should handle invalid JSON in localStorage", () => {
    // Mock invalid JSON in localStorage
    mockGetItem.mockReturnValue("invalid json");
    mockKeys = ["nscale_cache_invalid"];

    // Should not fail on initialization
    const { stats } = useApiCache({ persistToStorage: true });

    // Should have logged an error but continued
    expect(console.error).toHaveBeenCalled();
    expect(stats.value.size).toBe(0);
  });

  it("should persist cache updates to localStorage", async () => {
    const { setCache, refreshCache, invalidateCache } = useApiCache({
      persistToStorage: true,
      storageKeyPrefix: "prefix_",
    });

    // Set cache and verify localStorage call
    setCache("persist-key", "value");
    expect(mockSetItem).toHaveBeenCalledWith(
      "prefix_persist-key",
      expect.any(String),
    );

    // Reset mock to check refresh
    mockSetItem.mockClear();

    // Refresh cache and verify localStorage update
    refreshCache("persist-key", 60000);
    expect(mockSetItem).toHaveBeenCalledWith(
      "prefix_persist-key",
      expect.any(String),
    );

    // Invalidate and verify localStorage removal
    invalidateCache("persist-key");
    expect(mockRemoveItem).toHaveBeenCalledWith("prefix_persist-key");
  });

  it("should persist prefix-based invalidation to localStorage", () => {
    // Setup mock localStorage with keyed items
    mockKeys = [
      "nscale_cache_user_1",
      "nscale_cache_user_2",
      "nscale_cache_post_1",
    ];

    const { invalidateCacheByPrefix } = useApiCache({
      persistToStorage: true,
    });

    // Invalidate by prefix
    invalidateCacheByPrefix("user_");

    // Should have called removeItem for matching keys
    expect(mockRemoveItem).toHaveBeenCalledWith("nscale_cache_user_1");
    expect(mockRemoveItem).toHaveBeenCalledWith("nscale_cache_user_2");
    expect(mockRemoveItem).not.toHaveBeenCalledWith("nscale_cache_post_1");
  });

  it("should clear all persistent cache when clearCache is called", () => {
    // Setup mock localStorage with keyed items
    mockKeys = ["nscale_cache_key1", "nscale_cache_key2", "other_key"];

    const { clearCache } = useApiCache({
      persistToStorage: true,
      storageKeyPrefix: "nscale_cache_",
    });

    // Clear all cache
    clearCache();

    // Should have removed the matching keys
    expect(mockRemoveItem).toHaveBeenCalledWith("nscale_cache_key1");
    expect(mockRemoveItem).toHaveBeenCalledWith("nscale_cache_key2");
    expect(mockRemoveItem).not.toHaveBeenCalledWith("other_key");
  });
});
