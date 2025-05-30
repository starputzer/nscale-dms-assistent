/**
 * @file Auth Bridge Module
 * @description Provides authentication functionality for the bridge system,
 * synchronizing user state between modern and legacy components.
 *
 * @redundancy-analysis
 * This module consolidates authentication functionality previously scattered across:
 * - bridge/auth.ts
 * - bridge/enhanced/auth.ts
 * - sessionBridge.ts (auth-related functionality)
 */

import { useAuthStore } from "@/stores/auth";
import type {
  AuthBridgeConfig,
  BridgeError,
  BridgeResult,
  BridgeSubscription,
  TypedEventEmitter,
} from "../core/types";
import { success, failure } from "../core/results";
import { BridgeLogger } from "../core/logger";

// Create module-specific logger
const logger = new BridgeLogger("auth");

/**
 * Auth bridge state interface
 */
interface AuthBridgeState {
  /** Whether the auth bridge is initialized */
  initialized: boolean;

  /** Whether authentication synchronization is active */
  syncActive: boolean;

  /** Current token refresh status */
  tokenRefreshStatus: "idle" | "refreshing" | "error";

  /** List of active subscriptions */
  subscriptions: BridgeSubscription[];
}

/**
 * Auth bridge API interface
 */
export interface AuthBridgeAPI {
  /** Get current user information */
  getCurrentUser(): any;

  /** Check if user is authenticated */
  isAuthenticated(): boolean;

  /** Check if user has a specific permission */
  hasPermission(permission: string): boolean;

  /** Check if user has a specific role */
  hasRole(role: string): boolean;

  /** Check if user has any of the specified roles */
  hasAnyRole(roles: string[]): boolean;

  /** Get authentication headers for API requests */
  getAuthHeaders(): Record<string, string>;

  /** Login with provided credentials */
  login(credentials: {
    username: string;
    password: string;
  }): Promise<BridgeResult<any>>;

  /** Logout current user */
  logout(): Promise<BridgeResult<void>>;

  /** Refresh user information from server */
  refreshUserInfo(): Promise<BridgeResult<any>>;

  /** Check if token is valid and refresh if needed */
  validateToken(): Promise<BridgeResult<boolean>>;

  /** Cleanup resources */
  dispose(): void;
}

/**
 * Default auth bridge configuration
 */
const DEFAULT_AUTH_CONFIG: Required<AuthBridgeConfig> = {
  enableTokenRefresh: true,
  syncPermissions: true,
};

/**
 * Initialize the auth bridge
 *
 * @param eventBus - The event bus for bridge communication
 * @param config - Auth bridge configuration
 * @returns Auth bridge API
 */
export function initAuthBridge(
  eventBus: TypedEventEmitter,
  config: AuthBridgeConfig = {},
): AuthBridgeAPI {
  // Merge with default configuration
  const mergedConfig: Required<AuthBridgeConfig> = {
    ...DEFAULT_AUTH_CONFIG,
    ...config,
  };

  logger.info("Initializing auth bridge", mergedConfig);

  // Initialize state
  const state: AuthBridgeState = {
    initialized: false,
    syncActive: false,
    tokenRefreshStatus: "idle",
    subscriptions: [],
  };

  // Get the auth store with fallbacks for robustness
  let authStore;
  try {
    authStore = useAuthStore();
    // Verify that critical methods exist
    if (
      !authStore ||
      typeof authStore.login !== "function" ||
      typeof authStore.logout !== "function"
    ) {
      logger.error(
        "Auth store improperly initialized or missing required methods",
      );
      throw new Error("Invalid auth store state");
    }
  } catch (err) {
    logger.error("Failed to initialize auth store", err);
    // Create a minimal fallback store to prevent crashes
    authStore = {
      user: null,
      token: null,
      isAuthenticated: false,
      error: "Auth store initialization failed",
      login: async () => false,
      logout: async () => {},
      hasPermission: () => false,
      hasRole: () => false,
      hasAnyRole: () => false,
      refreshUserInfo: async () => false,
      validateCurrentToken: async () => false,
      refreshTokenIfNeeded: async () => false,
      createAuthHeaders: () => ({}),
      initialize: () => {},
      $subscribe: () => () => {},
    };
  }

  /**
   * Setup legacy synchronization
   * This establishes two-way sync between modern Vue stores and legacy JS
   */
  function setupLegacySynchronization() {
    if (state.syncActive) {
      logger.warn("Auth synchronization already active");
      return;
    }

    state.syncActive = true;

    // Subscribe to modern auth store changes
    const storeUnwatch = authStore.$subscribe((mutation, pinia) => {
      // Only emit events when there's a meaningful state change
      if (mutation.type === "direct" || mutation.type === "patch function") {
        // Zusätzliche Prüfung auf null/undefined hinzugefügt
        if (
          mutation.payload &&
          ("user" in mutation.payload ||
            "isAuthenticated" in mutation.payload ||
            "token" in mutation.payload)
        ) {
          // Emit login/logout events based on authentication state change
          try {
            if (authStore.isAuthenticated) {
              // Stelle sicher, dass der User immer gültig ist
              const userToEmit = authStore.user || {
                id: "0",
                email: "unknown@example.com",
                username: "unknown",
                roles: ["user"],
              };
              eventBus.emit("auth:login", { user: userToEmit });
              logger.debug("Emitted auth:login event after store mutation");
            } else {
              eventBus.emit("auth:logout", undefined);
              logger.debug("Emitted auth:logout event after store mutation");
            }
          } catch (err) {
            logger.error(
              "Error emitting auth events during store subscription",
              err,
            );
          }
        }
      }
    });

    // Listen for legacy auth events
    const loginSub = eventBus.on("vanillaAuth:login", (payload) => {
      // Only sync if the data structure matches
      if (payload && payload.user && payload.token) {
        logger.debug("Received legacy login event", {
          userId: payload.user.id,
        });

        // Update the modern auth store with legacy data
        if (authStore.token !== payload.token) {
          // Use internal store methods to update without triggering events
          authStore.$patch({
            token: payload.token,
            refreshToken: payload.refreshToken || null,
            user: payload.user,
            expiresAt: payload.expiresAt || Date.now() + 24 * 60 * 60 * 1000,
          });

          // Initialize the auth store to set up token refresh
          authStore.initialize();
        }
      }
    });

    const logoutSub = eventBus.on("vanillaAuth:logout", () => {
      logger.debug("Received legacy logout event");

      // Log out from the modern store
      if (authStore.isAuthenticated) {
        authStore.logout();
      }
    });

    // Add subscriptions to state for later cleanup
    state.subscriptions.push(loginSub, logoutSub);

    // Add cleanup function for store unwatcher
    state.subscriptions.push({
      unsubscribe: storeUnwatch,
      pause: () => {},
      resume: () => {},
      id: "auth-store-unwatcher",
    });

    // Setup token refresh monitoring
    if (mergedConfig.enableTokenRefresh) {
      setupTokenRefresh();
    }

    logger.info("Auth synchronization established");
  }

  /**
   * Setup token refresh mechanism
   */
  function setupTokenRefresh() {
    // Setup interval to check token validity
    const tokenCheckInterval = window.setInterval(() => {
      if (authStore.isAuthenticated && authStore.isExpired) {
        refreshToken();
      }
    }, 60000); // Check every minute

    // Add interval cleanup to subscriptions
    state.subscriptions.push({
      unsubscribe: () => window.clearInterval(tokenCheckInterval),
      pause: () => {},
      resume: () => {},
      id: "token-refresh-interval",
    });

    // Listen for token expiry events
    const tokenExpiredSub = eventBus.on("auth:sessionExpired", async () => {
      logger.warn("Session expired, attempting token refresh");
      const result = await refreshToken();

      if (!result.success) {
        logger.error("Token refresh failed after session expiry", result.error);
        // Force logout when refresh fails
        authStore.logout();
        eventBus.emit("auth:logout", undefined);
      }
    });

    state.subscriptions.push(tokenExpiredSub);
  }

  /**
   * Refresh authentication token
   */
  async function refreshToken(): Promise<BridgeResult<boolean>> {
    if (state.tokenRefreshStatus === "refreshing") {
      logger.debug("Token refresh already in progress");
      return success(false);
    }

    state.tokenRefreshStatus = "refreshing";

    try {
      logger.debug("Refreshing authentication token");
      const refreshSuccess = await authStore.refreshTokenIfNeeded();

      if (refreshSuccess) {
        logger.debug("Token refresh successful");

        // Notify legacy system about the token update
        eventBus.emit("auth:tokenUpdated", {
          token: authStore.token,
          refreshToken: authStore.refreshToken,
          expiresAt: authStore.expiresAt,
        });

        state.tokenRefreshStatus = "idle";
        return success(true);
      } else {
        logger.warn("Token refresh failed");
        state.tokenRefreshStatus = "error";
        return failure("Failed to refresh token", "AUTH_REFRESH_FAILED");
      }
    } catch (error) {
      logger.error("Exception during token refresh", error);
      state.tokenRefreshStatus = "error";
      return failure(
        "Exception during token refresh",
        "AUTH_REFRESH_ERROR",
        { tokenRefreshStatus: state.tokenRefreshStatus },
        error,
      );
    }
  }

  /**
   * Initialize the auth bridge
   */
  function initialize() {
    if (state.initialized) {
      logger.warn("Auth bridge already initialized");
      return;
    }

    // Setup synchronization between modern and legacy systems
    setupLegacySynchronization();

    // Emit initialized event
    eventBus.emit("auth:initialized", {});

    // If user is already authenticated, emit login event
    if (authStore.isAuthenticated) {
      try {
        const userToEmit = authStore.user || {
          id: "0",
          email: "unknown@example.com",
          username: "unknown",
          roles: ["user"],
        };
        eventBus.emit("auth:login", { user: userToEmit });
        logger.debug("Emitted initial auth:login event");
      } catch (err) {
        logger.error("Error emitting initial auth:login event", err);
      }
    }

    state.initialized = true;
    logger.info("Auth bridge initialized");
  }

  /**
   * Cleanup auth bridge resources
   */
  function dispose() {
    logger.debug("Disposing auth bridge resources");

    // Unsubscribe from all events
    state.subscriptions.forEach((subscription: any) => {
      subscription.unsubscribe();
    });

    // Clear the state
    state.subscriptions = [];
    state.syncActive = false;
    state.initialized = false;

    logger.info("Auth bridge disposed");
  }

  // Public API
  const api: AuthBridgeAPI = {
    getCurrentUser() {
      return authStore.user;
    },

    isAuthenticated() {
      return authStore.isAuthenticated;
    },

    hasPermission(permission: string) {
      return authStore.hasPermission(permission);
    },

    hasRole(role: string) {
      return authStore.hasRole(role);
    },

    hasAnyRole(roles: string[]) {
      return authStore.hasAnyRole(roles);
    },

    getAuthHeaders() {
      return authStore.createAuthHeaders();
    },

    async login(credentials) {
      try {
        logger.debug("Initiating login", { username: credentials.username });

        const loginSuccess = await authStore.login({
          email: credentials.username, // Map to email field expected by the store
          password: credentials.password,
          rememberMe: true,
        });

        if (loginSuccess) {
          logger.info("Login successful", { userId: authStore.user?.id });

          // Emit auth:login event
          eventBus.emit("auth:login", { user: authStore.user });

          return success(authStore.user);
        } else {
          logger.warn("Login failed", { error: authStore.error });

          return failure(
            authStore.error || "Login failed",
            "AUTH_LOGIN_FAILED",
          );
        }
      } catch (error) {
        logger.error("Exception during login", error);

        return failure(
          "Exception during login",
          "AUTH_LOGIN_ERROR",
          {
            originalError:
              error instanceof Error ? error.message : String(error),
          },
          error,
        );
      }
    },

    async logout() {
      try {
        logger.debug("Initiating logout");

        await authStore.logout();

        // Emit auth:logout event
        eventBus.emit("auth:logout", undefined);

        logger.info("Logout successful");
        return success(undefined);
      } catch (error) {
        logger.error("Exception during logout", error);

        return failure(
          "Exception during logout",
          "AUTH_LOGOUT_ERROR",
          {
            originalError:
              error instanceof Error ? error.message : String(error),
          },
          error,
        );
      }
    },

    async refreshUserInfo() {
      try {
        logger.debug("Refreshing user information");

        const refreshSuccess = await authStore.refreshUserInfo();

        if (refreshSuccess) {
          logger.debug("User information refresh successful");

          // Emit user updated event
          const userToEmit = authStore.user || {
            id: "0",
            email: "unknown@example.com",
            username: "unknown",
            roles: ["user"],
          };
          eventBus.emit("auth:userUpdated", { user: userToEmit });

          return success(authStore.user);
        } else {
          logger.warn("User information refresh failed");

          return failure(
            "Failed to refresh user information",
            "AUTH_REFRESH_USER_FAILED",
          );
        }
      } catch (error) {
        logger.error("Exception during user information refresh", error);

        return failure(
          "Exception during user information refresh",
          "AUTH_REFRESH_USER_ERROR",
          {
            originalError:
              error instanceof Error ? error.message : String(error),
          },
          error,
        );
      }
    },

    async validateToken() {
      try {
        logger.debug("Validating authentication token");

        const isValid = await authStore.validateCurrentToken();

        logger.debug("Token validation result", { isValid });
        return success(isValid);
      } catch (error) {
        logger.error("Exception during token validation", error);

        return failure(
          "Exception during token validation",
          "AUTH_VALIDATE_TOKEN_ERROR",
          {
            originalError:
              error instanceof Error ? error.message : String(error),
          },
          error,
        );
      }
    },

    dispose,
  };

  // Initialize the auth bridge
  initialize();

  // Return the API
  return api;
}
