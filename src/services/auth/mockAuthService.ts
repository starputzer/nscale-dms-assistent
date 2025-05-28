/**
 * Mock Authentication Service
 *
 * Provides development-mode authentication that bypasses actual API calls
 * and always returns successful authentication with admin privileges.
 */

import { LogService } from "../log/LogService";
import type { User } from "@/types/auth";

// Create a logger instance
const logger = new LogService("MockAuthService");

// Default mock admin user
const MOCK_ADMIN_USER: User = {
  id: "mock-admin-1",
  email: "admin@example.local",
  username: "admin",
  role: "admin",
  roles: ["admin"],
  created_at: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
  last_login: Date.now(),
};

// Mock JWT token that will always be treated as valid in development mode
// This is a real format but with mock data - DO NOT use in production!
const MOCK_ADMIN_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoibW9jay1hZG1pbi0xIiwiZW1haWwiOiJhZG1pbkBleGFtcGxlLmxvY2FsIiwicm9sZSI6ImFkbWluIiwicm9sZXMiOlsiYWRtaW4iXSwiaWF0IjoxNjE2MTYyMjgwLCJleHAiOjk5OTk5OTk5OTl9.mock-signature-for-development-only";

/**
 * Mock authentication service for development environments
 */
export const mockAuthService = {
  /**
   * Check if mock authentication should be used
   * @returns True if mock auth should be used
   */
  shouldUseMockAuth(): boolean {
    // Always use mock auth in development mode
    const isDev = process.env.NODE_ENV === "development";

    // Check for explicit override in localStorage
    const forceMockAuth = localStorage.getItem("force_mock_auth") === "true";
    const disableMockAuth =
      localStorage.getItem("disable_mock_auth") === "true";

    return (isDev || forceMockAuth) && !disableMockAuth;
  },

  /**
   * Get mock authentication token
   * @returns The mock JWT token
   */
  getMockToken(): string {
    return MOCK_ADMIN_TOKEN;
  },

  /**
   * Get mock user object
   * @returns The mock admin user
   */
  getMockUser(): User {
    return { ...MOCK_ADMIN_USER };
  },

  /**
   * Initialize mock authentication
   * Sets up the required localStorage items for mock authentication
   */
  initMockAuth(): void {
    if (!this.shouldUseMockAuth()) {
      logger.debug("Mock auth is disabled, not initializing");
      return;
    }

    logger.info("Initializing mock authentication for development");

    // Store the mock token for API calls
    localStorage.setItem("nscale_access_token", MOCK_ADMIN_TOKEN);
    localStorage.setItem("nscale_refresh_token", MOCK_ADMIN_TOKEN);

    // Set mock flag to use mock API responses
    localStorage.setItem("use_mock_api", "true");

    logger.info("Mock authentication initialized successfully");
  },

  /**
   * Clear mock authentication data
   */
  clearMockAuth(): void {
    localStorage.removeItem("nscale_access_token");
    localStorage.removeItem("nscale_refresh_token");
    localStorage.removeItem("use_mock_api");
    logger.info("Mock authentication data cleared");
  },

  /**
   * Toggle mock authentication on/off
   * @param enable Whether to enable or disable mock auth
   */
  toggleMockAuth(enable: boolean): void {
    if (enable) {
      localStorage.setItem("force_mock_auth", "true");
      localStorage.removeItem("disable_mock_auth");
      this.initMockAuth();
      logger.info("Mock authentication enabled");
    } else {
      localStorage.setItem("disable_mock_auth", "true");
      localStorage.removeItem("force_mock_auth");
      this.clearMockAuth();
      logger.info("Mock authentication disabled");
    }
  },
};

export default mockAuthService;
