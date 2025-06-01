/**
 * OfflineManager - Verwaltung von Offline-Funktionalität und Synchronisierung
 *
 * Diese Klasse bietet eine zentrale Stelle für die Verwaltung von Offline-Funktionalität,
 * einschließlich Statusverfolgung, Synchronisierung und Benachrichtigung der Benutzeroberfläche.
 */

import { defaultIndexedDBService } from "../storage/IndexedDBService";
import { LogService } from "../log/LogService";
import { EventCallback, UnsubscribeFn } from "@/types/events";

/**
 * Synchronisations-Anfrage-Status
 */
export type SyncRequestStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

/**
 * Synchronisations-Anfrage
 */
export interface SyncRequest {
  /** Eindeutige ID */
  id: string | number;

  /** Anfrage-URL */
  url: string;

  /** HTTP-Methode */
  method: string;

  /** Anfragedaten (bei POST, PUT, PATCH) */
  data?: any;

  /** Zeitstempel der Erstellung */
  timestamp: number;

  /** Aktueller Status */
  status: SyncRequestStatus;

  /** Priorität */
  priority?: number;

  /** Fehlerinformationen */
  error?: string;

  /** Anzahl Wiederholungsversuche */
  retryCount?: number;

  /** Nächster Wiederholungszeitpunkt */
  nextRetryAt?: number;

  /** Anfrage-Metadaten */
  metadata?: Record<string, any>;
}

/**
 * Offline-Manager Klasse
 */
export class OfflineManager {
  /** Logger für Diagnose */
  private logger: LogService;

  /** Aktueller Offline-Status */
  private isOffline: boolean = false;

  /** Synchronisierung aktiv? */
  private isSynchronizing: boolean = false;

  /** Event-Handler für Offline-Ereignisse */
  private eventHandlers: Map<string, Set<Function>> = new Map();

  /** Offline-Indikator-Element */
  private offlineIndicator: HTMLElement | null = null;

  /** Synchronisationsintervall-ID */
  private syncIntervalId: number | null = null;

  /** Synchronisationsintervall in Millisekunden */
  private syncInterval: number = 60000; // 1 Minute

  /**
   * Konstruktor
   */
  constructor() {
    this.logger = new LogService("OfflineManager");

    // Offline-Status überwachen
    if (typeof window !== "undefined") {
      window.addEventListener("online", this.handleOnlineEvent);
      window.addEventListener("offline", this.handleOfflineEvent);
      this.isOffline = !navigator.onLine;

      // IndexedDB initialisieren
      this.initializeOfflineStorage();

      // Offline-Indikator erstellen
      this.createOfflineIndicator();
    }
  }

  /**
   * Initialisiert den Offline-Speicher
   */
  private async initializeOfflineStorage(): Promise<void> {
    try {
      await defaultIndexedDBService.init();
      this.logger.info("Offline-Speicher initialisiert");
    } catch (error) {
      this.logger.error(
        "Fehler bei der Initialisierung des Offline-Speichers",
        error,
      );
    }
  }

  /**
   * Erstellt einen Offline-Indikator in der UI
   */
  private createOfflineIndicator(): void {
    // Element nur einmal erstellen
    if (this.offlineIndicator) return;

    // Element erstellen
    this.offlineIndicator = document.createElement("div");
    this.offlineIndicator.className = "offline-indicator";
    this.offlineIndicator.textContent = "Offline-Modus";

    // Styles hinzufügen
    const styles = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background-color: #ff9800;
      color: white;
      padding: 8px 16px;
      border-radius: 4px;
      font-weight: bold;
      z-index: 9999;
      display: none;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
    `;

    this.offlineIndicator.style.cssText = styles;

    // Zum Dokument hinzufügen
    document.body.appendChild(this.offlineIndicator);

    // Initiale Anzeige
    this.updateOfflineIndicator();
  }

  /**
   * Aktualisiert die Anzeige des Offline-Indikators
   */
  private updateOfflineIndicator(): void {
    if (!this.offlineIndicator) return;

    if (this.isOffline) {
      this.offlineIndicator.style.display = "block";
    } else {
      this.offlineIndicator.style.display = "none";
    }
  }

  /**
   * Handler für Online-Events
   */
  private handleOnlineEvent = (): void => {
    this.isOffline = false;
    this.logger.info("Online-Modus aktiviert");

    // Offline-Indikator aktualisieren
    this.updateOfflineIndicator();

    // Event auslösen
    this.emitEvent("online");

    // Datensynchronisierung starten
    this.startSynchronization();
  };

  /**
   * Handler für Offline-Events
   */
  private handleOfflineEvent = (): void => {
    this.isOffline = true;
    this.logger.info("Offline-Modus aktiviert");

    // Offline-Indikator aktualisieren
    this.updateOfflineIndicator();

    // Event auslösen
    this.emitEvent("offline");

    // Synchronisierung anhalten
    this.stopSynchronization();
  };

  /**
   * Gibt den aktuellen Offline-Status zurück
   */
  public isOfflineMode(): boolean {
    return this.isOffline;
  }

  /**
   * Startet die regelmäßige Synchronisierung
   */
  public startSynchronization(): void {
    // Wenn bereits synchronisiert wird oder Offline-Modus aktiv, nicht starten
    if (this.syncIntervalId !== null || this.isOffline) {
      return;
    }

    // Sofortige Synchronisierung
    this.synchronizeData();

    // Intervall für regelmäßige Synchronisierung
    this.syncIntervalId = window.setInterval(() => {
      this.synchronizeData();
    }, this.syncInterval);

    this.logger.info(
      `Datensynchronisierung alle ${this.syncInterval / 1000} Sekunden gestartet`,
    );
  }

  /**
   * Stoppt die regelmäßige Synchronisierung
   */
  public stopSynchronization(): void {
    if (this.syncIntervalId !== null) {
      window.clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
      this.logger.info("Datensynchronisierung gestoppt");
    }
  }

  /**
   * Synchronisiert Daten zwischen lokalem Speicher und Server
   */
  public async synchronizeData(): Promise<void> {
    // Wenn bereits eine Synchronisierung läuft, abbrechen
    if (this.isSynchronizing || this.isOffline) {
      return;
    }

    this.isSynchronizing = true;

    try {
      // Event auslösen
      this.emitEvent("syncStart");

      // Ausstehende Synchronisationsanfragen laden
      const requests = await this.getPendingSyncRequests();

      if (requests.length === 0) {
        this.logger.debug("Keine ausstehenden Synchronisationsanfragen");
        return;
      }

      this.logger.info(
        `Synchronisiere ${requests.length} ausstehende Anfragen`,
      );

      // Anzahl erfolgreicher und fehlgeschlagener Anfragen
      let successCount = 0;
      let failCount = 0;

      // Anfragen der Reihe nach verarbeiten
      for (const request of requests) {
        try {
          // Als "in Bearbeitung" markieren
          await this.updateSyncRequestStatus(request.id, "processing");

          // Anfrage ausführen
          // In einer realen Implementierung würde hier der ApiService verwendet
          // const response = await apiService[request.method.toLowerCase()](request.url, request.data);

          // Mock für Test: 90% Erfolgsrate
          const success = Math.random() > 0.1;

          if (success) {
            // Als "abgeschlossen" markieren
            await this.updateSyncRequestStatus(request.id, "completed");
            successCount++;
          } else {
            // Als "fehlgeschlagen" markieren
            await this.updateSyncRequestStatus(
              request.id,
              "failed",
              "Simulierter Fehler",
            );
            failCount++;
          }
        } catch (error) {
          // Fehlerbehandlung
          this.logger.error(
            `Fehler bei der Synchronisierung von Anfrage ${request.id}`,
            error,
          );
          await this.updateSyncRequestStatus(
            request.id,
            "failed",
            error instanceof Error ? error.message : "Unbekannter Fehler",
          );

          failCount++;
        }
      }

      // Abgeschlossene Anfragen bereinigen
      await this.cleanupCompletedRequests();

      // Event auslösen
      this.emitEvent("syncComplete", {
        successCount,
        failCount,
        totalCount: requests.length,
      });

      this.logger.info(
        `Synchronisierung abgeschlossen: ${successCount} erfolgreich, ${failCount} fehlgeschlagen`,
      );
    } catch (error) {
      this.logger.error("Fehler bei der Datensynchronisierung", error);

      // Event auslösen
      this.emitEvent("syncError", { error });
    } finally {
      this.isSynchronizing = false;
    }
  }

  /**
   * Fügt eine neue Synchronisationsanfrage hinzu
   */
  public async addSyncRequest(
    request: Omit<SyncRequest, "id" | "status" | "timestamp">,
  ): Promise<number | string> {
    const syncRequest: SyncRequest = {
      ...request,
      id: Date.now(), // Einfache ID-Generierung
      status: "pending",
      timestamp: Date.now(),
    };

    try {
      const id = await defaultIndexedDBService.add(
        "offlineRequests",
        syncRequest,
      );
      this.logger.debug(
        `Neue Synchronisationsanfrage ${id} hinzugefügt`,
        request,
      );

      // Event auslösen
      this.emitEvent("requestAdded", { request: syncRequest });

      return id;
    } catch (error) {
      this.logger.error(
        "Fehler beim Hinzufügen der Synchronisationsanfrage",
        error,
      );
      throw error;
    }
  }

  /**
   * Lädt alle ausstehenden Synchronisationsanfragen
   */
  private async getPendingSyncRequests(): Promise<SyncRequest[]> {
    try {
      return await defaultIndexedDBService.query<SyncRequest>(
        "offlineRequests",
        {
          index: "status",
          equalTo: "pending",
          direction: "next", // Aufsteigend nach Zeitstempel
        },
      );
    } catch (error) {
      this.logger.error(
        "Fehler beim Laden ausstehender Synchronisationsanfragen",
        error,
      );
      return [];
    }
  }

  /**
   * Aktualisiert den Status einer Synchronisationsanfrage
   */
  private async updateSyncRequestStatus(
    id: string | number,
    status: SyncRequestStatus,
    error?: string,
  ): Promise<void> {
    try {
      // Aktuelle Anfrage laden
      const request = await defaultIndexedDBService.get<SyncRequest>(
        "offlineRequests",
        id,
      );

      if (!request) {
        throw new Error(`Synchronisationsanfrage ${id} nicht gefunden`);
      }

      // Status aktualisieren
      const updatedRequest: SyncRequest = {
        ...request,
        status,
        error: error || request.error,
      };

      // Speichern
      await defaultIndexedDBService.put("offlineRequests", updatedRequest);

      // Event auslösen
      this.emitEvent("requestUpdated", { request: updatedRequest });
    } catch (error) {
      this.logger.error(
        `Fehler beim Aktualisieren des Status für Anfrage ${id}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Entfernt abgeschlossene Synchronisationsanfragen
   */
  private async cleanupCompletedRequests(): Promise<void> {
    try {
      // Alle abgeschlossenen Anfragen laden
      const completedRequests =
        await defaultIndexedDBService.query<SyncRequest>("offlineRequests", {
          index: "status",
          equalTo: "completed",
        });

      if (completedRequests.length === 0) {
        return;
      }

      // IDs extrahieren


      // Bulk-Löschung
      await defaultIndexedDBService.deleteBulk("offlineRequests", _ids);

      this.logger.debug(
        `${completedRequests.length} abgeschlossene Anfragen entfernt`,
      );
    } catch (error) {
      this.logger.error(
        "Fehler beim Entfernen abgeschlossener Anfragen",
        error,
      );
    }
  }

  /**
   * Löscht eine bestimmte Synchronisationsanfrage
   */
  public async deleteSyncRequest(id: string | number): Promise<void> {
    try {
      await defaultIndexedDBService.delete("offlineRequests", id);
      this.logger.debug(`Synchronisationsanfrage ${id} gelöscht`);

      // Event auslösen
      this.emitEvent("requestDeleted", { id });
    } catch (error) {
      this.logger.error(
        `Fehler beim Löschen der Synchronisationsanfrage ${id}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Registriert einen Event-Handler
   */
  public on(event: string, handler: EventCallback | UnsubscribeFn): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }

    this.eventHandlers.get(event)?.add(handler);
  }

  /**
   * Entfernt einen Event-Handler
   */
  public off(event: string, handler: EventCallback | UnsubscribeFn): void {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event)?.delete(handler);
    }
  }

  /**
   * Löst ein Event aus
   */
  private emitEvent(event: string, data?: any): void {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event)?.forEach((handler: any) => {
        try {
          handler(data);
        } catch (error) {
          this.logger.error(`Fehler im Event-Handler für '${event}'`, error);
        }
      });
    }
  }

  /**
   * Bereinigt Ressourcen
   */
  public destroy(): void {
    // Synchronisierung stoppen
    this.stopSynchronization();

    // Event-Listener entfernen
    if (typeof window !== "undefined") {
      window.removeEventListener("online", this.handleOnlineEvent);
      window.removeEventListener("offline", this.handleOfflineEvent);
    }

    // Offline-Indikator entfernen
    if (
      this.offlineIndicator &&
      document.body.contains(this.offlineIndicator)
    ) {
      document.body.removeChild(this.offlineIndicator);
      this.offlineIndicator = null;
    }

    // Event-Handler löschen
    this.eventHandlers.clear();
  }
}

// Singleton-Instanz erstellen
export const offlineManager = new OfflineManager();

export default offlineManager;
