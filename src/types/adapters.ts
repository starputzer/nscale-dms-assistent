/**
 * Typdefinitionen für Adapter-Schichten
 * 
 * Diese Datei definiert Typen für Adapter-Klassen und Interfaces,
 * welche die Kommunikation zwischen verschiedenen Teilen der Anwendung,
 * insbesondere zwischen neuen Vue3/TypeScript-Komponenten und 
 * Legacy-Code koordinieren.
 */

import type { ApiResponse, ApiError } from './api';
import type { IAuthStore, ISessionsStore, IUIStore, ISettingsStore } from './store-types';
import type { ChatMessage, ChatSession, User } from './models';

/**
 * Grundlegende Adapter-Schnittstelle für alle Adapter
 */
export interface IAdapter<
  NewAPI, 
  LegacyAPI, 
  AdapterOptions = Record<string, any>
> {
  /**
   * Adapter-Optionen
   */
  readonly options: AdapterOptions;
  
  /**
   * Initialisiert den Adapter
   */
  initialize(): Promise<void>;
  
  /**
   * Konvertiert von Legacy- zu neuem API-Format
   */
  fromLegacy<T extends keyof NewAPI, U extends keyof LegacyAPI>(
    legacyData: LegacyAPI[U], 
    targetType: T
  ): NewAPI[T];
  
  /**
   * Konvertiert von neuem zu Legacy-API-Format
   */
  toLegacy<T extends keyof NewAPI, U extends keyof LegacyAPI>(
    newData: NewAPI[T],
    targetType: U
  ): LegacyAPI[U];
  
  /**
   * Bereinigt Ressourcen und Event-Listener
   */
  dispose(): void;
}

/**
 * Optionen für den API-Adapter
 */
export interface ApiAdapterOptions {
  /** Aktiviert Entwicklungslogs */
  debug?: boolean;
  /** Maximale Anzahl von Elementen im Cache */
  maxCacheItems?: number;
  /** Cache-Lebensdauer in Millisekunden */
  cacheTtl?: number;
  /** Automatische Konvertierung aktivieren */
  autoConvert?: boolean;
  /** Fehlerbehandlungsstrategie */
  errorHandling?: 'throw' | 'log' | 'silent';
}

/**
 * API-Adapter für Legacy-API
 */
export interface IApiAdapter<
  NewAPIFormat, 
  LegacyAPIFormat
> extends IAdapter<NewAPIFormat, LegacyAPIFormat, ApiAdapterOptions> {
  /**
   * Sendet eine Anfrage über die Legacy-API
   */
  sendLegacyRequest<T extends keyof LegacyAPIFormat>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    data?: any
  ): Promise<ApiResponse<LegacyAPIFormat[T]>>;
  
  /**
   * Sendet eine Anfrage über die neue API
   */
  sendRequest<T extends keyof NewAPIFormat>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    data?: any
  ): Promise<ApiResponse<NewAPIFormat[T]>>;
  
  /**
   * Wandelt einen Legacy-API-Fehler in ein standardisiertes Fehlerformat um
   */
  convertError(error: any): ApiError;
  
  /**
   * Löscht den Cache für einen bestimmten Endpunkt
   */
  invalidateCache(endpoint: string): void;
  
  /**
   * Löscht den gesamten Cache
   */
  clearCache(): void;
}

/**
 * Store-Adapter-Optionen
 */
export interface StoreAdapterOptions {
  /** Synchronisierung in Echtzeit aktivieren */
  liveSync?: boolean;
  /** Intervall für periodische Synchronisierung in Millisekunden */
  syncInterval?: number;
  /** Synchronisierungsstrategie */
  syncStrategy?: 'full' | 'differential' | 'snapshot';
  /** Nur lesender Zugriff */
  readOnly?: boolean;
}

/**
 * Interface für den Store-Adapter
 */
export interface IStoreAdapter<
  StoreType, 
  LegacyStoreType
> extends IAdapter<StoreType, LegacyStoreType, StoreAdapterOptions> {
  /**
   * Liefert den Store
   */
  getStore(): StoreType;
  
  /**
   * Liefert den Legacy-Store
   */
  getLegacyStore(): LegacyStoreType;
  
  /**
   * Synchronisiert die Daten vom Legacy-Store zum neuen Store
   */
  syncFromLegacy(): Promise<void>;
  
  /**
   * Synchronisiert die Daten vom neuen Store zum Legacy-Store
   */
  syncToLegacy(): Promise<void>;
  
  /**
   * Startet die automatische Synchronisierung
   */
  startAutoSync(intervalMs?: number): void;
  
  /**
   * Stoppt die automatische Synchronisierung
   */
  stopAutoSync(): void;
}

/**
 * Chat-Session-Adapter
 */
export interface IChatSessionAdapter extends IStoreAdapter<ISessionsStore, any> {
  /**
   * Konvertiert eine Legacy-Session in eine typisierte Session
   */
  convertSession(legacySession: any): ChatSession;
  
  /**
   * Konvertiert eine Legacy-Nachricht in eine typisierte Nachricht
   */
  convertMessage(legacyMessage: any): ChatMessage;
  
  /**
   * Konvertiert eine typisierte Session in das Legacy-Format
   */
  convertSessionToLegacy(session: ChatSession): any;
  
  /**
   * Konvertiert eine typisierte Nachricht in das Legacy-Format
   */
  convertMessageToLegacy(message: ChatMessage): any;
  
  /**
   * Sendet eine Nachricht mit Unterstützung für beide APIs
   */
  sendMessage(sessionId: string, content: string, options?: any): Promise<ChatMessage>;
  
  /**
   * Ruft Sitzungen ab und konvertiert sie in das richtige Format
   */
  fetchSessions(): Promise<ChatSession[]>;
  
  /**
   * Ruft Nachrichten für eine Sitzung ab und konvertiert sie
   */
  fetchMessages(sessionId: string): Promise<ChatMessage[]>;
}

/**
 * Auth-Adapter
 */
export interface IAuthAdapter extends IStoreAdapter<IAuthStore, any> {
  /**
   * Konvertiert einen Legacy-Benutzer in einen typisierten Benutzer
   */
  convertUser(legacyUser: any): User;
  
  /**
   * Konvertiert einen typisierten Benutzer in das Legacy-Format
   */
  convertUserToLegacy(user: User): any;
  
  /**
   * Führt die Anmeldung mit Unterstützung für beide APIs durch
   */
  login(username: string, password: string): Promise<User>;
  
  /**
   * Führt die Abmeldung mit Unterstützung für beide APIs durch
   */
  logout(): Promise<void>;
  
  /**
   * Überprüft, ob der Benutzer angemeldet ist (in beiden Systemen)
   */
  isAuthenticated(): boolean;
  
  /**
   * Synchronisiert den Authentifizierungsstatus zwischen den Systemen
   */
  syncAuthState(): Promise<void>;
}

/**
 * UI-Adapter
 */
export interface IUIAdapter extends IStoreAdapter<IUIStore, any> {
  /**
   * Zeigt eine Toast-Benachrichtigung in beiden Systemen an
   */
  showToast(message: string, type?: 'info' | 'success' | 'warning' | 'error', options?: any): void;
  
  /**
   * Zeigt einen Dialog in beiden Systemen an
   */
  showDialog(options: {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'info' | 'warning' | 'error' | 'confirm';
  }): Promise<boolean>;
  
  /**
   * Zeigt eine Eingabeaufforderung in beiden Systemen an
   */
  showPrompt(message: string, defaultValue?: string): Promise<string | null>;
  
  /**
   * Synchronisiert den UI-Zustand zwischen den Systemen
   */
  syncUIState(): Promise<void>;
  
  /**
   * Aktualisiert das Theme in beiden Systemen
   */
  updateTheme(isDark: boolean): void;
}

/**
 * Einstellungsadapter
 */
export interface ISettingsAdapter extends IStoreAdapter<ISettingsStore, any> {
  /**
   * Konvertiert Legacy-Einstellungen in typisierte Einstellungen
   */
  convertSettings(legacySettings: any): any;
  
  /**
   * Konvertiert typisierte Einstellungen in das Legacy-Format
   */
  convertSettingsToLegacy(settings: any): any;
  
  /**
   * Speichert Einstellungen in beiden Systemen
   */
  saveSettings(settings: any): Promise<void>;
  
  /**
   * Lädt Einstellungen aus beiden Systemen
   */
  loadSettings(): Promise<any>;
  
  /**
   * Synchronisiert Einstellungen zwischen den Systemen
   */
  syncSettings(): Promise<void>;
}

/**
 * Factory-Funktion für Chat-Session-Adapter
 */
export type ChatSessionAdapterFactory = () => IChatSessionAdapter;

/**
 * Factory-Funktion für Auth-Adapter
 */
export type AuthAdapterFactory = () => IAuthAdapter;

/**
 * Factory-Funktion für UI-Adapter
 */
export type UIAdapterFactory = () => IUIAdapter;

/**
 * Factory-Funktion für Einstellungsadapter
 */
export type SettingsAdapterFactory = () => ISettingsAdapter;