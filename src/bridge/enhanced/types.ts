/**
 * Typdefinitionen für die verbesserte Bridge-Implementierung
 *
 * Diese Datei enthält alle Typdefinitionen, die von den verschiedenen
 * Komponenten der Bridge verwendet werden.
 */

// Minimal versions of the type definitions we need
export interface SimpleChatSession {
  id: string;
  title: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface SimpleChatMessage {
  id: string;
  sessionId: string;
  content: string;
  role: string;
  timestamp: string | number;
  [key: string]: any;
}

export type ChatSession = SimpleChatSession;
export type ChatMessage = SimpleChatMessage;

// Simplified store interfaces
export interface IAuthStore {
  isAuthenticated: boolean;
  token: string | null;
  user: any | null;
  [key: string]: any;
}

export interface ISessionsStore {
  sessions: ChatSession[];
  currentSessionId: string | null;
  messages: Record<string, ChatMessage[]>;
  [key: string]: any;
}

export interface IUIStore {
  darkMode: boolean;
  sidebar: { isOpen: boolean };
  [key: string]: any;
}

export interface IFeatureTogglesStore {
  features: Record<string, boolean>;
  [key: string]: any;
}

/**
 * Log-Level für das Logging-System
 */
export enum LogLevel {
  DEBUG,
  INFO,
  WARN,
  ERROR,
}

/**
 * Fehlerzustände der Bridge
 */
export enum BridgeErrorState {
  HEALTHY, // Bridge funktioniert normal
  DEGRADED_PERFORMANCE, // Bridge funktioniert, aber mit eingeschränkter Performance
  SYNC_ERROR, // Fehler bei der Zustandssynchronisation
  COMMUNICATION_ERROR, // Fehler bei der Event-Kommunikation
  CRITICAL_FAILURE, // Schwerwiegender Fehler, Bridge ist nicht funktionsfähig
}

/**
 * Informationen zum aktuellen Status der Bridge
 */
export interface BridgeStatusInfo {
  state: BridgeErrorState;
  message: string;
  timestamp: Date;
  affectedComponents: string[];
  recoveryAttempts: number;
}

/**
 * Konfiguration für die Bridge
 */
export interface BridgeConfiguration {
  debugging: boolean;
  logLevel: LogLevel;
  batchInterval: number;
  deepWatchEnabled: boolean;
  healthCheckInterval: number;
  autoRecovery: boolean;
}

/**
 * Standard-Konfiguration für die Bridge
 */
export const DEFAULT_BRIDGE_CONFIG: BridgeConfiguration = {
  debugging: false,
  logLevel: LogLevel.INFO,
  batchInterval: 50,
  deepWatchEnabled: true,
  healthCheckInterval: 30000,
  autoRecovery: true,
};

/**
 * Update-Operation für die Zustandssynchronisation
 */
export interface UpdateOperation {
  path: string;
  value: any;
  timestamp: number;
  source: "legacy" | "vue";
}

/**
 * Optionen für Event-Listener
 */
export interface EventOptions {
  once?: boolean;
  priority?: number;
  timeout?: number;
}

/**
 * Event-Subscription-Interface
 */
export interface EventSubscription {
  unsubscribe(): void;
}

/**
 * StateManager-Interface
 */
export interface StateManager {
  connect(
    vueStores: Record<string, any>,
    legacyState: Record<string, any>,
  ): void;
  disconnect(): void;
  getState(path: string): any;
  setState(path: string, value: any, source?: "legacy" | "vue"): boolean;
  subscribe(
    path: string,
    callback: (value: any, oldValue: any) => void,
  ): () => void;
  isHealthy(): boolean;
  reset(): void;
  getDiagnostics(): any;
}

/**
 * EventBus-Interface
 */
export interface EventBus {
  /**
   * Emits an event with data
   * @param eventName Name of the event to emit
   * @param data Data to pass to listeners
   */
  emit(eventName: string, data: any): void;
  /**
   * Emits an event without data (for compatibility with existing code)
   * @param eventName Name of the event to emit
   */
  emit(eventName: string): void;
  on(
    eventName: string,
    callback: EventCallback | UnsubscribeFn,
    options?: EventOptions,
  ): EventSubscription;
  off(eventName: string, subscriptionOrId: EventSubscription | string): void;
  once(
    eventName: string,
    callback: EventCallback | UnsubscribeFn,
    options?: Omit<EventOptions, "once">,
  ): EventSubscription;
  priority(
    eventName: string,
    priority: number,
    callback: EventCallback | UnsubscribeFn,
    options?: Omit<EventOptions, "priority">,
  ): EventSubscription;
  clear(): void;
  isOperational(): boolean;
  reset(): void;
  getDiagnostics(): any;
}

/**
 * BridgeLogger-Interface
 */
export interface BridgeLogger {
  setLevel(level: LogLevel): void;
  debug(message: string, data?: any): void;
  info(message: string, data?: any): void;
  warn(message: string, data?: any): void;
  error(message: string, data?: any): void;
  getLogs(level?: LogLevel): any[];
  clearLogs(): void;
}

/**
 * SelfHealingBridge-Interface
 */
export interface SelfHealing {
  addHealthCheck(check: () => boolean): void;
  addRecoveryStrategy(strategy: () => Promise<boolean>): void;
  performHealthCheck(): Promise<boolean>;
}

/**
 * Auth-Store-Bridge-Interface
 */
export interface AuthBridgeAPI {
  login(email: string, password: string): Promise<boolean>;
  logout(): void;
  getToken(): string | null;
  isAuthenticated(): boolean;
  getUser(): any;
  hasRole(role: string): boolean;
}

/**
 * Session-Store-Bridge-Interface
 */
export interface SessionBridgeAPI {
  createSession(title?: string): Promise<string>;
  loadSession(sessionId: string): Promise<boolean>;
  deleteSession(sessionId: string): Promise<boolean>;
  sendMessage(sessionId: string, content: string): Promise<void>;
  getCurrentSession(): ChatSession | null;
  getAllSessions(): ChatSession[];
}

/**
 * UI-Store-Bridge-Interface
 */
export interface UIBridgeAPI {
  showToast(message: string, type?: string): void;
  openModal(options: any): string;
  closeModal(id: string): void;
  toggleDarkMode(): void;
  isDarkMode(): boolean;
}

/**
 * Feature-Toggle-Bridge-Interface
 */
export interface FeatureToggleBridgeAPI {
  isEnabled(featureName: string): boolean;
  enable(featureName: string): void;
  disable(featureName: string): void;
  toggle(featureName: string): boolean;
  getAllFeatures(): Record<string, boolean>;
}

/**
 * Vollständige Bridge-API
 */
export interface BridgeAPI {
  auth: AuthBridgeAPI;
  sessions: SessionBridgeAPI;
  ui: UIBridgeAPI;
  features: FeatureToggleBridgeAPI;
  getState(path: string): any;
  setState(path: string, value: any): boolean;
  subscribe(path: string, callback: EventCallback | UnsubscribeFn): () => void;
  /**
   * Emits an event with data
   * @param event Name of the event to emit
   * @param data Data to pass to listeners
   */
  emit(event: string, data: any): void;
  /**
   * Emits an event without data (for compatibility with existing code)
   * @param event Name of the event to emit
   */
  emit(event: string): void;
  on(
    event: string,
    callback: EventCallback | UnsubscribeFn,
    options?: EventOptions,
  ): EventSubscription;
  off(
    event: string,
    callbackOrSubscription: EventCallback | UnsubscribeFn | EventSubscription,
  ): void;
  /**
   * Logs a message with specified log level
   * @param level Log level severity
   * @param message Message to log
   * @param data Additional data to log (optional)
   */
  log(level: LogLevel, message: string, data?: any): void;
  /**
   * Logs a debug message
   * @param message Debug message
   * @param data Additional data (optional)
   */
  log(message: string, data?: any): void;
  getStatus(): BridgeStatusInfo;
  getLogs(): any[];
  clearLogs(): void;
  diagnostics(): any;
}

/**
 * Interface für die Store-Verbinder-Map
 */
export interface StoreConnectorMap {
  auth: IAuthStore;
  sessions: ISessionsStore;
  ui: IUIStore;
  features: IFeatureTogglesStore;
}

/**
 * Legacy-State-Struktur
 */
export interface LegacyState {
  auth: {
    user: any | null;
    token: string | null;
    isAuthenticated: boolean;
  };
  sessions: {
    list: ChatSession[];
    currentId: string | null;
    messages: Record<string, ChatMessage[]>;
  };
  ui: {
    darkMode: boolean;
    sidebar: {
      isOpen: boolean;
      collapsed: boolean;
    };
    toasts: Array<any>;
    modals: Array<any>;
  };
  features: {
    toggles: Record<string, boolean>;
  };
}
