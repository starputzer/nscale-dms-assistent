import { getCurrentInstance } from "vue";
import { isDevelopment, isProduction } from "@/utils/environmentUtils";

/**
 * Log-Level für die Anwendung
 */
export type LogLevel = "debug" | "info" | "warn" | "error" | "none";

/**
 * Konfigurationsoptionen für den Logger
 */
export interface LoggerOptions {
  /** Minimaler Log-Level für Ausgabe */
  level?: LogLevel;
  /** Ob der Komponentenname der Quelle angehängt werden soll */
  includeComponent?: boolean;
  /** Ob ein Zeitstempel angehängt werden soll */
  includeTimestamp?: boolean;
  /** Ob Logs an externe Dienste gesendet werden sollen */
  remoteLogging?: boolean;
  /** Farben für unterschiedliche Log-Level verwenden */
  useColors?: boolean;
  /** Maximale Anzahl von Logs im Speicher */
  maxMemoryLogs?: number;
}

/**
 * Struktur eines Log-Eintrags
 */
export interface LogEntry {
  /** Level des Logs */
  level: LogLevel;
  /** Nachricht des Logs */
  message: string;
  /** Daten des Logs */
  data?: any;
  /** Name der Komponente (falls verfügbar) */
  component?: string;
  /** Zeitstempel des Logs */
  timestamp: Date;
}

// Levelwerte für Vergleiche
const LOG_LEVEL_VALUES: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  none: 4,
};

// Farben für die verschiedenen Log-Level
const LOG_COLORS: Record<LogLevel, string> = {
  debug: "#6b7280",
  info: "#3b82f6",
  warn: "#f59e0b",
  error: "#ef4444",
  none: "inherit",
};

// Globale Log-Einstellungen
let globalOptions: LoggerOptions = {
  level: isProduction() ? "error" : "debug",
  includeComponent: true,
  includeTimestamp: true,
  remoteLogging: isProduction(),
  useColors: true,
  maxMemoryLogs: 100,
};

// In-Memory-Log für Debug- und Analysezwecke
const memoryLogs: LogEntry[] = [];

/**
 * Setzt globale Logger-Optionen
 * @param options Die zu setzenden Optionen
 */
export function setLoggerOptions(options: Partial<LoggerOptions>): void {
  globalOptions = {
    ...globalOptions,
    ...options,
  };
}

/**
 * Ruft die aktuellen Logger-Optionen ab
 * @returns Die aktuellen Logger-Optionen
 */
export function getLoggerOptions(): LoggerOptions {
  return { ...globalOptions };
}

/**
 * Ruft die im Speicher gehaltenen Logs ab
 * @returns Array von Log-Einträgen
 */
export function getMemoryLogs(): LogEntry[] {
  return [...memoryLogs];
}

/**
 * Löscht alle im Speicher gehaltenen Logs
 */
export function clearMemoryLogs(): void {
  memoryLogs.length = 0;
}

/**
 * Composable für einheitliches Logging in der Anwendung
 * @param options Optionen für den Logger
 * @returns Logger-Funktionen
 */
export function useLogger(options: Partial<LoggerOptions> = {}) {
  // Optionen mit globalen Einstellungen mergen
  const mergedOptions: LoggerOptions = {
    ...globalOptions,
    ...options,
  };

  // Aktuelle Komponenten-Instanz abrufen
  const instance = getCurrentInstance();
  const componentName =
    instance?.type?.name || instance?.type.__name || "Unknown";

  /**
   * Fügt einen Log-Eintrag zum In-Memory-Log hinzu
   * @param entry Der Log-Eintrag
   */
  function addToMemoryLog(entry: LogEntry): void {
    memoryLogs.unshift(entry);

    // Begrenzen der Größe
    if (memoryLogs.length > mergedOptions.maxMemoryLogs!) {
      memoryLogs.pop();
    }
  }

  /**
   * Prüft, ob ein bestimmter Log-Level geloggt werden soll
   * @param level Der zu prüfende Log-Level
   * @returns Ob der Level geloggt werden soll
   */
  function shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_VALUES[level] >= LOG_LEVEL_VALUES[mergedOptions.level!];
  }

  /**
   * Formatiert eine Log-Nachricht mit Metadaten
   * @param level Log-Level
   * @param message Nachricht
   * @returns Formatierte Nachricht
   */
  function formatMessage(level: LogLevel, message: string): string {
    const parts: string[] = [];

    // Zeitstempel
    if (mergedOptions.includeTimestamp) {
      const now = new Date();
      parts.push(`[${now.toISOString()}]`);
    }

    // Log-Level
    parts.push(`[${level.toUpperCase()}]`);

    // Komponente
    if (mergedOptions.includeComponent && componentName) {
      parts.push(`[${componentName}]`);
    }

    // Nachricht
    parts.push(message);

    return parts.join(" ");
  }

  /**
   * Sendet Logs an einen externen Dienst
   * @param level Log-Level
   * @param message Nachricht
   * @param data Zusätzliche Daten
   */
  function sendToRemoteLogging(
    level: LogLevel,
    message: string,
    data?: any,
  ): void {
    if (!mergedOptions.remoteLogging) return;

    // In Produktion an externen Dienst senden
    // Implementation abhängig von verwendetem Dienst (z.B. Sentry, LogRocket, etc.)
    if (window.remoteLogger) {
      try {
        window.remoteLogger.log(level, message, {
          component: mergedOptions.includeComponent ? componentName : undefined,
          timestamp: new Date(),
          ...data,
        });
      } catch (e) {
        // Fehler beim Remote-Logging ignorieren
        console.error("Error in remote logging:", e);
      }
    }
  }

  /**
   * Generische Log-Funktion
   * @param level Log-Level
   * @param message Nachricht
   * @param data Zusätzliche Daten
   */
  function log(level: LogLevel, message: string, data?: any): void {
    if (!shouldLog(level)) return;

    const formattedMessage = formatMessage(level, message);
    const entry: LogEntry = {
      level,
      message,
      data,
      component: mergedOptions.includeComponent ? componentName : undefined,
      timestamp: new Date(),
    };

    // In Memory-Log speichern
    addToMemoryLog(entry);

    // An Remote-Logging senden
    if (mergedOptions.remoteLogging) {
      sendToRemoteLogging(level, message, data);
    }

    // An die Konsole ausgeben
    if (mergedOptions.useColors) {
      console[
        level === "error"
          ? "error"
          : level === "warn"
            ? "warn"
            : level === "info"
              ? "info"
              : "log"
      ](`%c${formattedMessage}`, `color: ${LOG_COLORS[level]}`, data);
    } else {
      console[
        level === "error"
          ? "error"
          : level === "warn"
            ? "warn"
            : level === "info"
              ? "info"
              : "log"
      ](formattedMessage, data);
    }
  }

  return {
    /**
     * Loggt eine Debug-Nachricht
     * @param message Die zu loggende Nachricht
     * @param data Zusätzliche Daten
     */
    debug: (message: string, data?: any) => log("debug", message, data),

    /**
     * Loggt eine Info-Nachricht
     * @param message Die zu loggende Nachricht
     * @param data Zusätzliche Daten
     */
    info: (message: string, data?: any) => log("info", message, data),

    /**
     * Loggt eine Warn-Nachricht
     * @param message Die zu loggende Nachricht
     * @param data Zusätzliche Daten
     */
    warn: (message: string, data?: any) => log("warn", message, data),

    /**
     * Loggt eine Error-Nachricht
     * @param message Die zu loggende Nachricht
     * @param data Zusätzliche Daten
     */
    error: (message: string, data?: any) => log("error", message, data),

    /**
     * Gibt die aktuellen Logger-Optionen zurück
     * @returns Die aktuellen Logger-Optionen
     */
    getOptions: () => ({ ...mergedOptions }),

    /**
     * Ändert Logger-Optionen zur Laufzeit
     * @param newOptions Die neuen Optionen
     */
    setOptions: (newOptions: Partial<LoggerOptions>) => {
      Object.assign(mergedOptions, newOptions);
    },

    /**
     * Gibt die aktuelle Komponente zurück
     * @returns Name der Komponente
     */
    getComponent: () => componentName,

    /**
     * Gibt eine Referenz auf die In-Memory-Logs zurück
     * @returns Array von Log-Einträgen
     */
    getLogs: getMemoryLogs,

    /**
     * Löscht alle In-Memory-Logs
     */
    clearLogs: clearMemoryLogs,
  };
}

// Erweiterung für TypeScript: Remote Logger-Typen für Window-Objekt
declare global {
  interface Window {
    remoteLogger?: {
      log(level: LogLevel, message: string, data?: any): void;
    };
    errorTrackingService?: {
      captureError(error: Error, options?: any): void;
    };
  }
}
