// Type augmentations for Pinia stores to fix TypeScript inference issues

import type { Store } from 'pinia';
import type { User, Role } from './auth';

// Augment the auth store type
declare module '@/stores/auth' {
  export interface AuthStoreActions {
    login(credentials: any): Promise<boolean>;
    logout(): void;
    hasRole(role: Role): boolean;
    hasAnyRole(roles: Role[]): boolean;
    refreshTokenIfNeeded(): Promise<boolean>;
  }

  export interface AuthStoreGetters {
    user: User | null;
    isAuthenticated: boolean;
    isAdmin: boolean;
    userRole: string;
    token: string | null;
  }
}

// Augment the UI store type
declare module '@/stores/ui' {
  export interface UIStoreActions {
    toggleDarkMode(): void;
    openSidebar(): void;
    closeSidebar(): void;
    toggleSidebar(): void;
    toggleSidebarCollapse(): void;
    setSidebarTab(tabId: string): void;
    openModal(modalData: any): string;
    closeModal(modalId: string): void;
    confirm(options: any): Promise<boolean>;
    showSuccess(message: string, duration?: number): void;
    showError(message: string, duration?: number): void;
    showWarning(message: string, duration?: number): void;
    showInfo(message: string, duration?: number): void;
  }

  export interface UIStoreGetters {
    isDarkMode: boolean;
  }
}

// Helper type to properly type store returns
export type StoreWithActions<T extends Store, Actions, Getters> = T & Actions & Getters;