/**
 * UserStore - Spezialisierter Store für Benutzerauthentifizierung
 * 
 * Diese Datei definiert einen generischen Store für Benutzerauthentifizierung
 * und Benutzerdaten-Management mit standardisierten Funktionen für 
 * Anmeldung, Abmeldung, Benutzeraktualisierung und Berechtigungsprüfungen.
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { jwtDecode } from 'jwt-decode';
import type { DeepPartial } from '@/types/utilities';
import type { AppError, ErrorSeverity } from '@/types/errors';
import { createBaseStore, BaseStoreOptions, BaseStoreReturn } from './BaseStore';

/**
 * Basis-Interface für Benutzerdaten
 */
export interface UserData {
  id: string;
  displayName?: string;
  email?: string;
  roles?: string[];
  avatar?: string;
  [key: string]: any;
}

/**
 * Interface für Login-Credentials
 */
export interface LoginCredentials {
  username: string;
  password: string;
  rememberMe?: boolean;
  [key: string]: any;
}

/**
 * Interface für Token-Daten
 */
export interface TokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  expiresIn?: number;
}

/**
 * Interface für den Authentifizierungsstatus
 */
export interface AuthenticationStatus {
  isAuthenticated: boolean;
  tokenStatus: 'valid' | 'expiring' | 'expired' | 'invalid' | 'missing';
  lastValidation: number;
  sessionStart?: number;
  lastActivity: number;
}

/**
 * Interface für Berechtigungsdaten
 */
export interface PermissionsData {
  permissions: Set<string>;
  roles: Set<string>;
}

/**
 * Interface für Benutzerstore-Zustand
 */
export interface UserStoreState<U extends UserData = UserData> {
  /**
   * Angemeldeter Benutzer (oder null, wenn nicht angemeldet)
   */
  user: U | null;
  
  /**
   * Authentifizierungstoken
   */
  token: TokenData | null;
  
  /**
   * Authentifizierungsstatus
   */
  authStatus: AuthenticationStatus;
  
  /**
   * Berechtigungen des Benutzers
   */
  permissions: PermissionsData;
  
  /**
   * Token-Aktualisierung im Gange
   */
  tokenRefreshInProgress: boolean;
  
  /**
   * Zeitpunkt der letzten Token-Aktualisierung
   */
  lastTokenRefresh: number;
  
  /**
   * Automatisches Abmelden aktiviert
   */
  autoLogoutEnabled: boolean;
  
  /**
   * Timeout für automatisches Abmelden in Millisekunden
   */
  autoLogoutTimeoutMs: number;
  
  /**
   * ID für das Timeout zum automatischen Abmelden
   */
  autoLogoutTimeoutId: number | null;
}

/**
 * Optionen für UserStore-Konfiguration
 */
export interface UserStoreOptions<U extends UserData = UserData> extends BaseStoreOptions<UserStoreState<U>> {
  /**
   * API-Basispfad für Authentifizierungsendpunkte
   */
  apiBasePath?: string;
  
  /**
   * Automatisches Token-Refreshing aktivieren
   */
  enableTokenRefresh?: boolean;
  
  /**
   * Intervall für Token-Überprüfung in Millisekunden
   */
  tokenCheckIntervalMs?: number;
  
  /**
   * Token-Refresh ausführen, wenn weniger als X Millisekunden verbleiben
   */
  refreshTokenThresholdMs?: number;
  
  /**
   * Automatisches Abmelden bei Inaktivität aktivieren
   */
  enableAutoLogout?: boolean;
  
  /**
   * Timeout für automatisches Abmelden in Millisekunden
   */
  autoLogoutTimeoutMs?: number;
}

/**
 * Generischer UserStore für Authentifizierung und Benutzerinfos
 * 
 * Bietet erweiterte Funktionen für:
 * - Anmeldung und Abmeldung
 * - Token-Verwaltung mit automatischer Aktualisierung
 * - Rollenbasierte Zugriffskontrolle
 * - Granulare Berechtigungsprüfungen
 * - Sichere Token-Validierung und Speicherung
 * - Automatisches Abmelden bei Inaktivität
 */
export function createUserStore<U extends UserData = UserData>(
  options: UserStoreOptions<U>
) {
  // Konfigurationswerte mit Standardwerten
  const apiBasePath = options.apiBasePath || '/api/auth';
  const tokenCheckIntervalMs = options.tokenCheckIntervalMs || 60000; // 1 Minute
  const refreshTokenThresholdMs = options.refreshTokenThresholdMs || 300000; // 5 Minuten
  const autoLogoutTimeoutMs = options.autoLogoutTimeoutMs || 1800000; // 30 Minuten
  
  // Basisstore erstellen mit zugeordnetem Zustandstyp
  const baseStore = createBaseStore<UserStoreState<U>>({
    ...options,
    initialState: {
      user: null,
      token: null,
      authStatus: {
        isAuthenticated: false,
        tokenStatus: 'missing',
        lastValidation: 0,
        lastActivity: Date.now(),
      },
      permissions: {
        permissions: new Set<string>(),
        roles: new Set<string>(),
      },
      tokenRefreshInProgress: false,
      lastTokenRefresh: 0,
      autoLogoutEnabled: options.enableAutoLogout ?? false,
      autoLogoutTimeoutMs: autoLogoutTimeoutMs,
      autoLogoutTimeoutId: null,
      ...options.initialState,
    },
  });
  
  return defineStore(`${options.name}-user`, () => {
    // Basis-Store-Funktionalität initialisieren
    const base = baseStore();
    
    // Intervall-ID für Token-Überprüfung
    let tokenCheckInterval: number | null = null;
    
    // Abgeleitete Eigenschaften
    
    /**
     * Ist der Benutzer angemeldet?
     */
    const isAuthenticated = computed((): boolean => {
      return !!base.state.user && !!base.state.token?.accessToken;
    });
    
    /**
     * Ist der Benutzer ein Administrator?
     */
    const isAdmin = computed((): boolean => {
      if (!base.state.user?.roles) return false;
      
      return base.state.user.roles.some(role => 
        role === 'admin' || role === 'administrator'
      );
    });
    
    /**
     * Status des Authentifizierungstokens
     */
    const tokenStatus = computed((): 'valid' | 'expiring' | 'expired' | 'invalid' | 'missing' => {
      if (!base.state.token?.accessToken) return 'missing';
      
      if (!base.state.token.expiresAt) {
        // Wenn kein Ablaufdatum vorhanden ist, versuchen, es aus dem Token zu extrahieren
        try {
          const decoded: any = jwtDecode(base.state.token.accessToken);
          if (!decoded.exp) return 'invalid';
          
          const expiryTime = decoded.exp * 1000; // Convert to milliseconds
          const timeToExpiry = expiryTime - Date.now();
          
          if (timeToExpiry <= 0) return 'expired';
          if (timeToExpiry < refreshTokenThresholdMs) return 'expiring';
          return 'valid';
        } catch (err) {
          return 'invalid';
        }
      } else {
        const timeToExpiry = base.state.token.expiresAt - Date.now();
        
        if (timeToExpiry <= 0) return 'expired';
        if (timeToExpiry < refreshTokenThresholdMs) return 'expiring';
        return 'valid';
      }
    });
    
    /**
     * Verbleibende Zeit bis zum Ablauf des Tokens in Sekunden
     */
    const tokenExpiresIn = computed((): number => {
      if (!base.state.token?.expiresAt) return 0;
      return Math.max(0, Math.floor((base.state.token.expiresAt - Date.now()) / 1000));
    });
    
    /**
     * Benutzername für Anzeige
     */
    const username = computed((): string => {
      if (!base.state.user) return '';
      return base.state.user.displayName || base.state.user.email || 'Benutzer';
    });
    
    /**
     * Benutzer-ID des aktuellen Benutzers
     */
    const userId = computed((): string | null => {
      return base.state.user?.id || null;
    });
    
    /**
     * Rollen des aktuellen Benutzers
     */
    const userRoles = computed((): string[] => {
      return base.state.user?.roles || [];
    });
    
    /**
     * Anmelden mit Benutzernamen und Passwort
     */
    async function login(credentials: LoginCredentials): Promise<boolean> {
      base.setLoading(true);
      base.clearError();
      
      try {
        // In einer konkreten Implementierung würde hier der API-Aufruf erfolgen
        // und Authentifizierungsdaten gesetzt werden
        
        // Beispiel:
        /*
        const response = await axios.post(`${apiBasePath}/login`, credentials);
        
        if (response.data.success) {
          const tokenData: TokenData = {
            accessToken: response.data.accessToken,
            refreshToken: response.data.refreshToken,
            expiresAt: Date.now() + (response.data.expiresIn * 1000),
            expiresIn: response.data.expiresIn,
          };
          
          setToken(tokenData);
          setUser(response.data.user);
          updateAuthStatus();
          
          // Token-Überprüfung starten
          startTokenCheck();
          
          // Auto-Logout Timer starten
          resetAutoLogoutTimer();
          
          return true;
        } else {
          base.setError(response.data.message || 'Anmeldefehler');
          return false;
        }
        */
        
        // Dummy-Implementierung
        console.warn('UserStore login: Diese Methode sollte in einer konkreten Implementierung überschrieben werden');
        return false;
      } catch (err) {
        base.setError(err as Error, 'error');
        return false;
      } finally {
        base.setLoading(false);
      }
    }
    
    /**
     * Abmelden des aktuellen Benutzers
     */
    async function logout(): Promise<void> {
      base.setLoading(true);
      
      try {
        // Token-Überprüfung stoppen
        stopTokenCheck();
        
        // Auto-Logout Timer stoppen
        clearAutoLogoutTimer();
        
        // In einer konkreten Implementierung würde hier der API-Aufruf erfolgen
        // Beispiel:
        /*
        if (base.state.token?.refreshToken) {
          await axios.post(`${apiBasePath}/logout`, {
            refreshToken: base.state.token.refreshToken,
          }, {
            headers: createAuthHeaders(),
          }).catch(() => {
            // Fehler beim Logout ignorieren, trotzdem lokal abmelden
          });
        }
        */
        
        // Lokalen Zustand zurücksetzen
        clearAuthData();
      } catch (err) {
        console.error('Fehler beim Logout:', err);
      } finally {
        base.setLoading(false);
      }
    }
    
    /**
     * Token validieren und ggf. aktualisieren
     */
    async function validateToken(): Promise<boolean> {
      if (!base.state.token?.accessToken) {
        return false;
      }
      
      // Token-Status aktualisieren
      base.state.authStatus.tokenStatus = tokenStatus.value;
      base.state.authStatus.lastValidation = Date.now();
      
      // Wenn Token abgelaufen oder kurz vor Ablauf ist, aktualisieren
      if (tokenStatus.value === 'expired' || tokenStatus.value === 'expiring') {
        return refreshToken();
      }
      
      // Wenn Token ungültig ist, abmelden
      if (tokenStatus.value === 'invalid') {
        await logout();
        return false;
      }
      
      return true;
    }
    
    /**
     * Token aktualisieren
     */
    async function refreshToken(): Promise<boolean> {
      if (!base.state.token?.refreshToken || base.state.tokenRefreshInProgress) {
        return false;
      }
      
      base.state.tokenRefreshInProgress = true;
      
      try {
        // In einer konkreten Implementierung würde hier der API-Aufruf erfolgen
        // Beispiel:
        /*
        const response = await axios.post(`${apiBasePath}/refresh`, {
          refreshToken: base.state.token.refreshToken,
        });
        
        if (response.data.success) {
          const tokenData: TokenData = {
            accessToken: response.data.accessToken,
            refreshToken: response.data.refreshToken || base.state.token.refreshToken,
            expiresAt: Date.now() + (response.data.expiresIn * 1000),
            expiresIn: response.data.expiresIn,
          };
          
          setToken(tokenData);
          updateAuthStatus();
          
          base.state.lastTokenRefresh = Date.now();
          
          return true;
        } else {
          // Bei Fehlschlag abmelden
          await logout();
          return false;
        }
        */
        
        // Dummy-Implementierung
        console.warn('UserStore refreshToken: Diese Methode sollte in einer konkreten Implementierung überschrieben werden');
        return false;
      } catch (err) {
        console.error('Fehler beim Token-Refresh:', err);
        
        // Bei kritischen Fehlern abmelden
        await logout();
        return false;
      } finally {
        base.state.tokenRefreshInProgress = false;
      }
    }
    
    /**
     * Periodische Token-Überprüfung starten
     */
    function startTokenCheck(): void {
      if (tokenCheckInterval !== null) {
        stopTokenCheck();
      }
      
      tokenCheckInterval = window.setInterval(() => {
        validateToken();
      }, tokenCheckIntervalMs);
    }
    
    /**
     * Periodische Token-Überprüfung stoppen
     */
    function stopTokenCheck(): void {
      if (tokenCheckInterval !== null) {
        clearInterval(tokenCheckInterval);
        tokenCheckInterval = null;
      }
    }
    
    /**
     * Authentifizierungs-Header für API-Anfragen erstellen
     */
    function createAuthHeaders(): Record<string, string> {
      if (!base.state.token?.accessToken) {
        return {};
      }
      
      return {
        Authorization: `Bearer ${base.state.token.accessToken}`,
      };
    }
    
    /**
     * Token setzen
     */
    function setToken(tokenData: TokenData): void {
      base.state.token = tokenData;
      
      // Ablaufzeit berechnen, falls nicht angegeben
      if (!tokenData.expiresAt && tokenData.expiresIn) {
        base.state.token.expiresAt = Date.now() + (tokenData.expiresIn * 1000);
      } else if (!tokenData.expiresAt && !tokenData.expiresIn) {
        // Versuchen, Ablaufzeit aus Token zu extrahieren
        try {
          const decoded: any = jwtDecode(tokenData.accessToken);
          if (decoded.exp) {
            base.state.token.expiresAt = decoded.exp * 1000; // Convert to milliseconds
          } else {
            // Fallback: 1 Stunde
            base.state.token.expiresAt = Date.now() + 3600000;
          }
        } catch (err) {
          // Fallback: 1 Stunde
          base.state.token.expiresAt = Date.now() + 3600000;
        }
      }
    }
    
    /**
     * Benutzer setzen und Berechtigungen aktualisieren
     */
    function setUser(user: U): void {
      base.state.user = user;
      
      // Berechtigungen aus Rollen extrahieren
      extractPermissionsFromRoles();
      
      // Authentifizierungsstatus aktualisieren
      updateAuthStatus();
    }
    
    /**
     * Authentifizierungsstatus aktualisieren
     */
    function updateAuthStatus(): void {
      base.state.authStatus = {
        isAuthenticated: !!base.state.user && !!base.state.token?.accessToken,
        tokenStatus: tokenStatus.value,
        lastValidation: Date.now(),
        sessionStart: base.state.authStatus.sessionStart || Date.now(),
        lastActivity: Date.now(),
      };
    }
    
    /**
     * Authentifizierungsdaten löschen
     */
    function clearAuthData(): void {
      base.state.user = null;
      base.state.token = null;
      
      base.state.authStatus = {
        isAuthenticated: false,
        tokenStatus: 'missing',
        lastValidation: Date.now(),
        lastActivity: Date.now(),
      };
      
      base.state.permissions.permissions.clear();
      base.state.permissions.roles.clear();
      
      base.state.tokenRefreshInProgress = false;
      base.state.lastTokenRefresh = 0;
    }
    
    /**
     * Berechtigungen aus Benutzerrollen extrahieren
     */
    function extractPermissionsFromRoles(): void {
      base.state.permissions.permissions.clear();
      base.state.permissions.roles.clear();
      
      if (!base.state.user?.roles) return;
      
      // Rollen speichern
      base.state.user.roles.forEach(role => {
        base.state.permissions.roles.add(role);
      });
      
      // Standardberechtigungen basierend auf Rollen
      base.state.user.roles.forEach(role => {
        // Administratorrechte
        if (role === 'admin' || role === 'administrator') {
          // Administratoren haben alle Rechte
          base.state.permissions.permissions.add('*');
        }
        
        // Supportrechte
        if (role === 'support') {
          base.state.permissions.permissions.add('user:read');
          base.state.permissions.permissions.add('system:read');
          base.state.permissions.permissions.add('docs:read');
          base.state.permissions.permissions.add('docs:convert');
        }
        
        // Standard-Benutzerrechte
        if (role === 'user') {
          base.state.permissions.permissions.add('docs:read');
          base.state.permissions.permissions.add('docs:convert');
          base.state.permissions.permissions.add('settings:read');
        }
        
        // Gastrechte
        if (role === 'guest') {
          base.state.permissions.permissions.add('docs:read');
        }
        
        // Spezifische berechtigungsbasierte Rollen (Format: resource:action)
        if (role.includes(':')) {
          base.state.permissions.permissions.add(role);
        }
      });
    }
    
    /**
     * Auto-Logout-Timer zurücksetzen
     */
    function resetAutoLogoutTimer(): void {
      // Zuerst alten Timer löschen
      clearAutoLogoutTimer();
      
      // Nur Timer setzen, wenn Auto-Logout aktiviert ist
      if (base.state.autoLogoutEnabled) {
        base.state.autoLogoutTimeoutId = window.setTimeout(() => {
          // Automatisch abmelden, wenn keine Aktivität registriert wurde
          if (Date.now() - base.state.authStatus.lastActivity > base.state.autoLogoutTimeoutMs) {
            logout();
          }
        }, base.state.autoLogoutTimeoutMs);
      }
    }
    
    /**
     * Auto-Logout-Timer löschen
     */
    function clearAutoLogoutTimer(): void {
      if (base.state.autoLogoutTimeoutId !== null) {
        clearTimeout(base.state.autoLogoutTimeoutId);
        base.state.autoLogoutTimeoutId = null;
      }
    }
    
    /**
     * Aktivität des Benutzers registrieren (um Auto-Logout zu verhindern)
     */
    function registerActivity(): void {
      base.state.authStatus.lastActivity = Date.now();
      resetAutoLogoutTimer();
    }
    
    /**
     * Auto-Logout aktivieren oder deaktivieren
     */
    function setAutoLogout(enabled: boolean, timeoutMs?: number): void {
      base.state.autoLogoutEnabled = enabled;
      
      if (timeoutMs) {
        base.state.autoLogoutTimeoutMs = timeoutMs;
      }
      
      if (enabled) {
        resetAutoLogoutTimer();
      } else {
        clearAutoLogoutTimer();
      }
    }
    
    /**
     * Store initialisieren
     */
    async function initialize(): Promise<void> {
      await base.initialize();
      
      // Wenn der Store initialisiert wird und ein Token vorhanden ist,
      // Token validieren und Überprüfung starten
      if (base.state.token?.accessToken) {
        const isValid = await validateToken();
        
        if (isValid && options.enableTokenRefresh) {
          startTokenCheck();
        }
        
        if (isValid && base.state.autoLogoutEnabled) {
          resetAutoLogoutTimer();
        }
      }
    }
    
    /**
     * Reset-Methode überschreiben, um auch Token-Überprüfung und
     * Auto-Logout-Timer zurückzusetzen
     */
    function reset(): void {
      // Basis-Reset aufrufen
      base.reset();
      
      // TokenCheck und Auto-Logout-Timer stoppen
      stopTokenCheck();
      clearAutoLogoutTimer();
      
      // Authentifizierungsdaten löschen
      clearAuthData();
    }
    
    /**
     * Hat der Benutzer eine bestimmte Berechtigung?
     */
    function hasPermission(permission: string): boolean {
      if (!isAuthenticated.value) return false;
      
      // Administrator hat immer alle Berechtigungen
      if (base.state.permissions.permissions.has('*')) return true;
      
      return base.state.permissions.permissions.has(permission);
    }
    
    /**
     * Hat der Benutzer eine der angegebenen Berechtigungen?
     */
    function hasAnyPermission(permissions: string[]): boolean {
      if (!isAuthenticated.value) return false;
      
      // Administrator hat immer alle Berechtigungen
      if (base.state.permissions.permissions.has('*')) return true;
      
      return permissions.some(permission => 
        base.state.permissions.permissions.has(permission)
      );
    }
    
    /**
     * Hat der Benutzer alle angegebenen Berechtigungen?
     */
    function hasAllPermissions(permissions: string[]): boolean {
      if (!isAuthenticated.value) return false;
      
      // Administrator hat immer alle Berechtigungen
      if (base.state.permissions.permissions.has('*')) return true;
      
      return permissions.every(permission => 
        base.state.permissions.permissions.has(permission)
      );
    }
    
    /**
     * Hat der Benutzer eine bestimmte Rolle?
     */
    function hasRole(role: string): boolean {
      if (!isAuthenticated.value) return false;
      
      return base.state.permissions.roles.has(role);
    }
    
    /**
     * Hat der Benutzer eine der angegebenen Rollen?
     */
    function hasAnyRole(roles: string[]): boolean {
      if (!isAuthenticated.value) return false;
      
      return roles.some(role => base.state.permissions.roles.has(role));
    }
    
    /**
     * Hat der Benutzer alle angegebenen Rollen?
     */
    function hasAllRoles(roles: string[]): boolean {
      if (!isAuthenticated.value) return false;
      
      return roles.every(role => base.state.permissions.roles.has(role));
    }
    
    // Alle Funktionen aus Basis-Store und diesem Store zusammenführen
    return {
      ...base,
      
      // Überschreibende Methoden
      initialize,
      reset,
      
      // Zustand und abgeleitete Eigenschaften
      user: computed(() => base.state.user),
      token: computed(() => base.state.token),
      authStatus: computed(() => base.state.authStatus),
      permissions: computed(() => base.state.permissions),
      isAuthenticated,
      isAdmin,
      tokenStatus,
      tokenExpiresIn,
      username,
      userId,
      userRoles,
      
      // Authentifizierungs-Methoden
      login,
      logout,
      validateToken,
      refreshToken,
      createAuthHeaders,
      setToken,
      setUser,
      
      // Token-Management
      startTokenCheck,
      stopTokenCheck,
      
      // Auto-Logout
      registerActivity,
      setAutoLogout,
      resetAutoLogoutTimer,
      
      // Berechtigungsprüfungen
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      hasRole,
      hasAnyRole,
      hasAllRoles,
    };
  });
}

/**
 * Rückgabetyp eines UserStore
 */
export type UserStoreReturn<U extends UserData = UserData> = BaseStoreReturn<UserStoreState<U>> & {
  // Zustands-Eigenschaften
  user: U | null;
  token: TokenData | null;
  authStatus: AuthenticationStatus;
  permissions: PermissionsData;
  
  // Abgeleitete Eigenschaften
  isAuthenticated: boolean;
  isAdmin: boolean;
  tokenStatus: 'valid' | 'expiring' | 'expired' | 'invalid' | 'missing';
  tokenExpiresIn: number;
  username: string;
  userId: string | null;
  userRoles: string[];
  
  // Authentifizierungs-Methoden
  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => Promise<void>;
  validateToken: () => Promise<boolean>;
  refreshToken: () => Promise<boolean>;
  createAuthHeaders: () => Record<string, string>;
  setToken: (tokenData: TokenData) => void;
  setUser: (user: U) => void;
  
  // Token-Management
  startTokenCheck: () => void;
  stopTokenCheck: () => void;
  
  // Auto-Logout
  registerActivity: () => void;
  setAutoLogout: (enabled: boolean, timeoutMs?: number) => void;
  resetAutoLogoutTimer: () => void;
  
  // Berechtigungsprüfungen
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  hasAllRoles: (roles: string[]) => boolean;
};