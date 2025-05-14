/**
 * Store-bezogene Utility-Typen
 * 
 * Diese Datei enthält Utility-Typen für die Store-Implementierungen,
 * die Typisierung von Store-Zuständen und -Aktionen erleichtern.
 */

import type { StoreDefinition, StateTree, _GettersTree, _ActionsTree, PiniaCustomStateProperties } from 'pinia';
import { DeepReadonly, DeepPartial, Immutable } from './types';

/**
 * Typ-Extraktion für Store-Definitionen
 */

/**
 * Extrahiert den State-Typ aus einer Store-Definition
 */
export type ExtractState<Store> = Store extends StoreDefinition<
  string,
  infer S,
  any,
  any
>
  ? S
  : never;

/**
 * Extrahiert den Getters-Typ aus einer Store-Definition
 */
export type ExtractGetters<Store> = Store extends StoreDefinition<
  string,
  any,
  infer G,
  any
>
  ? G
  : never;

/**
 * Extrahiert den Actions-Typ aus einer Store-Definition
 */
export type ExtractActions<Store> = Store extends StoreDefinition<
  string,
  any,
  any,
  infer A
>
  ? A
  : never;

/**
 * Extrahiert den kompletten Store-Rückgabetyp
 */
export type ExtractStoreReturn<Store> = Store extends (...args: any[]) => infer R
  ? R
  : never;

/**
 * StoreState - Basistyp für Store-Zustände
 */
export interface StoreState extends StateTree {}

/**
 * StoreGetters - Basistyp für Store-Getters
 */
export interface StoreGetters extends _GettersTree<StoreState> {}

/**
 * StoreActions - Basistyp für Store-Aktionen
 */
export interface StoreActions extends _ActionsTree {}

/**
 * OptimizedStoreState - Basistyp für optimierte Store-Zustände mit Readonly-Eigenschaften
 */
export type OptimizedStoreState<S extends StoreState = StoreState> = Immutable<S>;

/**
 * StoreInstance - Basistyp für Store-Instanzen, der State, Getters und Actions kombiniert
 */
export type StoreInstance<
  S extends StoreState = StoreState,
  G = StoreGetters,
  A = StoreActions
> = S & G & A & PiniaCustomStateProperties<S>;

/**
 * OptimizedStoreInstance - Basistyp für optimierte Store-Instanzen mit Readonly-State
 */
export type OptimizedStoreInstance<
  S extends StoreState = StoreState,
  G = StoreGetters,
  A = StoreActions
> = OptimizedStoreState<S> & G & A & PiniaCustomStateProperties<S>;

/**
 * MutationOptions - Optionen für State-Mutationen
 */
export interface MutationOptions {
  /**
   * Löst Store-Abonnements auch aus, wenn der Wert unverändert bleibt
   */
  forceNotify?: boolean;
  
  /**
   * Wenn true, werden optimierte Stores den State direkt mutieren, anstatt immutable zu arbeiten
   */
  directMutation?: boolean;
}

/**
 * StorePatchFunction - Typ für $patch-ähnliche Funktionen
 */
export type StorePatchFunction<S extends StoreState = StoreState> = (
  stateOrMutator: DeepPartial<S> | ((state: S) => void),
  options?: MutationOptions
) => void;

/**
 * StoreActionContext - Kontext für Store-Aktionen
 */
export interface StoreActionContext<
  Id extends string,
  S extends StoreState,
  G = StoreGetters,
  A = StoreActions
> {
  store: StoreInstance<S, G, A>;
  pinia: any;
  app: any;
  storeId: Id;
}

/**
 * SubscriptionCallback - Callback-Typ für Store-Abonnements
 */
export type SubscriptionCallback<S = StoreState> = (
  mutation: {
    type: 'direct' | 'patch object' | 'patch function';
    storeId: string;
    events: SubscriptionEvent<S>[];
  },
  state: S
) => void;

/**
 * SubscriptionEvent - Repräsentiert ein einzelnes Änderungsereignis in einem Store
 */
export interface SubscriptionEvent<S = StoreState> {
  key: keyof S;
  newValue: any;
  oldValue: any;
}

/**
 * StoreSubscription - Enthält den Rückgabewert eines Store-Abonnements (Cleanup-Funktion)
 */
export type StoreSubscription = () => void;

/**
 * StoreLifecycleHooks - Typ für Pinia-Lebenszyklus-Hooks
 */
export interface StoreLifecycleHooks<S = StoreState> {
  /**
   * Hook, der vor der Store-Initialisierung ausgeführt wird
   */
  beforeCreate?: () => void;
  
  /**
   * Hook, der nach der Store-Initialisierung ausgeführt wird
   */
  afterCreate?: (store: S) => void;
}

/**
 * StoreOptimizationOptions - Optionen für Store-Optimierungen
 */
export interface StoreOptimizationOptions {
  /**
   * Getter-Cache aktivieren
   */
  enableGetterCache?: boolean;
  
  /**
   * Immutable State aktivieren
   */
  enableImmutableState?: boolean;
  
  /**
   * Debounce-Zeit für gebündelte State-Updates (in ms)
   */
  batchUpdateDebounce?: number;
  
  /**
   * Abonnements in einen Mikro-Task umhüllen
   */
  asyncSubscriptions?: boolean;
}

/**
 * Eine typensichere Version der defineStore Funktion
 * (ersetzt die eigentliche Funktion nicht, hilft nur bei der Typisierung)
 */
export interface TypedDefineStore {
  /**
   * Definiert einen Store mit Options API
   */
  <Id extends string, S extends StoreState, G = StoreGetters, A = StoreActions>(
    id: Id,
    options: {
      state: () => S;
      getters?: G;
      actions?: A;
    }
  ): StoreDefinition<Id, S, G, A>;
  
  /**
   * Definiert einen Store mit Composition API (Setup-Funktion)
   */
  <Id extends string, SS>(
    id: Id,
    setup: () => SS
  ): StoreDefinition<Id, any, any, any>;
}

/**
 * Nützliche Hilfsfunktionen für Stores
 */

/**
 * Erstellt eine Kopie eines Store-Zustands ohne Pinia-Metadaten
 */
export function extractPureState<S extends StoreState>(store: StoreInstance<S>): S {
  const result: Record<string, any> = {};
  
  for (const key in store.$state) {
    if (Object.prototype.hasOwnProperty.call(store.$state, key)) {
      result[key] = store.$state[key];
    }
  }
  
  return result as S;
}

/**
 * Erstellt eine Tiefenkopie eines Store-Zustands
 */
export function deepCopyState<S extends StoreState>(state: S): S {
  return JSON.parse(JSON.stringify(state));
}

/**
 * Vergleicht zwei Store-Zustände oberflächlich
 */
export function shallowCompareStates<S extends StoreState>(stateA: S, stateB: S): boolean {
  const keysA = Object.keys(stateA);
  const keysB = Object.keys(stateB);
  
  if (keysA.length !== keysB.length) {
    return false;
  }
  
  return keysA.every(key => stateA[key as keyof S] === stateB[key as keyof S]);
}

/**
 * Erstellt eine Readonly-Version eines Store-Zustands
 */
export function createReadonlyState<S extends StoreState>(state: S): DeepReadonly<S> {
  // Implementierung basiert auf den DeepReadonly-Typ
  return state as DeepReadonly<S>;
}

/**
 * Hilfsfunktion für optimierte Getter-Funktionen mit Memoization
 */
export function createMemoizedGetter<T, Args extends any[] = any[]>(
  fn: (...args: Args) => T,
  keyFn: (...args: Args) => string = (...args) => JSON.stringify(args)
): (...args: Args) => T {
  const cache = new Map<string, T>();
  
  return (...args: Args): T => {
    const key = keyFn(...args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}