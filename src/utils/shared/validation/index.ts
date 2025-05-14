/**
 * Shared Validation Utilities
 *
 * Common validation functions that can be used in both Vue 3 and Vanilla JS implementations.
 */

/**
 * Validates that a string is not empty
 * @param value The string to validate
 * @returns True if the string is not empty, false otherwise
 */
export function isNotEmpty(value: string): boolean {
  return value !== null && value !== undefined && value.trim() !== '';
}

/**
 * Validates that a string is a valid email address
 * @param email The email address to validate
 * @returns True if the email is valid, false otherwise
 */
export function isValidEmail(email: string): boolean {
  if (!isNotEmpty(email)) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates that a string is a valid URL
 * @param url The URL to validate
 * @returns True if the URL is valid, false otherwise
 */
export function isValidUrl(url: string): boolean {
  if (!isNotEmpty(url)) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates that a password meets the minimum requirements:
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * @param password The password to validate
 * @returns True if the password meets the requirements, false otherwise
 */
export function isStrongPassword(password: string): boolean {
  if (!isNotEmpty(password)) return false;
  if (password.length < 8) return false;

  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  return hasUppercase && hasLowercase && hasNumber;
}

/**
 * Validates that a value is a number
 * @param value The value to validate
 * @returns True if the value is a number, false otherwise
 */
export function isNumber(value: any): boolean {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Validates that a number is within a range
 * @param value The number to validate
 * @param min The minimum value
 * @param max The maximum value
 * @returns True if the number is within the range, false otherwise
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return isNumber(value) && value >= min && value <= max;
}
