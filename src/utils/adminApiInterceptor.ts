/**
 * Admin API Interceptor
 *
 * This utility sets up Axios interceptors for admin-related
 * API requests to ensure they have the proper authorization headers.
 */

import axios from "axios";
import { LogService } from "../services/log/LogService";
import { authTokenManager } from "../services/auth/AuthTokenManager";

// Create a logger instance
const logger = new LogService("AdminApiInterceptor");

/**
 * Sets up interceptors to properly format admin API requests
 * and add the required authorization headers
 */
export function setupAdminApiInterceptors(): void {
  logger.info("Setting up admin API request interceptors");

  // Request interceptor for all admin-related requests
  const interceptorId = axios.interceptors.request.use(
    (config: any) => {
      // Check if this is an admin API request (with or without /api prefix)
      if (
        config.url?.includes("/admin/") ||
        config.url?.includes("/api/admin/")
      ) {
        logger.debug("Admin API request detected:", config.url);

        // Check for development mode and mock auth
        const isDev = process.env.NODE_ENV === "development";
        const useMockApi = localStorage.getItem("use_mock_api") === "true";
        const forceMockAuth =
          localStorage.getItem("force_mock_auth") === "true";

        // Add debug flag for mock API detection
        if (isDev || useMockApi || forceMockAuth) {
          logger.debug(
            "Development mode or mock API detected for admin request",
          );

          // In the case of development + mock auth, we will let the request through
          // but the adminMockService will intercept the response if needed

          // Note: In some cases we might want to prevent the actual request from being sent at all
          // and directly return mock data, but for now we'll use the response interceptor approach
        }

        // Get the token from localStorage
        const token =
          localStorage.getItem("nscale_access_token") ||
          // Fallback to AuthTokenManager
<<<<<<< HEAD
          (authTokenManager as any).getAccessToken();
=======
          authTokenManager.getAccessToken();
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da

        if (token) {
          // Set the Authorization header
          if (!config.headers) {
            config.headers = {};
          }
          config.headers["Authorization"] = `Bearer ${token}`;
          logger.debug("Authorization header added to admin API request");
        } else {
          logger.warn("No token available for admin API request");
        }

        // Ensure Content-Type header is set for POST/PUT requests
        if (["post", "put", "patch"].includes(config.method || "")) {
          if (config.headers) {
            config.headers["Content-Type"] = "application/json";
          }
        }
      }

      return config;
    },
    (error: any) => {
      logger.error("Axios admin request interceptor error:", error);
      return Promise.reject(error);
    },
  );

  // Response interceptor for debugging auth responses
  axios.interceptors.response.use(
    (response: any) => {
      // Log admin-related responses
      if (
        response.config.url?.includes("/admin/") ||
        response.config.url?.includes("/api/admin/")
      ) {
        logger.debug("Admin API response:", {
          url: response.config.url,
          status: response.status,
          hasData: !!response.data,
        });
      }
      return response;
    },
    (error: any) => {
      // Special handling for admin API errors
      if (
        error.config?.url?.includes("/admin/") ||
        error.config?.url?.includes("/api/admin/")
      ) {
        const status = error.response?.status;

        // Check for auth errors (401/403)
        if (status === 401 || status === 403) {
          logger.error("Admin API authentication error:", {
            url: error.config.url,
            status: status,
            message: error.response?.data?.message || error.message,
          });

          // Import the auth store dynamically to avoid circular dependencies
          import("@/stores/auth")
            .then(({ useAuthStore }) => {
              const authStore = useAuthStore();

              // Try to refresh the token
              logger.info(
                "Attempting to refresh token due to admin API auth error",
              );
              authStore.refreshAuthToken().catch((refreshError: any) => {
                logger.error("Token refresh failed:", refreshError);

                // If refresh fails and we're in development, use mock data
                if (
                  process.env.NODE_ENV === "development" ||
                  localStorage.getItem("use_mock_api") === "true"
                ) {
                  logger.info("In development mode - using mock auth data");
                  import("@/services/auth/mockAuthService").then(
                    ({ mockAuthService }) => {
                      mockAuthService.initMockAuth();
                      logger.info("Mock auth initialized for development");
<<<<<<< HEAD
                    }
=======
                    },
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
                  );
                }
              });
            })
            .catch((importError) => {
              logger.error("Failed to import auth store:", importError);
            });
        } else {
          logger.error("Admin API error:", {
            url: error.config.url,
            status: status,
            message: error.response?.data?.message || error.message,
          });
        }
      }
      return Promise.reject(error);
    },
  );

  logger.info("Admin API request interceptors set up successfully");

  return () => {
    // Function to clean up the interceptor if needed
    axios.interceptors.request.eject(interceptorId);
    logger.info("Admin API request interceptor removed");
  };
}

// Initialize interceptors when this module is imported
setupAdminApiInterceptors();

export default { setupAdminApiInterceptors };
