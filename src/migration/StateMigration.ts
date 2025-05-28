/**
 * StateMigration.ts
 *
 * Bietet Werkzeuge zur Migration von State-Daten zwischen Legacy- und Vue 3-Format.
 * Diese Komponente unterstützt die bidirektionale Konvertierung und Validierung von Daten
 * und stellt sicher, dass Datenformate während des Migrationsprozesses kompatibel bleiben.
 */

import { deepClone, deepMerge } from "../utils/objectUtils";
import { logger } from "../bridge/enhanced/logger";
import {
  StateVersion,
  StateMigrationStrategy,
  StateMigrationResult,
} from "./types";

/**
 * Verwaltet die Migrationsstrategie und Versionskonvertierung für verschiedene Teile des Zustands
 */
export class StateMigrator {
  // Migrations-Strategien nach State-Schlüssel
  private migrationStrategies: Map<string, StateMigrationStrategy[]> =
    new Map();

  // Version des aktuellen State-Formats (für Migrations-Entscheidungen)
  private currentVersion: StateVersion = {
    major: 3,
    minor: 0,
    patch: 0,
  };

  /**
   * Registriert eine Migrationsstrategie für einen State-Schlüssel
   * @param stateKey Der Schlüssel des zu migrierenden Zustandsteils
   * @param fromVersion Ausgangsversion des Zustandsformats
   * @param toVersion Zielversion des Zustandsformats
   * @param migrateForward Funktion zur Vorwärtsmigration (altes -> neues Format)
   * @param migrateBackward Funktion zur Rückwärtsmigration (neues -> altes Format)
   * @param validateMigration Optionale Validierungsfunktion für die migrierten Daten
   */
  public registerMigrationStrategy(
    stateKey: string,
    fromVersion: StateVersion,
    toVersion: StateVersion,
    migrateForward: (data: any) => any,
    migrateBackward: (data: any) => any,
    validateMigration?: (data: any) => boolean,
  ): void {
    if (!this.migrationStrategies.has(stateKey)) {
      this.migrationStrategies.set(stateKey, []);
    }

    this.migrationStrategies.get(stateKey)!.push({
      fromVersion,
      toVersion,
      migrateForward,
      migrateBackward,
      validateMigration: validateMigration || ((data) => true),
    });

    // Sortieren nach Versionen für korrekte Migrationsreihenfolge
    this.migrationStrategies.get(stateKey)!.sort((a, b) => {
      const aVersion = a.fromVersion;
      const bVersion = b.fromVersion;

      if (aVersion.major !== bVersion.major) {
        return aVersion.major - bVersion.major;
      }

      if (aVersion.minor !== bVersion.minor) {
        return aVersion.minor - bVersion.minor;
      }

      return aVersion.patch - bVersion.patch;
    });

    logger.info(
      `Migrationsstrategie für ${stateKey} registriert: ${JSON.stringify(fromVersion)} -> ${JSON.stringify(toVersion)}`,
    );
  }

  /**
   * Migriert Daten von Legacy zu Vue 3 Format
   * @param stateKey Der Schlüssel des zu migrierenden Zustandsteils
   * @param legacyData Die zu migrierenden Daten im Legacy-Format
   * @param fromVersion Optional: Die Version der eingehenden Daten
   * @returns Migrationsergebnis mit den konvertierten Daten und Statusinformationen
   */
  public migrateForward(
    stateKey: string,
    legacyData: any,
    fromVersion?: StateVersion,
  ): StateMigrationResult {
    if (!this.migrationStrategies.has(stateKey)) {
      logger.warn(`Keine Migrationsstrategie für ${stateKey} gefunden`);
      return {
        success: false,
        data: deepClone(legacyData),
        errors: ["Keine Migrationsstrategie gefunden"],
      };
    }

    const strategies = this.migrationStrategies.get(stateKey)!;
    if (strategies.length === 0) {
      return {
        success: true,
        data: deepClone(legacyData),
        warnings: [
          "Keine Migrationsstrategien definiert, Daten unverändert übernommen",
        ],
      };
    }

    try {
      // Tiefe Kopie der Eingabedaten erstellen
      let migratedData = deepClone(legacyData);
      const errors: string[] = [];
      const warnings: string[] = [];
      let currentFromVersion = fromVersion || strategies[0].fromVersion;

      // Alle anwendbaren Strategien durchlaufen
      for (const strategy of strategies) {
        // Nur anwenden, wenn die Versionen übereinstimmen
        if (this.versionsMatch(currentFromVersion, strategy.fromVersion)) {
          logger.debug(
            `Migriere ${stateKey} von ${JSON.stringify(currentFromVersion)} nach ${JSON.stringify(strategy.toVersion)}`,
          );

          try {
            // Vorwärtsmigration durchführen
            migratedData = strategy.migrateForward(migratedData);

            // Daten validieren
            if (!strategy.validateMigration(migratedData)) {
              const warning = `Validierung für ${stateKey} nach Migration zu Version ${JSON.stringify(strategy.toVersion)} fehlgeschlagen`;
              warnings.push(warning);
              logger.warn(warning);
            }

            // Aktuelle Version aktualisieren
            currentFromVersion = strategy.toVersion;
          } catch (error) {
            const errorMsg = `Fehler bei Migration von ${stateKey}: ${error instanceof Error ? error.message : String(error)}`;
            errors.push(errorMsg);
            logger.error(errorMsg);
          }
        }
      }

      // Erfolg basierend auf Fehlern bestimmen
      return {
        success: errors.length === 0,
        data: migratedData,
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error) {
      logger.error(`Unerwarteter Fehler bei Migration von ${stateKey}:`, error);
      return {
        success: false,
        data: deepClone(legacyData),
        errors: [
          `Unerwarteter Fehler: ${error instanceof Error ? error.message : String(error)}`,
        ],
      };
    }
  }

  /**
   * Migriert Daten von Vue 3 zu Legacy Format
   * @param stateKey Der Schlüssel des zu migrierenden Zustandsteils
   * @param vueData Die zu migrierenden Daten im Vue 3-Format
   * @param toVersion Optional: Die Zielversion für die Migration
   * @returns Migrationsergebnis mit den konvertierten Daten und Statusinformationen
   */
  public migrateBackward(
    stateKey: string,
    vueData: any,
    toVersion?: StateVersion,
  ): StateMigrationResult {
    if (!this.migrationStrategies.has(stateKey)) {
      logger.warn(`Keine Migrationsstrategie für ${stateKey} gefunden`);
      return {
        success: false,
        data: deepClone(vueData),
        errors: ["Keine Migrationsstrategie gefunden"],
      };
    }

    const strategies = this.migrationStrategies.get(stateKey)!;
    if (strategies.length === 0) {
      return {
        success: true,
        data: deepClone(vueData),
        warnings: [
          "Keine Migrationsstrategien definiert, Daten unverändert übernommen",
        ],
      };
    }

    try {
      // Tiefe Kopie der Eingabedaten erstellen
      let migratedData = deepClone(vueData);
      const errors: string[] = [];
      const warnings: string[] = [];
      let currentToVersion = toVersion || this.currentVersion;

      // Strategien in umgekehrter Reihenfolge durchlaufen für Rückwärtsmigration
      for (let i = strategies.length - 1; i >= 0; i--) {
        const strategy = strategies[i];

        // Nur anwenden, wenn die Versionen übereinstimmen
        if (this.versionsMatch(strategy.toVersion, currentToVersion)) {
          logger.debug(
            `Rückwärtsmigration für ${stateKey} von ${JSON.stringify(strategy.toVersion)} nach ${JSON.stringify(strategy.fromVersion)}`,
          );

          try {
            // Rückwärtsmigration durchführen
            migratedData = strategy.migrateBackward(migratedData);

            // Daten validieren (optional für Rückwärtsmigration)
            if (!strategy.validateMigration(migratedData)) {
              const warning = `Validierung für ${stateKey} nach Rückwärtsmigration zu Version ${JSON.stringify(strategy.fromVersion)} fehlgeschlagen`;
              warnings.push(warning);
              logger.warn(warning);
            }

            // Aktuelle Version aktualisieren
            currentToVersion = strategy.fromVersion;
          } catch (error) {
            const errorMsg = `Fehler bei Rückwärtsmigration von ${stateKey}: ${error instanceof Error ? error.message : String(error)}`;
            errors.push(errorMsg);
            logger.error(errorMsg);
          }
        }
      }

      // Erfolg basierend auf Fehlern bestimmen
      return {
        success: errors.length === 0,
        data: migratedData,
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error) {
      logger.error(
        `Unerwarteter Fehler bei Rückwärtsmigration von ${stateKey}:`,
        error,
      );
      return {
        success: false,
        data: deepClone(vueData),
        errors: [
          `Unerwarteter Fehler: ${error instanceof Error ? error.message : String(error)}`,
        ],
      };
    }
  }

  /**
   * Analysiert Legacy-Daten und repariert inkonsistente Zustände
   * @param stateKey Der Schlüssel des zu reparierenden Zustandsteils
   * @param data Die zu reparierenden Daten
   * @param version Die Version der Daten
   * @returns Migrationsergebnis mit den reparierten Daten und Statusinformationen
   */
  public repairState(
    stateKey: string,
    data: any,
    version: StateVersion,
  ): StateMigrationResult {
    try {
      // Schemavalidierung
      const validationResult = this.validateSchema(stateKey, data, version);
      if (!validationResult.success) {
        logger.warn(
          `Schemavalidierung für ${stateKey} fehlgeschlagen, versuche Reparatur`,
        );

        // Template für diesen Zustandstyp und diese Version holen
        const template = this.getStateTemplate(stateKey, version);

        // Daten mit Template tiefgehend zusammenführen
        const repairedData = deepMerge(template, data);

        // Erneut validieren
        const revalidation = this.validateSchema(
          stateKey,
          repairedData,
          version,
        );

        if (revalidation.success) {
          logger.info(`Zustand für ${stateKey} erfolgreich repariert`);
          return {
            success: true,
            data: repairedData,
            warnings: ["Daten wurden repariert und validiert"],
          };
        } else {
          logger.error(`Reparatur für ${stateKey} fehlgeschlagen`);
          return {
            success: false,
            data,
            errors: ["Reparatur fehlgeschlagen. Daten bleiben unverändert."],
            warnings: revalidation.warnings,
          };
        }
      }

      // Wenn keine Reparatur nötig war
      return {
        success: true,
        data,
      };
    } catch (error) {
      logger.error(`Fehler bei Reparatur von ${stateKey}:`, error);
      return {
        success: false,
        data,
        errors: [
          `Reparatur fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`,
        ],
      };
    }
  }

  /**
   * Validiert die Datenstruktur gegen ein erwartetes Schema
   * @param stateKey Der Schlüssel des zu validierenden Zustandsteils
   * @param data Die zu validierenden Daten
   * @param version Die zu verwendende Version für die Validierung
   * @returns Validierungsergebnis
   */
  private validateSchema(
    stateKey: string,
    data: any,
    version: StateVersion,
  ): { success: boolean; warnings?: string[] } {
    // Hier würde im Produktionscode eine echte Schema-Validierung stehen,
    // z.B. mit Bibliotheken wie joi, yup oder ajv

    // Vereinfachte Implementierung für dieses Beispiel
    const requiredKeys = this.getRequiredKeys(stateKey, version);
    const warnings: string[] = [];

    if (!data || typeof data !== "object") {
      return { success: false, warnings: ["Daten sind kein Objekt"] };
    }

    let valid = true;

    // Prüfen, ob alle erforderlichen Schlüssel vorhanden sind
    for (const key of requiredKeys) {
      if (!(key in data)) {
        warnings.push(`Erforderlicher Schlüssel '${key}' fehlt`);
        valid = false;
      }
    }

    return {
      success: valid,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Holt ein leeres Template für einen bestimmten State-Typ und Version
   */
  private getStateTemplate(stateKey: string, version: StateVersion): any {
    // In einer echten Implementierung würden hier Templates für
    // verschiedene State-Typen und Versionen zurückgegeben

    // Vereinfachte Beispiel-Templates
    switch (stateKey) {
      case "user":
        return {
          id: "",
          username: "",
          email: "",
          preferences: {
            theme: "light",
            language: "de",
          },
          roles: [],
        };

      case "settings":
        return {
          theme: "light",
          fontSize: "medium",
          notifications: {
            enabled: true,
            types: {
              system: true,
              chat: true,
              updates: true,
            },
          },
        };

      case "sessions":
        return {
          active: null,
          list: [],
          metadata: {
            lastAccessed: Date.now(),
            count: 0,
          },
        };

      default:
        return {};
    }
  }

  /**
   * Gibt die erforderlichen Schlüssel für einen State-Typ und eine Version zurück
   */
  private getRequiredKeys(stateKey: string, version: StateVersion): string[] {
    // Vereinfachte Implementierung
    switch (stateKey) {
      case "user":
        return ["id", "username", "email"];

      case "settings":
        return ["theme", "fontSize", "notifications"];

      case "sessions":
        return ["active", "list", "metadata"];

      default:
        return [];
    }
  }

  /**
   * Vergleicht zwei Versionen auf Gleichheit
   */
  private versionsMatch(v1: StateVersion, v2: StateVersion): boolean {
    return (
      v1.major === v2.major && v1.minor === v2.minor && v1.patch === v2.patch
    );
  }

  /**
   * Erzeugt eine Liste aller verfügbaren Migrationsstrategien
   * für Debugging und Dokumentation
   */
  public listAllStrategies(): Record<string, any[]> {
    const result: Record<string, any[]> = {};

    for (const [stateKey, strategies] of this.migrationStrategies.entries()) {
      result[stateKey] = strategies.map((s) => ({
        fromVersion: s.fromVersion,
        toVersion: s.toVersion,
      }));
    }

    return result;
  }
}

/**
 * Singleton-Instanz des StateMigrator
 */
export const stateMigrator = new StateMigrator();

// Standardmigrationen registrieren
// [Hier würden in der Produktion die konkreten Migrationsstrategien registriert]

export default stateMigrator;
