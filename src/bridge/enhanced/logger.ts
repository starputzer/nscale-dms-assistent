/**
 * Logger-Komponente für die verbesserte Bridge
 *
 * Diese Datei implementiert ein umfassendes Logging-System mit verschiedenen Detailstufen,
 * das von den anderen Bridge-Komponenten verwendet wird.
 */

import { LogLevel, BridgeLogger } from "./types";

/**
 * Implementation des Bridge-Loggers
 */
export class EnhancedBridgeLogger implements BridgeLogger {
  private level: LogLevel = LogLevel.INFO;
  private logs: {
    level: LogLevel;
    message: string;
    timestamp: Date;
    data?: any;
  }[] = [];
  private maxLogs = 1000;

  /**
   * Setzt das Log-Level
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Loggt eine Debug-Nachricht
   */
  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * Loggt eine Info-Nachricht
   */
  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * Loggt eine Warnung
   */
  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * Loggt einen Fehler
   */
  error(message: string, data?: any): void {
    this.log(LogLevel.ERROR, message, data);
  }

  /**
   * Interne Logging-Funktion
   */
  private log(level: LogLevel, message: string, data?: any): void {
    if (level < this.level) return;

    const logEntry = {
      level,
      message,
      timestamp: new Date(),
      data,
    };

    this.logs.push(logEntry);

    // Begrenzung der Log-Größe
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Ausgabe im Konsolenformat
    const prefix = LogLevel[level].padEnd(5);
    console.log(`[Bridge] ${prefix} | ${message}`, data ? data : "");

    // Bei Fehlern auch einen benutzerdefinierten Event auslösen
    if (level === LogLevel.ERROR) {
      this.emitErrorEvent(message, data);
    }
  }

  /**
   * Löst ein Error-Event aus
   */
  private emitErrorEvent(message: string, data?: any): void {
    const event = new CustomEvent("bridge:error", {
      detail: { message, data, timestamp: new Date() },
    });
    window.dispatchEvent(event);
  }

  /**
   * Gibt alle Logs zurück, optional gefiltert nach Level
   */
  getLogs(level?: LogLevel): any[] {
    if (level !== undefined) {
      return this.logs.filter((log) => log.level === level);
    }
    return [...this.logs];
  }

  /**
   * Löscht alle Logs
   */
  clearLogs(): void {
    this.logs = [];
  }
}
