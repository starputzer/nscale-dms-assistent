import {
  batchRequestService,
  BatchRequest,
} from "@/services/api/BatchRequestService";

/**
 * Optimierte API-Batching-Utilities für häufige Anwendungsfälle
 *
 * Diese Utilities vereinfachen die Verwendung des BatchRequestService für
 * typische Szenarien in der Anwendung und optimieren die Performance durch
 * intelligentes Batching von API-Aufrufen.
 */

/**
 * Typische Ressourcen-Operationen für RESTful APIs
 */
interface ResourceOperations<T> {
  getAll: () => Promise<T[]>;
  getById: (id: string) => Promise<T>;
  create: (data: Partial<T>) => Promise<T>;
  update: (id: string, data: Partial<T>) => Promise<T>;
  delete: (id: string) => Promise<void>;
}

/**
 * Erzeugt einen optimierten API-Client für CRUD-Operationen mit Batching
 *
 * @param resourceName Name der Ressource (z.B. 'users', 'sessions')
 * @param options Zusätzliche Optionen
 * @returns Objekt mit Standard-CRUD-Operationen
 */
export function createBatchedResourceClient<T>(
  resourceName: string,
  options: {
    baseEndpoint?: string;
    idField?: string;
    cacheGet?: boolean;
    cacheTTL?: number;
  } = {},
): ResourceOperations<T> {
  const {
    baseEndpoint = "/api",
    _idField = "id",
    cacheGet = true,
    cacheTTL = 60000, // 1 Minute Cache-Lebensdauer
  } = options;

  // Endpoint für diese Ressource
  const endpoint = `${baseEndpoint}/${resourceName}`;

  return {
    /**
     * Ruft alle Ressourcen ab
     */
    getAll: () =>
      batchRequestService.addRequest<T[]>({
        endpoint,
        method: "GET",
        meta: {
          cacheTTL: cacheGet ? cacheTTL : 0,
        },
      }),

    /**
     * Ruft eine Ressource anhand ihrer ID ab
     */
    getById: (id: string) =>
      batchRequestService.addRequest<T>({
        endpoint: `${endpoint}/${id}`,
        method: "GET",
        meta: {
          cacheTTL: cacheGet ? cacheTTL : 0,
        },
      }),

    /**
     * Erstellt eine neue Ressource
     */
    create: (data: Partial<T>) =>
      batchRequestService.addRequest<T>({
        endpoint,
        method: "POST",
        data,
      }),

    /**
     * Aktualisiert eine Ressource
     */
    update: (id: string, data: Partial<T>) =>
      batchRequestService.addRequest<T>({
        endpoint: `${endpoint}/${id}`,
        method: "PUT",
        data,
      }),

    /**
     * Löscht eine Ressource
     */
    delete: (id: string) =>
      batchRequestService.addRequest<void>({
        endpoint: `${endpoint}/${id}`,
        method: "DELETE",
      }),
  };
}

/**
 * Helper-Funktion für das Batching von Abfragen in Pinia-Stores
 *
 * @param requests Anfragen, die gebatcht werden sollen
 * @returns Ergebnis der gebatchten Anfragen
 */
export async function batchStoreQueries<T = any>(
  requests: BatchRequest[],
): Promise<T[]> {
  return batchRequestService.executeBatch<T>(requests);
}

/**
 * Führt eine Batch-Operation auf mehreren IDs durch
 *
 * @param ids Array von IDs, auf denen die Operation ausgeführt werden soll
 * @param endpoint Basis-Endpunkt für die Anfragen
 * @param method HTTP-Methode
 * @param data Optionale Daten pro ID
 * @returns Array von Ergebnissen in der gleichen Reihenfolge wie die IDs
 */
export async function batchOperationByIds<T = any>(
  ids: string[],
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  data?: Record<string, any>,
): Promise<T[]> {
  // Anfragen für alle IDs erstellen
  const requests: BatchRequest[] = ids.map((id: any) => ({
    endpoint: `${endpoint}/${id}`,
    method,
    data: data?.[id], // Wenn Daten vorhanden, individuelle Daten pro ID verwenden
    id: `${method.toLowerCase()}_${id}`, // Eindeutige ID für jede Anfrage
  }));

  return batchRequestService.executeBatch<T>(requests);
}

/**
 * Lädt mehrere verwandte Daten für eine Entität (z.B. Benutzer und seine Projekte)
 *
 * @param entityId ID der Hauptentität
 * @param relatedEndpoints Objekt mit Endpunkten für verwandte Daten
 * @returns Objekt mit den abgerufenen Daten
 */
export async function loadEntityWithRelations<T = Record<string, any>>(
  entityId: string,
  relatedEndpoints: Record<string, string>,
  baseEndpoint = "/api",
): Promise<T> {
  // Anfragen für die Hauptentität und die verwandten Daten erstellen
  const namedRequests: Record<string, BatchRequest> = {};

  // Hauptentität-Anfrage
  Object.entries(relatedEndpoints).forEach(([name, path]: any) => {
    namedRequests[name] = {
      endpoint: `${baseEndpoint}/${path.replace(":id", entityId)}`,
      method: "GET",
    };
  });

  return batchRequestService.executeNamedBatch<T>(namedRequests);
}

/**
 * Optimierte Version von Promise.all mit Batch-Anfragen
 *
 * @param promiseFunctions Array von Funktionen, die Promises zurückgeben
 * @param options Optionen für die Ausführung
 * @returns Array von Ergebnissen
 */
export async function batchPromises<T = any>(
  promiseFunctions: (() => Promise<T>)[],
  options: {
    concurrency?: number;
    retries?: number;
    retryDelay?: number;
  } = {},
): Promise<T[]> {
  const {
    concurrency = 5, // Standardmäßig 5 gleichzeitige Anfragen
    retries = 2,
    retryDelay = 1000,
  } = options;

  const results: T[] = new Array(promiseFunctions.length);
  let currentIndex = 0;

  const executeNextBatch = async (): Promise<void> => {
    // Nächste Batch-Größe berechnen
    const batchSize = Math.min(
      concurrency,
      promiseFunctions.length - currentIndex,
    );
    if (batchSize <= 0) return;

    // Batch ausführen
    const batch = Array.from({ length: batchSize }, (_, i) => {
      const index = currentIndex + i;
      return executeWithRetry(
        promiseFunctions[index],
        index,
        retries,
        retryDelay,
      );
    });

    await Promise.all(batch);

    // Index aktualisieren und nächsten Batch ausführen
    currentIndex += batchSize;
    if (currentIndex < promiseFunctions.length) {
      return executeNextBatch();
    }
  };

  // Führt eine Funktion mit Wiederholungsversuchen aus
  const executeWithRetry = async (
    fn: () => Promise<T>,
    index: number,
    retriesLeft: number,
    delay: number,
  ): Promise<void> => {
    try {
      const result = await fn();
      results[index] = result;
    } catch (error) {
      if (retriesLeft > 0) {
        // Bei Fehler warten und erneut versuchen
        await new Promise((resolve) => setTimeout(resolve, delay));
        await executeWithRetry(fn, index, retriesLeft - 1, delay * 2);
      } else {
        // Keine Wiederholungsversuche mehr übrig, Fehler weitergeben
        throw error;
      }
    }
  };

  await executeNextBatch();
  return results;
}
