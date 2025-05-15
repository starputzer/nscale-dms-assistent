/**
 * Authentication Fix
 * Fixes token storage and retrieval issues in the application
 */

import { useAuthStore } from '@/stores/auth';
import { apiService } from '@/services/api/ApiService';
import axios from 'axios';

export class AuthenticationFix {
  private authStore: any;
  private hasInitialized: boolean = false;

  async initialize() {
    if (this.hasInitialized) return;
    
    console.log('🔧 Initializing Authentication Fix...');
    
    try {
      this.authStore = useAuthStore();
      
      // Fix 1: Ensure tokens are properly stored after login
      this.fixTokenStorage();
      
      // Fix 2: Ensure auth interceptors are properly configured
      this.fixAuthInterceptors();
      
      // Fix 3: Validate and migrate existing tokens
      this.validateAndMigrateTokens();
      
      // Fix 4: Setup proper error recovery
      this.setupErrorRecovery();
      
      this.hasInitialized = true;
      console.log('✅ Authentication Fix initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize authentication fix:', error);
    }
  }

  private fixTokenStorage() {
    console.log('🔧 Fixing token storage...');
    
    // Override the login method to ensure proper token storage
    const originalLogin = this.authStore.login;
    this.authStore.login = async (...args: any[]) => {
      try {
        const result = await originalLogin.apply(this.authStore, args);
        
        // After successful login, ensure token is stored correctly
        if (result && this.authStore.token) {
          const token = this.authStore.token;
          
          // Store with the correct key that ApiService expects
          // Based on our analysis, the StorageService adds "nscale_" prefix
          // and the config uses "access_token", so the final key is "nscale_access_token"
          localStorage.setItem('nscale_access_token', token);
          console.log('✅ Token stored in localStorage with correct key');
          
          // Also ensure it's in the auth store
          if (this.authStore.refreshToken) {
            localStorage.setItem('nscale_refresh_token', this.authStore.refreshToken);
          }
          
          // Force reconfiguration of HTTP clients
          this.authStore.configureHttpClients(token);
        }
        
        return result;
      } catch (error) {
        console.error('Login error:', error);
        throw error;
      }
    };
  }

  private fixAuthInterceptors() {
    console.log('🔧 Fixing auth interceptors...');
    
    // Ensure ApiService has interceptors that check localStorage directly
    const requestInterceptorId = axios.interceptors.request.use(
      (config) => {
        // Check if auth header is already set
        if (!config.headers.Authorization) {
          // Try to get token from localStorage with correct key
          const token = localStorage.getItem('nscale_access_token');
          
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
            console.log('✅ Auth header added to request:', config.url);
          } else {
            console.warn('⚠️ No token found for request:', config.url);
          }
        }
        
        return config;
      },
      (error) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );
    
    // Ensure ApiService also has its own interceptor
    if (apiService && typeof apiService.addRequestInterceptor === 'function') {
      apiService.addRequestInterceptor(
        (config) => {
          if (!config.headers.Authorization) {
            const token = localStorage.getItem('nscale_access_token');
            if (token) {
              config.headers.Authorization = `Bearer ${token}`;
            }
          }
          return config;
        },
        (error) => Promise.reject(error)
      );
    }
  }

  private validateAndMigrateTokens() {
    console.log('🔧 Validating and migrating tokens...');
    
    // Check for tokens in various possible locations
    const possibleKeys = [
      'access_token',
      'nscale_access_token',
      'nscale_nscale_access_token', // Double prefix issue
      'token',
      'nscale_token'
    ];
    
    let foundToken: string | null = null;
    let foundRefreshToken: string | null = null;
    
    // Find any existing token
    for (const key of possibleKeys) {
      const value = localStorage.getItem(key);
      if (value && !foundToken) {
        foundToken = value;
        console.log(`Found token in localStorage with key: ${key}`);
      }
      
      // Also check for refresh token
      const refreshKey = key.replace('access_token', 'refresh_token').replace('token', 'refresh_token');
      const refreshValue = localStorage.getItem(refreshKey);
      if (refreshValue && !foundRefreshToken) {
        foundRefreshToken = refreshValue;
        console.log(`Found refresh token with key: ${refreshKey}`);
      }
    }
    
    // If token found, migrate to correct location
    if (foundToken) {
      localStorage.setItem('nscale_access_token', foundToken);
      console.log('✅ Token migrated to correct location');
      
      // Update auth store
      this.authStore.setToken(foundToken);
      
      // Clean up old keys
      possibleKeys.forEach(key => {
        if (key !== 'nscale_access_token') {
          localStorage.removeItem(key);
        }
      });
    }
    
    if (foundRefreshToken) {
      localStorage.setItem('nscale_refresh_token', foundRefreshToken);
    }
  }

  private setupErrorRecovery() {
    console.log('🔧 Setting up error recovery...');
    
    // Add response interceptor for 401 errors
    axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          console.log('🔄 Received 401, attempting recovery...');
          
          // Check if we have a refresh token
          const refreshToken = localStorage.getItem('nscale_refresh_token');
          
          if (refreshToken && !error.config._retry) {
            error.config._retry = true;
            
            try {
              // Attempt to refresh the token
              const refreshSuccess = await this.authStore.refreshTokenIfNeeded();
              
              if (refreshSuccess) {
                // Get the new token
                const newToken = this.authStore.token || localStorage.getItem('nscale_access_token');
                
                if (newToken) {
                  // Update the failed request with new token
                  error.config.headers.Authorization = `Bearer ${newToken}`;
                  return axios(error.config);
                }
              }
            } catch (refreshError) {
              console.error('Token refresh failed:', refreshError);
            }
          }
          
          // If we can't recover, logout and redirect to login
          console.log('❌ Cannot recover from 401, logging out...');
          await this.authStore.logout();
          window.location.href = '/login';
        }
        
        return Promise.reject(error);
      }
    );
  }

  // Additional helper methods
  
  checkAuthStatus() {
    console.log('🔍 Checking authentication status...');
    
    const checks = {
      storeToken: this.authStore.token,
      localStorageToken: localStorage.getItem('nscale_access_token'),
      isAuthenticated: this.authStore.isAuthenticated,
      user: this.authStore.user,
      tokenExpiry: this.authStore.expiresAt
    };
    
    console.table(checks);
    
    // Verify token format
    const token = checks.localStorageToken;
    if (token) {
      try {
        // Basic JWT validation
        const parts = token.split('.');
        if (parts.length === 3) {
          console.log('✅ Token appears to be valid JWT');
        } else {
          console.warn('⚠️ Token does not appear to be valid JWT format');
        }
      } catch (error) {
        console.error('❌ Error validating token:', error);
      }
    }
    
    return checks;
  }
  
  forceTokenRefresh() {
    console.log('🔄 Forcing token refresh...');
    return this.authStore.refreshTokenIfNeeded();
  }
  
  clearAllAuthData() {
    console.log('🗑️ Clearing all authentication data...');
    
    // Clear from store
    this.authStore.logout();
    
    // Clear all possible token keys from localStorage
    const authKeys = Object.keys(localStorage).filter(key => 
      key.includes('token') || key.includes('auth')
    );
    
    authKeys.forEach(key => {
      localStorage.removeItem(key);
      console.log(`Removed: ${key}`);
    });
  }
}

// Create singleton instance
const authFix = new AuthenticationFix();

// Export as both named and default for flexibility
export { authFix };
export default authFix;

// Auto-initialize if in browser environment
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    authFix.initialize();
  });
  
  // Also attach to window for debugging
  (window as any).authFix = authFix;
}