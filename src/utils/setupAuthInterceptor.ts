/**
 * Simple authentication interceptor setup
 * Ensures authorization headers are properly set for all axios requests
 */

import axios from "axios";
import { useAuthStore } from "@/stores/auth";

export function setupAuthInterceptor() {
  console.log("Setting up global authentication interceptor...");

  // Remove any existing interceptors to avoid duplicates
  axios.interceptors.request.eject(0);

  // Add request interceptor to include authorization header
  axios.interceptors.request.use(
    (config: any) => {
      // Skip auth header for login requests
      if (config.url?.includes("/auth/login")) {
        return config;
      }

      try {
        const authStore = useAuthStore();
        const token =
          authStore.token || localStorage.getItem("nscale_access_token");

        if (token && !config.headers.Authorization) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log("✅ Added authorization header to request:", config.url);
        }
      } catch (error) {
        console.error("Error accessing auth store:", error);
      }

      return config;
    },
    (error: any) => {
      console.error("Request interceptor error:", error);
      return Promise.reject(error);
    },
  );

  // Add response interceptor for 401 handling
  axios.interceptors.response.use(
    (response: any) => response,
    async (error: any) => {
      if (
        error.response?.status === 401 &&
        !error.config.url?.includes("/auth/")
      ) {
        console.log("Received 401 - user needs to login");

        try {
          const authStore = useAuthStore();
          await authStore.logout();

          // Redirect to login page
          if (window.location.pathname !== "/login") {
            window.location.href = "/login";
          }
        } catch (e) {
          console.error("Error handling 401:", e);
        }
      }
      return Promise.reject(error);
    },
  );

  console.log("✅ Authentication interceptor setup complete");
}
