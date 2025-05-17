/**
 * ChatBridgeDiagnostics - Diagnosetools und Monitoring für die optimierte ChatBridge
 *
 * Diese Komponente bietet detaillierte Diagnostik, Leistungsüberwachung und
 * Fehlererkennung für die optimierte Chat-Bridge.
 */

import { createLogger, LogLevel } from "../logger/index";
import { PerformanceMonitor } from "./performanceMonitor";
import { SelectiveChatBridge } from "./selectiveChatBridge";
import { EventListenerManager } from "./eventListenerManager";
import { BatchedEventEmitter } from "./batchedEventEmitter";
import { BridgeStatusManager } from "../statusManager";
import { BridgeErrorState } from "../types";

// Konfiguration
interface ChatBridgeDiagnosticsConfig {
  enabled: boolean; // Diagnostik aktivieren
  enableConsoleCommands: boolean; // Konsolenbefehle aktivieren
  enablePerformanceMonitoring: boolean; // Leistungsüberwachung aktivieren
  enableAutoReporting: boolean; // Automatische Berichte aktivieren
  enableDeveloperToolbar: boolean; // Entwickler-Symbolleiste aktivieren
  autoReportIntervalMs: number; // Intervall für automatische Berichte (ms)
  metricSamplingRateMs: number; // Abtastrate für Metriken (ms)
  maxMetricsHistory: number; // Maximale Anzahl an Metriken speichern
  maxLogsHistory: number; // Maximale Anzahl an Logs speichern
  alertThresholds: {
    // Schwellwerte für Warnungen
    highLatencyMs: number; // Schwellwert für hohe Latenz (ms)
    memorySpikePercent: number; // Schwellwert für Speicherspitzen (%)
    errorRateThreshold: number; // Schwellwert für Fehlerrate
    inactivityTimeoutMs: number; // Schwellwert für Inaktivität (ms)
  };
}

// Standard-Konfiguration
const DEFAULT_CONFIG: ChatBridgeDiagnosticsConfig = {
  enabled: true,
  enableConsoleCommands: true,
  enablePerformanceMonitoring: true,
  enableAutoReporting: false,
  enableDeveloperToolbar: false,
  autoReportIntervalMs: 300000, // 5 Minuten
  metricSamplingRateMs: 5000, // 5 Sekunden
  maxMetricsHistory: 100,
  maxLogsHistory: 200,
  alertThresholds: {
    highLatencyMs: 500,
    memorySpikePercent: 30,
    errorRateThreshold: 0.1, // 10%
    inactivityTimeoutMs: 30000, // 30 Sekunden
  },
};

// Diagnose-Log-Eintrag
interface DiagnosticLogEntry {
  timestamp: number;
  level: "debug" | "info" | "warn" | "error";
  component: string;
  message: string;
  data?: any;
}

// Metrik-Erfassung
interface MetricDataPoint {
  timestamp: number;
  name: string;
  value: number;
  unit: string;
  category: string;
  subcategory?: string;
}

// Leistungswarnungen
interface PerformanceAlert {
  id: string;
  timestamp: number;
  type: "latency" | "memory" | "error" | "inactivity" | "other";
  severity: "info" | "warning" | "critical";
  message: string;
  metric?: string;
  value?: number;
  threshold?: number;
  resolved: boolean;
  resolvedAt?: number;
}

// Diagnose-Bericht
interface DiagnosticReport {
  id: string;
  timestamp: number;
  bridgeStatus: {
    isInitialized: boolean;
    connectionStatus: string;
    errorCount: number;
    syncCount: number;
    recoveryAttempts: number;
  };
  metrics: {
    latency: {
      avg: number;
      max: number;
      p95: number;
    };
    memory: {
      estimate: number;
      listeners: number;
      eventBatches: number;
    };
    performance: {
      messageProcessingTimeAvg: number;
      batchProcessingTimeAvg: number;
      syncOperationsPerSecond: number;
    };
    errorRate: number;
  };
  alerts: PerformanceAlert[];
  recommendations: string[];
}

/**
 * ChatBridgeDiagnostics bietet Überwachung und Diagnose für die optimierte ChatBridge
 */
export class ChatBridgeDiagnostics {
  private logger;
  private config: ChatBridgeDiagnosticsConfig;
  private performanceMonitor: PerformanceMonitor;
  private statusManager: BridgeStatusManager;

  // Komponenten-Referenzen
  private chatBridge?: SelectiveChatBridge;
  private eventListenerManager?: EventListenerManager;
  private batchedEventEmitter?: BatchedEventEmitter;

  // Diagnose-Daten
  private logs: DiagnosticLogEntry[] = [];
  private metrics: MetricDataPoint[] = [];
  private alerts: PerformanceAlert[] = [];
  private reports: DiagnosticReport[] = [];

  // Timer
  private metricSamplingTimerId: number | null = null;
  private autoReportTimerId: number | null = null;

  // Statistiken
  private lastPingTime: number = 0;
  private lastPongTime: number = 0;
  private pingPongLatencies: number[] = [];
  private errorCounts: number = 0;
  private operationCounts: number = 0;

  // UI-Elemente
  private developerToolbar: HTMLElement | null = null;

  /**
   * Konstruktor
   */
  constructor(
    performanceMonitor: PerformanceMonitor,
    statusManager: BridgeStatusManager,
    config: Partial<ChatBridgeDiagnosticsConfig> = {},
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.performanceMonitor = performanceMonitor;
    this.statusManager = statusManager;

    this.logger = createLogger("ChatBridgeDiagnostics");

    // Konsolen-Befehle registrieren
    if (this.config.enableConsoleCommands) {
      this.registerConsoleCommands();
    }

    this.logger.info("ChatBridgeDiagnostics initialisiert", {
      perfMonitoring: this.config.enablePerformanceMonitoring,
      autoReporting: this.config.enableAutoReporting,
    });
  }

  /**
   * Komponenten registrieren
   */
  public registerComponents(
    chatBridge?: SelectiveChatBridge,
    eventListenerManager?: EventListenerManager,
    batchedEventEmitter?: BatchedEventEmitter,
  ): void {
    this.chatBridge = chatBridge;
    this.eventListenerManager = eventListenerManager;
    this.batchedEventEmitter = batchedEventEmitter;

    // Metriken-Erfassung starten, wenn konfiguriert
    if (this.config.enablePerformanceMonitoring) {
      this.startMetricSampling();
    }

    // Automatische Berichte starten, wenn konfiguriert
    if (this.config.enableAutoReporting) {
      this.startAutoReporting();
    }

    // Entwickler-Symbolleiste erstellen, wenn konfiguriert
    if (this.config.enableDeveloperToolbar) {
      this.createDeveloperToolbar();
    }

    this.logger.info("Komponenten registriert", {
      hasChatBridge: !!this.chatBridge,
      hasEventListenerManager: !!this.eventListenerManager,
      hasBatchedEventEmitter: !!this.batchedEventEmitter,
    });
  }

  /**
   * Diagnose-Log hinzufügen
   */
  public log(
    level: "debug" | "info" | "warn" | "error",
    component: string,
    message: string,
    data?: any,
  ): void {
    // Log-Eintrag erstellen
    const logEntry: DiagnosticLogEntry = {
      timestamp: Date.now(),
      level,
      component,
      message,
      data,
    };

    // Zum Log-Array hinzufügen
    this.logs.push(logEntry);

    // Größe begrenzen
    if (this.logs.length > this.config.maxLogsHistory) {
      this.logs.shift();
    }

    // Fehler zählen
    if (level === "error") {
      this.errorCounts++;

      // Warnungen für Fehler generieren
      if (this.errorCounts > 5) {
        this.createAlert(
          "error",
          "critical",
          `Häufige Fehler erkannt: ${this.errorCounts} in kurzer Zeit`,
          "errorCount",
          this.errorCounts,
        );
      }
    }

    // In Logger ausgeben
    switch (level) {
      case "debug":
        this.logger.debug(`[${component}] ${message}`, data);
        break;
      case "info":
        this.logger.info(`[${component}] ${message}`, data);
        break;
      case "warn":
        this.logger.warn(`[${component}] ${message}`, data);
        break;
      case "error":
        this.logger.error(`[${component}] ${message}`, data);
        break;
    }
  }

  /**
   * Metrik aufzeichnen
   */
  public recordMetric(
    name: string,
    value: number,
    unit: string,
    category: string,
    subcategory?: string,
  ): void {
    // Metrik-Datenpunkt erstellen
    const dataPoint: MetricDataPoint = {
      timestamp: Date.now(),
      name,
      value,
      unit,
      category,
      subcategory,
    };

    // Zu Metriken hinzufügen
    this.metrics.push(dataPoint);

    // Größe begrenzen
    if (this.metrics.length > this.config.maxMetricsHistory) {
      this.metrics.shift();
    }

    // An Performance-Monitor weiterleiten
    if (this.performanceMonitor) {
      this.performanceMonitor.recordMetric(
        name,
        value,
        unit,
        category,
        subcategory,
      );
    }

    // Schwellwerte prüfen und Warnungen generieren
    this.checkThresholds(dataPoint);
  }

  /**
   * Ping-Test durchführen
   */
  public async pingTest(
    count: number = 5,
    intervalMs: number = 100,
  ): Promise<{
    avgLatency: number;
    maxLatency: number;
    p95Latency: number;
    success: boolean;
  }> {
    if (!this.chatBridge) {
      this.log(
        "error",
        "diagnostics",
        "Ping-Test fehlgeschlagen: Keine ChatBridge verfügbar",
      );
      return { avgLatency: -1, maxLatency: -1, p95Latency: -1, success: false };
    }

    this.log(
      "info",
      "diagnostics",
      `Starte Ping-Test (${count} Pings mit ${intervalMs}ms Intervall)`,
    );

    try {
      const latencies: number[] = [];

      // Ping-Pong-Runden durchführen
      for (let i = 0; i < count; i++) {
        const startTime = performance.now();
        this.lastPingTime = startTime;

        // Ping senden und auf Antwort warten
        const connectionTest = await (this.chatBridge as any).testConnection();

        if (connectionTest && connectionTest.connected) {
          const endTime = performance.now();
          const latency = endTime - startTime;
          latencies.push(latency);
          this.pingPongLatencies.push(latency);

          // Ping-Pong-Verlauf begrenzen
          if (this.pingPongLatencies.length > 20) {
            this.pingPongLatencies.shift();
          }

          this.lastPongTime = endTime;
        }

        // Warten, bevor der nächste Ping gesendet wird
        if (i < count - 1) {
          await new Promise((resolve) => setTimeout(resolve, intervalMs));
        }
      }

      // Ergebnisse berechnen
      if (latencies.length === 0) {
        this.log(
          "error",
          "diagnostics",
          "Ping-Test fehlgeschlagen: Keine Antworten erhalten",
        );
        return {
          avgLatency: -1,
          maxLatency: -1,
          p95Latency: -1,
          success: false,
        };
      }

      const avgLatency =
        latencies.reduce((sum, val) => sum + val, 0) / latencies.length;
      const maxLatency = Math.max(...latencies);

      // P95 berechnen
      const sortedLatencies = [...latencies].sort((a, b) => a - b);
      const p95Index = Math.floor(sortedLatencies.length * 0.95);
      const p95Latency = sortedLatencies[p95Index];

      // Schwellwert-Prüfung
      if (avgLatency > this.config.alertThresholds.highLatencyMs) {
        this.createAlert(
          "latency",
          avgLatency > this.config.alertThresholds.highLatencyMs * 2
            ? "critical"
            : "warning",
          `Hohe Latenz erkannt: ${avgLatency.toFixed(2)}ms`,
          "avgLatency",
          avgLatency,
        );
      }

      this.log(
        "info",
        "diagnostics",
        `Ping-Test abgeschlossen: Durchschnitt ${avgLatency.toFixed(2)}ms, Max ${maxLatency.toFixed(2)}ms`,
      );

      return {
        avgLatency,
        maxLatency,
        p95Latency,
        success: true,
      };
    } catch (error) {
      this.log(
        "error",
        "diagnostics",
        "Ping-Test fehlgeschlagen mit Fehler",
        error,
      );
      return { avgLatency: -1, maxLatency: -1, p95Latency: -1, success: false };
    }
  }

  /**
   * Warnung erstellen
   */
  private createAlert(
    type: PerformanceAlert["type"],
    severity: PerformanceAlert["severity"],
    message: string,
    metricName?: string,
    value?: number,
    threshold?: number,
  ): PerformanceAlert {
    const id = `alert_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Prüfen, ob eine ähnliche Warnung bereits existiert
    const existingAlert = this.alerts.find(
      (alert) =>
        alert.type === type && alert.message === message && !alert.resolved,
    );

    if (existingAlert) {
      // Bestehende Warnung aktualisieren
      existingAlert.timestamp = Date.now();
      if (value !== undefined) existingAlert.value = value;

      // Kritischer machen, wenn der Wert sich verschlechtert hat
      if (
        existingAlert.severity !== "critical" &&
        value !== undefined &&
        existingAlert.value !== undefined &&
        value > existingAlert.value * 1.5
      ) {
        existingAlert.severity = "critical";
      }

      this.log("warn", "diagnostics", `Warnung aktualisiert: ${message}`, {
        id: existingAlert.id,
        type,
        severity: existingAlert.severity,
      });

      return existingAlert;
    }

    // Neue Warnung erstellen
    const alert: PerformanceAlert = {
      id,
      timestamp: Date.now(),
      type,
      severity,
      message,
      metric: metricName,
      value,
      threshold,
      resolved: false,
    };

    this.alerts.push(alert);

    // Log-Eintrag erstellen
    this.log(
      severity === "critical"
        ? "error"
        : severity === "warning"
          ? "warn"
          : "info",
      "diagnostics",
      `Neue Warnung: ${message}`,
      { id, type, severity },
    );

    // Bridge-Status aktualisieren, wenn kritisch
    if (severity === "critical") {
      this.statusManager.updateStatus({
        state: BridgeErrorState.DEGRADED_PERFORMANCE,
        message: `Leistungsproblem erkannt: ${message}`,
        affectedComponents: ["ChatBridge"],
      });
    }

    return alert;
  }

  /**
   * Warnung als gelöst markieren
   */
  public resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find((a) => a.id === alertId);

    if (!alert) {
      return false;
    }

    alert.resolved = true;
    alert.resolvedAt = Date.now();

    this.log("info", "diagnostics", `Warnung gelöst: ${alert.message}`, {
      id: alert.id,
      type: alert.type,
    });

    return true;
  }

  /**
   * Schwellwerte prüfen
   */
  private checkThresholds(metric: MetricDataPoint): void {
    // Latenz-Warnung
    if (
      metric.name.includes("latency") &&
      metric.value > this.config.alertThresholds.highLatencyMs
    ) {
      this.createAlert(
        "latency",
        metric.value > this.config.alertThresholds.highLatencyMs * 2
          ? "critical"
          : "warning",
        `Hohe Latenz bei ${metric.name}: ${metric.value.toFixed(2)}ms`,
        metric.name,
        metric.value,
        this.config.alertThresholds.highLatencyMs,
      );
    }

    // Speicher-Warnung
    if (
      metric.name.includes("memory") &&
      metric.subcategory === "usage" &&
      metric.value > 0
    ) {
      // Vorherige Messung finden
      const previousMetrics = this.metrics
        .filter((m) => m.name === metric.name && m.timestamp < metric.timestamp)
        .sort((a, b) => b.timestamp - a.timestamp);

      if (previousMetrics.length > 0) {
        const previousMetric = previousMetrics[0];
        const percentIncrease =
          ((metric.value - previousMetric.value) / previousMetric.value) * 100;

        if (percentIncrease > this.config.alertThresholds.memorySpikePercent) {
          this.createAlert(
            "memory",
            percentIncrease > this.config.alertThresholds.memorySpikePercent * 2
              ? "critical"
              : "warning",
            `Speicherspitze erkannt bei ${metric.name}: ${percentIncrease.toFixed(1)}% Anstieg`,
            metric.name,
            percentIncrease,
            this.config.alertThresholds.memorySpikePercent,
          );
        }
      }
    }

    // Inaktivitäts-Warnung
    if (
      metric.name === "bridge.lastActivityMs" &&
      metric.value > this.config.alertThresholds.inactivityTimeoutMs
    ) {
      this.createAlert(
        "inactivity",
        metric.value > this.config.alertThresholds.inactivityTimeoutMs * 2
          ? "critical"
          : "warning",
        `Ungewöhnliche Inaktivität der Bridge: ${(metric.value / 1000).toFixed(1)}s`,
        metric.name,
        metric.value,
        this.config.alertThresholds.inactivityTimeoutMs,
      );
    }
  }

  /**
   * Diagnose-Bericht generieren
   */
  public generateReport(): DiagnosticReport {
    this.log("info", "diagnostics", "Generiere Diagnose-Bericht");

    try {
      // Bridge-Status abrufen
      const bridgeStatus = {
        isInitialized: this.chatBridge
          ? (this.chatBridge as any).isInitialized()
          : false,
        connectionStatus: this.chatBridge
          ? (this.chatBridge as any).connectionStatus?.value || "unknown"
          : "unknown",
        errorCount: this.errorCounts,
        syncCount: this.operationCounts,
        recoveryAttempts: this.chatBridge
          ? (this.chatBridge as any).syncStatus?.value?.recoveryAttempts || 0
          : 0,
      };

      // Latenz-Metriken
      const latencies =
        this.pingPongLatencies.length > 0 ? this.pingPongLatencies : [0];
      const avgLatency =
        latencies.reduce((sum, val) => sum + val, 0) / latencies.length;
      const maxLatency = Math.max(...latencies);
      const sortedLatencies = [...latencies].sort((a, b) => a - b);
      const p95Index = Math.floor(sortedLatencies.length * 0.95);
      const p95Latency = sortedLatencies[p95Index] || 0;

      // Speicher-Metriken
      const memoryEstimate = this.eventListenerManager
        ? (this.eventListenerManager as any).getStats()?.memoryEstimate || 0
        : 0;
      const listenersCount = this.eventListenerManager
        ? (this.eventListenerManager as any).getStats()?.activeCount || 0
        : 0;
      const eventBatchesCount = this.batchedEventEmitter
        ? (this.batchedEventEmitter as any).getStats()?.batchedEvents || 0
        : 0;

      // Leistungs-Metriken
      const messageProcessingMetrics = this.metrics.filter(
        (m) => m.name === "chatBridge.syncMessagesDuration",
      );
      const batchProcessingMetrics = this.metrics.filter(
        (m) => m.name === "batchedEventEmitter.processingTime",
      );

      const messageProcessingTimeAvg =
        messageProcessingMetrics.length > 0
          ? messageProcessingMetrics.reduce((sum, m) => sum + m.value, 0) /
            messageProcessingMetrics.length
          : 0;

      const batchProcessingTimeAvg =
        batchProcessingMetrics.length > 0
          ? batchProcessingMetrics.reduce((sum, m) => sum + m.value, 0) /
            batchProcessingMetrics.length
          : 0;

      // Fehlerrate
      const syncOpCount = this.metrics.filter(
        (m) => m.name === "chatBridge.syncOperations",
      ).length;
      const errorRate = syncOpCount > 0 ? this.errorCounts / syncOpCount : 0;

      // Aktive Warnungen sammeln
      const activeAlerts = this.alerts.filter((a) => !a.resolved);

      // Empfehlungen generieren
      const recommendations: string[] = [];

      if (avgLatency > this.config.alertThresholds.highLatencyMs) {
        recommendations.push(
          "Überprüfe die Netzwerklatenz und optimiere die Event-Batching-Konfiguration",
        );
      }

      if (errorRate > this.config.alertThresholds.errorRateThreshold) {
        recommendations.push(
          "Erhöhe die Self-Healing-Kapazität und verbessere die Fehlerbehandlung",
        );
      }

      if (memoryEstimate > 5000000) {
        // 5 MB
        recommendations.push(
          "Überprüfe Memory-Leaks bei Event-Listenern und optimiere die Cache-Größen",
        );
      }

      if (messageProcessingTimeAvg > 100) {
        // 100ms
        recommendations.push(
          "Optimiere die Nachrichtenverarbeitung durch selektivere Synchronisation",
        );
      }

      if (activeAlerts.some((a) => a.type === "inactivity")) {
        recommendations.push(
          "Überprüfe Verbindungsprobleme zwischen Vue- und Legacy-Komponenten",
        );
      }

      // Bericht erstellen
      const report: DiagnosticReport = {
        id: `report_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        timestamp: Date.now(),
        bridgeStatus,
        metrics: {
          latency: {
            avg: avgLatency,
            max: maxLatency,
            p95: p95Latency,
          },
          memory: {
            estimate: memoryEstimate,
            listeners: listenersCount,
            eventBatches: eventBatchesCount,
          },
          performance: {
            messageProcessingTimeAvg,
            batchProcessingTimeAvg,
            syncOperationsPerSecond:
              syncOpCount > 0
                ? syncOpCount / (messageProcessingMetrics.length || 1)
                : 0,
          },
          errorRate,
        },
        alerts: activeAlerts,
        recommendations,
      };

      // Bericht speichern
      this.reports.push(report);

      // Größe begrenzen
      if (this.reports.length > 10) {
        this.reports.shift();
      }

      return report;
    } catch (error) {
      this.log(
        "error",
        "diagnostics",
        "Fehler bei der Berichtserstellung",
        error,
      );

      // Minimal-Bericht im Fehlerfall
      return {
        id: `error_report_${Date.now()}`,
        timestamp: Date.now(),
        bridgeStatus: {
          isInitialized: false,
          connectionStatus: "error",
          errorCount: this.errorCounts + 1,
          syncCount: this.operationCounts,
          recoveryAttempts: 0,
        },
        metrics: {
          latency: { avg: 0, max: 0, p95: 0 },
          memory: { estimate: 0, listeners: 0, eventBatches: 0 },
          performance: {
            messageProcessingTimeAvg: 0,
            batchProcessingTimeAvg: 0,
            syncOperationsPerSecond: 0,
          },
          errorRate: 1,
        },
        alerts: [
          {
            id: `error_${Date.now()}`,
            timestamp: Date.now(),
            type: "error",
            severity: "critical",
            message: `Fehler bei der Berichtserstellung: ${(error as Error).message}`,
            resolved: false,
          },
        ],
        recommendations: ["Überprüfe Diagnose-Komponente und Bridge-Zustand"],
      };
    }
  }

  /**
   * Metriken-Erfassung starten
   */
  private startMetricSampling(): void {
    if (this.metricSamplingTimerId !== null) {
      window.clearInterval(this.metricSamplingTimerId);
    }

    this.metricSamplingTimerId = window.setInterval(() => {
      this.sampleMetrics();
    }, this.config.metricSamplingRateMs);

    this.log("debug", "diagnostics", "Metriken-Erfassung gestartet", {
      interval: this.config.metricSamplingRateMs,
    });
  }

  /**
   * Metriken erfassen
   */
  private sampleMetrics(): void {
    try {
      if (!this.chatBridge) return;

      // Ping-Test in niedriger Frequenz
      const lastPingAge = Date.now() - this.lastPingTime;
      if (lastPingAge > 30000) {
        // 30 Sekunden
        this.pingTest(1).catch(() => {
          /* Ignorieren */
        });
      }

      // Bridge-Aktivität berechnen
      const lastActivity = Math.min(this.lastPingTime, this.lastPongTime);

      if (lastActivity > 0) {
        const inactivityMs = Date.now() - lastActivity;
        this.recordMetric(
          "bridge.lastActivityMs",
          inactivityMs,
          "ms",
          "bridge",
          "activity",
        );

        // Inaktivitäts-Warnung auflösen, wenn wieder aktiv
        if (inactivityMs < this.config.alertThresholds.inactivityTimeoutMs) {
          const inactivityAlerts = this.alerts.filter(
            (a) => a.type === "inactivity" && !a.resolved,
          );

          for (const alert of inactivityAlerts) {
            this.resolveAlert(alert.id);
          }
        }
      }

      // Speicherverbrauch erfassen
      if (this.eventListenerManager) {
        const stats = (this.eventListenerManager as any).getStats();
        if (stats && typeof stats.memoryEstimate === "number") {
          this.recordMetric(
            "eventListenerManager.memoryBytes",
            stats.memoryEstimate,
            "bytes",
            "memory",
            "usage",
          );
        }
      }

      // Batch-Statistiken erfassen
      if (this.batchedEventEmitter) {
        const stats = (this.batchedEventEmitter as any).getStats();
        if (stats) {
          this.recordMetric(
            "batchedEventEmitter.batchCount",
            stats.batches || 0,
            "count",
            "bridge",
            "events",
          );

          this.recordMetric(
            "batchedEventEmitter.eventCount",
            stats.totalEvents || 0,
            "count",
            "bridge",
            "events",
          );
        }
      }
    } catch (error) {
      this.log(
        "error",
        "diagnostics",
        "Fehler bei der Metriken-Erfassung",
        error,
      );
    }
  }

  /**
   * Automatische Berichterstattung starten
   */
  private startAutoReporting(): void {
    if (this.autoReportTimerId !== null) {
      window.clearInterval(this.autoReportTimerId);
    }

    this.autoReportTimerId = window.setInterval(() => {
      this.generateReport();
    }, this.config.autoReportIntervalMs);

    this.log(
      "debug",
      "diagnostics",
      "Automatische Berichterstattung gestartet",
      {
        interval: this.config.autoReportIntervalMs,
      },
    );
  }

  /**
   * Konsolen-Befehle registrieren
   */
  private registerConsoleCommands(): void {
    // Globales Objekt für Bridge-Diagnose
    (window as any).chatBridgeDiagnostics = {
      // Status und Informationen
      getStatus: () => {
        if (!this.chatBridge) return "ChatBridge nicht verfügbar";
        return {
          isInitialized: (this.chatBridge as any).isInitialized(),
          connectionStatus:
            (this.chatBridge as any).connectionStatus?.value || "unknown",
          metrics: this.getLatestMetrics(),
          alerts: this.alerts.filter((a) => !a.resolved),
        };
      },

      // Diagnose-Aktionen
      runPingTest: (count?: number) => this.pingTest(count),
      generateReport: () => this.generateReport(),
      listMetrics: () => this.getLatestMetrics(),

      // Debug-Hilfsmittel
      getLogs: () => this.logs,
      getAlerts: () => this.alerts,
      getReports: () => this.reports,

      // UI-Steuerung
      showToolbar: () => this.showDeveloperToolbar(),
      hideToolbar: () => this.hideDeveloperToolbar(),
    };

    this.log(
      "info",
      "diagnostics",
      "Konsolen-Befehle registriert als window.chatBridgeDiagnostics",
    );
  }

  /**
   * Neueste Metriken für jede Kategorie abrufen
   */
  private getLatestMetrics(): Record<
    string,
    { value: number; unit: string; timestamp: number }
  > {
    const result: Record<
      string,
      { value: number; unit: string; timestamp: number }
    > = {};

    // Metriken nach Namen gruppieren
    const metricsByName: Record<string, MetricDataPoint[]> = {};

    for (const metric of this.metrics) {
      if (!metricsByName[metric.name]) {
        metricsByName[metric.name] = [];
      }

      metricsByName[metric.name].push(metric);
    }

    // Für jeden Metrik-Namen den neuesten Wert abrufen
    for (const [name, metrics] of Object.entries(metricsByName)) {
      const sortedMetrics = metrics.sort((a, b) => b.timestamp - a.timestamp);
      const latestMetric = sortedMetrics[0];

      result[name] = {
        value: latestMetric.value,
        unit: latestMetric.unit,
        timestamp: latestMetric.timestamp,
      };
    }

    return result;
  }

  /**
   * Entwickler-Symbolleiste erstellen
   */
  private createDeveloperToolbar(): void {
    if (this.developerToolbar) return;

    try {
      // Container erstellen
      this.developerToolbar = document.createElement("div");
      this.developerToolbar.id = "chat-bridge-diagnostics-toolbar";
      this.developerToolbar.style.position = "fixed";
      this.developerToolbar.style.bottom = "0";
      this.developerToolbar.style.left = "0";
      this.developerToolbar.style.right = "0";
      this.developerToolbar.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
      this.developerToolbar.style.color = "white";
      this.developerToolbar.style.fontFamily = "monospace";
      this.developerToolbar.style.fontSize = "12px";
      this.developerToolbar.style.padding = "5px";
      this.developerToolbar.style.display = "none";
      this.developerToolbar.style.zIndex = "9999";

      // Inhalt erstellen
      this.updateDeveloperToolbar();

      // Aktualisierungs-Timer
      setInterval(() => {
        if (
          this.developerToolbar &&
          this.developerToolbar.style.display !== "none"
        ) {
          this.updateDeveloperToolbar();
        }
      }, 1000);

      // Zum Dokument hinzufügen
      document.body.appendChild(this.developerToolbar);

      this.log("debug", "diagnostics", "Entwickler-Symbolleiste erstellt");
    } catch (error) {
      this.log(
        "error",
        "diagnostics",
        "Fehler beim Erstellen der Entwickler-Symbolleiste",
        error,
      );
    }
  }

  /**
   * Entwickler-Symbolleiste anzeigen
   */
  public showDeveloperToolbar(): void {
    if (!this.developerToolbar) {
      this.createDeveloperToolbar();
    }

    if (this.developerToolbar) {
      this.developerToolbar.style.display = "block";
      this.updateDeveloperToolbar();
    }
  }

  /**
   * Entwickler-Symbolleiste verstecken
   */
  public hideDeveloperToolbar(): void {
    if (this.developerToolbar) {
      this.developerToolbar.style.display = "none";
    }
  }

  /**
   * Entwickler-Symbolleiste aktualisieren
   */
  private updateDeveloperToolbar(): void {
    if (!this.developerToolbar) return;

    try {
      // Status abrufen
      const status = this.chatBridge
        ? (this.chatBridge as any).connectionStatus?.value || "unknown"
        : "unknown";

      // Leistungsmetriken
      const latestMetrics = this.getLatestMetrics();

      // Status-Farbe
      const statusColor =
        status === "connected"
          ? "#4CAF50"
          : status === "connecting"
            ? "#FFC107"
            : "#F44336";

      // HTML erstellen
      this.developerToolbar.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <span style="color: ${statusColor}">●</span>
            <strong>ChatBridge: ${status}</strong>
          </div>
          
          <div>
            ${
              this.pingPongLatencies.length > 0
                ? `Latenz: ${(this.pingPongLatencies[this.pingPongLatencies.length - 1] || 0).toFixed(2)}ms`
                : "Latenz: -"
            }
            | Fehler: ${this.errorCounts}
            | Listener: ${
              latestMetrics["eventListenerManager.memoryBytes"]?.value
                ? Math.round(
                    latestMetrics["eventListenerManager.memoryBytes"].value /
                      1024,
                  ) + "KB"
                : "-"
            }
          </div>
          
          <div>
            ${
              this.alerts.filter((a) => !a.resolved).length > 0
                ? `<span style="color: #F44336">${this.alerts.filter((a) => !a.resolved).length} Warnungen</span>`
                : '<span style="color: #4CAF50">Keine Warnungen</span>'
            }
            
            <button onclick="window.chatBridgeDiagnostics.hideToolbar()" style="margin-left: 10px; background: none; border: none; color: white; cursor: pointer;">×</button>
          </div>
        </div>
      `;
    } catch (error) {
      this.log(
        "error",
        "diagnostics",
        "Fehler beim Aktualisieren der Entwickler-Symbolleiste",
        error,
      );
    }
  }

  /**
   * Ressourcen aufräumen
   */
  public dispose(): void {
    this.log("info", "diagnostics", "ChatBridgeDiagnostics wird freigegeben");

    // Timer stoppen
    if (this.metricSamplingTimerId !== null) {
      window.clearInterval(this.metricSamplingTimerId);
      this.metricSamplingTimerId = null;
    }

    if (this.autoReportTimerId !== null) {
      window.clearInterval(this.autoReportTimerId);
      this.autoReportTimerId = null;
    }

    // UI entfernen
    if (
      this.developerToolbar &&
      document.body.contains(this.developerToolbar)
    ) {
      document.body.removeChild(this.developerToolbar);
      this.developerToolbar = null;
    }

    // Konsolen-Befehle entfernen
    if (
      this.config.enableConsoleCommands &&
      "chatBridgeDiagnostics" in window
    ) {
      (window as any).chatBridgeDiagnostics = undefined;
    }

    // Referenzen löschen
    this.chatBridge = undefined;
    this.eventListenerManager = undefined;
    this.batchedEventEmitter = undefined;

    this.log(
      "info",
      "diagnostics",
      "ChatBridgeDiagnostics erfolgreich freigegeben",
    );
  }
}

/**
 * Factory-Funktion für ChatBridgeDiagnostics
 */
export function createChatBridgeDiagnostics(
  performanceMonitor: PerformanceMonitor,
  statusManager: BridgeStatusManager,
  config: Partial<ChatBridgeDiagnosticsConfig> = {},
): ChatBridgeDiagnostics {
  return new ChatBridgeDiagnostics(performanceMonitor, statusManager, config);
}

export default {
  createChatBridgeDiagnostics,
};
