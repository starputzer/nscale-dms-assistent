/**
 * Router Initialization Debugger
 * Kombiniert Initialisierungstester mit 404-Diagnostics für umfassendes Debugging
 */

import { Router404Diagnostics } from "@/diagnostics/router404Diagnostics";
import { RouterInitializationTester } from "@/utils/routerInitializationTester";
import type { Router } from "vue-router";

export interface DebugReport {
  initialization: {
    success: boolean;
    stages: any[];
    errors: Error[];
    warnings: string[];
  };
  router404: {
    healthy: boolean;
    issues: any[];
    recommendations: string[];
    errorCount: number;
  };
  combinedAnalysis: {
    rootCause: string;
    solution: string;
    codeChanges: string[];
  };
}

export class RouterInitDebugger {
  private initTester: RouterInitializationTester;
  private diagnostics: Router404Diagnostics;
  private _startTime: number = Date.now();

  constructor() {
    this.initTester = new RouterInitializationTester();
    this.diagnostics = new Router404Diagnostics();

    // Starte Überwachung
    this.initTester.startTest();
    // this.diagnostics.enableRealTimeMonitoring(); // DEAKTIVIERT - Router Debug Monitor

    // Installiere globale Debug-Commands
    this.installDebugCommands();
  }

  /**
   * Initialisiere mit Router
   */
  initializeRouter(router: Router): void {
    this.diagnostics.initialize(router);
  }

  /**
   * Markiere Initialisierungsphase
   */
  markStage(
    stage: string,
    status: "started" | "completed" | "failed",
    error?: Error,
  ): void {
    if (status === "started") {
      this.initTester.markStageStarted(stage);
    } else if (status === "completed") {
      this.initTester.markStageCompleted(stage);
    } else if (status === "failed" && error) {
      this.initTester.markStageFailed(stage, error);
    }
  }

  /**
   * Generiere umfassenden Debug-Report
   */
  generateDebugReport(): DebugReport {
    const initReport = this.initTester.generateReport();
    const routerReport = this.diagnostics.generateReport();

    // Kombinierte Analyse
    const rootCause = this.analyzeRootCause(initReport, routerReport);
    const solution = this.generateSolution(rootCause);
    const codeChanges = this.generateCodeChanges(rootCause);

    return {
      initialization: {
        success: initReport.success,
        stages: initReport.stages,
        errors: initReport.errors,
        warnings: initReport.warnings,
      },
      router404: {
        healthy: routerReport.healthy,
        issues: routerReport.issues,
        recommendations: routerReport.recommendations,
        errorCount: routerReport.timing.totalErrors,
      },
      combinedAnalysis: {
        rootCause,
        solution,
        codeChanges,
      },
    };
  }

  /**
   * Analysiere Haupt-Ursache basierend auf beiden Reports
   */
  private analyzeRootCause(initReport: any, routerReport: any): string {
    // Prüfe auf Pinia-vor-Router-Problem
    const piniaStage = initReport.stages.find((s: any) => s.name === "pinia");
    const routerStage = initReport.stages.find((s: any) => s.name === "router");

    if (
      piniaStage &&
      routerStage &&
      routerStage.timestamp < piniaStage.timestamp
    ) {
      return "ROUTER_BEFORE_PINIA";
    }

    // Prüfe auf fehlende Pinia
    if (
      routerReport.issues.some((i: any) => i.type === "pinia-initialization")
    ) {
      return "PINIA_NOT_INITIALIZED";
    }

    // Prüfe auf currentRoute-Problem
    if (
      routerReport.issues.some((i: any) => i.type === "currentRoute-undefined")
    ) {
      return "CURRENT_ROUTE_UNDEFINED";
    }

    // Prüfe auf Race Conditions
    if (
      initReport.warnings.some((w: string) =>
        w.includes("fehlende Abhängigkeiten"),
      )
    ) {
      return "RACE_CONDITION";
    }

    return "UNKNOWN";
  }

  /**
   * Generiere Lösungsvorschlag
   */
  private generateSolution(rootCause: string): string {
    const solutions: Record<string, string> = {
      ROUTER_BEFORE_PINIA:
        "Router wird vor Pinia initialisiert. Ändere die Initialisierungsreihenfolge in main.ts.",
      PINIA_NOT_INITIALIZED:
        "Pinia ist nicht verfügbar wenn Router-Guards ausgeführt werden. Stelle sicher, dass Pinia vor dem Router initialisiert wird.",
      CURRENT_ROUTE_UNDEFINED:
        "Router.currentRoute ist undefined. Warte auf router.isReady() bevor die App gemountet wird.",
      RACE_CONDITION:
        "Race Condition zwischen verschiedenen Initialisierungsphasen. Verwende async/await für sequentielle Initialisierung.",
      UNKNOWN: "Unbekannte Ursache. Prüfe die Debug-Logs für weitere Details.",
    };

    return solutions[rootCause] || solutions.UNKNOWN;
  }

  /**
   * Generiere konkrete Code-Änderungen
   */
  private generateCodeChanges(rootCause: string): string[] {
    const changes: Record<string, string[]> = {
      ROUTER_BEFORE_PINIA: [
        "// main.ts - Korrekte Reihenfolge",
        "const pinia = createPinia();",
        "app.use(pinia);",
        "",
        "// Warte kurz für Pinia-Initialisierung",
        "await new Promise(resolve => setTimeout(resolve, 10));",
        "",
        "// Dann Router",
        "app.use(router);",
        "await router.isReady();",
        'app.mount("#app");',
      ],

      PINIA_NOT_INITIALIZED: [
        "// router/index.ts - Router-Guard mit Lazy-Loading",
        "router.beforeEach(async (to, from, next) => {",
        "  // Lazy-Load Store nur wenn benötigt",
        "  if (to.meta.requiresAuth) {",
        '    const { useAuthStore } = await import("@/stores/auth");',
        "    const auth = useAuthStore();",
        "    if (!auth.isAuthenticated) {",
        '      next("/login");',
        "    } else {",
        "      next();",
        "    }",
        "  } else {",
        "    next();",
        "  }",
        "});",
      ],

      CURRENT_ROUTE_UNDEFINED: [
        "// RouterService.ts - Sichere currentRoute-Zugriffe",
        "private async getCurrentRoute(): Promise<RouteLocationNormalized | null> {",
        "  if (!this.router) return null;",
        "  ",
        "  // Warte auf Router-Bereitschaft",
        "  if (!this.router.currentRoute.value) {",
        "    await this.router.isReady();",
        "  }",
        "  ",
        "  return this.router.currentRoute.value;",
        "}",
      ],

      RACE_CONDITION: [
        "// main.ts - Sequentielle Initialisierung",
        "async function initializeApp() {",
        "  try {",
        "    // Phase 1: Kritische Dependencies",
        "    await initializeCriticalDependencies();",
        "    ",
        "    // Phase 2: Pinia",
        "    const pinia = createPinia();",
        "    app.use(pinia);",
        "    ",
        "    // Phase 3: Stores",
        "    await initializeStores(pinia);",
        "    ",
        "    // Phase 4: Router",
        "    const router = await initializeRouter();",
        "    app.use(router);",
        "    ",
        "    // Phase 5: Mount",
        "    await router.isReady();",
        '    app.mount("#app");',
        "  } catch (error) {",
        '    console.error("Init failed:", error);',
        "  }",
        "}",
      ],
    };

    return (
      changes[rootCause] || ["// Keine spezifischen Code-Änderungen verfügbar"]
    );
  }

  /**
   * Installiere Debug-Commands im Browser
   */
  private installDebugCommands(): void {
    if (typeof window === "undefined") return;

    const commands = {
      debugRouter: () => {
        const report = this.generateDebugReport();
        console.log("=== Router Debug Report ===");
        console.log("Initialization:", report.initialization);
        console.log("Router 404:", report.router404);
        console.log("Analysis:", report.combinedAnalysis);
        console.log("=========================");
        return report;
      },

      exportDebug: () => {
        const report = this.generateDebugReport();
        const blob = new Blob([JSON.stringify(report, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `router-debug-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      },

      showCodeFixes: () => {
        const report = this.generateDebugReport();
        console.log("=== Empfohlene Code-Änderungen ===");
        console.log(`Root Cause: ${report.combinedAnalysis.rootCause}`);
        console.log(`Solution: ${report.combinedAnalysis.solution}`);
        console.log("\nCode:");
        report.combinedAnalysis.codeChanges.forEach((line: any) =>
          console.log(line),
        );
        console.log("================================");
      },

      testInitOrder: () => {
        console.log("=== Test Initialisierungsreihenfolge ===");
        const stages = ["pinia", "stores", "router", "app"];
        stages.forEach((stage, index: any) => {
          setTimeout(() => {
            console.log(`${index + 1}. ${stage} wird initialisiert...`);
          }, index * 100);
        });
      },
    };

    // Installiere Commands global
    (window as any).routerDebug = commands;

    console.log(`
🛠️ Router Debug Commands verfügbar:
   • routerDebug.debugRouter() - Zeige Debug-Report
   • routerDebug.exportDebug() - Exportiere Report als JSON
   • routerDebug.showCodeFixes() - Zeige empfohlene Code-Änderungen
   • routerDebug.testInitOrder() - Teste Initialisierungsreihenfolge
    `);
  }

  /**
   * Live-Monitoring mit visueller Anzeige
   */
  enableVisualMonitoring(): void {
    // Erstelle Debug-Overlay
    const overlay = document.createElement("div");
    overlay.id = "router-debug-overlay";
    overlay.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px;
      border-radius: 5px;
      font-family: monospace;
      font-size: 12px;
      z-index: 99999;
      min-width: 300px;
    `;

    document.body.appendChild(overlay);

    // Update-Funktion
    const updateOverlay = () => {
      const report = this.generateDebugReport();

      overlay.innerHTML = `
        <h3 style="margin: 0 0 10px 0;">Router Debug Monitor</h3>
        <div>Init Status: ${report.initialization.success ? "✅" : "❌"}</div>
        <div>Router Health: ${report.router404.healthy ? "✅" : "❌"}</div>
        <div>Errors: ${report.router404.errorCount}</div>
        <div>Root Cause: ${report.combinedAnalysis.rootCause}</div>
        <hr style="margin: 10px 0;">
        <div style="font-size: 10px;">
          ${report.initialization.warnings.slice(0, 3).join("<br>")}
        </div>
        <button onclick="routerDebug.debugRouter()" style="margin-top: 10px;">
          Full Report
        </button>
      `;
    };

    // Update alle 2 Sekunden
    setInterval(updateOverlay, 2000);
    updateOverlay();
  }
}

// Export Singleton-Instanz
export const routerInitDebugger = new RouterInitDebugger();

// Auto-Enable in Development - DEAKTIVIERT
// if (process.env.NODE_ENV === 'development') {
//   console.log('🐛 Router Init Debugger aktiviert');
//
//   // Aktiviere Visual Monitoring nach DOM-Ready
//   if (document.readyState === 'loading') {
//     document.addEventListener('DOMContentLoaded', () => {
//       routerInitDebugger.enableVisualMonitoring();
//     });
//   } else {
//     routerInitDebugger.enableVisualMonitoring();
//   }
// }
