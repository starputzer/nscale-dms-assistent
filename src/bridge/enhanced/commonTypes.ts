/**
 * Common type definitions for the Bridge system
 */

// Event handling types
export type EventCallback<T = any> = (data: T) => void | Promise<void>;
export type UnsubscribeFn = () => void;
export type EventHandler<T = any> = EventCallback<T>;

// Bridge component names
export type BridgeComponentName =
  | "core"
  | "eventBus"
  | "stateManager"
  | "performanceMonitor"
  | "memoryManager"
  | "selfHealing"
  | "diagnostics"
  | "serializer"
  | "eventListenerManager"
  | "unknown";

// Utility types
export interface Disposable {
  dispose(): void;
}

export interface Initializable {
  initialize(): Promise<void>;
}

// Error types
export interface BridgeError extends Error {
  code?: string;
  component?: BridgeComponentName;
  timestamp?: number;
  context?: Record<string, any>;
}

export interface BridgeErrorState {
  hasError: boolean;
  error?: BridgeError;
  errorCount: number;
  lastError?: number;
}

// Performance types
export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
}

// Memory types
export interface MemoryStats {
  current: number;
  peak: number;
  growth: number;
  growthRate: number;
  formatted?: {
    current: string;
    peak: string;
    growth: string;
    growthRate: string;
  };
}

// Throttle utility
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number,
): T {
  let inThrottle: boolean;
  let lastResult: any;

  return function (this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      inThrottle = true;
      lastResult = func.apply(this, args);
      setTimeout(() => (inThrottle = false), limit);
    }
    return lastResult;
  } as T;
}
