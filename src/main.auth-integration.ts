/**
 * Auth-Integration für main.ts
 *
 * Diese Anweisungen sollten in die main.ts Datei integriert werden, um die
 * neuen Auth-Komponenten und Services zu aktivieren.
 */

// Importiere Auth-Plugin und AuthService
import AuthPlugin from "@/plugins/auth";
import AuthService from "@/services/auth/AuthService";


/**
 * Auth-Integration in main.ts
 *
 * 1. Füge diese Importe zur main.ts hinzu:
 *    import AuthPlugin from '@/plugins/auth'

 *
 * 2. Füge die Auth-Routen zum Router hinzu:
 *    // Im router/index.ts nach den bestehenden Routen
 *    ...authRoutes,
 *
 * 3. Registriere das Auth-Plugin direkt vor der App-Montierung:
 */

// Auth-Plugin mit Router registrieren
app.use(AuthPlugin, {
  router,
  autoLogout: true,
  sessionTimeout: 30 * 60 * 1000, // 30 Minuten
  refreshInterval: 15 * 60 * 1000, // 15 Minuten
  enableErrorReporting: true,
});

/**
 * 4. Globaler Error-Handler mit Auth-Fehlerbehandlung
 *    Ersetze den bestehenden app.config.errorHandler mit:
 */
app.config.errorHandler = (err: Error | unknown, vm: any, info: string) => {
  console.error("Vue error:", err, info);

  // Typ-Prüfung für Auth-Fehler
  if (err && typeof err === "object" && "type" in err) {
    const authErr = err as any;
    if (
      authErr.type &&
      ["token_expired", "token_invalid", "account_locked"].includes(
        authErr.type,
      )
    ) {
      console.warn("Auth error detected, redirecting to login", authErr);

      // Zur Login-Seite umleiten
      router.push({
        name: "Login",
        query: {
          error: authErr.type,
          message: authErr.message || "Authentifizierungsfehler",
        },
      });
      return;
    }
  }

  // Fehler an Fehlerberichtssystem senden
  if (errorReporting) {
    try {
      errorReporting.captureError(
        err instanceof Error ? err : new Error(String(err)),
        {
          source: {
            type: "component",
            name: vm?.$options?.name || "unknown",
          },
          context: { info },
        },
      );
    } catch (reportError) {
      console.error("Error reporting failed:", reportError);
    }
  }

  // Telemetrie für Fehler
  if (window.telemetry) {
    try {
      window.telemetry.trackError(
        err instanceof Error ? err : new Error(String(err)),
        { component: vm?.$options?.name || "unknown", info },
      );
    } catch (telemetryError) {
      console.error("Telemetry error tracking failed:", telemetryError);
    }
  }
};

/**
 * 5. Auth-Status prüfen beim App-Start
 *    Nach der App-Montierung hinzufügen:
 */
// Auth-Status prüfen beim App-Start
if (AuthService.isAuthenticated()) {
  console.log("User is authenticated, validating session...");

  // Initial session validation
  AuthService.validateToken()
    .then((isValid: boolean) => {
      console.log("Session validation result:", isValid);

      if (!isValid) {
        console.warn("Session is invalid, redirecting to login");

        // Zur Login-Seite umleiten
        router.push({
          name: "Login",
          query: { error: "session_expired" },
        });
      }
    })
    .catch(error: Error) => {
      console.error("Session validation error:", error);
    });
}
