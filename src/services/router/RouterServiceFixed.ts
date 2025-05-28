/**
 * Router Service Fixed
 *
 * Zentralisierter Service für alle Router-Operationen mit robuster Fehlerbehandlung
 * und deterministischer Navigation - Ohne Composables außerhalb von Komponenten
 */

import { Router, RouteLocationNormalized, NavigationFailure } from "vue-router";
import { ref, computed } from "vue";

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
  initStatus: "pending" | "ready" | "failed";
}

export class RouterService {
  private static instance: RouterService;
  private router: Router | null = null;
  private initPromise: Promise<void> | null = null;

  // State
  private state = ref<RouterState>({
    isInitialized: false,
    isNavigating: false,
    lastSuccessfulRoute: null,
    failedNavigations: new Map(),
    routeCache: new Map(),
    initStatus: "pending",
  });

  // Configuration
  private readonly config = {
    maxRetries: 3,
    retryDelay: 1000,
    exponentialBackoff: true,
    initializationTimeout: 5000,
    navigationTimeout: 10000,
  };

  // Computed properties
  public readonly isInitialized = computed(
    () => this.state.value.isInitialized,
  );
  public readonly isNavigating = computed(() => this.state.value.isNavigating);
  public readonly currentRoute = computed(
    () => this.router?.currentRoute.value,
  );
  public readonly initStatus = computed(() => this.state.value.initStatus);

  private constructor() {
    // Private constructor for singleton
    console.log("[RouterService] Instance created");
  }

  public static getInstance(): RouterService {
    if (!RouterService.instance) {
      RouterService.instance = new RouterService();
    }
    return RouterService.instance;
  }

  /**
   * Set the router instance
   */
  public setRouter(router: Router): void {
    this.router = router;
    this.state.value.isInitialized = true;
    this.state.value.initStatus = "ready";
    console.log("[RouterService] Router set successfully");
  }

  /**
   * Get the router instance
   */
  public getRouter(): Router | null {
    return this.router;
  }

  /**
   * Wait for router to be ready
   */
  public async waitForRouter(timeout?: number): Promise<Router> {
    if (this.router) {
      return this.router;
    }

    const timeoutMs = timeout || this.config.initializationTimeout;

    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const checkRouter = () => {
        if (this.router) {
          resolve(this.router);
          return;
        }

        if (Date.now() - startTime > timeoutMs) {
          this.state.value.initStatus = "failed";
          reject(new Error("Router initialization timeout"));
          return;
        }

        setTimeout(checkRouter, 100);
      };

      checkRouter();
    });
  }

  /**
   * Navigate to a route with retry logic
   */
  public async navigate(
    to: string | RouteLocationNormalized,
    options: { force?: boolean; retries?: number } = {},
  ): Promise<NavigationResult> {
    const startTime = Date.now();
    const maxRetries = options.retries ?? this.config.maxRetries;
    let retries = 0;

    // Wait for router to be ready
    if (!this.router) {
      try {
        await this.waitForRouter();
      } catch (error) {
        return {
          success: false,
          error: error as Error,
          retries: 0,
          duration: Date.now() - startTime,
        };
      }
    }

    // Set navigating state
    this.state.value.isNavigating = true;

    while (retries <= maxRetries) {
      try {
        const result = await this.router!.push(to);

        // Cache successful navigation
        const currentRoute = this.router!.currentRoute.value;
        this.state.value.routeCache.set(currentRoute.fullPath, currentRoute);
        this.state.value.lastSuccessfulRoute = currentRoute.fullPath;

        return {
          success: true,
          route: currentRoute,
          retries,
          duration: Date.now() - startTime,
        };
      } catch (error) {
        console.warn(
          `[RouterService] Navigation failed (attempt ${retries + 1}):`,
          error,
        );

        retries++;

        if (retries <= maxRetries) {
          // Wait before retry
          await this.delay(this.getRetryDelay(retries));
        } else {
          // Mark failed navigation
          const path = typeof to === "string" ? to : to.fullPath;
          const failCount = this.state.value.failedNavigations.get(path) || 0;
          this.state.value.failedNavigations.set(path, failCount + 1);

          return {
            success: false,
            error: error as Error,
            retries,
            duration: Date.now() - startTime,
          };
        }
      } finally {
        this.state.value.isNavigating = false;
      }
    }

    // Should never reach here
    return {
      success: false,
      error: new Error("Unknown navigation error"),
      retries: maxRetries,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Navigate to home route
   */
  public async navigateToHome(): Promise<NavigationResult> {
    return this.navigate("/", { force: true });
  }

  /**
   * Navigate to login route
   */
  public async navigateToLogin(redirect?: string): Promise<NavigationResult> {
    const route: any = { name: "Login" };
    if (redirect) {
      route.query = { redirect };
    }
    return this.navigate(route);
  }

  /**
   * Navigate to error page
   */
  public async navigateToError(error?: string): Promise<NavigationResult> {
    const route: any = { name: "Error" };
    if (error) {
      route.query = { error };
    }
    return this.navigate(route);
  }

  /**
   * Clear navigation cache
   */
  public clearCache(): void {
    this.state.value.routeCache.clear();
    this.state.value.failedNavigations.clear();
    console.log("[RouterService] Cache cleared");
  }

  /**
   * Get navigation statistics
   */
  public getStatistics() {
    return {
      cached: this.state.value.routeCache.size,
      failed: this.state.value.failedNavigations.size,
      lastSuccess: this.state.value.lastSuccessfulRoute,
      isNavigating: this.state.value.isNavigating,
      isInitialized: this.state.value.isInitialized,
    };
  }

  /**
   * Reset service state
   */
  public reset(): void {
    this.state.value = {
      isInitialized: false,
      isNavigating: false,
      lastSuccessfulRoute: null,
      failedNavigations: new Map(),
      routeCache: new Map(),
      initStatus: "pending",
    };
    this.router = null;
    console.log("[RouterService] Service reset");
  }

  /**
   * Private helper methods
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private getRetryDelay(attempt: number): number {
    if (!this.config.exponentialBackoff) {
      return this.config.retryDelay;
    }
    return Math.min(this.config.retryDelay * Math.pow(2, attempt - 1), 10000);
  }
}

// Export singleton instance
export const routerService = RouterService.getInstance();
