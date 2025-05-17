/**
 * StatusManager-Komponente für die verbesserte Bridge
 *
 * Diese Datei implementiert den StatusManager, der für die Verwaltung
 * und Überwachung des Bridge-Status verantwortlich ist.
 */

import { BridgeErrorState, BridgeStatusInfo, BridgeLogger } from "./types";

/**
 * Implementation des StatusManager
 */
export class BridgeStatusManager {
  private currentStatus: BridgeStatusInfo = {
    state: BridgeErrorState.HEALTHY,
    message: "Bridge funktioniert normal",
    timestamp: new Date(),
    affectedComponents: [],
    recoveryAttempts: 0,
  };

  private statusListeners: ((status: BridgeStatusInfo) => void)[] = [];
  private logger: BridgeLogger;

  constructor(logger: BridgeLogger) {
    this.logger = logger;
    this.logger.info("StatusManager initialisiert");
  }

  /**
   * Aktualisiert den Bridge-Status
   */
  updateStatus(newStatus: Partial<BridgeStatusInfo>): void {
    const previousState = this.currentStatus.state;

    this.currentStatus = {
      ...this.currentStatus,
      ...newStatus,
      timestamp: new Date(),
    };

    // Logging bei Statusänderungen
    if (previousState !== this.currentStatus.state) {
      if (this.currentStatus.state === BridgeErrorState.HEALTHY) {
        this.logger.info(
          `Bridge-Status: HEALTHY - ${this.currentStatus.message}`,
        );
      } else if (
        this.currentStatus.state === BridgeErrorState.DEGRADED_PERFORMANCE
      ) {
        this.logger.warn(
          `Bridge-Status: DEGRADED - ${this.currentStatus.message}`,
          {
            components: this.currentStatus.affectedComponents,
          },
        );
      } else {
        this.logger.error(
          `Bridge-Status: ${BridgeErrorState[this.currentStatus.state]} - ${this.currentStatus.message}`,
          {
            components: this.currentStatus.affectedComponents,
            attempts: this.currentStatus.recoveryAttempts,
          },
        );
      }
    }

    this.notifyListeners();

    // UI-Benachrichtigung bei kritischen Fehlern
    if (this.currentStatus.state === BridgeErrorState.CRITICAL_FAILURE) {
      this.showUserNotification();
    }
  }

  /**
   * Erhöht den Zähler für Wiederherstellungsversuche
   */
  incrementRecoveryAttempts(): void {
    this.currentStatus.recoveryAttempts++;
    this.updateStatus({});
  }

  /**
   * Gibt den aktuellen Status zurück
   */
  getStatus(): BridgeStatusInfo {
    return { ...this.currentStatus };
  }

  /**
   * Registriert einen Status-Listener
   */
  onStatusChanged(listener: (status: BridgeStatusInfo) => void): () => void {
    this.statusListeners.push(listener);
    return () => {
      this.statusListeners = this.statusListeners.filter((l) => l !== listener);
    };
  }

  /**
   * Benachrichtigt alle Status-Listener
   */
  private notifyListeners(): void {
    this.statusListeners.forEach((listener) => {
      try {
        listener(this.currentStatus);
      } catch (error) {
        this.logger.error("Fehler in Status-Listener", error);
      }
    });
  }

  /**
   * Zeigt eine Benachrichtigung für den Benutzer an
   */
  private showUserNotification(): void {
    // Hier könnte eine benutzerfreundliche Benachrichtigung im UI angezeigt werden
    // Use type assertion to access nscaleUI property
    const nscaleUI = (window as any).nscaleUI;
    if (nscaleUI?.showToast) {
      nscaleUI.showToast(
        `Bridge-Fehler: ${this.currentStatus.message}. Seite neuladen, um das Problem zu beheben.`,
        "error",
        { duration: 0, dismissible: true },
      );
    } else {
      // Fallback, wenn nscaleUI nicht verfügbar ist
      console.error(
        `[Bridge] KRITISCHER FEHLER: ${this.currentStatus.message}`,
      );

      // Einfache Benachrichtigung anzeigen
      if (typeof document !== "undefined") {
        const container = document.createElement("div");
        container.style.position = "fixed";
        container.style.top = "20px";
        container.style.right = "20px";
        container.style.backgroundColor = "#f44336";
        container.style.color = "white";
        container.style.padding = "10px";
        container.style.borderRadius = "4px";
        container.style.boxShadow = "0 2px 10px rgba(0,0,0,0.2)";
        container.style.zIndex = "9999";
        container.innerHTML = `<strong>Bridge-Fehler:</strong> ${this.currentStatus.message}. Seite neuladen, um das Problem zu beheben.`;

        const closeButton = document.createElement("button");
        closeButton.innerHTML = "&times;";
        closeButton.style.marginLeft = "10px";
        closeButton.style.border = "none";
        closeButton.style.background = "transparent";
        closeButton.style.color = "white";
        closeButton.style.fontSize = "16px";
        closeButton.style.cursor = "pointer";
        closeButton.onclick = () => document.body.removeChild(container);

        container.appendChild(closeButton);
        document.body.appendChild(container);
      }
    }
  }
}
