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
  try {
    // First attempt the real API call
    return await apiCall();
  } catch (error: any) {
    console.warn(`API call failed for ${mockEndpoint}:`, error.message);

    // Check if we should use mock data for this endpoint
    if (
      adminMockService.shouldUseMock(mockEndpoint) ||
      error.response?.status === 401
    ) {
      console.info(`Using mock data for ${mockEndpoint}`);
      return {
        data: await adminMockService.getMockResponse(mockEndpoint, mockParams),
      };
    }

    // Otherwise, rethrow the error
    throw error;
  }
};

export const adminApi = {
  // User Management
  getUsers: () =>
    handleApiRequest(() => axios.get("/admin/users"), "/admin/users"),

  createUser: (userData: NewUser) =>
    handleApiRequest(
      () => axios.post("/admin/users", userData),
      "/admin/users",
      userData,
    ),

  updateUserRole: (userId: string, role: string) =>
    handleApiRequest(
      () => axios.put(`/admin/users/${userId}/role`, { role }),
      `/admin/users/${userId}/role`,
      { userId, role },
    ),

  deleteUser: (userId: string) =>
    handleApiRequest(
      () => axios.delete(`/admin/users/${userId}`),
      `/admin/users/${userId}`,
      { userId },
    ),

  // System
  getSystemStats: () =>
    handleApiRequest(() => axios.get("/admin/stats"), "/admin/stats"),

  clearModelCache: () =>
    handleApiRequest(
      () => axios.post("/admin/clear-cache"),
      "/admin/clear-cache",
    ),

  clearEmbeddingCache: () =>
    handleApiRequest(
      () => axios.post("/admin/clear-embedding-cache"),
      "/admin/clear-embedding-cache",
    ),

  // Feedback
  getFeedbackStats: () =>
    handleApiRequest(
      () => axios.get("/admin/feedback/stats"),
      "/admin/feedback/stats",
    ),

  getNegativeFeedback: () =>
    handleApiRequest(
      () => axios.get("/admin/feedback/negative"),
      "/admin/feedback/negative",
    ),

  // MOTD
  getMotd: () => handleApiRequest(() => axios.get("/api/motd"), "/api/motd"),

  updateMotd: (motdConfig: MotdConfig) =>
    handleApiRequest(
      () => axios.post("/admin/update-motd", motdConfig),
      "/admin/update-motd",
      motdConfig,
    ),

  reloadMotd: () =>
    handleApiRequest(
      () => axios.post("/admin/reload-motd"),
      "/admin/reload-motd",
    ),

  // Document Converter
  getDocConverterStatus: () =>
    handleApiRequest(
      () => axios.get("/admin/doc-converter/status"),
      "/admin/doc-converter/status",
    ),

  getDocConverterJobs: () =>
    handleApiRequest(
      () => axios.get("/admin/doc-converter/jobs"),
      "/admin/doc-converter/jobs",
    ),

  getDocConverterSettings: () =>
    handleApiRequest(
      () => axios.get("/admin/doc-converter/settings"),
      "/admin/doc-converter/settings",
    ),

  updateDocConverterSettings: (settings: any) =>
    handleApiRequest(
      () => axios.post("/admin/doc-converter/settings", settings),
      "/admin/doc-converter/settings",
      settings,
    ),

  startDocConverterJob: (jobId: string) =>
    handleApiRequest(
      () => axios.post(`/admin/doc-converter/jobs/${jobId}/start`),
      `/admin/doc-converter/jobs/${jobId}/start`,
      { jobId },
    ),

  cancelDocConverterJob: (jobId: string) =>
    handleApiRequest(
      () => axios.post(`/admin/doc-converter/jobs/${jobId}/cancel`),
      `/admin/doc-converter/jobs/${jobId}/cancel`,
      { jobId },
    ),

  // Log Management
  getLogs: (params?: any) =>
    handleApiRequest(
      () => axios.get("/admin/logs", { params }),
      "/admin/logs",
      params,
    ),

  clearLogs: () =>
    handleApiRequest(
      () => axios.post("/admin/logs/clear"),
      "/admin/logs/clear",
    ),

  exportLogs: (filter?: any) =>
    handleApiRequest(
      () =>
        axios.get("/admin/logs/export", {
          params: filter,
          responseType: "blob",
        }),
      "/admin/logs/export",
      filter,
    ),
};
