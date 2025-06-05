/**
 * Enhanced Route Fallback Composable
 *
 * Bietet robuste Fehlerbehandlung und Fallback-Mechanismen für Router-Operationen
 */

import { ref, watch, onMounted, onBeforeUnmount } from "vue";
import { useRouter, useRoute, RouteLocationNormalized } from "vue-router";
import { useLogger } from "@/composables/useLogger";
import { routerService } from "@/services/router/RouterServiceFixed";
// import { domErrorDetector } from '@/utils/domErrorDiagnostics'; // DEAKTIVIERT wegen Endlosschleife

export interface EnhancedRouteFallbackOptions {
  enabled?: boolean;
  maxConsecutiveFailures?: number;
  errorDetectionInterval?: number;
  autoRepairEnabled?: boolean;
  debugMode?: boolean;
}

export interface RouteHealthStatus {
  healthy: boolean;
  consecutiveFailures: number;
  lastError?: Error;
  lastSuccessfulNavigation?: Date;
  repairAttempts: number;
}

export function useEnhancedRouteFallback(
  options: EnhancedRouteFallbackOptions = {},
) {
  const {
    enabled = true,
    maxConsecutiveFailures = 3,
    errorDetectionInterval = 2000,
    autoRepairEnabled = true,
    debugMode = import.meta.env.DEV,
  } = options;

  const router = useRouter();
  const route = useRoute();
  const logger = useLogger();

  // State
  const isMonitoring = ref(false);
  const routeHealth = ref<RouteHealthStatus>({
    healthy: true,
    consecutiveFailures: 0,
    repairAttempts: 0,
  });
  const monitoringInterval = ref<number | null>(null);
  const navigationQueue = ref<Array<() => Promise<void>>>([]);

  /**
   * Initialisiert das Fallback-System
   */
  const initialize = async () => {
    if (!enabled) return;

    logger.info("Enhanced Route Fallback: Initialisierung");

    // Router Service initialisieren
    try {
      routerService.setRouter(router);
      logger.info("Router Service initialisiert");
    } catch (error) {
      logger.error("Router Service konnte nicht initialisiert werden", error);
      return;
    }

    // Überwachung starten
    startMonitoring();
    setupWatchers();
    setupErrorHandlers();
  };

  /**
   * Startet die Route-Überwachung
   */
  const startMonitoring = () => {
    if (isMonitoring.value) return;

    isMonitoring.value = true;
    logger.info("Route-Überwachung gestartet");

    monitoringInterval.value = window.setInterval(() => {
      checkRouteHealth();
    }, errorDetectionInterval);
  };

  /**
   * Stoppt die Route-Überwachung
   */
  const stopMonitoring = () => {
    if (!isMonitoring.value) return;

    isMonitoring.value = false;

    if (monitoringInterval.value) {
      clearInterval(monitoringInterval.value);
      monitoringInterval.value = null;
    }

    logger.info("Route-Überwachung gestoppt");
  };

  /**
   * Prüft die Gesundheit der aktuellen Route
   */
  const checkRouteHealth = async () => {
    try {
      // Prüfe DOM auf Fehler - DEAKTIVIERT wegen Endlosschleife
      // const domDiagnostics = domErrorDetector.detectErrorState();

      // if (domDiagnostics.has404Page || domDiagnostics.hasErrorScreen) {
      //   handleRouteError(new Error(`DOM-Fehler erkannt: ${domDiagnostics.errorType}`));
      //   return;
      // }

      // Prüfe Router-Zustand
      const currentRoute = routerService.currentRoute();

      if (!currentRoute) {
        handleRouteError(new Error("Keine aktuelle Route verfügbar"));
        return;
      }

      // Route ist gesund
      if (!routeHealth.value.healthy) {
        logger.info("Route wiederhergestellt");
        routeHealth.value = {
          healthy: true,
          consecutiveFailures: 0,
          lastSuccessfulNavigation: new Date(),
          repairAttempts: 0,
        };
      }
    } catch (error) {
      handleRouteError(error as Error);
    }
  };

  /**
   * Behandelt Route-Fehler
   */
  const handleRouteError = async (error: Error) => {
    logger.error("Route-Fehler erkannt", error);

    routeHealth.value.consecutiveFailures++;
    routeHealth.value.lastError = error;
    routeHealth.value.healthy = false;

    // Prüfe auf kritische Fehleranzahl
    if (routeHealth.value.consecutiveFailures >= maxConsecutiveFailures) {
      logger.warn("Kritische Anzahl von Route-Fehlern erreicht");

      if (autoRepairEnabled) {
        await attemptAutoRepair();
      } else {
        await navigateToFallback("Kritische Fehleranzahl");
      }
    }
  };

  /**
   * Versucht automatische Reparatur
   */
  const attemptAutoRepair = async () => {
    routeHealth.value.repairAttempts++;
    logger.info(`Auto-Reparatur Versuch ${routeHealth.value.repairAttempts}`);

    try {
      // Strategie 1: DOM-Bereinigung
      if (routeHealth.value.repairAttempts === 1) {
        await cleanupDom();
      }

      // Strategie 2: Router-Reset
      if (routeHealth.value.repairAttempts === 2) {
        await resetRouter();
      }

      // Strategie 3: Cache-Bereinigung
      if (routeHealth.value.repairAttempts === 3) {
        await clearCaches();
      }

      // Strategie 4: Fallback
      if (routeHealth.value.repairAttempts > 3) {
        await navigateToFallback("Auto-Reparatur fehlgeschlagen");
      }

      // Erneute Prüfung nach Reparatur
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await checkRouteHealth();
    } catch (error) {
      logger.error("Auto-Reparatur fehlgeschlagen", error);
      await navigateToFallback("Reparatur-Fehler");
    }
  };

  /**
   * DOM-Bereinigung
   */
  const cleanupDom = async () => {
    logger.info("DOM-Bereinigung...");

    // Entferne Fehlerbildschirme
    const errorElements = document.querySelectorAll(
      ".error-view, .error-404, .critical-error",
    );
    errorElements.forEach((el: any) => el.remove());

    // Stelle App-Container sicher
    const appElement = document.querySelector("#app");
    if (appElement) {
      (appElement as HTMLElement).style.display = "block";
      (appElement as HTMLElement).style.visibility = "visible";
    }
  };

  /**
   * Router-Reset
   */
  const resetRouter = async () => {
    logger.info("Router-Reset...");

    try {
      // Navigiere zur aktuellen Route neu
      const currentPath = route.fullPath;
      await router.replace({ path: "/redirect" });
      await new Promise((resolve) => setTimeout(resolve, 100));
      await router.replace(currentPath);
    } catch (error) {
      logger.error("Router-Reset fehlgeschlagen", error);
    }
  };

  /**
   * Cache-Bereinigung
   */
  const clearCaches = async () => {
    logger.info("Cache-Bereinigung...");

    try {
      // Service Worker deregistrieren
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((reg: any) => reg.unregister()));
      }

      // Browser-Cache leeren
      if ("caches" in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name: any) => caches.delete(name)));
      }

      // Lokalen Speicher bereinigen (selektiv)
      const keysToKeep = ["token", "userId", "userRole", "lastWorkingRoute"];
      const savedValues: Record<string, string> = {};

      keysToKeep.forEach((key: any) => {
        const value = localStorage.getItem(key);
        if (value) savedValues[key] = value;
      });

      localStorage.clear();

      Object.entries(savedValues).forEach(([key, value]: any) => {
        localStorage.setItem(key, value);
      });
    } catch (error) {
      logger.error("Cache-Bereinigung fehlgeschlagen", error);
    }
  };

  /**
   * Sichere Navigation mit Queue
   */
  const safeNavigate = async (path: string | RouteLocationNormalized) => {
    const navigationFn = async () => {
      const result = await routerService.navigate(path);

      if (!result.success) {
        handleRouteError(
          result.error || new Error("Navigation fehlgeschlagen"),
        );
      }

      return result;
    };

    // Füge zur Queue hinzu
    navigationQueue.value.push(navigationFn as any);

    // Verarbeite Queue
    if (navigationQueue.value.length === 1) {
      await processNavigationQueue();
    }
  };

  /**
   * Verarbeitet die Navigations-Queue
   */
  const processNavigationQueue = async () => {
    while (navigationQueue.value.length > 0) {
      const navigationFn = navigationQueue.value.shift();
      if (navigationFn) {
        try {
          await navigationFn();
        } catch (error) {
          logger.error("Queue-Navigation fehlgeschlagen", error);
        }
      }
    }
  };

  /**
   * Navigiert zur Fallback-Route
   */
  const navigateToFallback = async (reason: string) => {
    logger.warn(`Navigiere zur Fallback-Route: ${reason}`);
    const result = await (routerService as any).navigateToFallback(reason);

    if (!result.success) {
      logger.error("Fallback-Navigation fehlgeschlagen, Hard Reload...");
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    }
  };

  /**
   * Richtet Watcher ein
   */
  const setupWatchers = () => {
    // Überwache Route-Änderungen
    watch(
      () => route.fullPath,
      (newPath: any, oldPath: any) => {
        if (debugMode) {
          logger.debug(`Route-Änderung: ${oldPath} -> ${newPath}`);
        }

        // Reset bei erfolgreicher Navigation
        if (routeHealth.value.consecutiveFailures > 0) {
          routeHealth.value.consecutiveFailures = 0;
        }
      },
    );

    // Überwache Router-Fehler
    router.onError((error) => {
      logger.error("Router-Fehler", error);
      handleRouteError(error);
    });
  };

  /**
   * Richtet globale Error Handler ein
   */
  const setupErrorHandlers = () => {
    // Window Error Handler
    const originalErrorHandler = window.onerror;

    window.onerror = (message, source, lineno, colno, error) => {
      if (
        error &&
        error.message.includes("Cannot read properties of undefined")
      ) {
        if (error.message.includes("currentRoute")) {
          logger.error("CurrentRoute Fehler abgefangen", error);
          handleRouteError(error);
          return true; // Verhindere Standard-Fehlerbehandlung
        }
      }

      // Rufe originalen Handler auf
      if (originalErrorHandler) {
        return originalErrorHandler(message, source, lineno, colno, error);
      }

      return false;
    };

    // Unhandled Promise Rejection Handler
    window.addEventListener("unhandledrejection", (event) => {
      if (event.reason && event.reason.message) {
        if (event.reason.message.includes("currentRoute")) {
          logger.error(
            "Unhandled Promise Rejection: currentRoute",
            event.reason,
          );
          handleRouteError(event.reason);
          event.preventDefault();
        }
      }
    });
  };

  /**
   * Diagnostics für Debugging
   */
  const getDiagnostics = () => {
    return {
      routeHealth: routeHealth.value,
      routerState: (routerService as any).getState(),
      currentRoute: routerService.currentRoute(),
      isMonitoring: isMonitoring.value,
      queueLength: navigationQueue.value.length,
      // domDiagnostics: domErrorDetector.detectErrorState() // DEAKTIVIERT wegen Endlosschleife
    };
  };

  // Lifecycle
  onMounted(() => {
    initialize();
  });

  onBeforeUnmount(() => {
    stopMonitoring();
  });

  return {
    isMonitoring,
    routeHealth,
    safeNavigate,
    navigateToFallback,
    getDiagnostics,
    startMonitoring,
    stopMonitoring,
    checkRouteHealth,
  };
}
