/**
 * Typdefinitionen für Fehlerbehandlung
 * 
 * Diese Datei enthält Typen für standardisierte Fehlerbehandlung
 * in der gesamten Anwendung, einschließlich Fehlerklassen, Fehlercodes
 * und Hilfsfunktionen für die Fehlerbehandlung.
 */

/**
 * Standardisierte Fehlercodes für die Anwendung
 */
export enum ErrorCode {
  // Allgemeine Fehler
  UNKNOWN = 'ERR_UNKNOWN',
  INTERNAL = 'ERR_INTERNAL',
  NOT_IMPLEMENTED = 'ERR_NOT_IMPLEMENTED',
  TIMEOUT = 'ERR_TIMEOUT',
  INVALID_OPERATION = 'ERR_INVALID_OPERATION',
  
  // API-Fehler
  API_REQUEST_FAILED = 'ERR_API_REQUEST_FAILED',
  API_RESPONSE_INVALID = 'ERR_API_RESPONSE_INVALID',
  API_UNAUTHORIZED = 'ERR_API_UNAUTHORIZED',
  API_FORBIDDEN = 'ERR_API_FORBIDDEN',
  API_NOT_FOUND = 'ERR_API_NOT_FOUND',
  API_RATE_LIMIT = 'ERR_API_RATE_LIMIT',
  API_SERVER_ERROR = 'ERR_API_SERVER_ERROR',
  API_NETWORK_ERROR = 'ERR_API_NETWORK_ERROR',
  
  // Authentifizierungsfehler
  AUTH_REQUIRED = 'ERR_AUTH_REQUIRED',
  AUTH_FAILED = 'ERR_AUTH_FAILED',
  AUTH_TOKEN_EXPIRED = 'ERR_AUTH_TOKEN_EXPIRED',
  AUTH_INVALID_CREDENTIALS = 'ERR_AUTH_INVALID_CREDENTIALS',
  AUTH_SESSION_EXPIRED = 'ERR_AUTH_SESSION_EXPIRED',
  
  // Validierungsfehler
  VALIDATION_FAILED = 'ERR_VALIDATION_FAILED',
  VALIDATION_REQUIRED_FIELD = 'ERR_VALIDATION_REQUIRED_FIELD',
  VALIDATION_INVALID_FORMAT = 'ERR_VALIDATION_INVALID_FORMAT',
  VALIDATION_OUT_OF_RANGE = 'ERR_VALIDATION_OUT_OF_RANGE',
  VALIDATION_TOO_SHORT = 'ERR_VALIDATION_TOO_SHORT',
  VALIDATION_TOO_LONG = 'ERR_VALIDATION_TOO_LONG',
  
  // Datenfehler
  DATA_NOT_FOUND = 'ERR_DATA_NOT_FOUND',
  DATA_DUPLICATE = 'ERR_DATA_DUPLICATE',
  DATA_INVALID = 'ERR_DATA_INVALID',
  DATA_CONFLICT = 'ERR_DATA_CONFLICT',
  DATA_CORRUPTED = 'ERR_DATA_CORRUPTED',
  
  // Store-Fehler
  STORE_NOT_INITIALIZED = 'ERR_STORE_NOT_INITIALIZED',
  STORE_ACTION_FAILED = 'ERR_STORE_ACTION_FAILED',
  STORE_UPDATE_FAILED = 'ERR_STORE_UPDATE_FAILED',
  STORE_SYNC_FAILED = 'ERR_STORE_SYNC_FAILED',
  
  // Chat-Fehler
  CHAT_SESSION_NOT_FOUND = 'ERR_CHAT_SESSION_NOT_FOUND',
  CHAT_MESSAGE_FAILED = 'ERR_CHAT_MESSAGE_FAILED',
  CHAT_STREAMING_FAILED = 'ERR_CHAT_STREAMING_FAILED',
  CHAT_RATE_LIMIT = 'ERR_CHAT_RATE_LIMIT',
  
  // Bridge-Fehler
  BRIDGE_NOT_INITIALIZED = 'ERR_BRIDGE_NOT_INITIALIZED',
  BRIDGE_COMMUNICATION_FAILED = 'ERR_BRIDGE_COMMUNICATION_FAILED',
  BRIDGE_EVENT_ERROR = 'ERR_BRIDGE_EVENT_ERROR',
  BRIDGE_SYNC_ERROR = 'ERR_BRIDGE_SYNC_ERROR',
  
  // Konvertierungsfehler
  CONVERTER_DOCUMENT_FAILED = 'ERR_CONVERTER_DOCUMENT_FAILED',
  CONVERTER_FORMAT_UNSUPPORTED = 'ERR_CONVERTER_FORMAT_UNSUPPORTED',
  CONVERTER_TOO_LARGE = 'ERR_CONVERTER_TOO_LARGE',
}

/**
 * Fehler-Kontexte zur Kategorisierung von Fehlern
 */
export enum ErrorContext {
  API = 'api',
  AUTH = 'auth',
  CHAT = 'chat',
  STORE = 'store',
  UI = 'ui',
  BRIDGE = 'bridge',
  CONVERTER = 'converter',
  VALIDATION = 'validation',
  NETWORK = 'network',
  DATABASE = 'database',
  SYSTEM = 'system'
}

/**
 * Fehlerschweregrade
 */
export enum ErrorSeverity {
  DEBUG = 'debug',     // Nur für Entwicklung relevant
  INFO = 'info',       // Informativ, kein Handlungsbedarf
  WARNING = 'warning', // Warnung, kann Auswirkungen haben
  ERROR = 'error',     // Fehler, beeinträchtigt Funktionalität
  FATAL = 'fatal'      // Kritischer Fehler, verhindert Kernfunktionalität
}

/**
 * Basisinterface für Fehlerdetails
 */
export interface ErrorDetails {
  /** Eindeutiger Fehlercode */
  code: ErrorCode;
  
  /** Benutzerfreundliche Fehlermeldung */
  message: string;
  
  /** Kontext des Fehlers */
  context?: ErrorContext;
  
  /** Schweregrad des Fehlers */
  severity?: ErrorSeverity;
  
  /** Fehlerursache (ursprünglicher Fehler) */
  cause?: Error | unknown;
  
  /** Technische Fehlerdetails für Entwickler */
  technicalDetails?: Record<string, any>;
  
  /** Flag, ob der Fehler dem Benutzer angezeigt werden soll */
  userVisible?: boolean;
  
  /** Mögliche Lösungen für den Fehler */
  solutions?: string[];
  
  /** Hilfeartikel oder Dokumentations-URL */
  helpUrl?: string;
  
  /** Zeitstempel des Fehlers */
  timestamp?: string;
  
  /** Komponente oder Modul, wo der Fehler aufgetreten ist */
  component?: string;
  
  /** Flag, ob der Fehler automatisch an die Telemetrie gesendet werden soll */
  reportToTelemetry?: boolean;
}

/**
 * Optionen für die Fehlererstellung
 */
export interface CreateErrorOptions {
  /** Fehlerkontext */
  context?: ErrorContext;
  
  /** Fehlerschweregrad */
  severity?: ErrorSeverity;
  
  /** Ursprünglicher Fehler */
  cause?: Error | unknown;
  
  /** Technische Details */
  technicalDetails?: Record<string, any>;
  
  /** Soll der Fehler dem Benutzer angezeigt werden? */
  userVisible?: boolean;
  
  /** Lösungsvorschläge */
  solutions?: string[];
  
  /** Hilfeartikel */
  helpUrl?: string;
  
  /** Komponentenname */
  component?: string;
  
  /** An Telemetrie melden */
  reportToTelemetry?: boolean;
}

/**
 * Anwendungsspezifische Fehlerklasse
 */
export class AppError extends Error {
  /** Fehlercode */
  readonly code: ErrorCode;
  
  /** Fehlerkontext */
  readonly context: ErrorContext;
  
  /** Fehlerschweregrad */
  readonly severity: ErrorSeverity;
  
  /** Ursprünglicher Fehler */
  readonly cause?: Error | unknown;
  
  /** Technische Details */
  readonly technicalDetails?: Record<string, any>;
  
  /** Soll der Fehler dem Benutzer angezeigt werden? */
  readonly userVisible: boolean;
  
  /** Lösungsvorschläge */
  readonly solutions: string[];
  
  /** Hilfeartikel */
  readonly helpUrl?: string;
  
  /** Zeitstempel des Fehlers */
  readonly timestamp: string;
  
  /** Komponente oder Modul */
  readonly component?: string;
  
  /** An Telemetrie melden */
  readonly reportToTelemetry: boolean;
  
  /**
   * Erstellt einen neuen AppError
   */
  constructor(
    code: ErrorCode,
    message: string,
    options: CreateErrorOptions = {}
  ) {
    super(message);
    
    this.name = 'AppError';
    this.code = code;
    this.context = options.context || ErrorContext.SYSTEM;
    this.severity = options.severity || ErrorSeverity.ERROR;
    this.cause = options.cause;
    this.technicalDetails = options.technicalDetails;
    this.userVisible = options.userVisible ?? true;
    this.solutions = options.solutions || [];
    this.helpUrl = options.helpUrl;
    this.timestamp = new Date().toISOString();
    this.component = options.component;
    this.reportToTelemetry = options.reportToTelemetry ?? true;
    
    // Für korrekte instanceof-Überprüfungen
    Object.setPrototypeOf(this, AppError.prototype);
  }
  
  /**
   * Erstellt einen formatierten Fehlerstring für Logging
   */
  toString(): string {
    return `[${this.code}] ${this.message} (context: ${this.context}, severity: ${this.severity})`;
  }
  
  /**
   * Konvertiert den Fehler in ein JSON-Objekt
   */
  toJSON(): ErrorDetails {
    return {
      code: this.code,
      message: this.message,
      context: this.context,
      severity: this.severity,
      cause: this.cause instanceof Error ? {
        name: this.cause.name,
        message: this.cause.message,
        stack: this.cause.stack
      } : this.cause,
      technicalDetails: this.technicalDetails,
      userVisible: this.userVisible,
      solutions: this.solutions,
      helpUrl: this.helpUrl,
      timestamp: this.timestamp,
      component: this.component,
      reportToTelemetry: this.reportToTelemetry
    };
  }
  
  /**
   * Erstellt eine benutzerfreundliche Fehlermeldung
   */
  getUserMessage(): string {
    if (!this.userVisible) {
      return 'Ein Fehler ist aufgetreten.';
    }
    
    return this.message;
  }
  
  /**
   * Typ-Guard zum Überprüfen, ob ein Fehler ein AppError ist
   */
  static isAppError(error: unknown): error is AppError {
    return error instanceof AppError;
  }
  
  /**
   * Konvertiert einen beliebigen Fehler in einen AppError
   */
  static fromError(
    error: unknown, 
    defaultCode: ErrorCode = ErrorCode.UNKNOWN,
    defaultMessage: string = 'Ein unbekannter Fehler ist aufgetreten',
    options: CreateErrorOptions = {}
  ): AppError {
    if (AppError.isAppError(error)) {
      return error;
    }
    
    let message = defaultMessage;
    let code = defaultCode;
    
    if (error instanceof Error) {
      message = error.message || defaultMessage;
      options.cause = error;
    } else if (typeof error === 'string') {
      message = error;
    }
    
    return new AppError(code, message, options);
  }
  
  /**
   * Erstellt einen API-Fehler
   */
  static createApiError(
    message: string,
    code: ErrorCode = ErrorCode.API_REQUEST_FAILED,
    options: CreateErrorOptions = {}
  ): AppError {
    return new AppError(code, message, {
      context: ErrorContext.API,
      ...options
    });
  }
  
  /**
   * Erstellt einen Authentifizierungsfehler
   */
  static createAuthError(
    message: string,
    code: ErrorCode = ErrorCode.AUTH_FAILED,
    options: CreateErrorOptions = {}
  ): AppError {
    return new AppError(code, message, {
      context: ErrorContext.AUTH,
      ...options
    });
  }
  
  /**
   * Erstellt einen Validierungsfehler
   */
  static createValidationError(
    message: string,
    code: ErrorCode = ErrorCode.VALIDATION_FAILED,
    options: CreateErrorOptions = {}
  ): AppError {
    return new AppError(code, message, {
      context: ErrorContext.VALIDATION,
      severity: ErrorSeverity.WARNING,
      ...options
    });
  }
  
  /**
   * Erstellt einen Bridge-Fehler
   */
  static createBridgeError(
    message: string,
    code: ErrorCode = ErrorCode.BRIDGE_COMMUNICATION_FAILED,
    options: CreateErrorOptions = {}
  ): AppError {
    return new AppError(code, message, {
      context: ErrorContext.BRIDGE,
      ...options
    });
  }
}

/**
 * Interface für Error-Handler
 */
export interface ErrorHandler {
  /**
   * Behandelt einen Fehler
   */
  handleError(error: Error | unknown): void;
  
  /**
   * Meldet einen Fehler an Telemetrie-Services
   */
  reportError(error: Error | unknown): void;
  
  /**
   * Zeigt eine Fehlermeldung an den Benutzer an
   */
  showErrorToUser(error: Error | unknown): void;
  
  /**
   * Protokolliert einen Fehler
   */
  logError(error: Error | unknown, level?: ErrorSeverity): void;
}

/**
 * Factory-Funktion für den Error-Handler
 */
export type ErrorHandlerFactory = () => ErrorHandler;

/**
 * Interface für einen Error-Interceptor
 */
export interface ErrorInterceptor {
  /**
   * Fängt einen Fehler ab und kann ihn modifizieren oder ignorieren
   * @returns Modifizierter Fehler oder null, wenn der Fehler ignoriert werden soll
   */
  intercept(error: Error | unknown): Error | unknown | null;
}

/**
 * Interface für einen Error-Decorator
 */
export interface ErrorDecorator {
  /**
   * Dekoriert einen Fehler mit zusätzlichen Informationen
   */
  decorate(error: Error | unknown): Error | unknown;
}