/**
 * Bridge Setup für Legacy-Code Integration
 *
 * Diese Datei enthält Hilfsfunktionen zur Konfiguration der Legacy-Bridge.
 * Die Bridge ermöglicht die Kommunikation zwischen dem Legacy-JavaScript und
 * den modernen Vue 3 Komponenten mit Pinia-Stores.
 */

import { initBridge } from "./index";

/**
 * Globale Feature-Flags für die Bridge-Funktionalität
 */
export const BRIDGE_CONFIG = {
  // Aktiviert die Bridge-Funktionalität global
  ENABLED: true,

  // Aktiviert Store-spezifische Funktionen
  AUTH_ENABLED: true,
  SESSIONS_ENABLED: true,
  UI_ENABLED: true,
  SETTINGS_ENABLED: true,

  // Konfiguration für Legacy-Event-Handling
  LEGACY_EVENTS_ENABLED: true,

  // Debug-Modus für die Bridge
  DEBUG: true,
};

/**
 * Hilfsfunktion zum Konfigurieren der Bridge
 */
export function configureBridge(config: Partial<typeof BRIDGE_CONFIG> = {}) {
  // Konfiguration überschreiben
  Object.assign(BRIDGE_CONFIG, config);

  // Debug-Informationen anzeigen
  if (BRIDGE_CONFIG.DEBUG) {
    console.log("Bridge-Konfiguration:", BRIDGE_CONFIG);
  }

  return BRIDGE_CONFIG;
}

/**
 * Hilfsfunktion zur Installation der Bridge in einer Vue-App
 */
export function installBridge(
  app: any,
  config: Partial<typeof BRIDGE_CONFIG> = {},
) {
  // Konfiguration aktualisieren
  configureBridge(config);

  // Bridge nur installieren, wenn aktiviert
  if (BRIDGE_CONFIG.ENABLED) {
    // Initialisiere die Bridge
    initBridge({
      debug: BRIDGE_CONFIG.DEBUG,
      modules: {
        auth: { enabled: BRIDGE_CONFIG.AUTH_ENABLED },
        sessions: { enabled: BRIDGE_CONFIG.SESSIONS_ENABLED },
        ui: { enabled: BRIDGE_CONFIG.UI_ENABLED }
      }
    });

    if (BRIDGE_CONFIG.DEBUG) {
      console.log("Bridge in Vue-App installiert");
    }

    // Globales Event für erfolgreiche Bridge-Installation auslösen
    window.dispatchEvent(new CustomEvent("nscale-bridge-ready"));
  } else if (BRIDGE_CONFIG.DEBUG) {
    console.log("Bridge ist deaktiviert und wurde nicht installiert");
  }
}

/**
 * Exportiere alles aus der Haupt-Bridge-Datei
 */
export * from "./index";
