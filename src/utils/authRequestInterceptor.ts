/**
 * Authentication Request Interceptor
 *
 * This utility sets up Axios interceptors for authentication-related
 * requests to ensure they are properly formatted for the backend.
 */

import axios from "axios";
import { LogService } from "../services/log/LogService";

// Create a logger instance
const logger = new LogService("AuthRequestInterceptor");

/**
 * Sets up interceptors to properly format auth requests,
 * especially for login
 */
export function setupAuthRequestInterceptors(): void {
  logger.info("Setting up authentication request interceptors");

  // Request interceptor for all auth-related requests
  axios.interceptors.request.use(
    (config) => {
      // Special handling for login requests
      if (config.url?.includes("/api/auth/login")) {
        logger.debug("Checking login request format:", config);

        // Ensure data is an object format, not a string
        if (typeof config.data === "string") {
          try {
            // Try to parse as JSON if it's a string
            config.data = JSON.parse(config.data);
          } catch (e) {
            logger.warn("Login data was not valid JSON, converting to object");

            // Assume string could be an email address
            if (config.data.includes("@")) {
              logger.debug(
                "String looks like an email, converting to login object",
              );
              config.data = {
                email: config.data,
                password: "123", // Default test password
              };
            }
          }
        }

        // Handle case where username is provided instead of email
        if (config.data && config.data.username && !config.data.email) {
          logger.debug(
            "Username detected, converting to email",
            config.data.username,
          );
          config.data.email = config.data.username;
        }

        // Handle case where email is passed as a parameter instead of in the body
        if (config.params && typeof config.params.email === "string") {
          logger.debug("Email parameter detected, converting to body object");
          config.data = {
            email: config.params.email,
            password: config.params.password || "123",
          };
          // Remove params since we're moving them to the body
          delete config.params.email;
          delete config.params.password;
        }

        // Ensure Content-Type header is set
        if (config.headers) {
          config.headers["Content-Type"] = "application/json";
        }

        logger.debug("Login request after preprocessing:", {
          url: config.url,
          method: config.method,
          data: config.data,
        });
      }

      return config;
    },
    (error) => {
      logger.error("Axios request interceptor error:", error);
      return Promise.reject(error);
    },
  );

  // Response interceptor for debugging auth responses
  axios.interceptors.response.use(
    (response) => {
      // Log auth-related responses
      if (response.config.url?.includes("/api/auth/")) {
        logger.debug("Auth response:", {
          url: response.config.url,
          status: response.status,
          data: response.data,
        });
      }
      return response;
    },
    (error) => {
      // Log auth-related errors
      if (error.config?.url?.includes("/api/auth/")) {
        logger.error("Auth error:", {
          url: error.config.url,
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        });
      }
      return Promise.reject(error);
    },
  );

  logger.info("Authentication request interceptors set up successfully");
}

// Initialize interceptors when this module is imported
setupAuthRequestInterceptors();

export default setupAuthRequestInterceptors;
