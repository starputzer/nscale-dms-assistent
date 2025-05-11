/**
 * Vue Composable für die Integration mit dem ErrorReportingService
 *
 * Bietet eine einfache Schnittstelle für Komponenten, um Fehler zu erfassen,
 * zu verfolgen und Fallbacks automatisch zu aktivieren.
 *
 * @version 1.0.0
 * @date 08.05.2025
 */

import {
  ref,
  reactive,
  computed,
  onErrorCaptured,
  onUnmounted,
  getCurrentInstance,
} from "vue";
import {
  useErrorReporting as useErrorReportingService,
  type ErrorSource,
  type ErrorReport,
  type ErrorReportingOptions,
} from "@/utils/errorReportingService";
import {
  useFallbackManager,
  type FallbackErrorSeverity,
} from "@/utils/fallbackManager";
import { useFeatureTogglesStore } from "@/stores/featureToggles";

/**
 * Interface für zurückgegebene Daten des Composables
 */
export interface ErrorReportingComposableReturn {
  /** Ob ein Fehler aufgetreten ist */
  hasError: ReturnType<typeof ref<boolean>>;
  /** Referenz zum aktuellen Fehler */
  currentError: ReturnType<typeof ref<ErrorReport | null>>;
  /** Ob Fallback aktiv ist */
  isFallbackActive: ReturnType<typeof computed<boolean>>;
  /** Fehler melden */
  reportError: (
    error: Error | string,
    options?: ErrorReportingComponentOptions,
  ) => string;
  /** Komponenten-Fehler melden */
  reportComponentError: (
    error: Error | string,
    options?: Omit<ErrorReportingComponentOptions, "source">,
  ) => string;
  /** API-Fehler melden */
  reportApiError: (
    endpoint: string,
    error: Error | string,
    options?: Omit<ErrorReportingComponentOptions, "source">,
  ) => string;
  /** Store-Fehler melden */
  reportStoreError: (
    storeName: string,
    error: Error | string,
    options?: Omit<ErrorReportingComponentOptions, "source">,
  ) => string;
  /** Fehlerstatus zurücksetzen */
  resetError: () => void;
  /** Fallback aktivieren */
  activateFallback: () => void;
  /** Fallback deaktivieren */
  deactivateFallback: () => void;
  /** Fehler ignorieren */
  ignoreError: (id: string) => boolean;
  /** Alle Fehler löschen */
  clearAllErrors: () => void;
  /** Liste der Fehler abrufen */
  getErrors: (limit?: number) => ErrorReport[];
  /** Fehleranzahl */
  errorCount: ReturnType<typeof computed<number>>;
}

/**
 * Optionen für die Fehlererfassung in Komponenten
 */
export interface ErrorReportingComponentOptions {
  /** Fehlerquelle */
  source?: {
    /** Typ der Quelle */
    type?: ErrorSource;
    /** Name der Quelle */
    name?: string;
  };
  /** Zugehöriges Feature */
  feature?: string;
  /** Schweregrad des Fehlers */
  severity?: FallbackErrorSeverity;
  /** Kontext-Informationen */
  context?: Record<string, any>;
  /** Ob Fallback aktiviert werden soll */
  activateFallback?: boolean;
  /** Ob Fehler an externe Dienste gemeldet werden soll */
  report?: boolean;
}

/**
 * Optionen für das ErrorReporting-Composable
 */
export interface ErrorReportingHookOptions {
  /** Feature-Flag für automatischen Fallback */
  featureFlag?: string;
  /** Ob Fehler in der Komponente automatisch erfasst werden sollen */
  captureComponentErrors?: boolean;
  /** Ob ein Fehler zu einem automatischen Fallback führen soll */
  automaticFallback?: boolean;
  /** Ob der Fallback nach Fehlerbeseitigung automatisch zurückgesetzt werden soll */
  autoRecovery?: boolean;
  /** Standardschweregrad für erfasste Fehler */
  defaultSeverity?: FallbackErrorSeverity;
  /** Weiteren Optionen für den ErrorReportingService */
  serviceOptions?: ErrorReportingOptions;
}

/**
 * Composable für die Verwendung des Error-Reporting-Systems in Komponenten
 *
 * @param options Optionen für das Composable
 * @returns Interface mit Funktionen und Zustandsvariablen
 */
export function useErrorReporting(
  options: ErrorReportingHookOptions = {},
): ErrorReportingComposableReturn {
  // Standard-Optionen
  const {
    featureFlag,
    captureComponentErrors = true,
    automaticFallback = true,
    autoRecovery = true,
    defaultSeverity = "medium",
    serviceOptions = {},
  } = options;

  // Zugrundeliegende Services
  const errorService = useErrorReportingService(serviceOptions);
  const fallbackManager = useFallbackManager();
  const featureToggles = useFeatureTogglesStore();

  // Komponenten-Kontext abrufen
  const instance = getCurrentInstance();
  const componentName =
    instance?.type?.name ||
    instance?.type.__name ||
    instance?.vnode?.type?.name ||
    "UnknownComponent";

  // Lokaler Zustand
  const hasError = ref<boolean>(false);
  const currentError = ref<ErrorReport | null>(null);
  const localErrors = ref<string[]>([]);

  // Fallback-Status berechnen
  const isFallbackActive = computed(() => {
    if (!featureFlag) return false;
    return featureToggles.isFallbackActive(featureFlag);
  });

  // Fehleranzahl berechnen
  const errorCount = computed(() => {
    return localErrors.value.length;
  });

  /**
   * Komponenten-Fehler melden
   * @param error Der Fehler
   * @param options Zusätzliche Optionen
   * @returns ID des erstellten Fehlerberichts
   */
  function reportComponentError(
    error: Error | string,
    options: Omit<ErrorReportingComponentOptions, "source"> = {},
  ): string {
    return reportError(error, {
      ...options,
      source: {
        type: "component",
        name: options.source?.name || componentName,
      },
    });
  }

  /**
   * API-Fehler melden
   * @param endpoint Betroffener API-Endpoint
   * @param error Der Fehler
   * @param options Zusätzliche Optionen
   * @returns ID des erstellten Fehlerberichts
   */
  function reportApiError(
    endpoint: string,
    error: Error | string,
    options: Omit<ErrorReportingComponentOptions, "source"> = {},
  ): string {
    return reportError(error, {
      ...options,
      source: {
        type: "api",
        name: endpoint,
      },
    });
  }

  /**
   * Store-Fehler melden
   * @param storeName Name des Stores
   * @param error Der Fehler
   * @param options Zusätzliche Optionen
   * @returns ID des erstellten Fehlerberichts
   */
  function reportStoreError(
    storeName: string,
    error: Error | string,
    options: Omit<ErrorReportingComponentOptions, "source"> = {},
  ): string {
    return reportError(error, {
      ...options,
      source: {
        type: "store",
        name: storeName,
      },
    });
  }

  /**
   * Allgemeinen Fehler melden
   * @param error Der Fehler
   * @param options Zusätzliche Optionen
   * @returns ID des erstellten Fehlerberichts
   */
  function reportError(
    error: Error | string,
    options: ErrorReportingComponentOptions = {},
  ): string {
    // Zu verwendende Feature-ID bestimmen
    const feature = options.feature || featureFlag;

    // Standardwerte für Quelle
    const source = options.source || {
      type: "component" as ErrorSource,
      name: componentName,
    };

    // Fehler erstellen
    let errorId: string;

    if (source.type === "component") {
      errorId = errorService.captureComponentError(source.name!, error, {
        feature,
        severity: options.severity || defaultSeverity,
        context: options.context || {},
      });
    } else if (source.type === "api") {
      errorId = errorService.captureApiError(source.name!, error, {
        feature,
        severity: options.severity || defaultSeverity,
        context: options.context || {},
      });
    } else if (source.type === "store") {
      errorId = errorService.captureStoreError(source.name!, error, {
        feature,
        severity: options.severity || defaultSeverity,
        context: options.context || {},
      });
    } else {
      errorId = errorService.captureSourceError(
        source.type || "unknown",
        source.name!,
        error,
        {
          feature,
          severity: options.severity || defaultSeverity,
          context: options.context || {},
        },
      );
    }

    // Fehler lokal speichern
    const report = errorService.getErrorById(errorId);
    if (report) {
      currentError.value = report;
      hasError.value = true;

      // ID zur lokalen Liste hinzufügen
      if (!localErrors.value.includes(errorId)) {
        localErrors.value.push(errorId);
      }
    }

    // Fallback aktivieren, wenn gewünscht
    if ((options.activateFallback === true || automaticFallback) && feature) {
      activateFallback();
    }

    return errorId;
  }

  /**
   * Fehlerstatus zurücksetzen
   */
  function resetError(): void {
    hasError.value = false;
    currentError.value = null;
  }

  /**
   * Fallback aktivieren
   */
  function activateFallback(): void {
    if (!featureFlag) return;

    // Im FeatureToggles-Store aktivieren
    featureToggles.setFallbackMode(featureFlag, true);
  }

  /**
   * Fallback deaktivieren
   */
  function deactivateFallback(): void {
    if (!featureFlag) return;

    // Im FeatureToggles-Store deaktivieren
    featureToggles.setFallbackMode(featureFlag, false);

    // Eventuell auch Fehler löschen
    if (autoRecovery) {
      resetError();
    }
  }

  /**
   * Fehler ignorieren
   * @param id ID des Fehlers
   * @returns Ob erfolgreich
   */
  function ignoreError(id: string): boolean {
    // Aus lokaler Liste entfernen
    const index = localErrors.value.indexOf(id);
    if (index !== -1) {
      localErrors.value.splice(index, 1);
    }

    // Aus Service entfernen
    return errorService.dismissError(id);
  }

  /**
   * Alle Fehler löschen
   */
  function clearAllErrors(): void {
    // Lokale Fehler löschen
    localErrors.value = [];
    resetError();

    // Feature-Fehler im Store zurücksetzen, wenn Feature-Flag gesetzt
    if (featureFlag) {
      featureToggles.clearFeatureErrors(featureFlag);
    }
  }

  /**
   * Liste der Fehler abrufen
   * @param limit Maximale Anzahl
   * @returns Fehler-Liste
   */
  function getErrors(limit?: number): ErrorReport[] {
    // Nur Fehler zurückgeben, die lokal registriert sind
    if (localErrors.value.length === 0) {
      return [];
    }

    // Alle Fehler aus dem Service holen
    const allErrors = errorService.getErrors();

    // Nach lokalen Fehlern filtern
    const filteredErrors = allErrors.filter((err) =>
      localErrors.value.includes(err.id),
    );

    // Limit anwenden, wenn gesetzt
    if (limit && limit > 0) {
      return filteredErrors.slice(0, limit);
    }

    return filteredErrors;
  }

  // Fehler in der Komponente automatisch erfassen, wenn aktiviert
  if (captureComponentErrors && instance) {
    onErrorCaptured((error, vm, info) => {
      // Kontext-Informationen sammeln
      const context: Record<string, any> = {
        info,
        lifecycleHook: info,
        timestamp: new Date().toISOString(),
      };

      // Versuch, zusätzliche Informationen über die Komponente zu sammeln
      if (vm) {
        try {
          context.componentData = {
            name: vm.type?.name || vm.type.__name,
            props: { ...vm.props },
            // Sensitiven Zustand nicht einbeziehen
          };
        } catch (e) {
          // Fehler bei Informationssammlung ignorieren
        }
      }

      // Schweregrad bestimmen
      let severity: FallbackErrorSeverity = "medium";

      // Render-Fehler und Null-Referenzen sind kritischer
      if (
        info?.includes("render") ||
        error.message?.includes("null") ||
        error.message?.includes("undefined")
      ) {
        severity = "high";
      }

      // Fehler melden
      reportComponentError(error, {
        severity,
        context,
        // Fallback bei Render-Fehlern automatisch aktivieren
        activateFallback: info?.includes("render"),
      });

      // Nicht weiterpropagieren, wir haben uns drum gekümmert
      return false;
    });
  }

  // Ressourcen freigeben, wenn die Komponente unmounted wird
  onUnmounted(() => {
    // Nichts zu tun, da der ErrorReportingService global ist
    // und nicht von einer einzelnen Komponente freigegeben werden sollte
  });

  return {
    hasError,
    currentError,
    isFallbackActive,
    reportError,
    reportComponentError,
    reportApiError,
    reportStoreError,
    resetError,
    activateFallback,
    deactivateFallback,
    ignoreError,
    clearAllErrors,
    getErrors,
    errorCount,
  };
}

export default useErrorReporting;
