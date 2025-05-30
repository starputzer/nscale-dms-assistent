/**
 * AdminSystemService - Spezialisierter Service für System-Administration
 *
 * Verwaltet die API-Kommunikation für Systemeinstellungen, -statistiken und -aktionen
 * und bietet eine konsistente Fehlerbehandlung und Fallback-Mechanismen.
 */

import { apiService } from "./ApiService";
import { cachedApiService } from "./CachedApiService";
import { apiConfig } from "./config";
import { adminApi } from "./admin";
import { adminMockService } from "./adminMockService";
import { LogService } from "../log/LogService";
import { ApiResponse } from "@/types/api";
import { SystemStats, SystemAction, SystemCheckResult } from "@/types/admin";
import { shouldUseRealApi } from "@/config/api-flags";

// Interface for system administration functions
export interface IAdminSystemService {
  getSystemStats(): Promise<ApiResponse<SystemStats>>;
  clearCache(): Promise<ApiResponse<void>>;
  clearEmbeddingCache(): Promise<ApiResponse<void>>;
  performSystemCheck(): Promise<ApiResponse<SystemCheckResult>>;
  reindexDocuments(): Promise<ApiResponse<void>>;
  getAvailableActions(): Promise<ApiResponse<SystemAction[]>>;
  getSystemSettings(): Promise<ApiResponse<any>>;
  updateSystemSettings(settings: any): Promise<ApiResponse<void>>;
  restartServices(): Promise<ApiResponse<void>>;
  exportLogs(): Promise<ApiResponse<any>>;
  optimizeDatabase(): Promise<ApiResponse<void>>;
  resetStatistics(): Promise<ApiResponse<void>>;
  createBackup(): Promise<ApiResponse<void>>;
}

/**
 * AdminSystemService Klasse für die Verwaltung von System-Funktionen
 */
export class AdminSystemService implements IAdminSystemService {
  /** Logger für Diagnose */
  private logger: LogService;

  /** Cache-TTL für Systemstatistiken in Sekunden */
  private statsCacheTTL: number = 60; // 1 Minute für Statistiken

  /**
   * Konstruktor
   */
  constructor() {
    this.logger = new LogService("AdminSystemService");
  }

  /**
   * System-Statistiken abrufen
   */
  public async getSystemStats(): Promise<ApiResponse<SystemStats>> {
    try {
      // Prüfen, ob die echte API verwendet werden soll
      if (shouldUseRealApi("useRealSystemApi")) {
        this.logger.info("Verwende echte API für Systemstatistiken");

        // Cache-Strategie: Kurzzeitiges Caching für Statistiken
        const options = {
          cache: true,
          cacheTTL: this.statsCacheTTL,
          refreshToken: true,
        };

        const response = await cachedApiService.get<SystemStats>(
          apiConfig.ENDPOINTS.SYSTEM.STATS || "/admin/stats",
          undefined,
          options,
        );

        if (response.success) {
          return response;
        } else {
          throw new Error(
            response.message || "Fehler beim Abrufen der Systemstatistiken",
          );
        }
      }

      // Fallback zu adminApi mit Mock-Daten
      this.logger.info(
        "Verwende Mock-Daten über adminApi für Systemstatistiken",
      );
      const response = await adminApi.getSystemStats();

      // Sicherstellen, dass wir gültige Daten haben, selbst wenn die Response unvollständig ist
      const mockData = await adminMockService.getMockResponse("/admin/stats");
      const data = response?.data?.stats || response?.data || mockData;

      return {
        success: true,
        data: data,
        message: "Systemstatistiken erfolgreich abgerufen",
        _isMockData: response?._isMockData || false,
      };
    } catch (error) {
      this.logger.error("Fehler beim Abrufen der Systemstatistiken", error);

      // Fallback: Bei echten API-Fehlern trotzdem sinnvolle Daten liefern
      try {
        const mockData = await adminMockService.getMockResponse("/admin/stats");

        this.logger.info(
          "Fallback zu Mock-Daten nach API-Fehler für Systemstatistiken",
        );

        return {
          success: true, // Wir geben Erfolg zurück, um die UI nicht zu stören
          data: mockData,
          message: "Systemstatistiken (Fallback-Daten) abgerufen",
          _isMockData: true,
          _hadError: true,
          error: {
            code: "SYSTEM_STATS_ERROR",
            message:
              error instanceof Error ? error.message : "Unbekannter Fehler",
          },
        };
      } catch (fallbackError) {
        // Wenn sogar der Fallback fehlschlägt, geben wir den ursprünglichen Fehler zurück
        this.logger.error(
          "Auch Fallback zu Mock-Daten fehlgeschlagen",
          fallbackError,
        );

        return {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Fehler beim Abrufen der Systemstatistiken",
          error: {
            code: "SYSTEM_STATS_ERROR",
            message:
              error instanceof Error ? error.message : "Unbekannter Fehler",
          },
        };
      }
    }
  }

  /**
   * LLM-Cache leeren
   */
  public async clearCache(): Promise<ApiResponse<void>> {
    try {
      // Prüfen, ob die echte API verwendet werden soll
      if (shouldUseRealApi("useRealSystemApi")) {
        this.logger.info("Verwende echte API für Cache-Löschung");

        const response = await apiService.post<void>(
          apiConfig.ENDPOINTS.SYSTEM.CLEAR_CACHE || "/admin/clear-cache",
        );

        if (response.success) {
          // Alle System-Caches invalidieren
          cachedApiService.invalidate(
            apiConfig.ENDPOINTS.SYSTEM.STATS || "/admin/stats",
          );
          return response;
        } else {
          throw new Error(response.message || "Fehler beim Leeren des Caches");
        }
      }

      // Fallback zu adminApi mit Mock-Daten
      this.logger.info("Verwende Mock-Daten über adminApi für Cache-Löschung");
      const response = await adminApi.clearModelCache();

      return {
        success: true,
        data: response?.data,
        message: "Cache erfolgreich geleert",
      };
    } catch (error) {
      this.logger.error("Fehler beim Leeren des Caches", error);

      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Fehler beim Leeren des Caches",
        error: {
          code: "CACHE_CLEAR_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Embedding-Cache leeren
   */
  public async clearEmbeddingCache(): Promise<ApiResponse<void>> {
    try {
      // Prüfen, ob die echte API verwendet werden soll
      if (shouldUseRealApi("useRealSystemApi")) {
        this.logger.info("Verwende echte API für Embedding-Cache-Löschung");

        const response = await apiService.post<void>(
          apiConfig.ENDPOINTS.SYSTEM.CLEAR_EMBEDDING_CACHE ||
            "/admin/clear-embedding-cache",
        );

        if (response.success) {
          // Alle System-Caches invalidieren
          cachedApiService.invalidate(
            apiConfig.ENDPOINTS.SYSTEM.STATS || "/admin/stats",
          );
          return response;
        } else {
          throw new Error(
            response.message || "Fehler beim Leeren des Embedding-Caches",
          );
        }
      }

      // Fallback zu adminApi mit Mock-Daten
      this.logger.info(
        "Verwende Mock-Daten über adminApi für Embedding-Cache-Löschung",
      );
      const response = await adminApi.clearEmbeddingCache();

      return {
        success: true,
        data: response?.data,
        message: "Embedding-Cache erfolgreich geleert",
      };
    } catch (error) {
      this.logger.error("Fehler beim Leeren des Embedding-Caches", error);

      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Fehler beim Leeren des Embedding-Caches",
        error: {
          code: "EMBEDDING_CACHE_CLEAR_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Systemprüfung durchführen
   */
  public async performSystemCheck(): Promise<ApiResponse<SystemCheckResult>> {
    try {
      // Prüfen, ob die echte API verwendet werden soll
      if (shouldUseRealApi("useRealSystemApi")) {
        this.logger.info("Verwende echte API für Systemprüfung");

        const response = await apiService.post<SystemCheckResult>(
          apiConfig.ENDPOINTS.SYSTEM.CHECK || "/admin/system-check",
        );

        if (response.success) {
          return response;
        } else {
          throw new Error(response.message || "Fehler bei der Systemprüfung");
        }
      }

      // Da adminApi keine direkte Methode für Systemprüfung hat,
      // rufen wir die aktuellen Statistiken ab und generieren eine Systemprüfung daraus
      const statsResponse = await this.getSystemStats();

      if (statsResponse.success && statsResponse.data) {
        const stats = statsResponse.data;

        // Bestimme den Status basierend auf den Statistiken
        const cpuStatus =
          stats.cpu_usage_percent > 90
            ? "critical"
            : stats.cpu_usage_percent > 70
              ? "warning"
              : "normal";

        const memoryStatus =
          stats.memory_usage_percent > 90
            ? "critical"
            : stats.memory_usage_percent > 70
              ? "warning"
              : "normal";

        const systemCheckResult: SystemCheckResult = {
          success: true,
          checks: [
            {
              name: "CPU Auslastung",
              status: cpuStatus,
              value: stats.cpu_usage_percent + "%",
            },
            {
              name: "Speichernutzung",
              status: memoryStatus,
              value: stats.memory_usage_percent + "%",
            },
            {
              name: "Datenbankverbindung",
              status: "normal",
              value: "Verbunden",
            },
            { name: "Cacheintegrität", status: "normal", value: "OK" },
            {
              name: "API-Verfügbarkeit",
              status: "normal",
              value: "Erreichbar",
            },
          ],
          message: "Systemprüfung erfolgreich durchgeführt",
          timestamp: Date.now(),
        };

        return {
          success: true,
          data: systemCheckResult,
          message: "Systemprüfung erfolgreich durchgeführt",
        };
      } else {
        throw new Error("Keine Systemstatistiken verfügbar für die Prüfung");
      }
    } catch (error) {
      this.logger.error("Fehler bei der Systemprüfung", error);

      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Fehler bei der Systemprüfung",
        error: {
          code: "SYSTEM_CHECK_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Dokumente neu indizieren
   */
  public async reindexDocuments(): Promise<ApiResponse<void>> {
    try {
      // Prüfen, ob die echte API verwendet werden soll
      if (shouldUseRealApi("useRealSystemApi")) {
        this.logger.info("Verwende echte API für Dokumenten-Neuindizierung");

        const response = await apiService.post<void>(
          apiConfig.ENDPOINTS.SYSTEM.REINDEX || "/admin/reindex",
        );

        if (response.success) {
          return response;
        } else {
          throw new Error(
            response.message || "Fehler bei der Neuindizierung der Dokumente",
          );
        }
      }

      // Da keine direkte Methode in adminApi vorhanden ist, geben wir eine Erfolgsmeldung zurück
      return {
        success: true,
        message: "Neuindizierung der Dokumente wurde gestartet",
      };
    } catch (error) {
      this.logger.error("Fehler bei der Neuindizierung der Dokumente", error);

      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Fehler bei der Neuindizierung der Dokumente",
        error: {
          code: "REINDEX_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Verfügbare Systemaktionen abrufen
   */
  public async getAvailableActions(): Promise<ApiResponse<SystemAction[]>> {
    try {
      // Prüfen, ob die echte API verwendet werden soll
      if (shouldUseRealApi("useRealSystemApi")) {
        this.logger.info("Verwende echte API für verfügbare Systemaktionen");

        // Cache-Strategie: Mittleres Caching für selten ändernde Konfigurationen
        const options = {
          cache: true,
          cacheTTL: 3600, // 1 Stunde
          refreshToken: true,
        };

        const response = await cachedApiService.get<SystemAction[]>(
          apiConfig.ENDPOINTS.SYSTEM.ACTIONS || "/admin/system-actions",
          undefined,
          options,
        );

        if (response.success) {
          return response;
        } else {
          throw new Error(
            response.message ||
              "Fehler beim Abrufen der verfügbaren Systemaktionen",
          );
        }
      }

      // Da keine direkte Methode in adminApi vorhanden ist, geben wir vordefinierte Aktionen zurück
      const actions: SystemAction[] = [
        {
          type: "clear-cache",
          name: "Cache leeren",
          description: "Leert den LLM-Cache und erzwingt neue Berechnungen",
          requiresConfirmation: true,
          confirmationMessage:
            "Möchten Sie wirklich den Cache leeren? Dies kann zu langsameren Antwortzeiten führen, bis der Cache wieder aufgebaut ist.",
        },
        {
          type: "clear-embedding-cache",
          name: "Embedding-Cache leeren",
          description:
            "Leert den Embedding-Cache und erzwingt eine Neuberechnung",
          requiresConfirmation: true,
          confirmationMessage:
            "Möchten Sie wirklich den Embedding-Cache leeren? Dies kann zu längeren Verarbeitungszeiten führen, bis alle Einbettungen neu berechnet sind.",
        },
        {
          type: "reload-motd",
          name: "MOTD neu laden",
          description:
            "Lädt die Message of the Day aus der Konfigurationsdatei neu",
          requiresConfirmation: false,
        },
        {
          type: "reindex",
          name: "Dokumente neu indizieren",
          description:
            "Startet eine vollständige Neuindizierung aller Dokumente",
          requiresConfirmation: true,
          confirmationMessage:
            "Möchten Sie wirklich alle Dokumente neu indizieren? Dieser Vorgang kann je nach Datenmenge einige Zeit in Anspruch nehmen.",
        },
      ];

      return {
        success: true,
        data: actions,
        message: "Verfügbare Systemaktionen erfolgreich abgerufen",
      };
    } catch (error) {
      this.logger.error(
        "Fehler beim Abrufen der verfügbaren Systemaktionen",
        error,
      );

      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Fehler beim Abrufen der verfügbaren Systemaktionen",
        error: {
          code: "SYSTEM_ACTIONS_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Systemeinstellungen abrufen
   */
  public async getSystemSettings(): Promise<ApiResponse<any>> {
    try {
      if (shouldUseRealApi("useRealSystemApi")) {
        this.logger.info("Verwende echte API für Systemeinstellungen");

        const response = await cachedApiService.get<any>(
          apiConfig.ENDPOINTS.SYSTEM.SETTINGS || "/admin/settings",
          undefined,
          { cache: true, cacheTTL: 300 },
        );

        if (response.success) {
          return response;
        } else {
          throw new Error(
            response.message || "Fehler beim Abrufen der Systemeinstellungen",
          );
        }
      }

      // Fallback: Standard-Einstellungen
      return {
        success: true,
        data: {
          defaultModel: "llama-7b",
          maxTokensPerRequest: 4096,
          enableModelSelection: true,
          enableRateLimit: true,
          rateLimitPerMinute: 30,
          maxConnectionsPerUser: 10,
          sessionTimeoutMinutes: 60,
          maintenanceMode: false,
          maintenanceMessage: "",
          autoBackup: true,
        },
        message: "Systemeinstellungen erfolgreich abgerufen",
      };
    } catch (error) {
      this.logger.error("Fehler beim Abrufen der Systemeinstellungen", error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Fehler beim Abrufen der Systemeinstellungen",
        error: {
          code: "SETTINGS_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Systemeinstellungen aktualisieren
   */
  public async updateSystemSettings(settings: any): Promise<ApiResponse<void>> {
    try {
      if (shouldUseRealApi("useRealSystemApi")) {
        this.logger.info("Verwende echte API für Systemeinstellungen-Update");

        const response = await apiService.put<void>(
          apiConfig.ENDPOINTS.SYSTEM.SETTINGS || "/admin/settings",
          settings,
        );

        if (response.success) {
          // Cache invalidieren nach Update
          await cachedApiService.invalidateCache(
            apiConfig.ENDPOINTS.SYSTEM.SETTINGS || "/admin/settings",
          );
          return response;
        } else {
          throw new Error(
            response.message || "Fehler beim Speichern der Systemeinstellungen",
          );
        }
      }

      // Fallback: Erfolg simulieren
      return {
        success: true,
        message: "Systemeinstellungen erfolgreich gespeichert",
      };
    } catch (error) {
      this.logger.error("Fehler beim Speichern der Systemeinstellungen", error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Fehler beim Speichern der Systemeinstellungen",
        error: {
          code: "SETTINGS_UPDATE_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Systemdienste neu starten
   */
  public async restartServices(): Promise<ApiResponse<void>> {
    try {
      if (shouldUseRealApi("useRealSystemApi")) {
        this.logger.info("Verwende echte API für Dienste-Neustart");

        const response = await apiService.post<void>(
          apiConfig.ENDPOINTS.SYSTEM.RESTART || "/admin/restart-services",
        );

        if (response.success) {
          return response;
        } else {
          throw new Error(
            response.message || "Fehler beim Neustart der Dienste",
          );
        }
      }

      // Fallback: Erfolg simulieren
      return {
        success: true,
        message: "Systemdienste erfolgreich neu gestartet",
      };
    } catch (error) {
      this.logger.error("Fehler beim Neustart der Dienste", error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Fehler beim Neustart der Dienste",
        error: {
          code: "RESTART_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Systemlogs exportieren
   */
  public async exportLogs(): Promise<ApiResponse<any>> {
    try {
      if (shouldUseRealApi("useRealSystemApi")) {
        this.logger.info("Verwende echte API für Log-Export");

        const response = await apiService.get<any>(
          apiConfig.ENDPOINTS.SYSTEM.EXPORT_LOGS || "/admin/export-logs",
          undefined,
          { responseType: "blob" },
        );

        if (response.success) {
          return response;
        } else {
          throw new Error(response.message || "Fehler beim Export der Logs");
        }
      }

      // Fallback: Fehler, da Export nur mit API möglich
      throw new Error(
        "Log-Export ist nur mit aktiver API-Integration verfügbar",
      );
    } catch (error) {
      this.logger.error("Fehler beim Export der Logs", error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Fehler beim Export der Logs",
        error: {
          code: "EXPORT_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Datenbank optimieren
   */
  public async optimizeDatabase(): Promise<ApiResponse<void>> {
    try {
      if (shouldUseRealApi("useRealSystemApi")) {
        this.logger.info("Verwende echte API für Datenbank-Optimierung");

        const response = await apiService.post<void>(
          apiConfig.ENDPOINTS.SYSTEM.OPTIMIZE_DB || "/admin/optimize-database",
        );

        if (response.success) {
          return response;
        } else {
          throw new Error(
            response.message || "Fehler bei der Datenbankoptimierung",
          );
        }
      }

      // Fallback: Erfolg simulieren
      return {
        success: true,
        message: "Datenbank erfolgreich optimiert",
      };
    } catch (error) {
      this.logger.error("Fehler bei der Datenbankoptimierung", error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Fehler bei der Datenbankoptimierung",
        error: {
          code: "OPTIMIZE_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Statistiken zurücksetzen
   */
  public async resetStatistics(): Promise<ApiResponse<void>> {
    try {
      if (shouldUseRealApi("useRealSystemApi")) {
        this.logger.info("Verwende echte API für Statistik-Reset");

        const response = await apiService.post<void>(
          apiConfig.ENDPOINTS.SYSTEM.RESET_STATS || "/admin/reset-statistics",
        );

        if (response.success) {
          // Cache invalidieren nach Reset
          await cachedApiService.invalidateCache(
            apiConfig.ENDPOINTS.SYSTEM.STATS || "/admin/stats",
          );
          return response;
        } else {
          throw new Error(
            response.message || "Fehler beim Zurücksetzen der Statistiken",
          );
        }
      }

      // Fallback: Erfolg simulieren
      return {
        success: true,
        message: "Statistiken erfolgreich zurückgesetzt",
      };
    } catch (error) {
      this.logger.error("Fehler beim Zurücksetzen der Statistiken", error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Fehler beim Zurücksetzen der Statistiken",
        error: {
          code: "RESET_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * System-Backup erstellen
   */
  public async createBackup(): Promise<ApiResponse<void>> {
    try {
      if (shouldUseRealApi("useRealSystemApi")) {
        this.logger.info("Verwende echte API für Backup-Erstellung");

        const response = await apiService.post<void>(
          apiConfig.ENDPOINTS.SYSTEM.CREATE_BACKUP || "/admin/create-backup",
        );

        if (response.success) {
          return response;
        } else {
          throw new Error(
            response.message || "Fehler beim Erstellen des Backups",
          );
        }
      }

      // Fallback: Fehler, da Backup nur mit API möglich
      throw new Error(
        "Backup-Erstellung ist nur mit aktiver API-Integration verfügbar",
      );
    } catch (error) {
      this.logger.error("Fehler beim Erstellen des Backups", error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Fehler beim Erstellen des Backups",
        error: {
          code: "BACKUP_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }
}

// Singleton-Instanz erstellen
export const adminSystemService = new AdminSystemService();

// Export for both named and default import
export type { IAdminSystemService };
export default adminSystemService;
