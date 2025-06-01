/**
 * CachedApiService - Erweiterung des ApiService mit Caching-Funktionalität
 *
 * Dieser Service erweitert den ApiService um Caching-Funktionen für
 * bessere Performance und Offline-Unterstützung.
 */

import { apiService, ApiService, ApiRequestOptions } from "./ApiService";
import { apiCacheService } from "./ApiCacheService";
import { LogService } from "../log/LogService";
import { ApiResponse } from "@/types/api";

/**
 * Erweiterte API-Request-Optionen mit Caching-Konfiguration
 */
export interface CachedApiRequestOptions extends ApiRequestOptions {
  /** Caching aktivieren für diese Anfrage */
  cache?: boolean;

  /** TTL in Sekunden für diese Anfrage */
  cacheTTL?: number;

  /** Bestehenden Cache forciert ignorieren und neu laden */
  forceRefresh?: boolean;

  /** Cache aktualisieren, aber veraltete Daten zurückgeben, wenn verfügbar */
  staleWhileRevalidate?: boolean;
}

/**
 * CachedApiService Klasse
 * Erweitert den ApiService um Caching-Funktionen
 */
export class CachedApiService {
  /** Basis API-Service */
  private apiService: ApiService;

  /** Logger für Diagnose */
  private logger: LogService;

  /**
   * Konstruktor
   */
  constructor() {
    this.apiService = apiService;
    this.logger = new LogService("CachedApiService");
  }

  /**
   * GET-Anfrage mit Caching
   */
  public async get<T = any>(
    url: string,
    params?: any,
    options: CachedApiRequestOptions = {},
  ): Promise<ApiResponse<T>> {
    // Cache-Flag aus Optionen oder Umgebungsvariable
    const useCache =
      options.cache ?? import.meta.env.VITE_API_CACHE_ENABLED !== "false";

    // Wenn Caching deaktiviert ist oder ein Force-Refresh angefordert wurde,
    // die reguläre API-Anfrage ohne Caching durchführen
    if (!useCache || options.forceRefresh) {
      return this.apiService.get<T>(url, params, options);
    }

    // Prüfen, ob Daten im Cache vorhanden sind
    const { data: cachedData, isStale } = apiCacheService.getCachedResponse<T>(
      url,
      "GET",
      params,
    );

    // Wenn Daten im Cache und nicht veraltet oder Stale-While-Revalidate aktiv
    if (cachedData && (!isStale || options.staleWhileRevalidate)) {
      // Bei Stale-While-Revalidate Hintergrundaktualisierung starten
      if (isStale && options.staleWhileRevalidate) {
        this.backgroundRefresh<T>(url, params, options);
      }

      return cachedData;
    }

    // Wenn keine Daten im Cache oder veraltet, frische Daten abrufen
    try {
      const response = await this.apiService.get<T>(url, params, options);

      // Erfolgreiche Antworten im Cache speichern
      if (response.success) {
        apiCacheService.cacheResponse<T>(url, "GET", params, response, {
          ttl: options.cacheTTL,
        });
      }

      return response;
    } catch (error) {
      // Bei Netzwerkfehlern versuchen, veraltete Daten zu verwenden
      if (cachedData) {
        this.logger.warn("Netzwerkfehler, verwende Cache-Fallback", {
          url,
          error,
        });
        return {
          ...cachedData,
          metadata: {
            ...cachedData.metadata,
            fromCache: true,
            cacheReason: "network_error",
          },
        };
      }

      // Wenn keine Cache-Daten verfügbar, Fehler weiterwerfen
      throw error;
    }
  }

  /**
   * POST-Anfrage mit Cache-Invalidierung
   */
  public async post<T = any>(
    url: string,
    data?: any,
    options: CachedApiRequestOptions = {},
  ): Promise<ApiResponse<T>> {
    // Normale POST-Anfrage durchführen
    const response = await this.apiService.post<T>(url, data, options);

    // Bei erfolgreichen Änderungsoperationen relevante Caches invalidieren
    if (response.success) {
      // Cache für verwandte Ressourcen invalidieren
      this.invalidateRelatedCaches(url, data);
    }

    return response;
  }

  /**
   * PUT-Anfrage mit Cache-Invalidierung
   */
  public async put<T = any>(
    url: string,
    data?: any,
    options: CachedApiRequestOptions = {},
  ): Promise<ApiResponse<T>> {
    // Normale PUT-Anfrage durchführen
    const response = await this.apiService.put<T>(url, data, options);

    // Bei erfolgreichen Änderungsoperationen relevante Caches invalidieren
    if (response.success) {
      // Cache für verwandte Ressourcen invalidieren
      this.invalidateRelatedCaches(url, data);
    }

    return response;
  }

  /**
   * PATCH-Anfrage mit Cache-Invalidierung
   */
  public async patch<T = any>(
    url: string,
    data?: any,
    options: CachedApiRequestOptions = {},
  ): Promise<ApiResponse<T>> {
    // Normale PATCH-Anfrage durchführen
    const response = await this.apiService.patch<T>(url, data, options);

    // Bei erfolgreichen Änderungsoperationen relevante Caches invalidieren
    if (response.success) {
      // Cache für verwandte Ressourcen invalidieren
      this.invalidateRelatedCaches(url, data);
    }

    return response;
  }

  /**
   * DELETE-Anfrage mit Cache-Invalidierung
   */
  public async delete<T = any>(
    url: string,
    options: CachedApiRequestOptions = {},
  ): Promise<ApiResponse<T>> {
    // Normale DELETE-Anfrage durchführen
    const response = await this.apiService.delete<T>(url, options);

    // Bei erfolgreichen Änderungsoperationen relevante Caches invalidieren
    if (response.success) {
      // Cache für verwandte Ressourcen invalidieren
      this.invalidateRelatedCaches(url);
    }

    return response;
  }

  /**
   * Paginierte GET-Anfrage mit Caching
   */
  public async getPaginated<T = any>(
    url: string,
    pagination: any,
    options: CachedApiRequestOptions = {},
  ): Promise<ApiResponse<T>> {
    return this.get<T>(url, pagination, options);
  }

  /**
   * Datei-Upload
   */
  public async uploadFile<T = any>(
    url: string,
    file: File | Blob,
    options?: CachedApiRequestOptions & {
      fieldName?: string;
      metadata?: Record<string, any>;
    },
  ): Promise<ApiResponse<T>> {
    // Normale Upload-Anfrage durchführen
    const response = await this.apiService.uploadFile<T>(url, file, options);

    // Bei erfolgreichen Änderungsoperationen relevante Caches invalidieren
    if (response.success) {
      // Cache für verwandte Ressourcen invalidieren
      this.invalidateRelatedCaches(url);
    }

    return response;
  }

  /**
   * Datei-Download
   */
  public async downloadFile(
    url: string,
    options?: CachedApiRequestOptions & { filename?: string },
  ): Promise<Blob> {
    return this.apiService.downloadFile(url, options);
  }

  /**
   * Login-Methode mit Cache-Invalidierung
   */
  public async login(credentials: any): Promise<ApiResponse<any>> {
    // Normale Login-Anfrage durchführen
    const response = await this.apiService.login(credentials);

    // Bei erfolgreichem Login den gesamten API-Cache leeren
    if (response.success) {
      apiCacheService.clearAll();
    }

    return response;
  }

  /**
   * Logout-Methode mit Cache-Invalidierung
   */
  public async logout(): Promise<ApiResponse<void>> {
    // Normale Logout-Anfrage durchführen
    const response = await this.apiService.logout();

    // Bei erfolgreichem Logout den gesamten API-Cache leeren
    apiCacheService.clearAll();

    return response;
  }

  /**
   * Token-Aktualisierung
   */
  public async refreshAuthToken(): Promise<string> {
    return this.apiService.refreshAuthToken();
  }

  /**
   * Prüft, ob der Benutzer angemeldet ist
   */
  public isAuthenticated(): boolean {
    return this.apiService.isAuthenticated();
  }

  /**
   * Gibt die Benutzerinformationen zurück
   */
  public getUserInfo(): any {
    return this.apiService.getUserInfo();
  }

  /**
   * Erstellt ein CancelToken für abbrechbare Anfragen
   */
  public createCancelToken() {
    return this.apiService.createCancelToken();
  }

  /**
   * Prüft, ob eine Anfrage abgebrochen wurde
   */
  public isCancel(error: any): boolean {
    return this.apiService.isCancel(error);
  }

  /**
   * Leert den gesamten API-Cache
   */
  public clearCache(): void {
    apiCacheService.clearAll();
  }

  /**
   * Invalidiert Cache für eine bestimmte URL oder ein Pattern
   */
  public invalidate(urlPattern: string | RegExp): void {
    apiCacheService.invalidateByPattern(urlPattern);
  }

  /**
   * Invalidiert verwandte Caches basierend auf URL und Daten
   */
  private invalidateRelatedCaches(url: string, data?: any): void {
    // Extract resource type from URL
    const resourceMatch = url.match(/\/api\/(\w+)/);
    if (resourceMatch) {
      const resourceType = resourceMatch[1];
      apiCacheService.invalidateEndpointType(resourceType);
    }
  }

  /**
   * Hintergrundaktualisierung für Stale-While-Revalidate
   */
  private async backgroundRefresh<T>(
    url: string,
    params?: any,
    options?: CachedApiRequestOptions,
  ): Promise<void> {
    try {
      // In einem nicht-blockierenden Kontext ausführen
      setTimeout(async () => {
        // Direkt über den Basis-API-Service anfragen
        const response = await this.apiService.get<T>(url, params, {
          ...options,
          showErrorToast: false, // Keine Fehlerbenachrichtigungen anzeigen
        });

        // Erfolgreiche Antwort im Cache aktualisieren
        if (response.success) {
          apiCacheService.cacheResponse<T>(url, "GET", params, response, {
            ttl: options?.cacheTTL,
          });

          if (import.meta.env.VITE_ENV !== "production") {
            this.logger.debug("Hintergrundaktualisierung abgeschlossen", {
              url,
            });
          }
        }
      }, 0);
    } catch (error) {
      // Fehler bei der Hintergrundaktualisierung ignorieren
      this.logger.warn("Fehler bei Hintergrundaktualisierung", {
        url,
        error,
      });
    }
  }

  /**
   * Invalidiert verwandte Caches basierend auf dem Anfrage-URL
   */
  private invalidateRelatedCaches(url: string, data?: any): void {
    try {
      // Ressourcentyp aus URL extrahieren
      const urlParts = url.split("/").filter((part: any) => part.length > 0);

      if (urlParts.length > 0) {
        // Ressourcentyp identifizieren (z.B. 'sessions', 'documents', etc.)
        const resourceType = urlParts[0];

        // Cache für diesen Ressourcentyp invalidieren
        apiCacheService.invalidateEndpointType(resourceType);

        if (import.meta.env.VITE_ENV !== "production") {
          this.logger.debug(
            `Cache invalidiert für Ressourcentyp: ${resourceType}`,
          );
        }
      }
    } catch (error) {
      this.logger.warn("Fehler bei Cache-Invalidierung", {
        url,
        error,
      });
    }
  }
}

// Singleton-Instanz erstellen
export const cachedApiService = new CachedApiService();

export default cachedApiService;
