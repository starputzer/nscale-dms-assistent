import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import { useFeatureTogglesStore } from "@/stores/featureToggles";
import FeatureWrapper from "@/components/shared/FeatureWrapper.vue";
import EnhancedFeatureWrapper from "@/components/shared/EnhancedFeatureWrapper.vue";

// Mock components for testing
const StableComponent = {
  name: "StableComponent",
  template: '<div class="stable-component">Stable Component</div>',
};

const ErrorThrowingComponent = {
  name: "ErrorThrowingComponent",
  setup() {
    throw new Error("Simulated component error");
  },
  template: "<div>Should not render</div>",
};

const AsyncErrorComponent = {
  name: "AsyncErrorComponent",
  async setup() {
    await new Promise((resolve) => setTimeout(resolve, 10));
    throw new Error("Async component error");
  },
  template: "<div>Should not render async</div>",
};

const ConditionalErrorComponent = {
  name: "ConditionalErrorComponent",
  props: ["shouldThrow"],
  setup(props) {
    if (props.shouldThrow) {
      throw new Error("Conditional error");
    }
  },
  template:
    '<div class="conditional-component">{{ shouldThrow ? "Error" : "No Error" }}</div>',
};

// Legacy component
const LegacyComponent = {
  name: "LegacyComponent",
  template: '<div class="legacy-component">Legacy Fallback Component</div>',
};

describe("Feature Error Handling Tests", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("Basic Error Handling", () => {
    it("should handle synchronous errors and activate fallback", () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const wrapper = mount(FeatureWrapper, {
        props: {
          feature: "testErrorFeature",
          newComponent: ErrorThrowingComponent,
          legacyComponent: LegacyComponent,
          captureErrors: true,
          autoFallback: true,
        },
        global: {
          plugins: [
            createTestingPinia({
              createSpy: vi.fn,
              initialState: {
                featureToggles: {
                  testErrorFeature: true,
                },
              },
              stubActions: false,
            }),
          ],
        },
      });

      // Should render the legacy component due to error
      expect(wrapper.findComponent(LegacyComponent).exists()).toBe(true);

      // Should report the error to store
      const store = useFeatureTogglesStore();
      expect(store.reportFeatureError).toHaveBeenCalled();
      expect(store.reportFeatureError.mock.calls[0][0]).toBe(
        "testErrorFeature",
      );
      expect(store.reportFeatureError.mock.calls[0][1]).toContain(
        "Simulated component error",
      );

      errorSpy.mockRestore();
    });

    it("should handle errors in document converter components", () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const wrapper = mount(FeatureWrapper, {
        props: {
          feature: "useSfcDocConverterContainer",
          newComponent: ErrorThrowingComponent,
          legacyComponent: LegacyComponent,
          captureErrors: true,
          autoFallback: true,
        },
        global: {
          plugins: [
            createTestingPinia({
              createSpy: vi.fn,
              initialState: {
                featureToggles: {
                  useSfcDocConverterContainer: true,
                },
              },
              stubActions: false,
            }),
          ],
        },
      });

      // Should render the legacy component due to error
      expect(wrapper.findComponent(LegacyComponent).exists()).toBe(true);

      // Should report the error to store
      const store = useFeatureTogglesStore();
      expect(store.reportFeatureError).toHaveBeenCalled();
      expect(store.reportFeatureError.mock.calls[0][0]).toBe(
        "useSfcDocConverterContainer",
      );

      errorSpy.mockRestore();
    });

    it("should emit feature-error event when captureErrors is true", () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const wrapper = mount(FeatureWrapper, {
        props: {
          feature: "useSfcDocConverterFileUpload",
          newComponent: ErrorThrowingComponent,
          legacyComponent: LegacyComponent,
          captureErrors: true,
          autoFallback: false, // Don't auto-fallback, just capture
        },
        global: {
          plugins: [
            createTestingPinia({
              createSpy: vi.fn,
              initialState: {
                featureToggles: {
                  useSfcDocConverterFileUpload: true,
                },
              },
            }),
          ],
        },
      });

      // Should emit feature-error event
      expect(wrapper.emitted()).toHaveProperty("feature-error");
      expect(wrapper.emitted("feature-error")?.[0][0]).toBeInstanceOf(Error);
      expect(wrapper.emitted("feature-error")?.[0][0].message).toBe(
        "Simulated component error",
      );

      errorSpy.mockRestore();
    });
  });

  describe("Enhanced Feature Wrapper Error Handling", () => {
    it("should provide enhanced error handling with error boundary", () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Mount component with error boundary
      const wrapper = mount(EnhancedFeatureWrapper, {
        props: {
          feature: "useSfcDocConverterFileUpload",
          newComponent: ErrorThrowingComponent,
          legacyComponent: LegacyComponent,
          showRetry: true,
          captureErrors: true,
          autoFallback: true,
          errorMessage: "Custom error message",
        },
        global: {
          plugins: [
            createTestingPinia({
              createSpy: vi.fn,
              initialState: {
                featureToggles: {
                  useSfcDocConverterFileUpload: true,
                },
              },
              stubActions: false,
            }),
          ],
          stubs: {
            ErrorBoundary: false, // Don't stub error boundary
          },
        },
      });

      // Should display the error message
      expect(wrapper.html()).toContain("Custom error message");

      // Should have retry button
      expect(wrapper.find("button").exists()).toBe(true);
      expect(wrapper.find("button").text()).toContain("Wiederholen");

      // Store should have reported error
      const store = useFeatureTogglesStore();
      expect(store.reportFeatureError).toHaveBeenCalled();

      errorSpy.mockRestore();
    });

    it("should retry component rendering when retry button is clicked", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Mount component with conditionally failing component
      const wrapper = mount(EnhancedFeatureWrapper, {
        props: {
          feature: "testFeature",
          newComponent: ConditionalErrorComponent,
          componentProps: {
            shouldThrow: true, // Initially throw error
          },
          showRetry: true,
          captureErrors: true,
          autoFallback: false, // Don't auto fallback so we can test retry
        },
        global: {
          plugins: [
            createTestingPinia({
              createSpy: vi.fn,
            }),
          ],
          stubs: {
            ErrorBoundary: false, // Don't stub error boundary
          },
        },
      });

      // Should show error initially
      expect(wrapper.html()).toContain("Ein Fehler ist aufgetreten");
      expect(wrapper.find("button").exists()).toBe(true);

      // Update props to not throw on retry
      await wrapper.setProps({
        componentProps: {
          shouldThrow: false, // Don't throw on retry
        },
      });

      // Click retry button
      await wrapper.find("button").trigger("click");

      // Component should render successfully now
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick(); // Multiple ticks may be needed for the error boundary
      expect(wrapper.html()).toContain("No Error");
      expect(wrapper.find(".conditional-component").exists()).toBe(true);

      errorSpy.mockRestore();
    });
  });

  describe("Feature Toggle Store Error Handling", () => {
    it("should correctly set fallback mode for features with errors", () => {
      // Get store
      const store = useFeatureTogglesStore();

      // Enable feature
      store.useSfcDocConverterProgress = true;

      // Verify initial state
      expect(store.useSfcDocConverterProgress).toBe(true);
      expect(store.isFallbackActive("useSfcDocConverterProgress")).toBe(false);

      // Report error with fallback
      store.reportFeatureError(
        "useSfcDocConverterProgress",
        "Test error",
        null,
        true,
      );

      // Feature should be disabled and fallback activated
      expect(store.useSfcDocConverterProgress).toBe(false);
      expect(store.isFallbackActive("useSfcDocConverterProgress")).toBe(true);

      // Error should be recorded
      const errors = store.errors["useSfcDocConverterProgress"] || [];
      expect(errors.length).toBe(1);
      expect(errors[0].message).toBe("Test error");

      // Clear errors and fallback
      store.clearFeatureErrors("useSfcDocConverterProgress");
      store.setFallbackMode("useSfcDocConverterProgress", false);

      // Errors should be cleared but feature still disabled
      expect(store.errors["useSfcDocConverterProgress"]?.length).toBe(0);
      expect(store.isFallbackActive("useSfcDocConverterProgress")).toBe(false);
      expect(store.useSfcDocConverterProgress).toBe(false);
    });

    it("should handle errors for multiple features", () => {
      // Get store
      const store = useFeatureTogglesStore();

      // Enable multiple features
      store.useSfcDocConverterContainer = true;
      store.useSfcDocConverterFileUpload = true;

      // Report errors for both
      store.reportFeatureError(
        "useSfcDocConverterContainer",
        "Container error",
      );
      store.reportFeatureError("useSfcDocConverterFileUpload", "Upload error");

      // Both should be in fallback mode
      expect(store.isFallbackActive("useSfcDocConverterContainer")).toBe(true);
      expect(store.isFallbackActive("useSfcDocConverterFileUpload")).toBe(true);

      // Clearing one should not affect the other
      store.clearFeatureErrors("useSfcDocConverterContainer");
      expect(store.errors["useSfcDocConverterContainer"]?.length).toBe(0);
      expect(store.errors["useSfcDocConverterFileUpload"]?.length).toBe(1);

      // Using the bulk helper to disable should clear all errors
      store.disableAllDocConverterComponents();

      // All errors and fallbacks should be cleared
      expect(store.errors["useSfcDocConverterFileUpload"]?.length).toBe(0);
      expect(store.isFallbackActive("useSfcDocConverterFileUpload")).toBe(
        false,
      );
    });
  });

  describe("Error reporting to composable", () => {
    it("should report errors to useFeatureToggles composable", () => {
      const mockReportError = vi.fn();

      // Mock the composable
      vi.mock("@/composables/useFeatureToggles", () => ({
        useFeatureToggles: () => ({
          isEnabled: () => true,
          shouldUseFeature: () => true,
          reportError: mockReportError,
        }),
      }));

      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Mount component
      mount(FeatureWrapper, {
        props: {
          feature: "testFeature",
          newComponent: ErrorThrowingComponent,
          captureErrors: true,
        },
      });

      // Should report error to composable
      expect(mockReportError).toHaveBeenCalled();
      expect(mockReportError.mock.calls[0][0]).toBe("testFeature");
      expect(mockReportError.mock.calls[0][1]).toContain(
        "Simulated component error",
      );

      errorSpy.mockRestore();

      // Reset mock
      vi.resetModules();
    });
  });
});
