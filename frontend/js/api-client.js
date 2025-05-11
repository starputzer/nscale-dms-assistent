/**
 * api-client.js - Verbesserte API-Client-Implementierung mit Fehlerbehandlung und Wiederholungsversuchen
 *
 * Dieses Modul bietet einen robusteren API-Client mit konsistenter Fehlerbehandlung,
 * automatischen Wiederholungsversuchen und verbesserten Fehlermeldungen.
 */

import errorHandler, { ErrorCategory, ErrorSeverity } from "./error-handler.js";

/**
 * Konfigurationsoptionen für API-Anfragen
 * @typedef {Object} ApiRequestOptions
 * @property {number} [timeout=30000] - Timeout für die Anfrage in ms
 * @property {boolean} [retry=true] - Automatische Wiederholung aktivieren
 * @property {number} [maxRetries=3] - Maximale Anzahl von Wiederholungsversuchen
 * @property {number} [retryDelay=1000] - Basisverzögerung zwischen Wiederholungsversuchen in ms
 * @property {Function} [onProgress] - Callback-Funktion für Fortschrittsanzeige
 * @property {boolean} [showErrors=true] - Fehler dem Benutzer anzeigen
 * @property {string} [errorMessage] - Benutzerdefinierte Fehlermeldung
 * @property {Object} [headers] - Zusätzliche HTTP-Header
 */

/**
 * Standard-Konfiguration für API-Anfragen
 * @type {ApiRequestOptions}
 */
const DEFAULT_OPTIONS = {
  timeout: 30000,
  retry: true,
  maxRetries: 3,
  retryDelay: 1000,
  onProgress: null,
  showErrors: true,
  errorMessage: "",
  headers: {},
};

/**
 * Liste von Statuscodes, die nicht automatisch wiederholt werden sollten
 * @type {number[]}
 */
const NON_RETRYABLE_STATUS_CODES = [400, 401, 403, 404, 422];

/**
 * ApiClient-Klasse für verbesserte API-Kommunikation
 */
class ApiClient {
  /**
   * Konstruktor
   */
  constructor() {
    // Aktive Anfragen für potenzielle Abbrüche
    this.activeRequests = new Map();

    // Konfigurationsvariablen
    this.baseUrl = window.location.origin;
    this.defaultHeaders = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
  }

  /**
   * Sendet eine GET-Anfrage
   * @param {string} endpoint - API-Endpunkt
   * @param {Object} [params=null] - Query-Parameter
   * @param {ApiRequestOptions} [options={}] - Konfigurationsoptionen
   * @returns {Promise<any>} - API-Antwort
   */
  async get(endpoint, params = null, options = {}) {
    // URL mit Query-Parametern erstellen
    const url = this.buildUrl(endpoint, params);

    // Optionen mit Standardwerten zusammenführen
    const requestOptions = { ...DEFAULT_OPTIONS, ...options };

    // GET-Anfrage senden
    return this.request("GET", url, null, requestOptions);
  }

  /**
   * Sendet eine POST-Anfrage
   * @param {string} endpoint - API-Endpunkt
   * @param {Object} data - Zu sendende Daten
   * @param {ApiRequestOptions} [options={}] - Konfigurationsoptionen
   * @returns {Promise<any>} - API-Antwort
   */
  async post(endpoint, data, options = {}) {
    // URL erstellen
    const url = this.buildUrl(endpoint);

    // Optionen mit Standardwerten zusammenführen
    const requestOptions = { ...DEFAULT_OPTIONS, ...options };

    // POST-Anfrage senden
    return this.request("POST", url, data, requestOptions);
  }

  /**
   * Sendet eine PUT-Anfrage
   * @param {string} endpoint - API-Endpunkt
   * @param {Object} data - Zu sendende Daten
   * @param {ApiRequestOptions} [options={}] - Konfigurationsoptionen
   * @returns {Promise<any>} - API-Antwort
   */
  async put(endpoint, data, options = {}) {
    // URL erstellen
    const url = this.buildUrl(endpoint);

    // Optionen mit Standardwerten zusammenführen
    const requestOptions = { ...DEFAULT_OPTIONS, ...options };

    // PUT-Anfrage senden
    return this.request("PUT", url, data, requestOptions);
  }

  /**
   * Sendet eine DELETE-Anfrage
   * @param {string} endpoint - API-Endpunkt
   * @param {ApiRequestOptions} [options={}] - Konfigurationsoptionen
   * @returns {Promise<any>} - API-Antwort
   */
  async delete(endpoint, options = {}) {
    // URL erstellen
    const url = this.buildUrl(endpoint);

    // Optionen mit Standardwerten zusammenführen
    const requestOptions = { ...DEFAULT_OPTIONS, ...options };

    // DELETE-Anfrage senden
    return this.request("DELETE", url, null, requestOptions);
  }

  /**
   * Führt eine API-Anfrage aus
   * @param {string} method - HTTP-Methode
   * @param {string} url - Vollständige URL
   * @param {Object} data - Zu sendende Daten
   * @param {ApiRequestOptions} options - Konfigurationsoptionen
   * @returns {Promise<any>} - API-Antwort
   * @private
   */
  async request(method, url, data, options) {
    // Konfiguration für axios erstellen
    const axiosConfig = {
      method,
      url,
      data,
      headers: {
        ...this.defaultHeaders,
        ...options.headers,
      },
      timeout: options.timeout,
    };

    // Fortschritts-Callbacks hinzufügen, wenn vorhanden
    if (options.onProgress) {
      // Upload-Fortschritt
      if (method === "POST" || method === "PUT") {
        axiosConfig.onUploadProgress = (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
          );
          options.onProgress(percentCompleted, "upload");
        };
      }

      // Download-Fortschritt
      axiosConfig.onDownloadProgress = (progressEvent) => {
        if (progressEvent.total) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
          );
          options.onProgress(percentCompleted, "download");
        }
      };
    }

    // CancelToken für potentiellen Abbruch erstellen
    const cancelTokenSource = axios.CancelToken.source();
    axiosConfig.cancelToken = cancelTokenSource.token;

    // Anfrage-ID generieren und Token in Map speichern
    const requestId = `${method}-${url}-${Date.now()}`;
    this.activeRequests.set(requestId, cancelTokenSource);

    try {
      // Anfrage senden
      const response = await axios(axiosConfig);

      // Erfolgreiche Antwort, Token aus Map entfernen
      this.activeRequests.delete(requestId);

      // Daten zurückgeben
      return response.data;
    } catch (error) {
      // Token aus Map entfernen
      this.activeRequests.delete(requestId);

      // Prüfen, ob Wiederholung möglich ist
      if (this.shouldRetry(error, options)) {
        return this.retryRequest(method, url, data, options);
      }

      // Fehler mit errorHandler behandeln
      const errorOpts = {
        showUser: options.showErrors,
        context: {
          method,
          url,
          requestData: data,
          config: axiosConfig,
        },
      };

      // Wenn eine benutzerdefinierte Fehlermeldung vorhanden ist, verwenden
      if (options.errorMessage) {
        error.message = options.errorMessage;
      }

      // Fehler mit errorHandler behandeln
      errorHandler.handleAxiosError(error, errorOpts);

      // Fehler weiterwerfen
      throw error;
    }
  }

  /**
   * Prüft, ob eine Anfrage wiederholt werden sollte
   * @param {Error} error - Der aufgetretene Fehler
   * @param {ApiRequestOptions} options - Konfigurationsoptionen
   * @returns {boolean} - Ob die Anfrage wiederholt werden sollte
   * @private
   */
  shouldRetry(error, options) {
    // Wenn Wiederholung deaktiviert ist, nicht wiederholen
    if (!options.retry) {
      return false;
    }

    // Wenn es sich um einen Abbruch handelt, nicht wiederholen
    if (axios.isCancel(error)) {
      return false;
    }

    // Wenn es sich um einen Timeout handelt, wiederholen
    if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
      return true;
    }

    // Wenn kein Response vorhanden ist (Netzwerkfehler), wiederholen
    if (!error.response) {
      return true;
    }

    // Basierend auf Status-Code entscheiden
    const statusCode = error.response.status;

    // Bestimmte Status-Codes nicht wiederholen
    if (NON_RETRYABLE_STATUS_CODES.includes(statusCode)) {
      return false;
    }

    // Server-Fehler wiederholen
    return statusCode >= 500;
  }

  /**
   * Wiederholt eine Anfrage mit exponentieller Verzögerung
   * @param {string} method - HTTP-Methode
   * @param {string} url - Vollständige URL
   * @param {Object} data - Zu sendende Daten
   * @param {ApiRequestOptions} options - Konfigurationsoptionen
   * @returns {Promise<any>} - API-Antwort
   * @private
   */
  async retryRequest(method, url, data, options) {
    // Anzahl der verbleibenden Versuche berechnen
    const retriesLeft = options.retriesLeft || options.maxRetries;

    if (retriesLeft <= 0) {
      // Keine Versuche mehr übrig, Fehler werfen
      const error = new Error(
        `Maximale Anzahl an Wiederholungsversuchen (${options.maxRetries}) erreicht.`,
      );

      errorHandler.handleError(error, {
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.ERROR,
        handlerOptions: {
          showUser: options.showErrors,
          context: {
            method,
            url,
            requestData: data,
          },
        },
      });

      throw error;
    }

    // Verzögerung mit exponentiellem Backoff berechnen
    const retryAttempt = options.maxRetries - retriesLeft + 1;
    const delay = options.retryDelay * Math.pow(2, retryAttempt - 1);

    console.log(
      `Wiederhole Anfrage in ${delay}ms (Versuch ${retryAttempt}/${options.maxRetries})...`,
    );

    // Verzögerung
    await new Promise((resolve) => setTimeout(resolve, delay));

    // Optionen aktualisieren
    const updatedOptions = {
      ...options,
      retriesLeft: retriesLeft - 1,
    };

    // Anfrage wiederholen
    return this.request(method, url, data, updatedOptions);
  }

  /**
   * Baut eine vollständige URL für einen Endpunkt
   * @param {string} endpoint - API-Endpunkt
   * @param {Object} [params=null] - Query-Parameter
   * @returns {string} - Vollständige URL
   * @private
   */
  buildUrl(endpoint, params = null) {
    // Sicherstellen, dass der Endpunkt mit einem Slash beginnt
    const normalizedEndpoint = endpoint.startsWith("/")
      ? endpoint
      : `/${endpoint}`;

    // Basis-URL und Endpunkt kombinieren
    let url = `${this.baseUrl}${normalizedEndpoint}`;

    // Query-Parameter hinzufügen, wenn vorhanden
    if (params && Object.keys(params).length > 0) {
      const queryParams = Object.entries(params)
        .filter(([_, value]) => value !== null && value !== undefined)
        .map(
          ([key, value]) =>
            `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
        )
        .join("&");

      url += url.includes("?") ? `&${queryParams}` : `?${queryParams}`;
    }

    return url;
  }

  /**
   * Bricht eine aktive Anfrage ab
   * @param {string} requestId - ID der Anfrage
   */
  cancelRequest(requestId) {
    const cancelTokenSource = this.activeRequests.get(requestId);
    if (cancelTokenSource) {
      cancelTokenSource.cancel("Anfrage abgebrochen");
      this.activeRequests.delete(requestId);
    }
  }

  /**
   * Bricht alle aktiven Anfragen ab
   */
  cancelAllRequests() {
    for (const [
      requestId,
      cancelTokenSource,
    ] of this.activeRequests.entries()) {
      cancelTokenSource.cancel("Alle Anfragen abgebrochen");
      this.activeRequests.delete(requestId);
    }
  }

  /**
   * Setzt den Authorization-Header für alle Anfragen
   * @param {string} token - Der Authentifizierungstoken
   */
  setAuthToken(token) {
    if (token) {
      // Token mit 'Bearer ' Präfix hinzufügen, falls nicht vorhanden
      const authToken = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
      this.defaultHeaders["Authorization"] = authToken;
    } else {
      // Token entfernen, wenn keiner angegeben ist
      delete this.defaultHeaders["Authorization"];
    }
  }

  /**
   * Lädt eine Datei hoch
   * @param {string} endpoint - API-Endpunkt
   * @param {File} file - Die hochzuladende Datei
   * @param {Object} [metadata={}] - Zusätzliche Metadaten
   * @param {ApiRequestOptions} [options={}] - Konfigurationsoptionen
   * @returns {Promise<any>} - API-Antwort
   */
  async uploadFile(endpoint, file, metadata = {}, options = {}) {
    // FormData erstellen
    const formData = new FormData();
    formData.append("file", file);

    // Metadaten als JSON hinzufügen
    if (Object.keys(metadata).length > 0) {
      formData.append("metadata", JSON.stringify(metadata));
    }

    // URL erstellen
    const url = this.buildUrl(endpoint);

    // Optionen mit Standardwerten zusammenführen
    const requestOptions = {
      ...DEFAULT_OPTIONS,
      ...options,
      headers: {
        ...options.headers,
        "Content-Type": "multipart/form-data",
      },
    };

    // Anfrage senden
    return this.request("POST", url, formData, requestOptions);
  }

  /**
   * Lädt eine Datei herunter
   * @param {string} endpoint - API-Endpunkt
   * @param {Object} [params=null] - Query-Parameter
   * @param {ApiRequestOptions} [options={}] - Konfigurationsoptionen
   * @returns {Promise<Blob>} - Heruntergeladene Datei als Blob
   */
  async downloadFile(endpoint, params = null, options = {}) {
    // URL mit Query-Parametern erstellen
    const url = this.buildUrl(endpoint, params);

    // Optionen mit Standardwerten zusammenführen
    const requestOptions = {
      ...DEFAULT_OPTIONS,
      ...options,
      responseType: "blob",
    };

    // Konfiguration für axios erstellen
    const axiosConfig = {
      method: "GET",
      url,
      headers: {
        ...this.defaultHeaders,
        ...requestOptions.headers,
      },
      timeout: requestOptions.timeout,
      responseType: "blob",
    };

    // Fortschritts-Callbacks hinzufügen, wenn vorhanden
    if (requestOptions.onProgress) {
      axiosConfig.onDownloadProgress = (progressEvent) => {
        if (progressEvent.total) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
          );
          requestOptions.onProgress(percentCompleted, "download");
        }
      };
    }

    // CancelToken für potentiellen Abbruch erstellen
    const cancelTokenSource = axios.CancelToken.source();
    axiosConfig.cancelToken = cancelTokenSource.token;

    // Anfrage-ID generieren und Token in Map speichern
    const requestId = `GET-${url}-${Date.now()}`;
    this.activeRequests.set(requestId, cancelTokenSource);

    try {
      // Anfrage senden
      const response = await axios(axiosConfig);

      // Erfolgreiche Antwort, Token aus Map entfernen
      this.activeRequests.delete(requestId);

      // Daten zurückgeben
      return response.data;
    } catch (error) {
      // Token aus Map entfernen
      this.activeRequests.delete(requestId);

      // Fehler mit errorHandler behandeln
      const errorOpts = {
        showUser: requestOptions.showErrors,
        context: {
          method: "GET",
          url,
          config: axiosConfig,
        },
      };

      // Wenn eine benutzerdefinierte Fehlermeldung vorhanden ist, verwenden
      if (requestOptions.errorMessage) {
        error.message = requestOptions.errorMessage;
      }

      // Fehler mit errorHandler behandeln
      errorHandler.handleAxiosError(error, errorOpts);

      // Fehler weiterwerfen
      throw error;
    }
  }

  /**
   * Eröffnet eine EventSource-Verbindung für Server-Sent Events
   * @param {string} endpoint - API-Endpunkt
   * @param {Object} [params=null] - Query-Parameter
   * @param {Object} [options={}] - Optionen für die EventSource
   * @returns {EventSource} - Die erstellte EventSource-Instanz
   */
  createEventSource(endpoint, params = null, options = {}) {
    // URL mit Query-Parametern erstellen
    const url = this.buildUrl(endpoint, params);

    // EventSource-Instanz erstellen
    const eventSource = new EventSource(url);

    // Error-Handler hinzufügen
    eventSource.onerror = (event) => {
      // Fehler mit errorHandler behandeln
      errorHandler.handleEventSourceError(event, {
        showUser: options.showErrors !== false,
        context: {
          url,
          params,
          options,
        },
      });
    };

    // EventSource zurückgeben
    return eventSource;
  }
}

// Singleton-Instanz erstellen
const apiClient = new ApiClient();

// Token aus localStorage setzen, wenn vorhanden
const token = localStorage.getItem("token");
if (token) {
  apiClient.setAuthToken(token);
}

export default apiClient;
