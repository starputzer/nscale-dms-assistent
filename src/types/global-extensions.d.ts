/**
 * Global type definitions for the nscale DMS Assistant
 *
 * This file consolidates all global interfaces and type extensions
 * used across the application, ensuring type safety for global objects
 * and built-in interfaces.
 */

/**
 * Window object extensions
 */
interface Window {
  /**
   * nScale UI interface for global access to UI utilities
   */
  nscaleUI?: {
    showToast: (message: string, type?: string, options?: any) => void;
    showModal?: (options: any) => void;
    hideModal?: (id: string) => void;
    [key: string]: any;
  };

  /**
   * Application configuration
   */
  APP_CONFIG: {
    /** Current build version */
    buildVersion: string;
    /** Environment (development, staging, production) */
    environment: string;
    /** API base URL */
    apiUrl?: string;
    /** Feature flags */
    features?: Record<string, boolean>;
    /** Whether to use mock API */
    USE_MOCK_API?: boolean;
  };

  /**
   * Telemetry tracking capabilities
   */
  telemetry: {
    /** Track a user or system event */
    trackEvent: (name: string, props?: Record<string, any>) => void;
    /** Track an error occurrence */
    trackError: (error: Error | unknown, props?: Record<string, any>) => void;
    /** Track a performance measurement */
    trackPerformance: (
      name: string,
      duration: number,
      props?: Record<string, any>,
    ) => void;
  };

  /**
   * Source references functionality
   */
  isSourceReferencesVisible: (message: any) => boolean;
  isLoadingSourceReferences?: (message: any) => boolean;
  getSourceReferences: () => any[];
  isSourceDetailOpen?: (message: any, sourceIndex: number) => boolean;
  toggleSourceDetail?: (message: any, sourceIndex: number) => void;
  toggleSourceReferences: () => void | Promise<void>;
  hasSourceReferences?: (content: string) => boolean;
  showSourcePopupHandler?: (
    event: MouseEvent,
    sourceId: string,
  ) => void | Promise<void>;
  closeSourcePopup?: () => void;
  __sourceReferencesComposable: {
    isSourceReferencesVisible: () => boolean;
    toggleSourceReferences: () => void;
  };

  /**
   * Bridge for legacy code integration
   */
  __BRIDGE_INITIALIZED?: boolean;
  __BRIDGE_EVENTS?: Record<string, any[]>;
  __dispatchBridgeEvent?: (eventName: string, data: any) => void;
  __registerBridgeHandler?: (
    eventName: string,
    handler: (data: any) => void,
  ) => void;

  /**
   * Service instances for legacy code
   */
  $chatService?: any;

  /**
   * Event bus (legacy)
   */
  eventBus?: {
    on: (event: string, callback: (...args: any[]) => void) => void;
    emit: (event: string, ...args: any[]) => void;
    off: (event: string, callback?: (...args: any[]) => void) => void;
  };

  /**
   * Original dialog functions (for restoration after overriding)
   */
  __originalConfirm?: (message?: string) => boolean;
  __originalPrompt?: (message?: string, defaultValue?: string) => string | null;
  __originalAlert?: (message?: any) => void;

  /**
   * Error reporting service
   */
  errorReportingService?: {
    captureError(
      error: Error,
      options?: {
        tags?: Record<string, string>;
        extra?: Record<string, any>;
        level?: "info" | "warning" | "error" | "fatal";
      },
    ): void;
    captureMessage(message: string, options?: any): void;
    setTags(tags: Record<string, string>): void;
    setUser(user: { id?: string; email?: string; username?: string }): void;
  };

  /**
   * Cache invalidation
   */
  clearAppCache?: () => Promise<void>;

  /**
   * Feature toggles
   */
  __FEATURE_FLAGS?: Record<string, boolean>;
  __isFeatureEnabled?: (featureName: string) => boolean;

  /**
   * Feature toggle system event listeners
   */
  addEventListener(
    type: "feature-toggle-change",
    listener: (
      event: CustomEvent<{
        feature: string;
        enabled: boolean;
        source: "user" | "system" | "api";
      }>,
    ) => void,
  ): void;

  /**
   * Streaming event cancellation
   */
  addEventListener(
    type: "cancel-streaming",
    listener: (event: CustomEvent) => void,
  ): void;
}

/**
 * Global Bridge namespace
 */
declare namespace Bridge {
  function getSession(): any;
  function getUser(): any;
  function navigateTo(route: string): void;
  function refreshData(): Promise<void>;
}

/**
 * Type definition for useSourceReferences composable
 */
interface SourceReferencesComposable {
  visibleSourceReferences: any;
  openSourceDetails: any;
  messageSourceReferences: any;
  isLoadingReferences: any;
  showSourcePopup: any;
  sourcePopupContent: any;
  sourcePopupPosition: any;
  showExplanationDialog: any;
  currentExplanation: any;
  explanationLoading: any;
  hasSourceReferences: (content: string) => boolean;
  isSourceReferencesVisible: (message: any) => boolean;
  isLoadingSourceReferences: (message: any) => boolean;
  getSourceReferences: (message: any) => any[];
  isSourceDetailOpen: (message: any, sourceIndex: number) => boolean;
  toggleSourceDetail: (message: any, sourceIndex: number) => void;
  toggleSourceReferences: (message: any) => Promise<void>;
  showSourcePopupHandler: (
    event: MouseEvent,
    sourceId: string,
  ) => Promise<void>;
  closeSourcePopup: () => void;
  loadExplanation: (message: any) => Promise<void>;
  showSourcesDialog: (message: any) => void;
  closeExplanationDialog: () => void;
}

/**
 * Web API extensions
 */
interface RequestInit {
  priority?: "high" | "low" | "auto";
}

/**
 * Fetch API extensions
 */
interface Headers {
  /** Get all header values for a specified name */
  getAll?: (name: string) => string[];
}
