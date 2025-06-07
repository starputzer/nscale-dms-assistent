/**
 * Consolidated Authentication Fix Service
 * 
 * Combines all authentication fixes into a single, coherent service
 * Integrates fixes from:
 * - authenticationFix.ts (main auth fixes)
 * - authStatusSyncFixed.ts (status synchronization)
 * - batchAuthFix.ts (batch request handling)
 * - authRequestInterceptor.ts (request formatting)
 */

import { useAuthStore } from "@/stores/auth";
import type { AuthStore } from "@/stores/auth";
import { apiService } from "@/services/api/ApiService";
import { useLogger } from "@/composables/useLogger";
import type { AxiosRequestConfig } from "axios";

export interface AuthStatusInfo {
  source: string;
  isAuthenticated: boolean;
  token: string | null;
  timestamp: Date;
}

export class AuthFixService {
  private static instance: AuthFixService;
  private authStore: AuthStore | null = null;
  private logger: ReturnType<typeof useLogger>;
  private initialized = false;
  private statusSources: Map<string, AuthStatusInfo> = new Map();
  private isPolling = false;
  private pollInterval: number | null = null;

  private constructor() {
    this.logger = useLogger();
  }

  static getInstance(): AuthFixService {
    if (!AuthFixService.instance) {
      AuthFixService.instance = new AuthFixService();
    }
    return AuthFixService.instance;
  }

  /**
   * Initialize the authentication fix service
   */
  async initialize() {
    if (this.initialized) return;

    this.logger.info("🔧 Initializing Consolidated Authentication Fix Service...");

    try {
      this.authStore = useAuthStore();

      // Apply all authentication fixes
      await this.applyTokenStorageFixes();
      this.setupAuthInterceptors();
      this.initializeStatusSync();
      this.setupBatchAuthHandling();
      this.setupRequestFormatting();
      this.validateAuthenticationState();
      this.monitorTokenChanges();

      this.initialized = true;
      this.logger.info("✅ Authentication Fix Service initialized successfully");
    } catch (error) {
      this.logger.error("❌ Failed to initialize auth fix service:", error);
    }
  }

  /**
   * Apply token storage fixes to ensure reliability
   */
  private async applyTokenStorageFixes() {
    if (!this.authStore) return;

    this.logger.debug("🔧 Applying token storage fixes...");

    // Override login method to ensure proper token storage
    const originalLogin = this.authStore.login;
    this.authStore.login = async (...args: any[]) => {
      try {
        const result = await originalLogin.apply(this.authStore, args);
        
        // Ensure token is stored in all necessary locations
        if (result?.token) {
          this.storeTokenSafely(result.token);
        }

        return result;
      } catch (error) {
        this.logger.error("Login error:", error);
        throw error;
      }
    };

    // Fix logout to properly clear tokens
    const originalLogout = this.authStore.logout;
    this.authStore.logout = async (...args: any[]) => {
      try {
        await originalLogout.apply(this.authStore, args);
        this.clearAllTokens();
      } catch (error) {
        this.logger.error("Logout error:", error);
        this.clearAllTokens(); // Ensure cleanup even on error
      }
    };
  }

  /**
   * Setup comprehensive auth interceptors
   */
  private setupAuthInterceptors() {
    this.logger.debug("🔧 Setting up auth interceptors...");

    // Request interceptor
    apiService.axiosInstance.interceptors.request.use(
      (config: any) => {
        const token = this.getValidToken();
        if (token && !this.shouldSkipAuth(config)) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error: any) => {
        this.logger.error("Request interceptor error:", error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for handling auth errors
    apiService.axiosInstance.interceptors.response.use(
      (response: any) => response,
      async (error: any) => {
        if (error.response?.status === 401) {
          await this.handleUnauthorized();
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Initialize auth status synchronization
   */
  private initializeStatusSync() {
    this.logger.debug("🔧 Initializing auth status sync...");

    // Register auth store as a status source
    this.registerStatusSource("authStore", {
      isAuthenticated: () => this.authStore?.isAuthenticated ?? false,
      token: () => this.authStore?.token ?? null,
    });

    // Register localStorage as a status source
    this.registerStatusSource("localStorage", {
      isAuthenticated: () => !!localStorage.getItem("nscale_access_token"),
      token: () => localStorage.getItem("nscale_access_token"),
    });

    // Start polling for status consistency
    this.startStatusPolling();
  }

  /**
   * Setup batch authentication handling
   */
  private setupBatchAuthHandling() {
    this.logger.debug("🔧 Setting up batch auth handling...");

    // Ensure batch requests include proper auth headers
<<<<<<< HEAD
    const originalBatchRequest = (apiService as any).batchRequest?.bind(apiService);
    if (originalBatchRequest) {
      (apiService as any).batchRequest = async (requests: any[]) => {
=======
    const originalBatchRequest = apiService.batchRequest?.bind(apiService);
    if (originalBatchRequest) {
      apiService.batchRequest = async (requests: any[]) => {
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
        const token = this.getValidToken();
        if (token) {
          requests = requests.map(req => ({
            ...req,
            headers: {
              ...req.headers,
              Authorization: `Bearer ${token}`
            }
          }));
        }
        return originalBatchRequest(requests);
      };
    }
  }

  /**
   * Setup request formatting for auth endpoints
   */
  private setupRequestFormatting() {
    this.logger.debug("🔧 Setting up request formatting...");

    // Add request transformer for auth endpoints
    apiService.axiosInstance.interceptors.request.use(
      (config: any) => {
        if (this.isAuthEndpoint(config.url)) {
          config = this.formatAuthRequest(config);
        }
        return config;
      }
    );
  }

  /**
   * Validate current authentication state
   */
  private async validateAuthenticationState() {
    this.logger.debug("🔍 Validating authentication state...");

    const token = this.getValidToken();
    if (token) {
      try {
        // Verify token is still valid
        const isValid = await this.verifyToken(token);
        if (!isValid) {
          this.logger.warn("Token validation failed, clearing auth state");
          await this.authStore?.logout();
        }
      } catch (error) {
        this.logger.error("Token validation error:", error);
      }
    }
  }

  /**
   * Monitor token changes across the application
   */
  private monitorTokenChanges() {
    this.logger.debug("👀 Setting up token change monitoring...");

    // Monitor localStorage changes
    window.addEventListener("storage", (event) => {
      if (event.key === "nscale_access_token") {
        this.handleTokenChange(event.newValue);
      }
    });

    // Monitor auth store changes if using Vue reactivity
    if (this.authStore && 'watch' in window) {
      const { watch } = window as any;
      watch(
        () => this.authStore?.token,
        (newToken: string | null) => {
          this.handleTokenChange(newToken);
        }
      );
    }
  }

  /**
   * Store token safely in all required locations
   */
  private storeTokenSafely(token: string) {
    this.logger.debug("💾 Storing token safely...");

    // Store in localStorage with proper key
    localStorage.setItem("nscale_access_token", token);
    
    // Store in sessionStorage as backup
    sessionStorage.setItem("nscale_access_token", token);

    // Update auth store if available
    if (this.authStore) {
      this.authStore.token = token;
      this.authStore.isAuthenticated = true;
    }

    // Notify status sync
    this.updateAuthStatus("tokenStore", true, token);
  }

  /**
   * Clear all stored tokens
   */
  private clearAllTokens() {
    this.logger.debug("🗑️ Clearing all tokens...");

    localStorage.removeItem("nscale_access_token");
    localStorage.removeItem("access_token");
    sessionStorage.removeItem("nscale_access_token");
    sessionStorage.removeItem("access_token");

    if (this.authStore) {
      this.authStore.token = null;
      this.authStore.isAuthenticated = false;
    }

    // Notify status sync
    this.updateAuthStatus("tokenClear", false, null);
  }

  /**
   * Get valid token from any available source
   */
  private getValidToken(): string | null {
    // Priority order: auth store, localStorage, sessionStorage
    return (
      this.authStore?.token ||
      localStorage.getItem("nscale_access_token") ||
      localStorage.getItem("access_token") ||
      sessionStorage.getItem("nscale_access_token") ||
      sessionStorage.getItem("access_token")
    );
  }

  /**
   * Check if request should skip auth
   */
  private shouldSkipAuth(config: AxiosRequestConfig): boolean {
    const publicEndpoints = ["/login", "/refresh", "/public"];
    return publicEndpoints.some(endpoint => 
      config.url?.includes(endpoint)
    );
  }

  /**
   * Handle unauthorized responses
   */
  private async handleUnauthorized() {
    this.logger.warn("⚠️ Handling unauthorized response");
    
    // Try to refresh token
    try {
      if (this.authStore?.refreshToken) {
        await this.authStore.refresh();
      } else {
        await this.authStore?.logout();
      }
    } catch (error) {
      this.logger.error("Failed to handle unauthorized:", error);
      await this.authStore?.logout();
    }
  }

  /**
   * Register a status source for synchronization
   */
  private registerStatusSource(
    name: string,
    source: {
      isAuthenticated: () => boolean;
      token: () => string | null;
    }
  ) {
    const updateStatus = () => {
      this.statusSources.set(name, {
        source: name,
        isAuthenticated: source.isAuthenticated(),
        token: source.token(),
        timestamp: new Date(),
      });
    };

    updateStatus();
    return updateStatus;
  }

  /**
   * Start polling for status consistency
   */
  private startStatusPolling() {
    if (this.isPolling) return;

    this.isPolling = true;
    this.pollInterval = window.setInterval(() => {
      this.checkStatusConsistency();
    }, 5000); // Check every 5 seconds
  }

  /**
   * Check and fix status consistency
   */
  private checkStatusConsistency() {
    const statuses = Array.from(this.statusSources.values());
    const inconsistent = statuses.some(s => 
      s.isAuthenticated !== statuses[0].isAuthenticated
    );

    if (inconsistent) {
      this.logger.warn("⚠️ Inconsistent auth status detected");
      this.resolveInconsistency();
    }
  }

  /**
   * Resolve authentication inconsistencies
   */
  private resolveInconsistency() {
    const token = this.getValidToken();
    if (token) {
      this.storeTokenSafely(token);
    } else {
      this.clearAllTokens();
    }
  }

  /**
   * Update auth status for a source
   */
  private updateAuthStatus(source: string, isAuthenticated: boolean, token: string | null) {
    this.statusSources.set(source, {
      source,
      isAuthenticated,
      token,
      timestamp: new Date(),
    });

    // Trigger consistency check
    this.checkStatusConsistency();
  }

  /**
   * Handle token changes
   */
  private handleTokenChange(newToken: string | null) {
    this.logger.debug("🔄 Token change detected");

    if (newToken) {
      this.storeTokenSafely(newToken);
    } else {
      this.clearAllTokens();
    }
  }

  /**
   * Verify token validity
   */
  private async verifyToken(token: string): Promise<boolean> {
    try {
      // Call a lightweight endpoint to verify token
      const response = await apiService.get("/auth/verify", {
        headers: { Authorization: `Bearer ${token}` }
      });
<<<<<<< HEAD
      return (response as any).status === 200;
=======
      return response.status === 200;
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if URL is an auth endpoint
   */
  private isAuthEndpoint(url?: string): boolean {
    if (!url) return false;
    const authEndpoints = ["/auth", "/login", "/logout", "/refresh"];
    return authEndpoints.some(endpoint => url.includes(endpoint));
  }

  /**
   * Format auth request according to backend expectations
   */
  private formatAuthRequest(config: AxiosRequestConfig): AxiosRequestConfig {
    // Ensure content-type is set correctly
    config.headers = {
      ...config.headers,
      "Content-Type": "application/json",
    };

    // Format login requests
    if (config.url?.includes("/login") && config.data) {
      config.data = {
        email: config.data.email || config.data.username,
        password: config.data.password,
      };
    }

    return config;
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.isPolling = false;
    this.statusSources.clear();
  }
}

// Export singleton instance
export const authFixService = AuthFixService.getInstance();