/**
 * Composable für Route-Fallback-System
 *
 * Behandelt fehlgeschlagene Navigationen und stellt
 * automatische Wiederherstellung bei 404-Fehlern bereit.
 */

import { ref, watch, onMounted } from "vue";
import { useRouter, useRoute, RouteLocationNormalized } from "vue-router";
import { useLogger } from "@/composables/useLogger";
import { domErrorDetector } from "@/utils/domErrorDiagnostics";

export interface RouteFallbackOptions {
  enabled?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  fallbackPath?: string;
  preserveQueryParams?: boolean;
  autoRecovery?: boolean;
}

export function useRouteFallback(options: RouteFallbackOptions = {}) {
  const {
    enabled = true,
    maxRetries = 3,
    retryDelay = 1000,
    fallbackPath = "/",
    preserveQueryParams = true,
    autoRecovery = true,
  } = options;

  const router = useRouter();
  const route = useRoute();
  const logger = useLogger();

  // State
  const isRecovering = ref(false);
  const failedNavigations = ref<Map<string, number>>(new Map());
  const lastWorkingRoute = ref<RouteLocationNormalized | null>(null);
  const navigationHistory = ref<string[]>([]);

  /**
   * Speichert eine funktionierende Route
   */
  const saveWorkingRoute = (route: RouteLocationNormalized) => {
    if (route.path !== "/error" && !route.path.includes("404")) {
      lastWorkingRoute.value = route;
      localStorage.setItem(
        "lastWorkingRoute",
        JSON.stringify({
          path: route.path,
          query: route.query,
          params: route.params,
          name: route.name,
        }),
      );
    }
  };

  /**
   * Lädt die letzte funktionierende Route
   */
  const loadLastWorkingRoute = (): RouteLocationNormalized | null => {
    try {
      const stored = localStorage.getItem("lastWorkingRoute");
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      logger.error("Fehler beim Laden der letzten Route:", error);
    }
    return null;
  };

  /**
   * Navigiert zur Fallback-Route
   */
  const navigateToFallback = async (reason: string = "unknown") => {
    if (!enabled || isRecovering.value) return;

    isRecovering.value = true;
    logger.info(`Navigiere zur Fallback-Route. Grund: ${reason}`);

    try {
      // Versuche zuerst die letzte funktionierende Route
      const lastWorking = lastWorkingRoute.value || loadLastWorkingRoute();

      if (lastWorking && lastWorking.path !== route.path) {
        try {
          await router.push({
            path: lastWorking.path,
            query: preserveQueryParams ? lastWorking.query : undefined,
          });
          logger.info(
            "Erfolgreich zur letzten funktionierenden Route navigiert",
          );
          return;
        } catch (error) {
          logger.warn("Fehler bei Navigation zur letzten Route:", error);
        }
      }

      // Fallback zur Standard-Route
      await router.push(fallbackPath);
      logger.info("Erfolgreich zur Fallback-Route navigiert");
    } catch (error) {
      logger.error("Kritischer Fehler bei Fallback-Navigation:", error);
      // Als letzter Ausweg: Hard Reload
      window.location.href = fallbackPath;
    } finally {
      isRecovering.value = false;
    }
  };

  /**
   * Behandelt 404-Fehler
   */
  const handle404Error = async () => {
    const currentPath = route.path;
    const retryCount = failedNavigations.value.get(currentPath) || 0;

    if (retryCount >= maxRetries) {
      logger.warn(`Maximale Wiederholungsversuche für ${currentPath} erreicht`);
      await navigateToFallback("max_retries_exceeded");
      return;
    }

    failedNavigations.value.set(currentPath, retryCount + 1);

    if (autoRecovery) {
      logger.info(
        `Automatische Wiederherstellung für ${currentPath} (Versuch ${retryCount + 1})`,
      );

      setTimeout(
        async () => {
          try {
            // Prüfe DOM-Status
            const diagnostics = domErrorDetector.detectErrorState();

            if (diagnostics.has404Page) {
              // Wenn immer noch 404, zur Fallback-Route
              await navigateToFallback("persistent_404");
            } else {
              // Fehler scheint behoben, Route neu laden
              await router.replace(route.fullPath);
            }
          } catch (error) {
            logger.error("Fehler bei automatischer Wiederherstellung:", error);
            await navigateToFallback("recovery_failed");
          }
        },
        retryDelay * (retryCount + 1),
      );
    }
  };

  /**
   * Überwacht Route-Änderungen
   */
  const setupRouteWatcher = () => {
    watch(
      () => route.path,
      async (newPath, oldPath) => {
        // Speichere Navigation in History
        navigationHistory.value.push(newPath);
        if (navigationHistory.value.length > 10) {
          navigationHistory.value.shift();
        }

        // Prüfe auf 404 oder Fehlerseiten
        if (route.name === "NotFound" || newPath.includes("404")) {
          await handle404Error();
        } else {
          // Erfolgreiche Navigation - speichere als funktionierende Route
          saveWorkingRoute(route);

          // Entferne aus Failed-Liste
          failedNavigations.value.delete(newPath);
        }
      },
    );
  };

  /**
   * Installiert globale Navigation Guards
   */
  const installNavigationGuards = () => {
    router.beforeEach((to, from, next) => {
      // Skip für Fehler- und Recovery-Routen
      if (to.path === "/error" || isRecovering.value) {
        return next();
      }

      // Prüfe auf bekannte fehlerhafte Routen
      const failCount = failedNavigations.value.get(to.path) || 0;
      if (failCount >= maxRetries) {
        logger.warn(
          `Route ${to.path} hat maximale Fehleranzahl erreicht, leite um`,
        );
        return next(fallbackPath);
      }

      next();
    });

    router.afterEach((to, from, failure) => {
      if (failure) {
        logger.error("Navigation fehlgeschlagen:", failure);

        // Bei bestimmten Fehlertypen sofort Fallback
        if (
          failure.type === 4 /* NAVIGATION_ABORTED */ ||
          failure.type === 16 /* NAVIGATION_DUPLICATED */
        ) {
          return;
        }

        // Sonst als fehlgeschlagene Navigation markieren
        const failCount = failedNavigations.value.get(to.path) || 0;
        failedNavigations.value.set(to.path, failCount + 1);

        // Fallback nach Verzögerung
        setTimeout(() => {
          navigateToFallback("navigation_failure");
        }, retryDelay);
      }
    });
  };

  /**
   * Setzt das Fallback-System zurück
   */
  const reset = () => {
    failedNavigations.value.clear();
    isRecovering.value = false;
    navigationHistory.value = [];
  };

  /**
   * Manueller Wiederherstellungsversuch
   */
  const attemptManualRecovery = async () => {
    logger.info("Manueller Wiederherstellungsversuch gestartet");

    // Cache leeren
    if ("caches" in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name: any) => caches.delete(name)));
        logger.info("Browser-Cache geleert");
      } catch (error) {
        logger.error("Fehler beim Cache-Leeren:", error);
      }
    }

    // Router-State zurücksetzen
    reset();

    // Zur Startseite navigieren
    await navigateToFallback("manual_recovery");
  };

  // Lifecycle
  onMounted(() => {
    if (enabled) {
      setupRouteWatcher();
      installNavigationGuards();

      // Initiale Route speichern
      if (route.path !== "/error" && !route.path.includes("404")) {
        saveWorkingRoute(route);
      }
    }
  });

  return {
    isRecovering,
    failedNavigations,
    lastWorkingRoute,
    navigationHistory,
    navigateToFallback,
    handle404Error,
    reset,
    attemptManualRecovery,
  };
}
