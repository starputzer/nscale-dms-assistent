/**
 * AdminFeatureTogglesService - Spezialisierter Service für die Feature-Toggles-Verwaltung
 *
 * Verwaltet die API-Kommunikation für Feature-Toggles und bietet eine
 * konsistente Fehlerbehandlung und Fallback-Mechanismen.
 */

import { apiService } from "./ApiService";
import { cachedApiService } from "./CachedApiService";
import { apiConfig } from "./config";
import { adminApi } from "./admin";
import { LogService } from "../log/LogService";
import { ApiResponse } from "@/types/api";
import { FeatureToggle, FeatureToggleStats } from "@/types/featureToggles";
import { shouldUseRealApi } from "@/config/api-flags";

export interface IAdminFeatureTogglesService {
  getFeatureToggles(): Promise<ApiResponse<FeatureToggle[]>>;
  getFeatureToggleStats(): Promise<ApiResponse<FeatureToggleStats>>;
  updateFeatureToggle(
    id: string,
    enabled: boolean,
    description?: string,
  ): Promise<ApiResponse<FeatureToggle>>;
  createFeatureToggle(
    data: Partial<FeatureToggle>,
  ): Promise<ApiResponse<FeatureToggle>>;
  deleteFeatureToggle(id: string): Promise<ApiResponse<void>>;
}

/**
 * AdminFeatureTogglesService Klasse für die Verwaltung von Feature-Toggles
 */
export class AdminFeatureTogglesService implements IAdminFeatureTogglesService {
  /** Logger für Diagnose */
  private logger: LogService;

  /** Cache-TTL in Sekunden */
  private cacheTTL: number = 300; // 5 Minuten

  /**
   * Konstruktor
   */
  constructor() {
    this.logger = new LogService("AdminFeatureTogglesService");
  }

  /**
   * Feature-Toggles abrufen
   */
  public async getFeatureToggles(): Promise<ApiResponse<FeatureToggle[]>> {
    try {
      // Prüfen, ob die echte API verwendet werden soll
      if (shouldUseRealApi("useRealFeatureTogglesApi")) {
        this.logger.info("Verwende echte API für Feature-Toggles");

        // Cache-Strategie: Kurzzeitiges Caching für häufig abgerufene Listen
        const options = {
          cache: true,
          cacheTTL: this.cacheTTL,
          refreshToken: true,
        };

        const response = await cachedApiService.get<FeatureToggle[]>(
          apiConfig.ENDPOINTS.FEATURE_TOGGLES.LIST || "/admin/feature-toggles",
          undefined,
          options,
        );

        if (response.success) {
          return response;
        } else {
          throw new Error(
            response.message || "Fehler beim Abrufen der Feature-Toggles",
          );
        }
      }

      // Fallback zu adminApi mit Mock-Daten
      this.logger.info("Verwende Mock-Daten über adminApi für Feature-Toggles");
      const response = await adminApi.getFeatureToggles();

      return {
        success: true,
        data: response?.data?.toggles || response?.data,
        message: "Feature-Toggles erfolgreich abgerufen",
      };
    } catch (error) {
      this.logger.error("Fehler beim Abrufen der Feature-Toggles", error);

      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Fehler beim Abrufen der Feature-Toggles",
        error: {
          code: "FEATURE_TOGGLES_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Feature-Toggle-Statistiken abrufen
   */
  public async getFeatureToggleStats(): Promise<
    ApiResponse<FeatureToggleStats>
  > {
    try {
      // Prüfen, ob die echte API verwendet werden soll
      if (shouldUseRealApi("useRealFeatureTogglesApi")) {
        this.logger.info("Verwende echte API für Feature-Toggle-Statistiken");

        // Cache-Strategie: Kurzzeitiges Caching für Statistiken
        const options = {
          cache: true,
          cacheTTL: this.cacheTTL,
          refreshToken: true,
        };

        const response = await cachedApiService.get<FeatureToggleStats>(
          apiConfig.ENDPOINTS.FEATURE_TOGGLES.STATS ||
            "/admin/feature-toggles/stats",
          undefined,
          options,
        );

        if (response.success) {
          return response;
        } else {
          throw new Error(
            response.message ||
              "Fehler beim Abrufen der Feature-Toggle-Statistiken",
          );
        }
      }

      // Da adminApi keine direkte Methode für Feature-Toggle-Statistiken hat,
      // holen wir die Toggles und berechnen Statistiken daraus
      const togglesResponse = await this.getFeatureToggles();

      if (togglesResponse.success && Array.isArray(togglesResponse.data)) {
        const toggles = togglesResponse.data;

        const stats: FeatureToggleStats = {
          total: toggles.length,
          enabled: toggles.filter((t) => t.enabled).length,
          enabledPercent: Math.round(
            (toggles.filter((t) => t.enabled).length / toggles.length) * 100,
          ),
          categories: {
            UI: toggles.filter((t) => t.category === "UI").length,
            API: toggles.filter((t) => t.category === "API").length,
            Feature: toggles.filter((t) => t.category === "Feature").length,
            System: toggles.filter((t) => t.category === "System").length,
            Other: toggles.filter(
              (t) =>
                !t.category ||
                !["UI", "API", "Feature", "System"].includes(t.category),
            ).length,
          },
          history: [
            {
              date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split("T")[0],
              enabled: Math.floor(toggles.length * 0.7),
            },
            {
              date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split("T")[0],
              enabled: Math.floor(toggles.length * 0.7),
            },
            {
              date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split("T")[0],
              enabled: Math.floor(toggles.length * 0.73),
            },
            {
              date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split("T")[0],
              enabled: Math.floor(toggles.length * 0.75),
            },
            {
              date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split("T")[0],
              enabled: Math.floor(toggles.length * 0.78),
            },
            {
              date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split("T")[0],
              enabled: Math.floor(toggles.length * 0.8),
            },
            {
              date: new Date().toISOString().split("T")[0],
              enabled: toggles.filter((t) => t.enabled).length,
            },
          ],
        };

        return {
          success: true,
          data: stats,
          message: "Feature-Toggle-Statistiken erfolgreich erstellt",
        };
      } else {
        throw new Error(
          "Keine Feature-Toggle-Daten verfügbar für Statistikberechnung",
        );
      }
    } catch (error) {
      this.logger.error(
        "Fehler beim Abrufen der Feature-Toggle-Statistiken",
        error,
      );

      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Fehler beim Abrufen der Feature-Toggle-Statistiken",
        error: {
          code: "FEATURE_TOGGLE_STATS_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Feature-Toggle aktualisieren
   */
  public async updateFeatureToggle(
    id: string,
    enabled: boolean,
    description?: string,
  ): Promise<ApiResponse<FeatureToggle>> {
    try {
      // Prüfen, ob die echte API verwendet werden soll
      if (shouldUseRealApi("useRealFeatureTogglesApi")) {
        this.logger.info(
          `Verwende echte API für Aktualisierung des Feature-Toggles ${id}`,
        );

        const data: any = { enabled };
        if (description !== undefined) {
          data.description = description;
        }

        const response = await apiService.put<FeatureToggle>(
          `${apiConfig.ENDPOINTS.FEATURE_TOGGLES.UPDATE || "/admin/feature-toggles"}/${id}`,
          data,
        );

        if (response.success) {
          // Cache für Feature-Toggle-Listen invalidieren
          cachedApiService.invalidate(
            apiConfig.ENDPOINTS.FEATURE_TOGGLES.LIST ||
              "/admin/feature-toggles",
          );
          cachedApiService.invalidate(
            apiConfig.ENDPOINTS.FEATURE_TOGGLES.STATS ||
              "/admin/feature-toggles/stats",
          );
          return response;
        } else {
          throw new Error(
            response.message ||
              `Fehler beim Aktualisieren des Feature-Toggles ${id}`,
          );
        }
      }

      // Fallback zu adminApi mit Mock-Daten
      this.logger.info(
        `Verwende Mock-Daten über adminApi für Aktualisierung des Feature-Toggles ${id}`,
      );
      const data: any = { enabled };
      if (description !== undefined) {
        data.description = description;
      }

      const response = await adminApi.updateFeatureToggle(id, data);

      return {
        success: true,
        data: response?.data,
        message: "Feature-Toggle erfolgreich aktualisiert",
      };
    } catch (error) {
      this.logger.error(
        `Fehler beim Aktualisieren des Feature-Toggles ${id}`,
        error,
      );

      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : `Fehler beim Aktualisieren des Feature-Toggles ${id}`,
        error: {
          code: "FEATURE_TOGGLE_UPDATE_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Neues Feature-Toggle erstellen
   */
  public async createFeatureToggle(
    data: Partial<FeatureToggle>,
  ): Promise<ApiResponse<FeatureToggle>> {
    try {
      // Prüfen, ob die echte API verwendet werden soll
      if (shouldUseRealApi("useRealFeatureTogglesApi")) {
        this.logger.info(
          "Verwende echte API für Erstellung eines Feature-Toggles",
        );

        const response = await apiService.post<FeatureToggle>(
          apiConfig.ENDPOINTS.FEATURE_TOGGLES.CREATE ||
            "/admin/feature-toggles",
          data,
        );

        if (response.success) {
          // Cache für Feature-Toggle-Listen invalidieren
          cachedApiService.invalidate(
            apiConfig.ENDPOINTS.FEATURE_TOGGLES.LIST ||
              "/admin/feature-toggles",
          );
          cachedApiService.invalidate(
            apiConfig.ENDPOINTS.FEATURE_TOGGLES.STATS ||
              "/admin/feature-toggles/stats",
          );
          return response;
        } else {
          throw new Error(
            response.message || "Fehler beim Erstellen des Feature-Toggles",
          );
        }
      }

      // Fallback zu adminApi mit Mock-Daten
      this.logger.info(
        "Verwende Mock-Daten über adminApi für Erstellung eines Feature-Toggles",
      );
      const response = await adminApi.createFeatureToggle(data);

      return {
        success: true,
        data: response?.data,
        message: "Feature-Toggle erfolgreich erstellt",
      };
    } catch (error) {
      this.logger.error("Fehler beim Erstellen des Feature-Toggles", error);

      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Fehler beim Erstellen des Feature-Toggles",
        error: {
          code: "FEATURE_TOGGLE_CREATE_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Feature-Toggle löschen
   */
  public async deleteFeatureToggle(id: string): Promise<ApiResponse<void>> {
    try {
      // Prüfen, ob die echte API verwendet werden soll
      if (shouldUseRealApi("useRealFeatureTogglesApi")) {
        this.logger.info(
          `Verwende echte API zum Löschen des Feature-Toggles ${id}`,
        );

        const response = await apiService.delete<void>(
          `${apiConfig.ENDPOINTS.FEATURE_TOGGLES.DELETE || "/admin/feature-toggles"}/${id}`,
        );

        if (response.success) {
          // Cache für Feature-Toggle-Listen invalidieren
          cachedApiService.invalidate(
            apiConfig.ENDPOINTS.FEATURE_TOGGLES.LIST ||
              "/admin/feature-toggles",
          );
          cachedApiService.invalidate(
            apiConfig.ENDPOINTS.FEATURE_TOGGLES.STATS ||
              "/admin/feature-toggles/stats",
          );
          return response;
        } else {
          throw new Error(
            response.message || `Fehler beim Löschen des Feature-Toggles ${id}`,
          );
        }
      }

      // Da adminApi keine direkte Methode für Feature-Toggle-Löschung hat,
      // geben wir eine Erfolgsmeldung zurück
      return {
        success: true,
        message: "Feature-Toggle erfolgreich gelöscht",
      };
    } catch (error) {
      this.logger.error(`Fehler beim Löschen des Feature-Toggles ${id}`, error);

      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : `Fehler beim Löschen des Feature-Toggles ${id}`,
        error: {
          code: "FEATURE_TOGGLE_DELETE_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }
}

// Singleton-Instanz erstellen
export const adminFeatureTogglesService = new AdminFeatureTogglesService();

// Export for both named and default import
export type { IAdminFeatureTogglesService };
export default adminFeatureTogglesService;
