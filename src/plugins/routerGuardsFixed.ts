/**
 * Router Guards Fixed - Robuste Router-Überwachung mit Fehlerbehandlung
 */

import type { Router, NavigationGuardNext, RouteLocationNormalized } from 'vue-router';

export interface RouterGuardOptions {
  enableLogging?: boolean;
  enableFeatureChecks?: boolean;
  enableAuthChecks?: boolean;
  fallbackRoute?: string;
}

interface GuardState {
  initialized: boolean;
  lastNavigationTime: number;
  navigationCount: number;
  errorCount: number;
  lastError: Error | null;
}

const state: GuardState = {
  initialized: false,
  lastNavigationTime: 0,
  navigationCount: 0,
  errorCount: 0,
  lastError: null
};

/**
 * Install router guards with comprehensive error handling
 */
export function installRouterGuards(
  router: Router,
  options: RouterGuardOptions = {}
): void {
  if (state.initialized) {
    console.warn('[RouterGuards] Already initialized, skipping');
    return;
  }

  const {
    enableLogging = true,
    enableFeatureChecks = true,
    enableAuthChecks = true,
    fallbackRoute = '/'
  } = options;

  // Global before guard
  router.beforeEach(async (to, from, next) => {
    const guardStartTime = Date.now();
    state.navigationCount++;

    try {
      if (enableLogging) {
        console.log(`[RouterGuards] Navigating: ${from.path} -> ${to.path}`);
      }

      // Skip guard for special routes
      const skipRoutes = ['/error', '/404', fallbackRoute];
      if (skipRoutes.includes(to.path)) {
        return next();
      }

      // Auth check (if enabled)
      if (enableAuthChecks && to.meta.requiresAuth) {
        const isAuthenticated = await checkAuthentication();
        
        if (!isAuthenticated) {
          if (enableLogging) {
            console.log('[RouterGuards] Not authenticated, redirecting to login');
          }
          return next({ path: '/login', query: { redirect: to.fullPath } });
        }
      }

      // Feature toggle check (if enabled)
      if (enableFeatureChecks && to.meta.feature) {
        const isEnabled = await checkFeatureToggle(to.meta.feature as string);
        
        if (!isEnabled) {
          if (enableLogging) {
            console.log(`[RouterGuards] Feature disabled: ${to.meta.feature}`);
          }
          return next({ path: '/error', query: { reason: 'feature-disabled' } });
        }
      }

      // Admin check (if enabled)
      if (to.meta.adminOnly) {
        const isAdmin = await checkAdminAccess();
        
        if (!isAdmin) {
          if (enableLogging) {
            console.log('[RouterGuards] Admin access required, redirecting');
          }
          return next({ path: '/error', query: { reason: 'unauthorized' } });
        }
      }

      // All checks passed
      state.lastNavigationTime = Date.now() - guardStartTime;
      next();

    } catch (error) {
      state.errorCount++;
      state.lastError = error as Error;
      
      console.error('[RouterGuards] Error in navigation guard:', error);
      
      // Try fallback navigation
      if (to.path !== fallbackRoute) {
        next({ path: fallbackRoute });
      } else {
        // If fallback fails, allow navigation anyway
        next();
      }
    }
  });

  // Global after guard
  router.afterEach((to, from) => {
    if (enableLogging) {
      console.log(`[RouterGuards] Navigation completed: ${from.path} -> ${to.path}`);
    }

    // Check for navigation errors
    if (router.currentRoute.value.matched.length === 0) {
      console.warn('[RouterGuards] No matched routes for:', to.path);
    }
  });

  // Global error handler
  router.onError((error) => {
    state.errorCount++;
    state.lastError = error;
    
    console.error('[RouterGuards] Navigation error:', error);
    
    // Attempt recovery
    if (router.currentRoute.value.path !== fallbackRoute) {
      router.push(fallbackRoute).catch(() => {
        console.error('[RouterGuards] Failed to navigate to fallback route');
      });
    }
  });

  state.initialized = true;
  
  if (enableLogging) {
    console.log('[RouterGuards] Guards installed successfully', options);
  }
}

/**
 * Helper functions for checks
 */
async function checkAuthentication(): Promise<boolean> {
  try {
    // Lazy load auth store
    const { useAuthStore } = await import('@/stores/auth');
    const authStore = useAuthStore();
    return authStore.isAuthenticated;
  } catch (error) {
    console.error('[RouterGuards] Failed to check authentication:', error);
    return false;
  }
}

async function checkFeatureToggle(feature: string): Promise<boolean> {
  try {
    // Lazy load feature toggles store
    const { useFeatureTogglesStore } = await import('@/stores/featureToggles');
    const featureStore = useFeatureTogglesStore();
    return featureStore.isEnabled(feature);
  } catch (error) {
    console.error('[RouterGuards] Failed to check feature toggle:', error);
    return true; // Default to enabled if check fails
  }
}

async function checkAdminAccess(): Promise<boolean> {
  try {
    // Lazy load auth store
    const { useAuthStore } = await import('@/stores/auth');
    const authStore = useAuthStore();
    return authStore.isAdmin;
  } catch (error) {
    console.error('[RouterGuards] Failed to check admin access:', error);
    return false;
  }
}

/**
 * Get guard statistics
 */
export function getGuardStatistics() {
  return {
    initialized: state.initialized,
    navigationCount: state.navigationCount,
    errorCount: state.errorCount,
    lastNavigationTime: state.lastNavigationTime,
    lastError: state.lastError?.message || null
  };
}

/**
 * Reset guard state (for testing)
 */
export function resetGuardState(): void {
  state.initialized = false;
  state.lastNavigationTime = 0;
  state.navigationCount = 0;
  state.errorCount = 0;
  state.lastError = null;
}