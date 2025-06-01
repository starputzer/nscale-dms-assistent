import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'vue-router';
import axios from 'axios';

// Mock vue-router
vi.mock('vue-router', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    currentRoute: { value: { query: {} } }
  }))
}));

// Mock axios
vi.mock('axios');

describe('Authentication Flow Integrity Tests', () => {
  let authStore: any;
  let router: any;

  beforeEach(() => {
    setActivePinia(createPinia());
    authStore = useAuthStore();
    router = useRouter();
    vi.clearAllMocks();
    
    // Clear localStorage
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Login Flow', () => {
    it('should successfully login with valid credentials', async () => {
      const mockUser = {
        id: '123',
        username: 'testuser',
        email: 'test@example.com',
        role: 'user'
      };
      
      const mockResponse = {
        data: {
          access_token: 'mock-token',
          refresh_token: 'mock-refresh',
          user: mockUser
        }
      };

      vi.mocked(axios.post).mockResolvedValueOnce(mockResponse);

      await authStore.login('testuser', 'password123');

      expect(authStore.isAuthenticated).toBe(true);
      expect(authStore.user).toEqual(mockUser);
      expect(authStore.token).toBe('mock-token');
      expect(localStorage.getItem('auth_token')).toBe('mock-token');
      expect(router.push).toHaveBeenCalledWith('/chat');
    });

    it('should handle login failure correctly', async () => {
      const errorMessage = 'Invalid credentials';
      vi.mocked(axios.post).mockRejectedValueOnce({
        response: { data: { message: errorMessage } }
      });

      await expect(authStore.login('testuser', 'wrongpassword'))
        .rejects.toThrow(errorMessage);

      expect(authStore.isAuthenticated).toBe(false);
      expect(authStore.user).toBeNull();
      expect(authStore.token).toBeNull();
      expect(localStorage.getItem('auth_token')).toBeNull();
    });

    it('should redirect to intended route after login', async () => {
      router.currentRoute.value.query = { redirect: '/admin' };
      
      const mockResponse = {
        data: {
          access_token: 'mock-token',
          refresh_token: 'mock-refresh',
          user: { id: '123', username: 'admin', role: 'admin' }
        }
      };

      vi.mocked(axios.post).mockResolvedValueOnce(mockResponse);

      await authStore.login('admin', 'password123');

      expect(router.push).toHaveBeenCalledWith('/admin');
    });
  });

  describe('Logout Flow', () => {
    beforeEach(async () => {
      // Setup authenticated state
      authStore.$patch({
        token: 'mock-token',
        refreshToken: 'mock-refresh',
        user: { id: '123', username: 'testuser' },
        isAuthenticated: true
      });
      localStorage.setItem('auth_token', 'mock-token');
    });

    it('should successfully logout and clear all auth data', async () => {
      vi.mocked(axios.post).mockResolvedValueOnce({ data: { success: true } });

      await authStore.logout();

      expect(authStore.isAuthenticated).toBe(false);
      expect(authStore.user).toBeNull();
      expect(authStore.token).toBeNull();
      expect(authStore.refreshToken).toBeNull();
      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(router.push).toHaveBeenCalledWith('/login');
    });

    it('should logout even if server request fails', async () => {
      vi.mocked(axios.post).mockRejectedValueOnce(new Error('Network error'));

      await authStore.logout();

      expect(authStore.isAuthenticated).toBe(false);
      expect(authStore.user).toBeNull();
      expect(localStorage.getItem('auth_token')).toBeNull();
    });
  });

  describe('Token Refresh Flow', () => {
    it('should refresh token when expired', async () => {
      authStore.$patch({
        token: 'expired-token',
        refreshToken: 'valid-refresh-token',
        isAuthenticated: true
      });

      const mockResponse = {
        data: {
          access_token: 'new-token',
          refresh_token: 'new-refresh-token'
        }
      };

      vi.mocked(axios.post).mockResolvedValueOnce(mockResponse);

      await authStore.refreshAccessToken();

      expect(authStore.token).toBe('new-token');
      expect(authStore.refreshToken).toBe('new-refresh-token');
      expect(localStorage.getItem('auth_token')).toBe('new-token');
    });

    it('should logout if refresh fails', async () => {
      authStore.$patch({
        token: 'expired-token',
        refreshToken: 'invalid-refresh-token',
        isAuthenticated: true
      });

      vi.mocked(axios.post).mockRejectedValueOnce({
        response: { status: 401 }
      });

      await authStore.refreshAccessToken();

      expect(authStore.isAuthenticated).toBe(false);
      expect(authStore.token).toBeNull();
      expect(router.push).toHaveBeenCalledWith('/login');
    });
  });

  describe('Permission Checks', () => {
    it('should correctly check user permissions', () => {
      authStore.$patch({
        user: {
          id: '123',
          username: 'admin',
          role: 'admin',
          permissions: ['admin', 'viewUsers', 'editUsers']
        },
        isAuthenticated: true
      });

      expect(authStore.hasPermission('admin')).toBe(true);
      expect(authStore.hasPermission('viewUsers')).toBe(true);
      expect(authStore.hasPermission('deleteUsers')).toBe(false);
      expect(authStore.isAdmin).toBe(true);
    });

    it('should handle permissions for regular users', () => {
      authStore.$patch({
        user: {
          id: '456',
          username: 'user',
          role: 'user',
          permissions: ['viewDocs', 'chat']
        },
        isAuthenticated: true
      });

      expect(authStore.hasPermission('admin')).toBe(false);
      expect(authStore.hasPermission('viewDocs')).toBe(true);
      expect(authStore.isAdmin).toBe(false);
    });
  });

  describe('Auto-login from Token', () => {
    it('should auto-login if valid token exists in localStorage', async () => {
      localStorage.setItem('auth_token', 'valid-stored-token');
      localStorage.setItem('refresh_token', 'valid-stored-refresh');

      const mockUser = {
        id: '789',
        username: 'autouser',
        email: 'auto@example.com'
      };

      vi.mocked(axios.get).mockResolvedValueOnce({
        data: { user: mockUser }
      });

      await authStore.initializeFromToken();

      expect(authStore.isAuthenticated).toBe(true);
      expect(authStore.user).toEqual(mockUser);
      expect(authStore.token).toBe('valid-stored-token');
    });

    it('should clear invalid stored tokens', async () => {
      localStorage.setItem('auth_token', 'invalid-token');

      vi.mocked(axios.get).mockRejectedValueOnce({
        response: { status: 401 }
      });

      await authStore.initializeFromToken();

      expect(authStore.isAuthenticated).toBe(false);
      expect(authStore.user).toBeNull();
      expect(localStorage.getItem('auth_token')).toBeNull();
    });
  });

  describe('Auth Headers Creation', () => {
    it('should create correct auth headers when authenticated', () => {
      authStore.$patch({
        token: 'test-token',
        isAuthenticated: true
      });

      const headers = authStore.createAuthHeaders();

      expect(headers).toEqual({
        Authorization: 'Bearer test-token'
      });
    });

    it('should return empty headers when not authenticated', () => {
      authStore.$patch({
        token: null,
        isAuthenticated: false
      });

      const headers = authStore.createAuthHeaders();

      expect(headers).toEqual({});
    });
  });
});