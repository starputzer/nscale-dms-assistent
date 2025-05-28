/**
 * EventQueue.ts
 *
 * Implementiert ein robustes Event-Queue-System für das Bridge-System.
 * Ermöglicht geordnete Event-Verarbeitung, Event-Priorisierung und
 * verhindert Probleme mit verlorenen oder doppelten Events.
 */

import { logger } from "../logger";

// Event-Prioritäten
export enum EventPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3,
}

// Event-Status
export enum EventStatus {
  QUEUED = "queued",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
  DROPPED = "dropped",
}

// Event-Kategorie
export type EventCategory =
  | "system" // Systemereignisse (höchste Priorität)
  | "ui" // UI-Aktualisierungen
  | "data" // Datenänderungen
  | "network" // Netzwerkanfragen
  | "logging" // Logging (niedrigste Priorität)
  | "custom"; // Benutzerdefinierte Kategorie

// Event-Objekt
export interface QueuedEvent<T = any> {
  id: string; // Eindeutige ID
  name: string; // Event-Name
  priority: EventPriority; // Priorität
  category: EventCategory; // Kategorie
  data: T; // Event-Daten
  timestamp: number; // Zeitstempel der Erzeugung
  source: "vue" | "legacy" | "system"; // Quelle des Events
  status: EventStatus; // Status
  processingTime?: number; // Verarbeitungszeit (wenn abgeschlossen)
  error?: any; // Fehler (falls fehlgeschlagen)
  retryCount?: number; // Anzahl der Wiederholungsversuche
  maxRetries?: number; // Maximale Anzahl von Wiederholungen
  dependsOn?: string[]; // Event-IDs, von denen dieses Event abhängt
  relatedEvents?: string[]; // Verwandte Event-IDs
  transactionId?: string; // Zugehörige Transaktions-ID
}

// Event-Handler-Funktion
export type EventHandler<T = any> = (
  event: QueuedEvent<T>,
) => Promise<void> | void;

// Event-Filter-Funktion
export type EventFilter = (event: QueuedEvent) => boolean;

// Event-Queue-Konfiguration
export interface EventQueueConfig {
  maxQueueSize: number; // Maximale Größe der Queue
  processConcurrently: boolean; // Events parallel verarbeiten?
  maxConcurrent: number; // Maximale Anzahl paralleler Verarbeitungen
  priorityBased: boolean; // Nach Priorität sortieren?
  processingInterval: number; // Verarbeitungsintervall in ms
  retryFailed: boolean; // Fehlgeschlagene Events wiederholen?
  maxRetries: number; // Maximale Anzahl von Wiederholungen
  retryDelayMs: number; // Verzögerung zwischen Wiederholungen
  exponentialBackoff: boolean; // Exponentielles Backoff für Wiederholungen?
  dropAfterTimeout: boolean; // Events nach Timeout verwerfen?
  timeoutMs: number; // Timeout in ms
  enableDependencies: boolean; // Event-Abhängigkeiten aktivieren?
  logEventProcessing: boolean; // Event-Verarbeitung loggen?
  preserveFailedEvents: boolean; // Fehlgeschlagene Events aufbewahren?
  maxFailedEvents: number; // Maximale Anzahl aufbewahrter fehlgeschlagener Events
}

// Standard-Konfiguration
const DEFAULT_CONFIG: EventQueueConfig = {
  maxQueueSize: 1000,
  processConcurrently: true,
  maxConcurrent: 4,
  priorityBased: true,
  processingInterval: 16, // ~60fps
  retryFailed: true,
  maxRetries: 3,
  retryDelayMs: 500,
  exponentialBackoff: true,
  dropAfterTimeout: true,
  timeoutMs: 30000,
  enableDependencies: true,
  logEventProcessing: true,
  preserveFailedEvents: true,
  maxFailedEvents: 100,
};

/**
 * Stellt eine robuste Event-Queue für das Bridge-System bereit,
 * die Ereignisse in der richtigen Reihenfolge verarbeitet und
 * eine zuverlässige Ereignisverarbeitung gewährleistet.
 */
export class EventQueue {
  // Konfiguration
  private config: EventQueueConfig;

  // Event-Queue
  private queue: QueuedEvent[] = [];

  // Aktuell in Verarbeitung befindliche Events
  private processing: Set<string> = new Set();

  // Fehlgeschlagene Events
  private failedEvents: QueuedEvent[] = [];

  // Event-Handler
  private handlers: Map<string, EventHandler[]> = new Map();

  // Globale Handler (für alle Events)
  private globalHandlers: EventHandler[] = [];

  // Verarbeitungsintervall
  private processingTimer: number | null = null;

  // Event-Abhängigkeiten
  private dependencies: Map<string, Set<string>> = new Map();

  // Event-ID-Zähler
  private nextEventId = 1;

  // Queue-Status
  private isProcessing = false;
  private isPaused = false;
  private isShuttingDown = false;

  // Metriken
  private metrics = {
    totalQueued: 0,
    totalProcessed: 0,
    totalFailed: 0,
    totalRetried: 0,
    totalDropped: 0,
    maxQueueLength: 0,
    maxProcessingTime: 0,
    avgProcessingTime: 0,
  };

  /**
   * Erstellt eine neue EventQueue
   * @param config Konfiguration für die Queue
   */
  constructor(config: Partial<EventQueueConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Prozess-Timer starten
    this.startProcessing();
  }

  /**
   * Aktualisiert die Konfiguration der Queue
   * @param config Neue Konfigurationsoptionen
   */
  public updateConfig(config: Partial<EventQueueConfig>): void {
    this.config = { ...this.config, ...config };

    // Prozess-Timer neu starten, wenn sich das Intervall geändert hat
    if ("processingInterval" in config) {
      this.stopProcessing();
      this.startProcessing();
    }
  }

  /**
   * Fügt ein Event zur Queue hinzu
   * @param name Event-Name
   * @param data Event-Daten
   * @param options Zusätzliche Optionen für das Event
   * @returns Die ID des erstellten Events oder null, wenn das Event nicht hinzugefügt werden konnte
   */
  public enqueue<T>(
    name: string,
    data: T,
    options: {
      priority?: EventPriority;
      category?: EventCategory;
      source?: "vue" | "legacy" | "system";
      dependsOn?: string[];
      relatedEvents?: string[];
      transactionId?: string;
      maxRetries?: number;
    } = {},
  ): string | null {
    // Queue-Größe prüfen
    if (this.queue.length >= this.config.maxQueueSize) {
      logger.warn(
        `Event queue is full (${this.queue.length} items). Dropping event: ${name}`,
      );
      this.metrics.totalDropped++;
      return null;
    }

    // Event-ID generieren
    const eventId = `event-${Date.now()}-${this.nextEventId++}`;

    // Event erstellen
    const event: QueuedEvent<T> = {
      id: eventId,
      name,
      priority: options.priority ?? EventPriority.NORMAL,
      category: options.category ?? "custom",
      data,
      timestamp: Date.now(),
      source: options.source ?? "system",
      status: EventStatus.QUEUED,
      dependsOn: options.dependsOn,
      relatedEvents: options.relatedEvents,
      transactionId: options.transactionId,
      maxRetries: options.maxRetries ?? this.config.maxRetries,
      retryCount: 0,
    };

    // Event zur Queue hinzufügen
    this.queue.push(event);
    this.metrics.totalQueued++;

    // Maximale Queue-Länge aktualisieren
    if (this.queue.length > this.metrics.maxQueueLength) {
      this.metrics.maxQueueLength = this.queue.length;
    }

    // Abhängigkeiten verfolgen
    if (
      this.config.enableDependencies &&
      options.dependsOn &&
      options.dependsOn.length > 0
    ) {
      for (const dependencyId of options.dependsOn) {
        if (!this.dependencies.has(dependencyId)) {
          this.dependencies.set(dependencyId, new Set());
        }
        this.dependencies.get(dependencyId)!.add(eventId);
      }
    }

    logger.debug(`Enqueued event ${name} [${eventId}]`);

    // Queue sortieren, wenn prioritätsbasiert
    if (this.config.priorityBased) {
      this.sortQueue();
    }

    return eventId;
  }

  /**
   * Registriert einen Handler für bestimmte Events
   * @param eventName Event-Name, für den der Handler registriert werden soll
   * @param handler Handler-Funktion
   * @returns Eine Funktion zum Entfernen des Handlers
   */
  public on<T>(eventName: string, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, []);
    }

    this.handlers.get(eventName)!.push(handler as EventHandler);

    return () => {
      if (this.handlers.has(eventName)) {
        const handlers = this.handlers.get(eventName)!;
        const index = handlers.indexOf(handler as EventHandler);
        if (index !== -1) {
          handlers.splice(index, 1);

          // Leere Handler-Liste entfernen
          if (handlers.length === 0) {
            this.handlers.delete(eventName);
          }
        }
      }
    };
  }

  /**
   * Registriert einen globalen Handler für alle Events
   * @param handler Handler-Funktion
   * @returns Eine Funktion zum Entfernen des Handlers
   */
  public onAny(handler: EventHandler): () => void {
    this.globalHandlers.push(handler);

    return () => {
      const index = this.globalHandlers.indexOf(handler);
      if (index !== -1) {
        this.globalHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Startet die Event-Verarbeitung
   */
  public startProcessing(): void {
    if (this.processingTimer !== null) {
      return;
    }

    this.isPaused = false;
    this.processingTimer = window.setInterval(
      () => this.processQueue(),
      this.config.processingInterval,
    );

    logger.debug("Event queue processing started");
  }

  /**
   * Stoppt die Event-Verarbeitung
   */
  public stopProcessing(): void {
    if (this.processingTimer === null) {
      return;
    }

    clearInterval(this.processingTimer);
    this.processingTimer = null;

    logger.debug("Event queue processing stopped");
  }

  /**
   * Pausiert die Event-Verarbeitung
   */
  public pause(): void {
    this.isPaused = true;
    logger.debug("Event queue processing paused");
  }

  /**
   * Setzt die Event-Verarbeitung fort
   */
  public resume(): void {
    this.isPaused = false;
    logger.debug("Event queue processing resumed");
  }

  /**
   * Verarbeitet die Event-Queue
   */
  private async processQueue(): Promise<void> {
    // Nicht verarbeiten, wenn pausiert oder bereits in Verarbeitung
    if (this.isPaused || this.isProcessing || this.isShuttingDown) {
      return;
    }

    // Keine Events in der Queue
    if (this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      // Bestimmen, wie viele Events verarbeitet werden sollen
      const batchSize = this.config.processConcurrently
        ? Math.min(this.config.maxConcurrent, this.queue.length)
        : 1;

      // Events zur Verarbeitung auswählen
      const eventsToProcess: QueuedEvent[] = [];

      // Events durchgehen und Abhängigkeiten prüfen
      for (
        let i = 0;
        i < this.queue.length && eventsToProcess.length < batchSize;
        i++
      ) {
        const event = this.queue[i];

        // Prüfen, ob Event bereits verarbeitet wird
        if (this.processing.has(event.id)) {
          continue;
        }

        // Prüfen, ob Event abhängig ist von anderen Events
        if (
          this.config.enableDependencies &&
          event.dependsOn &&
          event.dependsOn.length > 0
        ) {
          // Prüfen, ob alle Abhängigkeiten abgeschlossen sind
          const hasPendingDependencies = event.dependsOn.some((depId) => {
            const depEvent = this.findEvent(depId);
            return depEvent && depEvent.status !== EventStatus.COMPLETED;
          });

          if (hasPendingDependencies) {
            continue;
          }
        }

        // Event zur Verarbeitung hinzufügen
        eventsToProcess.push(event);
        this.processing.add(event.id);

        // Event aus der Queue entfernen
        this.queue.splice(i, 1);
        i--; // Index anpassen, da wir ein Element entfernt haben
      }

      // Events verarbeiten
      const processingPromises = eventsToProcess.map((event) =>
        this.processEvent(event),
      );

      // Warten, bis alle Events verarbeitet sind
      if (this.config.processConcurrently) {
        await Promise.all(processingPromises);
      } else {
        for (const promise of processingPromises) {
          await promise;
        }
      }
    } catch (error) {
      logger.error("Error processing event queue:", error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Verarbeitet ein einzelnes Event
   * @param event Das zu verarbeitende Event
   */
  private async processEvent(event: QueuedEvent): Promise<void> {
    const startTime = performance.now();
    event.status = EventStatus.PROCESSING;

    if (this.config.logEventProcessing) {
      logger.debug(
        `Processing event ${event.name} [${event.id}] (priority: ${event.priority})`,
      );
    }

    try {
      // Timeout-Promise erstellen
      const timeoutPromise = this.config.dropAfterTimeout
        ? new Promise<void>((_, reject) => {
            setTimeout(() => {
              reject(
                new Error(
                  `Event processing timed out after ${this.config.timeoutMs}ms`,
                ),
              );
            }, this.config.timeoutMs);
          })
        : null;

      // Handler für das Event suchen
      const handlers = (this.handlers.get(event.name) || []).concat(
        this.globalHandlers,
      );

      if (handlers.length === 0) {
        logger.warn(`No handlers registered for event ${event.name}`);
        event.status = EventStatus.COMPLETED;
      } else {
        // Handler aufrufen
        const handlerPromises = handlers.map((handler) => {
          try {
            return Promise.resolve(handler(event));
          } catch (error) {
            return Promise.reject(error);
          }
        });

        // Auf Abschluss aller Handler warten oder Timeout
        if (timeoutPromise) {
          await Promise.race([Promise.all(handlerPromises), timeoutPromise]);
        } else {
          await Promise.all(handlerPromises);
        }

        // Event als abgeschlossen markieren
        event.status = EventStatus.COMPLETED;
      }

      // Verarbeitungszeit aufzeichnen
      const endTime = performance.now();
      event.processingTime = endTime - startTime;

      // Metriken aktualisieren
      this.metrics.totalProcessed++;
      if (event.processingTime > this.metrics.maxProcessingTime) {
        this.metrics.maxProcessingTime = event.processingTime;
      }

      // Durchschnittliche Verarbeitungszeit aktualisieren
      this.metrics.avgProcessingTime =
        (this.metrics.avgProcessingTime * (this.metrics.totalProcessed - 1) +
          event.processingTime) /
        this.metrics.totalProcessed;

      // Abhängige Events benachrichtigen
      if (this.config.enableDependencies && this.dependencies.has(event.id)) {
        const dependentEvents = this.dependencies.get(event.id)!;
        if (dependentEvents.size > 0) {
          logger.debug(
            `Event ${event.id} completed. Notifying ${dependentEvents.size} dependent events.`,
          );
        }
        this.dependencies.delete(event.id);
      }

      if (this.config.logEventProcessing) {
        logger.debug(
          `Event ${event.name} [${event.id}] processed in ${event.processingTime.toFixed(2)}ms`,
        );
      }
    } catch (error) {
      // Event als fehlgeschlagen markieren
      event.status = EventStatus.FAILED;
      event.error = error;

      // Verarbeitungszeit aufzeichnen
      const endTime = performance.now();
      event.processingTime = endTime - startTime;

      logger.error(
        `Error processing event ${event.name} [${event.id}]:`,
        error,
      );

      // Wiederholung planen, falls konfiguriert
      if (
        this.config.retryFailed &&
        (event.retryCount ?? 0) < (event.maxRetries ?? this.config.maxRetries)
      ) {
        event.retryCount = (event.retryCount ?? 0) + 1;

        // Verzögerung berechnen (mit exponentiellem Backoff, falls aktiviert)
        let delay = this.config.retryDelayMs;
        if (this.config.exponentialBackoff) {
          delay *= Math.pow(2, event.retryCount - 1);
        }

        logger.debug(
          `Retrying event ${event.name} [${event.id}] in ${delay}ms (attempt ${event.retryCount}/${event.maxRetries})`,
        );

        // Event zurück in die Queue stellen
        setTimeout(() => {
          event.status = EventStatus.QUEUED;
          this.queue.push(event);
          this.metrics.totalRetried++;

          // Queue sortieren, wenn prioritätsbasiert
          if (this.config.priorityBased) {
            this.sortQueue();
          }
        }, delay);
      } else {
        // Event endgültig als fehlgeschlagen markieren
        this.metrics.totalFailed++;

        // Fehlgeschlagenes Event aufbewahren, falls konfiguriert
        if (this.config.preserveFailedEvents) {
          this.failedEvents.push(event);

          // Limit für fehlgeschlagene Events prüfen
          if (this.failedEvents.length > this.config.maxFailedEvents) {
            this.failedEvents.shift(); // Ältestes Event entfernen
          }
        }
      }
    } finally {
      // Event aus der Verarbeitungsliste entfernen
      this.processing.delete(event.id);
    }
  }

  /**
   * Sortiert die Queue nach Priorität
   */
  private sortQueue(): void {
    this.queue.sort((a, b) => {
      // Zuerst nach Priorität sortieren
      if (a.priority !== b.priority) {
        return b.priority - a.priority; // Höhere Priorität zuerst
      }

      // Bei gleicher Priorität nach Zeitstempel sortieren (ältere zuerst)
      return a.timestamp - b.timestamp;
    });
  }

  /**
   * Sucht ein Event in der Queue oder in verarbeiteten Events
   * @param eventId Die zu suchende Event-ID
   * @returns Das gefundene Event oder null
   */
  private findEvent(eventId: string): QueuedEvent | null {
    // In der Queue suchen
    const queueEvent = this.queue.find((e) => e.id === eventId);
    if (queueEvent) {
      return queueEvent;
    }

    // In fehlgeschlagenen Events suchen
    const failedEvent = this.failedEvents.find((e) => e.id === eventId);
    if (failedEvent) {
      return failedEvent;
    }

    return null;
  }

  /**
   * Entfernt ein Event aus der Queue
   * @param eventId Die ID des zu entfernenden Events
   * @returns true, wenn das Event entfernt wurde, false sonst
   */
  public removeEvent(eventId: string): boolean {
    // In der Queue suchen
    const index = this.queue.findIndex((e) => e.id === eventId);
    if (index !== -1) {
      this.queue.splice(index, 1);

      // Abhängigkeiten entfernen
      if (this.dependencies.has(eventId)) {
        this.dependencies.delete(eventId);
      }

      logger.debug(`Removed event [${eventId}] from queue`);
      return true;
    }

    return false;
  }

  /**
   * Ändert die Priorität eines Events in der Queue
   * @param eventId Die ID des Events
   * @param priority Die neue Priorität
   * @returns true, wenn die Priorität geändert wurde, false sonst
   */
  public setPriority(eventId: string, priority: EventPriority): boolean {
    // In der Queue suchen
    const event = this.queue.find((e) => e.id === eventId);
    if (event) {
      event.priority = priority;

      // Queue neu sortieren
      if (this.config.priorityBased) {
        this.sortQueue();
      }

      logger.debug(`Changed priority of event [${eventId}] to ${priority}`);
      return true;
    }

    return false;
  }

  /**
   * Leert die Queue
   */
  public clearQueue(): void {
    const count = this.queue.length;
    this.queue = [];
    this.processing.clear();
    this.dependencies.clear();

    logger.debug(`Cleared event queue (${count} events removed)`);
  }

  /**
   * Bereitet die Queue auf das Herunterfahren vor
   * @param processRemaining Ob verbleibende Events verarbeitet werden sollen
   * @returns Promise, der erfüllt wird, wenn alle Events verarbeitet wurden oder die Queue geleert wurde
   */
  public async shutdown(processRemaining: boolean = true): Promise<void> {
    this.isShuttingDown = true;

    if (processRemaining && this.queue.length > 0) {
      logger.debug(
        `Processing ${this.queue.length} remaining events before shutdown`,
      );

      // Verarbeitungsintervall stoppen
      this.stopProcessing();

      // Warten, bis aktuelle Verarbeitung abgeschlossen ist
      while (this.isProcessing) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      // Verbleibende Events sequenziell verarbeiten
      const remainingEvents = [...this.queue];
      this.queue = [];

      for (const event of remainingEvents) {
        this.processing.add(event.id);
        await this.processEvent(event);
      }
    } else {
      // Queue einfach leeren
      this.clearQueue();
    }

    // Verarbeitungsintervall stoppen, falls noch nicht geschehen
    this.stopProcessing();

    logger.debug("Event queue shutdown complete");
  }

  /**
   * Gibt die aktuellen Metriken der Queue zurück
   */
  public getMetrics(): typeof this.metrics {
    return { ...this.metrics };
  }

  /**
   * Gibt die fehlgeschlagenen Events zurück
   */
  public getFailedEvents(): QueuedEvent[] {
    return [...this.failedEvents];
  }

  /**
   * Gibt die Queue-Konfiguration zurück
   */
  public getConfig(): EventQueueConfig {
    return { ...this.config };
  }

  /**
   * Gibt den aktuellen Status der Queue zurück
   */
  public getStatus(): {
    queueLength: number;
    processingCount: number;
    isPaused: boolean;
    isProcessing: boolean;
    isShuttingDown: boolean;
  } {
    return {
      queueLength: this.queue.length,
      processingCount: this.processing.size,
      isPaused: this.isPaused,
      isProcessing: this.isProcessing,
      isShuttingDown: this.isShuttingDown,
    };
  }
}

// Singleton-Instanz
const eventQueue = new EventQueue();

export default eventQueue;
