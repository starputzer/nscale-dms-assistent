/**
 * AuthStoreAdapter: Bietet eine kompatible Schnittstelle für verschiedene Versionen des Auth-Stores
 *
 * Dieser Adapter löst Kompatibilitätsprobleme zwischen verschiedenen Versionen der Store-API,
 * indem er fehlende Methoden implementiert und API-Unterschiede ausgleicht.
 */

import { useAuthStore } from "../auth";
import type { IAuthStore } from "@/types/stores";
import type { LoginCredentials } from "@/types/auth";

// Store-Interface mit zurückkompatiblen Methoden
export interface AuthStoreWithCompat extends IAuthStore {
  // Ältere API-Methoden, die in neueren Versionen anders heißen oder fehlen
  login(
    credentials: LoginCredentials | string,
    password?: string,
  ): Promise<boolean>;
  register(username: string, password: string, role?: string): Promise<boolean>;
  error: string | null;
  setToken(token: string): Promise<boolean>;
  setError(message: string | null): void;
}

/**
 * Erstellt einen Auth-Store mit kompatiblen Methoden
 * für verschiedene Versionen der API
 */
export function useAuthStoreCompat(): AuthStoreWithCompat {
  const store = useAuthStore();

  // Erstelle ein kompatibles Store-Objekt
  // Wir können nicht einfach den Store spreaden, da Pinia Stores reactive sind
  return {
    // State properties
    get user() { return store.user; },
    get token() { return store.token; },
    get refreshToken() { return store.refreshToken; },
    get expiresAt() { return store.expiresAt; },
    get isLoading() { return store.isLoading; },
    get error() { return store.error; },
    get version() { return store.version; },
    get permissions() { return store.permissions; },
    get tokenRefreshInProgress() { return store.tokenRefreshInProgress; },
    get lastTokenRefresh() { return store.lastTokenRefresh; },
    
    // Computed properties
    get isAuthenticated() { return store.isAuthenticated; },
    get isAdmin() { return store.isAdmin; },
    get userRole() { return store.userRole; },
    get isExpired() { return store.isExpired; },
    get tokenExpiresIn() { return store.tokenExpiresIn; },
    get tokenStatus() { return store.tokenStatus; },
    
    // Expose all the methods from the original store
    logout: store.logout,
    hasRole: store.hasRole,
    hasAnyRole: store.hasAnyRole,
    hasPermission: store.hasPermission,
    hasAnyPermission: store.hasAnyPermission,
    checkPermission: store.checkPermission,
    refreshUserInfo: store.refreshUserInfo,
    refreshTokenIfNeeded: store.refreshTokenIfNeeded,
    validateCurrentToken: store.validateCurrentToken,
    validateToken: store.validateToken,
    createAuthHeaders: store.createAuthHeaders,
    initialize: store.initialize,
    migrateFromLegacyStorage: store.migrateFromLegacyStorage,
    updateUserPreferences: store.updateUserPreferences,
    extractPermissionsFromRoles: store.extractPermissionsFromRoles,
    setToken: store.setToken,
    setError: store.setError,
    restoreAuthSession: store.restoreAuthSession,
    persistAuthData: store.persistAuthData,
    configureHttpClients: store.configureHttpClients,
    removeHttpInterceptors: store.removeHttpInterceptors,
    cleanup: store.cleanup,
    $reset: store.$reset,

    // Kompatible login-Methode (unterstützt verschiedene Signaturen)
    async login(
      credentials: LoginCredentials | string,
      password?: string,
    ): Promise<boolean> {
      let actualCredentials: LoginCredentials;

      // Unterstütze alte Signatur mit separaten username/password Parametern
      if (typeof credentials === "string" && password) {
        actualCredentials = {
          email: credentials,
          password: password,
          rememberMe: false,
        };
      } else if (typeof credentials === "object") {
        actualCredentials = credentials;
      } else {
        throw new Error("Invalid login credentials format");
      }

      try {
        // Rufe die moderne login-Methode auf
        return await store.login(actualCredentials);
      } catch (error) {
        // Fallback für ältere Versionen, die möglicherweise andere Methoden haben
        if (typeof store.authenticate === "function") {
          return await store.authenticate(actualCredentials);
        }
        throw error;
      }
    },

    // Kompatible register-Methode
    async register(
      username: string,
      password: string,
      role: string = "user",
    ): Promise<boolean> {
      try {
        // Moderne register-Methode
        if (typeof store.register === "function") {
          return await store.register({ 
            username, 
            email: username, // username könnte eine Email sein
            password 
          });
        }

        // Fallback für ältere Versionen
        if (typeof store.createUser === "function") {
          return await store.createUser({ 
            username, 
            email: username,
            password 
          });
        }

        throw new Error("Register method not available");
      } catch (error) {
        console.error("Registration error:", error);
        return false;
      }
    },
  };
}

// Erstelle eine Factory-Funktion für verzögerte Initialisierung
let cachedStore: AuthStoreWithCompat | null = null;

export function getAuthStoreCompat(): AuthStoreWithCompat {
  if (!cachedStore) {
    cachedStore = useAuthStoreCompat();
  }
  return cachedStore;
}

// Export für direkte Verwendung (wird bei Bedarf erstellt)
export const authStoreCompat = {
  get() {
    return getAuthStoreCompat();
  },
};
