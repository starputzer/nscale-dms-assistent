/**
 * TypedEventBus - Typsichere Implementierung des Event-Bus-Systems
 *
 * Diese Datei implementiert einen vollständig typisierten EventBus, der auf den
 * EventDefinitions basiert und dadurch typsichere Event-Emitting und -Listening ermöglicht.
 */

import type { EventCallback, UnsubscribeFn, EventHandler } from "./commonTypes";
import { BridgeLogger } from "./types";
import {
  EventDefinitions,
  TypedEventBus,
  TypedEventListener,
  TypedEventOptions,
  TypedEventSubscription,
  EventBusLegacyAdapter,
} from "./eventTypes";

// Helper-Typ für interne Event-Listener-Verwaltung
type StoredListener<T extends keyof EventDefinitions> = {
  callback: TypedEventListener<T>;
  options: TypedEventOptions;
  id: string;
  createdAt: number;
};

/**
 * Implementierung des typisierten EventBus
 */
export class EnhancedTypedEventBus
  implements TypedEventBus, EventBusLegacyAdapter
{
  private listeners: Map<string, Array<StoredListener<any>>> = new Map();
  private batchingEnabled = true;
  private batchSize = 10;
  private batchDelay = 50; // ms
  private batchQueue: Map<string, { data: any[]; timer: number | null }> =
    new Map();
  private logger: BridgeLogger;
  private garbageCollectedCount = 0;

  constructor(logger: BridgeLogger, batchDelay: number = 50) {
    this.logger = logger;
    this.batchDelay = batchDelay;
    this.logger.info("TypedEventBus initialisiert", { batchDelay });
  }

  /**
   * Generiert eine eindeutige ID für Event-Listener
   * @returns Eindeutige ID als String im UUID-ähnlichen Format
   */
  private generateId(): string {
    // Implementierung einer UUID v4-ähnlichen Funktion, die keine externen Abhängigkeiten erfordert
    const hexChars = "0123456789abcdef";
    let uuid = "";

    for (let i = 0; i < 36; i++) {
      if (i === 8 || i === 13 || i === 18 || i === 23) {
        uuid += "-";
      } else if (i === 14) {
        uuid += "4"; // Version 4 UUID
      } else if (i === 19) {
        uuid += hexChars[((Math.random() * 4) | 0) + 8]; // Variant bits
      } else {
        uuid += hexChars[(Math.random() * 16) | 0];
      }
    }

    return uuid;
  }

  /**
   * Registriert einen typisierten Event-Listener
   * @param eventName Name des Events
   * @param listener Callback-Funktion mit korrektem Typ
   * @param options Optionale Konfiguration
   */
  on<T extends keyof EventDefinitions>(
    eventName: T,
    listener: TypedEventListener<T>,
    options: TypedEventOptions = {},
  ): TypedEventSubscription {
    if (!eventName) {
      this.logger.warn("Event-Name fehlt bei Registrierung eines Listeners");
      // Return dummy subscription to avoid errors
      return this.createDummySubscription();
    }

    if (typeof listener !== "function") {
      this.logger.warn(`Ungültiger Listener für Event '${String(eventName)}'`);
      return this.createDummySubscription();
    }

    // Ensure listeners map exists for this event
    if (!this.listeners.has(String(eventName))) {
      this.listeners.set(String(eventName), []);
    }

    // Generate ID for listener (or use provided one)
    const id = options.id || this.generateId();
    const now = Date.now();

    // Create listener object
    const listenerObj: StoredListener<T> = {
      callback: listener,
      options: { ...options, id },
      id,
      createdAt: now,
    };

    const listeners = this.listeners.get(String(eventName))!;

    // Insert based on priority if specified
    if (options.priority !== undefined) {
      const index = listeners.findIndex(
        (l) => (l.options.priority || 0) < (options.priority || 0),
      );

      if (index >= 0) {
        listeners.splice(index, 0, listenerObj);
      } else {
        listeners.push(listenerObj);
      }
    } else {
      listeners.push(listenerObj);
    }

    this.logger.debug(`Listener registriert für Event '${String(eventName)}'`, {
      id,
      context: options.context || "unknown",
      priority: options.priority,
      once: options.once,
    });

    // Create and return subscription object
    const subscription: TypedEventSubscription = {
      unsubscribe: () => this.off(id),
      id,
      eventName: String(eventName),
      createdAt: now,
    };

    return subscription;
  }

  /**
   * Erstellt ein Dummy-Subscription-Objekt für Fehlerbehandlung
   */
  private createDummySubscription(): TypedEventSubscription {
    const id = this.generateId();
    return {
      unsubscribe: () => {},
      id,
      eventName: "error",
      createdAt: Date.now(),
    };
  }

  /**
   * Registriert einen einmalig ausgeführten typisierten Event-Listener
   */
  once<T extends keyof EventDefinitions>(
    eventName: T,
    listener: TypedEventListener<T>,
    options: Omit<TypedEventOptions, "once"> = {},
  ): TypedEventSubscription {
    return this.on(eventName, listener, { ...options, once: true });
  }

  /**
   * Hebt die Registrierung eines Event-Listeners auf
   * @param subscriptionOrId Die Subscription oder ID des zu entfernenden Listeners
   */
  off(subscriptionOrId: TypedEventSubscription | string): void {
    // Extrahiere die ID aus dem Subscription-Objekt oder verwende direkt die übergebene ID
    const id =
      typeof subscriptionOrId === "string"
        ? subscriptionOrId
        : (subscriptionOrId?.id ?? "");

    if (!id) {
      this.logger.warn(
        "Ungültige Subscription-ID beim Entfernen eines Listeners",
      );
      return;
    }

    // Überprüfe alle Event-Typen nach dieser Subscription-ID
    for (const [eventName, listeners] of this.listeners.entries()) {
      const index = listeners.findIndex((l) => l.id === id);

      if (index !== -1) {
        // Gefunden - entferne den Listener
        listeners.splice(index, 1);
        this.logger.debug(`Listener entfernt für Event '${eventName}'`, { id });

        // Entferne leere Event-Arrays
        if (listeners.length === 0) {
          this.listeners.delete(eventName);
        }

        // Nur erste Übereinstimmung entfernen (IDs sollten eindeutig sein)
        return;
      }
    }

    // Informieren, wenn nichts gefunden wurde
    this.logger.debug(`Kein Listener mit ID '${id}' gefunden zum Entfernen`);
  }

  /**
   * Hebt die Registrierung aller Listener für ein bestimmtes Event auf
   */
  offAll<T extends keyof EventDefinitions>(eventName: T): void {
    if (this.listeners.has(String(eventName))) {
      const count = this.listeners.get(String(eventName))!.length;
      this.listeners.delete(String(eventName));
      this.logger.debug(
        `Alle Listener entfernt für Event '${String(eventName)}'`,
        { count },
      );
    }
  }

  /**
   * Sendet ein typisiertes Event mit korrektem Payload
   */
  emit<T extends keyof EventDefinitions>(
    eventName: T,
    ...args: EventDefinitions[T] extends void | {} ? [] : [EventDefinitions[T]]
  ): void {
    const payload = args.length > 0 ? args[0] : undefined;

    this.logger.debug(`Event ausgelöst: ${String(eventName)}`, payload);

    if (!this.batchingEnabled) {
      this.triggerEvent(String(eventName), payload);
      return;
    }

    // Add to batch queue
    if (!this.batchQueue.has(String(eventName))) {
      this.batchQueue.set(String(eventName), { data: [], timer: null });
    }

    const batch = this.batchQueue.get(String(eventName))!;
    batch.data.push(payload);

    if (batch.data.length >= this.batchSize) {
      // Send immediately if batch size reached
      this.flushEventBatch(String(eventName));
    } else if (batch.timer === null) {
      // Start timer if none is running
      batch.timer = window.setTimeout(() => {
        this.flushEventBatch(String(eventName));
      }, this.batchDelay);
    }
  }

  /**
   * Sendet mehrere Events gleichzeitig
   */
  emitMultiple(
    events: Array<
      [keyof EventDefinitions & string, any] | [keyof EventDefinitions & string]
    >,
  ): void {
    for (const event of events) {
      const eventName = event[0];
      // Ensure payload is properly typed with explicit check for array length
      const payload = event.length > 1 ? event[1] : undefined;

      if (!this.batchQueue.has(eventName)) {
        this.batchQueue.set(eventName, { data: [], timer: null });
      }

      // Add the payload to the batch queue
      const queue = this.batchQueue.get(eventName);
      if (queue) {
        queue.data.push(payload);
      }
    }

    // Schedule batch processing
    for (const eventName of this.batchQueue.keys()) {
      const batch = this.batchQueue.get(eventName)!;

      if (batch.data.length >= this.batchSize) {
        this.flushEventBatch(eventName);
      } else if (batch.timer === null && batch.data.length > 0) {
        batch.timer = window.setTimeout(() => {
          this.flushEventBatch(eventName);
        }, this.batchDelay);
      }
    }
  }

  /**
   * Sendet einen Batch von Events
   */
  private flushEventBatch(eventName: string): void {
    const batch = this.batchQueue.get(eventName);
    if (!batch) return;

    if (batch.timer !== null) {
      clearTimeout(batch.timer);
      batch.timer = null;
    }

    if (batch.data.length > 0) {
      this.logger.debug(`Batch-Event wird gesendet: ${eventName}`, {
        count: batch.data.length,
      });

      // If only one item, send it directly
      if (batch.data.length === 1) {
        this.triggerEvent(eventName, batch.data[0]);
      } else {
        // Otherwise, send as array
        this.triggerEvent(eventName, batch.data);
      }

      batch.data = [];
    }
  }

  /**
   * Löst ein Event für alle Listener aus
   */
  private triggerEvent(eventName: string, data: any): void {
    if (!this.listeners.has(eventName)) return;

    // Create a copy of the listeners array to avoid issues with modifications during iteration
    const listeners = [...this.listeners.get(eventName)!];
    const onceListeners: string[] = [];

    for (const listener of listeners) {
      try {
        const { callback, options } = listener;

        // Handle timeout if specified
        if (options.timeout !== undefined && options.timeout > 0) {
          this.executeWithTimeout(callback, data, options.timeout);
        } else {
          // Check if event payload is expected
          if (data !== undefined) {
            callback(data);
          } else {
            (callback as Function)();
          }
        }

        // Track listeners to be removed if they're marked as 'once'
        if (options.once) {
          onceListeners.push(listener.id);
        }
      } catch (error) {
        this.logger.error(
          `Fehler beim Ausführen des Listeners für ${eventName}:`,
          error,
        );
      }
    }

    // Remove 'once' listeners
    for (const id of onceListeners) {
      this.off(id);
    }
  }

  /**
   * Führt eine Callback-Funktion mit Timeout aus
   */
  private executeWithTimeout(
    callback: EventCallback | UnsubscribeFn,
    data: any,
    timeout: number,
  ): void {
    let hasTimedOut = false;

    // Start a timer for timeout
    const timeoutId = setTimeout(() => {
      hasTimedOut = true;
      this.logger.warn(
        `Event-Listener-Ausführung hat das Timeout von ${timeout}ms überschritten`,
      );
    }, timeout);

    try {
      if (data !== undefined) {
        callback(data);
      } else {
        callback();
      }
    } finally {
      // Clear timer if not timed out yet
      if (!hasTimedOut) {
        clearTimeout(timeoutId);
      }
    }
  }

  /**
   * Registriert einen typisierten Event-Listener mit Priorität
   */
  priority<T extends keyof EventDefinitions>(
    eventName: T,
    priority: number,
    listener: TypedEventListener<T>,
    options: Omit<TypedEventOptions, "priority"> = {},
  ): TypedEventSubscription {
    return this.on(eventName, listener, { ...options, priority });
  }

  /**
   * Prüft, ob der EventBus operativ ist
   */
  isOperational(): boolean {
    return true; // Simplified implementation
  }

  /**
   * Setzt den EventBus zurück
   */
  reset(): void {
    // Cancel all pending batch timers
    for (const [, batch] of this.batchQueue.entries()) {
      if (batch.timer !== null) {
        clearTimeout(batch.timer);
        batch.timer = null;
      }
    }

    // Clear all data structures
    this.batchQueue.clear();
    this.listeners.clear();
    this.garbageCollectedCount = 0;

    this.logger.info("EventBus zurückgesetzt");
  }

  /**
   * Entfernt alle Event-Listener
   */
  clear(): void {
    this.listeners.clear();
    this.logger.info("Alle Event-Listener entfernt");
  }

  /**
   * Liefert diagnostische Informationen über den EventBus
   */
  getDiagnostics(): {
    listenerCount: number;
    eventTypes: string[];
    pendingEvents: string[];
    batching: {
      enabled: boolean;
      queueSize: number;
      batchDelay: number;
    };
    memory: {
      trackedListeners: number;
      gcCollected: number;
    };
  } {
    let totalListeners = 0;
    for (const listeners of this.listeners.values()) {
      totalListeners += listeners.length;
    }

    return {
      listenerCount: totalListeners,
      eventTypes: [...this.listeners.keys()],
      pendingEvents: [...this.batchQueue.keys()].filter((key: any) => {
        const batch = this.batchQueue.get(key)!;
        return batch.data.length > 0 || batch.timer !== null;
      }),
      batching: {
        enabled: this.batchingEnabled,
        queueSize: this.batchSize,
        batchDelay: this.batchDelay,
      },
      memory: {
        trackedListeners: totalListeners,
        gcCollected: this.garbageCollectedCount,
      },
    };
  }

  /**
   * Konfiguriert das Event-Batching
   */
  configureBatching(batchSize: number, batchDelay: number): void {
    this.batchSize = batchSize;
    this.batchDelay = batchDelay;
    this.logger.debug("Event-Batching konfiguriert", { batchSize, batchDelay });
  }

  /**
   * Deaktiviert das Event-Batching
   */
  disableBatching(): void {
    this.batchingEnabled = false;

    // Flush all pending batches
    for (const eventName of this.batchQueue.keys()) {
      this.flushEventBatch(eventName);
    }

    this.logger.debug("Event-Batching deaktiviert");
  }

  /**
   * Aktiviert das Event-Batching wieder
   */
  enableBatching(): void {
    this.batchingEnabled = true;
    this.logger.debug("Event-Batching aktiviert");
  }

  /**
   * Registriert einen Event-Listener mit einfacherer Schnittstelle (Legacy-Adapter)
   * @param eventName Name des Events
   * @param callback Callback-Funktion (untypisiert für Legacy-Kompatibilität)
   * @returns Funktion zum Entfernen des Listeners
   */
  addEventListener(eventName: string, callback: EventCallback | UnsubscribeFn): () => void {
    if (!eventName || typeof callback !== "function") {
      this.logger.warn(
        "Ungültiger Event-Name oder Callback in addEventListener",
      );
      return () => {}; // Dummy-Funktion zurückgeben
    }

    // Da wir in einer typisierten Umgebung sind, aber untypisierte Events erlauben müssen,
    // behandeln wir das Event als custom oder legacy Event
    const typedEventName =
      eventName.startsWith("custom:") || eventName.startsWith("legacy:")
        ? (eventName as keyof EventDefinitions)
        : (`legacy:${eventName}` as keyof EventDefinitions);

    const subscription = this.on(typedEventName, callback as any);
    return () => this.off(subscription);
  }

  /**
   * Entfernt einen Event-Listener mit einfacherer Schnittstelle (Legacy-Adapter)
   * @param eventName Name des Events
   * @param callback Die zu entfernende Callback-Funktion
   */
  removeEventListener(eventName: string, callback: EventCallback | UnsubscribeFn): void {
    if (!eventName) {
      this.logger.warn("Ungültiger Event-Name in removeEventListener");
      return;
    }

    // Unterstütze sowohl direkte Event-Namen als auch legacy/custom-Präfixe
    const possibleEventNames = [
      eventName,
      `legacy:${eventName}`,
      `custom:${eventName}`,
    ];

    // Überprüfe alle möglichen Event-Namen
    for (const evName of possibleEventNames) {
      if (this.listeners.has(evName)) {
        const listeners = this.listeners.get(evName)!;

        // Von hinten nach vorne durchlaufen, da wir während der Iteration entfernen
        for (let i = listeners.length - 1; i >= 0; i--) {
          if (listeners[i].callback === callback) {
            this.off(listeners[i].id);
            this.logger.debug(
              `Listener über removeEventListener entfernt für '${evName}'`,
            );
          }
        }
      }
    }
  }

  /**
   * Sendet ein Event mit einfacherer Schnittstelle (Legacy-Adapter)
   * @param eventName Name des Events
   * @param data Optionale Daten, die an die Listener übergeben werden
   */
  dispatchEvent(eventName: string, data?: any): void {
    if (!eventName) {
      this.logger.warn("Ungültiger Event-Name in dispatchEvent");
      return;
    }

    // Da wir in einer typisierten Umgebung sind, aber untypisierte Events erlauben müssen,
    // behandeln wir das Event als custom oder legacy Event
    const typedEventName =
      eventName.startsWith("custom:") || eventName.startsWith("legacy:")
        ? (eventName as keyof EventDefinitions)
        : (`legacy:${eventName}` as keyof EventDefinitions);

    // Emittiere das Event mit korrekter Typisierung für den EventBus
    if (data !== undefined) {
      this.emit(typedEventName, data);
    } else {
      // Für Events ohne Daten
      this.emit(typedEventName as any);
    }

    // Für maximale Kompatibilität emittieren wir auch das Original-Event, falls es anders ist
    if (typedEventName !== eventName) {
      this.logger.debug(
        `Zusätzlich natives Event emittiert für Kompatibilität: ${eventName}`,
      );
      if (data !== undefined) {
        this.emit(eventName as keyof EventDefinitions, data);
      } else {
        this.emit(eventName as any);
      }
    }
  }
}
