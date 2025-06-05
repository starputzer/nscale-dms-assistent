/**
 * AdminFeedbackService - Spezialisierter Service für die Feedback-Verwaltung im Admin-Bereich
 *
 * Verwaltet die API-Kommunikation für die Feedback-Verwaltungsfunktionen
 * und bietet eine konsistente Fehlerbehandlung und Fallback-Mechanismen.
 */

import { apiService } from "./ApiService";
import { cachedApiService } from "./CachedApiService";
import { apiConfig } from "./config";
import { adminApi } from "./admin";
import { LogService } from "../log/LogService";
import { ApiResponse } from "@/types/api";
import {
  FeedbackStats,
  FeedbackEntry,
  FeedbackFilter,
  ExportOptions,
} from "@/types/admin";
import { shouldUseRealApi } from "@/config/api-flags";

export interface IAdminFeedbackService {
  getFeedbackStats(): Promise<ApiResponse<FeedbackStats>>;
  getAllFeedback(limit?: number): Promise<ApiResponse<FeedbackEntry[]>>;
  getNegativeFeedback(limit?: number): Promise<ApiResponse<FeedbackEntry[]>>;
  updateFeedbackStatus(
    id: string,
    status: string,
  ): Promise<ApiResponse<FeedbackEntry>>;
  deleteFeedback(id: string): Promise<ApiResponse<void>>;
  exportFeedback(options: ExportOptions): Promise<ApiResponse<Blob | any>>;
  filterFeedback(filter: FeedbackFilter): Promise<ApiResponse<FeedbackEntry[]>>;
}

/**
 * AdminFeedbackService Klasse für die Verwaltung von Feedback-Funktionen
 */
export class AdminFeedbackService implements IAdminFeedbackService {
  /** Logger für Diagnose */
  private logger: LogService;

  /** Cache-TTL in Sekunden */
  private statsCacheTTL: number = 300; // 5 Minuten
  private feedbackCacheTTL: number = 120; // 2 Minuten

  /**
   * Konstruktor
   */
  constructor() {
    this.logger = new LogService("AdminFeedbackService");
  }

  /**
   * Feedback-Statistiken abrufen
   */
  public async getFeedbackStats(): Promise<ApiResponse<FeedbackStats>> {
    try {
      // Prüfen, ob die echte API verwendet werden soll
      if (shouldUseRealApi("useRealFeedbackApi")) {
        this.logger.info("Verwende echte API für Feedback-Statistiken");

        // Cache-Strategie: Kurzzeitiges Caching für Statistiken
        const options = {
          cache: true,
          cacheTTL: this.statsCacheTTL,
          refreshToken: true,
        };

        const response = await apiService.get<FeedbackStats>(
          "/admin/feedback/stats",
          undefined,
          options,
        );

        if (response.success) {
          // Check if stats are nested in response.data.stats
          if (response.data && (response.data as any).stats) {
            return {
              success: true,
              data: (response.data as any).stats,
              message: "Feedback-Statistiken erfolgreich abgerufen",
            };
          }
          return response;
        } else {
          throw new Error(
            response.message || "Fehler beim Abrufen der Feedback-Statistiken",
          );
        }
      }

      // Fallback zu adminApi mit Mock-Daten
      this.logger.info(
        "Verwende Mock-Daten über adminApi für Feedback-Statistiken",
      );

      const response = await adminApi.getFeedbackStats();
      return {
        success: true,
        data: response?.data?.stats || response?.data,
        message: "Feedback-Statistiken erfolgreich abgerufen",
      };
    } catch (error) {
      this.logger.error("Fehler beim Abrufen der Feedback-Statistiken", error);

      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Fehler beim Abrufen der Feedback-Statistiken",
        error: {
          code: "FEEDBACK_STATS_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Alle Feedbacks abrufen
   */
  public async getAllFeedback(
    limit: number = 1000,
  ): Promise<ApiResponse<FeedbackEntry[]>> {
    try {
      // Prüfen, ob die echte API verwendet werden soll
      if (shouldUseRealApi("useRealFeedbackApi")) {
        this.logger.info("Verwende echte API für alle Feedbacks");

        // Cache-Strategie: Kurzzeitiges Caching für Feedback-Einträge
        const options = {
          cache: true,
          cacheTTL: this.feedbackCacheTTL,
          refreshToken: true,
        };

        const response = await apiService.get<FeedbackEntry[]>(
          `/admin/feedback/list?limit=${limit}`,
          undefined,
          options,
        );

        if (response.success) {
          // Check if feedback is nested in response.data.feedback
          if (response.data && (response.data as any).feedback) {
            return {
              success: true,
              data: (response.data as any).feedback,
              message: "Alle Feedbacks erfolgreich abgerufen",
            };
          }
          return response;
        } else {
          throw new Error(
            response.message || "Fehler beim Abrufen aller Feedbacks",
          );
        }
      }

      // Fallback zu adminApi mit Mock-Daten
      this.logger.info("Verwende Mock-Daten über adminApi für alle Feedbacks");

      const response = await (adminApi as any).getAllFeedback(limit);
      return {
        success: true,
        data: response?.data?.feedback || response?.data,
        message: "Alle Feedbacks erfolgreich abgerufen",
      };
    } catch (error) {
      this.logger.error("Fehler beim Abrufen aller Feedbacks", error);

      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Fehler beim Abrufen aller Feedbacks",
        error: {
          code: "ALL_FEEDBACK_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Negatives Feedback abrufen
   */
  public async getNegativeFeedback(
    limit: number = 100,
  ): Promise<ApiResponse<FeedbackEntry[]>> {
    try {
      // Prüfen, ob die echte API verwendet werden soll
      if (shouldUseRealApi("useRealFeedbackApi")) {
        this.logger.info("Verwende echte API für negatives Feedback");

        // Cache-Strategie: Kurzzeitiges Caching für Feedback-Einträge
        const options = {
          cache: true,
          cacheTTL: this.feedbackCacheTTL,
          refreshToken: true,
        };

        const response = await apiService.get<FeedbackEntry[]>(
          `/admin/feedback/negative?limit=${limit}`,
          undefined,
          options,
        );

        if (response.success) {
          // Check if feedback is nested in response.data.feedback
          if (response.data && (response.data as any).feedback) {
            return {
              success: true,
              data: (response.data as any).feedback,
              message: "Negatives Feedback erfolgreich abgerufen",
            };
          }
          return response;
        } else {
          throw new Error(
            response.message || "Fehler beim Abrufen des negativen Feedbacks",
          );
        }
      }

      // Fallback zu adminApi mit Mock-Daten
      this.logger.info(
        "Verwende Mock-Daten über adminApi für negatives Feedback",
      );

      const response = await adminApi.getNegativeFeedback(limit);
      return {
        success: true,
        data: response?.data?.feedback || response?.data,
        message: "Negatives Feedback erfolgreich abgerufen",
      };
    } catch (error) {
      this.logger.error("Fehler beim Abrufen des negativen Feedbacks", error);

      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Fehler beim Abrufen des negativen Feedbacks",
        error: {
          code: "NEGATIVE_FEEDBACK_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Feedback-Status aktualisieren
   */
  public async updateFeedbackStatus(
    id: string,
    status: string,
  ): Promise<ApiResponse<FeedbackEntry>> {
    try {
      // Prüfen, ob die echte API verwendet werden soll
      if (shouldUseRealApi("useRealFeedbackApi")) {
        this.logger.info(
          `Verwende echte API für Statusaktualisierung des Feedbacks ${id}`,
        );

        const response = await apiService.put<FeedbackEntry>(
          `/admin/feedback/${id}/status`,
          { status },
        );

        if (response.success) {
          // Cache für Feedback-Listen invalidieren
          cachedApiService.invalidate(
            "/admin/feedback/negative",
          );
          return response;
        } else {
          throw new Error(
            response.message ||
              `Fehler beim Aktualisieren des Feedback-Status ${id}`,
          );
        }
      }

      // Fallback zu adminApi mit Mock-Daten
      this.logger.info(
        `Verwende Mock-Daten über adminApi für Statusaktualisierung des Feedbacks ${id}`,
      );

      const response = await adminApi.updateFeedbackStatus(id, status);
      return {
        success: true,
        data: response?.data,
        message: "Feedback-Status erfolgreich aktualisiert",
      };
    } catch (error) {
      this.logger.error(
        `Fehler beim Aktualisieren des Feedback-Status ${id}`,
        error,
      );

      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : `Fehler beim Aktualisieren des Feedback-Status ${id}`,
        error: {
          code: "FEEDBACK_STATUS_UPDATE_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Feedback löschen
   */
  public async deleteFeedback(id: string): Promise<ApiResponse<void>> {
    try {
      // Prüfen, ob die echte API verwendet werden soll
      if (shouldUseRealApi("useRealFeedbackApi")) {
        this.logger.info(`Verwende echte API zum Löschen des Feedbacks ${id}`);

        const response = await apiService.delete<void>(
          `/admin/feedback/${id}`,
        );

        if (response.success) {
          // Cache für Feedback-Listen und Stats invalidieren
          cachedApiService.invalidate(
            "/admin/feedback/negative",
          );
          cachedApiService.invalidate(
            "/admin/feedback/stats",
          );
          return response;
        } else {
          throw new Error(
            response.message || `Fehler beim Löschen des Feedbacks ${id}`,
          );
        }
      }

      // Fallback zu adminApi mit Mock-Daten
      this.logger.info(
        `Verwende Mock-Daten über adminApi zum Löschen des Feedbacks ${id}`,
      );

      await adminApi.deleteFeedback(id);
      return {
        success: true,
        message: "Feedback erfolgreich gelöscht",
      };
    } catch (error) {
      this.logger.error(`Fehler beim Löschen des Feedbacks ${id}`, error);

      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : `Fehler beim Löschen des Feedbacks ${id}`,
        error: {
          code: "FEEDBACK_DELETE_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Feedback exportieren
   */
  public async exportFeedback(
    options: ExportOptions,
  ): Promise<ApiResponse<Blob | any>> {
    try {
      // Prüfen, ob die echte API verwendet werden soll
      if (shouldUseRealApi("useRealFeedbackApi")) {
        this.logger.info(
          `Verwende echte API für Feedback-Export im Format ${options.format}`,
        );

        // Erstelle Filterparameter für den Export
        const params = {
          format: options.format,
          fields: options.fields.join(","),
        };

        // Führe den Export mit Blob-Response durch
        const response = await apiService.get<Blob>(
          "/admin/feedback/export",
          params,
          { responseType: "blob" },
        );

        if (response.success) {
          return response;
        } else {
          throw new Error(
            response.message || "Fehler beim Exportieren des Feedbacks",
          );
        }
      }

      // Fallback zu adminApi mit Mock-Daten
      this.logger.info(
        `Verwende Mock-Daten für Feedback-Export im Format ${options.format}`,
      );

      // Für Mock-Daten geben wir einfach einen Erfolg zurück
      return {
        success: true,
        message: `Feedback erfolgreich im Format ${options.format} exportiert`,
        data: {
          fileName: `feedback_export_${new Date().toISOString().split("T")[0]}.${options.format}`,
          fileSize: Math.round(Math.random() * 100 + 50) + " KB",
          entries: options.data.length,
        },
      };
    } catch (error) {
      this.logger.error(
        `Fehler beim Exportieren des Feedbacks im Format ${options.format}`,
        error,
      );

      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : `Fehler beim Exportieren des Feedbacks im Format ${options.format}`,
        error: {
          code: "FEEDBACK_EXPORT_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Feedback filtern
   */
  public async filterFeedback(
    filter: FeedbackFilter,
  ): Promise<ApiResponse<FeedbackEntry[]>> {
    try {
      // Prüfen, ob die echte API verwendet werden soll
      if (shouldUseRealApi("useRealFeedbackApi")) {
        this.logger.info("Verwende echte API für Feedback-Filterung");

        const response = await apiService.post<FeedbackEntry[]>(
          "/admin/feedback/filter",
          filter,
        );

        if (response.success) {
          return response;
        } else {
          throw new Error(
            response.message || "Fehler beim Filtern des Feedbacks",
          );
        }
      }

      // Für die Filterung holen wir zuerst das gesamte negative Feedback
      // und filtern es dann manuell
      const feedbackResponse = await this.getNegativeFeedback();

      if (feedbackResponse.success && Array.isArray(feedbackResponse.data)) {
        let filtered = [...feedbackResponse.data];

        // Filterung nach Datum
        if (filter.dateFrom) {
          filtered = filtered.filter(
            (f) => new Date(f.created_at).getTime() >= filter.dateFrom!,
          );
        }

        if (filter.dateTo) {
          filtered = filtered.filter(
            (f) => new Date(f.created_at).getTime() <= filter.dateTo!,
          );
        }

        // Filterung nach Kommentar
        if (filter.hasComment !== undefined) {
          filtered = filtered.filter((f: any) =>
            filter.hasComment ? !!f.comment : !f.comment,
          );
        }

        // Filterung nach Suchbegriff
        if (filter.searchTerm) {
          const searchLower = filter.searchTerm.toLowerCase();
          filtered = filtered.filter(
            (f) =>
              f.user_email.toLowerCase().includes(searchLower) ||
              (f.comment && f.comment.toLowerCase().includes(searchLower)) ||
              (f.question && f.question.toLowerCase().includes(searchLower)) ||
              (f.answer && f.answer.toLowerCase().includes(searchLower)),
          );
        }

        return {
          success: true,
          data: filtered,
          message: "Feedback erfolgreich gefiltert",
        };
      } else {
        throw new Error("Keine Feedback-Daten verfügbar für Filterung");
      }
    } catch (error) {
      this.logger.error("Fehler beim Filtern des Feedbacks", error);

      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Fehler beim Filtern des Feedbacks",
        error: {
          code: "FEEDBACK_FILTER_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }
}

// Singleton-Instanz erstellen
export const adminFeedbackService = new AdminFeedbackService();

// Export for both named and default import
export type { IAdminFeedbackService };
export default adminFeedbackService;
