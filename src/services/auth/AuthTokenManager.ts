/**
 * Enhanced Auth Token Manager
 *
 * Robuste Token-Verwaltung mit Persistenz über verschiedene Speichermedien
 * für höhere Zuverlässigkeit bei Seitenreloads
 */

import { jwtDecode } from "jwt-decode";

export interface TokenPayload {
  user_id?: string;
  sub?: string;
  email?: string;
  name?: string;
  role?: string;
  exp?: number;
  iat?: number;
}

export interface StoredTokenData {
  token: string;
  refreshToken?: string;
  expiresAt: number;
  userInfo?: {
    id: string;
    email: string;
    username: string;
    roles: string[];
  };
}

export class AuthTokenManager {
  private static instance: AuthTokenManager;

  // Verwende mehrere Speicher-Keys für Redundanz
  private readonly TOKEN_KEYS = {
    access: "nscale_access_token",
    refresh: "nscale_refresh_token",
    expires: "nscale_token_expires",
    user: "nscale_user_info",
    // Legacy keys für Rückwärtskompatibilität
    legacyAccess: "token",
    legacyRefresh: "refreshToken",
    legacyExpires: "token_expires",
    legacyUser: "user",
  };

  // Session Storage als Backup
  private readonly SESSION_KEYS = {
    access: "session_access_token",
    refresh: "session_refresh_token",
    expires: "session_token_expires",
    user: "session_user_info",
  };

  private constructor() {}

  public static getInstance(): AuthTokenManager {
    if (!AuthTokenManager.instance) {
      AuthTokenManager.instance = new AuthTokenManager();
    }
    return AuthTokenManager.instance;
  }

  /**
   * Speichert Token redundant in mehreren Speichern
   */
  public saveTokens(data: StoredTokenData): void {
    console.log("[AuthTokenManager] Speichere Tokens redundant");

    // LocalStorage - Hauptspeicher
    this.saveToLocalStorage(data);

    // SessionStorage - Backup für aktuelle Sitzung
    this.saveToSessionStorage(data);

    // Cookie als zusätzlicher Fallback (nur HttpOnly in Produktion)
    if (import.meta.env.PROD) {
      this.saveToCookie(data);
    }
  }

  /**
   * Lädt Token aus verschiedenen Quellen mit Fallback-Strategie
   */
  public loadTokens(): StoredTokenData | null {
    console.log("[AuthTokenManager] Lade Tokens aus Speicher");

    // Versuche zuerst aus localStorage
    let data = this.loadFromLocalStorage();

    if (!data) {
      console.log(
        "[AuthTokenManager] Keine Daten in localStorage, versuche sessionStorage",
      );
      data = this.loadFromSessionStorage();
    }

    if (!data) {
      console.log(
        "[AuthTokenManager] Keine Daten in sessionStorage, versuche Legacy-Keys",
      );
      data = this.loadFromLegacyStorage();
    }

    if (!data && import.meta.env.PROD) {
      console.log("[AuthTokenManager] Versuche aus Cookie zu laden");
      data = this.loadFromCookie();
    }

    if (data) {
      // Validiere und repariere Daten wenn nötig
      data = this.validateAndRepairData(data);
    }

    return data;
  }

  /**
   * Löscht alle gespeicherten Token
   */
  public clearTokens(): void {
    console.log("[AuthTokenManager] Lösche alle Token");

    // LocalStorage
    Object.values(this.TOKEN_KEYS).forEach((key: any) => {
      localStorage.removeItem(key);
    });

    // SessionStorage
    Object.values(this.SESSION_KEYS).forEach((key: any) => {
      sessionStorage.removeItem(key);
    });

    // Cookies
    if (import.meta.env.PROD) {
      this.clearCookies();
    }
  }

  /**
   * Token-Validierung
   */
  public validateToken(token: string): boolean {
    try {
      if (!token || typeof token !== "string") {
        return false;
      }

      // JWT-Struktur prüfen
      const parts = token.split(".");
      if (parts.length !== 3) {
        return false;
      }

      // Token dekodieren und Ablaufzeit prüfen
      const payload = jwtDecode<TokenPayload>(token);

      if (payload.exp) {
        const now = Date.now() / 1000;
        return payload.exp > now;
      }

      return true;
    } catch (error) {
      console.error(
        "[AuthTokenManager] Token-Validierung fehlgeschlagen:",
        error,
      );
      return false;
    }
  }

  /**
   * Extrahiert Benutzerinfo aus Token
   */
  public extractUserFromToken(
    token: string,
  ): StoredTokenData["userInfo"] | null {
    try {
      const payload = jwtDecode<TokenPayload>(token);

      return {
        id: (payload.user_id || payload.sub || "1").toString(),
        email: payload.email || payload.name || "user@example.com",
        username: payload.email || payload.name || "user@example.com",
        roles: [payload.role || "user"],
      };
    } catch (error) {
      console.error(
        "[AuthTokenManager] Fehler beim Extrahieren der Benutzerdaten:",
        error,
      );
      return null;
    }
  }

  // Private Methoden für verschiedene Speichertypen

  private saveToLocalStorage(data: StoredTokenData): void {
    try {
      localStorage.setItem(this.TOKEN_KEYS.access, data.token);

      if (data.refreshToken) {
        localStorage.setItem(this.TOKEN_KEYS.refresh, data.refreshToken);
      }

      localStorage.setItem(this.TOKEN_KEYS.expires, data.expiresAt.toString());

      if (data.userInfo) {
        localStorage.setItem(
          this.TOKEN_KEYS.user,
          JSON.stringify(data.userInfo),
        );
      }
    } catch (error) {
      console.error(
        "[AuthTokenManager] Fehler beim Speichern in localStorage:",
        error,
      );
    }
  }

  private saveToSessionStorage(data: StoredTokenData): void {
    try {
      sessionStorage.setItem(this.SESSION_KEYS.access, data.token);

      if (data.refreshToken) {
        sessionStorage.setItem(this.SESSION_KEYS.refresh, data.refreshToken);
      }

      sessionStorage.setItem(
        this.SESSION_KEYS.expires,
        data.expiresAt.toString(),
      );

      if (data.userInfo) {
        sessionStorage.setItem(
          this.SESSION_KEYS.user,
          JSON.stringify(data.userInfo),
        );
      }
    } catch (error) {
      console.error(
        "[AuthTokenManager] Fehler beim Speichern in sessionStorage:",
        error,
      );
    }
  }

  private loadFromLocalStorage(): StoredTokenData | null {
    try {
      const token = localStorage.getItem(this.TOKEN_KEYS.access);
      if (!token) return null;

      const refreshToken = localStorage.getItem(this.TOKEN_KEYS.refresh);
      const expires = localStorage.getItem(this.TOKEN_KEYS.expires);
      const userStr = localStorage.getItem(this.TOKEN_KEYS.user);

      return {
        token,
        refreshToken: refreshToken || undefined,
        expiresAt: expires
          ? parseInt(expires, 10)
          : Date.now() + 24 * 60 * 60 * 1000,
        userInfo: userStr ? JSON.parse(userStr) : undefined,
      };
    } catch (error) {
      console.error(
        "[AuthTokenManager] Fehler beim Laden aus localStorage:",
        error,
      );
      return null;
    }
  }

  private loadFromSessionStorage(): StoredTokenData | null {
    try {
      const token = sessionStorage.getItem(this.SESSION_KEYS.access);
      if (!token) return null;

      const refreshToken = sessionStorage.getItem(this.SESSION_KEYS.refresh);
      const expires = sessionStorage.getItem(this.SESSION_KEYS.expires);
      const userStr = sessionStorage.getItem(this.SESSION_KEYS.user);

      return {
        token,
        refreshToken: refreshToken || undefined,
        expiresAt: expires
          ? parseInt(expires, 10)
          : Date.now() + 24 * 60 * 60 * 1000,
        userInfo: userStr ? JSON.parse(userStr) : undefined,
      };
    } catch (error) {
      console.error(
        "[AuthTokenManager] Fehler beim Laden aus sessionStorage:",
        error,
      );
      return null;
    }
  }

  private loadFromLegacyStorage(): StoredTokenData | null {
    try {
      const token = localStorage.getItem(this.TOKEN_KEYS.legacyAccess);
      if (!token) return null;

      const refreshToken = localStorage.getItem(this.TOKEN_KEYS.legacyRefresh);
      const expires = localStorage.getItem(this.TOKEN_KEYS.legacyExpires);
      const userStr = localStorage.getItem(this.TOKEN_KEYS.legacyUser);

      return {
        token,
        refreshToken: refreshToken || undefined,
        expiresAt: expires
          ? parseInt(expires, 10)
          : Date.now() + 24 * 60 * 60 * 1000,
        userInfo: userStr ? JSON.parse(userStr) : undefined,
      };
    } catch (error) {
      console.error(
        "[AuthTokenManager] Fehler beim Laden aus Legacy-Storage:",
        error,
      );
      return null;
    }
  }

  private validateAndRepairData(data: StoredTokenData): StoredTokenData | null {
    // Validiere Token
    if (!this.validateToken(data.token)) {
      console.warn("[AuthTokenManager] Token ungültig oder abgelaufen");
      return null;
    }

    // Repariere fehlende Benutzerdaten
    if (!data.userInfo) {
      data.userInfo = this.extractUserFromToken(data.token);
    }

    // Repariere fehlende Ablaufzeit
    if (!data.expiresAt || data.expiresAt < Date.now()) {
      try {
        const payload = jwtDecode<TokenPayload>(data.token);
        if (payload.exp) {
          data.expiresAt = payload.exp * 1000;
        } else {
          data.expiresAt = Date.now() + 24 * 60 * 60 * 1000;
        }
      } catch (error) {
        data.expiresAt = Date.now() + 24 * 60 * 60 * 1000;
      }
    }

    return data;
  }

  // Cookie-Funktionen (nur für Produktion)
  private saveToCookie(_data: StoredTokenData): void {
    // Implementierung für sichere HttpOnly-Cookies in Produktion
    // Dies sollte idealerweise über den Server erfolgen
  }

  private loadFromCookie(): StoredTokenData | null {
    // Implementierung für Cookie-Laden
    return null;
  }

  private clearCookies(): void {
    // Implementierung für Cookie-Löschen
  }
}

// Export Singleton-Instanz
export const authTokenManager = AuthTokenManager.getInstance();
