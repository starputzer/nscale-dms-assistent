/**
 * API-Konfiguration für den nscale DMS Assistenten
 *
 * Diese Datei enthält die Basiskonfiguration für den API-Client,
 * einschließlich Umgebungsvariablen, Timeouts und Retry-Einstellungen.
 */

/**
 * API-Basiskonfiguration
 */
export const API_CONFIG = {
  // Basis-URL für alle API-Anfragen
  BASE_URL: process.env.VITE_API_BASE_URL || "/api",

  // API-Version
  API_VERSION: process.env.VITE_API_VERSION || "v1",

  // Authentifizierungspräfixe
  AUTH: {
    // Token-Präfix für HTTP-Header
    TOKEN_PREFIX: "Bearer",

    // Namen der localStorage-Schlüssel
    STORAGE_KEYS: {
      ACCESS_TOKEN: "nscale_access_token",
      REFRESH_TOKEN: "nscale_refresh_token",
      TOKEN_EXPIRY: "nscale_token_expiry",
      USER: "nscale_user",
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
  },

  // Debug-Konfiguration
  DEBUG: {
    // Ausführliches Logging
    VERBOSE: process.env.NODE_ENV === "development",

    // Anfrage-/Antwortlogs
    LOG_REQUESTS: process.env.NODE_ENV === "development",

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

  // Produktionsumgebung
  if (process.env.NODE_ENV === "production") {
    // Produktion hat keine umfangreiche Protokollierung
    config.DEBUG.VERBOSE = false;
    config.DEBUG.LOG_REQUESTS = false;

    // Weniger Retries in Produktion, um Server zu entlasten
    config.RETRY.MAX_RETRIES = 2;
  }

  // Testumgebung
  else if (process.env.NODE_ENV === "test") {
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

export default apiConfig;
