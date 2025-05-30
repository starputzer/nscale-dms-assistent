/**
 * EventBusAdapter - Adapter für die Verwendung des TypedEventBus mit dem alten EventBus-Interface
 *
 * Dieser Adapter ermöglicht es, den neuen typisierten EventBus mit dem alten untypisierten
 * Interface zu verwenden, um Kompatibilität mit bestehendem Code zu gewährleisten.
 */

import type { EventCallback, UnsubscribeFn, EventHandler } from "./commonTypes";
import {
  EventBus,
  EventSubscription,
  EventOptions,
  BridgeLogger,
} from "./types";
import { TypedEventBus } from "./eventTypes";
import { EnhancedTypedEventBus } from "./TypedEventBus";

/**
 * Adapter für die Legacy-EventBus-Schnittstelle
 */
export class EventBusAdapter implements EventBus {
  private typedEventBus: TypedEventBus;

  constructor(logger: BridgeLogger, batchDelay: number = 50) {
    this.typedEventBus = new EnhancedTypedEventBus(logger, batchDelay);
  }

  /**
   * Löst ein Event aus
   */
  emit(eventName: string, data?: any): void {
    this.typedEventBus.emit(eventName as any, data);
  }

  /**
   * Registriert einen Event-Listener
   */
  on(
    eventName: string,
    callback: EventCallback | UnsubscribeFn,
    options?: EventOptions,
  ): EventSubscription {
    const subscription = this.typedEventBus.on(
      eventName as any,
      callback as any,
      options,
    );

    // Adapter zur Konvertierung von TypedEventSubscription zu EventSubscription
    return {
      unsubscribe: () => subscription.unsubscribe(),
    };
  }

  /**
   * Entfernt einen Event-Listener
   */
  off(eventName: string, subscriptionOrId: EventSubscription | string): void {
    if (typeof subscriptionOrId === "string") {
      this.typedEventBus.off(subscriptionOrId);
    } else {
      // Wir müssen den EventName verwenden, um Listener zu finden
      this.typedEventBus.offAll(eventName as any);
    }
  }

  /**
   * Registriert einen einmaligen Event-Listener
   */
  once(
    eventName: string,
    callback: EventCallback | UnsubscribeFn,
    options?: Omit<EventOptions, "once">,
  ): EventSubscription {
    const subscription = this.typedEventBus.once(
      eventName as any,
      callback as any,
      options,
    );

    // Adapter zur Konvertierung von TypedEventSubscription zu EventSubscription
    return {
      unsubscribe: () => subscription.unsubscribe(),
    };
  }

  /**
   * Registriert einen Event-Listener mit Priorität
   */
  priority(
    eventName: string,
    priority: number,
    callback: EventCallback | UnsubscribeFn,
    options?: Omit<EventOptions, "priority">,
  ): EventSubscription {
    const subscription = this.typedEventBus.priority(
      eventName as any,
      priority,
      callback as any,
      options,
    );

    // Adapter zur Konvertierung von TypedEventSubscription zu EventSubscription
    return {
      unsubscribe: () => subscription.unsubscribe(),
    };
  }

  /**
   * Entfernt alle Event-Listener
   */
  clear(): void {
    this.typedEventBus.clear();
  }

  /**
   * Prüft, ob der EventBus operativ ist
   */
  isOperational(): boolean {
    return this.typedEventBus.isOperational();
  }

  /**
   * Setzt den EventBus zurück
   */
  reset(): void {
    this.typedEventBus.reset();
  }

  /**
   * Liefert diagnostische Informationen über den EventBus
   */
  getDiagnostics(): any {
    return this.typedEventBus.getDiagnostics();
  }

  /**
   * Konfiguriert das Event-Batching
   */
  configureBatching(batchSize: number, batchDelay: number): void {
    // Direkter Zugriff über Cast, da diese Methode nicht im Interface definiert ist
    (this.typedEventBus as EnhancedTypedEventBus).configureBatching(
      batchSize,
      batchDelay,
    );
  }

  /**
   * Ermöglicht direkten Zugriff auf den typisierten EventBus
   */
  getTypedEventBus(): TypedEventBus {
    return this.typedEventBus;
  }
}

/**
 * Factory-Funktion für die Erstellung eines EventBusAdapter
 */
export function createEventBusAdapter(
  logger: BridgeLogger,
  batchDelay: number = 50,
): EventBus {
  return new EventBusAdapter(logger, batchDelay);
}
