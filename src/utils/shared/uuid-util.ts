/**
 * UUID Utility
 * 
 * This module provides functions for generating UUIDs that are used in both
 * Vue 3 SFC and Vanilla JS implementations.
 */

/**
 * Generates a v4 UUID
 * @returns {string} A randomly generated UUID
 */
export function v4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Creates a UUID for a specific namespace to ensure consistency
 * @param {string} namespace - The namespace to create a UUID for
 * @param {string} [name] - Optional name within the namespace
 * @returns {string} A deterministic UUID based on the inputs
 */
export function namespaced(namespace: string, name?: string): string {
  // Simple hash function for demonstration purposes
  // In production, use a more robust hashing algorithm
  const str = `${namespace}:${name || ''}`;
  let hash = 0;
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Convert hash to hex string with UUID format
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `${hex.slice(0, 8)}-${hex.slice(0, 4)}-4${hex.slice(0, 3)}-${
    (parseInt(hex.slice(0, 1), 16) & 0x3 | 0x8).toString(16)}${hex.slice(1, 4)}-${hex.slice(0, 12)}`;
}

/**
 * Validates if a string is a valid UUID
 * @param {string} uuid - The string to validate
 * @returns {boolean} True if the string is a valid UUID
 */
export function isValid(uuid: string): boolean {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return regex.test(uuid);
}

// Backwards compatibility with the legacy API
export default {
  v4,
  namespaced,
  isValid
};
