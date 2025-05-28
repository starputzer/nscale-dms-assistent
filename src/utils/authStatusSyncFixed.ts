/**
 * Auth Status Synchronization - Fixed version
 *
 * Löst das Problem inkonsistenter Authentifizierungsstatus zwischen verschiedenen Teilen der App
 * Diese Version behebt den Proxy-Fehler beim Setzen von readonly properties
 */

import { ref, computed, watch } from "vue";
import { useLogger } from "@/composables/useLogger";

export interface AuthStatusInfo {
  source: string;
  isAuthenticated: boolean;
  token: string | null;
  timestamp: Date;
}

export class AuthStatusSyncFixed {
  private static instance: AuthStatusSyncFixed;
  private logger: ReturnType<typeof useLogger>;
  private statusSources: Map<string, AuthStatusInfo> = new Map();
  private isPolling = false;
  private pollInterval: number | null = null;
  private authStore: any = null;

  private constructor() {
    this.logger = useLogger();
    this.initializeSync();
  }

  static getInstance(): AuthStatusSyncFixed {
    if (!AuthStatusSyncFixed.instance) {
      AuthStatusSyncFixed.instance = new AuthStatusSyncFixed();
    }
    return AuthStatusSyncFixed.instance;
  }

  /**
   * Initialize auth status synchronization
   */
  private async initializeSync() {
    this.logger.info("Initializing Auth Status Sync (Fixed)");

    // Wait for auth store to be available
    await this.waitForAuthStore();

    // Start regular sync checks
    this.startPolling();

    // Monitor all auth sources
    this.monitorAuthSources();

    // Set up global error recovery
    this.setupErrorRecovery();
  }

  private async waitForAuthStore(maxRetries = 50) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const { useAuthStore } = await import("@/stores/auth");
        this.authStore = useAuthStore();
        console.log("Auth store available");
        return;
      } catch (e) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
    console.warn("Could not get auth store after retries");
  }

  /**
   * Start polling for auth status consistency
   */
  startPolling(interval: number = 5000) {
    if (this.isPolling) return;

    this.isPolling = true;
    this.pollInterval = window.setInterval(() => {
      this.checkAuthConsistency();
    }, interval);

    // Initial check
    this.checkAuthConsistency();
  }

  /**
   * Stop polling
   */
  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.isPolling = false;
  }

  /**
   * Monitor all auth sources for changes
   */
  private monitorAuthSources() {
    // Monitor localStorage
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = (key: string, value: string) => {
      originalSetItem.call(localStorage, key, value);
      if (key.includes("token") || key.includes("auth")) {
        // Small delay to avoid recursion
        setTimeout(() => this.checkAuthConsistency(), 100);
      }
    };
  }

  /**
   * Check auth consistency across all sources
   */
  checkAuthConsistency() {
    const sources: AuthStatusInfo[] = [];

    // 1. Check localStorage token
    const localStorageToken =
      localStorage.getItem("nscale_access_token") ||
      localStorage.getItem("auth_token") ||
      localStorage.getItem("token");

    sources.push({
      source: "localStorage",
      isAuthenticated: !!localStorageToken,
      token: localStorageToken,
      timestamp: new Date(),
    });

    // 2. Check auth store (if available)
    if (this.authStore) {
      sources.push({
        source: "authStore",
        isAuthenticated: this.authStore.isAuthenticated,
        token: this.authStore.token,
        timestamp: new Date(),
      });
    }

    // 3. Check UI diagnostics state
    if (window.uiDiagnostics?.state?.value) {
      sources.push({
        source: "uiDiagnostics",
        isAuthenticated: window.uiDiagnostics.state.value.isAuthenticated,
        token: null,
        timestamp: new Date(),
      });
    }

    // 4. Check API client auth headers
    if (window.apiService?.axiosInstance) {
      const headers = window.apiService.axiosInstance.defaults.headers;
      const authHeader =
        headers?.common?.["Authorization"] || headers?.["Authorization"];
      sources.push({
        source: "apiService",
        isAuthenticated: !!authHeader,
        token: authHeader?.replace("Bearer ", ""),
        timestamp: new Date(),
      });
    }

    // Update internal tracking
    sources.forEach((source) => {
      this.statusSources.set(source.source, source);
    });

    // Check for inconsistencies
    const authStates = sources.map((s) => s.isAuthenticated);
    const allAuthenticated = authStates.every((state) => state === true);
    const allUnauthenticated = authStates.every((state) => state === false);
    const isConsistent = allAuthenticated || allUnauthenticated;

    if (!isConsistent) {
      this.logger.warn("Auth status inconsistency detected:", {
        sources: Object.fromEntries(
          sources.map((s) => [
            s.source,
            {
              isAuthenticated: s.isAuthenticated,
              hasToken: !!s.token,
            },
          ]),
        ),
      });

      // Auto-fix inconsistency
      this.fixAuthStatus();
    } else {
      this.logger.debug(
        "Auth status is consistent:",
        allAuthenticated ? "authenticated" : "unauthenticated",
      );
    }

    return { isConsistent, sources };
  }

  /**
   * Fix inconsistent auth status
   */
  fixAuthStatus() {
    this.logger.info("Fixing auth status inconsistency");

    // Find the most authoritative source (priority: localStorage -> authStore -> apiService)
    const localStorageToken =
      localStorage.getItem("nscale_access_token") ||
      localStorage.getItem("auth_token") ||
      localStorage.getItem("token");

    const isAuthenticated = !!localStorageToken;

    // Sync to all sources
    try {
      // 1. Update auth store (set token and user, not isAuthenticated directly)
      if (this.authStore) {
        if (isAuthenticated && localStorageToken) {
          // Set token which will update isAuthenticated computed property
          this.authStore.token = localStorageToken;

          // Try to decode user from token if user is not set
          if (!this.authStore.user) {
            try {
              const payload = JSON.parse(atob(localStorageToken.split(".")[1]));
              if (payload.sub || payload.user_id) {
                this.authStore.user = {
                  id: payload.sub || payload.user_id,
                  username: payload.username || payload.email || "Unknown",
                  email: payload.email,
                  roles: payload.roles || [],
                };
              }
            } catch (e) {
              console.warn("Could not decode user from token:", e);
            }
          }
        } else {
          // Clear token and user
          this.authStore.token = null;
          this.authStore.user = null;
        }
      }

      // 2. Update UI diagnostics
      if (window.uiDiagnostics?.state?.value) {
        window.uiDiagnostics.state.value.isAuthenticated = isAuthenticated;
      }

      // 3. Update API service headers
      if (window.apiService?.axiosInstance) {
        if (isAuthenticated && localStorageToken) {
          window.apiService.axiosInstance.defaults.headers.common[
            "Authorization"
          ] = `Bearer ${localStorageToken}`;
        } else {
          delete window.apiService.axiosInstance.defaults.headers.common[
            "Authorization"
          ];
        }
      }

      this.logger.info("Auth status synchronized:", { isAuthenticated });

      // Emit event for components to update
      window.dispatchEvent(
        new CustomEvent("authStatusSynced", {
          detail: { isAuthenticated },
        }),
      );
    } catch (error) {
      this.logger.error("Error fixing auth status:", error);
    }
  }

  /**
   * Setup error recovery mechanisms
   */
  private setupErrorRecovery() {
    // Listen for auth errors
    window.addEventListener("error", (event) => {
      if (
        event.message.includes("401") ||
        event.message.includes("Unauthorized")
      ) {
        setTimeout(() => this.checkAuthConsistency(), 1000);
      }
    });

    // Listen for unhandled promise rejections
    window.addEventListener("unhandledrejection", (event) => {
      if (event.reason?.response?.status === 401) {
        setTimeout(() => this.checkAuthConsistency(), 1000);
      }
    });
  }

  /**
   * Get current auth status report
   */
  getStatusReport(): Record<string, any> {
    return {
      sources: Object.fromEntries(this.statusSources),
      isPolling: this.isPolling,
      lastCheck: new Date().toISOString(),
    };
  }

  /**
   * Force auth status to specific value (emergency use only)
   */
  forceAuthStatus(isAuthenticated: boolean, token?: string) {
    this.logger.warn("FORCING auth status:", { isAuthenticated });

    if (isAuthenticated && token) {
      // Set token everywhere
      localStorage.setItem("nscale_access_token", token);

      if (this.authStore) {
        this.authStore.token = token;
        // Try to decode user from token
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          this.authStore.user = {
            id: payload.sub || payload.user_id || "unknown",
            username: payload.username || payload.email || "Unknown",
            email: payload.email,
            roles: payload.roles || [],
          };
        } catch (e) {
          console.error("Could not decode user from token:", e);
        }
      }

      if (window.apiService?.axiosInstance) {
        window.apiService.axiosInstance.defaults.headers.common[
          "Authorization"
        ] = `Bearer ${token}`;
      }
    } else {
      // Clear auth everywhere
      localStorage.removeItem("nscale_access_token");
      localStorage.removeItem("auth_token");
      localStorage.removeItem("token");

      if (this.authStore) {
        this.authStore.token = null;
        this.authStore.user = null;
      }

      if (window.apiService?.axiosInstance) {
        delete window.apiService.axiosInstance.defaults.headers.common[
          "Authorization"
        ];
      }
    }

    this.checkAuthConsistency();
  }
}

// Global helper functions
export function setupAuthSyncFixed() {
  const authSync = AuthStatusSyncFixed.getInstance();

  // Make available globally
  if (typeof window !== "undefined") {
    window.authSyncFixed = authSync;

    // Add helper functions to window
    window.fixAuthStatus = () => authSync.fixAuthStatus();
    window.checkAuthStatus = () => authSync.checkAuthConsistency();
    window.getAuthReport = () => authSync.getStatusReport();
    window.forceAuth = (token: string) => authSync.forceAuthStatus(true, token);
    window.forceLogout = () => authSync.forceAuthStatus(false);
  }

  return authSync;
}

// Auto-initialize on import
const authSyncFixed = setupAuthSyncFixed();
export default authSyncFixed;
