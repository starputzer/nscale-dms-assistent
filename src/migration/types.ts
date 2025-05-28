/**
 * Typdefinitionen für das Migrationssystem
 */

/**
 * Repräsentiert eine semantische Version für State-Formate
 */
export interface StateVersion {
  major: number;
  minor: number;
  patch: number;
}

/**
 * Strategie zur Migration zwischen zwei State-Versionen
 */
export interface StateMigrationStrategy {
  // Ausgangsversion des Formats
  fromVersion: StateVersion;

  // Zielversion des Formats
  toVersion: StateVersion;

  // Funktion zur Vorwärtsmigration (Legacy -> Vue)
  migrateForward: (data: any) => any;

  // Funktion zur Rückwärtsmigration (Vue -> Legacy)
  migrateBackward: (data: any) => any;

  // Optionale Validierungsfunktion für migrierte Daten
  validateMigration?: (data: any) => boolean;
}

/**
 * Ergebnis einer Migrationsaktion
 */
export interface StateMigrationResult {
  // Ob die Migration erfolgreich war
  success: boolean;

  // Die migrierten Daten
  data: any;

  // Optionale Fehlermeldungen
  errors?: string[];

  // Optionale Warnungen
  warnings?: string[];
}

/**
 * Status des Migrationsprozesses
 */
export enum MigrationStatus {
  NOT_STARTED = "NOT_STARTED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  PARTIALLY_COMPLETED = "PARTIALLY_COMPLETED",
}

/**
 * Detaillierter Migrationsbericht für einen bestimmten State-Teil
 */
export interface StateMigrationReport {
  // Schlüssel des migrierten Zustandsteils
  stateKey: string;

  // Status der Migration
  status: MigrationStatus;

  // Ursprüngliche Version
  fromVersion: StateVersion;

  // Zielversion
  toVersion: StateVersion;

  // Wann die Migration gestartet wurde
  startedAt: Date;

  // Wann die Migration abgeschlossen wurde (falls abgeschlossen)
  completedAt?: Date;

  // Informationen über aufgetretene Fehler (falls vorhanden)
  errors?: string[];

  // Informationen über aufgetretene Warnungen (falls vorhanden)
  warnings?: string[];

  // Für partielle Migrationen: Welche Teile wurden migriert
  migratedParts?: string[];

  // Für partielle Migrationen: Welche Teile fehlen noch
  pendingParts?: string[];
}

/**
 * Umfassender Migrationsbericht für die gesamte Anwendung
 */
export interface ApplicationMigrationReport {
  // Gesamtstatus der Migration
  overallStatus: MigrationStatus;

  // Prozentsatz des abgeschlossenen Migrationsprozesses
  completionPercentage: number;

  // Detaillierte Berichte für jeden State-Teil
  stateReports: Record<string, StateMigrationReport>;

  // Wann der Migrationsprozess begonnen hat
  startedAt: Date;

  // Wann der Migrationsprozess abgeschlossen wurde (falls abgeschlossen)
  completedAt?: Date;

  // Zusammenfassung der kritischen Probleme
  criticalIssues?: string[];

  // Zusammenfassung der Warnungen
  warnings?: string[];

  // Empfohlene nächste Schritte zur Behebung von Problemen
  recommendedActions?: string[];
}

/**
 * Plugin-Migrations-Config
 */
export interface PluginMigrationConfig {
  // ID des Plugins
  pluginId: string;

  // Name des Plugins
  pluginName: string;

  // Versionskompatibilität
  compatibleWithLegacy: boolean;
  compatibleWithVue3: boolean;

  // Adapterkonfiguration für Legacy-Plugins
  legacyAdapterOptions?: Record<string, any>;

  // Benötigte Feature-Flags für dieses Plugin
  requiredFeatureFlags?: string[];
}

/**
 * Router-Migrations-Konfiguration
 */
export interface RouterMigrationConfig {
  // Alte Route
  legacyPath: string;

  // Neue Vue Router Route
  vuePath: string;

  // Parameter-Mapping zwischen alten und neuen Routen
  paramMapping?: Record<string, string>;

  // Zusätzlich zu übergebende Parameter
  additionalParams?: Record<string, any>;

  // Redirect-Typ
  redirectType: "permanent" | "temporary";
}
