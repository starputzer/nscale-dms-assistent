/**
 * Service-bezogene Utility-Typen
 * 
 * Diese Datei enthält Utility-Typen speziell für die Service-Implementierungen
 * des Systems, einschließlich API-Services, Storage-Services und mehr.
 */

import { APIResponse, APIError } from './apiTypes';
import { Result, Dictionary } from './types';

// Die folgenden Typen werden derzeit nicht direkt verwendet, könnten aber
// in der Zukunft für Erweiterungen der Services nützlich sein:
// import { HTTPMethod, StatusCode, RetryConfig } from './apiTypes';
// import { AsyncFunction, Nullable, Optional } from './types';

/**
 * BaseService - Basisinterface für alle Services
 */
export interface BaseService {
  /** Service initialisieren */
  initialize?(): Promise<void>;
  
  /** Ressourcen bereinigen */
  destroy?(): void;
}

/**
 * ServiceConfiguration - Konfiguration für Services
 */
export interface ServiceConfiguration {
  /** Ist der Service aktiviert? */
  enabled: boolean;
  
  /** Debug-Modus */
  debug?: boolean;
  
  /** Benutzerdefinierte Konfigurationsoptionen */
  [key: string]: any;
}

/**
 * ServiceRegistry - Interface für die Verwaltung von Service-Instanzen
 */
export interface ServiceRegistry {
  /** Service registrieren */
  register<T extends BaseService>(name: string, service: T): void;
  
  /** Service abrufen */
  get<T extends BaseService>(name: string): T | null;
  
  /** Prüfen, ob ein Service existiert */
  has(name: string): boolean;
  
  /** Service entfernen */
  remove(name: string): boolean;
  
  /** Alle Services abrufen */
  getAll(): Dictionary<BaseService>;
  
  /** Alle Services initialisieren */
  initializeAll(): Promise<void>;
  
  /** Alle Services bereinigen */
  destroyAll(): void;
}

/**
 * ServiceStatus - Status eines Services
 */
export enum ServiceStatus {
  INITIALIZING = 'initializing',
  READY = 'ready',
  ERROR = 'error',
  DISABLED = 'disabled'
}

/**
 * ServiceStatusInfo - Statusinformationen eines Services
 */
export interface ServiceStatusInfo {
  /** Name des Services */
  name: string;
  
  /** Status des Services */
  status: ServiceStatus;
  
  /** Fehlermeldung, wenn Status ERROR ist */
  error?: string;
  
  /** Zeitpunkt der letzten Statusänderung */
  lastUpdated: number;
  
  /** Zusätzliche Statusinformationen */
  [key: string]: any;
}

/**
 * ServiceLifecycleHooks - Lifecycle-Hooks für Services
 */
export interface ServiceLifecycleHooks {
  /** Wird vor der Initialisierung aufgerufen */
  onBeforeInit?: () => void | Promise<void>;
  
  /** Wird nach der Initialisierung aufgerufen */
  onAfterInit?: () => void | Promise<void>;
  
  /** Wird vor der Zerstörung aufgerufen */
  onBeforeDestroy?: () => void | Promise<void>;
  
  /** Wird nach der Zerstörung aufgerufen */
  onAfterDestroy?: () => void | Promise<void>;
}

/**
 * ServiceReference - Referenz auf einen Service
 */
export type ServiceReference<T extends BaseService> = () => T;

/**
 * ApiServiceInterface - Basis-Interface für API-Services
 */
export interface ApiServiceInterface extends BaseService {
  /** HTTP GET-Anfrage */
  get<T = any>(url: string, params?: any, options?: ApiRequestOptions): Promise<APIResponse<T>>;
  
  /** HTTP POST-Anfrage */
  post<T = any>(url: string, data?: any, options?: ApiRequestOptions): Promise<APIResponse<T>>;
  
  /** HTTP PUT-Anfrage */
  put<T = any>(url: string, data?: any, options?: ApiRequestOptions): Promise<APIResponse<T>>;
  
  /** HTTP PATCH-Anfrage */
  patch<T = any>(url: string, data?: any, options?: ApiRequestOptions): Promise<APIResponse<T>>;
  
  /** HTTP DELETE-Anfrage */
  delete<T = any>(url: string, options?: ApiRequestOptions): Promise<APIResponse<T>>;
  
  /** Paginierte GET-Anfrage */
  getPaginated<T = any>(url: string, pagination: PaginationParams, options?: ApiRequestOptions): Promise<APIResponse<T>>;
  
  /** Datei hochladen */
  uploadFile<T = any>(url: string, file: File | Blob, options?: FileUploadOptions): Promise<APIResponse<T>>;
  
  /** Datei herunterladen */
  downloadFile(url: string, options?: FileDownloadOptions): Promise<Blob>;
  
  /** CancelToken für abbrechbare Anfragen erstellen */
  createCancelToken(): CancelTokenSource;
  
  /** Prüfen, ob eine Anfrage abgebrochen wurde */
  isCancel(error: any): boolean;
}

/**
 * CancelTokenSource - Quelle für Abbruch-Tokens
 */
export interface CancelTokenSource {
  /** Token für die Anfrage */
  token: any;
  
  /** Methode zum Abbrechen der Anfrage */
  cancel(message?: string): void;
}

/**
 * ApiRequestOptions - Optionen für API-Anfragen
 */
export interface ApiRequestOptions {
  /** HTTP-Header */
  headers?: Record<string, string>;
  
  /** Timeout in Millisekunden */
  timeout?: number;
  
  /** Request mit Credentials senden */
  withCredentials?: boolean;
  
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
  onProgress?: (progressEvent: ProgressEvent) => void;
  
  /** Optionen für das Abbrechen der Anfrage */
  cancelToken?: CancelTokenSource;
  
  /** Sollen Fehler automatisch als Benutzerbenachrichtigungen angezeigt werden? */
  showErrorToast?: boolean;
  
  /** Custom-Handler für spezifische Fehler */
  errorHandler?: (error: APIError) => void;
  
  /** Aus dem Cache laden */
  cache?: boolean;
  
  /** Veraltete Daten zeigen, während im Hintergrund aktualisiert wird */
  staleWhileRevalidate?: boolean;
  
  /** Cache-Gültigkeitsdauer in Sekunden */
  cacheTTL?: number;
  
  /** Zusätzliche Optionen als Record */
  [key: string]: any;
}

/**
 * FileUploadOptions - Optionen für Datei-Uploads
 */
export interface FileUploadOptions extends ApiRequestOptions {
  /** Name des Formularfelds für die Datei */
  fieldName?: string;
  
  /** Zusätzliche Metadaten */
  metadata?: Record<string, any>;
}

/**
 * FileDownloadOptions - Optionen für Datei-Downloads
 */
export interface FileDownloadOptions extends ApiRequestOptions {
  /** Automatisch heruntergeladene Datei benennen */
  filename?: string;
}

/**
 * PaginationParams - Parameter für paginierte Anfragen
 */
export interface PaginationParams {
  /** Seitennummer (1-basiert) */
  page?: number;
  
  /** Anzahl der Elemente pro Seite */
  pageSize?: number;
  
  /** Sortierfeld */
  sortBy?: string;
  
  /** Sortierrichtung */
  sortDirection?: 'asc' | 'desc';
  
  /** Suchtext */
  search?: string;
  
  /** Zusätzliche Filter */
  filters?: Record<string, any>;
}

/**
 * RetryHandlerInterface - Interface für Wiederholungslogik
 */
export interface RetryHandlerInterface {
  /** Prüft, ob ein Fehler wiederholt werden sollte */
  shouldRetry(error: any): boolean;
  
  /** Berechnet die Verzögerung für den nächsten Wiederholungsversuch */
  calculateDelay(retryCount: number): number;
  
  /** Führt einen Wiederholungsversuch durch */
  retryRequest<T>(config: any, instance: any): Promise<T>;
}

/**
 * RetryHandlerOptions - Optionen für RetryHandler
 */
export interface RetryHandlerOptions {
  /** Maximale Anzahl von Wiederholungsversuchen */
  maxRetries?: number;
  
  /** Basisverzögerung in ms */
  baseDelay?: number;
  
  /** Faktor für die exponentielle Verzögerung */
  backoffFactor?: number;
  
  /** HTTP-Statuscodes, die für Wiederholungsversuche geeignet sind */
  retryStatusCodes?: number[];
  
  /** Netzwerkfehler automatisch wiederholen */
  retryNetworkErrors?: boolean;
  
  /** Maximale Verzögerung zwischen Wiederholungsversuchen (ms) */
  maxDelay?: number;
  
  /** Zufällige Verzögerungsvariation (Jitter) aktivieren */
  enableJitter?: boolean;
}

/**
 * RateLimitHandlerOptions - Optionen für RateLimitHandler
 */
export interface RateLimitHandlerOptions {
  /** Header-Name für verbleibende Anfragen */
  remainingHeader?: string;
  
  /** Header-Name für Limit-Reset */
  resetHeader?: string;
  
  /** Header-Name für Limit-Maximum */
  limitHeader?: string;
  
  /** Schwellenwert für verbleibende Anfragen, ab dem gedrosselt wird */
  throttleThreshold?: number;
  
  /** Minimale Verzögerung (in ms) für gedrosselte Anfragen */
  minThrottleDelay?: number;
}

/**
 * RequestQueueOptions - Optionen für RequestQueue
 */
export interface RequestQueueOptions {
  /** Maximale Anzahl gleichzeitiger Anfragen */
  maxConcurrent?: number;
  
  /** Maximale Warteschlangengröße */
  maxQueueSize?: number;
  
  /** Ist die Queue aktiviert? */
  enabled?: boolean;
}

/**
 * QueuedRequest - In der Warteschlange gespeicherte Anfrage
 */
export interface QueuedRequest<T = any> {
  /** Funktion, die die Anfrage ausführt */
  action: () => Promise<T>;
  
  /** Priorität der Anfrage */
  priority: number;
  
  /** Promise-Resolver */
  resolve: (value: T | PromiseLike<T>) => void;
  
  /** Promise-Rejecter */
  reject: (reason?: any) => void;
  
  /** Zeitpunkt der Einstellung in die Warteschlange */
  timestamp: number;
}

/**
 * OfflineRequestInterface - Interface für Offline-Anfragen
 */
export interface OfflineRequestInterface {
  /** Eindeutige ID der Anfrage */
  id: string;
  
  /** URL der Anfrage */
  url: string;
  
  /** HTTP-Methode der Anfrage */
  method: string;
  
  /** Daten der Anfrage */
  data?: any;
  
  /** Zeitpunkt der Anfrage */
  timestamp: number;
  
  /** Status der Anfrage */
  status: 'pending' | 'processing' | 'completed' | 'failed';
  
  /** Fehlermeldung bei Status 'failed' */
  error?: string;
}

/**
 * OfflineManagerInterface - Interface für Offline-Manager
 */
export interface OfflineManagerInterface extends BaseService {
  /** Ist der Offline-Modus aktiv? */
  isOffline: boolean;
  
  /** Synchronisiert Daten aus dem Offline-Speicher */
  synchronize(): Promise<void>;
  
  /** Fügt eine Anfrage zur Synchronisationsqueue hinzu */
  queueRequest(request: Omit<OfflineRequestInterface, 'id' | 'status'>): Promise<string>;
  
  /** Gibt die Anzahl der ausstehenden Anfragen zurück */
  getPendingRequestCount(): Promise<number>;
  
  /** Überwacht Online-/Offline-Status */
  startNetworkMonitoring(): void;
  
  /** Beendet Überwachung des Online-/Offline-Status */
  stopNetworkMonitoring(): void;
  
  /** Event-Listener für Online/Offline-Events */
  on(event: 'online' | 'offline' | 'synchronizing' | 'synchronized' | 'error', handler: Function): void;
  
  /** Event-Listener entfernen */
  off(event: 'online' | 'offline' | 'synchronizing' | 'synchronized' | 'error', handler: Function): void;
}

/**
 * SessionServiceInterface - Interface für Session-Service
 */
export interface SessionServiceInterface extends BaseService {
  /** Holt alle Sessions */
  getSessions(pagination?: PaginationParams): Promise<APIResponse<any[]>>;
  
  /** Holt eine einzelne Session */
  getSession(sessionId: string): Promise<APIResponse<any>>;
  
  /** Erstellt eine neue Session */
  createSession(request?: any): Promise<APIResponse<any>>;
  
  /** Löscht eine Session */
  deleteSession(sessionId: string): Promise<APIResponse<void>>;
  
  /** Aktualisiert eine Session */
  updateSession(sessionId: string, updates: any): Promise<APIResponse<any>>;
  
  /** Holt Nachrichten für eine Session */
  getMessages(sessionId: string, pagination?: PaginationParams): Promise<APIResponse<any[]>>;
  
  /** Sendet eine Nachricht an eine Session */
  sendMessage(sessionId: string, message: any): Promise<APIResponse<any>>;
  
  /** Bricht die aktuelle Streaming-Anfrage ab */
  cancelStream(): void;
  
  /** Event-Listener registrieren */
  on(event: string, handler: Function): void;
  
  /** Event-Listener entfernen */
  off(event: string, handler: Function): void;
}

/**
 * StreamingServiceInterface - Interface für Streaming-Services
 */
export interface StreamingServiceInterface {
  /** Verbindung initialisieren */
  init(): Promise<void>;
  
  /** Verbindung schließen */
  close(): void;
  
  /** Streaming-URL */
  url: string;
  
  /** Ist die Verbindung aktiv? */
  isActive: boolean;
  
  /** Event-Listener registrieren */
  on(event: string, handler: Function): void;
  
  /** Event-Listener entfernen */
  off(event: string, handler: Function): void;
}

/**
 * StreamingOptions - Optionen für Streaming-Verbindungen
 */
export interface StreamingOptions {
  /** Streaming-URL */
  url: string;
  
  /** Parameter der Anfrage */
  params?: Record<string, any>;
  
  /** Event-Handler für empfangene Nachrichten */
  onMessage?: (message: any) => void;
  
  /** Event-Handler für Verbindungsabschluss */
  onComplete?: (response: any) => void;
  
  /** Event-Handler für Fehler */
  onError?: (error: Error) => void;
  
  /** Event-Handler für Verbindungsaufbau */
  onOpen?: () => void;
  
  /** Timeout für Verbindungsaufbau in Millisekunden */
  connectionTimeout?: number;
  
  /** Weitere SSE-Konfigurationsoptionen */
  sseConfig?: Record<string, any>;
}

/**
 * ServiceEventHandler - Typ für Service-Event-Handler
 */
export type ServiceEventHandler<T = any> = (data: T) => void;

/**
 * ServiceEvent - Ereignis, das von einem Service ausgelöst wird
 */
export interface ServiceEvent<T = any> {
  /** Name des Events */
  name: string;
  
  /** Daten des Events */
  data: T;
  
  /** Zeitstempel des Events */
  timestamp: number;
  
  /** Quelle des Events */
  source: string;
}

/**
 * CacheOptions - Optionen für CachedApiService
 */
export interface CacheOptions extends ApiRequestOptions {
  /** Aus dem Cache laden */
  cache: boolean;
  
  /** Veraltete Daten zeigen, während im Hintergrund aktualisiert wird */
  staleWhileRevalidate?: boolean;
  
  /** Cache-Gültigkeitsdauer in Sekunden */
  cacheTTL?: number;
  
  /** Cache-Schlüssel-Generator */
  cacheKeyFn?: (url: string, params?: any) => string;
}

/**
 * CacheEntry - Eintrag im API-Cache
 */
export interface CacheEntry<T = any> {
  /** Gespeicherte Daten */
  data: T;
  
  /** Zeitpunkt des Cache-Eintrags */
  timestamp: number;
  
  /** Ablaufdatum des Cache-Eintrags */
  expires: number;
  
  /** Wurde der Eintrag bereits verwendet? */
  used?: boolean;
}

/**
 * BatchRequestOptions - Optionen für Batch-Anfragen
 */
export interface BatchRequestOptions {
  /** Parallele Ausführung aktivieren */
  parallel?: boolean;
  
  /** Gemeinsame Optionen für alle Anfragen */
  commonOptions?: ApiRequestOptions;
  
  /** Timeout für die gesamte Batch-Anfrage */
  batchTimeout?: number;
  
  /** Nur erfolgreiche Antworten zurückgeben */
  successOnly?: boolean;
}

/**
 * TypedServiceError - Typisierter Service-Fehler
 */
export class TypedServiceError extends Error {
  /** Fehlercode */
  code: string;
  
  /** HTTP-Statuscode */
  status?: number;
  
  /** Detaillierte Fehlerinformationen */
  details?: Record<string, any>;
  
  constructor(message: string, code: string, status?: number, details?: Record<string, any>) {
    super(message);
    this.name = 'ServiceError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

/**
 * ServiceErrorHandler - Handler für Service-Fehler
 */
export type ServiceErrorHandler = (error: APIError | Error | unknown) => void;

/**
 * ServiceRequest - Genereller Anfrage-Typ für Services
 */
export interface ServiceRequest {
  /** Eindeutige ID der Anfrage */
  id: string;
  
  /** Typ der Anfrage */
  type: string;
  
  /** Daten der Anfrage */
  data: any;
  
  /** Zeitpunkt der Anfrage */
  timestamp: number;
  
  /** Absender der Anfrage */
  sender?: string;
  
  /** Metadaten der Anfrage */
  metadata?: Record<string, any>;
}

/**
 * ServiceResponse - Genereller Antwort-Typ für Services
 */
export interface ServiceResponse<T = any> {
  /** Eindeutige ID der Anfrage */
  requestId: string;
  
  /** Daten der Antwort */
  data?: T;
  
  /** Fehlermeldung bei fehlgeschlagener Anfrage */
  error?: any;
  
  /** War die Anfrage erfolgreich? */
  success: boolean;
  
  /** Zeitpunkt der Antwort */
  timestamp: number;
  
  /** Metadaten der Antwort */
  metadata?: Record<string, any>;
}

/**
 * Erstellt eine typisierte Service-Antwort
 */
export function createServiceResponse<T>(
  requestId: string,
  success: boolean,
  data?: T,
  error?: any,
  metadata?: Record<string, any>,
): ServiceResponse<T> {
  return {
    requestId,
    success,
    data,
    error,
    timestamp: Date.now(),
    metadata,
  };
}

/**
 * Wandelt eine APIResponse in eine ServiceResponse um
 */
export function mapApiToServiceResponse<T>(
  apiResponse: APIResponse<T>,
  requestId: string = Date.now().toString(),
): ServiceResponse<T> {
  return {
    requestId,
    success: apiResponse.success,
    data: apiResponse.data,
    error: apiResponse.error,
    timestamp: Date.now(),
    metadata: {
      message: apiResponse.message,
      statusCode: apiResponse.statusCode,
      context: apiResponse.context,
    },
  };
}

/**
 * Typed Service Factory - Erzeugt typisierte Service-Instanzen
 */
export interface TypedServiceFactory {
  /** Erzeugt eine ApiService-Instanz */
  createApiService(baseUrl: string, options?: any): ApiServiceInterface;
  
  /** Erzeugt eine SessionService-Instanz */
  createSessionService(apiService: ApiServiceInterface): SessionServiceInterface;
  
  /** Erzeugt eine StreamingService-Instanz */
  createStreamingService(options: StreamingOptions): StreamingServiceInterface;
}

/**
 * Ausführen einer Service-Methode mit Fehlerbehandlung und Typsicherheit
 */
export async function executeServiceMethod<T>(
  serviceMethod: () => Promise<APIResponse<T>>,
  errorHandler?: ServiceErrorHandler,
  defaultErrorMessage: string = 'Servicefehler'
): Promise<Result<T, APIError>> {
  try {
    const response = await serviceMethod();
    
    if (!response.success || !response.data) {
      const error = response.error || {
        code: 'SERVICE_ERROR',
        message: response.message || defaultErrorMessage,
        status: response.statusCode
      };
      
      if (errorHandler) {
        errorHandler(error);
      }
      
      return { success: false, error };
    }
    
    return { success: true, data: response.data };
  } catch (error) {
    const apiError: APIError = {
      code: 'UNEXPECTED_ERROR',
      message: error instanceof Error ? error.message : defaultErrorMessage,
      status: 500,
      details: { originalError: error }
    };
    
    if (errorHandler) {
      errorHandler(apiError);
    }
    
    return { success: false, error: apiError };
  }
}