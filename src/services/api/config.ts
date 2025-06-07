/**
 * API-Konfiguration für den nscale DMS Assistenten
 *
 * Temporäre Version ohne shared routes
 */

const getEnvVar = (name: string, defaultValue: string): string => {
  if (typeof import.meta !== "undefined" && import.meta.env) {
    return (import.meta.env[name] as string) || defaultValue;
  }
  return typeof window !== "undefined"
    ? defaultValue
    : (process?.env?.[name] as string) || defaultValue;
};

const getNodeEnv = (): string => {
  if (typeof import.meta !== "undefined" && import.meta.env) {
    return import.meta.env.MODE || "development";
  }
  return typeof window !== "undefined"
    ? "development"
    : process?.env?.NODE_ENV || "development";
};

export const API_CONFIG = {
  BASE_URL: getEnvVar("VITE_API_BASE_URL", "/api"),
  API_VERSION: getEnvVar("VITE_API_VERSION", ""),

  AUTH: {
    TOKEN_PREFIX: "Bearer",
    STORAGE_KEYS: {
      ACCESS_TOKEN: "access_token",
      REFRESH_TOKEN: "refresh_token",
      TOKEN_EXPIRY: "token_expiry",
      USER: "user",
    },
  },

  TIMEOUTS: {
    DEFAULT: 30000,
    UPLOAD: 120000,
    QUERY: 10000,
    TOKEN_REFRESH: 5000,
  },

  RETRY: {
    MAX_RETRIES: 3,
    BASE_DELAY: 1000,
    BACKOFF_FACTOR: 1.5,
    RETRY_STATUS_CODES: [408, 429, 500, 502, 503, 504],
    RETRY_NETWORK_ERRORS: true,
  },

  QUEUE: {
    MAX_CONCURRENT_REQUESTS: 6,
    MAX_QUEUE_SIZE: 100,
    PRIORITIES: {
      AUTH: 100,
      ADMIN: 90,
      USER_ACTION: 80,
      FETCH: 50,
      BACKGROUND: 20,
    },
  },

  RATE_LIMITING: {
    REMAINING_HEADER: "X-RateLimit-Remaining",
    RESET_HEADER: "X-RateLimit-Reset",
    LIMIT_HEADER: "X-RateLimit-Limit",
    THROTTLE_THRESHOLD: 5,
    MIN_THROTTLE_DELAY: 1000,
  },

  DEFAULT_PARAMS: {
    includeVersion: true,
    responseType: "json",
  },

  STREAMING: {
    DEFAULT_SSE_CONFIG: {
      withCredentials: true,
      heartbeatTimeout: 60000,
      retry: 3000,
    },
    CONNECTION_TIMEOUT: 10000,
    STREAMING_ENDPOINTS: ["/api/chat/stream", "/api/sessions/:sessionId/stream"],
  },

  ENDPOINTS: {
    AUTH: {
      LOGIN: "/api/auth/login",
      LOGOUT: "/api/auth/logout",
      REFRESH: "/api/auth/refresh",
      USER: "/api/auth/user",
      REGISTER: "/api/auth/register",
    },
    CHAT: {
      SESSIONS: "/api/chat/sessions",
      SESSION: (id: string) => `/api/chat/sessions/${id}`,
      MESSAGES: (sessionId: string) => `/api/chat/sessions/${sessionId}/messages`,
      MESSAGE: (sessionId: string, messageId: string) =>
        `/api/chat/sessions/${sessionId}/messages/${messageId}`,
      STREAM: (sessionId: string) => `/api/chat/sessions/${sessionId}/stream`,
    },
    DOCUMENTS: {
      UPLOAD: "/api/documents/upload",
      CONVERT: "/api/documents/convert",
      DOCUMENT: (id: string) => `/api/documents/${id}`,
    },
    SYSTEM: {
      INFO: "/api/system/info",
      STATS: "/api/system/info",  // Using info endpoint which provides system stats
      HEALTH: "/api/system/health",
    },
    FEEDBACK: {
      SUBMIT: "/api/feedback",
    },
    ADMIN: {
      USERS: "/api/admin/users",
      USER: (id: string) => `/api/admin/users/${id}`,
      SYSTEM: "/api/admin/system",
      STATS: "/api/system/info",  // Using system info endpoint
      ACTIONS: "/api/system/actions",
      CLEAR_CACHE: "/api/system/cache/clear",
      CLEAR_EMBEDDING_CACHE: "/api/admin/clear-embedding-cache",
      CHECK: "/api/system/check",
      REINDEX: "/api/admin/reindex",
    },
    USERS: {
      LIST: "/api/admin/users",
      COUNT: "/api/admin/users/count",
      DETAIL: "/api/admin/users",
      CREATE: "/api/admin/users",
      UPDATE_ROLE: "/api/admin/users",
      DELETE: "/api/admin/users",
      STATS: "/api/admin/users/stats",
      ACTIVE: "/api/admin/users/active",
      LOCK: "/api/admin/users",
      UNLOCK: "/api/admin/users",
    },
    FEATURE_TOGGLES: {
      LIST: "/api/admin/feature-toggles",
      STATS: "/api/admin/feature-toggles/stats",
      UPDATE: "/api/admin/feature-toggles",
      CREATE: "/api/admin/feature-toggles",
      DELETE: "/api/admin/feature-toggles",
    },
    MOTD: {
      CONFIG: "/api/motd",
      UPDATE: "/api/admin/update-motd",
      RELOAD: "/api/admin/reload-motd",
    },
    ADMIN_FEEDBACK: {
      LIST: "/api/admin/feedback",
      STATS: "/api/admin/feedback/stats",
      NEGATIVE: "/api/admin/feedback/negative",
      UPDATE_STATUS: "/api/admin/feedback",
      DELETE: "/api/admin/feedback",
      EXPORT: "/api/admin/feedback/export",
      FILTER: "/api/admin/feedback/filter",
    },
  },

  DEBUG: {
    VERBOSE: getNodeEnv() === "development",
    LOG_REQUESTS: getNodeEnv() === "development",
    COLORIZED_LOGGING: true,
    INCLUDE_REQUEST_ID: true,
  },
};

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

export const apiConfig = getEnvironmentConfig();

export function initializeApiServices(): void {
  console.log("API-Services werden initialisiert...");

  const config = getEnvironmentConfig();

  const defaultHeaders = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Client-Version": import.meta.env.VITE_APP_VERSION || "1.0.0",
    "X-Client-Platform": "web",
  };

  if (config.DEBUG.VERBOSE) {
    console.log("API-Konfiguration geladen:", config);
    console.log("Standardheader konfiguriert:", defaultHeaders);
  }

  const urlParams = new URLSearchParams(window.location.search);
  const disableCache = urlParams.get("noCache") === "true";

  if (disableCache) {
    console.log("API-Cache wurde über URL-Parameter deaktiviert");
    Object.assign(defaultHeaders, {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    });
  }

  import("axios")
    .then((axiosModule) => {
      const axios = axiosModule.default;

      axios.interceptors.request.use(
        (config: any) => {
          if (!config.url?.includes("/login")) {
            const token = localStorage.getItem("nscale_access_token");
            if (token) {
              config.headers = config.headers || {};
              config.headers["Authorization"] = `Bearer ${token}`;
            }
          }

          if (config.url?.includes("/login")) {
            console.log("Überprüfe Login-Anfrage:", config);

            if (typeof config.data === "string") {
              try {
                config.data = JSON.parse(config.data);
              } catch (e) {
                console.warn(
                  "Login-Daten waren kein gültiges JSON, konvertiere zu Objekt",
                );

                if (config.data.includes("@")) {
                  console.log(
                    "String könnte eine E-Mail sein, konvertiere zu Login-Objekt",
                  );
                  config.data = {
                    email: config.data,
                    password: "123",
                  };
                }
              }
            }

            if (config.params && typeof config.params.email === "string") {
              console.log(
                "Email-Parameter erkannt, konvertiere zu Objekt:",
                config.params.email,
              );
              config.data = {
                email: config.params.email,
                password: config.params.password || "123",
              };
              delete config.params.email;
              delete config.params.password;
            }

            if (config.headers) {
              config.headers["Content-Type"] = "application/json";
            }

            console.log("Login-Anfrage nach Überprüfung:", config);
          }

          return config;
        },
        (error: Error | unknown) => {
          console.error("Axios-Request-Interceptor-Fehler:", error);
          return Promise.reject(error);
        },
      );

      console.log("Axios-Interceptors für API-Anfragen eingerichtet");
    })
    .catch((err) => {
      console.error("Fehler beim Importieren von Axios für Interceptors:", err);
    });

  console.log("API-Services erfolgreich initialisiert");

  return;
}

export default apiConfig;
