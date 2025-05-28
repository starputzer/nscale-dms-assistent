/**
 * Auth Plugin - Vue Plugin für Authentifizierungs-Integration
 *
 * Stellt eine einheitliche Schnittstelle für Authentifizierung in der gesamten
 * Anwendung bereit und verbindet die Auth-Funktionalität mit Vue Router.
 */

import { Plugin, App } from "vue";
import { Router } from "vue-router";
import AuthService, { AuthError } from "@/services/auth/AuthService";
import { useAuthentication } from "@/composables/useAuthentication";
import { setupAuthGuards, setupAuthErrorHandling } from "@/router/auth-routes";

// Interface für globale Properties in Vue Instance
declare module "@vue/runtime-core" {
  interface ComponentCustomProperties {
    $auth: ReturnType<typeof useAuthentication>;
  }
}

/**
 * Optionen für das Auth-Plugin
 */
export interface AuthPluginOptions {
  router?: Router;
  autoLogout?: boolean;
  sessionTimeout?: number; // in Millisekunden
  refreshInterval?: number; // in Millisekunden
  enableErrorReporting?: boolean;
}

/**
 * Auth-Plugin für Vue.js
 *
 * @param app - Vue Anwendungsinstanz
 * @param options - Konfigurationsoptionen für das Plugin
 */
const AuthPlugin: Plugin = {
  install(app: App, options: AuthPluginOptions = {}) {
    const router = options.router;

    // Standardwerte für Optionen
    const autoLogout = options.autoLogout ?? true;
    const sessionTimeout = options.sessionTimeout ?? 30 * 60 * 1000; // 30 Minuten
    const refreshInterval = options.refreshInterval ?? 15 * 60 * 1000; // 15 Minuten

    // Global verfügbares Authentication Composable erstellen
    const authentication = useAuthentication();

    // Als globale Property registrieren
    app.config.globalProperties.$auth = authentication;

    // Auth-Funktionalität mit Router verbinden, wenn vorhanden
    if (router) {
      // Auth Guards einrichten
      setupAuthGuards(router);

      // Auth Error Handling einrichten
      setupAuthErrorHandling(router);

      // Nach jeder Navigation Session validieren, falls nötig
      router.afterEach(async () => {
        // Nur validieren, wenn Benutzer angemeldet ist
        if (authentication.isAuthenticated.value) {
          try {
            // Session validieren ohne zusätzliche UI-Aktualisierungen
            await authentication.validateSession();
          } catch (error) {
            console.warn("Session validation error after navigation:", error);
          }
        }
      });

      // Globaler Error-Handler für Auth-Fehler
      app.config.errorHandler = (err, vm, info) => {
        // Spezifische Behandlung für Auth-Fehler
        if (err instanceof AuthError) {
          console.error("Auth error in Vue component:", err);

          // Bei Token-Fehlern oder abgelaufenen Token ausloggen
          if (
            err.type === "token_expired" ||
            err.type === "token_invalid" ||
            err.type === "account_locked"
          ) {
            // Benutzer ausloggen und zur Login-Seite umleiten
            authentication.clearSession();
            router.push({
              name: "Login",
              query: {
                error: err.type,
                message: err.message,
              },
            });
          }
        } else {
          // Standard-Fehlerbehandlung
          console.error("Vue error:", err, info);
        }
      };
    }

    // Auto-Refresh für Token einrichten, wenn aktiviert
    if (refreshInterval > 0) {
      // Token-Refresh in regelmäßigen Abständen
      setInterval(async () => {
        if (authentication.isAuthenticated.value) {
          try {
            await authentication.refreshSession();
          } catch (error) {
            console.warn("Auto token refresh failed:", error);
          }
        }
      }, refreshInterval);
    }

    // Auto-Logout nach Inaktivität einrichten, wenn aktiviert
    if (autoLogout && sessionTimeout > 0) {
      let inactivityTimer: number | null = null;

      // Timer zurücksetzen bei Benutzeraktivität
      const resetTimer = () => {
        if (inactivityTimer) {
          window.clearTimeout(inactivityTimer);
        }

        // Nur Timer setzen, wenn Benutzer angemeldet ist
        if (authentication.isAuthenticated.value) {
          inactivityTimer = window.setTimeout(() => {
            console.log("Session timeout due to inactivity");
            authentication.logout();
          }, sessionTimeout);
        }
      };

      // Event-Listener für Benutzeraktivität
      window.addEventListener("mousemove", resetTimer);
      window.addEventListener("keydown", resetTimer);
      window.addEventListener("click", resetTimer);
      window.addEventListener("touchstart", resetTimer);

      // Initialen Timer setzen
      resetTimer();
    }

    // Debug-Hilfen
    if (import.meta.env.DEV) {
      console.log("Auth plugin initialized with options:", options);

      // Globale Hilfsfunktionen für die Entwicklung
      window.__auth = {
        getAuthState: () => ({
          authenticated: authentication.isAuthenticated.value,
          user: authentication.user.value,
          token: AuthService.getToken(),
        }),
        clearAuth: () => {
          authentication.clearSession();
          console.log("Auth state cleared");
        },
        forceValidate: async () => {
          const result = await authentication.validateSession();
          console.log("Session validation result:", result);
          return result;
        },
      };
    }
  },
};

export default AuthPlugin;
