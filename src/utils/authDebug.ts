/**
 * Auth Debug Utilities
 * Helper functions for debugging authentication issues
 */

export function checkAuthStatus() {
  const tokens = {
    nscale_access_token: localStorage.getItem('nscale_access_token'),
    access_token: localStorage.getItem('access_token'),
    nscale_user: localStorage.getItem('nscale_user'),
  };
  
  console.log('🔐 Current Auth Status:', {
    hasNscaleToken: !!tokens.nscale_access_token,
    hasAccessToken: !!tokens.access_token,
    hasUser: !!tokens.nscale_user,
    tokenPreview: tokens.nscale_access_token ? 
      tokens.nscale_access_token.substring(0, 20) + '...' : null,
  });
  
  return tokens;
}

export function setAuthTokens(accessToken: string, user: any) {
  // Set tokens in multiple locations for compatibility
  localStorage.setItem('nscale_access_token', accessToken);
  localStorage.setItem('access_token', accessToken);
  localStorage.setItem('nscale_user', JSON.stringify(user));
  
  console.log('✅ Auth tokens set successfully');
}

export function clearAuthTokens() {
  localStorage.removeItem('nscale_access_token');
  localStorage.removeItem('access_token');
  localStorage.removeItem('nscale_refresh_token');
  localStorage.removeItem('nscale_token_expiry');
  localStorage.removeItem('nscale_user');
  
  console.log('🗑️ Auth tokens cleared');
}

// Add to window for console access
if (typeof window !== 'undefined') {
  (window as any).authDebug = {
    check: checkAuthStatus,
    set: setAuthTokens,
    clear: clearAuthTokens,
  };
}
