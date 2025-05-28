/**
 * Bridge Event Type Guards
 *
 * Diese Datei enthält erweiterte TypeScript-Typenprüfungen (Type Guards) für
 * Bridge-Events, um sicherzustellen, dass Events typsicher verarbeitet werden.
 * Die Type Guards ermöglichen eine präzise Typeinschränkung in
 * konditionellen Ausdrücken und verbessern die Typinferenz.
 */

import {
  BridgeEventMap,
  BridgeInitializedEvent,
  BridgeErrorEvent,
  BridgeStatusEvent,
  BridgeHealthCheckEvent,
  BridgeHealingEvent,
  BridgeMemoryEvent,
  BridgePerformanceEvent,
  StateUpdateEvent,
  StateSyncEvent,
  StateConflictEvent,
  LegacySessionEvent,
  LegacyMessageEvent,
  LegacyStreamingEvent,
  LegacyUIStateEvent,
  VueCommandEvent,
  VueSendMessageEvent,
  VueSessionCommandEvent,
  VueUpdateSessionEvent,
  VueDeleteMessageEvent,
  VueUIActionEvent,
} from "./bridgeEventTypes";

/**
 * Basisprüfung für alle Event-Payloads
 */
export function isEventPayload(value: unknown): boolean {
  return typeof value === "object" && value !== null;
}

/**
 * Type Guard für BridgeInitializedEvent
 */
export function isBridgeInitializedEvent(
  value: unknown,
): value is BridgeInitializedEvent {
  if (!isEventPayload(value)) return false;

  const event = value as Partial<BridgeInitializedEvent>;

  return (
    typeof event.timestamp === "number" &&
    typeof event.bridgeVersion === "string" &&
    typeof event.configuration === "object" &&
    event.configuration !== null &&
    typeof event.environment === "object" &&
    event.environment !== null &&
    typeof event.configuration.debugging === "boolean" &&
    typeof event.configuration.selfHealing === "boolean" &&
    typeof event.configuration.selectiveSync === "boolean" &&
    typeof event.configuration.eventBatching === "boolean" &&
    typeof event.configuration.performanceMonitoring === "boolean" &&
    typeof event.environment.isProduction === "boolean" &&
    typeof event.environment.browserInfo === "object" &&
    event.environment.browserInfo !== null &&
    typeof event.environment.browserInfo.name === "string" &&
    typeof event.environment.browserInfo.version === "string"
  );
}

/**
 * Type Guard für BridgeErrorEvent
 */
export function isBridgeErrorEvent(value: unknown): value is BridgeErrorEvent {
  if (!isEventPayload(value)) return false;

  const event = value as Partial<BridgeErrorEvent>;

  return (
    typeof event.code === "string" &&
    typeof event.message === "string" &&
    typeof event.timestamp === "number" &&
    typeof event.recoverable === "boolean"
  );
}

/**
 * Type Guard für BridgeStatusEvent
 */
export function isBridgeStatusEvent(
  value: unknown,
): value is BridgeStatusEvent {
  if (!isEventPayload(value)) return false;

  const event = value as Partial<BridgeStatusEvent>;
  const validStatuses = [
    "initializing",
    "active",
    "degraded",
    "error",
    "recovering",
    "inactive",
  ];

  return (
    typeof event.status === "string" &&
    validStatuses.includes(event.status) &&
    typeof event.timestamp === "number" &&
    (event.previousStatus === undefined ||
      typeof event.previousStatus === "string") &&
    (event.message === undefined || typeof event.message === "string") &&
    (event.affectedComponents === undefined ||
      Array.isArray(event.affectedComponents)) &&
    (event.recoveryAttempts === undefined ||
      typeof event.recoveryAttempts === "number")
  );
}

/**
 * Type Guard für BridgeHealthCheckEvent
 */
export function isBridgeHealthCheckEvent(
  value: unknown,
): value is BridgeHealthCheckEvent {
  if (!isEventPayload(value)) return false;

  const event = value as Partial<BridgeHealthCheckEvent>;
  const validOverallStatuses = ["healthy", "degraded", "error"];

  if (
    typeof event.timestamp !== "number" ||
    typeof event.components !== "object" ||
    event.components === null ||
    typeof event.overall !== "string" ||
    !validOverallStatuses.includes(event.overall)
  ) {
    return false;
  }

  // Prüfe die Komponenten-Status-Objekte
  const components = event.components as Record<
    string,
    { status: string; details?: string }
  >;
  const validComponentStatuses = ["healthy", "degraded", "error"];

  for (const componentName in components) {
    const component = components[componentName];

    if (
      typeof component !== "object" ||
      component === null ||
      typeof component.status !== "string" ||
      !validComponentStatuses.includes(component.status) ||
      (component.details !== undefined && typeof component.details !== "string")
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Type Guard für BridgeHealingEvent
 */
export function isBridgeHealingEvent(
  value: unknown,
): value is BridgeHealingEvent {
  if (!isEventPayload(value)) return false;

  const event = value as Partial<BridgeHealingEvent>;

  return (
    typeof event.timestamp === "number" &&
    typeof event.component === "string" &&
    typeof event.issue === "string" &&
    typeof event.action === "string" &&
    typeof event.success === "boolean" &&
    (event.details === undefined || typeof event.details === "string")
  );
}

/**
 * Type Guard für BridgeMemoryEvent
 */
export function isBridgeMemoryEvent(
  value: unknown,
): value is BridgeMemoryEvent {
  if (!isEventPayload(value)) return false;

  const event = value as Partial<BridgeMemoryEvent>;

  return (
    typeof event.timestamp === "number" &&
    typeof event.usedMemory === "number" &&
    (event.totalMemory === undefined ||
      typeof event.totalMemory === "number") &&
    (event.component === undefined || typeof event.component === "string") &&
    (event.leakSuspect === undefined ||
      typeof event.leakSuspect === "boolean") &&
    (event.details === undefined || typeof event.details === "string")
  );
}

/**
 * Type Guard für BridgePerformanceEvent
 */
export function isBridgePerformanceEvent(
  value: unknown,
): value is BridgePerformanceEvent {
  if (!isEventPayload(value)) return false;

  const event = value as Partial<BridgePerformanceEvent>;

  if (
    typeof event.timestamp !== "number" ||
    typeof event.metrics !== "object" ||
    event.metrics === null
  ) {
    return false;
  }

  // Optionale Felder prüfen
  if (
    event.slowOperations !== undefined &&
    (!Array.isArray(event.slowOperations) ||
      !event.slowOperations.every(
        (op) =>
          typeof op === "object" &&
          op !== null &&
          typeof op.name === "string" &&
          typeof op.duration === "number" &&
          typeof op.threshold === "number",
      ))
  ) {
    return false;
  }

  if (
    event.recommendations !== undefined &&
    (!Array.isArray(event.recommendations) ||
      !event.recommendations.every((rec) => typeof rec === "string"))
  ) {
    return false;
  }

  return true;
}

/**
 * Type Guard für StateUpdateEvent
 */
export function isStateUpdateEvent(value: unknown): value is StateUpdateEvent {
  if (!isEventPayload(value)) return false;

  const event = value as Partial<StateUpdateEvent>;

  return (
    typeof event.path === "string" &&
    event.value !== undefined &&
    typeof event.timestamp === "number" &&
    (event.source === "legacy" || event.source === "vue") &&
    (event.isPartial === undefined || typeof event.isPartial === "boolean")
  );
}

/**
 * Type Guard für StateSyncEvent
 */
export function isStateSyncEvent(value: unknown): value is StateSyncEvent {
  if (!isEventPayload(value)) return false;

  const event = value as Partial<StateSyncEvent>;

  return (
    typeof event.timestamp === "number" &&
    typeof event.duration === "number" &&
    Array.isArray(event.paths) &&
    event.paths.every((path) => typeof path === "string") &&
    typeof event.operationCount === "number" &&
    (event.source === "legacy" || event.source === "vue")
  );
}

/**
 * Type Guard für StateConflictEvent
 */
export function isStateConflictEvent(
  value: unknown,
): value is StateConflictEvent {
  if (!isEventPayload(value)) return false;

  const event = value as Partial<StateConflictEvent>;
  const validResolutionStrategies = ["legacy", "vue", "merge", "none"];

  return (
    typeof event.path === "string" &&
    event.legacyValue !== undefined &&
    event.vueValue !== undefined &&
    typeof event.timestamp === "number" &&
    typeof event.resolutionStrategy === "string" &&
    validResolutionStrategies.includes(event.resolutionStrategy)
  );
}

/**
 * Type Guard für LegacySessionEvent
 */
export function isLegacySessionEvent(
  value: unknown,
): value is LegacySessionEvent {
  if (!isEventPayload(value)) return false;

  const event = value as Partial<LegacySessionEvent>;

  return (
    typeof event.sessionId === "string" &&
    typeof event.title === "string" &&
    typeof event.timestamp === "number" &&
    (event.metadata === undefined ||
      (typeof event.metadata === "object" && event.metadata !== null))
  );
}

/**
 * Type Guard für LegacyMessageEvent
 */
export function isLegacyMessageEvent(
  value: unknown,
): value is LegacyMessageEvent {
  if (!isEventPayload(value)) return false;

  const event = value as Partial<LegacyMessageEvent>;
  const validRoles = ["user", "assistant", "system"];

  return (
    typeof event.messageId === "string" &&
    typeof event.sessionId === "string" &&
    typeof event.content === "string" &&
    typeof event.role === "string" &&
    validRoles.includes(event.role) &&
    typeof event.timestamp === "number" &&
    (event.metadata === undefined ||
      (typeof event.metadata === "object" && event.metadata !== null))
  );
}

/**
 * Type Guard für LegacyStreamingEvent
 */
export function isLegacyStreamingEvent(
  value: unknown,
): value is LegacyStreamingEvent {
  if (!isEventPayload(value)) return false;

  const event = value as Partial<LegacyStreamingEvent>;

  return (
    typeof event.sessionId === "string" &&
    typeof event.messageId === "string" &&
    typeof event.content === "string" &&
    typeof event.timestamp === "number" &&
    typeof event.isComplete === "boolean" &&
    (event.progress === undefined || typeof event.progress === "number") &&
    (event.error === undefined ||
      (typeof event.error === "object" &&
        event.error !== null &&
        typeof (event.error as any).message === "string" &&
        typeof (event.error as any).code === "string"))
  );
}

/**
 * Type Guard für LegacyUIStateEvent
 */
export function isLegacyUIStateEvent(
  value: unknown,
): value is LegacyUIStateEvent {
  if (!isEventPayload(value)) return false;

  const event = value as Partial<LegacyUIStateEvent>;

  return (
    typeof event.timestamp === "number" &&
    typeof event.changes === "object" &&
    event.changes !== null
  );
}

/**
 * Type Guard für VueCommandEvent (Basisklasse)
 */
export function isVueCommandEvent(value: unknown): value is VueCommandEvent {
  if (!isEventPayload(value)) return false;

  const event = value as Partial<VueCommandEvent>;

  return (
    typeof event.requestId === "string" &&
    typeof event.timestamp === "number" &&
    typeof event.command === "string" &&
    (event.args === undefined || typeof event.args === "object")
  );
}

/**
 * Type Guard für VueSendMessageEvent
 */
export function isVueSendMessageEvent(
  value: unknown,
): value is VueSendMessageEvent {
  if (!isVueCommandEvent(value)) return false;

  const event = value as Partial<VueSendMessageEvent>;
  const validRoles = ["user", "system"];

  return (
    event.command === "sendMessage" &&
    typeof event.sessionId === "string" &&
    typeof event.content === "string" &&
    (event.role === undefined ||
      (typeof event.role === "string" && validRoles.includes(event.role)))
  );
}

/**
 * Type Guard für VueSessionCommandEvent
 */
export function isVueSessionCommandEvent(
  value: unknown,
): value is VueSessionCommandEvent {
  if (!isVueCommandEvent(value)) return false;

  const event = value as Partial<VueSessionCommandEvent>;
  const validCommands = [
    "selectSession",
    "createSession",
    "deleteSession",
    "cancelStreaming",
  ];

  return (
    validCommands.includes(event.command as string) &&
    (event.sessionId === undefined || typeof event.sessionId === "string")
  );
}

/**
 * Type Guard für VueUpdateSessionEvent
 */
export function isVueUpdateSessionEvent(
  value: unknown,
): value is VueUpdateSessionEvent {
  if (!isVueCommandEvent(value)) return false;

  const event = value as Partial<VueUpdateSessionEvent>;

  if (
    event.command !== "updateSession" ||
    typeof event.sessionId !== "string" ||
    typeof event.updates !== "object" ||
    event.updates === null
  ) {
    return false;
  }

  // Prüfe die Updates
  const updates = event.updates as Record<string, any>;

  if (
    (updates.title !== undefined && typeof updates.title !== "string") ||
    (updates.isPinned !== undefined && typeof updates.isPinned !== "boolean") ||
    (updates.isArchived !== undefined &&
      typeof updates.isArchived !== "boolean") ||
    (updates.tags !== undefined &&
      (!Array.isArray(updates.tags) ||
        !updates.tags.every((tag) => typeof tag === "string"))) ||
    (updates.metadata !== undefined &&
      (typeof updates.metadata !== "object" || updates.metadata === null))
  ) {
    return false;
  }

  return true;
}

/**
 * Type Guard für VueDeleteMessageEvent
 */
export function isVueDeleteMessageEvent(
  value: unknown,
): value is VueDeleteMessageEvent {
  if (!isVueCommandEvent(value)) return false;

  const event = value as Partial<VueDeleteMessageEvent>;

  return (
    event.command === "deleteMessage" &&
    typeof event.sessionId === "string" &&
    typeof event.messageId === "string"
  );
}

/**
 * Type Guard für VueUIActionEvent
 */
export function isVueUIActionEvent(value: unknown): value is VueUIActionEvent {
  if (!isVueCommandEvent(value)) return false;

  const event = value as Partial<VueUIActionEvent>;

  return (
    event.command === "uiAction" &&
    typeof event.action === "string" &&
    (event.target === undefined || typeof event.target === "string")
  );
}

/**
 * Generischer Type Guard für alle Bridge-Events
 *
 * @param eventName Der Event-Name
 * @param payload Die Event-Daten
 * @returns true, wenn das Payload dem erwarteten Typ entspricht
 */
export function isBridgeEvent<T extends keyof BridgeEventMap>(
  eventName: T,
  payload: unknown,
): payload is BridgeEventMap[T] {
  switch (eventName) {
    case "bridge:initialized":
      return isBridgeInitializedEvent(payload);
    case "bridge:error":
      return isBridgeErrorEvent(payload);
    case "bridge:statusChanged":
      return isBridgeStatusEvent(payload);
    case "bridge:healthCheck":
      return isBridgeHealthCheckEvent(payload);
    case "bridge:healing":
      return isBridgeHealingEvent(payload);
    case "bridge:memoryWarning":
      return isBridgeMemoryEvent(payload);
    case "bridge:performanceReport":
      return isBridgePerformanceEvent(payload);

    case "state:updated":
      return isStateUpdateEvent(payload);
    case "state:synced":
      return isStateSyncEvent(payload);
    case "state:conflict":
      return isStateConflictEvent(payload);

    case "legacy:sessionCreated":
    case "legacy:sessionUpdated":
    case "legacy:sessionDeleted":
      return isLegacySessionEvent(payload);

    case "legacy:messageAdded":
    case "legacy:messageUpdated":
    case "legacy:messageDeleted":
      return isLegacyMessageEvent(payload);

    case "legacy:streamingUpdate":
      return isLegacyStreamingEvent(payload);

    case "legacy:uiStateChanged":
      return isLegacyUIStateEvent(payload);

    case "vue:sendMessage":
      return isVueSendMessageEvent(payload);

    case "vue:selectSession":
    case "vue:createSession":
    case "vue:deleteSession":
    case "vue:cancelStreaming":
      return isVueSessionCommandEvent(payload);

    case "vue:updateSession":
      return isVueUpdateSessionEvent(payload);

    case "vue:deleteMessage":
      return isVueDeleteMessageEvent(payload);

    case "vue:uiAction":
      return isVueUIActionEvent(payload);

    // Für 'bridge:ready' und andere einfache Events
    default:
      return isEventPayload(payload);
  }
}

/**
 * Typ-Assertion-Funktion für Bridge-Events
 *
 * @param eventName Der Event-Name
 * @param payload Die Event-Daten
 * @throws Error, wenn die Typprüfung fehlschlägt
 * @returns Das typisierte Event-Payload
 */
export function assertBridgeEvent<T extends keyof BridgeEventMap>(
  eventName: T,
  payload: unknown,
): BridgeEventMap[T] {
  if (!isBridgeEvent(eventName, payload)) {
    throw new Error(`Invalid event payload for event '${eventName}'`);
  }

  return payload as BridgeEventMap[T];
}

/**
 * Hilfsfunktion für typsicheres Event-Handling
 *
 * @param eventName Der Event-Name
 * @param payload Die Event-Daten
 * @param handler Der Event-Handler
 * @returns true, wenn das Event erfolgreich verarbeitet wurde
 */
export function processTypedEvent<T extends keyof BridgeEventMap>(
  eventName: T,
  payload: unknown,
  handler: (data: BridgeEventMap[T]) => void,
): boolean {
  if (isBridgeEvent(eventName, payload)) {
    handler(payload);
    return true;
  }

  return false;
}
