/**
 * Auth Status Synchronization
 *
 * Löst das Problem inkonsistenter Authentifizierungsstatus zwischen verschiedenen Teilen der App
 */

import { ref, computed, watch } from "vue";
import { useAuthStore } from "@/stores/auth";
import { useLogger } from "@/composables/useLogger";

export interface AuthStatusInfo {
  source: string;
  isAuthenticated: boolean;
  token: string | null;
  timestamp: Date;
}

export class AuthStatusSync {
  private static instance: AuthStatusSync;
  private logger: ReturnType<typeof useLogger>;
  private statusSources: Map<string, AuthStatusInfo> = new Map();
  private isPolling = false;
  private pollInterval: number | null = null;

  private constructor() {
    this.logger = useLogger();
    this.initializeSync();
  }

  static getInstance(): AuthStatusSync {
    if (!AuthStatusSync.instance) {
      AuthStatusSync.instance = new AuthStatusSync();
    }
    return AuthStatusSync.instance;
  }

  /**
   * Initialize auth status synchronization
   */
  private initializeSync() {
    this.logger.info("Initializing Auth Status Sync");

    // Start regular sync checks
    this.startPolling();

    // Monitor all auth sources
    this.monitorAuthSources();

    // Set up global error recovery
    this.setupErrorRecovery();
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
        this.checkAuthConsistency();
      }
    };

    // Monitor auth store changes
    try {
      const authStore = useAuthStore();
      watch(
        () => authStore.isAuthenticated,
        () => {
          this.checkAuthConsistency();
        },
      );
    } catch (e) {
      this.logger.warn("Could not watch auth store:", e);
    }
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

    // 2. Check auth store
    try {
      const authStore = useAuthStore();
      sources.push({
        source: "authStore",
        isAuthenticated: authStore.isAuthenticated,
        token: authStore.token,
        timestamp: new Date(),
      });
    } catch (e) {
      this.logger.warn("Could not check auth store:", e);
    }

    // 3. Check UI diagnostics state
    if (window.uiDiagnostics) {
      const uiState = window.uiDiagnostics.state?.value;
      if (uiState) {
        sources.push({
          source: "uiDiagnostics",
          isAuthenticated: uiState.isAuthenticated,
          token: null,
          timestamp: new Date(),
        });
      }
    }

    // 4. Check API client auth headers
    if (window.apiService) {
      const headers = window.apiService.axiosInstance?.defaults?.headers;
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
      // 1. Update auth store
      const authStore = useAuthStore();
      if (authStore.isAuthenticated !== isAuthenticated) {
        if (isAuthenticated && localStorageToken) {
          authStore.token = localStorageToken;
          authStore.isAuthenticated = true;
        } else {
          authStore.logout();
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
        this.checkAuthConsistency();
      }
    });

    // Listen for unhandled promise rejections
    window.addEventListener("unhandledrejection", (event) => {
      if (event.reason?.response?.status === 401) {
        this.checkAuthConsistency();
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

      const authStore = useAuthStore();
      authStore.token = token;
      authStore.isAuthenticated = true;

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

      const authStore = useAuthStore();
      authStore.logout();

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
export function setupAuthSync() {
  const authSync = AuthStatusSync.getInstance();

  // Make available globally
  if (typeof window !== "undefined") {
    window.authSync = authSync;

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
const authSync = setupAuthSync();
export default authSync;
