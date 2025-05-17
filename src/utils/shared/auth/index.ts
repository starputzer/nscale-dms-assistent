/**
 * Shared Auth Utilities
 *
 * Common authentication functions that can be used in both Vue 3 and Vanilla JS implementations.
 */

// Token storage keys
const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_DATA_KEY = 'user_data';

/**
 * Token type definitions
 */
export type TokenType = 'access' | 'refresh';

/**
 * User information interface
 */
export interface UserInfo {
  id: string;
  username: string;
  email: string;
  roles: string[];
  displayName?: string;
  [key: string]: any;
}

/**
 * Gets the stored authentication token
 * @param type The token type ('access' or 'refresh')
 * @returns The token or null if not found
 */
export function getToken(type: TokenType = 'access'): string | null {
  const key = type === 'access' ? TOKEN_KEY : REFRESH_TOKEN_KEY;
  return localStorage.getItem(key);
}

/**
 * Sets the authentication token
 * @param token The token to store
 * @param type The token type ('access' or 'refresh')
 */
export function setToken(token: string, type: TokenType = 'access'): void {
  const key = type === 'access' ? TOKEN_KEY : REFRESH_TOKEN_KEY;
  localStorage.setItem(key, token);
}

/**
 * Clears all authentication data from storage
 */
export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_DATA_KEY);
}

/**
 * Gets the stored user information
 * @returns The user info or null if not found
 */
export function getUserInfo(): UserInfo | null {
  const userData = localStorage.getItem(USER_DATA_KEY);
  if (!userData) return null;

  try {
    return JSON.parse(userData) as UserInfo;
  } catch (e) {
    console.error('Error parsing user data:', e);
    return null;
  }
}

/**
 * Sets the user information
 * @param user The user info to store
 */
export function setUserInfo(user: UserInfo): void {
  localStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
}

/**
 * Checks if a token is expired
 * @param token The JWT token to check
 * @param bufferSeconds Additional buffer time in seconds
 * @returns True if the token is expired, false otherwise
 */
export function isTokenExpired(token: string | null, bufferSeconds: number = 60): boolean {
  if (!token) return true;

  try {
    // Extract the payload from the JWT
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    const { exp } = JSON.parse(jsonPayload);
    if (!exp) return true;

    // Check expiration with buffer
    return (exp * 1000) < (Date.now() + (bufferSeconds * 1000));
  } catch (e) {
    console.error('Error checking token expiration:', e);
    return true;
  }
}

/**
 * Checks if the user has a specific role
 * @param role The role to check
 * @returns True if the user has the role, false otherwise
 */
export function hasRole(role: string): boolean {
  const user = getUserInfo();
  if (!user || !user.roles) return false;

  return user.roles.includes(role);
}

/**
 * Checks if the user has any of the specified roles
 * @param roles The roles to check
 * @returns True if the user has any of the roles, false otherwise
 */
export function hasAnyRole(roles: string[]): boolean {
  const user = getUserInfo();
  if (!user || !user.roles) return false;

  return roles.some(role => user.roles.includes(role));
}
