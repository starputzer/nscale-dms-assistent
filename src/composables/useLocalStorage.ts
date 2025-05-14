import { ref, watch, Ref } from "vue";
import { useLogger } from "./useLogger";
import type { UseLocalStorageReturn } from "../utils/composableTypes";

/**
 * Options for the useLocalStorage composable
 */
export interface LocalStorageOptions<T> {
  /** Whether to serialize/deserialize the value with JSON.stringify/parse */
  useJSON?: boolean;
  /** Default value if the item doesn't exist in storage */
  defaultValue?: T;
  /** Storage Key prefix */
  prefix?: string;
  /** Storage instance to use (defaults to localStorage) */
  storage?: Storage;
  /** Watch for changes to the value and update storage */
  watchValue?: boolean;
  /** Custom serializer function */
  serializer?: (value: T) => string;
  /** Custom deserializer function */
  deserializer?: (value: string) => T;
  /** Whether to delete the storage item when value is null/undefined */
  deleteIfNull?: boolean;
}

/**
 * Composable for reactive localStorage values with automatic serialization
 *
 * @param key - Storage key
 * @param initialValue - Initial value (can be a function)
 * @param options - Configuration options
 * @returns {LocalStorageRef<T>} Reactive ref and utility methods
 *
 * @example
 * // Simple string
 * const name = useLocalStorage('user-name', 'Guest');
 *
 * // Complex object
 * const userSettings = useLocalStorage('user-settings', {
 *   theme: 'light',
 *   notifications: true
 * });
 *
 * // With custom options
 * const token = useLocalStorage('auth-token', null, {
 *   prefix: 'myapp_',
 *   deleteIfNull: true,
 *   // Will store as myapp_auth-token
 * });
 */
export function useLocalStorage<T>(
  key: string,
  initialValue?: T | (() => T),
  options: LocalStorageOptions<T> = {},
): LocalStorageRef<T> {
  const {
    useJSON = true,
    defaultValue = null as unknown as T,
    prefix = "",
    storage = localStorage,
    watchValue = true,
    serializer,
    deserializer,
    deleteIfNull = false,
  } = options;

  const logger = useLogger("useLocalStorage");
  const storageKey = `${prefix}${key}`;

  // Create serializer functions
  const serialize =
    serializer ||
    (useJSON
      ? (value: T) => JSON.stringify(value)
      : (value: T) => String(value));

  const deserialize =
    deserializer ||
    (useJSON
      ? (value: string): T => {
          try {
            return JSON.parse(value) as T;
          } catch (error) {
            logger.error(
              `Error deserializing value for key ${storageKey}`,
              error,
            );
            return defaultValue;
          }
        }
      : (value: string): T => value as unknown as T);

  // Get initial value
  const getInitialValue = (): T => {
    try {
      const storageValue = storage.getItem(storageKey);

      // If the value exists in storage, use it
      if (storageValue !== null) {
        return deserialize(storageValue);
      }

      // Otherwise, use the provided initial value or default
      return typeof initialValue === "function"
        ? (initialValue as () => T)()
        : initialValue !== undefined
          ? initialValue
          : defaultValue;
    } catch (error) {
      logger.error(
        `Error reading from localStorage for key ${storageKey}`,
        error,
      );
      return typeof initialValue === "function"
        ? (initialValue as () => T)()
        : initialValue !== undefined
          ? initialValue
          : defaultValue;
    }
  };

  // Initialize the reactive reference
  const storedValue = ref<T>(getInitialValue());

  // Update storage when value changes
  if (watchValue) {
    watch(
      storedValue,
      (newValue) => {
        updateStorage(newValue);
      },
      { deep: true },
    );
  }

  /**
   * Write value to storage
   * @param value - Value to store
   */
  const updateStorage = (value: T) => {
    try {
      if (value === null || value === undefined) {
        if (deleteIfNull) {
          storage.removeItem(storageKey);
        } else {
          storage.setItem(storageKey, serialize(value));
        }
      } else {
        storage.setItem(storageKey, serialize(value));
      }
    } catch (error) {
      logger.error(
        `Error writing to localStorage for key ${storageKey}`,
        error,
      );
    }
  };

  /**
   * Update value and storage
   * @param value - New value to set
   */
  const setValue = (value: T | ((prev: T) => T)) => {
    try {
      // Handle functional updates
      const newValue =
        value instanceof Function
          ? (value as (prev: T) => T)(storedValue.value)
          : value;

      // Update the ref
      storedValue.value = newValue;

      // If watching is disabled, manually update storage
      if (!watchValue) {
        updateStorage(newValue);
      }
    } catch (error) {
      logger.error(`Error updating value for key ${storageKey}`, error);
    }
  };

  /**
   * Remove item from storage
   */
  const removeItem = () => {
    try {
      storage.removeItem(storageKey);
      storedValue.value = defaultValue;
    } catch (error) {
      logger.error(`Error removing item for key ${storageKey}`, error);
    }
  };

  /**
   * Check if item exists in storage
   * @returns Whether the item exists
   */
  const hasItem = (): boolean => {
    try {
      return storage.getItem(storageKey) !== null;
    } catch (error) {
      logger.error(
        `Error checking item existence for key ${storageKey}`,
        error,
      );
      return false;
    }
  };

  // Return the ref and utility methods
  return {
    value: storedValue,
    setValue,
    removeItem,
    hasItem,
    key: storageKey,
  };
}

/**
 * Extended return type for our implementation of useLocalStorage
 */
export interface LocalStorageRef<T> extends UseLocalStorageReturn<T> {
  setValue: (value: T | ((prev: T) => T)) => void;
  hasItem: () => boolean;
  key: string;
}

export default useLocalStorage;
