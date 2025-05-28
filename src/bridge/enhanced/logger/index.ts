/**
 * Logger-Export für die verbesserte Bridge
 *
 * Diese Datei exportiert die Logger-Komponenten und -Helfer für alle
 * Bridge-Komponenten, um einheitliches Logging zu gewährleisten.
 */

import { LogLevel, BridgeLogger } from "../types";
import { EnhancedBridgeLogger } from "../logger";

// Re-export der Logger-Klasse
export { EnhancedBridgeLogger };

// Re-export des LogLevel-Enums
export { LogLevel };

// Standard-Logger-Instanz für einfachen Zugriff
export const logger = new EnhancedBridgeLogger();

// Logger-Factory für Komponenten, die eine eigene Logger-Instanz benötigen
export function createLogger(component: string): BridgeLogger {
  const componentLogger = new EnhancedBridgeLogger();
  return {
    setLevel: (level: LogLevel) => componentLogger.setLevel(level),
    debug: (message: string, data?: any) =>
      componentLogger.debug(`[${component}] ${message}`, data),
    info: (message: string, data?: any) =>
      componentLogger.info(`[${component}] ${message}`, data),
    warn: (message: string, data?: any) =>
      componentLogger.warn(`[${component}] ${message}`, data),
    error: (message: string, data?: any) =>
      componentLogger.error(`[${component}] ${message}`, data),
    getLogs: (level?: LogLevel) => componentLogger.getLogs(level),
    clearLogs: () => componentLogger.clearLogs(),
  };
}
