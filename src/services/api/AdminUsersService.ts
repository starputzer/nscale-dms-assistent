/**
 * AdminUsersService - Spezialisierter Service für die Benutzerverwaltung im Admin-Bereich
 *
 * Verwaltet die API-Kommunikation für die Benutzerverwaltungsfunktionen
 * und bietet eine konsistente Fehlerbehandlung und Fallback-Mechanismen.
 */

import { apiService } from "./ApiService";
import { cachedApiService } from "./CachedApiService";
import { apiConfig } from "./config";
import { adminApi } from "./admin";
import { LogService } from "../log/LogService";
import { ApiResponse, PaginatedResponse } from "@/types/api";
import { User, NewUser, UserRole, UserStats } from "@/types/admin";
import { shouldUseRealApi } from "@/config/api-flags";

export interface IAdminUsersService {
  getUsers(): Promise<ApiResponse<User[]>>;
  getUserCount(): Promise<ApiResponse<number>>;
  getUserById(id: string): Promise<ApiResponse<User>>;
  createUser(userData: NewUser): Promise<ApiResponse<User>>;
  updateUserRole(userId: string, role: UserRole): Promise<ApiResponse<User>>;
  deleteUser(userId: string): Promise<ApiResponse<void>>;
  getUserStats(): Promise<ApiResponse<UserStats>>;
  getActiveUsers(): Promise<ApiResponse<User[]>>;
  toggleUserLock(userId: string, locked: boolean): Promise<ApiResponse<User>>;
}

/**
 * AdminUsersService Klasse für die Verwaltung von Benutzerfunktionen
 */
export class AdminUsersService implements IAdminUsersService {
  /** Logger für Diagnose */
  private logger: LogService;

  /** Cache-TTL in Sekunden */
  private cacheTTL: number = 300; // 5 Minuten

  /**
   * Konstruktor
   */
  constructor() {
    this.logger = new LogService("AdminUsersService");
  }

  /**
   * Alle Benutzer abrufen
   */
  public async getUsers(): Promise<ApiResponse<User[]>> {
    try {
      // Prüfen, ob die echte API verwendet werden soll
      if (shouldUseRealApi("useRealUsersApi")) {
        this.logger.info("Verwende echte API für Benutzerabruf");

        // Cache-Strategie: Kurzzeitiges Caching für häufig abgerufene Listen
        const options = {
          cache: true,
          cacheTTL: this.cacheTTL,
          refreshToken: true,
        };

        const response = await cachedApiService.get<PaginatedResponse<User>>(
          apiConfig.ENDPOINTS.USERS.LIST || "/admin/users",
          undefined,
          options,
        );

        if (response.success) {
          // Prüfen, ob die Antwort paginiert ist oder direkt ein Array zurückgibt
          if (Array.isArray(response.data)) {
            return {
              success: true,
              data: response.data,
              message: "Benutzer erfolgreich abgerufen",
            };
          } else if (response.data && response.data.items) {
            return {
              success: true,
              data: response.data.items,
              message: "Benutzer erfolgreich abgerufen",
            };
          } else if (response.data && response.data.users) {
            return {
              success: true,
              data: response.data.users,
              message: "Benutzer erfolgreich abgerufen",
            };
          } else {
            throw new Error("Unerwartetes Antwortformat vom Server");
          }
        } else {
          throw new Error(
            response.message || "Fehler beim Abrufen der Benutzer",
          );
        }
      }

      // Fallback zu adminApi mit Mock-Daten
      this.logger.info("Verwende Mock-Daten über adminApi für Benutzerabruf");
      const response = await adminApi.getUsers();

      // Prüfen, ob Benutzer in der Antwort vorhanden sind
      const users = response?.data?.users || response?.data;

      if (Array.isArray(users)) {
        return {
          success: true,
          data: users,
          message: "Benutzer erfolgreich abgerufen",
        };
      } else {
        throw new Error("Keine Benutzerdaten in der Antwort gefunden");
      }
    } catch (error) {
      this.logger.error("Fehler beim Abrufen der Benutzer", error);

      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Fehler beim Abrufen der Benutzer",
        error: {
          code: "USERS_FETCH_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Anzahl der Benutzer abrufen
   */
  public async getUserCount(): Promise<ApiResponse<number>> {
    try {
      // Prüfen, ob die echte API verwendet werden soll
      if (shouldUseRealApi("useRealUsersApi")) {
        this.logger.info("Verwende echte API für Benutzeranzahl");

        const response = await apiService.get<{ count: number }>(
          apiConfig.ENDPOINTS.USERS.COUNT || "/admin/users/count",
        );

        if (response.success) {
          return {
            success: true,
            data: response.data.count,
            message: "Benutzeranzahl erfolgreich abgerufen",
          };
        } else {
          throw new Error(
            response.message || "Fehler beim Abrufen der Benutzeranzahl",
          );
        }
      }

      // Wenn keine echte API, holen wir die vollständige Liste und zählen sie
      this.logger.info("Verwende getUsers für Benutzeranzahl");
      const usersResponse = await this.getUsers();

      if (usersResponse.success && Array.isArray(usersResponse.data)) {
        return {
          success: true,
          data: usersResponse.data.length,
          message: "Benutzeranzahl erfolgreich abgerufen",
        };
      } else {
        throw new Error("Keine Benutzerdaten verfügbar für Zählung");
      }
    } catch (error) {
      this.logger.error("Fehler beim Abrufen der Benutzeranzahl", error);

      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Fehler beim Abrufen der Benutzeranzahl",
        error: {
          code: "USER_COUNT_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Einzelnen Benutzer anhand der ID abrufen
   */
  public async getUserById(id: string): Promise<ApiResponse<User>> {
    try {
      // Prüfen, ob die echte API verwendet werden soll
      if (shouldUseRealApi("useRealUsersApi")) {
        this.logger.info(`Verwende echte API für Benutzerabruf mit ID ${id}`);

        const response = await apiService.get<User>(
          `${apiConfig.ENDPOINTS.USERS.DETAIL || "/admin/users"}/${id}`,
        );

        if (response.success) {
          return response;
        } else {
          throw new Error(
            response.message ||
              `Fehler beim Abrufen des Benutzers mit ID ${id}`,
          );
        }
      }

      // Fallback: Alle Benutzer holen und filtern
      const usersResponse = await this.getUsers();

      if (usersResponse.success && Array.isArray(usersResponse.data)) {
        const user = usersResponse.data.find((user) => user.id === id);

        if (user) {
          return {
            success: true,
            data: user,
            message: "Benutzer erfolgreich abgerufen",
          };
        } else {
          throw new Error(`Benutzer mit ID ${id} nicht gefunden`);
        }
      } else {
        throw new Error("Keine Benutzerdaten verfügbar");
      }
    } catch (error) {
      this.logger.error(
        `Fehler beim Abrufen des Benutzers mit ID ${id}`,
        error,
      );

      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : `Fehler beim Abrufen des Benutzers mit ID ${id}`,
        error: {
          code: "USER_FETCH_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Neuen Benutzer erstellen
   */
  public async createUser(userData: NewUser): Promise<ApiResponse<User>> {
    try {
      // Prüfen, ob die echte API verwendet werden soll
      if (shouldUseRealApi("useRealUsersApi")) {
        this.logger.info("Verwende echte API für Benutzererstellung");

        const response = await apiService.post<User>(
          apiConfig.ENDPOINTS.USERS.CREATE || "/admin/users",
          userData,
        );

        if (response.success) {
          // Cache für Benutzerliste invalidieren
          cachedApiService.invalidate(
            apiConfig.ENDPOINTS.USERS.LIST || "/admin/users",
          );
          return response;
        } else {
          throw new Error(
            response.message || "Fehler beim Erstellen des Benutzers",
          );
        }
      }

      // Fallback zu adminApi mit Mock-Daten
      this.logger.info(
        "Verwende Mock-Daten über adminApi für Benutzererstellung",
      );
      const response = await adminApi.createUser(userData);

      return {
        success: true,
        data: response?.data,
        message: "Benutzer erfolgreich erstellt",
      };
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
   * Benutzerrolle aktualisieren
   */
  public async updateUserRole(
    userId: string,
    role: UserRole,
  ): Promise<ApiResponse<User>> {
    try {
      // Prüfen, ob die echte API verwendet werden soll
      if (shouldUseRealApi("useRealUsersApi")) {
        this.logger.info(
          `Verwende echte API für Rollenaktualisierung des Benutzers ${userId}`,
        );

        const response = await apiService.put<User>(
          `${apiConfig.ENDPOINTS.USERS.UPDATE_ROLE || "/admin/users"}/${userId}/role`,
          { role },
        );

        if (response.success) {
          // Cache für Benutzerliste invalidieren
          cachedApiService.invalidate(
            apiConfig.ENDPOINTS.USERS.LIST || "/admin/users",
          );
          return response;
        } else {
          throw new Error(
            response.message ||
              `Fehler beim Aktualisieren der Rolle des Benutzers ${userId}`,
          );
        }
      }

      // Fallback zu adminApi mit Mock-Daten
      this.logger.info(
        `Verwende Mock-Daten über adminApi für Rollenaktualisierung des Benutzers ${userId}`,
      );
      const response = await adminApi.updateUserRole(userId, role);

      return {
        success: true,
        data: response?.data,
        message: "Benutzerrolle erfolgreich aktualisiert",
      };
    } catch (error) {
      this.logger.error(
        `Fehler beim Aktualisieren der Rolle des Benutzers ${userId}`,
        error,
      );

      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : `Fehler beim Aktualisieren der Rolle des Benutzers ${userId}`,
        error: {
          code: "USER_ROLE_UPDATE_ERROR",
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
      // Prüfen, ob die echte API verwendet werden soll
      if (shouldUseRealApi("useRealUsersApi")) {
        this.logger.info(
          `Verwende echte API zum Löschen des Benutzers ${userId}`,
        );

        const response = await apiService.delete<void>(
          `${apiConfig.ENDPOINTS.USERS.DELETE || "/admin/users"}/${userId}`,
        );

        if (response.success) {
          // Cache für Benutzerliste invalidieren
          cachedApiService.invalidate(
            apiConfig.ENDPOINTS.USERS.LIST || "/admin/users",
          );
          return response;
        } else {
          throw new Error(
            response.message || `Fehler beim Löschen des Benutzers ${userId}`,
          );
        }
      }

      // Fallback zu adminApi mit Mock-Daten
      this.logger.info(
        `Verwende Mock-Daten über adminApi zum Löschen des Benutzers ${userId}`,
      );
      const response = await adminApi.deleteUser(userId);

      return {
        success: true,
        data: response?.data,
        message: "Benutzer erfolgreich gelöscht",
      };
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
   * Benutzerstatistiken abrufen
   */
  public async getUserStats(): Promise<ApiResponse<UserStats>> {
    try {
      // Prüfen, ob die echte API verwendet werden soll
      if (shouldUseRealApi("useRealUsersApi")) {
        this.logger.info("Verwende echte API für Benutzerstatistiken");

        // Cache-Strategie: Kurzzeitiges Caching für Statistiken
        const options = {
          cache: true,
          cacheTTL: this.cacheTTL,
          refreshToken: true,
        };

        const response = await cachedApiService.get<UserStats>(
          apiConfig.ENDPOINTS.USERS.STATS || "/admin/users/stats",
          undefined,
          options,
        );

        if (response.success) {
          return response;
        } else {
          throw new Error(
            response.message || "Fehler beim Abrufen der Benutzerstatistiken",
          );
        }
      }

      // Wenn keine echte API verfügbar, berechnen wir die Statistiken aus der Benutzerliste
      const usersResponse = await this.getUsers();

      if (usersResponse.success && Array.isArray(usersResponse.data)) {
        const users = usersResponse.data;
        const now = Date.now();
        const oneDayAgo = now - 24 * 60 * 60 * 1000;
        const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
        const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;

        const userStats: UserStats = {
          activeToday: users.filter(
            (u) => u.last_login && u.last_login > oneDayAgo,
          ).length,
          activeThisWeek: users.filter(
            (u) => u.last_login && u.last_login > oneWeekAgo,
          ).length,
          activeThisMonth: users.filter(
            (u) => u.last_login && u.last_login > oneMonthAgo,
          ).length,
          newThisMonth: users.filter((u) => u.created_at > oneMonthAgo).length,
          // Mockwert für durchschnittliche Sitzungen
          averageSessionsPerUser: Math.round(Math.random() * 10 + 5),
        };

        return {
          success: true,
          data: userStats,
          message: "Benutzerstatistiken erfolgreich berechnet",
        };
      } else {
        throw new Error(
          "Keine Benutzerdaten verfügbar für Statistikberechnung",
        );
      }
    } catch (error) {
      this.logger.error("Fehler beim Abrufen der Benutzerstatistiken", error);

      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Fehler beim Abrufen der Benutzerstatistiken",
        error: {
          code: "USER_STATS_ERROR",
          message:
            error instanceof Error ? error.message : "Unbekannter Fehler",
        },
      };
    }
  }

  /**
   * Aktive Benutzer abrufen
   */
  public async getActiveUsers(): Promise<ApiResponse<User[]>> {
    try {
      // Prüfen, ob die echte API verwendet werden soll
      if (shouldUseRealApi("useRealUsersApi")) {
        this.logger.info("Verwende echte API für aktive Benutzer");

        const response = await apiService.get<User[]>(
          apiConfig.ENDPOINTS.USERS.ACTIVE || "/admin/users/active",
        );

        if (response.success) {
          return response;
        } else {
          throw new Error(
            response.message || "Fehler beim Abrufen der aktiven Benutzer",
          );
        }
      }

      // Wenn keine echte API verfügbar, filtern wir die aktiven Benutzer aus der Gesamtliste
      const usersResponse = await this.getUsers();

      if (usersResponse.success && Array.isArray(usersResponse.data)) {
        const now = Date.now();
        const oneDayAgo = now - 24 * 60 * 60 * 1000;

        const activeUsers = usersResponse.data
          .filter((user) => user.last_login && user.last_login > oneDayAgo)
          .sort((a, b) => (b.last_login || 0) - (a.last_login || 0));

        return {
          success: true,
          data: activeUsers,
          message: "Aktive Benutzer erfolgreich gefiltert",
        };
      } else {
        throw new Error("Keine Benutzerdaten verfügbar");
      }
    } catch (error) {
      this.logger.error("Fehler beim Abrufen der aktiven Benutzer", error);

      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Fehler beim Abrufen der aktiven Benutzer",
        error: {
          code: "ACTIVE_USERS_ERROR",
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
      // Prüfen, ob die echte API verwendet werden soll
      if (shouldUseRealApi("useRealUsersApi")) {
        this.logger.info(
          `Verwende echte API für ${locked ? "Sperrung" : "Entsperrung"} des Benutzers ${userId}`,
        );

        const endpoint = locked
          ? `${apiConfig.ENDPOINTS.USERS.LOCK || "/admin/users"}/${userId}/lock`
          : `${apiConfig.ENDPOINTS.USERS.UNLOCK || "/admin/users"}/${userId}/unlock`;

        const response = await apiService.post<User>(endpoint);

        if (response.success) {
          // Cache für Benutzerliste invalidieren
          cachedApiService.invalidate(
            apiConfig.ENDPOINTS.USERS.LIST || "/admin/users",
          );
          return response;
        } else {
          throw new Error(
            response.message ||
              `Fehler beim ${locked ? "Sperren" : "Entsperren"} des Benutzers ${userId}`,
          );
        }
      }

      // Mock-Implementierung, da adminApi keine direkte Methode für Sperrung hat
      // Wir könnten hier auf die updateUser-Methode zurückgreifen, falls vorhanden

      // Erst den Benutzer abrufen
      const userResponse = await this.getUserById(userId);

      if (userResponse.success && userResponse.data) {
        const updatedUser = {
          ...userResponse.data,
          locked: locked,
        };

        return {
          success: true,
          data: updatedUser,
          message: `Benutzer erfolgreich ${locked ? "gesperrt" : "entsperrt"}`,
        };
      } else {
        throw new Error(`Benutzer mit ID ${userId} nicht gefunden`);
      }
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
}

// Singleton-Instanz erstellen
export const adminUsersService = new AdminUsersService();

// Export for both named and default import
export type { IAdminUsersService };
export default adminUsersService;
