/**
 * Bridge Operation Types
 *
 * Diese Datei definiert erweiterte TypeScript-Typen für komplexe Bridge-Operationen,
 * um eine bessere Typinferenz und Fehlerbehandlung zu ermöglichen.
 */

import { BridgeResult, BridgeError } from "./bridgeErrorUtils";
import { BridgeEventMap } from "./bridgeEventTypes";

/**
 * Asynchrone Bridge-Operation
 *
 * @template T Der Rückgabetyp der Operation
 */
export type AsyncBridgeOperation<T> = () => Promise<BridgeResult<T>>;

/**
 * Synchrone Bridge-Operation
 *
 * @template T Der Rückgabetyp der Operation
 */
export type SyncBridgeOperation<T> = () => BridgeResult<T>;

/**
 * Bridge-Operation (synchron oder asynchron)
 *
 * @template T Der Rückgabetyp der Operation
 */
export type BridgeOperation<T> =
  | AsyncBridgeOperation<T>
  | SyncBridgeOperation<T>;

/**
 * Bridge-Operation mit Parametern
 *
 * @template T Der Rückgabetyp der Operation
 * @template P Die Parameter der Operation
 */
export type ParameterizedBridgeOperation<T, P extends any[]> = (
  ...args: P
) => Promise<BridgeResult<T>>;

/**
 * Erweiterter Typ für Operationen, die während der Ausführung abgebrochen werden können
 *
 * @template T Der Rückgabetyp der Operation
 */
export interface CancellableBridgeOperation<T>
  extends Promise<BridgeResult<T>> {
  cancel: () => Promise<BridgeResult<void>>;
  isCancelled: () => boolean;
}

/**
 * Erzeugt eine abbrechbare Bridge-Operation
 *
 * @template T Der Rückgabetyp der Operation
 * @param operation Die auszuführende Operation
 * @param onCancel Callback-Funktion, die beim Abbrechen aufgerufen wird
 * @returns Eine abbrechbare Operation
 */
export function makeCancellable<T>(
  operation: AsyncBridgeOperation<T>,
  onCancel?: () => Promise<void>,
): CancellableBridgeOperation<T> {
  let isCancelled = false;

  // Erstelle ein Promise mit Cancel-Methode
  const promise = new Promise<BridgeResult<T>>(async (resolve) => {
    try {
      if (!isCancelled) {
        const result = await operation();
        resolve(result);
      }
    } catch (error) {
      // Falls während der Ausführung ein Fehler auftritt, wird dieser abgefangen
      resolve({
        success: false,
        error: error as BridgeError,
      });
    }
  }) as CancellableBridgeOperation<T>;

  // Füge Cancel-Methode hinzu
  promise.cancel = async () => {
    isCancelled = true;
    if (onCancel) {
      try {
        await onCancel();
        return {
          success: true,
          data: undefined,
        };
      } catch (error) {
        return {
          success: false,
          error: error as BridgeError,
        };
      }
    }
    return { success: true, data: undefined };
  };

  // Füge isCancelled-Methode hinzu
  promise.isCancelled = () => isCancelled;

  return promise;
}

/**
 * Verkettete Bridge-Operationen
 *
 * @template T Der Eingabetyp
 * @template R Der Ausgabetyp
 */
export interface ChainableBridgeOperation<T, R> {
  /**
   * Führt die aktuelle Operation aus und gibt das Ergebnis zurück
   */
  execute: () => Promise<BridgeResult<R>>;

  /**
   * Verkettet die aktuelle Operation mit einer weiteren Operation
   * @param nextOperation Die nächste Operation
   */
  then: <U>(
    nextOperation: (result: R) => Promise<BridgeResult<U>>,
  ) => ChainableBridgeOperation<T, U>;

  /**
   * Definiert eine alternative Operation für den Fehlerfall
   * @param recoveryOperation Die Wiederherstellungsoperation
   */
  catch: (
    recoveryOperation: (error: BridgeError) => Promise<BridgeResult<R>>,
  ) => ChainableBridgeOperation<T, R>;

  /**
   * Definiert eine finale Operation, die immer ausgeführt wird
   * @param finalOperation Die finale Operation
   */
  finally: (
    finalOperation: () => Promise<void>,
  ) => ChainableBridgeOperation<T, R>;
}

/**
 * Erzeugt eine verkettbare Bridge-Operation
 *
 * @template T Der Ausgabetyp der ersten Operation
 * @param firstOperation Die erste Operation
 * @returns Eine verkettbare Operation
 */
export function chain<T>(
  firstOperation: () => Promise<BridgeResult<T>>,
): ChainableBridgeOperation<void, T> {
  const operation = firstOperation;
  let recoveryOperation:
    | ((error: BridgeError) => Promise<BridgeResult<T>>)
    | null = null;
  let finalOperation: (() => Promise<void>) | null = null;

  const chainableOperation: ChainableBridgeOperation<void, T> = {
    execute: async () => {
      try {
        const result = await operation();

        if (finalOperation) {
          await finalOperation();
        }

        if (!result.success && recoveryOperation) {
          return await recoveryOperation(result.error);
        }

        return result;
      } catch (error) {
        if (finalOperation) {
          await finalOperation();
        }

        if (recoveryOperation) {
          return await recoveryOperation(error as BridgeError);
        }

        return {
          success: false,
          error: error as BridgeError,
        };
      }
    },

    then: <U>(nextOperation: (result: T) => Promise<BridgeResult<U>>) => {
      const chainedOperation = async () => {
        const result = await operation();

        if (!result.success) {
          return {
            success: false,
            error: result.error,
          } as BridgeResult<U>;
        }

        return nextOperation(result.data);
      };

      return chain<U>(chainedOperation);
    },

    catch: (recovery: (error: BridgeError) => Promise<BridgeResult<T>>) => {
      recoveryOperation = recovery;
      return chainableOperation;
    },

    finally: (finalize: () => Promise<void>) => {
      finalOperation = finalize;
      return chainableOperation;
    },
  };

  return chainableOperation;
}

/**
 * Registriert einen typisierten Event-Handler mit automatischer Aufräumfunktion
 *
 * @template T Der Event-Typ
 * @param eventBus Der EventBus
 * @param eventName Der Event-Name
 * @param handler Der Event-Handler
 * @param options Event-Optionen
 * @returns Eine Promise, die die Aufräumfunktion enthält
 */
export async function withEventHandler<T extends keyof BridgeEventMap>(
  eventBus: {
    on: (
      eventName: T,
      handler: (data: BridgeEventMap[T]) => void,
      options?: any,
    ) => Promise<
      BridgeResult<{ unsubscribe: () => Promise<BridgeResult<void>> }>
    >;
  },
  eventName: T,
  handler: (data: BridgeEventMap[T]) => void,
  options?: any,
): Promise<BridgeResult<() => Promise<BridgeResult<void>>>> {
  const subscription = await eventBus.on(eventName, handler, options);

  if (!subscription.success) {
    return subscription as BridgeResult<() => Promise<BridgeResult<void>>>;
  }

  return {
    success: true,
    data: subscription.data.unsubscribe,
  };
}

/**
 * Utility-Typ für eine Bridge-Komponente mit Selbstheilungsfähigkeiten
 */
export interface SelfHealingComponent {
  /**
   * Prüft, ob die Komponente funktionsfähig ist
   */
  isHealthy: () => Promise<BridgeResult<boolean>>;

  /**
   * Versucht, die Komponente nach einem Fehler wiederherzustellen
   */
  recover: () => Promise<BridgeResult<boolean>>;

  /**
   * Führt eine Diagnose der Komponente durch
   */
  diagnose: () => Promise<
    BridgeResult<{
      status: "healthy" | "degraded" | "error";
      issues: string[];
      recoveryOptions: string[];
    }>
  >;
}

/**
 * Mixin-Typ für selbstheilende Komponenten
 *
 * @template T Der Basistyp der Komponente
 */
export type WithSelfHealing<T> = T & SelfHealingComponent;

/**
 * Utility-Typ für pausierbare Operationen
 */
export interface PausableOperation<T> {
  /**
   * Startet oder setzt die Operation fort
   */
  start: () => Promise<BridgeResult<void>>;

  /**
   * Pausiert die Operation
   */
  pause: () => Promise<BridgeResult<void>>;

  /**
   * Bricht die Operation ab
   */
  cancel: () => Promise<BridgeResult<void>>;

  /**
   * Gibt den aktuellen Status zurück
   */
  getStatus: () => Promise<
    BridgeResult<{
      state: "running" | "paused" | "completed" | "cancelled" | "error";
      progress: number;
      result?: T;
      error?: BridgeError;
    }>
  >;

  /**
   * Event-Emitter für Statusänderungen
   */
  onStatusChange: (
    handler: (status: {
      state: "running" | "paused" | "completed" | "cancelled" | "error";
      progress: number;
      result?: T;
      error?: BridgeError;
    }) => void,
  ) => Promise<BridgeResult<() => Promise<BridgeResult<void>>>>;
}

/**
 * Erzeugt eine pausierbare Operation
 *
 * @template T Der Rückgabetyp der Operation
 * @param operation Die auszuführende Operation
 * @param options Optionen für die pausierbare Operation
 * @returns Eine pausierbare Operation
 */
export function makePausable<T>(
  operation: (
    onProgress: (progress: number) => void,
    checkPaused: () => boolean,
    checkCancelled: () => boolean,
  ) => Promise<BridgeResult<T>>,
  options?: {
    autoStart?: boolean;
    onProgress?: (progress: number) => void;
    onComplete?: (result: BridgeResult<T>) => void;
    onError?: (error: BridgeError) => void;
  },
): PausableOperation<T> {
  let state:
    | "idle"
    | "running"
    | "paused"
    | "completed"
    | "cancelled"
    | "error" = "idle";
  let progress = 0;
  let result: BridgeResult<T> | null = null;
  const statusHandlers: Array<(status: any) => void> = [];

  // Pausierbar und abbrechbar
  let isPaused = false;
  let isCancelled = false;

  // Operation ausführen
  const execute = async (): Promise<void> => {
    if (state === "running" || state === "completed" || state === "cancelled") {
      return;
    }

    state = "running";
    notifyStatusChange();

    try {
      result = await operation(
        (newProgress: number) => {
          progress = newProgress;
          notifyStatusChange();
          if (options?.onProgress) {
            options.onProgress(newProgress);
          }
        },
        () => isPaused,
        () => isCancelled,
      );

      if (isCancelled) {
        state = "cancelled";
      } else {
        state = result.success ? "completed" : "error";
      }

      notifyStatusChange();

      if (state === "completed" && options?.onComplete) {
        options.onComplete(result);
      } else if (state === "error" && options?.onError && !result.success) {
        options.onError(result.error);
      }
    } catch (error) {
      state = "error";
      result = {
        success: false,
        error: error as BridgeError,
      };

      notifyStatusChange();

      if (options?.onError) {
        options.onError(error as BridgeError);
      }
    }
  };

  // Status-Änderung signalisieren
  const notifyStatusChange = () => {
    const status = {
      state,
      progress,
      result: result?.success ? result.data : undefined,
      error: result?.success ? undefined : result?.error,
    };

    statusHandlers.forEach((handler: any) => {
      try {
        handler(status);
      } catch (error) {
        console.error("Error in status change handler:", error);
      }
    });
  };

  // Automatischer Start, wenn gewünscht
  if (options?.autoStart) {
    execute();
  }

  return {
    async start(): Promise<BridgeResult<void>> {
      try {
        if (state === "paused") {
          isPaused = false;
          state = "running";
          notifyStatusChange();
        } else if (state === "idle") {
          execute();
        }

        return { success: true, data: undefined };
      } catch (error) {
        return {
          success: false,
          error: error as BridgeError,
        };
      }
    },

    async pause(): Promise<BridgeResult<void>> {
      try {
        if (state === "running") {
          isPaused = true;
          state = "paused";
          notifyStatusChange();
        }

        return { success: true, data: undefined };
      } catch (error) {
        return {
          success: false,
          error: error as BridgeError,
        };
      }
    },

    async cancel(): Promise<BridgeResult<void>> {
      try {
        if (state === "running" || state === "paused") {
          isCancelled = true;
          state = "cancelled";
          notifyStatusChange();
        }

        return { success: true, data: undefined };
      } catch (error) {
        return {
          success: false,
          error: error as BridgeError,
        };
      }
    },

    async getStatus(): Promise<
      BridgeResult<{
        state: "running" | "paused" | "completed" | "cancelled" | "error";
        progress: number;
        result?: T;
        error?: BridgeError;
      }>
    > {
      try {
        return {
          success: true,
          data: {
            state,
            progress,
            result: result?.success ? result.data : undefined,
            error: result?.success ? undefined : result?.error,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: error as BridgeError,
        };
      }
    },

    async onStatusChange(
      handler: (status: any) => void,
    ): Promise<BridgeResult<() => Promise<BridgeResult<void>>>> {
      try {
        statusHandlers.push(handler);

        return {
          success: true,
          data: async () => {
            try {
              const index = statusHandlers.indexOf(handler);
              if (index !== -1) {
                statusHandlers.splice(index, 1);
              }

              return { success: true, data: undefined };
            } catch (error) {
              return {
                success: false,
                error: error as BridgeError,
              };
            }
          },
        };
      } catch (error) {
        return {
          success: false,
          error: error as BridgeError,
        };
      }
    },
  };
}
