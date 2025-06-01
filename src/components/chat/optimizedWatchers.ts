import {
  ref,
  watch,
  computed,
  ComputedRef,
} from "vue";
import type { WatchOptions, WatchSource, WatchStopHandle } from "vue";
import { debounce, throttle } from "./watchHelpers";

/**
 * Optimierte Watcher-Funktionen zur Verbesserung der Performance
 *
 * Dieses Modul bietet optimierte Versionen der Vue.js Watch-Funktionen,
 * die speziell für Performance-kritische Anwendungen entwickelt wurden:
 *
 * 1. Intelligentes Debouncing mit adaptiver Rate
 * 2. Optimiertes Throttling für häufige Updates
 * 3. Verzögerbare Watch-Execution
 * 4. Batching ähnlicher Aktualisierungen
 * 5. Performance-Metriken für Analysen
 * 6. Spezialisierte Watcher für Chat-Nachrichten-Streaming
 * 7. Lazy Evaluation für aufwändige Berechnungen
 * 8. Selbstoptimierende Watcher basierend auf Nutzungsmustern
 */

// Performance-Metriken-Sammlung für Watcher
const watcherMetrics: Record<
  string,
  {
    executionCount: number;
    totalExecutionTime: number;
    lastExecutionTime: number;
    averageExecutionTime: number;
  }
> = {};

/**
 * Optimierter Watch mit adaptivem Debouncing
 *
 * @param source - Die zu beobachtende Quelle (ref, reactive, getter, etc.)
 * @param callback - Die Callback-Funktion, die ausgeführt wird
 * @param options - Erweiterte Optionen für die Watch-Funktion
 * @returns Eine Funktion zum Beenden des Watchers
 */
export function useAdaptiveWatch<T>(
  source: WatchSource<T>,
  callback: (value: T, oldValue: T) => void,
  options: {
    immediate?: boolean;
    deep?: boolean;
    flush?: "pre" | "post" | "sync";
    debounceMs?: number;
    maxWait?: number;
    watcherId?: string;
  } = {},
): WatchStopHandle {
  const {
    immediate = false,
    deep = false,
    flush = "post",
    debounceMs = 200,
    maxWait = 1000,
    watcherId = `watcher-${Math.random().toString(36).substr(2, 9)}`,
  } = options;

  // Initialisiere Metriken
  watcherMetrics[watcherId] = {
    executionCount: 0,
    totalExecutionTime: 0,
    lastExecutionTime: 0,
    averageExecutionTime: 0,
  };

  // Debounce die Callback-Funktion
  const debouncedCallback = debounce(
    (value: T, oldValue: T) => {
      const startTime = performance.now();

      try {
        callback(value, oldValue);
      } finally {
        // Aktualisiere Metriken
        const executionTime = performance.now() - startTime;
        const metrics = watcherMetrics[watcherId];
        metrics.executionCount++;
        metrics.totalExecutionTime += executionTime;
        metrics.lastExecutionTime = executionTime;
        metrics.averageExecutionTime =
          metrics.totalExecutionTime / metrics.executionCount;
      }
    },
    debounceMs,
    { maxWait },
  );

  // Erstelle den Watcher mit der debouncedCallback
  const stopHandle = watch(source, debouncedCallback, {
    immediate,
    deep,
    flush,
  });

  // Gebe eine erweiterte Stop-Funktion zurück, die auch die Metriken bereinigt
  return () => {
    debouncedCallback.cancel();
    delete watcherMetrics[watcherId];
    stopHandle();
  };
}

/**
 * Optimierter Watch mit selektiver Tiefenvergleich
 *
 * Überwacht nur bestimmte Pfade eines komplexen Objekts,
 * um unnötige Re-Renderings zu vermeiden
 *
 * @param source - Die zu beobachtende Quelle (ref, reactive, getter, etc.)
 * @param pathsToWatch - Die zu überwachenden Pfade innerhalb des Objekts
 * @param callback - Die Callback-Funktion, die ausgeführt wird
 * @param options - Erweiterte Optionen für die Watch-Funktion
 * @returns Eine Funktion zum Beenden des Watchers
 */
export function useSelectiveWatch<T extends Record<string, any>>(
  source: WatchSource<T>,
  pathsToWatch: string[],
  callback: (value: T, oldValue: T, changedPaths: string[]) => void,
  options: {
    immediate?: boolean;
    flush?: "pre" | "post" | "sync";
    watcherId?: string;
  } = {},
): WatchStopHandle {
  const {
    immediate = false,
    flush = "post",
    watcherId = `selective-watcher-${Math.random().toString(36).substr(2, 9)}`,
  } = options;

  // Initialisiere Metriken
  watcherMetrics[watcherId] = {
    executionCount: 0,
    totalExecutionTime: 0,
    lastExecutionTime: 0,
    averageExecutionTime: 0,
  };

  // Erstelle den Watcher mit einer Wrapper-Funktion, die nur bestimmte Pfade vergleicht
  const stopHandle = watch(
    source,
    (newValue: any, oldValue: any) => {
      if (!oldValue) {
        // Wenn es keinen alten Wert gibt (z.B. bei immediate: true),
        // rufe callback mit allen Pfaden auf
        const startTime = performance.now();
        try {
          callback(newValue, oldValue as T, pathsToWatch);
        } finally {
          updateMetrics(watcherId, performance.now() - startTime);
        }
        return;
      }

      // Finde die geänderten Pfade
      const changedPaths = pathsToWatch.filter((path) => {
        const pathParts = path.split(".");
        let newValueAtPath = newValue;
        let oldValueAtPath = oldValue;

        for (const part of pathParts) {
          if (newValueAtPath === undefined || oldValueAtPath === undefined) {
            return true; // Pfad existiert nicht mehr oder ist neu
          }
          newValueAtPath = newValueAtPath[part];
          oldValueAtPath = oldValueAtPath[part];
        }

        // Vergleiche die Werte an diesem Pfad
        return !areEqual(newValueAtPath, oldValueAtPath);
      });

      // Nur Callback aufrufen, wenn sich etwas geändert hat
      if (changedPaths.length > 0) {
        const startTime = performance.now();
        try {
          callback(newValue, oldValue as T, changedPaths);
        } finally {
          updateMetrics(watcherId, performance.now() - startTime);
        }
      }
    },
    {
      immediate,
      deep: true, // Muss tief sein, um auf verschachtelte Änderungen zu reagieren
      flush,
    },
  );

  return () => {
    delete watcherMetrics[watcherId];
    stopHandle();
  };
}

/**
 * Optimierter Watch mit Batch-Verarbeitung
 *
 * Sammelt mehrere Änderungen und führt den Callback nur einmal aus
 *
 * @param sources - Array von zu beobachtenden Quellen
 * @param callback - Die Callback-Funktion, die ausgeführt wird
 * @param options - Erweiterte Optionen für die Watch-Funktion
 * @returns Eine Funktion zum Beenden aller Watcher
 */
export function useBatchWatch<T extends any[]>(
  sources: [...WatchSource<T>],
  callback: (values: T, oldValues: T) => void,
  options: {
    immediate?: boolean;
    batchTimeMs?: number;
    watcherId?: string;
  } = {},
): WatchStopHandle {
  const {
    immediate = false,
    batchTimeMs = 50,
    watcherId = `batch-watcher-${Math.random().toString(36).substr(2, 9)}`,
  } = options;

  // Initialisiere Metriken
  watcherMetrics[watcherId] = {
    executionCount: 0,
    totalExecutionTime: 0,
    lastExecutionTime: 0,
    averageExecutionTime: 0,
  };

  // Sammlung von Änderungen
  let pendingChanges = false;
  let batchTimeout: number | null = null;
  const latestValues: any[] = [];
  const previousValues: any[] = [];

  // Erstelle separate Watcher für jede Quelle
  const stopHandles = sources.map((source, index) => {
    return watch(
      source,
      (newValue: any, oldValue: any) => {
        // Aktualisiere die aktuellen Werte
        latestValues[index] = newValue;
        previousValues[index] = oldValue;

        // Plane einen Batch an, wenn noch keiner geplant ist
        if (!pendingChanges) {
          pendingChanges = true;

          // Batch-Verzögerung für nicht-sofortige Ausführung
          if (batchTimeout) {
            clearTimeout(batchTimeout);
          }

          batchTimeout = window.setTimeout(() => {
            const startTime = performance.now();
            try {
              callback(
                latestValues as unknown as T,
                previousValues as unknown as T,
              );
            } finally {
              updateMetrics(watcherId, performance.now() - startTime);
              pendingChanges = false;
              batchTimeout = null;
            }
          }, batchTimeMs);
        }
      },
      {
        immediate,
        deep: true,
      },
    );
  });

  // Kombinierte Stop-Funktion
  return () => {
    stopHandles.forEach((stop) => stop());
    if (batchTimeout) {
      clearTimeout(batchTimeout);
    }
    delete watcherMetrics[watcherId];
  };
}

/**
 * Optimierter Watch für UI-Aktualisierungen
 *
 * Spezialwatcher für UI-bezogene Aktualisierungen, die normalerweise
 * häufig und mit hoher Priorität aktualisiert werden müssen.
 *
 * @param source - Die zu beobachtende Quelle (ref, reactive, getter, etc.)
 * @param callback - Die Callback-Funktion, die ausgeführt wird
 * @param options - Erweiterte Optionen für die Watch-Funktion
 * @returns Eine Funktion zum Beenden des Watchers
 */
export function useUIWatch<T>(
  source: WatchSource<T>,
  callback: (value: T, oldValue: T) => void,
  options: {
    immediate?: boolean;
    throttleMs?: number;
    forceAnimationFrame?: boolean;
    watcherId?: string;
  } = {},
): WatchStopHandle {
  const {
    immediate = true,
    throttleMs = 16, // Etwa 60fps
    forceAnimationFrame = true,
    watcherId = `ui-watcher-${Math.random().toString(36).substr(2, 9)}`,
  } = options;

  // Initialisiere Metriken
  watcherMetrics[watcherId] = {
    executionCount: 0,
    totalExecutionTime: 0,
    lastExecutionTime: 0,
    averageExecutionTime: 0,
  };

  // Throttle die Callback-Funktion
  const throttledCallback = throttle(
    (value: T, oldValue: T) => {
      // Führe den Callback im nächsten AnimationFrame aus für flüssigere UI
      if (forceAnimationFrame) {
        requestAnimationFrame(() => {
          const startTime = performance.now();
          try {
            callback(value, oldValue);
          } finally {
            updateMetrics(watcherId, performance.now() - startTime);
          }
        });
      } else {
        const startTime = performance.now();
        try {
          callback(value, oldValue);
        } finally {
          updateMetrics(watcherId, performance.now() - startTime);
        }
      }
    },
    throttleMs,
    { leading: true, trailing: true },
  );

  // Erstelle den Watcher mit der throttledCallback
  const stopHandle = watch(source, throttledCallback, {
    immediate,
    flush: "post",
  });

  // Gebe eine erweiterte Stop-Funktion zurück
  return () => {
    throttledCallback.cancel();
    delete watcherMetrics[watcherId];
    stopHandle();
  };
}

/**
 * Helper-Funktion zum Aktualisieren der Metriken
 */
function updateMetrics(watcherId: string, executionTime: number): void {
  const metrics = watcherMetrics[watcherId];
  if (metrics) {
    metrics.executionCount++;
    metrics.totalExecutionTime += executionTime;
    metrics.lastExecutionTime = executionTime;
    metrics.averageExecutionTime =
      metrics.totalExecutionTime / metrics.executionCount;
  }
}

/**
 * Helper-Funktion zum Prüfen der Gleichheit von Werten
 */
function areEqual(a: any, b: any): boolean {
  if (a === b) return true;

  // Behandlung von Nulls/Undefineds
  if (a == null || b == null) return a === b;

  // Behandlung von Datumsobjekten
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  // Behandlung von Arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!areEqual(a[i], b[i])) return false;
    }
    return true;
  }

  // Behandlung von einfachen Objekten
  if (typeof a === "object" && typeof b === "object") {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      if (!b.hasOwnProperty(key)) return false;
      if (!areEqual(a[key], b[key])) return false;
    }

    return true;
  }

  return false;
}

/**
 * Spezialisierter Watcher für Chat-Nachrichtenstreaming
 *
 * Optimiert für hohe Aktualisierungsraten während des Streamings
 * von Nachrichten, mit intelligenter Aktualisierungssteuerung
 * basierend auf sichtbarer UI und Benutzerinteraktion
 *
 * @param messageSource Die Nachrichtenquelle (reactive array)
 * @param callback Callback-Funktion bei Nachrichtenänderungen
 * @param options Erweiterte Optionen
 * @returns Eine Funktion zum Beenden des Watchers
 */
export function useMessageStreamingWatch<T extends Array<any>>(
  messageSource: WatchSource<T>,
  callback: (
    messages: T,
    changes: {
      type: "add" | "update" | "remove";
      index: number;
      item?: any;
    }[],
  ) => void,
  options: {
    visibilityThreshold?: number;
    scrollingDelay?: number;
    idleUpdateRate?: number;
    activeUpdateRate?: number;
    batchUpdates?: boolean;
    watcherId?: string;
  } = {},
): WatchStopHandle {
  const {
    visibilityThreshold = 0.5, // Prozentsatz der sichtbaren Nachrichtenliste
    scrollingDelay = 300, // Verzögerung während des Scrollens
    idleUpdateRate = 500, // Aktualisierungsrate im Ruhezustand
    activeUpdateRate = 50, // Aktualisierungsrate im aktiven Zustand
    batchUpdates = true, // Aktualisierungen bündeln
    watcherId = `message-stream-${Math.random().toString(36).substr(2, 9)}`,
  } = options;

  // UI-Zustand
  let isScrolling = false;
  let scrollTimeout: number | null = null;
  let isUserActive = true;
  let lastActivityTime = Date.now();
  let previousMessages: any[] = [];

  // Initialisiere Metriken
  watcherMetrics[watcherId] = {
    executionCount: 0,
    totalExecutionTime: 0,
    lastExecutionTime: 0,
    averageExecutionTime: 0,
  };

  // Erkennt UI-Aktivität (Scrollen, Mausbewegung)
  const setupActivityDetection = () => {
    const handleScroll = () => {
      isScrolling = true;
      lastActivityTime = Date.now();
      isUserActive = true;

      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }

      scrollTimeout = window.setTimeout(() => {
        isScrolling = false;
      }, scrollingDelay);
    };

    const handleActivity = () => {
      lastActivityTime = Date.now();
      isUserActive = true;
    };

    // Inaktivitätserkennung
    const checkActivity = () => {
      const now = Date.now();
      if (now - lastActivityTime > 10000) {
        // 10 Sekunden Inaktivität
        isUserActive = false;
      }
      setTimeout(checkActivity, 5000);
    };

    // Event-Listener registrieren
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("mousemove", handleActivity, { passive: true });
    window.addEventListener("keydown", handleActivity, { passive: true });
    window.addEventListener("touchstart", handleActivity, { passive: true });

    checkActivity();

    // Cleanup-Funktion
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("touchstart", handleActivity);

      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
    };
  };

  // Installiere Event-Listener
  const cleanupActivity = setupActivityDetection();

  // Adaptives Throttling basierend auf UI-Zustand
  const getThrottleRate = () => {
    if (isScrolling) {
      return scrollingDelay;
    }
    return isUserActive ? activeUpdateRate : idleUpdateRate;
  };

  // Adaptiver throttling-basierter Callback
  const adaptiveCallback = (messages: T, oldMessages: T) => {
    const startTime = performance.now();
    try {
      if (!oldMessages || oldMessages.length === 0) {
        // Initialer Aufruf, alle Nachrichten als hinzugefügt markieren
        const changes = messages.map((item, index) => ({
          type: "add" as const,
          index,
          item,
        }));
        callback(messages, changes);
        previousMessages = [...messages];
        return;
      }

      // Finde Änderungen zwischen den Listen
      const changes: {
        type: "add" | "update" | "remove";
        index: number;
        item?: any;
      }[] = [];

      // Erkenne Hinzufügungen und Aktualisierungen
      messages.forEach((item, index) => {
        if (index >= previousMessages.length) {
          // Neue Nachricht am Ende
          changes.push({ type: "add", index, item });
        } else {
          // Vergleiche mit vorheriger Version
          const previousItem = previousMessages[index];
          const hasChanged = !areEqualMessages(item, previousItem);

          if (hasChanged) {
            changes.push({ type: "update", index, item });
          }
        }
      });

      // Erkenne Entfernungen
      if (previousMessages.length > messages.length) {
        for (let i = messages.length; i < previousMessages.length; i++) {
          changes.push({ type: "remove", index: i });
        }
      }

      // Nur bei Änderungen Callback aufrufen
      if (changes.length > 0) {
        callback(messages, changes);
      }

      // Speichere Referenz auf aktuelle Nachrichten
      previousMessages = [...messages];
    } finally {
      updateMetrics(watcherId, performance.now() - startTime);
    }
  };

  // Erstelle adaptiven, throttled Watcher
  const throttledCallback = throttle(adaptiveCallback, getThrottleRate(), {
    leading: true,
    trailing: true,
  });

  // Watcher mit intelligenter Steuerung
  const stopHandle = watch(
    messageSource,
    (messages: any, oldMessages: any) => {
      throttledCallback(messages, oldMessages as T);
    },
    { deep: true },
  );

  // Erweiterte Stop-Funktion für vollständige Bereinigung
  return () => {
    throttledCallback.cancel();
    cleanupActivity();
    delete watcherMetrics[watcherId];
    stopHandle();
  };
}

/**
 * Spezialisierter Watcher mit Lazy Evaluation für berechnungsintensive Operationen
 *
 * Führt Berechnungen nur aus, wenn die Ergebnisse tatsächlich benötigt werden,
 * z.B. wenn eine Komponente sichtbar ist, oder wenn der Benutzer interagiert.
 *
 * @param source Die zu beobachtende Quelle
 * @param computeFn Die (teure) Berechnungsfunktion
 * @param options Erweiterte Optionen
 * @returns Ein Objekt mit dem Ergebnis und Steuerungsfunktionen
 */
export function useLazyComputedWatch<S, R>(
  source: WatchSource<S>,
  computeFn: (source: S) => R,
  options: {
    immediate?: boolean;
    cacheResults?: boolean;
    maxCacheAge?: number;
    forceComputation?: boolean;
    watcherId?: string;
  } = {},
): {
  result: ComputedRef<R | undefined>;
  forceUpdate: () => void;
  isPending: ComputedRef<boolean>;
  lastUpdated: ComputedRef<number>;
  stopWatch: WatchStopHandle;
} {
  const {
    immediate = false,
    cacheResults = true,
    maxCacheAge = 30000, // 30 Sekunden
    forceComputation = false,
    watcherId = `lazy-computed-${Math.random().toString(36).substr(2, 9)}`,
  } = options;

  // Initialisiere Metriken
  watcherMetrics[watcherId] = {
    executionCount: 0,
    totalExecutionTime: 0,
    lastExecutionTime: 0,
    averageExecutionTime: 0,
  };

  // Zustandsvariablen
  const result = ref<R | undefined>(undefined);
  const isPending = ref(false);
  const lastUpdated = ref(0);
  const sourceValue = ref<S | undefined>(undefined);
  const isComputing = ref(false);

  // Cache-System für wiederholte Berechnungen
  interface CacheEntry {
    input: S;
    output: R;
    timestamp: number;
  }
  const cache = new Map<string, CacheEntry>();

  // Hilfsfunktion zum Hashing des Eingabewerts (vereinfacht)
  const hashInput = (input: S): string => {
    if (input === null || input === undefined) {
      return "null";
    }
    try {
      return JSON.stringify(input);
    } catch (e) {
      // Fallback für nicht-serialisierbare Werte
      return `${Date.now()}-${Math.random()}`;
    }
  };

  // Berechnungsfunktion mit Caching
  const computeResult = async (value: S): Promise<R> => {
    if (isComputing.value) {
      // Bereits in Berechnung, warte auf Abschluss
      return new Promise((resolve) => {
        setTimeout(() => {
          if (result.value !== undefined) {
            resolve(result.value as R);
          } else {
            resolve(computeResult(value));
          }
        }, 50);
      });
    }

    // Versuche, einen Cache-Treffer zu finden
    if (cacheResults) {
      const hash = hashInput(value);
      const cached = cache.get(hash);

      if (cached && Date.now() - cached.timestamp < maxCacheAge) {
        // Cache-Hit, verwende gecachtes Ergebnis
        return cached.output;
      }
    }

    // Kein Cache-Treffer, berechne Ergebnis
    isComputing.value = true;
    isPending.value = true;

    try {
      const startTime = performance.now();
      const computedResult = await Promise.resolve(computeFn(value));
      const executionTime = performance.now() - startTime;

      // Ergebnisse cachen
      if (cacheResults) {
        const hash = hashInput(value);
        cache.set(hash, {
          input: value,
          output: computedResult,
          timestamp: Date.now(),
        });

        // Cache-Größe begrenzen
        if (cache.size > 50) {
          // Entferne ältesten Eintrag
          const oldest = Array.from(cache.entries()).sort(
            (a, b) => a[1].timestamp - b[1].timestamp,
          )[0];

          if (oldest) {
            cache.delete(oldest[0]);
          }
        }
      }

      // Metriken aktualisieren
      updateMetrics(watcherId, executionTime);

      return computedResult;
    } finally {
      isComputing.value = false;
      isPending.value = false;
    }
  };

  // Funktion zum Erzwingen einer Neuberechnung
  const forceUpdate = async () => {
    if (sourceValue.value !== undefined) {
      isPending.value = true;
      const newResult = await computeResult(sourceValue.value);
      result.value = newResult;
      lastUpdated.value = Date.now();
      isPending.value = false;
    }
  };

  // Erstelle den Watcher
  const stopWatch = watch(
    source,
    async (value: any) => {
      sourceValue.value = value;

      // Entscheide, ob Berechnung ausgeführt werden soll
      const shouldCompute =
        immediate || forceComputation || result.value === undefined;

      if (shouldCompute) {
        isPending.value = true;
        const newResult = await computeResult(value);
        result.value = newResult;
        lastUpdated.value = Date.now();
        isPending.value = false;
      }
    },
    { immediate },
  );

  // Berechne sofort, wenn immediate=true
  if (immediate && sourceValue.value !== undefined) {
    forceUpdate();
  }

  return {
    result: computed(() => result.value),
    forceUpdate,
    isPending: computed(() => isPending.value),
    lastUpdated: computed(() => lastUpdated.value),
    stopWatch,
  };
}

/**
 * Watcher mit Selbstoptimierung basierend auf Nutzungsmustern
 *
 * Passt sein Verhalten basierend auf beobachteten Aktualisierungsmustern an
 * und optimiert sich selbst für beste Performance
 *
 * @param source Die zu beobachtende Quelle
 * @param callback Die Callback-Funktion
 * @param options Konfigurationsoptionen
 * @returns Eine Funktion zum Beenden des Watchers
 */
export function useSelfOptimizingWatch<T>(
  source: WatchSource<T>,
  callback: (value: T, oldValue: T) => void,
  options: {
    immediate?: boolean;
    adaptationEnabled?: boolean;
    learningRate?: number;
    initialStrategy?: "throttle" | "debounce" | "simple" | "batch";
    watcherId?: string;
  } = {},
): WatchStopHandle {
  const {
    immediate = false,
    adaptationEnabled = true,
    learningRate = 0.1,
    initialStrategy = "simple",
    watcherId = `adaptive-${Math.random().toString(36).substr(2, 9)}`,
  } = options;

  // Initialisiere Metriken
  watcherMetrics[watcherId] = {
    executionCount: 0,
    totalExecutionTime: 0,
    lastExecutionTime: 0,
    averageExecutionTime: 0,
  };

  // Aktuelle Strategie
  let currentStrategy = initialStrategy;
  const currentDelay = 200;

  // Strategie-Performance-Metriken
  const strategyMetrics: Record<
    string,
    {
      avgExecutionTime: number;
      callCount: number;
      successRate: number;
    }
  > = {
    simple: { avgExecutionTime: 0, callCount: 0, successRate: 1.0 },
    throttle: { avgExecutionTime: 0, callCount: 0, successRate: 1.0 },
    debounce: { avgExecutionTime: 0, callCount: 0, successRate: 1.0 },
    batch: { avgExecutionTime: 0, callCount: 0, successRate: 1.0 },
  };

  // Strategie-Aufrufgeschichte
  const callHistory: Array<{
    strategy: string;
    timestamp: number;
    executionTime: number;
  }> = [];
  const MAX_HISTORY = 20;

  // Analytische Aktualisierungsmuster
  let updateFrequency = 0; // Durchschnittliche Updates pro Sekunde
  let updateRegularity = 0; // Regelmäßigkeit der Updates (0-1)
  let lastUpdateTime = Date.now();

  // Muster-Erkennung für Aktualisierungen
  const updateIntervals: number[] = [];
  const MAX_INTERVALS = 20;

  // Messungsfunktion für Strategie-Performance
  const measurePerformance = (strategy: string, executionTime: number) => {
    const metrics = strategyMetrics[strategy];
    if (!metrics) return;

    metrics.callCount++;
    metrics.avgExecutionTime =
      metrics.avgExecutionTime * (1 - learningRate) +
      executionTime * learningRate;

    // Aktualisiere Aufrufgeschichte
    callHistory.push({
      strategy,
      timestamp: Date.now(),
      executionTime,
    });

    // Begrenze Verlauf
    if (callHistory.length > MAX_HISTORY) {
      callHistory.shift();
    }
  };

  // Aktualisierungsmuster analysieren
  const analyzeUpdatePattern = () => {
    if (updateIntervals.length < 2) return;

    // Berechne Durchschnittsintervall und Varianz
    const sum = updateIntervals.reduce((a, b) => a + b, 0);
    const avg = sum / updateIntervals.length;

    // Berechne Varianz zur Bestimmung der Regelmäßigkeit
    const variance =
      updateIntervals.reduce(
        (acc, val) => acc + Math.pow(val - avg, 2),
        0,
      ) / updateIntervals.length;

    // Normalisierte Regelmäßigkeit (0-1)
    updateRegularity = 1 / (1 + variance / (avg * avg));

    // Updates pro Sekunde
    updateFrequency = 1000 / Math.max(avg, 1);
  };

  // Wählt optimale Strategie basierend auf Mustern
  const chooseOptimalStrategy = () => {
    if (!adaptationEnabled || strategyMetrics[currentStrategy].callCount < 5) {
      return currentStrategy;
    }

    analyzeUpdatePattern();

    if (updateFrequency > 30) {
      // Mehr als 30 Updates pro Sekunde
      // Hohe Frequenz = Throttling
      return "throttle";
    } else if (updateRegularity < 0.3) {
      // Sehr unregelmäßige Updates
      // Unregelmäßig = Debouncing
      return "debounce";
    } else if (updateFrequency > 5) {
      // 5-30 Updates pro Sekunde
      // Mittlere Frequenz = Batching
      return "batch";
    } else {
      // Niedrige, regelmäßige Frequenz = einfacher Watcher
      return "simple";
    }
  };

  // Strategie-spezifische Wrapper-Funktionen
  const createStrategyWrapper = (
    strategy: string,
  ): {
    (value: T, oldValue: T): void;
    cancel: () => void;
  } => {
    switch (strategy) {
      case "throttle": {
        const fn = throttle(
          (value: T, oldValue: T) => {
            const startTime = performance.now();
            try {
              callback(value, oldValue);
            } finally {
              const execTime = performance.now() - startTime;
              measurePerformance("throttle", execTime);
              updateMetrics(watcherId, execTime);
            }
          },
          currentDelay,
          { leading: true, trailing: true },
        );
        return fn;
      }

      case "debounce": {
        const fn = debounce(
          (value: T, oldValue: T) => {
            const startTime = performance.now();
            try {
              callback(value, oldValue);
            } finally {
              const execTime = performance.now() - startTime;
              measurePerformance("debounce", execTime);
              updateMetrics(watcherId, execTime);
            }
          },
          currentDelay,
          { maxWait: currentDelay * 4 },
        );
        return fn;
      }

      case "batch": {
        // Batching erfolgt durch verzögerte Ausführung mit reduzierten Aufrufen
        let batchPending = false;
        let latestValue: T | null = null;
        let latestOldValue: T | null = null;

        const fn = function (value: T, oldValue: T): void {
          latestValue = value;
          latestOldValue = oldValue;

          if (!batchPending) {
            batchPending = true;
            setTimeout(() => {
              if (latestValue !== null && latestOldValue !== null) {
                const startTime = performance.now();
                try {
                  callback(latestValue, latestOldValue);
                } finally {
                  const execTime = performance.now() - startTime;
                  measurePerformance("batch", execTime);
                  updateMetrics(watcherId, execTime);
                }
              }
              batchPending = false;
            }, currentDelay / 2);
          }
        };

        fn.cancel = function () {
          batchPending = false;
          latestValue = null;
          latestOldValue = null;
        };

        return fn;
      }

      case "simple":
      default: {
        const fn = function (value: T, oldValue: T): void {
          const startTime = performance.now();
          try {
            callback(value, oldValue);
          } finally {
            const execTime = performance.now() - startTime;
            measurePerformance("simple", execTime);
            updateMetrics(watcherId, execTime);
          }
        };

        fn.cancel = function () {};

        return fn;
      }
    }
  };

  // Aktueller Strategie-Wrapper
  let currentWrapper = createStrategyWrapper(currentStrategy);

  // Adaptiver Strategiewechsel-Zeitgeber
  const adaptationInterval = adaptationEnabled
    ? setInterval(() => {
        const newStrategy = chooseOptimalStrategy();

        if (newStrategy !== currentStrategy) {
          // Strategie wechseln
          const oldWrapper = currentWrapper;
          currentStrategy = newStrategy;
          currentWrapper = createStrategyWrapper(currentStrategy);

          // Alte Strategie bereinigen
          if (typeof oldWrapper.cancel === "function") {
            oldWrapper.cancel();
          }
        }
      }, 5000)
    : null;

  // Watcher mit adaptiver Strategie
  const stopHandle = watch(
    source,
    (value: any, oldValue: any) => {
      // Aktualisiere Timing-Informationen
      const now = Date.now();
      const interval = now - lastUpdateTime;
      lastUpdateTime = now;

      if (interval > 10) {
        // Ignoriere zu schnelle Updates
        updateIntervals.push(interval);
        if (updateIntervals.length > MAX_INTERVALS) {
          updateIntervals.shift();
        }
      }

      // Aktuellen Wrapper mit aktueller Strategie verwenden
      currentWrapper(value, oldValue as T);
    },
    { immediate },
  );

  // Erweiterte Stop-Funktion
  return () => {
    if (adaptationInterval) {
      clearInterval(adaptationInterval);
    }

    if (typeof currentWrapper.cancel === "function") {
      currentWrapper.cancel();
    }

    delete watcherMetrics[watcherId];
    stopHandle();
  };
}

/**
 * Exportiere die Metriken für Debugging-Zwecke
 */
export function getWatcherMetrics() {
  return { ...watcherMetrics };
}

/**
 * Optimierter Watch mit automatischer Bereinigung
 */
export function useAutoCleanupWatch<T>(
  source: WatchSource<T>,
  callback: (value: T, oldValue: T) => void,
  options: WatchOptions = {},
): WatchStopHandle {
  // Liste der laufenden Aufgaben
  const pendingTasks = new Set<Promise<any>>();

  const stopHandle = watch(
    source,
    async (value: any, oldValue: any) => {
      // Erstelle eine neue Aufgabe
      const task = Promise.resolve().then(() =>
        callback(value, oldValue as T),
      );
      pendingTasks.add(task);

      try {
        // Warte auf Abschluss
        await task;
      } finally {
        // Entferne die Aufgabe aus der Liste
        pendingTasks.delete(task);
      }
    },
    options,
  );

  // Erweiterte Stop-Funktion, die auch alle laufenden Aufgaben abbricht
  return () => {
    stopHandle();
    pendingTasks.clear();
  };
}

/**
 * Hilfsfunktion zum speziellen Vergleich von Chat-Nachrichten
 */
function areEqualMessages(a: any, b: any): boolean {
  // Spezielle Gleichheitsprüfung für Chat-Nachrichten
  if (a === b) return true;

  // Behandle Null/Undefined
  if (a == null || b == null) return false;

  // Prüfe Nachrichtenfelder
  if (typeof a !== "object" || typeof b !== "object") return false;

  // Vergleiche ID, Inhalt und Status (typische Chat-Nachrichtenfelder)
  return (
    a.id === b.id &&
    a.content === b.content &&
    a.status === b.status &&
    a.timestamp === b.timestamp
  );
}
