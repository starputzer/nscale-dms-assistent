/**
 * Router Initialization Flow Tester
 * Testet die Initialisierungsreihenfolge von Router, Pinia und anderen Abhängigkeiten
 */

interface InitializationStage {
  name: string;
  timestamp: number;
  status: "pending" | "initializing" | "success" | "error";
  dependencies: string[];
  error?: Error;
}

interface InitializationReport {
  stages: InitializationStage[];
  errors: Error[];
  warnings: string[];
  timing: {
    start: number;
    end: number;
    total: number;
  };
  success: boolean;
}

export class RouterInitializationTester {
  private stages: Map<string, InitializationStage> = new Map();
  private errors: Error[] = [];
  private warnings: string[] = [];
  private startTime: number = 0;
  private initialized = false;

  constructor() {
    this.setupStages();
  }

  private setupStages(): void {
    const stageConfigs = [
      { name: "vue-app", dependencies: [] },
      { name: "pinia", dependencies: ["vue-app"] },
      { name: "stores", dependencies: ["pinia"] },
      { name: "router", dependencies: ["vue-app"] },
      { name: "composables", dependencies: ["vue-app", "pinia"] },
      { name: "services", dependencies: ["router", "stores", "composables"] },
      { name: "navigation", dependencies: ["services", "router"] },
    ];

    stageConfigs.forEach((config: any) => {
      this.stages.set(config.name, {
        name: config.name,
        timestamp: 0,
        status: "pending",
        dependencies: config.dependencies,
      });
    });
  }

  /**
   * Test-Initialisierungsreihenfolge beginnen
   */
  startTest(): void {
    if (this.initialized) {
      console.warn("Test bereits initialisiert");
      return;
    }

    this.initialized = true;
    this.startTime = Date.now();
    console.log("[INIT-TEST] Start der Initialisierungsreihenfolge-Prüfung");

    // Start des automatischen Dependency-Checks
    this.monitorInitialization();
  }

  /**
   * Markiere eine Phase als gestartet
   */
  markStageStarted(stageName: string): void {
    const stage = this.stages.get(stageName);
    if (!stage) {
      this.warnings.push(`Unbekannte Stage: ${stageName}`);
      return;
    }

    // Prüfe Abhängigkeiten
    const missingDeps = this.checkDependencies(stageName);
    if (missingDeps.length > 0) {
      this.warnings.push(
        `Stage ${stageName} gestartet, aber fehlende Abhängigkeiten: ${missingDeps.join(", ")}`,
      );
    }

    stage.status = "initializing";
    stage.timestamp = Date.now();
    console.log(
      `[INIT-TEST] Stage "${stageName}" gestartet${missingDeps.length > 0 ? " (mit Warnungen)" : ""}`,
    );
  }

  /**
   * Markiere eine Phase als abgeschlossen
   */
  markStageCompleted(stageName: string): void {
    const stage = this.stages.get(stageName);
    if (!stage) return;

    stage.status = "success";
    console.log(`[INIT-TEST] Stage "${stageName}" erfolgreich abgeschlossen`);
  }

  /**
   * Markiere eine Phase als fehlgeschlagen
   */
  markStageFailed(stageName: string, error: Error): void {
    const stage = this.stages.get(stageName);
    if (!stage) return;

    stage.status = "error";
    stage.error = error;
    this.errors.push(error);
    console.error(`[INIT-TEST] Stage "${stageName}" fehlgeschlagen:`, error);
  }

  /**
   * Prüfe Abhängigkeiten für eine Stage
   */
  private checkDependencies(stageName: string): string[] {
    const stage = this.stages.get(stageName);
    if (!stage) return [];

    const missingDeps: string[] = [];

    stage.dependencies.forEach((dep: any) => {
      const depStage = this.stages.get(dep);
      if (!depStage || depStage.status !== "success") {
        missingDeps.push(dep);
      }
    });

    return missingDeps;
  }

  /**
   * Überwache die Initialisierung und erkenne Probleme
   */
  private monitorInitialization(): void {
    // Simulated check every 100ms
    const interval = setInterval(() => {
      this.checkForIssues();

      // Beende Überwachung nach 5 Sekunden
      if (Date.now() - this.startTime > 5000) {
        clearInterval(interval);
        this.generateReport();
      }
    }, 100);
  }

  /**
   * Prüfe auf bekannte Initialisierungsprobleme
   */
  private checkForIssues(): void {
    // Prüfe auf Pinia-before-Router Problem
    const piniaStage = this.stages.get("pinia");
    const routerStage = this.stages.get("router");

    if (
      routerStage?.status === "initializing" &&
      (!piniaStage || piniaStage.status === "pending")
    ) {
      this.warnings.push(
        "Router wird vor Pinia initialisiert - mögliche Fehlerquelle",
      );
    }

    // Prüfe auf hängende Initialisierungen
    this.stages.forEach((stage, name: any) => {
      if (
        stage.status === "initializing" &&
        stage.timestamp &&
        Date.now() - stage.timestamp > 2000
      ) {
        this.warnings.push(`Stage ${name} hängt in Initialisierung (>2s)`);
      }
    });
  }

  /**
   * Generiere Abschlussbericht
   */
  generateReport(): InitializationReport {
    const endTime = Date.now();
    const report: InitializationReport = {
      stages: Array.from(this.stages.values()),
      errors: this.errors,
      warnings: this.warnings,
      timing: {
        start: this.startTime,
        end: endTime,
        total: endTime - this.startTime,
      },
      success: this.errors.length === 0,
    };

    console.log("[INIT-TEST] === Initialisierungsbericht ===");
    console.log("Dauer:", report.timing.total, "ms");
    console.log("Status:", report.success ? "ERFOLGREICH" : "FEHLGESCHLAGEN");

    if (report.errors.length > 0) {
      console.error("Fehler:", report.errors);
    }

    if (report.warnings.length > 0) {
      console.warn("Warnungen:", report.warnings);
    }

    console.log("Stages:", report.stages);

    return report;
  }

  /**
   * Integrationshelfer für Vue/Pinia/Router
   */
  static injectMonitoring(
    _app: any,
    options: {
      onPiniaCreated?: () => void;
      onRouterCreated?: () => void;
      onStoreCreated?: (storeName: string) => void;
    } = {},
  ): RouterInitializationTester {
    const tester = new RouterInitializationTester();
    tester.startTest();

    // Markiere Vue App als initialisiert
    tester.markStageStarted("vue-app");
    tester.markStageCompleted("vue-app");

    // Überwache Pinia-Erstellung
    if (options.onPiniaCreated) {
      const originalPiniaCreated = options.onPiniaCreated;
      options.onPiniaCreated = () => {
        tester.markStageStarted("pinia");
        originalPiniaCreated();
        tester.markStageCompleted("pinia");
      };
    }

    // Überwache Router-Erstellung
    if (options.onRouterCreated) {
      const originalRouterCreated = options.onRouterCreated;
      options.onRouterCreated = () => {
        tester.markStageStarted("router");
        originalRouterCreated();
        tester.markStageCompleted("router");
      };
    }

    // Spezielle Überwachung für kritische Punkte
    tester.addCriticalPointMonitoring();

    return tester;
  }

  /**
   * Füge Überwachung für kritische Punkte hinzu
   */
  private addCriticalPointMonitoring(): void {
    // Überwache getActivePinia Aufrufe
    if (typeof window !== "undefined") {
      const originalConsoleError = console.error;
      console.error = (...args) => {
        const message = args.join(" ");

        // Erkenne Pinia-Fehler
        if (
          message.includes("getActivePinia") &&
          message.includes("no active Pinia")
        ) {
          this.errors.push(new Error("Pinia nicht verfügbar bei Zugriff"));
          this.markStageFailed(
            "pinia",
            new Error("getActivePinia called before Pinia initialization"),
          );
        }

        // Erkenne Router-Fehler
        if (message.includes("currentRoute") && message.includes("undefined")) {
          this.errors.push(new Error("Router currentRoute ist undefined"));
          this.markStageFailed(
            "router",
            new Error("currentRoute is undefined"),
          );
        }

        originalConsoleError.apply(console, args);
      };
    }
  }

  /**
   * Prüfe spezifische Initialisierungsreihenfolge
   */
  verifyInitOrder(): boolean {
    const expectedOrder = [
      "vue-app",
      "pinia",
      "router",
      "stores",
      "composables",
      "services",
      "navigation",
    ];
    const _actualOrder: string[] = [];

    // Sortiere Stages nach Timestamp
    const sortedStages = Array.from(this.stages.entries())
      .filter(([_, stage]: any) => stage.timestamp > 0)
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .map(([name]: any) => name);

    // Vergleiche mit erwarteter Reihenfolge
    let isCorrect = true;
    expectedOrder.forEach((stage, index: any) => {
      if (sortedStages[index] !== stage) {
        this.warnings.push(
          `Falsche Reihenfolge: ${stage} erwartet an Position ${index}, gefunden: ${sortedStages[index]}`,
        );
        isCorrect = false;
      }
    });

    return isCorrect;
  }
}

// Export für globalen Zugriff beim Debugging
if (typeof window !== "undefined") {
  (window as any).__routerInitTester = RouterInitializationTester;
}
