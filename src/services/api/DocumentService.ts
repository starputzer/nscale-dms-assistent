/**
 * DocumentService - Spezialisierter Service für Dokumentenkonvertierung
 *
 * Dieser Service verwaltet Dokumente, Konvertierungen und zugehörige Funktionen
 * mit robuster Fehlerbehandlung und Offline-Unterstützung.
 */

import { apiService } from "./ApiService";
import { cachedApiService } from "./CachedApiService";
import { apiConfig } from "./config";
import { defaultIndexedDBService } from "../storage/IndexedDBService";
import { LogService } from "../log/LogService";
import {
  Document,
  UploadDocumentRequest,
  ConvertDocumentRequest,
  ApiResponse,
  PaginationRequest,
} from "@/types/api";
import { DocumentConverterState } from "@/types/documentConverter";
import { EventCallback, UnsubscribeFn } from "@/types/events";

/**
 * Upload-Fortschritt-Callback
 */
export interface UploadProgressCallback {
  (progress: number): void;
}

/**
 * Konvertierungs-Status-Callback
 */
export interface ConversionStatusCallback {
  (status: string, progress?: number): void;
}

/**
 * DocumentService Klasse
 */
export class DocumentService {
  /** Logger für Diagnose */
  private logger: LogService;

  /** Offline-Modus aktiv */
  private offlineMode: boolean = false;

  /** Event-Handler für Dokument-Ereignisse */
  private eventHandlers: Map<string, Set<Function>> = new Map();

  /** Status für aktive Konvertierungen */
  private activeConversions: Map<string, DocumentConverterState> = new Map();

  /** Polling-Intervall für Konvertierungsstatus (in ms) */
  private statusPollingInterval: number = 2000;

  /** Aktive Polling-Timer */
  private pollingTimers: Map<string, number> = new Map();

  /**
   * Konstruktor
   */
  constructor() {
    this.logger = new LogService("DocumentService");

    // Offline-Status überwachen
    if (typeof window !== "undefined") {
      window.addEventListener("online", this.handleOnlineEvent);
      window.addEventListener("offline", this.handleOfflineEvent);
      this.offlineMode = !navigator.onLine;
    }

    // IndexedDB initialisieren
    this.initializeOfflineStorage();
  }

  /**
   * Initialisiert den Offline-Speicher
   */
  private async initializeOfflineStorage(): Promise<void> {
    try {
      await defaultIndexedDBService.init();
      this.logger.info("Offline-Speicher initialisiert");
    } catch (error) {
      this.logger.error(
        "Fehler bei der Initialisierung des Offline-Speichers",
        error,
      );
    }
  }

  /**
   * Dokument hochladen
   */
  public async uploadDocument(
    file: File,
    metadata?: UploadDocumentRequest,
    onProgress?: UploadProgressCallback,
  ): Promise<ApiResponse<Document>> {
    try {
      // Im Offline-Modus nicht möglich
      if (this.offlineMode) {
        return {
          success: false,
          message: "Im Offline-Modus können keine Dokumente hochgeladen werden",
          error: {
            code: "OFFLINE_MODE_UPLOAD_ERROR",
            message:
              "Im Offline-Modus können keine Dokumente hochgeladen werden",
          },
        };
      }

      // Fortschritts-Callback für Upload
      const progressHandler = (event: any) => {
        if (event.total > 0) {
          const progress = Math.round((event.loaded / event.total) * 100);
          if (onProgress) {
            onProgress(progress);
          }

          // Event auslösen
          this.emitEvent("uploadProgress", {
            fileName: file.name,
            progress,
          });
        }
      };

      // Upload über apiService
      const response = await apiService.uploadFile<Document>(
        apiConfig.ENDPOINTS.DOCUMENTS.UPLOAD,
        file,
        {
          metadata,
          onProgress: progressHandler,
          timeout: apiConfig.TIMEOUTS.UPLOAD,
        },
      );

      if (response.success && response.data) {
        // Im Offline-Speicher speichern
        await defaultIndexedDBService.upsert(
          "documents",
          response.data,
          response.data.id,
        );

        // Event auslösen
        this.emitEvent("documentUploaded", response.data);
      }

      return response;
    } catch (error) {
      this.logger.error(`Fehler beim Hochladen der Datei ${file.name}`, error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : `Fehler beim Hochladen der Datei ${file.name}`,
        error: {
          code: "DOCUMENT_UPLOAD_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Dokument konvertieren
   */
  public async convertDocument(
    request: ConvertDocumentRequest,
    onStatusChange?: ConversionStatusCallback,
  ): Promise<ApiResponse<Document>> {
    try {
      // Im Offline-Modus nicht möglich
      if (this.offlineMode) {
        return {
          success: false,
          message: "Im Offline-Modus können keine Dokumente konvertiert werden",
          error: {
            code: "OFFLINE_MODE_CONVERT_ERROR",
            message:
              "Im Offline-Modus können keine Dokumente konvertiert werden",
          },
        };
      }

      // Status auf 'In Bearbeitung' setzen
      if (onStatusChange) {
        onStatusChange("processing", 0);
      }

      // Konvertierung starten
      const response = await apiService.post<Document>(
        apiConfig.ENDPOINTS.DOCUMENTS.CONVERT,
        request,
      );

      if (response.success && response.data) {
        // Im Offline-Speicher aktualisieren
        await defaultIndexedDBService.upsert(
          "documents",
          response.data,
          response.data.id,
        );

        // Event auslösen
        this.emitEvent("conversionStarted", response.data);

        // Status aktualisieren
        const documentState: DocumentConverterState = {
          id: response.data.id,
          status: response.data.status,
          progress: 0,
          document: response.data,
        };

        this.activeConversions.set(response.data.id, documentState);

        // Polling für Status-Updates starten
        this.startStatusPolling(response.data.id, onStatusChange);
      } else {
        // Fehler-Status
        if (onStatusChange) {
          onStatusChange("failed");
        }
      }

      return response;
    } catch (error) {
      this.logger.error(
        `Fehler bei der Konvertierung des Dokuments ${request.documentId}`,
        error,
      );

      // Fehler-Status
      if (onStatusChange) {
        onStatusChange("failed");
      }

      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : `Fehler bei der Konvertierung des Dokuments ${request.documentId}`,
        error: {
          code: "DOCUMENT_CONVERT_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Polling für Konvertierungsstatus starten
   */
  private startStatusPolling(
    documentId: string,
    callback?: ConversionStatusCallback,
  ): void {
    // Bestehenden Timer löschen
    if (this.pollingTimers.has(documentId)) {
      window.clearInterval(this.pollingTimers.get(documentId));
    }

    // Neuen Timer erstellen
    const timerId = window.setInterval(async () => {
      try {
        // Status abrufen
        const response = await apiService.get<Document>(
          apiConfig.ENDPOINTS.DOCUMENTS.DOCUMENT(documentId),
        );

        if (response.success && response.data) {
          const document = response.data;

          // Im Offline-Speicher aktualisieren
          await defaultIndexedDBService.upsert(
            "documents",
            document,
            document.id,
          );

          // Status aktualisieren
          const prevState = this.activeConversions.get(documentId);
          const newState: DocumentConverterState = {
            id: document.id,
            status: document.status,
            progress: (document.metadata?.progress || 0) * 100,
            document: document,
          };

          this.activeConversions.set(documentId, newState);

          // Callback aufrufen
          if (callback) {
            callback(document.status, newState.progress);
          }

          // Event auslösen, wenn Status sich geändert hat
          if (!prevState || prevState.status !== newState.status) {
            this.emitEvent("conversionStatusChanged", newState);
          }

          // Bei abgeschlossener Konvertierung Polling stoppen
          if (document.status === "completed" || document.status === "failed") {
            this.stopStatusPolling(documentId);

            // Event auslösen
            this.emitEvent(
              document.status === "completed"
                ? "conversionCompleted"
                : "conversionFailed",
              document,
            );
          }
        }
      } catch (error) {
        this.logger.error(
          `Fehler beim Abrufen des Konvertierungsstatus für Dokument ${documentId}`,
          error,
        );

        // Fehler-Zähler inkrementieren
        const state = this.activeConversions.get(documentId);
        if (state) {
          state.errorCount = (state.errorCount || 0) + 1;

          // Nach 5 fehlgeschlagenen Versuchen Polling stoppen
          if (state.errorCount >= 5) {
            this.stopStatusPolling(documentId);

            // Callback mit Fehler aufrufen
            if (callback) {
              callback("failed");
            }

            // Event auslösen
            this.emitEvent("conversionFailed", {
              id: documentId,
              status: "failed",
              error:
                error instanceof Error
                  ? error.message
                  : "Zu viele fehlgeschlagene Statusabfragen",
            });
          }
        }
      }
    }, this.statusPollingInterval);

    // Timer speichern
    this.pollingTimers.set(documentId, timerId);
  }

  /**
   * Polling für Konvertierungsstatus stoppen
   */
  private stopStatusPolling(documentId: string): void {
    if (this.pollingTimers.has(documentId)) {
      window.clearInterval(this.pollingTimers.get(documentId));
      this.pollingTimers.delete(documentId);
      this.logger.debug(`Status-Polling für Dokument ${documentId} gestoppt`);
    }
  }

  /**
   * Dokument herunterladen
   */
  public async downloadDocument(
    documentId: string,
    fileName?: string,
    onProgress?: UploadProgressCallback,
  ): Promise<Blob> {
    try {
      // Im Offline-Modus prüfen, ob im Cache
      if (this.offlineMode) {
        const cachedDocument = await this.getDocumentFromCache(documentId);
        if (cachedDocument && cachedDocument.content) {
          // Für Texte/JSON können wir einen Blob erstellen
          return new Blob([cachedDocument.content], {
            type: cachedDocument.mimeType || "application/octet-stream",
          });
        }

        throw new Error("Im Offline-Modus ist dieses Dokument nicht verfügbar");
      }

      // Fortschritts-Callback für Download
      const progressHandler = (event: any) => {
        if (event.total > 0) {
          const progress = Math.round((event.loaded / event.total) * 100);
          if (onProgress) {
            onProgress(progress);
          }

          // Event auslösen
          this.emitEvent("downloadProgress", {
            documentId,
            progress,
          });
        }
      };

      // Download über apiService
      const blob = await apiService.downloadFile(
        apiConfig.ENDPOINTS.DOCUMENTS.DOCUMENT(documentId),
        {
          filename: fileName,
          onProgress: progressHandler,
          timeout: apiConfig.TIMEOUTS.UPLOAD,
        },
      );

      return blob;
    } catch (error) {
      this.logger.error(
        `Fehler beim Herunterladen des Dokuments ${documentId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Dokument aus dem Cache laden
   */
  private async getDocumentFromCache(
    documentId: string,
  ): Promise<Document | null> {
    try {
      return await defaultIndexedDBService.get<Document>(
        "documents",
        documentId,
      );
    } catch (error) {
      this.logger.error(
        `Fehler beim Laden des Dokuments ${documentId} aus dem Cache`,
        error,
      );
      return null;
    }
  }

  /**
   * Alle Dokumente abrufen
   */
  public async getDocuments(
    pagination?: PaginationRequest,
  ): Promise<ApiResponse<Document[]>> {
    try {
      // Im Offline-Modus aus IndexedDB laden
      if (this.offlineMode) {
        return this.getOfflineDocuments(pagination);
      }

      // Cache-Strategie
      const options = {
        cache: true,
        staleWhileRevalidate: true,
        cacheTTL: 300, // 5 Minuten
      };

      // Über den Cached-API-Service anfragen
      const response = await cachedApiService.getPaginated<Document[]>(
        apiConfig.ENDPOINTS.DOCUMENTS.DOCUMENT("list"),
        pagination || { page: 1, pageSize: 20 },
        options,
      );

      if (response.success && response.data) {
        // Im Offline-Speicher synchronisieren
        await this.syncDocumentsToOfflineStorage(response.data);
      }

      return response;
    } catch (error) {
      this.logger.error("Fehler beim Abrufen der Dokumente", error);

      // Fallback auf Offline-Daten bei Netzwerkfehlern
      if (
        error instanceof Error &&
        (error.message.includes("network") || this.offlineMode)
      ) {
        this.logger.info("Verwende Offline-Daten als Fallback für Dokumente");
        return this.getOfflineDocuments(pagination);
      }

      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Fehler beim Abrufen der Dokumente",
        error: {
          code: "DOCUMENTS_FETCH_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Dokumente aus dem Offline-Speicher laden
   */
  private async getOfflineDocuments(
    pagination?: PaginationRequest,
  ): Promise<ApiResponse<Document[]>> {
    try {
      const page = pagination?.page || 1;
      const pageSize = pagination?.pageSize || 20;
      const sortBy = pagination?.sortBy || "uploadedAt";
      const sortDirection = pagination?.sortDirection || "desc";

      // Aus IndexedDB laden
      const documents = await defaultIndexedDBService.getAll<Document>(
        "documents",
        {
          limit: pageSize,
          // Direction entsprechend der Sortierrichtung
          direction: sortDirection === "desc" ? "prev" : "next",
          // Index basierend auf dem Sortierfeld
          index: sortBy,
        },
      );

      return {
        success: true,
        data: documents,
        message: "Dokumente aus Offline-Speicher geladen",
      };
    } catch (error) {
      this.logger.error(
        "Fehler beim Abrufen der Dokumente aus dem Offline-Speicher",
        error,
      );
      return {
        success: false,
        message: "Fehler beim Abrufen der Offline-Dokumente",
        error: {
          code: "OFFLINE_DOCUMENTS_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Synchronisiert Dokumente in den Offline-Speicher
   */
  private async syncDocumentsToOfflineStorage(
    documents: Document[],
  ): Promise<void> {
    try {
      for (const document of documents) {
        await defaultIndexedDBService.upsert(
          "documents",
          document,
          document.id,
        );
      }
      this.logger.debug(
        `${documents.length} Dokumente im Offline-Speicher synchronisiert`,
      );
    } catch (error) {
      this.logger.error("Fehler bei der Synchronisierung der Dokumente", error);
    }
  }

  /**
   * Einzelnes Dokument abrufen
   */
  public async getDocument(documentId: string): Promise<ApiResponse<Document>> {
    try {
      // Im Offline-Modus aus IndexedDB laden
      if (this.offlineMode) {
        return this.getOfflineDocument(documentId);
      }

      // Cache-Strategie
      const options = {
        cache: true,
        staleWhileRevalidate: true,
        cacheTTL: 300, // 5 Minuten
      };

      // Über den Cached-API-Service anfragen
      const response = await cachedApiService.get<Document>(
        apiConfig.ENDPOINTS.DOCUMENTS.DOCUMENT(documentId),
        undefined,
        options,
      );

      if (response.success && response.data) {
        // Im Offline-Speicher speichern
        await defaultIndexedDBService.upsert(
          "documents",
          response.data,
          response.data.id,
        );
      }

      return response;
    } catch (error) {
      this.logger.error(
        `Fehler beim Abrufen des Dokuments ${documentId}`,
        error,
      );

      // Fallback auf Offline-Daten bei Netzwerkfehlern
      if (
        error instanceof Error &&
        (error.message.includes("network") || this.offlineMode)
      ) {
        this.logger.info("Verwende Offline-Daten als Fallback für Dokument");
        return this.getOfflineDocument(documentId);
      }

      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : `Fehler beim Abrufen des Dokuments ${documentId}`,
        error: {
          code: "DOCUMENT_FETCH_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Dokument aus dem Offline-Speicher laden
   */
  private async getOfflineDocument(
    documentId: string,
  ): Promise<ApiResponse<Document>> {
    try {
      const document = await defaultIndexedDBService.get<Document>(
        "documents",
        documentId,
      );

      if (!document) {
        return {
          success: false,
          message: `Dokument ${documentId} nicht im Offline-Speicher gefunden`,
          error: {
            code: "OFFLINE_DOCUMENT_NOT_FOUND",
            message: `Dokument ${documentId} nicht im Offline-Speicher gefunden`,
          },
        };
      }

      return {
        success: true,
        data: document,
        message: "Dokument aus Offline-Speicher geladen",
      };
    } catch (error) {
      this.logger.error(
        `Fehler beim Abrufen des Dokuments ${documentId} aus dem Offline-Speicher`,
        error,
      );
      return {
        success: false,
        message: "Fehler beim Abrufen des Offline-Dokuments",
        error: {
          code: "OFFLINE_DOCUMENT_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Dokument löschen
   */
  public async deleteDocument(documentId: string): Promise<ApiResponse<void>> {
    try {
      // Im Offline-Modus nur lokales Löschen
      if (this.offlineMode) {
        // Aus IndexedDB löschen
        await defaultIndexedDBService.delete("documents", documentId);

        // Event auslösen
        this.emitEvent("documentDeleted", { documentId });

        return {
          success: true,
          message: "Dokument lokal gelöscht (Offline-Modus)",
        };
      }

      // Über API löschen
      const response = await apiService.delete(
        apiConfig.ENDPOINTS.DOCUMENTS.DOCUMENT(documentId),
      );

      if (response.success) {
        // Aus IndexedDB löschen
        await defaultIndexedDBService.delete("documents", documentId);

        // Event auslösen
        this.emitEvent("documentDeleted", { documentId });
      }

      return response;
    } catch (error) {
      this.logger.error(
        `Fehler beim Löschen des Dokuments ${documentId}`,
        error,
      );
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : `Fehler beim Löschen des Dokuments ${documentId}`,
        error: {
          code: "DOCUMENT_DELETE_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Dokument aktualisieren (Metadaten)
   */
  public async updateDocument(
    documentId: string,
    updates: Partial<Document>,
  ): Promise<ApiResponse<Document>> {
    try {
      // Im Offline-Modus nur lokale Aktualisierung
      if (this.offlineMode) {
        // Aktuelle Version aus dem Cache laden
        const document = await defaultIndexedDBService.get<Document>(
          "documents",
          documentId,
        );

        if (!document) {
          return {
            success: false,
            message: `Dokument ${documentId} nicht im Offline-Speicher gefunden`,
            error: {
              code: "OFFLINE_DOCUMENT_NOT_FOUND",
              message: `Dokument ${documentId} nicht im Offline-Speicher gefunden`,
            },
          };
        }

        // Updates anwenden
        const updatedDocument = {
          ...document,
          ...updates,
        };

        // Im Offline-Speicher aktualisieren
        await defaultIndexedDBService.upsert(
          "documents",
          updatedDocument,
          updatedDocument.id,
        );

        // Event auslösen
        this.emitEvent("documentUpdated", updatedDocument);

        return {
          success: true,
          data: updatedDocument,
          message: "Dokument lokal aktualisiert (Offline-Modus)",
        };
      }

      // Über API aktualisieren
      const response = await apiService.patch<Document>(
        apiConfig.ENDPOINTS.DOCUMENTS.DOCUMENT(documentId),
        updates,
      );

      if (response.success && response.data) {
        // Im Offline-Speicher aktualisieren
        await defaultIndexedDBService.upsert(
          "documents",
          response.data,
          response.data.id,
        );

        // Event auslösen
        this.emitEvent("documentUpdated", response.data);
      }

      return response;
    } catch (error) {
      this.logger.error(
        `Fehler beim Aktualisieren des Dokuments ${documentId}`,
        error,
      );
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : `Fehler beim Aktualisieren des Dokuments ${documentId}`,
        error: {
          code: "DOCUMENT_UPDATE_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Konvertierung abbrechen
   */
  public async cancelConversion(
    documentId: string,
  ): Promise<ApiResponse<void>> {
    try {
      // Polling stoppen
      this.stopStatusPolling(documentId);

      // Im Offline-Modus nicht möglich
      if (this.offlineMode) {
        return {
          success: false,
          message:
            "Im Offline-Modus können keine Konvertierungen abgebrochen werden",
          error: {
            code: "OFFLINE_MODE_CANCEL_ERROR",
            message:
              "Im Offline-Modus können keine Konvertierungen abgebrochen werden",
          },
        };
      }

      // Über API abbrechen
      const response = await apiService.post<void>(
        `${apiConfig.ENDPOINTS.DOCUMENTS.DOCUMENT(documentId)}/cancel`,
      );

      if (response.success) {
        // Event auslösen
        this.emitEvent("conversionCancelled", { documentId });

        // Aktive Konvertierung entfernen
        this.activeConversions.delete(documentId);
      }

      return response;
    } catch (error) {
      this.logger.error(
        `Fehler beim Abbrechen der Konvertierung ${documentId}`,
        error,
      );
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : `Fehler beim Abbrechen der Konvertierung ${documentId}`,
        error: {
          code: "CONVERSION_CANCEL_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Gibt den aktuellen Konvertierungsstatus zurück
   */
  public getConversionState(documentId: string): DocumentConverterState | null {
    return this.activeConversions.get(documentId) || null;
  }

  /**
   * Handler für Online-Events
   */
  private handleOnlineEvent = (): void => {
    this.offlineMode = false;
    this.logger.info("Online-Modus aktiviert");

    // Event auslösen
    this.emitEvent("online");
  };

  /**
   * Handler für Offline-Events
   */
  private handleOfflineEvent = (): void => {
    this.offlineMode = true;
    this.logger.info("Offline-Modus aktiviert");

    // Event auslösen
    this.emitEvent("offline");
  };

  /**
   * Registriert einen Event-Handler
   */
  public on(event: string, handler: EventCallback | UnsubscribeFn): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }

    this.eventHandlers.get(event)?.add(handler);
  }

  /**
   * Entfernt einen Event-Handler
   */
  public off(event: string, handler: EventCallback | UnsubscribeFn): void {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event)?.delete(handler);
    }
  }

  /**
   * Löst ein Event aus
   */
  private emitEvent(event: string, data?: any): void {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event)?.forEach((handler: any) => {
        try {
          handler(data);
        } catch (error) {
          this.logger.error(`Fehler im Event-Handler für '${event}'`, error);
        }
      });
    }
  }

  /**
   * Bereinigt Ressourcen
   */
  public destroy(): void {
    // Polling für alle Konvertierungen stoppen
    for (const documentId of this.pollingTimers.keys()) {
      this.stopStatusPolling(documentId);
    }

    // Event-Listener entfernen
    if (typeof window !== "undefined") {
      window.removeEventListener("online", this.handleOnlineEvent);
      window.removeEventListener("offline", this.handleOfflineEvent);
    }

    // Event-Handler löschen
    this.eventHandlers.clear();
  }
}

// Singleton-Instanz erstellen
export const documentService = new DocumentService();

export default documentService;
