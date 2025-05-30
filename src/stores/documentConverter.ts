import { defineStore } from "pinia";
import { ref, computed, watch } from "vue";
import { documentConverterService } from "@/services/api/DocumentConverterService";
import { adminDocConverterService } from "@/services/api/AdminDocConverterService";
import { shouldUseRealApi } from "@/config/api-flags";
import type {
  ConversionResult,
  ConversionSettings,
  DocumentStatistics,
  QueueInfo,
  ConverterSettings,
} from "@/types/documentConverter";

export const useDocumentConverterStore = defineStore(
  "documentConverter",
  () => {
    // State
    const documents = ref<ConversionResult[]>([]);
    const selectedDocumentId = ref<string | null>(null);
    const currentView = ref<"upload" | "conversion" | "results" | "list">(
      "upload",
    );
    const isLoading = ref(false);
    const error = ref<string | null>(null);
    const conversionProgress = ref({
      percentage: 0,
      currentStep: "",
      estimatedTimeRemaining: 0,
    });
    const conversionSettings = ref<ConversionSettings>({
      preserveFormatting: true,
      extractMetadata: true,
      extractTables: true,
      ocrEnabled: false,
      ocrLanguage: "en",
    });

    // Mock data for admin view
    const createMockData = () => {
      // Mock documents
      if (documents.value.length === 0) {
        const mockDocuments: ConversionResult[] = [
          {
            id: "doc1",
            filename: "Annual Report 2024.pdf",
            originalName: "Annual Report 2024.pdf", // Add alternative property name
            format: "pdf",
            originalFormat: "pdf", // Add alternative property name
            size: 3145728, // 3MB
            status: "completed",
            uploadedAt: Date.now() - 7 * 24 * 60 * 60 * 1000, // 7 days ago
            convertedAt: Date.now() - 7 * 24 * 60 * 60 * 1000 + 35000, // 35 seconds later
            duration: 35000, // 35 seconds
            content: "Lorem ipsum dolor sit amet...",
            metadata: {
              author: "Finance Department",
              created: "2024-01-15",
              pages: 24,
            },
          },
          {
            id: "doc2",
            filename: "Product Specifications.docx",
            originalName: "Product Specifications.docx", // Add alternative property name
            format: "docx",
            originalFormat: "docx", // Add alternative property name
            size: 1572864, // 1.5MB
            status: "completed",
            uploadedAt: Date.now() - 3 * 24 * 60 * 60 * 1000, // 3 days ago
            convertedAt: Date.now() - 3 * 24 * 60 * 60 * 1000 + 28000, // 28 seconds later
            duration: 28000, // 28 seconds
            content: "Product specifications for new release...",
            metadata: {
              author: "Product Team",
              created: "2024-03-10",
              pages: 12,
            },
          },
          {
            id: "doc3",
            filename: "Financial Analysis.xlsx",
            originalName: "Financial Analysis.xlsx", // Add alternative property name
            format: "xlsx",
            originalFormat: "xlsx", // Add alternative property name
            size: 2097152, // 2MB
            status: "completed",
            uploadedAt: Date.now() - 1 * 24 * 60 * 60 * 1000, // 1 day ago
            convertedAt: Date.now() - 1 * 24 * 60 * 60 * 1000 + 42000, // 42 seconds later
            duration: 42000, // 42 seconds
            content: "Financial analysis for Q1 2024...",
            metadata: {
              author: "Finance Team",
              created: "2024-04-01",
              pages: 5,
            },
          },
          {
            id: "doc4",
            filename: "Marketing Strategy.pptx",
            originalName: "Marketing Strategy.pptx", // Add alternative property name
            format: "pptx",
            originalFormat: "pptx", // Add alternative property name
            size: 4194304, // 4MB
            status: "failed",
            error: "File format is not supported",
            uploadedAt: Date.now() - 12 * 60 * 60 * 1000, // 12 hours ago
            convertedAt: 0,
          },
          {
            id: "doc5",
            filename: "Customer Feedback.pdf",
            originalName: "Customer Feedback.pdf", // Add alternative property name
            format: "pdf",
            originalFormat: "pdf", // Add alternative property name
            size: 1048576, // 1MB
            status: "processing",
            uploadedAt: Date.now() - 1 * 60 * 60 * 1000, // 1 hour ago
            convertedAt: 0,
          },
        ];

        documents.value = mockDocuments;
      }
    };

    // Getters
    const getDocumentById = computed(() => (id: string) => {
      return documents.value.find((doc) => doc.id === id) || null;
    });

    const selectedDocument = computed(() => {
      if (!selectedDocumentId.value) return null;
      return (
        documents.value.find((doc) => doc.id === selectedDocumentId.value) ||
        null
      );
    });

    const documentsByFormat = computed(() => {
      const result: Record<string, ConversionResult[]> = {};

      documents.value.forEach((doc: any) => {
        if (!result[doc.format]) {
          result[doc.format] = [];
        }
        result[doc.format].push(doc);
      });

      return result;
    });

    const documentsByStatus = computed(() => {
      return {
        completed: documents.value.filter((doc: any) => doc.status === "completed"),
        processing: documents.value.filter(
          (doc) => doc.status === "processing",
        ),
        failed: documents.value.filter((doc: any) => doc.status === "failed"),
      };
    });

    // Actions
    const initialize = async () => {
      isLoading.value = true;
      error.value = null;

      try {
        // Check if we should use real API calls for DocumentConverter
        if (shouldUseRealApi("useRealDocumentConverterApi")) {
          // Real API implementation
          const response = await documentConverterService.getDocuments();

          if (response && response.length > 0) {
            // Map API response to store format
            documents.value = response.map((doc: any) => ({
              id: doc.id,
              filename: doc.originalName || doc.filename || "Unknown",
              originalName: doc.originalName || doc.filename || "Unknown", // Include both property names
              format: doc.originalFormat || doc.format || "unknown",
              originalFormat: doc.originalFormat || doc.format || "unknown", // Include both property names
              size: doc.size || 0,
              status:
                doc.status === "success"
                  ? "completed"
                  : doc.status === "error"
                    ? "failed"
                    : doc.status,
              uploadedAt: doc.uploadedAt
                ? new Date(doc.uploadedAt).getTime()
                : Date.now(),
              convertedAt: doc.convertedAt
                ? new Date(doc.convertedAt).getTime()
                : 0,
              duration: doc.duration,
              content: doc.content,
              metadata: doc.metadata,
              error: doc.error,
            }));
            return;
          }
        }

        // Fallback to mock implementation if API is disabled or fails
        createMockData();
      } catch (err: any) {
        error.value = err.message || "Failed to initialize document converter";
        console.error("Failed to initialize document converter:", err);
        // Fallback to mock data in case of error
        createMockData();
      } finally {
        isLoading.value = false;
      }
    };

    const uploadDocument = async (file: File): Promise<string> => {
      isLoading.value = true;
      error.value = null;

      try {
        // Check if we should use real API calls for DocumentConverter
        if (shouldUseRealApi("useRealDocumentConverterApi")) {
          // Real API implementation with progress tracking
          const onProgress = (progress: number) => {
            conversionProgress.value.percentage = progress;
            conversionProgress.value.currentStep = `Uploading file (${progress}%)`;
            conversionProgress.value.estimatedTimeRemaining = Math.round(
              (100 - progress) / 10,
            ); // Simple estimate
          };

          // Upload document using API
          const documentId = await documentConverterService.uploadDocument(
            file,
            onProgress,
          );

          // Add document to list with initial status
          const document: ConversionResult = {
            id: documentId,
            filename: file.name,
            format: file.name.split(".").pop() || "unknown",
            size: file.size,
            status: "processing",
            uploadedAt: Date.now(),
            convertedAt: 0,
          };

          documents.value.push(document);
          return documentId;
        }

        // Fallback to mock implementation if API is disabled
        const documentId = `doc${documents.value.length + 1}_${Date.now()}`;
        const document: ConversionResult = {
          id: documentId,
          filename: file.name,
          format: file.name.split(".").pop() || "unknown",
          size: file.size,
          status: "processing",
          uploadedAt: Date.now(),
          convertedAt: 0,
        };

        documents.value.push(document);
        return documentId;
      } catch (err: any) {
        error.value = err.message || "Failed to upload document";
        console.error("Failed to upload document:", err);
        throw err;
      } finally {
        isLoading.value = false;
      }
    };

    const convertDocument = async (
      id: string,
      settings?: Partial<ConversionSettings>,
    ): Promise<void> => {
      const document = documents.value.find((doc) => doc.id === id);
      if (!document) {
        throw new Error("Document not found");
      }

      document.status = "processing";

      // Update settings if provided
      if (settings) {
        conversionSettings.value = { ...conversionSettings.value, ...settings };
      }

      // Check if we should use real API calls for DocumentConverter
      if (shouldUseRealApi("useRealDocumentConverterApi")) {
        try {
          // Create progress handler
          const onProgress = (
            progress: number,
            step: string,
            timeRemaining: number,
          ) => {
            conversionProgress.value.percentage = progress;
            conversionProgress.value.currentStep = step;
            conversionProgress.value.estimatedTimeRemaining = timeRemaining;
          };

          // Start real conversion with API
          const result = await documentConverterService.convertDocument(
            id,
            settings,
            onProgress,
          );

          // Update document with result
          if (result) {
            document.status =
              result.status === "success"
                ? "completed"
                : result.status === "error"
                  ? "failed"
                  : "processing";
            document.convertedAt = result.convertedAt
              ? new Date(result.convertedAt).getTime()
              : Date.now();
            document.content = result.content;
            document.metadata = result.metadata;
            document.error = result.error;
          }

          return;
        } catch (err: any) {
          // Handle API errors
          document.status = "failed";
          document.error = err.message || "Conversion failed";
          throw err;
        }
      }

      // Fallback to mock implementation if API is disabled
      // Simulate conversion process
      return new Promise((resolve, reject) => {
        const totalSteps = 5;
        let currentStep = 0;

        const steps = [
          "Preparing document",
          "Extracting text",
          "Processing tables",
          "Applying formatting",
          "Finalizing conversion",
        ];

        const interval = setInterval(() => {
          currentStep++;
          conversionProgress.value.percentage = Math.round(
            (currentStep / totalSteps) * 100,
          );
          conversionProgress.value.currentStep = steps[currentStep - 1];
          conversionProgress.value.estimatedTimeRemaining =
            (totalSteps - currentStep) * 5; // 5 seconds per step

          if (currentStep === totalSteps) {
            clearInterval(interval);

            // 10% chance of failure for simulation
            if (Math.random() < 0.1) {
              document.status = "failed";
              document.error = "Conversion failed due to document complexity";
              reject(new Error("Conversion failed"));
            } else {
              document.status = "completed";
              document.convertedAt = Date.now();
              // Calculate duration
              document.duration = document.convertedAt - document.uploadedAt;
              document.content = "Converted content for " + document.filename;
              document.metadata = {
                author: "System",
                created: new Date().toISOString().split("T")[0],
                pages: Math.floor(Math.random() * 20) + 1,
              };
              resolve();
            }
          }
        }, 1000);
      });
    };

    const deleteDocument = async (id: string): Promise<void> => {
      isLoading.value = true;
      error.value = null;

      try {
        // Check if we should use real API calls for DocumentConverter
        if (shouldUseRealApi("useRealDocumentConverterApi")) {
          // Real API implementation
          await documentConverterService.deleteDocument(id);

          // Update local state after successful API call
          const index = documents.value.findIndex((doc) => doc.id === id);
          if (index !== -1) {
            documents.value.splice(index, 1);
          }

          if (selectedDocumentId.value === id) {
            selectedDocumentId.value = null;
          }
          return;
        }

        // Fallback to mock implementation if API is disabled
        const index = documents.value.findIndex((doc) => doc.id === id);
        if (index !== -1) {
          documents.value.splice(index, 1);
        }

        if (selectedDocumentId.value === id) {
          selectedDocumentId.value = null;
        }
      } catch (err: any) {
        error.value = err.message || "Failed to delete document";
        console.error("Failed to delete document:", err);
        throw err;
      } finally {
        isLoading.value = false;
      }
    };

    const cancelConversion = async (id: string): Promise<void> => {
      isLoading.value = true;
      error.value = null;

      try {
        // Check if we should use real API calls for DocumentConverter
        if (shouldUseRealApi("useRealDocumentConverterApi")) {
          // Real API implementation
          await documentConverterService.cancelConversion(id);

          // Update local state after successful API call
          const document = documents.value.find((doc) => doc.id === id);
          if (document && document.status === "processing") {
            document.status = "failed";
            document.error = "Conversion canceled by user";
          }
          return;
        }

        // Fallback to mock implementation if API is disabled
        const document = documents.value.find((doc) => doc.id === id);
        if (document && document.status === "processing") {
          document.status = "failed";
          document.error = "Conversion canceled by user";
        }
      } catch (err: any) {
        error.value = err.message || "Failed to cancel conversion";
        console.error("Failed to cancel conversion:", err);
        throw err;
      } finally {
        isLoading.value = false;
      }
    };

    const downloadDocument = async (id: string): Promise<void> => {
      isLoading.value = true;
      error.value = null;

      try {
        // First get the document info to get the filename
        const document = documents.value.find((doc) => doc.id === id);
        if (!document) {
          throw new Error("Document not found");
        }

        // Check if we should use real API calls for DocumentConverter
        if (shouldUseRealApi("useRealDocumentConverterApi")) {
          // Progress callback for download
          const onProgress = (progress: number) => {
            conversionProgress.value.percentage = progress;
            conversionProgress.value.currentStep = `Downloading file (${progress}%)`;
            conversionProgress.value.estimatedTimeRemaining = Math.round(
              (100 - progress) / 10,
            ); // Simple estimate
          };

          // Real API implementation
          const blob = await documentConverterService.downloadDocument(
            id,
            document.filename,
            onProgress,
          );

          // Create download link and trigger download
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = document.filename;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);
          return;
        }

        // Fallback to mock implementation - just show a console message
        console.log(`Downloading document: ${document?.filename}`);
      } catch (err: any) {
        error.value = err.message || "Failed to download document";
        console.error("Failed to download document:", err);
        throw err;
      } finally {
        isLoading.value = false;
      }
    };

    const selectDocument = (id: string | null) => {
      selectedDocumentId.value = id;
    };

    const setView = (view: "upload" | "conversion" | "results" | "list") => {
      currentView.value = view;
    };

    const refreshDocuments = async () => {
      await initialize();
    };

    // Admin-specific functionality
    const getDocumentStatistics = async (): Promise<DocumentStatistics> => {
      isLoading.value = true;
      error.value = null;

      try {
        // Check if we should use real API calls for DocumentConverter
        if (shouldUseRealApi("useRealDocumentConverterApi")) {
          // Real API implementation with admin specific service
          const response =
            await adminDocConverterService.getDocumentStatistics();

          if (response.success && response.data) {
            return response.data;
          } else {
            throw new Error(
              response.message || "Fehler beim Abrufen der Dokumentstatistiken",
            );
          }
        }

        // Fallback to mock implementation if API is disabled or fails for development purposes
        createMockData();

        // Calculate statistics based on mock data
        const completed = documents.value.filter(
          (doc) => doc.status === "completed",
        ).length;
        const failed = documents.value.filter(
          (doc) => doc.status === "failed",
        ).length;
        const processing = documents.value.filter(
          (doc) => doc.status === "processing",
        ).length;

        // Count by format
        const conversionsByFormat: Record<string, number> = {};
        documents.value.forEach((doc: any) => {
          if (!conversionsByFormat[doc.format]) {
            conversionsByFormat[doc.format] = 0;
          }
          conversionsByFormat[doc.format]++;
        });

        // Mock trend data (last 7 days)
        const conversionTrend = [12, 18, 15, 22, 30, 25, 28];

        return {
          totalConversions: completed + failed,
          conversionsPastWeek: conversionTrend.reduce(
            (sum, value) => sum + value,
            0,
          ),
          successRate: Math.round((completed / (completed + failed)) * 100),
          activeConversions: processing,
          conversionsByFormat,
          conversionTrend,
        };
      } catch (err: any) {
        error.value = err.message || "Failed to get document statistics";
        console.error("Failed to get document statistics:", err);
        throw err;
      } finally {
        isLoading.value = false;
      }
    };

    const getRecentConversions = async (): Promise<ConversionResult[]> => {
      isLoading.value = true;
      error.value = null;

      try {
        // Check if we should use real API calls for DocumentConverter
        if (shouldUseRealApi("useRealDocumentConverterApi")) {
          // Real API implementation with admin specific service
          const response =
            await adminDocConverterService.getRecentConversions();

          if (response.success && response.data) {
            return response.data;
          } else {
            throw new Error(
              response.message ||
                "Fehler beim Abrufen der letzten Konvertierungen",
            );
          }
        }

        // Fallback to mock implementation if API is disabled or fails for development purposes
        createMockData();

        // Sort by uploadedAt (descending)
        return [...documents.value].sort((a, b) => b.uploadedAt - a.uploadedAt);
      } catch (err: any) {
        error.value = err.message || "Failed to get recent conversions";
        console.error("Failed to get recent conversions:", err);
        throw err;
      } finally {
        isLoading.value = false;
      }
    };

    const getConversionQueue = async (): Promise<QueueInfo> => {
      isLoading.value = true;
      error.value = null;

      try {
        // Check if we should use real API calls for DocumentConverter
        if (shouldUseRealApi("useRealDocumentConverterApi")) {
          // Real API implementation with admin specific service
          const response = await adminDocConverterService.getConversionQueue();

          if (response.success && response.data) {
            return response.data;
          } else {
            throw new Error(
              response.message ||
                "Fehler beim Abrufen der Konversionswarteschlange",
            );
          }
        }

        // Fallback to mock implementation if API is disabled or fails for development purposes
        const mockQueue = [
          {
            id: "job1",
            filename: "Quarterly Report.pdf",
            userId: "user123",
            status: "processing",
            submittedAt: Date.now() - 10 * 60 * 1000, // 10 minutes ago
            progress: 75,
          },
          {
            id: "job2",
            filename: "Employee Handbook.docx",
            userId: "user456",
            status: "waiting",
            submittedAt: Date.now() - 25 * 60 * 1000, // 25 minutes ago
          },
          {
            id: "job3",
            filename: "Sales Data.xlsx",
            userId: "user789",
            status: "waiting",
            submittedAt: Date.now() - 35 * 60 * 1000, // 35 minutes ago
          },
        ];

        return {
          queue: mockQueue,
          stats: {
            activeJobs: 1,
            waitingJobs: 2,
            averageTime: 45, // 45 seconds
          },
          paused: false,
        };
      } catch (err: any) {
        error.value = err.message || "Failed to get conversion queue";
        console.error("Failed to get conversion queue:", err);
        throw err;
      } finally {
        isLoading.value = false;
      }
    };

    const getConverterSettings = async (): Promise<ConverterSettings> => {
      isLoading.value = true;
      error.value = null;

      try {
        // Check if we should use real API calls for DocumentConverter
        if (shouldUseRealApi("useRealDocumentConverterApi")) {
          // Real API implementation with admin specific service
          const response =
            await adminDocConverterService.getConverterSettings();

          if (response.success && response.data) {
            return response.data;
          } else {
            throw new Error(
              response.message ||
                "Fehler beim Abrufen der Konvertereinstellungen",
            );
          }
        }

        // Fallback to mock implementation if API is disabled or fails
        return {
          maxFileSize: 100, // MB
          defaultFormat: "pdf",
          enableThumbnails: true,
          enableOCR: false,
          ocrLanguage: "en",
          enhancedOCR: false,
          storageLimit: 10, // GB
          retentionPeriod: 30, // days
        };
      } catch (err: any) {
        error.value = err.message || "Failed to get converter settings";
        console.error("Failed to get converter settings:", err);
        throw err;
      } finally {
        isLoading.value = false;
      }
    };

    const updateConverterSettings = async (
      settings: ConverterSettings,
    ): Promise<void> => {
      isLoading.value = true;
      error.value = null;

      try {
        // Check if we should use real API calls for DocumentConverter
        if (shouldUseRealApi("useRealDocumentConverterApi")) {
          // Real API implementation with admin specific service
          const response =
            await adminDocConverterService.updateConverterSettings(settings);

          if (!response.success) {
            throw new Error(
              response.message ||
                "Fehler beim Aktualisieren der Konvertereinstellungen",
            );
          }

          return;
        }

        // Fallback to mock implementation if API is disabled or fails
        console.log("Updating converter settings:", settings);
        return Promise.resolve();
      } catch (err: any) {
        error.value = err.message || "Failed to update converter settings";
        console.error("Failed to update converter settings:", err);
        throw err;
      } finally {
        isLoading.value = false;
      }
    };

    const prioritizeJob = async (id: string): Promise<void> => {
      isLoading.value = true;
      error.value = null;

      try {
        // Check if we should use real API calls for DocumentConverter
        if (shouldUseRealApi("useRealDocumentConverterApi")) {
          // Call the admin service method
          const response = await adminDocConverterService.prioritizeJob(id);

          if (!response.success) {
            throw new Error(
              response.message || `Fehler beim Priorisieren des Jobs ${id}`,
            );
          }

          return;
        }

        // Mock implementation
        console.log("Prioritizing job:", id);
        return Promise.resolve();
      } catch (err: any) {
        error.value = err.message || "Failed to prioritize job";
        console.error("Failed to prioritize job:", err);
        throw err;
      } finally {
        isLoading.value = false;
      }
    };

    const cancelJob = async (id: string): Promise<void> => {
      isLoading.value = true;
      error.value = null;

      try {
        // Check if we should use real API calls for DocumentConverter
        if (shouldUseRealApi("useRealDocumentConverterApi")) {
          // Call the admin service method
          const response = await adminDocConverterService.cancelJob(id);

          if (!response.success) {
            throw new Error(
              response.message || `Fehler beim Abbrechen des Jobs ${id}`,
            );
          }

          return;
        }

        // Mock implementation
        console.log("Canceling job:", id);
        return Promise.resolve();
      } catch (err: any) {
        error.value = err.message || "Failed to cancel job";
        console.error("Failed to cancel job:", err);
        throw err;
      } finally {
        isLoading.value = false;
      }
    };

    const pauseQueue = async (): Promise<void> => {
      isLoading.value = true;
      error.value = null;

      try {
        // Check if we should use real API calls for DocumentConverter
        if (shouldUseRealApi("useRealDocumentConverterApi")) {
          // Call the admin service method
          const response = await adminDocConverterService.pauseQueue();

          if (!response.success) {
            throw new Error(
              response.message || "Fehler beim Pausieren der Warteschlange",
            );
          }

          return;
        }

        // Mock implementation
        console.log("Pausing conversion queue");
        return Promise.resolve();
      } catch (err: any) {
        error.value = err.message || "Failed to pause queue";
        console.error("Failed to pause queue:", err);
        throw err;
      } finally {
        isLoading.value = false;
      }
    };

    const resumeQueue = async (): Promise<void> => {
      isLoading.value = true;
      error.value = null;

      try {
        // Check if we should use real API calls for DocumentConverter
        if (shouldUseRealApi("useRealDocumentConverterApi")) {
          // Call the admin service method
          const response = await adminDocConverterService.resumeQueue();

          if (!response.success) {
            throw new Error(
              response.message || "Fehler beim Fortsetzen der Warteschlange",
            );
          }

          return;
        }

        // Mock implementation
        console.log("Resuming conversion queue");
        return Promise.resolve();
      } catch (err: any) {
        error.value = err.message || "Failed to resume queue";
        console.error("Failed to resume queue:", err);
        throw err;
      } finally {
        isLoading.value = false;
      }
    };

    const clearQueue = async (): Promise<void> => {
      isLoading.value = true;
      error.value = null;

      try {
        // Check if we should use real API calls for DocumentConverter
        if (shouldUseRealApi("useRealDocumentConverterApi")) {
          // Call the admin service method
          const response = await adminDocConverterService.clearQueue();

          if (!response.success) {
            throw new Error(
              response.message || "Fehler beim Leeren der Warteschlange",
            );
          }

          return;
        }

        // Mock implementation
        console.log("Clearing conversion queue");
        return Promise.resolve();
      } catch (err: any) {
        error.value = err.message || "Failed to clear queue";
        console.error("Failed to clear queue:", err);
        throw err;
      } finally {
        isLoading.value = false;
      }
    };

    // Reset state function for store interactions
    const resetState = () => {
      documents.value = [];
      selectedDocumentId.value = null;
      currentView.value = "upload";
      isLoading.value = false;
      error.value = null;
      conversionProgress.value = {
        percentage: 0,
        currentStep: "",
        estimatedTimeRemaining: 0,
      };
      conversionSettings.value = {
        preserveFormatting: true,
        extractMetadata: true,
        extractTables: true,
        ocrEnabled: false,
        ocrLanguage: "en",
      };
    };

    // Mock action for completeness
    const checkStatus = async () => {
      console.log("Checking document converter status");
      return true;
    };

    return {
      // State
      documents,
      selectedDocumentId,
      currentView,
      isLoading,
      error,
      conversionProgress,
      conversionSettings,

      // Getters
      getDocumentById,
      selectedDocument,
      documentsByFormat,
      documentsByStatus,

      // Actions
      initialize,
      uploadDocument,
      convertDocument,
      deleteDocument,
      cancelConversion,
      downloadDocument,
      selectDocument,
      setView,
      refreshDocuments,
      resetState,
      checkStatus,

      // Admin-specific functionality
      getDocumentStatistics,
      getRecentConversions,
      getConversionQueue,
      getConverterSettings,
      updateConverterSettings,
      prioritizeJob,
      cancelJob,
      pauseQueue,
      resumeQueue,
      clearQueue,
    };
  },
);
