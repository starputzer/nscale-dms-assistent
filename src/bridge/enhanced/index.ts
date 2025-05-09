/**
 * Hauptexport-Datei für die verbesserte Bridge
 * 
 * Diese Datei exportiert alle Komponenten der verbesserten Bridge und
 * stellt ein Vue-Plugin für die einfache Integration bereit.
 */

import { App, Plugin } from 'vue';
import { BridgeConfiguration, BridgeAPI, LogLevel } from './types';
import { EnhancedBridge } from './bridgeCore';

/**
 * Erzeugt eine Bridge-Instanz mit den angegebenen Konfigurationsoptionen
 */
export function createBridge(config?: Partial<BridgeConfiguration>): EnhancedBridge {
  return new EnhancedBridge(config);
}

/**
 * Vue-Plugin für die Bridge
 */
export const BridgePlugin: Plugin = {
  install(app: App, config?: Partial<BridgeConfiguration>) {
    // Standard-Konfiguration für Entwicklung/Produktion
    const defaultConfig: Partial<BridgeConfiguration> = {
      debugging: process.env.NODE_ENV !== 'production',
      logLevel: process.env.NODE_ENV !== 'production' ? LogLevel.DEBUG : LogLevel.INFO,
      batchInterval: 50,
      deepWatchEnabled: true,
      healthCheckInterval: 30000,
      autoRecovery: true
    };
    
    // Bridge mit zusammengeführter Konfiguration erstellen
    const bridge = createBridge({
      ...defaultConfig,
      ...config
    });
    
    // Bridge verbinden
    bridge.connect();
    
    // Bridge-API bereitstellen
    const api = bridge.exposeGlobalAPI();
    
    // Bridge für Komponenten verfügbar machen
    app.provide('bridge', api);
    
    // Bridge-Instanz auf der App speichern
    app.config.globalProperties.$bridge = api;
    
    // Cleanup beim App-Unmount
    const originalUnmount = app.unmount;
    app.unmount = function() {
      bridge.disconnect();
      originalUnmount.call(this);
    };
    
    console.info('Enhanced Bridge Plugin installiert');
  }
};

// Export der Bridge-Typen
export * from './types';

// Export der Bridge-Komponenten für erweiterte Anpassungen
export { EnhancedBridgeLogger } from './logger';
export { EnhancedEventBus } from './eventBus';
export { EnhancedStateManager } from './stateManager';
export { BridgeStatusManager } from './statusManager';
export { SelfHealingBridge } from './selfHealing';
export { EnhancedBridge } from './bridgeCore';

// Export des Komposable
export { useBridge } from './bridgeCore';

// Standard-Export für Plugin
export default BridgePlugin;