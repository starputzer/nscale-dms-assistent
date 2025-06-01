/**
 * TypedDocumentService - Typsicherer Service für Dokumente und Konvertierungen
 *
 * Diese Klasse bietet eine voll typisierte Schnittstelle für die Interaktion
 * mit Dokumenten, einschließlich Upload, Konvertierung und Verarbeitung.
 */

import { BaseApiService } from "./BaseApiService";
import { apiService } from "./ApiService";
import { apiConfig } from "./config";
import { defaultIndexedDBService } from "../storage/IndexedDBService";
import { Result, APIError, CachePolicy } from "@/utils/apiTypes";

import type {
  Document,
  UploadDocumentRequest,
  ConvertDocumentRequest,
  PaginationParams,
} from "@/types/api";

/**
 * Filterparameter für Dokument-Abfragen
 */
export interface DocumentFilterParams extends PaginationParams {
  /** Nach Dokumenttypen filtern */
  documentTypes?: string[];

  /** Nach Statuswerten filtern */
  status?: ("pending" | "processing" | "completed" | "failed")[];

  /** Nur Dokumente eines bestimmten Benutzers */
  userId?: string;

  /** Sortierung nach einem Feld */
  sortBy?: "uploadedAt" | "filename" | "size";

  /** Sortierrichtung */
  sortDirection?: "asc" | "desc";
}

/**
 * Typisierte Ereignisse, die vom DocumentService ausgelöst werden können
 */
export type DocumentServiceEvent =
  | "documentUploaded"
  | "documentConverting"
  | "documentConverted"
  | "documentDeleted"
  | "conversionProgress"
  | "conversionCompleted"
  | "conversionError";

/**
 * Ereignis-Handler-Typ
 */
export type DocumentEventHandler = (data: any) => void;

/**
 * Upload-Optionen
 */
export interface DocumentUploadOptions {
  /** Fortschritts-Callback */
  onProgress?: (progress: number) => void;

  /** Konvertierung nach dem Upload automatisch starten */
  autoConvert?: boolean;

  /** Zielformat für die Auto-Konvertierung */
  targetFormat?: string;

  /** Zusätzliche Konvertierungsoptionen */
  convertOptions?: Record<string, any>;
}

/**
 * Typisierter DocumentService
 */
export class TypedDocumentService extends BaseApiService<
  Document,
  UploadDocumentRequest,
  Partial<Document>,
  DocumentFilterParams
> {
  /** Offline-Modus aktiv */
  private offlineMode: boolean = false;

  /** Event-Handler für Dokument-Ereignisse */
  private eventHandlers: Map<DocumentServiceEvent, Set<DocumentEventHandler>> =
    new Map();

  /**
   * Konstruktor
   */
  constructor() {
    super({
      resourcePath: "documents",
      serviceName: "TypedDocumentService",
      defaultCachePolicy: CachePolicy.CACHE_FIRST,
      defaultCacheTTL: 300, // 5 Minuten
      errorMessages: {
        GET_ERROR: "Fehler beim Abrufen des Dokuments",
        LIST_ERROR: "Fehler beim Abrufen der Dokumentliste",
        CREATE_ERROR: "Fehler beim Erstellen eines neuen Dokuments",
        UPDATE_ERROR: "Fehler beim Aktualisieren des Dokuments",
        DELETE_ERROR: "Fehler beim Löschen des Dokuments",
      },
    });

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
      this.logger.info("Offline-Speicher für Dokumente initialisiert");
    } catch (error) {
      this.logger.error(
        "Fehler bei der Initialisierung des Offline-Speichers für Dokumente",
        error,
      );
    }
  }

  /**
   * Lädt eine Datei hoch
   */
  public async uploadFile(
    file: File | Blob,
    params?: UploadDocumentRequest,
    options: DocumentUploadOptions = {},
  ): Promise<Result<Document, APIError>> {
    try {
      // Im Offline-Modus keine neuen Dokumente hochladen
      if (this.offlineMode) {
        return {
          success: false,
          error: {
            code: "OFFLINE_MODE_UPLOAD_ERROR",
            message:
              "Im Offline-Modus können keine Dokumente hochgeladen werden",
            status: 0,
          },
        };
      }

      // FormData für den Upload erstellen
      const formData = new FormData();
      formData.append("file", file);

      // Metadaten hinzufügen, wenn vorhanden
      if (params) {
        for (const [key, value] of Object.entries(params)) {
          formData.append(
            key,
            typeof value === "object" ? JSON.stringify(value) : String(value),
          );
        }
      }

      // Upload-Anfrage konfigurieren
      const requestOptions = {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: apiConfig.TIMEOUTS.UPLOAD,
        onProgress: options.onProgress,
      };

      // Datei hochladen
      const result = await this.safeRequest<Document>(
        apiService.uploadFile.bind(apiService),
        "Fehler beim Hochladen der Datei",
        apiConfig.ENDPOINTS.DOCUMENTS.UPLOAD,
        file,
        {
          ...requestOptions,
          metadata: params,
        },
      );

      // Bei Erfolg und AutoConvert Option
      if (result.success && options.autoConvert && options.targetFormat) {
        const convertRequest: ConvertDocumentRequest = {
          documentId: result.data.id,
          targetFormat: options.targetFormat,
          options: options.convertOptions,
        };

        // Dokument konvertieren
        this.convertDocument(convertRequest).catch((error) => {
          this.logger.error(
            "Fehler bei der automatischen Konvertierung",
            error,
          );
        });
      }

      // Bei Erfolg Event auslösen
      if (result.success) {
        this.emitEvent("documentUploaded", result.data);

        // Im Offline-Speicher speichern
        await defaultIndexedDBService.upsert(
          "documents",
          result.data,
          result.data.id,
        );
      }

      return result;
    } catch (error) {
      this.logger.error("Fehler beim Hochladen der Datei", error);
      return {
        success: false,
        error: {
          code: "DOCUMENT_UPLOAD_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Fehler beim Hochladen der Datei",
          status: 0,
        },
      };
    }
  }

  /**
   * Konvertiert ein Dokument
   */
  public async convertDocument(
    convertRequest: ConvertDocumentRequest,
  ): Promise<Result<Document, APIError>> {
    try {
      // Im Offline-Modus keine Dokumente konvertieren
      if (this.offlineMode) {
        return {
          success: false,
          error: {
            code: "OFFLINE_MODE_CONVERT_ERROR",
            message:
              "Im Offline-Modus können keine Dokumente konvertiert werden",
            status: 0,
          },
        };
      }

      // Event auslösen für Konvertierungsbeginn
      this.emitEvent("documentConverting", {
        documentId: convertRequest.documentId,
        targetFormat: convertRequest.targetFormat,
      });

      // Konvertierungsanfrage senden
      const result = await this.safeRequest<Document>(
        apiService.post.bind(apiService),
        "Fehler bei der Konvertierung des Dokuments",
        apiConfig.ENDPOINTS.DOCUMENTS.CONVERT,
        convertRequest,
      );

      // Bei Erfolg Event auslösen
      if (result.success) {
        this.emitEvent("documentConverted", result.data);

        // Im Offline-Speicher aktualisieren
        await defaultIndexedDBService.upsert(
          "documents",
          result.data,
          result.data.id,
        );
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Fehler bei der Konvertierung des Dokuments ${convertRequest.documentId}`,
        error,
      );

      // Fehler-Event auslösen
      this.emitEvent("conversionError", {
        documentId: convertRequest.documentId,
        error: error instanceof Error ? error.message : "Unbekannter Fehler",
      });

      return {
        success: false,
        error: {
          code: "DOCUMENT_CONVERT_ERROR",
          message:
            error instanceof Error
              ? error.message
              : `Fehler bei der Konvertierung des Dokuments`,
          status: 0,
        },
      };
    }
  }

  /**
   * Lädt ein konvertiertes Dokument herunter
   */
  public async downloadDocument(
    documentId: string,
    filename?: string,
    onProgress?: (progress: number) => void,
  ): Promise<Result<Blob, APIError>> {
    try {
      // Im Offline-Modus keine Dokumente herunterladen
      if (this.offlineMode) {
        return {
          success: false,
          error: {
            code: "OFFLINE_MODE_DOWNLOAD_ERROR",
            message:
              "Im Offline-Modus können keine Dokumente heruntergeladen werden",
            status: 0,
          },
        };
      }

      // Download-Anfrage konfigurieren
      const options = {
        responseType: "blob",
        timeout: apiConfig.TIMEOUTS.UPLOAD,
        onProgress,
        filename,
      };

      // Versuch, Dokument herunterzuladen
      const response = await apiService.downloadFile(
        apiConfig.ENDPOINTS.DOCUMENTS.DOCUMENT(documentId),
        options,
      );

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      this.logger.error(
        `Fehler beim Herunterladen des Dokuments ${documentId}`,
        error,
      );
      return {
        success: false,
        error: {
          code: "DOCUMENT_DOWNLOAD_ERROR",
          message:
            error instanceof Error
              ? error.message
              : `Fehler beim Herunterladen des Dokuments`,
          status: 0,
        },
      };
    }
  }

  /**
   * Event-System
   */

  /**
   * Registriert einen Event-Handler
   */
  public on(
    event: DocumentServiceEvent,
    handler: DocumentEventHandler,
  ): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }

    this.eventHandlers.get(event)?.add(handler);

    // Rückgabe der Unsubscribe-Funktion
    return () => this.off(event, handler);
  }

  /**
   * Entfernt einen Event-Handler
   */
  public off(event: DocumentServiceEvent, handler: DocumentEventHandler): void {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event)?.delete(handler);
    }
  }

  /**
   * Löst ein Event aus
   */
  private emitEvent(event: DocumentServiceEvent, data?: any): void {
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        handlers.forEach((handler: any) => {
          try {
            handler(data);
          } catch (error) {
            this.logger.error(`Fehler im Event-Handler für '${event}'`, error);
          }
        });
      }
    }
  }

  /**
   * Handler für Online-Events
   */
  private handleOnlineEvent = (): void => {
    this.offlineMode = false;
    this.logger.info("Online-Modus aktiviert für DocumentService");
  };

  /**
   * Handler für Offline-Events
   */
  private handleOfflineEvent = (): void => {
    this.offlineMode = true;
    this.logger.info("Offline-Modus aktiviert für DocumentService");
  };

  /**
   * Bereinigt Ressourcen
   */
  public destroy(): void {
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
export const typedDocumentService = new TypedDocumentService();

export default typedDocumentService;
