/**
 * Component Lifecycle Utilities
 *
 * Helper functions to safely handle component lifecycle events
 * and prevent common errors during unmounting.
 */

import { onBeforeUnmount, onUnmounted, ref } from "vue";
import { LogService } from "../services/log/LogService";

// Create a logger instance
const logger = new LogService("ComponentLifecycle");

/**
 * Safe access to DOM elements with lifecycle awareness
 * Prevents errors when accessing elements during/after unmounting
 */
export function useSafeElementAccess() {
  // Track component mount state
  const isComponentMounted = ref(true);

  // Set mounted flag to false when component is unmounted
  onBeforeUnmount(() => {
    isComponentMounted.value = false;
    logger.debug("Component marked as unmounting");
  });

  /**
   * Safely access a DOM element reference with proper checks
   * @param elementRef The ref to safely access
   * @returns The element if available and component is mounted, otherwise null
   */
  function safeElementAccess<T>(elementRef: { value: T | null }): T | null {
    // Check if component is still mounted
    if (!isComponentMounted.value) {
      logger.debug("Attempted to access element after component unmount");
      return null;
    }

    // Check if the ref exists
    if (!elementRef) {
      logger.debug("Ref is undefined or null");
      return null;
    }

    // Return the element value
    return elementRef.value;
  }

  return {
    isComponentMounted,
    safeElementAccess,
  };
}

/**
 * Creates a record of cleanup functions to be called on component unmount
 * Ensures proper resource cleanup and prevents memory leaks
 */
export function useCleanupRegistry() {
  // Registry of cleanup functions
  const cleanupFunctions: Array<() => void> = [];

  /**
   * Add a cleanup function to the registry
   * @param cleanupFn The function to call on component unmount
   */
  function registerCleanup(cleanupFn: () => void) {
    cleanupFunctions.push(cleanupFn);
  }

  /**
   * Run a single cleanup function safely
   * @param cleanupFn The function to run
   */
  function safeRunCleanup(cleanupFn: () => void) {
    try {
      cleanupFn();
    } catch (error) {
      logger.error("Error during cleanup function execution:", error);
    }
  }

  // Setup automatic cleanup on component unmount
  onUnmounted(() => {
    logger.debug(`Running ${cleanupFunctions.length} cleanup functions`);

    // Run all cleanup functions in reverse order
    // This ensures proper nested resource cleanup (inner resources cleaned up before outer ones)
    [...cleanupFunctions].reverse().forEach(safeRunCleanup);

    // Clear the registry
    cleanupFunctions.length = 0;
  });

  return {
    registerCleanup,
    safeRunCleanup,
  };
}

/**
 * Creates a safe handler for DOM event listeners
 * Automatically removes listeners on component unmount
 */
export function useSafeEventListeners() {
  const { registerCleanup } = useCleanupRegistry();

  /**
   * Safely add an event listener that will be cleaned up on unmount
   * @param element The element to attach the listener to
   * @param event The event name
   * @param handler The event handler
   * @param options Optional event listener options
   */
  function safeAddEventListener(
    element: EventTarget | null,
    event: string,
    handler: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ) {
    if (!element) {
      logger.warn(`Cannot add ${event} listener to null element`);
      return;
    }

    // Add the listener
    element.addEventListener(event, handler, options);

    // Register cleanup
    registerCleanup(() => {
      try {
        element.removeEventListener(event, handler, options);
      } catch (error) {
        logger.warn(`Error removing ${event} listener:`, error);
      }
    });
  }

  return {
    safeAddEventListener,
  };
}

export default {
  useSafeElementAccess,
  useCleanupRegistry,
  useSafeEventListeners,
};
