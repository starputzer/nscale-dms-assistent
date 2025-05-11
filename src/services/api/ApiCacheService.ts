/**
 * ApiCacheService - Spezialisierter Caching-Dienst für API-Anfragen
 *
 * Dieser Service erweitert den allgemeinen CacheService um API-spezifische
 * Funktionen wie:
 * - Selektives Caching basierend auf Endpunkten
 * - Automatische Cache-Invalidierung
 * - Stale-While-Revalidate Strategie
 * - Cached Fallbacks für Offline-Unterstützung
 */

import { CacheService } from "../cache/CacheService";
import { LogService } from "../log/LogService";
import { ApiResponse } from "@/types/api";
import { apiConfig } from "./config";

// Konfigurationstyp für API-Caching
export interface ApiCachingOptions {
  /** Aktiviert das API-Caching global */
  enabled: boolean;

  /** Standard-TTL für API-Anfragen in Sekunden */
  defaultTTL: number;

  /** Verhindert das Caching bestimmter Endpunkte (RegExp oder String) */
  excludedEndpoints: (string | RegExp)[];

  /** Eindeutig cachegbare Endpunkte (unabhängig von Query-Parametern) */
  immutableEndpoints: string[];

  /** Stale-While-Revalidate aktivieren (veraltete Daten liefern während Aktualisierung) */
  staleWhileRevalidate: boolean;

  /** Maximales Alter für Stale-While-Revalidate in Sekunden */
  maxStaleAge: number;

  /** Parameter, die für den Cache-Schlüssel ignoriert werden sollen */
  ignoreQueryParams: string[];

  /** Debug-Modus aktivieren */
  debug: boolean;
}

/**
 * Hauptklasse für den API-Cache-Service
 */
export class ApiCacheService {
  /** Cache-Service für die Datenspeicherung */
  private cache: CacheService;

  /** Logger für Diagnose */
  private logger: LogService;

  /** API-Cache-Konfiguration */
  private config: ApiCachingOptions;

  /** Laufende Revalidierungen */
  private revalidating: Set<string> = new Set();

  /** Standardkonfiguration für das API-Caching */
  private static defaultConfig: ApiCachingOptions = {
    enabled: true,
    defaultTTL: 300, // 5 Minuten
    excludedEndpoints: [
      // Authentifizierungs-Endpunkte nicht cachen
      "/auth/login",
      "/auth/logout",
      "/auth/refresh",
      // Alle POST/PUT/DELETE-Endpunkte
      /\/(create|update|delete|remove|edit|add|upload)/i,
    ],
    immutableEndpoints: [
      // Unveränderliche Daten
      "/system/info",
      "/system/config",
    ],
    staleWhileRevalidate: true,
    maxStaleAge: 3600, // 1 Stunde
    ignoreQueryParams: ["timestamp", "t", "cacheBuster", "nonce"],
    debug: false,
  };

  /**
   * Konstruktor für ApiCacheService
   */
  constructor(options: Partial<ApiCachingOptions> = {}) {
    // Standard-Konfiguration mit benutzerdefinierten Optionen überschreiben
    this.config = { ...ApiCacheService.defaultConfig, ...options };

    // Cache-Service mit API-spezifischem Präfix initialisieren
    this.cache = new CacheService({
      keyPrefix: "nscale_api_cache_",
      defaultTTL: this.config.defaultTTL,
      debug: this.config.debug,
    });

    // Logger initialisieren
    this.logger = new LogService("ApiCacheService");

    if (this.config.debug) {
      this.logger.debug("API-Cache-Service initialisiert", this.config);
    }
  }

  /**
   * Prüft, ob ein Endpunkt cacheable ist
   */
  public isCacheable(
    url: string,
    method: string,
    options: { force?: boolean } = {},
  ): boolean {
    // Wenn das Caching deaktiviert ist oder wir zum Überspringen gezwungen werden
    if (!this.config.enabled && !options.force) {
      return false;
    }

    // Nur GET-Anfragen cachen
    if (method.toUpperCase() !== "GET") {
      return false;
    }

    // Ausgeschlossene Endpunkte prüfen
    for (const excluded of this.config.excludedEndpoints) {
      if (typeof excluded === "string" && url.includes(excluded)) {
        return false;
      } else if (excluded instanceof RegExp && excluded.test(url)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Erstellt einen Cache-Schlüssel für eine API-Anfrage
   */
  public getCacheKey(url: string, params?: Record<string, any>): string {
    // Basis-URL ohne Query-Parameter
    const baseUrl = url.split("?")[0];

    // Prüfen, ob es sich um einen unveränderlichen Endpunkt handelt
    const isImmutable = this.config.immutableEndpoints.some((endpoint) =>
      baseUrl.includes(endpoint),
    );

    // Für unveränderliche Endpunkte nur die Basis-URL verwenden
    if (isImmutable) {
      return `${baseUrl}`;
    }

    // Sonst Query-Parameter einbeziehen (falls vorhanden)
    if (params && Object.keys(params).length > 0) {
      // Parameter filtern und sortieren
      const filteredParams = { ...params };

      // Ignorierte Parameter entfernen
      for (const ignoreParam of this.config.ignoreQueryParams) {
        delete filteredParams[ignoreParam];
      }

      // Parameter sortieren und als String formatieren
      const sortedParams = Object.entries(filteredParams)
        .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
        .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
        .join("&");

      if (sortedParams) {
        return `${baseUrl}?${sortedParams}`;
      }
    }

    return baseUrl;
  }

  /**
   * Speichert eine API-Antwort im Cache
   */
  public cacheResponse<T>(
    url: string,
    method: string,
    params: Record<string, any> | undefined,
    response: ApiResponse<T>,
    options: {
      /** TTL in Sekunden, überschreibt defaultTTL */
      ttl?: number;
      /** Cache erzwingen, auch für normalerweise nicht-cacheable Endpunkte */
      force?: boolean;
    } = {},
  ): void {
    // Prüfen, ob cacheable
    if (!this.isCacheable(url, method, options)) {
      return;
    }

    // Cache-Schlüssel erstellen
    const cacheKey = this.getCacheKey(url, params);

    // TTL bestimmen
    let ttl = options.ttl ?? this.config.defaultTTL;

    // Für unveränderliche Endpunkte längere TTL verwenden
    if (
      this.config.immutableEndpoints.some((endpoint) => url.includes(endpoint))
    ) {
      ttl = Math.max(ttl, 86400); // Mindestens 24 Stunden
    }

    // Daten im Cache speichern
    this.cache.set(cacheKey, response, {
      ttl,
      source: "api",
      metadata: {
        url,
        method,
        params,
        timestamp: Date.now(),
      },
    });

    if (this.config.debug) {
      this.logger.debug(`API-Cache: Antwort gespeichert für ${url}`, {
        cacheKey,
        ttl,
      });
    }
  }

  /**
   * Liest eine API-Antwort aus dem Cache
   */
  public getCachedResponse<T>(
    url: string,
    method: string,
    params?: Record<string, any>,
  ): { data: ApiResponse<T> | null; isStale: boolean } {
    // Prüfen, ob cacheable
    if (!this.isCacheable(url, method)) {
      return { data: null, isStale: false };
    }

    // Cache-Schlüssel erstellen
    const cacheKey = this.getCacheKey(url, params);

    // Daten aus dem Cache lesen
    const cachedData = this.cache.get<ApiResponse<T>>(cacheKey);

    // Wenn keine Daten im Cache, null zurückgeben
    if (!cachedData) {
      return { data: null, isStale: false };
    }

    if (this.config.debug) {
      this.logger.debug(`API-Cache: Antwort gelesen für ${url}`, {
        cacheKey,
        cached: !!cachedData,
      });
    }

    // Prüfen, ob die Daten veraltet sind (für Stale-While-Revalidate)
    const isStale = false; // In dieser vereinfachten Version nicht implementiert

    return { data: cachedData, isStale };
  }

  /**
   * Invalidiert Cache-Einträge basierend auf URL-Mustern
   */
  public invalidate(urlPattern: string | RegExp): void {
    if (typeof urlPattern === "string") {
      // Exakte URL-Invalidierung
      const cacheKey = this.getCacheKey(urlPattern);
      this.cache.remove(cacheKey);

      if (this.config.debug) {
        this.logger.debug(`API-Cache: Eintrag invalidiert für ${urlPattern}`);
      }
    } else {
      // Muster-basierte Invalidierung wird hier nicht implementiert
      this.logger.warn(
        "Muster-basierte Cache-Invalidierung nicht implementiert",
      );
    }
  }

  /**
   * Invalidiert alle Cache-Einträge für einen bestimmten Endpunkt-Typ
   * z.B. invalidateEndpointType('sessions') invalidiert alle Endpunkte
   * die '/sessions' enthalten
   */
  public invalidateEndpointType(endpointType: string): void {
    this.cache.clearByPrefix(endpointType);

    if (this.config.debug) {
      this.logger.debug(
        `API-Cache: Alle Einträge vom Typ ${endpointType} invalidiert`,
      );
    }
  }

  /**
   * Bereinigt den gesamten API-Cache
   */
  public clearAll(): void {
    this.cache.clear();

    if (this.config.debug) {
      this.logger.debug("API-Cache: Vollständig geleert");
    }
  }

  /**
   * Implementiert die Stale-While-Revalidate Strategie
   * - Liefert veraltete Daten aus dem Cache
   * - Aktualisiert den Cache im Hintergrund
   */
  public async staleWhileRevalidate<T>(
    url: string,
    method: string,
    params: Record<string, any> | undefined,
    fetchFn: () => Promise<ApiResponse<T>>,
  ): Promise<ApiResponse<T>> {
    // Diese Funktion wird in der aktuellen Implementierung nicht vollständig ausgeführt,
    // würde aber in einer erweiterten Version die Stale-While-Revalidate-Strategie umsetzen

    // Cache-Schlüssel erstellen
    const cacheKey = this.getCacheKey(url, params);

    // Bereits laufende Revalidierung prüfen
    if (this.revalidating.has(cacheKey)) {
      const cached = this.cache.get<ApiResponse<T>>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Hintergrund-Revalidierung starten
    this.revalidating.add(cacheKey);

    try {
      // Frische Daten abrufen
      const freshData = await fetchFn();

      // Im Cache speichern
      this.cacheResponse(url, method, params, freshData);

      return freshData;
    } catch (error) {
      this.logger.error("Fehler bei Stale-While-Revalidate", {
        url,
        error,
      });
      throw error;
    } finally {
      this.revalidating.delete(cacheKey);
    }
  }
}

// Singleton-Instanz erstellen
export const apiCacheService = new ApiCacheService({
  enabled: import.meta.env.VITE_API_CACHE_ENABLED !== "false",
  defaultTTL: parseInt(import.meta.env.VITE_API_CACHE_TTL || "300", 10),
  debug: import.meta.env.VITE_ENV !== "production",
  // Verwende vorhandene API-Konfiguration
  excludedEndpoints: [
    ...ApiCacheService.defaultConfig.excludedEndpoints,
    apiConfig.ENDPOINTS.AUTH.LOGIN,
    apiConfig.ENDPOINTS.AUTH.LOGOUT,
    apiConfig.ENDPOINTS.AUTH.REFRESH,
  ],
  immutableEndpoints: [
    ...ApiCacheService.defaultConfig.immutableEndpoints,
    apiConfig.ENDPOINTS.SYSTEM.INFO,
  ],
});

export default apiCacheService;
