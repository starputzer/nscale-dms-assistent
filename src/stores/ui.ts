import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import type { 
  Modal, 
  Toast, 
  SidebarState,
  ViewMode,
  UIState
} from '../types/ui';

/**
 * UI Store zur Verwaltung der Benutzeroberfläche
 * - Steuert UI-Zustände wie Sidebar, Dark Mode, Modals
 * - Verwaltet Toast-Benachrichtigungen
 * - Reagiert auf Viewport-Änderungen
 */
export const useUIStore = defineStore('ui', () => {
  // UI State
  const sidebar = ref<SidebarState>({
    isOpen: true,
    width: 280,
    activeTab: 'chat'
  });
  
  const darkMode = ref<boolean>(false);
  const viewMode = ref<ViewMode>('default');
  const activeModals = ref<Modal[]>([]);
  const toasts = ref<Toast[]>([]);
  const isLoading = ref<boolean>(false);
  const isMobile = ref<boolean>(false);
  const version = ref<number>(1); // Für Migrationen zwischen verschiedenen Speicherformaten
  
  // Getters
  const isDarkMode = computed(() => darkMode.value);
  const sidebarIsOpen = computed(() => sidebar.value.isOpen);
  const currentViewMode = computed(() => viewMode.value);
  const hasActiveModals = computed(() => activeModals.value.length > 0);
  
  // Actions
  /**
   * Dark Mode umschalten
   */
  function toggleDarkMode(): void {
    darkMode.value = !darkMode.value;
    applyDarkMode();
  }
  
  /**
   * Dark Mode aktivieren
   */
  function enableDarkMode(): void {
    darkMode.value = true;
    applyDarkMode();
  }
  
  /**
   * Dark Mode deaktivieren
   */
  function disableDarkMode(): void {
    darkMode.value = false;
    applyDarkMode();
  }
  
  /**
   * Dark Mode anwenden
   */
  function applyDarkMode(): void {
    if (darkMode.value) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }
  
  /**
   * Ansicht umschalten
   */
  function setViewMode(mode: ViewMode): void {
    viewMode.value = mode;
  }
  
  /**
   * Sidebar öffnen
   */
  function openSidebar(): void {
    sidebar.value.isOpen = true;
  }
  
  /**
   * Sidebar schließen
   */
  function closeSidebar(): void {
    sidebar.value.isOpen = false;
  }
  
  /**
   * Sidebar umschalten
   */
  function toggleSidebar(): void {
    sidebar.value.isOpen = !sidebar.value.isOpen;
  }
  
  /**
   * Sidebar-Tab ändern
   */
  function setSidebarTab(tabId: string): void {
    sidebar.value.activeTab = tabId;
    
    // Sidebar öffnen, wenn sie geschlossen ist
    if (!sidebar.value.isOpen) {
      sidebar.value.isOpen = true;
    }
  }
  
  /**
   * Modal öffnen
   */
  function openModal(modalData: Omit<Modal, 'id'>): string {
    const id = uuidv4();
    const modal: Modal = {
      id,
      ...modalData
    };
    
    activeModals.value.push(modal);
    return id;
  }
  
  /**
   * Modal schließen
   */
  function closeModal(modalId: string): void {
    activeModals.value = activeModals.value.filter(modal => modal.id !== modalId);
  }
  
  /**
   * Alle Modals schließen
   */
  function closeAllModals(): void {
    activeModals.value = [];
  }
  
  /**
   * Toast anzeigen
   */
  function showToast(toast: Omit<Toast, 'id'>): string {
    const id = uuidv4();
    const newToast: Toast = {
      id,
      closable: true,
      duration: 5000, // 5 Sekunden Standard
      ...toast
    };
    
    toasts.value.push(newToast);
    
    // Toast nach Ablauf der Zeit automatisch entfernen
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        dismissToast(id);
      }, newToast.duration);
    }
    
    return id;
  }
  
  /**
   * Toast entfernen
   */
  function dismissToast(toastId: string): void {
    toasts.value = toasts.value.filter(toast => toast.id !== toastId);
  }
  
  /**
   * Erfolgsmeldung anzeigen
   */
  function showSuccess(message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>): string {
    return showToast({
      type: 'success',
      message,
      ...options
    });
  }
  
  /**
   * Fehlermeldung anzeigen
   */
  function showError(message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>): string {
    return showToast({
      type: 'error',
      message,
      ...options
    });
  }
  
  /**
   * Warnmeldung anzeigen
   */
  function showWarning(message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>): string {
    return showToast({
      type: 'warning',
      message,
      ...options
    });
  }
  
  /**
   * Infomeldung anzeigen
   */
  function showInfo(message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>): string {
    return showToast({
      type: 'info',
      message,
      ...options
    });
  }
  
  /**
   * Ladezustand setzen
   */
  function setLoading(loading: boolean): void {
    isLoading.value = loading;
  }
  
  /**
   * Viewport-Größe prüfen und entsprechend reagieren
   */
  function checkViewport(): void {
    isMobile.value = window.innerWidth < 768;
    
    // Sidebar auf mobilen Geräten automatisch schließen
    if (isMobile.value && sidebar.value.isOpen) {
      sidebar.value.isOpen = false;
    }
  }
  
  // Migration von Legacy-Daten
  function migrateFromLegacyStorage(): void {
    try {
      // Dark Mode-Einstellung migrieren
      const legacyDarkMode = localStorage.getItem('nscale_darkMode');
      
      if (legacyDarkMode !== null) {
        darkMode.value = legacyDarkMode === 'true';
      }
      
      // Sidebar-Einstellungen migrieren
      const legacySidebarWidth = localStorage.getItem('nscale_sidebarWidth');
      const legacySidebarOpen = localStorage.getItem('nscale_sidebarOpen');
      
      if (legacySidebarWidth !== null) {
        sidebar.value.width = parseInt(legacySidebarWidth, 10);
      }
      
      if (legacySidebarOpen !== null) {
        sidebar.value.isOpen = legacySidebarOpen === 'true';
      }
      
      // View Mode migrieren
      const legacyViewMode = localStorage.getItem('nscale_viewMode');
      
      if (legacyViewMode !== null && (legacyViewMode === 'default' || legacyViewMode === 'compact' || legacyViewMode === 'expanded')) {
        viewMode.value = legacyViewMode as ViewMode;
      }
      
      console.log('UI-Einstellungen aus Legacy-Speicher migriert');
    } catch (error) {
      console.error('Fehler bei der Migration von UI-Daten:', error);
    }
  }

  // Dark Mode basierend auf Systemeinstellungen initialisieren
  function initDarkMode(): void {
    // Prüfen, ob der Benutzer bereits eine Präferenz gesetzt hat
    const savedPreference = localStorage.getItem('nscale_darkMode');
    
    if (savedPreference !== null) {
      darkMode.value = savedPreference === 'true';
    } else {
      // Sonst System-Präferenz verwenden
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      darkMode.value = prefersDark;
    }
    
    applyDarkMode();
    
    // Auf Änderungen der System-Präferenz reagieren
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      // Nur ändern, wenn keine benutzerdefinierte Einstellung vorhanden ist
      if (localStorage.getItem('nscale_darkMode') === null) {
        darkMode.value = e.matches;
        applyDarkMode();
      }
    });
  }
  
  // Persistiere Dark Mode-Einstellung, wenn sie sich ändert
  watch(darkMode, (newValue) => {
    localStorage.setItem('nscale_darkMode', String(newValue));
  });
  
  // Event-Listener für Viewport-Änderungen
  function setupViewportListener(): void {
    checkViewport();
    window.addEventListener('resize', checkViewport);
  }
  
  // Aufräumen, wenn der Store nicht mehr verwendet wird
  function cleanupViewportListener(): void {
    window.removeEventListener('resize', checkViewport);
  }
  
  // Initialisierung
  function initialize(): void {
    migrateFromLegacyStorage();
    initDarkMode();
    setupViewportListener();
  }
  
  // Store initialisieren, wenn er erstellt wird
  initialize();
  
  return {
    // State
    sidebar,
    darkMode,
    viewMode,
    activeModals,
    toasts,
    isLoading,
    isMobile,
    version,
    
    // Getters
    isDarkMode,
    sidebarIsOpen,
    currentViewMode,
    hasActiveModals,
    
    // Actions
    toggleDarkMode,
    enableDarkMode,
    disableDarkMode,
    setViewMode,
    openSidebar,
    closeSidebar,
    toggleSidebar,
    setSidebarTab,
    openModal,
    closeModal,
    closeAllModals,
    showToast,
    dismissToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    setLoading,
    checkViewport,
    initialize,
    cleanupViewportListener,
    migrateFromLegacyStorage
  };
}, {
  // Store serialization options für Persistenz
  persist: {
    enabled: true,
    strategies: [
      {
        // UI-Einstellungen im localStorage speichern
        storage: localStorage,
        paths: ['darkMode', 'sidebar.width', 'sidebar.activeTab', 'sidebar.isOpen', 'viewMode', 'version']
      },
    ],
  },
});