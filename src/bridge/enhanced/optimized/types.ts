// Common type definitions for the bridge system

export type BridgeComponentName =
  | "SelectiveChatBridge"
  | "OptimizedEventBus"
  | "BatchedEventEmitter"
  | "MemoryManager"
  | "PerformanceMonitor"
  | "SelfHealing"
  | "StateManager"
  | "EventListenerManager"
  | "ChatBridgeDiagnostics"
  | "BridgeStatusManager"
  | string; // Allow other strings for extensibility

export interface BridgeResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
}

export type EventCallback = (data: any) => void;
export type UnsubscribeFn = () => void;
