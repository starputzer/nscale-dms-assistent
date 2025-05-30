/**
 * Bridge-Synchronisations-System
 *
 * Dieses Modul stellt optimierte Synchronisations-Komponenten für das Bridge-System
 * bereit, die speziell entwickelt wurden, um Synchronisationsprobleme zwischen
 * Vue 3 und Legacy-JavaScript-Code zu lösen.
 */

import transactionManager, {
  TransactionManager,
  TransactionStatus,
} from "./TransactionManager";
import eventQueue, {
  EventQueue,
  EventPriority,
  EventStatus,
  EventCategory,
} from "./EventQueue";
import {
  TimeoutRetry,
  globalTimeoutRetry,
  bridgeTimeoutRetry,
  OperationStatus,
} from "./TimeoutRetry";
import { deepClone, deepEqual, objectHash } from "./DeepCloneUtil";

// Exporte für direkte Nutzung
export {
  // TransactionManager
  transactionManager,
  TransactionManager,
  TransactionStatus,

  // EventQueue
  eventQueue,
  EventQueue,
  EventPriority,
  EventStatus,
  EventCategory,

  // TimeoutRetry
  TimeoutRetry,
  globalTimeoutRetry,
  bridgeTimeoutRetry,
  OperationStatus,

  // DeepCloneUtil
  deepClone,
  deepEqual,
  objectHash,
};

/**
 * Interface für den Synchronisations-Manager, der alle Synchronisations-Komponenten
 * zusammenfasst und eine einheitliche Schnittstelle bietet.
 */
export interface SyncManager {
  // Event-Queue-Funktionalität
  enqueueEvent: <T>(
    name: string,
    data: T,
    options?: {
      priority?: EventPriority;
      category?: EventCategory;
      source?: "vue" | "legacy" | "system";
    },
  ) => string | null;

  onEvent: <T>(
    eventName: string,
    handler: (event: any) => Promise<void> | void,
  ) => () => void;

  // Transaktionsbasierte Updates
  beginTransaction: (name?: string) => string;
  commitTransaction: (transactionId: string) => void;
  rollbackTransaction: (transactionId: string) => Record<string, any>;

  // Timeout-und-Retry-Mechanismus
  executeWithRetry: <T>(
    operation: () => Promise<T>,
    operationName?: string,
  ) => Promise<{ success: boolean; result?: T; error?: any; attempts: number }>;

  // Hilfsfunktionen
  deepClone: <T>(value: T) => T;
  deepEqual: (a: any, b: any) => boolean;
  objectHash: (value: any) => string;
}

/**
 * Erstellt einen Synchronisations-Manager, der alle Synchronisations-Komponenten
 * zusammenfasst und eine einheitliche Schnittstelle bietet.
 */
export function createSyncManager(): SyncManager {
  return {
    // Event-Queue-Funktionalität
    enqueueEvent: <T>(
      name: string,
      data: T,
      options?: {
        priority?: EventPriority;
        category?: EventCategory;
        source?: "vue" | "legacy" | "system";
      },
    ) => {
      return eventQueue.enqueue(name, data, options);
    },

    onEvent: <T>(
      eventName: string,
      handler: (event: any) => Promise<void> | void,
    ) => {
      return eventQueue.on(eventName, handler);
    },

    // Transaktionsbasierte Updates
    beginTransaction: (name?: string) => {
      return transactionManager.beginTransaction({
        name: name || "Unnamed Transaction",
      });
    },

    commitTransaction: (transactionId: string) => {
      transactionManager.commitTransaction(transactionId);
    },

    rollbackTransaction: (transactionId: string) => {
      return transactionManager.rollbackTransaction(transactionId);
    },

    // Timeout-und-Retry-Mechanismus
    executeWithRetry: async <T>(
      operation: () => Promise<T>,
      operationName?: string,
    ) => {
      const result = await bridgeTimeoutRetry.executeWithRetry(
        operation,
        operationName,
      );

      return {
        success: result.success,
        result: result.result,
        error: result.error,
        attempts: result.attempts,
      };
    },

    // Hilfsfunktionen
    deepClone,
    deepEqual,
    objectHash,
  };
}

// Singleton-Instanz
export const syncManager = createSyncManager();

export default syncManager;
