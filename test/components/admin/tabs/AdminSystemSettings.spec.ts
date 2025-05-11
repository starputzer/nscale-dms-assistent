import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import AdminSystemSettings from "@/components/admin/tabs/AdminSystemSettings.vue";
import { createTestingPinia } from "@pinia/testing";

// Mock composables
vi.mock("@/composables/useToast", () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    t: (key, fallback) => fallback || key,
  }),
}));

// Basic tests that focus on component logic rather than DOM elements
describe("AdminSystemSettings.vue", () => {
  // Setup and cleanup
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mounts successfully", async () => {
    const wrapper = mount(AdminSystemSettings, {
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            stubActions: false,
          }),
        ],
        mocks: {
          $t: (key, fallback) => fallback || key,
        },
      },
    });

    await flushPromises();

    // Verify that the component mounted successfully
    expect(wrapper.exists()).toBe(true);
    expect(wrapper.vm).toBeDefined();
  });

  it("fetches settings on mount", async () => {
    // Create pinia and get store before mounting
    const pinia = createTestingPinia({
      createSpy: vi.fn,
      stubActions: false,
    });

    // Get the store and spy on it before mounting the component
    const { useAdminSettingsStore } = await import("@/stores/admin/settings");
    const settingsStore = useAdminSettingsStore(pinia);

    // Spy on fetchSettings
    const fetchSettingsSpy = vi.fn().mockResolvedValue({});
    settingsStore.fetchSettings = fetchSettingsSpy;

    // Now mount with the prepared store
    mount(AdminSystemSettings, {
      global: {
        plugins: [pinia],
        mocks: {
          $t: (key, fallback) => fallback || key,
        },
      },
    });

    await flushPromises();

    // Verify the component called the store method
    expect(fetchSettingsSpy).toHaveBeenCalled();
  });

  it("shows loading state while fetching settings", async () => {
    const pinia = createTestingPinia({
      createSpy: vi.fn,
      stubActions: false,
    });

    const { useAdminSettingsStore } = await import("@/stores/admin/settings");
    const settingsStore = useAdminSettingsStore(pinia);

    // Make fetchSettings pending forever to keep loading state
    let resolvePromise: any;
    const loadingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    settingsStore.fetchSettings = vi
      .fn()
      .mockImplementation(() => loadingPromise);

    const wrapper = mount(AdminSystemSettings, {
      global: {
        plugins: [pinia],
        mocks: {
          $t: (key, fallback) => fallback || key,
        },
      },
    });

    // Loading state should be true during fetch
    expect(wrapper.vm.isLoading).toBe(true);

    // Resolve the promise to complete loading
    resolvePromise({});
    await flushPromises();

    // Loading should now be false
    expect(wrapper.vm.isLoading).toBe(false);
  });

  it("handles errors when loading settings", async () => {
    const pinia = createTestingPinia({
      createSpy: vi.fn,
      stubActions: false,
    });

    const { useAdminSettingsStore } = await import("@/stores/admin/settings");
    const settingsStore = useAdminSettingsStore(pinia);

    // Mock console.error to avoid test output noise
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    // Make fetchSettings throw an error
    const testError = new Error("Test error");
    settingsStore.fetchSettings = vi.fn().mockRejectedValue(testError);

    const wrapper = mount(AdminSystemSettings, {
      global: {
        plugins: [pinia],
        mocks: {
          $t: (key, fallback) => fallback || key,
        },
      },
    });

    await flushPromises();

    // Loading should be false after error
    expect(wrapper.vm.isLoading).toBe(false);

    // Error should have been caught and logged
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error loading settings:",
      testError,
    );

    // Restore console.error
    consoleErrorSpy.mockRestore();
  });

  it("resets changes when calling resetChanges", async () => {
    const pinia = createTestingPinia({
      createSpy: vi.fn,
      stubActions: false,
    });

    const { useAdminSettingsStore } = await import("@/stores/admin/settings");
    const settingsStore = useAdminSettingsStore(pinia);

    // Spy on resetChanges method
    const resetChangesSpy = vi.fn();
    settingsStore.resetChanges = resetChangesSpy;

    const wrapper = mount(AdminSystemSettings, {
      global: {
        plugins: [pinia],
        mocks: {
          $t: (key, fallback) => fallback || key,
        },
      },
    });

    await flushPromises();

    // Call resetChanges method
    await wrapper.vm.resetChanges();

    // Method should have been called
    expect(resetChangesSpy).toHaveBeenCalled();
  });

  it("saves settings when calling saveSettings", async () => {
    const pinia = createTestingPinia({
      createSpy: vi.fn,
      stubActions: false,
    });

    const { useAdminSettingsStore } = await import("@/stores/admin/settings");
    const settingsStore = useAdminSettingsStore(pinia);

    // Spy on methods
    const updateSettingsSpy = vi.fn();
    const saveSettingsSpy = vi.fn().mockResolvedValue({});

    settingsStore.updateSettings = updateSettingsSpy;
    settingsStore.saveSettings = saveSettingsSpy;

    const wrapper = mount(AdminSystemSettings, {
      global: {
        plugins: [pinia],
        mocks: {
          $t: (key, fallback) => fallback || key,
        },
      },
    });

    await flushPromises();

    // Call saveSettings method directly (similar to clicking the save button)
    await wrapper.vm.saveSettings();

    // Store methods should have been called
    expect(updateSettingsSpy).toHaveBeenCalled();
    expect(saveSettingsSpy).toHaveBeenCalled();
  });

  it("calls clearCache correctly", async () => {
    const pinia = createTestingPinia({
      createSpy: vi.fn,
      stubActions: false,
    });

    const { useAdminSystemStore } = await import("@/stores/admin/system");
    const systemStore = useAdminSystemStore(pinia);

    // Spy on clearCache method
    const clearCacheSpy = vi.fn().mockResolvedValue({});
    systemStore.clearCache = clearCacheSpy;

    const wrapper = mount(AdminSystemSettings, {
      global: {
        plugins: [pinia],
        mocks: {
          $t: (key, fallback) => fallback || key,
        },
      },
    });

    await flushPromises();

    // Manually set up the state for clearing cache
    wrapper.vm.showClearCacheConfirm = true;

    // Call the clearCache method directly
    await wrapper.vm.clearCache();

    // Method should have been called and dialog closed
    expect(clearCacheSpy).toHaveBeenCalled();
    expect(wrapper.vm.showClearCacheConfirm).toBe(false);
  });

  it("handles errors when clearing cache", async () => {
    const pinia = createTestingPinia({
      createSpy: vi.fn,
      stubActions: false,
    });

    const { useAdminSystemStore } = await import("@/stores/admin/system");
    const systemStore = useAdminSystemStore(pinia);

    // Mock console.error to avoid test output noise
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    // Make clearCache throw an error
    const testError = new Error("Test error");
    systemStore.clearCache = vi.fn().mockRejectedValue(testError);

    const wrapper = mount(AdminSystemSettings, {
      global: {
        plugins: [pinia],
        mocks: {
          $t: (key, fallback) => fallback || key,
        },
      },
    });

    await flushPromises();

    // Set up the state for clearing cache
    wrapper.vm.showClearCacheConfirm = true;
    wrapper.vm.isSubmitting = false;

    // Call the method
    await wrapper.vm.clearCache();

    // Dialog should be closed and error should be handled
    expect(wrapper.vm.showClearCacheConfirm).toBe(false);
    expect(wrapper.vm.isSubmitting).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error clearing cache:",
      testError,
    );

    // Restore console.error
    consoleErrorSpy.mockRestore();
  });

  it("handles errors when saving settings", async () => {
    const pinia = createTestingPinia({
      createSpy: vi.fn,
      stubActions: false,
    });

    const { useAdminSettingsStore } = await import("@/stores/admin/settings");
    const settingsStore = useAdminSettingsStore(pinia);

    // Mock console.error to avoid test output noise
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    // Make saveSettings throw an error
    const testError = new Error("Test error");
    settingsStore.saveSettings = vi.fn().mockRejectedValue(testError);
    settingsStore.updateSettings = vi.fn();

    const wrapper = mount(AdminSystemSettings, {
      global: {
        plugins: [pinia],
        mocks: {
          $t: (key, fallback) => fallback || key,
        },
      },
    });

    await flushPromises();

    // Reset submitting state
    wrapper.vm.isSubmitting = false;

    // Call saveSettings
    await wrapper.vm.saveSettings();

    // submitting state should be reset
    expect(wrapper.vm.isSubmitting).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error saving settings:",
      testError,
    );

    // Restore console.error
    consoleErrorSpy.mockRestore();
  });

  it("formats date correctly", () => {
    const wrapper = mount(AdminSystemSettings, {
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            stubActions: false,
          }),
        ],
        mocks: {
          $t: (key, fallback) => fallback || key,
        },
      },
    });

    // Test the formatDate method
    const timestamp = new Date("2023-05-15T12:30:00").getTime();
    const formatted = wrapper.vm.formatDate(timestamp);

    // Format depends on locale, but should contain date and time parts
    expect(formatted).toMatch(/\d{2}[^\d]\d{2}[^\d]\d{4}/); // Date part

    // Test with null value
    expect(wrapper.vm.formatDate(null)).toBe("");
  });
});
