/**
 * Utility-Typen für häufig verwendete generische Typkonstrukte
 * 
 * Diese Datei enthält wiederverwendbare Typ-Utilities, die in verschiedenen
 * Teilen der Anwendung eingesetzt werden können.
 */

/**
 * Macht alle Properties eines Typs optional
 */
export type Partial<T> = {
  [P in keyof T]?: T[P];
};

/**
 * Macht alle Properties eines Typs erforderlich
 */
export type Required<T> = {
  [P in keyof T]-?: T[P];
};

/**
 * Macht alle Properties eines Typs schreibgeschützt
 */
export type Readonly<T> = {
  readonly [P in keyof T]: T[P];
};

/**
 * Wählt nur die spezifizierten Properties aus einem Typ aus
 */
export type Pick<T, K extends keyof T> = {
  [P in K]: T[P];
};

/**
 * Entfernt die spezifizierten Properties aus einem Typ
 */
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

/**
 * Erstellt einen Typ mit dem angegebenen Schlüsseltyp und Werttyp
 */
export type Record<K extends keyof any, T> = {
  [P in K]: T;
};

/**
 * Schließt U von T aus
 */
export type Exclude<T, U> = T extends U ? never : T;

/**
 * Extrahiert den Typ von U aus T
 */
export type Extract<T, U> = T extends U ? T : never;

/**
 * Entfernt null und undefined aus T
 */
export type NonNullable<T> = T extends null | undefined ? never : T;

/**
 * Extrahiert den Rückgabetyp eines Funktionstyps
 */
export type ReturnType<T extends (...args: any) => any> = T extends (...args: any) => infer R ? R : any;

/**
 * Extrahiert den Parameter-Typ eines Funktionstyps
 */
export type Parameters<T extends (...args: any) => any> = T extends (...args: infer P) => any ? P : never;

/**
 * Extrahiert den Konstruktorparameter-Typ
 */
export type ConstructorParameters<T extends new (...args: any) => any> = T extends new (...args: infer P) => any ? P : never;

/**
 * Extrahiert den Instanztyp eines Konstruktors
 */
export type InstanceType<T extends new (...args: any) => any> = T extends new (...args: any) => infer R ? R : any;

/**
 * Typ für asynchrone Werte, einschließlich Promise und PromiseLike
 */
export type Awaitable<T> = T | PromiseLike<T>;

/**
 * Macht bestimmte Properties eines Typs optional
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Macht bestimmte Properties eines Typs erforderlich
 */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/**
 * Macht bestimmte Properties eines Typs schreibgeschützt
 */
export type ReadonlyBy<T, K extends keyof T> = Omit<T, K> & Readonly<Pick<T, K>>;

/**
 * Nutzt den zweiten Typ, wenn der erste Typ undefined ist
 */
export type OrUndefined<T, U> = T extends undefined ? U : T;

/**
 * Erstellt einen Union-Typ aus den Werten eines Objekts
 */
export type ValueOf<T> = T[keyof T];

/**
 * Konvertiert einen Union-Typ in einen Intersection-Typ
 */
export type UnionToIntersection<U> = 
  (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never;

/**
 * Extrahiert den Typ aus einem Array- oder arrayähnlichen Typ
 */
export type ArrayElement<ArrayType extends readonly unknown[]> = 
  ArrayType extends readonly (infer ElementType)[] ? ElementType : never;

/**
 * Macht einen Typ tiefer-schreibgeschützt
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: DeepReadonly<T[P]>;
};

/**
 * Macht einen Typ tiefer-partiell (rekursiv optional)
 */
export type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>;
};

/**
 * Typ, der ein Objekt mit einer Untermenge von Properties aus dem Originaltyp darstellt
 */
export type SubType<T> = {
  [P in keyof T]?: T[P] extends object ? SubType<T[P]> : T[P];
};

/**
 * JSON-serialisierbarer Typ
 */
export type JSONValue = 
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue };

/**
 * JSON-Object-Typ
 */
export type JSONObject = { [key: string]: JSONValue };

/**
 * Hilfreiches Utility zum Erstellen von Zustandsmaschinen-Typen
 */
export type StateMachine<S extends string, E extends string> = {
  state: S;
  transitions: Record<E, S>;
};

/**
 * TypeGuard Interface
 */
export interface TypeGuard<T> {
  (value: unknown): value is T;
}

/**
 * Debounced Function Type
 */
export type DebouncedFunction<T extends (...args: any[]) => any> = {
  (...args: Parameters<T>): void;
  cancel: () => void;
  flush: () => ReturnType<T> | undefined;
};

/**
 * Throttled Function Type
 */
export type ThrottledFunction<T extends (...args: any[]) => any> = {
  (...args: Parameters<T>): void;
  cancel: () => void;
  flush: () => ReturnType<T> | undefined;
};

/**
 * Result-Type für erfolgreiche oder fehlgeschlagene Operationen
 */
export type Result<T, E = Error> = 
  | { success: true; data: T; error?: never }
  | { success: false; data?: never; error: E };

/**
 * Abfrage-Statustyp für API-Anfragen
 */
export type QueryStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * API-Antwort mit Metadaten
 */
export type ApiResponse<T> = {
  data: T;
  meta: {
    status: number;
    success: boolean;
    message?: string;
    timestamp: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
};

/**
 * Typ für eine reaktive Referenz (Vue 3)
 */
export type Ref<T> = {
  value: T;
  [key: symbol]: any;
};

/**
 * Typ für eine berechnete Eigenschaft (Vue 3)
 */
export type ComputedRef<T> = Readonly<Ref<T>> & {
  readonly value: T;
  [key: symbol]: any;
};

/**
 * Typ für einen Store-State
 */
export type StoreState<S> = {
  [K in keyof S]: S[K] extends Function ? never : S[K];
};

/**
 * Typ für Store-Getters
 */
export type StoreGetters<G> = {
  [K in keyof G]: G[K] extends (...args: any[]) => infer R ? R : never;
};

/**
 * Typ für Store-Actions
 */
export type StoreActions<A> = {
  [K in keyof A]: A[K] extends Function ? A[K] : never;
};

/**
 * Nullable Type
 */
export type Nullable<T> = T | null;

/**
 * Optional Type
 */
export type Optional<T> = T | undefined;

/**
 * NotEmptyArray Type
 */
export type NotEmptyArray<T> = [T, ...T[]];

/**
 * Pair Type
 */
export type Pair<T, U> = [T, U];

/**
 * Dict Type (expliziter als Record)
 */
export type Dict<T> = {
  [key: string]: T;
};

/**
 * KeyValuePair Type
 */
export type KeyValuePair<K extends keyof any, V> = {
  key: K;
  value: V;
};

/**
 * Prettify Typ für bessere Typ-Inferenz in komplexen Objekten
 */
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

/**
 * DeepRequired Typ für verschachtelte erforderliche Eigenschaften
 */
export type DeepRequired<T> = {
  [K in keyof T]-?: DeepRequired<T[K]>;
};

/**
 * Hilfstypus für Enum-like Stringliterale
 */
export type StringLiteralUnion<T extends string> = T | Omit<string, T>;

/**
 * Nützlicher Vue 3 Props-Typ für komponententypisierung
 */
export type PropType<T> = { __type: T };

/**
 * Type für Event-Listener
 */
export type Listener<T = any> = (event: T) => void;
export type Unsubscribe = () => void;

/**
 * Type für Event-Emitter
 */
export interface EventEmitter<Events extends Record<string, any>> {
  on<E extends keyof Events>(event: E, listener: Listener<Events[E]>): Unsubscribe;
  off<E extends keyof Events>(event: E, listener: Listener<Events[E]>): void;
  emit<E extends keyof Events>(event: E, payload: Events[E]): void;
}