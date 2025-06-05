import { ref, computed } from "vue";
import { router404Diagnostics } from "@/diagnostics/router404Diagnostics";
import { domErrorDetector } from "@/utils/domErrorDiagnostics";
import { selfHealingService } from "@/services/selfHealing/SelfHealingService";
import { routerService } from "@/services/router/RouterServiceFixed";
import type {
  RouterHealthMetrics,
  DiagnosticReport,
  RecoveryStrategy,
} from "@/types/diagnostics";

/**
 * Unified Diagnostics Service
 * Zentraler Service für alle Diagnose-Daten und Recovery-Koordination
 */
export class UnifiedDiagnosticsService {
  private logger: any; // Logger wird in constructor initialisiert
  private diagnosticsHistory = ref<DiagnosticReport[]>([]);
  private activeRecoveryAttempts = ref<Map<string, RecoveryStrategy>>(
    new Map(),
  );
  private healthMetrics = ref<RouterHealthMetrics>({
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
    // Logger später initialisieren wenn Vue verfügbar ist
    this.logger = console; // Fallback zu console
    this.initializeMonitoring();
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
      // Sicherer Router-Zugriff
      const router = routerService.getRouter();
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
            name: currentRoute.name,
            timestamp: Date.now(),
          };
        }
      } catch (error) {
        this.logger.warn("Router currentRoute Zugriff fehlgeschlagen:", error);
        metrics.currentRouteAvailable = false;
      }

      // Pinia-Status prüfen
      try {
        const { useAuthStore } = await import("@/stores/auth");
        const authStore = useAuthStore();
        metrics.piniaReady = !!authStore;
      } catch (error) {
        metrics.piniaReady = false;
      }
    } catch (error) {
      this.logger.error("Router-Gesundheitsprüfung fehlgeschlagen:", error);
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
      domErrors: domErrorDetector.detectErrorState(),
      authStatus: this.getAuthStatus(),
      selfHealingStatus: (selfHealingService as any).getStatus(),
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
    const analysis = (router404Diagnostics as any).analyzeDiagnostics();
    return {
      has404Issues: analysis.has404Issues,
      errorCount: analysis.totalErrors,
      recommendations: analysis.recommendations,
      routerInitErrors: analysis.routerInitErrors,
    };
  }

  /**
   * Holt den Auth-Status
   */
  private getAuthStatus() {
    return {
      isAuthenticated: false, // TODO: Get from auth store
      lastAuthAction: null,
      tokenValid: false,
    };
  }

  /**
   * Analysiert Trends in den Diagnose-Daten
   */
  private analyzeTrends(_report: DiagnosticReport) {
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
      this.logger.error("Recovery-Strategie fehlgeschlagen:", error);
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
    this.logger.info(`Führe Recovery-Strategie aus: ${strategy.name}`);

    for (const step of strategy.steps) {
      await new Promise((resolve) => setTimeout(resolve, step.delay));

      try {
        await this.executeRecoveryStep(step.action);
      } catch (error) {
        this.logger.error(
          `Recovery-Schritt fehlgeschlagen: ${step.action}`,
          error,
        );
      }
    }
  }

  /**
   * Führt einen einzelnen Recovery-Schritt aus
   */
  private async executeRecoveryStep(action: string) {
    switch (action) {
      case "clearNavigationHistory":
        (routerService as any).clearNavigationQueue();
        break;

      case "resetRouterState":
        await routerService.reset();
        break;

      case "navigateToHome":
        await routerService.navigate({ name: "Home" } as any);
        break;

      case "cleanupErrorElements":
        (domErrorDetector as any).cleanupErrorElements();
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
  public getHealthMetrics() {
    return computed(() => this.healthMetrics.value);
  }

  /**
   * Gibt die Diagnose-Historie zurück
   */
  public getDiagnosticsHistory() {
    return computed(() => this.diagnosticsHistory.value);
  }

  /**
   * Gibt aktive Recovery-Versuche zurück
   */
  public getActiveRecoveries() {
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
export const unifiedDiagnosticsService = new UnifiedDiagnosticsService();
