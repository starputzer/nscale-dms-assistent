/**
 * EventListenerManager - Speicherverwaltung für Event-Listener und Ressourcen
 *
 * Diese Komponente verhindert Memory-Leaks durch automatisches Aufräumen von
 * Event-Listenern und Ressourcen in der Bridge-Kommunikation.
 */

import { createLogger, LogLevel } from "../logger/index";
import { PerformanceMonitor } from "./performanceMonitor";

// Konfiguration
interface EventListenerManagerConfig {
  enableLeakPrevention: boolean; // Automatische Leckverhinderung aktivieren
  enableGarbageCollection: boolean; // Proaktive Speicherbereinigung aktivieren
  trackUnsubscribeRate: boolean; // Abmelderate verfolgen
  forceUnsubscribeOnCleanup: boolean; // Erzwungenes Abmelden beim Aufräumen
  gcInterval: number; // Intervall für Speicherbereinigung (ms)
  checkStaleListenersMs: number; // Intervall zur Überprüfung veralteter Listener (ms)
  maxStaleListenerAge: number; // Maximales Alter für veraltete Listener (ms)
  enableMetrics: boolean; // Metriken aktivieren
  debugMode: boolean; // Debug-Modus aktivieren
}

// Standard-Konfiguration
const DEFAULT_CONFIG: EventListenerManagerConfig = {
  enableLeakPrevention: true,
  enableGarbageCollection: true,
  trackUnsubscribeRate: true,
  forceUnsubscribeOnCleanup: true,
  gcInterval: 60000, // 1 Minute
  checkStaleListenersMs: 30000, // 30 Sekunden
  maxStaleListenerAge: 300000, // 5 Minuten
  enableMetrics: true,
  debugMode: false,
};

// Event-Listener-Informationen
interface ListenerInfo {
  id: string; // Eindeutige ID des Listeners
  eventType: string; // Ereignistyp
  handler: Function; // Event-Handler-Funktion
  source: "vue" | "vanilla" | "system"; // Quelle des Ereignisses
  createdAt: number; // Erstellungszeitpunkt
  lastUsed: number; // Zeitpunkt der letzten Verwendung
  callCount: number; // Anzahl der Aufrufe
  component: string; // Zugehörige Komponente
  metadata?: Record<string, any>; // Zusätzliche Metadaten
  unsubscribe?: () => void; // Funktion zum Abmelden des Listeners
}

// Tracking-Statistiken
interface ListenerStats {
  totalRegistered: number;
  activeCount: number;
  removedCount: number;
  callCount: number;
  staleCount: number;
  leakingCount: number;
  unsubscribeRate: number;
  byType: Record<string, number>;
  byComponent: Record<string, number>;
  lastGcTime: number | null;
  lastGcRemoved: number;
  memoryEstimate: number;
}

/**
 * EventListenerManager überwacht und verwaltet Event-Listener zur Vermeidung von Memory-Leaks
 */
export class EventListenerManager {
  private logger;
  private config: EventListenerManagerConfig;
  private performanceMonitor?: PerformanceMonitor;

  // Listener-Verwaltung
  private listeners: Map<string, ListenerInfo> = new Map();
  private componentGroups: Map<string, Set<string>> = new Map();
  private eventTypeGroups: Map<string, Set<string>> = new Map();

  // GC-Timer
  private gcTimerId: number | null = null;
  private staleCheckTimerId: number | null = null;

  // Statistiken
  private stats: ListenerStats = {
    totalRegistered: 0,
    activeCount: 0,
    removedCount: 0,
    callCount: 0,
    staleCount: 0,
    leakingCount: 0,
    unsubscribeRate: 0,
    byType: {},
    byComponent: {},
    lastGcTime: null,
    lastGcRemoved: 0,
    memoryEstimate: 0,
  };

  /**
   * Konstruktor
   */
  constructor(
    config: Partial<EventListenerManagerConfig> = {},
    performanceMonitor?: PerformanceMonitor,
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.performanceMonitor = performanceMonitor;

    this.logger = createLogger("EventListenerManager");

    // GC-Timer starten, wenn konfiguriert
    if (this.config.enableGarbageCollection) {
      this.startGarbageCollection();
    }

    // Timer für veraltete Listener starten
    if (this.config.enableLeakPrevention) {
      this.startStaleListenerCheck();
    }

    // Event-Listener für Seitenentladung registrieren
    window.addEventListener("beforeunload", this.cleanup.bind(this));

    this.logger.info("EventListenerManager initialisiert", {
      leakPrevention: this.config.enableLeakPrevention,
      gcInterval: this.config.gcInterval,
    });
  }

  /**
   * Event-Listener registrieren und verwalten
   */
  public registerListener(
    eventType: string,
    handler: Function,
    component: string = "unknown",
    source: "vue" | "vanilla" | "system" = "system",
    unsubscribe?: () => void,
    metadata?: Record<string, any>,
  ): string {
    const id = this.generateId();
    const timestamp = Date.now();

    // Listener-Informationen speichern
    const listenerInfo: ListenerInfo = {
      id,
      eventType,
      handler,
      source,
      createdAt: timestamp,
      lastUsed: timestamp,
      callCount: 0,
      component,
      metadata,
      unsubscribe,
    };

    this.listeners.set(id, listenerInfo);

    // Gruppierungen aktualisieren
    this.addToComponentGroup(component, id);
    this.addToEventTypeGroup(eventType, id);

    // Statistiken aktualisieren
    this.stats.totalRegistered++;
    this.stats.activeCount++;
    this.updateTypeStats(eventType, 1);
    this.updateComponentStats(component, 1);

    // Speicherverbrauch aktualisieren
    this.updateMemoryEstimate();

    this.logger.debug(`Listener registriert: ${eventType} (${component})`, {
      id,
    });

    return id;
  }

  /**
   * Event-Listener entfernen
   */
  public removeListener(id: string): boolean {
    if (!this.listeners.has(id)) {
      return false;
    }

    const listener = this.listeners.get(id)!;

    try {
      // Unsubscribe-Funktion aufrufen, wenn vorhanden
      if (typeof listener.unsubscribe === "function") {
        listener.unsubscribe();
      }

      // Aus Gruppierungen entfernen
      this.removeFromComponentGroup(listener.component, id);
      this.removeFromEventTypeGroup(listener.eventType, id);

      // Aus Map entfernen
      this.listeners.delete(id);

      // Statistiken aktualisieren
      this.stats.activeCount--;
      this.stats.removedCount++;
      this.updateTypeStats(listener.eventType, -1);
      this.updateComponentStats(listener.component, -1);

      // Abmelderate aktualisieren
      if (this.config.trackUnsubscribeRate) {
        this.stats.unsubscribeRate =
          this.stats.removedCount / this.stats.totalRegistered;
      }

      // Speicherverbrauch aktualisieren
      this.updateMemoryEstimate();

      this.logger.debug(
        `Listener entfernt: ${listener.eventType} (${listener.component})`,
        { id },
      );

      return true;
    } catch (error) {
      this.logger.error(`Fehler beim Entfernen des Listeners ${id}`, error);
      return false;
    }
  }

  /**
   * Event-Handler-Aufruf registrieren
   */
  public trackHandlerCall(id: string): void {
    if (!this.listeners.has(id)) {
      return;
    }

    const listener = this.listeners.get(id)!;

    // Verwendungsinformationen aktualisieren
    listener.lastUsed = Date.now();
    listener.callCount++;

    // Statistiken aktualisieren
    this.stats.callCount++;

    // Metriken aufzeichnen
    if (this.performanceMonitor && this.config.enableMetrics) {
      this.performanceMonitor.recordMetric(
        "eventListenerManager.handlerCalls",
        this.stats.callCount,
        "count",
        "bridge",
        "events",
      );
    }
  }

  /**
   * Alle Listener für eine Komponente entfernen
   */
  public removeComponentListeners(component: string): number {
    if (!this.componentGroups.has(component)) {
      return 0;
    }

    const listenerIds = Array.from(this.componentGroups.get(component) || []);
    let removedCount = 0;

    for (const id of listenerIds) {
      if (this.removeListener(id)) {
        removedCount++;
      }
    }

    this.logger.info(
      `${removedCount} Listener für Komponente ${component} entfernt`,
    );

    return removedCount;
  }

  /**
   * Alle Listener für einen Event-Typ entfernen
   */
  public removeEventTypeListeners(eventType: string): number {
    if (!this.eventTypeGroups.has(eventType)) {
      return 0;
    }

    const listenerIds = Array.from(this.eventTypeGroups.get(eventType) || []);
    let removedCount = 0;

    for (const id of listenerIds) {
      if (this.removeListener(id)) {
        removedCount++;
      }
    }

    this.logger.info(
      `${removedCount} Listener für Event-Typ ${eventType} entfernt`,
    );

    return removedCount;
  }

  /**
   * Listener zu Komponenten-Gruppe hinzufügen
   */
  private addToComponentGroup(component: string, id: string): void {
    if (!this.componentGroups.has(component)) {
      this.componentGroups.set(component, new Set());
    }

    this.componentGroups.get(component)!.add(id);
  }

  /**
   * Listener aus Komponenten-Gruppe entfernen
   */
  private removeFromComponentGroup(component: string, id: string): void {
    if (!this.componentGroups.has(component)) {
      return;
    }

    this.componentGroups.get(component)!.delete(id);

    // Leere Gruppen entfernen
    if (this.componentGroups.get(component)!.size === 0) {
      this.componentGroups.delete(component);
    }
  }

  /**
   * Listener zu Event-Typ-Gruppe hinzufügen
   */
  private addToEventTypeGroup(eventType: string, id: string): void {
    if (!this.eventTypeGroups.has(eventType)) {
      this.eventTypeGroups.set(eventType, new Set());
    }

    this.eventTypeGroups.get(eventType)!.add(id);
  }

  /**
   * Listener aus Event-Typ-Gruppe entfernen
   */
  private removeFromEventTypeGroup(eventType: string, id: string): void {
    if (!this.eventTypeGroups.has(eventType)) {
      return;
    }

    this.eventTypeGroups.get(eventType)!.delete(id);

    // Leere Gruppen entfernen
    if (this.eventTypeGroups.get(eventType)!.size === 0) {
      this.eventTypeGroups.delete(eventType);
    }
  }

  /**
   * Statistiken für Event-Typ aktualisieren
   */
  private updateTypeStats(eventType: string, delta: number): void {
    this.stats.byType[eventType] = (this.stats.byType[eventType] || 0) + delta;

    // Negative Werte vermeiden
    if (this.stats.byType[eventType] <= 0) {
      delete this.stats.byType[eventType];
    }
  }

  /**
   * Statistiken für Komponente aktualisieren
   */
  private updateComponentStats(component: string, delta: number): void {
    this.stats.byComponent[component] =
      (this.stats.byComponent[component] || 0) + delta;

    // Negative Werte vermeiden
    if (this.stats.byComponent[component] <= 0) {
      delete this.stats.byComponent[component];
    }
  }

  /**
   * Garbage Collection starten
   */
  private startGarbageCollection(): void {
    if (this.gcTimerId !== null) {
      window.clearInterval(this.gcTimerId);
    }

    this.gcTimerId = window.setInterval(() => {
      this.runGarbageCollection();
    }, this.config.gcInterval);

    this.logger.debug("Garbage Collection gestartet", {
      interval: this.config.gcInterval,
    });
  }

  /**
   * Garbage Collection ausführen
   */
  private runGarbageCollection(): void {
    const startTime = performance.now();
    const removedCount = 0;

    try {
      this.logger.debug("Führe Garbage Collection aus");

      // Leere Komponenten-Gruppen entfernen
      for (const [component, listeners] of this.componentGroups.entries()) {
        if (listeners.size === 0) {
          this.componentGroups.delete(component);
        }
      }

      // Leere Event-Typ-Gruppen entfernen
      for (const [eventType, listeners] of this.eventTypeGroups.entries()) {
        if (listeners.size === 0) {
          this.eventTypeGroups.delete(eventType);
        }
      }

      // Speicher defragmentieren
      if (window.gc) {
        try {
          (window as any).gc();
        } catch (error) {
          // Ignorieren, wenn gc nicht verfügbar ist
        }
      }

      // Statistiken aktualisieren
      this.stats.lastGcTime = Date.now();
      this.stats.lastGcRemoved = removedCount;

      const endTime = performance.now();

      // Metriken aufzeichnen
      if (this.performanceMonitor && this.config.enableMetrics) {
        this.performanceMonitor.recordMetric(
          "eventListenerManager.gcDuration",
          endTime - startTime,
          "ms",
          "bridge",
          "memory",
        );

        this.performanceMonitor.recordMetric(
          "eventListenerManager.gcRemoved",
          removedCount,
          "count",
          "bridge",
          "memory",
        );
      }

      this.logger.debug("Garbage Collection abgeschlossen", {
        duration: endTime - startTime,
        removedCount,
      });
    } catch (error) {
      this.logger.error("Fehler bei der Garbage Collection", error);
    }
  }

  /**
   * Überprüfung veralteter Listener starten
   */
  private startStaleListenerCheck(): void {
    if (this.staleCheckTimerId !== null) {
      window.clearInterval(this.staleCheckTimerId);
    }

    this.staleCheckTimerId = window.setInterval(() => {
      this.checkStaleListeners();
    }, this.config.checkStaleListenersMs);

    this.logger.debug("Überprüfung veralteter Listener gestartet", {
      interval: this.config.checkStaleListenersMs,
    });
  }

  /**
   * Veraltete Listener überprüfen
   */
  private checkStaleListeners(): void {
    const now = Date.now();
    let staleCount = 0;
    let leakingSuspects = 0;

    try {
      for (const [id, listener] of this.listeners.entries()) {
        const age = now - listener.createdAt;
        const lastUsedAge = now - listener.lastUsed;

        // Listener als veraltet markieren, wenn er lange nicht verwendet wurde
        if (lastUsedAge > this.config.maxStaleListenerAge) {
          staleCount++;

          // Möglichen Memory-Leak protokollieren
          if (
            listener.callCount === 0 &&
            age > this.config.maxStaleListenerAge * 2
          ) {
            leakingSuspects++;

            this.logger.warn(
              `Möglicher Memory-Leak erkannt: ${listener.eventType} (${listener.component})`,
              {
                id,
                age: Math.round(age / 1000) + "s",
                created: new Date(listener.createdAt).toISOString(),
              },
            );

            // Automatisch entfernen, wenn konfiguriert
            if (this.config.forceUnsubscribeOnCleanup) {
              this.removeListener(id);
            }
          }
        }
      }

      // Statistiken aktualisieren
      this.stats.staleCount = staleCount;
      this.stats.leakingCount = leakingSuspects;

      // Metriken aufzeichnen
      if (this.performanceMonitor && this.config.enableMetrics) {
        this.performanceMonitor.recordMetric(
          "eventListenerManager.staleListeners",
          staleCount,
          "count",
          "bridge",
          "memory",
        );

        this.performanceMonitor.recordMetric(
          "eventListenerManager.leakingSuspects",
          leakingSuspects,
          "count",
          "bridge",
          "memory",
        );
      }

      if (leakingSuspects > 0) {
        this.logger.warn(`${leakingSuspects} verdächtige Memory-Leaks erkannt`);
      }
    } catch (error) {
      this.logger.error(
        "Fehler bei der Überprüfung veralteter Listener",
        error,
      );
    }
  }

  /**
   * Speicherverbrauch abschätzen
   */
  private updateMemoryEstimate(): void {
    // Grobe Schätzung: ~1 KB pro Listener
    this.stats.memoryEstimate = this.listeners.size * 1024;

    // Metriken aufzeichnen
    if (this.performanceMonitor && this.config.enableMetrics) {
      this.performanceMonitor.recordMetric(
        "eventListenerManager.memoryEstimate",
        this.stats.memoryEstimate,
        "bytes",
        "bridge",
        "memory",
      );
    }
  }

  /**
   * Statistiken abrufen
   */
  public getStats(): ListenerStats {
    return { ...this.stats };
  }

  /**
   * Detaillierte Listener-Informationen abrufen
   */
  public getListenerDetails(): Record<string, Omit<ListenerInfo, "handler">> {
    const details: Record<string, Omit<ListenerInfo, "handler">> = {};

    for (const [id, listener] of this.listeners.entries()) {
      // Handler-Funktion ausschließen, um Abhängigkeitszyklen zu vermeiden
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { handler, ...rest } = listener;
      details[id] = rest;
    }

    return details;
  }

  /**
   * Eindeutige ID generieren
   */
  private generateId(): string {
    return `el_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Ressourcen aufräumen
   */
  public cleanup(): void {
    this.logger.info("EventListenerManager wird aufgeräumt");

    // Timer stoppen
    if (this.gcTimerId !== null) {
      window.clearInterval(this.gcTimerId);
      this.gcTimerId = null;
    }

    if (this.staleCheckTimerId !== null) {
      window.clearInterval(this.staleCheckTimerId);
      this.staleCheckTimerId = null;
    }

    // Window-Event-Listener entfernen
    window.removeEventListener("beforeunload", this.cleanup.bind(this));

    // Alle Listener entfernen, wenn konfiguriert
    if (this.config.forceUnsubscribeOnCleanup) {
      const listenerIds = Array.from(this.listeners.keys());
      let removedCount = 0;

      for (const id of listenerIds) {
        if (this.removeListener(id)) {
          removedCount++;
        }
      }

      this.logger.info(`${removedCount} Listener beim Aufräumen entfernt`);
    }

    // Maps leeren
    this.listeners.clear();
    this.componentGroups.clear();
    this.eventTypeGroups.clear();

    // Statistiken zurücksetzen
    this.stats.activeCount = 0;
    this.updateMemoryEstimate();
  }

  /**
   * Instanz freigeben
   */
  public dispose(): void {
    this.cleanup();
    this.performanceMonitor = undefined;

    this.logger.info("EventListenerManager freigegeben");
  }
}

/**
 * Factory-Funktion für EventListenerManager
 */
export function createEventListenerManager(
  config: Partial<EventListenerManagerConfig> = {},
  performanceMonitor?: PerformanceMonitor,
): EventListenerManager {
  return new EventListenerManager(config, performanceMonitor);
}

export default {
  createEventListenerManager,
};
