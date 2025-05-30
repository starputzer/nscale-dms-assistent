/**
 * Bridge-spezifische Event-Typen
 *
 * Diese Datei definiert die Event-Typen, die speziell für die Bridge-Komponenten
 * zwischen Vue 3 und dem Legacy-Code verwendet werden.
 */

import { EventPayload } from "../../utils/eventTypes";

/**
 * Bridge-Event-Map für strikte Typisierung aller Bridge-Events
 */
export interface BridgeEventMap {
  // Basis-Bridge-Events
  "bridge:ready": EventPayload;
  "bridge:initialized": BridgeInitializedEvent;
  "bridge:error": BridgeErrorEvent;
  "bridge:statusChanged": BridgeStatusEvent;
  "bridge:diagnostics": BridgeDiagnosticsEvent;

  // State-Synchronisierungsevents
  "state:updated": StateUpdateEvent;
  "state:synced": StateSyncEvent;
  "state:resetRequired": EventPayload;
  "state:conflict": StateConflictEvent;

  // Legacy-zu-Vue-Events (Daten von Legacy nach Vue)
  "legacy:sessionCreated": LegacySessionEvent;
  "legacy:sessionUpdated": LegacySessionEvent;
  "legacy:sessionDeleted": LegacySessionEvent;
  "legacy:messageAdded": LegacyMessageEvent;
  "legacy:messageUpdated": LegacyMessageEvent;
  "legacy:messageDeleted": LegacyMessageEvent;
  "legacy:streamingUpdate": LegacyStreamingEvent;
  "legacy:uiStateChanged": LegacyUIStateEvent;

  // Vue-zu-Legacy-Events (Befehle von Vue nach Legacy)
  "vue:createSession": VueCommandEvent;
  "vue:sendMessage": VueSendMessageEvent;
  "vue:selectSession": VueSessionCommandEvent;
  "vue:deleteSession": VueSessionCommandEvent;
  "vue:updateSession": VueUpdateSessionEvent;
  "vue:deleteMessage": VueDeleteMessageEvent;
  "vue:cancelStreaming": VueSessionCommandEvent;
  "vue:uiAction": VueUIActionEvent;

  // Selbstheilungs- und Diagnose-Events
  "bridge:healthCheck": BridgeHealthCheckEvent;
  "bridge:healing": BridgeHealingEvent;
  "bridge:memoryWarning": BridgeMemoryEvent;
  "bridge:performanceReport": BridgePerformanceEvent;

  // Erweiterbar für benutzerdefinierte Events
  [key: `bridge:${string}`]: EventPayload;
}

/**
 * Bridge-Initialisierungs-Event
 */
export interface BridgeInitializedEvent extends EventPayload {
  timestamp: number;
  bridgeVersion: string;
  configuration: {
    debugging: boolean;
    selfHealing: boolean;
    selectiveSync: boolean;
    eventBatching: boolean;
    performanceMonitoring: boolean;
  };
  environment: {
    isProduction: boolean;
    browserInfo: {
      name: string;
      version: string;
    };
  };
}

/**
 * Bridge-Fehler-Event
 */
export interface BridgeErrorEvent extends EventPayload {
  code: string;
  message: string;
  component?: string;
  timestamp: number;
  recoverable: boolean;
  details?: any;
  context?: {
    lastOperation?: string;
    affectedComponents?: string[];
  };
}

/**
 * Bridge-Status-Event
 */
export interface BridgeStatusEvent extends EventPayload {
  status:
    | "initializing"
    | "active"
    | "degraded"
    | "error"
    | "recovering"
    | "inactive";
  previousStatus?: string;
  timestamp: number;
  message?: string;
  affectedComponents?: string[];
  recoveryAttempts?: number;
}

/**
 * Bridge-Diagnose-Event
 */
export interface BridgeDiagnosticsEvent extends EventPayload {
  timestamp: number;
  component: string;
  metrics: {
    memoryUsage?: number;
    eventCount?: number;
    listenerCount?: number;
    stateSize?: number;
    pendingOperations?: number;
    lastSyncTime?: number;
    syncDuration?: number;
    [key: string]: any;
  };
  status: {
    isHealthy: boolean;
    issues?: string[];
    warnings?: string[];
  };
}

/**
 * State-Update-Event
 */
export interface StateUpdateEvent extends EventPayload {
  path: string;
  value: any;
  previousValue?: any;
  timestamp: number;
  source: "legacy" | "vue";
  isPartial?: boolean;
}

/**
 * State-Sync-Event
 */
export interface StateSyncEvent extends EventPayload {
  timestamp: number;
  duration: number;
  paths: string[];
  operationCount: number;
  source: "legacy" | "vue";
}

/**
 * State-Konflikt-Event
 */
export interface StateConflictEvent extends EventPayload {
  path: string;
  legacyValue: any;
  vueValue: any;
  timestamp: number;
  resolutionStrategy: "legacy" | "vue" | "merge" | "none";
}

/**
 * Legacy-Session-Event
 */
export interface LegacySessionEvent extends EventPayload {
  sessionId: string;
  title: string;
  timestamp: number;
  metadata?: {
    createdAt?: string;
    updatedAt?: string;
    messageCount?: number;
    isPinned?: boolean;
    tags?: string[];
    [key: string]: any;
  };
}

/**
 * Legacy-Message-Event
 */
export interface LegacyMessageEvent extends EventPayload {
  messageId: string;
  sessionId: string;
  content: string;
  role: "user" | "assistant" | "system";
  timestamp: number;
  metadata?: {
    status?: string;
    references?: any[];
    tokens?: {
      prompt?: number;
      completion?: number;
      total?: number;
    };
    [key: string]: any;
  };
}

/**
 * Legacy-Streaming-Event
 */
export interface LegacyStreamingEvent extends EventPayload {
  sessionId: string;
  messageId: string;
  content: string;
  timestamp: number;
  isComplete: boolean;
  progress?: number;
  error?: {
    message: string;
    code: string;
  };
}

/**
 * Legacy-UI-State-Event
 */
export interface LegacyUIStateEvent extends EventPayload {
  timestamp: number;
  changes: {
    darkMode?: boolean;
    sidebar?: {
      isOpen?: boolean;
      collapsed?: boolean;
    };
    dialog?: {
      isOpen?: boolean;
      type?: string;
      data?: any;
    };
    [key: string]: any;
  };
}

/**
 * Vue-Command-Event (Basisklasse)
 */
export interface VueCommandEvent extends EventPayload {
  requestId: string;
  timestamp: number;
  command: string;
  args?: any;
}

/**
 * Vue-Send-Message-Event
 */
export interface VueSendMessageEvent extends VueCommandEvent {
  command: "sendMessage";
  sessionId: string;
  content: string;
  role?: "user" | "system";
}

/**
 * Vue-Session-Command-Event
 */
export interface VueSessionCommandEvent extends VueCommandEvent {
  command:
    | "selectSession"
    | "createSession"
    | "deleteSession"
    | "cancelStreaming";
  sessionId?: string;
}

/**
 * Vue-Update-Session-Event
 */
export interface VueUpdateSessionEvent extends VueCommandEvent {
  command: "updateSession";
  sessionId: string;
  updates: {
    title?: string;
    isPinned?: boolean;
    isArchived?: boolean;
    tags?: string[];
    metadata?: Record<string, any>;
  };
}

/**
 * Vue-Delete-Message-Event
 */
export interface VueDeleteMessageEvent extends VueCommandEvent {
  command: "deleteMessage";
  sessionId: string;
  messageId: string;
}

/**
 * Vue-UI-Action-Event
 */
export interface VueUIActionEvent extends VueCommandEvent {
  command: "uiAction";
  action: string;
  target?: string;
  data?: any;
}

/**
 * Bridge-Health-Check-Event
 */
export interface BridgeHealthCheckEvent extends EventPayload {
  timestamp: number;
  components: {
    [componentName: string]: {
      status: "healthy" | "degraded" | "error";
      details?: string;
    };
  };
  overall: "healthy" | "degraded" | "error";
}

/**
 * Bridge-Healing-Event
 */
export interface BridgeHealingEvent extends EventPayload {
  timestamp: number;
  component: string;
  issue: string;
  action: string;
  success: boolean;
  details?: string;
}

/**
 * Bridge-Memory-Event
 */
export interface BridgeMemoryEvent extends EventPayload {
  timestamp: number;
  usedMemory: number;
  totalMemory?: number;
  component?: string;
  leakSuspect?: boolean;
  details?: string;
}

/**
 * Bridge-Performance-Event
 */
export interface BridgePerformanceEvent extends EventPayload {
  timestamp: number;
  metrics: {
    syncDuration?: number;
    eventProcessingTime?: number;
    listenerCallTime?: number;
    memoryUsage?: number;
    pendingOperations?: number;
    [key: string]: any;
  };
  slowOperations?: Array<{
    name: string;
    duration: number;
    threshold: number;
  }>;
  recommendations?: string[];
}

/**
 * Bridge-Event-Handler-Typ
 */
export type BridgeEventHandler<T extends keyof BridgeEventMap> = (
  data: BridgeEventMap[T],
) => void;

/**
 * Bridge-Event-Unsubscribe-Funktion
 */
export type BridgeEventUnsubscribe = () => void;

/**
 * Bridge-Event-Bus-Interface
 */
export interface BridgeEventBus {
  /**
   * Registriert einen Handler für ein Event
   * @param eventName Name des Events
   * @param handler Event-Handler-Funktion
   * @returns Unsubscribe-Funktion
   */
  on<T extends keyof BridgeEventMap>(
    eventName: T,
    handler: BridgeEventHandler<T>,
  ): BridgeEventUnsubscribe;

  /**
   * Registriert einen einmaligen Handler für ein Event
   * @param eventName Name des Events
   * @param handler Event-Handler-Funktion
   * @returns Unsubscribe-Funktion
   */
  once<T extends keyof BridgeEventMap>(
    eventName: T,
    handler: BridgeEventHandler<T>,
  ): BridgeEventUnsubscribe;

  /**
   * Entfernt einen Handler für ein Event
   * @param eventName Name des Events
   * @param handler Event-Handler-Funktion
   */
  off<T extends keyof BridgeEventMap>(
    eventName: T,
    handler: BridgeEventHandler<T>,
  ): void;

  /**
   * Löst ein Event aus
   * @param eventName Name des Events
   * @param data Event-Daten
   */
  emit<T extends keyof BridgeEventMap>(
    eventName: T,
    data: BridgeEventMap[T],
  ): void;

  /**
   * Entfernt alle Event-Listener
   */
  clear(): void;
}

/**
 * Type Guard zur Prüfung von Bridge-Event-Payloads
 */
export function isValidBridgeEvent<T extends keyof BridgeEventMap>(
  eventName: T,
  payload: any,
): payload is BridgeEventMap[T] {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  // Minimale Validierung für alle Event-Typen
  if ("timestamp" in payload && typeof payload.timestamp !== "number") {
    return false;
  }

  // Hier könnten spezifische Validierungen für bestimmte Event-Typen ergänzt werden

  return true;
}
