/**
 * Utility zur Klassifizierung von Fehlern basierend auf Fehlertyp, Nachricht, Stack und Kontext
 */

// Fehler-Kategorien
type ErrorCategory =
  | "network"
  | "resource"
  | "validation"
  | "permission"
  | "unknown";

/**
 * ErrorClassifier analysiert Fehler und kategorisiert sie für bessere Fehlerbehandlung
 */
class ErrorClassifier {
  /**
   * Kategorisiert einen Fehler in verschiedene Typen
   * @param error - Der zu analysierende Fehler
   * @returns Die ermittelte Fehlerkategorie
   */
  public static categorizeError(error: Error): ErrorCategory {
    // Error ist null oder undefined
    if (!error) return "unknown";

    // Analysiere den Nachrichtentext und Stack
    const message = error.message?.toLowerCase() || "";
    const stack = error.stack?.toLowerCase() || "";
    const name = error.name?.toLowerCase() || "";

    // Netzwerk-bezogene Fehler
    if (this.isNetworkError(error, message, stack, name)) {
      return "network";
    }

    // Ressourcen-bezogene Fehler (Speicher, CPU)
    if (this.isResourceError(error, message, stack, name)) {
      return "resource";
    }

    // Validierungs- und Eingabefehler
    if (this.isValidationError(error, message, stack, name)) {
      return "validation";
    }

    // Berechtigungsfehler
    if (this.isPermissionError(error, message, stack, name)) {
      return "permission";
    }

    // Fallback für unbekannte Fehler
    return "unknown";
  }

  /**
   * Prüft, ob ein Fehler netzwerkbezogen ist
   */
  private static isNetworkError(
    error: Error,
    message: string,
    stack: string,
    name: string,
  ): boolean {
    // Typische Netzwerkfehler
    const networkErrorPatterns = [
      "network",
      "connection",
      "offline",
      "timeout",
      "fetch",
      "xhr",
      "http",
      "api",
      "socket",
      "cors",
      "aborted",
      "net::err",
      "failed to fetch",
      "network error",
    ];

    // Typische HTTP-Statuscodes
    const statusCodePattern = /\b(4[0-9]{2}|5[0-9]{2})\b/;

    // Spezifische Fehlertypen
    if (
      error instanceof TypeError &&
      (message.includes("fetch") || message.includes("network"))
    ) {
      return true;
    }

    if (name === "networkerror" || name === "fetcherror") {
      return true;
    }

    // Überprüfe Nachricht und Stack auf Netzwerkmuster
    return (
      networkErrorPatterns.some((pattern) => message.includes(pattern)) ||
      networkErrorPatterns.some((pattern) => stack.includes(pattern)) ||
      statusCodePattern.test(message) ||
      message.includes("timeout")
    );
  }

  /**
   * Prüft, ob ein Fehler ressourcenbezogen ist (Speicher, CPU)
   */
  private static isResourceError(
    error: Error,
    message: string,
    stack: string,
    name: string,
  ): boolean {
    // Typische Ressourcenfehler
    const resourceErrorPatterns = [
      "memory",
      "allocation",
      "heap",
      "stack",
      "overflow",
      "out of memory",
      "oom",
      "quota",
      "performance",
      "slow",
      "timeout",
      "exceeded",
      "throttle",
      "limit",
    ];

    // Browserumgebung: Speicherfehler haben oft spezifische Namen
    if (
      name === "rangeerror" ||
      name === "quotaexceedederror" ||
      name === "outofmemoryerror"
    ) {
      return true;
    }

    // Überprüfe Nachricht und Stack auf Ressourcenmuster
    return (
      resourceErrorPatterns.some((pattern) => message.includes(pattern)) ||
      message.includes("too much recursion") ||
      message.includes("maximum call stack") ||
      message.includes("script timeout")
    );
  }

  /**
   * Prüft, ob ein Fehler validierungsbezogen ist
   */
  private static isValidationError(
    error: Error,
    message: string,
    stack: string,
    name: string,
  ): boolean {
    // Typische Validierungsfehler
    const validationErrorPatterns = [
      "invalid",
      "validation",
      "constraint",
      "required",
      "missing",
      "not found",
      "format",
      "unexpected",
      "type",
      "syntax",
      "malformed",
      "schema",
    ];

    // Spezifische Fehlertypen
    if (
      name === "typeerror" ||
      name === "syntaxerror" ||
      name === "validationerror" ||
      name === "rangeerror"
    ) {
      return true;
    }

    // Überprüfe Nachricht auf Validierungsmuster
    return validationErrorPatterns.some((pattern) => message.includes(pattern));
  }

  /**
   * Prüft, ob ein Fehler berechtigungsbezogen ist
   */
  private static isPermissionError(
    error: Error,
    message: string,
    stack: string,
    name: string,
  ): boolean {
    // Typische Berechtigungsfehler
    const permissionErrorPatterns = [
      "permission",
      "denied",
      "unauthorized",
      "forbidden",
      "access",
      "token",
      "auth",
      "credential",
      "login",
      "privilege",
      "role",
      "session expired",
    ];

    // Spezifische Statuscodes oder Fehlertypen
    if (message.includes("401") || message.includes("403")) {
      return true;
    }

    if (name === "permissionerror" || name === "unauthorizederror") {
      return true;
    }

    // Überprüfe Nachricht auf Berechtigungsmuster
    return permissionErrorPatterns.some((pattern) => message.includes(pattern));
  }
}

export default ErrorClassifier;
