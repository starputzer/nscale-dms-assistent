/**
 * BaseStore - Grundlegende generische Store-Klasse
 * 
 * Diese Datei definiert einen standardisierten Basis-Store-Typ, der als Grundlage
 * für alle Pinia-Stores im nscale DMS Assistenten dient. Der BaseStore stellt sicher,
 * dass bestimmte grundlegende Eigenschaften und Methoden in allen Stores konsistent
 * implementiert werden.
 */

import { defineStore, StoreDefinition } from 'pinia';
import { ref, computed } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import type { DeepPartial } from '@/types/utilities';
import type { AppError, ErrorSeverity } from '@/types/errors';

/**
 * Generische Typschnittstelle für Optionen eines Basis-Stores
 */
export interface BaseStoreOptions<State> {
  /** Store-Name (für Debugging und Persistenz) */
  name: string;
  
  /** Anfangszustand des Stores (optional) */
  initialState?: DeepPartial<State>;
  
  /** Persistenz-Konfiguration (optional) */
  persistence?: {
    /** Aktivierte Persistenz */
    enabled: boolean;
    
    /** Zu persistierende Pfade (unterstützt Punkt-Notation) */
    paths?: string[];
    
    /** Speichertyp (localStorage oder sessionStorage) */
    storage?: 'localStorage' | 'sessionStorage';
    
    /** Benutzerdefinierte Serialisierung */
    customSerializer?: {
      serialize: (state: any) => string;
      deserialize: (data: string) => any;
    };
  };
  
  /** Aktiviere ausführliches Logging für diesen Store */
  debug?: boolean;

  /** Automatische Initialisierung beim Erstellen aktivieren */
  autoInitialize?: boolean;

  /** Store-Version für Migration und Upgrade-Logik */
  version?: number;
}

/**
 * Generischer Typ für alle Basisstore-Implementierungen
 * 
 * Stellt einen standardisierten, typisierten Store mit einheitlichem Interface bereit:
 * - Konsistentes Error-Handling
 * - Lade-Status-Management
 * - Store-Versionierung
 * - Standardmäßige Persistenz mit konfigurierbaren Optionen
 * - Debugging-Unterstützung
 * - Initialisierungs- und Reset-Logik
 */
export function createBaseStore<
  State extends Record<string, any>,
  Getters extends Record<string, any> = {},
  Actions extends Record<string, any> = {}
>(options: BaseStoreOptions<State>) {
  // Unique ID für den Store, um Kollisionen zu vermeiden
  const storeId = `${options.name}-${uuidv4().substring(0, 8)}`;
  
  // Store-Definition erstellen
  return defineStore(storeId, () => {
    // Grundlegende State-Eigenschaften
    const state = ref<State>({} as State);
    const version = ref<number>(options.version || 1);
    const isInitialized = ref<boolean>(false);
    const isLoading = ref<boolean>(false);
    const error = ref<AppError | Error | null>(null);
    const lastUpdated = ref<number>(0);

    /**
     * Store-Reset-Funktion, die den State auf die Anfangswerte zurücksetzt
     */
    function reset(): void {
      state.value = {} as State;
      isInitialized.value = false;
      isLoading.value = false;
      error.value = null;
      
      // Anfangszustand anwenden, falls vorhanden
      if (options.initialState) {
        Object.assign(state.value, options.initialState);
      }
      
      if (options.debug) {
        console.debug(`[BaseStore:${options.name}] Store zurückgesetzt`);
      }
    }

    /**
     * Fehler im Store setzen
     */
    function setError(err: Error | string | AppError, severity: ErrorSeverity = 'error'): void {
      if (typeof err === 'string') {
        error.value = new Error(err);
      } else {
        error.value = err;
      }
      
      if (options.debug) {
        console.error(`[BaseStore:${options.name}] Fehler:`, error.value);
      }
    }

    /**
     * Fehler im Store löschen
     */
    function clearError(): void {
      error.value = null;
    }

    /**
     * Ladestatus setzen
     */
    function setLoading(loading: boolean): void {
      isLoading.value = loading;
    }

    /**
     * Store-Initialisierung
     */
    async function initialize(): Promise<void> {
      if (isInitialized.value) return;
      
      isLoading.value = true;
      error.value = null;
      
      try {
        // Anfangszustand anwenden, falls vorhanden
        if (options.initialState) {
          Object.assign(state.value, options.initialState);
        }
        
        isInitialized.value = true;
        lastUpdated.value = Date.now();
        
        if (options.debug) {
          console.debug(`[BaseStore:${options.name}] Store initialisiert`);
        }
      } catch (err) {
        setError(err as Error);
        
        if (options.debug) {
          console.error(`[BaseStore:${options.name}] Fehler bei Initialisierung:`, err);
        }
      } finally {
        isLoading.value = false;
      }
    }

    /**
     * Aktuellen Store-Zustand als Zeichenkette exportieren
     */
    function exportState(): string {
      try {
        return JSON.stringify(state.value);
      } catch (err) {
        setError(`Fehler beim Exportieren des Store-Zustands: ${err}`);
        return '{}';
      }
    }

    /**
     * Store-Zustand aus Zeichenkette importieren
     */
    function importState(serializedState: string): boolean {
      try {
        const parsedState = JSON.parse(serializedState);
        Object.assign(state.value, parsedState);
        lastUpdated.value = Date.now();
        
        if (options.debug) {
          console.debug(`[BaseStore:${options.name}] Zustand importiert`);
        }
        
        return true;
      } catch (err) {
        setError(`Fehler beim Importieren des Store-Zustands: ${err}`);
        return false;
      }
    }

    /**
     * Store-Zustand mit einem Teilzustand zusammenführen
     */
    function mergeState(partialState: DeepPartial<State>): void {
      try {
        Object.assign(state.value, partialState);
        lastUpdated.value = Date.now();
      } catch (err) {
        setError(`Fehler beim Zusammenführen des Store-Zustands: ${err}`);
      }
    }

    /**
     * Automatische Initialisierung beim Store-Erstellen, falls aktiviert
     */
    if (options.autoInitialize) {
      initialize();
    }

    // Funktionen und State als einheitliches Store-Objekt zurückgeben
    return {
      // Basis-State
      state,
      version,
      isInitialized,
      isLoading,
      error,
      lastUpdated,
      
      // Berechnete Eigenschaften
      hasError: computed(() => error.value !== null),
      errorMessage: computed(() => error.value?.message || ''),
      isReady: computed(() => isInitialized.value && !isLoading.value),
      
      // Basis-Methoden
      initialize,
      reset,
      setError,
      clearError,
      setLoading,
      exportState,
      importState,
      mergeState,
    };
  }, {
    // Persistenz-Optionen, falls aktiviert
    persist: options.persistence?.enabled ? {
      storage: options.persistence.storage === 'sessionStorage' 
        ? sessionStorage 
        : localStorage,
      paths: options.persistence.paths || [],
      serializer: options.persistence.customSerializer || {
        deserialize: (value) => {
          try {
            return JSON.parse(value);
          } catch (err) {
            console.error(`[BaseStore:${options.name}] Fehler beim Deserialisieren:`, err);
            return {};
          }
        },
        serialize: (state) => {
          try {
            return JSON.stringify(state);
          } catch (err) {
            console.error(`[BaseStore:${options.name}] Fehler beim Serialisieren:`, err);
            return '{}';
          }
        },
      },
    } : undefined,
  });
}

/**
 * Typ für die Rückgabe eines BaseStore
 */
export type BaseStoreReturn<
  State extends Record<string, any> = {},
  Getters extends Record<string, any> = {},
  Actions extends Record<string, any> = {}
> = {
  // Basis-State
  state: State;
  version: number;
  isInitialized: boolean;
  isLoading: boolean;
  error: AppError | Error | null;
  lastUpdated: number;
  
  // Berechnete Eigenschaften
  hasError: boolean;
  errorMessage: string;
  isReady: boolean;
  
  // Basis-Methoden
  initialize: () => Promise<void>;
  reset: () => void;
  setError: (err: Error | string | AppError, severity?: ErrorSeverity) => void;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  exportState: () => string;
  importState: (serializedState: string) => boolean;
  mergeState: (partialState: DeepPartial<State>) => void;
} & Getters & Actions;

/**
 * Typ-Hilfsfunktion für Stores abgeleitet von BaseStore
 */
export type BaseStore<
  State extends Record<string, any> = {},
  Getters extends Record<string, any> = {},
  Actions extends Record<string, any> = {}
> = StoreDefinition<
  string,
  State,
  Getters,
  Actions & {
    // Überschreibe BaseStore-Funktionen mit korrekten Signaturen
    initialize: () => Promise<void>;
    reset: () => void;
    setError: (err: Error | string | AppError, severity?: ErrorSeverity) => void;
    clearError: () => void;
    setLoading: (loading: boolean) => void;
    exportState: () => string;
    importState: (serializedState: string) => boolean;
    mergeState: (partialState: DeepPartial<State>) => void;
  }
>;