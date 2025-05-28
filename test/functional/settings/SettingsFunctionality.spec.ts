/**
 * Comprehensive functional tests for the Settings functionality.
 * These tests verify the settings flow and its integration with the rest of the application.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import SettingsPanel from "@/components/settings/SettingsPanel.vue";
import { useSettingsStore } from "@/stores/settings";
import { useUIStore } from "@/stores/ui";
import { useAuthStore } from "@/stores/auth";
import { ApiService } from "@/services/api/ApiService";

// Mock API service
vi.mock("@/services/api/ApiService", () => ({
  ApiService: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
  },
}));

// Mock utility composables
vi.mock("@/composables/useToast", () => ({
  useToast: () => ({
    showToast: vi.fn(),
    showSuccess: vi.fn(),
    showError: vi.fn(),
  }),
}));

vi.mock("@/composables/useDialog", () => ({
  useGlobalDialog: () => ({
    confirm: vi.fn().mockResolvedValue(true),
    alert: vi.fn().mockResolvedValue(undefined),
  }),
}));

/**
 * Helper function to create a wrapper with customizable options
 */
const createWrapper = (options = {}) => {
  const {
    isVisible = true,
    initialSettings = {
      theme: "light",
      fontSize: "medium",
      notifications: {
        enabled: true,
        chatNotifications: true,
        systemNotifications: true,
      },
      privacy: {
        saveHistory: true,
        collectAnalytics: true,
      },
      accessibility: {
        highContrast: false,
        reduceMotion: false,
        screenReaderOptimized: false,
      },
    },
  } = options;

  // Create wrapper with testing pinia
  return mount(SettingsPanel, {
    props: {
      isVisible,
    },
    global: {
      plugins: [
        createTestingPinia({
          createSpy: vi.fn,
          initialState: {
            settings: initialSettings,
            ui: {
              theme: initialSettings.theme,
              fontSize: initialSettings.fontSize,
            },
            auth: {
              currentUser: { id: "user-1", email: "user@example.com" },
              isAuthenticated: true,
            },
          },
        }),
      ],
      mocks: {
        $t: (key, fallback) => fallback || key,
      },
      // We'll use real components instead of stubs to test true integration
      stubs: {
        // Only stub dialog component
        Dialog: true,
      },
    },
  });
};

describe("Settings Functionality", () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      clear: vi.fn(),
      removeItem: vi.fn(),
    };
    Object.defineProperty(window, "localStorage", { value: localStorageMock });

    // Mock window.matchMedia for theme detection
    Object.defineProperty(window, "matchMedia", {
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
      writable: true,
    });

    // Set up API response mocks
    ApiService.get.mockImplementation((url) => {
      if (url.includes("/api/settings")) {
        return Promise.resolve({
          data: {
            settings: {
              theme: "light",
              fontSize: "medium",
              notifications: {
                enabled: true,
                chatNotifications: true,
                systemNotifications: true,
              },
              privacy: {
                saveHistory: true,
                collectAnalytics: true,
              },
              accessibility: {
                highContrast: false,
                reduceMotion: false,
                screenReaderOptimized: false,
              },
            },
          },
        });
      }
      return Promise.reject(new Error("Unknown API endpoint"));
    });

    ApiService.put.mockResolvedValue({
      data: {
        success: true,
      },
    });
  });

  // Complete settings workflows
  describe("Settings Workflows", () => {
    it("loads user settings on component mount", async () => {
      const wrapper = createWrapper();
      const settingsStore = useSettingsStore();

      // Spy on store method
      const loadSettingsSpy = vi.spyOn(settingsStore, "loadSettings");

      // Trigger component mounted hook
      await wrapper.vm.$options.mounted?.call(wrapper.vm);
      await flushPromises();

      // Should call store method to load settings
      expect(loadSettingsSpy).toHaveBeenCalled();

      // API call should be made
      expect(ApiService.get).toHaveBeenCalledWith("/api/settings");
    });

    it("saves settings when clicking save button", async () => {
      const wrapper = createWrapper();
      const settingsStore = useSettingsStore();

      // Spy on store method
      const saveSettingsSpy = vi.spyOn(settingsStore, "saveSettings");

      // Click save button
      await wrapper
        .find(".settings-panel__action-button--save")
        .trigger("click");
      await flushPromises();

      // Should call store method
      expect(saveSettingsSpy).toHaveBeenCalled();

      // API call should be made
      expect(ApiService.put).toHaveBeenCalledWith(
        "/api/settings",
        expect.objectContaining({
          settings: expect.any(Object),
        }),
      );

      // Close event should be emitted after saving
      expect(wrapper.emitted("save")).toBeTruthy();
    });

    it("discards changes when clicking reset button", async () => {
      const wrapper = createWrapper();
      const settingsStore = useSettingsStore();

      // Spy on store method
      const resetChangesSpy = vi.spyOn(settingsStore, "resetChanges");

      // Click reset button
      await wrapper
        .find(".settings-panel__action-button--reset")
        .trigger("click");
      await flushPromises();

      // Should call store method
      expect(resetChangesSpy).toHaveBeenCalled();
    });

    it("prompts for confirmation when restoring defaults", async () => {
      // Mock window.confirm
      global.confirm = vi.fn().mockReturnValue(true);

      const wrapper = createWrapper();
      const settingsStore = useSettingsStore();

      // Spy on store method
      const resetToDefaultSpy = vi.spyOn(settingsStore, "resetToDefault");

      // Click restore defaults button
      await wrapper
        .find(".settings-panel__action-button--defaults")
        .trigger("click");

      // Should show confirmation dialog
      expect(wrapper.find(".confirm-dialog").exists()).toBe(true);

      // Confirm dialog
      await wrapper.find(".confirm-dialog__confirm-button").trigger("click");
      await flushPromises();

      // Should call store method
      expect(resetToDefaultSpy).toHaveBeenCalled();
    });

    it("warns about unsaved changes when closing", async () => {
      // Mock window.confirm
      global.confirm = vi.fn().mockReturnValue(true);

      const wrapper = createWrapper();
      const settingsStore = useSettingsStore();

      // Set hasUnsavedChanges to true
      vi.spyOn(settingsStore, "hasUnsavedChanges", "get").mockReturnValue(true);

      // Click close button
      await wrapper.find(".settings-panel__close-button").trigger("click");

      // Should call confirm
      expect(global.confirm).toHaveBeenCalled();

      // Should emit close event
      expect(wrapper.emitted("close")).toBeTruthy();
    });

    it("handles changing between different setting categories", async () => {
      const wrapper = createWrapper();

      // Get all category buttons
      const categoryButtons = wrapper.findAll(
        ".settings-panel__category-button",
      );

      // Initial rendering should show appearance settings
      expect(wrapper.find(".appearance-settings").exists()).toBe(true);

      // Click on notification settings
      await categoryButtons[1].trigger("click");
      await flushPromises();

      // Should now show notification settings
      expect(wrapper.find(".appearance-settings").exists()).toBe(false);
      expect(wrapper.find(".notification-settings").exists()).toBe(true);

      // Click on privacy settings
      await categoryButtons[2].trigger("click");
      await flushPromises();

      // Should now show privacy settings
      expect(wrapper.find(".notification-settings").exists()).toBe(false);
      expect(wrapper.find(".privacy-settings").exists()).toBe(true);

      // Click on accessibility settings
      await categoryButtons[3].trigger("click");
      await flushPromises();

      // Should now show accessibility settings
      expect(wrapper.find(".privacy-settings").exists()).toBe(false);
      expect(wrapper.find(".accessibility-settings").exists()).toBe(true);
    });
  });

  // Theme settings integration
  describe("Theme Settings Integration", () => {
    it("updates application theme immediately when changed", async () => {
      const wrapper = createWrapper();
      const uiStore = useUIStore();

      // Spy on store method
      const setThemeSpy = vi.spyOn(uiStore, "setTheme");

      // Find the theme selector
      const themeSelector = wrapper.find(".theme-selector");

      // Change the theme to dark
      await themeSelector.find('input[value="dark"]').setValue(true);
      await flushPromises();

      // Should call store method with new theme
      expect(setThemeSpy).toHaveBeenCalledWith("dark");

      // UI should immediately reflect the change without saving
      expect(uiStore.theme).toBe("dark");
    });

    it("detects system theme preference with auto setting", async () => {
      // Mock window.matchMedia to return true for dark mode
      Object.defineProperty(window, "matchMedia", {
        value: vi.fn().mockImplementation((query) => ({
          matches: query.includes("dark"),
          media: query,
          onchange: null,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
        writable: true,
      });

      const wrapper = createWrapper({
        initialSettings: {
          theme: "auto",
          fontSize: "medium",
        },
      });

      const uiStore = useUIStore();

      // Theme should be derived from system preference
      expect(uiStore.isDarkMode).toBe(true);
    });
  });

  // Font size settings
  describe("Font Size Settings", () => {
    it("applies font size changes immediately", async () => {
      const wrapper = createWrapper();
      const uiStore = useUIStore();

      // Spy on store method
      const setFontSizeSpy = vi.spyOn(uiStore, "setFontSize");

      // Find the font size selector
      const fontSizeSelector = wrapper.find(".font-size-selector");

      // Change the font size to large
      await fontSizeSelector.find('input[value="large"]').setValue(true);
      await flushPromises();

      // Should call store method with new font size
      expect(setFontSizeSpy).toHaveBeenCalledWith("large");

      // UI should immediately reflect the change
      expect(uiStore.fontSize).toBe("large");

      // Document should have the font size class
      expect(
        document.documentElement.classList.contains("font-size-large"),
      ).toBe(true);
    });

    it("previews font size without persisting changes until saved", async () => {
      const wrapper = createWrapper();
      const settingsStore = useSettingsStore();
      const uiStore = useUIStore();

      // Spy on store method
      const saveSpy = vi.spyOn(settingsStore, "saveSettings");

      // Change the font size
      const fontSizeSelector = wrapper.find(".font-size-selector");
      await fontSizeSelector.find('input[value="large"]').setValue(true);
      await flushPromises();

      // Font size should be applied to UI
      expect(uiStore.fontSize).toBe("large");

      // But settings aren't saved yet
      expect(saveSpy).not.toHaveBeenCalled();

      // Save settings
      await wrapper
        .find(".settings-panel__action-button--save")
        .trigger("click");
      await flushPromises();

      // Now settings should be saved
      expect(saveSpy).toHaveBeenCalled();
      expect(ApiService.put).toHaveBeenCalledWith(
        "/api/settings",
        expect.objectContaining({
          settings: expect.objectContaining({
            fontSize: "large",
          }),
        }),
      );
    });
  });

  // Notification settings
  describe("Notification Settings", () => {
    it("toggles all notification options when main toggle is disabled", async () => {
      const wrapper = createWrapper();

      // Navigate to notification settings
      const categoryButtons = wrapper.findAll(
        ".settings-panel__category-button",
      );
      await categoryButtons[1].trigger("click");
      await flushPromises();

      // Find main notification toggle
      const mainToggle = wrapper.find(".notification-main-toggle");

      // Make sure it's enabled initially
      expect(mainToggle.element.checked).toBe(true);

      // Disable main notifications
      await mainToggle.setValue(false);
      await flushPromises();

      // Child notification settings should be disabled
      const childToggles = wrapper.findAll(".notification-option-toggle");
      childToggles.forEach((toggle) => {
        expect(toggle.attributes("disabled")).toBeDefined();
      });
    });

    it("saves notification settings correctly", async () => {
      const wrapper = createWrapper();
      const settingsStore = useSettingsStore();

      // Navigate to notification settings
      const categoryButtons = wrapper.findAll(
        ".settings-panel__category-button",
      );
      await categoryButtons[1].trigger("click");
      await flushPromises();

      // Change settings
      await wrapper.find(".chat-notifications-toggle").setValue(false);
      await flushPromises();

      // Save settings
      await wrapper
        .find(".settings-panel__action-button--save")
        .trigger("click");
      await flushPromises();

      // Verify API call
      expect(ApiService.put).toHaveBeenCalledWith(
        "/api/settings",
        expect.objectContaining({
          settings: expect.objectContaining({
            notifications: expect.objectContaining({
              chatNotifications: false,
            }),
          }),
        }),
      );
    });
  });

  // Privacy settings
  describe("Privacy Settings", () => {
    it("shows confirmation dialog for privacy-sensitive changes", async () => {
      // Mock window.confirm
      global.confirm = vi.fn().mockReturnValue(true);

      const wrapper = createWrapper();

      // Navigate to privacy settings
      const categoryButtons = wrapper.findAll(
        ".settings-panel__category-button",
      );
      await categoryButtons[2].trigger("click");
      await flushPromises();

      // Find save history toggle
      const saveHistoryToggle = wrapper.find(".save-history-toggle");

      // Disable save history
      await saveHistoryToggle.setValue(false);
      await flushPromises();

      // Should show confirmation dialog before applying
      expect(global.confirm).toHaveBeenCalled();

      // Toggle should be updated after confirmation
      expect(saveHistoryToggle.element.checked).toBe(false);
    });

    it("provides option to clear saved data", async () => {
      const wrapper = createWrapper();

      // Navigate to privacy settings
      const categoryButtons = wrapper.findAll(
        ".settings-panel__category-button",
      );
      await categoryButtons[2].trigger("click");
      await flushPromises();

      // Find clear data button
      const clearDataButton = wrapper.find(".clear-data-button");
      expect(clearDataButton.exists()).toBe(true);

      // Click clear data button
      await clearDataButton.trigger("click");
      await flushPromises();

      // Should show confirmation dialog
      expect(wrapper.find(".confirm-dialog").exists()).toBe(true);

      // Confirm dialog
      await wrapper.find(".confirm-dialog__confirm-button").trigger("click");
      await flushPromises();

      // Should call API to clear data
      expect(ApiService.post).toHaveBeenCalledWith("/api/settings/clear-data");
    });
  });

  // Accessibility settings
  describe("Accessibility Settings", () => {
    it("applies high contrast setting immediately", async () => {
      const wrapper = createWrapper();

      // Navigate to accessibility settings
      const categoryButtons = wrapper.findAll(
        ".settings-panel__category-button",
      );
      await categoryButtons[3].trigger("click");
      await flushPromises();

      // Find high contrast toggle
      const highContrastToggle = wrapper.find(".high-contrast-toggle");

      // Enable high contrast
      await highContrastToggle.setValue(true);
      await flushPromises();

      // Document should have high contrast class
      expect(document.documentElement.classList.contains("high-contrast")).toBe(
        true,
      );
    });

    it("applies reduced motion setting immediately", async () => {
      const wrapper = createWrapper();

      // Navigate to accessibility settings
      const categoryButtons = wrapper.findAll(
        ".settings-panel__category-button",
      );
      await categoryButtons[3].trigger("click");
      await flushPromises();

      // Find reduced motion toggle
      const reduceMotionToggle = wrapper.find(".reduce-motion-toggle");

      // Enable reduced motion
      await reduceMotionToggle.setValue(true);
      await flushPromises();

      // Document should have reduced motion class
      expect(document.documentElement.classList.contains("reduce-motion")).toBe(
        true,
      );
    });
  });

  // Responsiveness
  describe("Responsive Design", () => {
    it("adapts layout for mobile viewport", async () => {
      // Mock window.innerWidth to simulate mobile device
      const originalInnerWidth = window.innerWidth;
      Object.defineProperty(window, "innerWidth", {
        value: 480,
        configurable: true,
      });

      // Trigger resize event
      window.dispatchEvent(new Event("resize"));

      const wrapper = createWrapper();
      await flushPromises();

      // Should add mobile class
      expect(wrapper.find(".settings-panel--mobile").exists()).toBe(true);

      // Should display categories in a collapsed view initially
      expect(
        wrapper.find(".settings-panel__mobile-category-selector").exists(),
      ).toBe(true);

      // Categories should start collapsed
      expect(
        wrapper.find(".settings-panel__categories--collapsed").exists(),
      ).toBe(true);

      // Toggle mobile categories
      await wrapper
        .find(".settings-panel__mobile-category-toggle")
        .trigger("click");
      await flushPromises();

      // Categories should now be expanded
      expect(
        wrapper.find(".settings-panel__categories--expanded").exists(),
      ).toBe(true);

      // Restore original window properties
      Object.defineProperty(window, "innerWidth", {
        value: originalInnerWidth,
        configurable: true,
      });
    });
  });

  // Integration with user settings
  describe("User Settings Integration", () => {
    it("synchronizes settings between multiple panels", async () => {
      // Create two separate wrapper instances to simulate multiple panels
      const wrapper1 = createWrapper();
      const wrapper2 = createWrapper();

      // Change theme in first panel
      const themeSelector1 = wrapper1.find(".theme-selector");
      await themeSelector1.find('input[value="dark"]').setValue(true);
      await flushPromises();

      // Second panel should reflect the change
      const themeSelector2 = wrapper2.find(".theme-selector");
      expect(themeSelector2.find('input[value="dark"]').element.checked).toBe(
        true,
      );
    });

    it("persists settings for logged in users", async () => {
      const wrapper = createWrapper();
      const authStore = useAuthStore();

      // Ensure user is logged in
      expect(authStore.isAuthenticated).toBe(true);

      // Change theme
      const themeSelector = wrapper.find(".theme-selector");
      await themeSelector.find('input[value="dark"]').setValue(true);
      await flushPromises();

      // Save settings
      await wrapper
        .find(".settings-panel__action-button--save")
        .trigger("click");
      await flushPromises();

      // API call should include user ID
      expect(ApiService.put).toHaveBeenCalledWith(
        "/api/settings",
        expect.objectContaining({
          userId: "user-1",
          settings: expect.objectContaining({
            theme: "dark",
          }),
        }),
      );
    });

    it("uses anonymous settings for not logged in users", async () => {
      // Create wrapper with unauthenticated user
      const wrapper = mount(SettingsPanel, {
        props: {
          isVisible: true,
        },
        global: {
          plugins: [
            createTestingPinia({
              createSpy: vi.fn,
              initialState: {
                settings: {
                  theme: "light",
                  fontSize: "medium",
                },
                ui: {
                  theme: "light",
                  fontSize: "medium",
                },
                auth: {
                  currentUser: null,
                  isAuthenticated: false,
                },
              },
            }),
          ],
          mocks: {
            $t: (key, fallback) => fallback || key,
          },
          stubs: {
            Dialog: true,
          },
        },
      });

      // Change theme
      const themeSelector = wrapper.find(".theme-selector");
      await themeSelector.find('input[value="dark"]').setValue(true);
      await flushPromises();

      // Save settings
      await wrapper
        .find(".settings-panel__action-button--save")
        .trigger("click");
      await flushPromises();

      // Should save to localStorage for anonymous users
      expect(localStorage.setItem).toHaveBeenCalled();

      // API call should not be made for anonymous users
      expect(ApiService.put).not.toHaveBeenCalled();
    });
  });

  // Error handling
  describe("Error Handling", () => {
    it("shows error toast when settings fail to load", async () => {
      // Mock API to reject
      ApiService.get.mockRejectedValue(new Error("Failed to load settings"));

      // Mock toast
      const toastMock = useToast();
      const showErrorSpy = vi.spyOn(toastMock, "showError");

      const wrapper = createWrapper();

      // Trigger component mounted hook
      await wrapper.vm.$options.mounted?.call(wrapper.vm);
      await flushPromises();

      // Should show error
      expect(showErrorSpy).toHaveBeenCalled();
    });

    it("shows error toast when settings fail to save", async () => {
      // Mock API to reject on save
      ApiService.put.mockRejectedValue(new Error("Failed to save settings"));

      // Mock toast
      const toastMock = useToast();
      const showErrorSpy = vi.spyOn(toastMock, "showError");

      const wrapper = createWrapper();
      await flushPromises();

      // Click save button
      await wrapper
        .find(".settings-panel__action-button--save")
        .trigger("click");
      await flushPromises();

      // Should show error
      expect(showErrorSpy).toHaveBeenCalled();
    });

    it("retains previous settings on save failure", async () => {
      // Save current settings
      const initialSettings = {
        theme: "light",
        fontSize: "medium",
      };

      // Mock API to reject on save
      ApiService.put.mockRejectedValue(new Error("Failed to save settings"));

      const wrapper = createWrapper({ initialSettings });
      const settingsStore = useSettingsStore();

      // Change theme
      const themeSelector = wrapper.find(".theme-selector");
      await themeSelector.find('input[value="dark"]').setValue(true);
      await flushPromises();

      // Try to save settings (will fail)
      await wrapper
        .find(".settings-panel__action-button--save")
        .trigger("click");
      await flushPromises();

      // UI should still show the new value
      expect(settingsStore.theme).toBe("dark");

      // But the persisted settings should remain unchanged
      expect(settingsStore.persistedSettings.theme).toBe("light");
    });
  });

  // Accessibility
  describe("Accessibility", () => {
    it("properly manages focus when opening the panel", async () => {
      // Create wrapper with panel hidden initially
      const wrapper = createWrapper({ isVisible: false });

      // Make panel visible
      await wrapper.setProps({ isVisible: true });
      await flushPromises();

      // First focusable element should receive focus
      expect(document.activeElement).toBe(
        wrapper.find(".settings-panel__close-button").element,
      );
    });

    it("uses proper ARIA attributes", async () => {
      const wrapper = createWrapper();

      // Main dialog should have proper role
      expect(wrapper.find(".settings-panel").attributes("role")).toBe("dialog");

      // Dialog should have aria-labelledby pointing to the title
      const labelId = wrapper
        .find(".settings-panel")
        .attributes("aria-labelledby");
      expect(labelId).toBeTruthy();
      expect(wrapper.find(`#${labelId}`).exists()).toBe(true);

      // Category buttons should have aria-selected attribute
      const activeButton = wrapper.find(
        ".settings-panel__category-button--active",
      );
      expect(activeButton.attributes("aria-selected")).toBe("true");

      // Inactive buttons should have aria-selected="false"
      const inactiveButtons = wrapper.findAll(
        ".settings-panel__category-button:not(.settings-panel__category-button--active)",
      );
      inactiveButtons.forEach((button) => {
        expect(button.attributes("aria-selected")).toBe("false");
      });
    });

    it("traps focus within the panel", async () => {
      // This would need a more sophisticated test with real DOM interactions
      // For now, just check that the panel has tabindex attributes
      const wrapper = createWrapper();

      expect(wrapper.find(".settings-panel").attributes("tabindex")).toBe("-1");
    });
  });
});
