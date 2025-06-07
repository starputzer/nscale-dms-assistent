/**
 * Updated API Configuration using centralized routes
 *
 * This configuration uses the shared route definitions to ensure
 * consistency between frontend and backend.
 */

import {
  API_BASE_VERSIONED,
  API_ROUTES,
  buildApiUrl,
} from "@/shared/api-routes";

/**
 * Helper function for environment variables
 */
const getEnvVar = (name: string, defaultValue: string): string => {
  if (typeof import.meta !== "undefined" && import.meta.env) {
    return (import.meta.env[name] as string) || defaultValue;
  }
  return typeof window !== "undefined"
    ? defaultValue
    : (process?.env?.[name] as string) || defaultValue;
};

/**
 * Helper function for environment detection
 */
const getNodeEnv = (): string => {
  if (typeof import.meta !== "undefined" && import.meta.env) {
    return import.meta.env.MODE || "development";
  }
  return typeof window !== "undefined"
    ? "development"
    : process?.env?.NODE_ENV || "development";
};

/**
 * API Configuration using centralized routes
 */
export const API_CONFIG = {
  // Base URL is now imported from shared config
  BASE_URL: getEnvVar("VITE_API_BASE_URL", API_BASE_VERSIONED),

  // API Version is managed centrally
  API_VERSION: "", // No longer needed here

  // Authentication configuration
  AUTH: {
    TOKEN_PREFIX: "Bearer",
    STORAGE_KEYS: {
      ACCESS_TOKEN: "access_token",
      REFRESH_TOKEN: "refresh_token",
      TOKEN_EXPIRY: "token_expiry",
      USER: "user",
    },
  },

  // Timeouts
  TIMEOUTS: {
    DEFAULT: 30000,
    UPLOAD: 120000,
    QUERY: 10000,
    TOKEN_REFRESH: 5000,
  },

  // Retry configuration
  RETRY: {
    MAX_RETRIES: 3,
    BASE_DELAY: 1000,
    BACKOFF_FACTOR: 1.5,
    RETRY_STATUS_CODES: [408, 429, 500, 502, 503, 504],
    RETRY_NETWORK_ERRORS: true,
  },

  // Request queue configuration
  QUEUE: {
    MAX_CONCURRENT_REQUESTS: 6,
    MAX_QUEUE_SIZE: 100,
    PRIORITIES: {
      AUTH: 100,
      USER_ACTION: 80,
      FETCH: 50,
      BACKGROUND: 20,
    },
  },

  // Rate limiting
  RATE_LIMITING: {
    REMAINING_HEADER: "X-RateLimit-Remaining",
    RESET_HEADER: "X-RateLimit-Reset",
    LIMIT_HEADER: "X-RateLimit-Limit",
    THROTTLE_THRESHOLD: 5,
    MIN_THROTTLE_DELAY: 1000,
  },

  // Default parameters
  DEFAULT_PARAMS: {
    includeVersion: true,
    responseType: "json",
  },

  // Streaming configuration
  STREAMING: {
    DEFAULT_SSE_CONFIG: {
      withCredentials: true,
      heartbeatTimeout: 60000,
      retry: 3000,
    },
    CONNECTION_TIMEOUT: 10000,
    STREAMING_ENDPOINTS: [API_ROUTES.SESSION.STREAM(":sessionId")],
  },

  // Use centralized route definitions
  ENDPOINTS: {
    AUTH: {
      LOGIN: API_ROUTES.AUTH.LOGIN,
      LOGOUT: API_ROUTES.AUTH.LOGOUT,
      REFRESH: API_ROUTES.AUTH.REFRESH,
      USER: API_ROUTES.AUTH.USER,
    },
    CHAT: {
      SESSIONS: API_ROUTES.SESSION.LIST,
      SESSION: (id: string) => API_ROUTES.SESSION.GET(id),
      MESSAGES: (sessionId: string) => API_ROUTES.SESSION.MESSAGES(sessionId),
      MESSAGE: (sessionId: string, messageId: string) =>
        `${API_ROUTES.SESSION.MESSAGES(sessionId)}/${messageId}`,
      STREAM: (sessionId: string) => API_ROUTES.SESSION.STREAM(sessionId),
      ASK: API_ROUTES.SESSION.ASK,
    },
    DOCUMENTS: {
      UPLOAD: API_ROUTES.DOCUMENT.UPLOAD,
      CONVERT: API_ROUTES.DOCUMENT.CONVERT,
      DOCUMENT: (id: string) => API_ROUTES.DOCUMENT.GET(id),
    },
    SYSTEM: {
      INFO: API_ROUTES.ADMIN.SYSTEM.INFO,
      STATS: API_ROUTES.ADMIN.SYSTEM.STATS,
      HEALTH: API_ROUTES.SYSTEM.HEALTH,
    },
    FEEDBACK: {
      SUBMIT: API_ROUTES.FEEDBACK.SUBMIT,
    },
    ADMIN: {
      // User management
      USERS: API_ROUTES.ADMIN.USERS.LIST,
      USER: (id: string) => API_ROUTES.ADMIN.USERS.GET(id),

      // System
      SYSTEM: API_ROUTES.ADMIN.SYSTEM.INFO,
      STATS: API_ROUTES.ADMIN.SYSTEM.STATS,
      ACTIONS: API_ROUTES.ADMIN.SYSTEM.ACTIONS,
      CLEAR_CACHE: API_ROUTES.ADMIN.SYSTEM.CLEAR_CACHE,
      CLEAR_EMBEDDING_CACHE: API_ROUTES.ADMIN.SYSTEM.CLEAR_EMBEDDING_CACHE,
      CHECK: API_ROUTES.ADMIN.SYSTEM.CHECK,
      REINDEX: API_ROUTES.ADMIN.SYSTEM.REINDEX,
    },
    USERS: {
      LIST: API_ROUTES.ADMIN.USERS.LIST,
      COUNT: API_ROUTES.ADMIN.USERS.COUNT,
      DETAIL: API_ROUTES.ADMIN.USERS.LIST,
      CREATE: API_ROUTES.ADMIN.USERS.CREATE,
      UPDATE_ROLE: API_ROUTES.ADMIN.USERS.UPDATE_ROLE,
      DELETE: API_ROUTES.ADMIN.USERS.DELETE,
      STATS: API_ROUTES.ADMIN.USERS.STATS,
      ACTIVE: API_ROUTES.ADMIN.USERS.ACTIVE,
      LOCK: API_ROUTES.ADMIN.USERS.LOCK,
      UNLOCK: API_ROUTES.ADMIN.USERS.UNLOCK,
    },
    FEATURE_TOGGLES: {
      LIST: API_ROUTES.ADMIN.FEATURES.LIST,
      STATS: API_ROUTES.ADMIN.FEATURES.STATS,
      UPDATE: API_ROUTES.ADMIN.FEATURES.UPDATE,
      CREATE: API_ROUTES.ADMIN.FEATURES.CREATE,
      DELETE: API_ROUTES.ADMIN.FEATURES.DELETE,
    },
    MOTD: {
      CONFIG: API_ROUTES.SYSTEM.MOTD,
      UPDATE: API_ROUTES.ADMIN.MOTD.UPDATE,
      RELOAD: API_ROUTES.ADMIN.MOTD.RELOAD,
    },
    ADMIN_FEEDBACK: {
      STATS: API_ROUTES.ADMIN.FEEDBACK.STATS,
      NEGATIVE: API_ROUTES.ADMIN.FEEDBACK.NEGATIVE,
      UPDATE_STATUS: API_ROUTES.ADMIN.FEEDBACK.UPDATE,
      DELETE: API_ROUTES.ADMIN.FEEDBACK.DELETE,
      EXPORT: API_ROUTES.ADMIN.FEEDBACK.EXPORT,
      FILTER: API_ROUTES.ADMIN.FEEDBACK.FILTER,
    },
  },

  // Debug configuration
  DEBUG: {
    VERBOSE: getNodeEnv() === "development",
    LOG_REQUESTS: getNodeEnv() === "development",
    COLORIZED_LOGGING: true,
    INCLUDE_REQUEST_ID: true,
  },
};

/**
 * Environment-specific configuration overrides
 */
export const getEnvironmentConfig = () => {
  const config = { ...API_CONFIG };
  const nodeEnv = getNodeEnv();

  if (nodeEnv === "production") {
    config.DEBUG.VERBOSE = false;
    config.DEBUG.LOG_REQUESTS = false;
    config.RETRY.MAX_RETRIES = 2;
  } else if (nodeEnv === "test") {
    config.TIMEOUTS.DEFAULT = 5000;
    config.BASE_URL = "mock://api";
  } else {
    config.DEBUG.VERBOSE = true;
    config.DEBUG.LOG_REQUESTS = true;
    config.TIMEOUTS.DEFAULT = 60000;
  }

  return config;
};

/**
 * Final API configuration
 */
export const apiConfig = getEnvironmentConfig();

/**
 * Initialize API services
 */
export function initializeApiServices(): void {
  console.log("Initializing API services with centralized routes...");

  const config = getEnvironmentConfig();

<<<<<<< HEAD
  const _DEFAULT_HEADERS = {
=======
  const DEFAULT_HEADERS = {
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Client-Version": import.meta.env.VITE_APP_VERSION || "1.0.0",
    "X-Client-Platform": "web",
  };

  if (config.DEBUG.VERBOSE) {
    console.log("API Configuration:", config);
    console.log("Using routes from:", API_BASE_VERSIONED);
  }

  // Setup axios interceptors for auth
  import("axios")
    .then((axiosModule) => {
      const axios = axiosModule.default;

      axios.interceptors.request.use(
        (config: any) => {
          // Don't add auth header to login endpoint
          const loginPath = buildApiUrl(API_ROUTES.AUTH.LOGIN);
          if (!config.url?.includes(loginPath)) {
            const token = localStorage.getItem("nscale_access_token");
            if (token) {
              config.headers = config.headers || {};
              config.headers["Authorization"] = `Bearer ${token}`;
            }
          }

          return config;
        },
        (error: Error | unknown) => {
          console.error("Request interceptor error:", error);
          return Promise.reject(error);
        },
      );

      console.log("API services initialized successfully");
    })
    .catch((err) => {
      console.error("Failed to setup axios interceptors:", err);
    });
}

export default apiConfig;
