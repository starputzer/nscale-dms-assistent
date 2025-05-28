/**
 * Migration-System
 *
 * Zentraler Export aller Übergangsmechanismen für die Migration
 * von Legacy-JavaScript zu Vue 3.
 */

// Daten-Migration und -Transformation
import stateMigrator from "./StateMigration";

// Router-Integration
import routerMigrator from "./RouterMigration";

// Plugin-System und Kompatibilitätsadapter
import pluginMigrator from "./PluginMigration";

// Diagnose- und Überwachungs-Tools
import migrationDiagnostics from "./MigrationDiagnostics";

// Typen exportieren
export * from "./types";

// Einzelne Komponenten exportieren
export { stateMigrator, routerMigrator, pluginMigrator, migrationDiagnostics };

// Hauptinitialisierungsfunktion
export async function initializeMigrationSystem(
  vueRouter: any,
  eventBus: any,
  featureToggleSystem: any,
): Promise<void> {
  // Migration-Diagnostik initialisieren
  migrationDiagnostics.initialize();

  // Router-Migrator initialisieren
  routerMigrator.initialize(vueRouter, eventBus);

  // Plugin-Migrator initialisieren
  pluginMigrator.initialize(featureToggleSystem);

  return Promise.resolve();
}

// Standard-Routen registrieren
export function registerStandardRoutes(): void {
  // Admin-Bereich
  routerMigrator.registerRouteConfig({
    legacyPath: "/admin",
    vuePath: "/admin",
    redirectType: "permanent",
  });

  // Admin-Unterseiten
  routerMigrator.registerRouteConfig({
    legacyPath: "/admin/:tab",
    vuePath: "/admin/:tab",
    redirectType: "permanent",
  });

  // Chat-Seite
  routerMigrator.registerRouteConfig({
    legacyPath: "/chat",
    vuePath: "/chat",
    redirectType: "permanent",
  });

  // Chat-Session
  routerMigrator.registerRouteConfig({
    legacyPath: "/chat/:sessionId",
    vuePath: "/chat/:sessionId",
    redirectType: "permanent",
  });

  // Dokumenten-Konverter
  routerMigrator.registerRouteConfig({
    legacyPath: "/convert",
    vuePath: "/documents/convert",
    redirectType: "permanent",
  });

  // Einstellungen
  routerMigrator.registerRouteConfig({
    legacyPath: "/settings",
    vuePath: "/settings",
    redirectType: "permanent",
  });

  // Einstellungs-Kategorien
  routerMigrator.registerRouteConfig({
    legacyPath: "/settings/:category",
    vuePath: "/settings/:category",
    redirectType: "permanent",
  });
}

// Migrationsstatistik generieren
export function generateMigrationStatistics(): Record<string, any> {
  const report = migrationDiagnostics.generateReport();

  return {
    status: report.overallStatus,
    progress: report.completionPercentage,
    completedComponents: Object.values(report.stateReports).filter(
      (r) => r.status === "COMPLETED",
    ).length,
    totalComponents: Object.keys(report.stateReports).length,
    errors: report.criticalIssues?.length || 0,
    warnings: report.warnings?.length || 0,
    startDate: report.startedAt,
    completionDate: report.completedAt,
    lastUpdate: new Date(),
    estimatedTimeRemaining: calculateEstimatedTimeRemaining(report),
  };
}

// Berechnet die geschätzte verbleibende Zeit für die Migration
function calculateEstimatedTimeRemaining(report: any): string {
  if (report.completionPercentage >= 100) {
    return "Abgeschlossen";
  }

  // Exportierte Daten vom Diagnostics-Tool holen
  const diagnosticsData = migrationDiagnostics.getExportedData();

  if (!diagnosticsData.startTime || diagnosticsData.progress === 0) {
    return "Unbekannt";
  }

  const now = new Date();
  const elapsedMs = now.getTime() - diagnosticsData.startTime.getTime();
  const progressFraction = diagnosticsData.progress / 100;

  if (progressFraction === 0) {
    return "Unbekannt";
  }

  // Geschätzte Gesamtzeit basierend auf aktuellem Fortschritt
  const estimatedTotalMs = elapsedMs / progressFraction;

  // Verbleibende Zeit
  const remainingMs = Math.max(0, estimatedTotalMs - elapsedMs);

  // In lesbare Form umwandeln
  if (remainingMs < 60000) {
    // Weniger als eine Minute
    return "Weniger als eine Minute";
  } else if (remainingMs < 3600000) {
    // Minuten
    const minutes = Math.ceil(remainingMs / 60000);
    return `Etwa ${minutes} Minute${minutes === 1 ? "" : "n"}`;
  } else if (remainingMs < 86400000) {
    // Stunden
    const hours = Math.ceil(remainingMs / 3600000);
    return `Etwa ${hours} Stunde${hours === 1 ? "" : "n"}`;
  } else {
    // Tage
    const days = Math.ceil(remainingMs / 86400000);
    return `Etwa ${days} Tag${days === 1 ? "" : "e"}`;
  }
}

// Migration-Dashboard aktivieren
export function enableMigrationDashboard(enabled: boolean = true): void {
  migrationDiagnostics.enableDashboard(enabled);
}

export default {
  initializeMigrationSystem,
  registerStandardRoutes,
  generateMigrationStatistics,
  enableMigrationDashboard,
  stateMigrator,
  routerMigrator,
  pluginMigrator,
  migrationDiagnostics,
};
