/**
 * BaseApiService - Basisklasse für typisierte API-Service-Implementierungen
 *
 * Diese Klasse bietet eine typsichere Grundlage für spezialisierte API-Services
 * mit vollständiger TypeScript-Unterstützung und Fehlertypprüfung.
 */

import { apiService } from "./ApiService";
import { cachedApiService } from "./CachedApiService";
import { apiConfig } from "./config";
import { LogService } from "../log/LogService";
import {
  APIRequest,
  APIResponse,
  APIError,
  PaginationParams,
  Result,
  AsyncAPIResult,
  isAPIError,
  CachePolicy,
} from "@/utils/apiTypes";
import { AsyncFunction, catchAsync } from "@/utils/types";

/**
 * Konfigurationsoptionen für BaseApiService
 */
export interface BaseApiServiceOptions {
  /** Ressourcenpfad für die API (z.B. "/sessions") */
  resourcePath: string;

  /** Optionale Basis-URL für die API */
  baseUrl?: string;

  /** Cache-Policy für Abfragen */
  defaultCachePolicy?: CachePolicy;

  /** Zeit bis Cache-Verfall (in Sekunden) */
  defaultCacheTTL?: number;

  /** Timeout für Anfragen (in ms) */
  defaultTimeout?: number;

  /** Debug-Modus aktivieren */
  debug?: boolean;

  /** Name des Service für Logging */
  serviceName?: string;

  /** Fehlernachrichten-Überschreibungen */
  errorMessages?: Record<string, string>;
}

/**
 * BaseApiService - Grundklasse für typisierte API-Services
 */
export abstract class BaseApiService<
  EntityType = any,
  CreateParams = any,
  UpdateParams = Partial<EntityType>,
  ListParams extends PaginationParams = PaginationParams,
  FilterParams = any,
> {
  /** Resource-Pfad für diese API */
  protected resourcePath: string;

  /** Basis-URL für die API */
  protected baseUrl: string;

  /** Cache-Policy für Abfragen */
  protected defaultCachePolicy: CachePolicy;

  /** Zeit bis Cache-Verfall (in Sekunden) */
  protected defaultCacheTTL: number;

  /** Timeout für Anfragen (in ms) */
  protected defaultTimeout: number;

  /** Debug-Modus aktivieren */
  protected debug: boolean;

  /** Logger-Instanz */
  protected logger: LogService;

  /** Fehlernachrichten-Überschreibungen */
  protected errorMessages: Record<string, string>;

  /**
   * Konstruktor
   */
  constructor(options: BaseApiServiceOptions) {
    this.resourcePath = options.resourcePath;
    this.baseUrl = options.baseUrl || apiConfig.BASE_URL;
    this.defaultCachePolicy =
      options.defaultCachePolicy || CachePolicy.CACHE_FIRST;
    this.defaultCacheTTL = options.defaultCacheTTL || 300; // 5 Minuten
    this.defaultTimeout = options.defaultTimeout || apiConfig.TIMEOUTS.DEFAULT;
    this.debug = options.debug || apiConfig.DEBUG.VERBOSE;
    this.logger = new LogService(options.serviceName || this.constructor.name);
    this.errorMessages = {
      // Standard-Fehlermeldungen
      GET_ERROR: `Fehler beim Abrufen der ${this.resourcePath}-Daten`,
      CREATE_ERROR: `Fehler beim Erstellen des ${this.resourcePath}-Elements`,
      UPDATE_ERROR: `Fehler beim Aktualisieren des ${this.resourcePath}-Elements`,
      DELETE_ERROR: `Fehler beim Löschen des ${this.resourcePath}-Elements`,
      LIST_ERROR: `Fehler beim Abrufen der ${this.resourcePath}-Liste`,
      ...options.errorMessages,
    };
  }

  /**
   * Erstellt eine vollständige URL für einen Ressourcenpfad
   * @param id Optionale ID für einzelne Ressourcen
   * @param subPath Optionaler Unterpfad
   */
  protected buildUrl(id?: string | number, subPath?: string): string {
    let url = `${this.resourcePath}`;

    if (id !== undefined) {
      url += `/${id}`;
    }

    if (subPath) {
      url += `/${subPath}`;
    }

    return url;
  }

  /**
   * Verarbeitet einen API-Fehler und gibt ein typisiertes Fehlerresultat zurück
   */
  protected handleError<T>(
    error: any,
    defaultMessage: string,
  ): AsyncAPIResult<T> {
    // Protokolliert den Fehler
    this.logger.error(defaultMessage, error);

    // Prüft, ob es sich bereits um einen formatierten APIError handelt
    if (isAPIError(error)) {
      return {
        success: false,
        error,
      };
    }

    // Erstellt einen neuen APIError aus dem allgemeinen Fehler
    const apiError: APIError = {
      code: error.code || "UNKNOWN_ERROR",
      message: error.message || defaultMessage,
      status: error.status || error.statusCode || 500,
      details: error.details || error,
    };

    return {
      success: false,
      error: apiError,
    };
  }

  /**
   * Typsicherer Wrapper für API-Anfragen
   */
  protected async safeRequest<T>(
    apiFunc: AsyncFunction<APIResponse<T>>,
    errorMessage: string,
    ...args: any[]
  ): Promise<Result<T, APIError>> {
    try {
      const [response, requestError] = await catchAsync<APIResponse<T>>(
        apiFunc(...args),
      );

      if (requestError) {
        return this.handleError(requestError, errorMessage);
      }

      if (!response) {
        return this.handleError(
          new Error("Leere Antwort vom Server"),
          errorMessage,
        );
      }

      if (!response.success || !response.data) {
        return this.handleError(
          response.error || {
            code: "API_ERROR",
            message: response.message || errorMessage,
          },
          errorMessage,
        );
      }

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return this.handleError(error, errorMessage);
    }
  }

  /**
   * Standard-CRUD-Operationen
   */

  /**
   * Holt eine einzelne Entität
   */
  public async get(id: string | number): Promise<Result<EntityType, APIError>> {
    return this.safeRequest(
      apiService.get.bind(apiService),
      `${this.errorMessages.GET_ERROR} (ID: ${id})`,
      this.buildUrl(id),
    );
  }

  /**
   * Holt eine einzelne Entität mit Caching
   */
  public async getCached(
    id: string | number,
    cachePolicy: CachePolicy = this.defaultCachePolicy,
    cacheTTL: number = this.defaultCacheTTL,
  ): Promise<Result<EntityType, APIError>> {
    return this.safeRequest(
      cachedApiService.get.bind(cachedApiService),
      `${this.errorMessages.GET_ERROR} (ID: ${id})`,
      this.buildUrl(id),
      undefined,
      {
        cache: true,
        cachePolicy,
        cacheTTL,
      },
    );
  }

  /**
   * Listet Entitäten auf (mit Paginierung)
   */
  public async list(
    params?: ListParams,
  ): Promise<Result<EntityType[], APIError>> {
    return this.safeRequest(
      apiService.get.bind(apiService),
      this.errorMessages.LIST_ERROR,
      this.buildUrl(),
      params,
    );
  }

  /**
   * Listet Entitäten mit Caching auf
   */
  public async listCached(
    params?: ListParams,
    cachePolicy: CachePolicy = this.defaultCachePolicy,
    cacheTTL: number = this.defaultCacheTTL,
  ): Promise<Result<EntityType[], APIError>> {
    return this.safeRequest(
      cachedApiService.get.bind(cachedApiService),
      this.errorMessages.LIST_ERROR,
      this.buildUrl(),
      params,
      {
        cache: true,
        cachePolicy,
        cacheTTL,
      },
    );
  }

  /**
   * Erstellt eine neue Entität
   */
  public async create(
    data: CreateParams,
  ): Promise<Result<EntityType, APIError>> {
    return this.safeRequest(
      apiService.post.bind(apiService),
      this.errorMessages.CREATE_ERROR,
      this.buildUrl(),
      data,
    );
  }

  /**
   * Aktualisiert eine bestehende Entität
   */
  public async update(
    id: string | number,
    data: UpdateParams,
  ): Promise<Result<EntityType, APIError>> {
    return this.safeRequest(
      apiService.patch.bind(apiService),
      `${this.errorMessages.UPDATE_ERROR} (ID: ${id})`,
      this.buildUrl(id),
      data,
    );
  }

  /**
   * Löscht eine Entität
   */
  public async delete(id: string | number): Promise<Result<void, APIError>> {
    return this.safeRequest(
      apiService.delete.bind(apiService),
      `${this.errorMessages.DELETE_ERROR} (ID: ${id})`,
      this.buildUrl(id),
    );
  }

  /**
   * Führt eine Suchaktion durch
   */
  public async search(
    searchTerm: string,
    filterParams?: FilterParams,
  ): Promise<Result<EntityType[], APIError>> {
    const params = {
      search: searchTerm,
      ...filterParams,
    };

    return this.safeRequest(
      apiService.get.bind(apiService),
      `Fehler bei der Suche nach "${searchTerm}"`,
      this.buildUrl(),
      params,
    );
  }

  /**
   * Führt eine benutzerdefinierte Aktion auf einer Ressource aus
   */
  public async executeAction<R = any, P = any>(
    id: string | number,
    action: string,
    params?: P,
  ): Promise<Result<R, APIError>> {
    return this.safeRequest(
      apiService.post.bind(apiService),
      `Fehler beim Ausführen der Aktion "${action}"`,
      this.buildUrl(id, action),
      params,
    );
  }
}

export default BaseApiService;
