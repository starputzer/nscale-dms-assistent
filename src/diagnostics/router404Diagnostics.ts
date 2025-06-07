/**
 * Router 404 Diagnostics
 * Speziell für die Diagnose von mehrfachen 404-Fehlern beim Seitenrefresh
 */

import type { Router, RouteLocationNormalized } from "vue-router";

export interface RouterDiagnosticEvent {
  timestamp: number;
  type: "navigation" | "error" | "guard" | "refresh" | "initialization";
  phase: string;
  details: {
    from?: RouteLocationNormalized;
    to?: RouteLocationNormalized;
    error?: Error;
    message?: string;
    stack?: string;
    additionalInfo?: Record<string, any>;
  };
}

export interface RouterHealthReport {
  healthy: boolean;
  events: RouterDiagnosticEvent[];
  issues: RouterIssue[];
  recommendations: string[];
  timing: {
    firstNavigation?: number;
    lastError?: number;
    totalErrors: number;
    refreshCount: number;
  };
}

export interface RouterIssue {
  severity: "critical" | "warning" | "info";
  type: string;
  description: string;
  possibleCauses: string[];
  suggestedFixes: string[];
}

export class Router404Diagnostics {
  private events: RouterDiagnosticEvent[] = [];
  private router: Router | null = null;
<<<<<<< HEAD
  private _startTime: number = Date.now();
=======
  private startTime: number = Date.now();
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
  private refreshAttempts = 0;
  private errorCount = 0;
  private lastError: Error | null = null;
  private initialized = false;

  private readonly MAX_EVENTS = 100;
  private readonly REFRESH_THRESHOLD = 3;

  constructor() {
    this.setupGlobalMonitoring();
  }

  /**
   * Initialisiere Diagnostics mit Router
   */
  initialize(router: Router): void {
    if (this.initialized) return;

    this.router = router;
    this.initialized = true;

    this.recordEvent("initialization", "Router initialisiert", {
      routerReady: router.isReady(),
      currentRoute: router.currentRoute.value.fullPath,
    });

    this.setupRouterMonitoring();
  }

  /**
   * Zeichne ein diagnostisches Event auf
   */
  private recordEvent(
    type: RouterDiagnosticEvent["type"],
    phase: string,
    details: RouterDiagnosticEvent["details"] = {},
  ): void {
    const event: RouterDiagnosticEvent = {
      timestamp: Date.now(),
      type,
      phase,
      details,
    };

    this.events.push(event);

    // Begrenze Anzahl der Events
    if (this.events.length > this.MAX_EVENTS) {
      this.events.shift();
    }

    // Zähle Fehler
    if (type === "error") {
      this.errorCount++;
      this.lastError = details.error || null;
    }

    // Zähle Refreshs
    if (type === "refresh") {
      this.refreshAttempts++;
    }

    console.log(`[Router404Diag] ${type}: ${phase}`, details);
  }

  /**
   * Überwache globale Fehler
   */
  private setupGlobalMonitoring(): void {
    // Überwache Console-Errors
    const originalError = console.error;
    console.error = (...args) => {
      const message = args.join(" ");

      // Erkenne Router-bezogene Fehler
      if (
        message.includes("currentRoute") ||
        message.includes("router") ||
        message.includes("404")
      ) {
        this.recordEvent("error", "Console Error", {
          message,
          stack: new Error().stack,
        });
      }

      originalError.apply(console, args);
    };

    // Überwache Window-Errors
    window.addEventListener("error", (event) => {
      if (
        event.message.includes("router") ||
        event.message.includes("currentRoute")
      ) {
        this.recordEvent("error", "Window Error", {
          message: event.message,
          error: event.error,
        });
      }
    });

    // Überwache Unhandled Rejections
    window.addEventListener("unhandledrejection", (event) => {
      if (
        event.reason?.message?.includes("router") ||
        event.reason?.message?.includes("404")
      ) {
        this.recordEvent("error", "Unhandled Rejection", {
          message: event.reason?.message,
          error: event.reason,
        });
      }
    });

    // Überwache Page Refreshes
    window.addEventListener("beforeunload", () => {
      this.recordEvent("refresh", "Page Unload");
    });
  }

  /**
   * Überwache Router-Events
   */
  private setupRouterMonitoring(): void {
    if (!this.router) return;

    // Before Each Guard
    this.router.beforeEach((to, from, next) => {
      this.recordEvent("guard", "beforeEach", {
        from: from,
        to: to,
        additionalInfo: {
          params: to.params,
          query: to.query,
          meta: to.meta,
        },
      });

      next();
    });

    // After Each Hook
    this.router.afterEach((to, from) => {
      this.recordEvent("navigation", "afterEach", {
        from: from,
        to: to,
        additionalInfo: {
          matched: to.matched.map((r: any) => r.path),
          redirectedFrom: to.redirectedFrom,
        },
      });
    });

    // Error Handler
    this.router.onError((error) => {
      this.recordEvent("error", "Router Error", {
        error: error,
        message: error.message,
        stack: error.stack,
        additionalInfo: {
          currentRoute: this.router?.currentRoute.value.fullPath,
        },
      });
    });
  }

  /**
   * Analysiere aufgezeichnete Events und erstelle Bericht
   */
  generateReport(): RouterHealthReport {
    const issues = this.analyzeIssues();
    const recommendations = this.generateRecommendations(issues);

    const report: RouterHealthReport = {
      healthy: issues.filter((i: any) => i.severity === "critical").length === 0,
      events: this.events,
      issues,
      recommendations,
      timing: {
        firstNavigation: this.findFirstNavigation(),
        lastError: this.lastError
          ? this.events.filter((e: any) => e.type === "error").slice(-1)[0]
              ?.timestamp
          : undefined,
        totalErrors: this.errorCount,
        refreshCount: this.refreshAttempts,
      },
    };

    return report;
  }

  /**
   * Analysiere bekannte Probleme
   */
  private analyzeIssues(): RouterIssue[] {
    const issues: RouterIssue[] = [];

    // Problem 1: Mehrfache 404-Fehler
    const error404Count = this.events.filter(
      (e) =>
        e.details.message?.includes("404") || e.details.to?.name === "NotFound",
    ).length;

    if (error404Count > 1) {
      issues.push({
        severity: "critical",
        type: "multiple-404s",
        description: `${error404Count} 404-Fehler erkannt`,
        possibleCauses: [
          "Router wird vor Pinia initialisiert",
          "Fehlende Route-Guards",
          "Race Condition bei der Initialisierung",
        ],
        suggestedFixes: [
          "Überprüfe Initialisierungsreihenfolge",
          "Implementiere Router-Ready-Check",
          "Füge Fallback-Routes hinzu",
        ],
      });
    }

    // Problem 2: CurrentRoute undefined
    const currentRouteErrors = this.events.filter(
      (e) =>
        e.details.message?.includes("currentRoute") &&
        e.details.message?.includes("undefined"),
    );

    if (currentRouteErrors.length > 0) {
      issues.push({
        severity: "critical",
        type: "currentRoute-undefined",
        description: "Router.currentRoute ist undefined",
        possibleCauses: [
          "Router nicht korrekt initialisiert",
          "Zugriff vor Router.isReady()",
          "Pinia/Store-Zugriff vor Router",
        ],
        suggestedFixes: [
          "Warte auf router.isReady()",
          "Prüfe Initialisierungsreihenfolge",
          "Verwende Lazy-Loading für Router-Abhängigkeiten",
        ],
      });
    }

    // Problem 3: Pinia-Fehler
    const piniaErrors = this.events.filter(
      (e) =>
        e.details.message?.includes("Pinia") ||
        e.details.message?.includes("getActivePinia"),
    );

    if (piniaErrors.length > 0) {
      issues.push({
        severity: "critical",
        type: "pinia-initialization",
        description: "Pinia-Initialisierungsfehler",
        possibleCauses: [
          "Store-Zugriff vor Pinia-Initialisierung",
          "Router-Guards greifen auf Stores zu",
          "Falsche Import-Reihenfolge",
        ],
        suggestedFixes: [
          "Initialisiere Pinia vor Router",
          "Verwende Lazy-Loading für Store-Zugriffe",
          "Prüfe Import-Reihenfolge in main.ts",
        ],
      });
    }

    // Problem 4: Zu viele Refreshs
    if (this.refreshAttempts > this.REFRESH_THRESHOLD) {
      issues.push({
        severity: "warning",
        type: "excessive-refreshes",
        description: `${this.refreshAttempts} Seiten-Refreshs erkannt`,
        possibleCauses: [
          "Automatische Fehlerbehandlung löst Refreshs aus",
          "Benutzer versucht Fehler zu beheben",
          "Endless Loop in Fehlerbehandlung",
        ],
        suggestedFixes: [
          "Deaktiviere automatische Refreshs",
          "Implementiere bessere Fehlerbehandlung",
          "Zeige klare Fehlermeldungen",
        ],
      });
    }

    return issues;
  }

  /**
   * Generiere Empfehlungen basierend auf Problemen
   */
  private generateRecommendations(issues: RouterIssue[]): string[] {
    const recommendations: string[] = [];

    // Generelle Empfehlungen
    if (issues.some((i) => i.type === "multiple-404s")) {
      recommendations.push(
        "1. Überprüfe die Initialisierungsreihenfolge in main.ts",
        "2. Stelle sicher, dass Pinia vor dem Router initialisiert wird",
        "3. Implementiere eine Catch-All-Route als Fallback",
      );
    }

    if (issues.some((i) => i.type === "currentRoute-undefined")) {
      recommendations.push(
        "4. Verwende router.isReady() vor dem ersten Routing",
        "5. Implementiere Null-Checks für currentRoute",
        "6. Verwende defensive Programmierung in Router-Guards",
      );
    }

    if (issues.some((i) => i.type === "pinia-initialization")) {
      recommendations.push(
        "7. Refaktoriere Router-Guards um Store-Abhängigkeiten zu vermeiden",
        "8. Verwende Lazy-Loading für Store-Zugriffe",
        "9. Erstelle einen zentralen Initialisierungs-Manager",
      );
    }

    // Spezifische Code-Beispiele
    recommendations.push(
      "\nCode-Beispiele:",
      "```typescript",
      "// main.ts - Korrekte Reihenfolge",
      "const pinia = createPinia();",
      "app.use(pinia);",
      "await new Promise(resolve => setTimeout(resolve, 10));",
      "app.use(router);",
      "await router.isReady();",
      'app.mount("#app");',
      "```",
    );

    return recommendations;
  }

  /**
   * Finde erste Navigation
   */
  private findFirstNavigation(): number | undefined {
    const firstNav = this.events.find((e) => e.type === "navigation");
    return firstNav?.timestamp;
  }

  /**
   * Exportiere Diagnostics für Debugging
   */
  exportDiagnostics(): string {
    const report = this.generateReport();
    return JSON.stringify(report, null, 2);
  }

  /**
   * Real-time Monitoring aktivieren
   */
  enableRealTimeMonitoring(): void {
    setInterval(() => {
      const report = this.generateReport();
      if (!report.healthy) {
        console.warn(
          "[Router404Diag] Gesundheitsprobleme erkannt:",
          report.issues,
        );
      }
    }, 5000);
  }
}

// Singleton-Instanz
export const router404Diagnostics = new Router404Diagnostics();

// Export für globalen Zugriff
if (typeof window !== "undefined") {
  (window as any).__router404Diagnostics = router404Diagnostics;
}
