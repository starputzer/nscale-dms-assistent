/**
 * TypeScript-kompatible Diagnose-Tools für Bridge-Komponenten
 *
 * Diese Datei implementiert typsichere Diagnose-Tools für Bridge-Komponenten,
 * um Debugging, Performance-Überwachung und Fehlersuche zu erleichtern.
 */

import { createLogger } from "./logger/index";
import {
  BridgeErrorCode,
  BridgeResult,
  BridgeError,
  executeBridgeOperation,
  success,
  failure,
} from "./bridgeErrorUtils";
import {
  BridgeEventMap,
  BridgeHealthCheckEvent,
  BridgeMemoryEvent,
  BridgePerformanceEvent,
} from "./bridgeEventTypes";

// Logger für die Diagnose-Tools
const logger = createLogger("TypescriptDiagnosticTools");

/**
 * Namen der Bridge-Komponenten für die Diagnose
 */
export enum BridgeComponentName {
  EVENT_BUS = "EventBus",
  STATE_MANAGER = "StateManager",
  CHAT_BRIDGE = "ChatBridge",
  MEMORY_MANAGER = "MemoryManager",
  PERFORMANCE_MONITOR = "PerformanceMonitor",
  EVENT_LISTENER_MANAGER = "EventListenerManager",
  SELF_HEALING = "SelfHealing",
}

/**
 * Status einer Bridge-Komponente
 */
export enum BridgeComponentStatus {
  HEALTHY = "healthy",
  DEGRADED = "degraded",
  ERROR = "error",
  UNKNOWN = "unknown",
}

/**
 * Diagnose-Ergebnis für eine Bridge-Komponente
 */
export interface ComponentDiagnostic {
  name: BridgeComponentName | string;
  status: BridgeComponentStatus;
  memoryUsage?: number;
  issues: string[];
  warnings: string[];
  metrics: Record<string, number | string>;
  timestamp: number;
}

/**
 * Gesamtdiagnose für alle Bridge-Komponenten
 */
export interface BridgeDiagnosticReport {
  components: Record<string, ComponentDiagnostic>;
  overall: BridgeComponentStatus;
  timestamp: number;
  sessionInfo?: {
    activeSessionId?: string;
    sessionCount: number;
  };
  performanceMetrics: {
    eventProcessingTime?: number;
    stateUpdateTime?: number;
    memoryUsage?: number;
    gcCollections?: number;
  };
  recommendations: string[];
}

/**
 * Optionen für die Diagnose-Tools
 */
export interface DiagnosticOptions {
  detailed?: boolean;
  includePerformanceMetrics?: boolean;
  includeMemoryInfo?: boolean;
  componentFilter?: BridgeComponentName[] | string[];
}

/**
 * Interface für diagnostizierbare Komponenten
 */
export interface DiagnosticCapable {
  getDiagnostics(): Promise<BridgeResult<ComponentDiagnostic>>;
}

/**
 * Memory-Info aus dem Browser
 */
export interface MemoryInfo {
  jsHeapSizeLimit?: number;
  totalJSHeapSize?: number;
  usedJSHeapSize?: number;
  [key: string]: any;
}

/**
 * Basis-Klasse für Diagnose-Tools
 */
export class TypescriptDiagnosticTools {
  private componentName = "TypescriptDiagnosticTools";
  private components: Map<string, DiagnosticCapable> = new Map();
  private eventBus: {
    emit: <T extends keyof BridgeEventMap>(
      eventName: T,
      data: BridgeEventMap[T],
    ) => Promise<BridgeResult<void>>;
  } | null = null;

  constructor() {
    logger.info("TypeScript-kompatible Diagnose-Tools initialisiert");
  }

  /**
   * Registriert eine diagnostizierbare Komponente
   *
   * @param name Name der Komponente
   * @param component Die diagnostizierbare Komponente
   */
  public async registerComponent(
    name: BridgeComponentName | string,
    component: DiagnosticCapable,
  ): Promise<BridgeResult<void>> {
    return executeBridgeOperation(
      () => {
        this.components.set(name.toString(), component);
        logger.debug(`Komponente registriert: ${name}`);
      },
      {
        component: this.componentName,
        operationName: "registerComponent",
        errorCode: BridgeErrorCode.UNKNOWN_ERROR,
        errorMessage: `Fehler beim Registrieren der Komponente: ${name}`,
      },
    );
  }

  /**
   * Setzt den Event-Bus für Diagnose-Events
   *
   * @param eventBus Event-Bus-Instanz
   */
  public async setEventBus(eventBus: {
    emit: <T extends keyof BridgeEventMap>(
      eventName: T,
      data: BridgeEventMap[T],
    ) => Promise<BridgeResult<void>>;
  }): Promise<BridgeResult<void>> {
    return executeBridgeOperation(
      () => {
        this.eventBus = eventBus;
        logger.info("Event-Bus für Diagnose-Events gesetzt");
      },
      {
        component: this.componentName,
        operationName: "setEventBus",
        errorCode: BridgeErrorCode.UNKNOWN_ERROR,
        errorMessage: "Fehler beim Setzen des Event-Bus",
      },
    );
  }

  /**
   * Führt eine Gesamtdiagnose aller registrierten Komponenten durch
   *
   * @param options Diagnose-Optionen
   */
  public async runDiagnostics(
    options: DiagnosticOptions = {},
  ): Promise<BridgeResult<BridgeDiagnosticReport>> {
    return executeBridgeOperation(
      async () => {
        const startTime = Date.now();
        logger.info("Starte Gesamtdiagnose der Bridge-Komponenten");

        const componentResults: Record<string, ComponentDiagnostic> = {};
        let overallStatus = BridgeComponentStatus.HEALTHY;
        const issues: string[] = [];

        // Filtere Komponenten, falls gewünscht
        const componentsToCheck = options.componentFilter
          ? Array.from(this.components.entries()).filter(([name]) =>
              options.componentFilter!.includes(
                name as BridgeComponentName | string,
              ),
            )
          : Array.from(this.components.entries());

        // Sammle Diagnose-Ergebnisse aller Komponenten
        for (const [name, component] of componentsToCheck) {
          try {
            const componentDiagnostic = await component.getDiagnostics();

            if (componentDiagnostic.success) {
              componentResults[name] = componentDiagnostic.data;

              // Aktualisiere Gesamtstatus basierend auf Komponentenstatus
              if (
                componentDiagnostic.data.status === BridgeComponentStatus.ERROR
              ) {
                overallStatus = BridgeComponentStatus.ERROR;
                issues.push(
                  `Fehler in Komponente ${name}: ${componentDiagnostic.data.issues.join(", ")}`,
                );
              } else if (
                componentDiagnostic.data.status ===
                  BridgeComponentStatus.DEGRADED &&
                overallStatus !== BridgeComponentStatus.ERROR
              ) {
                overallStatus = BridgeComponentStatus.DEGRADED;
                issues.push(
                  `Beeinträchtigte Leistung in Komponente ${name}: ${componentDiagnostic.data.warnings.join(", ")}`,
                );
              }
            } else {
              logger.warn(
                `Fehler bei der Diagnose von Komponente ${name}:`,
                componentDiagnostic.error,
              );

              // Füge eine Standarddiagnose hinzu, wenn die Komponente keine liefern konnte
              componentResults[name] = {
                name: name as BridgeComponentName | string,
                status: BridgeComponentStatus.ERROR,
                issues: [
                  `Diagnose fehlgeschlagen: ${componentDiagnostic.error.message}`,
                ],
                warnings: [],
                metrics: {},
                timestamp: Date.now(),
              };

              overallStatus = BridgeComponentStatus.ERROR;
              issues.push(`Diagnose für Komponente ${name} fehlgeschlagen`);
            }
          } catch (error) {
            logger.error(
              `Unerwarteter Fehler bei der Diagnose von Komponente ${name}:`,
              error,
            );

            componentResults[name] = {
              name: name as BridgeComponentName | string,
              status: BridgeComponentStatus.ERROR,
              issues: ["Unerwarteter Fehler bei der Diagnose"],
              warnings: [],
              metrics: {},
              timestamp: Date.now(),
            };

            overallStatus = BridgeComponentStatus.ERROR;
            issues.push(
              `Unerwarteter Fehler bei der Diagnose von Komponente ${name}`,
            );
          }
        }

        // Sammle Performance-Metriken, falls gewünscht
        const performanceMetrics: BridgeDiagnosticReport["performanceMetrics"] =
          {};

        if (options.includePerformanceMetrics) {
          performanceMetrics.eventProcessingTime = this.calculateAverageMetric(
            componentResults,
            "eventProcessingTime",
          );

          performanceMetrics.stateUpdateTime = this.calculateAverageMetric(
            componentResults,
            "stateUpdateTime",
          );

          const endTime = Date.now();
          performanceMetrics.diagnosticDuration = endTime - startTime;
        }

        // Sammle Memory-Informationen, falls gewünscht
        if (options.includeMemoryInfo) {
          try {
            const memoryInfo = await this.getMemoryInfo();

            if (memoryInfo.success) {
              performanceMetrics.memoryUsage = memoryInfo.data.usedJSHeapSize;

              // Prüfe, ob der Memory-Verbrauch hoch ist
              const memoryLimit = memoryInfo.data.jsHeapSizeLimit || 0;
              const memoryUsage = memoryInfo.data.usedJSHeapSize || 0;

              if (memoryLimit > 0 && memoryUsage / memoryLimit > 0.85) {
                issues.push(
                  `Hoher Speicherverbrauch: ${Math.round(memoryUsage / 1024 / 1024)} MB (${Math.round((memoryUsage / memoryLimit) * 100)}%)`,
                );

                if (overallStatus === BridgeComponentStatus.HEALTHY) {
                  overallStatus = BridgeComponentStatus.DEGRADED;
                }

                // Sende ein Memory-Warn-Event, falls ein Event-Bus verfügbar ist
                if (this.eventBus) {
                  const memoryEvent: BridgeMemoryEvent = {
                    timestamp: Date.now(),
                    usedMemory: memoryUsage,
                    totalMemory: memoryLimit,
                    leakSuspect: memoryUsage / memoryLimit > 0.9,
                  };

                  await this.eventBus.emit("bridge:memoryWarning", memoryEvent);
                }
              }
            }
          } catch (error) {
            logger.warn("Fehler beim Abrufen der Memory-Informationen:", error);
          }
        }

        // Erstelle Diagnose-Bericht
        const report: BridgeDiagnosticReport = {
          components: componentResults,
          overall: overallStatus,
          timestamp: Date.now(),
          performanceMetrics,
          recommendations: this.generateRecommendations(
            componentResults,
            issues,
          ),
        };

        // Sende ein Health-Check-Event, falls ein Event-Bus verfügbar ist
        if (this.eventBus) {
          const healthCheck: BridgeHealthCheckEvent = {
            timestamp: Date.now(),
            components: Object.fromEntries(
              Object.entries(componentResults).map(([name, diagnostic]) => [
                name,
                {
                  status: diagnostic.status,
                  details:
                    diagnostic.issues.length > 0
                      ? diagnostic.issues[0]
                      : undefined,
                },
              ]),
            ),
            overall: overallStatus,
          };

          await this.eventBus.emit("bridge:healthCheck", healthCheck);

          // Sende ein Performance-Event, falls Performance-Metriken vorhanden sind
          if (options.includePerformanceMetrics) {
            const performanceEvent: BridgePerformanceEvent = {
              timestamp: Date.now(),
              metrics: performanceMetrics as Record<string, number>,
            };

            await this.eventBus.emit(
              "bridge:performanceReport",
              performanceEvent,
            );
          }
        }

        logger.info("Gesamtdiagnose abgeschlossen", {
          status: overallStatus,
          componentCount: Object.keys(componentResults).length,
          issues: issues.length,
        });

        return report;
      },
      {
        component: this.componentName,
        operationName: "runDiagnostics",
        errorCode: BridgeErrorCode.UNKNOWN_ERROR,
        errorMessage: "Fehler bei der Ausführung der Gesamtdiagnose",
      },
    );
  }

  /**
   * Führt eine Diagnose für eine bestimmte Komponente durch
   *
   * @param componentName Name der Komponente
   * @param options Diagnose-Optionen
   */
  public async diagnoseComponent(
    componentName: BridgeComponentName | string,
    options: DiagnosticOptions = {},
  ): Promise<BridgeResult<ComponentDiagnostic>> {
    return executeBridgeOperation(
      async () => {
        logger.info(`Starte Diagnose für Komponente: ${componentName}`);

        const component = this.components.get(componentName.toString());

        if (!component) {
          throw new Error(`Komponente nicht gefunden: ${componentName}`);
        }

        const result = await component.getDiagnostics();

        if (!result.success) {
          throw new Error(
            `Fehler bei der Diagnose von Komponente ${componentName}: ${result.error.message}`,
          );
        }

        logger.info(`Diagnose für Komponente ${componentName} abgeschlossen`, {
          status: result.data.status,
          issues: result.data.issues.length,
          warnings: result.data.warnings.length,
        });

        return result.data;
      },
      {
        component: this.componentName,
        operationName: "diagnoseComponent",
        errorCode: BridgeErrorCode.UNKNOWN_ERROR,
        errorMessage: `Fehler bei der Diagnose der Komponente: ${componentName}`,
      },
    );
  }

  /**
   * Sammelt Memory-Informationen aus dem Browser
   */
  private async getMemoryInfo(): Promise<BridgeResult<MemoryInfo>> {
    return executeBridgeOperation(
      () => {
        // Prüfe, ob Performance API verfügbar ist
        if (!window.performance) {
          throw new Error("Performance API nicht verfügbar");
        }

        // Prüfe, ob memory-Informationen verfügbar sind
        const memory = (performance as any).memory;

        if (!memory) {
          throw new Error("Memory-Informationen nicht verfügbar");
        }

        return {
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
          totalJSHeapSize: memory.totalJSHeapSize,
          usedJSHeapSize: memory.usedJSHeapSize,
        };
      },
      {
        component: this.componentName,
        operationName: "getMemoryInfo",
        errorCode: BridgeErrorCode.UNKNOWN_ERROR,
        errorMessage: "Fehler beim Abrufen der Memory-Informationen",
      },
    );
  }

  /**
   * Berechnet den Durchschnitt einer Metrik über alle Komponenten
   *
   * @param componentResults Die Komponenten-Diagnosen
   * @param metricName Der Name der Metrik
   */
  private calculateAverageMetric(
    componentResults: Record<string, ComponentDiagnostic>,
    metricName: string,
  ): number | undefined {
    const values: number[] = [];

    for (const diagnostic of Object.values(componentResults)) {
      const value = diagnostic.metrics[metricName];

      if (typeof value === "number") {
        values.push(value);
      }
    }

    if (values.length === 0) {
      return undefined;
    }

    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  /**
   * Generiert Empfehlungen basierend auf den Diagnose-Ergebnissen
   *
   * @param componentResults Die Komponenten-Diagnosen
   * @param issues Die gefundenen Probleme
   */
  private generateRecommendations(
    componentResults: Record<string, ComponentDiagnostic>,
    issues: string[],
  ): string[] {
    const recommendations: string[] = [];

    // Prüfe auf Komponentenprobleme
    for (const [name, diagnostic] of Object.entries(componentResults)) {
      if (diagnostic.status === BridgeComponentStatus.ERROR) {
        recommendations.push(
          `Komponente ${name} neu starten oder zurücksetzen`,
        );
      } else if (diagnostic.status === BridgeComponentStatus.DEGRADED) {
        recommendations.push(
          `Leistung von Komponente ${name} überwachen und optimieren`,
        );
      }
    }

    // Prüfe auf Memory-Probleme
    const memoryIssues = issues.filter((issue) =>
      issue.includes("Speicherverbrauch"),
    );

    if (memoryIssues.length > 0) {
      recommendations.push(
        "Speicherverbrauch reduzieren durch Aufräumen nicht benötigter Ressourcen",
      );
      recommendations.push(
        "Browser-Tab neuladen, falls Leistungsprobleme anhalten",
      );
    }

    // Standardempfehlungen
    if (recommendations.length === 0 && issues.length > 0) {
      recommendations.push(
        "Fehlerlogs prüfen, um die Ursache der Probleme zu identifizieren",
      );
    }

    return recommendations;
  }
}
