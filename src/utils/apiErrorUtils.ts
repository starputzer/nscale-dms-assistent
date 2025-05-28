/**
 * API Error Utilities
 *
 * Hilfsfunktionen für die typsichere Handhabung von API-Fehlern im gesamten Projekt.
 */

import { APIError, APIErrorCode, StatusCode } from "./apiTypes";
import { Result, Nullable } from "./types";

/**
 * Mapping von HTTP-Statuscodes zu internen Fehlercodes
 */
const HTTP_STATUS_TO_ERROR_CODE: Record<number, APIErrorCode> = {
  [StatusCode.BAD_REQUEST]: APIErrorCode.INVALID_INPUT,
  [StatusCode.UNAUTHORIZED]: APIErrorCode.AUTHENTICATION_FAILED,
  [StatusCode.FORBIDDEN]: APIErrorCode.INSUFFICIENT_PERMISSIONS,
  [StatusCode.NOT_FOUND]: APIErrorCode.RESOURCE_NOT_FOUND,
  [StatusCode.METHOD_NOT_ALLOWED]: APIErrorCode.INVALID_INPUT,
  [StatusCode.CONFLICT]: APIErrorCode.BUSINESS_LOGIC_ERROR,
  [StatusCode.TOO_MANY_REQUESTS]: APIErrorCode.RATE_LIMIT_EXCEEDED,
  [StatusCode.INTERNAL_SERVER_ERROR]: APIErrorCode.SERVER_ERROR,
  [StatusCode.NOT_IMPLEMENTED]: APIErrorCode.SERVER_ERROR,
  [StatusCode.BAD_GATEWAY]: APIErrorCode.SERVER_ERROR,
  [StatusCode.SERVICE_UNAVAILABLE]: APIErrorCode.SERVICE_UNAVAILABLE,
  [StatusCode.GATEWAY_TIMEOUT]: APIErrorCode.TIMEOUT,
};

/**
 * Generiert einen standardisierten API-Fehler aus verschiedenen Fehlerquellen
 */
export function formatApiError(
  error: any,
  defaultMessage: string = "Ein unbekannter Fehler ist aufgetreten",
): APIError {
  // Wenn bereits ein APIError, diesen zurückgeben
  if (isAPIError(error)) {
    return error;
  }

  // Wenn AxiosError (oder ähnlich strukturierter Netzwerkfehler)
  if (error.response && error.response.status) {
    const statusCode = error.response.status;
    const responseData = error.response.data;

    // Wenn der Server bereits ein APIError-ähnliches Format zurückgibt
    if (responseData && responseData.error && responseData.error.code) {
      return {
        code: responseData.error.code,
        message: responseData.error.message || defaultMessage,
        status: statusCode,
        details: responseData.error.details || undefined,
        stack: undefined, // Entferne Stack für Sicherheit in Produktionsumgebungen
      };
    }

    // Basierend auf Statuscode einen passenden Fehlercode bestimmen
    const errorCode =
      HTTP_STATUS_TO_ERROR_CODE[statusCode] || APIErrorCode.UNKNOWN_ERROR;

    return {
      code: errorCode,
      message: responseData?.message || defaultMessage,
      status: statusCode,
      details: responseData || undefined,
    };
  }

  // Timeout-Erkennung
  if (
    error.message &&
    (error.message.includes("timeout") || error.message.includes("abort"))
  ) {
    return {
      code: APIErrorCode.TIMEOUT,
      message: "Die Anfrage wurde nach Zeitüberschreitung abgebrochen",
      status: 0,
    };
  }

  // Netzwerkfehler-Erkennung
  if (
    error.message &&
    (error.message.includes("network") ||
      error.message.includes("Network") ||
      error.message.includes("connection") ||
      error.message.includes("ERR_CONNECTION"))
  ) {
    return {
      code: APIErrorCode.NETWORK_ERROR,
      message: "Netzwerkfehler: Keine Verbindung zum Server möglich",
      status: 0,
    };
  }

  // Standard-Fehler (wenn keine spezifischen Informationen verfügbar sind)
  return {
    code: APIErrorCode.UNKNOWN_ERROR,
    message: error.message || defaultMessage,
    status: error.status || error.statusCode || 0,
    details: error.details || undefined,
  };
}

/**
 * Prüft, ob ein Wert ein APIError ist
 */
export function isAPIError(value: any): value is APIError {
  return (
    value &&
    typeof value === "object" &&
    typeof value.code === "string" &&
    typeof value.message === "string"
  );
}

/**
 * Prüft, ob ein APIError einen bestimmten Fehlercode hat
 */
export function hasErrorCode(
  error: Nullable<APIError>,
  code: APIErrorCode | string,
): boolean {
  return Boolean(error && error.code === code);
}

/**
 * Konvertiert einen beliebigen Fehler in ein typisiertes Fehlerresultat
 */
export function toErrorResult<T>(
  error: any,
  defaultMessage: string = "Ein unbekannter Fehler ist aufgetreten",
): Result<T, APIError> {
  return {
    success: false,
    error: formatApiError(error, defaultMessage),
  };
}

/**
 * Benutzerfreundliche Fehlermeldung aus APIError extrahieren
 */
export function getUserFriendlyErrorMessage(error: Nullable<APIError>): string {
  if (!error) {
    return "Ein unbekannter Fehler ist aufgetreten";
  }

  return error.message;
}

/**
 * Benutzerfreundliche Map für Statuscode zu Fehlermeldung
 */
export const HTTP_STATUS_MESSAGES: Record<number, string> = {
  [StatusCode.BAD_REQUEST]: "Die Anfrage enthielt ungültige Daten",
  [StatusCode.UNAUTHORIZED]: "Für diese Aktion ist eine Anmeldung erforderlich",
  [StatusCode.FORBIDDEN]: "Sie haben keine Berechtigung für diese Aktion",
  [StatusCode.NOT_FOUND]: "Die angeforderte Ressource wurde nicht gefunden",
  [StatusCode.METHOD_NOT_ALLOWED]: "Diese Aktion ist nicht zulässig",
  [StatusCode.CONFLICT]:
    "Die Anfrage konnte wegen eines Konflikts nicht durchgeführt werden",
  [StatusCode.TOO_MANY_REQUESTS]:
    "Zu viele Anfragen, bitte versuchen Sie es später erneut",
  [StatusCode.INTERNAL_SERVER_ERROR]: "Ein Server-Fehler ist aufgetreten",
  [StatusCode.NOT_IMPLEMENTED]:
    "Diese Funktionalität ist noch nicht implementiert",
  [StatusCode.BAD_GATEWAY]: "Verbindungsproblem zum Backend-Server",
  [StatusCode.SERVICE_UNAVAILABLE]: "Der Service ist derzeit nicht verfügbar",
  [StatusCode.GATEWAY_TIMEOUT]:
    "Zeitüberschreitung bei der Verbindung zum Server",
};

/**
 * Gibt eine benutzerfreundliche Meldung basierend auf Statuscode zurück
 */
export function getStatusCodeMessage(statusCode: number): string {
  return (
    HTTP_STATUS_MESSAGES[statusCode] || "Ein unbekannter Fehler ist aufgetreten"
  );
}

/**
 * Prüft, ob der Fehler ein Authentifizierungsfehler ist
 */
export function isAuthError(error: Nullable<APIError>): boolean {
  if (!error) return false;

  return (
    error.code === APIErrorCode.AUTHENTICATION_FAILED ||
    error.status === StatusCode.UNAUTHORIZED
  );
}

/**
 * Prüft, ob der Fehler ein Berechtigungsfehler ist
 */
export function isPermissionError(error: Nullable<APIError>): boolean {
  if (!error) return false;

  return (
    error.code === APIErrorCode.INSUFFICIENT_PERMISSIONS ||
    error.status === StatusCode.FORBIDDEN
  );
}

/**
 * Prüft, ob der Fehler ein Netzwerkfehler ist
 */
export function isNetworkError(error: Nullable<APIError>): boolean {
  if (!error) return false;

  return (
    error.code === APIErrorCode.NETWORK_ERROR ||
    error.code === APIErrorCode.TIMEOUT ||
    error.status === 0
  );
}

/**
 * Prüft, ob der Fehler ein Serverfehler ist
 */
export function isServerError(error: Nullable<APIError>): boolean {
  if (!error) return false;

  return (
    error.code === APIErrorCode.SERVER_ERROR ||
    error.code === APIErrorCode.SERVICE_UNAVAILABLE ||
    (error.status >= 500 && error.status < 600)
  );
}

/**
 * Prüft, ob der Fehler ein Validierungsfehler ist
 */
export function isValidationError(error: Nullable<APIError>): boolean {
  if (!error) return false;

  return (
    error.code === APIErrorCode.INVALID_INPUT ||
    error.code === APIErrorCode.VALIDATION_ERROR ||
    error.status === StatusCode.BAD_REQUEST
  );
}
