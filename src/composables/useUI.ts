import { computed } from 'vue';
import { useUIStore } from '../stores/ui';
import type { Modal, Toast, ViewMode } from '../types/ui';

/**
 * Hook für UI-Funktionen in Komponenten
 * Kapselt den Zugriff auf den UI-Store und bietet eine vereinfachte API
 */
export function useUI() {
  const uiStore = useUIStore();
  
  // Computed Properties für reaktive Daten
  const isDarkMode = computed(() => uiStore.isDarkMode);
  const sidebarIsOpen = computed(() => uiStore.sidebarIsOpen);
  const sidebarActiveTab = computed(() => uiStore.sidebar.activeTab);
  const viewMode = computed(() => uiStore.currentViewMode);
  const modals = computed(() => uiStore.activeModals);
  const toasts = computed(() => uiStore.toasts);
  const isMobile = computed(() => uiStore.isMobile);
  const isLoading = computed(() => uiStore.isLoading);
  
  /**
   * Dark Mode umschalten
   */
  const toggleDarkMode = (): void => {
    uiStore.toggleDarkMode();
  };
  
  /**
   * Sidebar öffnen
   */
  const openSidebar = (): void => {
    uiStore.openSidebar();
  };
  
  /**
   * Sidebar schließen
   */
  const closeSidebar = (): void => {
    uiStore.closeSidebar();
  };
  
  /**
   * Sidebar umschalten
   */
  const toggleSidebar = (): void => {
    uiStore.toggleSidebar();
  };
  
  /**
   * Aktiven Sidebar-Tab setzen
   */
  const setSidebarTab = (tabId: string): void => {
    uiStore.setSidebarTab(tabId);
  };
  
  /**
   * Ansichtsmodus ändern
   */
  const setViewMode = (mode: ViewMode): void => {
    uiStore.setViewMode(mode);
  };
  
  /**
   * Modal öffnen
   */
  const openModal = (modalData: Omit<Modal, 'id'>): string => {
    return uiStore.openModal(modalData);
  };
  
  /**
   * Modal schließen
   */
  const closeModal = (modalId: string): void => {
    uiStore.closeModal(modalId);
  };
  
  /**
   * Alle Modals schließen
   */
  const closeAllModals = (): void => {
    uiStore.closeAllModals();
  };
  
  /**
   * Benachrichtigung anzeigen
   */
  const showToast = (toast: Omit<Toast, 'id'>): string => {
    return uiStore.showToast(toast);
  };
  
  /**
   * Erfolgsbenachrichtigung anzeigen
   */
  const showSuccess = (message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>): string => {
    return uiStore.showSuccess(message, options);
  };
  
  /**
   * Fehlerbenachrichtigung anzeigen
   */
  const showError = (message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>): string => {
    return uiStore.showError(message, options);
  };
  
  /**
   * Warnbenachrichtigung anzeigen
   */
  const showWarning = (message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>): string => {
    return uiStore.showWarning(message, options);
  };
  
  /**
   * Infobenachrichtigung anzeigen
   */
  const showInfo = (message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>): string => {
    return uiStore.showInfo(message, options);
  };
  
  /**
   * Benachrichtigung entfernen
   */
  const dismissToast = (toastId: string): void => {
    uiStore.dismissToast(toastId);
  };
  
  /**
   * Ladezustand setzen
   */
  const setLoading = (loading: boolean): void => {
    uiStore.setLoading(loading);
  };
  
  return {
    // Computed Properties
    isDarkMode,
    sidebarIsOpen,
    sidebarActiveTab,
    viewMode,
    modals,
    toasts,
    isMobile,
    isLoading,
    
    // Methoden
    toggleDarkMode,
    openSidebar,
    closeSidebar,
    toggleSidebar,
    setSidebarTab,
    setViewMode,
    openModal,
    closeModal,
    closeAllModals,
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    dismissToast,
    setLoading
  };
}