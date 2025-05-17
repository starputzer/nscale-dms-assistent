/**
 * AuthStoreAdapter: Bietet eine kompatible Schnittstelle für verschiedene Versionen des Auth-Stores
 * 
 * Dieser Adapter löst Kompatibilitätsprobleme zwischen verschiedenen Versionen der Store-API,
 * indem er fehlende Methoden implementiert und API-Unterschiede ausgleicht.
 */

import { useAuthStore } from '../auth';
import type { IAuthStore } from '@/types/stores';
import type { LoginCredentials } from '@/types/auth';

// Store-Interface mit zurückkompatiblen Methoden
export interface AuthStoreWithCompat extends IAuthStore {
  // Ältere API-Methoden, die in neueren Versionen anders heißen oder fehlen
  login(credentials: LoginCredentials | string, password?: string): Promise<boolean>;
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
  
  // Erweitere den Store mit kompatiblen Methoden
  return {
    ...store,
    
    // Kompatible login-Methode (unterstützt verschiedene Signaturen)
    async login(credentials: LoginCredentials | string, password?: string): Promise<boolean> {
      let actualCredentials: LoginCredentials;
      
      // Unterstütze alte Signatur mit separaten username/password Parametern
      if (typeof credentials === 'string' && password) {
        actualCredentials = {
          email: credentials,
          password: password,
          remember: false
        };
      } else if (typeof credentials === 'object') {
        actualCredentials = credentials;
      } else {
        throw new Error('Invalid login credentials format');
      }

      try {
        // Rufe die moderne login-Methode auf
        return await store.login(actualCredentials);
      } catch (error) {
        // Fallback für ältere Versionen, die möglicherweise andere Methoden haben
        if (typeof store.authenticate === 'function') {
          return await store.authenticate(actualCredentials);
        }
        throw error;
      }
    },
    
    // Kompatible register-Methode
    async register(username: string, password: string, role: string = 'user'): Promise<boolean> {
      try {
        // Moderne register-Methode
        if (typeof store.register === 'function') {
          return await store.register({ username, password, role });
        }
        
        // Fallback für ältere Versionen
        if (typeof store.createUser === 'function') {
          return await store.createUser({ username, password, role });
        }
        
        throw new Error('Register method not available');
      } catch (error) {
        console.error('Registration error:', error);
        return false;
      }
    },
    
    // Kompatible error-Property (als Getter)
    get error(): string | null {
      return store.error || null;
    },
    
    // Kompatible setToken-Methode
    async setToken(token: string): Promise<boolean> {
      try {
        if (typeof store.setToken === 'function') {
          return await store.setToken(token);
        }
        
        // Fallback: Direkt den Token setzen
        store.token = token;
        return true;
      } catch (error) {
        console.error('setToken error:', error);
        return false;
      }
    },
    
    // Kompatible setError-Methode
    setError(message: string | null): void {
      if (typeof store.setError === 'function') {
        store.setError(message);
      } else if ('error' in store) {
        // Fallback: Direkt die error-Property setzen
        (store as any).error = message;
      }
    }
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
  }
};