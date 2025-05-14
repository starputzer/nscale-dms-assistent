/**
 * UIStore - Spezialisierter Store für UI-Zustände
 * 
 * Diese Datei definiert einen generischen Store für UI-Zustände wie
 * Modals, Toasts, Sidebar, Dark-Mode, Viewport-Größe und andere
 * layoutbezogene Einstellungen mit standardisierten Methoden.
 */

import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import type { DeepPartial } from '@/types/utilities';
import type { AppError, ErrorSeverity } from '@/types/errors';
import { createBaseStore, BaseStoreOptions, BaseStoreReturn } from './BaseStore';

/**
 * Interface für Modal-Konfiguration
 */
export interface Modal {
  id: string;
  title?: string;
  content?: string;
  component?: string;
  componentProps?: Record<string, any>;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  position?: 'center' | 'top' | 'right' | 'bottom' | 'left';
  closeOnEscape?: boolean;
  closeOnClickOutside?: boolean;
  persistent?: boolean;
  customClass?: string;
  buttons?: Array<{
    id: string;
    label: string;
    variant?: 'primary' | 'secondary' | 'tertiary' | 'danger' | 'success' | 'warning' | 'info';
    action?: () => void | Promise<void>;
  }>;
  onClose?: () => void;
  onConfirm?: () => void;
}

/**
 * Interface für Toast-Benachrichtigungen
 */
export interface Toast {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message: string;
  timeout?: number;
  actions?: Array<{
    id: string;
    label: string;
    action: () => void;
  }>;
  dismissible?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';
  icon?: string;
  onClose?: () => void;
}

/**
 * Interface für Sidebar-Konfiguration
 */
export interface SidebarConfig {
  isOpen: boolean;
  width: number;
  activeTab: string | null;
  collapsed?: boolean;
  minWidth?: number;
  maxWidth?: number;
  resizable?: boolean;
  collapsible?: boolean;
}

/**
 * Interface für Layout-Konfiguration
 */
export interface LayoutConfig {
  contentWidth: 'fluid' | 'fixed' | 'wide' | 'narrow';
  density: 'compact' | 'comfortable' | 'spacious';
  navigationPosition: 'sidebar' | 'top' | 'both' | 'none';
  sidebarPosition: 'left' | 'right';
}

/**
 * Interface für Viewport-Informationen
 */
export interface ViewportInfo {
  width: number;
  height: number;
  breakpoint: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  orientation: 'portrait' | 'landscape';
}

/**
 * Interface für Dialog-Konfiguration
 */
export interface DialogConfig {
  title?: string;
  message: string;
  type?: 'info' | 'warning' | 'error' | 'success' | 'confirm' | 'prompt';
  confirmText?: string;
  cancelText?: string;
  inputType?: string;
  inputPlaceholder?: string;
  inputValue?: string;
  inputValidator?: (value: string) => boolean | string;
}

/**
 * Interface für Ladeindikator-Konfiguration
 */
export interface LoadingIndicator {
  active: boolean;
  message?: string;
  progress?: number;
  cancelable?: boolean;
  onCancel?: () => void;
}

/**
 * Interface für UI-Store-Zustand
 */
export interface UIStoreState {
  /**
   * Dark-Mode aktiviert?
   */
  darkMode: boolean;
  
  /**
   * Systemweiter Theme-Modus
   */
  themeMode: 'light' | 'dark' | 'system';
  
  /**
   * Aktive Modals
   */
  modals: Modal[];
  
  /**
   * Aktive Toast-Benachrichtigungen
   */
  toasts: Toast[];
  
  /**
   * Sidebar-Konfiguration
   */
  sidebar: SidebarConfig;
  
  /**
   * Aktuelle Viewport-Informationen
   */
  viewport: ViewportInfo;
  
  /**
   * Layout-Konfiguration
   */
  layout: LayoutConfig;
  
  /**
   * Globaler Ladezustand
   */
  loading: LoadingIndicator;
  
  /**
   * Läuft die Anwendung im Vollbildmodus?
   */
  isFullscreen: boolean;
  
  /**
   * Letzte Fehler für UI-Anzeige
   */
  lastError: {
    message: string;
    code?: string;
    timestamp: number;
  } | null;
  
  /**
   * Aktivierte Barrierefreiheitsoptionen
   */
  a11y: {
    reduceMotion: boolean;
    highContrast: boolean;
    largeText: boolean;
    focusVisible: boolean;
  };
  
  /**
   * Benutzerdefinierte UI-Einstellungen
   */
  preferences: Record<string, any>;
}

/**
 * Optionen für UIStore-Konfiguration
 */
export interface UIStoreOptions extends BaseStoreOptions<UIStoreState> {
  /**
   * Standardwert für Dark-Mode
   */
  defaultDarkMode?: boolean;
  
  /**
   * Automatisch Dark-Mode basierend auf System-Präferenzen aktivieren
   */
  autoDetectDarkMode?: boolean;
  
  /**
   * Standard-Sidebar-Konfiguration
   */
  defaultSidebarConfig?: Partial<SidebarConfig>;
  
  /**
   * Standard-Layout-Konfiguration
   */
  defaultLayoutConfig?: Partial<LayoutConfig>;
  
  /**
   * Automatische Viewport-Erkennung aktivieren
   */
  enableViewportDetection?: boolean;
  
  /**
   * Toast-Standarddauer in Millisekunden
   */
  defaultToastDuration?: number;
  
  /**
   * Viewport-Breakpoints
   */
  breakpoints?: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
}

/**
 * Generischer UIStore für UI-Zustände
 * 
 * Bietet erweiterte Funktionen für:
 * - Dark-Mode-Management
 * - Modal-Management (öffnen, schließen, bestätigen)
 * - Toast-Benachrichtigungen
 * - Sidebar-Konfiguration
 * - Viewport-Erkennung
 * - Layout-Anpassungen
 * - Barrierefreiheitsoptionen
 */
export function createUIStore(
  options: UIStoreOptions
) {
  // Standardwerte für Optionen
  const defaultToastDuration = options.defaultToastDuration || 5000; // 5 Sekunden
  const breakpoints = options.breakpoints || {
    xs: 0,
    sm: 576,
    md: 768,
    lg: 992,
    xl: 1200,
    xxl: 1400,
  };
  
  // Basisstore erstellen mit zugeordnetem Zustandstyp
  const baseStore = createBaseStore<UIStoreState>({
    ...options,
    initialState: {
      darkMode: options.defaultDarkMode || false,
      themeMode: 'system',
      modals: [],
      toasts: [],
      sidebar: {
        isOpen: true,
        width: 280,
        activeTab: null,
        collapsed: false,
        minWidth: 220,
        maxWidth: 400,
        resizable: true,
        collapsible: true,
        ...options.defaultSidebarConfig,
      },
      viewport: {
        width: typeof window !== 'undefined' ? window.innerWidth : 1024,
        height: typeof window !== 'undefined' ? window.innerHeight : 768,
        breakpoint: 'lg',
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        orientation: 'landscape',
      },
      layout: {
        contentWidth: 'fluid',
        density: 'comfortable',
        navigationPosition: 'sidebar',
        sidebarPosition: 'left',
        ...options.defaultLayoutConfig,
      },
      loading: {
        active: false,
        message: '',
        progress: 0,
        cancelable: false,
      },
      isFullscreen: false,
      lastError: null,
      a11y: {
        reduceMotion: false,
        highContrast: false,
        largeText: false,
        focusVisible: true,
      },
      preferences: {},
      ...options.initialState,
    },
  });
  
  return defineStore(`${options.name}-ui`, () => {
    // Basis-Store-Funktionalität initialisieren
    const base = baseStore();
    
    // ResizeObserver für Viewport-Erkennung
    let resizeObserver: ResizeObserver | null = null;
    
    // System-Farbschema-Media-Query
    let darkModeMediaQuery: MediaQueryList | null = null;
    
    // Zustände aus Basis-Store
    const darkMode = computed(() => base.state.darkMode);
    const themeMode = computed(() => base.state.themeMode);
    const modals = computed(() => base.state.modals);
    const toasts = computed(() => base.state.toasts);
    const sidebar = computed(() => base.state.sidebar);
    const viewport = computed(() => base.state.viewport);
    const layout = computed(() => base.state.layout);
    const loading = computed(() => base.state.loading);
    
    // Abgeleitete Eigenschaften
    /**
     * Gibt es aktive Modals?
     */
    const hasActiveModals = computed((): boolean => {
      return modals.value.length > 0;
    });
    
    /**
     * Aktuell aktives Modal (zuletzt geöffnetes)
     */
    const currentModal = computed((): Modal | null => {
      return modals.value.length > 0 ? modals.value[modals.value.length - 1] : null;
    });
    
    /**
     * Dark-Mode aktivieren oder deaktivieren
     */
    function toggleDarkMode(): void {
      base.state.darkMode = !base.state.darkMode;
      applyTheme();
    }
    
    /**
     * Forcierte Aktivierung des Dark-Mode
     */
    function enableDarkMode(): void {
      base.state.darkMode = true;
      applyTheme();
    }
    
    /**
     * Forcierte Deaktivierung des Dark-Mode
     */
    function disableDarkMode(): void {
      base.state.darkMode = false;
      applyTheme();
    }
    
    /**
     * Theme-Modus einstellen (light, dark, system)
     */
    function setThemeMode(mode: 'light' | 'dark' | 'system'): void {
      base.state.themeMode = mode;
      
      if (mode === 'system') {
        // System-Präferenz verwenden
        if (darkModeMediaQuery) {
          base.state.darkMode = darkModeMediaQuery.matches;
        }
      } else {
        // Expliziten Modus verwenden
        base.state.darkMode = mode === 'dark';
      }
      
      applyTheme();
    }
    
    /**
     * Theme auf das DOM anwenden
     */
    function applyTheme(): void {
      if (typeof document !== 'undefined') {
        if (base.state.darkMode) {
          document.documentElement.classList.add('dark-mode');
          document.documentElement.classList.remove('light-mode');
        } else {
          document.documentElement.classList.add('light-mode');
          document.documentElement.classList.remove('dark-mode');
        }
      }
    }
    
    /**
     * Detektieren der System-Farbschema-Präferenz
     */
    function setupDarkModeDetection(): void {
      if (typeof window !== 'undefined' && options.autoDetectDarkMode) {
        darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        // Initial setzen
        if (base.state.themeMode === 'system') {
          base.state.darkMode = darkModeMediaQuery.matches;
          applyTheme();
        }
        
        // Listener für Änderungen
        const darkModeChangeHandler = (e: MediaQueryListEvent) => {
          if (base.state.themeMode === 'system') {
            base.state.darkMode = e.matches;
            applyTheme();
          }
        };
        
        // Event-Listener hinzufügen
        if (darkModeMediaQuery.addEventListener) {
          darkModeMediaQuery.addEventListener('change', darkModeChangeHandler);
        } else if ('addListener' in darkModeMediaQuery) {
          // Fallback für ältere Browser
          (darkModeMediaQuery as any).addListener(darkModeChangeHandler);
        }
      }
    }
    
    /**
     * Viewport-Informationen aktualisieren
     */
    function updateViewport(): void {
      if (typeof window !== 'undefined') {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        // Breakpoint bestimmen
        let breakpoint: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' = 'xs';
        if (width >= breakpoints.xxl) breakpoint = 'xxl';
        else if (width >= breakpoints.xl) breakpoint = 'xl';
        else if (width >= breakpoints.lg) breakpoint = 'lg';
        else if (width >= breakpoints.md) breakpoint = 'md';
        else if (width >= breakpoints.sm) breakpoint = 'sm';
        
        // Gerätetyp bestimmen
        const isMobile = width < breakpoints.md;
        const isTablet = width >= breakpoints.md && width < breakpoints.lg;
        const isDesktop = width >= breakpoints.lg;
        
        // Orientierung bestimmen
        const orientation = width >= height ? 'landscape' : 'portrait';
        
        // Viewport-Informationen aktualisieren
        base.state.viewport = {
          width,
          height,
          breakpoint,
          isMobile,
          isTablet,
          isDesktop,
          orientation,
        };
        
        // Sidebar bei Mobilgeräten automatisch einklappen
        if (isMobile && base.state.sidebar.isOpen && !base.state.sidebar.collapsed) {
          base.state.sidebar.collapsed = true;
        }
      }
    }
    
    /**
     * ResizeObserver für Viewport-Erkennung einrichten
     */
    function setupViewportDetection(): void {
      if (typeof window !== 'undefined' && options.enableViewportDetection) {
        // Initial aktualisieren
        updateViewport();
        
        // ResizeObserver für kontinuierliche Aktualisierung
        if ('ResizeObserver' in window) {
          resizeObserver = new ResizeObserver(updateViewport);
          resizeObserver.observe(document.documentElement);
        } else {
          // Fallback für ältere Browser
          window.addEventListener('resize', updateViewport);
        }
      }
    }
    
    /**
     * Modal öffnen
     */
    function openModal(modal: Omit<Modal, 'id'>): string {
      const id = modal.id || `modal-${Date.now()}`;
      const newModal: Modal = {
        ...modal,
        id,
      };
      
      base.state.modals.push(newModal);
      return id;
    }
    
    /**
     * Modal schließen
     */
    function closeModal(modalId: string): void {
      const modalIndex = base.state.modals.findIndex(m => m.id === modalId);
      
      if (modalIndex !== -1) {
        const modal = base.state.modals[modalIndex];
        
        // onClose-Callback aufrufen, falls vorhanden
        if (modal.onClose) {
          modal.onClose();
        }
        
        // Modal entfernen
        base.state.modals.splice(modalIndex, 1);
      }
    }
    
    /**
     * Alle Modals schließen
     */
    function closeAllModals(): void {
      // onClose-Callbacks aufrufen
      base.state.modals.forEach(modal => {
        if (modal.onClose) {
          modal.onClose();
        }
      });
      
      // Alle Modals entfernen
      base.state.modals = [];
    }
    
    /**
     * Bestätigungs-Dialog anzeigen
     */
    function confirm(message: string, options: Partial<DialogConfig> = {}): Promise<boolean> {
      return new Promise(resolve => {
        const modalId = openModal({
          title: options.title || 'Bestätigung',
          content: message,
          size: 'sm',
          position: 'center',
          closeOnEscape: false,
          closeOnClickOutside: false,
          persistent: true,
          buttons: [
            {
              id: 'cancel',
              label: options.cancelText || 'Abbrechen',
              variant: 'secondary',
              action: () => {
                closeModal(modalId);
                resolve(false);
              },
            },
            {
              id: 'confirm',
              label: options.confirmText || 'OK',
              variant: 'primary',
              action: () => {
                closeModal(modalId);
                resolve(true);
              },
            },
          ],
          onClose: () => {
            resolve(false);
          },
        });
      });
    }
    
    /**
     * Eingabe-Dialog anzeigen
     */
    function prompt(message: string, options: Partial<DialogConfig> = {}): Promise<string | null> {
      return new Promise(resolve => {
        let inputValue = options.inputValue || '';
        
        const modalId = openModal({
          title: options.title || 'Eingabe',
          content: message,
          component: 'PromptDialog',
          componentProps: {
            message,
            inputType: options.inputType || 'text',
            inputPlaceholder: options.inputPlaceholder || '',
            inputValue,
            onInput: (value: string) => {
              inputValue = value;
            },
          },
          size: 'sm',
          position: 'center',
          closeOnEscape: false,
          closeOnClickOutside: false,
          persistent: true,
          buttons: [
            {
              id: 'cancel',
              label: options.cancelText || 'Abbrechen',
              variant: 'secondary',
              action: () => {
                closeModal(modalId);
                resolve(null);
              },
            },
            {
              id: 'confirm',
              label: options.confirmText || 'OK',
              variant: 'primary',
              action: () => {
                if (options.inputValidator) {
                  const validationResult = options.inputValidator(inputValue);
                  if (validationResult !== true) {
                    // Validierungsfehler
                    showError(typeof validationResult === 'string' ? validationResult : 'Ungültige Eingabe');
                    return;
                  }
                }
                
                closeModal(modalId);
                resolve(inputValue);
              },
            },
          ],
          onClose: () => {
            resolve(null);
          },
        });
      });
    }
    
    /**
     * Toast-Benachrichtigung anzeigen
     */
    function showToast(toast: Omit<Toast, 'id'>): string {
      const id = toast.id || `toast-${Date.now()}`;
      const newToast: Toast = {
        ...toast,
        id,
        timeout: toast.timeout || defaultToastDuration,
        dismissible: toast.dismissible !== false,
      };
      
      base.state.toasts.push(newToast);
      
      // Automatisches Entfernen nach Timeout
      if (newToast.timeout && newToast.timeout > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, newToast.timeout);
      }
      
      return id;
    }
    
    /**
     * Toast-Benachrichtigung entfernen
     */
    function dismissToast(toastId: string): void {
      const toastIndex = base.state.toasts.findIndex(t => t.id === toastId);
      
      if (toastIndex !== -1) {
        const toast = base.state.toasts[toastIndex];
        
        // onClose-Callback aufrufen, falls vorhanden
        if (toast.onClose) {
          toast.onClose();
        }
        
        // Toast entfernen
        base.state.toasts.splice(toastIndex, 1);
      }
    }
    
    /**
     * Alle Toast-Benachrichtigungen entfernen
     */
    function clearToasts(): void {
      // onClose-Callbacks aufrufen
      base.state.toasts.forEach(toast => {
        if (toast.onClose) {
          toast.onClose();
        }
      });
      
      // Alle Toasts entfernen
      base.state.toasts = [];
    }
    
    /**
     * Erfolgs-Toast anzeigen
     */
    function showSuccess(message: string, options: Partial<Toast> = {}): string {
      return showToast({
        type: 'success',
        title: options.title || 'Erfolg',
        message,
        ...options,
      });
    }
    
    /**
     * Fehler-Toast anzeigen
     */
    function showError(message: string, options: Partial<Toast> = {}): string {
      // Fehlermeldung auch im Store speichern
      base.state.lastError = {
        message,
        code: options.id,
        timestamp: Date.now(),
      };
      
      return showToast({
        type: 'error',
        title: options.title || 'Fehler',
        message,
        ...options,
      });
    }
    
    /**
     * Warn-Toast anzeigen
     */
    function showWarning(message: string, options: Partial<Toast> = {}): string {
      return showToast({
        type: 'warning',
        title: options.title || 'Warnung',
        message,
        ...options,
      });
    }
    
    /**
     * Info-Toast anzeigen
     */
    function showInfo(message: string, options: Partial<Toast> = {}): string {
      return showToast({
        type: 'info',
        title: options.title || 'Information',
        message,
        ...options,
      });
    }
    
    /**
     * Sidebar öffnen
     */
    function openSidebar(): void {
      base.state.sidebar.isOpen = true;
    }
    
    /**
     * Sidebar schließen
     */
    function closeSidebar(): void {
      base.state.sidebar.isOpen = false;
    }
    
    /**
     * Sidebar-Status umschalten
     */
    function toggleSidebar(): void {
      base.state.sidebar.isOpen = !base.state.sidebar.isOpen;
    }
    
    /**
     * Sidebar-Zusammenklappen umschalten
     */
    function toggleSidebarCollapse(): void {
      if (base.state.sidebar.collapsible) {
        base.state.sidebar.collapsed = !base.state.sidebar.collapsed;
      }
    }
    
    /**
     * Sidebar-Breite ändern
     */
    function setSidebarWidth(width: number): void {
      if (base.state.sidebar.resizable) {
        const minWidth = base.state.sidebar.minWidth || 220;
        const maxWidth = base.state.sidebar.maxWidth || 400;
        
        base.state.sidebar.width = Math.max(minWidth, Math.min(maxWidth, width));
      }
    }
    
    /**
     * Aktiven Sidebar-Tab festlegen
     */
    function setActiveSidebarTab(tabId: string | null): void {
      base.state.sidebar.activeTab = tabId;
      
      // Wenn ein Tab aktiviert wird, Sidebar öffnen
      if (tabId !== null) {
        openSidebar();
      }
    }
    
    /**
     * Layout-Dichte ändern
     */
    function setLayoutDensity(density: 'compact' | 'comfortable' | 'spacious'): void {
      base.state.layout.density = density;
      
      // CSS-Klasse auf dem Root-Element aktualisieren
      if (typeof document !== 'undefined') {
        document.documentElement.classList.remove('density-compact', 'density-comfortable', 'density-spacious');
        document.documentElement.classList.add(`density-${density}`);
      }
    }
    
    /**
     * Inhaltslayoutbreite ändern
     */
    function setContentWidth(width: 'fluid' | 'fixed' | 'wide' | 'narrow'): void {
      base.state.layout.contentWidth = width;
      
      // CSS-Klasse auf dem Root-Element aktualisieren
      if (typeof document !== 'undefined') {
        document.documentElement.classList.remove('width-fluid', 'width-fixed', 'width-wide', 'width-narrow');
        document.documentElement.classList.add(`width-${width}`);
      }
    }
    
    /**
     * Vollbildmodus umschalten
     */
    function toggleFullscreen(): void {
      if (typeof document !== 'undefined') {
        if (!base.state.isFullscreen) {
          // Vollbildmodus aktivieren
          const element = document.documentElement;
          
          if (element.requestFullscreen) {
            element.requestFullscreen();
          } else if ((element as any).mozRequestFullScreen) {
            (element as any).mozRequestFullScreen();
          } else if ((element as any).webkitRequestFullscreen) {
            (element as any).webkitRequestFullscreen();
          } else if ((element as any).msRequestFullscreen) {
            (element as any).msRequestFullscreen();
          }
          
          base.state.isFullscreen = true;
        } else {
          // Vollbildmodus beenden
          if (document.exitFullscreen) {
            document.exitFullscreen();
          } else if ((document as any).mozCancelFullScreen) {
            (document as any).mozCancelFullScreen();
          } else if ((document as any).webkitExitFullscreen) {
            (document as any).webkitExitFullscreen();
          } else if ((document as any).msExitFullscreen) {
            (document as any).msExitFullscreen();
          }
          
          base.state.isFullscreen = false;
        }
      }
    }
    
    /**
     * Vollbildmodus-Änderungen überwachen
     */
    function setupFullscreenDetection(): void {
      if (typeof document !== 'undefined') {
        document.addEventListener('fullscreenchange', () => {
          base.state.isFullscreen = !!document.fullscreenElement;
        });
        
        document.addEventListener('mozfullscreenchange', () => {
          base.state.isFullscreen = !!(document as any).mozFullScreenElement;
        });
        
        document.addEventListener('webkitfullscreenchange', () => {
          base.state.isFullscreen = !!(document as any).webkitFullscreenElement;
        });
        
        document.addEventListener('msfullscreenchange', () => {
          base.state.isFullscreen = !!(document as any).msFullscreenElement;
        });
      }
    }
    
    /**
     * Globalen Ladeindikator anzeigen
     */
    function showLoading(message: string = '', options: Partial<LoadingIndicator> = {}): void {
      base.state.loading = {
        active: true,
        message,
        progress: options.progress,
        cancelable: options.cancelable || false,
        onCancel: options.onCancel,
      };
    }
    
    /**
     * Globalen Ladeindikator ausblenden
     */
    function hideLoading(): void {
      base.state.loading = {
        ...base.state.loading,
        active: false,
      };
    }
    
    /**
     * Fortschritt des Ladeindikators aktualisieren
     */
    function updateLoadingProgress(progress: number): void {
      if (base.state.loading.active) {
        base.state.loading.progress = progress;
      }
    }
    
    /**
     * Barrierefreiheitseinstellungen aktualisieren
     */
    function updateA11y(settings: Partial<UIStoreState['a11y']>): void {
      base.state.a11y = {
        ...base.state.a11y,
        ...settings,
      };
      
      // CSS-Klassen auf dem Root-Element aktualisieren
      if (typeof document !== 'undefined') {
        // Bewegungsreduzierung
        if (base.state.a11y.reduceMotion) {
          document.documentElement.classList.add('reduce-motion');
        } else {
          document.documentElement.classList.remove('reduce-motion');
        }
        
        // Hoher Kontrast
        if (base.state.a11y.highContrast) {
          document.documentElement.classList.add('high-contrast');
        } else {
          document.documentElement.classList.remove('high-contrast');
        }
        
        // Großer Text
        if (base.state.a11y.largeText) {
          document.documentElement.classList.add('large-text');
        } else {
          document.documentElement.classList.remove('large-text');
        }
        
        // Fokus-Outline
        if (base.state.a11y.focusVisible) {
          document.documentElement.classList.add('focus-visible');
        } else {
          document.documentElement.classList.remove('focus-visible');
        }
      }
    }
    
    /**
     * UI-Preferences aktualisieren
     */
    function updatePreferences(preferences: Partial<Record<string, any>>): void {
      base.state.preferences = {
        ...base.state.preferences,
        ...preferences,
      };
    }
    
    /**
     * Store initialisieren
     */
    async function initialize(): Promise<void> {
      await base.initialize();
      
      // Theme anwenden
      applyTheme();
      
      // System-Farbschema-Erkennung einrichten
      setupDarkModeDetection();
      
      // Viewport-Erkennung einrichten
      if (options.enableViewportDetection) {
        setupViewportDetection();
      }
      
      // Vollbildmodus-Erkennung einrichten
      setupFullscreenDetection();
      
      // Layout-Einstellungen anwenden
      setLayoutDensity(base.state.layout.density);
      setContentWidth(base.state.layout.contentWidth);
      
      // A11y-Einstellungen anwenden
      updateA11y(base.state.a11y);
    }
    
    /**
     * Store aufräumen
     */
    function cleanup(): void {
      // ResizeObserver entfernen
      if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
      } else if (typeof window !== 'undefined') {
        window.removeEventListener('resize', updateViewport);
      }
    }
    
    /**
     * Reset-Methode überschreiben, um auch Cleanup durchzuführen
     */
    function reset(): void {
      // Basis-Reset aufrufen
      base.reset();
      
      // Cleanup durchführen
      cleanup();
      
      // Modals und Toasts löschen
      closeAllModals();
      clearToasts();
    }
    
    // Cleanup bei Store-Deaktivierung
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', cleanup);
    }
    
    // Alle Funktionen aus Basis-Store und diesem Store zusammenführen
    return {
      ...base,
      
      // Überschreibende Methoden
      initialize,
      reset,
      
      // Zustands-Eigenschaften
      darkMode,
      themeMode,
      modals,
      toasts,
      sidebar,
      viewport,
      layout,
      loading,
      isFullscreen: computed(() => base.state.isFullscreen),
      lastError: computed(() => base.state.lastError),
      a11y: computed(() => base.state.a11y),
      preferences: computed(() => base.state.preferences),
      
      // Abgeleitete Eigenschaften
      hasActiveModals,
      currentModal,
      isMobile: computed(() => base.state.viewport.isMobile),
      isTablet: computed(() => base.state.viewport.isTablet),
      isDesktop: computed(() => base.state.viewport.isDesktop),
      
      // Theme-Methoden
      toggleDarkMode,
      enableDarkMode,
      disableDarkMode,
      setThemeMode,
      
      // Modal-Methoden
      openModal,
      closeModal,
      closeAllModals,
      confirm,
      prompt,
      
      // Toast-Methoden
      showToast,
      dismissToast,
      clearToasts,
      showSuccess,
      showError,
      showWarning,
      showInfo,
      
      // Sidebar-Methoden
      openSidebar,
      closeSidebar,
      toggleSidebar,
      toggleSidebarCollapse,
      setSidebarWidth,
      setActiveSidebarTab,
      
      // Layout-Methoden
      setLayoutDensity,
      setContentWidth,
      toggleFullscreen,
      
      // Loading-Methoden
      showLoading,
      hideLoading,
      updateLoadingProgress,
      
      // A11y-Methoden
      updateA11y,
      
      // Preferences-Methoden
      updatePreferences,
      
      // Cleanup
      cleanup,
    };
  });
}

/**
 * Rückgabetyp eines UIStore
 */
export type UIStoreReturn = BaseStoreReturn<UIStoreState> & {
  // Zustands-Eigenschaften
  darkMode: boolean;
  themeMode: 'light' | 'dark' | 'system';
  modals: Modal[];
  toasts: Toast[];
  sidebar: SidebarConfig;
  viewport: ViewportInfo;
  layout: LayoutConfig;
  loading: LoadingIndicator;
  isFullscreen: boolean;
  lastError: {
    message: string;
    code?: string;
    timestamp: number;
  } | null;
  a11y: {
    reduceMotion: boolean;
    highContrast: boolean;
    largeText: boolean;
    focusVisible: boolean;
  };
  preferences: Record<string, any>;
  
  // Abgeleitete Eigenschaften
  hasActiveModals: boolean;
  currentModal: Modal | null;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  
  // Theme-Methoden
  toggleDarkMode: () => void;
  enableDarkMode: () => void;
  disableDarkMode: () => void;
  setThemeMode: (mode: 'light' | 'dark' | 'system') => void;
  
  // Modal-Methoden
  openModal: (modal: Omit<Modal, 'id'>) => string;
  closeModal: (modalId: string) => void;
  closeAllModals: () => void;
  confirm: (message: string, options?: Partial<DialogConfig>) => Promise<boolean>;
  prompt: (message: string, options?: Partial<DialogConfig>) => Promise<string | null>;
  
  // Toast-Methoden
  showToast: (toast: Omit<Toast, 'id'>) => string;
  dismissToast: (toastId: string) => void;
  clearToasts: () => void;
  showSuccess: (message: string, options?: Partial<Toast>) => string;
  showError: (message: string, options?: Partial<Toast>) => string;
  showWarning: (message: string, options?: Partial<Toast>) => string;
  showInfo: (message: string, options?: Partial<Toast>) => string;
  
  // Sidebar-Methoden
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
  toggleSidebarCollapse: () => void;
  setSidebarWidth: (width: number) => void;
  setActiveSidebarTab: (tabId: string | null) => void;
  
  // Layout-Methoden
  setLayoutDensity: (density: 'compact' | 'comfortable' | 'spacious') => void;
  setContentWidth: (width: 'fluid' | 'fixed' | 'wide' | 'narrow') => void;
  toggleFullscreen: () => void;
  
  // Loading-Methoden
  showLoading: (message?: string, options?: Partial<LoadingIndicator>) => void;
  hideLoading: () => void;
  updateLoadingProgress: (progress: number) => void;
  
  // A11y-Methoden
  updateA11y: (settings: Partial<UIStoreState['a11y']>) => void;
  
  // Preferences-Methoden
  updatePreferences: (preferences: Partial<Record<string, any>>) => void;
  
  // Cleanup
  cleanup: () => void;
};