import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import AdminSystem from "@/components/admin/tabs/AdminSystem.vue";
import { createTestingPinia } from "@pinia/testing";

// Mock the date-fns library
vi.mock("date-fns", () => ({
  format: vi.fn(() => "01.01.2023 10:00"),
  de: {},
}));

// Mock the useToast composable
vi.mock("@/composables/useToast", () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

// Sample system stats for testing
const mockStats = {
  cpu_usage_percent: 45,
  memory_usage_percent: 60,
  database_size_mb: 256,
  cache_size_mb: 128,
  cache_hit_rate: 85,
  uptime_days: 32,
  start_time: 1641034800000, // 2022-01-01
  active_model: "llama-7b",
  avg_response_time_ms: 450,
  document_count: 1250,
  total_sessions: 542,
  total_messages: 8965,
  avg_messages_per_session: 16.5,
};

// Sample system actions for testing
const mockActions = [
  {
    type: "clear-cache",
    name: "Cache leeren",
    description:
      "Löscht den Cache, um Speicherplatz freizugeben und die Anwendung zu beschleunigen.",
    requiresConfirmation: true,
    confirmationMessage:
      "Sind Sie sicher, dass Sie den Cache leeren möchten? Dies kann zu einer kurzzeitigen Verlangsamung führen, während der Cache neu aufgebaut wird.",
  },
  {
    type: "clear-embedding-cache",
    name: "Embedding-Cache leeren",
    description:
      "Löscht den Embedding-Cache, um den Speicherplatz freizugeben und das System zu optimieren.",
    requiresConfirmation: true,
    confirmationMessage:
      "Sind Sie sicher, dass Sie den Embedding-Cache leeren möchten? Dies kann zu einer vorübergehenden Verlangsamung der Suchgeschwindigkeit führen.",
  },
  {
    type: "reload-motd",
    name: "Nachricht des Tages neu laden",
    description:
      "Lädt die Konfiguration für die Nachricht des Tages neu, um Änderungen zu übernehmen.",
    requiresConfirmation: false,
  },
];

// Helper to create wrapper with default props and configs
const createWrapper = (options = {}) => {
  return mount(AdminSystem, {
    global: {
      plugins: [
        createTestingPinia({
          createSpy: vi.fn,
          initialState: {
            "admin/system": {
              stats: mockStats,
              availableActions: mockActions,
              memoryStatus: "warning",
              cpuStatus: "normal",
              systemHealthStatus: "warning",
            },
          },
          stubActions: false,
        }),
      ],
      stubs: {
        Dialog: true,
      },
      mocks: {
        $t: (key, fallback) => fallback || key,
      },
      ...options,
    },
    attachTo: document.body,
  });
};

describe("AdminSystem.vue", () => {
  // Setup and cleanup
  beforeEach(() => {
    // Mock showModal and close methods for HTMLDialogElement
    HTMLDialogElement.prototype.showModal = vi.fn();
    HTMLDialogElement.prototype.close = vi.fn();

    // Mock setTimeout
    vi.spyOn(global, "setTimeout").mockImplementation((callback) => {
      if (typeof callback === "function") callback();
      return 0 as any;
    });

    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any attached elements
    document.body.innerHTML = "";
  });

  // Rendering Tests
  describe("Rendering", () => {
    it("renders the component correctly", async () => {
      const wrapper = createWrapper();
      await flushPromises();

      expect(wrapper.find(".admin-system").exists()).toBe(true);
      expect(wrapper.find(".admin-system__title").text()).toContain(
        "Systemeinstellungen",
      );
    });

    it("displays system health status correctly", async () => {
      const wrapper = createWrapper();
      await flushPromises();

      // Status card should have the warning class (from systemHealthStatus)
      const statusCard = wrapper.find(".admin-system__status-card");
      expect(statusCard.classes()).toContain(
        "admin-system__status-card--warning",
      );

      // Should display warning text
      expect(wrapper.find(".admin-system__status-value").text()).toBe(
        "Warnung",
      );

      // Should show health details
      expect(wrapper.find(".admin-system__status-details").exists()).toBe(true);
    });

    it("displays system metrics correctly", async () => {
      const wrapper = createWrapper();
      await flushPromises();

      // CPU usage meter
      const cpuMeter = wrapper.find(".admin-system__metric-card:nth-child(1)");
      expect(cpuMeter.find(".admin-system__meter-value").text()).toBe("45%");

      // CPU status indicator should be normal
      expect(
        cpuMeter.find(".admin-system__metric-status--normal").exists(),
      ).toBe(true);

      // Memory usage meter
      const memoryMeter = wrapper.find(
        ".admin-system__metric-card:nth-child(2)",
      );
      expect(memoryMeter.find(".admin-system__meter-value").text()).toBe("60%");

      // Memory status indicator should be warning
      expect(
        memoryMeter.find(".admin-system__metric-status--warning").exists(),
      ).toBe(true);

      // Database size
      const databaseCard = wrapper.find(
        ".admin-system__metric-card:nth-child(3)",
      );
      expect(databaseCard.text()).toContain("256 MB");

      // Cache stats
      const cacheCard = wrapper.find(".admin-system__metric-card:nth-child(4)");
      expect(cacheCard.text()).toContain("128 MB");
      expect(cacheCard.text()).toContain("85%");
    });

    it("displays system information correctly", async () => {
      const wrapper = createWrapper();
      await flushPromises();

      // Uptime
      const uptimeCard = wrapper.find(".admin-system__info-card:nth-child(1)");
      expect(uptimeCard.find(".admin-system__info-value").text()).toBe(
        "32 Tage",
      );

      // Active model
      const modelCard = wrapper.find(".admin-system__info-card:nth-child(2)");
      expect(modelCard.find(".admin-system__info-value").text()).toBe(
        "llama-7b",
      );
      expect(modelCard.find(".admin-system__info-details").text()).toContain(
        "450 ms",
      );

      // Document count
      const documentsCard = wrapper.find(
        ".admin-system__info-card:nth-child(3)",
      );
      expect(documentsCard.find(".admin-system__info-value").text()).toBe(
        "1250",
      );

      // Interactions
      const interactionsCard = wrapper.find(
        ".admin-system__info-card:nth-child(4)",
      );
      expect(interactionsCard.text()).toContain("542");
      expect(interactionsCard.text()).toContain("8965");
      expect(interactionsCard.text()).toContain("16.5");
    });

    it("shows system settings form", async () => {
      const wrapper = createWrapper();
      await flushPromises();

      // Settings section
      const settingsSection = wrapper.find(".admin-system__settings");
      expect(settingsSection.exists()).toBe(true);

      // Should have fieldsets for different setting groups
      expect(wrapper.findAll("fieldset").length).toBeGreaterThan(0);

      // Initially the form should be disabled (not in edit mode)
      const formInputs = wrapper.findAll("input, select, textarea");
      formInputs.forEach((input) => {
        expect(input.attributes("disabled")).toBeDefined();
      });

      // Toggle edit button should be present but not active
      const editButton = wrapper.find(".admin-system__toggle-edit-button");
      expect(editButton.exists()).toBe(true);
      expect(editButton.classes()).not.toContain(
        "admin-system__toggle-edit-button--active",
      );
    });

    it("shows available system actions", async () => {
      const wrapper = createWrapper();
      await flushPromises();

      // Actions section
      const actionsSection = wrapper.find(".admin-system__actions");
      expect(actionsSection.exists()).toBe(true);

      // Should show all available actions
      const actionCards = wrapper.findAll(".admin-system__action-card");
      expect(actionCards.length).toBe(mockActions.length);

      // Check first action card content
      expect(actionCards[0].find(".admin-system__action-title").text()).toBe(
        "Cache leeren",
      );
      expect(
        actionCards[0].find(".admin-system__action-description").text(),
      ).toBe(
        "Löscht den Cache, um Speicherplatz freizugeben und die Anwendung zu beschleunigen.",
      );
    });
  });

  // System Status Tests
  describe("System Status", () => {
    it("shows critical status correctly", async () => {
      const wrapper = createWrapper({
        initialState: {
          "admin/system": {
            stats: mockStats,
            availableActions: mockActions,
            memoryStatus: "critical",
            cpuStatus: "warning",
            systemHealthStatus: "critical",
          },
        },
      });
      await flushPromises();

      // Status card should have the critical class
      const statusCard = wrapper.find(".admin-system__status-card");
      expect(statusCard.classes()).toContain(
        "admin-system__status-card--critical",
      );

      // Should show critical icon
      expect(wrapper.find(".fa-exclamation-triangle").exists()).toBe(true);

      // Should show critical text
      expect(wrapper.find(".admin-system__status-value").text()).toBe(
        "Kritisch",
      );
    });

    it("shows normal status correctly", async () => {
      const wrapper = createWrapper({
        initialState: {
          "admin/system": {
            stats: mockStats,
            availableActions: mockActions,
            memoryStatus: "normal",
            cpuStatus: "normal",
            systemHealthStatus: "normal",
          },
        },
      });
      await flushPromises();

      // Status card should have the normal class
      const statusCard = wrapper.find(".admin-system__status-card");
      expect(statusCard.classes()).toContain(
        "admin-system__status-card--normal",
      );

      // Should show normal icon
      expect(wrapper.find(".fa-check-circle").exists()).toBe(true);

      // Should show normal text
      expect(wrapper.find(".admin-system__status-value").text()).toBe("Normal");

      // Should not show details text when everything is normal
      expect(wrapper.find(".admin-system__status-details").exists()).toBe(
        false,
      );
    });

    it("provides appropriate status text based on metrics", async () => {
      // Create wrapper with critical memory
      const wrapper = createWrapper({
        initialState: {
          "admin/system": {
            stats: mockStats,
            availableActions: mockActions,
            memoryStatus: "critical",
            cpuStatus: "normal",
            systemHealthStatus: "critical",
          },
        },
      });
      await flushPromises();

      // Should show memory critical message
      const statusDetails = wrapper.find(".admin-system__status-details");
      expect(statusDetails.exists()).toBe(true);
      expect(statusDetails.text()).toContain(
        "Arbeitsspeicherauslastung kritisch",
      );

      // Update to critical CPU instead
      await wrapper.setProps({
        initialState: {
          "admin/system": {
            stats: mockStats,
            availableActions: mockActions,
            memoryStatus: "normal",
            cpuStatus: "critical",
            systemHealthStatus: "critical",
          },
        },
      });

      // Details should update (needs to re-run the computed property)
      await wrapper.vm.$forceUpdate();
      await flushPromises();

      // Manually call the computed property
      const newDetails = wrapper.vm.systemHealthDetails;
      expect(newDetails).toContain("CPU");
    });
  });

  // Settings Form Tests
  describe("Settings Form", () => {
    it("enables form editing when clicking edit button", async () => {
      const wrapper = createWrapper();
      await flushPromises();

      // Click edit button
      const editButton = wrapper.find(".admin-system__toggle-edit-button");
      await editButton.trigger("click");

      // Button should now be active
      expect(editButton.classes()).toContain(
        "admin-system__toggle-edit-button--active",
      );

      // Form inputs should now be enabled
      const formInputs = wrapper.findAll("input, select, textarea");
      formInputs.forEach((input) => {
        expect(input.attributes("disabled")).toBeUndefined();
      });

      // Save and reset buttons should be visible
      expect(wrapper.find(".admin-system__settings-actions").exists()).toBe(
        true,
      );
      expect(
        wrapper.find(".admin-system__settings-button--save").exists(),
      ).toBe(true);
      expect(
        wrapper.find(".admin-system__settings-button--cancel").exists(),
      ).toBe(true);
    });

    it("resets form when clicking cancel button", async () => {
      const wrapper = createWrapper();
      await flushPromises();

      // Enter edit mode
      await wrapper.find(".admin-system__toggle-edit-button").trigger("click");

      // Change a setting value
      const maxTokensInput = wrapper.find("#max-tokens");
      await maxTokensInput.setValue(8192);

      // Enable maintenance mode
      const maintenanceToggle = wrapper.find("#maintenance-mode");
      await maintenanceToggle.setValue(true);

      // Check that values changed
      expect(wrapper.vm.systemSettings.maxTokensPerRequest).toBe(8192);
      expect(wrapper.vm.systemSettings.maintenanceMode).toBe(true);

      // Click cancel button (toggle edit button while in edit mode)
      await wrapper
        .find(".admin-system__toggle-edit-button--active")
        .trigger("click");

      // Values should be reset to original
      expect(wrapper.vm.systemSettings.maxTokensPerRequest).toBe(4096);
      expect(wrapper.vm.systemSettings.maintenanceMode).toBe(false);
    });

    it("saves settings when submitting form", async () => {
      const wrapper = createWrapper();
      await flushPromises();

      // Spy on showToast
      const showToastSpy = vi.spyOn(wrapper.vm.showToast, "showToast");

      // Enter edit mode
      await wrapper.find(".admin-system__toggle-edit-button").trigger("click");

      // Change a setting value
      await wrapper.find("#max-tokens").setValue(8192);
      await wrapper.find("#session-timeout").setValue(120);

      // Submit form
      await wrapper.find(".admin-system__settings-form").trigger("submit");

      // Check if original settings were updated
      expect(wrapper.vm.originalSettings.maxTokensPerRequest).toBe(8192);
      expect(wrapper.vm.originalSettings.sessionTimeoutMinutes).toBe(120);

      // Should show success toast
      expect(showToastSpy).toHaveBeenCalled();
      expect(showToastSpy.mock.calls[0][0].type).toBe("success");

      // Should exit edit mode
      expect(wrapper.vm.isEditMode).toBe(false);
    });

    it("shows conditional form fields based on toggle states", async () => {
      const wrapper = createWrapper();
      await flushPromises();

      // Enter edit mode
      await wrapper.find(".admin-system__toggle-edit-button").trigger("click");

      // Rate limit input should be visible since enableRateLimit is true by default
      expect(wrapper.find("#rate-limit").exists()).toBe(true);

      // Disable rate limiting
      await wrapper.find("#enable-rate-limit").setValue(false);

      // Rate limit input should now be hidden
      expect(wrapper.find("#rate-limit").exists()).toBe(false);

      // Enable maintenance mode
      await wrapper.find("#maintenance-mode").setValue(true);

      // Maintenance message textarea should appear
      expect(wrapper.find("#maintenance-message").exists()).toBe(true);
    });
  });

  // System Actions Tests
  describe("System Actions", () => {
    it("shows confirmation dialog for actions that require it", async () => {
      const wrapper = createWrapper();
      await flushPromises();

      // Find the first action button (clear-cache, which requires confirmation)
      const actionButtons = wrapper.findAll(".admin-system__action-button");
      await actionButtons[0].trigger("click");

      // Confirmation dialog should be shown
      expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();

      // Dialog content should contain the action's confirmation message
      expect(wrapper.vm.confirmDialogMessage).toBe(
        "Sind Sie sicher, dass Sie den Cache leeren möchten? Dies kann zu einer kurzzeitigen Verlangsamung führen, während der Cache neu aufgebaut wird.",
      );
    });

    it("executes actions directly when confirmation is not required", async () => {
      const wrapper = createWrapper();
      await flushPromises();

      // Get reference to the store and spy on reloadMotd action
      const adminSystemStore = wrapper.vm.adminSystemStore;
      const reloadMotdSpy = vi.spyOn(adminSystemStore, "reloadMotd");

      // Find the reload-motd action button (3rd button, doesn't require confirmation)
      const actionButtons = wrapper.findAll(".admin-system__action-button");
      await actionButtons[2].trigger("click");

      // No confirmation dialog should be shown
      expect(HTMLDialogElement.prototype.showModal).not.toHaveBeenCalled();

      // Action should be executed directly
      expect(reloadMotdSpy).toHaveBeenCalled();
    });

    it("executes action when confirmed in dialog", async () => {
      const wrapper = createWrapper();
      await flushPromises();

      // Get reference to the store and spy on clearCache action
      const adminSystemStore = wrapper.vm.adminSystemStore;
      const clearCacheSpy = vi.spyOn(adminSystemStore, "clearCache");

      // Find the clear-cache action button and click it
      const actionButtons = wrapper.findAll(".admin-system__action-button");
      await actionButtons[0].trigger("click");

      // Confirm dialog should be shown
      expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
      expect(wrapper.vm.currentAction).toEqual(mockActions[0]);

      // Confirm the action
      await wrapper.vm.confirmAction();

      // Dialog should be closed
      expect(HTMLDialogElement.prototype.close).toHaveBeenCalled();

      // Action should be executed
      expect(clearCacheSpy).toHaveBeenCalled();

      // Current action should be cleared
      expect(wrapper.vm.currentAction).toBeNull();
    });

    it("shows loading state when action is pending", async () => {
      const wrapper = createWrapper();
      await flushPromises();

      // Mock the action to be pending
      await wrapper.setData({
        isActionPending: true,
        pendingAction: "clear-cache",
      });

      // All action buttons should be disabled
      const actionButtons = wrapper.findAll(".admin-system__action-button");
      actionButtons.forEach((button) => {
        expect(button.attributes("disabled")).toBeDefined();
      });

      // The pending action button should show spinner
      const spinnerIcon = actionButtons[0].find(".fa-spinner");
      expect(spinnerIcon.exists()).toBe(true);
    });

    it("refreshes stats after action is completed", async () => {
      const wrapper = createWrapper();
      await flushPromises();

      // Get reference to the store and spy on fetchStats
      const adminSystemStore = wrapper.vm.adminSystemStore;
      const fetchStatsSpy = vi.spyOn(adminSystemStore, "fetchStats");

      // Set up clearCache to return a resolved promise
      vi.spyOn(adminSystemStore, "clearCache").mockResolvedValue(undefined);

      // Find the clear-cache action button and click it
      const actionButtons = wrapper.findAll(".admin-system__action-button");
      await actionButtons[0].trigger("click");

      // Get reference to the dialog and click confirm
      await wrapper.vm.confirmAction();

      // Action is now completed
      await flushPromises();

      // Stats should be refreshed
      expect(fetchStatsSpy).toHaveBeenCalled();
    });
  });

  // Error Handling Tests
  describe("Error Handling", () => {
    it("handles errors when executing actions", async () => {
      const wrapper = createWrapper();
      await flushPromises();

      // Spy on showToast
      const showToastSpy = vi.spyOn(wrapper.vm.showToast, "showToast");

      // Get reference to the store and make clearCache throw an error
      const adminSystemStore = wrapper.vm.adminSystemStore;
      vi.spyOn(adminSystemStore, "clearCache").mockRejectedValue(
        new Error("Test error"),
      );

      // Spy on console.error
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Find the clear-cache action button and click it
      const actionButtons = wrapper.findAll(".admin-system__action-button");
      await actionButtons[0].trigger("click");

      // Confirm the action
      await wrapper.vm.confirmAction();

      // Wait for the promise to reject
      await flushPromises();

      // Should show error toast
      expect(showToastSpy).toHaveBeenCalled();
      expect(showToastSpy.mock.calls[0][0].type).toBe("error");
      expect(showToastSpy.mock.calls[0][0].message).toBe("Test error");

      // Should log error to console
      expect(consoleErrorSpy).toHaveBeenCalled();

      // Action pending state should be reset
      expect(wrapper.vm.isActionPending).toBe(false);
      expect(wrapper.vm.pendingAction).toBeNull();

      // Restore console.error
      consoleErrorSpy.mockRestore();
    });

    it("handles errors when loading stats", async () => {
      // Mock console.error
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Make fetchStats throw an error
      const fetchStatsSpy = vi
        .fn()
        .mockRejectedValue(new Error("Failed to fetch stats"));

      const wrapper = createWrapper({
        mocks: {
          adminSystemStore: {
            fetchStats: fetchStatsSpy,
            stats: {},
            availableActions: [],
            memoryStatus: "normal",
            cpuStatus: "normal",
            systemHealthStatus: "normal",
          },
        },
      });

      // Call refreshStats
      await wrapper.vm.refreshStats();
      await flushPromises();

      // Should log error to console
      expect(consoleErrorSpy).toHaveBeenCalled();

      // Loading state should be reset
      expect(wrapper.vm.isLoading).toBe(false);

      // Restore console.error
      consoleErrorSpy.mockRestore();
    });
  });

  // Date Formatting Tests
  describe("Date Formatting", () => {
    it("formats timestamps correctly", async () => {
      const wrapper = createWrapper();
      await flushPromises();

      // Call formatDate with valid timestamp
      const formattedDate = wrapper.vm.formatDate(1641034800000);
      expect(formattedDate).toBe("01.01.2023 10:00");

      // Call formatDate with undefined
      const emptyDate = wrapper.vm.formatDate(undefined);
      expect(emptyDate).toBe("-");
    });

    it("handles invalid timestamps gracefully", async () => {
      const wrapper = createWrapper();
      await flushPromises();

      // Mock console.error
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Make format throw an error
      vi.mocked(require("date-fns").format).mockImplementationOnce(() => {
        throw new Error("Invalid date");
      });

      // Call formatDate with invalid timestamp
      const formattedDate = wrapper.vm.formatDate(NaN);
      expect(formattedDate).toBe("-");

      // Should log error to console
      expect(consoleErrorSpy).toHaveBeenCalled();

      // Restore console.error
      consoleErrorSpy.mockRestore();
    });
  });
});
