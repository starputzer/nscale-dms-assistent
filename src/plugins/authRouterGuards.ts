/**
 * Enhanced Auth Router Guards
 *
 * Optimierte Route Guards mit Session-Wiederherstellung und Auth-Priorisierung
 */

import {
  Router,
  NavigationGuardNext,
  RouteLocationNormalized,
} from "vue-router";
import { sessionContinuityService } from "@/services/auth/SessionContinuityService";
import { useAuthStore } from "@/stores/auth";
import { useLogger } from "@/composables/useLogger";

const logger = useLogger();

// Cache für Auth-Status um unnötige Checks zu vermeiden
let authCheckCache: {
  isAuthenticated: boolean;
  timestamp: number;
} | null = null;

const AUTH_CACHE_DURATION = 5000; // 5 Sekunden

export function setupAuthRouterGuards(router: Router): void {
  console.log("[AuthRouterGuards] Setup Auth Guards");

  /**
   * Globaler Before-Each Guard mit Session-Wiederherstellung
   */
  router.beforeEach(async (to, from, next) => {
    logger.debug(`[AuthGuard] Navigation: ${from.path} -> ${to.path}`);

    // Speichere aktuelle Route für authentifizierte Sessions
    if (
      from.path !== "/login" &&
      sessionContinuityService.getState().isAuthenticated
    ) {
      sessionContinuityService.saveCurrentRoute(from);
    }

    // Skip für öffentliche/spezielle Routen
    if (isPublicRoute(to.path)) {
      logger.debug("[AuthGuard] Öffentliche Route, überspringe Auth-Check");
      return next();
    }

    // Auth-Check mit Session-Wiederherstellung
    const authResult = await checkAuthWithSessionRecovery();

    // Route-spezifische Behandlung
    if (to.meta.requiresAuth && !authResult.isAuthenticated) {
      logger.info("[AuthGuard] Auth benötigt aber nicht authentifiziert");

      // Speichere gewünschte Route für Redirect nach Login
      const redirect = to.fullPath !== "/" ? to.fullPath : undefined;

      return next({
        path: "/login",
        query: redirect ? { redirect } : undefined,
      });
    }

    // Guest-only Routen (Login-Seite)
    if (to.meta.guest && authResult.isAuthenticated) {
      logger.info(
        "[AuthGuard] Bereits authentifiziert, Umleitung von Guest-Route",
      );

      // Versuche zur letzten authentifizierten Route zurückzukehren
      const lastRoute = sessionContinuityService.getLastAuthenticatedRoute();
      if (lastRoute && lastRoute !== to.fullPath) {
        return next(lastRoute);
      }

      return next("/chat");
    }

    // Admin-Check
    if (to.meta.adminOnly && authResult.isAuthenticated) {
      const authStore = useAuthStore();
      if (!authStore.isAdmin) {
        logger.warn("[AuthGuard] Admin-Rechte erforderlich");
        return next("/error?code=unauthorized");
      }
    }

    // Alles OK, Navigation fortsetzen
    next();
  });

  /**
   * After-Each Hook für Route-Speicherung
   */
  router.afterEach((to, from, failure) => {
    if (!failure && sessionContinuityService.getState().isAuthenticated) {
      sessionContinuityService.saveCurrentRoute(to);
    }
  });

  /**
   * Error Handler für Auth-bezogene Fehler
   */
  router.onError((error) => {
    logger.error("[AuthGuard] Router-Fehler:", error);

    // Bei Auth-Fehlern zur Login-Seite
    if (error.message?.includes("auth") || error.message?.includes("token")) {
      router.push("/login").catch(() => {
        window.location.href = "/login";
      });
    }
  });
}

/**
 * Auth-Check mit Session-Wiederherstellung
 */
async function checkAuthWithSessionRecovery(): Promise<{
  isAuthenticated: boolean;
}> {
  // Cache-Check
  if (
    authCheckCache &&
    Date.now() - authCheckCache.timestamp < AUTH_CACHE_DURATION
  ) {
    logger.debug("[AuthGuard] Verwende Auth-Cache");
    return { isAuthenticated: authCheckCache.isAuthenticated };
  }

  const authStore = useAuthStore();

  // Schneller Check wenn bereits authentifiziert
  if (authStore.isAuthenticated) {
    updateAuthCache(true);
    return { isAuthenticated: true };
  }

  // Prüfe ob Session-Wiederherstellung nötig ist
  if (sessionContinuityService.needsSessionRestoration()) {
    logger.info("[AuthGuard] Session-Wiederherstellung erforderlich");

    try {
      const restored = await sessionContinuityService.waitForSessionReady();

      if (restored) {
        logger.info("[AuthGuard] Session erfolgreich wiederhergestellt");

        // Lade Tokens in Auth Store
        const restorationResult =
          await sessionContinuityService.initializeSession();
        if (restorationResult.success && restorationResult.authData) {
          // Setze Token im Auth Store
          await authStore.setToken(restorationResult.authData.token);
        }

        updateAuthCache(true);
        return { isAuthenticated: true };
      }
    } catch (error) {
      logger.error("[AuthGuard] Fehler bei Session-Wiederherstellung:", error);
    }
  }

  updateAuthCache(false);
  return { isAuthenticated: false };
}

/**
 * Prüft ob Route öffentlich ist
 */
function isPublicRoute(path: string): boolean {
  const publicRoutes = [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/error",
    "/404",
  ];
  return publicRoutes.some((route) => path.startsWith(route));
}

/**
 * Aktualisiert Auth-Cache
 */
function updateAuthCache(isAuthenticated: boolean): void {
  authCheckCache = {
    isAuthenticated,
    timestamp: Date.now(),
  };
}

/**
 * Debug-Utilities
 */
export function getAuthGuardDebugInfo(): Record<string, any> {
  return {
    authCache: authCheckCache,
    sessionState: sessionContinuityService.getState(),
    debugInfo: sessionContinuityService.getDebugInfo(),
  };
}

// Globale Debug-Funktion für Entwicklung
if (import.meta.env.DEV) {
  (window as any).__authGuardDebug = getAuthGuardDebugInfo;
}
