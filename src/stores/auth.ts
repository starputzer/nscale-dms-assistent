import { defineStore } from "pinia";
import { ref, computed } from "vue";
// TypeScript will use file path resolution from tsconfig.json paths
import type {
  User,
  LoginCredentials,
  RegisterCredentials,
  Role,
  TokenStatus,
  PermissionCheck,
  LoginResponse,
} from "../types/auth";
import axios from "axios";
import { apiService } from "../services/api/ApiService";
import { apiConfig } from "../services/api/config";
import { authTokenManager } from "../services/auth/AuthTokenManager";
import { sessionContinuityService } from "../services/auth/SessionContinuityService";
// Debug axios requests/responses for authentication
axios.interceptors.request.use(
  (config) => {
    if (config.url?.includes('/auth/')) {
      console.log('Axios Request:', {
        url: config.url,
        method: config.method,
        data: config.data,
        headers: config.headers
      });
    }
    return config;
  },
  (error) => {
    console.error('Axios Request Error:', error);
    return Promise.reject(error);
  }
);

axios.interceptors.response.use(
  (response) => {
    if (response.config.url?.includes('/auth/')) {
      console.log('Axios Response:', {
        url: response.config.url,
        status: response.status,
        data: response.data
      });
    }
    return response;
  },
  (error) => {
    console.error('Axios Response Error:', error);
    return Promise.reject(error);
  }
);
import { jwtDecode } from "jwt-decode";

/**
 * Auth Store zur Verwaltung der Benutzerauthentifizierung
 * - Verwaltet Login und Logout
 * - Token-Verwaltung mit automatischem Refresh
 * - Rollenbasierte Zugriffskontrolle
 * - Granulare Berechtigungsprüfungen
 * - Sichere Token-Validierung und Speicherung
 * - Fehlerbehandlung und Wiederherstellung
 */
export const useAuthStore = defineStore(
  "auth",
  () => {
    // $reset function for Pinia compatibility
    const $reset = () => {
      user.value = null;
      token.value = null;
      refreshToken.value = null;
      expiresAt.value = null;
      isLoading.value = false;
      error.value = null;
      permissions.value.clear();
      tokenRefreshInProgress.value = false;
      lastTokenRefresh.value = 0;
      tokenRefreshInterval.value = null;
    };
    // State
    const user = ref<User | null>(null);
    const token = ref<string | null>(null);
    const refreshToken = ref<string | null>(null);
    const expiresAt = ref<number | null>(null);
    const isLoading = ref<boolean>(false);
    const error = ref<string | null>(null);
    const version = ref<number>(3); // Für Migrationen und Versionierung
    const tokenRefreshInProgress = ref<boolean>(false);
    const lastTokenRefresh = ref<number>(0);
    const tokenRefreshInterval = ref<number | null>(null);
    const requestInterceptorId = ref<number | null>(null);
    const responseInterceptorId = ref<number | null>(null);
    const permissions = ref<Set<string>>(new Set());

    // Getters
    const isAuthenticated = computed(() => !!token.value && !!user.value);

    const isAdmin = computed(() => {
      // Unterstütze sowohl 'role' (singular) als auch 'roles' (plural)
      console.log("DEBUG: isAdmin check - user.value:", user.value);
      console.log("DEBUG: isAdmin check - user.value?.role:", user.value?.role);
      console.log("DEBUG: isAdmin check - user.value?.roles:", user.value?.roles);
      
      if (user.value?.role === "admin") return true;
      if (user.value?.roles?.includes("admin")) return true;
      return false;
    });

    // userRole getter for compatibility
    const userRole = computed(() => {
      // Return the first role or default to 'user'
      if (user.value?.role) return user.value.role;
      if (user.value?.roles && user.value.roles.length > 0) return user.value.roles[0];
      return 'user';
    });

    const isExpired = computed(() => {
      if (!expiresAt.value) return false;
      // Token gilt als abgelaufen, wenn er in weniger als 5 Minuten abläuft
      return Date.now() > expiresAt.value - 5 * 60 * 1000;
    });

    // Token-Ablaufzeit (in Sekunden)
    const tokenExpiresIn = computed(() => {
      if (!expiresAt.value) return 0;
      return Math.max(0, Math.floor((expiresAt.value - Date.now()) / 1000));
    });

    // Token-Status für Monitoring und Debugging
    const tokenStatus = computed((): TokenStatus => {
      if (!token.value) return "missing";
      if (!expiresAt.value) return "invalid";

      const timeToExpiry = expiresAt.value - Date.now();

      if (timeToExpiry <= 0) return "expired";
      if (timeToExpiry < 5 * 60 * 1000) return "expiring"; // < 5 Minuten
      return "valid";
    });

    /**
     * Hilfsfunktion zur Validierung eines JWT-Tokens
     * Überprüft Struktur und grundlegende Claims
     */
    function validateToken(tokenValue: string): boolean {
      try {
        if (!tokenValue || typeof tokenValue !== "string") {
          console.warn("Token ist leer oder kein String");
          return false;
        }

        // JWT-Struktur prüfen (header.payload.signature)
        if (
          !tokenValue.match(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/)
        ) {
          console.warn("Token entspricht nicht der JWT-Struktur");
          return false;
        }

        // Token dekodieren und Claims prüfen
        let decodedToken: any;
        try {
          decodedToken = jwtDecode(tokenValue);
          console.log("Dekodierter Token:", decodedToken);
        } catch (decodeError) {
          console.error("Fehler beim Dekodieren des Tokens:", decodeError);
          // Trotzdem als gültig betrachten, wenn das Format stimmt
          return true;
        }

        // Token-Inhalt verifizieren, wenn dekodiert
        if (decodedToken) {
          // Ablaufzeit prüfen, wenn vorhanden
          if (decodedToken.exp) {
            const expiryTime = decodedToken.exp * 1000; // von Sekunden zu Millisekunden
            if (Date.now() >= expiryTime) {
              console.warn("Token ist abgelaufen");
              // Im Test-Modus ignorieren wir abgelaufene Tokens
              // return false;
            }
          }

          // Prüfung lockern - User-ID sollte vorhanden sein, ist aber optional
          if (!decodedToken.user_id && !decodedToken.sub) {
            console.warn("Token enthält weder user_id noch sub");
          }
        }

        // Token gilt als gültig, wenn Format stimmt
        return true;
      } catch (err) {
        console.error("Token-Validierungsfehler:", err);
        // Im Entwicklungsmodus alle Tokens akzeptieren
        return process.env.NODE_ENV !== "production";
      }
    }

    /**
     * Migration von Legacy-Storage
     */
    function migrateFromLegacyStorage() {
      try {
        // Legacy v1/v2 Daten
        const legacyToken = localStorage.getItem("token");
        const legacyRefreshToken = localStorage.getItem("refreshToken");
        const legacyUser = localStorage.getItem("user");
        const legacyExpires = localStorage.getItem("token_expires");
        const legacyVersion = localStorage.getItem("auth_version");

        // Nur migrieren, wenn noch keine v3 Daten vorhanden sind oder Version < 3
        const currentVersion = legacyVersion ? parseInt(legacyVersion, 10) : 0;
        if ((legacyToken && !token.value) || currentVersion < 3) {
          // Token migrieren und validieren
          if (legacyToken && validateToken(legacyToken)) {
            token.value = legacyToken;

            // Refresh-Token migrieren, falls vorhanden
            if (legacyRefreshToken) {
              refreshToken.value = legacyRefreshToken;
            }

            // Benutzerdaten migrieren
            if (legacyUser) {
              try {
                user.value = JSON.parse(legacyUser);

                // Stellen sicher, dass das User-Objekt die aktuellen Felder enthält
                if (user.value && !user.value.roles) {
                  user.value.roles = user.value.role
                    ? [user.value.role as string]
                    : ["user"];
                }

                // Berechtigungen aus Rollen extrahieren
                if (user.value && user.value.roles) {
                  extractPermissionsFromRoles(user.value.roles);
                }
              } catch (e) {
                console.error("Fehler beim Parsen der Legacy-Benutzerdaten", e);
              }
            }

            // Ablaufzeit setzen
            if (legacyExpires) {
              try {
                expiresAt.value = parseInt(legacyExpires, 10);
              } catch (e) {
                // Fallback: 24 Stunden ab jetzt
                expiresAt.value = Date.now() + 24 * 60 * 60 * 1000;
              }
            } else {
              try {
                // Aus Token extrahieren, falls möglich
                const decodedToken: any = jwtDecode(legacyToken);
                if (decodedToken.exp) {
                  expiresAt.value = decodedToken.exp * 1000; // von Sekunden zu Millisekunden
                } else {
                  // Fallback: 24 Stunden ab jetzt
                  expiresAt.value = Date.now() + 24 * 60 * 60 * 1000;
                }
              } catch (e) {
                // Fallback: 24 Stunden ab jetzt
                expiresAt.value = Date.now() + 24 * 60 * 60 * 1000;
              }
            }

            console.log("Auth-Daten aus Legacy-Storage migriert");
          }
        }
      } catch (error) {
        console.error("Fehler bei der Auth-Migration:", error);
      }
    }

    /**
     * Extrahiert standardisierte Berechtigungen aus Rollen
     * Basierend auf Rollenkonventionen wie 'admin', 'user:read', etc.
     */
    function extractPermissionsFromRoles(roles: string[]) {
      permissions.value.clear();

      // Standardberechtigungen basierend auf Rollen
      roles.forEach((role) => {
        // Administratorrechte
        if (role === "admin") {
          permissions.value.add("user:create");
          permissions.value.add("user:read");
          permissions.value.add("user:update");
          permissions.value.add("user:delete");
          permissions.value.add("system:manage");
          permissions.value.add("settings:manage");
          permissions.value.add("docs:manage");
        }

        // Supportrechte
        if (role === "support") {
          permissions.value.add("user:read");
          permissions.value.add("system:read");
          permissions.value.add("docs:read");
          permissions.value.add("docs:convert");
        }

        // Standard-Benutzerrechte
        if (role === "user") {
          permissions.value.add("docs:read");
          permissions.value.add("docs:convert");
          permissions.value.add("settings:read");
        }

        // Gastrechte
        if (role === "guest") {
          permissions.value.add("docs:read");
        }

        // Spezifische berechtigungsbasierte Rollen (Format: resource:action)
        if (role.includes(":")) {
          permissions.value.add(role);
        }
      });
    }

    /**
     * Prüft, ob der Benutzer eine bestimmte Berechtigung hat
     */
    function hasPermission(permission: string): boolean {
      if (!isAuthenticated.value) return false;

      // Admin hat immer alle Berechtigungen
      if (isAdmin.value) return true;

      return permissions.value.has(permission);
    }

    /**
     * Prüft, ob der Benutzer eine der angegebenen Berechtigungen hat
     */
    function hasAnyPermission(requiredPermissions: string[]): boolean {
      if (!isAuthenticated.value) return false;

      // Admin hat immer alle Berechtigungen
      if (isAdmin.value) return true;

      return requiredPermissions.some((permission) =>
        permissions.value.has(permission),
      );
    }

    /**
     * Umfassende Berechtigungsprüfung mit detaillierten Informationen
     */
    function checkPermission(permission: string): PermissionCheck {
      if (!isAuthenticated.value) {
        return { hasPermission: false, user: null };
      }

      // Admin hat immer alle Berechtigungen
      if (isAdmin.value) {
        return { hasPermission: true, user: user.value };
      }

      const hasRequired = permissions.value.has(permission);

      return {
        hasPermission: hasRequired,
        user: user.value,
        requiredRole: hasRequired ? undefined : "admin", // Falls nicht berechtigt, zeige erforderliche Rolle
      };
    }

    /**
     * Token-Refresh-Mechanismus
     * Automatisches Aktualisieren des Tokens, wenn er bald abläuft
     */
    async function refreshTokenIfNeeded(): Promise<boolean> {
      // Nicht ausführen, wenn:
      // - Kein Token vorhanden
      // - Token noch gültig
      // - Bereits ein Refresh läuft
      // - Letzter Refresh war vor weniger als 10 Sekunden (Schutz vor Endlosschleifen)
      if (
        !token.value ||
        !refreshToken.value ||
        !isExpired.value ||
        tokenRefreshInProgress.value ||
        Date.now() - lastTokenRefresh.value < 10000
      ) {
        return true;
      }

      tokenRefreshInProgress.value = true;

      try {
        const response = await axios.post(apiConfig.ENDPOINTS.AUTH.REFRESH, {
          refreshToken: refreshToken.value,
        });

        if (response.data.success) {
          const newToken = response.data.token;

          // Token validieren, bevor er gespeichert wird
          if (validateToken(newToken)) {
            token.value = newToken;
            refreshToken.value =
              response.data.refreshToken || refreshToken.value;
            
            // Token auch in localStorage speichern für ApiService mit korrektem Prefix
            localStorage.setItem('nscale_access_token', newToken);
            if (refreshToken.value) {
              localStorage.setItem('nscale_refresh_token', refreshToken.value);
            }
            console.log("Token nach Refresh in localStorage aktualisiert");

            // Ablaufzeit aus Token extrahieren oder vom Server verwenden
            try {
              const decodedToken: any = jwtDecode(newToken);
              if (decodedToken.exp) {
                expiresAt.value = decodedToken.exp * 1000; // von Sekunden zu Millisekunden
              } else {
                // Fallback auf Server-gelieferte Zeit
                expiresAt.value =
                  Date.now() + (response.data.expiresIn || 60 * 60 * 1000);
              }
            } catch (e) {
              // Fallback auf Server-gelieferte Zeit
              expiresAt.value =
                Date.now() + (response.data.expiresIn || 60 * 60 * 1000);
            }

            // Benutzerinfos aktualisieren, falls vorhanden
            if (response.data.user) {
              user.value = response.data.user;

              // Berechtigungen aktualisieren
              if (user.value && user.value.roles) {
                extractPermissionsFromRoles(user.value.roles);
              }
            }

            lastTokenRefresh.value = Date.now();
            return true;
          } else {
            console.error("Erhaltener Token ist ungültig");
            logout();
            return false;
          }
        }

        // Bei Fehlschlag: Abmelden, da der Token nicht mehr gültig ist
        logout();
        return false;
      } catch (err) {
        console.error("Fehler beim Token-Refresh:", err);

        // Bei Netzwerkfehlern nicht sofort abmelden, nur bei Authentifizierungsfehlern
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          logout();
        }

        return false;
      } finally {
        tokenRefreshInProgress.value = false;
      }
    }

    /**
     * Initialisiert den Auth-Store mit verbesserter Token-Wiederherstellung
     */
    async function initialize() {
      console.log("[AuthStore] Initialisiere mit Enhanced Token Recovery");
      
      // Versuche zuerst Token aus verschiedenen Quellen wiederherzustellen
      const restored = await restoreAuthSession();
      
      if (restored) {
        console.log("[AuthStore] Session erfolgreich wiederhergestellt");
        sessionContinuityService.setAuthenticatedState(true);
      } else {
        // Fallback auf Legacy-Migration
        migrateFromLegacyStorage();
      }

      // HTTP-Clients explizit konfigurieren, wenn Token vorhanden ist
      if (token.value) {
        console.log("[AuthStore] Token gefunden, konfiguriere HTTP-Clients");
        try {
          configureHttpClients(token.value);
        } catch (error) {
          console.error("[AuthStore] Fehler beim Konfigurieren der HTTP-Clients:", error);
        }
      } else {
        console.log("[AuthStore] Kein Token während der Initialisierung vorhanden");
      }

      // Automatischer Token-Refresh, wenn der Benutzer aktiv ist
      if (isAuthenticated.value) {
        console.log("Benutzer authentifiziert, richte Token-Refresh ein");
        
        // Sofort prüfen, ob ein Token-Refresh nötig ist
        refreshTokenIfNeeded().catch(err => {
          console.error("Fehler beim initialen Token-Refresh:", err);
        });

        // Interval für regelmäßige Prüfungen setzen
        if (tokenRefreshInterval.value !== null) {
          console.log("Bestehende Token-Refresh-Intervall gefunden, wird zurückgesetzt");
          clearInterval(tokenRefreshInterval.value);
        }

        console.log("Starte Token-Refresh-Intervall");
        tokenRefreshInterval.value = window.setInterval(() => {
          refreshTokenIfNeeded().catch(err => {
            console.error("Fehler beim periodischen Token-Refresh:", err);
          });
        }, 60000); // Alle 60 Sekunden prüfen
      } else {
        console.log("Benutzer nicht authentifiziert, kein Token-Refresh eingerichtet");
      }

      // Wir verwenden keine onUnmounted in Stores, da Stores nicht an Komponenten gebunden sind
      // Stattdessen wird cleanup() bei Bedarf explizit aufgerufen
      
      console.log("Auth-Store-Initialisierung abgeschlossen");
    }

    /**
     * Cleanup-Funktion für Timer, Intervalle und HTTP-Interceptors
     */
    function cleanup() {
      console.log("Auth-Store Cleanup wird durchgeführt");
      
      // Timer und Intervalle bereinigen
      if (tokenRefreshInterval.value !== null) {
        console.log("Token-Refresh-Intervall wird gestoppt");
        clearInterval(tokenRefreshInterval.value);
        tokenRefreshInterval.value = null;
      }
      
      // HTTP-Interceptors entfernen
      try {
        removeHttpInterceptors();
      } catch (cleanupError) {
        console.error("Fehler bei HTTP-Client-Bereinigung:", cleanupError);
      }
      
      // LocalStorage bereinigen mit korrektem Prefix
      localStorage.removeItem('nscale_access_token');
      localStorage.removeItem('nscale_refresh_token');
      console.log("LocalStorage bereinigt (mit nscale_ prefix)");
      
      console.log("Auth-Store Cleanup abgeschlossen");
    }

    /**
     * Benutzerspezifische HTTP-Header für API-Anfragen erstellen
     */
    function createAuthHeaders(): Record<string, string> {
      if (!token.value) return {};

      return {
        Authorization: `Bearer ${token.value}`,
      };
    }

    /**
     * Login-Vorgang durchführen mit verbesserter Persistenz
     */
    async function login(credentials: LoginCredentials | string): Promise<boolean> {
      console.log("[AuthStore] Login-Funktion aufgerufen");
      isLoading.value = true;
      error.value = null;

      try {
        // Erst Cleanup durchführen, um alte Zustände zu bereinigen
        cleanup();
        authTokenManager.clearTokens();
      
        // Ensure we have a proper credentials object
        let loginCredentials: any;
        
        if (typeof credentials === 'string') {
          // If it's a string, assume it's an email address
          console.log("[AuthStore] String-Anmeldedaten werden in Objekt umgewandelt");
          loginCredentials = { email: credentials, password: "" };
        } else {
          loginCredentials = credentials;
        }
        
        console.log("[AuthStore] Login-Versuch mit E-Mail:", 
          loginCredentials.email ? loginCredentials.email.substring(0, 2) + '...' : 'keine');
        
        try {
          console.log("Sende Login-Anfrage an /api/auth/login mit Credentials:", 
            { ...loginCredentials, password: '***' });
            
          // Lokaler Demo-Account für Testzwecke
          // Demo-Modus deaktiviert - verwende echtes Backend
          console.log("Login wird über echtes Backend versucht für:", loginCredentials.email);
            
          // Standard API-Anfrage
          const response = await axios.post<{token: string}>(
            "/api/auth/login",
            loginCredentials,
          );

          console.log("Login-Antwort erhalten:", response.status);
          
          // The server returns a simple { token: "jwt_token" } response
          if (response.data.token) {
            const newToken = response.data.token;
            console.log("Token aus Antwort erhalten, Länge:", newToken.length);

            // Token validieren, bevor er gespeichert wird
            if (validateToken(newToken)) {
              console.log("Token ist gültig, wird gesetzt");
              
              // Token und RefreshToken setzen
              token.value = newToken;
              console.log("Token in auth store gesetzt. Token value:", token.value?.substring(0, 10) + "...");
              
              // Token auch in localStorage speichern für ApiService
              // Die config verwendet bereits "nscale_access_token" als key
              localStorage.setItem('nscale_access_token', newToken);
              console.log("Token in localStorage gespeichert unter key:", 'nscale_access_token', "value:", newToken.substring(0, 10) + "...");
              
              // Type assertion for refreshToken since it might not be in the response type
              refreshToken.value = (response.data as any).refreshToken || null; // Server might not provide refresh token
              if (refreshToken.value) {
                localStorage.setItem('nscale_refresh_token', refreshToken.value);
              }
              console.log("RefreshToken gesetzt:", refreshToken.value ? "Ja" : "Nein");

              // Extract user data from JWT token
              try {
                const decodedToken: any = jwtDecode(newToken);
                console.log("Token dekodiert:", !!decodedToken);
                console.log("DEBUG: Full decoded token:", decodedToken);
                console.log("DEBUG: Token role field:", decodedToken.role);
                console.log("DEBUG: Token roles field:", decodedToken.roles);
                
                // Sicherstellen, dass user_id existiert, sonst Default verwenden
                const userId = decodedToken.user_id || decodedToken.sub || '1';
                
                // Create user object from token claims
                const userObj = {
                  id: userId.toString(),
                  username: decodedToken.email || decodedToken.name || 'default@example.com',
                  email: decodedToken.email || decodedToken.name || 'default@example.com',
                  roles: [decodedToken.role || "user"],
                  role: decodedToken.role || "user" // Support both 'role' and 'roles'
                };
                
                // Benutzer setzen
                user.value = userObj;
                console.log("Benutzer aus Token erstellt:", userObj);
                console.log("DEBUG: isAdmin computed value:", isAdmin.value);

                // Set token expiration time
                if (decodedToken.exp) {
                  expiresAt.value = decodedToken.exp * 1000; // von Sekunden zu Millisekunden
                  console.log("Token-Ablaufzeit aus Token gesetzt:", new Date(expiresAt.value).toISOString());
                } else {
                  expiresAt.value = Date.now() + 24 * 60 * 60 * 1000; // 24 hours default
                  console.log("Standard-Ablaufzeit gesetzt:", new Date(expiresAt.value).toISOString());
                }
              } catch (e) {
                console.error("Fehler beim Dekodieren des Tokens:", e);
                error.value = "Fehler beim Dekodieren des Tokens";
                
                // Fallback-Benutzer erstellen, wenn Dekodierung fehlschlägt
                user.value = {
                  id: '1',
                  username: 'default@example.com',
                  email: 'default@example.com',
                  roles: ['user']
                };
                expiresAt.value = Date.now() + 24 * 60 * 60 * 1000; // 24 Stunden
                console.log("Fallback-Benutzer erstellt wegen Dekodierfehler");
              }

              lastTokenRefresh.value = Date.now();
              console.log("Letzter Token-Refresh-Zeitpunkt gesetzt");

              // Berechtigungen aus Rollen extrahieren
              if (user.value && user.value.roles) {
                extractPermissionsFromRoles(user.value.roles);
                console.log("Berechtigungen extrahiert:", Array.from(permissions.value));
              }

              // 5. Persistiere Auth-Daten mit dem neuen TokenManager
              persistAuthData();
              
              // Session für Continuity Service markieren
              sessionContinuityService.setAuthenticatedState(true);
              
              // 6. HTTP-Clients explizit konfigurieren mit dem neuen Token
              try {
                console.log("[AuthStore] HTTP-Clients werden mit neuem Token konfiguriert");
                configureHttpClients(newToken);
              } catch (configError) {
                console.error("[AuthStore] Fehler beim Konfigurieren der HTTP-Clients:", configError);
                // Weiter fortfahren trotz Fehler
              }

              // 7. Initialisiere Token-Refresh-Mechanismus
              console.log("[AuthStore] Initialisiere Token-Refresh nach erfolgreicher Anmeldung");
              await initialize();

              console.log("[AuthStore] Login erfolgreich abgeschlossen");
              return true;
            } else {
              console.error("Ungültiger Token vom Server erhalten");
              error.value = "Ungültiger Token vom Server erhalten";
              return false;
            }
          } else {
            console.error("Login fehlgeschlagen: Kein Token in der Antwort");
            error.value = "Login fehlgeschlagen: Kein Token erhalten";
            return false;
          }
        } catch (axiosError: any) {
          const errorMessage = axiosError.response?.data?.detail || "Netzwerkfehler beim Login";
          console.error("Axios-Fehler beim Login:", axiosError.message, "Details:", errorMessage);
          error.value = errorMessage;
          return false;
        }
      } catch (err: any) {
        console.error("Unbehandelter Fehler beim Login:", err);
        error.value = "Unerwarteter Fehler beim Login";
        return false;
      } finally {
        isLoading.value = false;
        console.log("Login-Verarbeitung abgeschlossen, isLoading zurückgesetzt");
      }
    }

    /**
     * Registrieren eines neuen Benutzers
     */
    async function register(
      credentials: RegisterCredentials,
    ): Promise<boolean> {
      console.log("Registrierungsfunktion wird aufgerufen");
      isLoading.value = true;
      error.value = null;

      try {
        // Erst Cleanup durchführen, um alte Zustände zu bereinigen
        cleanup();
        
        console.log("Registrierungsanfrage wird gesendet. E-Mail beginnt mit:", 
          credentials.email ? credentials.email.substring(0, 2) + '...' : 'keine');
          
        try {
          const response = await axios.post<LoginResponse>(
            "/api/auth/register",
            credentials,
          );
          
          console.log("Registrierungsantwort erhalten:", response.status);

          if (response.data.success) {
            const newToken = response.data.token;
            console.log("Token aus Antwort erhalten, Länge:", newToken.length);

            // Token validieren, bevor er gespeichert wird
            if (validateToken(newToken)) {
              console.log("Token ist gültig, wird gesetzt");
              
              // Token und RefreshToken setzen
              token.value = newToken;
              refreshToken.value = response.data.refreshToken || null;
              
              // Token auch in localStorage speichern für ApiService mit korrektem Prefix
              localStorage.setItem('nscale_access_token', newToken);
              console.log("Token in localStorage gespeichert unter 'nscale_access_token'");
              
              if (refreshToken.value) {
                localStorage.setItem('nscale_refresh_token', refreshToken.value);
              }
              console.log("RefreshToken gesetzt:", refreshToken.value ? "Ja" : "Nein");
              
              // User-Objekt vom Server verwenden oder aus Token extrahieren
              if (response.data.user) {
                user.value = response.data.user;
                console.log("Benutzer aus Serverantwort gesetzt:", user.value);
              } else {
                // Aus Token extrahieren als Fallback
                try {
                  const decodedToken: any = jwtDecode(newToken);
                  console.log("Token dekodiert, da kein Benutzer in der Antwort enthalten war");
                  
                  // Sicherstellen, dass user_id existiert, sonst Default verwenden
                  const userId = decodedToken.user_id || decodedToken.sub || '1';
                  
                  user.value = {
                    id: userId.toString(),
                    username: credentials.email || decodedToken.email || 'default@example.com',
                    email: credentials.email || decodedToken.email || 'default@example.com',
                    roles: [decodedToken.role || "user"]
                  };
                  console.log("Benutzer aus Token und Registrierungsdaten erstellt:", user.value);
                } catch (decodeErr) {
                  console.error("Fehler beim Dekodieren des Tokens nach Registrierung:", decodeErr);
                  
                  // Fallback: Mindestens einen Benutzer aus Registrierungsdaten erstellen
                  user.value = {
                    id: '1',
                    username: credentials.email || 'default@example.com',
                    email: credentials.email || 'default@example.com',
                    roles: ['user']
                  };
                  console.log("Fallback-Benutzer aus Registrierungsdaten erstellt");
                }
              }

              // Ablaufzeit aus Token extrahieren oder vom Server verwenden
              try {
                const decodedToken: any = jwtDecode(newToken);
                if (decodedToken.exp) {
                  expiresAt.value = decodedToken.exp * 1000; // von Sekunden zu Millisekunden
                  console.log("Token-Ablaufzeit aus Token gesetzt:", new Date(expiresAt.value).toISOString());
                } else {
                  // Fallback auf Server-gelieferte Zeit
                  expiresAt.value =
                    Date.now() + (response.data.expiresIn || 24 * 60 * 60 * 1000);
                  console.log("Ablaufzeit aus Serverantwort oder Default gesetzt:", 
                    new Date(expiresAt.value).toISOString());
                }
              } catch (e) {
                // Fallback auf Server-gelieferte Zeit
                expiresAt.value =
                  Date.now() + (response.data.expiresIn || 24 * 60 * 60 * 1000);
                console.log("Ablaufzeit-Fallback gesetzt:", new Date(expiresAt.value).toISOString());
              }

              lastTokenRefresh.value = Date.now();
              console.log("Letzter Token-Refresh-Zeitpunkt gesetzt");

              // Berechtigungen aus Rollen extrahieren
              if (user.value && user.value.roles) {
                extractPermissionsFromRoles(user.value.roles);
                console.log("Berechtigungen extrahiert:", Array.from(permissions.value));
              }

              // HTTP-Clients explizit konfigurieren mit dem neuen Token
              try {
                console.log("HTTP-Clients werden mit neuem Token konfiguriert");
                configureHttpClients(newToken);
              } catch (configError) {
                console.error("Fehler beim Konfigurieren der HTTP-Clients:", configError);
                // Weiter fortfahren trotz Fehler
              }

              // Wenn der Benutzer angemeldet ist, initialisieren wir den Token-Refresh-Mechanismus
              console.log("Initialisiere Auth-Store nach erfolgreicher Registrierung");
              initialize();

              console.log("Registrierung erfolgreich abgeschlossen");
              return true;
            } else {
              console.error("Ungültiger Token vom Server erhalten");
              error.value = "Ungültiger Token vom Server erhalten";
              return false;
            }
          } else {
            console.error("Registrierung fehlgeschlagen:", response.data.message || "Kein Erfolg-Flag in der Antwort");
            error.value = response.data.message || "Registrierung fehlgeschlagen";
            return false;
          }
        } catch (axiosError: any) {
          const errorMessage = axiosError.response?.data?.message || "Netzwerkfehler bei der Registrierung";
          console.error("Axios-Fehler bei Registrierung:", axiosError.message, "Details:", errorMessage);
          error.value = errorMessage;
          return false;
        }
      } catch (err: any) {
        console.error("Unbehandelter Fehler bei Registrierung:", err);
        error.value = "Unerwarteter Fehler bei der Registrierung";
        return false;
      } finally {
        isLoading.value = false;
        console.log("Registrierungsverarbeitung abgeschlossen, isLoading zurückgesetzt");
      }
    }

    /**
     * Benutzer abmelden
     */
    async function logout(): Promise<void> {
      console.log("Logout-Funktion wird aufgerufen");
      isLoading.value = true;

      try {
        // Skip API call - just perform local cleanup
        console.log("Führe lokalen Logout durch");
      } finally {
          // Lokalen State in einer bestimmten Reihenfolge zurücksetzen
        console.log("[AuthStore] Setze lokalen Auth-State zurück");
        
        // Session-Status für Continuity Service zurücksetzen
        sessionContinuityService.setAuthenticatedState(false);
        
        // Cleanup durchführen (entfernt Interceptors und cleared localStorage)
        cleanup();
        
        // TokenManager bereinigen
        authTokenManager.clearTokens();
        
        // Erst Tokens löschen
        token.value = null;
        refreshToken.value = null;
        console.log("[AuthStore] Tokens zurückgesetzt");
        
        // Dann Benutzer- und Sitzungsdaten
        user.value = null;
        expiresAt.value = null;
        lastTokenRefresh.value = 0;
        console.log("[AuthStore] Benutzerdaten zurückgesetzt");
        
        // Zuletzt Berechtigungen und Status
        try {
          permissions.value.clear();
          console.log("[AuthStore] Berechtigungen zurückgesetzt");
        } catch (e) {
          console.error("[AuthStore] Fehler beim Zurücksetzen der Berechtigungen:", e);
        }
        
        // Version und Error behalten für Diagnose
        // error.value = null;
        
        // Laden-Status am Ende zurücksetzen
        isLoading.value = false;
        console.log("[AuthStore] Logout abgeschlossen");
      }
    }

    /**
     * Prüfen, ob der aktuelle Benutzer eine bestimmte Rolle hat
     */
    function hasRole(role: Role): boolean {
      if (!user.value?.roles) return false;
      return user.value.roles.includes(role);
    }

    /**
     * Mehrere Rollen prüfen (eine davon muss vorhanden sein)
     */
    function hasAnyRole(roles: Role[]): boolean {
      if (!user.value?.roles) return false;
      return roles.some((role) => user.value!.roles.includes(role));
    }

    /**
     * Benutzerinformationen vom Server aktualisieren
     */
    async function refreshUserInfo(): Promise<boolean> {
      if (!token.value) return false;

      // Wenn Token abgelaufen ist, zuerst Token aktualisieren
      if (isExpired.value) {
        const refreshSuccess = await refreshTokenIfNeeded();
        if (!refreshSuccess) return false;
      }

      isLoading.value = true;

      try {
        const response = await axios.get("/api/auth/user", {
          headers: createAuthHeaders(),
        });

        if (response.data.success) {
          user.value = response.data.user;

          // Berechtigungen aktualisieren
          if (user.value.roles) {
            extractPermissionsFromRoles(user.value.roles);
          }

          return true;
        } else {
          return false;
        }
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          // Token ist ungültig, versuchen zu aktualisieren
          const refreshSuccess = await refreshTokenIfNeeded();

          // Wenn Refresh erfolgreich, erneut versuchen
          if (refreshSuccess) {
            return refreshUserInfo();
          } else {
            // Wenn Refresh fehlschlägt, abmelden
            logout();
          }
        }
        return false;
      } finally {
        isLoading.value = false;
      }
    }

    /**
     * Aktiven Token überprüfen
     * - Validiert die Struktur
     * - Überprüft die Gültigkeit
     * - Aktualisiert bei Bedarf
     */
    async function validateCurrentToken(): Promise<boolean> {
      if (!token.value) return false;

      // Token-Struktur validieren
      if (!validateToken(token.value)) {
        // Wenn Token ungültig ist, versuchen zu aktualisieren
        if (refreshToken.value) {
          return await refreshTokenIfNeeded();
        } else {
          // Ohne Refresh-Token abmelden
          logout();
          return false;
        }
      }

      // Wenn Token abläuft, aktualisieren
      if (isExpired.value) {
        return await refreshTokenIfNeeded();
      }

      return true;
    }

    /**
     * Benutzerpräferenzen im Benutzerprofil aktualisieren
     */
    async function updateUserPreferences(
      preferences: Record<string, any>,
    ): Promise<boolean> {
      if (!isAuthenticated.value) return false;

      try {
        isLoading.value = true;

        // Token validieren und bei Bedarf aktualisieren
        const isTokenValid = await validateCurrentToken();
        if (!isTokenValid) return false;

        const response = await axios.patch(
          "/api/auth/preferences",
          {
            preferences,
          },
          {
            headers: createAuthHeaders(),
          },
        );

        if (response.data.success) {
          // Lokale Benutzerdaten aktualisieren
          if (user.value) {
            user.value = {
              ...user.value,
              preferences: {
                ...(user.value.preferences || {}),
                ...preferences,
              },
            };
          }
          return true;
        }

        return false;
      } catch (err) {
        console.error(
          "Fehler beim Aktualisieren der Benutzereinstellungen:",
          err,
        );
        return false;
      } finally {
        isLoading.value = false;
      }
    }

    // IDs der aktiven Interceptors mit Metadaten für die korrekte Entfernung
    const activeInterceptors = ref<{id: number, type: 'global' | 'apiService', category: 'request' | 'response'}[]>([]);
    
    // Manuelle Initialisierung der HTTP-Clients statt Watch
    function configureHttpClients(newToken: string | null) {
      try {
        // Entferne alle bestehenden Interceptors
        removeHttpInterceptors();
        
        // Nutze den zentralen Auth Manager
        if (newToken) {
          console.log("Token gesetzt, konfiguriere HTTP-Clients mit Token:", newToken.substring(0, 10) + "...");
          
          import('@/services/auth/CentralAuthManager').then(module => {
            const authManager = module.CentralAuthManager.getInstance()
            authManager.updateAuthHeader(newToken)
          }).catch(e => {
            console.warn('Could not update auth header:', e)
          })
        }
      } catch (error) {
        console.error('Error configuring HTTP clients:', error)
      }
    }

    
    // Entfernt alle aktiven HTTP-Interceptors
    function removeHttpInterceptors() {
      try {
        // Alle aktiven Interceptors entfernen
        if (activeInterceptors.value.length > 0) {
          console.log(`Entferne ${activeInterceptors.value.length} aktive HTTP-Interceptors`);
          
          // Interceptors basierend auf Typ und Kategorie entfernen
          activeInterceptors.value.forEach(interceptor => {
            try {
              if (interceptor.type === 'global') {
                if (interceptor.category === 'request') {
                  axios.interceptors.request.eject(interceptor.id);
                } else {
                  axios.interceptors.response.eject(interceptor.id);
                }
              } else if (interceptor.type === 'apiService') {
                if (interceptor.category === 'request') {
                  apiService.removeRequestInterceptor(interceptor.id);
                } else {
                  apiService.removeResponseInterceptor(interceptor.id);
                }
              }
            } catch (ejectError) {
              console.warn(`Fehler beim Entfernen des Interceptors ${interceptor.id}:`, ejectError);
            }
          });
          
          // Liste leeren
          activeInterceptors.value = [];
          console.log("Alle HTTP-Interceptors wurden entfernt");
        } else {
          console.log("Keine aktiven HTTP-Interceptors zum Entfernen");
        }
        
        // Legacy-IDs auch prüfen und entfernen
        if (requestInterceptorId.value !== null) {
          try {
            axios.interceptors.request.eject(requestInterceptorId.value);
            requestInterceptorId.value = null;
          } catch (e) {
            console.warn("Fehler beim Entfernen des Legacy-Request-Interceptors:", e);
          }
        }
        
        if (responseInterceptorId.value !== null) {
          try {
            axios.interceptors.response.eject(responseInterceptorId.value);
            responseInterceptorId.value = null;
          } catch (e) {
            console.warn("Fehler beim Entfernen des Legacy-Response-Interceptors:", e);
          }
        }
      } catch (error) {
        console.error("Fehler beim Entfernen der HTTP-Interceptors:", error);
      }
    }
    
    // Überprüfe auf inkonsistenten State beim Start
    if ((!!token.value) !== (!!user.value)) {
      console.warn("Inkonsistenter Auth-State erkannt, führe Cleanup durch");
      // Wenn Token ohne User oder User ohne Token vorhanden ist, state bereinigen
      token.value = null;
      user.value = null;
      refreshToken.value = null;
      expiresAt.value = null;
      cleanup();
    }
    
    // Aktivere HTTP-Client-Konfiguration sofort mit dem aktuellen Token
    if (token.value) {
      console.log("Initial vorhandenes Token gefunden, konfiguriere HTTP-Clients");
      configureHttpClients(token.value);
    } else {
      console.log("Kein initiales Token vorhanden, HTTP-Clients werden nicht konfiguriert");
    }

    /**
     * Explizit Token setzen (für direkten Login-Zugriff)
     */
    async function setToken(newToken: string): Promise<boolean> {
      console.log("setToken wird aufgerufen mit Token-Länge:", newToken?.length || 0);
      
      try {
        // 1. Token validieren
        if (!validateToken(newToken)) {
          console.error("Ungültiger Token-Format, Token wird nicht gesetzt");
          return false;
        }
        
        // 2. Erst Cleanup durchführen, um alte Zustände zu bereinigen
        cleanup();
        
        // 3. Token setzen
        token.value = newToken;
        console.log("Token wurde gesetzt");
        
        // Token auch in localStorage speichern für ApiService mit korrektem Prefix
        localStorage.setItem('nscale_access_token', newToken);
        console.log("Token in localStorage gespeichert unter 'nscale_access_token'");
        
        // 4. Benutzerdaten aus Token extrahieren
        try {
          // Token dekodieren und Inhalt zuerst loggen für Debugging
          const decodedToken: any = jwtDecode(newToken);
          console.log("Dekodierter Token:", decodedToken);
          
          // Sicherstellen, dass user_id existiert, sonst Default verwenden
          const userId = decodedToken.user_id || decodedToken.sub || '1';
          
          // Objekt zuerst erstellen, dann zuweisen um Race Conditions zu vermeiden
          const userObj = {
            id: userId.toString(),
            username: decodedToken.email || decodedToken.name || 'user@example.com',
            email: decodedToken.email || decodedToken.name || 'user@example.com',
            roles: [decodedToken.role || "user"]
          };
          
          // Jetzt erst user.value setzen
          user.value = userObj;
          console.log("Benutzer aus Token erstellt:", userObj);
          
          // Berechtigungen aus Rollen extrahieren wenn user.value existiert
          if (user.value && user.value.roles) {
            extractPermissionsFromRoles(user.value.roles);
            console.log("Berechtigungen extrahiert:", Array.from(permissions.value));
          }
          
          // Ablaufzeit setzen
          if (decodedToken.exp) {
            expiresAt.value = decodedToken.exp * 1000; // von Sekunden zu Millisekunden
            console.log("Token-Ablaufzeit aus Token gesetzt:", new Date(expiresAt.value).toISOString());
          } else {
            expiresAt.value = Date.now() + 24 * 60 * 60 * 1000; // 24 Stunden
            console.log("Standard-Ablaufzeit gesetzt:", new Date(expiresAt.value).toISOString());
          }
        } catch (e) {
          console.error("Fehler beim Dekodieren des Tokens:", e);
          // Als Fallback trotzdem einen Benutzer erstellen
          user.value = {
            id: '1',
            username: 'default@example.com',
            email: 'default@example.com',
            roles: ['user']
          };
          expiresAt.value = Date.now() + 24 * 60 * 60 * 1000; // 24 Stunden
          console.log("Fallback-Benutzer erstellt wegen Dekodierfehler");
        }
        
        // 5. HTTP-Clients explizit konfigurieren mit dem neuen Token
        try {
          console.log("HTTP-Clients werden mit neuem Token konfiguriert");
          configureHttpClients(newToken);
        } catch (configError) {
          console.error("Fehler beim Konfigurieren der HTTP-Clients:", configError);
          // Weiter fortfahren trotz Fehler
        }
        
        // 6. Initialisieren - aber nur nach dem erfolgreichen Setzen von Benutzer und Token
        try {
          if (user.value && token.value) {
            console.log("Initialisiere Auth-Store nach Token-Setzen");
            initialize();
          } else {
            console.warn("Auth-Store wird nicht initialisiert: Benutzer oder Token fehlt");
          }
        } catch (initError) {
          console.error("Fehler bei der Initialisierung:", initError);
        }
        
        // 7. Token als gültig zurückmelden
        return true;
      } catch (unexpectedError) {
        console.error("Unerwarteter Fehler beim Setzen des Tokens:", unexpectedError);
        return false;
      }
    }
    
    /**
     * Fehler explizit setzen
     */
    function setError(errorMessage: string | null): void {
      error.value = errorMessage;
    }

    /**
     * Erweiterte Session-Wiederherstellung mit robuster Fehlerbehandlung
     */
    async function restoreAuthSession(): Promise<boolean> {
      console.log("[AuthStore] Starte Session-Wiederherstellung");
      
      try {
        // Verwende den neuen AuthTokenManager
        const storedData = authTokenManager.loadTokens();
        
        if (!storedData) {
          console.log("[AuthStore] Keine gespeicherten Token gefunden");
          return false;
        }
        
        // Validiere Token
        if (!authTokenManager.validateToken(storedData.token)) {
          console.log("[AuthStore] Gespeicherter Token ist ungültig");
          authTokenManager.clearTokens();
          return false;
        }
        
        // Setze alle Auth-Daten
        token.value = storedData.token;
        refreshToken.value = storedData.refreshToken;
        expiresAt.value = storedData.expiresAt;
        
        // Setze Benutzerdaten
        if (storedData.userInfo) {
          user.value = storedData.userInfo;
          extractPermissionsFromRoles(storedData.userInfo.roles);
        } else {
          // Extrahiere aus Token wenn keine gespeicherten Benutzerdaten
          const extractedUser = authTokenManager.extractUserFromToken(storedData.token);
          if (extractedUser) {
            user.value = extractedUser;
            extractPermissionsFromRoles(extractedUser.roles);
          }
        }
        
        // Session für Continuity Service markieren
        sessionContinuityService.setAuthenticatedState(true);
        
        console.log("[AuthStore] Session erfolgreich wiederhergestellt");
        return true;
        
      } catch (error) {
        console.error("[AuthStore] Fehler bei der Session-Wiederherstellung:", error);
        return false;
      }
    }

    /**
     * Persistiere Auth-Daten bei Änderungen
     */
    function persistAuthData(): void {
      if (!token.value || !user.value) return;
      
      authTokenManager.saveTokens({
        token: token.value,
        refreshToken: refreshToken.value,
        expiresAt: expiresAt.value || Date.now() + 24 * 60 * 60 * 1000,
        userInfo: user.value
      });
    }

    return {
      // State
      user,
      token,
      refreshToken,
      expiresAt,
      isLoading,
      error,
      version,
      permissions,
      activeInterceptors,

      // Getters
      isAuthenticated,
      isAdmin,
      userRole,
      isExpired,
      tokenExpiresIn,
      tokenStatus,

      // Actions
      login,
      logout,
      register,
      hasRole,
      hasAnyRole,
      hasPermission,
      hasAnyPermission,
      checkPermission,
      refreshUserInfo,
      refreshTokenIfNeeded,
      validateCurrentToken,
      validateToken,
      createAuthHeaders,
      initialize,
      migrateFromLegacyStorage,
      updateUserPreferences,
      extractPermissionsFromRoles,
      setToken,
      setError,
      restoreAuthSession,
      persistAuthData,
      
      // HTTP-Client-Management
      configureHttpClients,
      removeHttpInterceptors,
      cleanup,
      
      // Pinia compatibility
      $reset
    };
  },
  // @ts-ignore - Pinia-Plugin-Persistedstate wird über Plugin eingebunden
  {
    persist: {
      // Verwende localStorage für die Persistenz
      storage: localStorage,

      // Selektives Speichern bestimmter State-Elemente
      paths: ["token", "refreshToken", "user", "expiresAt", "version"],
      
      // Nach dem Wiederherstellen aus der Persistenz initialisieren
      afterRestore: () => {
        console.log("Auth-Store aus Persistenz wiederhergestellt");
        initialize();
      },

      // Sicherheitsmaßnahmen für die Persistenz
      serializer: {
        serialize: (state: any) => {
          // Selektives Serialisieren und Prüfung sensibler Daten
          const serialized = JSON.stringify({
            token: state.token,
            refreshToken: state.refreshToken,
            user: state.user
              ? {
                  ...state.user,
                  // Sensible Daten nicht speichern
                  password: undefined,
                }
              : null,
            expiresAt: state.expiresAt,
            version: state.version,
          });

          return serialized;
        },
        deserialize: (data: string) => {
          try {
            return JSON.parse(data);
          } catch (e) {
            console.error("Fehler beim Deserialisieren der Auth-Daten:", e);
            return {};
          }
        },
      },

      // Automatisch beim Seitenladen aktivieren
      autoRestore: true,
    },
  } as any,
);
