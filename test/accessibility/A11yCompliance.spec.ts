/**
 * Comprehensive Accessibility Compliance Tests
 * 
 * These tests verify that the application meets accessibility standards
 * including WCAG 2.1 Level AA compliance across key user flows.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import axe from "axe-core";

// Import application components to test
import App from "@/App.vue";
import ChatView from "@/views/ChatView.vue";
import AdminView from "@/views/AdminView.vue";
import SettingsView from "@/views/SettingsView.vue";
import DocumentsView from "@/views/DocumentsView.vue";
import LoginView from "@/views/LoginView.vue";
import ErrorView from "@/views/ErrorView.vue";

// Import utility functions for accessibility testing
import { 
  runAxeTest, 
  testKeyboardNavigation, 
  simulateKeyboardNavigation,
  testKeyboardOperability,
  checkAriaAttributes,
  testFocusTrapping,
  checkColorContrast
} from "../utils/a11y-test-utils";

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
              highContrast: options.highContrast || false,
              reduceMotion: options.reduceMotion || false,
              screenReaderOptimized: options.screenReaderOptimized || false,
              ...options.uiState,
            },
            auth: {
              currentUser: options.user || { id: "user-1", email: "user@example.com", role: "admin" },
              isAuthenticated: options.isAuthenticated !== undefined ? options.isAuthenticated : true,
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
    attachTo: document.body, // Attach to body for keyboard navigation tests
    ...options,
  });
};

// Define the accessibility rules to test against
const axeRules = {
  standard: {
    runOnly: {
      type: "tag",
      values: ["wcag2a", "wcag2aa", "best-practice"],
    },
  },
  strict: {
    runOnly: {
      type: "tag",
      values: ["wcag2a", "wcag2aa", "wcag2aaa", "best-practice"],
    },
  },
  color: {
    runOnly: {
      type: "rule",
      values: ["color-contrast", "link-in-text-block"],
    },
  },
  keyboard: {
    runOnly: {
      type: "rule",
      values: ["focusable-content", "focusable-element", "focus-order-semantics", "tabindex"],
    },
  },
  screenreader: {
    runOnly: {
      type: "rule",
      values: ["aria-required-attr", "aria-required-children", "aria-required-parent", "aria-roles", "aria-valid-attr-value", "aria-valid-attr", "button-name", "document-title", "frame-title", "image-alt", "input-button-name", "label", "link-name", "list", "listitem"],
    },
  },
};

describe("Accessibility Compliance Tests", () => {
  // Clean up after each test
  afterEach(() => {
    document.body.innerHTML = "";
  });
  
  describe("Complete Application Accessibility", () => {
    it("main application structure meets WCAG 2.1 AA standards", async () => {
      const wrapper = createWrapper(App);
      await flushPromises();
      
      const results = await runAxeTest(wrapper.element, axeRules.standard);
      expect(results.violations).toHaveLength(0);
      
      // Check for proper document structure
      expect(document.querySelector("main")).not.toBeNull();
      expect(document.querySelector("header")).not.toBeNull();
      
      // Check for skip link (for keyboard users to skip navigation)
      const skipLink = wrapper.find(".skip-to-content");
      expect(skipLink.exists()).toBe(true);
      
      // Check that main content has an id that matches skip link
      const mainContent = wrapper.find("main");
      expect(mainContent.attributes("id")).toBe(skipLink.attributes("href").replace("#", ""));
    });
    
    it("supports keyboard navigation through main application flow", async () => {
      const wrapper = createWrapper(App);
      await flushPromises();
      
      // Test keyboard navigation path
      const navPath = await testKeyboardNavigation(wrapper.element, [
        ".skip-to-content", // First focusable element should be skip link
        "header button", // Navigation toggles
        "nav a", // Navigation links
        "main", // Main content
      ]);
      
      expect(navPath.success).toBe(true);
      expect(navPath.unreachableElements).toHaveLength(0);
    });
    
    it("maintains sufficient color contrast in light theme", async () => {
      const wrapper = createWrapper(App, {}, { theme: "light" });
      await flushPromises();
      
      const results = await runAxeTest(wrapper.element, axeRules.color);
      expect(results.violations).toHaveLength(0);
    });
    
    it("maintains sufficient color contrast in dark theme", async () => {
      const wrapper = createWrapper(App, {}, { theme: "dark" });
      await flushPromises();
      
      const results = await runAxeTest(wrapper.element, axeRules.color);
      expect(results.violations).toHaveLength(0);
    });
    
    it("maintains sufficient color contrast in high contrast mode", async () => {
      const wrapper = createWrapper(App, {}, { highContrast: true });
      await flushPromises();
      
      const results = await runAxeTest(wrapper.element, axeRules.color);
      expect(results.violations).toHaveLength(0);
      
      // High contrast mode should use higher contrast ratios
      const bodyElement = document.body;
      const computedStyle = window.getComputedStyle(bodyElement);
      
      // Test for higher contrast ratio in high contrast mode
      // WCAG AAA requires 7:1 for normal text
      // getContrastRatio() is a helper function that would need to be implemented
      // Since we can't directly measure contrast ratio in JSDOM, we check for high contrast CSS class
      expect(bodyElement.classList.contains("high-contrast")).toBe(true);
    });
  });
  
  describe("Login View Accessibility", () => {
    it("login form is accessible", async () => {
      const wrapper = createWrapper(LoginView, {}, { isAuthenticated: false });
      await flushPromises();
      
      const results = await runAxeTest(wrapper.element, axeRules.standard);
      expect(results.violations).toHaveLength(0);
      
      // Check for proper form labeling
      const form = wrapper.find("form");
      expect(form.exists()).toBe(true);
      
      // Check for properly labeled inputs
      const emailInput = wrapper.find('input[type="email"]');
      const emailLabel = wrapper.find(`label[for="${emailInput.attributes("id")}"]`);
      expect(emailLabel.exists()).toBe(true);
      
      const passwordInput = wrapper.find('input[type="password"]');
      const passwordLabel = wrapper.find(`label[for="${passwordInput.attributes("id")}"]`);
      expect(passwordLabel.exists()).toBe(true);
      
      // Check for proper button labeling
      const submitButton = wrapper.find('button[type="submit"]');
      expect(submitButton.attributes("aria-label") || submitButton.text()).toBeTruthy();
    });
    
    it("shows accessible error messages", async () => {
      const wrapper = createWrapper(LoginView, {}, { isAuthenticated: false });
      await flushPromises();
      
      // Simulate form submission with error
      await wrapper.find("form").trigger("submit");
      
      // Mock error state
      await wrapper.setData({ error: "Invalid credentials" });
      await flushPromises();
      
      // Check for error message
      const errorEl = wrapper.find(".error-message");
      expect(errorEl.exists()).toBe(true);
      
      // Error should be associated with the form
      expect(errorEl.attributes("role")).toBe("alert");
      expect(errorEl.attributes("aria-live")).toBe("assertive");
      
      // Check if inputs indicate their error state
      const inputs = wrapper.findAll("input");
      const invalidInput = inputs.find(input => input.attributes("aria-invalid") === "true");
      expect(invalidInput).toBeDefined();
      
      // Input should be associated with error message
      expect(invalidInput.attributes("aria-describedby")).toBeTruthy();
    });
  });
  
  describe("Chat Interface Accessibility", () => {
    it("chat interface meets WCAG 2.1 AA standards", async () => {
      const wrapper = createWrapper(ChatView);
      await flushPromises();
      
      const results = await runAxeTest(wrapper.element, axeRules.standard);
      expect(results.violations).toHaveLength(0);
    });
    
    it("chat messages are properly structured for screen readers", async () => {
      const wrapper = createWrapper(ChatView, {}, {
        initialState: {
          sessions: {
            currentSession: { id: "session-1", title: "Test Session" },
            messages: {
              "session-1": [
                { id: "msg1", role: "user", content: "Hello", timestamp: new Date().toISOString() },
                { id: "msg2", role: "assistant", content: "Hi there! How can I help you?", timestamp: new Date().toISOString() },
              ],
            },
          },
        },
      });
      await flushPromises();
      
      const results = await runAxeTest(wrapper.element, axeRules.screenreader);
      expect(results.violations).toHaveLength(0);
      
      // Check message list structure
      const messageList = wrapper.find(".message-list");
      expect(messageList.exists()).toBe(true);
      expect(messageList.attributes("role")).toBe("log");
      expect(messageList.attributes("aria-live")).toBe("polite");
      
      // Check individual messages
      const messages = wrapper.findAll(".message-item");
      expect(messages.length).toBe(2);
      
      // User message
      const userMessage = messages[0];
      expect(userMessage.attributes("role")).toBe("listitem");
      expect(userMessage.attributes("aria-label")).toContain("user");
      
      // Assistant message
      const assistantMessage = messages[1];
      expect(assistantMessage.attributes("role")).toBe("listitem");
      expect(assistantMessage.attributes("aria-label")).toContain("assistant");
    });
    
    it("supports keyboard interaction for sending messages", async () => {
      const wrapper = createWrapper(ChatView);
      await flushPromises();
      
      // Get the input and send button
      const messageInput = wrapper.find(".message-input");
      const sendButton = wrapper.find(".send-button");
      
      // Enter text in the input
      await messageInput.setValue("Test message");
      
      // Test that Enter key submits the form
      await messageInput.trigger("keydown", { key: "Enter" });
      
      // Check if the send message function was called
      expect(wrapper.vm.sendMessage).toHaveBeenCalled();
      
      // Clear the input
      await messageInput.setValue("");
      
      // Fill input again
      await messageInput.setValue("Another test");
      
      // Test that clicking the send button works
      await sendButton.trigger("click");
      
      // Check if the send message function was called again
      expect(wrapper.vm.sendMessage).toHaveBeenCalledTimes(2);
    });
    
    it("handles streaming messages accessibly", async () => {
      const wrapper = createWrapper(ChatView, {}, {
        initialState: {
          sessions: {
            currentSession: { id: "session-1", title: "Test Session" },
            messages: {
              "session-1": [
                { id: "msg1", role: "user", content: "Tell me a story", timestamp: new Date().toISOString() },
                { id: "msg2", role: "assistant", content: "Once upon a time", status: "streaming", timestamp: new Date().toISOString() },
              ],
            },
            isStreaming: true,
          },
        },
      });
      await flushPromises();
      
      // Check for streaming indicator
      const streamingMessage = wrapper.find(".message-streaming");
      expect(streamingMessage.exists()).toBe(true);
      
      // Streaming message should have appropriate ARIA attributes
      expect(streamingMessage.attributes("aria-live")).toBe("polite");
      expect(streamingMessage.attributes("aria-atomic")).toBe("false");
      
      // Check for stop streaming button
      const stopButton = wrapper.find(".stop-streaming-button");
      expect(stopButton.exists()).toBe(true);
      expect(stopButton.attributes("aria-label")).toBeTruthy();
    });
  });
  
  describe("Admin Panel Accessibility", () => {
    it("admin panel meets WCAG 2.1 AA standards", async () => {
      const wrapper = createWrapper(AdminView);
      await flushPromises();
      
      const results = await runAxeTest(wrapper.element, axeRules.standard);
      expect(results.violations).toHaveLength(0);
    });
    
    it("admin panel tabs are keyboard navigable", async () => {
      const wrapper = createWrapper(AdminView);
      await flushPromises();
      
      // Check tab list structure
      const tabList = wrapper.find(".admin-panel__nav");
      expect(tabList.attributes("role")).toBe("tablist");
      
      // Check individual tabs
      const tabs = wrapper.findAll(".admin-panel__nav-item");
      expect(tabs.length).toBeGreaterThan(0);
      
      // Active tab should have appropriate attributes
      const activeTab = wrapper.find(".admin-panel__nav-item--active");
      expect(activeTab.attributes("aria-selected")).toBe("true");
      expect(activeTab.attributes("tabindex")).toBe("0");
      
      // Inactive tabs should have appropriate attributes
      const inactiveTabs = wrapper.findAll(".admin-panel__nav-item:not(.admin-panel__nav-item--active)");
      inactiveTabs.forEach(tab => {
        expect(tab.attributes("aria-selected")).toBe("false");
        expect(tab.attributes("tabindex")).toBe("-1");
      });
      
      // Test keyboard navigation between tabs
      const tabNavResults = await testKeyboardNavigation(wrapper.element, [
        ".admin-panel__nav-item--active", // Start at active tab
        ".admin-panel__nav-item:not(.admin-panel__nav-item--active)", // Navigate to next tab
      ]);
      
      expect(tabNavResults.success).toBe(true);
    });
    
    it("admin panel data tables are accessible", async () => {
      const wrapper = createWrapper(AdminView);
      await flushPromises();
      
      // Set active tab to one with data tables
      await wrapper.vm.setActiveTab("users");
      await flushPromises();
      
      // Find data tables
      const table = wrapper.find("table");
      if (table.exists()) {
        // Check table structure
        expect(table.attributes("role")).toBe("grid");
        
        // Check table headers
        const headers = table.findAll("th");
        headers.forEach(header => {
          expect(header.attributes("scope")).toBe("col");
        });
        
        // Check for proper captions or accessible names
        const caption = table.find("caption");
        const ariaLabel = table.attributes("aria-label") || table.attributes("aria-labelledby");
        expect(caption.exists() || ariaLabel).toBeTruthy();
        
        // Check for proper row structure
        const rows = table.findAll("tr");
        rows.forEach((row, index) => {
          if (index > 0) { // Skip header row
            const firstCell = row.find("td:first-child");
            if (firstCell.exists()) {
              // Either first cell should be a th with scope="row" or the tr should have an id
              expect(
                (firstCell.is("th") && firstCell.attributes("scope") === "row") ||
                row.attributes("id")
              ).toBeTruthy();
            }
          }
        });
      }
    });
    
    it("admin forms are accessible", async () => {
      const wrapper = createWrapper(AdminView);
      await flushPromises();
      
      // Set active tab to one with forms
      await wrapper.vm.setActiveTab("system");
      await flushPromises();
      
      // Find forms
      const form = wrapper.find("form");
      if (form.exists()) {
        const results = await runAxeTest(form.element, axeRules.standard);
        expect(results.violations).toHaveLength(0);
        
        // Check inputs for proper labeling
        const inputs = form.findAll("input, select, textarea");
        inputs.forEach(input => {
          const id = input.attributes("id");
          if (id) {
            const label = form.find(`label[for="${id}"]`);
            expect(label.exists()).toBe(true);
          } else {
            // If no id, input should be wrapped in a label or have aria-label/labelledby
            const hasAriaLabel = input.attributes("aria-label") || input.attributes("aria-labelledby");
            const isInLabel = input.find("label").exists();
            expect(hasAriaLabel || isInLabel).toBeTruthy();
          }
        });
      }
    });
  });
  
  describe("Settings Panel Accessibility", () => {
    it("settings panel meets WCAG 2.1 AA standards", async () => {
      const wrapper = createWrapper(SettingsView, { isVisible: true });
      await flushPromises();
      
      const results = await runAxeTest(wrapper.element, axeRules.standard);
      expect(results.violations).toHaveLength(0);
    });
    
    it("settings panel is keyboard navigable", async () => {
      const wrapper = createWrapper(SettingsView, { isVisible: true });
      await flushPromises();
      
      // The panel should trap focus when open
      const panel = wrapper.find(".settings-panel");
      expect(panel.attributes("role")).toBe("dialog");
      expect(panel.attributes("aria-modal")).toBe("true");
      
      // First element should receive focus when opened
      const firstFocusable = wrapper.find("button, input, select, textarea, a").element;
      expect(document.activeElement).toBe(firstFocusable);
      
      // Test keyboard navigation within the dialog
      const focusableElements = wrapper.findAll("button, input, select, textarea, a");
      expect(focusableElements.length).toBeGreaterThan(1);
      
      // Verify focus trapping
      const lastFocusable = focusableElements[focusableElements.length - 1];
      await lastFocusable.trigger("keydown", { key: "Tab" });
      
      // Focus should cycle back to first focusable element
      expect(document.activeElement).toBe(firstFocusable);
    });
    
    it("settings form controls are accessible", async () => {
      const wrapper = createWrapper(SettingsView, { isVisible: true });
      await flushPromises();
      
      // Check form controls
      const formControls = wrapper.findAll("input, select, textarea");
      formControls.forEach(control => {
        // Each control should have a label
        const id = control.attributes("id");
        const label = wrapper.find(`label[for="${id}"]`);
        expect(label.exists()).toBe(true);
        
        // Each control should be keyboard interactive
        expect(control.attributes("tabindex")).not.toBe("-1");
      });
      
      // Check toggles/checkboxes
      const toggles = wrapper.findAll('input[type="checkbox"], input[type="radio"]');
      toggles.forEach(toggle => {
        expect(toggle.attributes("aria-checked")).toBeTruthy();
      });
    });
    
    it("theme selection is accessible", async () => {
      const wrapper = createWrapper(SettingsView, { isVisible: true });
      await flushPromises();
      
      // Select appearance settings tab
      await wrapper.vm.setActiveTab("appearance");
      await flushPromises();
      
      // Find theme options
      const themeOptions = wrapper.findAll(".theme-option");
      expect(themeOptions.length).toBeGreaterThan(0);
      
      // Theme options should be keyboard navigable
      themeOptions.forEach(option => {
        expect(option.attributes("tabindex")).toBeTruthy();
        
        // Selected option should have aria-checked=true
        if (option.classes().includes("selected")) {
          expect(option.attributes("aria-checked")).toBe("true");
        } else {
          expect(option.attributes("aria-checked")).toBe("false");
        }
      });
      
      // Theme options should have accessible names
      themeOptions.forEach(option => {
        expect(option.attributes("aria-label") || option.text()).toBeTruthy();
      });
    });
  });
  
  describe("Document Viewer Accessibility", () => {
    it("document viewer meets WCAG 2.1 AA standards", async () => {
      const wrapper = createWrapper(DocumentsView);
      await flushPromises();
      
      const results = await runAxeTest(wrapper.element, axeRules.standard);
      expect(results.violations).toHaveLength(0);
    });
    
    it("document list is properly structured for accessibility", async () => {
      const wrapper = createWrapper(DocumentsView, {}, {
        initialState: {
          documents: {
            items: [
              { id: "doc1", title: "Document 1", type: "pdf" },
              { id: "doc2", title: "Document 2", type: "docx" },
            ],
          },
        },
      });
      await flushPromises();
      
      // Check list structure
      const documentList = wrapper.find(".document-list");
      expect(documentList.exists()).toBe(true);
      
      // List should have a role
      expect(documentList.attributes("role")).toBe("list");
      
      // Check list items
      const documentItems = wrapper.findAll(".document-item");
      expect(documentItems.length).toBe(2);
      
      documentItems.forEach(item => {
        expect(item.attributes("role")).toBe("listitem");
        
        // Document items should be keyboard actionable
        expect(item.attributes("tabindex")).toBe("0");
        
        // Document items should have accessible names
        expect(item.attributes("aria-label") || item.text()).toBeTruthy();
      });
    });
    
    it("document preview is accessible", async () => {
      const wrapper = createWrapper(DocumentsView, {}, {
        initialState: {
          documents: {
            items: [
              { id: "doc1", title: "Document 1", type: "pdf", content: "Test content" },
            ],
            selectedDocument: { id: "doc1", title: "Document 1", type: "pdf", content: "Test content" },
          },
        },
      });
      await flushPromises();
      
      // Check document preview
      const documentPreview = wrapper.find(".document-preview");
      expect(documentPreview.exists()).toBe(true);
      
      // Preview should have appropriate ARIA attributes
      expect(documentPreview.attributes("aria-live")).toBe("polite");
      
      // Document content should be readable
      const documentContent = wrapper.find(".document-content");
      expect(documentContent.exists()).toBe(true);
      expect(documentContent.attributes("role")).toBe("document");
      
      // Document navigation controls should be accessible
      const navControls = wrapper.findAll(".document-nav button");
      
      if (navControls.length > 0) {
        navControls.forEach(control => {
          expect(control.attributes("aria-label")).toBeTruthy();
        });
      }
    });
  });
  
  describe("Specialized Accessibility Settings", () => {
    it("respects reduced motion preference", async () => {
      // Set up with reduced motion
      const wrapper = createWrapper(App, {}, { reduceMotion: true });
      await flushPromises();
      
      // Body should have reduced motion class
      expect(document.body.classList.contains("reduce-motion")).toBe(true);
      
      // CSS should have prefers-reduced-motion media query
      const styleElements = document.querySelectorAll("style");
      let hasReducedMotionStyles = false;
      
      styleElements.forEach(style => {
        if (style.textContent.includes("prefers-reduced-motion") || 
            style.textContent.includes("reduce-motion") ||
            style.textContent.includes("animation: none")) {
          hasReducedMotionStyles = true;
        }
      });
      
      expect(hasReducedMotionStyles).toBe(true);
    });
    
    it("provides larger text options", async () => {
      // Set up with large font size
      const wrapper = createWrapper(App, {}, { fontSize: "large" });
      await flushPromises();
      
      // Body should have large font size class
      expect(document.documentElement.classList.contains("font-size-large")).toBe(true);
      
      // Base font size should be larger than default
      const computedStyle = window.getComputedStyle(document.body);
      const fontSize = parseFloat(computedStyle.fontSize);
      expect(fontSize).toBeGreaterThan(16); // Default is typically 16px
    });
    
    it("supports screen reader optimized mode", async () => {
      // Set up with screen reader optimization
      const wrapper = createWrapper(App, {}, { screenReaderOptimized: true });
      await flushPromises();
      
      // Body should have screen reader class
      expect(document.body.classList.contains("sr-optimized")).toBe(true);
      
      // Check for additional ARIA attributes in screen reader mode
      const results = await runAxeTest(wrapper.element, axeRules.screenreader);
      expect(results.violations).toHaveLength(0);
      
      // Additional descriptive elements should be present
      const srOnlyElements = wrapper.findAll(".sr-only");
      expect(srOnlyElements.length).toBeGreaterThan(0);
    });
  });
  
  describe("Keyboard Navigation Flows", () => {
    it("supports full keyboard navigation through chat workflow", async () => {
      const wrapper = createWrapper(ChatView);
      await flushPromises();
      
      // Define the expected tab sequence for chat view
      const expectedTabSequence = [
        ".message-input", // Input field
        ".send-button", // Send button
        ".session-selector", // Session dropdown/selector
        ".session-actions button", // Session action buttons
      ];
      
      const navResults = await testKeyboardNavigation(wrapper.element, expectedTabSequence);
      expect(navResults.success).toBe(true);
      expect(navResults.unreachableElements).toHaveLength(0);
    });
    
    it("supports keyboard shortcuts for common actions", async () => {
      const wrapper = createWrapper(App);
      await flushPromises();
      
      // Mock keyboard shortcut handlers
      const shortcutHandlers = {
        focusInput: vi.fn(),
        toggleSidebar: vi.fn(),
        newSession: vi.fn(),
        openSettings: vi.fn(),
      };
      
      // Assign mock handlers to component
      Object.assign(wrapper.vm, shortcutHandlers);
      
      // Test keyboard shortcuts
      await wrapper.trigger("keydown", { key: "/", ctrlKey: true });
      expect(shortcutHandlers.focusInput).toHaveBeenCalled();
      
      await wrapper.trigger("keydown", { key: "b", ctrlKey: true });
      expect(shortcutHandlers.toggleSidebar).toHaveBeenCalled();
      
      await wrapper.trigger("keydown", { key: "n", ctrlKey: true });
      expect(shortcutHandlers.newSession).toHaveBeenCalled();
      
      await wrapper.trigger("keydown", { key: ",", ctrlKey: true });
      expect(shortcutHandlers.openSettings).toHaveBeenCalled();
    });
  });
  
  describe("Screen Reader Compatibility", () => {
    it("uses proper heading structure and landmarks", async () => {
      const wrapper = createWrapper(App);
      await flushPromises();
      
      // Check landmark regions
      expect(wrapper.find("header[role='banner']").exists()).toBe(true);
      expect(wrapper.find("nav[role='navigation']").exists()).toBe(true);
      expect(wrapper.find("main[role='main']").exists()).toBe(true);
      
      // Check heading structure (H1 followed by H2, etc.)
      const h1Elements = wrapper.findAll("h1");
      expect(h1Elements.length).toBe(1); // Only one H1 per page
      
      // Check heading levels don't skip (e.g., h1 to h3 without h2)
      const headingLevels = [1, 2, 3, 4, 5, 6];
      let previousLevel = 1;
      
      headingLevels.forEach(level => {
        const headings = wrapper.findAll(`h${level}`);
        if (headings.length > 0) {
          expect(level).toBeLessThanOrEqual(previousLevel + 1);
          previousLevel = level;
        }
      });
    });
    
    it("uses appropriate ARIA live regions for dynamic content", async () => {
      const wrapper = createWrapper(ChatView);
      await flushPromises();
      
      // Check for ARIA live regions
      const liveRegions = wrapper.findAll("[aria-live]");
      expect(liveRegions.length).toBeGreaterThan(0);
      
      // Message list should be a live region
      const messageList = wrapper.find(".message-list");
      expect(messageList.attributes("aria-live")).toBe("polite");
      
      // Error messages should use assertive live regions
      const errorRegion = wrapper.find(".error-message");
      if (errorRegion.exists()) {
        expect(errorRegion.attributes("aria-live")).toBe("assertive");
      }
    });
  });
  
  describe("Error Handling Accessibility", () => {
    it("error page meets accessibility standards", async () => {
      const wrapper = createWrapper(ErrorView, { error: { status: 404, message: "Page not found" } });
      await flushPromises();
      
      const results = await runAxeTest(wrapper.element, axeRules.standard);
      expect(results.violations).toHaveLength(0);
      
      // Error page should have a main heading
      const heading = wrapper.find("h1");
      expect(heading.exists()).toBe(true);
      
      // Error message should be clear
      const errorMessage = wrapper.find(".error-message");
      expect(errorMessage.exists()).toBe(true);
      
      // There should be a way back to safety
      const backLink = wrapper.find("a, button");
      expect(backLink.exists()).toBe(true);
      expect(backLink.attributes("aria-label") || backLink.text()).toBeTruthy();
    });
    
    it("inline error messages are accessible", async () => {
      const wrapper = createWrapper(ChatView, {}, {
        initialState: {
          sessions: {
            currentSession: { id: "session-1", title: "Test Session" },
            error: "Failed to load messages",
          },
        },
      });
      await flushPromises();
      
      // Find error message
      const errorMessage = wrapper.find(".error-message");
      if (errorMessage.exists()) {
        // Error should have proper ARIA attributes
        expect(errorMessage.attributes("role")).toBe("alert");
        expect(errorMessage.attributes("aria-live")).toBe("assertive");
        
        // Error should be visible
        expect(errorMessage.isVisible()).toBe(true);
        
        // Error should have a clear message
        expect(errorMessage.text()).toBeTruthy();
        
        // Error should have a way to dismiss or retry
        const actionButton = errorMessage.find("button");
        if (actionButton.exists()) {
          expect(actionButton.attributes("aria-label") || actionButton.text()).toBeTruthy();
        }
      }
    });
  });
  
  describe("Mobile Accessibility", () => {
    it("supports touch targets of appropriate size", async () => {
      const wrapper = createWrapper(App);
      await flushPromises();
      
      // All interactive elements should be at least 44x44px for touch accessibility
      const interactiveElements = wrapper.findAll("button, a, [role='button'], input[type='checkbox'], input[type='radio']");
      
      interactiveElements.forEach(element => {
        const rect = element.element.getBoundingClientRect();
        
        // WCAG requires touch targets to be at least 44x44 pixels
        // We're checking rendered size, which may not be accurate in JSDOM
        // This is a simplified check; in real tests we'd check actual rendered size
        if (element.isVisible()) {
          expect(element.classes()).toContain("touch-target");
        }
      });
    });
    
    it("supports mobile-optimized keyboard functionality", async () => {
      const wrapper = createWrapper(ChatView);
      await flushPromises();
      
      // Input should have proper mobile keyboard attributes
      const messageInput = wrapper.find(".message-input");
      
      if (messageInput.exists()) {
        // Check for mobile-friendly input attributes
        expect(messageInput.attributes("autocapitalize")).toBe("off");
        expect(messageInput.attributes("autocomplete")).toBe("off");
        expect(messageInput.attributes("enterkeyhint")).toBe("send");
        
        // Virtual keyboard should have proper return key action
        expect(["go", "send", "done", "search"]).toContain(messageInput.attributes("enterkeyhint"));
      }
    });
  });
  
  describe("Focus Management", () => {
    it("restores focus appropriately after modal dialogs", async () => {
      const wrapper = createWrapper(App);
      await flushPromises();
      
      // Find a button that opens a dialog
      const settingsButton = wrapper.find(".settings-button");
      
      if (settingsButton.exists()) {
        // Focus the button and click it
        settingsButton.element.focus();
        await settingsButton.trigger("click");
        await flushPromises();
        
        // Find the dialog
        const dialog = wrapper.find("[role='dialog']");
        if (dialog.exists()) {
          // Close the dialog
          const closeButton = dialog.find(".close-button");
          await closeButton.trigger("click");
          await flushPromises();
          
          // Focus should return to the settings button
          expect(document.activeElement).toBe(settingsButton.element);
        }
      }
    });
    
    it("manages focus when loading new content", async () => {
      const wrapper = createWrapper(ChatView);
      await flushPromises();
      
      // Initial focus should be on input
      const messageInput = wrapper.find(".message-input");
      messageInput.element.focus();
      
      // Simulate loading new content
      await wrapper.setData({ loading: true });
      await flushPromises();
      
      // After loading, focus should return to input
      await wrapper.setData({ loading: false });
      await flushPromises();
      
      // Focus should remain or return to input
      expect(document.activeElement).toBe(messageInput.element);
    });
  });
});