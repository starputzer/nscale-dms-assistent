// Common type definitions for the bridge system

export type EventCallback = (data: any) => void;
export type UnsubscribeFn = () => void;
export type EventHandler = EventCallback | UnsubscribeFn;

export interface EventSubscription {
  unsubscribe: () => void;
  id?: string;
}

// Re-export LogLevel from the correct location
export { LogLevel } from "../logger/index";
