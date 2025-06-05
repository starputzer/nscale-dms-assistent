/**
 * Gemeinsame Typdefinitionen für Store-Implementierungen
 * Diese Interfaces stellen sicher, dass die Standard- und optimierten Store-Versionen
 * konsistente APIs haben und kompatibel sind.
 */

import type {
  ChatSession,
  ChatMessage,
  StreamingStatus,
  SendMessageParams,
  SessionTag,
  SessionCategory,
} from "./session";
import type { Store } from "pinia";
import type { Ref, ComputedRef } from "vue";

// Re-export aus Vue um gemeinsame Typdefinitionen zu haben
export type { Ref, ComputedRef } from "vue";

/**
 * Type for event callback functions
 */
export type EventCallback = (mutation: any, state: any) => void;

/**
 * Type for unsubscribe functions
 */
export type UnsubscribeFn = () => void;

/**
 * Basis-Interface für alle Stores
 * Definiert gemeinsame Methoden, die jeder Store haben sollte
 */
export interface IBaseStore {
  // Actions, die alle Stores implementieren sollten
  initialize?(): Promise<void | (() => void)>;
  reset?(): void;
  $dispose?(): void;
  $patch?(partialStateOrMutator: any): void;
  $subscribe?(callback: EventCallback, options?: any): UnsubscribeFn;
}

/**
 * Interface für den Auth-Store
 */
export interface IAuthStore extends IBaseStore {
  // State
  isAuthenticated: boolean;
  token: string | null;
  user: any | null;
  loading: boolean;
  error: string | null;

  // Getters
  isAdmin: boolean;
  userRoles: string[];

  // Actions
  login(credentials: { email: string; password: string }): Promise<boolean>;
  logout(): Promise<void>;
  refreshToken(): Promise<boolean>;
  refreshTokenIfNeeded(): Promise<boolean>;
  validateToken(): Promise<boolean>;
  hasRole(role: string): boolean;
  hasAnyRole(roles: string[]): boolean;
  createAuthHeaders(): Record<string, string>;
}

/**
 * Interface für den Sessions-Store
 * Definiert die Struktur und öffentliche API, die sowohl vom Standard als auch vom
 * optimierten Store implementiert werden muss.
 */
export interface ISessionsStore extends IBaseStore {
  // State Properties
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
    pendingSessionIds?: Set<string>; // Optional für Standard-Implementierung
  };
  availableTags: SessionTag[];
  availableCategories: SessionCategory[];
  selectedSessionIds: string[];

  // Getters
  currentSession: ChatSession | null;
  currentMessages: ChatMessage[];
  sortedSessions: ChatSession[];
  isStreaming: boolean;
  currentPendingMessages: ChatMessage[];
  allCurrentMessages: ChatMessage[];
  getSessionsByTag: (tagId: string) => ChatSession[];
  getSessionsByCategory: (categoryId: string) => ChatSession[];
  archivedSessions: ChatSession[];
  activeSessions: ChatSession[];

  // Initialization Actions
  initialize(): Promise<void | (() => void)>;
  synchronizeSessions(): Promise<void>;
  fetchMessages(sessionId: string): Promise<ChatMessage[]>;

  // Session Management Actions
  createSession(title?: string): Promise<string>;
  setCurrentSession(sessionId: string): Promise<void>;
  updateSessionTitle(sessionId: string, newTitle: string): Promise<void>;
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

  // Streaming und Nachrichten-Management
  updateStreamedMessage?(message: ChatMessage): void;

  // Optimized Store Specific (Optional)
  resetGetterCache?(): void;
}

/**
 * Interface für den UI-Store
 */
export interface IUIStore extends IBaseStore {
  // State
  darkMode: boolean;
  sidebar: {
    isOpen: boolean;
    collapsed: boolean;
    activeTab: string;
  };
  toast: {
    messages: any[];
    maxToasts: number;
  };
  modals: {
    items: any[];
    currentModalId: string | null;
  };
  viewMode: string;
  loading: {
    isActive: boolean;
    message: string;
  };

  // Getters
  isDarkMode: boolean;
  isSidebarOpen: boolean;
  isSidebarCollapsed: boolean;
  currentToasts: any[];
  currentModal: any | null;

  // Actions
  toggleDarkMode(): void;
  openSidebar(): void;
  closeSidebar(): void;
  toggleSidebar(): void;
  toggleSidebarCollapse(): void;
  setSidebarTab(tabId: string): void;
  showToast(toast: {
    type: string;
    message: string;
    duration?: number;
  }): string;
  clearToasts(): void;
  dismissToast(id: string): void;
  showSuccess(message: string, options?: any): string;
  showError(message: string, options?: any): string;
  showWarning(message: string, options?: any): string;
  showInfo(message: string, options?: any): string;
  openModal(options: any): string;
  closeModal(modalId: string): void;
  closeAllModals(): void;
  confirm(message: string, options?: any): Promise<boolean>;
  setLoading(active: boolean, message?: string): void;
  setViewMode(mode: string): void;
}

/**
 * Interface für den Settings-Store
 */
export interface ISettingsStore extends IBaseStore {
  // State
  theme: {
    currentTheme: string;
    availableThemes: any[];
  };
  font: {
    size: string;
    family: string;
    lineHeight: number;
  };
  a11y: {
    reduceMotion: boolean;
    highContrast: boolean;
    largeText: boolean;
    screenReader: boolean;
  };
  messages: {
    renderMarkdown: boolean;
    codeHighlighting: boolean;
    showTimestamps: boolean;
  };
  chat: {
    autoSubmit: boolean;
    clearInputAfterSubmit: boolean;
    enableStreamedResponse: boolean;
  };
  notifications: {
    enabled: boolean;
    sound: boolean;
    desktop: boolean;
  };

  // Getters
  currentTheme: any;
  fontSize: number;

  // Actions
  setTheme(themeId: string): void;
  updateFontSettings(settings: Partial<any>): void;
  updateA11ySettings(settings: Partial<any>): void;
  updateMessageSettings(settings: Partial<any>): void;
  updateChatSettings(settings: Partial<any>): void;
  updateNotificationSettings(settings: Partial<any>): void;
  getSetting(key: string): any;
  setSetting(key: string, value: any): void;
  resetToDefault(): void;
  setFontSize(size: number): void;
}

/**
 * Interface für den Feature-Toggles-Store
 */
export interface IFeatureTogglesStore extends IBaseStore {
  // State
  features: Record<string, boolean>;

  // Getters
  isEnabled(featureName: string): boolean;

  // Actions
  enableFeature(featureName: string): void;
  disableFeature(featureName: string): void;
  toggleFeature(featureName: string): boolean;
  enableLegacyMode(): void;
  disableLegacyMode(): void;
  enableMigratedMode(): void;
  isMigrated(): boolean;
}

/**
 * Interface für den AB-Tests-Store
 */
export interface IABTestsStore extends IBaseStore {
  // State
  activeTests: Record<string, string>;
  testDefinitions: Record<string, any>;

  // Getters
  isVariantActive(testId: string, variantId: string): boolean;
  getActiveVariant(testId: string): string | null;

  // Actions
  setVariant(testId: string, variantId: string): void;
  resetTest(testId: string): void;
  randomizeVariant(testId: string): string;
  recordEvent(testId: string, eventName: string, data?: any): void;
}

/**
 * Interface für den Store-Rückgabewert mit Refs
 * Dies definiert, was vom Store-Hook zurückgegeben wird
 */
export interface SessionsStoreReturn {
  // State Properties as Refs
  sessions: Ref<ChatSession[]>;
  currentSessionId: Ref<string | null>;
  messages: Ref<Record<string, ChatMessage[]>>;
  streaming: Ref<StreamingStatus>;
  isLoading: Ref<boolean>;
  error: Ref<string | null>;
  version: Ref<number>;
  pendingMessages: Ref<Record<string, ChatMessage[]>>;
  syncStatus: Ref<{
    lastSyncTime: number;
    isSyncing: boolean;
    error: string | null;
    pendingSessionIds?: Set<string>;
  }>;
  availableTags: Ref<SessionTag[]>;
  availableCategories: Ref<SessionCategory[]>;
  selectedSessionIds: Ref<string[]>;

  // Getters as ComputedRefs
  currentSession: ComputedRef<ChatSession | null>;
  currentMessages: ComputedRef<ChatMessage[]>;
  sortedSessions: ComputedRef<ChatSession[]>;
  isStreaming: ComputedRef<boolean>;
  currentPendingMessages: ComputedRef<ChatMessage[]>;
  allCurrentMessages: ComputedRef<ChatMessage[]>;
  getSessionsByTag: ComputedRef<(tagId: string) => ChatSession[]>;
  getSessionsByCategory: ComputedRef<(categoryId: string) => ChatSession[]>;
  archivedSessions: ComputedRef<ChatSession[]>;
  activeSessions: ComputedRef<ChatSession[]>;

  // Actions (same as ISessionsStore)
  initialize(): Promise<void | (() => void)>;
  synchronizeSessions(): Promise<void>;
  fetchMessages(sessionId: string): Promise<ChatMessage[]>;
  createSession(title?: string): Promise<string>;
  setCurrentSession(sessionId: string): Promise<void>;
  updateSessionTitle(sessionId: string, newTitle: string): Promise<void>;
  archiveSession(sessionId: string): Promise<void>;
  deleteSession(sessionId: string): Promise<void>;
  togglePinSession(sessionId: string): Promise<void>;
  sendMessage(params: SendMessageParams): Promise<void>;
  cancelStreaming(): void;
  deleteMessage(sessionId: string, messageId: string): Promise<void>;
  refreshSession(sessionId: string): Promise<void>;
  migrateFromLegacyStorage(): void;
  syncPendingMessages(): Promise<void>;
  exportData(): string;
  importData(jsonData: string): boolean;
  cleanupStorage(): void;
  loadOlderMessages(sessionId: string): ChatMessage[];
  addTagToSession(sessionId: string, tagId: string): Promise<void>;
  removeTagFromSession(sessionId: string, tagId: string): Promise<void>;
  setCategoryForSession(sessionId: string, categoryId: string): Promise<void>;
  removeCategoryFromSession(sessionId: string): Promise<void>;
  toggleArchiveSession(sessionId: string, archive?: boolean): Promise<void>;
  updateSessionPreview(
    sessionId: string,
    previewText: string,
    messageCount: number
  ): void;
  selectSession(sessionId: string): void;
  deselectSession(sessionId: string): void;
  toggleSessionSelection(sessionId: string): void;
  clearSessionSelection(): void;
  archiveMultipleSessions(sessionIds: string[]): Promise<void>;
  deleteMultipleSessions(sessionIds: string[]): Promise<void>;
  addTagToMultipleSessions(sessionIds: string[], tagId: string): Promise<void>;
  setCategoryForMultipleSessions(
    sessionIds: string[],
    categoryId: string
  ): Promise<void>;
}

export interface AuthStoreReturn extends IAuthStore {
  // Spezifische Methoden für den Auth-Store
}

export interface UIStoreReturn extends IUIStore {
  // Spezifische Methoden für den UI-Store
}

export interface SettingsStoreReturn extends ISettingsStore {
  // Spezifische Methoden für den Settings-Store
}

export interface FeatureTogglesStoreReturn extends IFeatureTogglesStore {
  // Spezifische Methoden für den FeatureToggles-Store
}

export interface ABTestsStoreReturn extends IABTestsStore {
  // Spezifische Methoden für den ABTests-Store
}

/**
 * Typendefinition für den optimierten Sessions-Store mit Readonly-Eigenschaften
 */
export interface OptimizedSessionsStore
  extends Omit<
    ISessionsStore,
    | "sessions"
    | "messages"
    | "pendingMessages"
    | "availableTags"
    | "availableCategories"
  > {
  // Readonly-Versionen der Eigenschaften für den optimierten Store
  sessions: Readonly<ChatSession[]>;
  messages: Readonly<Record<string, ChatMessage[]>>;
  pendingMessages: Readonly<Record<string, ChatMessage[]>>;
  availableTags: Readonly<SessionTag[]>;
  availableCategories: Readonly<SessionTag[]>;

  // Spezifische optimierte Store-Methoden
  resetGetterCache(): void;
}

/**
 * Interface für das Ergebnis des optimierten Store-Hooks
 */
export interface OptimizedSessionsStoreReturn extends OptimizedSessionsStore {
  // Spezifische Methoden für den optimierten Store
}

/**
 * Generischer Store-Typ für Pinia
 */
export type PiniaStore<T extends string, S, G, A> = Store<T, S, G, A>;


export interface IDocumentConverterStore {
  [key: string]: any;
}
