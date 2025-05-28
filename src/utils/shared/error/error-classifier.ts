/**
 * Error Classification Utilities
 *
 * This module provides error handling utilities that are used in both
 * Vue 3 SFC and Vanilla JS implementations.
 */

/**
 * Error types for classification
 */
export enum ErrorType {
  NETWORK = "network",
  AUTHENTICATION = "authentication",
  AUTHORIZATION = "authorization",
  VALIDATION = "validation",
  SERVER = "server",
  CLIENT = "client",
  TIMEOUT = "timeout",
  UNKNOWN = "unknown",
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  CRITICAL = "critical",
  ERROR = "error",
  WARNING = "warning",
  INFO = "info",
}

/**
 * Error details interface
 */
export interface ErrorDetails {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  originalError?: any;
  code?: string;
  details?: any;
  timestamp: number;
}

/**
 * Classifies an error based on its properties
 * @param {any} error - The error to classify
 * @returns {ErrorDetails} The classified error details
 */
export function classifyError(error: any): ErrorDetails {
  // Default error details
  const errorDetails: ErrorDetails = {
    type: ErrorType.UNKNOWN,
    severity: ErrorSeverity.ERROR,
    message: "An unknown error occurred",
    originalError: error,
    timestamp: Date.now(),
  };

  // No error provided
  if (!error) {
    return errorDetails;
  }

  // Extract message
  errorDetails.message = error.message || errorDetails.message;

  // Axios error
  if (error.isAxiosError) {
    // Network error
    if (error.code === "ECONNABORTED" || !error.response) {
      errorDetails.type = ErrorType.NETWORK;
      errorDetails.severity = ErrorSeverity.ERROR;
      errorDetails.message = "Network error: Could not connect to the server";
      return errorDetails;
    }

    // Extract status code and error details
    const status = error.response?.status;
    errorDetails.code = status?.toString();
    errorDetails.details = error.response?.data;

    // Classify based on status code
    if (status === 401) {
      errorDetails.type = ErrorType.AUTHENTICATION;
      errorDetails.severity = ErrorSeverity.ERROR;
      errorDetails.message = "Authentication error: Please log in again";
    } else if (status === 403) {
      errorDetails.type = ErrorType.AUTHORIZATION;
      errorDetails.severity = ErrorSeverity.ERROR;
      errorDetails.message =
        "Authorization error: You do not have permission to perform this action";
    } else if (status === 400 || status === 422) {
      errorDetails.type = ErrorType.VALIDATION;
      errorDetails.severity = ErrorSeverity.WARNING;
      errorDetails.message =
        error.response?.data?.message ||
        "Validation error: Please check your input";
    } else if (status >= 500) {
      errorDetails.type = ErrorType.SERVER;
      errorDetails.severity = ErrorSeverity.CRITICAL;
      errorDetails.message = "Server error: Please try again later";
    } else {
      errorDetails.type = ErrorType.CLIENT;
      errorDetails.severity = ErrorSeverity.ERROR;
      errorDetails.message =
        error.response?.data?.message ||
        "Client error: An unexpected error occurred";
    }

    return errorDetails;
  }

  // Timeout error
  if (error.name === "TimeoutError" || error.message?.includes("timeout")) {
    errorDetails.type = ErrorType.TIMEOUT;
    errorDetails.severity = ErrorSeverity.ERROR;
    errorDetails.message =
      "Request timed out: The server took too long to respond";
    return errorDetails;
  }

  // Auth-related errors
  if (error.name === "AuthError" || error.message?.includes("auth")) {
    errorDetails.type = ErrorType.AUTHENTICATION;
    errorDetails.severity = ErrorSeverity.ERROR;
    return errorDetails;
  }

  // Return the classified error
  return errorDetails;
}

/**
 * Gets a user-friendly error message based on the error details
 * @param {ErrorDetails} errorDetails - The classified error details
 * @returns {string} A user-friendly error message
 */
export function getUserFriendlyMessage(errorDetails: ErrorDetails): string {
  switch (errorDetails.type) {
    case ErrorType.NETWORK:
      return "Es konnte keine Verbindung zum Server hergestellt werden. Bitte überprüfen Sie Ihre Internetverbindung.";

    case ErrorType.AUTHENTICATION:
      return "Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.";

    case ErrorType.AUTHORIZATION:
      return "Sie haben keine Berechtigung, diese Aktion durchzuführen.";

    case ErrorType.VALIDATION:
      return "Die eingegebenen Daten sind ungültig. Bitte überprüfen Sie Ihre Eingaben.";

    case ErrorType.SERVER:
      return "Ein Serverfehler ist aufgetreten. Bitte versuchen Sie es später erneut.";

    case ErrorType.TIMEOUT:
      return "Die Anfrage hat zu lange gedauert. Bitte versuchen Sie es später erneut.";

    case ErrorType.CLIENT:
      return "Ein Fehler ist aufgetreten. Bitte laden Sie die Seite neu.";

    default:
      return "Ein unbekannter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.";
  }
}

/**
 * Bundle all error utilities into a single object for backwards compatibility
 */
export const ErrorClassifier = {
  classifyError,
  getUserFriendlyMessage,
  ErrorType,
  ErrorSeverity,
};

export default ErrorClassifier;
