/**
 * RouterMigration.ts
 *
 * Stellt Router-Integration zwischen altem und neuem System bereit.
 * Ermöglicht die Migration von URLs und Routing-Zuständen zwischen
 * dem Legacy-JavaScript-System und dem Vue 3 Router.
 */

import { logger } from "../bridge/enhanced/logger";
import { RouterMigrationConfig } from "./types";

/**
 * Verwaltet die Routing-Integration zwischen Legacy- und Vue-Router
 */
export class RouterMigrator {
  // Map der Routen-Konfigurationen
  private routeConfigs: RouterMigrationConfig[] = [];

  // Referenz auf Vue Router (wird zur Laufzeit gesetzt)
  private vueRouter: any = null;

  // Globaler Event-Bus für die Kommunikation mit Legacy-Code
  private eventBus: any = null;

  /**
   * Initialisiert den RouterMigrator
   * @param vueRouter Vue Router Instanz
   * @param eventBus Event-Bus für die Kommunikation mit Legacy-Code
   */
  public initialize(vueRouter: any, eventBus: any): void {
    this.vueRouter = vueRouter;
    this.eventBus = eventBus;

    // Globale Before-Guards für Vue Router hinzufügen
    this.setupVueRouterGuards();

    // Listener für Legacy-Navigationsevents registrieren
    this.setupLegacyNavigationHandlers();

    logger.info("RouterMigrator initialized");
  }

  /**
   * Registriert eine Routing-Konfiguration für die Migration
   * @param config Die Routing-Konfiguration
   */
  public registerRouteConfig(config: RouterMigrationConfig): void {
    // Prüfen, ob Konfiguration bereits existiert
    const existingIndex = this.routeConfigs.findIndex(
      (c) => c.legacyPath === config.legacyPath || c.vuePath === config.vuePath,
    );

    if (existingIndex >= 0) {
      // Bestehende Konfiguration aktualisieren
      this.routeConfigs[existingIndex] = config;
      logger.debug(
        `Updated route migration config: ${config.legacyPath} <-> ${config.vuePath}`,
      );
    } else {
      // Neue Konfiguration hinzufügen
      this.routeConfigs.push(config);
      logger.debug(
        `Registered route migration config: ${config.legacyPath} <-> ${config.vuePath}`,
      );
    }
  }

  /**
   * Registriert mehrere Routing-Konfigurationen auf einmal
   * @param configs Array von Routing-Konfigurationen
   */
  public registerRouteConfigs(configs: RouterMigrationConfig[]): void {
    for (const config of configs) {
      this.registerRouteConfig(config);
    }
  }

  /**
   * Richtet Vue Router Guards ein, um Legacy-Navigation zu unterstützen
   */
  private setupVueRouterGuards(): void {
    if (!this.vueRouter) {
      logger.warn("Cannot setup Vue Router guards: Vue Router not initialized");
      return;
    }

    // Globaler Navigation Guard
    this.vueRouter.beforeEach((to: any, from: any, next: Function) => {
      // Prüfen, ob es sich um eine Legacy-Route handelt
      const matchingConfig = this.findConfigByVuePath(to.path);

      if (matchingConfig) {
        logger.debug(
          `Vue route ${to.path} matched with legacy path ${matchingConfig.legacyPath}`,
        );

        // Benachrichtige Legacy-System über Routenänderung
        this.notifyLegacyNavigation(matchingConfig, to.params, to.query);
      }

      // Navigation fortsetzen
      next();
    });
  }

  /**
   * Richtet Event-Listener für Legacy-Navigation ein
   */
  private setupLegacyNavigationHandlers(): void {
    if (!this.eventBus) {
      logger.warn(
        "Cannot setup legacy navigation handlers: Event bus not initialized",
      );
      return;
    }

    // Legacy-Navigationsevent
    this.eventBus.on("legacy:navigation", (data: any) => {
      const { path, params, query } = data;

      // Passende Vue-Route finden
      const matchingConfig = this.findConfigByLegacyPath(path);

      if (matchingConfig) {
        logger.debug(
          `Legacy navigation to ${path} redirected to Vue route ${matchingConfig.vuePath}`,
        );

        // Zu Vue-Route navigieren
        this.navigateToVueRoute(matchingConfig, params, query);
      } else {
        logger.warn(`No matching Vue route found for legacy path: ${path}`);
      }
    });
  }

  /**
   * Findet die passende Konfiguration für einen Vue-Pfad
   * @param vuePath Der Vue-Router-Pfad
   */
  private findConfigByVuePath(
    vuePath: string,
  ): RouterMigrationConfig | undefined {
    return this.routeConfigs.find((config) => {
      // Exakte Übereinstimmung
      if (config.vuePath === vuePath) return true;

      // Dynamische Route mit Parametern
      if (
        config.vuePath.includes(":") &&
        this.pathsMatchPattern(vuePath, config.vuePath)
      ) {
        return true;
      }

      return false;
    });
  }

  /**
   * Findet die passende Konfiguration für einen Legacy-Pfad
   * @param legacyPath Der Legacy-Pfad
   */
  private findConfigByLegacyPath(
    legacyPath: string,
  ): RouterMigrationConfig | undefined {
    return this.routeConfigs.find((config) => {
      // Exakte Übereinstimmung
      if (config.legacyPath === legacyPath) return true;

      // Dynamische Route mit Parametern
      if (
        config.legacyPath.includes(":") &&
        this.pathsMatchPattern(legacyPath, config.legacyPath)
      ) {
        return true;
      }

      return false;
    });
  }

  /**
   * Prüft, ob ein Pfad einem Muster mit dynamischen Parametern entspricht
   * @param path Der zu prüfende Pfad
   * @param pattern Das Muster mit dynamischen Parametern
   */
  private pathsMatchPattern(path: string, pattern: string): boolean {
    // Pfad und Muster in Segmente aufteilen
    const pathSegments = path.split("/").filter(Boolean);
    const patternSegments = pattern.split("/").filter(Boolean);

    // Unterschiedliche Anzahl von Segmenten
    if (pathSegments.length !== patternSegments.length) {
      return false;
    }

    // Segmentweise Vergleich
    for (let i = 0; i < pathSegments.length; i++) {
      const patternSegment = patternSegments[i];

      // Dynamisches Segment (beginnt mit :)
      if (patternSegment.startsWith(":")) {
        // Akzeptiere jedes Segment an dieser Position
        continue;
      }

      // Statisches Segment muss genau übereinstimmen
      if (pathSegments[i] !== patternSegment) {
        return false;
      }
    }

    return true;
  }

  /**
   * Extrahiert Parameter aus einem Pfad basierend auf einem Muster
   * @param path Der Pfad mit konkreten Werten
   * @param pattern Das Muster mit dynamischen Parametern
   */
  private extractParams(path: string, pattern: string): Record<string, string> {
    const params: Record<string, string> = {};

    // Pfad und Muster in Segmente aufteilen
    const pathSegments = path.split("/").filter(Boolean);
    const patternSegments = pattern.split("/").filter(Boolean);

    // Parameter extrahieren
    for (let i = 0; i < patternSegments.length; i++) {
      const patternSegment = patternSegments[i];

      // Dynamisches Segment
      if (patternSegment.startsWith(":")) {
        const paramName = patternSegment.substring(1); // ':id' -> 'id'
        params[paramName] = pathSegments[i];
      }
    }

    return params;
  }

  /**
   * Navigiert zu einer Vue-Route basierend auf einer Konfiguration
   * @param config Die Routing-Konfiguration
   * @param params Die Parameter für die Navigation
   * @param query Die Query-Parameter für die Navigation
   */
  private navigateToVueRoute(
    config: RouterMigrationConfig,
    params?: Record<string, string>,
    query?: Record<string, string>,
  ): void {
    if (!this.vueRouter) {
      logger.warn("Cannot navigate: Vue Router not initialized");
      return;
    }

    // Parameter transformieren, falls nötig
    let transformedParams = params || {};
    if (config.paramMapping && params) {
      transformedParams = {};

      // Benannte Parameter gemäß Mapping transformieren
      for (const [legacyParam, vueParam] of Object.entries(
        config.paramMapping,
      )) {
        if (params[legacyParam] !== undefined) {
          transformedParams[vueParam] = params[legacyParam];
        }
      }
    }

    // Zusätzliche Parameter hinzufügen
    if (config.additionalParams) {
      transformedParams = { ...transformedParams, ...config.additionalParams };
    }

    // Zu Vue-Route navigieren
    this.vueRouter.push({
      path: this.buildPathWithParams(config.vuePath, transformedParams),
      query,
    });
  }

  /**
   * Benachrichtigt Legacy-System über eine Navigation
   * @param config Die Routing-Konfiguration
   * @param params Die Parameter für die Navigation
   * @param query Die Query-Parameter für die Navigation
   */
  private notifyLegacyNavigation(
    config: RouterMigrationConfig,
    params?: Record<string, string>,
    query?: Record<string, string>,
  ): void {
    if (!this.eventBus) {
      logger.warn("Cannot notify legacy system: Event bus not initialized");
      return;
    }

    // Parameter transformieren, falls nötig
    let transformedParams = params || {};
    if (config.paramMapping && params) {
      transformedParams = {};

      // Umgekehrtes Mapping für die Notification
      const reverseMapping: Record<string, string> = {};
      for (const [legacyParam, vueParam] of Object.entries(
        config.paramMapping,
      )) {
        reverseMapping[vueParam] = legacyParam;
      }

      // Benannte Parameter gemäß Mapping transformieren
      for (const [vueParam, legacyParam] of Object.entries(reverseMapping)) {
        if (params[vueParam] !== undefined) {
          transformedParams[legacyParam] = params[vueParam];
        }
      }
    }

    // Legacy-System benachrichtigen
    this.eventBus.emit("vue:navigation", {
      path: this.buildPathWithParams(config.legacyPath, transformedParams),
      params: transformedParams,
      query,
    });
  }

  /**
   * Baut einen Pfad mit dynamischen Parametern
   * @param path Der Pfad mit Platzhaltern
   * @param params Die Parameter zum Einsetzen
   */
  private buildPathWithParams(
    path: string,
    params: Record<string, string>,
  ): string {
    let result = path;

    // Parameter im Pfad ersetzen
    for (const [key, value] of Object.entries(params)) {
      result = result.replace(`:${key}`, encodeURIComponent(value));
    }

    return result;
  }

  /**
   * Gibt alle registrierten Routing-Konfigurationen zurück
   */
  public getAllRouteConfigs(): RouterMigrationConfig[] {
    return [...this.routeConfigs];
  }

  /**
   * Prüft, ob eine gegebene URL eine Legacy-URL ist
   * @param url Die zu prüfende URL
   */
  public isLegacyUrl(url: string): boolean {
    // URL in Pfad und Query aufteilen
    const urlObj = new URL(url, window.location.origin);
    const path = urlObj.pathname;

    // Prüfen, ob es eine Konfiguration für diesen Pfad gibt
    return this.routeConfigs.some(
      (config) =>
        config.legacyPath === path ||
        (config.legacyPath.includes(":") &&
          this.pathsMatchPattern(path, config.legacyPath)),
    );
  }

  /**
   * Konvertiert eine Legacy-URL in eine Vue-Router-URL
   * @param url Die zu konvertierende Legacy-URL
   */
  public legacyUrlToVueUrl(url: string): string | null {
    // URL in Pfad und Query aufteilen
    const urlObj = new URL(url, window.location.origin);
    const path = urlObj.pathname;

    // Passende Konfiguration finden
    const matchingConfig = this.findConfigByLegacyPath(path);

    if (!matchingConfig) {
      return null;
    }

    // Parameter aus der URL extrahieren
    const params = this.extractParams(path, matchingConfig.legacyPath);

    // Parameter transformieren, falls nötig
    let transformedParams = params;
    if (matchingConfig.paramMapping) {
      transformedParams = {};

      // Benannte Parameter gemäß Mapping transformieren
      for (const [legacyParam, vueParam] of Object.entries(
        matchingConfig.paramMapping,
      )) {
        if (params[legacyParam] !== undefined) {
          transformedParams[vueParam] = params[legacyParam];
        }
      }
    }

    // Zusätzliche Parameter hinzufügen
    if (matchingConfig.additionalParams) {
      transformedParams = {
        ...transformedParams,
        ...matchingConfig.additionalParams,
      };
    }

    // Vue-URL erstellen
    const vueUrl = this.buildPathWithParams(
      matchingConfig.vuePath,
      transformedParams,
    );

    // Query-Parameter aus der Legacy-URL übernehmen
    const query = urlObj.search;

    return `${vueUrl}${query}`;
  }
}

/**
 * Singleton-Instanz des RouterMigrator
 */
export const routerMigrator = new RouterMigrator();

export default routerMigrator;
