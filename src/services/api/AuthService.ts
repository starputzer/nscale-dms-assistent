/**
 * AuthService - Spezialisierter Service für Authentifizierung und Autorisierung
 *
 * Dieser Service handhabt alle Authentifizierungs- und Autorisierungsvorgänge
 * wie Login, Logout, Token-Verwaltung und Berechtigungsprüfungen.
 */

import { apiService } from "./ApiService";
import { cachedApiService } from "./CachedApiService";
import { apiConfig } from "./config";
import { StorageService } from "../storage/StorageService";
import { LogService } from "../log/LogService";
import {
  User,
  LoginCredentials,
  LoginResponse,
  Role,
  PermissionCheck,
  TokenStatus,
} from "@/types/auth";
import { ApiResponse } from "@/types/api";

/**
 * AuthService-Klasse zur Verwaltung von Authentifizierung und Berechtigungen
 */
export class AuthService {
  /** Storage-Service für persistente Daten */
  private storageService: StorageService;

  /** Logger für Diagnose */
  private logger: LogService;

  /** Aktueller Benutzer */
  private currentUser: User | null = null;

  /** Access Token */
  private accessToken: string | null = null;

  /** Refresh Token */
  private refreshToken: string | null = null;

  /** Ablaufzeitpunkt des Tokens */
  private expiresAt: number | null = null;

  /** Flag für laufenden Token-Refresh */
  private tokenRefreshInProgress: boolean = false;

  /** Event-Handler für Auth-Ereignisse */
  private eventHandlers: Map<string, Set<Function>> = new Map();

  /**
   * Konstruktor
   */
  constructor() {
    this.storageService = new StorageService();
    this.logger = new LogService("AuthService");

    // Daten aus dem Storage laden
    this.loadAuthDataFromStorage();

    // Event-Listener registrieren
    if (typeof window !== "undefined") {
      window.addEventListener("auth:login", this.handleLoginEvent);
      window.addEventListener("auth:logout", this.handleLogoutEvent);
      window.addEventListener(
        "auth:unauthorized",
        this.handleUnauthorizedEvent,
      );
      window.addEventListener("storage", this.handleStorageEvent);
    }

    // Token-Ablauf überwachen
    this.startTokenExpirationMonitor();
  }

  /**
   * Lädt Auth-Daten aus dem Storage
   */
  private loadAuthDataFromStorage(): void {
    try {
      // Access-Token laden
      this.accessToken = this.storageService.getItem(
        apiConfig.AUTH.STORAGE_KEYS.ACCESS_TOKEN,
      );

      // Refresh-Token laden
      this.refreshToken = this.storageService.getItem(
        apiConfig.AUTH.STORAGE_KEYS.REFRESH_TOKEN,
      );

      // Ablaufzeitpunkt laden
      const expiryStr = this.storageService.getItem(
        apiConfig.AUTH.STORAGE_KEYS.TOKEN_EXPIRY,
      );
      this.expiresAt = expiryStr ? new Date(expiryStr).getTime() : null;

      // Benutzer laden
      const userJson = this.storageService.getItem(
        apiConfig.AUTH.STORAGE_KEYS.USER,
      );
      if (userJson) {
        try {
          this.currentUser = JSON.parse(userJson);
        } catch (e) {
          this.logger.error("Fehler beim Parsen der Benutzerinformationen", e);
          this.currentUser = null;
        }
      }

      if (this.accessToken && this.currentUser) {
        this.logger.info(
          `Authentifizierungsdaten für Benutzer ${this.currentUser.email} geladen`,
        );
      }
    } catch (error) {
      this.logger.error("Fehler beim Laden der Authentifizierungsdaten", error);
      this.clearAuthData();
    }
  }

  /**
   * Speichert Auth-Daten im Storage
   */
  private saveAuthDataToStorage(): void {
    try {
      if (this.accessToken) {
        this.storageService.setItem(
          apiConfig.AUTH.STORAGE_KEYS.ACCESS_TOKEN,
          this.accessToken,
        );
      } else {
        this.storageService.removeItem(
          apiConfig.AUTH.STORAGE_KEYS.ACCESS_TOKEN,
        );
      }

      if (this.refreshToken) {
        this.storageService.setItem(
          apiConfig.AUTH.STORAGE_KEYS.REFRESH_TOKEN,
          this.refreshToken,
        );
      } else {
        this.storageService.removeItem(
          apiConfig.AUTH.STORAGE_KEYS.REFRESH_TOKEN,
        );
      }

      if (this.expiresAt) {
        this.storageService.setItem(
          apiConfig.AUTH.STORAGE_KEYS.TOKEN_EXPIRY,
          new Date(this.expiresAt).toISOString(),
        );
      } else {
        this.storageService.removeItem(
          apiConfig.AUTH.STORAGE_KEYS.TOKEN_EXPIRY,
        );
      }

      if (this.currentUser) {
        this.storageService.setItem(
          apiConfig.AUTH.STORAGE_KEYS.USER,
          JSON.stringify(this.currentUser),
        );
      } else {
        this.storageService.removeItem(apiConfig.AUTH.STORAGE_KEYS.USER);
      }
    } catch (error) {
      this.logger.error(
        "Fehler beim Speichern der Authentifizierungsdaten",
        error,
      );
    }
  }

  /**
   * Löscht alle Auth-Daten
   */
  private clearAuthData(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.expiresAt = null;
    this.currentUser = null;

    // Aus dem Storage entfernen
    this.storageService.removeItem(apiConfig.AUTH.STORAGE_KEYS.ACCESS_TOKEN);
    this.storageService.removeItem(apiConfig.AUTH.STORAGE_KEYS.REFRESH_TOKEN);
    this.storageService.removeItem(apiConfig.AUTH.STORAGE_KEYS.TOKEN_EXPIRY);
    this.storageService.removeItem(apiConfig.AUTH.STORAGE_KEYS.USER);
  }

  /**
   * Startet den Token-Ablauf-Monitor
   */
  private startTokenExpirationMonitor(): void {
    // Alle 30 Sekunden prüfen
    setInterval(() => {
      if (this.accessToken && this.expiresAt) {
        const status = this.getTokenStatus();

        // Bei bald ablaufendem Token automatisch aktualisieren
        if (
          status === "expiring" &&
          !this.tokenRefreshInProgress &&
          this.refreshToken
        ) {
          this.logger.info(
            "Token läuft bald ab, wird automatisch aktualisiert",
          );
          this.refreshAccessToken().catch((error) => {
            this.logger.error(
              "Automatische Token-Aktualisierung fehlgeschlagen",
              error,
            );
          });
        }
        // Bei abgelaufenem Token abmelden
        else if (status === "expired") {
          this.logger.warn("Token ist abgelaufen, Benutzer wird abgemeldet");
          this.logout();
        }
      }
    }, 30000);
  }

  /**
   * Benutzeranmeldung
   */
  public async login(
    credentials: LoginCredentials,
  ): Promise<ApiResponse<User>> {
    try {
      const response = await apiService.login(credentials);

      if (response.success && response.data) {
        const { accessToken, refreshToken, expiresAt, user } = response.data;

        // Daten speichern
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.expiresAt = new Date(expiresAt).getTime();
        this.currentUser = user;

        // Im Storage speichern
        this.saveAuthDataToStorage();

        // Ereignis auslösen
        this.emitEvent("login", user);

        return {
          success: true,
          data: user,
          message: response.message || "Anmeldung erfolgreich",
        };
      } else {
        throw new Error(response.message || "Anmeldung fehlgeschlagen");
      }
    } catch (error) {
      this.logger.error("Login fehlgeschlagen", error);

      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Anmeldung fehlgeschlagen",
        error: {
          code: "AUTH_LOGIN_FAILED",
          message:
            error instanceof Error ? error.message : "Anmeldung fehlgeschlagen",
        },
      };
    }
  }

  /**
   * Benutzerabmeldung
   */
  public async logout(): Promise<ApiResponse<void>> {
    try {
      // Nur wenn angemeldet
      if (this.isAuthenticated()) {
        await apiService.logout();
      }

      // Daten löschen, unabhängig vom Server-Ergebnis
      this.clearAuthData();

      // Ereignis auslösen
      this.emitEvent("logout");

      return {
        success: true,
        message: "Abmeldung erfolgreich",
      };
    } catch (error) {
      this.logger.error("Logout fehlgeschlagen", error);

      // Trotzdem lokal abmelden
      this.clearAuthData();
      this.emitEvent("logout");

      return {
        success: true,
        message: "Lokale Abmeldung erfolgreich",
      };
    }
  }

  /**
   * Access-Token aktualisieren
   */
  public async refreshAccessToken(): Promise<boolean> {
    // Wenn kein Refresh-Token vorhanden ist
    if (!this.refreshToken) {
      this.logger.warn(
        "Kein Refresh-Token vorhanden, Token-Aktualisierung nicht möglich",
      );
      return false;
    }

    // Wenn bereits ein Refresh läuft
    if (this.tokenRefreshInProgress) {
      this.logger.debug("Token-Aktualisierung läuft bereits");
      return true;
    }

    this.tokenRefreshInProgress = true;

    try {
      const newToken = await apiService.refreshAuthToken();

      if (newToken) {
        // Token erfolgreich aktualisiert
        this.accessToken = newToken;
        this.saveAuthDataToStorage();

        this.logger.info("Access-Token erfolgreich aktualisiert");

        // Ereignis auslösen
        this.emitEvent("tokenRefreshed", newToken);

        return true;
      } else {
        throw new Error("Token-Aktualisierung fehlgeschlagen");
      }
    } catch (error) {
      this.logger.error("Token-Aktualisierung fehlgeschlagen", error);

      // Bei schwerwiegendem Fehler abmelden
      if (error instanceof Error && error.message.includes("401")) {
        this.logout();
      }

      return false;
    } finally {
      this.tokenRefreshInProgress = false;
    }
  }

  /**
   * Aktuelle Benutzerinformationen abrufen
   */
  public async getCurrentUser(): Promise<User | null> {
    // Wenn kein Benutzer im Cache, aber authentifiziert
    if (!this.currentUser && this.isAuthenticated()) {
      try {
        const response = await apiService.get(apiConfig.ENDPOINTS.AUTH.USER);

        if (response.success && response.data) {
          this.currentUser = response.data;
          this.saveAuthDataToStorage();
        }
      } catch (error) {
        this.logger.error(
          "Fehler beim Abrufen der Benutzerinformationen",
          error,
        );
      }
    }

    return this.currentUser;
  }

  /**
   * Prüft, ob der Benutzer angemeldet ist
   */
  public isAuthenticated(): boolean {
    // Token und Ablaufzeitpunkt müssen vorhanden sein
    if (!this.accessToken || !this.expiresAt) {
      return false;
    }

    // Token darf nicht abgelaufen sein
    return this.expiresAt > Date.now();
  }

  /**
   * Prüft, ob der aktuelle Benutzer eine bestimmte Rolle hat
   */
  public hasRole(role: Role): boolean {
    if (!this.currentUser) {
      return false;
    }

    // Alte Implementierung berücksichtigen
    if (this.currentUser.role) {
      return this.currentUser.role === role;
    }

    // Neue Implementierung über roles-Array
    return this.currentUser.roles?.includes(role) || false;
  }

  /**
   * Prüft, ob der aktuelle Benutzer eine von mehreren Rollen hat
   */
  public hasAnyRole(roles: Role[]): boolean {
    if (!this.currentUser) {
      return false;
    }

    // Alte Implementierung berücksichtigen
    if (this.currentUser.role) {
      return roles.includes(this.currentUser.role);
    }

    // Neue Implementierung über roles-Array
    return (
      this.currentUser.roles?.some((role) => roles.includes(role)) || false
    );
  }

  /**
   * Prüft, ob der aktuelle Benutzer alle angegebenen Rollen hat
   */
  public hasAllRoles(roles: Role[]): boolean {
    if (!this.currentUser) {
      return false;
    }

    // Alte Implementierung berücksichtigen
    if (this.currentUser.role) {
      return roles.length === 1 && roles[0] === this.currentUser.role;
    }

    // Neue Implementierung über roles-Array
    return roles.every((role) => this.currentUser?.roles?.includes(role));
  }

  /**
   * Prüft, ob der aktuelle Benutzer Zugriff auf eine Funktion hat
   */
  public checkAccess(requiredRole: Role | Role[]): PermissionCheck {
    // Nicht angemeldet
    if (!this.isAuthenticated() || !this.currentUser) {
      return {
        hasPermission: false,
        user: this.currentUser,
      };
    }

    // Array von Rollen oder einzelne Rolle
    if (Array.isArray(requiredRole)) {
      return {
        hasPermission: this.hasAnyRole(requiredRole),
        requiredRole: requiredRole.join(" oder "),
        user: this.currentUser,
      };
    } else {
      return {
        hasPermission: this.hasRole(requiredRole),
        requiredRole,
        user: this.currentUser,
      };
    }
  }

  /**
   * Gibt den aktuellen Token-Status zurück
   */
  public getTokenStatus(): TokenStatus {
    if (!this.accessToken) {
      return "missing";
    }

    if (!this.expiresAt) {
      return "invalid";
    }

    const now = Date.now();

    // Token ist bereits abgelaufen
    if (now >= this.expiresAt) {
      return "expired";
    }

    // Token läuft bald ab (weniger als 5 Minuten)
    const expiryThreshold = 5 * 60 * 1000; // 5 Minuten in ms
    if (this.expiresAt - now < expiryThreshold) {
      return "expiring";
    }

    return "valid";
  }

  /**
   * Event-Handler für Login-Events
   */
  private handleLoginEvent = (event: Event): void => {
    const customEvent = event as CustomEvent;
    if (customEvent.detail?.user) {
      this.currentUser = customEvent.detail.user;
      this.loadAuthDataFromStorage();
      this.emitEvent("login", this.currentUser);
    }
  };

  /**
   * Event-Handler für Logout-Events
   */
  private handleLogoutEvent = (): void => {
    this.clearAuthData();
    this.emitEvent("logout");
  };

  /**
   * Event-Handler für Unauthorized-Events
   */
  private handleUnauthorizedEvent = (): void => {
    this.clearAuthData();
    this.emitEvent("unauthorized");
  };

  /**
   * Event-Handler für Storage-Events (für Multi-Tab-Synchronisation)
   */
  private handleStorageEvent = (event: StorageEvent): void => {
    // Nur relevante Keys berücksichtigen
    if (
      event.key === apiConfig.AUTH.STORAGE_KEYS.ACCESS_TOKEN ||
      event.key === apiConfig.AUTH.STORAGE_KEYS.USER
    ) {
      // Wenn Token gelöscht wurde (Logout in anderem Tab)
      if (
        event.key === apiConfig.AUTH.STORAGE_KEYS.ACCESS_TOKEN &&
        !event.newValue
      ) {
        if (this.accessToken) {
          this.clearAuthData();
          this.emitEvent("logout");
        }
      }
      // Wenn sich Token oder Benutzer geändert hat
      else {
        this.loadAuthDataFromStorage();
        this.emitEvent("stateChanged");
      }
    }
  };

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

  /**
   * Bereinigt Ressourcen
   */
  public destroy(): void {
    // Event-Listener entfernen
    if (typeof window !== "undefined") {
      window.removeEventListener("auth:login", this.handleLoginEvent);
      window.removeEventListener("auth:logout", this.handleLogoutEvent);
      window.removeEventListener(
        "auth:unauthorized",
        this.handleUnauthorizedEvent,
      );
      window.removeEventListener("storage", this.handleStorageEvent);
    }

    // Event-Handler löschen
    this.eventHandlers.clear();
  }

  /**
   * Gibt den aktuellen Access-Token zurück
   */
  public getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * Gibt den aktuellen Refresh-Token zurück
   */
  public getRefreshToken(): string | null {
    return this.refreshToken;
  }
}

// Singleton-Instanz erstellen
export const authService = new AuthService();

export default authService;
