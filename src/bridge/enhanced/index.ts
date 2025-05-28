/**
 * Hauptexport-Datei für die verbesserte Bridge
 *
 * Diese Datei exportiert alle Komponenten der verbesserten Bridge und
 * stellt ein Vue-Plugin für die einfache Integration bereit.
 */

// Nur die benötigten Vue-Typen
import type { Plugin } from "vue";
import type { ComponentPublicInstance } from "vue";

// Bridge-Typen und Komponenten
import { BridgeConfiguration, LogLevel } from "./types";
import { EnhancedBridge } from "./bridgeCore";
import { createChatBridge, ChatBridgeConfiguration } from "./chatBridge";

/**
 * Erzeugt eine Bridge-Instanz mit den angegebenen Konfigurationsoptionen
 */
export function createBridge(
  config?: Partial<BridgeConfiguration>,
): EnhancedBridge {
  return new EnhancedBridge(config);
}

/**
 * Vue-Plugin für die Bridge
 */
export const BridgePlugin: Plugin = {
  install(app: ComponentPublicInstance, config?: Partial<BridgeConfiguration>) {
    // Standard-Konfiguration für Entwicklung/Produktion
    const defaultConfig: Partial<BridgeConfiguration> = {
      debugging: process.env.NODE_ENV !== "production",
      logLevel:
        process.env.NODE_ENV !== "production" ? LogLevel.DEBUG : LogLevel.INFO,
      batchInterval: 50,
      deepWatchEnabled: true,
      healthCheckInterval: 30000,
      autoRecovery: true,
    };

    // Bridge mit zusammengeführter Konfiguration erstellen
    const bridge = createBridge({
      ...defaultConfig,
      ...config,
    });

    // Bridge verbinden
    bridge.connect();

    // Bridge-API bereitstellen
    const api = bridge.exposeGlobalAPI();

    // Bridge für Komponenten verfügbar machen
    app.provide("bridge", api);

    // Bridge-Instanz auf der App speichern
    app.config.globalProperties.$bridge = api;

    // Cleanup beim App-Unmount
    const originalUnmount = app.unmount;
    app.unmount = function () {
      bridge.disconnect();
      originalUnmount.call(this);
    };

    console.info("Enhanced Bridge Plugin installiert");
  },
};

/**
 * Chat-Bridge-Plugin
 */
export const ChatBridgePlugin: Plugin = {
  install(
    app: App,
    options?: {
      bridgeConfig?: Partial<BridgeConfiguration>;
      chatConfig?: Partial<ChatBridgeConfiguration>;
    },
  ) {
    // Bridge-Plugin installieren
    BridgePlugin.install(app, options?.bridgeConfig);

    // Bridge-Instanz holen
    const bridge = app.config.globalProperties.$bridge;

    // Chat-Bridge erstellen
    const chatBridge = createChatBridge(bridge, options?.chatConfig);

    // Chat-Bridge initialisieren
    chatBridge.initialize().catch((error) => {
      console.error("Fehler bei der Chat-Bridge-Initialisierung:", error);
    });

    // Chat-Bridge für Komponenten verfügbar machen
    app.provide("chatBridge", chatBridge);

    // Chat-Bridge-Instanz auf der App speichern
    app.config.globalProperties.$chatBridge = chatBridge;

    // Cleanup beim App-Unmount
    const originalUnmount = app.unmount;
    app.unmount = function () {
      chatBridge.destroy();
      originalUnmount.call(this);
    };

    console.info("Chat Bridge Plugin installiert");
  },
};

// Export der Bridge-Typen
export * from "./types";

// Export der Bridge-Komponenten für erweiterte Anpassungen
export { EnhancedBridgeLogger } from "./logger";
export { EnhancedEventBus } from "./eventBus";
export { EnhancedStateManager } from "./stateManager";
export { BridgeStatusManager } from "./statusManager";
export { SelfHealingBridge } from "./selfHealing";
export { EnhancedBridge } from "./bridgeCore";
export { ChatBridge, createChatBridge } from "./chatBridge";

// Export der Komposables
export { useBridge } from "./bridgeCore";

// Standard-Export für Plugin
export default BridgePlugin;
