/**
 * Common Utility Types
 *
 * Diese Datei enthält gemeinsame Utility-Typen, die in der gesamten Anwendung
 * verwendet werden können. Sie bietet Typen für häufige Anwendungsfälle wie
 * Nullability-Checks, partielle Typen, Readonly-Typen und mehr.
 */

/**
 * Nullable<T> - Macht einen Typ nullable (T | null)
 *
 * @example
 * type MaybeString = Nullable<string>; // string | null
 */
export type Nullable<T> = T | null;

/**
 * Optional<T> - Macht einen Typ optional (T | undefined)
 *
 * @example
 * type MaybeNumber = Optional<number>; // number | undefined
 */
export type Optional<T> = T | undefined;

/**
 * NotNull<T> - Entfernt null und undefined aus einem Typ
 *
 * @example
 * type DefinitelyString = NotNull<string | null | undefined>; // string
 */
export type NotNull<T> = T extends null | undefined ? never : T;

/**
 * DeepPartial<T> - Tiefe partielle Version eines Typs
 * Macht alle verschachtelten Eigenschaften optional
 *
 * @example
 * type PartialUser = DeepPartial<User>;
 * // Kann nun unvollständige User-Objekte enthalten mit allen Eigenschaften optional
 */
export type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T;

/**
 * DeepReadonly<T> - Tiefe Readonly-Version eines Typs
 * Macht alle verschachtelten Eigenschaften readonly
 *
 * @example
 * type ReadonlyUser = DeepReadonly<User>;
 * // Kann nicht mehr verändert werden (auch keine verschachtelten Eigenschaften)
 */
export type DeepReadonly<T> = T extends (infer R)[]
  ? ReadonlyArray<DeepReadonly<R>>
  : T extends Function
    ? T
    : T extends object
      ? { readonly [P in keyof T]: DeepReadonly<T[P]> }
      : T;

/**
 * Writable<T> - Entfernt readonly von allen Eigenschaften eines Typs
 * Gegenteil von Readonly<T>
 *
 * @example
 * type WritableUser = Writable<ReadonlyUser>;
 * // Alle Eigenschaften können wieder verändert werden
 */
export type Writable<T> = {
  -readonly [P in keyof T]: T[P];
};

/**
 * PartialRecord<K, T> - Wie Record, aber alle Eigenschaften sind optional
 *
 * @example
 * type UserRoles = PartialRecord<string, boolean>;
 * // { [key: string]?: boolean }
 */
export type PartialRecord<K extends keyof any, T> = Partial<Record<K, T>>;

/**
 * NonEmptyArray<T> - Array mit mindestens einem Element
 *
 * @example
 * function processItems(items: NonEmptyArray<string>) {
 *   // items hat immer mindestens ein Element
 *   const first = items[0]; // immer sicher
 * }
 */
export type NonEmptyArray<T> = [T, ...T[]];

/**
 * AsyncReturnType<T> - Extrahiert den Rückgabetyp einer asynchronen Funktion
 *
 * @example
 * async function fetchUser() { return { id: 1, name: 'Max' }; }
 * type User = AsyncReturnType<typeof fetchUser>; // { id: number, name: string }
 */
export type AsyncReturnType<T extends (...args: any) => Promise<any>> =
  T extends (...args: any) => Promise<infer R> ? R : never;

/**
 * FunctionType - Utility-Typ für allgemeine Funktionen
 */
export type FunctionType = (...args: any[]) => any;

/**
 * EventHandler<T> - Standardtyp für Event-Handler mit optionalem Datenparameter
 *
 * @example
 * type ClickHandler = EventHandler<MouseEvent>;
 * const onClick: ClickHandler = (event) => { console.log(event); };
 */
export type EventHandler<T = any> = (event: T) => void;

/**
 * AsyncFunction - Typ für asynchrone Funktionen
 */
export type AsyncFunction<T = any> = (...args: any[]) => Promise<T>;

/**
 * Dictionary<T> - Generisches Dictionary mit String-Keys
 *
 * @example
 * const cache: Dictionary<User> = {};
 * cache['user-1'] = { id: 1, name: 'Max' };
 */
export type Dictionary<T> = Record<string, T>;

/**
 * Immutable<T> - Eine Tiefe unveränderliche Version eines Typs
 * Verhindert Änderungen an einem Objekt und seinen Eigenschaften
 *
 * @example
 * const user: Immutable<User> = { id: 1, name: 'Max' };
 * // user kann nicht verändert werden
 */
export type Immutable<T> = T extends (...args: any[]) => any
  ? T
  : T extends Array<infer U>
    ? ReadonlyArray<Immutable<U>>
    : T extends Map<infer K, infer V>
      ? ReadonlyMap<Immutable<K>, Immutable<V>>
      : T extends Set<infer U>
        ? ReadonlySet<Immutable<U>>
        : T extends object
          ? { readonly [K in keyof T]: Immutable<T[K]> }
          : T;

/**
 * Pick Deep übernimmt bestimmte Eigenschaften aus einem Typ, auch in verschachtelten Objekten
 *
 * @example
 * type UserBasic = PickDeep<User, 'id' | 'name' | 'address.city'>;
 * // Extrahiert id, name und address.city
 */
export type PickDeep<T, K extends string> = {
  [P in Extract<keyof T, K>]: T[P];
} & {
  [P in Extract<K, `${string}.${string}`> as P extends `${infer A}.${string}`
    ? A
    : never]: P extends `${infer A}.${infer Path}`
    ? A extends keyof T
      ? T[A] extends object
        ? PickDeep<T[A], Path>
        : never
      : never
    : never;
};

/**
 * Ergebnistyp für asynchrone Operationen mit Success/Error-Pattern
 *
 * @example
 * async function fetchData(): Promise<Result<User, Error>> {
 *   try {
 *     const user = await api.getUser();
 *     return { success: true, data: user };
 *   } catch (error) {
 *     return { success: false, error: error as Error };
 *   }
 * }
 */
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

// Type Guards

/**
 * Type Guard für Nicht-Null-Werte
 *
 * @example
 * const items = [1, null, 2, undefined, 3].filter(isNotNull);
 * // items ist jetzt number[] ohne null oder undefined
 */
export function isNotNull<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Type Guard für String-Werte
 */
export function isString(value: unknown): value is string {
  return typeof value === "string";
}

/**
 * Type Guard für Number-Werte
 */
export function isNumber(value: unknown): value is number {
  return typeof value === "number" && !isNaN(value);
}

/**
 * Type Guard für Boolean-Werte
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

/**
 * Type Guard für Array-Werte
 */
export function isArray<T>(value: unknown): value is Array<T> {
  return Array.isArray(value);
}

/**
 * Type Guard für nicht-leere Arrays
 */
export function isNonEmptyArray<T>(value: T[]): value is NonEmptyArray<T> {
  return Array.isArray(value) && value.length > 0;
}

/**
 * Type Guard für Objekte
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Type Guard für Funktionen
 */
export function isFunction(value: unknown): value is FunctionType {
  return typeof value === "function";
}

/**
 * Type Guard für Promise-Objekte
 */
export function isPromise<T = any>(value: unknown): value is Promise<T> {
  return (
    value instanceof Promise ||
    (!!value && typeof (value as any).then === "function")
  );
}

/**
 * Prüft, ob ein Wert einem bestimmten Enum-Typ entspricht
 */
export function isEnumValue<T extends Record<string, string | number>>(
  enumObject: T,
  value: unknown,
): value is T[keyof T] {
  return Object.values(enumObject).includes(value as T[keyof T]);
}

/**
 * Hilfsfunktion zur Typisierung von async/await-Fehlern
 *
 * @example
 * const [data, error] = await catchAsync(fetchData());
 * if (error) {
 *   // Fehlerbehandlung
 * } else {
 *   // data ist verfügbar
 * }
 */
export async function catchAsync<T>(
  promise: Promise<T>,
): Promise<[T, null] | [null, Error]> {
  try {
    const data = await promise;
    return [data, null];
  } catch (error) {
    return [null, error instanceof Error ? error : new Error(String(error))];
  }
}

/**
 * Erzeugt ein typsicheres Ereignismanagement-System
 */
export interface TypedEvent<T = void> {
  on(handler: (data: T) => void): () => void;
  off(handler: (data: T) => void): void;
  emit(data: T): void;
}

/**
 * Implementierung eines typisierten Ereignismanagements
 */
export class TypedEventEmitter<T = void> implements TypedEvent<T> {
  private handlers: Array<(data: T) => void> = [];

  public on(handler: (data: T) => void): () => void {
    this.handlers.push(handler);
    return () => this.off(handler);
  }

  public off(handler: (data: T) => void): void {
    this.handlers = this.handlers.filter((h) => h !== handler);
  }

  public emit(data: T): void {
    this.handlers.slice().forEach((h) => h(data));
  }

  public clear(): void {
    this.handlers = [];
  }
}

/**
 * Typed Map für komplexe Schlüssel durch Serialisierung
 */
export class TypedMap<K, V> {
  private map = new Map<string, V>();
  private keySerializer: (key: K) => string;

  constructor(keySerializer: (key: K) => string = JSON.stringify) {
    this.keySerializer = keySerializer;
  }

  set(key: K, value: V): this {
    this.map.set(this.keySerializer(key), value);
    return this;
  }

  get(key: K): V | undefined {
    return this.map.get(this.keySerializer(key));
  }

  has(key: K): boolean {
    return this.map.has(this.keySerializer(key));
  }

  delete(key: K): boolean {
    return this.map.delete(this.keySerializer(key));
  }

  clear(): void {
    this.map.clear();
  }

  get size(): number {
    return this.map.size;
  }
}
