/**
 * Shared Error Utilities
 *
 * Common error handling functions that can be used in both Vue 3 and Vanilla JS implementations.
 */

/**
 * Error codes for application errors
 */
export enum ErrorCode {
  UNKNOWN = 'UNKNOWN_ERROR',
  NETWORK = 'NETWORK_ERROR',
  VALIDATION = 'VALIDATION_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND_ERROR',
  SERVER = 'SERVER_ERROR',
  TIMEOUT = 'TIMEOUT_ERROR',
  INPUT = 'INPUT_ERROR',
  BUSINESS_LOGIC = 'BUSINESS_LOGIC_ERROR'
}

/**
 * Application-specific error with additional metadata
 */
export class AppError extends Error {
  code: ErrorCode;
  details?: Record<string, any>;
  timestamp: Date;
  originalError?: Error;

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.UNKNOWN,
    details?: Record<string, any>,
    originalError?: Error
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date();
    this.originalError = originalError;

    // For proper inheritance
    Object.setPrototypeOf(this, AppError.prototype);
  }

  /**
   * Gets a structured representation of the error for logging
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
      originalError: this.originalError ? {
        name: this.originalError.name,
        message: this.originalError.message,
        stack: this.originalError.stack
      } : undefined
    };
  }
}

/**
 * Creates an AppError from a network error
 * @param error The original error
 * @returns AppError instance
 */
export function createNetworkError(error: Error): AppError {
  return new AppError(
    `Network request failed: ${error.message}`,
    ErrorCode.NETWORK,
    { originalMessage: error.message },
    error
  );
}

/**
 * Creates an AppError from an authentication error
 * @param message The error message
 * @param details Additional error details
 * @returns AppError instance
 */
export function createAuthError(message: string, details?: Record<string, any>): AppError {
  return new AppError(message, ErrorCode.AUTHENTICATION, details);
}

/**
 * Creates an AppError from a validation error
 * @param message The error message
 * @param validationErrors Validation errors by field
 * @returns AppError instance
 */
export function createValidationError(
  message: string,
  validationErrors: Record<string, string[]>
): AppError {
  return new AppError(message, ErrorCode.VALIDATION, { validationErrors });
}

/**
 * Safely handles async operations with a standardized error handling approach
 * @param promise The promise to handle
 * @returns A tuple with [data, error]
 */
export async function safeAsync<T>(promise: Promise<T>): Promise<[T | null, AppError | null]> {
  try {
    const data = await promise;
    return [data, null];
  } catch (error) {
    // If it's already an AppError, return it
    if (error instanceof AppError) {
      return [null, error];
    }

    // Convert to AppError
    const appError = new AppError(
      error instanceof Error ? error.message : 'An unknown error occurred',
      ErrorCode.UNKNOWN,
      {},
      error instanceof Error ? error : undefined
    );

    return [null, appError];
  }
}
