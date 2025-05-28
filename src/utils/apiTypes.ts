/**
 * API Utility Types
 *
 * Diese Datei enthält Utility-Typen speziell für die Arbeit mit APIs, HTTP-Anfragen und Antworten.
 * Sie bietet Typen für REST, GraphQL und andere API-Interaktionen.
 */

import { Result } from "./types";

/**
 * HTTPMethod - Enum für HTTP-Methoden
 */
export enum HTTPMethod {
  GET = "GET",
  POST = "POST",
  PUT = "PUT",
  DELETE = "DELETE",
  PATCH = "PATCH",
  HEAD = "HEAD",
  OPTIONS = "OPTIONS",
}

/**
 * StatusCode - Enum für HTTP-Statuscodes
 */
export enum StatusCode {
  // 2xx - Erfolgreiche Operationen
  OK = 200,
  CREATED = 201,
  ACCEPTED = 202,
  NO_CONTENT = 204,

  // 3xx - Umleitungen
  MOVED_PERMANENTLY = 301,
  FOUND = 302,
  SEE_OTHER = 303,
  NOT_MODIFIED = 304,
  TEMPORARY_REDIRECT = 307,
  PERMANENT_REDIRECT = 308,

  // 4xx - Client-Fehler
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  METHOD_NOT_ALLOWED = 405,
  CONFLICT = 409,
  GONE = 410,
  UNSUPPORTED_MEDIA_TYPE = 415,
  TOO_MANY_REQUESTS = 429,

  // 5xx - Server-Fehler
  INTERNAL_SERVER_ERROR = 500,
  NOT_IMPLEMENTED = 501,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
  GATEWAY_TIMEOUT = 504,
}

/**
 * APIErrorCode - Enum für API-spezifische Fehlercodes
 */
export enum APIErrorCode {
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
  NETWORK_ERROR = "NETWORK_ERROR",
  TIMEOUT = "TIMEOUT",
  AUTHENTICATION_FAILED = "AUTHENTICATION_FAILED",
  INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS",
  INVALID_INPUT = "INVALID_INPUT",
  RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  SERVER_ERROR = "SERVER_ERROR",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  BUSINESS_LOGIC_ERROR = "BUSINESS_LOGIC_ERROR",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
}

/**
 * APIResponse<T> - Standardformat für API-Antworten
 */
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: APIError;
  statusCode?: number;
  timestamp?: string;
  context?: string;
  meta?: APIResponseMeta;
}

/**
 * APIError - Standard-Fehlerformat für API-Antworten
 */
export interface APIError {
  code: string;
  message: string;
  details?: Record<string, any>;
  status?: number;
  stack?: string;
}

/**
 * APIResponseMeta - Metadaten für API-Antworten
 */
export interface APIResponseMeta {
  version?: string;
  serverTime?: string;
  duration?: number;
  requestId?: string;
  [key: string]: any;
}

/**
 * Paginated<T> - Standard-Format für paginierte API-Antworten
 */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  totalPages: number;
}

/**
 * PaginationParams - Standard-Parameter für paginierte Anfragen
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  search?: string;
  filters?: Record<string, any>;
}

/**
 * SortOrder - Sortierreihenfolge für API-Anfragen
 */
export type SortOrder = "asc" | "desc";

/**
 * SortParams - Parameter für Sortieranfragen
 */
export interface SortParams {
  field: string;
  order: SortOrder;
}

/**
 * FilterOperator - Operatoren für Filteranfragen
 */
export enum FilterOperator {
  EQ = "eq", // Equal
  NE = "ne", // Not Equal
  GT = "gt", // Greater Than
  GTE = "gte", // Greater Than or Equal
  LT = "lt", // Less Than
  LTE = "lte", // Less Than or Equal
  IN = "in", // In Array
  NIN = "nin", // Not In Array
  LIKE = "like", // String Contains
  ILIKE = "ilike", // Case-Insensitive String Contains
}

/**
 * FilterCondition - Bedingung für Filteranfragen
 */
export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value: any;
}

/**
 * FilterParams - Parameter für Filteranfragen
 */
export interface FilterParams {
  conditions: FilterCondition[];
  logic?: "and" | "or";
}

/**
 * APIRequest - Basisinterface für API-Anfragen
 */
export interface APIRequest {
  url: string;
  method: HTTPMethod;
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean | null>;
  data?: any;
  timeout?: number;
  withCredentials?: boolean;
  responseType?: "json" | "text" | "blob" | "arraybuffer";
  signal?: AbortSignal;
}

/**
 * APIClientConfig - Konfiguration für API-Clients
 */
export interface APIClientConfig {
  baseURL: string;
  defaultHeaders?: Record<string, string>;
  timeout?: number;
  withCredentials?: boolean;
  retryConfig?: RetryConfig;
  onError?: (error: APIError) => void;
  onRequest?: (request: APIRequest) => APIRequest;
  onResponse?: <T>(response: APIResponse<T>) => APIResponse<T>;
}

/**
 * RetryConfig - Konfiguration für Wiederholungsversuche bei API-Anfragen
 */
export interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  retryStatusCodes: number[];
  shouldRetry?: (error: any) => boolean;
}

/**
 * APIHookResult<T, E> - Ergebnis für API-Hooks (z.B. React/Vue)
 */
export interface APIHookResult<T, E = APIError> {
  data: T | null;
  error: E | null;
  loading: boolean;
  called: boolean;
  refetch: () => Promise<void>;
}

/**
 * AsyncAPIResult<T> - Ergebnis für asynchrone API-Aufrufe
 */
export type AsyncAPIResult<T> = Result<T, APIError>;

/**
 * LoginCredentials - Standardformat für Login-Anfragen
 */
export interface LoginCredentials {
  username: string;
  password: string;
  rememberMe?: boolean;
  twoFactorToken?: string;
}

/**
 * TokenResponse - Standardformat für Token-Antworten
 */
export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  expiresAt: string;
  tokenType?: string;
}

/**
 * Token-Typen für Auth-Flow
 */
export enum TokenType {
  ACCESS = "access",
  REFRESH = "refresh",
  ID = "id",
}

/**
 * Middleware-Funktionstyp für API-Anfragen
 */
export type APIRequestMiddleware = (
  request: APIRequest,
  next: (request: APIRequest) => Promise<any>,
) => Promise<any>;

/**
 * Cache-Policy für API-Requests
 */
export enum CachePolicy {
  CACHE_FIRST = "cache-first", // Versuche Cache, dann Netzwerk
  NETWORK_FIRST = "network-first", // Versuche Netzwerk, dann Cache
  CACHE_ONLY = "cache-only", // Nur Cache verwenden
  NETWORK_ONLY = "network-only", // Nur Netzwerk verwenden
  STALE_WHILE_REVALIDATE = "stale-while-revalidate", // Cache sofort, dann aktualisieren
}

/**
 * CacheConfig - Konfiguration für API-Caching
 */
export interface CacheConfig {
  policy: CachePolicy;
  maxAge?: number; // Maximales Alter in Millisekunden
  staleWhileRevalidate?: boolean;
  etag?: boolean;
  cacheKey?: (request: APIRequest) => string;
}

/**
 * GraphQLRequest - Anfrage für GraphQL-APIs
 */
export interface GraphQLRequest {
  query: string;
  variables?: Record<string, any>;
  operationName?: string;
}

/**
 * GraphQLResponse<T> - Antwort von GraphQL-APIs
 */
export interface GraphQLResponse<T = any> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
    extensions?: Record<string, any>;
  }>;
}

/**
 * WebSocketMessage - Nachrichtenformat für WebSocket-Kommunikation
 */
export interface WebSocketMessage<T = any> {
  type: string;
  payload?: T;
  id?: string;
  timestamp?: number;
}

/**
 * Typ für Batch-API-Anfragen (mehrere Anfragen in einer)
 */
export interface BatchAPIRequest {
  requests: APIRequest[];
  executionMode?: "parallel" | "sequential";
}

/**
 * Typ für Batch-API-Antworten
 */
export interface BatchAPIResponse {
  responses: APIResponse[];
  failedRequests: number;
  successfulRequests: number;
}

/**
 * Hilfsfunktion zur Erzeugung typsicherer API-Antworten
 */
export function createApiResponse<T>(
  data: T,
  success = true,
  message?: string,
): APIResponse<T> {
  return {
    success,
    data,
    message,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Hilfsfunktion zur Erzeugung typsicherer API-Fehler
 */
export function createApiError(
  code: APIErrorCode | string,
  message: string,
  details?: Record<string, any>,
  status?: number,
): APIError {
  return {
    code,
    message,
    details,
    status,
  };
}
