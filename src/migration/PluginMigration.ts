/**
 * PluginMigration.ts
 *
 * Bietet Kompatibilitätsschichten und Adapter für Plugins zwischen dem
 * Legacy-System und Vue 3. Ermöglicht die schrittweise Migration von
 * Plugins und stellt sicher, dass sie in beiden Umgebungen funktionieren.
 */

import { reactive, watch } from "vue";
import { logger } from "../bridge/enhanced/logger";
import { deepClone } from "../utils/objectUtils";
import { PluginMigrationConfig } from "./types";

/**
 * Verwaltet die Plugin-Migration und -Kompatibilität
 */
export class PluginMigrator {
  // Registrierte Plugin-Konfigurationen
  private plugins: Map<string, PluginMigrationConfig> = new Map();

  // Aktive Plugin-Instanzen
  private pluginInstances: Map<string, any> = new Map();

  // Adapter für Legacy-Plugins
  private legacyAdapters: Map<string, any> = new Map();

  // Vue Plugin-Interfaces
  private vueInterfaces: Map<string, any> = new Map();

  // Feature-Toggle-System (wird bei Initialisierung gesetzt)
  private featureToggleSystem: any = null;

  /**
   * Initialisiert den PluginMigrator
   * @param featureToggleSystem Referenz auf das Feature-Toggle-System
   */
  public initialize(featureToggleSystem: any): void {
    this.featureToggleSystem = featureToggleSystem;
    logger.info("PluginMigrator initialized");
  }

  /**
   * Registriert ein Plugin für die Migration
   * @param config Die Plugin-Konfiguration
   */
  public registerPlugin(config: PluginMigrationConfig): void {
    // Prüfen, ob Plugin-ID eindeutig ist
    if (this.plugins.has(config.pluginId)) {
      logger.warn(
        `Plugin mit ID ${config.pluginId} ist bereits registriert. Überschreibe mit neuer Konfiguration.`,
      );
    }

    // Plugin registrieren
    this.plugins.set(config.pluginId, config);
    logger.debug(
      `Plugin registriert: ${config.pluginName} (${config.pluginId})`,
    );

    // Benötigte Feature-Flags prüfen und ggf. aktivieren
    this.ensureFeatureFlagsEnabled(config);
  }

  /**
   * Registriert mehrere Plugins auf einmal
   * @param configs Array von Plugin-Konfigurationen
   */
  public registerPlugins(configs: PluginMigrationConfig[]): void {
    for (const config of configs) {
      this.registerPlugin(config);
    }
  }

  /**
   * Erstellt einen Adapter für ein Legacy-Plugin zur Verwendung in Vue 3
   * @param pluginId ID des Plugins
   * @param legacyPlugin Die Legacy-Plugin-Instanz
   */
  public createLegacyAdapter(pluginId: string, legacyPlugin: any): any {
    if (!this.plugins.has(pluginId)) {
      logger.warn(
        `Unbekanntes Plugin mit ID ${pluginId}. Adapter kann nicht erstellt werden.`,
      );
      return null;
    }

    const config = this.plugins.get(pluginId)!;

    // Prüfen, ob Plugin mit Vue 3 kompatibel ist
    if (!config.compatibleWithVue3) {
      logger.warn(
        `Plugin ${config.pluginName} ist nicht mit Vue 3 kompatibel. Adapter wird mit eingeschränkter Funktionalität erstellt.`,
      );
    }

    // Adapter-Optionen aus Konfiguration holen
    const adapterOptions = config.legacyAdapterOptions || {};

    // Reaktiven State für den Adapter erstellen
    const adapterState = reactive({
      plugin: legacyPlugin,
      config,
      initialized: false,
      error: null,
      adapterMethods: {},
      pluginData: deepClone(legacyPlugin.data || {}),
    });

    // Basis-Adapter erstellen
    const adapter = {
      // Plugin-Metadaten
      id: config.pluginId,
      name: config.pluginName,
      version: legacyPlugin.version || "1.0.0",

      // Initialisierungsmethode
      async initialize() {
        try {
          if (typeof legacyPlugin.initialize === "function") {
            await legacyPlugin.initialize();
          }
          adapterState.initialized = true;
          return true;
        } catch (error) {
          adapterState.error = error;
          logger.error(
            `Fehler bei der Initialisierung des Legacy-Plugins ${config.pluginName}:`,
            error,
          );
          return false;
        }
      },

      // Standard-Lifecycle-Methoden
      async mount() {
        if (typeof legacyPlugin.onMount === "function") {
          await legacyPlugin.onMount();
        }
      },

      async unmount() {
        if (typeof legacyPlugin.onUnmount === "function") {
          await legacyPlugin.onUnmount();
        }
      },

      // Datenzugriff mit Vue 3 Reaktivität
      getData() {
        return adapterState.pluginData;
      },

      setData(key: string, value: any) {
        adapterState.pluginData[key] = value;

        // Legacy-Plugin aktualisieren
        if (legacyPlugin.data) {
          legacyPlugin.data[key] = value;
        }

        // Legacy-Update-Handler aufrufen, falls vorhanden
        if (typeof legacyPlugin.onDataUpdate === "function") {
          legacyPlugin.onDataUpdate(key, value);
        }
      },

      // Metadaten-Methoden
      getMetadata() {
        return {
          id: config.pluginId,
          name: config.pluginName,
          version: legacyPlugin.version || "1.0.0",
          author: legacyPlugin.author || "Unbekannt",
          description: legacyPlugin.description || "",
          compatibleWithLegacy: config.compatibleWithLegacy,
          compatibleWithVue3: config.compatibleWithVue3,
        };
      },

      // Status-Methoden
      isInitialized() {
        return adapterState.initialized;
      },

      hasError() {
        return adapterState.error !== null;
      },

      getError() {
        return adapterState.error;
      },
    };

    // Legacy-Plugin-Methoden zum Adapter hinzufügen
    for (const methodName of Object.keys(legacyPlugin)) {
      // Nur Funktionen übernehmen, keine internen Eigenschaften
      if (
        typeof legacyPlugin[methodName] === "function" &&
        !methodName.startsWith("_")
      ) {
        // Methode bereits im Adapter-Prototyp vorhanden
        if (methodName in adapter) {
          continue;
        }

        // Neue Methode im Adapter hinzufügen
        adapterState.adapterMethods[methodName] = (...args: any[]) => {
          try {
            return legacyPlugin[methodName](...args);
          } catch (error) {
            logger.error(
              `Fehler beim Aufruf der Legacy-Plugin-Methode ${methodName}:`,
              error,
            );
            throw error;
          }
        };
      }
    }

    // Dynamisch generierte Methoden zum Adapter hinzufügen
    for (const [methodName, method] of Object.entries(
      adapterState.adapterMethods,
    )) {
      (adapter as any)[methodName] = method;
    }

    // Adapter für Vue 3 Composables anpassen, falls erforderlich
    if (adapterOptions.provideComposable) {
      adapter.usePlugin = () => {
        return {
          data: adapterState.pluginData,
          initialized: adapterState.initialized,
          error: adapterState.error,
          ...adapterState.adapterMethods,
        };
      };
    }

    // Änderungsverfolgung für Plugin-Daten einrichten
    watch(
      () => adapterState.pluginData,
      (newData) => {
        // Legacy-Plugin-Daten aktualisieren
        if (legacyPlugin.data) {
          Object.assign(legacyPlugin.data, deepClone(newData));
        }

        // Update-Event auslösen, falls vorhanden
        if (typeof legacyPlugin.onUpdate === "function") {
          legacyPlugin.onUpdate(deepClone(newData));
        }
      },
      { deep: true },
    );

    // Adapter speichern
    this.legacyAdapters.set(pluginId, adapter);

    return adapter;
  }

  /**
   * Erstellt ein Interface für Vue 3 Plugins zur Verwendung in Legacy-Code
   * @param pluginId ID des Plugins
   * @param vuePlugin Die Vue 3-Plugin-Instanz
   */
  public createVueInterface(pluginId: string, vuePlugin: any): any {
    if (!this.plugins.has(pluginId)) {
      logger.warn(
        `Unbekanntes Plugin mit ID ${pluginId}. Interface kann nicht erstellt werden.`,
      );
      return null;
    }

    const config = this.plugins.get(pluginId)!;

    // Prüfen, ob Plugin mit Legacy-System kompatibel ist
    if (!config.compatibleWithLegacy) {
      logger.warn(
        `Plugin ${config.pluginName} ist nicht mit dem Legacy-System kompatibel. Interface wird mit eingeschränkter Funktionalität erstellt.`,
      );
    }

    // Legacy-Interface erstellen
    const legacyInterface = {
      // Plugin-Metadaten
      id: config.pluginId,
      name: config.pluginName,
      version: vuePlugin.version || "1.0.0",

      // Datenhaltung
      data: {},

      // Legacy-Lifecycle-Methoden
      initialize: async () => {
        if (typeof vuePlugin.initialize === "function") {
          await vuePlugin.initialize();
        }
        return true;
      },

      onMount: async () => {
        if (typeof vuePlugin.mount === "function") {
          await vuePlugin.mount();
        }
      },

      onUnmount: async () => {
        if (typeof vuePlugin.unmount === "function") {
          await vuePlugin.unmount();
        }
      },

      // Methoden-Delegationen
      onUpdate: (data: any) => {
        // Fallback-Implementierung
      },

      onDataUpdate: (key: string, value: any) => {
        // Fallback-Implementierung
      },
    };

    // Vue-Plugin-Methoden zum Legacy-Interface hinzufügen
    for (const methodName of Object.keys(vuePlugin)) {
      // Nur Funktionen übernehmen, keine internen Eigenschaften
      if (
        typeof vuePlugin[methodName] === "function" &&
        !methodName.startsWith("_")
      ) {
        // Methode bereits im Interface-Prototyp vorhanden
        if (methodName in legacyInterface) {
          continue;
        }

        // Neue Methode im Interface hinzufügen
        (legacyInterface as any)[methodName] = (...args: any[]) => {
          try {
            return vuePlugin[methodName](...args);
          } catch (error) {
            logger.error(
              `Fehler beim Aufruf der Vue-Plugin-Methode ${methodName}:`,
              error,
            );
            throw error;
          }
        };
      }
    }

    // Reaktive Daten vom Vue-Plugin ins Legacy-Interface übertragen
    if (vuePlugin.getData && typeof vuePlugin.getData === "function") {
      legacyInterface.data = deepClone(vuePlugin.getData());

      // Datenänderungs-Methoden überschreiben
      const originalGetData = vuePlugin.getData;

      legacyInterface.onUpdate = (callback: (data: any) => void) => {
        // Im Produktionscode würde hier ein Reaktivitäts-System eingerichtet
        // werden, das Änderungen überwacht und den Callback aufruft
      };

      legacyInterface.onDataUpdate = (
        key: string,
        callback: (value: any) => void,
      ) => {
        // Im Produktionscode würde hier ein Reaktivitäts-System eingerichtet
        // werden, das Änderungen überwacht und den Callback aufruft
      };
    }

    // Interface speichern
    this.vueInterfaces.set(pluginId, legacyInterface);

    return legacyInterface;
  }

  /**
   * Initialisiert ein Plugin
   * @param pluginId ID des Plugins
   * @param pluginInstance Die Plugin-Instanz
   */
  public initializePlugin(
    pluginId: string,
    pluginInstance: any,
  ): Promise<boolean> {
    if (!this.plugins.has(pluginId)) {
      logger.warn(
        `Unbekanntes Plugin mit ID ${pluginId}. Kann nicht initialisiert werden.`,
      );
      return Promise.resolve(false);
    }

    // Plugin-Instanz speichern
    this.pluginInstances.set(pluginId, pluginInstance);

    // Plugin initialisieren
    if (typeof pluginInstance.initialize === "function") {
      logger.debug(
        `Initialisiere Plugin: ${this.plugins.get(pluginId)!.pluginName}`,
      );

      return Promise.resolve()
        .then(() => pluginInstance.initialize())
        .then((result: any) => {
          logger.debug(
            `Plugin ${this.plugins.get(pluginId)!.pluginName} erfolgreich initialisiert`,
          );
          return result !== false;
        })
        .catch((error: any) => {
          logger.error(
            `Fehler bei Plugin-Initialisierung ${this.plugins.get(pluginId)!.pluginName}:`,
            error,
          );
          return false;
        });
    }

    return Promise.resolve(true);
  }

  /**
   * Stellt sicher, dass alle benötigten Feature-Flags für ein Plugin aktiviert sind
   * @param config Die Plugin-Konfiguration
   */
  private ensureFeatureFlagsEnabled(config: PluginMigrationConfig): void {
    if (
      !this.featureToggleSystem ||
      !config.requiredFeatureFlags ||
      config.requiredFeatureFlags.length === 0
    ) {
      return;
    }

    for (const flag of config.requiredFeatureFlags) {
      if (!this.featureToggleSystem.isEnabled(flag)) {
        logger.info(
          `Aktiviere benötigtes Feature-Flag ${flag} für Plugin ${config.pluginName}`,
        );
        this.featureToggleSystem.enable(flag);
      }
    }
  }

  /**
   * Gibt alle registrierten Plugins zurück
   */
  public getAllPlugins(): PluginMigrationConfig[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Gibt ein Plugin anhand seiner ID zurück
   * @param pluginId Die Plugin-ID
   */
  public getPlugin(pluginId: string): PluginMigrationConfig | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Gibt alle aktiven Plugin-Instanzen zurück
   */
  public getActivePlugins(): [string, any][] {
    return Array.from(this.pluginInstances.entries());
  }

  /**
   * Erstellt eine Dokumentation zur Plugin-Migration
   */
  public generateMigrationDocumentation(): string {
    let doc = "# Plugin-Migrations-Dokumentation\n\n";

    doc += "## Übersicht\n\n";
    doc +=
      "Diese Dokumentation beschreibt den Prozess zur Migration von Plugins\n";
    doc += "zwischen dem Legacy-JavaScript-System und Vue 3.\n\n";

    doc += "## Registrierte Plugins\n\n";

    if (this.plugins.size === 0) {
      doc += "Keine Plugins registriert.\n\n";
    } else {
      doc += "| Plugin-ID | Name | Legacy-Kompatibel | Vue 3-Kompatibel |\n";
      doc += "|-----------|------|-------------------|------------------|\n";

      for (const config of this.plugins.values()) {
        doc += `| ${config.pluginId} | ${config.pluginName} | ${config.compatibleWithLegacy ? "✅" : "❌"} | ${config.compatibleWithVue3 ? "✅" : "❌"} |\n`;
      }

      doc += "\n";
    }

    doc += "## Migrations-Prozess\n\n";
    doc +=
      "1. **Plugin registrieren**: Registrieren Sie Ihr Plugin mit `pluginMigrator.registerPlugin()`\n";
    doc +=
      "2. **Adapter erstellen**: Für Legacy-Plugins erstellen Sie einen Adapter mit `pluginMigrator.createLegacyAdapter()`\n";
    doc +=
      "3. **Interface erstellen**: Für Vue 3-Plugins erstellen Sie ein Interface mit `pluginMigrator.createVueInterface()`\n";
    doc +=
      "4. **Plugin initialisieren**: Initialisieren Sie das Plugin mit `pluginMigrator.initializePlugin()`\n\n";

    doc += "## Beispiel-Code\n\n";
    doc += "```typescript\n";
    doc += "// Plugin-Konfiguration registrieren\n";
    doc += "pluginMigrator.registerPlugin({\n";
    doc += '  pluginId: "my-plugin",\n';
    doc += '  pluginName: "Mein Plugin",\n';
    doc += "  compatibleWithLegacy: true,\n";
    doc += "  compatibleWithVue3: true,\n";
    doc += '  requiredFeatureFlags: ["enable-plugins"]\n';
    doc += "});\n\n";

    doc += "// Für Legacy-Plugin: Adapter für Vue 3 erstellen\n";
    doc += "const legacyPlugin = getMyLegacyPlugin();\n";
    doc +=
      'const adapter = pluginMigrator.createLegacyAdapter("my-plugin", legacyPlugin);\n\n';

    doc += "// Für Vue 3-Plugin: Interface für Legacy-Code erstellen\n";
    doc += "const vuePlugin = getMyVuePlugin();\n";
    doc +=
      'const legacyInterface = pluginMigrator.createVueInterface("my-plugin", vuePlugin);\n\n';

    doc += "// Plugin initialisieren\n";
    doc +=
      'await pluginMigrator.initializePlugin("my-plugin", adapter || legacyInterface);\n';
    doc += "```\n\n";

    doc += "## Feature-Flag-Integration\n\n";
    doc +=
      "Plugins können Feature-Flags benötigen, die automatisch aktiviert werden:\n\n";

    doc += "```typescript\n";
    doc += "pluginMigrator.registerPlugin({\n";
    doc += "  // ...\n";
    doc +=
      '  requiredFeatureFlags: ["enable-plugin-system", "enable-my-feature"]\n';
    doc += "});\n";
    doc += "```\n\n";

    doc +=
      "Diese Dokumentation wurde automatisch generiert am " +
      new Date().toISOString().split("T")[0];

    return doc;
  }
}

/**
 * Singleton-Instanz des PluginMigrator
 */
export const pluginMigrator = new PluginMigrator();

export default pluginMigrator;
