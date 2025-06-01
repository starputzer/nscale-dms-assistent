/**
 * Complete type definition for the Auth Store
 */

import type { User, LoginCredentials, RegisterCredentials } from './auth';

export interface AuthStoreType {
  // State
  user: User | null;
  token: string | null;
  refreshToken?: string | null;
  expiresAt?: number | null;
  isLoading?: boolean;
  error: string | null;
  
  // Computed
  isAuthenticated: boolean;
  isAdmin?: boolean;
  userRole: string;
  isExpired?: boolean;
  tokenExpiresIn?: number;
  tokenStatus?: 'missing' | 'invalid' | 'expired' | 'expiring' | 'valid';
  
  // Methods
  login(credentials: LoginCredentials): Promise<boolean>;
  register?(credentials: RegisterCredentials): Promise<boolean>;
  logout(): Promise<void>;
  refreshUserToken?(): Promise<boolean>;
  validateToken(): Promise<void>;
  refreshTokenIfNeeded?(): Promise<boolean>;
  
  // Permission methods
  checkPermission?(permission: string): boolean;
  hasRole(role: string): boolean;
  hasAnyRole?(roles: string[]): boolean;
  hasAllRoles?(roles: string[]): boolean;
  hasPermission?(permission: string): boolean;
  
  // User methods
  updateUserProfile?(updates: Partial<User>): Promise<void>;
  changePassword?(oldPassword: string, newPassword: string): Promise<void>;
  refreshUserInfo?(): Promise<boolean>;
  validateCurrentToken?(): Promise<boolean>;
  
  // Utility methods
  loadStoredAuth?(): void;
  clearAuth?(): void;
  createAuthHeaders(): Record<string, string>;
  initialize?(): void;
  $reset?(): void;
  $subscribe?: (callback: () => void) => () => void;
}