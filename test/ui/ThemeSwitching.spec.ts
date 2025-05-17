/**
 * Theme Switching Tests
 * 
 * These tests verify that theme switching functionality works correctly throughout
 * the application, ensuring proper application of theme-specific styles and colors.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import { useUIStore } from "@/stores/ui";

// Import components that should support theme switching
import App from "@/App.vue";
import Button from "@/components/ui/base/Button.vue";
import Card from "@/components/ui/base/Card.vue";
import Alert from "@/components/ui/base/Alert.vue";
import ChatView from "@/components/ChatView.vue";
import AdminPanel from "@/components/admin/AdminPanel.vue";
import SettingsPanel from "@/components/settings/SettingsPanel.vue";
import ThemeSelector from "@/components/settings/appearance/ThemeSelector.vue";

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
              isDarkMode: options.theme === "dark",
              fontSize: "medium",
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

// Helper to verify if CSS variables are being correctly applied
const getComputedCssVariable = (element, variableName) => {
  const styles = window.getComputedStyle(element);
  return styles.getPropertyValue(variableName).trim();
};

// Helper to simulate theme preference media query
const simulateSystemThemePreference = (prefersDark = false) => {
  const original = window.matchMedia;
  
  Object.defineProperty(window, "matchMedia", {
    value: (query) => ({
      matches: query.includes("prefers-color-scheme: dark") ? prefersDark : !prefersDark,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
    configurable: true,
  });
  
  // Return cleanup function
  return () => {
    Object.defineProperty(window, "matchMedia", { value: original, configurable: true });
  };
};

describe("Theme Switching", () => {
  // Clean up after each test
  afterEach(() => {
    vi.clearAllMocks();
    document.documentElement.className = "";
  });
  
  describe("Basic Theme Functionality", () => {
    it("applies correct theme class to the document root", async () => {
      // Create a wrapper with light theme
      const lightWrapper = createWrapper(App, {}, { theme: "light" });
      await flushPromises();
      
      // Get the UI store
      const uiStore = useUIStore();
      
      // Light theme should be applied
      expect(document.documentElement.classList.contains("theme-light")).toBe(true);
      expect(document.documentElement.classList.contains("theme-dark")).toBe(false);
      
      // Change theme to dark
      uiStore.setTheme("dark");
      await flushPromises();
      
      // Dark theme should be applied
      expect(document.documentElement.classList.contains("theme-dark")).toBe(true);
      expect(document.documentElement.classList.contains("theme-light")).toBe(false);
    });
    
    it("sets correct CSS variables for each theme", async () => {
      // Create a wrapper with light theme
      const lightWrapper = createWrapper(App, {}, { theme: "light" });
      await flushPromises();
      
      // Light theme variables should be applied
      const lightBg = getComputedCssVariable(document.documentElement, "--background-color");
      const lightText = getComputedCssVariable(document.documentElement, "--text-color");
      
      // Store light theme values for comparison
      const lightThemeValues = {
        bg: lightBg,
        text: lightText,
      };
      
      // Get the UI store
      const uiStore = useUIStore();
      
      // Change theme to dark
      uiStore.setTheme("dark");
      await flushPromises();
      
      // Dark theme variables should be different from light theme
      const darkBg = getComputedCssVariable(document.documentElement, "--background-color");
      const darkText = getComputedCssVariable(document.documentElement, "--text-color");
      
      // Dark theme should have different values than light theme
      expect(darkBg).not.toBe(lightThemeValues.bg);
      expect(darkText).not.toBe(lightThemeValues.text);
    });
    
    it("detects and applies system theme preference", async () => {
      // Mock system preference for dark theme
      const cleanupDarkPreference = simulateSystemThemePreference(true);
      
      // Create wrapper with auto theme
      const wrapper = createWrapper(App, {}, { theme: "auto" });
      await flushPromises();
      
      // Get the UI store
      const uiStore = useUIStore();
      
      // System dark preference should be detected and applied
      expect(uiStore.isDarkMode).toBe(true);
      expect(document.documentElement.classList.contains("theme-dark")).toBe(true);
      
      cleanupDarkPreference();
      
      // Mock system preference for light theme
      const cleanupLightPreference = simulateSystemThemePreference(false);
      
      // Create new wrapper with auto theme
      const wrapper2 = createWrapper(App, {}, { theme: "auto" });
      await flushPromises();
      
      // Get the new UI store
      const uiStore2 = useUIStore();
      
      // System light preference should be detected and applied
      expect(uiStore2.isDarkMode).toBe(false);
      expect(document.documentElement.classList.contains("theme-light")).toBe(true);
      
      cleanupLightPreference();
    });
  });
  
  describe("Component Theme Integration", () => {
    it("applies theme-specific styles to UI components", async () => {
      // Create button with light theme
      const lightButton = createWrapper(Button, {
        variant: "primary",
        label: "Light Button",
      }, { theme: "light" });
      
      // Light button should have light theme class
      expect(lightButton.find(".theme-light").exists()).toBe(true);
      
      // Create button with dark theme
      const darkButton = createWrapper(Button, {
        variant: "primary",
        label: "Dark Button",
      }, { theme: "dark" });
      
      // Dark button should have dark theme class
      expect(darkButton.find(".theme-dark").exists()).toBe(true);
      
      // Create card with light theme
      const lightCard = createWrapper(Card, {
        title: "Light Card",
      }, { 
        theme: "light",
        slots: {
          default: "<p>Card content</p>",
        },
      });
      
      // Light card should have light theme class
      expect(lightCard.find(".theme-light").exists()).toBe(true);
      
      // Create card with dark theme
      const darkCard = createWrapper(Card, {
        title: "Dark Card",
      }, { 
        theme: "dark",
        slots: {
          default: "<p>Card content</p>",
        },
      });
      
      // Dark card should have dark theme class
      expect(darkCard.find(".theme-dark").exists()).toBe(true);
    });
    
    it("updates component styles when theme changes", async () => {
      // Create button in light theme initially
      const button = createWrapper(Button, {
        variant: "primary",
        label: "Theme Changing Button",
      }, { theme: "light" });
      
      // Button should have light theme initially
      expect(button.find(".theme-light").exists()).toBe(true);
      
      // Get UI store
      const uiStore = useUIStore();
      
      // Change theme to dark
      uiStore.setTheme("dark");
      await flushPromises();
      
      // Button should update to dark theme
      expect(button.find(".theme-dark").exists()).toBe(true);
      expect(button.find(".theme-light").exists()).toBe(false);
    });
    
    it("handles high contrast mode in addition to theme", async () => {
      // Create alert component with high contrast mode
      const alert = createWrapper(Alert, {
        title: "High Contrast Alert",
        message: "This is a high contrast alert",
        variant: "info",
      }, { 
        theme: "light",
        uiState: {
          highContrast: true,
        },
      });
      
      // Alert should have high contrast class
      expect(alert.find(".high-contrast").exists()).toBe(true);
      
      // Get UI store
      const uiStore = useUIStore();
      
      // Disable high contrast
      uiStore.setHighContrast(false);
      await flushPromises();
      
      // High contrast class should be removed
      expect(alert.find(".high-contrast").exists()).toBe(false);
    });
  });
  
  describe("Theme Selector Component", () => {
    it("renders theme options correctly", async () => {
      // Create theme selector with light theme
      const themeSelector = createWrapper(ThemeSelector, {
        modelValue: "light",
      });
      
      // Should display three theme options
      const themeOptions = themeSelector.findAll(".theme-option");
      expect(themeOptions.length).toBe(3); // light, dark, auto
      
      // Light theme option should be selected
      const selectedOption = themeSelector.find(".theme-option--selected");
      expect(selectedOption.text()).toContain("theme.light");
    });
    
    it("emits update event when selecting a theme", async () => {
      // Create theme selector with light theme
      const themeSelector = createWrapper(ThemeSelector, {
        modelValue: "light",
      });
      
      // Find dark theme option
      const themeOptions = themeSelector.findAll(".theme-option");
      const darkOption = themeOptions.find(option => option.text().includes("theme.dark"));
      
      // Click dark theme option
      await darkOption.trigger("click");
      
      // Should emit update:modelValue event with "dark"
      expect(themeSelector.emitted("update:modelValue")).toBeTruthy();
      expect(themeSelector.emitted("update:modelValue")[0]).toEqual(["dark"]);
    });
    
    it("shows preview of theme when hovering options", async () => {
      // Create theme selector
      const themeSelector = createWrapper(ThemeSelector, {
        modelValue: "light",
      });
      
      // Find dark theme option
      const themeOptions = themeSelector.findAll(".theme-option");
      const darkOption = themeOptions.find(option => option.text().includes("theme.dark"));
      
      // Hover dark theme option
      await darkOption.trigger("mouseenter");
      
      // Should show theme preview
      expect(darkOption.find(".theme-preview").exists()).toBe(true);
      
      // Mouse leave
      await darkOption.trigger("mouseleave");
      
      // Preview should disappear
      expect(darkOption.find(".theme-preview").exists()).toBe(false);
    });
  });
  
  describe("Theme Integration in Complex Components", () => {
    it("applies theme correctly to ChatView", async () => {
      // Create chat view with light theme
      const chatView = createWrapper(ChatView, {}, { theme: "light" });
      await flushPromises();
      
      // Chat should have light theme
      expect(chatView.find(".theme-light").exists()).toBe(true);
      
      // Get UI store
      const uiStore = useUIStore();
      
      // Change to dark theme
      uiStore.setTheme("dark");
      await flushPromises();
      
      // Chat should update to dark theme
      expect(chatView.find(".theme-dark").exists()).toBe(true);
      
      // Message bubbles should have theme-specific styling
      const messageItems = chatView.findAll(".message-item");
      if (messageItems.length > 0) {
        // User message bubble in dark theme
        const userMessage = messageItems.find(msg => msg.classes().includes("message-user"));
        if (userMessage) {
          expect(userMessage.classes()).toContain("message-user--dark");
        }
        
        // Assistant message bubble in dark theme
        const assistantMessage = messageItems.find(msg => msg.classes().includes("message-assistant"));
        if (assistantMessage) {
          expect(assistantMessage.classes()).toContain("message-assistant--dark");
        }
      }
    });
    
    it("applies theme correctly to AdminPanel", async () => {
      // Create admin panel with light theme
      const adminPanel = createWrapper(AdminPanel, {}, { theme: "light" });
      await flushPromises();
      
      // Admin panel should have light theme
      expect(adminPanel.find(".theme-light").exists()).toBe(true);
      
      // Get UI store
      const uiStore = useUIStore();
      
      // Change to dark theme
      uiStore.setTheme("dark");
      await flushPromises();
      
      // Admin panel should update to dark theme
      expect(adminPanel.find(".theme-dark").exists()).toBe(true);
      
      // Admin components should have theme-specific styling
      expect(adminPanel.find(".admin-panel__sidebar--dark").exists()).toBe(true);
      
      // Select a tab to show content
      await adminPanel.vm.setActiveTab("users");
      await flushPromises();
      
      // Data tables should have theme-specific styling
      const dataTables = adminPanel.findAll(".data-table");
      if (dataTables.length > 0) {
        expect(dataTables[0].classes()).toContain("data-table--dark");
      }
    });
    
    it("applies theme correctly to SettingsPanel", async () => {
      // Create settings panel with dark theme
      const settingsPanel = createWrapper(SettingsPanel, {
        isVisible: true,
      }, { theme: "dark" });
      await flushPromises();
      
      // Settings panel should have dark theme
      expect(settingsPanel.find(".theme-dark").exists()).toBe(true);
      
      // Form elements should have theme-specific styling
      const formElements = settingsPanel.findAll("input, select");
      if (formElements.length > 0) {
        const formElement = formElements[0];
        const formItemParent = formElement.find(".form-item");
        if (formItemParent.exists()) {
          expect(formItemParent.classes()).toContain("form-item--dark");
        }
      }
    });
  });
  
  describe("Theme Persistence", () => {
    it("persists theme preference in localStorage", async () => {
      // Mock localStorage
      const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
      
      // Create app and get UI store
      const app = createWrapper(App, {}, { theme: "light" });
      const uiStore = useUIStore();
      
      // Change theme to dark
      uiStore.setTheme("dark");
      await flushPromises();
      
      // Should persist to localStorage
      expect(setItemSpy).toHaveBeenCalledWith(expect.stringContaining("theme"), expect.stringContaining("dark"));
      
      // Cleanup
      setItemSpy.mockRestore();
    });
    
    it("loads persisted theme on initialization", async () => {
      // Mock localStorage to return dark theme
      const getItemSpy = vi.spyOn(Storage.prototype, "getItem").mockImplementation((key) => {
        if (key.includes("theme")) return "dark";
        return null;
      });
      
      // Create app
      const app = createWrapper(App);
      await flushPromises();
      
      // Get UI store
      const uiStore = useUIStore();
      
      // Should load dark theme from localStorage
      expect(uiStore.theme).toBe("dark");
      expect(document.documentElement.classList.contains("theme-dark")).toBe(true);
      
      // Cleanup
      getItemSpy.mockRestore();
    });
  });
  
  describe("Color Scheme Transitions", () => {
    it("applies transition styles when changing themes", async () => {
      // Create app
      const app = createWrapper(App, {}, { theme: "light" });
      await flushPromises();
      
      // Get UI store
      const uiStore = useUIStore();
      
      // Check for transition styles before change
      const transitionBefore = document.documentElement.style.getPropertyValue("transition");
      
      // Change theme
      uiStore.setTheme("dark");
      
      // Check for transition styles after change
      const transitionAfter = document.documentElement.style.getPropertyValue("transition");
      
      // Transition should be applied temporarily
      expect(transitionAfter).toContain("color");
      expect(transitionAfter).toContain("background-color");
      
      // Wait for transition to complete
      await new Promise(r => setTimeout(r, 1000));
      
      // Transition should be removed after completion
      const transitionFinal = document.documentElement.style.getPropertyValue("transition");
      expect(transitionFinal).not.toContain("color");
    });
  });
  
  describe("Theme-specific Images and Assets", () => {
    it("loads correct logo variant based on theme", async () => {
      // Create app with light theme
      const lightApp = createWrapper(App, {}, { theme: "light" });
      await flushPromises();
      
      // Find logo image
      const lightLogo = lightApp.find(".app-logo img");
      if (lightLogo.exists()) {
        const lightLogoSrc = lightLogo.attributes("src");
        
        // Create app with dark theme
        const darkApp = createWrapper(App, {}, { theme: "dark" });
        await flushPromises();
        
        // Find logo image in dark theme
        const darkLogo = darkApp.find(".app-logo img");
        if (darkLogo.exists()) {
          const darkLogoSrc = darkLogo.attributes("src");
          
          // Logo sources should be different
          expect(lightLogoSrc).not.toBe(darkLogoSrc);
        }
      }
    });
    
    it("applies appropriate icon colors based on theme", async () => {
      // Create app with light theme
      const lightApp = createWrapper(App, {}, { theme: "light" });
      await flushPromises();
      
      // Find icons
      const lightIcons = lightApp.findAll(".icon, svg");
      if (lightIcons.length > 0) {
        const lightIconColor = getComputedCssVariable(lightIcons[0].element, "color");
        
        // Create app with dark theme
        const darkApp = createWrapper(App, {}, { theme: "dark" });
        await flushPromises();
        
        // Find icons in dark theme
        const darkIcons = darkApp.findAll(".icon, svg");
        if (darkIcons.length > 0) {
          const darkIconColor = getComputedCssVariable(darkIcons[0].element, "color");
          
          // Icon colors should be different
          expect(lightIconColor).not.toBe(darkIconColor);
        }
      }
    });
  });
});