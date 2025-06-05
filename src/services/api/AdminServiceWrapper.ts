/**
 * AdminServiceWrapper
 *
 * Dieser Service kapselt die Kommunikation mit den Admin-API-Endpunkten
 * und bietet eine standardisierte Fehlerbehandlung und Logging.
 */

import { adminApi } from "./admin";
import { LogService } from "../log/LogService";
import type {
  User,
  NewUser,
  SystemStats,
  SystemAction,
  FeedbackStats,
  FeedbackEntry,
  FeedbackFilter,
  MotdConfig,
  DocConverterStatus,
  DocConverterJob,
  DocConverterSettings,
} from "@/types/admin";

export class AdminServiceWrapper {
  private logService: LogService;

  constructor() {
    this.logService = new LogService("AdminService");
  }

  /**
   * Benutzerverwaltung
   */
  async getUsers(): Promise<User[]> {
    try {
      this.logService.debug("Rufe Benutzerliste ab");
      const response = await adminApi.getUsers();
      return response.data.users;
    } catch (error) {
      this.logService.error("Fehler beim Abrufen der Benutzerliste", error);
      throw this.formatError(error, "Benutzer konnten nicht geladen werden");
    }
  }

  async createUser(userData: NewUser): Promise<User> {
    try {
      this.logService.debug("Erstelle neuen Benutzer", {
        email: userData.email,
        role: userData.role,
      });
      const response = await adminApi.createUser(userData);
      return response.data.user;
    } catch (error) {
      this.logService.error("Fehler beim Erstellen eines Benutzers", {
        ...error,
        userData,
      });
      throw this.formatError(error, "Benutzer konnte nicht erstellt werden");
    }
  }

  async updateUserRole(userId: string, role: string): Promise<User> {
    try {
      this.logService.debug("Aktualisiere Benutzerrolle", { userId, role });
      const response = await adminApi.updateUserRole(userId, role);
      return response.data.user;
    } catch (error) {
      this.logService.error("Fehler beim Aktualisieren der Benutzerrolle", {
        ...error,
        userId,
        role,
      });
      throw this.formatError(
        error,
        "Benutzerrolle konnte nicht aktualisiert werden",
      );
    }
  }

  async deleteUser(userId: string): Promise<void> {
    try {
      this.logService.debug("Lösche Benutzer", { userId });
      await adminApi.deleteUser(userId);
    } catch (error) {
      this.logService.error("Fehler beim Löschen eines Benutzers", {
        ...error,
        userId,
      });
      throw this.formatError(error, "Benutzer konnte nicht gelöscht werden");
    }
  }

  /**
   * Systemverwaltung
   */
  async getSystemStats(): Promise<SystemStats> {
    try {
      this.logService.debug("Rufe Systemstatistiken ab");
      const response = await adminApi.getSystemStats();
      return response.data.stats;
    } catch (error) {
      this.logService.error("Fehler beim Abrufen der Systemstatistiken", error);
      throw this.formatError(
        error,
        "Systemstatistiken konnten nicht geladen werden",
      );
    }
  }

  async performSystemAction(action: SystemAction): Promise<void> {
    try {
      this.logService.debug("Führe Systemaktion aus", {
        actionType: action.type,
      });

      switch (action.type) {
        case "clear-cache":
          await adminApi.clearModelCache();
          break;
        case "clear-embedding-cache":
          await adminApi.clearEmbeddingCache();
          break;
        case "reload-motd":
          await adminApi.reloadMotd();
          break;
        default:
          throw new Error(`Unbekannte Systemaktion: ${action.type}`);
      }
    } catch (error) {
      this.logService.error("Fehler beim Ausführen einer Systemaktion", {
        ...error,
        actionType: action.type,
      });
      throw this.formatError(
        error,
        `Die Aktion '${action.name}' konnte nicht ausgeführt werden`,
      );
    }
  }

  /**
   * Feedback-Verwaltung
   */
  async getFeedbackStats(): Promise<FeedbackStats> {
    try {
      this.logService.debug("Rufe Feedback-Statistiken ab");
      const response = await adminApi.getFeedbackStats();
      return response.data.stats;
    } catch (error) {
      this.logService.error(
        "Fehler beim Abrufen der Feedback-Statistiken",
        error,
      );
      throw this.formatError(
        error,
        "Feedback-Statistiken konnten nicht geladen werden",
      );
    }
  }

  async getNegativeFeedback(filter?: FeedbackFilter): Promise<FeedbackEntry[]> {
    try {
      this.logService.debug("Rufe negatives Feedback ab", { filter });
      // Hier würde eine Filterlogik implementiert werden, falls die API dies unterstützt
      const response = await adminApi.getNegativeFeedback();

      // Lokale Filterung, falls die API keine Filterung unterstützt
      let feedback = response.data.feedback;

      if (filter) {
        if (filter.dateFrom) {
          feedback = feedback.filter((
            (entry: any) => entry.created_at >= filter.dateFrom!,
          );
        }
        if (filter.dateTo) {
          feedback = feedback.filter((
            (entry: any) => entry.created_at <= filter.dateTo!,
          );
        }
        if (filter.isPositive !== undefined) {
          feedback = feedback.filter((
            (entry: any) => entry.is_positive === filter.isPositive,
          );
        }
        if (filter.hasComment !== undefined) {
          feedback = feedback.filter((entry: any) =>
            filter.hasComment ? !!entry.comment : !entry.comment,
          );
        }
        if (filter.searchTerm) {
          const term = filter.searchTerm.toLowerCase();
          feedback = feedback.filter((
            (entry: any) =>
              entry.comment?.toLowerCase().includes(term) ||
              entry.question.toLowerCase().includes(term) ||
              entry.answer.toLowerCase().includes(term),
          );
        }
      }

      return feedback;
    } catch (error) {
      this.logService.error("Fehler beim Abrufen des negativen Feedbacks", {
        ...error,
        filter,
      });
      throw this.formatError(
        error,
        "Negatives Feedback konnte nicht geladen werden",
      );
    }
  }

  /**
   * MOTD-Verwaltung
   */
  async getMotd(): Promise<MotdConfig> {
    try {
      this.logService.debug("Rufe MOTD-Konfiguration ab");
      const response = await adminApi.getMotd();
      return response.data.motd;
    } catch (error) {
      this.logService.error(
        "Fehler beim Abrufen der MOTD-Konfiguration",
        error,
      );
      throw this.formatError(
        error,
        "MOTD-Konfiguration konnte nicht geladen werden",
      );
    }
  }

  async updateMotd(motdConfig: MotdConfig): Promise<MotdConfig> {
    try {
      this.logService.debug("Aktualisiere MOTD-Konfiguration");
      const response = await adminApi.updateMotd(motdConfig);
      return response.data.motd;
    } catch (error) {
      this.logService.error(
        "Fehler beim Aktualisieren der MOTD-Konfiguration",
        { ...error, motdConfig },
      );
      throw this.formatError(
        error,
        "MOTD-Konfiguration konnte nicht aktualisiert werden",
      );
    }
  }

  /**
   * Dokumentenkonverter-Verwaltung
   */
  async getDocConverterStatus(): Promise<DocConverterStatus> {
    try {
      this.logService.debug("Rufe Status des Dokumentenkonverters ab");
      const response = await adminApi.getDocConverterStatus();
      return response.data.status;
    } catch (error) {
      this.logService.error(
        "Fehler beim Abrufen des Dokumentenkonverter-Status",
        error,
      );
      throw this.formatError(
        error,
        "Dokumentenkonverter-Status konnte nicht geladen werden",
      );
    }
  }

  async getDocConverterJobs(): Promise<DocConverterJob[]> {
    try {
      this.logService.debug("Rufe Dokumentenkonverter-Jobs ab");
      const response = await adminApi.getDocConverterJobs();
      return response.data.jobs;
    } catch (error) {
      this.logService.error(
        "Fehler beim Abrufen der Dokumentenkonverter-Jobs",
        error,
      );
      throw this.formatError(
        error,
        "Dokumentenkonverter-Jobs konnten nicht geladen werden",
      );
    }
  }

  async getDocConverterSettings(): Promise<DocConverterSettings> {
    try {
      this.logService.debug("Rufe Dokumentenkonverter-Einstellungen ab");
      const response = await adminApi.getDocConverterSettings();
      return response.data.settings;
    } catch (error) {
      this.logService.error(
        "Fehler beim Abrufen der Dokumentenkonverter-Einstellungen",
        error,
      );
      throw this.formatError(
        error,
        "Dokumentenkonverter-Einstellungen konnten nicht geladen werden",
      );
    }
  }

  async updateDocConverterSettings(
    settings: DocConverterSettings,
  ): Promise<DocConverterSettings> {
    try {
      this.logService.debug("Aktualisiere Dokumentenkonverter-Einstellungen");
      const response = await adminApi.updateDocConverterSettings(settings);
      return response.data.settings;
    } catch (error) {
      this.logService.error(
        "Fehler beim Aktualisieren der Dokumentenkonverter-Einstellungen",
        { ...error, settings },
      );
      throw this.formatError(
        error,
        "Dokumentenkonverter-Einstellungen konnten nicht aktualisiert werden",
      );
    }
  }

  async startDocConverterJob(jobId: string): Promise<void> {
    try {
      this.logService.debug("Starte Dokumentenkonverter-Job", { jobId });
      await adminApi.startDocConverterJob(jobId);
    } catch (error) {
      this.logService.error(
        "Fehler beim Starten eines Dokumentenkonverter-Jobs",
        { ...error, jobId },
      );
      throw this.formatError(
        error,
        "Dokumentenkonverter-Job konnte nicht gestartet werden",
      );
    }
  }

  async cancelDocConverterJob(jobId: string): Promise<void> {
    try {
      this.logService.debug("Breche Dokumentenkonverter-Job ab", { jobId });
      await adminApi.cancelDocConverterJob(jobId);
    } catch (error) {
      this.logService.error(
        "Fehler beim Abbrechen eines Dokumentenkonverter-Jobs",
        { ...error, jobId },
      );
      throw this.formatError(
        error,
        "Dokumentenkonverter-Job konnte nicht abgebrochen werden",
      );
    }
  }

  /**
   * Log-Verwaltung
   */
  async getLogs(params?: {
    level?: string;
    component?: string;
    startTime?: number;
    endTime?: number;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<any> {
    try {
      this.logService.debug("Rufe Logs ab", { params });
      // Hier müsste ein entsprechender API-Endpunkt im adminApi hinzugefügt werden
      // const response = await adminApi.getLogs(params);
      // return response.data;

      // Simulierte Daten für Entwicklungszwecke
      const logs = this.generateSampleLogs();

      // Filterung
      let filteredLogs = [...logs];

      if (params) {
        if (params.level) {
          filteredLogs = filteredLogs.filter(
            (log) => log.level === params.level,
          );
        }
        if (params.component) {
          filteredLogs = filteredLogs.filter(
            (log) => log.component === params.component,
          );
        }
        if (params.startTime) {
          filteredLogs = filteredLogs.filter(
            (log) => log.timestamp >= params.startTime!,
          );
        }
        if (params.endTime) {
          filteredLogs = filteredLogs.filter(
            (log) => log.timestamp <= params.endTime!,
          );
        }
        if (params.search) {
          const term = params.search.toLowerCase();
          filteredLogs = filteredLogs.filter(
            (log) =>
              log.message.toLowerCase().includes(term) ||
              log.component.toLowerCase().includes(term) ||
              (log.details && log.details.toLowerCase().includes(term)),
          );
        }
      }

      // Paginierung
      const page = params?.page || 1;
      const pageSize = params?.pageSize || 20;
      const start = (page - 1) * pageSize;
      const end = start + pageSize;

      return {
        logs: filteredLogs.slice(start, end),
        total: filteredLogs.length,
        page,
        pageSize,
        totalPages: Math.ceil(filteredLogs.length / pageSize),
      };
    } catch (error) {
      this.logService.error("Fehler beim Abrufen der Logs", {
        ...error,
        params,
      });
      throw this.formatError(error, "Logs konnten nicht geladen werden");
    }
  }

  async clearLogs(): Promise<void> {
    try {
      this.logService.debug("Lösche Logs");
      // Hier müsste ein entsprechender API-Endpunkt im adminApi hinzugefügt werden
      // await adminApi.clearLogs();

      // Simulierter Erfolg für Entwicklungszwecke
      return Promise.resolve();
    } catch (error) {
      this.logService.error("Fehler beim Löschen der Logs", error);
      throw this.formatError(error, "Logs konnten nicht gelöscht werden");
    }
  }

  /**
   * Hilfsmethoden
   */
  private formatError(error: any, defaultMessage: string): Error {
    // Versuche, Fehlerinformationen aus der API-Antwort zu extrahieren
    const errorMessage = error?.response?.data?.message || defaultMessage;
    const errorCode = error?.response?.status || "UNKNOWN";

    const formattedError = new Error(errorMessage);
    (formattedError as any).code = errorCode;
    (formattedError as any).originalError = error;

    return formattedError;
  }

  /**
   * Generiert Beispiel-Logs für Entwicklungszwecke
   */
  private generateSampleLogs(): any[] {
    const logs: any[] = [];
    const now = Date.now();
    const components = [
      "Auth",
      "API",
      "Database",
      "UI",
      "Cache",
      "Session",
      "FileSystem",
    ];
    const levels = ["error", "warn", "info", "debug"];
    const messages = [
      "Benutzeranmeldung erfolgreich",
      "Datenbankverbindung fehlgeschlagen",
      "Cache-Eintrag abgelaufen",
      "Anfrage verarbeitet",
      "Ungültiger API-Token",
      "Benutzer abgemeldet",
      "Dateisystem-Operation erfolgreich",
      "Sitzung abgelaufen",
      "Ungültige Anfrageparameter",
      "Systemstart abgeschlossen",
    ];

    // Generiere Beispiel-Logs für die letzten 30 Tage
    for (let i = 0; i < 100; i++) {
      const timestamp =
        now - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000);
      const level = levels[Math.floor(Math.random() * levels.length)];
      const component =
        components[Math.floor(Math.random() * components.length)];
      const message = messages[Math.floor(Math.random() * messages.length)];

      logs.push({
        id: `log-${i}-${Date.now()}`,
        timestamp,
        level,
        component,
        message,
        details:
          level === "error"
            ? "Stack trace:\n  at function (file.js:123)\n  at otherFunction (other.js:45)"
            : undefined,
      });
    }

    return logs;
  }
}

// Singleton-Instanz exportieren
export const adminService = new AdminServiceWrapper();

export default adminService;
