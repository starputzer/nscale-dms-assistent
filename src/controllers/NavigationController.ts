/**
 * Navigation Controller
 *
 * Zentraler Controller für alle Navigationsoperationen mit erweiterter Fehlerbehandlung
 */

import { RouteLocationNormalized } from "vue-router";
import { routerService } from "@/services/router/RouterServiceFixed";
import type { Logger } from "@/composables/useLogger";
import type { Toast } from "@/composables/useToast";

export interface NavigationOptions {
  force?: boolean;
  retries?: number;
  showToast?: boolean;
  fallbackOnError?: boolean;
}

export interface NavigationQueueItem {
  id: string;
  target: string | RouteLocationNormalized;
  options: NavigationOptions;
  timestamp: number;
  priority: number;
  callback?: (success: boolean) => void;
}

export class NavigationController {
  private static instance: NavigationController;
  private logger: Logger | null = null;
  private toast: Toast | null = null;

  // Navigation Queue
  private navigationQueue: NavigationQueueItem[] = [];
  private isProcessingQueue = false;
  private currentNavigation: NavigationQueueItem | null = null;

  // Configuration
  private readonly config = {
    maxQueueSize: 10,
    queueTimeout: 30000, // 30 seconds
    defaultRetries: 3,
    retryDelay: 1000,
    showToastOnError: true,
  };

  // Statistics
  private stats = {
    totalNavigations: 0,
    successfulNavigations: 0,
    failedNavigations: 0,
    queuedNavigations: 0,
    averageNavigationTime: 0,
  };

  private constructor() {
    // Services werden später initialisiert
    this.startQueueProcessor();
  }

  /**
   * Singleton-Instanz
   */
  public static getInstance(): NavigationController {
    if (!NavigationController.instance) {
      NavigationController.instance = new NavigationController();
    }
    return NavigationController.instance;
  }

  /**
   * Initialisiert die benötigten Services
   */
  private async initializeServices(): Promise<void> {
    if (!this.logger) {
      try {
        const { useLogger } = await import("@/composables/useLogger");
        this.logger = useLogger();
      } catch (error) {
        console.error("Logger konnte nicht initialisiert werden:", error);
      }
    }

    if (!this.toast) {
      try {
        const { useToast } = await import("@/composables/useToast");
        this.toast = useToast();
      } catch (error) {
        console.warn("Toast Service nicht verfügbar:", error);
      }
    }
  }

  /**
   * Navigiert zu einer Route
   */
  public async navigate(
    target: string | RouteLocationNormalized,
    options: NavigationOptions = {},
  ): Promise<boolean> {
    await this.initializeServices();
    const navigationId = this.generateNavigationId();

    return new Promise((resolve) => {
      const queueItem: NavigationQueueItem = {
        id: navigationId,
        target,
        options: {
          force: options.force || false,
          retries: options.retries || this.config.defaultRetries,
          showToast: options.showToast !== false,
          fallbackOnError: options.fallbackOnError !== false,
        },
        timestamp: Date.now(),
        priority: options.force ? 1 : 0,
        callback: resolve,
      };

      this.addToQueue(queueItem);
    });
  }

  /**
   * Navigiert mit hoher Priorität
   */
  public async navigateUrgent(
    target: string | RouteLocationNormalized,
    options: NavigationOptions = {},
  ): Promise<boolean> {
    return this.navigate(target, {
      ...options,
      force: true,
    });
  }

  /**
   * Navigiert zur Startseite
   */
  public async navigateHome(options: NavigationOptions = {}): Promise<boolean> {
    this.log("info", "Navigation zur Startseite");
    return this.navigate("/", {
      ...options,
      fallbackOnError: false, // Startseite ist der letzte Fallback
    });
  }

  /**
   * Navigiert zurück
   */
  public async navigateBack(options: NavigationOptions = {}): Promise<boolean> {
    this.log("info", "Navigation zurück");

    try {
      if (window.history.length > 1) {
        window.history.back();
        return true;
      } else {
        return this.navigateHome(options);
      }
    } catch (error) {
      this.log("error", "Fehler beim Zurücknavigieren", error);
      return this.navigateHome(options);
    }
  }

  /**
   * Navigiert zur letzten funktionierenden Route
   */
  public async navigateToLastWorking(
    options: NavigationOptions = {},
  ): Promise<boolean> {
    this.log("info", "Navigation zur letzten funktionierenden Route");

    try {
      const result = await routerService.navigateToLogin();
      return result.success;
    } catch (error) {
      this.log("error", "Fehler bei Navigation zur letzten Route", error);
      return this.navigateHome(options);
    }
  }

  /**
   * Fügt Navigation zur Queue hinzu
   */
  private addToQueue(item: NavigationQueueItem): void {
    // Queue-Größe prüfen
    if (this.navigationQueue.length >= this.config.maxQueueSize) {
      this.log(
        "warn",
        "Navigation Queue voll, älteste Einträge werden entfernt",
      );
      this.cleanupQueue();
    }

    // Nach Priorität sortiert einfügen
    const insertIndex = this.navigationQueue.findIndex(
      (existing) => existing.priority < item.priority,
    );

    if (insertIndex === -1) {
      this.navigationQueue.push(item);
    } else {
      this.navigationQueue.splice(insertIndex, 0, item);
    }

    this.stats.queuedNavigations++;
    this.processQueue();
  }

  /**
   * Verarbeitet die Navigation Queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.navigationQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      while (this.navigationQueue.length > 0) {
        const item = this.navigationQueue.shift();
        if (!item) continue;

        // Timeout prüfen
        if (Date.now() - item.timestamp > this.config.queueTimeout) {
          this.log("warn", `Navigation ${item.id} timeout`);
          if (item.callback) item.callback(false);
          continue;
        }

        this.currentNavigation = item;
        const success = await this.executeNavigation(item);

        if (item.callback) {
          item.callback(success);
        }

        // Kurze Pause zwischen Navigationen
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } finally {
      this.isProcessingQueue = false;
      this.currentNavigation = null;
    }
  }

  /**
   * Führt eine einzelne Navigation aus
   */
  private async executeNavigation(item: NavigationQueueItem): Promise<boolean> {
    const startTime = Date.now();
    this.stats.totalNavigations++;

    try {
      this.log("info", `Navigation ${item.id} gestartet`, {
        target: item.target,
      });

      const result = await routerService.navigate(item.target, {
        retries: item.options.retries,
        force: item.options.force,
      });

      if (result.success) {
        this.stats.successfulNavigations++;
        this.updateAverageTime(Date.now() - startTime);
        this.log("info", `Navigation ${item.id} erfolgreich`);
        return true;
      } else {
        throw result.error || new Error("Navigation fehlgeschlagen");
      }
    } catch (error) {
      this.stats.failedNavigations++;
      this.log("error", `Navigation ${item.id} fehlgeschlagen`, error);

      // Error Toast anzeigen
      if (item.options.showToast && this.config.showToastOnError) {
        this.showToast(
          "error",
          "Navigation fehlgeschlagen. Versuche Alternative...",
        );
      }

      // Fallback versuchen
      if (item.options.fallbackOnError) {
        return this.attemptFallback(item);
      }

      return false;
    }
  }

  /**
   * Versucht Fallback-Navigation
   */
  private async attemptFallback(item: NavigationQueueItem): Promise<boolean> {
    this.log("info", `Fallback für Navigation ${item.id}`);

    try {
      // Versuche letzte funktionierende Route
      const lastWorkingResult = await routerService.navigateToLogin();

      if (lastWorkingResult.success) {
        if (item.options.showToast) {
          this.showToast("info", "Alternative Route geladen");
        }
        return true;
      }

      // Als letztes Mittel: Startseite
      const homeResult = await routerService.navigate("/", { force: true });

      if (homeResult.success) {
        if (item.options.showToast) {
          this.showToast("info", "Zur Startseite umgeleitet");
        }
        return true;
      }

      throw new Error("Alle Fallback-Optionen fehlgeschlagen");
    } catch (error) {
      this.log("error", "Fallback fehlgeschlagen", error);

      if (item.options.showToast) {
        this.showToast(
          "error",
          "Navigation nicht möglich. Bitte Seite neu laden.",
        );
      }

      return false;
    }
  }

  /**
   * Queue-Bereinigung
   */
  private cleanupQueue(): void {
    const now = Date.now();

    // Entferne alte Einträge
    this.navigationQueue = this.navigationQueue.filter((item: any) => {
      if (now - item.timestamp > this.config.queueTimeout) {
        if (item.callback) item.callback(false);
        return false;
      }
      return true;
    });

    // Wenn immer noch zu voll, entferne niedrig-priorisierte Einträge
    if (this.navigationQueue.length >= this.config.maxQueueSize) {
      const toRemove =
        this.navigationQueue.length -
        Math.floor(this.config.maxQueueSize * 0.8);

      for (let i = 0; i < toRemove; i++) {
        const item = this.navigationQueue.pop();
        if (item?.callback) item.callback(false);
      }
    }
  }

  /**
   * Startet Queue-Processor
   */
  private startQueueProcessor(): void {
    // Periodische Queue-Verarbeitung
    setInterval(() => {
      if (this.navigationQueue.length > 0 && !this.isProcessingQueue) {
        this.processQueue();
      }
    }, 1000);

    // Periodische Queue-Bereinigung
    setInterval(() => {
      this.cleanupQueue();
    }, 10000);
  }

  /**
   * Aktualisiert durchschnittliche Navigationszeit
   */
  private updateAverageTime(duration: number): void {
    const total = this.stats.successfulNavigations;
    const currentAvg = this.stats.averageNavigationTime;

    this.stats.averageNavigationTime =
      (currentAvg * (total - 1) + duration) / total;
  }

  /**
   * Generiert eindeutige Navigation-ID
   */
  private generateNavigationId(): string {
    return `nav-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Stoppt alle laufenden Navigationen
   */
  public cancelAll(): void {
    this.log("warn", "Alle Navigationen werden abgebrochen");

    // Aktuelle Navigation abbrechen
    if (this.currentNavigation?.callback) {
      this.currentNavigation.callback(false);
    }

    // Queue leeren
    this.navigationQueue.forEach((item: any) => {
      if (item.callback) item.callback(false);
    });

    this.navigationQueue = [];
    this.isProcessingQueue = false;
    this.currentNavigation = null;
  }

  /**
   * Logging-Helper
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
   * Toast-Helper
   */
  private showToast(
    type: "success" | "error" | "info" | "warning",
    message: string,
  ): void {
    if (this.toast) {
      this.toast[type](message);
    } else {
      console.log(`[Toast ${type}]:`, message);
    }
  }

  /**
   * Gibt Statistiken zurück
   */
  public getStats() {
    return {
      ...this.stats,
      queueLength: this.navigationQueue.length,
      isProcessing: this.isProcessingQueue,
      currentNavigation: this.currentNavigation?.target,
    };
  }

  /**
   * Debug-Informationen
   */
  public getDebugInfo() {
    return {
      stats: this.getStats(),
      queue: this.navigationQueue.map((item: any) => ({
        id: item.id,
        target: item.target,
        priority: item.priority,
        age: Date.now() - item.timestamp,
      })),
      config: this.config,
    };
  }
}

// Singleton-Export
export const navigationController = NavigationController.getInstance();
