/**
 * TimeoutRetry.ts
 *
 * Implementiert einen intelligenten Timeout-und-Retry-Mechanismus
 * für asynchrone Operationen im Bridge-System. Ermöglicht automatische
 * Wiederholung fehlgeschlagener Operationen mit exponentiellem Backoff.
 */

import { logger } from "../logger";

/**
 * Status einer Operation
 */
export enum OperationStatus {
  PENDING = "pending",
  RUNNING = "running",
  SUCCEEDED = "succeeded",
  FAILED = "failed",
  TIMEOUT = "timeout",
  RETRYING = "retrying",
}

/**
 * Ergebnis einer Operation
 */
export interface OperationResult<T = any> {
  success: boolean;
  result?: T;
  error?: any;
  attempts: number;
  totalTimeMs: number;
  status: OperationStatus;
}

/**
 * Konfigurationsobjekt für Retry-Optionen
 */
export interface RetryOptions {
  // Grundlegende Retry-Optionen
  maxRetries: number; // Maximale Anzahl an Wiederholungsversuchen
  timeout: number; // Timeout in ms
  retryDelay: number; // Verzögerung zwischen Versuchen in ms

  // Erweiterte Retry-Optionen
  exponentialBackoff: boolean; // Exponentielles Backoff zwischen Versuchen
  backoffFactor: number; // Multiplikator für exponentielles Backoff
  maxBackoff: number; // Maximale Verzögerung in ms
  jitter: boolean; // Zufällige Verzögerung (Jitter) hinzufügen
  jitterFactor: number; // Multiplikator für Jitter

  // Fehlerbehandlung
  onTimeout?: (attempt: number, elapsedMs: number) => void;
  onRetry?: (attempt: number, delay: number, error?: any) => void;
  onSuccess?: (result: any, attempt: number, totalTimeMs: number) => void;
  onFailure?: (error: any, attempts: number, totalTimeMs: number) => void;

  // Bedingungen
  retryOnTimeout: boolean; // Bei Timeout wiederholen?
  shouldRetry?: (error: any, attempt: number) => boolean;
  abortSignal?: AbortSignal; // Signal zum Abbrechen der Operation
}

/**
 * Standard-Retry-Optionen
 */
const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  timeout: 5000,
  retryDelay: 1000,
  exponentialBackoff: true,
  backoffFactor: 2,
  maxBackoff: 30000,
  jitter: true,
  jitterFactor: 0.25,
  retryOnTimeout: true,
};

/**
 * TimeoutRetry bietet einen flexiblen Mechanismus zum Wiederholen
 * fehlgeschlagener oder zeitüberschreitender asynchroner Operationen.
 */
export class TimeoutRetry {
  private options: RetryOptions;

  /**
   * Erstellt eine neue TimeoutRetry-Instanz
   * @param options Retry-Optionen
   */
  constructor(options?: Partial<RetryOptions>) {
    this.options = { ...DEFAULT_RETRY_OPTIONS, ...options };
  }

  /**
   * Aktualisiert die Optionen
   * @param options Neue Optionen
   */
  public updateOptions(options: Partial<RetryOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Führt eine asynchrone Operation mit Timeout und automatischer Wiederholung aus
   * @param operation Die auszuführende asynchrone Operation
   * @param operationName Name der Operation für Logging
   * @param options Retry-Optionen (überschreiben die Standard-Optionen)
   * @returns Ein Promise mit dem Ergebnis der Operation
   */
  public async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string = "Unnamed operation",
    options?: Partial<RetryOptions>,
  ): Promise<OperationResult<T>> {
    // Optionen mit übergebenen Optionen kombinieren
    const opts = { ...this.options, ...options };

    let attempt = 0;
    let totalTimeMs = 0;
    const startTime = Date.now();
    let finalError: any = null;

    while (attempt <= opts.maxRetries) {
      attempt++;

      const operationStartTime = Date.now();

      try {
        // Prüfen, ob die Operation abgebrochen wurde
        if (opts.abortSignal && opts.abortSignal.aborted) {
          const error = new Error("Operation aborted");
          logger.debug(`${operationName} aborted before attempt ${attempt}`);

          finalError = error;

          return {
            success: false,
            error,
            attempts: attempt,
            totalTimeMs: Date.now() - startTime,
            status: OperationStatus.FAILED,
          };
        }

        // Operation mit Timeout ausführen
        const result = await this.executeWithTimeout(
          operation,
          opts.timeout,
          operationName,
          opts.abortSignal,
        );

        // Bei Erfolg Ergebnis zurückgeben
        const elapsedMs = Date.now() - startTime;

        if (opts.onSuccess) {
          opts.onSuccess(result, attempt, elapsedMs);
        }

        logger.debug(
          `${operationName} succeeded after ${attempt} attempt(s) in ${elapsedMs}ms`,
        );

        return {
          success: true,
          result,
          attempts: attempt,
          totalTimeMs: elapsedMs,
          status: OperationStatus.SUCCEEDED,
        };
      } catch (error) {
        const isTimeout =
          error instanceof Error && error.message.includes("timeout");
        const elapsedMs = Date.now() - startTime;
        finalError = error;

        // Prüfen, ob wir die Operation wiederholen sollen
        const shouldRetry =
          attempt <= opts.maxRetries &&
          ((isTimeout && opts.retryOnTimeout) ||
            (opts.shouldRetry ? opts.shouldRetry(error, attempt) : true)) &&
          !(opts.abortSignal && opts.abortSignal.aborted);

        if (isTimeout && opts.onTimeout) {
          opts.onTimeout(attempt, elapsedMs);
        }

        if (shouldRetry) {
          // Verzögerung für nächsten Versuch berechnen
          const delay = this.calculateBackoff(attempt, opts);

          if (opts.onRetry) {
            opts.onRetry(attempt, delay, error);
          }

          logger.debug(
            `${operationName} failed (${isTimeout ? "timeout" : "error"}), retrying in ${delay}ms (attempt ${attempt}/${opts.maxRetries})`,
          );

          // Warten vor dem nächsten Versuch
          await this.delay(delay, opts.abortSignal);

          // Iteration fortsetzen (nächster Versuch)
          continue;
        }

        // Maximale Versuche erreicht oder Wiederholung nicht erlaubt
        totalTimeMs = Date.now() - startTime;

        if (opts.onFailure) {
          opts.onFailure(error, attempt, totalTimeMs);
        }

        logger.warn(
          `${operationName} failed after ${attempt} attempt(s) in ${totalTimeMs}ms`,
        );

        break;
      }
    }

    // Alle Versuche fehlgeschlagen
    return {
      success: false,
      error: finalError,
      attempts: attempt,
      totalTimeMs,
      status:
        finalError instanceof Error && finalError.message.includes("timeout")
          ? OperationStatus.TIMEOUT
          : OperationStatus.FAILED,
    };
  }

  /**
   * Führt eine Operation mit Timeout aus
   * @param operation Die auszuführende asynchrone Operation
   * @param timeoutMs Timeout in Millisekunden
   * @param operationName Name der Operation für Logging
   * @param abortSignal Optional: Signal zum Abbrechen der Operation
   * @returns Ein Promise mit dem Ergebnis der Operation
   */
  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    operationName: string,
    abortSignal?: AbortSignal,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      let timeoutId: number | null = null;
      let isResolved = false;

      // Timeout-Handler
      if (timeoutMs > 0) {
        timeoutId = window.setTimeout(() => {
          if (!isResolved) {
            isResolved = true;
            reject(
              new Error(
                `Operation ${operationName} timeout after ${timeoutMs}ms`,
              ),
            );
          }
        }, timeoutMs);
      }

      // Abbruch-Handler
      const abortHandler = () => {
        if (!isResolved) {
          isResolved = true;
          reject(new Error("Operation aborted"));
        }
      };

      // Abbruch-Signal registrieren
      if (abortSignal) {
        abortSignal.addEventListener("abort", abortHandler);
      }

      // Operation ausführen
      operation()
        .then((result) => {
          if (!isResolved) {
            isResolved = true;

            // Timeout aufräumen
            if (timeoutId !== null) {
              clearTimeout(timeoutId);
            }

            // Abbruch-Signal aufräumen
            if (abortSignal) {
              abortSignal.removeEventListener("abort", abortHandler);
            }

            resolve(result);
          }
        })
        .catch((error) => {
          if (!isResolved) {
            isResolved = true;

            // Timeout aufräumen
            if (timeoutId !== null) {
              clearTimeout(timeoutId);
            }

            // Abbruch-Signal aufräumen
            if (abortSignal) {
              abortSignal.removeEventListener("abort", abortHandler);
            }

            reject(error);
          }
        });
    });
  }

  /**
   * Berechnet die Backoff-Zeit für einen Wiederholungsversuch
   * @param attempt Die aktuelle Versuchsnummer
   * @param options Retry-Optionen
   * @returns Die Backoff-Zeit in Millisekunden
   */
  private calculateBackoff(attempt: number, options: RetryOptions): number {
    let delay = options.retryDelay;

    // Exponentielles Backoff anwenden
    if (options.exponentialBackoff && attempt > 1) {
      delay = Math.min(
        delay * Math.pow(options.backoffFactor, attempt - 1),
        options.maxBackoff,
      );
    }

    // Jitter hinzufügen
    if (options.jitter) {
      const jitterAmount = delay * options.jitterFactor;
      delay = delay - jitterAmount + Math.random() * jitterAmount * 2;
    }

    return Math.floor(delay);
  }

  /**
   * Wartet für eine bestimmte Zeit
   * @param ms Zeit in Millisekunden
   * @param abortSignal Signal zum Abbrechen des Wartens
   * @returns Ein Promise, der nach der angegebenen Zeit erfüllt wird
   */
  private delay(ms: number, abortSignal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (abortSignal && abortSignal.aborted) {
        reject(new Error("Delay aborted"));
        return;
      }

      const timeoutId = setTimeout(() => resolve(), ms);

      if (abortSignal) {
        abortSignal.addEventListener(
          "abort",
          () => {
            clearTimeout(timeoutId);
            reject(new Error("Delay aborted"));
          },
          { once: true },
        );
      }
    });
  }
}

// Singleton-Instanz für allgemeine Verwendung
export const globalTimeoutRetry = new TimeoutRetry();

// Spezifische Instanz für Bridge-Operationen mit angepassten Standardwerten
export const bridgeTimeoutRetry = new TimeoutRetry({
  maxRetries: 5,
  timeout: 3000,
  retryDelay: 500,
  exponentialBackoff: true,
  backoffFactor: 1.5,
  maxBackoff: 10000,
  jitter: true,
  jitterFactor: 0.2,
  retryOnTimeout: true,
  onRetry: (attempt, delay, error) => {
    logger.debug(
      `Bridge operation retry ${attempt}, waiting ${delay}ms. Error: ${error?.message || "Unknown error"}`,
    );
  },
});

export default {
  TimeoutRetry,
  globalTimeoutRetry,
  bridgeTimeoutRetry,
  OperationStatus,
};
