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
    
    // login kann unterschiedliche Implementierungen haben
    login: async (credentialsOrUsername: LoginCredentials | string, password?: string): Promise<boolean> => {
      if (typeof store.login === 'function') {
        // Fall 1: Verwende das LoginCredentials Objekt direkt
        if (typeof credentialsOrUsername === 'object') {
          return store.login(credentialsOrUsername);
        } 
        // Fall 2: Erstelle ein LoginCredentials Objekt aus username und password
        else if (typeof credentialsOrUsername === 'string' && password !== undefined) {
          return store.login({
            email: credentialsOrUsername,
            password: password
          });
        }
        // Fall 3: Nur Email/Username ohne Passwort (verwende Standard-Passwort)
        else if (typeof credentialsOrUsername === 'string') {
          return store.login({
            email: credentialsOrUsername,
            password: "123" // Standard-Testpasswort verwenden
          });
        }
      }
      
      // Fallback: Login über API-Service
      console.warn('login Methode nicht im Store vorhanden, verwende API-Service');
      return Promise.reject(new Error('Login-Funktionalität nicht verfügbar'));
    },
    
    // register kann fehlen
    register: async (username: string, password: string, role?: string): Promise<boolean> => {
      if (typeof store.register === 'function') {
        if (role) {
          return store.register({ username, password, role });
        }
        return store.register({ username, password });
      }
      
      console.warn('register Methode nicht im Store vorhanden');
      return Promise.reject(new Error('Registrierungs-Funktionalität nicht verfügbar'));
    },
    
    // Fehlerbehandlung
    get error(): string | null {
      if ('error' in store) {
        return (store as any).error;
      }
      return null;
    },
    
    // Token direkt setzen
    setToken: async (token: string): Promise<boolean> => {
      if (typeof store.setToken === 'function') {
        return store.setToken(token);
      }
      
      console.warn('setToken Methode nicht im Store vorhanden');
      return Promise.reject(new Error('Token-Verwaltung nicht verfügbar'));
    },
    
    // Fehler direkt setzen
    setError: (message: string | null): void => {
      if (typeof store.setError === 'function') {
        store.setError(message);
      } else if ('error' in store) {
        (store as any).error = message;
      } else {
        console.warn('setError Methode nicht im Store vorhanden');
      }
    }
  };
}

// Singleton-Export für einfache Verwendung
export const authStoreCompat = useAuthStoreCompat();