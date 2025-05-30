import { defineAsyncComponent, AsyncComponentLoader, h } from "vue";

/**
 * Konfiguration für dynamisches Importieren von Komponenten
 */
export interface DynamicImportOptions {
  /** Benutzerdefinierter Chunk-Name */
  chunkName?: string;

  /** Prioritätsstufe (höhere Werte = niedrigere Priorität) */
  priority?: "critical" | "high" | "medium" | "low";

  /** Ob die Komponente vorausgeladen werden soll */
  preload?: boolean;

  /** Ob die Komponente präfabriziert werden soll */
  prefetch?: boolean;

  /** Verzögerungseinstellungen für das Anzeigen der Ladeanzeige (ms) */
  loadingDelay?: number;

  /** Timeout für das Laden (ms) */
  timeout?: number;

  /** Komponente, die angezeigt wird, wenn das Laden fehlschlägt */
  errorComponent?: any;

  /** Callback für Fehlerbehandlung */
  onError?: (
    error: Error,
    retry: () => void,
    fail: () => void,
    attempts: number,
  ) => void;

  /** Verzögerung zwischen Wiederholungsversuchen (ms) */
  retryDelay?: number;

  /** Maximale Anzahl von Wiederholungsversuchen */
  maxRetries?: number;

  /** Ob das Laden verzögert werden soll (ms) */
  delayLoad?: number;

  /** Zusätzliche Metadaten */
  meta?: Record<string, any>;
}

// Komponenten-Cache für wiederholte Importe
const componentCache = new Map<string, any>();

/**
 * Setzt die Verzögerung basierend auf der Priorität
 */
function getPriorityDelay(
  priority: "critical" | "high" | "medium" | "low",
): number {
  switch (priority) {
    case "critical":
      return 0;
    case "high":
      return 50;
    case "medium":
      return 150;
    case "low":
      return 300;
    default:
      return 200;
  }
}

/**
 * Fortgeschrittene Funktion für dynamisches Importieren von Komponenten mit
 * Unterstützung für Code-Splitting, Chunk-Benennung, Prioritäten und mehr.
 *
 * @param path Pfad zur Komponente
 * @param options Optionen für das Laden
 * @returns Asynchrone Komponente
 */
export function dynamicImport(
  path: string,
  options: DynamicImportOptions = {},
) {
  const {
    chunkName = "async",
    priority = "medium",
    preload = false,
    prefetch = true,
    loadingDelay = getPriorityDelay(priority),
    timeout = 30000,
    errorComponent,
    onError,
    retryDelay = 1000,
    maxRetries = 3,
    delayLoad = 0,
    meta = {},
  } = options;

  // Normalisiere Pfad für Caching
  const normalizedPath = path.replace(/^@\//, "./src/").replace(/^\.\//, "");
  const cacheKey = `${normalizedPath}-${chunkName}`;

  // Rückgabe aus dem Cache, wenn verfügbar
  if (componentCache.has(cacheKey)) {
    return componentCache.get(cacheKey);
  }

  // Erstelle dynamischen Import basierend auf Code-Splitting-Strategie
  // Diese vereinfachte Implementierung verwendet direkte statische Pfade
  // In der Produktionsversion sollte die spezifische Chunk-Konfiguration wieder verwendet werden
  let loader: AsyncComponentLoader<any>;

  // Vite erfordert statische Pfade für Import-Analyse
  // Wir verwenden relative Pfade für better compatibility
  loader = () => {
    let importPath = normalizedPath;

    // Konvertiere verschiedene Pfadformate
    if (normalizedPath.startsWith("./src/")) {
      importPath = normalizedPath.replace("./src/", "../");
    } else if (
      !normalizedPath.startsWith("/") &&
      !normalizedPath.startsWith(".")
    ) {
      // Wenn kein führender Slash oder Punkt, füge '../' hinzu
      importPath = "../" + normalizedPath;
    }

    return import(/* @vite-ignore */ importPath);
  };

  // Komponente vorausladen, wenn gewünscht
  if (preload) {
    setTimeout(() => {
      loader();
    }, delayLoad);
  }

  // Asynchrone Komponente mit erweiterten Optionen definieren
  const asyncComponent = defineAsyncComponent({
    loader,
    loadingComponent:
      loadingDelay > 0
        ? {
            template: '<div class="component-loading"></div>',
          }
        : undefined,
    errorComponent: errorComponent || {
      template:
        '<div class="component-error">Fehler beim Laden der Komponente</div>',
    },
    delay: loadingDelay,
    timeout,
    suspensible: true,
    onError: (error, retry, fail, attempts) => {
      console.error(
        `Fehler beim Laden der Komponente ${normalizedPath}:`,
        error,
      );

      // Benutzerdefinierte Fehlerbehandlung, falls vorhanden
      if (onError) {
        onError(error, retry, fail, attempts);
        return;
      }

      // Standard-Wiederholungslogik
      if (attempts <= maxRetries) {
        setTimeout(() => {
          retry();
        }, retryDelay * attempts); // Exponentielles Backoff
      } else {
        fail();
      }
    },
  });

  // Komponente im Cache speichern
  componentCache.set(cacheKey, asyncComponent);

  return asyncComponent;
}

/**
 * Überwachung des Netzwerkstatus für dynamische Ladestrategien
 */
export function setupNetworkMonitoring() {
  let isOnline = navigator.onLine;
  let isSlowConnection = false;

  // Verbindungsgeschwindigkeit einschätzen, wenn verfügbar
  if ("connection" in navigator) {
    const connection = (navigator as any).connection;

    if (connection) {
      // Langsamere Verbindungen identifizieren
      isSlowConnection =
        connection.saveData ||
        connection.effectiveType === "slow-2g" ||
        connection.effectiveType === "2g" ||
        connection.effectiveType === "3g";

      // Verbindungsänderungen überwachen
      connection.addEventListener("change", () => {
        isSlowConnection =
          connection.saveData ||
          connection.effectiveType === "slow-2g" ||
          connection.effectiveType === "2g" ||
          connection.effectiveType === "3g";
      });
    }
  }

  // Online/Offline-Status überwachen
  window.addEventListener("online", () => {
    isOnline = true;
  });

  window.addEventListener("offline", () => {
    isOnline = false;
  });

  // Funktionen für adaptive Ladestrategien
  return {
    isOnline: () => isOnline,
    isSlowConnection: () => isSlowConnection,

    // Bestimmt, ob präemptives Laden stattfinden sollte
    shouldPreload: () => isOnline && !isSlowConnection,

    // Verzögerung basierend auf Netzwerkbedingungen anpassen
    getAdaptiveDelay: (baseDelay: number) => {
      if (!isOnline) return baseDelay * 2;
      if (isSlowConnection) return baseDelay * 1.5;
      return baseDelay;
    },
  };
}

/**
 * Optimiertes Laden von Komponenten nach Gruppen
 *
 * @param paths Pfade zu Komponenten
 * @param options Optionen für das Laden
 */
export function preloadComponentGroup(
  paths: string[],
  options: DynamicImportOptions = {},
) {
  const { shouldPreload } = setupNetworkMonitoring();

  // Nur preloaden, wenn es sinnvoll ist
  if (!shouldPreload() && !options.preload) {
    return;
  }

  // Sequentielles Laden mit zeitlicher Verzögerung zwischen Komponenten
  paths.forEach((path, index: any) => {
    setTimeout(() => {
      dynamicImport(path, { ...options, preload: true });
    }, index * 100); // Staggered loading mit 100ms Abstand
  });
}

/**
 * Spezialisierte Importfunktion für Vue-Router mit verbessertem Tracking und Fehlerbehandlung
 */
export function createRouterView(
  viewPath: string,
  options: DynamicImportOptions = {},
) {
  // Initialisiere das Fehler-Tracking
  const errorTracking = setupRouterErrorTracking();

  // Erzeugt den vollqualifizierten Pfad zur View-Komponente
  // Verwende korrekte relative Pfade für Vite
  const fullPath = viewPath.endsWith(".vue")
    ? `../../views/${viewPath}`
    : `../../views/${viewPath}.vue`;

  // Fallback-Komponente für Fehlerbehandlung (statt 404 oder leerer Seite)
  const fallbackPath = options.errorComponent
    ? `../../views/${options.errorComponent}.vue`
    : "../../views/ErrorView.vue";

  // Wrapper-Funktion für das Laden und Tracking mit verbesserter Fehlerbehandlung
  return () => {
    // Lade-Performance messen
    const startTime = performance.now();

    try {
      // Komponente direkt laden mit Vite-kompatiblem Import
      const loader = () => {
        // Für Vite verwenden wir relative Pfade aus src/router
        if (viewPath === "ChatView") return import("@/views/ChatView.vue");
        if (viewPath === "DocumentsView")
          return import("@/views/DocumentsView.vue");
        if (viewPath === "AdminView") return import("@/views/AdminView.vue");
        if (viewPath === "SettingsView")
          return import("@/views/SettingsView.vue");
        if (viewPath === "AuthView") return import("@/views/AuthView.vue");
        if (viewPath === "EnhancedChatView")
          return import("@/views/EnhancedChatView.vue");
        if (viewPath === "ErrorView") return import("@/views/ErrorView.vue");
        if (viewPath === "NotFoundView")
          return import("@/views/NotFoundView.vue");
        // Fallback
        return import(/* @vite-ignore */ fullPath);
      };
      const result = loader();

      // Verbessertes Tracking und Fehlerbehandlung
      result
        .then(() => {
          const loadTime = performance.now() - startTime;

          // Telemetrie-Daten an Analytics senden, wenn verfügbar
          if (window.trackComponentLoad) {
            window.trackComponentLoad({
              component: viewPath,
              loadTime,
              timestamp: new Date().toISOString(),
              success: true,
            });
          }
        })
        .catch((error) => {
          // Erfasse den Fehler im Tracking-System
          const errorInfo = errorTracking.trackError(viewPath, error);

          console.error(`Fehler beim Laden der Komponente ${viewPath}:`, error);

          // Telemetrie für fehlgeschlagene Ladeversuche
          if (window.trackComponentLoad) {
            window.trackComponentLoad({
              component: viewPath,
              error: errorInfo.error,
              errorCount: errorInfo.count,
              timestamp: new Date().toISOString(),
              success: false,
            });
          }
        });

      return result;
    } catch (error) {
      // Erfasse den unmittelbaren Fehler (z.B. Syntaxfehler beim Importieren)
      errorTracking.trackError(viewPath, error);
      console.error(
        `Kritischer Fehler beim Importieren von ${viewPath}:`,
        error,
      );

      // Fallback zur ErrorView im Fall von kritischen Fehlern
      try {
        return import(/* @vite-ignore */ fallbackPath)
          .then((module) => {
            // Dynamisch Eigenschaften hinzufügen, um Fehlerdetails durchzureichen
            const component = module.default;
            component.props = {
              ...component.props,
              errorMessage: `Fehler beim Laden der Komponente "${viewPath}"`,
              errorCode: "component_load_error",
              errorDetails:
                error instanceof Error ? error.message : String(error),
              canRetry: true,
            };
            return module;
          })
          .catch(() => {
            // Wenn sogar die ErrorView nicht geladen werden kann, minimale Fehleranzeige
            return {
              render() {
                return h("div", { style: { padding: "20px", color: "red" } }, [
                  h("h2", "Kritischer Ladefehler"),
                  h(
                    "p",
                    `Die Komponente "${viewPath}" konnte nicht geladen werden.`,
                  ),
                  h(
                    "button",
                    {
                      onClick: () => window.location.reload(),
                    },
                    "Seite neu laden",
                  ),
                ]);
              },
            };
          });
      } catch (fallbackError) {
        // Absolut minimale Notfallkomponente, wenn alles andere fehlschlägt
        console.error(
          "Kritischer Fehler beim Laden der Fallback-Komponente:",
          fallbackError,
        );
        return {
          template: `
            <div style="padding: 20px; color: red; text-align: center;">
              <h2>Kritischer Fehler</h2>
              <p>Die Anwendung konnte nicht geladen werden.</p>
              <button @click="reload">Seite neu laden</button>
            </div>
          `,
          methods: {
            reload() {
              window.location.reload();
            },
          },
        };
      }
    }
  };
}

/**
 * Erweiterte Typdeklaration für Fenster-Objekt
 */
declare global {
  interface Window {
    trackComponentLoad?: (data: any) => void;
    __ROUTE_LOAD_ERRORS__?: Record<
      string,
      { count: number; lastError: string; timestamp: number }
    >;
  }
}

/**
 * Fehler-Tracking und Diagnose für Router-Ladeprobleme
 */
export function setupRouterErrorTracking() {
  // Initialisieren des globalen Fehler-Tracking-Objekts, falls noch nicht vorhanden
  if (!window.__ROUTE_LOAD_ERRORS__) {
    window.__ROUTE_LOAD_ERRORS__ = {};
  }

  return {
    /**
     * Fehler beim Laden einer Route erfassen
     */
    trackError: (routePath: string, error: any) => {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const timestamp = Date.now();

      // Fehlerinformationen aktualisieren
      if (window.__ROUTE_LOAD_ERRORS__![routePath]) {
        window.__ROUTE_LOAD_ERRORS__![routePath].count++;
        window.__ROUTE_LOAD_ERRORS__![routePath].lastError = errorMessage;
        window.__ROUTE_LOAD_ERRORS__![routePath].timestamp = timestamp;
      } else {
        window.__ROUTE_LOAD_ERRORS__![routePath] = {
          count: 1,
          lastError: errorMessage,
          timestamp: timestamp,
        };
      }

      // Debug-Informationen protokollieren
      console.error(
        `[RouterErrorTracking] Fehler beim Laden von Route "${routePath}":`,
        errorMessage,
      );

      return {
        routePath,
        error: errorMessage,
        count: window.__ROUTE_LOAD_ERRORS__![routePath].count,
        timestamp,
      };
    },

    /**
     * Diagnoseinformationen für alle aufgetretenen Router-Fehler abrufen
     */
    getDiagnostics: () => {
      return {
        errors: { ...window.__ROUTE_LOAD_ERRORS__ },
        totalErrors: Object.values(window.__ROUTE_LOAD_ERRORS__ || {}).reduce(
          (sum, entry) => sum + entry.count,
          0,
        ),
        highestErrorRoute:
          Object.entries(window.__ROUTE_LOAD_ERRORS__ || {})
            .sort((a, b) => b[1].count - a[1].count)
            .map(([route, data]: any) => ({ route, ...data }))[0] || null,
      };
    },

    /**
     * Fehlerstatistiken für eine bestimmte Route zurücksetzen
     */
    resetErrorsForRoute: (routePath: string) => {
      if (window.__ROUTE_LOAD_ERRORS__![routePath]) {
        delete window.__ROUTE_LOAD_ERRORS__![routePath];
        return true;
      }
      return false;
    },

    /**
     * Alle Fehlerstatistiken zurücksetzen
     */
    resetAllErrors: () => {
      window.__ROUTE_LOAD_ERRORS__ = {};
    },

    /**
     * Route-Update verarbeiten (für Router afterEach Hook)
     */
    updateRoute: (to: any, from: any) => {
      // Optional: Hier können Sie Route-Updates tracken
      // Derzeit ist dies ein Dummy, um den Fehler zu beheben
    },
  };
}
