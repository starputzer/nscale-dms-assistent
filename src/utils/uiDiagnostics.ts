/**
 * UI Diagnostics Tool
 * Hilft bei der Diagnose von UI-Rendering-Problemen
 */

import { ref, onMounted, onUnmounted, type Ref } from "vue";
import { useLogger } from "@/composables/useLogger";
import { useRouter, type Router } from "vue-router";

export interface UIError {
  component: string;
  error: Error;
  phase: "created" | "mounted" | "updated" | "unmounted" | "render";
  timestamp: Date;
  context?: any;
}

export interface UIState {
  currentView: string;
  isAuthenticated: boolean;
  hasError: boolean;
  errorDetails?: UIError;
  pendingDataLoads: string[];
  componentLifecycle: Map<string, string[]>;
}

export class UIDiagnostics {
  private static instance: UIDiagnostics;
  private logger: ReturnType<typeof useLogger>;
  private errors: UIError[] = [];
  public state: Ref<UIState>;
  private router?: Router;

  private constructor() {
    this.logger = useLogger();
    this.state = ref<UIState>({
      currentView: "unknown",
      isAuthenticated: false,
      hasError: false,
      pendingDataLoads: [],
      componentLifecycle: new Map(),
    });
  }

  static getInstance(): UIDiagnostics {
    if (!UIDiagnostics.instance) {
      UIDiagnostics.instance = new UIDiagnostics();
    }
    return UIDiagnostics.instance;
  }

  /**
   * Fehler erfassen und protokollieren
   */
  captureError(
    component: string,
    error: Error,
    phase: UIError["phase"],
    context?: any,
  ): void {
    const uiError: UIError = {
      component,
      error,
      phase,
      timestamp: new Date(),
      context,
    };

    this.errors.push(uiError);
    this.state.value.hasError = true;
    this.state.value.errorDetails = uiError;

    // Detailliertes Logging
    this.logger.error(`UI Error in ${component} during ${phase}`, {
      message: error.message,
      stack: error.stack,
      context,
      allErrors: this.errors,
    });

    // Spezifische Fehlerbehandlung für bekannte Probleme
    if (error.message.includes("Cannot read properties of undefined")) {
      this.handleUndefinedPropertyError(component, error, context);
    } else if (error.message.includes("messagesResponse is not defined")) {
      this.handleMessagesResponseError(component, error, context);
    }
  }

  /**
   * Behandlung von Undefined Property Errors
   */
  private handleUndefinedPropertyError(
    component: string,
    error: Error,
    context?: any,
  ): void {
    this.logger.warn(`Undefined property error in ${component}`, {
      error: error.message,
      suggestion: "Check data initialization and async loading",
      context,
    });

    // Analysiere welche Properties undefined sind
    const errorMatch = error.message.match(
      /Cannot read properties of undefined \(reading '(.+)'\)/,
    );
    if (errorMatch) {
      const property = errorMatch[1];
      this.logger.info(`Missing property: ${property}`, {
        component,
        availableData: context?.availableData || "unknown",
      });
    }
  }

  /**
   * Behandlung von messagesResponse Error
   */
  private handleMessagesResponseError(
    component: string,
    error: Error,
    context?: any,
  ): void {
    this.logger.error(`messagesResponse error in ${component}`, {
      error: error.message,
      suggestion: "Check batch response processing",
      context,
    });
  }

  /**
   * Component Lifecycle Tracking
   */
  trackLifecycle(component: string, phase: string): void {
    if (!this.state.value.componentLifecycle.has(component)) {
      this.state.value.componentLifecycle.set(component, []);
    }

    const lifecycle = this.state.value.componentLifecycle.get(component)!;
    lifecycle.push(`${phase}: ${new Date().toISOString()}`);

    this.logger.debug(`Component ${component} - ${phase}`, {
      lifecycle,
      hasErrors: this.errors.some((e) => e.component === component),
    });
  }

  /**
   * Data Loading Tracking
   */
  trackDataLoad(
    dataType: string,
    status: "start" | "success" | "error",
    details?: any,
  ): void {
    if (status === "start") {
      this.state.value.pendingDataLoads.push(dataType);
      this.logger.debug(`Data load started: ${dataType}`);
    } else {
      this.state.value.pendingDataLoads =
        this.state.value.pendingDataLoads.filter((load) => load !== dataType);
      this.logger.debug(`Data load ${status}: ${dataType}`, details);
    }
  }

  /**
   * Router Navigation Tracking
   */
  trackNavigation(from: string, to: string, success: boolean): void {
    this.state.value.currentView = success ? to : from;

    this.logger.info(`Navigation ${success ? "successful" : "failed"}`, {
      from,
      to,
      hasErrors: this.state.value.hasError,
      pendingLoads: this.state.value.pendingDataLoads,
    });
  }

  /**
   * Generate Diagnostic Report
   */
  generateReport(): string {
    const report = {
      timestamp: new Date().toISOString(),
      currentState: this.state.value,
      errors: this.errors,
      errorSummary: this.summarizeErrors(),
      recommendations: this.generateRecommendations(),
    };

    return JSON.stringify(report, null, 2);
  }

  /**
   * Summarize Errors by Type
   */
  private summarizeErrors(): Record<string, number> {
    const summary: Record<string, number> = {};

    this.errors.forEach((error) => {
      const key = `${error.component}-${error.phase}`;
      summary[key] = (summary[key] || 0) + 1;
    });

    return summary;
  }

  /**
   * Generate Recommendations Based on Errors
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    if (this.errors.some((e) => e.error.message.includes("undefined"))) {
      recommendations.push(
        "Check data initialization and ensure all required data is loaded before rendering",
      );
    }

    if (this.errors.some((e) => e.phase === "mounted")) {
      recommendations.push(
        "Review onMounted hooks for async operations without proper error handling",
      );
    }

    if (this.state.value.pendingDataLoads.length > 0) {
      recommendations.push(
        `Pending data loads: ${this.state.value.pendingDataLoads.join(", ")}`,
      );
    }

    return recommendations;
  }

  /**
   * Clear Diagnostics
   */
  clear(): void {
    this.errors = [];
    this.state.value = {
      currentView: "unknown",
      isAuthenticated: false,
      hasError: false,
      pendingDataLoads: [],
      componentLifecycle: new Map(),
    };
  }

  /**
   * Export Diagnostics to Console
   */
  exportToConsole(): void {
    console.group("🔍 UI Diagnostics Report");
    console.log("Current State:", this.state.value);
    console.log("Errors:", this.errors);
    console.log("Report:", this.generateReport());
    console.groupEnd();
  }
}

// Composable für Komponenten
export function useUIDiagnostics(componentName: string) {
  const diagnostics = UIDiagnostics.getInstance();
  const router = useRouter();

  onMounted(() => {
    diagnostics.trackLifecycle(componentName, "mounted");
  });

  onUnmounted(() => {
    diagnostics.trackLifecycle(componentName, "unmounted");
  });

  return {
    captureError: (
      error: Error,
      phase: UIError["phase"] = "render",
      context?: any,
    ) => {
      diagnostics.captureError(componentName, error, phase, context);
    },
    trackDataLoad: (
      dataType: string,
      status: "start" | "success" | "error",
      details?: any,
    ) => {
      diagnostics.trackDataLoad(dataType, status, details);
    },
    trackLifecycle: (phase: string) => {
      diagnostics.trackLifecycle(componentName, phase);
    },
    generateReport: () => diagnostics.generateReport(),
    exportToConsole: () => diagnostics.exportToConsole(),
  };
}

// Global Error Handler
export function setupGlobalUIErrorHandler() {
  const diagnostics = UIDiagnostics.getInstance();

  window.addEventListener("error", (event) => {
    diagnostics.captureError("Global", event.error, "render", {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    diagnostics.captureError("Global", new Error(event.reason), "render", {
      promise: event.promise,
    });
  });
}
