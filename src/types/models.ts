/**
 * Zentrale Typdefinitionen für Datenmodelle
 * 
 * Diese Datei enthält gemeinsame Interfaces für Datenmodelle,
 * die in der gesamten Anwendung verwendet werden.
 */

import type { Dict, Nullable, JSONValue } from './utilities';

/**
 * Basisinterface für alle Entitäten mit einer ID
 */
export interface Entity {
  id: string;
}

/**
 * Basisinterface für alle Entitäten mit Zeitstempeln
 */
export interface TimestampedEntity extends Entity {
  createdAt: string;
  updatedAt: string;
}

/**
 * Basisinterface für benutzerbezogene Entitäten
 */
export interface UserOwnedEntity extends TimestampedEntity {
  userId: string;
}

/**
 * Erweiterte Benutzertypen
 */
export interface UserProfile {
  id: string;
  username: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  preferences?: Dict<any>;
  roles: string[];
  lastLogin?: string;
  isActive: boolean;
  language?: string;
  timezone?: string;
  department?: string;
  position?: string;
  metadata?: Dict<any>;
}

/**
 * Erweiterte Rollentypen
 */
export interface UserRole extends Entity {
  name: string;
  displayName: string;
  description?: string;
  permissions: string[];
  isSystem: boolean;
  order?: number;
  color?: string;
}

/**
 * Erweiterte Sitzungstypen
 */
export interface ChatSession extends UserOwnedEntity {
  title: string;
  isArchived?: boolean;
  isPinned?: boolean;
  tags?: Tag[];
  category?: Category;
  preview?: string;
  messageCount?: number;
  lastMessageAt?: string;
  isShared?: boolean;
  sharedWith?: string[];
  customData?: Dict<any>;
  expiresAt?: string;
  retentionPolicy?: 'default' | 'keep' | 'auto-delete';
  status?: 'active' | 'archived' | 'deleted';
  aiModel?: string;
  viewCount?: number;
}

/**
 * Erweiterte Nachrichtentypen
 */
export interface ChatMessage extends Entity {
  sessionId: string;
  content: string;
  role: 'user' | 'assistant' | 'system' | 'function';
  timestamp: string;
  isStreaming?: boolean;
  status?: 'pending' | 'sent' | 'error' | 'censored';
  editedAt?: string;
  isEdited?: boolean;
  metadata?: ChatMessageMetadata;
  repliedToId?: string;
  attachments?: Attachment[];
  contentType?: 'text' | 'markdown' | 'html' | 'json';
  rating?: 'positive' | 'negative' | null;
  feedback?: string;
}

/**
 * Erweiterte Metadatentypen für Nachrichten
 */
export interface ChatMessageMetadata {
  sourceReferences?: SourceReference[];
  processingTime?: number;
  tokens?: {
    prompt?: number;
    completion?: number;
    total?: number;
  };
  modelName?: string;
  modelVersion?: string;
  completionParams?: Dict<any>;
  renderingOptions?: Dict<any>;
  isComplete?: boolean;
  [key: string]: any;
}

/**
 * Quellreferenzen für Nachrichten
 */
export interface SourceReference extends Entity {
  title: string;
  content: string;
  source: string;
  url?: string;
  relevanceScore?: number;
  pageNumber?: number;
  documentId?: string;
  chunkId?: string;
  highlightRanges?: {start: number, end: number}[];
  retrievalStrategy?: string;
  confidence?: number;
  type?: 'document' | 'database' | 'api' | 'web' | 'knowledge-base';
}

/**
 * Anhänge für Nachrichten
 */
export interface Attachment extends Entity {
  name: string;
  contentType: string;
  size: number;
  url?: string;
  thumbnailUrl?: string;
  metadata?: Dict<any>;
  uploadStatus?: 'pending' | 'uploading' | 'complete' | 'error';
  uploadProgress?: number;
  errorMessage?: string;
}

/**
 * Tags für Klassifizierung
 */
export interface Tag extends Entity {
  name: string;
  color?: string;
  description?: string;
  type?: string;
  order?: number;
  parentId?: string;
  children?: Tag[];
  metadata?: Dict<any>;
}

/**
 * Kategorien für Klassifizierung
 */
export interface Category extends Entity {
  name: string;
  color?: string;
  description?: string;
  parentId?: string;
  children?: Category[];
  metadata?: Dict<any>;
  order?: number;
}

/**
 * Statistiken für Analysen
 */
export interface Statistics {
  sessionCount: number;
  messageCount: number;
  averageMessagesPerSession: number;
  activeUsers: number;
  responseTime: {
    average: number;
    min: number;
    max: number;
  };
  topCategories: Array<{id: string, name: string, count: number}>;
  topTags: Array<{id: string, name: string, count: number}>;
  dailyActivity: Array<{date: string, sessions: number, messages: number}>;
  tokensUsed: {
    prompt: number;
    completion: number;
    total: number;
  };
  userSatisfaction: {
    positive: number;
    negative: number;
    total: number;
  };
}

/**
 * Einstellungen für Benutzer und System
 */
export interface Settings {
  theme: {
    mode: 'light' | 'dark' | 'system';
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    customTheme?: Dict<string>;
  };
  appearance: {
    fontSize: 'small' | 'medium' | 'large' | 'x-large';
    fontFamily?: string;
    lineHeight?: number;
    contentWidth?: 'narrow' | 'medium' | 'wide' | 'full';
    showTimestamps?: boolean;
    showAvatars?: boolean;
    compactMode?: boolean;
  };
  behavior: {
    sendOnEnter?: boolean;
    autoSuggest?: boolean;
    streamResponses?: boolean;
    enterToSend?: boolean;
    autoSaveIntervalMs?: number;
    sessionAutoSave?: boolean;
    retentionPeriodDays?: number;
  };
  notifications: {
    enabled: boolean;
    sound: boolean;
    desktop: boolean;
    email: boolean;
    emailDigest?: 'none' | 'daily' | 'weekly';
  };
  accessibility: {
    highContrast?: boolean;
    reducedMotion?: boolean;
    largeText?: boolean;
    screenReader?: boolean;
    keyboardNavigation?: boolean;
  };
  privacy: {
    saveHistory?: boolean;
    shareAnalytics?: boolean;
    allowCookies?: boolean;
    dataRetentionPeriod?: number;
  };
  language: {
    userInterface?: string;
    content?: string;
    translation?: boolean;
  };
  advanced: {
    apiEndpoint?: string;
    debugMode?: boolean;
    enableExperimental?: boolean;
    maxConnectionRetries?: number;
    connectionTimeoutMs?: number;
    cacheStrategy?: 'memory' | 'local' | 'none';
    cacheTTLMs?: number;
  };
  [key: string]: any;
}

/**
 * Gemeinsame Typen für API-Anfragen und -Antworten
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  offset?: number;
  limit?: number;
}

export interface SortParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterParams {
  [key: string]: any;
}

export interface QueryParams extends PaginationParams, SortParams, FilterParams {}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

/**
 * Error-Typen
 */
export interface ApiError {
  code: string;
  message: string;
  details?: any;
  stack?: string;
  statusCode?: number;
}

/**
 * Event-Typen
 */
export interface AppEvent<T = any> {
  type: string;
  payload?: T;
  timestamp: number;
  source?: string;
}

/**
 * Workflow-Typen
 */
export interface WorkflowStep {
  id: string;
  name: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  error?: string;
  data?: Dict<any>;
  next?: string[];
  previous?: string[];
}

export interface Workflow extends Entity {
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'completed' | 'failed' | 'cancelled';
  steps: WorkflowStep[];
  currentStep?: string;
  startedAt?: string;
  completedAt?: string;
  createdBy: string;
  data?: Dict<any>;
}

/**
 * Feature-Toggle-Typen
 */
export interface FeatureToggle extends Entity {
  name: string;
  description?: string;
  isEnabled: boolean;
  environments?: string[];
  userRoles?: string[];
  userIds?: string[];
  percentage?: number;
  expiresAt?: string;
  conditions?: Dict<any>;
  metadata?: Dict<any>;
}

/**
 * AB-Test-Typen
 */
export interface ABTest extends Entity {
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  variants: ABTestVariant[];
  targetUserPercentage?: number;
  targetUserRoles?: string[];
  targetUserIds?: string[];
  metrics: string[];
  startedAt?: string;
  endedAt?: string;
  winner?: string;
  metadata?: Dict<any>;
}

export interface ABTestVariant extends Entity {
  name: string;
  description?: string;
  weight: number;
  featureToggles?: Dict<boolean>;
  config?: Dict<any>;
  metrics?: Dict<number>;
}

/**
 * Integrationstypen
 */
export interface Integration extends Entity {
  name: string;
  type: string;
  config: Dict<any>;
  status: 'active' | 'disabled' | 'error';
  lastSyncAt?: string;
  errorMessage?: string;
  metadata?: Dict<any>;
}

/**
 * Dokumentkonvertierungstypen
 */
export interface Document extends Entity {
  name: string;
  originalName: string;
  contentType: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
  processingStatus: 'pending' | 'processing' | 'completed' | 'error';
  processingError?: string;
  metadata?: Dict<any>;
  url?: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  extractedText?: string;
  pageCount?: number;
  convertedFormat?: string;
}

/**
 * Re-Export einiger Schlüsseltypen mit alternativen Namen für Abwärtskompatibilität
 */
export type Message = ChatMessage;
export type Session = ChatSession;
export type User = UserProfile;
export type Role = UserRole;
export type Metadata = Dict<JSONValue>;
export type ResourceId = string;
export type MessageRole = 'user' | 'assistant' | 'system' | 'function';
export type MessageStatus = 'pending' | 'sent' | 'error' | 'censored';
export type ThemeMode = 'light' | 'dark' | 'system';
export type EntityStatus = 'active' | 'archived' | 'deleted';
export type MessageRating = 'positive' | 'negative' | null;