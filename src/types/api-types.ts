/**
 * Konsolidierte API-Typdefinitionen für den nscale DMS Assistenten
 *
 * Diese Datei bietet eine zentralisierte Definition aller API-Endpunkte
 * mit exakten Request- und Response-Typen für jeden Endpunkt.
 */

import type {
  ApiResponse,
  ApiError,
  PaginatedResponse,
  PaginationRequest,
  LoginRequest,
  LoginResponse,
  TokenRefreshRequest,
  TokenRefreshResponse,
  User,
  ChatSession,
  ChatMessage,
  Document,
  SystemInfo,
  Feedback,
  CreateSessionRequest,
  SendMessageRequest,
  StreamingEvent,
  Source,
} from "./api";

// Re-exportieren aller Basis-Typen für einfachen Import
export * from "./api";

/**
 * Namespace für API-Endpunkte mit Request/Response-Typdefinitionen
 */
export namespace API {
  /**
   * Authentifizierungs-Endpunkte
   */
  export namespace Auth {
    /**
     * Login-Endpunkt
     */
    export interface LoginRequest {
      email: string;
      password: string;
      rememberMe?: boolean;
    }

    export interface LoginResponse {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
      expiresAt: string;
      user: User;
    }

    export const LOGIN_ENDPOINT = "/auth/login";

    /**
     * Token-Refresh-Endpunkt
     */
    export interface RefreshRequest {
      refreshToken: string;
    }

    export interface RefreshResponse {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
      expiresAt: string;
    }

    export const REFRESH_ENDPOINT = "/auth/refresh";

    /**
     * Logout-Endpunkt
     */
    export interface LogoutRequest {
      refreshToken?: string;
    }

    export interface LogoutResponse {
      success: boolean;
    }

    export const LOGOUT_ENDPOINT = "/auth/logout";

    /**
     * Benutzerinfo-Endpunkt
     */
    export type MeResponse = User;

    export const ME_ENDPOINT = "/auth/me";
  }

  /**
   * Chat-Session-Endpunkte
   */
  export namespace Sessions {
    /**
     * Alle Sessions abrufen
     */
    export interface GetSessionsParams extends PaginationRequest {
      includeArchived?: boolean;
      sortBy?: "createdAt" | "updatedAt" | "title";
      search?: string;
    }

    export type GetSessionsResponse = PaginatedResponse<ChatSession>;

    export const SESSIONS_ENDPOINT = "/chat/sessions";

    /**
     * Neue Session erstellen
     */
    export interface CreateSessionRequest {
      title?: string;
      initialMessage?: string;
      tags?: string[];
      metadata?: Record<string, any>;
    }

    export type CreateSessionResponse = ChatSession;

    /**
     * Spezifische Session abrufen
     */
    export interface GetSessionParams {
      id: string;
    }

    export type GetSessionResponse = ChatSession;

    export const SESSION_ENDPOINT = (id: string) => `/chat/sessions/${id}`;

    /**
     * Session aktualisieren
     */
    export interface UpdateSessionRequest {
      title?: string;
      isPinned?: boolean;
      isArchived?: boolean;
      tags?: string[];
      metadata?: Record<string, any>;
    }

    export type UpdateSessionResponse = ChatSession;

    /**
     * Session löschen
     */
    export interface DeleteSessionResponse {
      success: boolean;
      id: string;
    }
  }

  /**
   * Chat-Nachrichten-Endpunkte
   */
  export namespace Messages {
    /**
     * Nachrichten einer Session abrufen
     */
    export interface GetMessagesParams extends PaginationRequest {
      sessionId: string;
      includeMetadata?: boolean;
    }

    export type GetMessagesResponse = PaginatedResponse<ChatMessage>;

    export const MESSAGES_ENDPOINT = (sessionId: string) =>
      `/chat/sessions/${sessionId}/messages`;

    /**
     * Nachricht senden
     */
    export interface SendMessageRequest {
      sessionId: string;
      content: string;
      role?: "user" | "system";
      metadata?: Record<string, any>;
      stream?: boolean;
    }

    export type SendMessageResponse = ChatMessage;

    export const SEND_MESSAGE_ENDPOINT = "/chat/messages";

    /**
     * Nachricht streamen
     */
    export type StreamMessageResponse = StreamingEvent;

    export const STREAM_MESSAGE_ENDPOINT = "/chat/messages/stream";

    /**
     * Nachricht löschen
     */
    export interface DeleteMessageParams {
      sessionId: string;
      messageId: string;
    }

    export interface DeleteMessageResponse {
      success: boolean;
      sessionId: string;
      messageId: string;
    }

    export const DELETE_MESSAGE_ENDPOINT = (
      sessionId: string,
      messageId: string,
    ) => `/chat/sessions/${sessionId}/messages/${messageId}`;
  }

  /**
   * Dokument-Konverter-Endpunkte
   */
  export namespace Documents {
    /**
     * Dokumente abrufen
     */
    export interface GetDocumentsParams extends PaginationRequest {
      type?: string;
      status?: "pending" | "processing" | "completed" | "failed";
      search?: string;
    }

    export type GetDocumentsResponse = PaginatedResponse<Document>;

    export const DOCUMENTS_ENDPOINT = "/documents";

    /**
     * Dokument hochladen
     */
    export interface UploadDocumentRequest {
      file: File;
      documentType?: string;
      metadata?: Record<string, any>;
    }

    export interface UploadDocumentResponse {
      document: Document;
      taskId?: string;
    }

    export const UPLOAD_DOCUMENT_ENDPOINT = "/documents/upload";

    /**
     * Dokument konvertieren
     */
    export interface ConvertDocumentRequest {
      documentId: string;
      targetFormat: string;
      options?: Record<string, any>;
    }

    export interface ConvertDocumentResponse {
      taskId: string;
      status: "pending" | "processing" | "completed" | "failed";
      document: Document;
    }

    export const CONVERT_DOCUMENT_ENDPOINT = "/documents/convert";

    /**
     * Konvertierungsstatus abrufen
     */
    export interface GetConversionStatusParams {
      taskId: string;
    }

    export interface ConversionStatus {
      taskId: string;
      status: "pending" | "processing" | "completed" | "failed";
      progress?: number;
      result?: Document;
      error?: string;
    }

    export type GetConversionStatusResponse = ConversionStatus;

    export const CONVERSION_STATUS_ENDPOINT = (taskId: string) =>
      `/documents/tasks/${taskId}`;

    /**
     * Dokument löschen
     */
    export interface DeleteDocumentParams {
      documentId: string;
    }

    export interface DeleteDocumentResponse {
      success: boolean;
      documentId: string;
    }

    export const DELETE_DOCUMENT_ENDPOINT = (documentId: string) =>
      `/documents/${documentId}`;
  }

  /**
   * Admin-Endpunkte
   */
  export namespace Admin {
    /**
     * Systeminfo abrufen
     */
    export type GetSystemInfoResponse = SystemInfo;

    export const SYSTEM_INFO_ENDPOINT = "/admin/system";

    /**
     * Benutzer auflisten
     */
    export interface GetUsersParams extends PaginationRequest {
      role?: string;
      status?: "active" | "inactive";
      search?: string;
    }

    export type GetUsersResponse = PaginatedResponse<User>;

    export const USERS_ENDPOINT = "/admin/users";

    /**
     * Benutzer erstellen
     */
    export interface CreateUserRequest {
      email: string;
      password: string;
      displayName: string;
      roles: string[];
      metadata?: Record<string, any>;
    }

    export type CreateUserResponse = User;

    /**
     * Benutzer aktualisieren
     */
    export interface UpdateUserRequest {
      email?: string;
      displayName?: string;
      roles?: string[];
      metadata?: Record<string, any>;
      status?: "active" | "inactive";
    }

    export type UpdateUserResponse = User;

    export const USER_ENDPOINT = (userId: string) => `/admin/users/${userId}`;

    /**
     * Feedback auflisten
     */
    export interface GetFeedbackParams extends PaginationRequest {
      category?: string;
      resolved?: boolean;
      startDate?: string;
      endDate?: string;
    }

    export type GetFeedbackResponse = PaginatedResponse<Feedback>;

    export const FEEDBACK_ENDPOINT = "/admin/feedback";
  }

  /**
   * Feedback-Endpunkte
   */
  export namespace Feedback {
    /**
     * Feedback senden
     */
    export interface SendFeedbackRequest {
      category: "bug" | "feature" | "performance" | "other";
      content: string;
      rating?: number;
      referenceId?: string;
      referenceType?: "session" | "document" | "feature";
      context?: Record<string, any>;
    }

    export interface SendFeedbackResponse {
      id: string;
      success: boolean;
    }

    export const SEND_FEEDBACK_ENDPOINT = "/feedback";
  }
}

/**
 * API Client Interface
 * Definiert die Methoden, die ein API-Client implementieren muss
 */
export interface ApiClient {
  // Allgemeine HTTP-Methoden
  get<T>(url: string, params?: Record<string, any>): Promise<ApiResponse<T>>;
  post<T>(url: string, data?: any): Promise<ApiResponse<T>>;
  put<T>(url: string, data?: any): Promise<ApiResponse<T>>;
  delete<T>(url: string): Promise<ApiResponse<T>>;

  // Authentifizierung
  login(credentials: API.Auth.LoginRequest): Promise<API.Auth.LoginResponse>;
  refreshToken(
    request: API.Auth.RefreshRequest,
  ): Promise<API.Auth.RefreshResponse>;
  logout(): Promise<API.Auth.LogoutResponse>;
  getProfile(): Promise<User>;

  // Sessions
  getSessions(
    params?: API.Sessions.GetSessionsParams,
  ): Promise<API.Sessions.GetSessionsResponse>;
  createSession(
    request: API.Sessions.CreateSessionRequest,
  ): Promise<API.Sessions.CreateSessionResponse>;
  getSession(id: string): Promise<API.Sessions.GetSessionResponse>;
  updateSession(
    id: string,
    request: API.Sessions.UpdateSessionRequest,
  ): Promise<API.Sessions.UpdateSessionResponse>;
  deleteSession(id: string): Promise<API.Sessions.DeleteSessionResponse>;

  // Nachrichten
  getMessages(
    sessionId: string,
    params?: API.Messages.GetMessagesParams,
  ): Promise<API.Messages.GetMessagesResponse>;
  sendMessage(
    request: API.Messages.SendMessageRequest,
  ): Promise<API.Messages.SendMessageResponse>;
  streamMessage(
    request: API.Messages.SendMessageRequest,
    onChunk: (chunk: StreamingEvent) => void,
  ): Promise<void>;
  deleteMessage(
    sessionId: string,
    messageId: string,
  ): Promise<API.Messages.DeleteMessageResponse>;

  // Dokumente
  getDocuments(
    params?: API.Documents.GetDocumentsParams,
  ): Promise<API.Documents.GetDocumentsResponse>;
  uploadDocument(
    request: API.Documents.UploadDocumentRequest,
  ): Promise<API.Documents.UploadDocumentResponse>;
  convertDocument(
    request: API.Documents.ConvertDocumentRequest,
  ): Promise<API.Documents.ConvertDocumentResponse>;
  getConversionStatus(
    taskId: string,
  ): Promise<API.Documents.GetConversionStatusResponse>;
  deleteDocument(
    documentId: string,
  ): Promise<API.Documents.DeleteDocumentResponse>;

  // Admin
  getSystemInfo(): Promise<API.Admin.GetSystemInfoResponse>;
  getUsers(
    params?: API.Admin.GetUsersParams,
  ): Promise<API.Admin.GetUsersResponse>;
  createUser(
    request: API.Admin.CreateUserRequest,
  ): Promise<API.Admin.CreateUserResponse>;
  updateUser(
    userId: string,
    request: API.Admin.UpdateUserRequest,
  ): Promise<API.Admin.UpdateUserResponse>;
  getFeedback(
    params?: API.Admin.GetFeedbackParams,
  ): Promise<API.Admin.GetFeedbackResponse>;

  // Feedback
  sendFeedback(
    request: API.Feedback.SendFeedbackRequest,
  ): Promise<API.Feedback.SendFeedbackResponse>;
}

/**
 * API Error Handling
 */
export class ApiError extends Error {
  code: string;
  status: number;
  details?: Record<string, any>;

  constructor(error: ApiError) {
    super(error.message);
    this.name = "ApiError";
    this.code = error.code;
    this.status = error.status || 500;
    this.details = error.details;

    // Für korrekte instanceof-Überprüfungen
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  static isApiError(error: any): error is ApiError {
    return (
      error instanceof ApiError ||
      (typeof error === "object" &&
        error !== null &&
        "code" in error &&
        "message" in error)
    );
  }
}
