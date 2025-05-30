/**
 * Component Safe Access Wrapper for Admin Components
 *
 * This utility provides a standardized way to handle component lifecycle
 * for admin components, preventing common errors during unmounting.
 */

import { onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { LogService } from "@/services/log/LogService";

// Logger instance for this utility
const logger = new LogService("AdminComponentWrapper");

/**
 * Creates a safe wrapper for admin component lifecycle
 * @param componentName The name of the component (for logging)
 * @returns Object with lifecycle state and helper methods
 */
export function useAdminComponentSafeAccess(componentName: string) {
  // Track component mount state
  const isMounted = ref(false);
  const isUnmounting = ref(false);

  // State for tracking cleanup items
  const cleanupRegistry = reactive<Array<() => void>>([]);

  // Set mount state when component is mounted
  onMounted(() => {
    isMounted.value = true;
    isUnmounting.value = false;
    logger.debug(`${componentName} mounted`);
  });

  // Clear mount state when component is about to unmount
  onBeforeUnmount(() => {
    isUnmounting.value = true;
    logger.debug(
      `${componentName} unmounting, running ${cleanupRegistry.length} cleanup functions`,
    );

    // Run all cleanup functions in reverse order
    [...cleanupRegistry].reverse().forEach((cleanupFn: any) => {
      try {
        cleanupFn();
      } catch (error) {
        logger.error(`Error in ${componentName} cleanup:`, error);
      }
    });

    // Clear cleanup registry
    cleanupRegistry.length = 0;

    // Finally mark as unmounted
    isMounted.value = false;
  });

  /**
   * Safely access a DOM element reference with proper checks
   */
  function safeElementAccess<T>(elementRef: { value: T | null }): T | null {
    // If component is unmounting or not mounted, return null
    if (isUnmounting.value || !isMounted.value) {
      return null;
    }

    // Return the element if available
    return elementRef?.value || null;
  }

  /**
   * Register a function to be called during component cleanup
   */
  function registerCleanup(cleanupFn: () => void) {
    // Add to registry only if component is still mounted
    if (isMounted.value && !isUnmounting.value) {
      cleanupRegistry.push(cleanupFn);
    } else {
      // If component is already unmounting, run cleanup immediately
      try {
        cleanupFn();
      } catch (error) {
        logger.error(
          `Error running immediate cleanup for ${componentName}:`,
          error,
        );
      }
    }
  }

  /**
   * Safely add an event listener that will be removed on unmount
   */
  function safeAddEventListener(
    element: EventTarget | null,
    event: string,
    handler: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ) {
    // Ignore if element is null or component is unmounting
    if (!element || isUnmounting.value || !isMounted.value) {
      return;
    }

    // Add the event listener
    element.addEventListener(event, handler, options);

    // Register function to remove the listener on unmount
    registerCleanup(() => {
      if (element) {
        element.removeEventListener(event, handler, options);
      }
    });
  }

  /**
   * Safely execute a function only if component is mounted
   */
  function safeMountedExecution<T>(fn: () => T): T | null {
    if (isUnmounting.value || !isMounted.value) {
      return null;
    }

    try {
      return fn();
    } catch (error) {
      logger.error(`Error in ${componentName} safeMountedExecution:`, error);
      return null;
    }
  }

  return {
    isMounted,
    isUnmounting,
    safeElementAccess,
    registerCleanup,
    safeAddEventListener,
    safeMountedExecution,
  };
}

export default { useAdminComponentSafeAccess };
