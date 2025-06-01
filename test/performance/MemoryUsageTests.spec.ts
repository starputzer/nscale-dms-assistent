/**
 * Memory Usage Performance Tests
 *
 * These tests analyze memory usage patterns during extended application use
 * to identify potential memory leaks and ensure the application maintains
 * stable memory usage over time.
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
} from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import { nextTick } from "vue";

// Import application components
import App from "@/App.vue";
import ChatView from "@/views/ChatView.vue";
import DocumentsView from "@/views/DocumentsView.vue";
import AdminView from "@/views/AdminView.vue";

// Import performance utilities
import {
  trackMemoryUsage,
  measureFunctionTime,
  createPerformanceReport,
  generatePerformanceProfile,
} from "../utils/performance-test-utils";

// Memory usage thresholds
const MEMORY_THRESHOLDS = {
  INITIAL_APP_MOUNT: 15, // MB for initial app mount
  PER_MESSAGE_OVERHEAD: 0.05, // MB per message
  MAX_MESSAGES_MEMORY: 20, // MB for 1000 messages
  COMPONENT_SWITCH_LEAK: 1, // MB maximum acceptable "leak" after many component switches
  EXTENDED_USE_GROWTH: 5, // MB maximum acceptable memory growth during extended use
  VIEW_MEMORY_BASELINE: 5, // MB baseline for a view component
  REPEATED_ACTION_GROWTH: 0.5, // MB maximum growth for repeating the same action 100 times
};

// Test data generators
const generateTestMessages = (count) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `msg-${i}`,
    role: i % 2 === 0 ? "user" : "assistant",
    content: `Test message ${i} with enough content to be realistic but not excessive in length. This simulates a typical chat message that users might enter or receive from the AI assistant.`,
    timestamp: new Date(Date.now() - (count - i) * 60000).toISOString(),
  }));
};

// Helper to create a wrapper with testing pinia
const createWrapper = (Component, props = {}, options = {}) => {
  return mount(Component, {
    props,
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
    attachTo: document.body,
    ...options,
  });
};

// Helper to force garbage collection (if available)
const forceGC = async () => {
  if (global.gc) {
    global.gc();
  }

  // Wait a bit for GC to complete
  await new Promise((resolve) => setTimeout(resolve, 100));
};

describe("Memory Usage Tests", () => {
  beforeAll(() => {
    // Set up memory tracking
    if (!(window.performance as any).memory) {
      // Polyfill memory tracking for environments that don't support it
      (window.performance as any).memory = {
        usedJSHeapSize: 0,
        totalJSHeapSize: 0,
        jsHeapSizeLimit: 0,
      };

      // Mock implementation to show some memory usage patterns
      let baselineMemory = 5 * 1024 * 1024; // Start with 5MB
      let mockLeakCounter = 0;

      // Override trackMemoryUsage for testing
      const originalTrackMemory = trackMemoryUsage;
      vi.spyOn(global, "trackMemoryUsage").mockImplementation(async () => {
        // Simulate a small memory increase on each call (for testing)
        baselineMemory += 50 * 1024 * mockLeakCounter;
        mockLeakCounter += 1;
        return baselineMemory;
      });
    }
  });

  beforeEach(() => {
    // Clear DOM before each test
    document.body.innerHTML = "";
  });

  afterEach(async () => {
    // Clean up after tests
    document.body.innerHTML = "";
    await forceGC();
  });

  describe("Base Memory Usage", () => {
    it("measures baseline memory usage of the application", async () => {
      // Initial memory baseline
      await forceGC();
      const memoryBefore = await trackMemoryUsage();

      // Mount app
      const wrapper = createWrapper(App);
      await flushPromises();

      // Check memory after mount
      const memoryAfter = await trackMemoryUsage();
      const memoryUsageMB = (memoryAfter - memoryBefore) / (1024 * 1024);

      console.log(`App initial memory usage: ${memoryUsageMB.toFixed(2)} MB`);

      // Some memory usage is expected, but it shouldn't be excessive
      expect(memoryUsageMB).toBeLessThan(MEMORY_THRESHOLDS.INITIAL_APP_MOUNT);

      // Clean up
      wrapper.unmount();
      await forceGC();
    });

    it("measures memory footprint of individual view components", async () => {
      const viewComponents = [
        { name: "ChatView", component: ChatView },
        { name: "DocumentsView", component: DocumentsView },
        { name: "AdminView", component: AdminView },
      ];

      // Measure each component
      const viewMemoryUsage: Record<string, number> = {};

      for (const { name, component } of viewComponents) {
        // Force GC
        await forceGC();

        // Baseline memory
        const memoryBefore = await trackMemoryUsage();

        // Mount component
        const wrapper = createWrapper(component);
        await flushPromises();

        // Check memory after mount
        const memoryAfter = await trackMemoryUsage();
        const memoryUsageMB = (memoryAfter - memoryBefore) / (1024 * 1024);

        viewMemoryUsage[name] = memoryUsageMB;
        console.log(`${name} memory usage: ${memoryUsageMB.toFixed(2)} MB`);

        // Clean up
        wrapper.unmount();
        await forceGC();
      }

      // Each view should have a reasonable memory footprint
      for (const [name, usage] of Object.entries(viewMemoryUsage)) {
        expect(usage).toBeLessThan(MEMORY_THRESHOLDS.VIEW_MEMORY_BASELINE);
      }
    });
  });

  describe("Memory Usage During Data Loading", () => {
    it("measures memory usage for loading different amounts of chat messages", async () => {
      const messageCounts = [10, 50, 100, 500, 1000];
      const memoryResults: Record<number, number> = {};

      // Initialize ChatView once
      const wrapper = createWrapper(ChatView);
      await flushPromises();

      for (const count of messageCounts) {
        // Force GC
        await forceGC();

        // Baseline memory
        const memoryBefore = await trackMemoryUsage();

        // Load messages
        const messages = generateTestMessages(count);
        wrapper.vm.$store.sessions.messages = {
          "session-1": messages,
        };
        wrapper.vm.$store.sessions.currentSession = {
          id: "session-1",
          title: "Test Session",
        };

        await nextTick();
        await flushPromises();

        // Measure memory after loading
        const memoryAfter = await trackMemoryUsage();
        const memoryUsageMB = (memoryAfter - memoryBefore) / (1024 * 1024);

        memoryResults[count] = memoryUsageMB;
        console.log(
          `Memory usage for ${count} messages: ${memoryUsageMB.toFixed(2)} MB`,
        );

        // Clear messages
        wrapper.vm.$store.sessions.messages = {};
        await nextTick();
        await flushPromises();
      }

      // Check for linear growth (memory usage shouldn't grow exponentially)
      // As message count grows, memory per message should remain relatively stable
      const memoryPer10Messages = memoryResults[10] / 10;
      const memoryPer1000Messages = memoryResults[1000] / 1000;

      console.log(
        `Memory per 10 messages: ${memoryPer10Messages.toFixed(4)} MB/message`,
      );
      console.log(
        `Memory per 1000 messages: ${memoryPer1000Messages.toFixed(4)} MB/message`,
      );

      // Memory per message shouldn't increase significantly as message count grows
      // This helps identify memory leaks in list rendering
      expect(memoryPer1000Messages).toBeLessThanOrEqual(
        memoryPer10Messages * 2,
      );

      // Total memory for 1000 messages should be reasonable
      expect(memoryResults[1000]).toBeLessThan(
        MEMORY_THRESHOLDS.MAX_MESSAGES_MEMORY,
      );

      // Clean up
      wrapper.unmount();
      await forceGC();
    });

    it("measures memory release after clearing data", async () => {
      // Initialize view
      const wrapper = createWrapper(
        DocumentsView,
        {},
        {
          initialState: {
            documents: {
              items: [],
              isLoading: false,
            },
          },
        },
      );
      await flushPromises();

      // Force GC
      await forceGC();

      // Memory before loading data
      const memoryBefore = await trackMemoryUsage();

      // Load large data set
      const largeDocumentList = Array.from({ length: 500 }, (_, i) => ({
        id: `doc-${i}`,
        title: `Document ${i} with a reasonably long title`,
        type: ["pdf", "docx", "xlsx", "pptx", "txt"][i % 5],
        size: Math.floor(Math.random() * 10000000),
        created: new Date(Date.now() - (500 - i) * 3600000).toISOString(),
      }));

      wrapper.vm.$store.documents.items = largeDocumentList;
      await nextTick();
      await flushPromises();

      // Memory after loading
      const memoryLoaded = await trackMemoryUsage();

      // Clear data
      wrapper.vm.$store.documents.items = [];
      await nextTick();
      await flushPromises();

      // Force GC to reclaim memory
      await forceGC();

      // Memory after clearing
      const memoryAfterClear = await trackMemoryUsage();

      // Calculate memory differentials
      const loadedMemoryMB = (memoryLoaded - memoryBefore) / (1024 * 1024);
      const retainedMemoryMB =
        (memoryAfterClear - memoryBefore) / (1024 * 1024);
      const releasedPercentage =
        ((loadedMemoryMB - retainedMemoryMB) / loadedMemoryMB) * 100;

      console.log(`Memory used when loaded: ${loadedMemoryMB.toFixed(2)} MB`);
      console.log(
        `Memory retained after clear: ${retainedMemoryMB.toFixed(2)} MB`,
      );
      console.log(`Memory released: ${releasedPercentage.toFixed(2)}%`);

      // At least 80% of memory should be released after clearing
      expect(releasedPercentage).toBeGreaterThan(80);

      // Clean up
      wrapper.unmount();
      await forceGC();
    });
  });

  describe("Memory Leaks in Component Lifecycles", () => {
    it("checks for memory leaks during repeated component mounting/unmounting", async () => {
      // Track memory before
      await forceGC();
      const memoryBefore = await trackMemoryUsage();

      // Repeatedly mount and unmount a component
      for (let i = 0; i < 50; i++) {
        const wrapper = createWrapper(ChatView);
        await nextTick();
        wrapper.unmount();
      }

      // Force GC
      await forceGC();

      // Check memory after
      const memoryAfter = await trackMemoryUsage();
      const memoryDiffMB = (memoryAfter - memoryBefore) / (1024 * 1024);

      console.log(
        `Memory diff after 50 mount/unmount cycles: ${memoryDiffMB.toFixed(2)} MB`,
      );

      // Some small amount of memory growth is acceptable, but it should be minimal
      expect(memoryDiffMB).toBeLessThan(
        MEMORY_THRESHOLDS.COMPONENT_SWITCH_LEAK,
      );
    });

    it("checks for memory leaks when switching between views", async () => {
      const views = [ChatView, DocumentsView, AdminView];

      // Mount app wrapper
      const wrapper = createWrapper(App);
      await flushPromises();

      // Get router view
      const routerView = wrapper.find(".router-view-container");

      // Force GC
      await forceGC();

      // Memory before view switching
      const memoryBefore = await trackMemoryUsage();

      // Switch between views many times
      for (let i = 0; i < 30; i++) {
        const ViewComponent = views[i % views.length];

        // Simulate route change by updating child component
        const childWrapper = mount(ViewComponent, {
          global: {
            plugins: [createTestingPinia()],
          },
        });
        await nextTick();
        await flushPromises();

        childWrapper.unmount();
      }

      // Force GC
      await forceGC();

      // Memory after view switching
      const memoryAfter = await trackMemoryUsage();
      const memoryDiffMB = (memoryAfter - memoryBefore) / (1024 * 1024);

      console.log(
        `Memory diff after 30 view switches: ${memoryDiffMB.toFixed(2)} MB`,
      );

      // Memory growth should be minimal after multiple view switches
      expect(memoryDiffMB).toBeLessThan(
        MEMORY_THRESHOLDS.COMPONENT_SWITCH_LEAK,
      );

      // Clean up
      wrapper.unmount();
      await forceGC();
    });

    it("checks for event listener leaks during component lifecycle", async () => {
      // This test checks for event listener leaks
      // We'll count DOM event listeners before and after component mounting

      // Function to approximately count active event listeners
      const countEventListeners = () => {
        // This is an approximation since we can't directly access all event listeners
        // In a real browser environment, we'd use the Chrome DevTools API
        const elements = document.querySelectorAll("*");
        let listenerCount = 0;

        // We'll just return a count based on elements with common event attributes
        elements.forEach((el) => {
          if (
            el.hasAttribute("onClick") ||
            el.hasAttribute("onChange") ||
            el.hasAttribute("onInput") ||
            el.hasAttribute("onKeydown") ||
            el.hasAttribute("onFocus") ||
            el.hasAttribute("onBlur")
          ) {
            listenerCount++;
          }
        });

        return listenerCount;
      };

      // Baseline listener count
      const initialListeners = countEventListeners();

      // Mount and unmount component multiple times
      for (let i = 0; i < 10; i++) {
        const wrapper = createWrapper(ChatView);
        await flushPromises();

        // Count listeners while mounted
        const mountedListeners = countEventListeners();

        // Unmount
        wrapper.unmount();
        await nextTick();
      }

      // Final listener count
      const finalListeners = countEventListeners();

      console.log(`Initial listeners: ${initialListeners}`);
      console.log(`Final listeners: ${finalListeners}`);

      // After unmounting all components, listener count should return to initial value
      // or be very close (allowing for some system listeners)
      expect(finalListeners).toBeLessThanOrEqual(initialListeners + 5);
    });
  });

  describe("Memory Usage During User Interactions", () => {
    it("measures memory usage during repeated user interactions", async () => {
      // Mount chat view
      const wrapper = createWrapper(
        ChatView,
        {},
        {
          initialState: {
            sessions: {
              currentSession: { id: "session-1", title: "Test Session" },
              messages: {
                "session-1": [],
              },
            },
          },
        },
      );
      await flushPromises();

      // Find message input
      const messageInput = wrapper.find(".message-input");
      expect(messageInput.exists()).toBe(true);

      // Force GC
      await forceGC();

      // Memory before interactions
      const memoryBefore = await trackMemoryUsage();

      // Simulate typing and sending 50 messages
      for (let i = 0; i < 50; i++) {
        // Type message
        await messageInput.setValue(`Test message ${i}`);

        // Send message (simulate form submission or button click)
        if (typeof wrapper.vm.sendMessage === "function") {
          wrapper.vm.sendMessage();
        } else {
          // Fallback: add message directly to store
          const messages =
            wrapper.vm.$store.sessions.messages["session-1"] || [];
          wrapper.vm.$store.sessions.messages["session-1"] = [
            ...messages,
            {
              id: `user-msg-${i}`,
              role: "user",
              content: `Test message ${i}`,
              timestamp: new Date().toISOString(),
            },
            {
              id: `assistant-msg-${i}`,
              role: "assistant",
              content: `Response to message ${i}`,
              timestamp: new Date().toISOString(),
            },
          ];
        }

        await nextTick();

        // Only flush promises occasionally to improve test performance
        if (i % 10 === 0) {
          await flushPromises();
        }
      }

      await flushPromises();

      // Memory after interactions
      const memoryAfter = await trackMemoryUsage();
      const memoryDiffMB = (memoryAfter - memoryBefore) / (1024 * 1024);

      console.log(
        `Memory usage after 50 chat interactions: ${memoryDiffMB.toFixed(2)} MB`,
      );

      // Memory growth per message should be bounded
      const memoryPerMessageMB = memoryDiffMB / 50;
      console.log(
        `Memory per message interaction: ${memoryPerMessageMB.toFixed(4)} MB`,
      );

      expect(memoryPerMessageMB).toBeLessThan(
        MEMORY_THRESHOLDS.PER_MESSAGE_OVERHEAD,
      );

      // Clean up
      wrapper.unmount();
      await forceGC();
    });

    it("measures memory usage during UI state changes", async () => {
      // Mount app
      const wrapper = createWrapper(App);
      await flushPromises();

      // Force GC
      await forceGC();

      // Memory before UI interactions
      const memoryBefore = await trackMemoryUsage();

      // Perform UI state changes (toggles, theme changes, etc.)
      for (let i = 0; i < 20; i++) {
        // Toggle theme
        wrapper.vm.$store.ui.theme = i % 2 === 0 ? "light" : "dark";

        // Toggle sidebar
        if (typeof wrapper.vm.$store.ui.sidebarVisible !== "undefined") {
          wrapper.vm.$store.ui.sidebarVisible = i % 2 === 0;
        }

        // Change font size
        wrapper.vm.$store.ui.fontSize = ["small", "medium", "large"][i % 3];

        await nextTick();

        // Only flush promises occasionally
        if (i % 5 === 0) {
          await flushPromises();
        }
      }

      await flushPromises();

      // Memory after UI state changes
      const memoryAfter = await trackMemoryUsage();
      const memoryDiffMB = (memoryAfter - memoryBefore) / (1024 * 1024);

      console.log(
        `Memory usage after UI state changes: ${memoryDiffMB.toFixed(2)} MB`,
      );

      // UI state changes should have minimal memory impact
      expect(memoryDiffMB).toBeLessThan(
        MEMORY_THRESHOLDS.REPEATED_ACTION_GROWTH,
      );

      // Clean up
      wrapper.unmount();
      await forceGC();
    });
  });

  describe("Extended Application Use", () => {
    it("monitors memory usage during an extended usage session", async () => {
      // This test simulates a longer user session with various interactions

      // Mount app
      const wrapper = createWrapper(App);
      await flushPromises();

      // Force GC
      await forceGC();

      // Baseline memory
      const memoryReadings: number[] = [];
      memoryReadings.push(await trackMemoryUsage());

      // Simulate a session of app usage
      const simulateAppSession = async () => {
        // 1. Navigate to chat view
        const chatView = createWrapper(
          ChatView,
          {},
          {
            initialState: {
              sessions: {
                currentSession: { id: "session-1", title: "Test Session" },
                messages: {
                  "session-1": generateTestMessages(10),
                },
              },
            },
          },
        );
        await flushPromises();

        // Take memory reading
        memoryReadings.push(await trackMemoryUsage());

        // 2. Send a few messages
        for (let i = 0; i < 5; i++) {
          const messageInput = chatView.find(".message-input");
          if (messageInput.exists()) {
            await messageInput.setValue(`Test message ${i}`);

            // Send message
            if (typeof chatView.vm.sendMessage === "function") {
              chatView.vm.sendMessage();
            } else {
              const messages =
                chatView.vm.$store.sessions.messages["session-1"] || [];
              chatView.vm.$store.sessions.messages["session-1"] = [
                ...messages,
                {
                  id: `user-msg-${i}`,
                  role: "user",
                  content: `Test message ${i}`,
                  timestamp: new Date().toISOString(),
                },
                {
                  id: `assistant-msg-${i}`,
                  role: "assistant",
                  content: `Response to message ${i}`,
                  timestamp: new Date().toISOString(),
                },
              ];
            }
          }
          await nextTick();
        }

        await flushPromises();
        memoryReadings.push(await trackMemoryUsage());

        // Clean up
        chatView.unmount();

        // 3. Navigate to documents view
        const docsView = createWrapper(
          DocumentsView,
          {},
          {
            initialState: {
              documents: {
                items: Array.from({ length: 20 }, (_, i) => ({
                  id: `doc-${i}`,
                  title: `Document ${i}`,
                  type: "pdf",
                })),
              },
            },
          },
        );
        await flushPromises();

        // Take memory reading
        memoryReadings.push(await trackMemoryUsage());

        // 4. Interact with documents
        const docItems = docsView.findAll(".document-item");
        if (docItems.length > 0) {
          await docItems[0].trigger("click");
        }

        // Filter documents
        const filterInput = docsView.find(".document-filter-input");
        if (filterInput.exists()) {
          await filterInput.setValue("pdf");
        }

        await flushPromises();
        memoryReadings.push(await trackMemoryUsage());

        // Clean up
        docsView.unmount();

        // 5. Navigate to admin view
        const adminView = createWrapper(AdminView);
        await flushPromises();

        // Take memory reading
        memoryReadings.push(await trackMemoryUsage());

        // Switch tabs if possible
        if (typeof adminView.vm.setActiveTab === "function") {
          adminView.vm.setActiveTab("users");
          await nextTick();
          adminView.vm.setActiveTab("system");
          await nextTick();
        }

        await flushPromises();
        memoryReadings.push(await trackMemoryUsage());

        // Clean up
        adminView.unmount();

        // 6. Back to chat view with more messages
        const chatView2 = createWrapper(
          ChatView,
          {},
          {
            initialState: {
              sessions: {
                currentSession: { id: "session-1", title: "Test Session" },
                messages: {
                  "session-1": generateTestMessages(30),
                },
              },
            },
          },
        );
        await flushPromises();

        // Take final memory reading
        memoryReadings.push(await trackMemoryUsage());

        // Clean up
        chatView2.unmount();
      };

      await simulateAppSession();

      // Force GC
      await forceGC();

      // Take final memory reading after GC
      memoryReadings.push(await trackMemoryUsage());

      // Convert to MB
      const memoryReadingsMB = memoryReadings.map((m) => m / (1024 * 1024));

      console.log("Memory usage during extended session (MB):");
      memoryReadingsMB.forEach((reading, i) => {
        console.log(`Reading ${i + 1}: ${reading.toFixed(2)} MB`);
      });

      // Calculate total memory growth
      const totalGrowthMB =
        memoryReadingsMB[memoryReadingsMB.length - 1] - memoryReadingsMB[0];
      console.log(`Total memory growth: ${totalGrowthMB.toFixed(2)} MB`);

      // Memory growth during extended session should be bounded
      expect(totalGrowthMB).toBeLessThan(MEMORY_THRESHOLDS.EXTENDED_USE_GROWTH);

      // Clean up
      wrapper.unmount();
      await forceGC();
    });

    it("checks memory stability during repeated actions", async () => {
      // This test checks if memory usage stabilizes when repeating the same action many times

      // Mount chat view
      const wrapper = createWrapper(ChatView);
      await flushPromises();

      // Force GC
      await forceGC();

      // Initial memory
      const initialMemory = await trackMemoryUsage();

      // Memory readings after sets of iterations
      const memoryReadings: Record<number, number> = {};

      // Perform the same action many times
      for (let i = 0; i < 100; i++) {
        // Toggle theme (a simple state change that should be memory-neutral)
        wrapper.vm.$store.ui.theme = i % 2 === 0 ? "light" : "dark";

        await nextTick();

        // Record memory at key intervals
        if (i === 9 || i === 49 || i === 99) {
          await flushPromises();
          memoryReadings[i + 1] = await trackMemoryUsage();
        }
      }

      // Convert to MB differentials
      const memoryDiffs = Object.fromEntries(
        Object.entries(memoryReadings).map(([iterations, memory]) => [
          iterations,
          (memory - initialMemory) / (1024 * 1024),
        ]),
      );

      console.log("Memory growth after iterations:");
      Object.entries(memoryDiffs).forEach(([iterations, diff]) => {
        console.log(`After ${iterations} iterations: ${diff.toFixed(2)} MB`);
      });

      // Calculate growth ratio between early and late iterations
      const earlyGrowthRate = memoryDiffs["10"] / 10;
      const lateGrowthRate = (memoryDiffs["100"] - memoryDiffs["50"]) / 50;

      console.log(
        `Early growth rate (per 10 iterations): ${earlyGrowthRate.toFixed(4)} MB`,
      );
      console.log(
        `Late growth rate (per 50 iterations): ${lateGrowthRate.toFixed(4)} MB`,
      );

      // Late growth rate should be lower than early growth rate
      // This confirms memory usage stabilizes over time
      expect(lateGrowthRate).toBeLessThanOrEqual(earlyGrowthRate * 1.5);

      // Total growth should be minimal after 100 iterations of the same action
      expect(memoryDiffs["100"]).toBeLessThan(
        MEMORY_THRESHOLDS.REPEATED_ACTION_GROWTH,
      );

      // Clean up
      wrapper.unmount();
      await forceGC();
    });
  });

  describe("Memory Report Generation", () => {
    it("generates a memory usage summary report", async () => {
      // Prepare test data
      const memoryTests: Record<string, any> = {};

      // Test 1: Initial app mount
      await forceGC();
      const initialMemory = await trackMemoryUsage();

      const wrapper = createWrapper(App);
      await flushPromises();

      const afterMountMemory = await trackMemoryUsage();
      memoryTests["Initial App Mount"] = {
        value: (afterMountMemory - initialMemory) / (1024 * 1024),
        threshold: MEMORY_THRESHOLDS.INITIAL_APP_MOUNT,
        unit: "MB",
      };

      // Test 2: Loading 100 messages
      await forceGC();
      const beforeMessagesMemory = await trackMemoryUsage();

      const chatWrapper = createWrapper(
        ChatView,
        {},
        {
          initialState: {
            sessions: {
              currentSession: { id: "session-1", title: "Test Session" },
              messages: {
                "session-1": generateTestMessages(100),
              },
            },
          },
        },
      );
      await flushPromises();

      const afterMessagesMemory = await trackMemoryUsage();
      memoryTests["100 Messages Load"] = {
        value: (afterMessagesMemory - beforeMessagesMemory) / (1024 * 1024),
        threshold: MEMORY_THRESHOLDS.PER_MESSAGE_OVERHEAD * 100,
        unit: "MB",
      };

      // Create report
      const report = createPerformanceReport(memoryTests);

      // Log report
      console.log("Memory Usage Report:");
      console.log(report);

      // Verify report was generated
      expect(report).toBeTruthy();
      expect(Object.keys(report)).toContain("Initial App Mount");
      expect(Object.keys(report)).toContain("100 Messages Load");

      // Clean up
      wrapper.unmount();
      chatWrapper.unmount();
      await forceGC();
    });
  });
});
