/**
 * @file Bridge System Entry Point
 * @description Consolidated bridge system for communication between Vue 3
 * components and legacy JavaScript code.
 *
 * @redundancy-analysis
 * This file provides a new unified entry point that consolidates functionality from:
 * - bridge/index.ts (original implementation)
 * - bridge/enhanced/index.ts
 * - bridge/enhanced/optimized/index.ts
 *
 * The implementation follows a modular approach to reduce redundancy and
 * improve maintainability.
 */

// Import core utilities
import type { BridgeConfig, BridgeAPI } from "./core/types";
import { DEFAULT_BRIDGE_CONFIG } from "./core/types";
import { eventBus } from "./core/eventBus";
import { logger } from "./core/logger";
import { success, failure, tryAsync } from "./core/results";

// Import bridge modules
import { initAuthBridge } from "./modules/auth";
import { initSessionsBridge } from "./modules/sessions";
import { initUIBridge } from "./modules/ui";

// Import diagnostics
import { initDiagnostics } from "./diagnostics";

/**
 * Bridge singleton instance
 */
let bridgeInstance: BridgeAPI | null = null;

/**
 * Flag indicating whether the bridge is initialized
 */
let isInitialized = false;

/**
 * Get the current bridge API instance
 *
 * @throws Error if the bridge is not initialized
 */
export function getBridge(): BridgeAPI {
  if (!bridgeInstance) {
    throw new Error("Bridge not initialized. Call initBridge() first.");
  }

  return bridgeInstance;
}

/**
 * Initialize the bridge system
 *
 * @param config Bridge configuration options
 * @returns Promise resolving to the bridge API instance
 */
export async function initBridge(
  config: Partial<BridgeConfig> = {},
): Promise<BridgeAPI> {
  // Skip initialization if already initialized
  if (isInitialized) {
    logger
      .namespace("bridge")
      .warn("Bridge already initialized, skipping initialization");
    return bridgeInstance!;
  }

  // Create logger
  const bridgeLogger = logger.namespace("bridge");

  // Merge with default configuration
  const mergedConfig: BridgeConfig = {
    ...DEFAULT_BRIDGE_CONFIG,
    ...config,
    modules: {
      ...DEFAULT_BRIDGE_CONFIG.modules,
      ...config.modules,
    },
    selfHealing: {
      ...DEFAULT_BRIDGE_CONFIG.selfHealing,
      ...config.selfHealing,
    },
    diagnostics: {
      ...DEFAULT_BRIDGE_CONFIG.diagnostics,
      ...config.diagnostics,
    },
  };

  // Set debug mode for the logger
  if (mergedConfig.debug) {
    logger.setMinLevel("debug");
  }

  // Log initialization
  bridgeLogger.info("Initializing bridge system", { config: mergedConfig });

  try {
    // Initialize bridge modules
    bridgeLogger.debug("Initializing bridge modules");

    // Initialize auth bridge
    const auth = initAuthBridge(eventBus, mergedConfig.modules?.auth || {});

    // Initialize sessions bridge
    const sessions = initSessionsBridge(
      eventBus,
      mergedConfig.modules?.sessions || {},
    );

    // Initialize UI bridge
    const ui = initUIBridge(eventBus, mergedConfig.modules?.ui || {});

    // Create a temporary bridge API for diagnostics initialization
    const tempBridge: BridgeAPI = {
      events: {
        emit: (eventType, payload) => eventBus.emit(eventType, payload),
        on: (eventType, handler) => eventBus.on(eventType, handler),
        once: (eventType, handler) => eventBus.once(eventType, handler),
      },
      stores: {
        getValue: () => undefined,
        setValue: () => failure("Not implemented", "NOT_IMPLEMENTED"),
        watch: () => ({
          id: "temp",
          unsubscribe: () => {},
          pause: () => {},
          resume: () => {},
        }),
      },
      status: {
        getStatus: () => ({}),
        getDiagnostics: () => ({}),
      },
      utils: {
        log: (level, message, ...args) =>
          logger.namespace("bridge:temp")[level](message, ...args),
        isFeatureEnabled: () => false,
      },
      auth: {
        getCurrentUser: () => null,
        isAuthenticated: () => false,
        hasPermission: () => false,
        hasRole: () => false,
        hasAnyRole: () => false,
        getAuthHeaders: () => ({}),
        login: async () => failure("Not implemented", "NOT_IMPLEMENTED"),
        logout: async () => failure("Not implemented", "NOT_IMPLEMENTED"),
        refreshUserInfo: async () =>
          failure("Not implemented", "NOT_IMPLEMENTED"),
        validateToken: async () =>
          failure("Not implemented", "NOT_IMPLEMENTED"),
        dispose: () => {},
      },
      sessions: {
        getCurrentSession: () => null,
        getSessions: () => [],
        getSession: () => null,
        getMessages: () => [],
        createSession: async () =>
          failure("Not implemented", "NOT_IMPLEMENTED"),
        updateSession: async () =>
          failure("Not implemented", "NOT_IMPLEMENTED"),
        deleteSession: async () =>
          failure("Not implemented", "NOT_IMPLEMENTED"),
        selectSession: async () =>
          failure("Not implemented", "NOT_IMPLEMENTED"),
        sendMessage: async () => failure("Not implemented", "NOT_IMPLEMENTED"),
        deleteMessage: async () =>
          failure("Not implemented", "NOT_IMPLEMENTED"),
        isSessionStreaming: () => false,
        getStreamingStatus: () => ({
          isActive: false,
          progress: 0,
          sessionId: null,
        }),
        dispose: () => {},
      },
      ui: {
        getTheme: () => ({ isDarkMode: false }),
        toggleDarkMode: () => failure("Not implemented", "NOT_IMPLEMENTED"),
        setDarkMode: () => failure("Not implemented", "NOT_IMPLEMENTED"),
        getSidebarState: () => ({ isOpen: false, width: 0, activeTab: null }),
        toggleSidebar: () => failure("Not implemented", "NOT_IMPLEMENTED"),
        openModal: () => failure("Not implemented", "NOT_IMPLEMENTED"),
        closeModal: () => failure("Not implemented", "NOT_IMPLEMENTED"),
        showConfirmation: async () =>
          failure("Not implemented", "NOT_IMPLEMENTED"),
        showToast: () => failure("Not implemented", "NOT_IMPLEMENTED"),
        dismissToast: () => failure("Not implemented", "NOT_IMPLEMENTED"),
        setLoading: () => failure("Not implemented", "NOT_IMPLEMENTED"),
        getViewMode: () => "default",
        setViewMode: () => failure("Not implemented", "NOT_IMPLEMENTED"),
        dispose: () => {},
      },
      dispose: () => {},
    };

    // Initialize diagnostics with temporary bridge API
    const diagnostics = initDiagnostics(
      tempBridge,
      eventBus,
      mergedConfig.diagnostics || {},
    );

    // Create bridge API
    bridgeInstance = {
      // Event methods
      events: {
        emit: (eventType, payload) => {
          eventBus.emit(eventType, payload);
        },
        on: (eventType, handler) => {
          return eventBus.on(eventType, handler);
        },
        once: (eventType, handler) => {
          return eventBus.once(eventType, handler);
        },
      },

      // Store methods
      stores: {
        getValue: (storeName, path) => {
          // Delegate to appropriate module
          switch (storeName) {
            case "auth":
              return auth.getValue(path);
            case "sessions":
              return sessions.getValue(path);
            case "ui":
              return ui.getValue(path);
            default:
              bridgeLogger.warn(`Unknown store: ${storeName}`);
              return undefined;
          }
        },
        setValue: (storeName, path, value) => {
          // Delegate to appropriate module
          switch (storeName) {
            case "auth":
              return auth.setValue(path, value);
            case "sessions":
              return sessions.setValue(path, value);
            case "ui":
              return ui.setValue(path, value);
            default:
              return failure(`Unknown store: ${storeName}`, "UNKNOWN_STORE");
          }
        },
        watch: (storeName, path, handler) => {
          // Delegate to appropriate module
          switch (storeName) {
            case "auth":
              return auth.watch(path, handler);
            case "sessions":
              return sessions.watch(path, handler);
            case "ui":
              return ui.watch(path, handler);
            default:
              bridgeLogger.warn(`Unknown store: ${storeName}`);
              return {
                id: "invalid",
                unsubscribe: () => {},
                pause: () => {},
                resume: () => {},
              };
          }
        },
      },

      // Status methods
      status: {
        getStatus: () => {
          return {
            auth: auth.getStatus(),
            sessions: sessions.getStatus(),
            ui: ui.getStatus(),
          };
        },
        getDiagnostics: () => {
          return diagnostics.getDiagnostics();
        },
      },

      // Utility methods
      utils: {
        log: (level, message, ...args) => {
          logger.namespace("bridge:api")[level](message, ...args);
        },
        isFeatureEnabled: (featureName) => {
          return false; // TODO: Implement feature flags
        },
      },

      // Module-specific methods
      auth: {
        getCurrentUser: auth.getCurrentUser,
        isAuthenticated: auth.isAuthenticated,
        hasPermission: auth.hasPermission,
      },
      sessions: {
        getCurrentSession: sessions.getCurrentSession,
        getSessions: sessions.getSessions,
        getMessages: sessions.getMessages,
      },
      ui: {
        showToast: ui.showToast,
        showModal: ui.openModal,
        closeModal: ui.closeModal,
      },

      // Cleanup and disposal
      dispose: () => {
        // Clean up all modules
        auth.dispose();
        sessions.dispose();
        ui.dispose();
        diagnostics.dispose();

        // Clean up event bus
        eventBus.pause();

        // Reset initialization status
        isInitialized = false;
        bridgeInstance = null;
      },
    };

    // Expose global API if configured
    if (mergedConfig.exposeGlobal) {
      const globalPath = mergedConfig.globalPath || "nscale.bridge";

      // Parse path and ensure objects exist
      const parts = globalPath.split(".");
      let current: any = window;

      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) {
          current[parts[i]] = {};
        }
        current = current[parts[i]];
      }

      // Set global object
      current[parts[parts.length - 1]] = bridgeInstance;

      // Add backward compatibility
      window.__BRIDGE_INITIALIZED = true;
      window.__BRIDGE_API = bridgeInstance;
    }

    // Mark as initialized
    isInitialized = true;

    // Emit initialized event
    eventBus.emit("bridge:initialized", undefined);

    // Log success
    bridgeLogger.info("Bridge system initialized successfully");

    return bridgeInstance;
  } catch (error) {
    // Log error
    bridgeLogger.error("Failed to initialize bridge system", error);

    // Emit error event
    eventBus.emit("bridge:error", {
      code: "BRIDGE_INITIALIZATION_ERROR",
      message: "Failed to initialize bridge system",
      cause: error,
    });

    // Rethrow error
    throw error;
  }
}

/**
 * Reset the bridge system (for testing)
 */
export function resetBridge(): void {
  if (bridgeInstance) {
    bridgeInstance.dispose();
  }

  bridgeInstance = null;
  isInitialized = false;
}

/**
 * Check if the bridge is initialized
 */
export function isBridgeInitialized(): boolean {
  return isInitialized;
}

// Export core utilities for direct use
export { eventBus, logger, success, failure, tryAsync };

// Export type definitions
export * from "./core/types";

// Re-export module interfaces for direct use
export type { AuthBridgeAPI } from "./modules/auth";
export type { SessionsBridgeAPI } from "./modules/sessions";
export type { UIBridgeAPI } from "./modules/ui";
