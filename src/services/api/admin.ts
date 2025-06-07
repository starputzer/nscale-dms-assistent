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
<<<<<<< HEAD
    handleApiRequest(() => axios.get("/api/admin/users/"), "/admin/users/"),

  createUser: (userData: NewUser) =>
    handleApiRequest(
      () => axios.post("/api/admin/users/", userData),
      "/admin/users/",
=======
    handleApiRequest(() => axios.get("/admin/users"), "/admin/users"),

  createUser: (userData: NewUser) =>
    handleApiRequest(
      () => axios.post("/admin/users", userData),
      "/admin/users",
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
      userData,
    ),

  updateUserRole: (userId: string, role: string) =>
    handleApiRequest(
<<<<<<< HEAD
      () => axios.put(`/api/admin/users/${userId}/role`, { role }),
=======
      () => axios.put(`/admin/users/${userId}/role`, { role }),
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
      `/admin/users/${userId}/role`,
      { userId, role },
    ),

  deleteUser: (userId: string) =>
    handleApiRequest(
<<<<<<< HEAD
      () => axios.delete(`/api/admin/users/${userId}`),
=======
      () => axios.delete(`/admin/users/${userId}`),
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
      `/admin/users/${userId}`,
      { userId },
    ),

  // System
  getSystemStats: () =>
<<<<<<< HEAD
    handleApiRequest(() => axios.get("/api/admin/stats"), "/admin/stats"),

  clearModelCache: () =>
    handleApiRequest(
      () => axios.post("/api/admin/clear-cache"),
=======
    handleApiRequest(() => axios.get("/admin/stats"), "/admin/stats"),

  clearModelCache: () =>
    handleApiRequest(
      () => axios.post("/admin/clear-cache"),
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
      "/admin/clear-cache",
    ),

  clearEmbeddingCache: () =>
    handleApiRequest(
<<<<<<< HEAD
      () => axios.post("/api/admin/clear-embedding-cache"),
=======
      () => axios.post("/admin/clear-embedding-cache"),
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
      "/admin/clear-embedding-cache",
    ),

  // Feedback
  getFeedbackStats: () =>
    handleApiRequest(
<<<<<<< HEAD
      () => axios.get("/api/admin/feedback/stats"),
=======
      () => axios.get("/admin/feedback/stats"),
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
      "/admin/feedback/stats",
    ),

  getNegativeFeedback: () =>
    handleApiRequest(
<<<<<<< HEAD
      () => axios.get("/api/admin/feedback/negative"),
=======
      () => axios.get("/admin/feedback/negative"),
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
      "/admin/feedback/negative",
    ),

  updateFeedbackStatus: (id: string, status: string) =>
    handleApiRequest(
<<<<<<< HEAD
      () => axios.put(`/api/admin/feedback/${id}/status`, { status }),
=======
      () => axios.put(`/admin/feedback/${id}/status`, { status }),
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
      `/admin/feedback/${id}/status`,
      { id, status },
    ),

  deleteFeedback: (id: string) =>
    handleApiRequest(
<<<<<<< HEAD
      () => axios.delete(`/api/admin/feedback/${id}`),
=======
      () => axios.delete(`/admin/feedback/${id}`),
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
      `/admin/feedback/${id}`,
      { id },
    ),

  exportFeedback: (options?: any) =>
    handleApiRequest(
      () =>
<<<<<<< HEAD
        axios.get("/api/admin/feedback/export", {
=======
        axios.get("/admin/feedback/export", {
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
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
<<<<<<< HEAD
  getMotd: () => handleApiRequest(() => axios.get("/api/motd"), "/motd"),

  updateMotd: (motdConfig: MotdConfig) =>
    handleApiRequest(
      () => axios.post("/api/admin/update-motd", motdConfig),
=======
  getMotd: () => handleApiRequest(() => axios.get("/api/motd"), "/api/motd"),

  updateMotd: (motdConfig: MotdConfig) =>
    handleApiRequest(
      () => axios.post("/admin/update-motd", motdConfig),
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
      "/admin/update-motd",
      motdConfig,
    ),

  reloadMotd: () =>
    handleApiRequest(
<<<<<<< HEAD
      () => axios.post("/api/admin/reload-motd"),
=======
      () => axios.post("/admin/reload-motd"),
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
      "/admin/reload-motd",
    ),

  // Document Converter
  getDocumentConverterStats: () =>
    handleApiRequest(
<<<<<<< HEAD
      () => axios.get("/api/admin/doc-converter/stats"),
=======
      () => axios.get("/admin/doc-converter/stats"),
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
      "/admin/doc-converter/stats",
    ),

  getDocConverterStatus: () =>
    handleApiRequest(
<<<<<<< HEAD
      () => axios.get("/api/admin/doc-converter/status"),
=======
      () => axios.get("/admin/doc-converter/status"),
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
      "/admin/doc-converter/status",
    ),

  getDocConverterJobs: () =>
    handleApiRequest(
<<<<<<< HEAD
      () => axios.get("/api/admin/doc-converter/jobs"),
=======
      () => axios.get("/admin/doc-converter/jobs"),
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
      "/admin/doc-converter/jobs",
    ),

  getRecentConversions: (params?: any) =>
    handleApiRequest(
<<<<<<< HEAD
      () => axios.get("/api/admin/doc-converter/recent", { params }),
=======
      () => axios.get("/admin/doc-converter/recent", { params }),
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
      "/admin/doc-converter/recent",
      params,
    ),

  getConversionQueue: () =>
    handleApiRequest(
<<<<<<< HEAD
      () => axios.get("/api/admin/doc-converter/queue"),
=======
      () => axios.get("/admin/doc-converter/queue"),
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
      "/admin/doc-converter/queue",
    ),

  getDocConverterSettings: () =>
    handleApiRequest(
<<<<<<< HEAD
      () => axios.get("/api/admin/doc-converter/settings"),
=======
      () => axios.get("/admin/doc-converter/settings"),
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
      "/admin/doc-converter/settings",
    ),

  updateDocConverterSettings: (settings: any) =>
    handleApiRequest(
<<<<<<< HEAD
      () => axios.post("/api/admin/doc-converter/settings", settings),
=======
      () => axios.post("/admin/doc-converter/settings", settings),
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
      "/admin/doc-converter/settings",
      settings,
    ),

  startDocConverterJob: (jobId: string) =>
    handleApiRequest(
<<<<<<< HEAD
      () => axios.post(`/api/admin/doc-converter/jobs/${jobId}/start`),
=======
      () => axios.post(`/admin/doc-converter/jobs/${jobId}/start`),
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
      `/admin/doc-converter/jobs/${jobId}/start`,
      { jobId },
    ),

  cancelDocConverterJob: (jobId: string) =>
    handleApiRequest(
<<<<<<< HEAD
      () => axios.post(`/api/admin/doc-converter/jobs/${jobId}/cancel`),
=======
      () => axios.post(`/admin/doc-converter/jobs/${jobId}/cancel`),
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
      `/admin/doc-converter/jobs/${jobId}/cancel`,
      { jobId },
    ),

  retryConversion: (id: string) =>
    handleApiRequest(
<<<<<<< HEAD
      () => axios.post(`/api/admin/doc-converter/jobs/${id}/retry`),
=======
      () => axios.post(`/admin/doc-converter/jobs/${id}/retry`),
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
      `/admin/doc-converter/jobs/${id}/retry`,
      { id },
    ),

  deleteConversion: (id: string) =>
    handleApiRequest(
<<<<<<< HEAD
      () => axios.delete(`/api/admin/doc-converter/jobs/${id}`),
=======
      () => axios.delete(`/admin/doc-converter/jobs/${id}`),
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
      `/admin/doc-converter/jobs/${id}`,
      { id },
    ),

  downloadConversion: (id: string) =>
    handleApiRequest(
      () =>
<<<<<<< HEAD
        axios.get(`/api/admin/doc-converter/jobs/${id}/download`, {
=======
        axios.get(`/admin/doc-converter/jobs/${id}/download`, {
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
          responseType: "blob",
        }),
      `/admin/doc-converter/jobs/${id}/download`,
      { id },
    ),

  // Log Management
  getLogs: (params?: any) =>
    handleApiRequest(
<<<<<<< HEAD
      () => axios.get("/api/admin/logs", { params }),
=======
      () => axios.get("/admin/logs", { params }),
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
      "/admin/logs",
      params,
    ),

  clearLogs: () =>
    handleApiRequest(
<<<<<<< HEAD
      () => axios.post("/api/admin/logs/clear"),
=======
      () => axios.post("/admin/logs/clear"),
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
      "/admin/logs/clear",
    ),

  exportLogs: (filter?: any) =>
    handleApiRequest(
      () =>
<<<<<<< HEAD
        axios.get("/api/admin/logs/export", {
=======
        axios.get("/admin/logs/export", {
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
          params: filter,
          responseType: "blob",
        }),
      "/admin/logs/export",
      filter,
    ),

  // Feature Toggles
  getFeatureToggles: () =>
    handleApiRequest(
<<<<<<< HEAD
      () => axios.get("/api/admin/feature-toggles"),
=======
      () => axios.get("/admin/feature-toggles"),
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
      "/admin/feature-toggles",
    ),

  updateFeatureToggle: (id: string, data: any) =>
    handleApiRequest(
<<<<<<< HEAD
      () => axios.put(`/api/admin/feature-toggles/${id}`, data),
=======
      () => axios.put(`/admin/feature-toggles/${id}`, data),
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
      `/admin/feature-toggles/${id}`,
      { id, ...data },
    ),

  createFeatureToggle: (data: any) =>
    handleApiRequest(
<<<<<<< HEAD
      () => axios.post("/api/admin/feature-toggles", data),
=======
      () => axios.post("/admin/feature-toggles", data),
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
      "/admin/feature-toggles",
      data,
    ),
};
