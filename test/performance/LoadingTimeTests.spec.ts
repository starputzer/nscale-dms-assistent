/**
 * Performance Tests for Loading Time and Time-to-Interactive
 *
 * These tests measure critical performance metrics for the application:
 * - Initial page load time
 * - Time to first meaningful paint
 * - Time to interactive
 * - Component mounting times
 * - Hydration performance
 *
 * Note: These tests use custom performance measuring utilities and should
 * be run in a controlled environment for consistent results.
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import { nextTick } from "vue";

// Import main application components
import App from "@/App.vue";
import ChatView from "@/views/ChatView.vue";
import AdminView from "@/views/AdminView.vue";
import SettingsView from "@/views/SettingsView.vue";
import DocumentsView from "@/views/DocumentsView.vue";

// Performance measurement utilities
import {
  startMeasurement,
  endMeasurement,
  measureFunctionTime,
  createPerformanceReport,
  trackMemoryUsage,
} from "../utils/performance-test-utils";

// Constants for performance thresholds
const PERFORMANCE_THRESHOLDS = {
  INITIAL_RENDER: 300, // ms
  TIME_TO_INTERACTIVE: 600, // ms
  COMPONENT_MOUNT: 150, // ms
  DATA_LOADING: 250, // ms
  USER_INTERACTION: 100, // ms
  ANIMATION_FRAME: 16, // ms (for 60 FPS)
};

// Mock router
vi.mock("vue-router", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    go: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
  useRoute: () => ({
    path: "/",
    name: "home",
    params: {},
    query: {},
  }),
}));

// Helper to create a wrapper with testing pinia
const createWrapper = (Component, props = {}, options = {}) => {
  return mount(Component, {
    props,
    global: {
      plugins: [
        createTestingPinia({
          createSpy: vi.fn,
          initialState: {
            ui: {
              theme: options.theme || "light",
              fontSize: options.fontSize || "medium",
              ...options.uiState,
            },
            auth: {
              currentUser: options.user || {
                id: "user-1",
                email: "user@example.com",
                role: "admin",
              },
              isAuthenticated:
                options.isAuthenticated !== undefined
                  ? options.isAuthenticated
                  : true,
            },
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

// Mock window.performance if not available
if (!window.performance) {
  window.performance = {
    mark: vi.fn(),
    measure: vi.fn(),
    getEntriesByName: () => [],
    getEntriesByType: () => [],
    clearMarks: vi.fn(),
    clearMeasures: vi.fn(),
    now: () => Date.now(),
  };
}

describe("Loading Time and Time-to-Interactive Performance Tests", () => {
  // Setup and teardown for all tests
  beforeAll(() => {
    // Initialize performance monitoring
    window.performance.clearMarks();
    window.performance.clearMeasures();

    // Create a performance observer if available
    if (typeof PerformanceObserver !== "undefined") {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          console.log(
            `Performance Entry: ${entry.name} - ${entry.startTime.toFixed(2)}ms to ${(entry.startTime + entry.duration).toFixed(2)}ms (${entry.duration.toFixed(2)}ms)`,
          );
        });
      });
      observer.observe({ entryTypes: ["measure"] });
    }
  });

  afterAll(() => {
    // Clean up performance measurements
    window.performance.clearMarks();
    window.performance.clearMeasures();
  });

  beforeEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up DOM
    document.body.innerHTML = "";
  });

  describe("Initial Application Loading", () => {
    it("measures initial application render time", async () => {
      // Start timing
      startMeasurement("app-initial-render");

      // Mount the App component
      const wrapper = createWrapper(App);

      // Wait for initial render
      await nextTick();
      await flushPromises();

      // End timing
      const duration = endMeasurement("app-initial-render");

      // Log and assert
      console.log(`App initial render time: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.INITIAL_RENDER);

      // Check that critical elements are present
      expect(wrapper.find("header").exists()).toBe(true);
      expect(wrapper.find("main").exists()).toBe(true);
    });

    it("measures time to interactive", async () => {
      // Start timing
      startMeasurement("time-to-interactive");

      // Mount the App component
      const wrapper = createWrapper(App);

      // Wait for initial render
      await nextTick();

      // Simulate data loading and hydration
      await flushPromises();

      // Simulate user interaction readiness
      // This represents when all event handlers are attached and ready
      const interactivePromise = new Promise((resolve) => {
        setTimeout(resolve, 50); // Simulate event handlers being attached
      });
      await interactivePromise;

      // End timing
      const duration = endMeasurement("time-to-interactive");

      // Log and assert
      console.log(`Time to interactive: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.TIME_TO_INTERACTIVE);

      // Verify interactivity by triggering an event
      const button = wrapper.find("button");
      if (button.exists()) {
        const clickDuration = await measureFunctionTime(async () => {
          await button.trigger("click");
          await nextTick();
        });

        console.log(
          `Button click response time: ${clickDuration.toFixed(2)}ms`,
        );
        expect(clickDuration).toBeLessThan(
          PERFORMANCE_THRESHOLDS.USER_INTERACTION,
        );
      }
    });

    it("measures critical CSS rendering", async () => {
      // Start timing
      startMeasurement("critical-css-rendering");

      // Mount the App component
      const wrapper = createWrapper(App);

      // Wait for styles to be applied
      await nextTick();

      // End timing
      const duration = endMeasurement("critical-css-rendering");

      // Log and assert
      console.log(`Critical CSS rendering time: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.INITIAL_RENDER / 2);

      // Check computed styles on key elements
      const mainElement = wrapper.find("main").element;
      const computedStyle = window.getComputedStyle(mainElement);

      // Ensure critical styles are applied
      expect(computedStyle.display).not.toBe("");
      expect(computedStyle.position).not.toBe("");
    });
  });

  describe("View Component Loading", () => {
    it("measures ChatView mounting performance", async () => {
      // Mock chat messages for realistic rendering
      const mockMessages = Array.from({ length: 10 }, (_, i) => ({
        id: `msg-${i}`,
        role: i % 2 === 0 ? "user" : "assistant",
        content: `Test message ${i} with content long enough to be realistic`,
        timestamp: new Date().toISOString(),
      }));

      // Start timing
      startMeasurement("chat-view-mount");

      // Mount ChatView with messages
      const wrapper = createWrapper(
        ChatView,
        {},
        {
          initialState: {
            sessions: {
              currentSession: { id: "session-1", title: "Test Session" },
              messages: {
                "session-1": mockMessages,
              },
              isStreaming: false,
            },
          },
        },
      );

      // Wait for mount to complete
      await nextTick();
      await flushPromises();

      // End timing
      const duration = endMeasurement("chat-view-mount");

      // Log and assert
      console.log(`ChatView mount time: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.COMPONENT_MOUNT);

      // Check that messages are rendered
      const messageElements = wrapper.findAll(".message-item");
      expect(messageElements.length).toBe(mockMessages.length);
    });

    it("measures DocumentsView mounting performance", async () => {
      // Mock documents for realistic rendering
      const mockDocuments = Array.from({ length: 15 }, (_, i) => ({
        id: `doc-${i}`,
        title: `Document ${i}`,
        type: i % 3 === 0 ? "pdf" : i % 3 === 1 ? "docx" : "xlsx",
        size: Math.floor(Math.random() * 1000000),
        created: new Date().toISOString(),
      }));

      // Start timing
      startMeasurement("documents-view-mount");

      // Mount DocumentsView with documents
      const wrapper = createWrapper(
        DocumentsView,
        {},
        {
          initialState: {
            documents: {
              items: mockDocuments,
              isLoading: false,
            },
          },
        },
      );

      // Wait for mount to complete
      await nextTick();
      await flushPromises();

      // End timing
      const duration = endMeasurement("documents-view-mount");

      // Log and assert
      console.log(`DocumentsView mount time: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.COMPONENT_MOUNT);

      // Check that documents are rendered
      const documentElements = wrapper.findAll(".document-item");
      expect(documentElements.length).toBe(mockDocuments.length);
    });

    it("measures AdminView mounting performance", async () => {
      // Mock admin data for realistic rendering
      const mockUsers = Array.from({ length: 20 }, (_, i) => ({
        id: `user-${i}`,
        email: `user${i}@example.com`,
        role: i % 5 === 0 ? "admin" : "user",
        lastActive: new Date().toISOString(),
      }));

      const mockSystemInfo = {
        version: "3.5.2",
        uptime: 1522300,
        totalUsers: 156,
        activeSessions: 23,
        cpuUsage: 32,
        memoryUsage: 68,
        diskUsage: 45,
      };

      // Start timing
      startMeasurement("admin-view-mount");

      // Mount AdminView with data
      const wrapper = createWrapper(
        AdminView,
        {},
        {
          initialState: {
            admin: {
              users: mockUsers,
              systemInfo: mockSystemInfo,
              isLoading: false,
            },
          },
        },
      );

      // Wait for mount to complete
      await nextTick();
      await flushPromises();

      // End timing
      const duration = endMeasurement("admin-view-mount");

      // Log and assert
      console.log(`AdminView mount time: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(
        PERFORMANCE_THRESHOLDS.COMPONENT_MOUNT * 1.5,
      ); // Admin view is more complex

      // Check that admin components are rendered
      expect(wrapper.find(".admin-panel").exists()).toBe(true);
    });

    it("measures SettingsView mounting performance", async () => {
      // Start timing
      startMeasurement("settings-view-mount");

      // Mount SettingsView
      const wrapper = createWrapper(SettingsView, { isVisible: true });

      // Wait for mount to complete
      await nextTick();
      await flushPromises();

      // End timing
      const duration = endMeasurement("settings-view-mount");

      // Log and assert
      console.log(`SettingsView mount time: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.COMPONENT_MOUNT);

      // Check that settings components are rendered
      expect(wrapper.find(".settings-panel").exists()).toBe(true);
    });
  });

  describe("Data Loading Performance", () => {
    it("measures chat history loading performance", async () => {
      // Generate a large message history
      const largeChatHistory = Array.from({ length: 50 }, (_, i) => ({
        id: `msg-${i}`,
        role: i % 2 === 0 ? "user" : "assistant",
        content: `Message ${i} with content that is long enough to be realistic for a typical conversation. This includes formatting and potentially longer paragraphs that might appear in real usage.`,
        timestamp: new Date(Date.now() - (50 - i) * 60000).toISOString(),
      }));

      // Prepare store with empty messages
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

      // Wait for initial mount
      await flushPromises();

      // Measure time to update store and render messages
      const loadDuration = await measureFunctionTime(async () => {
        // Update store with large message history
        wrapper.vm.$store.sessions.messages["session-1"] = largeChatHistory;

        // Wait for DOM updates
        await nextTick();
        await flushPromises();
      });

      // Log and assert
      console.log(`Large chat history load time: ${loadDuration.toFixed(2)}ms`);
      expect(loadDuration).toBeLessThan(
        PERFORMANCE_THRESHOLDS.DATA_LOADING * 2,
      ); // Adjusted for large dataset

      // Verify messages were rendered
      const messageElements = wrapper.findAll(".message-item");
      expect(messageElements.length).toBe(largeChatHistory.length);
    });

    it("measures document list loading performance", async () => {
      // Generate a large document list
      const largeDocumentList = Array.from({ length: 100 }, (_, i) => ({
        id: `doc-${i}`,
        title: `Document ${i} with a reasonably long title that might contain specific details`,
        type: ["pdf", "docx", "xlsx", "pptx", "txt"][i % 5],
        size: Math.floor(Math.random() * 10000000),
        created: new Date(Date.now() - (100 - i) * 3600000).toISOString(),
        tags: Array.from(
          { length: Math.floor(Math.random() * 5) + 1 },
          (_, j) => `tag-${j}`,
        ),
      }));

      // Prepare wrapper with empty document list
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

      // Wait for initial mount
      await flushPromises();

      // Measure time to update store and render documents
      const loadDuration = await measureFunctionTime(async () => {
        // Update store with large document list
        wrapper.vm.$store.documents.items = largeDocumentList;

        // Wait for DOM updates
        await nextTick();
        await flushPromises();
      });

      // Log and assert
      console.log(
        `Large document list load time: ${loadDuration.toFixed(2)}ms`,
      );
      expect(loadDuration).toBeLessThan(
        PERFORMANCE_THRESHOLDS.DATA_LOADING * 3,
      ); // Adjusted for large dataset

      // Check rendered documents (may be virtualized if implemented)
      const documentElements = wrapper.findAll(".document-item");
      expect(documentElements.length).toBeGreaterThan(0);
    });
  });

  describe("User Interaction Performance", () => {
    it("measures input field responsiveness", async () => {
      const wrapper = createWrapper(ChatView);
      await flushPromises();

      const messageInput = wrapper.find(".message-input");
      expect(messageInput.exists()).toBe(true);

      // Measure time to update input with a long string
      const longText =
        "This is a long message that a user might type into the chat interface. It contains multiple sentences and should be long enough to test the performance of the input field when handling larger amounts of text input. This simulates a user typing quickly or pasting content.";

      const inputDuration = await measureFunctionTime(async () => {
        await messageInput.setValue(longText);
        await nextTick();
      });

      // Log and assert
      console.log(`Input field update time: ${inputDuration.toFixed(2)}ms`);
      expect(inputDuration).toBeLessThan(
        PERFORMANCE_THRESHOLDS.USER_INTERACTION,
      );

      // Verify the input was updated
      expect(messageInput.element.value).toBe(longText);
    });

    it("measures button click responsiveness", async () => {
      const wrapper = createWrapper(App);
      await flushPromises();

      // Find a button
      const button = wrapper.find("button");
      expect(button.exists()).toBe(true);

      // Create a spy for click handler
      const clickSpy = vi.fn();
      button.element.addEventListener("click", clickSpy);

      // Measure time to process click
      const clickDuration = await measureFunctionTime(async () => {
        await button.trigger("click");
        await nextTick();
      });

      // Log and assert
      console.log(`Button click response time: ${clickDuration.toFixed(2)}ms`);
      expect(clickDuration).toBeLessThan(
        PERFORMANCE_THRESHOLDS.USER_INTERACTION,
      );

      // Verify the click was processed
      expect(clickSpy).toHaveBeenCalled();
    });

    it("measures theme switching performance", async () => {
      const wrapper = createWrapper(
        App,
        {},
        {
          initialState: {
            ui: {
              theme: "light",
            },
          },
        },
      );
      await flushPromises();

      // Measure time to switch theme
      const switchDuration = await measureFunctionTime(async () => {
        // Update theme in store
        wrapper.vm.$store.ui.theme = "dark";

        // Wait for DOM updates and style recalculation
        await nextTick();
        await flushPromises();
      });

      // Log and assert
      console.log(`Theme switch time: ${switchDuration.toFixed(2)}ms`);
      expect(switchDuration).toBeLessThan(
        PERFORMANCE_THRESHOLDS.USER_INTERACTION * 2,
      ); // Theme switching is more expensive

      // Verify theme was applied
      expect(document.documentElement.classList.contains("theme-dark")).toBe(
        true,
      );
    });
  });

  describe("Animation Frame Performance", () => {
    it("measures performance during scrolling", async () => {
      // Create a component with large scrollable content
      const wrapper = createWrapper(
        ChatView,
        {},
        {
          initialState: {
            sessions: {
              currentSession: { id: "session-1", title: "Test Session" },
              messages: {
                "session-1": Array.from({ length: 100 }, (_, i) => ({
                  id: `msg-${i}`,
                  role: i % 2 === 0 ? "user" : "assistant",
                  content: `Test message ${i}`,
                  timestamp: new Date().toISOString(),
                })),
              },
            },
          },
        },
      );

      await flushPromises();

      const messageList = wrapper.find(".message-list");
      expect(messageList.exists()).toBe(true);

      // Measure frame time during scroll
      const frameTimings = [];

      // Mock requestAnimationFrame
      let lastTime = performance.now();
      const originalRAF = window.requestAnimationFrame;
      window.requestAnimationFrame = (callback) => {
        const now = performance.now();
        const frameDuration = now - lastTime;
        frameTimings.push(frameDuration);
        lastTime = now;
        return setTimeout(() => callback(now), 16); // Simulate 60fps
      };

      // Trigger scroll events
      await measureFunctionTime(async () => {
        for (let i = 0; i < 10; i++) {
          messageList.element.scrollTop += 100;
          await new Promise((resolve) => setTimeout(resolve, 16)); // Wait for next frame
        }
      });

      // Restore original requestAnimationFrame
      window.requestAnimationFrame = originalRAF;

      // Calculate average frame time
      const avgFrameTime =
        frameTimings.reduce((sum, time) => sum + time, 0) / frameTimings.length;

      // Log and assert
      console.log(
        `Average frame time during scroll: ${avgFrameTime.toFixed(2)}ms`,
      );
      expect(avgFrameTime).toBeLessThan(
        PERFORMANCE_THRESHOLDS.ANIMATION_FRAME * 2,
      ); // Some flexibility for test environment
    });
  });

  describe("Memory Usage", () => {
    it("measures memory usage during component mounting", async () => {
      // Start memory tracking
      const memoryBefore = await trackMemoryUsage();

      // Mount a complex component
      const wrapper = createWrapper(App);
      await flushPromises();

      // Measure memory after mount
      const memoryAfter = await trackMemoryUsage();

      // Calculate difference
      const memoryDiff = memoryAfter - memoryBefore;

      // Log memory usage
      console.log(
        `Memory usage for App mount: ${(memoryDiff / 1024 / 1024).toFixed(2)} MB`,
      );

      // We don't assert on exact memory usage as it varies by environment,
      // but we log it for tracking purposes
    });
  });

  describe("Performance Report Generation", () => {
    it("generates a performance summary report", async () => {
      // Perform a series of operations to measure

      // 1. Initial render
      const initialRenderTime = await measureFunctionTime(async () => {
        const wrapper = createWrapper(App);
        await nextTick();
        await flushPromises();
      });

      // 2. Component mount
      const componentMountTime = await measureFunctionTime(async () => {
        const wrapper = createWrapper(ChatView);
        await nextTick();
        await flushPromises();
      });

      // 3. Data loading
      const dataLoadingTime = await measureFunctionTime(async () => {
        const wrapper = createWrapper(
          DocumentsView,
          {},
          {
            initialState: { documents: { items: [] } },
          },
        );
        await flushPromises();

        wrapper.vm.$store.documents.items = Array.from(
          { length: 20 },
          (_, i) => ({
            id: `doc-${i}`,
            title: `Document ${i}`,
            type: "pdf",
          }),
        );

        await nextTick();
        await flushPromises();
      });

      // 4. User interaction
      const userInteractionTime = await measureFunctionTime(async () => {
        const wrapper = createWrapper(ChatView);
        await flushPromises();

        const input = wrapper.find(".message-input");
        await input.setValue("Test message");
        await nextTick();
      });

      // Generate report
      const report = createPerformanceReport({
        "Initial Render": {
          value: initialRenderTime,
          threshold: PERFORMANCE_THRESHOLDS.INITIAL_RENDER,
          unit: "ms",
        },
        "Component Mount": {
          value: componentMountTime,
          threshold: PERFORMANCE_THRESHOLDS.COMPONENT_MOUNT,
          unit: "ms",
        },
        "Data Loading": {
          value: dataLoadingTime,
          threshold: PERFORMANCE_THRESHOLDS.DATA_LOADING,
          unit: "ms",
        },
        "User Interaction": {
          value: userInteractionTime,
          threshold: PERFORMANCE_THRESHOLDS.USER_INTERACTION,
          unit: "ms",
        },
      });

      // Log the report
      console.log("Performance Report:");
      console.log(report);

      // At least check that the report was generated
      expect(report).toBeTruthy();
      expect(Object.keys(report)).toContain("Initial Render");
      expect(Object.keys(report)).toContain("Component Mount");
      expect(Object.keys(report)).toContain("Data Loading");
      expect(Object.keys(report)).toContain("User Interaction");
    });
  });
});
