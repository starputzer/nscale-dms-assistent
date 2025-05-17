/**
 * @file UI Bridge Module
 * @description Provides UI functionality for the bridge system,
 * synchronizing theme, toasts, and modals between modern and legacy components.
 * 
 * @redundancy-analysis
 * This module consolidates UI functionality previously scattered across:
 * - bridge/ui.ts
 * - bridge/enhanced/uiBridge.ts
 * - toast bridge in various files
 * - modal management code
 */

import { useUIStore } from '@/stores/ui';
import type { 
  UIBridgeConfig, 
  BridgeError, 
  BridgeResult, 
  BridgeSubscription,
  TypedEventEmitter 
} from '../core/types';
import { success, failure } from '../core/results';
import { BridgeLogger } from '../core/logger';
import type { 
  Modal, 
  Toast, 
  ViewMode, 
  NotificationOptions,
  DialogOptions
} from '@/types/ui';

// Create module-specific logger
const logger = new BridgeLogger('ui');

/**
 * UI bridge state interface
 */
interface UIBridgeState {
  /** Whether the UI bridge is initialized */
  initialized: boolean;
  
  /** Whether UI synchronization is active */
  syncActive: boolean;
  
  /** Tracks modals created through the bridge */
  bridgeCreatedModals: Set<string>;
  
  /** Tracks toasts created through the bridge */
  bridgeCreatedToasts: Set<string>;
  
  /** List of active subscriptions */
  subscriptions: BridgeSubscription[];
}

/**
 * UI bridge API interface
 */
export interface UIBridgeAPI {
  /** Get current theme information */
  getTheme(): { isDarkMode: boolean };
  
  /** Toggle dark mode */
  toggleDarkMode(): BridgeResult<boolean>;
  
  /** Set specific dark mode state */
  setDarkMode(enabled: boolean): BridgeResult<boolean>;
  
  /** Get sidebar state */
  getSidebarState(): { isOpen: boolean; width: number; activeTab: string | null };
  
  /** Toggle sidebar open/closed state */
  toggleSidebar(): BridgeResult<boolean>;
  
  /** Open a modal dialog */
  openModal(options: { component: string; title?: string; props?: any; }): BridgeResult<string>;
  
  /** Close a modal dialog */
  closeModal(modalId: string): BridgeResult<void>;
  
  /** Show a confirmation dialog */
  showConfirmation(message: string, options?: DialogOptions): Promise<BridgeResult<boolean>>;
  
  /** Show a toast notification */
  showToast(message: string, type?: 'info' | 'success' | 'warning' | 'error', options?: NotificationOptions): BridgeResult<string>;
  
  /** Dismiss a toast notification */
  dismissToast(toastId: string): BridgeResult<void>;
  
  /** Set loading state */
  setLoading(isLoading: boolean, message?: string): BridgeResult<void>;
  
  /** Get current view mode */
  getViewMode(): ViewMode;
  
  /** Set view mode */
  setViewMode(mode: ViewMode): BridgeResult<void>;
  
  /** Cleanup resources */
  dispose(): void;
}

/**
 * Default UI bridge configuration
 */
const DEFAULT_UI_CONFIG: Required<UIBridgeConfig> = {
  syncTheme: true,
  syncToasts: true,
  syncModals: true
};

/**
 * Initialize the UI bridge
 * 
 * @param eventBus - The event bus for bridge communication
 * @param config - UI bridge configuration
 * @returns UI bridge API
 */
export function initUIBridge(
  eventBus: TypedEventEmitter,
  config: UIBridgeConfig = {}
): UIBridgeAPI {
  // Merge with default configuration
  const mergedConfig: Required<UIBridgeConfig> = {
    ...DEFAULT_UI_CONFIG,
    ...config
  };
  
  logger.info('Initializing UI bridge', mergedConfig);
  
  // Initialize state
  const state: UIBridgeState = {
    initialized: false,
    syncActive: false,
    bridgeCreatedModals: new Set<string>(),
    bridgeCreatedToasts: new Set<string>(),
    subscriptions: []
  };
  
  // Get the UI store
  const uiStore = useUIStore();
  
  /**
   * Setup legacy synchronization
   * This establishes two-way sync between modern Vue stores and legacy JS
   */
  function setupLegacySynchronization() {
    if (state.syncActive) {
      logger.warn('UI synchronization already active');
      return;
    }
    
    state.syncActive = true;
    
    // Subscribe to UI store changes
    const uiUnwatch = uiStore.$subscribe((mutation, store) => {
      if (mutation.type === 'direct' || mutation.type === 'patch function') {
        // Sicherheitscheck für mutation.payload
        if (!mutation.payload || typeof mutation.payload !== 'object') {
          return;
        }
        
        // If dark mode changes
        if (mergedConfig.syncTheme && mutation.payload && 'darkMode' in mutation.payload) {
          eventBus.emit('ui:themeChanged', { isDarkMode: uiStore.darkMode });
        }
        
        // If sidebar state changes
        if (mutation.payload && 'sidebar' in mutation.payload) {
          eventBus.emit('ui:sidebarToggled', { isOpen: uiStore.sidebar.isOpen });
        }
        
        // If view mode changes
        if (mutation.payload && 'viewMode' in mutation.payload) {
          eventBus.emit('ui:viewChanged', { view: uiStore.viewMode });
        }
        
        // If loading state changes
        if (mutation.payload && 'isLoading' in mutation.payload) {
          eventBus.emit('ui:loadingChanged', { isLoading: uiStore.isLoading });
        }
        
        // If toasts change
        if (mergedConfig.syncToasts && mutation.payload && 'toasts' in mutation.payload) {
          // Only emit for toasts that weren't created through the bridge to avoid loops
          const newToasts = uiStore.toasts.filter(toast => 
            !state.bridgeCreatedToasts.has(toast.id)
          );
          
          if (newToasts.length > 0) {
            eventBus.emit('ui:toastAdded', { toasts: newToasts });
          }
        }
        
        // If modals change
        if (mergedConfig.syncModals && mutation.payload && 'activeModals' in mutation.payload) {
          // Only emit for modals that weren't created through the bridge to avoid loops
          const newModals = uiStore.activeModals.filter(modal => 
            !state.bridgeCreatedModals.has(modal.id)
          );
          
          if (newModals.length > 0) {
            eventBus.emit('ui:modalOpened', { modals: newModals });
          }
          
          // Check for closed modals
          const closedModalIds = Array.from(state.bridgeCreatedModals).filter(
            id => !uiStore.activeModals.some(modal => modal.id === id)
          );
          
          if (closedModalIds.length > 0) {
            closedModalIds.forEach(id => {
              state.bridgeCreatedModals.delete(id);
              eventBus.emit('ui:modalClosed', { modalId: id });
            });
          }
        }
      }
    });
    
    // Listen for legacy UI events
    const themeChangedSub = eventBus.on('vanillaUI:themeChanged', (payload) => {
      if (payload && typeof payload.isDarkMode === 'boolean') {
        logger.debug('Received legacy theme changed event', { isDarkMode: payload.isDarkMode });
        
        // Only update if it's different to avoid loops
        if (uiStore.darkMode !== payload.isDarkMode) {
          uiStore.darkMode = payload.isDarkMode;
        }
      }
    });
    
    const sidebarToggledSub = eventBus.on('vanillaUI:sidebarToggled', (payload) => {
      if (payload && typeof payload.isOpen === 'boolean') {
        logger.debug('Received legacy sidebar toggled event', { isOpen: payload.isOpen });
        
        // Only update if it's different to avoid loops
        if (uiStore.sidebar.isOpen !== payload.isOpen) {
          uiStore.sidebar.isOpen = payload.isOpen;
        }
      }
    });
    
    const viewChangedSub = eventBus.on('vanillaUI:viewChanged', (payload) => {
      if (payload && payload.view) {
        logger.debug('Received legacy view changed event', { view: payload.view });
        
        // Only update if it's different to avoid loops
        if (uiStore.viewMode !== payload.view) {
          uiStore.setViewMode(payload.view as ViewMode);
        }
      }
    });
    
    const showToastSub = eventBus.on('vanillaUI:showToast', (payload) => {
      if (payload && payload.message) {
        logger.debug('Received legacy show toast event', { 
          message: payload.message,
          type: payload.type || 'info'
        });
        
        // Show toast through the store
        const toastId = uiStore.showToast({
          type: payload.type || 'info',
          message: payload.message,
          duration: payload.duration || 5000,
          closable: payload.closable !== false,
          actions: payload.actions
        });
        
        // Track this toast as created through the bridge
        state.bridgeCreatedToasts.add(toastId);
        
        // Cleanup after toast is dismissed
        setTimeout(() => {
          state.bridgeCreatedToasts.delete(toastId);
        }, (payload.duration || 5000) + 1000); // Add a buffer
      }
    });
    
    const dismissToastSub = eventBus.on('vanillaUI:dismissToast', (payload) => {
      if (payload && payload.toastId) {
        logger.debug('Received legacy dismiss toast event', { toastId: payload.toastId });
        
        // Dismiss toast through the store
        uiStore.dismissToast(payload.toastId);
        
        // Remove from bridge-created toasts
        state.bridgeCreatedToasts.delete(payload.toastId);
      }
    });
    
    const openModalSub = eventBus.on('vanillaUI:openModal', (payload) => {
      if (payload && payload.component) {
        logger.debug('Received legacy open modal event', { 
          component: payload.component,
          title: payload.title
        });
        
        // Open modal through the store
        const modalId = uiStore.openModal({
          component: payload.component,
          title: payload.title,
          props: payload.props,
          options: payload.options
        });
        
        // Track this modal as created through the bridge
        state.bridgeCreatedModals.add(modalId);
        
        // Emit the modal ID back to legacy code
        eventBus.emit('ui:modalOpened', { modalId });
      }
    });
    
    const closeModalSub = eventBus.on('vanillaUI:closeModal', (payload) => {
      if (payload && payload.modalId) {
        logger.debug('Received legacy close modal event', { modalId: payload.modalId });
        
        // Close modal through the store
        uiStore.closeModal(payload.modalId);
        
        // Remove from bridge-created modals
        state.bridgeCreatedModals.delete(payload.modalId);
      }
    });
    
    const setLoadingSub = eventBus.on('vanillaUI:setLoading', (payload) => {
      if (payload && typeof payload.isLoading === 'boolean') {
        logger.debug('Received legacy set loading event', { 
          isLoading: payload.isLoading,
          message: payload.message
        });
        
        // Update loading state through the store
        uiStore.setLoading(payload.isLoading, payload.message);
      }
    });
    
    // Add subscriptions to state for later cleanup
    state.subscriptions.push(
      themeChangedSub,
      sidebarToggledSub,
      viewChangedSub,
      showToastSub,
      dismissToastSub,
      openModalSub,
      closeModalSub,
      setLoadingSub
    );
    
    // Add cleanup function for store unwatcher
    state.subscriptions.push({
      unsubscribe: uiUnwatch,
      pause: () => {},
      resume: () => {},
      id: 'ui-store-unwatcher'
    });
    
    logger.info('UI synchronization established');
  }
  
  /**
   * Initialize the UI bridge
   */
  function initialize() {
    if (state.initialized) {
      logger.warn('UI bridge already initialized');
      return;
    }
    
    // Setup synchronization between modern and legacy systems
    setupLegacySynchronization();
    
    // Emit initialized event
    eventBus.emit('ui:initialized', {});
    
    // Emit current state events
    eventBus.emit('ui:themeChanged', { isDarkMode: uiStore.darkMode });
    eventBus.emit('ui:sidebarToggled', { isOpen: uiStore.sidebar.isOpen });
    eventBus.emit('ui:viewChanged', { view: uiStore.viewMode });
    
    state.initialized = true;
    logger.info('UI bridge initialized');
  }
  
  /**
   * Cleanup UI bridge resources
   */
  function dispose() {
    logger.debug('Disposing UI bridge resources');
    
    // Unsubscribe from all events
    state.subscriptions.forEach(subscription => {
      subscription.unsubscribe();
    });
    
    // Clear the state
    state.subscriptions = [];
    state.syncActive = false;
    state.initialized = false;
    state.bridgeCreatedModals.clear();
    state.bridgeCreatedToasts.clear();
    
    logger.info('UI bridge disposed');
  }
  
  // Public API
  const api: UIBridgeAPI = {
    getTheme() {
      return { isDarkMode: uiStore.darkMode };
    },
    
    toggleDarkMode() {
      try {
        logger.debug('Toggling dark mode');
        
        uiStore.toggleDarkMode();
        
        // If sync is enabled, we need to emit the event
        if (mergedConfig.syncTheme) {
          eventBus.emit('ui:themeChanged', { isDarkMode: uiStore.darkMode });
        }
        
        return success(uiStore.darkMode);
      } catch (error) {
        logger.error('Exception during dark mode toggle', error);
        
        return failure(
          'Exception during dark mode toggle',
          'UI_DARK_MODE_ERROR',
          { originalError: error instanceof Error ? error.message : String(error) },
          error
        );
      }
    },
    
    setDarkMode(enabled: boolean) {
      try {
        logger.debug('Setting dark mode', { enabled });
        
        if (enabled) {
          uiStore.enableDarkMode();
        } else {
          uiStore.disableDarkMode();
        }
        
        // If sync is enabled, we need to emit the event
        if (mergedConfig.syncTheme) {
          eventBus.emit('ui:themeChanged', { isDarkMode: uiStore.darkMode });
        }
        
        return success(uiStore.darkMode);
      } catch (error) {
        logger.error('Exception during dark mode setting', error);
        
        return failure(
          'Exception during dark mode setting',
          'UI_DARK_MODE_ERROR',
          { enabled, originalError: error instanceof Error ? error.message : String(error) },
          error
        );
      }
    },
    
    getSidebarState() {
      return { 
        isOpen: uiStore.sidebar.isOpen,
        width: uiStore.sidebar.width,
        activeTab: uiStore.sidebar.activeTab
      };
    },
    
    toggleSidebar() {
      try {
        logger.debug('Toggling sidebar');
        
        uiStore.toggleSidebar();
        
        // Emit the sidebar toggled event
        eventBus.emit('ui:sidebarToggled', { isOpen: uiStore.sidebar.isOpen });
        
        return success(uiStore.sidebar.isOpen);
      } catch (error) {
        logger.error('Exception during sidebar toggle', error);
        
        return failure(
          'Exception during sidebar toggle',
          'UI_SIDEBAR_ERROR',
          { originalError: error instanceof Error ? error.message : String(error) },
          error
        );
      }
    },
    
    openModal(options) {
      try {
        logger.debug('Opening modal', { 
          component: options.component,
          title: options.title
        });
        
        // Open modal through the store
        const modalId = uiStore.openModal({
          component: options.component,
          title: options.title,
          props: options.props,
          options: { closeOnOverlayClick: true }
        });
        
        // Track this modal as created through the bridge
        state.bridgeCreatedModals.add(modalId);
        
        // If sync is enabled, we need to emit the event
        if (mergedConfig.syncModals) {
          eventBus.emit('ui:modalOpened', { modalId });
        }
        
        return success(modalId);
      } catch (error) {
        logger.error('Exception during modal opening', error);
        
        return failure(
          'Exception during modal opening',
          'UI_MODAL_ERROR',
          { 
            component: options.component,
            originalError: error instanceof Error ? error.message : String(error) 
          },
          error
        );
      }
    },
    
    closeModal(modalId: string) {
      try {
        logger.debug('Closing modal', { modalId });
        
        // Close modal through the store
        uiStore.closeModal(modalId);
        
        // Remove from bridge-created modals
        state.bridgeCreatedModals.delete(modalId);
        
        // If sync is enabled, we need to emit the event
        if (mergedConfig.syncModals) {
          eventBus.emit('ui:modalClosed', { modalId });
        }
        
        return success(undefined);
      } catch (error) {
        logger.error('Exception during modal closing', error);
        
        return failure(
          'Exception during modal closing',
          'UI_MODAL_ERROR',
          { modalId, originalError: error instanceof Error ? error.message : String(error) },
          error
        );
      }
    },
    
    async showConfirmation(message: string, options?: DialogOptions) {
      try {
        logger.debug('Showing confirmation dialog', { message });
        
        // Show confirmation through the store
        const result = await uiStore.confirm(message, options);
        
        return success(result);
      } catch (error) {
        logger.error('Exception during confirmation dialog', error);
        
        return failure(
          'Exception during confirmation dialog',
          'UI_CONFIRMATION_ERROR',
          { message, originalError: error instanceof Error ? error.message : String(error) },
          error
        );
      }
    },
    
    showToast(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', options?: NotificationOptions) {
      try {
        logger.debug('Showing toast', { message, type });
        
        // Format the options for the store
        const toastOptions: Partial<Toast> = {
          type,
          message,
          duration: options?.duration || 5000,
          closable: options?.closable !== false,
          actions: options?.actions
        };
        
        // Show toast through the store
        const toastId = uiStore.showToast(toastOptions);
        
        // Track this toast as created through the bridge
        state.bridgeCreatedToasts.add(toastId);
        
        // Cleanup after toast is dismissed
        setTimeout(() => {
          state.bridgeCreatedToasts.delete(toastId);
        }, (options?.duration || 5000) + 1000); // Add a buffer
        
        // If sync is enabled, we need to emit the event
        if (mergedConfig.syncToasts) {
          eventBus.emit('ui:toastAdded', { 
            toastId,
            type,
            message
          });
        }
        
        return success(toastId);
      } catch (error) {
        logger.error('Exception during toast display', error);
        
        return failure(
          'Exception during toast display',
          'UI_TOAST_ERROR',
          { 
            message, 
            type,
            originalError: error instanceof Error ? error.message : String(error) 
          },
          error
        );
      }
    },
    
    dismissToast(toastId: string) {
      try {
        logger.debug('Dismissing toast', { toastId });
        
        // Dismiss toast through the store
        uiStore.dismissToast(toastId);
        
        // Remove from bridge-created toasts
        state.bridgeCreatedToasts.delete(toastId);
        
        // If sync is enabled, we need to emit the event
        if (mergedConfig.syncToasts) {
          eventBus.emit('ui:toastDismissed', { toastId });
        }
        
        return success(undefined);
      } catch (error) {
        logger.error('Exception during toast dismissal', error);
        
        return failure(
          'Exception during toast dismissal',
          'UI_TOAST_ERROR',
          { toastId, originalError: error instanceof Error ? error.message : String(error) },
          error
        );
      }
    },
    
    setLoading(isLoading: boolean, message?: string) {
      try {
        logger.debug('Setting loading state', { isLoading, message });
        
        // Update loading state through the store
        uiStore.setLoading(isLoading, message);
        
        // Emit loading state changed event
        eventBus.emit('ui:loadingChanged', { isLoading, message });
        
        return success(undefined);
      } catch (error) {
        logger.error('Exception during loading state update', error);
        
        return failure(
          'Exception during loading state update',
          'UI_LOADING_ERROR',
          { 
            isLoading,
            message,
            originalError: error instanceof Error ? error.message : String(error) 
          },
          error
        );
      }
    },
    
    getViewMode() {
      return uiStore.viewMode;
    },
    
    setViewMode(mode: ViewMode) {
      try {
        logger.debug('Setting view mode', { mode });
        
        // Update view mode through the store
        uiStore.setViewMode(mode);
        
        // Emit view changed event
        eventBus.emit('ui:viewChanged', { view: mode });
        
        return success(undefined);
      } catch (error) {
        logger.error('Exception during view mode update', error);
        
        return failure(
          'Exception during view mode update',
          'UI_VIEW_MODE_ERROR',
          { mode, originalError: error instanceof Error ? error.message : String(error) },
          error
        );
      }
    },
    
    dispose
  };
  
  // Initialize the UI bridge
  initialize();
  
  // Return the API
  return api;
}