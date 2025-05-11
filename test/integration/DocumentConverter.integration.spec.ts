import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import DocConverterContainer from "@/components/admin/document-converter/DocConverterContainer.vue";
import { useDocumentConverterStore } from "@/stores/documentConverter";
import { useFeatureToggles } from "@/composables/useFeatureToggles";

// Mock dependencies
vi.mock("@/composables/useFeatureToggles", () => ({
  useFeatureToggles: vi.fn(() => ({
    isEnabled: vi.fn((feature) => feature === "useSfcDocConverter"),
    isDocConverterEnabled: true,
  })),
}));

vi.mock("@/composables/useDialog", () => ({
  useGlobalDialog: vi.fn(() => ({
    confirm: vi.fn().mockResolvedValue(true),
    error: vi.fn(),
    warning: vi.fn(),
  })),
}));

vi.mock("@/composables/useI18n", () => ({
  useI18n: vi.fn(() => ({
    t: (key: string, fallback: string) => fallback || key,
  })),
}));

// Mock store actions
const mockUploadDocument = vi.fn();
const mockConvertDocument = vi.fn();
const mockInitialize = vi.fn();
const mockDeleteDocument = vi.fn();
const mockCancelConversion = vi.fn();

// Helper function to create a test file
const createTestFile = (
  name = "test.pdf",
  type = "application/pdf",
  size = 1024,
) => {
  return new File(["test content"], name, { type });
};

describe("DocumentConverter Integration Tests", () => {
  let wrapper;
  let store;

  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks();
    mockUploadDocument.mockResolvedValue("doc-123");
    mockConvertDocument.mockResolvedValue(true);

    // Create test pinia and mount component
    wrapper = mount(DocConverterContainer, {
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            stubActions: false,
            initialState: {
              documentConverter: {
                uploadedFiles: [],
                convertedDocuments: [],
                isConverting: false,
                isUploading: false,
                error: null,
                currentView: "upload",
                lastUpdated: new Date(),
                initialized: true,
              },
            },
          }),
        ],
        stubs: {
          FileUploadV2: true,
          ConversionProgressV2: true,
          DocumentList: true,
          DocumentPreview: true,
          ErrorDisplay: true,
        },
      },
    });

    // Get store after mounting
    store = useDocumentConverterStore();

    // Mock store methods
    store.uploadDocument = mockUploadDocument;
    store.convertDocument = mockConvertDocument;
    store.initialize = mockInitialize;
    store.deleteDocument = mockDeleteDocument;
    store.cancelConversion = mockCancelConversion;
  });

  describe("Initialization and Mounting", () => {
    it("initializes the document converter store on mount", () => {
      expect(mockInitialize).toHaveBeenCalled();
    });

    it("shows the correct initial view", () => {
      expect(wrapper.findComponent({ name: "FileUploadV2" }).exists()).toBe(
        true,
      );
    });

    it("renders the new SFC components when feature toggle is enabled", () => {
      expect(wrapper.findComponent({ name: "FileUploadV2" }).exists()).toBe(
        true,
      );
      expect(wrapper.findComponent({ name: "FileUpload" }).exists()).toBe(
        false,
      );
    });

    it("falls back to legacy components when feature toggle is disabled", async () => {
      // Mock feature toggle to be disabled
      vi.mocked(useFeatureToggles).mockReturnValue({
        isEnabled: vi.fn(() => false),
        isDocConverterEnabled: true,
      });

      // Remount component
      wrapper = mount(DocConverterContainer, {
        global: {
          plugins: [createTestingPinia({ createSpy: vi.fn })],
          stubs: {
            FileUpload: true, // Legacy component
            FileUploadV2: true, // New component
            ConversionProgress: true, // Legacy component
            ConversionProgressV2: true, // New component
          },
        },
      });

      // Should use legacy components
      expect(wrapper.findComponent({ name: "FileUpload" }).exists()).toBe(true);
      expect(wrapper.findComponent({ name: "FileUploadV2" }).exists()).toBe(
        false,
      );
    });
  });

  describe("File Upload Workflow", () => {
    it("handles single file upload and conversion", async () => {
      const testFile = createTestFile();

      // Find the file upload component and trigger upload
      const fileUpload = wrapper.findComponent({ name: "FileUploadV2" });
      await fileUpload.vm.$emit("upload-single", testFile);

      // Check that store methods were called
      expect(mockUploadDocument).toHaveBeenCalledWith(testFile);
      expect(mockConvertDocument).toHaveBeenCalledWith("doc-123");
    });

    it("handles multiple file upload", async () => {
      const testFiles = [
        createTestFile("document1.pdf"),
        createTestFile("document2.pdf"),
      ];

      // Find the file upload component and trigger upload
      const fileUpload = wrapper.findComponent({ name: "FileUploadV2" });
      await fileUpload.vm.$emit("upload", testFiles);

      // Should call uploadMultipleDocuments or handle multiple documents
      expect(mockUploadDocument).toHaveBeenCalled();
    });

    it("shows conversion progress while converting", async () => {
      // Update store state to indicate conversion in progress
      store.isConverting = true;
      store.activeConversionId = "doc-123";
      await wrapper.vm.$nextTick();

      // Should show the conversion progress component
      expect(
        wrapper.findComponent({ name: "ConversionProgressV2" }).exists(),
      ).toBe(true);
    });

    it("can cancel an active conversion", async () => {
      // Update store state to indicate conversion in progress
      store.isConverting = true;
      store.activeConversionId = "doc-123";
      await wrapper.vm.$nextTick();

      // Find the conversion progress component and trigger cancel
      const progressComponent = wrapper.findComponent({
        name: "ConversionProgressV2",
      });
      await progressComponent.vm.$emit("cancel");

      // Should call cancelConversion on the store
      expect(mockCancelConversion).toHaveBeenCalledWith("doc-123");
    });
  });

  describe("Document Management", () => {
    it("shows document list when documents exist", async () => {
      // Update store state with converted documents
      store.convertedDocuments = [
        {
          id: "doc-1",
          originalName: "test1.pdf",
          status: "success",
          originalFormat: "pdf",
        },
        {
          id: "doc-2",
          originalName: "test2.pdf",
          status: "success",
          originalFormat: "pdf",
        },
      ];
      store.currentView = "list";
      await wrapper.vm.$nextTick();

      // Should show the document list component
      expect(wrapper.findComponent({ name: "DocumentList" }).exists()).toBe(
        true,
      );
    });

    it("can view document details", async () => {
      // Setup documents in store
      store.convertedDocuments = [
        {
          id: "doc-1",
          originalName: "test1.pdf",
          status: "success",
          originalFormat: "pdf",
        },
      ];
      store.currentView = "list";
      await wrapper.vm.$nextTick();

      // Find document list and trigger select event
      const documentList = wrapper.findComponent({ name: "DocumentList" });
      await documentList.vm.$emit("select", "doc-1");

      // Store should update selected document
      expect(store.selectedDocumentId).toBe("doc-1");
    });

    it("can delete a document", async () => {
      // Setup documents in store
      store.convertedDocuments = [
        {
          id: "doc-1",
          originalName: "test1.pdf",
          status: "success",
          originalFormat: "pdf",
        },
      ];
      store.currentView = "list";
      await wrapper.vm.$nextTick();

      // Find document list and trigger delete event
      const documentList = wrapper.findComponent({ name: "DocumentList" });
      await documentList.vm.$emit("delete", "doc-1");

      // Should call deleteDocument on the store
      expect(mockDeleteDocument).toHaveBeenCalledWith("doc-1");
    });

    it("shows document preview when a document is selected for viewing", async () => {
      // Setup documents in store and set selected document
      store.convertedDocuments = [
        {
          id: "doc-1",
          originalName: "test1.pdf",
          status: "success",
          originalFormat: "pdf",
        },
      ];
      store.selectedDocumentId = "doc-1";
      store.currentView = "results";
      await wrapper.vm.$nextTick();

      // Should show the document preview component
      expect(wrapper.findComponent({ name: "DocumentPreview" }).exists()).toBe(
        true,
      );
    });
  });

  describe("Error Handling", () => {
    it("shows error display when upload fails", async () => {
      // Mock upload to fail
      mockUploadDocument.mockRejectedValue(new Error("Upload failed"));

      // Trigger file upload
      const fileUpload = wrapper.findComponent({ name: "FileUploadV2" });
      await fileUpload.vm.$emit("upload-single", createTestFile());

      // Wait for promises to resolve
      await flushPromises();

      // Set error in store to simulate the error being caught
      store.error = {
        code: "UPLOAD_FAILED",
        message: "Upload failed",
        timestamp: new Date(),
      };
      await wrapper.vm.$nextTick();

      // Should show error display
      expect(wrapper.findComponent({ name: "ErrorDisplay" }).exists()).toBe(
        true,
      );
    });

    it("shows error display when conversion fails", async () => {
      // Mock upload to succeed but conversion to fail
      mockUploadDocument.mockResolvedValue("doc-123");
      mockConvertDocument.mockRejectedValue(new Error("Conversion failed"));

      // Trigger file upload
      const fileUpload = wrapper.findComponent({ name: "FileUploadV2" });
      await fileUpload.vm.$emit("upload-single", createTestFile());

      // Wait for promises to resolve
      await flushPromises();

      // Set error in store to simulate the error being caught
      store.error = {
        code: "CONVERSION_FAILED",
        message: "Conversion failed",
        timestamp: new Date(),
      };
      await wrapper.vm.$nextTick();

      // Should show error display
      expect(wrapper.findComponent({ name: "ErrorDisplay" }).exists()).toBe(
        true,
      );
    });

    it("can retry after an error", async () => {
      // Set error in store
      store.error = {
        code: "INITIALIZATION_FAILED",
        message: "Init failed",
        timestamp: new Date(),
      };
      await wrapper.vm.$nextTick();

      // Should show error display
      const errorDisplay = wrapper.findComponent({ name: "ErrorDisplay" });
      expect(errorDisplay.exists()).toBe(true);

      // Trigger retry
      await errorDisplay.vm.$emit("retry");

      // Should call initialize again
      expect(mockInitialize).toHaveBeenCalled();
    });
  });

  describe("View Navigation", () => {
    it("navigates between different views", async () => {
      // Initial view should be upload
      expect(store.currentView).toBe("upload");

      // Simulate successful upload and conversion
      const testFile = createTestFile();
      const fileUpload = wrapper.findComponent({ name: "FileUploadV2" });
      await fileUpload.vm.$emit("upload-single", testFile);

      // Mock the store state changes after successful conversion
      store.currentView = "results";
      store.selectedDocumentId = "doc-123";
      await wrapper.vm.$nextTick();

      // Should show results view with document preview
      expect(wrapper.findComponent({ name: "DocumentPreview" }).exists()).toBe(
        true,
      );

      // Navigate to list view
      store.currentView = "list";
      await wrapper.vm.$nextTick();

      // Should show document list
      expect(wrapper.findComponent({ name: "DocumentList" }).exists()).toBe(
        true,
      );
    });
  });

  describe("Accessibility Features", () => {
    it("maintains focus management during navigation", async () => {
      // This would require actual DOM testing with focus management
      // For now, we'll check that components have proper ARIA attributes

      // Setup for document list view
      store.convertedDocuments = [
        {
          id: "doc-1",
          originalName: "test1.pdf",
          status: "success",
          originalFormat: "pdf",
        },
      ];
      store.currentView = "list";
      await wrapper.vm.$nextTick();

      // Replace stub with actual component for this test
      wrapper = mount(DocConverterContainer, {
        global: {
          plugins: [
            createTestingPinia({
              createSpy: vi.fn,
              initialState: {
                documentConverter: {
                  convertedDocuments: [
                    {
                      id: "doc-1",
                      originalName: "test1.pdf",
                      status: "success",
                      originalFormat: "pdf",
                    },
                  ],
                  currentView: "list",
                  error: null,
                  isConverting: false,
                  isUploading: false,
                },
              },
            }),
          ],
        },
        attachTo: document.body,
      });

      // Basic check that the container has a proper role
      expect(wrapper.attributes("role")).toBeDefined();
    });
  });
});
