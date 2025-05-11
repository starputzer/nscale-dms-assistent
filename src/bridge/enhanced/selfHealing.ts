/**
 * SelfHealing-Komponente für die verbesserte Bridge
 *
 * Diese Datei implementiert den SelfHealing-Mechanismus, der automatisch
 * Fehler erkennt und versucht, die Bridge wiederherzustellen.
 */

import {
  SelfHealing,
  BridgeLogger,
  BridgeStatusManager,
  BridgeErrorState,
} from "./types";

/**
 * Implementation des SelfHealing-Mechanismus
 */
export class SelfHealingBridge implements SelfHealing {
  private healthChecks: (() => boolean)[] = [];
  private recoveryStrategies: (() => Promise<boolean>)[] = [];
  private isRecovering = false;
  private logger: BridgeLogger;
  private statusManager: BridgeStatusManager;
  private checkIntervalId: number | null = null;
  private healthCheckInterval: number;

  constructor(
    logger: BridgeLogger,
    statusManager: BridgeStatusManager,
    healthCheckInterval: number = 30000,
  ) {
    this.logger = logger;
    this.statusManager = statusManager;
    this.healthCheckInterval = healthCheckInterval;
    this.setupPeriodicHealthCheck();

    this.logger.info("SelfHealing-Mechanismus initialisiert");
  }

  /**
   * Fügt eine Gesundheitsprüfung hinzu
   */
  addHealthCheck(check: () => boolean): void {
    this.healthChecks.push(check);
    this.logger.debug("Gesundheitsprüfung hinzugefügt", {
      total: this.healthChecks.length,
    });
  }

  /**
   * Fügt eine Wiederherstellungsstrategie hinzu
   */
  addRecoveryStrategy(strategy: () => Promise<boolean>): void {
    this.recoveryStrategies.push(strategy);
    this.logger.debug("Wiederherstellungsstrategie hinzugefügt", {
      total: this.recoveryStrategies.length,
    });
  }

  /**
   * Richtet die periodische Gesundheitsprüfung ein
   */
  private setupPeriodicHealthCheck(): void {
    // Bestehenden Interval löschen, falls vorhanden
    if (this.checkIntervalId !== null) {
      clearInterval(this.checkIntervalId);
    }

    // Neuen Interval einrichten
    this.checkIntervalId = window.setInterval(() => {
      this.performHealthCheck().catch((error) => {
        this.logger.error("Fehler bei periodischer Gesundheitsprüfung", error);
      });
    }, this.healthCheckInterval);

    this.logger.info(
      `Periodische Gesundheitsprüfung eingerichtet (Intervall: ${this.healthCheckInterval}ms)`,
    );
  }

  /**
   * Führt eine Gesundheitsprüfung durch
   */
  async performHealthCheck(): Promise<boolean> {
    if (this.isRecovering || this.healthChecks.length === 0) {
      return true;
    }

    try {
      const results = this.healthChecks.map((check, index) => {
        try {
          return {
            index,
            healthy: check(),
            error: null,
          };
        } catch (error) {
          return {
            index,
            healthy: false,
            error,
          };
        }
      });

      const unhealthyChecks = results.filter((result) => !result.healthy);

      if (unhealthyChecks.length > 0) {
        this.logger.warn(
          `Gesundheitsprüfung fehlgeschlagen: ${unhealthyChecks.length} von ${this.healthChecks.length} Prüfungen fehlgeschlagen`,
        );

        // Status auf DEGRADED_PERFORMANCE setzen
        this.statusManager.updateStatus({
          state: BridgeErrorState.DEGRADED_PERFORMANCE,
          message: `${unhealthyChecks.length} Gesundheitsprüfungen fehlgeschlagen`,
          affectedComponents: unhealthyChecks.map(
            (c) => `HealthCheck-${c.index}`,
          ),
        });

        // Wiederherstellung versuchen
        return await this.attemptRecovery();
      } else {
        // Alles ist in Ordnung, Bridge ist gesund
        if (this.statusManager.getStatus().state !== BridgeErrorState.HEALTHY) {
          this.statusManager.updateStatus({
            state: BridgeErrorState.HEALTHY,
            message: "Bridge funktioniert normal",
            affectedComponents: [],
          });
        }

        return true;
      }
    } catch (error) {
      this.logger.error("Unerwarteter Fehler bei Gesundheitsprüfung", error);

      this.statusManager.updateStatus({
        state: BridgeErrorState.DEGRADED_PERFORMANCE,
        message: "Fehler bei der Gesundheitsprüfung",
        affectedComponents: ["HealthCheckSystem"],
      });

      return false;
    }
  }

  /**
   * Versucht, die Bridge wiederherzustellen
   */
  private async attemptRecovery(): Promise<boolean> {
    if (this.isRecovering || this.recoveryStrategies.length === 0) {
      return false;
    }

    this.isRecovering = true;
    this.logger.info("Starte Wiederherstellungsversuch für Bridge");

    // Wiederherstellungsversuche zählen
    this.statusManager.incrementRecoveryAttempts();

    try {
      // Alle Strategien der Reihe nach versuchen
      for (let i = 0; i < this.recoveryStrategies.length; i++) {
        const strategy = this.recoveryStrategies[i];
        this.logger.debug(
          `Versuche Wiederherstellungsstrategie ${i + 1} von ${this.recoveryStrategies.length}`,
        );

        try {
          const success = await strategy();

          if (success) {
            this.logger.info(
              `Bridge-Wiederherstellung erfolgreich mit Strategie ${i + 1}`,
            );
            this.isRecovering = false;

            // Erneute Gesundheitsprüfung durchführen, um den Status zu aktualisieren
            setTimeout(() => this.performHealthCheck(), 1000);

            return true;
          }
        } catch (error) {
          this.logger.error(
            `Fehler in Wiederherstellungsstrategie ${i + 1}`,
            error,
          );
        }
      }

      // Wenn wir hier ankommen, sind alle Strategien fehlgeschlagen
      this.logger.error(
        "Alle Bridge-Wiederherstellungsstrategien sind fehlgeschlagen",
      );

      // Kritischen Status melden
      this.statusManager.updateStatus({
        state: BridgeErrorState.CRITICAL_FAILURE,
        message: "Wiederherstellung nicht möglich. Bitte Seite neu laden.",
      });

      this.isRecovering = false;
      return false;
    } catch (error) {
      this.logger.error(
        "Schwerwiegender Fehler während der Bridge-Wiederherstellung",
        error,
      );

      // Kritischen Status melden
      this.statusManager.updateStatus({
        state: BridgeErrorState.CRITICAL_FAILURE,
        message:
          "Kritischer Fehler bei der Wiederherstellung. Bitte Seite neu laden.",
      });

      this.isRecovering = false;
      return false;
    }
  }

  /**
   * Konfiguriert das Gesundheitsprüfungs-Intervall neu
   */
  setHealthCheckInterval(interval: number): void {
    this.healthCheckInterval = interval;
    this.setupPeriodicHealthCheck();
    this.logger.info(
      `Gesundheitsprüfungs-Intervall auf ${interval}ms aktualisiert`,
    );
  }

  /**
   * Stoppt die periodischen Gesundheitsprüfungen
   */
  stopHealthChecks(): void {
    if (this.checkIntervalId !== null) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
      this.logger.info("Periodische Gesundheitsprüfungen gestoppt");
    }
  }
}
