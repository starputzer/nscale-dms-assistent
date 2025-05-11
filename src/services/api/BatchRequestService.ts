import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { ApiService } from "./ApiService";

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

  /** Gibt an, ob die Anfrage erfolgreich war */
  success: boolean;

  /** Fehlermeldung, falls Anfrage fehlgeschlagen ist */
  error?: string;

  /** Zeitpunkt, zu dem die Anfrage gestellt wurde */
  timestamp: number;

  /** Dauer der Anfrage in Millisekunden */
  duration: number;

  /** Ursprüngliche Anfrage */
  request: BatchRequest;
}

/**
 * Konfigurationsoptionen für den BatchRequestService
 */
export interface BatchRequestOptions {
  /** Maximale Anzahl der Anfragen pro Batch */
  maxBatchSize?: number;

  /** Zeit in ms, wie lange gewartet werden soll, bevor ein Batch gesendet wird */
  batchDelay?: number;

  /** Timeout für den gesamten Batch-Request in ms */
  timeout?: number;

  /** Ob bei einem kritischen Fehler der gesamte Batch abgebrochen werden soll */
  abortOnCriticalError?: boolean;

  /** Endpunkt für Batch-Anfragen */
  batchEndpoint?: string;

  /** Automatische Wiederholungsversuche bei Fehlern */
  retries?: number;

  /** Verzögerung zwischen Wiederholungsversuchen in ms */
  retryDelay?: number;

  /** Ob für einzelne Anfragen Caching aktiviert werden soll */
  enableCaching?: boolean;

  /** Standardlebensdauer des Caches in ms */
  defaultCacheTTL?: number;
}

/**
 * Optimierter Service für gebündelte API-Anfragen
 *
 * Bündelt mehrere API-Anfragen in eine einzige HTTP-Anfrage, um die Anzahl der
 * Netzwerkanfragen zu reduzieren und die Leistung zu verbessern.
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
  private requestStats: {
    totalRequests: number;
    batchedRequests: number;
    savedRequests: number;
    totalBatches: number;
    errors: number;
    averageBatchSize: number;
    minBatchSize: number;
    maxBatchSize: number;
    cacheMissCount: number;
    cacheHitCount: number;
  } = {
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

  constructor(private options: BatchRequestOptions = {}) {
    // Standardwerte für Optionen setzen
    this.options = {
      maxBatchSize: 10,
      batchDelay: 50,
      timeout: 30000,
      abortOnCriticalError: true,
      batchEndpoint: "/api/batch",
      retries: 2,
      retryDelay: 1000,
      enableCaching: true,
      defaultCacheTTL: 60000, // 1 Minute
      ...options,
    };

    // Cache-Bereinigung starten
    this.startCacheCleanup();
  }

  /**
   * Fügt eine Anfrage zum aktuellen Batch hinzu
   *
   * @param request API-Anfrage-Definition
   * @returns Promise, das mit der Antwort aufgelöst wird
   */
  public addRequest<T = any>(request: BatchRequest): Promise<T> {
    // Cache-Schlüssel berechnen
    const cacheKey = this.generateCacheKey(request);

    // Wenn Caching aktiviert ist und der Eintrag im Cache existiert, diesen verwenden
    if (this.options.enableCaching && request.method === "GET") {
      const cachedResponse = this.responseCache.get(cacheKey);

      if (
        cachedResponse &&
        Date.now() - cachedResponse.timestamp < cachedResponse.ttl
      ) {
        this.requestStats.cacheHitCount++;
        return Promise.resolve(cachedResponse.data);
      }

      this.requestStats.cacheMissCount++;
    }

    // Request-ID generieren, falls nicht vorhanden
    const requestId = request.id || `req_${++this.requestCounter}`;
    const requestWithId: BatchRequest = { ...request, id: requestId };

    // Performance-Tracking
    this.requestStats.totalRequests++;

    // Anfrage dem Batch hinzufügen
    this.pendingRequests.push(requestWithId);

    // Promise erstellen und speichern
    return new Promise<T>((resolve, reject) => {
      this.pendingPromises.set(requestId, {
        resolve,
        reject,
        timestamp: Date.now(),
      });

      // Batch-Timer starten/zurücksetzen
      this.scheduleBatch();
    });
  }

  /**
   * Plant das Senden des aktuellen Batches nach einer Verzögerung
   */
  private scheduleBatch(): void {
    // Wenn bereits ein Timeout geplant ist, diesen löschen
    if (this.batchTimeout !== null) {
      clearTimeout(this.batchTimeout);
    }

    // Wenn maximale Batchgröße erreicht ist, sofort senden
    if (this.pendingRequests.length >= (this.options.maxBatchSize || 10)) {
      this.sendBatch();
      return;
    }

    // Ansonsten nach Verzögerung senden
    this.batchTimeout = window.setTimeout(() => {
      this.sendBatch();
    }, this.options.batchDelay || 50);
  }

  /**
   * Sendet alle ausstehenden Anfragen als Batch
   */
  private async sendBatch(retryCount = 0): Promise<void> {
    if (this.pendingRequests.length === 0) return;

    // Batch-Tracking für Performance-Analyse
    this.requestStats.batchedRequests += this.pendingRequests.length;
    this.requestStats.savedRequests += this.pendingRequests.length - 1; // Eine Anfrage ist immer nötig
    this.requestStats.totalBatches++;

    // Min/Max-Batch-Größe aktualisieren
    this.requestStats.minBatchSize = Math.min(
      this.requestStats.minBatchSize,
      this.pendingRequests.length,
    );
    this.requestStats.maxBatchSize = Math.max(
      this.requestStats.maxBatchSize,
      this.pendingRequests.length,
    );

    // Durchschnittliche Batch-Größe aktualisieren
    this.requestStats.averageBatchSize =
      this.requestStats.batchedRequests / this.requestStats.totalBatches;

    // Lokale Kopie der ausstehenden Anfragen erstellen
    const requests = [...this.pendingRequests];

    // Ausstehende Anfragen zurücksetzen
    this.pendingRequests = [];
    this.batchTimeout = null;

    try {
      // Batch-Anfrage erstellen
      const response = await ApiService.customRequest({
        url: this.options.batchEndpoint,
        method: "POST",
        data: { requests },
        timeout: this.options.timeout,
      });

      // Batch-Antworten verarbeiten
      this.processBatchResponse(response.data.responses, requests);
    } catch (error) {
      this.requestStats.errors++;

      // Wiederholungsversuche, falls konfiguriert
      if (retryCount < (this.options.retries || 0)) {
        setTimeout(() => {
          // Anfragen wieder in die Warteschlange stellen
          this.pendingRequests.push(...requests);
          this.sendBatch(retryCount + 1);
        }, this.options.retryDelay || 1000);
        return;
      }

      // Fehler für alle ausstehenden Anfragen
      this.rejectAllPendingRequests(requests, error);
    }
  }

  /**
   * Verarbeitet die Antworten eines Batch-Requests
   */
  private processBatchResponse(
    responses: BatchResponse[],
    originalRequests: BatchRequest[],
  ): void {
    // Map für schnelleren Zugriff auf Anfragen nach ID
    const requestMap = new Map<string, BatchRequest>();
    originalRequests.forEach((req) => requestMap.set(req.id!, req));

    // Jede Antwort verarbeiten
    responses.forEach((response) => {
      const { id, success, data, error, status } = response;

      // Suche nach dem zugehörigen Promise
      const pendingPromise = this.pendingPromises.get(id);
      if (!pendingPromise) return;

      // Anfrage aus der Map entfernen
      this.pendingPromises.delete(id);

      // Cache-Antwort für GET-Anfragen, wenn erfolgreich
      const originalRequest = requestMap.get(id);
      if (
        success &&
        originalRequest &&
        originalRequest.method === "GET" &&
        this.options.enableCaching
      ) {
        const cacheKey = this.generateCacheKey(originalRequest);
        const ttl =
          originalRequest.meta?.cacheTTL ||
          this.options.defaultCacheTTL ||
          60000;

        this.responseCache.set(cacheKey, {
          data,
          timestamp: Date.now(),
          ttl,
        });
      }

      // Promise auflösen oder ablehnen
      if (success) {
        pendingPromise.resolve(data);
      } else {
        pendingPromise.reject({
          status,
          message: error || "Unknown error",
          data,
        });
      }
    });
  }

  /**
   * Lehnt alle Promises für ausstehende Anfragen ab
   */
  private rejectAllPendingRequests(requests: BatchRequest[], error: any): void {
    requests.forEach((request) => {
      const pendingPromise = this.pendingPromises.get(request.id!);
      if (pendingPromise) {
        pendingPromise.reject({
          status: error.status || 500,
          message: error.message || "Batch request failed",
          originalError: error,
        });
        this.pendingPromises.delete(request.id!);
      }
    });
  }

  /**
   * Generiert einen Cache-Schlüssel für eine Anfrage
   */
  private generateCacheKey(request: BatchRequest): string {
    // Normalisierte URL mit Query-Parametern
    const url =
      request.endpoint +
      (request.params
        ? "?" + new URLSearchParams(request.params as any).toString()
        : "");

    // Cache-Schlüssel aus Methode und URL
    return `${request.method || "GET"}:${url}`;
  }

  /**
   * Startet die regelmäßige Cache-Bereinigung
   */
  private startCacheCleanup(): void {
    // Intervall für Cache-Bereinigung (alle 5 Minuten)
    setInterval(() => {
      const now = Date.now();

      // Abgelaufene Einträge entfernen
      this.responseCache.forEach((entry, key) => {
        if (now - entry.timestamp > entry.ttl) {
          this.responseCache.delete(key);
        }
      });

      // Alte Promises bereinigen (älter als 5 Minuten)
      this.pendingPromises.forEach((promise, key) => {
        if (now - promise.timestamp > 300000) {
          promise.reject({
            status: 408,
            message: "Request timeout after 5 minutes",
          });
          this.pendingPromises.delete(key);
        }
      });
    }, 300000); // 5 Minuten
  }

  /**
   * Führt mehrere Anfragen gleichzeitig aus und löst auf, wenn alle abgeschlossen sind
   *
   * @param requests Array von API-Anfragen
   * @returns Promise mit Array von Antworten in der gleichen Reihenfolge
   */
  public async executeBatch<T = any>(requests: BatchRequest[]): Promise<T[]> {
    return Promise.all(requests.map((request) => this.addRequest<T>(request)));
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
    const requestPromises = requestEntries.map(([name, request]) => {
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
   * Sendet alle ausstehenden Anfragen sofort, ohne auf das Timeout zu warten
   */
  public flushPendingRequests(): void {
    if (this.pendingRequests.length > 0) {
      this.sendBatch();
    }
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
   * Löscht alle Cache-Einträge
   */
  public clearCache(): void {
    this.responseCache.clear();
  }

  /**
   * Gibt Statistiken über die Batch-Anfragen zurück
   */
  public getStats(): typeof this.requestStats {
    return { ...this.requestStats };
  }
}

// Singleton-Instanz für die Anwendung
export const batchRequestService = new BatchRequestService();
