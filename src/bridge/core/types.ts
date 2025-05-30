/**
 * @file Bridge System Core Types
 * @description Centralized type definitions for the bridge system, providing
 * a single source of truth for all bridge-related data structures.
 *
 * @redundancy-analysis
 * This file consolidates bridge types previously scattered across:
 * - bridge/index.ts
 * - bridge/enhanced/types.ts
 * - bridge/enhanced/optimized/types.ts
 */

/**
 * Bridge configuration options
 */
export interface BridgeConfig {
  /** Debug mode enables additional logging */
  debug?: boolean;

  /** Enables selective synchronization for improved performance */
  enableSelectiveSync?: boolean;

  /** Enables batched event processing */
  enableBatchedEvents?: boolean;

  /** Timeout for batched events in milliseconds */
  batchTimeoutMs?: number;

  /** Maximum number of events to process in a single batch */
  maxBatchSize?: number;

  /** Throttle interval for high-frequency events in milliseconds */
  throttleIntervalMs?: number;

  /** Configuration for bridge modules */
  modules?: {
    /** Auth module configuration */
    auth?: AuthBridgeConfig;

    /** Sessions module configuration */
    sessions?: SessionsBridgeConfig;

    /** UI module configuration */
    ui?: UIBridgeConfig;
  };

  /** Expose bridge API on window object */
  exposeGlobal?: boolean;

  /** Global object path for exposing bridge API */
  globalPath?: string;

  /** Self-healing configuration */
  selfHealing?: SelfHealingConfig;

  /** Diagnostics configuration */
  diagnostics?: DiagnosticsConfig;
  
  /** Enable fallback mechanisms */
  FALLBACK_ENABLED?: boolean;
  
  /** Error tolerance level */
  ERROR_TOLERANCE?: 'low' | 'medium' | 'high';
  
  /** Maximum retry attempts for failed operations */
  MAX_RETRY_ATTEMPTS?: number;
}

/**
 * Auth bridge configuration
 */
export interface AuthBridgeConfig {
  /** Enable token refresh functionality */
  enableTokenRefresh?: boolean;

  /** Synchronize permissions between systems */
  syncPermissions?: boolean;
}

/**
 * Sessions bridge configuration
 */
export interface SessionsBridgeConfig {
  /** Maximum number of sessions to keep in memory */
  maxCachedSessions?: number;

  /** Enable message streaming */
  enableStreaming?: boolean;

  /** Enable optimistic updates */
  enableOptimisticUpdates?: boolean;
}

/**
 * UI bridge configuration
 */
export interface UIBridgeConfig {
  /** Synchronize theme settings */
  syncTheme?: boolean;

  /** Synchronize toast notifications */
  syncToasts?: boolean;

  /** Synchronize modal dialogs */
  syncModals?: boolean;
}

/**
 * Self-healing configuration
 */
export interface SelfHealingConfig {
  /** Enable automatic recovery from errors */
  enabled?: boolean;

  /** Maximum number of recovery attempts */
  maxRecoveryAttempts?: number;

  /** Delay between recovery attempts in milliseconds */
  recoveryDelayMs?: number;
}

/**
 * Diagnostics configuration
 */
export interface DiagnosticsConfig {
  /** Enable performance monitoring */
  enablePerformanceMonitoring?: boolean;

  /** Enable memory monitoring */
  enableMemoryMonitoring?: boolean;

  /** Enable event logging */
  enableEventLogging?: boolean;

  /** Maximum number of events to keep in history */
  maxEventHistory?: number;
}

/**
 * Bridge event with typed payload
 */
export interface BridgeEvent<T = any> {
  /** Event type identifier */
  type: string;

  /** Event payload data */
  payload: T;

  /** Event timestamp */
  timestamp: number;

  /** Event source identifier */
  source?: string;

  /** Event priority */
  priority?: "high" | "normal" | "low";

  /** Event metadata */
  meta?: Record<string, any>;
}

/**
 * Bridge event handler function
 */
export type BridgeEventHandler<T = any> = (
  payload: T,
  meta?: Record<string, any>,
) => void;

/**
 * Subscription object returned when subscribing to events
 */
export interface BridgeSubscription {
  /** Unsubscribe from the event */
  unsubscribe: () => void;

  /** Pause event handling temporarily */
  pause: () => void;

  /** Resume event handling after pausing */
  resume: () => void;

  /** Subscription identifier */
  id: string;
}

/**
 * Bridge operation result with standardized error handling
 */
export interface BridgeResult<T> {
  /** Operation success status */
  success: boolean;

  /** Result data when successful */
  data?: T;

  /** Error information when unsuccessful */
  error?: BridgeError;
}

/**
 * Bridge error information
 */
export interface BridgeError {
  /** Error code */
  code: string;

  /** Error message */
  message: string;

  /** Original error if available */
  cause?: Error | unknown;

  /** Additional error details */
  details?: Record<string, any>;
}

/**
 * Bridge component status information
 */
export interface BridgeComponentStatus {
  /** Component status */
  status: "healthy" | "degraded" | "error";

  /** Last update timestamp */
  lastUpdated: number;

  /** Error details if status is 'error' */
  error?: BridgeError;

  /** Performance metrics */
  metrics?: {
    /** Event processing time in milliseconds */
    eventProcessingTime?: number;

    /** State update time in milliseconds */
    stateUpdateTime?: number;

    /** Memory usage in bytes */
    memoryUsage?: number;

    /** Number of garbage collections */
    gcCollections?: number;
  };
}

/**
 * Bridge API interface
 */
export interface BridgeAPI {
  /** Event methods */
  events: {
    /** Emit an event */
    emit<T>(eventType: string, payload: T): void;

    /** Subscribe to an event */
    on<T>(
      eventType: string,
      handler: BridgeEventHandler<T>,
    ): BridgeSubscription;

    /** Subscribe to an event once */
    once<T>(
      eventType: string,
      handler: BridgeEventHandler<T>,
    ): BridgeSubscription;
  };

  /** Store methods */
  stores: {
    /** Get a store value */
    getValue<T = any>(storeName: string, path: string): T | undefined;

    /** Set a store value */
    setValue<T = any>(
      storeName: string,
      path: string,
      value: T,
    ): BridgeResult<void>;

    /** Watch for store value changes */
    watch<T = any>(
      storeName: string,
      path: string,
      handler: (newValue: T, oldValue: T) => void,
    ): BridgeSubscription;
  };

  /** Status methods */
  status: {
    /** Get bridge status information */
    getStatus(): Record<string, BridgeComponentStatus>;

    /** Get diagnostic information */
    getDiagnostics(): Record<string, any>;
  };

  /** Utility methods */
  utils: {
    /** Log a message through the bridge */
    log(
      level: "debug" | "info" | "warn" | "error",
      message: string,
      ...args: any[]
    ): void;

    /** Check if a feature is enabled */
    isFeatureEnabled(featureName: string): boolean;
  };

  /** Authentication methods */
  auth: {
    /** Get current user information */
    getCurrentUser(): any;

    /** Check if user is authenticated */
    isAuthenticated(): boolean;

    /** Check if user has a specific permission */
    hasPermission(permission: string): boolean;
  };

  /** Session methods */
  sessions: {
    /** Get current session information */
    getCurrentSession(): any;

    /** Get list of sessions */
    getSessions(): any[];

    /** Get messages for a session */
    getMessages(sessionId: string): any[];
  };

  /** UI methods */
  ui: {
    /** Show a toast notification */
    showToast(message: string, type?: string, options?: any): void;

    /** Show a modal dialog */
    showModal(options: any): string;

    /** Close a modal dialog */
    closeModal(id: string): void;
  };

  /** Cleanup and disposal */
  dispose(): void;
}

/**
 * Map of event names to payload types
 */
export interface BridgeEventMap {
  /** Bridge lifecycle events */
  "bridge:initialized": void;
  "bridge:error": BridgeError;
  "bridge:statusChanged": Record<string, BridgeComponentStatus>;

  /** Authentication events */
  "auth:login": { user: any };
  "auth:logout": void;
  "auth:sessionExpired": void;

  /** Session events */
  "session:created": { session: any };
  "session:updated": { session: any };
  "session:deleted": { sessionId: string };
  "session:selected": { sessionId: string };

  /** Message events */
  "message:sent": { message: any; sessionId: string };
  "message:received": { message: any; sessionId: string };
  "message:updated": { message: any; sessionId: string };
  "message:deleted": { messageId: string; sessionId: string };

  /** UI events */
  "ui:themeChanged": { isDarkMode: boolean };
  "ui:sidebarToggled": { isOpen: boolean };
  "ui:viewChanged": { view: string };

  /** Custom events - add your own events here */
  [key: string]: any;
}

/**
 * Type-safe event emitter
 */
export interface TypedEventEmitter {
  /** Emit a typed event */
  emit<K extends keyof BridgeEventMap>(
    eventType: K,
    payload: BridgeEventMap[K],
  ): void;

  /** Subscribe to a typed event */
  on<K extends keyof BridgeEventMap>(
    eventType: K,
    handler: BridgeEventHandler<BridgeEventMap[K]>,
  ): BridgeSubscription;

  /** Subscribe to a typed event once */
  once<K extends keyof BridgeEventMap>(
    eventType: K,
    handler: BridgeEventHandler<BridgeEventMap[K]>,
  ): BridgeSubscription;
}

/**
 * Default bridge configuration
 */
export const DEFAULT_BRIDGE_CONFIG: BridgeConfig = {
  debug: false,
  enableSelectiveSync: true,
  enableBatchedEvents: true,
  batchTimeoutMs: 50,
  maxBatchSize: 100,
  throttleIntervalMs: 16,
  exposeGlobal: false,
  globalPath: "nscale.bridge",
  selfHealing: {
    enabled: true,
    maxRecoveryAttempts: 3,
    recoveryDelayMs: 1000,
  },
  diagnostics: {
    enablePerformanceMonitoring: true,
    enableMemoryMonitoring: true,
    enableEventLogging: false,
    maxEventHistory: 100,
  },
};
