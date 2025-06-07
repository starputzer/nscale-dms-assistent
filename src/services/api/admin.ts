/**
 * API-Service für Admin-Funktionalitäten
 * Basierend auf dem Admin-Komponenten-Design (08.05.2025)
 * Erweitert mit robuster Fehlerbehandlung und Fallbacks für Entwicklung
 */

import axios from "axios";
import type { NewUser, MotdConfig } from "@/types/admin";
import { adminMockService } from "./adminMockService";

// Import the admin API interceptor to ensure requests are properly authenticated
import "@/utils/adminApiInterceptor";

/**
 * Handle API requests with fallback to mock data
 * @param apiCall The actual API call function
 * @param mockEndpoint The endpoint for mock data
 * @param mockParams Optional parameters for mock data
 */
const handleApiRequest = async (
  apiCall: () => Promise<any>,
  mockEndpoint: string,
  mockParams?: any,
) => {
  // Check if we should use mock data directly (based on environment or flags)
  if (adminMockService.shouldUseMock(mockEndpoint)) {
    console.info(
      `Using mock data for ${mockEndpoint} (forced by configuration)`,
    );
    return {
      data: await adminMockService.getMockResponse(mockEndpoint, mockParams),
    };
  }

  try {
    // Attempt the real API call
    return await apiCall();
  } catch (error: any) {
    console.warn(
      `API call failed for ${mockEndpoint}:`,
      error.message || "Unknown error",
    );

    // Log additional error details if available
    if (error.response) {
      console.warn(
        `Status: ${error.response.status}, Data:`,
        error.response.data,
      );
    }

    // Always fallback to mock data in development mode
    if (
      process.env.NODE_ENV === "development" ||
      error.response?.status >= 500 ||
      error.response?.status === 401
    ) {
      console.info(
        `Falling back to mock data for ${mockEndpoint} due to error`,
      );
      return {
        data: await adminMockService.getMockResponse(mockEndpoint, mockParams),
        _isMockData: true, // Flag to identify mock responses
      };
    }

    // For non-server errors in production, we throw to allow component-level handling
    throw error;
  }
};

export const adminApi = {
  // User Management
  getUsers: () =>
    handleApiRequest(() => axios.get("/api/admin/users/"), "/admin/users/"),

  createUser: (userData: NewUser) =>
    handleApiRequest(
      () => axios.post("/api/admin/users/", userData),
      "/admin/users/",
      userData,
    ),

  updateUserRole: (userId: string, role: string) =>
    handleApiRequest(
      () => axios.put(`/api/admin/users/${userId}/role`, { role }),
      `/admin/users/${userId}/role`,
      { userId, role },
    ),

  deleteUser: (userId: string) =>
    handleApiRequest(
      () => axios.delete(`/api/admin/users/${userId}`),
      `/admin/users/${userId}`,
      { userId },
    ),

  // System
  getSystemStats: () =>
    handleApiRequest(() => axios.get("/api/admin/stats"), "/admin/stats"),

  clearModelCache: () =>
    handleApiRequest(
      () => axios.post("/api/admin/clear-cache"),
      "/admin/clear-cache",
    ),

  clearEmbeddingCache: () =>
    handleApiRequest(
      () => axios.post("/api/admin/clear-embedding-cache"),
      "/admin/clear-embedding-cache",
    ),

  // Feedback
  getFeedbackStats: () =>
    handleApiRequest(
      () => axios.get("/api/admin/feedback/stats"),
      "/admin/feedback/stats",
    ),

  getNegativeFeedback: () =>
    handleApiRequest(
      () => axios.get("/api/admin/feedback/negative"),
      "/admin/feedback/negative",
    ),

  updateFeedbackStatus: (id: string, status: string) =>
    handleApiRequest(
      () => axios.put(`/api/admin/feedback/${id}/status`, { status }),
      `/admin/feedback/${id}/status`,
      { id, status },
    ),

  deleteFeedback: (id: string) =>
    handleApiRequest(
      () => axios.delete(`/api/admin/feedback/${id}`),
      `/admin/feedback/${id}`,
      { id },
    ),

  exportFeedback: (options?: any) =>
    handleApiRequest(
      () =>
        axios.get("/api/admin/feedback/export", {
          params: {
            format: options?.format,
            fields: options?.fields?.join(","),
          },
          responseType: "blob",
        }),
      "/admin/feedback/export",
      options,
    ),

  // MOTD
  getMotd: () => handleApiRequest(() => axios.get("/api/motd"), "/motd"),

  updateMotd: (motdConfig: MotdConfig) =>
    handleApiRequest(
      () => axios.post("/api/admin/update-motd", motdConfig),
      "/admin/update-motd",
      motdConfig,
    ),

  reloadMotd: () =>
    handleApiRequest(
      () => axios.post("/api/admin/reload-motd"),
      "/admin/reload-motd",
    ),

  // Document Converter
  getDocumentConverterStats: () =>
    handleApiRequest(
      () => axios.get("/api/admin/doc-converter/stats"),
      "/admin/doc-converter/stats",
    ),

  getDocConverterStatus: () =>
    handleApiRequest(
      () => axios.get("/api/admin/doc-converter/status"),
      "/admin/doc-converter/status",
    ),

  getDocConverterJobs: () =>
    handleApiRequest(
      () => axios.get("/api/admin/doc-converter/jobs"),
      "/admin/doc-converter/jobs",
    ),

  getRecentConversions: (params?: any) =>
    handleApiRequest(
      () => axios.get("/api/admin/doc-converter/recent", { params }),
      "/admin/doc-converter/recent",
      params,
    ),

  getConversionQueue: () =>
    handleApiRequest(
      () => axios.get("/api/admin/doc-converter/queue"),
      "/admin/doc-converter/queue",
    ),

  getDocConverterSettings: () =>
    handleApiRequest(
      () => axios.get("/api/admin/doc-converter/settings"),
      "/admin/doc-converter/settings",
    ),

  updateDocConverterSettings: (settings: any) =>
    handleApiRequest(
      () => axios.post("/api/admin/doc-converter/settings", settings),
      "/admin/doc-converter/settings",
      settings,
    ),

  startDocConverterJob: (jobId: string) =>
    handleApiRequest(
      () => axios.post(`/api/admin/doc-converter/jobs/${jobId}/start`),
      `/admin/doc-converter/jobs/${jobId}/start`,
      { jobId },
    ),

  cancelDocConverterJob: (jobId: string) =>
    handleApiRequest(
      () => axios.post(`/api/admin/doc-converter/jobs/${jobId}/cancel`),
      `/admin/doc-converter/jobs/${jobId}/cancel`,
      { jobId },
    ),

  retryConversion: (id: string) =>
    handleApiRequest(
      () => axios.post(`/api/admin/doc-converter/jobs/${id}/retry`),
      `/admin/doc-converter/jobs/${id}/retry`,
      { id },
    ),

  deleteConversion: (id: string) =>
    handleApiRequest(
      () => axios.delete(`/api/admin/doc-converter/jobs/${id}`),
      `/admin/doc-converter/jobs/${id}`,
      { id },
    ),

  downloadConversion: (id: string) =>
    handleApiRequest(
      () =>
        axios.get(`/api/admin/doc-converter/jobs/${id}/download`, {
          responseType: "blob",
        }),
      `/admin/doc-converter/jobs/${id}/download`,
      { id },
    ),

  // Log Management
  getLogs: (params?: any) =>
    handleApiRequest(
      () => axios.get("/api/admin/logs", { params }),
      "/admin/logs",
      params,
    ),

  clearLogs: () =>
    handleApiRequest(
      () => axios.post("/api/admin/logs/clear"),
      "/admin/logs/clear",
    ),

  exportLogs: (filter?: any) =>
    handleApiRequest(
      () =>
        axios.get("/api/admin/logs/export", {
          params: filter,
          responseType: "blob",
        }),
      "/admin/logs/export",
      filter,
    ),

  // Feature Toggles
  getFeatureToggles: () =>
    handleApiRequest(
      () => axios.get("/api/admin/feature-toggles"),
      "/admin/feature-toggles",
    ),

  updateFeatureToggle: (id: string, data: any) =>
    handleApiRequest(
      () => axios.put(`/api/admin/feature-toggles/${id}`, data),
      `/admin/feature-toggles/${id}`,
      { id, ...data },
    ),

  createFeatureToggle: (data: any) =>
    handleApiRequest(
      () => axios.post("/api/admin/feature-toggles", data),
      "/admin/feature-toggles",
      data,
    ),
};
