/**
 * Router Service
 *
 * Zentralisierter Service für alle Router-Operationen mit robuster Fehlerbehandlung
 * und deterministischer Navigation
 */

import { Router, RouteLocationNormalized, NavigationFailure } from "vue-router";
import { ref } from "vue";
import type { Logger } from "@/composables/useLogger";
import type { FeatureTogglesStore } from "@/stores/featureToggles";

export interface NavigationResult {
  success: boolean;
  route?: RouteLocationNormalized;
  error?: Error;
  retries: number;
  duration: number;
}

export interface RouterState {
  isInitialized: boolean;
  isNavigating: boolean;
  lastSuccessfulRoute: string | null;
  failedNavigations: Map<string, number>;
  routeCache: Map<string, RouteLocationNormalized>;
}

export class RouterService {
  private static instance: RouterService;
  private router: Router | null = null;
  private logger: Logger | null = null;
  private featureToggles: FeatureTogglesStore | null = null;

  // State
  private state = ref<RouterState>({
    isInitialized: false,
    isNavigating: false,
    lastSuccessfulRoute: null,
    failedNavigations: new Map(),
    routeCache: new Map(),
  });

  // Configuration
  private readonly config = {
    maxRetries: 3,
    retryDelay: 1000,
    exponentialBackoff: true,
    initializationTimeout: 5000,
    navigationTimeout: 10000,
  };

  private constructor() {
    // Logger und Stores werden später initialisiert
    this.loadStateFromStorage();
  }

  /**
   * Singleton-Instanz abrufen
   */
  public static getInstance(): RouterService {
    if (!RouterService.instance) {
      RouterService.instance = new RouterService();
    }
    return RouterService.instance;
  }

  /**
   * Initialisiert die benötigten Dependencies
   */
  private async initializeDependencies(): Promise<void> {
    if (!this.logger) {
      try {
        // Dynamischer Import um zirkuläre Abhängigkeiten zu vermeiden
        const { useLogger } = await import("@/composables/useLogger");
        this.logger = useLogger();
      } catch (error) {
        console.error("Logger konnte nicht initialisiert werden:", error);
      }
    }

    if (!this.featureToggles) {
      try {
        // Prüfe ob Pinia verfügbar ist
        const { useFeatureTogglesStore } = await import(
          "@/stores/featureToggles"
        );
        this.featureToggles = useFeatureTogglesStore();
      } catch (error) {
        console.warn("Feature Toggles Store nicht verfügbar:", error);
      }
    }
  }

  /**
   * Router initialisieren
   */
  public async initialize(router: Router): Promise<boolean> {
    this.log("info", "RouterService: Initialisierung gestartet");

    try {
      // Dependencies initialisieren
      await this.initializeDependencies();
      this.initializeDependencies();

      // Prüfe auf gültige Router-Instanz
      if (!router || typeof router.push !== "function") {
        throw new Error("Ungültige Router-Instanz");
      }

      this.router = router;

      // Warte auf Router-Bereitschaft
      await this.waitForRouterReady();

      this.state.value.isInitialized = true;
      this.setupNavigationGuards();
      this.log("info", "RouterService: Erfolgreich initialisiert");

      return true;
    } catch (error) {
      this.log("error", "RouterService: Initialisierung fehlgeschlagen", error);
      this.state.value.isInitialized = false;
      return false;
    }
  }

  /**
   * Logging-Wrapper für sicheres Logging
   */
  private log(
    level: "info" | "warn" | "error" | "debug",
    message: string,
    ...args: any[]
  ): void {
    if (this.logger) {
      this.logger[level](message, ...args);
    } else {
      console[level](message, ...args);
    }
  }

  /**
   * Wartet darauf, dass der Router bereit ist
   */
  private async waitForRouterReady(): Promise<void> {
    const startTime = Date.now();

    while (
      !this.isRouterReady() &&
      Date.now() - startTime < this.config.initializationTimeout
    ) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (!this.isRouterReady()) {
      throw new Error("Router-Initialisierung Timeout");
    }
  }

  /**
   * Prüft ob der Router bereit ist
   */
  private isRouterReady(): boolean {
    if (!this.router) return false;

    try {
      // Prüfe auf currentRoute Verfügbarkeit
      const currentRoute = this.router.currentRoute;
      return !!currentRoute && !!currentRoute.value;
    } catch {
      return false;
    }
  }

  /**
   * Sichere Navigation mit Retry-Logik
   */
  public async navigate(
    path: string | RouteLocationNormalized,
    options: { retries?: number; force?: boolean } = {},
  ): Promise<NavigationResult> {
    const startTime = Date.now();
    const { retries = this.config.maxRetries, force = false } = options;

    // Prüfe Router-Verfügbarkeit
    if (!this.ensureRouterAvailable()) {
      return {
        success: false,
        error: new Error("Router nicht verfügbar"),
        retries: 0,
        duration: Date.now() - startTime,
      };
    }

    // Verhindere gleichzeitige Navigationen
    if (this.state.value.isNavigating && !force) {
      this.log("warn", "Navigation bereits im Gange");
      return {
        success: false,
        error: new Error("Navigation bereits im Gange"),
        retries: 0,
        duration: Date.now() - startTime,
      };
    }

    this.state.value.isNavigating = true;

    try {
      const targetPath = typeof path === "string" ? path : path.fullPath;

      // Prüfe auf fehlerhafte Navigation in der Vergangenheit
      const failCount = this.state.value.failedNavigations.get(targetPath) || 0;
      if (failCount >= this.config.maxRetries && !force) {
        throw new Error(
          `Route ${targetPath} hat maximale Fehleranzahl erreicht`,
        );
      }

      // Navigation mit Retry
      const result = await this.navigateWithRetry(path, retries);

      if (result.success) {
        // Erfolgreiche Navigation speichern
        this.state.value.lastSuccessfulRoute = result.route!.fullPath;
        this.state.value.failedNavigations.delete(targetPath);
        this.state.value.routeCache.set(targetPath, result.route!);
        this.saveStateToStorage();
      } else {
        // Fehlgeschlagene Navigation vermerken
        this.state.value.failedNavigations.set(
          targetPath,
          (this.state.value.failedNavigations.get(targetPath) || 0) + 1,
        );
      }

      return result;
    } finally {
      this.state.value.isNavigating = false;
    }
  }

  /**
   * Navigation mit Retry-Logik
   */
  private async navigateWithRetry(
    path: string | RouteLocationNormalized,
    maxRetries: number,
  ): Promise<NavigationResult> {
    let lastError: Error | undefined;
    let retryCount = 0;
    const startTime = Date.now();

    while (retryCount <= maxRetries) {
      try {
        // Validiere Route vor Navigation
        const isValid = await this.validateRoute(path);
        if (!isValid) {
          throw new Error("Route-Validierung fehlgeschlagen");
        }

        // Führe Navigation aus
        const route = await this.performNavigation(path);

        return {
          success: true,
          route,
          retries: retryCount,
          duration: Date.now() - startTime,
        };
      } catch (error) {
        lastError = error as Error;
        this.log(
          "warn",
          `Navigation fehlgeschlagen (Versuch ${retryCount + 1}/${maxRetries + 1})`,
          error,
        );

        if (retryCount < maxRetries) {
          const delay = this.calculateRetryDelay(retryCount);
          await new Promise((resolve) => setTimeout(resolve, delay));
          retryCount++;
        } else {
          break;
        }
      }
    }

    return {
      success: false,
      error: lastError,
      retries: retryCount,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Validiert eine Route vor der Navigation
   */
  private async validateRoute(
    path: string | RouteLocationNormalized,
  ): Promise<boolean> {
    if (!this.router) return false;

    try {
      const targetPath = typeof path === "string" ? path : path.fullPath;

      // Prüfe auf bekannte problematische Pfade
      if (this.isProblematicPath(targetPath)) {
        this.log("warn", `Problematischer Pfad erkannt: ${targetPath}`);

        // Spezielle Behandlung für Chat-Routen
        if (targetPath.startsWith("/chat/")) {
          return this.validateChatRoute(targetPath);
        }
      }

      // Allgemeine Route-Validierung
      const route = this.router.resolve(targetPath);
      return !!route && !!route.name;
    } catch (error) {
      this.log("error", "Route-Validierung fehlgeschlagen", error);
      return false;
    }
  }

  /**
   * Validiert Chat-Routen speziell
   */
  private async validateChatRoute(path: string): Promise<boolean> {
    const sessionIdMatch = path.match(/\/chat\/([^/]+)/);
    if (!sessionIdMatch || !sessionIdMatch[1]) {
      return false;
    }

    const sessionId = sessionIdMatch[1];

    // Validiere Session-ID Format
    if (!this.isValidSessionId(sessionId)) {
      this.log("warn", `Ungültige Session-ID: ${sessionId}`);
      return false;
    }

    // Weitere Validierung könnte hier erfolgen (z.B. Prüfung ob Session existiert)
    return true;
  }

  /**
   * Prüft ob eine Session-ID gültig ist
   */
  private isValidSessionId(sessionId: string): boolean {
    // UUID v4 Format Validierung
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(sessionId);
  }

  /**
   * Führt die tatsächliche Navigation aus
   */
  private async performNavigation(
    path: string | RouteLocationNormalized,
  ): Promise<RouteLocationNormalized> {
    if (!this.router) {
      throw new Error("Router nicht verfügbar");
    }

    try {
      const result = await this.router.push(path);

      // Prüfe auf Navigation-Fehler
      if (result && typeof result === "object" && "type" in result) {
        const failure = result as NavigationFailure;
        throw new Error(`Navigation fehlgeschlagen: ${failure.type}`);
      }

      // Warte auf Router-Update
      await this.waitForRouteUpdate();

      return this.router.currentRoute.value;
    } catch (error) {
      // Spezielle Behandlung für bestimmte Fehlertypen
      if (error instanceof Error) {
        if (error.message.includes("undefined")) {
          throw new Error("Router-Zustand inkonsistent");
        }
      }
      throw error;
    }
  }

  /**
   * Wartet auf Router-Update nach Navigation
   */
  private async waitForRouteUpdate(): Promise<void> {
    if (!this.router) return;

    const startTime = Date.now();
    const timeout = 2000;

    while (Date.now() - startTime < timeout) {
      try {
        if (this.router.currentRoute && this.router.currentRoute.value) {
          return;
        }
      } catch {
        // Ignoriere Fehler und versuche erneut
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    throw new Error("Router-Update Timeout");
  }

  /**
   * Fallback-Navigation zur letzten funktionierenden Route
   */
  public async navigateToLastWorking(): Promise<NavigationResult> {
    const lastRoute = this.state.value.lastSuccessfulRoute;

    if (lastRoute) {
      this.log(
        "info",
        `Navigiere zur letzten funktionierenden Route: ${lastRoute}`,
      );
      return this.navigate(lastRoute, { force: true });
    }

    // Fallback zur Startseite
    return this.navigate("/", { force: true });
  }

  /**
   * Navigiert zur Fallback-Route
   */
  public async navigateToFallback(reason?: string): Promise<NavigationResult> {
    this.log("warn", `Fallback-Navigation ausgelöst: ${reason || "unbekannt"}`);

    // Versuche zuerst die letzte funktionierende Route
    const lastWorkingResult = await this.navigateToLastWorking();
    if (lastWorkingResult.success) {
      return lastWorkingResult;
    }

    // Ansonsten zur Startseite
    return this.navigate("/", { force: true, retries: 5 });
  }

  /**
   * Prüft ob ein Pfad als problematisch bekannt ist
   */
  private isProblematicPath(path: string): boolean {
    const problematicPatterns = [
      /^\/chat\/[^/]+$/, // Chat mit Session-ID
      /^\/session\/[^/]+$/, // Session-Routen
      /^\/admin/, // Admin-Bereich
    ];

    return problematicPatterns.some((pattern) => pattern.test(path));
  }

  /**
   * Berechnet Retry-Verzögerung
   */
  private calculateRetryDelay(attempt: number): number {
    if (this.config.exponentialBackoff) {
      return Math.min(this.config.retryDelay * Math.pow(2, attempt), 10000);
    }
    return this.config.retryDelay;
  }

  /**
   * Stellt sicher dass der Router verfügbar ist
   */
  private ensureRouterAvailable(): boolean {
    if (!this.router) {
      this.log("error", "Router nicht initialisiert");
      return false;
    }

    try {
      // Teste Router-Verfügbarkeit

      return true;
    } catch (error) {
      this.log("error", "Router nicht verfügbar", error);
      return false;
    }
  }

  /**
   * Navigation Guards einrichten
   */
  private setupNavigationGuards(): void {
    if (!this.router) return;

    // Before Each Guard
    this.router.beforeEach((to, from, next) => {
      this.log("debug", `Navigation: ${from.path} -> ${to.path}`);

      // Speichere erfolgreiche Route
      if (from.path && from.path !== "/" && !from.path.includes("error")) {
        this.state.value.lastSuccessfulRoute = from.path;
      }

      next();
    });

    // After Each Guard
    this.router.afterEach((to, from, failure) => {
      if (failure) {
        this.log("error", "Navigation fehlgeschlagen", failure);
      } else {
        // Erfolgreiche Navigation cachen
        this.state.value.routeCache.set(to.fullPath, to);
      }
    });
  }

  /**
   * Speichert den Zustand im LocalStorage
   */
  private saveStateToStorage(): void {
    try {
      const stateToSave = {
        lastSuccessfulRoute: this.state.value.lastSuccessfulRoute,
        failedNavigations: Array.from(
          this.state.value.failedNavigations.entries(),
        ),
      };

      localStorage.setItem("routerServiceState", JSON.stringify(stateToSave));
    } catch (error) {
      this.log("error", "Fehler beim Speichern des Router-Zustands", error);
    }
  }

  /**
   * Lädt den Zustand aus dem LocalStorage
   */
  private loadStateFromStorage(): void {
    try {
      const savedState = localStorage.getItem("routerServiceState");

      if (savedState) {
        const parsed = JSON.parse(savedState);

        this.state.value.lastSuccessfulRoute = parsed.lastSuccessfulRoute;
        this.state.value.failedNavigations = new Map(parsed.failedNavigations);
      }
    } catch (error) {
      console.error("Fehler beim Laden des Router-Zustands", error);
    }
  }

  /**
   * Setzt den Service zurück
   */
  public reset(): void {
    this.state.value = {
      isInitialized: false,
      isNavigating: false,
      lastSuccessfulRoute: null,
      failedNavigations: new Map(),
      routeCache: new Map(),
    };

    localStorage.removeItem("routerServiceState");
  }

  /**
   * Gibt den aktuellen Zustand zurück
   */
  public getState(): RouterState {
    return { ...this.state.value };
  }

  /**
   * Gibt die aktuelle Route zurück (sicher)
   */
  public getCurrentRoute(): RouteLocationNormalized | null {
    if (!this.router) return null;

    try {
      return this.router.currentRoute.value;
    } catch (error) {
      this.log("error", "Fehler beim Abrufen der aktuellen Route", error);
      return null;
    }
  }
}

// Singleton-Export
export const routerService = RouterService.getInstance();
