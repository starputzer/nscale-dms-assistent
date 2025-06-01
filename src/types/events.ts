// Event type definitions

export type EventCallback = (...args: any[]) => void | Promise<void>;
export type UnsubscribeFn = () => void;

export interface EventSubscription {
  unsubscribe: UnsubscribeFn;
}

export interface EventEmitter {
  on(event: string, callback: EventCallback): EventSubscription;
  off(event: string, callback: EventCallback): void;
  emit(event: string, ...args: any[]): void;
  once(event: string, callback: EventCallback): EventSubscription;
  removeAllListeners(event?: string): void;
}