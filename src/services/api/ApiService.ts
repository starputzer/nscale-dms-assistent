/**
 * Zentrale API-Service-Klasse für den nscale DMS Assistenten
 *
 * Diese Klasse verwaltet alle HTTP-Anfragen an die API und bietet eine
 * einheitliche Schnittstelle für die gesamte Anwendung.
 */

import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
  CancelTokenSource,
} from "axios";
import { v4 as uuidv4 } from "uuid";
import { apiConfig } from "./config";
import {
  ApiResponse,
  ApiError,
  LoginRequest,
  LoginResponse,
  PaginationRequest,
} from "@/types/api";
import { RequestQueue } from "./RequestQueue";
import { RetryHandler } from "./RetryHandler";
import { RateLimitHandler } from "./RateLimitHandler";
import { StorageService } from "../storage/StorageService";
import { LogService } from "../log/LogService";
import { CentralAuthManager } from "../auth/CentralAuthManager";

/**
 * Optionen für API-Anfragen
 */
export interface ApiRequestOptions extends AxiosRequestConfig {
  /** Priorität der Anfrage (höhere Werte = höhere Priorität) */
  priority?: number;

  /** Maximale Anzahl von Wiederholungsversuchen */
  maxRetries?: number;

  /** Soll die Anfrage im Fehlerfall automatisch wiederholt werden? */
  retry?: boolean;

  /** Soll die Anfrage bei einem 401-Fehler automatisch Token-Refresh auslösen? */
  refreshToken?: boolean;

  /** Soll die Anfrage im Falle von Rate-Limiting automatisch in die Warteschlange gestellt werden? */
  handleRateLimit?: boolean;

  /** Callback für Upload-/Download-Fortschritt */
  onProgress?: (progressEvent: any) => void;

  /** Optionen für das Abbrechen der Anfrage */
  cancelToken?: CancelTokenSource;

  /** Sollen Fehler automatisch als Benutzerbenachrichtigungen angezeigt werden? */
  showErrorToast?: boolean;

  /** Custom-Handler für spezifische Fehler */
  errorHandler?: (error: ApiError) => void;
}

/**
 * ApiService-Klasse
 * Zentrale Klasse für alle API-Anfragen
 */
export class ApiService {
  /** Axios-Instanz für HTTP-Anfragen */
  private axiosInstance: AxiosInstance;

  /** Request-Queue für Parallelitätssteuerung */
  private requestQueue: RequestQueue;

  /** Retry-Handler für automatische Wiederholungsversuche */
  private retryHandler: RetryHandler;

  /** Rate-Limit-Handler zur Behandlung von Drosselung */
  private rateLimitHandler: RateLimitHandler;

  /** Storage-Service für Token-Speicherung */
  private storageService: StorageService;

  /** Log-Service für Debug-Logging */
  private logService: LogService;

  /** Flag für laufenden Token-Refresh */
<<<<<<< HEAD
  private _isRefreshingToken: boolean = false;
=======
  private isRefreshingToken: boolean = false;
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da

  /** Warteschlange für Anfragen, die auf Token-Refresh warten */
  private tokenRefreshQueue: Array<{
    resolve: (token: string) => void;
    reject: (error: any) => void;
  }> = [];

  /** Token-Refresh-Promise für parallele Anfragen */
  private refreshTokenPromise: Promise<string> | null = null;

  /** Central auth manager instance */
  private centralAuthManager: CentralAuthManager;

  /**
   * Konstruktor
   */
  constructor() {
    // Get central auth manager instance
    this.centralAuthManager = CentralAuthManager.getInstance();

    // Konfiguriere Axios-Instanz
<<<<<<< HEAD
    // baseURL leer lassen, da alle unsere Endpoints bereits mit /api beginnen
    const baseURL = ""; // Empty to avoid double /api prefix
=======
    // baseURL ist bereits korrekt mit Version konfiguriert (/api/v1)
    const baseURL = apiConfig.BASE_URL;
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
    console.log("[ApiService] Base URL configuration:", {
      BASE_URL: apiConfig.BASE_URL,
      API_VERSION: apiConfig.API_VERSION,
      finalBaseURL: baseURL,
<<<<<<< HEAD
      note: "Using empty baseURL to avoid double /api prefix"
=======
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
    });
    this.axiosInstance = axios.create({
      baseURL: baseURL,
      timeout: apiConfig.TIMEOUTS.DEFAULT,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    // Initialisiere Hilfskomponenten
    this.requestQueue = new RequestQueue({
      maxConcurrent: apiConfig.QUEUE.MAX_CONCURRENT_REQUESTS,
      maxQueueSize: apiConfig.QUEUE.MAX_QUEUE_SIZE,
    });

    this.retryHandler = new RetryHandler({
      maxRetries: apiConfig.RETRY.MAX_RETRIES,
      baseDelay: apiConfig.RETRY.BASE_DELAY,
      backoffFactor: apiConfig.RETRY.BACKOFF_FACTOR,
      retryStatusCodes: apiConfig.RETRY.RETRY_STATUS_CODES,
      retryNetworkErrors: apiConfig.RETRY.RETRY_NETWORK_ERRORS,
    });

    this.rateLimitHandler = new RateLimitHandler({
      remainingHeader: apiConfig.RATE_LIMITING.REMAINING_HEADER,
      resetHeader: apiConfig.RATE_LIMITING.RESET_HEADER,
      limitHeader: apiConfig.RATE_LIMITING.LIMIT_HEADER,
      throttleThreshold: apiConfig.RATE_LIMITING.THROTTLE_THRESHOLD,
      minThrottleDelay: apiConfig.RATE_LIMITING.MIN_THROTTLE_DELAY,
    });

    this.storageService = new StorageService();
    this.logService = new LogService("ApiService");

    // Interceptoren einrichten
    this.setupInterceptors();
  }

  /**
   * Richtet Request- und Response-Interceptoren für Axios ein
   */
  private setupInterceptors(): void {
    // Request-Interceptor
    this.axiosInstance.interceptors.request.use(
      (config: any) => {
        // Füge Request-ID für Tracking hinzu
        const requestId = uuidv4();
        config.headers = config.headers || {};
        config.headers["X-Request-ID"] = requestId;

        // Debug-Logging
        if (apiConfig.DEBUG.LOG_REQUESTS || config.url?.includes("batch")) {
          this.logService.debug(
            `📤 Request [${config.method?.toUpperCase()}] ${config.url}`,
            {
              requestId,
              headers: config.headers,
              params: config.params,
              data: config.data,
              hasAuthHeader: !!config.headers?.Authorization,
              authHeaderValue: config.headers?.Authorization
                ? config.headers.Authorization.substring(0, 20) + "..."
                : null,
            },
          );
        }

        // Auth-Token hinzufügen, wenn vorhanden
        // Versuche zuerst aus StorageService (StorageService fügt automatisch "nscale_" prefix hinzu)
        let token = this.storageService.getItem(
          apiConfig.AUTH.STORAGE_KEYS.ACCESS_TOKEN,
        );

        // Fallback: Direkt aus localStorage mit korrektem key
        if (!token) {
          token = localStorage.getItem("nscale_access_token");
        }

        // Additional fallback for token without prefix
        if (!token) {
          token = localStorage.getItem("access_token");
        }
        if (!token) {
          token = localStorage.getItem("nscale_access_token");
        }

        // Debug logging for all requests
        if (apiConfig.DEBUG.LOG_REQUESTS || config.url?.includes("batch")) {
          console.log(
            `🔐 Auth check for ${config.method?.toUpperCase()} ${config.url}:`,
            {
              tokenFromStorage: !!token,
              tokenLength: token?.length,
              tokenPreview: token ? token.substring(0, 20) + "..." : null,
              authAlreadySet: !!config.headers.Authorization,
              storageKey: apiConfig.AUTH.STORAGE_KEYS.ACCESS_TOKEN,
              fullStorageKey: `nscale_${apiConfig.AUTH.STORAGE_KEYS.ACCESS_TOKEN}`,
              isLoginRequest: config.url?.includes("/login"),
              skipAuth:
                config.url?.includes("/login") ||
                config.url?.includes("/refresh"),
            },
          );
        }

        // Skip auth for login and refresh endpoints
        const skipAuthEndpoints = ["/login", "/refresh"];
        const shouldSkipAuth = skipAuthEndpoints.some((endpoint) =>
          config.url?.includes(endpoint),
        );

        if (token && !config.headers.Authorization && !shouldSkipAuth) {
          config.headers.Authorization = `${apiConfig.AUTH.TOKEN_PREFIX} ${token}`;
          this.logService.debug(
            `✅ Auth header added to request: ${config.url}`,
            {
              token: token.substring(0, 20) + "...",
            },
          );
        } else if (!token && !shouldSkipAuth) {
          this.logService.warn(
            `⚠️ No auth token available for request: ${config.url}`,
          );
        }

        // API-Version nicht hinzufügen, da sie bereits in der baseURL enthalten ist
        // (Entfernt, um doppelte Version zu vermeiden)
<<<<<<< HEAD
        
        // Fix double /api prefix
        if (config.url && config.url.startsWith('/api/api/')) {
          config.url = config.url.replace('/api/api/', '/api/');
          this.logService.debug(`Fixed double /api prefix: ${config.url}`);
        }
=======
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da

        return config;
      },
      (error: Error | unknown) => {
        this.logService.error("❌ Request Error", error);
        return Promise.reject(error);
      },
    );

    // Response-Interceptor
    this.axiosInstance.interceptors.response.use(
      (response: any) => {
        // Debug-Logging
        if (apiConfig.DEBUG.LOG_REQUESTS) {
          this.logService.debug(
            `📥 Response [${response.status}] ${response.config.url}`,
            {
              status: response.status,
              statusText: response.statusText,
              headers: response.headers,
              data: response.data,
            },
          );
        }

        // Überprüfe auf Rate-Limiting-Header und aktualisiere Ratenbegrenzungsdaten
        this.rateLimitHandler.updateFromResponse(response);

        return response;
      },
      async (error: AxiosError) => {
        // Debug-Logging
        this.logService.error("❌ Response Error", {
          status: error.response?.status,
          statusText: error.response?.statusText,
          url: error.config?.url,
          message: error.message,
          data: error.response?.data,
        });

        // Original-Anfrage für spätere Verwendung speichern
        const originalRequest = error.config;

        // Automatischer Token-Refresh bei 401-Fehler
        if (
          error.response?.status === 401 &&
          originalRequest &&
          !(originalRequest as any)._retry &&
          originalRequest.url !== apiConfig.ENDPOINTS.AUTH.REFRESH
        ) {
          return this.handleUnauthorizedError(originalRequest);
        }

        // Rate-Limiting-Fehler (429)
        if (error.response?.status === 429) {
          return this.handleRateLimitError(error, originalRequest);
        }

        // Prüfen, ob ein Wiederholungsversuch möglich ist
        if (originalRequest && this.retryHandler.shouldRetry(error)) {
          return this.retryHandler.retryRequest(
            originalRequest,
            this.axiosInstance,
          );
        }

        // Standardfehlerbehandlung
        return Promise.reject(this.formatApiError(error));
      },
    );
  }

  /**
   * Behandelt 401 Unauthorized-Fehler durch Token-Refresh
   */
  private async handleUnauthorizedError(
    originalRequest: AxiosRequestConfig,
  ): Promise<AxiosResponse> {
    // Markieren, dass dieser Request bereits retried wird
    (originalRequest as any)._retry = true;

    try {
      // Token erneuern
      const newToken = await this.refreshToken();

      // Ursprüngliche Anfrage mit neuem Token wiederholen
      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `${apiConfig.AUTH.TOKEN_PREFIX} ${newToken}`;

      return this.axiosInstance(originalRequest);
    } catch (refreshError) {
      // Token-Refresh fehlgeschlagen, zum Login weiterleiten
      this.logService.warn(
        "🔑 Token refresh failed, clearing auth data",
        refreshError,
      );
      this.clearAuthData();

      // Event für Logout auslösen
      window.dispatchEvent(new CustomEvent("auth:unauthorized"));

      return Promise.reject(refreshError);
    }
  }

  /**
   * Verarbeitet Rate-Limit-Fehler
   */
  private async handleRateLimitError(
    error: AxiosError,
    originalRequest: AxiosRequestConfig,
  ): Promise<AxiosResponse> {
    // Extrahiere Rate-Limit-Informationen
    const retryAfter = error.response?.headers["retry-after"];
    const resetTime = this.rateLimitHandler.getResetTimeFromResponse(
      error.response,
    );

    // Berechne Verzögerung
    const delayMs = retryAfter
      ? parseInt(retryAfter, 10) * 1000
      : resetTime
        ? Math.max(0, resetTime - Date.now())
        : apiConfig.RATE_LIMITING.MIN_THROTTLE_DELAY;

    this.logService.warn(`🚦 Rate limited, retrying after ${delayMs}ms`, {
      retryAfter,
      resetTime,
      url: originalRequest.url,
    });

    // Warte auf Verzögerung und wiederhole dann
    await new Promise((resolve) => setTimeout(resolve, delayMs));

    // Anfrage wiederholen
    return this.axiosInstance(originalRequest);
  }

  /**
   * Formatiert einen Axios-Fehler in ein standardisiertes ApiError-Format
   */
  private formatApiError(error: AxiosError): ApiError {
    // Wenn der Server bereits ein ApiError-Format zurückgibt, verwende es
    if (error.response?.data && (error.response.data as any).error) {
      return (error.response.data as any).error as ApiError;
    }

    // Erstelle ein neues ApiError-Objekt
    const apiError: ApiError = {
      code: "ERR_NETWORK",
      message: "Netzwerkfehler bei der Kommunikation mit dem Server",
      status: error.response?.status || 0,
    };

    // Netzwerkfehler
    if (error.code === "ECONNABORTED") {
      apiError.code = "ERR_TIMEOUT";
      apiError.message = "Die Anfrage hat das Zeitlimit überschritten";
    }
    // Timeout
    else if (error.message.includes("timeout")) {
      apiError.code = "ERR_TIMEOUT";
      apiError.message = "Die Anfrage hat das Zeitlimit überschritten";
    }
    // Abgebrochene Anfrage
    else if (axios.isCancel(error)) {
      apiError.code = "ERR_CANCELLED";
      apiError.message = "Die Anfrage wurde abgebrochen";
    }
    // HTTP-Statusfehler
    else if (error.response) {
      apiError.status = error.response.status;

      switch (error.response.status) {
        case 400:
          apiError.code = "ERR_BAD_REQUEST";
          apiError.message = "Ungültige Anfrage";
          break;
        case 401:
          apiError.code = "ERR_UNAUTHORIZED";
          apiError.message = "Nicht autorisiert";
          break;
        case 403:
          apiError.code = "ERR_FORBIDDEN";
          apiError.message = "Zugriff verweigert";
          break;
        case 404:
          apiError.code = "ERR_NOT_FOUND";
          apiError.message = "Ressource nicht gefunden";
          break;
        case 409:
          apiError.code = "ERR_CONFLICT";
          apiError.message = "Konflikt mit dem aktuellen Zustand";
          break;
        case 422:
          apiError.code = "ERR_VALIDATION";
          apiError.message = "Validierungsfehler";
          break;
        case 429:
          apiError.code = "ERR_RATE_LIMITED";
          apiError.message = "Zu viele Anfragen, bitte warten Sie";
          break;
        case 500:
          apiError.code = "ERR_SERVER";
          apiError.message = "Interner Serverfehler";
          break;
        case 502:
          apiError.code = "ERR_BAD_GATEWAY";
          apiError.message = "Bad Gateway";
          break;
        case 503:
          apiError.code = "ERR_SERVICE_UNAVAILABLE";
          apiError.message = "Service nicht verfügbar";
          break;
        case 504:
          apiError.code = "ERR_GATEWAY_TIMEOUT";
          apiError.message = "Gateway-Timeout";
          break;
        default:
          apiError.code = `ERR_HTTP_${error.response.status}`;
          apiError.message =
            error.response.statusText || "Unbekannter HTTP-Fehler";
      }

      // Füge Antwortdaten als Details hinzu, wenn vorhanden
      if (error.response.data) {
        if (typeof error.response.data === "string") {
          apiError.details = { message: error.response.data };
        } else {
          apiError.details = error.response.data;
        }

        // Extrahiere Nachricht aus Antwortdaten, falls vorhanden
        if ((error.response.data as any)?.message) {
          apiError.message = (error.response.data as any).message;
        }
      }
    }

    // Stack-Trace hinzufügen (nur im Entwicklungsmodus)
    if (apiConfig.DEBUG.VERBOSE) {
      apiError.stack = error.stack;
    }

    return apiError;
  }

  /**
   * Führt den Token-Refresh-Prozess durch
   */
  private async refreshToken(): Promise<string> {
    // Wenn bereits ein Refresh läuft, diesen wiederverwenden
    if (this.refreshTokenPromise) {
      return this.refreshTokenPromise;
    }

    this.isRefreshingToken = true;

    // Erstelle einen neuen Promise für den Refresh-Prozess
    this.refreshTokenPromise = new Promise<string>(async (resolve, reject) => {
      try {
        const refreshToken = this.storageService.getItem(
          apiConfig.AUTH.STORAGE_KEYS.REFRESH_TOKEN,
        );

        if (!refreshToken) {
          throw new Error("Kein Refresh-Token vorhanden");
        }

        // Token-Refresh-Anfrage mit korrektem Endpunkt aus der Konfiguration
        const refreshEndpoint = apiConfig.ENDPOINTS.AUTH.REFRESH;
        console.log(
          "[ApiService] Sending token refresh request to:",
          refreshEndpoint,
        );

        const response = await this.axiosInstance.post<
          ApiResponse<LoginResponse>
        >(
          refreshEndpoint,
          { refreshToken },
          { _retry: true }, // Verhindere endlose Refresh-Schleife
        );

        if (!response.data.success || !response.data.data) {
          throw new Error("Token-Refresh fehlgeschlagen");
        }

        const {
          accessToken,
          refreshToken: newRefreshToken,
          expiresAt,
        } = response.data.data;

        // Speichere neue Tokens
        this.storageService.setItem(
          apiConfig.AUTH.STORAGE_KEYS.ACCESS_TOKEN,
          accessToken,
        );
        this.storageService.setItem(
          apiConfig.AUTH.STORAGE_KEYS.REFRESH_TOKEN,
          newRefreshToken,
        );
        this.storageService.setItem(
          apiConfig.AUTH.STORAGE_KEYS.TOKEN_EXPIRY,
          expiresAt,
        );

        // Löse alle wartenden Anfragen auf
        this.tokenRefreshQueue.forEach(({ resolve }: any) =>
          resolve(accessToken),
        );
        this.tokenRefreshQueue = [];

        resolve(accessToken);
      } catch (error) {
        // Token-Refresh fehlgeschlagen, Auth-Daten löschen
        this.clearAuthData();

        // Alle wartenden Anfragen ablehnen
        this.tokenRefreshQueue.forEach(({ reject }: any) => reject(error));
        this.tokenRefreshQueue = [];

        reject(error);
      } finally {
        this.isRefreshingToken = false;
        this.refreshTokenPromise = null;
      }
    });

    return this.refreshTokenPromise;
  }

  /**
   * Löscht alle Auth-Daten aus dem Storage
   */
  private clearAuthData(): void {
    this.storageService.removeItem(apiConfig.AUTH.STORAGE_KEYS.ACCESS_TOKEN);
    this.storageService.removeItem(apiConfig.AUTH.STORAGE_KEYS.REFRESH_TOKEN);
    this.storageService.removeItem(apiConfig.AUTH.STORAGE_KEYS.TOKEN_EXPIRY);
    this.storageService.removeItem(apiConfig.AUTH.STORAGE_KEYS.USER);
  }

  /**
   * Führt eine HTTP-Anfrage aus
   */
  private async request<T = any>(
    method: string,
    url: string,
    options: ApiRequestOptions = {},
  ): Promise<ApiResponse<T>> {
<<<<<<< HEAD
    // Check if this is an admin endpoint that doesn't use /v1
    const adminEndpoints = [
      '/admin',
      '/admin/dashboard',
      '/admin/statistics', 
      '/admin/system',
      '/admin/feedback',
      '/admin/users',
      '/knowledge-manager',
      '/rag-settings',
      '/system-monitor',
      '/background-processing',
      '/advanced-documents',
      '/doc-converter-enhanced'
    ];
    
    // If this is an admin endpoint, use /api instead of /api/v1
    let adjustedUrl = url;
    if (adminEndpoints.some(endpoint => url.startsWith(endpoint))) {
      // Override base URL for admin endpoints
      options.baseURL = '/api';
    }
    
    // Default-Optionen
    const defaultOptions: ApiRequestOptions = {
      method,
      url: adjustedUrl,
=======
    // Default-Optionen
    const defaultOptions: ApiRequestOptions = {
      method,
      url,
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
      retry: true,
      refreshToken: true,
      handleRateLimit: true,
      showErrorToast: true,
      priority: apiConfig.QUEUE.PRIORITIES.FETCH,
    };

    // Optionen zusammenführen
    const requestOptions: ApiRequestOptions = { ...defaultOptions, ...options };

    try {
      // Prüfe, ob die Anfrage in die Warteschlange gestellt werden soll
      if (this.requestQueue.isEnabled) {
        return await this.requestQueue.enqueue<ApiResponse<T>>(
          () => this.executeRequest<T>(requestOptions),
          requestOptions.priority,
        );
      }

      // Direkte Ausführung ohne Warteschlange
      return await this.executeRequest<T>(requestOptions);
    } catch (error) {
      // Fehlerbehandlung
      const apiError = error as ApiError;

      // Custom-Fehlerbehandlung
      if (requestOptions.errorHandler) {
        requestOptions.errorHandler(apiError);
      }

      // Toast-Benachrichtigung für Fehler anzeigen
      if (requestOptions.showErrorToast) {
        this.showErrorToast(apiError);
      }

      // Geworfenen Fehler weiterleiten
      throw apiError;
    }
  }

  /**
   * Führt eine einzelne HTTP-Anfrage aus
   */
  private async executeRequest<T = any>(
    options: ApiRequestOptions,
  ): Promise<ApiResponse<T>> {
    try {
      // Debug-Ausgabe für URL-Konstruktion
      console.log("[ApiService] Executing request:", {
        url: options.url,
        baseURL: this.axiosInstance.defaults.baseURL,
        finalURL: options.url?.startsWith("http")
          ? options.url
          : `${this.axiosInstance.defaults.baseURL}${options.url}`,
        axiosConfig: options,
      });

      // Überprüfe auf Rate-Limiting
      if (options.handleRateLimit) {
        await this.rateLimitHandler.applyThrottling();
      }

      // Führe die Anfrage aus
      const response = await this.axiosInstance.request<T>(options);

<<<<<<< HEAD
      // Check if response is already in ApiResponse format
      if (response.data && typeof response.data === 'object' && 
          'success' in response.data && 'data' in response.data) {
        // Response is already wrapped
        return response.data as ApiResponse<T>;
      }
      
      // For backward compatibility, wrap raw responses
=======
      // Wrap the response in ApiResponse format
      // The backend returns data directly, not wrapped in success/data structure
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
      return {
        success: true,
        data: response.data as T,
        message: "Request successful",
      };
    } catch (error) {
      // Fehler formatieren und weiterwerfen
      if (error instanceof Error) {
        throw this.formatApiError(error as AxiosError);
      }

      throw error;
    }
  }

  /**
   * Zeigt eine Fehlerbenachrichtigung an
   */
  private showErrorToast(error: ApiError): void {
    // Löse ein Event aus, das von der UI-Komponente abgefangen werden kann
    window.dispatchEvent(
      new CustomEvent("api:error", {
        detail: {
          message: error.message,
          code: error.code,
          status: error.status,
        },
      }),
    );
  }

  /**
   * Erstellt ein CancelToken für abbrechbare Anfragen
   */
  public createCancelToken(): CancelTokenSource {
    return axios.CancelToken.source();
  }

  /**
   * Prüft, ob eine Anfrage abgebrochen wurde
   */
  public isCancel(error: any): boolean {
    return axios.isCancel(error);
  }

  // ----------------
  // Öffentliche API-Methoden
  // ----------------

  /**
   * HTTP GET-Anfrage
   */
  public async get<T = any>(
    url: string,
    params?: any,
    options?: ApiRequestOptions,
  ): Promise<ApiResponse<T>> {
    return this.request<T>("get", url, {
      ...options,
      params,
    });
  }

  /**
   * HTTP POST-Anfrage
   */
  public async post<T = any>(
    url: string,
    data?: any,
    options?: ApiRequestOptions,
  ): Promise<ApiResponse<T>> {
    return this.request<T>("post", url, {
      ...options,
      data,
    });
  }

  /**
   * HTTP PUT-Anfrage
   */
  public async put<T = any>(
    url: string,
    data?: any,
    options?: ApiRequestOptions,
  ): Promise<ApiResponse<T>> {
    return this.request<T>("put", url, {
      ...options,
      data,
    });
  }

  /**
   * HTTP PATCH-Anfrage
   */
  public async patch<T = any>(
    url: string,
    data?: any,
    options?: ApiRequestOptions,
  ): Promise<ApiResponse<T>> {
    return this.request<T>("patch", url, {
      ...options,
      data,
    });
  }

  /**
   * HTTP DELETE-Anfrage
   */
  public async delete<T = any>(
    url: string,
    options?: ApiRequestOptions,
  ): Promise<ApiResponse<T>> {
    return this.request<T>("delete", url, options);
  }

  /**
   * Benutzerdefinierte Anfrage mit vollständigen Optionen
   */
  public async customRequest<T = any>(
    options: ApiRequestOptions,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(options.method || "get", options.url || "", options);
  }

  /**
   * Paginierte GET-Anfrage
   */
  public async getPaginated<T = any>(
    url: string,
    pagination: PaginationRequest,
    options?: ApiRequestOptions,
  ): Promise<ApiResponse<T>> {
    return this.get<T>(url, pagination, options);
  }

  /**
   * Datei-Upload
   */
  public async uploadFile<T = any>(
    url: string,
    file: File | Blob,
    options?: ApiRequestOptions & {
      fieldName?: string;
      metadata?: Record<string, any>;
    },
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append(options?.fieldName || "file", file);

    // Metadaten hinzufügen, wenn vorhanden
    if (options?.metadata) {
      for (const [key, value] of Object.entries(options.metadata)) {
        formData.append(
          key,
          typeof value === "object" ? JSON.stringify(value) : value.toString(),
        );
      }
    }

    return this.post<T>(url, formData, {
      ...options,
      headers: {
        ...options?.headers,
        "Content-Type": "multipart/form-data",
      },
      timeout: apiConfig.TIMEOUTS.UPLOAD,
      onUploadProgress: options?.onProgress,
    });
  }

  /**
   * Datei-Download
   */
  public async downloadFile(
    url: string,
    options?: ApiRequestOptions & { filename?: string },
  ): Promise<Blob> {
    const response = await this.axiosInstance.get(url, {
      ...options,
      responseType: "blob",
      timeout: apiConfig.TIMEOUTS.UPLOAD,
      onDownloadProgress: options?.onProgress,
    });

    // Datei automatisch herunterladen, wenn Dateiname angegeben
    if (options?.filename) {
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", options.filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    return response.data as Blob;
  }

  // ----------------
  // Auth-spezifische Methoden
  // ----------------

  /**
   * Benutzeranmeldung
   */
  public async login(
    credentials: LoginRequest,
  ): Promise<ApiResponse<LoginResponse>> {
    const response = await this.post<LoginResponse>(
      apiConfig.ENDPOINTS.AUTH.LOGIN,
      credentials,
      {
        priority: apiConfig.QUEUE.PRIORITIES.AUTH,
        refreshToken: false,
      },
    );

    if (response.success && response.data) {
      const { accessToken, refreshToken, expiresAt, user } = response.data;

      // Debug logging for token storage
      this.logService.debug("🔐 Storing tokens after login:", {
        accessTokenPreview: accessToken.substring(0, 20) + "...",
        storageKeys: apiConfig.AUTH.STORAGE_KEYS,
        userEmail: user?.email,
        userRole: user?.roles,
      });

      // Token und Benutzerdaten speichern
      this.storageService.setItem(
        apiConfig.AUTH.STORAGE_KEYS.ACCESS_TOKEN,
        accessToken,
      );
      this.storageService.setItem(
        apiConfig.AUTH.STORAGE_KEYS.REFRESH_TOKEN,
        refreshToken,
      );
      this.storageService.setItem(
        apiConfig.AUTH.STORAGE_KEYS.TOKEN_EXPIRY,
        expiresAt,
      );
      this.storageService.setItem(
        apiConfig.AUTH.STORAGE_KEYS.USER,
        JSON.stringify(user),
      );

      // Verify storage was successful
      const storedToken = this.storageService.getItem(
        apiConfig.AUTH.STORAGE_KEYS.ACCESS_TOKEN,
      );
      if (storedToken === accessToken) {
        this.logService.debug("✅ Token successfully stored and verified");

        // Update the central auth manager with the new token
        this.centralAuthManager.updateAuthHeader(accessToken);
      } else {
        this.logService.error("❌ Token storage verification failed", {
          expected: accessToken.substring(0, 20) + "...",
          actual: storedToken?.substring(0, 20) + "...",
        });
      }

      // Authentifizierungs-Event auslösen
      window.dispatchEvent(new CustomEvent("auth:login", { detail: { user } }));
    }

    return response;
  }

  /**
   * Benutzerabmeldung
   */
  public async logout(): Promise<ApiResponse<void>> {
    try {
      // Server-Abmeldung versuchen, aber auch bei Fehler fortfahren
      await this.post(apiConfig.ENDPOINTS.AUTH.LOGOUT, null, {
        priority: apiConfig.QUEUE.PRIORITIES.AUTH,
        showErrorToast: false,
      }).catch(() => {
        // Server-Fehler ignorieren, lokale Abmeldung trotzdem durchführen
      });
    } finally {
      // Lokale Abmeldung
      this.clearAuthData();

      // Abmeldungs-Event auslösen
      window.dispatchEvent(new CustomEvent("auth:logout"));
    }

    return { success: true };
  }

  /**
   * Token-Refresh auslösen
   */
  public async refreshAuthToken(): Promise<string> {
    return this.refreshToken();
  }

  /**
   * Prüft, ob der Benutzer angemeldet ist
   */
  public isAuthenticated(): boolean {
    const token = this.storageService.getItem(
      apiConfig.AUTH.STORAGE_KEYS.ACCESS_TOKEN,
    );
    const expiryStr = this.storageService.getItem(
      apiConfig.AUTH.STORAGE_KEYS.TOKEN_EXPIRY,
    );

    if (!token || !expiryStr) {
      return false;
    }

    // Token-Ablauf überprüfen
    try {
      const expiry = new Date(expiryStr).getTime();
      return expiry > Date.now();
    } catch (e) {
      return false;
    }
  }

  /**
   * Gibt die Benutzerinformationen zurück
   */
  public getUserInfo(): any {
    const userJson = this.storageService.getItem(
      apiConfig.AUTH.STORAGE_KEYS.USER,
    );
    if (!userJson) return null;

    try {
      return JSON.parse(userJson);
    } catch (e) {
      return null;
    }
  }

  /**
   * Fügt einen Request-Interceptor hinzu
   */
  public addRequestInterceptor(
    onFulfilled: (config: any) => any,
    onRejected?: (error: any) => any,
  ): number {
    return this.axiosInstance.interceptors.request.use(onFulfilled, onRejected);
  }

  /**
   * Fügt einen Response-Interceptor hinzu
   */
  public addResponseInterceptor(
    onFulfilled: (response: any) => any,
    onRejected?: (error: any) => any,
  ): number {
    return this.axiosInstance.interceptors.response.use(
      onFulfilled,
      onRejected,
    );
  }

  /**
   * Entfernt einen Request-Interceptor
   */
  public removeRequestInterceptor(id: number): void {
    this.axiosInstance.interceptors.request.eject(id);
  }

  /**
   * Entfernt einen Response-Interceptor
   */
  public removeResponseInterceptor(id: number): void {
    this.axiosInstance.interceptors.response.eject(id);
  }
}

// Singleton-Instanz erstellen
export const apiService = new ApiService();

export default apiService;
