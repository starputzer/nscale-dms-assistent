/**
 * Central Authentication Manager
 * Manages all authentication-related operations and axios interceptors
 */

import axios, { AxiosInstance } from "axios";
import { useAuthStore } from "@/stores/auth";

export class CentralAuthManager {
  private static instance: CentralAuthManager | null = null;
  private requestInterceptorId: number | null = null;
  private responseInterceptorId: number | null = null;

  private constructor() {}

  public static getInstance(): CentralAuthManager {
    if (!CentralAuthManager.instance) {
      CentralAuthManager.instance = new CentralAuthManager();
    }
    return CentralAuthManager.instance;
  }

  /**
   * Set up global axios interceptors for authentication
   */
  public setupInterceptors() {
    console.log("Setting up central auth interceptors...");

    // Remove any existing interceptors
    this.cleanup();

    // Add request interceptor
    this.requestInterceptorId = axios.interceptors.request.use(
      (config) => {
        // Skip auth header for login requests
        if (config.url?.includes("/auth/login")) {
          return config;
        }

        // Get token from localStorage
        const token = localStorage.getItem("nscale_access_token");

        if (token) {
          // Ensure headers object exists
          config.headers = config.headers || {};
          // Always set Authorization header
          config.headers.Authorization = `Bearer ${token}`;
          console.log(`✅ Added auth header to request: ${config.url}`);
        } else {
          console.warn(`⚠️ No token found for request: ${config.url}`);
        }

        return config;
      },
      (error) => {
        console.error("Request interceptor error:", error);
        return Promise.reject(error);
      },
    );

    // Add response interceptor
    this.responseInterceptorId = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (
          error.response?.status === 401 &&
          !error.config.url?.includes("/auth/")
        ) {
          console.log("Received 401 - clearing auth and redirecting to login");

          // Clear all auth data
          this.clearAuthData();

          // Redirect to login
          if (window.location.pathname !== "/login") {
            window.location.href = "/login";
          }
        }
        return Promise.reject(error);
      },
    );

    console.log("✅ Central auth interceptors set up");
  }

  /**
   * Clean up existing interceptors
   */
  public cleanup() {
    if (this.requestInterceptorId !== null) {
      axios.interceptors.request.eject(this.requestInterceptorId);
      this.requestInterceptorId = null;
    }

    if (this.responseInterceptorId !== null) {
      axios.interceptors.response.eject(this.responseInterceptorId);
      this.responseInterceptorId = null;
    }

    console.log("Cleaned up existing auth interceptors");
  }

  /**
   * Clear all authentication data
   */
  private clearAuthData() {
    localStorage.removeItem("nscale_access_token");
    localStorage.removeItem("nscale_refresh_token");
    localStorage.removeItem("pinia-state");
    sessionStorage.clear();

    try {
      const authStore = useAuthStore();
      authStore.$reset();
    } catch (e) {
      console.warn("Could not reset auth store");
    }
  }

  /**
   * Update authorization header for all axios instances
   */
  public updateAuthHeader(token: string) {
    // Update default axios headers
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

    // Store token
    localStorage.setItem("nscale_access_token", token);

    console.log("✅ Updated global auth header");
  }
}
