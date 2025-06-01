import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import { useFeatureTogglesStore } from "@/stores/featureToggles";
import FeatureWrapper from "@/components/shared/FeatureWrapper.vue";

// Mock components for testing
const MockDocConverterContainer = {
  name: "MockDocConverterContainer",
  template:
    '<div class="mock-doc-converter-container">Document Converter Container</div>',
};

const MockFileUpload = {
  name: "MockFileUpload",
  template: '<div class="mock-file-upload">File Upload Component</div>',
};

const MockBatchUpload = {
  name: "MockBatchUpload",
  template: '<div class="mock-batch-upload">Batch Upload Component</div>',
};

const MockProgressComponent = {
  name: "MockProgressComponent",
  template: '<div class="mock-progress">Progress Component</div>',
};

const MockResultComponent = {
  name: "MockResultComponent",
  template: '<div class="mock-result">Result Component</div>',
};

const MockListComponent = {
  name: "MockListComponent",
  template: '<div class="mock-list">List Component</div>',
};

const MockPreviewComponent = {
  name: "MockPreviewComponent",
  template: '<div class="mock-preview">Preview Component</div>',
};

const MockStatsComponent = {
  name: "MockStatsComponent",
  template: '<div class="mock-stats">Statistics Component</div>',
};

const MockErrorDisplay = {
  name: "MockErrorDisplay",
  template: '<div class="mock-error-display">Error Display Component</div>',
};

// Legacy mocks
const LegacyDocConverterContainer = {
  name: "LegacyDocConverterContainer",
  template: '<div class="legacy-converter-container">Legacy Container</div>',
};

// Error throwing component
const ErrorComponent = {
  name: "ErrorComponent",
  setup() {
    throw new Error("Test error in document converter component");
  },
  template: "<div>This should not render</div>",
};

describe("Document Converter Feature Tests", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("Document Converter Container Component", () => {
    it("should render the new container when feature is enabled", () => {
      const wrapper = mount(FeatureWrapper, {
        props: {
          feature: "useSfcDocConverterContainer",
          newComponent: MockDocConverterContainer,
          legacyComponent: LegacyDocConverterContainer,
        },
        global: {
          plugins: [
            createTestingPinia({
              createSpy: vi.fn,
              initialState: {
                featureToggles: {
                  useSfcDocConverterContainer: true,
                  useSfcDocConverter: true,
                },
              },
            }),
          ],
        },
      });

      expect(wrapper.findComponent(MockDocConverterContainer).exists()).toBe(
        true,
      );
      expect(wrapper.findComponent(LegacyDocConverterContainer).exists()).toBe(
        false,
      );
    });

    it("should render the legacy container when feature is disabled", () => {
      const wrapper = mount(FeatureWrapper, {
        props: {
          feature: "useSfcDocConverterContainer",
          newComponent: MockDocConverterContainer,
          legacyComponent: LegacyDocConverterContainer,
        },
        global: {
          plugins: [
            createTestingPinia({
              createSpy: vi.fn,
              initialState: {
                featureToggles: {
                  useSfcDocConverterContainer: false,
                },
              },
            }),
          ],
        },
      });

      expect(wrapper.findComponent(LegacyDocConverterContainer).exists()).toBe(
        true,
      );
      expect(wrapper.findComponent(MockDocConverterContainer).exists()).toBe(
        false,
      );
    });

    it("should fallback to legacy component on error", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const wrapper = mount(FeatureWrapper, {
        props: {
          feature: "useSfcDocConverterContainer",
          newComponent: ErrorComponent,
          legacyComponent: LegacyDocConverterContainer,
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

      // Should show legacy component due to error fallback
      expect(wrapper.findComponent(LegacyDocConverterContainer).exists()).toBe(
        true,
      );

      // Should report error to feature toggles store
      const store = useFeatureTogglesStore();
      expect(store.reportFeatureError).toHaveBeenCalled();

      errorSpy.mockRestore();
    });
  });

  describe("Document Converter Sub-Components", () => {
    it("should respect dependencies between document converter components", () => {
      // Test with container disabled
      const wrapper = mount(FeatureWrapper, {
        props: {
          feature: "useSfcDocConverterFileUpload", // This depends on container
          newComponent: MockFileUpload,
          legacyComponent: {
            template: "<div>Legacy Upload</div>",
          },
        },
        global: {
          plugins: [
            createTestingPinia({
              createSpy: vi.fn,
              initialState: {
                featureToggles: {
                  useSfcDocConverterContainer: false, // Container disabled
                  useSfcDocConverterFileUpload: true, // But upload enabled
                },
              },
            }),
          ],
        },
      });

      // Since container is disabled, upload should fall back to legacy
      expect(wrapper.html()).toContain("Legacy Upload");
      expect(wrapper.html()).not.toContain("File Upload Component");
    });

    it("should enable all document converter features with helper function", async () => {
      // Create store with initial state - all features disabled
      const wrapper = mount(FeatureWrapper, {
        props: {
          feature: "useSfcDocConverterContainer",
          newComponent: MockDocConverterContainer,
        },
        global: {
          plugins: [
            createTestingPinia({
              createSpy: vi.fn,
              initialState: {
                featureToggles: {
                  useSfcDocConverter: false,
                  useSfcDocConverterContainer: false,
                  useSfcDocConverterFileUpload: false,
                  useSfcDocConverterBatchUpload: false,
                },
              },
              stubActions: false,
            }),
          ],
        },
      });

      // Get store
      const store = useFeatureTogglesStore();

      // Use helper function to enable all document converter features
      store.enableAllDocConverterComponents();

      // Manually trigger reactivity for the test
      await wrapper.vm.$nextTick();

      // Now component should be visible
      expect(wrapper.html()).toContain("Document Converter Container");

      // Verify store state
      expect(store.useSfcDocConverter).toBe(true);
      expect(store.useSfcDocConverterContainer).toBe(true);
      expect(store.useSfcDocConverterFileUpload).toBe(true);
      expect(store.useSfcDocConverterBatchUpload).toBe(true);
    });
  });

  describe("Complex Feature Interaction", () => {
    it("should correctly handle a complex feature activation scenario", async () => {
      // Create component with parent store
      const wrapper = mount({
        components: {
          FeatureWrapper,
          MockDocConverterContainer,
          MockFileUpload,
          MockBatchUpload,
        },
        template: `
          <div>
            <FeatureWrapper
              feature="useSfcDocConverterContainer"
              :newComponent="$options.components.MockDocConverterContainer"
            >
              <template #default>
                <FeatureWrapper
                  feature="useSfcDocConverterFileUpload"
                  :newComponent="$options.components.MockFileUpload"
                />
                <FeatureWrapper
                  feature="useSfcDocConverterBatchUpload"
                  :newComponent="$options.components.MockBatchUpload"
                />
              </template>
            </FeatureWrapper>
          </div>
        `,
        global: {
          plugins: [
            createTestingPinia({
              createSpy: vi.fn,
              initialState: {
                featureToggles: {
                  useSfcDocConverter: true,
                  useSfcDocConverterContainer: true,
                  useSfcDocConverterFileUpload: true,
                  useSfcDocConverterBatchUpload: false, // Only this one disabled
                },
              },
            }),
          ],
        },
      });

      // Container and FileUpload should be visible
      expect(wrapper.html()).toContain("Document Converter Container");
      expect(wrapper.html()).toContain("File Upload Component");

      // But BatchUpload should not be visible (disabled)
      expect(wrapper.html()).not.toContain("Batch Upload Component");

      // Now enable BatchUpload
      const store = useFeatureTogglesStore();
      store.useSfcDocConverterBatchUpload = true;

      // Wait for re-render
      await wrapper.vm.$nextTick();

      // Now BatchUpload should also be visible
      expect(wrapper.html()).toContain("Batch Upload Component");
    });
  });
});
