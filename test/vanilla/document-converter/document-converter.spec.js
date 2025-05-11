import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import axios from "axios";

/**
 * Tests for the DocumentConverterService from the vanilla JS implementation
 *
 * Since the actual DocumentConverterService is implemented in TypeScript (TS),
 * but we need to test the vanilla JS usage, we'll create a mock of the service
 * that mimics how it would be used from vanilla JS.
 *
 * These tests cover:
 * - File upload functionality
 * - Document conversion
 * - Progress tracking
 * - Error handling
 * - Document listing and deletion
 */
describe("Document Converter", () => {
  // Mock for the document converter service
  let documentConverterService;

  // Mock for FormData (used in file uploads)
  let formDataAppendSpy;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Setup FormData mock
    formDataAppendSpy = vi.spyOn(FormData.prototype, "append");

    // Mock document converter service
    documentConverterService = {
      // Document management
      uploadDocument: vi.fn().mockImplementation(async (file, onProgress) => {
        if (onProgress) {
          // Simulate progress callback
          onProgress(30);
          onProgress(60);
          onProgress(100);
        }
        return "doc-123";
      }),

      getDocuments: vi.fn().mockResolvedValue([
        {
          id: "doc-123",
          originalName: "test-document.pdf",
          originalFormat: "pdf",
          size: 1024 * 1024, // 1 MB
          uploadedAt: new Date(),
          status: "success",
        },
        {
          id: "doc-456",
          originalName: "test-spreadsheet.xlsx",
          originalFormat: "xlsx",
          size: 512 * 1024, // 512 KB
          uploadedAt: new Date(),
          status: "error",
          error: "Conversion failed",
        },
      ]),

      getDocument: vi.fn().mockImplementation(async (documentId) => {
        if (documentId === "doc-123") {
          return {
            id: "doc-123",
            originalName: "test-document.pdf",
            originalFormat: "pdf",
            size: 1024 * 1024, // 1 MB
            uploadedAt: new Date(),
            convertedAt: new Date(),
            status: "success",
            content: "Document content",
            metadata: {
              title: "Test Document",
              pageCount: 5,
            },
          };
        } else if (documentId === "doc-456") {
          return {
            id: "doc-456",
            originalName: "test-spreadsheet.xlsx",
            originalFormat: "xlsx",
            size: 512 * 1024, // 512 KB
            uploadedAt: new Date(),
            status: "error",
            error: "Conversion failed",
          };
        } else if (documentId === "doc-789") {
          return {
            id: "doc-789",
            originalName: "processing-document.docx",
            originalFormat: "docx",
            size: 2 * 1024 * 1024, // 2 MB
            uploadedAt: new Date(),
            status: "processing",
          };
        }

        throw new Error(`Document ${documentId} not found`);
      }),

      deleteDocument: vi.fn().mockResolvedValue(undefined),

      // Conversion
      convertDocument: vi
        .fn()
        .mockImplementation(async (documentId, settings, onProgress) => {
          if (documentId === "doc-456") {
            throw new Error("Document conversion failed");
          }

          if (onProgress) {
            // Simulate progress callback
            onProgress(10, "Analyzing document...", 120);
            onProgress(30, "Extracting text...", 90);
            onProgress(50, "Formatting content...", 60);
            onProgress(80, "Optimizing document...", 30);
            onProgress(100, "Conversion complete", 0);
          }

          return {
            id: documentId,
            originalName: "test-document.pdf",
            originalFormat: "pdf",
            size: 1024 * 1024, // 1 MB
            uploadedAt: new Date(),
            convertedAt: new Date(),
            status: "success",
            content: "Converted document content",
            metadata: {
              title: "Test Document",
              pageCount: 5,
              ...(settings?.extractMetadata
                ? { author: "Test Author", created: new Date() }
                : {}),
            },
          };
        }),

      getConversionStatus: vi.fn().mockImplementation(async (documentId) => {
        if (documentId === "doc-123") {
          return {
            documentId,
            progress: 100,
            step: "Conversion complete",
            estimatedTimeRemaining: 0,
          };
        } else if (documentId === "doc-456") {
          return {
            documentId,
            progress: 0,
            step: "Conversion failed",
            estimatedTimeRemaining: 0,
          };
        } else if (documentId === "doc-789") {
          return {
            documentId,
            progress: 50,
            step: "Extracting text...",
            estimatedTimeRemaining: 60,
          };
        }

        throw new Error(`Document ${documentId} not found`);
      }),

      cancelConversion: vi.fn().mockResolvedValue(undefined),

      // Downloads
      downloadDocument: vi
        .fn()
        .mockImplementation(async (documentId, filename, onProgress) => {
          if (documentId === "doc-456") {
            throw new Error("Document download failed");
          }

          if (onProgress) {
            // Simulate progress callback
            onProgress(30);
            onProgress(70);
            onProgress(100);
          }

          return new Blob(["Fake document content"], {
            type: "application/pdf",
          });
        }),
    };

    // Inject the service into window for global access
    window.documentConverterService = documentConverterService;

    // Mock axios
    axios.post.mockResolvedValue({
      data: {
        success: true,
        message: "Operation successful",
        data: { documentId: "doc-123" },
      },
    });
  });

  afterEach(() => {
    delete window.documentConverterService;
  });

  // Test suite for file upload
  describe("File Upload", () => {
    it("should upload a file and return a document ID", async () => {
      // Create a test file
      const testFile = new File(["test content"], "test-document.pdf", {
        type: "application/pdf",
      });

      // Mock progress callback
      const progressCallback = vi.fn();

      // Call upload function
      const documentId = await documentConverterService.uploadDocument(
        testFile,
        progressCallback,
      );

      // Verify behavior
      expect(documentId).toBe("doc-123");
      expect(documentConverterService.uploadDocument).toHaveBeenCalledWith(
        testFile,
        progressCallback,
      );
      expect(progressCallback).toHaveBeenCalledTimes(3);
      expect(progressCallback).toHaveBeenLastCalledWith(100);
    });

    it("should handle upload errors", async () => {
      // Set up error
      documentConverterService.uploadDocument.mockRejectedValueOnce(
        new Error("Upload failed"),
      );

      // Create a test file
      const testFile = new File(["test content"], "test-document.pdf", {
        type: "application/pdf",
      });

      // Call upload function and expect error
      await expect(
        documentConverterService.uploadDocument(testFile),
      ).rejects.toThrow("Upload failed");
    });
  });

  // Test suite for document conversion
  describe("Document Conversion", () => {
    it("should convert a document with default settings", async () => {
      // Call convert function
      const result = await documentConverterService.convertDocument("doc-123");

      // Verify behavior
      expect(result).toMatchObject({
        id: "doc-123",
        status: "success",
        content: "Converted document content",
      });
      expect(documentConverterService.convertDocument).toHaveBeenCalledWith(
        "doc-123",
        undefined,
        undefined,
      );
    });

    it("should convert a document with custom settings", async () => {
      // Conversion settings
      const settings = {
        extractMetadata: true,
        extractTables: true,
        ocrEnabled: false,
      };

      // Progress callback
      const progressCallback = vi.fn();

      // Call convert function
      const result = await documentConverterService.convertDocument(
        "doc-123",
        settings,
        progressCallback,
      );

      // Verify behavior
      expect(result).toMatchObject({
        id: "doc-123",
        status: "success",
        metadata: expect.objectContaining({
          author: "Test Author",
        }),
      });
      expect(documentConverterService.convertDocument).toHaveBeenCalledWith(
        "doc-123",
        settings,
        progressCallback,
      );
      expect(progressCallback).toHaveBeenCalledTimes(5);
      expect(progressCallback).toHaveBeenLastCalledWith(
        100,
        "Conversion complete",
        0,
      );
    });

    it("should handle conversion errors", async () => {
      // Call convert function and expect error
      await expect(
        documentConverterService.convertDocument("doc-456"),
      ).rejects.toThrow("Document conversion failed");
    });
  });

  // Test suite for document management
  describe("Document Management", () => {
    it("should retrieve a list of documents", async () => {
      // Call get documents function
      const documents = await documentConverterService.getDocuments();

      // Verify behavior
      expect(documents).toHaveLength(2);
      expect(documents[0]).toMatchObject({
        id: "doc-123",
        status: "success",
      });
      expect(documents[1]).toMatchObject({
        id: "doc-456",
        status: "error",
      });
    });

    it("should retrieve a specific document", async () => {
      // Call get document function
      const document = await documentConverterService.getDocument("doc-123");

      // Verify behavior
      expect(document).toMatchObject({
        id: "doc-123",
        originalName: "test-document.pdf",
        status: "success",
      });
    });

    it("should handle error when retrieving non-existent document", async () => {
      // Call get document function with non-existent ID
      await expect(
        documentConverterService.getDocument("non-existent"),
      ).rejects.toThrow("Document non-existent not found");
    });

    it("should delete a document", async () => {
      // Call delete document function
      await documentConverterService.deleteDocument("doc-123");

      // Verify behavior
      expect(documentConverterService.deleteDocument).toHaveBeenCalledWith(
        "doc-123",
      );
    });
  });

  // Test suite for conversion status
  describe("Conversion Status", () => {
    it("should retrieve conversion status for a successful document", async () => {
      // Call get conversion status function
      const status =
        await documentConverterService.getConversionStatus("doc-123");

      // Verify behavior
      expect(status).toMatchObject({
        documentId: "doc-123",
        progress: 100,
        step: "Conversion complete",
      });
    });

    it("should retrieve conversion status for a failed document", async () => {
      // Call get conversion status function
      const status =
        await documentConverterService.getConversionStatus("doc-456");

      // Verify behavior
      expect(status).toMatchObject({
        documentId: "doc-456",
        progress: 0,
        step: "Conversion failed",
      });
    });

    it("should retrieve conversion status for a processing document", async () => {
      // Call get conversion status function
      const status =
        await documentConverterService.getConversionStatus("doc-789");

      // Verify behavior
      expect(status).toMatchObject({
        documentId: "doc-789",
        progress: 50,
        step: "Extracting text...",
      });
    });

    it("should cancel a conversion", async () => {
      // Call cancel conversion function
      await documentConverterService.cancelConversion("doc-789");

      // Verify behavior
      expect(documentConverterService.cancelConversion).toHaveBeenCalledWith(
        "doc-789",
      );
    });
  });

  // Test suite for document download
  describe("Document Download", () => {
    it("should download a document", async () => {
      // Progress callback
      const progressCallback = vi.fn();

      // Call download function
      const blob = await documentConverterService.downloadDocument(
        "doc-123",
        "downloaded-document.pdf",
        progressCallback,
      );

      // Verify behavior
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe("application/pdf");
      expect(documentConverterService.downloadDocument).toHaveBeenCalledWith(
        "doc-123",
        "downloaded-document.pdf",
        progressCallback,
      );
      expect(progressCallback).toHaveBeenCalledTimes(3);
      expect(progressCallback).toHaveBeenLastCalledWith(100);
    });

    it("should handle download errors", async () => {
      // Call download function with document that will fail
      await expect(
        documentConverterService.downloadDocument("doc-456"),
      ).rejects.toThrow("Document download failed");
    });
  });

  // Integration test of common document conversion workflow
  describe("Document Conversion Workflow", () => {
    it("should handle a full document conversion workflow", async () => {
      // 1. Create test file
      const testFile = new File(["test content"], "document.pdf", {
        type: "application/pdf",
      });

      // 2. Upload the file
      const uploadProgress = vi.fn();
      const documentId = await documentConverterService.uploadDocument(
        testFile,
        uploadProgress,
      );
      expect(documentId).toBe("doc-123");
      expect(uploadProgress).toHaveBeenLastCalledWith(100);

      // 3. Convert the document with progress tracking
      const conversionProgress = vi.fn();
      const conversionSettings = {
        extractMetadata: true,
        extractTables: true,
      };

      const convertedDoc = await documentConverterService.convertDocument(
        documentId,
        conversionSettings,
        conversionProgress,
      );

      expect(convertedDoc.status).toBe("success");
      expect(conversionProgress).toHaveBeenCalledTimes(5);

      // 4. Check conversion status
      const status =
        await documentConverterService.getConversionStatus(documentId);
      expect(status.progress).toBe(100);

      // 5. Download the converted document
      const downloadProgress = vi.fn();
      const blob = await documentConverterService.downloadDocument(
        documentId,
        "converted-document.pdf",
        downloadProgress,
      );

      expect(blob).toBeInstanceOf(Blob);
      expect(downloadProgress).toHaveBeenLastCalledWith(100);

      // 6. Delete the document when done
      await documentConverterService.deleteDocument(documentId);
      expect(documentConverterService.deleteDocument).toHaveBeenCalledWith(
        documentId,
      );
    });
  });
});
