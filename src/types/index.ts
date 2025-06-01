/**
 * Zentrale Export-Datei für alle Typdefinitionen
 *
 * Diese Datei dient als zentraler Import-Punkt für alle Typdefinitionen.
 * Man kann einfach `import { Type } from '@/types'` verwenden, anstatt
 * jede einzelne Typdatei direkt zu importieren.
 */

// Reexportiere alle Typdefinitionen
export * from "./store-types";
export * from "./api-types";
export * from "./component-types";
export * from "./composable-types";

// Exportiere auch andere spezifische Typdefinitionen
export * from "./auth";
export * from "./session";
export * from "./ui";
export * from "./documentConverter";
export * from "./admin";

// Exportiere neue zentralisierte Typdeklarationen
export * from "./models";
export * from "./utilities";
export * from "./adapters";
export * from "./errors";

// Globale Typdefinitionen (werden automatisch importiert)
// Referenziert in: './globals.d.ts'

// Module-Deklarationen für externe Bibliotheken
// Referenziert in: './module-declarations.d.ts'

// Definiere einige globale Utility-Typen
/**
 * Macht alle Eigenschaften eines Typs optional
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Macht alle Eigenschaften eines Typs schreibgeschützt
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/**
 * Macht alle Eigenschaften eines Typs erforderlich
 */
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

/**
 * Entfernt nullable-Eigenschaften (null oder undefined)
 */
export type NonNullable<T> = T extends null | undefined ? never : T;

/**
 * Extrahiert den Typ des ersten Arguments einer Funktion
 */
export type FirstArgument<T extends (...args: any[]) => any> = T extends (
  arg: infer A,
  ...args: any[]
) => any
  ? A
  : never;

/**
 * Extrahiert den Rückgabetyp einer Funktion ohne Promise
 */
export type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;

/**
 * Definiert eine Pick-Funktion, die nur bestimmte Eigenschaften auswählt
 */
export type PickProps<T, K extends keyof T> = Pick<T, K>;

/**
 * Definiert einen Omit-Typ, der bestimmte Eigenschaften auslässt
 */
export type OmitProps<T, K extends keyof T> = Omit<T, K>;

/**
 * Definiert einen Typ, der entweder null oder den eigentlichen Typ ist
 */
export type Nullable<T> = T | null;

/**
 * Definiert einen Typ, der entweder undefined oder den eigentlichen Typ ist
 */
export type Optional<T> = T | undefined;

/**
 * Definiert einen Typ für Funktionen, die von A nach B abbilden
 */
export type Mapper<A, B> = (a: A) => B;

/**
 * Definiert einen Typ für eine Funktion ohne Parameter, die einen bestimmten Typ zurückgibt
 */
export type Factory<T> = () => T;

/**
 * Definiert einen Typ für eine asynchrone Funktion, die einen bestimmten Typ zurückgibt
 */
export type AsyncFactory<T> = () => Promise<T>;

/**
 * Definiert einen Typ für einen Selector, der aus einem Zustandsobjekt einen Wert auswählt
 */
export type Selector<State, Result> = (state: State) => Result;

/**
 * Typischer Recordtyp für String-Schlüssel und beliebigen Werttyp
 */
export type StringRecord<T = any> = Record<string, T>;

/**
 * Typischer Recordtyp für numerische Schlüssel und beliebigen Werttyp
 */
export type NumberRecord<T = any> = Record<number, T>;
