import { AxiosRequestConfig, AxiosResponse } from "axios";
import apiService from "./ApiService";

/**
 * Debug information for batch responses
 */
export interface BatchResponseDebugInfo {
  rawResponse: any;
  processedResponse: any;
  expectedFormat: string;
  actualFormat: string;
  issues: string[];
  timestamp: Date;
}

/**
 * Interface für API-Request-Definitionen
 */
export interface BatchRequest {
  /** Pfad des API-Endpunkts, relativ zur API-Basis-URL */
  endpoint: string;

  /** HTTP-Methode für die Anfrage */
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

  /** Query-Parameter für die Anfrage */
  params?: Record<string, any>;

  /** Request-Body für POST, PUT und PATCH */
  data?: any;

  /** Eindeutige ID zur Identifizierung der Anfrage in der Antwort */
  id?: string;

  /** Gibt an, ob Fehler für diese Anfrage ignoriert werden sollen */
  ignoreErrors?: boolean;

  /** Gibt an, ob diese Anfrage bei einem Fehler den gesamten Batch abbrechen soll */
  criticalRequest?: boolean;

  /** Zeitlimit für diese Anfrage in Millisekunden (0 = kein Limit) */
  timeout?: number;

  /** Benutzerdefinierte Request-Header */
  headers?: Record<string, string>;

  /** Zusätzliche Metadaten für den Client */
  meta?: Record<string, any>;
}

/**
 * Interface für BatchResponse
 */
export interface BatchResponse<T = any> {
  /** ID der zugehörigen Anfrage */
  id: string;

  /** HTTP-Statuscode der Antwort */
  status: number;

  /** Eigentliche Antwortdaten */
  data: T;

  /** Request-Header der Antwort */
  headers?: Record<string, string>;

  /** Fehlermeldung bei fehlgeschlagenen Anfragen */
  error?: string;

  /** Request-Metadaten */
  meta?: Record<string, any>;
}

/**
 * Interface für Batch-Optionen
 */
export interface BatchRequestOptions {
  /** Maximale Anzahl der Anfragen pro Batch */
  maxBatchSize?: number;

  /** Verzögerung in Millisekunden, bevor der Batch ausgeführt wird */
  batchDelay?: number;

  /** Standard-Zeitlimit für alle Anfragen */
  defaultTimeout?: number;

  /** Cache-TTL in Millisekunden */
  cacheTTL?: number;

  /** Aktiviert erweiterte Fehlerbehandlung */
  extendedErrorHandling?: boolean;

  /** Aktiviert automatische Wiederholungsversuche bei Fehlern */
  enableRetry?: boolean;

  /** Maximale Anzahl der Wiederholungsversuche */
  maxRetries?: number;

  /** Verzögerung zwischen Wiederholungsversuchen in Millisekunden */
  retryDelay?: number;

  /** Callback für Batch-Start */
  onBatchStart?: (requests: BatchRequest[]) => void;

  /** Callback für Batch-Abschluss */
  onBatchComplete?: (responses: BatchResponse[], duration: number) => void;

  /** Callback für Batch-Fehler */
  onBatchError?: (error: Error, requests: BatchRequest[]) => void;
}

/**
 * Consolidated BatchRequestService with fixes from BatchRequestServiceFix.ts
 * Combines original functionality with improved server response handling
 */
export class BatchRequestService {
  private pendingRequests: BatchRequest[] = [];
  private pendingPromises: Map<
    string,
    {
      resolve: (value: any) => void;
      reject: (error: any) => void;
      timestamp: number;
    }
  > = new Map();

  private batchTimeout: number | null = null;
  private requestCounter = 0;

  // Cache für API-Antworten
  private responseCache: Map<
    string,
    {
      data: any;
      timestamp: number;
      ttl: number;
    }
  > = new Map();

  // Request-Tracker für Performance-Analyse
  private requestStats = {
    totalRequests: 0,
    batchedRequests: 0,
    savedRequests: 0,
    totalBatches: 0,
    errors: 0,
    averageBatchSize: 0,
    minBatchSize: Infinity,
    maxBatchSize: 0,
    cacheMissCount: 0,
    cacheHitCount: 0,
  };

  // Letzte Performance-Metriken
  private lastBatchMetrics = {
    startTime: 0,
    endTime: 0,
    requestCount: 0,
    responseTime: 0,
    averageResponseTime: 0,
  };

  private isProcessingBatch = false;
  private readonly MAX_BATCH_SIZE = 50;
  private readonly BATCH_DELAY = 50;
  private readonly _DEFAULT_TIMEOUT = 30000;
  private readonly CACHE_TTL = 300000; // 5 Minuten
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000;

  // Debug functionality from batchResponseFix
  private debugMode = false;
  private responseHistory: BatchResponseDebugInfo[] = [];

  constructor(
    private options: BatchRequestOptions = {
      maxBatchSize: 50,
      batchDelay: 50,
      defaultTimeout: 30000,
      cacheTTL: 300000,
      extendedErrorHandling: true,
      enableRetry: true,
      maxRetries: 3,
      retryDelay: 1000,
    },
  ) {
    // Cleanup-Intervall für Cache
    setInterval(() => this.cleanupCache(), 60000); // Alle 60 Sekunden
  }

  /**
   * Fügt eine neue Anfrage zum Batch hinzu
   * @param request Die Anfrage-Definition
   * @returns Promise mit der API-Antwort
   */
  public async addRequest<T = any>(request: BatchRequest): Promise<T> {
    // Generiere ID, falls nicht vorhanden
    if (!request.id) {
      request.id = `req_${++this.requestCounter}_${Date.now()}`;
    }

    // Prüfe Cache
    const cacheKey = this.generateCacheKey(request);
    const cachedResponse = this.getCachedResponse(cacheKey);
    if (cachedResponse) {
      this.requestStats.cacheHitCount++;
      return Promise.resolve(cachedResponse);
    }
    this.requestStats.cacheMissCount++;

    // Erstelle Promise für diese Anfrage
    const promise = new Promise<T>((resolve, reject) => {
      this.pendingPromises.set(request.id!, {
        resolve,
        reject,
        timestamp: Date.now(),
      });
    });

    // Füge Request zum Batch hinzu
    this.pendingRequests.push(request);
    this.requestStats.totalRequests++;

    // Plane Batch-Ausführung
    this.scheduleBatchExecution();

    return promise;
  }

  /**
   * Führt den Batch sofort aus
   * @returns Promise mit allen Batch-Antworten
   */
  public async executeBatch(
    requests?: BatchRequest[],
  ): Promise<BatchResponse[]> {
    const requestsToProcess = requests || [...this.pendingRequests];

    if (requestsToProcess.length === 0) {
      return [];
    }

    // Handle each request with proper error handling
    const results = await Promise.all(
      requestsToProcess.map(async (request) => {
        try {
          const response = await this.executeSingleRequest(request);
          return {
            id: request.id!,
            status: response.status,
            data: response.data,
            headers: response.headers,
          };
        } catch (error: any) {
          return {
            id: request.id!,
            status: error.response?.status || 500,
            data: null,
            error: error.message || "Request failed",
          };
        }
      }),
    );

    return results;
  }

  /**
   * Fixed response processing from BatchRequestServiceFix
   */
  private _processBatchResponse(serverResponse: any): BatchResponse[] {
    // Analyze response in debug mode
    if (this.debugMode) {
      this.analyzeResponse(serverResponse);
    }

    // Handle different server response formats
    let responses: any[] = [];

    // Format 1: Direct array of responses
    if (Array.isArray(serverResponse)) {
      responses = serverResponse;
    }
    // Format 2: Responses in 'responses' property
    else if (
      serverResponse.responses &&
      Array.isArray(serverResponse.responses)
    ) {
      responses = serverResponse.responses;
    }
    // Format 3: Responses in 'data' property
    else if (serverResponse.data && Array.isArray(serverResponse.data)) {
      responses = serverResponse.data;
    }
    // Format 4: Nested data.responses
    else if (
      serverResponse.data?.responses &&
      Array.isArray(serverResponse.data.responses)
    ) {
      responses = serverResponse.data.responses;
    }
    // Format 5: Server might return object with request IDs as keys
    else if (
      typeof serverResponse === "object" &&
      !Array.isArray(serverResponse)
    ) {
      responses = Object.entries(serverResponse).map(
        ([id, response]: [string, any]) => ({
          id,
          ...response,
        }),
      );
    }

    // Normalize responses
    return responses.map((response: any) => {
      // Handle different response structures
      if (response.response) {
        // Server might wrap actual response
        return {
          id: response.id || response.requestId || "unknown",
          status: response.status || response.statusCode || 200,
          data: response.response,
          headers: response.headers || {},
          error: response.error || undefined,
        };
      } else {
        // Direct response format
        return {
          id: response.id || response.requestId || "unknown",
          status: response.status || response.statusCode || 200,
          data: response.data !== undefined ? response.data : response,
          headers: response.headers || {},
          error: response.error || undefined,
        };
      }
    });
  }

  /**
   * Führt eine einzelne Anfrage aus (Fallback)
   */
  private async executeSingleRequest(
    request: BatchRequest,
  ): Promise<AxiosResponse> {
    const config: AxiosRequestConfig = {
      method: request.method || "GET",
      url: request.endpoint,
      params: request.params,
      data: request.data,
      headers: request.headers,
      timeout: request.timeout || this.options.defaultTimeout,
    };

    return apiService.request(config);
  }

  /**
   * Plant die Batch-Ausführung
   */
  private scheduleBatchExecution(): void {
    // Wenn bereits ein Timeout läuft, nichts tun
    if (this.batchTimeout !== null) {
      return;
    }

    // Führe sofort aus, wenn maximale Batch-Größe erreicht
    if (
      this.pendingRequests.length >=
      (this.options.maxBatchSize || this.MAX_BATCH_SIZE)
    ) {
      this.processPendingBatch();
      return;
    }

    // Plane Ausführung nach Verzögerung
    this.batchTimeout = window.setTimeout(() => {
      this.processPendingBatch();
    }, this.options.batchDelay || this.BATCH_DELAY);
  }

  /**
   * Verarbeitet den aktuellen Batch
   */
  private async processPendingBatch(): Promise<void> {
    // Reset Timeout
    if (this.batchTimeout !== null) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    // Keine Anfragen vorhanden
    if (this.pendingRequests.length === 0 || this.isProcessingBatch) {
      return;
    }

    this.isProcessingBatch = true;

    // Kopiere Anfragen und leere Pending-Liste
    const batchRequests = [...this.pendingRequests];
    this.pendingRequests = [];

    // Performance-Tracking
    const startTime = Date.now();
    this.lastBatchMetrics.startTime = startTime;
    this.lastBatchMetrics.requestCount = batchRequests.length;

    // Callback: Batch-Start
    if (this.options.onBatchStart) {
      this.options.onBatchStart(batchRequests);
    }

    try {
      // Führe Batch aus
      const responses = await this.executeBatchWithRetry(batchRequests);

      // Performance-Metriken
      const endTime = Date.now();
      const duration = endTime - startTime;
      this.lastBatchMetrics.endTime = endTime;
      this.lastBatchMetrics.responseTime = duration;
      this.lastBatchMetrics.averageResponseTime =
        duration / batchRequests.length;

      // Statistiken aktualisieren
      this.updateStatistics(batchRequests.length);

      // Verarbeite Antworten
      this.processResponses(batchRequests, responses);

      // Callback: Batch-Complete
      if (this.options.onBatchComplete) {
        this.options.onBatchComplete(responses, duration);
      }
    } catch (error) {
      this.requestStats.errors++;

      // Callback: Batch-Error
      if (this.options.onBatchError) {
        this.options.onBatchError(error as Error, batchRequests);
      }

      // Reject alle Promises
      batchRequests.forEach((request: any) => {
        const promise = this.pendingPromises.get(request.id!);
        if (promise) {
          promise.reject(error);
          this.pendingPromises.delete(request.id!);
        }
      });
    } finally {
      this.isProcessingBatch = false;

      // Prüfe, ob neue Anfragen während der Verarbeitung hinzugekommen sind
      if (this.pendingRequests.length > 0) {
        this.scheduleBatchExecution();
      }
    }
  }

  /**
   * Führt Batch mit Retry-Logik aus
   */
  private async executeBatchWithRetry(
    requests: BatchRequest[],
    retryCount = 0,
  ): Promise<BatchResponse[]> {
    try {
      const responses = await this.executeBatch(requests);
      return responses;
    } catch (error) {
      if (
        this.options.enableRetry &&
        retryCount < (this.options.maxRetries || this.MAX_RETRIES)
      ) {
        // Warte vor erneutem Versuch
        await new Promise((resolve) =>
          setTimeout(resolve, this.options.retryDelay || this.RETRY_DELAY),
        );

        // Erneuter Versuch
        return this.executeBatchWithRetry(requests, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * Verarbeitet die Batch-Antworten
   */
  private processResponses(
    requests: BatchRequest[],
    responses: BatchResponse[],
  ): void {
    // Map für schnellen Zugriff
    const responseMap = new Map<string, BatchResponse>();
    responses.forEach((response: any) => {
      responseMap.set(response.id, response);
    });

    // Resolve/Reject Promises
    requests.forEach((request: any) => {
      const promise = this.pendingPromises.get(request.id!);
      if (!promise) return;

      const response = responseMap.get(request.id!);

      if (response) {
        // Cache erfolgreiche Antworten
        if (response.status >= 200 && response.status < 300) {
          const cacheKey = this.generateCacheKey(request);
          this.setCachedResponse(cacheKey, response.data);
          promise.resolve(response.data);
        } else if (request.ignoreErrors) {
          // Ignoriere Fehler, wenn gewünscht
          promise.resolve(response.data || null);
        } else {
          // Erstelle Fehler
          const error: any = new Error(
            response.error || `Request failed with status ${response.status}`,
          );
          error.response = response;
          promise.reject(error);
        }
      } else {
        // Keine Antwort erhalten
        promise.reject(new Error("No response received for request"));
      }

      this.pendingPromises.delete(request.id!);
    });
  }

  /**
   * Generiert einen Cache-Key für eine Anfrage
   */
  private generateCacheKey(request: BatchRequest): string {
    const method = request.method || "GET";
    const params = request.params
      ? JSON.stringify(request.params, Object.keys(request.params).sort())
      : "";
    const data = request.data
      ? JSON.stringify(request.data, Object.keys(request.data).sort())
      : "";
    return `${method}:${request.endpoint}:${params}:${data}`;
  }

  /**
   * Holt eine gecachte Antwort
   */
  private getCachedResponse(cacheKey: string): any | null {
    const cached = this.responseCache.get(cacheKey);
    if (!cached) return null;

    // Prüfe TTL
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.responseCache.delete(cacheKey);
      return null;
    }

    return cached.data;
  }

  /**
   * Speichert eine Antwort im Cache
   */
  private setCachedResponse(cacheKey: string, data: any): void {
    this.responseCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl: this.options.cacheTTL || this.CACHE_TTL,
    });
  }

  /**
   * Bereinigt abgelaufene Cache-Einträge
   */
  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, value] of this.responseCache.entries()) {
      if (now - value.timestamp > value.ttl) {
        this.responseCache.delete(key);
      }
    }
  }

  /**
   * Aktualisiert die Statistiken
   */
  private updateStatistics(batchSize: number): void {
    this.requestStats.totalBatches++;
    this.requestStats.batchedRequests += batchSize;
    this.requestStats.savedRequests += batchSize > 1 ? batchSize - 1 : 0;

    // Min/Max Batch-Größe
    this.requestStats.minBatchSize = Math.min(
      this.requestStats.minBatchSize,
      batchSize,
    );
    this.requestStats.maxBatchSize = Math.max(
      this.requestStats.maxBatchSize,
      batchSize,
    );

    // Durchschnittliche Batch-Größe
    this.requestStats.averageBatchSize =
      this.requestStats.batchedRequests / this.requestStats.totalBatches;
  }

  /**
   * Gibt die aktuellen Statistiken zurück
   */
  public getStatistics() {
    return {
      ...this.requestStats,
      currentPendingRequests: this.pendingRequests.length,
      cacheSize: this.responseCache.size,
      lastBatchMetrics: { ...this.lastBatchMetrics },
    };
  }

  /**
   * Setzt die Statistiken zurück
   */
  public resetStatistics(): void {
    this.requestStats = {
      totalRequests: 0,
      batchedRequests: 0,
      savedRequests: 0,
      totalBatches: 0,
      errors: 0,
      averageBatchSize: 0,
      minBatchSize: Infinity,
      maxBatchSize: 0,
      cacheMissCount: 0,
      cacheHitCount: 0,
    };
  }

  /**
   * Leert den Response-Cache
   */
  public clearCache(): void {
    this.responseCache.clear();
  }

  /**
   * Bricht alle ausstehenden Anfragen ab
   */
  public cancelAllPendingRequests(): void {
    // Clear timeout
    if (this.batchTimeout !== null) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    // Reject alle Promises
    this.pendingRequests.forEach((request: any) => {
      const promise = this.pendingPromises.get(request.id!);
      if (promise) {
        promise.reject(new Error("Request cancelled"));
        this.pendingPromises.delete(request.id!);
      }
    });

    // Leere Pending-Listen
    this.pendingRequests = [];
  }

  /**
   * Führt mehrere Anfragen aus und gibt ein Objekt mit benannten Ergebnissen zurück
   *
   * @param namedRequests Objekt mit benannten Anfragen
   * @returns Promise mit Objekt von benannten Antworten
   */
  public async executeNamedBatch<T = any>(
    namedRequests: Record<string, BatchRequest>,
  ): Promise<Record<string, T>> {
    const requestEntries = Object.entries(namedRequests);
    const requestPromises = requestEntries.map(([name, request]: any) => {
      return this.addRequest<T>(request).then((response) => ({
        name,
        response,
      }));
    });

    const results = await Promise.all(requestPromises);

    // Ergebnisse in ein Objekt umwandeln
    return results.reduce(
      (acc, { name, response }) => {
        acc[name] = response;
        return acc;
      },
      {} as Record<string, T>,
    );
  }

  /**
   * Löscht einen Eintrag aus dem Cache
   *
   * @param request Anfrage, deren Cache-Eintrag gelöscht werden soll
   */
  public invalidateCache(request: BatchRequest): void {
    const cacheKey = this.generateCacheKey(request);
    this.responseCache.delete(cacheKey);
  }

  /**
   * Sendet alle ausstehenden Anfragen sofort, ohne auf das Timeout zu warten
   */
  public flushPendingRequests(): void {
    if (this.pendingRequests.length > 0) {
      this.processPendingBatch();
    }
  }

  /**
   * Legacy method for compatibility
   */
  public getStats(): typeof this.requestStats {
    return this.getStatistics();
  }

  // Debug methods from batchResponseFix
  /**
   * Enable debug mode
   */
  public enableDebug(): void {
    this.debugMode = true;
    console.log("🔍 Batch response debugging enabled");
  }

  /**
   * Disable debug mode
   */
  public disableDebug(): void {
    this.debugMode = false;
  }

  /**
   * Analyze batch response structure
   */
  private analyzeResponse(response: any): BatchResponseDebugInfo {
    const debugInfo: BatchResponseDebugInfo = {
      rawResponse: response,
      processedResponse: null,
      expectedFormat: "ApiResponse<{responses: BatchResponse[]}>",
      actualFormat: "",
      issues: [],
      timestamp: new Date(),
    };

    // Analyze structure
    if (!response) {
      debugInfo.actualFormat = "null/undefined";
      debugInfo.issues.push("Response is null or undefined");
    } else if (typeof response !== "object") {
      debugInfo.actualFormat = typeof response;
      debugInfo.issues.push(`Response is not an object: ${typeof response}`);
    } else {
      // Check for expected structure
      const hasSuccess = "success" in response;
      const hasData = "data" in response;
      const hasResponses =
        hasData && response.data && "responses" in response.data;
      const isResponsesArray =
        hasResponses && Array.isArray(response.data.responses);

      debugInfo.actualFormat = `{${Object.keys(response).join(", ")}}`;

      if (!hasSuccess) debugInfo.issues.push('Missing "success" field');
      if (!hasData) debugInfo.issues.push('Missing "data" field');
      if (!hasResponses)
        debugInfo.issues.push('Missing "data.responses" field');
      if (!isResponsesArray)
        debugInfo.issues.push("data.responses is not an array");

      // Process if valid
      if (hasResponses && isResponsesArray) {
        debugInfo.processedResponse = response.data.responses;
      }
    }

    // Store in history
    this.responseHistory.push(debugInfo);
    if (this.responseHistory.length > 10) {
      this.responseHistory.shift(); // Keep only last 10
    }

    if (this.debugMode) {
      console.log("🔍 Batch response analysis:", debugInfo);
    }

    return debugInfo;
  }

  /**
   * Get response history
   */
  public getResponseHistory(): BatchResponseDebugInfo[] {
    return this.responseHistory;
  }

  /**
   * Clear response history
   */
  public clearResponseHistory(): void {
    this.responseHistory = [];
    console.log("🗑️ Response history cleared");
  }
}

// Singleton-Instanz
export const batchRequestService = new BatchRequestService();

// Export für Kompatibilität
export default batchRequestService;
