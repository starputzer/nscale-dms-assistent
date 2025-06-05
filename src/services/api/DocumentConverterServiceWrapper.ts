/**
 * DocumentConverterServiceWrapper
 *
 * Ein Service-Wrapper für die Integration zwischen dem DocumentConverter-Store
 * und dem DocumentConverterService. Dieser Wrapper fügt zusätzliche Funktionalitäten
 * wie Fehlerbehandlung, Logging und einheitliches Fehlerformat hinzu.
 */

import DocumentConverterService, {
  IDocumentConverterService,
} from "./DocumentConverterService";
import {
  ConversionResult,
  ConversionSettings,
  ConversionProgress,
} from "@/types/documentConverter";
import { LogService } from "../log/LogService";
import { ErrorObject } from "@/components/admin/document-converter/ErrorDisplay.vue";

/**
 * Interface für Konvertierungsfehler
 */
export interface ConversionError extends ErrorObject {
  documentId?: string;
  originalError?: Error;
  timestamp: Date;
}

class DocumentConverterServiceWrapper {
  private service: IDocumentConverterService;
  private logger: LogService;

  constructor() {
    this.service = DocumentConverterService;
    this.logger = new LogService("DocumentConverterServiceWrapper");
  }

  /**
   * Lädt eine Datei zum Server hoch mit verbesserter Fehlerbehandlung
   * @param file Die hochzuladende Datei
   * @param onProgress Callback-Funktion für Fortschrittsanzeige
   * @returns Die ID des hochgeladenen Dokuments
   * @throws Fehler mit strukturiertem Fehlerformat
   */
  public async uploadDocument(
    file: File,
    onProgress?: (progress: number) => void,
  ): Promise<string> {
    try {
      this.logger.info(
        `Starte Upload für ${file.name} (${formatFileSize(file.size)})`,
      );
      return await this.service.uploadDocument(file, onProgress);
    } catch (error) {
      const convertedError = this.convertError(
        error,
        "UPLOAD_FAILED",
        "network",
        {
          message: `Fehler beim Hochladen der Datei ${file.name}`,
          resolution:
            "Bitte überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut. Bei anhaltenden Problemen prüfen Sie, ob die Datei beschädigt ist.",
          helpItems: [
            "Stellen Sie sicher, dass Ihre Internetverbindung stabil ist",
            "Versuchen Sie, die Datei in einem anderen Format zu speichern",
            "Reduzieren Sie die Dateigröße, falls möglich",
          ],
        },
      );

      this.logger.error("Fehler beim Hochladen:", convertedError);
      throw convertedError;
    }
  }

  /**
   * Konvertiert ein hochgeladenes Dokument mit verbesserter Fehlerbehandlung
   * @param documentId ID des zu konvertierenden Dokuments
   * @param settings Konvertierungseinstellungen
   * @param onProgress Callback-Funktion für Fortschrittsanzeige
   * @returns Das konvertierte Dokument
   * @throws Fehler mit strukturiertem Fehlerformat
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
    try {
      this.logger.info(`Starte Konvertierung für Dokument ${documentId}`);
      return await this.service.convertDocument(
        documentId,
        settings,
        onProgress,
      );
    } catch (error) {
      const convertedError = this.convertError(
        error,
        "CONVERSION_FAILED",
        "server",
        {
          message: "Fehler bei der Konvertierung des Dokuments",
          resolution:
            "Der Server konnte die Datei nicht konvertieren. Bitte versuchen Sie es später erneut oder mit einer anderen Datei.",
          helpItems: [
            "Prüfen Sie, ob die Datei in einem unterstützten Format vorliegt",
            "Versuchen Sie, die Datei in einem anderen Programm zu öffnen, um sicherzustellen, dass sie nicht beschädigt ist",
            "Versuchen Sie es mit einer kleineren oder weniger komplexen Datei",
          ],
          documentId,
        },
      );

      this.logger.error(
        `Fehler bei der Konvertierung von Dokument ${documentId}:`,
        convertedError,
      );
      throw convertedError;
    }
  }

  /**
   * Ruft den Konvertierungsstatus eines Dokuments ab
   * @param documentId ID des zu prüfenden Dokuments
   * @returns Aktueller Konvertierungsstatus
   * @throws Fehler mit strukturiertem Fehlerformat
   */
  public async getConversionStatus(
    documentId: string,
  ): Promise<ConversionProgress> {
    try {
      this.logger.debug(
        `Rufe Konvertierungsstatus für Dokument ${documentId} ab`,
      );
      return await this.service.getConversionStatus(documentId);
    } catch (error) {
      const convertedError = this.convertError(
        error,
        "STATUS_CHECK_FAILED",
        "server",
        {
          message: "Fehler beim Abrufen des Konvertierungsstatus",
          documentId,
        },
      );

      this.logger.warn(
        `Fehler beim Abrufen des Konvertierungsstatus für Dokument ${documentId}:`,
        convertedError,
      );
      throw convertedError;
    }
  }

  /**
   * Ruft alle verfügbaren Dokumente ab
   * @returns Liste aller Dokumente
   * @throws Fehler mit strukturiertem Fehlerformat
   */
  public async getDocuments(): Promise<ConversionResult[]> {
    try {
      this.logger.info("Rufe Dokumentliste ab");
      return await this.service.getDocuments();
    } catch (error) {
      const convertedError = this.convertError(
        error,
        "GET_DOCUMENTS_FAILED",
        "server",
        {
          message: "Fehler beim Abrufen der Dokumentenliste",
          resolution:
            "Die Dokumentenliste konnte nicht vom Server abgerufen werden. Bitte versuchen Sie es später erneut.",
        },
      );

      this.logger.error(
        "Fehler beim Abrufen der Dokumentenliste:",
        convertedError,
      );
      throw convertedError;
    }
  }

  /**
   * Ruft ein spezifisches Dokument ab
   * @param documentId ID des abzurufenden Dokuments
   * @returns Das angeforderte Dokument
   * @throws Fehler mit strukturiertem Fehlerformat
   */
  public async getDocument(documentId: string): Promise<ConversionResult> {
    try {
      this.logger.debug(`Rufe Dokument ${documentId} ab`);
      return await this.service.getDocument(documentId);
    } catch (error) {
      const convertedError = this.convertError(
        error,
        "GET_DOCUMENT_FAILED",
        "server",
        {
          message: `Fehler beim Abrufen des Dokuments ${documentId}`,
          documentId,
        },
      );

      this.logger.error(
        `Fehler beim Abrufen des Dokuments ${documentId}:`,
        convertedError,
      );
      throw convertedError;
    }
  }

  /**
   * Ruft den Inhalt eines konvertierten Dokuments ab
   * @param documentId ID des Dokuments
   * @returns Inhalt des Dokuments
   * @throws Fehler mit strukturiertem Fehlerformat
   */
  public async getDocumentContent(documentId: string): Promise<string> {
    try {
      this.logger.debug(`Rufe Dokumentinhalt für ${documentId} ab`);
      return await (this.service as any).getDocumentContent(documentId);
    } catch (error) {
      const convertedError = this.convertError(
        error,
        "GET_CONTENT_FAILED",
        "server",
        {
          message: "Fehler beim Abrufen des Dokumentinhalts",
          documentId,
        },
      );

      this.logger.error(
        `Fehler beim Abrufen des Dokumentinhalts für ${documentId}:`,
        convertedError,
      );
      throw convertedError;
    }
  }

  /**
   * Löscht ein Dokument
   * @param documentId ID des zu löschenden Dokuments
   * @throws Fehler mit strukturiertem Fehlerformat
   */
  public async deleteDocument(documentId: string): Promise<void> {
    try {
      this.logger.info(`Lösche Dokument ${documentId}`);
      await this.service.deleteDocument(documentId);
    } catch (error) {
      const convertedError = this.convertError(
        error,
        "DELETE_FAILED",
        "server",
        {
          message: `Fehler beim Löschen des Dokuments ${documentId}`,
          documentId,
        },
      );

      this.logger.error(
        `Fehler beim Löschen des Dokuments ${documentId}:`,
        convertedError,
      );
      throw convertedError;
    }
  }

  /**
   * Lädt ein konvertiertes Dokument herunter
   * @param documentId ID des herunterzuladenden Dokuments
   * @param filename Optionaler Dateiname für den Download
   * @param onProgress Callback-Funktion für Fortschrittsanzeige
   * @returns Blob des heruntergeladenen Dokuments
   * @throws Fehler mit strukturiertem Fehlerformat
   */
  public async downloadDocument(
    documentId: string,
    filename?: string,
    onProgress?: (progress: number) => void,
  ): Promise<Blob> {
    try {
      this.logger.info(`Starte Download für Dokument ${documentId}`);
      return await this.service.downloadDocument(
        documentId,
        filename,
        onProgress,
      );
    } catch (error) {
      const convertedError = this.convertError(
        error,
        "DOWNLOAD_FAILED",
        "network",
        {
          message: "Fehler beim Herunterladen des Dokuments",
          resolution:
            "Der Download konnte nicht abgeschlossen werden. Bitte versuchen Sie es später erneut.",
          documentId,
        },
      );

      this.logger.error(
        `Fehler beim Herunterladen des Dokuments ${documentId}:`,
        convertedError,
      );
      throw convertedError;
    }
  }

  /**
   * Bricht eine laufende Konvertierung ab
   * @param documentId ID des Dokuments, dessen Konvertierung abgebrochen werden soll
   * @throws Fehler mit strukturiertem Fehlerformat
   */
  public async cancelConversion(documentId: string): Promise<void> {
    try {
      this.logger.info(`Breche Konvertierung für Dokument ${documentId} ab`);
      await this.service.cancelConversion(documentId);
    } catch (error) {
      const convertedError = this.convertError(
        error,
        "CANCEL_FAILED",
        "server",
        {
          message: "Fehler beim Abbrechen der Konvertierung",
          documentId,
        },
      );

      this.logger.error(
        `Fehler beim Abbrechen der Konvertierung für Dokument ${documentId}:`,
        convertedError,
      );
      throw convertedError;
    }
  }

  /**
   * Prüft, ob ein Dateiformat unterstützt wird
   * @param format Das zu prüfende Dateiformat
   * @returns true, wenn das Format unterstützt wird
   */
  public isFormatSupported(format: string): boolean {
    return (this.service as any).isFormatSupported(format);
  }

  /**
   * Konvertiert einen Error in ein standardisiertes ConversionError-Format
   * @param error Der ursprüngliche Fehler
   * @param code Fehlercode
   * @param type Fehlertyp
   * @param additional Zusätzliche Fehlerdaten
   * @returns Formatierter Fehler im ConversionError-Format
   */
  private convertError(
    error: unknown,
    code: string,
    type:
      | "network"
      | "format"
      | "server"
      | "permission"
      | "validation"
      | "timeout"
      | "unknown" = "unknown",
    additional: Partial<ConversionError> = {},
  ): ConversionError {
    let message = "Ein unbekannter Fehler ist aufgetreten";
    let details = "";

    if (error instanceof Error) {
      message = error.message;
      details = error.stack || "";
    } else if (typeof error === "string") {
      message = error;
    } else if (error && typeof error === "object") {
      if ("message" in error && typeof error.message === "string") {
        message = error.message;
      }

      try {
        details = JSON.stringify(error, null, 2);
      } catch (e) {
        details = String(error);
      }
    }

    // Fehlertyp intelligent ermitteln, falls nicht explizit angegeben
    if (type === "unknown" && typeof message === "string") {
      const messageLower = message.toLowerCase();

      if (
        messageLower.includes("network") ||
        messageLower.includes("netzwerk") ||
        messageLower.includes("connection") ||
        messageLower.includes("verbindung") ||
        messageLower.includes("timeout") ||
        messageLower.includes("zeitüberschreitung")
      ) {
        type = "network";
      } else if (
        messageLower.includes("permission") ||
        messageLower.includes("berechtigung") ||
        messageLower.includes("unauthorized") ||
        messageLower.includes("unautorisiert") ||
        messageLower.includes("forbidden") ||
        messageLower.includes("verboten")
      ) {
        type = "permission";
      } else if (
        messageLower.includes("format") ||
        messageLower.includes("type") ||
        messageLower.includes("typ") ||
        messageLower.includes("invalid file") ||
        messageLower.includes("ungültige datei")
      ) {
        type = "format";
      } else if (
        messageLower.includes("validation") ||
        messageLower.includes("validierung") ||
        messageLower.includes("invalid") ||
        messageLower.includes("ungültig")
      ) {
        type = "validation";
      }
    }

    return {
      code,
      message: (additional as any).message || message,
      details: (additional as any).details || details,
      type,
      timestamp: new Date(),
      resolution: (additional as any).resolution,
      helpItems: (additional as any).helpItems,
      documentId: additional.documentId,
      originalError: error instanceof Error ? error : undefined,
    };
  }
}

/**
 * Formatiert die Dateigröße benutzerfreundlich
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Singleton-Instanz erstellen
const documentConverterServiceWrapper = new DocumentConverterServiceWrapper();

export { ConversionError };
export default documentConverterServiceWrapper;
