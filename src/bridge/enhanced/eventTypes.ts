/**
 * Event Types - Typsichere Definitionen für alle Events im System
 *
 * Diese Datei definiert typsichere Interfaces für alle Events, die vom EventBus
 * emittiert werden. Durch die Verwendung von Typescript-Generics und Mapped Types
 * können Events typsicher definiert und verwendet werden.
 */

/**
 * Definition der Event-Typen und ihrer Payload-Strukturen
 */
export interface EventDefinitions {
  // Auth Events
  "auth:login": { success: boolean; user?: any; error?: any };
  "auth:logout": void | {};
  "auth:changed": { isAuthenticated: boolean };
  "auth:token": { token: string | null };
  "auth:error": { message: string; code?: number };

  // Session Events
  "session:created": { sessionId: string };
  "session:deleted": { sessionId: string };
  "session:changed": {
    sessionId: string;
    oldSessionId: string | null;
    session: any;
  };
  "session:error": { action: string; sessionId?: string; error: any };
  "sessions:updated": { sessions: any[] };
  "session:message": { sessionId: string; message: any };
  "session:message:sent": { sessionId: string; messageId: string };
  "session:message:received": {
    sessionId: string;
    messageId: string;
    content: any;
  };
  "session:message:error": { sessionId: string; error: any };

  // UI Events
  "ui:darkModeChanged": { isDark: boolean };
  "ui:toast": {
    message: string;
    type?: "info" | "success" | "warning" | "error";
  };
  "ui:modal": { id: string; action: "open" | "close"; data?: any };
  "ui:sidebar": { isOpen: boolean };
  "ui:view": { name: string; params?: Record<string, any> };
  "ui:theme": { name: string; variant?: string };
  "ui:notification": {
    title: string;
    message: string;
    type?: string;
    duration?: number;
  };

  // Feature Flags Events
  "features:updated": { features: Record<string, boolean> };
  "feature:changed": { feature: string; enabled: boolean };
  "feature:toggled": { feature: string; enabled: boolean };

  // Bridge System Events
  "bridge:ready": { version: string };
  "bridge:error": { component: string; message: string; error?: any };
  "bridge:disconnected": { reason?: string };
  "bridge:reconnected": { timestamp: number };
  "bridge:status": {
    component: string;
    status: "healthy" | "degraded" | "error";
  };

  // Document Converter Events
  "document:upload:started": { fileName: string; size: number };
  "document:upload:progress": { fileName: string; progress: number };
  "document:upload:completed": { fileName: string; fileId: string };
  "document:upload:error": { fileName: string; error: any };
  "document:conversion:started": { fileId: string };
  "document:conversion:progress": { fileId: string; progress: number };
  "document:conversion:completed": { fileId: string; documentId: string };
  "document:conversion:error": { fileId: string; error: any };
  "documents:updated": { documents: any[] };

  // Performance Monitoring Events
  "performance:metric": {
    name: string;
    value: number;
    tags?: Record<string, string>;
  };
  "performance:milestone": { name: string; timestamp: number };
  "performance:error": { message: string; stack?: string; context?: any };
  "performance:resource": { url: string; duration: number; type: string };

  // Allgemeine System Events
  "system:error": { message: string; code?: number; details?: any };
  "system:warning": { message: string; details?: any };
  "system:info": { message: string; details?: any };
  "system:startup": { timestamp: number; environment: string };
  "system:shutdown": { timestamp: number; reason?: string };
  "system:maintenance": {
    scheduled: boolean;
    startTime?: number;
    endTime?: number;
  };

  // Legacy-Kompatibilitäts-Events - diese können jeden beliebigen Payload haben
  [key: `legacy:${string}`]: any;

  // Erweiterbare Events für kundenspezifische Events
  [key: `custom:${string}`]: any;
}

/**
 * Extrahiert die Payload eines Events basierend auf seinem Namen
 */
export type EventPayload<T extends keyof EventDefinitions> =
  EventDefinitions[T];

/**
 * Erweiterte Event-Options für typsichere Events
 */
export interface TypedEventOptions {
  once?: boolean;
  priority?: number;
  timeout?: number;
  context?: string; // Zusätzliche Context-Information für Debugging
  id?: string; // Optionale ID für manuelle Abmeldung
}

/**
 * Event-Subscription mit erweiterten Informationen
 */
export interface TypedEventSubscription {
  /**
   * Hebt die Registrierung des Event-Listeners auf
   */
  unsubscribe(): void;

  /**
   * Eindeutige ID des Subscriptions
   */
  readonly id: string;

  /**
   * Event-Name, auf den abonniert wurde
   */
  readonly eventName: string;

  /**
   * Zeitpunkt der Registrierung
   */
  readonly createdAt: number;
}

/**
 * Callback-Typ für typisierte Event-Listener
 */
export type TypedEventListener<T extends keyof EventDefinitions> =
  EventDefinitions[T] extends void | {}
    ? () => void
    : (data: EventDefinitions[T]) => void;

/**
 * Typsichere Event-Emitter-Schnittstelle
 */
export interface TypedEventBus {
  /**
   * Registriert einen typisierten Event-Listener
   * @param eventName Name des Events
   * @param listener Callback-Funktion mit korrektem Typ
   * @param options Optionale Konfiguration
   */
  on<T extends keyof EventDefinitions>(
    eventName: T,
    listener: TypedEventListener<T>,
    options?: TypedEventOptions,
  ): TypedEventSubscription;

  /**
   * Registriert einen einmalig ausgeführten typisierten Event-Listener
   * @param eventName Name des Events
   * @param listener Callback-Funktion mit korrektem Typ
   * @param options Optionale Konfiguration
   */
  once<T extends keyof EventDefinitions>(
    eventName: T,
    listener: TypedEventListener<T>,
    options?: Omit<TypedEventOptions, "once">,
  ): TypedEventSubscription;

  /**
   * Hebt die Registrierung eines Event-Listeners auf
   * @param subscription Subscription-Objekt oder Event-ID
   */
  off(subscription: TypedEventSubscription | string): void;

  /**
   * Hebt die Registrierung aller Listener für ein bestimmtes Event auf
   * @param eventName Name des Events
   */
  offAll<T extends keyof EventDefinitions>(eventName: T): void;

  /**
   * Sendet ein typisiertes Event mit korrektem Payload
   * @param eventName Name des Events
   * @param payload Daten entsprechend dem Event-Typ
   */
  emit<T extends keyof EventDefinitions>(
    eventName: T,
    ...args: EventDefinitions[T] extends void | {} ? [] : [EventDefinitions[T]]
  ): void;

  /**
   * Sendet mehrere Events gleichzeitig
   * @param events Array von Event-Tupeln mit korrekten Typen
   */
  emitMultiple(
    events: Array<
      | [T: keyof EventDefinitions & string, payload: any]
      | [T: keyof EventDefinitions & string]
    >,
  ): void;

  /**
   * Registriert einen typisierten Event-Listener mit Priorität
   * @param eventName Name des Events
   * @param priority Priorität des Listeners (höhere Werte = höhere Priorität)
   * @param listener Callback-Funktion mit korrektem Typ
   * @param options Optionale Konfiguration
   */
  priority<T extends keyof EventDefinitions>(
    eventName: T,
    priority: number,
    listener: TypedEventListener<T>,
    options?: Omit<TypedEventOptions, "priority">,
  ): TypedEventSubscription;

  /**
   * Prüft, ob der EventBus operativ ist
   */
  isOperational(): boolean;

  /**
   * Setzt den EventBus zurück
   */
  reset(): void;

  /**
   * Entfernt alle Event-Listener
   */
  clear(): void;

  /**
   * Liefert diagnostische Informationen über den EventBus
   */
  getDiagnostics(): {
    listenerCount: number;
    eventTypes: string[];
    pendingEvents: string[];
    batching: {
      enabled: boolean;
      queueSize: number;
      batchDelay: number;
    };
    memory: {
      trackedListeners: number;
      gcCollected: number;
    };
  };
}

/**
 * Adapter für Legacy Code, der einfachere Event-Typen erwartet
 */
export interface EventBusLegacyAdapter {
  /**
   * Registriert einen Event-Listener mit einfacherer Schnittstelle
   */
  addEventListener(eventName: string, callback: Function): () => void;

  /**
   * Entfernt einen Event-Listener mit einfacherer Schnittstelle
   */
  removeEventListener(eventName: string, callback: Function): void;

  /**
   * Sendet ein Event mit einfacherer Schnittstelle
   */
  dispatchEvent(eventName: string, data?: any): void;
}

/**
 * Utility-Typ für Event-Validierung
 * (Für interne Verwendung in Tests und Entwicklung)
 */
export type ValidateEvent<
  T extends keyof EventDefinitions,
  P,
> = P extends EventDefinitions[T] ? P : never;
