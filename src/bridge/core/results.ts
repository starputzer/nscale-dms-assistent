/**
 * @file Bridge Result Handling
 * @description Utilities for creating and handling standardized bridge operation results.
 * This approach consolidates error handling across the bridge system.
 *
 * @redundancy-analysis
 * This file consolidates error handling patterns previously scattered across:
 * - bridge/enhanced/errorHandling.ts
 * - bridge/enhanced/optimized/resultTypes.ts
 * - Various inline error handling approaches
 */

import type { BridgeResult, BridgeError } from "./types";

/**
 * Create a successful bridge result
 */
export function success<T>(data?: T): BridgeResult<T> {
  return {
    success: true,
    data,
  };
}

/**
 * Create a failed bridge result
 */
export function failure<T>(
  message: string,
  code: string = "BRIDGE_ERROR",
  details?: Record<string, any>,
  cause?: Error | unknown,
): BridgeResult<T> {
  return {
    success: false,
    error: {
      code,
      message,
      details,
      cause,
    },
  };
}

/**
 * Create a bridge error object
 */
export function createError(
  message: string,
  code: string = "BRIDGE_ERROR",
  details?: Record<string, any>,
  cause?: Error | unknown,
): BridgeError {
  return {
    code,
    message,
    details,
    cause,
  };
}

/**
 * Safely extract error message from any error object
 */
export function getErrorMessage(error: unknown): string {
  if (error === null || error === undefined) {
    return "Unknown error";
  }

  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown error object";
  }
}

/**
 * Execute a function and wrap the result in a BridgeResult
 */
export async function tryAsync<T>(
  fn: () => Promise<T>,
  errorCode: string = "BRIDGE_ERROR",
): Promise<BridgeResult<T>> {
  try {
    const data = await fn();
    return success(data);
  } catch (error) {
    return failure(getErrorMessage(error), errorCode, undefined, error);
  }
}

/**
 * Execute a synchronous function and wrap the result in a BridgeResult
 */
export function trySync<T>(
  fn: () => T,
  errorCode: string = "BRIDGE_ERROR",
): BridgeResult<T> {
  try {
    const data = fn();
    return success(data);
  } catch (error) {
    return failure(getErrorMessage(error), errorCode, undefined, error);
  }
}

/**
 * Check if a result is successful and contains data
 */
export function hasData<T>(
  result: BridgeResult<T>,
): result is BridgeResult<T> & { data: T } {
  return result.success && result.data !== undefined;
}

/**
 * Extract data from a result or throw an error if it failed
 */
export function unwrap<T>(result: BridgeResult<T>): T {
  if (!result.success) {
    throw new Error(result.error?.message || "Operation failed");
  }

  if (result.data === undefined) {
    throw new Error("Operation succeeded but returned no data");
  }

  return result.data;
}

/**
 * Extract data from a result or return a default value if it failed
 */
export function unwrapOr<T>(result: BridgeResult<T>, defaultValue: T): T {
  if (!result.success || result.data === undefined) {
    return defaultValue;
  }

  return result.data;
}

/**
 * Map a successful result value
 */
export function map<T, U>(
  result: BridgeResult<T>,
  mapFn: (data: T) => U,
): BridgeResult<U> {
  if (!result.success) {
    return result as unknown as BridgeResult<U>;
  }

  try {
    return success(
      result.data !== undefined
        ? mapFn(result.data)
        : (undefined as unknown as U),
    );
  } catch (error) {
    return failure(getErrorMessage(error), "MAP_ERROR", undefined, error);
  }
}

/**
 * Chain operations on results
 */
export function chain<T, U>(
  result: BridgeResult<T>,
  chainFn: (data: T) => BridgeResult<U>,
): BridgeResult<U> {
  if (!result.success) {
    return result as unknown as BridgeResult<U>;
  }

  try {
    return result.data !== undefined
      ? chainFn(result.data)
      : failure("Cannot chain on undefined result data", "CHAIN_ERROR");
  } catch (error) {
    return failure(getErrorMessage(error), "CHAIN_ERROR", undefined, error);
  }
}

/**
 * Get specific error codes
 */
export const ErrorCodes = {
  // General errors
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
  INITIALIZATION_ERROR: "INITIALIZATION_ERROR",

  // Bridge errors
  BRIDGE_ERROR: "BRIDGE_ERROR",
  EVENT_ERROR: "EVENT_ERROR",
  SUBSCRIPTION_ERROR: "SUBSCRIPTION_ERROR",

  // Bridge modules
  AUTH_ERROR: "AUTH_ERROR",
  SESSION_ERROR: "SESSION_ERROR",
  UI_ERROR: "UI_ERROR",

  // Synchronization errors
  SYNC_ERROR: "SYNC_ERROR",
  DATA_MISMATCH: "DATA_MISMATCH",

  // Operation errors
  INVALID_OPERATION: "INVALID_OPERATION",
  OPERATION_TIMEOUT: "OPERATION_TIMEOUT",
  OPERATION_ABORTED: "OPERATION_ABORTED",

  // Runtime errors
  TYPE_ERROR: "TYPE_ERROR",
  VALUE_ERROR: "VALUE_ERROR",

  // External integration errors
  LEGACY_INTEGRATION_ERROR: "LEGACY_INTEGRATION_ERROR",
  API_ERROR: "API_ERROR",
} as const;
