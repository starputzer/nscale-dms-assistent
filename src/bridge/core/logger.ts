/**
 * @file Bridge Logger
 * @description Standardized logging utility for the bridge system.
 *
 * @redundancy-analysis
 * This file consolidates logging functionality previously implemented in:
 * - bridge/enhanced/logger.ts
 * - bridge/enhanced/optimized/diagnostics.ts
 * - Various console.log/warn/error calls across the bridge system
 */

// Explicitly import types to avoid redundancy
import type { BridgeError } from "./types";

/**
 * Log levels supported by the logger
 */
export type LogLevel = "debug" | "info" | "warn" | "error" | "none";

/**
 * Logger configuration options
 */
export interface LoggerOptions {
  /** Minimum log level to display */
  minLevel: LogLevel;

  /** Whether to include timestamps in log messages */
  timestamps: boolean;

  /** Whether to include the source module in log messages */
  showSource: boolean;

  /** List of namespaces to include in logging */
  enabledNamespaces?: string[];

  /** List of namespaces to exclude from logging */
  disabledNamespaces?: string[];

  /** Custom log handler function */
  customHandler?: (
    level: LogLevel,
    namespace: string,
    message: string,
    ...args: any[]
  ) => void;

  /** Maximum number of entries to keep in the log history */
  maxLogHistory: number;
}

/**
 * Log entry structure
 */
export interface LogEntry {
  /** Log level */
  level: LogLevel;

  /** Timestamp of the log entry */
  timestamp: number;

  /** Log namespace */
  namespace: string;

  /** Log message */
  message: string;

  /** Additional log arguments */
  args: any[];
}

/**
 * Bridge logger class
 */
export class BridgeLogger {
  /** Logger configuration */
  private options: LoggerOptions;

  /** Log history for troubleshooting */
  private logHistory: LogEntry[] = [];

  /** Level priorities for filtering */
  private readonly levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    none: 4,
  };

  /**
   * Create a new bridge logger
   */
  constructor(options?: Partial<LoggerOptions>) {
    this.options = {
      minLevel: options?.minLevel ?? "info",
      timestamps: options?.timestamps ?? true,
      showSource: options?.showSource ?? true,
      enabledNamespaces: options?.enabledNamespaces ?? [],
      disabledNamespaces: options?.disabledNamespaces ?? [],
      customHandler: options?.customHandler,
      maxLogHistory: options?.maxLogHistory ?? 100,
    };
  }

  /**
   * Create a namespaced logger instance
   */
  namespace(namespace: string): NamespacedLogger {
    return new NamespacedLogger(this, namespace);
  }

  /**
   * Log a debug message
   */
  debug(namespace: string, message: string, ...args: any[]): void {
    this.log("debug", namespace, message, ...args);
  }

  /**
   * Log an info message
   */
  info(namespace: string, message: string, ...args: any[]): void {
    this.log("info", namespace, message, ...args);
  }

  /**
   * Log a warning message
   */
  warn(namespace: string, message: string, ...args: any[]): void {
    this.log("warn", namespace, message, ...args);
  }

  /**
   * Log an error message
   */
  error(namespace: string, message: string, ...args: any[]): void {
    this.log("error", namespace, message, ...args);
  }

  /**
   * Log a message with a specific level
   */
  log(
    level: LogLevel,
    namespace: string,
    message: string,
    ...args: any[]
  ): void {
    // Skip if level is below the minimum level
    if (this.levelPriority[level] < this.levelPriority[this.options.minLevel]) {
      return;
    }

    // Skip if namespace is explicitly disabled
    if (this.isNamespaceDisabled(namespace)) {
      return;
    }

    // Skip if namespaces are filtered and this one isn't included
    if (
      this.options.enabledNamespaces &&
      this.options.enabledNamespaces.length > 0 &&
      !this.isNamespaceEnabled(namespace)
    ) {
      return;
    }

    // Add to log history
    const entry: LogEntry = {
      level,
      timestamp: Date.now(),
      namespace,
      message,
      args,
    };

    this.addToLogHistory(entry);

    // Use custom handler if provided
    if (this.options.customHandler) {
      this.options.customHandler(level, namespace, message, ...args);
      return;
    }

    // Format message
    const formattedMessage = this.formatMessage(entry);

    // Use appropriate console method
    switch (level) {
      case "debug":
        console.debug(formattedMessage, ...args);
        break;
      case "info":
        console.info(formattedMessage, ...args);
        break;
      case "warn":
        console.warn(formattedMessage, ...args);
        break;
      case "error":
        console.error(formattedMessage, ...args);
        break;
    }
  }

  /**
   * Log an error object
   */
  logError(
    namespace: string,
    error: Error | BridgeError | unknown,
    context?: Record<string, any>,
  ): void {
    let message: string;
    let details: any;

    if (error instanceof Error) {
      message = error.message;
      details = {
        name: error.name,
        stack: error.stack,
        ...context,
      };
    } else if (
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      typeof error.message === "string"
    ) {
      message = (error as BridgeError).message;
      details = {
        code: (error as BridgeError).code,
        details: (error as BridgeError).details,
        ...context,
      };
    } else if (typeof error === "string") {
      message = error;
      details = context;
    } else {
      message = "Unknown error";
      details = {
        error,
        ...context,
      };
    }

    this.error(namespace, message, details);
  }

  /**
   * Set the minimum log level
   */
  setMinLevel(level: LogLevel): void {
    this.options.minLevel = level;
  }

  /**
   * Enable timestamps in log messages
   */
  enableTimestamps(): void {
    this.options.timestamps = true;
  }

  /**
   * Disable timestamps in log messages
   */
  disableTimestamps(): void {
    this.options.timestamps = false;
  }

  /**
   * Enable a specific namespace
   */
  enableNamespace(namespace: string): void {
    if (!this.options.enabledNamespaces) {
      this.options.enabledNamespaces = [];
    }

    if (!this.options.enabledNamespaces.includes(namespace)) {
      this.options.enabledNamespaces.push(namespace);
    }

    // Remove from disabled namespaces if present
    if (this.options.disabledNamespaces) {
      const index = this.options.disabledNamespaces.indexOf(namespace);
      if (index !== -1) {
        this.options.disabledNamespaces.splice(index, 1);
      }
    }
  }

  /**
   * Disable a specific namespace
   */
  disableNamespace(namespace: string): void {
    if (!this.options.disabledNamespaces) {
      this.options.disabledNamespaces = [];
    }

    if (!this.options.disabledNamespaces.includes(namespace)) {
      this.options.disabledNamespaces.push(namespace);
    }

    // Remove from enabled namespaces if present
    if (this.options.enabledNamespaces) {
      const index = this.options.enabledNamespaces.indexOf(namespace);
      if (index !== -1) {
        this.options.enabledNamespaces.splice(index, 1);
      }
    }
  }

  /**
   * Get the current log history
   */
  getLogHistory(): LogEntry[] {
    return [...this.logHistory];
  }

  /**
   * Clear the log history
   */
  clearLogHistory(): void {
    this.logHistory = [];
  }

  /**
   * Check if a namespace is enabled
   */
  private isNamespaceEnabled(namespace: string): boolean {
    if (
      !this.options.enabledNamespaces ||
      this.options.enabledNamespaces.length === 0
    ) {
      return true;
    }

    return this.options.enabledNamespaces.some(
      (pattern) =>
        pattern === "*" ||
        namespace === pattern ||
        (pattern.endsWith("*") && namespace.startsWith(pattern.slice(0, -1))),
    );
  }

  /**
   * Check if a namespace is disabled
   */
  private isNamespaceDisabled(namespace: string): boolean {
    if (
      !this.options.disabledNamespaces ||
      this.options.disabledNamespaces.length === 0
    ) {
      return false;
    }

    return this.options.disabledNamespaces.some(
      (pattern) =>
        pattern === "*" ||
        namespace === pattern ||
        (pattern.endsWith("*") && namespace.startsWith(pattern.slice(0, -1))),
    );
  }

  /**
   * Format a log message
   */
  private formatMessage(entry: LogEntry): string {
    const parts: string[] = [];

    // Add timestamp
    if (this.options.timestamps) {
      const date = new Date(entry.timestamp);
      parts.push(`[${date.toISOString()}]`);
    }

    // Add level
    parts.push(`[${entry.level.toUpperCase()}]`);

    // Add namespace
    if (this.options.showSource) {
      parts.push(`[${entry.namespace}]`);
    }

    // Add message
    parts.push(entry.message);

    return parts.join(" ");
  }

  /**
   * Add an entry to the log history
   */
  private addToLogHistory(entry: LogEntry): void {
    this.logHistory.push(entry);

    // Trim log history if it exceeds the maximum size
    if (this.logHistory.length > this.options.maxLogHistory) {
      this.logHistory.shift();
    }
  }
}

/**
 * Namespaced logger for a specific module
 */
export class NamespacedLogger {
  /** Parent logger */
  private logger: BridgeLogger;

  /** Logger namespace */
  private namespace: string;

  /**
   * Create a new namespaced logger
   */
  constructor(logger: BridgeLogger, namespace: string) {
    this.logger = logger;
    this.namespace = namespace;
  }

  /**
   * Log a debug message
   */
  debug(message: string, ...args: any[]): void {
    this.logger.debug(this.namespace, message, ...args);
  }

  /**
   * Log an info message
   */
  info(message: string, ...args: any[]): void {
    this.logger.info(this.namespace, message, ...args);
  }

  /**
   * Log a warning message
   */
  warn(message: string, ...args: any[]): void {
    this.logger.warn(this.namespace, message, ...args);
  }

  /**
   * Log an error message
   */
  error(message: string, ...args: any[]): void {
    this.logger.error(this.namespace, message, ...args);
  }

  /**
   * Log an error object
   */
  logError(
    error: Error | BridgeError | unknown,
    context?: Record<string, any>,
  ): void {
    this.logger.logError(this.namespace, error, context);
  }

  /**
   * Create a child namespaced logger
   */
  child(childNamespace: string): NamespacedLogger {
    return this.logger.namespace(`${this.namespace}:${childNamespace}`);
  }
}

/**
 * Create the default logger instance
 */
export const logger = new BridgeLogger({
  minLevel: process.env.NODE_ENV === "production" ? "info" : "debug",
  timestamps: true,
  showSource: true,
  maxLogHistory: 100,
});
