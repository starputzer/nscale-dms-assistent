/**
 * LogService - Universeller Logging-Dienst für die Anwendung
 *
 * Diese Klasse bietet eine einheitliche Schnittstelle für Logging mit verschiedenen
 * Logging-Leveln, formatierter Ausgabe und konditionalem Logging basierend auf
 * der aktuellen Umgebung.
 */

/**
 * Verfügbare Logging-Level
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 100, // Deaktiviert alle Logs
}

/**
 * Optionen für LogService
 */
export interface LogServiceOptions {
  /** Standard-Logging-Level */
  level?: LogLevel;

  /** Komponenten/Module, für die detailliertes Logging aktiviert werden soll */
  enabledModules?: string[];

  /** Farbiges Logging aktivieren */
  colorize?: boolean;

  /** Zeitstempel anhängen */
  timestamp?: boolean;

  /** Logging in die Konsole aktivieren */
  enableConsole?: boolean;

  /** Logging in eine Datei aktivieren (nicht im Browser) */
  enableFile?: boolean;

  /** Remote-Logging aktivieren */
  enableRemote?: boolean;

  /** URL für Remote-Logging */
  remoteUrl?: string;
}

/**
 * LogService - Logging-Klasse
 */
export class LogService {
  /** Aktuelles Logging-Level */
  private static level: LogLevel =
    process.env.NODE_ENV === "production" ? LogLevel.WARN : LogLevel.DEBUG;

  /** Liste aktivierter Module für detailliertes Logging */
  private static enabledModules: string[] = [];

  /** Farbiges Logging aktivieren */
  private static colorize: boolean = true;

  /** Zeitstempel anhängen */
  private static timestamp: boolean = true;

  /** Logging in die Konsole aktivieren */
  private static enableConsole: boolean = true;

  /** Remote-Logging aktivieren */
  private static enableRemote: boolean = false;

  /** URL für Remote-Logging */
  private static remoteUrl: string = "";

  /** Puffer für Remote-Logs */
  private static remoteLogBuffer: any[] = [];

  /** Modulname für diese Instanz */
  private moduleName: string;

  /**
   * Globale Konfiguration für alle LogService-Instanzen
   */
  public static configure(options: LogServiceOptions): void {
    if (options.level !== undefined) {
      LogService.level = options.level;
    }

    if (options.enabledModules) {
      LogService.enabledModules = options.enabledModules;
    }

    if (options.colorize !== undefined) {
      LogService.colorize = options.colorize;
    }

    if (options.timestamp !== undefined) {
      LogService.timestamp = options.timestamp;
    }

    if (options.enableConsole !== undefined) {
      LogService.enableConsole = options.enableConsole;
    }

    if (options.enableRemote !== undefined) {
      LogService.enableRemote = options.enableRemote;
    }

    if (options.remoteUrl) {
      LogService.remoteUrl = options.remoteUrl;
    }
  }

  /**
   * Konstruktor
   */
  constructor(moduleName: string) {
    this.moduleName = moduleName;
  }

  /**
   * Debug-Level-Logging
   */
  public debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * Info-Level-Logging
   */
  public info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * Warn-Level-Logging
   */
  public warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * Error-Level-Logging
   */
  public error(message: string, data?: any): void {
    this.log(LogLevel.ERROR, message, data);
  }

  /**
   * Generische Log-Methode
   */
  private log(level: LogLevel, message: string, data?: any): void {
    // Überprüfen, ob das aktuelle Level geloggt werden soll
    if (level < LogService.level) {
      return;
    }

    // Überprüfen, ob detailliertes Logging für dieses Modul aktiviert ist
    if (
      level < LogLevel.WARN &&
      LogService.enabledModules.length > 0 &&
      !LogService.enabledModules.includes(this.moduleName)
    ) {
      return;
    }

    // Log-Nachricht formatieren
    const formattedMessage = this.formatMessage(level, message);

    // In die Konsole loggen
    if (LogService.enableConsole) {
      this.logToConsole(level, formattedMessage, data);
    }

    // Remote-Logging
    if (LogService.enableRemote) {
      this.logToRemote(level, message, data);
    }
  }

  /**
   * Formatiert eine Log-Nachricht
   */
  private formatMessage(level: LogLevel, message: string): string {
    const parts: string[] = [];

    // Zeitstempel
    if (LogService.timestamp) {
      const now = new Date();
      const timeStr = now.toISOString().split("T")[1].substring(0, 12);
      parts.push(`[${timeStr}]`);
    }

    // Level
    const levelStr = LogLevel[level].padEnd(5);
    parts.push(`[${levelStr}]`);

    // Modulname
    parts.push(`[${this.moduleName}]`);

    // Nachricht
    parts.push(message);

    return parts.join(" ");
  }

  /**
   * Gibt eine Nachricht in der Konsole aus
   */
  private logToConsole(level: LogLevel, message: string, data?: any): void {
    let consoleMethod: "debug" | "info" | "warn" | "error";
    let messageStyle = "";

    // Methode basierend auf Level wählen
    switch (level) {
      case LogLevel.DEBUG:
        consoleMethod = "debug";
        messageStyle = "color: #6c757d"; // Grau
        break;
      case LogLevel.INFO:
        consoleMethod = "info";
        messageStyle = "color: #0275d8"; // Blau
        break;
      case LogLevel.WARN:
        consoleMethod = "warn";
        messageStyle = "color: #f0ad4e"; // Orange
        break;
      case LogLevel.ERROR:
        consoleMethod = "error";
        messageStyle = "color: #d9534f"; // Rot
        break;
      default:
        consoleMethod = "log";
        break;
    }

    // Mit oder ohne Styling loggen
    if (LogService.colorize && typeof navigator !== "undefined") {
      console[consoleMethod](`%c${message}`, messageStyle, data);
    } else {
      console[consoleMethod](message, data);
    }
  }

  /**
   * Sendet eine Log-Nachricht an den Remote-Logging-Dienst
   */
  private logToRemote(level: LogLevel, message: string, data?: any): void {
    if (!LogService.remoteUrl) {
      return;
    }

    // Log-Eintrag erstellen
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      module: this.moduleName,
      message,
      data: data ? this.sanitizeData(data) : undefined,
      userAgent:
        typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      url: typeof window !== "undefined" ? window.location.href : undefined,
    };

    // Zum Puffer hinzufügen
    LogService.remoteLogBuffer.push(logEntry);

    // Puffer senden, wenn genug Einträge vorhanden sind oder bei höheren Log-Leveln
    if (LogService.remoteLogBuffer.length >= 10 || level >= LogLevel.ERROR) {
      this.flushRemoteLogBuffer();
    }
  }

  /**
   * Sendet den gepufferten Log an den Remote-Dienst
   */
  private flushRemoteLogBuffer(): void {
    if (LogService.remoteLogBuffer.length === 0 || !LogService.remoteUrl) {
      return;
    }

    const logsToSend = [...LogService.remoteLogBuffer];
    LogService.remoteLogBuffer = [];

    // Beacon-API verwenden, wenn verfügbar, sonst fetch
    const canUseBeacon =
      typeof navigator !== "undefined" && navigator.sendBeacon;

    if (canUseBeacon) {
      try {
        navigator.sendBeacon(
          LogService.remoteUrl,
          JSON.stringify({ logs: logsToSend }),
        );
      } catch (error) {
        // Fallback zu fetch bei Problemen mit Beacon
        this.sendLogsWithFetch(logsToSend);
      }
    } else {
      this.sendLogsWithFetch(logsToSend);
    }
  }

  /**
   * Sendet Logs mit der Fetch-API
   */
  private sendLogsWithFetch(logs: any[]): void {
    try {
      fetch(LogService.remoteUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ logs }),
        // Keine Fehlerbehandlung, da wir das Logging nicht blockieren wollen
        keepalive: true,
        mode: "no-cors",
      }).catch(() => {
        // Fehler beim Senden ignorieren
      });
    } catch (error) {
      // Fehler ignorieren
    }
  }

  /**
   * Bereinigt sensible Daten aus Log-Objekten
   */
  private sanitizeData(data: any): any {
    if (!data) return data;

    // Wenn es sich um einen String, eine Zahl oder einen Boolean handelt, direkt zurückgeben
    if (typeof data !== "object") {
      return data;
    }

    // Für Arrays rekursiv jedes Element bereinigen
    if (Array.isArray(data)) {
      return data.map((item) => this.sanitizeData(item));
    }

    // Für Objekte klonen und bereinigen
    const sanitized = { ...data };

    // Sensible Felder maskieren
    const sensitiveFields = [
      "password",
      "token",
      "secret",
      "credential",
      "key",
      "auth",
      "apiKey",
      "apiSecret",
      "accessToken",
      "refreshToken",
    ];

    for (const key in sanitized) {
      // Prüfen, ob der Schlüssel zu den sensiblen Feldern gehört
      if (
        sensitiveFields.some((field) =>
          key.toLowerCase().includes(field.toLowerCase()),
        )
      ) {
        sanitized[key] = "******";
      }
      // Rekursiv für verschachtelte Objekte
      else if (typeof sanitized[key] === "object" && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeData(sanitized[key]);
      }
    }

    return sanitized;
  }

  /**
   * Flush alle gepufferten Logs
   * (sollte vor dem Beenden der Anwendung aufgerufen werden)
   */
  public static flushLogs(): void {
    if (LogService.remoteLogBuffer.length > 0 && LogService.remoteUrl) {
      const logsToSend = [...LogService.remoteLogBuffer];
      LogService.remoteLogBuffer = [];

      // Synchronen XMLHttpRequest für das Beenden verwenden
      if (typeof XMLHttpRequest !== "undefined") {
        try {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", LogService.remoteUrl, false); // synchron
          xhr.setRequestHeader("Content-Type", "application/json");
          xhr.send(JSON.stringify({ logs: logsToSend }));
        } catch (error) {
          // Fehler ignorieren
        }
      }
    }
  }
}

export default LogService;
