/**
 * Typdefinitionen für den Auth-Store
 */

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  displayName?: string;
  lastLogin?: string;
}

export type UserRole = 'admin' | 'user' | 'guest' | 'support';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
  expiresAt?: number;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  expiresAt: number | null;
}