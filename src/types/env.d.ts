/**
 * TypeScript declarations for the environment
 */

/**
 * Vite environment variables
 */
interface ImportMetaEnv {
  /** The mode the app is running in */
  readonly MODE: "development" | "production" | "test";
  /** The base URL the app is being served from */
  readonly BASE_URL: string;
  /** Application version from package.json */
  readonly VITE_APP_VERSION: string;
  /** Application environment (dev, staging, production) */
  readonly VITE_APP_ENV: "development" | "staging" | "production";
  /** API base URL */
  readonly VITE_API_BASE: string;
  /** Whether to enable debug logging */
  readonly VITE_ENABLE_DEBUG: string;
  /** Feature flags from environment */
  readonly VITE_FEATURE_FLAGS: string;
  /** Model endpoint for NScale Assistant */
  readonly VITE_MODEL_ENDPOINT?: string;
  /** Auth service URL */
  readonly VITE_AUTH_SERVICE?: string;
  /** Document converter service URL */
  readonly VITE_DOC_CONVERTER_URL?: string;
}

/**
 * Import meta for Vite
 */
interface ImportMeta {
  /** Environment variables exposed to the client */
  readonly env: ImportMetaEnv;
  /** Hot module replacement */
  readonly hot?: {
    /** Accept updated module */
    accept(): void;
    /** Accept dependencies of the module */
    accept(dep: string, callback: (mod: any) => void): void;
    /** Accept dependencies and self */
    accept(deps: string[], callback: (mods: any[]) => void): void;
    /** Display message in the console */
    data: any;
  };
  /** Current module URL */
  readonly url: string;
  /** Glob imports */
  glob(pattern: string): Record<string, () => Promise<any>>;
  /** Glob imports with eager loading */
  globEager(pattern: string): Record<string, any>;
}

/**
 * Global window extensions
 */
interface Window {
  APP_CONFIG: {
    buildVersion: string;
    environment: string;
    apiBase: string;
    features: Record<string, boolean>;
  };

  // Telemetry tracking
  telemetry: {
    trackEvent: (name: string, props?: Record<string, any>) => void;
    trackError: (error: Error | unknown, props?: Record<string, any>) => void;
    trackPerformance: (
      name: string,
      duration: number,
      props?: Record<string, any>,
    ) => void;
  };

  // Source references feature
  isSourceReferencesVisible: (message: any) => boolean;
  toggleSourceReferences: () => void;
  getSourceReferences: () => any[];
  __sourceReferencesComposable: {
    isSourceReferencesVisible: () => boolean;
    toggleSourceReferences: () => void;
  };

  // Bridge for legacy code integration
  __BRIDGE_INITIALIZED: boolean;
  __BRIDGE_EVENTS: Record<string, any[]>;
  __dispatchBridgeEvent: (eventName: string, data: any) => void;
  __registerBridgeHandler: (
    eventName: string,
    handler: (data: any) => void,
  ) => void;

  // Feature flags
  __FEATURE_FLAGS: Record<string, boolean>;
  __isFeatureEnabled: (featureName: string) => boolean;
}

/**
 * Global NodeJS extensions
 */
interface NodeJS {
  process: {
    env: {
      NODE_ENV: "development" | "production" | "test";
    };
  };
}
