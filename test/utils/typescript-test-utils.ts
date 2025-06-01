/**
 * TypeScript Test Utilities
 *
 * Diese Datei enthält Hilfsfunktionen und -typen, die speziell für TypeScript-Tests entwickelt wurden.
 * Sie bietet Typsicherheit für Mock-Daten, Assertions und Test-Utilities.
 */

import { Ref, ComputedRef, Component } from "vue";
import { mount, MountingOptions, VueWrapper } from "@vue/test-utils";
import { vi, type MockInstance } from "vitest";
import { StoreDefinition } from "pinia";
import { APIResponse, APIError } from "@/utils/apiTypes";
import { Result } from "@/utils/types";

// ---------- Mock-Daten Typen ----------

/**
 * Typisierter Mock für alle Mock-Daten
 *
 * @template T Der Typ der Mock-Daten
 * @param overrides Überschreibungen für Standardwerte
 * @param defaults Standardwerte
 * @returns Typisierte Mock-Daten
 */
export function createTypedMock<T extends Record<string, any>>(
  overrides: Partial<T> = {},
  defaults: T,
): T {
  return {
    ...defaults,
    ...overrides,
  };
}

/**
 * API-Antwort Mock mit Typsicherheit
 *
 * @template T Der Typ der Antwortdaten
 * @param data Die Antwortdaten
 * @param success Ob die Anfrage erfolgreich war
 * @param statusCode HTTP-Statuscode
 * @returns Typisierte API-Antwort
 */
export function createMockApiResponse<T = any>(
  data: T,
  success = true,
  statusCode = 200,
): APIResponse<T> {
  return {
    success,
    data,
    statusCode,
    message: success ? "Success" : "Error",
    timestamp: new Date().toISOString(),
  };
}

/**
 * API-Fehler Mock mit Typsicherheit
 *
 * @param code Fehlercode
 * @param message Fehlermeldung
 * @param statusCode HTTP-Statuscode
 * @returns Typisierter API-Fehler
 */
export function createMockApiError(
  code: string,
  message: string,
  statusCode: number = 500,
): APIError {
  return {
    code,
    message,
    statusCode,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Result-Typ Mock für Erfolgsfall
 *
 * @template T Der Typ der Erfolgsdaten
 * @param data Die Erfolgsdaten
 * @returns Typisiertes Result-Objekt für Erfolg
 */
export function createSuccessResult<T>(data: T): Result<T, APIError> {
  return {
    success: true,
    data,
  };
}

/**
 * Result-Typ Mock für Fehlerfall
 *
 * @template E Der Typ des Fehlers
 * @param error Der Fehler
 * @returns Typisiertes Result-Objekt für Fehler
 */
export function createErrorResult<E = APIError>(error: E): Result<any, E> {
  return {
    success: false,
    error,
  };
}

// ---------- Vue-spezifische Test-Utilities ----------

/**
 * Typsicherere Mount-Funktion für Vue-Komponenten
 *
 * @template TComponent Der Typ der zu mountenden Komponente
 * @template TProps Der Typ der Props der Komponente
 * @param component Die zu mountende Komponente
 * @param options Optionen für das Mounten
 * @returns Typisierter VueWrapper
 */
export function typedMount<
  TComponent extends Component,
  TProps = ComponentProps<TComponent>,
>(
  component: TComponent,
  options?: MountingOptions<TProps>,
): VueWrapper<InstanceType<TComponent>> {
  return mount(component, options as any) as VueWrapper<
    InstanceType<TComponent>
  >;
}

/**
 * Extrahiert Prop-Typen aus einer Komponente
 */
export type ComponentProps<C extends Component> = InstanceType<C>["$props"];

/**
 * Extrahiert Emit-Typen aus einer Komponente
 */
export type ComponentEmits<C extends Component> = InstanceType<C>["$emit"];

// ---------- Store-spezifische Test-Utilities ----------

/**
 * Typisierte Mock-Funktion für Store-Actions
 *
 * @template TStore Der Typ des Stores
 * @template TAction Der Name der zu mockenden Action
 * @param store Die Store-Instanz
 * @param action Der Name der zu mockenden Action
 * @param implementation Die Mock-Implementierung
 * @returns Mock-Funktion
 */
export function mockStoreAction<
  TStore extends Record<string, any>,
  TAction extends keyof TStore,
>(
  store: TStore,
  action: TAction,
  implementation?: (...args: any[]) => any,
): MockInstance {
  return vi
    .spyOn(store, action as any)
    .mockImplementation(implementation || vi.fn());
}

/**
 * Typisierte Mock-Funktion für Store-Getters
 *
 * @template TStore Der Typ des Stores
 * @template TGetter Der Name des zu mockenden Getters
 * @param store Die Store-Instanz
 * @param getter Der Name des zu mockenden Getters
 * @param value Der Wert, den der Getter zurückgeben soll
 */
export function mockStoreGetter<
  TStore extends Record<string, any>,
  TGetter extends keyof TStore,
>(store: TStore, getter: TGetter, value: any): void {
  Object.defineProperty(store, getter, {
    get: () => value,
    configurable: true,
  });
}

// ---------- Ref-spezifische Test-Utilities ----------

/**
 * Erstellt ein typisiertes, reaktives Ref für Tests
 *
 * @template T Der Typ des Ref-Werts
 * @param initialValue Der Initialwert
 * @returns Ref-Objekt
 */
export function createTestRef<T>(initialValue: T): Ref<T> {
  return {
    value: initialValue,
  } as Ref<T>;
}

/**
 * Erstellt ein typisiertes, berechnetes Ref für Tests
 *
 * @template T Der Typ des ComputedRef-Werts
 * @param value Der Wert
 * @returns ComputedRef-Objekt
 */
export function createTestComputedRef<T>(value: T): ComputedRef<T> {
  return {
    value,
  } as ComputedRef<T>;
}

// ---------- Assertion-Hilfsfunktionen ----------

/**
 * Überprüft zur Kompilierzeit, ob ein Typ einem anderen Typ entspricht
 *
 * @template T Der zu überprüfende Typ
 * @template U Der erwartete Typ
 */
export type AssertType<T extends U, U> = T;

/**
 * Überprüft, ob ein Objekt dem erwarteten Typ entspricht (zur Laufzeit)
 *
 * @template T Der erwartete Typ
 * @param value Das zu überprüfende Objekt
 * @param validator Eine optionale Validierungsfunktion
 * @returns Das validierte Objekt
 */
export function assertType<T>(
  value: unknown,
  validator?: (value: unknown) => boolean,
): T {
  if (validator && !validator(value)) {
    throw new Error(`Value does not match expected type: ${value}`);
  }
  return value as T;
}

/**
 * Überprüft, ob ein Objekt ein bestimmtes Property hat
 *
 * @template T Der Typ des Objekts
 * @template K Der Property-Name
 * @param obj Das zu überprüfende Objekt
 * @param prop Der erwartete Property-Name
 * @returns true, wenn das Objekt die Property hat
 */
export function hasProperty<T, K extends keyof T>(obj: T, prop: K): boolean {
  return prop in obj;
}

/**
 * Überprüft, ob eine Funktion mit bestimmten Parametern aufgerufen wurde
 *
 * @template T Der Typ der Funktion
 * @param mockFn Die gemockte Funktion
 * @param params Die erwarteten Parameter
 * @returns true, wenn die Funktion mit den erwarteten Parametern aufgerufen wurde
 */
export function wasCalledWith<T extends (...args: any[]) => any>(
  mockFn: MockInstance<Parameters<T>, ReturnType<T>>,
  ...params: Parameters<T>
): boolean {
  return mockFn.mock.calls.some(
    (call) =>
      call.length === params.length &&
      call.every((arg, i) => arg === params[i]),
  );
}

// ---------- Exportieren ----------

export { vi, mount };
