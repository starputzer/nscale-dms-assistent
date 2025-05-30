/**
 * Admin Component Initializer
 *
 * This utility provides a standardized initialization and cleanup process
 * for admin components, ensuring consistent error handling and preventing
 * common lifecycle issues.
 */

import { onMounted } from "vue";
import { useAdminComponentSafeAccess } from "@/components/admin/shared/componentSafeAccessWrapper";
import { handleAdminError } from "./adminErrorHandler";
import { LogService } from "@/services/log/LogService";

// Create a logger instance
const logger = new LogService("AdminComponentInitializer");

interface InitOptions {
  /**
   * Component name for logging and debugging
   */
  componentName: string;

  /**
   * Initial data loading function
   */
  loadData: () => Promise<void>;

  /**
   * Vue component emit function
   */
  emit: any;

  /**
   * Optional custom error message
   */
  errorMessage?: string;

  /**
   * Optional cleanup function to run on unmount
   */
  cleanup?: () => void;

  /**
   * Additional context for error handler
   */
  context?: Record<string, any>;
}

/**
 * Initialize an admin component with standard lifecycle handling
 */
export function initializeAdminComponent(options: InitOptions) {
  const {
    componentName,
    loadData,
    emit,
    errorMessage = `Fehler beim Laden der ${componentName}-Daten`,
    cleanup,
    context = {},
  } = options;

  // Get safe access utilities for this component
  const { isMounted, isUnmounting, registerCleanup, safeMountedExecution } =
    useAdminComponentSafeAccess(componentName);

  // Setup component initialization
  onMounted(async () => {
    logger.debug(`${componentName} mounted, initializing...`);

    try {
      // Load initial data safely
      await safeMountedExecution(async () => {
        if (isMounted.value && !isUnmounting.value) {
          await loadData();
        }
      });
    } catch (error) {
      // Only handle errors if component is still mounted
      if (isMounted.value && !isUnmounting.value) {
        await handleAdminError(error, emit, {
          customMessage: errorMessage,
          context: { ...context, component: componentName },
        });
      }
    }
  });

  // Register the custom cleanup if provided
  if (cleanup) {
    registerCleanup(() => {
      try {
        cleanup();
      } catch (cleanupError) {
        logger.error(`Error during ${componentName} cleanup:`, cleanupError);
      }
    });
  }

  // Return safe access utilities for use in the component
  return {
    isMounted,
    isUnmounting,
    registerCleanup,
    safeMountedExecution,
  };
}

export default { initializeAdminComponent };
