import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { type User, type LoginCredentials, type Role } from '@/types/auth';
import axios from 'axios';

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<User | null>(null);
  const token = ref<string | null>(null);
  const expiresAt = ref<number | null>(null);
  const isLoading = ref<boolean>(false);
  const error = ref<string | null>(null);
  const version = ref<number>(1); // For migration purposes

  // Getters
  const isAuthenticated = computed(() => !!token.value && !!user.value);
  const isAdmin = computed(() => !!user.value?.roles.includes('admin'));
  const isExpired = computed(() => {
    if (!expiresAt.value) return false;
    return Date.now() > expiresAt.value;
  });

  // Migration from legacy storage
  function migrateFromLegacyStorage() {
    try {
      const legacyToken = localStorage.getItem('token');
      const legacyUser = localStorage.getItem('user');
      
      if (legacyToken && !token.value) {
        token.value = legacyToken;
        
        if (legacyUser) {
          try {
            user.value = JSON.parse(legacyUser);
          } catch (e) {
            console.error('Failed to parse legacy user data', e);
          }
        }
        
        // Set expiration (24 hours from now if not available)
        if (!expiresAt.value) {
          expiresAt.value = Date.now() + 24 * 60 * 60 * 1000;
        }
        
        console.log('Migrated auth data from legacy storage');
      }
    } catch (error) {
      console.error('Error during auth migration:', error);
    }
  }

  // Actions
  async function login(credentials: LoginCredentials): Promise<boolean> {
    isLoading.value = true;
    error.value = null;
    
    try {
      const response = await axios.post('/api/auth/login', credentials);
      
      if (response.data.success) {
        token.value = response.data.token;
        user.value = response.data.user;
        expiresAt.value = Date.now() + (response.data.expiresIn || 24 * 60 * 60 * 1000);
        return true;
      } else {
        error.value = response.data.message || 'Login fehlgeschlagen';
        return false;
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Netzwerkfehler beim Login';
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  function logout() {
    token.value = null;
    user.value = null;
    expiresAt.value = null;
    // Do not reset the version
  }

  function hasRole(role: Role): boolean {
    return !!user.value?.roles.includes(role);
  }

  async function refreshUserInfo(): Promise<boolean> {
    if (!token.value) return false;
    
    isLoading.value = true;
    
    try {
      const response = await axios.get('/api/auth/user', {
        headers: { Authorization: `Bearer ${token.value}` }
      });
      
      if (response.data.success) {
        user.value = response.data.user;
        return true;
      } else {
        return false;
      }
    } catch (err) {
      if ((err as any)?.response?.status === 401) {
        // Token is invalid
        logout();
      }
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  // Initialize by checking for legacy storage
  migrateFromLegacyStorage();

  return { 
    // State
    user, 
    token, 
    expiresAt,
    isLoading,
    error,
    version,
    
    // Getters
    isAuthenticated,
    isAdmin,
    isExpired,
    
    // Actions
    login,
    logout,
    hasRole,
    refreshUserInfo
  };
}, {
  persist: {
    storage: localStorage,
    paths: ['token', 'user', 'expiresAt', 'version'],
  },
});