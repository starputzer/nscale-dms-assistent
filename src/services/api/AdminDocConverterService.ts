/**
 * AdminDocConverterService
 *
 * Dieser Service verwaltet die API-Kommunikation für die Dokumentenkonverter-Administration
 * und erweitert den bestehenden DocumentConverterService um administrative Funktionen.
 *
 * @module AdminDocConverterService
 */

import apiService from "./ApiService";
import apiConfig from "./config";
import documentConverterService, {
  IDocumentConverterService,
} from "./DocumentConverterService";
import type {
  ConversionResult,
  DocumentStatistics,
  QueueInfo,
  ConverterSettings,
} from "@/types/documentConverter";
import { ApiResponse } from "@/types/api";
import { LogService } from "../log/LogService";
import { shouldUseRealApi } from "@/config/api-flags";

/**
 * Erweiterte Schnittstelle für die Admin-Dokumentenkonverter-Funktionen
 */
export interface IAdminDocConverterService extends IDocumentConverterService {
  /**
   * Ruft Statistiken zum Dokumentenkonverter ab
   * @returns Statistiken zum Dokumentenkonverter
   */
  getDocumentStatistics(): Promise<ApiResponse<DocumentStatistics>>;

  /**
   * Ruft die letzten Konvertierungen ab
   * @param limit Anzahl der zurückzugebenden Konvertierungen (default: 20)
   * @returns Liste der letzten Konvertierungen
   */
  getRecentConversions(
    limit?: number,
  ): Promise<ApiResponse<ConversionResult[]>>;

  /**
   * Ruft Informationen zur Konvertierungswarteschlange ab
   * @returns Warteschlangeninformationen
   */
  getConversionQueue(): Promise<ApiResponse<QueueInfo>>;

  /**
   * Ruft die Konvertereinstellungen ab
   * @returns Konvertereinstellungen
   */
  getConverterSettings(): Promise<ApiResponse<ConverterSettings>>;

  /**
   * Aktualisiert die Konvertereinstellungen
   * @param settings Die neuen Einstellungen
   * @returns Erfolgsstatus
   */
  updateConverterSettings(
    settings: ConverterSettings,
  ): Promise<ApiResponse<void>>;

  /**
   * Priorisiert einen Job in der Warteschlange
   * @param jobId ID des zu priorisierenden Jobs
   * @returns Erfolgsstatus
   */
  prioritizeJob(jobId: string): Promise<ApiResponse<void>>;

  /**
   * Bricht einen Job in der Warteschlange ab
   * @param jobId ID des abzubrechenden Jobs
   * @returns Erfolgsstatus
   */
  cancelJob(jobId: string): Promise<ApiResponse<void>>;

  /**
   * Pausiert die Konvertierungswarteschlange
   * @returns Erfolgsstatus
   */
  pauseQueue(): Promise<ApiResponse<void>>;

  /**
   * Setzt die Konvertierungswarteschlange fort
   * @returns Erfolgsstatus
   */
  resumeQueue(): Promise<ApiResponse<void>>;

  /**
   * Leert die Konvertierungswarteschlange
   * @returns Erfolgsstatus
   */
  clearQueue(): Promise<ApiResponse<void>>;
}

/**
 * Implementierung des Admin-Dokumentenkonverter-Services
 */
class AdminDocConverterService implements IAdminDocConverterService {
  /** Logger-Instanz */
  private logService: LogService;

  /** Basis-Dokumentenkonverter-Service */
  private documentConverterService: IDocumentConverterService;

  /** Admin-Endpunkt-Präfix für alle administrativen Anfragen */
  private readonly ADMIN_ENDPOINT = "/admin/doc-converter";

  /**
   * Konstruktor
   * @param documentConverterService Basis-Dokumentenkonverter-Service
   */
  constructor(documentConverterService: IDocumentConverterService) {
    this.logService = new LogService("AdminDocConverterService");
    this.documentConverterService = documentConverterService;
  }

  // Implementierung der Basis-Dokumentenkonverter-Methoden durch Weiterleitung
  // an den bestehenden Service

  public async uploadDocument(
    file: File,
    onProgress?: (progress: number) => void,
  ): Promise<string> {
    return this.documentConverterService.uploadDocument(file, onProgress);
  }

  public async convertDocument(
    documentId: string,
    settings?: any,
    onProgress?: (
      progress: number,
      step: string,
      timeRemaining: number,
    ) => void,
  ): Promise<ConversionResult> {
    return this.documentConverterService.convertDocument(
      documentId,
      settings,
      onProgress,
    );
  }

  public async getDocuments(): Promise<ConversionResult[]> {
    return this.documentConverterService.getDocuments();
  }

  public async getDocument(documentId: string): Promise<ConversionResult> {
    return this.documentConverterService.getDocument(documentId);
  }

  public async deleteDocument(documentId: string): Promise<void> {
    return this.documentConverterService.deleteDocument(documentId);
  }

  public async downloadDocument(
    documentId: string,
    filename?: string,
    onProgress?: (progress: number) => void,
  ): Promise<Blob> {
    return this.documentConverterService.downloadDocument(
      documentId,
      filename,
      onProgress,
    );
  }

  public async getConversionStatus(documentId: string): Promise<any> {
    return this.documentConverterService.getConversionStatus(documentId);
  }

  public async cancelConversion(documentId: string): Promise<void> {
    return this.documentConverterService.cancelConversion(documentId);
  }

  // Implementierung der Admin-spezifischen Methoden

  /**
   * Ruft Statistiken zum Dokumentenkonverter ab
   * @returns Statistiken zum Dokumentenkonverter
   */
  public async getDocumentStatistics(): Promise<
    ApiResponse<DocumentStatistics>
  > {
    try {
      this.logService.info("Rufe Dokumentenkonverter-Statistiken ab");

      // Prüfen, ob die echte API verwendet werden soll
      if (shouldUseRealApi("useRealDocumentConverterApi")) {
        this.logService.info(
          "Verwende echte API für Dokumentenkonverter-Statistiken",
        );

        const response = await apiService.get<DocumentStatistics>(
          `${this.ADMIN_ENDPOINT}/statistics`,
          null,
          {
            priority: apiConfig.QUEUE.PRIORITIES.ADMIN,
          },
        );

        return response;
      }

      // Verwende Mock-Daten, wenn keine echte API verfügbar ist
      this.logService.info(
        "Verwende Mock-Daten für Dokumentenkonverter-Statistiken",
      );

      // Erstelle Mock-Statistiken basierend auf den vorhandenen Dokumenten
      const documents = await this.getDocuments();
      const completed = documents.filter(
        (doc) => doc.status === "success",
      ).length;
      const failed = documents.filter(
        (doc: any) => doc.status === "error",
      ).length;
      const processing = documents.filter(
        (doc) => doc.status === "processing",
      ).length;

      // Erstelle Statistiken nach Format
      const formatCounts: Record<string, number> = {};
      documents.forEach((doc: any) => {
        const format = doc.originalFormat || "unknown";
        formatCounts[format] = (formatCounts[format] || 0) + 1;
      });

      // Generiere Trend-Daten für die letzten 7 Tage
      const trendData = Array.from({ length: 7 }, () =>
        Math.floor(Math.random() * 10),
      );

      // Erstelle Mock-Statistiken
      const stats: DocumentStatistics = {
        totalConversions: completed + failed,
        conversionsPastWeek: trendData.reduce(
          (sum: any, value) => sum + value,
          0,
        ),
        successRate:
          completed > 0
            ? Math.round((completed / (completed + failed)) * 100)
            : 100,
        activeConversions: processing,
        conversionsByFormat: formatCounts,
        conversionTrend: trendData,
      };

      return {
        success: true,
        data: stats,
        message: "Dokumentenkonverter-Statistiken erfolgreich abgerufen",
      };
    } catch (err: any) {
      this.logService.error(
        "Fehler beim Abrufen der Dokumentenkonverter-Statistiken",
        err,
      );
      return {
        success: false,
        message:
          err.message ||
          "Fehler beim Abrufen der Dokumentenkonverter-Statistiken",
        error: {
          code: "DOCUMENT_STATISTICS_ERROR",
          message: err.message || "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Ruft die letzten Konvertierungen ab
   * @param limit Anzahl der zurückzugebenden Konvertierungen (default: 20)
   * @returns Liste der letzten Konvertierungen
   */
  public async getRecentConversions(
    limit: number = 20,
  ): Promise<ApiResponse<ConversionResult[]>> {
    try {
      this.logService.info(`Rufe letzte ${limit} Konvertierungen ab`);

      // Prüfen, ob die echte API verwendet werden soll
      if (shouldUseRealApi("useRealDocumentConverterApi")) {
        this.logService.info("Verwende echte API für letzte Konvertierungen");

        const response = await apiService.get<ConversionResult[]>(
          `${this.ADMIN_ENDPOINT}/recent`,
          { limit },
          {
            priority: apiConfig.QUEUE.PRIORITIES.ADMIN,
          },
        );

        return response;
      }

      // Verwende Mock-Daten, wenn keine echte API verfügbar ist
      this.logService.info("Verwende Mock-Daten für letzte Konvertierungen");

      // Sortiere Dokumente nach Erstellungsdatum (neueste zuerst) und limitiere die Anzahl
      const documents = await this.getDocuments();
      const sortedDocuments = [...documents]
        .sort((a, b) => {
          // Behandele undefined-Werte
          // uploadedAt is already a timestamp (number), not a Date object
          const timeA = a.uploadedAt || 0;
          const timeB = b.uploadedAt || 0;
          return timeB - timeA;
        })
        .slice(0, limit);

      return {
        success: true,
        data: sortedDocuments,
        message: "Letzte Konvertierungen erfolgreich abgerufen",
      };
    } catch (err: any) {
      this.logService.error(
        "Fehler beim Abrufen der letzten Konvertierungen",
        err,
      );
      return {
        success: false,
        message:
          err.message || "Fehler beim Abrufen der letzten Konvertierungen",
        error: {
          code: "RECENT_CONVERSIONS_ERROR",
          message: err.message || "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Ruft Informationen zur Konvertierungswarteschlange ab
   * @returns Warteschlangeninformationen
   */
  public async getConversionQueue(): Promise<ApiResponse<QueueInfo>> {
    try {
      this.logService.info("Rufe Konvertierungswarteschlange ab");

      // Prüfen, ob die echte API verwendet werden soll
      if (shouldUseRealApi("useRealDocumentConverterApi")) {
        this.logService.info(
          "Verwende echte API für Konvertierungswarteschlange",
        );

        const response = await apiService.get<QueueInfo>(
          `${this.ADMIN_ENDPOINT}/queue`,
          null,
          {
            priority: apiConfig.QUEUE.PRIORITIES.ADMIN,
          },
        );

        return response;
      }

      // Verwende Mock-Daten, wenn keine echte API verfügbar ist
      this.logService.info(
        "Verwende Mock-Daten für Konvertierungswarteschlange",
      );

      // Erstelle Mock-Warteschlangeninformationen
      const documents = await this.getDocuments();
      const queuedDocuments = documents.filter(
        (doc) => doc.status === "pending" || doc.status === "processing",
      );

      const queueInfo: QueueInfo = {
        activeJobs: queuedDocuments.filter(
          (doc: any) => doc.status === "processing",
        ).length,
        queuedJobs: queuedDocuments.filter(
          (doc: any) => doc.status === "pending",
        ).length,
        isPaused: false,
        averageWaitTime: Math.floor(Math.random() * 60) + 30, // 30-90 Sekunden
        estimatedCompletionTime: new Date(
          Date.now() + 1000 * 60 * (Math.floor(Math.random() * 30) + 15),
        ),
        jobs: queuedDocuments.map((doc: any) => ({
          id: doc.id,
          fileName: doc.originalName,
          submittedAt: doc.uploadedAt || new Date(),
          status: doc.status,
          progress:
            doc.status === "processing" ? Math.floor(Math.random() * 100) : 0,
        })),
      };

      return {
        success: true,
        data: queueInfo,
        message: "Konvertierungswarteschlange erfolgreich abgerufen",
      };
    } catch (err: any) {
      this.logService.error(
        "Fehler beim Abrufen der Konvertierungswarteschlange",
        err,
      );
      return {
        success: false,
        message:
          err.message || "Fehler beim Abrufen der Konvertierungswarteschlange",
        error: {
          code: "QUEUE_INFO_ERROR",
          message: err.message || "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Ruft die Konvertereinstellungen ab
   * @returns Konvertereinstellungen
   */
  public async getConverterSettings(): Promise<ApiResponse<ConverterSettings>> {
    try {
      this.logService.info("Rufe Konvertereinstellungen ab");

      // Prüfen, ob die echte API verwendet werden soll
      if (shouldUseRealApi("useRealDocumentConverterApi")) {
        this.logService.info("Verwende echte API für Konvertereinstellungen");

        const response = await apiService.get<ConverterSettings>(
          `${this.ADMIN_ENDPOINT}/settings`,
          null,
          {
            priority: apiConfig.QUEUE.PRIORITIES.ADMIN,
          },
        );

        return response;
      }

      // Verwende Mock-Daten, wenn keine echte API verfügbar ist
      this.logService.info("Verwende Mock-Daten für Konvertereinstellungen");

      // Erstelle Mock-Einstellungen
      const settings: ConverterSettings = {
        defaultFormatOptions: {
          extractTables: true,
          extractImages: true,
          ocrEnabled: true,
          extractMetadata: true,
          pdfOptions: {
            extractForms: true,
            preserveFormatting: true,
          },
        },
        maxFileSize: 50 * 1024 * 1024, // 50 MB
        supportedFormats: ["pdf", "docx", "xlsx", "pptx", "html", "txt"],
        concurrentJobs: 3,
        retentionPeriod: 30, // Tage
        allowAnonymousUploads: false,
      };

      return {
        success: true,
        data: settings,
        message: "Konvertereinstellungen erfolgreich abgerufen",
      };
    } catch (err: any) {
      this.logService.error(
        "Fehler beim Abrufen der Konvertereinstellungen",
        err,
      );
      return {
        success: false,
        message:
          err.message || "Fehler beim Abrufen der Konvertereinstellungen",
        error: {
          code: "CONVERTER_SETTINGS_ERROR",
          message: err.message || "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Aktualisiert die Konvertereinstellungen
   * @param settings Die neuen Einstellungen
   * @returns Erfolgsstatus
   */
  public async updateConverterSettings(
    settings: ConverterSettings,
  ): Promise<ApiResponse<void>> {
    try {
      this.logService.info("Aktualisiere Konvertereinstellungen");

      // Prüfen, ob die echte API verwendet werden soll
      if (shouldUseRealApi("useRealDocumentConverterApi")) {
        this.logService.info(
          "Verwende echte API für Aktualisierung der Konvertereinstellungen",
        );

        const response = await apiService.put<void>(
          `${this.ADMIN_ENDPOINT}/settings`,
          settings,
          {
            priority: apiConfig.QUEUE.PRIORITIES.ADMIN,
          },
        );

        return response;
      }

      // Wenn keine echte API verfügbar ist, simuliere Erfolg
      this.logService.info(
        "Simuliere Aktualisierung der Konvertereinstellungen",
      );

      return {
        success: true,
        message: "Konvertereinstellungen erfolgreich aktualisiert",
      };
    } catch (err: any) {
      this.logService.error(
        "Fehler beim Aktualisieren der Konvertereinstellungen",
        err,
      );
      return {
        success: false,
        message:
          err.message || "Fehler beim Aktualisieren der Konvertereinstellungen",
        error: {
          code: "CONVERTER_SETTINGS_UPDATE_ERROR",
          message: err.message || "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Priorisiert einen Job in der Warteschlange
   * @param jobId ID des zu priorisierenden Jobs
   * @returns Erfolgsstatus
   */
  public async prioritizeJob(jobId: string): Promise<ApiResponse<void>> {
    try {
      this.logService.info(`Priorisiere Job ${jobId}`);

      // Prüfen, ob die echte API verwendet werden soll
      if (shouldUseRealApi("useRealDocumentConverterApi")) {
        this.logService.info("Verwende echte API für Job-Priorisierung");

        const response = await apiService.post<void>(
          `${this.ADMIN_ENDPOINT}/queue/${jobId}/prioritize`,
          null,
          {
            priority: apiConfig.QUEUE.PRIORITIES.ADMIN,
          },
        );

        return response;
      }

      // Wenn keine echte API verfügbar ist, simuliere Erfolg
      this.logService.info("Simuliere Job-Priorisierung");

      return {
        success: true,
        message: `Job ${jobId} erfolgreich priorisiert`,
      };
    } catch (err: any) {
      this.logService.error(`Fehler beim Priorisieren des Jobs ${jobId}`, err);
      return {
        success: false,
        message: err.message || `Fehler beim Priorisieren des Jobs ${jobId}`,
        error: {
          code: "JOB_PRIORITIZE_ERROR",
          message: err.message || "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Bricht einen Job in der Warteschlange ab
   * @param jobId ID des abzubrechenden Jobs
   * @returns Erfolgsstatus
   */
  public async cancelJob(jobId: string): Promise<ApiResponse<void>> {
    try {
      this.logService.info(`Breche Job ${jobId} ab`);

      // Prüfen, ob die echte API verwendet werden soll
      if (shouldUseRealApi("useRealDocumentConverterApi")) {
        this.logService.info("Verwende echte API für Job-Abbruch");

        const response = await apiService.post<void>(
          `${this.ADMIN_ENDPOINT}/queue/${jobId}/cancel`,
          null,
          {
            priority: apiConfig.QUEUE.PRIORITIES.ADMIN,
          },
        );

        return response;
      }

      // Wenn keine echte API verfügbar ist, verwende die bestehende cancelConversion-Methode
      this.logService.info(
        "Verwende bestehende cancelConversion-Methode für Job-Abbruch",
      );

      await this.cancelConversion(jobId);

      return {
        success: true,
        message: `Job ${jobId} erfolgreich abgebrochen`,
      };
    } catch (err: any) {
      this.logService.error(`Fehler beim Abbrechen des Jobs ${jobId}`, err);
      return {
        success: false,
        message: err.message || `Fehler beim Abbrechen des Jobs ${jobId}`,
        error: {
          code: "JOB_CANCEL_ERROR",
          message: err.message || "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Pausiert die Konvertierungswarteschlange
   * @returns Erfolgsstatus
   */
  public async pauseQueue(): Promise<ApiResponse<void>> {
    try {
      this.logService.info("Pausiere Konvertierungswarteschlange");

      // Prüfen, ob die echte API verwendet werden soll
      if (shouldUseRealApi("useRealDocumentConverterApi")) {
        this.logService.info("Verwende echte API für Warteschlangen-Pause");

        const response = await apiService.post<void>(
          `${this.ADMIN_ENDPOINT}/queue/pause`,
          null,
          {
            priority: apiConfig.QUEUE.PRIORITIES.ADMIN,
          },
        );

        return response;
      }

      // Wenn keine echte API verfügbar ist, simuliere Erfolg
      this.logService.info("Simuliere Warteschlangen-Pause");

      return {
        success: true,
        message: "Konvertierungswarteschlange erfolgreich pausiert",
      };
    } catch (err: any) {
      this.logService.error(
        "Fehler beim Pausieren der Konvertierungswarteschlange",
        err,
      );
      return {
        success: false,
        message:
          err.message ||
          "Fehler beim Pausieren der Konvertierungswarteschlange",
        error: {
          code: "QUEUE_PAUSE_ERROR",
          message: err.message || "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Setzt die Konvertierungswarteschlange fort
   * @returns Erfolgsstatus
   */
  public async resumeQueue(): Promise<ApiResponse<void>> {
    try {
      this.logService.info("Setze Konvertierungswarteschlange fort");

      // Prüfen, ob die echte API verwendet werden soll
      if (shouldUseRealApi("useRealDocumentConverterApi")) {
        this.logService.info(
          "Verwende echte API für Warteschlangen-Fortsetzung",
        );

        const response = await apiService.post<void>(
          `${this.ADMIN_ENDPOINT}/queue/resume`,
          null,
          {
            priority: apiConfig.QUEUE.PRIORITIES.ADMIN,
          },
        );

        return response;
      }

      // Wenn keine echte API verfügbar ist, simuliere Erfolg
      this.logService.info("Simuliere Warteschlangen-Fortsetzung");

      return {
        success: true,
        message: "Konvertierungswarteschlange erfolgreich fortgesetzt",
      };
    } catch (err: any) {
      this.logService.error(
        "Fehler beim Fortsetzen der Konvertierungswarteschlange",
        err,
      );
      return {
        success: false,
        message:
          err.message ||
          "Fehler beim Fortsetzen der Konvertierungswarteschlange",
        error: {
          code: "QUEUE_RESUME_ERROR",
          message: err.message || "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Leert die Konvertierungswarteschlange
   * @returns Erfolgsstatus
   */
  public async clearQueue(): Promise<ApiResponse<void>> {
    try {
      this.logService.info("Leere Konvertierungswarteschlange");

      // Prüfen, ob die echte API verwendet werden soll
      if (shouldUseRealApi("useRealDocumentConverterApi")) {
        this.logService.info("Verwende echte API für Warteschlangen-Leerung");

        const response = await apiService.delete<void>(
          `${this.ADMIN_ENDPOINT}/queue`,
          {
            priority: apiConfig.QUEUE.PRIORITIES.ADMIN,
          },
        );

        return response;
      }

      // Wenn keine echte API verfügbar ist, simuliere Erfolg
      this.logService.info("Simuliere Warteschlangen-Leerung");

      // Versuche, alle schwebenden Dokumente abzubrechen (das ist nicht perfekt,
      // aber besser als nichts für die Mockup-Implementierung)
      const documents = await this.getDocuments();
      const pendingDocs = documents.filter(
        (doc) => doc.status === "pending" || doc.status === "processing",
      );

      for (const doc of pendingDocs) {
        try {
          await this.cancelConversion(doc.id);
        } catch (error) {
          this.logService.warn(
            `Konnte Konvertierung für Dokument ${doc.id} nicht abbrechen`,
            error,
          );
        }
      }

      return {
        success: true,
        message: "Konvertierungswarteschlange erfolgreich geleert",
      };
    } catch (err: any) {
      this.logService.error(
        "Fehler beim Leeren der Konvertierungswarteschlange",
        err,
      );
      return {
        success: false,
        message:
          err.message || "Fehler beim Leeren der Konvertierungswarteschlange",
        error: {
          code: "QUEUE_CLEAR_ERROR",
          message: err.message || "Unbekannter Fehler",
        },
      };
    }
  }
}

// Instanz erstellen und exportieren
const adminDocConverterService: IAdminDocConverterService =
  new AdminDocConverterService(documentConverterService);

// Make sure we explicitly export the interface and service
export type { IAdminDocConverterService };
export { adminDocConverterService };
export default adminDocConverterService;
