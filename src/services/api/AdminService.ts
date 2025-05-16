/**
 * AdminService - Spezialisierter Service für Administratorfunktionen
 *
 * Dieser Service bietet Zugriff auf Administratorfunktionen wie
 * Systemeinstellungen, Benutzerverwaltung, Feature-Toggles und mehr.
 */

import { apiService } from "./ApiService";
import { cachedApiService } from "./CachedApiService";
import { apiConfig } from "./config";
import { LogService } from "../log/LogService";
import {
  ApiResponse,
  SystemInfo,
  ApiUsageStats,
  Announcement,
  PaginationRequest,
  User,
  Feedback,
  PaginatedResponse,
} from "@/types/api";
import { authService } from "./AuthService";

/**
 * AdminService Klasse
 */
export class AdminService {
  /** Logger für Diagnose */
  private logger: LogService;

  /** Systeminfo Cache-TTL in Sekunden */
  private systemInfoCacheTTL: number = 60;

  /** Event-Handler für Admin-Ereignisse */
  private eventHandlers: Map<string, Set<Function>> = new Map();

  /**
   * Konstruktor
   */
  constructor() {
    this.logger = new LogService("AdminService");
  }

  /**
   * Prüft, ob der aktuelle Benutzer Admin-Rechte hat
   */
  public hasAdminAccess(): boolean {
    return authService.hasRole("admin");
  }

  /**
   * System-Informationen abrufen
   */
  public async getSystemInfo(): Promise<ApiResponse<SystemInfo>> {
    try {
      // Prüfen, ob Admin-Rechte vorhanden sind
      if (!this.hasAdminAccess()) {
        return {
          success: false,
          message: "Keine Berechtigung für diese Operation",
          error: {
            code: "ADMIN_ACCESS_DENIED",
            message: "Keine Berechtigung für diese Operation",
          },
        };
      }

      // Cache-Strategie: Kurzzeitiges Caching für häufig abgerufene Informationen
      const options = {
        cache: true,
        cacheTTL: this.systemInfoCacheTTL,
        refreshToken: true,
      };

      return await cachedApiService.get<SystemInfo>(
        apiConfig.ENDPOINTS.SYSTEM.INFO,
        undefined,
        options,
      );
    } catch (error) {
      this.logger.error("Fehler beim Abrufen der Systeminformationen", error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Fehler beim Abrufen der Systeminformationen",
        error: {
          code: "SYSTEM_INFO_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * API-Nutzungsstatistiken abrufen
   */
  public async getApiUsageStats(): Promise<ApiResponse<ApiUsageStats>> {
    try {
      // Prüfen, ob Admin-Rechte vorhanden sind
      if (!this.hasAdminAccess()) {
        return {
          success: false,
          message: "Keine Berechtigung für diese Operation",
          error: {
            code: "ADMIN_ACCESS_DENIED",
            message: "Keine Berechtigung für diese Operation",
          },
        };
      }

      return await apiService.get<ApiUsageStats>(
        apiConfig.ENDPOINTS.SYSTEM.STATS,
      );
    } catch (error) {
      this.logger.error(
        "Fehler beim Abrufen der API-Nutzungsstatistiken",
        error,
      );
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Fehler beim Abrufen der API-Nutzungsstatistiken",
        error: {
          code: "API_USAGE_STATS_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * System-Ankündigungen verwalten
   */
  public async getAnnouncements(): Promise<ApiResponse<Announcement[]>> {
    try {
      return await apiService.get<Announcement[]>("/admin/announcements");
    } catch (error) {
      this.logger.error("Fehler beim Abrufen der Ankündigungen", error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Fehler beim Abrufen der Ankündigungen",
        error: {
          code: "ANNOUNCEMENTS_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Ankündigung erstellen oder aktualisieren
   */
  public async saveAnnouncement(
    announcement: Announcement,
  ): Promise<ApiResponse<Announcement>> {
    try {
      // Prüfen, ob Admin-Rechte vorhanden sind
      if (!this.hasAdminAccess()) {
        return {
          success: false,
          message: "Keine Berechtigung für diese Operation",
          error: {
            code: "ADMIN_ACCESS_DENIED",
            message: "Keine Berechtigung für diese Operation",
          },
        };
      }

      // Neue Ankündigung erstellen oder bestehende aktualisieren
      if (announcement.id) {
        return await apiService.put<Announcement>(
          `/admin/announcements/${announcement.id}`,
          announcement,
        );
      } else {
        return await apiService.post<Announcement>(
          "/admin/announcements",
          announcement,
        );
      }
    } catch (error) {
      this.logger.error("Fehler beim Speichern der Ankündigung", error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Fehler beim Speichern der Ankündigung",
        error: {
          code: "ANNOUNCEMENT_SAVE_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Ankündigung löschen
   */
  public async deleteAnnouncement(id: string): Promise<ApiResponse<void>> {
    try {
      // Prüfen, ob Admin-Rechte vorhanden sind
      if (!this.hasAdminAccess()) {
        return {
          success: false,
          message: "Keine Berechtigung für diese Operation",
          error: {
            code: "ADMIN_ACCESS_DENIED",
            message: "Keine Berechtigung für diese Operation",
          },
        };
      }

      return await apiService.delete<void>(`/admin/announcements/${id}`);
    } catch (error) {
      this.logger.error(`Fehler beim Löschen der Ankündigung ${id}`, error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : `Fehler beim Löschen der Ankündigung ${id}`,
        error: {
          code: "ANNOUNCEMENT_DELETE_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Benutzerliste abrufen
   */
  public async getUsers(
    pagination?: PaginationRequest,
  ): Promise<ApiResponse<PaginatedResponse<User>>> {
    try {
      // Prüfen, ob Admin-Rechte vorhanden sind
      if (!this.hasAdminAccess()) {
        return {
          success: false,
          message: "Keine Berechtigung für diese Operation",
          error: {
            code: "ADMIN_ACCESS_DENIED",
            message: "Keine Berechtigung für diese Operation",
          },
        };
      }

      return await apiService.getPaginated<PaginatedResponse<User>>(
        "/admin/users",
        pagination || { page: 1, pageSize: 20 },
      );
    } catch (error) {
      this.logger.error("Fehler beim Abrufen der Benutzerliste", error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Fehler beim Abrufen der Benutzerliste",
        error: {
          code: "USERS_FETCH_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Benutzer erstellen
   */
  public async createUser(user: Partial<User>): Promise<ApiResponse<User>> {
    try {
      // Prüfen, ob Admin-Rechte vorhanden sind
      if (!this.hasAdminAccess()) {
        return {
          success: false,
          message: "Keine Berechtigung für diese Operation",
          error: {
            code: "ADMIN_ACCESS_DENIED",
            message: "Keine Berechtigung für diese Operation",
          },
        };
      }

      return await apiService.post<User>("/admin/users", user);
    } catch (error) {
      this.logger.error("Fehler beim Erstellen des Benutzers", error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Fehler beim Erstellen des Benutzers",
        error: {
          code: "USER_CREATE_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Benutzer aktualisieren
   */
  public async updateUser(
    userId: string,
    updates: Partial<User>,
  ): Promise<ApiResponse<User>> {
    try {
      // Prüfen, ob Admin-Rechte vorhanden sind
      if (!this.hasAdminAccess()) {
        return {
          success: false,
          message: "Keine Berechtigung für diese Operation",
          error: {
            code: "ADMIN_ACCESS_DENIED",
            message: "Keine Berechtigung für diese Operation",
          },
        };
      }

      return await apiService.put<User>(`/admin/users/${userId}`, updates);
    } catch (error) {
      this.logger.error(
        `Fehler beim Aktualisieren des Benutzers ${userId}`,
        error,
      );
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : `Fehler beim Aktualisieren des Benutzers ${userId}`,
        error: {
          code: "USER_UPDATE_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Benutzer löschen
   */
  public async deleteUser(userId: string): Promise<ApiResponse<void>> {
    try {
      // Prüfen, ob Admin-Rechte vorhanden sind
      if (!this.hasAdminAccess()) {
        return {
          success: false,
          message: "Keine Berechtigung für diese Operation",
          error: {
            code: "ADMIN_ACCESS_DENIED",
            message: "Keine Berechtigung für diese Operation",
          },
        };
      }

      return await apiService.delete<void>(`/admin/users/${userId}`);
    } catch (error) {
      this.logger.error(`Fehler beim Löschen des Benutzers ${userId}`, error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : `Fehler beim Löschen des Benutzers ${userId}`,
        error: {
          code: "USER_DELETE_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Benutzer sperren/entsperren
   */
  public async toggleUserLock(
    userId: string,
    locked: boolean,
  ): Promise<ApiResponse<User>> {
    try {
      // Prüfen, ob Admin-Rechte vorhanden sind
      if (!this.hasAdminAccess()) {
        return {
          success: false,
          message: "Keine Berechtigung für diese Operation",
          error: {
            code: "ADMIN_ACCESS_DENIED",
            message: "Keine Berechtigung für diese Operation",
          },
        };
      }

      return await apiService.post<User>(
        `/admin/users/${userId}/${locked ? "lock" : "unlock"}`,
      );
    } catch (error) {
      this.logger.error(
        `Fehler beim ${locked ? "Sperren" : "Entsperren"} des Benutzers ${userId}`,
        error,
      );
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : `Fehler beim ${locked ? "Sperren" : "Entsperren"} des Benutzers ${userId}`,
        error: {
          code: "USER_LOCK_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Feature-Flags abrufen
   */
  public async getFeatureFlags(): Promise<
    ApiResponse<Record<string, boolean>>
  > {
    try {
      return await apiService.get<Record<string, boolean>>("/admin/features");
    } catch (error) {
      this.logger.error("Fehler beim Abrufen der Feature-Flags", error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Fehler beim Abrufen der Feature-Flags",
        error: {
          code: "FEATURE_FLAGS_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Feature-Flag aktualisieren
   */
  public async updateFeatureFlag(
    featureKey: string,
    enabled: boolean,
  ): Promise<ApiResponse<void>> {
    try {
      // Prüfen, ob Admin-Rechte vorhanden sind
      if (!this.hasAdminAccess()) {
        return {
          success: false,
          message: "Keine Berechtigung für diese Operation",
          error: {
            code: "ADMIN_ACCESS_DENIED",
            message: "Keine Berechtigung für diese Operation",
          },
        };
      }

      return await apiService.put<void>(`/admin/features/${featureKey}`, {
        enabled,
      });
    } catch (error) {
      this.logger.error(
        `Fehler beim Aktualisieren des Feature-Flags ${featureKey}`,
        error,
      );
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : `Fehler beim Aktualisieren des Feature-Flags ${featureKey}`,
        error: {
          code: "FEATURE_FLAG_UPDATE_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Systemberichte abrufen (z.B. Protokolle, Fehlerberichte)
   */
  public async getSystemLogs(
    pagination?: PaginationRequest & {
      level?: "info" | "warn" | "error" | "debug";
      startDate?: string;
      endDate?: string;
    },
  ): Promise<ApiResponse<any>> {
    try {
      // Prüfen, ob Admin-Rechte vorhanden sind
      if (!this.hasAdminAccess()) {
        return {
          success: false,
          message: "Keine Berechtigung für diese Operation",
          error: {
            code: "ADMIN_ACCESS_DENIED",
            message: "Keine Berechtigung für diese Operation",
          },
        };
      }

      return await apiService.getPaginated<any>(
        "/admin/logs",
        pagination || { page: 1, pageSize: 100 },
      );
    } catch (error) {
      this.logger.error("Fehler beim Abrufen der Systemprotokolle", error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Fehler beim Abrufen der Systemprotokolle",
        error: {
          code: "SYSTEM_LOGS_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Systemeinstellungen abrufen
   */
  public async getSystemSettings(): Promise<ApiResponse<Record<string, any>>> {
    try {
      // Prüfen, ob Admin-Rechte vorhanden sind
      if (!this.hasAdminAccess()) {
        return {
          success: false,
          message: "Keine Berechtigung für diese Operation",
          error: {
            code: "ADMIN_ACCESS_DENIED",
            message: "Keine Berechtigung für diese Operation",
          },
        };
      }

      return await apiService.get<Record<string, any>>("/admin/settings");
    } catch (error) {
      this.logger.error("Fehler beim Abrufen der Systemeinstellungen", error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Fehler beim Abrufen der Systemeinstellungen",
        error: {
          code: "SYSTEM_SETTINGS_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Systemeinstellungen aktualisieren
   */
  public async updateSystemSettings(
    settings: Record<string, any>,
  ): Promise<ApiResponse<Record<string, any>>> {
    try {
      // Prüfen, ob Admin-Rechte vorhanden sind
      if (!this.hasAdminAccess()) {
        return {
          success: false,
          message: "Keine Berechtigung für diese Operation",
          error: {
            code: "ADMIN_ACCESS_DENIED",
            message: "Keine Berechtigung für diese Operation",
          },
        };
      }

      return await apiService.put<Record<string, any>>(
        "/admin/settings",
        settings,
      );
    } catch (error) {
      this.logger.error(
        "Fehler beim Aktualisieren der Systemeinstellungen",
        error,
      );
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Fehler beim Aktualisieren der Systemeinstellungen",
        error: {
          code: "SYSTEM_SETTINGS_UPDATE_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Benutzer-Feedback abrufen
   */
  public async getFeedback(
    pagination?: PaginationRequest & {
      category?: string;
      resolved?: boolean;
      startDate?: string;
      endDate?: string;
    },
  ): Promise<ApiResponse<PaginatedResponse<Feedback>>> {
    try {
      // Prüfen, ob Admin-Rechte vorhanden sind
      if (!this.hasAdminAccess()) {
        return {
          success: false,
          message: "Keine Berechtigung für diese Operation",
          error: {
            code: "ADMIN_ACCESS_DENIED",
            message: "Keine Berechtigung für diese Operation",
          },
        };
      }

      return await apiService.getPaginated<PaginatedResponse<Feedback>>(
        "/admin/feedback",
        pagination || { page: 1, pageSize: 20 },
      );
    } catch (error) {
      this.logger.error("Fehler beim Abrufen des Feedbacks", error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Fehler beim Abrufen des Feedbacks",
        error: {
          code: "FEEDBACK_FETCH_ERROR",
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
    feedbackId: string,
    resolved: boolean,
  ): Promise<ApiResponse<Feedback>> {
    try {
      // Prüfen, ob Admin-Rechte vorhanden sind
      if (!this.hasAdminAccess()) {
        return {
          success: false,
          message: "Keine Berechtigung für diese Operation",
          error: {
            code: "ADMIN_ACCESS_DENIED",
            message: "Keine Berechtigung für diese Operation",
          },
        };
      }

      return await apiService.patch<Feedback>(`/admin/feedback/${feedbackId}`, {
        resolved,
      });
    } catch (error) {
      this.logger.error(
        `Fehler beim Aktualisieren des Feedback-Status ${feedbackId}`,
        error,
      );
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : `Fehler beim Aktualisieren des Feedback-Status ${feedbackId}`,
        error: {
          code: "FEEDBACK_UPDATE_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Cache-Invalidierung auslösen
   */
  public async invalidateCache(cacheKey?: string): Promise<ApiResponse<void>> {
    try {
      // Prüfen, ob Admin-Rechte vorhanden sind
      if (!this.hasAdminAccess()) {
        return {
          success: false,
          message: "Keine Berechtigung für diese Operation",
          error: {
            code: "ADMIN_ACCESS_DENIED",
            message: "Keine Berechtigung für diese Operation",
          },
        };
      }

      // Bestimmten Cache-Schlüssel invalidieren oder vollständig leeren
      if (cacheKey) {
        return await apiService.delete<void>(`/admin/cache/${cacheKey}`);
      } else {
        return await apiService.delete<void>("/admin/cache");
      }
    } catch (error) {
      this.logger.error("Fehler bei der Cache-Invalidierung", error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Fehler bei der Cache-Invalidierung",
        error: {
          code: "CACHE_INVALIDATION_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Feedback-Statistiken abrufen
   */
  public async getFeedbackStats(): Promise<any> {
    try {
      // Prüfen, ob Admin-Rechte vorhanden sind
      if (!this.hasAdminAccess()) {
        throw new Error("Keine Berechtigung für diese Operation");
      }

      const response = await apiService.get('/admin/feedback/stats');
      if (response.success && response.data) {
        return response.data.stats;
      }
      throw new Error(response.message || 'Fehler beim Abrufen der Feedback-Statistiken');
    } catch (error) {
      this.logger.error("Fehler beim Abrufen der Feedback-Statistiken", error);
      throw error;
    }
  }

  /**
   * Negative Feedback-Einträge abrufen
   */
  public async getNegativeFeedback(limit: number = 100): Promise<any[]> {
    try {
      // Prüfen, ob Admin-Rechte vorhanden sind
      if (!this.hasAdminAccess()) {
        throw new Error("Keine Berechtigung für diese Operation");
      }

      const response = await apiService.get(`/admin/feedback/negative?limit=${limit}`);
      if (response.success && response.data) {
        return response.data.feedback || [];
      }
      throw new Error(response.message || 'Fehler beim Abrufen des negativen Feedbacks');
    } catch (error) {
      this.logger.error("Fehler beim Abrufen des negativen Feedbacks", error);
      throw error;
    }
  }

  /**
   * Registriert einen Event-Handler
   */
  public on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }

    this.eventHandlers.get(event)?.add(handler);
  }

  /**
   * Entfernt einen Event-Handler
   */
  public off(event: string, handler: Function): void {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event)?.delete(handler);
    }
  }

  /**
   * Löst ein Event aus
   */
  private emitEvent(event: string, data?: any): void {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event)?.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          this.logger.error(`Fehler im Event-Handler für '${event}'`, error);
        }
      });
    }
  }
}

// Singleton-Instanz erstellen
export const adminService = new AdminService();

export default adminService;
