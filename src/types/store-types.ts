/**
 * Konsolidierte Store-Typdefinitionen für den nscale DMS Assistenten
 *
 * Diese Datei fasst alle Typ-Interfaces für die verschiedenen Store-Module zusammen
 * und stellt sicher, dass sie konsistent verwendet werden können.
 */

import type {
  ChatSession,
  ChatMessage,
  StreamingStatus,
  SendMessageParams,
  SessionTag,
  SessionCategory,
} from "./session";

import type {
  User,
  UserRole,
  Role,
  LoginCredentials,
  RegisterCredentials,
  Permission,
} from "./auth";

import type {
  Modal,
  Toast,
  ViewMode,
  LayoutConfig,
  NotificationOptions,
  DialogOptions,
  PromptOptions,
} from "./ui";

// Re-export wichtiger Typen für einfachen Import
export * from "./session";
export * from "./auth";
export * from "./ui";

// ====================
// Base Store Interface
// ====================

/**
 * Basisinterface für alle Stores
 * Enthält gemeinsame Eigenschaften und Methoden
 */
export interface IBaseStore<State extends object = {}> {
  /**
   * Store-Versionsnummer für Migrations- und Cache-Zwecke
   */
  readonly version: number;

  /**
   * Store-Status
   */
  readonly isLoading: boolean;
  readonly error: string | null;

  /**
   * Store-Initialisierung
   */
  initialize?(): Promise<void>;

  /**
   * Zustandsobjekt für direkten Zugriff (nur für fortgeschrittene Anwendungsfälle)
   */
  readonly state: Readonly<State>;

  /**
   * Store-ID
   */
  readonly $id: string;
}

// ====================
// Sessions Store
// ====================

/**
 * Zustand des Sessions-Stores
 */
export interface SessionsState {
  sessions: ChatSession[];
  currentSessionId: string | null;
  messages: Record<string, ChatMessage[]>;
  streaming: StreamingStatus;
  isLoading: boolean;
  error: string | null;
  version: number;
  pendingMessages: Record<string, ChatMessage[]>;
  syncStatus: {
    lastSyncTime: number;
    isSyncing: boolean;
    error: string | null;
    pendingSessionIds?: Set<string>;
  };
  availableTags: SessionTag[];
  availableCategories: SessionCategory[];
  selectedSessionIds: string[];
}

/**
 * Interface für den Sessions-Store
 */
export interface ISessionsStore extends IBaseStore<SessionsState> {
  // State Properties
  readonly sessions: ChatSession[];
  readonly currentSessionId: string | null;
  readonly messages: Record<string, ChatMessage[]>;
  readonly streaming: StreamingStatus;
  readonly pendingMessages: Record<string, ChatMessage[]>;
  readonly syncStatus: {
    lastSyncTime: number;
    isSyncing: boolean;
    error: string | null;
    pendingSessionIds?: Set<string>;
  };
  readonly availableTags: SessionTag[];
  readonly availableCategories: SessionCategory[];
  readonly selectedSessionIds: string[];

  // Getters
  readonly currentSession: ChatSession | null;
  readonly currentMessages: ChatMessage[];
  readonly sortedSessions: ChatSession[];
  readonly isStreaming: boolean;
  readonly currentPendingMessages: ChatMessage[];
  readonly allCurrentMessages: ChatMessage[];
  readonly archivedSessions: ChatSession[];
  readonly activeSessions: ChatSession[];

  /**
   * Liefert Sessions mit einem bestimmten Tag zurück
   */
  getSessionsByTag(tagId: string): ChatSession[];

  /**
   * Liefert Sessions mit einer bestimmten Kategorie zurück
   */
  getSessionsByCategory(categoryId: string): ChatSession[];

  // Initialization Actions
  initialize(): Promise<void>;
  synchronizeSessions(): Promise<void>;
  fetchMessages(sessionId: string): Promise<ChatMessage[]>;

  // Session Management Actions
  createSession(title?: string): Promise<string>;
  setCurrentSession(sessionId: string): Promise<void>;
  clearCurrentSession(): void;
  updateSessionTitle(sessionId: string, newTitle?: string): Promise<void>;
  archiveSession(sessionId: string): Promise<void>;
  deleteSession(sessionId: string): Promise<void>;
  togglePinSession(sessionId: string): Promise<void>;

  // Message Actions
  sendMessage(params: SendMessageParams): Promise<void>;
  cancelStreaming(): void;
  deleteMessage(sessionId: string, messageId: string): Promise<void>;
  refreshSession(sessionId: string): Promise<void>;

  // Storage and Sync Actions
  migrateFromLegacyStorage(): void;
  syncPendingMessages(): Promise<void>;
  exportData(): string;
  importData(jsonData: string): boolean;
  cleanupStorage(): void;
  loadOlderMessages(sessionId: string): ChatMessage[];

  // Tagging and Categorization
  addTagToSession(sessionId: string, tagId: string): Promise<void>;
  removeTagFromSession(sessionId: string, tagId: string): Promise<void>;
  setCategoryForSession(sessionId: string, categoryId: string): Promise<void>;
  removeCategoryFromSession(sessionId: string): Promise<void>;
  toggleArchiveSession(sessionId: string, archive?: boolean): Promise<void>;
  updateSessionPreview(
    sessionId: string,
    previewText: string,
    messageCount: number,
  ): void;

  // Selection Operations
  selectSession(sessionId: string): void;
  deselectSession(sessionId: string): void;
  toggleSessionSelection(sessionId: string): void;
  clearSessionSelection(): void;

  // Batch Operations
  archiveMultipleSessions(sessionIds: string[]): Promise<void>;
  deleteMultipleSessions(sessionIds: string[]): Promise<void>;
  addTagToMultipleSessions(sessionIds: string[], tagId: string): Promise<void>;
  setCategoryForMultipleSessions(
    sessionIds: string[],
    categoryId: string,
  ): Promise<void>;
}

// ====================
// Auth Store
// ====================

/**
 * Zustand des Auth-Stores
 */
export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  expiresAt: number | null;
  version: number;
  tokenRefreshInProgress: boolean;
  lastTokenRefresh: number;
}

/**
 * Interface für den Auth-Store
 */
export interface IAuthStore extends IBaseStore<AuthState> {
  // State Properties
  readonly user: User | null;
  readonly token: string | null;
  readonly refreshToken: string | null;
  readonly isAuthenticated: boolean;
  readonly expiresAt: number | null;
  readonly tokenRefreshInProgress: boolean;
  readonly lastTokenRefresh: number;
  readonly permissions: Set<string>;

  // Computed
  readonly isAdmin: boolean;
  readonly userRole: string;
  readonly username: string | null;
  readonly userId: string | null;
  readonly isExpired: boolean;
  readonly tokenExpiresIn: number;
  readonly tokenStatus:
    | "valid"
    | "expiring"
    | "expired"
    | "invalid"
    | "missing";

  // Methods
  login(credentials: LoginCredentials | string): Promise<boolean>;
  register(credentials: RegisterCredentials): Promise<boolean>;
  logout(): Promise<void>;
  refreshTokenIfNeeded(): Promise<boolean>;
  refreshUserInfo(): Promise<boolean>;
  updateUserPreferences(preferences: Record<string, any>): Promise<boolean>;
  hasPermission(permission: string): boolean;
  hasAnyPermission(permissions: string[]): boolean;
  hasRole(role: Role): boolean;
  hasAnyRole(roles: Role[]): boolean;
  checkPermission(permission: string): any;
  validateToken(token: string): boolean;
  validateCurrentToken(): Promise<boolean>;
  createAuthHeaders(): Record<string, string>;
  initialize(): Promise<void>;
  cleanup(): void;
  setToken(token: string): Promise<boolean>;
  setError(error: string | null): void;
  restoreAuthSession(): Promise<boolean>;
  persistAuthData(): void;
  migrateFromLegacyStorage(): void;
  extractPermissionsFromRoles(roles: string[]): void;
  configureHttpClients(token: string | null): void;
  removeHttpInterceptors(): void;
  $reset(): void;
}

// ====================
// UI Store
// ====================

/**
 * Zustand des UI-Stores
 */
export interface UIState {
  sidebar: {
    isOpen: boolean;
    width: number;
    activeTab: string | null;
    collapsed?: boolean;
  };
  darkMode: boolean;
  viewMode: ViewMode;
  activeModals: Modal[];
  toasts: Toast[];
  isLoading: boolean;
  isMobile: boolean;
  layoutConfig: LayoutConfig;
}

/**
 * Interface für den UI-Store
 */
export interface IUIStore extends IBaseStore<UIState> {
  // State Properties
  readonly sidebar: {
    isOpen: boolean;
    width: number;
    activeTab: string | null;
    collapsed?: boolean;
  };
  readonly darkMode: boolean;
  readonly viewMode: ViewMode;
  readonly activeModals: Modal[];
  readonly toasts: Toast[];
  readonly isMobile: boolean;
  readonly layoutConfig: LayoutConfig;

  // Computed
  readonly isDarkMode: boolean;
  readonly isFullscreen: boolean;
  readonly isSidebarOpen: boolean;
  readonly activeView: string;
  readonly settingsVisible: boolean;

  // Dark mode
  toggleDarkMode(): void;
  enableDarkMode(): void;
  disableDarkMode(): void;

  // Layout
  setViewMode(mode: ViewMode): void;
  toggleFullscreen(): void;
  setActiveView(view: string): void;

  // Sidebar
  openSidebar(): void;
  closeSidebar(): void;
  toggleSidebar(): void;
  toggleSidebarCollapse(): void;
  setSidebarWidth(width: number): void;
  setSidebarTab(tabId: string): void;

  // Modals
  openModal(modalData: Omit<Modal, "id">): string;
  closeModal(modalId: string): void;
  closeAllModals(): void;
  toggleSettings(): void;

  // Dialogs
  confirm(message: string, options?: DialogOptions): Promise<boolean>;
  prompt<T = string>(
    message: string,
    options?: PromptOptions<T>,
  ): Promise<T | null>;

  // Toasts
  showToast(toast: Omit<Toast, "id">): string;
  dismissToast(toastId: string): void;
  showSuccess(message: string, options?: Partial<NotificationOptions>): string;
  showError(message: string, options?: Partial<NotificationOptions>): string;
  showWarning(message: string, options?: Partial<NotificationOptions>): string;
  showInfo(message: string, options?: Partial<NotificationOptions>): string;

  // Layout
  setUIDensity(density: "compact" | "comfortable" | "spacious"): void;
  setTextScale(scale: number): void;

  // System
  initialize(): void;
  checkViewport(): void;
  setLoading(loading: boolean, message?: string): void;
  requestUIUpdate(updateType: string): void;
}

// ====================
// Settings Store
// ====================

/**
 * Typen für den Einstellungsstore
 */
export interface ThemeSettings {
  mode: "light" | "dark" | "system";
  primaryColor: string;
  contrastMode: "normal" | "high" | "highest";
  fontSize: number;
  spacing: "compact" | "normal" | "comfortable";
  animations: boolean;
  reduceMotion: boolean;
}

export interface UISettings {
  sidebarOpen: boolean;
  sidebarWidth: number;
  listViewMode: "compact" | "normal" | "detailed";
  showAvatars: boolean;
  showTimestamps: boolean;
  enableCodeHighlighting: boolean;
  enableMarkdown: boolean;
}

export interface ChatSettings {
  streamingEnabled: boolean;
  sendWithCtrlEnter: boolean;
  autoSaveMessages: boolean;
  autoSaveInterval: number;
  keepSessionsFor: number;
  showSources: boolean;
  messageAlignment: "alternate" | "left" | "right";
}

export interface NotificationSettings {
  enabled: boolean;
  sound: boolean;
  desktop: boolean;
  errorNotifications: boolean;
  hideAfter: number;
}

export interface AccessibilitySettings {
  screenReader: boolean;
  highContrast: boolean;
  largeText: boolean;
  tabFocus: boolean;
  reducedMotion: boolean;
}

export interface SettingsState {
  theme: ThemeSettings;
  ui: UISettings;
  chat: ChatSettings;
  notifications: NotificationSettings;
  accessibility: AccessibilitySettings;
  language: string;
  developerMode: boolean;
  version: number;
  lastUpdated: number;
}

/**
 * Interface für den Settings-Store
 */
export interface ISettingsStore extends IBaseStore<SettingsState> {
  // Properties
  readonly theme: ThemeSettings;
  readonly ui: UISettings;
  readonly chat: ChatSettings;
  readonly notifications: NotificationSettings;
  readonly accessibility: AccessibilitySettings;
  readonly language: string;
  readonly developerMode: boolean;
  readonly lastUpdated: number;

  // Convenience accessors
  readonly isDarkMode: boolean;
  readonly isHighContrast: boolean;
  readonly fontSizeLevel: number;
  readonly streamingEnabled: boolean;
  readonly colorMode: string;
  readonly contrastMode: string;

  // Methods
  setSetting<K extends keyof SettingsState>(
    category: K,
    setting: keyof SettingsState[K],
    value: any,
  ): void;

  // Theme settings
  setColorMode(mode: "light" | "dark" | "system"): void;
  setContrastMode(mode: "normal" | "high" | "highest"): void;
  setFontSizeLevel(level: number): void;
  setAnimations(enabled: boolean): void;

  // UI settings
  setSidebarWidth(width: number): void;
  setListViewMode(mode: "compact" | "normal" | "detailed"): void;

  // Chat settings
  setStreamingEnabled(enabled: boolean): void;
  setSendWithCtrlEnter(enabled: boolean): void;

  // Global settings
  setLanguage(lang: string): void;
  setDeveloperMode(enabled: boolean): void;

  // Reset
  resetToDefaults(): void;
  resetCategory<K extends keyof SettingsState>(category: K): void;

  // Import/Export
  exportSettings(): string;
  importSettings(json: string): boolean;

  // Initialize
  loadSettings(): void;
  saveSettings(): void;
}

// ====================
// Store Factory Types
// ====================

/**
 * Generischer Typ für Store-Factory-Funktionen
 */
export type StoreFactory<T extends IBaseStore> = () => T;

// Store-Factory-Funktionen
export type UseAuthStore = StoreFactory<IAuthStore>;
export type UseSessionsStore = StoreFactory<ISessionsStore>;
export type UseUIStore = StoreFactory<IUIStore>;
export type UseSettingsStore = StoreFactory<ISettingsStore>;

// Store-Factory-Funktions-Signaturen
export interface StoreFactories {
  useAuthStore: UseAuthStore;
  useSessionsStore: UseSessionsStore;
  useUIStore: UseUIStore;
  useSettingsStore: UseSettingsStore;
}

// ====================
// Mock Store Helpers
// ====================

/**
 * Typhelfer für Mock-Store-Erstellung
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type MockStoreOptions<T extends IBaseStore> = DeepPartial<T>;

export function createMockStore<T extends IBaseStore>(
  baseStore: T,
  options?: MockStoreOptions<T>,
): T {
  return { ...baseStore, ...(options as any) };
}
