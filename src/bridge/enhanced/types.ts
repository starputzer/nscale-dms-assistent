/**
 * Typdefinitionen für die verbesserte Bridge-Implementierung
 * 
 * Diese Datei enthält alle Typdefinitionen, die von den verschiedenen
 * Komponenten der Bridge verwendet werden.
 */

/**
 * Log-Level für das Logging-System
 */
export enum LogLevel {
  DEBUG,
  INFO,
  WARN,
  ERROR
}

/**
 * Fehlerzustände der Bridge
 */
export enum BridgeErrorState {
  HEALTHY,            // Bridge funktioniert normal
  DEGRADED_PERFORMANCE, // Bridge funktioniert, aber mit eingeschränkter Performance
  SYNC_ERROR,         // Fehler bei der Zustandssynchronisation
  COMMUNICATION_ERROR, // Fehler bei der Event-Kommunikation
  CRITICAL_FAILURE    // Schwerwiegender Fehler, Bridge ist nicht funktionsfähig
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
  autoRecovery: true
};

/**
 * Update-Operation für die Zustandssynchronisation
 */
export interface UpdateOperation {
  path: string;
  value: any;
  timestamp: number;
  source: 'legacy' | 'vue';
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
  connect(vueStores: Record<string, any>, legacyState: Record<string, any>): void;
  disconnect(): void;
  getState(path: string): any;
  setState(path: string, value: any, source?: 'legacy' | 'vue'): boolean;
  subscribe(path: string, callback: (value: any, oldValue: any) => void): () => void;
  isHealthy(): boolean;
  reset(): void;
  getDiagnostics(): any;
}

/**
 * EventBus-Interface
 */
export interface EventBus {
  emit(eventName: string, data: any): void;
  on(eventName: string, callback: Function, options?: EventOptions): EventSubscription;
  off(eventName: string, subscriptionOrId: EventSubscription | string): void;
  once(eventName: string, callback: Function, options?: Omit<EventOptions, 'once'>): EventSubscription;
  priority(eventName: string, priority: number, callback: Function, options?: Omit<EventOptions, 'priority'>): EventSubscription;
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
  getCurrentSession(): any;
  getAllSessions(): any[];
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
  subscribe(path: string, callback: Function): () => void;
  emit(event: string, data: any): void;
  on(event: string, callback: Function, options?: EventOptions): EventSubscription;
  off(event: string, callbackOrSubscription: Function | EventSubscription): void;
  getStatus(): BridgeStatusInfo;
  getLogs(): any[];
  clearLogs(): void;
  diagnostics(): any;
}