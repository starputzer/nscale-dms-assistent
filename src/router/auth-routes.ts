/**
 * Auth Routes - Spezialisierte Router-Konfiguration für Authentifizierung
 *
 * Enthält alle Auth-bezogenen Routen mit optimierter Fehlerbehandlung und Ladestrategie.
 * Verwendet moderne Vue 3 SFC-Architektur mit Vue Router 4.
 */

import { RouteRecordRaw } from "vue-router";

// Direkter Import der kritischen Komponenten für optimiertes Laden ohne Chunks
import EnhancedLoginView from "@/views/EnhancedLoginView.vue";

// Typen für bessere Typensicherheit
export type AuthRouteNames =
  | "Login"
  | "Register"
  | "ForgotPassword"
  | "ResetPassword";

/**
 * Authentifizierungs-Routen mit optimierter Fehlerbehandlung
 * und direktem Import für kritische Komponenten
 */
export const authRoutes: RouteRecordRaw[] = [
  {
    path: "/login",
    name: "Login",
    // Direkter Komponenten-Import ohne Lazy Loading für höchste Zuverlässigkeit
    component: EnhancedLoginView,
    meta: {
      // Explizit als kritischer Pfad markieren
      isCriticalPath: true,
      // Layout ohne Auth-Anforderung
      requiresAuth: false,
      // Für Gäste zugänglich (nicht eingeloggt)
      guestOnly: true,
      // SEO-freundlicher Titel
      title: "Anmelden - nscale DMS Assistent",
      // Beschreibung für besseres SEO
      description:
        "Melden Sie sich bei nscale DMS Assistent an oder erstellen Sie ein neues Konto.",
    },
  },
  {
    path: "/register",
    name: "Register",
    component: EnhancedLoginView,
    props: { defaultActiveTab: "register" },
    meta: {
      isCriticalPath: true,
      requiresAuth: false,
      guestOnly: true,
      title: "Registrierung - nscale DMS Assistent",
      description: "Erstellen Sie ein neues Konto für nscale DMS Assistent.",
    },
  },
  {
    path: "/forgot-password",
    name: "ForgotPassword",
    component: () => import("@/views/auth/ForgotPasswordView.vue"),
    meta: {
      isCriticalPath: true,
      requiresAuth: false,
      guestOnly: true,
      title: "Passwort vergessen - nscale DMS Assistent",
      description: "Setzen Sie Ihr Passwort für nscale DMS Assistent zurück.",
    },
  },
  {
    path: "/reset-password/:token",
    name: "ResetPassword",
    component: () => import("@/views/auth/ResetPasswordView.vue"),
    props: true,
    meta: {
      isCriticalPath: true,
      requiresAuth: false,
      guestOnly: true,
      title: "Passwort zurücksetzen - nscale DMS Assistent",
      description: "Setzen Sie Ihr Passwort für nscale DMS Assistent zurück.",
    },
  },
];

/**
 * Auth-Route-Guard für Router
 * Prüft, ob Routen nur für Gäste zugänglich sein sollten
 */
export function setupAuthGuards(router: any) {
  router.beforeEach((to: any, _from: any, next: any) => {
    // Importiere auth store oder useAuthentication composable
    const auth = router.app.config.globalProperties.$auth;

    // Wenn die Route nur für Gäste ist und der Benutzer angemeldet ist
    if (to.meta.guestOnly && auth?.isAuthenticated) {
      // Zur Startseite umleiten
      return next({ name: "Home" });
    }

    // Weiter zur nächsten Route
    next();
  });
}

/**
 * Error-Handling für Auth-Routen einrichten
 */
export function setupAuthErrorHandling(router: any) {
  // Spezifischer Error-Handler für Auth-Routen
<<<<<<< HEAD
  router.onError(error: any) => {
=======
  router.onError((error: any) => {
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
    // Prüfen, ob es sich um einen Auth-Fehler handelt
    if (
      error.message?.includes("login") ||
      error.message?.includes("auth") ||
      error.message?.includes("authentication")
    ) {
      console.error("Auth route error:", error);

      // Zur Startseite umleiten mit Error-Query
      router.push({
        path: "/login",
        query: {
          error: "auth_error",
          message:
            "Ein Fehler ist bei der Anmeldung aufgetreten. Bitte versuchen Sie es erneut.",
        },
      });
    }
  });
}

export default authRoutes;
