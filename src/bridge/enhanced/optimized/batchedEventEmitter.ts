/**
 * BatchedEventEmitter - Optimiert Ereignisverarbeitung durch Batchverarbeitung
 *
 * Diese Komponente ermöglicht das Bündeln von häufigen Ereignissen für effizientere
 * Verarbeitung und reduzierte Leistungsbelastung in der Bridge-Kommunikation.
 */

import { Logger, LogLevel } from "../logger";
import { PerformanceMonitor } from "./performanceMonitor";

interface EventBatchConfig {
  enabled: boolean; // Batchverarbeitung aktivieren
  maxBatchSize: number; // Maximale Anzahl von Ereignissen pro Batch
  maxBatchDelay: number; // Maximale Verzögerung vor der Batchverarbeitung (ms)
  priorityEvents: string[]; // Ereignisse, die sofort verarbeitet werden sollen
  prioritizeLegacyEvents: boolean; // Legacy-Ereignisse bevorzugt verarbeiten
  useIdleCallback: boolean; // requestIdleCallback verwenden, wenn verfügbar
  useAnimationFrame: boolean; // requestAnimationFrame für visuelle Ereignisse verwenden
  flushOnUnload: boolean; // Alle Batches beim Entladen der Seite verarbeiten
  monitorPerformance: boolean; // Leistung überwachen
}

interface EventItem {
  type: string; // Ereignistyp
  data: any; // Ereignisdaten
  timestamp: number; // Zeitstempel des Ereignisses
  source: "vue" | "vanilla" | "system"; // Quelle des Ereignisses
  priority: number; // Priorität (höher = wichtiger)
}

const DEFAULT_CONFIG: EventBatchConfig = {
  enabled: true,
  maxBatchSize: 20,
  maxBatchDelay: 50,
  priorityEvents: ["error", "ready", "ping", "pong", "status", "init"],
  prioritizeLegacyEvents: true,
  useIdleCallback: true,
  useAnimationFrame: true,
  flushOnUnload: true,
  monitorPerformance: true,
};

/**
 * BatchedEventEmitter ermöglicht effizientere Ereignisverarbeitung durch Bündelung
 */
export class BatchedEventEmitter {
  private logger: Logger;
  private config: EventBatchConfig;
  private performanceMonitor?: PerformanceMonitor;

  // Ereigniswarteschlangen
  private vueEvents: EventItem[] = [];
  private vanillaEvents: EventItem[] = [];
  private systemEvents: EventItem[] = [];

  // Callbacks
  private emitCallback: (
    type: string,
    data: any,
    source: "vue" | "vanilla" | "system",
  ) => void;

  // Timer und IDs
  private batchTimer: number | null = null;
  private animationFrameId: number | null = null;
  private idleCallbackId: number | null = null;

  // Statistiken
  private stats = {
    totalEvents: 0,
    batchedEvents: 0,
    directEvents: 0,
    batches: 0,
    skippedBatches: 0,
    lastProcessed: 0,
    processingTime: {
      total: 0,
      count: 0,
      average: 0,
      max: 0,
    },
  };

  /**
   * Konstruktor
   */
  constructor(
    emitCallback: (
      type: string,
      data: any,
      source: "vue" | "vanilla" | "system",
    ) => void,
    config: Partial<EventBatchConfig> = {},
    performanceMonitor?: PerformanceMonitor,
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.emitCallback = emitCallback;
    this.performanceMonitor = performanceMonitor;

    this.logger = new Logger("BatchedEventEmitter", LogLevel.INFO);

    // Unload-Handler registrieren, um alle Batches zu verarbeiten
    if (this.config.flushOnUnload) {
      window.addEventListener("beforeunload", this.flushAllBatches.bind(this));
    }

    this.logger.info("BatchedEventEmitter initialisiert", {
      batchSize: this.config.maxBatchSize,
      batchDelay: this.config.maxBatchDelay,
    });
  }

  /**
   * Ereignis zur Batchverarbeitung hinzufügen oder direkt verarbeiten
   */
  public addEvent(
    type: string,
    data: any,
    source: "vue" | "vanilla" | "system" = "system",
    priority: number = 1,
  ): void {
    // Statistik aktualisieren
    this.stats.totalEvents++;

    // Prüfen, ob der Event-Typ priorisiert werden soll
    const isPriorityEvent = this.config.priorityEvents.some((pattern) =>
      typeof pattern === "string"
        ? type.includes(pattern)
        : pattern instanceof RegExp
          ? pattern.test(type)
          : false,
    );

    if (!this.config.enabled || isPriorityEvent) {
      // Direkt verarbeiten, wenn Batching deaktiviert ist oder es sich um ein priorisiertes Ereignis handelt
      this.emitCallback(type, data, source);
      this.stats.directEvents++;

      this.logger.debug(
        `Ereignis direkt verarbeitet: ${type} (Quelle: ${source})`,
      );
      return;
    }

    // Event zum entsprechenden Batch hinzufügen
    const event: EventItem = {
      type,
      data,
      timestamp: Date.now(),
      source,
      priority,
    };

    switch (source) {
      case "vue":
        this.vueEvents.push(event);
        break;
      case "vanilla":
        this.vanillaEvents.push(event);
        break;
      case "system":
        this.systemEvents.push(event);
        break;
    }

    this.stats.batchedEvents++;

    // Batch-Verarbeitung planen, wenn noch nicht geplant
    this.scheduleBatchProcessing();
  }

  /**
   * Batch-Verarbeitung planen
   */
  private scheduleBatchProcessing(): void {
    // Bestehenden Timer löschen
    this.cancelScheduledProcessing();

    // In Animation Frame verarbeiten (besser für visuelle Aktualisierungen)
    if (this.config.useAnimationFrame) {
      this.animationFrameId = requestAnimationFrame(() => {
        this.animationFrameId = null;
        this.processBatches();
      });
      return;
    }

    // In Idle Callback verarbeiten (wenn verfügbar und aktiviert)
    if (this.config.useIdleCallback && "requestIdleCallback" in window) {
      this.idleCallbackId = (window as any).requestIdleCallback(
        (deadline: { didTimeout: boolean; timeRemaining: () => number }) => {
          this.idleCallbackId = null;

          // Nur verarbeiten, wenn genug Zeit übrig ist oder Timeout erreicht
          if (deadline.didTimeout || deadline.timeRemaining() > 10) {
            this.processBatches();
          } else {
            // Nicht genug Zeit, auf Standard-Timeout zurückfallen
            this.batchTimer = window.setTimeout(() => {
              this.batchTimer = null;
              this.processBatches();
            }, this.config.maxBatchDelay);
          }
        },
        { timeout: this.config.maxBatchDelay },
      );
      return;
    }

    // Standard-Timeout verwenden
    this.batchTimer = window.setTimeout(() => {
      this.batchTimer = null;
      this.processBatches();
    }, this.config.maxBatchDelay);
  }

  /**
   * Geplante Verarbeitung abbrechen
   */
  private cancelScheduledProcessing(): void {
    if (this.batchTimer !== null) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.idleCallbackId !== null && "cancelIdleCallback" in window) {
      (window as any).cancelIdleCallback(this.idleCallbackId);
      this.idleCallbackId = null;
    }
  }

  /**
   * Alle Events aus allen Warteschlangen verarbeiten
   */
  private processBatches(): void {
    // Batch-Verarbeitung überspringen, wenn keine Ereignisse vorhanden
    const totalEvents =
      this.vueEvents.length +
      this.vanillaEvents.length +
      this.systemEvents.length;

    if (totalEvents === 0) {
      this.stats.skippedBatches++;
      return;
    }

    // Leistungsmessung starten
    const startTime = performance.now();

    try {
      // Verarbeitungsreihenfolge bestimmen
      const queues: ("vue" | "vanilla" | "system")[] = this.config
        .prioritizeLegacyEvents
        ? ["vanilla", "system", "vue"]
        : ["vue", "system", "vanilla"];

      // Alle Warteschlangen nacheinander verarbeiten
      for (const queue of queues) {
        const events =
          queue === "vue"
            ? this.vueEvents
            : queue === "vanilla"
              ? this.vanillaEvents
              : this.systemEvents;

        // Leere Warteschlange überspringen
        if (events.length === 0) continue;

        // Ereignisse nach Priorität sortieren (höhere Priorität zuerst)
        events.sort((a, b) => b.priority - a.priority);

        // Batch-Größe begrenzen
        const batchSize = Math.min(events.length, this.config.maxBatchSize);
        const batch = events.splice(0, batchSize);

        // Ereignisse verarbeiten
        for (const event of batch) {
          this.emitCallback(event.type, event.data, event.source);
        }

        this.logger.debug(
          `Batch mit ${batch.length} Ereignissen aus ${queue} verarbeitet`,
        );
      }

      // Batch-Statistik aktualisieren
      this.stats.batches++;
      this.stats.lastProcessed = Date.now();

      // Leistungsmessung beenden
      const processingTime = performance.now() - startTime;

      // Statistik aktualisieren
      this.stats.processingTime.total += processingTime;
      this.stats.processingTime.count++;
      this.stats.processingTime.average =
        this.stats.processingTime.total / this.stats.processingTime.count;
      this.stats.processingTime.max = Math.max(
        this.stats.processingTime.max,
        processingTime,
      );

      // Leistungsüberwachung
      if (this.performanceMonitor && this.config.monitorPerformance) {
        this.performanceMonitor.recordMetric(
          "batchedEventEmitter.processingTime",
          processingTime,
          "ms",
          "bridge",
          "events",
        );

        this.performanceMonitor.recordMetric(
          "batchedEventEmitter.batchSize",
          totalEvents,
          "count",
          "bridge",
          "events",
        );
      }

      // Weitere Verarbeitung planen, wenn noch Ereignisse vorhanden
      if (
        this.vueEvents.length > 0 ||
        this.vanillaEvents.length > 0 ||
        this.systemEvents.length > 0
      ) {
        this.scheduleBatchProcessing();
      }
    } catch (error) {
      this.logger.error("Fehler bei der Batch-Verarbeitung", error);

      // Im Fehlerfall alle verbleibenden Ereignisse sofort verarbeiten
      this.flushAllBatches();
    }
  }

  /**
   * Alle Batches sofort verarbeiten
   */
  public flushAllBatches(): void {
    this.logger.debug("Verarbeite alle verbleibenden Batches sofort");

    // Bestehende Timer abbrechen
    this.cancelScheduledProcessing();

    // Alle Ereignisse direkt verarbeiten
    [...this.systemEvents, ...this.vanillaEvents, ...this.vueEvents].forEach(
      (event) => {
        this.emitCallback(event.type, event.data, event.source);
      },
    );

    // Warteschlangen leeren
    this.systemEvents = [];
    this.vanillaEvents = [];
    this.vueEvents = [];
  }

  /**
   * Statistiken abrufen
   */
  public getStats(): typeof this.stats {
    return { ...this.stats };
  }

  /**
   * Ressourcen freigeben
   */
  public dispose(): void {
    this.logger.info("BatchedEventEmitter wird freigegeben");

    // Alle geplanten Verarbeitungen abbrechen
    this.cancelScheduledProcessing();

    // Event-Listener entfernen
    if (this.config.flushOnUnload) {
      window.removeEventListener(
        "beforeunload",
        this.flushAllBatches.bind(this),
      );
    }

    // Alle verbleibenden Batches verarbeiten
    this.flushAllBatches();

    // Referenzen zurücksetzen
    this.emitCallback = () => {}; // Leere Funktion
    this.performanceMonitor = undefined;
  }
}

/**
 * Factory-Funktion für BatchedEventEmitter
 */
export function createBatchedEventEmitter(
  emitCallback: (
    type: string,
    data: any,
    source: "vue" | "vanilla" | "system",
  ) => void,
  config: Partial<EventBatchConfig> = {},
  performanceMonitor?: PerformanceMonitor,
): BatchedEventEmitter {
  return new BatchedEventEmitter(emitCallback, config, performanceMonitor);
}

export default {
  createBatchedEventEmitter,
};
