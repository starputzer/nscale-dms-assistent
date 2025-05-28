/**
 * API-Konfiguration für den nscale DMS Assistenten
 *
 * Diese Datei enthält die Basiskonfiguration für den API-Client,
 * einschließlich Umgebungsvariablen, Timeouts und Retry-Einstellungen.
 */

/**
 * Hilfsfunction zur sicheren Zugriff auf Umgebungsvariablen im Browser-Kontext
 */
const getEnvVar = (name: string, defaultValue: string): string => {
  // In Vite werden Umgebungsvariablen mit import.meta.env zur Verfügung gestellt
  if (typeof import.meta !== "undefined" && import.meta.env) {
    return (import.meta.env[name] as string) || defaultValue;
  }
  // Fallback für Node.js-Umgebung oder wenn import.meta nicht verfügbar ist
  return typeof window !== "undefined"
    ? defaultValue
    : (process?.env?.[name] as string) || defaultValue;
};

/**
 * Hilfsfunction zur Erkennung der aktuellen Umgebung
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
 * API-Basiskonfiguration
 */
export const API_CONFIG = {
  // Basis-URL für alle API-Anfragen
  BASE_URL: getEnvVar("VITE_API_BASE_URL", "/api/v1"),

  // API-Version
  API_VERSION: getEnvVar("VITE_API_VERSION", ""),

  // Authentifizierungspräfixe
  AUTH: {
    // Token-Präfix für HTTP-Header
    TOKEN_PREFIX: "Bearer",

    // Namen der localStorage-Schlüssel (ohne prefix, da StorageService "nscale_" hinzufügt)
    STORAGE_KEYS: {
      ACCESS_TOKEN: "access_token",
      REFRESH_TOKEN: "refresh_token",
      TOKEN_EXPIRY: "token_expiry",
      USER: "user",
    },
  },

  // HTTP-Anfrage-Timeouts
  TIMEOUTS: {
    // Standardtimeout in Millisekunden
    DEFAULT: 30000,

    // Längerer Timeout für Operationen mit großen Dateien
    UPLOAD: 120000,

    // Kürzerer Timeout für einfache Abfragen
    QUERY: 10000,

    // Timeout für Token-Refresh
    TOKEN_REFRESH: 5000,
  },

  // Automatische Wiederholungsversuche
  RETRY: {
    // Maximale Anzahl von Wiederholungsversuchen
    MAX_RETRIES: 3,

    // Basisverzögerung zwischen Wiederholungsversuchen (in ms)
    BASE_DELAY: 1000,

    // Faktor für exponentielle Verzögerung
    BACKOFF_FACTOR: 1.5,

    // Status-Codes, die für Wiederholungsversuche geeignet sind
    RETRY_STATUS_CODES: [408, 429, 500, 502, 503, 504],

    // Netzwerkfehler immer wiederholen
    RETRY_NETWORK_ERRORS: true,
  },

  // Request-Queuing (Drosselung)
  QUEUE: {
    // Maximale Anzahl gleichzeitiger Anfragen
    MAX_CONCURRENT_REQUESTS: 6,

    // Maximale Warteschlangengröße
    MAX_QUEUE_SIZE: 100,

    // Prioritätsflags für verschiedene Anfragen
    PRIORITIES: {
      AUTH: 100, // Höchste Priorität
      USER_ACTION: 80, // Vom Benutzer ausgelöste Aktionen
      FETCH: 50, // Standard-Abfragen
      BACKGROUND: 20, // Hintergrundoperationen
    },
  },

  // Rate-Limiting-Erkennung und -Behandlung
  RATE_LIMITING: {
    // Header-Name für verbleibende Anfragen
    REMAINING_HEADER: "X-RateLimit-Remaining",

    // Header-Name für Limit-Reset
    RESET_HEADER: "X-RateLimit-Reset",

    // Header-Name für Limit-Maximum
    LIMIT_HEADER: "X-RateLimit-Limit",

    // Schwellenwert für verbleibende Anfragen, ab dem gedrosselt wird
    THROTTLE_THRESHOLD: 5,

    // Minimale Verzögerung (in ms) für gedrosselte Anfragen
    MIN_THROTTLE_DELAY: 1000,
  },

  // Standardparameter für alle Anfragen
  DEFAULT_PARAMS: {
    // Versionspräfix für alle Anfragen hinzufügen
    includeVersion: true,

    // Standardmäßig JSON zurückgeben
    responseType: "json",
  },

  // Streaming-Konfiguration
  STREAMING: {
    // Standardkonfiguration für SSE
    DEFAULT_SSE_CONFIG: {
      withCredentials: true,
      heartbeatTimeout: 60000,
      retry: 3000,
    },

    // Timeout für Streaming-Verbindungen (in ms)
    CONNECTION_TIMEOUT: 10000,

    // Endpunkte, die Streaming unterstützen
    STREAMING_ENDPOINTS: ["/chat/stream", "/sessions/:sessionId/stream"],
  },

  // Endpunkt-spezifische Konfigurationen
  ENDPOINTS: {
    AUTH: {
      LOGIN: "/auth/login",
      LOGOUT: "/auth/logout",
      REFRESH: "/auth/refresh",
      USER: "/auth/user",
    },
    CHAT: {
      SESSIONS: "/sessions",
      SESSION: (id: string) => `/sessions/${id}`,
      MESSAGES: (sessionId: string) => `/sessions/${sessionId}/messages`,
      MESSAGE: (sessionId: string, messageId: string) =>
        `/sessions/${sessionId}/messages/${messageId}`,
      STREAM: (sessionId: string) => `/sessions/${sessionId}/stream`,
    },
    DOCUMENTS: {
      UPLOAD: "/documents/upload",
      CONVERT: "/documents/convert",
      DOCUMENT: (id: string) => `/documents/${id}`,
    },
    SYSTEM: {
      INFO: "/system/info",
      STATS: "/system/stats",
      HEALTH: "/system/health",
    },
    FEEDBACK: {
      SUBMIT: "/feedback",
    },
    ADMIN: {
      USERS: "/api/admin/users",
      USER: (id: string) => `/api/admin/users/${id}`,
      SYSTEM: "/api/v1/admin/system",
      STATS: "/api/v1/system/stats",
      ACTIONS: "/api/v1/admin/system-actions",
      CLEAR_CACHE: "/api/v1/admin/clear-cache",
      CLEAR_EMBEDDING_CACHE: "/api/v1/admin/clear-embedding-cache",
      CHECK: "/api/v1/admin/system-check",
      REINDEX: "/api/v1/admin/reindex",
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
      UPDATE: "/admin/update-motd",
      RELOAD: "/admin/reload-motd",
    },
    ADMIN_FEEDBACK: {
      STATS: "/api/v1/admin/feedback/stats",
      NEGATIVE: "/api/v1/admin/feedback/negative",
      UPDATE_STATUS: "/api/v1/admin/feedback",
      DELETE: "/api/v1/admin/feedback",
      EXPORT: "/api/v1/admin/feedback/export",
      FILTER: "/api/v1/admin/feedback/filter",
    },
  },

  // Debug-Konfiguration
  DEBUG: {
    // Ausführliches Logging
    VERBOSE: getNodeEnv() === "development",

    // Anfrage-/Antwortlogs
    LOG_REQUESTS: getNodeEnv() === "development",

    // Farbiges Konsolen-Logging
    COLORIZED_LOGGING: true,

    // Request-ID für Trackinganfragen
    INCLUDE_REQUEST_ID: true,
  },
};

/**
 * Umgebungsspezifische Konfigurationsüberschreibungen
 */
export const getEnvironmentConfig = () => {
  // Basiseinstellungen aus API_CONFIG
  const config = { ...API_CONFIG };

  // Aktuelle Umgebung ermitteln
  const nodeEnv = getNodeEnv();

  // Produktionsumgebung
  if (nodeEnv === "production") {
    // Produktion hat keine umfangreiche Protokollierung
    config.DEBUG.VERBOSE = false;
    config.DEBUG.LOG_REQUESTS = false;

    // Weniger Retries in Produktion, um Server zu entlasten
    config.RETRY.MAX_RETRIES = 2;
  }

  // Testumgebung
  else if (nodeEnv === "test") {
    // Kürzere Timeouts für Tests
    config.TIMEOUTS.DEFAULT = 5000;

    // Keine tatsächlichen API-Calls in Tests
    config.BASE_URL = "mock://api";
  }

  // Entwicklungsumgebung (default)
  else {
    // Mehr detaillierte Logs
    config.DEBUG.VERBOSE = true;
    config.DEBUG.LOG_REQUESTS = true;

    // Längere Timeouts für Entwicklung/Debugging
    config.TIMEOUTS.DEFAULT = 60000;
  }

  return config;
};

/**
 * Endgültige API-Konfiguration für die aktuelle Umgebung
 */
export const apiConfig = getEnvironmentConfig();

/**
 * Initialisiert die API-Services und -Konfiguration für die Anwendung
 * Richtet Headers, Interceptors und globale Einstellungen ein
 * @returns Eine Instanz der konfigurierten API-Services
 */
export function initializeApiServices(): void {
  console.log("API-Services werden initialisiert...");

  // Basiskonfiguration laden
  const config = getEnvironmentConfig();

  // Header für alle API-Anfragen konfigurieren
  const defaultHeaders = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Client-Version": import.meta.env.VITE_APP_VERSION || "1.0.0",
    "X-Client-Platform": "web",
  };

  // Debug-Modus aktivieren, wenn Konfiguration es vorsieht
  if (config.DEBUG.VERBOSE) {
    console.log("API-Konfiguration geladen:", config);
    console.log("Standardheader konfiguriert:", defaultHeaders);
  }

  // URLSearchParams für eventuelles globales Caching konfigurieren
  const urlParams = new URLSearchParams(window.location.search);
  const disableCache = urlParams.get("noCache") === "true";

  if (disableCache) {
    console.log("API-Cache wurde über URL-Parameter deaktiviert");
    // Cache-Header setzen, um Caching zu verhindern
    Object.assign(defaultHeaders, {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    });
  }

  // Interceptor für Axios einrichten, um sicherzustellen, dass login-Anfragen
  // korrekt formatiert sind
  import("axios")
    .then((axiosModule) => {
      const axios = axiosModule.default;

      // Request-Interceptor für alle Anfragen
      axios.interceptors.request.use(
        (config) => {
          // Add authorization header for all non-login requests
          if (!config.url?.includes("/api/auth/login")) {
            const token = localStorage.getItem("nscale_access_token");
            if (token) {
              config.headers = config.headers || {};
              config.headers["Authorization"] = `Bearer ${token}`;
              console.log("Added authorization header to request");
            }
          }

          // Speziell für Login-Anfragen
          if (config.url?.includes("/api/auth/login")) {
            console.log("Überprüfe Login-Anfrage:", config);

            // Sicherstellen, dass die Daten als JSON-Objekt formatiert sind
            if (typeof config.data === "string") {
              try {
                // Versuchen, es als JSON zu parsen
                config.data = JSON.parse(config.data);
              } catch (e) {
                // Wenn es kein gültiges JSON ist, erstelle ein neues Objekt
                console.warn(
                  "Login-Daten waren kein gültiges JSON, konvertiere zu Objekt",
                );

                // Annahme: String könnte eine E-Mail-Adresse sein
                if (config.data.includes("@")) {
                  console.log(
                    "String könnte eine E-Mail sein, konvertiere zu Login-Objekt",
                  );
                  config.data = {
                    email: config.data,
                    password: "123", // Standard-Testpasswort für die Demo
                  };
                }
              }
            }

            // Wenn email-Parameter als String übergeben wird, konvertiere zu Objekt
            if (config.params && typeof config.params.email === "string") {
              console.log(
                "Email-Parameter erkannt, konvertiere zu Objekt:",
                config.params.email,
              );
              config.data = {
                email: config.params.email,
                password: config.params.password || "123",
              };
              // Parameter entfernen, da wir sie jetzt im Body haben
              delete config.params.email;
              delete config.params.password;
            }

            // Sicherstellen, dass die Header korrekt gesetzt sind
            if (config.headers) {
              config.headers["Content-Type"] = "application/json";
            }

            console.log("Login-Anfrage nach Überprüfung:", config);
          }

          return config;
        },
        (error) => {
          console.error("Axios-Request-Interceptor-Fehler:", error);
          return Promise.reject(error);
        },
      );

      console.log("Axios-Interceptors für API-Anfragen eingerichtet");
    })
    .catch((err) => {
      console.error("Fehler beim Importieren von Axios für Interceptors:", err);
    });

  // Status der Initialisierung melden
  console.log("API-Services erfolgreich initialisiert");

  // Weitere Initialisierungen je nach Umgebung
  // Dies kann erweitert werden, wenn weitere Services benötigt werden

  return;
}

export default apiConfig;
