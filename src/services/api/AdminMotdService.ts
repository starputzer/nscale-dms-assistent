/**
 * AdminMotdService - Spezialisierter Service für die MOTD-Verwaltung im Admin-Bereich
 *
 * Verwaltet die API-Kommunikation für die Message of the Day (MOTD) Einstellungen
 * und bietet eine konsistente Fehlerbehandlung und Fallback-Mechanismen.
 */

import { apiService } from "./ApiService";
import { cachedApiService } from "./CachedApiService";
import { apiConfig } from "./config";
import { adminApi } from "./admin";
import { adminMockService } from "./adminMockService";
import { LogService } from "../log/LogService";
import { ApiResponse } from "@/types/api";
import { MotdConfig } from "@/types/admin";
import { shouldUseRealApi } from "@/config/api-flags";

export interface IAdminMotdService {
  getMotdConfig(): Promise<ApiResponse<MotdConfig>>;
  updateMotdConfig(config: MotdConfig): Promise<ApiResponse<void>>;
  reloadMotd(): Promise<ApiResponse<void>>;
}

/**
 * AdminMotdService Klasse für die Verwaltung von MOTD-Funktionen
 */
export class AdminMotdService implements IAdminMotdService {
  /** Logger für Diagnose */
  private logger: LogService;

  /** Cache-TTL in Sekunden */
  private cacheTTL: number = 300; // 5 Minuten

  /**
   * Konstruktor
   */
  constructor() {
    this.logger = new LogService("AdminMotdService");
  }

  /**
   * MOTD-Konfiguration abrufen
   */
  public async getMotdConfig(): Promise<ApiResponse<MotdConfig>> {
    try {
      // Prüfen, ob die echte API verwendet werden soll
      if (shouldUseRealApi("useRealMotdApi")) {
        this.logger.info("Verwende echte API für MOTD-Konfiguration");

        // Cache-Strategie: Kurzzeitiges Caching für häufig abgerufene Konfigurationen
        const options = {
          cache: true,
          cacheTTL: this.cacheTTL,
          refreshToken: true,
        };

        const response = await cachedApiService.get<MotdConfig>(
          apiConfig.ENDPOINTS.MOTD.CONFIG || "/api/motd",
          undefined,
          options,
        );

        if (response.success) {
          return response;
        } else {
          throw new Error(
            response.message || "Fehler beim Abrufen der MOTD-Konfiguration",
          );
        }
      }

      // Fallback zu adminApi mit Mock-Daten
      this.logger.info(
        "Verwende Mock-Daten über adminApi für MOTD-Konfiguration",
      );
      const response = await adminApi.getMotd();

      // Sicherstellen, dass wir gültige Daten haben, selbst wenn die Response unvollständig ist
      const mockData = await adminMockService.getMockResponse("/api/motd");
      const data = response?.data?.config || response?.data || mockData;

      return {
        success: true,
        data: data,
        message: "MOTD-Konfiguration erfolgreich abgerufen",
        _isMockData: response?._isMockData || false,
      };
    } catch (error) {
      this.logger.error("Fehler beim Abrufen der MOTD-Konfiguration", error);

      // Fallback: Bei echten API-Fehlern trotzdem sinnvolle Daten liefern
      try {
        const mockData = await adminMockService.getMockResponse("/api/motd");

        this.logger.info(
          "Fallback zu Mock-Daten nach API-Fehler für MOTD-Konfiguration",
        );

        return {
          success: true, // Wir geben Erfolg zurück, um die UI nicht zu stören
          data: mockData,
          message: "MOTD-Konfiguration (Fallback-Daten) abgerufen",
          _isMockData: true,
          _hadError: true,
          error: {
            code: "MOTD_CONFIG_ERROR",
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

        // In diesem Format zurückgeben, um mit dem Store konform zu sein
        return {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Fehler beim Abrufen der MOTD-Konfiguration",
          error: {
            code: "MOTD_CONFIG_ERROR",
            message:
              error instanceof Error ? error.message : "Unbekannter Fehler",
          },
        };
      }
    }
  }

  /**
   * MOTD-Konfiguration aktualisieren
   */
  public async updateMotdConfig(
    config: MotdConfig,
  ): Promise<ApiResponse<void>> {
    try {
      // Prüfen, ob die echte API verwendet werden soll
      if (shouldUseRealApi("useRealMotdApi")) {
        this.logger.info("Verwende echte API für MOTD-Konfiguration-Update");

        const response = await apiService.put<void>(
          apiConfig.ENDPOINTS.MOTD.UPDATE || "/admin/motd/update",
          config,
        );

        if (response.success) {
          // Cache invalidieren, damit die neue Konfiguration abgerufen wird
          cachedApiService.invalidate(
            apiConfig.ENDPOINTS.MOTD.CONFIG || "/api/motd",
          );
          return response;
        } else {
          throw new Error(
            response.message ||
              "Fehler beim Aktualisieren der MOTD-Konfiguration",
          );
        }
      }

      // Fallback zu adminApi mit Mock-Daten
      this.logger.info(
        "Verwende Mock-Daten über adminApi für MOTD-Konfiguration-Update",
      );
      const response = await adminApi.updateMotd(config);

      return {
        success: true,
        data: response?.data,
        message: "MOTD-Konfiguration erfolgreich aktualisiert",
      };
    } catch (error) {
      this.logger.error(
        "Fehler beim Aktualisieren der MOTD-Konfiguration",
        error,
      );

      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Fehler beim Aktualisieren der MOTD-Konfiguration",
        error: {
          code: "MOTD_UPDATE_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * MOTD neu laden
   */
  public async reloadMotd(): Promise<ApiResponse<void>> {
    try {
      // Prüfen, ob die echte API verwendet werden soll
      if (shouldUseRealApi("useRealMotdApi")) {
        this.logger.info("Verwende echte API für MOTD neu laden");

        const response = await apiService.post<void>(
          apiConfig.ENDPOINTS.MOTD.RELOAD || "/admin/motd/reload",
        );

        if (response.success) {
          // Cache invalidieren, damit die neue Konfiguration abgerufen wird
          cachedApiService.invalidate(
            apiConfig.ENDPOINTS.MOTD.CONFIG || "/api/motd",
          );
          return response;
        } else {
          throw new Error(response.message || "Fehler beim Neuladen der MOTD");
        }
      }

      // Fallback zu adminApi mit Mock-Daten
      this.logger.info("Verwende Mock-Daten über adminApi für MOTD neu laden");
      const response = await adminApi.reloadMotd();

      return {
        success: true,
        data: response?.data,
        message: "MOTD erfolgreich neu geladen",
      };
    } catch (error) {
      this.logger.error("Fehler beim Neuladen der MOTD", error);

      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Fehler beim Neuladen der MOTD",
        error: {
          code: "MOTD_RELOAD_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }
}

// Singleton-Instanz erstellen
export const adminMotdService = new AdminMotdService();

// Export for both named and default import
export type { IAdminMotdService };
export default adminMotdService;
