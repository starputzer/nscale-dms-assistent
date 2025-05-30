import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'vue-router';
import type { Router } from 'vue-router';

// Mock router
vi.mock('vue-router', () => ({
  useRouter: vi.fn(),
  useRoute: vi.fn(() => ({
    path: '/login',
    query: {}
  }))
}));

describe('Authentication Flows - System Integrity', () => {
  let authStore: ReturnType<typeof useAuthStore>;
  let mockRouter: Partial<Router>;

  beforeEach(() => {
    setActivePinia(createPinia());
    authStore = useAuthStore();
    
    mockRouter = {
      push: vi.fn(),
      replace: vi.fn(),
      currentRoute: { value: { path: '/login' } }
    };
    
    vi.mocked(useRouter).mockReturnValue(mockRouter as Router);
  });

  describe('Login Flow', () => {
    it('should handle successful login with valid credentials', async () => {
      const credentials = { username: 'testuser', password: 'testpass123' };
      
      // Mock successful API response
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          user: {
            id: '123',
            username: 'testuser',
            email: 'test@example.com',
            role: 'user'
          },
          token: 'mock-jwt-token'
        })
      });

      await authStore.login(credentials);

      expect(authStore.isAuthenticated).toBe(true);
      expect(authStore.user).toEqual({
        id: '123',
        username: 'testuser',
        email: 'test@example.com',
        role: 'user'
      });
      expect(authStore.token).toBe('mock-jwt-token');
      expect(mockRouter.push).toHaveBeenCalledWith('/chat');
    });

    it('should handle login failure with invalid credentials', async () => {
      const credentials = { username: 'testuser', password: 'wrongpass' };
      
      // Mock failed API response
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          success: false,
          error: 'Invalid credentials'
        })
      });

      await expect(authStore.login(credentials)).rejects.toThrow('Invalid credentials');
      
      expect(authStore.isAuthenticated).toBe(false);
      expect(authStore.user).toBeNull();
      expect(authStore.token).toBeNull();
      expect(mockRouter.push).not.toHaveBeenCalled();
    });

    it('should handle network errors during login', async () => {
      const credentials = { username: 'testuser', password: 'testpass123' };
      
      // Mock network error
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

      await expect(authStore.login(credentials)).rejects.toThrow('Network error');
      
      expect(authStore.isAuthenticated).toBe(false);
      expect(authStore.loginAttempts).toBe(1);
    });
  });

  describe('Logout Flow', () => {
    beforeEach(async () => {
      // Setup authenticated state
      authStore.$patch({
        isAuthenticated: true,
        user: { id: '123', username: 'testuser', email: 'test@example.com', role: 'user' },
        token: 'mock-jwt-token'
      });
    });

    it('should clear auth state on logout', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      await authStore.logout();

      expect(authStore.isAuthenticated).toBe(false);
      expect(authStore.user).toBeNull();
      expect(authStore.token).toBeNull();
      expect(mockRouter.push).toHaveBeenCalledWith('/login');
    });

    it('should handle logout even if API call fails', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

      await authStore.logout();

      // Should still clear local state
      expect(authStore.isAuthenticated).toBe(false);
      expect(authStore.user).toBeNull();
      expect(authStore.token).toBeNull();
      expect(mockRouter.push).toHaveBeenCalledWith('/login');
    });
  });

  describe('Session Persistence', () => {
    it('should persist auth state to localStorage', async () => {
      const credentials = { username: 'testuser', password: 'testpass123' };
      
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          user: { id: '123', username: 'testuser', email: 'test@example.com', role: 'user' },
          token: 'mock-jwt-token'
        })
      });

      await authStore.login(credentials);

      const storedAuth = localStorage.getItem('auth');
      expect(storedAuth).toBeTruthy();
      
      const parsedAuth = JSON.parse(storedAuth!);
      expect(parsedAuth.token).toBe('mock-jwt-token');
      expect(parsedAuth.user.username).toBe('testuser');
    });

    it('should restore auth state from localStorage on init', async () => {
      const authData = {
        token: 'stored-jwt-token',
        user: { id: '456', username: 'storeduser', email: 'stored@example.com', role: 'admin' }
      };
      
      localStorage.setItem('auth', JSON.stringify(authData));

      // Create new store instance
      const newPinia = createPinia();
      setActivePinia(newPinia);
      const newAuthStore = useAuthStore();

      // Initialize store (should load from localStorage)
      await newAuthStore.initialize();

      expect(newAuthStore.isAuthenticated).toBe(true);
      expect(newAuthStore.token).toBe('stored-jwt-token');
      expect(newAuthStore.user?.username).toBe('storeduser');
    });
  });

  describe('Token Refresh', () => {
    it('should refresh token before expiration', async () => {
      authStore.$patch({
        isAuthenticated: true,
        token: 'old-jwt-token',
        tokenExpiry: Date.now() + 5 * 60 * 1000 // 5 minutes
      });

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          token: 'new-jwt-token',
          expiresIn: 3600
        })
      });

      await authStore.refreshToken();

      expect(authStore.token).toBe('new-jwt-token');
      expect(authStore.isAuthenticated).toBe(true);
    });

    it('should logout if token refresh fails', async () => {
      authStore.$patch({
        isAuthenticated: true,
        token: 'old-jwt-token'
      });

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 401
      });

      await authStore.refreshToken();

      expect(authStore.isAuthenticated).toBe(false);
      expect(authStore.token).toBeNull();
      expect(mockRouter.push).toHaveBeenCalledWith('/login');
    });
  });

  describe('Role-Based Access Control', () => {
    it('should check admin permissions correctly', () => {
      authStore.$patch({
        isAuthenticated: true,
        user: { id: '123', username: 'admin', email: 'admin@example.com', role: 'admin' }
      });

      expect(authStore.hasRole('admin')).toBe(true);
      expect(authStore.hasRole('user')).toBe(true); // Admin has user permissions
      expect(authStore.canAccessAdmin).toBe(true);
    });

    it('should restrict admin access for regular users', () => {
      authStore.$patch({
        isAuthenticated: true,
        user: { id: '123', username: 'user', email: 'user@example.com', role: 'user' }
      });

      expect(authStore.hasRole('admin')).toBe(false);
      expect(authStore.hasRole('user')).toBe(true);
      expect(authStore.canAccessAdmin).toBe(false);
    });
  });

  describe('Authentication Guards', () => {
    it('should redirect to login when accessing protected route while unauthenticated', async () => {
      authStore.$patch({ isAuthenticated: false });

      const requireAuth = authStore.requireAuth();
      const result = await requireAuth();

      expect(result).toBe(false);
      expect(mockRouter.push).toHaveBeenCalledWith({
        path: '/login',
        query: { redirect: '/login' }
      });
    });

    it('should allow access to protected route when authenticated', async () => {
      authStore.$patch({
        isAuthenticated: true,
        user: { id: '123', username: 'user', email: 'user@example.com', role: 'user' }
      });

      const requireAuth = authStore.requireAuth();
      const result = await requireAuth();

      expect(result).toBe(true);
      expect(mockRouter.push).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should track login attempts and implement rate limiting', async () => {
      const credentials = { username: 'testuser', password: 'wrongpass' };
      
      // Mock multiple failed attempts
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Invalid credentials' })
      });

      // Attempt login 5 times
      for (let i = 0; i < 5; i++) {
        try {
          await authStore.login(credentials);
        } catch (e) {
          // Expected to fail
        }
      }

      expect(authStore.loginAttempts).toBe(5);
      expect(authStore.isRateLimited).toBe(true);

      // Should reject further attempts
      await expect(authStore.login(credentials)).rejects.toThrow('Too many login attempts');
    });

    it('should reset login attempts after successful login', async () => {
      authStore.$patch({ loginAttempts: 3 });

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          user: { id: '123', username: 'user', email: 'user@example.com', role: 'user' },
          token: 'jwt-token'
        })
      });

      await authStore.login({ username: 'user', password: 'pass' });

      expect(authStore.loginAttempts).toBe(0);
      expect(authStore.isRateLimited).toBe(false);
    });
  });
});