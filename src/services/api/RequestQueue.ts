/**
 * RequestQueue - Verwaltung von parallelen API-Anfragen
 *
 * Diese Klasse implementiert einen Warteschlangenmechanismus für API-Anfragen,
 * um die Anzahl gleichzeitiger Anfragen zu begrenzen und Prioritäten zu unterstützen.
 */

import { apiConfig } from "./config";
import { LogService } from "../log/LogService";

/**
 * Konfigurationsoptionen für RequestQueue
 */
export interface RequestQueueOptions {
  /** Maximale Anzahl gleichzeitiger Anfragen */
  maxConcurrent?: number;

  /** Maximale Größe der Warteschlange */
  maxQueueSize?: number;

  /** Timeout für Anfragen in der Warteschlange (ms) */
  queueTimeout?: number;

  /** Aktiviert/deaktiviert die Warteschlange */
  enabled?: boolean;
}

/**
 * Warteschlangen-Element
 */
interface QueueItem<T = any> {
  /** Priorität der Anfrage (höhere Werte = höhere Priorität) */
  priority: number;

  /** Zu ausführende Funktion */
  fn: () => Promise<T>;

  /** Resolve-Funktion für das Promise */
  resolve: (value: T | PromiseLike<T>) => void;

  /** Reject-Funktion für das Promise */
  reject: (reason?: any) => void;

  /** Zeitpunkt des Hinzufügens zur Warteschlange */
  queuedAt: number;

  /** Timeout-ID (falls konfiguriert) */
  timeoutId?: number;
}

/**
 * RequestQueue - Klasse zur Verwaltung von API-Anfragen
 */
export class RequestQueue {
  /** Aktive Anfragen */
  private activeRequests: number = 0;

  /** Warteschlange für Anfragen */
  private queue: QueueItem[] = [];

  /** Logger-Instanz */
  private logService: LogService;

  /** Maximale Anzahl gleichzeitiger Anfragen */
  private maxConcurrent: number;

  /** Maximale Größe der Warteschlange */
  private maxQueueSize: number;

  /** Timeout für Anfragen in der Warteschlange (ms) */
  private queueTimeout: number;

  /** Gibt an, ob die Warteschlange aktiviert ist */
  private _isEnabled: boolean;

  /**
   * Konstruktor
   */
  constructor(options: RequestQueueOptions = {}) {
    this.maxConcurrent =
      options.maxConcurrent ?? apiConfig.QUEUE.MAX_CONCURRENT_REQUESTS;
    this.maxQueueSize = options.maxQueueSize ?? apiConfig.QUEUE.MAX_QUEUE_SIZE;
    this.queueTimeout = options.queueTimeout ?? 30000; // 30 Sekunden
    this._isEnabled = options.enabled ?? true;
    this.logService = new LogService("RequestQueue");
  }

  /**
   * Gibt an, ob die Warteschlange aktiviert ist
   */
  get isEnabled(): boolean {
    return this._isEnabled;
  }

  /**
   * Aktiviert/deaktiviert die Warteschlange
   */
  set isEnabled(value: boolean) {
    this._isEnabled = value;
  }

  /**
   * Gibt die aktuelle Warteschlangengröße zurück
   */
  get queueSize(): number {
    return this.queue.length;
  }

  /**
   * Gibt die Anzahl aktiver Anfragen zurück
   */
  get activeRequestCount(): number {
    return this.activeRequests;
  }

  /**
   * Fügt eine Funktion zur Warteschlange hinzu
   */
  public async enqueue<T>(
    fn: () => Promise<T>,
    priority: number = 0,
  ): Promise<T> {
    // Wenn die Warteschlange deaktiviert ist, direkt ausführen
    if (!this._isEnabled) {
      return fn();
    }

    // Wenn unter dem Limit, direkt ausführen
    if (this.activeRequests < this.maxConcurrent && this.queue.length === 0) {
      this.activeRequests++;

      try {
        return await fn();
      } finally {
        this.activeRequests--;
        this.processQueue();
      }
    }

    // Prüfen, ob die Warteschlange voll ist
    if (this.queue.length >= this.maxQueueSize) {
      this.logService.warn(
        `Warteschlange ist voll (${this.queue.length}), verwerfe älteste Anfrage mit niedriger Priorität`,
      );

      // Älteste Anfrage mit niedrigster Priorität finden und verwerfen
      const lowestPriorityIndex = this.findLowestPriorityIndex();
      if (
        lowestPriorityIndex >= 0 &&
        this.queue[lowestPriorityIndex].priority < priority
      ) {
        const removedItem = this.queue.splice(lowestPriorityIndex, 1)[0];
        removedItem.reject(
          new Error(
            "Anfrage wurde aus der Warteschlange entfernt, da eine höherpriorisierte Anfrage einging",
          ),
        );
      } else {
        throw new Error(
          "Die Warteschlange ist voll und die Anfrage hat nicht ausreichend Priorität",
        );
      }
    }

    // In die Warteschlange einfügen
    return new Promise<T>((resolve, reject) => {
      const queueItem: QueueItem<T> = {
        priority,
        fn,
        resolve,
        reject,
        queuedAt: Date.now(),
      };

      // Timeout einrichten, falls konfiguriert
      if (this.queueTimeout > 0) {
        const timeoutId = window.setTimeout(() => {
          // Entferne das Element aus der Warteschlange
          const index = this.queue.indexOf(queueItem);
          if (index !== -1) {
            this.queue.splice(index, 1);
          }

          reject(
            new Error(
              `Die Anfrage wurde nach ${this.queueTimeout}ms Wartezeit in der Warteschlange abgebrochen`,
            ),
          );
        }, this.queueTimeout);

        queueItem.timeoutId = timeoutId;
      }

      // Einfügen und nach Priorität sortieren
      this.queue.push(queueItem);
      this.sortQueue();

      this.logService.debug(
        `Anfrage mit Priorität ${priority} zur Warteschlange hinzugefügt. Aktuelle Größe: ${this.queue.length}`,
      );

      // Queue verarbeiten (für den Fall, dass zwischenzeitlich Kapazität frei geworden ist)
      this.processQueue();
    });
  }

  /**
   * Sortiert die Warteschlange nach Priorität und Einfügezeit
   */
  private sortQueue(): void {
    this.queue.sort((a, b) => {
      // Zuerst nach Priorität (höher = wichtiger)
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }

      // Bei gleicher Priorität nach Einfügezeit (früher = wichtiger)
      return a.queuedAt - b.queuedAt;
    });
  }

  /**
   * Findet den Index des Elements mit der niedrigsten Priorität
   */
  private findLowestPriorityIndex(): number {
    if (this.queue.length === 0) return -1;

    let lowestPriority = this.queue[0].priority;
    let lowestIndex = 0;

    for (let i = 1; i < this.queue.length; i++) {
      if (this.queue[i].priority < lowestPriority) {
        lowestPriority = this.queue[i].priority;
        lowestIndex = i;
      }
    }

    return lowestIndex;
  }

  /**
   * Verarbeitet die Warteschlange und führt Anfragen aus, wenn Kapazität verfügbar ist
   */
  private processQueue(): void {
    // Keine Aktionen, wenn deaktiviert
    if (!this._isEnabled) return;

    // Verarbeite Elemente, solange Kapazität verfügbar ist
    while (this.activeRequests < this.maxConcurrent && this.queue.length > 0) {
      // Nehme das nächste Element aus der Warteschlange
      const item = this.queue.shift();
      if (!item) break;

      // Timeout abbrechen
      if (item.timeoutId) {
        clearTimeout(item.timeoutId);
      }

      // Inkrementiere aktive Anfragen
      this.activeRequests++;

      // Führe die Funktion aus
      item
        .fn()
        .then((result) => {
          item.resolve(result);
        })
        .catch((error) => {
          item.reject(error);
        })
        .finally(() => {
          // Dekrementiere aktive Anfragen
          this.activeRequests--;

          // Weitere Elemente verarbeiten
          this.processQueue();
        });
    }
  }

  /**
   * Leert die Warteschlange und bricht alle wartenden Anfragen ab
   */
  public clear(): void {
    const error = new Error(
      "Die Warteschlange wurde geleert und alle Anfragen abgebrochen",
    );

    // Alle Timeouts löschen und Promises ablehnen
    this.queue.forEach((item: any) => {
      if (item.timeoutId) {
        clearTimeout(item.timeoutId);
      }
      item.reject(error);
    });

    this.queue = [];
    this.logService.info("Warteschlange geleert");
  }

  /**
   * Pausiert die Warteschlange (keine neuen Anfragen werden verarbeitet)
   */
  public pause(): void {
    this._isEnabled = false;
    this.logService.info("Warteschlange pausiert");
  }

  /**
   * Setzt die Verarbeitung der Warteschlange fort
   */
  public resume(): void {
    this._isEnabled = true;
    this.logService.info("Warteschlange fortgesetzt");
    this.processQueue();
  }
}

export default RequestQueue;
