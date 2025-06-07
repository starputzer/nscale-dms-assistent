/**
 * AuthService - Modern TypeScript Service für Authentifizierungsoperationen
 *
 * Bietet robuste Fehlerbehandlung, Token-Verwaltung und Authentifizierungslogik
 * mit optimierter Netzwerkfehlertoleranz.
 */

import axios, { AxiosError, AxiosInstance } from "axios";
import { ref } from "vue";

// Type Definitions
export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
  displayName?: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    username?: string;
    displayName?: string;
    role?: string;
  };
}

export type AuthErrorType =
  | "network"
  | "invalid_credentials"
  | "account_locked"
  | "validation"
  | "server"
  | "timeout"
  | "token_expired"
  | "token_invalid"
  | "unknown";

export class AuthError extends Error {
  public type: AuthErrorType;
  public status?: number;
  public details?: Record<string, any>;
  public retry?: boolean;
  public timestamp: string;

  constructor(
    message: string,
    type: AuthErrorType = "unknown",
    status?: number,
    details?: Record<string, any>,
    retry: boolean = true,
  ) {
    super(message);
    this.name = "AuthError";
    this.type = type;
    this.status = status;
    this.details = details;
    this.retry = retry;
    this.timestamp = new Date().toISOString();

    // Für bessere Stack Traces in modernen Browsern
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AuthError);
    }
  }

  // Hilfsmethode zur Konvertierung eines Axios-Fehlers in einen AuthError
  static fromAxiosError(error: AxiosError): AuthError {
    const status = error.response?.status;
    let type: AuthErrorType = "unknown";
    let message = error.message || "Unbekannter Authentifizierungsfehler";
    let details: Record<string, any> = {};

    // Netzwerkprobleme
    if (!error.response) {
      type = "network";
      message =
        "Netzwerkfehler: Keine Verbindung zum Authentifizierungsserver möglich";
    }
    // Basierend auf HTTP-Statuscodes
    else {
      details = {
        status,
        data: error.response.data,
        url: error.config?.url,
        method: error.config?.method?.toUpperCase(),
      };

      switch (status) {
        case 400:
          type = "validation";
          message = "Die eingegebenen Daten sind ungültig";
          break;
        case 401:
          type = "invalid_credentials";
          message =
            "Ungültige Anmeldedaten. Bitte überprüfen Sie Ihre E-Mail und Passwort.";
          break;
        case 403:
          type = "account_locked";
          message = "Zugriff verweigert. Ihr Konto könnte gesperrt sein.";
          break;
        case 404:
          type = "unknown";
          message = "Authentifizierungsendpunkt nicht gefunden";
          break;
        case 422:
          type = "validation";
          message = "Validierungsfehler bei der Anmeldung";
          break;
        case 429:
          type = "unknown";
          message =
            "Zu viele Anmeldeversuche. Bitte versuchen Sie es später erneut.";
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          type = "server";
          message = "Serverfehler. Bitte versuchen Sie es später erneut.";
          break;
        default:
          type = "unknown";
          message = `Fehler bei der Anmeldung (Status ${status})`;
      }
    }

    // Spezifischere Fehlertypen basierend auf der Antwort
    if (error.response?.data) {
      const data = error.response.data;

      // API-spezifische Fehlercodes prüfen
      if (data.code === "token_expired") {
        type = "token_expired";
        message =
          "Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.";
      } else if (data.code === "token_invalid") {
        type = "token_invalid";
        message = "Ungültiges Authentifizierungstoken.";
      } else if (data.message) {
        // Verwende die API-Fehlermeldung, falls vorhanden
        message = data.message;
      }
    }

    // Timeout erkennen
    if (error.code === "ECONNABORTED" || message.includes("timeout")) {
      type = "timeout";
      message =
        "Zeitüberschreitung bei der Verbindung zum Authentifizierungsserver.";
    }

    return new AuthError(message, type, status, details);
  }
}

export class AuthService {
  private static instance: AuthService;
  private client: AxiosInstance;
  private baseURL: string;
  private tokenRef = ref<string | null>(null);
  private tokenRefreshPromise: Promise<string> | null = null;
  private tokenExpiry = ref<number | null>(null);

  // Session-Storage-Keys
  private readonly TOKEN_STORAGE_KEY = "auth_token";
  private readonly TOKEN_EXPIRY_KEY = "auth_token_expiry";

  /**
   * Privater Konstruktor für Singleton-Instanz
   */
  private constructor() {
    // API-Basis-URL aus der Umgebung oder mit Fallback
    this.baseURL = import.meta.env.VITE_API_BASE_URL || "/api";

    // Axios-Client mit Basis-Konfiguration
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000, // 10 Sekunden
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    // Request Interceptor zum Hinzufügen des Auth-Tokens
    this.client.interceptors.request.use(
      (config: any) => {
        const token = this.getToken();
        if (token) {
          config.headers["Authorization"] = `Bearer ${token}`;
        }
        return config;
      },
      (error: any) => Promise.reject(error),
    );

    // Response Interceptor für Fehlerbehandlung und Token-Refresh
    this.client.interceptors.response.use(
      (response: any) => response,
      async (error: any) => {
        // Nur Token-Refresh für 401-Fehler mit spezifischen Token-Problemen
        if (
          error.response?.status === 401 &&
          error.config &&
          !error.config.__isRetry &&
          this.getToken() &&
          !error.config.url.includes("/auth/refresh") &&
          !error.config.url.includes("/auth/login")
        ) {
          error.config.__isRetry = true;

          try {
            // Token aktualisieren
            const newToken = await this.refreshToken();

            // Original-Request mit neuem Token wiederholen
            error.config.headers["Authorization"] = `Bearer ${newToken}`;
            return this.client(error.config);
          } catch (refreshError) {
            // Wenn Token-Refresh fehlschlägt, zur Login-Seite umleiten
            this.clearAuth();
            return Promise.reject(AuthError.fromAxiosError(error));
          }
        }

        // Für alle anderen Fehler, AuthError zurückgeben
        return Promise.reject(AuthError.fromAxiosError(error));
      },
    );

    // Token aus dem Session Storage wiederherstellen
    this.restoreAuthState();
  }

  /**
   * Singleton-Instanz abrufen
   */
  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Token aus Session Storage wiederherstellen
   */
  private restoreAuthState(): void {
    try {
      const token = localStorage.getItem(this.TOKEN_STORAGE_KEY);
      const expiry = localStorage.getItem(this.TOKEN_EXPIRY_KEY);

      if (token) {
        this.tokenRef.value = token;
      }

      if (expiry) {
        this.tokenExpiry.value = parseInt(expiry, 10);
      }

      // Prüfen, ob das Token abgelaufen ist
      if (this.tokenExpiry.value && this.tokenExpiry.value < Date.now()) {
        console.warn("Gespeichertes Token ist abgelaufen - wird entfernt");
        this.clearAuth();
      }
    } catch (error) {
      console.error("Fehler beim Wiederherstellen des Auth-Status:", error);
      this.clearAuth();
    }
  }

  /**
   * Login mit E-Mail und Passwort
   */
  public async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const { data } = await this.client.post<any>("/auth/login", credentials);

<<<<<<< HEAD
      // Handle both 'token' and 'access_token' fields for compatibility
      const token = data.token || data.access_token;

      if (!token) {
        console.error("Login response:", data);
        throw new AuthError(
          "Kein Token in der Antwort vom Server",
=======
      if (!data.token) {
        throw new AuthError(
          "Server hat kein gültiges Token zurückgegeben",
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
          "unknown",
        );
      }

      // Token speichern
<<<<<<< HEAD
      this.setToken(token);

      // AuthResponse Format erstellen
      const response: AuthResponse = {
        token: token,
=======
      this.setToken(data.token);

      // AuthResponse Format erstellen
      const response: AuthResponse = {
        token: data.token,
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
        user: data.user || {
          id: "1",
          email: credentials.email,
          role: "user",
        },
      };

      return response;
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }

      if (axios.isAxiosError(error)) {
        throw AuthError.fromAxiosError(error);
      }

      // Generische Fehler
      throw new AuthError(
        error instanceof Error
          ? error.message
          : "Unbekannter Fehler beim Login",
        "unknown",
        undefined,
        { originalError: error },
      );
    }
  }

  /**
   * Benutzerregistrierung
   */
  public async register(
    credentials: RegisterCredentials,
  ): Promise<AuthResponse> {
    try {
      const { data } = await this.client.post<AuthResponse>(
        "/auth/register",
        credentials,
      );

      if (!data.token) {
        throw new AuthError(
          "Server hat kein Token bei der Registrierung zurückgegeben",
          "unknown",
        );
      }

      // Token speichern
      this.setToken(data.token);

      return data;
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }

      if (axios.isAxiosError(error)) {
        throw AuthError.fromAxiosError(error);
      }

      // Generische Fehler
      throw new AuthError(
        error instanceof Error
          ? error.message
          : "Unbekannter Fehler bei der Registrierung",
        "unknown",
        undefined,
        { originalError: error },
      );
    }
  }

  /**
   * Logout - Token zurücksetzen und aus Storage entfernen
   */
  public async logout(): Promise<void> {
    const token = this.getToken();

    if (token) {
      try {
        // Logout-Endpunkt aufrufen (optional - kann je nach API unterschiedlich sein)
        await this.client.post("/auth/logout");
      } catch (error) {
        console.warn(
          "Fehler beim Server-Logout - Token wird lokal gelöscht",
          error,
        );
      }
    }

    // Token-Informationen lokal entfernen
    this.clearAuth();
  }

  /**
   * Token aktualisieren, wenn es abläuft
   */
  public async refreshToken(): Promise<string> {
    // Wenn bereits ein Refresh läuft, dessen Promise wiederverwenden
    if (this.tokenRefreshPromise) {
      return this.tokenRefreshPromise;
    }

    const token = this.getToken();

    if (!token) {
      throw new AuthError(
        "Kein Token zum Aktualisieren vorhanden",
        "token_invalid",
      );
    }

    // Refresh-Promise erstellen und speichern
    this.tokenRefreshPromise = new Promise<string>(async (resolve, reject) => {
      try {
        const { data } = await this.client.post<{ token: string }>(
          "/auth/refresh",
        );

        if (!data.token) {
          throw new AuthError(
            "Kein neues Token vom Server erhalten",
            "token_invalid",
          );
        }

        // Neues Token speichern
        this.setToken(data.token);

        resolve(data.token);
      } catch (error) {
        // Token entfernen, da es ungültig ist
        this.clearAuth();

        if (error instanceof AuthError) {
          reject(error);
        } else if (axios.isAxiosError(error)) {
          reject(AuthError.fromAxiosError(error));
        } else {
          reject(
            new AuthError(
              "Fehler beim Token-Refresh",
              "token_invalid",
              undefined,
              { originalError: error },
            ),
          );
        }
      } finally {
        // Refresh-Promise zurücksetzen
        this.tokenRefreshPromise = null;
      }
    });

    return this.tokenRefreshPromise;
  }

  /**
   * Prüft, ob der Benutzer authentifiziert ist
   */
  public isAuthenticated(): boolean {
    const token = this.getToken();
    const expiry = this.tokenExpiry.value;

    // Prüfen, ob Token existiert und nicht abgelaufen ist
    if (!token) {
      return false;
    }

    if (expiry && expiry < Date.now()) {
      // Token ist abgelaufen, entfernen
      this.clearAuth();
      return false;
    }

    return true;
  }

  /**
   * Token aus dem aktuellen State abrufen
   */
  public getToken(): string | null {
    return this.tokenRef.value;
  }

  /**
   * Token im lokalen State und Storage speichern
   */
  private setToken(token: string): void {
    try {
      this.tokenRef.value = token;

      // Token im localStorage speichern
      localStorage.setItem(this.TOKEN_STORAGE_KEY, token);

      // Token-Ablaufzeit berechnen und speichern (z.B. 1 Stunde)
      // Im echten Einsatz sollte die Ablaufzeit aus dem JWT-Token extrahiert werden
      const expiryTime = Date.now() + 3600 * 1000; // 1 Stunde
      this.tokenExpiry.value = expiryTime;
      localStorage.setItem(this.TOKEN_EXPIRY_KEY, expiryTime.toString());
    } catch (error) {
      console.error("Fehler beim Speichern des Tokens:", error);
    }
  }

  /**
   * Token und zugehörige Daten entfernen
   */
  private clearAuth(): void {
    this.tokenRef.value = null;
    this.tokenExpiry.value = null;

    try {
      localStorage.removeItem(this.TOKEN_STORAGE_KEY);
      localStorage.removeItem(this.TOKEN_EXPIRY_KEY);
    } catch (error) {
      console.error("Fehler beim Löschen des Tokens:", error);
    }
  }

  /**
   * JWT-Token dekodieren
   * @param token JWT-Token
   * @returns Dekodierte Token-Payload oder null
   */
  public decodeToken(token: string): any | null {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
<<<<<<< HEAD
          .map((
=======
          .map(
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
            (c: any) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2),
          )
          .join(""),
      );

      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error("Fehler beim Dekodieren des Tokens:", error);
      return null;
    }
  }

  /**
   * Token-Ablaufzeit aus JWT-Token extrahieren
   * @param token JWT-Token
   * @returns Ablaufzeit in Millisekunden oder null
   */
  public getTokenExpiry(token: string): number | null {
    try {
      const decoded = this.decodeToken(token);

      if (decoded && decoded.exp) {
        // exp ist in Sekunden, wir brauchen Millisekunden
        return decoded.exp * 1000;
      }

      return null;
    } catch (error) {
      console.error("Fehler beim Extrahieren der Token-Ablaufzeit:", error);
      return null;
    }
  }

  /**
   * Prüft, ob das aktuelle Token noch gültig ist
   * @returns Promise, das zu true aufgelöst wird, wenn das Token gültig ist
   */
  public async validateToken(): Promise<boolean> {
    const token = this.getToken();

    if (!token) {
      return false;
    }

    try {
      // Token auf dem Server validieren
      await this.client.get("/auth/validate");
      return true;
    } catch (error) {
      // Bei 401/403 Token ungültig
      if (
        axios.isAxiosError(error) &&
        (error.response?.status === 401 || error.response?.status === 403)
      ) {
        this.clearAuth();
        return false;
      }

      // Bei Netzwerkfehlern nehmen wir an, dass das Token lokal gültig ist
      if (axios.isAxiosError(error) && !error.response) {
        console.warn(
          "Netzwerkfehler bei Token-Validierung - setze Token als gültig voraus",
        );
        return this.isAuthenticated();
      }

      // Bei anderen Fehlern werfen wir eine Exception
      throw AuthError.fromAxiosError(error as AxiosError);
    }
  }

  /**
   * Demo-Login mit Test-Benutzer
   * (Nützlich für Entwicklungs- und Testumgebungen)
   */
  public async demoLogin(): Promise<AuthResponse> {
    try {
      // In Produktion mit echten Backend-API-Calls
      const result = await this.login({
        email: "martin@danglefeet.com",
        password: "123",
        rememberMe: true,
      });
      return result;
    } catch (error) {
      console.error("Demo-Login fehlgeschlagen, verwende Fallback:", error);

      // Fallback für Testzwecke wenn API nicht verfügbar
      return {
        token: "demo-token-" + Date.now(),
        user: {
          id: "demo-user",
          email: "martin@danglefeet.com",
          username: "martin",
          displayName: "Martin (Demo)",
          role: "user",
        },
      };
    }
  }
}

// Export der Singleton-Instanz für einfache Verwendung
export default AuthService.getInstance();
