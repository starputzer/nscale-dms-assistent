/**
 * Typdefinitionen für Vue 3 Composables
 *
 * Diese Datei enthält Typen, die für die Verwendung von Vue Composition API-Funktionen
 * (Composables) spezifisch sind und stellt sicher, dass diese korrekt typisiert sind.
 */

import type {
  Ref,
  ComputedRef,
  WatchSource,
  WatchOptions,
  WatchStopHandle,
} from "vue";
import type { InjectionKey } from "vue";
import type { RouteLocationNormalizedLoaded } from "vue-router";

/**
 * Reaktive Zustandstypen
 */
export type MaybeRef<T> = T | Ref<T>;
export type MaybeComputed<T> = T | ComputedRef<T>;
export type MaybeReactive<T> = T | MaybeRef<T> | MaybeComputed<T>;

/**
 * Typ für kompositionsfähige Funktionen
 */
export type Composable<ReturnType> = (...args: any[]) => ReturnType;

/**
 * Basisschnittstelle für kompositionsfähige Returnobjekte
 */
export interface ComposableReturn {
  // Alle Composables können beachten, dass sie aufgeräumt werden müssen
  dispose?: () => void;
}

/**
 * Hilfsfunktion, um einem Wert einen reaktiven Typ zuzuweisen
 */
export function asRef<T>(value: MaybeRef<T>): Ref<T> {
  return value as Ref<T>;
}

/**
 * Hilfsfunktion, um einen Wert als computed zu typisieren
 */
export function asComputed<T>(value: MaybeComputed<T>): ComputedRef<T> {
  return value as ComputedRef<T>;
}

/**
 * Lebenszyklus-Hooks-Typen
 */
export type LifecycleHook = () => void | (() => void);

/**
 * Verbesserte Watch-Typen
 */
export interface EnhancedWatchOptions<T = any> extends WatchOptions {
  /**
   * Eine Funktion, die ausgeführt wird, bevor der Watch-Callback ausgeführt wird
   */
  before?: (newValue: T, oldValue: T) => void;

  /**
   * Eine Funktion, die ausgeführt wird, nachdem der Watch-Callback ausgeführt wurde
   */
  after?: (newValue: T, oldValue: T) => void;

  /**
   * Ob versucht werden soll, den Watch-Callback sofort nach dem Setup auszuführen
   */
  immediate?: boolean;

  /**
   * Ob auf Änderungen in verschachtelten Objekten überwacht werden soll
   */
  deep?: boolean;

  /**
   * Wann der Callback ausgeführt werden soll
   */
  flush?: "pre" | "post" | "sync";

  /**
   * Fehlerbehandlung für den Watch
   */
  onError?: (error: unknown) => void;
}

/**
 * Erweiterte Watch-Funktion mit Typsicherheit
 */
export interface EnhancedWatch {
  <T>(
    source: WatchSource<T>,
    callback: (
      value: T,
      oldValue: T,
      onCleanup: (cleanupFn: () => void) => void,
    ) => void,
    options?: EnhancedWatchOptions<T>,
  ): WatchStopHandle;
  <T>(
    source: WatchSource<T>[],
    callback: (
      values: T[],
      oldValues: T[],
      onCleanup: (cleanupFn: () => void) => void,
    ) => void,
    options?: EnhancedWatchOptions<T[]>,
  ): WatchStopHandle;
}

/**
 * Häufig verwendete Composables
 */

/**
 * Fehlerbehandlungs-Composable
 */
export interface UseErrorHandling extends ComposableReturn {
  error: Ref<Error | null>;
  hasError: ComputedRef<boolean>;
  setError(error: Error | string): void;
  clearError(): void;
  handleError<T>(promise: Promise<T>): Promise<T>;
  withErrorHandling<T extends (...args: any[]) => any>(
    fn: T,
  ): (...args: Parameters<T>) => ReturnType<T>;
}

/**
 * Ladestatuskomposable
 */
export interface UseLoading extends ComposableReturn {
  isLoading: Ref<boolean>;
  setLoading(loading: boolean): void;
  withLoading<T>(promise: Promise<T>): Promise<T>;
  startLoading(): void;
  stopLoading(): void;
}

/**
 * Lokale Speicherkomposable
 */
export interface UseLocalStorage<T> extends ComposableReturn {
  value: Ref<T>;
  save(newValue?: T): void;
  load(): T | null;
  remove(): void;
  clear(): void;
}

/**
 * Formularkomposable
 */
export interface UseForm<T extends Record<string, any>>
  extends ComposableReturn {
  values: Ref<T>;
  errors: Ref<Record<keyof T, string | null>>;
  touched: Ref<Record<keyof T, boolean>>;
  isValid: ComputedRef<boolean>;
  isDirty: ComputedRef<boolean>;
  isSubmitting: Ref<boolean>;
  resetForm(): void;
  setValues(newValues: Partial<T>): void;
  handleSubmit(
    onSubmit: (values: T) => void | Promise<void>,
  ): (e?: Event) => Promise<void>;
  setFieldValue<K extends keyof T>(field: K, value: T[K]): void;
  setFieldError<K extends keyof T>(field: K, error: string | null): void;
  touchField<K extends keyof T>(field: K): void;
  validateField<K extends keyof T>(field: K): boolean;
  validateForm(): boolean;
}

/**
 * API-Cache-Composable
 */
export interface UseApiCache<T> extends ComposableReturn {
  data: Ref<T | null>;
  isLoading: Ref<boolean>;
  error: Ref<Error | null>;
  lastUpdated: Ref<number | null>;
  fetch(force?: boolean): Promise<T>;
  invalidate(): void;
  update(newData: T): void;
}

/**
 * Router-Composable
 */
export interface UseRouterUtils extends ComposableReturn {
  currentRoute: Ref<RouteLocationNormalizedLoaded>;
  isExactRoute(name: string): boolean;
  getParam(name: string): string | null;
  getQuery(name: string): string | null;
  goTo(
    name: string,
    params?: Record<string, string>,
    query?: Record<string, string>,
  ): void;
  goBack(): void;
  refresh(): void;
}

/**
 * Element-Größekomposable
 */
export interface UseElementSize<T extends HTMLElement = HTMLElement>
  extends ComposableReturn {
  element: Ref<T | null>;
  width: Ref<number>;
  height: Ref<number>;
  top: Ref<number>;
  left: Ref<number>;
  right: Ref<number>;
  bottom: Ref<number>;
  x: Ref<number>;
  y: Ref<number>;
  update(): void;
}

/**
 * Fensterresize-Composable
 */
export interface UseWindowSize extends ComposableReturn {
  width: Ref<number>;
  height: Ref<number>;
  isMobile: ComputedRef<boolean>;
  isTablet: ComputedRef<boolean>;
  isDesktop: ComputedRef<boolean>;
  breakpoint: ComputedRef<"xs" | "sm" | "md" | "lg" | "xl">;
}

/**
 * Click-Outside-Composable
 */
export interface UseClickOutside<T extends HTMLElement = HTMLElement>
  extends ComposableReturn {
  element: Ref<T | null>;
  isOutside: Ref<boolean>;
  onClickOutside(callback: (event: MouseEvent) => void): void;
}

/**
 * Toast-Notification-Composable
 */
export interface UseToast extends ComposableReturn {
  toasts: Ref<
    Array<{
      id: string;
      type: "success" | "info" | "warning" | "error";
      message: string;
      duration: number;
      timestamp: number;
    }>
  >;
  showToast(
    message: string,
    options?: {
      type?: "success" | "info" | "warning" | "error";
      duration?: number;
    },
  ): string;
  showSuccess(message: string, duration?: number): string;
  showError(message: string, duration?: number): string;
  showWarning(message: string, duration?: number): string;
  showInfo(message: string, duration?: number): string;
  removeToast(id: string): void;
  clearToasts(): void;
}

/**
 * Dialog-Composable
 */
export interface UseDialog extends ComposableReturn {
  isOpen: Ref<boolean>;
  open(): void;
  close(): void;
  toggle(): void;
  confirm(
    message: string,
    options?: { title?: string; confirmText?: string; cancelText?: string },
  ): Promise<boolean>;
  prompt(
    message: string,
    options?: {
      title?: string;
      defaultValue?: string;
      confirmText?: string;
      cancelText?: string;
    },
  ): Promise<string | null>;
  alert(
    message: string,
    options?: { title?: string; confirmText?: string },
  ): Promise<void>;
}

/**
 * Async-Composable
 */
export interface UseAsync<T, E = Error> extends ComposableReturn {
  data: Ref<T | null>;
  error: Ref<E | null>;
  isLoading: Ref<boolean>;
  isError: ComputedRef<boolean>;
  isSuccess: ComputedRef<boolean>;
  execute(...args: any[]): Promise<T>;
  reset(): void;
}

/**
 * useTheme-Composable
 */
export interface UseTheme extends ComposableReturn {
  isDarkMode: Ref<boolean>;
  toggleDarkMode(): void;
  enableDarkMode(): void;
  disableDarkMode(): void;
  getThemeVar(name: string): string;
  setThemeVar(name: string, value: string): void;
  applyTheme(theme: Record<string, string>): void;
}

/**
 * useClipboard-Composable
 */
export interface UseClipboard extends ComposableReturn {
  copied: Ref<boolean>;
  copy(text: string): Promise<boolean>;
  copyElement(element: HTMLElement): Promise<boolean>;
}

/**
 * useFocusTrap-Composable
 */
export interface UseFocusTrap<T extends HTMLElement = HTMLElement>
  extends ComposableReturn {
  element: Ref<T | null>;
  activate(): void;
  deactivate(): void;
  pause(): void;
  unpause(): void;
}

// Gängige Typen für Provide/Inject
export const ToastInjectionKey: InjectionKey<UseToast> = Symbol("toast" as any);
export const DialogInjectionKey: InjectionKey<UseDialog> = Symbol("dialog" as any);
export const ThemeInjectionKey: InjectionKey<UseTheme> = Symbol("theme" as any);
export const LoadingInjectionKey: InjectionKey<UseLoading> = Symbol("loading" as any);
export const ErrorHandlingInjectionKey: InjectionKey<UseErrorHandling> =
  Symbol("error-handling");
