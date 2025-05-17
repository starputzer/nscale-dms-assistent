/**
 * Form Validation Utilities
 * 
 * This module provides validation functions for forms that are used in both
 * Vue 3 SFC and Vanilla JS implementations.
 */

/**
 * Validates an email address
 * @param {string} email - The email address to validate
 * @returns {boolean} True if the email address is valid
 */
export function validateEmail(email: string): boolean {
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return regex.test(email);
}

/**
 * Validates a password
 * @param {string} password - The password to validate
 * @param {Object} options - Validation options
 * @returns {boolean} True if the password is valid
 */
export function validatePassword(
  password: string, 
  options: { 
    minLength?: number, 
    requireUppercase?: boolean,
    requireLowercase?: boolean,
    requireNumbers?: boolean,
    requireSpecial?: boolean
  } = {}
): boolean {
  const {
    minLength = 8,
    requireUppercase = true,
    requireLowercase = true,
    requireNumbers = true,
    requireSpecial = false
  } = options;
  
  if (password.length < minLength) {
    return false;
  }
  
  if (requireUppercase && !/[A-Z]/.test(password)) {
    return false;
  }
  
  if (requireLowercase && !/[a-z]/.test(password)) {
    return false;
  }
  
  if (requireNumbers && !/[0-9]/.test(password)) {
    return false;
  }
  
  if (requireSpecial && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return false;
  }
  
  return true;
}

/**
 * Validates that a value is not empty
 * @param {any} value - The value to validate
 * @returns {boolean} True if the value is not empty
 */
export function validateRequired(value: any): boolean {
  if (value === null || value === undefined) {
    return false;
  }
  
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  
  return true;
}

/**
 * Validates a URL
 * @param {string} url - The URL to validate
 * @returns {boolean} True if the URL is valid
 */
export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Bundle all validation functions into a single object for backwards compatibility
 */
export const FormValidation = {
  validateEmail,
  validatePassword,
  validateRequired,
  validateUrl
};

export default FormValidation;
