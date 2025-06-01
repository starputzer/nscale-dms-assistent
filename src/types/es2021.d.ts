/**
 * TypeScript-Definitionen für ES2021-Funktionen
 *
 * Diese Datei stellt Typdefinitionen für WeakRef und FinalizationRegistry bereit,
 * falls die TypeScript-Version diese noch nicht enthält.
 */

// Wenn TypeScript keine eingebauten WeakRef- und FinalizationRegistry-Typen hat,
// definieren wir sie selbst.
declare global {
  /**
   * WeakRef-Objekte ermöglichen das Halten einer schwachen Referenz auf ein anderes Objekt,
   * ohne zu verhindern, dass dieses Objekt vom Garbage Collector gereinigt wird.
   */
  interface WeakRef<T extends object> {
    /**
     * Gibt das referenzierte Objekt zurück, oder undefined, wenn das referenzierte
     * Objekt vom Garbage Collector gereinigt wurde.
     */
    deref(): T | undefined;
  }

  /**
   * Der WeakRef-Konstruktor
   */
  var WeakRef: {
    prototype: WeakRef<object>;
    new <T extends object>(target: T): WeakRef<T>;
  };

  /**
   * FinalizationRegistry-Objekte ermöglichen das Registrieren von Callback-Funktionen,
   * die ausgeführt werden, wenn ein registriertes Objekt vom Garbage Collector gereinigt wird.
   */
  interface FinalizationRegistry<T> {
    /**
     * Registriert ein Objekt mit einem gehaltenen Wert, der an den Callback übergeben wird,
     * wenn das Objekt vom Garbage Collector gereinigt wird.
     */
    register(target: object, heldValue: T, unregisterToken?: object): void;

    /**
     * Hebt die Registrierung von Objekten auf, die mit dem angegebenen Unregistrierungstoken
     * registriert wurden.
     */
    unregister(unregisterToken: object): void;
  }

  /**
   * Der FinalizationRegistry-Konstruktor
   */
  var FinalizationRegistry: {
    prototype: FinalizationRegistry<any>;
    new <T>(callback: (heldValue: T) => void): FinalizationRegistry<T>;
  };
}
