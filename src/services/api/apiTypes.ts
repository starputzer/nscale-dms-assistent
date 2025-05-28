/**
 * API Service Types
 *
 * Diese Datei enthält die Adapter und spezifischen Typdefinitionen für
 * die Service-Implementierungen der Anwendung unter Verwendung der gemeinsamen
 * Utility-Typen aus utils/serviceTypes.ts.
 */

import {
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
  CancelTokenSource as AxiosCancelTokenSource,
} from "axios";
import {
  ApiServiceInterface,
  RetryHandlerInterface,
  RetryHandlerOptions,
  ApiRequestOptions,
  ServiceEvent,
  PaginationParams,
  CacheOptions,
  CacheEntry,
  OfflineRequestInterface,
  StreamingOptions,
  StreamingServiceInterface,
  SessionServiceInterface,
} from "@/utils/serviceTypes";
import {
  APIResponse,
  APIError,
  HTTPMethod,
  StatusCode,
  AsyncAPIResult,
} from "@/utils/apiTypes";
import { Result, AsyncFunction, Optional, Nullable } from "@/utils/types";

/**
 * NScaleAxiosRequestConfig - Erweiterte Axios-Konfiguration mit nScale-spezifischen Optionen
 */
export interface NScaleAxiosRequestConfig extends AxiosRequestConfig {
  /** Priorität der Anfrage */
  priority?: number;

  /** Automatische Wiederholungsversuche */
  retry?: boolean;

  /** Maximale Anzahl von Wiederholungsversuchen */
  maxRetries?: number;

  /** Token-Refresh bei 401-Fehlern */
  refreshToken?: boolean;

  /** Rate-Limiting-Behandlung */
  handleRateLimit?: boolean;

  /** Ist die Anfrage idempotent? */
  isIdempotent?: boolean;

  /** Anzahl der bisherigen Wiederholungsversuche */
  _retryCount?: number;

  /** Wurde die Anfrage bereits wiederholt? */
  _retry?: boolean;

  /** Fortschritts-Callback für Upload */
  onUploadProgress?: (progressEvent: any) => void;

  /** Fortschritts-Callback für Download */
  onDownloadProgress?: (progressEvent: any) => void;

  /** Fehler als Toast anzeigen */
  showErrorToast?: boolean;

  /** Benutzerdefinierter Fehler-Handler */
  errorHandler?: (error: APIError) => void;
}

/**
 * NScaleApiService - Erweiterte Version des ApiServiceInterface
 * für die spezifischen Anforderungen der nScale-Anwendung
 */
export interface NScaleApiService extends ApiServiceInterface {
  /** Authentifizierungsmethoden */
  login(credentials: any): Promise<APIResponse<any>>;
  refreshAuthToken(): Promise<string>;
  logout(): Promise<APIResponse<void>>;
  isAuthenticated(): boolean;
  getUserInfo(): any;

  /** Spezielle Anfragemethoden */
  uploadFile<T = any>(
    url: string,
    file: File | Blob,
    options?: ApiRequestOptions & {
      fieldName?: string;
      metadata?: Record<string, any>;
    },
  ): Promise<APIResponse<T>>;
}

/**
 * NScaleCachedApiService - Erweitertes Interface für den gecachten API-Service
 */
export interface NScaleCachedApiService extends NScaleApiService {
  /** Cache-spezifische Methoden */
  clearCache(): void;
  clearCacheEntry(url: string, params?: any): void;
  getCacheSize(): number;
  getCacheEntry<T = any>(key: string): CacheEntry<APIResponse<T>> | undefined;
  setCacheEntry<T = any>(
    key: string,
    value: APIResponse<T>,
    ttl?: number,
  ): void;
}

/**
 * NScaleRetryHandlerAdapter - Adapter für den bestehenden RetryHandler
 * zur Implementierung des RetryHandlerInterface
 */
export class NScaleRetryHandlerAdapter implements RetryHandlerInterface {
  private originalHandler: any;

  constructor(originalHandler: any) {
    this.originalHandler = originalHandler;
  }

  shouldRetry(error: any): boolean {
    return this.originalHandler.shouldRetry(error);
  }

  calculateDelay(retryCount: number): number {
    return this.originalHandler.calculateDelay(retryCount);
  }

  async retryRequest<T>(config: any, instance: any): Promise<T> {
    return this.originalHandler.retryRequest(config, instance);
  }
}

/**
 * NScaleApiServiceAdapter - Adapter für den bestehenden ApiService
 * zur Implementierung des NScaleApiService-Interface
 */
export class NScaleApiServiceAdapter implements NScaleApiService {
  private originalService: any;

  constructor(originalService: any) {
    this.originalService = originalService;
  }

  async initialize(): Promise<void> {
    // Der originale ApiService benötigt keine explizite Initialisierung
    return Promise.resolve();
  }

  destroy(): void {
    // Der originale ApiService benötigt keine explizite Zerstörung
  }

  createCancelToken(): AxiosCancelTokenSource {
    return this.originalService.createCancelToken();
  }

  isCancel(error: any): boolean {
    return this.originalService.isCancel(error);
  }

  async get<T = any>(
    url: string,
    params?: any,
    options?: ApiRequestOptions,
  ): Promise<APIResponse<T>> {
    return this.originalService.get<T>(url, params, options);
  }

  async post<T = any>(
    url: string,
    data?: any,
    options?: ApiRequestOptions,
  ): Promise<APIResponse<T>> {
    return this.originalService.post<T>(url, data, options);
  }

  async put<T = any>(
    url: string,
    data?: any,
    options?: ApiRequestOptions,
  ): Promise<APIResponse<T>> {
    return this.originalService.put<T>(url, data, options);
  }

  async patch<T = any>(
    url: string,
    data?: any,
    options?: ApiRequestOptions,
  ): Promise<APIResponse<T>> {
    return this.originalService.patch<T>(url, data, options);
  }

  async delete<T = any>(
    url: string,
    options?: ApiRequestOptions,
  ): Promise<APIResponse<T>> {
    return this.originalService.delete<T>(url, options);
  }

  async getPaginated<T = any>(
    url: string,
    pagination: PaginationParams,
    options?: ApiRequestOptions,
  ): Promise<APIResponse<T>> {
    return this.originalService.getPaginated<T>(url, pagination, options);
  }

  async login(credentials: any): Promise<APIResponse<any>> {
    return this.originalService.login(credentials);
  }

  async refreshAuthToken(): Promise<string> {
    return this.originalService.refreshAuthToken();
  }

  async logout(): Promise<APIResponse<void>> {
    return this.originalService.logout();
  }

  isAuthenticated(): boolean {
    return this.originalService.isAuthenticated();
  }

  getUserInfo(): any {
    return this.originalService.getUserInfo();
  }

  async uploadFile<T = any>(
    url: string,
    file: File | Blob,
    options?: ApiRequestOptions & {
      fieldName?: string;
      metadata?: Record<string, any>;
    },
  ): Promise<APIResponse<T>> {
    return this.originalService.uploadFile<T>(url, file, options);
  }

  async downloadFile(
    url: string,
    options?: ApiRequestOptions & { filename?: string },
  ): Promise<Blob> {
    return this.originalService.downloadFile(url, options);
  }
}

/**
 * NScaleSessionServiceAdapter - Adapter für den bestehenden SessionService
 * zur Implementierung des SessionServiceInterface
 */
export class NScaleSessionServiceAdapter implements SessionServiceInterface {
  private originalService: any;

  constructor(originalService: any) {
    this.originalService = originalService;
  }

  async initialize(): Promise<void> {
    // Der originale SessionService führt die Initialisierung im Konstruktor durch
    return Promise.resolve();
  }

  destroy(): void {
    if (typeof this.originalService.destroy === "function") {
      this.originalService.destroy();
    }
  }

  async getSessions(
    pagination?: PaginationParams,
  ): Promise<APIResponse<any[]>> {
    return this.originalService.getSessions(pagination);
  }

  async getSession(sessionId: string): Promise<APIResponse<any>> {
    return this.originalService.getSession(sessionId);
  }

  async createSession(request?: any): Promise<APIResponse<any>> {
    return this.originalService.createSession(request);
  }

  async deleteSession(sessionId: string): Promise<APIResponse<void>> {
    return this.originalService.deleteSession(sessionId);
  }

  async updateSession(
    sessionId: string,
    updates: any,
  ): Promise<APIResponse<any>> {
    return this.originalService.updateSession(sessionId, updates);
  }

  async getMessages(
    sessionId: string,
    pagination?: PaginationParams,
  ): Promise<APIResponse<any[]>> {
    return this.originalService.getMessages(sessionId, pagination);
  }

  async sendMessage(
    sessionId: string,
    message: any,
  ): Promise<APIResponse<any>> {
    return this.originalService.sendMessage(sessionId, message);
  }

  cancelStream(): void {
    this.originalService.cancelStream();
  }

  on(event: string, handler: Function): void {
    this.originalService.on(event, handler);
  }

  off(event: string, handler: Function): void {
    this.originalService.off(event, handler);
  }
}

/**
 * NScaleStreamingServiceAdapter - Adapter für den bestehenden StreamingService
 * zur Implementierung des StreamingServiceInterface
 */
export class NScaleStreamingServiceAdapter
  implements StreamingServiceInterface
{
  private originalService: any;

  constructor(originalService: any) {
    this.originalService = originalService;
  }

  get url(): string {
    return this.originalService.url;
  }

  get isActive(): boolean {
    return this.originalService.isActive;
  }

  async init(): Promise<void> {
    if (typeof this.originalService.init === "function") {
      return this.originalService.init();
    }
    return Promise.resolve();
  }

  close(): void {
    this.originalService.close();
  }

  on(event: string, handler: Function): void {
    if (typeof this.originalService.on === "function") {
      this.originalService.on(event, handler);
    }
  }

  off(event: string, handler: Function): void {
    if (typeof this.originalService.off === "function") {
      this.originalService.off(event, handler);
    }
  }
}

/**
 * NScaleStreamingEvent - Erweitertes Interface für Streaming-Events
 */
export interface NScaleStreamingEvent {
  /** Typ des Events */
  type: "content" | "metadata" | "progress" | "error" | "end";

  /** Content bei Content-Events */
  content?: string;

  /** Progress bei Progress-Events */
  progress?: number;

  /** Metadaten bei Metadata-Events */
  metadata?: any;

  /** Fehler bei Error-Events */
  error?: APIError;

  /** Nachricht bei End-Events */
  message?: any;

  /** Message-ID */
  messageId?: string;

  /** Session-ID */
  sessionId?: string;
}

/**
 * NScaleStreamingOptions - Erweiterte Optionen für Streaming-Verbindungen
 */
export interface NScaleStreamingOptions extends StreamingOptions {
  /** Parameter der Anfrage */
  params: {
    /** Inhalt der Nachricht */
    content: string;

    /** Rolle des Absenders */
    role?: string;

    /** Zusätzlicher Kontext */
    [key: string]: any;
  };

  /** Event-Handler für Streaming-Events */
  onMessage: (event: NScaleStreamingEvent) => void;

  /** Event-Handler für Verbindungsabschluss */
  onComplete: (response: any) => void;

  /** Event-Handler für Fehler */
  onError: (error: Error) => void;
}

/**
 * NScaleOfflineRequest - Erweitertes Interface für Offline-Anfragen
 */
export interface NScaleOfflineRequest extends OfflineRequestInterface {
  /** Originale Anfrage-URL */
  url: string;

  /** HTTP-Methode */
  method: string;

  /** Anfragedaten */
  data?: any;

  /** Timestamp der Anfrage */
  timestamp: number;

  /** Status der Anfrage */
  status: "pending" | "processing" | "completed" | "failed";

  /** Fehlermeldung bei Status 'failed' */
  error?: string;

  /** Anzahl der Wiederholungsversuche */
  retryCount?: number;

  /** Letzte Versuchszeit */
  lastAttempt?: number;

  /** Priorität der Anfrage */
  priority?: number;
}
