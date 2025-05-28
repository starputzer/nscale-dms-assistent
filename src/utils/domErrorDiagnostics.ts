/**
 * DOM Error Diagnostics Utility
 *
 * Diese Utility erkennt und diagnostiziert Fehlerbildschirme im DOM,
 * speziell für das Problem mit dem "Schwerwiegender Fehler"-Bildschirm
 * über einer 404-Seite.
 */

import { useLogger } from "@/composables/useLogger";
import { useRouter } from "vue-router";
import type { Router } from "vue-router";

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

export class DomErrorDetector {
  private logger = useLogger();
  private router: Router | null = null;

  constructor() {
    try {
      this.router = useRouter();
    } catch (error) {
      console.warn(
        "Router konnte nicht in DomErrorDetector initialisiert werden:",
        error,
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
      currentRoute: this.router?.currentRoute?.value?.fullPath || "unknown",
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

    // Prüfe spezifisch auf den "Schwerwiegender Fehler"-Text
    const allText = document.body.innerText.toLowerCase();
    if (
      allText.includes("schwerwiegender fehler") ||
      allText.includes("kritischer fehler")
    ) {
      diagnostics.hasErrorScreen = true;
      diagnostics.errorType = "critical";
    }

    // Erfasse die Komponenten-Hierarchie
    diagnostics.componentHierarchy = this.getComponentHierarchy();

    // Erstelle einen DOM-Snapshot für Debugging
    diagnostics.domSnapshot = this.createDomSnapshot();

    // Logge die Diagnose
    this.logger.debug("DOM Error Diagnostics:", diagnostics);

    return diagnostics;
  }

  /**
   * Ermittelt die Vue-Komponenten-Hierarchie
   */
  private getComponentHierarchy(): string[] {
    const hierarchy: string[] = [];
    const vueApp = document.querySelector("#app");

    if (!vueApp) return hierarchy;

    // Traversiere den DOM-Baum und suche nach Vue-Komponenten
    const walkTree = (element: Element, depth = 0) => {
      // Vue 3 speichert Komponenten-Info in __vueParentComponent
      const vueInstance = (element as any).__vueParentComponent;

      if (vueInstance?.type?.name) {
        hierarchy.push(`${"  ".repeat(depth)}${vueInstance.type.name}`);
      }

      // Prüfe auch auf data-component Attribute
      const componentName = element.getAttribute("data-component");
      if (componentName) {
        hierarchy.push(`${"  ".repeat(depth)}${componentName} (data-attr)`);
      }

      // Rekursiv durch Kinder
      for (const child of element.children) {
        walkTree(child, depth + 1);
      }
    };

    walkTree(vueApp);
    return hierarchy;
  }

  /**
   * Erstellt einen vereinfachten DOM-Snapshot
   */
  private createDomSnapshot(): string {
    const maxDepth = 5;
    const maxTextLength = 50;

    const simplifyNode = (node: Element, depth = 0): string => {
      if (depth > maxDepth) return "...";

      const tag = node.tagName.toLowerCase();
      const classes = Array.from(node.classList).join(".");
      const id = node.id ? `#${node.id}` : "";

      let text = "";
      if (
        node.childNodes.length === 1 &&
        node.childNodes[0].nodeType === Node.TEXT_NODE
      ) {
        text = node.textContent?.trim().substring(0, maxTextLength) || "";
        if (text) text = `: "${text}"`;
      }

      const childrenStr = Array.from(node.children)
        .map((child) => simplifyNode(child as Element, depth + 1))
        .filter(Boolean)
        .join("\n");

      const indent = "  ".repeat(depth);
      const selfStr = `${indent}<${tag}${id}${classes ? "." + classes : ""}${text}>`;

      if (childrenStr) {
        return `${selfStr}\n${childrenStr}\n${indent}</${tag}>`;
      }

      return selfStr;
    };

    const body = document.body;
    return simplifyNode(body);
  }

  /**
   * Prüft, ob sich unter dem Fehlerbildschirm eine andere Seite befindet
   */
  public detectHiddenContent(): {
    hasHiddenContent: boolean;
    hiddenRoute?: string;
  } {
    // Suche nach mehreren Vue-App-Instanzen oder überlagerten Komponenten
    const appElements = document.querySelectorAll("[data-v-app], #app > *");

    if (appElements.length > 1) {
      // Prüfe z-index und Position
      const topElement = Array.from(appElements).find((el) => {
        const style = window.getComputedStyle(el);
        return (
          style.position === "fixed" ||
          style.position === "absolute" ||
          parseInt(style.zIndex) > 1000
        );
      });

      if (topElement) {
        // Es gibt ein überlagerndes Element
        return {
          hasHiddenContent: true,
          hiddenRoute: this.extractRouteFromElement(topElement),
        };
      }
    }

    return { hasHiddenContent: false };
  }

  /**
   * Versucht, die Route aus einem Element zu extrahieren
   */
  private extractRouteFromElement(element: Element): string | undefined {
    // Prüfe data-route Attribute
    const dataRoute = element.getAttribute("data-route");
    if (dataRoute) return dataRoute;

    // Prüfe Klassen auf Route-Hinweise
    const classes = Array.from(element.classList);
    const routeClass = classes.find(
      (cls) =>
        cls.includes("view") || cls.includes("page") || cls.includes("route"),
    );

    if (routeClass) {
      return (
        "/" + routeClass.replace(/-view|-page|-route/g, "").replace(/-/g, "/")
      );
    }

    return undefined;
  }

  /**
   * Protokolliert die aktuelle Fehlerdiagnose
   */
  public logDiagnostics(): void {
    const diagnostics = this.detectErrorState();
    const hiddenContent = this.detectHiddenContent();

    this.logger.warn("=== DOM Error Diagnostics Report ===", {
      diagnostics,
      hiddenContent,
      windowLocation: window.location.href,
      routerState: {
        currentRoute: this.router?.currentRoute?.value?.fullPath || "unknown",
        name: this.router?.currentRoute?.value?.name || "unknown",
        params: this.router?.currentRoute?.value?.params || {},
        query: this.router?.currentRoute?.value?.query || {},
      },
      timestamp: new Date().toISOString(),
    });

    // In der Entwicklung auch in die Konsole
    if (import.meta.env.DEV) {
      console.group("🔍 DOM Error Diagnostics");
      console.log("Error State:", diagnostics);
      console.log("Hidden Content:", hiddenContent);
      console.log("Component Hierarchy:", diagnostics.componentHierarchy);
      console.log("DOM Snapshot:\n", diagnostics.domSnapshot);
      console.groupEnd();
    }
  }

  /**
   * Automatische Fehlererkennungs-Schleife
   */
  public startAutoDetection(interval = 5000): () => void {
    let lastErrorState = false;

    const checkInterval = setInterval(() => {
      const diagnostics = this.detectErrorState();

      // Wenn ein neuer Fehler erkannt wurde
      if (diagnostics.hasErrorScreen && !lastErrorState) {
        this.logger.error("Fehlerbildschirm erkannt!", diagnostics);
        this.logDiagnostics();

        // Trigger für Selbstheilungs-Mechanismus
        if (diagnostics.has404Page) {
          window.dispatchEvent(
            new CustomEvent("dom-error-detected", {
              detail: diagnostics,
            }),
          );
        }
      }

      lastErrorState = diagnostics.hasErrorScreen;
    }, interval);

    // Cleanup-Funktion zurückgeben
    return () => clearInterval(checkInterval);
  }
}

// Singleton-Instanz exportieren
export const domErrorDetector = new DomErrorDetector();
