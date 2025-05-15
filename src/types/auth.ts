/**
 * Typdefinitionen für den Auth-Store
 */

export interface User {
  id: string;
  username: string;
  email: string;
  roles?: Role[];
  displayName?: string;
  lastLogin?: string;
  preferences?: UserPreferences;
  /** Backend verwendet 'role' (singular) */
  role?: UserRole;
}

export type UserRole = "admin" | "user" | "guest" | "support";
export type Role = UserRole | string;

export interface UserPreferences {
  theme?: string;
  language?: string;
  notifications?: boolean;
  [key: string]: any;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterCredentials extends LoginCredentials {
  username: string;
  displayName?: string;
}

export interface LoginResponse {
  success: boolean;
  token: string;
  refreshToken?: string;
  user: User;
  expiresIn?: number;
  message?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  expiresAt: number | null;
  version: number;
  tokenRefreshInProgress: boolean;
  lastTokenRefresh: number;
}

export interface Permission {
  id: string;
  name: string;
  description?: string;
}

export interface PermissionCheck {
  hasPermission: boolean;
  requiredRole?: Role;
  user?: User | null;
}

export type TokenStatus =
  | "valid"
  | "expiring"
  | "expired"
  | "invalid"
  | "missing";
