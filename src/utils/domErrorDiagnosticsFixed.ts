/**
 * DOM Error Diagnostics Utility - Fixed Version
 *
 * Diese Utility erkennt und diagnostiziert Fehlerbildschirme im DOM,
 * speziell für das Problem mit dem "Schwerwiegender Fehler"-Bildschirm
 * über einer 404-Seite.
 *
 * FIXED: Keine Verwendung von Vue Composables außerhalb von Komponenten
 */

export interface DomErrorDiagnostics {
  hasErrorScreen: boolean;
  has404Page: boolean;
  errorType: string | null;
  errorMessage: string | null;
  componentHierarchy: string[];
  currentRoute: string;
  timestamp: number;
  domSnapshot: string;
}

interface LogEntry {
  timestamp: number;
  level: string;
  message: string;
  data?: any;
}

export class DomErrorDetector {
  private logs: LogEntry[] = [];
  private autoDetectionInterval: number | null = null;
  private maxLogs = 100;

  constructor() {
    // No Vue composables here - use console logging instead
    this.log("info", "DomErrorDetector initialized");
  }

  private log(level: string, message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      data,
    };

    // Keep only the last N logs
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Also log to console in development
    if (import.meta.env.DEV) {
      console.log(
        `[DomErrorDetector] ${level.toUpperCase()}: ${message}`,
        data,
      );
    }
  }

  /**
   * Prüft den aktuellen DOM-Zustand auf Fehlerbildschirme
   */
  public detectErrorState(): DomErrorDiagnostics {
    const errorSelectors = {
      criticalError: '.critical-error, .error-view, [data-error="critical"]',
      notFound: '.not-found-container, .error-404, [data-error="404"]',
      errorBoundary: ".error-boundary-fallback, .error-fallback",
      genericError: '.error-container, .error-message, [role="alert"]',
    };

    const diagnostics: DomErrorDiagnostics = {
      hasErrorScreen: false,
      has404Page: false,
      errorType: null,
      errorMessage: null,
      componentHierarchy: [],
      currentRoute: window.location.pathname,
      timestamp: Date.now(),
      domSnapshot: "",
    };

    // Prüfe auf verschiedene Fehlertypen
    for (const [errorType, selector] of Object.entries(errorSelectors)) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        diagnostics.hasErrorScreen = true;
        diagnostics.errorType = errorType;

        // Extrahiere Fehlermeldung
        const errorMessageElement = elements[0].querySelector(
          ".error-message, p, h2",
        );
        if (errorMessageElement) {
          diagnostics.errorMessage =
            errorMessageElement.textContent?.trim() || null;
        }

        // Speziell auf 404-Fehler prüfen
        if (
          errorType === "notFound" ||
          diagnostics.errorMessage?.includes("404")
        ) {
          diagnostics.has404Page = true;
        }

        break;
      }
    }

    // Sammle Komponenten-Hierarchie
    diagnostics.componentHierarchy = this.getComponentHierarchy();

    // Erstelle DOM-Snapshot für Debugging
    diagnostics.domSnapshot = this.createDomSnapshot();

    this.log("info", "Error state detected", diagnostics);
    return diagnostics;
  }

  /**
   * Entfernt Fehlerbildschirme aus dem DOM
   */
  public clearErrorElements(): boolean {
    try {
      const selectors = [
        ".critical-error",
        ".error-view",
        ".error-boundary-fallback",
        "[data-error]",
      ];

      let removedCount = 0;

      selectors.forEach((selector: any) => {
        const elements = document.querySelectorAll(selector);
        elements.forEach((element: any) => {
          element.remove();
          removedCount++;
        });
      });

      this.log("info", `Removed ${removedCount} error elements`);
      return removedCount > 0;
    } catch (error) {
      this.log("error", "Failed to clear error elements", error);
      return false;
    }
  }

  /**
   * Injiziert ein Recovery-Script in den DOM
   */
  public injectRecoveryScript(): void {
    try {
      const existingScript = document.getElementById("error-recovery-script");
      if (existingScript) return;

      const script = document.createElement("script");
      script.id = "error-recovery-script";
      script.innerHTML = `
        window._errorRecovery = {
          attempt: 0,
          maxAttempts: 3,
          
          recover: function() {
            console.log('Attempting recovery, attempt', this.attempt + 1);
            
            // Entferne Fehlerelemente
            const errorElements = document.querySelectorAll('.critical-error, .error-view');
            errorElements.forEach(el => el.remove());
            
            // Versuche Vue Router zu nutzen
            if (window.app && window.app.$router) {
              window.app.$router.push('/').catch(() => {
                window.location.href = '/';
              });
            } else {
              window.location.href = '/';
            }
            
            this.attempt++;
          },
          
          reset: function() {
            this.attempt = 0;
            window.location.reload();
          }
        };
      `;

      document.head.appendChild(script);
      this.log("info", "Recovery script injected");
    } catch (error) {
      this.log("error", "Failed to inject recovery script", error);
    }
  }

  /**
   * Startet automatische Fehler-Überwachung
   */
  public startAutoDetection(interval = 5000): () => void {
    this.stopAutoDetection();

    this.autoDetectionInterval = window.setInterval(() => {
      const diagnostics = this.detectErrorState();

      if (diagnostics.hasErrorScreen) {
        this.log(
          "warn",
          "Error screen detected in auto-detection",
          diagnostics,
        );

        // Triggere custom Event
        const event = new CustomEvent("dom-error-detected", {
          detail: diagnostics,
        });
        window.dispatchEvent(event);
      }
    }, interval);

    this.log("info", `Auto-detection started with interval ${interval}ms`);

    // Return cleanup function
    return () => this.stopAutoDetection();
  }

  /**
   * Stoppt automatische Fehler-Überwachung
   */
  public stopAutoDetection(): void {
    if (this.autoDetectionInterval) {
      clearInterval(this.autoDetectionInterval);
      this.autoDetectionInterval = null;
      this.log("info", "Auto-detection stopped");
    }
  }

  /**
   * Erstellt einen Snapshot der Komponenten-Hierarchie
   */
  private getComponentHierarchy(): string[] {
    const hierarchy: string[] = [];

    try {
      const appElement = document.querySelector("#app");
      if (!appElement) return hierarchy;

      const traverse = (element: Element, depth = 0): void => {
        if (depth > 10) return; // Prevent infinite recursion

        const vueComponent = (element as any).__vue__;
        if (vueComponent) {
          hierarchy.push(
            `${"  ".repeat(depth)}${vueComponent.$options.name || "Anonymous"}`,
          );
        }

        Array.from(element.children).forEach((child: any) => {
          traverse(child, depth + 1);
        });
      };

      traverse(appElement);
    } catch (error) {
      this.log("error", "Failed to get component hierarchy", error);
    }

    return hierarchy;
  }

  /**
   * Erstellt einen DOM-Snapshot für Debugging
   */
  private createDomSnapshot(): string {
    try {
      const criticalElements = document.querySelectorAll("#app > *");
      const snapshot: string[] = [];

      criticalElements.forEach((element: any) => {
        snapshot.push(`${element.tagName}.${element.className}`);
      });

      return snapshot.join(" > ");
    } catch (error) {
      this.log("error", "Failed to create DOM snapshot", error);
      return "";
    }
  }

  /**
   * Gibt die letzten Logs zurück
   */
  public getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Räumt Log-Einträge auf
   */
  public clearLogs(): void {
    this.logs = [];
  }
}

// Export singleton instance
export const domErrorDetector = new DomErrorDetector();
