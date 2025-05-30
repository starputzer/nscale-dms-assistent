import { ref, computed, type Ref, type ComputedRef } from "vue";
import type { Router } from "vue-router";
import type {
  RouterHealthMetrics,
  DiagnosticReport,
  RecoveryStrategy,
} from "@/types/diagnostics";

/**
 * Vereinfachte Version des UnifiedDiagnosticsService ohne externe Abhängigkeiten
 * für eine stabile Implementation
 */
export class UnifiedDiagnosticsServiceFixed {
  private diagnosticsHistory: Ref<DiagnosticReport[]> = ref([]);
  private activeRecoveryAttempts: Ref<Map<string, RecoveryStrategy>> = ref(
    new Map(),
  );
  private healthMetrics: Ref<RouterHealthMetrics> = ref({
    initStatus: "pending",
    currentRouteAvailable: false,
    piniaReady: false,
    navigationSuccessRate: 1.0,
    errorCount: 0,
    lastError: null,
    lastSuccessfulNavigation: null,
    consecutiveFailures: 0,
  });

  constructor() {
    // Monitoring wird später in initialize() gestartet
  }

  /**
   * Initialisiert den Service
   */
  public async initialize(): Promise<void> {
    this.initializeMonitoring();
    console.log("[UnifiedDiagnosticsService] Initialized");
  }

  /**
   * Initialisiert das kontinuierliche Monitoring
   */
  private initializeMonitoring() {
    // Überwache Router-Gesundheit
    setInterval(() => {
      this.checkRouterHealth();
    }, 5000);

    // Sammle Diagnose-Daten
    setInterval(() => {
      this.collectDiagnostics();
    }, 10000);
  }

  /**
   * Überprüft die Router-Gesundheit mit sicheren Zugriffen
   */
  private async checkRouterHealth() {
    const metrics = this.healthMetrics.value;

    try {
      // Sicherer Router-Zugriff über window
      const router = (window as any).$router as Router | undefined;

      if (!router) {
        metrics.initStatus = "failed";
        metrics.currentRouteAvailable = false;
        return;
      }

      metrics.initStatus = "ready";

      // Sichere CurrentRoute-Prüfung
      try {
        const currentRoute = router.currentRoute?.value;
        metrics.currentRouteAvailable = !!currentRoute;

        if (currentRoute) {
          metrics.lastSuccessfulNavigation = {
            path: currentRoute.path,
            name: currentRoute.name as string | undefined,
            timestamp: Date.now(),
          };
        }
      } catch (error) {
        console.warn("Router currentRoute Zugriff fehlgeschlagen:", error);
        metrics.currentRouteAvailable = false;
      }

      // Pinia-Status prüfen über window
      try {
        const piniaStore = (window as any).$pinia;
        metrics.piniaReady = !!piniaStore;
      } catch (error) {
        metrics.piniaReady = false;
      }
    } catch (error: any) {
      console.error("Router-Gesundheitsprüfung fehlgeschlagen:", error);
      metrics.errorCount++;
      metrics.lastError = {
        message: error.message,
        stack: error.stack,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Sammelt Diagnose-Daten aus allen Services
   */
  private async collectDiagnostics() {
    const report: DiagnosticReport = {
      timestamp: Date.now(),
      router404: await this.getRouter404Status(),
      domErrors: this.getDomErrorStatus(),
      authStatus: this.getAuthStatus(),
      selfHealingStatus: this.getSelfHealingStatus(),
      healthMetrics: { ...this.healthMetrics.value },
    };

    this.diagnosticsHistory.value.push(report);

    // Behalte nur die letzten 50 Berichte
    if (this.diagnosticsHistory.value.length > 50) {
      this.diagnosticsHistory.value.shift();
    }

    // Analysiere Trends
    this.analyzeTrends(report);
  }

  /**
   * Holt den Status von Router404Diagnostics
   */
  private async getRouter404Status() {
    // Vereinfachte Version ohne externe Abhängigkeit
    return {
      has404Issues: false,
      errorCount: 0,
      recommendations: [],
      routerInitErrors: 0,
    };
  }

  /**
   * Holt den DOM Error Status
   */
  private getDomErrorStatus() {
    // Vereinfachte Implementierung
    return {
      hasErrorScreen: false,
      has404Page: false,
      errorType: null,
      errorMessage: null,
      componentHierarchy: [],
      currentRoute: window.location.pathname,
      timestamp: Date.now(),
      domSnapshot: "",
    };
  }

  /**
   * Holt den Auth-Status
   */
  private getAuthStatus() {
    return {
      isAuthenticated: false,
      lastAuthAction: null,
      tokenValid: false,
    };
  }

  /**
   * Holt den Self-Healing-Status
   */
  private getSelfHealingStatus() {
    return {
      isActive: false,
      lastHealingAttempt: null,
      healingHistory: [],
      successRate: 1.0,
    };
  }

  /**
   * Analysiert Trends in den Diagnose-Daten
   */
  private analyzeTrends(report: DiagnosticReport) {
    // Erkenne wiederkehrende Muster
    const recentReports = this.diagnosticsHistory.value.slice(-10);

    // Prüfe auf wiederkehrende 404-Fehler
    const recurring404s = recentReports.filter(
      (r) => r.router404.has404Issues,
    ).length;
    if (recurring404s > 5) {
      this.triggerSmartRecovery("recurring_404");
    }

    // Prüfe auf Router-Initialisierungsprobleme
    const initFailures = recentReports.filter(
      (r) => r.healthMetrics.initStatus === "failed",
    ).length;
    if (initFailures > 3) {
      this.triggerSmartRecovery("router_init_failure");
    }
  }

  /**
   * Triggert eine intelligente Recovery-Strategie
   */
  private async triggerSmartRecovery(issue: string) {
    if (this.activeRecoveryAttempts.value.has(issue)) {
      return; // Recovery läuft bereits
    }

    const strategy = this.selectRecoveryStrategy(issue);
    this.activeRecoveryAttempts.value.set(issue, strategy);

    try {
      await this.executeRecoveryStrategy(strategy);
      this.activeRecoveryAttempts.value.delete(issue);
    } catch (error) {
      console.error("Recovery-Strategie fehlgeschlagen:", error);
      this.activeRecoveryAttempts.value.delete(issue);
    }
  }

  /**
   * Wählt die beste Recovery-Strategie basierend auf dem Problem
   */
  private selectRecoveryStrategy(issue: string): RecoveryStrategy {
    const strategies: Record<string, RecoveryStrategy> = {
      recurring_404: {
        name: "Router Reset mit Session Recovery",
        steps: [
          { action: "clearNavigationHistory", delay: 0 },
          { action: "resetRouterState", delay: 100 },
          { action: "navigateToHome", delay: 500 },
        ],
      },
      router_init_failure: {
        name: "Full Router Restart",
        steps: [
          { action: "unmountRouter", delay: 0 },
          { action: "clearRouterCache", delay: 100 },
          { action: "remountRouter", delay: 500 },
        ],
      },
      dom_errors: {
        name: "DOM Cleanup und Neustart",
        steps: [
          { action: "cleanupErrorElements", delay: 0 },
          { action: "forceRerender", delay: 100 },
        ],
      },
    };

    return strategies[issue] || strategies.dom_errors;
  }

  /**
   * Führt eine Recovery-Strategie aus
   */
  private async executeRecoveryStrategy(strategy: RecoveryStrategy) {
    console.info(`Führe Recovery-Strategie aus: ${strategy.name}`);

    for (const step of strategy.steps) {
      await new Promise((resolve) => setTimeout(resolve, step.delay));

      try {
        await this.executeRecoveryStep(step.action);
      } catch (error) {
        console.error(`Recovery-Schritt fehlgeschlagen: ${step.action}`, error);
      }
    }
  }

  /**
   * Führt einen einzelnen Recovery-Schritt aus
   */
  private async executeRecoveryStep(action: string) {
    switch (action) {
      case "clearNavigationHistory":
        // Implementierung folgt
        break;

      case "resetRouterState":
        // Implementierung folgt
        break;

      case "navigateToHome":
        const router = (window as any).$router;
        if (router) {
          await router.push("/");
        }
        break;

      case "cleanupErrorElements":
        // Entferne Error-Elemente aus dem DOM
        document
          .querySelectorAll(".error-boundary-fallback")
          .forEach((el: any) => el.remove());
        break;

      case "forceRerender":
        // Force app re-render
        window.location.reload();
        break;
    }
  }

  /**
   * Öffentliche API
   */

  /**
   * Gibt einen umfassenden Diagnose-Report zurück
   */
  public async generateReport(): Promise<DiagnosticReport> {
    await this.collectDiagnostics();
    return this.diagnosticsHistory.value[
      this.diagnosticsHistory.value.length - 1
    ];
  }

  /**
   * Gibt die Router-Gesundheitsmetriken zurück
   */
  public getHealthMetrics(): ComputedRef<RouterHealthMetrics> {
    return computed(() => this.healthMetrics.value);
  }

  /**
   * Gibt die Diagnose-Historie zurück
   */
  public getDiagnosticsHistory(): ComputedRef<DiagnosticReport[]> {
    return computed(() => this.diagnosticsHistory.value);
  }

  /**
   * Gibt aktive Recovery-Versuche zurück
   */
  public getActiveRecoveries(): ComputedRef<[string, RecoveryStrategy][]> {
    return computed(() =>
      Array.from(this.activeRecoveryAttempts.value.entries()),
    );
  }

  /**
   * Manueller Recovery-Trigger
   */
  public async triggerManualRecovery(issue: string) {
    await this.triggerSmartRecovery(issue);
  }

  /**
   * Export-Funktion für Support
   */
  public exportDiagnostics() {
    const data = {
      history: this.diagnosticsHistory.value,
      currentHealth: this.healthMetrics.value,
      activeRecoveries: this.getActiveRecoveries().value,
      timestamp: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `diagnostics-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// Singleton-Instanz
export const unifiedDiagnosticsService = new UnifiedDiagnosticsServiceFixed();
