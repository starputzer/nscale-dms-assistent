/**
 * API-Typdefinitionen für den nscale DMS Assistenten
 * 
 * Dieses Modul enthält TypeScript-Interfaces für alle API-Anfragen und -Antworten
 * des Systems. Die Typen gewährleisten Typensicherheit bei der Interaktion mit der API.
 */

// Basistypen und generische Antwortformate

/**
 * Standard-API-Antwortformat für alle Endpunkte
 * Generischer Typ ermöglicht typsichere Daten basierend auf dem Endpunkt
 */
export interface ApiResponse<T = any> {
  /** Erfolgs- oder Fehlerstatus der Anfrage */
  success: boolean;
  
  /** Daten, die von der Anfrage zurückgegeben werden (nur bei success=true) */
  data?: T;
  
  /** Meldung vom Server (kann für Erfolgs- oder Fehlermeldungen verwendet werden) */
  message?: string;
  
  /** Fehlerinformationen (nur bei success=false) */
  error?: ApiError;
  
  /** HTTP-Statuscode */
  statusCode?: number;
  
  /** Server-Timestamp der Antwort */
  timestamp?: string;
  
  /** Anfragekontext bzw. Pfad */
  context?: string;
}

/**
 * Struktur für API-Fehlerinformationen
 */
export interface ApiError {
  /** Fehlercode (z.B. "AUTH_FAILED", "RATE_LIMIT_EXCEEDED", etc.) */
  code: string;
  
  /** Benutzerfreundliche Fehlermeldung */
  message: string;
  
  /** Zusätzliche Details zum Fehler (optional) */
  details?: Record<string, any>;
  
  /** HTTP-Statuscode des Fehlers */
  status?: number;
  
  /** Fehler-Stack für Debugging (nur in Entwicklungsumgebung) */
  stack?: string;
}

/**
 * Paginierte API-Antwort für Listen-Endpunkte
 */
export interface PaginatedResponse<T> {
  /** Liste der Elemente für die aktuelle Seite */
  items: T[];
  
  /** Gesamtzahl der verfügbaren Elemente */
  total: number;
  
  /** Aktuelle Seitennummer (1-basiert) */
  page: number;
  
  /** Anzahl der Elemente pro Seite */
  pageSize: number;
  
  /** Gibt an, ob es weitere Seiten gibt */
  hasMore: boolean;
  
  /** Gesamtzahl der verfügbaren Seiten */
  totalPages: number;
}

/**
 * Paginierungsanfrage für Listen-Endpunkte
 */
export interface PaginationRequest {
  /** Gewünschte Seitennummer (1-basiert) */
  page?: number;
  
  /** Gewünschte Anzahl von Elementen pro Seite */
  pageSize?: number;
  
  /** Sortierfeld */
  sortBy?: string;
  
  /** Sortierrichtung (asc oder desc) */
  sortDirection?: 'asc' | 'desc';
  
  /** Suchtext für Filterung */
  search?: string;
  
  /** Zusätzliche Filter als Key-Value-Paare */
  filters?: Record<string, any>;
}

// Authentifizierung und Benutzer

/**
 * Anmeldedaten für Login-Anfragen
 */
export interface LoginRequest {
  /** Benutzername oder E-Mail */
  username: string;
  
  /** Passwort */
  password: string;
  
  /** Option zum Speichern der Anmeldung */
  rememberMe?: boolean;
  
  /** 2FA-Token (falls erforderlich) */
  twoFactorToken?: string;
}

/**
 * Antwort auf erfolgreiche Anmeldung
 */
export interface LoginResponse {
  /** JWT-Zugangstoken */
  accessToken: string;
  
  /** JWT-Refresh-Token für Token-Erneuerung */
  refreshToken: string;
  
  /** Gültigkeitsdauer des Tokens in Sekunden */
  expiresIn: number;
  
  /** Zeitpunkt des Tokenablaufs als ISO-String */
  expiresAt: string;
  
  /** Benutzerinformationen */
  user: User;
}

/**
 * Anfrage zur Token-Erneuerung
 */
export interface TokenRefreshRequest {
  /** Refresh-Token aus der ursprünglichen Anmeldung */
  refreshToken: string;
}

/**
 * Antwort auf erfolgreiche Token-Erneuerung
 */
export interface TokenRefreshResponse {
  /** Neues JWT-Zugangstoken */
  accessToken: string;
  
  /** Neues JWT-Refresh-Token */
  refreshToken: string;
  
  /** Gültigkeitsdauer des neuen Tokens in Sekunden */
  expiresIn: number;
  
  /** Zeitpunkt des Tokenablaufs als ISO-String */
  expiresAt: string;
}

/**
 * Benutzerinformationen
 */
export interface User {
  /** Eindeutige Benutzer-ID */
  id: string;
  
  /** Anzeigename des Benutzers */
  displayName: string;
  
  /** E-Mail-Adresse */
  email: string;
  
  /** Profilbild-URL (optional) */
  avatar?: string;
  
  /** Benutzerrollen (z.B. "admin", "user") */
  roles: string[];
  
  /** Berechtigungen des Benutzers */
  permissions: string[];
  
  /** Zeitpunkt der letzten Anmeldung als ISO-String */
  lastLogin?: string;
  
  /** Benutzerpräferenzen */
  preferences?: UserPreferences;
  
  /** Metadaten */
  metadata?: Record<string, any>;
}

/**
 * Benutzerspezifische Einstellungen
 */
export interface UserPreferences {
  /** Bevorzugte Sprache (z.B. "de-DE") */
  language?: string;
  
  /** Bevorzugtes Farbschema (z.B. "light", "dark", "system") */
  theme?: string;
  
  /** Zeitzone des Benutzers */
  timezone?: string;
  
  /** Bevorzugtes Datumsformat */
  dateFormat?: string;
  
  /** Notification-Einstellungen */
  notifications?: {
    /** E-Mail-Benachrichtigungen aktiviert */
    email: boolean;
    
    /** Push-Benachrichtigungen aktiviert */
    push: boolean;
    
    /** In-App-Benachrichtigungen aktiviert */
    inApp: boolean;
  };
  
  /** Weitere benutzerspezifische Einstellungen */
  [key: string]: any;
}

// Chat und Sessions

/**
 * Chat-Session
 */
export interface ChatSession {
  /** Eindeutige Session-ID */
  id: string;
  
  /** Titel der Session */
  title: string;
  
  /** Zeitpunkt der Erstellung als ISO-String */
  createdAt: string;
  
  /** Zeitpunkt der letzten Aktualisierung als ISO-String */
  updatedAt: string;
  
  /** Anzahl der Nachrichten in der Session */
  messageCount: number;
  
  /** Ist die Session angeheftet? */
  isPinned?: boolean;
  
  /** Ist die Session archiviert? */
  isArchived?: boolean;
  
  /** Tags zur Kategorisierung */
  tags?: string[];
  
  /** Benutzerdefinierte Metadaten */
  metadata?: Record<string, any>;
}

/**
 * Chat-Nachricht
 */
export interface ChatMessage {
  /** Eindeutige Nachrichten-ID */
  id: string;
  
  /** ID der zugehörigen Session */
  sessionId: string;
  
  /** Absenderrolle ("user", "assistant", "system") */
  role: 'user' | 'assistant' | 'system';
  
  /** Inhalt der Nachricht */
  content: string;
  
  /** Zeitpunkt der Erstellung als ISO-String */
  timestamp: string;
  
  /** Zusätzliche Metadaten zur Nachricht */
  metadata?: {
    /** Quellenangaben für Antworten */
    sources?: Source[];
    
    /** Sonstige Metadaten */
    [key: string]: any;
  };
}

/**
 * Quellenangabe für Nachrichteninhalte
 */
export interface Source {
  /** Titel der Quelle */
  title: string;
  
  /** URL oder Pfad zur Quelle */
  url: string;
  
  /** Relevanz der Quelle (0-1) */
  relevance?: number;
  
  /** Textverweis oder Zitat aus der Quelle */
  citation?: string;
}

/**
 * Anfrage zum Erstellen einer neuen Session
 */
export interface CreateSessionRequest {
  /** Optionaler Titel für die neue Session */
  title?: string;
  
  /** Optionale initiale Nachricht */
  initialMessage?: string;
  
  /** Optionale Tags */
  tags?: string[];
  
  /** Optionale Metadaten */
  metadata?: Record<string, any>;
}

/**
 * Parameter für Nachrichtenversand
 */
export interface SendMessageRequest {
  /** Inhalt der Nachricht */
  content: string;
  
  /** Rolle des Absenders (Standard: "user") */
  role?: 'user' | 'assistant' | 'system';
  
  /** Kontext-Informationen für die Anfrage */
  context?: Record<string, any>;
  
  /** Stream-Modus aktivieren (für Echtzeit-Antworten) */
  stream?: boolean;
}

/**
 * Streaming-Event für Chat-Antworten
 */
export interface StreamingEvent {
  /** Typ des Events */
  type: 'content' | 'metadata' | 'progress' | 'error' | 'end';
  
  /** Inhalts-Chunk bei Content-Events */
  content?: string;
  
  /** Fortschritt bei Progress-Events (0-100) */
  progress?: number;
  
  /** Metadaten bei Metadata-Events */
  metadata?: Record<string, any>;
  
  /** Fehlermeldung bei Error-Events */
  error?: ApiError;
  
  /** ID der zugehörigen Nachricht */
  messageId?: string;
  
  /** ID der zugehörigen Session */
  sessionId?: string;
  
  /** Nur bei Ende-Events: Vollständige Nachricht */
  message?: ChatMessage;
}

// Dokumentenkonverter

/**
 * Dokument im System
 */
export interface Document {
  /** Eindeutige Dokument-ID */
  id: string;
  
  /** Dateiname */
  filename: string;
  
  /** Dateityp/MIME-Typ */
  mimeType: string;
  
  /** Größe in Bytes */
  size: number;
  
  /** Ursprüngliche Quelle oder Uploader */
  source: string;
  
  /** Zeitpunkt des Hochladens als ISO-String */
  uploadedAt: string;
  
  /** Status der Verarbeitung */
  status: 'pending' | 'processing' | 'completed' | 'failed';
  
  /** Extrahierter Text (wenn verfügbar) */
  content?: string;
  
  /** Fehlerinformationen (wenn status="failed") */
  error?: string;
  
  /** Metadaten zum Dokument */
  metadata?: Record<string, any>;
}

/**
 * Anfrage zum Hochladen eines Dokuments
 */
export interface UploadDocumentRequest {
  /** Dokumenttyp oder Kategorie */
  documentType?: string;
  
  /** Zusätzliche Metadaten */
  metadata?: Record<string, any>;
}

/**
 * Anfrage zur Dokumentenkonvertierung
 */
export interface ConvertDocumentRequest {
  /** Dokument-ID */
  documentId: string;
  
  /** Zielformat für die Konvertierung */
  targetFormat: string;
  
  /** Zusätzliche Konvertierungsoptionen */
  options?: Record<string, any>;
}

// System und Einstellungen

/**
 * Systeminformationen
 */
export interface SystemInfo {
  /** API-Version */
  apiVersion: string;
  
  /** Servername */
  serverName: string;
  
  /** Server-Zeitstempel */
  serverTime: string;
  
  /** Aktive Features und Module */
  features: Record<string, boolean>;
  
  /** Systemmeldungen/Ankündigungen */
  announcements?: Announcement[];
  
  /** Systemstatus */
  status: {
    /** Allgemeiner Status */
    overall: 'healthy' | 'degraded' | 'maintenance';
    
    /** Detaillierter Komponentenstatus */
    components: Record<string, {
      status: 'healthy' | 'degraded' | 'down';
      message?: string;
    }>;
  };
}

/**
 * Systemankündigung/Meldung
 */
export interface Announcement {
  /** Eindeutige ID der Ankündigung */
  id: string;
  
  /** Titel der Ankündigung */
  title: string;
  
  /** Inhalt der Ankündigung */
  content: string;
  
  /** Wichtigkeit/Priorität */
  priority: 'low' | 'medium' | 'high' | 'critical';
  
  /** Typ der Ankündigung */
  type: 'info' | 'warning' | 'maintenance' | 'error';
  
  /** Gültigkeit von (ISO-String) */
  validFrom: string;
  
  /** Gültigkeit bis (ISO-String) */
  validTo: string;
}

/**
 * Statistiken zur API-Nutzung
 */
export interface ApiUsageStats {
  /** Gesamtzahl der Anfragen */
  totalRequests: number;
  
  /** Anfragen pro Endpunkt */
  requestsByEndpoint: Record<string, number>;
  
  /** Fehlerrate */
  errorRate: number;
  
  /** Durchschnittliche Antwortzeit in ms */
  avgResponseTime: number;
  
  /** Rate-Limiting-Status */
  rateLimit: {
    /** Limits pro Endpunkt */
    limits: Record<string, {
      /** Maximale Anzahl Anfragen */
      max: number;
      
      /** Zeitraum in Sekunden */
      window: number;
      
      /** Verbleibende Anfragen */
      remaining: number;
      
      /** Zeitpunkt der Reset als ISO-String */
      reset: string;
    }>;
  };
}

/**
 * Feedback-Daten
 */
export interface Feedback {
  /** Eindeutige Feedback-ID */
  id: string;
  
  /** Feedback-Kategorie */
  category: 'bug' | 'feature' | 'performance' | 'other';
  
  /** Feedback-Text */
  content: string;
  
  /** Bewertung (1-5) */
  rating?: number;
  
  /** Zeitpunkt der Erstellung als ISO-String */
  createdAt: string;
  
  /** Benutzer-ID, die das Feedback eingereicht hat */
  userId?: string;
  
  /** Bezieht sich auf (z.B. Session-ID, Dokument-ID) */
  referenceId?: string;
  
  /** Referenztyp */
  referenceType?: 'session' | 'document' | 'feature';
  
  /** Zusätzlicher Kontext */
  context?: Record<string, any>;
  
  /** Ist das Feedback gelöst? */
  resolved?: boolean;
}

// Exportiere alle API-Typen als ApiTypes Namespace
export namespace ApiTypes {
  export type Response<T = any> = ApiResponse<T>;
  export type Error = ApiError;
  export type Paginated<T> = PaginatedResponse<T>;
  export type PaginationParams = PaginationRequest;
  export type Login = LoginRequest;
  export type LoginResult = LoginResponse;
  export type TokenRefresh = TokenRefreshRequest;
  export type TokenRefreshResult = TokenRefreshResponse;
  export type UserInfo = User;
  export type Preferences = UserPreferences;
  export type Session = ChatSession;
  export type Message = ChatMessage;
  export type MessageSource = Source;
  export type CreateSession = CreateSessionRequest;
  export type SendMessage = SendMessageRequest;
  export type StreamEvent = StreamingEvent;
  export type Doc = Document;
  export type UploadDoc = UploadDocumentRequest;
  export type ConvertDoc = ConvertDocumentRequest;
  export type System = SystemInfo;
  export type Announce = Announcement;
  export type Usage = ApiUsageStats;
  export type UserFeedback = Feedback;
}