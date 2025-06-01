/**
 * Type definitions for Pinia stores
 */

import type { User } from './auth';

export interface AuthStoreState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  isLoading: boolean;
  error: string | null;
  permissions: Set<string>;
}

export interface AuthStoreGetters {
  isAuthenticated: boolean;
  isAdmin: boolean;
  userRole: string;
  isExpired: boolean;
  tokenExpiresIn: number;
  tokenStatus: 'missing' | 'invalid' | 'expired' | 'expiring' | 'valid';
}

export interface AuthStoreActions {
  login(credentials: any): Promise<any>;
  register(credentials: any): Promise<any>;
  logout(): Promise<void>;
  refreshUserToken(): Promise<boolean>;
  validateToken(): Promise<void>;
  checkPermission(permission: string): boolean;
  hasRole(role: string): boolean;
  hasAnyRole(roles: string[]): boolean;
  hasAllRoles(roles: string[]): boolean;
  updateUserProfile(updates: Partial<User>): Promise<void>;
  changePassword(oldPassword: string, newPassword: string): Promise<void>;
  loadStoredAuth(): void;
  clearAuth(): void;
  createAuthHeaders(): Record<string, string>;
  $reset(): void;
}

export type AuthStore = AuthStoreState & AuthStoreGetters & AuthStoreActions;