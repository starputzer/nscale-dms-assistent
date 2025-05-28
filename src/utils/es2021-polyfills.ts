/**
 * Polyfills für ES2021-Features (WeakRef und FinalizationRegistry)
 *
 * Diese Datei bietet alternative Implementierungen für Browser, die ES2021-Features
 * nicht unterstützen. Dies ist wichtig für die optimierte Bridge-Implementierung,
 * die diese Features verwendet.
 */

/**
 * Prüft, ob WeakRef vom Browser unterstützt wird
 */
export function supportsWeakRef(): boolean {
  return (
    typeof window !== "undefined" &&
    "WeakRef" in window &&
    typeof (window as any).WeakRef === "function"
  );
}

/**
 * Prüft, ob FinalizationRegistry vom Browser unterstützt wird
 */
export function supportsFinalizationRegistry(): boolean {
  return (
    typeof window !== "undefined" &&
    "FinalizationRegistry" in window &&
    typeof (window as any).FinalizationRegistry === "function"
  );
}

/**
 * Einfache Polyfill-Klasse für WeakRef
 *
 * Hinweis: Diese Implementierung ist keine echte WeakRef und verhindert nicht
 * automatisches Garbage-Collection. Sie ist nur ein Fallback für Browser ohne
 * native Unterstützung.
 */
export class PolyfillWeakRef<T extends object> {
  private value: T | null;

  constructor(target: T) {
    this.value = target;
  }

  deref(): T | undefined {
    return this.value as T | undefined;
  }

  /**
   * Manuell den Wert löschen (was eine echte WeakRef nicht benötigt)
   */
  clear(): void {
    this.value = null;
  }
}

/**
 * Einfache Polyfill-Klasse für FinalizationRegistry
 *
 * Hinweis: Diese Implementierung führt keine automatische Finalisierung durch.
 * Stattdessen müssen manuelle Aufrufe von cleanup() verwendet werden.
 */
export class PolyfillFinalizationRegistry<T> {
  private registry: Map<object, { value: T; unregisterToken?: object }>;
  private callback: (heldValue: T) => void;

  constructor(callback: (heldValue: T) => void) {
    this.callback = callback;
    this.registry = new Map();
  }

  register(target: object, heldValue: T, unregisterToken?: object): void {
    this.registry.set(target, { value: heldValue, unregisterToken });
  }

  unregister(unregisterToken: object): void {
    // Use Array.from to avoid compatibility issues with Map iterators
    Array.from(this.registry.entries()).forEach(([key, entry]) => {
      if (entry.unregisterToken === unregisterToken) {
        this.registry.delete(key);
      }
    });
  }

  /**
   * Manuell Callback für einen Eintrag auslösen
   * (In einer echten FinalizationRegistry wird dies automatisch vom Garbage Collector aufgerufen)
   */
  cleanup(target: object): void {
    const entry = this.registry.get(target);
    if (entry) {
      this.callback(entry.value);
      this.registry.delete(target);
    }
  }

  /**
   * Hilfsmethode, um alte Einträge zu bereinigen
   */
  cleanupAll(): void {
    // Use Array.from to avoid compatibility issues with Map iterators
    Array.from(this.registry.entries()).forEach(([target, entry]) => {
      this.callback(entry.value);
      this.registry.delete(target);
    });
  }
}

/**
 * Stellt einen WeakRef-Konstruktor bereit, je nach Browser-Unterstützung
 */
export function getWeakRefConstructor(): any {
  return supportsWeakRef() ? (window as any).WeakRef : PolyfillWeakRef;
}

/**
 * Stellt einen FinalizationRegistry-Konstruktor bereit, je nach Browser-Unterstützung
 */
export function getFinalizationRegistryConstructor(): any {
  return supportsFinalizationRegistry()
    ? (window as any).FinalizationRegistry
    : PolyfillFinalizationRegistry;
}

// Globale Variable zum Überprüfen der Unterstützung, die in anderen Modulen verwendet werden kann
export const ES2021_SUPPORT = {
  WeakRef: supportsWeakRef(),
  FinalizationRegistry: supportsFinalizationRegistry(),
};
