/**
 * Bridge Error Utilities
 *
 * Standardisierte Fehlerbehandlung und Ergebnistypen für Bridge-Komponenten.
 * Implementiert ein einheitliches Result<T, E>-Pattern zur typisierten Fehlerbehandlung
 * bei Bridge-Operationen.
 */

import { Result } from "@/utils/types";
import { createLogger } from "./logger/index";

const logger = createLogger("BridgeErrorUtils");

/**
 * Bridge-spezifische Fehlercodes für detaillierte Fehlerbehandlung
 */
export enum BridgeErrorCode {
  // Allgemeine Fehlercodes
  UNKNOWN_ERROR = "BRIDGE_UNKNOWN_ERROR",
  INITIALIZATION_FAILED = "BRIDGE_INITIALIZATION_FAILED",
  COMMUNICATION_ERROR = "BRIDGE_COMMUNICATION_ERROR",
  STATE_SYNC_ERROR = "BRIDGE_STATE_SYNC_ERROR",
  TIMEOUT = "BRIDGE_TIMEOUT",

  // Komponentenspezifische Fehlercodes
  EVENT_EMISSION_ERROR = "BRIDGE_EVENT_EMISSION_ERROR",
  EVENT_HANDLING_ERROR = "BRIDGE_EVENT_HANDLING_ERROR",
  MEMORY_MANAGEMENT_ERROR = "BRIDGE_MEMORY_MANAGEMENT_ERROR",
  LISTENER_MANAGEMENT_ERROR = "BRIDGE_LISTENER_MANAGEMENT_ERROR",

  // Statusbezogene Fehlercodes
  COMPONENT_INACTIVE = "BRIDGE_COMPONENT_INACTIVE",
  COMPONENT_BUSY = "BRIDGE_COMPONENT_BUSY",
  INVALID_STATE = "BRIDGE_INVALID_STATE",

  // Legacy-Integration Fehlercodes
  LEGACY_INTEGRATION_ERROR = "BRIDGE_LEGACY_INTEGRATION_ERROR",
  LEGACY_METHOD_UNAVAILABLE = "BRIDGE_LEGACY_METHOD_UNAVAILABLE",
  LEGACY_STATE_INCOMPATIBLE = "BRIDGE_LEGACY_STATE_INCOMPATIBLE",

  // Selbstheilungsfehlercodes
  RECOVERY_FAILED = "BRIDGE_RECOVERY_FAILED",
  RETRY_LIMIT_EXCEEDED = "BRIDGE_RETRY_LIMIT_EXCEEDED",
}

/**
 * Strukturierte Fehlerinformationen für Bridge-Komponenten
 */
export interface BridgeError {
  code: BridgeErrorCode;
  message: string;
  component?: string;
  operation?: string;
  details?: unknown;
  originalError?: unknown;
  recoverable: boolean;
  timestamp: number;
}

/**
 * Typisiertes Ergebnis für Bridge-Operationen
 */
export type BridgeResult<T> = Result<T, BridgeError>;

/**
 * Erzeugt einen standardisierten Bridge-Fehler
 */
export function createBridgeError(
  code: BridgeErrorCode,
  message: string,
  options?: {
    component?: string;
    operation?: string;
    details?: unknown;
    originalError?: unknown;
    recoverable?: boolean;
  },
): BridgeError {
  const error: BridgeError = {
    code,
    message,
    component: options?.component,
    operation: options?.operation,
    details: options?.details,
    originalError: options?.originalError,
    recoverable: options?.recoverable ?? true,
    timestamp: Date.now(),
  };

  // Fehler loggen (wenn nicht in einer Recovery-Operation)
  if (code !== BridgeErrorCode.RECOVERY_FAILED) {
    const errorDetails = {
      component: error.component,
      operation: error.operation,
      details: error.details,
      originalError: error.originalError,
    };
    logger.error(
      `Bridge error [${error.code}]: ${error.message}`,
      errorDetails,
    );
  }

  return error;
}

/**
 * Erzeugt ein erfolgreiches Ergebnis
 */
export function success<T>(data: T): BridgeResult<T> {
  return {
    success: true,
    data,
  };
}

/**
 * Erzeugt ein fehlgeschlagenes Ergebnis
 */
export function failure<T>(
  code: BridgeErrorCode,
  message: string,
  options?: {
    component?: string;
    operation?: string;
    details?: unknown;
    originalError?: unknown;
    recoverable?: boolean;
  },
): BridgeResult<T> {
  return {
    success: false,
    error: createBridgeError(code, message, options),
  };
}

/**
 * Hilfsfunktion für typsichere Konvertierung beliebiger Fehler in BridgeError
 */
export function toBridgeError(
  error: unknown,
  defaultCode: BridgeErrorCode = BridgeErrorCode.UNKNOWN_ERROR,
  defaultMessage: string = "Ein unbekannter Bridge-Fehler ist aufgetreten",
  options?: {
    component?: string;
    operation?: string;
    recoverable?: boolean;
  },
): BridgeError {
  // Wenn bereits ein BridgeError, diesen zurückgeben
  if (isBridgeError(error)) {
    return error;
  }

  // Wenn Error-Objekt, dessen Informationen extrahieren
  if (error instanceof Error) {
    return createBridgeError(defaultCode, error.message || defaultMessage, {
      ...options,
      originalError: error,
      details: { stack: error.stack },
    });
  }

  // Bei anderen Fehlertypen
  return createBridgeError(
    defaultCode,
    typeof error === "string" ? error : defaultMessage,
    {
      ...options,
      originalError: error,
    },
  );
}

/**
 * Type Guard für BridgeError
 */
export function isBridgeError(value: unknown): value is BridgeError {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    "message" in value &&
    "recoverable" in value &&
    "timestamp" in value
  );
}

/**
 * Ausführen einer Operation mit standardisierter Fehlerbehandlung
 */
export async function executeBridgeOperation<T>(
  operation: () => Promise<T> | T,
  options: {
    component: string;
    operationName: string;
    errorMessage?: string;
    errorCode?: BridgeErrorCode;
    recoverable?: boolean;
  },
): Promise<BridgeResult<T>> {
  try {
    const result = await operation();
    return success(result);
  } catch (error) {
    return failure<T>(
      options.errorCode || BridgeErrorCode.UNKNOWN_ERROR,
      options.errorMessage || `Fehler bei Operation ${options.operationName}`,
      {
        component: options.component,
        operation: options.operationName,
        originalError: error,
        recoverable: options.recoverable,
      },
    );
  }
}

/**
 * Hilfsfunktion zum Extrahieren von Daten oder Fehlern aus einem BridgeResult
 */
export function unwrapResult<T>(result: BridgeResult<T>): T {
  if (result.success) {
    return result.data;
  }

  // Im Fehlerfall eine informative Fehlermeldung werfen
  const { code, message, component, operation } = result.error;
  const errorInfo = [
    message,
    component ? `Komponente: ${component}` : "",
    operation ? `Operation: ${operation}` : "",
    `Code: ${code}`,
  ]
    .filter(Boolean)
    .join(" | ");

  throw new Error(errorInfo);
}

/**
 * Prüft, ob ein BridgeError einen bestimmten Fehlercode hat
 */
export function hasErrorCode(
  error: BridgeError | null | undefined,
  code: BridgeErrorCode,
): boolean {
  return Boolean(error && error.code === code);
}

/**
 * Hilfsfunktion, um zu prüfen, ob ein Fehler behoben werden kann
 */
export function isRecoverable(error: BridgeError | null | undefined): boolean {
  return Boolean(error && error.recoverable);
}

/**
 * Fügt einem BridgeResult einen Wiederherstellungsmechanismus hinzu
 */
export function withRecovery<T>(
  result: BridgeResult<T>,
  recoveryFn: () => Promise<BridgeResult<T>> | BridgeResult<T>,
): Promise<BridgeResult<T>> {
  if (result.success || !isRecoverable(result.error)) {
    return Promise.resolve(result);
  }

  return Promise.resolve(recoveryFn()).catch((recoveryError) => {
    // Wenn die Wiederherstellung fehlschlägt, original Fehler mit zusätzlichen Informationen zurückgeben
    const originalError = result.error;
    return {
      success: false,
      error: createBridgeError(
        BridgeErrorCode.RECOVERY_FAILED,
        `Wiederherstellung fehlgeschlagen: ${originalError.message}`,
        {
          component: originalError.component,
          operation: originalError.operation,
          details: {
            originalErrorCode: originalError.code,
            recoveryError,
          },
          originalError: recoveryError,
          recoverable: false,
        },
      ),
    };
  });
}

/**
 * Benutzerfreundliche Fehlermeldung aus BridgeError extrahieren
 */
export function getUserFriendlyErrorMessage(
  error: BridgeError | null | undefined,
): string {
  if (!error) {
    return "Ein unbekannter Fehler ist aufgetreten";
  }

  // Benutzerfreundliche Nachrichten für häufige Fehlercodes
  const friendlyMessages: Record<BridgeErrorCode, string> = {
    [BridgeErrorCode.UNKNOWN_ERROR]: "Ein unbekannter Fehler ist aufgetreten",
    [BridgeErrorCode.INITIALIZATION_FAILED]:
      "Die Initialisierung der Bridge konnte nicht abgeschlossen werden",
    [BridgeErrorCode.COMMUNICATION_ERROR]:
      "Kommunikationsfehler zwischen Komponenten",
    [BridgeErrorCode.STATE_SYNC_ERROR]:
      "Fehler bei der Synchronisation von Statusdaten",
    [BridgeErrorCode.TIMEOUT]: "Zeitüberschreitung bei einer Bridge-Operation",
    [BridgeErrorCode.EVENT_EMISSION_ERROR]: "Fehler beim Senden eines Events",
    [BridgeErrorCode.EVENT_HANDLING_ERROR]:
      "Fehler bei der Verarbeitung eines Events",
    [BridgeErrorCode.MEMORY_MANAGEMENT_ERROR]:
      "Fehler bei der Speicherverwaltung",
    [BridgeErrorCode.LISTENER_MANAGEMENT_ERROR]:
      "Fehler bei der Verwaltung von Event-Listenern",
    [BridgeErrorCode.COMPONENT_INACTIVE]:
      "Die Komponente ist derzeit nicht aktiv",
    [BridgeErrorCode.COMPONENT_BUSY]: "Die Komponente ist derzeit ausgelastet",
    [BridgeErrorCode.INVALID_STATE]: "Ungültiger Zustand für diese Operation",
    [BridgeErrorCode.LEGACY_INTEGRATION_ERROR]:
      "Fehler bei der Integration mit Legacy-Komponenten",
    [BridgeErrorCode.LEGACY_METHOD_UNAVAILABLE]:
      "Eine erforderliche Legacy-Methode ist nicht verfügbar",
    [BridgeErrorCode.LEGACY_STATE_INCOMPATIBLE]:
      "Inkompatible Legacy-Zustandsdaten",
    [BridgeErrorCode.RECOVERY_FAILED]:
      "Wiederherstellung nach einem Fehler fehlgeschlagen",
    [BridgeErrorCode.RETRY_LIMIT_EXCEEDED]:
      "Maximale Anzahl an Wiederholungsversuchen überschritten",
  };

  return friendlyMessages[error.code] || error.message;
}
