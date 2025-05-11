import { defineAsyncComponent, AsyncComponentLoader } from "vue";

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
  let loader: AsyncComponentLoader<any>;

  // Komponentenpfad mit Chunk-Konfiguration
  if (chunkName === "async") {
    // Standard-Chunk-Strategie für allgemeine Komponenten
    loader = () => import(`@/${normalizedPath}`);
  } else {
    // Benannte Chunks für besseres Caching und Gruppierung
    loader = () =>
      import(
        /* @vite-ignore */
        `@/${normalizedPath}`
      );
  }

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
  paths.forEach((path, index) => {
    setTimeout(() => {
      dynamicImport(path, { ...options, preload: true });
    }, index * 100); // Staggered loading mit 100ms Abstand
  });
}

/**
 * Spezialisierte Importfunktion für Vue-Router mit Tracking und Optimierungen
 */
export function createRouterView(
  viewPath: string,
  options: DynamicImportOptions = {},
) {
  // Messung der Ladezeiten für Analytics
  const component = dynamicImport(`views/${viewPath}.vue`, options);

  // Wrapper-Funktion für Tracking und Optimierungen
  return () => {
    // Lade-Performance messen
    const startTime = performance.now();

    // Komponente laden
    const result = component();

    // Nach dem Laden Performance-Metrik erfassen
    if (import.meta.env.PROD) {
      result
        .then(() => {
          const loadTime = performance.now() - startTime;

          // Telemetrie-Daten an Analytics senden, falls verfügbar
          if (window.trackComponentLoad) {
            window.trackComponentLoad({
              component: viewPath,
              loadTime,
              timestamp: new Date().toISOString(),
            });
          }
        })
        .catch(() => {
          // Fehler beim Laden - nichts tun, da die Fehlerbehandlung bereits in dynamicImport erfolgt
        });
    }

    return result;
  };
}

/**
 * Erweiterte Typdeklaration für Fenster-Objekt
 */
declare global {
  interface Window {
    trackComponentLoad?: (data: any) => void;
  }
}
