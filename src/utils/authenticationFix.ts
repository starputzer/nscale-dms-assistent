/**
 * Authentication Fix Module
 *
 * Umfassende Lösung für Authentifizierungsprobleme in der nscale DMS Assistent Anwendung
 */

import { useAuthStore } from "@/stores/auth";
import { apiService } from "@/services/api/ApiService";
import axios from "axios";

export class AuthenticationFix {
  private authStore: any;
  private initialized = false;

  /**
   * Initialize the authentication fix
   */
  async initialize() {
    if (this.initialized) return;

    console.log("🔧 Initializing Enhanced Authentication Fix...");

    try {
      this.authStore = useAuthStore();

      // Fix 1: Enhanced token storage after login
      this.enhanceTokenStorage();

      // Fix 2: Comprehensive auth interceptor setup
      this.setupComprehensiveInterceptors();

      // Fix 3: Validate existing authentication state
      this.validateAuthenticationState();

      // Fix 4: Monitor token changes
      this.monitorTokenChanges();

      this.initialized = true;
      console.log("✅ Enhanced Authentication Fix initialized successfully");
    } catch (error) {
      console.error(
        "❌ Failed to initialize enhanced authentication fix:",
        error,
      );
    }
  }

  /**
   * Enhance token storage to ensure reliability
   */
  private enhanceTokenStorage() {
    console.log("🔧 Enhancing token storage...");

    // Override login method to ensure proper token handling
    const originalLogin = this.authStore.login;
    this.authStore.login = async (credentials: any) => {
      try {
        console.log("Enhanced login starting...");
        const result = await originalLogin.call(this.authStore, credentials);

        if (result && this.authStore.token) {
          console.log("Login successful, ensuring token storage...");

          // Force token storage in multiple locations
          const token = this.authStore.token;
          const refreshToken = this.authStore.refreshToken;

          // Primary storage
          localStorage.setItem("nscale_access_token", token);
          console.log("✅ Token stored in localStorage (primary)");

          // Backup storage
          sessionStorage.setItem("nscale_access_token", token);

          if (refreshToken) {
            localStorage.setItem("nscale_refresh_token", refreshToken);
            sessionStorage.setItem("nscale_refresh_token", refreshToken);
          }

          // Force immediate auth client configuration
          this.configureAllAuthClients(token);

          // Validate storage
          setTimeout(() => {
            const storedToken = localStorage.getItem("nscale_access_token");
            if (storedToken !== token) {
              console.error("Token storage mismatch detected, fixing...");
              localStorage.setItem("nscale_access_token", token);
            }
          }, 100);
        }

        return result;
      } catch (error) {
        console.error("Enhanced login error:", error);
        throw error;
      }
    };
  }

  /**
   * Setup comprehensive interceptors for all HTTP clients
   */
  private setupComprehensiveInterceptors() {
    console.log("🔧 Setting up comprehensive interceptors...");

    // 1. Global axios interceptor
    axios.interceptors.request.eject(0); // Remove any existing
    axios.interceptors.request.use(
      (config) => {
        if (!config.headers.Authorization) {
          const token = this.getValidToken();
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
            console.log("✅ Global axios: Auth header added");
          }
        }
        return config;
      },
      (error) => Promise.reject(error),
    );

    // 2. ApiService interceptor
    apiService.addRequestInterceptor(
      (config) => {
        if (!config.headers.Authorization) {
          const token = this.getValidToken();
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
            console.log("✅ ApiService: Auth header added");
          }
        }
        return config;
      },
      (error) => Promise.reject(error),
    );

    // 3. Response interceptor for 401 handling
    apiService.addResponseInterceptor(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          console.log("🔄 Received 401, attempting token refresh...");
          const refreshed = await this.handleTokenRefresh();

          if (refreshed) {
            // Retry the original request
            error.config.headers.Authorization = `Bearer ${this.getValidToken()}`;
            return axios(error.config);
          }
        }
        return Promise.reject(error);
      },
    );
  }

  /**
   * Get valid token from all possible sources
   */
  private getValidToken(): string | null {
    // Check multiple sources
    let token = this.authStore.token;

    if (!token) {
      token = localStorage.getItem("nscale_access_token");
    }

    if (!token) {
      token = sessionStorage.getItem("nscale_access_token");
    }

    // Validate token format
    if (token && token.includes(".")) {
      return token;
    }

    return null;
  }

  /**
   * Configure all auth clients with token
   */
  private configureAllAuthClients(token: string) {
    console.log("🔧 Configuring all auth clients...");

    // Configure axios defaults
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

    // Force auth store configuration
    if (this.authStore.configureHttpClients) {
      this.authStore.configureHttpClients(token);
    }
  }

  /**
   * Validate current authentication state
   */
  private validateAuthenticationState() {
    console.log("🔍 Validating authentication state...");

    const checks = {
      storeToken: !!this.authStore.token,
      localStorageToken: !!localStorage.getItem("nscale_access_token"),
      sessionStorageToken: !!sessionStorage.getItem("nscale_access_token"),
      isAuthenticated: this.authStore.isAuthenticated,
      tokenValid: false,
    };

    const token = this.getValidToken();
    if (token) {
      try {
        const parts = token.split(".");
        checks.tokenValid = parts.length === 3;
      } catch (e) {
        checks.tokenValid = false;
      }
    }

    console.table(checks);

    // Fix any inconsistencies
    if (checks.storeToken && !checks.localStorageToken) {
      localStorage.setItem("nscale_access_token", this.authStore.token);
      console.log("✅ Fixed missing localStorage token");
    }

    return checks;
  }

  /**
   * Monitor token changes
   */
  private monitorTokenChanges() {
    console.log("👁️ Setting up token monitoring...");

    // Watch for storage events
    window.addEventListener("storage", (event) => {
      if (event.key === "nscale_access_token") {
        console.log("Token changed in storage, updating auth state...");
        if (event.newValue) {
          this.authStore.setToken(event.newValue);
        } else {
          this.authStore.logout();
        }
      }
    });
  }

  /**
   * Handle token refresh
   */
  private async handleTokenRefresh(): Promise<boolean> {
    try {
      const refreshToken = localStorage.getItem("nscale_refresh_token");
      if (!refreshToken) return false;

      const response = await axios.post("/api/auth/refresh", {
        refresh_token: refreshToken,
      });

      if (response.data.token) {
        const newToken = response.data.token;

        // Update everywhere
        this.authStore.setToken(newToken);
        localStorage.setItem("nscale_access_token", newToken);
        sessionStorage.setItem("nscale_access_token", newToken);

        return true;
      }
    } catch (error) {
      console.error("Token refresh failed:", error);
    }

    return false;
  }

  /**
   * Diagnostic function
   */
  diagnose() {
    console.log("🔍 Running authentication diagnostics...");

    const token = this.getValidToken();
    const diagnostics = {
      initialized: this.initialized,
      hasToken: !!token,
      tokenLength: token?.length || 0,
      tokenPreview: token ? token.substring(0, 30) + "..." : null,
      authStoreToken: !!this.authStore.token,
      localStorageKeys: Object.keys(localStorage).filter((k) =>
        k.includes("token"),
      ),
      sessionStorageKeys: Object.keys(sessionStorage).filter((k) =>
        k.includes("token"),
      ),
      axiosDefault: axios.defaults.headers.common["Authorization"],
      isAuthenticated: this.authStore.isAuthenticated,
    };

    console.table(diagnostics);
    return diagnostics;
  }

  /**
   * Force fix authentication
   */
  forceFix() {
    console.log("🔧 Force fixing authentication...");

    const token = this.getValidToken();
    if (token) {
      this.configureAllAuthClients(token);
      console.log("✅ Force fix completed");
    } else {
      console.error("❌ No valid token found for force fix");
    }
  }
}

// Create singleton instance
export const authenticationFix = new AuthenticationFix();

// Auto-initialize in browser
if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => {
    authenticationFix.initialize();
  });

  // Expose for debugging
  (window as any).authFix = authenticationFix;
}
