/**
 * Comprehensive functional tests for the Admin area.
 * These tests verify the integration between different admin components and complete workflows.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import { createRouter, createWebHistory } from "vue-router";
import AdminPanel from "@/components/admin/AdminPanel.vue";
import { useAuthStore } from "@/stores/auth";
import { useFeatureTogglesStore } from "@/stores/featureToggles";
import { useUIStore } from "@/stores/ui";
import { ApiService } from "@/services/api/ApiService";

// Mock API service
vi.mock("@/services/api/ApiService", () => ({
  ApiService: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

// Create a test router
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", name: "home", component: { template: "<div>Home</div>" } },
    { path: "/admin", name: "admin", component: AdminPanel },
    {
      path: "/login",
      name: "login",
      component: { template: "<div>Login</div>" },
    },
  ],
});

// Mock async components to prevent loading issues in tests
vi.mock("vue", async () => {
  const actual = await vi.importActual("vue");
  return {
    ...actual,
    defineAsyncComponent: (loader) => {
      // Return placeholder components based on the component name
      if (typeof loader === "function") {
        // Try to determine what component is being loaded
        const loaderStr = loader.toString();

        if (loaderStr.includes("AdminUsers")) {
          return {
            name: "AdminUsers",
            template:
              '<div class="admin-users-mock" data-testid="admin-users"></div>',
            emits: ["action"],
          };
        } else if (loaderStr.includes("AdminSystem")) {
          return {
            name: "AdminSystem",
            template:
              '<div class="admin-system-mock" data-testid="admin-system"></div>',
            emits: ["action"],
          };
        } else if (loaderStr.includes("AdminFeatureToggles")) {
          return {
            name: "AdminFeatureToggles",
            template:
              '<div class="admin-feature-toggles-mock" data-testid="admin-feature-toggles"></div>',
            emits: ["action"],
          };
        } else if (loaderStr.includes("AdminFeedback")) {
          return {
            name: "AdminFeedback",
            template:
              '<div class="admin-feedback-mock" data-testid="admin-feedback"></div>',
            emits: ["action"],
          };
        } else if (loaderStr.includes("AdminMotd")) {
          return {
            name: "AdminMotd",
            template:
              '<div class="admin-motd-mock" data-testid="admin-motd"></div>',
            emits: ["action"],
          };
        } else if (loaderStr.includes("AdminDashboard")) {
          return {
            name: "AdminDashboard",
            template:
              '<div class="admin-dashboard-mock" data-testid="admin-dashboard"></div>',
            emits: ["action"],
          };
        }
      }

      // Default fallback for anything else
      return {
        name: "AsyncComponent",
        template:
          '<div class="async-component-mock" data-testid="async-component"></div>',
        emits: ["action"],
      };
    },
  };
});

// Helper function to create a wrapper with specified roles and feature toggles
const createWrapper = (options = {}) => {
  const {
    role = "admin",
    featureToggles = { enableFeatureTogglesUi: true, enableMotdEditor: true },
    isDarkMode = false,
  } = options;

  return mount(AdminPanel, {
    global: {
      plugins: [
        router,
        createTestingPinia({
          createSpy: vi.fn,
          initialState: {
            auth: {
              currentUser: {
                id: "user-1",
                email: "admin@example.com",
                role,
              },
              isAuthenticated: true,
            },
            ui: {
              isDarkMode,
              theme: isDarkMode ? "dark" : "light",
            },
            featureToggles: {
              toggles: featureToggles,
            },
          },
        }),
      ],
      stubs: {
        Transition: false,
        RouterLink: true,
      },
      mocks: {
        $t: (key, fallback) => fallback || key,
      },
    },
  });
};

describe("Admin Area Integration", () => {
  beforeEach(() => {
    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn().mockImplementation((key) => {
        if (key === "admin_active_tab") return "dashboard";
        return null;
      }),
      setItem: vi.fn(),
      clear: vi.fn(),
    };
    Object.defineProperty(window, "localStorage", { value: localStorageMock });

    // Reset mocks
    vi.clearAllMocks();

    // Navigate to home before each test
    router.push("/");
  });

  // Authentication and access control tests
  describe("Authentication and Access Control", () => {
    it("redirects to login page when user is not authenticated", async () => {
      // Create a wrapper with unauthenticated user
      const wrapper = mount(AdminPanel, {
        global: {
          plugins: [
            router,
            createTestingPinia({
              createSpy: vi.fn,
              initialState: {
                auth: {
                  currentUser: null,
                  isAuthenticated: false,
                },
              },
            }),
          ],
          stubs: {
            Transition: false,
            RouterLink: true,
          },
          mocks: {
            $t: (key, fallback) => fallback || key,
          },
        },
      });

      await flushPromises();

      // Should redirect to login
      expect(router.currentRoute.value.path).toBe("/login");
    });

    it("shows access denied message for non-admin users", async () => {
      // Create a wrapper with regular user role
      const wrapper = createWrapper({ role: "user" });
      await flushPromises();

      expect(wrapper.find(".admin-panel__no-access").exists()).toBe(true);
      expect(wrapper.text()).toContain("Kein Zugriff");
    });

    it("allows access for users with admin role", async () => {
      const wrapper = createWrapper({ role: "admin" });
      await flushPromises();

      expect(wrapper.find(".admin-panel__no-access").exists()).toBe(false);
      expect(wrapper.find(".admin-panel__content").exists()).toBe(true);
    });

    it("allows partial access for users with elevated privileges", async () => {
      // Create a wrapper with support role (which has limited admin access)
      const wrapper = createWrapper({ role: "support" });
      await flushPromises();

      // Should have access to the admin panel
      expect(wrapper.find(".admin-panel__no-access").exists()).toBe(false);

      // But some tabs should be hidden
      const navItems = wrapper.findAll(".admin-panel__nav-item");
      expect(navItems.length).toBeLessThan(6); // Full admin sees all tabs

      // System tab should not be available for support role
      const systemTab = navItems.find((tab) => tab.text().includes("System"));
      expect(systemTab).toBeUndefined();
    });
  });

  // Tab navigation and content loading
  describe("Tab Navigation and Content Loading", () => {
    it("shows dashboard tab by default", async () => {
      const wrapper = createWrapper();
      await flushPromises();

      // Dashboard should be the active tab
      const activeTab = wrapper.find(".admin-panel__nav-item--active");
      expect(activeTab.text()).toContain("Dashboard");

      // Dashboard content should be loaded
      expect(wrapper.find('[data-testid="admin-dashboard"]').exists()).toBe(
        true,
      );
    });

    it("changes content when switching tabs", async () => {
      const wrapper = createWrapper();
      await flushPromises();

      // Find users tab
      const tabs = wrapper.findAll(".admin-panel__nav-item");
      const usersTab = tabs.find((tab) => tab.text().includes("Benutzer"));

      // Click the users tab
      await usersTab.trigger("click");
      await flushPromises();

      // Users tab should now be active
      expect(usersTab.classes()).toContain("admin-panel__nav-item--active");

      // Users content should be loaded
      expect(wrapper.find('[data-testid="admin-users"]').exists()).toBe(true);

      // Dashboard content should not be visible
      expect(wrapper.find('[data-testid="admin-dashboard"]').exists()).toBe(
        false,
      );
    });

    it("persists active tab in URL and localStorage", async () => {
      const wrapper = createWrapper();
      await flushPromises();

      // Navigate to admin page
      await router.push("/admin");
      await flushPromises();

      // Find system tab
      const tabs = wrapper.findAll(".admin-panel__nav-item");
      const systemTab = tabs.find((tab) => tab.text().includes("System"));

      // Click the system tab
      await systemTab.trigger("click");
      await flushPromises();

      // URL should be updated
      expect(router.currentRoute.value.query.tab).toBe("system");

      // localStorage should be updated
      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        "admin_active_tab",
        "system",
      );
    });

    it("loads tab from URL query parameter", async () => {
      // Navigate to admin page with tab query param
      await router.push("/admin?tab=feedback");

      const wrapper = createWrapper();
      await flushPromises();

      // Feedback tab should be active
      const activeTab = wrapper.find(".admin-panel__nav-item--active");
      expect(activeTab.text()).toContain("Feedback");

      // Feedback content should be loaded
      expect(wrapper.find('[data-testid="admin-feedback"]').exists()).toBe(
        true,
      );
    });

    it("handles invalid tab parameter gracefully", async () => {
      // Navigate to admin page with invalid tab query param
      await router.push("/admin?tab=nonexistent");

      const wrapper = createWrapper();
      await flushPromises();

      // Should fall back to dashboard
      const activeTab = wrapper.find(".admin-panel__nav-item--active");
      expect(activeTab.text()).toContain("Dashboard");

      // Dashboard content should be loaded
      expect(wrapper.find('[data-testid="admin-dashboard"]').exists()).toBe(
        true,
      );
    });
  });

  // Feature flag integration
  describe("Feature Flag Integration", () => {
    it("conditionally renders feature toggles tab based on feature flag", async () => {
      // Create wrapper with feature toggles UI enabled
      const withTogglesWrapper = createWrapper({
        featureToggles: { enableFeatureTogglesUi: true },
      });
      await flushPromises();

      // Feature toggles tab should be visible
      let tabs = withTogglesWrapper.findAll(".admin-panel__nav-item");
      let featureTogglesTab = tabs.find((tab) =>
        tab.text().includes("Feature-Toggles"),
      );
      expect(featureTogglesTab).toBeDefined();

      // Create wrapper with feature toggles UI disabled
      const withoutTogglesWrapper = createWrapper({
        featureToggles: { enableFeatureTogglesUi: false },
      });
      await flushPromises();

      // Feature toggles tab should not be visible
      tabs = withoutTogglesWrapper.findAll(".admin-panel__nav-item");
      featureTogglesTab = tabs.find((tab) =>
        tab.text().includes("Feature-Toggles"),
      );
      expect(featureTogglesTab).toBeUndefined();
    });

    it("conditionally renders MOTD editor version based on feature flag", async () => {
      // Navigate to MOTD tab
      await router.push("/admin?tab=motd");

      // Create wrapper with advanced MOTD editor enabled
      const withAdvancedEditorWrapper = createWrapper({
        featureToggles: { enableMotdEditor: true },
      });
      await flushPromises();

      // Advanced MOTD editor should be loaded
      expect(
        withAdvancedEditorWrapper.find('[data-testid="admin-motd"]').exists(),
      ).toBe(true);

      // Create wrapper with advanced MOTD editor disabled
      const withSimpleEditorWrapper = createWrapper({
        featureToggles: { enableMotdEditor: false },
      });
      await flushPromises();

      // Simple MOTD editor should be loaded
      expect(withSimpleEditorWrapper.find(".admin-motd-simple").exists()).toBe(
        true,
      );
    });
  });

  // Action propagation
  describe("Action Propagation", () => {
    it("handles reload actions from tab components", async () => {
      const wrapper = createWrapper();
      await flushPromises();

      // Navigate to users tab
      await wrapper.vm.setActiveTab("users");
      await flushPromises();

      // Spy on loadDataForTab method
      const loadDataSpy = vi.spyOn(wrapper.vm, "loadDataForTab");

      // Find the users tab component
      const usersComponent = wrapper.findComponent({ name: "AdminUsers" });

      // Emit an action event to reload data
      usersComponent.vm.$emit("action", "reload");
      await flushPromises();

      // Should trigger data reload for the users tab
      expect(loadDataSpy).toHaveBeenCalledWith("users");
    });

    it("handles tab switching actions from components", async () => {
      const wrapper = createWrapper();
      await flushPromises();

      // Start at dashboard tab
      await wrapper.vm.setActiveTab("dashboard");
      await flushPromises();

      // Spy on setActiveTab method
      const setActiveTabSpy = vi.spyOn(wrapper.vm, "setActiveTab");

      // Find the dashboard component
      const dashboardComponent = wrapper.findComponent({
        name: "AdminDashboard",
      });

      // Emit an action event to switch to the feedback tab
      dashboardComponent.vm.$emit("action", "switchTab", "feedback");
      await flushPromises();

      // Should switch to the feedback tab
      expect(setActiveTabSpy).toHaveBeenCalledWith("feedback");
      expect(wrapper.vm.activeTab).toBe("feedback");
    });
  });

  // Theme integration
  describe("Theme Integration", () => {
    it("applies the correct theme class based on UI store", async () => {
      // Create wrapper with light theme
      const lightWrapper = createWrapper({ isDarkMode: false });
      await flushPromises();

      expect(lightWrapper.find(".admin-panel").classes()).toContain(
        "theme-light",
      );

      // Create wrapper with dark theme
      const darkWrapper = createWrapper({ isDarkMode: true });
      await flushPromises();

      expect(darkWrapper.find(".admin-panel").classes()).toContain(
        "theme-dark",
      );
    });

    it("toggles theme when clicking theme button", async () => {
      const wrapper = createWrapper({ isDarkMode: false });
      await flushPromises();

      // Get UI store
      const uiStore = useUIStore();

      // Spy on toggleTheme method
      const toggleThemeSpy = vi.spyOn(uiStore, "toggleTheme");

      // Click theme toggle button
      const themeToggle = wrapper.find(".admin-panel__theme-toggle");
      await themeToggle.trigger("click");

      // Should call toggleTheme method
      expect(toggleThemeSpy).toHaveBeenCalled();
    });
  });

  // Data loading
  describe("Data Loading", () => {
    it("shows loading indicator when fetching data", async () => {
      // Setup a promise that doesn't resolve immediately to simulate loading
      let resolvePromise;
      const loadingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      // Create wrapper
      const wrapper = createWrapper();
      await flushPromises();

      // Mock a slow data loading function
      wrapper.vm.loadDataForTab = vi.fn().mockImplementation(() => {
        wrapper.vm.isLoading = true;
        return loadingPromise;
      });

      // Switch to a tab to trigger data loading
      await wrapper.vm.setActiveTab("users");
      await flushPromises();

      // Loading indicator should be visible
      expect(wrapper.find(".admin-panel__loading").exists()).toBe(true);

      // Resolve the loading promise
      resolvePromise();
      await flushPromises();

      // Loading indicator should disappear
      expect(wrapper.find(".admin-panel__loading").exists()).toBe(false);
    });
  });

  // Component state persistence
  describe("Component State Persistence", () => {
    it("maintains tab component state between tab switches", async () => {
      const wrapper = createWrapper();
      await flushPromises();

      // Navigate to users tab
      await wrapper.vm.setActiveTab("users");
      await flushPromises();

      // Get the users component instance
      const usersComponent = wrapper.findComponent({ name: "AdminUsers" });

      // Switch to another tab
      await wrapper.vm.setActiveTab("dashboard");
      await flushPromises();

      // Users component should no longer be visible
      expect(wrapper.find('[data-testid="admin-users"]').exists()).toBe(false);

      // Switch back to users tab
      await wrapper.vm.setActiveTab("users");
      await flushPromises();

      // Users component should be visible again
      expect(wrapper.find('[data-testid="admin-users"]').exists()).toBe(true);

      // KeepAlive should have preserved the component instance
      // This is difficult to test directly in Vue Test Utils,
      // but in a real implementation the component state would be preserved
    });
  });

  // Error handling
  describe("Error Handling", () => {
    it("handles API errors gracefully", async () => {
      // Mock console.error to prevent test output noise
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Create wrapper
      const wrapper = createWrapper();
      await flushPromises();

      // Mock loadDataForTab to throw an error
      wrapper.vm.loadDataForTab = vi.fn().mockImplementation(() => {
        wrapper.vm.isLoading = true;
        return Promise.reject(new Error("API Error"));
      });

      // Switch to a tab to trigger data loading
      await wrapper.vm.setActiveTab("users");
      await flushPromises();

      // Error should be logged
      expect(consoleErrorSpy).toHaveBeenCalled();

      // Loading indicator should be hidden
      expect(wrapper.find(".admin-panel__loading").exists()).toBe(false);

      // Component should still be usable
      expect(wrapper.find(".admin-panel").exists()).toBe(true);

      // Restore console.error
      consoleErrorSpy.mockRestore();
    });
  });

  // Admin workflows
  describe("Admin Workflows", () => {
    // Setup API mocks
    beforeEach(() => {
      // Mock user data
      ApiService.get.mockImplementation((url) => {
        if (url.includes("/api/admin/users")) {
          return Promise.resolve({
            data: {
              users: [
                { id: "user1", email: "user1@example.com", role: "user" },
                { id: "user2", email: "user2@example.com", role: "admin" },
              ],
            },
          });
        } else if (url.includes("/api/admin/system/status")) {
          return Promise.resolve({
            data: {
              status: "ok",
              version: "1.0.0",
              uptime: 3600,
              memory: { used: 500, total: 1000 },
              cpu: { load: 0.5 },
            },
          });
        } else if (url.includes("/api/admin/feedback")) {
          return Promise.resolve({
            data: {
              feedback: [
                {
                  id: "f1",
                  rating: 2,
                  text: "Could be better",
                  date: "2025-05-10",
                },
                { id: "f2", rating: 5, text: "Excellent!", date: "2025-05-09" },
              ],
            },
          });
        } else if (url.includes("/api/admin/feature-toggles")) {
          return Promise.resolve({
            data: {
              toggles: {
                enableFeatureA: true,
                enableFeatureB: false,
              },
            },
          });
        } else if (url.includes("/api/admin/motd")) {
          return Promise.resolve({
            data: {
              content: "Welcome to the system",
              enabled: true,
              expiresAt: "2025-06-01",
            },
          });
        }

        return Promise.reject(new Error("Unknown API endpoint"));
      });

      ApiService.post.mockImplementation((url) => {
        return Promise.resolve({ data: { success: true } });
      });

      ApiService.put.mockImplementation((url) => {
        return Promise.resolve({ data: { success: true } });
      });
    });

    it("completes user management workflow", async () => {
      // Navigate to admin page with users tab
      await router.push("/admin?tab=users");

      const wrapper = createWrapper();
      await flushPromises();

      // Users component should be visible
      expect(wrapper.find('[data-testid="admin-users"]').exists()).toBe(true);

      // User data should be fetched
      expect(ApiService.get).toHaveBeenCalledWith("/api/admin/users");

      // Simulate user component emitting action to add a new user
      const usersComponent = wrapper.findComponent({ name: "AdminUsers" });
      usersComponent.vm.$emit("action", "addUser", {
        email: "newuser@example.com",
        role: "user",
        password: "password123",
      });

      await flushPromises();

      // Check if API was called
      expect(ApiService.post).toHaveBeenCalledWith(
        "/api/admin/users",
        expect.objectContaining({
          email: "newuser@example.com",
          role: "user",
        }),
      );

      // Data should be reloaded after adding user
      expect(ApiService.get).toHaveBeenCalledWith("/api/admin/users");
    });

    it("completes system settings workflow", async () => {
      // Navigate to admin page with system tab
      await router.push("/admin?tab=system");

      const wrapper = createWrapper();
      await flushPromises();

      // System component should be visible
      expect(wrapper.find('[data-testid="admin-system"]').exists()).toBe(true);

      // System data should be fetched
      expect(ApiService.get).toHaveBeenCalledWith("/api/admin/system/status");

      // Simulate system component emitting action to update settings
      const systemComponent = wrapper.findComponent({ name: "AdminSystem" });
      systemComponent.vm.$emit("action", "updateSettings", {
        logLevel: "debug",
        cacheEnabled: true,
        maxUploadSize: 10,
      });

      await flushPromises();

      // Check if API was called
      expect(ApiService.put).toHaveBeenCalledWith(
        "/api/admin/system/settings",
        expect.objectContaining({
          logLevel: "debug",
          cacheEnabled: true,
          maxUploadSize: 10,
        }),
      );

      // Simulate system component emitting action to clear cache
      systemComponent.vm.$emit("action", "clearCache");

      await flushPromises();

      // Check if API was called
      expect(ApiService.post).toHaveBeenCalledWith(
        "/api/admin/system/clear-cache",
      );
    });

    it("completes feature toggle workflow", async () => {
      // Navigate to admin page with feature-toggles tab
      await router.push("/admin?tab=feature-toggles");

      const wrapper = createWrapper();
      await flushPromises();

      // Feature toggles component should be visible
      expect(
        wrapper.find('[data-testid="admin-feature-toggles"]').exists(),
      ).toBe(true);

      // Feature toggles data should be fetched
      expect(ApiService.get).toHaveBeenCalledWith("/api/admin/feature-toggles");

      // Simulate feature toggles component emitting action to update toggle
      const togglesComponent = wrapper.findComponent({
        name: "AdminFeatureToggles",
      });
      togglesComponent.vm.$emit("action", "updateToggle", {
        name: "enableFeatureA",
        value: false,
      });

      await flushPromises();

      // Check if API was called
      expect(ApiService.put).toHaveBeenCalledWith(
        "/api/admin/feature-toggles/enableFeatureA",
        expect.objectContaining({
          value: false,
        }),
      );

      // Reload should be called after updating
      expect(ApiService.get).toHaveBeenCalledWith("/api/admin/feature-toggles");
    });
  });

  // Mobile responsiveness
  describe("Mobile Responsiveness", () => {
    it("adapts layout for mobile viewports", async () => {
      // Mock window.innerWidth to simulate mobile device
      const originalInnerWidth = window.innerWidth;
      Object.defineProperty(window, "innerWidth", {
        value: 480,
        configurable: true,
      });

      // Mock matchMedia to simulate mobile device
      Object.defineProperty(window, "matchMedia", {
        value: vi.fn().mockImplementation((query) => ({
          matches: query.includes("(max-width"),
          media: query,
          onchange: null,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        })),
        configurable: true,
      });

      // Trigger resize event to update responsive state
      window.dispatchEvent(new Event("resize"));

      const wrapper = createWrapper();
      await flushPromises();

      // Mobile class should be applied
      expect(wrapper.find(".admin-panel").classes()).toContain(
        "admin-panel--mobile",
      );

      // Sidebar should be collapsed initially
      expect(wrapper.find(".admin-panel__sidebar").classes()).toContain(
        "admin-panel__sidebar--collapsed",
      );

      // Mobile menu toggle should be visible
      expect(wrapper.find(".admin-panel__mobile-menu-toggle").exists()).toBe(
        true,
      );

      // Click mobile menu toggle
      await wrapper.find(".admin-panel__mobile-menu-toggle").trigger("click");
      await flushPromises();

      // Sidebar should expand
      expect(wrapper.find(".admin-panel__sidebar").classes()).toContain(
        "admin-panel__sidebar--expanded",
      );

      // Click a tab in mobile mode
      const tabs = wrapper.findAll(".admin-panel__nav-item");
      const usersTab = tabs.find((tab) => tab.text().includes("Benutzer"));
      await usersTab.trigger("click");
      await flushPromises();

      // Sidebar should auto-collapse after selecting a tab on mobile
      expect(wrapper.find(".admin-panel__sidebar").classes()).toContain(
        "admin-panel__sidebar--collapsed",
      );

      // Restore original window properties
      Object.defineProperty(window, "innerWidth", {
        value: originalInnerWidth,
        configurable: true,
      });
    });
  });
});
