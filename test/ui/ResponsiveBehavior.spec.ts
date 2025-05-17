/**
 * Responsive Behavior Tests
 * 
 * These tests verify the application's responsive behavior across different
 * viewport sizes and device types, ensuring proper layout adaptation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";

// Import components to test for responsiveness
import App from "@/App.vue";
import ChatView from "@/components/ChatView.vue";
import Sidebar from "@/components/Sidebar.vue";
import NavigationBar from "@/components/NavigationBar.vue";
import AdminPanel from "@/components/admin/AdminPanel.vue";
import SettingsPanel from "@/components/settings/SettingsPanel.vue";
import DocumentsView from "@/components/DocumentsView.vue";

// Mock the router
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
              theme: "light",
              fontSize: "medium",
              isMobile: options.isMobile || false,
              sidebarOpen: true,
              ...options.uiState,
            },
            auth: {
              currentUser: { id: "user-1", email: "user@example.com", role: "admin" },
              isAuthenticated: true,
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
    ...options,
  });
};

// Helper to simulate viewport size changes
const simulateViewport = (width, height) => {
  // Save original properties
  const originalInnerWidth = window.innerWidth;
  const originalInnerHeight = window.innerHeight;
  const originalMatchMedia = window.matchMedia;
  
  // Mock window.innerWidth and innerHeight
  Object.defineProperty(window, "innerWidth", { value: width, configurable: true });
  Object.defineProperty(window, "innerHeight", { value: height, configurable: true });
  
  // Mock matchMedia to respond to media queries
  Object.defineProperty(window, "matchMedia", {
    value: vi.fn().mockImplementation(query => ({
      matches: query.includes(`max-width: ${width}px`) || 
               (query.includes("max-width") && parseInt(query.match(/max-width:\s*(\d+)/)?.[1] || "0") >= width),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
    configurable: true,
  });
  
  // Trigger resize event
  window.dispatchEvent(new Event("resize"));
  
  // Return cleanup function
  return () => {
    Object.defineProperty(window, "innerWidth", { value: originalInnerWidth, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: originalInnerHeight, configurable: true });
    Object.defineProperty(window, "matchMedia", { value: originalMatchMedia, configurable: true });
    window.dispatchEvent(new Event("resize"));
  };
};

describe("Responsive Behavior", () => {
  // Viewport sizes for testing
  const viewports = {
    mobile: { width: 375, height: 667 },      // iPhone 8
    tablet: { width: 768, height: 1024 },     // iPad
    laptop: { width: 1366, height: 768 },     // Standard laptop
    desktop: { width: 1920, height: 1080 },   // Full HD
  };
  
  // Clean up after each test
  afterEach(() => {
    vi.clearAllMocks();
  });
  
  describe("App Layout", () => {
    it("adapts layout based on viewport size", async () => {
      // Test on desktop
      const cleanupDesktop = simulateViewport(viewports.desktop.width, viewports.desktop.height);
      const desktopWrapper = createWrapper(App);
      await flushPromises();
      
      // Desktop should show full sidebar
      expect(desktopWrapper.find(".app-container--desktop").exists()).toBe(true);
      expect(desktopWrapper.find(".app-container--mobile").exists()).toBe(false);
      
      cleanupDesktop();
      
      // Test on mobile
      const cleanupMobile = simulateViewport(viewports.mobile.width, viewports.mobile.height);
      const mobileWrapper = createWrapper(App, {}, { isMobile: true });
      await flushPromises();
      
      // Mobile should have mobile class and collapsed sidebar
      expect(mobileWrapper.find(".app-container--mobile").exists()).toBe(true);
      expect(mobileWrapper.find(".app-container--desktop").exists()).toBe(false);
      
      cleanupMobile();
    });
    
    it("handles orientation changes", async () => {
      // Simulate portrait mode on tablet
      const cleanupPortrait = simulateViewport(viewports.tablet.width, viewports.tablet.height);
      const portraitWrapper = createWrapper(App);
      await flushPromises();
      
      // Portrait should have specific tablet layout
      expect(portraitWrapper.find(".app-container--tablet").exists()).toBe(true);
      expect(portraitWrapper.find(".app-container--landscape").exists()).toBe(false);
      
      cleanupPortrait();
      
      // Simulate landscape mode on tablet (swap width and height)
      const cleanupLandscape = simulateViewport(viewports.tablet.height, viewports.tablet.width);
      const landscapeWrapper = createWrapper(App);
      await flushPromises();
      
      // Landscape layout should adjust
      expect(landscapeWrapper.find(".app-container--landscape").exists()).toBe(true);
      
      cleanupLandscape();
    });
  });
  
  describe("Sidebar Component", () => {
    it("collapses on mobile viewport", async () => {
      // Desktop view
      const cleanupDesktop = simulateViewport(viewports.desktop.width, viewports.desktop.height);
      const desktopWrapper = createWrapper(Sidebar);
      await flushPromises();
      
      // Desktop should show full sidebar
      expect(desktopWrapper.find(".sidebar--expanded").exists()).toBe(true);
      expect(desktopWrapper.find(".sidebar--collapsed").exists()).toBe(false);
      
      cleanupDesktop();
      
      // Mobile view with sidebar initially closed
      const cleanupMobile = simulateViewport(viewports.mobile.width, viewports.mobile.height);
      const mobileWrapper = createWrapper(Sidebar, {}, { 
        isMobile: true,
        uiState: { sidebarOpen: false }
      });
      await flushPromises();
      
      // Mobile should have collapsed sidebar
      expect(mobileWrapper.find(".sidebar--collapsed").exists()).toBe(true);
      expect(mobileWrapper.find(".sidebar--expanded").exists()).toBe(false);
      
      // Test toggling sidebar on mobile
      await mobileWrapper.find(".sidebar__toggle-button").trigger("click");
      await flushPromises();
      
      // Sidebar should expand
      expect(mobileWrapper.find(".sidebar--expanded").exists()).toBe(true);
      
      // Clicking outside should collapse sidebar on mobile
      await window.dispatchEvent(new MouseEvent("click"));
      await flushPromises();
      
      // Sidebar should collapse again
      expect(mobileWrapper.find(".sidebar--collapsed").exists()).toBe(true);
      
      cleanupMobile();
    });
    
    it("adjusts content based on available space", async () => {
      // Desktop view (large viewport)
      const cleanupDesktop = simulateViewport(viewports.desktop.width, viewports.desktop.height);
      const desktopWrapper = createWrapper(Sidebar);
      await flushPromises();
      
      // Desktop should show full sidebar with all elements
      expect(desktopWrapper.find(".sidebar__header").exists()).toBe(true);
      expect(desktopWrapper.find(".sidebar__content").exists()).toBe(true);
      expect(desktopWrapper.find(".sidebar__footer").exists()).toBe(true);
      
      // Should show full text in menu items
      expect(desktopWrapper.find(".sidebar__menu-item-text").exists()).toBe(true);
      
      cleanupDesktop();
      
      // Tablet view (medium viewport)
      const cleanupTablet = simulateViewport(viewports.tablet.width, viewports.tablet.height);
      const tabletWrapper = createWrapper(Sidebar);
      await flushPromises();
      
      // Tablet should still show text but might have adjusted layout
      expect(tabletWrapper.find(".sidebar__menu-item-text").exists()).toBe(true);
      
      cleanupTablet();
      
      // Mobile view (small viewport)
      const cleanupMobile = simulateViewport(viewports.mobile.width, viewports.mobile.height);
      const mobileWrapper = createWrapper(Sidebar, {}, { isMobile: true });
      await flushPromises();
      
      // Mobile collapsed sidebar should only show icons, not text
      if (mobileWrapper.find(".sidebar--collapsed").exists()) {
        expect(mobileWrapper.find(".sidebar__menu-item-text").isVisible()).toBe(false);
        expect(mobileWrapper.find(".sidebar__menu-item-icon").exists()).toBe(true);
      }
      
      cleanupMobile();
    });
  });
  
  describe("Chat Interface", () => {
    it("adapts layout for different viewport sizes", async () => {
      // Desktop view
      const cleanupDesktop = simulateViewport(viewports.desktop.width, viewports.desktop.height);
      const desktopWrapper = createWrapper(ChatView);
      await flushPromises();
      
      // Desktop should have multi-column layout
      expect(desktopWrapper.find(".chat-view--desktop").exists()).toBe(true);
      expect(desktopWrapper.find(".chat-messages").exists()).toBe(true);
      expect(desktopWrapper.find(".chat-sidebar").exists()).toBe(true);
      
      cleanupDesktop();
      
      // Mobile view
      const cleanupMobile = simulateViewport(viewports.mobile.width, viewports.mobile.height);
      const mobileWrapper = createWrapper(ChatView, {}, { isMobile: true });
      await flushPromises();
      
      // Mobile should have single column layout
      expect(mobileWrapper.find(".chat-view--mobile").exists()).toBe(true);
      
      // On mobile, chat sidebar should be hidden by default
      expect(mobileWrapper.find(".chat-sidebar--hidden").exists()).toBe(true);
      
      // Mobile should have session toggle button
      expect(mobileWrapper.find(".chat-session-toggle").exists()).toBe(true);
      
      // Test session toggle functionality
      await mobileWrapper.find(".chat-session-toggle").trigger("click");
      await flushPromises();
      
      // Chat sidebar should be visible after toggle
      expect(mobileWrapper.find(".chat-sidebar--visible").exists()).toBe(true);
      
      cleanupMobile();
    });
    
    it("adjusts message layout for different viewport sizes", async () => {
      // Desktop view
      const cleanupDesktop = simulateViewport(viewports.desktop.width, viewports.desktop.height);
      const desktopWrapper = createWrapper(ChatView);
      await flushPromises();
      
      // Desktop should have spacious message layout
      expect(desktopWrapper.find(".message-list--desktop").exists()).toBe(true);
      
      cleanupDesktop();
      
      // Mobile view
      const cleanupMobile = simulateViewport(viewports.mobile.width, viewports.mobile.height);
      const mobileWrapper = createWrapper(ChatView, {}, { isMobile: true });
      await flushPromises();
      
      // Mobile should have compact message layout
      expect(mobileWrapper.find(".message-list--mobile").exists()).toBe(true);
      
      // Mobile messages should be full width
      const messageItems = mobileWrapper.findAll(".message-item");
      if (messageItems.length > 0) {
        expect(messageItems[0].classes()).toContain("message-item--full-width");
      }
      
      cleanupMobile();
    });
    
    it("shows/hides additional UI elements based on viewport size", async () => {
      // Desktop view
      const cleanupDesktop = simulateViewport(viewports.desktop.width, viewports.desktop.height);
      const desktopWrapper = createWrapper(ChatView);
      await flushPromises();
      
      // Desktop should show additional UI elements
      expect(desktopWrapper.find(".session-actions").exists()).toBe(true);
      expect(desktopWrapper.find(".message-actions").exists()).toBe(true);
      
      cleanupDesktop();
      
      // Mobile view
      const cleanupMobile = simulateViewport(viewports.mobile.width, viewports.mobile.height);
      const mobileWrapper = createWrapper(ChatView, {}, { isMobile: true });
      await flushPromises();
      
      // Mobile should hide or collapse certain UI elements
      expect(mobileWrapper.find(".session-actions--collapsed").exists()).toBe(true);
      
      // Mobile should show action menus via dots icon
      expect(mobileWrapper.find(".mobile-action-menu").exists()).toBe(true);
      
      cleanupMobile();
    });
  });
  
  describe("Admin Panel", () => {
    it("adapts layout for different viewport sizes", async () => {
      // Desktop view
      const cleanupDesktop = simulateViewport(viewports.desktop.width, viewports.desktop.height);
      const desktopWrapper = createWrapper(AdminPanel);
      await flushPromises();
      
      // Desktop should have side-by-side layout
      expect(desktopWrapper.find(".admin-panel--desktop").exists()).toBe(true);
      expect(desktopWrapper.find(".admin-panel__sidebar").exists()).toBe(true);
      expect(desktopWrapper.find(".admin-panel__content").exists()).toBe(true);
      
      cleanupDesktop();
      
      // Mobile view
      const cleanupMobile = simulateViewport(viewports.mobile.width, viewports.mobile.height);
      const mobileWrapper = createWrapper(AdminPanel, {}, { isMobile: true });
      await flushPromises();
      
      // Mobile should have stacked layout
      expect(mobileWrapper.find(".admin-panel--mobile").exists()).toBe(true);
      
      // Mobile should have collapsible navigation
      expect(mobileWrapper.find(".admin-panel__mobile-nav").exists()).toBe(true);
      
      // Test mobile navigation toggle
      await mobileWrapper.find(".admin-panel__mobile-nav-toggle").trigger("click");
      await flushPromises();
      
      // Navigation should expand
      expect(mobileWrapper.find(".admin-panel__sidebar--expanded").exists()).toBe(true);
      
      cleanupMobile();
    });
    
    it("adapts tables and data displays for viewport size", async () => {
      // Desktop view
      const cleanupDesktop = simulateViewport(viewports.desktop.width, viewports.desktop.height);
      const desktopWrapper = createWrapper(AdminPanel);
      await flushPromises();
      
      // Select users tab to show table data
      await desktopWrapper.vm.setActiveTab("users");
      await flushPromises();
      
      // Desktop should show full data tables
      expect(desktopWrapper.find(".data-table--desktop").exists()).toBe(true);
      
      cleanupDesktop();
      
      // Mobile view
      const cleanupMobile = simulateViewport(viewports.mobile.width, viewports.mobile.height);
      const mobileWrapper = createWrapper(AdminPanel, {}, { isMobile: true });
      await flushPromises();
      
      // Select users tab
      await mobileWrapper.vm.setActiveTab("users");
      await flushPromises();
      
      // Mobile should show card-based layout instead of tables
      expect(mobileWrapper.find(".data-table--mobile").exists()).toBe(true);
      expect(mobileWrapper.find(".data-cards").exists()).toBe(true);
      
      cleanupMobile();
    });
  });
  
  describe("Settings Panel", () => {
    it("adapts layout for different viewport sizes", async () => {
      // Desktop view
      const cleanupDesktop = simulateViewport(viewports.desktop.width, viewports.desktop.height);
      const desktopWrapper = createWrapper(SettingsPanel, { isVisible: true });
      await flushPromises();
      
      // Desktop should have side-by-side layout
      expect(desktopWrapper.find(".settings-panel--desktop").exists()).toBe(true);
      expect(desktopWrapper.find(".settings-panel__categories").exists()).toBe(true);
      expect(desktopWrapper.find(".settings-panel__content").exists()).toBe(true);
      
      cleanupDesktop();
      
      // Mobile view
      const cleanupMobile = simulateViewport(viewports.mobile.width, viewports.mobile.height);
      const mobileWrapper = createWrapper(SettingsPanel, { isVisible: true }, { isMobile: true });
      await flushPromises();
      
      // Mobile should have stacked layout
      expect(mobileWrapper.find(".settings-panel--mobile").exists()).toBe(true);
      
      // Mobile should have dropdown for categories instead of sidebar
      expect(mobileWrapper.find(".settings-panel__mobile-category-selector").exists()).toBe(true);
      
      cleanupMobile();
    });
    
    it("adjusts form controls for touch interfaces", async () => {
      // Desktop view
      const cleanupDesktop = simulateViewport(viewports.desktop.width, viewports.desktop.height);
      const desktopWrapper = createWrapper(SettingsPanel, { isVisible: true });
      await flushPromises();
      
      // Desktop form controls
      const desktopFormItems = desktopWrapper.findAll(".form-item");
      if (desktopFormItems.length > 0) {
        expect(desktopFormItems[0].classes()).not.toContain("form-item--touch");
      }
      
      cleanupDesktop();
      
      // Mobile view
      const cleanupMobile = simulateViewport(viewports.mobile.width, viewports.mobile.height);
      const mobileWrapper = createWrapper(SettingsPanel, { isVisible: true }, { 
        isMobile: true,
        initialState: {
          ui: {
            isMobile: true,
            isTouchDevice: true,
          },
        },
      });
      await flushPromises();
      
      // Mobile form controls should be optimized for touch
      const mobileFormItems = mobileWrapper.findAll(".form-item");
      if (mobileFormItems.length > 0) {
        expect(mobileFormItems[0].classes()).toContain("form-item--touch");
      }
      
      // Check for bigger touch targets
      const touchCheckboxes = mobileWrapper.findAll(".checkbox--touch");
      if (touchCheckboxes.length > 0) {
        expect(touchCheckboxes[0].exists()).toBe(true);
      }
      
      cleanupMobile();
    });
  });
  
  describe("Navigation Elements", () => {
    it("collapses navigation menu on small viewports", async () => {
      // Desktop view
      const cleanupDesktop = simulateViewport(viewports.desktop.width, viewports.desktop.height);
      const desktopWrapper = createWrapper(NavigationBar);
      await flushPromises();
      
      // Desktop should show full menu
      expect(desktopWrapper.find(".nav-links").exists()).toBe(true);
      expect(desktopWrapper.find(".hamburger-menu").exists()).toBe(false);
      
      cleanupDesktop();
      
      // Mobile view
      const cleanupMobile = simulateViewport(viewports.mobile.width, viewports.mobile.height);
      const mobileWrapper = createWrapper(NavigationBar, {}, { isMobile: true });
      await flushPromises();
      
      // Mobile should show hamburger menu
      expect(mobileWrapper.find(".hamburger-menu").exists()).toBe(true);
      expect(mobileWrapper.find(".nav-links--mobile-hidden").exists()).toBe(true);
      
      // Test hamburger menu toggle
      await mobileWrapper.find(".hamburger-menu").trigger("click");
      await flushPromises();
      
      // Menu should expand
      expect(mobileWrapper.find(".nav-links--mobile-visible").exists()).toBe(true);
      
      cleanupMobile();
    });
    
    it("shows different UI elements on different viewports", async () => {
      // Desktop view
      const cleanupDesktop = simulateViewport(viewports.desktop.width, viewports.desktop.height);
      const desktopWrapper = createWrapper(NavigationBar);
      await flushPromises();
      
      // Desktop should show full navigation elements
      expect(desktopWrapper.find(".user-profile").exists()).toBe(true);
      expect(desktopWrapper.find(".nav-actions").exists()).toBe(true);
      
      cleanupDesktop();
      
      // Mobile view
      const cleanupMobile = simulateViewport(viewports.mobile.width, viewports.mobile.height);
      const mobileWrapper = createWrapper(NavigationBar, {}, { isMobile: true });
      await flushPromises();
      
      // Mobile should prioritize essential elements
      expect(mobileWrapper.find(".mobile-back-button").exists()).toBe(true);
      expect(mobileWrapper.find(".mobile-menu-button").exists()).toBe(true);
      
      // Less important elements should be in overflow menu
      await mobileWrapper.find(".mobile-menu-button").trigger("click");
      await flushPromises();
      
      expect(mobileWrapper.find(".mobile-menu").exists()).toBe(true);
      expect(mobileWrapper.find(".mobile-menu-user-profile").exists()).toBe(true);
      
      cleanupMobile();
    });
  });
  
  describe("Document Viewer", () => {
    it("adapts document display for different viewport sizes", async () => {
      // Desktop view
      const cleanupDesktop = simulateViewport(viewports.desktop.width, viewports.desktop.height);
      const desktopWrapper = createWrapper(DocumentsView);
      await flushPromises();
      
      // Desktop should have multi-column layout
      expect(desktopWrapper.find(".documents-view--desktop").exists()).toBe(true);
      expect(desktopWrapper.find(".document-list").exists()).toBe(true);
      expect(desktopWrapper.find(".document-preview").exists()).toBe(true);
      
      cleanupDesktop();
      
      // Mobile view
      const cleanupMobile = simulateViewport(viewports.mobile.width, viewports.mobile.height);
      const mobileWrapper = createWrapper(DocumentsView, {}, { isMobile: true });
      await flushPromises();
      
      // Mobile should focus on one view at a time
      expect(mobileWrapper.find(".documents-view--mobile").exists()).toBe(true);
      
      // Should show list view by default on mobile
      expect(mobileWrapper.find(".document-list--mobile").exists()).toBe(true);
      
      // Test selecting a document on mobile
      if (mobileWrapper.findAll(".document-item").length > 0) {
        await mobileWrapper.find(".document-item").trigger("click");
        await flushPromises();
        
        // Should switch to preview view
        expect(mobileWrapper.find(".document-preview--mobile").exists()).toBe(true);
        expect(mobileWrapper.find(".document-preview--mobile-visible").exists()).toBe(true);
        
        // Should have back button
        expect(mobileWrapper.find(".mobile-back-to-list").exists()).toBe(true);
        
        // Test back button
        await mobileWrapper.find(".mobile-back-to-list").trigger("click");
        await flushPromises();
        
        // Should switch back to list view
        expect(mobileWrapper.find(".document-list--mobile-visible").exists()).toBe(true);
      }
      
      cleanupMobile();
    });
    
    it("adjusts document controls for different viewport sizes", async () => {
      // Desktop view
      const cleanupDesktop = simulateViewport(viewports.desktop.width, viewports.desktop.height);
      const desktopWrapper = createWrapper(DocumentsView);
      await flushPromises();
      
      // Desktop should show all document controls
      expect(desktopWrapper.find(".document-controls").exists()).toBe(true);
      expect(desktopWrapper.findAll(".document-action-button").length).toBeGreaterThan(1);
      
      cleanupDesktop();
      
      // Mobile view
      const cleanupMobile = simulateViewport(viewports.mobile.width, viewports.mobile.height);
      const mobileWrapper = createWrapper(DocumentsView, {}, { isMobile: true });
      await flushPromises();
      
      // Mobile should show simplified controls
      expect(mobileWrapper.find(".document-controls--mobile").exists()).toBe(true);
      
      // Less used actions should be in overflow menu
      expect(mobileWrapper.find(".document-actions-overflow").exists()).toBe(true);
      
      // Test overflow menu
      await mobileWrapper.find(".document-actions-overflow").trigger("click");
      await flushPromises();
      
      expect(mobileWrapper.find(".document-actions-menu").exists()).toBe(true);
      
      cleanupMobile();
    });
  });
  
  describe("Touch Interaction", () => {
    it("adapts UI for touch input", async () => {
      // Desktop view with mouse input
      const cleanupDesktop = simulateViewport(viewports.desktop.width, viewports.desktop.height);
      const desktopWrapper = createWrapper(App, {}, {
        initialState: {
          ui: {
            isMobile: false,
            isTouchDevice: false,
          },
        },
      });
      await flushPromises();
      
      // Should use hover effects for desktop
      expect(desktopWrapper.find(".app-container--touch").exists()).toBe(false);
      
      cleanupDesktop();
      
      // Mobile view with touch input
      const cleanupMobile = simulateViewport(viewports.mobile.width, viewports.mobile.height);
      const mobileWrapper = createWrapper(App, {}, {
        initialState: {
          ui: {
            isMobile: true,
            isTouchDevice: true,
          },
        },
      });
      await flushPromises();
      
      // Should use touch-optimized UI
      expect(mobileWrapper.find(".app-container--touch").exists()).toBe(true);
      
      // Check for larger touch targets
      const touchButtons = mobileWrapper.findAll(".touch-target");
      if (touchButtons.length > 0) {
        const buttonStyle = window.getComputedStyle(touchButtons[0].element);
        const minSize = parseInt(buttonStyle.minHeight || "0");
        expect(minSize).toBeGreaterThanOrEqual(44); // Minimum touch target size
      }
      
      cleanupMobile();
    });
    
    it("supports swipe gestures on mobile", async () => {
      // Mobile view with touch input
      const cleanupMobile = simulateViewport(viewports.mobile.width, viewports.mobile.height);
      const mobileWrapper = createWrapper(App, {}, {
        initialState: {
          ui: {
            isMobile: true,
            isTouchDevice: true,
          },
        },
      });
      await flushPromises();
      
      // Should have swipe handlers
      expect(mobileWrapper.find("[data-swipe-handler]").exists()).toBe(true);
      
      // Simulate swipe events
      const startEvent = new TouchEvent("touchstart", {
        touches: [{ clientX: 50, clientY: 50 }],
      });
      const moveEvent = new TouchEvent("touchmove", {
        touches: [{ clientX: 200, clientY: 50 }],
      });
      const endEvent = new TouchEvent("touchend", {
        touches: [],
      });
      
      const swipeElement = mobileWrapper.find("[data-swipe-handler]").element;
      
      // Dispatch swipe sequence
      swipeElement.dispatchEvent(startEvent);
      swipeElement.dispatchEvent(moveEvent);
      swipeElement.dispatchEvent(endEvent);
      
      await flushPromises();
      
      // Check if swipe was detected
      // This is a bit complex to test directly since the swipe handler
      // might be custom code. We'll look for side effects instead.
      
      // For example, if swiping right opens sidebar:
      const sidebarAfterSwipe = mobileWrapper.find(".sidebar");
      if (sidebarAfterSwipe.exists()) {
        expect(sidebarAfterSwipe.classes()).toContain("sidebar--expanded");
      }
      
      cleanupMobile();
    });
  });
  
  describe("Responsive Images", () => {
    it("loads appropriate image sizes based on viewport", async () => {
      // Desktop view
      const cleanupDesktop = simulateViewport(viewports.desktop.width, viewports.desktop.height);
      const desktopWrapper = createWrapper(App);
      await flushPromises();
      
      // Check for responsive images
      const desktopImages = desktopWrapper.findAll("img[srcset]");
      
      if (desktopImages.length > 0) {
        // Should have srcset attribute
        expect(desktopImages[0].attributes("srcset")).toBeTruthy();
        
        // Should have appropriate sizes attribute
        expect(desktopImages[0].attributes("sizes")).toBeTruthy();
      }
      
      cleanupDesktop();
      
      // Mobile view
      const cleanupMobile = simulateViewport(viewports.mobile.width, viewports.mobile.height);
      const mobileWrapper = createWrapper(App, {}, { isMobile: true });
      await flushPromises();
      
      // Check for responsive images
      const mobileImages = mobileWrapper.findAll("img[srcset]");
      
      if (mobileImages.length > 0) {
        // Should have srcset attribute
        expect(mobileImages[0].attributes("srcset")).toBeTruthy();
        
        // Should have appropriate sizes attribute
        const sizes = mobileImages[0].attributes("sizes");
        expect(sizes).toBeTruthy();
        
        // Mobile sizes should be different from desktop
        if (desktopImages.length > 0) {
          const desktopSizes = desktopImages[0].attributes("sizes");
          if (desktopSizes && sizes) {
            expect(sizes).not.toEqual(desktopSizes);
          }
        }
      }
      
      cleanupMobile();
    });
  });
});