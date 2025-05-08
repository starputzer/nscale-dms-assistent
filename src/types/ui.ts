/**
 * Typdefinitionen für den UI-Store
 */

export interface Modal {
  id: string;
  component: string;
  title?: string;
  props?: Record<string, any>;
  options?: {
    width?: string | number;
    height?: string | number;
    fullscreen?: boolean;
    closeOnOverlayClick?: boolean;
    hideCloseButton?: boolean;
    position?: 'center' | 'top' | 'right' | 'bottom' | 'left';
  };
}

export interface Toast {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  duration?: number;
  closable?: boolean;
  actions?: Array<{
    label: string;
    onClick: () => void;
  }>;
}

export interface NotificationOptions {
  duration?: number;
  closable?: boolean;
  actions?: Array<{
    label: string;
    onClick: () => void;
  }>;
}

export interface SidebarState {
  isOpen: boolean;
  width: number;
  activeTab: string | null;
  collapsed?: boolean;
}

export type ViewMode = 'default' | 'focus' | 'compact' | 'presentation';

export interface LayoutConfig {
  contentMaxWidth: string;
  navbarHeight: string;
  footerHeight: string;
  headerVisible: boolean;
  footerVisible: boolean;
  splitPaneEnabled: boolean;
  splitPaneRatio: number;
  sidebarBreakpoint: number;
  textScale: number;
  density: 'compact' | 'comfortable' | 'spacious';
}

export interface UIState {
  sidebar: SidebarState;
  darkMode: boolean;
  viewMode: ViewMode;
  activeModals: Modal[];
  toasts: Toast[];
  isLoading: boolean;
  isMobile: boolean;
  layoutConfig: LayoutConfig;
}

export interface ThemeVars {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  error: string;
  warning: string;
  success: string;
  info: string;
  border: string;
  disabled: string;
}

export interface DialogOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'info' | 'warning' | 'danger';
}

export interface PromptOptions<T = string> {
  title?: string;
  message: string;
  defaultValue?: T;
  confirmText?: string;
  cancelText?: string;
  validator?: (value: T) => boolean | string;
}

export interface ResponsiveBreakpoints {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
}

export interface KeyboardShortcut {
  key: string;
  code: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description: string;
}

export interface SystemEvent<T = any> {
  type: string;
  data?: T;
  timestamp: number;
}

export interface DragDropOptions {
  enabled: boolean;
  dragImage?: string;
  dragClass?: string;
  dragDelay?: number;
}

export interface AnimationSettings {
  enabled: boolean;
  speed: 'slow' | 'normal' | 'fast';
  reduceMotion: boolean;
}

export interface AccessibilitySettings {
  highContrast: boolean;
  largeText: boolean;
  screenReader: boolean;
  keyboardFocus: boolean;
  reducedMotion: boolean;
}

export interface UIStoreActions {
  // Dark mode
  toggleDarkMode(): void;
  enableDarkMode(): void;
  disableDarkMode(): void;
  
  // Layout
  setViewMode(mode: ViewMode): void;
  toggleFullscreen(): void;
  
  // Sidebar
  openSidebar(): void;
  closeSidebar(): void;
  toggleSidebar(): void;
  toggleSidebarCollapse(): void;
  setSidebarWidth(width: number): void;
  setSidebarTab(tabId: string): void;
  
  // Modals
  openModal(modalData: Omit<Modal, 'id'>): string;
  closeModal(modalId: string): void;
  closeAllModals(): void;
  confirm(message: string, options?: DialogOptions): Promise<boolean>;
  prompt<T = string>(message: string, options?: PromptOptions<T>): Promise<T | null>;
  
  // Toasts
  showToast(toast: Omit<Toast, 'id'>): string;
  dismissToast(toastId: string): void;
  showSuccess(message: string, options?: Partial<NotificationOptions>): string;
  showError(message: string, options?: Partial<NotificationOptions>): string;
  showWarning(message: string, options?: Partial<NotificationOptions>): string;
  showInfo(message: string, options?: Partial<NotificationOptions>): string;
  
  // Layout
  setUIDensity(density: 'compact' | 'comfortable' | 'spacious'): void;
  setTextScale(scale: number): void;
  
  // System
  initialize(): void;
  checkViewport(): void;
  setLoading(loading: boolean, message?: string): void;
  requestUIUpdate(updateType: string): void;
}