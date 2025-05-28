/**
 * Comprehensive functional tests for the Document Converter.
 * These tests verify the integration between components and the complete workflow.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import DocConverterContainer from "@/components/admin/document-converter/DocConverterContainer.vue";
import { useDocumentConverterStore } from "@/stores/documentConverter";
import { ApiService } from "@/services/api/ApiService";

// Mock API service
vi.mock("@/services/api/ApiService", () => ({
  ApiService: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    upload: vi.fn(),
  },
}));

// Mock FormData for file uploads
global.FormData = class {
  private data: Record<string, any> = {};

  append(key: string, value: any) {
    this.data[key] = value;
  }

  get(key: string) {
    return this.data[key];
  }

  getAll(key: string) {
    return [this.data[key]];
  }

  has(key: string) {
    return key in this.data;
  }
};

describe("Document Converter Integration", () => {
  let wrapper;
  let docConverterStore;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create a fresh Pinia instance for each test
    const pinia = createTestingPinia({
      createSpy: vi.fn,
      stubActions: false,
    });

    // Get the store
    docConverterStore = useDocumentConverterStore(pinia);

    // Setup API mock responses
    ApiService.get.mockImplementation((url) => {
      if (url.includes("/api/documents")) {
        return Promise.resolve({
          data: {
            documents: [
              {
                id: "doc1",
                originalName: "test.pdf",
                originalFormat: "pdf",
                convertedFormat: "txt",
                size: 1024 * 1024,
                status: "processed",
                convertedAt: new Date().toISOString(),
              },
              {
                id: "doc2",
                originalName: "presentation.pptx",
                originalFormat: "pptx",
                convertedFormat: "txt",
                size: 2 * 1024 * 1024,
                status: "processed",
                convertedAt: new Date().toISOString(),
              },
            ],
          },
        });
      } else if (url.includes("/api/documents/doc1")) {
        return Promise.resolve({
          data: {
            document: {
              id: "doc1",
              originalName: "test.pdf",
              originalFormat: "pdf",
              convertedFormat: "txt",
              size: 1024 * 1024,
              status: "processed",
              convertedAt: new Date().toISOString(),
              content: "This is the converted document content.",
              pages: 5,
              metadata: {
                author: "Test Author",
                createdAt: new Date().toISOString(),
                totalWords: 1000,
              },
            },
          },
        });
      }

      return Promise.reject(new Error("Unknown API endpoint"));
    });

    ApiService.post.mockImplementation((url, data) => {
      if (url.includes("/api/documents/convert")) {
        return Promise.resolve({
          data: {
            jobId: "job123",
            documentId: data.documentId,
            status: "processing",
          },
        });
      } else if (url.includes("/api/documents/upload/finalize")) {
        return Promise.resolve({
          data: {
            documentId: "doc3",
            originalName: data.fileName,
            originalFormat: data.fileName.split(".").pop(),
            size: data.fileSize || 1024 * 1024,
            status: "uploaded",
          },
        });
      }

      return Promise.reject(new Error("Unknown API endpoint"));
    });

    ApiService.upload = vi.fn().mockResolvedValue({
      data: {
        uploadId: "upload123",
        urls: ["https://example.com/upload/part1"],
        headers: { "Content-Type": "application/octet-stream" },
      },
    });

    // Mount the component
    wrapper = mount(DocConverterContainer, {
      global: {
        plugins: [pinia],
        stubs: {
          // Partial stubs to allow some real components to mount
          FileUpload: false,
          ConversionProgress: false,
          ConversionResult: false,
          DocumentList: false,
        },
        mocks: {
          $t: (key, fallback) => fallback || key,
        },
      },
    });
  });

  // Complete end-to-end workflow tests
  describe("End-to-End Workflows", () => {
    it("completes full document conversion workflow", async () => {
      // 1. Verify initial state
      expect(wrapper.vm.isConverting).toBe(false);
      expect(wrapper.vm.conversionResult).toBeNull();

      // Mock document upload
      const file = new File(["test document content"], "important-doc.pdf", {
        type: "application/pdf",
      });

      // 2. Simulate drag-and-drop upload
      await wrapper.vm.startConversion(file);

      // API should be called with FormData containing the file
      expect(ApiService.upload).toHaveBeenCalled();

      // 3. Conversion should start
      expect(wrapper.vm.isConverting).toBe(true);

      // Simulate progress updates
      for (let progress = 0; progress <= 100; progress += 25) {
        await wrapper.vm.updateProgress(
          progress,
          "Processing page " + Math.floor(progress / 25),
        );
        await flushPromises();

        // Update the store to match the component's state
        docConverterStore.conversionProgress = progress;
        docConverterStore.conversionStep =
          "Processing page " + Math.floor(progress / 25);
      }

      // 4. Simulate conversion completion
      await wrapper.vm.conversionComplete({
        id: "doc3",
        originalName: "important-doc.pdf",
        originalFormat: "pdf",
        convertedFormat: "txt",
        status: "processed",
        convertedAt: new Date().toISOString(),
        content: "This is the converted document content.",
      });

      // 5. Verify final state
      expect(wrapper.vm.isConverting).toBe(false);
      expect(wrapper.vm.conversionResult).not.toBeNull();
      expect(wrapper.vm.conversionResult.id).toBe("doc3");

      // 6. Result should be displayed
      await flushPromises();
      expect(wrapper.find(".conversion-result-content").exists()).toBe(true);
    });

    it("handles document list interactions", async () => {
      // Initialize store with documents
      await docConverterStore.fetchDocuments();
      await flushPromises();

      // 1. Verify documents are loaded
      expect(docConverterStore.documents.length).toBeGreaterThan(0);

      // 2. Select a document from the list
      await wrapper.vm.viewDocument("doc1");
      await flushPromises();

      // 3. Document details should be fetched and displayed
      expect(ApiService.get).toHaveBeenCalledWith("/api/documents/doc1");
      expect(wrapper.vm.conversionResult).not.toBeNull();
      expect(wrapper.vm.conversionResult.id).toBe("doc1");

      // 4. Document content should be displayed
      await flushPromises();
      expect(wrapper.find(".conversion-result-content").exists()).toBe(true);

      // 5. Return to file upload view
      await wrapper.vm.clearResult();
      await flushPromises();

      // 6. Verify upload view is shown again
      expect(wrapper.vm.conversionResult).toBeNull();
      expect(wrapper.find(".file-upload-container").exists()).toBe(true);
    });

    it("handles document deletion", async () => {
      // Mock confirmation dialog
      global.confirm = vi.fn().mockReturnValue(true);

      // Setup delete API mock
      ApiService.delete.mockResolvedValue({ data: { success: true } });

      // Initialize store with documents
      await docConverterStore.fetchDocuments();
      await flushPromises();

      // Store the initial document count
      const initialCount = docConverterStore.documents.length;

      // 1. Trigger document deletion
      await wrapper.vm.promptDeleteDocument("doc1");
      await flushPromises();

      // 2. Confirm API was called correctly
      expect(ApiService.delete).toHaveBeenCalledWith("/api/documents/doc1");

      // 3. Document should be removed from the list
      expect(docConverterStore.documents.length).toBe(initialCount - 1);
      expect(
        docConverterStore.documents.find((d) => d.id === "doc1"),
      ).toBeUndefined();
    });
  });

  // Error handling and edge cases
  describe("Error Handling", () => {
    it("handles upload errors gracefully", async () => {
      // Mock API to reject the upload
      ApiService.upload.mockRejectedValue(new Error("Upload server error"));

      // Create a file
      const file = new File(["test content"], "error-doc.pdf", {
        type: "application/pdf",
      });

      // Attempt to upload
      await wrapper.vm.startConversion(file);
      await flushPromises();

      // Should show error state
      expect(wrapper.vm.error).not.toBeNull();
      expect(wrapper.vm.error.message).toContain("Upload server error");

      // Error should be displayed to the user
      expect(wrapper.find(".error-message").exists()).toBe(true);
    });

    it("handles conversion errors", async () => {
      // Setup mock for initial upload success but conversion failure
      ApiService.upload.mockResolvedValue({
        data: {
          uploadId: "upload123",
          urls: ["https://example.com/upload/part1"],
          headers: { "Content-Type": "application/octet-stream" },
        },
      });

      ApiService.post.mockImplementation((url) => {
        if (url.includes("/api/documents/upload/finalize")) {
          return Promise.resolve({
            data: {
              documentId: "doc3",
              originalName: "error-doc.pdf",
              originalFormat: "pdf",
              size: 1024 * 1024,
              status: "uploaded",
            },
          });
        } else if (url.includes("/api/documents/convert")) {
          return Promise.reject(
            new Error("Conversion failed: Unsupported format"),
          );
        }

        return Promise.reject(new Error("Unknown API endpoint"));
      });

      // Create a file
      const file = new File(["test content"], "error-doc.pdf", {
        type: "application/pdf",
      });

      // Start conversion
      await wrapper.vm.startConversion(file);
      await flushPromises();

      // Initial upload should succeed
      expect(ApiService.upload).toHaveBeenCalled();

      // But conversion should fail
      expect(wrapper.vm.error).not.toBeNull();
      expect(wrapper.vm.error.message).toContain("Conversion failed");

      // Error should be displayed to user
      expect(wrapper.find(".error-message").exists()).toBe(true);
    });

    it("handles network disconnect during conversion", async () => {
      // Setup for successful upload but interrupted conversion
      ApiService.upload.mockResolvedValue({
        data: {
          uploadId: "upload123",
          urls: ["https://example.com/upload/part1"],
          headers: { "Content-Type": "application/octet-stream" },
        },
      });

      ApiService.post.mockImplementation((url) => {
        if (url.includes("/api/documents/upload/finalize")) {
          return Promise.resolve({
            data: {
              documentId: "doc3",
              originalName: "large-doc.pdf",
              originalFormat: "pdf",
              size: 10 * 1024 * 1024, // 10MB
              status: "uploaded",
            },
          });
        } else if (url.includes("/api/documents/convert")) {
          return Promise.resolve({
            data: {
              jobId: "job123",
              documentId: "doc3",
              status: "processing",
            },
          });
        }

        return Promise.reject(new Error("Unknown API endpoint"));
      });

      // Mock reconnection checks
      let reconnectionAttempts = 0;
      const originalOnline = navigator.onLine;
      Object.defineProperty(navigator, "onLine", {
        get: () => {
          reconnectionAttempts += 1;
          // Return offline for first attempt, then online
          return reconnectionAttempts > 1;
        },
        configurable: true,
      });

      // Create a large file
      const file = new File(["test".repeat(1000000)], "large-doc.pdf", {
        type: "application/pdf",
      });

      // Start conversion
      await wrapper.vm.startConversion(file);
      await flushPromises();

      // Set initial progress
      await wrapper.vm.updateProgress(25, "Processing page 1");

      // Simulate network disconnect during conversion
      // Trigger the 'offline' event
      window.dispatchEvent(new Event("offline"));
      await flushPromises();

      // Should show offline warning
      expect(wrapper.find(".network-error-message").exists()).toBe(true);

      // Simulate network reconnect
      window.dispatchEvent(new Event("online"));
      await flushPromises();

      // Should hide offline warning and resume conversion
      expect(wrapper.find(".network-error-message").exists()).toBe(false);
      expect(wrapper.vm.isConverting).toBe(true);

      // Restore original online property
      Object.defineProperty(navigator, "onLine", {
        get: () => originalOnline,
        configurable: true,
      });
    });
  });

  // Performance and large file handling
  describe("Performance and Large Files", () => {
    it("handles large documents with progress tracking", async () => {
      // Mock timing functions
      vi.useFakeTimers();

      // Setup for multi-part upload of large file
      ApiService.upload.mockResolvedValue({
        data: {
          uploadId: "upload-large-123",
          urls: [
            "https://example.com/upload/large/part1",
            "https://example.com/upload/large/part2",
            "https://example.com/upload/large/part3",
          ],
          headers: { "Content-Type": "application/octet-stream" },
        },
      });

      // Mock fetch for part uploads
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });

      // Create a large file (simulate 100MB)
      const largeFile = new File(["test".repeat(1000)], "large-document.pdf", {
        type: "application/pdf",
      });
      Object.defineProperty(largeFile, "size", { value: 100 * 1024 * 1024 });

      // Start conversion
      await wrapper.vm.startConversion(largeFile);
      await flushPromises();

      // Upload should start
      expect(ApiService.upload).toHaveBeenCalled();
      expect(wrapper.vm.isUploading).toBe(true);

      // Simulate upload progress events
      const uploadProgressEvent = new Event("progress");
      Object.defineProperty(uploadProgressEvent, "loaded", {
        value: 33 * 1024 * 1024,
      });
      Object.defineProperty(uploadProgressEvent, "total", {
        value: 100 * 1024 * 1024,
      });

      // Dispatch progress event
      window.dispatchEvent(uploadProgressEvent);
      await flushPromises();

      // Should show upload progress
      expect(wrapper.vm.uploadProgress).toBe(33);

      // Fast-forward timers to simulate elapsed time
      vi.advanceTimersByTime(5000);

      // Complete the upload
      wrapper.vm.uploadComplete({ documentId: "large-doc-1" });
      await flushPromises();

      // Upload should be complete and conversion starting
      expect(wrapper.vm.isUploading).toBe(false);
      expect(wrapper.vm.isConverting).toBe(true);

      // Simulate conversion progress
      for (let i = 0; i <= 100; i += 20) {
        await wrapper.vm.updateProgress(
          i,
          `Processing page ${i / 20 + 1} of 6`,
        );
        // Update estimated time
        wrapper.vm.estimatedTimeRemaining = Math.floor((100 - i) / 10);
        await flushPromises();
        vi.advanceTimersByTime(2000);
      }

      // Complete the conversion
      await wrapper.vm.conversionComplete({
        id: "large-doc-1",
        originalName: "large-document.pdf",
        originalFormat: "pdf",
        convertedFormat: "txt",
        status: "processed",
        size: 100 * 1024 * 1024,
        pages: 6,
        words: 500000,
        convertedAt: new Date().toISOString(),
      });

      // Progress should be at 100%
      expect(wrapper.vm.conversionProgress).toBe(100);

      // Conversion should be complete
      expect(wrapper.vm.isConverting).toBe(false);
      expect(wrapper.vm.conversionResult).not.toBeNull();
      expect(wrapper.vm.conversionResult.status).toBe("processed");

      // Result should include stats for the large document
      expect(wrapper.vm.conversionResult.pages).toBe(6);
      expect(wrapper.vm.conversionResult.words).toBe(500000);

      // Restore real timers
      vi.useRealTimers();
    });
  });

  // Document preview tests
  describe("Document Preview", () => {
    it("renders different preview types based on document format", async () => {
      // Load documents
      await docConverterStore.fetchDocuments();
      await flushPromises();

      // Setup document preview responses
      ApiService.get.mockImplementation((url) => {
        if (url.includes("/api/documents/doc1")) {
          return Promise.resolve({
            data: {
              document: {
                id: "doc1",
                originalName: "test.pdf",
                originalFormat: "pdf",
                convertedFormat: "txt",
                content: "Plain text preview content",
                pages: 5,
              },
            },
          });
        } else if (url.includes("/api/documents/doc2")) {
          return Promise.resolve({
            data: {
              document: {
                id: "doc2",
                originalName: "presentation.pptx",
                originalFormat: "pptx",
                convertedFormat: "html",
                content:
                  "<html><body><h1>HTML Preview</h1><p>This is HTML content</p></body></html>",
                slides: 10,
              },
            },
          });
        }

        return Promise.reject(new Error("Unknown document"));
      });

      // 1. View PDF document
      await wrapper.vm.viewDocument("doc1");
      await flushPromises();

      // Should render text preview
      expect(wrapper.find(".text-preview").exists()).toBe(true);
      expect(wrapper.find(".text-preview").text()).toContain("Plain text");

      // 2. View PPTX document
      await wrapper.vm.viewDocument("doc2");
      await flushPromises();

      // Should render HTML preview
      expect(wrapper.find(".html-preview").exists()).toBe(true);

      // 3. Check preview controls
      expect(wrapper.find(".preview-controls").exists()).toBe(true);

      // Mock document with image previews
      docConverterStore.documents.push({
        id: "doc4",
        originalName: "document-with-images.docx",
        originalFormat: "docx",
        convertedFormat: "html",
        size: 5 * 1024 * 1024,
        status: "processed",
        convertedAt: new Date().toISOString(),
        hasImagePreviews: true,
      });

      // Update API mock for this document
      ApiService.get.mockImplementation((url) => {
        if (url.includes("/api/documents/doc4")) {
          return Promise.resolve({
            data: {
              document: {
                id: "doc4",
                originalName: "document-with-images.docx",
                originalFormat: "docx",
                convertedFormat: "html",
                pages: 8,
                previewImages: [
                  { url: "preview1.jpg", page: 1 },
                  { url: "preview2.jpg", page: 2 },
                ],
                hasImagePreviews: true,
              },
            },
          });
        }
        return Promise.reject(new Error("Unknown document"));
      });

      // 4. View document with image previews
      await wrapper.vm.viewDocument("doc4");
      await flushPromises();

      // Should show image preview gallery
      expect(wrapper.find(".image-preview-gallery").exists()).toBe(true);
    });
  });

  // Batch processing
  describe("Batch Processing", () => {
    it("supports batch upload and conversion", async () => {
      // Mock batch upload API
      ApiService.post.mockImplementation((url) => {
        if (url.includes("/api/documents/batch")) {
          return Promise.resolve({
            data: {
              batchId: "batch123",
              totalFiles: 3,
              status: "processing",
            },
          });
        } else if (url.includes("/api/documents/batch/batch123/status")) {
          return Promise.resolve({
            data: {
              status: "completed",
              processedFiles: 3,
              totalFiles: 3,
              results: [
                {
                  id: "batch-doc1",
                  status: "processed",
                  originalName: "file1.pdf",
                },
                {
                  id: "batch-doc2",
                  status: "processed",
                  originalName: "file2.docx",
                },
                {
                  id: "batch-doc3",
                  status: "processed",
                  originalName: "file3.xlsx",
                },
              ],
            },
          });
        }

        return Promise.reject(new Error("Unknown API endpoint"));
      });

      // Create multiple files
      const files = [
        new File(["content1"], "file1.pdf", { type: "application/pdf" }),
        new File(["content2"], "file2.docx", {
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        }),
        new File(["content3"], "file3.xlsx", {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
      ];

      // Start batch conversion
      await wrapper.vm.startBatchConversion(files);
      await flushPromises();

      // Should begin batch processing
      expect(ApiService.post).toHaveBeenCalledWith(
        "/api/documents/batch",
        expect.any(Object),
      );
      expect(wrapper.vm.isBatchProcessing).toBe(true);

      // Simulate progress updates
      for (let i = 0; i < 3; i++) {
        await wrapper.vm.updateBatchProgress({
          processedFiles: i + 1,
          totalFiles: 3,
          status: i < 2 ? "processing" : "completed",
        });
        await flushPromises();
      }

      // Batch should complete
      expect(wrapper.vm.isBatchProcessing).toBe(false);
      expect(wrapper.vm.batchResults).not.toBeNull();
      expect(wrapper.vm.batchResults.length).toBe(3);

      // Results summary should be displayed
      expect(wrapper.find(".batch-results-summary").exists()).toBe(true);
      expect(wrapper.find(".batch-results-list").exists()).toBe(true);
    });
  });
});
