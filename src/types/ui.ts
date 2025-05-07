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

export interface SidebarState {
  isOpen: boolean;
  width: number;
  activeTab: string | null;
}

export type ViewMode = 'default' | 'focus' | 'compact' | 'presentation';

export interface UIState {
  sidebar: SidebarState;
  darkMode: boolean;
  viewMode: ViewMode;
  activeModals: Modal[];
  toasts: Toast[];
  isLoading: boolean;
  isMobile: boolean;
}