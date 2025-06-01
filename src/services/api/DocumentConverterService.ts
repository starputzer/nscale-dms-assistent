/**
 * DocumentConverterService
 *
 * Dieser Service verwaltet die API-Kommunikation für die Dokumentenkonvertierung
 * im nscale DMS Assistenten. Er bietet Methoden zum Hochladen, Konvertieren,
 * Herunterladen und Verwalten von Dokumenten.
 *
 * @module DocumentConverterService
 */

import apiService, { ApiRequestOptions } from "./ApiService";
import apiConfig from "./config";
import {
  ConversionResult,
  ConversionSettings,
  DocumentMetadata,
  ConversionProgress,
  SupportedFormat,
} from "@/types/documentConverter";
import axios, { CancelTokenSource } from "axios";
import { LogService } from "../log/LogService";

/**
 * API-Response-Format für Dokumente
 */
interface DocumentResponse {
  id: string;
  originalName: string;
  originalFormat: string;
  size: number;
  content?: string;
  uploadedAt: string;
  convertedAt?: string;
  status: "pending" | "processing" | "completed" | "failed";
  error?: string;
  metadata?: DocumentMetadata;
}

/**
 * API-Response-Format für Konvertierungsstatus
 */
interface ConversionStatusResponse {
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  step: string;
  estimatedTimeRemaining?: number;
  error?: string;
}

/**
 * Schnittstelle für Dokumentenkonvertierungs-Service
 */
export interface IDocumentConverterService {
  /**
   * Lädt eine Datei zum Server hoch
   * @param file Die hochzuladende Datei
   * @param onProgress Callback-Funktion für Fortschrittsanzeige
   * @returns ID des hochgeladenen Dokuments
   */
  uploadDocument(
    file: File,
    onProgress?: (progress: number) => void,
  ): Promise<string>;

  /**
   * Konvertiert ein hochgeladenes Dokument
   * @param documentId ID des zu konvertierenden Dokuments
   * @param settings Konvertierungseinstellungen
   * @param onProgress Callback-Funktion für Fortschrittsanzeige
   * @returns Das konvertierte Dokument
   */
  convertDocument(
    documentId: string,
    settings?: Partial<ConversionSettings>,
    onProgress?: (
      progress: number,
      step: string,
      timeRemaining: number,
    ) => void,
  ): Promise<ConversionResult>;

  /**
   * Ruft alle verfügbaren Dokumente ab
   * @returns Liste aller Dokumente
   */
  getDocuments(): Promise<ConversionResult[]>;

  /**
   * Ruft ein spezifisches Dokument ab
   * @param documentId ID des abzurufenden Dokuments
   * @returns Das angeforderte Dokument
   */
  getDocument(documentId: string): Promise<ConversionResult>;

  /**
   * Löscht ein Dokument
   * @param documentId ID des zu löschenden Dokuments
   */
  deleteDocument(documentId: string): Promise<void>;

  /**
   * Lädt ein konvertiertes Dokument herunter
   * @param documentId ID des herunterzuladenden Dokuments
   * @param filename Optionaler Dateiname für den Download
   * @param onProgress Callback-Funktion für Fortschrittsanzeige
   * @returns Blob des heruntergeladenen Dokuments
   */
  downloadDocument(
    documentId: string,
    filename?: string,
    onProgress?: (progress: number) => void,
  ): Promise<Blob>;

  /**
   * Prüft den Status einer laufenden Konvertierung
   * @param documentId ID des zu prüfenden Dokuments
   * @returns Aktueller Konvertierungsstatus
   */
  getConversionStatus(documentId: string): Promise<ConversionProgress>;

  /**
   * Bricht eine laufende Konvertierung ab
   * @param documentId ID des Dokuments, dessen Konvertierung abgebrochen werden soll
   */
  cancelConversion(documentId: string): Promise<void>;
}

/**
 * Implementierung des Dokumentenkonvertierungs-Services
 */
class DocumentConverterService implements IDocumentConverterService {
  /** Logger-Instanz */
  private logService: LogService;

  /** Map für laufende Upload-Abbruch-Token */
  private uploadCancelTokens: Map<string, CancelTokenSource> = new Map();

  /** Map für laufende Konvertierungsabonnements */
  private conversionPollingIntervals: Map<string, number> = new Map();

  /** Endpunkt-Präfix für alle dokumentbezogenen Anfragen */
  private readonly DOCUMENTS_ENDPOINT = "/documents";

  /**
   * Konstruktor
   */
  constructor() {
    this.logService = new LogService("DocumentConverterService");
  }

  /**
   * Erstellt eine dokumentspezifische URL
   */
  private getDocumentUrl(documentId: string, action: string = ""): string {
    const base = `${this.DOCUMENTS_ENDPOINT}/${documentId}`;
    return action ? `${base}/${action}` : base;
  }

  /**
   * Konvertiert API-Response in ConversionResult
   */
  private mapDocumentResponse(doc: DocumentResponse): ConversionResult {
    return {
      id: doc.id,
      originalName: doc.originalName,
      originalFormat: doc.originalFormat,
      size: doc.size,
      content: doc.content,
      uploadedAt: doc.uploadedAt ? new Date(doc.uploadedAt) : undefined,
      convertedAt: doc.convertedAt ? new Date(doc.convertedAt) : undefined,
      status: doc.status,
      error: doc.error,
      metadata: doc.metadata,
    };
  }

  /**
   * Lädt eine Datei zum Server hoch
   * @param file Die hochzuladende Datei
   * @param onProgress Callback-Funktion für Fortschrittsanzeige
   * @returns ID des hochgeladenen Dokuments
   */
  public async uploadDocument(
    file: File,
    onProgress?: (progress: number) => void,
  ): Promise<string> {
    this.logService.info(
      `Starte Upload für Datei: ${file.name} (${file.size} Bytes)`,
    );

    // Abbruch-Token für diese Anfrage erstellen
    const cancelToken = axios.CancelToken.source();
    const tempId = `upload-${Date.now()}`;
    this.uploadCancelTokens.set(tempId, cancelToken);

    try {
      // Fortschritts-Callback erstellen
      const progressCallback = (progressEvent: any) => {
        if (progressEvent.total) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
          );

          // Callback aufrufen, wenn vorhanden
          if (onProgress) {
            onProgress(percentCompleted);
          }

          this.logService.debug(`Upload-Fortschritt: ${percentCompleted}%`);
        }
      };

      // Metadaten für den Upload vorbereiten
      const metadata = {
        originalName: file.name,
        size: file.size,
        type: file.type,
      };

      // Datei hochladen
      const response = await apiService.uploadFile<{ documentId: string }>(
        `${this.DOCUMENTS_ENDPOINT}/upload`,
        file,
        {
          fieldName: "document",
          metadata,
          timeout: apiConfig.TIMEOUTS.UPLOAD,
          cancelToken: cancelToken.token,
          onUploadProgress: progressCallback,
          priority: apiConfig.QUEUE.PRIORITIES.USER_ACTION,
        },
      );

      if (!response.success || !response.data) {
        throw new Error(response.message || "Upload fehlgeschlagen");
      }

      this.logService.info(
        `Upload erfolgreich, Dokument-ID: ${response.data.documentId}`,
      );
      return response.data.documentId;
    } catch (error) {
      if (axios.isCancel(error)) {
        this.logService.warn("Upload wurde abgebrochen");
        throw new Error("Upload wurde vom Benutzer abgebrochen");
      }

      this.logService.error("Upload fehlgeschlagen", error);
      throw error;
    } finally {
      // Aufräumen
      this.uploadCancelTokens.delete(tempId);
    }
  }

  /**
   * Bricht einen laufenden Upload ab
   * @param uploadId Temporäre Upload-ID
   */
  public cancelUpload(uploadId: string): void {
    const cancelToken = this.uploadCancelTokens.get(uploadId);
    if (cancelToken) {
      cancelToken.cancel("Upload vom Benutzer abgebrochen");
      this.uploadCancelTokens.delete(uploadId);
      this.logService.info(`Upload ${uploadId} abgebrochen`);
    }
  }

  /**
   * Konvertiert ein hochgeladenes Dokument mit Polling für Fortschritt
   * @param documentId ID des zu konvertierenden Dokuments
   * @param settings Konvertierungseinstellungen
   * @param onProgress Callback-Funktion für Fortschrittsanzeige
   * @returns Das konvertierte Dokument
   */
  public async convertDocument(
    documentId: string,
    settings?: Partial<ConversionSettings>,
    onProgress?: (
      progress: number,
      step: string,
      timeRemaining: number,
    ) => void,
  ): Promise<ConversionResult> {
    this.logService.info(`Starte Konvertierung für Dokument: ${documentId}`);

    try {
      // Konvertierung starten
      const response = await apiService.post<DocumentResponse>(
        `${this.getDocumentUrl(documentId, "convert")}`,
        settings,
        {
          timeout: apiConfig.TIMEOUTS.DEFAULT * 2, // Längeres Timeout für Konvertierung
          priority: apiConfig.QUEUE.PRIORITIES.USER_ACTION,
        },
      );

      if (!response.success || !response.data) {
        throw new Error(response.message || "Konvertierung fehlgeschlagen");
      }

      // Falls ein Fortschritts-Callback angegeben wurde, Polling für Fortschrittsanzeige starten
      if (onProgress) {
        this.pollConversionProgress(documentId, onProgress);
      }

      // Warten, bis Konvertierung abgeschlossen ist
      const result = await this.waitForConversionToComplete(documentId);

      this.logService.info(
        `Konvertierung erfolgreich abgeschlossen für Dokument: ${documentId}`,
      );
      return result;
    } catch (error) {
      this.logService.error(
        `Konvertierung fehlgeschlagen für Dokument: ${documentId}`,
        error,
      );
      this.stopPollingConversionProgress(documentId);
      throw error;
    }
  }

  /**
   * Wartet, bis die Konvertierung abgeschlossen ist
   * @param documentId ID des zu konvertierenden Dokuments
   * @param maxAttempts Maximale Anzahl von Versuchen
   * @param delayMs Verzögerung zwischen den Versuchen in ms
   * @returns Das konvertierte Dokument
   */
  private async waitForConversionToComplete(
    documentId: string,
    maxAttempts: number = 60,
    delayMs: number = 2000,
  ): Promise<ConversionResult> {
    let attempts = 0;

    while (attempts < maxAttempts) {
      attempts++;

      // Status abfragen
      const document = await this.getDocument(documentId);

      // Prüfen, ob die Konvertierung abgeschlossen ist
      if (document.status === "completed") {
        this.stopPollingConversionProgress(documentId);
        return document;
      }

      // Bei Fehler abbrechen
      if (document.status === "failed") {
        this.stopPollingConversionProgress(documentId);
        throw new Error(document.error || "Konvertierung fehlgeschlagen");
      }

      // Warten vor dem nächsten Versuch
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    // Timeout nach maximaler Anzahl von Versuchen
    this.stopPollingConversionProgress(documentId);
    throw new Error(`Timeout bei der Konvertierung von Dokument ${documentId}`);
  }

  /**
   * Startet Polling für Konvertierungsfortschritt
   * @param documentId ID des zu konvertierenden Dokuments
   * @param onProgress Callback-Funktion für Fortschrittsanzeige
   */
  private pollConversionProgress(
    documentId: string,
    onProgress: (progress: number, step: string, timeRemaining: number) => void,
  ): void {
    // Falls bereits ein Polling für dieses Dokument läuft, dieses zuerst stoppen
    this.stopPollingConversionProgress(documentId);

    // Polling-Intervall starten (alle 1000ms)
    const intervalId = window.setInterval(async () => {
      try {
        const progress = await this.getConversionStatus(documentId);

        // Fortschritt an Callback übergeben
        onProgress(
          progress.progress,
          progress.step,
          progress.estimatedTimeRemaining || 0,
        );

        // Polling stoppen, wenn Konvertierung abgeschlossen oder fehlgeschlagen
        if (
          progress.progress >= 100 ||
          progress.step.includes("fehlgeschlagen") ||
          progress.step.includes("abgeschlossen")
        ) {
          this.stopPollingConversionProgress(documentId);
        }
      } catch (error) {
        this.logService.error(
          `Fehler beim Abrufen des Konvertierungsfortschritts für Dokument ${documentId}`,
          error,
        );
      }
    }, 1000);

    // Intervall-ID speichern
    this.conversionPollingIntervals.set(documentId, intervalId);
    this.logService.debug(
      `Polling für Konvertierungsfortschritt gestartet für Dokument ${documentId}`,
    );
  }

  /**
   * Stoppt Polling für Konvertierungsfortschritt
   * @param documentId ID des Dokuments
   */
  private stopPollingConversionProgress(documentId: string): void {
    const intervalId = this.conversionPollingIntervals.get(documentId);
    if (intervalId) {
      clearInterval(intervalId);
      this.conversionPollingIntervals.delete(documentId);
      this.logService.debug(
        `Polling für Konvertierungsfortschritt gestoppt für Dokument ${documentId}`,
      );
    }
  }

  /**
   * Ruft alle verfügbaren Dokumente ab
   * @returns Liste aller Dokumente
   */
  public async getDocuments(): Promise<ConversionResult[]> {
    this.logService.info("Rufe Dokumentenliste ab");

    try {
      const response = await apiService.get<DocumentResponse[]>(
        this.DOCUMENTS_ENDPOINT,
        null,
        {
          priority: apiConfig.QUEUE.PRIORITIES.FETCH,
        },
      );

      if (!response.success || !response.data) {
        throw new Error(
          response.message || "Fehler beim Abrufen der Dokumente",
        );
      }

      // API-Antwort in ConversionResult-Objekte umwandeln
      return response.data.map((doc: any) => this.mapDocumentResponse(doc));
    } catch (error) {
      this.logService.error("Fehler beim Abrufen der Dokumentenliste", error);
      throw error;
    }
  }

  /**
   * Ruft ein spezifisches Dokument ab
   * @param documentId ID des abzurufenden Dokuments
   * @returns Das angeforderte Dokument
   */
  public async getDocument(documentId: string): Promise<ConversionResult> {
    this.logService.debug(`Rufe Dokument ab: ${documentId}`);

    try {
      const response = await apiService.get<DocumentResponse>(
        this.getDocumentUrl(documentId),
        null,
        {
          priority: apiConfig.QUEUE.PRIORITIES.FETCH,
        },
      );

      if (!response.success || !response.data) {
        throw new Error(
          response.message || `Dokument ${documentId} nicht gefunden`,
        );
      }

      return this.mapDocumentResponse(response.data);
    } catch (error) {
      this.logService.error(
        `Fehler beim Abrufen des Dokuments ${documentId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Löscht ein Dokument
   * @param documentId ID des zu löschenden Dokuments
   */
  public async deleteDocument(documentId: string): Promise<void> {
    this.logService.info(`Lösche Dokument: ${documentId}`);

    try {
      const response = await apiService.delete(
        this.getDocumentUrl(documentId),
        {
          priority: apiConfig.QUEUE.PRIORITIES.USER_ACTION,
        },
      );

      if (!response.success) {
        throw new Error(
          response.message || `Fehler beim Löschen des Dokuments ${documentId}`,
        );
      }

      // Laufende Polling-Prozesse beenden
      this.stopPollingConversionProgress(documentId);
    } catch (error) {
      this.logService.error(
        `Fehler beim Löschen des Dokuments ${documentId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Lädt ein konvertiertes Dokument herunter
   * @param documentId ID des herunterzuladenden Dokuments
   * @param filename Optionaler Dateiname für den Download
   * @param onProgress Callback-Funktion für Fortschrittsanzeige
   * @returns Blob des heruntergeladenen Dokuments
   */
  public async downloadDocument(
    documentId: string,
    filename?: string,
    onProgress?: (progress: number) => void,
  ): Promise<Blob> {
    this.logService.info(`Starte Download für Dokument: ${documentId}`);

    try {
      // Fortschritts-Callback erstellen
      const progressCallback = onProgress
        ? (progressEvent: any) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total,
              );
              onProgress(percentCompleted);
            }
          }
        : undefined;

      // Dokument herunterladen
      const downloadOptions: ApiRequestOptions & { filename?: string } = {
        responseType: "blob",
        timeout: apiConfig.TIMEOUTS.UPLOAD, // Längeres Timeout für große Dateien
        onDownloadProgress: progressCallback,
        priority: apiConfig.QUEUE.PRIORITIES.USER_ACTION,
      };

      // Dateinamen für Download setzen, falls angegeben
      if (filename) {
        downloadOptions.filename = filename;
      } else {
        // Falls kein Dateiname angegeben, Dokumentdetails abrufen und Originalnamen verwenden
        const doc = await this.getDocument(documentId);
        downloadOptions.filename = doc.originalName;
      }

      // Download durchführen
      return await apiService.downloadFile(
        this.getDocumentUrl(documentId, "download"),
        downloadOptions,
      );
    } catch (error) {
      this.logService.error(
        `Fehler beim Herunterladen des Dokuments ${documentId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Ruft den Inhalt eines konvertierten Dokuments ab
   * @param documentId ID des Dokuments
   * @returns Inhalt des Dokuments
   */
  public async getDocumentContent(documentId: string): Promise<string> {
    this.logService.debug(`Rufe Dokumentinhalt ab: ${documentId}`);

    try {
      const response = await apiService.get<{ content: string }>(
        this.getDocumentUrl(documentId, "content"),
        null,
        {
          priority: apiConfig.QUEUE.PRIORITIES.FETCH,
        },
      );

      if (!response.success || !response.data) {
        throw new Error(
          response.message ||
            `Inhalt für Dokument ${documentId} nicht verfügbar`,
        );
      }

      return response.data.content;
    } catch (error) {
      this.logService.error(
        `Fehler beim Abrufen des Inhalts für Dokument ${documentId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Prüft den Status einer laufenden Konvertierung
   * @param documentId ID des zu prüfenden Dokuments
   * @returns Aktueller Konvertierungsstatus
   */
  public async getConversionStatus(
    documentId: string,
  ): Promise<ConversionProgress> {
    try {
      const response = await apiService.get<ConversionStatusResponse>(
        this.getDocumentUrl(documentId, "status"),
        null,
        {
          priority: apiConfig.QUEUE.PRIORITIES.BACKGROUND,
        },
      );

      if (!response.success || !response.data) {
        throw new Error(
          response.message ||
            `Status für Dokument ${documentId} nicht verfügbar`,
        );
      }

      return {
        documentId,
        progress: response.data.progress,
        step: response.data.step,
        estimatedTimeRemaining: response.data.estimatedTimeRemaining,
      };
    } catch (error) {
      this.logService.error(
        `Fehler beim Abrufen des Konvertierungsstatus für Dokument ${documentId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Bricht eine laufende Konvertierung ab
   * @param documentId ID des Dokuments, dessen Konvertierung abgebrochen werden soll
   */
  public async cancelConversion(documentId: string): Promise<void> {
    this.logService.info(`Breche Konvertierung ab für Dokument: ${documentId}`);

    try {
      const response = await apiService.post(
        this.getDocumentUrl(documentId, "cancel"),
        null,
        {
          priority: apiConfig.QUEUE.PRIORITIES.USER_ACTION,
        },
      );

      if (!response.success) {
        throw new Error(
          response.message ||
            `Fehler beim Abbrechen der Konvertierung für Dokument ${documentId}`,
        );
      }

      // Polling stoppen
      this.stopPollingConversionProgress(documentId);
    } catch (error) {
      this.logService.error(
        `Fehler beim Abbrechen der Konvertierung für Dokument ${documentId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Unterstützte Dateiformate
   */
  private supportedFormats: SupportedFormat[] = [
    "pdf",
    "docx",
    "xlsx",
    "pptx",
    "html",
    "txt",
  ];

  /**
   * Prüft, ob ein Dateiformat unterstützt wird
   * @param format Das zu prüfende Dateiformat
   * @returns true, wenn das Format unterstützt wird
   */
  public isFormatSupported(format: string): format is SupportedFormat {
    return this.supportedFormats.includes(format as SupportedFormat);
  }
}

/**
 * Dummy-Implementierung für Entwicklung und Tests
 * Diese Implementierung simuliert die API-Aufrufe ohne tatsächlichen Backend-Server
 */
class MockDocumentConverterService implements IDocumentConverterService {
  /** Logger-Instanz */
  private logService: LogService;

  /** Simulierte Dokumente */
  private mockDocuments: ConversionResult[] = [];

  /** Map für simulierte Konvertierungsprozesse */
  private mockConversionProcesses: Map<
    string,
    {
      progress: number;
      step: string;
      timeRemaining: number;
      intervalId: number;
      onProgress?: (
        progress: number,
        step: string,
        timeRemaining: number,
      ) => void;
    }
  > = new Map();

  /** Simulierte Konvertierungsschritte */
  private readonly CONVERSION_STEPS = [
    "Datei wird analysiert...",
    "Extraktion der Metadaten...",
    "Textextraktion läuft...",
    "Tabellen werden erkannt...",
    "Formatierung wird angewendet...",
    "Dokument wird optimiert...",
    "Konvertierung wird abgeschlossen...",
  ];

  /**
   * Konstruktor
   */
  constructor() {
    this.logService = new LogService("MockDocumentConverterService");
    this.initMockData();
  }

  /**
   * Initialisiert Mock-Daten
   */
  private initMockData(): void {
    // Einige Beispieldokumente erstellen
    this.mockDocuments = [
      {
        id: "mock-doc-1",
        originalName: "Beispiel-Dokument.pdf",
        originalFormat: "pdf",
        size: 1024 * 1024 * 2.7, // 2.7 MB
        uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).getTime(), // 3 Tage alt
        convertedAt: new Date(
          Date.now() - 1000 * 60 * 60 * 24 * 3 + 1000 * 60 * 2,
        ).getTime(), // 2 Minuten nach Upload
        status: "completed",
        content: "Dies ist der Inhalt des Beispiel-Dokuments...",
        metadata: {
          title: "Beispiel-Dokument",
          author: "Max Mustermann",
          created: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30), // 30 Tage alt
          modified: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 Tage alt
          pageCount: 15,
        },
      },
      {
        id: "mock-doc-2",
        originalName: "Tabellendaten.xlsx",
        originalFormat: "xlsx",
        size: 1024 * 512, // 512 KB
        uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).getTime(), // 1 Tag alt
        convertedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 + 1000 * 60 * 1).getTime(), // 1 Minute nach Upload
        status: "completed",
        content: "Extrahierte Tabellendaten...",
        metadata: {
          title: "Tabellendaten",
          author: "Anna Schmidt",
          created: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5), // 5 Tage alt
          modified: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 Tag alt
          pageCount: 3,
          tables: [
            {
              pageNumber: 1,
              rowCount: 10,
              columnCount: 5,
              headers: ["ID", "Name", "Datum", "Betrag", "Status"],
            },
          ],
        },
      },
      {
        id: "mock-doc-3",
        originalName: "Fehlerhaftes-Dokument.docx",
        originalFormat: "docx",
        size: 1024 * 1024 * 1.2, // 1.2 MB
        uploadedAt: new Date(Date.now() - 1000 * 60 * 30).getTime(), // 30 Minuten alt
        status: "failed",
        error:
          "Das Dokument ist passwortgeschützt und konnte nicht konvertiert werden.",
      },
      {
        id: "mock-doc-4",
        originalName: "Wird-gerade-verarbeitet.pptx",
        originalFormat: "pptx",
        size: 1024 * 1024 * 5.4, // 5.4 MB
        uploadedAt: new Date(Date.now() - 1000 * 60 * 5).getTime(), // 5 Minuten alt
        status: "processing",
      },
    ];
  }

  /**
   * Generiert eine zufällige ID
   */
  private generateId(): string {
    return `mock-doc-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }

  /**
   * Simuliert einen Verzögerung
   */
  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Lädt eine Datei zum Server hoch (Mock)
   */
  public async uploadDocument(
    file: File,
    onProgress?: (progress: number) => void,
  ): Promise<string> {
    this.logService.info(
      `[MOCK] Starte Upload für Datei: ${file.name} (${file.size} Bytes)`,
    );

    // Upload-Fortschritt simulieren
    let progress = 0;
    const simulateProgress = () => {
      const interval = setInterval(() => {
        progress += Math.random() * 10;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
        }

        if (onProgress) {
          onProgress(Math.floor(progress));
        }
      }, 200);

      return interval;
    };

    const progressInterval = simulateProgress();

    // Verzögerung simulieren basierend auf Dateigröße
    const delayMs = Math.min(2000, file.size / 1024 / 100);
    await this.delay(delayMs);

    clearInterval(progressInterval);

    // Neues Dokument erstellen
    const documentId = this.generateId();
    const fileExtension =
      file.name.split(".").pop()?.toLowerCase() || "unknown";

    this.mockDocuments.push({
      id: documentId,
      originalName: file.name,
      originalFormat: fileExtension,
      size: file.size,
      uploadedAt: new Date().getTime(),
      status: "pending",
    });

    this.logService.info(
      `[MOCK] Upload erfolgreich, Dokument-ID: ${documentId}`,
    );

    // Für die letzten 5% der Fortschrittsanzeige
    if (onProgress) {
      onProgress(100);
    }

    return documentId;
  }

  /**
   * Konvertiert ein hochgeladenes Dokument (Mock)
   */
  public async convertDocument(
    documentId: string,
    settings?: Partial<ConversionSettings>,
    onProgress?: (
      progress: number,
      step: string,
      timeRemaining: number,
    ) => void,
  ): Promise<ConversionResult> {
    this.logService.info(
      `[MOCK] Starte Konvertierung für Dokument: ${documentId}`,
    );

    // Dokument finden
    const docIndex = this.mockDocuments.findIndex(
      (doc) => doc.id === documentId,
    );
    if (docIndex === -1) {
      throw new Error(`Dokument ${documentId} nicht gefunden`);
    }

    // Dokument-Status aktualisieren
    this.mockDocuments[docIndex].status = "processing";

    // Konvertierungsprozess starten
    if (onProgress) {
      this.startMockConversionProcess(documentId, onProgress);
    }

    // Simulierte Konvertierungsdauer
    let conversionTime = 3000 + Math.random() * 5000;

    // Größere Dateien dauern länger
    if (this.mockDocuments[docIndex].size > 1024 * 1024) {
      conversionTime +=
        (this.mockDocuments[docIndex].size / 1024 / 1024) * 1000;
    }

    // Konvertierungseinstellungen berücksichtigen
    if (settings?.extractTables) {
      conversionTime += 2000;
    }

    if (settings?.extractMetadata) {
      conversionTime += 1000;
    }

    if (settings?.ocrEnabled) {
      conversionTime += 5000;
    }

    // Verzögerung simulieren
    await this.delay(conversionTime);

    // Konvertierungsprozess stoppen
    this.stopMockConversionProcess(documentId);

    // 5% Wahrscheinlichkeit für Fehler
    if (Math.random() < 0.05) {
      this.mockDocuments[docIndex].status = "failed";
      this.mockDocuments[docIndex].error =
        "Bei der Konvertierung ist ein Fehler aufgetreten.";
      throw new Error("Bei der Konvertierung ist ein Fehler aufgetreten.");
    }

    // Erfolgreiche Konvertierung
    this.mockDocuments[docIndex].status = "completed";
    this.mockDocuments[docIndex].convertedAt = new Date().getTime();
    this.mockDocuments[docIndex].content =
      `Dies ist der konvertierte Inhalt des Dokuments ${this.mockDocuments[docIndex].originalName}...`;

    // Metadaten hinzufügen
    this.mockDocuments[docIndex].metadata = {
      title: this.mockDocuments[docIndex].originalName.split(".")[0],
      author: "Automatisch extrahiert",
      created: new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 30),
      modified: new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24),
      pageCount: Math.floor(Math.random() * 20) + 1,
    };

    if (settings?.extractTables && Math.random() > 0.5) {
      this.mockDocuments[docIndex].metadata.tables = [
        {
          pageNumber: 1,
          rowCount: Math.floor(Math.random() * 20) + 5,
          columnCount: Math.floor(Math.random() * 5) + 2,
          headers: [
            "Spalte 1",
            "Spalte 2",
            "Spalte 3",
            "Spalte 4",
            "Spalte 5",
          ].slice(
            0,
            this.mockDocuments[docIndex].metadata?.tables?.[0]?.columnCount ||
              3,
          ),
        },
      ];
    }

    this.logService.info(
      `[MOCK] Konvertierung erfolgreich abgeschlossen für Dokument: ${documentId}`,
    );
    return this.mockDocuments[docIndex];
  }

  /**
   * Startet einen simulierten Konvertierungsprozess
   */
  private startMockConversionProcess(
    documentId: string,
    onProgress: (progress: number, step: string, timeRemaining: number) => void,
  ): void {
    let progress = 0;
    let stepIndex = 0;
    let timeRemaining = 120; // Sekunden

    const intervalId = window.setInterval(() => {
      // Zufälligen Fortschritt hinzufügen
      progress += Math.random() * 3;

      // Konvertierungsschritt aktualisieren
      if (progress > (stepIndex + 1) * (100 / this.CONVERSION_STEPS.length)) {
        stepIndex = Math.min(stepIndex + 1, this.CONVERSION_STEPS.length - 1);
      }

      // Verbleibende Zeit aktualisieren
      timeRemaining = Math.max(0, Math.floor(120 * (1 - progress / 100)));

      // Fortschritt begrenzen
      if (progress >= 100) {
        progress = 100;
        clearInterval(intervalId);
      }

      // Callback aufrufen
      onProgress(
        Math.floor(progress),
        this.CONVERSION_STEPS[stepIndex],
        timeRemaining,
      );
    }, 500);

    // Fortschrittsdaten speichern
    this.mockConversionProcesses.set(documentId, {
      progress: 0,
      step: this.CONVERSION_STEPS[0],
      timeRemaining: 120,
      intervalId,
      onProgress,
    });
  }

  /**
   * Stoppt einen simulierten Konvertierungsprozess
   */
  private stopMockConversionProcess(documentId: string): void {
    const process = this.mockConversionProcesses.get(documentId);
    if (process) {
      clearInterval(process.intervalId);

      // Finalen Fortschritt melden
      if (process.onProgress) {
        process.onProgress(100, "Konvertierung abgeschlossen", 0);
      }

      this.mockConversionProcesses.delete(documentId);
    }
  }

  /**
   * Ruft alle verfügbaren Dokumente ab (Mock)
   */
  public async getDocuments(): Promise<ConversionResult[]> {
    this.logService.info("[MOCK] Rufe Dokumentenliste ab");

    // Kurze Verzögerung simulieren
    await this.delay(200 + Math.random() * 300);

    return [...this.mockDocuments];
  }

  /**
   * Ruft ein spezifisches Dokument ab (Mock)
   */
  public async getDocument(documentId: string): Promise<ConversionResult> {
    this.logService.debug(`[MOCK] Rufe Dokument ab: ${documentId}`);

    // Kurze Verzögerung simulieren
    await this.delay(100 + Math.random() * 200);

    const document = this.mockDocuments.find((doc) => doc.id === documentId);
    if (!document) {
      throw new Error(`Dokument ${documentId} nicht gefunden`);
    }

    return { ...document };
  }

  /**
   * Löscht ein Dokument (Mock)
   */
  public async deleteDocument(documentId: string): Promise<void> {
    this.logService.info(`[MOCK] Lösche Dokument: ${documentId}`);

    // Kurze Verzögerung simulieren
    await this.delay(300 + Math.random() * 500);

    // Dokument finden
    const docIndex = this.mockDocuments.findIndex(
      (doc) => doc.id === documentId,
    );
    if (docIndex === -1) {
      throw new Error(`Dokument ${documentId} nicht gefunden`);
    }

    // Laufende Konvertierung abbrechen
    this.stopMockConversionProcess(documentId);

    // Dokument aus der Liste entfernen
    this.mockDocuments.splice(docIndex, 1);
  }

  /**
   * Lädt ein konvertiertes Dokument herunter (Mock)
   */
  public async downloadDocument(
    documentId: string,
    filename?: string,
    onProgress?: (progress: number) => void,
  ): Promise<Blob> {
    this.logService.info(`[MOCK] Starte Download für Dokument: ${documentId}`);

    // Dokument finden
    const document = this.mockDocuments.find((doc) => doc.id === documentId);
    if (!document) {
      throw new Error(`Dokument ${documentId} nicht gefunden`);
    }

    // Prüfen, ob Dokument erfolgreich konvertiert wurde
    if (document.status !== "completed") {
      throw new Error(
        `Dokument ${documentId} ist nicht verfügbar für Download (Status: ${document.status})`,
      );
    }

    // Download-Fortschritt simulieren
    if (onProgress) {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
        }
        onProgress(Math.floor(progress));
      }, 200);

      // Verzögerung basierend auf Dateigröße
      const delayMs = Math.min(3000, document.size / 1024 / 50);
      await this.delay(delayMs);

      clearInterval(interval);
      onProgress(100);
    } else {
      // Kurze Verzögerung, wenn kein Fortschrittscallback
      await this.delay(500);
    }

    // Mock-Blob erstellen
    const content =
      document.content || `Inhalt des Dokuments ${document.originalName}`;
    const mimeTypes: Record<string, string> = {
      pdf: "application/pdf",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      txt: "text/plain",
      html: "text/html",
    };

    const mimeType =
      mimeTypes[document.originalFormat] || "application/octet-stream";
    return new Blob([content], { type: mimeType });
  }

  /**
   * Prüft den Status einer laufenden Konvertierung (Mock)
   */
  public async getConversionStatus(
    documentId: string,
  ): Promise<ConversionProgress> {
    // Dokument finden
    const document = this.mockDocuments.find((doc) => doc.id === documentId);
    if (!document) {
      throw new Error(`Dokument ${documentId} nicht gefunden`);
    }

    // Status basierend auf laufender Konvertierung oder gespeichertem Status zurückgeben
    const conversionProcess = this.mockConversionProcesses.get(documentId);

    if (conversionProcess) {
      return {
        documentId,
        progress: Math.floor(conversionProcess.progress),
        step: conversionProcess.step,
        estimatedTimeRemaining: conversionProcess.timeRemaining,
      };
    }

    // Status basierend auf gespeichertem Dokumentstatus
    switch (document.status) {
      case "pending":
        return {
          documentId,
          progress: 0,
          step: "Warte auf Konvertierung...",
          estimatedTimeRemaining: 120,
        };
      case "processing":
        return {
          documentId,
          progress: 50, // Zufälliger Fortschritt
          step: this.CONVERSION_STEPS[
            Math.floor(Math.random() * this.CONVERSION_STEPS.length)
          ],
          estimatedTimeRemaining: 60,
        };
      case "completed":
        return {
          documentId,
          progress: 100,
          step: "Konvertierung abgeschlossen",
          estimatedTimeRemaining: 0,
        };
      case "failed":
        return {
          documentId,
          progress: 0,
          step: "Konvertierung fehlgeschlagen",
          estimatedTimeRemaining: 0,
        };
      default:
        return {
          documentId,
          progress: 0,
          step: "Unbekannter Status",
          estimatedTimeRemaining: 0,
        };
    }
  }

  /**
   * Bricht eine laufende Konvertierung ab (Mock)
   */
  public async cancelConversion(documentId: string): Promise<void> {
    this.logService.info(
      `[MOCK] Breche Konvertierung ab für Dokument: ${documentId}`,
    );

    // Kurze Verzögerung simulieren
    await this.delay(200);

    // Konvertierungsprozess stoppen
    this.stopMockConversionProcess(documentId);

    // Dokument-Status aktualisieren
    const docIndex = this.mockDocuments.findIndex(
      (doc) => doc.id === documentId,
    );
    if (docIndex !== -1) {
      this.mockDocuments[docIndex].status = "failed";
      this.mockDocuments[docIndex].error =
        "Konvertierung wurde vom Benutzer abgebrochen";
    }
  }
}

// Hilfsfunction zur sicheren Zugriff auf Umgebungsvariablen im Browser-Kontext
const getEnvVar = (name: string, defaultValue: string): string => {
  // In Vite werden Umgebungsvariablen mit import.meta.env zur Verfügung gestellt
  if (typeof import.meta !== "undefined" && import.meta.env) {
    return (import.meta.env[name] as string) || defaultValue;
  }
  // Fallback für Node.js-Umgebung oder wenn import.meta nicht verfügbar ist
  return typeof window !== "undefined"
    ? defaultValue
    : (process?.env?.[name] as string) || defaultValue;
};

// Hilfsfunction zur Erkennung der aktuellen Umgebung
const getNodeEnv = (): string => {
  if (typeof import.meta !== "undefined" && import.meta.env) {
    return import.meta.env.MODE || "development";
  }
  return typeof window !== "undefined"
    ? "development"
    : process?.env?.NODE_ENV || "development";
};

// Bestimme die richtige Implementierung basierend auf der Umgebung
const isDevelopment = getNodeEnv() === "development";
const isTest = getNodeEnv() === "test";
const useMockService =
  (isDevelopment || isTest) &&
  (getEnvVar("VITE_USE_MOCK_API", "false") === "true" ||
    !getEnvVar("VITE_API_BASE_URL", ""));

// Service-Instanz erstellen
const documentConverterService: IDocumentConverterService = useMockService
  ? new MockDocumentConverterService()
  : new DocumentConverterService();

// Im Debug-Modus einen Hinweis ausgeben
if (useMockService) {
  console.log("Using MOCK DocumentConverterService for development/testing");
}

// Export both types and service instances
export type { IDocumentConverterService };
export {
  DocumentConverterService,
  MockDocumentConverterService,
  documentConverterService,
};
export default documentConverterService;
