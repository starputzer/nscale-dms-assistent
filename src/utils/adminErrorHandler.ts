import { useAuthStore } from "@/stores/auth";
import { AxiosError } from "axios";

interface ErrorOptions {
  /**
   * Custom error message to display instead of the default or server message
   */
  customMessage?: string;

  /**
   * Whether to attempt a token refresh for 401 errors
   * Default: true
   */
  attemptRefresh?: boolean;

  /**
   * Whether to automatically redirect to login for auth errors
   * Default: false - use an event instead
   */
  autoRedirect?: boolean;

  /**
   * Additional context to log with the error
   */
  context?: Record<string, any>;
}

/**
 * Standardisierter Error-Handler für Admin-Komponenten
 * - Verarbeitet API-Fehler einheitlich
 * - Behandelt 401/403 Auth-Fehler spezifisch
 * - Versucht Token-Refresh bei 401
 * - Gibt Event für übergeordnete Komponenten zurück
 */
export const handleAdminError = async (
  error: unknown,
  emit: any,
  options: ErrorOptions = {},
): Promise<void> => {
  const authStore = useAuthStore();
  const isAxiosError = (error as AxiosError)?.isAxiosError;
  const status = isAxiosError ? (error as AxiosError)?.response?.status : null;

  // Debug-Logausgabe
  console.group("[AdminErrorHandler]");
  console.error("Error occurred:", error);
  console.log("Status code:", status);
  console.log("Error options:", options);
  if (options.context) {
    console.log("Additional context:", options.context);
  }
  console.groupEnd();

  // Authentifizierungsfehler behandeln
  if (status === 401 || status === 403) {
    // Bei 401 Token-Refresh versuchen, wenn Option aktiviert
    if (
      status === 401 &&
      options.attemptRefresh !== false &&
      authStore.isAuthenticated
    ) {
      try {
        console.log("[AdminErrorHandler] Versuche Token-Refresh nach 401");
        const refreshed = await authStore.refreshAuthToken();

        if (refreshed) {
          console.log("[AdminErrorHandler] Token erfolgreich aktualisiert");
          // Erfolgreich - kein weiteres Event auslösen
          return;
        }
      } catch (refreshError) {
        console.error(
          "[AdminErrorHandler] Fehler beim Token-Refresh:",
          refreshError,
        );
      }
    }

    // Auth-Error-Event auslösen
    emit("auth-error", {
      ...error,
      code: status,
      message:
        options.customMessage ||
        (error as any)?.response?.data?.message ||
        (error as Error)?.message ||
        (status === 401 ? "Nicht authentifiziert" : "Zugriff verweigert"),
    });
  } else {
    // Andere Fehler (nicht Auth-bezogen)
    emit("error", {
      ...error,
      code: status || "unknown",
      message:
        options.customMessage ||
        (error as any)?.response?.data?.message ||
        (error as Error)?.message ||
        "Ein unerwarteter Fehler ist aufgetreten",
    });
  }
};

/**
 * Prüft ob der Fehler ein Authentifizierungsfehler ist (401/403)
 */
export const isAuthError = (error: unknown): boolean => {
  const isAxiosError = (error as AxiosError)?.isAxiosError;
  const status = isAxiosError ? (error as AxiosError)?.response?.status : null;
  return status === 401 || status === 403;
};
