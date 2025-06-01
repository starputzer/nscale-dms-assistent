/**
 * API Performance Tests
 *
 * These tests evaluate API response times and caching effectiveness
 * to ensure that data fetching performance meets requirements.
 * The tests cover raw API response time, cache hit/miss rates,
 * parallel request handling, and API failover mechanisms.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import { nextTick } from "vue";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";

// Import application components and services
import ApiClient from "@/services/api/ApiClient";
import ApiCache from "@/services/api/ApiCache";
import ChatView from "@/views/ChatView.vue";
import DocumentsView from "@/views/DocumentsView.vue";
import { useApiCache } from "@/composables/useApiCache";

// Import utility functions
import {
  startMeasurement,
  endMeasurement,
  measureFunctionTime,
  createPerformanceReport,
} from "../utils/performance-test-utils";

// Performance thresholds
const API_THRESHOLDS = {
  CACHED_RESPONSE: 50, // ms for cached API response
  UNCACHED_RESPONSE: 300, // ms for uncached API response
  PARALLEL_REQUESTS: 500, // ms for 5 parallel requests
  CACHE_HIT_RATE: 0.9, // 90% cache hit rate expected
  MAX_RETRY_TIME: 1000, // ms maximum retry time
  BATCH_API_OVERHEAD: 50, // ms overhead for batching compared to single request
};

// Mock API responses
const mockApiResponses = {
  chatMessages: {
    data: Array.from({ length: 20 }, (_, i) => ({
      id: `msg-${i}`,
      role: i % 2 === 0 ? "user" : "assistant",
      content: `Test message ${i}`,
      timestamp: new Date(Date.now() - (20 - i) * 60000).toISOString(),
    })),
  },
  documents: {
    data: Array.from({ length: 30 }, (_, i) => ({
      id: `doc-${i}`,
      title: `Document ${i}`,
      type: ["pdf", "docx", "xlsx", "pptx", "txt"][i % 5],
      size: Math.floor(Math.random() * 10000000),
      created: new Date(Date.now() - (30 - i) * 3600000).toISOString(),
    })),
  },
  user: {
    data: {
      id: "user-1",
      email: "test@example.com",
      name: "Test User",
      preferences: {
        theme: "light",
        fontSize: "medium",
      },
    },
  },
  settings: {
    data: {
      notifications: true,
      emailDigest: false,
      language: "en",
      timezone: "UTC",
    },
  },
};

// Helper to create a component wrapper
const createWrapper = (Component, options = {}) => {
  return mount(Component, {
    global: {
      plugins: [
        createTestingPinia({
          createSpy: vi.fn,
          initialState: {
            ...options.initialState,
          },
        }),
      ],
      mocks: {
        $t: (key, fallback) => fallback || key,
        ...(options.mocks || {}),
      },
      stubs: {
        RouterView: true,
        RouterLink: true,
        ...(options.stubs || {}),
      },
    },
    ...options,
  });
};

// Setup for API mocking
let mockAxios;
let apiClient;
let apiCache;

describe("API Response Time and Caching Tests", () => {
  beforeEach(() => {
    // Setup axios mock
    mockAxios = new MockAdapter(axios);

    // Setup API endpoints
    mockAxios.onGet("/api/messages").reply(200, mockApiResponses.chatMessages);
    mockAxios.onGet("/api/documents").reply(200, mockApiResponses.documents);
    mockAxios.onGet("/api/user").reply(200, mockApiResponses.user);
    mockAxios.onGet("/api/settings").reply(200, mockApiResponses.settings);

    // Batch API endpoint
    mockAxios.onPost("/api/batch").reply((config) => {
      try {
        const requestData = JSON.parse(config.data);
        const responses = requestData.requests.map((req) => {
          if (req.path === "/api/messages")
            return mockApiResponses.chatMessages;
          if (req.path === "/api/documents") return mockApiResponses.documents;
          if (req.path === "/api/user") return mockApiResponses.user;
          if (req.path === "/api/settings") return mockApiResponses.settings;
          return { data: null };
        });
        return [200, { responses }];
      } catch (e) {
        return [400, { error: "Invalid batch request" }];
      }
    });

    // Initialize API client
    apiClient = new ApiClient();
    apiCache = new ApiCache();

    // Clear cache before each test
    apiCache.clear();
  });

  afterEach(() => {
    mockAxios.reset();
    vi.clearAllMocks();
  });

  describe("Basic API Response Time", () => {
    it("measures uncached API response time", async () => {
      // Spy on axios.get
      const getSpy = vi.spyOn(axios, "get");

      // Measure uncached API call
      const responseTime = await measureFunctionTime(async () => {
        await apiClient.get("/api/messages");
      });

      console.log(`Uncached API response time: ${responseTime.toFixed(2)}ms`);

      // API call should be reasonably fast
      expect(responseTime).toBeLessThan(API_THRESHOLDS.UNCACHED_RESPONSE);

      // Should have made a real API call
      expect(getSpy).toHaveBeenCalledWith("/api/messages", expect.any(Object));
    });

    it("measures cached API response time", async () => {
      // First call to populate cache
      await apiClient.get("/api/documents");

      // Spy on axios.get
      const getSpy = vi.spyOn(axios, "get");

      // Measure cached API call
      const responseTime = await measureFunctionTime(async () => {
        await apiClient.get("/api/documents");
      });

      console.log(`Cached API response time: ${responseTime.toFixed(2)}ms`);

      // Cached response should be very fast
      expect(responseTime).toBeLessThan(API_THRESHOLDS.CACHED_RESPONSE);

      // Should not have made a real API call if caching is working
      expect(getSpy).not.toHaveBeenCalledWith(
        "/api/documents",
        expect.any(Object),
      );
    });

    it("measures parallel API requests performance", async () => {
      // Measure time to make multiple concurrent requests
      const responseTime = await measureFunctionTime(async () => {
        await Promise.all([
          apiClient.get("/api/messages"),
          apiClient.get("/api/documents"),
          apiClient.get("/api/user"),
          apiClient.get("/api/settings"),
          apiClient.get("/api/messages"), // Intentional duplicate to test cache
        ]);
      });

      console.log(`5 parallel API requests: ${responseTime.toFixed(2)}ms`);

      // Parallel requests should be efficient
      expect(responseTime).toBeLessThan(API_THRESHOLDS.PARALLEL_REQUESTS);

      // Second request to same endpoint should be much faster (cached)
      const secondResponseTime = await measureFunctionTime(async () => {
        await Promise.all([
          apiClient.get("/api/messages"),
          apiClient.get("/api/documents"),
          apiClient.get("/api/user"),
          apiClient.get("/api/settings"),
        ]);
      });

      console.log(
        `5 parallel API requests (cached): ${secondResponseTime.toFixed(2)}ms`,
      );
      expect(secondResponseTime).toBeLessThan(responseTime * 0.5);
    });
  });

  describe("API Caching Effectiveness", () => {
    it("measures cache hit rate during normal application use", async () => {
      // Mock the cache metrics
      let cacheHits = 0;
      let cacheMisses = 0;

      // Spy on cache hits and misses
      vi.spyOn(apiCache, "get").mockImplementation((key) => {
        const result = apiCache.cache.get(key);
        if (result) {
          cacheHits++;
          return result;
        }
        cacheMisses++;
        return null;
      });

      // Simulate normal app usage with API calls
      for (let i = 0; i < 10; i++) {
        // Mix of cached and uncached requests
        await apiClient.get("/api/messages");
        await apiClient.get("/api/documents");

        if (i % 3 === 0) {
          // Occasionally request new data
          await apiClient.get("/api/user");
        }

        if (i % 5 === 0) {
          // Rarely request settings
          await apiClient.get("/api/settings");
        }
      }

      // Calculate hit rate
      const totalRequests = cacheHits + cacheMisses;
      const hitRate = cacheHits / totalRequests;

      console.log(`Cache hits: ${cacheHits}`);
      console.log(`Cache misses: ${cacheMisses}`);
      console.log(`Cache hit rate: ${(hitRate * 100).toFixed(2)}%`);

      // Hit rate should be high for repeated API calls
      expect(hitRate).toBeGreaterThan(API_THRESHOLDS.CACHE_HIT_RATE);
    });

    it("verifies cache invalidation works correctly", async () => {
      // Make initial request to populate cache
      await apiClient.get("/api/messages");

      // Modify data on server (simulate update)
      const updatedMessages = {
        data: [
          ...mockApiResponses.chatMessages.data,
          {
            id: "new-msg",
            role: "user",
            content: "New test message",
            timestamp: new Date().toISOString(),
          },
        ],
      };

      mockAxios.onGet("/api/messages").reply(200, updatedMessages);

      // Force cache invalidation
      apiCache.invalidate("/api/messages");

      // Make request after invalidation
      const response = await apiClient.get("/api/messages");

      // Should get updated data
      expect(response.data.length).toBe(
        mockApiResponses.chatMessages.data.length + 1,
      );
      expect(response.data.find((msg) => msg.id === "new-msg")).toBeTruthy();
    });

    it("measures cache memory usage", async () => {
      // Helper to estimate object size in bytes
      const estimateSize = (obj) => {
        const jsonString = JSON.stringify(obj);
        return new TextEncoder().encode(jsonString).length;
      };

      // Initial cache size
      const initialCacheSize = estimateSize(apiCache.cache);

      // Make several API calls to populate cache
      await apiClient.get("/api/messages");
      await apiClient.get("/api/documents");
      await apiClient.get("/api/user");
      await apiClient.get("/api/settings");

      // Final cache size
      const finalCacheSize = estimateSize(apiCache.cache);

      // Calculate growth
      const cacheSizeGrowthKB = (finalCacheSize - initialCacheSize) / 1024;

      console.log(`Cache size growth: ${cacheSizeGrowthKB.toFixed(2)} KB`);

      // Memory usage should be reasonable
      // This is a rough estimate, adjust as needed for your app
      expect(cacheSizeGrowthKB).toBeLessThan(100); // 100 KB is a reasonable cache size
    });
  });

  describe("API Retry and Failover Mechanisms", () => {
    it("measures retry mechanism performance", async () => {
      // Configure mock to fail initially then succeed
      let attempts = 0;
      mockAxios.onGet("/api/flaky-endpoint").reply(() => {
        attempts++;
        if (attempts <= 2) {
          // First 2 attempts fail
          return [500, { error: "Server error" }];
        }
        // 3rd attempt succeeds
        return [200, { data: "Success after retry" }];
      });

      // Measure response time with retries
      const responseTime = await measureFunctionTime(async () => {
        try {
          await apiClient.get("/api/flaky-endpoint", {
            retry: 3,
            retryDelay: 100,
          });
        } catch (e) {
          // Ignore errors for this test
        }
      });

      console.log(
        `API retry mechanism response time: ${responseTime.toFixed(2)}ms`,
      );

      // Retry time should be reasonable (includes initial attempt + 2 retries with delay)
      expect(responseTime).toBeLessThan(API_THRESHOLDS.MAX_RETRY_TIME);

      // Should have attempted 3 times
      expect(attempts).toBe(3);
    });

    it("measures response time with network timeout handling", async () => {
      // Configure mock to simulate timeout
      mockAxios.onGet("/api/slow-endpoint").timeout();

      // Measure response time with timeout
      const startTime = performance.now();

      try {
        await apiClient.get("/api/slow-endpoint", { timeout: 300 });
      } catch (e) {
        // Expected timeout error
        expect(e.message).toContain("timeout");
      }

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      console.log(
        `API timeout handling response time: ${responseTime.toFixed(2)}ms`,
      );

      // Timeout should happen promptly
      expect(responseTime).toBeLessThanOrEqual(500); // 300ms timeout + small overhead
    });

    it("measures failover mechanism performance", async () => {
      // Configure primary endpoint to fail
      mockAxios.onGet("/api/primary-endpoint").reply(500);

      // Configure backup endpoint to succeed
      mockAxios
        .onGet("/api/backup-endpoint")
        .reply(200, { data: "Backup data" });

      // Implement a simple failover mechanism for testing
      const fetchWithFailover = async () => {
        try {
          return await apiClient.get("/api/primary-endpoint");
        } catch (e) {
          // Failover to backup
          return await apiClient.get("/api/backup-endpoint");
        }
      };

      // Measure failover response time
      const responseTime = await measureFunctionTime(async () => {
        const response = await fetchWithFailover();
        expect(response.data).toBe("Backup data");
      });

      console.log(
        `API failover mechanism response time: ${responseTime.toFixed(2)}ms`,
      );

      // Failover should happen within reasonable time
      expect(responseTime).toBeLessThan(API_THRESHOLDS.MAX_RETRY_TIME);
    });
  });

  describe("API Batching Performance", () => {
    it("compares batched vs. individual API requests", async () => {
      // Measure individual requests time
      const individualTime = await measureFunctionTime(async () => {
        await Promise.all([
          apiClient.get("/api/messages"),
          apiClient.get("/api/documents"),
          apiClient.get("/api/user"),
        ]);
      });

      console.log(`3 individual API requests: ${individualTime.toFixed(2)}ms`);

      // Clear cache
      apiCache.clear();

      // Measure batched request time
      const batchTime = await measureFunctionTime(async () => {
        await apiClient.batch([
          { method: "GET", path: "/api/messages" },
          { method: "GET", path: "/api/documents" },
          { method: "GET", path: "/api/user" },
        ]);
      });

      console.log(
        `Batched API request for 3 endpoints: ${batchTime.toFixed(2)}ms`,
      );

      // Batching should be more efficient, but has some overhead
      // The batched request should be faster than individual requests
      // but not necessarily 3x faster due to batching overhead
      expect(batchTime).toBeLessThan(individualTime);
      expect(batchTime).toBeGreaterThan(
        individualTime / 3 - API_THRESHOLDS.BATCH_API_OVERHEAD,
      );
    });

    it("measures batch request scaling with size", async () => {
      const batchSizes = [1, 5, 10];
      const batchTimes: Record<number, number> = {};

      for (const size of batchSizes) {
        // Create batch request of given size
        const requests = Array.from({ length: size }, () => ({
          method: "GET",
          path: "/api/messages",
        }));

        // Clear cache
        apiCache.clear();

        // Measure batch request time
        batchTimes[size] = await measureFunctionTime(async () => {
          await apiClient.batch(requests);
        });

        console.log(
          `Batch API request with ${size} requests: ${batchTimes[size].toFixed(2)}ms`,
        );
      }

      // Calculate time per request
      const timePerRequest = Object.fromEntries(
        Object.entries(batchTimes).map(([size, time]) => [
          size,
          time / Number(size),
        ]),
      );

      console.log("Time per request in batch:");
      Object.entries(timePerRequest).forEach(([size, time]) => {
        console.log(`Batch size ${size}: ${time.toFixed(2)}ms per request`);
      });

      // Time per request should decrease as batch size increases
      expect(timePerRequest[5]).toBeLessThan(timePerRequest[1]);
      expect(timePerRequest[10]).toBeLessThan(timePerRequest[5]);
    });
  });

  describe("API Integration with Components", () => {
    it("measures API data fetching time in ChatView", async () => {
      // Spy on API client
      const getSpy = vi.spyOn(apiClient, "get");

      // Create a ChatView that will fetch data on mount
      const wrapper = createWrapper(ChatView, {
        global: {
          provide: {
            apiClient,
          },
        },
      });

      // Measure time to mount and fetch initial data
      const fetchTime = await measureFunctionTime(async () => {
        await flushPromises();
      });

      console.log(`ChatView API data fetching time: ${fetchTime.toFixed(2)}ms`);

      // Should have made an API call to fetch messages
      expect(getSpy).toHaveBeenCalledWith("/api/messages", expect.any(Object));

      // Data fetching should be reasonably fast
      expect(fetchTime).toBeLessThan(API_THRESHOLDS.UNCACHED_RESPONSE);
    });

    it("measures API cache integration with useApiCache composable", async () => {
      // Use the composable directly
      const { fetchData, cachedData, isLoading, error } = useApiCache();

      // Measure first fetch (uncached)
      const uncachedTime = await measureFunctionTime(async () => {
        await fetchData("/api/documents");
      });

      console.log(
        `Uncached fetch using composable: ${uncachedTime.toFixed(2)}ms`,
      );

      // Measure second fetch (should be cached)
      const cachedTime = await measureFunctionTime(async () => {
        await fetchData("/api/documents");
      });

      console.log(`Cached fetch using composable: ${cachedTime.toFixed(2)}ms`);

      // Cached fetch should be much faster
      expect(cachedTime).toBeLessThan(uncachedTime * 0.5);
      expect(cachedTime).toBeLessThan(API_THRESHOLDS.CACHED_RESPONSE);

      // Should have data and not be loading
      expect(cachedData.value).toBeTruthy();
      expect(isLoading.value).toBe(false);
      expect(error.value).toBe(null);
    });

    it("verifies API data loading state is reflected in UI", async () => {
      // Delay API response to test loading states
      mockAxios.onGet("/api/documents").reply(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve([200, mockApiResponses.documents]);
          }, 200); // 200ms delay
        });
      });

      // Mount component
      const wrapper = createWrapper(DocumentsView, {
        global: {
          provide: {
            apiClient,
          },
        },
      });

      // Check initial loading state
      await nextTick(); // Wait for component to update
      expect(wrapper.find(".loading-indicator").exists()).toBe(true);

      // Wait for data to load
      await new Promise((resolve) => setTimeout(resolve, 250));
      await flushPromises();

      // Loading should be done
      expect(wrapper.find(".loading-indicator").exists()).toBe(false);

      // Documents should be rendered
      const documentItems = wrapper.findAll(".document-item");
      expect(documentItems.length).toBeGreaterThan(0);
    });
  });

  describe("API Performance Report", () => {
    it("generates an API performance summary report", async () => {
      // Run a series of API performance tests
      const testResults: Record<string, any> = {};

      // Test 1: Uncached API response
      testResults["Uncached API Call"] = {
        value: await measureFunctionTime(async () => {
          await apiClient.get("/api/messages");
        }),
        threshold: API_THRESHOLDS.UNCACHED_RESPONSE,
        unit: "ms",
      };

      // Test 2: Cached API response
      await apiClient.get("/api/documents"); // Populate cache
      testResults["Cached API Call"] = {
        value: await measureFunctionTime(async () => {
          await apiClient.get("/api/documents");
        }),
        threshold: API_THRESHOLDS.CACHED_RESPONSE,
        unit: "ms",
      };

      // Test 3: Parallel requests
      testResults["Parallel API Requests"] = {
        value: await measureFunctionTime(async () => {
          await Promise.all([
            apiClient.get("/api/messages"),
            apiClient.get("/api/documents"),
            apiClient.get("/api/user"),
            apiClient.get("/api/settings"),
          ]);
        }),
        threshold: API_THRESHOLDS.PARALLEL_REQUESTS,
        unit: "ms",
      };

      // Test 4: Batch API request
      apiCache.clear(); // Clear cache for accurate measurement
      testResults["Batch API Request"] = {
        value: await measureFunctionTime(async () => {
          await apiClient.batch([
            { method: "GET", path: "/api/messages" },
            { method: "GET", path: "/api/documents" },
            { method: "GET", path: "/api/user" },
            { method: "GET", path: "/api/settings" },
          ]);
        }),
        threshold: API_THRESHOLDS.PARALLEL_REQUESTS,
        unit: "ms",
      };

      // Generate report
      const report = createPerformanceReport(testResults);

      // Log report
      console.log("API Performance Report:");
      console.log(report);

      // Verify report was generated
      expect(report).toBeTruthy();
      expect(Object.keys(report)).toHaveLength(4);
      expect(Object.keys(report)).toContain("Uncached API Call");
      expect(Object.keys(report)).toContain("Cached API Call");
      expect(Object.keys(report)).toContain("Parallel API Requests");
      expect(Object.keys(report)).toContain("Batch API Request");
    });
  });
});
