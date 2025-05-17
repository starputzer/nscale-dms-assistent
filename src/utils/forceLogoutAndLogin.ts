/**
 * Force logout and redirect to login page
 * This is useful when authentication is in an inconsistent state
 */

import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'vue-router';

export async function forceLogoutAndLogin() {
  try {
    const authStore = useAuthStore();
    const router = useRouter();
    
    // Clear all auth-related data
    localStorage.removeItem('nscale_access_token');
    localStorage.removeItem('nscale_refresh_token');
    localStorage.removeItem('pinia-state');
    sessionStorage.clear();
    
    // Reset auth store
    if (authStore.cleanup) {
      authStore.cleanup();
    }
    authStore.$reset();
    
    // Redirect to login
    await router.push('/login');
    
    console.log('Forced logout complete, redirected to login page');
  } catch (error) {
    console.error('Error during forced logout:', error);
    // As a last resort, do a hard redirect
    window.location.href = '/login';
  }
}

// Make it globally available for debugging
if (typeof window !== 'undefined') {
  (window as any).forceLogoutAndLogin = forceLogoutAndLogin;
}