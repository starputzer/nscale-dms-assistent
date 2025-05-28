/**
 * Event-bezogene Utility-Typen
 *
 * Diese Datei enthält spezifische Utility-Typen für das Event-System der Anwendung,
 * einschließlich Event-Typdefinitionen, Listener und Bus-Interfaces.
 */

import { TypedEventEmitter } from "./types";

/**
 * EventPayload - Basis-Interface für Event-Daten
 * Alle Event-Payloads sollten dieses Interface erweitern
 */
export interface EventPayload {
  readonly timestamp?: number;
}

/**
 * EventMap - Typ-Map für alle Anwendungsevents
 * Verwendet als zentrale Definition aller Event-Namen und ihrer zugehörigen Payload-Typen
 */
export interface EventMap {
  // Basis-System-Events
  "system:initialized": EventPayload;
  "system:error": ErrorEvent;
  "system:warning": WarningEvent;
  "system:info": InfoEvent;

  // Authentifizierungsevents
  "auth:login": AuthEvent;
  "auth:logout": EventPayload;
  "auth:sessionExpired": EventPayload;

  // Session-bezogene Events
  "session:created": SessionEvent;
  "session:selected": SessionEvent;
  "session:updated": SessionUpdateEvent;
  "session:archived": SessionEvent;
  "session:deleted": SessionEvent;

  // Nachrichten-Events
  "message:sent": MessageEvent;
  "message:received": MessageEvent;
  "message:updated": MessageUpdateEvent;
  "message:deleted": MessageDeleteEvent;
  "message:streaming": StreamingEvent;

  // UI-Events
  "ui:themeChanged": ThemeEvent;
  "ui:layoutChanged": LayoutEvent;
  "ui:viewportChanged": ViewportEvent;
  "ui:dialogOpened": DialogEvent;
  "ui:dialogClosed": DialogEvent;
  "ui:notification": NotificationEvent;

  // Dokumentenkonverter-Events
  "document:uploading": DocumentEvent;
  "document:uploaded": DocumentEvent;
  "document:processing": DocumentProcessingEvent;
  "document:processed": DocumentEvent;
  "document:error": DocumentErrorEvent;

  // Netzwerk-Events
  "network:online": EventPayload;
  "network:offline": EventPayload;
  "network:slow": NetworkPerformanceEvent;

  // Leistungs-Events
  "performance:measure": PerformanceEvent;
  "performance:slowOperation": PerformanceEvent;

  // Telemetrie- und Analyse-Events
  "telemetry:event": TelemetryEvent;
  "analytics:pageView": AnalyticsEvent;
  "analytics:action": AnalyticsActionEvent;

  // Erweiterbar für benutzerdefinierte Events
  [key: `custom:${string}`]: EventPayload;
}

// Spezifische Event-Payloads

/**
 * Fehler-Event-Payload
 */
export interface ErrorEvent extends EventPayload {
  code: string;
  message: string;
  details?: any;
  stack?: string;
  source?: string;
}

/**
 * Warnungs-Event-Payload
 */
export interface WarningEvent extends EventPayload {
  code: string;
  message: string;
  details?: any;
  source?: string;
}

/**
 * Info-Event-Payload
 */
export interface InfoEvent extends EventPayload {
  message: string;
  details?: any;
  source?: string;
}

/**
 * Authentifizierungs-Event-Payload
 */
export interface AuthEvent extends EventPayload {
  success: boolean;
  user?: {
    id: string;
    name: string;
    roles: string[];
    [key: string]: any;
  };
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Session-Event-Payload
 */
export interface SessionEvent extends EventPayload {
  sessionId: string;
  title?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

/**
 * Session-Update-Event-Payload
 */
export interface SessionUpdateEvent extends SessionEvent {
  changes: Partial<{
    title: string;
    isPinned: boolean;
    isArchived: boolean;
    tags: string[];
    category: string;
    metadata: Record<string, any>;
  }>;
}

/**
 * Nachrichten-Event-Payload
 */
export interface MessageEvent extends EventPayload {
  messageId: string;
  sessionId: string;
  content: string;
  role: "user" | "assistant" | "system";
  metadata?: Record<string, any>;
}

/**
 * Nachrichten-Update-Event-Payload
 */
export interface MessageUpdateEvent extends MessageEvent {
  changes: Partial<{
    content: string;
    metadata: Record<string, any>;
  }>;
}

/**
 * Nachrichten-Löschen-Event-Payload
 */
export interface MessageDeleteEvent extends EventPayload {
  messageId: string;
  sessionId: string;
}

/**
 * Streaming-Event-Payload
 */
export interface StreamingEvent extends EventPayload {
  sessionId: string;
  messageId?: string;
  content?: string;
  isComplete?: boolean;
  progress?: number;
  error?: ErrorEvent;
}

/**
 * Theme-Event-Payload
 */
export interface ThemeEvent extends EventPayload {
  theme: "light" | "dark" | "system" | string;
  previous?: string;
}

/**
 * Layout-Event-Payload
 */
export interface LayoutEvent extends EventPayload {
  layout: "default" | "compact" | "expanded" | string;
  previous?: string;
}

/**
 * Viewport-Event-Payload
 */
export interface ViewportEvent extends EventPayload {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

/**
 * Dialog-Event-Payload
 */
export interface DialogEvent extends EventPayload {
  dialogId: string;
  type: "modal" | "notification" | "confirm" | "prompt";
  title?: string;
  message?: string;
  data?: any;
}

/**
 * Benachrichtigungs-Event-Payload
 */
export interface NotificationEvent extends EventPayload {
  id: string;
  type: "info" | "success" | "warning" | "error";
  title?: string;
  message: string;
  duration?: number;
  dismissible?: boolean;
  actions?: Array<{
    label: string;
    action: string;
  }>;
}

/**
 * Dokument-Event-Payload
 */
export interface DocumentEvent extends EventPayload {
  documentId: string;
  filename: string;
  mimeType: string;
  size: number;
  userId?: string;
  metadata?: Record<string, any>;
}

/**
 * Dokument-Verarbeitungs-Event-Payload
 */
export interface DocumentProcessingEvent extends DocumentEvent {
  progress: number;
  stage: "upload" | "scan" | "convert" | "process" | "complete";
  estimatedTimeRemaining?: number;
}

/**
 * Dokument-Fehler-Event-Payload
 */
export interface DocumentErrorEvent extends DocumentEvent {
  error: ErrorEvent;
  stage: "upload" | "scan" | "convert" | "process";
}

/**
 * Netzwerk-Leistungs-Event-Payload
 */
export interface NetworkPerformanceEvent extends EventPayload {
  rtt: number; // Round-trip time in ms
  bandwidth?: number; // Estimated bandwidth in kbps
  latency: number; // Latency in ms
  isSlowConnection: boolean;
}

/**
 * Leistungs-Event-Payload
 */
export interface PerformanceEvent extends EventPayload {
  name: string;
  duration: number;
  startTime?: number;
  endTime?: number;
  metrics?: Record<string, number>;
}

/**
 * Telemetrie-Event-Payload
 */
export interface TelemetryEvent extends EventPayload {
  eventName: string;
  category: "error" | "performance" | "usage" | "business" | string;
  data: Record<string, any>;
  sessionId?: string;
  userId?: string;
}

/**
 * Analyse-Event-Payload
 */
export interface AnalyticsEvent extends EventPayload {
  page: string;
  referrer?: string;
  duration?: number;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

/**
 * Analyse-Aktions-Event-Payload
 */
export interface AnalyticsActionEvent extends EventPayload {
  action: string;
  category: string;
  label?: string;
  value?: number;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

// Event-System-Typen

/**
 * EventHandler - Typ für Event-Handler-Funktionen
 */
export type EventHandler<T extends keyof EventMap> = (
  data: EventMap[T],
) => void;

/**
 * GenericEventHandler - Typ für Event-Handler ohne bekannten Event-Typ
 */
export type GenericEventHandler = (eventName: string, data: any) => void;

/**
 * EventUnsubscribe - Cleanup-Funktion für Event-Subscriptions
 */
export type EventUnsubscribe = () => void;

/**
 * EventEmitterOptions - Konfigurationsoptionen für Event-Emitter
 */
export interface EventEmitterOptions {
  /**
   * Fehler in Event-Handlern abfangen und protokollieren
   */
  catchErrors?: boolean;

  /**
   * Event-Protokollierung aktivieren
   */
  enableLogging?: boolean;

  /**
   * Maximale Anzahl von Listenern pro Event
   */
  maxListeners?: number;

  /**
   * Ereignisse asynchron in einem Mikrotask ausführen
   */
  asyncEvents?: boolean;

  /**
   * Ereignisse in einem Batching-Modus ausführen
   */
  batchEvents?: boolean;

  /**
   * Verzögerung für Event-Batching in ms
   */
  batchDelay?: number;
}

/**
 * IEventBus - Interface für typsichere Event-Bus-Implementierungen
 */
export interface IEventBus {
  /**
   * Registriert einen Handler für ein Event
   * @param eventName Name des Events
   * @param handler Event-Handler-Funktion
   * @returns Unsubscribe-Funktion
   */
  on<T extends keyof EventMap>(
    eventName: T,
    handler: EventHandler<T>,
  ): EventUnsubscribe;

  /**
   * Registriert einen Handler für alle Events
   * @param handler Event-Handler-Funktion
   * @returns Unsubscribe-Funktion
   */
  onAny(handler: GenericEventHandler): EventUnsubscribe;

  /**
   * Registriert einen einmaligen Handler für ein Event
   * @param eventName Name des Events
   * @param handler Event-Handler-Funktion
   * @returns Unsubscribe-Funktion
   */
  once<T extends keyof EventMap>(
    eventName: T,
    handler: EventHandler<T>,
  ): EventUnsubscribe;

  /**
   * Entfernt einen Handler für ein Event
   * @param eventName Name des Events
   * @param handler Event-Handler-Funktion
   */
  off<T extends keyof EventMap>(eventName: T, handler: EventHandler<T>): void;

  /**
   * Entfernt alle Handler für ein Event
   * @param eventName Name des Events
   */
  offAll<T extends keyof EventMap>(eventName: T): void;

  /**
   * Löst ein Event aus
   * @param eventName Name des Events
   * @param data Event-Daten
   */
  emit<T extends keyof EventMap>(eventName: T, data: EventMap[T]): void;

  /**
   * Prüft, ob ein Event aktive Listener hat
   * @param eventName Name des Events
   * @returns true, wenn aktive Listener vorhanden sind
   */
  hasListeners<T extends keyof EventMap>(eventName: T): boolean;

  /**
   * Gibt die Anzahl der Listener für ein Event zurück
   * @param eventName Name des Events
   * @returns Anzahl der Listener
   */
  listenerCount<T extends keyof EventMap>(eventName: T): number;

  /**
   * Gibt alle Event-Namen mit aktiven Listenern zurück
   * @returns Array von Event-Namen
   */
  eventNames(): Array<keyof EventMap>;

  /**
   * Entfernt alle Event-Listener
   */
  clear(): void;
}

/**
 * Basis-Implementierung einer Event-Emitter-Factory
 */
export function createTypedEventEmitter<T extends keyof EventMap>(
  eventName: T,
): TypedEventEmitter<EventMap[T]> {
  return new TypedEventEmitter<EventMap[T]>();
}

/**
 * Type Guard zur Prüfung von Event-Payloads
 */
export function isValidEventPayload<T extends keyof EventMap>(
  eventName: T,
  payload: any,
): payload is EventMap[T] {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  // Minimale Validierung für alle Event-Typen
  if ("timestamp" in payload && typeof payload.timestamp !== "number") {
    return false;
  }

  // Spezifische Validierung je nach Event-Typ könnte hier hinzugefügt werden

  return true;
}
