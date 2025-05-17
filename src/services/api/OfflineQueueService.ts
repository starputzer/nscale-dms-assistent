/**
 * OfflineQueueService
 *
 * Dedizierter Service zur Verwaltung von Offline-Operationen und ausstehenden API-Aufrufen
 * - Robuste Warteschlange für ausstehende Nachrichten
 * - Automatische Wiederholungsversuche mit exponentieller Backoff-Strategie
 * - Priorisierung wichtiger Anfragen
 * - Konfliktbehebung bei konkurrierenden Updates
 * - Persistenz von Operationen über Browser-Neustarts hinweg
 */

import { v4 as uuidv4 } from "uuid";
import type { ChatMessage } from "@/types/session";
import { useAuthStore } from "@/stores/auth";

// Typen für die Offline-Warteschlange
export enum OperationType {
  SEND_MESSAGE = "SEND_MESSAGE",
  UPDATE_SESSION = "UPDATE_SESSION",
  DELETE_MESSAGE = "DELETE_MESSAGE",
  CREATE_SESSION = "CREATE_SESSION",
  ARCHIVE_SESSION = "ARCHIVE_SESSION",
  PIN_SESSION = "PIN_SESSION",
}

export enum OperationPriority {
  HIGH = 1, // Sofort versuchen, wenn online
  MEDIUM = 2, // Standard-Priorität
  LOW = 3, // Kann warten, wenn andere Operationen ausstehen
}

export enum OperationStatus {
  PENDING = "PENDING", // Noch nicht versucht
  RETRYING = "RETRYING", // Versucht, aber fehlgeschlagen und wird wiederholt
  COMPLETED = "COMPLETED", // Erfolgreich ausgeführt
  FAILED = "FAILED", // Endgültig fehlgeschlagen
  CONFLICT = "CONFLICT", // Konflikt mit anderen Operationen
}

export interface QueuedOperation {
  id: string; // Eindeutige ID für die Operation
  type: OperationType; // Art der Operation
  data: any; // Daten für die Operation
  sessionId: string; // Zugehörige Session-ID
  timestamp: string; // Erstellungszeitpunkt
  status: OperationStatus; // Status der Operation
  priority: OperationPriority; // Priorität für die Verarbeitung
  retryCount: number; // Anzahl der Wiederholungsversuche
  lastRetry?: string; // Zeitpunkt des letzten Versuchs
  error?: string; // Fehlermeldung, falls vorhanden
  dependsOn?: string[]; // IDs von Operationen, die zuerst abgeschlossen sein müssen
}

export class OfflineQueueService {
  private queue: QueuedOperation[] = [];
  private isProcessing: boolean = false;
  private isOnline: boolean = navigator.onLine;
  private storageKey: string = "nscale_offline_queue_v3";
  private maxRetries: number = 5;
  private maxQueueSize: number = 100;
  private processingTimeout: number | null = null;

  // Event-Handler
  private handlers: Map<string, Set<Function>> = new Map();

  // Singleton-Instanz
  private static instance: OfflineQueueService;

  /**
   * Singleton-Getter
   */
  public static getInstance(): OfflineQueueService {
    if (!OfflineQueueService.instance) {
      OfflineQueueService.instance = new OfflineQueueService();
    }
    return OfflineQueueService.instance;
  }

  /**
   * Konstruktor
   */
  private constructor() {
    this.loadQueueFromStorage();
    this.setupEventListeners();
  }

  /**
   * Einrichten der Event-Listener für Online/Offline-Status
   */
  private setupEventListeners(): void {
    // Online-Status überwachen
    window.addEventListener("online", this.handleOnline);
    window.addEventListener("offline", this.handleOffline);

    // Vor dem Schließen der Seite die Warteschlange speichern
    window.addEventListener("beforeunload", this.saveQueueToStorage);
  }

  /**
   * Event-Handler für Online-Status
   */
  private handleOnline = (): void => {
    this.isOnline = true;
    this.emit("online");

    // Warteschlange verarbeiten, wenn wir wieder online sind
    this.processQueue();
  };

  /**
   * Event-Handler für Offline-Status
   */
  private handleOffline = (): void => {
    this.isOnline = false;
    this.emit("offline");

    // Verarbeitung stoppen, wenn wir offline gehen
    if (this.processingTimeout !== null) {
      clearTimeout(this.processingTimeout);
      this.processingTimeout = null;
    }

    this.isProcessing = false;
  };

  /**
   * Laden der Warteschlange aus dem localStorage
   */
  private loadQueueFromStorage(): void {
    try {
      const queueJson = localStorage.getItem(this.storageKey);

      if (queueJson) {
        this.queue = JSON.parse(queueJson);

        // Bereinige veraltete oder ungültige Einträge
        this.queue = this.queue.filter((op) => {
          // Entferne abgeschlossene Operationen
          if (op.status === OperationStatus.COMPLETED) {
            return false;
          }

          // Setze Operationen zurück, die sich im Retrying-Zustand befinden
          if (op.status === OperationStatus.RETRYING) {
            op.status = OperationStatus.PENDING;
          }

          // Entferne Operationen, die zu viele Wiederholungsversuche hatten
          if (op.retryCount >= this.maxRetries) {
            return false;
          }

          return true;
        });

        this.emit("loaded", { count: this.queue.length });
      }
    } catch (error) {
      console.error("Error loading offline queue:", error);
      this.queue = [];
    }
  }

  /**
   * Speichern der Warteschlange im localStorage
   */
  private saveQueueToStorage = (): void => {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.queue));
    } catch (error) {
      console.error("Error saving offline queue:", error);
    }
  };

  /**
   * Fügt der Warteschlange eine neue Operation hinzu
   */
  public addToQueue(
    type: OperationType,
    data: any,
    sessionId: string,
    priority: OperationPriority = OperationPriority.MEDIUM,
    dependsOn: string[] = [],
  ): string {
    // Generiere eine eindeutige ID für die Operation
    const id = uuidv4();

    // Erstelle den Operationseintrag
    const operation: QueuedOperation = {
      id,
      type,
      data,
      sessionId,
      timestamp: new Date().toISOString(),
      status: OperationStatus.PENDING,
      priority,
      retryCount: 0,
      dependsOn,
    };

    // Halte die Warteschlange unter dem Größenlimit
    this.enforceQueueSizeLimit();

    // Füge die Operation zur Warteschlange hinzu
    this.queue.push(operation);

    // Sortiere die Warteschlange nach Priorität und Zeitstempel
    this.sortQueue();

    // Speichere die aktualisierte Warteschlange
    this.saveQueueToStorage();

    // Event auslösen
    this.emit("added", { operation });

    // Versuche, die Warteschlange zu verarbeiten, falls wir online sind
    if (this.isOnline && !this.isProcessing) {
      this.processQueue();
    }

    return id;
  }

  /**
   * Sortiert die Warteschlange nach Priorität, Abhängigkeiten und Zeitstempel
   */
  private sortQueue(): void {
    this.queue.sort((a, b) => {
      // Zuerst nach Status (Pending vor Retrying)
      if (a.status !== b.status) {
        if (a.status === OperationStatus.PENDING) return -1;
        if (b.status === OperationStatus.PENDING) return 1;
      }

      // Dann nach Priorität (niedrigere Zahl = höhere Priorität)
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }

      // Dann nach Abhängigkeiten (Operationen ohne Abhängigkeiten zuerst)
      const aHasDeps = a.dependsOn && a.dependsOn.length > 0 ? 1 : 0;
      const bHasDeps = b.dependsOn && b.dependsOn.length > 0 ? 1 : 0;

      if (aHasDeps !== bHasDeps) {
        return aHasDeps - bHasDeps;
      }

      // Dann nach Zeitstempel (ältere zuerst)
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });
  }

  /**
   * Verarbeitet die Warteschlange und führt ausstehende Operationen aus
   */
  public async processQueue(): Promise<void> {
    // Nichts tun, wenn wir offline sind
    if (!this.isOnline) {
      return;
    }

    // Verhindere parallele Verarbeitung
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    this.emit("processing-start");

    try {
      // Verarbeite ausstehende Operationen nacheinander
      while (this.isOnline && this.hasProcessableOperations()) {
        const operation = this.getNextProcessableOperation();

        if (!operation) {
          break;
        }

        try {
          // Status auf "Retrying" setzen
          operation.status = OperationStatus.RETRYING;
          operation.lastRetry = new Date().toISOString();
          operation.retryCount++;

          this.saveQueueToStorage();
          this.emit("operation-start", { operation });

          // Operation ausführen
          await this.executeOperation(operation);

          // Operation als abgeschlossen markieren
          operation.status = OperationStatus.COMPLETED;
          this.emit("operation-completed", { operation });

          // Entferne die abgeschlossene Operation aus der Warteschlange
          this.queue = this.queue.filter((op) => op.id !== operation.id);
        } catch (error: any) {
          console.error(`Error executing operation ${operation.id}:`, error);

          // Fehler in der Operation vermerken
          operation.error = error.message || "Unknown error";

          // Prüfen, ob es Konflikte mit anderen Operationen gibt
          if (this.isConflictError(error)) {
            operation.status = OperationStatus.CONFLICT;
            this.emit("operation-conflict", { operation, error });
          }
          // Prüfen, ob die maximale Anzahl an Wiederholungsversuchen erreicht ist
          else if (operation.retryCount >= this.maxRetries) {
            operation.status = OperationStatus.FAILED;
            this.emit("operation-failed", { operation, error });
          }
          // Zurück auf "Pending" setzen für den nächsten Versuch
          else {
            operation.status = OperationStatus.PENDING;
            this.emit("operation-retry", {
              operation,
              error,
              retryCount: operation.retryCount,
            });
          }
        }

        // Zwischenspeichern
        this.saveQueueToStorage();
      }
    } finally {
      this.isProcessing = false;
      this.emit("processing-end", { remainingCount: this.getPendingCount() });

      // Wenn es noch ausstehende Operationen gibt, planen wir eine erneute Verarbeitung
      if (this.isOnline && this.getPendingCount() > 0) {
        // Exponentieller Backoff für Wiederholungsversuche
        const nextRetryDelay = this.calculateNextRetryDelay();

        this.processingTimeout = window.setTimeout(() => {
          this.processQueue();
        }, nextRetryDelay);
      }
    }
  }

  /**
   * Prüft, ob es sich um einen Konfliktfehler handelt
   */
  private isConflictError(error: any): boolean {
    // Prüfe auf typische Konfliktfehler (HTTP 409 oder spezifische Fehlermeldungen)
    return (
      error.status === 409 ||
      error.message?.includes("conflict") ||
      error.message?.includes("Konflikt") ||
      error.message?.includes("bereits existiert") ||
      error.message?.includes("veraltet") ||
      error.message?.includes("überschrieben")
    );
  }

  /**
   * Berechnet das Delay für den nächsten Wiederholungsversuch
   */
  private calculateNextRetryDelay(): number {
    // Finde die Operation mit der höchsten Anzahl an Wiederholungen
    const maxRetries = Math.max(
      0,
      ...this.queue
        .filter((op) => op.status === OperationStatus.PENDING)
        .map((op) => op.retryCount),
    );

    // Exponentieller Backoff mit Jitter
    // Base: 1000ms, max: 30000ms (30 Sekunden)
    const baseDelay = 1000;
    const maxDelay = 30000;
    const exponentialDelay = Math.min(
      maxDelay,
      baseDelay * Math.pow(1.5, maxRetries),
    );

    // Füge Jitter hinzu (±20%)
    const jitter = exponentialDelay * 0.2 * (Math.random() - 0.5);

    return Math.max(1000, Math.floor(exponentialDelay + jitter));
  }

  /**
   * Führt eine Operation basierend auf ihrem Typ aus
   */
  private async executeOperation(operation: QueuedOperation): Promise<void> {
    // AuthStore für Token und Headers
    const authStore = useAuthStore();
    const headers = authStore.isAuthenticated
      ? authStore.createAuthHeaders()
      : { "Content-Type": "application/json" };

    switch (operation.type) {
      case OperationType.SEND_MESSAGE:
        // Sende eine Nachricht
        await fetch(`/api/sessions/${operation.sessionId}/messages`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            content: operation.data.content,
            role: operation.data.role || "user",
          }),
        }).then((response) => {
          if (!response.ok) {
            throw new Error(
              `Failed to send message: ${response.status} ${response.statusText}`,
            );
          }
          return response.json();
        });
        break;

      case OperationType.UPDATE_SESSION:
        // Session aktualisieren (z.B. Titel ändern)
        await fetch(`/api/sessions/${operation.sessionId}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify(operation.data),
        }).then((response) => {
          if (!response.ok) {
            throw new Error(
              `Failed to update session: ${response.status} ${response.statusText}`,
            );
          }
          return response.json();
        });
        break;

      case OperationType.DELETE_MESSAGE:
        // Nachricht löschen
        await fetch(
          `/api/sessions/${operation.sessionId}/messages/${operation.data.messageId}`,
          {
            method: "DELETE",
            headers,
          },
        ).then((response) => {
          if (!response.ok) {
            throw new Error(
              `Failed to delete message: ${response.status} ${response.statusText}`,
            );
          }
          return response.json();
        });
        break;

      case OperationType.CREATE_SESSION:
        // Neue Session erstellen
        await fetch("/api/sessions", {
          method: "POST",
          headers,
          body: JSON.stringify({
            id: operation.sessionId,
            title: operation.data.title,
            createdAt: operation.data.createdAt,
            updatedAt: operation.data.updatedAt,
          }),
        }).then((response) => {
          if (!response.ok) {
            throw new Error(
              `Failed to create session: ${response.status} ${response.statusText}`,
            );
          }
          return response.json();
        });
        break;

      case OperationType.ARCHIVE_SESSION:
        // Session löschen/archivieren
        await fetch(`/api/sessions/${operation.sessionId}`, {
          method: "DELETE",
          headers,
        }).then((response) => {
          if (!response.ok) {
            throw new Error(
              `Failed to archive session: ${response.status} ${response.statusText}`,
            );
          }
          return response.json();
        });
        break;

      case OperationType.PIN_SESSION:
        // Session anpinnen/entpinnen
        await fetch(`/api/sessions/${operation.sessionId}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({
            isPinned: operation.data.isPinned,
          }),
        }).then((response) => {
          if (!response.ok) {
            throw new Error(
              `Failed to pin/unpin session: ${response.status} ${response.statusText}`,
            );
          }
          return response.json();
        });
        break;

      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }

  /**
   * Prüft, ob es ausstehende Operationen gibt
   */
  private hasProcessableOperations(): boolean {
    return this.queue.some(
      (op) =>
        (op.status === OperationStatus.PENDING ||
          op.status === OperationStatus.RETRYING) &&
        this.areAllDependenciesFulfilled(op),
    );
  }

  /**
   * Prüft, ob alle Abhängigkeiten einer Operation erfüllt sind
   */
  private areAllDependenciesFulfilled(operation: QueuedOperation): boolean {
    // Wenn keine Abhängigkeiten definiert sind, ist die Bedingung erfüllt
    if (!operation.dependsOn || operation.dependsOn.length === 0) {
      return true;
    }

    // Prüfe jede Abhängigkeit
    return operation.dependsOn.every((depId) => {
      // Suche die abhängige Operation
      const depOp = this.queue.find((op) => op.id === depId);

      // Wenn sie nicht gefunden wurde, gehen wir davon aus, dass sie bereits abgeschlossen ist
      if (!depOp) {
        return true;
      }

      // Sie muss abgeschlossen sein, um die Abhängigkeit zu erfüllen
      return depOp.status === OperationStatus.COMPLETED;
    });
  }

  /**
   * Gibt die nächste zu verarbeitende Operation zurück
   */
  private getNextProcessableOperation(): QueuedOperation | undefined {
    return this.queue.find(
      (op) =>
        (op.status === OperationStatus.PENDING ||
          op.status === OperationStatus.RETRYING) &&
        this.areAllDependenciesFulfilled(op),
    );
  }

  /**
   * Stellt sicher, dass die Warteschlange nicht zu groß wird
   */
  private enforceQueueSizeLimit(): void {
    if (this.queue.length >= this.maxQueueSize) {
      // Sortiere nach Status und Zeitstempel, um die am wenigsten relevanten zu finden
      const sortedForRemoval = [...this.queue].sort((a, b) => {
        // Abgeschlossene und fehlgeschlagene zuerst entfernen
        if (a.status !== b.status) {
          if (a.status === OperationStatus.COMPLETED) return -1;
          if (b.status === OperationStatus.COMPLETED) return 1;
          if (a.status === OperationStatus.FAILED) return -1;
          if (b.status === OperationStatus.FAILED) return 1;
        }

        // Dann nach Alter (ältere zuerst)
        return (
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      });

      // Entferne ältere Operationen, bis wir 90% des Limits erreicht haben
      const targetSize = Math.floor(this.maxQueueSize * 0.9);
      this.queue = sortedForRemoval.slice(this.queue.length - targetSize);

      this.emit("queue-pruned", { newSize: this.queue.length });
    }
  }

  /**
   * Gibt die Anzahl der ausstehenden Operationen zurück
   */
  public getPendingCount(): number {
    return this.queue.filter(
      (op) =>
        op.status === OperationStatus.PENDING ||
        op.status === OperationStatus.RETRYING,
    ).length;
  }

  /**
   * Gibt alle Operationen für eine bestimmte Session zurück
   */
  public getOperationsForSession(sessionId: string): QueuedOperation[] {
    return this.queue.filter((op) => op.sessionId === sessionId);
  }

  /**
   * Gibt alle ausstehenden Nachrichten für eine Session zurück
   */
  public getPendingMessagesForSession(
    sessionId: string,
  ): { id: string; content: string; timestamp: string }[] {
    return this.queue
      .filter(
        (op) =>
          op.sessionId === sessionId &&
          op.type === OperationType.SEND_MESSAGE &&
          (op.status === OperationStatus.PENDING ||
            op.status === OperationStatus.RETRYING),
      )
      .map((op) => ({
        id: op.id,
        content: op.data.content,
        timestamp: op.timestamp,
      }));
  }

  /**
   * Fügt einen Event-Listener hinzu
   */
  public on(event: string, callback: Function): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }

    this.handlers.get(event)!.add(callback);

    // Gibt eine Funktion zurück, mit der der Listener entfernt werden kann
    return () => {
      this.off(event, callback);
    };
  }

  /**
   * Entfernt einen Event-Listener
   */
  public off(event: string, callback: Function): void {
    if (this.handlers.has(event)) {
      this.handlers.get(event)!.delete(callback);

      if (this.handlers.get(event)!.size === 0) {
        this.handlers.delete(event);
      }
    }
  }

  /**
   * Löst ein Event aus
   */
  private emit(event: string, data?: any): void {
    if (this.handlers.has(event)) {
      this.handlers.get(event)!.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(
            `Error in offline queue event handler for ${event}:`,
            error,
          );
        }
      });
    }
  }

  /**
   * Bereinigt fehlerhafte oder veraltete Einträge in der Warteschlange
   */
  public cleanupQueue(): number {
    const initialLength = this.queue.length;

    // Entferne Operationen, die zu alt sind (älter als 7 Tage)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    this.queue = this.queue.filter((op) => {
      // Behalte alle nicht abgeschlossenen und neueren Operationen
      if (
        op.status !== OperationStatus.COMPLETED &&
        op.status !== OperationStatus.FAILED
      ) {
        return true;
      }

      // Entferne alte abgeschlossene/fehlgeschlagene Operationen
      const timestamp = new Date(op.timestamp);
      return timestamp >= sevenDaysAgo;
    });

    // Anzahl der entfernten Operationen
    const removedCount = initialLength - this.queue.length;

    if (removedCount > 0) {
      this.saveQueueToStorage();
      this.emit("cleanup", { removedCount });
    }

    return removedCount;
  }

  /**
   * Löscht alle Operationen für eine bestimmte Session
   */
  public clearSessionOperations(sessionId: string): number {
    const initialLength = this.queue.length;

    this.queue = this.queue.filter((op) => op.sessionId !== sessionId);

    const removedCount = initialLength - this.queue.length;

    if (removedCount > 0) {
      this.saveQueueToStorage();
      this.emit("session-cleared", { sessionId, removedCount });
    }

    return removedCount;
  }

  /**
   * Gibt den aktuellen Online-Status zurück
   */
  public isNetworkOnline(): boolean {
    return this.isOnline;
  }

  /**
   * Gibt die gesamte Warteschlange zurück
   */
  public getQueue(): QueuedOperation[] {
    return [...this.queue];
  }

  /**
   * Verarbeitet die Warteschlange manuell, falls vorhanden
   */
  public manualProcessQueue(): void {
    if (this.isOnline && !this.isProcessing && this.queue.length > 0) {
      this.processQueue();
    }
  }
}

// Singleton-Instanz exportieren
export const offlineQueueService = OfflineQueueService.getInstance();

export default offlineQueueService;
