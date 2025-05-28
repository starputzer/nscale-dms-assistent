/**
 * MigrationDiagnostics.ts
 *
 * Bietet Tools zur Überwachung und Diagnose des Migrationsprozesses.
 * Implementiert Logging, Diagnose-Dashboard und automatische Erkennung
 * von Migrations-Problemen.
 */

import { reactive, readonly } from "vue";
import { logger } from "../bridge/enhanced/logger";
import {
  MigrationStatus,
  ApplicationMigrationReport,
  StateMigrationReport,
} from "./types";

/**
 * Verwaltet die Diagnose und Überwachung des Migrationsprozesses
 */
export class MigrationDiagnostics {
  // Aktueller Stand der Migration
  private migrationState = reactive({
    status: MigrationStatus.NOT_STARTED,
    startTime: null as Date | null,
    completionTime: null as Date | null,
    progress: 0,
    completedSteps: 0,
    totalSteps: 0,

    // Migrations-Berichte nach Komponenten
    reports: new Map<string, StateMigrationReport>(),

    // Statistiken
    statistics: {
      totalComponents: 0,
      migratedComponents: 0,
      failedComponents: 0,
      partiallyMigratedComponents: 0,

      totalErrors: 0,
      totalWarnings: 0,

      // Leistungsmetriken
      averageMigrationTime: 0,
      totalMigrationTime: 0,

      // Legacy-Code-Nutzung
      legacyCodeUsage: new Map<string, number>(),
    },

    // Aufgetretene Fehler
    errors: [] as {
      component: string;
      message: string;
      timestamp: Date;
      stackTrace?: string;
    }[],

    // Aufgetretene Warnungen
    warnings: [] as { component: string; message: string; timestamp: Date }[],

    // Letzte Aktualisierung
    lastUpdate: new Date(),
  });

  // Logging-Konfiguration
  private logConfig = {
    logLevel: "info" as "debug" | "info" | "warn" | "error",
    logToConsole: true,
    logToFile: false,
    logFilePath: "/var/log/migration.log",
    includeTimestamp: true,
    includeStackTrace: true,
  };

  // Diagnose-Dashboard-Konfiguration
  private dashboardConfig = {
    enabled: false,
    autoRefresh: true,
    refreshInterval: 5000,
    showDetailedReports: true,
    showErrorDetails: true,
    showPerformanceMetrics: true,
  };

  /**
   * Initialisiert die Migrations-Diagnose
   */
  public initialize(): void {
    logger.info("MigrationDiagnostics initialized");

    // Migration-Status auf "gestartet" setzen
    this.startMigration();
  }

  /**
   * Startet die Migrations-Überwachung
   */
  public startMigration(): void {
    this.migrationState.status = MigrationStatus.IN_PROGRESS;
    this.migrationState.startTime = new Date();
    this.migrationState.lastUpdate = new Date();

    logger.info("Migration process started");
  }

  /**
   * Registriert eine Komponente für die Migration
   * @param componentId ID der Komponente
   * @param componentName Name der Komponente
   * @param totalSteps Anzahl der Migrationsschritte
   */
  public registerComponent(
    componentId: string,
    componentName: string,
    totalSteps: number,
  ): void {
    const now = new Date();

    // Migrations-Bericht erstellen
    const report: StateMigrationReport = {
      stateKey: componentId,
      status: MigrationStatus.NOT_STARTED,
      fromVersion: { major: 2, minor: 0, patch: 0 },
      toVersion: { major: 3, minor: 0, patch: 0 },
      startedAt: now,
      migratedParts: [],
      pendingParts: Array.from(
        { length: totalSteps },
        (_, i) => `step-${i + 1}`,
      ),
    };

    // Bericht speichern
    this.migrationState.reports.set(componentId, report);

    // Gesamtschrittzahl aktualisieren
    this.migrationState.totalSteps += totalSteps;

    // Statistiken aktualisieren
    this.migrationState.statistics.totalComponents++;

    logger.debug(
      `Component ${componentName} (${componentId}) registered for migration with ${totalSteps} steps`,
    );
  }

  /**
   * Meldet den Fortschritt einer Komponenten-Migration
   * @param componentId ID der Komponente
   * @param completedStep Der abgeschlossene Schritt
   * @param successful Ob der Schritt erfolgreich war
   * @param details Zusätzliche Details (optional)
   */
  public reportProgress(
    componentId: string,
    completedStep: string,
    successful: boolean,
    details?: any,
  ): void {
    if (!this.migrationState.reports.has(componentId)) {
      logger.warn(
        `Unknown component ${componentId} reported migration progress`,
      );
      return;
    }

    const report = this.migrationState.reports.get(componentId)!;
    const now = new Date();

    // Status aktualisieren
    if (report.status === MigrationStatus.NOT_STARTED) {
      report.status = MigrationStatus.IN_PROGRESS;
    }

    // Listen der migrierten und ausstehenden Teile aktualisieren
    const pendingIndex = report.pendingParts
      ? report.pendingParts.indexOf(completedStep)
      : -1;

    if (pendingIndex >= 0 && report.pendingParts) {
      // Schritt aus pendingParts entfernen
      report.pendingParts.splice(pendingIndex, 1);

      // Schritt zu migratedParts hinzufügen, falls erfolgreich
      if (successful) {
        if (!report.migratedParts) {
          report.migratedParts = [];
        }
        report.migratedParts.push(completedStep);
      } else {
        // Fehler protokollieren
        if (!report.errors) {
          report.errors = [];
        }
        report.errors.push(
          `Error in step ${completedStep}: ${details?.message || "Unknown error"}`,
        );

        // Globalen Fehler hinzufügen
        this.migrationState.errors.push({
          component: componentId,
          message: `Error in step ${completedStep}: ${details?.message || "Unknown error"}`,
          timestamp: now,
          stackTrace: details?.stackTrace,
        });

        this.migrationState.statistics.totalErrors++;
      }
    }

    // Aktualisieren des Gesamt-Status
    if (report.pendingParts && report.pendingParts.length === 0) {
      // Alle Schritte abgeschlossen
      const hasFailed = report.errors && report.errors.length > 0;

      if (hasFailed) {
        if (report.migratedParts && report.migratedParts.length > 0) {
          report.status = MigrationStatus.PARTIALLY_COMPLETED;
          this.migrationState.statistics.partiallyMigratedComponents++;
        } else {
          report.status = MigrationStatus.FAILED;
          this.migrationState.statistics.failedComponents++;
        }
      } else {
        report.status = MigrationStatus.COMPLETED;
        report.completedAt = now;
        this.migrationState.statistics.migratedComponents++;
      }
    }

    // Gesamtfortschritt aktualisieren
    this.migrationState.completedSteps++;
    this.migrationState.progress =
      this.migrationState.totalSteps > 0
        ? (this.migrationState.completedSteps /
            this.migrationState.totalSteps) *
          100
        : 0;

    // Zeitstatistiken aktualisieren
    if (
      report.startedAt &&
      (report.status === MigrationStatus.COMPLETED ||
        report.status === MigrationStatus.PARTIALLY_COMPLETED)
    ) {
      const migrationTime = now.getTime() - report.startedAt.getTime();

      this.migrationState.statistics.totalMigrationTime += migrationTime;
      this.migrationState.statistics.averageMigrationTime =
        this.migrationState.statistics.totalMigrationTime /
        (this.migrationState.statistics.migratedComponents +
          this.migrationState.statistics.partiallyMigratedComponents);
    }

    // Migrations-Status prüfen
    this.checkMigrationStatus();

    // Letzte Aktualisierung setzen
    this.migrationState.lastUpdate = now;

    logger.debug(
      `Component ${componentId} reported progress: step ${completedStep} ${successful ? "succeeded" : "failed"}`,
    );
  }

  /**
   * Meldet die Nutzung von Legacy-Code
   * @param source Die Quelle des Legacy-Codes
   * @param count Anzahl der Aufrufe (Standard: 1)
   */
  public reportLegacyCodeUsage(source: string, count: number = 1): void {
    const currentCount =
      this.migrationState.statistics.legacyCodeUsage.get(source) || 0;
    this.migrationState.statistics.legacyCodeUsage.set(
      source,
      currentCount + count,
    );

    logger.debug(`Legacy code usage reported: ${source} (${count} calls)`);
  }

  /**
   * Registriert eine Warnung im Migrationsprozess
   * @param componentId ID der betroffenen Komponente
   * @param message Die Warnmeldung
   */
  public reportWarning(componentId: string, message: string): void {
    const now = new Date();

    // Warnung zum Report hinzufügen
    if (this.migrationState.reports.has(componentId)) {
      const report = this.migrationState.reports.get(componentId)!;

      if (!report.warnings) {
        report.warnings = [];
      }

      report.warnings.push(message);
    }

    // Globale Warnung hinzufügen
    this.migrationState.warnings.push({
      component: componentId,
      message,
      timestamp: now,
    });

    this.migrationState.statistics.totalWarnings++;

    // Ereignis loggen
    logger.warn(`Migration warning for ${componentId}: ${message}`);
  }

  /**
   * Erstellt einen formatieren Migrations-Report für die Anzeige im Dashboard
   */
  public generateReport(): ApplicationMigrationReport {
    const now = new Date();

    // Berichte in Record-Format konvertieren
    const stateReports: Record<string, StateMigrationReport> = {};
    for (const [componentId, report] of this.migrationState.reports.entries()) {
      stateReports[componentId] = { ...report };
    }

    // Gesamtstatus ermitteln
    const failedComponents = this.migrationState.statistics.failedComponents;
    const partiallyMigratedComponents =
      this.migrationState.statistics.partiallyMigratedComponents;
    const migratedComponents =
      this.migrationState.statistics.migratedComponents;
    const totalComponents = this.migrationState.statistics.totalComponents;

    let overallStatus = this.migrationState.status;

    // Wenn alle Komponenten migriert wurden, ist die Migration abgeschlossen
    if (
      migratedComponents + failedComponents + partiallyMigratedComponents ===
        totalComponents &&
      totalComponents > 0
    ) {
      if (failedComponents === 0 && partiallyMigratedComponents === 0) {
        overallStatus = MigrationStatus.COMPLETED;
      } else if (migratedComponents === 0) {
        overallStatus = MigrationStatus.FAILED;
      } else {
        overallStatus = MigrationStatus.PARTIALLY_COMPLETED;
      }
    }

    // Wenn die Migration abgeschlossen ist, Endzeitpunkt setzen
    if (
      overallStatus === MigrationStatus.COMPLETED &&
      !this.migrationState.completionTime
    ) {
      this.migrationState.completionTime = now;
      this.migrationState.status = MigrationStatus.COMPLETED;
    }

    // Kritische Probleme identifizieren
    const criticalIssues: string[] = [];

    if (failedComponents > 0) {
      criticalIssues.push(`${failedComponents} component(s) failed to migrate`);
    }

    if (partiallyMigratedComponents > 0) {
      criticalIssues.push(
        `${partiallyMigratedComponents} component(s) partially migrated`,
      );
    }

    if (this.migrationState.errors.length > 0) {
      // Die 5 neuesten Fehler hinzufügen
      const recentErrors = [...this.migrationState.errors]
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 5);

      for (const error of recentErrors) {
        criticalIssues.push(`${error.component}: ${error.message}`);
      }
    }

    // Empfehlungen generieren
    const recommendedActions: string[] = [];

    if (failedComponents > 0) {
      recommendedActions.push(
        "Review error logs for failed components and fix issues",
      );
    }

    if (partiallyMigratedComponents > 0) {
      recommendedActions.push(
        "Complete migration for partially migrated components",
      );
    }

    if (this.migrationState.statistics.legacyCodeUsage.size > 0) {
      const topLegacyUsage = [
        ...this.migrationState.statistics.legacyCodeUsage.entries(),
      ]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

      if (topLegacyUsage.length > 0) {
        recommendedActions.push(
          `Reduce dependency on legacy code, especially: ${topLegacyUsage.map(([source]) => source).join(", ")}`,
        );
      }
    }

    // Bericht erstellen
    return {
      overallStatus,
      completionPercentage: this.migrationState.progress,
      stateReports,
      startedAt: this.migrationState.startTime || now,
      completedAt: this.migrationState.completionTime,
      criticalIssues: criticalIssues.length > 0 ? criticalIssues : undefined,
      warnings:
        this.migrationState.warnings.length > 0
          ? this.migrationState.warnings.map(
              (w) => `${w.component}: ${w.message}`,
            )
          : undefined,
      recommendedActions:
        recommendedActions.length > 0 ? recommendedActions : undefined,
    };
  }

  /**
   * Erstellt ein Warn-Log für veraltete API-Nutzung
   * @param apiName Name der veralteten API
   * @param context Kontext der Nutzung
   * @param alternatives Alternative APIs
   */
  public logDeprecatedApiUsage(
    apiName: string,
    context: string,
    alternatives?: string[],
  ): void {
    // Warnung erstellen
    let message = `Deprecated API '${apiName}' used in ${context}`;

    if (alternatives && alternatives.length > 0) {
      message += `. Consider using: ${alternatives.join(", ")}`;
    }

    // Globale Warnung für diese API-Nutzung
    this.reportWarning(context, `Deprecated API: ${apiName}`);

    // Legacy-Code-Nutzung erfassen
    this.reportLegacyCodeUsage(apiName);

    // Ereignis loggen
    logger.warn(message);
  }

  /**
   * Erstellt ein Fehler-Log für einen Migrationsfehler
   * @param componentId ID der Komponente
   * @param step Der fehlerhafte Schritt
   * @param error Der aufgetretene Fehler
   */
  public logMigrationError(
    componentId: string,
    step: string,
    error: any,
  ): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const stackTrace = error instanceof Error ? error.stack : undefined;

    // Fehler zum Report hinzufügen
    this.reportProgress(componentId, step, false, {
      message: errorMessage,
      stackTrace,
    });

    // Ereignis loggen
    logger.error(
      `Migration error in ${componentId} (step ${step}): ${errorMessage}`,
      error,
    );
  }

  /**
   * Identifiziert Legacy-Code-Nutzung
   * @returns Top-Legacy-Code-Nutzungen
   */
  public identifyLegacyCodeUsage(): { source: string; count: number }[] {
    // Legacy-Code-Nutzungen sortieren
    return [...this.migrationState.statistics.legacyCodeUsage.entries()]
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Prüft den Migrations-Status und aktualisiert ihn bei Bedarf
   */
  private checkMigrationStatus(): void {
    const failedComponents = this.migrationState.statistics.failedComponents;
    const partiallyMigratedComponents =
      this.migrationState.statistics.partiallyMigratedComponents;
    const migratedComponents =
      this.migrationState.statistics.migratedComponents;
    const totalComponents = this.migrationState.statistics.totalComponents;

    // Wenn alle Komponenten migriert wurden, ist die Migration abgeschlossen
    if (
      migratedComponents + failedComponents + partiallyMigratedComponents ===
        totalComponents &&
      totalComponents > 0
    ) {
      if (failedComponents === 0 && partiallyMigratedComponents === 0) {
        this.migrationState.status = MigrationStatus.COMPLETED;
        if (!this.migrationState.completionTime) {
          this.migrationState.completionTime = new Date();
        }

        logger.info("Migration process completed successfully");
      } else if (migratedComponents === 0) {
        this.migrationState.status = MigrationStatus.FAILED;

        logger.error("Migration process failed");
      } else {
        this.migrationState.status = MigrationStatus.PARTIALLY_COMPLETED;

        logger.warn("Migration process partially completed");
      }
    }
  }

  /**
   * Aktualisiert die Migrationsstatus-Statistik
   */
  public updateStatistics(): void {
    // Komponenten nach Status zählen
    let completed = 0;
    let failed = 0;
    let partial = 0;

    for (const report of this.migrationState.reports.values()) {
      switch (report.status) {
        case MigrationStatus.COMPLETED:
          completed++;
          break;
        case MigrationStatus.FAILED:
          failed++;
          break;
        case MigrationStatus.PARTIALLY_COMPLETED:
          partial++;
          break;
      }
    }

    // Statistiken aktualisieren
    this.migrationState.statistics.migratedComponents = completed;
    this.migrationState.statistics.failedComponents = failed;
    this.migrationState.statistics.partiallyMigratedComponents = partial;

    // Migrations-Status prüfen
    this.checkMigrationStatus();
  }

  /**
   * Exportiert die Migration-Diagnose-Daten für externe Verwendung
   */
  public getExportedData(): any {
    return readonly({
      status: this.migrationState.status,
      progress: this.migrationState.progress,
      statistics: { ...this.migrationState.statistics },
      startTime: this.migrationState.startTime,
      completionTime: this.migrationState.completionTime,
      lastUpdate: this.migrationState.lastUpdate,
    });
  }

  /**
   * Gibt die aktuelle Logging-Konfiguration zurück
   */
  public getLogConfig(): any {
    return { ...this.logConfig };
  }

  /**
   * Setzt die Logging-Konfiguration
   * @param config Die neue Logging-Konfiguration
   */
  public setLogConfig(config: Partial<typeof this.logConfig>): void {
    this.logConfig = { ...this.logConfig, ...config };

    // Logger-Konfiguration aktualisieren
    if (config.logLevel) {
      switch (config.logLevel) {
        case "debug":
          logger.setLevel("debug");
          break;
        case "info":
          logger.setLevel("info");
          break;
        case "warn":
          logger.setLevel("warn");
          break;
        case "error":
          logger.setLevel("error");
          break;
      }
    }
  }

  /**
   * Aktiviert oder deaktiviert das Diagnose-Dashboard
   * @param enabled Ob das Dashboard aktiviert sein soll
   */
  public enableDashboard(enabled: boolean): void {
    this.dashboardConfig.enabled = enabled;
  }

  /**
   * Gibt die Dashboard-Konfiguration zurück
   */
  public getDashboardConfig(): any {
    return { ...this.dashboardConfig };
  }

  /**
   * Setzt die Dashboard-Konfiguration
   * @param config Die neue Dashboard-Konfiguration
   */
  public setDashboardConfig(
    config: Partial<typeof this.dashboardConfig>,
  ): void {
    this.dashboardConfig = { ...this.dashboardConfig, ...config };
  }
}

/**
 * Singleton-Instanz der MigrationDiagnostics
 */
export const migrationDiagnostics = new MigrationDiagnostics();

export default migrationDiagnostics;
